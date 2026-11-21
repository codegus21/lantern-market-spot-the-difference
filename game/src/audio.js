// audio.js — all sound is synthesized with WebAudio. No audio files,
// no network. The context is created lazily on the first user gesture
// (browsers block audio before interaction), and a gentle pad loop
// hums underneath the game until the player mutes it.

export class SoundEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.padNodes = null;
    this.muted = false;
  }

  // Create the AudioContext on first use (must follow a user gesture).
  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') void this.context.resume();
      return true;
    }
    if (typeof window === 'undefined') return false;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.context.destination);
    this.startPad();
    return true;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.context.currentTime, 0.05);
    }
  }

  // A soft two-oscillator pad with a slow breathing gain, for ambience.
  startPad() {
    const ctx = this.context;
    const padGain = ctx.createGain();
    padGain.gain.value = 0.05;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    const oscA = ctx.createOscillator();
    oscA.type = 'sine';
    oscA.frequency.value = 220;
    const oscB = ctx.createOscillator();
    oscB.type = 'sine';
    oscB.frequency.value = 329.63;
    const oscC = ctx.createOscillator();
    oscC.type = 'triangle';
    oscC.frequency.value = 110;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(padGain.gain);
    oscA.connect(filter);
    oscB.connect(filter);
    oscC.connect(filter);
    filter.connect(padGain);
    padGain.connect(this.master);
    oscA.start();
    oscB.start();
    oscC.start();
    lfo.start();
    this.padNodes = { oscA, oscB, oscC, lfo };
  }

  // One short plucked note: triangle wave with a quick decay.
  note(frequency, startAt, duration, volume, type) {
    const ctx = this.context;
    const osc = ctx.createOscillator();
    osc.type = type || 'triangle';
    osc.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(volume, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.05);
  }

  // Pleasant chime arpeggio when a difference is found.
  playFound(combo) {
    if (!this.ensure()) return;
    const now = this.context.currentTime;
    const base = 523.25 * Math.pow(1.059463, Math.min(combo, 8));
    const notes = [base, base * 1.25, base * 1.5, base * 2];
    notes.forEach((freq, i) => this.note(freq, now + i * 0.07, 0.5, 0.22));
  }

  // Soft thud plus a low buzz for a wrong click.
  playMiss() {
    if (!this.ensure()) return;
    const now = this.context.currentTime;
    this.note(140, now, 0.25, 0.25, 'sine');
    this.note(98, now + 0.02, 0.35, 0.2, 'sawtooth');
  }

  // Rising arpeggio when a level is completed.
  playLevelComplete() {
    if (!this.ensure()) return;
    const now = this.context.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, i) => this.note(freq, now + i * 0.1, 0.6, 0.2));
  }

  // Gentle two-note cue when a hint is used.
  playHint() {
    if (!this.ensure()) return;
    const now = this.context.currentTime;
    this.note(880, now, 0.4, 0.15, 'sine');
    this.note(1174.66, now + 0.09, 0.5, 0.15, 'sine');
  }

  // Bright fanfare for finishing all three levels.
  playVictory() {
    if (!this.ensure()) return;
    const now = this.context.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5, 1567.98];
    notes.forEach((freq, i) => this.note(freq, now + i * 0.12, 0.7, 0.2));
  }
}
