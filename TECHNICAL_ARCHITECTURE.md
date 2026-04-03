# Technical Architecture Guide: Multiplayer Ships 3D Integration

## System Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    CLIENT TIER (Browser)                      │
├──────────────────────────────────────────────────────────────┤
│  Three.js Renderer  │ Input System │ UI Components            │
│  Water Shader       │ Network Sync │ HUD/Minimap              │
│  Particle Effects   │ Game State   │ Inventory/Upgrades       │
└──────────────────────────────────────────────────────────────┘
                              ↕ Socket.io
                           (Real-time)
┌──────────────────────────────────────────────────────────────┐
│                   APPLICATION TIER (Server)                   │
├──────────────────────────────────────────────────────────────┤
│  Game Logic        │ Physics Tick   │ Matchmaking              │
│  Combat Validation │ Spatial Hash   │ Authentication           │
│  State Management  │ Collision Det. │ Chat System              │
│  AI/Bots          │ Projectile Sim │ Event Broadcasting       │
└──────────────────────────────────────────────────────────────┘
                              ↕ REST API
                         (Async Operations)
┌──────────────────────────────────────────────────────────────┐
│                    DATA TIER (Databases)                      │
├──────────────────────────────────────────────────────────────┤
│  MongoDB           │ Redis Cache    │ Session Storage          │
│  ├─ Accounts       │ ├─ Ship Pos    │ ├─ Message Queue         │
│  ├─ Ships/Stats    │ ├─ Game State  │ └─ Transient Data        │
│  ├─ Clans/Friends  │ └─ Leaderboard│                          │
│  └─ Game Progress  │                │                          │
└──────────────────────────────────────────────────────────────┘
```

---

## Network Protocol Design

### Message Types (Socket.io Events)

#### Client → Server

```javascript
// Connection & Auth
'connect' → { username, token }
'authenticate' → { accountId, sessionToken }
'joinLobby' → { gameMode, shipType }
'joinCrew' → { shipCode }

// Ship Control
'steerShip' → { angle, acceleration }
'setSails' → { sailAngles: [...] }
'fireWeapon' → { weaponType, targetPos }
'movePlayer' → { position, rotation }

// Interaction
'boardShip' → { targetShipId }
'meleeAttack' → { direction, weaponType }
'interactStation' → { stationId }

// Social
'sendChatMessage' → { message, channel: 'team|clan|global' }
'createClan' → { clanName }
'invite' → { targetPlayerId }
```

#### Server → Client

```javascript
// World State (60Hz tick)
'worldUpdate' → {
  ships: [...],           // All nearby ships
  projectiles: [...],     // Active projectiles
  particles: [...],       // Particle effects
  worldTime: timestamp
}

// Game Events
'shipHit' → { hitShip, damage, hitPos }
'shipSunk' → { shipId, sinkerCrewId }
'playerJoined' → { playerId, crewId }
'playerLeft' → { playerId }

// Personal State
'playerUpdate' → {
  health, position, rotation,
  gold, upgrades, inventory
}

// Notifications
'chatMessage' → { from, message, channel }
'achievement' → { type, reward }
'notification' → { text, type: 'warning|info|success' }
```

### Message Rate & Bandwidth

- **Server Tick Rate**: 60 Hz (15.6ms per update)
- **Data Per Ship**: ~120 bytes per update
  - Position (12 bytes), rotation (12 bytes), velocity (12 bytes)
  - Health (2 bytes), sail angles (4 bytes), crew count (1 byte)
  - Crew member positions (variable)

- **Bandwidth Estimate** (at 30 ships on-screen):
  - 120 bytes × 30 ships × 60 updates/sec = ~216 KB/sec
  - With compression: ~54 KB/sec (typical gameplay)

### Network Optimization Strategies

```javascript
// 1. Interest Management - Only sync nearby ships
const nearbyShips = quadTree.retrieve(playerShip.position, range);

// 2. Delta Compression - Only send changed values
const delta = {
  pos: shipState.position, // Send only if moved
  rot: shipState.rotation, // Send only if rotated
  // Skip unchanged fields
};

// 3. Quantization - Reduce float precision
const compressedPos = {
  x: Math.round(pos.x / 0.1) * 0.1, // 0.1 unit precision
  y: Math.round(pos.y / 0.1) * 0.1,
};
```

---

## Server Architecture Components

### 1. Game Server (gameServer.js)

```javascript
// Pseudo-code structure
class GameServer {
  constructor() {
    this.io = new SocketIO(server);
    this.gameLoops = new Map(); // One per match/server
    this.players = new Map();
    this.ships = new Map();
    this.crews = new Map();

    this.setupEventHandlers();
  }

  startGameLoop(matchId) {
    let lastTime = Date.now();
    setInterval(() => {
      const now = Date.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      // Physics & AI updates
      this.updatePhysics(delta);
      this.updateAI(delta);
      this.detectCollisions();

      // Broadcast state to all players in match
      this.broadcastWorldState();
    }, 1000 / 60); // 60 Hz
  }

  updatePhysics(delta) {
    // Update all ships based on wind, sails, steering input
    // Update all projectiles with gravity
    // Calculate damage from hits
  }

  detectCollisions() {
    // Spatial hash for efficient collision detection
    // Check ship-to-ship collisions
    // Check projectile-to-ship impacts
  }
}
```

### 2. Spatial Partitioning (spatial.js)

For 90+ players efficiently:

```javascript
class QuadTree {
  constructor(bounds, maxObjects = 4, maxLevels = 8) {
    this.bounds = bounds;
    this.maxObjects = maxObjects;
    this.maxLevels = maxLevels;
    this.objects = [];
    this.nodes = [];
    this.level = 0;
  }

  retrieve(point, range) {
    // Return all objects within range of point
    // Optimized for checking nearby ships
    const returnObjects = [];
    this._retrieve(returnObjects, point, range);
    return returnObjects;
  }

  _retrieve(returnObjects, point, range) {
    // Recursive search through quadtree
    // Only check nodes within range
  }
}

// Usage in game loop:
const nearbyShips = quadTree.retrieve(playerPos, 1000); // 1km range
nearbyShips.forEach((ship) => broadcastUpdate(ship));
```

### 3. Combat Validation (combat.js)

Server-authoritative to prevent cheating:

```javascript
class CombatValidator {
  validateCannonFire(fireCommand) {
    // Verify:
    // 1. Ship has cannon at given rotation
    // 2. Cannon is loaded/ready
    // 3. Crew member is authorized
    // 4. Sufficient time elapsed since last shot
    // 5. Physics-based trajectory calculation

    const trajectory = this.calculateTrajectory(
      fireCommand.position,
      fireCommand.rotation,
      fireCommand.shipVelocity,
      fireCommand.windVector,
    );

    // Simulate projectile path server-side
    const hit = this.detectProjectileImpact(trajectory);

    if (hit) {
      // Apply damage
      this.applyDamage(hit.ship, hit.position, hit.damage);

      // Broadcast hit event to all players
      this.broadcastCombatEvent("shipHit", {
        shooter: fireCommand.shipId,
        target: hit.ship.id,
        damage: hit.damage,
        position: hit.position,
      });
    }
  }

  calculateTrajectory(startPos, angle, shipVel, wind) {
    // Physics-based calculation
    // Account for:
    // - Cannon muzzle velocity (2D)
    // - Ship velocity inheritance
    // - Wind resistance
    // - Gravity
    // Return impact position when projectile hits water level
  }
}
```

### 4. Database Schema (MongoDB)

```javascript
// Accounts Collection
{
  _id: ObjectId,
  username: String,
  email: String,
  passwordHash: String,
  createdAt: Date,
  lastLogin: Date,

  // Account stats
  totalGold: Number,
  level: Number,
  totalKills: Number,
  totalDamage: Number,

  // Owned ships
  ownedShips: [
    { type: ObjectId, ref: 'Ships' }
  ],

  // Social
  clanId: ObjectId,
  friends: [ObjectId],
  blockedPlayers: [ObjectId]
}

// Ships Collection
{
  _id: ObjectId,
  accountId: ObjectId,
  shipType: String, // 'sloop', 'frigate', 'warship'
  name: String,

  // Stats
  maxHealth: Number,
  maxSpeed: Number,
  cannonDamage: Number,
  armor: Number,

  // Upgrades (1-5 tiers each)
  cannonsUpgrade: Number,
  speedUpgrade: Number,
  armorUpgrade: Number,

  wins: Number,
  losses: Number,
  sinkCount: Number
}

// Clans Collection
{
  _id: ObjectId,
  name: String,
  leader: ObjectId,
  members: [ObjectId],
  createdAt: Date,
  tagColor: String,

  stats: {
    totalKills: Number,
    totalDamage: Number,
    wins: Number
  }
}

// Match History Collection
{
  _id: ObjectId,
  matchId: String,
  mode: String, // 'teamflags', 'trading', 'ffa'
  startTime: Date,
  endTime: Date,

  players: [
    {
      accountId: ObjectId,
      crew: ObjectId,
      gold: Number,
      damage: Number,
      kills: Number,
      deaths: Number,
      finalPos: [x, y]
    }
  ],

  winnerCrew: ObjectId
}
```

---

## Client-Side Architecture

### State Management Pattern

```javascript
// File: src/core/networkState.js
class GameState {
  constructor() {
    // Local player
    this.player = null;
    this.crew = null;
    this.ship = null;

    // World state
    this.ships = new Map(); // shipId → ShipState
    this.projectiles = new Map();
    this.particles = [];

    // UI state
    this.inventory = {};
    this.upgrades = {};
    this.gold = 0;

    // Network
    this.socket = null;
    this.lastUpdateTime = 0;
  }

  updateShipState(shipData) {
    // Uses delta to only update changed fields
    if (!this.ships.has(shipData.id)) {
      this.ships.set(shipData.id, {});
    }

    const ship = this.ships.get(shipData.id);
    Object.assign(ship, shipData);
  }

  // Called 60 times per second from render loop
  interpolateState(alpha) {
    // Smooth movement between discrete network updates
    this.ships.forEach((ship) => {
      ship.displayPos = interpolate(ship.prevPos, ship.currentPos, alpha);
    });
  }
}
```

### Prediction for Responsiveness

```javascript
// File: src/systems/prediction.js
class ClientPrediction {
  constructor(ship) {
    this.ship = ship;
    this.serverState = null;
  }

  predictMovement(delta) {
    // Local prediction of ship movement
    // Based on current steering input and wind

    this.ship.velocity = this.calculateVelocity(
      this.ship.sailAngles,
      this.ship.windVector,
      this.ship.heading,
    );

    this.ship.position.add(this.ship.velocity.clone().multiplyScalar(delta));
  }

  receiveServerUpdate(serverState) {
    // Reconcile with server-authoritative state
    // Check if prediction was accurate
    const error = this.ship.position.distanceTo(serverState.position);

    if (error > ACCEPTABLE_PREDICTION_ERROR) {
      // Snap back toward server state gradually
      this.ship.position.lerp(serverState.position, 0.1);
    }
  }
}
```

---

## Performance Targets

### Client-Side

- **Target FPS**: 60 FPS on mid-range hardware
- **Memory**: <200 MB for typical match
- **Network Latency Tolerance**: Up to 200ms
- **Concurrent Ships Rendered**: 30-50 with full effects

### Server-Side

- **Concurrent Players**: 90+ per server
- **Tick Rate**: 60 Hz game loop
- **Update Latency**: <50 ms server processing
- **Database Response**: <10 ms queries
- **Bandwidth Per Player**: ~50 KB/sec average

### Optimization Checkpoints

```javascript
// Monitor performance
class PerformanceMonitor {
  checkFrameTime() {
    if (frameTime > 16.7ms) {
      // Reduce effect particles
      // Lower water resolution
      // Reduce LOD threshold
      this.reducedQualityMode = true;
    }
  }

  checkNetworkLatency() {
    if (latency > 200ms) {
      // Increase client-side prediction
      // More aggressive interpolation
      // Larger interest bubble
    }
  }

  checkMemoryUsage() {
    if (memory > 180MB) {
      // Unload distant ship models
      // Reduce particle system pool
      // Clear old chat messages
    }
  }
}
```

---

## Deployment Strategy

### Development Environment

```bash
# Local dev stack
npm install
npm run server:dev    # Nodemon with auto-reload
npm run client:dev    # Vite dev server
npm run db:local      # Local MongoDB
# Tests run continuously with jest --watch
```

### Staging Environment

```
3 dedicated servers (load balanced)
├── Server 1: Game Logic
├── Server 2: Game Logic (hot standby)
└── Server 3: Database + Redis
```

### Production Deployment (AWS)

```
Kubernetes Cluster (ECS)
├── API Gateway (ALB)
├── Game Servers (auto-scaling)
│   ├── EC2 t3.large (4 per zone)
│   └── Managed auto-scaling (CPU 70% target)
├── Data Layer (RDS)
│   ├── MongoDB Atlas (M30 cluster)
│   └── ElastiCache Redis (cache.r6g.large)
└── CDN (CloudFront)
    └── Static assets + WebRTC relay servers
```

### Container Deployment (Docker)

```dockerfile
# Dockerfile for game server
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server/gameServer.js"]
```

```bash
# Docker Compose for local multi-server testing
docker-compose up -d
# Starts: Game Server 1, Game Server 2, MongoDB, Redis, Nginx Load Balancer
```

---

## Anti-Cheat & Security

### Server-Side Validation

- ✅ Combat calculations done **only** on server
- ✅ Projectile impact validation server-authoritative
- ✅ Damage calculations verified server-side
- ✅ Position updates checked for impossible speeds
- ✅ Rate-limiting on weapon fire (cooldown validation)

### Rate Limiting

```javascript
class RateLimiter {
  // 10 cannon shots per second max (0.1s cooldown)
  validateCannonFire() {
    if (Date.now() - lastFireTime < 100) {
      return false; // Reject rate-limited shot
    }
  }

  // 50 chat messages per minute
  validateChatMessage() {
    const recentMessages = this.getLastMinute();
    if (recentMessages.length > 50) {
      return false; // Spam protection
    }
  }
}
```

### Input Validation

```javascript
// Never trust client input
function validateSteeringInput(input) {
  // Clamp to reasonable values
  const angle = Math.max(-Math.PI, Math.min(Math.PI, input.angle));
  const acceleration = Math.max(0, Math.min(1, input.acceleration));

  // Check for unrealistic changes (indicates speedhacking)
  if (Math.abs(angle - lastValidAngle) > MAX_TURN_RATE * DELTA_TIME) {
    logSuspiciousActivity(playerId, "impossible_turn_rate");
    return null;
  }

  return { angle, acceleration };
}
```

---

## Monitoring & Debugging

### Server Monitoring

```javascript
// Real-time metrics
{
  uptime: '72d 14h',
  players: { connected: 847, inMatch: 623 },
  matches: { active: 18, queue: 4 },
  servers: {
    cpu: '45%',
    memory: '62%',
    networkIO: '12 MB/s'
  },
  database: {
    queries: '2400/sec',
    avgLatency: '8ms',
    connections: '450'
  }
}
```

### Client-Side Debugging

```javascript
// Enable with: localStorage.setItem('debug', 'true')
if (localStorage.getItem("debug")) {
  // Show network latency
  // Display server position vs client position
  // Show spatial partitioning vis
  // Log all socket messages
  // Render physics bodies
}
```

---

This architecture provides the foundation for a scalable, robust multiplayer naval combat game. Start with Phase 1 systems and scale incrementally. 🚢⚓
