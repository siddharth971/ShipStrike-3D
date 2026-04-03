# Phase 4 Integration Guide: Boarding & Melee Combat + Helper Bot

## Quick Start

This guide walks you through integrating Phase 4 systems into your game for ship-to-ship boarding, melee combat, crew combat, and helper bot functionality.

---

## 1. Server Setup (`server/gameServer.js`)

### What's Already Done

The server has been updated with:

- Phase 4 game state variables (boardings, combats, crewCombatants, bots)
- 8 new socket event handlers for boarding, melee, and bot control
- Boarding detection and validation
- Combat action execution and broadcasting
- Bot toggle and configuration

### Verify Setup

Check that `server/gameServer.js` has:

```javascript
// Phase 4 in gameState:
boardings: new Map(),
combats: new Map(),
crewCombatants: new Map(),
bots: new Map()

// Event handlers:
socket.on('initiateBoarding', (data) => { ... });
socket.on('joinBoardingAction', (data) => { ... });
socket.on('executeMeleeAction', (data) => { ... });
socket.on('toggleBotAssistance', () => { ... });
socket.on('setBotConfig', (data) => { ... });
socket.on('getBoardingStatus', (data) => { ... });
socket.on('getBotStatus', () => { ... });
```

### Initialize Systems on Startup

Add to server startup (after Phase 3 initialization):

```javascript
import BoardingSystem from "../src/systems/boarding.js";
import { MeleeCombatSystem } from "../src/systems/meleeCompat.js";
import { CrewCombatSystem } from "../src/systems/crewCombat.js";
import { HelperBotSystem } from "../src/entities/bot.js";

// Create system instances
const boarding = new BoardingSystem();
const melee = new MeleeCombatSystem();
const crewCombat = new CrewCombatSystem();
const helperBot = new HelperBotSystem();

console.log("✅ Phase 4 systems initialized");
```

---

## 2. Network Manager Setup (`src/core/network.js`)

### What's Already Done

The network manager has been updated with:

- 9 new Phase 4 callbacks
- 7 new Phase 4 client methods
- `setupPhase4Events()` function registered

### Verify Setup

Check that `src/core/network.js` has:

```javascript
// Callbacks added:
this.onBoardingInitiated = null;
this.onBoardingStarted = null;
this.onJoinedBoardingAction = null;
this.onBoardingStatus = null;
this.onMeleeActionExecuted = null;
this.onActionCompleted = null;
this.onBotToggled = null;
this.onBotConfigChanged = null;
this.onBotStatus = null;

// Methods added:
initiateBoarding(targetShipId) { ... }
joinBoardingAction(boardingId) { ... }
executeMeleeAction(combatId, action, targetId) { ... }
toggleBotAssistance() { ... }
setBotConfig(configType) { ... }
getBoardingStatus(boardingId) { ... }
getBotStatus() { ... }
```

### Setup Callbacks in Your Game

In `src/main.js` or your UI manager:

```javascript
import NetworkManager from "./core/network.js";

const networkManager = new NetworkManager();

// Boarding callbacks
networkManager.onBoardingInitiated = (data) => {
  console.log(`⚔️ Boarding initiated: ${data.attackerName} → Your ship`);
  showBoardingUI(data.boardingId, data.attackerName, data.defenderId);
};

networkManager.onBoardingStarted = (data) => {
  console.log(`🔥 Boarding action started: ${data.boardingId}`);
};

networkManager.onBoardingStatus = (data) => {
  updateBoardingProgressBar(data.progress);
  updateCrewCount(data.attackerCrew, data.defenderCrew);
};

networkManager.onJoinedBoardingAction = (data) => {
  console.log(`✅ You joined the boarding action`);
  showCombatStatus("You are now engaged in boarding combat!");
};

// Melee combat callbacks
networkManager.onMeleeActionExecuted = (data) => {
  if (data.hit) {
    console.log(
      `💥 ${data.actor === player.id ? "✅ Hit" : "❌ Hit"}: ${data.damage} damage`,
    );
    showDamageNumber(data.damage, data.actor);
  } else {
    console.log(
      `❌ ${data.actor === player.id ? "Your" : "Enemy"} attack missed!`,
    );
    showMissIndicator();
  }
  updateCombatUI(data);
};

networkManager.onActionCompleted = (data) => {
  console.log(`Action: ${data.action}`, data);
  playCombatAnimation(data.action);
};

// Bot callbacks
networkManager.onBotToggled = (data) => {
  console.log(`🤖 Bot ${data.enabled ? "enabled" : "disabled"}`);
  updateBotUI(data.enabled);
};

networkManager.onBotConfigChanged = (data) => {
  console.log(`🤖 Bot config: ${data.configType}`);
  updateBotConfigUI(data.configType);
};

networkManager.onBotStatus = (data) => {
  console.log("🤖 Bot status:", data);
  updateBotStatsDisplay(data.stats);
};
```

---

## 3. Implement Boarding Detection

Detect when ships are close enough to board and show UI:

```javascript
class ShipInteraction {
  constructor(networkManager, gameState) {
    this.networkManager = networkManager;
    this.gameState = gameState;
    this.boardingDistance = 50;
  }

  update(playerShip, allShips) {
    // Check distance to each enemy ship
    for (const enemy of allShips) {
      if (enemy.id === playerShip.id) continue;

      const distance = this.getDistance(playerShip, enemy);

      if (distance <= this.boardingDistance) {
        // Show boarding button
        this.showBoardingButton(enemy);
      }
    }
  }

  getDistance(ship1, ship2) {
    const dx = ship2.x - ship1.x;
    const dy = ship2.y - ship1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  showBoardingButton(targetShip) {
    const button = document.getElementById("board-button");
    button.style.display = "block";
    button.textContent = `⚔️ Board ${targetShip.name}`;
    button.onclick = () => {
      this.networkManager.initiateBoarding(targetShip.id);
    };
  }
}
```

---

## 4. Boarding Combat UI

Implement the boarding UI with crew participation:

```javascript
class BoardingUI {
  constructor(networkManager) {
    this.networkManager = networkManager;
    this.boardingId = null;
    this.setupAndListeners();
  }

  setupEventListeners() {
    this.networkManager.onBoardingInitiated = (data) => {
      this.showBoardingScreen(data);
    };

    this.networkManager.onBoardingStatus = (data) => {
      this.updateBoardingStatus(data);
    };
  }

  showBoardingScreen(boardingData) {
    const screen = `
      <div class="boarding-screen">
        <h2>⚔️ Boarding Action!</h2>
        <p>${boardingData.attackerName} is boarding your ship!</p>
        
        <div class="boarding-progress">
          <div class="progress-bar">
            <div class="progress-fill" id="boarding-progress" style="width: 0%"></div>
          </div>
          <p>Progress: <span id="progress-percent">0</span>%</p>
        </div>

        <div class="boarding-crews">
          <div class="crew attackers">
            <h3>🔴 Attackers</h3>
            <p>Count: <span id="attacker-count">0</span>/5</p>
            <button id="join-attacking" style="display: none;">Join Attack (You)</button>
          </div>
          
          <div class="crew defenders">
            <h3>🔵 Defenders</h3>
            <p>Count: <span id="defender-count">0</span>/5</p>
            <button id="join-defending">Defend Ship</button>
          </div>
        </div>

        <div class="melee-combat" id="melee-section" style="display: none;">
          <h3>⚔️ Melee Combat</h3>
          <div id="opponent-info"></div>
          <div class="combat-actions">
            <button class="combat-btn" data-action="attack">🗡️ Attack</button>
            <button class="combat-btn" data-action="defend">🛡️ Defend</button>
            <button class="combat-btn" data-action="dodge">🤸 Dodge</button>
            <button class="combat-btn" data-action="parry">↔️ Parry</button>
            <button class="combat-btn" data-action="charge">💥 Charge</button>
            <button class="combat-btn" data-action="retreat">🏃 Retreat</button>
          </div>
          <div id="combat-log"></div>
      </div>
    `;

    document.getElementById("ui-container").innerHTML = screen;

    // Setup event listeners
    document.getElementById("join-defending").onclick = () => {
      this.networkManager.joinBoardingAction(boardingData.boardingId);
      document.getElementById("melee-section").style.display = "block";
      this.startMeleeCombat(boardingData.boardingId);
    };

    document.querySelectorAll(".combat-btn").forEach((btn) => {
      btn.onclick = (e) => {
        const action = e.target.dataset.action;
        this.networkManager.executeMeleeAction(
          this.boardingId,
          action,
          this.opponentId,
        );
      };
    });

    this.boardingId = boardingData.boardingId;
  }

  updateBoardingStatus(data) {
    document.getElementById("boarding-progress").style.width =
      `${data.progress}%`;
    document.getElementById("progress-percent").textContent = Math.floor(
      data.progress,
    );
    document.getElementById("attacker-count").textContent = data.attackerCrew;
    document.getElementById("defender-count").textContent = data.defenderCrew;

    if (data.state === "completed") {
      alert(
        `Boarding complete! ${data.progress === 100 ? "Attackers won!" : "Defenders won!"}`,
      );
      this.closeBoardingUI();
    }
  }

  startMeleeCombat(boardingId) {
    // Melee combat starts when joining boarding action
    console.log("Starting melee combat in boarding");
  }

  closeBoardingUI() {
    document.getElementById("ui-container").innerHTML = "";
    this.boardingId = null;
  }
}
```

---

## 5. Melee Combat HUD

Display combat information and action buttons:

```javascript
class MeleeCombatHUD {
  constructor(networkManager) {
    this.networkManager = networkManager;
    this.activeCombat = null;

    this.networkManager.onMeleeActionExecuted = (data) => {
      this.updateCombatDisplay(data);
    };
  }

  showCombatHUD(opponentName, opponentHealth) {
    const hud = `
      <div class="combat-hud">
        <div class="opponent-info">
          <h3>${opponentName}</h3>
          <div class="health-bar">
            <div class="health-fill" style="width: 100%"></div>
          </div>
          <p><span id="opponent-hp">100</span> / 100 HP</p>
        </div>

        <div class="player-info">
          <h3>You</h3>
          <div class="stamina-bar">
            <div class="stamina-fill" style="width: 100%"></div>
          </div>
          <p><span id="player-stamina">100</span> / 100 Stamina</p>
        </div>

        <div class="combat-actions-hud">
          <button class="action-btn attack" data-action="attack">
            <span class="label">🗡️ ATTACK</span>
            <span class="cost">-15 Stamina</span>
          </button>
          <button class="action-btn defend" data-action="defend">
            <span class="label">🛡️ DEFEND</span>
            <span class="cost">-8 Stamina</span>
          </button>
          <button class="action-btn dodge" data-action="dodge">
            <span class="label">🤸 DODGE</span>
            <span class="cost">-12 Stamina</span>
          </button>
          <button class="action-btn parry" data-action="parry">
            <span class="label">↔️ PARRY</span>
            <span class="cost">-10 Stamina</span>
          </button>
          <button class="action-btn charge" data-action="charge">
            <span class="label">💥 CHARGE</span>
            <span class="cost">-25 Stamina</span>
          </button>
          <button class="action-btn retreat" data-action="retreat">
            <span class="label">🏃 RETREAT</span>
            <span class="cost">-15 Stamina</span>
          </button>
        </div>

        <div class="combat-log" id="combat-log">
          <p>Combat started...</p>
        </div>
      </div>
    `;

    document.getElementById("combat-hud-container").innerHTML = hud;

    // Setup action buttons
    document.querySelectorAll(".action-btn").forEach((btn) => {
      btn.onclick = (e) => {
        const action = e.target.closest(".action-btn").dataset.action;
        this.networkManager.executeMeleeAction(
          this.activeCombat,
          action,
          this.opponentId,
        );
      };
    });
  }

  updateCombatDisplay(data) {
    const log = document.getElementById("combat-log");
    const logEntry = document.createElement("p");

    if (data.actor === "playerCharacterId") {
      // Update with actual player ID
      logEntry.className = "player-action";
      logEntry.textContent = `✅ You ${data.action}: ${data.damage} damage dealt`;
    } else {
      logEntry.className = "enemy-action";
      logEntry.textContent = `❌ Enemy ${data.action}: ${data.damage} damage taken`;
    }

    log.appendChild(logEntry);
    log.scrollTop = log.scrollHeight;

    // Update health/stamina bars
    document.querySelector(".health-fill").style.width =
      `${data.defenderHealth}%`;
    document.getElementById("opponent-hp").textContent = Math.ceil(
      data.defenderHealth,
    );
  }
}
```

---

## 6. Helper Bot UI & Control

Implement bot toggle and configuration UI:

```javascript
class BotControlPanel {
  constructor(networkManager) {
    this.networkManager = networkManager;
    this.setupUI();
    this.setupEventListeners();
  }

  setupUI() {
    const panel = `
      <div class="bot-control-panel">
        <h3>🤖 Bot Assistant</h3>
        
        <div class="bot-toggle">
          <button id="toggle-bot" class="toggle-btn">
            🤖 Enable Bot
          </button>
          <span id="bot-status" class="status-indicator">OFF</span>
        </div>

        <div class="bot-config" style="display: none;">
          <label for="bot-config-select">Bot Strategy:</label>
          <select id="bot-config-select">
            <option value="passive">🛡️ Passive (Defensive)</option>
            <option value="balanced" selected>⚖️ Balanced</option>
            <option value="aggressive">⚔️ Aggressive (Offensive)</option>
          </select>
        </div>

        <div class="bot-stats">
          <h4>Statistics</h4>
          <ul>
            <li>Cannons Fired: <span id="cannons-fired">0</span></li>
            <li>Sail Adjustments: <span id="sail-adjustments">0</span></li>
            <li>Course Corrections: <span id="course-corrections">0</span></li>
          </ul>
        </div>

        <div class="bot-info">
          <p style="font-size: 0.9em; color: #888;">
            🤖 Bot Assistant can handle steering, sailing, and cannons when enabled.
            Configure its strategy and let it assist in combat!
          </p>
        </div>
      </div>
    `;

    document.getElementById("bot-panel-container").innerHTML = panel;
  }

  setupEventListeners() {
    const toggleBtn = document.getElementById("toggle-bot");
    const configSelect = document.getElementById("bot-config-select");

    toggleBtn.onclick = () => {
      this.networkManager.toggleBotAssistance();
    };

    configSelect.onchange = () => {
      const config = configSelect.value;
      this.networkManager.setBotConfig(config);
    };

    // Listen for bot status updates
    this.networkManager.onBotToggled = (data) => {
      this.updateBotStatus(data.enabled);
    };

    this.networkManager.onBotConfigChanged = (data) => {
      console.log(`Bot config changed: ${data.configType}`);
    };

    this.networkManager.onBotStatus = (data) => {
      this.updateBotStats(data.stats);
    };

    // Request initial bot status
    this.networkManager.getBotStatus();
  }

  updateBotStatus(enabled) {
    const toggleBtn = document.getElementById("toggle-bot");
    const statusIndicator = document.getElementById("bot-status");
    const configPanel = document.querySelector(".bot-config");

    if (enabled) {
      toggleBtn.textContent = "🤖 Disable Bot";
      toggleBtn.classList.add("active");
      statusIndicator.textContent = "ON";
      statusIndicator.className = "status-indicator on";
      configPanel.style.display = "block";
    } else {
      toggleBtn.textContent = "🤖 Enable Bot";
      toggleBtn.classList.remove("active");
      statusIndicator.textContent = "OFF";
      statusIndicator.className = "status-indicator off";
      configPanel.style.display = "none";
    }
  }

  updateBotStats(stats) {
    document.getElementById("cannons-fired").textContent =
      stats.cannonsFired || 0;
    document.getElementById("sail-adjustments").textContent =
      stats.sailAdjustments || 0;
    document.getElementById("course-corrections").textContent =
      stats.courseCorrestions || 0;
  }
}
```

---

## 7. Crew Combat Integration

When boarding, crews automatically engage:

```javascript
class CrewCombatManager {
  constructor(networkManager, crewCombatSystem) {
    this.networkManager = networkManager;
    this.crewCombat = crewCombatSystem;
  }

  // Simulate crew combat when boarding
  simulateBoardingCrew(attackingShipId, defendingShipId) {
    const outcome = this.crewCombat.simulateCrewCombat(
      attackingShipId,
      defendingShipId,
    );

    console.log(`⚔️ Crew Combat Result:`);
    console.log(`  Victory: ${outcome.victory ? "Attackers" : "Defenders"}`);
    console.log(`  Attacker Casualties: ${outcome.attackerCasualties}`);
    console.log(`  Defender Casualties: ${outcome.defenderCasualties}`);
    console.log(
      `  Power Difference: ${outcome.attackPower - outcome.defensePower}`,
    );

    return outcome;
  }

  // Update crew morale on ship events
  onShipDamaged(shipId, damageTaken) {
    // Reduce morale when ship takes damage
    this.crewCombat.updateMorale(shipId, -5);
  }

  // Rally crew before combat
  rallyCrew(shipId, leaderId) {
    const result = this.crewCombat.rallyCrew(shipId, leaderId, 20);

    if (result.success) {
      console.log(`✅ ${result.crewBoosted} crew members rallied!`);
      showNotification(`Crew morale: ${this.crewCombat.getMorale(shipId)}`);
    }
  }
}
```

---

## 8. Performance Tips

### Boarding

- Update boarding progress only every 100ms (not every frame)
- Clean up completed boardings after 30 seconds
- Limit concurrent boardings per server to prevent spam

### Melee Combat

- Archive old combats after completion
- Batch combat log entries (don't broadcast every action)
- Only update active combats per frame

### Bot System

- Run bot decisions every 200ms instead of every frame
- Reduce decision complexity at lower frame rates
- Cache ship sensor data (enemy positions, wind) for bot reuse

### UI

- Debounce health/stamina bar updates
- Use CSS transforms for animations (better performance)
- Batch DOM updates

---

## Troubleshooting

### Issue: Can't board even when close enough

**Check:**

- Distance calculation is correct (within 50 units)
- Both ships are spawned and have valid positions
- No server error in console

### Issue: Melee actions not executing

**Check:**

- Player health > 0 (not dead)
- Combat is in 'active' state (not 'paused' or 'completed')
- Stamina is sufficient (minimum 10)
- Action cooldown has elapsed

### Issue: Bot not responding

**Check:**

- Bot is actually enabled (`getBotStatus` confirms enabled: true)
- Bot update is being called with valid ship state
- Ship state has required fields (enemies, wind, etc.)

### Issue: Crew combat not working

**Check:**

- Crew members created for both ships
- Morale > 0 for both ships
- Using correct ship IDs

---

## Quick Reference

### Network Methods

```javascript
// Boarding
networkManager.initiateBoarding(targetShipId);
networkManager.joinBoardingAction(boardingId);
networkManager.getBoardingStatus(boardingId);

// Combat
networkManager.executeMeleeAction(combatId, action, targetId);

// Bot
networkManager.toggleBotAssistance();
networkManager.setBotConfig("aggressive");
networkManager.getBotStatus();
```

### Callbacks to Implement

```javascript
networkManager.onBoardingInitiated = (data) => {};
networkManager.onBoardingStatus = (data) => {};
networkManager.onMeleeActionExecuted = (data) => {};
networkManager.onBotToggled = (data) => {};
networkManager.onBotStatus = (data) => {};
```

---

**Phase 4 Integration Complete!**

All systems are ready for integration. Follow the sections above to add boarding combat, melee fighting, crew participation, and intelligent bot assistance to your game. Good luck! ⚔️🤖
