// src/systems/interaction.js
// Ship station interaction system for first-person gameplay

import * as THREE from 'three';

export class ShipStation {
  constructor(name, position, type = 'generic') {
    this.name = name;
    this.position = new THREE.Vector3(...position);
    this.type = type; // 'helm', 'cannon', 'sail', 'lookout'
    this.radius = 3; // Interaction radius
    this.isOccupied = false;
    this.occupiedBy = null;
    this.visualIndicator = this.createIndicator();
  }

  createIndicator() {
    const geometry = new THREE.CylinderGeometry(this.radius, this.radius, 0.1, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.2
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(this.position);
    mesh.position.y = 0.05;
    return mesh;
  }

  canInteract(sailor) {
    const distance = sailor.position.distanceTo(this.position);
    return distance < this.radius && !this.isOccupied;
  }

  occupy(sailor) {
    this.isOccupied = true;
    this.occupiedBy = sailor;
    sailor.setStation(this);
  }

  release(sailor) {
    if (this.occupiedBy === sailor) {
      this.isOccupied = false;
      this.occupiedBy = null;
      sailor.setStation(null);
    }
  }

  update() {
    // Update visual indicator opacity based on occupation
    if (this.isOccupied) {
      this.visualIndicator.material.opacity = 0.5;
      this.visualIndicator.material.color.setHex(0xff6600);
    } else {
      this.visualIndicator.material.opacity = 0.2;
      this.visualIndicator.material.color.setHex(0x00ff88);
    }
  }

  dispose() {
    this.visualIndicator.geometry.dispose();
    this.visualIndicator.material.dispose();
  }
}

export class InteractionSystem {
  constructor(scene) {
    this.scene = scene;
    this.stations = new Map();
    this.sailors = new Map();
    this.activeInteractions = new Map();
  }

  addStation(name, position, type = 'generic') {
    const station = new ShipStation(name, position, type);
    this.stations.set(name, station);
    this.scene.add(station.visualIndicator);
    return station;
  }

  removeStation(name) {
    const station = this.stations.get(name);
    if (station) {
      station.dispose();
      this.scene.remove(station.visualIndicator);
      this.stations.delete(name);
    }
  }

  registerSailor(sailor) {
    this.sailors.set(sailor.playerId, sailor);
  }

  unregisterSailor(playerId) {
    // Release from any occupied station
    const sailor = this.sailors.get(playerId);
    if (sailor && sailor.currentStation) {
      sailor.currentStation.release(sailor);
    }
    this.sailors.delete(playerId);
  }

  getNearestStation(sailor, maxDistance = 5) {
    let nearest = null;
    let nearestDist = maxDistance;

    for (const [, station] of this.stations) {
      const dist = sailor.position.distanceTo(station.position);
      if (dist < nearestDist && station.canInteract(sailor)) {
        nearest = station;
        nearestDist = dist;
      }
    }

    return nearest;
  }

  tryInteract(sailor, stationType = null) {
    if (!sailor.interact()) return false; // On cooldown

    const station = stationType
      ? this.stations.get(stationType)
      : this.getNearestStation(sailor);

    if (!station) return false;

    // Release from current station
    if (sailor.currentStation) {
      sailor.currentStation.release(sailor);
    }

    // Occupy new station
    station.occupy(sailor);
    this.activeInteractions.set(sailor.playerId, {
      station,
      startTime: Date.now(),
      callback: null
    });

    return true;
  }

  stopInteraction(sailor) {
    if (sailor.currentStation) {
      sailor.currentStation.release(sailor);
      this.activeInteractions.delete(sailor.playerId);
    }
  }

  getStationAtPosition(position, radius = 1) {
    for (const [, station] of this.stations) {
      if (position.distanceTo(station.position) < radius) {
        return station;
      }
    }
    return null;
  }

  update(delta) {
    // Update all stations
    for (const [, station] of this.stations) {
      station.update();
    }

    // Clean up completed interactions
    for (const [playerId, interaction] of this.activeInteractions) {
      if (interaction.disableTime && Date.now() > interaction.disableTime) {
        this.activeInteractions.delete(playerId);
      }
    }
  }

  dispose() {
    for (const [, station] of this.stations) {
      station.dispose();
    }
    this.stations.clear();
    this.activeInteractions.clear();
  }
}

export default InteractionSystem;
