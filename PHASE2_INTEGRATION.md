# Phase 2 Integration Checklist

## Quick Start: Getting Phase 2 Running

### Prerequisites

- Phase 1 working (multiplayer foundation)
- Server running on localhost:3000
- Three.js scene initialized
- Network manager active

---

## Integration Steps

### Step 1: Update main.js

```javascript
// Add these imports
import { Sailor } from "./entities/sailor.js";
import { InteractionSystem } from "./systems/interaction.js";
import { CrewManager } from "./entities/crew.js";
import { Weather } from "./systems/weather.js";
import { SailSystem } from "./entities/sails.js";
import { Minimap } from "./systems/minimap.js";
import { NavigationHUD } from "./systems/navigation.js";

// Initialize Phase 2 systems
const sailor = new Sailor(playerId, username);
const interactions = new InteractionSystem(scene);
const crewManager = new CrewManager();
const weather = new Weather();
const sails = new SailSystem();
const minimap = new Minimap(300, 300, 0.1);
const navHUD = new NavigationHUD();

// Setup network
networkManager.setupPhase2Events();
```

### Step 2: Add Phase 2 Systems to Game Loop

```javascript
function animate() {
  const delta = clock.getDelta();

  // Phase 2 updates
  sailor.update(delta, state.player); // Player ship
  weather.update(delta);
  interactions.update(delta);
  sails.update(delta, weather.windSystem.getWindVector());

  // Minimap
  minimap.setPlayerPosition(
    sailor.position.x,
    sailor.position.z,
    state.player.rotation,
  );
  minimap.render();

  // HUD
  navHUD.updateCompass(state.player.rotation);
  navHUD.updateWind(
    weather.windSystem.getWindDirectionDegrees(),
    weather.windSystem.getWindSpeed(),
  );

  requestAnimationFrame(animate);
}
```

### Step 3: Setup Input Handling

```javascript
// In input.js, add sailor movement
window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  state.keys[key] = true;

  // Interaction (F key)
  if (key === "f") {
    if (interactions.tryInteract(sailor)) {
      const station = sailor.currentStation;
      networkManager.interactWithStation(station.type, station.name);
    }
  }
});

// Update sailor movement each frame
sailor.setMovement({
  forward: state.keys["w"] || state.keys["arrowup"],
  back: state.keys["s"] || state.keys["arrowdown"],
  left: state.keys["a"] || state.keys["arrowleft"],
  right: state.keys["d"] || state.keys["arrowright"],
  sprint: state.keys["shift"],
});

// Send sailor state to network
networkManager.updateSailorState({
  position: sailor.position,
  rotation: sailor.rotation,
  isMoving: sailor.velocity.length() > 0,
  stationId: sailor.currentStation?.name || null,
});
```

### Step 4: Setup Ship/Station Initialization

```javascript
// When player ship spawns or changes
function initializeShip(ship) {
  // Add stations to ship
  interactions.addStation("Helm", [0, 5, -2], "helm");
  interactions.addStation("Cannon-Port", [-10, 3, 0], "cannon");
  interactions.addStation("Cannon-Starboard", [10, 3, 0], "cannon");
  interactions.addStation("MainSail", [0, 8, 3], "sail");
  interactions.addStation("Lookout", [0, 12, 2], "lookout");

  // Register sailor
  interactions.registerSailor(sailor);

  // Create crew
  const crew = crewManager.createCrew(ship.id, 20);

  // Join crew
  networkManager.joinCrew(ship.id);
}
```

### Step 5: Handle Network Events

```javascript
// Crew system
networkManager.onCrewUpdated = (data) => {
  console.log(`Crew size: ${data.crewSize}/${data.maxSize}`);
  updateCrewUI(data);
};

// Sailor positions
networkManager.onSailorStateUpdated = (data) => {
  updateRemoteSailorPosition(data.playerId, data.position, data.rotation);
};

// Wind
networkManager.onWindData = (data) => {
  navHUD.updateWind(
    (Math.atan2(data.directionalVector.y, data.directionalVector.x) * 180) /
      Math.PI,
    data.speed,
  );
};

// Sails
networkManager.onSailsUpdated = (data) => {
  if (data.shipId === state.player.id) {
    updateLocalSails(data.sails);
  } else {
    updateRemoteSails(data.shipId, data.sails);
  }
};

// Station interactions
networkManager.onStationInteraction = (data) => {
  console.log(`${data.username} is using ${data.stationType}`);
  showInteractionFeedback(data.playerId, data.stationType);
};

// Minimap
networkManager.onMinimapData = (data) => {
  data.ships.forEach((ship) => {
    minimap.addShip(ship.id, ship.position, ship.rotation, "#00dd00", "Ship");
  });
  data.sailors.forEach((sailor) => {
    minimap.addPlayer(sailor.playerId, sailor.position, "#00ff00", "Sailor");
  });
};
```

### Step 6: Add HTML Elements

```html
<!-- Add to index.html -->
<div
  id="minimap-container"
  style="position: absolute; top: 20px; right: 20px; z-index: 100;"
></div>
<div id="navigation-hud"></div>
```

---

## Testing Checklist

### Local Testing

- [ ] Sailor spawns at correct position on ship
- [ ] WASD movement works smoothly
- [ ] Sprint (Shift) increases movement speed
- [ ] Nametag renders above sailor head
- [ ] Sailor rotation follows camera heading
- [ ] Station proximity detection works (visual ring appears)

### Interaction Testing

- [ ] F key triggers interaction with nearest station
- [ ] Interaction cooldown prevents spam
- [ ] Interaction state syncs to server
- [ ] Multiple sailors can interact without conflict
- [ ] Station occupation state tracked correctly

### Crew System Testing

- [ ] Can join crew on ship
- [ ] Can assign roles (with helmsman permission)
- [ ] Permission checks work (gunner can fire, rigger can adjust sails)
- [ ] Crew member list syncs across clients
- [ ] Crew statistics tracked (shots, damage, repairs)

### Wind & Sailing Testing

- [ ] Wind updates appear in HUD
- [ ] Wind direction changes gradually and realistically
- [ ] Wind affects ship speed in physics
- [ ] Sails can be deployed/retracted
- [ ] Sail angles update in real-time
- [ ] Sail health shows in crew UI

### Minimap Testing

- [ ] Minimap renders with correct scale
- [ ] Player position updates in real-time
- [ ] Ship icons show correct heading
- [ ] Compass updates with player rotation
- [ ] Remote sailors appear on minimap

### Navigation HUD Testing

- [ ] Compass shows current heading
- [ ] Bearing display updates correctly
- [ ] Speed display shows current and max speed
- [ ] Wind direction and speed display
- [ ] Target information updates

### Network Testing

- [ ] Sailor positions sync to other players (30 Hz)
- [ ] Crew compositions sync correctly
- [ ] Wind data broadcasts every 2 seconds
- [ ] Sail updates sync on change
- [ ] Minimap data broadcasts every 2 ticks (30 Hz)
- [ ] All Phase 2 events fire correctly

---

## Configuration

### Sailor

- `speed = 5` units/sec (modify in Sailor constructor)
- `sprintSpeed = 8` units/sec
- `interactionRadius = 3` units (modify InteractionSystem)

### Wind

- `BASE_WIND_SPEED = 10` knots
- `MAX_WIND_SPEED = 20` knots
- `MIN_WIND_SPEED = 2` knots
- `WIND_UPDATE_INTERVAL = 2000` ms

### Sails

- Max 3 sails (main, jib, mizzen)
- Default sail health = 100
- Angle range: 0-180°

### Crew

- Max crew size: 20 sailors per ship
- Roles: helmsman, gunner, rigger, sailor

### Minimap

- Canvas size: 300x300 px (configurable)
- Scale: 0.1 units/pixel
- Update frequency: Every frame client-side, every 2 ticks server-side

---

## Troubleshooting

### Sailor Not Appearing

- Check if sailor mesh is added to scene: `scene.add(sailor.mesh); scene.add(sailor.nametag);`
- Verify camera is in first-person mode during update

### Interactions Not Working

- Ensure InteractionSystem is initialized: `const interactions = new InteractionSystem(scene);`
- Check console for interaction callback errors
- Verify F key event handler is registered

### Network Events Not Firing

- Call `networkManager.setupPhase2Events()` after authentication
- Check WebSocket is connected: `networkManager.connected === true`
- Verify event names match server emit names exactly

### Wind Not Updating

- Check weather system is being updated: `weather.update(delta)`
- Verify `onWindData` callback is registered
- Check server is broadcasting wind data

### Performance Issues

- Reduce minimap update frequency if needed
- Sailor sync only needed if not locally controlled
- Disable windSystem physics temporarily to test

---

## Next Steps After Integration

1. **Test with multiple players** - Verify sailor visibility
2. **Implement station UIs** - Helm, gun sight, sail adjustment screens
3. **Add crew coordination** - Radio/voice chat, orders system
4. **Implement crew skills** - Proficiency levels affecting efficiency
5. **Add weather events** - Storms, calm seas affecting gameplay

---

## Documentation Files

- `PHASE2_IMPLEMENTATION.md` - Full system documentation
- `TECHNICAL_ARCHITECTURE.md` - Network protocol details
- `FEATURE_MATRIX.md` - All 52 features with Phase info
- `MIGRATION_PLAN.md` - Timeline of entire project

---

**Ready to integrate!** Follow these steps in order and test each section before moving to the next.
