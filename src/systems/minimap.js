// src/systems/minimap.js
// 2D minimap overlay showing ships, players, and navigation data

export class Minimap {
  constructor(width = 300, height = 300, scale = 0.1) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');

    this.width = width;
    this.height = height;
    this.scale = scale; // Units per pixel
    this.centerX = width / 2;
    this.centerY = height / 2;

    // Player position relative to world
    this.playerPosition = { x: 0, y: 0 };
    this.playerRotation = 0;

    // Tracked entities
    this.ships = new Map(); // shipId -> { position, rotation, color, owner }
    this.players = new Map(); // playerId -> { position, color, username }
    this.markers = []; // Custom markers (waypoints, etc)

    // Style settings
    this.backgroundColor = '#001a33';
    this.gridColor = '#003366';
    this.playerColor = '#00ff00';
    this.allyColor = '#00dd00';
    this.enemyColor = '#ff4444';
    this.neutralColor = '#ffaa00';

    this.setupTexture();
  }

  setupTexture() {
    // Style the canvas
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  setPlayerPosition(x, z, rotation = 0) {
    this.playerPosition = { x, y: z }; // Map z to y for 2D
    this.playerRotation = rotation;
  }

  addShip(shipId, position, rotation, color = this.allyColor, owner = 'unknown') {
    this.ships.set(shipId, {
      position: { x: position.x, y: position.z },
      rotation,
      color,
      owner
    });
  }

  removeShip(shipId) {
    this.ships.delete(shipId);
  }

  addPlayer(playerId, position, color = this.allyColor, username = '') {
    this.players.set(playerId, {
      position: { x: position.x, y: position.z },
      color,
      username
    });
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
  }

  addMarker(position, label = 'Marker', color = '#ffffff') {
    this.markers.push({
      position: { x: position.x, y: position.z },
      label,
      color
    });
  }

  clearMarkers() {
    this.markers = [];
  }

  worldToScreen(worldPos) {
    const dx = (worldPos.x - this.playerPosition.x) * this.scale;
    const dy = (worldPos.y - this.playerPosition.y) * this.scale;

    // Rotate relative to player heading
    const cos = Math.cos(-this.playerRotation);
    const sin = Math.sin(-this.playerRotation);
    const rotX = dx * cos - dy * sin;
    const rotY = dx * sin + dy * cos;

    return {
      x: this.centerX + rotX,
      y: this.centerY + rotY
    };
  }

  isOnScreen(screenPos) {
    return (
      screenPos.x >= 0 &&
      screenPos.x <= this.width &&
      screenPos.y >= 0 &&
      screenPos.y <= this.height
    );
  }

  drawBackground() {
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw grid
    this.ctx.strokeStyle = this.gridColor;
    this.ctx.lineWidth = 1;
    const gridSize = 50; // pixels

    for (let x = 0; x < this.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }

    for (let y = 0; y < this.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
  }

  drawCompass() {
    const centerX = this.width - 30;
    const centerY = 30;
    const radius = 20;

    // Compass circle
    this.ctx.fillStyle = 'rgba(0, 100, 150, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Cardinal directions
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 10px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const directions = ['N', 'E', 'S', 'W'];
    const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];

    directions.forEach((dir, i) => {
      const x = centerX + Math.sin(angles[i]) * (radius - 5);
      const y = centerY - Math.cos(angles[i]) * (radius - 5);
      this.ctx.fillText(dir, x, y);
    });

    // Heading indicator
    this.ctx.strokeStyle = '#ffff00';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, centerY);
    const headingX = centerX + Math.sin(this.playerRotation) * radius;
    const headingY = centerY - Math.cos(this.playerRotation) * radius;
    this.ctx.lineTo(headingX, headingY);
    this.ctx.stroke();
  }

  drawPlayer() {
    const screenPos = this.worldToScreen(this.playerPosition);
    const size = 8;

    // Draw triangle pointing in player direction
    this.ctx.fillStyle = this.playerColor;
    this.ctx.save();
    this.ctx.translate(screenPos.x, screenPos.y);
    this.ctx.rotate(this.playerRotation);

    this.ctx.beginPath();
    this.ctx.moveTo(0, -size);
    this.ctx.lineTo(size, size);
    this.ctx.lineTo(-size, size);
    this.ctx.closePath();
    this.ctx.fill();

    // Border
    this.ctx.strokeStyle = '#00ff00';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawShips() {
    for (const [, ship] of this.ships) {
      const screenPos = this.worldToScreen(ship.position);

      if (!this.isOnScreen(screenPos)) continue;

      const size = 15;

      // Draw rectangle rotated to ship heading
      this.ctx.fillStyle = ship.color;
      this.ctx.save();
      this.ctx.translate(screenPos.x, screenPos.y);
      this.ctx.rotate(ship.rotation);

      this.ctx.fillRect(-size / 2, -size, size, size * 1.5);

      // Border
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(-size / 2, -size, size, size * 1.5);

      this.ctx.restore();

      // Draw owner label below ship
      this.ctx.fillStyle = '#cccccc';
      this.ctx.font = '9px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(ship.owner, screenPos.x, screenPos.y + 15);
    }
  }

  drawPlayers() {
    for (const [, player] of this.players) {
      const screenPos = this.worldToScreen(player.position);

      if (!this.isOnScreen(screenPos)) continue;

      const size = 5;

      // Draw circle for player
      this.ctx.fillStyle = player.color;
      this.ctx.beginPath();
      this.ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2);
      this.ctx.fill();

      // Border
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      // Draw username
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '8px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(player.username, screenPos.x, screenPos.y - 10);
    }
  }

  drawMarkers() {
    for (const marker of this.markers) {
      const screenPos = this.worldToScreen(marker.position);

      if (!this.isOnScreen(screenPos)) continue;

      // Draw X for marker
      this.ctx.strokeStyle = marker.color;
      this.ctx.lineWidth = 2;
      const size = 8;

      this.ctx.beginPath();
      this.ctx.moveTo(screenPos.x - size, screenPos.y - size);
      this.ctx.lineTo(screenPos.x + size, screenPos.y + size);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(screenPos.x + size, screenPos.y - size);
      this.ctx.lineTo(screenPos.x - size, screenPos.y + size);
      this.ctx.stroke();

      // Draw label
      this.ctx.fillStyle = marker.color;
      this.ctx.font = '9px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(marker.label, screenPos.x, screenPos.y - 15);
    }
  }

  draw() {
    this.drawBackground();
    this.drawMarkers();
    this.drawShips();
    this.drawPlayers();
    this.drawPlayer();
    this.drawCompass();
  }

  render() {
    this.draw();
    return this.canvas;
  }

  getCanvasDataURL() {
    return this.canvas.toDataURL('image/png');
  }

  attachToDOM(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
      this.canvas.style.border = '2px solid #00ff88';
      this.canvas.style.backgroundColor = this.backgroundColor;
      container.appendChild(this.canvas);
    }
  }

  dispose() {
    this.ships.clear();
    this.players.clear();
    this.markers = [];
    // Canvas will be garbage collected with the object
  }
}

export default Minimap;
