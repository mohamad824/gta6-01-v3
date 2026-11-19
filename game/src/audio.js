// Procedural sound: WebAudio only, no audio files. A low engine hum that
// follows speed, a two-note radio jingle, and simple SFX (shot, pickup,
// siren wail). Silent in screenshot mode and before first input.
export class SoundBank {
  constructor() {
    this.ctx = null; this.master = null; this.engineOsc = null;
    this.engineGain = null; this.muted = false; this.radioOn = true;
    this._radioTimer = 0; this._sirenTimer = 0;
  }
  ensure() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.ctx.destination);
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 420;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0;
      this.engineOsc.connect(lp); lp.connect(this.engineGain); this.engineGain.connect(this.master);
      this.engineOsc.start();
    } catch (e) { this.ctx = null; }
  }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); }
  setEngine(speedKmh, inCar) {
    if (!this.ctx || !this.engineOsc) return;
    const t = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(48 + speedKmh * 0.55, t, 0.08);
    this.engineGain.gain.setTargetAtTime(this.muted ? 0 : (inCar ? 0.05 + speedKmh * 0.00035 : 0.012), t, 0.1);
  }
  blip(freq, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    try {
      const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
      o.type = type || 'square'; o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.2, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      o.connect(g); g.connect(this.master); o.start(); o.stop(this.ctx.currentTime + dur);
    } catch (e) {}
  }
  shot() { this.blip(180, 0.09, 'square', 0.25); this.blip(90, 0.14, 'sawtooth', 0.18); }
  pickup() { this.blip(660, 0.08, 'sine', 0.22); setTimeout(() => this.blip(990, 0.12, 'sine', 0.22), 70); }
  cash() { this.blip(880, 0.07, 'sine', 0.2); setTimeout(() => this.blip(1320, 0.1, 'sine', 0.2), 60); }
  // Tiny radio loop: a slow minor-key bass walk under the chase.
  radioTick(dt, speedKmh) {
    if (!this.ctx || this.muted || !this.radioOn) return;
    this._radioTimer += dt;
    if (this._radioTimer < 0.42) return;
    this._radioTimer = 0;
    const bass = [110, 110, 130.8, 98, 110, 146.8, 130.8, 98];
    const step = Math.floor(performance.now() / 420) % 8;
    this.blip(bass[step], 0.3, 'triangle', 0.05);
    if (speedKmh > 60) this.blip(bass[step] * 2, 0.12, 'sine', 0.03);
  }
  siren(dt) {
    if (!this.ctx || this.muted) return;
    this._sirenTimer += dt;
    if (this._sirenTimer < 0.9) return;
    this._sirenTimer = 0;
    this.blip(740, 0.4, 'sine', 0.045);
    setTimeout(() => this.blip(988, 0.4, 'sine', 0.045), 420);
  }
}
