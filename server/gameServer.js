import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// =================== GAME STATE ===================
const gameState = {
  players: new Map(),
  ships: new Map(),
  projectiles: new Map(),
  matches: new Map(),
  matchCounter: 0
};

// =================== CONSTANTS ===================
const TICK_RATE = 60;
const DELTA_TIME = 1000 / TICK_RATE;
const MAP_SIZE = 4000;
const SHIP_INITIAL_HEALTH = 100;
const PROJECTILE_SPEED = 100; // units per second
const PROJECTILE_LIFETIME = 30; // seconds

// =================== PLAYER MANAGEMENT ===================
function createPlayer(socket, username) {
  const playerId = uuidv4();
  
  const player = {
    id: playerId,
    socketId: socket.id,
    username: username || `Player_${playerId.substring(0, 8)}`,
    connectedAt: Date.now(),
    lastUpdateTime: 0,
    matchId: null,
    shipId: null,
    isAuthenticated: false,
    stats: {
      gold: 0,
      kills: 0,
      damage: 0,
      deaths: 0
    }
  };

  gameState.players.set(playerId, player);
  console.log(`👤 Player created: ${username} (${playerId.substring(0, 8)}...)`);
  
  return player;
}

function getPlayerBySocket(socketId) {
  for (const [, player] of gameState.players) {
    if (player.socketId === socketId) return player;
  }
  return null;
}

// =================== SHIP MANAGEMENT ===================
function spawnShip(playerId, matchId, x = null, y = null) {
  const shipId = uuidv4();
  
  // Random spawn position if not specified
  const posX = x !== null ? x : Math.random() * (MAP_SIZE - 200) + 100;
  const posY = y !== null ? y : Math.random() * (MAP_SIZE - 200) + 100;
  
  const ship = {
    id: shipId,
    playerId: playerId,
    matchId: matchId,
    position: { x: posX, y: posY },
    rotation: Math.random() * Math.PI * 2,
    velocity: { x: 0, y: 0 },
    acceleration: 0,
    maxSpeed: 50,
    health: SHIP_INITIAL_HEALTH,
    maxHealth: SHIP_INITIAL_HEALTH,
    damageFlash: 0,
    lastFireTime: 0,
    fireRate: 0.5, // seconds between shots
    crew: [],
    sinkProgress: 0 // 0 to 1, when == 1 ship is sunk
  };

  gameState.ships.set(shipId, ship);
  
  // Associate player with ship
  const player = gameState.players.get(playerId);
  if (player) {
    player.shipId = shipId;
  }

  console.log(`⛵ Ship spawned: ${shipId.substring(0, 8)}... at (${posX.toFixed(0)}, ${posY.toFixed(0)})`);
  
  return ship;
}

// =================== MATCH MANAGEMENT ===================
function createOrGetMatch(matchId) {
  if (!gameState.matches.has(matchId)) {
    gameState.matches.set(matchId, {
      id: matchId,
      players: [],
      ships: [],
      status: 'waiting', // waiting, active, ended
      createdAt: Date.now(),
      maxPlayers: 10
    });
    console.log(`📍 Match created: ${matchId}`);
  }
  
  return gameState.matches.get(matchId);
}

// =================== SOCKET.IO EVENT HANDLERS ===================
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Authentication
  socket.on('authenticate', (data) => {
    const player = createPlayer(socket, data.username);
    player.isAuthenticated = true;

    socket.emit('authenticated', {
      playerId: player.id,
      username: player.username,
      timestamp: Date.now()
    });

    // Broadcast player joined
    io.emit('playerJoined', {
      playerId: player.id,
      username: player.username,
      totalPlayers: gameState.players.size
    });

    console.log(`✅ ${player.username} authenticated`);
  });

  // Join Match
  socket.on('joinMatch', (data) => {
    const player = getPlayerBySocket(socket.id);
    if (!player) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const match = createOrGetMatch(data.matchId);
    
    // Add player to match
    if (!match.players.includes(player.id)) {
      match.players.push(player.id);
    }
    player.matchId = data.matchId;

    // Spawn ship for player
    const spawnPos = {
      x: 300 + Math.random() * 500,
      y: 300 + Math.random() * 500
    };
    const ship = spawnShip(player.id, data.matchId, spawnPos.x, spawnPos.y);
    match.ships.push(ship.id);

    // Join Socket.io room
    socket.join(`match:${data.matchId}`);

    socket.emit('matchJoined', {
      matchId: data.matchId,
      shipId: ship.id,
      playerCount: match.players.length,
      position: ship.position
    });

    // Notify others in match
    io.to(`match:${data.matchId}`).emit('playerJoinedMatch', {
      username: player.username,
      playerCount: match.players.length
    });

    console.log(`📍 ${player.username} joined match ${data.matchId}`);
  });

  // Update Ship Input
  socket.on('updateShip', (data) => {
    const player = getPlayerBySocket(socket.id);
    if (!player || !player.shipId) return;

    const ship = gameState.ships.get(player.shipId);
    if (!ship) return;

    // Validate and apply input with limits
    ship.rotation = Math.max(-Math.PI, Math.min(Math.PI, data.rotation || ship.rotation));
    ship.acceleration = Math.max(-1, Math.min(1, data.acceleration || 0));
  });

  // Fire Weapon
  socket.on('fireWeapon', (data) => {
    const player = getPlayerBySocket(socket.id);
    if (!player || !player.shipId) return;

    const ship = gameState.ships.get(player.shipId);
    if (!ship) return;

    const now = Date.now() / 1000;
    if (now - ship.lastFireTime < ship.fireRate) {
      return; // Rate limited
    }

    ship.lastFireTime = now;

    // Create projectile
    const projectileId = uuidv4();
    const projectile = {
      id: projectileId,
      shipId: ship.id,
      playerId: player.id,
      position: {
        x: ship.position.x + Math.cos(ship.rotation) * 20,
        y: ship.position.y + Math.sin(ship.rotation) * 20
      },
      velocity: {
        x: Math.cos(ship.rotation) * PROJECTILE_SPEED + ship.velocity.x,
        y: Math.sin(ship.rotation) * PROJECTILE_SPEED + ship.velocity.y
      },
      lifespan: PROJECTILE_LIFETIME,
      createdAt: Date.now()
    };

    gameState.projectiles.set(projectileId, projectile);

    // Broadcast projectile spawn
    io.to(`match:${player.matchId}`).emit('projectileSpawned', {
      id: projectileId,
      position: projectile.position,
      rotation: ship.rotation
    });

    console.log(`💥 Projectile fired from ${player.username}`);
  });

  // Chat Message
  socket.on('chatMessage', (data) => {
    const player = getPlayerBySocket(socket.id);
    if (!player) return;

    io.emit('chatMessage', {
      username: player.username,
      message: data.message,
      timestamp: Date.now()
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    const player = getPlayerBySocket(socket.id);
    
    if (player) {
      // Remove ship
      if (player.shipId) {
        gameState.ships.delete(player.shipId);
        
        // Remove from match
        if (player.matchId) {
          const match = gameState.matches.get(player.matchId);
          if (match) {
            match.ships = match.ships.filter(id => id !== player.shipId);
            match.players = match.players.filter(id => id !== player.id);
          }
        }
      }

      // Broadcast disconnect
      io.emit('playerLeft', {
        username: player.username,
        playerId: player.id,
        totalPlayers: gameState.players.size - 1
      });

      // Remove player
      gameState.players.delete(player.id);
      
      console.log(`👋 ${player.username} disconnected`);
    }

    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// =================== GAME LOOP (SERVER PHYSICS) ===================
setInterval(() => {
  const now = Date.now();

  // Update all ships
  gameState.ships.forEach(ship => {
    // Simple physics
    ship.velocity.x = Math.cos(ship.rotation) * ship.acceleration * ship.maxSpeed;
    ship.velocity.y = Math.sin(ship.rotation) * ship.acceleration * ship.maxSpeed;

    ship.position.x += ship.velocity.x * (DELTA_TIME / 1000);
    ship.position.y += ship.velocity.y * (DELTA_TIME / 1000);

    // Wrap around map
    if (ship.position.x < 0) ship.position.x = MAP_SIZE;
    if (ship.position.x > MAP_SIZE) ship.position.x = 0;
    if (ship.position.y < 0) ship.position.y = MAP_SIZE;
    if (ship.position.y > MAP_SIZE) ship.position.y = 0;

    // Damage flash
    if (ship.damageFlash > 0) {
      ship.damageFlash -= DELTA_TIME / 1000;
    }

    // Handle sinking
    if (ship.sinkProgress > 0) {
      ship.sinkProgress += (DELTA_TIME / 1000) / 5; // 5 seconds to sink
      ship.position.y += DELTA_TIME / 1000 * 2; // Sink downward
    }
  });

  // Update all projectiles
  for (const [id, projectile] of gameState.projectiles) {
    projectile.position.x += projectile.velocity.x * (DELTA_TIME / 1000);
    projectile.position.y += projectile.velocity.y * (DELTA_TIME / 1000);
    projectile.lifespan -= DELTA_TIME / 1000;

    // Remove if expired
    if (projectile.lifespan <= 0) {
      gameState.projectiles.delete(id);
      continue;
    }

    // Check collisions with ships
    for (const [shipId, ship] of gameState.ships) {
      if (shipId === projectile.shipId) continue; // Don't hit own ship
      if (ship.sinkProgress >= 1) continue; // Skip sunk ships

      const dx = ship.position.x - projectile.position.x;
      const dy = ship.position.y - projectile.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitRadius = 30;

      if (dist < hitRadius) {
        // Hit!
        const damage = 25;
        ship.health -= damage;
        ship.damageFlash = 0.2;

        const shooter = gameState.players.get(projectile.playerId);
        if (shooter) {
          shooter.stats.damage += damage;
        }

        // Broadcast hit
        io.emit('shipHit', {
          targetShip: shipId,
          damage: damage,
          position: projectile.position,
          shooterUsername: shooter?.username || 'Unknown'
        });

        // Check if ship sunk
        if (ship.health <= 0) {
          ship.sinkProgress = 0.01;
          
          if (shooter) {
            shooter.stats.kills += 1;
          }

          io.emit('shipSunk', {
            sunkShip: shipId,
            sunkByUsername: shooter?.username || 'Unknown',
            sunkByPlayerId: projectile.playerId
          });

          console.log(`💀 Ship ${shipId.substring(0, 8)}... sunk by ${shooter?.username}`);
        }

        // Remove projectile
        gameState.projectiles.delete(id);
        break;
      }
    }
  }

  // Broadcast world state to all connected clients
  const ships = Array.from(gameState.ships.values()).map(ship => ({
    id: ship.id,
    playerId: ship.playerId,
    position: ship.position,
    rotation: ship.rotation,
    velocity: ship.velocity,
    health: ship.health,
    maxHealth: ship.maxHealth,
    damageFlash: ship.damageFlash,
    sinkProgress: ship.sinkProgress
  }));

  const projectiles = Array.from(gameState.projectiles.values()).map(p => ({
    id: p.id,
    position: p.position
  }));

  io.emit('worldUpdate', {
    ships: ships,
    projectiles: projectiles,
    timestamp: now
  });

}, DELTA_TIME);

// =================== REST API ENDPOINTS ===================
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: Date.now(),
    players: {
      online: gameState.players.size,
      authenticated: Array.from(gameState.players.values()).filter(p => p.isAuthenticated).length
    },
    ships: {
      active: gameState.ships.size,
      sunk: Array.from(gameState.ships.values()).filter(s => s.sinkProgress >= 1).length
    },
    matches: gameState.matches.size,
    projectiles: gameState.projectiles.size,
    uptime: process.uptime()
  });
});

app.get('/api/players', (req, res) => {
  res.json({
    totalOnline: gameState.players.size,
    inMatch: Array.from(gameState.players.values()).filter(p => p.matchId).length,
    players: Array.from(gameState.players.values()).map(p => ({
      id: p.id,
      username: p.username,
      gold: p.stats.gold,
      kills: p.stats.kills,
      damage: p.stats.damage
    }))
  });
});

app.get('/api/leaderboard', (req, res) => {
  const sorted = Array.from(gameState.players.values())
    .sort((a, b) => b.stats.kills - a.stats.kills)
    .slice(0, 10)
    .map((p, i) => ({
      rank: i + 1,
      username: p.username,
      kills: p.stats.kills,
      damage: p.stats.damage,
      gold: p.stats.gold
    }));

  res.json(sorted);
});

// =================== SERVER STARTUP ===================
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

server.listen(PORT, () => {
  console.log(`\n🚀 ==========================================`);
  console.log(`   ShipStrike-3D Game Server`);
  console.log(`   Running on: http://${HOST}:${PORT}`);
  console.log(`   WebSocket: ws://${HOST}:${PORT}`);
  console.log(`==========================================\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️ Shutting down server...');
  io.emit('serverShuttingDown');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export { gameState, io, app, server };
