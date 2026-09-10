// Slapstick Web Audio API Synthesizer - Recorded-grade sound design
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    this.masterGain = null;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.9;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('AudioContext not supported or blocked:', e);
    }
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Fast wooden stick whoosh on swing
  playBatWhoosh() {
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(140, t + 0.2);
    filter.Q.value = 3.5;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.2);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.21);
  }

  // Recorded-grade wooden bat THWACK impact crack
  playBatThwack() {
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. High-frequency wood slap crack transient
    const crackSize = Math.floor(this.ctx.sampleRate * 0.06);
    const crackBuf = this.ctx.createBuffer(1, crackSize, this.ctx.sampleRate);
    const crackData = crackBuf.getChannelData(0);
    for (let i = 0; i < crackSize; i++) {
      crackData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (crackSize * 0.15));
    }
    const crackSource = this.ctx.createBufferSource();
    crackSource.buffer = crackBuf;

    const crackFilter = this.ctx.createBiquadFilter();
    crackFilter.type = 'bandpass';
    crackFilter.frequency.value = 2200;
    crackFilter.Q.value = 1.8;

    const crackGain = this.ctx.createGain();
    crackGain.gain.setValueAtTime(1.0, t);
    crackGain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);

    crackSource.connect(crackFilter);
    crackFilter.connect(crackGain);
    crackGain.connect(this.masterGain);

    // 2. Heavy solid wood core body (deep thwack resonance)
    const woodOsc = this.ctx.createOscillator();
    const woodGain = this.ctx.createGain();

    woodOsc.type = 'triangle';
    woodOsc.frequency.setValueAtTime(420, t);
    woodOsc.frequency.exponentialRampToValueAtTime(75, t + 0.16);

    woodGain.gain.setValueAtTime(0.9, t);
    woodGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    woodOsc.connect(woodGain);
    woodGain.connect(this.masterGain);

    // 3. Sub thump
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(130, t);
    subOsc.frequency.exponentialRampToValueAtTime(30, t + 0.14);

    subGain.gain.setValueAtTime(0.8, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);

    crackSource.start(t);
    woodOsc.start(t);
    subOsc.start(t);

    woodOsc.stop(t + 0.2);
    subOsc.stop(t + 0.2);
  }

  // Solid wooden furniture / wall impact sound
  playObjectHit() {
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, t);
    filter.frequency.exponentialRampToValueAtTime(110, t + 0.14);

    osc.type = 'square';
    osc.frequency.setValueAtTime(190, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.14);

    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.17);
  }

  // Realistic human comedic cartoon scream (Multi-formant vocal synthesis)
  playScream(variation = 0) {
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const duration = 1.35;

    // Vocal pitches (funny high pitched shrieks)
    const basePitches = [620, 780, 890, 540];
    const pitch = basePitches[variation % basePitches.length];

    // Vocal cord carrier
    const voiceOsc = this.ctx.createOscillator();
    voiceOsc.type = 'sawtooth';

    // Screaming pitch curve: initial sharp rise -> high frantic sustain -> comic slide down
    voiceOsc.frequency.setValueAtTime(pitch * 0.8, t);
    voiceOsc.frequency.linearRampToValueAtTime(pitch * 1.5, t + 0.12);
    voiceOsc.frequency.setValueAtTime(pitch * 1.45, t + 0.6);
    voiceOsc.frequency.exponentialRampToValueAtTime(pitch * 0.4, t + duration);

    // Rapid throat vibrato (panic shake)
    const vibrato = this.ctx.createOscillator();
    const vibratoGain = this.ctx.createGain();
    vibrato.frequency.value = 16;
    vibratoGain.gain.value = 55;
    vibrato.connect(voiceOsc.frequency);

    // Formant 1: Mouth opening ("WAAAAA!")
    const f1 = this.ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(800, t);
    f1.frequency.linearRampToValueAtTime(1600, t + 0.2);
    f1.Q.value = 5.0;

    // Formant 2: Nasal & throat cavity
    const f2 = this.ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.setValueAtTime(2200, t);
    f2.frequency.linearRampToValueAtTime(3100, t + 0.3);
    f2.Q.value = 4.0;

    // Vocal Gain Envelope
    const voiceGain = this.ctx.createGain();
    voiceGain.gain.setValueAtTime(0.01, t);
    voiceGain.gain.linearRampToValueAtTime(0.85, t + 0.06);
    voiceGain.gain.setValueAtTime(0.75, t + 0.8);
    voiceGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    // Connect audio graph
    voiceOsc.connect(f1);
    voiceOsc.connect(f2);
    f1.connect(voiceGain);
    f2.connect(voiceGain);
    voiceGain.connect(this.masterGain);

    vibrato.start(t);
    voiceOsc.start(t);

    vibrato.stop(t + duration);
    voiceOsc.stop(t + duration);
  }

  // Round start buzzer
  playBuzzer() {
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.29);
  }

  // Victory Fanfare
  playVictoryFanfare() {
    this.ensureContext();
    if (!this.ctx) return;

    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.65);
    });
  }
}
