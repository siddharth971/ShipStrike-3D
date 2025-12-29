// src/core/config.js
// ================== TUNABLE CONFIG ==================

export const WATER_SIZE = 2000;
export const SHIP_MODEL_SCALE = 4;          // change model scale here
export const CAMERA_FOV = 55;
export const TONE_EXPOSURE = 0.82;
export const BLOOM_STRENGTH = 0.28;

// Camera follow + mouse yaw settings
export const CAMERA_PITCH = 0.35;             // radians down tilt (fixed)
export const CAMERA_DISTANCE = 30;            // distance behind ship
export const CAMERA_HEIGHT = 7;               // height above ship
export const CAMERA_YAW_MAX = 0;              // max yaw offset (radians) from mouse X [-1..1]*CAMERA_YAW_MAX
export const CAMERA_LERP = 0.12;              // smoothing toward desired camera pos

// Lock-on settings
export const LOCKON_KEY = 'l';                // toggle lock-on
export const LOCKON_SMOOTH = 0.14;            // how fast camera transitions when locked
export const LOCKON_MIN_DISTANCE = 8;         // min distance to consider enemy for lock

// Sway (bobbing) and splash settings
export const SWAY = {
  baseAmplitude: 0.35,  // Increased to match water waves
  baseFreq: 1.2,
  rollAmp: 0.08,        // More roll
  pitchAmp: 0.05,       // More pitch
  splashThresholdFactor: 0.5,
  splashCooldown: 0.25
};

// Gun / muzzle / shell settings
export const MUZZLE_FLASH_DURATION = 0.08;
export const MUZZLE_FLASH_SCALE = 1 * SHIP_MODEL_SCALE;
export const RECOIL_AMOUNT = 0.22 * SHIP_MODEL_SCALE;
export const RECOIL_DURATION = 0.12;
export const SHELL_EJECT_SPEED = 6.0;
export const CAMERA_SHAKE_INTENSITY = 0.06;
export const CAMERA_SHAKE_DURATION = 0.12;

// Gameplay config
export const CONFIG = {
  PLAYER_HEALTH: 12000,
  ENEMY_HEALTH: 900,
  SHIP_RADIUS: 5,
  PLAYER_COOLDOWN: 0.35,
  ENEMY_SHOOT_RANGE: 240,
  ENEMY_COOLDOWN_MIN: 1.0,
  ENEMY_COOLDOWN_MAX: 2.4,
  BALL_RADIUS: 0.18,
  BALL_SPEED: 80,
  BALL_DAMAGE: 30,
  ENEMY_TURN_SPEED: 2.2,
  ENEMY_MOVE_SPEED: 8
};

// Player movement
export const PLAYER_SPEED = 28;
export const PLAYER_TURN = 3.2;
