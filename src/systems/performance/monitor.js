/**
 * Performance Monitor System
 * Tracks FPS, frame time, memory usage, and network metrics
 * Provides real-time performance visualization and alerts
 * 
 * Features:
 * - FPS monitoring (60hz target)
 * - Frame time tracking
 * - Memory usage tracking
 * - Network latency monitoring
 * - Performance alerts
 * - Debug overlay
 */

export class PerformanceMonitor {
  constructor(options = {}) {
    this.enabled = true;
    this.targetFPS = options.targetFPS || 60;
    this.targetFrameTime = 1000 / this.targetFPS;

    // FPS tracking
    this.fps = 60;
    this.frameCount = 0;
    this.lastFPSUpdate = 0;
    this.fpsHistory = [];
    this.maxHistorySize = 300; // 5 seconds at 60 FPS

    // Frame time tracking
    this.frameTime = 0;
    this.frameTimeHistory = [];
    this.minFrameTime = Infinity;
    this.maxFrameTime = 0;

    // Memory tracking
    this.memory = {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0
    };

    // Network metrics
    this.network = {
      latency: 0,
      bandwidth: 0,
      packetLoss: 0
    };

    // Performance thresholds
    this.thresholds = {
      fpsWarning: this.targetFPS * 0.75,  // 45 FPS for 60 target
      fpsCritical: this.targetFPS * 0.5,  // 30 FPS for 60 target
      memoryWarning: 300 * 1024 * 1024,  // 300 MB
      memoryCritical: 400 * 1024 * 1024  // 400 MB
    };

    // Alerts
    this.alerts = [];
    this.maxAlerts = 10;

    this.lastFrameTime = Date.now();
  }

  /**
   * Update frame metrics
   */
  update() {
    const now = Date.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Update frame time
    this.frameTime = delta;
    this.frameTimeHistory.push(delta);

    if (this.frameTimeHistory.length > this.maxHistorySize) {
      this.frameTimeHistory.shift();
    }

    // Track min/max frame time
    this.minFrameTime = Math.min(this.minFrameTime, delta);
    this.maxFrameTime = Math.max(this.maxFrameTime, delta);

    // Update FPS
    this.frameCount++;

    if (now - this.lastFPSUpdate >= 1000) {
      this.fps = this.frameCount;
      this.fpsHistory.push(this.fps);

      if (this.fpsHistory.length > this.maxHistorySize) {
        this.fpsHistory.shift();
      }

      this.frameCount = 0;
      this.lastFPSUpdate = now;

      // Check for performance issues
      this.checkAlerts();
    }

    // Update memory
    this.updateMemory();
  }

  /**
   * Update memory usage
   */
  updateMemory() {
    if (performance.memory) {
      this.memory = {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      };
    }
  }

  /**
   * Check for performance alerts
   */
  checkAlerts() {
    const alerts = [];

    // FPS alerts
    if (this.fps < this.thresholds.fpsCritical) {
      alerts.push({
        type: 'CRITICAL',
        message: `FPS Critical: ${this.fps} FPS (target: ${this.targetFPS})`,
        timestamp: Date.now()
      });
    } else if (this.fps < this.thresholds.fpsWarning) {
      alerts.push({
        type: 'WARNING',
        message: `FPS Low: ${this.fps} FPS (target: ${this.targetFPS})`,
        timestamp: Date.now()
      });
    }

    // Memory alerts
    if (this.memory.usedJSHeapSize > this.thresholds.memoryCritical) {
      alerts.push({
        type: 'CRITICAL',
        message: `Memory Critical: ${(this.memory.usedJSHeapSize / 1024 / 1024).toFixed(0)} MB`,
        timestamp: Date.now()
      });
    } else if (this.memory.usedJSHeapSize > this.thresholds.memoryWarning) {
      alerts.push({
        type: 'WARNING',
        message: `Memory Warning: ${(this.memory.usedJSHeapSize / 1024 / 1024).toFixed(0)} MB`,
        timestamp: Date.now()
      });
    }

    // Add to alert queue
    for (const alert of alerts) {
      this.alerts.push(alert);

      if (this.alerts.length > this.maxAlerts) {
        this.alerts.shift();
      }
    }

    return alerts;
  }

  /**
   * Record network metric
   */
  recordNetworkMetric(latency, bandwidth = 0, packetLoss = 0) {
    this.network.latency = latency;
    this.network.bandwidth = bandwidth;
    this.network.packetLoss = packetLoss;

    if (latency > 200) {
      this.alerts.push({
        type: 'WARNING',
        message: `High Latency: ${latency}ms`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get FPS statistics
   */
  getFPSStats() {
    if (this.fpsHistory.length === 0) {
      return { current: 0, average: 0, min: 0, max: 0 };
    }

    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    const avg = sum / this.fpsHistory.length;
    const min = Math.min(...this.fpsHistory);
    const max = Math.max(...this.fpsHistory);

    return {
      current: this.fps,
      average: avg.toFixed(1),
      min,
      max
    };
  }

  /**
   * Get frame time statistics
   */
  getFrameTimeStats() {
    if (this.frameTimeHistory.length === 0) {
      return { current: 0, average: 0, min: 0, max: 0 };
    }

    const sum = this.frameTimeHistory.reduce((a, b) => a + b, 0);
    const avg = sum / this.frameTimeHistory.length;

    return {
      current: this.frameTime.toFixed(2),
      average: avg.toFixed(2),
      min: this.minFrameTime.toFixed(2),
      max: this.maxFrameTime.toFixed(2)
    };
  }

  /**
   * Get memory statistics
   */
  getMemoryStats() {
    return {
      used: (this.memory.usedJSHeapSize / 1024 / 1024).toFixed(1) + ' MB',
      total: (this.memory.totalJSHeapSize / 1024 / 1024).toFixed(1) + ' MB',
      limit: (this.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(1) + ' MB',
      percentage: ((this.memory.usedJSHeapSize / this.memory.jsHeapSizeLimit) * 100).toFixed(1) + '%'
    };
  }

  /**
   * Get network statistics
   */
  getNetworkStats() {
    return {
      latency: this.network.latency.toFixed(0) + ' ms',
      bandwidth: this.network.bandwidth > 0
        ? (this.network.bandwidth / 1024).toFixed(2) + ' KB/s'
        : 'N/A',
      packetLoss: (this.network.packetLoss * 100).toFixed(2) + '%'
    };
  }

  /**
   * Create debug overlay element
   */
  createDebugOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'performance-debug';
    overlay.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: #0f0;
      font-family: monospace;
      font-size: 12px;
      padding: 10px;
      border: 2px solid #0f0;
      border-radius: 5px;
      z-index: 2000;
      min-width: 200px;
      max-height: 300px;
      overflow-y: auto;
      user-select: none;
    `;

    this.debugOverlay = overlay;
    document.body.appendChild(overlay);
    return overlay;
  }

  /**
   * Update debug overlay
   */
  updateDebugOverlay() {
    if (!this.debugOverlay) {
      this.createDebugOverlay();
    }

    const fpsStats = this.getFPSStats();
    const frameStats = this.getFrameTimeStats();
    const memStats = this.getMemoryStats();
    const netStats = this.getNetworkStats();

    const html = `
      <div style="margin-bottom: 10px;">
        <strong>FPS Monitor</strong><br>
        Current: ${fpsStats.current}<br>
        Avg: ${fpsStats.average} | Min: ${fpsStats.min} | Max: ${fpsStats.max}
      </div>
      <div style="margin-bottom: 10px;">
        <strong>Frame Time</strong><br>
        Current: ${frameStats.current}ms<br>
        Avg: ${frameStats.average}ms | Min: ${frameStats.min}ms | Max: ${frameStats.max}ms
      </div>
      <div style="margin-bottom: 10px;">
        <strong>Memory</strong><br>
        Used: ${memStats.used} / ${memStats.total}<br>
        Limit: ${memStats.limit} (${memStats.percentage})
      </div>
      <div>
        <strong>Network</strong><br>
        Latency: ${netStats.latency}<br>
        Packet Loss: ${netStats.packetLoss}
      </div>
      ${this.alerts.length > 0 ? `
        <div style="margin-top: 10px; border-top: 1px solid #0f0; padding-top: 10px;">
          <strong style="color: #ff0;">⚠ Alerts (${this.alerts.length})</strong><br>
          ${this.alerts.slice(-3).map(a => `${a.type}: ${a.message}`).join('<br>')}
        </div>
      ` : ''}
    `;

    this.debugOverlay.innerHTML = html;
  }

  /**
   * Show debug overlay
   */
  showDebugOverlay() {
    if (!this.debugOverlay) {
      this.createDebugOverlay();
    }
    this.debugOverlay.style.display = 'block';
  }

  /**
   * Hide debug overlay
   */
  hideDebugOverlay() {
    if (this.debugOverlay) {
      this.debugOverlay.style.display = 'none';
    }
  }

  /**
   * Get all statistics
   */
  getStats() {
    return {
      fps: this.getFPSStats(),
      frameTime: this.getFrameTimeStats(),
      memory: this.getMemoryStats(),
      network: this.getNetworkStats(),
      alerts: this.alerts.slice(-5)
    };
  }

  /**
   * Export statistics for analysis
   */
  exportStats() {
    return {
      timestamp: Date.now(),
      targetFPS: this.targetFPS,
      fpsHistory: this.fpsHistory,
      frameTimeHistory: this.frameTimeHistory,
      memory: this.memory,
      network: this.network,
      alerts: this.alerts
    };
  }

  /**
   * Clear history and reset
   */
  reset() {
    this.fps = this.targetFPS;
    this.frameCount = 0;
    this.fpsHistory = [];
    this.frameTimeHistory = [];
    this.alerts = [];
    this.minFrameTime = Infinity;
    this.maxFrameTime = 0;
  }
}

// Export singleton
export const performanceMonitor = new PerformanceMonitor();
