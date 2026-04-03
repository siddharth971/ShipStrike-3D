// server/systems/gameManager.js
// Central game state manager - orchestrates all game systems

import { Ship, SHIP_TYPES } from './ships.js';
import { CombatSystem } from './combat.js';
import { ProgressionSystem } from './progression.js';

class GameManager {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
    
    this.players = new Map(); // playerId -> player data
    this.ships = new Map(); // shipId -> ship object
    this.combat = new CombatSystem();
    this.progression = new ProgressionSystem();
    
    this.gameTime = 0;
    this.isRunning = false;
    this.tickRate = 60; // 60 FPS
    this.deltaTime = 1 / this.tickRate;
  }

  /**
   * Initialize a new player
   */
  async initializePlayer(playerId, playerName) {
    const requestedName = typeof playerName === 'string' ? playerName.trim() : '';
    const fallbackName = `Captain_${String(playerId).slice(-4)}`;

    // Check if player exists in database
    const savedAccount = await this.databaseManager.loadAccount(playerId);
    const playerData = {
      playerId,
      username: requestedName || savedAccount?.username || savedAccount?.name || fallbackName,
      email: savedAccount?.email || null,
      createdAt: savedAccount?.createdAt || Date.now(),
      lastLogin: Date.now(),
      level: savedAccount?.level ?? 1,
      experience: savedAccount?.experience ?? savedAccount?.xp ?? 0
    };

    // Persist a normalized account shape for new and returning players.
    await this.databaseManager.saveAccount(playerId, playerData);

    // Store in memory
    this.players.set(playerId, {
      id: playerId,
      name: playerData.username,
      ship: null,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      connectedAt: Date.now(),
      lastUpdate: Date.now()
    });

    // Initialize progression
    const progress = this.progression.getPlayerProgress(playerId);
    progress.level = playerData.level || 1;
    progress.gold = savedAccount?.gold || 500;
    progress.totalXp = playerData.experience || 0;

    return {
      playerId,
      playerName: playerData.username,
      level: playerData.level || 1,
      gold: savedAccount?.gold || 500
    };
  }

  /**
   * Spawn a ship for a player
   */
  spawnShip(playerId, shipTypeId) {
    const shipType = Object.values(SHIP_TYPES).find(t => t.id === shipTypeId);
    if (!shipType) return null;

    const playerData = this.players.get(playerId);
    if (!playerData) return null;

    // Create new ship
    const upgrades = {};
    const ship = new Ship(shipType, playerId, playerData.name, upgrades);
    
    // Randomize starting position
    const spawnRadius = 500;
    const angle = Math.random() * Math.PI * 2;
    ship.position.x = Math.cos(angle) * spawnRadius;
    ship.position.z = Math.sin(angle) * spawnRadius;
    
    // Store ship
    this.ships.set(ship.id, ship);
    playerData.ship = ship.id;

    return ship.toJSON();
  }

  /**
   * Update all game physics
   */
  updateGameState() {
    // Update all ships
    for (const ship of this.ships.values()) {
      ship.updatePosition(this.deltaTime);
    }

    // Update projectiles
    this.combat.updateProjectiles(this.deltaTime);

    // Check for hits
    for (const ship of this.ships.values()) {
      const hits = this.combat.checkHits(ship);
      for (const hit of hits) {
        const damage = ship.takeDamage(hit.damage);
        
        // Get attacker ship
        const attackerShip = this.ships.get(hit.attackerShipId);
        if (attackerShip) {
          const playerId = attackerShip.playerId;
          
          // Record combat statistics
          this.progression.recordCombat(playerId, {
            damageDealt: hit.damage,
            cannonsFired: 1
          });

          // Update database
          if (ship.currentHP <= 0) {
            this.progression.recordCombat(playerId, {
              shipsDestroyed: 1
            });
          }
        }

        // Record damage taken
        const targetPlayerId = ship.playerId;
        this.progression.getPlayerProgress(targetPlayerId).combatStats.damageTaken += hit.damage;
      }
    }

    this.gameTime += this.deltaTime;
  }

  /**
   * Process player input
   */
  handlePlayerInput(playerId, input) {
    const playerData = this.players.get(playerId);
    if (!playerData || !playerData.ship) return null;

    const ship = this.ships.get(playerData.ship);
    if (!ship) return null;

    // Handle steering
    if (input.steering !== undefined) {
      ship.steerShip(input.steering, this.deltaTime);
    }

    // Handle throttle
    if (input.throttle !== undefined) {
      ship.throttle = Math.max(0, Math.min(100, input.throttle));
    }

    // Handle cannon fire
    if (input.fire && input.targetPosition) {
      const projectile = ship.fireCannonAt(input.targetPosition, 0);
      if (projectile) {
        this.combat.fireCannonAt(ship, input.targetPosition);
      }
    }

    // Handle ammo switch
    if (input.ammoSwitch) {
      ship.switchAmmo(input.ammoSwitch);
    }

    // Handle sails
    if (input.sails !== undefined) {
      ship.sails.deployed = input.sails;
    }

    return {
      position: ship.position,
      rotation: ship.rotation,
      throttle: ship.throttle
    };
  }

  /**
   * Get all ships in player's view
   */
  getShipsInViewport(playerId, viewDistance = 2000) {
    const playerData = this.players.get(playerId);
    if (!playerData || !playerData.ship) return [];

    const ship = this.ships.get(playerData.ship);
    if (!ship) return [];

    const visibleShips = [];
    for (const otherShip of this.ships.values()) {
      if (otherShip.id === ship.id) continue; // Don't include self

      const dx = otherShip.position.x - ship.position.x;
      const dz = otherShip.position.z - ship.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance <= viewDistance) {
        visibleShips.push(otherShip.toJSON());
      }
    }

    return visibleShips;
  }

  /**
   * Get projectiles in viewport
   */
  getProjectilesInViewport(playerId, viewDistance = 2000) {
    const playerData = this.players.get(playerId);
    if (!playerData || !playerData.ship) return [];

    const ship = this.ships.get(playerData.ship);
    if (!ship) return [];

    return this.combat.getProjectilesNearby(ship.position, viewDistance);
  }

  /**
   * Purchase an upgrade
   */
  async purchaseUpgrade(playerId, upgradeType, shipId) {
    const ship = this.ships.get(shipId);
    if (!ship || ship.playerId !== playerId) return { success: false, error: 'Invalid ship' };

    const progress = this.progression.getPlayerProgress(playerId);
    const currentLevel = ship.upgrades[upgradeType] || 0;

    // Calculate cost
    const cost = this.calculateUpgradeCost(upgradeType, currentLevel + 1);
    if (!cost) return { success: false, error: 'Max level reached' };

    if (progress.gold < cost) {
      return { success: false, error: 'Not enough gold' };
    }

    // Perform upgrade
    this.progression.spendGold(playerId, cost);
    ship.upgrades[upgradeType] = currentLevel + 1;

    // Save to database
    await this.databaseManager.saveUpgrades(playerId, {
      [upgradeType]: ship.upgrades[upgradeType]
    });

    return {
      success: true,
      newLevel: ship.upgrades[upgradeType],
      goldRemaining: progress.gold,
      newStats: {
        hp: ship.maxHP,
        damage: ship.cannonDamage,
        speed: ship.maxSpeed
      }
    };
  }

  /**
   * Calculate upgrade cost
   */
  calculateUpgradeCost(upgradeType, targetLevel) {
    const baseCosts = {
      hull: 100,
      cannons: 150,
      speed: 120,
      acceleration: 100,
      crew: 80
    };

    if (!baseCosts[upgradeType]) return null;
    if (targetLevel > 20) return null;

    const cost = Math.floor(
      baseCosts[upgradeType] * Math.pow(1.15, targetLevel - 1)
    );

    return cost;
  }

  /**
   * Remove player and clean up ship
   */
  removePlayer(playerId) {
    const playerData = this.players.get(playerId);
    if (playerData && playerData.ship) {
      this.ships.delete(playerData.ship);
    }
    this.players.delete(playerId);
  }

  /**
   * Get player state
   */
  getPlayerState(playerId) {
    const playerData = this.players.get(playerId);
    if (!playerData) return null;

    const ship = playerData.ship ? this.ships.get(playerData.ship) : null;
    const progress = this.progression.getPlayerProgress(playerId);
    const xpProgress = this.progression.getXpProgress(playerId);

    return {
      playerId,
      playerName: playerData.name,
      level: progress.level,
      gold: progress.gold,
      xpProgress,
      ship: ship ? ship.toJSON() : null,
      combatStats: progress.combatStats
    };
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(limit = 10) {
    const leaders = Array.from(this.players.values())
      .map(p => {
        const progress = this.progression.getPlayerProgress(p.id);
        return {
          playerName: p.name,
          level: progress.level,
          gold: progress.gold,
          shipsDestroyed: progress.combatStats.shipsDestroyed || 0
        };
      })
      .sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level;
        return b.shipsDestroyed - a.shipsDestroyed;
      })
      .slice(0, limit);

    return leaders;
  }

  /**
   * Start game loop (for server)
   */
  startGameLoop() {
    if (this.isRunning) return;
    this.isRunning = true;

    const interval = setInterval(() => {
      this.updateGameState();
    }, this.deltaTime * 1000);

    return () => clearInterval(interval);
  }

  /**
   * Stop game loop
   */
  stopGameLoop(stopFn) {
    this.isRunning = false;
    if (stopFn) stopFn();
  }

  /**
   * Get game stats
   */
  getGameStats() {
    return {
      activePlayers: this.players.size,
      activeShips: this.ships.size,
      activeProjectiles: this.combat.projectiles.size,
      gameTime: this.gameTime,
      uptime: this.isRunning ? 'running' : 'stopped'
    };
  }
}

export { GameManager };
