import * as THREE from 'three';
import { CFG } from './config.js';
import { Player } from './player.js';
import { Weapons } from './weapons.js';
import { Enemies } from './enemies.js';
import { Level } from './level.js';
import { ParticleSystem } from './particles.js';
import { Effects } from './effects.js';
import { AudioSystem } from './audio.js';

export class Game {
  constructor(scene, camera, renderer, hud, input) {
    this.scene = scene; this.camera = camera; this.renderer = renderer; this.hud = hud; this.input = input;
    this.audio = new AudioSystem();
    this.player = new Player(camera);
    this.level = new Level(scene);
    this.weapons = new Weapons(scene, camera);
    this.enemies = new Enemies(scene, this);
    this.particles = new ParticleSystem(scene);
    this.effects = new Effects(document.body);
    this.rayLight = new THREE.HemisphereLight(0x8fdfff, 0x05060f, 1.5);
    scene.add(this.rayLight);
    scene.fog = new THREE.FogExp2(0x05060f, 0.018);
    this.levelIndex = 0; this.waveIndex = 0; this.waveLeft = {}; this.waveDelay = 0; this.spawnTick = 0;
    this.score = 0; this.kills = 0; this.totalKills = 0; this.combo = 1; this.comboTimer = 0; this.maxCombo = 1; this.levelTime = 0;
    this.mode = 'title'; this.modeText = 'READY'; this.high = Number(localStorage.getItem('neonStrikeHigh') || 0);
    this.screen = null;
    this.bindHud();
    this.showTitle();
  }
  setModels(models) {
    this.models = models;
    this.weapons.setModels(models);
    this.enemies.setModels(models);
    this.level.setModels(models);
  }
  bindHud() {
    this.hud.mute.textContent = this.audio.muted ? 'SOUND OFF' : 'MUTE';
    this.hud.mute.addEventListener('pointerdown', e => {
      e.preventDefault();
      this.audio.start();
      this.audio.setMuted(!this.audio.muted);
      this.hud.mute.textContent = this.audio.muted ? 'SOUND OFF' : 'MUTE';
    });
  }
  makeScreen(title, body, button) {
    this.clearScreen();
    const el = document.createElement('div');
    el.className = 'screen';
    el.innerHTML = `<div><h1>${title}</h1><p>${body}</p><button>${button}</button></div>`;
    el.querySelector('button').addEventListener('pointerdown', e => { e.preventDefault(); this.audio.start(); this.startFromScreen(); });
    document.body.appendChild(el);
    this.screen = el;
  }
  clearScreen() { if (this.screen) this.screen.remove(); this.screen = null; }
  showTitle() {
    this.mode = 'title';
    this.makeScreen('NEON STRIKE', `High score ${this.high}. Drag right side to aim, left thumb to move, hold FIRE. WASD and mouse work on desktop.`, 'TAP TO START');
  }
  startFromScreen() {
    if (this.mode === 'victory') this.levelIndex = 0;
    this.clearScreen();
    this.startLevel(this.levelIndex);
  }
  startLevel(i) {
    this.mode = 'intro';
    this.levelIndex = i; this.waveIndex = 0; this.levelTime = 0; this.kills = 0; this.maxCombo = 1;
    if (i === 0) this.score = 0;
    this.player.reset();
    this.weapons.reset();
    this.enemies.clear();
    this.level.build(i);
    this.modeText = 'GET READY';
    this.waveDelay = 2.0;
    this.effects.announce(`LEVEL ${i + 1}`, CFG.levels[i].name);
    if (i >= 1) this.weapons.give('smg');
    if (i >= 2) this.weapons.give('plasma');
  }
  beginWave() {
    this.mode = 'play';
    this.waveLeft = { ...CFG.levels[this.levelIndex].waves[this.waveIndex] };
    this.spawnTick = 0.2;
    this.modeText = `WAVE ${this.waveIndex + 1}`;
    this.effects.announce(`WAVE ${this.waveIndex + 1}`);
  }
  update(dt) {
    this.audio.update(dt);
    const look = this.input.frameLook();
    if (this.mode !== 'title' && this.mode !== 'death' && this.mode !== 'victory') this.player.look(look.dx, look.dy, look.speed);
    this.input.pollKeyboard();
    if (this.mode === 'intro') {
      this.waveDelay -= dt;
      if (this.waveDelay <= 0) this.beginWave();
    } else if (this.mode === 'breather') {
      this.waveDelay -= dt;
      this.modeText = 'NEXT WAVE';
      if (this.waveDelay <= 0) this.beginWave();
    } else if (this.mode === 'complete') {
      this.waveDelay -= dt;
      if (this.waveDelay <= 0) {
        if (this.levelIndex >= CFG.levels.length - 1) this.victory(); else this.startLevel(this.levelIndex + 1);
      }
    } else if (this.mode === 'play') {
      this.updatePlay(dt);
    }
    this.level.update(dt);
    this.weapons.update(dt, this.level, this.enemies, this.player, this.particles, this.effects, this.audio);
    this.enemies.update(dt, this.player, this.level, this.weapons, this.particles, this.effects, this.audio);
    this.handleKills();
    this.particles.update(dt);
    this.effects.update(dt, this.camera, this.renderer);
    const boss = this.enemies.list.find(e => e.type === 'boss' && !e.dead);
    this.hud.update({ hp: this.player.hp, levelIndex: this.levelIndex, waveIndex: this.waveIndex, modeText: this.modeText, score: this.score, combo: this.combo, bossHp: boss ? boss.hp / boss.maxHp : 0, weaponIndex: this.weapons.index, ownedWeapons: this.weapons.owned });
  }
  updatePlay(dt) {
    this.levelTime += dt;
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.combo = 1;
    const beforeHp = this.player.hp;
    if (this.input.consumeJump() && this.player.jump()) this.audio.jump();
    const wi = this.input.consumeWeapon();
    if (wi !== null) this.weapons.switchTo(wi);
    this.player.update(dt, this.input, this.level, this.effects);
    if (beforeHp > this.player.hp) { this.combo = 1; this.comboTimer = 0; }
    if (this.input.fire || this.input.keys.has('Mouse0')) this.weapons.fire(this.player, this.effects, this.audio);
    this.spawnWave(dt);
    this.pickups();
    if (this.player.hp <= 0) this.death();
    if (this.waveDone()) {
      if (this.waveIndex >= CFG.levels[this.levelIndex].waves.length - 1) this.levelComplete();
      else { this.waveIndex++; this.mode = 'breather'; this.waveDelay = 3; this.effects.announce('WAVE CLEAR', '+ BREATHER'); }
    }
  }
  spawnWave(dt) {
    this.spawnTick -= dt;
    if (this.spawnTick > 0 || this.enemies.list.length >= CFG.levels[this.levelIndex].maxEnemies) return;
    const types = Object.keys(this.waveLeft).filter(k => this.waveLeft[k] > 0);
    if (!types.length) return;
    const type = types[Math.floor(Math.random() * types.length)];
    this.waveLeft[type]--;
    const a = Math.random() * Math.PI * 2, r = this.level.size * 0.42;
    this.enemies.spawn(type, new THREE.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r), this.level.color);
    if (type === 'boss') this.audio.roar();
    this.spawnTick = type === 'boss' ? 1 : 0.42 + Math.random() * 0.45;
  }
  waveDone() {
    return Object.values(this.waveLeft).every(v => v <= 0) && this.enemies.list.length === 0;
  }
  handleKills() {
    while (this.enemies.killQueue.length) {
      const e = this.enemies.killQueue.shift();
      this.kills++; this.totalKills++;
      this.combo = this.comboTimer > 0 ? this.combo + 1 : 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.comboTimer = CFG.combo.window;
      const gain = e.score * this.combo;
      this.score += gain;
      this.effects.scorePopup(e.mesh.position, `+${gain}`, `#${this.level.color.toString(16).padStart(6, '0')}`);
      if (this.combo === 2) this.effects.announce('DOUBLE KILL');
      if (this.combo === 4) this.effects.announce('RAMPAGE');
      if (this.combo === 7) this.effects.announce('UNSTOPPABLE');
      if (Math.random() < 0.18 && e.type !== 'boss') this.level.addPickup('health', e.mesh.position.x, e.mesh.position.z);
      this.audio.explode();
    }
    if (this.score > this.high) {
      this.high = this.score;
      localStorage.setItem('neonStrikeHigh', String(this.high));
    }
  }
  pickups() {
    for (let i = this.level.pickups.length - 1; i >= 0; i--) {
      const p = this.level.pickups[i];
      if (p.mesh.position.distanceTo(this.player.position) > 1.1) continue;
      if (p.type === 'gem') this.score += 100 * this.combo;
      if (p.type === 'health') this.player.hp = Math.min(CFG.player.maxHp, this.player.hp + 30);
      if (p.type === 'smg') this.weapons.give('smg');
      if (p.type === 'plasma') this.weapons.give('plasma');
      this.effects.scorePopup(p.mesh.position, p.type === 'gem' ? '+100' : p.type.toUpperCase());
      this.audio.pickup();
      this.level.removePickup(p);
    }
  }
  levelComplete() {
    this.mode = 'complete';
    this.waveDelay = 3.8;
    this.audio.fanfare();
    this.effects.announce('LEVEL COMPLETE', `${this.kills} kills  MAX x${this.maxCombo}`);
  }
  death() {
    this.mode = 'death';
    this.makeScreen('WASTED', `Score ${this.score}. Level ${this.levelIndex + 1}. Kills ${this.kills}.`, 'TAP TO RETRY');
  }
  victory() {
    this.mode = 'victory';
    this.audio.fanfare();
    this.makeScreen('VICTORY', `Final score ${this.score}. Total kills ${this.totalKills}. High score ${this.high}.`, 'PLAY AGAIN');
  }
}
