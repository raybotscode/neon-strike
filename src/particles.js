import * as THREE from 'three';
import { CFG } from './config.js';

export class ParticleSystem {
  constructor(scene) {
    this.geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(CFG.particles.count * 3);
    this.colors = new Float32Array(CFG.particles.count * 3);
    this.sizes = new Float32Array(CFG.particles.count);
    this.life = new Float32Array(CFG.particles.count);
    this.maxLife = new Float32Array(CFG.particles.count);
    this.vel = Array.from({ length: CFG.particles.count }, () => new THREE.Vector3());
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geo.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    this.mat = new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    this.points = new THREE.Points(this.geo, this.mat);
    scene.add(this.points);
    this.next = 0;
  }
  emit(pos, colorHex, count = 18, power = 6, size = 0.18) {
    const c = new THREE.Color(colorHex);
    for (let n = 0; n < count; n++) {
      const i = this.next++ % CFG.particles.count;
      this.positions[i * 3] = pos.x; this.positions[i * 3 + 1] = pos.y; this.positions[i * 3 + 2] = pos.z;
      this.colors[i * 3] = c.r; this.colors[i * 3 + 1] = c.g; this.colors[i * 3 + 2] = c.b;
      this.sizes[i] = size * (0.5 + Math.random());
      this.life[i] = this.maxLife[i] = 0.35 + Math.random() * 0.55;
      this.vel[i].set((Math.random() - 0.5) * power, Math.random() * power * 0.7, (Math.random() - 0.5) * power);
    }
  }
  trail(pos, colorHex) { this.emit(pos, colorHex, 2, 0.6, 0.08); }
  update(dt) {
    for (let i = 0; i < CFG.particles.count; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      this.vel[i].y -= 6 * dt;
      this.positions[i * 3] += this.vel[i].x * dt;
      this.positions[i * 3 + 1] += this.vel[i].y * dt;
      this.positions[i * 3 + 2] += this.vel[i].z * dt;
      this.sizes[i] *= 0.985;
      if (this.life[i] <= 0) this.positions[i * 3 + 1] = -99;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.size.needsUpdate = true;
  }
}
