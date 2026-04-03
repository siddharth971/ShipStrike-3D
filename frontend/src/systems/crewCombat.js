/**
 * Crew Combat System
 * Handles crew member combat, morale, and boarding defense
 * Extends crew management with combat capabilities
 */

export class CrewCombatSystem {
  constructor() {
    this.crewMembers = new Map(); // playerId -> crewMemberState
    this.crewSquads = new Map(); // shipId -> squadData
    this.morale = new Map(); // shipId -> moraleValue (0-100)
    this.casualtyRecords = new Map(); // shipId -> [casualties]
  }

  /**
   * Create a crew member for combat
   */
  createCrewMember(playerId, role = 'sailor', shipId = null) {
    const crewMember = {
      playerId: playId,
      role: role, // sailor, gunner, officer, captain
      shipId: shipId,
      health: 100,
      stamina: 100,
      skill: this.getSkillByRole(role),
      weapon: this.getWeaponByRole(role),
      inCombat: false,
      opponent: null,
      combatExperience: 0,
      wounds: [],
      status: 'active' // active, wounded, unconscious, dead
    };

    this.crewMembers.set(playerId, crewMember);
    return crewMember;
  }

  /**
   * Get skill rating based on crew role
   */
  getSkillByRole(role) {
    const skillMap = {
      sailor: 0.5,
      gunner: 0.6,
      officer: 0.8,
      captain: 0.95
    };
    return skillMap[role] || 0.5;
  }

  /**
   * Get default weapon based on crew role
   */
  getWeaponByRole(role) {
    const weaponMap = {
      sailor: 'cutlass',
      gunner: 'pistol',
      officer: 'sword',
      captain: 'sword'
    };
    return weaponMap[role] || 'cutlass';
  }

  /**
   * Get all crew members on a ship
   */
  getShipCrew(shipId) {
    const crew = [];
    for (const [playerId, member] of this.crewMembers) {
      if (member.shipId === shipId) {
        crew.push({ playerId, ...member });
      }
    }
    return crew;
  }

  /**
   * Assign crew members to a squad
   */
  createSquad(shipId, squadLeaderId, members = []) {
    const squad = {
      shipId: shipId,
      squadLeaderId: squadLeaderId,
      members: new Set(members),
      morale: 100,
      objective: null, // defend, attack, evacuate, assist
      position: { x: 0, y: 0 },
      stats: {
        kills: 0,
        casualties: 0,
        damageDealt: 0
      }
    };

    this.crewSquads.set(`squad_${shipId}_${squadLeaderId}`, squad);
    return squad;
  }

  /**
   * Update ship morale
   */
  updateMorale(shipId, delta) {
    let morale = this.morale.get(shipId) || 100;
    morale = Math.max(0, Math.min(100, morale + delta));
    this.morale.set(shipId, morale);
    return morale;
  }

  /**
   * Get morale by ship
   */
  getMorale(shipId) {
    return this.morale.get(shipId) || 100;
  }

  /**
   * Crew member takes damage
   */
  damageCrewMember(playerId, damage) {
    const member = this.crewMembers.get(playerId);
    if (!member) return null;

    member.health -= damage;

    if (member.health <= 0) {
      member.status = 'dead';
      member.health = 0;
      
      // Record casualty
      if (member.shipId) {
        this.recordCasualty(member.shipId, playerId, 'killed');
      }
    } else if (member.health < 30) {
      member.status = 'wounded';
      member.wounds.push({
        severity: 'serious',
        damage: damage,
        timestamp: Date.now()
      });
    }

    return member;
  }

  /**
   * Heal crew member
   */
  healCrewMember(playerId, amount) {
    const member = this.crewMembers.get(playerId);
    if (!member) return null;

    member.health = Math.min(100, member.health + amount);

    if (member.health > 50 && member.status === 'wounded') {
      member.status = 'active';
      member.wounds = [];
    }

    return member;
  }

  /**
   * Record casualty
   */
  recordCasualty(shipId, playerId, type = 'killed') {
    if (!this.casualtyRecords.has(shipId)) {
      this.casualtyRecords.set(shipId, []);
    }

    this.casualtyRecords.get(shipId).push({
      playerId: playerId,
      type: type,
      timestamp: Date.now()
    });

    // Lower morale for casualties
    const moraleHit = type === 'killed' ? -10 : -3;
    this.updateMorale(shipId, moraleHit);
  }

  /**
   * Get all casualties for a ship
   */
  getCasualties(shipId) {
    return this.casualtyRecords.get(shipId) || [];
  }

  /**
   * Calculate crew effectiveness in combat
   */
  getCrewEffectiveness(shipId) {
    const morale = this.getMorale(shipId);
    const crew = this.getShipCrew(shipId);
    const activeMembers = crew.filter(m => m.status === 'active').length;
    const totalMembers = crew.length;

    const crewFactor = activeMembers / Math.max(1, totalMembers);
    const moraleFactor = morale / 100;

    // Effectiveness = average of crew availability and morale
    return (crewFactor + moraleFactor) / 2;
  }

  /**
   * Apply morale-based damage reduction
   */
  getDefenseModifier(shipId) {
    const morale = this.getMorale(shipId);
    const effectiveness = this.getCrewEffectiveness(shipId);

    // Low morale means worse defense
    if (morale < 30) return 0.5; // 50% defense
    if (morale < 60) return 0.75; // 75% defense
    return 1.0; // Full defense
  }

  /**
   * Get attack modifier based on crew
   */
  getAttackModifier(shipId) {
    const morale = this.getMorale(shipId);
    const effectiveness = this.getCrewEffectiveness(shipId);

    // Low morale means weaker attacks
    if (morale < 30) return 0.6;
    if (morale < 60) return 0.8;
    return 1.0;
  }

  /**
   * Crew rallying - increase morale temporarily
   */
  rallyCrew(shipId, leaderId, amount = 15) {
    const leader = this.crewMembers.get(leaderId);
    if (!leader || leader.role !== 'captain' && leader.role !== 'officer') {
      return { success: false, reason: 'Only officers and captains can rally crew' };
    }

    this.updateMorale(shipId, amount);

    // Reduce stamina cost for all crew
    const crew = this.getShipCrew(shipId);
    crew.forEach(member => {
      member.stamina = Math.min(100, member.stamina + 10);
    });

    return {
      success: true,
      morale: this.getMorale(shipId),
      crewBoosted: crew.length
    };
  }

  /**
   * Repair ship (crew working together)
   */
  repairShip(shipId, crewMembers = []) {
    const crew = this.getShipCrew(shipId);
    const availableCrew = crew.filter(
      m => crewMembers.includes(m.playerId) && m.status === 'active'
    );

    const repairAmount = availableCrew.length * 5; // 5 HP per active crew member

    // Stamina cost
    availableCrew.forEach(member => {
      member.stamina -= 20;
    });

    return {
      success: true,
      repairAmount: repairAmount,
      crewWorking: availableCrew.length
    };
  }

  /**
   * Get crew member info
   */
  getCrewMemberInfo(playerId) {
    return this.crewMembers.get(playerId);
  }

  /**
   * Update crew stamina (passive regeneration)
   */
  updateCrewStamina(shipId, deltaTime) {
    const crew = this.getShipCrew(shipId);
    crew.forEach(member => {
      if (member.status === 'active') {
        member.stamina = Math.min(100, member.stamina + (5 * deltaTime) / 1000);
      } else if (member.status === 'wounded') {
        // Wounded crew regenerate slower
        member.stamina = Math.min(100, member.stamina + (2 * deltaTime) / 1000);
      }
    });
  }

  /**
   * Check if crew is capable of boarding
   */
  canBoardShip(shipId) {
    const morale = this.getMorale(shipId);
    const crew = this.getShipCrew(shipId);
    const activeCrew = crew.filter(m => m.status === 'active');

    return morale > 40 && activeCrew.length > 0;
  }

  /**
   * Simulate crew combat during boarding
   */
  simulateCrewCombat(attackingShipId, defendingShipId) {
    const attackingCrew = this.getShipCrew(attackingShipId);
    const defendingCrew = this.getShipCrew(defendingShipId);

    const attackingActive = attackingCrew.filter(m => m.status === 'active');
    const defendingActive = defendingCrew.filter(m => m.status === 'active');

    // Calculate combat factors
    const attackPower = attackingActive.length * this.getAttackModifier(attackingShipId);
    const defensePower = defendingActive.length * this.getDefenseModifier(defendingShipId);

    // Determine outcome
    const isAttackingVictory = attackPower > defensePower;

    // Casualties
    const casualtyRate = isAttackingVictory ? 0.25 : 0.4; // Percentage of losers get casualties
    const losingCrew = isAttackingVictory ? defendingActive : attackingActive;
    const casualties = Math.floor(losingCrew.length * casualtyRate);

    // Apply casualties
    for (let i = 0; i < casualties; i++) {
      const casualty = losingCrew[i];
      if (casualty) {
        this.recordCasualty(casualty.shipId, casualty.playerId, 'killed');
        casualty.status = 'dead';
      }
    }

    return {
      victory: isAttackingVictory,
      attackerCasualties: isAttackingVictory ? Math.floor(casualties * 0.5) : casualties,
      defenderCasualties: isAttackingVictory ? casualties : Math.floor(casualties * 0.5),
      attackPower: Math.round(attackPower),
      defensePower: Math.round(defensePower)
    };
  }

  /**
   * Export crew combat data
   */
  exportData() {
    const crewData = Array.from(this.crewMembers.entries());
    const squadData = Array.from(this.crewSquads.entries());
    const moraleData = Array.from(this.morale.entries());

    return {
      crewMembers: crewData,
      squads: squadData,
      morale: moraleData,
      casualties: Array.from(this.casualtyRecords.entries())
    };
  }

  /**
   * Clear all crew data
   */
  clear() {
    this.crewMembers.clear();
    this.crewSquads.clear();
    this.morale.clear();
    this.casualtyRecords.clear();
  }
}
