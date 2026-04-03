// frontend/src/systems/gameState.js
// Local game state management

class GameState {
  constructor(networkClient) {
    this.network = networkClient;
    
    // Player data
    this.playerId = null;
    this.playerName = null;
    this.level = 1;
    this.gold = 500;
    this.xp = 0;
    this.maxXP = 100;
    
    // Ship data
    this.ship = {
      id: null,
      type: 'sloop',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      hp: 150,
      maxHP: 150,
      throttle: 0,
      ammoType: 'normal',
      crew: []
    };

    // Combat stats
    this.combatStats = {
      shipsDestroyed: 0,
      damageDealt: 0,
      damageTaken: 0,
      cannonsFired: 0,
      battlesParticipated: 0
    };

    // Upgrades
    this.upgrades = {
      hull: 0,
      cannons: 0,
      speed: 0,
      acceleration: 0,
      crew: 0
    };

    // Game world
    this.otherShips = new Map(); // shipId -> shipData
    this.projectiles = new Map(); // projectileId -> projectileData
    this.leaderboard = [];
    
    // Chat
    this.messages = [];
    this.maxChatMessages = 50;
    
    // Timing
    this.gameTime = 0;
    this.deltaTime = 1/60; // 60 FPS
    this.lastUpdateTime = Date.now();
    
    // Setup network listeners
    this.setupNetworkListeners();
  }

  /**
   * Setup listeners for network events
   */
  setupNetworkListeners() {
    // Player state updates
    this.network.on('playerState', (state) => {
      this.updateFromServer(state);
    });

    // Game state updates
    this.network.on('gameState', (gameState) => {
      this.processGameState(gameState);
    });

    // Ship updates
    this.network.on('shipsUpdate', (data) => {
      this.updateOtherShips(data.ships);
    });

    this.network.on('shipEntered', (data) => {
      this.otherShips.set(data.ship.id, data.ship);
    });

    // Combat
    this.network.on('cannonFired', (data) => {
      this.addProjectile(data.projectile);
    });

    this.network.on('ammoSwitched', (data) => {
      this.ship.ammoType = data.ammoType;
    });

    // Upgrades
    this.network.on('upgradePurchased', (data) => {
      if (data.success) {
        this.gold = data.goldRemaining;
        // Update upgrade level based on type
        for (const [key, value] of Object.entries(data.newStats)) {
          if (key === 'hp') {
            this.ship.maxHP = value;
            this.ship.hp = value;
          } else if (key === 'speed') {
            this.ship.maxSpeed = value;
          } else if (key === 'damage') {
            this.ship.cannonDamage = value;
          }
        }
      }
    });

    // Leaderboard
    this.network.on('leaderboard', (data) => {
      this.leaderboard = data.leaders;
      this.emit('leaderboardUpdated', this.leaderboard);
    });

    // Chat
    this.network.on('chatMessage', (data) => {
      this.addChatMessage(data.playerName, data.message);
    });

    // Player disconnected
    this.network.on('playerDisconnected', (data) => {
      if (this.otherShips.has(data.playerId)) {
        this.otherShips.delete(data.playerId);
      }
    });

    // Server stats
    this.network.on('serverStats', (stats) => {
      this.emit('serverStatsUpdated', stats);
    });
  }

  /**
   * Update local state from server
   */
  updateFromServer(state) {
    this.playerId = state.playerId;
    this.playerName = state.playerName;
    this.level = state.level;
    this.gold = state.gold;
    
    if (state.xpProgress) {
      this.xp = state.xpProgress.currentXp;
      this.maxXP = state.xpProgress.xpToNextLevel;
    }

    if (state.ship) {
      Object.assign(this.ship, state.ship);
    }

    this.combatStats = state.combatStats || this.combatStats;

    this.emit('playerUpdated', {
      level: this.level,
      gold: this.gold,
      xp: this.xp,
      maxXP: this.maxXP
    });
  }

  /**
   * Process full game state from server
   */
  processGameState(gameState) {
    this.updateFromServer(gameState.player);
    this.updateOtherShips(gameState.ships);
    this.updateProjectiles(gameState.projectiles);
    this.gameTime = gameState.gameTime;
  }

  /**
   * Update other players' ships
   */
  updateOtherShips(ships) {
    this.otherShips.clear();
    ships.forEach(ship => {
      if (ship.id !== this.ship.id) {
        this.otherShips.set(ship.id, ship);
      }
    });
    this.emit('shipsUpdated', Array.from(this.otherShips.values()));
  }

  /**
   * Update projectiles
   */
  updateProjectiles(projectiles) {
    this.projectiles.clear();
    projectiles.forEach(proj => {
      this.projectiles.set(proj.id, proj);
    });
    this.emit('projectilesUpdated', Array.from(this.projectiles.values()));
  }

  /**
   * Add a single projectile
   */
  addProjectile(projectile) {
    if (projectile && projectile.id) {
      this.projectiles.set(projectile.id, projectile);
    }
  }

  /**
   * Update player input
   */
  updateInput(input) {
    if (input.throttle !== undefined) {
      this.ship.throttle = Math.max(0, Math.min(100, input.throttle));
    }
    if (input.position !== undefined) {
      this.ship.position = { ...input.position };
    }
    if (input.rotation !== undefined) {
      this.ship.rotation = { ...input.rotation };
    }
    
    // Send to server
    this.network.updateInput(input);
  }

  /**
   * Fire cannon
   */
  fireCannonAt(targetPosition) {
    this.network.fireCannonAt(targetPosition);
  }

  /**
   * Switch ammunition
   */
  switchAmmunition(direction) {
    this.network.switchAmmo(direction);
  }

  /**
   * Add chat message locally
   */
  addChatMessage(playerName, message) {
    this.messages.push({
      playerName,
      message,
      timestamp: Date.now()
    });
    
    // Keep only last N messages
    if (this.messages.length > this.maxChatMessages) {
      this.messages.shift();
    }
    
    this.emit('chatMessageAdded', { playerName, message });
  }

  /**
   * Get player XP progress as percentage
   */
  getXPPercentage() {
    return Math.min(1.0, this.xp / this.maxXP);
  }

  /**
   * Get player HP percentage
   */
  getHPPercentage() {
    return Math.min(1.0, this.ship.hp / this.ship.maxHP);
  }

  /**
   * Event system
   */
  listeners = new Map();

  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(callback);
  }

  off(eventName, callback) {
    if (this.listeners.has(eventName)) {
      const handlers = this.listeners.get(eventName);
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(eventName, data) {
    if (this.listeners.has(eventName)) {
      this.listeners.get(eventName).forEach(handler => handler(data));
    }
  }

  /**
   * Reset state
   */
  reset() {
    this.playerId = null;
    this.playerName = null;
    this.level = 1;
    this.gold = 500;
    this.xp = 0;
    this.ship = {
      id: null,
      type: 'sloop',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      hp: 150,
      maxHP: 150,
      throttle: 0,
      ammoType: 'normal',
      crew: []
    };
    this.otherShips.clear();
    this.projectiles.clear();
    this.messages = [];
    this.combatStats = {};
  }
}

export default GameState;
