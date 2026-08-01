import { CFG } from './config.js';

export class Input {
  constructor(root, hud) {
    this.root = root;
    this.hud = hud;
    this.move = { x: 0, y: 0 };
    this.lookDX = 0;
    this.lookDY = 0;
    this.fire = false;
    this.jumpQueued = false;
    this.weaponQueued = null;
    this.keys = new Set();
    this.joy = null;
    this.look = null;
    this.mouseLook = false;
    this.bind();
  }
  bind() {
    window.addEventListener('keydown', e => {
      this.keys.add(e.code);
      if (e.code === 'Space') this.jumpQueued = true;
      if (['Digit1', 'Digit2', 'Digit3'].includes(e.code)) this.weaponQueued = Number(e.code.at(-1)) - 1;
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('pointerdown', e => this.pointerDown(e), { passive: false });
    window.addEventListener('pointermove', e => this.pointerMove(e), { passive: false });
    window.addEventListener('pointerup', e => this.pointerUp(e), { passive: false });
    window.addEventListener('pointercancel', e => this.pointerUp(e), { passive: false });
    this.hud.fire.addEventListener('pointerdown', e => { e.preventDefault(); this.fire = true; });
    this.hud.fire.addEventListener('pointerup', e => { e.preventDefault(); this.fire = false; });
    this.hud.jump.addEventListener('pointerdown', e => { e.preventDefault(); this.jumpQueued = true; });
    this.hud.weaponButtons.forEach((b, i) => b.addEventListener('pointerdown', e => { e.preventDefault(); this.weaponQueued = i; }));
  }
  pointerDown(e) {
    if (e.target.closest('.hud-button')) return;
    e.preventDefault();
    if (e.pointerType === 'mouse') {
      this.mouseLook = true;
      this.fire = e.button === 0;
      return;
    }
    if (e.clientX < window.innerWidth * 0.48) {
      this.joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
      this.hud.showJoystick(this.joy);
    } else {
      this.look = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
  }
  pointerMove(e) {
    e.preventDefault();
    if (this.mouseLook && e.pointerType === 'mouse') {
      this.lookDX += e.movementX || 0;
      this.lookDY += e.movementY || 0;
      return;
    }
    if (this.joy?.id === e.pointerId) {
      this.joy.x = e.clientX; this.joy.y = e.clientY;
      const r = 64, dx = e.clientX - this.joy.ox, dy = e.clientY - this.joy.oy;
      const len = Math.hypot(dx, dy), k = len > r ? r / len : 1;
      const nx = (dx * k) / r, ny = (dy * k) / r;
      this.move.x = Math.abs(nx) < 0.15 ? 0 : nx;
      this.move.y = Math.abs(ny) < 0.15 ? 0 : -ny;
      this.hud.moveJoystick(this.joy.ox, this.joy.oy, dx * k, dy * k);
    }
    if (this.look?.id === e.pointerId) {
      this.lookDX += e.clientX - this.look.x;
      this.lookDY += e.clientY - this.look.y;
      this.look.x = e.clientX; this.look.y = e.clientY;
    }
  }
  pointerUp(e) {
    if (e.pointerType === 'mouse') {
      this.mouseLook = false;
      this.fire = false;
      return;
    }
    if (this.joy?.id === e.pointerId) {
      this.joy = null;
      this.move.x = 0; this.move.y = 0;
      this.hud.hideJoystick();
    }
    if (this.look?.id === e.pointerId) this.look = null;
  }
  frameLook() {
    const out = { dx: this.lookDX, dy: this.lookDY, speed: this.look || !this.mouseLook ? CFG.camera.lookSpeedTouch : CFG.camera.lookSpeedMouse };
    this.lookDX = 0; this.lookDY = 0;
    return out;
  }
  pollKeyboard() {
    const x = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    const y = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    if (!this.joy) this.move = { x, y };
  }
  consumeJump() { const v = this.jumpQueued; this.jumpQueued = false; return v; }
  consumeWeapon() { const v = this.weaponQueued; this.weaponQueued = null; return v; }
}
