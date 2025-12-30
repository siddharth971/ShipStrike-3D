// src/core/config.js
// ================== TUNABLE CONFIG ==================

export const WATER_SIZE = 5000;             // Increased water size for massive ship
export const SHIP_MODEL_SCALE = 24;         // 3x the previous 8, for a truly massive vessel
export const CAMERA_FOV = 65;               // Wider FOV for cinematic feel
export const TONE_EXPOSURE = 0.82;
export const BLOOM_STRENGTH = 0.28;

// Camera follow + mouse yaw settings (Third Person)
export const CAMERA_PITCH = 0.35;             
export const CAMERA_DISTANCE = 160;           // Scaled for massive ship
export const CAMERA_HEIGHT = 50;              
export const CAMERA_YAW_MAX = 0.4;            
export const CAMERA_LERP = 0.05;              // Slower smoothing for sense of scale

// Lock-on settings
export const LOCKON_KEY = 'l';                
export const LOCKON_SMOOTH = 0.1;           
export const LOCKON_MIN_DISTANCE = 40;        

// Sway (bobbing) and splash settings - deeper, slower for massive ship
export const SWAY = {
  baseAmplitude: 1.2,   
  baseFreq: 0.4,        // Much slower
  rollAmp: 0.08,        // Heavy vessels roll less easily
  pitchAmp: 0.05,       
  splashThresholdFactor: 0.4,
  splashCooldown: 0.4
};

// Gun / muzzle / shell settings
export const MUZZLE_FLASH_DURATION = 0.12;
export const MUZZLE_FLASH_SCALE = 1.0 * SHIP_MODEL_SCALE;
export const RECOIL_AMOUNT = 0.15 * SHIP_MODEL_SCALE;
export const RECOIL_DURATION = 0.25;
export const SHELL_EJECT_SPEED = 12.0;
export const CAMERA_SHAKE_INTENSITY = 0.15;
export const CAMERA_SHAKE_DURATION = 0.2;

// Gameplay config
export const CONFIG = {
  PLAYER_HEALTH: 50000,
  ENEMY_HEALTH: 5000,
  SHIP_RADIUS: 30,          // Large collision footprint
  PLAYER_COOLDOWN: 0.8,     // Slower firing for massive cannons
  ENEMY_SHOOT_RANGE: 1000,  // Long range combat
  ENEMY_COOLDOWN_MIN: 2.0,
  ENEMY_COOLDOWN_MAX: 5.0,
  BALL_RADIUS: 0.8,         // Massive cannonballs
  BALL_SPEED: 180,          
  BALL_DAMAGE: 200,
  ENEMY_TURN_SPEED: 0.8,    
  ENEMY_MOVE_SPEED: 25
};

// Player movement - heavyweight vessel physics
export const PLAYER_SPEED = 60;              
export const PLAYER_TURN = 0.8;              // Much slower turning (inertia)
