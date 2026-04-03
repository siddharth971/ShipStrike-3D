/**
 * Interest Manager System
 * Optimizes network bandwidth by only broadcasting state for nearby entities
 * Implements spatial partitioning and relevance-based data streaming
 * 
 * Features:
 * - Spatial partitioning (grid-based)
 * - Interest culling (only send relevant data)
 * - Bandwidth optimization
 * - Dynamic visibility range
 * - Player-centric updates
 */

export class InterestManager {
  constructor(options = {}) {
    this.gridSize = options.gridSize || 500; // 500x500 unit grid cells
    this.mapSize = options.mapSize || 4000;
    this.visibilityRange = options.visibilityRange || 1500; // How far players can see
    this.maxGridCells = options.maxGridCells || 9; // 3x3 grid of cells

    // Grid-based spatial partitioning
    this.grid = new Map();
    this.entityToCell = new Map(); // entityId -> cellKey

    // Interest sets (what each player cares about)
    this.playerInterests = new Map(); // playerId -> Set<entityId>
    this.lastBroadcast = new Map(); // playerId -> timestamp
    this.broadcastInterval = 50; // ms between updates per player

    // Statistics
    this.stats = {
      totalUpdates: 0,
      culledUpdates: 0,
      bandwidth: 0
    };
  }

  /**
   * Register entity in spatial grid
   */
  registerEntity(entityId, x, y) {
    const cellKey = this.getCellKey(x, y);
    
    // Remove from old cell if exists
    const oldKey = this.entityToCell.get(entityId);
    if (oldKey && this.grid.has(oldKey)) {
      const oldCell = this.grid.get(oldKey);
      oldCell.delete(entityId);
    }

    // Add to new cell
    if (!this.grid.has(cellKey)) {
      this.grid.set(cellKey, new Set());
    }
    this.grid.get(cellKey).add(entityId);
    this.entityToCell.set(entityId, cellKey);
  }

  /**
   * Unregister entity from spatial grid
   */
  unregisterEntity(entityId) {
    const cellKey = this.entityToCell.get(entityId);
    if (cellKey && this.grid.has(cellKey)) {
      this.grid.get(cellKey).delete(entityId);
    }
    this.entityToCell.delete(entityId);
    this.playerInterests.delete(entityId);
  }

  /**
   * Get grid cell key for position
   */
  getCellKey(x, y) {
    const cellX = Math.floor(x / this.gridSize);
    const cellY = Math.floor(y / this.gridSize);
    return `${cellX},${cellY}`;
  }

  /**
   * Get all cells within range of position
   */
  getCellsInRange(x, y, range = this.gridSize) {
    const cells = new Set();
    const cellX = Math.floor(x / this.gridSize);
    const cellY = Math.floor(y / this.gridSize);
    
    const radius = Math.ceil(range / this.gridSize);
    
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        cells.add(`${cellX + dx},${cellY + dy}`);
      }
    }
    
    return cells;
  }

  /**
   * Update player interest set (what they can see)
   */
  updatePlayerInterest(playerId, x, y) {
    const interestCells = this.getCellsInRange(x, y, this.visibilityRange);
    const newInterests = new Set();

    // Add all entities in relevant cells
    for (const cellKey of interestCells) {
      if (this.grid.has(cellKey)) {
        for (const entityId of this.grid.get(cellKey)) {
          newInterests.add(entityId);
        }
      }
    }

    // Store updated interests
    const oldInterests = this.playerInterests.get(playerId) || new Set();
    this.playerInterests.set(playerId, newInterests);

    // Return added and removed entities
    const added = new Set([...newInterests].filter(x => !oldInterests.has(x)));
    const removed = new Set([...oldInterests].filter(x => !newInterests.has(x)));

    return { added, removed, current: newInterests };
  }

  /**
   * Get entities in range for a player
   */
  getEntitiesInRange(playerId) {
    const interests = this.playerInterests.get(playerId);
    if (!interests) return [];
    return Array.from(interests);
  }

  /**
   * Filter entities that changed significantly since last broadcast
   */
  filterSignificantUpdates(playerId, currentStates, lastStates = new Map()) {
    const interesting = this.playerInterests.get(playerId) || new Set();
    const significant = new Map();

    for (const [entityId, state] of currentStates.entries()) {
      // Not in interest
      if (!interesting.has(entityId)) continue;

      // New entity or no last state
      if (!lastStates.has(entityId)) {
        significant.set(entityId, state);
        continue;
      }

      const lastState = lastStates.get(entityId);
      
      // Check position change (threshold: 5 units)
      const posDist = Math.hypot(
        state.x - lastState.x,
        state.y - lastState.y
      );
      if (posDist > 5) {
        significant.set(entityId, state);
        continue;
      }

      // Check rotation change (threshold: 0.05 radians)
      if (Math.abs(state.rotation - lastState.rotation) > 0.05) {
        significant.set(entityId, state);
        continue;
      }

      // Check health change
      if (state.health !== lastState.health) {
        significant.set(entityId, state);
        continue;
      }
    }

    return significant;
  }

  /**
   * Should broadcast (rate limiting per player)
   */
  shouldBroadcast(playerId) {
    const now = Date.now();
    const last = this.lastBroadcast.get(playerId) || 0;

    if (now - last >= this.broadcastInterval) {
      this.lastBroadcast.set(playerId, now);
      return true;
    }
    return false;
  }

  /**
   * Calculate bandwidth for update
   */
  calculateBandwidth(state) {
    // Rough estimate: JSON stringified size
    return JSON.stringify(state).length;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      avgCullRate: this.stats.totalUpdates > 0 
        ? (this.stats.culledUpdates / this.stats.totalUpdates * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalUpdates: 0,
      culledUpdates: 0,
      bandwidth: 0
    };
  }

  /**
   * Debug: Get grid visualization
   */
  debugGetGridInfo() {
    const info = {
      totalCells: this.grid.size,
      totalEntities: this.entityToCell.size,
      cellsWithEntities: 0,
      averageEntitiesPerCell: 0,
      cells: {}
    };

    let totalEntities = 0;
    
    for (const [cellKey, entities] of this.grid.entries()) {
      if (entities.size > 0) {
        info.cellsWithEntities++;
        totalEntities += entities.size;
        info.cells[cellKey] = entities.size;
      }
    }

    info.averageEntitiesPerCell = info.cellsWithEntities > 0
      ? (totalEntities / info.cellsWithEntities).toFixed(2)
      : 0;

    return info;
  }

  /**
   * Optimize: Clear unused cells
   */
  cleanupEmptyCells() {
    const emptyKeys = [];
    
    for (const [cellKey, entities] of this.grid.entries()) {
      if (entities.size === 0) {
        emptyKeys.push(cellKey);
      }
    }

    emptyKeys.forEach(key => this.grid.delete(key));
    return emptyKeys.length;
  }
}

// Export singleton
export const interestManager = new InterestManager();
