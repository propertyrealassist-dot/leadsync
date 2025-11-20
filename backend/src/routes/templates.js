const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');

// Get all templates
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Loading templates for user:', req.user.id);

    const templates = await db.all('SELECT * FROM templates WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);

    console.log('✅ Found', templates.length, 'templates');
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single template with all related data
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const template = await db.get('SELECT * FROM templates WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Fetch nested data
    const faqs = await db.all('SELECT * FROM faqs WHERE template_id = ?', [req.params.id]);
    const qualificationQuestions = await db.all('SELECT * FROM qualification_questions WHERE template_id = ?', [req.params.id]);
    const followUps = await db.all('SELECT * FROM follow_ups WHERE template_id = ?', [req.params.id]);
    const customActions = await db.all('SELECT * FROM custom_actions WHERE template_id = ?', [req.params.id]);

    console.log(`📥 GET /api/templates/${req.params.id}`);
    console.log('  FAQs:', faqs.length);
    console.log('  Questions:', qualificationQuestions.length);
    console.log('  Follow-ups:', followUps.length);

    // Map database fields to frontend expected format
    template.faqs = faqs.map(f => ({
      id: f.id,
      question: f.question,
      answer: f.answer,
      delay: f.delay,
      expanded: false
    }));

    template.qualificationQuestions = qualificationQuestions.map(q => {
      let conditions = [];
      try {
        conditions = q.conditions ? JSON.parse(q.conditions) : [];
      } catch (e) {
        conditions = [];
      }
      return {
        id: q.id,
        text: q.text,
        conditions: conditions,
        delay: q.delay
      };
    });

    template.followUps = followUps.map(f => ({
      id: f.id,
      text: f.body,  // Map 'body' to 'text' for frontend
      delay: f.delay
    }));

    template.customActions = customActions;

    // Map snake_case database fields to camelCase for frontend
    template.initialMessage = template.initial_message;
    template.companyInformation = template.company_information;
    template.botTemperature = template.bot_temperature;
    template.bookingReadiness = template.booking_readiness;
    template.messageDelayInitial = template.message_delay_initial;
    template.messageDelayStandard = template.message_delay_standard;

    console.log('  ✅ Returning template with nested data');
    res.json(template);
  } catch (error) {
    console.error('❌ Error fetching template:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new template
router.post('/', authenticateToken, async (req, res) => {
  console.log('🔥 POST /api/templates HIT');
  console.log('📝 Creating template for user:', req.user.id);
  console.log('📦 Request body:', JSON.stringify(req.body, null, 2));

  try {
    // Validate required fields
    if (!req.body.name) {
      console.log('❌ Validation failed: name is required');
      return res.status(400).json({ error: 'Template name is required' });
    }

    const id = uuidv4();
    console.log('✨ Generated template ID:', id);
    const {
      name, tag, botTemperature, brief, resiliancy, bookingReadiness,
      tone, initialMessage, objective, companyInformation,
      messageDelayInitial, messageDelayStandard, cta,
      faqs, qualificationQuestions, followUps, customActions,
      // Support both old and new field names for import compatibility
      goal, context, instructions, qualification_questions, follow_ups, custom_actions, settings
    } = req.body;

    // Map new field names to old field names for backward compatibility
    const mappedBrief = brief || instructions || '';
    const mappedObjective = objective || goal || '';
    const mappedCompanyInfo = companyInformation || context || '';
    const mappedFaqs = faqs || [];
    const mappedQualificationQuestions = qualificationQuestions || qualification_questions || [];
    const mappedFollowUps = followUps || follow_ups || [];
    const mappedCustomActions = customActions || custom_actions;
    const mappedInitialMessage = initialMessage || settings?.initial_message || '';
    const mappedCta = cta || settings?.booking_url || '';
    const mappedMessageDelayStandard = messageDelayStandard || settings?.message_delay || 5;
    const mappedTag = tag || name.toLowerCase().replace(/\s+/g, '-');

    // Insert template with async operations
    await db.run(`
      INSERT INTO templates (
        id, user_id, name, tag, bot_temperature, brief, resiliancy, booking_readiness,
        tone, initial_message, objective, company_information,
        message_delay_initial, message_delay_standard, cta
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, req.user.id, name, mappedTag, botTemperature || 0.4, mappedBrief, resiliancy || 3, bookingReadiness || 2,
      tone || 'Friendly and Casual', mappedInitialMessage, mappedObjective, mappedCompanyInfo,
      messageDelayInitial || 30, mappedMessageDelayStandard, mappedCta
    ]);
    console.log('✅ Template record inserted');

    console.log('📋 Processing nested data...');
    console.log('  FAQs:', mappedFaqs?.length || 0);
    console.log('  Questions:', mappedQualificationQuestions?.length || 0);
    console.log('  Follow-ups:', mappedFollowUps?.length || 0);
    console.log('  Custom Actions:', mappedCustomActions ? (Array.isArray(mappedCustomActions) ? mappedCustomActions.length : Object.keys(mappedCustomActions).length) : 0);

    if (mappedFaqs && mappedFaqs.length > 0) {
      console.log('  Inserting', mappedFaqs.length, 'FAQs...');
      for (const faq of mappedFaqs) {
        let question, answer;
        if (typeof faq.Body === 'string' && faq.Body.startsWith('{')) {
          const parsed = JSON.parse(faq.Body);
          question = parsed.question;
          answer = parsed.answer;
        } else {
          question = faq.question;
          answer = faq.answer;
        }
        console.log('    FAQ:', question);
        await db.run('INSERT INTO faqs (template_id, question, answer, delay) VALUES (?, ?, ?, ?)',
          [id, question, answer, faq.Delay || faq.delay || 1]);
      }
      console.log('  ✅ FAQs inserted');
    }

    if (mappedQualificationQuestions && mappedQualificationQuestions.length > 0) {
      console.log('  Inserting', mappedQualificationQuestions.length, 'qualification questions...');
      for (const q of mappedQualificationQuestions) {
        let text;
        if (typeof q.Body === 'string' && q.Body.startsWith('{')) {
          const parsed = JSON.parse(q.Body);
          text = parsed.text;
        } else {
          text = q.text || q.Body;
        }
        console.log('    Question:', text);
        await db.run('INSERT INTO qualification_questions (template_id, text, conditions, delay) VALUES (?, ?, ?, ?)',
          [id, text, JSON.stringify(q.conditions || []), q.Delay || q.delay || 1]);
      }
      console.log('  ✅ Questions inserted');
    }

    if (mappedFollowUps && mappedFollowUps.length > 0) {
      console.log('  Inserting', mappedFollowUps.length, 'follow-ups...');
      for (const f of mappedFollowUps) {
        const body = f.Body || f.message || '';
        const delay = f.Delay || f.delay || 1;
        console.log('    Follow-up:', body.substring(0, 50) + '...');
        await db.run('INSERT INTO follow_ups (template_id, body, delay) VALUES (?, ?, ?)',
          [id, body, delay]);
      }
      console.log('  ✅ Follow-ups inserted');
    }

    if (mappedCustomActions) {
      console.log('  Inserting custom actions...');
      // Handle both object format (old) and array format (new)
      if (Array.isArray(mappedCustomActions)) {
        // New format: array of action objects
        for (const action of mappedCustomActions) {
          const actionType = action.type || action.action || 'unknown';
          const ruleCondition = action.rule_condition || action.config?.rule_condition || '';
          const description = action.description || action.config?.description || '';
          const result = await db.run(`
            INSERT INTO custom_actions (template_id, action, rule_condition, description)
            VALUES (?, ?, ?, ?)
          `, [id, actionType, ruleCondition, description]);
          const actionId = result.lastID || result.lastInsertRowid;

          // Handle chains if present
          const chains = action.chains || action.config?.chains;
          if (chains) {
            for (const chain of chains) {
              const chainResult = await db.run(`
                INSERT INTO action_chains (custom_action_id, chain_name, chain_order)
                VALUES (?, ?, ?)
              `, [actionId, chain.chain_name, chain.chain_order]);
              const chainId = chainResult.lastID || chainResult.lastInsertRowid;

              if (chain.steps) {
                for (const step of chain.steps) {
                  await db.run(`
                    INSERT INTO chain_steps (chain_id, step_order, function, parameters)
                    VALUES (?, ?, ?, ?)
                  `, [chainId, step.step_order, step.function, JSON.stringify(step.parameters || {})]);
                }
              }
            }
          }
        }
      } else {
        // Old format: object with action types as keys
        for (const actionType of Object.keys(mappedCustomActions)) {
          const actions = mappedCustomActions[actionType];
          const actionArray = Array.isArray(actions) ? actions : [actions];
          for (const action of actionArray) {
            const result = await db.run(`
              INSERT INTO custom_actions (template_id, action, rule_condition, description)
              VALUES (?, ?, ?, ?)
            `, [id, actionType, action.rule_condition, action.description || '']);
            const actionId = result.lastID || result.lastInsertRowid;

            if (action.chains) {
              for (const chain of action.chains) {
                const chainResult = await db.run(`
                  INSERT INTO action_chains (custom_action_id, chain_name, chain_order)
                  VALUES (?, ?, ?)
                `, [actionId, chain.chain_name, chain.chain_order]);
                const chainId = chainResult.lastID || chainResult.lastInsertRowid;

                if (chain.steps) {
                  for (const step of chain.steps) {
                    await db.run(`
                      INSERT INTO chain_steps (chain_id, step_order, function, parameters)
                      VALUES (?, ?, ?, ?)
                    `, [chainId, step.step_order, step.function, JSON.stringify(step.parameters || {})]);
                  }
                }
              }
            }
          }
        }
      }
      console.log('  ✅ Custom actions inserted');
    }

    console.log('✅ Template created successfully with ID:', id);
    res.status(201).json({ id, message: 'Template created successfully' });
  } catch (error) {
    console.log('❌ Error creating template:', error.message);
    console.log('❌ Stack trace:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Update template
router.put('/:id', authenticateToken, async (req, res) => {
  console.log('🔄 PUT /api/templates/:id HIT');
  console.log('♻️ Updating template for user:', req.user.id);
  console.log('📦 Request body keys:', Object.keys(req.body));
  console.log('📊 FAQs in body:', req.body.faqs?.length || 0);
  console.log('📊 Questions in body:', req.body.qualificationQuestions?.length || 0);
  console.log('📊 FollowUps in body:', req.body.followUps?.length || 0);
  if (req.body.faqs && req.body.faqs.length > 0) {
    console.log('📝 First FAQ:', JSON.stringify(req.body.faqs[0]));
  }

  try {
    const {
      name, brief, tone, initialMessage, objective, tag, botTemperature, companyInformation, cta,
      faqs, qualificationQuestions, followUps
    } = req.body;

    // Update main template fields (only if owned by user)
    await db.run(`
      UPDATE templates
      SET name = ?, brief = ?, tone = ?, initial_message = ?, objective = ?, tag = ?,
          bot_temperature = ?, company_information = ?, cta = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [name, brief, tone, initialMessage, objective, tag, botTemperature, companyInformation, cta, req.params.id, req.user.id]);
    console.log('  ✅ Template fields updated');

    // Update nested data if provided
    if (faqs !== undefined) {
      console.log('  Updating', faqs.length, 'FAQs...');
      // Delete existing FAQs
      await db.run('DELETE FROM faqs WHERE template_id = ?', [req.params.id]);
      // Insert new FAQs
      if (faqs.length > 0) {
        for (const faq of faqs) {
          const question = faq.question || '';
          const answer = faq.answer || '';
          const delay = faq.delay || faq.Delay || 1;
          console.log('    Inserting FAQ:', question);
          await db.run('INSERT INTO faqs (template_id, question, answer, delay) VALUES (?, ?, ?, ?)',
            [req.params.id, question, answer, delay]);
        }
      }
      console.log('  ✅ FAQs updated');
    }

    if (qualificationQuestions !== undefined) {
      console.log('  Updating', qualificationQuestions.length, 'questions...');
      // Delete existing questions
      await db.run('DELETE FROM qualification_questions WHERE template_id = ?', [req.params.id]);
      // Insert new questions
      if (qualificationQuestions.length > 0) {
        for (const q of qualificationQuestions) {
          const text = q.text || q.Body || '';
          const conditions = q.conditions || [];
          const delay = q.delay || q.Delay || 1;
          console.log('    Inserting question:', text);
          await db.run('INSERT INTO qualification_questions (template_id, text, conditions, delay) VALUES (?, ?, ?, ?)',
            [req.params.id, text, JSON.stringify(conditions), delay]);
        }
      }
      console.log('  ✅ Questions updated');
    }

    if (followUps !== undefined) {
      console.log('  Updating', followUps.length, 'follow-ups...');
      // Delete existing follow-ups
      await db.run('DELETE FROM follow_ups WHERE template_id = ?', [req.params.id]);
      // Insert new follow-ups
      if (followUps.length > 0) {
        for (const f of followUps) {
          const body = f.body || f.text || f.Body || '';
          const delay = f.delay || f.Delay || 180;
          console.log('    Inserting follow-up:', body.substring(0, 50) + '...', 'delay:', delay);
          await db.run('INSERT INTO follow_ups (template_id, body, delay) VALUES (?, ?, ?)',
            [req.params.id, body, delay]);
        }
      }
      console.log('  ✅ Follow-ups updated');
    }
    console.log('✅ Template updated successfully');

    res.json({ message: 'Template updated successfully' });
  } catch (error) {
    console.log('❌ Error updating template:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Duplicate a strategy
router.post('/:id/duplicate', authenticateToken, async (req, res) => {
  console.log('📋 POST /api/templates/:id/duplicate HIT');
  console.log('📝 Template ID:', req.params.id);
  console.log('📝 User ID:', req.user.id);
  console.log('📦 Custom name:', req.body.customName);

  try {
    const { customName } = req.body;
    const originalId = req.params.id;

    // Get the original strategy with all its data
    const original = await db.get('SELECT * FROM templates WHERE id = ?', [originalId]);

    if (!original) {
      console.log('❌ Original template not found');
      return res.status(404).json({ error: 'Strategy not found' });
    }

    const newId = uuidv4();
    const now = new Date().toISOString();
    const newName = customName || `${original.name} (Copy)`;

    console.log('✨ Creating duplicate with ID:', newId);
    console.log('📝 New name:', newName);

    // Create duplicate template
    await db.run(`
      INSERT INTO templates (
        id, user_id, name, tag, bot_temperature, brief, resiliancy, booking_readiness,
        tone, initial_message, objective, company_information,
        message_delay_initial, message_delay_standard, cta, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [newId,
      req.user.id,
      newName,
      `${original.tag}-copy`,
      original.bot_temperature,
      original.brief,
      original.resiliancy,
      original.booking_readiness,
      original.tone,
      original.initial_message,
      original.objective,
      original.company_information,
      original.message_delay_initial,
      original.message_delay_standard,
      original.cta,
      now,
      now]);
    console.log('  ✅ Template record duplicated');

    // Duplicate FAQs
    const faqs = await db.all('SELECT * FROM faqs WHERE template_id = ?', [originalId]);
    if (faqs.length > 0) {
      console.log('  Duplicating', faqs.length, 'FAQs...');
      for (const faq of faqs) {
        await db.run('INSERT INTO faqs (template_id, question, answer, delay) VALUES (?, ?, ?, ?)',
          [newId, faq.question, faq.answer, faq.delay]);
      }
      console.log('  ✅ FAQs duplicated');
    }

    // Duplicate qualification questions
    const questions = await db.all('SELECT * FROM qualification_questions WHERE template_id = ?', [originalId]);
    if (questions.length > 0) {
      console.log('  Duplicating', questions.length, 'questions...');
      for (const q of questions) {
        await db.run('INSERT INTO qualification_questions (template_id, text, conditions, delay) VALUES (?, ?, ?, ?)',
          [newId, q.text, q.conditions, q.delay]);
      }
      console.log('  ✅ Questions duplicated');
    }

    // Duplicate follow-ups
    const followUps = await db.all('SELECT * FROM follow_ups WHERE template_id = ?', [originalId]);
    if (followUps.length > 0) {
      console.log('  Duplicating', followUps.length, 'follow-ups...');
      for (const f of followUps) {
        await db.run('INSERT INTO follow_ups (template_id, body, delay) VALUES (?, ?, ?)',
          [newId, f.body, f.delay]);
      }
      console.log('  ✅ Follow-ups duplicated');
    }

    // Duplicate custom actions
    const customActions = await db.all('SELECT * FROM custom_actions WHERE template_id = ?', [originalId]);
    if (customActions.length > 0) {
      console.log('  Duplicating', customActions.length, 'custom actions...');
      for (const action of customActions) {
        const result = await db.run(`
          INSERT INTO custom_actions (template_id, action, rule_condition, description)
          VALUES (?, ?, ?, ?)
        `, [newId, action.action, action.rule_condition, action.description]);
        const newActionId = result.lastID || result.lastInsertRowid;
        const oldActionId = action.id;

        // Duplicate action chains
        const chains = await db.all('SELECT * FROM action_chains WHERE custom_action_id = ?', [oldActionId]);
        for (const chain of chains) {
          const chainResult = await db.run(`
            INSERT INTO action_chains (custom_action_id, chain_name, chain_order)
            VALUES (?, ?, ?)
          `, [newActionId, chain.chain_name, chain.chain_order]);
          const newChainId = chainResult.lastID || chainResult.lastInsertRowid;
          const oldChainId = chain.id;

          // Duplicate chain steps
          const steps = await db.all('SELECT * FROM chain_steps WHERE chain_id = ?', [oldChainId]);
          for (const step of steps) {
            await db.run(`
              INSERT INTO chain_steps (chain_id, step_order, function, parameters)
              VALUES (?, ?, ?, ?)
            `, [newChainId, step.step_order, step.function, step.parameters]);
          }
        }
      }
      console.log('  ✅ Custom actions duplicated');
    }

    // Get the complete duplicate with all nested data
    const duplicate = await db.get('SELECT * FROM templates WHERE id = ?', [newId]);

    console.log('✅ Strategy duplicated successfully');
    res.status(201).json({
      message: 'Strategy duplicated successfully',
      strategy: duplicate
    });

  } catch (error) {
    console.error('❌ Duplicate strategy error:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to duplicate strategy' });
  }
});

// Delete template with proper cascade
router.delete('/:id', authenticateToken, async (req, res) => {
  console.log('🗑️ DELETE /api/templates/:id HIT');
  console.log('🗑️ Deleting template for user:', req.user.id);
  console.log('📝 Template ID:', req.params.id);
  console.log('📝 ID type:', typeof req.params.id);

  try {
    console.log('  🔄 Deleting template:', req.params.id);

    // Delete all conversations and related data
    const conversations = await db.all('SELECT id FROM conversations WHERE template_id = ?', [req.params.id]);

    for (const conv of conversations) {
      await db.run('DELETE FROM messages WHERE conversation_id = ?', [conv.id]);
      await db.run('DELETE FROM scheduled_messages WHERE conversation_id = ?', [conv.id]);
    }

    await db.run('DELETE FROM conversations WHERE template_id = ?', [req.params.id]);

    // Delete custom actions and chains
    const customActions = await db.all('SELECT id FROM custom_actions WHERE template_id = ?', [req.params.id]);

    for (const action of customActions) {
      const chains = await db.all('SELECT id FROM action_chains WHERE custom_action_id = ?', [action.id]);

      for (const chain of chains) {
        await db.run('DELETE FROM chain_steps WHERE chain_id = ?', [chain.id]);
      }

      await db.run('DELETE FROM action_chains WHERE custom_action_id = ?', [action.id]);
    }

    await db.run('DELETE FROM custom_actions WHERE template_id = ?', [req.params.id]);

    // Delete template-related data
    await db.run('DELETE FROM faqs WHERE template_id = ?', [req.params.id]);
    await db.run('DELETE FROM qualification_questions WHERE template_id = ?', [req.params.id]);
    await db.run('DELETE FROM follow_ups WHERE template_id = ?', [req.params.id]);

    // Delete the template (only if owned by user)
    const result = await db.run('DELETE FROM templates WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);

    console.log('  ✅ Delete result:', result);
    console.log('  📊 Rows affected:', result.changes);

    if (result.changes === 0) {
      console.log('⚠️ Template not found or already deleted');
      return res.status(404).json({ error: 'Template not found' });
    }

    console.log('✅ Template deleted successfully');
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('❌ Delete error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;