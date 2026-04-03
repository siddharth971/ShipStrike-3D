// server/systems/progression.js
// Player progression - XP, levels, experiences, and rewards

export const XP_LEVELS = {
  1: { xpRequired: 0, gold: 0, shipUnlock: 'sloop', title: 'Novice Captain' },
  2: { xpRequired: 100, gold: 10, title: 'Sailor' },
  3: { xpRequired: 250, gold: 25, title: 'Able Sailor' },
  4: { xpRequired: 450, gold: 50, title: 'Veteran Sailor' },
  5: { xpRequired: 700, gold: 100, title: 'Master Sailor' },
  6: { xpRequired: 1000, gold: 150, title: 'Junior Officer' },
  7: { xpRequired: 1400, gold: 200, title: 'Officer' },
  8: { xpRequired: 1900, gold: 250, title: 'Senior Officer' },
  9: { xpRequired: 2500, gold: 300, shipUnlock: 'frigate', title: 'Captain' },
  10: { xpRequired: 3200, gold: 400, title: 'commodore' },
  15: { xpRequired: 8000, gold: 1000, title: 'Admiral' },
  20: { xpRequired: 15000, gold: 2000, title: 'Fleet Admiral' },
  30: { xpRequired: 35000, gold: 5000, shipUnlock: 'warship', title: 'Grand Admiral' },
  50: { xpRequired: 100000, gold: 10000, shipUnlock: 'galleon', title: 'Legendary Captain' }
};

class ProgressionSystem {
  constructor() {
    this.playerProgress = new Map(); // playerId -> progression data
  }

  /**
   * Get or create progress data for player
   */
  getPlayerProgress(playerId) {
    if (!this.playerProgress.has(playerId)) {
      this.playerProgress.set(playerId, {
        playerId,
        level: 1,
        totalXp: 0,
        currentXp: 0,
        gold: 500, // Starting gold
        shipUnlocks: ['sloop'],
        achievements: [],
        combatStats: {
          shipsDestroyed: 0,
          shipsSunk: 0,
          cannonsFired: 0,
          shipsKilled: 0,
          damageTaken: 0,
          damageDealt: 0,
          battlesParticipated: 0
        },
        steamStatistics: {
          playtime: 0,
          totalDistance: 0,
          totalCrewHired: 0,
          totalUpgradesPurchased: 0,
          clanContributions: 0
        }
      });
    }
    return this.playerProgress.get(playerId);
  }

  /**
   * Award XP to player
   */
  grantXP(playerId, amount) {
    const progress = this.getPlayerProgress(playerId);
    progress.currentXp += amount;
    progress.totalXp += amount;

    const leveledUp = [];
    while (this.shouldLevelUp(progress)) {
      progress.level++;
      const levelInfo = XP_LEVELS[progress.level];
      if (levelInfo) {
        progress.currentXp -= levelInfo.xpRequired;
        if (levelInfo.gold) progress.gold += levelInfo.gold;
        if (levelInfo.shipUnlock && !progress.shipUnlocks.includes(levelInfo.shipUnlock)) {
          progress.shipUnlocks.push(levelInfo.shipUnlock);
        }
        leveledUp.push({
          level: progress.level,
          title: levelInfo.title,
          reward: levelInfo.gold || 0
        });
      }
    }

    return {
      xpGained: amount,
      newLevel: progress.level,
      leveledUp: leveledUp,
      currentXp: progress.currentXp
    };
  }

  /**
   * Check if player should level up
   */
  shouldLevelUp(progress) {
    const nextLevel = progress.level + 1;
    const nextLevelInfo = XP_LEVELS[nextLevel];
    if (!nextLevelInfo) return false;
    return progress.currentXp >= nextLevelInfo.xpRequired;
  }

  /**
   * Award gold to player
   */
  grantGold(playerId, amount) {
    const progress = this.getPlayerProgress(playerId);
    progress.gold += amount;
    return progress.gold;
  }

  /**
   * Spend gold (for upgrades, etc)
   */
  spendGold(playerId, amount) {
    const progress = this.getPlayerProgress(playerId);
    if (progress.gold >= amount) {
      progress.gold -= amount;
      return true;
    }
    return false;
  }

  /**
   * Record combat statistics
   */
  recordCombat(playerId, stats) {
    const progress = this.getPlayerProgress(playerId);
    Object.assign(progress.combatStats, {
      shipsDestroyed: (progress.combatStats.shipsDestroyed || 0) + (stats.shipsDestroyed || 0),
      damageDealt: (progress.combatStats.damageDealt || 0) + (stats.damageDealt || 0),
      damageTaken: (progress.combatStats.damageTaken || 0) + (stats.damageTaken || 0),
      cannonsFired: (progress.combatStats.cannonsFired || 0) + (stats.cannonsFired || 0),
      battlesParticipated: (progress.combatStats.battlesParticipated || 0) + 1
    });

    // Award XP based on damage dealt
    const xpReward = Math.floor((stats.damageDealt || 0) / 2);
    const goldReward = Math.floor((stats.damageDealt || 0) / 5);

    this.grantXP(playerId, xpReward);
    this.grantGold(playerId, goldReward);

    return {
      xpAwarded: xpReward,
      goldAwarded: goldReward
    };
  }

  /**
   * Get cumulative XP needed for a level
   */
  getTotalXpForLevel(level) {
    let total = 0;
    for (let i = 1; i < level; i++) {
      if (XP_LEVELS[i]) {
        total += XP_LEVELS[i].xpRequired;
      }
    }
    return total;
  }

  /**
   * Get XP progress to next level
   */
  getXpProgress(playerId) {
    const progress = this.getPlayerProgress(playerId);
    const currentLevelInfo = XP_LEVELS[progress.level] || XP_LEVELS[1];
    const nextLevelInfo = XP_LEVELS[progress.level + 1];

    if (!nextLevelInfo) {
      return {
        level: progress.level,
        currentXp: progress.currentXp,
        xpToNextLevel: 0,
        progress: 1.0,
        isMaxLevel: true
      };
    }

    const xpToNextLevel = nextLevelInfo.xpRequired - progress.currentXp;
    const totalXpNeeded = nextLevelInfo.xpRequired - (currentLevelInfo?.xpRequired || 0);

    return {
      level: progress.level,
      currentXp: progress.currentXp,
      xpToNextLevel: Math.max(0, xpToNextLevel),
      totalXpNeeded: totalXpNeeded,
      progress: Math.min(1.0, (progress.currentXp / nextLevelInfo.xpRequired)),
      isMaxLevel: false
    };
  }

  /**
   * Get available achievements for a player
   */
  getAvailableAchievements(playerId) {
    const progress = this.getPlayerProgress(playerId);
    const achievements = [];

    // Combat achievements
    if (progress.combatStats.shipsDestroyed >= 1) achievements.push('First Blood');
    if (progress.combatStats.shipsDestroyed >= 10) achievements.push('Destroyer');
    if (progress.combatStats.shipsDestroyed >= 50) achievements.push('Dreadnought');
    if (progress.combatStats.damageDealt >= 1000) achievements.push('Heavy Hitter');
    if (progress.combatStats.damageDealt >= 10000) achievements.push('Legend');

    // Level achievements
    if (progress.level >= 10) achievements.push('Seasoned Captain');
    if (progress.level >= 30) achievements.push('Master of the Seas');
    if (progress.level >= 50) achievements.push('Immortal Legend');

    return achievements;
  }

  /**
   * Serialize progress for database/transmission
   */
  toJSON(playerId) {
    return this.getPlayerProgress(playerId);
  }
}

export { ProgressionSystem };
