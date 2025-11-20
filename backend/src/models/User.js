const bcrypt = require('bcryptjs');

/**
 * User Model - Abstraction for both SQLite and PostgreSQL
 */
class User {
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
  async create(userData) {
    const {
      email,
      password,
      firstName,
      lastName,
      companyName,
      clientId,
      apiKey,
      apiKeyHash
    } = userData;

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = require('crypto').randomUUID();

    if (this.dbType === 'postgres') {
      const result = await this.query(
        `INSERT INTO users (
          id, email, password_hash, first_name, last_name, company_name,
          client_id, api_key, api_key_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, email, first_name, last_name, company_name, client_id, created_at`,
        [userId, email, hashedPassword, firstName, lastName, companyName, clientId, apiKey, apiKeyHash]
      );
      return result.rows[0];
    } else {
      const stmt = this.db.prepare(`
        INSERT INTO users (
          id, email, password_hash, first_name, last_name, company_name,
          client_id, api_key, api_key_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(userId, email, hashedPassword, firstName, lastName, companyName, clientId, apiKey, apiKeyHash);

      return this.findById(userId);
    }
  }

  // ==========================================
  // READ
  // ==========================================
  async findByEmail(email) {
    if (this.dbType === 'postgres') {
      const result = await this.query('SELECT * FROM users WHERE email = $1', [email]);
      return result.rows[0] || null;
    } else {
      return this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) || null;
    }
  }

  async findById(id) {
    if (this.dbType === 'postgres') {
      const result = await this.query(
        'SELECT id, email, first_name, last_name, company_name, client_id, account_status, created_at FROM users WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } else {
      return this.db.prepare(
        'SELECT id, email, first_name, last_name, company_name, client_id, account_status, created_at FROM users WHERE id = ?'
      ).get(id) || null;
    }
  }

  async findByClientId(clientId) {
    if (this.dbType === 'postgres') {
      const result = await this.query('SELECT * FROM users WHERE client_id = $1', [clientId]);
      return result.rows[0] || null;
    } else {
      return this.db.prepare('SELECT * FROM users WHERE client_id = ?').get(clientId) || null;
    }
  }

  async findByApiKey(apiKey) {
    if (this.dbType === 'postgres') {
      const result = await this.query('SELECT * FROM users WHERE api_key = $1', [apiKey]);
      return result.rows[0] || null;
    } else {
      return this.db.prepare('SELECT * FROM users WHERE api_key = ?').get(apiKey) || null;
    }
  }

  async findAll() {
    if (this.dbType === 'postgres') {
      const result = await this.query(
        'SELECT id, email, first_name, last_name, company_name, account_status, created_at FROM users ORDER BY created_at DESC'
      );
      return result.rows;
    } else {
      return this.db.prepare(
        'SELECT id, email, first_name, last_name, company_name, account_status, created_at FROM users ORDER BY created_at DESC'
      ).all();
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
      firstName: 'first_name',
      lastName: 'last_name',
      companyName: 'company_name',
      email: 'email',
      password: 'password_hash',
      accountStatus: 'account_status'
    };

    for (const [key, dbField] of Object.entries(allowedFields)) {
      if (updates[key] !== undefined) {
        if (key === 'password') {
          const hashedPassword = await bcrypt.hash(updates[key], 10);
          if (this.dbType === 'postgres') {
            fields.push(`${dbField} = $${paramCount}`);
            values.push(hashedPassword);
            paramCount++;
          } else {
            fields.push(`${dbField} = ?`);
            values.push(hashedPassword);
          }
        } else {
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
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(this.dbType === 'postgres' ? `updated_at = CURRENT_TIMESTAMP` : `updated_at = CURRENT_TIMESTAMP`);

    if (this.dbType === 'postgres') {
      values.push(id);
      const result = await this.query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING id, email, first_name, last_name, company_name`,
        values
      );
      return result.rows[0];
    } else {
      values.push(id);
      this.db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
      return this.findById(id);
    }
  }

  async updateLastLogin(id) {
    if (this.dbType === 'postgres') {
      await this.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    } else {
      this.db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
    }
  }

  // ==========================================
  // DELETE
  // ==========================================
  async delete(id) {
    if (this.dbType === 'postgres') {
      const result = await this.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
      return result.rows.length > 0;
    } else {
      const result = this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
      return result.changes > 0;
    }
  }

  // ==========================================
  // AUTHENTICATION
  // ==========================================
  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = User;
