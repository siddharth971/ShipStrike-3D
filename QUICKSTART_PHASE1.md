# Quick Start Implementation Guide: Phase 1 Setup

## 🚀 Getting Started in 24 Hours

This guide walks you through setting up the **Phase 1 foundation** for multiplayer support in ShipStrike-3D. Follow these steps to have a working WebSocket server and client connection within one day.

---

## Step 1: Backend Server Setup (4 hours)

### 1.1 Initialize Node.js Server

```bash
# Create server directory
mkdir -p server
cd server

# Initialize Node.js project
npm init -y

# Install dependencies
npm install express socket.io cors dotenv uuid
npm install --save-dev nodemon
```

### 1.2 Create Basic Express Server

**File: `server/gameServer.js`**

```javascript
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ["websocket"],
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../dist")));

// Game state
const gameState = {
  players: new Map(),
  ships: new Map(),
  matches: new Map(),
};

// Connection handler
io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on("authenticate", (data) => {
    const playerId = uuidv4();

    gameState.players.set(playerId, {
      id: playerId,
      socketId: socket.id,
      username: data.username,
      connectedAt: Date.now(),
    });

    socket.emit("authenticated", { playerId });
    console.log(`${data.username} authenticated as ${playerId}`);
  });

  socket.on("joinMatch", (data) => {
    const match = getOrCreateMatch(data.matchId);

    gameState.ships.set(data.playerId, {
      id: data.playerId,
      position: { x: Math.random() * 1000, y: Math.random() * 1000 },
      rotation: 0,
      velocity: { x: 0, y: 0 },
      health: 100,
    });

    io.emit("worldUpdate", {
      ships: Array.from(gameState.ships.values()),
      timestamp: Date.now(),
    });
  });

  socket.on("updateShip", (data) => {
    const ship = gameState.ships.get(data.shipId);
    if (ship) {
      ship.rotation = data.rotation;
      ship.acceleration = data.acceleration;
    }
  });

  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);
    // Clean up
  });
});

// REST API endpoints
app.get("/api/players", (req, res) => {
  res.json({
    online: gameState.players.size,
    inMatch: gameState.ships.size,
  });
});

// Game loop
const TICK_RATE = 60;
const DELTA_TIME = 1000 / TICK_RATE;

setInterval(() => {
  // Update physics (placeholder)
  gameState.ships.forEach((ship) => {
    // Simple movement simulation
    ship.position.x += ship.velocity.x * (DELTA_TIME / 1000);
    ship.position.y += ship.velocity.y * (DELTA_TIME / 1000);
  });

  // Broadcast world state
  io.emit("worldUpdate", {
    ships: Array.from(gameState.ships.values()),
    timestamp: Date.now(),
  });
}, DELTA_TIME);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Game server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
});

function getOrCreateMatch(matchId) {
  if (!gameState.matches.has(matchId)) {
    gameState.matches.set(matchId, {
      id: matchId,
      players: [],
      state: "waiting",
    });
  }
  return gameState.matches.get(matchId);
}

module.exports = { gameState };
```

### 1.3 Add npm Scripts

**File: `server/package.json`** (update scripts)

```json
{
  "scripts": {
    "start": "node gameServer.js",
    "dev": "nodemon gameServer.js",
    "test": "jest"
  }
}
```

### 1.4 Environment Configuration

**File: `server/.env`**

```
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/shipstrike
REDIS_URL=redis://localhost:6379
```

---

## Step 2: Client-Side Network Integration (3 hours)

### 2.1 Create Network Module

**File: `src/core/network.js`**

```javascript
import io from "socket.io-client";
import { state } from "./state";

class NetworkManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.playerId = null;
    this.shipId = null;
  }

  connect(serverUrl = "http://localhost:3000") {
    return new Promise((resolve, reject) => {
      this.socket = io(serverUrl, {
        transports: ["websocket"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      this.socket.on("connect", () => {
        console.log("✅ Connected to game server");
        this.connected = true;
        this.setupEventListeners();
        resolve();
      });

      this.socket.on("connect_error", (error) => {
        console.error("❌ Connection error:", error);
        reject(error);
      });

      this.socket.on("disconnect", () => {
        console.log("⚠️ Disconnected from server");
        this.connected = false;
      });
    });
  }

  authenticate(username) {
    return new Promise((resolve) => {
      this.socket.on("authenticated", (data) => {
        this.playerId = data.playerId;
        console.log("🎮 Authenticated as:", this.playerId);
        resolve(data);
      });

      this.socket.emit("authenticate", { username });
    });
  }

  joinMatch(matchId) {
    this.shipId = this.playerId;
    this.socket.emit("joinMatch", {
      matchId,
      playerId: this.playerId,
    });
  }

  setupEventListeners() {
    // World updates from server
    this.socket.on("worldUpdate", (data) => {
      this.handleWorldUpdate(data);
    });

    // Ship hit events
    this.socket.on("shipHit", (data) => {
      console.log("💥 Ship hit:", data);
    });

    // Player events
    this.socket.on("playerJoined", (data) => {
      console.log("👤 Player joined:", data.username);
    });
  }

  handleWorldUpdate(data) {
    // Update global state with server data
    data.ships.forEach((shipData) => {
      if (!state.remoteShips) state.remoteShips = new Map();
      state.remoteShips.set(shipData.id, shipData);
    });
  }

  // Send player input to server
  updateShipInput(shipId, input) {
    this.socket.emit("updateShip", {
      shipId,
      rotation: input.rotation,
      acceleration: input.acceleration,
    });
  }

  fireWeapon(weaponData) {
    this.socket.emit("fireWeapon", weaponData);
  }

  sendChatMessage(message, channel = "global") {
    this.socket.emit("chatMessage", { message, channel });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

export const networkManager = new NetworkManager();
```

### 2.2 Update Main Game Loop

**File: `src/main.js`** (add network integration)

```javascript
// ... existing imports ...
import { networkManager } from "./core/network";

// Add network connection
async function initializeGame() {
  try {
    // Connect to server
    await networkManager.connect();

    // Authenticate player
    await networkManager.authenticate(
      "Player_" + Math.random().toString(36).substr(2, 9),
    );

    // Join default match
    networkManager.joinMatch("match_default");

    console.log("✅ Game initialized with multiplayer");
  } catch (error) {
    console.error("Failed to initialize multiplayer:", error);
    // Fall back to single-player
  }
}

// Call initialization
initializeGame();

// In your game loop, update network state
function animate() {
  const delta = Math.max(0.001, Math.min(0.05, clock.getDelta()));
  const elapsed = clock.getElapsedTime();
  requestAnimationFrame(animate);

  // ... existing game logic ...

  // Send player input to server every frame
  if (state.player && networkManager.connected) {
    networkManager.updateShipInput(networkManager.shipId, {
      rotation: state.player.rotation.z,
      acceleration: state.playerInputAcceleration || 0,
    });
  }

  // ... rest of game loop ...
}
```

### 2.3 Add Socket.io Client

**File: `package.json`** (add dependency)

```json
{
  "dependencies": {
    "socket.io-client": "^4.5.0"
  }
}
```

---

## Step 3: Testing the Connection (2 hours)

### 3.1 Create Simple Test Page

**File: `test-multiplayer.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ShipStrike-3D Network Test</title>
    <style>
      body {
        font-family: monospace;
        background: #222;
        color: #0f0;
        padding: 20px;
      }
      .container {
        max-width: 800px;
        margin: 0 auto;
      }
      .status {
        padding: 10px;
        margin: 10px 0;
        border: 1px solid #0f0;
      }
      .connected {
        background: #0f0;
        color: #000;
      }
      .disconnected {
        background: #f00;
      }
      input {
        padding: 8px;
        margin: 5px;
        width: 200px;
      }
      button {
        padding: 8px 15px;
        cursor: pointer;
        background: #0f0;
        color: #000;
        border: none;
      }
      button:hover {
        background: #0f0cc;
      }
      .log {
        background: #000;
        border: 1px solid #0f0;
        padding: 10px;
        height: 300px;
        overflow-y: auto;
        font-size: 11px;
      }
      .log-entry {
        margin: 2px 0;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🎮 ShipStrike-3D Network Test</h1>

      <div class="status" id="status">⏳ Connecting...</div>

      <div>
        <input
          type="text"
          id="username"
          placeholder="Enter username"
          value="TestPlayer"
        />
        <button onclick="authenticate()">Connect & Login</button>
        <button onclick="joinMatch()">Join Match</button>
      </div>

      <h3>Server Status</h3>
      <div id="serverStatus">
        <p>Players Online: <span id="onlinePlayers">-</span></p>
        <p>In Match: <span id="inMatchPlayers">-</span></p>
        <p>Latency: <span id="latency">-</span>ms</p>
      </div>

      <h3>Network Log</h3>
      <div class="log" id="log"></div>

      <h3>Debug</h3>
      <button onclick="logGameState()">Log Game State</button>
      <button onclick="disconnect()">Disconnect</button>
    </div>

    <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
    <script>
      let socket;
      let playerId;
      let latency = 0;

      async function connect() {
        socket = io("http://localhost:3000", {
          transports: ["websocket"],
        });

        socket.on("connect", () => {
          log("✅ Connected to server");
          updateStatus("connected");
          checkServerStatus();
        });

        socket.on("authenticated", (data) => {
          playerId = data.playerId;
          log("✅ Authenticated as " + playerId);
        });

        socket.on("worldUpdate", (data) => {
          document.getElementById("inMatchPlayers").textContent =
            data.ships.length;
        });

        socket.on("disconnect", () => {
          log("❌ Disconnected from server");
          updateStatus("disconnected");
        });

        socket.on("connect_error", (error) => {
          log("❌ Error: " + error.message);
        });
      }

      function authenticate() {
        const username = document.getElementById("username").value;
        if (!socket) connect();

        socket.emit("authenticate", { username });
        log(`🔐 Authenticating as ${username}...`);
      }

      function joinMatch() {
        if (!playerId) {
          alert("Please authenticate first");
          return;
        }
        socket.emit("joinMatch", { matchId: "match_test", playerId });
        log("📍 Joined match_test");
      }

      function checkServerStatus() {
        const startTime = Date.now();

        fetch("http://localhost:3000/api/players")
          .then((r) => r.json())
          .then((data) => {
            latency = Date.now() - startTime;
            document.getElementById("latency").textContent = latency;
            document.getElementById("onlinePlayers").textContent = data.online;
            document.getElementById("inMatchPlayers").textContent =
              data.inMatch;
            log(`📊 Server: ${data.online} online, ${data.inMatch} in match`);
          })
          .catch((e) => log("⚠️ " + e.message));

        setTimeout(checkServerStatus, 5000);
      }

      function disconnect() {
        if (socket) socket.disconnect();
        log("👋 Disconnected");
      }

      function updateStatus(status) {
        const el = document.getElementById("status");
        if (status === "connected") {
          el.textContent = "✅ CONNECTED";
          el.className = "status connected";
        } else {
          el.textContent = "❌ DISCONNECTED";
          el.className = "status disconnected";
        }
      }

      function log(message) {
        const logEl = document.getElementById("log");
        const entry = document.createElement("div");
        entry.className = "log-entry";
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logEl.appendChild(entry);
        logEl.scrollTop = logEl.scrollHeight;
      }

      function logGameState() {
        log(
          "Game state: " +
            JSON.stringify(
              {
                playerId,
                socket: socket ? "connected" : "disconnected",
                latency: latency + "ms",
              },
              null,
              2,
            ),
        );
      }

      // Auto-connect on load
      window.addEventListener("load", () => {
        connect();
      });
    </script>
  </body>
</html>
```

### 3.2 Run Test

```bash
# Terminal 1: Start game server
cd server
npm run dev

# Terminal 2: Start client dev server
npm run dev

# Open browser
# http://localhost:5173
# Click "Connect & Login" button
```

---

## Step 4: Verify Integration (1 hour)

### Checklist

- [ ] Server starts without errors
- [ ] Client connects to server (check console)
- [ ] Player can authenticate
- [ ] Multiple clients can connect simultaneously
- [ ] World updates broadcast to all clients
- [ ] Network latency < 100ms
- [ ] No memory leaks in 10-minute session
- [ ] Handles connection drop and reconnect

### Expected Console Output

**Server:**

```
🚀 Game server running on port 3000
📡 WebSocket endpoint: ws://localhost:3000
Player connected: abc123def456...
TestPlayer authenticated as 550e8400-e29b-41d4-a716-446655440000
```

**Client:**

```
✅ Connected to game server
🎮 Authenticated as 550e8400-e29b-41d4-a716-446655440000
📡 Receiving world updates (60 Hz)
```

---

## Step 5: Deploy to Production (Next Step)

Once testing passes, prepare for deployment:

### 5.1 Environment Setup

```bash
# Install MongoDB (if using)
# Option 1: Local installation
# Option 2: MongoDB Atlas (cloud) - Recommended

# Create Atlas cluster:
# 1. Go to mongodb.com/cloud/atlas
# 2. Create free cluster
# 3. Get connection string
# 4. Add to .env: MONGODB_URI=<connection-string>
```

### 5.2 Heroku Deployment (Free Option)

```bash
# Install Heroku CLI
# heroku.com/cli

# Login
heroku login

# Create app
heroku create shipstrike-3d-server

# Set environment variables
heroku config:set MONGODB_URI=<your-atlas-uri>

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

### 5.3 Vercel Frontend Deployment

```bash
# Deploy frontend to Vercel
vercel
# Connects NEXT_PUBLIC_SOCKET_URL to Heroku backend
```

---

## 📚 Next Steps (Continue with Phase 1)

1. **Add Database** (MongoDB for player accounts)
2. **Implement Authentication** (JWT tokens)
3. **Add Match Making** (Lobby system)
4. **Expand Network Protocol** (More game events)
5. **Performance Testing** (Load testing with 10+ clients)

---

## 🐛 Troubleshooting

| Issue              | Solution                                     |
| ------------------ | -------------------------------------------- |
| CORS errors        | Check Socket.io cors config in gameServer.js |
| Connection timeout | Server not running or firewall blocking      |
| Memory leak        | Check for event listener cleanup             |
| High latency       | Check network conditions, reduce update rate |
| Crashes on join    | Add error handling in matchmaking            |

---

## 📊 Success Indicators

✅ Server running: `npm run dev` works without errors  
✅ Client connects: Browser console shows "Connected"  
✅ Bidirectional: Server receives player input, client receives updates  
✅ Multiple clients: 3+ players can connect simultaneously  
✅ Persistence: Connection stable for 30+ minutes  
✅ Performance: < 100ms latency, 60 Hz updates

Once all checkmarks pass, you're ready for Phase 2! 🚀

---

## 📖 Reference Documentation

- [Socket.io Docs](https://socket.io/docs/)
- [Express.js Guide](https://expressjs.com/)
- [Three.js Best Practices](https://threejs.org/docs/)
- [WebSocket Protocol](https://tools.ietf.org/html/rfc6455)

**Questions?** Check TECHNICAL_ARCHITECTURE.md for deeper dives. 🎮⚓
