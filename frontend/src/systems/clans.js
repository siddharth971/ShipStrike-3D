// src/systems/clans.js
// Clan/Guild system for team organization

export class Clan {
  constructor(clanId, name, leaderId, description = '') {
    this.clanId = clanId;
    this.name = name;
    this.leaderId = leaderId;
    this.description = description;
    this.createdAt = Date.now();
    this.lastActivityAt = Date.now();

    this.members = new Map(); // playerId -> 'leader', 'officer', 'member'
    this.members.set(leaderId, 'leader');

    this.banner = null; // Custom clan banner/flag
    this.stats = {
      totalGold: 0,
      totalKills: 0,
      totalShipsSunk: 0,
      totalWars: 0,
      totalWins: 0,
      totalMembers: 1
    };

    this.settings = {
      joinPolicy: 'open', // open, invite-only, leadership
      friendlyFire: false,
      voiceChat: true,
      maxMembers: 50
    };

    this.announcements = [];
    this.treasury = 0; // Shared clan gold
  }

  /**
   * Add member
   */
  addMember(playerId, role = 'member') {
    if (this.members.has(playerId)) {
      return { success: false, error: 'Already member' };
    }

    if (this.members.size >= this.settings.maxMembers) {
      return { success: false, error: 'Clan is full' };
    }

    this.members.set(playerId, role);
    this.stats.totalMembers = this.members.size;
    this.lastActivityAt = Date.now();

    return { success: true, message: `${role} added to clan` };
  }

  /**
   * Remove member
   */
  removeMember(playerId) {
    const wasRemoved = this.members.delete(playerId);
    if (wasRemoved) {
      this.stats.totalMembers = this.members.size;
      this.lastActivityAt = Date.now();
    }
    return wasRemoved;
  }

  /**
   * Change member role
   */
  setMemberRole(playerId, newRole) {
    if (!this.members.has(playerId)) {
      return { success: false, error: 'Not a member' };
    }

    const oldRole = this.members.get(playerId);
    if (oldRole === 'leader' && newRole !== 'leader') {
      return { success: false, error: 'Leader cannot be demoted' };
    }

    this.members.set(playerId, newRole);
    this.lastActivityAt = Date.now();

    return { success: true, oldRole, newRole };
  }

  /**
   * Check member role
   */
  getMemberRole(playerId) {
    return this.members.get(playerId) || null;
  }

  /**
   * Check if player is leader
   */
  isLeader(playerId) {
    return this.members.get(playerId) === 'leader';
  }

  /**
   * Get members
   */
  getMembers() {
    const members = [];
    this.members.forEach((role, playerId) => {
      members.push({ playerId, role });
    });
    return members;
  }

  /**
   * Get members by role
   */
  getMembersByRole(role) {
    const result = [];
    this.members.forEach((memberRole, playerId) => {
      if (memberRole === role) {
        result.push(playerId);
      }
    });
    return result;
  }

  /**
   * Add treasury gold
   */
  addTreasury(amount) {
    this.treasury += amount;
    this.lastActivityAt = Date.now();
    return this.treasury;
  }

  /**
   * Withdraw treasury gold
   */
  withdrawTreasury(amount) {
    if (this.treasury < amount) {
      return { success: false, error: 'Insufficient treasury' };
    }
    this.treasury -= amount;
    this.lastActivityAt = Date.now();
    return { success: true, amount, remaining: this.treasury };
  }

  /**
   * Post announcement
   */
  postAnnouncement(title, content, authorId) {
    const announcement = {
      id: `ann_${Date.now()}`,
      title,
      content,
      authorId,
      createdAt: Date.now()
    };
    this.announcements.push(announcement);
    
    // Keep only last 20 announcements
    if (this.announcements.length > 20) {
      this.announcements.shift();
    }

    this.lastActivityAt = Date.now();
    return announcement;
  }

  /**
   * Get recent announcements
   */
  getAnnouncements(limit = 10) {
    return this.announcements.slice(-limit).reverse();
  }

  /**
   * Update stats
   */
  updateStats(sessionStats) {
    this.stats.totalGold += sessionStats.gold || 0;
    this.stats.totalKills += sessionStats.kills || 0;
    this.stats.totalShipsSunk += sessionStats.shipsSunk || 0;
    if (sessionStats.warWon) this.stats.totalWins += 1;
    if (sessionStats.warParticipated) this.stats.totalWars += 1;
    this.lastActivityAt = Date.now();
  }

  /**
   * Get clan info
   */
  getInfo() {
    return {
      clanId: this.clanId,
      name: this.name,
      leaderId: this.leaderId,
      description: this.description,
      createdAt: this.createdAt,
      memberCount: this.members.size,
      maxMembers: this.settings.maxMembers,
      treasury: this.treasury,
      stats: { ...this.stats },
      settings: { ...this.settings }
    };
  }

  /**
   * Export for database
   */
  toJSON() {
    return {
      clanId: this.clanId,
      name: this.name,
      leaderId: this.leaderId,
      description: this.description,
      createdAt: this.createdAt,
      lastActivityAt: this.lastActivityAt,
      members: Object.fromEntries(this.members),
      banner: this.banner,
      stats: this.stats,
      settings: this.settings,
      announcements: this.announcements,
      treasury: this.treasury
    };
  }

  /**
   * Import from database
   */
  static fromJSON(data) {
    const clan = new Clan(data.clanId, data.name, data.leaderId, data.description);
    clan.createdAt = data.createdAt;
    clan.lastActivityAt = data.lastActivityAt;
    clan.members = new Map(Object.entries(data.members));
    clan.banner = data.banner;
    clan.stats = data.stats;
    clan.settings = data.settings;
    clan.announcements = data.announcements;
    clan.treasury = data.treasury;
    return clan;
  }
}

export class ClanSystem {
  constructor() {
    this.clans = new Map(); // clanId -> Clan
    this.playerClans = new Map(); // playerId -> clanId
    this.clanRequests = new Map(); // playerId:clanId -> joinRequest
  }

  /**
   * Create clan
   */
  createClan(clanId, name, leaderId, description = '') {
    if (this.clans.has(clanId)) {
      return { success: false, error: 'Clan already exists' };
    }

    const clan = new Clan(clanId, name, leaderId, description);
    this.clans.set(clanId, clan);
    this.playerClans.set(leaderId, clanId);

    return { success: true, clanId, message: 'Clan created' };
  }

  /**
   * Get clan
   */
  getClan(clanId) {
    return this.clans.get(clanId);
  }

  /**
   * Get player's clan
   */
  getPlayerClan(playerId) {
    const clanId = this.playerClans.get(playerId);
    return clanId ? this.clans.get(clanId) : null;
  }

  /**
   * Request to join clan
   */
  requestJoinClan(playerId, clanId) {
    const clan = this.clans.get(clanId);
    if (!clan) {
      return { success: false, error: 'Clan not found' };
    }

    if (this.playerClans.has(playerId)) {
      return { success: false, error: 'Already in a clan' };
    }

    if (clan.settings.joinPolicy === 'invite-only') {
      return { success: false, error: 'Clan is invite-only' };
    }

    const requestKey = `${playerId}:${clanId}`;
    const request = {
      playerId,
      clanId,
      createdAt: Date.now(),
      status: 'pending'
    };

    this.clanRequests.set(requestKey, request);

    return { success: true, message: 'Join request sent' };
  }

  /**
   * Accept join request
   */
  acceptJoinRequest(leaderId, playerId, clanId) {
    const clan = this.clans.get(clanId);
    if (!clan) {
      return { success: false, error: 'Clan not found' };
    }

    if (!clan.isLeader(leaderId)) {
      return { success: false, error: 'Only leaders can accept requests' };
    }

    const requestKey = `${playerId}:${clanId}`;
    if (!this.clanRequests.has(requestKey)) {
      return { success: false, error: 'Request not found' };
    }

    // Add player to clan
    clan.addMember(playerId, 'member');
    this.playerClans.set(playerId, clanId);
    this.clanRequests.delete(requestKey);

    return { success: true, message: 'Member added to clan' };
  }

  /**
   * Reject join request
   */
  rejectJoinRequest(leaderId, playerId, clanId) {
    const clan = this.clans.get(clanId);
    if (!clan || !clan.isLeader(leaderId)) {
      return { success: false, error: 'Not authorized' };
    }

    const requestKey = `${playerId}:${clanId}`;
    this.clanRequests.delete(requestKey);

    return { success: true, message: 'Request rejected' };
  }

  /**
   * Leave clan
   */
  leaveClan(playerId) {
    const clanId = this.playerClans.get(playerId);
    if (!clanId) {
      return { success: false, error: 'Not in a clan' };
    }

    const clan = this.clans.get(clanId);
    if (clan.isLeader(playerId)) {
      return { success: false, error: 'Leader cannot leave clan. Transfer leadership or disband.' };
    }

    clan.removeMember(playerId);
    this.playerClans.delete(playerId);

    return { success: true, message: 'Left clan' };
  }

  /**
   * Kick member
   */
  kickMember(leaderId, playerId, clanId) {
    const clan = this.clans.get(clanId);
    if (!clan || !clan.isLeader(leaderId)) {
      return { success: false, error: 'Not authorized' };
    }

    if (!clan.members.has(playerId)) {
      return { success: false, error: 'Not a member' };
    }

    clan.removeMember(playerId);
    this.playerClans.delete(playerId);

    return { success: true, message: 'Member kicked' };
  }

  /**
   * Disband clan
   */
  disbandClan(leaderId, clanId) {
    const clan = this.clans.get(clanId);
    if (!clan || clan.leaderId !== leaderId) {
      return { success: false, error: 'Only leader can disband' };
    }

    // Remove all members from clan
    clan.members.forEach((_, playerId) => {
      this.playerClans.delete(playerId);
    });

    this.clans.delete(clanId);

    return { success: true, message: 'Clan disbanded' };
  }

  /**
   * Get all clans (for listing)
   */
  getAllClans() {
    return Array.from(this.clans.values());
  }

  /**
   * Search clans by name
   */
  searchClans(query) {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.clans.values()).filter(clan =>
      clan.name.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get join requests for clan
   */
  getJoinRequests(clanId) {
    const requests = [];
    this.clanRequests.forEach((request, key) => {
      if (request.clanId === clanId) {
        requests.push(request);
      }
    });
    return requests;
  }

  /**
   * Export data
   */
  exportData() {
    return {
      clans: Object.fromEntries(
        Array.from(this.clans.entries()).map(([k, v]) => [k, v.toJSON()])
      ),
      playerClans: Object.fromEntries(this.playerClans),
      clanRequests: Object.fromEntries(this.clanRequests)
    };
  }

  /**
   * Import data
   */
  importData(data) {
    if (data.clans) {
      Object.entries(data.clans).forEach(([clanId, clanData]) => {
        const clan = Clan.fromJSON(clanData);
        this.clans.set(clanId, clan);
      });
    }
    if (data.playerClans) {
      Object.entries(data.playerClans).forEach(([playerId, clanId]) => {
        this.playerClans.set(playerId, clanId);
      });
    }
    if (data.clanRequests) {
      Object.entries(data.clanRequests).forEach(([k, v]) => {
        this.clanRequests.set(k, v);
      });
    }
  }

  /**
   * Clear all
   */
  clear() {
    this.clans.clear();
    this.playerClans.clear();
    this.clanRequests.clear();
  }
}

export default ClanSystem;
