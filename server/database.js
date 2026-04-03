// server/database.js
// SQL Database persistence layer using sql.js (SQLite) or PostgreSQL

import initSqlJs from 'sql.js';
import postgres from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class DatabaseManager {
  constructor(config = {}) {
    this.config = config;
    this.db = null;
    this.SQL = null;
    this.usePostgreSQL = config.usePostgreSQL || false;
    this.dbPath = config.sqlitePath || path.join(__dirname, 'shipstrike.db');
    this.pgPool = null;
    this.autoSaveInterval = null;
  }

  /**
   * Initialize database connection
   */
  async initialize() {
    try {
      if (this.usePostgreSQL) {
        await this.initPostgreSQL();
      } else {
        await this.initSQLite();
      }

      await this.createTables();
      console.log('✅ Database initialized (SQL)');
      return true;
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize SQLite using sql.js
   */
  async initSQLite() {
    this.SQL = await initSqlJs();

    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new this.SQL.Database(buffer);
      console.log('📦 Loaded existing SQLite database:', this.dbPath);
    } else {
      this.db = new this.SQL.Database();
      console.log('📦 Created new SQLite database:', this.dbPath);
    }

    this.autoSaveInterval = setInterval(() => this.saveSQLiteDatabase(), 30000);
  }

  /**
   * Save SQLite database to disk
   */
  saveSQLiteDatabase() {
    if (this.db && this.SQL) {
      const data = this.db.export();
      fs.writeFileSync(this.dbPath, Buffer.from(data));
    }
  }

  /**
   * Initialize PostgreSQL
   */
  async initPostgreSQL() {
    const { Pool } = postgres;
    this.pgPool = new Pool({
      user: this.config.pgUser || process.env.DB_USER || 'postgres',
      password: this.config.pgPassword || process.env.DB_PASSWORD,
      host: this.config.pgHost || process.env.DB_HOST || 'localhost',
      port: this.config.pgPort || process.env.DB_PORT || 5432,
      database: this.config.pgDatabase || process.env.DB_NAME || 'shipstrike',
      max: 20
    });

    await this.pgPool.query('SELECT NOW()');
    console.log('🐘 Connected to PostgreSQL database');
  }

  /**
   * Create all tables
   */
  async createTables() {
    if (this.usePostgreSQL) {
      await this.createPostgreSQLTables();
    } else {
      this.createSQLiteTables();
    }
  }

  /**
   * Create SQLite tables
   */
  createSQLiteTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS accounts (
        playerId TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        createdAt INTEGER NOT NULL,
        lastLogin INTEGER,
        level INTEGER DEFAULT 1,
        experience INTEGER DEFAULT 0
      )`,

      `CREATE TABLE IF NOT EXISTS gold (
        playerId TEXT PRIMARY KEY,
        amount INTEGER DEFAULT 1000
      )`,

      `CREATE TABLE IF NOT EXISTS upgrades (
        playerId TEXT PRIMARY KEY,
        hull INTEGER DEFAULT 0,
        cannons INTEGER DEFAULT 0,
        speed INTEGER DEFAULT 0,
        crew INTEGER DEFAULT 0
      )`,

      `CREATE TABLE IF NOT EXISTS friends (
        playerId TEXT NOT NULL,
        friendId TEXT NOT NULL,
        addedAt INTEGER NOT NULL,
        PRIMARY KEY(playerId, friendId)
      )`,

      `CREATE TABLE IF NOT EXISTS clans (
        clanId TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        leader TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        members INTEGER DEFAULT 1,
        description TEXT
      )`,

      `CREATE TABLE IF NOT EXISTS clan_members (
        playerId TEXT PRIMARY KEY,
        clanId TEXT NOT NULL,
        joinedAt INTEGER NOT NULL,
        role TEXT DEFAULT 'member'
      )`,

      `CREATE TABLE IF NOT EXISTS leaderboard (
        playerId TEXT PRIMARY KEY,
        kills INTEGER DEFAULT 0,
        deaths INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        matches INTEGER DEFAULT 0,
        rank INTEGER,
        lastUpdated INTEGER
      )`,

      `CREATE TABLE IF NOT EXISTS ships (
        shipId TEXT PRIMARY KEY,
        playerId TEXT NOT NULL,
        name TEXT,
        health REAL DEFAULT 100,
        level INTEGER DEFAULT 1,
        createdAt INTEGER NOT NULL
      )`
    ];

    for (const table of tables) {
      try {
        this.db.run(table);
      } catch (error) {
        console.error('Error creating table:', error.message);
      }
    }

    this.saveSQLiteDatabase();
  }

  /**
   * Create PostgreSQL tables
   */
  async createPostgreSQLTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS accounts (
        playerId TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        createdAt BIGINT NOT NULL,
        lastLogin BIGINT,
        level INTEGER DEFAULT 1,
        experience INTEGER DEFAULT 0
      )`,

      `CREATE TABLE IF NOT EXISTS gold (
        playerId TEXT PRIMARY KEY,
        amount INTEGER DEFAULT 1000
      )`,

      `CREATE TABLE IF NOT EXISTS upgrades (
        playerId TEXT PRIMARY KEY,
        hull INTEGER DEFAULT 0,
        cannons INTEGER DEFAULT 0,
        speed INTEGER DEFAULT 0,
        crew INTEGER DEFAULT 0
      )`,

      `CREATE TABLE IF NOT EXISTS friends (
        playerId TEXT NOT NULL,
        friendId TEXT NOT NULL,
        addedAt BIGINT NOT NULL,
        PRIMARY KEY(playerId, friendId)
      )`,

      `CREATE TABLE IF NOT EXISTS clans (
        clanId TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        leader TEXT NOT NULL,
        createdAt BIGINT NOT NULL,
        members INTEGER DEFAULT 1,
        description TEXT
      )`,

      `CREATE TABLE IF NOT EXISTS clan_members (
        playerId TEXT PRIMARY KEY,
        clanId TEXT NOT NULL,
        joinedAt BIGINT NOT NULL,
        role TEXT DEFAULT 'member'
      )`,

      `CREATE TABLE IF NOT EXISTS leaderboard (
        playerId TEXT PRIMARY KEY,
        kills INTEGER DEFAULT 0,
        deaths INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        matches INTEGER DEFAULT 0,
        rank INTEGER,
        lastUpdated BIGINT
      )`,

      `CREATE TABLE IF NOT EXISTS ships (
        shipId TEXT PRIMARY KEY,
        playerId TEXT NOT NULL,
        name TEXT,
        health REAL DEFAULT 100,
        level INTEGER DEFAULT 1,
        createdAt BIGINT NOT NULL
      )`
    ];

    for (const table of tables) {
      try {
        await this.pgPool.query(table);
      } catch (error) {
        console.error('Error creating table:', error.message);
      }
    }
  }

  // =================== ACCOUNT METHODS ===================

  async saveAccount(playerId, accountData) {
    if (this.usePostgreSQL) {
      await this.pgPool.query(
        `INSERT INTO accounts (playerId, username, email, createdAt, lastLogin, level, experience)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (playerId) DO UPDATE SET
         username = EXCLUDED.username,
         email = EXCLUDED.email,
         lastLogin = EXCLUDED.lastLogin,
         level = EXCLUDED.level,
         experience = EXCLUDED.experience`,
        [playerId, accountData.username, accountData.email || null, accountData.createdAt || Date.now(),
          accountData.lastLogin || Date.now(), accountData.level || 1, accountData.experience || 0]
      );
    } else {
      const stmt = this.db.prepare(
        `INSERT OR REPLACE INTO accounts (playerId, username, email, createdAt, lastLogin, level, experience)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );
      stmt.bind([playerId, accountData.username, accountData.email || null, accountData.createdAt || Date.now(),
        accountData.lastLogin || Date.now(), accountData.level || 1, accountData.experience || 0]);
      stmt.step();
      stmt.free();
      this.saveSQLiteDatabase();
    }
    return { success: true, playerId };
  }

  async loadAccount(playerId) {
    if (this.usePostgreSQL) {
      const result = await this.pgPool.query('SELECT * FROM accounts WHERE playerId = $1', [playerId]);
      return result.rows[0] || null;
    } else {
      const stmt = this.db.prepare('SELECT * FROM accounts WHERE playerId = ?');
      stmt.bind([playerId]);
      if (stmt.step()) {
        const result = stmt.getAsObject();
        stmt.free();
        return result;
      }
      stmt.free();
      return null;
    }
  }

  // =================== GOLD METHODS ===================

  async saveGold(playerId, amount) {
    if (this.usePostgreSQL) {
      await this.pgPool.query(
        `INSERT INTO gold (playerId, amount) VALUES ($1, $2)
         ON CONFLICT (playerId) DO UPDATE SET amount = $2`,
        [playerId, amount]
      );
    } else {
      const stmt = this.db.prepare(`INSERT OR REPLACE INTO gold (playerId, amount) VALUES (?, ?)`);
      stmt.bind([playerId, amount]);
      stmt.step();
      stmt.free();
      this.saveSQLiteDatabase();
    }
    return { success: true, playerId, amount };
  }

  async loadGold(playerId) {
    if (this.usePostgreSQL) {
      const result = await this.pgPool.query('SELECT amount FROM gold WHERE playerId = $1', [playerId]);
      return result.rows[0]?.amount || 1000;
    } else {
      const stmt = this.db.prepare('SELECT amount FROM gold WHERE playerId = ?');
      stmt.bind([playerId]);
      if (stmt.step()) {
        const result = stmt.getAsObject();
        stmt.free();
        return result.amount || 1000;
      }
      stmt.free();
      return 1000;
    }
  }

  // =================== UPGRADES METHODS ===================

  async saveUpgrades(playerId, upgradesData) {
    if (this.usePostgreSQL) {
      await this.pgPool.query(
        `INSERT INTO upgrades (playerId, hull, cannons, speed, crew)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (playerId) DO UPDATE SET
         hull = EXCLUDED.hull, cannons = EXCLUDED.cannons, speed = EXCLUDED.speed, crew = EXCLUDED.crew`,
        [playerId, upgradesData.hull || 0, upgradesData.cannons || 0, upgradesData.speed || 0, upgradesData.crew || 0]
      );
    } else {
      const stmt = this.db.prepare(
        `INSERT OR REPLACE INTO upgrades (playerId, hull, cannons, speed, crew) VALUES (?, ?, ?, ?, ?)`
      );
      stmt.bind([playerId, upgradesData.hull || 0, upgradesData.cannons || 0, upgradesData.speed || 0, upgradesData.crew || 0]);
      stmt.step();
      stmt.free();
      this.saveSQLiteDatabase();
    }
    return { success: true, playerId };
  }

  async loadUpgrades(playerId) {
    if (this.usePostgreSQL) {
      const result = await this.pgPool.query('SELECT * FROM upgrades WHERE playerId = $1', [playerId]);
      return result.rows[0] || { hull: 0, cannons: 0, speed: 0, crew: 0 };
    } else {
      const stmt = this.db.prepare('SELECT * FROM upgrades WHERE playerId = ?');
      stmt.bind([playerId]);
      if (stmt.step()) {
        const result = stmt.getAsObject();
        stmt.free();
        return result;
      }
      stmt.free();
      return { hull: 0, cannons: 0, speed: 0, crew: 0 };
    }
  }

  // =================== LEADERBOARD METHODS ===================

  async getLeaderboard(limit = 100) {
    if (this.usePostgreSQL) {
      const result = await this.pgPool.query(
        `SELECT playerId, kills, deaths, wins, matches, rank FROM leaderboard ORDER BY rank ASC LIMIT $1`,
        [limit]
      );
      return result.rows;
    } else {
      const stmt = this.db.prepare(
        `SELECT playerId, kills, deaths, wins, matches, rank FROM leaderboard ORDER BY rank ASC LIMIT ?`
      );
      stmt.bind([limit]);
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    }
  }

  async updateLeaderboard(playerId, stats) {
    if (this.usePostgreSQL) {
      await this.pgPool.query(
        `INSERT INTO leaderboard (playerId, kills, deaths, wins, matches, rank, lastUpdated)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (playerId) DO UPDATE SET
         kills = EXCLUDED.kills, deaths = EXCLUDED.deaths, wins = EXCLUDED.wins, 
         matches = EXCLUDED.matches, rank = EXCLUDED.rank, lastUpdated = EXCLUDED.lastUpdated`,
        [playerId, stats.kills || 0, stats.deaths || 0, stats.wins || 0, stats.matches || 0, stats.rank || 0, Date.now()]
      );
    } else {
      const stmt = this.db.prepare(
        `INSERT OR REPLACE INTO leaderboard (playerId, kills, deaths, wins, matches, rank, lastUpdated)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );
      stmt.bind([playerId, stats.kills || 0, stats.deaths || 0, stats.wins || 0, stats.matches || 0, stats.rank || 0, Date.now()]);
      stmt.step();
      stmt.free();
      this.saveSQLiteDatabase();
    }
    return { success: true, playerId };
  }

  // =================== CLAN METHODS ===================

  async saveClan(clanId, clanData) {
    if (this.usePostgreSQL) {
      await this.pgPool.query(
        `INSERT INTO clans (clanId, name, leader, createdAt, members, description)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (clanId) DO UPDATE SET
         name = EXCLUDED.name, leader = EXCLUDED.leader, members = EXCLUDED.members, description = EXCLUDED.description`,
        [clanId, clanData.name, clanData.leader, clanData.createdAt || Date.now(), clanData.members || 1, clanData.description || '']
      );
    } else {
      const stmt = this.db.prepare(
        `INSERT OR REPLACE INTO clans (clanId, name, leader, createdAt, members, description)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      stmt.bind([clanId, clanData.name, clanData.leader, clanData.createdAt || Date.now(), clanData.members || 1, clanData.description || '']);
      stmt.step();
      stmt.free();
      this.saveSQLiteDatabase();
    }
    return { success: true, clanId };
  }

  async loadClan(clanId) {
    if (this.usePostgreSQL) {
      const result = await this.pgPool.query('SELECT * FROM clans WHERE clanId = $1', [clanId]);
      return result.rows[0] || null;
    } else {
      const stmt = this.db.prepare('SELECT * FROM clans WHERE clanId = ?');
      stmt.bind([clanId]);
      if (stmt.step()) {
        const result = stmt.getAsObject();
        stmt.free();
        return result;
      }
      stmt.free();
      return null;
    }
  }

  // =================== CLOSE CONNECTION ===================

  close() {
    if (this.usePostgreSQL && this.pgPool) {
      this.pgPool.end();
      console.log('📊 PostgreSQL connection closed');
    } else if (this.db) {
      this.saveSQLiteDatabase();
      if (this.autoSaveInterval) {
        clearInterval(this.autoSaveInterval);
      }
      console.log('📊 SQLite database saved and closed');
    }
  }
}

export default DatabaseManager;
