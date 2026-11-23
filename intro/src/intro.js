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
let panda, pmix, pAct = {}, knife, pan, board, flyKnife;
async function buildActors() {
  panda = await obj('panda_tools.gltf', { h: 7.6 }); stage.add(panda);
  panda.traverse((m) => { if (m.isMesh) m.frustumCulled = false; if (m.name === 'Knife') knife = m; if (m.name === 'Pan') pan = m; });
  pmix = new THREE.AnimationMixer(panda.children[0]); for (const c of panda.userData.anims) pAct[c.name] = pmix.clipAction(c);
  flyKnife = await obj('kr/knife.gltf', { w: 1.2 }); flyKnife.visible = false; stage.add(flyKnife);
  board = await obj('kr/cuttingboard.gltf', { w: 3.2 }); board.position.set(0, COUNTER_Y, 1.6); stage.add(board);
}
// play a clip at an absolute time (deterministic)
function pose(name, time, weight = 1) { for (const k in pAct) { pAct[k].stop(); } const a = pAct[name]; if (!a) return; a.play(); a.setEffectiveWeight(weight); pmix.setTime(0); a.time = time % a.getClip().duration; pmix.update(0); }
function pose2(n1, t1, n2, t2, w) { for (const k in pAct) pAct[k].stop(); const a = pAct[n1], b = pAct[n2]; a.play(); b.play(); a.setEffectiveWeight(1 - w); b.setEffectiveWeight(w); a.time = t1 % a.getClip().duration; b.time = t2 % b.getClip().duration; pmix.update(0); }

// ---------- scenes ----------
const scenes = [];
// 1) dark kitchen: one light on the board, panda with his back to us, turns around
scenes.push({ name: 'المطبخ الضلمة', dur: 4, update(t) {
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
scenes.push({ name: 'السكينة', dur: 3.4, update(t) {
  lit(); pan.visible = false; flyKnife.visible = false; panda.position.set(0, 0, -1.4); panda.rotation.y = 0;
  if (t < 0.55) pose('Idle_Holding', t);
  else if (t < 2.2) pose2('Idle_Holding', t, 'Jump_Idle', t, 0.0);
  else pose2('Sword', (t - 2.2) * 1.1, 'Idle_Holding', t, ease(seg(t, 3.0, 3.4)));
  const h0 = hand(); knife.visible = !(t > 0.55 && t < 2.0);
  if (t > 0.55 && t < 2.0) { const u = seg(t, 0.55, 2.0); flyKnife.visible = true; flyKnife.position.set(h0.x + Math.sin(u * Math.PI) * 0.3, h0.y + Math.sin(u * Math.PI) * 3.6, h0.z + 0.4); flyKnife.rotation.set(0, 0, u * Math.PI * 6); }
  const up = Math.sin(seg(t, 0.4, 2.1) * Math.PI); cam.position.set(lerp(3.5, 2, t / 3.4), 6.4 + up * 1.4, 13 + up * 1.5); cam.lookAt(0, 5.4 + up * 2.2, 0);
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
