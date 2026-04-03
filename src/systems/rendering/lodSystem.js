/**
 * LOD (Level of Detail) System
 * Optimizes rendering performance by adjusting detail level based on distance
 * Reduces draw calls and polygon count for distant objects
 * 
 * Features:
 * - Distance-based LOD switching (4 levels)
 * - Shader quality adjustment
 * - Particle effect culling
 * - Physics quality adjustment
 * - Automatic optimization suggestions
 */

export class LODSystem {
  constructor(options = {}) {
    this.enabled = true;

    // LOD distance thresholds (in game units)
    this.thresholds = {
      high: options.highQualityDistance || 300,     // High detail up to 300 units
      medium: options.mediumQualityDistance || 800, // Medium detail up to 800 units
      low: options.lowQualityDistance || 1500,      // Low detail up to 1500 units
      veryLow: options.veryLowQualityDistance || 2500 // Very low beyond 2500 units
    };

    // LOD levels
    this.levels = {
      HIGH: 0,
      MEDIUM: 1,
      LOW: 2,
      VERYLOW: 3
    };

    // Quality settings per LOD level
    this.qualitySettings = {
      0: { // HIGH
        particlesDensity: 1.0,
        shadowQuality: 'high',
        reflections: true,
        waterShaderQuality: 'full',
        shipDetailLevel: 'full',
        crewVisible: true,
        drawDistance: 2500
      },
      1: { // MEDIUM
        particlesDensity: 0.6,
        shadowQuality: 'medium',
        reflections: true,
        waterShaderQuality: 'reduced',
        shipDetailLevel: 'normal',
        crewVisible: true,
        drawDistance: 2000
      },
      2: { // LOW
        particlesDensity: 0.3,
        shadowQuality: 'low',
        reflections: false,
        waterShaderQuality: 'minimal',
        shipDetailLevel: 'simplified',
        crewVisible: false,
        drawDistance: 1500
      },
      3: { // VERYLOW
        particlesDensity: 0.1,
        shadowQuality: 'none',
        reflections: false,
        waterShaderQuality: 'basic',
        shipDetailLevel: 'minimal',
        crewVisible: false,
        drawDistance: 1000
      }
    };

    // Entity LOD assignments
    this.entityLODs = new Map(); // entityId -> currentLODLevel
    this.lodChanges = []; // Track changes for batch updates

    // Statistics
    this.stats = {
      totalEntities: 0,
      culledEntities: 0,
      avgLODLevel: 0,
      estimatedPolygonReduction: 0
    };
  }

  /**
   * Calculate LOD level based on distance
   */
  calculateLODLevel(distance) {
    if (distance <= this.thresholds.high) return this.levels.HIGH;
    if (distance <= this.thresholds.medium) return this.levels.MEDIUM;
    if (distance <= this.thresholds.low) return this.levels.LOW;
    return this.levels.VERYLOW;
  }

  /**
   * Update LOD for single entity
   */
  updateEntityLOD(entityId, distance) {
    const newLOD = this.calculateLODLevel(distance);
    const oldLOD = this.entityLODs.get(entityId);

    if (oldLOD !== newLOD) {
      this.entityLODs.set(entityId, newLOD);
      
      // Track change for batch processing
      this.lodChanges.push({
        entityId,
        oldLOD,
        newLOD,
        distance,
        timestamp: Date.now()
      });

      return true; // Changed
    }

    return false; // No change
  }

  /**
   * Update LOD for all visible entities
   */
  updateVisibleEntities(viewerPosition, entities) {
    const changes = [];

    for (const [entityId, entity] of entities.entries()) {
      const distance = Math.hypot(
        entity.x - viewerPosition.x,
        entity.y - viewerPosition.y
      );

      // Cull entities beyond draw distance
      if (distance > 2500) {
        if (this.entityLODs.has(entityId)) {
          this.entityLODs.delete(entityId);
          changes.push({
            entityId,
            action: 'cull',
            distance
          });
        }
        continue;
      }

      if (this.updateEntityLOD(entityId, distance)) {
        changes.push({
          entityId,
          newLOD: this.entityLODs.get(entityId),
          distance
        });
      }
    }

    this.stats.totalEntities = entities.size;
    this.stats.culledEntities = entities.size - this.entityLODs.size;

    return changes;
  }

  /**
   * Get LOD level for entity
   */
  getEntityLOD(entityId) {
    return this.entityLODs.get(entityId) || this.levels.HIGH;
  }

  /**
   * Get quality settings for LOD level
   */
  getQualitySettings(lodLevel) {
    return this.qualitySettings[lodLevel] || this.qualitySettings[3];
  }

  /**
   * Batch update LOD for multiple entities
   */
  batchUpdateLODs(viewerPosition, entities) {
    const changes = this.updateVisibleEntities(viewerPosition, entities);
    
    // Group changes by action
    const grouped = {
      updated: [],
      culled: []
    };

    for (const change of changes) {
      if (change.action === 'cull') {
        grouped.culled.push(change.entityId);
      } else {
        grouped.updated.push({
          entityId: change.entityId,
          newLOD: change.newLOD,
          settings: this.getQualitySettings(change.newLOD)
        });
      }
    }

    // Clear changes list
    this.lodChanges = [];

    return grouped;
  }

  /**
   * Recommend LOD settings based on FPS target
   */
  recommendSettings(currentFPS, targetFPS = 60) {
    const fps = currentFPS || 60;
    const recommendations = {
      urgent: fps < targetFPS * 0.5,  // < 30 FPS
      needed: fps < targetFPS * 0.75, // < 45 FPS
      possible: fps < targetFPS       // < 60 FPS
    };

    const adjustments = [];

    if (recommendations.urgent) {
      adjustments.push('Reduce threshold.high from 300 to 150');
      adjustments.push('Reduce threshold.medium from 800 to 500');
      adjustments.push('Disable reflections in MEDIUM LOD');
      adjustments.push('Enable culling for particles');
    } else if (recommendations.needed) {
      adjustments.push('Consider reducing HIGH detail distance');
      adjustments.push('Reduce particle density');
      adjustments.push('Simplify water shader');
    } else if (recommendations.possible) {
      adjustments.push('Can increase detail distances');
      adjustments.push('Consider high-quality reflections');
    }

    return {
      ...recommendations,
      adjustments,
      estimatedImprovement: recommendations.urgent ? '30-40% FPS gain' : 
                           recommendations.needed ? '10-20% FPS gain' : 'Good'
    };
  }

  /**
   * Calculate estimated polygon reduction
   */
  calculatePolygonReduction() {
    let totalReduction = 0;
    let count = 0;

    for (const lodLevel of this.entityLODs.values()) {
      // Rough estimation: each LOD level is 60% of previous
      const reduction = Math.pow(0.6, lodLevel);
      totalReduction += (1 - reduction) * 100;
      count++;
    }

    this.stats.estimatedPolygonReduction = count > 0
      ? (totalReduction / count).toFixed(1) + '%'
      : '0%';

    return this.stats.estimatedPolygonReduction;
  }

  /**
   * Get average LOD level
   */
  getAverageLODLevel() {
    if (this.entityLODs.size === 0) return 0;

    const sum = Array.from(this.entityLODs.values()).reduce((a, b) => a + b, 0);
    const avg = sum / this.entityLODs.size;
    this.stats.avgLODLevel = avg.toFixed(2);

    return avg;
  }

  /**
   * Get statistics
   */
  getStats() {
    this.calculatePolygonReduction();
    this.getAverageLODLevel();

    return {
      ...this.stats,
      utilization: ((this.entityLODs.size / this.stats.totalEntities) * 100).toFixed(1) + '%'
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalEntities: 0,
      culledEntities: 0,
      avgLODLevel: 0,
      estimatedPolygonReduction: 0
    };
  }

  /**
   * Clear all LOD data
   */
  clear() {
    this.entityLODs.clear();
    this.lodChanges = [];
  }

  /**
   * Get LOD level name
   */
  getLODName(lodLevel) {
    const names = ['HIGH', 'MEDIUM', 'LOW', 'VERYLOW'];
    return names[lodLevel] || 'UNKNOWN';
  }
}

// Export singleton
export const lodSystem = new LODSystem();
