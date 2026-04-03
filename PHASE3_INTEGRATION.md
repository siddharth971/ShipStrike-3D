# Phase 3 Integration Guide: Setup & Usage

## Quick Start

This guide walks you through integrating Phase 3 systems into your game. Follow each section to ensure proper setup and functionality.

---

## 1. Server Setup (`server/gameServer.js`)

### What's Already Done

The server has been updated with:

- Phase 3 game state variables (accounts, upgrades, gold, friends, clans, leaderboards)
- 14 new socket event handlers
- Economy, upgrade validation, gold deduction
- Database integration points

### Verify Setup

Check that `server/gameServer.js` has:

```javascript
// In gameState initialization
const gameState = {
  // ... existing Phase 1-2 data ...
  accounts: new Map(),
  gold: new Map(),
  upgrades: new Map(),
  friends: new Map(),
  clans: new Map(),
  clanMembers: new Map(),
  leaderboards: new Map()
};

// Event handlers present:
socket.on('upgradeShip', (data) => { ... });
socket.on('getUpgrades', (data) => { ... });
socket.on('getGold', (data) => { ... });
socket.on('getLeaderboard', (data) => { ... });
socket.on('sendFriendRequest', (data) => { ... });
// ... etc for all Phase 3 events
```

### Initialize Systems on Startup

Add to server startup:

```javascript
import EconomySystem from "../src/systems/economy.js";
import { UpgradeSystem } from "../src/systems/upgrades.js";
import { AccountManager } from "../src/entities/account.js";
import { FriendsSystem } from "../src/systems/friends.js";
import { ClanSystem } from "../src/systems/clans.js";
import { LeaderboardSystem } from "../src/systems/leaderboards.js";
import { getDatabase } from "./database.js";

// Create system instances
const economy = new EconomySystem();
const upgrades = new UpgradeSystem();
const accountManager = new AccountManager();
const friends = new FriendsSystem();
const clans = new ClanSystem();
const leaderboards = new LeaderboardSystem();

// Initialize database and load data
const db = getDatabase();
await db.initialize();

// Load all accounts
const allAccounts = await db.loadAccounts();
allAccounts.forEach((acc) => {
  accountManager.registerAccount(acc);
  gameState.accounts.set(acc.playerId, acc);
});

// Load upgrades
const allUpgrades = await db.getAllUpgrades();
allUpgrades.forEach((upg) => {
  gameState.upgrades.set(upg.playerId, upg);
});

// Load gold amounts
const allGold = await db.getAllGold();
allGold.forEach((amount, playerId) => {
  gameState.gold.set(playerId, amount);
});

console.log("✅ Phase 3 systems initialized");
```

---

## 2. Network Manager Setup (`src/core/network.js`)

### What's Already Done

The network manager has been updated with:

- 11 new Phase 3 callbacks
- 11 new Phase 3 client methods
- `setupPhase3Events()` function to register all socket listeners

### Verify Setup

Check that `setupPhase2Events()` includes:

```javascript
setupPhase3Events(); // Called at end of Phase 2 setup
```

And verify these callbacks and methods exist:

```javascript
// Callbacks (set by game code):
this.onUpgradeSuccess = null;
this.onUpgradesData = null;
this.onGoldData = null;
this.onLeaderboardData = null;
this.onFriendRequestReceived = null;
this.onFriendRequestSent = null;
this.onFriendAdded = null;
this.onFriendsData = null;
this.onClanCreated = null;
this.onClanJoined = null;
this.onClanData = null;
this.onClanChatMessage = null;

// Methods (called by game code):
upgradeShip(upgradeType) { ... }
requestUpgrades() { ... }
requestGold() { ... }
requestLeaderboard(type, limit) { ... }
sendFriendRequest(targetPlayerId) { ... }
acceptFriendRequest(senderId) { ... }
requestFriends() { ... }
createClan(clanName) { ... }
joinClan(clanId) { ... }
getClanInfo(clanId) { ... }
sendClanChat(message) { ... }
```

### Setup Callbacks in Your Game

In `src/main.js` or your UI manager:

```javascript
import NetworkManager from "./core/network.js";

const networkManager = new NetworkManager(SERVER_URL);

// Economy/Upgrades
networkManager.onGoldData = (data) => {
  uiManager.updateGoldDisplay(data.amount);
  console.log(`💰 Gold: ${data.amount}`);
};

networkManager.onUpgradesData = (data) => {
  uiManager.updateUpgradePanel(data);
  console.log("⚔️ Upgrades:", data);
};

networkManager.onUpgradeSuccess = (data) => {
  console.log(`✅ Upgraded ${data.upgradeType} to level ${data.newLevel}`);
  uiManager.showUpgradeNotification(data);
};

// Leaderboards
networkManager.onLeaderboardData = (data) => {
  uiManager.updateLeaderboardDisplay(data.type, data.entries);
  console.log(`🏆 Leaderboard (${data.type}):`, data.entries);
};

// Friends
networkManager.onFriendRequestReceived = (data) => {
  uiManager.showFriendRequestNotification(data);
  console.log(`👤 Friend request from ${data.senderUsername}`);
};

networkManager.onFriendAdded = (data) => {
  console.log(`✅ Friend added: ${data.friendId}`);
  networkManager.requestFriends(); // Refresh list
};

networkManager.onFriendsData = (data) => {
  uiManager.updateFriendsList(data.friends);
  console.log("👥 Friends:", data.friends);
};

// Clans
networkManager.onClanCreated = (data) => {
  console.log(`✅ Clan created: ${data.clanName} (ID: ${data.clanId})`);
  uiManager.showClanPanel(data.clanId);
};

networkManager.onClanJoined = (data) => {
  console.log(`✅ Joined clan!`);
  networkManager.getClanInfo(data.clanId);
};

networkManager.onClanData = (data) => {
  uiManager.updateClanPanel({
    name: data.name,
    members: data.members,
    treasury: data.treasury,
    leaderId: data.leaderId,
  });
  console.log("⚔️ Clan:", data);
};

networkManager.onClanChatMessage = (data) => {
  uiManager.addClanChatMessage(data.senderName, data.message);
  console.log(`${data.senderName}: ${data.message}`);
};
```

---

## 3. Combat Event Integration

When ships hit or sink, award gold and update leaderboards:

```javascript
// In your combat system (systems/combat.js)

import { networkManager } from "../core/network.js";

class CombatSystem {
  onShipHit(attacker, defender, damageDealt) {
    // Award gold based on enemy ship size
    const gold = this.economy.awardHitGold(
      attacker.playerId,
      defender.shipSize,
    );
    console.log(`💰 +${gold}g for hit on ${defender.shipSize} ship`);

    // Update leaderboards
    this.leaderboards.updatePlayerDamage(
      attacker.playerId,
      attacker.stats.totalDamageDealt,
    );

    // Notify client
    networkManager.emit("goldUpdated", {
      playerId: attacker.playerId,
      goldAmount: gold,
      reason: `Hit ${defender.shipSize} ship`,
    });
  }

  onShipSunk(sinkerId, sunkShipSize) {
    // Award sinking gold
    const gold = this.economy.awardSinkGold(sinkerId, sunkShipSize);
    console.log(`💰 +${gold}g for sinking ${sunkShipSize} ship!`);

    // Update player stats
    const account = this.accountManager.getAccount(sinkerId);
    account.stats.totalShipsSunk++;
    account.updateLevel();

    // Update leaderboards
    this.leaderboards.updatePlayerKills(sinkerId, account.stats.totalKills);

    // Notify client
    networkManager.emit("playerLeveledUp", {
      playerId: sinkerId,
      newLevel: account.level,
    });
  }
}
```

---

## 4. Upgrade Shop Implementation

Create a UI for buying upgrades:

```javascript
// In your UI manager or HUD system

class UpgradeShop {
  constructor(networkManager, uiElement) {
    this.networkManager = networkManager;
    this.element = uiElement;
    this.setupUI();

    // Listen for upgrade data
    this.networkManager.onUpgradesData = (data) => {
      this.render(data);
    };
  }

  setupUI() {
    // Display upgrade list
    const upgradeTypes = [
      "cannon",
      "armor",
      "speed",
      "sails",
      "health",
      "fireRate",
    ];

    upgradeTypes.forEach((type) => {
      const upgradeCard = this.createUpgradeCard(type);
      this.element.appendChild(upgradeCard);
    });
  }

  createUpgradeCard(type) {
    const card = document.createElement("div");
    card.className = "upgrade-card";
    card.innerHTML = `
      <h3>${type.toUpperCase()}</h3>
      <div class="upgrade-level">Level: <span class="level">-</span>/5</div>
      <div class="upgrade-cost">Cost: <span class="cost">-</span>g</div>
      <button class="upgrade-btn" data-type="${type}">Upgrade</button>
    `;

    card.querySelector(".upgrade-btn").addEventListener("click", () => {
      this.networkManager.upgradeShip(type);
    });

    return card;
  }

  render(upgradesData) {
    // Update each card with current level and cost
    for (const [type, level] of Object.entries(upgradesData)) {
      const card = this.element.querySelector(`[data-type="${type}"]`);
      if (!card) continue;

      card.querySelector(".level").textContent = level;

      if (level < 5) {
        // Calculate next upgrade cost
        const costs = {
          cannon: 500,
          armor: 400,
          speed: 600,
          sails: 450,
          health: 350,
          fireRate: 550,
        };
        const baseCost = costs[type];
        const nextCost = Math.floor(baseCost * Math.pow(1.5, level));
        card.querySelector(".cost").textContent = nextCost;
        card.querySelector(".upgrade-btn").disabled = false;
      } else {
        card.querySelector(".cost").textContent = "MAX";
        card.querySelector(".upgrade-btn").disabled = true;
      }
    }
  }
}
```

---

## 5. Leaderboard Display

Show rankings to players:

```javascript
class LeaderboardPanel {
  constructor(networkManager, uiElement) {
    this.networkManager = networkManager;
    this.element = uiElement;
    this.setupTabs();

    this.networkManager.onLeaderboardData = (data) => {
      this.render(data);
    };
  }

  setupTabs() {
    const types = [
      "kills",
      "damage",
      "wealth",
      "shipsSunk",
      "winRate",
      "level",
      "clans",
    ];
    const tabContainer = document.createElement("div");
    tabContainer.className = "leaderboard-tabs";

    types.forEach((type) => {
      const tab = document.createElement("button");
      tab.textContent = type.toUpperCase();
      tab.addEventListener("click", () => {
        this.networkManager.requestLeaderboard(type, 100);
      });
      tabContainer.appendChild(tab);
    });

    this.element.appendChild(tabContainer);

    // Request initial leaderboard
    this.networkManager.requestLeaderboard("kills", 100);
  }

  render(data) {
    const table = document.createElement("table");
    table.className = "leaderboard-table";

    const header = table.createTHead();
    header.innerHTML = `
      <tr>
        <th>Rank</th>
        <th>Player</th>
        <th>Score</th>
      </tr>
    `;

    const body = table.createTBody();
    data.entries.forEach((entry, index) => {
      const row = body.insertRow();
      row.innerHTML = `
        <td>${entry.rank}</td>
        <td>${entry.username}</td>
        <td>${entry.score}</td>
      `;
    });

    // Replace old table
    const oldTable = this.element.querySelector("table");
    if (oldTable) oldTable.remove();
    this.element.appendChild(table);
  }
}
```

---

## 6. Friends System Integration

Implement friend management:

```javascript
class FriendsPanel {
  constructor(networkManager, uiElement) {
    this.networkManager = networkManager;
    this.element = uiElement;

    // Setup event listeners
    this.networkManager.onFriendsData = (data) => {
      this.renderFriendsList(data.friends);
    };

    this.networkManager.onFriendRequestReceived = (data) => {
      this.showFriendRequest(data.senderId, data.senderUsername);
    };

    this.networkManager.onFriendAdded = (data) => {
      this.networkManager.requestFriends(); // Refresh list
    };

    this.setupUI();
    this.networkManager.requestFriends(); // Initial load
  }

  setupUI() {
    this.element.innerHTML = `
      <div class="friends-header">
        <h3>Friends</h3>
        <input type="text" class="friend-search" placeholder="Search or add friend ID...">
        <button class="add-friend-btn">Add Friend</button>
      </div>
      <div class="friends-list"></div>
      <div class="pending-requests"></div>
    `;

    this.element
      .querySelector(".add-friend-btn")
      .addEventListener("click", () => {
        const id = this.element.querySelector(".friend-search").value;
        this.networkManager.sendFriendRequest(id);
      });
  }

  renderFriendsList(friends) {
    const list = this.element.querySelector(".friends-list");
    list.innerHTML = "";

    friends.forEach((friend) => {
      const friendEl = document.createElement("div");
      friendEl.className = `friend-item ${friend.online ? "online" : "offline"}`;
      friendEl.innerHTML = `
        <span>${friend.username}</span>
        <span class="status">${friend.online ? "🟢" : "⚫"}</span>
      `;
      list.appendChild(friendEl);
    });
  }

  showFriendRequest(senderId, senderUsername) {
    const request = document.createElement("div");
    request.className = "friend-request";
    request.innerHTML = `
      <span>${senderUsername} sent you a friend request</span>
      <button class="accept-btn">Accept</button>
      <button class="reject-btn">Reject</button>
    `;

    request.querySelector(".accept-btn").addEventListener("click", () => {
      this.networkManager.acceptFriendRequest(senderId);
      request.remove();
    });

    request.querySelector(".reject-btn").addEventListener("click", () => {
      request.remove();
    });

    this.element.querySelector(".pending-requests").appendChild(request);
  }
}
```

---

## 7. Clan System Integration

Set up clan management:

```javascript
class ClanPanel {
  constructor(networkManager, uiElement) {
    this.networkManager = networkManager;
    this.element = uiElement;

    this.networkManager.onClanCreated = (data) => {
      alert(`✅ Clan "${data.clanName}" created!`);
    };

    this.networkManager.onClanData = (data) => {
      this.renderClanInfo(data);
    };

    this.networkManager.onClanChatMessage = (data) => {
      this.addChatMessage(data.senderName, data.message);
    };

    this.setupUI();
  }

  setupUI() {
    this.element.innerHTML = `
      <div class="clan-header">
        <h3>Clan</h3>
        <button class="create-clan-btn">Create Clan</button>
      </div>
      <div class="clan-info"></div>
      <div class="clan-chat">
        <div class="chat-messages"></div>
        <input type="text" class="chat-input" placeholder="Type message...">
        <button class="send-btn">Send</button>
      </div>
    `;

    this.element
      .querySelector(".create-clan-btn")
      .addEventListener("click", () => {
        const name = prompt("Clan name:");
        if (name) {
          this.networkManager.createClan(name);
        }
      });

    this.element.querySelector(".send-btn").addEventListener("click", () => {
      const input = this.element.querySelector(".chat-input");
      if (input.value.trim()) {
        this.networkManager.sendClanChat(input.value);
        input.value = "";
      }
    });
  }

  renderClanInfo(clanData) {
    const info = this.element.querySelector(".clan-info");
    info.innerHTML = `
      <h4>${clanData.name}</h4>
      <p>Members: ${clanData.members.length}/50</p>
      <p>Treasury: ${clanData.treasury}g</p>
      <ul>
        ${clanData.members.map((m) => `<li>${m.username} (${m.role})</li>`).join("")}
      </ul>
    `;
  }

  addChatMessage(senderName, message) {
    const messagesDiv = this.element.querySelector(".chat-messages");
    const msgEl = document.createElement("div");
    msgEl.className = "chat-message";
    msgEl.innerHTML = `<strong>${senderName}:</strong> ${message}`;
    messagesDiv.appendChild(msgEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
}
```

---

## 8. Persistence Setup

### Save Player Data Periodically

Add to your game loop or timer:

```javascript
async function autoSavePlayerData() {
  const db = getDatabase();

  // Get current player
  const playerId = networkManager.playerId;

  // Save account
  const account = accountManager.getAccount(playerId);
  if (account) {
    await db.saveAccount(playerId, account.toJSON());
  }

  // Save upgrades
  const playerUpgrades = upgrades.getAllUpgrades(playerId);
  if (playerUpgrades) {
    await db.saveUpgrades(playerId, playerUpgrades);
  }

  // Save gold
  const gold = economy.getPlayerGold(playerId);
  if (gold) {
    await db.saveGold(playerId, gold);
  }

  console.log("💾 Auto-saved player data");
}

// Run every 60 seconds
setInterval(autoSavePlayerData, 60000);
```

### Load Player Data on Login

```javascript
async function loadPlayerData(playerId) {
  const db = getDatabase();

  // Load account
  const account = await db.loadAccount(playerId);
  accountManager.registerAccount(account);

  // Load upgrades
  const playerUpgrades = await db.loadUpgrades(playerId);
  upgrades.importUpgrades(playerUpgrades);

  // Load gold
  const gold = await db.loadGold(playerId);
  economy.setPlayerGold(playerId, gold);

  console.log("✅ Player data loaded");
}
```

---

## 9. Troubleshooting

### Issue: Gold not updating

**Check:**

- Verify `networkManager.onGoldData` callback is set
- Confirm server is emitting `goldData` events
- Check network tab for message transmission

### Issue: Upgrades not applying

**Check:**

- Verify `upgradePlayer()` returns success
- Confirm `getPlayerStats()` applies multipliers
- Check that ship stats are being updated from multipliers

### Issue: Friends not showing

**Check:**

- Verify `networkManager.onFriendsData` is set
- Confirm server has friends data in gameState
- Check that friendship requests completed successfully

### Issue: Clan chat not working

**Check:**

- Verify player is in clan (has clanId)
- Confirm server is broadcasting to clan members
- Check socket connection is active

### Issue: Leaderboards empty

**Check:**

- Verify leaderboards system has data
- Confirm server is sending leaderboard data
- Check that player stats are being updated

---

## 10. Performance Notes

### Database Concerns

- **In-Memory:** Current implementation stores everything in RAM
- **Scaling:** Design ready for MongoDB/PostgreSQL
- **Auto-Save:** 60-second interval prevents data loss

### Network Optimization

- **Leaderboards:** Query only top 100 initially, load more on demand
- **Friends:** Cache local copy to avoid repeated queries
- **Clan Chat:** Could batch messages (future optimization)

### Upgrade Calculation

- **Cost Formula:** Pre-calculate next cost instead of computing each frame
- **Stat Multipliers:** Cache in player object, update on upgrade only

---

## 11. Next Steps

### Immediate

1. Test each system in isolation
2. Verify database persistence
3. Add UI for all Phase 3 features
4. Load test with multiple players

### Short Term

1. Add seasonal leaderboard resets
2. Implement cosmetics shop integration
3. Add achievement system
4. Create clan wars framework

### Future (Phase 4+)

1. Boarding & melee combat
2. Advanced social features
3. Guilds and territory
4. Mobile optimization

---

## Quick Reference

### Network Manager Methods

```javascript
// Economy
networkManager.requestGold();
networkManager.requestUpgrades();
networkManager.upgradeShip("cannon");

// Social
networkManager.sendFriendRequest(playerId);
networkManager.acceptFriendRequest(senderId);
networkManager.requestFriends();

// Clans
networkManager.createClan("Clan Name");
networkManager.joinClan(clanId);
networkManager.getClanInfo(clanId);
networkManager.sendClanChat("Message");

// Rankings
networkManager.requestLeaderboard("kills", 100);
```

### Callbacks to Implement

```javascript
networkManager.onGoldData = (data) => {};
networkManager.onUpgradesData = (data) => {};
networkManager.onUpgradeSuccess = (data) => {};
networkManager.onLeaderboardData = (data) => {};
networkManager.onFriendsData = (data) => {};
networkManager.onFriendRequestReceived = (data) => {};
networkManager.onClanData = (data) => {};
networkManager.onClanChatMessage = (data) => {};
```

---

**Phase 3 Integration Complete!**

All systems are ready to use. Follow the sections above to integrate into your game interface and combat systems. Good luck! ⚔️
