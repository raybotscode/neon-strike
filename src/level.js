import * as THREE from 'three';
import { CFG } from './config.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { fitModel, makeModel } from './models.js';

let skyPromise = null;

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
    this.models = null;
    this.loadSky();
  }
  build(index) {
    this.clear();
    const def = CFG.levels[index];
    this.def = def; this.size = def.size; this.color = def.color;
    const tex = makeGrid(def.color);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(def.size / 8, def.size / 8);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(def.size, def.size), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, color: 0xffffff, emissive: def.color, emissiveIntensity: 0.55, roughness: 0.65, metalness: 0.08 }));
    floor.rotation.x = -Math.PI / 2;
    this.group.add(floor);
    const wallMat = new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending });
    for (const [x, z, w, d] of [[0, -def.size / 2, def.size, .25], [0, def.size / 2, def.size, .25], [-def.size / 2, 0, .25, def.size], [def.size / 2, 0, .25, def.size]]) this.addBox(x, z, w, d, 2.8, wallMat, false);
    for (let i = 0; i < def.blocks; i++) this.addBarrier(rand(def.size), rand(def.size), 1.7 + Math.random() * 2.2, 1.7 + Math.random() * 2.2, 1.2 + Math.random() * 1.2);
    for (let i = 0; i < def.crates; i++) this.addCrate(rand(def.size), rand(def.size));
    for (let i = 0; i < (def.hazards || 0); i++) this.addHazard(rand(def.size), rand(def.size), i);
    for (let i = 0; i < (def.fences || 0); i++) this.addFence(rand(def.size), rand(def.size), i % 2 === 0);
    for (let i = 0; i < def.gems; i++) this.addPickup('gem', rand(def.size), rand(def.size));
    this.addPickup('smg', -def.size * 0.25, -def.size * 0.1);
    if (index > 1) this.addPickup('plasma', def.size * 0.25, def.size * 0.1);
    this.addSky(def);
    this.spawnQueue = def.waves.map(w => ({ ...w }));
  }
  setModels(models) {
    this.models = models;
    for (const c of this.colliders) this.replaceColliderVisual(c);
  }
  loadSky() {
    if (!skyPromise) {
      skyPromise = new RGBELoader().loadAsync('/textures/sky.hdr').then(texture => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        return texture;
      }).catch(err => {
        console.warn('Sky HDR failed to load', err);
        return null;
      });
    }
    skyPromise.then(texture => {
      if (!texture) return;
      this.scene.background = texture;
      this.scene.environment = texture;
    });
  }
  clear() {
    this.group.clear();
    this.colliders = [];
    this.hazards = [];
    this.pickups = [];
  }
  addSky(def) {
    void def;
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
    const c = this.addPropCollider('crate', x, z, 1.25, 1.25, 1.25, true);
    c.mesh.userData.crate = c;
  }
  addBarrier(x, z, w, d, h) {
    return this.addPropCollider('barrier', x, z, w, d, h, false);
  }
  addPropCollider(kind, x, z, w, d, h, destructible) {
    if (Math.hypot(x, z - 7) < 5) z -= 6;
    const mesh = new THREE.Group();
    mesh.position.set(x, h / 2, z);
    this.group.add(mesh);
    const c = { kind, mesh, visual: null, w, d, h, destructible, hp: destructible ? 55 : Infinity };
    this.colliders.push(c);
    this.replaceColliderVisual(c);
    return c;
  }
  replaceColliderVisual(c) {
    if (!c.kind) return;
    const key = c.kind === 'crate' ? 'prop_crate' : 'prop_barrier';
    const model = makeModel(key);
    const next = model || new THREE.Mesh(
      new THREE.BoxGeometry(c.w, c.h, c.d),
      new THREE.MeshStandardMaterial({ color: c.kind === 'crate' ? 0x211a28 : 0x11131f, emissive: this.color, emissiveIntensity: c.kind === 'crate' ? 0.45 : 0.25, roughness: 0.55 })
    );
    if (model) fitModel(next, { height: c.h, width: c.w, depth: c.d, groundY: -c.h / 2 });
    if (c.visual) c.mesh.remove(c.visual);
    c.visual = next;
    c.mesh.add(c.visual);
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
