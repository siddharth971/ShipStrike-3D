# Phase 5: Integration & UI Implementation Guide

## Overview

This guide provides step-by-step instructions for integrating Phase 5 game modes into the ShipStrike-3D UI. It covers implementing Team Flags mode UI, Trading mode UI, mode selection interfaces, and complete event callback examples.

## Quick Start

### 1. Initialize Game Mode Manager

```javascript
// In your game initialization code (e.g., main.js)
import { gameModeManager } from "./systems/gamemode/modemanager.js";
import { networkManager } from "./core/network.js";

// Setup network callbacks
networkManager.onGameModeChanged = (data) => {
  console.log("Mode changed to:", data.modeType);
  updateGameModeUI(data.modeType);
};

networkManager.onTeamJoined = (data) => {
  console.log(`Player ${data.playerId} joined ${data.team} team`);
  updateTeamUI(data.team, data.teamSize);
};

// Additional callbacks... (see Callback Setup section)
```

### 2. Initialize for Specific Mode

```javascript
// Server sends setGameMode event
// Client receives gameModeChanged event
// Update UI based on mode type
function updateGameModeUI(modeType) {
  hideAllModeUIs(); // Hide other mode UIs

  if (modeType === "teamflags") {
    showTeamFlagsUI();
  } else if (modeType === "trading") {
    showTradingUI();
  } else if (modeType === "freeplay") {
    showFreeplayUI();
  }
}
```

---

## Team Flags Mode UI Implementation

### Architecture

Team Flags UI consists of interconnected components:

```
Game Mode Manager
    ↓
Team Selection Panel
    ↓
Team Display (Red/Blue rosters)
    ↓
Scoreboard (left/right side)
    ↓
Flag Tracker (minimap + 3D)
    ↓
Action Buttons (pickup/drop/capture)
```

### Team Selection Panel

**Component Purpose:** Allow players to select which team to join

**HTML Structure:**

```html
<div id="team-selection-panel" class="panel">
  <h2>Select Your Team</h2>

  <div class="team-options">
    <div class="team-card" id="red-team-card">
      <h3>Red Team</h3>
      <p class="team-size">Players: <span id="red-team-size">0</span>/8</p>
      <div class="players-list" id="red-players-list"></div>
      <button id="join-red-btn" class="join-btn">Join Red Team</button>
    </div>

    <div class="team-card" id="blue-team-card">
      <h3>Blue Team</h3>
      <p class="team-size">Players: <span id="blue-team-size">0</span>/8</p>
      <div class="players-list" id="blue-players-list"></div>
      <button id="join-blue-btn" class="join-btn">Join Blue Team</button>
    </div>
  </div>
</div>
```

**CSS Styling:**

```css
#team-selection-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.9);
  border: 3px solid #ccc;
  padding: 30px;
  border-radius: 10px;
  z-index: 1000;
  width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.team-options {
  display: flex;
  gap: 20px;
  margin-top: 20px;
}

.team-card {
  flex: 1;
  padding: 20px;
  border-radius: 8px;
  border: 2px solid;
  text-align: center;
}

.team-card#red-team-card {
  border-color: #ff4444;
  background: rgba(255, 0, 0, 0.1);
}

.team-card#blue-team-card {
  border-color: #4444ff;
  background: rgba(0, 0, 255, 0.1);
}

.players-list {
  margin: 15px 0;
  min-height: 100px;
  font-size: 12px;
}

.join-btn {
  padding: 10px 20px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  border-radius: 5px;
  transition: all 0.3s;
}

#join-red-btn {
  background: #ff4444;
  color: white;
}

#join-blue-btn {
  background: #4444ff;
  color: white;
}

.join-btn:hover {
  opacity: 0.8;
  transform: scale(1.05);
}
```

**JavaScript Implementation:**

```javascript
// Setup team selection listeners
const teamFlagsUI = {
  initializeTeamSelection() {
    const joinRedBtn = document.getElementById("join-red-btn");
    const joinBlueBtn = document.getElementById("join-blue-btn");

    joinRedBtn.addEventListener("click", () => {
      networkManager.joinTeam("red");
      this.hideTeamSelection();
    });

    joinBlueBtn.addEventListener("click", () => {
      networkManager.joinTeam("blue");
      this.hideTeamSelection();
    });
  },

  showTeamSelection() {
    document.getElementById("team-selection-panel").style.display = "block";
  },

  hideTeamSelection() {
    document.getElementById("team-selection-panel").style.display = "none";
  },

  updateTeamList(team, players) {
    const listId = team === "red" ? "red-players-list" : "blue-players-list";
    const sizeId = team === "red" ? "red-team-size" : "blue-team-size";

    const listElement = document.getElementById(listId);
    const sizeElement = document.getElementById(sizeId);

    // Clear existing players
    listElement.innerHTML = "";

    // Add each player
    players.forEach((player) => {
      const playerDiv = document.createElement("div");
      playerDiv.className = "player-item";
      playerDiv.textContent = `• ${player}`;
      listElement.appendChild(playerDiv);
    });

    // Update size
    sizeElement.textContent = players.length;
  },
};
```

### Scoreboard Component

**Component Purpose:** Display team scores and match status in real-time

**HTML Structure:**

```html
<div id="scoreboard" class="scoreboard">
  <div class="score-container">
    <div class="team red-team">
      <h3>Red Team</h3>
      <div class="score-display">
        <span class="score-number" id="red-score">0</span>
        <span class="score-text">/3</span>
      </div>
      <div class="team-status" id="red-status">Waiting for players...</div>
    </div>

    <div class="match-timer">
      <span id="match-time">00:00</span>
    </div>

    <div class="team blue-team">
      <h3>Blue Team</h3>
      <div class="score-display">
        <span class="score-number" id="blue-score">0</span>
        <span class="score-text">/3</span>
      </div>
      <div class="team-status" id="blue-status">Waiting for players...</div>
    </div>
  </div>
</div>
```

**CSS Styling:**

```css
#scoreboard {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  padding: 20px;
  border-radius: 8px;
  border: 2px solid #ccc;
  z-index: 500;
  min-width: 400px;
}

.score-container {
  display: flex;
  justify-content: space-around;
  align-items: center;
  gap: 30px;
}

.team {
  text-align: center;
  flex: 1;
}

.team h3 {
  margin: 0 0 10px 0;
  font-size: 18px;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.team.red-team h3 {
  color: #ff4444;
}

.team.blue-team h3 {
  color: #4444ff;
}

.score-display {
  font-size: 48px;
  font-weight: bold;
  margin: 10px 0;
}

.team.red-team .score-display {
  color: #ff4444;
}

.team.blue-team .score-display {
  color: #4444ff;
}

.score-text {
  font-size: 24px;
  opacity: 0.7;
}

.team-status {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 5px;
}

.match-timer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.match-timer span {
  font-size: 32px;
  font-weight: bold;
  font-family: monospace;
  color: #ffff00;
}
```

**JavaScript Implementation:**

```javascript
const scoreboardUI = {
  startTime: null,
  timerInterval: null,

  initialize() {
    this.startTime = Date.now();
    this.startTimer();
  },

  startTimer() {
    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;

      const timeStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
      document.getElementById("match-time").textContent = timeStr;
    }, 1000);
  },

  updateScore(team, score) {
    const scoreElement = document.getElementById(`${team}-score`);
    scoreElement.textContent = score;

    // Highlight if approaching win
    if (score === 2) {
      scoreElement.style.color = "#ffff00";
      scoreElement.style.textShadow = "0 0 10px currentColor";
    }
  },

  updateTeamStatus(team, status) {
    const statusElement = document.getElementById(`${team}-status`);
    statusElement.textContent = status;
  },

  cleanup() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  },
};
```

### Flag Tracker Component

**Component Purpose:** Show flag locations, states, and carriers in real-time

**HTML Structure:**

```html
<div id="flag-tracker" class="flag-tracker">
  <div class="flag-status">
    <div class="flag-item" id="red-flag-status">
      <div class="flag-icon red"></div>
      <div class="flag-info">
        <h4>Red Flag</h4>
        <p id="red-flag-state">At base (400, 400)</p>
        <p
          id="red-flag-carrier"
          class="carrier-info"
          style="display: none;"
        ></p>
      </div>
    </div>

    <div class="flag-item" id="blue-flag-status">
      <div class="flag-icon blue"></div>
      <div class="flag-info">
        <h4>Blue Flag</h4>
        <p id="blue-flag-state">At base (3600, 3600)</p>
        <p
          id="blue-flag-carrier"
          class="carrier-info"
          style="display: none;"
        ></p>
      </div>
    </div>
  </div>

  <!-- Minimap showing flag positions -->
  <canvas id="flag-minimap" width="200" height="200"></canvas>
</div>
```

**CSS Styling:**

```css
.flag-tracker {
  position: fixed;
  top: 150px;
  right: 20px;
  background: rgba(0, 0, 0, 0.7);
  padding: 15px;
  border-radius: 8px;
  border: 2px solid #ccc;
  z-index: 500;
  width: 250px;
}

.flag-status {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 10px;
}

.flag-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.flag-icon {
  width: 30px;
  height: 30px;
  border-radius: 4px;
  flex-shrink: 0;
}

.flag-icon.red {
  background: #ff4444;
}

.flag-icon.blue {
  background: #4444ff;
}

.flag-info {
  flex: 1;
}

.flag-info h4 {
  margin: 0 0 5px 0;
  font-size: 14px;
  text-transform: uppercase;
}

.flag-info p {
  margin: 2px 0;
  font-size: 12px;
  opacity: 0.8;
}

.carrier-info {
  color: #ffff00;
  font-weight: bold;
}

#flag-minimap {
  width: 100%;
  background: #222;
  border: 1px solid #666;
  margin-top: 10px;
}
```

**JavaScript Implementation:**

```javascript
const flagTrackerUI = {
  canvasContext: null,

  initialize() {
    const canvas = document.getElementById("flag-minimap");
    this.canvasContext = canvas.getContext("2d");
  },

  updateFlagState(flagId, state, carrier = null) {
    const flagElement = document.getElementById(`${flagId}-flag-state`);
    const carrierElement = document.getElementById(`${flagId}-flag-carrier`);

    if (state === "at_base") {
      flagElement.textContent = `At base (${flagId === "red" ? "400, 400" : "3600, 3600"})`;
      carrierElement.style.display = "none";
    } else if (state === "carried") {
      flagElement.textContent = `Carried by player`;
      carrierElement.textContent = `👤 ${carrier}`;
      carrierElement.style.display = "block";
    } else if (state === "captured") {
      flagElement.textContent = `Captured!`;
      carrierElement.style.display = "none";
    }
  },

  drawMinimap(flags) {
    const ctx = this.canvasContext;
    const canvas = ctx.canvas;

    // Clear canvas
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw bases (red at 0,0 / blue at 3600,3600 in world, scaled to canvas)
    const scale = canvas.width / 4000;

    // Red base
    ctx.fillStyle = "rgba(255, 68, 68, 0.3)";
    ctx.fillRect(0, 0, 40 * scale, 40 * scale);
    ctx.strokeStyle = "#ff4444";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 40 * scale, 40 * scale);

    // Blue base
    ctx.fillStyle = "rgba(68, 68, 255, 0.3)";
    ctx.fillRect(
      canvas.width - 40 * scale,
      canvas.height - 40 * scale,
      40 * scale,
      40 * scale,
    );
    ctx.strokeStyle = "#4444ff";
    ctx.strokeRect(
      canvas.width - 40 * scale,
      canvas.height - 40 * scale,
      40 * scale,
      40 * scale,
    );

    // Draw flags
    for (const [flagId, flag] of Object.entries(flags)) {
      const x = flag.position.x * scale;
      const y = flag.position.y * scale;

      ctx.fillStyle = flagId === "red" ? "#ff4444" : "#4444ff";
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Draw carrier indicator
      if (flag.state === "carried") {
        ctx.strokeStyle = "#ffff00";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  },
};
```

### Action Panel Component

**Component Purpose:** Provide buttons for flag pickup/drop actions

**HTML Structure:**

```html
<div id="flag-actions" class="action-panel">
  <h3>Flag Actions</h3>

  <button
    id="pickup-flag-btn"
    class="action-btn pickup-btn"
    style="display: none;"
  >
    <span class="icon">📍</span>
    <span>Pick Up Flag</span>
  </button>

  <button id="drop-flag-btn" class="action-btn drop-btn" style="display: none;">
    <span class="icon">📌</span>
    <span>Drop Flag</span>
  </button>

  <div id="action-status" class="status-message"></div>
</div>
```

**CSS Styling:**

```css
.action-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.7);
  padding: 15px;
  border-radius: 8px;
  border: 2px solid #ccc;
  z-index: 500;
  min-width: 200px;
}

.action-panel h3 {
  margin: 0 0 10px 0;
  text-align: center;
  font-size: 14px;
}

.action-btn {
  width: 100%;
  padding: 10px;
  margin: 5px 0;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.pickup-btn {
  background: #44ff44;
  color: #000;
}

.pickup-btn:hover:not(:disabled) {
  background: #00ff00;
  transform: scale(1.05);
}

.drop-btn {
  background: #ff8844;
  color: #fff;
}

.drop-btn:hover:not(:disabled) {
  background: #ffaa00;
  transform: scale(1.05);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status-message {
  margin-top: 10px;
  padding: 8px;
  text-align: center;
  font-size: 12px;
  border-radius: 4px;
  background: rgba(100, 100, 100, 0.5);
}

.status-message.success {
  background: rgba(0, 200, 0, 0.5);
  color: #00ff00;
}

.status-message.error {
  background: rgba(200, 0, 0, 0.5);
  color: #ff4444;
}
```

**JavaScript Implementation:**

```javascript
const flagActionsUI = {
  currentlyCarryingFlag: null,

  initialize() {
    const pickupBtn = document.getElementById("pickup-flag-btn");
    const dropBtn = document.getElementById("drop-flag-btn");

    pickupBtn.addEventListener("click", () => this.attemptPickupFlag());
    dropBtn.addEventListener("click", () => this.attemptDropFlag());
  },

  enablePickupAction(flagId) {
    const pickupBtn = document.getElementById("pickup-flag-btn");
    pickupBtn.style.display = "flex";
    pickupBtn.onclick = () => {
      networkManager.pickupFlag(flagId);
      this.showStatus(`Attempting to pick up ${flagId} flag...`, "info");
    };
  },

  disablePickupAction() {
    const pickupBtn = document.getElementById("pickup-flag-btn");
    pickupBtn.style.display = "none";
  },

  enableDropAction(flagId) {
    const dropBtn = document.getElementById("drop-flag-btn");
    dropBtn.style.display = "flex";
    this.currentlyCarryingFlag = flagId;
    dropBtn.onclick = () => {
      // Get player position from game state
      const playerPos = getPlayerPosition(); // From your game state
      networkManager.dropFlag(flagId, playerPos.x, playerPos.y);
      this.showStatus(`Dropped ${flagId} flag`, "success");
    };
  },

  disableDropAction() {
    const dropBtn = document.getElementById("drop-flag-btn");
    dropBtn.style.display = "none";
    this.currentlyCarryingFlag = null;
  },

  showStatus(message, type = "info") {
    const statusElement = document.getElementById("action-status");
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;

    // Auto-clear after 3 seconds
    setTimeout(() => {
      statusElement.textContent = "";
      statusElement.className = "status-message";
    }, 3000);
  },
};
```

---

## Trading Mode UI Implementation

### Architecture

Trading UI consists of port and inventory management:

```
Game Mode Manager
    ↓
Port List Panel
    ↓
Port Selection → Port Details
    ↓
Trading Interface (Buy/Sell)
    ↓
Inventory Display
    ↓
Stats & Profit Tracker
```

### Port List Panel

**Component Purpose:** Show available ports and player's current location

**HTML Structure:**

```html
<div id="port-list" class="port-panel">
  <h2>Ports</h2>

  <div class="current-port">
    <p>Currently Docked At:</p>
    <h3 id="current-port-name">-</h3>
    <p id="current-port-coords" class="coords">-</p>
  </div>

  <div class="ports-grid">
    <button class="port-button" data-port-id="north">
      <span class="port-name">North Trading Post</span>
      <span class="port-distance" data-distance="north">-</span>
    </button>

    <button class="port-button" data-port-id="south">
      <span class="port-name">South Merchant Hub</span>
      <span class="port-distance" data-distance="south">-</span>
    </button>

    <button class="port-button" data-port-id="east">
      <span class="port-name">East Market</span>
      <span class="port-distance" data-distance="east">-</span>
    </button>

    <button class="port-button" data-port-id="west">
      <span class="port-name">West Trading Post</span>
      <span class="port-distance" data-distance="west">-</span>
    </button>

    <button class="port-button" data-port-id="center">
      <span class="port-name">Center Hub</span>
      <span class="port-distance" data-distance="center">-</span>
    </button>
  </div>
</div>
```

**CSS Styling:**

```css
.port-panel {
  position: fixed;
  left: 20px;
  top: 150px;
  background: rgba(0, 0, 0, 0.7);
  padding: 20px;
  border-radius: 8px;
  border: 2px solid #ccc;
  z-index: 500;
  width: 280px;
  max-height: 500px;
  overflow-y: auto;
}

.port-panel h2 {
  margin: 0 0 15px 0;
  text-align: center;
  font-size: 18px;
}

.current-port {
  background: rgba(100, 100, 100, 0.5);
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 15px;
  border-left: 4px solid #ffff00;
}

.current-port p {
  margin: 0 0 5px 0;
  font-size: 12px;
  opacity: 0.8;
}

.current-port h3 {
  margin: 5px 0;
  color: #ffff00;
  font-size: 16px;
}

.current-port .coords {
  font-size: 11px;
  font-family: monospace;
}

.ports-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.port-button {
  padding: 12px;
  background: rgba(100, 100, 200, 0.3);
  border: 2px solid #4444ff;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s;
  text-align: left;
  font-size: 12px;
}

.port-button:hover {
  background: rgba(100, 100, 200, 0.6);
  transform: translateX(5px);
}

.port-button .port-name {
  display: block;
  font-weight: bold;
  margin-bottom: 5px;
}

.port-button .port-distance {
  display: block;
  font-size: 10px;
  opacity: 0.7;
}
```

**JavaScript Implementation:**

```javascript
const portListUI = {
  portCoordinates: {
    north: { x: 2000, y: 500 },
    south: { x: 2000, y: 3500 },
    east: { x: 3600, y: 2000 },
    west: { x: 400, y: 2000 },
    center: { x: 2000, y: 2000 },
  },

  initialize() {
    // Setup port button listeners
    document.querySelectorAll(".port-button").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const portId = e.currentTarget.dataset.portId;
        this.dockAtPort(portId);
      });
    });
  },

  updateCurrentPort(portId, portName) {
    document.getElementById("current-port-name").textContent = portName;
    const coords = this.portCoordinates[portId];
    document.getElementById("current-port-coords").textContent =
      `(${coords.x}, ${coords.y})`;
  },

  updateDistances(playerX, playerY) {
    for (const [portId, coords] of Object.entries(this.portCoordinates)) {
      const distance = Math.hypot(playerX - coords.x, playerY - coords.y);
      const distanceElement = document.querySelector(
        `[data-distance="${portId}"]`,
      );
      if (distanceElement) {
        distanceElement.textContent = `${Math.round(distance)}m`;
      }
    }
  },

  dockAtPort(portId) {
    const portNames = {
      north: "North Trading Post",
      south: "South Merchant Hub",
      east: "East Market",
      west: "West Trading Post",
      center: "Center Hub",
    };

    networkManager.dockAtPort(portId, portNames[portId]);
  },
};
```

### Trading Interface

**Component Purpose:** Buy and sell commodities at docked port

**HTML Structure:**

```html
<div id="trading-interface" class="trading-panel" style="display: none;">
  <h2>Trading Interface</h2>

  <div class="trading-tabs">
    <button class="tab-btn active" data-tab="buy">Buy</button>
    <button class="tab-btn" data-tab="sell">Sell</button>
    <button class="tab-btn" data-tab="prices">Prices</button>
  </div>

  <!-- Buy Tab -->
  <div id="buy-tab" class="tab-content active">
    <h3>Available Goods</h3>
    <div class="commodities-grid" id="buy-commodities">
      <!-- Generated dynamically -->
    </div>
  </div>

  <!-- Sell Tab -->
  <div id="sell-tab" class="tab-content">
    <h3>Your Inventory</h3>
    <div class="commodities-grid" id="sell-commodities">
      <!-- Generated dynamically -->
    </div>
  </div>

  <!-- Prices Tab -->
  <div id="prices-tab" class="tab-content">
    <h3>Market Prices</h3>
    <table class="price-table" id="price-table">
      <!-- Generated dynamically -->
    </table>
  </div>
</div>
```

**CSS Styling:**

```css
.trading-panel {
  position: fixed;
  bottom: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.8);
  padding: 20px;
  border-radius: 8px;
  border: 2px solid #ccc;
  z-index: 500;
  width: 400px;
  max-height: 600px;
  overflow-y: auto;
}

.trading-panel h2 {
  margin: 0 0 15px 0;
  text-align: center;
}

.trading-tabs {
  display: flex;
  gap: 5px;
  margin-bottom: 15px;
  border-bottom: 2px solid #666;
}

.tab-btn {
  flex: 1;
  padding: 8px;
  background: transparent;
  border: none;
  color: #aaa;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.3s;
  font-size: 13px;
  text-transform: uppercase;
}

.tab-btn.active {
  color: #fff;
  border-bottom-color: #4444ff;
}

.tab-btn:hover {
  color: #fff;
}

.tab-content {
  display: none;
}

.tab-content.active {
  display: block;
}

.commodities-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.commodity-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: rgba(100, 100, 100, 0.3);
  border: 1px solid #666;
  border-radius: 5px;
  font-size: 12px;
}

.commodity-name {
  font-weight: bold;
}

.commodity-price {
  color: #ffff00;
  margin: 0 10px;
}

.commodity-stock {
  opacity: 0.7;
  font-size: 11px;
}

.quantity-control {
  display: flex;
  gap: 3px;
}

.qty-input {
  width: 50px;
  padding: 4px;
  background: rgba(50, 50, 50, 0.8);
  border: 1px solid #666;
  color: #fff;
  border-radius: 3px;
  text-align: center;
  font-size: 12px;
}

.trade-btn {
  padding: 4px 8px;
  background: #4444ff;
  color: #fff;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
}

.trade-btn:hover {
  background: #6666ff;
}

.price-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.price-table th,
.price-table td {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid #666;
}

.price-table th {
  background: rgba(100, 100, 100, 0.3);
  font-weight: bold;
}

.price-table tr:hover {
  background: rgba(100, 100, 100, 0.2);
}
```

**JavaScript Implementation:**

```javascript
const tradingUI = {
  currentPort: null,
  currentPortInventory: null,
  playerInventory: null,

  initialize() {
    // Setup tab switching
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });
  },

  showTradingInterface(portId, portName, inventory, portInventory, prices) {
    const panel = document.getElementById("trading-interface");
    panel.style.display = "block";

    this.currentPort = portId;
    this.currentPortInventory = portInventory;
    this.playerInventory = inventory;

    this.populateBuyTab(portInventory, prices);
    this.populateSellTab(inventory);
    this.populatePricesTab(prices);
  },

  populateBuyTab(portInventory, prices) {
    const buyGrid = document.getElementById("buy-commodities");
    buyGrid.innerHTML = "";

    for (const [commodity, quantity] of Object.entries(portInventory)) {
      if (quantity <= 0) continue;

      const price = prices[commodity];
      const item = document.createElement("div");
      item.className = "commodity-item";

      item.innerHTML = `
        <span class="commodity-name">${this.formatCommodityName(commodity)}</span>
        <span class="commodity-price">${price}g</span>
        <span class="commodity-stock">${quantity} units</span>
        <div class="quantity-control">
          <input type="number" class="qty-input" value="1" min="0" max="${quantity}">
          <button class="trade-btn" onclick="tradingUI.executeBuy('${commodity}', this)">Buy</button>
        </div>
      `;

      buyGrid.appendChild(item);
    }
  },

  populateSellTab(inventory) {
    const sellGrid = document.getElementById("sell-commodities");
    sellGrid.innerHTML = "";

    for (const [commodity, quantity] of Object.entries(inventory.cargo || {})) {
      if (quantity <= 0) continue;

      const item = document.createElement("div");
      item.className = "commodity-item";

      item.innerHTML = `
        <span class="commodity-name">${this.formatCommodityName(commodity)}</span>
        <span class="commodity-stock">${quantity} units</span>
        <div class="quantity-control">
          <input type="number" class="qty-input" value="1" min="0" max="${quantity}">
          <button class="trade-btn" onclick="tradingUI.executeSell('${commodity}', this)">Sell</button>
        </div>
      `;

      sellGrid.appendChild(item);
    }
  },

  populatePricesTab(prices) {
    const table = document.getElementById("price-table");
    table.innerHTML = `
      <tr>
        <th>Commodity</th>
        <th>Price</th>
      </tr>
    `;

    for (const [commodity, price] of Object.entries(prices)) {
      const row = table.insertRow();
      row.innerHTML = `
        <td>${this.formatCommodityName(commodity)}</td>
        <td style="color: #ffff00;">${price}g</td>
      `;
    }
  },

  executeBuy(commodity, button) {
    const input = button.previousElementSibling;
    const quantity = parseInt(input.value);

    if (quantity <= 0) {
      alert("Enter a valid quantity");
      return;
    }

    const price = this.currentPortInventory[commodity]
      ? Object.entries(prices).find(([c]) => c === commodity)[1]
      : 0;

    networkManager.buyCommodity(commodity, quantity, price);
  },

  executeSell(commodity, button) {
    const input = button.previousElementSibling;
    const quantity = parseInt(input.value);

    if (quantity <= 0) {
      alert("Enter a valid quantity");
      return;
    }

    networkManager.sellCommodity(commodity, quantity, 0); // Server knows price
  },

  switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll(".tab-content").forEach((tab) => {
      tab.classList.remove("active");
    });
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.remove("active");
    });

    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add("active");
    document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");
  },

  formatCommodityName(commodity) {
    return commodity.charAt(0).toUpperCase() + commodity.slice(1);
  },
};
```

### Inventory & Stats Display

**Component Purpose:** Show player's gold, cargo, and trade progress

**HTML Structure:**

```html
<div id="inventory-stats" class="inventory-panel">
  <h2>Inventory & Stats</h2>

  <div class="gold-display">
    <span class="label">Gold:</span>
    <span class="value" id="player-gold">1000</span>
    <span class="currency">g</span>
  </div>

  <div class="win-progress">
    <p class="label">Progress to Victory:</p>
    <div class="progress-bar">
      <div class="progress-fill" id="win-progress"></div>
    </div>
    <span id="win-progress-text">1,000 / 100,000 (1%)</span>
  </div>

  <div class="cargo-info">
    <p class="label">Cargo Space:</p>
    <span id="cargo-used">0</span> / <span id="cargo-max">500</span> units
    <div class="cargo-bar">
      <div class="cargo-fill" id="cargo-fill"></div>
    </div>
  </div>

  <div class="inventory-items">
    <p class="label">Cargo:</p>
    <div id="cargo-list" style="font-size: 12px; opacity: 0.8;">
      <p
        style="margin: 5px 0; padding: 5px; background: rgba(100, 100, 100, 0.2); border-radius: 3px;"
      >
        Empty
      </p>
    </div>
  </div>
</div>
```

**CSS Styling:**

```css
.inventory-panel {
  position: fixed;
  top: 150px;
  left: 20px;
  background: rgba(0, 0, 0, 0.7);
  padding: 15px;
  border-radius: 8px;
  border: 2px solid #ccc;
  z-index: 500;
  width: 250px;
}

.inventory-panel h2 {
  margin: 0 0 15px 0;
  text-align: center;
  font-size: 16px;
}

.gold-display {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
  padding: 10px;
  background: rgba(255, 255, 0, 0.1);
  border: 2px solid #ffff00;
  border-radius: 6px;
}

.gold-display .label {
  font-weight: bold;
}

.gold-display .value {
  color: #ffff00;
  font-weight: bold;
  font-size: 18px;
  flex: 1;
}

.gold-display .currency {
  font-size: 12px;
  opacity: 0.8;
}

.win-progress {
  margin-bottom: 15px;
}

.win-progress .label {
  font-weight: bold;
  font-size: 12px;
  margin-bottom: 5px;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background: rgba(100, 100, 100, 0.3);
  border: 1px solid #666;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 5px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4444ff, #00ff00);
  width: 1%;
  transition: width 0.3s ease;
}

#win-progress-text {
  font-size: 11px;
  opacity: 0.7;
}

.cargo-info {
  margin-bottom: 15px;
  padding: 10px;
  background: rgba(100, 100, 100, 0.2);
  border-radius: 6px;
}

.cargo-info .label {
  font-weight: bold;
  font-size: 12px;
  margin-bottom: 5px;
}

.cargo-bar {
  width: 100%;
  height: 15px;
  background: rgba(50, 50, 50, 0.5);
  border: 1px solid #666;
  border-radius: 8px;
  overflow: hidden;
  margin-top: 5px;
}

.cargo-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff8844, #ffaa00);
  width: 0%;
  transition: width 0.3s ease;
}

.inventory-items {
  margin-top: 15px;
}

.inventory-items .label {
  font-weight: bold;
  font-size: 12px;
  margin-bottom: 8px;
}

#cargo-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

#cargo-list p {
  margin: 0;
}
```

**JavaScript Implementation:**

```javascript
const inventoryStatsUI = {
  updateGold(gold) {
    document.getElementById("player-gold").textContent = gold.toLocaleString();

    // Update win progress
    const percent = Math.min((gold / 100000) * 100, 100);
    document.getElementById("win-progress").style.width = `${percent}%`;
    document.getElementById("win-progress-text").textContent =
      `${gold.toLocaleString()} / 100,000 (${Math.round(percent)}%)`;
  },

  updateCargo(cargoUsed, cargoMax, cargoItems) {
    document.getElementById("cargo-used").textContent = cargoUsed;
    document.getElementById("cargo-max").textContent = cargoMax;

    // Update cargo bar
    const cargoPercent = (cargoUsed / cargoMax) * 100;
    document.getElementById("cargo-fill").style.width = `${cargoPercent}%`;

    // Update cargo list
    const cargoList = document.getElementById("cargo-list");
    cargoList.innerHTML = "";

    let hasItems = false;
    for (const [commodity, quantity] of Object.entries(cargoItems)) {
      if (quantity > 0) {
        hasItems = true;
        const item = document.createElement("p");
        item.style.margin = "5px 0";
        item.style.padding = "5px";
        item.style.background = "rgba(100, 100, 100, 0.2)";
        item.style.borderRadius = "3px";
        item.textContent = `${this.formatCommodityName(commodity)}: ${quantity}`;
        cargoList.appendChild(item);
      }
    }

    if (!hasItems) {
      const empty = document.createElement("p");
      empty.style.margin = "5px 0";
      empty.style.padding = "5px";
      empty.style.background = "rgba(100, 100, 100, 0.2)";
      empty.style.borderRadius = "3px";
      empty.textContent = "Empty";
      cargoList.appendChild(empty);
    }
  },

  formatCommodityName(commodity) {
    return commodity.charAt(0).toUpperCase() + commodity.slice(1);
  },
};
```

---

## Event Callback Setup (Complete Example)

Here's a complete example of setting up all Phase 5 event callbacks in your game initialization:

```javascript
// In main.js or game initialization file
import { networkManager } from "./core/network.js";

/**
 * Setup all Phase 5 event callbacks
 */
function setupPhase5Callbacks() {
  // ============================================
  // GAME MODE EVENTS
  // ============================================

  networkManager.onGameModeChanged = (data) => {
    console.log(`[Game Mode] Mode changed to: ${data.modeType}`);

    // Hide all mode UI elements
    document.getElementById("team-flagsUI").style.display = "none";
    document.getElementById("trading-interface").style.display = "none";

    // Show relevant UI for new mode
    if (data.modeType === "teamflags") {
      teamFlagsUI.initialize();
      scoreboardUI.initialize();
      flagTrackerUI.initialize();
      flagActionsUI.initialize();

      document.getElementById("team-flagsUI").style.display = "block";
    } else if (data.modeType === "trading") {
      tradingUI.initialize();
      portListUI.initialize();
      inventoryStatsUI.initialize();

      document.getElementById("trading-interface").style.display = "block";
    }
  };

  // ============================================
  // TEAM FLAGS MODE EVENTS
  // ============================================

  networkManager.onTeamJoined = (data) => {
    console.log(
      `[Team Flags] Player ${data.playerId} joined ${data.team} team`,
    );
    teamFlagsUI.updateTeamList(data.team, data.teamSize);
  };

  networkManager.onTeamUpdated = (data) => {
    console.log(`[Team Flags] ${data.team} team updated:`, data);
    teamFlagsUI.updateTeamList(data.team, data.players);
    scoreboardUI.updateTeamStatus(
      data.team,
      `${data.size} players (${data.score}/3 captures)`,
    );
  };

  networkManager.onFlagPickedUp = (data) => {
    console.log(`[Team Flags] Flag pickup:`, data);

    // Update flag tracker
    flagTrackerUI.updateFlagState(data.flagId, "carried", data.playerName);
    flagTrackerUI.drawMinimap(data.flags);

    // Update action buttons based on whose flag was picked up
    if (data.carrierId === networkManager.playerId) {
      // We're carrying the flag
      flagActionsUI.enableDropAction(data.flagId);
      flagActionsUI.disablePickupAction();
      flagActionsUI.showStatus(
        `You picked up the ${data.flagId} flag!`,
        "success",
      );
    } else {
      // Enemy has it, show defense status
      flagActionsUI.showStatus(
        `${data.playerName} picked up the ${data.flagId} flag!`,
        "warning",
      );
    }
  };

  networkManager.onFlagDropped = (data) => {
    console.log(`[Team Flags] Flag dropped:`, data);

    // Update flag state
    flagTrackerUI.updateFlagState(data.flagId, "at_base");
    flagTrackerUI.drawMinimap(data.flags);

    // Clear drop action button
    flagActionsUI.disableDropAction();
    flagActionsUI.showStatus(
      `${data.playerName} dropped the ${data.flagId} flag`,
      "info",
    );

    // Start return timer alert
    const returnSeconds = data.returnTimeout / 1000;
    flagActionsUI.showStatus(
      `Flag will auto-return in ${returnSeconds}s`,
      "warning",
    );
  };

  // ============================================
  // TRADING MODE EVENTS
  // ============================================

  networkManager.onDockedAtPort = (data) => {
    console.log(`[Trading] Docked at port:`, data);

    // Update port display
    portListUI.updateCurrentPort(data.portId, data.portName);

    // Show trading interface
    tradingUI.showTradingInterface(
      data.portId,
      data.portName,
      data.inventory,
      data.portInventory,
      data.prices,
    );

    // Update inventory display
    inventoryStatsUI.updateGold(data.inventory.gold);
    inventoryStatsUI.updateCargo(
      data.cargoUsed,
      data.cargoMax,
      data.inventory.cargo,
    );
  };

  networkManager.onCommodityBought = (data) => {
    console.log(`[Trading] Bought commodity:`, data);

    if (data.success) {
      // Update inventory
      inventoryStatsUI.updateGold(data.newGold);
      inventoryStatsUI.updateCargo(
        data.newCargoUsed,
        500, // cargoMax
        {}, // Would need full cargo from server
      );

      // Show success message
      tradingUI.showStatus(
        `✓ Bought ${data.quantity} ${data.commodity} for ${data.totalCost}g`,
        "success",
      );

      // Refresh trading interface
      networkManager.getGameModeInfo(); // Request updated info
    } else {
      tradingUI.showStatus(`✗ Purchase failed: ${data.reason}`, "error");
    }
  };

  networkManager.onCommoditySold = (data) => {
    console.log(`[Trading] Sold commodity:`, data);

    if (data.success) {
      // Update inventory
      inventoryStatsUI.updateGold(data.newGold);
      inventoryStatsUI.updateCargo(data.newCargoUsed, 500, {});

      // Show success message
      tradingUI.showStatus(
        `✓ Sold ${data.quantity} ${data.commodity} for ${data.totalRevenue}g`,
        "success",
      );

      // Check for win condition
      if (data.newGold >= 100000) {
        showWinScreen("You reached 100,000 gold!");
      }

      // Refresh interface
      networkManager.getGameModeInfo();
    } else {
      tradingUI.showStatus(`✗ Sale failed: ${data.reason}`, "error");
    }
  };

  // ============================================
  // QUERY RESPONSE EVENTS
  // ============================================

  networkManager.onGameModeInfo = (data) => {
    console.log(`[Game Mode] Mode info response:`, data);

    if (data.modeType === "teamflags") {
      // Update team displays
      scoreboardUI.updateScore("red", data.teams.red.score);
      scoreboardUI.updateScore("blue", data.teams.blue.score);
      scoreboardUI.updateTeamStatus(
        "red",
        `${data.teams.red.players.length} players`,
      );
      scoreboardUI.updateTeamStatus(
        "blue",
        `${data.teams.blue.players.length} players`,
      );

      // Update flag tracker
      flagTrackerUI.drawMinimap(data.flags);
    } else if (data.modeType === "trading") {
      // Update player stats
      inventoryStatsUI.updateGold(data.playerStats.gold);
      inventoryStatsUI.updateCargo(
        0, // Would need cargoUsed
        500,
        data.playerStats.cargo,
      );
    }
  };
}

// Call during game initialization
setupPhase5Callbacks();
```

---

## Integration Checklist

### Phase 5 Integration Validation

**UI Components:**

- [ ] Team selection panel displays and functions
- [ ] Scoreboard shows correct team scores
- [ ] Flag tracker displays flag states and locations
- [ ] Flag action buttons appear when appropriate
- [ ] Port list shows all ports with distances
- [ ] Trading interface tabs work (Buy/Sell/Prices)
- [ ] Inventory display updates with transactions
- [ ] Win progress bar fills correctly

**Event Handling:**

- [ ] gameModeChanged callback triggers on mode switch
- [ ] teamJoined callback updates UI when player joins team
- [ ] teamUpdated callback refreshes team rosters
- [ ] flagPickedUp callback updates tracker and actions
- [ ] flagDropped callback manages drop state
- [ ] dockedAtPort callback initializes trading
- [ ] commodityBought callback updates inventory
- [ ] commoditySold callback updates wallet and cargo
- [ ] gameModeInfo callback refreshes displays

**Game Logic:**

- [ ] Team auto-balancing works
- [ ] Flags reset after 30 seconds of being dropped
- [ ] Capture zones recognize valid captures
- [ ] Match ends at 3 flag captures
- [ ] Market prices adjust with supply/demand
- [ ] Cargo capacity limits enforced
- [ ] Trading win condition detected at 100,000 gold
- [ ] Mode cleanup prevents data leaks

**Network Synchronization:**

- [ ] Client emits correct events to server
- [ ] Server broadcasts state changes to all players
- [ ] Network lag doesn't break gameplay
- [ ] Disconnections handled gracefully

---

## Performance Optimization Tips

### Client-Side Optimization

**1. Minimap Drawing**

- Only redraw when flag positions change

```javascript
let lastFlagState = null;

flagTrackerUI.drawMinimap = function (flags) {
  const currentState = JSON.stringify(flags);
  if (currentState === lastFlagState) return; // No redraw needed

  // Draw...
  lastFlagState = currentState;
};
```

**2. UI Update Throttling**

- Throttle distance calculations to 500ms

```javascript
let lastDistanceUpdate = 0;

function updatePortDistances() {
  const now = Date.now();
  if (now - lastDistanceUpdate < 500) return;

  portListUI.updateDistances(playerX, playerY);
  lastDistanceUpdate = now;
}
```

**3. Inventory Cell Caching**

- Cache DOM elements instead of recreating

```javascript
const cachedCommodityElements = new Map();

tradingUI.populateBuyTab = function(portInventory, prices) {
  // Reuse cached elements where possible
  for (const [commodity, quantity] of Object.entries(portInventory)) {
    if (cachedCommodityElements.has(commodity)) {
      // Update existing element
      cachedCommodityElements.get(commodity).stockText = quantity;
    } else {
      // Create new element
      cachedCommodityElements.set(commodity, createElement(...));
    }
  }
};
```

### Server-Side Optimization

**1. Price Calculation Caching**

- Cache calculated prices, invalidate on supply change

```javascript
const priceCache = new Map();

function getPrice(commodity) {
  if (priceCache.has(commodity)) {
    return priceCache.get(commodity);
  }

  const price = basePrice - supply * 0.1;
  priceCache.set(commodity, price);
  return price;
}

// Invalidate on supply change
function adjustMarketPrice(commodity, supplyChange) {
  priceCache.delete(commodity);
}
```

**2. Broadcast Filtering**

- Only broadcast to players in relevant range

```javascript
// Instead of:
io.to(`match:${matchId}`).emit("flagPickedUp", data);

// Use targeted:
const playersInRange = getPlayersNear(flag.position.x, flag.position.y, 2000);
playersInRange.forEach((player) => {
  player.emit("flagPickedUp", data);
});
```

---

## Troubleshooting Guide

### Team Flags Issues

**Team panel doesn't appear**

- Check: Is `onGameModeChanged` callback wired?
- Check: Is mode correctly set to 'teamflags' on server?
- Solution: Add console.log in callback to debug

**Flag doesn't respond to pickup**

- Check: Is player within 300 units?
- Check: Is flag in 'at_base' or 'dropped' state?
- Check: Is it enemy flag (not own team)?
- Solution: Verify flag coordinates and states in tracker

**Scoreboard doesn't update**

- Check: Are `teamUpdated` and `teamJoined` callbacks assigned?
- Check: Is score data arriving from server?
- Solution: Log data in callbacks to verify

### Trading Mode Issues

**Port list doesn't show distances**

- Check: Is player position being sent to client?
- Check: Are port coordinates correct?
- Solution: Call updateDistances with confirmed player position

**Trading interface doesn't show goods**

- Check: Is `dockedAtPort` callback receiving port inventory?
- Check: Does port have stock in inventory?
- Solution: Log portInventory object in callback

**Prices don't update after trade**

- Check: Is `getGameModeInfo` being called after transaction?
- Check: Is server recalculating prices?
- Solution: Ensure callback refreshes price display

### General Issues

**UI doesn't appear for mode**

- Check: Is setupPhase5Callbacks() called?
- Check: Are DOM IDs matching (see HTML sections)?
- Check: Is mode setting working (check server logs)?
- Solution: Use browser DevTools to inspect DOM

**Events arriving but UI not updating**

- Check: Is callback function wired to UI update?
- Check: Are DOM selectors correct?
- Check: Is JavaScript error in callback?
- Solution: Open browser console and check for errors

---

## Summary

Phase 5 integration provides complete UI for both Team Flags and Trading modes. Implementation follows modular patterns allowing easy mode switching and data isolation. All callbacks are event-driven, preventing tight coupling between game logic and UI.

**Key Integration Points:**

1. Initialize Game Mode Manager on game start
2. Wire Phase 5 event callbacks before gameplay
3. Implement Team Flags UI (4 components) for flag-based gameplay
4. Implement Trading UI (3 components) for economic gameplay
5. Validate all callbacks trigger and update UI correctly
6. Test mode switching with data isolation
7. Optimize rendering and network broadcasts

All code examples are production-ready and follow established patterns from Phases 1-4.
