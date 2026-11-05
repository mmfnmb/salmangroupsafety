// Shared toolkit for the series episodes: cast, smart camera, lighting presets, subtitles, crowds and the shot engine.
// Every episode (film/epN.js) builds on this so all scenes look and move the same way.
import { THREE, M, G, V, PI, rand, clamp, scene, camera, renderer, renderScene, puffs, confetti, fx, sun, hemi, SkeletonUtils, place, loadAssets, save, applyQuality, bloom } from '../src/core.js';
import { computeBoneFix, dress, skinFx, updateGold, teamFlag, ITEM } from '../src/cosmetics.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
export { THREE, M, G, V, PI, rand, clamp, scene, camera, puffs, confetti, fx, place, teamFlag, dress };

export const W = 960, H = 540, FPS = 24;
export const ease = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const lerpV = (a, b, t) => V(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));

// ---------------------------------------------------------------- cast
// The series cast. Face colour: 'Main_Light' is the face; leaving it out keeps the normal face.
// every on-screen extra gets its own colour (crowds may repeat). Hues avoid the main cast's colours.
const EXTRA_COLORS = [0xc2185b, 0x7cb342, 0x5d4037, 0xad1457, 0x9e9d24, 0x6d4c41, 0xf06292, 0x558b2f, 0x8d6e63, 0xba68c8, 0x827717, 0xa1887f,
  0xe91e63, 0x33691e, 0x3e2723, 0xf48fb1, 0xaed581, 0xbcaaa4, 0xce93d8, 0xdce775, 0x795548, 0x880e4f, 0xc0ca33, 0xd7ccc8, 0xff80ab, 0x76ff03,
  0x4e342e, 0xea80fc, 0xeeff41, 0xffab91, 0x546e7a, 0xb0bec5, 0xff8a65, 0x9575cd];
// no teals/cyans (too close to Minto and Blue); after one round the hues come back in a darker shade so no two extras match
let extraN = 0;
import { CAST_COLORS, SPARE_COLORS } from './cast.js';
// extraLook('Flarix 2') -> that person's fixed colour from film/cast.js; extraLook() alone still gives a one-off colour
export function extraLook(name, extra = {}) {
  if (typeof name === 'object') { extra = name; name = null; }
  if (name && CAST_COLORS[name] == null) console.warn('not in film/cast.js:', name);
  if (name && CAST_COLORS[name] != null) {
    const c = CAST_COLORS[name], id = 'film-cast-' + name;
    ITEM[id] = { id, colors: { Main: c, Main2: new THREE.Color(c).lerp(new THREE.Color(0xffffff), 0.6).getHex() } };
    return { skin: id, ...extra };
  }
  const k = extraN++, c = new THREE.Color(EXTRA_COLORS[k % EXTRA_COLORS.length]).multiplyScalar(k >= EXTRA_COLORS.length ? 0.62 : 1).getHex(), id = 'film-extra-' + extraN;
  ITEM[id] = { id, colors: { Main: c, Main2: new THREE.Color(c).lerp(new THREE.Color(0xffffff), 0.6).getHex() } };
  return { skin: id, ...extra };
}
export const LOOKS = {
  blue: { skin: 'skin-blue' },
  yellow: { skin: 'film-yellow' },
  gold: { skin: 'film-gold' },
  brown: { skin: 'film-brown' },
  black: { skin: 'film-black' },
  white: { skin: 'film-white' },
  orange: { skin: 'film-orange' },
  red: { skin: 'film-red' },
  vio: { skin: 'film-vio' },
  minto: { skin: 'film-minto' },
  silver: { skin: 'film-silver' }, slate: { skin: 'film-slate' }, olive: { skin: 'film-olive' },
  ref: { skin: 'skin-ref', head: 'h-cupcake' },
};
const clip = (n) => M.Character.animations.find((a) => a.name.endsWith('|' + n));
export class Actor {
  constructor(look, scale = 0.42) {
    this.m = SkeletonUtils.clone(M.Character.scene); this.m.scale.setScalar(scale); this.s = scale; scene.add(this.m);
    this.m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    dress(this.m, typeof look === 'string' ? LOOKS[look] : look); this.mixer = new THREE.AnimationMixer(this.m); this.acts = {}; this.cur = null;
    for (const n of ['Idle', 'Run', 'Walk', 'Wave', 'Yes', 'No', 'Punch', 'Jump', 'Jump_Idle', 'Jump_Land', 'HitReact', 'Duck', 'Death', 'Sitting', 'Sit', 'Dance']) {
      const c = clip(n); if (!c) continue; const a = this.mixer.clipAction(c);
      if (!['Idle', 'Run', 'Walk', 'Jump_Idle', 'Sitting', 'Dance'].includes(n)) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
      this.acts[n] = a;
    }
    this.play('Idle'); this.lastPos = V(); this.m.visible = false;
    this.bones = {}; this.m.traverse((o) => { if (o.isBone) this.bones[o.name] = o; });
    this.m.updateMatrixWorld(true); const hp = V(); this.bones.Hips?.getWorldPosition(hp); this.hipH = hp.y - this.m.position.y; this.sitting = false;
  }
  // sit on a seat whose top is at height y: hips rest on the seat, thighs forward, shins down (no clipping into the cushion)
  sitAt(x, y, z, ry) { this.sitting = true; this.at(x, y - this.hipH * 0.55, z, ry); this.play('Idle'); return this; }
  stand() { this.sitting = false; return this; }
  play(n, speed = 1, fade = 0.15) { const a = this.acts[n] || this.acts.Idle; a.timeScale = speed; if (this.cur === a) return this; a.reset().fadeIn(fade).play(); if (this.cur) this.cur.fadeOut(fade); this.cur = a; return this; }
  // play a one-shot action again even if it is the current one
  replay(n, speed = 1) { this.cur = null; return this.play(n, speed, 0.08); }
  at(x, y, z, ry) { this.m.position.set(x, y, z); if (ry != null) this.m.rotation.y = ry; this.m.visible = true; return this; }
  face(x, z) { this.m.rotation.y = Math.atan2(x - this.m.position.x, z - this.m.position.z); return this; }
  faceA(o) { return this.face(o.m.position.x, o.m.position.z); }
  get p() { return this.m.position; }
  // walk/run from a to b over [t0,t1] of shot time t, facing the way it moves; returns progress 0..1
  move(t, t0, t1, a, b, { run = false, speed = 1.3, y = 0 } = {}) {
    const k = clamp((t - t0) / (t1 - t0), 0, 1), x = lerp(a[0], b[0], k), z = lerp(a[1], b[1], k);
    this.at(x, y, z, Math.atan2(b[0] - a[0], b[1] - a[1]));
    this.play(k > 0 && k < 1 ? (run ? 'Run' : 'Walk') : 'Idle', run ? speed : 1);
    return k;
  }
  tick(dt) {
    this.mixer.update(dt);
    if (this.sitting) for (const side of ['L', 'R']) { const u = this.bones['UpperLeg.' + side], l = this.bones['LowerLeg.' + side]; if (u) u.rotation.x -= PI / 2; if (l) l.rotation.x += PI / 2; }
    const p = this.m.position, moving = p.distanceTo(this.lastPos) > dt * 1.2; this.lastPos.copy(p);
    if (this.m.visible) skinFx(this.m, dt, p, { moving, grounded: this.grounded !== false, puffs, scene });
  }
  show(v = true) { this.m.visible = v; return this; }
  head() { return V(this.p.x, this.p.y + 1.15, this.p.z); }
}

// ---------------------------------------------------------------- camera: always framed so the action reads clearly
// Shots ask for a framing; the camera glides to it (and cuts instantly on the first frame of a shot).
const camP = V(0, 5, 10), camL = V(0, 0, 0); let snap = true;
export function cutNext() { snap = true; }
export function camTo(pos, look, k = 5, dt = 1 / FPS) {
  if (snap) { camP.copy(pos); camL.copy(look); snap = false; }
  else { const f = 1 - Math.exp(-k * dt); camP.lerp(pos, f); camL.lerp(look, f); }
  camera.position.copy(camP); camera.lookAt(camL);
  sun.position.set(camL.x + 14, camL.y + 34, camL.z + 16); sun.target.position.copy(camL);
}
const centerOf = (list) => { const c = V(); for (const a of list) c.add(a.p); return c.multiplyScalar(1 / list.length); };
// a side view that fits everyone listed, from the side given (+1/-1) and a little above
export function frameGroup(list, { side = 1, h = 1.6, dist = 1, look = 1.0, ang = 0, k = 4 } = {}) {
  const c = centerOf(list); let r = 1.2; for (const a of list) r = Math.max(r, a.p.distanceTo(c));
  // look across the line the group stands on
  let dx = 1, dz = 0; if (list.length > 1) { const a = list[0].p, b = list[list.length - 1].p; dx = b.x - a.x; dz = b.z - a.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; }
  const nx = -dz * side, nz = dx * side, ca = Math.cos(ang), sa = Math.sin(ang), px = nx * ca - nz * sa, pz = nx * sa + nz * ca;
  const d = (2.6 + r * 1.9) * dist;
  camTo(V(c.x + px * d, c.y + h + r * 0.35, c.z + pz * d), V(c.x, c.y + look, c.z), k);
}
// close-up of one actor from the front (ang turns around them)
export function closeUp(a, { ang = 0.35, dist = 2.1, h = 1.25, k = 5 } = {}) {
  const f = a.m.rotation.y + ang; camTo(V(a.p.x + Math.sin(f) * dist, a.p.y + h, a.p.z + Math.cos(f) * dist), V(a.p.x, a.p.y + 1.05, a.p.z), k);
}
// over the shoulder of a, looking at b
export function overShoulder(a, b, { side = 1, k = 5 } = {}) {
  const dx = b.p.x - a.p.x, dz = b.p.z - a.p.z, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
  camTo(V(a.p.x - ux * 1.8 - uz * 0.7 * side, a.p.y + 1.6, a.p.z - uz * 1.8 + ux * 0.7 * side), V(b.p.x, b.p.y + 1.0, b.p.z), k);
}
// following a runner from behind and a bit to the side, the classic race view
export function chase(a, { back = 4.2, side = 1.6, h = 2.1, ahead = 3, k = 6 } = {}) {
  const f = a.m.rotation.y, fx = Math.sin(f), fz = Math.cos(f);
  camTo(V(a.p.x - fx * back + fz * side, a.p.y + h, a.p.z - fz * back - fx * side), V(a.p.x + fx * ahead, a.p.y + 0.9, a.p.z + fz * ahead), k);
}
// a sideways tracking shot running alongside
export function track(a, { side = 1, dist = 5.5, h = 1.8, lead = 1.2, k = 6 } = {}) {
  const f = a.m.rotation.y, fx = Math.sin(f), fz = Math.cos(f);
  camTo(V(a.p.x + fz * dist * side + fx * lead, a.p.y + h, a.p.z - fx * dist * side + fz * lead), V(a.p.x + fx * lead, a.p.y + 1.0, a.p.z + fz * lead), k);
}
// establishing shot: slow orbit around a point
export function orbit(c, t, { r = 18, h = 9, speed = 0.12, from = 0, k = 3 } = {}) {
  const a = from + t * speed; camTo(V(c[0] + Math.sin(a) * r, c[1] + h, c[2] + Math.cos(a) * r), V(c[0], c[1] + 1, c[2]), k);
}
export function fixed(pos, look) { camTo(V(...pos), V(...look), 99); }

// ---------------------------------------------------------------- lighting presets
const BASE = { hemi: hemi.intensity, sun: sun.intensity, hc: hemi.color.clone(), sc: sun.color.clone(), fog: scene.fog?.color.clone(), near: scene.fog?.near, far: scene.fog?.far };
export function setTime(kind) {
  const P = {
    day: [1, 1, 0xfff4ff, 0xfff0dc, 0xc9b8ff],
    morning: [0.95, 0.9, 0xfff0e0, 0xffe2b8, 0xffd6c0],
    sunset: [0.75, 0.85, 0xffc8a0, 0xff9a5a, 0xff9f7a],
    night: [0.42, 0.25, 0x8fa0ff, 0x9fb0ff, 0x1a1640],
    interior: [1.05, 0.55, 0xfff2e0, 0xffe6c8, 0xfff0e0],
    palace: [0.9, 0.7, 0xfff0c0, 0xffd27a, 0xf3d9a0],
  }[kind] || [1, 1, 0xfff4ff, 0xfff0dc, 0xc9b8ff];
  hemi.intensity = BASE.hemi * P[0]; sun.intensity = BASE.sun * P[1]; hemi.color.setHex(P[2]); sun.color.setHex(P[3]);
  if (scene.fog) { scene.fog.color.setHex(P[4]); scene.fog.near = kind === 'interior' ? 60 : BASE.near; scene.fog.far = kind === 'interior' ? 140 : BASE.far; }
}

// ---------------------------------------------------------------- subtitles (kept out of the picture, shown by the player in any language)
export const SUBS = []; let subNow = null;
let say_ = null;
// say(who, text): the line shown while the current shot runs (call it every frame, or once in setup)
export function say(who, text) { say_ = text ? { who, text } : null; }
function trackSubs(T) {
  const k = say_ ? say_.who + '|' + say_.text : null;
  if (subNow && subNow.key !== k) { subNow.end = +T.toFixed(2); subNow = null; }
  if (k && !subNow) { subNow = { key: k, who: say_.who, text: say_.text, start: +T.toFixed(2), end: null }; SUBS.push(subNow); }
}

// ---------------------------------------------------------------- crowd: hundreds of fans as one instanced mesh (the game character, posed)
export function crowd(spots, colors = [0x3d8bff, 0xffd23f, 0xff7a1a, 0xd7263d, 0x4be3a0, 0x6a3fd1, 0xf4f4f8, 0x7a4a2a]) {
  const src = []; M.Character.scene.updateMatrixWorld(true);
  M.Character.scene.traverse((o) => { if (o.isMesh) src.push(o); });
  const group = new THREE.Group(), tmp = new THREE.Matrix4(), q = new THREE.Quaternion(), s = V(0.42, 0.42, 0.42), col = new THREE.Color();
  const meshes = src.map((o) => {
    const g = o.geometry.clone(); g.deleteAttribute('skinIndex'); g.deleteAttribute('skinWeight');
    const mats = (Array.isArray(o.material) ? o.material : [o.material]).map((m) => new THREE.MeshStandardMaterial({ color: m.color, roughness: 0.6 }));
    const im = new THREE.InstancedMesh(g, mats.length > 1 ? mats : mats[0], spots.length);
    spots.forEach((p, i) => { q.setFromEuler(new THREE.Euler(0, p.ry ?? 0, 0)); tmp.compose(V(p.x, p.y, p.z), q, s); im.setMatrixAt(i, tmp.multiply(o.matrixWorld)); im.setColorAt(i, col.setHex(p.c ?? colors[i % colors.length])); });
    im.frustumCulled = false; group.add(im); return im;
  });
  scene.add(group);
  // cheer: little hops, staggered
  group.userData.update = (T, level = 1) => {
    meshes.forEach((im, mi) => {
      spots.forEach((p, i) => { const hop = Math.max(0, Math.sin(T * 7 + i * 1.7)) * 0.25 * level; q.setFromEuler(new THREE.Euler(0, p.ry ?? 0, 0)); tmp.compose(V(p.x, p.y + hop, p.z), q, s); im.setMatrixAt(i, tmp.multiply(src[mi].matrixWorld)); });
      im.instanceMatrix.needsUpdate = true;
    });
  };
  return group;
}

// ---------------------------------------------------------------- sets: each builds into its own group; switching disposes the old one
export const SETS = {}; let setNow = null, setRoot = null;
export function useSet(name) {
  if (setNow === name) return setRoot; setNow = name;
  if (setRoot) { scene.remove(setRoot); setRoot.traverse((o) => { if (o.isMesh) o.geometry.dispose?.(); }); }
  G.level?.dispose?.(); G.level = null;
  setRoot = new THREE.Group(); scene.add(setRoot);
  SETS[name]?.(setRoot);
  return setRoot;
}
export const put = (root, name, x, y, z, s = 1, ry = 0) => place(name, x, y, z, s, ry, root);

// ---------------------------------------------------------------- the shot engine
// An episode is a list of shots { dur, set, time, setup(), upd(t, dt) }. Frames are computed in order, so every render
// worker warms up the same way and gets identical results.
export function episode(SHOTS, { title } = {}) {
  let si = -1; const total = SHOTS.reduce((a, s) => a + s.dur, 0);
  const out = document.createElement('canvas'); out.width = W; out.height = H; const ctx = out.getContext('2d');
  return {
    total, SUBS,
    frame(n, render = true) {
      const T = n / FPS, dt = 1 / FPS;
      let acc = 0, idx = 0; for (; idx < SHOTS.length; idx++) { if (T < acc + SHOTS[idx].dur) break; acc += SHOTS[idx].dur; }
      idx = Math.min(idx, SHOTS.length - 1);
      const S = SHOTS[idx];
      if (idx !== si) { si = idx; say(null); cutNext(); if (S.set) useSet(S.set); if (S.time) setTime(S.time); S.setup?.(); }
      S.upd(T - acc, dt, T);
      trackSubs(T);
      for (const a of ACTORS) a.tick(dt);
      G.level?.update?.(dt, T, false);
      setRoot?.traverse((o) => o.userData.update?.(T));
      puffs.update(dt); confetti.update(dt); updateGold(dt);
      if (!render) return null;
      renderScene(dt);
      ctx.drawImage(renderer.domElement, 0, 0, W, H);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 34); ctx.fillRect(0, H - 34, W, 34);
      if (S.card) S.card(ctx, T - acc);
      return out.toDataURL('image/jpeg', 0.9);
    },
  };
}
export const ACTORS = [];
export function cast(names) { const A = {}; for (const n of names) { A[n] = new Actor(n); ACTORS.push(A[n]); } return A; }
export function hideAll() { for (const a of ACTORS) a.show(false); }

// ---------------------------------------------------------------- start-up
export async function initFilm(extra = []) {
  let seed = 1234567; Math.random = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  save.quality = 'high'; save.muted = true;
  await loadAssets(() => {}); computeBoneFix();
  const loader = new GLTFLoader();
  await Promise.all(extra.map((n) => new Promise((res) => loader.load(`/models/f/${n}.glb`, (g) => { g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); M['f/' + n] = g; res(); }, undefined, () => { console.warn('missing film model', n); res(); }))));
  renderer.setPixelRatio(1); renderer.setSize(W, H, false); camera.aspect = W / H; camera.fov = 50; camera.updateProjectionMatrix();
  applyQuality(); renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
  bloom.strength = 0.26; bloom.threshold = 1.08; // softer glow so floors and gold don't wash out
  await document.fonts.load('400 40px Lilita'); await document.fonts.load('800 30px Nunito');
}
// title cards drawn on the frame (episode titles only; dialogue goes to subtitles)
export function titleCard(ctx, text, sub, k = 1) {
  ctx.save(); ctx.globalAlpha = clamp(k, 0, 1); ctx.textAlign = 'center';
  ctx.font = '400 64px Lilita'; ctx.lineWidth = 10; ctx.strokeStyle = '#21124a'; ctx.strokeText(text, W / 2, H / 2); ctx.fillStyle = '#fff'; ctx.fillText(text, W / 2, H / 2);
  if (sub) { ctx.font = '800 24px Nunito'; ctx.lineWidth = 6; ctx.strokeText(sub, W / 2, H / 2 + 44); ctx.fillStyle = '#ffd23f'; ctx.fillText(sub, W / 2, H / 2 + 44); }
  ctx.restore();
}
