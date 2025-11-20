/**
 * Template Model - Abstraction for both SQLite and PostgreSQL
 */
class Template {
  constructor(dbType = 'sqlite') {
    this.dbType = dbType;

    if (dbType === 'postgres') {
      const { query } = require('../config/database-postgres');
      this.query = query;
    } else {
      this.db = require('../database/db');
    }
  }

  // ==========================================
  // CREATE
  // ==========================================
  async create(userId, templateData) {
    const {
      name,
      tag,
      botTemperature = 0.4,
      brief,
      resiliancy = 3,
      bookingReadiness = 2,
      tone = 'Friendly and Casual',
      initialMessage,
      objective,
      companyInformation = '',
      messageDelayInitial = 30,
      messageDelayStandard = 5,
      cta = ''
    } = templateData;

    const templateId = require('crypto').randomUUID();

    if (this.dbType === 'postgres') {
      const result = await this.query(
        `INSERT INTO templates (
          id, user_id, name, tag, bot_temperature, brief, resiliancy, booking_readiness,
          tone, initial_message, objective, company_information,
          message_delay_initial, message_delay_standard, cta
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          templateId, userId, name, tag, botTemperature, brief, resiliancy, bookingReadiness,
          tone, initialMessage, objective, companyInformation,
          messageDelayInitial, messageDelayStandard, cta
        ]
      );
      return result.rows[0];
    } else {
      const stmt = this.db.prepare(`
        INSERT INTO templates (
          id, user_id, name, tag, bot_temperature, brief, resiliancy, booking_readiness,
          tone, initial_message, objective, company_information,
          message_delay_initial, message_delay_standard, cta
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        templateId, userId, name, tag, botTemperature, brief, resiliancy, bookingReadiness,
        tone, initialMessage, objective, companyInformation,
        messageDelayInitial, messageDelayStandard, cta
      );

      return this.findById(templateId);
    }
  }

  // ==========================================
  // READ
  // ==========================================
  async findById(id) {
    if (this.dbType === 'postgres') {
      const result = await this.query('SELECT * FROM templates WHERE id = $1', [id]);
      return result.rows[0] || null;
    } else {
      return this.db.prepare('SELECT * FROM templates WHERE id = ?').get(id) || null;
    }
  }

  async findByTag(tag) {
    if (this.dbType === 'postgres') {
      const result = await this.query('SELECT * FROM templates WHERE tag = $1', [tag]);
      return result.rows[0] || null;
    } else {
      return this.db.prepare('SELECT * FROM templates WHERE tag = ?').get(tag) || null;
    }
  }

  async findByUserId(userId) {
    if (this.dbType === 'postgres') {
      const result = await this.query(
        'SELECT * FROM templates WHERE user_id = $1 OR user_id IS NULL ORDER BY created_at DESC',
        [userId]
      );
      return result.rows;
    } else {
      return this.db.prepare(
        "SELECT * FROM templates WHERE user_id = ? OR user_id = 'default_user' ORDER BY created_at DESC"
      ).all(userId);
    }
  }

  async findAll() {
    if (this.dbType === 'postgres') {
      const result = await this.query('SELECT * FROM templates ORDER BY created_at DESC');
      return result.rows;
    } else {
      return this.db.prepare('SELECT * FROM templates ORDER BY created_at DESC').all();
    }
  }

  // ==========================================
  // UPDATE
  // ==========================================
  async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = {
      name: 'name',
      tag: 'tag',
      botTemperature: 'bot_temperature',
      brief: 'brief',
      resiliancy: 'resiliancy',
      bookingReadiness: 'booking_readiness',
      tone: 'tone',
      initialMessage: 'initial_message',
      objective: 'objective',
      companyInformation: 'company_information',
      messageDelayInitial: 'message_delay_initial',
      messageDelayStandard: 'message_delay_standard',
      cta: 'cta'
    };

    for (const [key, dbField] of Object.entries(allowedFields)) {
      if (updates[key] !== undefined) {
        if (this.dbType === 'postgres') {
          fields.push(`${dbField} = $${paramCount}`);
          values.push(updates[key]);
          paramCount++;
        } else {
          fields.push(`${dbField} = ?`);
          values.push(updates[key]);
        }
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    if (this.dbType === 'postgres') {
      values.push(id);
      const result = await this.query(
        `UPDATE templates SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );
      return result.rows[0];
    } else {
      values.push(id);
      this.db.prepare(`UPDATE templates SET ${fields.join(', ')} WHERE id = ?`).run(...values);
      return this.findById(id);
    }
  }

  // ==========================================
  // DELETE
  // ==========================================
  async delete(id) {
    if (this.dbType === 'postgres') {
      const result = await this.query('DELETE FROM templates WHERE id = $1 RETURNING id', [id]);
      return result.rows.length > 0;
    } else {
      const result = this.db.prepare('DELETE FROM templates WHERE id = ?').run(id);
      return result.changes > 0;
    }
  }

  // ==========================================
  // RELATED DATA (FAQs, Questions, etc.)
  // ==========================================
  async getFaqs(templateId) {
    if (this.dbType === 'postgres') {
      const result = await this.query('SELECT * FROM faqs WHERE template_id = $1', [templateId]);
      return result.rows;
    } else {
      return this.db.prepare('SELECT * FROM faqs WHERE template_id = ?').all(templateId);
    }
  }

  async addFaq(templateId, question, answer, delay = 1) {
    if (this.dbType === 'postgres') {
      const result = await this.query(
        'INSERT INTO faqs (template_id, question, answer, delay) VALUES ($1, $2, $3, $4) RETURNING *',
        [templateId, question, answer, delay]
      );
      return result.rows[0];
    } else {
      const stmt = this.db.prepare('INSERT INTO faqs (template_id, question, answer, delay) VALUES (?, ?, ?, ?)');
      const info = stmt.run(templateId, question, answer, delay);
      return this.db.prepare('SELECT * FROM faqs WHERE id = ?').get(info.lastInsertRowid);
    }
  }

  async getQualificationQuestions(templateId) {
    if (this.dbType === 'postgres') {
      const result = await this.query('SELECT * FROM qualification_questions WHERE template_id = $1', [templateId]);
      return result.rows;
    } else {
      return this.db.prepare('SELECT * FROM qualification_questions WHERE template_id = ?').all(templateId);
    }
  }

  async addQualificationQuestion(templateId, text, conditions = null, delay = 1) {
    if (this.dbType === 'postgres') {
      const result = await this.query(
        'INSERT INTO qualification_questions (template_id, text, conditions, delay) VALUES ($1, $2, $3, $4) RETURNING *',
        [templateId, text, conditions, delay]
      );
      return result.rows[0];
    } else {
      const stmt = this.db.prepare('INSERT INTO qualification_questions (template_id, text, conditions, delay) VALUES (?, ?, ?, ?)');
      const info = stmt.run(templateId, text, conditions, delay);
      return this.db.prepare('SELECT * FROM qualification_questions WHERE id = ?').get(info.lastInsertRowid);
    }
  }

  async getFollowUps(templateId) {
    if (this.dbType === 'postgres') {
      const result = await this.query('SELECT * FROM follow_ups WHERE template_id = $1', [templateId]);
      return result.rows;
    } else {
      return this.db.prepare('SELECT * FROM follow_ups WHERE template_id = ?').all(templateId);
    }
  }

  async addFollowUp(templateId, body, delay) {
    if (this.dbType === 'postgres') {
      const result = await this.query(
        'INSERT INTO follow_ups (template_id, body, delay) VALUES ($1, $2, $3) RETURNING *',
        [templateId, body, delay]
      );
      return result.rows[0];
    } else {
      const stmt = this.db.prepare('INSERT INTO follow_ups (template_id, body, delay) VALUES (?, ?, ?)');
      const info = stmt.run(templateId, body, delay);
      return this.db.prepare('SELECT * FROM follow_ups WHERE id = ?').get(info.lastInsertRowid);
    }
  }

  async getCustomActions(templateId) {
    if (this.dbType === 'postgres') {
      const result = await this.query('SELECT * FROM custom_actions WHERE template_id = $1', [templateId]);
      return result.rows;
    } else {
      return this.db.prepare('SELECT * FROM custom_actions WHERE template_id = ?').all(templateId);
    }
  }

  async addCustomAction(templateId, action, ruleCondition, description = null) {
    if (this.dbType === 'postgres') {
      const result = await this.query(
        'INSERT INTO custom_actions (template_id, action, rule_condition, description) VALUES ($1, $2, $3, $4) RETURNING *',
        [templateId, action, ruleCondition, description]
      );
      return result.rows[0];
    } else {
      const stmt = this.db.prepare('INSERT INTO custom_actions (template_id, action, rule_condition, description) VALUES (?, ?, ?, ?)');
      const info = stmt.run(templateId, action, ruleCondition, description);
      return this.db.prepare('SELECT * FROM custom_actions WHERE id = ?').get(info.lastInsertRowid);
    }
  }
}

module.exports = Template;
