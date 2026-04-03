/**
 * Melee Combat System
 * Handles sword fighting, damage calculation, hit/miss, knockback
 * Supports different weapon types and combat states
 */

export class MeleeCombatSystem {
  constructor() {
    this.combatants = new Map(); // playerId -> combatState
    this.activeCombats = new Map(); // combatId -> { attacker, defender, ...}
    this.combatCounter = 0;

    // Weapon configurations
    this.weaponTypes = {
      sword: {
        damage: 25,
        attackSpeed: 1.0, // attacks per second
        range: 10,
        hitChance: 0.85,
        knockback: 5,
        stamina: 15
      },
      cutlass: {
        damage: 20,
        attackSpeed: 1.5,
        range: 8,
        hitChance: 0.9,
        knockback: 3,
        stamina: 10
      },
      pistol: {
        damage: 40,
        attackSpeed: 0.5,
        range: 50,
        hitChance: 0.7,
        knockback: 8,
        stamina: 20
      },
      musket: {
        damage: 50,
        attackSpeed: 0.3,
        range: 100,
        hitChance: 0.6,
        knockback: 10,
        stamina: 25
      },
      knife: {
        damage: 15,
        attackSpeed: 2.0,
        range: 5,
        hitChance: 0.95,
        knockback: 2,
        stamina: 8
      }
    };

    // Combat actions
    this.actionTypes = {
      attack: 'attack',
      defend: 'defend',
      dodge: 'dodge',
      parry: 'parry',
      charge: 'charge',
      retreat: 'retreat'
    };
  }

  /**
   * Initialize combat between two players
   */
  initiateCombat(attackerId, defenderId, weapon = 'sword') {
    const combatId = `combat_${++this.combatCounter}_${Date.now()}`;

    const combat = {
      id: combatId,
      attackerId: attackerId,
      defenderId: defenderId,
      weapon: weapon,
      state: 'active', // active, paused, completed
      startTime: Date.now(),
      combatLog: [],
      stats: {
        attackerHits: 0,
        defenderHits: 0,
        totalDamageDealt: { [attackerId]: 0, [defenderId]: 0 },
        dodges: { [attackerId]: 0, [defenderId]: 0 }
      }
    };

    this.activeCombats.set(combatId, combat);

    // Create combatant states
    this.combatants.set(attackerId, {
      combatId: combatId,
      opponent: defenderId,
      health: 100,
      stamina: 100,
      stance: 'neutral', // neutral, aggressive, defensive
      lastAction: null,
      actionCooldown: 0,
      buffs: [],
      debuffs: []
    });

    this.combatants.set(defenderId, {
      combatId: combatId,
      opponent: attackerId,
      health: 100,
      stamina: 100,
      stance: 'neutral',
      lastAction: null,
      actionCooldown: 0,
      buffs: [],
      debuffs: []
    });

    return combat;
  }

  /**
   * Execute combat action (attack, defend, dodge, etc.)
   */
  executeAction(combatId, actorId, action, targetId = null) {
    const combat = this.activeCombats.get(combatId);
    const actor = this.combatants.get(actorId);

    if (!combat || !actor) return null;
    if (actor.stamina < 10) return { success: false, reason: 'Insufficient stamina' };
    if (actor.actionCooldown > 0) return { success: false, reason: 'Still recovering from last action' };

    let result = {};

    switch (action) {
      case 'attack':
        result = this.performAttack(combatId, actorId, targetId);
        break;
      case 'defend':
        result = this.performDefend(combatId, actorId);
        break;
      case 'dodge':
        result = this.performDodge(combatId, actorId);
        break;
      case 'parry':
        result = this.performParry(combatId, actorId);
        break;
      case 'charge':
        result = this.performCharge(combatId, actorId);
        break;
      case 'retreat':
        result = this.performRetreat(combatId, actorId);
        break;
      default:
        return { success: false, reason: 'Unknown action' };
    }

    // Log action
    combat.combatLog.push({
      timestamp: Date.now(),
      actor: actorId,
      action,
      result
    });

    return result;
  }

  /**
   * Attack action
   */
  performAttack(combatId, attackerId, defenderId) {
    const combat = this.activeCombats.get(combatId);
    const attacker = this.combatants.get(attackerId);
    const defender = this.combatants.get(defenderId);

    if (!defender) {
      defender = this.combatants.get(attacker.opponent);
    }

    const weapon = this.weaponTypes[combat.weapon] || this.weaponTypes.sword;
    const hitChance = weapon.hitChance;

    // Modifiers
    let finalHitChance = hitChance;
    if (attacker.stance === 'aggressive') finalHitChance += 0.1;
    if (defender.stance === 'defensive') finalHitChance -= 0.15;

    // Determine hit
    const isHit = Math.random() < finalHitChance;

    // Calculate damage
    let damage = weapon.damage;
    if (attacker.stance === 'aggressive') damage *= 1.2;
    if (attacker.stance === 'defensive') damage *= 0.7;

    if (isHit) {
      // Calculate reduction from defender's stance/skills
      let reduction = 0;
      if (defender.stance === 'defensive') reduction = 0.25;

      const finalDamage = Math.max(1, Math.floor(damage * (1 - reduction)));
      defender.health -= finalDamage;

      // Knockback
      const knockback = weapon.knockback;

      // Apply stamina cost
      attacker.stamina -= weapon.stamina;
      attacker.actionCooldown = 500; // 500ms cooldown

      combat.stats.attackerHits++;
      combat.stats.totalDamageDealt[attackerId] =
        (combat.stats.totalDamageDealt[attackerId] || 0) + finalDamage;

      return {
        success: true,
        hit: true,
        damage: finalDamage,
        knockback: knockback,
        defenderHealth: defender.health
      };
    } else {
      attacker.stamina -= weapon.stamina * 0.5;
      attacker.actionCooldown = 300;

      return {
        success: true,
        hit: false,
        reason: 'Missed attack',
        defenderHealth: defender.health
      };
    }
  }

  /**
   * Defend action - reduces incoming damage
   */
  performDefend(combatId, defenderId) {
    const defender = this.combatants.get(defenderId);
    if (!defender) return null;

    defender.stance = 'defensive';
    defender.stamina -= 8;
    defender.actionCooldown = 400;

    return {
      success: true,
      action: 'defend',
      stanceChange: 'defensive',
      damageReduction: '25%'
    };
  }

  /**
   * Dodge action - avoid incoming attack
   */
  performDodge(combatId, dodgerId) {
    const dodger = this.combatants.get(dodgerId);
    if (!dodger) return null;

    dodger.stamina -= 12;
    dodger.actionCooldown = 600;
    dodger.stance = 'neutral';

    // Add temporary dodge buff
    dodger.buffs.push({
      type: 'dodge',
      dodgeChance: 0.4,
      duration: 1000
    });

    return {
      success: true,
      action: 'dodge',
      dodgeChance: 0.4,
      duration: 1000
    };
  }

  /**
   * Parry action - block and counter
   */
  performParry(combatId, parryerId) {
    const parrier = this.combatants.get(parryerId);
    if (!parrier) return null;

    parrier.stamina -= 10;
    parrier.actionCooldown = 500;

    // Add block buff
    parrier.buffs.push({
      type: 'parry',
      damageReduction: 0.5,
      duration: 1500,
      counterChance: 0.3
    });

    return {
      success: true,
      action: 'parry',
      damageReduction: 0.5,
      counterChance: 0.3
    };
  }

  /**
   * Charge action - heavy attack with high damage and risk
   */
  performCharge(combatId, chargerId) {
    const charger = this.combatants.get(chargerId);
    if (!charger) return null;

    charger.stance = 'aggressive';
    charger.stamina -= 25;
    charger.actionCooldown = 1000;

    charger.buffs.push({
      type: 'charge',
      damageBuff: 1.5,
      duration: 2000,
      defenseDebuff: 0.7
    });

    return {
      success: true,
      action: 'charge',
      damageBuff: 1.5,
      defenseDebuff: 0.7
    };
  }

  /**
   * Retreat action - disengage from combat
   */
  performRetreat(combatId, retreaterId) {
    const retreater = this.combatants.get(retreaterId);
    if (!retreater) return null;

    retreater.stamina -= 15;
    retreater.stance = 'defensive';

    // Mark combat as paused (can re-engage)
    const combat = this.activeCombats.get(combatId);
    combat.state = 'paused';

    return {
      success: true,
      action: 'retreat',
      combatPaused: true,
      stamina: retreater.stamina
    };
  }

  /**
   * Update stamina regen outside of combat
   */
  updateCombatant(combatId, playerId, deltaTime) {
    const combatant = this.combatants.get(playerId);
    if (!combatant) return null;

    // Stamina regeneration: 10 per second
    combatant.stamina = Math.min(100, combatant.stamina + (10 * deltaTime) / 1000);

    // Update cooldowns
    if (combatant.actionCooldown > 0) {
      combatant.actionCooldown -= deltaTime;
    }

    // Update buffs
    combatant.buffs = combatant.buffs.filter(buff => {
      buff.duration -= deltaTime;
      return buff.duration > 0;
    });

    return combatant;
  }

  /**
   * Check if combat is over (someone died)
   */
  isCombatOver(combatId) {
    const combat = this.activeCombats.get(combatId);
    if (!combat) return true;

    const attacker = this.combatants.get(combat.attackerId);
    const defender = this.combatants.get(combat.defenderId);

    return (attacker && attacker.health <= 0) || (defender && defender.health <= 0);
  }

  /**
   * End combat and determine winner
   */
  endCombat(combatId) {
    const combat = this.activeCombats.get(combatId);
    if (!combat) return null;

    const attacker = this.combatants.get(combat.attackerId);
    const defender = this.combatants.get(combat.defenderId);

    let winner = null;
    if (attacker && attacker.health > 0) winner = combat.attackerId;
    if (defender && defender.health > 0) winner = combat.defenderId;

    combat.state = 'completed';
    combat.winner = winner;
    combat.endTime = Date.now();
    combat.duration = combat.endTime - combat.startTime;

    return {
      winner,
      stats: combat.stats,
      duration: combat.duration,
      combatLog: combat.combatLog
    };
  }

  /**
   * Get combat state
   */
  getCombatInfo(combatId) {
    const combat = this.activeCombats.get(combatId);
    if (!combat) return null;

    return {
      id: combatId,
      attackerId: combat.attackerId,
      defenderId: combat.defenderId,
      weapon: combat.weapon,
      state: combat.state,
      attacker: this.combatants.get(combat.attackerId),
      defender: this.combatants.get(combat.defenderId)
    };
  }

  /**
   * Export combat data
   */
  exportData() {
    return {
      activeCombats: Array.from(this.activeCombats.entries()),
      combatants: Array.from(this.combatants.entries())
    };
  }

  /**
   * Clear all combat data
   */
  clear() {
    this.activeCombats.clear();
    this.combatants.clear();
  }
}
