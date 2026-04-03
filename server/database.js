// server/database.js
// Database persistence layer for player accounts, progression, and social data

class Database {
  constructor() {
    // In-memory storage (can be replaced with MongoDB, PostgreSQL, etc.)
    this.store = {
      accounts: {},      // playerId -> accountData
      upgrades: {},      // playerId -> upgradeData
      gold: {},          // playerId -> goldAmount
      friends: {},       // playerId -> [friendIds]
      clans: {},         // clanId -> clanData
      clanMembers: {},   // playerId -> clanId
      leaderboards: {}   // type -> [playerData]
    };

    // Simple in-memory queue for persistence
    this.pendingSaves = new Map();
    this.saveInterval = 60000; // Save every 60 seconds
    this.startAutoSave();
  }

  /**
   * Initialize database connection
   * Replace this with actual database initialization (MongoDB, PostgreSQL, etc.)
   */
  async initialize(config = {}) {
    console.log('📊 Database initialized (in-memory)');
    // TODO: Replace with actual database connection
    // if (config.mongodb) { await connectMongoDB(config.mongodb); }
    // if (config.postgresql) { await connectPostgreSQL(config.postgresql); }
    return true;
  }

  /**
   * Save player account
   */
  async saveAccount(playerId, accountData) {
    this.store.accounts[playerId] = accountData;
    this.pendingSaves.set(`account_${playerId}`, Date.now());
    return { success: true, playerId };
  }

  /**
   * Load player account
   */
  async loadAccount(playerId) {
    return this.store.accounts[playerId] || null;
  }

  /**
   * Save player upgrades
   */
  async saveUpgrades(playerId, upgradeData) {
    this.store.upgrades[playerId] = upgradeData;
    this.pendingSaves.set(`upgrades_${playerId}`, Date.now());
    return { success: true, playerId };
  }

  /**
   * Load player upgrades
   */
  async loadUpgrades(playerId) {
    return this.store.upgrades[playerId] || {};
  }

  /**
   * Save player gold
   */
  async saveGold(playerId, amount) {
    this.store.gold[playerId] = amount;
    this.pendingSaves.set(`gold_${playerId}`, Date.now());
    return { success: true, playerId, amount };
  }

  /**
   * Load player gold
   */
  async loadGold(playerId) {
    return this.store.gold[playerId] || 0;
  }

  /**
   * Save friends list
   */
  async saveFriends(playerId, friendIds) {
    this.store.friends[playerId] = friendIds;
    this.pendingSaves.set(`friends_${playerId}`, Date.now());
    return { success: true, playerId };
  }

  /**
   * Load friends list
   */
  async loadFriends(playerId) {
    return this.store.friends[playerId] || [];
  }

  /**
   * Create clan
   */
  async createClan(clanId, clanData) {
    this.store.clans[clanId] = clanData;
    this.pendingSaves.set(`clan_${clanId}`, Date.now());
    return { success: true, clanId };
  }

  /**
   * Load clan
   */
  async loadClan(clanId) {
    return this.store.clans[clanId] || null;
  }

  /**
   * Update clan
   */
  async updateClan(clanId, clanData) {
    this.store.clans[clanId] = { ...this.store.clans[clanId], ...clanData };
    this.pendingSaves.set(`clan_${clanId}`, Date.now());
    return { success: true, clanId };
  }

  /**
   * Get all clans
   */
  async getAllClans() {
    return Object.values(this.store.clans);
  }

  /**
   * Save clan membership
   */
  async saveClanMembership(playerId, clanId) {
    this.store.clanMembers[playerId] = clanId;
    this.pendingSaves.set(`clanmember_${playerId}`, Date.now());
    return { success: true, playerId, clanId };
  }

  /**
   * Get player's clan
   */
  async getPlayerClan(playerId) {
    const clanId = this.store.clanMembers[playerId];
    if (!clanId) return null;
    return await this.loadClan(clanId);
  }

  /**
   * Remove from clan
   */
  async removeClanMembership(playerId) {
    delete this.store.clanMembers[playerId];
    return { success: true, playerId };
  }

  /**
   * Update leaderboard
   */
  async updateLeaderboard(type, playerData) {
    if (!this.store.leaderboards[type]) {
      this.store.leaderboards[type] = [];
    }

    // Find and update or add player
    const index = this.store.leaderboards[type].findIndex(p => p.playerId === playerData.playerId);
    if (index >= 0) {
      this.store.leaderboards[type][index] = playerData;
    } else {
      this.store.leaderboards[type].push(playerData);
    }

    // Sort by score descending
    this.store.leaderboards[type].sort((a, b) => (b.score || 0) - (a.score || 0));

    this.pendingSaves.set(`leaderboard_${type}`, Date.now());
    return { success: true, type };
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(type, limit = 100) {
    const board = this.store.leaderboards[type] || [];
    return board.slice(0, limit);
  }

  /**
   * Query player rank on leaderboard
   */
  async getPlayerRank(type, playerId) {
    const board = this.store.leaderboards[type] || [];
    const rank = board.findIndex(p => p.playerId === playerId);
    if (rank >= 0) {
      return {
        rank: rank + 1,
        totalPlayers: board.length,
        score: board[rank].score
      };
    }
    return null;
  }

  /**
   * Batch load accounts for a list of players
   */
  async loadAccounts(playerIds) {
    const accounts = {};
    playerIds.forEach(id => {
      const account = this.store.accounts[id];
      if (account) {
        accounts[id] = account;
      }
    });
    return accounts;
  }

  /**
   * Delete account
   */
  async deleteAccount(playerId) {
    delete this.store.accounts[playerId];
    delete this.store.upgrades[playerId];
    delete this.store.gold[playerId];
    delete this.store.friends[playerId];
    delete this.store.clanMembers[playerId];
    return { success: true, playerId };
  }

  /**
   * Start auto-save interval
   */
  startAutoSave() {
    setInterval(() => {
      if (this.pendingSaves.size > 0) {
        console.log(`💾 Auto-saving ${this.pendingSaves.size} records`);
        // In real implementation, batch save to database
        this.pendingSaves.clear();
      }
    }, this.saveInterval);
  }

  /**
   * Export all data
   */
  exportAll() {
    return {
      timestamp: Date.now(),
      data: this.store
    };
  }

  /**
   * Import data
   */
  importAll(data) {
    this.store = data.data || data;
  }

  /**
   * Get database stats
   */
  getStats() {
    return {
      accounts: Object.keys(this.store.accounts).length,
      upgrades: Object.keys(this.store.upgrades).length,
      clans: Object.keys(this.store.clans).length,
      leaderboards: Object.keys(this.store.leaderboards).length,
      pendingSaves: this.pendingSaves.size
    };
  }

  /**
   * Clear database
   */
  clear() {
    this.store = {
      accounts: {},
      upgrades: {},
      gold: {},
      friends: {},
      clans: {},
      clanMembers: {},
      leaderboards: {}
    };
    this.pendingSaves.clear();
  }

  /**
   * Close database connection
   */
  async close() {
    // Flush pending saves
    if (this.pendingSaves.size > 0) {
      console.log(`💾 Flushing ${this.pendingSaves.size} pending saves`);
      this.pendingSaves.clear();
    }
    console.log('📊 Database closed');
  }
}

// Singleton instance
let database = null;

export function initializeDatabase(config = {}) {
  if (!database) {
    database = new Database();
    return database.initialize(config);
  }
  return database;
}

export function getDatabase() {
  if (!database) {
    database = new Database();
  }
  return database;
}

export default Database;
