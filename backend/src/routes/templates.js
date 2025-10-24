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

    template.faqs = db.prepare('SELECT * FROM faqs WHERE template_id = ?').all(req.params.id);
    template.qualificationQuestions = db.prepare('SELECT * FROM qualification_questions WHERE template_id = ?').all(req.params.id);
    template.followUps = db.prepare('SELECT * FROM follow_ups WHERE template_id = ?').all(req.params.id);
    template.customActions = db.prepare('SELECT * FROM custom_actions WHERE template_id = ?').all(req.params.id);

    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new template
router.post('/', (req, res) => {
  try {
    const id = uuidv4();
    const {
      name, tag, botTemperature, brief, resiliancy, bookingReadiness,
      tone, initialMessage, objective, companyInformation,
      messageDelayInitial, messageDelayStandard, cta,
      faqs, qualificationQuestions, followUps, customActions
    } = req.body;

    const stmt = db.prepare(`
      INSERT INTO templates (
        id, name, tag, bot_temperature, brief, resiliancy, booking_readiness,
        tone, initial_message, objective, company_information,
        message_delay_initial, message_delay_standard, cta
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, name, tag, botTemperature || 0.4, brief, resiliancy || 3, bookingReadiness || 2,
      tone || 'Friendly and Casual', initialMessage, objective, companyInformation || '',
      messageDelayInitial || 30, messageDelayStandard || 5, cta || ''
    );

    if (faqs && faqs.length > 0) {
      const faqStmt = db.prepare('INSERT INTO faqs (template_id, question, answer, delay) VALUES (?, ?, ?, ?)');
      faqs.forEach(faq => {
        let question, answer;
        if (typeof faq.Body === 'string' && faq.Body.startsWith('{')) {
          const parsed = JSON.parse(faq.Body);
          question = parsed.question;
          answer = parsed.answer;
        } else {
          question = faq.question;
          answer = faq.answer;
        }
        faqStmt.run(id, question, answer, faq.Delay || 1);
      });
    }

    if (qualificationQuestions && qualificationQuestions.length > 0) {
      const qStmt = db.prepare('INSERT INTO qualification_questions (template_id, text, conditions, delay) VALUES (?, ?, ?, ?)');
      qualificationQuestions.forEach(q => {
        let text;
        if (typeof q.Body === 'string' && q.Body.startsWith('{')) {
          const parsed = JSON.parse(q.Body);
          text = parsed.text;
        } else {
          text = q.text || q.Body;
        }
        qStmt.run(id, text, JSON.stringify(q.conditions || []), q.Delay || 1);
      });
    }

    if (followUps && followUps.length > 0) {
      const fStmt = db.prepare('INSERT INTO follow_ups (template_id, body, delay) VALUES (?, ?, ?)');
      followUps.forEach(f => {
        fStmt.run(id, f.Body, f.Delay);
      });
    }

    if (customActions) {
      Object.keys(customActions).forEach(actionType => {
        const actions = customActions[actionType];
        actions.forEach(action => {
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

    res.status(201).json({ id, message: 'Template created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update template
router.put('/:id', (req, res) => {
  try {
    const { name, brief, tone, initialMessage, objective, tag, botTemperature, companyInformation, cta } = req.body;
    
    db.prepare(`
      UPDATE templates 
      SET name = ?, brief = ?, tone = ?, initial_message = ?, objective = ?, tag = ?, 
          bot_temperature = ?, company_information = ?, cta = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, brief, tone, initialMessage, objective, tag, botTemperature, companyInformation, cta, req.params.id);

    res.json({ message: 'Template updated successfully' });
  } catch (error) {
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