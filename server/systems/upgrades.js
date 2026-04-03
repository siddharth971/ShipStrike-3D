// server/systems/upgrades.js
// Upgrade system - ship improvements and progression

export const UPGRADE_TYPES = {
  HULL: {
    id: 'hull',
    name: 'Hull Armor',
    category: 'defense',
    maxLevel: 20,
    baseCost: 100,
    costMultiplier: 1.15,
    description: 'Increases ship HP (+20 per level)',
    icon: 'shield'
  },
  CANNONS: {
    id: 'cannons',
    name: 'Cannon Power',
    category: 'offense',
    maxLevel: 20,
    baseCost: 150,
    costMultiplier: 1.15,
    description: 'Increases cannon damage (+1.5 per level)',
    icon: 'cannon'
  },
  SPEED: {
    id: 'speed',
    name: 'Ship Speed',
    category: 'mobility',
    maxLevel: 20,
    baseCost: 120,
    costMultiplier: 1.15,
    description: 'Increases max speed (+0.5 per level)',
    icon: 'wind'
  },
  ACCELERATION: {
    id: 'acceleration',
    name: 'Acceleration',
    category: 'mobility',
    maxLevel: 15,
    baseCost: 100,
    costMultiplier: 1.15,
    description: 'Faster speed gain (+0.2 per level)',
    icon: 'zap'
  },
  CREW: {
    id: 'crew',
    name: 'Crew Quarters',
    category: 'crew',
    maxLevel: 10,
    baseCost: 80,
    costMultiplier: 1.2,
    description: 'Increases crew capacity (+1 per level)',
    icon: 'users'
  }
};

class UpgradeSystem {
  constructor() {
    this.upgrades = {};
  }

  /**
   * Get the cost for a specific upgrade level
   */
  static getUpgradeCost(upgradeType, targetLevel) {
    const upgrade = UPGRADE_TYPES[upgradeType];
    if (!upgrade) return null;
    
    let totalCost = 0;
    for (let level = 1; level <= targetLevel; level++) {
      const levelCost = Math.floor(
        upgrade.baseCost * Math.pow(upgrade.costMultiplier, level - 1)
      );
      totalCost += levelCost;
    }
    return totalCost;
  }

  /**
   * Get cost for next level upgrade
   */
  static getNextLevelCost(upgradeType, currentLevel) {
    const upgrade = UPGRADE_TYPES[upgradeType];
    if (!upgrade || currentLevel >= upgrade.maxLevel) return null;
    
    return Math.floor(
      upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel)
    );
  }

  /**
   * Validate if upgrade is possible
   */
  static canUpgrade(upgradeType, currentLevel) {
    const upgrade = UPGRADE_TYPES[upgradeType];
    if (!upgrade) return false;
    return currentLevel < upgrade.maxLevel;
  }

  /**
   * Get all upgrade info
   */
  static getAllUpgrades() {
    return Object.values(UPGRADE_TYPES);
  }

  /**
   * Get upgrade info by type
   */
  static getUpgradeInfo(upgradeType) {
    return UPGRADE_TYPES[upgradeType];
  }

  /**
   * Calculate total cost for multiple upgrades
   */
  static calculateBulkCost(upgrades) {
    let totalCost = 0;
    for (const [upgradeType, level] of Object.entries(upgrades)) {
      const cost = this.getUpgradeCost(upgradeType, level);
      if (cost) totalCost += cost;
    }
    return totalCost;
  }

  /**
   * Get progression info (what unlocks at what level)
   */
  static getUnlockInfo(playerLevel) {
    const unlocks = [];

    // Ship unlocks
    if (playerLevel >= 1) unlocks.push({ type: 'ship', name: 'Sloop', level: 1 });
    if (playerLevel >= 9) unlocks.push({ type: 'ship', name: 'Frigate', level: 9 });
    if (playerLevel >= 30) unlocks.push({ type: 'ship', name: 'Warship', level: 30 });
    if (playerLevel >= 50) unlocks.push({ type: 'ship', name: 'Galleon', level: 50 });

    // Upgrade unlocks
    if (playerLevel >= 5) unlocks.push({ type: 'upgrade', name: 'Hull Armor', level: 5 });
    if (playerLevel >= 10) unlocks.push({ type: 'upgrade', name: 'Cannon Power', level: 10 });
    if (playerLevel >= 15) unlocks.push({ type: 'upgrade', name: 'Ship Speed', level: 15 });
    if (playerLevel >= 20) unlocks.push({ type: 'upgrade', name: 'Acceleration', level: 20 });
    if (playerLevel >= 25) unlocks.push({ type: 'upgrade', name: 'Crew Quarters', level: 25 });

    return unlocks;
  }
}

export { UpgradeSystem };
