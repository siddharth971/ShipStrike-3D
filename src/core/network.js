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
  }
}

// Create and export singleton instance
export const networkManager = new NetworkManager();

// Also export the class for testing
export default NetworkManager;
