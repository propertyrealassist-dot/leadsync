/**
 * Unified Database Configuration
 *
 * This module provides a unified interface for database operations
 * that works with both SQLite (synchronous) and PostgreSQL (async)
 *
 * Set DB_TYPE=postgres in .env to use CockroachDB/PostgreSQL
 * Set DB_TYPE=sqlite to use SQLite (default)
 */

const dbType = process.env.DB_TYPE || 'sqlite';

console.log(`🗄️  Database Type: ${dbType.toUpperCase()}`);

let pool = null;
let postgresQuery = null;
let getClient = null;
let initializeDatabase = null;
let generateApiKey = null;
let generateUUID = null;
let hashApiKey = null;

// Initialize PostgreSQL if needed
if (dbType === 'postgres') {
  const postgresDb = require('./database-postgres');
  pool = postgresDb.pool;
  postgresQuery = postgresDb.query;
  getClient = postgresDb.getClient;
  initializeDatabase = postgresDb.initializeDatabase;
  generateApiKey = postgresDb.generateApiKey;
  generateUUID = postgresDb.generateUUID;
  hashApiKey = postgresDb.hashApiKey;

  console.log('✅ Using PostgreSQL/CockroachDB');

  // Initialize database on startup
  initializeDatabase().catch(err => {
    console.error('❌ Failed to initialize PostgreSQL database:', err);
  });
} else {
  console.log('✅ Using SQLite');

  // Provide default crypto functions for SQLite mode
  const crypto = require('crypto');

  generateApiKey = (prefix = 'ak_live') => {
    const randomBytes = crypto.randomBytes(24);
    const key = randomBytes.toString('base64')
      .replace(/\+/g, '')
      .replace(/\//g, '')
      .replace(/=/g, '')
      .substring(0, 32);
    return `${prefix}_${key}`;
  };

  generateUUID = () => {
    return crypto.randomUUID();
  };

  hashApiKey = (apiKey) => {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  };
}

/**
 * Database Query Interface
 *
 * Provides a unified interface for executing queries across both SQLite and PostgreSQL
 */
class DatabaseQuery {
  /**
   * Execute a SELECT query and return all rows
   * @param {string} sql - SQL query with placeholders (? for SQLite, $1, $2 for PostgreSQL)
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>} Array of rows
   */
  async all(sql, params = []) {
    if (dbType === 'postgres') {
      const pgSql = this.convertPlaceholders(sql);
      const result = await postgresQuery(pgSql, params);
      return result.rows;
    } else {
      const db = require('../database/db');
      return db.prepare(sql).all(...params);
    }
  }

  /**
   * Execute a SELECT query and return first row
   * @param {string} sql - SQL query with placeholders
   * @param {Array} params - Query parameters
   * @returns {Promise<Object|null>} First row or null
   */
  async get(sql, params = []) {
    if (dbType === 'postgres') {
      const pgSql = this.convertPlaceholders(sql);
      const result = await postgresQuery(pgSql, params);
      return result.rows[0] || null;
    } else {
      const db = require('../database/db');
      return db.prepare(sql).get(...params) || null;
    }
  }

  /**
   * Execute INSERT, UPDATE, DELETE query
   * @param {string} sql - SQL query with placeholders
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Result with changes/lastID info
   */
  async run(sql, params = []) {
    if (dbType === 'postgres') {
      const pgSql = this.convertPlaceholders(sql);
      const result = await postgresQuery(pgSql, params);
      return {
        changes: result.rowCount,
        lastID: result.rows[0]?.id || null
      };
    } else {
      const db = require('../database/db');
      return db.prepare(sql).run(...params);
    }
  }

  /**
   * Convert SQLite placeholders (?) to PostgreSQL placeholders ($1, $2, etc.)
   * @param {string} sql - SQL query with ? placeholders
   * @returns {string} SQL with $1, $2, etc. placeholders
   */
  convertPlaceholders(sql) {
    let index = 0;
    return sql.replace(/\?/g, () => {
      index++;
      return `$${index}`;
    });
  }

  /**
   * Begin a transaction (PostgreSQL only, no-op for SQLite with better-sqlite3)
   */
  async beginTransaction() {
    if (dbType === 'postgres') {
      const client = await getClient();
      await client.query('BEGIN');
      return client;
    }
    // SQLite with better-sqlite3 handles transactions differently
    // We'll use the immediate transaction mode
    return null;
  }

  /**
   * Commit a transaction
   */
  async commit(client) {
    if (dbType === 'postgres' && client) {
      await client.query('COMMIT');
      client.release();
    }
  }

  /**
   * Rollback a transaction
   */
  async rollback(client) {
    if (dbType === 'postgres' && client) {
      await client.query('ROLLBACK');
      client.release();
    }
  }

  /**
   * Create a transaction wrapper that works with both databases
   * For SQLite: uses better-sqlite3's transaction()
   * For PostgreSQL: uses BEGIN/COMMIT
   */
  transaction(callback) {
    if (dbType === 'postgres') {
      // Return an async function for PostgreSQL
      return async (...args) => {
        const client = await this.beginTransaction();
        try {
          const result = await callback(...args);
          await this.commit(client);
          return result;
        } catch (error) {
          await this.rollback(client);
          throw error;
        }
      };
    } else {
      // For SQLite, use the native transaction support
      const sqliteDb = require('../database/db');
      return sqliteDb.transaction(callback);
    }
  }

  /**
   * Prepare statement (compatibility layer)
   * For SQLite: returns native prepared statement
   * For PostgreSQL: returns a wrapper object with run/get/all methods
   */
  prepare(sql) {
    if (dbType === 'postgres') {
      // Return a wrapper that mimics SQLite's prepared statement interface
      const pgSql = this.convertPlaceholders(sql);
      return {
        run: async (...params) => {
          const result = await postgresQuery(pgSql, params);
          return {
            changes: result.rowCount,
            lastID: result.rows[0]?.id || null,
            lastInsertRowid: result.rows[0]?.id || null
          };
        },
        get: async (...params) => {
          const result = await postgresQuery(pgSql, params);
          return result.rows[0] || null;
        },
        all: async (...params) => {
          const result = await postgresQuery(pgSql, params);
          return result.rows;
        }
      };
    } else {
      // For SQLite, use the native prepare
      const sqliteDb = require('../database/db');
      return sqliteDb.prepare(sql);
    }
  }

  /**
   * Pragma (SQLite only)
   */
  pragma(pragmaStr) {
    if (dbType === 'sqlite') {
      const sqliteDb = require('../database/db');
      return sqliteDb.pragma(pragmaStr);
    }
    // PostgreSQL doesn't support pragma, just no-op
    return null;
  }
}

// Create singleton instance
const db = new DatabaseQuery();

/**
 * Helper function to wrap sync code for async compatibility
 * This allows gradual migration from sync to async
 */
function makeAsync(fn) {
  return async (...args) => {
    return fn(...args);
  };
}

module.exports = {
  // Database type
  dbType,

  // Unified query interface
  db,
  query: db,

  // Raw PostgreSQL pool (only available in postgres mode)
  pool,
  getClient,

  // Utility functions
  generateApiKey,
  generateUUID,
  hashApiKey,

  // Transaction helpers
  beginTransaction: db.beginTransaction.bind(db),
  commit: db.commit.bind(db),
  rollback: db.rollback.bind(db),

  // Helper to check db type
  isPostgres: () => dbType === 'postgres',
  isSQLite: () => dbType === 'sqlite'
};
