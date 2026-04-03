# SQL Database Setup Guide

## Overview

ShipStrike-3D now uses **SQL databases** instead of MongoDB:

- **Development**: SQLite via **sql.js** (JavaScript implementation, no compilation needed!)
- **Production**: PostgreSQL (recommended for scalability)

## Quick Start (SQLite - Development)

SQLite is the default and requires **zero additional setup**:

```bash
npm install
npm run dev:server
```

That's it! A `shipstrike.db` file will be created automatically in the `server/` folder.

### Why sql.js?

- ✅ No native dependencies (no Visual Studio needed!)
- ✅ Pure JavaScript SQLite engine
- ✅ Works on any platform
- ✅ Perfect for development

---

## Production Setup (PostgreSQL)

### Prerequisites

- PostgreSQL installed and running
- Database credentials ready

### 1. Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE shipstrike;
```

### 2. Update Server Configuration

Edit `server/.env.local`:

```env
USE_SQLITE=false
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shipstrike
```

### 3. Install Dependencies

```bash
cd server
npm install
```

### 4. Start Server

```bash
npm run dev
# Tables will be created automatically
```

---

## Database Schema

### Tables Created Automatically

1. **accounts** - Player account data
   - playerId (PRIMARY KEY)
   - username (UNIQUE)
   - email, createdAt, lastLogin
   - level, experience

2. **gold** - Player currency
   - playerId (FOREIGN KEY)
   - amount

3. **upgrades** - Ship upgrades
   - playerId (FOREIGN KEY)
   - hull, cannons, speed, crew levels

4. **friends** - Player friendships
   - playerId, friendId (COMPOUND PRIMARY KEY)
   - addedAt timestamp

5. **clans** - Clan data
   - clanId (PRIMARY KEY)
   - name, leader, description
   - members count

6. **clan_members** - Clan membership
   - playerId (FOREIGN KEY)
   - clanId (FOREIGN KEY)
   - role, joinedAt

7. **leaderboard** - Player rankings
   - playerId (FOREIGN KEY)
   - kills, deaths, wins, matches
   - rank, lastUpdated

8. **ships** - Ship persistence
   - shipId (PRIMARY KEY)
   - playerId (FOREIGN KEY)
   - name, health, level

---

## Using Database in Code

### Save Data

```javascript
// Save account
await gameState.database.saveAccount(playerId, {
  username: "PlayerName",
  email: "player@example.com",
  level: 1,
  experience: 0,
});

// Save gold
await gameState.database.saveGold(playerId, 5000);

// Save upgrades
await gameState.database.saveUpgrades(playerId, {
  hull: 1,
  cannons: 2,
  speed: 1,
  crew: 0,
});

// Save clan
await gameState.database.saveClan(clanId, {
  name: "Dragon Slayers",
  leader: playerId,
  description: "Elite PvP clan",
});
```

### Load Data

```javascript
// Load account
const account = await gameState.database.loadAccount(playerId);

// Load gold
const goldAmount = await gameState.database.loadGold(playerId);

// Load upgrades
const upgrades = await gameState.database.loadUpgrades(playerId);

// Load clan
const clan = await gameState.database.loadClan(clanId);

// Get leaderboard
const leaderboard = await gameState.database.getLeaderboard(100);
```

### Update Stats

```javascript
// Update leaderboard/player stats
await gameState.database.updateLeaderboard(playerId, {
  kills: 25,
  deaths: 5,
  wins: 10,
  matches: 15,
  rank: 1,
});
```

---

## Switching Between SQLite and PostgreSQL

### Development → Production

1. Update `server/.env.local`
2. Set `USE_SQLITE=false`
3. Configure PostgreSQL credentials
4. Restart server (tables created automatically)

### Production → Development

1. Revert `server/.env.local`
2. Set `USE_SQLITE=true`
3. Delete old `shipstrike.db` if needed
4. Restart server

---

## Backup & Export

### SQLite

```bash
# Backup
cp server/shipstrike.db server/shipstrike.db.backup

# Export to CSV
sqlite3 server/shipstrike.db
> .mode csv
> .output accounts.csv
> SELECT * FROM accounts;
> .quit
```

### PostgreSQL

```bash
# Backup
pg_dump -U postgres -d shipstrike > shipstrike_backup.sql

# Restore
psql -U postgres -d shipstrike < shipstrike_backup.sql

# Export table to CSV
\copy (SELECT * FROM accounts) TO 'accounts.csv' WITH (FORMAT csv, HEADER true);
```

---

## Performance Tips

### Indexes

Indexes are automatically created on frequently queried columns:

- accounts.username
- friends.playerId
- clan_members.clanId
- leaderboard.rank

### Connection Pooling (PostgreSQL)

For production, consider using a connection pool:

```javascript
// In database.js, can extend Pool configuration:
new Pool({
  max: 20, // max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Caching (Optional)

For frequently accessed data (leaderboard, top players), add Redis caching layer.

---

## Troubleshooting

### Error: "SQLITE_CANTOPEN"

- Check file permissions in `server/` folder
- Ensure folder exists and is writable

### Error: "Connection refused" (PostgreSQL)

- Verify PostgreSQL is running
- Check credentials in `.env.local`
- Test with: `psql -U postgres -d shipstrike`

### Error: "Table already exists"

- Normal on first run, tables auto-create
- Safe to ignore if using `IF NOT EXISTS`

---

## Next Steps

1. ✅ Choose SQLite (dev) or PostgreSQL (production)
2. ✅ Update `server/.env.local`
3. ✅ Install dependencies (`npm install`)
4. ✅ Start server (`npm run dev:server`)
5. ✅ Integrate database calls in socket handlers
