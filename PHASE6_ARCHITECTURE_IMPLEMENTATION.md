# PHASE 6 + TECHNICAL ARCHITECTURE Implementation Guide

**Status:** Implementation Framework Ready
**Date:** April 3, 2026
**Purpose:** Bridge Phase 6 systems with Technical Architecture patterns

---

## Overview

This guide shows how to implement the TECHNICAL_ARCHITECTURE.md patterns using the Phase 6 systems already created.

---

## 1. Game Server Implementation

**File:** `server/gameServer.js` (Based on TECHNICAL_ARCHITECTURE + Phase 6 systems)

```javascript
// server/gameServer.js
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const { clusterManager } = require("./systems/clusterManager.js");
const { interestManager } = require("./systems/interestManager.js");
const { lagCompensator } = require("./systems/lagCompensation.js");

class GameServer {
  constructor(port = 3000) {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIO(this.server, {
      cors: { origin: "*" },
    });
    this.port = port;

    // Game state
    this.players = new Map();
    this.ships = new Map();
    this.projectiles = new Map();
    this.matches = new Map();

    // Systems
    this.clusterManager = clusterManager;
    this.interestManager = interestManager;
    this.lagCompensator = lagCompensator;

    // Performance monitoring
    this.stats = {
      tickCount: 0,
      lastTickTime: Date.now(),
      avgTickTime: 0,
      playerCount: 0,
    };

    this.setupEventHandlers();
    this.startGameLoop();
  }

  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`✅ Player connected: ${socket.id}`);

      // Authentication
      socket.on("authenticate", (data) => {
        this.handleAuthentication(socket, data);
      });

      // Ship control
      socket.on("steerShip", (data) => {
        this.handleSteerShip(socket, data);
      });

      // Fire weapon
      socket.on("fireWeapon", (data) => {
        this.handleFireWeapon(socket, data);
      });

      // Disconnect
      socket.on("disconnect", () => {
        this.handlePlayerDisconnect(socket);
      });
    });
  }

  handleAuthentication(socket, data) {
    const { username } = data;

    // Create player
    const playerId = socket.id;
    const player = {
      id: playerId,
      username: username,
      socket: socket,
      shipId: null,
      health: 100,
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      velocity: { x: 0, y: 0 },
      lastUpdateTime: Date.now(),
    };

    this.players.set(playerId, player);

    // Assign to cluster
    const server = this.clusterManager.selectServerForPlayer();
    console.log(`📍 Player ${playerId} assigned to server: ${server.id}`);

    // Register for interest management
    this.interestManager.registerEntity(
      playerId,
      player.position.x,
      player.position.y,
    );

    socket.emit("authenticated", {
      playerId: playerId,
      timestamp: Date.now(),
    });

    console.log(`🎮 Player authenticated: ${username}`);
  }

  handleSteerShip(socket, data) {
    const player = this.players.get(socket.id);
    if (!player) return;

    // Update player steering input
    player.steeringInput = {
      angle: Math.max(-Math.PI, Math.min(Math.PI, data.angle)),
      acceleration: Math.max(0, Math.min(1, data.acceleration)),
    };

    // Measure latency for lag compensation
    const latency = this.lagCompensator.measureLatency(data.timestamp);

    // Create snapshot for lag compensation
    this.lagCompensator.createSnapshot(player.id, {
      position: player.position,
      rotation: player.rotation,
      velocity: player.velocity,
      health: player.health,
    });
  }

  handleFireWeapon(socket, data) {
    const player = this.players.get(socket.id);
    if (!player) return;

    // Validate with lag compensation
    const predicted = this.lagCompensator.predictState(
      player.id,
      player,
      this.lagCompensator.latency,
    );

    // Validate against cheating
    const validation = this.lagCompensator.checkSuspiciousBehavior(
      player.id,
      data,
      player,
    );

    if (validation.suspicious) {
      console.warn(`⚠️ Suspicious behavior: ${validation.reason}`);
      return;
    }

    // Fire projectile
    const projectile = {
      id: `proj_${Date.now()}_${Math.random()}`,
      ownerPlayerId: player.id,
      position: { ...data.position },
      velocity: { ...data.velocity },
      damage: 10,
      createdAt: Date.now(),
    };

    this.projectiles.set(projectile.id, projectile);

    // Broadcast to interested players
    const interestedPlayers = this.interestManager.getEntitiesInRange(
      player.id,
    );
    interestedPlayers.forEach((otherPlayerId) => {
      const otherPlayer = this.players.get(otherPlayerId);
      if (otherPlayer) {
        otherPlayer.socket.emit("projectileSpawned", projectile);
      }
    });
  }

  handlePlayerDisconnect(socket) {
    const player = this.players.get(socket.id);
    if (!player) return;

    // Remove from cluster
    this.clusterManager.removePlayerFromServer(socket.id);

    // Unregister from interest manager
    this.interestManager.unregisterEntity(socket.id);

    // Remove player
    this.players.delete(socket.id);

    console.log(`❌ Player disconnected: ${player.username}`);
  }

  startGameLoop() {
    const TICK_RATE = 60; // 60 Hz
    const TICK_INTERVAL = 1000 / TICK_RATE;

    let lastTickTime = Date.now();

    setInterval(() => {
      const now = Date.now();
      const delta = (now - lastTickTime) / 1000;
      lastTickTime = now;

      this.gameLoopTick(delta);
    }, TICK_INTERVAL);
  }

  gameLoopTick(delta) {
    const tickStartTime = Date.now();

    // 1. Update player positions from steering input
    this.players.forEach((player) => {
      if (player.steeringInput) {
        this.updatePlayerPosition(player, delta);
      }
    });

    // 2. Update interest manager
    this.players.forEach((player) => {
      this.interestManager.updatePlayerInterest(
        player.id,
        player.position.x,
        player.position.y,
      );
    });

    // 3. Detect collisions & apply projectile damage
    this.updateProjectiles(delta);

    // 4. Broadcast world state to interested players
    this.broadcastWorldState();

    // 5. Track performance
    const tickTime = Date.now() - tickStartTime;
    this.stats.tickCount++;
    this.stats.avgTickTime = (this.stats.avgTickTime + tickTime) / 2;
    this.stats.playerCount = this.players.size;

    // Log every 60 ticks (1 second at 60 Hz)
    if (this.stats.tickCount % 60 === 0) {
      console.log(
        `📊 Tick ${this.stats.tickCount}: ${tickTime}ms (avg: ${this.stats.avgTickTime.toFixed(1)}ms, players: ${this.stats.playerCount})`,
      );
    }
  }

  updatePlayerPosition(player, delta) {
    const { angle, acceleration } = player.steeringInput;

    // Physics: update velocity based on steering
    const moveSpeed = 100; // Units per second
    player.velocity.x = Math.cos(angle) * acceleration * moveSpeed;
    player.velocity.y = Math.sin(angle) * acceleration * moveSpeed;

    // Update position
    player.position.x += player.velocity.x * delta;
    player.position.y += player.velocity.y * delta;
    player.rotation = angle;

    // Clamp to world bounds
    player.position.x = Math.max(0, Math.min(4000, player.position.x));
    player.position.y = Math.max(0, Math.min(4000, player.position.y));
  }

  updateProjectiles(delta) {
    this.projectiles.forEach((projectile, projId) => {
      // Update position
      projectile.position.x += projectile.velocity.x * delta;
      projectile.position.y += projectile.velocity.y * delta;

      // Check collision with players
      this.players.forEach((player) => {
        if (player.id === projectile.ownerPlayerId) return;

        const dist = Math.sqrt(
          Math.pow(player.position.x - projectile.position.x, 2) +
            Math.pow(player.position.y - projectile.position.y, 2),
        );

        if (dist < 50) {
          // Hit radius
          // Apply damage
          player.health -= projectile.damage;

          // Broadcast hit event
          this.io.emit("shipHit", {
            hitPlayer: player.id,
            shooter: projectile.ownerPlayerId,
            damage: projectile.damage,
            position: projectile.position,
          });

          // Remove projectile
          this.projectiles.delete(projId);

          // Check if player sank
          if (player.health <= 0) {
            this.io.emit("shipSunk", {
              sunkPlayer: player.id,
              sinkerPlayer: projectile.ownerPlayerId,
            });
            player.health = 100; // Reset
            player.position = {
              x: Math.random() * 4000,
              y: Math.random() * 4000,
              z: 0,
            };
          }
        }
      });

      // Remove if out of bounds
      if (
        projectile.position.x < 0 ||
        projectile.position.x > 4000 ||
        projectile.position.y < 0 ||
        projectile.position.y > 4000
      ) {
        this.projectiles.delete(projId);
      }
    });
  }

  broadcastWorldState() {
    // For each player, send only interested (nearby) ships
    this.players.forEach((player) => {
      // Get entities in player's interest range
      const interestedShipIds = this.interestManager.getEntitiesInRange(
        player.id,
      );

      // Only broadcast significant updates
      const updates = this.interestManager.filterSignificantUpdates(
        player.id,
        Array.from(this.players.values()),
        this.lastBroadcast,
      );

      if (updates.size > 0) {
        player.socket.emit("worldUpdate", {
          ships: Array.from(updates.values()).map((p) => ({
            id: p.id,
            position: p.position,
            rotation: p.rotation,
            health: p.health,
            username: p.username,
          })),
          projectiles: Array.from(this.projectiles.values())
            .filter((proj) => {
              const dist = Math.sqrt(
                Math.pow(player.position.x - proj.position.x, 2) +
                  Math.pow(player.position.y - proj.position.y, 2),
              );
              return dist < 2000; // Only send nearby projectiles
            })
            .map((p) => ({
              id: p.id,
              position: p.position,
              velocity: p.velocity,
            })),
          timestamp: Date.now(),
        });
      }
    });

    this.lastBroadcast = new Map(this.players);
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(`🚀 Game server listening on port ${this.port}`);
    });
  }
}

// Start server
const gameServer = new GameServer(3000);
gameServer.start();

module.exports = gameServer;
```

---

## 2. Spatial Partitioning Implementation

**File:** `server/systems/spatialHash.js`

```javascript
// server/systems/spatialHash.js
class SpatialHash {
  constructor(cellSize = 500) {
    this.cellSize = cellSize;
    this.grid = new Map(); // "cellX,cellY" → Set of entities
  }

  getKey(x, y) {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  registerEntity(entityId, x, y) {
    const key = this.getKey(x, y);

    if (!this.grid.has(key)) {
      this.grid.set(key, new Set());
    }

    this.grid.get(key).add(entityId);
  }

  unregisterEntity(entityId, x, y) {
    const key = this.getKey(x, y);

    if (this.grid.has(key)) {
      this.grid.get(key).delete(entityId);

      if (this.grid.get(key).size === 0) {
        this.grid.delete(key);
      }
    }
  }

  getNearby(x, y, range) {
    const nearby = new Set();
    const cellRange = Math.ceil(range / this.cellSize);
    const centerCellX = Math.floor(x / this.cellSize);
    const centerCellY = Math.floor(y / this.cellSize);

    for (let dx = -cellRange; dx <= cellRange; dx++) {
      for (let dy = -cellRange; dy <= cellRange; dy++) {
        const key = `${centerCellX + dx},${centerCellY + dy}`;
        if (this.grid.has(key)) {
          this.grid.get(key).forEach((id) => nearby.add(id));
        }
      }
    }

    return nearby;
  }

  // Get stats for monitoring
  getStats() {
    let totalEntities = 0;
    let cellsWithEntities = 0;

    this.grid.forEach((entities) => {
      if (entities.size > 0) {
        cellsWithEntities++;
        totalEntities += entities.size;
      }
    });

    return {
      totalCells: this.grid.size,
      cellsWithEntities,
      totalEntities,
      averageEntitiesPerCell: totalEntities / (cellsWithEntities || 1),
    };
  }
}

module.exports = { SpatialHash };
```

---

## 3. Combat Validation Implementation

**File:** `server/systems/combatValidator.js`

```javascript
// server/systems/combatValidator.js
class CombatValidator {
  constructor(lagCompensator) {
    this.lagCompensator = lagCompensator;
    this.lastFireTime = new Map(); // playerId → timestamp
    this.fireRateLimitMs = 100; // 10 shots per second max
  }

  validateCannonFire(fireCommand, player) {
    // 1. Rate limit check
    const now = Date.now();
    const lastFire = this.lastFireTime.get(player.id) || 0;

    if (now - lastFire < this.fireRateLimitMs) {
      return {
        valid: false,
        reason: "Rate limited",
      };
    }

    // 2. Lag compensation validation
    const suspicion = this.lagCompensator.checkSuspiciousBehavior(
      player.id,
      fireCommand,
      player,
    );

    if (suspicion.suspicious) {
      return {
        valid: false,
        reason: suspicion.reason,
      };
    }

    // 3. Position validation (can't fire from impossible location)
    const predictedPos = this.lagCompensator.predictState(
      player.id,
      player,
      this.lagCompensator.latency,
    );

    const distance = Math.sqrt(
      Math.pow(predictedPos.x - fireCommand.position.x, 2) +
        Math.pow(predictedPos.y - fireCommand.position.y, 2),
    );

    if (distance > 100) {
      // Can't fire from 100+ units away
      return {
        valid: false,
        reason: "Position mismatch",
      };
    }

    // All checks passed
    this.lastFireTime.set(player.id, now);
    return { valid: true };
  }

  calculateProjectileTrajectory(firePos, angle, shipVelocity, windVector) {
    // Physics-based calculation
    const projectileSpeed = 500; // Units/sec

    const velocity = {
      x: Math.cos(angle) * projectileSpeed + shipVelocity.x,
      y: Math.sin(angle) * projectileSpeed + shipVelocity.y,
    };

    // Wind slightly affects trajectory
    velocity.x += windVector.x * 0.1;
    velocity.y += windVector.y * 0.1;

    return {
      position: firePos,
      velocity: velocity,
    };
  }
}

module.exports = { CombatValidator };
```

---

## 4. Database Schema (MongoDB)

**File:** `server/models/schemas.js`

```javascript
// server/models/schemas.js
const mongoose = require("mongoose");

// Players Collection
const playerSchema = new mongoose.Schema({
  accountId: String,
  username: { type: String, unique: true },
  email: { type: String, unique: true },
  passwordHash: String,

  // Stats
  totalGold: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  totalKills: { type: Number, default: 0 },
  totalDamage: { type: Number, default: 0 },
  totalWins: { type: Number, default: 0 },

  // Ships
  ownedShips: [{ type: mongoose.Schema.Types.ObjectId, ref: "Ship" }],
  currentShipId: { type: mongoose.Schema.Types.ObjectId, ref: "Ship" },

  // Social
  clanId: { type: mongoose.Schema.Types.ObjectId, ref: "Clan" },
  friends: [String],
  blockedPlayers: [String],

  createdAt: { type: Date, default: Date.now },
  lastLoginAt: Date,
});

// Ships Collection
const shipSchema = new mongoose.Schema({
  accountId: String,
  shipType: { type: String, enum: ["sloop", "frigate", "warship"] },
  name: String,

  // Base stats
  maxHealth: Number,
  maxSpeed: Number,
  cannonDamage: Number,
  armor: Number,

  // Upgrades (1-5)
  cannonUpgradeLevel: { type: Number, default: 1 },
  speedUpgradeLevel: { type: Number, default: 1 },
  armorUpgradeLevel: { type: Number, default: 1 },

  // Performance
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  totalKills: { type: Number, default: 0 },
  sinkCount: { type: Number, default: 0 },
});

// Clans Collection
const clanSchema = new mongoose.Schema({
  name: { type: String, unique: true },
  leader: String,
  members: [String],
  tagColor: String,

  stats: {
    totalKills: { type: Number, default: 0 },
    totalWins: { type: Number, default: 0 },
  },

  createdAt: { type: Date, default: Date.now },
});

// Match History Collection
const matchSchema = new mongoose.Schema({
  matchId: String,
  mode: String,
  startTime: Date,
  endTime: Date,

  players: [
    {
      accountId: String,
      username: String,
      damage: Number,
      kills: Number,
      deaths: Number,
      finalHealth: Number,
    },
  ],

  winner: String, // accountId
});

module.exports = {
  Player: mongoose.model("Player", playerSchema),
  Ship: mongoose.model("Ship", shipSchema),
  Clan: mongoose.model("Clan", clanSchema),
  Match: mongoose.model("Match", matchSchema),
};
```

---

## 5. Client-Side State Management

**File:** `src/core/networkState.js`

```javascript
// src/core/networkState.js
export class NetworkState {
  constructor() {
    // Local player
    this.playerId = null;
    this.username = null;
    this.ship = null;

    // World state
    this.remoteShips = new Map(); // shipId → ShipData
    this.projectiles = new Map();

    // Last known state (for interpolation)
    this.lastUpdateTime = 0;
    this.updateDelta = 0;

    // Prediction
    this.predictedPosition = null;
    this.serverPosition = null;

    // Network stats
    this.latency = 0;
    this.lastPingTime = Date.now();
  }

  updateShipState(shipData) {
    // Delta update - only update changed fields
    if (!this.remoteShips.has(shipData.id)) {
      this.remoteShips.set(shipData.id, {});
    }

    const ship = this.remoteShips.get(shipData.id);
    Object.assign(ship, shipData);

    // Store last update for interpolation
    if (!ship.lastUpdate) {
      ship.lastUpdate = { ...ship };
    }
  }

  predictMovement(delta) {
    // Local prediction based on known velocity
    if (this.ship && this.ship.velocity) {
      this.ship.position.x += this.ship.velocity.x * delta;
      this.ship.position.y += this.ship.velocity.y * delta;
    }
  }

  reconcileWithServer(serverState) {
    // Check if prediction was accurate
    const error = Math.sqrt(
      Math.pow(this.ship.position.x - serverState.x, 2) +
        Math.pow(this.ship.position.y - serverState.y, 2),
    );

    if (error > 50) {
      // Large error threshold
      // Gradually move back to server state
      this.ship.position.x += (serverState.x - this.ship.position.x) * 0.1;
      this.ship.position.y += (serverState.y - this.ship.position.y) * 0.1;
    }
  }

  interpolateRemoteShips(alpha) {
    // Smooth movement between network updates
    this.remoteShips.forEach((ship) => {
      if (ship.lastUpdate && ship.position) {
        ship.displayPosition = {
          x: ship.lastUpdate.x + (ship.position.x - ship.lastUpdate.x) * alpha,
          y: ship.lastUpdate.y + (ship.position.y - ship.lastUpdate.y) * alpha,
        };
      }
    });
  }

  recordLatency(rtt) {
    this.latency = rtt / 2; // One way trip
    this.lastPingTime = Date.now();
  }
}
```

---

## 6. Integration with Phase 6 Systems

### Cluster Manager in Game Loop

```javascript
// In gameServer.js setup:
const { clusterManager } = require("./systems/clusterManager.js");

// During server initialization
clusterManager.createServer({
  name: "Game Server 1",
  region: "us-east",
  host: "localhost",
  port: 3000,
});

// Monitor cluster health
setInterval(() => {
  const status = clusterManager.getClusterStatus();
  console.log(
    `📊 Cluster: ${status.usedCapacity}/${status.totalCapacity} players`,
  );

  if (status.degradedServers > 0) {
    console.warn(`⚠️ ${status.degradedServers} servers degraded`);
  }
}, 30000);
```

### Interest Manager in Tick Loop

```javascript
// In gameLoopTick:
this.players.forEach((player) => {
  // Update player's interest zone
  const interests = this.interestManager.updatePlayerInterest(
    player.id,
    player.position.x,
    player.position.y,
  );

  // Only send broadcasts if time elapsed
  if (this.interestManager.shouldBroadcast(player.id)) {
    const updates = this.interestManager.filterSignificantUpdates(
      player.id,
      this.getRelevantShips(),
      this.lastBroadcast,
    );

    if (updates.size > 0) {
      player.socket.emit("worldUpdate", {
        ships: Array.from(updates.values()),
        timestamp: Date.now(),
      });
    }
  }
});
```

### Lag Compensation in Combat

```javascript
// In handleFireWeapon:
const latency = this.lagCompensator.measureLatency(data.clientTime);

// Create snapshot before processing
this.lagCompensator.createSnapshot(player.id, {
  position: player.position,
  rotation: player.rotation,
  velocity: player.velocity,
});

// Predict where player actually was
const predictedPos = this.lagCompensator.predictState(
  player.id,
  player,
  latency,
);

// Validate for cheating
const validation = this.lagCompensator.checkSuspiciousBehavior(
  player.id,
  data,
  player,
);

if (!validation.suspicious) {
  // Fire is valid, process hit
  this.handleProjectileImpact(data, predictedPos);
}
```

---

## 7. Performance Monitoring

**File:** `server/monitoring/serverMetrics.js`

```javascript
// server/monitoring/serverMetrics.js
class ServerMetrics {
  constructor(gameServer) {
    this.gameServer = gameServer;
    this.metrics = {
      startTime: Date.now(),
      tickCount: 0,
      avgTickTime: 0,
      playerCount: 0,
      projectileCount: 0,
      memoryUsage: 0,
    };
  }

  recordTick(tickTimeMs) {
    this.metrics.tickCount++;
    this.metrics.avgTickTime = (this.metrics.avgTickTime + tickTimeMs) / 2;
    this.metrics.playerCount = this.gameServer.players.size;
    this.metrics.projectileCount = this.gameServer.projectiles.size;
    this.metrics.memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
  }

  getStatus() {
    const uptime = Date.now() - this.metrics.startTime;

    return {
      uptime: `${Math.floor(uptime / 1000)}s`,
      players: this.metrics.playerCount,
      avgTickTime: `${this.metrics.avgTickTime.toFixed(1)}ms`,
      memory: `${this.metrics.memoryUsage.toFixed(1)}MB`,
      projectiles: this.metrics.projectileCount,
      cpu: `${process.cpuUsage().user / 1000}%`,
    };
  }

  log() {
    console.log("📊 Server Stats:", this.getStatus());
  }
}

// Usage
const metrics = new ServerMetrics(gameServer);

// In game loop
metrics.recordTick(tickTime);

// Every 30 seconds
setInterval(() => metrics.log(), 30000);
```

---

## 8. Deployment Checklist

### Local Development

- [ ] `npm install` all dependencies
- [ ] Start MongoDB locally
- [ ] Run `npm run server:dev`
- [ ] Run `npm run client:dev`
- [ ] Test with `window.testPhase6()` in browser

### Staging Deployment

- [ ] Setup 3 servers with load balancer
- [ ] Run Phase 6 test suite on each
- [ ] Load test with 90+ players
- [ ] Verify Interest Manager bandwidth savings
- [ ] Test Lag Compensation accuracy

### Production Deployment

- [ ] Deploy to Kubernetes cluster
- [ ] Setup auto-scaling (target 70% CPU)
- [ ] Configure monitoring & alerts
- [ ] Setup CDN for static assets
- [ ] Configure backup/failover

---

## Testing Implementation

```javascript
// test/integration.test.js
const assert = require("assert");
const { GameServer } = require("../server/gameServer.js");

describe("Phase 6 + Architecture Integration", () => {
  let server;

  before(() => {
    server = new GameServer(3001);
  });

  it("should handle player authentication", (done) => {
    // Test player authentication flow
    done();
  });

  it("should update player position", (done) => {
    // Test movement system
    done();
  });

  it("should validate weapon fire", (done) => {
    // Test combat validation
    done();
  });

  it("should apply interest manager culling", (done) => {
    // Test bandwidth optimization
    done();
  });

  it("should track lag compensation", (done) => {
    // Test prediction accuracy
    done();
  });

  it("should scale to 90+ players", (done) => {
    // Test cluster manager
    done();
  });

  after(() => {
    server.stop();
  });
});
```

---

## Next Steps

1. **Backend Implementation** - Use GameServer.js template above
2. **Database Setup** - Create MongoDB collections with provided schemas
3. **Testing** - Run integration tests to verify all systems work together
4. **Load Testing** - Verify 90+ player performance
5. **Deployment** - Follow deployment checklist

---

**Everything is now ready to implement the Full Production Stack!** 🚀
