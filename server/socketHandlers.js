// server/socketHandlers.js
// Socket.io event handlers for real-time game communication

export function setupSocketHandlers(io, gameManager) {
  io.on('connection', (socket) => {
    console.log(`⚔️ Player connected: ${socket.id}`);
    
    let playerId = null;

    // =================== AUTHENTICATION ===================

    socket.on('authenticate', async (data) => {
      const { playerId: pId, playerName } = data;
      playerId = pId;

      try {
        await gameManager.initializePlayer(playerId, playerName);
        
        socket.emit('authenticated', {
          success: true,
          playerId,
          playerName,
          initialData: gameManager.getPlayerState(playerId)
        });

        console.log(`✅ Player ${playerName} (${playerId}) authenticated`);
      } catch (error) {
        console.error('Authentication error:', error);
        socket.emit('authenticated', { success: false, error: error.message });
      }
    });

    // =================== GAME STATE UPDATES ===================

    socket.on('updateInput', (input) => {
      if (!playerId) return;
      
      gameManager.handlePlayerInput(playerId, input);
      
      // Send back confirmation
      const playerState = gameManager.getPlayerState(playerId);
      socket.emit('playerState', playerState);
    });

    socket.on('getGameState', () => {
      if (!playerId) return;

      const playerState = gameManager.getPlayerState(playerId);
      const visibleShips = gameManager.getShipsInViewport(playerId);
      const projectiles = gameManager.getProjectilesInViewport(playerId);

      socket.emit('gameState', {
        player: playerState,
        ships: visibleShips,
        projectiles: projectiles,
        gameTime: gameManager.gameTime
      });
    });

    // =================== SHIP SPAWNING ===================

    socket.on('spawnShip', (data) => {
      if (!playerId) return;

      const { shipTypeId = 'sloop' } = data;
      const ship = gameManager.spawnShip(playerId, shipTypeId);

      if (ship) {
        socket.emit('shipSpawned', {
          success: true,
          ship: ship
        });
        
        // Broadcast to all players that new ship is in game
        io.emit('shipEntered', {
          ship: ship,
          timestamp: Date.now()
        });

        console.log(`⛵ Player ${playerId} spawned ${shipTypeId}`);
      } else {
        socket.emit('shipSpawned', {
          success: false,
          error: 'Failed to spawn ship'
        });
      }
    });

    socket.on('requestShips', () => {
      if (!playerId) return;

      const visibleShips = gameManager.getShipsInViewport(playerId, 3000);
      socket.emit('shipsUpdate', {
        ships: visibleShips,
        timestamp: Date.now()
      });
    });

    // =================== COMBAT ===================

    socket.on('fireCanon', (data) => {
      if (!playerId) return;

      const { targetPosition } = data;
      const playerData = gameManager.players.get(playerId);
      if (!playerData || !playerData.ship) return;

      const ship = gameManager.ships.get(playerData.ship);
      if (!ship) return;

      // Fire cannon and add projectile to game
      const projectile = ship.fireCannonAt(targetPosition, 0);
      if (projectile) {
        // Notify all players about the projectile
        io.emit('cannonFired', {
          shipId: ship.id,
          ammoType: ship.ammoType,
          projectile: {
            position: ship.position,
            targetPosition: targetPosition,
            ammoType: ship.ammoType
          }
        });
      }
    });

    socket.on('switchAmmo', (data) => {
      if (!playerId) return;

      const { direction } = data; // 'next' or 'prev'
      const playerData = gameManager.players.get(playerId);
      if (!playerData || !playerData.ship) return;

      const ship = gameManager.ships.get(playerData.ship);
      if (!ship) return;

      const newAmmo = ship.switchAmmo(direction);
      socket.emit('ammoSwitched', {
        ammoType: newAmmo,
        ammoInfo: {
          damage: ship.getCannonballDamage(newAmmo),
          speed: ship.getCannonballSpeed(newAmmo),
          range: ship.getCannonballRange(newAmmo)
        }
      });
    });

    // =================== UPGRADES ===================

    socket.on('purchaseUpgrade', async (data) => {
      if (!playerId) return;

      const { upgradeType } = data;
      const playerData = gameManager.players.get(playerId);
      if (!playerData || !playerData.ship) return;

      const result = await gameManager.purchaseUpgrade(
        playerId,
        upgradeType,
        playerData.ship
      );

      if (result.success) {
        socket.emit('upgradePurchased', result);
        
        // Notify others
        io.emit('playerUpgraded', {
          playerId: playerId,
          upgradeType: upgradeType,
          newLevel: result.newLevel
        });
      } else {
        socket.emit('upgradeFailed', { error: result.error });
      }
    });

    socket.on('getUpgradeCosts', () => {
      const costs = {
        hull: gameManager.calculateUpgradeCost('hull', 1),
        cannons: gameManager.calculateUpgradeCost('cannons', 1),
        speed: gameManager.calculateUpgradeCost('speed', 1),
        acceleration: gameManager.calculateUpgradeCost('acceleration', 1),
        crew: gameManager.calculateUpgradeCost('crew', 1)
      };

      socket.emit('upgradeCosts', costs);
    });

    // =================== LEADERBOARD ===================

    socket.on('requestLeaderboard', () => {
      const leaderboard = gameManager.getLeaderboard(20);
      socket.emit('leaderboard', {
        leaders: leaderboard,
        timestamp: Date.now()
      });
    });

    // =================== CHAT & MESSAGES ===================

    socket.on('chat', (data) => {
      const { message } = data;
      if (!playerId) return;

      const playerData = gameManager.players.get(playerId);
      io.emit('chatMessage', {
        playerId: playerId,
        playerName: playerData.name,
        message: message,
        timestamp: Date.now()
      });
    });

    socket.on('emote', (data) => {
      const { emoteType } = data;
      if (!playerId) return;

      io.emit('playerEmote', {
        playerId: playerId,
        emoteType: emoteType,
        timestamp: Date.now()
      });
    });

    // =================== PLAYER INFO ===================

    socket.on('getPlayerStats', () => {
      if (!playerId) return;

      const playerState = gameManager.getPlayerState(playerId);
      socket.emit('playerStats', playerState);
    });

    socket.on('getGameStats', () => {
      const stats = gameManager.getGameStats();
      socket.emit('gameStats', stats);
    });

    // =================== DISCONNECT ===================

    socket.on('disconnect', () => {
      if (playerId) {
        const playerData = gameManager.players.get(playerId);
        console.log(`❌ Player disconnected: ${playerData?.name || playerId}`);

        // Clean up player data
        gameManager.removePlayer(playerId);

        // Notify others
        io.emit('playerDisconnected', {
          playerId: playerId,
          timestamp: Date.now()
        });
      }
    });

    socket.on('error', (error) => {
      console.error(`Socket error for ${playerId}:`, error);
    });
  });

  // =================== SERVER-SENT UPDATES ===================

  // Periodically broadcast game state to all players
  setInterval(() => {
    const stats = gameManager.getGameStats();
    io.emit('serverStats', stats);
  }, 5000); // Every 5 seconds

  return io;
}

export default setupSocketHandlers;
