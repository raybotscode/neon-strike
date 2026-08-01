import * as THREE from 'three';
import { CFG } from './config.js';

const weaponOrder = ['blaster', 'smg', 'plasma'];

export class Weapons {
  constructor(scene) {
    this.scene = scene;
    this.index = 0;
    this.owned = [true, false, false];
    this.cooldown = 0;
    this.projectiles = [];
    this.geo = new THREE.SphereGeometry(1, 12, 8);
    this.mats = {};
    for (const [k, w] of Object.entries(CFG.weapons)) {
      this.mats[k] = new THREE.MeshBasicMaterial({ color: w.color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending });
    }
  }
  reset() {
    for (const p of this.projectiles) this.scene.remove(p.mesh, p.light);
    this.projectiles.length = 0;
    this.index = 0;
    this.owned = [true, false, false];
    this.cooldown = 0;
  }
  get activeKey() { return weaponOrder[this.index]; }
  switchTo(i) { if (this.owned[i]) this.index = i; }
  give(key) {
    const i = weaponOrder.indexOf(key);
    if (i >= 0) this.owned[i] = true;
    this.index = Math.max(0, i);
  }
  fire(player, effects, audio) {
    const key = this.activeKey, w = CFG.weapons[key];
    if (this.cooldown > 0) return false;
    this.cooldown = w.fireRate;
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(player.camera.quaternion).normalize();
    const pos = player.camera.position.clone().addScaledVector(dir, 0.8).add(new THREE.Vector3(0, -0.08, 0));
    const mesh = new THREE.Mesh(this.geo, this.mats[key]);
    mesh.scale.setScalar(w.radius);
    mesh.position.copy(pos);
    const light = new THREE.PointLight(w.color, 1.8, 5);
    light.position.copy(pos);
    this.scene.add(mesh, light);
    this.projectiles.push({ mesh, light, key, dir, speed: w.speed, damage: w.damage, life: w.life, radius: w.radius, aoe: w.aoe || 0, fromEnemy: false });
    effects.addShake(w.shake);
    if (key === 'smg') audio.smg(); else if (key === 'plasma') audio.plasma(); else audio.pew();
    return true;
  }
  enemyShot(pos, dir, color = 0xff405f, speed = 16, damage = 12, radius = 0.11, life = 2) {
    const mat = new THREE.MeshBasicMaterial({ color, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.9 });
    const mesh = new THREE.Mesh(this.geo, mat);
    mesh.scale.setScalar(radius);
    mesh.position.copy(pos);
    const light = new THREE.PointLight(color, 1.2, 4);
    light.position.copy(pos);
    this.scene.add(mesh, light);
    this.projectiles.push({ mesh, light, key: 'enemy', dir: dir.clone(), speed, damage, life, radius, aoe: 0, fromEnemy: true });
  }
  update(dt, level, enemies, player, particles, effects, audio) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      const prev = p.mesh.position.clone();
      p.mesh.position.addScaledVector(p.dir, p.speed * dt);
      p.light.position.copy(p.mesh.position);
      particles.trail(p.mesh.position, p.mesh.material.color.getHex());
      let remove = p.life <= 0 || Math.abs(p.mesh.position.x) > level.size / 2 || Math.abs(p.mesh.position.z) > level.size / 2;
      if (!remove && hitObstacle(p.mesh.position, level.colliders, p.radius)) remove = true;
      if (!remove && p.fromEnemy) {
        if (p.mesh.position.distanceTo(player.position) < 0.6) {
          if (player.damage(p.damage)) { effects.flashDamage(0.6); effects.addShake(0.22); audio.hurt(); }
          remove = true;
        }
      }
      if (!remove && !p.fromEnemy) {
        for (const e of enemies.list) {
          const horiz = Math.hypot(p.mesh.position.x - e.mesh.position.x, p.mesh.position.z - e.mesh.position.z);
          const vert = Math.abs(p.mesh.position.y - e.mesh.position.y);
          if (!e.dead && horiz < e.radius + p.radius + 0.1 && vert < e.radius + 0.5) {
            enemies.damage(e, p.damage, p.key, p.mesh.position, particles, effects, audio);
            if (p.aoe) {
              particles.emit(p.mesh.position, CFG.weapons.plasma.color, 44, 9, 0.28);
              effects.addShake(0.35);
              audio.explode();
              for (const other of enemies.list) if (!other.dead && other !== e && other.mesh.position.distanceTo(p.mesh.position) < p.aoe) enemies.damage(other, p.damage * 0.6, p.key, p.mesh.position, particles, effects, audio);
            }
            remove = true;
            break;
          }
        }
      }
      if (remove) {
        if (!p.fromEnemy) particles.emit(p.mesh.position, p.mesh.material.color.getHex(), p.key === 'plasma' ? 20 : 8, p.key === 'plasma' ? 6 : 3, 0.12);
        this.scene.remove(p.mesh, p.light);
        p.mesh.geometry = this.geo;
        this.projectiles.splice(i, 1);
      }
      prev.set(0, 0, 0);
    }
  }
}

function hitObstacle(pos, boxes, r) {
  for (const b of boxes) {
    if (Math.abs(pos.x - b.mesh.position.x) < b.w / 2 + r && Math.abs(pos.z - b.mesh.position.z) < b.d / 2 + r && pos.y < b.h + 0.6) return true;
  }
  return false;
}
