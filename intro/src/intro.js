import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

// ---------- setup ----------
const W = window.REC ? 960 : innerWidth, H = window.REC ? 540 : innerHeight;
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setPixelRatio(window.REC ? 1 : Math.min(2, devicePixelRatio)); r.setSize(W, H);
r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.shadowMap.enabled = true; r.localClippingEnabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
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
  X.bowl = await obj('kr/bowl.gltf', { w: 2.8 }); X.bowl.visible = false; stage.add(X.bowl);
  X.lid = await obj('kr/lid_A.gltf', { w: 2.9 }); X.lid.visible = false; stage.add(X.lid);
  X.kosh2 = await obj('koshari.glb', { w: 2.3 }); X.kosh2.visible = false; stage.add(X.kosh2); X.clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0); X.kosh2.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.clippingPlanes = [X.clip]; } });
  X.falT = X.fal.map((f) => { const mats = []; f.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); mats.push(m.material); } }); return mats; });
  { const bag = new THREE.Group(); const bm = new THREE.MeshStandardMaterial({ color: 0xc89a62, roughness: 0.95 }); const b = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 1.8), bm); b.position.y = 1.2; b.castShadow = true; bag.add(b);
    const lt = new THREE.TextureLoader().load('logo/logo_A_badge.png'); lt.colorSpace = THREE.SRGBColorSpace; const st = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: lt, transparent: true })); st.position.set(0, 1.25, 0.91); bag.add(st);
    for (const sx of [-0.5, 0.5]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 6, 16, Math.PI), bm); h.position.set(sx, 2.4, 0); bag.add(h); } X.bag = bag; bag.visible = false; stage.add(bag); }
  X.duck = await obj('duck.gltf', { h: 1.6 }); X.duck.visible = false; stage.add(X.duck);
  X.rab = []; X.rmix = [];
  for (const f of ['Rabbit_Pink', 'Rabbit_Cyan', 'Rabbit_Grey', 'Rabbit_Blond']) { const r2 = await obj(f + '.gltf', { h: 4.4 }); r2.visible = false; r2.traverse((m) => { if (m.isMesh) m.frustumCulled = false; }); stage.add(r2); const mx = new THREE.AnimationMixer(r2.children[0]); const acts = {}; for (const c of r2.userData.anims) acts[c.name] = mx.clipAction(c); X.rab.push(r2); X.rmix.push({ mx, acts }); }
  const tt = document.createElement('canvas'); tt.width = 1024; tt.height = 384; const x = tt.getContext('2d'); x.fillStyle = 'rgba(0,0,0,0)'; x.fillRect(0, 0, 1024, 384); x.font = 'bold 170px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'rtl'; x.lineWidth = 22; x.strokeStyle = '#3a1f10'; x.strokeText('مطعم الباندا', 512, 170); const g = x.createLinearGradient(0, 80, 0, 260); g.addColorStop(0, '#ffe27a'); g.addColorStop(1, '#ff8a2a'); x.fillStyle = g; x.fillText('مطعم الباندا', 512, 170); x.font = 'bold 64px sans-serif'; x.fillStyle = '#fff'; x.strokeStyle = '#3a1f10'; x.lineWidth = 10; x.strokeText('الأكل بيجري… وإنت وراه!', 512, 320); x.fillText('الأكل بيجري… وإنت وراه!', 512, 320);
  const ttx = new THREE.CanvasTexture(tt); ttx.colorSpace = THREE.SRGBColorSpace; X.title = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.75), new THREE.MeshBasicMaterial({ map: ttx, transparent: true, depthWrite: false })); X.title.visible = false; sc.add(X.title);
  board = await obj('kr/cuttingboard.gltf', { w: 4.0 }); board.position.set(0, COUNTER_Y, 1.6); stage.add(board);
}
// play a clip at an absolute time (deterministic)
function pose(name, time, weight = 1) { for (const k in pAct) { pAct[k].stop(); } const a = pAct[name]; if (!a) return; a.play(); a.setEffectiveWeight(weight); pmix.setTime(0); a.time = time % a.getClip().duration; pmix.update(0); }
// smooth timeline: each entry [clip, startTime, speed]; consecutive clips cross-fade over BL seconds, so hands move into the next pose instead of jumping
const BL = 0.4;
function track(list, t) { for (const k in pAct) pAct[k].stop(); let i = 0; for (let j = 0; j < list.length; j++) if (t >= list[j][1]) i = j; const cur = list[i], prev = list[i - 1]; const w = prev ? ease((t - cur[1]) / BL) : 1;
  const set = (e, wt) => { const a = pAct[e[0]]; if (!a || wt <= 0) return; a.play(); a.setEffectiveWeight(wt); const d = a.getClip().duration; a.time = Math.max(0, (t - e[1]) * (e[2] || 1)) % d; };
  set(cur, w); if (prev && w < 1) { const a = pAct[prev[0]]; a.play(); a.setEffectiveWeight(1 - w); a.time = Math.max(0, (t - prev[1]) * (prev[2] || 1)) % a.getClip().duration; }
  pmix.update(0); }
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
  track([['Idle', 0], ['Wave', 2.9]], t);
  // slow dolly in
  const k = ease(t / 4); cam.position.set(lerp(-2, 0, k), lerp(5.2, 4.6, k), lerp(22, 15, k)); cam.lookAt(0, lerp(3.4, 4.2, k), 0);
} });

const lit = () => { spot.intensity = 260; spot.target.position.set(0, COUNTER_Y, 1.6); hemi.intensity = 1.7; fill.intensity = 1.6; };
let handBone = null; const hand = () => { if (!handBone) panda.traverse((b) => { if (b.isBone && b.name === 'Middle1R') handBone = b; }); const v = new THREE.Vector3(); panda.updateMatrixWorld(true); handBone.getWorldPosition(v); return v; };
// 2) knife toss: throws the knife up, it spins and comes back to his hand
scenes.push({ name: 'السكينة', dur: 3.4, update(t) { hide();
  lit(); pan.visible = false; flyKnife.visible = false; panda.position.set(0, 0, -1.4); panda.rotation.y = 0;
  track([['Idle_Holding', -1], ['Sword', 2.1, 1.1], ['Idle_Holding', 2.95]], t);
  const h0 = hand(); knife.visible = !(t > 0.55 && t < 2.0);
  if (t > 0.55 && t < 2.0) { const u = seg(t, 0.55, 2.0); flyKnife.visible = true; flyKnife.position.set(h0.x + Math.sin(u * Math.PI) * 0.3, h0.y + Math.sin(u * Math.PI) * 3.6, h0.z + 0.4); flyKnife.rotation.set(0, 0, u * Math.PI * 6); }
  const up = Math.sin(seg(t, 0.4, 2.1) * Math.PI); cam.position.set(lerp(3.5, 2, t / 3.4), 6.4 + up * 1.4, 13 + up * 1.5); cam.lookAt(0, 5.4 + up * 2.2, 0);
} });
// ---------- effects ----------
const FX = {};
function buildFX() {
  const tg = new THREE.BufferGeometry(); const NT = 14; tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NT * 2 * 3), 3)); tg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(NT * 2 * 3), 3));
  const idx = []; for (let i = 0; i < NT - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } tg.setIndex(idx);
  FX.trail = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); FX.trail.frustumCulled = false; FX.NT = NT; sc.add(FX.trail);
  FX.drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.2 }), 160); FX.drops.frustumCulled = false; FX.drops.count = 0; sc.add(FX.drops);
  const fc = document.createElement('canvas'); fc.width = fc.height = 128; const x = fc.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.3, 'rgba(255,230,160,0.8)'); g.addColorStop(1, 'rgba(255,200,100,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 8; i++) { x.save(); x.translate(64, 64); x.rotate(i * Math.PI / 4); x.fillStyle = 'rgba(255,255,255,0.9)'; x.fillRect(-1.5, 0, 3, 62); x.restore(); }
  FX.parts = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.07, 1), new THREE.MeshStandardMaterial({ roughness: 0.35 }), 700); FX.parts.frustumCulled = false; FX.parts.count = 0; FX.parts.setColorAt(0, new THREE.Color()); sc.add(FX.parts);
  const pc = document.createElement('canvas'); pc.width = pc.height = 64; const px = pc.getContext('2d'); const pg = px.createRadialGradient(32, 32, 0, 32, 32, 32); pg.addColorStop(0, 'rgba(255,255,255,0.55)'); pg.addColorStop(1, 'rgba(255,255,255,0)'); px.fillStyle = pg; px.fillRect(0, 0, 64, 64); const ptx = new THREE.CanvasTexture(pc);
  FX.puffs = []; for (let i = 0; i < 40; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: ptx, transparent: true, depthWrite: false })); sp.visible = false; sc.add(sp); FX.puffs.push(sp); }
  FX.flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(fc), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); FX.flash.visible = false; sc.add(FX.flash);
}
let knifeBox = new THREE.Box3(); const knifeCenter = () => { knife.visible = true; panda.updateMatrixWorld(true); knifeBox.setFromObject(knife, true); return knifeBox.getCenter(new THREE.Vector3()); };
function rng(seed) { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
// deterministic projectile with bounces on the counter / board / floor
function surfaceY(x, z) { if (Math.abs(x) < 6.3 && z > -0.1 && z < 2.6) return COUNTER_Y + (Math.abs(x) < 2 && z > 0.6 && z < 2.6 ? 0.12 : 0); return 0; }
function ballistic(p0, v0, tau, rest = 0.35, r = 0.05) { const p = p0.clone(), v = v0.clone(); const dt = 1 / 120; for (let s = 0; s < tau; s += dt) { v.y -= 22 * dt; p.addScaledVector(v, dt); const gy = surfaceY(p.x, p.z) + r; if (p.y < gy) { p.y = gy; if (v.y < 0) v.y = -v.y * rest; v.x *= 0.7; v.z *= 0.7; } } return p; }
// time warp: slow motion around hit moments (te = scene time on the "action" clock)
function makeWarp(hits, dur, slow = 0.28, win = 0.14) { const N = 2000, tab = [0]; let acc = 0; const rate = (te) => { let r = 1; for (const h of hits) { const d = Math.abs(te - h); if (d < win) r = Math.min(r, slow + (1 - slow) * (d / win) ** 2); } return r; };
  const dte = dur / N; for (let i = 1; i <= N; i++) { acc += dte / rate(i * dte); tab.push(acc); } return { real: acc, te: (t) => { let lo = 0, hi = N; while (lo < hi) { const m = (lo + hi) >> 1; if (tab[m] < t) lo = m + 1; else hi = m; } return lo * dte; } }; }


// ---------- particle helpers (deterministic) ----------
const _d = new THREE.Object3D(), _c = new THREE.Color();
function part(p, col, sc2) { if (FX.parts.count >= 700) return; _d.position.copy(p); _d.scale.setScalar(sc2); _d.updateMatrix(); FX.parts.setMatrixAt(FX.parts.count, _d.matrix); FX.parts.setColorAt(FX.parts.count, _c.setHex(col)); FX.parts.count++; }
function partsDone() { FX.parts.instanceMatrix.needsUpdate = true; if (FX.parts.instanceColor) FX.parts.instanceColor.needsUpdate = true; }
// a continuous emitter: spawns `rate` particles per second from src(t0) between t0..t1, each lives `life` seconds
function emitter(t, { t0, t1, rate, life, src, vel, col, size = 1, rest = 0.3, seed = 1 }) { const n = Math.floor((Math.min(t, t1) - t0) * rate); for (let i = Math.max(0, n - Math.ceil(life * rate)); i <= n; i++) { const born = t0 + i / rate; const age = t - born; if (age < 0 || age > life || born > t1) continue; const R = rng(seed * 1000 + i); const p0 = src(born, R); const v0 = vel(R); part(ballistic(p0, v0, age, rest, 0.05), typeof col === 'function' ? col(R) : col, size * (1 - (age / life) ** 3) * (0.6 + R() * 0.6)); } }
let puffI = 0; function steam(t, src, { t0, t1, rate = 8, life = 1.6, seed = 5, size = 1.4, tint = 0xffffff } = {}) { const n = Math.floor((Math.min(t, t1) - t0) * rate); for (let i = Math.max(0, n - Math.ceil(life * rate)); i <= n; i++) { const born = t0 + i / rate, age = t - born; if (age < 0 || age > life || puffI >= FX.puffs.length) continue; const R = rng(seed * 77 + i); const sp = FX.puffs[puffI++]; const p = src(R); sp.position.set(p.x + Math.sin(age * 2 + i) * 0.3, p.y + age * 1.8, p.z); sp.scale.setScalar(size * (0.4 + age)); sp.material.opacity = 0.5 * Math.sin(Math.PI * age / life); sp.material.color.setHex(tint); sp.visible = true; } }
const panTop = () => { panda.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(pan, true); return new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y - 0.05, (b.min.z + b.max.z) / 2); };

// 3) vegetables fall straight into the knife's path: the blade passes through them, with slash trail, juice, slow motion
const CH = { list: [['Idle_Holding', -1], ['Chop_Loop', 0.3, 1.3], ['Idle_Holding', 4.3]] };
function prepChop() { const ys = []; for (let te = 0.9; te < 4.0; te += 1 / 90) { track(CH.list, te); ys.push([te, knifeCenter().y]); }
  const mins = []; for (let i = 2; i < ys.length - 2; i++) if (ys[i][1] < ys[i - 1][1] && ys[i][1] <= ys[i + 1][1] && ys[i][1] < ys[i - 2][1] && ys[i][1] <= ys[i + 2][1]) mins.push(ys[i][0]);
  // the slash is the fast downward stroke just before the lowest point
  const hits = []; for (const m of mins) { if (hits.length && m - hits[hits.length - 1] < 0.7) continue; hits.push(m - 0.06); } CH.hits = hits.slice(0, 3);
  CH.pts = CH.hits.map((h) => { track(CH.list, h); return knifeCenter(); }); CH.warp = makeWarp(CH.hits, 4.6); }
scenes.push({ name: 'الخضار', get dur() { return CH.warp ? CH.warp.real : 6; }, update(t) { hide();
  if (!CH.hits) prepChop(); const te = CH.warp.te(t);
  lit(); pan.visible = false; flyKnife.visible = false; knife.visible = true;
  const plateP = new THREE.Vector3(-0.9, COUNTER_Y + 0.08, 1.8); veg.plate.visible = true; veg.plate.position.copy(plateP); veg.plate.updateMatrixWorld(true); const pTop = new THREE.Box3().setFromObject(veg.plate).max.y;
  const items = [['tomato', 'tS', 1.25, 0, 0xd8321f], ['onion', 'oS', 0.72, 0.4, 0xf3ead2], ['carrot', 'cS', 0.25, 0.8, 0xf08a1c]];
  FX.drops.count = 0; let flashOn = false; const dummy = new THREE.Object3D();
  items.forEach(([w, sk, ringR, phase, col], k) => { const h = CH.hits[k], hp = CH.pts[k]; if (h == null) return;
    const v = veg[w], fallT = 0.75; const f = seg(te, h - fallT, h);
    v.visible = te > h - fallT && te < h; v.position.set(hp.x, lerp(hp.y + 7, hp.y, f * f), hp.z); v.rotation.set(te * 4 + k, te * 3, 0);
    const tau = te - h; const R = rng(k + 1);
    // slices: burst out of the cut, bounce on the counter, then slide into place on the plate
    veg[sk].forEach((p, i) => { const n = veg[sk].length; p.visible = tau >= 0; if (tau < 0) return; const a = phase + (i / n) * Math.PI * 2;
      const tgt = new THREE.Vector3(plateP.x + Math.cos(a) * ringR, pTop - 0.12 + (w === 'carrot' ? 0.16 : w === 'onion' ? 0.08 : 0), plateP.z + Math.sin(a) * ringR * 0.9);
      const T = 0.55 + R() * 0.15; const v0 = new THREE.Vector3((tgt.x - hp.x) / T, (tgt.y - hp.y) / T + 11 * T, (tgt.z - hp.z) / T); const free = ballistic(hp, v0, Math.min(tau, T), 0.3, 0.06);
      const u = ease(seg(tau, 0.6, 0.95)); p.position.lerpVectors(free, tgt, u); p.rotation.set((1 - u) * (tau * 14 + i), a, (1 - u) * tau * 6); });
    // juice droplets
    if (tau >= 0 && tau < 1.2) { const RR = rng(k * 7 + 3); FX.drops.material.color.setHex(col); for (let j = 0; j < 40 && FX.drops.count < 160; j++) { const v0 = new THREE.Vector3((RR() - 0.5) * 6, 2 + RR() * 4, (RR() - 0.2) * 4); dummy.position.copy(ballistic(hp, v0, tau, 0.2, 0.04)); const s2 = (0.5 + RR()) * (1 - seg(tau, 0.6, 1.2)); dummy.scale.setScalar(s2); dummy.updateMatrix(); FX.drops.setMatrixAt(FX.drops.count++, dummy.matrix); } FX.drops.instanceMatrix.needsUpdate = true; }
    if (Math.abs(tau) < 0.09) { flashOn = true; FX.flash.position.copy(hp).add(new THREE.Vector3(0, 0, 0.3)); FX.flash.scale.setScalar(2.4 * (1 - Math.abs(tau) / 0.09) + 0.3); }
  });
  FX.flash.visible = flashOn;
  // slash trail: where the blade has been during the last few frames
  const P = FX.trail.geometry.attributes.position, C = FX.trail.geometry.attributes.color; const pts = []; for (let i = 0; i < FX.NT; i++) { track(CH.list, te - i * 0.014); pts.push(knifeCenter()); }
  track(CH.list, te); const speed = pts[0].distanceTo(pts[3]); const vis = Math.min(1, Math.max(0, (speed - 0.25) * 3));
  const vd = new THREE.Vector3(); for (let i = 0; i < FX.NT; i++) { const d = (i < FX.NT - 1 ? pts[i].clone().sub(pts[i + 1]) : pts[i - 1].clone().sub(pts[i])).normalize(); vd.copy(cam.position).sub(pts[i]).normalize(); const side = d.clone().cross(vd).normalize().multiplyScalar(0.22 * (1 - i / FX.NT));
    P.setXYZ(i * 2, pts[i].x + side.x, pts[i].y + side.y, pts[i].z + side.z); P.setXYZ(i * 2 + 1, pts[i].x - side.x, pts[i].y - side.y, pts[i].z - side.z); const a = vis * (1 - i / FX.NT); C.setXYZ(i * 2, a, a * 0.95, a * 0.8); C.setXYZ(i * 2 + 1, a, a * 0.95, a * 0.8); }
  P.needsUpdate = C.needsUpdate = true; FX.trail.visible = vis > 0.02;
  const k = ease(te / 4.6); let shake = 0; for (const h of CH.hits) shake = Math.max(shake, 1 - Math.abs(te - h) / 0.12); shake = Math.max(0, shake) * 0.08;
  cam.position.set(lerp(-3.5, 2.5, k) + Math.sin(t * 80) * shake, lerp(7.8, 7.0, k) + Math.cos(t * 70) * shake, lerp(12, 10, k)); cam.lookAt(0.6, lerp(4.8, 3.6, k), 1.2);
} });
function hide() { veg.plate.visible = false; X.plate2.visible = false; for (const k of ['tomato', 'onion', 'carrot']) veg[k].visible = false; for (const k of ['tS', 'oS', 'cS']) veg[k].forEach((p) => (p.visible = false)); X.fal.forEach((p) => (p.visible = false)); X.rolls.forEach((p) => (p.visible = false)); X.kun.visible = X.kosh.visible = X.duck.visible = X.title.visible = false; X.rab.forEach((r2) => (r2.visible = false)); flyKnife.visible = false; board.visible = true; panda.position.set(0, 0, -1.4); panda.rotation.y = 0; if (FX.trail) { FX.trail.visible = false; FX.flash.visible = false; FX.drops.count = 0; FX.parts.count = 0; FX.puffs.forEach((q) => (q.visible = false)); } if (X.bowl) { X.bowl.visible = X.lid.visible = X.kosh2.visible = X.bag.visible = false; } }
let lhBone = null; const lhand = () => { if (!lhBone) panda.traverse((b) => { if (b.isBone && b.name === 'Middle1L') lhBone = b; }); const v = new THREE.Vector3(); panda.updateMatrixWorld(true); (lhBone || handBone).getWorldPosition(v); return v; };
const plateAt = (pl, x, z) => { pl.visible = true; pl.position.set(x, COUNTER_Y + 0.08, z); pl.updateMatrixWorld(true); return new THREE.Box3().setFromObject(pl).max.y; };
const rblend = (i, n, t, t0) => { const { mx, acts } = X.rmix[i]; for (const k in acts) acts[k].stop(); const w = ease((t - t0) / BL); const a = acts.Idle, b = acts[n]; a.play(); a.setEffectiveWeight(1 - w); a.time = t % a.getClip().duration; b.play(); b.setEffectiveWeight(w); b.time = Math.max(0, t - t0) % b.getClip().duration; mx.update(0); };
const rpose = (i, n, t) => { const { mx, acts } = X.rmix[i]; for (const k in acts) acts[k].stop(); const a = acts[n]; a.play(); a.time = t % a.getClip().duration; mx.update(0); };
// 4) falafel: shaped on the board, dropped in the pan, fried with oil splashes and steam (raw green -> golden), flipped onto the plate
scenes.push({ name: 'الطعمية', dur: 5.8, update(t) {
  hide(); lit(); puffI = 0; knife.visible = false; pan.visible = t > 1.2; track([['Idle', -1], ['Assembly_Loop', 0.05, 1.2], ['Pan_Loop', 1.3, 1.25], ['Yes', 4.7], ['Idle', 5.5]], t);
  const top = plateAt(veg.plate, -2.2, 2.0); const n = X.fal.length; const pt = t > 1.2 ? panTop() : null;
  const raw = new THREE.Color(0x8fb35a), done = new THREE.Color(0xffffff); const cook = ease(seg(t, 2.0, 4.2));
  X.fal.forEach((f, i) => { f.visible = t > 0.2 + i * 0.13; const R = rng(i + 11); const born = 0.2 + i * 0.13; const pop = seg(t, born, born + 0.2); const base = new THREE.Vector3(-0.6 + (i % 4) * 0.42, COUNTER_Y + 0.25, 1.6 + Math.floor(i / 4) * 0.42);
    let p = base.clone(); f.scale.setScalar(0.2 + 0.8 * ease(pop) + Math.sin(pop * Math.PI) * 0.25);
    if (t > 1.45 && pt) { const inPan = pt.clone().add(new THREE.Vector3(Math.cos(i * 0.9) * 0.45, 0.12, Math.sin(i * 0.9) * 0.3)); const u = seg(t, 1.45 + i * 0.05, 1.9 + i * 0.05); p.lerpVectors(base, inPan, ease(u)); p.y += Math.sin(u * Math.PI) * 1.6;
      if (u >= 1) { p.copy(inPan); const flip = Math.max(0, Math.sin((t - 2) * 7.5 + i)) * 0.9 * (t < 4.3 ? 1 : 0); p.y += flip; f.rotation.set(t * 6 * (flip > 0.05) + i, i, 0); } }
    if (t > 4.3 && pt) { const a = (i / (n - 1)) * Math.PI * 2; const tgt = i === n - 1 ? new THREE.Vector3(-2.2, top + 0.15, 2.0) : new THREE.Vector3(-2.2 + Math.cos(a) * 0.95, top + 0.12, 2.0 + Math.sin(a) * 0.85); const T = 0.5; const s0 = pt.clone().add(new THREE.Vector3(Math.cos(i * 0.9) * 0.45, 0.12, Math.sin(i * 0.9) * 0.3));
      const v0 = new THREE.Vector3((tgt.x - s0.x) / T, (tgt.y - s0.y) / T + 11 * T, (tgt.z - s0.z) / T); p = ballistic(s0, v0, Math.min(t - 4.3 - i * 0.04, 1.2), 0.3, 0.12); if (t - 4.3 - i * 0.04 < 0) p = s0; f.rotation.set(Math.min(1, (t - 4.3) / T) * 8 + i, i, 0); }
    f.position.copy(p); X.falT[i].forEach((m) => m.color.copy(raw).lerp(done, cook)); });
  FX.parts.count = 0;
  if (pt) { emitter(t, { t0: 2.0, t1: 4.3, rate: 60, life: 0.55, seed: 3, src: () => pt, vel: (R) => new THREE.Vector3((R() - 0.5) * 5, 3 + R() * 4, (R() - 0.3) * 4), col: (R) => (R() < 0.6 ? 0xffd34d : 0xfff2a0), size: 0.8 }); steam(t, (R) => pt.clone().add(new THREE.Vector3((R() - 0.5) * 0.8, 0.2, (R() - 0.5) * 0.5)), { t0: 1.9, t1: 4.6, rate: 9, seed: 4 }); }
  partsDone();
  const k = ease(t / 5.8); cam.position.set(lerp(-5, -1.5, k), lerp(7.6, 6.8, k), lerp(12.5, 10.5, k)); cam.lookAt(lerp(-0.2, -0.8, k), lerp(4.4, 3.8, k), 1.2);
} });
// 5) kunafa: dough thrown up, spins and lands as a perfect disc
scenes.push({ name: 'الكنافة', dur: 3.4, update(t) {
  hide(); lit(); knife.visible = false; pan.visible = false; track([['Idle', -1], ['Assembly_Loop', 0.05], ['Yes', 0.75], ['Idle', 2.9]], t);
  const top = plateAt(veg.plate, 0, 1.9); X.kun.visible = t > 0.35; const u = seg(t, 0.5, 2.4);
  X.kun.position.set(Math.sin(u * Math.PI * 2) * 0.4, lerp(4.8, top + 0.05, ease(u)) + Math.sin(u * Math.PI) * 4.0, lerp(0.5, 1.9, ease(u)));
  X.kun.rotation.set((1 - ease(u)) * 1.2, u * Math.PI * 10, (1 - ease(u)) * 0.6); X.kun.scale.setScalar(lerp(0.5, 1, ease(u)));
  const up = Math.sin(seg(t, 0.4, 2.3) * Math.PI); cam.position.set(2.5, 5.5 + up * 1.5, 11.5); cam.lookAt(0, 4 + up * 3.2, 0.8);
} });
// 6) koshari built in layers: rice, pasta, lentils fall in streams, red sauce pours, crispy onions on top, steam rising
scenes.push({ name: 'الكشري', dur: 5.4, update(t) {
  hide(); lit(); puffI = 0; knife.visible = false; pan.visible = false; track([['Idle', -1], ['Assembly_Loop', 0.2, 1.1], ['Yes', 4.5], ['Idle', 5.2]], t);
  const bp = new THREE.Vector3(0, COUNTER_Y + 0.05, 1.9); X.bowl.visible = true; X.bowl.position.copy(bp); X.bowl.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(X.bowl);
  X.kosh2.visible = true; X.kosh2.position.set(bp.x, bb.max.y - 0.75, bp.z); X.kosh2.updateMatrixWorld(true); const kb = new THREE.Box3().setFromObject(X.kosh2);
  const fill = ease(seg(t, 0.5, 3.4)); X.clip.constant = lerp(kb.min.y, kb.max.y + 0.2, fill); X.clip.normal.set(0, -1, 0);
  FX.parts.count = 0; const tip = new THREE.Vector3(bp.x + 0.3, bb.max.y + 3.2, bp.z - 0.2); const surf = () => lerp(kb.min.y, kb.max.y, fill);
  const stream = (t0, t1, col, seed, size = 0.7) => emitter(t, { t0, t1, rate: 90, life: 0.5, seed, src: (b, R) => tip.clone().add(new THREE.Vector3((R() - 0.5) * 0.4, 0, (R() - 0.5) * 0.3)), vel: (R) => new THREE.Vector3((R() - 0.5) * 0.6, -2 - R(), (R() - 0.5) * 0.6 + 0.1), col, size, rest: 0.1 });
  stream(0.5, 1.4, (R) => (R() < 0.8 ? 0xfaf6ea : 0xe9dcc0), 21); stream(1.4, 2.1, 0xf2c24e, 22, 0.9); stream(2.1, 2.8, 0x6b4a2e, 23, 0.6);
  emitter(t, { t0: 3.0, t1: 3.8, rate: 140, life: 0.45, seed: 24, src: (b, R) => tip.clone().add(new THREE.Vector3((R() - 0.5) * 0.15, 0, 0)), vel: (R) => new THREE.Vector3((R() - 0.5) * 0.3, -3, (R() - 0.5) * 0.3), col: (R) => (R() < 0.7 ? 0xc0281c : 0xe24a2a), size: 0.9, rest: 0.05 });
  emitter(t, { t0: 3.9, t1: 4.4, rate: 50, life: 0.7, seed: 25, src: (b, R) => tip.clone().add(new THREE.Vector3((R() - 0.5) * 1.2, 0, (R() - 0.5) * 0.8)), vel: (R) => new THREE.Vector3((R() - 0.5) * 0.8, -1.5, (R() - 0.5) * 0.8), col: 0x7a4a1c, size: 1.1, rest: 0.1 });
  partsDone(); steam(t, (R) => new THREE.Vector3(bp.x + (R() - 0.5) * 1.4, surf() + 0.2, bp.z + (R() - 0.5) * 0.8), { t0: 1.0, t1: 5.4, rate: 7, seed: 9, size: 1.6 });
  const k = ease(t / 5.4); cam.position.set(lerp(2.5, -1.5, k), lerp(8.4, 7.2, k), lerp(10.5, 9.5, k)); cam.lookAt(0, lerp(4.6, 3.4, k), 1.6);
} });
// 7b) the koshari jumps off the plate and runs; panda grabs it without looking
scenes.push({ name: 'الكشري الهربان', dur: 4.2, update(t) {
  hide(); lit(); knife.visible = true; pan.visible = false;
  const top = plateAt(veg.plate, -0.5, 1.9); X.kosh.visible = true;
  const run = seg(t, 0.6, 2.1), back = ease(seg(t, 2.5, 3.1));
  const hopX = lerp(-0.5, 4.2, run), hopY = top + 0.02 + Math.abs(Math.sin(run * Math.PI * 5)) * 0.9 * (run > 0 && run < 1);
  X.kosh.position.set(lerp(hopX, -0.5, back), lerp(hopY, top + 0.02, back) + Math.sin(back * Math.PI) * 1.5, 1.9); X.kosh.rotation.set(0, Math.sin(t * 9) * 0.3 * (1 - back), Math.sin(t * 12) * 0.15 * run * (1 - back));
  panda.rotation.y = lerp(0, -0.25, ease(seg(t, 0.2, 0.6)));
  track([['Idle_Holding', -1], ['Punch', 2.0, 1.2], ['Idle_Holding', 2.9]], t);
  const k = ease(t / 4.2); cam.position.set(lerp(1, 2, k), 6.2, lerp(12, 11, k)); cam.lookAt(lerp(0.5, 1.5, ease(run)) * (1 - back) + 0.3, 3.4, 1);
} });
// 7) sushi: rolls pop onto the board one after another
scenes.push({ name: 'السوشي', dur: 3.2, update(t) {
  hide(); lit(); knife.visible = true; pan.visible = false; track([['Idle_Holding', -1], ['Chop_Loop', 0.2, 2], ['Idle_Holding', 2.75]], t);
  X.rolls.forEach((r2, i) => { const t0 = 0.4 + i * 0.32; const u = seg(t, t0, t0 + 0.35); r2.visible = t > t0; const b = u < 1 ? Math.sin(u * Math.PI) * 0.5 : 0; r2.position.set(-1.6 + i * 0.64, COUNTER_Y + 0.25 + b, 1.75); r2.scale.setScalar(u < 1 ? 0.4 + 0.8 * u : 1); r2.rotation.set(Math.PI / 2, 0, 0); });
  const k = ease(t / 3.2); cam.position.set(lerp(-3, 3, k), 6.6, 11.5); cam.lookAt(0, 4.2, 1.2);
} });
// 8) the legendary duck runs across the counter and dodges the panda
scenes.push({ name: 'البطة', dur: 3.6, update(t) {
  hide(); lit(); knife.visible = false; pan.visible = false; board.visible = false;
  const u = seg(t, 0.3, 3.3); X.duck.visible = true; const dx = lerp(-7, 7, u); const jump = Math.max(0, Math.sin(seg(t, 1.5, 2.2) * Math.PI)) * 2.0;
  X.duck.position.set(dx, COUNTER_Y + Math.abs(Math.sin(t * 18)) * 0.15 + jump, 1.6); X.duck.rotation.set(0, Math.PI / 2, Math.sin(t * 18) * 0.12);
  track([['Idle', -1], ['Punch', 1.3, 1.3], ['No', 2.15], ['Idle', 3.2]], t);
  panda.rotation.y = lerp(-0.6, 0.6, ease(seg(t, 0.4, 3.0)));
  cam.position.set(0, 5.8, 13); cam.lookAt(dx * 0.35, 3.4, 1);
} });
// 10) packaging + hand-off: lid drops on with a bounce, bag wraps it, panda slides it down the counter, the delivery rabbit catches it and runs
scenes.push({ name: 'التسليم', dur: 5.6, update(t) {
  hide(); lit(); knife.visible = false; pan.visible = false; track([['Idle', -1], ['Assembly_Loop', 0.4, 1.1], ['Punch', 2.25, 1.3], ['Wave', 3.1], ['Idle', 5.0]], t);
  const slide = t < 2.4 ? 0 : 1 - Math.pow(1 - seg(t, 2.4, 3.6), 3); const x = lerp(0, 5.6, slide);
  const bp = new THREE.Vector3(0, COUNTER_Y + 0.05, 1.9); X.bowl.visible = t < 1.75; X.bowl.position.copy(bp); X.bowl.updateMatrixWorld(true); const btop = new THREE.Box3().setFromObject(X.bowl).max.y;
  X.kosh2.visible = t < 1.75; X.kosh2.position.set(bp.x, btop - 0.75, bp.z); X.clip.constant = 99;
  X.lid.visible = t > 0.3 && t < 1.75; const lf = seg(t, 0.3, 0.75); const bounce = t > 0.75 ? Math.abs(Math.sin((t - 0.75) * 14)) * 0.35 * Math.max(0, 1 - (t - 0.75) * 2.5) : 0; X.lid.position.set(bp.x, lerp(btop + 4, btop + 0.02, lf * lf) + bounce, bp.z); X.lid.rotation.set(0, t * 2 * (1 - seg(t, 0.3, 0.9)), 0);
  const wrap = ease(seg(t, 1.3, 1.8)); X.bag.visible = t > 1.3; X.bag.scale.set(lerp(1.4, 1, wrap), wrap, lerp(1.4, 1, wrap));
  // catch: the rabbit is waiting at the end of the counter
  const rb = X.rab[3]; rb.visible = true; const runOff = seg(t, 4.0, 5.6); rb.position.set(lerp(7.6, 16, runOff * runOff), 0, 3.6); rb.rotation.y = t < 4.0 ? -Math.PI / 2 + 0.3 : Math.PI / 2;
  const { mx, acts } = X.rmix[3]; for (const kk in acts) acts[kk].stop(); const run = t >= 3.9, w = ease((t - 3.9) / BL); const A1 = acts[t < 3.6 ? 'Idle' : 'Idle_Holding'], A2 = acts.Run_Holding || acts.Run; A1.play(); A1.setEffectiveWeight(run ? 1 - w : 1); A1.time = t % A1.getClip().duration; if (run) { A2.play(); A2.setEffectiveWeight(w); A2.time = (t - 3.9) % A2.getClip().duration; } mx.update(0);
  if (t < 3.6) X.bag.position.set(bp.x + x, COUNTER_Y + 0.05, bp.z); else { const hp2 = new THREE.Vector3(); rb.updateMatrixWorld(true); const hb = new THREE.Box3().setFromObject(rb, true); hp2.set((hb.min.x + hb.max.x) / 2, hb.min.y + 1.4, hb.max.z - 0.2); const u = ease(seg(t, 3.6, 3.9)); X.bag.position.lerpVectors(new THREE.Vector3(5.6, COUNTER_Y + 0.05, bp.z), hp2, u); X.bag.position.y += Math.sin(u * Math.PI) * 0.8; X.bag.scale.setScalar(lerp(1, 0.6, u)); }
  FX.parts.count = 0; if (t > 2.4 && t < 3.6) emitter(t, { t0: 2.4, t1: 3.4, rate: 40, life: 0.4, seed: 31, src: () => X.bag.position.clone().add(new THREE.Vector3(-0.9, 0.05, 0.6)), vel: (R) => new THREE.Vector3(-1 - R(), 0.8 + R(), (R() - 0.5)), col: 0xffe9b0, size: 0.6 }); partsDone();
  const k = ease(t / 5.6); cam.position.set(lerp(-1.5, 7.5, ease(seg(t, 1.8, 4.6))), lerp(7.4, 6.4, k), lerp(11.5, 13, k)); cam.lookAt(lerp(0, 7.5, ease(seg(t, 1.8, 4.4))), 3.6, 2);
} });
// 9) rabbits cheer for the panda
scenes.push({ name: 'الأرانب', dur: 3.2, update(t) {
  hide(); lit(); knife.visible = true; pan.visible = false; track([['Idle_Holding', -1], ['Yes', 0.2], ['Idle_Holding', 2.75]], t);
  const spots = [[-4.5, 5.2, 2.6], [-1.6, 5.8, 2.9], [1.6, 5.8, -2.9], [4.5, 5.2, -2.6]];
  X.rab.forEach((r2, i) => { r2.visible = true; r2.position.set(spots[i][0], 0, spots[i][1]); r2.rotation.y = Math.PI + spots[i][2] * 0.12; rblend(i, i % 2 ? 'Wave' : 'Yes', t, 0.2 + i * 0.15); });
  const k = ease(t / 3.2); cam.position.set(0, lerp(4.5, 6.5, k), lerp(16, 19, k)); cam.lookAt(0, 3.4, 1.5);
} });
// 10) logo: all the food rises and the title appears, the duck runs in the back
scenes.push({ name: 'الشعار', dur: 4.6, update(t) {
  hide(); lit(); knife.visible = false; pan.visible = false; track([['Idle', -1], ['Yes', 0.2], ['Wave', 2.5]], t);
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

window.renderAt = (T) => { at(T); r.render(sc, cam); };
window.renderScene = (i, t) => { scenes[i].update(t); r.render(sc, cam); };
window.portrait = (i, t, p, l, bg) => { scenes[i].update(t); cam.position.set(...p); cam.lookAt(...l); const old = sc.background; const hid = []; if (bg) { sc.background = new THREE.Color(bg); stage.children.forEach((c) => { if (c !== panda && c !== flyKnife && c.visible) { c.visible = false; hid.push(c); } }); } r.render(sc, cam); sc.background = old; hid.forEach((c) => (c.visible = true)); return r.domElement.toDataURL('image/png'); };
(async () => { await buildStage(); await buildActors(); buildFX(); prepChop(); window.SCENES = scenes.map((s) => ({ name: s.name, dur: s.dur })); window.READY = true;
  if (!window.REC) { const clk = new THREE.Clock(); r.setAnimationLoop(() => { const T = clk.getElapsedTime() % total(); window.renderAt(T); }); } })();
addEventListener('resize', () => { if (window.REC) return; cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); r.setSize(innerWidth, innerHeight); });
