/**
 * Team Flags Game Mode
 * Objective-based team gameplay with flag capture/defense zones
 * Players divide into teams (Red/Blue) and compete to capture enemy flags
 */

export class TeamFlagsMode {
  constructor() {
    this.isActive = false;
    this.matchId = null;
    this.teams = {
      red: {
        name: 'Red',
        players: new Set(),
        score: 0,
        flagsHeld: 0,
        homeBaseX: 400,
        homeBaseY: 400,
        baseRadius: 150
      },
      blue: {
        name: 'Blue',
        players: new Set(),
        score: 0,
        flagsHeld: 0,
        homeBaseX: 3600,
        homeBaseY: 3600,
        baseRadius: 150
      }
    };
    this.flags = new Map(); // flagId -> { teamId, x, y, x, carrierId, state }
    this.captureZones = new Map(); // zoneId -> { x, y, radius, teamId }
    this.objectives = []; // Objective tracking
    this.matchState = 'waiting'; // waiting, active, ended
    this.startTime = null;
    this.endTime = null;
    this.scoreToWin = 3; // First to 3 flag captures wins
    this.flagCounter = 0;
  }

  /**
   * Initialize team flags mode
   */
  initializeMode(matchId) {
    this.matchId = matchId;
    this.isActive = true;
    this.matchState = 'waiting';
    this.teams.red.score = 0;
    this.teams.blue.score = 0;
    this.teams.red.players = new Set();
    this.teams.blue.players = new Set();
    this.flags = new Map();

    // Create capture zones near each base
    this.createCaptureZone(
      `zone_red_1`,
      this.teams.red.homeBaseX + 200,
      this.teams.red.homeBaseY,
      100,
      'red'
    );

    this.createCaptureZone(
      `zone_red_2`,
      this.teams.red.homeBaseX - 200,
      this.teams.red.homeBaseY,
      100,
      'red'
    );

    this.createCaptureZone(
      `zone_blue_1`,
      this.teams.blue.homeBaseX + 200,
      this.teams.blue.homeBaseY,
      100,
      'blue'
    );

    this.createCaptureZone(
      `zone_blue_2`,
      this.teams.blue.homeBaseX - 200,
      this.teams.blue.homeBaseY,
      100,
      'blue'
    );

    // Create flags (will be dropped in capture zones initially)
    this.spawnFlag('flag_red', 'red');
    this.spawnFlag('flag_blue', 'blue');

    console.log('✅ Team Flags Mode initialized');
  }

  /**
   * Assign player to a team (auto-balance)
   */
  assignPlayerToTeam(playerId) {
    const redCount = this.teams.red.players.size;
    const blueCount = this.teams.blue.players.size;

    const team = redCount <= blueCount ? 'red' : 'blue';
    this.teams[team].players.add(playerId);

    return team;
  }

  /**
   * Start the match
   */
  startMatch() {
    this.matchState = 'active';
    this.startTime = Date.now();

    return {
      state: 'active',
      redTeam: Array.from(this.teams.red.players),
      blueTeam: Array.from(this.teams.blue.players)
    };
  }

  /**
   * Create a capture zone
   */
  createCaptureZone(zoneId, x, y, radius, teamId) {
    this.captureZones.set(zoneId, { x, y, radius, teamId });
  }

  /**
   * Spawn a flag in its home base
   */
  spawnFlag(flagId, teamId) {
    const team = this.teams[teamId];
    const flag = {
      id: flagId,
      teamId: teamId,
      x: team.homeBaseX,
      y: team.homeBaseY,
      state: 'at_base', // at_base, carried, captured
      carrierId: null,
      lastDropped: Date.now()
    };

    this.flags.set(flagId, flag);
    return flag;
  }

  /**
   * Player picks up a flag
   */
  pickupFlag(playerId, flagId) {
    const flag = this.flags.get(flagId);
    if (!flag) return null;

    if (flag.state === 'carried') return null; // Already carried
    if (flag.state === 'captured') return null; // Already captured

    flag.state = 'carried';
    flag.carrierId = playerId;

    return {
      success: true,
      flagId: flagId,
      from: flag.state,
      to: 'carried'
    };
  }

  /**
   * Player drops a flag
   */
  dropFlag(flagId, x, y) {
    const flag = this.flags.get(flagId);
    if (!flag) return null;

    flag.state = 'at_base';
    flag.carrierId = null;
    flag.x = x;
    flag.y = y;
    flag.lastDropped = Date.now();

    return flag;
  }

  /**
   * Check if flag should return to base (dropped too long)
   */
  checkFlagReturn(flagId, returnTime = 30000) {
    const flag = this.flags.get(flagId);
    if (!flag || flag.state !== 'at_base') return null;

    const elapsed = Date.now() - flag.lastDropped;
    if (elapsed > returnTime) {
      // Return flag to base
      const team = this.teams[flag.teamId];
      flag.x = team.homeBaseX;
      flag.y = team.homeBaseY;
      flag.lastDropped = Date.now();

      return { flagId: flagId, action: 'returned_to_base' };
    }

    return null;
  }

  /**
   * Check if flag is in a capture zone and score points
   */
  checkFlagCapture(flagId) {
    const flag = this.flags.get(flagId);
    if (!flag || flag.state !== 'carried') return null;

    // Find capture zone with flag's position
    for (const [zoneId, zone] of this.captureZones) {
      const dx = flag.x - zone.x;
      const dy = flag.y - zone.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= zone.radius) {
        // Check if flag belongs to the capturing team
        if (flag.teamId === zone.teamId) continue; // Can't capture own flag

        // CAPTURE! Score points
        const capturingTeam = this.getTeamThatHasFlag(flagId);
        if (capturingTeam) {
          this.teams[capturingTeam].score++;
          flag.state = 'captured';

          const outcome = {
            success: true,
            capturedBy: capturingTeam,
            flag: flag.teamId,
            newScore: this.teams[capturingTeam].score,
            zoneId: zoneId
          };

          // Check for win
          if (this.teams[capturingTeam].score >= this.scoreToWin) {
            this.endMatch(capturingTeam);
          }

          return outcome;
        }
      }
    }

    return null;
  }

  /**
   * Get team that currently has a flag
   */
  getTeamThatHasFlag(flagId) {
    // Find which team has this player who carries the flag
    const flag = this.flags.get(flagId);
    if (!flag || flag.state !== 'carried') return null;

    // Search teams for the carrier
    for (const teamId of ['red', 'blue']) {
      if (this.teams[teamId].players.has(flag.carrierId)) {
        return teamId;
      }
    }

    return null;
  }

  /**
   * Get team score
   */
  getTeamScore(teamId) {
    return this.teams[teamId]?.score || 0;
  }

  /**
   * End the match
   */
  endMatch(winningTeamId) {
    this.matchState = 'ended';
    this.endTime = Date.now();
    const duration = this.endTime - this.startTime;

    return {
      winner: winningTeamId,
      finalScores: {
        red: this.teams.red.score,
        blue: this.teams.blue.score
      },
      duration: duration,
      winningPlayers: Array.from(this.teams[winningTeamId].players)
    };
  }

  /**
   * Get match overview
   */
  getMatchOverview() {
    return {
      mode: 'teamflags',
      state: this.matchState,
      redTeam: {
        players: Array.from(this.teams.red.players),
        score: this.teams.red.score,
        baseX: this.teams.red.homeBaseX,
        baseY: this.teams.red.homeBaseY
      },
      blueTeam: {
        players: Array.from(this.teams.blue.players),
        score: this.teams.blue.score,
        baseX: this.teams.blue.homeBaseX,
        baseY: this.teams.blue.homeBaseY
      },
      flags: Array.from(this.flags.entries()).map(([id, flag]) => ({
        id,
        teamId: flag.teamId,
        state: flag.state,
        x: flag.x,
        y: flag.y,
        carrier: flag.carrierId
      })),
      scoreToWin: this.scoreToWin
    };
  }

  /**
   * Export game mode data
   */
  exportData() {
    return {
      matchId: this.matchId,
      matchState: this.matchState,
      teams: {
        red: {
          players: Array.from(this.teams.red.players),
          score: this.teams.red.score
        },
        blue: {
          players: Array.from(this.teams.blue.players),
          score: this.teams.blue.score
        }
      },
      flags: Array.from(this.flags.entries()).map(([id, flag]) => ({
        id,
        ...flag
      }))
    };
  }

  /**
   * Clear mode data
   */
  clear() {
    this.isActive = false;
    this.teams.red.players.clear();
    this.teams.blue.players.clear();
    this.flags.clear();
    this.captureZones.clear();
  }
}
