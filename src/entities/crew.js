// src/entities/crew.js
// Crew management system for ship teams and roles

export class CrewMember {
  constructor(sailorId, username, role = 'sailor') {
    this.sailorId = sailorId;
    this.username = username;
    this.role = role; // 'helmsman', 'gunner', 'rigger', 'sailor'
    this.joinedAt = Date.now();
    this.shotsFired = 0;
    this.sailsDamaged = 0;
    this.damageContribution = 0;
  }

  isRole(role) {
    return this.role === role || role === 'sailor'; // Anyone can do general tasks
  }

  getRoleColor() {
    const colors = {
      helmsman: 0x4488ff,
      gunner: 0xff4444,
      rigger: 0x88ff44,
      sailor: 0xaaaaaa
    };
    return colors[this.role] || colors.sailor;
  }

  getRoleDescription() {
    const descriptions = {
      helmsman: 'Helmsman - Controls ship heading',
      gunner: 'Gunner - Fires cannons',
      rigger: 'Rigger - Adjusts sails',
      sailor: 'Sailor - General duties'
    };
    return descriptions[this.role] || descriptions.sailor;
  }
}

export class ShipCrew {
  constructor(shipId, maxCrew = 20) {
    this.shipId = shipId;
    this.maxCrew = maxCrew;
    this.members = new Map(); // sailorId -> CrewMember
    this.helmsman = null;
    this.gunners = [];
    this.riggers = [];
    this.createdAt = Date.now();
  }

  addMember(sailorId, username) {
    if (this.members.size >= this.maxCrew) {
      return null; // Crew full
    }

    const member = new CrewMember(sailorId, username);
    this.members.set(sailorId, member);
    return member;
  }

  removeMember(sailorId) {
    const member = this.members.get(sailorId);
    if (!member) return false;

    // Remove from role lists
    if (this.helmsman?.sailorId === sailorId) {
      this.helmsman = null;
    }
    this.gunners = this.gunners.filter(g => g.sailorId !== sailorId);
    this.riggers = this.riggers.filter(r => r.sailorId !== sailorId);

    this.members.delete(sailorId);
    return true;
  }

  assignRole(sailorId, role) {
    const member = this.members.get(sailorId);
    if (!member) return false;

    // Remove from previous role
    if (member.role === 'helmsman') {
      this.helmsman = null;
    } else if (member.role === 'gunner') {
      this.gunners = this.gunners.filter(g => g.sailorId !== sailorId);
    } else if (member.role === 'rigger') {
      this.riggers = this.riggers.filter(r => r.sailorId !== sailorId);
    }

    // Assign new role
    member.role = role;

    if (role === 'helmsman') {
      this.helmsman = member;
    } else if (role === 'gunner') {
      this.gunners.push(member);
    } else if (role === 'rigger') {
      this.riggers.push(member);
    }

    return true;
  }

  getHelmsman() {
    return this.helmsman;
  }

  canFire(sailorId) {
    const member = this.members.get(sailorId);
    return member && member.isRole('gunner');
  }

  canAdjustSails(sailorId) {
    const member = this.members.get(sailorId);
    return member && member.isRole('rigger');
  }

  canSteer(sailorId) {
    const member = this.members.get(sailorId);
    return member && member.isRole('helmsman');
  }

  recordShot(sailorId) {
    const member = this.members.get(sailorId);
    if (member) {
      member.shotsFired++;
    }
  }

  recordDamage(sailorId, damageAmount) {
    const member = this.members.get(sailorId);
    if (member) {
      member.damageContribution += damageAmount;
    }
  }

  getMemberStats(sailorId) {
    const member = this.members.get(sailorId);
    if (!member) return null;

    return {
      sailorId: member.sailorId,
      username: member.username,
      role: member.role,
      shotsFired: member.shotsFired,
      sailsDamaged: member.sailsDamaged,
      damageContribution: member.damageContribution,
      timeOnShip: (Date.now() - member.joinedAt) / 1000 // seconds
    };
  }

  getCrewSize() {
    return this.members.size;
  }

  isFull() {
    return this.members.size >= this.maxCrew;
  }

  getEmptySlots() {
    return this.maxCrew - this.members.size;
  }

  getAllMembers() {
    return Array.from(this.members.values());
  }

  getCrewData() {
    return {
      shipId: this.shipId,
      size: this.members.size,
      maxSize: this.maxCrew,
      helmsman: this.helmsman ? this.helmsman.username : null,
      gunnerCount: this.gunners.length,
      riggerCount: this.riggers.length,
      members: Array.from(this.members.values()).map(m => ({
        sailorId: m.sailorId,
        username: m.username,
        role: m.role,
        damageContribution: m.damageContribution
      }))
    };
  }

  dispose() {
    this.members.clear();
    this.helmsman = null;
    this.gunners = [];
    this.riggers = [];
  }
}

export class CrewManager {
  constructor() {
    this.shipCrews = new Map(); // shipId -> ShipCrew
  }

  createCrew(shipId, maxCrew = 20) {
    const crew = new ShipCrew(shipId, maxCrew);
    this.shipCrews.set(shipId, crew);
    return crew;
  }

  getCrew(shipId) {
    return this.shipCrews.get(shipId);
  }

  removeCrew(shipId) {
    const crew = this.shipCrews.get(shipId);
    if (crew) {
      crew.dispose();
      this.shipCrews.delete(shipId);
    }
  }

  addCrewMember(shipId, sailorId, username) {
    const crew = this.shipCrews.get(shipId);
    if (!crew) return null;
    return crew.addMember(sailorId, username);
  }

  removeCrewMember(shipId, sailorId) {
    const crew = this.shipCrews.get(shipId);
    if (!crew) return false;
    return crew.removeMember(sailorId);
  }

  assignCrewRole(shipId, sailorId, role) {
    const crew = this.shipCrews.get(shipId);
    if (!crew) return false;
    return crew.assignRole(sailorId, role);
  }

  getAllCrews() {
    return Array.from(this.shipCrews.values());
  }

  dispose() {
    for (const [, crew] of this.shipCrews) {
      crew.dispose();
    }
    this.shipCrews.clear();
  }
}

export default CrewManager;
