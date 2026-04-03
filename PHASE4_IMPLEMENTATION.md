# Phase 4 Implementation Guide: Boarding & Melee Combat + Helper Bot

## Overview

Phase 4 introduces revolutionary ship-to-ship boarding mechanics, intense melee combat gameplay, strategic crew combat, and an intelligent helper bot system. Players can now board enemy ships, engage in sword fights on deck, command their crew in battles, and optionally delegate steering/sailing tasks to an AI assistant.

---

## Systems Created (4 Total, 1,500+ lines)

### 1. **Boarding System** (`src/systems/boarding.js`) - 200+ lines

**Purpose:** Manage ship-to-ship boarding mechanics with proximity detection and progress tracking

**Features:**

- Proximity-based boarding zones (50 units)
- Boarding initiation and validation
- Crew participation tracking
- Boarding outcome resolution
- Multi-phase boarding progression

**API:**

```javascript
const boarding = new BoardingSystem();

// Check if can board
const canBoard = boarding.canBoard(attackerShip, defenderShip);

// Initiate boarding
const boardingAction = boarding.initiateBoardingAction(
  attackerShipId,
  defenderShipId,
  attackerId,
);

// Update boarding progress
boarding.updateBoarding(boardingId);

// Join crew in boarding
boarding.joinBoardingAction(boardingId, playerId, isAttacker);

// Resolve outcome
const outcome = boarding.resolveBoardingOutcome(boardingId);
// { success, capturedGold, shipDamageInflicted }

// Get info
const boarding = boarding.getBoardingInfo(boardingId);
```

**Key Mechanics:**

- Ships must be within 50 units to board
- Boarding duration: 10 seconds
- Attacker vs defender crew participation determines winner
- Winner gains gold capture and opponent takes damage

---

### 2. **Melee Combat System** (`src/systems/meleeCompat.js`) - 600+ lines

**Purpose:** Full-featured sword and firearm combat with multiple combat actions and tactical depth

**Features:**

- 5 weapon types: sword, cutlass, pistol, musket, knife
- 6 combat actions: attack, defend, dodge, parry, charge, retreat
- Stamina system (regenerates when not in combat)
- Stance system: neutral, aggressive, defensive
- Hit chance calculation with modifiers
- Damage reduction from defenses
- Knockback mechanics
- Action cooldowns

**Weapon Types:**

```javascript
{
  sword: { damage: 25, speed: 1.0, range: 10, hitChance: 0.85, knockback: 5 },
  cutlass: { damage: 20, speed: 1.5, range: 8, hitChance: 0.9, knockback: 3 },
  pistol: { damage: 40, speed: 0.5, range: 50, hitChance: 0.7, knockback: 8 },
  musket: { damage: 50, speed: 0.3, range: 100, hitChance: 0.6, knockback: 10 },
  knife: { damage: 15, speed: 2.0, range: 5, hitChance: 0.95, knockback: 2 }
}
```

**Combat Actions:**

```javascript
system.executeAction(combatId, actorId, "attack", targetId);
// { success, hit, damage, knockback, defenderHealth }

system.executeAction(combatId, actorId, "defend", targetId);
// { success, action, stanceChange, damageReduction }

system.executeAction(combatId, actorId, "dodge", targetId);
// { success, action, dodgeChance, duration }

system.executeAction(combatId, actorId, "parry", targetId);
// { success, action, damageReduction, counterChance }

system.executeAction(combatId, actorId, "charge", targetId);
// { success, action, damageBuff, defenseDebuff }

system.executeAction(combatId, actorId, "retreat", targetId);
// { success, action, combatPaused, stamina }
```

**Combat Mechanics:**

- Hit Chance = weapon hit chance + stance modifiers
- Damage = weapon damage × stance multiplier × defense reduction
- Stamina regenerates 10 per second outside combat
- Action cooldowns prevent spam (300-1000ms)
- Combat ends when a combatant's health reaches 0

**API:**

```javascript
const combat = new MeleeCombatSystem();

// Initialize combat
const fight = combat.initiateCombat(attackerId, defenderId, weapon);

// Execute action
const result = combat.executeAction(combatId, actorId, action, targetId);

// Update combatant state
combat.updateCombatant(combatId, playerId, deltaTime);

// Check if over
const isOver = combat.isCombatOver(combatId);

// Get winner
const outcome = combat.endCombat(combatId);
// { winner, stats, duration, combatLog }

// Get info
const info = combat.getCombatInfo(combatId);
```

---

### 3. **Crew Combat System** (`src/systems/crewCombat.js`) - 450+ lines

**Purpose:** Manage crew participation in combat, morale, casualties, and crew-wide actions

**Features:**

- Crew member creation with roles (sailor, gunner, officer, captain)
- Health and stamina tracking per crew member
- Morale system affecting combat effectiveness (0-100)
- Casualty tracking and recording
- Squad management
- Crew rally system (leaders can boost morale)
- Repair mechanics (crew working together)
- Crew combat simulation
- Effectiveness calculations

**Crew Roles & Skills:**

```javascript
{
  sailor: skill 0.5,    weapon: cutlass,
  gunner: skill 0.6,    weapon: pistol,
  officer: skill 0.8,   weapon: sword,
  captain: skill 0.95,  weapon: sword
}
```

**Morale System:**

- Base morale: 100
- Casualty effects: -10 for killed, -3 for wounded
- Squad cohesion multiplier: 0% at morale <30, 75% at <60, 100% at 60
- Combat effectiveness: (activeCrew / totalCrew) × (morale / 100)

**API:**

```javascript
const crew = new CrewCombatSystem();

// Create crew member
const member = crew.createCrewMember(playerId, "officer", shipId);

// Damage/heal
crew.damageCrewMember(playerId, 25);
crew.healCrewMember(playerId, 50);

// Morale management
crew.updateMorale(shipId, -15); // -15 morale
const morale = crew.getMorale(shipId);

// Crew effectiveness
const effectiveness = crew.getCrewEffectiveness(shipId);
const defense = crew.getDefenseModifier(shipId);
const attack = crew.getAttackModifier(shipId);

// Rally crew (leaders only)
const result = crew.rallyCrew(shipId, leaderId, 15);

// Repair ship
const repair = crew.repairShip(shipId, [crewMembers]);

// Crew combat simulation
const outcome = crew.simulateCrewCombat(attackingShipId, defendingShipId);
// { victory, attackerCasualties, defenderCasualties, attackPower, defensePower }

// Get squad
crew.getShipCrew(shipId);
crew.canBoardShip(shipId); // Check if crew can board
```

---

### 4. **Helper Bot System** (`src/entities/bot.js`) - 350+ lines

**Purpose:** AI assistant that can autonomously manage ship steering, sailing, and combat

**Features:**

- 3 bot configurations: passive, balanced, aggressive
- Bot intelligence system (decision-making)
- Autonomous steering (intercept, escape, optimal wind)
- Sail management based on wind conditions
- Automated cannon fire with targeting
- Tactical positioning
- Player can toggle bot on/off
- Player can change bot configuration
- Bot statistics tracking

**Bot Configurations:**

```javascript
{
  passive: {
    aggression: 0.3,         // Avoids combat
    fireChance: 0.2,         // Rarely shoots
    sailOptimization: 0.7,   // Focuses on sailing
    tactics: 'defensive'     // Escapes threats
  },
  balanced: {
    aggression: 0.6,         // Engages enemies
    fireChance: 0.5,         // Shoots at opportunities
    sailOptimization: 0.8,   // Optimizes sailing
    tactics: 'balanced'      // Balanced approach
  },
  aggressive: {
    aggression: 0.9,         // Seeks combat
    fireChance: 0.8,         // Shoots often
    sailOptimization: 0.6,   // Prioritizes combat
    tactics: 'offensive'     // Attacks aggressively
  }
}
```

**Bot Decision Types:**

```javascript
// Steering decisions
{
  type: ("steer", targetAngle, confidence);
}

// Sail management
{
  type: ("adjustSails", configuration, efficiency);
}

// Firing
{
  type: ("fire", targetId, targetHealth, cannonType);
}

// Tactics
{
  type: ("tactic", tactic, objective, priority);
}
```

**Bot Decision Logic:**

- **Offensive**: Get behind enemy, maximize damage, full sail
- **Defensive**: Maintain distance, escape threats, minimize damage
- **Balanced**: Find optimal position, wind-based sailing, opportunistic fire

**API:**

```javascript
const bot = new HelperBotSystem();

// Create bot
const newBot = bot.createBot(playerId, "balanced", shipId);

// Control bot
bot.toggleBot(playerId); // Enable/disable
bot.setBotConfig(playerId, "aggressive"); // Change config

// Update bot behavior
const { decisions, actions } = bot.updateBot(playerId, shipState, deltaTime);

// Get bot info
const botData = bot.getBot(playerId);
```

---

## Network Protocol (Phase 4)

### Client → Server Events

| Event                 | Data                       | Purpose                   |
| --------------------- | -------------------------- | ------------------------- |
| `initiateBoarding`    | targetShipId               | Start boarding enemy ship |
| `joinBoardingAction`  | boardingId                 | Join crew in boarding     |
| `executeMeleeAction`  | combatId, action, targetId | Execute combat action     |
| `toggleBotAssistance` | -                          | Toggle bot on/off         |
| `setBotConfig`        | configType                 | Set bot strategy          |
| `getBoardingStatus`   | boardingId                 | Check boarding progress   |
| `getBotStatus`        | -                          | Request bot status        |

### Server → Client Events

| Event                  | Data                                 | Purpose                    |
| ---------------------- | ------------------------------------ | -------------------------- |
| `boardingInitiated`    | boardingId, attackerName, defenderId | Boarding started           |
| `boardingStarted`      | boardingId                           | Boarding actions available |
| `joinedBoardingAction` | boardingId                           | Confirmed join             |
| `boardingStatus`       | progress, crews, state               | Current boarding status    |
| `meleeActionExecuted`  | action, actor, damage, hit           | Combat action result       |
| `actionCompleted`      | action, damage, effect               | Action completed           |
| `botToggled`           | enabled                              | Bot status changed         |
| `botConfigChanged`     | configType                           | Bot config changed         |
| `botStatus`            | enabled, config, stats               | Current bot status         |

---

## Integration Guide

### Step 1: Initialize Phase 4 Systems

```javascript
import BoardingSystem from "./systems/boarding.js";
import { MeleeCombatSystem } from "./systems/meleeCompat.js";
import { CrewCombatSystem } from "./systems/crewCombat.js";
import { HelperBotSystem } from "./entities/bot.js";

const boarding = new BoardingSystem();
const melee = new MeleeCombatSystem();
const crewCombat = new CrewCombatSystem();
const helperBot = new HelperBotSystem();
```

### Step 2: Setup Callbacks

```javascript
// Boarding
networkManager.onBoardingInitiated = (data) => {
  console.log(`${data.attackerName} is boarding your ship!`);
  showBoardingUI(data.boardingId);
};

// Melee combat
networkManager.onMeleeActionExecuted = (data) => {
  console.log(`${data.actor} ${data.action}: ${data.damage} damage`);
  updateCombatDisplay(data);
};

// Bot system
networkManager.onBotToggled = (data) => {
  console.log(`Bot ${data.enabled ? "enabled" : "disabled"}`);
};
```

### Step 3: Detect Boarding Opportunities

```javascript
function updateShipState(ship, otherShips) {
  for (const enemy of otherShips) {
    if (boarding.canBoard(ship, enemy)) {
      // Show "Board" button to player
      showBoardingButton(enemy.id);
    }
  }
}
```

### Step 4: Initiate Boarding

```javascript
boardButton.onclick = () => {
  networkManager.initiateBoarding(targetShipId);
};
```

### Step 5: Handle Boarding UI

```javascript
networkManager.onBoardingInitiated = (data) => {
  showBoardingLayer({
    boardingId: data.boardingId,
    attacker: data.attackerName,
    onJoinClick: () => {
      networkManager.joinBoardingAction(data.boardingId);
    },
  });

  // Update progress
  const interval = setInterval(() => {
    networkManager.getBoardingStatus(data.boardingId);
  }, 500);
};

networkManager.onBoardingStatus = (data) => {
  updateBoardingProgress(data.progress);
  updateBoardingCrew(data.attackerCrew, data.defenderCrew);
};
```

### Step 6: Melee Combat in Boarding

```javascript
// When player engages enemy combatant
function startMeleeWith(enemy) {
  const combatId = `combat_${player.id}_${enemy.id}`;
  showMeleeCombatUI(combatId, enemy);

  // Listen for combat updates
  networkManager.onMeleeActionExecuted = (data) => {
    if (data.actor === player.id) {
      console.log(`You ${data.action}: ${data.damage} damage`);
    } else {
      console.log(`Enemy ${data.action}: ${data.damage} damage`);
    }
    updateCombatUI(data);
  };
}

// Execute actions
attackButton.onclick = () => {
  networkManager.executeMeleeAction(combatId, "attack", targetId);
};

defendButton.onclick = () => {
  networkManager.executeMeleeAction(combatId, "defend", targetId);
};

dodgeButton.onclick = () => {
  networkManager.executeMeleeAction(combatId, "dodge", targetId);
};
```

### Step 7: Bot Assistant Setup

```javascript
// Create bot on game start
networkManager.onAuthenticated = () => {
  networkManager.toggleBotAssistance(); // Create & enable bot
};

// Toggle bot
botToggleButton.onclick = () => {
  networkManager.toggleBotAssistance();
};

networkManager.onBotToggled = (data) => {
  botToggleButton.textContent = data.enabled ? "🤖 Bot ON" : "🤖 Bot OFF";
};

// Change bot config
botConfigDropdown.onchange = () => {
  networkManager.setBotConfig(botConfigDropdown.value);
};

// Get bot stats
networkManager.getBotStatus();
networkManager.onBotStatus = (data) => {
  console.log(`Bot stats:`, data.stats);
};
```

---

## Configuration

### Boarding Distance

- Modify in `BoardingSystem.boardingDistance` (default: 50 units)

### Boarding Duration

- Modify in `BoardingSystem.boardingDuration` (default: 10000ms)

### Weapon Balance

- Edit `MeleeCombatSystem.weaponTypes` for damage/speed/range

### Crew Morale Effects

- Edit casualty impact in `CrewCombatSystem.recordCasualty()`
- Edit effectiveness modifiers in `getCrewEffectiveness()`

### Bot Behavior

- Adjust `botConfigs` for aggression levels
- Modify decision weights in `makeBotDecisions()`

---

## Testing Checklist

### Boarding System

- [ ] Ships can detect each other at 50 unit distance
- [ ] Boarding initiates successfully when close enough
- [ ] Boarding progress updates correctly
- [ ] Crew can join boarding action
- [ ] Boarding outcome resolves with winner
- [ ] Gold captured on successful boarding
- [ ] Enemy ship takes damage on successful boarding

### Melee Combat

- [ ] Combat initializes between two players
- [ ] Attack action deals damage
- [ ] Hit chance calculation works correctly
- [ ] Defend reduces damage taken
- [ ] Dodge adds dodge buff
- [ ] Parry adds block buff with counter chance
- [ ] Charge deals extra damage but reduces defense
- [ ] Retreat pauses combat
- [ ] Stamina depletes with actions
- [ ] Stamina regenerates over time
- [ ] Combat ends when health reaches 0

### Crew Combat

- [ ] Crew members can be created with roles
- [ ] Crew takes damage and becomes wounded
- [ ] Crew can be healed
- [ ] Morale changes affect effectiveness
- [ ] Leader can rally crew
- [ ] Crew can repair ship together
- [ ] Crew combat simulation determines winners
- [ ] Casualties are recorded

### Bot System

- [ ] Bot can be created and toggled
- [ ] Bot can change configurations
- [ ] Bot makes steering decisions
- [ ] Bot adjusts sails based on wind
- [ ] Bot targets and fires cannons
- [ ] Bot tactics change based on config
- [ ] Bot statistics track correctly
- [ ] Bot doesn't interfere with player control

---

## Performance Considerations

### Boarding

- Limit simultaneous boardings per ship to 2-3
- Clean up completed boardings after 30 seconds

### Melee Combat

- Combat log grows over time; consider archiving old combats
- Update only active combats each frame

### Crew Combat

- Keep crew member count reasonable (~20 per ship)
- Squad updates can be batched

### Bot System

- Bot decisions could be computed every 100-200ms instead of every frame
- Reduce decision frequency at low FPS

---

## Next Steps (Phase 5)

1. **Game Modes** - Team Flags, Trading, Capture the Flag battles
2. **Cosmetics Shop** - Ship skins, sail colors, crew uniforms
3. **Advanced Persistence** - MongoDB/PostgreSQL integration
4. **Seasons & Events** - Seasonal leaderboards, special events
5. **Guild Wars** - Persistent clan territories and warfare

---

**Created:** Phase 4 Implementation  
**Total New Code:** ~1,500 lines  
**Total New Systems:** 4  
**Network Events:** 14 (7 client→server, 7 server→client)  
**Weapon Types:** 5  
**Bot Configs:** 3  
**Combat Actions:** 6
