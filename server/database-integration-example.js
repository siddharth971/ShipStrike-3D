// server/database-integration-example.js
// Example of how to use the SQL database with socket.io events

/**
 * EXAMPLE: Using the database in socket handlers
 * 
 * In your gameServer.js, the database is available as:
 *   gameState.database
 * 
 * You can use it in socket.io event handlers like this:
 */

// =================== EXAMPLE: Player Authentication ===================

// When player reaches login/join game
/*
io.on('connection', (socket) => {
  
  socket.on('authenticate', async (data) => {
    const { playerId, username } = data;
    
    try {
      // 1. Saveplayer account
      await gameState.database.saveAccount(playerId, {
        username: username,
        email: data.email || null,
        level: 1,
        experience: 0
      });
      
      // 2. Initialize player gold
      await gameState.database.saveGold(playerId, 1000);
      
      // 3. Initialize upgrades
      await gameState.database.saveUpgrades(playerId, {
        hull: 0,
        cannons: 0,
        speed: 0,
        crew: 0
      });
      
      console.log(`✅ Player ${username} (${playerId}) authenticated and saved to database`);
      socket.emit('authenticated', { success: true, playerId });
      
    } catch (error) {
      console.error('Authentication error:', error);
      socket.emit('error', { message: 'Authentication failed' });
    }
  });
  
  // =================== EXAMPLE: Load Player Data ===================
  
  socket.on('loadPlayerData', async (playerId) => {
    try {
      // Load all player data
      const account = await gameState.database.loadAccount(playerId);
      const gold = await gameState.database.loadGold(playerId);
      const upgrades = await gameState.database.loadUpgrades(playerId);
      
      if (!account) {
        socket.emit('error', { message: 'Player not found' });
        return;
      }
      
      socket.emit('playerDataLoaded', {
        account,
        gold,
        upgrades
      });
      
    } catch (error) {
      console.error('Load error:', error);
      socket.emit('error', { message: 'Failed to load player data' });
    }
  });
  
  // =================== EXAMPLE: Save Upgrades ===================
  
  socket.on('buyUpgrade', async (data) => {
    const { playerId, upgradeType } = data;
    
    try {
      // Load current gold and upgrades
      const gold = await gameState.database.loadGold(playerId);
      const upgrades = await gameState.database.loadUpgrades(playerId);
      
      const upgradeCost = 500; // Cost per upgrade
      
      if (gold < upgradeCost) {
        socket.emit('upgradeFailed', { message: 'Not enough gold' });
        return;
      }
      
      // Deduct gold and upgrade
      await gameState.database.saveGold(playerId, gold - upgradeCost);
      
      upgrades[upgradeType] = (upgrades[upgradeType] || 0) + 1;
      await gameState.database.saveUpgrades(playerId, upgrades);
      
      console.log(`✅ Player ${playerId} upgraded ${upgradeType} to level ${upgrades[upgradeType]}`);
      
      socket.emit('upgradeSuccess', {
        upgradeType,
        level: upgrades[upgradeType],
        goldRemaining: gold - upgradeCost
      });
      
    } catch (error) {
      console.error('Upgrade error:', error);
      socket.emit('upgradeFailed', { message: 'Upgrade failed' });
    }
  });
  
  // =================== EXAMPLE: Update Leaderboard ===================
  
  socket.on('updateStats', async (data) => {
    const { playerId, kills, deaths, wins, matches } = data;
    
    try {
      // Calculate rank (simple calculation)
      const rank = kills > 0 ? Math.floor(kills / 5) + 1 : 0;
      
      // Update leaderboard
      await gameState.database.updateLeaderboard(playerId, {
        kills,
        deaths,
        wins,
        matches,
        rank
      });
      
      console.log(`📊 Updated stats for player ${playerId}: ${kills} kills, ${wins} wins`);
      
    } catch (error) {
      console.error('Stats update error:', error);
    }
  });
  
  // =================== EXAMPLE: Get Top Players ===================
  
  socket.on('getTopPlayers', async () => {
    try {
      const topPlayers = await gameState.database.getLeaderboard(10);
      socket.emit('topPlayers', topPlayers);
    } catch (error) {
      console.error('Leaderboard error:', error);
      socket.emit('leaderboardError', { message: 'Failed to load leaderboard' });
    }
  });

  // =================== EXAMPLE: Create/Join Clan ===================
  
  socket.on('createClan', async (data) => {
    const { clanId, clanName, playerId } = data;
    
    try {
      // Save clan
      await gameState.database.saveClan(clanId, {
        name: clanName,
        leader: playerId,
        description: data.description || '',
        members: 1
      });
      
      // Add player to clan members
      // (You would need a saveClanMember method for this)
      
      console.log(`🏰 Clan ${clanName} created by ${playerId}`);
      socket.emit('clanCreated', { clanId, clanName });
      
    } catch (error) {
      console.error('Clan creation error:', error);
      socket.emit('clanError', { message: 'Failed to create clan' });
    }
  });
  
});
*/

// =================== AVAILABLE DATABASE METHODS ===================

/*
Account Methods:
- saveAccount(playerId, accountData) -> { success: true, playerId }
- loadAccount(playerId) -> accountData or null

Gold Methods:
- saveGold(playerId, amount) -> { success: true, playerId, amount }
- loadGold(playerId) -> amount (default 1000)

Upgrades Methods:
- saveUpgrades(playerId, upgradesData) -> { success: true, playerId }
- loadUpgrades(playerId) -> upgradesData or { hull: 0, cannons: 0, speed: 0, crew: 0 }

Leaderboard Methods:
- updateLeaderboard(playerId, stats) -> { success: true, playerId }
- getLeaderboard(limit) -> [playerData]

Clan Methods:
- saveClan(clanId, clanData) -> { success: true, clanId }
- loadClan(clanId) -> clanData or null

Connection Methods:
- close() -> Closes database and saves data
*/

export const databaseExamples = {
  message: 'See comments above for integration examples'
};
