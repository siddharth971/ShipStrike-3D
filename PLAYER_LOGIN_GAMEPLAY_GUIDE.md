# 🎮 Ships 3D - Player Guide & Gameplay Tutorial

**Game**: Ships 3D - Multiplayer Naval Combat  
**Status**: Free-to-Play | 100% No Pay-to-Win  
**Version**: 1.0 Complete  
**Date**: April 3, 2026

---

## 📖 Quick Navigation

- [What is Ships 3D?](#what-is-ships-3d)
- [Starting the Game](#starting-the-game)
- [Basic Controls](#basic-controls)
- [Game Modes](#game-modes)
- [How to Play - Step by Step](#how-to-play--step-by-step)
- [Strategy & Pro Tips](#strategy--pro-tips)
- [Key Features](#key-features)
- [Troubleshooting](#troubleshooting)

---

## 🚢 What is Ships 3D?

**Ships 3D** is a fast-paced, action-packed **multiplayer naval combat game** playable directly in your web browser without any downloads or installations required, and is **100% free to play**.

### Core Features

- 🌊 **Realistic sailing physics** with wind mechanics
- ⚔️ **Team-based naval combat** with up to 90 players in massive battles
- 🎯 **Multiple game modes**: Team Flags (competitive), Trading (economic warfare), and more
- 🤖 **Helper Bot system** for solo players or autopilot assistance
- 💰 **Economy system** with gold rewards and ship upgrades
- 🏴‍☠️ **Clans, crews, and social features** for organized crew play
- ⚙️ **Extensive upgrade system** for cannons, speed, armor, and more
- 🗺️ **Leaderboards** tracking kills, wealth, ships sunk, and more
- 📱 **Full mobile & tablet support** with virtual joystick controls
- 🆓 **100% free** with no pay-to-win mechanics

---

## 🚀 Starting the Game

### Step 1: Start the Development Server

```bash
cd D:\ShipStrike-3D
npm install          # First time only
npm run dev          # Start dev server
```

**Expected Output:**

```
  VITE v6.0.7  ready in 416 ms
  ➜  Local:   http://localhost:5174/
```

### Step 2: Open in Browser

Open your browser to:

```
http://localhost:5174/threejs-water-shader/
```

You'll see:

- ✅ 3D ocean with realistic water shader
- ✅ Your player ship in the center
- ✅ 4 enemy ships spawning around you
- ✅ HUD with health/status information
- ✅ Control hints overlay

### Step 3: Start Playing!

Your ship is ready. Enemies are spawning. Game begins immediately.

---

## 🎮 Basic Controls

| Key       | Action                                                       |
| --------- | ------------------------------------------------------------ |
| **W / S** | Move sailor Forward / Backward around ship                   |
| **A / D** | Turn ship Left / Right                                       |
| **Mouse** | Look around (first-person perspective)                       |
| **Click** | Fire cannons at enemies                                      |
| **F**     | Interact with steering wheel, sails, cannons (when close)    |
| **C**     | Cycle camera view (Captain's View → Third Person → Free Cam) |
| **H**     | Toggle UI visibility                                         |

### Mobile/Tablet Controls

- **Left Joystick**: Movement & ship rotation
- **Action Buttons** (right side): Fire, Interact, Special Ability, Map
- **Full touch-based control** with haptic feedback support

---

## 🗺️ Game Modes

### 1. **Team Flags** (Team-Based Combat)

Compete in organized fleet vs fleet battles. Two teams fight to capture enemy flags and control territory. Supports 4-60 players.

**Objectives:**

- Capture enemy flags
- Defend your home base
- Sink enemy ships
- Work with teammates

### 2. **Trading Mode** (Economic Warfare)

Engage in merchant trading between ports. Established complex trade routes, buy/sell commodities, and manage inventory for maximum profit.

**Objectives:**

- Establish trade routes
- Buy commodities at low prices
- Sell for maximum profit
- Grow your wealth
- First to 100,000 gold wins

### 3. **Large-Scale Battles**

- **90-player Mode**: Enormous, chaotic free-for-all naval warfare with up to 90 players
- **60-player Team Mode**: Large organized team battles

---

## ⚙️ How to Play — Step by Step

### 1. **Setup**

You start with:

- One player-controlled sailor on the deck
- A full-size sailing ship with cannons
- 4 enemy AI ships spawning nearby
- Initial health and resources

No login required — the game starts immediately!

### 2. **Steer Your Ship**

The game is played in **first-person perspective** where you control the sailor and move around the ship, interacting with:

- **Helm (Steering Wheel)** - Control ship direction
- **Sails** - Adjust for optimal wind angle
- **Cannons** - Fire at enemies to sink ships
- **Lookout Posts** - Scout for enemies

Walk your sailor to each station and press **F** to interact.

### 3. **Use the Helper Bot**

The **Helper Bot** can be configured to:

- **Automatically steer** your ship toward enemies or objectives
- **Adjust sails** for optimal wind efficiency
- **Fire cannons** at nearby threats
- **Manage crew** and keep your ship operational

#### Activating the Bot

```
Press: TAB to toggle bot assistance
Right-Click: Open bot configuration menu
```

**You remain in control** — the bot will stop steering if you start steering. Combined manual control is encouraged!

### 4. **Fire Cannons**

During engagement:

1. **Position your ship** near enemies
2. **Walk to cannon stations** (press F when nearby)
3. **Align cannons** by adjusting aim
4. **Click to fire** at enemy ships
5. **Reload automatically** (be patient between salvos)

**Broadside Advantage:** A ship positioned sideways fires all cannons at once, dealing massive damage. A ship pointed bow-first at enemies is much less effective!

### 5. **Earn Gold & Upgrade**

Throughout a match, you accumulate **gold** from:

- 💥 **Every hit** on enemy ships (15-50 gold per hit)
- 💀 **Sinking ships** (150-500 gold depending on ship size)
- 🎯 **Team objectives** (200+ gold for strategic wins)
- 🤝 **Assists** (50 gold for helping teammates)

#### Between-Match Upgrades

Spend gold to upgrade:

- **Cannon Damage** — Increase damage per shot (Max Level 5)
- **Ship Armor** — Reduce incoming damage (Max Level 5)
- **Ship Speed** — Increase maximum speed (Max Level 5)
- **Sail Efficiency** — Better wind response (Max Level 5)
- **Ship Hull** — More health (Max Level 5)
- **Fire Rate** — Shoot faster (Max Level 3)

Upgrades compound: Better firepower → Faster kills → More gold → Stronger ship → Dominance!

---

## ⚓ Advanced Mechanics

### Wind Management

The **flags on your ship** indicate wind direction. To maximize speed:

1. **Identify wind direction** from flag position
2. **Adjust sail angles** using the **points of sail**
3. **Navigate perpendicular to wind** for maximum speed
4. **Never sail directly into wind** (physically impossible!)

**Wind Advantage System:**

- Perfect angle (perpendicular): 100% speed
- Cross-wind: 50-75% speed
- Into wind: 0% speed (blocked)
- Downwind: 75-100% speed

**Mastering wind is key to outmaneuvering enemies!**

### Sailing Physics

Ships respond realistically to:

- **Wind speed and direction**
- **Sail angle and condition**
- **Ship speed and momentum**
- **Ocean waves and sway**
- **Crew competency**

Adjust sails with **F key** near sail stations for dynamic ship control.

### Combat Tactics

#### Positioning is Everything

- **Broadside** (sideways): All cannons fire → Maximum damage
- **Bow-on** (straight at): Single cannon → Minimal damage
- **Rear** (away): Cannons can't fire → Escape route

#### Team Coordination

- **One person steers** while others man cannons
- **Coordinate fire** on single enemies to sink them faster
- **Protect teammates** from incoming fire
- **Form battle formations** with your crew/clan

#### Boarding & Melee Combat

- **Get close** (within 50 units) to enemy ships
- **Board enemy vessel** during close engagement
- **Sword/melee combat** with cutlasses, pistols, muskets
- **High-risk, high-reward** combat mechanic

---

## 👥 Multiplayer & Social Features

### Playing with Friends

**Share Your Ship Code:**

1. Open the in-game menu
2. Copy your unique **"ship code"**
3. Share with friends
4. Friends enter code at **server selection screen**
5. Friends automatically join **your ship**

This gives you a **teamwork advantage** and better coordination against other players!

### Clans & Crew Management

#### Create a Clan

- Form permanent organizations with other players
- Grow from 1 to 50+ members
- Share resources and tactics
- Compete on **clan leaderboards**

#### Manage Your Crew

- Assign roles (helmsman, gunners, riggers, sailors)
- Coordinate crew members for specific tasks
- Track crew performance statistics
- Promote skilled sailors to leadership

### Friends List

- **Add/remove friends** directly in-game
- **See when friends are online**
- **Invite to your ship** instantly
- **In-game friend chat** for coordination

### Clan Chat

- **Clan-only communication** channel
- **Share tactical information** with clan members
- **Organize large-scale battles**
- **Keep crew coordinated**

---

## 🏆 Progression & Leaderboards

### Earn Rankings in Multiple Categories

The **Wall of Fame leaderboard** tracks:

| Category         | How to Rank                |
| ---------------- | -------------------------- |
| **Kills**        | Total enemies defeated     |
| **Damage Dealt** | Total damage caused        |
| **Wealth**       | Total gold earned          |
| **Ships Sunk**   | Vessels destroyed          |
| **Win Rate**     | Percentage of matches won  |
| **Player Level** | Overall progression        |
| **Clan Score**   | Aggregate clan performance |

### Check Your Ranking

- Press **Tab** to view leaderboards
- See top 100 players per category
- Compare your stats to others
- Track your progression over time

---

## ⚡ Strategy & Pro Tips

### Wind Management (Advanced)

**The flags on the ship indicate the direction of the wind.** Set the angle of the sail based on the points of sail for maximum speed — check "points of sail" in the in-game instructions. **Mastering wind direction is key to outmaneuvering enemies.**

| Wind Angle         | Strategy                                  |
| ------------------ | ----------------------------------------- |
| 0° (headwind)      | **Impossible** — Tack or change course    |
| 45° (close-haul)   | **Manual sail adjustment** required       |
| 90° (beam)         | **Optimal** — Maximum broadside firepower |
| 135° (broad reach) | **Good** — Fast and stable                |
| 180° (downwind)    | **Good** — Fast but harder to maneuver    |

### Use the Minimap

**Observe the minimap to gain favorable positions.** Pay attention to the miniature map to find advantageous spots and avoid ambushes. The minimap shows:

- 🔵 Your position and heading
- 🔴 Enemy ships and distance
- 🟢 Friendly/teamed ships
- 🏴 Objectives and flags
- ⛵ Wind direction indicator

### Teamwork Wins

**Create a powerful battle group and dominate the area.** Having one person steer while others man the cannons is **much more effective** than playing alone. Organized crews with:

- 1 Helmsman (steering)
- 2-3 Gunners (firing cannons)
- 1 Rigger (managing sails)
- 1 Lookout (spotting enemies)

...can dominate entire battlefields!

### Positioning is Everything

**Align your ship broadside (sideways) to enemies so all your cannons can fire at once.** A ship presenting its side fires **far more effectively** than one pointed bow-first. This is the primary tactic for naval dominance.

### Upgrade Early

**Prioritize cannon upgrades early** — better firepower lets you sink enemies faster and earn gold quicker, creating a snowball effect. Damage upgrades compound:

```
Better Damage → Faster Kills → More Gold → More Upgrades
→ Dominance → Higher Rankings → Victory
```

### Manage Your Bot

**Use the Helper Bot when learning**, but **take manual control of cannons during close-range engagements** for more accurate shots. The bot is perfect for:

- First-time players
- Practicing navigation
- Automatic sailing
- Managing while managing crew

But human precision beats bots for:

- Cannon firing accuracy
- Tactical maneuvering
- Boarding attacks
- Critical moments

### ⚔️ Melee Combat

**Don't forget — you can also board enemy ships and fight with a sword or musket at close range** for a surprise attack!

Melee weapons available:

- **Sword** — Balanced, reliable
- **Cutlass** — Fast, medium damage
- **Pistol** — Long-range, decent damage
- **Musket** — High damage, slow reload
- **Knife** — Quick attacks, low damage

---

## ✨ Key Features at a Glance

| Feature                          | Details                                          |
| -------------------------------- | ------------------------------------------------ |
| 🌊 **Realistic Sailing Physics** | Wind mechanics, sail efficiency, ship momentum   |
| 👥 **Up to 90 Players**          | Massive servers for huge naval battles           |
| ⚙️ **Ship & Cannon Upgrades**    | 6 upgrade types, progression system              |
| 🤖 **Helper Bot**                | AI autopilot for steering, sails, cannons        |
| 🏴‍☠️ **Clans & Crews**             | Permanent organizations, crew roles, shared chat |
| 📱 **Mobile & Tablet Support**   | Full touch controls with virtual joystick        |
| 🆓 **100% Free, No Pay-to-Win**  | All upgrades earned through gameplay             |
| 🗺️ **Multiple Game Modes**       | Team Flags, Trading, large battle modes          |
| ⚔️ **Melee Combat**              | Sword, pistol, musket, boarding mechanics        |
| 🏆 **Wall of Fame Leaderboard**  | 7 ranking categories, seasonal competitions      |

---

## 🎯 Summary

**Ships 3D is a fun, chaotic naval battle game where:**

- **Mastering wind** separates beginners from sea captains
- **Positioning matters** more than raw firepower
- **Teamwork wins** against lone wolves
- **Upgrades compound** for exponential progression
- **Boarding and melee** add tactical variety
- **Multiple game modes** keep gameplay fresh

### Getting Started

1. **Start dev server**: `npm run dev`
2. **Open browser**: `http://localhost:5174/`
3. **Learn controls**: Hints auto-display on load
4. **Play with bot first**: Learn mechanics without pressure
5. **Join your first battle**: Sink ships, earn gold, upgrade
6. **Invite friends**: Use ship code for crew play
7. **Form a clan**: Compete at larger scale

**Start with the Helper Bot, learn the controls, then take full manual control as you get comfortable!**

---

## 🆘 Troubleshooting

### Game won't load

```bash
# Clear cache and restart
npm run dev
# Try fresh browser tab
```

### Cannons won't fire

- Make sure you're not in **Free Camera mode** (C key cycles modes)
- Get closer to cannon stations (**F** key to interact)
- Check ship has energy/cooldown available

### Ship moves too slow

- **Adjust sails** based on wind direction (**F** near sail stations)
- **Wind is against you** — change course to nearby ships
- **Sail damage** — find a port to repair

### Can't see other players

- Server might be offline — runs in single-player mode
- Check browser console for errors (F12)
- Restart both client and server

### Mobile doesn't work

- Device must support touch (iPad, Android tablet)
- Virtual joystick appears on left/right sides
- Reduce graphics quality if performance is poor

---

**Enjoy your adventures on the high seas! ⚓⛵🎮**

## 🎮 Game Initialization

### What Loads Automatically

When the game starts, the client initializes:

```
1. THREE.js Renderer
   └─ Water shader
   └─ Particle effects
   └─ Camera system

2. Game State
   └─ Player ship
   └─ Enemy ships
   └─ Projectiles
   └─ Particles

3. Systems
   └─ Input handler (keyboard + mouse)
   └─ Combat system
   └─ Physics simulation
   └─ HUD & UI

4. Phase 6 Systems
   └─ Mobile touch controller (auto-detects device)
   └─ LOD system (rendering optimization)
   └─ Performance monitor (FPS tracking)

5. Network (Non-blocking)
   └─ Attempts server connection
   └─ Falls back to single-player if fails
```

### Console Messages You'll See

```
✅ Connected to Three.js renderer
✅ Loaded water shader
✅ Spawned player ship
✅ Spawned 4 enemies
✅ Mobile touch controller initialized
✅ LOD system initialized
✅ Performance monitor initialized
```

---

## ⌨️ Basic Controls

### Keyboard Controls

| Key         | Action      | Effect                        |
| ----------- | ----------- | ----------------------------- |
| **W**       | Forward     | Accelerate ship forward       |
| **S**       | Backward    | Reverse/brake                 |
| **A**       | Turn Left   | Rotate ship counter-clockwise |
| **D**       | Turn Right  | Rotate ship clockwise         |
| **Mouse X** | Turn Camera | Rotate view left/right        |
| **Mouse Y** | Tilt Camera | Tilt view up/down             |
| **SPACE**   | Fire Cannon | Shoot at targeted enemy       |
| **SCROLL**  | Zoom        | Zoom camera in/out            |

### Debug Controls (While Game Running)

| Key   | Feature               | Result                            |
| ----- | --------------------- | --------------------------------- |
| **D** | Performance Overlay   | Shows FPS, memory, latency        |
| **T** | Toggle Touch Controls | Show/hide mobile controls         |
| **L** | LOD Statistics        | Display LOD optimization stats    |
| **P** | Print Stats           | Print detailed metrics to console |

---

## 🎯 Gameplay Mechanics

### Your Goal

**Clear the Screen!** Defeat all enemy ships by hitting them with cannon fire.

### How to Play

#### 1. Navigate Your Ship

```
Use WASD to move:
  W = Forward
  A = Left
  D = Right
  S = Backward

Use Mouse to aim:
  Move mouse left/right to rotate view
```

#### 2. Target Enemy Ships

```
Move toward enemy ships:
- They patrol and move around
- White circles = safe distance
- Red circles = danger zone

Keep them in view to track them
```

#### 3. Fire Cannon

```
Press SPACE to fire:
- Cannon fires at current rotation
- 10 damage per hit
- Projectiles have physics
- Track projectile path visually

Watch for impacts:
- 💥 Hit explosion
- ❌ Miss splash
```

#### 4. Defeat Enemies

```
Each enemy:
- Has 100 health
- Requires 10 cannon hits to sink
- When sunk: disappears + respawns elsewhere

Total enemies: 4 (can fight all at once)
```

### Game State Indicators

**Health Bar (Top Right)**

```
Green bar = Your ship health
- Full = 100 HP
- Empty = 0 HP (you lose)
```

**FPS Counter (Top Left)**

```
FPS: XX | 💾 XXX MB
- FPS = Frames per second (target 60)
- Memory = RAM used in megabytes
```

**Enemy Health Bars**

```
Above each enemy ship:
- Green = High health
- Yellow = Medium health
- Red = Low health
```

---

## 🎮 Detailed Combat Example

### Step-By-Step Combat

**Scenario:** One enemy ship at your 2 o'clock position

```
1. NAVIGATE
   └─ Press D to turn right
   └─ Press W to accelerate forward
   └─ Watch mouse view track the target

2. AIM
   └─ Rotate mouse to center enemy
   └─ Lead the target (predict where it will be)
   └─ Position for best angle

3. FIRE
   └─ Press SPACE to fire cannon
   └─ Watch projectile path
   └─ See if it hits (💥) or misses (❌)

4. HIT!
   └─ Enemy takes 10 damage
   └─ Health bar decreases
   └─ Continue firing to sink it

5. SINK
   └─ After 10 hits, enemy sinks
   └─ Disappears from screen
   └─ Respawns elsewhere (repeat)

6. VICTORY!
   └─ Clear all 4 enemies
   └─ Game continues spawning new ones
```

---

## 🔍 Understanding HUD

### Top Right: Health & Status

```
┌─────────────────────┐
│ Score: 0            │
│ Enemies: 4          │
│ Kills: 0            │
├─────────────────────┤
│ [████████░░] Health │ ← Your ship health
└─────────────────────┘
```

### Top Left: Performance

```
┌──────────────────────┐
│ FPS: 60              │ ← Frames per second
│ 💾 245 MB            │ ← Memory usage
└──────────────────────┘
```

### Ocean / 3D View

```
  Your Ship (Center)
        🚢
        ║
  Enemy   Enemy
  Ship    Ship
   ↗      ↘

  Enemy     Enemy
  Ship      Ship
   ↙        ↖

Indicators:
- White circle around you = Safe zone
- Red circle = Danger zone
- Projectiles visible in flight
- Water ripples from movement
```

---

## 📱 Debug Features

### Performance Overlay (Press D)

**Shows Real-Time Metrics:**

```
┌──────────────────────────────────┐
│ 🔴 Performance Monitor            │
├──────────────────────────────────┤
│ FPS: 58.2                         │
│ Frame Time: 17.2 ms               │
│                                   │
│ Memory:                           │
│   Heap: 245 MB / 300 MB (82%)     │
│                                   │
│ Network:                          │
│   Latency: 0 ms (local)           │
│   Bandwidth: ~0 KB/s              │
│                                   │
│ Recent Alerts:                    │
│   [None]                          │
│                                   │
│ Press D to hide                   │
└──────────────────────────────────┘
```

**What Each Metric Means:**

- **FPS:** Frames per second (60 = smooth, <30 = lag)
- **Frame Time:** Milliseconds to render one frame (<16.7ms = 60 FPS)
- **Memory:** RAM currently used
- **Latency:** Network delay (single-player = ~0ms)
- **Bandwidth:** Data transfer rate

### LOD Statistics (Press L)

Shows how many ships are being culled for distance:

```
LOD System Stats:
  Total entities: 5 (you + 4 enemies)
  Culled entities: 0 (all visible)
  Avg LOD level: 0.5

Explanation:
- Nearby ships render in HIGH quality
- Distant ships render in LOW quality
- Very distant ships are culled (not rendered)
```

### Print Stats (Press P)

Outputs detailed stats to browser console:

```
📊 PERFORMANCE STATS:
FPS: {
  current: 59,
  average: 58.5,
  min: 45,
  max: 62
}
Frame Time (ms): {
  current: 17.2,
  average: 17.1,
  min: 16.1,
  max: 22.3
}
Memory: {
  used: 245 MB,
  limit: 300 MB,
  percent: 82%
}
```

---

## 📱 Mobile Controls

### Auto-Detection

**On Mobile/Tablet Devices:**

- Touch controls appear automatically
- Virtual joystick (left side)
- 4 action buttons (right side)

### Mobile Controls Layout

```
MOBILE DEVICE SCREEN
┌──────────────────────────┐
│                          │
│   3D Game View           │
│   (Smaller to fit UI)    │
│                          │
├──────────────────────────┤
│ ⭕      🔫 🤝             │
│ Stick   ⚡ 🗺️             │
│         (Buttons)        │
└──────────────────────────┘

Controls:
- Left Circle = Movement joystick
- 🔫 (Fire) = Shoot cannon
- 🤝 (Interact) = Board enemy
- ⚡ (Special) = Special ability
- 🗺️ (Map) = Show minimap
```

### Using Mobile Controls

```
1. MOVEMENT
   └─ Drag finger on left circle
   └─ Direction = ship direction
   └─ Distance from center = speed

2. FIRE
   └─ Tap fire button (🔫)
   └─ Cannon fires in current direction

3. ABILITIES
   └─ Tap other buttons for actions

4. HAPTIC FEEDBACK
   └─ Phone vibrates when:
      · You fire cannon
      · You hit enemy
      · You take damage
```

### Toggle on Desktop (For Testing)

Press **T** to show mobile controls on desktop:

```
Useful for:
- Testing touch interface
- Looking cool 😎
- Debugging mobile bugs
```

---

## 🎮 Game Flow Chart

```
GAME START
    ↓
Load Assets (Water, Ships, Effects)
    ↓
Spawn Player at Center
    ↓
Spawn 4 Enemies Around You
    ↓
GAME RUNNING ✅
    ↓
    ├─ Player Movement (WASD)
    ├─ Camera Control (Mouse)
    ├─ Cannon Fire (SPACE)
    └─ Enemy AI Movement
    ↓
HIT ENEMY → Damage -10 HP
    ↓
ENEMY HEALTH 0 → Enemy Sinks
    ↓
NEW ENEMY RESPAWNS
    ↓
REPEAT (Endless Gameplay)
    ↓
PLAYER HEALTH 0 → Game Over
    ↓
You can continue playing (restart)
```

---

## 📊 Game Statistics

### How Scoring Works

**Current Scoring System:**

```
- Kills: +1 per enemy sunk
- Damage: Tracks total damage dealt
- Score: Currently 0 (no scoring system yet)
```

**Eventually (Multiplayer):**

```
- Gold earned per kill
- XP for leveling up
- Ship upgrades from gold
- Leaderboard rankings
```

---

## 🐛 Troubleshooting

### Problem: Game Loads But Screen is Black

**Solution:**

```
1. Check browser console (F12)
2. Look for error messages
3. Try:
   - Zoom out (Scroll wheel)
   - Press R to reset camera
   - Refresh page (F5)
```

### Problem: Ships Not Rendering

**Solution:**

```
1. Check FPS (D key)
2. If very low (<20 FPS):
   - Press L to check LOD culling
   - Close other browser tabs
   - Check GPU (might be maxed)

3. Try:
   - Lower quality settings
   - Reduce particle effects
```

### Problem: Controls Not Responding

**Solution:**

```
1. Click in the game window
2. Make sure caps lock is off
3. Try pressing keys again
4. Check if debugging keyboard buffer:
   - Hold key for 1 second
   - Let go
   - Wait for repeat

5. Try mouse movement instead
```

### Problem: Cannon Won't Fire

**Solution:**

```
1. Make sure target is visible
2. Press SPACE (not other fire keys)
3. Check if in cooldown:
   - Wait 0.1 seconds between shots
   - Try again

4. Try different angle
5. Check if enemy is too close
```

### Problem: Touch Controls Don't Appear on Mobile

**Solution:**

```
1. Make sure device is detected as mobile
2. Try pressing T to force toggle
3. Check console (F12) for errors
4. Refresh page (F5)
5. Try portrait orientation
```

### Problem: Low FPS / Lag

**Solution:**

```
1. Press D to see performance overlay
2. Check memory usage:
   - If >300 MB: Too much RAM used
   - Close other programs
   - Restart browser

3. Check FPS:
   - If <45 FPS: GPU overloaded
   - Press L to enable LOD culling
   - Reduce # of visible ships

4. Check network:
   - Latency shown in overlay
   - If high: Network congestion
```

---

## 🎯 Quick Start Checklist

For New Player:

- [ ] npm run dev (start server)
- [ ] Open http://localhost:5174/ in browser
- [ ] See 3D ocean with ships
- [ ] Press WASD to move
- [ ] Use Mouse to look around
- [ ] Press SPACE to fire cannon
- [ ] Hit 4 enemies to clear screen
- [ ] Press D to see performance
- [ ] Press T to toggle mobile UI
- [ ] Press P to print stats

For Developer:

- [ ] Check browser console (F12)
- [ ] See login/init messages
- [ ] Watch network tab for socket.io
- [ ] Enable localStorage debug: `localStorage.setItem('debug', 'true')`
- [ ] Check Phase 6 systems loaded
- [ ] Run test suite: `window.testPhase6()`

---

## 📚 Next Sections to Read

1. **For Backend Setup:** [PHASE6_ARCHITECTURE_IMPLEMENTATION.md](PHASE6_ARCHITECTURE_IMPLEMENTATION.md)
2. **For System Details:** [PHASE6_IMPLEMENTATION.md](PHASE6_IMPLEMENTATION.md)
3. **For Testing:** [PHASE6_TEST_REPORT.md](PHASE6_TEST_REPORT.md)
4. **For Integration:** [PHASE6_INTEGRATION.md](PHASE6_INTEGRATION.md)

---

## 🎮 Summary

### Login Process

- ✅ No login required (single-player by default)
- ✅ Auto-generates username if server available
- ✅ Game starts immediately

### Gameplay

- ✅ WASD = Move ship
- ✅ Mouse = Aim camera
- ✅ SPACE = Fire cannon
- ✅ SCROLL = Zoom
- ✅ D/T/L/P = Debug features

### Goal

- ✅ Hit enemy ships with cannon fire
- ✅ Each hit = 10 damage
- ✅ 10 hits = sink enemy
- ✅ Endless gameplay (respawning enemies)

### On Mobile

- ✅ Touch joystick for movement
- ✅ Touch buttons for actions
- ✅ Haptic feedback support
- ✅ Auto-detects device

---

**You're Ready to Play!** 🚀

Start game with `npm run dev` and enjoy ShipStrike-3D! 🎮⚓

All explanations above cover everything you need to know to login (or skip login) and play the full game!
