// src/systems/leaderboards.js
// Leaderboard system for rankings and achievements

export class LeaderboardSystem {
  constructor() {
    this.leaderboards = {
      kills: [],
      damage: [],
      wealth: [],
      shipsSunk: [],
      winRate: [],
      level: [],
      clans: []
    };

    this.playerRanks = new Map(); // playerId -> { kills, damage, wealth, ... }
    this.updateInterval = 60000; // Update every 60 seconds
    this.lastUpdated = Date.now();
  }

  /**
   * Update player kills
   */
  updatePlayerKills(playerId, kills) {
    this.updatePlayerStat(playerId, 'kills', kills);
  }

  /**
   * Update player damage
   */
  updatePlayerDamage(playerId, damage) {
    this.updatePlayerStat(playerId, 'damage', damage);
  }

  /**
   * Update player wealth
   */
  updatePlayerWealth(playerId, gold) {
    this.updatePlayerStat(playerId, 'wealth', gold);
  }

  /**
   * Update player ships sunk
   */
  updatePlayerShipsSunk(playerId, count) {
    this.updatePlayerStat(playerId, 'shipsSunk', count);
  }

  /**
   * Update player win rate
   */
  updatePlayerWinRate(playerId, wins, total) {
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    this.updatePlayerStat(playerId, 'winRate', winRate);
  }

  /**
   * Update player level
   */
  updatePlayerLevel(playerId, level) {
    this.updatePlayerStat(playerId, 'level', level);
  }

  /**
   * Update clan score
   */
  updateClanScore(clanId, score) {
    let entry = this.leaderboards.clans.find(e => e.id === clanId);
    if (!entry) {
      entry = { id: clanId, clanId, name: clanId, score: 0 };
      this.leaderboards.clans.push(entry);
    }
    entry.score = score;
    entry.lastUpdated = Date.now();
  }

  /**
   * Internal: Update player stat
   */
  updatePlayerStat(playerId, statType, value) {
    let entry = this.leaderboards[statType].find(e => e.id === playerId);

    if (!entry) {
      entry = {
        id: playerId,
        playerId,
        username: `Player_${playerId.substring(0, 8)}`,
        score: value
      };
      this.leaderboards[statType].push(entry);
    } else {
      entry.score = value;
    }

    entry.lastUpdated = Date.now();

    // Sort and keep top 1000
    this.sortLeaderboard(statType);
  }

  /**
   * Sort leaderboard by score (descending)
   */
  sortLeaderboard(type) {
    this.leaderboards[type].sort((a, b) => b.score - a.score);
    
    // Keep only top 1000
    if (this.leaderboards[type].length > 1000) {
      this.leaderboards[type] = this.leaderboards[type].slice(0, 1000);
    }

    // Update ranks
    this.leaderboards[type].forEach((entry, index) => {
      entry.rank = index + 1;
    });
  }

  /**
   * Get leaderboard by type
   */
  getLeaderboard(type, limit = 100, offset = 0) {
    const board = this.leaderboards[type];
    if (!board) return [];

    const result = board.slice(offset, offset + limit).map(entry => ({
      rank: entry.rank,
      id: entry.id,
      playerId: entry.playerId || entry.id,
      clanId: entry.clanId,
      username: entry.username || entry.name,
      score: entry.score,
      lastUpdated: entry.lastUpdated
    }));

    return result;
  }

  /**
   * Get player's rank on all leaderboards
   */
  getPlayerRanks(playerId) {
    const ranks = {};

    Object.keys(this.leaderboards).forEach(type => {
      const board = this.leaderboards[type];
      const entry = board.find(e => e.id === playerId);
      if (entry) {
        ranks[type] = {
          rank: entry.rank,
          score: entry.score,
          outOfTotal: board.length
        };
      }
    });

    return ranks;
  }

  /**
   * Get player's rank for specific type
   */
  getPlayerRank(playerId, type) {
    const board = this.leaderboards[type];
    if (!board) return null;

    const entry = board.find(e => e.id === playerId);
    if (!entry) return null;

    return {
      rank: entry.rank,
      score: entry.score,
      outOfTotal: board.length,
      percentile: (entry.rank / board.length) * 100
    };
  }

  /**
   * Get clan rank
   */
  getClanRank(clanId) {
    const board = this.leaderboards.clans;
    const entry = board.find(e => e.clanId === clanId);
    if (!entry) return null;

    return {
      rank: entry.rank,
      score: entry.score,
      outOfTotal: board.length
    };
  }

  /**
   * Get nearby ranks (for context)
   */
  getNearbyRanks(playerId, type, distance = 5) {
    const board = this.leaderboards[type];
    const entry = board.find(e => e.id === playerId);

    if (!entry) return null;

    const startIdx = Math.max(0, entry.rank - 1 - distance);
    const endIdx = Math.min(board.length, entry.rank + distance);

    return board.slice(startIdx, endIdx).map(e => ({
      rank: e.rank,
      playerId: e.id,
      username: e.username,
      score: e.score,
      isYou: e.id === playerId
    }));
  }

  /**
   * Get top players across all leaderboards
   */
  getTopPlayers(limit = 10) {
    const topKillers = this.leaderboards.kills.slice(0, limit);
    const topDamagers = this.leaderboards.damage.slice(0, limit);
    const wealthiest = this.leaderboards.wealth.slice(0, limit);

    return {
      topKillers: topKillers.map((e, i) => ({ rank: i + 1, ...e })),
      topDamagers: topDamagers.map((e, i) => ({ rank: i + 1, ...e })),
      wealthiest: wealthiest.map((e, i) => ({ rank: i + 1, ...e }))
    };
  }

  /**
   * Get seasonal leaderboard (reset periodically)
   */
  getSeasonalLeaderboard(type, seasonNum, limit = 100) {
    // In production, this would fetch from database with seasonal data
    // For now, return current leaderboard
    return this.getLeaderboard(type, limit);
  }

  /**
   * Reset seasonal leaderboards
   */
  resetSeasonalLeaderboards() {
    // Archive current leaderboards to seasonal history
    // Reset for new season (in production, this persists to database)
    console.log('⚡ Seasonal leaderboards reset');
  }

  /**
   * Set player username (for display)
   */
  setPlayerUsername(playerId, username) {
    Object.keys(this.leaderboards).forEach(type => {
      const entry = this.leaderboards[type].find(e => e.id === playerId);
      if (entry) {
        entry.username = username;
      }
    });
  }

  /**
   * Get leaderboard stats
   */
  getStats() {
    return {
      timestamp: Date.now(),
      leaderboards: Object.fromEntries(
        Object.entries(this.leaderboards).map(([type, board]) => [
          type,
          {
            entries: board.length,
            topScore: board[0]?.score || 0,
            avgScore: board.length > 0 
              ? board.reduce((sum, e) => sum + e.score, 0) / board.length
              : 0
          }
        ])
      )
    };
  }

  /**
   * Export leaderboard data
   */
  exportData() {
    return {
      leaderboards: this.leaderboards,
      timestamp: this.lastUpdated
    };
  }

  /**
   * Import leaderboard data
   */
  importData(data) {
    this.leaderboards = data.leaderboards;
    this.lastUpdated = data.timestamp || Date.now();
  }

  /**
   * Clear leaderboards
   */
  clear() {
    Object.keys(this.leaderboards).forEach(type => {
      this.leaderboards[type] = [];
    });
  }
}

export default LeaderboardSystem;
