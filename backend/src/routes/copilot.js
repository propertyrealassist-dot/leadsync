const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const groqService = require('../services/groqService');
const { generateElitePrompt } = require('./copilot-elite-prompt');

// ============================================
// SMART CONTENT FILTERS
// ============================================
const NOISE_PATTERNS = [
  // Legal/Cookie junk
  /cookie policy/i,
  /privacy policy/i,
  /terms of service/i,
  /user agreement/i,
  /by clicking continue/i,
  /sign in/i,
  /log in/i,
  /create account/i,
  /register now/i,

  // Navigation/UI junk
  /skip to main content/i,
  /toggle navigation/i,
  /open menu/i,
  /close menu/i,
  /search/i,

  // Generic prompts
  /get it in the microsoft store/i,
  /download app/i,
  /available on/i,

  // Social media
  /follow us on/i,
  /connect with us/i,
  /subscribe to/i,

  // Empty or too short
  /^.{0,10}$/,

  // Excessive special characters
  /[^\w\s]{5,}/,
];

const VALUABLE_CONTENT_INDICATORS = [
  /\d+[%+]\s*(increase|growth|success|conversion|roi)/i,
  /\d+[k|m]\+?\s*(users|customers|clients|members)/i,
  /trusted by \d+/i,
  /\$\d+/i, // Pricing
  /guarantee/i,
  /certified/i,
  /award/i,
];

function isNoise(text) {
  if (!text || text.length < 10) return true;  // Relaxed from 15 to 10
  // Only filter if it matches noise patterns strongly
  const noiseMatches = NOISE_PATTERNS.filter(pattern => pattern.test(text));
  return noiseMatches.length > 1;  // Only if multiple patterns match
}

function hasValue(text) {
  return VALUABLE_CONTENT_INDICATORS.some(pattern => pattern.test(text));
}

function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/â€™/g, "'")
    .replace(/â€"/g, '-')
    .replace(/[^\S\r\n]+/g, ' ')
    .trim();
}

// ============================================
// DEEP SCAN CONFIGURATION
// ============================================
const PRIORITY_PAGES = [
  '/about',
  '/about-us',
  '/services',
  '/products',
  '/pricing',
  '/features',
  '/solutions',
  '/how-it-works',
  '/our-work',
  '/portfolio',
  '/case-studies',
  '/testimonials',
  '/reviews',
  '/contact'
];

// ============================================
// EXTRACT INTERNAL LINKS
// ============================================
function extractInternalLinks($, baseUrl) {
  const links = new Set();

  try {
    const baseUrlObj = new URL(baseUrl);

    $('a[href]').each((i, elem) => {
      try {
        const href = $(elem).attr('href');
        if (!href) return;

        // Convert relative URLs to absolute
        let absoluteUrl;
        if (href.startsWith('http')) {
          absoluteUrl = href;
        } else if (href.startsWith('/')) {
          absoluteUrl = baseUrlObj.origin + href;
        } else {
          return; // Skip relative paths
        }

        const urlObj = new URL(absoluteUrl);

        // Only include same-domain links
        if (urlObj.origin === baseUrlObj.origin) {
          // Remove query params and hash
          const cleanUrl = urlObj.origin + urlObj.pathname;
          links.add(cleanUrl);
        }
      } catch (e) {
        // Invalid URL, skip
      }
    });
  } catch (e) {
    console.error('Error extracting links:', e.message);
  }

  return Array.from(links);
}

// ============================================
// FIND PRIORITY PAGES TO CRAWL
// ============================================
function findPriorityPages(allLinks, baseUrl) {
  const priorityLinks = new Set();

  try {
    const baseUrlObj = new URL(baseUrl);

    // Add homepage
    priorityLinks.add(baseUrlObj.origin);

    // Find matching priority pages
    for (const link of allLinks) {
      const path = new URL(link).pathname.toLowerCase();

      for (const priority of PRIORITY_PAGES) {
        if (path.includes(priority) || path === priority) {
          priorityLinks.add(link);
          break;
        }
      }

      // Limit to 10 pages max (homepage + 9 others)
      if (priorityLinks.size >= 10) break;
    }
  } catch (e) {
    console.error('Error finding priority pages:', e.message);
  }

  return Array.from(priorityLinks);
}

// ============================================
// SCRAPE SINGLE PAGE
// ============================================
async function scrapeSinglePage(url) {
  try {
    console.log('   📄 Crawling:', url);

    const response = await axios.get(url, {
      timeout: 15000, // Increased to 15s for more reliability
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      maxRedirects: 5, // Increased redirects
      validateStatus: (status) => status < 500 // Accept 4xx errors too
    });

    const $ = cheerio.load(response.data);

    // Remove all noise elements
    $('script, style, noscript, iframe, nav, footer, header, .cookie, .privacy, [class*="cookie"], [class*="gdpr"]').remove();

    const pageData = {
      url,
      headings: [],
      paragraphs: [],
      lists: [],
      valuePropositions: [],
      stats: [],
      testimonials: [],
      pricing: [],
      ctas: [],
      links: []
    };

    // Extract ALL headings (H1-H6)
    $('h1, h2, h3, h4, h5, h6').each((i, elem) => {
      const text = cleanText($(elem).text());
      if (text && text.length > 5 && text.length < 300 && !isNoise(text)) {
        const tag = $(elem).prop('tagName').toLowerCase();
        pageData.headings.push({
          level: tag,
          text: text
        });

        // Check if next element is a paragraph describing this heading
        const nextP = $(elem).next('p').text().trim();
        if (nextP && nextP.length > 30 && nextP.length < 800) {
          pageData.valuePropositions.push({
            title: text,
            description: cleanText(nextP)
          });
        }
      }
    });

    // Extract ALL meaningful paragraphs (INCREASED LIMIT for more content)
    $('p').each((i, elem) => {
      const text = cleanText($(elem).text());
      // Relaxed minimum from 20 to 15, increased max from 1500 to 3000 for longer content
      if (text.length > 15 && text.length < 3000 && !isNoise(text)) {
        pageData.paragraphs.push(text);
      }
    });

    // Extract div text for modern websites (MORE AGGRESSIVE)
    $('div[class*="content"], div[class*="text"], div[class*="description"], div[class*="about"], div[class*="info"], section, article').each((i, elem) => {
      const text = cleanText($(elem).text());
      // Relaxed minimum, increased max for richer content capture
      if (text.length > 25 && text.length < 2000 && !isNoise(text)) {
        // Make sure it's not already captured
        if (!pageData.paragraphs.includes(text)) {
          pageData.paragraphs.push(text);
        }
      }
    });

    // Extract span and strong text that might contain important info
    $('span, strong, em, b').each((i, elem) => {
      const text = cleanText($(elem).text());
      if (text.length > 20 && text.length < 500 && !isNoise(text) && hasValue(text)) {
        if (!pageData.paragraphs.includes(text)) {
          pageData.paragraphs.push(text);
        }
      }
    });

    // Extract ALL lists
    $('ul, ol').each((i, elem) => {
      const listItems = [];
      $(elem).find('li').each((j, li) => {
        const text = cleanText($(li).text());
        if (text && text.length > 15 && text.length < 500 && !isNoise(text)) {
          listItems.push(text);
        }
      });
      if (listItems.length > 0) {
        pageData.lists.push(listItems);
      }
    });

    // Extract STATS & METRICS
    $('*').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text.length > 5 && text.length < 150) {
        // Look for numbers with context
        const statMatch = text.match(/(\d+[k|m|%+]*)\s*([a-z\s]{3,50})/gi);
        if (statMatch && !isNoise(text)) {
          statMatch.forEach(stat => {
            const clean = cleanText(stat);
            if (clean.length > 8 && clean.length < 100) {
              pageData.stats.push(clean);
            }
          });
        }
      }
    });

    // Extract TESTIMONIALS
    $('blockquote, [class*="testimonial"], [class*="review"], [class*="quote"]').each((i, elem) => {
      const text = cleanText($(elem).text());
      if (text.length > 30 && text.length < 1000 && !isNoise(text)) {
        pageData.testimonials.push(text);
      }
    });

    // Extract PRICING
    $('[class*="price"], [class*="pricing"]').each((i, elem) => {
      const text = cleanText($(elem).text());
      if (text && /\$|€|£|\d+/.test(text) && text.length < 200) {
        pageData.pricing.push(text);
      }
    });

    // Extract CTAs
    $('a[class*="cta"], a[class*="button"], button').each((i, elem) => {
      const text = cleanText($(elem).text());
      if (text && text.length > 3 && text.length < 50 && !isNoise(text)) {
        if (!text.toLowerCase().includes('sign in') &&
            !text.toLowerCase().includes('log in')) {
          pageData.ctas.push(text);
        }
      }
    });

    // Extract internal links for crawling
    pageData.links = extractInternalLinks($, url);

    console.log(`   ✅ Extracted: ${pageData.headings.length} headings, ${pageData.paragraphs.length} paragraphs, ${pageData.stats.length} stats`);

    // DEBUG: Log sample data
    if (pageData.headings.length > 0) {
      console.log('   📝 Sample headings:', pageData.headings.slice(0, 3).map(h => h.text));
    }
    if (pageData.paragraphs.length > 0) {
      console.log('   📝 Sample paragraphs:', pageData.paragraphs.slice(0, 2).map(p => p.substring(0, 100)));
    }

    return pageData;

  } catch (error) {
    console.error(`   ❌ Failed to scrape ${url}:`, error.message);
    return null;
  }
}

// ============================================
// DEEP SCRAPE WEBSITE (CRAWL MULTIPLE PAGES)
// ============================================
async function scrapeWebsite(url) {
  try {
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }

    console.log('🔍 DEEP SCAN starting for:', url);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // STEP 1: Scrape homepage FIRST
    const homepageData = await scrapeSinglePage(url);

    if (!homepageData) {
      console.log('⚠️ Homepage scraping failed, returning minimal data');
      return createMinimalWebsiteData(url);
    }

    console.log(`\n✅ Homepage scanned successfully`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // STEP 2: Find priority pages to crawl (SCAN UP TO 9 PAGES for comprehensive data)
    const allLinks = homepageData.links;
    const priorityPages = findPriorityPages(allLinks, url);

    console.log(`📊 Found ${priorityPages.length} priority pages (scanning top 9 for comprehensive analysis)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // STEP 3: Scrape up to 9 priority pages in parallel for MAXIMUM data extraction
    const scrapePromises = priorityPages
      .filter(pageUrl => pageUrl !== url) // Exclude homepage (already scraped)
      .slice(0, 9) // Max 9 additional pages (10 total) for comprehensive scan
      .map(pageUrl => scrapeSinglePage(pageUrl));

    const results = await Promise.allSettled(scrapePromises);
    const pagesData = results
      .filter(r => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value);

    // Add homepage data
    const allPagesData = [homepageData, ...pagesData.filter(p => p !== null)];

    console.log(`\n✅ Successfully crawled ${allPagesData.length} pages`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // STEP 4: Aggregate data from all pages
    const aggregatedData = {
      businessName: '',
      title: '',
      description: '',
      tagline: '',
      valuePropositions: [],
      services: [],
      features: [],
      benefits: [],
      stats: [],
      testimonials: [],
      pricing: [],
      targetAudience: '',
      industryKeywords: [],
      ctas: [],
      pagesScanned: allPagesData.length,
      allHeadings: [],
      allParagraphs: []
    };

    // Get business name and description from homepage
    const $ = cheerio.load((await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })).data);

    aggregatedData.businessName = $('meta[property="og:site_name"]').attr('content') ||
                                   $('title').text().split(/[-|]/)[0].trim();

    aggregatedData.title = cleanText($('title').text());
    aggregatedData.description = cleanText(
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') || ''
    );

    // Get tagline from first H1
    const firstH1 = homepageData.headings.find(h => h.level === 'h1');
    if (firstH1) {
      aggregatedData.tagline = firstH1.text;
    }

    // Aggregate all data from all pages
    for (const pageData of allPagesData) {
      if (!pageData) continue;

      // Collect all headings
      aggregatedData.allHeadings.push(...pageData.headings);

      // Collect all paragraphs
      aggregatedData.allParagraphs.push(...pageData.paragraphs);

      // Collect value propositions
      aggregatedData.valuePropositions.push(...pageData.valuePropositions);

      // Collect lists as services/features
      for (const list of pageData.lists) {
        for (const item of list) {
          if (item.toLowerCase().includes('service') ||
              item.toLowerCase().includes('solution') ||
              item.toLowerCase().includes('product')) {
            aggregatedData.services.push(item);
          } else {
            aggregatedData.features.push(item);
          }
        }
      }

      // Collect benefits from valuable paragraphs
      for (const paragraph of pageData.paragraphs) {
        if (hasValue(paragraph)) {
          aggregatedData.benefits.push(paragraph);
        }
      }

      // Collect stats, testimonials, pricing, CTAs
      aggregatedData.stats.push(...pageData.stats);
      aggregatedData.testimonials.push(...pageData.testimonials);
      aggregatedData.pricing.push(...pageData.pricing);
      aggregatedData.ctas.push(...pageData.ctas);
    }

    // Detect target audience from all collected text
    const fullText = aggregatedData.allParagraphs.join(' ').toLowerCase();
    const audienceKeywords = {
      'businesses': /\b(businesses|companies|enterprises|organizations)\b/g,
      'agencies': /\b(agencies|marketing agencies|creative agencies)\b/g,
      'coaches': /\b(coaches|coaching|consultants)\b/g,
      'freelancers': /\b(freelancers|solopreneurs|independent)\b/g,
      'startups': /\b(startups|founders|entrepreneurs)\b/g,
      'professionals': /\b(professionals|experts|specialists)\b/g
    };

    for (const [audience, pattern] of Object.entries(audienceKeywords)) {
      const matches = fullText.match(pattern);
      if (matches && matches.length > 2) {
        aggregatedData.targetAudience = audience;
        break;
      }
    }

    // Extract industry keywords
    const industryTerms = [
      'saas', 'software', 'technology', 'marketing', 'sales', 'crm',
      'e-commerce', 'consulting', 'coaching', 'recruiting', 'hr',
      'finance', 'healthcare', 'education', 'real estate', 'legal'
    ];

    industryTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = fullText.match(regex);
      if (matches && matches.length > 3) {
        aggregatedData.industryKeywords.push(term);
      }
    });

    // Remove duplicates and limit arrays
    aggregatedData.valuePropositions = [...new Set(aggregatedData.valuePropositions.map(JSON.stringify))].map(JSON.parse).slice(0, 10);
    aggregatedData.services = [...new Set(aggregatedData.services)].slice(0, 15);
    aggregatedData.features = [...new Set(aggregatedData.features)].slice(0, 20);
    aggregatedData.benefits = [...new Set(aggregatedData.benefits)].slice(0, 10);
    aggregatedData.stats = [...new Set(aggregatedData.stats)].slice(0, 15);
    aggregatedData.testimonials = [...new Set(aggregatedData.testimonials)].slice(0, 5);
    aggregatedData.pricing = [...new Set(aggregatedData.pricing)].slice(0, 5);
    aggregatedData.ctas = [...new Set(aggregatedData.ctas)].slice(0, 8);

    console.log('📊 DEEP SCAN Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📄 Pages Scanned:', aggregatedData.pagesScanned);
    console.log('  📝 Headings:', aggregatedData.allHeadings.length);
    console.log('  📄 Paragraphs:', aggregatedData.allParagraphs.length);
    console.log('  💎 Value Props:', aggregatedData.valuePropositions.length);
    console.log('  🛠️  Services:', aggregatedData.services.length);
    console.log('  ⚡ Features:', aggregatedData.features.length);
    console.log('  ✨ Benefits:', aggregatedData.benefits.length);
    console.log('  📊 Stats:', aggregatedData.stats.length);
    console.log('  💬 Testimonials:', aggregatedData.testimonials.length);
    console.log('  💰 Pricing:', aggregatedData.pricing.length);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 Sample Data:');
    if (aggregatedData.services.length > 0) {
      console.log('  Services:', aggregatedData.services.slice(0, 3));
    }
    if (aggregatedData.allParagraphs.length > 0) {
      console.log('  First paragraph:', aggregatedData.allParagraphs[0].substring(0, 150) + '...');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return aggregatedData;

  } catch (error) {
    console.error('❌ Deep scan error:', error.message);
    // Return minimal data instead of throwing - NEVER fail the scan
    return createMinimalWebsiteData(url);
  }
}

// ============================================
// CREATE MINIMAL WEBSITE DATA (Fallback)
// ============================================
function createMinimalWebsiteData(url) {
  const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
  const domain = urlObj.hostname.replace('www.', '');
  const businessName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);

  return {
    businessName,
    title: businessName,
    description: `${businessName} - Professional business services`,
    tagline: `Welcome to ${businessName}`,
    valuePropositions: [],
    services: [],
    features: [],
    benefits: [],
    stats: [],
    testimonials: [],
    pricing: [],
    targetAudience: 'businesses',
    industryKeywords: [],
    ctas: [],
    pagesScanned: 1,
    allHeadings: [],
    allParagraphs: [],
    scannedSuccessfully: false // Flag to indicate scan failed but still returned data
  };
}

// ============================================
// SCAN ENDPOINT
// ============================================
router.post('/scan-website', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log('🔍 Starting DEEP SCAN for:', url);
    const websiteData = await scrapeWebsite(url);

    res.json({
      success: true,
      data: websiteData
    });

  } catch (error) {
    console.error('❌ Scan error:', error);
    res.status(500).json({
      error: 'Failed to scan website',
      message: error.message
    });
  }
});

// ============================================
// DEBUG: TEST ELITE PROMPT (Remove after testing)
// ============================================
router.post('/test-elite-prompt', async (req, res) => {
  try {
    const { generateElitePrompt } = require('./copilot-elite-prompt');

    // Test data
    const testWebsiteData = {
      businessName: 'ProCouriers',
      title: 'Professional Courier Services',
      description: 'Fast, reliable delivery services',
      allHeadings: [
        { level: 'h1', text: 'Professional Courier Services' },
        { level: 'h2', text: '24/7 Same-Day Delivery' },
        { level: 'h2', text: 'Trusted by 5000+ Businesses' }
      ],
      allParagraphs: [
        'We provide fast, reliable courier services across the city.',
        'Our team has 15+ years of logistics experience.',
        '99% on-time delivery rate guaranteed.'
      ],
      services: ['Same-day delivery', 'Next-day delivery', 'International shipping'],
      stats: ['5000+ clients served', '99% on-time', '15+ years experience'],
      testimonials: ['Best courier service ever! - John D.'],
      pagesScanned: 10
    };

    const prompt = generateElitePrompt('ProCouriers', testWebsiteData, 'aiBooks');

    res.json({
      success: true,
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 2000),
      fullPrompt: prompt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// AI STRATEGY GENERATION (ULTRA-SMART)
// ============================================
router.post('/generate-strategy', async (req, res) => {
  try {
    const { businessName, websiteData, goal } = req.body;

    if (!businessName || !websiteData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Use ELITE-LEVEL prompt for AppointWise-quality strategies
    const prompt = generateElitePrompt(businessName, websiteData, goal);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 Generating ELITE AI strategy using Claude for:', businessName);
    console.log('📊 Website Data Summary:');
    console.log('   - Pages Scanned:', websiteData.pagesScanned || 0);
    console.log('   - Headings:', websiteData.allHeadings?.length || 0);
    console.log('   - Paragraphs:', websiteData.allParagraphs?.length || 0);
    console.log('   - Services:', websiteData.services?.length || 0);
    console.log('   - Stats:', websiteData.stats?.length || 0);
    console.log('   - Testimonials:', websiteData.testimonials?.length || 0);
    console.log('📋 Elite Prompt Length:', prompt.length, 'characters');
    console.log('📋 Elite Prompt Preview (first 500 chars):');
    console.log(prompt.substring(0, 500));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Use Claude API for better quality strategy generation
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 16000,
      temperature: 0.7,
      system: 'You are an ELITE AI strategy architect who creates world-class conversation strategies. You write ultra-detailed briefs with conversation rules, psychological triggers, objection handling, and strategic qualification flows. You use ALL available data to create hyper-specific, industry-tailored strategies. NEVER use generic content or placeholders - every strategy must be completely customized.',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    let strategy;
    const aiResponse = response.content[0].text;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 Claude AI Response received');
    console.log('📏 Response length:', aiResponse.length, 'characters');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      strategy = JSON.parse(aiResponse);

      // Post-process to remove any remaining noise
      strategy = cleanStrategy(strategy);

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Professional ELITE AI strategy generated successfully!');
      console.log('📊 Strategy Summary:');
      console.log('   - Name:', strategy.name);
      console.log('   - Brief Length:', strategy.brief?.length || 0, 'characters');
      console.log('   - Company Info Length:', strategy.companyInformation?.length || 0, 'characters');
      console.log('   - Qualification Questions:', strategy.qualificationQuestions?.length || 0);
      console.log('   - FAQs:', strategy.faqs?.length || 0);
      console.log('   - Follow-ups:', strategy.followUps?.length || 0);
      console.log('📝 Brief Preview (first 300 chars):');
      console.log(strategy.brief?.substring(0, 300) + '...');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (parseError) {
      console.error('❌ JSON parse error, using fallback');
      strategy = createProfessionalFallback(businessName, websiteData, goal);
    }

    res.json({
      success: true,
      strategy
    });

  } catch (error) {
    console.error('❌ Strategy generation error:', error);

    const fallbackStrategy = createProfessionalFallback(
      req.body.businessName,
      req.body.websiteData,
      req.body.goal
    );

    res.json({
      success: true,
      strategy: fallbackStrategy,
      fallback: true
    });
  }
});

// ============================================
// CLEAN STRATEGY (Remove any noise)
// ============================================
function cleanStrategy(strategy) {
  const clean = { ...strategy };

  // Clean all text fields
  if (clean.brief) {
    clean.brief = clean.brief
      .replace(/cookie policy|privacy policy|terms of service|by clicking continue/gi, '')
      .replace(/sign in|log in|create account/gi, '')
      .trim();
  }

  if (clean.companyInformation) {
    clean.companyInformation = clean.companyInformation
      .replace(/cookie policy|privacy policy|terms of service|by clicking continue/gi, '')
      .replace(/sign in|log in|create account|get it in the|microsoft store/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Clean FAQs
  if (clean.faqs) {
    clean.faqs = clean.faqs.map(faq => ({
      ...faq,
      answer: faq.answer
        .replace(/cookie policy|privacy policy|by clicking continue/gi, '')
        .replace(/sign in|log in|get it in the|microsoft store/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
    })).filter(faq => faq.answer.length > 20);
  }

  return clean;
}

// ============================================
// PROFESSIONAL FALLBACK
// ============================================
function createProfessionalFallback(businessName, websiteData, goal) {
  const description = websiteData.description ||
                     websiteData.tagline ||
                     `${businessName} - Professional services and solutions`;

  const stats = websiteData.stats?.slice(0, 3).join('. ') || '';
  const benefits = websiteData.benefits?.slice(0, 2).join(' ') || '';
  const services = websiteData.services?.slice(0, 5).join(', ') || '';

  return {
    name: `${businessName} AI Agent`,
    tag: businessName.toLowerCase().replace(/\s+/g, '-') + '-ai',
    tone: 'Professional and Helpful',
    brief: `**${businessName.toUpperCase()} AI AGENT**\n\nYou are the AI assistant for ${businessName}. Your role is to engage potential clients professionally, understand their needs, and guide them toward the right solution.\n\nBe helpful, knowledgeable, and consultative. Ask thoughtful questions and provide value in every interaction.`,
    objective: goal === 'book_appointments' ? 'Schedule qualified appointments' : 'Qualify and nurture leads',
    companyInformation: `${description}\n\n${services ? 'We offer: ' + services + '.\n\n' : ''}${stats ? stats + '\n\n' : ''}${benefits || ''}`.trim(),
    initialMessage: `Hey! Thanks for reaching out to ${businessName}. Can you confirm this is {{contact.first_name}}?`,
    faqs: [
      {
        question: `What does ${businessName} do?`,
        answer: description,
        delay: 1
      },
      {
        question: `Who do you work with?`,
        answer: `We work with ${websiteData.targetAudience || 'businesses'} looking to improve their results through our professional services.`,
        delay: 1
      },
      {
        question: 'How can I get started?',
        answer: `Getting started is easy! I can schedule a quick call with our team to discuss your specific needs and see if we're a good fit.`,
        delay: 1
      }
    ],
    qualificationQuestions: [
      {
        text: `What brings you to ${businessName} today?`,
        conditions: [],
        delay: 1
      },
      {
        text: 'What are your main goals or challenges right now?',
        conditions: [],
        delay: 1
      },
      {
        text: 'When are you looking to get started?',
        conditions: [],
        delay: 1
      }
    ],
    followUps: [
      {
        message: `Hey! Just following up on your interest in ${businessName}. Do you have any questions I can help with?`,
        delay: 180
      },
      {
        message: `I'd love to help you achieve your goals. Would you like to schedule a quick call to discuss how ${businessName} can help?`,
        delay: 1440
      }
    ],
    customActions: [],
    settings: {
      botTemperature: 0.5,
      resiliancy: 3,
      bookingReadiness: 3,
      messageDelayInitial: 30,
      messageDelayStandard: 5,
      cta: `I'd love to help you get started! Here's our booking link:`,
      turnOffAiAfterCta: false,
      turnOffFollowUps: false
    }
  };
}

module.exports = router;
