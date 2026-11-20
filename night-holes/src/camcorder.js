// The video camera: green night vision, REC overlay, its own battery. Everything filmed is kept on this device
// (IndexedDB) and shown under "Recordings" on the start screen, together with automatic "close calls": the last
// seconds before a monster got within a few metres, filmed from a camera following behind you.
import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const W = 192, H = 108, FPS = 5, RING = FPS * 8, AFTER = FPS * 4;
const NV = 'grayscale(1) brightness(1.7) contrast(1.2) sepia(1) hue-rotate(60deg) saturate(3.2)';

// ---------------------------------------------------------------- storage
let dbp = null;
function db() { if (!dbp) dbp = new Promise((ok) => { try { const r = indexedDB.open('nh-recordings', 1); r.onupgradeneeded = () => r.result.createObjectStore('clips', { keyPath: 'id' }); r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); } catch (e) { ok(null); } }); return dbp; }
async function store(mode, val) { const d = await db(); if (!d) return mode === 'all' ? memClips.slice() : null; return new Promise((ok) => { try { const tx = d.transaction('clips', mode === 'all' ? 'readonly' : 'readwrite'), st = tx.objectStore('clips');
  const r = mode === 'put' ? st.put(val) : mode === 'del' ? st.delete(val) : st.getAll(); r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); } catch (e) { ok(null); } }); }
const memClips = []; // used when the browser refuses IndexedDB
export async function saveClip(c) { const ok = await store('put', c); if (ok === null) { memClips.push(c); } }
export const listClips = async () => ((await store('all')) || memClips).sort((a, b) => b.date - a.date);
export const deleteClip = async (id) => { await store('del', id); const i = memClips.findIndex((c) => c.id === id); if (i >= 0) memClips.splice(i, 1); };

// ---------------------------------------------------------------- the camera itself
export class Camcorder {
  constructor(renderer, post) { this.r = renderer; this.post = post; this.on = false; this.battery = 1; this.rec = []; this.recT = 0; this.capT = 0; this.ring = []; this.pending = null; this.cool = 0;
    this.cv = document.createElement('canvas'); this.cv.width = W; this.cv.height = H; this.g = this.cv.getContext('2d', { willReadFrequently: true });
    this.rt = new THREE.WebGLRenderTarget(W, H); this.chase = new THREE.PerspectiveCamera(70, W / H, 0.05, 60); this.px = new Uint8Array(W * H * 4); this.img = this.g.createImageData(W, H); }
  toggle() { if (!this.on && this.battery <= 0.01) return false; this.on = !this.on; $('view').classList.toggle('nv', this.on); $('camHud').hidden = !this.on; if (!this.on) this.flushManual(); else this.rec = []; return true; }
  addBattery(v) { this.battery = Math.min(1, this.battery + v); }
  // manual footage: what you see, already green, while the camera is up
  afterRender(dt, view, game) {
    if (this.on) { this.battery = Math.max(0, this.battery - dt / 150); if (this.battery <= 0) this.toggle();
      this.recT += dt; if (this.recT >= 1 / FPS) { this.recT = 0; this.g.filter = NV; this.g.drawImage(view, 0, 0, W, H); this.g.filter = 'none'; this.rec.push(this.cv.toDataURL('image/jpeg', 0.6)); if (this.rec.length >= FPS * 30) this.flushManual(); }
      const s = Math.floor(game.t), m = Math.floor(s / 60); $('camTime').textContent = `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; $('camBatt').style.width = this.battery * 100 + '%'; $('camRec').style.opacity = Math.floor(game.t * 2) % 2 ? 1 : 0.2; } }
  flushManual() { if (this.rec.length > FPS) saveClip({ id: 'm' + Date.now(), date: Date.now(), kind: 'manual', label: 'CAM', frames: this.rec, fps: FPS }); this.rec = []; }
  // close calls: a small camera that follows a few metres behind and above you, filmed into a ring of 8 seconds
  watch(dt, scene, P, FLOOR_Y, monsters, game) {
    this.capT += dt; this.cool = Math.max(0, this.cool - dt); if (this.capT < (this.r.getPixelRatio() < 1.2 ? 1.6 : 1) / FPS) return; this.capT = 0;
    const back = 3.2, fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw); this.chase.position.set(P.x - fx * back, FLOOR_Y[P.f] + 2.6, P.z - fz * back); this.chase.lookAt(P.x + fx * 2, FLOOR_Y[P.f] + 0.9, P.z + fz * 2);
    const prev = this.r.getRenderTarget(); this.r.setRenderTarget(this.rt); this.r.render(scene, this.chase); this.r.readRenderTargetPixels(this.rt, 0, 0, W, H, this.px); this.r.setRenderTarget(prev);
    // flip rows and turn it green, like an old security tape
    const d = this.img.data; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const s = ((H - 1 - y) * W + x) * 4, o = (y * W + x) * 4; const l = Math.min(255, (this.px[s] * 0.3 + this.px[s + 1] * 0.59 + this.px[s + 2] * 0.11) * 2.2 + Math.random() * 26); d[o] = l * 0.35; d[o + 1] = l; d[o + 2] = l * 0.4; d[o + 3] = 255; }
    this.ring.push(new ImageData(new Uint8ClampedArray(d), W, H)); if (this.ring.length > RING) this.ring.shift();
    // a monster this close that is not catching you: keep the moment
    let near = null; for (const m of monsters) if (m.root && m.active && !m.inTube && m.f === P.f && m.alpha > 0.5) { const dd = Math.hypot(m.x - P.x, m.z - P.z); if (!near || dd < near.d) near = { m, d: dd }; }
    if (this.pending) { this.pending.min = Math.min(this.pending.min, near ? near.d : 99); this.pending.left--; if (this.pending.left <= 0) { this.finishClose(); } }
    else if (near && near.d < 3 && this.cool <= 0 && !P.dead) { const a = Math.atan2(near.m.x - P.x, near.m.z - P.z); let df = a - (P.yaw + Math.PI); df = Math.atan2(Math.sin(df), Math.cos(df));
      this.pending = { kind: near.m.kind, min: near.d, behind: Math.abs(df) > 1.6, hidden: !!P.hidden, left: AFTER, start: this.ring.length - Math.min(this.ring.length, RING - AFTER) }; this.cool = 20; }
  }
  finishClose() { const p = this.pending; this.pending = null; const src = this.ring.slice(-RING), frames = []; const step = () => { for (let k = 0; k < 3 && frames.length < src.length; k++) frames.push(this.encode(src[frames.length], p)); if (frames.length < src.length) return setTimeout(step, 30);
    saveClip({ id: 'c' + Date.now(), date: Date.now(), kind: 'close', label: p.kind, dist: +p.min.toFixed(2), behind: p.behind, hidden: p.hidden, frames, fps: FPS }); }; step(); }
  encode(im, p) { this.g.putImageData(im, 0, 0); this.g.fillStyle = '#fff'; this.g.font = '10px monospace'; this.g.fillText('CAM 02  ' + new Date().toLocaleTimeString(), 6, 12); this.g.fillStyle = '#f33'; this.g.fillText(`${p.kind.toUpperCase()}  ${p.min.toFixed(1)} m`, 6, H - 8); return this.cv.toDataURL('image/jpeg', 0.6); }
}

// ---------------------------------------------------------------- the Recordings screen
export async function openRecordings(t, onClose) {
  const L = $('recLayer'); L.hidden = false; const clips = await listClips(); const close = clips.filter((c) => c.kind === 'close').sort((a, b) => a.dist - b.dist), manual = clips.filter((c) => c.kind === 'manual');
  const item = (c) => `<button class="recItem" data-id="${c.id}"><img src="${c.frames[Math.min(c.frames.length - 1, 2)]}" alt=""><span><b>${c.kind === 'close' ? `${c.label.toUpperCase()} · ${c.dist} m` : 'CAM'}</b><small>${new Date(c.date).toLocaleString()} · ${Math.round(c.frames.length / c.fps)} s</small>${c.kind === 'close' ? `<small>${c.behind ? t('rec_behind') : c.hidden ? t('rec_hidden') : t('rec_front')}</small>` : ''}</span></button>`;
  $('recList').innerHTML = `<h3>${t('rec_close')}</h3>${close.slice(0, 5).map(item).join('') || `<p class="phint">${t('rec_none')}</p>`}${close.length > 5 ? close.slice(5).map(item).join('') : ''}<h3>${t('rec_manual')}</h3>${manual.map(item).join('') || `<p class="phint">${t('rec_none')}</p>`}`;
  $('recPlayer').hidden = true; $('recList').hidden = false;
  $('recList').querySelectorAll('.recItem').forEach((b) => (b.onclick = () => play(clips.find((c) => c.id === b.dataset.id))));
  $('recBack').onclick = () => { if (!$('recPlayer').hidden) { stopPlay(); $('recPlayer').hidden = true; $('recList').hidden = false; return; } L.hidden = true; onClose && onClose(); };
  let timer = 0; const stopPlay = () => clearInterval(timer);
  const play = (c) => { $('recList').hidden = true; $('recPlayer').hidden = false; const img = $('recImg'); let i = 0; stopPlay(); timer = setInterval(() => { img.src = c.frames[i]; i = (i + 1) % c.frames.length; }, 1000 / c.fps);
    $('recInfo').textContent = c.kind === 'close' ? `${c.label.toUpperCase()} — ${c.dist} m` : 'CAM'; $('recDel').onclick = async () => { stopPlay(); await deleteClip(c.id); openRecordings(t, onClose); }; };
}
