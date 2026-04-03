// src/systems/upgrades.js
// Ship upgrade system for progression enhancement

export class UpgradeSystem {
  constructor() {
    this.upgradeTypes = {
      cannon: {
        name: 'Cannon Damage',
        description: 'Increase cannon damage per shot',
        maxLevel: 5,
        baseCost: 500,
        costMultiplier: 1.5,
        effectPerLevel: 0.2 // 20% damage increase per level
      },
      armor: {
        name: 'Ship Armor',
        description: 'Reduce incoming damage',
        maxLevel: 5,
        baseCost: 400,
        costMultiplier: 1.5,
        effectPerLevel: 0.15 // 15% damage reduction per level
      },
      speed: {
        name: 'Ship Speed',
        description: 'Increase maximum ship speed',
        maxLevel: 5,
        baseCost: 600,
        costMultiplier: 1.5,
        effectPerLevel: 0.25 // 25% speed increase per level
      },
      sails: {
        name: 'Sail Efficiency',
        description: 'Improve sail performance and wind response',
        maxLevel: 5,
        baseCost: 450,
        costMultiplier: 1.5,
        effectPerLevel: 0.18 // 18% efficiency increase per level
      },
      health: {
        name: 'Ship Hull',
        description: 'Increase maximum ship health',
        maxLevel: 5,
        baseCost: 350,
        costMultiplier: 1.5,
        effectPerLevel: 0.30 // 30% health increase per level
      },
      fireRate: {
        name: 'Fire Rate',
        description: 'Fire cannons faster',
        maxLevel: 3,
        baseCost: 550,
        costMultiplier: 1.5,
        effectPerLevel: 0.25 // 25% faster firing per level
      }
    };

    // Player upgrade levels: playerId -> { cannon: 1, armor: 2, ... }
    this.playerUpgrades = new Map();

    // Persistent upgrade stats: playerId -> { totalSpent, upgradesApplied }
    this.playerUpgradeStats = new Map();
  }

  /**
   * Get all available upgrade types
   */
  getAvailableUpgrades() {
    return Object.keys(this.upgradeTypes);
  }

  /**
   * Get upgrade info by type
   */
  getUpgradeInfo(upgradeType) {
    return this.upgradeTypes[upgradeType] || null;
  }

  /**
   * Get cost to upgrade a specific level
   */
  getUpgradeCost(upgradeType, toLevel) {
    const upgrade = this.upgradeTypes[upgradeType];
    if (!upgrade) return 0;
    if (toLevel > upgrade.maxLevel) return 0;

    // Cost increases per level: baseCost * multiplier^(level-1)
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, toLevel - 1));
  }

  /**
   * Get current upgrade level for player
   */
  getUpgradeLevel(playerId, upgradeType) {
    const upgrades = this.playerUpgrades.get(playerId) || {};
    return upgrades[upgradeType] || 0;
  }

  /**
   * Get all upgrade levels for a player
   */
  getAllUpgrades(playerId) {
    const upgrades = this.playerUpgrades.get(playerId) || {};
    const result = {};

    for (const upgradeType of this.getAvailableUpgrades()) {
      result[upgradeType] = upgrades[upgradeType] || 0;
    }

    return result;
  }

  /**
   * Upgrade a player's stat
   */
  upgradePlayer(playerId, upgradeType, currentGold, economy) {
    const upgrade = this.upgradeTypes[upgradeType];
    if (!upgrade) {
      return { success: false, error: 'Invalid upgrade type' };
    }

    const currentLevel = this.getUpgradeLevel(playerId, upgradeType);
    if (currentLevel >= upgrade.maxLevel) {
      return { success: false, error: 'Max level reached' };
    }

    const nextLevel = currentLevel + 1;
    const cost = this.getUpgradeCost(upgradeType, nextLevel);

    if (currentGold < cost) {
      return {
        success: false,
        error: 'Insufficient gold',
        required: cost,
        current: currentGold
      };
    }

    // Deduct gold from economy
    const deductResult = economy.deductGold(playerId, cost, `upgrade_${upgradeType}_to_${nextLevel}`);

    if (!deductResult.success) {
      return deductResult;
    }

    // Apply upgrade
    const upgrades = this.playerUpgrades.get(playerId) || {};
    upgrades[upgradeType] = nextLevel;
    this.playerUpgrades.set(playerId, upgrades);

    // Track stats
    const stats = this.playerUpgradeStats.get(playerId) || { totalSpent: 0, upgradesApplied: 0 };
    stats.totalSpent += cost;
    stats.upgradesApplied += 1;
    this.playerUpgradeStats.set(playerId, stats);

    return {
      success: true,
      playerId,
      upgradeType,
      oldLevel: currentLevel,
      newLevel: nextLevel,
      cost,
      goldRemaining: deductResult.total,
      effect: `+${(upgrade.effectPerLevel * 100).toFixed(0)}%`
    };
  }

  /**
   * Calculate effective multiplier for an upgrade
   * Level 1 = 1.2x, Level 2 = 1.4x, etc.
   */
  getUpgradeMultiplier(upgradeType, level) {
    const upgrade = this.upgradeTypes[upgradeType];
    if (!upgrade || level === 0) return 1.0;

    return 1 + (upgrade.effectPerLevel * level);
  }

  /**
   * Get player's effective stats based on upgrades
   */
  getPlayerStats(playerId, baseStats = {}) {
    const upgrades = this.getAllUpgrades(playerId);

    return {
      cannonDamage: (baseStats.cannonDamage || 25) * this.getUpgradeMultiplier('cannon', upgrades.cannon),
      armorReduction: Math.min(0.95, this.getUpgradeMultiplier('armor', upgrades.armor) - 1), // Max 95% reduction
      speed: (baseStats.speed || 50) * this.getUpgradeMultiplier('speed', upgrades.speed),
      sailEfficiency: this.getUpgradeMultiplier('sails', upgrades.sails),
      health: (baseStats.health || 100) * this.getUpgradeMultiplier('health', upgrades.health),
      fireRate: (baseStats.fireRate || 0.5) / this.getUpgradeMultiplier('fireRate', upgrades.fireRate), // Lower is faster
      upgrades: upgrades
    };
  }

  /**
   * Get upgrade progress for a player
   */
  getUpgradeProgress(playerId) {
    const upgrades = this.getAllUpgrades(playerId);
    const progress = {};

    for (const upgradeType of this.getAvailableUpgrades()) {
      const upgrade = this.upgradeTypes[upgradeType];
      const level = upgrades[upgradeType];
      progress[upgradeType] = {
        name: upgrade.name,
        currentLevel: level,
        maxLevel: upgrade.maxLevel,
        percentage: (level / upgrade.maxLevel) * 100,
        nextUpgradeCost: level < upgrade.maxLevel ? this.getUpgradeCost(upgradeType, level + 1) : null
      };
    }

    return progress;
  }

  /**
   * Get total upgrade investment
   */
  getTotalInvestment(playerId) {
    const stats = this.playerUpgradeStats.get(playerId);
    return stats ? stats.totalSpent : 0;
  }

  /**
   * Set player upgrades (for loading from database)
   */
  setPlayerUpgrades(playerId, upgradeData) {
    this.playerUpgrades.set(playerId, upgradeData);
  }

  /**
   * Set player upgrade stats
   */
  setPlayerUpgradeStats(playerId, statsData) {
    this.playerUpgradeStats.set(playerId, statsData);
  }

  /**
   * Export data for persistence
   */
  exportData() {
    return {
      upgrades: Object.fromEntries(this.playerUpgrades),
      stats: Object.fromEntries(this.playerUpgradeStats)
    };
  }

  /**
   * Import data from persistence
   */
  importData(data) {
    if (data.upgrades) {
      Object.entries(data.upgrades).forEach(([playerId, upgrades]) => {
        this.playerUpgrades.set(playerId, upgrades);
      });
    }
    if (data.stats) {
      Object.entries(data.stats).forEach(([playerId, stats]) => {
        this.playerUpgradeStats.set(playerId, stats);
      });
    }
  }

  /**
   * Clear all data (for testing)
   */
  clear() {
    this.playerUpgrades.clear();
    this.playerUpgradeStats.clear();
  }
}

export default UpgradeSystem;
