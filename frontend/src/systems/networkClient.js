// frontend/src/systems/networkClient.js
// Client-side network manager - handles Socket.io communication with game server

import io from 'socket.io-client';

class NetworkClient {
  constructor(serverUrl = 'http://localhost:3000') {
    this.serverUrl = serverUrl || import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
    this.socket = null;
    this.playerId = null;
    this.playerName = null;
    this.isConnected = false;
    
    // Event listeners
    this.eventHandlers = new Map();
  }

  /**
   * Initialize connection to server
   */
  connect() {
    return new Promise((resolve, reject) => {
      console.log(`🔌 Attempting to connect to ${this.serverUrl}...`);
      
      const timeout = setTimeout(() => {
        if (!this.isConnected) {
          this.socket.disconnect();
          reject(new Error(`Connection timeout: Could not connect to server at ${this.serverUrl}`));
        }
      }, 10000); // 10 second timeout

      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
      });

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        console.log('✅ Connected to game server');
        this.isConnected = true;
        resolve();
      });

      this.socket.on('disconnect', () => {
        console.log('❌ Disconnected from game server');
        this.isConnected = false;
        this.emit('disconnected');
      });

      this.socket.on('error', (error) => {
        clearTimeout(timeout);
        console.error('Socket error:', error);
        reject(error);
      });

      this.socket.on('connect_error', (error) => {
        console.warn('Connection error:', error);
      });
    });
  }

  /**
   * Fetch server status for lobby display
   */
  async getServerStatus() {
    const response = await fetch(new URL('/api/status', this.serverUrl).toString());

    if (!response.ok) {
      throw new Error(`Server status request failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Authenticate with server
   */
  authenticate(playerId, playerName) {
    return new Promise((resolve, reject) => {
      console.log(`🔐 Authenticating player: ${playerId} (${playerName})`);
      
      if (!this.socket || !this.isConnected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.playerId = playerId;
      this.playerName = playerName;

      const timeout = setTimeout(() => {
        console.error('❌ Authentication timeout');
        reject(new Error('Authentication timeout - server did not respond'));
      }, 5000);

      this.socket.emit('authenticate', { playerId, playerName });
      
      this.socket.once('authenticated', (data) => {
        clearTimeout(timeout);
        console.log('📡 Received authentication response:', data);
        
        if (data && data.success) {
          console.log(`✅ Authenticated as ${playerName}`);
          resolve(data);
        } else if (data && data.error) {
          reject(new Error(data.error));
        } else {
          reject(new Error('Invalid authentication response'));
        }
      });

      this.socket.once('error', (error) => {
        clearTimeout(timeout);
        console.error('❌ Socket error during authentication:', error);
        reject(error);
      });
    });
  }

  /**
   * Spawn a ship
   */
  spawnShip(shipTypeId = 'sloop') {
    return new Promise((resolve, reject) => {
      console.log(`⛵ Requesting ship spawn: ${shipTypeId}`);
      
      if (!this.socket || !this.isConnected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        console.error('❌ Ship spawn timeout');
        reject(new Error('Ship spawn timeout - server did not respond'));
      }, 5000);

      this.socket.emit('spawnShip', { shipTypeId });
      
      this.socket.once('shipSpawned', (data) => {
        clearTimeout(timeout);
        console.log('📡 Received ship spawn response:', data);
        
        if (data && data.success && data.ship) {
          console.log(`✅ Ship spawned: ${data.ship.type}`);
          resolve(data.ship);
        } else if (data && data.error) {
          reject(new Error(data.error));
        } else {
          reject(new Error('Invalid ship spawn response'));
        }
      });

      this.socket.once('error', (error) => {
        clearTimeout(timeout);
        console.error('❌ Socket error during ship spawn:', error);
        reject(error);
      });
    });
  }

  /**
   * Send player input
   */
  updateInput(input) {
    if (this.isConnected) {
      this.socket.emit('updateInput', input);
    }
  }

  /**
   * Request game state update
   */
  requestGameState() {
    this.socket.emit('getGameState');
  }

  /**
   * Request visible ships
   */
  requestShips() {
    this.socket.emit('requestShips');
  }

  /**
   * Fire cannon at position
   */
  fireCannonAt(targetPosition) {
    this.socket.emit('fireCanon', { targetPosition });
  }

  /**
   * Switch ammo type
   */
  switchAmmo(direction) {
    this.socket.emit('switchAmmo', { direction });
  }

  /**
   * Purchase an upgrade
   */
  purchaseUpgrade(upgradeType) {
    return new Promise((resolve, reject) => {
      this.socket.emit('purchaseUpgrade', { upgradeType });
      this.socket.once('upgradePurchased', (data) => {
        if (data) resolve(data);
      });
      this.socket.once('upgradeFailed', (data) => {
        reject(new Error(data.error));
      });
    });
  }

  /**
   * Request leaderboard
   */
  getLeaderboard() {
    return new Promise((resolve) => {
      this.socket.emit('requestLeaderboard');
      this.socket.once('leaderboard', (data) => {
        resolve(data.leaders);
      });
    });
  }

  /**
   * Send chat message
   */
  sendChatMessage(message) {
    this.socket.emit('chat', { message });
  }

  /**
   * Send emote
   */
  sendEmote(emoteType) {
    this.socket.emit('emote', { emoteType });
  }

  /**
   * Listen for an event
   */
  on(eventName, callback) {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }
    this.eventHandlers.get(eventName).push(callback);

    // Forward to socket
    if (this.socket) {
      this.socket.on(eventName, callback);
    }
  }

  /**
   * Emit custom event
   */
  emit(eventName, data) {
    if (this.eventHandlers.has(eventName)) {
      this.eventHandlers.get(eventName).forEach(handler => handler(data));
    }
  }

  /**
   * Remove event listener
   */
  off(eventName, callback) {
    if (this.socket) {
      this.socket.off(eventName, callback);
    }
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
    }
  }
}

export default NetworkClient;
