// All sound is synthesized with WebAudio (no sample files).
let ac = null, master = null, amb = null, heart = null;
export function audioStart() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  master = ac.createGain(); master.gain.value = 0.8; master.connect(ac.destination);
  // ambient drone: two detuned low saws through a slow-moving lowpass
  amb = ac.createGain(); amb.gain.value = 0.0; amb.connect(master);
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; lp.Q.value = 6; lp.connect(amb);
  for (const f of [41, 41.6, 61.7]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const g = ac.createGain(); g.gain.value = 0.18; o.connect(g); g.connect(lp); o.start(); }
  const lfo = ac.createOscillator(); lfo.frequency.value = 0.07; const lg = ac.createGain(); lg.gain.value = 120; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
  // electrical hum
  const hum = ac.createOscillator(); hum.frequency.value = 50; hum.type = 'square'; const hg = ac.createGain(); hg.gain.value = 0.012; hum.connect(hg); hg.connect(amb); hum.start();
  amb.gain.linearRampToValueAtTime(0.5, ac.currentTime + 3);
}
const now = () => (ac ? ac.currentTime : 0);
function noiseBuf(d) { const b = ac.createBuffer(1, Math.max(1, ac.sampleRate * d | 0), ac.sampleRate), x = b.getChannelData(0); for (let i = 0; i < x.length; i++) x[i] = Math.random() * 2 - 1; return b; }
function out(vol = 1, pan = 0) { const g = ac.createGain(); g.gain.value = vol; if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); p.connect(master); } else g.connect(master); return g; }
function noise(d, vol, f0, f1, type = 'bandpass', pan = 0, q = 1) {
  if (!ac) return; const s = ac.createBufferSource(); s.buffer = noiseBuf(d); const fl = ac.createBiquadFilter(); fl.type = type; fl.Q.value = q;
  fl.frequency.setValueAtTime(f0, now()); fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), now() + d);
  const g = out(0, pan); g.gain.setValueAtTime(vol, now()); g.gain.exponentialRampToValueAtTime(0.001, now() + d); s.connect(fl); fl.connect(g); s.start(); s.stop(now() + d);
}
function tone(f, d, vol, type = 'sine', f1 = null, pan = 0, at = 0) {
  if (!ac) return; const o = ac.createOscillator(); o.type = type; const t0 = now() + at; o.frequency.setValueAtTime(f, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + d);
  const g = out(0, pan); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d); o.connect(g); o.start(t0); o.stop(t0 + d + 0.05);
}
export const sfx = {
  step(run, pan = 0, vol = 1) { noise(0.09, (run ? 0.22 : 0.12) * vol, 900, 200, 'lowpass', pan); },
  door() { noise(0.6, 0.25, 3000, 300, 'bandpass', 0, 2); tone(90, 0.5, 0.08, 'sawtooth', 60); },
  locked() { tone(160, 0.12, 0.12, 'square'); tone(120, 0.18, 0.12, 'square', null, 0, 0.13); },
  pickup() { tone(880, 0.12, 0.12, 'triangle'); tone(1320, 0.2, 0.1, 'triangle', null, 0, 0.08); },
  solved() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 0.12, 'triangle', null, 0, i * 0.09)); },
  wrong() { tone(200, 0.25, 0.14, 'sawtooth', 120); },
  click() { tone(1200, 0.03, 0.08, 'square'); },
  beep(at) { tone(1000, 0.12, 0.14, 'square', null, 0, at); },
  flicker() { noise(0.15, 0.08, 4000, 2000, 'highpass'); tone(120, 0.12, 0.05, 'square'); },
  glass() { noise(1.2, 0.5, 6000, 1500, 'highpass', 0, 0.5); for (let i = 0; i < 8; i++) tone(2000 + Math.random() * 3000, 0.3, 0.05, 'sine', null, 0, Math.random() * 0.4); },
  bottle(pan, vol) { noise(0.5, 0.35 * vol, 5000, 1200, 'highpass', pan); tone(2600, 0.2, 0.06 * vol, 'sine', null, pan); },
  growl(pan = 0, vol = 1) { if (!ac) return; const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, now()); o.frequency.linearRampToValueAtTime(48, now() + 1.2);
    const m = ac.createOscillator(); m.frequency.value = 23; const mg = ac.createGain(); mg.gain.value = 25; m.connect(mg); mg.connect(o.frequency);
    const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 500; const g = out(0, pan); g.gain.setValueAtTime(0.001, now()); g.gain.linearRampToValueAtTime(0.25 * vol, now() + 0.2); g.gain.exponentialRampToValueAtTime(0.001, now() + 1.3);
    o.connect(fl); fl.connect(g); o.start(); m.start(); o.stop(now() + 1.4); m.stop(now() + 1.4); noise(1.2, 0.08 * vol, 600, 300, 'bandpass', pan, 3); },
  shriek(pan = 0, vol = 1) { tone(900, 0.9, 0.12 * vol, 'sawtooth', 2400, pan); tone(1300, 0.9, 0.08 * vol, 'square', 600, pan); noise(0.9, 0.2 * vol, 3000, 6000, 'bandpass', pan, 4); },
  scream() { tone(500, 1.4, 0.35, 'sawtooth', 1800); tone(740, 1.4, 0.25, 'square', 300); noise(1.4, 0.6, 2000, 7000, 'bandpass', 0, 1); tone(55, 1.5, 0.4, 'sine', 30); },
  sniff(pan) { for (let i = 0; i < 3; i++) setTimeout(() => noise(0.12, 0.12, 2500, 1500, 'bandpass', pan, 2), i * 160); },
  whisper(pan) { noise(1.4, 0.1, 1800, 3500, 'bandpass', pan, 6); },
  voice(pan) { // the wendigo copies a friend's call: a short formant-like "hey"
    if (!ac) return; const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(190, now()); o.frequency.linearRampToValueAtTime(150, now() + 0.5);
    const f1 = ac.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.setValueAtTime(700, now()); f1.frequency.linearRampToValueAtTime(400, now() + 0.5); f1.Q.value = 5;
    const g = out(0, pan); g.gain.setValueAtTime(0.001, now()); g.gain.linearRampToValueAtTime(0.18, now() + 0.06); g.gain.linearRampToValueAtTime(0.0001, now() + 0.55); o.connect(f1); f1.connect(g); o.start(); o.stop(now() + 0.6); },
  elevator() { tone(60, 2.5, 0.12, 'sawtooth', 55); noise(2.5, 0.06, 400, 300, 'lowpass'); tone(880, 0.4, 0.1, 'sine', null, 0, 2.3); },
  alarm() { for (let i = 0; i < 4; i++) { tone(700, 0.35, 0.1, 'square', 500, 0, i * 0.7); } },
  ding() { tone(1320, 0.6, 0.1, 'sine'); tone(990, 0.8, 0.08, 'sine', null, 0, 0.25); },
};
export function setHeartbeat(level) { // 0..1, faster and louder as a monster gets closer
  if (!ac) return; heart = heart || { next: 0 };
  if (level < 0.05) return; const t = now(); if (t < heart.next) return;
  const gap = 1.1 - level * 0.65; heart.next = t + gap;
  tone(55, 0.12, 0.25 * level, 'sine', 40); tone(50, 0.14, 0.2 * level, 'sine', 38, 0, 0.18);
}
export function setAmbient(v) { if (amb) amb.gain.setTargetAtTime(v, now(), 0.5); }
export function volume(v) { if (master) master.gain.value = v; }
