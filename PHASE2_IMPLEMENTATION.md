# Phase 2 Implementation Guide

## Overview

Phase 2 transforms ShipStrike-3D from a third-person cannon game to a full first-person ship management experience. Players now stand on ship decks, interact with stations, manage crew, adjust sails, and navigate using wind mechanics.

## New Systems Created

### 1. **Sailor Entity** (`src/entities/sailor.js`)

The player avatar visible on ship decks.

**Features:**

- 3D mesh (body, head, arms, legs with shadows)
- Canvas-based nametag showing username above head
- Movement system (WASD + Sprint)
- Speed: 5 units/sec, Sprint: 8 units/sec
- Friction-based movement
- Station interaction tracking
- Integrated with ship physics (position syncs to ship)

**Usage:**

```javascript
import { Sailor } from "../entities/sailor.js";

const sailor = new Sailor(playerId, username);
scene.add(sailor.mesh);
scene.add(sailor.nametag);

// Per-frame update
sailor.update(delta, playerShip);

// For WASD movement
sailor.setMovement({
  forward: state.keys["w"] || state.keys["arrowup"],
  back: state.keys["s"] || state.keys["arrowdown"],
  left: state.keys["a"] || state.keys["arrowleft"],
  right: state.keys["d"] || state.keys["arrowright"],
  sprint: state.keys["shift"],
});
```

---

### 2. **Interaction System** (`src/systems/interaction.js`)

Handles proximity detection and interaction with ship stations.

**Features:**

- Station proximity detection (customizable radius)
- Visual indicators for stations
- Interaction cooldown (0.5s)
- Station occupation tracking
- Support for multiple station types: helm, cannon, sail, lookout

**Usage:**

```javascript
import { InteractionSystem } from "../systems/interaction.js";

const interactions = new InteractionSystem(scene);

// Add stations to ship
interactions.addStation("Helm", [0, 5, -2], "helm");
interactions.addStation("Cannon-Port", [-10, 3, 0], "cannon");
interactions.addStation("MainSail", [0, 8, 3], "sail");

// Register sailors
interactions.registerSailor(sailor);

// Try interaction with nearest station
interactions.tryInteract(sailor);

// Or specific station type
interactions.tryInteract(sailor, "helm");

// Get station info
const nearestStation = interactions.getNearestStation(sailor, maxDistance);
```

---

### 3. **Crew Management** (`src/entities/crew.js`)

Manages ship crew teams and role assignments.

**Features:**

- Per-ship crew tracking (max 20 sailors)
- Role system: helmsman, gunner, rigger, sailor
- Permission checks for actions (who can steer, fire, adjust sails)
- Crew statistics tracking (shots fired, damage, sail repairs)
- Crew member stats by role

**Usage:**

```javascript
import { CrewManager } from "../entities/crew.js";

const crewManager = new CrewManager();

// Create crew for ship
const crew = crewManager.createCrew(shipId, 20); // max 20 members

// Add member with role
const member = crew.addMember(sailorId, username);

// Assign role
crew.assignRole(sailorId, "helmsman");

// Permission checks
if (crew.canFire(sailorId)) {
  // Can fire cannons
}

if (crew.canAdjustSails(sailorId)) {
  // Can adjust sail angles
}

if (crew.canSteer(sailorId)) {
  // Can control ship heading
}

// Track stats
crew.recordShot(sailorId);
crew.recordDamage(sailorId, damageAmount);

// Get crew data for network sync
const crewData = crew.getCrewData();
```

---

### 4. **Weather & Wind System** (`src/systems/weather.js`)

Dynamic wind system affecting ship physics and sailing.

**Features:**

- Wind direction and speed variation
- Seasonal/weather patterns (calm, clear, cloudy, stormy)
- Wind advantage calculation based on ship heading
- Speed multiplier for sail efficiency
- Compass direction helpers
- Real-time wind updates every 2 seconds

**Usage:**

```javascript
import { Weather } from "../systems/weather.js";

const weather = new Weather();

// Per-frame update
weather.update(delta);

// Get wind info
const windVector = weather.windSystem.getWindVector(); // { x, y }
const windSpeed = weather.windSystem.getWindSpeed(); // 2-20 knots
const windDir = weather.windSystem.getWindDirectionDegrees(); // 0-360

// Calculate heading advantage for ship
const shipHeading = Math.atan2(shipVelocity.y, shipVelocity.x);
const advantage = weather.windSystem.getWindAdvantage(shipHeading);
// 1 = perfect, 0 = can't sail into wind

// Get formatted weather data
const weatherData = weather.windSystem.getWeatherDescription();
// { weather, season, windSpeed, windDirection, intensity }

// Set weather conditions
weather.windSystem.setWeather("stormy", 0.8);
```

---

### 5. **Sails System** (`src/entities/sails.js`)

Ship sail management with damage and efficiency.

**Features:**

- Multiple sails: main, jib, mizzen
- Sail angles (0-180°)
- Health/damage tracking per sail
- Efficiency calculations based on health and angle
- Deploy/retract all or individual sails
- Ripped sail state

**Usage:**

```javascript
import { SailSystem } from "../entities/sails.js";

const sails = new SailSystem();

// Custom sail config
const sails = new SailSystem({
  main: { position: [0, 10, 0], width: 12, height: 20 },
  jib: { position: [-8, 12, 0], width: 8, height: 18 },
  mizzen: { position: [8, 8, 0], width: 8, height: 15 },
});

// Add to scene
sails.addSailsToScene(scene);

// Control sails
sails.setSailAngle("main", 90); // Perpendicular to mast
sails.deploySail("main");
sails.retractSail("jib");

// Get sail status
const status = sails.getSailStatus();
// { main: {deployed, angle, health, efficiency, ripped}, ... }

// Damage/repair
sails.damageRandomSail(10);
sails.repairSail("main", 5);

// Get thrust
const totalThrust = sails.getTotalThrust(); // 0-1
```

---

### 6. **Minimap System** (`src/systems/minimap.js`)

2D navigation overlay showing ships, players, and navigation data.

**Features:**

- Canvas-based 2D rendering
- Player, ship, and marker icons
- Compass with cardinal directions
- Real-time rotation based on player heading
- Customizable scale and colors
- Color-coded ships (ally, enemy, neutral)

**Usage:**

```javascript
import { Minimap } from "../systems/minimap.js";

const minimap = new Minimap(300, 300, 0.1); // width, height, scale

// Attach to DOM
minimap.attachToDOM("minimap-container");

// Update player position
minimap.setPlayerPosition(playerX, playerZ, playerRotation);

// Add ships
minimap.addShip(shipId, position, rotation, "#00dd00", "Player1");

// Add players
minimap.addPlayer(playerId, position, "#00ff00", "Sailor1");

// Add custom markers (waypoints, etc)
minimap.addMarker({ x: 500, y: 500 }, "Home Base", "#ffff00");

// Render each frame
minimap.render();

// Remove markers
minimap.clearMarkers();
```

---

### 7. **Navigation HUD** (`src/systems/navigation.js`)

Display compass, bearing, speed, and wind information.

**Features:**

- Compass display with cardinal directions
- Ship heading and target bearing
- Current and maximum speed
- Wind direction and speed
- Target information
- Terminal-style aesthetic

**Usage:**

```javascript
import { NavigationHUD } from "../systems/navigation.js";

const hud = new NavigationHUD();
hud.attachToDOM();

// Update in game loop
hud.updateCompass(shipHeadingRadians);
hud.updateBearing(shipHeading, targetHeading);
hud.updateSpeed(currentSpeed, maxSpeed);
hud.updateWind(windDirectionDegrees, windSpeed);
hud.updateTarget(targetName, distanceToTarget);

// Control visibility
hud.show();
hud.hide();
hud.remove();
```

---

### 8. **Enhanced Network Manager** (`src/core/network.js`)

Updated with Phase 2 network events and methods.

**New Callbacks:**

```javascript
networkManager.onCrewJoined = (data) => {};
networkManager.onCrewUpdated = (data) => {};
networkManager.onSailorStateUpdated = (data) => {};
networkManager.onWindData = (data) => {};
networkManager.onSailsUpdated = (data) => {};
networkManager.onStationInteraction = (data) => {};
networkManager.onMinimapData = (data) => {};
```

**New Methods:**

```javascript
// Crew
networkManager.joinCrew(shipId);
networkManager.leaveCrew();
networkManager.assignCrewRole(crewMemberId, role);
networkManager.requestCrewData();

// Sailor
networkManager.updateSailorState({ position, rotation, isMoving, stationId });
networkManager.interactWithStation(stationType, stationId);
networkManager.stopInteraction();

// Sails
networkManager.setSailAngle(sailName, angle);
networkManager.deployAllSails();
networkManager.retractAllSails();

// Wind
networkManager.requestWindData();

// Setup all Phase 2 event listeners
networkManager.setupPhase2Events();
```

---

### 9. **Enhanced Server** (`server/gameServer.js`)

Server-side Phase 2 support.

**New Features:**

- Wind system with per-match wind states
- Crew management and role validation
- Sailor position tracking
- Sail angle synchronization
- Station interaction broadcasting
- Minimap data broadcasts (every 2 ticks to reduce bandwidth)
- Wind-based ship speed modifiers

**Key Game Loop Updates:**

- Wind updates every 2 seconds
- Wind affects ship maximum speed (simplified)
- Minimap data broadcast (server-side filtered by match)
- Sail and sailor state synchronization

---

## Integration Guide

### Step 1: Initialize Systems in Game Loop

```javascript
import { Sailor } from "./entities/sailor.js";
import { CrewManager } from "./entities/crew.js";
import { InteractionSystem } from "./systems/interaction.js";
import { Weather } from "./systems/weather.js";
import { SailSystem } from "./entities/sails.js";
import { Minimap } from "./systems/minimap.js";
import { NavigationHUD } from "./systems/navigation.js";
import { networkManager } from "./core/network.js";

// In initialization
const sailor = new Sailor(playerId, username);
const crewManager = new CrewManager();
const interactions = new InteractionSystem(scene);
const weather = new Weather();
const sails = new SailSystem();
const minimap = new Minimap();
const hud = new NavigationHUD();

// Setup event listeners
networkManager.setupPhase2Events();
```

### Step 2: Update Per Frame

```javascript
function gameLoop(delta) {
  // Update sailor
  sailor.update(delta, playerShip);
  sailor.setMovement({ forward, back, left, right, sprint });

  // Update weather
  weather.update(delta);

  // Update interactions
  interactions.update(delta);

  // Update sails
  sails.update(delta, weather.windSystem.getWindVector());

  // Update minimap
  minimap.setPlayerPosition(
    sailor.position.x,
    sailor.position.z,
    playerShip.rotation,
  );
  minimap.render();

  // Update HUD
  const windDeg = weather.windSystem.getWindDirectionDegrees();
  hud.updateWind(windDeg, weather.windSystem.getWindSpeed());
  hud.updateCompass(playerShip.rotation);
  hud.updateSpeed(shipSpeed, shipMaxSpeed);
}
```

### Step 3: Handle Interactions

```javascript
// In input.js, handle F key for interaction
if (e.key === "f") {
  if (interactions.tryInteract(sailor)) {
    const station = sailor.currentStation;
    networkManager.interactWithStation(station.type, station.name);

    // Handle station-specific logic
    switch (station.type) {
      case "helm":
        // Show helm controls
        break;
      case "cannon":
        // Show cannon aiming
        break;
      case "sail":
        // Show sail adjustment UI
        break;
    }
  }
}
```

### Step 4: Sync Crew and Roles

```javascript
// When player joins a ship
networkManager.joinCrew(shipId).then((data) => {
  const crew = crewManager.getCrew(shipId);
  crew.addMember(playerId, username);
});

// When helmsman assigns role
if (crew.canSteer(currentPlayerId)) {
  networkManager.assignCrewRole(targetPlayerId, "gunner");
}
```

---

## Network Protocol (Phase 2)

### Server → Client Events

| Event                | Data                                    | Purpose                      |
| -------------------- | --------------------------------------- | ---------------------------- |
| `crewUpdated`        | shipId, crewSize, members[]             | Crew composition             |
| `sailorStateUpdated` | playerId, position, rotation, stationId | Sailor positions             |
| `windData`           | direction, speed, vector                | Wind conditions              |
| `sailsUpdated`       | shipId, sails{}                         | Sail angles/health           |
| `stationInteraction` | playerId, stationType, stationId        | Someone used a station       |
| `minimapData`        | ships[], sailors[]                      | Minimap data (every 2 ticks) |

### Client → Server Events

| Event                 | Data                                    | Purpose         |
| --------------------- | --------------------------------------- | --------------- |
| `joinCrew`            | shipId                                  | Join ship crew  |
| `leaveCrew`           | (none)                                  | Leave crew      |
| `assignCrewRole`      | crewMemberId, role                      | Assign role     |
| `updateSailorState`   | position, rotation, isMoving, stationId | Sailor position |
| `interactWithStation` | stationType, stationId                  | Use station     |
| `setSailAngle`        | sailName, angle                         | Adjust sail     |
| `deployAllSails`      | (none)                                  | Deploy sails    |
| `retractAllSails`     | (none)                                  | Retract sails   |
| `getWindData`         | (none)                                  | Request wind    |
| `getCrewData`         | (none)                                  | Request crew    |

---

## Performance Notes

- Wind updates: Every 2 seconds (server-side)
- Sailor sync: Every frame (from client)
- Minimap broadcast: Every 2 ticks (60 Hz ÷ 2 = 30 Hz)
- Sail positions: On change only
- Crew data: On request or change
- Memory: ~500 bytes per sailor + ~200 bytes per wind system

---

## Next Steps (Phase 3)

1. **Persistence**: Save crew compositions and ship configurations
2. **Advanced Physics**: Full sail efficiency curves with proper vector math
3. **Spatial Partitioning**: Optimize network traffic with interest management
4. **Captain Orders**: Voice/text commands system for crew coordination
5. **Storm Events**: Dynamic weather affecting gameplay
6. **Crew Skills**: Individual sailor proficiency levels
7. **Equipment Upgrades**: Sails, rigging, cannons with progression

---

## Testing Checklist

- [ ] Sailor movement (WASD, sprint)
- [ ] Nametags render above sailors
- [ ] Station proximity detection works
- [ ] Interaction cooldown prevents spam
- [ ] Crew join/leave works
- [ ] Role assignment syncs across clients
- [ ] Wind updates appear in HUD
- [ ] Wind affects ship speed
- [ ] Sail angles update in real-time
- [ ] Minimap renders with correct positions
- [ ] Compass shows correct heading
- [ ] Multiple sailors visible to other players
- [ ] Crew data network sync works

---

**Created:** Phase 2 Implementation  
**Total New Code:** ~1500 lines  
**Total New Systems:** 9 (Sailor, Interaction, Crew, Weather, Sails, Minimap, Navigation, Network, Server)
