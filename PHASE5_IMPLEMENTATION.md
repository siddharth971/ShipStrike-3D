# Phase 5: Game Modes Implementation Guide

## Overview

Phase 5 introduces a modular game mode system that enables different gameplay experiences within ShipStrike-3D. The system supports multiple game modes (Team Flags, Trading, Freeplay) that can be switched dynamically during a match. Each mode has its own objectives, mechanics, and win conditions.

**Core Components:**

- **Team Flags Mode** - Competitive team-based flag capture gameplay
- **Trading Mode** - Economic simulation with port-based commerce
- **Game Mode Manager** - Unified interface for switching and managing modes
- **Server Integration** - Socket-based game state management
- **Network Manager** - Client-side event handling and emission

## Architecture

### Design Philosophy

The Phase 5 system uses a **delegation pattern** to allow multiple game modes to coexist within the same game engine:

1. **Game Mode Manager** - Acts as a facade, routing method calls to the active mode
2. **Mode Isolation** - Each mode maintains its own state independently
3. **History Tracking** - Previous mode data is saved when switching for potential rollback
4. **Clean Lifecycle** - Each mode has initialize/cleanup/export methods for proper resource management

### System Diagram

```
NetworkManager (UI Events)
    ↓
Server (gameServer.js)
    ├→ Game State Maps (gameModes, teamData, flags, ports, inventories)
    ├→ Event Handlers (setGameMode, joinTeam, pickupFlag, dockAtPort, etc.)
    └→ Mode-Specific Logic
        ↓
GameModeManager
    ├→ TeamFlagsMode (Flag capture, teams, scoring)
    ├→ TradingMode (Ports, economics, inventory)
    └→ Freeplay (Default, no objectives)
```

---

## Team Flags Mode

### Purpose

Team Flags is a competitive, objective-based game mode where two teams (Red and Blue) compete to capture each other's flags and deliver them to capture zones. First team to 3 flag captures wins.

### Game World Layout

**Team Bases:**

- **Red Base**: Position (400, 400), radius 150 units
- **Blue Base**: Position (3600, 3600), radius 150 units

**Capture Zones** (4 total - 2 per team):

- **Red Capture Zones**:
  - Primary: (600, 400)
  - Secondary: (400, 600)
- **Blue Capture Zones**:
  - Primary: (3400, 3600)
  - Secondary: (3600, 3400)

Flags are captured when their position enters a capture zone within 200 units.

### Flag States and Lifecycle

Flags cycle through three states during gameplay:

**1. at_base**

- Flag rests at its home base
- Position: team's base coordinates
- Carrier: null
- Respawns after 30 seconds if dropped elsewhere
- Players cannot capture flags at_base from own team

**2. carried**

- Flag picked up by a player
- Position: updates with player movement
- Carrier: playerId of player holding flag
- Must be dropped to capture
- Players trying to capture enemy flag while carried trigger capture check

**3. captured**

- Flag successfully delivered to capture zone
- Position: capture zone coordinates
- Scoring: capturing team gets +1 point
- Resets to at_base after brief display
- Match ends when team reaches 3 captures

### Core Mechanics

#### Team Assignment

```javascript
// Auto-balance assigning new players to teams
const teamSizes = {
  red: this.modes.teamflags.teams.red.players.size,
  blue: this.modes.teamflags.teams.blue.players.size,
};
const assignToTeam = teamSizes.red > teamSizes.blue ? "blue" : "red";
```

Players are automatically assigned to the team with fewer players. This prevents one team from dominating due to unbalanced numbers.

#### Flag Pickup

**Requirements:**

- Player must be within 300 units of flag location
- Flag must be at_base or dropped (not currently captured)
- Flag must be ENEMY flag (not player's own team flag)

**Process:**

1. Server validates pickup distance
2. Flag state → carried
3. Flag carrierId set to playerId
4. Broadcast to all players in match: `flagPickedUp` event

#### Flag Drop

**Requirements:**

- Player must currently be carrying flag
- Drop position must be valid (within map bounds)

**Process:**

1. Flag state → at_base
2. Flag position updated to drop coordinates
3. Flag carrierId cleared
4. Drop timer starts (30 second reset to base)
5. Broadcast: `flagDropped` event with location and player name

**Auto-Return (30 second timeout):**

```javascript
// After 30 seconds of being dropped, flag returns to base
setTimeout(() => {
  if (flag.state === "at_base" && flag.carryTime === null) {
    flag.position = { x: flag.baseX, y: flag.baseY };
    broadcast("flagReturned", { flagId, baseX: flag.baseX, baseY: flag.baseY });
  }
}, 30000);
```

#### Flag Capture

**Requirements:**

- Carrying player position within 200 units of ANY capture zone
- Capture zone must belong to DIFFERENT team
- Flag must be in carried state

**Process:**

1. Server detects player position overlapping capture zone
2. Validates it's enemy zone
3. Flag state → captured
4. Capturing team score += 1
5. Check if team reached 3 captures (win condition)
6. Reset flag to at_base after 3 second display
7. Broadcast: `flagCaptured` event with team, score, and flag reset info

**Capture Zone Validation:**

```javascript
checkFlagCapture(flagId) {
  const flag = this.flags[flagId];
  const captureZones = flagId === 'red' ?
    this.captureZones.blue : this.captureZones.red;

  for (const zone of captureZones) {
    const distance = Math.hypot(
      flag.position.x - zone.x,
      flag.position.y - zone.y
    );

    if (distance <= 200) {
      return true; // Captured!
    }
  }
  return false;
}
```

### Scoring System

**Match Progression:**

- First team to capture 3 flags wins the match
- Teams track separate scores
- Score displayed in real-time HUD
- Tied at 2-2? Sudden death - next capture wins

### Match States

**waiting**

- Match not yet started
- Teams available for joining
- No flag mechanics active
- Players can move freely

**active**

- Match in progress
- Both teams have players
- Flag pickup/drop/capture mechanics enabled
- Score tracking active
- Match continues until one team reaches 3 captures

**ended**

- One team captured 3 flags
- Flag mechanics disabled
- Final scoreboard displayed
- Match stats recorded (duration, player stats, winning team)

### API Reference

#### Initialize Match

```javascript
// Server calls during mode setup
gameMode.initializeMode(matchId);

// Initializes:
// - Red team: {players: Set, score: 0, baseX: 400, baseY: 400}
// - Blue team: {players: Set, score: 0, baseX: 3600, baseY: 3600}
// - Flags: {red, blue} with states, positions, carriers
// - Capture zones: 4 zones with coordinates
// - Match state: waiting
```

#### Assign Player to Team

```javascript
gameMode.assignPlayerToTeam(playerId, matchId);

// Returns: 'red' or 'blue' (auto-balanced based on team sizes)
// Side effect: Adds player to team.players Set
```

#### Pickup Flag

```javascript
gameMode.pickupFlag(playerId, flagId);

// Updates:
// - flag.state → 'carried'
// - flag.carrierId → playerId
// Returns: success/failure with reason

// Emits: {type: 'flagPickedUp', flagId, carrierId: playerId, ...}
```

#### Drop Flag

```javascript
gameMode.dropFlag(flagId, x, y);

// Updates:
// - flag.state → 'at_base'
// - flag.position → {x, y}
// - flag.carrierId → null
// - Schedules 30s return timer
// Returns: dropped flag object with new position

// Emits: {type: 'flagDropped', flagId, x, y, ...}
```

#### Check Flag Return

```javascript
gameMode.checkFlagReturn(flagId, (returnTime = 30000));

// Checks if flag should return to base after being dropped
// After returnTime ms of being dropped, resets position to base
// Called periodically by server timer
```

#### Check Flag Capture

```javascript
gameMode.checkFlagCapture(flagId);

// Returns: true if flag is in valid capture zone
// Side effects if captured:
// - flag.state → 'captured'
// - Capturing team score += 1
// - Check for match win (score >= 3)
// - Schedule 3s reset to at_base

// Emits: {type: 'flagCaptured', flagId, capturingTeam, score, ...}
```

#### End Match

```javascript
gameMode.endMatch(winningTeamId);

// Updates:
// - Match state → 'ended'
// - Final score recorded
// - Player stats calculated
// Returns: Match summary with winner, final score, duration

// Emits: {type: 'matchEnded', winningTeam, finalScore, ...}
```

#### Get Match Overview

```javascript
const overview = gameMode.getMatchOverview();

// Returns:
// {
//   matchId,
//   state: 'active' | 'waiting' | 'ended',
//   teams: {
//     red: {players: [...], score: 2},
//     blue: {players: [...], score: 1}
//   },
//   flags: {
//     red: {state: 'carried', carrier: playerId, x, y},
//     blue: {state: 'at_base', x: 3600, y: 3600}
//   },
//   captureZones: [{team, x, y}, ...]
// }
```

### Network Protocol

#### Client → Server

**setGameMode**

```javascript
emit("setGameMode", { modeType: "teamflags", matchId });
```

**joinTeam**

```javascript
emit("joinTeam", { teamId: "red" | "blue", matchId });
```

**pickupFlag**

```javascript
emit("pickupFlag", { flagId: "red" | "blue", matchId });
```

**dropFlag**

```javascript
emit("dropFlag", { flagId: "red" | "blue", x, y, matchId });
```

#### Server → Client

**gameModeChanged**

```javascript
on("gameModeChanged", (data) => {
  // {modeType: 'teamflags', matchId, state: 'active'}
  this.onGameModeChanged(data);
});
```

**teamJoined**

```javascript
on("teamJoined", (data) => {
  // {playerId, team: 'red'|'blue', teamSize, matchId}
  this.onTeamJoined(data);
});
```

**teamUpdated**

```javascript
on("teamUpdated", (data) => {
  // {team: 'red'|'blue', players: [names], size, score, matchId}
  this.onTeamUpdated(data);
});
```

**flagPickedUp**

```javascript
on("flagPickedUp", (data) => {
  // {flagId: 'red'|'blue', carrierId, playerName, x, y, matchId}
  this.onFlagPickedUp(data);
});
```

**flagDropped**

```javascript
on("flagDropped", (data) => {
  // {flagId, playerName, x, y, returnTimeout: 30000, matchId}
  this.onFlagDropped(data);
});
```

---

## Trading Mode

### Purpose

Trading Mode is an economic simulation where players engage in commerce between ports, buying and selling commodities to accumulate wealth. First player to reach 100,000 gold wins. Gameplay emphasizes market understanding, trade route planning, and profit maximization.

### Game World: Port Network

Five ports are distributed across the map with different specializations:

**Port Specifications:**

| Port       | Type         | Position     | Specialty     | Base Inventory          |
| ---------- | ------------ | ------------ | ------------- | ----------------------- |
| **North**  | trading_post | (2000, 500)  | Spices, Sugar | {spices: 50, sugar: 75} |
| **South**  | merchant_hub | (2000, 3500) | Rum, Cloth    | {rum: 60, cloth: 80}    |
| **East**   | market       | (3600, 2000) | Iron, Gold    | {iron: 40, gold: 30}    |
| **West**   | trading_post | (400, 2000)  | Timber, Cloth | {timber: 70, cloth: 40} |
| **Center** | merchant_hub | (2000, 2000) | All           | Auto-restocking hub     |

**Port Types:**

- **trading_post** - Specialized in 2 commodities, moderate prices, slower restocking
- **merchant_hub** - All commodities available, high stock, fastest restocking
- **market** - Central trading point, moderate prices, balanced stock and restocking

### Commodities

Seven commodities are tradeable, each with different base prices and price volatility:

| Commodity  | Base Price | Price Range | Supply Sensitivity | Common Uses      |
| ---------- | ---------- | ----------- | ------------------ | ---------------- |
| **Spices** | 150        | 50-500      | Medium             | Trade staple     |
| **Sugar**  | 120        | 40-400      | Medium             | Port specialty   |
| **Rum**    | 180        | 60-600      | High               | Luxury good      |
| **Cloth**  | 100        | 30-300      | Low                | Stable commodity |
| **Iron**   | 200        | 70-600      | Medium             | Industrial good  |
| **Gold**   | 350        | 100-1000    | High               | Rare commodity   |
| **Timber** | 80         | 20-250      | Low                | Construction     |

### Price Fluctuation System

The market operates on a supply-demand model where prices adjust based on how much each commodity has been bought and sold at each port.

**Price Formula:**

```
current_price = basePrice - (supply * 0.1)
```

Where:

- **basePrice** - Initial market price (from table above)
- **supply** - Cumulative units bought at this port
- **0.1** - Price sensitivity constant

**Example Scenario:**

- Base spice price: 150
- Port supply: 100 units bought (supply = +100 for that port)
- Current price: 150 - (100 × 0.1) = 150 - 10 = **140 gold per unit**

If that same port sells 50 units:

- Supply becomes: 100 - 50 = 50
- New price: 150 - (50 × 0.1) = **145 gold per unit**

**Key Dynamics:**

1. **Buying drives prices down** - Each purchase increases supply locally, reducing price
2. **Selling drives prices up** - Each sale decreases supply locally, increasing price
3. **Arbitrage opportunity** - Buy low at oversupplied ports, sell high at undersupplied ports
4. **Market rebalancing** - Prices naturally gravitate toward equilibrium as traders move goods

### Player Economy

#### Starting State

- **Gold**: 1000
- **Cargo**: Empty (0/500 units)
- **Inventory**: Map of commodities held (per player)
- **Location**: Starts at docked port (default: Center)

#### Inventory System

Player inventory tracks:

```javascript
{
  gold: 1000,              // Current gold
  cargo: {                 // Held commodities
    spices: 0,
    sugar: 0,
    rum: 0,
    cloth: 50,
    iron: 0,
    gold: 0,
    timber: 0
  },
  cargoUsed: 50,           // 50 out of 500 units used
  currentPort: 'center'    // Docked at center port
}
```

#### Cargo Capacity

Each player has 500 units of cargo space:

- Commodities stack (1 unit per quantity)
- Cannot exceed 500 total units
- Gold doesn't consume cargo space
- Purchasing beyond capacity fails with "not_enough_space" error

### Trading Mechanics

#### Docking at Port

**Requirements:**

- Player ship within 400 units of port location
- Port exists in match

**Process:**

1. Server creates inventory if not exists (gold: 1000, cargo: {})
2. Sets currentPort in player inventory
3. Initializes trading session
4. Sends port inventory snapshot to player

**Server Response:**

```javascript
socket.emit('dockedAtPort', {
  portId: 'north',
  portName: 'North Trading Post',
  inventory: {gold: 1000, cargo: {spices: 0, cloth: 50, ...}},
  portInventory: {spices: 45, sugar: 70, ...},
  prices: {spices: 140, sugar: 125, ...},
  cargoUsed: 50,
  cargoMax: 500,
  distanceToOtherPorts: {south: 3000, east: 1600, ...}
});
```

#### Buying Commodity

**Requirements:**

- Player docked at port
- Port has available commodity in stock
- Player has enough gold: `playerGold >= quantity * price`
- Player has enough cargo space: `cargoUsed + quantity <= 500`

**Process:**

1. Calculate total cost: `quantity × currentPrice`
2. Validate requirements (gold, cargo space)
3. Deduct gold from player (playerGold -= cost)
4. Add to player inventory (cargo[commodity] += quantity)
5. Reduce port supply (supplyAtPort -= quantity)
6. Recalculate port prices based on new supply
7. Broadcast `commodityBought` to match

**Server Response:**

```javascript
socket.emit("commodityBought", {
  commodity: "spices",
  quantity: 10,
  unitPrice: 140,
  totalCost: 1400,
  newGold: 8600,
  newCargoUsed: 60,
  newPortPrice: 141, // Price increased because supply decreased
  success: true,
});
```

#### Selling Commodity

**Requirements:**

- Player docked at port
- Port has space in inventory (port inventory cap: 500 units per commodity)
- Player has commodity: `cargo[commodity] >= quantity`

**Process:**

1. Calculate total revenue: `quantity × currentPrice`
2. Validate requirements (player has commodity)
3. Add gold to player (playerGold += revenue)
4. Remove from player inventory (cargo[commodity] -= quantity)
5. Add to port supply (supplyAtPort += quantity)
6. Recalculate port prices based on new supply
7. Broadcast `commoditySold` to match

**Server Response:**

```javascript
socket.emit("commoditySold", {
  commodity: "timber",
  quantity: 25,
  unitPrice: 78,
  totalRevenue: 1950,
  newGold: 10550,
  newCargoUsed: 35,
  newPortPrice: 76, // Price decreased because supply increased
  success: true,
});
```

### Trade Route System

Players can plan multi-leg trade routes to maximize profits:

#### Create Trade Route

```javascript
const route = gameMode.createTradeRoute(
  playerId,
  "north", // Start port
  "south", // End port
  "spices", // Commodity
  1000, // Profit goal
);

// Returns: {
//   routeId: 'route_123',
//   player: playerId,
//   startPort: 'north',
//   endPort: 'south',
//   commodity: 'spices',
//   legs: [
//     {from: 'north', to: 'south', distance: 3000, estimatedProfit: 1250}
//   ],
//   totalDistance: 3000,
//   estimatedProfit: 1250,
//   profitGoal: 1000
// }
```

#### Estimate Route Profit

```javascript
const profit = gameMode.estimateRouteProfit("north", "south", "spices");

// Calculation:
// 1. Get current prices at start/end ports
// 2. Get distance between ports
// 3. Estimate quantity that fits cargo (limited by 500 capacity)
// 4. Calculate: (endPrice - startPrice) * estimatedQuantity
// 5. Apply location variance (-20% to +30%)
// Returns: estimated gold profit
```

**Variance Factors:**

- Distance affects feasibility (longer routes riskier)
- Port specialties provide bonuses (+15% profit for specialty commodity)
- Random market variation (-20% to +30%) simulates unpredictability

#### Complete Trade Route

```javascript
gameMode.completeTradeRoute(playerId, routeId);

// Validates:
// - Player at end port
// - Sold commodity or dumped cargo there
// - Records profit in playerStats
// - Checks win condition (100,000 gold)
// Returns: {success, profitEarned, totalGoldNow}
```

### Win Condition

First player to **100,000 gold** wins the match. This requires:

- Successful multi-leg trading routes
- Market understanding (buying low, selling high)
- Route planning efficiency
- Risk management (not tying up capital in unsellable goods)

**Typical Winning Scenario:**

- Start: 1000 gold, empty cargo
- Leg 1: Buy 50 timber at North (80 gold × 50 = 4000 cost), sell at East (150 gold × 50 = 7500 revenue) = +3500 profit
- Repeat optimized routes ~20-30 times to reach 100,000 gold
- Complete in ~30-60 minutes of active trading

### API Reference

#### Initialize Trading Mode

```javascript
gameMode.initializeMode(matchId);

// Creates:
// - 5 ports with inventories and prices
// - Market state (price history, supply tracking)
// - Player inventories Map (auto-populated on first docking)
```

#### Dock at Port

```javascript
gameMode.dockAtPort(playerId, portId);

// Updates:
// - Creates player inventory if not exists
// - Sets currentPort to portId
// Returns: Port inventory, prices, player cargo status

// Broadcast: 'dockedAtPort' with full inventory and port data
```

#### Buy Commodity

```javascript
gameMode.buyCommodity(playerId, portId, commodity, quantity);

// Validates:
// - Player has enough gold
// - Player has cargo space
// - Port has commodity in stock
// Side effects:
// - Player gold -= (quantity * price)
// - Player cargo[commodity] += quantity
// - Port supply changes
// - Prices recalculated
// Returns: {success, totalCost, newGold, newCargoUsed, newPrice}

// Broadcast: 'commodityBought' to match
```

#### Sell Commodity

```javascript
gameMode.sellCommodity(playerId, portId, commodity, quantity);

// Validates:
// - Player has commodity in cargo
// - Quantity <= cargo amount
// Side effects:
// - Player gold += (quantity * price)
// - Player cargo[commodity] -= quantity
// - Port supply changes
// - Prices recalculated
// Returns: {success, totalRevenue, newGold, newCargoUsed, newPrice}

// Broadcast: 'commoditySold' to match
```

#### Adjust Market Price

```javascript
gameMode.adjustMarketPrice(commodity, supplyChange);

// Internal method called after each buy/sell
// Updates basePrice for commodity at affected port
// Formula: newPrice = basePrice - (newSupply * 0.1)
```

#### Create Trade Route

```javascript
const route = gameMode.createTradeRoute(
  playerId,
  startPort,
  endPort,
  commodity,
  profitGoal,
);

// Returns: Route object with estimated profit and distance
// Used by UI to show player route planning info
```

#### Estimate Route Profit

```javascript
const estimatedProfit = gameMode.estimateRouteProfit(
  startPort,
  endPort,
  commodity,
);

// Calculates potential profit (what-if analysis)
// Helps player plan profitable routes
// Format: {baseProfit, variance, estimatedFinal}
```

#### Get Player Stats

```javascript
const stats = gameMode.getPlayerStats(playerId);

// Returns:
// {
//   playerId,
//   gold: 45000,
//   cargoUsed: 120,
//   cargoMax: 500,
//   inventory: {spices: 50, cloth: 70, ...},
//   currentPort: 'north',
//   totalTradesCompleted: 12,
//   profitTowardWin: 45000, // How close to 100,000
//   completedRoutes: [...]
// }
```

#### End Match

```javascript
gameMode.endMatch(winningPlayerId);

// Updates:
// - Match state → 'ended'
// - Final standings recorded
// Returns: Match summary with winner, final gold, routes completed

// Broadcast: 'matchEnded' with standings
```

### Network Protocol

#### Client → Server

**dockAtPort**

```javascript
emit("dockAtPort", {
  portId: "north",
  portName: "North Trading Post",
  matchId,
});
```

**buyCommodity**

```javascript
emit("buyCommodity", {
  commodity: "spices",
  quantity: 10,
  price: 140,
  matchId,
});
```

**sellCommodity**

```javascript
emit("sellCommodity", {
  commodity: "timber",
  quantity: 25,
  price: 78,
  matchId,
});
```

#### Server → Client

**dockedAtPort**

```javascript
on("dockedAtPort", (data) => {
  // {portId, portName, inventory: {gold, cargo}, portInventory, prices, cargoUsed}
  this.onDockedAtPort(data);
});
```

**commodityBought**

```javascript
on("commodityBought", (data) => {
  // {commodity, quantity, unitPrice, totalCost, newGold, newCargoUsed, success}
  this.onCommodityBought(data);
});
```

**commoditySold**

```javascript
on("commoditySold", (data) => {
  // {commodity, quantity, unitPrice, totalRevenue, newGold, newCargoUsed, success}
  this.onCommoditySold(data);
});
```

---

## Game Mode Manager

### Purpose

The GameModeManager provides a unified interface for managing multiple game modes within a single match. It handles mode switching, cleanup, history tracking, and delegates method calls to the active mode.

### Architecture

**Design Pattern: Delegation**

Instead of duplicating methods in the manager, the manager delegates calls to the current mode instance:

```javascript
callModeMethod(methodName, ...args) {
  const mode = this.getCurrentMode();
  if (mode && typeof mode[methodName] === 'function') {
    return mode[methodName](...args);
  }
  throw new Error(`Method ${methodName} not found in ${this.currentModeType} mode`);
}
```

This allows new modes to be added without modifying the manager.

### Core Concepts

#### Mode Switching

```javascript
// 1. Save current mode history
this.exportModeData(this.currentModeType);

// 2. Reset all modes
this.currentMode.cleanup();

// 3. Initialize new mode
const newMode = this.modes[modeType];
newMode.initializeMode(matchId);

// 4. Update active mode
this.currentModeType = modeType;
this.currentMode = newMode;
```

Switching is atomic - the old mode is completely cleaned up before the new mode initializes.

#### History Tracking

Every mode switch saves the previous mode's state:

```javascript
modeHistory.push({
  modeType: 'teamflags',
  timestamp: Date.now(),
  data: {
    teams: {...},
    flags: {...},
    finalScore: {red: 2, blue: 1}
  }
});
```

This enables:

- Rollback for testing/debugging
- Statistics tracking across multiple modes
- User replay/review of previous matches

### API Reference

#### Initialize Manager

```javascript
constructor() {
  this.modes = {
    teamflags: new TeamFlagsMode(),
    trading: new TradingMode()
  };
  this.currentMode = null;
  this.currentModeType = null;
  this.modeHistory = [];
}
```

#### Set Mode

```javascript
gameMode.setMode(modeType, matchId);

// Parameters:
// - modeType: 'teamflags' | 'trading' | 'freeplay'
// - matchId: current match identifier
//
// Side effects:
// - Saves previous mode to history
// - Calls cleanup() on old mode
// - Initializes new mode with initializeMode(matchId)
// - Sets currentMode and currentModeType
//
// Returns: new mode instance
```

#### Get Current Mode Name

```javascript
const name = gameMode.getCurrentModeName();
// Returns: 'teamflags' | 'trading' | 'freeplay'
```

#### Check Mode Active

```javascript
const isActive = gameMode.isModeActive("teamflags");
// Returns: boolean
```

#### Get Current Mode Instance

```javascript
const mode = gameMode.getCurrentMode();
// Returns: TeamFlagsMode | TradingMode | null
```

#### Call Mode Method (Delegation Pattern)

```javascript
gameMode.callModeMethod("pickupFlag", playerId, flagId);

// Equivalent to:
// this.currentMode.pickupFlag(playerId, flagId);
//
// Handles:
// - Null checks on current mode
// - Method existence validation
// - Error handling with descriptive messages
//
// Returns: method return value
```

#### Get Mode Overview

```javascript
const overview = gameMode.getModeOverview();

// Returns combined view of all active data:
// {
//   currentMode: 'teamflags',
//   modeData: { teams, flags, scores },
//   history: [prev modes],
//   availableModes: ['teamflags', 'trading']
// }
```

#### Get Available Modes

```javascript
const modes = gameMode.getAvailableModes();
// Returns: ['teamflags', 'trading', 'freeplay']
```

#### Reset Mode

```javascript
gameMode.resetMode();

// Reinitializes current mode by calling:
// - currentMode.cleanup()
// - currentMode.initializeMode(currentMatchId)
//
// Useful for: restarting round, clearing bugs, testing
```

#### Export All Data

```javascript
const data = gameMode.exportAllData();

// Returns:
// {
//   currentMode: 'teamflags',
//   modes: {
//     teamflags: {...mode data...},
//     trading: {...mode data...}
//   },
//   history: [
//     {modeType: 'teamflags', timestamp, data},
//     {modeType: 'trading', timestamp, data}
//   ]
// }
//
// Used for: saving match state, debugging, statistics
```

#### Clear All

```javascript
gameMode.clear();

// Cleans up all modes:
// - Calls cleanup() on all mode instances
// - Clears modeHistory
// - Resets currentMode and currentModeType to null
//
// Used for: match cleanup, full reset
```

---

## Server Integration

### Game State Extensions

The server's game state includes five new Maps for Phase 5:

```javascript
// In gameServer.js gameState
const gameState = {
  // ...existing Phase 1-4 maps...

  // Phase 5: Game Modes
  gameModes: new Map(), // matchId → modeType
  teamData: new Map(), // matchId → {red: ..., blue: ...}
  flags: new Map(), // matchId → Map{flagId → flag}
  ports: new Map(), // matchId → Map{portId → port}
  playerInventories: new Map(), // playerId → {gold, cargo}
};
```

### Event Handlers

#### setGameMode

```javascript
socket.on("setGameMode", (data) => {
  const { modeType, matchId } = data;

  // Initialize mode in GameModeManager
  gameState.gameModes.set(matchId, modeType);

  // Initialize mode-specific data
  if (modeType === "teamflags") {
    gameState.teamData.set(matchId, {
      red: { players: new Set(), score: 0 },
      blue: { players: new Set(), score: 0 },
    });
    gameState.flags.set(matchId, new Map());
  }

  if (modeType === "trading") {
    gameState.ports.set(matchId, new Map());
  }

  // Broadcast to match room
  io.to(`match:${matchId}`).emit("gameModeChanged", {
    modeType,
    matchId,
    state: "active",
  });
});
```

#### joinTeam

```javascript
socket.on("joinTeam", (data) => {
  const { teamId, matchId } = data;
  const playerId = socket.playerId;

  // Get match team data
  const teamData = gameState.teamData.get(matchId);

  // Remove from other team if exists
  teamData.red.players.delete(playerId);
  teamData.blue.players.delete(playerId);

  // Add to new team
  teamData[teamId].players.add(playerId);

  // Broadcast team update
  io.to(`match:${matchId}`).emit("teamUpdated", {
    team: teamId,
    players: Array.from(teamData[teamId].players),
    size: teamData[teamId].players.size,
    matchId,
  });
});
```

#### pickupFlag

```javascript
socket.on("pickupFlag", (data) => {
  const { flagId, matchId } = data;
  const playerId = socket.playerId;

  // Get flag data
  const flags = gameState.flags.get(matchId);
  const flag = flags.get(flagId);

  // Validate distance (server-side, trusting client for now)
  // Update flag state
  flag.state = "carried";
  flag.carrierId = playerId;

  // Broadcast pickup
  io.to(`match:${matchId}`).emit("flagPickedUp", {
    flagId,
    carrierId: playerId,
    playerName: socket.playerName,
    x: flag.position.x,
    y: flag.position.y,
    matchId,
  });
});
```

#### dropFlag

```javascript
socket.on("dropFlag", (data) => {
  const { flagId, x, y, matchId } = data;

  const flags = gameState.flags.get(matchId);
  const flag = flags.get(flagId);

  // Update flag
  flag.state = "at_base";
  flag.position = { x, y };
  flag.carrierId = null;

  // Schedule return to base (30 seconds)
  setTimeout(() => {
    if (flag.carrierId === null) {
      flag.position = { x: flag.baseX, y: flag.baseY };
    }
  }, 30000);

  // Broadcast drop
  io.to(`match:${matchId}`).emit("flagDropped", {
    flagId,
    playerName: socket.playerName,
    x,
    y,
    returnTimeout: 30000,
    matchId,
  });
});
```

#### dockAtPort

```javascript
socket.on("dockAtPort", (data) => {
  const { portId, portName, matchId } = data;
  const playerId = socket.playerId;

  // Create inventory if not exists
  if (!gameState.playerInventories.has(playerId)) {
    gameState.playerInventories.set(playerId, {
      gold: 1000,
      cargo: {
        spices: 0,
        sugar: 0,
        rum: 0,
        cloth: 0,
        iron: 0,
        gold: 0,
        timber: 0,
      },
      currentPort: portId,
    });
  }

  const inventory = gameState.playerInventories.get(playerId);
  inventory.currentPort = portId;

  const ports = gameState.ports.get(matchId);
  const port = ports.get(portId);

  // Send dock confirmation
  socket.emit("dockedAtPort", {
    portId,
    portName,
    inventory: {
      gold: inventory.gold,
      cargo: inventory.cargo,
    },
    portInventory: port.inventory,
    prices: port.prices,
    cargoUsed: Object.values(inventory.cargo).reduce((a, b) => a + b, 0),
    cargoMax: 500,
  });
});
```

#### buyCommodity

```javascript
socket.on("buyCommodity", (data) => {
  const { commodity, quantity, price, matchId } = data;
  const playerId = socket.playerId;

  const inventory = gameState.playerInventories.get(playerId);
  const totalCost = quantity * price;

  // Validate
  if (inventory.gold < totalCost) {
    return socket.emit("buyCommodity", {
      success: false,
      reason: "not_enough_gold",
    });
  }

  const cargoUsed = Object.values(inventory.cargo).reduce((a, b) => a + b, 0);
  if (cargoUsed + quantity > 500) {
    return socket.emit("commodityBought", {
      success: false,
      reason: "not_enough_space",
    });
  }

  // Update inventory
  inventory.gold -= totalCost;
  inventory.cargo[commodity] = (inventory.cargo[commodity] || 0) + quantity;

  // Update port supply
  const port = ports.get(inventory.currentPort);
  port.supply[commodity] = (port.supply[commodity] || 0) - quantity;
  port.prices[commodity] =
    port.basePrice[commodity] - port.supply[commodity] * 0.1;

  // Send confirmation
  socket.emit("commodityBought", {
    commodity,
    quantity,
    unitPrice: price,
    totalCost,
    newGold: inventory.gold,
    newCargoUsed: cargoUsed + quantity,
    newPortPrice: port.prices[commodity],
    success: true,
  });
});
```

#### sellCommodity

```javascript
socket.on("sellCommodity", (data) => {
  const { commodity, quantity, price, matchId } = data;
  const playerId = socket.playerId;

  const inventory = gameState.playerInventories.get(playerId);

  // Validate
  if ((inventory.cargo[commodity] || 0) < quantity) {
    return socket.emit("commoditySold", {
      success: false,
      reason: "not_enough_cargo",
    });
  }

  const totalRevenue = quantity * price;

  // Update inventory
  inventory.gold += totalRevenue;
  inventory.cargo[commodity] -= quantity;

  // Update port supply
  const port = ports.get(inventory.currentPort);
  port.supply[commodity] = (port.supply[commodity] || 0) + quantity;
  port.prices[commodity] =
    port.basePrice[commodity] - port.supply[commodity] * 0.1;

  // Check win condition
  if (inventory.gold >= 100000) {
    io.to(`match:${matchId}`).emit("matchEnded", {
      winner: playerId,
      winnerName: socket.playerName,
      finalGold: inventory.gold,
    });
  }

  // Send confirmation
  socket.emit("commoditySold", {
    commodity,
    quantity,
    unitPrice: price,
    totalRevenue,
    newGold: inventory.gold,
    newCargoUsed: cargoUsed - quantity,
    newPortPrice: port.prices[commodity],
    success: true,
  });
});
```

#### getGameModeInfo

```javascript
socket.on("getGameModeInfo", (data) => {
  const { matchId } = data;

  const modeType = gameState.gameModes.get(matchId);
  let modeInfo = { modeType, matchId };

  if (modeType === "teamflags") {
    const teamData = gameState.teamData.get(matchId);
    modeInfo = {
      ...modeInfo,
      teams: {
        red: {
          players: Array.from(teamData.red.players),
          score: teamData.red.score,
        },
        blue: {
          players: Array.from(teamData.blue.players),
          score: teamData.blue.score,
        },
      },
      flags: gameState.flags.get(matchId),
    };
  }

  if (modeType === "trading") {
    const playerId = socket.playerId;
    const inventory = gameState.playerInventories.get(playerId);
    modeInfo = {
      ...modeInfo,
      playerStats: {
        gold: inventory.gold,
        cargo: inventory.cargo,
        currentPort: inventory.currentPort,
      },
    };
  }

  socket.emit("gameModeInfo", modeInfo);
});
```

---

## Network Manager Integration

### Client Callback Setup

The NetworkManager initializes Phase 5 callbacks in `setupPhase5Events()`:

```javascript
setupPhase5Events() {
  // Game mode events
  this.socket.on('gameModeChanged', (data) => {
    if (this.onGameModeChanged) this.onGameModeChanged(data);
  });

  // Team events
  this.socket.on('teamJoined', (data) => {
    if (this.onTeamJoined) this.onTeamJoined(data);
  });

  this.socket.on('teamUpdated', (data) => {
    if (this.onTeamUpdated) this.onTeamUpdated(data);
  });

  // Flag events
  this.socket.on('flagPickedUp', (data) => {
    if (this.onFlagPickedUp) this.onFlagPickedUp(data);
  });

  this.socket.on('flagDropped', (data) => {
    if (this.onFlagDropped) this.onFlagDropped(data);
  });

  // Trading events
  this.socket.on('dockedAtPort', (data) => {
    if (this.onDockedAtPort) this.onDockedAtPort(data);
  });

  this.socket.on('commodityBought', (data) => {
    if (this.onCommodityBought) this.onCommodityBought(data);
  });

  this.socket.on('commoditySold', (data) => {
    if (this.onCommoditySold) this.onCommoditySold(data);
  });

  // Mode info response
  this.socket.on('gameModeInfo', (data) => {
    if (this.onGameModeInfo) this.onGameModeInfo(data);
  });
}
```

### Client Methods

The NetworkManager provides 8 methods for sending Phase 5 events:

```javascript
// Set game mode for match
setGameMode(modeType) {
  if (this.socket && this.connected) {
    this.socket.emit('setGameMode', {modeType, matchId: this.matchId});
  }
}

// Join team (Team Flags only)
joinTeam(teamId) {
  if (this.socket && this.connected) {
    this.socket.emit('joinTeam', {teamId, matchId: this.matchId});
  }
}

// Pick up flag
pickupFlag(flagId) {
  if (this.socket && this.connected) {
    this.socket.emit('pickupFlag', {flagId, matchId: this.matchId});
  }
}

// Drop flag at position
dropFlag(flagId, x, y) {
  if (this.socket && this.connected) {
    this.socket.emit('dropFlag', {flagId, x, y, matchId: this.matchId});
  }
}

// Dock at port (Trading only)
dockAtPort(portId, portName) {
  if (this.socket && this.connected) {
    this.socket.emit('dockAtPort', {portId, portName, matchId: this.matchId});
  }
}

// Buy commodity from port
buyCommodity(commodity, quantity, price) {
  if (this.socket && this.connected) {
    this.socket.emit('buyCommodity', {commodity, quantity, price, matchId: this.matchId});
  }
}

// Sell commodity to port
sellCommodity(commodity, quantity, price) {
  if (this.socket && this.connected) {
    this.socket.emit('sellCommodity', {commodity, quantity, price, matchId: this.matchId});
  }
}

// Query current game mode info
getGameModeInfo() {
  if (this.socket && this.connected) {
    this.socket.emit('getGameModeInfo', {matchId: this.matchId});
  }
}
```

---

## Configuration & Customization

### Team Flags Settings

```javascript
// In teamflags.js constructor
const TEAM_FLAGS_CONFIG = {
  scoreToWin: 3, // Captures needed to win
  redBaseX: 400, // Red team base X
  redBaseY: 400, // Red team base Y
  blueBaseX: 3600, // Blue team base X
  blueBaseY: 3600, // Blue team base Y
  baseRadius: 150, // Base zone radius
  flagReturnTime: 30000, // Time before flag returns (ms)
  captureZoneRadius: 200, // Distance to capture zone for scoring
  pickupRadius: 300, // Distance to pickup flag
};
```

### Trading Settings

```javascript
// In trading.js constructor
const TRADING_CONFIG = {
  startingGold: 1000,               // Initial player gold
  cargoCapacity: 500,               // Units per player
  portCapacity: 500,                // Units per commodity at port
  winGold: 100000,                  // Gold needed to win
  priceBase: {...},                 // Base prices per commodity
  priceSensitivity: 0.1,            // Supply impact on price
  ports: [                          // Port definitions
    {id: 'north', name: 'North Trading Post', x: 2000, y: 500, ...},
    ...
  ]
};
```

### Game Mode Manager Settings

```javascript
// In modemanager.js constructor
const MODE_MANAGER_CONFIG = {
  maxHistorySize: 10, // Keep last 10 mode switches
  enableAutoCleanup: true, // Auto-cleanup old modes
  modes: ["teamflags", "trading", "freeplay"],
};
```

---

## Testing Checklist

### Team Flags Mode Tests

- [ ] Players can join teams and auto-balance
- [ ] Flags start at-base at correct positions
- [ ] Players can pickup flags within pickup radius
- [ ] Flag state changes to carried correctly
- [ ] Flag resets to at_base after 30 seconds when dropped
- [ ] Flag capture triggers in capture zones for enemy flags
- [ ] Capturing team score increments by 1
- [ ] Match ends when team reaches 3 captures
- [ ] Broadcast events arrive at all players
- [ ] Team data persists across player disconnects

### Trading Mode Tests

- [ ] Players start with 1000 gold and empty cargo
- [ ] Docking at ports initializes inventory
- [ ] Players can buy commodities within budget
- [ ] Buying decreases player gold and increases cargo
- [ ] Buying decreases port supply and raises prices
- [ ] Players can sell commodities they hold
- [ ] Selling increases player gold and decreases cargo
- [ ] Selling increases port supply and lowers prices
- [ ] Price calculations follow formula: basePrice - (supply \* 0.1)
- [ ] Match ends when player reaches 100,000 gold
- [ ] Cargo capacity limits prevent overfilling
- [ ] Trade routes calculate estimated profits correctly

### Game Mode Manager Tests

- [ ] Mode switching saves history correctly
- [ ] Mode cleanup prevents data leaks
- [ ] Delegation pattern correctly routes method calls
- [ ] Mode overview includes all relevant data
- [ ] History export includes all previous modes
- [ ] Reset properly reinitializes current mode
- [ ] Available modes list is accurate

### Network Integration Tests

- [ ] Client methods emit correct events
- [ ] Server handlers validate player/match
- [ ] Callbacks trigger with correct data
- [ ] Broadcast messages reach all players in match
- [ ] Match room filtering works correctly

---

## Troubleshooting

### Team Flags Issues

**Flag disappears:**

- Check 30-second timer on drop - flag is auto-returning to base
- Solution: Increase flagReturnTime if needed for slower games

**Team imbalance:**

- New players always join smaller team
- Solution: Manually balance or use joinTeam events to redistribute

**Flag doesn't capture:**

- Flag must be in carried state, not at_base
- Must be in enemy capture zone, not own team zone
- Check captureZoneRadius setting - default 200 units
- Verify flag position is being updated network-synchronized

### Trading Mode Issues

**Can't afford commodity:**

- Verify player has enough gold (cost = quantity × price)
- Check current prices - they adjust with supply

**Can't sell commodity:**

- Verify player actually holds commodity in cargo
- Check cargo inventory for all held items

**Prices not updating:**

- Market prices adjust after each buy/sell
- Formula: newPrice = basePrice - (supply × 0.1)
- Very high supply can drive prices very low

**Player stuck at port:**

- Inventory persists when moving
- Player can move away and dock at different port
- currentPort tracks where player is trading, not location

### General Issues

**Mode won't switch:**

- Ensure old mode cleanup() completes before new mode initialize()
- Check that matchId exists in gameState maps

**Events not arriving:**

- Verify socket connection is active
- Check that callbacks are registered (onEventName = ...)
- Ensure event names match between client emit and server broadcast

**Memory leaks:**

- Call gameMode.clear() on match end
- Ensure player inventories cleaned up when match ends
- Check that mode history doesn't grow unbounded (maxHistorySize)

---

## Performance Notes

**Optimization Considerations:**

1. **Price Calculations** - Recalculate on each buy/sell:
   - Could cache prices and update incrementally
   - Currently O(n) per transaction

2. **Team Auto-balancing** - Counts team sizes on each join
   - Could optimize with cached size counters
   - Currently O(n) for set size lookup

3. **Broadcast Scope** - All events broadcast to full match room
   - Could optimize with filtered broadcasting
   - Currently sends to all match players regardless of location

4. **History Tracking** - Unlimited growth potential
   - Should implement maxHistorySize (suggest 10)
   - Consider circular buffer for fixed memory

5. **Port Inventories** - Updated on every transaction
   - Could batch updates
   - Currently immediate consistency

---

## Future Enhancements

**Potential Extensions:**

1. **Hybrid Modes**
   - Combine Team Flags + Trading (capture flags to win trading points)
   - Team-based trading alliances

2. **Seasonal Markets**
   - Demand cycles based on time of day
   - Weather effects on trading routes

3. **Port Specialization**
   - Special bonuses for trading specialty commodities
   - Port-specific events and opportunities

4. **Dynamic Pricing**
   - More sophisticated supply/demand curves
   - Manipulation mechanics (corner a market)

5. **Crew Integration**
   - Phase 4 crew affects flag carrying speed
   - Trading crew provides commerce bonuses

---

## Summary

Phase 5 delivers a complete, extensible game mode system that enables multiple distinct gameplay experiences. The modular architecture allows new modes to be added easily, and the delegation pattern ensures clean separation of concerns. Both Team Flags and Trading modes are fully integrated with the server and client network layers, ready for UI implementation and player testing.
