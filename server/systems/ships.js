// server/systems/ships.js
// Ship class definitions and mechanics

export const SHIP_TYPES = {
  SLOOP: {
    id: 'sloop',
    name: 'Sloop',
    level: 1,
    baseHP: 150,
    baseCannons: 1,
    baseSpeed: 45,
    crewCapacity: 2,
    description: 'Fast solo ship. Best for learning.',
    unlockCost: 0 // Starting ship
  },
  FRIGATE: {
    id: 'frigate',
    name: 'Frigate',
    level: 9,
    baseHP: 250,
    baseCannons: 2,
    baseSpeed: 35,
    crewCapacity: 3,
    description: 'Balanced ship. Good all-around.',
    unlockCost: 500 // 500 XP to unlock
  },
  WARSHIP: {
    id: 'warship',
    name: 'Warship',
    level: 30,
    baseHP: 400,
    baseCannons: 4,
    baseSpeed: 25,
    crewCapacity: 5,
    description: 'Heavy firepower but slow.',
    unlockCost: 1500 // 1500 XP to unlock
  },
  GALLEON: {
    id: 'galleon',
    name: 'Galleon',
    level: 50,
    baseHP: 600,
    baseCannons: 6,
    baseSpeed: 30,
    crewCapacity: 6,
    description: 'Legendary ship. Maximum power.',
    unlockCost: 3000 // 3000 XP to unlock
  }
};

class Ship {
  constructor(shipType, playerId, playerName, upgrades = {}) {
    this.id = `ship_${playerId}_${Date.now()}`;
    this.playerId = playerId;
    this.playerName = playerName;
    this.type = shipType;
    
    // Base stats from ship type
    this.baseHP = shipType.baseHP;
    this.baseCannons = shipType.baseCannons;
    this.baseSpeed = shipType.baseSpeed;
    
    // Upgrades
    this.upgrades = {
      hullLevel: upgrades.hull || 0,
      cannonLevel: upgrades.cannons || 0,
      speedLevel: upgrades.speed || 0,
      accelerationLevel: upgrades.acceleration || 0,
      crewLevel: upgrades.crew || 0
    };

    // Current state
    this.currentHP = this.maxHP;
    this.position = { x: 0, y: 0, z: 0 };
    this.rotation = { x: 0, y: 0, z: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.throttle = 0;
    this.sails = { angle: 0, deployed: true };
    
    // Crew
    this.crew = [];
    this.helmed = false;
    
    // Combat
    this.ammoType = 'normal';
    this.cannonCooldown = {};
    
    // Status
    this.isSinking = false;
    this.createdAt = Date.now();
  }

  // =================== STATS CALCULATION ===================

  get maxHP() {
    return this.baseHP + (this.upgrades.hullLevel * 20);
  }

  get cannonDamage() {
    return 10 + (this.upgrades.cannonLevel * 1.5); // Base 10, +1.5 per level
  }

  get maxSpeed() {
    return this.baseSpeed + (this.upgrades.speedLevel * 0.5); // +0.5 per level
  }

  get acceleration() {
    return 5 + (this.upgrades.accelerationLevel * 0.2); // Base 5, +0.2 per level
  }

  get cannonCount() {
    return this.baseCannons;
  }

  get crewCapacity() {
    return this.type.crewCapacity + this.upgrades.crewLevel;
  }

  // =================== POSITIONING ===================

  updatePosition(deltaTime) {
    // Apply throttle
    const currentSpeed = this.maxSpeed * (this.throttle / 100);
    
    // Apply velocity based on rotation
    const radians = this.rotation.y;
    this.velocity.x = Math.sin(radians) * currentSpeed;
    this.velocity.z = Math.cos(radians) * currentSpeed;
    
    // Update position
    this.position.x += this.velocity.x * deltaTime;
    this.position.z += this.velocity.z * deltaTime;
    
    // Clamp to map boundaries
    const MAP_SIZE = 4000;
    this.position.x = Math.max(-MAP_SIZE, Math.min(MAP_SIZE, this.position.x));
    this.position.z = Math.max(-MAP_SIZE, Math.min(MAP_SIZE, this.position.z));
  }

  steerShip(steerInput, deltaTime) {
    const turnSpeed = 3 * deltaTime; // Radians per second
    this.rotation.y += steerInput * turnSpeed;
  }

  // =================== COMBAT ===================

  fireCannonAt(targetPosition, cannonIndex) {
    // Check cooldown
    if (this.cannonCooldown[cannonIndex] && this.cannonCooldown[cannonIndex] > Date.now()) {
      return null; // Cannon still cooling down
    }

    const cannonDamage = this.getCannonballDamage(this.ammoType);
    
    // Calculate projectile
    const projectile = {
      id: `proj_${this.id}_${cannonIndex}_${Date.now()}`,
      shipId: this.id,
      cannonIndex: cannonIndex,
      type: this.ammoType,
      damage: cannonDamage,
      position: { ...this.position },
      targetPosition: targetPosition,
      speed: this.getCannonballSpeed(this.ammoType),
      maxDistance: this.getCannonballRange(this.ammoType),
      distanceTraveled: 0,
      createdAt: Date.now()
    };

    // Set cooldown
    this.cannonCooldown[cannonIndex] = Date.now() + 1000; // 1 second cooldown

    return projectile;
  }

  getCannonballDamage(ammoType) {
    const baseDamages = {
      normal: 10,
      light: 4,
      heavy: 22,
      grapeshot: 20,
      sniper: 19,
      chain: 15
    };
    return (baseDamages[ammoType] || 10) * (1 + this.upgrades.cannonLevel * 0.15);
  }

  getCannonballSpeed(ammoType) {
    const speeds = {
      normal: 100,
      light: 150,
      heavy: 50,
      grapeshot: 75,
      sniper: 200,
      chain: 80
    };
    return speeds[ammoType] || 100;
  }

  getCannonballRange(ammoType) {
    const ranges = {
      normal: 1000,
      light: 800,
      heavy: 900,
      grapeshot: 600,
      sniper: 2000,
      chain: 1100
    };
    return ranges[ammoType] || 1000;
  }

  takeDamage(damage) {
    this.currentHP -= damage;
    if (this.currentHP <= 0) {
      this.currentHP = 0;
      this.isSinking = true;
    }
    return this.currentHP;
  }

  repair(amount) {
    this.currentHP = Math.min(this.currentHP + amount, this.maxHP);
  }

  switchAmmo(direction) {
    const ammoTypes = ['normal', 'light', 'heavy', 'grapeshot', 'sniper', 'chain'];
    const currentIndex = ammoTypes.indexOf(this.ammoType);
    
    if (direction === 'next') {
      this.ammoType = ammoTypes[(currentIndex + 1) % ammoTypes.length];
    } else if (direction === 'prev') {
      this.ammoType = ammoTypes[(currentIndex - 1 + ammoTypes.length) % ammoTypes.length];
    }
    
    return this.ammoType;
  }

  // =================== CREW ===================

  addCrew(sailor) {
    if (this.crew.length < this.crewCapacity) {
      this.crew.push(sailor);
      return true;
    }
    return false;
  }

  removeCrew(sailorId) {
    this.crew = this.crew.filter(s => s.id !== sailorId);
  }

  // =================== SERIALIZATION ===================

  toJSON() {
    return {
      id: this.id,
      playerId: this.playerId,
      playerName: this.playerName,
      type: this.type.name,
      stats: {
        hp: this.currentHP,
        maxHP: this.maxHP,
        damage: this.cannonDamage,
        speed: this.maxSpeed,
        cannons: this.cannonCount
      },
      position: this.position,
      rotation: this.rotation,
      crew: this.crew.length,
      crewCapacity: this.crewCapacity,
      isSinking: this.isSinking
    };
  }
}

export { Ship };
