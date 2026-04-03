# ⚓ Ships 3D - Multiplayer Naval Combat

> A fast-paced, action-packed multiplayer naval combat game playable directly in your web browser with realistic sailing physics, strategic team gameplay, and 100% free-to-play experience.

<p align="center">
  <img src="public/demo.png" width="640" alt="Ships 3D gameplay demo">
</p>

## 🎮 What is Ships 3D?

**Ships 3D** is a browser-based multiplayer naval combat game where players:

- 🌊 **Steer ships** with realistic wind and sailing mechanics
- ⚔️ **Fire cannons** at enemies to sink ships and earn gold
- 👥 **Form crews** and clans for organized large-scale battles
- 💰 **Upgrade ships** with better cannons, armor, speed, and sails
- 🤖 **Use Helper Bot** for autopilot assistance
- 🎯 **Battle in multiple modes** including Team Flags and Trading
- 📱 **Play on mobile** with full touch controls
- 🏆 **Climb leaderboards** across 7 ranking categories
- 🆓 **Play completely free** with no pay-to-win mechanics

## 📋 Table of Contents

- [What is Ships 3D?](#-what-is-ships-3d)
- [Quick Features](#-quick-features)
- [Getting Started](#-getting-started)
- [Player Guide](#-player-guide)
- [Game Modes](#-game-modes)
- [Core Systems](#-core-systems)
- [Controls](#-controls)
- [Architecture](#-architecture)
- [Performance](#-performance)
- [Technology Stack](#-technology-stack)

---

## ⚡ Quick Features

| Feature                 | Details                                                                 |
| ----------------------- | ----------------------------------------------------------------------- |
| 🌊 **Sailing Physics**  | Realistic wind mechanics, sail angles, ship momentum                    |
| ⚙️ **Upgrade System**   | 6 upgrade types: Cannons, Armor, Speed, Sails, Hull, Fire Rate          |
| 👥 **Up to 90 Players** | Massive servers for huge naval battles                                  |
| 🎯 **Game Modes**       | Team Flags, Trading, 60-player Teams, 90-player Battles                 |
| 🤖 **Helper Bot**       | AI autopilot for steering, sails, and cannons                           |
| 🏴‍☠️ **Clans & Crews**    | Form permanent organizations with crew roles                            |
| ⚔️ **Melee Combat**     | Sword, cutlass, pistol, musket, knife fighting                          |
| 🗺️ **Leaderboards**     | 7 categories: Kills, Damage, Wealth, Ships Sunk, Win Rate, Level, Clans |
| 📱 **Mobile Support**   | Full touch controls on iPad and Android tablets                         |
| 🆓 **100% Free**        | No pay-to-win, all progression through gameplay                         |

---

## 🚀 Getting Started

### Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to:
# http://localhost:5174/
```

Game starts **immediately** — no login required!

### First Time Playing?

1. **Open the game** in your web browser
2. **Watch the tutorial** on-screen controls
3. **Start with Helper Bot** to learn mechanics
4. **Fire your first cannon** at enemy ships
5. **Earn gold** from each hit
6. **Upgrade your ship** between matches
7. **Invite friends** using ship code
8. **Form a clan** for organized warfare

---

## 📖 Player Guide

**Complete player guide available at [PLAYER_LOGIN_GAMEPLAY_GUIDE.md](PLAYER_LOGIN_GAMEPLAY_GUIDE.md)**

Includes:

- ✅ Step-by-step gameplay tutorial
- ✅ Wind management and sailing strategy
- ✅ Melee combat mechanics
- ✅ Crew and clan system
- ✅ Leaderboard rankings
- ✅ Advanced strategy tips

### Basic Controls

| Key       | Action                           |
| --------- | -------------------------------- |
| **W / S** | Move forward / backward          |
| **A / D** | Turn left / right                |
| **Mouse** | Aim and look around              |
| **Click** | Fire cannons                     |
| **F**     | Interact (wheel, sails, cannons) |
| **C**     | Cycle camera view                |
| **H**     | Toggle HUD visibility            |

---

## 🗺️ Game Modes

### Team Flags (4-60 Players)

- Objective-based team gameplay
- Capture enemy flags, defend home base
- Organized fleet vs fleet combat
- Real-time team scoring

### Trading Mode (Economic Warfare)

- Merchant trading between ports
- Buy and sell commodities
- Establish profitable trade routes
- First player to 100k gold wins

### 90-Player Battles

- Massive free-for-all naval warfare
- Chaotic large-scale combat
- High rewards and competition
- Battle royale-style gameplay

### 60-Player Teams

- Large organized team battles
- Squad coordination
- Strategic positioning
- Epic fleet engagements

---

## ⚙️ Core Systems

### 1. **Sailing & Wind System**

- Realistic wind mechanics affect ship speed
- Players must adjust sails for optimal angle
- Points of sail determine effectiveness
- Wind-powered naval combat

### 2. **Combat & Upgrades**

- **6 upgrade types**: Cannons, Armor, Speed, Sails, Hull, Fire Rate
- **5 difficulty levels** per upgrade
- **Progressive scaling**: Upgrades compound for exponential power growth
- **Gold economy**: Earn from hits, sinks, objectives

### 3. **Crew & Clan Management**

- **Crew roles**: Helmsman, Gunner, Rigger, Sailor
- **Clan system**: Up to 50 members, treasury, announcements
- **Ship codes**: Unique codes to invite friends to crews
- **Permission system**: Role-based access control

### 4. **Melee Combat**

- **5 weapons**: Sword, Cutlass, Pistol, Musket, Knife
- **6 actions**: Attack, Defend, Dodge, Parry, Charge, Retreat
- **Stamina system**: Regenerates outside combat
- **Tactical depth**: Boarding attacks on enemy ships

### 5. **Leaderboards**

- 7 ranking categories
- Real-time ranking updates
- Seasonal competitions
- Player percentiles and neighbors

### 6. **Helper Bot**

- Automatic steering toward enemies
- Sail optimization
- Cannon firing assistance
- Crew management
- Learning tool for new players

---

## 🎮 Architecture

### Client-Side (Browser)

```
src/
├── core/              # Core engine systems
│   ├── renderer.js    # Three.js renderer & water shader
│   ├── state.js       # Global game state
│   ├── network.js     # WebSocket client
│   └── config.js      # Configuration
├── entities/          # Game objects
│   ├── player.js      # Player ship
│   ├── ship.js        # Ship physics & rendering
│   ├── enemy.js       # Enemy AI
│   ├── sailor.js      # Crew member
│   ├── crew.js        # Crew management
│   └── sails.js       # Sail system
├── systems/           # Game systems
│   ├── input.js       # Keyboard/mouse input
│   ├── combat.js      # Cannon combat
│   ├── camera.js      # Camera modes
│   ├── particles.js   # Visual effects
│   ├── weather.js     # Wind system
│   ├── economy.js     # Gold/upgrades
│   ├── upgrades.js    # Ship upgrades
│   ├── clans.js       # Clan system
│   ├── friends.js     # Friends list
│   ├── leaderboards.js# Leaderboards
│   ├── boarding.js    # Boarding mechanics
│   ├── melee.js       # Melee combat
│   ├── mobile/        # Touch controls
│   ├── rendering/     # LOD system
│   └── performance/   # Performance monitoring
└── main.js            # Entry point
```

### Server-Side (Node.js + Socket.io)

```
server/
├── gameServer.js      # Main server & matchmaking
├── database.js        # Player data persistence
├── package.json       # Dependencies
└── systems/
    ├── clusterManager.js    # Server clustering
    ├── interestManager.js   # Area-of-interest updates
    └── lagCompensation.js   # Network compensation
```

### Features Implemented

✅ **Phase 1**: Multiplayer foundation, real-time sync  
✅ **Phase 2**: Player progression, accounts, upgrades  
✅ **Phase 3**: Economy, friends, clans, leaderboards  
✅ **Phase 4**: Melee combat, boarding, crew system  
✅ **Phase 5**: Mobile support, touch controls, performance  
✅ **Phase 6**: Architecture audit, LOD system, optimization

---

## 🚢 Gameplay Flow

```
Game Start
  ↓
Load 3D World (Ocean, Ships)
  ↓
Spawn Player Ship + 4 Enemy AI Ships
  ↓
Game Loop (60 FPS)
  ├─ Update input (WASD/Mouse)
  ├─ Update physics (wind, sails, momentum)
  ├─ Update enemy AI (targeting, movement)
  ├─ Update combat (cannon fire, collisions)
  ├─ Update particles (explosions, water)
  ├─ Update camera (smooth following)
  ├─ Render scene (shaders, effects)
  └─ Sync network (if multiplayer)
  ↓
Earn Gold + Upgrades
  ↓
Repeat or End Match
```

---

## 📊 Performance

### Target Metrics

- **FPS**: 60 with 10+ ships on screen
- **Latency**: 20-100ms for network sync
- **Memory**: <50MB per 10 ships
- **Bandwidth**: ~50KB/s per player
- **Player Concurrency**: 4-90 per match

### Optimizations

- **LOD System**: Level-of-detail rendering based on distance
- **Area-of-Interest**: Only sync nearby players
- **Mesh Batching**: Reduces draw calls
- **Object Pooling**: Reuse projectiles and particles
- **Frustum Culling**: Skip off-screen objects
- **Performance Monitor**: Real-time FPS/latency tracking

---

## 🛠️ Technology Stack

### Frontend

- **Three.js** (v0.172) - 3D graphics engine
- **WebGL** - Hardware-accelerated rendering
- **Socket.io Client** (v4.7.2) - Real-time networking
- **Vite** (v6.0) - Build tool & dev server
- **Tweakpane** (v4.0.5) - Shader parameter UI
- **GLSL** - Custom water and caustics shaders

### Backend

- **Node.js** - JavaScript runtime
- **Socket.io** (v4+) - WebSocket server
- **Express** (optional) - REST API
- **MongoDB** (optional) - Player persistence

### Infrastructure

- **Vite** - Dev server with hot reload
- **Vercel** - Deployment ready
- **Docker** - Containerization support
- **ESBuild** - Fast transpilation

---

## 🎯 Next Steps

### For Players

1. **Read the guide**: [PLAYER_LOGIN_GAMEPLAY_GUIDE.md](PLAYER_LOGIN_GAMEPLAY_GUIDE.md)
2. **Start the game**: `npm run dev`
3. **Learn controls**: Try each key in the hints
4. **Practice wind management**: Master sailing first
5. **Upgrade your ship**: Cannons → Armor → Speed
6. **Join multiplayer**: Invite friends with ship codes
7. **Form a clan**: Compete at larger scale

### For Developers

1. **Architecture**: See [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md)
2. **Implementation Details**: Check [PHASE6_ARCHITECTURE_IMPLEMENTATION.md](PHASE6_ARCHITECTURE_IMPLEMENTATION.md)
3. **Deployment**: Use [vercel.json](vercel.json) for deployment
4. **Custom Modes**: Extend game modes in `src/systems/gamemode/`
5. **New Features**: Add ship types, weapons, upgrades

---

## 📝 Documentation

- **[PLAYER_LOGIN_GAMEPLAY_GUIDE.md](PLAYER_LOGIN_GAMEPLAY_GUIDE.md)** - Complete player guide
- **[TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md)** - System design
- **[PHASE6_ARCHITECTURE_IMPLEMENTATION.md](PHASE6_ARCHITECTURE_IMPLEMENTATION.md)** - Latest implementation
- **[FEATURE_MATRIX.md](FEATURE_MATRIX.md)** - Feature checklist
- **[ROADMAP.md](ROADMAP.md)** - Future plans

---

## 📄 License

This project is licensed under the MIT License. See LICENSE file for details.

---

## 🙋 Support

- **Issues**: Report via GitHub Issues
- **Discussions**: Join development discussions
- **Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md)

---

**Enjoy your adventures on the high seas! ⚓⛵🎮**

````

3. **Start the development server**

```bash
npm run dev
````

The game will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
ShipStrike-3D/
├── src/
│   ├── main.js                 # Game loop and initialization
│   ├── ui.js                   # Tweakpane UI setup and shader controls
│   ├── core/
│   │   ├── config.js           # Game configuration constants
│   │   ├── renderer.js         # Three.js scene, camera, lighting setup
│   │   ├── state.js            # Global game state management
│   │   └── textures.js         # Texture loading utilities
│   ├── entities/
│   │   ├── player.js           # Player ship logic and controls
│   │   ├── enemy.js            # AI enemy ship behavior
│   │   └── ship.js             # Base ship class shared functionality
│   ├── systems/
│   │   ├── camera.js           # Camera modes and following logic
│   │   ├── combat.js           # Cannon fire, projectiles, damage
│   │   ├── healthbar.js        # Ship health visualization
│   │   ├── hud.js              # Heads-up display rendering
│   │   ├── input.js            # Keyboard and mouse input handling
│   │   └── particles.js        # Particle effect system
│   ├── objects/
│   │   ├── Ground.js           # Ocean floor with caustics
│   │   ├── Water.js            # Water shader and plane
│   │   └── sky.hdr             # HDR environment map
│   └── shaders/
│       ├── water.vert          # Water shader vertex program
│       ├── water.frag          # Water shader fragment program
│       ├── caustics.vert       # Caustics vertex shader
│       └── caustics.frag       # Caustics fragment shader
├── public/
│   └── demo.png                # Demo screenshot
├── index.html                  # HTML entry point
├── package.json                # Project dependencies and scripts
├── vite.config.js              # Vite build configuration
└── vercel.json                 # Vercel deployment config
```

## Gameplay Mechanics

### Ship Controls

**Player Ship:**

- **Movement**: WASD keys to move forward/backward and strafe
- **Turret Aiming**: Mouse movement aims the cannon turret
- **Fire**: Left-click or spacebar to fire cannons
- **Camera Control**: Right-click and drag to rotate free camera, or use free camera mode

**Enemy Ships:**

- AI-controlled vessels that patrol the ocean
- Automatically detect and pursue the player
- Return fire when engaged
- Avoid collision with other ships

### Combat System

1. **Firing**: Click to fire cannon from your ship's turret toward the target
2. **Projectiles**: Cannonballs travel with physics-based trajectories
3. **Impact**: Direct hits deal damage to enemy ships
4. **Damage Model**: Multiple hits required to sink a ship
5. **Sinking**: Critically damaged ships gradually sink with particle effects
6. **Health Bars**: Visual health indicators above each ship

### Environmental Interaction

- Ships interact with the dynamic water surface
- Wave animation affects visual perception of movement
- Caustics on the ocean floor create atmospheric depth
- Particle effects respond to ship position and firing

## Core Systems

### Renderer System (`core/renderer.js`)

Manages the Three.js scene, camera, and post-processing:

- **Scene Setup**: Fog, lighting (hemispheric + directional)
- **Camera**: Perspective camera with configurable FOV
- **Lighting**:
  - Hemispheric light for ambient illumination
  - Directional light simulating sun
  - HDR environment map for realistic reflections
- **Post-Processing**: Effect composer with Bloom pass
- **Performance**: Optimized pixel ratio and renderling settings

### Water Shader System (`objects/Water.js`, `shaders/water.*`)

Advanced procedural water simulation:

- **Wave Generation**: Fractal Brownian Motion (fBm) for natural-looking waves
- **Vertex Deformation**: Vertices displaced based on noise function
- **Fragment Shading**:
  - Height-based coloring (troughs, surface, peaks)
  - Fresnel effect for realistic water appearance
  - Environment reflection mapping
  - Specular highlights
  - Subsurface scattering
  - Caustics injection from ground
  - Foam generation

### Combat System (`systems/combat.js`)

Handles all combat mechanics:

- **Projectile Management**: Spawn, update, and collision detection for cannonballs
- **Damage Calculation**: Health reduction on hit
- **Knockback**: Ship displacement on impact
- **Explosion Effects**: Particle system triggers on hit
- **Sinking Logic**: Progressive submersion of damaged ships

### Camera System (`systems/camera.js`)

Multiple camera modes for different gameplay scenarios:

- **Free Camera**: Full 3D exploration with mouse/keyboard control
- **Lock-On Mode**: Follow player with mouse-controlled yaw
- **Third-Person**: Smooth camera following with momentum
- **Mode Cycling**: Easy switching between camera types

### Input System (`systems/input.js`)

Captures and processes player input:

- **Keyboard**: WASD for movement, spacebar to fire
- **Mouse**: Aiming, camera control, free camera navigation
- **Events**: Proper event listener cleanup and delegation

### Particle System (`systems/particles.js`)

Manages particle effects:

- **Explosions**: Triggered on cannonball impacts
- **Water Splashes**: Generated around ship movement
- **Firing Effects**: Smoke and fire from cannons
- **Sinking Bubbles**: Particles during ship sinking

### State Management (`core/state.js`)

Global game state storage:

- Player ship reference
- All active enemies
- Active projectiles
- Active particles
- Game configuration values

## Graphics & Shaders

### Water Shader Pipeline

The water shader (`shaders/water.vert` and `shaders/water.frag`) implements sophisticated ocean simulation:

**Vertex Shader:**

- Applies fractal Brownian motion for wave displacement
- Deforms mesh vertices based on height-based noise
- Calculates normal vectors for lighting
- Projects coordinates for caustics sampling

**Fragment Shader:**

- **Height-Based Coloring**: Lerps between three colors based on wave height
- **Fresnel Effect**: Calculates viewing angle reflection amount
- **Normal Mapping**: Per-pixel lighting calculations
- **Environment Reflection**: Samples environment map with distortion
- **Specular Highlights**: Sun reflection on wave peaks
- **Subsurface Scattering**: Light penetration effect
- **Caustics**: Animated patterns showing underwater light caustics
- **Foam**: Bright white foam on wave peaks and movement zones

### Caustics Shader

Separate caustics shader for ground plane:

- Animated noise-based caustics pattern
- Scaled to match water detail
- Blended with ocean floor texture
- Creates depth perception

### Shader Parameters (Adjustable via UI)

**Wave Physics:**

- `wavesAmplitude`: Height of waves (0-2)
- `wavesFrequency`: Spatial frequency (0.1-3)
- `wavesSpeed`: Animation speed (0-2)
- `wavesIterations`: Octave count (1-8)
- `wavesPersistence`: Octave amplitude decay
- `wavesLacunarity`: Octave frequency multiplier

**Optical Properties:**

- `fresnelScale/Power/Bias`: Fresnel effect control
- `specularIntensity/Power`: Specular highlight strength
- `envMapIntensity`: Environment reflection strength
- `distortionScale`: Reflection distortion amount

**Visual Effects:**

- `causticsIntensity/Scale/Speed`: Caustics animation control
- `sssIntensity/Power`: Subsurface scattering effect
- `foamIntensity`: Foam amount and visibility
- Surface/Trough/Peak/SSS/Caustics/Foam colors

## Controls

### Keyboard

| Key      | Action            |
| -------- | ----------------- |
| W        | Move forward      |
| S        | Move backward     |
| A        | Strafe left       |
| D        | Strafe right      |
| Spacebar | Fire cannons      |
| C        | Cycle camera mode |

### Mouse

| Action                | Effect                                        |
| --------------------- | --------------------------------------------- |
| Move                  | Aim turret / Camera control (depends on mode) |
| Left Click / Spacebar | Fire cannons                                  |
| Right Click + Drag    | Free camera rotation                          |

### UI

- Press `H` to toggle help/HUD display
- FPS counter shown in top-left corner
- Live shader parameters in Tweakpane panel (right side)

## Configuration

### Game Settings (`core/config.js`)

Key configuration constants:

- `WATER_SIZE`: Size of water plane (default: 4000)
- `CAMERA_FOV`: Camera field of view (default: 75)
- `TONE_EXPOSURE`: Post-processing exposure (default: 0.7)
- `BLOOM_STRENGTH`: Bloom effect intensity (default: 2.0)

### Shader Settings (Tweakpane UI)

All shader parameters are adjustable in real-time through the UI panel. Settings are automatically saved to browser localStorage and restored on page reload.

### Environment Variables

Deployment configurations can be adjusted in:

- `vite.config.js`: Build optimization settings
- `vercel.json`: Deployment configuration for Vercel

## Development

### Development Server

```bash
npm run dev
```

Starts Vite dev server with hot module reloading on `http://localhost:5173`

### Code Style

- **Modular Design**: Each system and entity is isolated in its own file
- **ES6 Modules**: Modern JavaScript module syntax throughout
- **Three.js Best Practices**: Proper material management, memory cleanup
- **Shader Organization**: GLSL shaders in separate files with vite-plugin-glsl
- **State Management**: Centralized state in `core/state.js`

### Adding New Features

1. **New Game Entity**: Create file in `src/entities/`
2. **New System**: Create file in `src/systems/`
3. **New Shader**: Add `.vert` and `.frag` files in `src/shaders/`
4. **UI Controls**: Add parameter bindings in `src/ui.js`
5. **Configuration**: Add constants to `src/core/config.js`

### Debugging

- **Browser DevTools**: Open F12 to inspect assets and console logs
- **Three.js Inspector**: Available through browser extensions
- **Shader Debugging**: Three.js provides error messages for shader compilation failures
- **FPS Counter**: Built-in FPS display in top-left corner

## Performance Optimization

The project implements several performance optimizations:

### Rendering Optimization

- **Reduced Pixel Ratio**: Capped at 1.0 for massive fillrate boost
- **Antialiasing**: Disabled on initial render (bloom provides smoothing)
- **Vertex Shader Efficiency**: Lower water resolution (200x200) reduces noise calculations
- **Reflection Resolution**: Reduced to 256px for faster reflection updates
- **Selective Rendering**: Only active entities rendered

### Memory Optimization

- **Object Pooling**: Particles and projectiles reuse instances
- **Texture Management**: Efficient texture caching and reuse
- **Material Sharing**: Ships share base materials where possible
- **Lazy Loading**: Assets loaded only when needed

### LOD System

- **Distance-Based Detail**: Reduce shader complexity for distant objects
- **Viewport Culling**: Only render visible geometry
- **Frustum Culling**: Three.js automatic frustum culling

### Best Practices

- Monitor FPS counter for performance issues
- Adjust water resolution and reflection settings for your hardware
- Use browser DevTools performance profiler for bottlenecks
- Consider reducing enemy count or effect particle limits on slower devices

## Technology Stack

### Core Framework

- **Three.js** (v0.172.0): 3D graphics library
- **Vite** (v6.0.5): Modern build tool and dev server

### Shading & Graphics

- **GLSL**: Custom vertex and fragment shaders
- **HDR Environment Maps**: RGBE format for realistic reflections
- **Post-Processing**: WebGL-based effect composition

### UI & Interaction

- **Tweakpane** (v4.0.5): Live parameter tuning interface
- **localStorage API**: Settings persistence
- **Vanilla JavaScript**: DOM manipulation and input handling

### Build & Deployment

- **vite-plugin-glsl** (v1.3.1): GLSL shader bundling
- **Terser** (v5.46.0): JavaScript minification
- **Vercel**: Cloud deployment platform

### Development Tools

- **Node.js** (v16+): Runtime environment
- **npm**: Package management

## Browser Compatibility

- **Chrome/Edge**: Full support (v90+)
- **Firefox**: Full support (v88+)
- **Safari**: Full support (v14+)
- **Mobile**: Limited support (canvas limited on many mobile browsers)

Requires WebGL2 support for optimal rendering.

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Areas for Contribution

- Additional ship types and models
- New combat mechanics (torpedoes, sea mines)
- Improved AI behavior
- Additional visual effects
- Performance optimizations
- Documentation improvements
- Bug fixes and optimizations

## Future Enhancements

Potential features for future development:

- **Multiplayer Combat**: Real-time PvP naval battles
- **Ship Customization**: Upgrade ship armaments and properties
- **Dynamic Weather**: Storm effects, wind simulation
- **New Maps**: Additional ocean environments and scenarios
- **Campaign Mode**: Story-driven missions and progression
- **Sound Design**: 3D audio and weapon effects
- **Mobile Optimization**: Touch controls and mobile rendering
- **Leaderboards**: Competitive gameplay tracking

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Three.js community for excellent 3D graphics library
- Tweakpane for interactive UI framework
- Ocean shader techniques inspired by industry standards
- WebGL optimization resources and best practices

## Support

For issues, questions, or suggestions:

1. Check existing GitHub issues
2. Create a detailed bug report with screenshots
3. Include system information (OS, browser, GPU)
4. Describe steps to reproduce the issue

---

**Happy sailing and may your cannons always find their mark!** ⚔️🌊
