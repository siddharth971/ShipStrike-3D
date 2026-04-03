// frontend/src/systems/auth.js
// Authentication system - handles player login and account management

class AuthSystem {
  constructor() {
    this.currentPlayer = this.loadFromLocal();
    this.autoGenPlayerId = this.generatePlayerId();
  }

  /**
   * Generate a unique player ID
   */
  generatePlayerId() {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Hash a simple password (not cryptographically secure - for demo only)
   * In production, this should be handled server-side
   */
  hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Create new player account
   */
  createAccount(username, password = '') {
    if (!username || username.trim().length === 0) {
      throw new Error('Username is required');
    }

    // In production, password should be securely handled
    const playerId = this.generatePlayerId();
    const passwordHash = password ? this.hashPassword(password) : '';

    const player = {
      playerId,
      username: username.trim(),
      passwordHash,
      createdAt: Date.now(),
      lastLogin: Date.now(),
      level: 1,
      gold: 500,
      xp: 0
    };

    this.currentPlayer = player;
    this.saveToLocal(player);

    console.log(`📝 Account created locally:`, { playerId, username: player.username });

    return player;
  }

  /**
   * Login existing player (for demo - in production use server-side auth)
   */
  login(username, password = '') {
    const savedPlayer = this.loadFromLocal();

    if (!savedPlayer) {
      // Auto-create account if none exists
      return this.createAccount(username, password);
    }

    if (savedPlayer.username !== username) {
      throw new Error('Invalid username or password');
    }

    if (password && this.hashPassword(password) !== savedPlayer.passwordHash) {
      throw new Error('Invalid username or password');
    }

    savedPlayer.lastLogin = Date.now();
    this.currentPlayer = savedPlayer;
    this.saveToLocal(savedPlayer);

    return {
      success: true,
      playerId: savedPlayer.playerId,
      username: savedPlayer.username,
      level: savedPlayer.level,
      gold: savedPlayer.gold,
      xp: savedPlayer.xp
    };
  }

  /**
   * Logout current player
   */
  logout() {
    this.currentPlayer = null;
    // Keep data in local storage for next login
  }

  /**
   * Get current player
   */
  getCurrentPlayer() {
    return this.currentPlayer;
  }

  /**
   * Check if player is authenticated
   */
  isAuthenticated() {
    return this.currentPlayer !== null;
  }

  /**
   * Get player ID for current session
   */
  getPlayerId() {
    return this.currentPlayer?.playerId || this.autoGenPlayerId;
  }

  /**
   * Get player username
   */
  getUsername() {
    return this.currentPlayer?.username || `Guest_${this.autoGenPlayerId.substr(-4)}`;
  }

  /**
   * Save player data to localStorage
   */
  saveToLocal(player) {
    try {
      localStorage.setItem('shipstrike_player', JSON.stringify(player));
    } catch (error) {
      console.error('Failed to save player to localStorage:', error);
    }
  }

  /**
   * Load player data from localStorage
   */
  loadFromLocal() {
    try {
      const data = localStorage.getItem('shipstrike_player');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load player from localStorage:', error);
      return null;
    }
  }

  /**
   * Clear saved player data
   */
  clearSavedData() {
    try {
      localStorage.removeItem('shipstrike_player');
      this.currentPlayer = null;
    } catch (error) {
      console.error('Failed to clear saved data:', error);
    }
  }

  /**
   * Get list of recent players (for quick login)
   */
  getRecentPlayers() {
    const players = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('shipstrike_player_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          players.push({
            playerId: data.playerId,
            username: data.username,
            level: data.level || 1,
            lastLogin: data.lastLogin || 0
          });
        } catch (error) {
          console.error('Failed to parse player data:', error);
        }
      }
    }
    return players.sort((a, b) => b.lastLogin - a.lastLogin);
  }
}

export default AuthSystem;
