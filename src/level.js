import * as THREE from 'three';
import { CFG } from './config.js';

export class Level {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.colliders = [];
    this.hazards = [];
    this.pickups = [];
    this.size = 30;
    this.color = 0x36e9ff;
    this.spawnQueue = [];
  }
  build(index) {
    this.clear();
    const def = CFG.levels[index];
    this.def = def; this.size = def.size; this.color = def.color;
    const tex = makeGrid(def.color);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(def.size / 8, def.size / 8);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(def.size, def.size), new THREE.MeshBasicMaterial({ map: tex, color: 0xffffff }));
    floor.rotation.x = -Math.PI / 2;
    this.group.add(floor);
    const wallMat = new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending });
    for (const [x, z, w, d] of [[0, -def.size / 2, def.size, .25], [0, def.size / 2, def.size, .25], [-def.size / 2, 0, .25, def.size], [def.size / 2, 0, .25, def.size]]) this.addBox(x, z, w, d, 2.8, wallMat, false);
    const solidMat = new THREE.MeshStandardMaterial({ color: 0x11131f, emissive: def.color, emissiveIntensity: 0.25 });
    for (let i = 0; i < def.blocks; i++) this.addBox(rand(def.size), rand(def.size), 1.7 + Math.random() * 2.2, 1.7 + Math.random() * 2.2, 1.2 + Math.random() * 1.2, solidMat, false);
    for (let i = 0; i < def.crates; i++) this.addCrate(rand(def.size), rand(def.size));
    for (let i = 0; i < (def.hazards || 0); i++) this.addHazard(rand(def.size), rand(def.size), i);
    for (let i = 0; i < (def.fences || 0); i++) this.addFence(rand(def.size), rand(def.size), i % 2 === 0);
    for (let i = 0; i < def.gems; i++) this.addPickup('gem', rand(def.size), rand(def.size));
    this.addPickup('smg', -def.size * 0.25, -def.size * 0.1);
    if (index > 1) this.addPickup('plasma', def.size * 0.25, def.size * 0.1);
    this.addSky(def);
    this.spawnQueue = def.waves.map(w => ({ ...w }));
  }
  clear() {
    this.group.clear();
    this.colliders = [];
    this.hazards = [];
    this.pickups = [];
  }
  addSky(def) {
    const starGeo = new THREE.BufferGeometry();
    const pts = new Float32Array(450 * 3);
    for (let i = 0; i < 450; i++) { pts[i * 3] = (Math.random() - 0.5) * 180; pts[i * 3 + 1] = 8 + Math.random() * 70; pts[i * 3 + 2] = (Math.random() - 0.5) * 180; }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    this.group.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: def.accent, size: 0.08, transparent: true, opacity: 0.75 })));
    const mat = new THREE.MeshBasicMaterial({ color: 0x05060f });
    const half = def.size / 2;
    for (let i = 0; i < 24; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.2 + Math.random() * 2, 2 + Math.random() * 6, 1.2), mat);
      b.position.set(-half + Math.random() * def.size, b.geometry.parameters.height / 2, Math.random() > 0.5 ? -half - 4 : half + 4);
      this.group.add(b);
    }
  }
  addBox(x, z, w, d, h, mat, destructible) {
    if (Math.hypot(x, z - 7) < 5) z -= 6;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat.clone());
    mesh.position.set(x, h / 2, z);
    this.group.add(mesh);
    const c = { mesh, w, d, h, destructible, hp: destructible ? 55 : Infinity };
    this.colliders.push(c);
    return c;
  }
  addCrate(x, z) {
    const c = this.addBox(x, z, 1.25, 1.25, 1.25, new THREE.MeshStandardMaterial({ color: 0x211a28, emissive: this.color, emissiveIntensity: 0.45 }), true);
    c.mesh.userData.crate = c;
  }
  addHazard(x, z, i) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 3.2, 12), new THREE.MeshBasicMaterial({ color: 0xff3040, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending }));
    mesh.position.set(x, 1.6, z);
    this.group.add(mesh);
    this.hazards.push({ mesh, w: 1.0, d: 1.0, base: new THREE.Vector3(x, 1.6, z), axis: i % 2 ? 'x' : 'z', t: Math.random() * 10 });
  }
  addFence(x, z, horiz) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(horiz ? 7 : .18, 1.6, horiz ? .18 : 7), new THREE.MeshBasicMaterial({ color: this.color, transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending }));
    mesh.position.set(x, 0.8, z);
    this.group.add(mesh);
    this.hazards.push({ mesh, w: horiz ? 7 : .18, d: horiz ? .18 : 7, base: mesh.position.clone(), axis: 'none', t: 0 });
  }
  addPickup(type, x, z) {
    const colors = { gem: 0x72ffea, health: 0xff4068, smg: 0xffe05b, plasma: 0xb45cff };
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), new THREE.MeshBasicMaterial({ color: colors[type], transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }));
    mesh.position.set(x, 0.8, z);
    const light = new THREE.PointLight(colors[type], 1, 4);
    light.position.copy(mesh.position);
    this.group.add(mesh, light);
    this.pickups.push({ type, mesh, light, t: Math.random() * 10 });
  }
  update(dt) {
    for (const h of this.hazards) {
      h.t += dt;
      if (h.axis === 'x') h.mesh.position.x = h.base.x + Math.sin(h.t) * 4;
      if (h.axis === 'z') h.mesh.position.z = h.base.z + Math.sin(h.t) * 4;
    }
    for (const p of this.pickups) {
      p.t += dt;
      p.mesh.rotation.y += dt * 2;
      p.mesh.position.y = 0.8 + Math.sin(p.t * 3) * 0.16;
      p.light.position.copy(p.mesh.position);
    }
  }
  removePickup(p) {
    this.group.remove(p.mesh, p.light);
    this.pickups.splice(this.pickups.indexOf(p), 1);
  }
}

function rand(size) {
  const v = (Math.random() - 0.5) * (size - 6);
  return Math.abs(v) < 2 ? v + Math.sign(v || 1) * 3 : v;
}

function makeGrid(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#05060f';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = `#${color.toString(16).padStart(6, '0')}`;
  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = 12;
  ctx.lineWidth = 2;
  for (let i = 0; i <= 256; i += 32) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,255,255,.18)';
  ctx.shadowBlur = 0;
  ctx.strokeRect(1, 1, 254, 254);
  return new THREE.CanvasTexture(c);
}
