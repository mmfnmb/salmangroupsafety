// Core: renderer, scene, audio, storage, assets, particles, physics world.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import * as CANNON from 'cannon-es';

export { THREE, CANNON, SkeletonUtils };
export const $ = (id) => document.getElementById(id);
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const PI = Math.PI;
export const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
document.documentElement.lang = 'ar'; document.documentElement.dir = 'rtl';

// shared mutable game state
export const G = { mode: 'loading', level: null, runners: [], player: null, shake: 0, t: 0, paused: false, aim: V(0, 0, -1) };

// ---------------------------------------------------------------- storage
export const store = {
  get(k, d) { try { const v = localStorage.getItem('boltdash.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('boltdash.' + k, JSON.stringify(v)); } catch { /* storage blocked */ } },
};
export const save = {
  coins: store.get('coins', 0), wins: store.get('wins', 0), muted: store.get('muted', false),
  owned: store.get('owned', ['skin-blue', 'bat-golf']), equip: store.get('equip', { skin: 'skin-blue', bat: 'bat-golf' }),
  xp: store.get('xp', 0), gift: store.get('gift', false), daily: store.get('daily', null), maps: store.get('maps', null),
  name: store.get('name', 'بولت'), stats: store.get('stats', { games: 0, rounds: 0, qual: 0, crowns: 0, earned: 0 }),
  season: store.get('season', []), dailyRew: store.get('dailyRew', { day: '', streak: 0 }), sens: store.get('sens', 1), shadows: store.get('shadows', true),
};
if (!save.owned.includes('bat-golf')) save.owned.push('bat-golf');
if (!save.equip.bat) save.equip.bat = 'bat-golf';
export const persist = () => { for (const k of ['coins', 'wins', 'owned', 'equip', 'xp', 'gift', 'daily', 'maps', 'muted', 'name', 'stats', 'season', 'dailyRew', 'sens', 'shadows']) store.set(k, save[k]); };

// ---------------------------------------------------------------- audio (synth)
export const sfx = (() => {
  let ctx = null, master = null;
  const ensure = () => {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination); } catch { return false; } }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  };
  const tone = (f0, f1, dur, type = 'sine', vol = 0.3, delay = 0) => {
    if (save.muted || !ensure()) return;
    const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  };
  const noise = (dur, vol = 0.3, freq = 800) => {
    if (save.muted || !ensure()) return;
    const t = ctx.currentTime, n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = vol;
    s.buffer = buf; s.connect(f); f.connect(g); g.connect(master); s.start(t);
  };
  return {
    unlock: ensure,
    jump: () => tone(320, 640, 0.14, 'square', 0.12),
    land: () => noise(0.08, 0.25, 500),
    boing: () => { tone(180, 900, 0.35, 'sine', 0.35); tone(360, 1400, 0.25, 'triangle', 0.12, 0.03); },
    coin: () => { tone(988, 988, 0.08, 'triangle', 0.2); tone(1319, 1319, 0.22, 'triangle', 0.2, 0.08); },
    star: () => { tone(1175, 1175, 0.08, 'triangle', 0.2); tone(1568, 1568, 0.08, 'triangle', 0.2, 0.07); tone(2093, 2093, 0.2, 'triangle', 0.18, 0.14); },
    hit: () => { noise(0.25, 0.45, 1200); tone(160, 50, 0.3, 'sawtooth', 0.18); },
    dive: () => noise(0.18, 0.2, 2500),
    beep: () => tone(660, 660, 0.15, 'square', 0.15),
    go: () => tone(990, 990, 0.35, 'square', 0.18),
    boom: () => { noise(0.45, 0.55, 600); tone(90, 40, 0.45, 'sine', 0.4); },
    shoot: () => { tone(900, 300, 0.12, 'square', 0.12); noise(0.06, 0.15, 3000); },
    rocket: () => { noise(0.35, 0.3, 1500); tone(200, 500, 0.3, 'sawtooth', 0.08); },
    freeze: () => { tone(1800, 2400, 0.25, 'sine', 0.15); tone(2600, 3200, 0.2, 'triangle', 0.08, 0.05); },
    pickup: () => { tone(523, 1046, 0.18, 'square', 0.1); tone(784, 1568, 0.2, 'triangle', 0.12, 0.08); },
    crack: () => noise(0.12, 0.35, 900),
    fall: () => tone(400, 120, 0.4, 'triangle', 0.15),
    pan: () => { tone(1400, 1350, 0.6, 'triangle', 0.25); tone(2100, 2050, 0.5, 'sine', 0.12); },
    swing: () => noise(0.12, 0.2, 4000),
    bat: () => { tone(300, 120, 0.12, 'square', 0.2); noise(0.1, 0.3, 2500); },
    goal: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, 0.25, 'square', 0.14, i * 0.09)),
    join: () => tone(700 + Math.random() * 300, 1100, 0.1, 'triangle', 0.12),
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.25, 'triangle', 0.22, i * 0.12)),
    lose: () => [392, 330, 262].forEach((f, i) => tone(f, f * 0.98, 0.3, 'triangle', 0.2, i * 0.18)),
    click: () => tone(700, 500, 0.06, 'triangle', 0.15),
    tick: () => tone(1200, 1200, 0.04, 'square', 0.06),
  };
})();

// ---------------------------------------------------------------- renderer / scene
export const canvas = $('c');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, IS_TOUCH ? 1.75 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbfe8ff, 70, 190);
export const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 500);
export const sky = (() => {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x3fb6ff) }, mid: { value: new THREE.Color(0xa8e4ff) }, bot: { value: new THREE.Color(0xffd9ef) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.6, h)) : mix(mid, bot, smoothstep(0.0, -0.4, h)); gl_FragColor = vec4(c, 1.0); }',
  });
  const s = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), m); s.renderOrder = -1; s.frustumCulled = false; scene.add(s); return s;
})();
export const hemi = new THREE.HemisphereLight(0xffffff, 0xa0d080, 1.5);
scene.add(hemi);
export const sun = new THREE.DirectionalLight(0xfff4e0, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(IS_TOUCH ? 1024 : 2048, IS_TOUCH ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 140 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
export const sea = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ color: 0x7fd8ff, roughness: 0.35, metalness: 0.05 }));
sea.rotation.x = -PI / 2; sea.position.y = -40; scene.add(sea);

export function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.fov = w < h ? 74 : 62; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------------------------------------------------------------- assets
const Q = ['Character', 'Bouncer', 'Hazard_Saw', 'Hazard_Cylinder', 'SpikyBall', 'Cannon', 'Cannonball', 'Goal_Flag', 'Coin', 'Star',
  'Cube_Grass_Single', 'Cube_Bricks', 'Cube_Crate', 'Cube_Question', 'Cloud_1', 'Cloud_2', 'Cloud_3', 'Tree', 'Tree_Fruit', 'Bush', 'Rock_1', 'Rock_2',
  'RockPlatforms_Medium', 'Arrow', 'Tower', 'Plant_Large', 'Fence_Middle', 'Hazard_SpikeTrap'];
const A = ['Crown', 'Crown2', 'ice-cream', 'cupcake', 'donut-sprinkles', 'present-a-cube', 'aid-glasses', 'aid-sunglasses', 'Armor_Leather', 'Armor_Metal',
  'Armor_Golden', 'Armor_Black', 'StarBadge', 'Backpack', 'Bag', 'Shield_Round', 'Shield_Heater'];
const K = ['fence-straight', 'fence-low-straight', 'fence-rope', 'conveyor-belt', 'spring', 'saw', 'spike-block', 'spike-block-wide', 'platform', 'platform-ramp',
  'door-rotate', 'block-moving', 'block-moving-large', 'crate', 'crate-strong', 'crate-item', 'flag', 'block-grass-low-hexagon', 'block-snow-low-hexagon', 'star',
  'jewel', 'coin-gold', 'trap-spikes', 'indicator-special-arrow', 'shape-slope', 'wall', 'rocketlauncher', 'rocketlauncherModern', 'ammo_rocket', 'grenade',
  'blaster-a', 'blaster-d', 'blaster-h', 'blaster-l', 'blaster-o', 'blaster-r', 'grenade-a', 'bullet-foam-tip', 'ball-green', 'ball-red', 'ball-blue', 'club-red', 'club-blue',
  'flag-large-red', 'flag-large-blue', 'structure-gate-wide', 'windmill', 'castle', 'bump', 'ramp-large', 'trophy', 'banner', 'bannerTowerRed', 'bannerTowerGreen',
  'flagCheckers', 'banner-red', 'banner-green', 'frying-pan', 'loaf-baguette', 'rollingPin', 'fish', 'corn-dog', 'cooking-spatula', 'candy-cane-red',
  'candy-cane-green', 'present-b-round', 'tool-hammer', 'tool-paddle', 'item-banana', 'q_Club', 'q_Hammer_Double_Golden', 'q_Bone', 'q_Crystal2', 'q_Gem_Pink', 'q_Star_Outline'];
export const MODEL_NAMES = [...Q, ...A.map((n) => 'acc/' + n), ...K.map((n) => 'k/' + n)];
export const M = {};
export async function loadAssets(onProgress) {
  const loader = new GLTFLoader();
  let done = 0;
  const finish = (n, g) => { g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); M[n] = g; done++; onProgress(done / MODEL_NAMES.length); };
  const bundleUrl = document.querySelector('meta[name="bolt-bundle"]')?.content;
  if (window.__BD_MODELS || bundleUrl) {
    const bundle = window.__BD_MODELS || await (await fetch(bundleUrl)).json();
    await Promise.all(MODEL_NAMES.map((n) => {
      if (!bundle[n]) return Promise.reject(new Error('missing model ' + n));
      const bin = Uint8Array.from(atob(bundle[n]), (c) => c.charCodeAt(0)).buffer;
      return new Promise((res, rej) => loader.parse(bin, './', (g) => { finish(n, g); res(); }, rej));
    }));
    return;
  }
  await Promise.all(MODEL_NAMES.map((n) => new Promise((res, rej) => loader.load(`./models/${n}.glb`, (g) => { finish(n, g); res(); }, undefined, rej))));
}
export function clone(name) { return M[name].animations.length ? SkeletonUtils.clone(M[name].scene) : M[name].scene.clone(); }
export function place(name, x, y, z, s = 1, ry = 0, parent = scene) {
  const o = clone(name); o.position.set(x, y, z);
  if (Array.isArray(s)) o.scale.set(...s); else o.scale.setScalar(s);
  o.rotation.y = ry; parent.add(o); return o;
}
// many copies of one model in a few draw calls; returns { group, meshes }
export function instanced(name, transforms, parent = scene, shadows = true) {
  const src = M[name].scene; src.updateMatrixWorld(true);
  const tmp = new THREE.Matrix4(), q = new THREE.Quaternion(), group = new THREE.Group(), meshes = [];
  src.traverse((node) => {
    if (!node.isMesh) return;
    const im = new THREE.InstancedMesh(node.geometry, node.material, Math.max(1, transforms.length));
    im.castShadow = shadows; im.receiveShadow = true; im.userData.local = node.matrixWorld.clone();
    transforms.forEach((t, i) => {
      q.setFromEuler(new THREE.Euler(t.rx || 0, t.ry || 0, t.rz || 0));
      tmp.compose(new THREE.Vector3(t.x, t.y, t.z), q, new THREE.Vector3(t.sx ?? t.s ?? 1, t.sy ?? t.s ?? 1, t.sz ?? t.s ?? 1));
      im.setMatrixAt(i, tmp.clone().multiply(node.matrixWorld));
    });
    if (!transforms.length) im.count = 0;
    im.computeBoundingSphere(); group.add(im); meshes.push(im);
  });
  parent.add(group); return { group, meshes };
}

// ---------------------------------------------------------------- particles
export class Particles {
  constructor(geo, max, opts = {}) {
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.6, ...opts }), max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false; this.mesh.count = 0;
    this.p = []; this.max = max; this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.c = new THREE.Color(); this.s = new THREE.Vector3();
    this.mesh.setColorAt(0, this.c.set(0xffffff));
    scene.add(this.mesh);
  }
  emit(o) { if (this.p.length >= this.max) this.p.shift(); this.p.push({ life: o.life, t: 0, pos: o.pos.clone(), vel: o.vel.clone(), size: o.size, g: o.g ?? 0, drag: o.drag ?? 0, color: o.color, spin: o.spin ?? 0, rot: new THREE.Vector3(rand(0, 6), rand(0, 6), rand(0, 6)), shrink: o.shrink ?? true }); }
  update(dt) {
    const keep = [];
    for (const p of this.p) {
      p.t += dt; if (p.t >= p.life) continue;
      p.vel.y -= p.g * dt; p.vel.multiplyScalar(1 - p.drag * dt); p.pos.addScaledVector(p.vel, dt);
      p.rot.addScalar(p.spin * dt); keep.push(p);
    }
    this.p = keep;
    this.p.forEach((p, i) => {
      const k = p.t / p.life, s = p.shrink ? p.size * (1 - k * k) : p.size;
      this.q.setFromEuler(this.e.set(p.rot.x, p.rot.y, p.rot.z));
      this.m.compose(p.pos, this.q, this.s.set(s, s, s));
      this.mesh.setMatrixAt(i, this.m); this.mesh.setColorAt(i, this.c.set(p.color));
    });
    this.mesh.count = this.p.length;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  clear() { this.p = []; this.mesh.count = 0; }
}
export const puffs = new Particles(new THREE.IcosahedronGeometry(0.5, 0), 500, { flatShading: true });
export const confetti = new Particles(new THREE.PlaneGeometry(0.35, 0.2), 500, { side: THREE.DoubleSide, roughness: 0.4 });
export const fx = {
  dust(pos, n = 6, color = 0xf3ecdf, power = 2) {
    for (let i = 0; i < n; i++) { const a = rand(0, PI * 2); puffs.emit({ pos: pos.clone().add(V(Math.cos(a) * 0.3, 0.15, Math.sin(a) * 0.3)), vel: V(Math.cos(a) * power, rand(0.6, 1.8), Math.sin(a) * power), life: rand(0.3, 0.5), size: rand(0.14, 0.26), drag: 3, color }); }
  },
  burst(pos, color, n = 14, power = 6, size = 1) {
    for (let i = 0; i < n; i++) puffs.emit({ pos: pos.clone(), vel: V(rand(-1, 1), rand(0.2, 1.2), rand(-1, 1)).normalize().multiplyScalar(rand(power * 0.5, power)), life: rand(0.4, 0.7), size: rand(0.15, 0.3) * size, g: 12, drag: 1, color });
  },
  boom(pos, r = 2) {
    for (let i = 0; i < 26; i++) puffs.emit({ pos: pos.clone(), vel: V(rand(-1, 1), rand(-0.2, 1), rand(-1, 1)).normalize().multiplyScalar(rand(3, 9) * r / 2), life: rand(0.35, 0.8), size: rand(0.3, 0.6), drag: 2.5, color: [0xffd23f, 0xff7a2f, 0xff4f2f, 0xfff1c4][i % 4] });
    for (let i = 0; i < 10; i++) puffs.emit({ pos: pos.clone(), vel: V(rand(-2, 2), rand(1, 3), rand(-2, 2)), life: rand(0.8, 1.3), size: rand(0.4, 0.7), drag: 1.5, color: 0x9a9aa8 });
  },
  confetti(pos, n = 140) {
    const cols = [0xff4f9a, 0xffd23f, 0x36e0a8, 0x5fcfff, 0xa070ff, 0xffffff];
    for (let i = 0; i < n; i++) confetti.emit({ pos: pos.clone().add(V(rand(-3, 3), rand(0, 2), rand(-1, 1))), vel: V(rand(-6, 6), rand(8, 16), rand(-6, 6)), life: rand(2, 3.5), size: 1, g: 9, drag: 1.4, spin: rand(4, 10), color: cols[i % cols.length], shrink: false });
  },
};

// ---------------------------------------------------------------- physics world
export const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -30, 0) });
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = false;
world.solver.iterations = 10;
export const G_STATIC = 1, G_RUNNER = 2, G_HAZARD = 4, G_BALL = 8, G_PROJ = 16;
export const matGround = new CANNON.Material('ground'), matRunner = new CANNON.Material('runner'), matBall = new CANNON.Material('ball');
world.addContactMaterial(new CANNON.ContactMaterial(matGround, matRunner, { friction: 0.0, restitution: 0 }));
world.addContactMaterial(new CANNON.ContactMaterial(matRunner, matRunner, { friction: 0.0, restitution: 0.05 }));
world.addContactMaterial(new CANNON.ContactMaterial(matBall, matGround, { friction: 0.2, restitution: 0.45 }));
world.addContactMaterial(new CANNON.ContactMaterial(matBall, matRunner, { friction: 0.1, restitution: 0.4 }));
world.defaultContactMaterial.friction = 0.1;
export function addBox(x, y, z, hx, hy, hz, opts = {}) {
  const b = new CANNON.Body({ type: opts.type ?? CANNON.Body.STATIC, mass: 0, material: matGround, collisionFilterGroup: opts.group ?? G_STATIC, collisionFilterMask: opts.mask ?? (G_RUNNER | G_BALL | G_PROJ) });
  b.addShape(new CANNON.Box(new CANNON.Vec3(hx, hy, hz)));
  b.position.set(x, y, z); if (opts.ry) b.quaternion.setFromEuler(0, opts.ry, 0);
  world.addBody(b); return b;
}
export const toast = (() => {
  let t = 0, el = null;
  const f = (msg, dur = 1.8) => { el = el || $('toast'); el.textContent = msg; el.hidden = false; t = dur; };
  f.update = (dt) => { if (t > 0) { t -= dt; if (t <= 0) el.hidden = true; } };
  return f;
})();
