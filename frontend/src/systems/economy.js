// src/systems/economy.js
// Gold economy and reward system for combat success

export class EconomySystem {
  constructor() {
    this.goldRewards = {
      hitLarge: 50,      // Hitting a large ship
      hitMedium: 30,     // Hitting a medium ship
      hitSmall: 15,      // Hitting a small ship
      sinkLarge: 500,    // Sinking a large ship
      sinkMedium: 300,   // Sinking a medium ship
      sinkSmall: 150,    // Sinking a small ship
      teamWin: 200,      // Team objective completed
      defensiveHit: 100, // Preventing damage to teammate
      assist: 50         // Helping another player
    };

    this.playerGold = new Map(); // playerId -> gold
    this.transactionLog = [];
  }

  /**
   * Award gold for hitting a ship
   */
  awardHitGold(playerId, shipSize = 'medium') {
    const reward = this.goldRewards[`hit${shipSize.charAt(0).toUpperCase() + shipSize.slice(1)}`] || 30;
    return this.awardGold(playerId, reward, `hit_${shipSize}`);
  }

  /**
   * Award gold for sinking a ship
   */
  awardSinkGold(playerId, shipSize = 'medium') {
    const reward = this.goldRewards[`sink${shipSize.charAt(0).toUpperCase() + shipSize.slice(1)}`] || 300;
    return this.awardGold(playerId, reward, `sink_${shipSize}`);
  }

  /**
   * Award gold for team objective
   */
  awardTeamObjectiveGold(playerId, objectiveType = 'win') {
    const reward = this.goldRewards.teamWin || 200;
    return this.awardGold(playerId, reward, `objective_${objectiveType}`);
  }

  /**
   * Award gold for defensive actions
   */
  awardDefensiveGold(playerId, actionType = 'hit') {
    const reward = this.goldRewards.defensiveHit || 100;
    return this.awardGold(playerId, reward, `defensive_${actionType}`);
  }

  /**
   * Award gold for assist
   */
  awardAssistGold(playerId) {
    const reward = this.goldRewards.assist || 50;
    return this.awardGold(playerId, reward, 'assist');
  }

  /**
   * Core method to award gold
   */
  awardGold(playerId, amount, reason = 'unknown') {
    const current = this.playerGold.get(playerId) || 0;
    const newTotal = current + amount;
    
    this.playerGold.set(playerId, newTotal);
    
    // Log transaction
    this.transactionLog.push({
      playerId,
      amount,
      reason,
      timestamp: Date.now(),
      type: 'reward'
    });

    return {
      playerId,
      amount,
      total: newTotal,
      reason
    };
  }

  /**
   * Deduct gold (for purchases)
   */
  deductGold(playerId, amount, reason = 'purchase') {
    const current = this.playerGold.get(playerId) || 0;
    
    if (current < amount) {
      return {
        success: false,
        error: 'Insufficient gold',
        current,
        required: amount
      };
    }

    const newTotal = current - amount;
    this.playerGold.set(playerId, newTotal);

    this.transactionLog.push({
      playerId,
      amount: -amount,
      reason,
      timestamp: Date.now(),
      type: 'deduct'
    });

    return {
      success: true,
      playerId,
      amount,
      total: newTotal,
      reason
    };
  }

  /**
   * Get player's current gold
   */
  getPlayerGold(playerId) {
    return this.playerGold.get(playerId) || 0;
  }

  /**
   * Set player gold (for loading from database)
   */
  setPlayerGold(playerId, amount) {
    this.playerGold.set(playerId, amount);
  }

  /**
   * Get all players sorted by gold (wealth ranking)
   */
  getWealthRanking() {
    return Array.from(this.playerGold.entries())
      .map(([playerId, gold]) => ({ playerId, gold }))
      .sort((a, b) => b.gold - a.gold);
  }

  /**
   * Get transaction history for a player
   */
  getTransactionHistory(playerId, limit = 50) {
    return this.transactionLog
      .filter(t => t.playerId === playerId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get session statistics
   */
  getSessionStats(playerId) {
    const transactions = this.transactionLog.filter(t => t.playerId === playerId);
    const rewards = transactions.filter(t => t.type === 'reward');
    const deductions = transactions.filter(t => t.type === 'deduct');

    return {
      playerId,
      totalEarned: rewards.reduce((sum, t) => sum + t.amount, 0),
      totalSpent: Math.abs(deductions.reduce((sum, t) => sum + t.amount, 0)),
      currentGold: this.getPlayerGold(playerId),
      transactionCount: transactions.length,
      sessionRewards: rewards.length,
      sessionSpends: deductions.length
    };
  }

  /**
   * Clear all data (for testing)
   */
  clear() {
    this.playerGold.clear();
    this.transactionLog = [];
  }

  /**
   * Export data for persistence
   */
  exportData() {
    return {
      gold: Object.fromEntries(this.playerGold),
      transactions: this.transactionLog
    };
  }

  /**
   * Import data from persistence
   */
  importData(data) {
    if (data.gold) {
      Object.entries(data.gold).forEach(([playerId, amount]) => {
        this.playerGold.set(playerId, amount);
      });
    }
    if (data.transactions) {
      this.transactionLog = data.transactions;
    }
  }
}

export default EconomySystem;
