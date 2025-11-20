/**
 * PostgreSQL Database Wrapper
 *
 * This provides a synchronous-like interface similar to better-sqlite3
 * for compatibility with existing code that expects SQLite
 */

const { pool } = require('../config/database-postgres');

// Create a wrapper that mimics better-sqlite3 API
const db = {
  prepare: (sql) => {
    return {
      get: async (...params) => {
        const result = await pool.query(sql, params);
        return result.rows[0] || null;
      },
      all: async (...params) => {
        const result = await pool.query(sql, params);
        return result.rows;
      },
      run: async (...params) => {
        const result = await pool.query(sql, params);
        return {
          changes: result.rowCount,
          lastInsertRowid: result.rows[0]?.id || null
        };
      }
    };
  },

  exec: async (sql) => {
    await pool.query(sql);
  },

  pragma: (pragma) => {
    // PostgreSQL doesn't use pragma, ignore
    console.log(`Ignoring SQLite pragma: ${pragma}`);
  }
};

module.exports = db;
