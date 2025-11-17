const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const groqService = require('../services/groqService');

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
  if (!text || text.length < 15) return true;
  return NOISE_PATTERNS.some(pattern => pattern.test(text));
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
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
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
      if (text && text.length > 10 && text.length < 200 && !isNoise(text)) {
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

    // Extract ALL meaningful paragraphs
    $('p').each((i, elem) => {
      const text = cleanText($(elem).text());
      if (text.length > 40 && text.length < 1000 && !isNoise(text)) {
        pageData.paragraphs.push(text);
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

    // STEP 1: Scrape homepage
    const homepageData = await scrapeSinglePage(url);

    if (!homepageData) {
      throw new Error('Failed to scrape homepage');
    }

    // STEP 2: Find priority pages to crawl
    const allLinks = homepageData.links;
    const priorityPages = findPriorityPages(allLinks, url);

    console.log(`\n📊 Found ${priorityPages.length} priority pages to crawl`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // STEP 3: Scrape all priority pages in parallel
    const scrapePromises = priorityPages
      .filter(pageUrl => pageUrl !== url) // Exclude homepage (already scraped)
      .slice(0, 9) // Max 9 additional pages
      .map(pageUrl => scrapeSinglePage(pageUrl));

    const pagesData = await Promise.all(scrapePromises);

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
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return aggregatedData;

  } catch (error) {
    console.error('❌ Deep scan error:', error.message);
    throw new Error('Failed to perform deep scan');
  }
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
// AI STRATEGY GENERATION (ULTRA-SMART)
// ============================================
router.post('/generate-strategy', async (req, res) => {
  try {
    const { businessName, websiteData, goal } = req.body;

    if (!businessName || !websiteData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Build ULTRA-COMPREHENSIVE prompt with ALL available data
    const prompt = `You are an expert AI strategy architect. Create a professional, high-quality AI agent strategy.

I'm providing you with COMPREHENSIVE data from a deep scan of ${websiteData.pagesScanned || 1} pages. Use ALL this information to create an extremely detailed and accurate strategy.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**BUSINESS PROFILE:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${businessName}
Industry: ${websiteData.industryKeywords?.join(', ') || 'General'}
Target Audience: ${websiteData.targetAudience || 'Businesses'}
Tagline: ${websiteData.tagline || websiteData.title}
Description: ${websiteData.description || 'Not available'}
Pages Analyzed: ${websiteData.pagesScanned || 1}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**ALL HEADINGS FROM WEBSITE (${websiteData.allHeadings?.length || 0} total):**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${websiteData.allHeadings?.slice(0, 30).map(h => `[${h.level.toUpperCase()}] ${h.text}`).join('\n') || 'None'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**COMPREHENSIVE CONTENT (${websiteData.allParagraphs?.length || 0} paragraphs):**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${websiteData.allParagraphs?.slice(0, 20).join('\n\n') || 'None'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**VALUE PROPOSITIONS (${websiteData.valuePropositions?.length || 0} total):**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${websiteData.valuePropositions?.map(vp => `• **${vp.title}**\n  ${vp.description}`).join('\n\n') || 'Not specified'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**SERVICES/PRODUCTS (${websiteData.services?.length || 0} total):**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${websiteData.services?.map(s => `• ${s}`).join('\n') || 'Not specified'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**KEY FEATURES (${websiteData.features?.length || 0} total):**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${websiteData.features?.map(f => `• ${f}`).join('\n') || 'Not specified'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**KEY BENEFITS (${websiteData.benefits?.length || 0} total):**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${websiteData.benefits?.map(b => `• ${b}`).join('\n') || 'Not specified'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**STATS & PROOF POINTS (${websiteData.stats?.length || 0} total):**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${websiteData.stats?.map(s => `📊 ${s}`).join('\n') || 'None available'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**TESTIMONIALS & REVIEWS (${websiteData.testimonials?.length || 0} total):**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${websiteData.testimonials?.map(t => `💬 "${t}"`).join('\n\n') || 'None available'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**PRICING INFORMATION (${websiteData.pricing?.length || 0} total):**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${websiteData.pricing?.map(p => `💰 ${p}`).join('\n') || 'Not available'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**CALL-TO-ACTIONS (${websiteData.ctas?.length || 0} total):**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${websiteData.ctas?.map(c => `🎯 ${c}`).join('\n') || 'None'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**GOAL:** ${goal || 'Generate and qualify leads'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

---

**CREATE A PROFESSIONAL AI AGENT STRATEGY:**

**⚠️ ABSOLUTE REQUIREMENTS - FAILURE TO COMPLY WILL RESULT IN REJECTION:**
1. **USE ALL THE DATA ABOVE** - I've given you comprehensive information from ${websiteData.pagesScanned || 1} pages. USE IT ALL!
2. **Company Information MUST be 300-500 words** - Use the headings, paragraphs, value props, services, features, benefits, and stats to write a COMPLETE description
3. **FAQs MUST be detailed** - Each answer should be 3-5 sentences using SPECIFIC information from the data above
4. **Include ALL services/products** - Don't just say "we offer services" - LIST THEM ALL specifically
5. **Include ALL stats** - Numbers build credibility. Use every stat I provided
6. **Include testimonials in FAQs** - Use the exact testimonials to answer "What results can I expect?"
7. **Pricing FAQ must use actual pricing** - If pricing data exists, USE IT in the FAQ answer
8. **Qualification questions must be industry-specific** - Based on the actual services/features listed
9. **NO generic answers** - Every answer must reference SPECIFIC information from the scan
10. **NO cookie policies, sign-in prompts, legal jargon** - Only valuable content

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPORTANT: The values I show below are PLACEHOLDERS showing what TYPE of content to write.
You must REPLACE them with actual content from the data I provided above.
DO NOT copy these placeholder strings - REPLACE them with real data!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OUTPUT JSON STRUCTURE:
{
  "name": "${businessName} AI Agent",
  "tag": "${businessName.toLowerCase().replace(/\s+/g, '-')}-ai",
  "tone": "Professional and Helpful",
  "brief": "**${businessName.toUpperCase()} AI AGENT**\\n\\nYou are the AI assistant for ${businessName}. Your role is to engage potential clients professionally, understand their needs, and guide them toward the right solution. Be helpful, knowledgeable, and consultative.",
  "objective": "${goal === 'book_appointments' ? 'Schedule qualified appointments and demos' : 'Qualify leads and share valuable information'}",
  "companyInformation": "REPLACE THIS: Write a comprehensive 300-500 word description of ${businessName}. Include: their tagline/description, who they serve, ALL services by name from the SERVICES section, ALL stats from the STATS section, testimonials if available, and what makes them unique from the BENEFITS section. Write 4 detailed paragraphs.",
  "initialMessage": "Hey! Thanks for reaching out to ${businessName}. Can you confirm this is {{contact.first_name}}?",
  "faqs": [
    {
      "question": "What does ${businessName} do?",
      "answer": "REPLACE THIS: 4-5 sentences explaining what they do, who they serve, specific services, and a stat.",
      "delay": 1
    },
    {
      "question": "Who is ${businessName} for?",
      "answer": "REPLACE THIS: 4 sentences about target audience, problems they solve, and ideal client.",
      "delay": 1
    },
    {
      "question": "What results can I expect?",
      "answer": "REPLACE THIS: 4-5 sentences listing ALL stats and quoting a testimonial if available.",
      "delay": 1
    },
    {
      "question": "What services do you offer?",
      "answer": "REPLACE THIS: 3-4 sentences listing EVERY service by name and describing what is included.",
      "delay": 1
    },
    {
      "question": "How much does it cost?",
      "answer": "REPLACE THIS: List actual prices if available, otherwise explain pricing varies.",
      "delay": 1
    },
    {
      "question": "How does it work?",
      "answer": "REPLACE THIS: 4 sentences describing the process and specific features.",
      "delay": 1
    }
  ],
  "qualificationQuestions": [
    {
      "text": "[Industry-specific question based on services]",
      "conditions": [],
      "delay": 1
    },
    {
      "text": "[Question about current situation/pain points]",
      "conditions": [],
      "delay": 1
    },
    {
      "text": "When are you looking to get started?",
      "conditions": [],
      "delay": 1
    }
  ],
  "followUps": [
    {
      "message": "[Helpful follow-up referencing a key benefit or stat]",
      "delay": 180
    },
    {
      "message": "[Gentle reminder with value proposition]",
      "delay": 1440
    }
  ],
  "customActions": [],
  "settings": {
    "botTemperature": 0.5,
    "resiliancy": 3,
    "bookingReadiness": 3,
    "messageDelayInitial": 30,
    "messageDelayStandard": 5,
    "cta": "I'd love to help you get started! Here's our booking link to schedule a time:",
    "turnOffAiAfterCta": false,
    "turnOffFollowUps": false
  }
}

**CRITICAL RULES:**
- NO cookie policies, privacy policies, or legal text
- NO "sign in" or "create account" messages
- NO navigation instructions
- NO generic answers - EVERY answer must use SPECIFIC data from above
- Company Information: 300-500 words minimum
- FAQ Answers: 3-5 sentences each with SPECIFIC details
- Include EVERY stat I provided above
- Include EVERY service/product I listed above
- If testimonials exist, quote them DIRECTLY
- If pricing exists, use the ACTUAL prices
- Qualification questions must be specific to the actual services listed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**BEFORE YOU START WRITING, RE-READ ALL THE DATA ABOVE!**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Now create the JSON strategy following these steps:

**STEP 1:** Read the ALL HEADINGS section - these show what's important on their site
**STEP 2:** Read the COMPREHENSIVE CONTENT section - this is the real content
**STEP 3:** List out ALL services from SERVICES/PRODUCTS section - you'll need these
**STEP 4:** List out ALL stats from STATS & PROOF POINTS - you'll use every one
**STEP 5:** Note any testimonials - you'll quote these directly

**STEP 6: WRITE THE companyInformation (300-500 words)**
- Paragraph 1: Start with tagline/description, explain what they do
- Paragraph 2: "Our comprehensive offerings include [list EVERY service by name]"
- Paragraph 3: Write about results using EVERY stat. Quote testimonials if available
- Paragraph 4: What makes them unique

**STEP 7: WRITE EACH FAQ ANSWER (4-5 sentences each)**
- Use SPECIFIC data, not generic text
- List actual services by name
- Include actual stats with numbers
- Quote testimonials word-for-word
- NO BRACKETS in your final output

**FINAL CHECK BEFORE RETURNING JSON:**
1. companyInformation is 300-500 words? (COUNT THE WORDS!) ✓
2. I listed ALL services by name? ✓
3. I included ALL stats with numbers? ✓
4. FAQ answers are 4-5 complete sentences? ✓
5. I used SPECIFIC data, no generic text? ✓
6. I quoted testimonials if available? ✓
7. NO "REPLACE THIS" or placeholder text remains? ✓
8. I wrote REAL CONTENT, not instructions? ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ CRITICAL REMINDER:
Your JSON must contain REAL CONTENT, not placeholder instructions!
Example of WRONG output: "answer": "REPLACE THIS: Write 4-5 sentences..."
Example of CORRECT output: "answer": "${businessName} provides comprehensive logistics solutions..."

If your JSON contains "REPLACE THIS" or any instruction text, START OVER!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return ONLY valid JSON, no markdown, no code blocks.`;

    console.log('🤖 Generating professional AI strategy for:', businessName);

    const response = await groqService.groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You write professional AI agent strategies. Write real, complete content - never use placeholders or brackets. All FAQ answers must be 4-5 full sentences with specific details. Company information must be 300-500 words.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.1-70b-versatile',
      temperature: 0.9,
      max_tokens: 8000,
      response_format: { type: "json_object" }
    });

    let strategy;
    const aiResponse = response.choices[0].message.content;

    try {
      strategy = JSON.parse(aiResponse);

      // Post-process to remove any remaining noise
      strategy = cleanStrategy(strategy);

      console.log('✅ Professional AI strategy generated');
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
