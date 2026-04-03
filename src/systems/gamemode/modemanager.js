/**
 * Game Mode Manager
 * Handles switching between different game modes
 * Manages mode initialization, cleanup, and state
 */

import { TeamFlagsMode } from './teamflags.js';
import { TradingMode } from './trading.js';

export class GameModeManager {
  constructor() {
    this.currentMode = null;
    this.currentModeType = null; // 'teamflags', 'trading', 'freeplay'
    this.modes = {
      teamflags: new TeamFlagsMode(),
      trading: new TradingMode()
    };
    this.modeHistory = [];
  }

  /**
   * Set the active game mode
   */
  setMode(modeType, matchId) {
    if (this.currentMode) {
      // Save history of previous mode
      this.modeHistory.push({
        type: this.currentModeType,
        data: this.currentMode.exportData(),
        timestamp: Date.now()
      });

      // Cleanup previous mode
      this.currentMode.clear();
    }

    if (!this.modes[modeType]) {
      console.error(`Unknown game mode: ${modeType}`);
      return false;
    }

    this.currentModeType = modeType;
    this.currentMode = this.modes[modeType];
    this.currentMode.initializeMode(matchId);

    console.log(`🎮 Game mode changed to: ${modeType}`);
    return true;
  }

  /**
   * Get current mode name
   */
  getCurrentModeName() {
    return this.currentModeType;
  }

  /**
   * Check if mode is active
   */
  isModeActive(modeType) {
    return this.currentModeType === modeType;
  }

  /**
   * Get current mode instance
   */
  getCurrentMode() {
    return this.currentMode;
  }

  /**
   * Delegate method call to current mode
   */
  callModeMethod(methodName, ...args) {
    if (!this.currentMode || !this.currentMode[methodName]) {
      return null;
    }

    return this.currentMode[methodName](...args);
  }

  /**
   * Get mode overview (for UI)
   */
  getModeOverview() {
    if (!this.currentMode) return null;

    return {
      mode: this.currentModeType,
      overview: this.currentMode.getGameOverview?.()
    };
  }

  /**
   * Get all available modes
   */
  getAvailableModes() {
    return Object.keys(this.modes);
  }

  /**
   * Reset current mode
   */
  resetMode() {
    if (this.currentMode) {
      this.currentMode.clear();
      this.currentMode.initializeMode(this.currentMode.matchId);
    }
  }

  /**
   * Export all mode data
   */
  exportAllData() {
    const data = {
      currentMode: this.currentModeType,
      modeData: this.currentMode?.exportData(),
      history: this.modeHistory
    };
    return data;
  }

  /**
   * Clear all modes
   */
  clear() {
    for (const mode of Object.values(this.modes)) {
      mode.clear();
    }
    this.currentMode = null;
    this.currentModeType = null;
    this.modeHistory = [];
  }
}
