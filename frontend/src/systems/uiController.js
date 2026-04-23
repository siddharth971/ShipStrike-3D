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
      console.error(`Could not find login container: ${containerId}`);
      return;
    }

    this.screens.login = container;
    container.style.display = 'block';
    container.innerHTML = `
      <div id="login-form" class="login-container">
        <div class="login-backdrop"></div>
        <div class="login-shell">
          <section class="login-hero">
            <p class="login-kicker">Browser naval combat prototype</p>
            <h1>ShipStrike-3D</h1>
            <p class="login-subtitle">
              Enter the current local sea, choose your battle style, and launch
              straight into a live 3D session.
            </p>
            <div class="login-mode-summary">
              <span id="selected-mode-badge" class="login-badge">Team Flags</span>
              <p id="selected-mode-copy" class="login-mode-copy">
                Fleet skirmish focus with direct enemy pressure and faster action.
              </p>
            </div>
          </section>

          <section class="login-content login-panel">
            <label class="login-label" for="username-input">Captain Name</label>
            <input
              type="text"
              id="username-input"
              placeholder="Enter your captain name"
              class="login-input"
              maxlength="24"
              autocomplete="username"
            />

            <div class="login-section-header">
              <span class="login-label">Choose Mode</span>
              <span class="login-helper">Local session flavor is mode-aware</span>
            </div>
            <div class="mode-grid">
              <button type="button" class="mode-card active" data-mode="teamflags">
                <span class="mode-card-title">Team Flags</span>
                <span class="mode-card-copy">Direct naval combat and heavier enemy pressure.</span>
              </button>
              <button type="button" class="mode-card" data-mode="trading">
                <span class="mode-card-title">Trader Mode</span>
                <span class="mode-card-copy">Lower-pressure sea lanes with port-style objectives.</span>
              </button>
            </div>

            <div class="lobby-grid">
              <div class="lobby-card">
                <div class="login-section-header">
                  <span class="login-label">Server Snapshot</span>
                  <button type="button" id="refresh-server-button" class="text-button">Refresh</button>
                </div>
                <div class="server-status-row">
                  <span id="lobby-server-status" class="server-status-chip" data-state="loading">
                    Checking server...
                  </span>
                </div>
                <div class="server-stats">
                  <div class="server-stat">
                    <span class="server-stat-label">Players</span>
                    <span id="lobby-player-count" class="server-stat-value">--</span>
                  </div>
                  <div class="server-stat">
                    <span class="server-stat-label">Ships</span>
                    <span id="lobby-ship-count" class="server-stat-value">--</span>
                  </div>
                  <div class="server-stat">
                    <span class="server-stat-label">Uptime</span>
                    <span id="lobby-uptime" class="server-stat-value">--</span>
                  </div>
                </div>
              </div>

              <div class="lobby-card">
                <label class="login-label" for="ship-code-input">Ship Code</label>
                <input
                  type="text"
                  id="ship-code-input"
                  placeholder="Optional crew code"
                  class="login-input login-input-compact"
                  maxlength="24"
                  autocomplete="off"
                />
                <p class="login-info login-info-inline">
                  Crew code is captured in the lobby now. Shared-ship joining is
                  still a follow-up server task.
                </p>
              </div>
            </div>

            <button id="login-button" class="login-button">Set Sail In Team Flags</button>
            <p class="login-info">New players automatically create a local account profile.</p>
          </section>
        </div>
      </div>
    `;

    const loginBtn = container.querySelector('#login-button');
    const usernameInput = container.querySelector('#username-input');
    const shipCodeInput = container.querySelector('#ship-code-input');
    const refreshServerBtn = container.querySelector('#refresh-server-button');
    const selectedModeBadge = container.querySelector('#selected-mode-badge');
    const selectedModeCopy = container.querySelector('#selected-mode-copy');
    const modeButtons = Array.from(container.querySelectorAll('.mode-card'));
    const modeDescriptions = {
      teamflags: {
        label: 'Team Flags',
        copy: 'Fleet skirmish focus with direct enemy pressure and faster action.'
      },
      trading: {
        label: 'Trader Mode',
        copy: 'Lower-pressure sea lanes with port-style objectives and longer routes.'
      }
    };
    let selectedMode = 'teamflags';

    const updateModeSelection = (mode) => {
      selectedMode = modeDescriptions[mode] ? mode : 'teamflags';
      modeButtons.forEach((button) => {
        button.classList.toggle('active', button.dataset.mode === selectedMode);
      });

      const selected = modeDescriptions[selectedMode];
      if (selectedModeBadge) selectedModeBadge.textContent = selected.label;
      if (selectedModeCopy) selectedModeCopy.textContent = selected.copy;
      if (loginBtn) loginBtn.textContent = `Set Sail In ${selected.label}`;
    };

    const handleLogin = () => {
      const username = usernameInput.value.trim();
      if (username.length === 0) {
        alert('Please enter a username');
        return;
      }

      this.emit('login', {
        username,
        mode: selectedMode,
        shipCode: shipCodeInput?.value.trim() || ''
      });
    };

    modeButtons.forEach((button) => {
      button.addEventListener('click', () => updateModeSelection(button.dataset.mode));
    });

    loginBtn?.addEventListener('click', handleLogin);
    usernameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
    shipCodeInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
    refreshServerBtn?.addEventListener('click', () => this.refreshLoginServerStatus());

    updateModeSelection(selectedMode);
    this.refreshLoginServerStatus();

    return container;
  }

  /**
   * Refresh the lobby server status card
   */
  async refreshLoginServerStatus() {
    const statusEl = document.getElementById('lobby-server-status');
    const playersEl = document.getElementById('lobby-player-count');
    const shipsEl = document.getElementById('lobby-ship-count');
    const uptimeEl = document.getElementById('lobby-uptime');

    if (!statusEl || !playersEl || !shipsEl || !uptimeEl) {
      return;
    }

    statusEl.textContent = 'Checking server...';
    statusEl.dataset.state = 'loading';

    try {
      const status = await this.network.getServerStatus();
      statusEl.textContent = status.status === 'online' ? 'Server online' : 'Server unavailable';
      statusEl.dataset.state = status.status === 'online' ? 'online' : 'offline';
      playersEl.textContent = String(status.players ?? 0);
      shipsEl.textContent = String(status.ships ?? 0);
      uptimeEl.textContent = this.formatDuration(status.uptime);
    } catch (error) {
      statusEl.textContent = 'Server offline';
      statusEl.dataset.state = 'offline';
      playersEl.textContent = '--';
      shipsEl.textContent = '--';
      uptimeEl.textContent = '--';
      console.warn('Failed to refresh lobby status:', error);
    }
  }

  /**
   * Format milliseconds for compact lobby display
   */
  formatDuration(durationMs = 0) {
    const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
  }

  /**
   * Create HUD (heads-up display)
   */
  createHUD(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Could not find HUD container: ${containerId}`);
      return;
    }

    container.style.display = 'none';
    container.innerHTML = `
      <div id="hud" class="hud">
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

        <div class="hud-section top-right">
          <div class="xp-container">
            <div class="xp-bar">
              <div id="xp-progress" class="xp-progress" style="width: 0%"></div>
            </div>
            <span class="xp-text" id="xp-text">0 / 100 XP</span>
          </div>
        </div>

        <div class="crosshair"></div>

        <div class="hud-section bottom-left">
          <div id="ammo-display" class="ammo-display">
            <span class="ammo-label">Ammo:</span>
            <span id="ammo-type" class="ammo-type">Normal</span>
            <span class="ammo-hint">[Q/E] to switch</span>
          </div>
        </div>

        <div class="hud-section bottom-right">
          <div class="controls-hint">
            <p>WASD: Move | Mouse: Aim | Click: Fire</p>
            <p>ESC: Menu | TAB: Leaderboard</p>
          </div>
        </div>

        <div class="hud-section center-bottom">
          <div class="throttle-container">
            <span>Throttle:</span>
            <div class="throttle-bar">
              <div id="throttle-indicator" class="throttle-fill" style="width: 0%"></div>
            </div>
            <span id="throttle-value">0%</span>
          </div>
        </div>

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
      console.error(`Could not find menu container: ${containerId}`);
      return;
    }

    container.style.display = 'none';
    container.innerHTML = `
      <div id="main-menu" class="menu-overlay">
        <div class="menu-panel">
          <h2>Menu</h2>
          <button class="menu-button" id="resume-button">Resume Game</button>
          <button class="menu-button" id="upgrades-button">Upgrade Ship</button>
          <button class="menu-button" id="leaderboard-button">Leaderboard</button>
          <button class="menu-button" id="settings-button">Settings</button>
          <button class="menu-button logout" id="logout-button">Logout</button>
        </div>
      </div>
    `;

    this.screens.menu = container;

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
      console.error(`Could not find upgrades container: ${containerId}`);
      return;
    }

    container.style.display = 'none';

    const upgrades = [
      { type: 'hull', name: 'Hull Armor', description: '+20 HP per level', icon: 'Hull' },
      { type: 'cannons', name: 'Cannon Power', description: '+1.5 Damage per level', icon: 'Gun' },
      { type: 'speed', name: 'Ship Speed', description: '+0.5 Speed per level', icon: 'Wind' },
      { type: 'acceleration', name: 'Acceleration', description: '+0.2 Accel per level', icon: 'Boost' },
      { type: 'crew', name: 'Crew Quarters', description: '+1 Crew Capacity per level', icon: 'Crew' }
    ];

    let upgradesHTML = `
      <div id="upgrades-menu" class="menu-overlay">
        <div class="upgrades-panel">
          <h2>Ship Upgrades</h2>
          <div class="gold-display">Gold: <span id="upgrade-gold">${this.gameState.gold}</span></div>
          <div class="upgrades-grid">
    `;

    upgrades.forEach((upgrade) => {
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
    this.screens.upgrades = container;

    document.querySelectorAll('.upgrade-button').forEach((button) => {
      button.addEventListener('click', (event) => {
        const upgradeType = event.currentTarget.dataset.upgrade;
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
      console.error(`Could not find leaderboard container: ${containerId}`);
      return;
    }

    container.style.display = 'none';
    container.innerHTML = `
      <div id="leaderboard-menu" class="menu-overlay">
        <div class="leaderboard-panel">
          <h2>Leaderboard</h2>
          <div id="leaderboard-list" class="leaderboard-list">
            <div class="loading">Loading leaderboard...</div>
          </div>
          <button class="menu-back-button" id="leaderboard-back">Back</button>
        </div>
      </div>
    `;

    this.screens.leaderboard = container;

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

    const xpPercent = this.gameState.getXPPercentage() * 100;
    const xpProgressEl = document.getElementById('xp-progress');
    if (xpProgressEl) xpProgressEl.style.width = `${xpPercent}%`;

    const xpTextEl = document.getElementById('xp-text');
    if (xpTextEl) xpTextEl.textContent = `${this.gameState.xp} / ${this.gameState.maxXP} XP`;

    const hpPercent = this.gameState.getHPPercentage() * 100;
    const hpBar = document.querySelector('.hp-bar .hp-fill');
    if (hpBar) hpBar.style.width = `${hpPercent}%`;

    const ammoEl = document.getElementById('ammo-type');
    if (ammoEl) ammoEl.textContent = ammoType;

    const throttleIndicator = document.getElementById('throttle-indicator');
    if (throttleIndicator) throttleIndicator.style.width = `${throttlePercent}%`;

    const throttleValue = document.getElementById('throttle-value');
    if (throttleValue) throttleValue.textContent = `${throttlePercent.toFixed(0)}%`;
  }

  /**
   * Update minimap
   */
  updateRadar() {
    const canvas = document.getElementById('minimap-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const scale = 0.05;

    ctx.fillStyle = '#1a3a3a';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);

    const shipPosition = this.gameState.ship?.position || { x: 0, z: 0 };
    const playerX = (shipPosition.x + 2000) * scale;
    const playerY = (shipPosition.z + 2000) * scale;
    ctx.fillStyle = '#ff9900';
    ctx.fillRect(playerX - 3, playerY - 3, 6, 6);

    ctx.fillStyle = '#ff0000';
    this.gameState.otherShips.forEach((ship) => {
      const x = ((ship.position?.x ?? 0) + 2000) * scale;
      const y = ((ship.position?.z ?? 0) + 2000) * scale;
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
   * Show or hide menu
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
    if (this.screens.upgrades) this.screens.upgrades.style.display = 'none';
    if (this.screens.leaderboard) this.screens.leaderboard.style.display = 'none';
    this.isMenuOpen = true;
  }

  /**
   * Show upgrades menu
   */
  showUpgradesMenu() {
    if (this.screens.menu) this.screens.menu.style.display = 'none';
    if (this.screens.upgrades) this.screens.upgrades.style.display = 'block';
    if (this.screens.leaderboard) this.screens.leaderboard.style.display = 'none';
    this.isMenuOpen = true;
  }

  /**
   * Show leaderboard
   */
  showLeaderboard() {
    this.network.getLeaderboard();
    if (this.screens.menu) this.screens.menu.style.display = 'none';
    if (this.screens.upgrades) this.screens.upgrades.style.display = 'none';
    if (this.screens.leaderboard) this.screens.leaderboard.style.display = 'block';
    this.isMenuOpen = true;
  }

  /**
   * Close all menus without hiding the HUD
   */
  closeMenu() {
    if (this.screens.menu) this.screens.menu.style.display = 'none';
    if (this.screens.upgrades) this.screens.upgrades.style.display = 'none';
    if (this.screens.leaderboard) this.screens.leaderboard.style.display = 'none';
    this.isMenuOpen = false;
  }

  /**
   * Purchase upgrade
   */
  async purchaseUpgrade(upgradeType) {
    try {
      const result = await this.network.purchaseUpgrade(upgradeType);
      console.log(`Upgraded ${upgradeType} to level ${result.newLevel}`);
    } catch (error) {
      console.error(`Failed to purchase upgrade: ${error.message}`);
      alert(`Failed to purchase upgrade: ${error.message}`);
    }
  }

  listeners = new Map();

  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }

    this.listeners.get(eventName).push(callback);
  }

  emit(eventName, data) {
    if (this.listeners.has(eventName)) {
      this.listeners.get(eventName).forEach((handler) => handler(data));
    }
  }
}

export default UIController;
