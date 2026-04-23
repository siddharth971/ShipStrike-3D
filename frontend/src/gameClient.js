// frontend/src/gameClient.js
// Main game client - integrates all systems

import NetworkClient from './systems/networkClient.js';
import GameState from './systems/gameStateManager.js';
import AuthSystem from './systems/auth.js';
import UIController from './systems/uiController.js';
import InputController from './systems/inputController.js';
import { startWorld, stopWorld, updateWorld } from './worldRuntime.js';

class GameClient {
  constructor() {
    console.log('Initializing GameClient...');

    this.auth = new AuthSystem();
    this.network = new NetworkClient();
    this.gameState = new GameState(this.network);
    this.ui = new UIController(this.gameState, this.network);
    this.input = new InputController(this.gameState, this.network);

    this.isRunning = false;
    this.currentScreen = 'login';
    this.currentMode = 'teamflags';
    this.currentShipCode = '';

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers between systems
   */
  setupEventHandlers() {
    this.ui.on('login', async (data) => {
      await this.handleLogin(data);
    });

    this.ui.on('logout', () => {
      this.handleLogout();
    });

    this.input.on('menuToggle', () => {
      this.ui.toggleMenu();
    });

    this.input.on('leaderboardToggle', () => {
      this.ui.showLeaderboard();
    });

    this.gameState.on('playerUpdated', () => {
      console.log(`Player updated: Level ${this.gameState.level}`);
    });

    this.gameState.on('chatMessageAdded', (data) => {
      console.log(`${data.playerName}: ${data.message}`);
    });
  }

  /**
   * Initialize the game
   */
  async init() {
    try {
      console.log('Starting game initialization...');
      this.createUIContainers();

      console.log('Connecting to game server...');
      await this.network.connect();

      this.showLoginScreen();
      console.log('GameClient initialized');
      return this;
    } catch (error) {
      console.error('Failed to initialize GameClient:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Create UI containers in DOM
   */
  createUIContainers() {
    const mainContainer = document.getElementById('app') || document.body;

    if (!document.getElementById('login-container')) {
      const loginDiv = document.createElement('div');
      loginDiv.id = 'login-container';
      mainContainer.appendChild(loginDiv);
    }

    if (!document.getElementById('hud-container')) {
      const hudDiv = document.createElement('div');
      hudDiv.id = 'hud-container';
      mainContainer.appendChild(hudDiv);
    }

    if (!document.getElementById('menu-container')) {
      const menuDiv = document.createElement('div');
      menuDiv.id = 'menu-container';
      mainContainer.appendChild(menuDiv);
    }

    if (!document.getElementById('upgrades-container')) {
      const upgradesDiv = document.createElement('div');
      upgradesDiv.id = 'upgrades-container';
      mainContainer.appendChild(upgradesDiv);
    }

    if (!document.getElementById('leaderboard-container')) {
      const leaderboardDiv = document.createElement('div');
      leaderboardDiv.id = 'leaderboard-container';
      mainContainer.appendChild(leaderboardDiv);
    }

    this.ui.createLoginScreen('login-container');
    this.ui.createHUD('hud-container');
    this.ui.createMainMenu('menu-container');
    this.ui.createUpgradesMenu('upgrades-container');
    this.ui.createLeaderboard('leaderboard-container');
  }

  /**
   * Show login screen
   */
  showLoginScreen() {
    const loginContainer = document.getElementById('login-container');
    const hudContainer = document.getElementById('hud-container');
    const menuContainer = document.getElementById('menu-container');
    const upgradesContainer = document.getElementById('upgrades-container');
    const leaderboardContainer = document.getElementById('leaderboard-container');

    if (loginContainer) loginContainer.style.display = 'block';
    if (hudContainer) hudContainer.style.display = 'none';
    if (menuContainer) menuContainer.style.display = 'none';
    if (upgradesContainer) upgradesContainer.style.display = 'none';
    if (leaderboardContainer) leaderboardContainer.style.display = 'none';

    this.currentScreen = 'login';
    this.ui.refreshLoginServerStatus();
  }

  /**
   * Show game screen
   */
  showGameScreen() {
    const loginContainer = document.getElementById('login-container');
    const hudContainer = document.getElementById('hud-container');
    const menuContainer = document.getElementById('menu-container');

    if (loginContainer) loginContainer.style.display = 'none';
    if (hudContainer) hudContainer.style.display = 'block';
    if (menuContainer) menuContainer.style.display = 'none';

    this.currentScreen = 'game';
  }

  /**
   * Handle player login
   */
  async handleLogin(loginData) {
    try {
      const normalizedLogin = typeof loginData === 'string'
        ? { username: loginData, mode: 'teamflags', shipCode: '' }
        : (loginData || {});
      const username = String(normalizedLogin.username || '').trim();
      const mode = normalizedLogin.mode === 'trading' ? 'trading' : 'teamflags';
      const shipCode = String(normalizedLogin.shipCode || '').trim();

      if (!username) {
        throw new Error('Please enter a username');
      }

      console.log(`Logging in as ${username}...`);

      this.currentMode = mode;
      this.currentShipCode = shipCode;

      const account = this.auth.createAccount(username);
      console.log(`Account created: ${account.playerId}`);

      const playerId = account.playerId;
      console.log('Authenticating with server...');
      await this.network.authenticate(playerId, username);

      this.gameState.playerId = playerId;
      this.gameState.playerName = username;
      this.gameState.gameMode = mode;
      this.gameState.shipCode = shipCode;

      console.log('Spawning ship...');
      const ship = await this.network.spawnShip('sloop');
      this.gameState.setShipState(ship);
      console.log(`Ship spawned: ${ship.type}`);

      this.showGameScreen();
      startWorld(this.gameState, {
        mode,
        shipCode,
        playerName: username
      });

      console.log(`${username} logged in successfully`);
      this.startGameLoop();
    } catch (error) {
      console.error('Login failed:', error);
      console.error('Error details:', error.message);
      alert(`Login failed: ${error.message}`);
    }
  }

  /**
   * Handle logout
   */
  async handleLogout() {
    console.log('Logging out...');

    this.stopGameLoop();
    this.network.disconnect();

    stopWorld();
    this.gameState.reset();
    this.auth.logout();

    this.currentMode = 'teamflags';
    this.currentShipCode = '';

    this.showLoginScreen();
    console.log('Logged out');
  }

  /**
   * Start main game loop
   */
  startGameLoop() {
    if (this.isRunning) return;

    console.log('Starting game loop...');
    this.isRunning = true;

    const gameLoop = () => {
      if (!this.isRunning) return;

      this.update();

      if (Math.random() < 0.33) {
        this.network.requestGameState();
      }

      requestAnimationFrame(gameLoop);
    };

    requestAnimationFrame(gameLoop);
  }

  /**
   * Stop game loop
   */
  stopGameLoop() {
    console.log('Stopping game loop...');
    this.isRunning = false;
  }

  /**
   * Update game state
   */
  update() {
    updateWorld(this.gameState);
    this.ui.updateHUD();
    this.ui.updateRadar();
  }

  /**
   * Toggle fullscreen
   */
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  /**
   * Get game stats
   */
  getStats() {
    return {
      playerId: this.gameState.playerId,
      playerName: this.gameState.playerName,
      level: this.gameState.level,
      gold: this.gameState.gold,
      shipType: this.gameState.ship.type,
      mode: this.currentMode,
      shipCode: this.currentShipCode,
      isRunning: this.isRunning,
      isConnected: this.network.isConnected,
      currentScreen: this.currentScreen
    };
  }
}

export default GameClient;
