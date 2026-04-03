/**
 * Helper Bot System
 * AI bot crew that can assist with ship management
 * Handles steering, sail management, cannon firing, and tactics
 */

export class HelperBotSystem {
  constructor() {
    this.bots = new Map(); // playerId -> botData
    this.botCounter = 0;

    // Bot configurations
    this.botConfigs = {
      passive: {
        aggression: 0.3,
        fireChance: 0.2,
        sailOptimization: 0.7,
        tactics: 'defensive'
      },
      balanced: {
        aggression: 0.6,
        fireChance: 0.5,
        sailOptimization: 0.8,
        tactics: 'balanced'
      },
      aggressive: {
        aggression: 0.9,
        fireChance: 0.8,
        sailOptimization: 0.6,
        tactics: 'offensive'
      }
    };
  }

  /**
   * Create a bot for a player
   */
  createBot(playerId, configType = 'balanced', shipId = null) {
    const botId = `bot_${++this.botCounter}`;
    const config = this.botConfigs[configType] || this.botConfigs.balanced;

    const bot = {
      botId: botId,
      playerId: playerId,
      shipId: shipId,
      enabled: true,
      mode: 'assisted', // assisted, autonomous, idle
      configType: configType,
      config: { ...config },
      state: {
        steering: false,
        managingSails: false,
        firing: false,
        targetShipId: null
      },
      stats: {
        cannonsFired: 0,
        hitsScored: 0,
        sailAdjustments: 0,
        courseCorrestions: 0,
        timeRunning: 0
      },
      decisions: []
    };

    this.bots.set(playerId, bot);
    return bot;
  }

  /**
   * Toggle bot on/off
   */
  toggleBot(playerId) {
    const bot = this.bots.get(playerId);
    if (!bot) return false;

    bot.enabled = !bot.enabled;
    if (!bot.enabled) {
      bot.mode = 'idle';
      bot.state.steering = false;
      bot.state.managingSails = false;
      bot.state.firing = false;
    }

    return bot.enabled;
  }

  /**
   * Set bot configuration
   */
  setBotConfig(playerId, configType) {
    const bot = this.bots.get(playerId);
    if (!bot || !this.botConfigs[configType]) return false;

    bot.configType = configType;
    bot.config = { ...this.botConfigs[configType] };
    return true;
  }

  /**
   * Get bot for player
   */
  getBot(playerId) {
    return this.bots.get(playerId);
  }

  /**
   * Update bot behavior each frame
   */
  updateBot(playerId, shipState, deltaTime) {
    const bot = this.bots.get(playerId);
    if (!bot || !bot.enabled) return null;

    bot.stats.timeRunning += deltaTime;

    // Make bot decisions
    const decisions = this.makeBotDecisions(bot, shipState);
    bot.decisions.push(...decisions);

    // Execute decisions
    const actions = this.executeBotDecisions(bot, shipState, decisions);

    return { decisions, actions };
  }

  /**
   * Make bot decisions based on ship state
   */
  makeBotDecisions(bot, shipState) {
    const decisions = [];

    if (!bot.enabled) return decisions;

    // Decision 1: Steering
    if (bot.state.steering || needsSteering(shipState)) {
      const steeringDecision = this.decideSteering(bot, shipState);
      if (steeringDecision) {
        decisions.push(steeringDecision);
        bot.stats.courseCorrestions++;
      }
    }

    // Decision 2: Sail management
    if (bot.config.sailOptimization > 0.5) {
      const sailDecision = this.decideSailManagement(bot, shipState);
      if (sailDecision) {
        decisions.push(sailDecision);
        bot.stats.sailAdjustments++;
      }
    }

    // Decision 3: Targeting and firing
    if (bot.config.aggression > 0 && shouldFire(shipState)) {
      const fireDecision = this.decideTargetAndFire(bot, shipState);
      if (fireDecision) {
        decisions.push(fireDecision);
        bot.stats.cannonsFired++;
      }
    }

    // Decision 4: Tactical positioning
    const tacticalDecision = this.decideTactics(bot, shipState);
    if (tacticalDecision) {
      decisions.push(tacticalDecision);
    }

    return decisions;
  }

  /**
   * Decide steering direction
   */
  decideSteering(bot, shipState) {
    if (!shipState || !shipState.enemyShips) return null;

    let targetAngle = shipState.heading;

    if (bot.config.tactics === 'offensive') {
      // Try to get behind enemy
      if (shipState.primaryEnemy) {
        targetAngle = this.calculateInterceptAngle(shipState, shipState.primaryEnemy);
      }
    } else if (bot.config.tactics === 'defensive') {
      // Try to escape
      if (shipState.primaryEnemy) {
        targetAngle = this.calculateEscapeAngle(shipState, shipState.primaryEnemy);
      }
    } else {
      // Balanced: maintain optimal wind angle
      targetAngle = this.calculateOptimalWindAngle(shipState);
    }

    return {
      type: 'steer',
      targetAngle: targetAngle,
      confidence: 0.8
    };
  }

  /**
   * Decide sail configuration
   */
  decideSailManagement(bot, shipState) {
    if (!shipState) return null;

    let sailAdjustment = 'normal';

    // Wind-based optimization
    const windAngle = shipState.windAngle || 0;
    const sailEfficiency = Math.cos(windAngle);

    if (sailEfficiency > 0.7) {
      sailAdjustment = 'full'; // Full sails for good wind
    } else if (sailEfficiency > 0.4) {
      sailAdjustment = 'partial';
    } else {
      sailAdjustment = 'minimal'; // Minimal sails for headwind
    }

    // Combat adjustment
    if (shipState.inCombat && bot.config.tactics === 'aggressive') {
      sailAdjustment = 'full'; // Maximize speed for attack
    }

    return {
      type: 'adjustSails',
      configuration: sailAdjustment,
      efficiency: sailEfficiency
    };
  }

  /**
   * Decide target and firing
   */
  decideTargetAndFire(bot, shipState) {
    if (!shipState || !shipState.enemyShips || shipState.enemyShips.length === 0) {
      return null;
    }

    // Find best target
    const targets = shipState.enemyShips.filter(enemy => {
      const distance = this.getDistance(shipState, enemy);
      return distance < 200; // Within cannon range
    });

    if (targets.length === 0) return null;

    // Select target based on priority
    let target = targets[0];

    if (bot.config.tactics === 'aggressive') {
      // Target weakest ship
      target = targets.reduce((weakest, current) => {
        return current.health < weakest.health ? current : weakest;
      });
    } else if (bot.config.tactics === 'defensive') {
      // Target closest threat
      target = targets.reduce((closest, current) => {
        const distCurrent = this.getDistance(shipState, current);
        const distClosest = this.getDistance(shipState, closest);
        return distCurrent < distClosest ? current : closest;
      });
    }

    // Fire with configured chance
    const shouldFire = Math.random() < bot.config.fireChance;

    if (shouldFire) {
      return {
        type: 'fire',
        targetId: target.id,
        targetHealth: target.health,
        cannonType: 'broadside'
      };
    }

    return null;
  }

  /**
   * Decide tactical positioning
   */
  decideTactics(bot, shipState) {
    if (!shipState || !shipState.primaryEnemy) return null;

    const tactics = {
      type: 'tactic',
      tactic: bot.config.tactics
    };

    if (bot.config.tactics === 'offensive') {
      tactics.objective = 'close_range';
      tactics.priority = 'get_behind_enemy';
    } else if (bot.config.tactics === 'defensive') {
      tactics.objective = 'maintain_distance';
      tactics.priority = 'preserve_ship';
    } else {
      tactics.objective = 'optimal_position';
      tactics.priority = 'maximize_damage';
    }

    return tactics;
  }

  /**
   * Execute bot decisions
   */
  executeBotDecisions(bot, shipState, decisions) {
    const actions = [];

    for (const decision of decisions) {
      let action = null;

      switch (decision.type) {
        case 'steer':
          action = {
            action: 'setHeading',
            heading: decision.targetAngle
          };
          bot.state.steering = true;
          break;

        case 'adjustSails':
          action = {
            action: 'adjustSails',
            configuration: decision.configuration
          };
          bot.state.managingSails = true;
          break;

        case 'fire':
          action = {
            action: 'fireCanons',
            targetId: decision.targetId
          };
          bot.state.firing = true;
          bot.stats.cannonsFired++;
          break;

        case 'tactic':
          action = {
            action: 'updateTactic',
            tactic: decision.tactic
          };
          break;
      }

      if (action) {
        actions.push(action);
      }
    }

    return actions;
  }

  /**
   * Calculate intercept angle to enemy
   */
  calculateInterceptAngle(shipState, enemyShip) {
    const dx = enemyShip.x - shipState.x;
    const dy = enemyShip.y - shipState.y;
    return Math.atan2(dy, dx);
  }

  /**
   * Calculate escape angle from enemy
   */
  calculateEscapeAngle(shipState, enemyShip) {
    const dx = enemyShip.x - shipState.x;
    const dy = enemyShip.y - shipState.y;
    const awayAngle = Math.atan2(dy, dx) + Math.PI;
    return awayAngle;
  }

  /**
   * Calculate optimal angle for wind
   */
  calculateOptimalWindAngle(shipState) {
    const windAngle = shipState.windAngle || 0;
    // Sail perpendicular to wind for maximum efficiency
    return windAngle + Math.PI / 2;
  }

  /**
   * Get distance between two ships
   */
  getDistance(ship1, ship2) {
    const dx = ship2.x - ship1.x;
    const dy = ship2.y - ship1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Export bot data
   */
  exportData() {
    return {
      bots: Array.from(this.bots.entries())
    };
  }

  /**
   * Clear all bots
   */
  clear() {
    this.bots.clear();
  }
}

// Helper functions
function needsSteering(shipState) {
  if (!shipState) return false;
  // Need steering if off-course or hostile nearby
  return shipState.offCourse || (shipState.enemyShips && shipState.enemyShips.length > 0);
}

function shouldFire(shipState) {
  if (!shipState) return false;
  // Can fire if enemies in range and ready
  return (
    shipState.inCombat &&
    shipState.cansReady &&
    shipState.enemyShips &&
    shipState.enemyShips.length > 0
  );
}
