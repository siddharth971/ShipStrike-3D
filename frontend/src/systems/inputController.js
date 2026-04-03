// frontend/src/systems/inputController.js
// Input management - handles keyboard and mouse inputs

class InputController {
  constructor(gameState, networkClient) {
    this.gameState = gameState;
    this.network = networkClient;
    
    this.keys = {};
    this.mousePosition = { x: 0, y: 0 };
    this.mouseButtons = {};
    this.isMouseLocked = false;
    this.throttleSpeed = 0; // 0-100
    this.steering = 0; // -1 to 1
    this.updateInterval = 1000 / 60; // 60 FPS

    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Keyboard
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));

    // Mouse
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // Touch for mobile
    document.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    document.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    document.addEventListener('touchend', (e) => this.handleTouchEnd(e));

    // Start sending input updates
    setInterval(() => this.sendInputUpdate(), this.updateInterval);
  }

  /**
   * Handle key down
   */
  handleKeyDown(e) {
    this.keys[e.key.toLowerCase()] = true;

    // Menu toggle (ESC)
    if (e.key === 'Escape') {
      this.emit('menuToggle');
    }

    // Leaderboard (TAB)
    if (e.key === 'Tab') {
      e.preventDefault();
      this.emit('leaderboardToggle');
    }

    // Ammo switch (Q/E)
    if (e.key.toLowerCase() === 'q') {
      this.gameState.switchAmmunition('prev');
    }
    if (e.key.toLowerCase() === 'e') {
      this.gameState.switchAmmunition('next');
    }

    // Deploy sails (Space)
    if (e.key === ' ') {
      e.preventDefault();
      // This would toggle sails - to be implemented in ship renderer
    }

    // Chat (Enter)
    if (e.key === 'Enter') {
      // Focus chat input - to be implemented
    }
  }

  /**
   * Handle key up
   */
  handleKeyUp(e) {
    this.keys[e.key.toLowerCase()] = false;
  }

  /**
   * Handle mouse move
   */
  handleMouseMove(e) {
    this.mousePosition.x = e.clientX;
    this.mousePosition.y = e.clientY;
    
    // Calculate aim direction from center
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    const angleX = (e.clientX - centerX) / centerX;
    const angleY = (e.clientY - centerY) / centerY;

    this.emit('aimUpdate', {
      x: angleX,
      y: angleY,
      screenX: e.clientX,
      screenY: e.clientY
    });
  }

  /**
   * Handle mouse down
   */
  handleMouseDown(e) {
    this.mouseButtons[e.button] = true;

    // Left click to fire
    if (e.button === 0) {
      const targetPosition = this.calculateTargetPosition();
      this.gameState.fireCannonAt(targetPosition);
      this.emit('fire');
    }
  }

  /**
   * Handle mouse up
   */
  handleMouseUp(e) {
    this.mouseButtons[e.button] = false;
  }

  /**
   * Handle touch start
   */
  handleTouchStart(e) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.mousePosition.x = touch.clientX;
      this.mousePosition.y = touch.clientY;
    }
  }

  /**
   * Handle touch move
   */
  handleTouchMove(e) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.handleMouseMove({
        clientX: touch.clientX,
        clientY: touch.clientY
      });
    }
  }

  /**
   * Handle touch end
   */
  handleTouchEnd(e) {
    const targetPosition = this.calculateTargetPosition();
    this.gameState.fireCannonAt(targetPosition);
  }

  /**
   * Update throttle based on WASD input
   */
  updateThrottle() {
    const w = this.keys['w'];
    const s = this.keys['s'];
    const a = this.keys['a'];
    const d = this.keys['d'];

    // Forward/backward
    if (w && !s) {
      this.throttleSpeed = Math.min(100, this.throttleSpeed + 5);
    } else if (s && !w) {
      this.throttleSpeed = Math.max(0, this.throttleSpeed - 5);
    } else {
      // Gradual slow down
      this.throttleSpeed *= 0.95;
      if (Math.abs(this.throttleSpeed) < 1) this.throttleSpeed = 0;
    }

    // Left/right steering
    if (a && !d) {
      this.steering = Math.max(-1, this.steering - 0.1);
    } else if (d && !a) {
      this.steering = Math.min(1, this.steering + 0.1);
    } else {
      // Center steering
      this.steering *= 0.9;
      if (Math.abs(this.steering) < 0.05) this.steering = 0;
    }
  }

  /**
   * Calculate target position for cannon fire
   */
  calculateTargetPosition() {
    const ship = this.gameState.ship;
    const distance = 1000; // Fire distance

    // Calculate angle based on mouse position
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const angle = Math.atan2(
      this.mousePosition.y - centerY,
      this.mousePosition.x - centerX
    );

    return {
      x: ship.position.x + Math.cos(angle) * distance,
      z: ship.position.z + Math.sin(angle) * distance,
      y: ship.position.y
    };
  }

  /**
   * Send input update to server
   */
  sendInputUpdate() {
    this.updateThrottle();

    const input = {
      throttle: this.throttleSpeed,
      steering: this.steering,
      mousePosition: this.mousePosition
    };

    this.gameState.updateInput(input);
  }

  /**
   * Get current input state
   */
  getInputState() {
    return {
      throttle: this.throttleSpeed,
      steering: this.steering,
      mousePosition: this.mousePosition,
      mouseButtons: this.mouseButtons,
      keys: this.keys
    };
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

export default InputController;
