/**
 * Server Cluster Manager
 * Manages multiple game server instances for scaling to 90+ players
 * Implements load balancing, server selection, and player distribution
 * 
 * Features:
 * - Multiple server instance management
 * - Load balancing (round-robin, least-loaded)
 * - Server health monitoring
 * - Automatic failover
 * - Player migration between servers
 */

export class ClusterManager {
  constructor(options = {}) {
    this.servers = new Map(); // serverId -> serverData
    this.serverCounter = 0;
    this.maxPlayersPerServer = options.maxPlayersPerServer || 20; // 20 players per match server
    this.maxServers = options.maxServers || 10;
    this.healthCheckInterval = options.healthCheckInterval || 5000;
    this.loadBalancingStrategy = options.loadBalancingStrategy || 'least-loaded'; // 'round-robin' | 'least-loaded'

    // Statistics
    this.stats = {
      totalPlayers: 0,
      totalMatches: 0,
      activeServers: 0,
      averageServerLoad: 0,
      failedHealthChecks: 0
    };

    this.healthCheckTimer = null;
  }

  /**
   * Create new server instance
   */
  createServer(options = {}) {
    const serverId = `server_${this.serverCounter++}`;
    
    const server = {
      id: serverId,
      name: options.name || `Game Server ${this.serverCounter}`,
      region: options.region || 'us-east',
      host: options.host || 'localhost',
      port: options.port || (3000 + this.serverCounter),
      maxPlayers: this.maxPlayersPerServer,
      currentPlayers: 0,
      players: new Set(),
      matches: new Map(),
      status: 'initializing', // 'initializing' | 'running' | 'degraded' | 'offline'
      uptime: 0,
      startTime: Date.now(),
      health: {
        cpu: 0,
        memory: 0,
        network: 0,
        isHealthy: true
      },
      lastHealthCheck: 0,
      failedChecks: 0
    };

    this.servers.set(serverId, server);
    this.stats.activeServers = this.servers.size;

    console.log(`✅ Created server: ${serverId} at ${server.host}:${server.port}`);
    return server;
  }

  /**
   * Get server by ID
   */
  getServer(serverId) {
    return this.servers.get(serverId);
  }

  /**
   * Get all active servers
   */
  getActiveServers() {
    return Array.from(this.servers.values()).filter(s => s.status !== 'offline');
  }

  /**
   * Select best server for new player using load balancing
   */
  selectServerForPlayer() {
    if (this.servers.size === 0) {
      this.createServer();
    }

    const activeServers = this.getActiveServers();
    
    if (activeServers.length === 0) {
      return null;
    }

    let selected = null;

    if (this.loadBalancingStrategy === 'round-robin') {
      // Simple round-robin: pick server with first available slot
      selected = activeServers.find(s => s.currentPlayers < s.maxPlayers);
    } else {
      // Least-loaded: pick server with fewest players
      selected = activeServers.reduce((prev, current) => {
        return current.currentPlayers < prev.currentPlayers ? current : prev;
      });

      // If selected server is full, try creating a new one
      if (selected.currentPlayers >= selected.maxPlayers) {
        if (this.servers.size < this.maxServers) {
          selected = this.createServer();
        } else {
          // All servers full
          return null;
        }
      }
    }

    return selected;
  }

  /**
   * Add player to server
   */
  addPlayerToServer(serverId, playerId) {
    const server = this.getServer(serverId);
    if (!server) return false;

    if (server.currentPlayers >= server.maxPlayers) {
      return false; // Server full
    }

    server.players.add(playerId);
    server.currentPlayers++;
    this.stats.totalPlayers++;

    console.log(`👤 Player ${playerId} added to ${serverId} (${server.currentPlayers}/${server.maxPlayers})`);
    return true;
  }

  /**
   * Remove player from server
   */
  removePlayerFromServer(serverId, playerId) {
    const server = this.getServer(serverId);
    if (!server) return false;

    server.players.delete(playerId);
    server.currentPlayers--;
    this.stats.totalPlayers = Math.max(0, this.stats.totalPlayers - 1);

    console.log(`👤 Player ${playerId} removed from ${serverId} (${server.currentPlayers}/${server.maxPlayers})`);

    // Clean up empty servers
    if (server.currentPlayers === 0 && server.matches.size === 0) {
      this.removeServer(serverId);
    }

    return true;
  }

  /**
   * Create match on server
   */
  createMatch(serverId, matchData) {
    const server = this.getServer(serverId);
    if (!server) return null;

    const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    server.matches.set(matchId, {
      id: matchId,
      ...matchData,
      createdAt: Date.now(),
      state: 'waiting'
    });

    this.stats.totalMatches++;

    console.log(`🎮 Match ${matchId} created on ${serverId}`);
    return matchId;
  }

  /**
   * Remove match from server
   */
  removeMatch(serverId, matchId) {
    const server = this.getServer(serverId);
    if (!server) return false;

    server.matches.delete(matchId);

    // Clean up empty servers
    if (server.currentPlayers === 0 && server.matches.size === 0) {
      this.removeServer(serverId);
    }

    return true;
  }

  /**
   * Remove server
   */
  removeServer(serverId) {
    const server = this.getServer(serverId);
    if (!server) return;

    // Migrate players if server is being shut down
    if (server.currentPlayers > 0) {
      const players = Array.from(server.players);
      for (const playerId of players) {
        this.migratePlayer(serverId, playerId);
      }
    }

    this.servers.delete(serverId);
    this.stats.activeServers = this.servers.size;

    console.log(`🗑️ Server ${serverId} removed`);
  }

  /**
   * Migrate player to different server
   */
  migratePlayer(fromServerId, playerId) {
    this.removePlayerFromServer(fromServerId, playerId);

    const newServer = this.selectServerForPlayer();
    if (newServer) {
      this.addPlayerToServer(newServer.id, playerId);
      console.log(`🔄 Player ${playerId} migrated to ${newServer.id}`);
      return newServer;
    }

    console.warn(`⚠️ Could not migrate player ${playerId}`);
    return null;
  }

  /**
   * Update server health metrics
   */
  updateServerHealth(serverId, health) {
    const server = this.getServer(serverId);
    if (!server) return;

    server.health = {
      cpu: health.cpu || 0,
      memory: health.memory || 0,
      network: health.network || 0,
      isHealthy: health.isHealthy !== false
    };

    server.lastHealthCheck = Date.now();

    // Update server status
    if (!health.isHealthy) {
      server.failedChecks++;
      server.status = 'degraded';

      if (server.failedChecks > 3) {
        server.status = 'offline';
        console.warn(`⚠️ Server ${serverId} marked as offline (${server.failedChecks} failed checks)`);
        this.stats.failedHealthChecks++;
      }
    } else {
      server.failedChecks = 0;
      server.status = 'running';
    }
  }

  /**
   * Start health check interval
   */
  startHealthChecks(healthCheckCallback) {
    this.healthCheckTimer = setInterval(() => {
      for (const [serverId, server] of this.servers.entries()) {
        // Simulate health check or call actual health endpoint
        if (healthCheckCallback) {
          healthCheckCallback(serverId, server);
        } else {
          // Default: assume healthy if not explicitly updated
          this.updateServerHealth(serverId, { isHealthy: true });
        }
      }
    }, this.healthCheckInterval);

    console.log('✅ Health checks started');
  }

  /**
   * Stop health checks
   */
  stopHealthChecks() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Get cluster status
   */
  getClusterStatus() {
    const servers = Array.from(this.servers.values());
    const runningServers = servers.filter(s => s.status === 'running');
    const capacity = runningServers.reduce((sum, s) => sum + (s.maxPlayers - s.currentPlayers), 0);

    return {
      totalServers: this.servers.size,
      runningServers: runningServers.length,
      degradedServers: servers.filter(s => s.status === 'degraded').length,
      offlineServers: servers.filter(s => s.status === 'offline').length,
      totalCapacity: this.servers.size * this.maxPlayersPerServer,
      usedCapacity: this.stats.totalPlayers,
      availableCapacity: capacity,
      utilizationPercent: ((this.stats.totalPlayers / (this.servers.size * this.maxPlayersPerServer)) * 100).toFixed(1),
      averageServerLoad: (this.stats.totalPlayers / Math.max(1, runningServers.length)).toFixed(1)
    };
  }

  /**
   * Get server details
   */
  getServerDetails(serverId) {
    const server = this.getServer(serverId);
    if (!server) return null;

    return {
      ...server,
      players: Array.from(server.players),
      matches: Array.from(server.matches.values()),
      uptime: Date.now() - server.startTime
    };
  }

  /**
   * Get statistics
   */
  getStats() {
    const status = this.getClusterStatus();
    return {
      ...this.stats,
      ...status
    };
  }

  /**
   * Get detailed server list
   */
  getServerList() {
    return Array.from(this.servers.values()).map(s => ({
      id: s.id,
      name: s.name,
      region: s.region,
      status: s.status,
      players: s.currentPlayers,
      maxPlayers: s.maxPlayers,
      matches: s.matches.size,
      health: s.health,
      uptime: Date.now() - s.startTime
    }));
  }

  /**
   * Rebalance servers (redistribute players)
   */
  rebalance() {
    const players = [];

    // Collect all players
    for (const [serverId, server] of this.servers.entries()) {
      for (const playerId of server.players) {
        players.push({ playerId, fromServer: serverId });
      }
    }

    // Clear all players
    for (const server of this.servers.values()) {
      server.players.clear();
      server.currentPlayers = 0;
    }

    // Redistribute evenly
    let rebalanced = 0;
    for (const { playerId } of players) {
      const newServer = this.selectServerForPlayer();
      if (newServer) {
        this.addPlayerToServer(newServer.id, playerId);
        rebalanced++;
      }
    }

    console.log(`⚖️ Rebalanced ${rebalanced}/${players.length} players`);
    return rebalanced;
  }

  /**
   * Cleanup and shutdown
   */
  shutdown() {
    this.stopHealthChecks();
    this.servers.clear();
    this.stats = {
      totalPlayers: 0,
      totalMatches: 0,
      activeServers: 0,
      averageServerLoad: 0,
      failedHealthChecks: 0
    };
    console.log('✅ Cluster manager shutdown');
  }
}

// Export singleton
export const clusterManager = new ClusterManager();
