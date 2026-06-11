// ======================================================================
//  Ambient — gentle, chill soundscapes synthesized with Web Audio
//  (no audio files). Driven by the playlist; plays on demand, looping,
//  independent of the timer.
//  Types: 'rain', 'ocean', 'chimes', 'pad'. 'off' plays nothing.
//
//  Comfort: pink (not harsh white) noise, soft low-pass filtering, warm
//  low layers, a pentatonic scale for the chimes, and a smooth fade-in /
//  fade-out so nothing ever starts or stops with an abrupt "pop".
// ======================================================================
class Ambient {
  constructor() {
    this.ctx = null;
    this.master = null;    // user-volume gain (0..1), feeds the speakers
    this.fade = null;      // per-track fade gain (for smooth in/out)
    this.sources = [];     // continuously-playing nodes (to stop them)
    this.timers = [];      // setTimeout handles (e.g. the chime scheduler)
    this.type = "off";     // what's selected right now
    this.volume = 0.5;     // 0..1
  }

  // lazily create the AudioContext + master gain (resumes if suspended)
  _ac() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  // master volume (0..1) — applies live while playing
  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, Number(v) || 0));
    if (this.master) this.master.gain.value = this.volume;
  }

  // a short buffer we loop forever.
  // fill(prev, white) -> next sample; omit it for plain white noise.
  _noiseBuffer(ac, seconds, fill) {
    const len = Math.floor(ac.sampleRate * seconds);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    let prev = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      prev = fill ? fill(prev, white) : white;
      data[i] = prev;
    }
    return buf;
  }

  // pink noise (Paul Kellet's filter): -3dB/octave, far softer and more
  // natural-sounding than white noise.
  _pinkBuffer(ac, seconds) {
    const len = Math.floor(ac.sampleRate * seconds);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
    return buf;
  }

  // brown noise: a soft low rumble (running sum of white)
  _brownBuffer(ac, seconds) {
    return this._noiseBuffer(ac, seconds, (p, w) => (p + 0.02 * w) / 1.02);
  }

  _loop(ac, buffer) {
    const s = ac.createBufferSource();
    s.buffer = buffer; s.loop = true;
    this.sources.push(s);
    return s;
  }

  _filter(ac, kind, freq) {
    const f = ac.createBiquadFilter();
    f.type = kind; f.frequency.value = freq;
    return f;
  }

  // gentle slow modulation of an AudioParam so the texture isn't static
  _drift(ac, param, base, depth, rateHz) {
    param.value = base;
    const lfo = ac.createOscillator(); lfo.type = "sine"; lfo.frequency.value = rateHz;
    const amp = ac.createGain(); amp.gain.value = depth;
    lfo.connect(amp); amp.connect(param);
    this.sources.push(lfo); lfo.start();
  }

  // one soft bell note (sine + a quiet higher partial), long mellow decay
  _bell(ac, freq, dest) {
    const t = ac.currentTime;
    const env = ac.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.16, t + 0.04);   // soft attack
    env.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);  // long decay
    env.connect(dest);
    const o1 = ac.createOscillator(); o1.type = "sine"; o1.frequency.value = freq;
    const o2 = ac.createOscillator(); o2.type = "sine"; o2.frequency.value = freq * 2.01;
    const partial = ac.createGain(); partial.gain.value = 0.3;
    o1.connect(env); o2.connect(partial); partial.connect(env);
    o1.start(t); o2.start(t);
    o1.stop(t + 3.2); o2.stop(t + 3.2);
  }

  // start a soundscape (fades the previous one out first)
  play(type) {
    this.stop();
    if (!type || type === "off") return;
    const ac = this._ac();
    const fade = ac.createGain();         // everything routes through here for fade in/out
    fade.gain.value = 0.0001;
    fade.connect(this.master);

    if (type === "rain") {
      // band-limited pink hiss for the rainfall...
      const hiss = this._loop(ac, this._pinkBuffer(ac, 3));
      const hp = this._filter(ac, "highpass", 420);
      const lp = this._filter(ac, "lowpass", 4200);
      const hg = ac.createGain();
      hiss.connect(hp); hp.connect(lp); lp.connect(hg); hg.connect(fade);
      this._drift(ac, hg.gain, 0.5, 0.08, 0.12);
      hiss.start();
      // ...plus a warm distant rumble underneath
      const rumble = this._loop(ac, this._brownBuffer(ac, 4));
      const rlp = this._filter(ac, "lowpass", 180);
      const rg = ac.createGain();
      rumble.connect(rlp); rlp.connect(rg); rg.connect(fade);
      this._drift(ac, rg.gain, 1.2, 0.4, 0.05);
      rumble.start();

    } else if (type === "ocean") {
      // soft pink "wash" whose filter + level swell together like waves...
      const wash = this._loop(ac, this._pinkBuffer(ac, 4));
      const lp = this._filter(ac, "lowpass", 700);
      const g = ac.createGain();
      wash.connect(lp); lp.connect(g); g.connect(fade);
      this._drift(ac, lp.frequency, 700, 450, 0.09);   // 250..1150 Hz, ~11s waves
      this._drift(ac, g.gain, 0.7, 0.45, 0.09);
      wash.start();
      // ...over a deep, slow undertow
      const low = this._loop(ac, this._brownBuffer(ac, 4));
      const llp = this._filter(ac, "lowpass", 150);
      const lg = ac.createGain();
      low.connect(llp); llp.connect(lg); lg.connect(fade);
      this._drift(ac, lg.gain, 1.0, 0.3, 0.07);
      low.start();

    } else if (type === "chimes") {
      // soft bells picked at random from a C-major pentatonic scale,
      // spaced 1.2–3.8s apart — meditative and never busy
      const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];
      const playNote = () => {
        this._bell(ac, scale[Math.floor(Math.random() * scale.length)], fade);
        this.timers.push(setTimeout(playNote, 1200 + Math.random() * 2600));
      };
      playNote();

    } else if (type === "pad") {
      // warm sustained chord (C major), gently breathing — like a soft synth pad
      const chord = [130.81, 196.00, 261.63, 329.63];   // C3 · G3 · C4 · E4
      const lp = this._filter(ac, "lowpass", 1100);
      const bus = ac.createGain();
      lp.connect(bus); bus.connect(fade);
      chord.forEach((f, i) => {
        const o = ac.createOscillator();
        o.type = i % 2 ? "sine" : "triangle";
        o.frequency.value = f;
        if (o.detune) o.detune.value = (i - 1.5) * 4;   // slight spread for warmth
        const og = ac.createGain(); og.gain.value = 0.13;
        o.connect(og); og.connect(lp);
        this.sources.push(o); o.start();
      });
      this._drift(ac, bus.gain, 0.9, 0.18, 0.05);
    }

    // smooth fade-in (~0.8s)
    const now = ac.currentTime;
    fade.gain.setValueAtTime(0.0001, now);
    fade.gain.exponentialRampToValueAtTime(1, now + 0.8);
    this.fade = fade;
    this.type = type;
  }

  // fade the current sound out, then tear it down (so there's no "pop")
  stop() {
    this.timers.forEach((id) => clearTimeout(id));
    this.timers = [];
    const old = this.sources;
    const fade = this.fade;
    this.sources = [];
    this.fade = null;
    this.type = "off";
    if (!fade) return;
    if (this.ctx) {
      const now = this.ctx.currentTime;
      try {
        fade.gain.cancelScheduledValues(now);
        fade.gain.setValueAtTime(Math.max(0.0001, fade.gain.value), now);
        fade.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      } catch (_) { /* ignore */ }
      setTimeout(() => this._teardown(old, fade), 650);
    } else {
      this._teardown(old, fade);
    }
  }

  _teardown(sources, fade) {
    sources.forEach((s) => {
      try { s.stop(); } catch (_) { /* already stopped */ }
      try { s.disconnect(); } catch (_) { /* already gone */ }
    });
    if (fade) { try { fade.disconnect(); } catch (_) { /* already gone */ } }
  }
}
