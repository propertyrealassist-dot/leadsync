const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');

// Get all strategies
router.get('/', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.currentOrganizationId;
    console.log('📋 Loading strategies for organization:', orgId);

    const strategies = orgId
      ? await db.all('SELECT * FROM templates WHERE organization_id = ? ORDER BY created_at DESC', [orgId])
      : await db.all('SELECT * FROM templates WHERE user_id = ? AND organization_id IS NULL ORDER BY created_at DESC', [req.user.id]);

    console.log('✅ Found', strategies.length, 'strategies for org:', orgId);
    res.json(strategies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single strategy with all related data
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.currentOrganizationId;

    const strategy = orgId
      ? await db.get('SELECT * FROM templates WHERE id = ? AND organization_id = ?', [req.params.id, orgId])
      : await db.get('SELECT * FROM templates WHERE id = ? AND user_id = ? AND organization_id IS NULL', [req.params.id, req.user.id]);

    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    // Fetch nested data
    const faqs = await db.all('SELECT * FROM faqs WHERE template_id = ?', [req.params.id]);
    const qualificationQuestions = await db.all('SELECT * FROM qualification_questions WHERE template_id = ?', [req.params.id]);
    const followUps = await db.all('SELECT * FROM follow_ups WHERE template_id = ?', [req.params.id]);

    console.log(`📥 GET /api/strategies/${req.params.id}`);
    console.log('  FAQs:', faqs.length);
    console.log('  Questions:', qualificationQuestions.length);
    console.log('  Follow-ups:', followUps.length);

    // Map database fields to frontend expected format
    strategy.faqs = faqs.map(f => ({
      id: f.id,
      question: f.question,
      answer: f.answer,
      delay: f.delay
    }));

    strategy.qualification_questions = qualificationQuestions.map(q => {
      let conditions = [];
      try {
        conditions = q.conditions ? JSON.parse(q.conditions) : [];
      } catch (e) {
        conditions = [];
      }
      return {
        id: q.id,
        question: q.text,
        condition: conditions.length > 0 ? conditions[0] : 'None'
      };
    });

    strategy.follow_ups = followUps.map(f => ({
      id: f.id,
      text: f.body,
      message: f.body,
      delay: f.delay
    }));

    // Map snake_case database fields to both camelCase and the exact field names frontend expects
    strategy.prompt = strategy.brief;  // For compatibility
    strategy.initial_message = strategy.initial_message || '';
    strategy.company_name = '';  // Not stored separately
    strategy.industry = '';  // Not stored separately
    strategy.company_description = strategy.company_information || strategy.brief || '';
    strategy.confirmation_message = strategy.cta || '';
    strategy.calendar_provider = 'Google Calendar';
    strategy.calendar_url = '';
    strategy.meeting_duration = { hours: 0, minutes: 30, seconds: 0 };
    strategy.buffer_time = { hours: 0, minutes: 15, seconds: 0 };

    console.log('  ✅ Returning strategy with nested data');
    console.log('  📊 Data check:');
    console.log('    - brief length:', strategy.brief?.length || 0);
    console.log('    - initial_message length:', strategy.initial_message?.length || 0);
    console.log('    - company_description length:', strategy.company_description?.length || 0);
    console.log('    - qualification_questions:', strategy.qualification_questions?.length || 0);
    console.log('    - follow_ups:', strategy.follow_ups?.length || 0);
    console.log('    - faqs:', strategy.faqs?.length || 0);
    res.json(strategy);
  } catch (error) {
    console.error('❌ Error fetching strategy:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new strategy
router.post('/', authenticateToken, async (req, res) => {
  console.log('🔥 POST /api/strategies HIT');
  console.log('📝 Creating strategy for user:', req.user.id);
  console.log('📦 Request body keys:', Object.keys(req.body));

  try {
    if (!req.body.name) {
      console.log('❌ Validation failed: name is required');
      return res.status(400).json({ error: 'Strategy name is required' });
    }

    const id = uuidv4();
    console.log('✨ Generated strategy ID:', id);
    const {
      name, tag, tone,
      brief, prompt,
      initial_message, initialMessage,
      company_name, companyName,
      industry,
      company_description, companyDescription,
      confirmation_message, confirmationMessage,
      calendar_provider, calendarProvider,
      calendar_url, calendarUrl,
      meeting_duration, meetingDuration,
      buffer_time, bufferTime,
      qualification_questions, qualificationQuestions,
      follow_ups, followUps,
      faqs
    } = req.body;

    // Map fields to database schema
    const mappedBrief = brief || prompt || '';
    const mappedInitialMessage = initial_message || initialMessage || '';
    const mappedCompanyInfo = company_description || companyDescription || company_name || companyName || '';
    const mappedCta = confirmation_message || confirmationMessage || '';
    const mappedTag = tag || name.toLowerCase().replace(/\s+/g, '-');
    const mappedQualificationQuestions = qualification_questions || qualificationQuestions || [];
    const mappedFollowUps = follow_ups || followUps || [];
    const mappedFaqs = faqs || [];

    const orgId = req.user.currentOrganizationId;
    console.log('🏢 Creating strategy with organization_id:', orgId);

    await db.run(`
      INSERT INTO templates (
        id, user_id, organization_id, name, tag, bot_temperature, brief,
        resiliancy, booking_readiness, tone, initial_message, objective,
        company_information, message_delay_initial, message_delay_standard, cta
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, req.user.id, orgId, name, mappedTag, 0.4, mappedBrief,
      3, 2, tone || 'Friendly and Casual', mappedInitialMessage, '',
      mappedCompanyInfo, 30, 5, mappedCta
    ]);
    console.log('✅ Strategy record inserted');

    // Insert qualification questions
    if (mappedQualificationQuestions && mappedQualificationQuestions.length > 0) {
      console.log('  Inserting', mappedQualificationQuestions.length, 'qualification questions...');
      for (const q of mappedQualificationQuestions) {
        const text = q.question || q.text || '';
        await db.run('INSERT INTO qualification_questions (template_id, text, conditions, delay) VALUES (?, ?, ?, ?)',
          [id, text, JSON.stringify([]), 1]);
      }
      console.log('  ✅ Questions inserted');
    }

    // Insert follow-ups
    if (mappedFollowUps && mappedFollowUps.length > 0) {
      console.log('  Inserting', mappedFollowUps.length, 'follow-ups...');
      for (const f of mappedFollowUps) {
        const body = f.text || f.message || '';
        const delay = f.delay || 180;
        await db.run('INSERT INTO follow_ups (template_id, body, delay) VALUES (?, ?, ?)',
          [id, body, delay]);
      }
      console.log('  ✅ Follow-ups inserted');
    }

    // Insert FAQs
    if (mappedFaqs && mappedFaqs.length > 0) {
      console.log('  Inserting', mappedFaqs.length, 'FAQs...');
      for (const faq of mappedFaqs) {
        await db.run('INSERT INTO faqs (template_id, question, answer, delay) VALUES (?, ?, ?, ?)',
          [id, faq.question, faq.answer, faq.delay || 1]);
      }
      console.log('  ✅ FAQs inserted');
    }

    console.log('✅ Strategy created successfully with ID:', id);
    res.status(201).json({ id, message: 'Strategy created successfully' });
  } catch (error) {
    console.log('❌ Error creating strategy:', error.message);
    console.log('❌ Stack trace:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Update strategy
router.put('/:id', authenticateToken, async (req, res) => {
  console.log('🔄 PUT /api/strategies/:id HIT');
  console.log('♻️ Updating strategy for user:', req.user.id);
  console.log('📦 Request body keys:', Object.keys(req.body));

  try {
    const {
      name, tag, tone,
      brief, prompt,
      initial_message, initialMessage,
      company_name, companyName,
      company_description, companyDescription,
      confirmation_message, confirmationMessage,
      qualification_questions, qualificationQuestions,
      follow_ups, followUps,
      faqs
    } = req.body;

    // Map fields
    const mappedBrief = brief || prompt || '';
    const mappedInitialMessage = initial_message || initialMessage || '';
    const mappedCompanyInfo = company_description || companyDescription || company_name || companyName || '';
    const mappedCta = confirmation_message || confirmationMessage || '';
    const mappedQualificationQuestions = qualification_questions || qualificationQuestions;
    const mappedFollowUps = follow_ups || followUps;
    const mappedFaqs = faqs;

    // Update main strategy fields
    await db.run(`
      UPDATE templates
      SET name = ?, brief = ?, tone = ?, initial_message = ?, tag = ?,
          company_information = ?, cta = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [name, mappedBrief, tone, mappedInitialMessage, tag, mappedCompanyInfo, mappedCta, req.params.id, req.user.id]);
    console.log('  ✅ Strategy fields updated');

    // Update qualification questions if provided
    if (mappedQualificationQuestions !== undefined) {
      console.log('  Updating', mappedQualificationQuestions.length, 'questions...');
      await db.run('DELETE FROM qualification_questions WHERE template_id = ?', [req.params.id]);
      if (mappedQualificationQuestions.length > 0) {
        for (const q of mappedQualificationQuestions) {
          const text = q.question || q.text || '';
          await db.run('INSERT INTO qualification_questions (template_id, text, conditions, delay) VALUES (?, ?, ?, ?)',
            [req.params.id, text, JSON.stringify([]), 1]);
        }
      }
      console.log('  ✅ Questions updated');
    }

    // Update follow-ups if provided
    if (mappedFollowUps !== undefined) {
      console.log('  Updating', mappedFollowUps.length, 'follow-ups...');
      await db.run('DELETE FROM follow_ups WHERE template_id = ?', [req.params.id]);
      if (mappedFollowUps.length > 0) {
        for (const f of mappedFollowUps) {
          const body = f.text || f.message || '';
          const delay = f.delay || 180;
          await db.run('INSERT INTO follow_ups (template_id, body, delay) VALUES (?, ?, ?)',
            [req.params.id, body, delay]);
        }
      }
      console.log('  ✅ Follow-ups updated');
    }

    // Update FAQs if provided
    if (mappedFaqs !== undefined) {
      console.log('  Updating', mappedFaqs.length, 'FAQs...');
      await db.run('DELETE FROM faqs WHERE template_id = ?', [req.params.id]);
      if (mappedFaqs.length > 0) {
        for (const faq of mappedFaqs) {
          await db.run('INSERT INTO faqs (template_id, question, answer, delay) VALUES (?, ?, ?, ?)',
            [req.params.id, faq.question, faq.answer, faq.delay || 1]);
        }
      }
      console.log('  ✅ FAQs updated');
    }

    console.log('✅ Strategy updated successfully');
    res.json({ message: 'Strategy updated successfully' });
  } catch (error) {
    console.log('❌ Error updating strategy:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Delete strategy
router.delete('/:id', authenticateToken, async (req, res) => {
  console.log('🗑️ DELETE /api/strategies/:id HIT');

  try {
    // Delete all nested data
    await db.run('DELETE FROM faqs WHERE template_id = ?', [req.params.id]);
    await db.run('DELETE FROM qualification_questions WHERE template_id = ?', [req.params.id]);
    await db.run('DELETE FROM follow_ups WHERE template_id = ?', [req.params.id]);

    // Delete the strategy (only if owned by user)
    const result = await db.run('DELETE FROM templates WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    console.log('✅ Strategy deleted successfully');
    res.json({ message: 'Strategy deleted successfully' });
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
