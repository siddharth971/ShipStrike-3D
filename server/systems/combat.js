// server/systems/combat.js
// Combat mechanics - projectiles, damage, special effects

export const AMMO_TYPES = {
  NORMAL: {
    id: 'normal',
    name: 'Normal Shot',
    damageMultiplier: 1.0,
    speed: 100,
    range: 1000,
    aoe: 0,
    cost: 1,
    description: 'Standard cannonball. Balanced damage and range.'
  },
  LIGHT: {
    id: 'light',
    name: 'Light Shot',
    damageMultiplier: 0.4,
    speed: 150,
    range: 800,
    aoe: 0,
    cost: 1,
    description: 'Fast but weak. Good for fishing.'
  },
  HEAVY: {
    id: 'heavy',
    name: 'Heavy Shot',
    damageMultiplier: 2.2,
    speed: 50,
    range: 900,
    aoe: 0,
    cost: 3,
    description: 'Slow and powerful. Maximum damage.'
  },
  GRAPESHOT: {
    id: 'grapeshot',
    name: 'Grapeshot',
    damageMultiplier: 2.0,
    speed: 75,
    range: 600,
    aoe: 150, // Area of effect radius
    cost: 2,
    description: 'Spreads on impact. Hits multiple targets.'
  },
  SNIPER: {
    id: 'sniper',
    name: 'Sniper Shot',
    damageMultiplier: 1.9,
    speed: 200,
    range: 2000,
    aoe: 0,
    cost: 3,
    description: 'Extreme range. Great for long battles.'
  },
  CHAIN: {
    id: 'chain',
    name: 'Chain Shot',
    damageMultiplier: 1.5,
    speed: 80,
    range: 1100,
    aoe: 0,
    cost: 2,
    description: 'Damages sails and rigging. Slows targets.'
  }
};

class Projectile {
  constructor(shipId, cannonIndex, ammoType, cannonDamage, targetPosition, fromPosition) {
    const ammo = AMMO_TYPES[ammoType] || AMMO_TYPES.NORMAL;
    
    this.id = `proj_${shipId}_${cannonIndex}_${Date.now()}`;
    this.shipId = shipId;
    this.cannonIndex = cannonIndex;
    this.ammoType = ammoType;
    this.damage = cannonDamage * ammo.damageMultiplier;
    this.speed = ammo.speed;
    this.range = ammo.range;
    this.aoe = ammo.aoe;
    
    this.position = { ...fromPosition };
    this.targetPosition = { ...targetPosition };
    this.velocity = this.calculateVelocity();
    
    this.distanceTraveled = 0;
    this.active = true;
    this.createdAt = Date.now();
    this.hitTargets = new Set();
  }

  calculateVelocity() {
    const dx = this.targetPosition.x - this.position.x;
    const dz = this.targetPosition.z - this.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance === 0) return { x: 0, y: 0, z: 0 };
    
    return {
      x: (dx / distance) * this.speed,
      y: 0, // No vertical for now
      z: (dz / distance) * this.speed
    };
  }

  update(deltaTime) {
    // Move projectile
    this.position.x += this.velocity.x * deltaTime;
    this.position.z += this.velocity.z * deltaTime;
    
    // Calculate distance traveled
    const dx = this.position.x - this.targetPosition.x;
    const dz = this.position.z - this.targetPosition.z;
    this.distanceTraveled = Math.sqrt(dx * dx + dz * dz);
    
    // Check if out of range
    if (this.distanceTraveled > this.range) {
      this.active = false;
    }
    
    return this.active;
  }

  getHitRadius() {
    return this.aoe || 50; // Default hit radius if no AOE
  }

  isNearTarget(position, hitRadius) {
    const dx = this.position.x - position.x;
    const dz = this.position.z - position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    return distance <= hitRadius;
  }

  toJSON() {
    return {
      id: this.id,
      shipId: this.shipId,
      ammoType: this.ammoType,
      position: this.position,
      damage: Math.round(this.damage)
    };
  }
}

class CombatSystem {
  constructor() {
    this.projectiles = new Map();
    this.activeFirefights = new Map(); // shipId -> opponent shipIds
  }

  /**
   * Fire a cannon
   */
  fireCannonAt(ship, targetPosition) {
    const projectile = ship.fireCannonAt(targetPosition, 0);
    if (!projectile) return null;

    const proj = new Projectile(
      ship.id,
      0,
      ship.ammoType,
      ship.cannonDamage,
      targetPosition,
      ship.position
    );

    this.projectiles.set(proj.id, proj);
    return proj;
  }

  /**
   * Update all projectiles
   */
  updateProjectiles(deltaTime) {
    const deactivated = [];

    for (const [projId, projectile] of this.projectiles) {
      if (!projectile.update(deltaTime)) {
        deactivated.push(projId);
      }
    }

    deactivated.forEach(id => this.projectiles.delete(id));
  }

  /**
   * Check projectile hits against ship
   */
  checkHits(ship) {
    const hits = [];

    for (const projectile of this.projectiles.values()) {
      if (projectile.shipId === ship.id) continue; // Can't hit self
      if (projectile.hitTargets.has(ship.id)) continue; // Already hit this target

      const hitRadius = projectile.getHitRadius();
      if (projectile.isNearTarget(ship.position, hitRadius)) {
        hits.push({
          projectileId: projectile.id,
          damage: projectile.damage,
          ammoType: projectile.ammoType,
          attackerShipId: projectile.shipId
        });

        projectile.hitTargets.add(ship.id);

        // Apply special effects
        if (projectile.ammoType === 'chain') {
          // Chain shot slows ship
          ship.throttle *= 0.7; // 30% slow
        } else if (projectile.ammoType === 'grapeshot') {
          // Grapeshot damages crew
          if (ship.crew.length > 0) {
            const crewLosses = Math.ceil(ship.crew.length * 0.2);
            for (let i = 0; i < crewLosses; i++) {
              ship.removeCrew(ship.crew[0]?.id);
            }
          }
        }

        projectile.active = false;
        this.projectiles.delete(projectile.id);
      }
    }

    return hits;
  }

  /**
   * Record a combat engagement
   */
  engageInCombat(shipId1, shipId2) {
    if (!this.activeFirefights.has(shipId1)) {
      this.activeFirefights.set(shipId1, new Set());
    }
    this.activeFirefights.get(shipId1).add(shipId2);

    if (!this.activeFirefights.has(shipId2)) {
      this.activeFirefights.set(shipId2, new Set());
    }
    this.activeFirefights.get(shipId2).add(shipId1);
  }

  /**
   * End combat engagement
   */
  disengageCombat(shipId1, shipId2) {
    if (this.activeFirefights.has(shipId1)) {
      this.activeFirefights.get(shipId1).delete(shipId2);
    }
    if (this.activeFirefights.has(shipId2)) {
      this.activeFirefights.get(shipId2).delete(shipId1);
    }
  }

  /**
   * Get projectiles near a position (for rendering)
   */
  getProjectilesNearby(position, radius = 2000) {
    return Array.from(this.projectiles.values()).filter(proj => {
      const dx = proj.position.x - position.x;
      const dz = proj.position.z - position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      return distance <= radius;
    });
  }

  /**
   * Clear all projectiles (for testing)
   */
  clear() {
    this.projectiles.clear();
    this.activeFirefights.clear();
  }
}

export { CombatSystem, Projectile };
