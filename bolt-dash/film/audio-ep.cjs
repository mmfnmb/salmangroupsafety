// Soundtrack for an episode, synthesized from scratch (no samples): a music bed whose mood follows the scene cues,
// plus light effects at subtitle starts. Usage: node film/audio-ep.cjs cues.json subs.json total out.wav
const fs = require('fs');
const [cuesF, subsF, totalS, outF] = process.argv.slice(2);
const CUES = JSON.parse(fs.readFileSync(cuesF)), SUBS = JSON.parse(fs.readFileSync(subsF)), DUR = +totalS;
const SR = 32000, N = Math.ceil(SR * DUR), L = new Float32Array(N);
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
let seed = 9; const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296) * 2 - 1;
function add(t0, dur, fn, vol = 1) { const a = Math.floor(t0 * SR), n = Math.floor(dur * SR); for (let i = 0; i < n && a + i < N; i++) { if (a + i < 0) continue; const t = i / SR; L[a + i] += fn(t, t / dur) * vol; } }
const tri = (f, t) => 2 * Math.abs(2 * ((f * t) % 1) - 1) - 1, sq = (f, t) => (Math.sin(2 * Math.PI * f * t) > 0 ? 1 : -1);
const env = (k, a = 0.02, r = 0.3) => Math.min(1, k / a) * Math.max(0, 1 - Math.max(0, k - (1 - r)) / r);
// mood -> tempo, chord progression (midi roots + quality), drums, lead density, level
const MOOD = {
  title: { bpm: 110, prog: [[60, 'M'], [65, 'M'], [67, 'M'], [60, 'M']], drums: 0, lead: 0.6, lvl: 0.8 },
  cozy: { bpm: 84, prog: [[60, 'M'], [57, 'm'], [65, 'M'], [67, 'M']], drums: 0.3, lead: 0.5, lvl: 0.55 },
  playful: { bpm: 128, prog: [[62, 'M'], [67, 'M'], [64, 'm'], [69, 'M']], drums: 1, lead: 0.8, lvl: 0.6 },
  news: { bpm: 118, prog: [[65, 'M'], [62, 'm'], [70, 'M'], [72, 'M']], drums: 0.7, lead: 0.4, lvl: 0.45 },
  ominous: { bpm: 70, prog: [[57, 'm'], [53, 'M'], [55, 'M'], [52, 'M']], drums: 0.4, lead: 0.2, lvl: 0.6 },
  upbeat: { bpm: 132, prog: [[60, 'M'], [55, 'M'], [57, 'm'], [53, 'M']], drums: 1, lead: 0.9, lvl: 0.6 },
  epic: { bpm: 120, prog: [[62, 'M'], [58, 'M'], [60, 'M'], [57, 'M']], drums: 1, lead: 1, lvl: 0.75 },
  tense: { bpm: 76, prog: [[52, 'm'], [52, 'm'], [53, 'M'], [51, 'M']], drums: 0.3, lead: 0.15, lvl: 0.5 },
  end: { bpm: 100, prog: [[60, 'M'], [67, 'M'], [65, 'M'], [60, 'M']], drums: 0.5, lead: 0.5, lvl: 0.6 },
};
const chord = (r, q) => [r, r + (q === 'm' ? 3 : 4), r + 7];
for (let ci = 0; ci < CUES.length; ci++) {
  const c = CUES[ci], m = MOOD[c.mood] || MOOD.cozy, t0 = c.t, t1 = ci + 1 < CUES.length ? CUES[ci + 1].t : DUR, beat = 60 / m.bpm;
  for (let b = 0; t0 + b * beat < t1 - 0.05; b++) {
    const t = t0 + b * beat, bar = Math.floor(b / 4), [root, q] = m.prog[bar % m.prog.length], ch = chord(root, q);
    const fade = Math.min(1, (t - t0) / 1.2, (t1 - t) / 1.2), g = m.lvl * Math.max(0, fade);
    // pad / bass
    if (b % 4 === 0) { for (const n of ch) add(t, beat * 4, (x, k) => (tri(hz(n), x) * 0.6 + Math.sin(2 * Math.PI * hz(n) * x) * 0.4) * env(k, 0.15, 0.4), 0.035 * g); add(t, beat * 3.6, (x, k) => sq(hz(root - 24), x) * env(k, 0.01, 0.5), 0.05 * g); }
    if (m.drums > 0) {
      if (b % 2 === 0) add(t, 0.16, (x) => Math.sin(2 * Math.PI * (55 + 110 * Math.exp(-x * 30)) * x) * Math.exp(-x * 14), 0.4 * g * m.drums);
      if (b % 2 === 1 && m.drums > 0.5) add(t, 0.14, (x) => rnd() * Math.exp(-x * 22), 0.14 * g * m.drums);
      add(t + beat / 2, 0.04, (x) => rnd() * Math.exp(-x * 70), 0.05 * g * m.drums);
    }
    // lead: arpeggio notes, density by mood
    for (let s = 0; s < 2; s++) if (((b * 7 + s * 3) % 10) / 10 < m.lead) { const n = ch[(b + s) % 3] + 12; add(t + s * beat / 2, beat / 2.2, (x, k) => tri(hz(n), x) * env(k, 0.01, 0.6), 0.05 * g); }
  }
}
// dialogue blips: a soft 'chirp' when a line starts (characters 'talk' without voices)
for (const s of SUBS) { if (!s.text) continue; const n = 72 + ((s.who || "").length * 3) % 7; for (let i = 0; i < Math.min(4, Math.ceil(s.text.length / 12)); i++) add(s.start + i * 0.13, 0.09, (x, k) => Math.sin(2 * Math.PI * hz(n + (i % 2) * 2) * x * (1 + k * 0.2)) * env(k, 0.05, 0.5), 0.08); }
const buf = Buffer.alloc(44 + N * 2);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) buf.writeInt16LE(Math.round(Math.tanh(L[i] * 1.3) * 28000), 44 + i * 2);
fs.writeFileSync(outF, buf); console.log('wrote', outF, DUR, 's');
