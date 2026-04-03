// src/systems/navigation.js
// Navigation HUD displaying compass, bearing, speed, and wind data

export class NavigationHUD {
  constructor() {
    this.container = this.createHUD();
    this.compass = null;
    this.bearingDisplay = null;
    this.speedDisplay = null;
    this.windDisplay = null;
    this.targetDisplay = null;
  }

  createHUD() {
    const container = document.createElement('div');
    container.id = 'navigation-hud';
    container.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 20px;
      font-family: 'Courier New', monospace;
      color: #00ff88;
      text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
      font-size: 14px;
      z-index: 100;
      background: rgba(0, 20, 40, 0.7);
      border: 2px solid #00ff88;
      padding: 15px;
      border-radius: 5px;
      min-width: 250px;
    `;

    // Compass
    this.compass = document.createElement('div');
    this.compass.className = 'compass-display';
    this.compass.style.cssText = `
      text-align: center;
      margin-bottom: 10px;
      font-weight: bold;
      letter-spacing: 3px;
    `;
    this.compass.textContent = '⬆ N';

    // Heading/Bearing
    this.bearingDisplay = document.createElement('div');
    this.bearingDisplay.className = 'bearing-display';
    this.bearingDisplay.textContent = 'Heading: 000° | Target: ---°';

    // Speed
    this.speedDisplay = document.createElement('div');
    this.speedDisplay.className = 'speed-display';
    this.speedDisplay.textContent = 'Speed: 0.0 knots | Max: 0.0 knots';

    // Wind
    this.windDisplay = document.createElement('div');
    this.windDisplay.className = 'wind-display';
    this.windDisplay.textContent = 'Wind: N 10.0 knots';

    // Target info
    this.targetDisplay = document.createElement('div');
    this.targetDisplay.className = 'target-display';
    this.targetDisplay.textContent = 'Target: None';
    this.targetDisplay.style.marginTop = '10px';
    this.targetDisplay.style.color = '#ffaa00';

    container.appendChild(this.compass);
    container.appendChild(this.bearingDisplay);
    container.appendChild(this.speedDisplay);
    container.appendChild(this.windDisplay);
    container.appendChild(this.targetDisplay);

    return container;
  }

  attachToDOM() {
    if (!document.body.contains(this.container)) {
      document.body.appendChild(this.container);
    }
  }

  updateCompass(headingRadians) {
    const headingDegrees = (headingRadians * 180) / Math.PI;
    const normalizedHeading = ((headingDegrees % 360) + 360) % 360;

    const directions = [
      'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
    ];

    const index = Math.round(normalizedHeading / 22.5) % 16;
    const direction = directions[index];

    this.compass.textContent = `⬆ ${direction}`;
  }

  updateBearing(shipHeading, targetHeading = null) {
    const shipDeg = Math.round(((shipHeading * 180) / Math.PI + 360) % 360);

    let bearingText = `Heading: ${shipDeg.toString().padStart(3, '0')}°`;

    if (targetHeading !== null) {
      const targetDeg = Math.round(((targetHeading * 180) / Math.PI + 360) % 360);
      bearingText += ` | Target: ${targetDeg.toString().padStart(3, '0')}°`;
    } else {
      bearingText += ` | Target: ---°`;
    }

    this.bearingDisplay.textContent = bearingText;
  }

  updateSpeed(currentSpeed, maxSpeed) {
    const current = currentSpeed.toFixed(1);
    const max = maxSpeed.toFixed(1);
    this.speedDisplay.textContent = `Speed: ${current} knots | Max: ${max} knots`;
  }

  updateWind(windDirection, windSpeed) {
    const directions = [
      'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
    ];

    const windDeg = Math.round(windDirection);
    const normalizedDeg = ((windDeg % 360) + 360) % 360;
    const dirIndex = Math.round(normalizedDeg / 22.5) % 16;
    const dirName = directions[dirIndex];

    this.windDisplay.textContent = `Wind: ${dirName} ${windSpeed.toFixed(1)} knots`;
  }

  updateTarget(targetName, distance = null) {
    if (!targetName || targetName === 'None') {
      this.targetDisplay.textContent = 'Target: None';
      this.targetDisplay.style.color = '#ffaa00';
      return;
    }

    let targetText = `Target: ${targetName}`;
    if (distance !== null) {
      targetText += ` (${distance.toFixed(1)}m away)`;
    }

    this.targetDisplay.textContent = targetText;
    this.targetDisplay.style.color = '#ff4444';
  }

  hide() {
    this.container.style.display = 'none';
  }

  show() {
    this.container.style.display = 'block';
  }

  remove() {
    if (document.body.contains(this.container)) {
      document.body.removeChild(this.container);
    }
  }
}

export default NavigationHUD;
