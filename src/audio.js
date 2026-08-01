export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.muted = localStorage.getItem('neonStrikeMuted') === '1';
    this.musicTimer = 0;
    this.step = 0;
  }
  start() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.55;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.12;
    this.musicGain.connect(this.master);
  }
  setMuted(v) {
    this.muted = v;
    localStorage.setItem('neonStrikeMuted', v ? '1' : '0');
    if (this.master) this.master.gain.setTargetAtTime(v ? 0 : 0.55, this.ctx.currentTime, 0.02);
  }
  beep(type = 'sine', f0 = 440, f1 = 220, dur = 0.12, gain = 0.2) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur);
  }
  noise(dur = 0.25, gain = 0.3, filter = 900) {
    if (!this.ctx || this.muted) return;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    const lp = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    src.buffer = buf;
    lp.type = 'lowpass';
    lp.frequency.value = filter;
    g.gain.value = gain;
    src.connect(lp).connect(g).connect(this.master);
    src.start();
  }
  pew() { this.beep('sawtooth', 920, 240, 0.1, 0.12); }
  smg() { this.beep('square', 620, 420, 0.045, 0.08); }
  plasma() { this.noise(0.22, 0.18, 650); this.beep('sine', 120, 42, 0.38, 0.22); }
  hit() { this.beep('triangle', 160, 80, 0.08, 0.12); }
  explode() { this.noise(0.42, 0.35, 700); this.beep('sine', 90, 35, 0.42, 0.2); }
  pickup() { [0, 0.06, 0.12].forEach((d, i) => setTimeout(() => this.beep('sine', 440 + i * 220, 660 + i * 220, 0.08, 0.1), d * 1000)); }
  hurt() { this.noise(0.18, 0.18, 280); this.beep('sawtooth', 120, 55, 0.2, 0.18); }
  jump() { this.beep('sine', 170, 280, 0.12, 0.08); }
  fanfare() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.beep('triangle', f, f * 1.2, 0.16, 0.12), i * 120)); }
  roar() { this.beep('sawtooth', 65, 32, 0.9, 0.28); }
  update(dt) {
    if (!this.ctx || this.muted) return;
    this.musicTimer -= dt;
    if (this.musicTimer > 0) return;
    const notes = [110, 165, 220, 330, 247, 220, 165, 147];
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = notes[this.step++ % notes.length];
    g.gain.setValueAtTime(0.035, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(g).connect(this.musicGain);
    osc.start(t);
    osc.stop(t + 0.16);
    this.musicTimer = 0.18;
  }
}
