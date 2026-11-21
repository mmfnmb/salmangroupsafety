// Synthesises the intro film's soundtrack (music + sound effects timed to the shots) as a WAV file.
// Usage: node film/audio.cjs out.wav
const fs = require('fs');
const SR = 44100, DUR = 66.4, N = Math.ceil(SR * DUR);
const L = new Float32Array(N);
const noteHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296) * 2 - 1;
function add(t0, dur, fn, vol = 1) { const a = Math.floor(t0 * SR), n = Math.floor(dur * SR); for (let i = 0; i < n && a + i < N; i++) { const t = i / SR; L[a + i] += fn(t, t / dur) * vol; } }
const sq = (f, t) => (Math.sin(2 * Math.PI * f * t) > 0 ? 1 : -1);
const tri = (f, t) => 2 * Math.abs(2 * ((f * t) % 1) - 1) - 1;
const env = (k, a = 0.02, r = 0.3) => Math.min(1, k / a) * Math.max(0, 1 - Math.max(0, k - (1 - r)) / r);

// ---- music: bouncy 4-chord loop, 126 bpm, with dips under the title cards
const BPM = 126, beat = 60 / BPM, chords = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]];
const quiet = [[26, 28.2], [44.4, 46.8], [53.2, 57.4]];
const lvl = (t) => (quiet.some(([a, b]) => t > a && t < b) ? 0.35 : 1) * Math.min(1, t / 1.5) * Math.min(1, (DUR - t) / 2);
for (let b = 0; b * beat < DUR - 0.2; b++) {
  const t = b * beat, bar = Math.floor(b / 4), ch = chords[bar % 4], g = lvl(t);
  add(t, 0.18, (x) => Math.sin(2 * Math.PI * (55 + 120 * Math.exp(-x * 30)) * x) * Math.exp(-x * 14), 0.55 * g); // kick
  if (b % 2 === 1) add(t, 0.16, (x) => rnd() * Math.exp(-x * 22), 0.22 * g); // snare
  add(t + beat / 2, 0.05, (x) => rnd() * Math.exp(-x * 60), 0.08 * g); // hat
  add(t, beat * 0.9, (x, k) => sq(noteHz(ch[0] - 24), x) * env(k, 0.01, 0.4), 0.09 * g); // bass
  for (let s = 0; s < 4; s++) add(t + (s * beat) / 4, beat / 4.2, (x, k) => tri(noteHz(ch[(b * 4 + s) % 3] + 12), x) * env(k, 0.005, 0.6), 0.07 * g); // arpeggio
}
const melody = [72, 74, 76, 79, 76, 74, 72, 67, 69, 72, 74, 72, 69, 67, 64, 67];
for (let i = 0; i * beat * 2 < DUR - 1; i++) { const t = i * beat * 2, m = melody[i % melody.length]; if ((Math.floor(i / 16) % 2) === 0) add(t, beat * 1.8, (x, k) => (sq(noteHz(m), x) * 0.4 + tri(noteHz(m), x) * 0.6) * env(k, 0.02, 0.5) * (1 + 0.02 * Math.sin(x * 30)), 0.06 * lvl(t)); }

// ---- effects
const whistle = (t) => add(t, 0.9, (x, k) => Math.sin(2 * Math.PI * (2900 + 220 * Math.sin(x * 70)) * x) * env(k, 0.02, 0.2), 0.32);
const hit = (t) => { add(t, 0.3, (x) => rnd() * Math.exp(-x * 12), 0.5); add(t, 0.35, (x) => Math.sin(2 * Math.PI * (140 - 90 * x) * x) * Math.exp(-x * 8), 0.5); };
const boing = (t) => add(t, 0.45, (x) => Math.sin(2 * Math.PI * (180 + 900 * x) * x) * Math.exp(-x * 5), 0.35);
const whoosh = (t, d = 0.8) => add(t, d, (x, k) => rnd() * Math.sin(k * Math.PI), 0.25);
const cheer = (t, d = 2.6) => add(t, d, (x, k) => rnd() * (0.6 + 0.4 * Math.sin(x * 9)) * Math.sin(Math.min(1, k * 4) * Math.PI / 2) * (1 - k), 0.45);
const fanfare = (t) => [72, 76, 79, 84].forEach((m, i) => add(t + i * 0.11, 0.35, (x, k) => sq(noteHz(m), x) * env(k, 0.01, 0.5), 0.13));
const splash = (t) => { add(t, 1.2, (x) => rnd() * Math.exp(-x * 3.5), 0.55); add(t, 0.5, (x) => Math.sin(2 * Math.PI * (300 - 200 * x) * x) * Math.exp(-x * 6), 0.4); };
const sad = (t) => [67, 65, 64, 60].forEach((m, i) => add(t + i * 0.32, 0.4, (x, k) => tri(noteHz(m), x) * env(k, 0.01, 0.6), 0.2));
const slam = (t) => { add(t, 0.6, (x) => Math.sin(2 * Math.PI * (90 - 40 * x) * x) * Math.exp(-x * 5), 0.7); add(t, 0.4, (x) => rnd() * Math.exp(-x * 9), 0.35); fanfare(t + 0.15); };

whistle(5.2); boing(6.0); whoosh(7.4, 1.2);
whoosh(11.9, 0.4); hit(12.25); whoosh(12.4, 1.4);
boing(15.5); whoosh(17.2, 1.6); whoosh(19.5, 1.2);
cheer(23.6); fanfare(23.7);
whistle(26.4); hit(30.3); cheer(30.7); fanfare(30.8);
whoosh(35.2, 0.5); whoosh(37.0, 0.5); cheer(38.8); fanfare(38.9);
hit(39.5); boing(41.3); hit(41.6); cheer(42.0, 3); fanfare(42.1);
whoosh(48.2, 1.0); hit(49.8); boing(49.9); whoosh(50.4, 2.5);
splash(54.8); sad(56.0);
whistle(59.0); whoosh(59.8, 1.4); slam(62.0);

// ---- write 16-bit mono WAV (soft-clipped)
const buf = Buffer.alloc(44 + N * 2);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) buf.writeInt16LE(Math.round(Math.tanh(L[i] * 1.2) * 30000), 44 + i * 2);
fs.writeFileSync(process.argv[2] || 'intro.wav', buf);
console.log('wrote', DUR, 's');
