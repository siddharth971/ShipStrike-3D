# ShipStrike-3D vs Ships 3D

Last updated: 2026-04-03

## Bottom line

This project is **not yet the full Ships 3D-style game** described in the reference guide.

It is currently a **playable browser naval combat prototype** with:

- account creation and login
- a live server connection
- ship spawning
- a rendered 3D world
- a HUD, menu, upgrades screen, and leaderboard screen
- a new lobby flow with mode selection, server status, and ship-code capture

It does **not yet** provide the full deck-walking, crew-station, sail-management, trading-economy, or shared-ship multiplayer loop from the reference game.

## What now matches the reference better

- Browser-first play flow
- Username-based quick start
- Distinct lobby before spawn
- Mode selection for `Team Flags` and `Trader Mode`
- Server snapshot on the login screen
- Ship-code input captured before launch
- In-world mode briefing after spawn

## What is partially implemented

### Modes

`frontend/src/systems/gamemode/` already contains separate `TeamFlagsMode`, `TradingMode`, and `GameModeManager` modules.

Current state:

- the new lobby lets the player pick a mode
- the runtime now loads a mode-aware local scenario
- Team Flags and Trader now change the local encounter setup and briefing

Still missing:

- authoritative server-side game-mode switching
- team assignment synced across players
- real trading ports and cargo flow in the live session
- flag capture objectives in the live session

### Multiplayer

Current state:

- socket authentication works
- ship spawn works
- game state polling works
- server status API works

Still missing:

- real shared-ship crew joining through ship codes
- crew role handoff across multiple human players
- server browser with multiple regions or lobbies
- meaningful session matchmaking

### UI and progression

Current state:

- HUD is live
- menu, upgrades, and leaderboard screens exist
- login now looks closer to a naval lobby

Still missing:

- a full Ships 3D main menu with server list and detailed ship selection
- wall-of-fame style persistent ranking flow
- polished progression tied to the full reference design

## What is still missing from the Ships 3D reference

### Core gameplay structure

- first-person sailor walking around the deck as the primary loop
- interactable helm, cannon stations, and sail controls using station takeover
- helper bot crew behavior with station handoff
- wind-driven sailing and sail-angle management
- boarding flow with sword and musket combat as a complete loop

### Ships and combat depth

- the full 3-ship progression path from Sloop to Frigate to Warship
- the full 6-cannonball tactical system behaving like the reference
- broadside-focused deck crew gameplay with station specialization
- reliable friend-crew coordination on one shared ship

### Trader mode depth

- islands and ports integrated into the live runtime
- buy-low, sell-high cargo trading loop
- NPC trader interactions in the running game
- bounty economy and piracy loop

### Social systems

- working clans in the live client flow
- working friends list in the live client flow
- shared-ship invite flow that actually moves players onto the same vessel

## What changed in this pass

- Replaced the bare username login with a proper lobby in `frontend/src/systems/uiController.js`
- Added mode selection, server status, and ship-code capture to the lobby
- Wired lobby mode choice into `frontend/src/gameClient.js`
- Made the local runtime mode-aware in `frontend/src/worldRuntime.js`
- Added an in-world mode briefing so the selected mode remains visible after spawn

## Recommended next milestones

1. Add authoritative server-side mode switching and session metadata.
2. Implement real ship-code crew joining on the backend and client.
3. Replace the current local free-sailing bridge with true shared-ship deck gameplay.
4. Add ports, islands, and live Trader mode interactions.
5. Add real sail and wind mechanics with crew-station takeover.

## Honest status

If the target is "a game like Ships 3D", this repo is now **closer in structure and presentation**, but it is still **a prototype on the path to that game**, not feature parity yet.
