import * as THREE from 'three';

const TYPES = {
  grunt: { hp: 55, speed: 2.0, radius: 0.55, damage: 9, color: 0x39e7ff, score: 100 },
  shooter: { hp: 70, speed: 1.35, radius: 0.62, damage: 11, color: 0xffb23f, score: 140 },
  rusher: { hp: 28, speed: 4.7, radius: 0.42, damage: 14, color: 0x66ff77, score: 130 },
  sniper: { hp: 95, speed: 0.35, radius: 0.68, damage: 20, color: 0xff4de1, score: 190 },
  boss: { hp: 950, speed: 1.35, radius: 1.75, damage: 20, color: 0xff3030, score: 1500 }
};

export class Enemies {
  constructor(scene, game) {
    this.scene = scene;
    this.game = game;
    this.list = [];
    this.killQueue = [];
    this.geos = {
      grunt: new THREE.IcosahedronGeometry(0.65, 0),
      shooter: new THREE.BoxGeometry(1, 1, 1),
      rusher: new THREE.ConeGeometry(0.55, 1.1, 5),
      sniper: new THREE.CylinderGeometry(0.45, 0.6, 1.2, 8),
      boss: new THREE.IcosahedronGeometry(1.8, 1)
    };
  }
  clear() {
    for (const e of this.list) this.scene.remove(e.mesh, e.eye, e.glow, e.laser);
    this.list.length = 0;
    this.killQueue.length = 0;
  }
  spawn(type, pos, levelColor) {
    const t = TYPES[type], mat = new THREE.MeshStandardMaterial({ color: 0x101018, emissive: t.color, emissiveIntensity: 1.2, roughness: 0.4 });
    const mesh = new THREE.Mesh(this.geos[type], mat);
    mesh.position.copy(pos); mesh.position.y = type === 'boss' ? 2.0 : 0.75;
    const eye = new THREE.Mesh(new THREE.BoxGeometry(type === 'boss' ? 1.2 : 0.42, 0.12, 0.06), new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending }));
    eye.position.set(0, type === 'boss' ? 0.4 : 0.18, -t.radius - 0.02);
    mesh.add(eye);
    const glow = new THREE.PointLight(t.color, type === 'boss' ? 5 : 1.8, type === 'boss' ? 12 : 5);
    glow.position.copy(mesh.position);
    let laser = null;
    if (type === 'sniper') {
      laser = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 18), new THREE.MeshBasicMaterial({ color: 0xff5cff, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending }));
      laser.visible = false;
      this.scene.add(laser);
    }
    this.scene.add(mesh, glow);
    this.list.push({ type, mesh, eye, glow, laser, hp: t.hp, maxHp: t.hp, speed: t.speed, radius: t.radius, damage: t.damage, score: t.score, attack: 0.5 + Math.random(), flash: 0, dead: false, bossPhase: 1, charge: 0 });
  }
  damage(e, amount, weapon, pos, particles, effects, audio) {
    e.hp -= amount;
    e.flash = 0.12;
    audio.hit();
    particles.emit(pos, 0xffffff, 5, 2, 0.08);
    if (e.hp <= 0 && !e.dead) {
      e.dead = true;
      particles.emit(e.mesh.position, e.mesh.material.emissive.getHex(), e.type === 'boss' ? 90 : 28, e.type === 'boss' ? 13 : 7, e.type === 'boss' ? 0.35 : 0.18);
      this.killQueue.push(e);
    }
  }
  update(dt, player, level, weapons, particles, effects, audio) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i];
      if (e.dead) {
        this.scene.remove(e.mesh, e.glow, e.laser);
        this.list.splice(i, 1);
        continue;
      }
      const toPlayer = player.position.clone().sub(e.mesh.position); toPlayer.y = 0;
      const dist = Math.max(0.001, toPlayer.length());
      const dir = toPlayer.multiplyScalar(1 / dist);
      e.mesh.lookAt(player.position.x, e.mesh.position.y, player.position.z);
      e.glow.position.copy(e.mesh.position);
      e.attack -= dt;
      if (e.flash > 0) {
        e.flash -= dt;
        e.mesh.material.emissive.setHex(0xffffff);
        e.mesh.material.emissiveIntensity = 2.6;
      } else {
        e.mesh.material.emissive.setHex(TYPES[e.type].color);
        e.mesh.material.emissiveIntensity = e.type === 'boss' ? 1.8 : 1.15;
      }
      if (e.type === 'sniper') {
        if (e.laser) {
          e.laser.visible = e.attack < 0.55;
          e.laser.position.copy(e.mesh.position).add(new THREE.Vector3(dir.x * 4.5, 0.2, dir.z * 4.5));
          e.laser.lookAt(player.position.x, e.mesh.position.y + 0.2, player.position.z);
        }
        if (e.attack <= 0) { weapons.enemyShot(e.mesh.position.clone().add(new THREE.Vector3(0, 0.45, 0)), dir, 0xff56f1, 30, e.damage, 0.08, 1.4); e.attack = 2.1; audio.pew(); }
      } else if (e.type === 'shooter') {
        if (dist > 8) e.mesh.position.addScaledVector(dir, e.speed * dt);
        if (dist < 5) e.mesh.position.addScaledVector(dir, -e.speed * dt);
        if (e.attack <= 0) { weapons.enemyShot(e.mesh.position.clone().add(new THREE.Vector3(0, 0.35, 0)), dir, 0xff9a35, 15, e.damage); e.attack = 1.45; audio.pew(); }
      } else if (e.type === 'boss') {
        this.updateBoss(e, dt, player, dir, dist, weapons, particles, effects, audio);
      } else {
        e.mesh.position.addScaledVector(dir, e.speed * dt);
        if (dist < e.radius + 0.55 && e.attack <= 0) {
          if (player.damage(e.damage)) { effects.flashDamage(0.6); effects.addShake(0.2); audio.hurt(); }
          e.attack = e.type === 'rusher' ? 0.55 : 0.9;
        }
      }
      const half = level.size / 2 - 0.8;
      e.mesh.position.x = Math.max(-half, Math.min(half, e.mesh.position.x));
      e.mesh.position.z = Math.max(-half, Math.min(half, e.mesh.position.z));
    }
  }
  updateBoss(e, dt, player, dir, dist, weapons, particles, effects, audio) {
    const hpRatio = e.hp / e.maxHp;
    e.bossPhase = hpRatio < 0.34 ? 3 : hpRatio < 0.67 ? 2 : 1;
    e.mesh.scale.setScalar(1 + (1 - hpRatio) * 0.25);
    if (e.bossPhase === 3) {
      e.charge -= dt;
      const speed = e.charge > 0 ? 5.0 : 1.2;
      e.mesh.position.addScaledVector(dir, speed * dt);
      if (e.charge <= -1.2) { e.charge = 1.0; effects.announce('SHOCKWAVE'); particles.emit(e.mesh.position, 0xff3030, 38, 8, 0.25); if (dist < 5 && player.damage(18)) effects.flashDamage(0.8); }
    } else {
      e.mesh.position.addScaledVector(dir, dist > 9 ? e.speed * dt : -e.speed * 0.4 * dt);
    }
    if (e.attack > 0) return;
    if (e.bossPhase === 1) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) weapons.enemyShot(e.mesh.position.clone(), new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), 0xff4040, 12, 10, 0.12, 2.2);
      e.attack = 2.0; effects.addShake(0.18); audio.roar();
    } else if (e.bossPhase === 2) {
      ['grunt', 'rusher', 'shooter'].forEach((t, i) => this.spawn(t, e.mesh.position.clone().add(new THREE.Vector3((i - 1) * 2, 0, -3)), 0xff3030));
      e.attack = 4.2; effects.announce('MINIONS');
    } else {
      weapons.enemyShot(e.mesh.position.clone(), dir, 0xff3030, 22, 16, 0.18, 1.6);
      e.attack = 1.0;
    }
    if (dist < e.radius + 0.7 && player.damage(e.damage)) { effects.flashDamage(0.8); effects.addShake(0.4); audio.hurt(); }
  }
}
