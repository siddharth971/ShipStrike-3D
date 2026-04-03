// src/entities/sails.js
// Sail system for wind-powered ship propulsion

import * as THREE from 'three';

export class Sail {
  constructor(name, position, width = 10, height = 15) {
    this.name = name; // 'Main', 'Jib', 'Mizzen'
    this.position = new THREE.Vector3(...position);
    this.width = width;
    this.height = height;
    this.angle = 0; // 0-180 degrees, where 90 is perpendicular to mast

    this.health = 100;
    this.maxHealth = 100;
    this.isRipped = false;
    this.deployed = true;

    this.mesh = this.createMesh();
  }

  createMesh() {
    const geometry = new THREE.BufferGeometry();

    // Sail vertices (quad)
    const vertices = new Float32Array([
      0, 0, 0,           // bottom-left (mast)
      this.width, 0, 0,  // bottom-right
      this.width, this.height, 0, // top-right
      0, this.height, 0  // top-left (mast)
    ]);

    const indices = new Uint32Array([0, 1, 2, 0, 2, 3]);

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0xccddff,
      side: THREE.DoubleSide,
      wireframe: false,
      metalness: 0.1,
      roughness: 0.8
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(this.position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  updateAngle(newAngle) {
    this.angle = THREE.MathUtils.clamp(newAngle, 0, 180);
    // Update mesh rotation to show sail angle
    this.mesh.rotation.z = (this.angle / 180) * Math.PI;
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    
    if (this.health === 0 && !this.isRipped) {
      this.isRipped = true;
      this.mesh.material.color.setHex(0x994433); // Darkened/damaged color
    }

    // Update material color based on health
    const healthPercent = this.health / this.maxHealth;
    const hue = healthPercent * 0.6; // Green to red gradient
    this.mesh.material.color.setHSL(hue, 0.8, 0.6);
  }

  repair(amount) {
    const oldHealth = this.health;
    this.health = Math.min(this.maxHealth, this.health + amount);
    
    if (oldHealth === 0 && this.health > 0) {
      this.isRipped = false;
    }

    const healthPercent = this.health / this.maxHealth;
    const hue = healthPercent * 0.6;
    this.mesh.material.color.setHSL(hue, 0.8, 0.6);
  }

  setDeployed(deployed) {
    this.deployed = deployed;
    this.mesh.visible = deployed;
  }

  getEfficiency() {
    if (!this.deployed || this.isRipped) return 0;
    return (this.health / this.maxHealth) * (Math.sin(this.angle * Math.PI / 180));
  }

  getEfficiencyPercent() {
    return Math.round(this.getEfficiency() * 100);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

export class SailSystem {
  constructor(sailConfig = null) {
    this.sails = new Map();
    this.totalThrust = 0;
    this.maxThrust = 1;

    // Default sail configuration for a clipper
    const config = sailConfig || {
      main: { position: [0, 10, 0], width: 12, height: 20 },
      jib: { position: [-8, 12, 0], width: 8, height: 18 },
      mizzen: { position: [8, 8, 0], width: 8, height: 15 }
    };

    this.createSails(config);
  }

  createSails(config) {
    for (const [name, props] of Object.entries(config)) {
      const sail = new Sail(
        name.charAt(0).toUpperCase() + name.slice(1),
        props.position,
        props.width,
        props.height
      );
      this.sails.set(name, sail);
    }
  }

  getSail(name) {
    return this.sails.get(name.toLowerCase());
  }

  setSailAngle(sailName, angle) {
    const sail = this.getSail(sailName);
    if (sail) {
      sail.updateAngle(angle);
      this.updateTotalThrust();
    }
  }

  deployAllSails() {
    for (const [, sail] of this.sails) {
      sail.setDeployed(true);
    }
    this.updateTotalThrust();
  }

  retractAllSails() {
    for (const [, sail] of this.sails) {
      sail.setDeployed(false);
    }
    this.updateTotalThrust();
  }

  deploySail(sailName) {
    const sail = this.getSail(sailName);
    if (sail) {
      sail.setDeployed(true);
      this.updateTotalThrust();
    }
  }

  retractSail(sailName) {
    const sail = this.getSail(sailName);
    if (sail) {
      sail.setDeployed(false);
      this.updateTotalThrust();
    }
  }

  updateTotalThrust() {
    this.totalThrust = 0;
    let sailCount = 0;

    for (const [, sail] of this.sails) {
      if (sail.deployed) {
        this.totalThrust += sail.getEfficiency();
        sailCount++;
      }
    }

    if (sailCount > 0) {
      this.totalThrust /= sailCount; // Average efficiency
    }

    this.maxThrust = Math.max(0.3, this.totalThrust);
  }

  getTotalThrust() {
    return this.totalThrust;
  }

  getSailStatus() {
    const status = {};
    for (const [name, sail] of this.sails) {
      status[name] = {
        deployed: sail.deployed,
        angle: sail.angle,
        health: sail.health,
        efficiency: sail.getEfficiencyPercent(),
        ripped: sail.isRipped
      };
    }
    return status;
  }

  damageRandomSail(amount) {
    const sailArray = Array.from(this.sails.values());
    if (sailArray.length === 0) return null;

    const randomSail = sailArray[Math.floor(Math.random() * sailArray.length)];
    randomSail.takeDamage(amount);
    this.updateTotalThrust();
    return randomSail.name;
  }

  repairSail(sailName, amount) {
    const sail = this.getSail(sailName);
    if (sail) {
      sail.repair(amount);
      this.updateTotalThrust();
      return true;
    }
    return false;
  }

  addSailsToScene(scene) {
    for (const [, sail] of this.sails) {
      scene.add(sail.mesh);
    }
  }

  removeSailsFromScene(scene) {
    for (const [, sail] of this.sails) {
      scene.remove(sail.mesh);
    }
  }

  update(delta, windVector = null) {
    // Optional: Update sail mesh animations based on wind
    if (windVector) {
      for (const [, sail] of this.sails) {
        if (sail.deployed && !sail.isRipped) {
          // Could add wind-based sail fluttering here
          const windStrength = windVector.length();
          sail.mesh.material.emissiveIntensity = Math.min(0.3, windStrength * 0.05);
        }
      }
    }
  }

  dispose() {
    for (const [, sail] of this.sails) {
      sail.dispose();
    }
    this.sails.clear();
  }
}

export default SailSystem;
