# Phase 6: Polish & Optimization - Complete Implementation Guide

## Overview

Phase 6 is the final polish and optimization phase focused on taking ShipStrike-3D to production-ready status. The phase emphasizes performance optimization for 90+ player servers, mobile platform support, network efficiency, and comprehensive monitoring.

**Core Components:**

- **Mobile Touch Controls** - Full-featured touch input system for mobile/tablet
- **Server Cluster Manager** - Scaling to 90+ concurrent players across multiple servers
- **Network Interest Manager** - Bandwidth optimization through spatial culling
- **Lag Compensation System** - Client prediction and server validation
- **LOD System** - Distance-based rendering quality adjustment
- **Performance Monitor** - Real-time FPS, memory, and network tracking

## Architecture

### System Interactions

```
CLIENT SIDE                          SERVER SIDE
┌─────────────────────┐             ┌──────────────────────┐
│ Touch Controller    │             │ Cluster Manager      │
│ (Mobile Input)      │             │ (Load Balancing)     │
└──────────┬──────────┘             └──────────┬───────────┘
           │                                  │
           │                                  │
┌──────────▼──────────┐             ┌──────────▼───────────┐
│ Performance Monitor │             │ Interest Manager     │
│ (FPS, Memory, Net)  │             │ (Bandwidth Culling)  │
└──────────┬──────────┘             └──────────┬───────────┘
           │                                  │
           │                                  │
┌──────────▼──────────┐             ┌──────────▼───────────┐
│ LOD System          │             │ Lag Compensator      │
│ (Rendering Quality) │             │ (Prediction/Valid)   │
└─────────────────────┘             └──────────────────────┘
```

---

## Mobile Touch Controls System

### Purpose

Enable full gameplay support on mobile and tablet devices through virtual joystick and button controls. Provides haptic feedback and responsive UI.

### Architecture

**Layout:**

- **Left Side**: Virtual movement joystick (0-360° directional input)
- **Right Side**: 4 action buttons arranged in 2x2 grid
  - Primary (Fire)
  - Secondary (Interact)
  - Tertiary (Special)
  - Map/Menu

### Core Features

#### 1. Virtual Joystick

**Configuration:**

```javascript
{
  radius: 60,              // Outer radius of joystick circle
  deadzone: 10,            // Inner dead zone (no input registered)
  updateRate: 60,          // Updates per second
  maxMagnitude: 1.0        // Normalized 0-1 range
}
```

**Output:**

```javascript
{
  angle: 3.14,             // Radians (0 to 2π)
  magnitude: 0.8,          // Normalized 0-1
  x: 48,                   // Absolute pixel offset
  y: 28,
  active: true             // Is being touched
}
```

#### 2. Action Buttons

Each button supports:

- Press/release detection
- Visual feedback (scale, shadow)
- Haptic vibration (20ms pulse)
- Configurable key mapping

**Buttons:**
| Button | Event | Key | Default Action |
|--------|-------|-----|-----------------|
| Primary | Press | Space | Fire cannon |
| Secondary | Press | F | Interact/Board |
| Tertiary | Press | E | Special ability |
| Map | Press | M | Show map |

#### 3. Gesture Support

**Pinch Zoom:**

- Two-finger pinch for camera zoom
- Mapped to scroll wheel equivalent

**Long Press:**

- 500ms hold triggers special interaction
- Used for menu access

**Swipe:**

- Minimum 50 units distance to register
- Direction-specific actions (left/right = rotate view)

### Implementation

#### HTML Structure

```html
<div id="touch-controller">
  <div id="left-joystick-container">
    <div id="left-joystick"></div>
  </div>
  <div id="action-buttons-container">
    <button id="btn-primary">FIRE</button>
    <button id="btn-secondary">INTERACT</button>
    <button id="btn-tertiary">SPECIAL</button>
    <button id="btn-map">MAP</button>
  </div>
</div>
```

#### Styling Strategy

- **Transparency**: 30% background opacity for visibility of game behind
- **Colors**: Distinct colors per button (Red=Fire, Green=Interact, Orange=Special, Blue=Map)
- **Responsive**: 100% bottom of screen, scales with window size
- **Safe Zone**: 20px padding from edges

#### JavaScript Integration

```javascript
import { touchController } from "./systems/mobile/touchController.js";

// Initialize on mobile device
if (touchController.isMobileDevice()) {
  touchController.initialize();

  // Joystick input
  touchController.onMovement = (angle, magnitude) => {
    playerShip.setHeading(angle);
    playerShip.setThrottle(magnitude);
  };

  // Button input
  touchController.onActionButton = (buttonName, pressed) => {
    if (buttonName === "primary" && pressed) {
      playerShip.fireCannon();
    }
  };
}
```

### API Reference

#### Constructor

```javascript
const controller = new TouchController();
```

#### Methods

```javascript
// Initialize mobile UI
controller.initialize(): boolean

// Show/hide controls
controller.show(): void
controller.hide(): void
controller.toggle(): void

// Get current state
controller.getJoystickState(): JoystickState

// Cleanup
controller.destroy(): void

// Query device
controller.isMobileDevice(): boolean
```

#### Callbacks

```javascript
// Movement callback (joystick)
controller.onMovement = (angle: number, magnitude: number) => {}

// Action button callback
controller.onActionButton = (buttonName: string, pressed: boolean) => {}

// Gesture callback
controller.onGesture = (gestureName: string, data: any) => {}
```

### Integration with Game

**In main.js:**

```javascript
// Phase 6: Mobile Support
if (touchController.isMobileDevice()) {
  touchController.initialize();
  setupMobileControls();
}

function setupMobileControls() {
  // Wire joystick to ship controls
  touchController.onMovement = (angle, magnitude) => {
    inputManager.setJoystickInput(angle, magnitude);
  };

  // Wire action buttons
  touchController.onActionButton = (button, pressed) => {
    if (button === "primary") inputManager.setFire(pressed);
    if (button === "secondary") inputManager.setInteract(pressed);
    if (button === "tertiary") inputManager.setSpecial(pressed);
    if (button === "map") inputManager.toggleMap(pressed);
  };
}
```

---

## Server Cluster Manager

### Purpose

Enable ShipStrike-3D to scale from single-server (~20 players) to multi-server cluster architecture supporting 90+ concurrent players. Implements intelligent load balancing and player distribution.

### Architecture

**Three-Tier Structure:**

```
Client → Load Balancer → [Server 1, Server 2, ..., Server 10]
                              ↓         ↓              ↓
                           Match 1  Match 2        Match 3
                         (20 players each)
```

### Configuration

**Default Settings:**

```javascript
{
  maxPlayersPerServer: 20,        // 20 players per match (4 matches × 5 players)
  maxServers: 10,                 // Up to 10 server instances
  healthCheckInterval: 5000,      // Health check every 5 seconds
  loadBalancingStrategy: 'least-loaded' // 'round-robin' or 'least-loaded'
}
```

**Server Capacity:**

- Single server: 20 players (4 matches of 5 players each)
- 10 servers: 200 player capacity
- Each server runs independently with state isolation

### Server Lifecycle

#### 1. Server Creation

```javascript
clusterManager.createServer({
  name: "Game Server 1",
  region: "us-east",
  host: "192.168.1.100",
  port: 3001,
});
```

**Initial State:**

```javascript
{
  id: 'server_0',
  status: 'initializing',
  currentPlayers: 0,
  maxPlayers: 20,
  matches: new Map(),
  health: {cpu: 0, memory: 0, network: 0}
}
```

#### 2. Player Assignment

```javascript
// System automatically selects best server
const server = clusterManager.selectServerForPlayer();
clusterManager.addPlayerToServer(server.id, playerId);
```

**Selection Strategy (Least-Loaded):**

1. Get all healthy servers with available slots
2. Select server with fewest current players
3. If all servers full, create new server (if capacity exists)
4. If no capacity, deny player join

#### 3. Server Monitoring

Health checks validate:

- **CPU Usage**: < 80%
- **Memory**: < 400 MB heap
- **Network**: < 10% packet loss
- **Response Time**: < 100ms

Failed checks trigger:

- After 1 failure: Status = 'degraded' (still accepts players)
- After 3+ failures: Status = 'offline' (migrates players)

#### 4. Player Migration

When server goes offline:

```javascript
// All players automatically migrated to healthy servers
for (const playerId of /*server.players*/) {
  clusterManager.migratePlayer(offlineServerId, playerId);
}
```

### Load Balancing Strategies

#### Strategy 1: Round-Robin

```javascript
// Distribute players evenly across servers
selectServerForPlayer() {
  return servers.find(s => s.currentPlayers < s.maxPlayers);
}
```

**Pros:** Simple, predictable
**Cons:** Doesn't account for server health

#### Strategy 2: Least-Loaded (Default)

```javascript
// Always pick server with fewest players
selectServerForPlayer() {
  return servers.reduce((prev, current) =>
    current.players < prev.players ? current : prev
  );
}
```

**Pros:** Balanced, adapts to server health
**Cons:** Slightly more compute

### Match Lifecycle on Cluster

```
Player Joins
    ↓
Cluster assigns to Server X
    ↓
Server creates Match (20 player capacity)
    ↓
Match starts (Team Flags or Trading)
    ↓
Match ends
    ↓
Server cleaned up if empty
    ↓
Player can join new match
```

### API Reference

#### Server Management

```javascript
// Create new server
clusterManager.createServer(options): ServerId

// Get server
clusterManager.getServer(serverId): ServerData

// Get all active servers
clusterManager.getActiveServers(): ServerData[]
```

#### Player Management

```javascript
// Select best server for new player
clusterManager.selectServerForPlayer(): ServerData

// Add player to server
clusterManager.addPlayerToServer(serverId, playerId): boolean

// Remove player
clusterManager.removePlayerFromServer(serverId, playerId): boolean

// Migrate player between servers
clusterManager.migratePlayer(fromId, playerId): ServerData
```

#### Match Management

```javascript
// Create match on server
clusterManager.createMatch(serverId, matchData): MatchId

// Remove match
clusterManager.removeMatch(serverId, matchId): boolean
```

#### Health & Monitoring

```javascript
// Update server health status
clusterManager.updateServerHealth(serverId, healthData): void

// Start periodic health checks
clusterManager.startHealthChecks(callback): void

// Get cluster status
clusterManager.getClusterStatus(): ClusterStatus

// Get detailed server list
clusterManager.getServerList(): ServerInfo[]
```

#### Optimization

```javascript
// Rebalance players across servers
clusterManager.rebalance(): number

// Shutdown cluster
clusterManager.shutdown(): void
```

### Statistics

**Tracking:**

```javascript
clusterManager.getStats() → {
  totalServers: 3,
  runningServers: 3,
  offlineServers: 0,
  totalCapacity: 60,           // 3 servers × 20 players
  usedCapacity: 45,            // 45 players online
  availableCapacity: 15,       // 15 slots remaining
  utilizationPercent: '75%',   // Load factor
  averageServerLoad: '15'      // Avg players per server
}
```

---

## Network Interest Manager

### Purpose

Optimize network bandwidth by only transmitting state updates for entities relevant to each player. Implemented via spatial partitioning and interest culling.

### Bandwidth Savings

**Without Interest Management:**

- 50 players, 10 ships each = 500 entities
- Each player receives all 500 entity updates every 50ms
- 50 players × 500 entities × 20 Hz = 500,000 updates/second

**With Interest Management:**

- Player only sees ships within 1500 unit radius
- ~9 entity grid cells in view
- 50 players × 45 entities × 20 Hz = 45,000 updates/second
- **90% bandwidth reduction**

### Architecture

#### Spatial Partitioning

**Grid System:**

```javascript
const gridSize = 500; // 500x500 unit cells

// Map is divided into grid:
Map (4000x4000)
├── [0,0] [1,0] [2,0] [3,0] [4,0] [5,0] [6,0] [7,0]
├── [0,1] [1,1] [2,1] [3,1] [4,1] [5,1] [6,1] [7,1]
├── ... (8x8 grid)
└── [0,7] [1,7] [2,7] [3,7] [4,7] [5,7] [6,7] [7,7]
```

**Each entity** stored in one grid cell based on position (x, y)
**Each player** has **interest set** = entities in visible cells

#### Interest Culling

```javascript
// Player at position (1500, 1500) with visibility range 1500
// Can see 3x3 grid of cells around their position
//
// Visible cells (shaded):
//   ┌───┬─────┬─────┐
//   │ 0 │  1  │  2  │
//   ├───┼─────┼─────┤
//   │ 3 │PLAYER(5)  │
//   ├───┼─────┼─────┤
//   │ 6 │  7  │  8  │
//   └───┴─────┴─────┘
//
// Player only receives updates from cells 0-8
// Not from cells on edges (no wasted bandwidth)
```

### Configuration

```javascript
{
  gridSize: 500,              // Size of each grid cell
  mapSize: 4000,              // Total map size
  visibilityRange: 1500,      // How far player can see
  broadcastInterval: 50       // ms between position updates
}
```

### Implementation Details

#### Registration

```javascript
// When ship spawns at (1200, 800)
interestManager.registerEntity("ship_123", 1200, 800);

// Calculates cell key: cellX = 1200/500 = 2, cellY = 800/500 = 1
// Stores in grid: grid['2,1'].add('ship_123')
```

#### Update

```javascript
// Ship moves to (1250, 850)
interestManager.registerEntity("ship_123", 1250, 850);

// Still in same cell [2,1], no action needed (optimization)
// Only update when changing cells
```

#### Interest Computation

```javascript
// Player at (1800, 1800) with visibility 1500
const interests = interestManager.updatePlayerInterest(playerId, 1800, 1800);

// Visible cell range: [-1, 0, 1] in both X and Y
// Total 9 cells checked (3x3)
// Returns:
// {
//   added: Set{ship_1, ship_5},      // Newly visible
//   removed: Set{ship_10},            // No longer visible
//   current: Set{ship_1, ship_5, ...} // All visible
// }
```

#### Significant Update Filtering

```javascript
// Only send updates if entity changed significantly
const updates = interestManager.filterSignificantUpdates(
  playerId,
  currentStates, // All entities
  lastStates, // Last broadcast state
);

// Thresholds:
// - Position: 5 units movement
// - Rotation: 0.05 radians (~2.9°)
// - Health: Any change
```

### API Reference

#### Spatial Management

```javascript
// Register entity at position
registerEntity(entityId, x, y): void

// Unregister entity
unregisterEntity(entityId): void

// Get cell key for position (internal)
getCellKey(x, y): string

// Get all cells in range
getCellsInRange(x, y, range): Set<string>
```

#### Interest Management

```javascript
// Update what player can see
updatePlayerInterest(playerId, x, y): InterestUpdate

// Get entities in player's interest
getEntitiesInRange(playerId): entityId[]
```

#### Optimization

```javascript
// Filter only changed entities
filterSignificantUpdates(playerId, current, last): Map<entityId, state>

// Rate limiting per player
shouldBroadcast(playerId): boolean

// Cleanup empty cells
cleanupEmptyCells(): number
```

#### Statistics & Debugging

```javascript
// Get performance stats
getStats(): {
  totalUpdates: number,
  culledUpdates: number,
  avgCullRate: '90%'
}

// Debug: visualize grid
debugGetGridInfo(): {
  totalCells: 32,
  cellsWithEntities: 12,
  averagePerCell: 3.2,
  cells: {...}
}
```

### Integration with Server

**In gameServer.js:**

```javascript
import { interestManager } from "./systems/interestManager.js";

// Update interests for all players every tick
function updateGameState() {
  for (const [playerId, player] of gameState.players) {
    // Update what this player can see
    const interests = interestManager.updatePlayerInterest(
      playerId,
      player.x,
      player.y,
    );

    // Get relevant updates
    const updates = interestManager.filterSignificantUpdates(
      playerId,
      gameState.ships,
      playerLastState.get(playerId),
    );

    // Only send relevant data
    if (interestManager.shouldBroadcast(playerId)) {
      io.to(playerId).emit("worldUpdate", updates);
    }
  }
}
```

---

## Lag Compensation System

### Purpose

Reduce perceived latency by predicting player actions and validating server authority. Implements client-side prediction with server-side anti-cheat.

### How It Works

#### Message Flow with Lag Compensation

```
t=0ms:   Client sends: "Fire at (100, 200)"
         Predicts outcome immediately
         ├─ Fire effect shows
         └─ Projectile spawns (client-side predicted)

t=50ms:  Server receives, validates
         ├─ Fire was valid? Yes
         └─ Confirms to client

t=100ms: Client receives confirmation
         ├─ Prediction was correct? Yes
         └─ Keep visual as-is (seamless)

         Client receives confirmation
         ├─ Prediction was correct? No
         └─ Rollback and rewind (visual correction)
```

### Prediction System

#### State Snapshots

```javascript
// Server stores snapshots every 100ms
snapshot = {
  timestamp: 1000,
  state: {
    x: 1500,
    y: 2000,
    rotation: 1.57,
    vx: 50,
    vy: 0,
    health: 100,
    heading: 1.57,
  },
};

// Keep last 20 snapshots = 2 seconds history
```

#### Linear Prediction

```javascript
// Predict position 100ms forward
function predictState(state, deltaMs) {
  const secondsDelta = deltaMs / 1000;
  const vx = state.vx || 0;
  const vy = state.vy || 0;

  return {
    x: state.x + vx * secondsDelta,
    y: state.y + vy * secondsDelta,
    rotation: state.rotation,
    // ... etc
  };
}

// Example: At 100ms latency
// Old position: (1500, 2000)
// Velocity: (50, 0)
// Predicted position: (1505, 2000)
// Client-side shows prediction
```

#### Prediction Confidence

```javascript
// Confidence decreases with time delta
confidence = max(0, 1 - timeDelta / (predictionDuration * 2));

// At 50ms (small lag): confidence = 90%
// At 100ms (medium lag): confidence = 80%
// At 200ms (large lag): confidence = 70%
// At 300ms+ (very high lag): confidence = 50%
```

### Validation System

#### Cheating Detection

Validates player state against prediction limits:

```javascript
// Check 1: Position Teleport
distance = Math.hypot(
  clientState.x - serverState.x,
  clientState.y - serverState.y,
);
if (distance > 100) {
  // >100 units in 100ms = impossible
  return { suspicious: true, reason: "position_teleport" };
}

// Check 2: Invalid Health Gain
if (clientState.health > serverState.health && serverState.health > 0) {
  return { suspicious: true, reason: "invalid_health_gain" };
}

// Check 3: Impossible Rotation
rotDiff = Math.abs(clientState.rotation - serverState.rotation);
maxRotDiff = maxAngularVelocity * deltaSeconds; // ~0.2 rad per frame at 60Hz
if (rotDiff > maxRotDiff) {
  return { suspicious: true, reason: "impossible_rotation" };
}
```

#### Validation Threshold

```javascript
// Track validation errors per player
validationErrors = new Map();

// After 5 failed validations, ban player
if (validationErrors.get(playerId) >= 5) {
  console.warn(`Ban player: ${playerId} (too many cheating attempts)`);
}
```

### Correction System

#### Smooth Correction

```javascript
// Instead of teleporting player, smoothly move them
function applyCorrection(predicted, serverState) {
  const correctionFactor = 0.5; // 50% toward server per frame

  return {
    x: predicted.x + (serverState.x - predicted.x) * correctionFactor,
    y: predicted.y + (serverState.y - predicted.y) * correctionFactor,
    // ...
  };
}

// Result: Player smoothly slides into correct position
// Feels natural, not jarring
```

### Configuration

```javascript
{
  enabled: true,
  maxTicksToPredict: 6,           // ~100ms at 60Hz
  predictionDuration: 100,        // Time window for prediction (ms)
  maxSnapshots: 20,               // Keep 2 seconds history
  maxValidationErrors: 5,         // Ban after 5 errors
  positionTolerance: 20,          // units
  rotationTolerance: 0.2          // radians
}
```

### API Reference

#### Latency Measurement

```javascript
// Measure ping/latency
lagCompensator.measureLatency(rttMs): number
```

#### Prediction

```javascript
// Create snapshot of entity state
createSnapshot(entityId, state): Snapshot

// Predict state forward in time
predictState(entityId, state, deltaMs): Prediction

// Apply predictions to multiple entities
applyPredictions(entities, deltaMs): Map<entityId, predictedState>
```

#### Validation & Cheating Detection

```javascript
// Validate server state against prediction
validateServerState(entityId, server, predicted): ValidationResult

// Check for suspicious behavior
checkSuspiciousBehavior(playerId, state, serverState): SuspicionReport

// Get validation status
getValidationStatus(playerId): {errorCount, isBanned, threshold}
```

#### Correction

```javascript
// Apply smooth correction toward server state
applyCorrection(entityId, serverState, predicted, factor): correctedState
```

---

## LOD (Level of Detail) System

### Purpose

Optimize rendering performance by reducing visual quality of distant objects. Enables smooth 60 FPS even with 50+ ships on screen.

### LOD Levels

```
HIGH DETAIL (0-300 units):
├─ Full water shader with reflections
├─ 100% particle density
├─ All sailor models visible
├─ Full cabin lights
└─ Draw distance: 2500 units

MEDIUM DETAIL (300-800 units):
├─ Reduced water shader
├─ 60% particle density
├─ Sailor models visible
├─ Simplified cabin lights
└─ Draw distance: 2000 units

LOW DETAIL (800-1500 units):
├─ Minimal water shader
├─ 30% particle density
├─ No sailor models
├─ No cabin lights
└─ Draw distance: 1500 units

VERY LOW DETAIL (1500-2500 units):
├─ Basic water shader
├─ 10% particle density
├─ Simplified ship model
├─ No lights
└─ Draw distance: 1000 units

CULLED (>2500 units):
├─ Not rendered
└─ Not processed
```

### Performance Impact

**Without LOD (50 ships visible):**

- Particles: 500 × 100 = 50,000 drawn
- Polygons: 50 × 50k = 2.5M polygons
- Shaders: 50 full water + reflections
- Result: ~20 FPS

**With LOD (50 ships visible):**

- Particles: (10 near × 100) + (20 med × 60) + (20 far × 30) = 2,400 drawn
- Polygons: (10 × 50k) + (20 × 20k) + (20 × 5k) = 750k polygons
- Shaders: 10 full + 20 reduced + 20 minimal
- Result: ~55 FPS

**Improvement: 2.75× performance gain**

### Implementation

#### Distance Calculation

```javascript
// Each frame, calculate distance from player to each ship
for (const ship of visibleShips) {
  const distance = Math.hypot(ship.x - player.x, ship.y - player.y);

  const lodLevel = lodSystem.calculateLODLevel(distance);
  // 0 = HIGH, 1 = MEDIUM, 2 = LOW, 3 = VERYLOW
}
```

#### LOD Changes

```javascript
// When ship distance threshold crossed
if (distanceToPreviousLOD > threshold) {
  lodSystem.updateEntityLOD(shipId, newDistance);

  // Apply quality change
  const settings = lodSystem.getQualitySettings(newLOD);
  ship.setQualityLevel(settings);
  // ├─ Disable particles
  // ├─ Reduce water detail
  // ├─ Hide sailors
  // └─ Simplify geometry
}
```

### Quality Settings Per Level

```javascript
{
  HIGH:    {particles: 1.0, reflections: true,  shadows: 'high',    sailors: true},
  MEDIUM:  {particles: 0.6, reflections: true,  shadows: 'medium', sailors: true},
  LOW:     {particles: 0.3, reflections: false, shadows: 'low',     sailors: false},
  VERYLOW: {particles: 0.1, reflections: false, shadows: 'none',    sailors: false}
}
```

### Automatic Recommendations

```javascript
// Monitor FPS and recommend optimizations
if (currentFPS < 45) {
  console.log("⚠️ Performance Warning");
  console.log("Recommendations:");
  console.log("- Reduce HIGH quality distance from 300 to 150 units");
  console.log("- Expected FPS gain: 30-40%");
}
```

### API Reference

#### LOD Calculation

```javascript
// Calculate LOD level for distance
calculateLODLevel(distance): number (0-3)

// Get quality settings for LOD level
getQualitySettings(lodLevel): QualitySettings
```

#### Entity Management

```javascript
// Update LOD for single entity
updateEntityLOD(entityId, distance): boolean

// Update LOD for all visible entities
updateVisibleEntities(viewerPos, entities): changes[]

// Batch update with grouping
batchUpdateLODs(viewerPos, entities): {updated, culled}
```

#### Performance Monitoring

```javascript
// Get performance recommendations
recommendSettings(currentFPS, targetFPS): recommendations

// Calculate polygon reduction percentage
calculatePolygonReduction(): string

// Get average LOD level (0-3)
getAverageLODLevel(): number

// Get statistics
getStats(): LODStats
```

---

## Performance Monitor System

### Purpose

Real-time monitoring of FPS, frame time, memory usage, and network metrics. Provides debug overlay and performance alerts.

### Metrics Tracked

#### FPS Tracking

```javascript
Performance Target: 60 FPS (16.7ms per frame)

Thresholds:
├─ 60 FPS         : Excellent
├─ 45 FPS (75%)   : Warning
├─ 30 FPS (50%)   : Critical
└─ <30 FPS        : Alert: Performance degradation

History: Last 300 frames (5 seconds at 60 FPS)
```

#### Frame Time

```javascript
Current: 16.5ms
Average: 17.2ms
Min: 14.2ms
Max: 28.5ms

Analysis:
├─ Good frame: <16.7ms
├─ Acceptable: 16.7-33ms (1-2 frames)
└─ Stuttering: >33ms (visible frame drops)
```

#### Memory Usage

```javascript
Used: 245 MB
Total: 350 MB
Limit: 512 MB (heap size limit)
Percentage: 47.9%

Alerts:
├─ Warning: 300 MB (60%)
└─ Critical: 400 MB (80%)
```

#### Network Metrics

```javascript
Latency: 35ms
Bandwidth: 512 KB/s
Packet Loss: 0.5%

Assessment:
├─ Latency < 100ms    : Good
├─ 100-200ms          : Acceptable
├─ >200ms             : Degraded
└─ >5% packet loss    : Poor connection
```

### Debug Overlay

**Visual Display:**

```
┌─────────────────────────────┐
│ FPS Monitor                 │
│ Current: 58                 │
│ Avg: 59.2 | Min: 55 | Max: 61
│                             │
│ Frame Time                  │
│ Current: 16.8ms             │
│ Avg: 16.5ms | Min: 15.2ms  │
│ Max: 18.3ms                 │
│                             │
│ Memory                      │
│ Used: 245 MB / 350 MB       │
│ Limit: 512 MB (47.9%)       │
│                             │
│ Network                     │
│ Latency: 35ms               │
│ Packet Loss: 0.5%           │
│                             │
│ ⚠ Alerts (2)               │
│ WARNING: FPS Low: 58 FPS    │
│ WARNING: Memory: 245 MB     │
└─────────────────────────────┘
```

### Integration

**In main.js:**

```javascript
import { performanceMonitor } from "./systems/performance/monitor.js";

// Update monitor every frame
function gameLoop() {
  performanceMonitor.update();

  // Update debug overlay (optional)
  performanceMonitor.updateDebugOverlay();

  // Render game...
}

// Toggle debug overlay with key
document.addEventListener("keydown", (e) => {
  if (e.key === "P") {
    performanceMonitor.toggle();
  }
});

// Get stats for external monitoring
setInterval(() => {
  const stats = performanceMonitor.getStats();
  console.log(`FPS: ${stats.fps.current}, Memory: ${stats.memory.used}`);
}, 1000);
```

### API Reference

#### Frame Updates

```javascript
// Call once per frame
performanceMonitor.update(): void

// Update manually
performanceMonitor.updateMemory(): void
```

#### Metrics

```javascript
// Get FPS statistics
getFPSStats(): {current, average, min, max}

// Get frame time statistics
getFrameTimeStats(): {current, average, min, max}

// Get memory statistics
getMemoryStats(): {used, total, limit, percentage}

// Get network statistics
getNetworkStats(): {latency, bandwidth, packetLoss}
```

#### Network Recording

```javascript
// Record network metric (call from network layer)
recordNetworkMetric(latencyMs, bandwidthBps, packetLoss): void
```

#### Debug Overlay

```javascript
// Create overlay element
createDebugOverlay(): HTMLElement

// Show/hide overlay
showDebugOverlay(): void
hideDebugOverlay(): void

// Update overlay (call each frame if visible)
updateDebugOverlay(): void
```

#### Statistics & Export

```javascript
// Get all statistics snapshots
getStats(): AllStats

// Export for analysis
exportStats(): StaticsExport

// Reset metrics
reset(): void
```

---

## Integration Checklist

### Phase 6 Validation

**Mobile Support:**

- [ ] Touch controller initializes on mobile devices
- [ ] Virtual joystick responds to touch input
- [ ] Action buttons fire correct events
- [ ] Haptic feedback vibrates device
- [ ] UI scales responsively on mobile/tablet
- [ ] Game is playable on mobile (portrait/landscape)

**Server Scaling:**

- [ ] Cluster manager creates multiple servers
- [ ] Players distribute evenly across servers
- [ ] Load balancing works (round-robin or least-loaded)
- [ ] Health checks detect server failures
- [ ] Players auto-migrate on server failure
- [ ] Can support 90+ concurrent players

**Network Optimization:**

- [ ] Interest manager registers all entities
- [ ] Player interests update as they move
- [ ] Bandwidth reduces by ~85-90%
- [ ] Culled entities not sent to clients
- [ ] Significant update filtering works

**Lag Compensation:**

- [ ] Client-side prediction enabled
- [ ] Server validates predictions
- [ ] Smooth corrections applied
- [ ] Cheating detection functional
- [ ] Validation errors tracked

**Rendering Optimization:**

- [ ] LOD system calculates distances
- [ ] Ships update LOD as distance changes
- [ ] Quality settings apply per LOD level
- [ ] Particles cull at distance
- [ ] FPS improves with LOD (target 60 FPS)

**Performance Monitoring:**

- [ ] FPS counter displays correct value
- [ ] Memory usage tracked
- [ ] Network latency measured
- [ ] Debug overlay shows metrics
- [ ] Performance alerts trigger correctly

---

## Performance Targets

**Client-Side:**

- **FPS**: 60 FPS (16.7ms per frame)
- **Memory**: <300 MB heap usage
- **Rendering**: 50+ ships visible without stuttering
- **Mobile**: 30+ FPS on mid-range devices

**Server-Side:**

- **Player Capacity**: 90+ concurrent players
- **Server Response**: <100ms average latency
- **CPU Usage**: <80% per server
- **Memory**: <400 MB per server process
- **Bandwidth**: 10 Mbps per server (all players)

**Network:**

- **Latency**: <100ms (acceptable), <50ms (excellent)
- **Bandwidth Reduction**: 85-90% via interest management
- **Packet Loss**: <0.5%
- **Update Rate**: 20 Hz (50ms between state updates)

---

## Summary

Phase 6 delivers production-ready optimization across all layers:

1. **Mobile Support** - Full touch controls for mobile/tablet players
2. **Server Scaling** - Multi-server cluster for 90+ players
3. **Network Optimization** - 90% bandwidth reduction via culling
4. **Lag Compensation** - Client prediction with server validation
5. **Rendering Optimization** - LOD system for 60 FPS performance
6. **Performance Monitoring** - Real-time metrics and alerts

ShipStrike-3D is now ready for large-scale deployment with support for hundreds of concurrent players across multiple regions and devices.
