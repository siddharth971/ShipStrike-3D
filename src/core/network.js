// src/core/network.js
// Network manager for multiplayer synchronization

import { io } from 'https://cdn.socket.io/4.7.2/socket.io.min.js';

class NetworkManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.authenticated = false;
    this.playerId = null;
    this.username = null;
    this.shipId = null;
    this.matchId = null;
    
    // Callbacks - Phase 1
    this.onAuthenticated = null;
    this.onWorldUpdate = null;
    this.onShipHit = null;
    this.onShipSunk = null;
    this.onPlayerJoined = null;
    this.onPlayerLeft = null;
    this.onChatMessage = null;
    this.onProjectileSpawned = null;
    this.onError = null;

    // Callbacks - Phase 2
    this.onCrewJoined = null;
    this.onCrewUpdated = null;
    this.onSailorStateUpdated = null;
    this.onWindData = null;
    this.onSailsUpdated = null;
    this.onStationInteraction = null;
    this.onMinimapData = null;

    // Callbacks - Phase 3
    this.onUpgradeSuccess = null;
    this.onUpgradesData = null;
    this.onGoldData = null;
    this.onLeaderboardData = null;
    this.onFriendRequestReceived = null;
    this.onFriendRequestSent = null;
    this.onFriendAdded = null;
    this.onFriendsData = null;
    this.onClanCreated = null;
    this.onClanJoined = null;
    this.onClanData = null;
    this.onClanChatMessage = null;

    // Callbacks - Phase 4
    this.onBoardingInitiated = null;
    this.onBoardingStarted = null;
    this.onJoinedBoardingAction = null;
    this.onBoardingStatus = null;
    this.onMeleeActionExecuted = null;
    this.onActionCompleted = null;
    this.onBotToggled = null;
    this.onBotConfigChanged = null;
    this.onBotStatus = null;

    // Callbacks - Phase 5
    this.onGameModeChanged = null;
    this.onTeamJoined = null;
    this.onTeamUpdated = null;
    this.onFlagPickedUp = null;
    this.onFlagDropped = null;
    this.onDockedAtPort = null;
    this.onCommodityBought = null;
    this.onCommoditySold = null;
    this.onGameModeInfo = null;

    // State tracking
    this.remoteShips = new Map();
    this.projectiles = new Map();
    this.chatMessages = [];
    this.lastUpdateTime = 0;
  }

  /**
   * Connect to the game server
   * @param {string} serverUrl - Server URL (default: http://localhost:3000)
   * @returns {Promise} Resolves when connected
   */
  connect(serverUrl = 'http://localhost:3000') {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(serverUrl, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5
        });

        this.socket.on('connect', () => {
          console.log('✅ Connected to game server');
          this.connected = true;
          this.setupEventListeners();
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ Connection error:', error);
          this.connected = false;
          if (this.onError) this.onError(error);
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('⚠️ Disconnected from server:', reason);
          this.connected = false;
          this.authenticated = false;
        });

        this.socket.on('error', (data) => {
          console.error('Server error:', data);
          if (this.onError) this.onError(data);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Authenticate with the server
   * @param {string} username - Player username
   * @returns {Promise} Resolves when authenticated
   */
  authenticate(username) {
    return new Promise((resolve) => {
      this.username = username;

      this.socket.once('authenticated', (data) => {
        this.playerId = data.playerId;
        this.authenticated = true;
        console.log(`🎮 Authenticated as: ${this.username} (${this.playerId.substring(0, 8)}...)`);
        
        if (this.onAuthenticated) {
          this.onAuthenticated(data);
        }
        
        resolve(data);
      });

      this.socket.emit('authenticate', { username });
    });
  }

  /**
   * Join a match
   * @param {string} matchId - Match ID
   * @returns {Promise} Resolves when joined
   */
  joinMatch(matchId) {
    return new Promise((resolve) => {
      this.matchId = matchId;

      this.socket.once('matchJoined', (data) => {
        this.shipId = data.shipId;
        console.log(`📍 Joined match: ${matchId}`);
        console.log(`⛵ Spawned ship: ${data.shipId.substring(0, 8)}...`);
        resolve(data);
      });

      this.socket.emit('joinMatch', { matchId });
    });
  }

  /**
   * Setup event listeners for game events
   */
  setupEventListeners() {
    // World updates (position sync)
    this.socket.on('worldUpdate', (data) => {
      this.lastUpdateTime = data.timestamp;
      
      // Update remote ships
      if (data.ships) {
        data.ships.forEach(shipData => {
          this.remoteShips.set(shipData.id, shipData);
        });
      }

      // Update projectiles
      if (data.projectiles) {
        data.projectiles.forEach(projData => {
          this.projectiles.set(projData.id, projData);
        });
      }

      if (this.onWorldUpdate) {
        this.onWorldUpdate(data);
      }
    });

    // Ship hit
    this.socket.on('shipHit', (data) => {
      console.log(`💥 ${data.shooterUsername} hit a ship for ${data.damage} damage`);
      if (this.onShipHit) {
        this.onShipHit(data);
      }
    });

    // Ship sunk
    this.socket.on('shipSunk', (data) => {
      console.log(`💀 Ship sunk by ${data.sunkByUsername}`);
      if (this.onShipSunk) {
        this.onShipSunk(data);
      }
    });

    // Player joined
    this.socket.on('playerJoined', (data) => {
      console.log(`👤 ${data.username} joined (${data.totalPlayers} total)`);
      if (this.onPlayerJoined) {
        this.onPlayerJoined(data);
      }
    });

    // Player joined match
    this.socket.on('playerJoinedMatch', (data) => {
      console.log(`📍 ${data.username} joined the match (${data.playerCount} in match)`);
    });

    // Player left
    this.socket.on('playerLeft', (data) => {
      console.log(`👋 ${data.username} left (${data.totalPlayers} online)`);
      if (this.onPlayerLeft) {
        this.onPlayerLeft(data);
      }
    });

    // Chat message
    this.socket.on('chatMessage', (data) => {
      this.chatMessages.push(data);
      console.log(`💬 ${data.username}: ${data.message}`);
      if (this.onChatMessage) {
        this.onChatMessage(data);
      }
    });

    // Projectile spawned
    this.socket.on('projectileSpawned', (data) => {
      if (this.onProjectileSpawned) {
        this.onProjectileSpawned(data);
      }
    });
  }

  /**
   * Send ship input to server
   * @param {number} rotation - Ship rotation (-π to π)
   * @param {number} acceleration - Acceleration (-1 to 1)
   */
  updateShipInput(rotation, acceleration) {
    if (!this.socket || !this.connected) return;

    this.socket.emit('updateShip', {
      rotation,
      acceleration
    });
  }

  /**
   * Fire weapon
   * @param {string} weaponType - Type of weapon (cannon, musket, etc)
   */
  fireWeapon(weaponType = 'cannon') {
    if (!this.socket || !this.connected) return;

    this.socket.emit('fireWeapon', {
      weaponType,
      timestamp: Date.now()
    });
  }

  /**
   * Send chat message
   * @param {string} message - Message text
   * @param {string} channel - Channel (global, team, crew)
   */
  sendChatMessage(message, channel = 'global') {
    if (!this.socket || !this.connected) return;

    this.socket.emit('chatMessage', {
      message,
      channel,
      timestamp: Date.now()
    });
  }

  /**
   * Get remote ship data
   * @param {string} shipId - Ship ID
   * @returns {object} Ship data or null
   */
  getRemoteShip(shipId) {
    return this.remoteShips.get(shipId) || null;
  }

  /**
   * Get all remote ships
   * @returns {Array} Array of ship data
   */
  getAllRemoteShips() {
    return Array.from(this.remoteShips.values());
  }

  /**
   * Get projectile data
   * @param {string} projectileId - Projectile ID
   * @returns {object} Projectile data or null
   */
  getProjectile(projectileId) {
    return this.projectiles.get(projectileId) || null;
  }

  /**
   * Get all projectiles
   * @returns {Array} Array of projectile data
   */
  getAllProjectiles() {
    return Array.from(this.projectiles.values());
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
      this.authenticated = false;
      console.log('👋 Disconnected from server');
    }
  }

  /**
   * Check if connected and authenticated
   * @returns {boolean} True if ready for gameplay
   */
  isReady() {
    return this.connected && this.authenticated && this.shipId !== null;
  }

  /**
   * Get network status
   * @returns {object} Status information
   */
  getStatus() {
    return {
      connected: this.connected,
      authenticated: this.authenticated,
      playerId: this.playerId,
      username: this.username,
      shipId: this.shipId,
      matchId: this.matchId,
      remoteShipsCount: this.remoteShips.size,
      projectilesCount: this.projectiles.size,
      chatMessages: this.chatMessages.length
    };
  }

  // ========== PHASE 2: Crew Management ==========

  /**
   * Join crew on a ship
   * @param {string} shipId - Target ship ID
   * @returns {Promise} Resolves when crew joined
   */
  joinCrew(shipId) {
    return new Promise((resolve) => {
      this.socket.once('crewJoined', (data) => {
        console.log(`👥 Joined crew on ship ${data.shipId.substring(0, 8)}...`);
        if (this.onCrewJoined) this.onCrewJoined(data);
        resolve(data);
      });

      this.socket.emit('joinCrew', { shipId });
    });
  }

  /**
   * Leave current crew
   */
  leaveCrew() {
    if (!this.socket || !this.connected) return;
    this.socket.emit('leaveCrew', {});
  }

  /**
   * Assign role to crew member
   * @param {string} crewMemberId - Crew member player ID
   * @param {string} role - Role (helmsman, gunner, rigger)
   */
  assignCrewRole(crewMemberId, role) {
    if (!this.socket || !this.connected) return;

    this.socket.emit('assignCrewRole', {
      crewMemberId,
      role
    });
  }

  /**
   * Request crew data for tracking
   */
  requestCrewData() {
    if (!this.socket || !this.connected) return;
    this.socket.emit('getCrewData', {});
  }

  // ========== PHASE 2: Sailor & Interaction ==========

  /**
   * Update sailor position and state
   * @param {object} sailorState - { position, rotation, isMoving, stationId }
   */
  updateSailorState(sailorState) {
    if (!this.socket || !this.connected) return;

    this.socket.emit('updateSailorState', {
      ...sailorState,
      timestamp: Date.now()
    });
  }

  /**
   * Interact with a ship station
   * @param {string} stationType - Type of station (helm, cannon, sail, etc)
   * @param {string} stationId - Station ID
   */
  interactWithStation(stationType, stationId) {
    if (!this.socket || !this.connected) return;

    this.socket.emit('interactWithStation', {
      stationType,
      stationId,
      timestamp: Date.now()
    });
  }

  /**
   * Stop interacting with current station
   */
  stopInteraction() {
    if (!this.socket || !this.connected) return;
    this.socket.emit('stopInteraction', {});
  }

  // ========== PHASE 2: Sails & Wind ==========

  /**
   * Adjust sail angle
   * @param {string} sailName - Sail name (main, jib, mizzen)
   * @param {number} angle - Sail angle (0-180 degrees)
   */
  setSailAngle(sailName, angle) {
    if (!this.socket || !this.connected) return;

    this.socket.emit('setSailAngle', {
      sailName,
      angle,
      timestamp: Date.now()
    });
  }

  /**
   * Deploy all sails
   */
  deployAllSails() {
    if (!this.socket || !this.connected) return;
    this.socket.emit('deployAllSails', {});
  }

  /**
   * Retract all sails
   */
  retractAllSails() {
    if (!this.socket || !this.connected) return;
    this.socket.emit('retractAllSails', {});
  }

  /**
   * Request wind data update
   */
  requestWindData() {
    if (!this.socket || !this.connected) return;
    this.socket.emit('getWindData', {});
  }

  // ========== PHASE 3: Progression & Economy ==========

  /**
   * Upgrade ship stat
   * @param {string} upgradeType - Type (cannon, armor, speed, sails, health, fireRate)
   */
  upgradeShip(upgradeType) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('upgradeShip', { upgradeType });
  }

  /**
   * Request upgrades data
   */
  requestUpgrades() {
    if (!this.socket || !this.connected) return;
    this.socket.emit('getUpgrades', {});
  }

  /**
   * Request player's gold amount
   */
  requestGold() {
    if (!this.socket || !this.connected) return;
    this.socket.emit('getGold', {});
  }

  /**
   * Request leaderboard
   * @param {string} type - Type (kills, damage, wealth, shipsSunk, level)
   * @param {number} limit - Number of entries to retrieve
   */
  requestLeaderboard(type = 'kills', limit = 100) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('getLeaderboard', { type, limit });
  }

  /**
   * Send friend request
   * @param {string} targetPlayerId - Target player ID
   */
  sendFriendRequest(targetPlayerId) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('sendFriendRequest', { targetPlayerId });
  }

  /**
   * Accept friend request
   * @param {string} senderId - Request sender ID
   */
  acceptFriendRequest(senderId) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('acceptFriendRequest', { senderId });
  }

  /**
   * Request friends list
   */
  requestFriends() {
    if (!this.socket || !this.connected) return;
    this.socket.emit('getFriends', {});
  }

  /**
   * Create a clan
   * @param {string} clanName - Clan name
   */
  createClan(clanName) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('createClan', { clanName });
  }

  /**
   * Join a clan
   * @param {string} clanId - Clan ID
   */
  joinClan(clanId) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('joinClan', { clanId });
  }

  /**
   * Request clan info
   * @param {string} clanId - Clan ID
   */
  getClanInfo(clanId) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('getClanInfo', { clanId });
  }

  /**
   * Send clan chat message
   * @param {string} message - Message text
   */
  sendClanChat(message) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('clanChat', { message });
  }

  // ========== PHASE 4: Boarding & Melee Combat ==========

  /**
   * Initiate boarding action on target ship
   * @param {string} targetShipId - Target ship ID
   */
  initiateBoarding(targetShipId) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('initiateBoarding', { targetShipId });
  }

  /**
   * Join an active boarding action
   * @param {string} boardingId - Boarding action ID
   */
  joinBoardingAction(boardingId) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('joinBoardingAction', { boardingId });
  }

  /**
   * Execute a melee combat action
   * @param {string} combatId - Combat ID
   * @param {string} action - Action type (attack, defend, dodge, parry, charge, retreat)
   * @param {string} targetId - Target player ID (optional)
   */
  executeMeleeAction(combatId, action, targetId = null) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('executeMeleeAction', { combatId, action, targetId });
  }

  /**
   * Toggle bot assistance on/off
   */
  toggleBotAssistance() {
    if (!this.socket || !this.connected) return;
    this.socket.emit('toggleBotAssistance', {});
  }

  /**
   * Set bot configuration
   * @param {string} configType - Config type (passive, balanced, aggressive)
   */
  setBotConfig(configType) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('setBotConfig', { configType });
  }

  /**
   * Request boarding status
   * @param {string} boardingId - Boarding action ID
   */
  getBoardingStatus(boardingId) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('getBoardingStatus', { boardingId });
  }

  /**
   * Request bot status
   */
  getBotStatus() {
    if (!this.socket || !this.connected) return;
    this.socket.emit('getBotStatus', {});
  }

  // ========== PHASE 5: Game Modes ==========

  /**
   * Set game mode
   * @param {string} modeType - Mode type ('teamflags' or 'trading')
   */
  setGameMode(modeType) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('setGameMode', { modeType });
  }

  /**
   * Join a team (for teamflags mode)
   * @param {string} teamId - Team ID ('red' or 'blue')
   */
  joinTeam(teamId) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('joinTeam', { teamId });
  }

  /**
   * Pick up a flag (for teamflags mode)
   * @param {string} flagId - Flag ID
   */
  pickupFlag(flagId) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('pickupFlag', { flagId });
  }

  /**
   * Drop a flag (for teamflags mode)
   * @param {string} flagId - Flag ID
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  dropFlag(flagId, x, y) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('dropFlag', { flagId, x, y });
  }

  /**
   * Dock at port (for trading mode)
   * @param {string} portId - Port ID
   * @param {string} portName - Port name
   */
  dockAtPort(portId, portName) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('dockAtPort', { portId, portName });
  }

  /**
   * Buy commodity (for trading mode)
   * @param {string} commodity - Commodity name
   * @param {number} quantity - Quantity to buy
   * @param {number} price - Price per unit
   */
  buyCommodity(commodity, quantity, price) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('buyCommodity', { commodity, quantity, price });
  }

  /**
   * Sell commodity (for trading mode)
   * @param {string} commodity - Commodity name
   * @param {number} quantity - Quantity to sell
   * @param {number} price - Price per unit
   */
  sellCommodity(commodity, quantity, price) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('sellCommodity', { commodity, quantity, price });
  }

  /**
   * Get current game mode info
   */
  getGameModeInfo() {
    if (!this.socket || !this.connected) return;
    this.socket.emit('getGameModeInfo', {});
  }

  // ========== PHASE 2: Event Callbacks Setup ==========

  /**
   * Setup all Phase 2 event listeners
   */
  setupPhase2Events() {
    // Crew system events
    this.socket.on('crewUpdated', (data) => {
      if (this.onCrewUpdated) this.onCrewUpdated(data);
    });

    this.socket.on('sailorStateUpdated', (data) => {
      if (this.onSailorStateUpdated) this.onSailorStateUpdated(data);
    });

    // Wind system events
    this.socket.on('windData', (data) => {
      if (this.onWindData) this.onWindData(data);
    });

    // Sail system events
    this.socket.on('sailsUpdated', (data) => {
      if (this.onSailsUpdated) this.onSailsUpdated(data);
    });

    // Station interaction events
    this.socket.on('stationInteraction', (data) => {
      if (this.onStationInteraction) this.onStationInteraction(data);
    });

    // Minimap data
    this.socket.on('minimapData', (data) => {
      if (this.onMinimapData) this.onMinimapData(data);
    });

    // Phase 3 events
    this.setupPhase3Events();
  }

  /**
   * Setup all Phase 3 event listeners
   */
  setupPhase3Events() {
    // Economy events
    this.socket.on('upgradeSuccess', (data) => {
      if (this.onUpgradeSuccess) this.onUpgradeSuccess(data);
    });

    this.socket.on('upgradesData', (data) => {
      if (this.onUpgradesData) this.onUpgradesData(data);
    });

    this.socket.on('goldData', (data) => {
      if (this.onGoldData) this.onGoldData(data);
    });

    // Leaderboard events
    this.socket.on('leaderboardData', (data) => {
      if (this.onLeaderboardData) this.onLeaderboardData(data);
    });

    // Friends events
    this.socket.on('friendRequestReceived', (data) => {
      if (this.onFriendRequestReceived) this.onFriendRequestReceived(data);
    });

    this.socket.on('friendRequestSent', (data) => {
      if (this.onFriendRequestSent) this.onFriendRequestSent(data);
    });

    this.socket.on('friendAdded', (data) => {
      if (this.onFriendAdded) this.onFriendAdded(data);
    });

    this.socket.on('friendsData', (data) => {
      if (this.onFriendsData) this.onFriendsData(data);
    });

    // Clan events
    this.socket.on('clanCreated', (data) => {
      if (this.onClanCreated) this.onClanCreated(data);
    });

    this.socket.on('clanJoined', (data) => {
      if (this.onClanJoined) this.onClanJoined(data);
    });

    this.socket.on('clanData', (data) => {
      if (this.onClanData) this.onClanData(data);
    });

    this.socket.on('clanChatMessage', (data) => {
      if (this.onClanChatMessage) this.onClanChatMessage(data);
    });

    // Phase 4 events
    this.setupPhase4Events();

    // Phase 5 events
    this.setupPhase5Events();
  }

  /**
   * Setup all Phase 4 event listeners
   */
  setupPhase4Events() {
    // Boarding events
    this.socket.on('boardingInitiated', (data) => {
      if (this.onBoardingInitiated) this.onBoardingInitiated(data);
    });

    this.socket.on('boardingStarted', (data) => {
      if (this.onBoardingStarted) this.onBoardingStarted(data);
    });

    this.socket.on('joinedBoardingAction', (data) => {
      if (this.onJoinedBoardingAction) this.onJoinedBoardingAction(data);
    });

    this.socket.on('boardingStatus', (data) => {
      if (this.onBoardingStatus) this.onBoardingStatus(data);
    });

    // Melee combat events
    this.socket.on('meleeActionExecuted', (data) => {
      if (this.onMeleeActionExecuted) this.onMeleeActionExecuted(data);
    });

    this.socket.on('actionCompleted', (data) => {
      if (this.onActionCompleted) this.onActionCompleted(data);
    });

    // Bot events
    this.socket.on('botToggled', (data) => {
      if (this.onBotToggled) this.onBotToggled(data);
    });

    this.socket.on('botConfigChanged', (data) => {
      if (this.onBotConfigChanged) this.onBotConfigChanged(data);
    });

    this.socket.on('botStatus', (data) => {
      if (this.onBotStatus) this.onBotStatus(data);
    });
  }

  /**
   * Setup all Phase 5 event listeners
   */
  setupPhase5Events() {
    // Game mode events
    this.socket.on('gameModeChanged', (data) => {
      if (this.onGameModeChanged) this.onGameModeChanged(data);
    });

    // Team events (Team Flags)
    this.socket.on('teamJoined', (data) => {
      if (this.onTeamJoined) this.onTeamJoined(data);
    });

    this.socket.on('teamUpdated', (data) => {
      if (this.onTeamUpdated) this.onTeamUpdated(data);
    });

    // Flag events (Team Flags)
    this.socket.on('flagPickedUp', (data) => {
      if (this.onFlagPickedUp) this.onFlagPickedUp(data);
    });

    this.socket.on('flagDropped', (data) => {
      if (this.onFlagDropped) this.onFlagDropped(data);
    });

    // Trading events (Trading Mode)
    this.socket.on('dockedAtPort', (data) => {
      if (this.onDockedAtPort) this.onDockedAtPort(data);
    });

    this.socket.on('commodityBought', (data) => {
      if (this.onCommodityBought) this.onCommodityBought(data);
    });

    this.socket.on('commoditySold', (data) => {
      if (this.onCommoditySold) this.onCommoditySold(data);
    });

    // Game mode info query response
    this.socket.on('gameModeInfo', (data) => {
      if (this.onGameModeInfo) this.onGameModeInfo(data);
    });
  }
}

// Create and export singleton instance
export const networkManager = new NetworkManager();

// Also export the class for testing
export default NetworkManager;
