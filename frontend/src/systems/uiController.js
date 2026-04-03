// frontend/src/systems/uiController.js
// UI management - handles all game UI elements

class UIController {
  constructor(gameState, networkClient) {
    this.gameState = gameState;
    this.network = networkClient;
    
    this.screens = {
      login: null,
      hud: null,
      menu: null,
      upgrades: null,
      leaderboard: null,
      settings: null
    };
    
    this.currentScreen = 'login';
    this.isMenuOpen = false;
    this.selectedUpgrade = null;

    // Listen for game state changes
    this.gameState.on('playerUpdated', () => this.updateHUD());
    this.gameState.on('shipsUpdated', () => this.updateRadar());
    this.gameState.on('leaderboardUpdated', () => this.updateLeaderboard());
  }

  /**
   * Create login screen UI
   */
  createLoginScreen(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`❌ Could not find login container: ${containerId}`);
      return;
    }

    container.style.display = 'block';
    container.innerHTML = `
      <div id="login-form" class="login-container">
        <h1>⚔️ ShipStrike-3D</h1>
        <div class="login-content">
          <input 
            type="text" 
            id="username-input" 
            placeholder=""
            class="login-input"
          />
          <button id="login-button" class="login-button">Set Sail</button>
          <p class="login-info">New players automatically create an account</p>
        </div>
      </div>
    `;

    const loginBtn = document.getElementById('login-button');
    const usernameInput = document.getElementById('username-input');

    const handleLogin = () => {
      const username = usernameInput.value.trim();
      if (username.length === 0) {
        alert('Please enter a username');
        return;
      }
      this.emit('login', { username });
    };

    loginBtn.addEventListener('click', handleLogin);
    usernameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleLogin();
    });

    return container;
  }

  /**
   * Create HUD (heads-up display)
   */
  createHUD(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`❌ Could not find HUD container: ${containerId}`);
      return;
    }

    container.style.display = 'none';
    container.innerHTML = `
      <div id="hud" class="hud">
        <!-- Top-left: Player stats -->
        <div class="hud-section top-left">
          <div class="stat-row">
            <span class="stat-label">Level:</span>
            <span id="hud-level" class="stat-value">1</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Gold:</span>
            <span id="hud-gold" class="stat-value">500</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Ship HP:</span>
            <span id="hud-hp" class="stat-value">150/150</span>
          </div>
        </div>

        <!-- Top-right: XP bar -->
        <div class="hud-section top-right">
          <div class="xp-container">
            <div class="xp-bar">
              <div id="xp-progress" class="xp-progress" style="width: 0%"></div>
            </div>
            <span class="xp-text" id="xp-text">0 / 100 XP</span>
          </div>
        </div>

        <!-- Center: Crosshair -->
        <div class="crosshair"></div>

        <!-- Bottom-left: Ammo type -->
        <div class="hud-section bottom-left">
          <div id="ammo-display" class="ammo-display">
            <span class="ammo-label">Ammo:</span>
            <span id="ammo-type" class="ammo-type">Normal</span>
            <span class="ammo-hint">[Q/E] to switch</span>
          </div>
        </div>

        <!-- Bottom-right: Controls hint -->
        <div class="hud-section bottom-right">
          <div class="controls-hint">
            <p>WASD: Move | Mouse: Aim | Click: Fire</p>
            <p>ESC: Menu | TAB: Leaderboard</p>
          </div>
        </div>

        <!-- Center-bottom: Throttle indicator -->
        <div class="hud-section center-bottom">
          <div class="throttle-container">
            <span>Throttle:</span>
            <div class="throttle-bar">
              <div id="throttle-indicator" class="throttle-fill" style="width: 0%"></div>
            </div>
            <span id="throttle-value">0%</span>
          </div>
        </div>

        <!-- Minimap -->
        <div id="minimap" class="minimap">
          <canvas id="minimap-canvas" width="200" height="200"></canvas>
        </div>
      </div>
    `;

    this.screens.hud = container;
    return container;
  }

  /**
   * Create main menu
   */
  createMainMenu(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`❌ Could not find menu container: ${containerId}`);
      return;
    }

    container.style.display = 'none';
    container.innerHTML = `
      <div id="main-menu" class="menu-overlay">
        <div class="menu-panel">
          <h2>⚙️ Menu</h2>
          <button class="menu-button" id="resume-button">Resume Game</button>
          <button class="menu-button" id="upgrades-button">Upgrade Ship</button>
          <button class="menu-button" id="leaderboard-button">Leaderboard</button>
          <button class="menu-button" id="settings-button">Settings</button>
          <button class="menu-button logout" id="logout-button">Logout</button>
        </div>
      </div>
    `;

    // Attach event listeners
    document.getElementById('resume-button')?.addEventListener('click', () => {
      this.closeMenu();
    });

    document.getElementById('upgrades-button')?.addEventListener('click', () => {
      this.showUpgradesMenu();
    });

    document.getElementById('leaderboard-button')?.addEventListener('click', () => {
      this.showLeaderboard();
    });

    document.getElementById('logout-button')?.addEventListener('click', () => {
      this.emit('logout');
    });

    return container;
  }

  /**
   * Create upgrades menu
   */
  createUpgradesMenu(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`❌ Could not find upgrades container: ${containerId}`);
      return;
    }

    container.style.display = 'none';

    const upgrades = [
      { type: 'hull', name: 'Hull Armor', description: '+20 HP per level', icon: '🛡️' },
      { type: 'cannons', name: 'Cannon Power', description: '+1.5 Damage per level', icon: '💣' },
      { type: 'speed', name: 'Ship Speed', description: '+0.5 Speed per level', icon: '💨' },
      { type: 'acceleration', name: 'Acceleration', description: '+0.2 Accel per level', icon: '⚡' },
      { type: 'crew', name: 'Crew Quarters', description: '+1 Crew Capacity per level', icon: '👥' }
    ];

    let upgradesHTML = `
      <div id="upgrades-menu" class="menu-overlay">
        <div class="upgrades-panel">
          <h2>⬆️ Ship Upgrades</h2>
          <div class="gold-display">Gold: <span id="upgrade-gold">${this.gameState.gold}</span></div>
          <div class="upgrades-grid">
    `;

    upgrades.forEach(upgrade => {
      upgradesHTML += `
        <div class="upgrade-card" data-upgrade="${upgrade.type}">
          <div class="upgrade-icon">${upgrade.icon}</div>
          <div class="upgrade-name">${upgrade.name}</div>
          <div class="upgrade-description">${upgrade.description}</div>
          <div class="upgrade-level">Level: <span class="current-level">0</span>/20</div>
          <button class="upgrade-button" data-upgrade="${upgrade.type}">
            Buy: <span class="upgrade-cost">-</span> Gold
          </button>
        </div>
      `;
    });

    upgradesHTML += `
          </div>
          <button class="menu-back-button" id="upgrades-back">Back to Menu</button>
        </div>
      </div>
    `;

    container.innerHTML = upgradesHTML;

    // Attach upgrade button listeners
    document.querySelectorAll('.upgrade-button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const upgradeType = e.target.dataset.upgrade;
        this.purchaseUpgrade(upgradeType);
      });
    });

    document.getElementById('upgrades-back')?.addEventListener('click', () => {
      this.showMainMenu();
    });

    return container;
  }

  /**
   * Create leaderboard
   */
  createLeaderboard(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`❌ Could not find leaderboard container: ${containerId}`);
      return;
    }

    container.style.display = 'none';
    container.innerHTML = `
      <div id="leaderboard-menu" class="menu-overlay">
        <div class="leaderboard-panel">
          <h2>🏆 Leaderboard</h2>
          <div id="leaderboard-list" class="leaderboard-list">
            <div class="loading">Loading leaderboard...</div>
          </div>
          <button class="menu-back-button" id="leaderboard-back">Back</button>
        </div>
      </div>
    `;

    document.getElementById('leaderboard-back')?.addEventListener('click', () => {
      this.showMainMenu();
    });

    return container;
  }

  /**
   * Update HUD with current game state
   */
  updateHUD() {
    const ship = this.gameState.ship || {};
    const hp = Number(ship.hp) || 0;
    const maxHP = Number(ship.maxHP) || 0;
    const ammoType = String(ship.ammoType || 'normal').toUpperCase();
    const throttlePercent = Number(ship.throttle) || 0;

    const levelEl = document.getElementById('hud-level');
    if (levelEl) levelEl.textContent = this.gameState.level;
    
    const goldEl = document.getElementById('hud-gold');
    if (goldEl) goldEl.textContent = this.gameState.gold;
    
    const hpEl = document.getElementById('hud-hp');
    if (hpEl) hpEl.textContent = `${Math.ceil(hp)}/${maxHP}`;

    // Update XP bar
    const xpPercent = this.gameState.getXPPercentage() * 100;
    const xpProgressEl = document.getElementById('xp-progress');
    if (xpProgressEl) xpProgressEl.style.width = xpPercent + '%';
    
    const xpTextEl = document.getElementById('xp-text');
    if (xpTextEl) xpTextEl.textContent = `${this.gameState.xp} / ${this.gameState.maxXP} XP`;

    // Update HP bar
    const hpPercent = this.gameState.getHPPercentage() * 100;
    const hpBar = document.querySelector('.hp-bar .hp-fill');
    if (hpBar) hpBar.style.width = hpPercent + '%';

    // Update ammo type
    const ammoEl = document.getElementById('ammo-type');
    if (ammoEl) ammoEl.textContent = ammoType;

    // Update throttle
    const throttleIndicator = document.getElementById('throttle-indicator');
    if (throttleIndicator) throttleIndicator.style.width = throttlePercent + '%';
    
    const throttleValue = document.getElementById('throttle-value');
    if (throttleValue) throttleValue.textContent = throttlePercent.toFixed(0) + '%';
  }

  /**
   * Update minimap
   */
  updateRadar() {
    const canvas = document.getElementById('minimap-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const scale = 0.05; // 1 unit on map = 0.05 pixels

    // Clear canvas
    ctx.fillStyle = '#1a3a3a';
    ctx.fillRect(0, 0, w, h);

    // Draw border
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, w, h);

    // Draw player ship
    ctx.fillStyle = '#ff9900';
    const playerX = (this.gameState.ship.position.x + 2000) * scale;
    const playerY = (this.gameState.ship.position.z + 2000) * scale;
    ctx.fillRect(playerX - 3, playerY - 3, 6, 6);

    // Draw other ships
    ctx.fillStyle = '#ff0000';
    this.gameState.otherShips.forEach(ship => {
      const x = (ship.position.x + 2000) * scale;
      const y = (ship.position.z + 2000) * scale;
      ctx.fillRect(x - 2, y - 2, 4, 4);
    });
  }

  /**
   * Update leaderboard display
   */
  updateLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    if (!list || this.gameState.leaderboard.length === 0) return;

    let html = '<table class="leaderboard-table"><tr><th>Rank</th><th>Name</th><th>Level</th><th>Ships Destroyed</th></tr>';

    this.gameState.leaderboard.forEach((player, index) => {
      html += `
        <tr>
          <td>${index + 1}</td>
          <td>${player.playerName}</td>
          <td>${player.level}</td>
          <td>${player.shipsDestroyed}</td>
        </tr>
      `;
    });

    html += '</table>';
    list.innerHTML = html;
  }

  /**
   * Show/hide menu
   */
  toggleMenu() {
    if (this.isMenuOpen) {
      this.closeMenu();
    } else {
      this.showMainMenu();
    }
  }

  /**
   * Show main menu
   */
  showMainMenu() {
    if (this.screens.menu) this.screens.menu.style.display = 'block';
    this.isMenuOpen = true;
  }

  /**
   * Show upgrades menu
   */
  showUpgradesMenu() {
    if (this.screens.upgrades) this.screens.upgrades.style.display = 'block';
  }

  /**
   * Show leaderboard
   */
  showLeaderboard() {
    this.network.getLeaderboard();
    if (this.screens.leaderboard) this.screens.leaderboard.style.display = 'block';
  }

  /**
   * Close menu
   */
  closeMenu() {
    Object.values(this.screens).forEach(screen => {
      if (screen) screen.style.display = 'none';
    });
    this.isMenuOpen = false;
  }

  /**
   * Purchase upgrade
   */
  async purchaseUpgrade(upgradeType) {
    try {
      const result = await this.network.purchaseUpgrade(upgradeType);
      console.log(`✅ Upgraded ${upgradeType} to level ${result.newLevel}`);
    } catch (error) {
      console.error(`❌ Failed to purchase upgrade: ${error.message}`);
      alert(`Failed to purchase upgrade: ${error.message}`);
    }
  }

  // Event system
  listeners = new Map();

  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(callback);
  }

  emit(eventName, data) {
    if (this.listeners.has(eventName)) {
      this.listeners.get(eventName).forEach(handler => handler(data));
    }
  }
}

export default UIController;
