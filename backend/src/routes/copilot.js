const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const { authenticateToken } = require('../middleware/auth');

/**
 * Scan website and extract information
 * POST /api/copilot/scan
 */
router.post('/scan', authenticateToken, async (req, res) => {
  console.log('🌐 Co-Pilot scan request received');
  console.log('📝 Request body:', req.body);
  console.log('👤 User:', req.user?.email || req.user?.id);

  try {
    const { url } = req.body;

    if (!url) {
      console.log('❌ No URL provided in request');
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    // Ensure URL has protocol
    let formattedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      formattedUrl = 'https://' + url;
    }

    console.log('🔍 Scanning website:', formattedUrl);

    // Fetch website content
    const response = await axios.get(formattedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 LeadSync-Bot/1.0'
      },
      timeout: 15000,
      maxRedirects: 5
    });

    const $ = cheerio.load(response.data);

    // Extract data
    const websiteData = {
      title: '',
      description: '',
      headings: [],
      services: [],
      contactInfo: {},
      content: '',
      url: formattedUrl
    };

    // Extract title
    websiteData.title = $('title').text().trim() || $('h1').first().text().trim();

    // Extract meta description
    websiteData.description = $('meta[name="description"]').attr('content') ||
                               $('meta[property="og:description"]').attr('content') ||
                               '';

    // Extract headings (limited to first 20)
    $('h1, h2, h3').each((i, el) => {
      if (i < 20) {
        const text = $(el).text().trim();
        if (text && text.length > 3 && text.length < 150) {
          websiteData.headings.push(text);
        }
      }
    });

    // Extract main content from paragraphs
    $('p').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 50 && text.length < 500) {
        websiteData.content += text + ' ';
      }
    });

    // Limit content to reasonable size
    websiteData.content = websiteData.content.substring(0, 3000);

    // Try to identify services from common patterns
    const serviceKeywords = ['service', 'solution', 'offer', 'provide', 'specialize'];
    $('li, h2, h3, p').each((i, el) => {
      const text = $(el).text().trim().toLowerCase();
      if (serviceKeywords.some(keyword => text.includes(keyword)) && text.length < 150) {
        const cleanText = $(el).text().trim();
        if (cleanText.length > 10 && !websiteData.services.includes(cleanText)) {
          websiteData.services.push(cleanText);
        }
      }
    });

    // Limit services
    websiteData.services = websiteData.services.slice(0, 10);

    // Extract contact info
    const bodyText = $('body').text();

    // Extract emails
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
    const emails = bodyText.match(emailRegex);
    if (emails) {
      // Filter out common non-contact emails
      const filteredEmails = emails.filter(email =>
        !email.includes('example.com') &&
        !email.includes('sentry') &&
        !email.includes('gtag') &&
        !email.includes('facebook') &&
        !email.includes('google')
      );
      websiteData.contactInfo.emails = [...new Set(filteredEmails)].slice(0, 5);
    }

    // Extract phone numbers (US format)
    const phoneRegex = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const phones = bodyText.match(phoneRegex);
    if (phones) {
      websiteData.contactInfo.phones = [...new Set(phones)].slice(0, 5);
    }

    // Extract social media links
    const socialMedia = {};
    $('a[href*="facebook.com"], a[href*="twitter.com"], a[href*="linkedin.com"], a[href*="instagram.com"]').each((i, el) => {
      const href = $(el).attr('href');
      if (href) {
        if (href.includes('facebook.com')) socialMedia.facebook = href;
        if (href.includes('twitter.com')) socialMedia.twitter = href;
        if (href.includes('linkedin.com')) socialMedia.linkedin = href;
        if (href.includes('instagram.com')) socialMedia.instagram = href;
      }
    });

    if (Object.keys(socialMedia).length > 0) {
      websiteData.contactInfo.socialMedia = socialMedia;
    }

    console.log('✅ Website scan completed successfully:', {
      title: websiteData.title,
      headingsCount: websiteData.headings.length,
      servicesCount: websiteData.services.length,
      contentLength: websiteData.content.length
    });

    res.json({
      success: true,
      data: websiteData
    });

  } catch (error) {
    console.error('❌ Website scan error:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error stack:', error.stack);

    // Handle specific error types
    if (error.code === 'ENOTFOUND') {
      console.log('⚠️ Website not found (DNS error)');
      return res.status(400).json({
        success: false,
        error: 'Website not found',
        message: 'Unable to connect to the website. Please check the URL.'
      });
    }

    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.log('⚠️ Request timeout');
      return res.status(408).json({
        success: false,
        error: 'Request timeout',
        message: 'The website took too long to respond.'
      });
    }

    if (error.response) {
      console.log('⚠️ HTTP error:', error.response.status, error.response.statusText);
      return res.status(error.response.status).json({
        success: false,
        error: 'HTTP error',
        message: `Website returned ${error.response.status}: ${error.response.statusText}`
      });
    }

    console.log('⚠️ Unknown error type');
    res.status(500).json({
      success: false,
      error: 'Failed to scan website',
      message: error.message
    });
  }
});

module.exports = router;
