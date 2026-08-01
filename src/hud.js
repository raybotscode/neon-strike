export class HUD {
  constructor(root) {
    this.root = root;
    root.innerHTML = `
      <canvas id="game"></canvas>
      <div class="hud">
        <div class="top left"><div class="label">HP</div><div class="hp"><i></i></div></div>
        <div class="top center"><div class="level">LEVEL 1</div><div class="wave">WAVE 1</div><div class="bossbar"><i></i></div></div>
        <div class="top right"><div class="score">0</div><div class="combo">x1</div></div>
        <button class="mute hud-button">MUTE</button>
        <div class="crosshair"></div>
        <div class="joy"><div></div></div>
        <button class="fire hud-button">FIRE</button>
        <button class="jump hud-button">JUMP</button>
        <div class="weapons"></div>
      </div>`;
    this.canvas = root.querySelector('#game');
    this.hp = root.querySelector('.hp i');
    this.level = root.querySelector('.level');
    this.wave = root.querySelector('.wave');
    this.score = root.querySelector('.score');
    this.combo = root.querySelector('.combo');
    this.boss = root.querySelector('.bossbar');
    this.bossFill = root.querySelector('.bossbar i');
    this.joy = root.querySelector('.joy');
    this.knob = root.querySelector('.joy div');
    this.fire = root.querySelector('.fire');
    this.jump = root.querySelector('.jump');
    this.mute = root.querySelector('.mute');
    this.weapons = root.querySelector('.weapons');
    this.weaponButtons = ['B', 'S', 'P'].map(t => {
      const b = document.createElement('button');
      b.className = 'weapon hud-button';
      b.textContent = t;
      this.weapons.appendChild(b);
      return b;
    });
  }
  update(state) {
    this.hp.style.width = `${Math.max(0, state.hp)}%`;
    this.level.textContent = `LEVEL ${state.levelIndex + 1}`;
    this.wave.textContent = state.modeText || `WAVE ${state.waveIndex + 1}`;
    this.score.textContent = String(state.score);
    this.combo.textContent = `x${state.combo}`;
    this.combo.classList.toggle('hot', state.combo > 1);
    this.boss.style.display = state.bossHp > 0 ? 'block' : 'none';
    this.bossFill.style.width = `${state.bossHp * 100}%`;
    this.weaponButtons.forEach((b, i) => {
      b.classList.toggle('active', i === state.weaponIndex);
      b.classList.toggle('owned', state.ownedWeapons[i]);
    });
  }
  showJoystick(j) {
    this.joy.style.opacity = '1';
    this.joy.style.left = `${j.ox}px`;
    this.joy.style.top = `${j.oy}px`;
    this.knob.style.transform = 'translate(-50%,-50%)';
  }
  moveJoystick(ox, oy, dx, dy) {
    this.joy.style.left = `${ox}px`;
    this.joy.style.top = `${oy}px`;
    this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }
  hideJoystick() { this.joy.style.opacity = '0'; }
}
