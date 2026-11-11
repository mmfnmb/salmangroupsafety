// Bolt Dash, world quality file 2 of 2: the sound of a living city. Loaded only when a game or the open world starts.
// Traffic humming around you, wind, birds in the morning, crickets at night, rain and thunder, your footsteps
// (asphalt or grass), your car's engine that rises with the speed, tyres screeching, and a car radio with stations.
// Almost everything is made by the sound chip itself, so it costs nothing to download; only the radio music is files.
const B = window.__BD, { G, save } = B;
let ac = null, master = null, beds = null, t = 0;
const STATIONS = [['radio-drive', 'Bolt FM'], ['radio-dance', 'Dance 99'], ['radio-swing', 'Swing Radio'], ['radio-chill', 'Chill Wave'], [null, 'Radio off']];
let station = 0, radio = null, radioBtn = null;

function start() {
  if (ac) return true;
  try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return false; }
  master = ac.createGain(); master.gain.value = 0.7; master.connect(ac.destination);
  const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = nb.getChannelData(0); let b = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b = (b + 0.02 * w) / 1.02; d[i] = w; } // white noise
  const brown = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), e = brown.getChannelData(0); let last = 0;
  for (let i = 0; i < e.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; e[i] = last * 3.5; }
  const loop = (buf) => { const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; };
  const chain = (src, ...nodes) => { let n = src; for (const x of nodes) { n.connect(x); n = x; } n.connect(master); return nodes[nodes.length - 1]; };
  const filt = (type, f, q = 0.7) => { const x = ac.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x; };
  const gain = (v = 0) => { const g = ac.createGain(); g.gain.value = v; return g; };
  beds = {
    traffic: chain(loop(brown), filt('lowpass', 420), gain()),
    wind: chain(loop(nb), filt('bandpass', 500, 0.5), gain()),
    rain: chain(loop(nb), filt('highpass', 900), filt('lowpass', 7000), gain()),
    screech: chain(loop(nb), filt('bandpass', 2400, 6), gain()),
  };
  // engine: two buzzing oscillators through a filter
  const o1 = ac.createOscillator(), o2 = ac.createOscillator(), ef = filt('lowpass', 400, 2), eg = gain(); o1.type = 'sawtooth'; o2.type = 'square'; o1.connect(ef); o2.connect(ef); ef.connect(eg); eg.connect(master); o1.start(); o2.start();
  beds.engine = { o1, o2, ef, eg };
  B.noise = nb; return true;
}
const set = (g, v, k = 0.15) => g.gain.setTargetAtTime(v, ac.currentTime, k);
function blip({ f0, f1 = f0, dur = 0.1, type = 'sine', vol = 0.05, noise = false, band = 1000, q = 1, delay = 0 }) {
  const at = ac.currentTime + delay, g = ac.createGain(); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + Math.min(0.01, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  let src;
  if (noise) { src = ac.createBufferSource(); src.buffer = B.noise; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = band; f.Q.value = q; src.connect(f); f.connect(g); }
  else { src = ac.createOscillator(); src.type = type; src.frequency.setValueAtTime(f0, at); src.frequency.exponentialRampToValueAtTime(Math.max(20, f1), at + dur); src.connect(g); }
  g.connect(master); src.start(at); src.stop(at + dur + 0.05);
}
const bird = () => { const base = 2200 + Math.random() * 1800, n = 2 + (Math.random() * 4 | 0); for (let i = 0; i < n; i++) blip({ f0: base, f1: base * (1.2 + Math.random() * 0.4), dur: 0.07 + Math.random() * 0.06, vol: 0.025, delay: i * 0.11 }); };
const cricket = () => { for (let i = 0; i < 6; i++) blip({ f0: 4600, dur: 0.025, type: 'triangle', vol: 0.012, delay: i * 0.045 }); };
const thunder = () => { blip({ noise: true, band: 90, q: 0.4, dur: 3.5, vol: 0.9 }); blip({ noise: true, band: 220, q: 0.6, dur: 1.2, vol: 0.35, delay: 0.1 }); };
const horn = () => { blip({ f0: 420, dur: 0.35, type: 'square', vol: 0.03 }); blip({ f0: 520, dur: 0.35, type: 'square', vol: 0.025 }); };

function setStation(i) {
  station = i; const [file, name] = STATIONS[i];
  if (radio) { radio.pause(); radio = null; }
  if (file && !save.muted) { radio = new Audio(`./world/audio/${file}.mp3`); radio.loop = true; radio.volume = 0.32; radio.play().catch(() => {}); }
  if (radioBtn) radioBtn.textContent = '📻 ' + name;
}
function ensureBtn() {
  if (radioBtn) return; radioBtn = document.createElement('button'); radioBtn.id = 'radioBtn';
  Object.assign(radioBtn.style, { position: 'fixed', left: '50%', top: '14px', transform: 'translateX(-50%)', zIndex: 6, padding: '6px 14px', borderRadius: '999px', border: '2px solid #fff', background: 'rgba(20,22,40,.75)', color: '#fff', font: '700 14px system-ui', display: 'none' });
  radioBtn.onclick = (e) => { e.stopPropagation(); setStation((station + 1) % STATIONS.length); };
  document.body.appendChild(radioBtn);
  addEventListener('keydown', (e) => { if (e.code === 'KeyR' && G.modeObj?.driving) setStation((station + 1) % STATIONS.length); });
}

let stepT = 0, birdT = 2, cricketT = 1, hornT = 5, thunderAt = 0, wasDriving = false;
function frame(dt) {
  t += dt;
  const w = G.modeObj, world = w?.id === 'world' && w.city;
  if (!world || save.muted || document.hidden) { if (ac && beds) { for (const k of ['traffic', 'wind', 'rain', 'screech']) set(beds[k], 0, 0.3); set(beds.engine.eg, 0, 0.1); } if (radio) setStation(STATIONS.length - 1); if (radioBtn) radioBtn.style.display = 'none'; wasDriving = false; return; }
  if (!start()) return; if (ac.state === 'suspended') ac.resume();
  ensureBtn();
  const p = G.player?.pos, inside = !!w.inside, W = B.weather || { rain: 0 }, el = Math.sin((w.day ?? 0.3) * Math.PI * 2), dayNow = el > 0.05, night = el < -0.05;
  const cars = (w.traffic?.cars || []).filter((c) => c.live); let near = 0; if (p) for (const c of cars) { const d = Math.hypot(c.x - p.x, c.z - p.z); near += Math.max(0, 1 - d / 70) * Math.min(1, c.v / 8); }
  const muffle = inside ? 0.2 : 1;
  set(beds.traffic, (0.025 + Math.min(0.12, near * 0.04)) * muffle, 0.4);
  set(beds.wind, (0.012 + 0.01 * Math.sin(t * 0.3) ** 2 + (w.driving ? Math.min(0.05, Math.abs(w.driving.v) * 0.002) : 0)) * muffle, 0.5);
  set(beds.rain, W.rain * 0.22 * (inside ? 0.35 : 1), 0.6);
  // engine
  const dc = w.driving, en = beds.engine;
  if (dc) { const sp = Math.abs(dc.v), gear = sp % 9 / 9, f = 38 + sp * 2.2 + gear * 30; en.o1.frequency.setTargetAtTime(f, ac.currentTime, 0.05); en.o2.frequency.setTargetAtTime(f * 0.5, ac.currentTime, 0.05); en.ef.frequency.setTargetAtTime(300 + sp * 40, ac.currentTime, 0.1); set(en.eg, 0.05 + Math.min(0.06, sp * 0.002), 0.1); }
  else set(en.eg, 0, 0.1);
  set(beds.screech, dc && Math.abs(dc.v) > 9 && G.player?.jumpBuf > 0 ? 0.06 : 0, 0.05);
  // radio comes on when you get in a car
  if (dc && !wasDriving) setStation(station === STATIONS.length - 1 ? STATIONS.length - 1 : station);
  if (!dc && wasDriving && radio) { radio.pause(); radio = null; }
  wasDriving = !!dc; radioBtn.style.display = dc ? '' : 'none';
  // footsteps: harder on the street, softer on grass
  const pl = G.player; if (pl && !dc && !inside && pl.grounded !== false) { const sp = Math.hypot(pl.body.velocity.x, pl.body.velocity.z); if (sp > 1.5) { stepT -= dt * (sp / 6); if (stepT <= 0) { stepT = 0.38; const grass = w.city.blocks.some((b) => (b.type === 'park' || b.type === 'suburb') && Math.abs(p.x - b.cx) < 29 && Math.abs(p.z - b.cz) < 29); blip({ noise: true, band: grass ? 380 : 1100, q: grass ? 0.8 : 1.6, dur: grass ? 0.09 : 0.05, vol: grass ? 0.05 : 0.07 }); } } }
  // birds by day (more near trees), crickets at night, horns in traffic jams
  if (!inside && W.rain < 0.4) {
    birdT -= dt; if (dayNow && birdT <= 0) { birdT = 1.5 + Math.random() * 4; bird(); }
    cricketT -= dt; if (night && cricketT <= 0) { cricketT = 0.6 + Math.random() * 1.5; cricket(); }
  }
  hornT -= dt; if (hornT <= 0) { hornT = 6 + Math.random() * 12; if (cars.some((c) => c.v < 0.5 && p && Math.hypot(c.x - p.x, c.z - p.z) < 50)) horn(); }
  // thunder follows the lightning
  if (W.flash > 0.15 && W.flashAt !== thunderAt) { thunderAt = W.flashAt; setTimeout(thunder, 400 + Math.random() * 1600); }
}
B.hooks.push(frame);
B.life = { setStation };
