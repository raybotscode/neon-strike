import * as THREE from 'three';

export class Effects {
  constructor(root) {
    this.shake = 0;
    this.damage = 0;
    this.root = root;
    this.vignette = document.createElement('div');
    this.vignette.className = 'vignette';
    root.appendChild(this.vignette);
    this.popups = [];
    this.banner = document.createElement('div');
    this.banner.className = 'big-banner';
    root.appendChild(this.banner);
  }
  addShake(v) { this.shake = Math.min(1.5, this.shake + v); }
  flashDamage(v = 0.5) { this.damage = Math.max(this.damage, v); }
  announce(text, sub = '') {
    this.banner.innerHTML = `<b>${text}</b>${sub ? `<span>${sub}</span>` : ''}`;
    this.banner.classList.remove('show');
    void this.banner.offsetWidth;
    this.banner.classList.add('show');
  }
  scorePopup(pos, text, color = '#7dfcff') {
    const el = document.createElement('div');
    el.className = 'score-pop';
    el.textContent = text;
    el.style.color = color;
    this.root.appendChild(el);
    this.popups.push({ el, pos: pos.clone(), t: 1.0 });
  }
  update(dt, camera, renderer) {
    this.shake = Math.max(0, this.shake - dt * 2.8);
    this.damage = Math.max(0, this.damage - dt * 1.6);
    this.vignette.style.opacity = String(Math.min(0.75, this.damage));
    const w = window.innerWidth, h = window.innerHeight;
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.t -= dt;
      p.pos.y += dt * 1.2;
      const v = p.pos.clone().project(camera);
      p.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%,-50%) scale(${0.7 + p.t * 0.5})`;
      p.el.style.opacity = String(Math.max(0, p.t));
      if (p.t <= 0) {
        p.el.remove();
        this.popups.splice(i, 1);
      }
    }
  }
  cameraOffset() {
    if (this.shake <= 0) return new THREE.Vector3();
    return new THREE.Vector3((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake, 0).multiplyScalar(0.08);
  }
}
