# 🎮 ShipStrike-3D Quick Start Guide

## 30-Second Setup

### Prerequisites

- Node.js 16+ installed
- npm installed
- Port 3000 and 5173 available

### Install & Run

```bash
# 1. Install dependencies
npm install

# 2. Start server & frontend together
npm run dev:both

# OR in separate terminals:
npm run dev:server      # Terminal 1: Backend on :3000
npm run dev:frontend    # Terminal 2: Frontend on :5173
```

**That's it!** The game is running at `http://localhost:5173`

---

## 🎯 First Time Playing

1. **Enter Username** → Type any username (account auto-creates)
2. **Click "Set Sail"** → Game starts
3. **Login appear** → Click "Authenticate"
4. **Use Controls**:
   - `W/S` - Forward/Backward
   - `A/D` - Left/Right
   - `Mouse` - Move to aim
   - `Click` - Fire cannon
   - `Q/E` - Switch ammo
   - `ESC` - Open menu
   - `TAB` - Leaderboard

---

## 📊 What You Should See

### In Terminal

```
🚀 Starting ShipStrike-3D Server...
📦 Initializing database...
✅ Database initialized (SQL)
🎮 Initializing game manager...
🔌 Setting up Socket.io handlers...

╔════════════════════════════════════════════╗
║   ⚔️  ShipStrike-3D Server Started  ⚔️    ║
╚════════════════════════════════════════════╝
✅ Server running on http://localhost:3000
✅ WebSocket ready for connections
✅ Game systems initialized
✅ Database connected

Frontend: http://localhost:5173
```

### In Browser

✅ Login screen with username input  
✅ Controls hint text  
✅ Menu with Upgrades, Leaderboard, etc.  
✅ HUD showing Level, Gold, XP progress

---

## 🔧 Troubleshooting

### "Address already in use" Error

```bash
# Kill existing processes
taskkill /F /IM node.exe

# Restart
npm run dev:both
```

### Port Already in Use

```bash
# Use different ports
PORT=3001 npm run dev:server
VITE_SERVER_URL=http://localhost:3001 npm run dev:frontend
```

### Connection Refused

✅ Verify server is running (`npm run dev:server`)  
✅ Check `http://localhost:3000/health` in browser  
✅ Verify frontend is connecting to correct server URL

### Database Errors

```bash
# Delete and recreate database
rm server/shipstrike.db
npm run dev:server
```

---

## 📁 Key Files

| File                            | Purpose                 |
| ------------------------------- | ----------------------- |
| `server/gameServer.js`          | Main server entry point |
| `server/systems/gameManager.js` | Game orchestrator       |
| `frontend/src/main.js`          | Frontend entry point    |
| `frontend/src/gameClient.js`    | Main game client        |
| `server/database.js`            | SQL database manager    |
| `frontend/src/styles/main.css`  | Game UI styling         |

---

## 🎮 Game Features

✅ **4 Ship Classes**: Sloop, Frigate, Warship, Galleon  
✅ **6 Ammo Types**: Normal, Light, Heavy, Grapeshot, Sniper, Chain  
✅ **5 Upgrades**: Hull, Cannons, Speed, Acceleration, Crew  
✅ **50 Levels** with rewards and ship unlocks  
✅ **Leaderboard** with global rankings  
✅ **Real-time Combat** with hit detection  
✅ **Persistent Save** to SQL database  
✅ **Chat System** between players

---

## 🧪 Debug Commands

```javascript
// In browser console:
window.gameStats(); // Game status
window.gameClient.network; // Network info
window.gameClient.gameState; // Game data
window.gameClient.ui.toggleMenu(); // Toggle menu
```

---

## 📚 Documentation

- `GAME_IMPLEMENTATION_COMPLETE.md` - Full feature list
- `GAMEPLAY_GUIDE.md` - How to play guide
- `TECHNICAL_ARCHITECTURE.md` - Architecture details

---

## 🚀 What's Included

**Backend** (Node.js + Express + Socket.io):

- Real-time game server
- Player authentication
- Ship management
- Combat system
- Upgrade purchases
- Leaderboard management
- SQLite database

**Frontend** (Vite + Vanilla JS):

- Login screen
- Complete HUD
- Menu system
- Upgrade shop
- Leaderboard viewer
- Input controller
- Network client

---

## 💡 Tips

1. **Use dev mode** during development (`npm run dev:both`)
2. **Check console** for debug messages and errors
3. **Access server at** `http://localhost:3000`
4. **Access frontend at** `http://localhost:5173`
5. **Database auto-saves** every 30 seconds
6. **Use Ctrl+C** to stop servers

---

## 📞 Support

**Issues?** Check these first:

1. Are both server and frontend running?
2. Is port 3000 and 5173 available?
3. Check browser console for errors
4. Check terminal for server errors
5. Try clearing localStorage and restarting

---

**Status**: ✅ Ready to play!  
**Version**: 1.0  
**Last Updated**: 2024
