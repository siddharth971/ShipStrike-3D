# Phase 3 Implementation Guide: Progression & Economy Systems

## Overview

Phase 3 transforms ShipStrike-3D from a pure combat game into a full progression ecosystem with economy, upgrades, social systems, and player persistence. Players now earn gold through combat, upgrade their ships, manage friends and clans, and compete on global leaderboards.

---

## Systems Created (7 Total)

### 1. **Economy System** (`src/systems/economy.js`) - 300+ lines

**Purpose:** Track and reward gold for player actions

**Features:**

- Gold rewards for different actions:
  - Hitting ships (15-50 gold based on size)
  - Sinking ships (150-500 gold based on size)
  - Team objectives (200 gold)
  - Defensive actions (100 gold)
  - Assists (50 gold)
- Transaction logging system
- Wealth rankings
- Per-player session statistics
- Data export/import for persistence

**API:**

```javascript
const economy = new EconomySystem();

// Award gold for actions
economy.awardHitGold(playerId, "medium");
economy.awardSinkGold(playerId, "large");
economy.awardTeamObjectiveGold(playerId);

// Deduct gold (for purchases)
const result = economy.deductGold(playerId, 500, "upgrade_cannon");

// Get player data
const gold = economy.getPlayerGold(playerId);
const stats = economy.getSessionStats(playerId);
const ranking = economy.getWealthRanking(); // Top 100 richest players
```

---

### 2. **Upgrade System** (`src/systems/upgrades.js`) - 350+ lines

**Purpose:** Allow players to pay gold for ship stat improvements

**Features:**

- 6 upgrade types with 5 levels each:
  - **Cannon Damage** - 20% per level (costs 500, 750, 1125, ...)
  - **Ship Armor** - 15% reduction per level (costs 400, ...)
  - **Ship Speed** - 25% per level (costs 600, ...)
  - **Sail Efficiency** - 18% per level (costs 450, ...)
  - **Ship Hull** - 30% HP per level (costs 350, ...)
  - **Fire Rate** - 3 levels, 25% per level (costs 550, ...)
- Multiplier cost scaling (1.5x per level)
- Effective stat calculations
- Progress tracking
- Total investment logging
- Data persistence

**API:**

```javascript
const upgrades = new UpgradeSystem();

// Upgrade a stat
const result = upgrades.upgradePlayer(playerId, "cannon", currentGold, economy);
// Returns: { success, upgradeType, oldLevel, newLevel, cost, effect }

// Get upgrade levels
const level = upgrades.getUpgradeLevel(playerId, "cannon"); // 0-5
const allUpgrades = upgrades.getAllUpgrades(playerId); // { cannon: 3, armor: 1, ... }

// Calculate effective stats
const stats = upgrades.getPlayerStats(playerId, baseStats);
// Returns modified stats based on upgrades

// Get progress
const progress = upgrades.getUpgradeProgress(playerId);
// { cannon: { currentLevel: 2, maxLevel: 5, percentage: 40, nextCost: 1125 }, ... }
```

---

### 3. **Account/Profile System** (`src/entities/account.js`) - 400+ lines

**Purpose:** Store player persistent data and statistics

**Features:**

- Player account creation and management
- Game statistics tracking:
  - Total gold, kills, ships sunk, damage dealt/received
  - Shots fired, hit ratio, accuracy
  - Games played, total playtime, deaths
- Social connections (friends, clan membership)
- Level progression (based on gold earned)
- Achievements and badges system
- Player preferences (theme, volume, language, etc.)
- Cosmetics ownership and active selection
- Profile export/import for database

**API:**

```javascript
const accountManager = new AccountManager();

// Create or get account
const account = accountManager.getOrCreateAccount(playerId, username, email);

// Add friends
account.addFriend(friendId);
account.removeFriend(friendId);
account.isFriend(friendId);

// Set clan
account.setClan(clanId, "member");

// Update from game session
account.updateFromSession({
  goldEarned: 500,
  kills: 3,
  damageDealt: 150,
  playtime: 1800, // seconds
});

// Get profile
const profile = account.getProfile();
// { username, level, stats, friendCount, achievements, badges }

// Statistics
const hitRatio = account.getHitRatio();
const avgDamage = account.getAvgDamagePerShot();
```

---

### 4. **Database Persistence Layer** (`server/database.js`) - 300+ lines

**Purpose:** Persistent storage for all player data

**Features:**

- In-memory storage (ready for MongoDB/PostgreSQL replacement)
- Account persistence
- Upgrade tracking
- Gold amounts
- Friends/clan relationships
- Leaderboard data
- Auto-save every 60 seconds
- Transaction logging
- Batch operations
- Data export/import

**API:**

```javascript
import { getDatabase } from "./database.js";

const db = getDatabase();
await db.initialize();

// Accounts
await db.saveAccount(playerId, accountData);
const account = await db.loadAccount(playerId);

// Upgrades
await db.saveUpgrades(playerId, upgradeData);
const upgrades = await db.loadUpgrades(playerId);

// Gold
await db.saveGold(playerId, amount);
const gold = await db.loadGold(playerId);

// Friends
await db.saveFriends(playerId, [friendIds]);
const friends = await db.loadFriends(playerId);

// Clans
await db.createClan(clanId, clanData);
await db.updateClan(clanId, updates);
const clan = await db.loadClan(clanId);

// Leaderboards
await db.updateLeaderboard("kills", playerData);
const board = await db.getLeaderboard("kills", limit);
const rank = await db.getPlayerRank("kills", playerId);
```

---

### 5. **Friends System** (`src/systems/friends.js`) - 350+ lines

**Purpose:** Manage player social connections

**Features:**

- Friend requests (send, accept, reject)
- Bidirectional friendship validation
- Block/unblock system
- Friend count tracking
- Pending request management
- Online status (when friends are online)
- Friend list with roles
- Data persistence

**API:**

```javascript
const friends = new FriendsSystem();

// Friend requests
friends.sendFriendRequest(senderId, receiverId); // pending
friends.acceptFriendRequest(receiverId, senderId); // accepted
friends.rejectFriendRequest(receiverId, senderId);

// Manage friendships
friends.removeFriend(playerId, friendId);
const areWeFriends = friends.areFriends(playerId, friendId);

// Block/unblock
friends.blockPlayer(playerId, blockedId);
friends.unblockPlayer(playerId, blockedId);

// Get data
const friendsList = friends.getPlayerFriends(playerId);
const pendingRequests = friends.getPlayerPendingRequests(playerId);
const blocked = friends.getBlockedPlayers(playerId);
const friendCount = friends.getFriendCount(playerId);
```

---

### 6. **Clan System** (`src/systems/clans.js`) - 450+ lines

**Purpose:** Enable team organization and cooperation

**Features:**

- Clan creation with leader designation
- Member management (add, remove, promote)
- Role system: leader, officer, member
- Join policies: open, invite-only, leadership
- Clan treasury (shared gold pool)
- Announcements board
- Clan statistics (aggregate kills, ships sunk, wars, wins)
- Clan leveling (based on activity)
- Member permissions
- Clan search
- Data persistence

**API:**

```javascript
const clans = new ClanSystem();

// Create clan
clans.createClan(clanId, "My Clan", leaderId, "A cool clan");

// Manage members
clans.requestJoinClan(playerId, clanId); // open clans
clans.acceptJoinRequest(leaderId, playerId, clanId);
clans.kickMember(leaderId, playerId, clanId);

// Role management
const clan = clans.getClan(clanId);
clan.setMemberRole(playerId, "officer");

// Treasury
clan.addTreasury(500); // Add gold
clan.withdrawTreasury(100); // Withdraw gold

// Announcements
clan.postAnnouncement("War!", "Get ready to battle", leaderId);
const announcements = clan.getAnnouncements(10);

// Statistics
clan.updateStats({ gold: 500, kills: 3, shipsSunk: 1, warWon: true });

// Get data
const info = clan.getInfo();
const members = clan.getMembers();
const clanOfPlayer = clans.getPlayerClan(playerId);
```

---

### 7. **Leaderboard System** (`src/systems/leaderboards.js`) - 350+ lines

**Purpose:** Track and display player rankings

**Features:**

- 7 leaderboard types:
  - **Kills** - Total kills
  - **Damage** - Total damage dealt
  - **Wealth** - Total gold earned
  - **Ships Sunk** - Ships destroyed
  - **Win Rate** - Win percentage
  - **Level** - Player level
  - **Clans** - Clan aggregate score
- Real-time ranking updates
- Top players across all boards
- Player rank queries (with percentile)
- Nearby ranks display (context around player)
- Seasonal leaderboards (for future implementation)
- Data persistence
- Top 1000 per leaderboard

**API:**

```javascript
const leaderboards = new LeaderboardSystem();

// Update player stats
leaderboards.updatePlayerKills(playerId, totalKills);
leaderboards.updatePlayerDamage(playerId, totalDamage);
leaderboards.updatePlayerWealth(playerId, totalGold);
leaderboards.updatePlayerWinRate(playerId, wins, totalGames);

// Update clan
leaderboards.updateClanScore(clanId, score);

// Get leaderboards
const topKillers = leaderboards.getLeaderboard("kills", (limit = 100));
// Returns: Array<{ rank, playerId, username, score }>

// Get player's rank
const rank = leaderboards.getPlayerRank(playerId, "kills");
// Returns: { rank: 42, score: 150, outOfTotal: 5000, percentile: 99.2 }

// Get ranks across all boards
const allRanks = leaderboards.getPlayerRanks(playerId);

// Context around player (for display)
const context = leaderboards.getNearbyRanks(playerId, "kills", (distance = 5));

// Top players across all
const topPlayers = leaderboards.getTopPlayers(10);
// { topKillers, topDamagers, wealthiest }
```

---

## Network Protocol (Phase 3)

### Client → Server Events

| Event                 | Data           | Purpose               |
| --------------------- | -------------- | --------------------- |
| `upgradeShip`         | upgradeType    | Purchase ship upgrade |
| `getUpgrades`         | -              | Request upgrade data  |
| `getGold`             | -              | Request gold amount   |
| `getLeaderboard`      | type, limit    | Request leaderboard   |
| `sendFriendRequest`   | targetPlayerId | Send friend request   |
| `acceptFriendRequest` | senderId       | Accept request        |
| `getFriends`          | -              | Request friends list  |
| `createClan`          | clanName       | Create clan           |
| `joinClan`            | clanId         | Join clan             |
| `getClanInfo`         | clanId         | Get clan data         |
| `clanChat`            | message        | Send clan message     |

### Server → Client Events

| Event                   | Data                            | Purpose                   |
| ----------------------- | ------------------------------- | ------------------------- |
| `upgradeSuccess`        | upgradeType, newLevel, cost     | Upgrade completed         |
| `upgradesData`          | upgrades{}                      | Upgrade levels            |
| `goldData`              | gold                            | Current gold amount       |
| `leaderboardData`       | type, entries[]                 | Leaderboard data          |
| `friendRequestReceived` | senderId, senderUsername        | Incoming request          |
| `friendRequestSent`     | targetPlayerId                  | Request sent confirmation |
| `friendAdded`           | friendId                        | Friendship established    |
| `friendsData`           | friends[]                       | Friends list              |
| `clanCreated`           | clanId, clanName                | Clan created              |
| `clanJoined`            | clanId                          | Joined clan               |
| `clanData`              | clanId, name, members, treasury | Clan info                 |
| `clanChatMessage`       | senderName, message             | Clan chat                 |

---

## Integration Guide

### Step 1: Initialize Phase 3 Systems

```javascript
import EconomySystem from "./systems/economy.js";
import { UpgradeSystem } from "./systems/upgrades.js";
import { AccountManager } from "./entities/account.js";
import { FriendsSystem } from "./systems/friends.js";
import { ClanSystem } from "./systems/clans.js";
import { LeaderboardSystem } from "./systems/leaderboards.js";

const economy = new EconomySystem();
const upgrades = new UpgradeSystem();
const accountManager = new AccountManager();
const friends = new FriendsSystem();
const clans = new ClanSystem();
const leaderboards = new LeaderboardSystem();

// Load from database on server startup
// await db.loadAll() -> populate systems
```

### Step 2: Track Combat Events

```javascript
// When player hits target
function onShipHit(shooter, target, damage) {
  economy.awardHitGold(shooter.id, target.size); // 'small', 'medium', 'large'
  leaderboards.updatePlayerDamage(shooter.id, shooter.stats.totalDamage);

  networkManager.emit("goldUpdated", {
    playerId: shooter.id,
    amount: economy.getPlayerGold(shooter.id),
  });
}

// When ship sinks
function onShipSunk(sinkerId, sunkShip) {
  economy.awardSinkGold(sinkerId, sunkShip.size);
  leaderboards.updatePlayerKills(sinkerId, sinkerId.stats.kills);

  // Update account
  const account = accountManager.getAccount(sinkerId);
  account.stats.totalShipsSunk++;
  account.updateLevel();
}
```

### Step 3: Handle Upgrades

```javascript
// When player tries to upgrade
function onUpgradeRequest(playerId, upgradeType) {
  const currentGold = economy.getPlayerGold(playerId);

  const result = upgrades.upgradePlayer(
    playerId,
    upgradeType,
    currentGold,
    economy,
  );

  if (result.success) {
    console.log(`✅ Upgrade: ${result.upgradeType} to ${result.newLevel}`);

    // Update player's ship stats
    const playerStats = upgrades.getPlayerStats(playerId);
    // Apply to player's ship
    playerShip.cannonDamage = playerStats.cannonDamage;
    playerShip.maxSpeed = playerStats.speed;

    networkManager.emit("upgradeSuccess", result);
  }
}
```

### Step 4: Setup Social System

```javascript
// When player sends friend request
netw orkManager.onFriendRequestReceived = (data) => {
  // Show incoming request UI
  showFriendRequestPopup(data.senderUsername, data.senderId);
};

// When player accepts
networkManager.acceptFriendRequest(senderId);

// When player wants to see friends
networkManager.requestFriends();
networkManager.onFriendsData = (data) => {
  updateFriendsList(data.friends); // Show in UI
};
```

### Step 5: Setup Clans

```javascript
// Create clan
networkManager.createClan("My Awesome Clan");
networkManager.onClanCreated = (data) => {
  showClanUI(data.clanId);
};

// Join clan
networkManager.joinClan(clanId);

// Get clan info
networkManager.getClanInfo(clanId);
networkManager.onClanData = (data) => {
  updateClanPanel(data);
};

// Clan chat
networkManager.sendClanChat("Let's fight the Red Team!");
networkManager.onClanChatMessage = (data) => {
  addMessageToClanChat(data.senderName, data.message);
};
```

### Step 6: Display Leaderboards

```javascript
// Get leaderboard
networkManager.requestLeaderboard("kills", 100);
networkManager.onLeaderboardData = (data) => {
  createLeaderboardTable(data.entries);
};

// Or get player's rank
networkManager.requestLeaderboard("kills", 1000); // Get top 1000
// Find player in list or calculate percentile
```

---

## Data Persistence

### Save to Database

On the server, periodically save:

```javascript
// Every player update
await db.saveAccount(playerId, account.toJSON());
await db.saveUpgrades(playerId, upgrades.exportData());
await db.saveGold(playerId, economy.getPlayerGold(playerId));
await db.saveFriends(playerId, friends.getPlayerFriends(playerId));

// When clan updated
await db.updateClan(clanId, clan.toJSON());

// Leaderboards (periodic)
for (const type of ["kills", "damage", "wealth"]) {
  const board = leaderboards.getLeaderboard(type);
  await db.updateLeaderboard(type, board);
}
```

### Load from Database

On server startup:

```javascript
const allAccounts = await db.getAllAccounts();
const allUpgrades = await db.getAllUpgrades();

allAccounts.forEach((account) => {
  accountManager.registerAccount(account);
});

allUpgrades.forEach((upgrades) => {
  upgradeSystem.importUpgrades(upgrades);
});
```

---

## Configuration

### Economy Rewards

- Change in `EconomySystem.goldRewards`
- Adjust hit/sink bonuses, team objective rewards

### Upgrade Costs

- List in `UpgradeSystem.upgradeTypes`
- Base cost and multiplier per upgrade type

### Clan Settings

- Default `maxMembers: 50`
- Join policies: open, invite-only, leadership

### Leaderboard

- Update frequency: real-time
- Keep top 1000 per board
- Seasonal reset (ready for implementation)

---

## Testing Checklist

### Economy

- [ ] Gold awarded for hits
- [ ] Gold awarded for sinks
- [ ] Transactions logged correctly
- [ ] Wealth ranking works
- [ ] Session stats calculate correctly

### Upgrades

- [ ] Costs calculate with multiplier
- [ ] Can upgrade up to level 5
- [ ] Gold deducted correctly
- [ ] Stats updated after upgrade
- [ ] Progress displays accurately

### Accounts

- [ ] Accounts persist between sessions
- [ ] Stats update from sessions
- [ ] Level increases with gold
- [ ] Achievements can be added
- [ ] Preferences saved

### Friends

- [ ] Friend requests send/accept
- [ ] Friendships bidirectional
- [ ] Block/unblock works
- [ ] Friend list updates
- [ ] Online status shows

### Clans

- [ ] Clans created successfully
- [ ] Members can join
- [ ] Leader can manage roles
- [ ] Treasury tracked
- [ ] Announcements posted
- [ ] Chat works in clan

### Leaderboards

- [ ] Stats update in real-time
- [ ] Rankings calculated correctly
- [ ] Rankings sorted by score
- [ ] Percentile calculated
- [ ] Multiple board types work

---

## Next Steps (Phase 4)

1. **Boarding & Melee Combat** - Ship boarding system with sword fights
2. **Helper Bot** - NPC crew that automates sailing
3. **Cosmetics Shop** - Paid cosmetics (ship skins, sail colors, etc.)
4. **Advanced Persistence** - MongoDB/PostgreSQL integration
5. **Seasons** - Seasonal leaderboards with resets
6. **Guilds Wars** - Clan vs clan battles

---

**Created:** Phase 3 Implementation  
**Total New Code:** ~2,300 lines  
**Total New Systems:** 7  
**Network Events:** 22 (11 client→server, 11 server→client)
