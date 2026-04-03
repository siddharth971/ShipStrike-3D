/**
 * Boarding System
 * Handles ship-to-ship boarding mechanics
 * Proximity detection, boarding initiation, boarding state management
 */

export class BoardingSystem {
  constructor() {
    this.boardingZones = new Map(); // shipId -> { defender, attacker, state, progress, startTime }
    this.boardingDistance = 50; // Units to be in boarding range
    this.boardingDuration = 10000; // 10 seconds to complete boarding
    this.activeBoardings = new Map(); // id -> boarding state
    this.boardingCounter = 0;
  }

  /**
   * Check if two ships are close enough to board
   */
  canBoard(attackerShip, defenderShip) {
    if (!attackerShip || !defenderShip) return false;
    if (attackerShip.id === defenderShip.id) return false;

    const dx = attackerShip.x - defenderShip.x;
    const dy = attackerShip.y - defenderShip.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance <= this.boardingDistance;
  }

  /**
   * Initiate boarding action
   */
  initiateBoardingAction(attackerShipId, defenderShipId, attackerId) {
    const boardingId = `boarding_${++this.boardingCounter}_${Date.now()}`;

    const boarding = {
      id: boardingId,
      attackerShipId: attackerShipId,
      defenderShipId: defenderShipId,
      attackerId: attackerId, // Player initiating
      state: 'initiated', // initiated -> boarding -> completed or failed
      progress: 0, // 0-100
      startTime: Date.now(),
      attackerCrew: new Set(),
      defenderCrew: new Set(),
      boardingDamage: 0,
      capturedCannons: 0,
      defenderCassualties: 0,
      attackerCassualties: 0
    };

    this.activeBoardings.set(boardingId, boarding);
    return boarding;
  }

  /**
   * Update boarding progress
   */
  updateBoarding(boardingId) {
    const boarding = this.activeBoardings.get(boardingId);
    if (!boarding) return null;

    const elapsed = Date.now() - boarding.startTime;
    const progress = Math.min(100, (elapsed / this.boardingDuration) * 100);

    boarding.progress = progress;

    if (progress >= 100) {
      boarding.state = 'completed';
    }

    return boarding;
  }

  /**
   * Join a boarding action (crew member joins the fight)
   */
  joinBoardingAction(boardingId, playerId, isAttacker) {
    const boarding = this.activeBoardings.get(boardingId);
    if (!boarding) return false;

    if (boarding.state !== 'initiated' && boarding.state !== 'boarding') return false;

    boarding.state = 'boarding';

    if (isAttacker) {
      boarding.attackerCrew.add(playerId);
    } else {
      boarding.defenderCrew.add(playerId);
    }

    return true;
  }

  /**
   * Resolve boarding outcome
   */
  resolveBoardingOutcome(boardingId) {
    const boarding = this.activeBoardings.get(boardingId);
    if (!boarding) return null;

    const attackerCrewCount = boarding.attackerCrew.size;
    const defenderCrewCount = boarding.defenderCrew.size;

    // Determine winner based on crew participation
    const isAttackerVictory = attackerCrewCount > defenderCrewCount;

    boarding.outcome = {
      success: isAttackerVictory,
      attackerCrewCount,
      defenderCrewCount,
      capturedGold: isAttackerVictory ? 500 : 0,
      shipDamageInflicted: isAttackerVictory ? 30 : 15
    };

    boarding.state = 'completed';
    return boarding.outcome;
  }

  /**
   * Cancel/fail boarding
   */
  failBoardingAction(boardingId, reason) {
    const boarding = this.activeBoardings.get(boardingId);
    if (!boarding) return null;

    boarding.state = 'failed';
    boarding.failureReason = reason;
    return boarding;
  }

  /**
   * Get active boarding information
   */
  getBoardingInfo(boardingId) {
    return this.activeBoardings.get(boardingId);
  }

  /**
   * Get all boarding actions between two ships
   */
  getShipBoardings(shipId) {
    const boardings = [];
    for (const boarding of this.activeBoardings.values()) {
      if (boarding.attackerShipId === shipId || boarding.defenderShipId === shipId) {
        if (boarding.state !== 'completed') {
          boardings.push(boarding);
        }
      }
    }
    return boardings;
  }

  /**
   * Complete boarding action and remove it
   */
  completeBoardingAction(boardingId) {
    const boarding = this.activeBoardings.get(boardingId);
    if (!boarding) return null;

    this.resolveBoardingOutcome(boardingId);
    return boarding;
  }

  /**
   * Export all boarding data
   */
  exportData() {
    const data = {
      activeBoardings: Array.from(this.activeBoardings.entries()).map(([id, boarding]) => ({
        id,
        ...boarding,
        attackerCrew: Array.from(boarding.attackerCrew),
        defenderCrew: Array.from(boarding.defenderCrew)
      }))
    };
    return data;
  }

  /**
   * Clear all boarding data
   */
  clear() {
    this.activeBoardings.clear();
  }
}
