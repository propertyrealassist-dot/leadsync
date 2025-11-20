/**
 * Database Adapter
 *
 * This module provides a unified interface for database operations
 * that works with both SQLite and PostgreSQL (CockroachDB)
 *
 * Set DB_TYPE=postgres in .env to use PostgreSQL
 * Set DB_TYPE=sqlite (or leave unset) to use SQLite
 */

const dbType = process.env.DB_TYPE || 'sqlite';

console.log(`🗄️  Database Type: ${dbType.toUpperCase()}`);

// Initialize the appropriate models based on DB_TYPE
const User = require('../models/User');
const Template = require('../models/Template');

const userModel = new User(dbType);
const templateModel = new Template(dbType);

// Export the database interface
let db = null;
let query = null;
let pool = null;
let getClient = null;
let initializeDatabase = null;

if (dbType === 'postgres') {
  const postgresDb = require('../config/database-postgres');
  db = null; // Not used in postgres mode
  query = postgresDb.query;
  pool = postgresDb.pool;
  getClient = postgresDb.getClient;
  initializeDatabase = postgresDb.initializeDatabase;

  console.log('✅ Using PostgreSQL/CockroachDB');

  // Initialize database on startup
  initializeDatabase().catch(err => {
    console.error('❌ Failed to initialize PostgreSQL database:', err);
  });
} else {
  db = require('./db');
  console.log('✅ Using SQLite');
}

module.exports = {
  // Database type
  dbType,

  // Raw database access (use models instead when possible)
  db,
  query,
  pool,
  getClient,
  initializeDatabase,

  // Models
  User: userModel,
  Template: templateModel,

  // Helper function to execute raw queries
  async executeQuery(sql, params = []) {
    if (dbType === 'postgres') {
      const result = await query(sql, params);
      return result.rows;
    } else {
      if (sql.toLowerCase().includes('select')) {
        return db.prepare(sql).all(...params);
      } else {
        return db.prepare(sql).run(...params);
      }
    }
  },

  // Helper to get a single row
  async getOne(sql, params = []) {
    if (dbType === 'postgres') {
      const result = await query(sql, params);
      return result.rows[0] || null;
    } else {
      return db.prepare(sql).get(...params) || null;
    }
  }
};
