/**
 * Lag Compensation System
 * Handles client-side prediction, server validation, and state rollback
 * Supports network prediction to reduce perceived latency
 * 
 * Features:
 * - Client-side prediction
 * - Server validation
 * - State snapshots & rollback
 * - Latency measurement
 * - Prediction correction
 */

export class LagCompensator {
  constructor(options = {}) {
    this.enabled = true;
    this.maxTicksToPredict = options.maxTicksToPredict || 6; // ~100ms at 60Hz
    this.predictionDuration = this.maxTicksToPredict * (1000 / 60);

    // Network state
    this.latency = 0; // Current latency in ms
    this.latencyHistory = []; // Last 30 latency samples
    this.maxHistorySize = 30;

    // Prediction state per entity
    this.predictions = new Map(); // entityId -> predictionState
    this.snapshots = new Map(); // entityId -> [snapshots]
    this.maxSnapshots = 20; // Keep last 20 snapshots

    // Validation
    this.validationErrors = new Map(); // playerId -> errorCount
    this.maxValidationErrors = 5; // Ban after 5 failed validations

    // Statistics
    this.stats = {
      totalPredictions: 0,
      correctPredictions: 0,
      correctionDistance: 0,
      averageLatency: 0
    };
  }

  /**
   * Measure ping latency
   */
  measureLatency(rttMs) {
    const latency = rttMs / 2;
    this.latencyHistory.push(latency);

    if (this.latencyHistory.length > this.maxHistorySize) {
      this.latencyHistory.shift();
    }

    // Calculate average
    this.latency = this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length;
    this.stats.averageLatency = this.latency;

    return this.latency;
  }

  /**
   * Create snapshot of entity state
   */
  createSnapshot(entityId, state) {
    if (!this.snapshots.has(entityId)) {
      this.snapshots.set(entityId, []);
    }

    const snapshots = this.snapshots.get(entityId);
    const snapshot = {
      timestamp: Date.now(),
      state: {
        x: state.x,
        y: state.y,
        rotation: state.rotation,
        vx: state.vx || 0,
        vy: state.vy || 0,
        health: state.health,
        heading: state.heading || state.rotation
      }
    };

    snapshots.push(snapshot);

    // Keep only recent snapshots
    if (snapshots.length > this.maxSnapshots) {
      snapshots.shift();
    }

    return snapshot;
  }

  /**
   * Get nearest snapshot before time
   */
  getSnapshotBefore(entityId, timestamp) {
    const snapshots = this.snapshots.get(entityId);
    if (!snapshots || snapshots.length === 0) return null;

    for (let i = snapshots.length - 1; i >= 0; i--) {
      if (snapshots[i].timestamp <= timestamp) {
        return snapshots[i];
      }
    }

    return snapshots[0];
  }

  /**
   * Predict entity state based on velocity and time delta
   */
  predictState(entityId, currentState, timeDeltaMs) {
    const prediction = {
      entityId,
      timestamp: Date.now(),
      predicted: {},
      confidence: 1.0
    };

    // Linear position prediction
    const secondsDelta = timeDeltaMs / 1000;
    const vx = currentState.vx || 0;
    const vy = currentState.vy || 0;

    prediction.predicted = {
      x: currentState.x + (vx * secondsDelta),
      y: currentState.y + (vy * secondsDelta),
      rotation: currentState.rotation,
      heading: currentState.heading || currentState.rotation,
      vx: vx,
      vy: vy
    };

    // Reduce confidence for larger time deltas
    prediction.confidence = Math.max(0, 1 - (timeDeltaMs / (this.predictionDuration * 2)));

    this.predictions.set(entityId, prediction);
    this.stats.totalPredictions++;

    return prediction;
  }

  /**
   * Apply prediction to multiple entities
   */
  applyPredictions(entities, timeDeltaMs) {
    const predicted = new Map();

    for (const [entityId, state] of entities.entries()) {
      if (state.isStatic) {
        // Don't predict static objects
        predicted.set(entityId, state);
        continue;
      }

      const prediction = this.predictState(entityId, state, timeDeltaMs);
      predicted.set(entityId, {
        ...state,
        ...prediction.predicted,
        isPredicted: true,
        confidence: prediction.confidence
      });
    }

    return predicted;
  }

  /**
   * Validate server state against prediction
   */
  validateServerState(entityId, serverState, predictionState) {
    if (!predictionState) {
      return { valid: true, error: 0 };
    }

    const posError = Math.hypot(
      serverState.x - predictionState.x,
      serverState.y - predictionState.y
    );

    const rotationError = Math.abs(serverState.rotation - predictionState.rotation);

    // Tolerance: position 20 units, rotation 0.2 rad
    const valid = posError <= 20 && rotationError <= 0.2;

    return {
      valid,
      positionError: posError,
      rotationError: rotationError,
      totalError: posError + rotationError
    };
  }

  /**
   * Apply server correction
   */
  applyCorrection(entityId, serverState, predictedState, correctionFactor = 0.5) {
    if (!predictedState) return serverState;

    const correction = {
      x: serverState.x,
      y: serverState.y,
      rotation: serverState.rotation
    };

    // Smooth correction (linear interpolation toward server state)
    if (predictedState.x !== serverState.x) {
      correction.x = predictedState.x + 
        (serverState.x - predictedState.x) * correctionFactor;
    }

    if (predictedState.y !== serverState.y) {
      correction.y = predictedState.y + 
        (serverState.y - predictedState.y) * correctionFactor;
    }

    const correctionDistance = Math.hypot(
      serverState.x - predictedState.x,
      serverState.y - predictedState.y
    );

    this.stats.correctionDistance += correctionDistance;
    this.stats.correctPredictions++;

    return { ...serverState, ...correction };
  }

  /**
   * Check for suspicious behavior (cheating detection)
   */
  checkSuspiciousBehavior(playerId, state, serverState) {
    const errors = this.validationErrors.get(playerId) || 0;

    // Position teleport (>100 units per 100ms) suggests possible cheat
    const teleportDistance = Math.hypot(
      state.x - serverState.x,
      state.y - serverState.y
    );

    if (teleportDistance > 100) {
      this.validationErrors.set(playerId, errors + 1);
      return {
        suspicious: true,
        reason: 'position_teleport',
        distance: teleportDistance,
        errorCount: errors + 1
      };
    }

    // Health gain out of nowhere suggests cheat
    if (state.health > serverState.health && serverState.health > 0) {
      this.validationErrors.set(playerId, errors + 1);
      return {
        suspicious: true,
        reason: 'invalid_health_gain',
        errorCount: errors + 1
      };
    }

    return { suspicious: false, errorCount: errors };
  }

  /**
   * Get player validation status
   */
  getValidationStatus(playerId) {
    const errorCount = this.validationErrors.get(playerId) || 0;
    return {
      errorCount,
      isBanned: errorCount >= this.maxValidationErrors,
      threshold: this.maxValidationErrors
    };
  }

  /**
   * Reset player validation errors
   */
  resetValidationErrors(playerId) {
    this.validationErrors.delete(playerId);
  }

  /**
   * Get prediction statistics
   */
  getStats() {
    const accuracy = this.stats.totalPredictions > 0
      ? (this.stats.correctPredictions / this.stats.totalPredictions * 100).toFixed(2)
      : 0;

    const avgCorrection = this.stats.correctPredictions > 0
      ? (this.stats.correctionDistance / this.stats.correctPredictions).toFixed(2)
      : 0;

    return {
      ...this.stats,
      accuracy: accuracy + '%',
      averageCorrection: avgCorrection + ' units',
      averageLatency: this.stats.averageLatency.toFixed(1) + 'ms'
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalPredictions: 0,
      correctPredictions: 0,
      correctionDistance: 0,
      averageLatency: 0
    };
  }
}

// Export singleton
export const lagCompensator = new LagCompensator();
