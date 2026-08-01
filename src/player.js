import * as THREE from 'three';
import { CFG } from './config.js';

export class Player {
  constructor(camera) {
    this.camera = camera;
    this.position = new THREE.Vector3(0, CFG.player.height, 7);
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.hp = CFG.player.maxHp;
    this.onGround = true;
    this.invuln = 0;
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.updateCamera();
  }
  reset(pos = new THREE.Vector3(0, CFG.player.height, 8)) {
    this.position.copy(pos);
    this.velocity.set(0, 0, 0);
    this.yaw = 0; this.pitch = 0; this.hp = CFG.player.maxHp; this.invuln = 0;
    this.updateCamera();
  }
  look(dx, dy, speed) {
    this.yaw -= dx * speed;
    this.pitch = Math.max(-CFG.camera.pitchLimit, Math.min(CFG.camera.pitchLimit, this.pitch - dy * speed));
  }
  damage(amount) {
    if (this.invuln > 0) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invuln = 0.45;
    return true;
  }
  jump() {
    if (!this.onGround) return false;
    this.velocity.y = CFG.player.jump;
    this.onGround = false;
    return true;
  }
  update(dt, input, level, effects) {
    this.invuln = Math.max(0, this.invuln - dt);
    // Camera with rotation.y = yaw looks along (-sin yaw, 0, -cos yaw);
    // movement forward must match the camera look direction.
    this.forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    this.right.set(-this.forward.z, 0, this.forward.x);
    const wish = new THREE.Vector3()
      .addScaledVector(this.forward, input.move.y)
      .addScaledVector(this.right, input.move.x);
    if (wish.lengthSq() > 1) wish.normalize();
    this.position.addScaledVector(wish, CFG.player.speed * dt);
    this.velocity.y -= CFG.player.gravity * dt;
    this.position.y += this.velocity.y * dt;
    if (this.position.y < CFG.player.height) {
      this.position.y = CFG.player.height;
      this.velocity.y = 0;
      this.onGround = true;
    }
    const half = level.size / 2 - CFG.boundsPad;
    this.position.x = Math.max(-half, Math.min(half, this.position.x));
    this.position.z = Math.max(-half, Math.min(half, this.position.z));
    for (const o of level.colliders) pushCircleBox(this.position, CFG.player.radius, o);
    for (const h of level.hazards) {
      if (Math.abs(this.position.x - h.mesh.position.x) < h.w * 0.5 + CFG.player.radius && Math.abs(this.position.z - h.mesh.position.z) < h.d * 0.5 + CFG.player.radius) {
        if (this.damage(12)) effects.flashDamage(0.5);
      }
    }
    this.updateCamera(effects?.cameraOffset?.());
  }
  updateCamera(offset) {
    this.camera.position.copy(this.position).add(offset || new THREE.Vector3());
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }
}

export function pushCircleBox(pos, radius, box) {
  const minX = box.mesh.position.x - box.w / 2, maxX = box.mesh.position.x + box.w / 2;
  const minZ = box.mesh.position.z - box.d / 2, maxZ = box.mesh.position.z + box.d / 2;
  const cx = Math.max(minX, Math.min(maxX, pos.x));
  const cz = Math.max(minZ, Math.min(maxZ, pos.z));
  const dx = pos.x - cx, dz = pos.z - cz;
  const dsq = dx * dx + dz * dz;
  if (dsq > radius * radius || dsq === 0) return;
  const dist = Math.sqrt(dsq);
  const push = radius - dist;
  pos.x += (dx / dist) * push;
  pos.z += (dz / dist) * push;
}
