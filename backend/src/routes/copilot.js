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
// ULTRA-SMART WEBSITE SCRAPER
// ============================================
async function scrapeWebsite(url) {
  try {
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }

    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Remove all noise elements
    $('script, style, noscript, iframe, nav, footer, header, .cookie, .privacy, [class*="cookie"], [class*="gdpr"]').remove();

    const data = {
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
      ctas: []
    };

    // Extract business name
    data.businessName = $('meta[property="og:site_name"]').attr('content') ||
                        $('title').text().split(/[-|]/)[0].trim();

    // Extract title and description (clean)
    data.title = cleanText($('title').text());
    data.description = cleanText(
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') || ''
    );

    // Extract tagline (usually first H1 or hero text)
    const firstH1 = $('h1').first().text().trim();
    if (firstH1 && !isNoise(firstH1) && firstH1.length < 150) {
      data.tagline = cleanText(firstH1);
    }

    // Extract VALUE PROPOSITIONS (H2s that describe benefits)
    $('h2, h3').each((i, elem) => {
      const text = cleanText($(elem).text());
      if (text && text.length > 15 && text.length < 200 && !isNoise(text)) {
        // Check if next element is a paragraph describing this
        const nextP = $(elem).next('p').text().trim();
        if (nextP && nextP.length > 30) {
          data.valuePropositions.push({
            title: text,
            description: cleanText(nextP).slice(0, 300)
          });
        }
      }
    });

    // Extract SERVICES/PRODUCTS (from lists and sections)
    $('ul li, ol li').each((i, elem) => {
      const text = cleanText($(elem).text());
      if (text && text.length > 20 && text.length < 300 && !isNoise(text)) {
        // Categorize as service or feature
        if (text.toLowerCase().includes('service') ||
            text.toLowerCase().includes('solution') ||
            text.toLowerCase().includes('product')) {
          data.services.push(text);
        } else if (text.length < 150) {
          data.features.push(text);
        }
      }
    });

    // Extract BENEFITS (paragraphs with value indicators)
    $('p').each((i, elem) => {
      const text = cleanText($(elem).text());
      if (text.length > 50 && text.length < 500 && !isNoise(text)) {
        if (hasValue(text)) {
          data.benefits.push(text);
        }
      }
    });

    // Extract STATS & METRICS (high-value content)
    $('*').each((i, elem) => {
      const text = $(elem).text().trim();
      // Look for numbers with context
      const statMatch = text.match(/(\d+[k|m|%+]*)\s*([a-z\s]{5,30})/gi);
      if (statMatch && !isNoise(text)) {
        statMatch.forEach(stat => {
          const clean = cleanText(stat);
          if (clean.length < 100) {
            data.stats.push(clean);
          }
        });
      }
    });

    // Extract TESTIMONIALS (quotes, reviews)
    $('blockquote, [class*="testimonial"], [class*="review"], [class*="quote"]').each((i, elem) => {
      const text = cleanText($(elem).text());
      if (text.length > 30 && text.length < 1000 && !isNoise(text)) {
        data.testimonials.push(text);
      }
    });

    // Extract PRICING (only real pricing info)
    $('[class*="price"], [class*="pricing"]').each((i, elem) => {
      const text = cleanText($(elem).text());
      if (text && /\$|€|£|\d+/.test(text) && text.length < 200) {
        data.pricing.push(text);
      }
    });

    // Extract CTAs (meaningful call-to-actions)
    $('a[class*="cta"], a[class*="button"], button').each((i, elem) => {
      const text = cleanText($(elem).text());
      if (text && text.length > 3 && text.length < 50 && !isNoise(text)) {
        if (!text.toLowerCase().includes('sign in') &&
            !text.toLowerCase().includes('log in')) {
          data.ctas.push(text);
        }
      }
    });

    // Detect target audience
    const fullText = $('body').text().toLowerCase();
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
        data.targetAudience = audience;
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
        data.industryKeywords.push(term);
      }
    });

    // Remove duplicates and limit arrays
    data.valuePropositions = [...new Set(data.valuePropositions.map(JSON.stringify))].map(JSON.parse).slice(0, 5);
    data.services = [...new Set(data.services)].slice(0, 8);
    data.features = [...new Set(data.features)].slice(0, 10);
    data.benefits = [...new Set(data.benefits)].slice(0, 5);
    data.stats = [...new Set(data.stats)].slice(0, 8);
    data.testimonials = [...new Set(data.testimonials)].slice(0, 3);
    data.pricing = [...new Set(data.pricing)].slice(0, 3);
    data.ctas = [...new Set(data.ctas)].slice(0, 5);

    console.log('📊 Scraped Data Quality:');
    console.log('  - Value Props:', data.valuePropositions.length);
    console.log('  - Services:', data.services.length);
    console.log('  - Benefits:', data.benefits.length);
    console.log('  - Stats:', data.stats.length);
    console.log('  - Testimonials:', data.testimonials.length);

    return data;
  } catch (error) {
    console.error('Scraping error:', error.message);
    throw new Error('Failed to scrape website');
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

    console.log('🔍 Scanning website:', url);
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

    // Build SMART prompt with clean data
    const prompt = `You are an expert AI strategy architect. Create a professional, high-quality AI agent strategy.

**BUSINESS PROFILE:**
Name: ${businessName}
Industry: ${websiteData.industryKeywords?.join(', ') || 'General'}
Target Audience: ${websiteData.targetAudience || 'Businesses'}
Tagline: ${websiteData.tagline || websiteData.title}

**VALUE PROPOSITIONS:**
${websiteData.valuePropositions?.map(vp => `• ${vp.title}: ${vp.description}`).join('\n') || 'Not specified'}

**SERVICES/PRODUCTS:**
${websiteData.services?.slice(0, 5).join('\n') || 'Not specified'}

**KEY BENEFITS:**
${websiteData.benefits?.slice(0, 3).join('\n') || 'Not specified'}

**STATS & PROOF:**
${websiteData.stats?.slice(0, 5).join('\n') || 'None available'}

**TESTIMONIALS:**
${websiteData.testimonials?.slice(0, 2).join('\n\n') || 'None available'}

**GOAL:** ${goal || 'Generate and qualify leads'}

---

**CREATE A PROFESSIONAL AI AGENT STRATEGY:**

**REQUIREMENTS:**
1. Use ONLY the clean, valuable information provided above
2. Do NOT include: cookie policies, sign-in prompts, legal jargon, or navigation text
3. Make FAQs specific and valuable (use stats and testimonials)
4. Create industry-specific qualification questions
5. Write natural, helpful follow-up messages
6. Settings should match industry norms

**OUTPUT JSON STRUCTURE:**
{
  "name": "${businessName} AI Agent",
  "tag": "business-name-ai",
  "tone": "Professional/Friendly/Consultative (choose based on industry)",
  "brief": "**${businessName.toUpperCase()} AI AGENT**\\n\\n[3-4 sentence professional brief describing role, personality, and approach. NO cookie policy text, NO sign-in prompts.]",
  "objective": "${goal === 'book_appointments' ? 'Schedule appointments and demos' : 'Qualify leads and share information'}",
  "companyInformation": "[Professional description using value propositions, stats, and benefits. 150-300 words. Focus on RESULTS and VALUE.]",
  "initialMessage": "Hey! Thanks for reaching out to ${businessName}. Can you confirm this is {{contact.first_name}}?",
  "faqs": [
    {
      "question": "What does ${businessName} do?",
      "answer": "[Use value propositions and stats - be specific and compelling]",
      "delay": 1
    },
    {
      "question": "Who is ${businessName} for?",
      "answer": "[Based on target audience and services]",
      "delay": 1
    },
    {
      "question": "What results can I expect?",
      "answer": "[Use stats and testimonials if available]",
      "delay": 1
    },
    {
      "question": "How much does it cost?",
      "answer": "[If pricing available use it, otherwise: 'Pricing varies based on your needs. I can connect you with our team to discuss options.']",
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
- ONLY use valuable, professional content
- Include actual stats when available (e.g., "500+ clients", "30% increase")
- Use testimonials to add credibility
- Make FAQs answer real customer questions
- Qualification questions should be natural and relevant

Return ONLY valid JSON, no markdown, no code blocks.`;

    console.log('🤖 Generating professional AI strategy for:', businessName);

    const response = await groqService.groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert AI strategy creator. Return ONLY valid JSON with clean, professional content. Never include cookie policies, legal jargon, or navigation text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.1-70b-versatile',
      temperature: 0.6,
      max_tokens: 3500,
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

  return {
    name: `${businessName} AI Agent`,
    tag: businessName.toLowerCase().replace(/\s+/g, '-') + '-ai',
    tone: 'Professional and Helpful',
    brief: `**${businessName.toUpperCase()} AI AGENT**\n\nYou are the AI assistant for ${businessName}. Your role is to engage potential clients professionally, understand their needs, and guide them toward the right solution.\n\nBe helpful, knowledgeable, and consultative. Ask thoughtful questions and provide value in every interaction.`,
    objective: goal === 'book_appointments' ? 'Schedule qualified appointments' : 'Qualify and nurture leads',
    companyInformation: `${description}\n\n${stats ? stats + '\n\n' : ''}${benefits || ''}`.trim(),
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
