import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

// ---------- setup ----------
const W = window.REC ? 960 : innerWidth, H = window.REC ? 540 : innerHeight;
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setPixelRatio(window.REC ? 1 : Math.min(2, devicePixelRatio)); r.setSize(W, H);
r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(r.domElement);
const sc = new THREE.Scene(); sc.background = new THREE.Color(0x120d0a);
const env = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture; sc.environment = null;
const cam = new THREE.PerspectiveCamera(38, W / H, 0.1, 200);
const hemi = new THREE.HemisphereLight(0xffe2c0, 0x2a1a10, 0.0); sc.add(hemi);
const spot = new THREE.SpotLight(0xffe6b8, 0, 40, 0.2, 0.6, 1.2); spot.position.set(0, 16, 6); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); sc.add(spot); sc.add(spot.target);
const fill = new THREE.DirectionalLight(0xffd9b0, 0); fill.position.set(-6, 8, 10); sc.add(fill);

const L = new GLTFLoader(); const load = (f) => L.loadAsync('models/' + f);
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }, lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
async function obj(f, { h = null, w = null } = {}) { const g = await load(f); const o = SkeletonUtils.clone(g.scene); o.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } }); o.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(o, true), sz = bb.getSize(new THREE.Vector3()); const k = h ? h / sz.y : w ? w / Math.max(sz.x, sz.z) : 1; o.scale.setScalar(k); o.updateMatrixWorld(true); const bb2 = new THREE.Box3().setFromObject(o, true); const c = bb2.getCenter(new THREE.Vector3()); c.y = bb2.min.y; const wrap = new THREE.Group(); o.position.sub(c); wrap.add(o); wrap.userData.anims = g.animations; return wrap; }

// ---------- stage: dim kitchen ----------
const stage = new THREE.Group(); sc.add(stage);
const COUNTER_Y = 2.6; // top of the front counter
async function buildStage() {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.9 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; stage.add(floor);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(60, 20), new THREE.MeshStandardMaterial({ color: 0x5a3a24, roughness: 0.95 })); back.position.set(0, 10, -8); stage.add(back);
  for (let i = -3; i <= 3; i++) { const c = await obj('sushi/Environment_Counter_Straight.gltf', { h: 2.6 }); c.position.set(i * 4.1, 0, -6.6); c.rotation.y = 0; stage.add(c); }
  for (let i = -2; i <= 2; i++) { const s = await obj('sushi/Environment_Cabinet_Shelves.gltf', { h: 1.9 }); s.position.set(i * 4.1, 5.6, -7.2); stage.add(s); }
  const fr = await obj('sushi/Environment_Fridge.gltf', { h: 8 }); fr.position.set(12, 0, -6.4); stage.add(fr);
  const ov = await obj('sushi/Environment_Oven.gltf', { h: 3.1 }); ov.position.set(-12, 0, -6.4); stage.add(ov);
  for (const sx of [-1, 1]) { const l = await obj('sushi/Decoration_Light.gltf', { h: 2.6 }); l.position.set(sx * 8.5, 7.8, -6); stage.add(l); }
  // front counter
  for (let i = -1; i <= 1; i++) { const c = await obj('sushi/Environment_Counter_Straight_2.gltf', { h: COUNTER_Y }); c.position.set(i * 4.2, 0, 1.2); stage.add(c); }
}
// ---------- actors ----------
let panda, pmix, pAct = {}, knife, pan, board, flyKnife; const veg = {}; const X = {};
async function buildActors() {
  panda = await obj('panda_tools.gltf', { h: 7.6 }); stage.add(panda);
  panda.traverse((m) => { if (m.isMesh) m.frustumCulled = false; if (m.name === 'Knife') knife = m; if (m.name === 'Pan') pan = m; });
  pmix = new THREE.AnimationMixer(panda.children[0]); for (const c of panda.userData.anims) pAct[c.name] = pmix.clipAction(c);
  flyKnife = await obj('kr/knife.gltf', { w: 1.2 }); flyKnife.visible = false; stage.add(flyKnife);
  const P = 'kr/food_ingredient_'; veg.plate = await obj('kr/plate.gltf', { w: 3.4 }); stage.add(veg.plate); veg.plate.visible = false;
  for (const [k, f, w] of [['tomato', 'tomato', 1.4], ['onion', 'onion', 1.3], ['carrot', 'carrot', 1.8]]) { veg[k] = await obj(P + f + '.gltf', { w }); stage.add(veg[k]); veg[k].visible = false; }
  for (const [k, f, w, n] of [['tS', 'tomato_slice', 0.95, 8], ['oS', 'onion_rings', 0.8, 6], ['cS', 'carrot_pieces', 0.8, 3]]) { veg[k] = []; const base = await obj(P + f + '.gltf', { w }); for (let i = 0; i < n; i++) { const c = base.clone(); c.visible = false; stage.add(c); veg[k].push(c); } }
  X.fal = []; const fb = await obj('falafel.glb', { w: 0.7 }); for (let i = 0; i < 7; i++) { const c = fb.clone(); c.visible = false; stage.add(c); X.fal.push(c); }
  X.kun = await obj('kunafa.glb', { w: 2.6 }); X.kun.visible = false; stage.add(X.kun);
  X.kosh = await obj('koshari.glb', { w: 2.2 }); X.kosh.visible = false; stage.add(X.kosh);
  X.rolls = []; const rb = await obj('sushi/Food_SalmonRoll.gltf', { w: 0.75 }); for (let i = 0; i < 6; i++) { const c = rb.clone(); c.visible = false; stage.add(c); X.rolls.push(c); }
  X.plate2 = veg.plate.clone(); X.plate2.visible = false; stage.add(X.plate2);
  X.duck = await obj('duck.gltf', { h: 1.6 }); X.duck.visible = false; stage.add(X.duck);
  X.rab = []; X.rmix = [];
  for (const f of ['Rabbit_Pink', 'Rabbit_Cyan', 'Rabbit_Grey', 'Rabbit_Blond']) { const r2 = await obj(f + '.gltf', { h: 4.4 }); r2.visible = false; r2.traverse((m) => { if (m.isMesh) m.frustumCulled = false; }); stage.add(r2); const mx = new THREE.AnimationMixer(r2.children[0]); const acts = {}; for (const c of r2.userData.anims) acts[c.name] = mx.clipAction(c); X.rab.push(r2); X.rmix.push({ mx, acts }); }
  const tt = document.createElement('canvas'); tt.width = 1024; tt.height = 384; const x = tt.getContext('2d'); x.fillStyle = 'rgba(0,0,0,0)'; x.fillRect(0, 0, 1024, 384); x.font = 'bold 170px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'rtl'; x.lineWidth = 22; x.strokeStyle = '#3a1f10'; x.strokeText('مطعم الباندا', 512, 170); const g = x.createLinearGradient(0, 80, 0, 260); g.addColorStop(0, '#ffe27a'); g.addColorStop(1, '#ff8a2a'); x.fillStyle = g; x.fillText('مطعم الباندا', 512, 170); x.font = 'bold 64px sans-serif'; x.fillStyle = '#fff'; x.strokeStyle = '#3a1f10'; x.lineWidth = 10; x.strokeText('الأكل بيجري… وإنت وراه!', 512, 320); x.fillText('الأكل بيجري… وإنت وراه!', 512, 320);
  const ttx = new THREE.CanvasTexture(tt); ttx.colorSpace = THREE.SRGBColorSpace; X.title = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.75), new THREE.MeshBasicMaterial({ map: ttx, transparent: true, depthWrite: false })); X.title.visible = false; sc.add(X.title);
  board = await obj('kr/cuttingboard.gltf', { w: 4.0 }); board.position.set(0, COUNTER_Y, 1.6); stage.add(board);
}
// play a clip at an absolute time (deterministic)
function pose(name, time, weight = 1) { for (const k in pAct) { pAct[k].stop(); } const a = pAct[name]; if (!a) return; a.play(); a.setEffectiveWeight(weight); pmix.setTime(0); a.time = time % a.getClip().duration; pmix.update(0); }
function pose2(n1, t1, n2, t2, w) { for (const k in pAct) pAct[k].stop(); const a = pAct[n1], b = pAct[n2]; a.play(); b.play(); a.setEffectiveWeight(1 - w); b.setEffectiveWeight(w); a.time = t1 % a.getClip().duration; b.time = t2 % b.getClip().duration; pmix.update(0); }

// ---------- scenes ----------
const scenes = [];
// 1) dark kitchen: one light on the board, panda with his back to us, turns around
scenes.push({ name: 'المطبخ الضلمة', dur: 4, update(t) { hide();
  knife.visible = false; pan.visible = false;
  const light = ease(seg(t, 0.2, 1.4));
  spot.intensity = 260 * light; spot.target.position.set(0, COUNTER_Y, 1.6); hemi.intensity = 0.12 + 1.6 * ease(seg(t, 2.6, 3.6)); fill.intensity = 1.6 * ease(seg(t, 2.6, 3.6));
  panda.position.set(0, 0, -1.4);
  const turn = ease(seg(t, 1.8, 2.8)); panda.rotation.y = lerp(Math.PI, 0, turn);
  if (t < 2.9) pose('Idle', t); else pose2('Idle', t, 'Wave', (t - 2.9), ease(seg(t, 2.9, 3.2)));
  // slow dolly in
  const k = ease(t / 4); cam.position.set(lerp(-2, 0, k), lerp(5.2, 4.6, k), lerp(22, 15, k)); cam.lookAt(0, lerp(3.4, 4.2, k), 0);
} });

const lit = () => { spot.intensity = 260; spot.target.position.set(0, COUNTER_Y, 1.6); hemi.intensity = 1.7; fill.intensity = 1.6; };
let handBone = null; const hand = () => { if (!handBone) panda.traverse((b) => { if (b.isBone && b.name === 'Middle1R') handBone = b; }); const v = new THREE.Vector3(); panda.updateMatrixWorld(true); handBone.getWorldPosition(v); return v; };
// 2) knife toss: throws the knife up, it spins and comes back to his hand
scenes.push({ name: 'السكينة', dur: 3.4, update(t) { hide();
  lit(); pan.visible = false; flyKnife.visible = false; panda.position.set(0, 0, -1.4); panda.rotation.y = 0;
  if (t < 0.55) pose('Idle_Holding', t);
  else if (t < 2.2) pose2('Idle_Holding', t, 'Jump_Idle', t, 0.0);
  else pose2('Sword', (t - 2.2) * 1.1, 'Idle_Holding', t, ease(seg(t, 3.0, 3.4)));
  const h0 = hand(); knife.visible = !(t > 0.55 && t < 2.0);
  if (t > 0.55 && t < 2.0) { const u = seg(t, 0.55, 2.0); flyKnife.visible = true; flyKnife.position.set(h0.x + Math.sin(u * Math.PI) * 0.3, h0.y + Math.sin(u * Math.PI) * 3.6, h0.z + 0.4); flyKnife.rotation.set(0, 0, u * Math.PI * 6); }
  const up = Math.sin(seg(t, 0.4, 2.1) * Math.PI); cam.position.set(lerp(3.5, 2, t / 3.4), 6.4 + up * 1.4, 13 + up * 1.5); cam.lookAt(0, 5.4 + up * 2.2, 0);
} });
// 3) vegetables fall from above, get sliced mid-air, slices land arranged on a plate
scenes.push({ name: 'الخضار', dur: 4.6, update(t) { hide();
  lit(); pan.visible = false; flyKnife.visible = false; knife.visible = true; panda.position.set(0, 0, -1.4); panda.rotation.y = 0;
  pose('Chop_Loop', t * 1.6);
  const plateP = new THREE.Vector3(0, COUNTER_Y + 0.08, 1.9); veg.plate.visible = true; veg.plate.position.copy(plateP); veg.plate.updateMatrixWorld(true); const pTop = new THREE.Box3().setFromObject(veg.plate).max.y;
  const items = [['tomato', 'tS', 0.7, 1.25, 0], ['onion', 'oS', 1.6, 0.72, 0.4], ['carrot', 'cS', 2.5, 0.25, 0.8]];
  for (const [w, sk, tc, ringR, phase] of items) {
    const v = veg[w], hitY = 4.6, fallT = 0.8;
    const fall = seg(t, tc - fallT, tc);
    v.visible = t > tc - fallT && t < tc; v.position.set(0.25, lerp(11, hitY, fall * fall), 0.6); v.rotation.set(t * 4, t * 3, 0);
    veg[sk].forEach((p, i) => { const n = veg[sk].length; const u = ease(seg(t, tc, tc + 0.9)); p.visible = t >= tc;
      const a = phase + (i / n) * Math.PI * 2; const tgt = new THREE.Vector3(plateP.x + Math.cos(a) * ringR, pTop - 0.12 + (w === 'carrot' ? 0.16 : w === 'onion' ? 0.08 : 0), plateP.z + Math.sin(a) * ringR * 0.9);
      const start = new THREE.Vector3(0.25 + Math.cos(a) * 0.15, hitY, 0.6 + Math.sin(a) * 0.15);
      p.position.lerpVectors(start, tgt, u); p.position.y += Math.sin(u * Math.PI) * 1.6;
      p.rotation.set((1 - u) * (i + 1) * 5, a, (1 - u) * 3); });
  }
  // slash flash when each one is hit
  const k = ease(t / 4.6); cam.position.set(lerp(-3, 2.5, k), lerp(8.5, 7.2, k), lerp(12, 9.5, k)); cam.lookAt(0, lerp(5, 3.4, k), 1.2);
} });
function hide() { veg.plate.visible = false; X.plate2.visible = false; for (const k of ['tomato', 'onion', 'carrot']) veg[k].visible = false; for (const k of ['tS', 'oS', 'cS']) veg[k].forEach((p) => (p.visible = false)); X.fal.forEach((p) => (p.visible = false)); X.rolls.forEach((p) => (p.visible = false)); X.kun.visible = X.kosh.visible = X.duck.visible = X.title.visible = false; X.rab.forEach((r2) => (r2.visible = false)); flyKnife.visible = false; board.visible = true; panda.position.set(0, 0, -1.4); panda.rotation.y = 0; }
let lhBone = null; const lhand = () => { if (!lhBone) panda.traverse((b) => { if (b.isBone && b.name === 'Middle1L') lhBone = b; }); const v = new THREE.Vector3(); panda.updateMatrixWorld(true); (lhBone || handBone).getWorldPosition(v); return v; };
const plateAt = (pl, x, z) => { pl.visible = true; pl.position.set(x, COUNTER_Y + 0.08, z); pl.updateMatrixWorld(true); return new THREE.Box3().setFromObject(pl).max.y; };
const rpose = (i, n, t) => { const { mx, acts } = X.rmix[i]; for (const k in acts) acts[k].stop(); const a = acts[n]; a.play(); a.time = t % a.getClip().duration; mx.update(0); };
// 4) pan flip: falafel balls fly up spinning and land as a flower on the plate
scenes.push({ name: 'الطاسة والطعمية', dur: 3.8, update(t) {
  hide(); lit(); knife.visible = false; pan.visible = true; pose('Pan_Loop', t * 1.3);
  const top = plateAt(veg.plate, -1.8, 2.0); const h0 = lhand(); const n = X.fal.length;
  X.fal.forEach((f, i) => { const t0 = 0.4 + i * 0.22, u = ease(seg(t, t0, t0 + 1.3)); f.visible = t > t0 - 0.3;
    const a = (i / (n - 1)) * Math.PI * 2; const tgt = i === n - 1 ? new THREE.Vector3(-1.8, top + 0.15, 2.0) : new THREE.Vector3(-1.8 + Math.cos(a) * 0.95, top + 0.12, 2.0 + Math.sin(a) * 0.85);
    const st = h0.clone().add(new THREE.Vector3(0, 0.3, 0.3)); f.position.lerpVectors(st, tgt, u); f.position.y += Math.sin(u * Math.PI) * 3.2; f.rotation.set(u * 9 + i, u * 6, 0); });
  const k = ease(t / 3.8); cam.position.set(lerp(-5, -2.5, k), lerp(7.5, 6.8, k), lerp(12, 10.5, k)); cam.lookAt(-0.6, lerp(5.2, 3.6, k), 1.2);
} });
// 5) kunafa: dough thrown up, spins and lands as a perfect disc
scenes.push({ name: 'الكنافة', dur: 3.4, update(t) {
  hide(); lit(); knife.visible = false; pan.visible = false; pose(t < 0.7 ? 'Assembly_Loop' : 'Yes', t < 0.7 ? t : t - 0.7);
  const top = plateAt(veg.plate, 0, 1.9); X.kun.visible = t > 0.35; const u = seg(t, 0.5, 2.4);
  X.kun.position.set(Math.sin(u * Math.PI * 2) * 0.4, lerp(4.8, top + 0.05, ease(u)) + Math.sin(u * Math.PI) * 4.0, lerp(0.5, 1.9, ease(u)));
  X.kun.rotation.set((1 - ease(u)) * 1.2, u * Math.PI * 10, (1 - ease(u)) * 0.6); X.kun.scale.setScalar(lerp(0.5, 1, ease(u)));
  const up = Math.sin(seg(t, 0.4, 2.3) * Math.PI); cam.position.set(2.5, 5.5 + up * 1.5, 11.5); cam.lookAt(0, 4 + up * 3.2, 0.8);
} });
// 6) the koshari jumps off the plate and runs; panda grabs it without looking
scenes.push({ name: 'الكشري الهربان', dur: 4.2, update(t) {
  hide(); lit(); knife.visible = true; pan.visible = false;
  const top = plateAt(veg.plate, -0.5, 1.9); X.kosh.visible = true;
  const run = seg(t, 0.6, 2.1), back = ease(seg(t, 2.5, 3.1));
  const hopX = lerp(-0.5, 4.2, run), hopY = top + 0.02 + Math.abs(Math.sin(run * Math.PI * 5)) * 0.9 * (run > 0 && run < 1);
  X.kosh.position.set(lerp(hopX, -0.5, back), lerp(hopY, top + 0.02, back) + Math.sin(back * Math.PI) * 1.5, 1.9); X.kosh.rotation.set(0, Math.sin(t * 9) * 0.3 * (1 - back), Math.sin(t * 12) * 0.15 * run * (1 - back));
  panda.rotation.y = lerp(0, -0.25, ease(seg(t, 0.2, 0.6)));
  if (t < 2.1) pose('Idle_Holding', t); else if (t < 3.0) pose('Punch', (t - 2.1) * 1.2); else pose('Idle_Holding', t);
  const k = ease(t / 4.2); cam.position.set(lerp(1, 2, k), 6.2, lerp(12, 11, k)); cam.lookAt(lerp(0.5, 1.5, ease(run)) * (1 - back) + 0.3, 3.4, 1);
} });
// 7) sushi: rolls pop onto the board one after another
scenes.push({ name: 'السوشي', dur: 3.2, update(t) {
  hide(); lit(); knife.visible = true; pan.visible = false; pose('Chop_Loop', t * 2);
  X.rolls.forEach((r2, i) => { const t0 = 0.4 + i * 0.32; const u = seg(t, t0, t0 + 0.35); r2.visible = t > t0; const b = u < 1 ? Math.sin(u * Math.PI) * 0.5 : 0; r2.position.set(-1.6 + i * 0.64, COUNTER_Y + 0.25 + b, 1.75); r2.scale.setScalar(u < 1 ? 0.4 + 0.8 * u : 1); r2.rotation.set(Math.PI / 2, 0, 0); });
  const k = ease(t / 3.2); cam.position.set(lerp(-3, 3, k), 6.6, 11.5); cam.lookAt(0, 4.2, 1.2);
} });
// 8) the legendary duck runs across the counter and dodges the panda
scenes.push({ name: 'البطة', dur: 3.6, update(t) {
  hide(); lit(); knife.visible = false; pan.visible = false; board.visible = false;
  const u = seg(t, 0.3, 3.3); X.duck.visible = true; const dx = lerp(-7, 7, u); const jump = Math.max(0, Math.sin(seg(t, 1.5, 2.2) * Math.PI)) * 2.0;
  X.duck.position.set(dx, COUNTER_Y + Math.abs(Math.sin(t * 18)) * 0.15 + jump, 1.6); X.duck.rotation.set(0, Math.PI / 2, Math.sin(t * 18) * 0.12);
  if (t < 1.4) pose('Idle', t); else if (t < 2.2) pose('Punch', (t - 1.4) * 1.3); else pose('No', t - 2.2);
  panda.rotation.y = lerp(-0.6, 0.6, ease(seg(t, 0.4, 3.0)));
  cam.position.set(0, 5.8, 13); cam.lookAt(dx * 0.35, 3.4, 1);
} });
// 9) rabbits cheer for the panda
scenes.push({ name: 'الأرانب', dur: 3.2, update(t) {
  hide(); lit(); knife.visible = true; pan.visible = false; pose('Yes', t);
  const spots = [[-4.5, 5.2, 2.6], [-1.6, 5.8, 2.9], [1.6, 5.8, -2.9], [4.5, 5.2, -2.6]];
  X.rab.forEach((r2, i) => { r2.visible = true; r2.position.set(spots[i][0], 0, spots[i][1]); r2.rotation.y = Math.PI + spots[i][2] * 0.12; rpose(i, i % 2 ? 'Wave' : 'Yes', t + i * 0.3); });
  const k = ease(t / 3.2); cam.position.set(0, lerp(4.5, 6.5, k), lerp(16, 19, k)); cam.lookAt(0, 3.4, 1.5);
} });
// 10) logo: all the food rises and the title appears, the duck runs in the back
scenes.push({ name: 'الشعار', dur: 4.6, update(t) {
  hide(); lit(); knife.visible = false; pan.visible = false; pose(t < 2.6 ? 'Yes' : 'Wave', t);
  const items = [...X.fal.slice(0, 4), X.kun, X.kosh, ...X.rolls.slice(0, 3)];
  items.forEach((o, i) => { o.visible = true; o.scale.setScalar(o === X.kun ? 0.5 : o === X.kosh ? 0.55 : 1); const a = (i / items.length) * Math.PI * 2 + t * 1.2; const up = ease(seg(t, 0.1, 1.4)); const R = lerp(1.2, 5.2, up);
    o.position.set(Math.cos(a) * R, lerp(COUNTER_Y + 0.4, 8.6 + Math.sin(a * 2) * 0.4, up), 1.5 + Math.sin(a) * R * 0.35); o.rotation.set(t * 2 + i, t * 3, 0); });
  const ti = ease(seg(t, 1.3, 2.1)); X.title.visible = ti > 0; X.title.position.set(0, 8.8, 2.4); X.title.scale.setScalar(0.3 + 0.7 * ti + Math.sin(seg(t, 1.3, 2.4) * Math.PI) * 0.12); X.title.material.opacity = ti;
  X.duck.visible = true; X.duck.position.set(lerp(9, -9, seg(t, 1.8, 4.4)), 0, -4.5); X.duck.rotation.set(0, -Math.PI / 2, Math.sin(t * 18) * 0.12); X.duck.position.y = Math.abs(Math.sin(t * 18)) * 0.2;
  cam.position.set(0, 7.2, 19); cam.lookAt(0, 6.2, 0); X.title.lookAt(cam.position);
} });
// ---------- runner ----------
const total = () => scenes.reduce((a, s) => a + s.dur, 0);
function at(T) { let acc = 0; for (const s of scenes) { if (T < acc + s.dur || s === scenes[scenes.length - 1]) { s.update(Math.min(T - acc, s.dur)); return s; } acc += s.dur; } }
window.SCENES = scenes.map((s) => ({ name: s.name, dur: s.dur }));
window.renderAt = (T) => { at(T); r.render(sc, cam); };
window.renderScene = (i, t) => { scenes[i].update(t); r.render(sc, cam); };
(async () => { await buildStage(); await buildActors(); window.READY = true;
  if (!window.REC) { const clk = new THREE.Clock(); r.setAnimationLoop(() => { const T = clk.getElapsedTime() % total(); window.renderAt(T); }); } })();
addEventListener('resize', () => { if (window.REC) return; cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); r.setSize(innerWidth, innerHeight); });
