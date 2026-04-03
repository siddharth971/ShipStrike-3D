# 🚀 Phase 1 Quick Start Guide

## ⏱️ 5-Minute Setup

### Step 1️⃣: Install Server (1 min)

```bash
cd server
npm install
```

### Step 2️⃣: Start Game Server (30 sec)

```bash
npm run dev
```

✅ You should see:

```
🚀 Running on: http://localhost:3000
```

### Step 3️⃣: Start Client Dev Server (30 sec)

_In a new terminal:_

```bash
npm run dev
```

✅ You should see:

```
➜ Local: http://localhost:5173/
```

### Step 4️⃣: Test the Network (3 min)

Open in browser:

```
http://localhost:5173/test-multiplayer.html
```

Click these buttons:

1. **"Connect"** → wait 1 second
2. **"Authenticate"** → wait 1 second
3. **"Join Match"** → wait 1 second
4. **"Query Status"** → see server stats

### ✅ Done! You have multiplayer!

---

## 🎮 Testing with Multiple Players

### Open 3 Browser Tabs

**Tab 1:**

```
http://localhost:5173/test-multiplayer.html
```

- Click Connect → Authenticate as "Player_1" → Join Match

**Tab 2:**

```
http://localhost:5173/test-multiplayer.html
```

- Click Connect → Authenticate as "Player_2" → Join Match

**Tab 3:**

```
http://localhost:5173/test-multiplayer.html
```

- Click Connect → Authenticate as "Player_3" → Join Match

### Watch the Magic

- Each tab shows different ships
- Fire weapon from Player 1's tab: `🔫 Fire`
- See hit message in network log
- Check leaderboard updates

---

## 📊 What Each Button Does

### Connection Panel

- **Connect**: Connect to game server (ws://localhost:3000)
- **Disconnect**: Close connection

### Authentication Panel

- **Authenticate**: Login with username and get Player ID
- **Join Match**: Spawn a ship in the game world

### Gameplay Panel

- **🔫 Fire**: Fire a cannon at nearby ships
- **💬 Chat**: Send a test chat message
- **📊 Query Status**: Check server stats & leaderboard

### Server Status Panel

- Shows real-time player count
- Shows active ships
- Shows network latency
- Shows your Ship ID & Player ID

### Auto Refresh

- Toggle to auto-query server every 2 seconds
- Watch numbers update in real-time
- Great for load testing

### Network Log

- Shows all events in real-time
- Color-coded by type (info, success, error, warning)
- Scroll down to see latest events

---

## 🎯 Common Tests

### Test 1: Connection Works?

```
1. Click "Connect"
2. Status should show: CONNECTED ✅
3. All buttons should become enabled ✅
```

### Test 2: Can Authenticate?

```
1. Enter username (e.g., "TestPlayer")
2. Click "Authenticate"
3. Should show: ✅ Authenticated as TestPlayer
4. Should show: Player ID in blue
```

### Test 3: Can Join Match?

```
1. After authenticate, click "Join Match"
2. Should show: 📍 Joined match match_default
3. Should show: Ship ID in blue
4. Network log should show: ⛵ Spawned at coordinates
```

### Test 4: Multiple Players?

```
1. Open tab 1: Player A joins
2. Open tab 2: Player B joins
3. Tab 1 should show: 👤 Player_B joined
4. Server Status should show:
   - Players Online: 2
   - In Match: 2
   - Active Ships: 2
```

### Test 5: Combat Works?

```
Player A:
1. Click "🔫 Fire"
2. Network log: "🔫 Fired weapon"

Player B:
3. Watch for: "💥 Player_A hit a ship for 25 damage"
4. Server Status updates hit count
```

### Test 6: Server Status?

```
1. Click "📊 Query Status"
2. Should show:
   - Latency: 20-100ms
   - Players Online: count
   - Active Ships: count
   - Server Time: current time
```

---

## 🐛 If Something Goes Wrong

### Server Won't Start?

```bash
# Kill any process on port 3000
# macOS/Linux:
lsof -ti:3000 | xargs kill -9

# Windows (PowerShell):
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Then try:
npm run dev
```

### Can't Connect in Browser?

```
1. Verify server is running (check Terminal 1)
2. Verify port 3000 is correct in test dashboard
3. Check browser console (F12) for errors
4. Try: http://localhost:3000/api/status in browser
```

### Connection Drops?

```
1. This is normal for unstable connections
2. Socket.io should auto-reconnect
3. Check network signal strength
4. Try closing other bandwidth apps
```

### High Latency?

```
1. Normal range: 10-100ms
2. If over 200ms:
   - Check internet connection
   - Close other apps
   - Reduce player count
   - Check CPU usage
```

---

## 📁 Files You Need to Know

### To Start Server

```
server/package.json
server/gameServer.js
```

### To Test Network

```
test-multiplayer.html
```

### To Understand the Code

```
src/core/network.js        (Client network manager)
server/gameServer.js       (Server logic)
src/main.js               (Integration)
```

### Configuration

```
server/.env               (Server config)
.env.local               (Client config)
```

---

## 🎮 Playing with Your Game

### The Game Now Runs in Multiplayer Mode!

If you open the actual game:

```
http://localhost:5173/
```

It will:

- Try to connect to server at localhost:3000
- Automatically authenticate as a random username
- Join the match and spawn a ship
- Sync with other players in real-time
- FPS counter shows: `FPS: 60 | 🔌 3 ships` (3 remote ships)

Everything still works in single-player if:

- Server is not running
- Connection fails
- You set `VITE_SERVER_URL` to different server

---

## ⚡ Performance Tips

### Getting Best Performance

```
1. Server machine: 4+ cores, 8GB RAM
2. Network: Wired ethernet, < 50ms latency to server
3. Client machine: GPU support, WebGL2 capable
4. Browser: Chrome/Firefox latest version
```

### Load Testing

```
1. Open 10+ tabs with test dashboard
2. Have each connect and join
3. Fire weapons from multiple tabs
4. Watch server stability
5. Check: latency, FPS, CPU usage
```

### Optimization

```
- Keep < 90 players per server for best latency
- Consider deploying servers in multiple regions
- Use CDN for static files
- Monitor server metrics actively
```

---

## 🚀 What's Next?

### Phase 2 Features (When Ready)

- [ ] First-person perspective
- [ ] Crew system (multiple players per ship)
- [ ] Wind mechanics & sailing physics
- [ ] Minimap & navigation
- [ ] Advanced HUD

### Deploy to Production

- [ ] Deploy server to Heroku/AWS
- [ ] Update `.env.local` with production URL
- [ ] Optimize assets for CDN
- [ ] Set up monitoring/logging
- [ ] Configure auto-scaling

### Add More Game Content

- [ ] New game modes (Team Flags, Trading)
- [ ] Clans & social features
- [ ] Persistent progression
- [ ] Ship customization
- [ ] Seasonal content

---

## 📞 Debug Commands

### In Browser Console (F12)

```javascript
// Check if connected
networkManager.getStatus();

// Get all remote ships
networkManager.getAllRemoteShips();

// Send test message
networkManager.sendChatMessage("Hello!");

// Fire weapon
networkManager.fireWeapon("cannon");

// Check FPS
console.log(state._frames);
```

### In Server Terminal

The server logs all events:

```
🔌 Client connected
✅ PlayerName authenticated
📍 Joined match_default
💥 Projectile fired
💀 Ship sunk
👋 Disconnected
```

---

## 📈 Success Indicators

When working correctly, you should see:

✅ **Connection Panel**

- Status: CONNECTED
- All buttons enabled
- No errors in console

✅ **Authentication Panel**

- Shows Player ID
- Confirms username
- Shows authentication time

✅ **Gameplay Panel**

- Buttons not disabled
- Fire/Chat work without errors
- Status queries succeed

✅ **Server Status Panel**

- Shows real-time stats
- Latency under 100ms
- Active ships count increases
- Timestamps update every refresh

✅ **Network Log**

- Shows connection events
- Shows auth events
- Shows match join
- Shows player joined (when multi-player)
- Shows ship hit (when firing)

---

## 🎉 You're Ready!

Follow the 5-minute setup, test the network, and you're done!

**Two terminals, two commands, and you have multiplayer naval combat.**

Enjoy! ⚓🎮

---

**Next time you need help:**

- Read `PHASE1_IMPLEMENTATION.md` for detailed explanation
- Check `TECHNICAL_ARCHITECTURE.md` for system design
- Review `MIGRATION_PLAN.md` for full roadmap

**Happy sailing!** 🌊
