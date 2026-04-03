// src/entities/account.js
// Player account and profile system

export class PlayerAccount {
  constructor(playerId, username, email = null) {
    this.playerId = playerId;
    this.username = username;
    this.email = email;
    this.createdAt = Date.now();
    this.lastPlayedAt = Date.now();
    
    // Game statistics
    this.stats = {
      totalGold: 0,
      totalKills: 0,
      totalShipsSunk: 0,
      totalDamageDealt: 0,
      totalDamageReceived: 0,
      totalShots: 0,
      totalHits: 0,
      totalDeaths: 0,
      totalGamesPlayed: 0,
      totalPlaytime: 0 // seconds
    };

    // Social
    this.friends = new Set();
    this.clanId = null;
    this.clanRole = null; // 'leader', 'officer', 'member'

    // Progression
    this.level = 1; // Could be based on total gold earned
    this.achievements = new Set(); // Achievement IDs
    this.badges = new Set(); // Badge IDs

    // Preferences
    this.preferences = {
      theme: 'dark',
      volume: 0.8,
      language: 'en',
      autoJoinCrew: false,
      showClanChat: true
    };

    // Cosmetics (cosmetic shop items)
    this.cosmetics = new Set(); // Item IDs
    this.activeCosmetics = {
      shipSkin: null,
      sailColors: null,
      nameColor: null
    };
  }

  /**
   * Add friend
   */
  addFriend(friendId) {
    if (friendId === this.playerId) return false;
    if (this.friends.has(friendId)) return false;
    
    this.friends.add(friendId);
    return true;
  }

  /**
   * Remove friend
   */
  removeFriend(friendId) {
    return this.friends.delete(friendId);
  }

  /**
   * Check if is friend
   */
  isFriend(friendId) {
    return this.friends.has(friendId);
  }

  /**
   * Get friends list
   */
  getFriends() {
    return Array.from(this.friends);
  }

  /**
   * Set clan
   */
  setClan(clanId, role = 'member') {
    this.clanId = clanId;
    this.clanRole = role;
  }

  /**
   * Leave clan
   */
  leaveClan() {
    this.clanId = null;
    this.clanRole = null;
  }

  /**
   * Get profile
   */
  getProfile() {
    return {
      playerId: this.playerId,
      username: this.username,
      level: this.level,
      createdAt: this.createdAt,
      lastPlayedAt: this.lastPlayedAt,
      stats: { ...this.stats },
      friendCount: this.friends.size,
      clanId: this.clanId,
      clanRole: this.clanRole,
      achievements: Array.from(this.achievements),
      badges: Array.from(this.badges)
    };
  }

  /**
   * Update stats from a game session
   */
  updateFromSession(sessionStats) {
    this.stats.totalGold += sessionStats.goldEarned || 0;
    this.stats.totalKills += sessionStats.kills || 0;
    this.stats.totalShipsSunk += sessionStats.shipsSunk || 0;
    this.stats.totalDamageDealt += sessionStats.damageDealt || 0;
    this.stats.totalDamageReceived += sessionStats.damageReceived || 0;
    this.stats.totalShots += sessionStats.shots || 0;
    this.stats.totalHits += sessionStats.hits || 0;
    this.stats.totalDeaths += sessionStats.deaths || 0;
    this.stats.totalGamesPlayed += 1;
    this.stats.totalPlaytime += sessionStats.playtime || 0;
    
    this.lastPlayedAt = Date.now();
    this.updateLevel();
  }

  /**
   * Update level based on stats
   */
  updateLevel() {
    // Simple level progression: 1 level per 10,000 gold
    this.level = Math.floor(this.stats.totalGold / 10000) + 1;
  }

  /**
   * Check and award achievement
   */
  addAchievement(achievementId) {
    if (!this.achievements.has(achievementId)) {
      this.achievements.add(achievementId);
      return true;
    }
    return false;
  }

  /**
   * Add badge
   */
  addBadge(badgeId) {
    if (!this.badges.has(badgeId)) {
      this.badges.add(badgeId);
      return true;
    }
    return false;
  }

  /**
   * Get hit ratio
   */
  getHitRatio() {
    if (this.stats.totalShots === 0) return 0;
    return this.stats.totalHits / this.stats.totalShots;
  }

  /**
   * Get avg damage per shot
   */
  getAvgDamagePerShot() {
    if (this.stats.totalShots === 0) return 0;
    return this.stats.totalDamageDealt / this.stats.totalShots;
  }

  /**
   * Export for database storage
   */
  toJSON() {
    return {
      playerId: this.playerId,
      username: this.username,
      email: this.email,
      createdAt: this.createdAt,
      lastPlayedAt: this.lastPlayedAt,
      stats: this.stats,
      friends: Array.from(this.friends),
      clanId: this.clanId,
      clanRole: this.clanRole,
      level: this.level,
      achievements: Array.from(this.achievements),
      badges: Array.from(this.badges),
      preferences: this.preferences,
      cosmetics: Array.from(this.cosmetics),
      activeCosmetics: this.activeCosmetics
    };
  }

  /**
   * Import from database storage
   */
  static fromJSON(data) {
    const account = new PlayerAccount(data.playerId, data.username, data.email);
    account.createdAt = data.createdAt;
    account.lastPlayedAt = data.lastPlayedAt;
    account.stats = data.stats || account.stats;
    account.friends = new Set(data.friends || []);
    account.clanId = data.clanId || null;
    account.clanRole = data.clanRole || null;
    account.level = data.level || 1;
    account.achievements = new Set(data.achievements || []);
    account.badges = new Set(data.badges || []);
    account.preferences = data.preferences || account.preferences;
    account.cosmetics = new Set(data.cosmetics || []);
    account.activeCosmetics = data.activeCosmetics || account.activeCosmetics;
    return account;
  }
}

export class AccountManager {
  constructor() {
    this.accounts = new Map(); // playerId -> PlayerAccount
  }

  /**
   * Create account
   */
  createAccount(playerId, username, email = null) {
    if (this.accounts.has(playerId)) {
      return null; // Account already exists
    }

    const account = new PlayerAccount(playerId, username, email);
    this.accounts.set(playerId, account);
    return account;
  }

  /**
   * Get account
   */
  getAccount(playerId) {
    return this.accounts.get(playerId);
  }

  /**
   * Get or create account
   */
  getOrCreateAccount(playerId, username, email = null) {
    const account = this.accounts.get(playerId);
    if (account) return account;
    return this.createAccount(playerId, username, email);
  }

  /**
   * Delete account
   */
  deleteAccount(playerId) {
    return this.accounts.delete(playerId);
  }

  /**
   * Update account from session
   */
  updateFromSession(playerId, sessionStats) {
    const account = this.accounts.get(playerId);
    if (account) {
      account.updateFromSession(sessionStats);
    }
  }

  /**
   * Get player stats
   */
  getPlayerStats(playerId) {
    const account = this.accounts.get(playerId);
    return account ? account.stats : null;
  }

  /**
   * Get all accounts
   */
  getAllAccounts() {
    return Array.from(this.accounts.values());
  }

  /**
   * Export all for database
   */
  exportAll() {
    const data = {};
    this.accounts.forEach((account, playerId) => {
      data[playerId] = account.toJSON();
    });
    return data;
  }

  /**
   * Import from database
   */
  importAll(data) {
    Object.entries(data).forEach(([playerId, accountData]) => {
      const account = PlayerAccount.fromJSON(accountData);
      this.accounts.set(playerId, account);
    });
  }

  /**
   * Clear all
   */
  clear() {
    this.accounts.clear();
  }
}

export default AccountManager;
