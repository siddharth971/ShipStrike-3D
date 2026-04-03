import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import DatabaseManager from './database.js';
import { GameManager } from './systems/gameManager.js';
import setupSocketHandlers from './socketHandlers.js';

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

// =================== API ROUTES ===================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'ShipStrike-3D server is running',
    timestamp: Date.now()
  });
});

// Server status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    players: gameManager.players.size,
    ships: gameManager.ships.size,
    uptime: Date.now() - serverStartTime,
    timestamp: Date.now()
  });
});

// Get upgrade information
app.get('/api/upgrades', (req, res) => {
  const upgrades = {};
  const upgradeTypes = ['hull', 'cannons', 'speed', 'acceleration', 'crew'];
  upgradeTypes.forEach(type => {
    upgrades[type] = {
      baseCost: gameManager.calculateUpgradeCost(type, 1),
      maxLevel: 20
    };
  });
  res.json(upgrades);
});

// =================== CORE SYSTEMS ===================

let gameManager;
let stopGameLoop;
const serverStartTime = Date.now();

async function startServer() {
  try {
    console.log('🚀 Starting ShipStrike-3D Server...');
    
    // Initialize database
    console.log('📦 Initializing database...');
    const databaseManager = new DatabaseManager();
    await databaseManager.initialize();

    // Initialize game manager
    console.log('🎮 Initializing game manager...');
    gameManager = new GameManager(databaseManager);
    stopGameLoop = gameManager.startGameLoop();

    // Setup Socket.io handlers
    console.log('🔌 Setting up Socket.io handlers...');
    setupSocketHandlers(io, gameManager);

    // Start HTTP server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════╗
║   ⚔️  ShipStrike-3D Server Started  ⚔️    ║
╚════════════════════════════════════════════╝
✅ Server running on http://localhost:${PORT}
✅ WebSocket ready for connections
✅ Game systems initialized
✅ Database connected

Frontend: http://localhost:5173
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// =================== GRACEFUL SHUTDOWN ===================

function gracefulShutdown() {
  console.log('\n🛑 Shutting down server...');

  if (stopGameLoop) {
    gameManager.stopGameLoop(stopGameLoop);
  }

  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// =================== START SERVER ===================

startServer();

export { app, server, io, gameManager };
