/* Chimes & twinkles synthesised with Web Audio, so there are no sound files to host. */
const Sfx = (() => {
  let ctx, master, wet;

  function init() {
    if (ctx) { ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.55;
    // small hall reverb from a decaying noise impulse
    const len = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    const verb = ctx.createConvolver(); verb.buffer = ir;
    wet = ctx.createGain(); wet.gain.value = 0.45;
    master.connect(ctx.destination);
    wet.connect(verb).connect(ctx.destination);
    return ctx;
  }

  function bell(freq, t, dur = 2.4, gain = 0.25) {
    const partials = [[1, 1], [2.0, 0.42], [3.01, 0.24], [4.18, 0.13], [5.43, 0.07]];
    partials.forEach(([ratio, g], i) => {
      if (freq * ratio > ctx.sampleRate * 0.45) return;   // above hearing / Nyquist: skip rather than clamp
      const o = ctx.createOscillator(), e = ctx.createGain();
      o.type = "sine"; o.frequency.value = freq * ratio;
      const d = dur / Math.sqrt(i + 1);
      e.gain.setValueAtTime(0, t);
      e.gain.linearRampToValueAtTime(gain * g, t + 0.004);
      e.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(e); e.connect(master); e.connect(wet);
      o.start(t); o.stop(t + d + 0.05);
    });
  }

  function whoosh(t, dur = 0.9, gain = 0.18) {
    const n = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate), d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = n;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(500, t); bp.frequency.exponentialRampToValueAtTime(5200, t + dur);
    const e = ctx.createGain();
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(gain, t + dur * 0.35); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(e); e.connect(master); e.connect(wet);
    src.start(t);
  }

  const PENTA = [2093, 2349.3, 2637, 3136, 3520, 4186, 4698.6];

  function twinkle(t, count = 10, spread = 1.2, gain = 0.07) {
    for (let i = 0; i < count; i++) {
      bell(PENTA[(Math.random() * PENTA.length) | 0], t + Math.random() * spread, 0.9, gain * (0.6 + Math.random() * 0.6));
    }
  }

  // The full seal-opening cue, timed to the animation in script.js
  function magic() {
    if (!init()) return;
    const t = ctx.currentTime + 0.02;
    bell(659.3, t, 3.2, 0.16);                         // soft low bell on tap
    [1318.5, 1661.2, 1975.5, 2637].forEach((f, i) => bell(f, t + 0.08 + i * 0.075, 2.6, 0.17));
    twinkle(t + 0.35, 8, 0.5, 0.06);                   // sparkles as the seal cracks
    whoosh(t + 0.6, 1.0, 0.14);                        // flap opens
    [2637, 3136, 3951, 5274].forEach((f, i) => bell(f, t + 1.35 + i * 0.09, 1.8, 0.09));   // card rises
    twinkle(t + 1.4, 14, 1.4, 0.05);
    [1046.5, 1318.5, 1568, 2093].forEach((f) => bell(f, t + 2.45, 3.4, 0.08));             // reveal chord
  }

  function tap() {
    if (!init()) return;
    const t = ctx.currentTime + 0.01;
    bell(PENTA[(Math.random() * 4) | 0], t, 1, 0.06);
  }

  return { magic, twinkle: () => init() && twinkle(ctx.currentTime, 10, 1, 0.06), tap };
})();
