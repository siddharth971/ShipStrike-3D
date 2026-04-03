// src/entities/sailor.js
// Player sailor character for first-person perspective

import * as THREE from 'three';

export class Sailor {
  constructor(playerId, username) {
    this.playerId = playerId;
    this.username = username;
    this.position = new THREE.Vector3(0, 1.6, 0); // Eye height
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
    this.speed = 5; // units per second
    this.sprintSpeed = 8;
    this.isSprinting = false;
    this.isGrounded = true;
    
    // Station interaction
    this.currentStation = null;
    this.isInteracting = false;
    this.interactionCooldown = 0;
    
    // Movement input
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    
    // Visual representation (for other players to see)
    this.mesh = this.createMesh();
    this.nametag = this.createNametag();
  }

  createMesh() {
    // Simple sailor model (can be replaced with 3D model)
    const group = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.CapsuleGeometry(0.3, 1.2, 8, 8);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x4488cc });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    body.position.y = 0.6;
    group.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const headMaterial = new THREE.MeshPhongMaterial({ color: 0xffdbac });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.castShadow = true;
    head.receiveShadow = true;
    head.position.y = 1.4;
    group.add(head);
    
    // Arms (simple)
    const armGeometry = new THREE.CapsuleGeometry(0.1, 0.8, 4, 4);
    const armMaterial = new THREE.MeshPhongMaterial({ color: 0xffdbac });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.castShadow = true;
    leftArm.position.set(-0.4, 1.0, 0);
    leftArm.rotation.z = 0.2;
    group.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.castShadow = true;
    rightArm.position.set(0.4, 1.0, 0);
    rightArm.rotation.z = -0.2;
    group.add(rightArm);
    
    // Legs (simple)
    const legGeometry = new THREE.CapsuleGeometry(0.1, 0.7, 4, 4);
    const legMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.castShadow = true;
    leftLeg.position.set(-0.2, 0.35, 0);
    group.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.castShadow = true;
    rightLeg.position.set(0.2, 0.35, 0);
    group.add(rightLeg);
    
    group.position.copy(this.position);
    return group;
  }

  createNametag() {
    // Create canvas texture for nametag
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.fillStyle = '#00ff88';
    context.font = 'bold 32px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(this.username, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const geometry = new THREE.PlaneGeometry(2, 0.5);
    const mesh = new THREE.Mesh(geometry, material);
    
    mesh.position.y = 2.0; // Above head
    this.mesh.add(mesh);
    
    return mesh;
  }

  update(delta, ship) {
    // Update position based on ship
    if (ship) {
      // Position sailor on ship deck
      const deckOffset = new THREE.Vector3(0, 1, -2); // Relative to ship center
      this.position.copy(ship.position).add(deckOffset);
      this.mesh.position.copy(this.position);
    }
    
    // Handle movement input
    const moveDirection = new THREE.Vector3();
    if (this.moveForward) moveDirection.z -= 1;
    if (this.moveBackward) moveDirection.z += 1;
    if (this.moveLeft) moveDirection.x -= 1;
    if (this.moveRight) moveDirection.x += 1;
    
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      const speed = this.isSprinting ? this.sprintSpeed : this.speed;
      this.velocity.copy(moveDirection).multiplyScalar(speed);
    } else {
      this.velocity.multiplyScalar(0.8); // Friction
    }
    
    // Apply movement (local to ship)
    if (ship) {
      const worldVel = this.velocity.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ship.rotation.z);
      this.position.add(worldVel.multiplyScalar(delta));
    }
    
    // Update interaction cooldown
    if (this.interactionCooldown > 0) {
      this.interactionCooldown -= delta;
    }
    
    // Update mesh
    this.mesh.position.lerp(this.position, 0.1);
  }

  setStation(station) {
    this.currentStation = station;
  }

  interact() {
    if (this.interactionCooldown > 0) return false;
    
    this.isInteracting = true;
    this.interactionCooldown = 0.5;
    return true;
  }

  stopInteracting() {
    this.isInteracting = false;
  }

  setMovement(forward, backward, left, right, sprinting) {
    this.moveForward = forward;
    this.moveBackward = backward;
    this.moveLeft = left;
    this.moveRight = right;
    this.isSprinting = sprinting;
  }

  dispose() {
    this.mesh.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}

export default Sailor;
