const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { v4: uuidv4 } = require('uuid');

// Get all templates
router.get('/', (req, res) => {
  try {
    const templates = db.prepare('SELECT * FROM templates ORDER BY created_at DESC').all();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single template with all related data
router.get('/:id', (req, res) => {
  try {
    const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Fetch nested data
    const faqs = db.prepare('SELECT * FROM faqs WHERE template_id = ?').all(req.params.id);
    const qualificationQuestions = db.prepare('SELECT * FROM qualification_questions WHERE template_id = ?').all(req.params.id);
    const followUps = db.prepare('SELECT * FROM follow_ups WHERE template_id = ?').all(req.params.id);
    const customActions = db.prepare('SELECT * FROM custom_actions WHERE template_id = ?').all(req.params.id);

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
router.post('/', (req, res) => {
  console.log('🔥 POST /api/templates HIT');
  console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
  console.log('🔑 Auth header:', req.headers.authorization);

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

    // Use a transaction to ensure all or nothing
    const insertTemplate = db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO templates (
          id, name, tag, bot_temperature, brief, resiliancy, booking_readiness,
          tone, initial_message, objective, company_information,
          message_delay_initial, message_delay_standard, cta
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
      id, name, mappedTag, botTemperature || 0.4, mappedBrief, resiliancy || 3, bookingReadiness || 2,
      tone || 'Friendly and Casual', mappedInitialMessage, mappedObjective, mappedCompanyInfo,
      messageDelayInitial || 30, mappedMessageDelayStandard, mappedCta
    );
    console.log('✅ Template record inserted');

    console.log('📋 Processing nested data...');
    console.log('  FAQs:', mappedFaqs?.length || 0);
    console.log('  Questions:', mappedQualificationQuestions?.length || 0);
    console.log('  Follow-ups:', mappedFollowUps?.length || 0);
    console.log('  Custom Actions:', mappedCustomActions ? (Array.isArray(mappedCustomActions) ? mappedCustomActions.length : Object.keys(mappedCustomActions).length) : 0);

    if (mappedFaqs && mappedFaqs.length > 0) {
      console.log('  Inserting', mappedFaqs.length, 'FAQs...');
      const faqStmt = db.prepare('INSERT INTO faqs (template_id, question, answer, delay) VALUES (?, ?, ?, ?)');
      mappedFaqs.forEach(faq => {
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
        faqStmt.run(id, question, answer, faq.Delay || faq.delay || 1);
      });
      console.log('  ✅ FAQs inserted');
    }

    if (mappedQualificationQuestions && mappedQualificationQuestions.length > 0) {
      console.log('  Inserting', mappedQualificationQuestions.length, 'qualification questions...');
      const qStmt = db.prepare('INSERT INTO qualification_questions (template_id, text, conditions, delay) VALUES (?, ?, ?, ?)');
      mappedQualificationQuestions.forEach(q => {
        let text;
        if (typeof q.Body === 'string' && q.Body.startsWith('{')) {
          const parsed = JSON.parse(q.Body);
          text = parsed.text;
        } else {
          text = q.text || q.Body;
        }
        console.log('    Question:', text);
        qStmt.run(id, text, JSON.stringify(q.conditions || []), q.Delay || q.delay || 1);
      });
      console.log('  ✅ Questions inserted');
    }

    if (mappedFollowUps && mappedFollowUps.length > 0) {
      console.log('  Inserting', mappedFollowUps.length, 'follow-ups...');
      const fStmt = db.prepare('INSERT INTO follow_ups (template_id, body, delay) VALUES (?, ?, ?)');
      mappedFollowUps.forEach(f => {
        const body = f.Body || f.message || '';
        const delay = f.Delay || f.delay || 1;
        console.log('    Follow-up:', body.substring(0, 50) + '...');
        fStmt.run(id, body, delay);
      });
      console.log('  ✅ Follow-ups inserted');
    }

    if (mappedCustomActions) {
      console.log('  Inserting custom actions...');
      // Handle both object format (old) and array format (new)
      if (Array.isArray(mappedCustomActions)) {
        // New format: array of action objects
        mappedCustomActions.forEach(action => {
          const actionStmt = db.prepare(`
            INSERT INTO custom_actions (template_id, action, rule_condition, description)
            VALUES (?, ?, ?, ?)
          `);
          const actionType = action.type || action.action || 'unknown';
          const ruleCondition = action.rule_condition || action.config?.rule_condition || '';
          const description = action.description || action.config?.description || '';
          const result = actionStmt.run(id, actionType, ruleCondition, description);
          const actionId = result.lastInsertRowid;

          // Handle chains if present
          const chains = action.chains || action.config?.chains;
          if (chains) {
            chains.forEach(chain => {
              const chainStmt = db.prepare(`
                INSERT INTO action_chains (custom_action_id, chain_name, chain_order)
                VALUES (?, ?, ?)
              `);
              const chainResult = chainStmt.run(actionId, chain.chain_name, chain.chain_order);
              const chainId = chainResult.lastInsertRowid;

              if (chain.steps) {
                chain.steps.forEach(step => {
                  db.prepare(`
                    INSERT INTO chain_steps (chain_id, step_order, function, parameters)
                    VALUES (?, ?, ?, ?)
                  `).run(chainId, step.step_order, step.function, JSON.stringify(step.parameters || {}));
                });
              }
            });
          }
        });
      } else {
        // Old format: object with action types as keys
        Object.keys(mappedCustomActions).forEach(actionType => {
          const actions = mappedCustomActions[actionType];
          const actionArray = Array.isArray(actions) ? actions : [actions];
          actionArray.forEach(action => {
            const actionStmt = db.prepare(`
              INSERT INTO custom_actions (template_id, action, rule_condition, description)
              VALUES (?, ?, ?, ?)
            `);
            const result = actionStmt.run(id, actionType, action.rule_condition, action.description || '');
            const actionId = result.lastInsertRowid;

            if (action.chains) {
              action.chains.forEach(chain => {
                const chainStmt = db.prepare(`
                  INSERT INTO action_chains (custom_action_id, chain_name, chain_order)
                  VALUES (?, ?, ?)
                `);
                const chainResult = chainStmt.run(actionId, chain.chain_name, chain.chain_order);
                const chainId = chainResult.lastInsertRowid;

                if (chain.steps) {
                  chain.steps.forEach(step => {
                    db.prepare(`
                      INSERT INTO chain_steps (chain_id, step_order, function, parameters)
                      VALUES (?, ?, ?, ?)
                    `).run(chainId, step.step_order, step.function, JSON.stringify(step.parameters || {}));
                  });
                }
              });
            }
          });
        });
      }
      console.log('  ✅ Custom actions inserted');
    }
    });

    // Execute the transaction
    insertTemplate();

    console.log('✅ Template created successfully with ID:', id);
    res.status(201).json({ id, message: 'Template created successfully' });
  } catch (error) {
    console.log('❌ Error creating template:', error.message);
    console.log('❌ Stack trace:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Update template
router.put('/:id', (req, res) => {
  console.log('🔄 PUT /api/templates/:id HIT');
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

    const updateTemplate = db.transaction(() => {
      // Update main template fields
      db.prepare(`
        UPDATE templates
        SET name = ?, brief = ?, tone = ?, initial_message = ?, objective = ?, tag = ?,
            bot_temperature = ?, company_information = ?, cta = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(name, brief, tone, initialMessage, objective, tag, botTemperature, companyInformation, cta, req.params.id);
      console.log('  ✅ Template fields updated');

      // Update nested data if provided
      if (faqs !== undefined) {
        console.log('  Updating', faqs.length, 'FAQs...');
        // Delete existing FAQs
        db.prepare('DELETE FROM faqs WHERE template_id = ?').run(req.params.id);
        // Insert new FAQs
        if (faqs.length > 0) {
          const faqStmt = db.prepare('INSERT INTO faqs (template_id, question, answer, delay) VALUES (?, ?, ?, ?)');
          faqs.forEach(faq => {
            const question = faq.question || '';
            const answer = faq.answer || '';
            const delay = faq.delay || faq.Delay || 1;
            console.log('    Inserting FAQ:', question);
            faqStmt.run(req.params.id, question, answer, delay);
          });
        }
        console.log('  ✅ FAQs updated');
      }

      if (qualificationQuestions !== undefined) {
        console.log('  Updating', qualificationQuestions.length, 'questions...');
        // Delete existing questions
        db.prepare('DELETE FROM qualification_questions WHERE template_id = ?').run(req.params.id);
        // Insert new questions
        if (qualificationQuestions.length > 0) {
          const qStmt = db.prepare('INSERT INTO qualification_questions (template_id, text, conditions, delay) VALUES (?, ?, ?, ?)');
          qualificationQuestions.forEach(q => {
            const text = q.text || q.Body || '';
            const conditions = q.conditions || [];
            const delay = q.delay || q.Delay || 1;
            console.log('    Inserting question:', text);
            qStmt.run(req.params.id, text, JSON.stringify(conditions), delay);
          });
        }
        console.log('  ✅ Questions updated');
      }

      if (followUps !== undefined) {
        console.log('  Updating', followUps.length, 'follow-ups...');
        // Delete existing follow-ups
        db.prepare('DELETE FROM follow_ups WHERE template_id = ?').run(req.params.id);
        // Insert new follow-ups
        if (followUps.length > 0) {
          const fStmt = db.prepare('INSERT INTO follow_ups (template_id, body, delay) VALUES (?, ?, ?)');
          followUps.forEach(f => {
            const body = f.body || f.text || f.Body || '';
            const delay = f.delay || f.Delay || 180;
            console.log('    Inserting follow-up:', body.substring(0, 50) + '...', 'delay:', delay);
            fStmt.run(req.params.id, body, delay);
          });
        }
        console.log('  ✅ Follow-ups updated');
      }
    });

    updateTemplate();
    console.log('✅ Template updated successfully');

    res.json({ message: 'Template updated successfully' });
  } catch (error) {
    console.log('❌ Error updating template:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Delete template with proper cascade
router.delete('/:id', (req, res) => {
  const deleteTemplate = db.transaction((templateId) => {
    console.log('Deleting template:', templateId);
    
    // Temporarily disable foreign keys
    db.pragma('foreign_keys = OFF');
    
    try {
      // Delete all conversations and related data
      const conversations = db.prepare('SELECT id FROM conversations WHERE template_id = ?').all(templateId);
      
      conversations.forEach(conv => {
        db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(conv.id);
        db.prepare('DELETE FROM scheduled_messages WHERE conversation_id = ?').run(conv.id);
      });
      
      db.prepare('DELETE FROM conversations WHERE template_id = ?').run(templateId);
      
      // Delete custom actions and chains
      const customActions = db.prepare('SELECT id FROM custom_actions WHERE template_id = ?').all(templateId);
      
      customActions.forEach(action => {
        const chains = db.prepare('SELECT id FROM action_chains WHERE custom_action_id = ?').all(action.id);
        
        chains.forEach(chain => {
          db.prepare('DELETE FROM chain_steps WHERE chain_id = ?').run(chain.id);
        });
        
        db.prepare('DELETE FROM action_chains WHERE custom_action_id = ?').run(action.id);
      });
      
      db.prepare('DELETE FROM custom_actions WHERE template_id = ?').run(templateId);
      
      // Delete template-related data
      db.prepare('DELETE FROM faqs WHERE template_id = ?').run(templateId);
      db.prepare('DELETE FROM qualification_questions WHERE template_id = ?').run(templateId);
      db.prepare('DELETE FROM follow_ups WHERE template_id = ?').run(templateId);
      
      // Delete the template
      const result = db.prepare('DELETE FROM templates WHERE id = ?').run(templateId);
      
      console.log('Delete result:', result);
      
      return result;
    } finally {
      // Re-enable foreign keys
      db.pragma('foreign_keys = ON');
    }
  });
  
  try {
    const result = deleteTemplate(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;