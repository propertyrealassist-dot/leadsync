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
    strategy.ghlLocationId = strategy.ghl_location_id || null;  // For frontend camelCase

    // Map slider database fields to frontend field names
    strategy.objection_handling = strategy.resiliancy || 3;
    strategy.qualification_priority = strategy.booking_readiness || 2;
    // bot_temperature stays the same

    console.log('  ✅ Returning strategy with nested data');
    console.log('  📊 Data check:');
    console.log('    - brief length:', strategy.brief?.length || 0);
    console.log('    - initial_message length:', strategy.initial_message?.length || 0);
    console.log('    - company_description length:', strategy.company_description?.length || 0);
    console.log('    - qualification_questions:', strategy.qualification_questions?.length || 0);
    console.log('    - follow_ups:', strategy.follow_ups?.length || 0);
    console.log('    - faqs:', strategy.faqs?.length || 0);
    console.log('  🎚️ Slider values:', {
      objection_handling: strategy.objection_handling,
      qualification_priority: strategy.qualification_priority,
      bot_temperature: strategy.bot_temperature
    });
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
      faqs,
      ghl_location_id, ghlLocationId, location_id, locationId
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
    const mappedLocationId = ghl_location_id || ghlLocationId || location_id || locationId || null;

    const orgId = req.user.currentOrganizationId;
    console.log('🏢 Creating strategy with organization_id:', orgId);
    console.log('📍 GHL Location ID:', mappedLocationId || 'Not specified (will match any location)');

    await db.run(`
      INSERT INTO templates (
        id, user_id, organization_id, name, tag, bot_temperature, brief,
        resiliancy, booking_readiness, tone, initial_message, objective,
        company_information, message_delay_initial, message_delay_standard, cta,
        ghl_location_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, req.user.id, orgId, name, mappedTag, 0.4, mappedBrief,
      3, 2, tone || 'Friendly and Casual', mappedInitialMessage, '',
      mappedCompanyInfo, 30, 5, mappedCta, mappedLocationId
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
      faqs,
      ghl_location_id, ghlLocationId, location_id, locationId,
      objection_handling, qualification_priority, bot_temperature
    } = req.body;

    // Map fields
    const mappedBrief = brief || prompt || '';
    const mappedInitialMessage = initial_message || initialMessage || '';
    const mappedCompanyInfo = company_description || companyDescription || company_name || companyName || '';
    const mappedCta = confirmation_message || confirmationMessage || '';
    const mappedQualificationQuestions = qualification_questions || qualificationQuestions;
    const mappedFollowUps = follow_ups || followUps;
    const mappedFaqs = faqs;
    const mappedLocationId = ghl_location_id || ghlLocationId || location_id || locationId || null;

    // Map slider values to database columns
    const mappedResiliancy = objection_handling !== undefined ? objection_handling : 3;
    const mappedBookingReadiness = qualification_priority !== undefined ? qualification_priority : 2;
    const mappedBotTemperature = bot_temperature !== undefined ? bot_temperature : 0.4;

    console.log('📍 Updating GHL Location ID to:', mappedLocationId || 'Not specified (will match any location)');
    console.log('🎚️ Updating slider values:', {
      objection_handling: mappedResiliancy,
      qualification_priority: mappedBookingReadiness,
      bot_temperature: mappedBotTemperature
    });

    // Update main strategy fields
    await db.run(`
      UPDATE templates
      SET name = ?, brief = ?, tone = ?, initial_message = ?, tag = ?,
          company_information = ?, cta = ?, ghl_location_id = ?,
          resiliancy = ?, booking_readiness = ?, bot_temperature = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [name, mappedBrief, tone, mappedInitialMessage, tag, mappedCompanyInfo, mappedCta, mappedLocationId,
        mappedResiliancy, mappedBookingReadiness, mappedBotTemperature,
        req.params.id, req.user.id]);
    console.log('  ✅ Strategy fields updated');

    // Batch update qualification questions if provided
    if (mappedQualificationQuestions !== undefined && mappedQualificationQuestions.length > 0) {
      console.log('  Batch updating', mappedQualificationQuestions.length, 'questions...');

      // Build batch INSERT query
      const questionValues = mappedQualificationQuestions.map(q => {
        const text = q.question || q.text || '';
        return `('${req.params.id}', '${text.replace(/'/g, "''")}', '[]', 1)`;
      }).join(',');

      await db.run('DELETE FROM qualification_questions WHERE template_id = ?', [req.params.id]);
      await db.run(`INSERT INTO qualification_questions (template_id, text, conditions, delay) VALUES ${questionValues}`);
      console.log('  ✅ Questions batch updated');
    } else if (mappedQualificationQuestions !== undefined) {
      await db.run('DELETE FROM qualification_questions WHERE template_id = ?', [req.params.id]);
      console.log('  ✅ Questions cleared');
    }

    // Batch update follow-ups if provided
    if (mappedFollowUps !== undefined && mappedFollowUps.length > 0) {
      console.log('  Batch updating', mappedFollowUps.length, 'follow-ups...');

      const followUpValues = mappedFollowUps.map(f => {
        const body = (f.text || f.message || '').replace(/'/g, "''");
        const delay = f.delay || 180;
        return `('${req.params.id}', '${body}', ${delay})`;
      }).join(',');

      await db.run('DELETE FROM follow_ups WHERE template_id = ?', [req.params.id]);
      await db.run(`INSERT INTO follow_ups (template_id, body, delay) VALUES ${followUpValues}`);
      console.log('  ✅ Follow-ups batch updated');
    } else if (mappedFollowUps !== undefined) {
      await db.run('DELETE FROM follow_ups WHERE template_id = ?', [req.params.id]);
      console.log('  ✅ Follow-ups cleared');
    }

    // Batch update FAQs if provided
    if (mappedFaqs !== undefined && mappedFaqs.length > 0) {
      console.log('  Batch updating', mappedFaqs.length, 'FAQs...');

      const faqValues = mappedFaqs.map(faq => {
        const question = (faq.question || '').replace(/'/g, "''");
        const answer = (faq.answer || '').replace(/'/g, "''");
        const delay = faq.delay || 1;
        return `('${req.params.id}', '${question}', '${answer}', ${delay})`;
      }).join(',');

      await db.run('DELETE FROM faqs WHERE template_id = ?', [req.params.id]);
      await db.run(`INSERT INTO faqs (template_id, question, answer, delay) VALUES ${faqValues}`);
      console.log('  ✅ FAQs batch updated');
    } else if (mappedFaqs !== undefined) {
      await db.run('DELETE FROM faqs WHERE template_id = ?', [req.params.id]);
      console.log('  ✅ FAQs cleared');
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
