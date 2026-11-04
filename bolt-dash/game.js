// Bolt Dash — obstacle-race party game (three.js + cannon-es physics)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import * as CANNON from 'cannon-es';

const $ = (id) => document.getElementById(id);
document.documentElement.lang = 'ar'; document.documentElement.dir = 'rtl';
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

// ---------------------------------------------------------------- storage
const store = {
  get(k, d) { try { const v = localStorage.getItem('boltdash.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('boltdash.' + k, JSON.stringify(v)); } catch { /* storage blocked */ } },
};
const save = { coins: store.get('coins', 0), wins: store.get('wins', 0), muted: store.get('muted', false) };

// ---------------------------------------------------------------- audio (synth, no files)
const sfx = (() => {
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
    hit: () => { noise(0.25, 0.45, 1200); tone(160, 50, 0.3, 'sawtooth', 0.18); },
    dive: () => noise(0.18, 0.2, 2500),
    beep: () => tone(660, 660, 0.15, 'square', 0.15),
    go: () => tone(990, 990, 0.35, 'square', 0.18),
    boom: () => { noise(0.4, 0.5, 600); tone(90, 40, 0.4, 'sine', 0.4); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.25, 'triangle', 0.22, i * 0.12)),
    lose: () => [392, 330, 262].forEach((f, i) => tone(f, f * 0.98, 0.3, 'triangle', 0.2, i * 0.18)),
    click: () => tone(700, 500, 0.06, 'triangle', 0.15),
  };
})();

// ---------------------------------------------------------------- renderer / scene
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, IS_TOUCH ? 1.75 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbfe8ff, 60, 170);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);

// gradient sky dome
{
  const g = new THREE.SphereGeometry(300, 32, 16);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x3fb6ff) }, mid: { value: new THREE.Color(0xa8e4ff) }, bot: { value: new THREE.Color(0xffd9ef) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.6, h)) : mix(mid, bot, smoothstep(0.0, -0.4, h)); gl_FragColor = vec4(c, 1.0); }',
  });
  const sky = new THREE.Mesh(g, m); sky.renderOrder = -1; sky.frustumCulled = false;
  scene.add(sky);
  scene.userData.sky = sky;
}
const hemi = new THREE.HemisphereLight(0xffffff, 0xa0d080, 1.5);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff4e0, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(IS_TOUCH ? 1024 : 2048, IS_TOUCH ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

// soft candy sea far below the course
{
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshStandardMaterial({ color: 0x7fd8ff, roughness: 0.35, metalness: 0.05 }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = -14; scene.add(sea);
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < h ? 72 : 60;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------------------------------------------------------------- assets
const MODEL_NAMES = ['Character', 'Bouncer', 'Hazard_Saw', 'Hazard_Cylinder', 'SpikyBall', 'Cannon', 'Cannonball', 'Goal_Flag', 'Coin', 'Star',
  'Cube_Grass_Single', 'Cube_Bricks', 'Cube_Crate', 'Cube_Question', 'Cloud_1', 'Cloud_2', 'Cloud_3', 'Tree', 'Tree_Fruit', 'Bush', 'Rock_1', 'Rock_2',
  'RockPlatforms_Medium', 'Arrow', 'Tower', 'Plant_Large', 'Fence_Middle', 'Hazard_SpikeTrap'];
const M = {};
async function loadAssets(onProgress) {
  const loader = new GLTFLoader();
  let done = 0;
  await Promise.all(MODEL_NAMES.map((n) => new Promise((res, rej) => loader.load(`./models/${n}.glb`, (g) => {
    g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    M[n] = g; done++; onProgress(done / MODEL_NAMES.length); res();
  }, undefined, rej))));
}
function place(name, x, y, z, s = 1, ry = 0, parent = scene) {
  const o = M[name].animations.length ? SkeletonUtils.clone(M[name].scene) : M[name].scene.clone();
  o.position.set(x, y, z); o.scale.setScalar(s); o.rotation.y = ry; parent.add(o); return o;
}
// many copies of one model in a few draw calls
function instanced(name, transforms, parent = scene, shadows = true) {
  const src = M[name].scene; src.updateMatrixWorld(true);
  const tmp = new THREE.Matrix4(), q = new THREE.Quaternion(), group = new THREE.Group();
  src.traverse((node) => {
    if (!node.isMesh) return;
    const im = new THREE.InstancedMesh(node.geometry, node.material, transforms.length);
    im.castShadow = shadows; im.receiveShadow = true;
    transforms.forEach((t, i) => {
      q.setFromEuler(new THREE.Euler(0, t.ry || 0, 0));
      tmp.compose(new THREE.Vector3(t.x, t.y, t.z), q, new THREE.Vector3(t.sx ?? t.s ?? 1, t.sy ?? t.s ?? 1, t.sz ?? t.s ?? 1));
      im.setMatrixAt(i, tmp.clone().multiply(node.matrixWorld));
    });
    im.computeBoundingSphere();
    group.add(im);
  });
  parent.add(group); return group;
}

// ---------------------------------------------------------------- particles
class Particles {
  constructor(geo, max, opts = {}) {
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.6, ...opts }), max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false; this.mesh.count = 0;
    this.p = []; this.max = max; this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.c = new THREE.Color();
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
      this.m.compose(p.pos, this.q, new THREE.Vector3(s, s, s));
      this.mesh.setMatrixAt(i, this.m); this.mesh.setColorAt(i, this.c.set(p.color));
    });
    this.mesh.count = this.p.length;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  clear() { this.p = []; this.mesh.count = 0; }
}
const puffs = new Particles(new THREE.IcosahedronGeometry(0.5, 0), 400, { flatShading: true });
const confetti = new Particles(new THREE.PlaneGeometry(0.35, 0.2), 500, { side: THREE.DoubleSide, roughness: 0.4 });
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const fx = {
  dust(pos, n = 6, color = 0xf3ecdf, power = 2) {
    for (let i = 0; i < n; i++) { const a = rand(0, Math.PI * 2); puffs.emit({ pos: pos.clone().add(V(Math.cos(a) * 0.3, 0.15, Math.sin(a) * 0.3)), vel: V(Math.cos(a) * power, rand(0.6, 1.8), Math.sin(a) * power), life: rand(0.3, 0.5), size: rand(0.14, 0.26), drag: 3, color }); }
  },
  burst(pos, color, n = 14, power = 6) {
    for (let i = 0; i < n; i++) puffs.emit({ pos: pos.clone(), vel: V(rand(-1, 1), rand(0.2, 1.2), rand(-1, 1)).normalize().multiplyScalar(rand(power * 0.5, power)), life: rand(0.4, 0.7), size: rand(0.15, 0.3), g: 12, drag: 1, color });
  },
  confetti(pos, n = 140) {
    const cols = [0xff4f9a, 0xffd23f, 0x36e0a8, 0x5fcfff, 0xa070ff, 0xffffff];
    for (let i = 0; i < n; i++) confetti.emit({ pos: pos.clone().add(V(rand(-3, 3), rand(0, 2), rand(-1, 1))), vel: V(rand(-6, 6), rand(8, 16), rand(-6, 6)), life: rand(2, 3.5), size: 1, g: 9, drag: 1.4, spin: rand(4, 10), color: cols[i % cols.length], shrink: false });
  },
};
let shake = 0;

// ---------------------------------------------------------------- physics world
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -30, 0) });
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = false;
world.solver.iterations = 10;
const G_STATIC = 1, G_RUNNER = 2, G_HAZARD = 4, G_BALL = 8;
const matGround = new CANNON.Material('ground'), matRunner = new CANNON.Material('runner'), matBall = new CANNON.Material('ball');
world.addContactMaterial(new CANNON.ContactMaterial(matGround, matRunner, { friction: 0.0, restitution: 0 }));
world.addContactMaterial(new CANNON.ContactMaterial(matRunner, matRunner, { friction: 0.0, restitution: 0.05 }));
world.addContactMaterial(new CANNON.ContactMaterial(matBall, matGround, { friction: 0.2, restitution: 0.35 }));
world.addContactMaterial(new CANNON.ContactMaterial(matBall, matRunner, { friction: 0.1, restitution: 0.4 }));
world.defaultContactMaterial.friction = 0.1;

function addBox(x, y, z, hx, hy, hz, opts = {}) {
  const b = new CANNON.Body({ type: opts.type ?? CANNON.Body.STATIC, mass: 0, material: matGround, collisionFilterGroup: opts.group ?? G_STATIC, collisionFilterMask: G_RUNNER | G_BALL });
  b.addShape(new CANNON.Box(new CANNON.Vec3(hx, hy, hz)));
  b.position.set(x, y, z); world.addBody(b); return b;
}

// ---------------------------------------------------------------- course
// Course runs along -Z. Floor top is y = 0. Track is 12m wide.
const COURSE = { start: 6, finish: -150, width: 12 };
const level = { root: new THREE.Group(), bodies: [], sweepers: [], saws: [], bouncers: [], cannons: [], balls: [], coins: [], checkpoints: [], crates: [] };
scene.add(level.root);

function floorStrip(z0, z1, x0 = -6, x1 = 6, y = 0) {
  const tiles = [];
  for (let z = z0 - 1; z > z1; z -= 2) for (let x = x0 + 1; x < x1; x += 2) tiles.push({ x, y: y - 1, z });
  instanced('Cube_Grass_Single', tiles, level.root);
  level.bodies.push(addBox((x0 + x1) / 2, y - 1, (z0 + z1) / 2, (x1 - x0) / 2, 1, Math.abs(z0 - z1) / 2));
}

function buildCourse() {
  // --- start pad + sweeper zone
  floorStrip(COURSE.start + 6, -40);
  level.checkpoints.push({ z: COURSE.start, y: 0.2 });
  // arrows painted on the floor at the start
  instanced('Arrow', [-3, 0, 3].map((x) => ({ x, y: 0.02, z: 1, s: 1.4, ry: Math.PI / 2 })), level.root, false);

  for (const [z, w] of [[-13, 1.25], [-29, -1.5]]) {
    const pillar = place('Hazard_Cylinder', 0, 0, z, 0.9, 0, level.root);
    level.bodies.push((() => { const b = new CANNON.Body({ type: CANNON.Body.STATIC, material: matGround, collisionFilterGroup: G_STATIC, collisionFilterMask: G_RUNNER | G_BALL }); b.addShape(new CANNON.Cylinder(1, 1, 3.5, 12)); b.position.set(0, 1.75, z); world.addBody(b); return b; })());
    // spinning arm built from brick cubes
    const arm = new THREE.Group(); arm.position.set(0, 0.75, z); level.root.add(arm);
    const bricks = []; for (let x = -5.6; x <= 5.61; x += 0.7) if (Math.abs(x) > 0.9) bricks.push({ x, y: 0, z: 0, s: 0.36 });
    instanced('Cube_Bricks', bricks, arm);
    const body = new CANNON.Body({ type: CANNON.Body.KINEMATIC, material: matGround, collisionFilterGroup: G_HAZARD, collisionFilterMask: G_RUNNER | G_BALL });
    body.addShape(new CANNON.Box(new CANNON.Vec3(5.8, 0.36, 0.36)));
    body.position.set(0, 0.75, z); body.angularVelocity.set(0, w, 0); body.userData = { kind: 'sweeper', w, cx: 0, cz: z };
    world.addBody(body);
    level.sweepers.push({ arm, body, w, z, pillar });
  }

  level.checkpoints.push({ z: -33, y: 0.2 });
  // --- gap 1 with bouncers and crate stepping stones
  for (const x of [-4, 0, 4]) {
    const b = place('Bouncer', x, -1.35, -37.6, 1, 0, level.root);
    const mixer = new THREE.AnimationMixer(b);
    const clip = M.Bouncer.animations.find((a) => a.name === 'Bouncer_Bounce');
    level.bouncers.push({ x, z: -37.6, obj: b, mixer, action: clip ? mixer.clipAction(clip) : null });
  }
  for (const [x, z] of [[-3.5, -44.6], [3.5, -45.6]]) {
    place('Cube_Crate', x, -1.2, z, 1.2, rand(0, 1), level.root);
    level.bodies.push(addBox(x, -1.2, z, 1.2, 1.2, 1.2));
    level.crates.push({ x, z });
  }
  level.checkpoints.push({ z: -56, y: 0.2 });

  // --- saw zone
  floorStrip(-50, -92);
  for (const [z, ph, sp] of [[-63, 0, 1.6], [-72, 2.1, 2.0], [-81, 4.2, 1.8]]) {
    const saw = place('Hazard_Saw', 0, 1.55, z, 1.25, 0, level.root);
    // rail under the saw
    instanced('Fence_Middle', [-4.5, -1.5, 1.5, 4.5].map((x) => ({ x, y: 0, z: z - 0.9, s: 0.8, ry: 0 })), level.root);
    const body = new CANNON.Body({ type: CANNON.Body.KINEMATIC, material: matGround, collisionFilterGroup: G_HAZARD, collisionFilterMask: G_RUNNER | G_BALL });
    body.addShape(new CANNON.Sphere(1.55));
    body.position.set(0, 1.55, z); body.userData = { kind: 'saw' };
    world.addBody(body);
    level.saws.push({ obj: saw, body, z, ph, sp, amp: 4.4 });
  }
  level.checkpoints.push({ z: -93, y: 0.2 });

  // --- cannon alley
  floorStrip(-92, COURSE.finish - 10);
  for (const [z, side, delay] of [[-100, 1, 0], [-108, -1, 0.8], [-116, 1, 1.6], [-124, -1, 0.4], [-132, 1, 1.2], [-140, -1, 2.0]]) {
    const x = side * 10.2;
    place('RockPlatforms_Medium', x, -2.6, z, 0.9, rand(0, 6), level.root);
    level.bodies.push(addBox(x, -0.5, z, 2, 0.5, 2));
    const c = place('Cannon', x, 0.95, z, 0.75, side > 0 ? -Math.PI / 2 : Math.PI / 2, level.root);
    level.cannons.push({ obj: c, x, z, side, t: delay, period: 2.4 });
  }
  // spiky balls rolling across later in the alley sit on the floor as static blobs to weave through
  for (const [x, z] of [[-3, -112], [2.5, -128], [-1, -136]]) {
    place('SpikyBall', x, 0.9, z, 1.5, 0, level.root);
    const b = new CANNON.Body({ type: CANNON.Body.STATIC, material: matGround, collisionFilterGroup: G_HAZARD, collisionFilterMask: G_RUNNER | G_BALL });
    b.addShape(new CANNON.Sphere(0.85)); b.position.set(x, 0.9, z); b.userData = { kind: 'spiky' }; world.addBody(b); level.bodies.push(b);
  }

  // --- finish gate
  const fz = COURSE.finish;
  place('Goal_Flag', -5.2, 0, fz, 2, 0, level.root);
  place('Goal_Flag', 5.2, 0, fz, 2, Math.PI, level.root);
  instanced('Cube_Question', [-5, -3, -1, 1, 3, 5].map((x) => ({ x, y: 5.4, z: fz, s: 0.9 })), level.root);
  instanced('Cube_Grass_Single', [-5, -3, -1, 1, 3, 5].map((x) => ({ x, y: -0.92, z: fz, s: 1.01 })), level.root, false);

  // --- coins along the course
  const coinSpots = [];
  for (let z = -4; z > -36; z -= 3.2) coinSpots.push([Math.sin(z * 0.3) * 3.5, 1, z]);
  for (const x of [-4, 0, 4]) coinSpots.push([x, 5.8, -42.5], [x, 4.2, -47]);
  for (let z = -58; z > -88; z -= 3) coinSpots.push([((z / 3) | 0) % 2 ? 4.5 : -4.5, 1, z]);
  for (let z = -96; z > -146; z -= 4) coinSpots.push([Math.cos(z * 0.2) * 4, 1, z]);
  for (const [x, y, z] of coinSpots) {
    const o = place('Coin', x, y, z, 0.45, 0, level.root);
    level.coins.push({ obj: o, taken: false, base: y, x, z });
  }

  // --- scenery (decoration only)
  const trees = [], fruit = [], bushes = [], rocks = [];
  for (let z = 14; z > -170; z -= 9) {
    for (const side of [-1, 1]) {
      const x = side * rand(19, 30);
      (Math.random() < 0.3 ? fruit : trees).push({ x, y: -14, z: z + rand(-3, 3), s: rand(0.9, 1.3), sy: rand(1.7, 2.1), ry: rand(0, 6) });
    }
  }
  for (let z = 10; z > -155; z -= 9) for (const side of [-1, 1]) {
    if (z < -38 && z > -52) continue; // no floor over the gap
    bushes.push({ x: side * rand(5.4, 5.8), y: -0.1, z: z + rand(-2, 2), s: rand(0.3, 0.42), ry: rand(0, 6) });
    if (Math.random() < 0.5) rocks.push({ x: side * rand(5.2, 5.6), y: 0, z: z + rand(-3, 3), s: rand(0.4, 0.6), ry: rand(0, 6) });
  }
  instanced('Tree', trees, level.root, false);
  instanced('Tree_Fruit', fruit, level.root, false);
  instanced('Bush', bushes, level.root);
  instanced('Rock_1', rocks, level.root);
  // giant pillars rising from the sea
  for (const [x, z, s] of [[-40, -60, 2.6], [45, -110, 3], [-30, -175, 3.4], [35, 0, 2.2]]) place('Tower', x, -14, z, s, rand(0, 6), level.root);
  const clouds = [];
  for (let i = 0; i < 26; i++) clouds.push({ x: rand(-90, 90), y: rand(12, 30), z: rand(-220, 40), s: rand(2.5, 6), ry: rand(0, 6) });
  for (const n of ['Cloud_1', 'Cloud_2', 'Cloud_3']) instanced(n, clouds.filter((_, i) => i % 3 === ['Cloud_1', 'Cloud_2', 'Cloud_3'].indexOf(n)), level.root, false);
}

// ---------------------------------------------------------------- runners
const TINTS = [null, 0xff4f9a, 0xffb020, 0x22c98a, 0x9b5cff, 0xff6a3d, 0x2fd3e6, 0xe8e8f0];
const RUN = 9, AIR_ACC = 28, GROUND_ACC = 70, JUMP_V = 11.5, DIVE_V = 13;

class Runner {
  constructor(i, isPlayer) {
    this.i = i; this.isPlayer = isPlayer;
    this.root = new THREE.Group(); scene.add(this.root);
    this.model = SkeletonUtils.clone(M.Character.scene);
    this.model.scale.setScalar(0.42);
    this.root.add(this.model);
    const tint = TINTS[i % TINTS.length];
    if (tint) this.model.traverse((o) => { if (o.isMesh && o.material?.name === 'Main') { o.material = o.material.clone(); o.material.color.setHex(tint).convertSRGBToLinear(); } });
    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = {};
    for (const clip of M.Character.animations) { const n = clip.name.split('|').pop(); this.actions[n] = this.mixer.clipAction(clip); }
    for (const n of ['Jump', 'Jump_Land', 'HitReact', 'Wave', 'Yes', 'No']) if (this.actions[n]) { this.actions[n].setLoop(THREE.LoopOnce, 1); this.actions[n].clampWhenFinished = true; }
    this.cur = null; this.play('Idle');

    // dizzy stars that orbit the head after a hit
    this.stars = new THREE.Group(); this.stars.visible = false; this.root.add(this.stars);
    for (let k = 0; k < 3; k++) { const s = M.Star.scene.clone(); s.scale.setScalar(0.2); this.stars.add(s); }

    this.body = new CANNON.Body({ mass: 1, material: matRunner, fixedRotation: true, linearDamping: 0.01, angularDamping: 0.4, collisionFilterGroup: G_RUNNER, collisionFilterMask: G_STATIC | G_RUNNER | G_HAZARD | G_BALL });
    this.body.addShape(new CANNON.Sphere(0.42), new CANNON.Vec3(0, 0.42, 0));
    this.body.addShape(new CANNON.Sphere(0.4), new CANNON.Vec3(0, 1.05, 0));
    this.body.userData = { runner: this };
    world.addBody(this.body);
    this.body.addEventListener('collide', (e) => this.onCollide(e));

    this.reset(0, COURSE.start);
  }
  reset(x, z) {
    this.body.position.set(x, 0.3, z); this.body.velocity.set(0, 0, 0); this.body.angularVelocity.set(0, 0, 0);
    this.body.quaternion.set(0, 0, 0, 1); this.body.fixedRotation = true; this.body.updateMassProperties();
    this.state = 'run'; this.stateT = 0; this.grounded = false; this.wasGrounded = true; this.coyote = 0; this.jumpBuf = 0;
    this.facing = Math.PI; this.squash = 1; this.hitCool = 0; this.finished = false; this.place = 0; this.checkpoint = 0; this.dived = false;
    this.input = { x: 0, z: 0, jump: false, dive: false };
    this.stars.visible = false; this.model.rotation.set(0, 0, 0); this.model.position.set(0, 0, 0);
    this.ai = { lane: rand(-4, 4), laneT: rand(1, 3), skill: rand(0.55, 0.95), speed: rand(0.86, 1.0), think: 0, stuck: 0, lastZ: z, hesitate: 0 };
    this.play('Idle', 0);
    this.sync();
  }
  play(name, fade = 0.15, speed = 1) {
    const a = this.actions[name]; if (!a) return;
    a.timeScale = speed;
    if (this.cur === a) return;
    a.reset().fadeIn(fade).play();
    if (this.cur) this.cur.fadeOut(fade);
    this.cur = a; this.curName = name;
  }
  get pos() { return this.body.position; }
  checkGround() {
    if (this.state === 'tumble') { this.grounded = false; return; }
    const p = this.body.position, from = new CANNON.Vec3(p.x, p.y + 0.5, p.z), to = new CANNON.Vec3(p.x, p.y - 0.12, p.z);
    const r = new CANNON.RaycastResult();
    world.raycastClosest(from, to, { collisionFilterMask: G_STATIC | G_HAZARD, skipBackfaces: true }, r);
    let hit = r.hasHit;
    if (!hit) for (const [ox, oz] of [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]]) {
      r.reset(); world.raycastClosest(new CANNON.Vec3(p.x + ox, p.y + 0.5, p.z + oz), new CANNON.Vec3(p.x + ox, p.y - 0.12, p.z + oz), { collisionFilterMask: G_STATIC | G_HAZARD, skipBackfaces: true }, r);
      if (r.hasHit) { hit = true; break; }
    }
    this.grounded = hit && this.body.velocity.y < 4;
  }
  onCollide(e) {
    const other = e.body; if (!other || this.state === 'tumble' || this.hitCool > 0 || this.finished) return;
    const u = other.userData || {}, p = this.body.position;
    if (u.kind === 'sweeper') {
      if (p.y > 0.95) return; // standing on top of the arm is allowed
      const rx = p.x - u.cx, rz = p.z - u.cz; // tangent of the spinning arm at this point
      const t = new THREE.Vector3(u.w * rz, 0, -u.w * rx).normalize();
      this.tumble(t.multiplyScalar(8).add(V(0, 7, 0)));
    } else if (u.kind === 'saw') {
      const d = V(p.x - other.position.x, 0, p.z - other.position.z).normalize();
      this.tumble(d.multiplyScalar(10).add(V(0, 9, 0)));
    } else if (u.kind === 'spiky') {
      const d = V(p.x - other.position.x, 0, p.z - other.position.z).normalize();
      this.tumble(d.multiplyScalar(8).add(V(0, 7, 0)));
    } else if (u.kind === 'ball') {
      const v = other.velocity; const sp = Math.hypot(v.x, v.z);
      if (sp > 4) this.tumble(V(v.x, 0, v.z).normalize().multiplyScalar(Math.min(14, sp * 0.9)).add(V(0, 7, 0)));
    }
  }
  tumble(impulse) {
    this.state = 'tumble'; this.stateT = 0;
    this.body.fixedRotation = false; this.body.updateMassProperties();
    this.body.velocity.set(impulse.x, impulse.y, impulse.z);
    this.body.angularVelocity.set(rand(-9, 9), rand(-4, 4), rand(-9, 9));
    this.play('HitReact', 0.05);
    this.stars.visible = true;
    fx.burst(V(this.pos.x, this.pos.y + 1.2, this.pos.z), 0xffd23f, 12, 6);
    if (this.isPlayer) { sfx.hit(); shake = 0.45; if (navigator.vibrate) try { navigator.vibrate(40); } catch { /* no vibration */ } }
  }
  recover() {
    this.state = 'run'; this.stateT = 0; this.hitCool = 0.6;
    this.body.quaternion.set(0, 0, 0, 1); this.body.angularVelocity.set(0, 0, 0);
    this.body.fixedRotation = true; this.body.updateMassProperties();
    this.body.position.y += 0.35;
    this.stars.visible = false; this.model.rotation.set(0, 0, 0);
    this.play('Jump_Land', 0.1);
  }
  respawn() {
    const cp = level.checkpoints[this.checkpoint];
    this.reset(rand(-4, 4), cp.z);
    this.checkpoint = level.checkpoints.indexOf(cp);
    this.body.position.y = 3;
    fx.dust(V(this.pos.x, 0.2, this.pos.z), 10, 0xffffff, 3);
    if (this.isPlayer) toast('نقطة الحفظ');
  }
  update(dt) {
    const b = this.body, v = b.velocity, inp = this.input;
    this.stateT += dt; this.hitCool = Math.max(0, this.hitCool - dt); this.boostT = Math.max(0, (this.boostT || 0) - dt);
    this.checkGround();

    // checkpoints & falling off
    for (let k = level.checkpoints.length - 1; k > this.checkpoint; k--) if (b.position.z < level.checkpoints[k].z + 1 && b.position.y > -1) { this.checkpoint = k; break; }
    if (b.position.y < -9) { this.respawn(); return; }

    if (this.finished) {
      v.x = damp(v.x, 0, 6, dt); v.z = damp(v.z, 0, 6, dt);
    } else if (this.state === 'tumble') {
      // ground friction while tumbling so bodies don't skate off the course
      if (this.stateT > 0.25 && Math.abs(v.y) < 3) { v.x = damp(v.x, 0, 3.5, dt); v.z = damp(v.z, 0, 3.5, dt); }
      const slow = Math.hypot(v.x, v.y, v.z) < 2.5;
      if ((this.stateT > 1.1 && slow) || this.stateT > 2.6) this.recover();
    } else {
      // horizontal control
      let ix = inp.x, iz = inp.z; const il = Math.hypot(ix, iz); if (il > 1) { ix /= il; iz /= il; }
      const dive = this.state === 'dive';
      if (!dive) {
        const speed = RUN * (this.isPlayer ? 1 : this.ai.speed);
        const acc = (this.grounded ? GROUND_ACC : AIR_ACC * (this.boostT > 0 ? 0.15 : 1)) * dt;
        const tx = ix * speed, tz = iz * speed;
        const dx = tx - v.x, dz = tz - v.z, dl = Math.hypot(dx, dz);
        if (this.boostT > 0) { v.x += clamp(tx - v.x, -acc * 3, acc * 3); } // keep the launch speed, allow a little steering
        else if (dl > 0) { const k = Math.min(1, acc / dl); v.x += dx * k; v.z += dz * k; }
        if (il > 0.1) this.facing = Math.atan2(ix, iz);
      }
      // jump (coyote time + buffer)
      this.coyote = this.grounded ? 0.12 : Math.max(0, this.coyote - dt);
      this.jumpBuf = inp.jump ? 0.13 : Math.max(0, this.jumpBuf - dt);
      inp.jump = false;
      if (this.jumpBuf > 0 && this.coyote > 0 && !dive) {
        v.y = JUMP_V; this.coyote = 0; this.jumpBuf = 0; this.grounded = false; this.squash = 1.25;
        this.play('Jump', 0.05);
        fx.dust(V(b.position.x, b.position.y + 0.1, b.position.z), 5);
        if (this.isPlayer) sfx.jump();
      }
      // dive
      if (inp.dive && !dive && !this.dived) {
        inp.dive = false; this.dived = true; this.state = 'dive'; this.stateT = 0;
        v.x = Math.sin(this.facing) * DIVE_V; v.z = Math.cos(this.facing) * DIVE_V; v.y = Math.max(v.y, 5);
        this.play('Jump_Idle', 0.08);
        if (this.isPlayer) sfx.dive();
      }
      inp.dive = false;
      if (dive && this.stateT > 0.25 && this.grounded) {
        this.state = 'getup'; this.stateT = 0; fx.dust(V(b.position.x, b.position.y + 0.1, b.position.z), 8); if (this.isPlayer) sfx.land();
      }
      if (this.state === 'getup') { v.x = damp(v.x, 0, 8, dt); v.z = damp(v.z, 0, 8, dt); if (this.stateT > 0.35) { this.state = 'run'; this.play('Jump_Land', 0.1); } }

      // bouncers
      for (const bo of level.bouncers) {
        if (Math.hypot(b.position.x - bo.x, b.position.z - bo.z) < 1.2 && b.position.y < 1.0 && b.position.y > -0.4 && v.y <= 2) {
          v.y = 18; v.z = -14; v.x *= 0.3; this.boostT = 1.15; this.grounded = false; this.coyote = 0; this.squash = 1.4; this.state = 'run';
          if (bo.action) { bo.action.reset().setLoop(THREE.LoopOnce, 1).play(); }
          fx.burst(V(bo.x, 0.6, bo.z), 0xff4f9a, 10, 5);
          this.play('Jump', 0.05);
          if (this.isPlayer) sfx.boing();
        }
      }

      // landing
      if (this.grounded && !this.wasGrounded) {
        this.squash = 0.72; this.dived = false;
        fx.dust(V(b.position.x, b.position.y + 0.1, b.position.z), 6);
        if (this.isPlayer) sfx.land();
      }

      // animation choice
      if (this.state === 'run') {
        const hs = Math.hypot(v.x, v.z);
        if (!this.grounded) { if (this.curName !== 'Jump' || !this.actions.Jump.isRunning()) this.play('Jump_Idle', 0.2); }
        else if (this.curName === 'Jump_Land' && this.actions.Jump_Land.isRunning() && hs < 3) { /* let landing finish */ }
        else if (hs > 1.2) { this.play('Run', 0.12, clamp(hs / 7.5, 0.6, 1.4)); if (Math.random() < dt * 5) puffs.emit({ pos: V(b.position.x + rand(-0.2, 0.2), b.position.y + 0.08, b.position.z + rand(-0.2, 0.2)), vel: V(rand(-0.5, 0.5), rand(0.4, 1), rand(-0.5, 0.5)), life: 0.35, size: rand(0.1, 0.16), drag: 2, color: 0xf6f0e4 }); }
        else this.play('Idle', 0.2);
      }
    }
    this.wasGrounded = this.grounded;
    this.mixer.update(dt);
  }
  sync(dt = 0) {
    const p = this.body.position;
    this.root.position.set(p.x, p.y, p.z);
    if (this.state === 'tumble') {
      const q = this.body.quaternion; this.root.quaternion.set(q.x, q.y, q.z, q.w);
      this.stars.rotation.y += dt * 8; this.stars.position.set(0, 1.85, 0);
      this.stars.children.forEach((s, k) => { const a = k * 2.09; s.position.set(Math.cos(a) * 0.55, Math.sin(this.stateT * 6 + k) * 0.08, Math.sin(a) * 0.55); });
    } else {
      this.root.quaternion.identity();
      let dy = this.facing - this.model.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      this.model.rotation.y += dy * Math.min(1, dt * 14);
      // dive pose: lean forward
      const lean = this.state === 'dive' ? 1.25 : this.state === 'getup' ? 1.2 : 0;
      this.model.rotation.x = damp(this.model.rotation.x, lean, 14, dt);
      this.model.position.y = this.state === 'dive' || this.state === 'getup' ? 0.35 : 0;
    }
    this.squash = damp(this.squash, 1, 12, dt);
    const s = 0.42; this.model.scale.set(s / Math.sqrt(this.squash), s * this.squash, s / Math.sqrt(this.squash));
  }
  dispose() { scene.remove(this.root); world.removeBody(this.body); }
}

// ---------------------------------------------------------------- bot brain
function think(r, dt) {
  const ai = r.ai, p = r.pos, inp = r.input;
  if (r.finished || r.state === 'tumble') { inp.x = inp.z = 0; return; }
  ai.laneT -= dt; if (ai.laneT < 0) { ai.lane = clamp(ai.lane + rand(-3, 3), -4.5, 4.5); ai.laneT = rand(1.5, 3.5); }
  let tx = ai.lane, wantJump = false;
  // gap 1: aim for a bouncer, then the crates
  if (p.z < -28 && p.z > -38.5) { const bx = [-4, 0, 4].reduce((a, c) => (Math.abs(c - p.x) < Math.abs(a - p.x) ? c : a)); tx = bx; }
  // saws: step away from a saw that is close ahead
  for (const s of level.saws) {
    const dz = p.z - s.z, sx = s.body.position.x;
    if (dz > 0 && dz < 5 && Math.abs(sx - p.x) < 3) tx = sx > 0 ? -4.8 : 4.8;
  }
  // sweepers: jump when the arm is about to pass
  for (const sw of level.sweepers) {
    const rx = p.x, rz = p.z - sw.z; if (Math.hypot(rx, rz) > 6.2) continue;
    const ang = sw.body.quaternion.toEuler ? (() => { const e = new CANNON.Vec3(); sw.body.quaternion.toEuler(e); return e.y; })() : 0;
    const dx = Math.cos(ang), dz = -Math.sin(ang);
    const perp = rx * dz - rz * dx; // signed distance to the arm line
    const approaching = perp * sw.w < 0;
    if (Math.abs(perp) < 1.6 && approaching && r.grounded) wantJump = true;
  }
  // spiky balls: sidestep
  for (const b of level.bodies) if (b.userData?.kind === 'spiky') { const dz = p.z - b.position.z; if (dz > 0 && dz < 5 && Math.abs(b.position.x - p.x) < 1.8) tx = b.position.x + (b.position.x > p.x ? -2.5 : 2.5); }
  // stuck? jump
  ai.think -= dt; if (ai.think < 0) { ai.think = 0.6; if (Math.abs(ai.lastZ - p.z) < 0.6 && !r.finished) wantJump = true; ai.lastZ = p.z; }
  // gaps: jump at crate edges
  if (r.grounded && p.z < -39 && p.z > -49) { if (r.body.velocity.z > -2 || Math.random() < dt * 4) wantJump = true; }
  const dx = tx - p.x; let ix = clamp(dx * 0.35, -0.8, 0.8), iz = -1;
  if (ai.hesitate > 0) { ai.hesitate -= dt; iz = -0.25; }
  inp.x = ix; inp.z = iz;
  if (wantJump && Math.random() < ai.skill) inp.jump = true;
  if (!r.dived && r.grounded && Math.random() < dt * 0.08) inp.dive = true;
}

// ---------------------------------------------------------------- input
const keys = new Set();
const ctl = { jump: false, dive: false, stick: { x: 0, y: 0 }, yaw: 0, pitch: 0.32 };
addEventListener('keydown', (e) => {
  if (e.repeat) return; keys.add(e.code);
  if (e.code === 'Space') ctl.jump = true;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyE') ctl.dive = true;
  if (e.code === 'Escape' && game.mode === 'race') togglePause();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
// camera drag (mouse or a finger on empty screen)
let drag = null;
canvas.addEventListener('pointerdown', (e) => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); sfx.unlock(); });
canvas.addEventListener('pointermove', (e) => {
  if (!drag || drag.id !== e.pointerId) return;
  ctl.yaw -= (e.clientX - drag.x) * 0.006; ctl.pitch = clamp(ctl.pitch + (e.clientY - drag.y) * 0.004, 0.05, 1.1);
  drag.x = e.clientX; drag.y = e.clientY;
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointercancel', () => { drag = null; });
// touch stick and buttons
{
  const stick = $('stick'), knob = $('knob'); let sid = null, cx = 0, cy = 0;
  stick.addEventListener('pointerdown', (e) => { sid = e.pointerId; stick.setPointerCapture(sid); const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; move(e); sfx.unlock(); });
  const move = (e) => { if (e.pointerId !== sid) return; let dx = e.clientX - cx, dy = e.clientY - cy; const l = Math.hypot(dx, dy), m = 55; if (l > m) { dx *= m / l; dy *= m / l; } knob.style.transform = `translate(${dx}px,${dy}px)`; ctl.stick.x = dx / m; ctl.stick.y = dy / m; };
  stick.addEventListener('pointermove', move);
  const end = (e) => { if (e.pointerId !== sid) return; sid = null; knob.style.transform = ''; ctl.stick.x = ctl.stick.y = 0; };
  stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
  for (const [id, k] of [['bJump', 'jump'], ['bDive', 'dive']]) {
    const el = $(id);
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); ctl[k] = true; el.classList.add('on'); sfx.unlock(); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, () => el.classList.remove('on'));
  }
}
function readPlayerInput(r) {
  let fx_ = 0, fz = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) fz += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) fz -= 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) fx_ -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) fx_ += 1;
  fx_ += ctl.stick.x; fz -= ctl.stick.y;
  // camera relative: forward = (-sin yaw, -cos yaw), right = (cos yaw, -sin yaw)
  const s = Math.sin(ctl.yaw), c = Math.cos(ctl.yaw);
  r.input.x = -s * fz + c * fx_;
  r.input.z = -c * fz - s * fx_;
  if (ctl.jump) { r.input.jump = true; ctl.jump = false; }
  if (ctl.dive) { r.input.dive = true; ctl.dive = false; }
}

// ---------------------------------------------------------------- UI helpers
let toastT = 0;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; toastT = 1.4; }
const arabicNum = (n) => String(n);
function refreshMenuStats() { $('mCoins').textContent = arabicNum(save.coins); $('mWins').textContent = arabicNum(save.wins); $('mSound').innerHTML = `<svg class="i"><use href="#i-${save.muted ? 'mute' : 'sound'}"/></svg>`; }
const TAB_TEXT = {
  build: ['مود البناء', 'هتحط منصات ونطاطات ومناشير ومدافع على شبكة، وتجرب الماب بتاعك وتحفظه.'],
  wardrobe: ['الخزانة', 'هتغيّر لون شخصيتك وتلبسها قبعات ونضارات وشنط، وكل حاجة هتظهر قدامك 3D وهي بتلف.'],
  shop: ['الشوب', 'حاجات جديدة كل يوم بتشتريها بالعملات اللي بتجمعها من السباقات.'],
};
document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => {
  sfx.click();
  document.querySelectorAll('.tab').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
  const k = b.dataset.tab, panel = $('tabPanel');
  if (k === 'play') { panel.hidden = true; $('playBottom').hidden = false; return; }
  const [h, p] = TAB_TEXT[k];
  panel.innerHTML = `<span class="chip">في التحديث الجاي</span><h2>${h}</h2><p>${p}</p><p style="margin:0">العملات اللي معاك دلوقتي: <b>${arabicNum(save.coins)}</b></p>`;
  panel.hidden = false; $('playBottom').hidden = true;
}));
$('mSound').addEventListener('click', () => { save.muted = !save.muted; store.set('muted', save.muted); refreshMenuStats(); sfx.click(); });

// ---------------------------------------------------------------- menu stage
const stage = { root: new THREE.Group(), hero: null, mixer: null, t: 0 };
function buildStage() {
  const g = stage.root; g.position.set(0, 0, 60); scene.add(g);
  place('RockPlatforms_Medium', 0, -2.75, 0, 1.0, 0.4, g);
  instanced('Bush', [{ x: -2.4, y: -0.1, z: -1.2, s: 0.5 }, { x: 2.6, y: -0.15, z: -0.8, s: 0.45 }], g);
  place('Tree_Fruit', -7, -3, -6, 1.1, 0, g); place('Tree', 7.5, -3, -7, 1.2, 1, g);
  place('Coin', 2.2, 2.6, -1, 0.5, 0, g).userData.spin = 1.5;
  place('Star', -2.1, 2.9, -1, 0.5, 0, g).userData.spin = -1.2;
  place('Cloud_2', -6, 6, -10, 1.8, 0, g); place('Cloud_3', 6, 7.5, -12, 1.8, 0, g);
  stage.hero = SkeletonUtils.clone(M.Character.scene); stage.hero.scale.setScalar(0.5); stage.hero.position.y = 0.05; g.add(stage.hero);
  stage.mixer = new THREE.AnimationMixer(stage.hero);
  const clip = (n) => M.Character.animations.find((a) => a.name.endsWith('|' + n));
  stage.idle = stage.mixer.clipAction(clip('Idle')); stage.wave = stage.mixer.clipAction(clip('Wave'));
  stage.wave.setLoop(THREE.LoopOnce, 1); stage.idle.play();
  stage.mixer.addEventListener('finished', () => { stage.wave.fadeOut(0.3); stage.idle.reset().fadeIn(0.3).play(); });
  let sd = null;
  canvas.addEventListener('pointerdown', (e) => { if (game.mode === 'menu') sd = e.clientX; });
  canvas.addEventListener('pointermove', (e) => { if (game.mode === 'menu' && sd != null) { stage.hero.rotation.y += (e.clientX - sd) * 0.012; sd = e.clientX; } });
  addEventListener('pointerup', () => { sd = null; });
}
function heroWave() { stage.idle.fadeOut(0.2); stage.wave.reset().fadeIn(0.2).play(); }

// ---------------------------------------------------------------- game flow
const game = { mode: 'loading', runners: [], player: null, t: 0, countdown: 0, finishedCount: 0, coins: 0, paused: false, endT: 0, qualify: 6 };

function show(id, on) { $(id).hidden = !on; }

function toMenu() {
  game.mode = 'menu'; game.paused = false;
  for (const r of game.runners) r.dispose(); game.runners = [];
  for (const b of level.balls) { scene.remove(b.obj); world.removeBody(b.body); } level.balls = [];
  puffs.clear(); confetti.clear();
  show('hud', false); show('menu', true); show('result', false); show('pause', false); show('big', false);
  level.root.visible = false; stage.root.visible = true;
  refreshMenuStats(); heroWave();
  stage.t = 0; const g = stage.root.position; camPos.set(g.x, g.y + 2.1, g.z + (innerWidth < innerHeight ? 8.5 : 6));
}

function startRace() {
  sfx.unlock(); sfx.click();
  game.mode = 'race'; game.t = 0; game.countdown = 3.6; game.finishedCount = 0; game.coins = 0; game.paused = false; game.endT = 0;
  level.root.visible = true; stage.root.visible = false;
  for (const c of level.coins) { c.taken = false; c.obj.visible = true; }
  for (const c of level.cannons) c.t = c.period - 0.3 - (c.side > 0 ? 0 : 1.1);
  const n = 8; game.runners = [];
  for (let i = 0; i < n; i++) {
    const r = new Runner(i, i === 0);
    const row = Math.floor(i / 4), col = i % 4;
    r.reset(-4.5 + col * 3 + (row ? 1.5 : 0), COURSE.start - row * 2.2);
    game.runners.push(r);
  }
  game.player = game.runners[0];
  ctl.yaw = 0; ctl.pitch = 0.32;
  show('menu', false); show('hud', true); show('result', false);
  $('touch').hidden = !IS_TOUCH; $('keys').hidden = IS_TOUCH;
  $('hTotal').textContent = arabicNum(n); $('hCoins').textContent = arabicNum(0);
  const prog = $('prog'); prog.querySelectorAll('i').forEach((x) => x.remove());
  game.runners.forEach((r) => { const d = document.createElement('i'); if (r.isPlayer) d.className = 'me'; prog.appendChild(d); r.dot = d; });
}

function endRace(qualified) {
  if (game.mode !== 'race' && game.mode !== 'ending') return;
  game.mode = 'result';
  const pl = game.player.place || game.runners.length;
  const earned = game.coins + (qualified ? Math.max(5, 30 - pl * 4) : 2);
  save.coins += earned; if (qualified && pl === 1) save.wins += 1;
  store.set('coins', save.coins); store.set('wins', save.wins);
  $('rTitle').textContent = qualified ? (pl === 1 ? 'المركز الأول!' : 'اتأهلت!') : 'خرجت المرة دي';
  $('rTitle').className = qualified ? 'win' : 'lose';
  $('rPlace').textContent = qualified ? '#' + arabicNum(pl) : '—';
  $('rCoins').textContent = arabicNum(earned);
  setTimeout(() => { show('result', true); }, 300);
  qualified ? sfx.win() : sfx.lose();
}

function togglePause(force) {
  if (game.mode !== 'race') return;
  game.paused = force ?? !game.paused; show('pause', game.paused);
}
$('playBtn').addEventListener('click', startRace);
$('hPause').addEventListener('click', () => togglePause(true));
$('pResume').addEventListener('click', () => togglePause(false));
$('pQuit').addEventListener('click', () => { sfx.click(); toMenu(); });
$('rAgain').addEventListener('click', () => { for (const r of game.runners) r.dispose(); game.runners = []; startRace(); });
$('rMenu').addEventListener('click', () => { sfx.click(); toMenu(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && game.mode === 'race' && game.countdown <= 0) togglePause(true); });

// ---------------------------------------------------------------- world update
const tmpV = new THREE.Vector3();
function updateLevel(dt, t) {
  for (const sw of level.sweepers) {
    const q = sw.body.quaternion; sw.arm.quaternion.set(q.x, q.y, q.z, q.w);
    sw.pillar.rotation.y += sw.w * dt;
  }
  for (const s of level.saws) {
    const x = Math.sin(t * s.sp + s.ph) * s.amp, vx = Math.cos(t * s.sp + s.ph) * s.amp * s.sp;
    s.body.position.x = x; s.body.velocity.set(vx, 0, 0);
    s.obj.position.x = x + vx / 60; s.obj.rotation.z -= dt * 14;
    if (Math.random() < dt * 20) puffs.emit({ pos: V(x, 0.15, s.z + rand(-0.2, 0.2)), vel: V(rand(-2, 2), rand(1, 3), rand(-1, 1)), life: 0.3, size: 0.12, g: 15, color: 0xffd23f });
  }
  for (const bo of level.bouncers) bo.mixer.update(dt);
  for (const c of level.coins) if (!c.taken) { c.obj.rotation.y += dt * 3; c.obj.position.y = c.base + Math.sin(t * 3 + c.z) * 0.12; }
  // cannons
  if (game.countdown <= 0) for (const c of level.cannons) {
    c.t += dt;
    const pre = c.t > c.period - 0.35;
    c.obj.scale.setScalar(0.75 * (pre ? 1 + Math.sin((c.t - c.period + 0.35) * 40) * 0.03 : 1));
    if (c.t >= c.period) {
      c.t = 0;
      const ball = M.Cannonball.scene.clone(); ball.scale.setScalar(1.15); scene.add(ball);
      const body = new CANNON.Body({ mass: 6, material: matBall, collisionFilterGroup: G_BALL, collisionFilterMask: G_STATIC | G_RUNNER | G_HAZARD | G_BALL, linearDamping: 0.05 });
      body.addShape(new CANNON.Sphere(0.62)); body.userData = { kind: 'ball' };
      body.position.set(c.x - c.side * 2.2, 1.4, c.z); body.velocity.set(-c.side * rand(15, 19), rand(2, 4), rand(-1, 1));
      world.addBody(body);
      level.balls.push({ obj: ball, body, life: 3.5 });
      fx.burst(V(c.x - c.side * 2.4, 1.5, c.z), 0xdddddd, 10, 4);
      if (game.player && Math.abs(game.player.pos.z - c.z) < 22) sfx.boom();
    }
  }
  level.balls = level.balls.filter((b) => {
    b.life -= dt; b.obj.position.copy(b.body.position); b.obj.quaternion.copy(b.body.quaternion);
    if (b.life <= 0 || b.body.position.y < -12) { scene.remove(b.obj); world.removeBody(b.body); return false; }
    return true;
  });
}

function updateRace(dt) {
  const t = (game.t += dt);
  // countdown
  if (game.countdown > 0) {
    const before = Math.ceil(game.countdown - 0.6);
    game.countdown -= dt;
    const now = Math.ceil(game.countdown - 0.6);
    const big = $('big');
    if (game.countdown > 0.6) { big.hidden = false; big.textContent = arabicNum(Math.max(1, now)); if (now !== before) sfx.beep(); }
    else if (game.countdown > 0) { if (big.textContent !== 'يلا!') { big.textContent = 'يلا!'; sfx.go(); } }
    else big.hidden = true;
  }
  const racing = game.countdown <= 0.6;
  for (const r of game.runners) {
    if (racing) { if (r.isPlayer) readPlayerInput(r); else think(r, dt); }
    else { r.input.x = r.input.z = 0; r.input.jump = r.input.dive = false; ctl.jump = ctl.dive = false; }
    r.update(dt);
    if (!r.finished && r.pos.z < COURSE.finish && r.pos.y > -1) {
      r.finished = true; r.place = ++game.finishedCount;
      r.play(r.place === 1 ? 'Wave' : 'Yes', 0.2);
      if (r.isPlayer) {
        fx.confetti(V(r.pos.x, r.pos.y + 1, r.pos.z)); toast(r.place <= game.qualify ? 'وصلت!' : 'متأخر شوية');
        setTimeout(() => endRace(r.place <= game.qualify), 1600);
      }
    }
  }
  updateLevel(dt, t);
  world.step(1 / 60, dt, 4);
  for (const r of game.runners) r.sync(dt);

  // coins (player only)
  const p = game.player;
  for (const c of level.coins) if (!c.taken && Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < 1.15 && Math.abs(p.pos.y + 0.8 - c.obj.position.y) < 1.3) {
    c.taken = true; c.obj.visible = false; game.coins++; $('hCoins').textContent = arabicNum(game.coins);
    fx.burst(c.obj.position.clone(), 0xffd23f, 8, 4); sfx.coin();
  }
  // eliminated when the qualifying spots are gone
  if (!p.finished && game.finishedCount >= game.qualify && game.mode === 'race') { toast('الأماكن خلصت'); setTimeout(() => endRace(false), 900); game.mode = 'ending'; }

  // places + progress bar
  const order = [...game.runners].sort((a, b) => (a.finished && b.finished ? a.place - b.place : a.finished ? -1 : b.finished ? 1 : a.pos.z - b.pos.z));
  $('hPlace').textContent = arabicNum(order.indexOf(p) + 1);
  const len = COURSE.start - COURSE.finish;
  for (const r of game.runners) r.dot.style.right = (clamp((COURSE.start - r.pos.z) / len, 0, 1) * 100) + '%';
}

// camera
const camPos = new THREE.Vector3(0, 6, 16), camLook = new THREE.Vector3();
function updateCamera(dt) {
  if (game.mode === 'menu' || game.mode === 'loading') {
    stage.t += dt;
    const g = stage.root.position;
    const narrow = innerWidth < innerHeight;
    const target = tmpV.set(g.x + Math.sin(stage.t * 0.2) * 0.5, g.y + 2.1, g.z + (narrow ? 8.5 : 6));
    camPos.lerp(target, 1 - Math.exp(-3 * dt)); camera.position.copy(camPos);
    camLook.set(g.x, g.y + (narrow ? 0.6 : 1.1), g.z); camera.lookAt(camLook);
    sun.position.set(g.x + 8, g.y + 18, g.z + 10); sun.target.position.copy(g);
    return;
  }
  const p = game.player?.pos; if (!p) return;
  const dist = innerWidth < innerHeight ? 9 : 8;
  const h = Math.sin(ctl.pitch) * dist + 1.2, flat = Math.cos(ctl.pitch) * dist;
  const target = tmpV.set(p.x + Math.sin(ctl.yaw) * flat, Math.max(p.y, -6) + h, p.z + Math.cos(ctl.yaw) * flat);
  camPos.lerp(target, 1 - Math.exp(-9 * dt));
  camera.position.copy(camPos);
  if (shake > 0) { camera.position.x += rand(-1, 1) * shake * 0.4; camera.position.y += rand(-1, 1) * shake * 0.4; shake = Math.max(0, shake - dt * 1.6); }
  camLook.lerp(V(p.x, Math.max(p.y, -6) + 1.4, p.z), 1 - Math.exp(-14 * dt));
  camera.lookAt(camLook);
  sun.position.set(p.x + 12, p.y + 30, p.z + 14); sun.target.position.set(p.x, p.y, p.z - 6);
}

// ---------------------------------------------------------------- main loop
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 1 / 20);
  if (game.mode === 'menu') {
    stage.mixer.update(dt);
    stage.root.traverse((o) => { if (o.userData.spin) o.rotation.y += o.userData.spin * dt; });
  } else if ((game.mode === 'race' || game.mode === 'ending' || game.mode === 'result') && !game.paused) {
    updateRace(dt);
  }
  if (!game.paused) { puffs.update(dt); confetti.update(dt); }
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').hidden = true; }
  updateCamera(dt);
  scene.userData.sky.position.copy(camera.position);
  renderer.render(scene, camera);
}

// ---------------------------------------------------------------- boot
(async () => {
  try {
    await loadAssets((k) => { $('loadbar').style.width = Math.round(k * 100) + '%'; });
  } catch (e) {
    $('loadtxt').textContent = 'الموديلات مش راضية تحمّل. اعمل ريفريش للصفحة.';
    console.error(e); return;
  }
  buildCourse(); buildStage();
  level.root.visible = false;
  show('loading', false);
  toMenu();
  frame();
  window.__boltdash = { game, level, ctl, startRace, sim: (sec, hook) => { for (let i = 0; i < sec * 60; i++) { hook && hook(i / 60); updateRace(1 / 60); puffs.update(1 / 60); } } };
})();
