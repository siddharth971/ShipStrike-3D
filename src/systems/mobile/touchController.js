/**
 * Mobile Touch Controller System
 * Handles virtual joysticks, touch buttons, and gesture recognition
 * Provides unified interface between mouse/keyboard and touch inputs
 * 
 * Features:
 * - Virtual movement joystick (left side)
 * - Virtual action buttons (right side)
 * - Touch gesture support
 * - Responsive layout for mobile/tablet
 * - Haptic feedback support
 */

export class TouchController {
  constructor() {
    this.isVisible = false;
    this.isMobile = this.detectMobileDevice();
    this.touchSupported = this.detectTouchSupport();

    // Joystick state
    this.leftJoystick = {
      element: null,
      container: null,
      active: false,
      x: 0,
      y: 0,
      angle: 0,
      magnitude: 0,
      radius: 60,
      deadzone: 10
    };

    // Action buttons state
    this.actionButtons = new Map();
    this.buttonLayout = {
      primary: { x: 0, y: 0, key: ' ' }, // Fire (spacebar)
      secondary: { x: 0, y: 0, key: 'f' }, // Interact (F)
      tertiary: { x: 0, y: 0, key: 'e' }, // Special (E)
      map: { x: 0, y: 0, key: 'm' } // Map (M)
    };

    // Gestures
    this.touches = new Map();
    this.gestures = {
      pinch: { scale: 1, active: false },
      longPress: { duration: 500, active: false },
      swipe: { minDistance: 50, active: false }
    };

    // Callbacks
    this.onMovement = null; // (angle, magnitude) => {}
    this.onActionButton = null; // (buttonName, pressed) => {}
    this.onGesture = null; // (gestureName, data) => {}
  }

  /**
   * Detect if device is mobile
   */
  detectMobileDevice() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    return mobileRegex.test(userAgent.toLowerCase());
  }

  /**
   * Detect if touch is supported
   */
  detectTouchSupport() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    );
  }

  /**
   * Initialize mobile UI
   * Only call if mobile device detected and user opts in
   */
  initialize() {
    if (!this.touchSupported) return false;

    this.createUI();
    this.attachEventListeners();
    this.show();
    this.isVisible = true;

    console.log('✅ Mobile touch controller initialized');
    return true;
  }

  /**
   * Create HTML UI for touch controls
   */
  createUI() {
    // Container
    const container = document.createElement('div');
    container.id = 'touch-controller';
    container.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 200px;
      z-index: 1000;
      pointer-events: auto;
      font-family: Arial, sans-serif;
    `;

    // Left joystick container
    const leftContainer = document.createElement('div');
    leftContainer.id = 'left-joystick-container';
    leftContainer.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 20px;
      width: 140px;
      height: 140px;
      background: rgba(100, 100, 150, 0.3);
      border: 3px solid rgba(100, 100, 200, 0.6);
      border-radius: 50%;
      touch-action: none;
      pointer-events: auto;
    `;

    const joystick = document.createElement('div');
    joystick.id = 'left-joystick';
    joystick.style.cssText = `
      position: absolute;
      width: 80px;
      height: 80px;
      background: rgba(100, 200, 255, 0.6);
      border: 2px solid rgba(100, 200, 255, 1);
      border-radius: 50%;
      top: 30px;
      left: 30px;
      box-shadow: 0 0 20px rgba(100, 200, 255, 0.8);
      transition: all 0.05s ease-out;
    `;

    leftContainer.appendChild(joystick);

    // Right action buttons
    const rightContainer = document.createElement('div');
    rightContainer.id = 'action-buttons-container';
    rightContainer.style.cssText = `
      position: absolute;
      bottom: 20px;
      right: 20px;
      width: 280px;
      height: 140px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 10px;
      pointer-events: auto;
    `;

    // Create action buttons
    const buttons = [
      { id: 'btn-primary', label: 'FIRE', color: 'rgb(255, 100, 100)' },
      { id: 'btn-secondary', label: 'INTERACT', color: 'rgb(100, 255, 100)' },
      { id: 'btn-tertiary', label: 'SPECIAL', color: 'rgb(255, 200, 100)' },
      { id: 'btn-map', label: 'MAP', color: 'rgb(100, 200, 255)' }
    ];

    buttons.forEach((btn, index) => {
      const button = document.createElement('button');
      button.id = btn.id;
      button.textContent = btn.label;
      button.style.cssText = `
        background: ${btn.color};
        border: 2px solid rgba(255, 255, 255, 0.8);
        border-radius: 8px;
        color: white;
        font-weight: bold;
        font-size: 12px;
        cursor: pointer;
        touch-action: none;
        user-select: none;
        transition: all 0.1s ease;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      `;

      button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.05)';
        button.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.4)';
      });

      button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
        button.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
      });

      rightContainer.appendChild(button);
      this.actionButtons.set(btn.id.replace('btn-', ''), button);
    });

    container.appendChild(leftContainer);
    container.appendChild(rightContainer);

    document.body.appendChild(container);

    this.leftJoystick.container = leftContainer;
    this.leftJoystick.element = joystick;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Joystick touch/mouse events
    this.leftJoystick.container.addEventListener('pointerdown', (e) => this.onJoystickStart(e));
    this.leftJoystick.container.addEventListener('pointermove', (e) => this.onJoystickMove(e));
    this.leftJoystick.container.addEventListener('pointerup', (e) => this.onJoystickEnd(e));
    this.leftJoystick.container.addEventListener('pointercancel', (e) => this.onJoystickEnd(e));
    this.leftJoystick.container.addEventListener('pointerleave', (e) => this.onJoystickEnd(e));

    // Action buttons
    this.actionButtons.forEach((button, name) => {
      button.addEventListener('pointerdown', () => this.onActionButtonDown(name));
      button.addEventListener('pointerup', () => this.onActionButtonUp(name));
      button.addEventListener('pointercancel', () => this.onActionButtonUp(name));
      button.addEventListener('pointerleave', () => this.onActionButtonUp(name));
    });

    // Prevent default touch behaviors
    document.addEventListener('touchmove', (e) => {
      if (e.target.closest('#touch-controller')) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  /**
   * Joystick start (touch/mouse down)
   */
  onJoystickStart(e) {
    if (e.pointerType !== 'touch' && e.pointerType !== 'mouse') return;

    e.preventDefault();
    this.leftJoystick.active = true;
    this.updateJoystickPosition(e);
  }

  /**
   * Joystick move
   */
  onJoystickMove(e) {
    if (!this.leftJoystick.active) return;

    e.preventDefault();
    this.updateJoystickPosition(e);
  }

  /**
   * Update joystick position
   */
  updateJoystickPosition(e) {
    const container = this.leftJoystick.container;
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    let dx = clientX - centerX;
    let dy = clientY - centerY;

    // Calculate magnitude and angle
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = this.leftJoystick.radius;

    // Constrain to circle
    let constrainedMagnitude = Math.min(magnitude, maxRadius);

    // Apply deadzone
    if (constrainedMagnitude < this.leftJoystick.deadzone) {
      constrainedMagnitude = 0;
      dx = 0;
      dy = 0;
    } else {
      // Normalize direction while respecting deadzone
      const angle = Math.atan2(dy, dx);
      dx = Math.cos(angle) * constrainedMagnitude;
      dy = Math.sin(angle) * constrainedMagnitude;
    }

    this.leftJoystick.x = dx;
    this.leftJoystick.y = dy;
    this.leftJoystick.angle = Math.atan2(dy, dx);
    this.leftJoystick.magnitude = constrainedMagnitude / maxRadius;

    // Update visual
    const joystick = this.leftJoystick.element;
    joystick.style.transform = `translate(${dx}px, ${dy}px)`;

    // Emit movement callback
    if (this.onMovement) {
      this.onMovement(this.leftJoystick.angle, this.leftJoystick.magnitude);
    }
  }

  /**
   * Joystick end (touch/mouse up)
   */
  onJoystickEnd(e) {
    if (!this.leftJoystick.active) return;

    e.preventDefault();
    this.leftJoystick.active = false;
    this.leftJoystick.x = 0;
    this.leftJoystick.y = 0;
    this.leftJoystick.magnitude = 0;

    // Reset visual
    this.leftJoystick.element.style.transform = 'translate(0px, 0px)';

    // Emit reset
    if (this.onMovement) {
      this.onMovement(0, 0);
    }
  }

  /**
   * Action button down
   */
  onActionButtonDown(name) {
    const button = this.actionButtons.get(name);
    if (!button) return;

    button.style.transform = 'scale(0.95)';
    button.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.5) inset';

    // Trigger haptic feedback
    this.vibrate(20);

    // Emit callback
    if (this.onActionButton) {
      this.onActionButton(name, true);
    }
  }

  /**
   * Action button up
   */
  onActionButtonUp(name) {
    const button = this.actionButtons.get(name);
    if (!button) return;

    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';

    // Emit callback
    if (this.onActionButton) {
      this.onActionButton(name, false);
    }
  }

  /**
   * Haptic feedback (vibration)
   */
  vibrate(duration = 20) {
    if (navigator.vibrate && this.touchSupported) {
      navigator.vibrate(duration);
    }
  }

  /**
   * Show/hide touch controller
   */
  show() {
    const controller = document.getElementById('touch-controller');
    if (controller) {
      controller.style.display = 'flex';
      this.isVisible = true;
    }
  }

  hide() {
    const controller = document.getElementById('touch-controller');
    if (controller) {
      controller.style.display = 'none';
      this.isVisible = false;
    }
  }

  /**
   * Get joystick state
   */
  getJoystickState() {
    return {
      angle: this.leftJoystick.angle,
      magnitude: this.leftJoystick.magnitude,
      x: this.leftJoystick.x,
      y: this.leftJoystick.y,
      active: this.leftJoystick.active
    };
  }

  /**
   * Toggle touch controller visibility
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    const controller = document.getElementById('touch-controller');
    if (controller) {
      controller.remove();
    }
    this.isVisible = false;
  }

  /**
   * Check if running on mobile
   */
  isMobileDevice() {
    return this.isMobile && this.touchSupported;
  }
}

// Export singleton
export const touchController = new TouchController();
