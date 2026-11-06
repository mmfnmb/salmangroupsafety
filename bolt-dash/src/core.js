// Core: renderer, scene, audio, storage, assets, particles, physics world.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import * as CANNON from 'cannon-es';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export { THREE, CANNON, SkeletonUtils };
export const $ = (id) => document.getElementById(id);
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const PI = Math.PI;
export const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
// page language and direction are set by i18n.translateDom()

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
  name: store.get('name', 'Bolt'), stats: store.get('stats', { games: 0, rounds: 0, qual: 0, crowns: 0, earned: 0 }),
  season: store.get('season', []), dailyRew: store.get('dailyRew', { day: '', streak: 0 }), sens: store.get('sens', 1), card: store.get('card', { pac: 50, sho: 50, pas: 50, ctl: 50 }), shadows: store.get('shadows', true), quality: store.get('quality', null),
};
if (!save.owned.includes('bat-golf')) save.owned.push('bat-golf');
if (!save.equip.bat) save.equip.bat = 'bat-golf';
export const persist = () => { for (const k of ['coins', 'wins', 'owned', 'equip', 'xp', 'gift', 'daily', 'maps', 'muted', 'name', 'stats', 'season', 'dailyRew', 'sens', 'shadows', 'quality', 'card']) store.set(k, save[k]); };

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
// quality presets: low (no post effects), med, high
export const QUALITY = { low: { pr: 1, shadow: 0, bloom: false, extras: false }, med: { pr: 1.5, shadow: 1024, bloom: true, extras: true }, high: { pr: 2, shadow: 2048, bloom: true, extras: true } };
if (!save.quality) save.quality = IS_TOUCH ? 'med' : 'high';
export const canvas = $('c');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbfe6ff, 150, 420);
export const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);
// reflections for shiny materials (gold, crystal, metal)
{ const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.3; }

// dreamy sky: gradient, drifting aurora ribbons, twinkling stars and a soft sun halo
export const skyU = { time: { value: 0 }, sunDir: { value: new THREE.Vector3(0.35, 0.55, -0.75).normalize() } };
export const sky = (() => {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float time; uniform vec3 sunDir; varying vec3 vP;
      float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
      void main(){
        float h = vP.y;
        vec3 top = vec3(0.22,0.33,0.95), mid = vec3(0.45,0.80,1.0), hor = vec3(0.95,0.92,1.0), low = vec3(0.55,0.80,1.0);
        vec3 c = h > 0.0 ? mix(mix(hor, mid, smoothstep(0.0,0.18,h)), top, smoothstep(0.18,0.85,h)) : mix(hor, low, smoothstep(0.0,-0.35,h));
        // aurora ribbons
        float a = sin(vP.x*3.0 + time*0.15 + sin(vP.z*2.0+time*0.1)*1.5) * 0.5 + 0.5;
        float band = smoothstep(0.25,0.55,h) * (1.0 - smoothstep(0.55,0.9,h));
        c += band * a * mix(vec3(0.25,1.0,0.75), vec3(0.85,0.45,1.0), sin(vP.z*2.5+time*0.2)*0.5+0.5) * 0.35;
        // stars
        vec2 g = floor(vec2(atan(vP.z, vP.x)*90.0, h*90.0)); float st = step(0.985, h21(g)) * smoothstep(0.35,0.9,h);
        c += st * (0.6 + 0.4*sin(time*3.0 + h21(g+3.1)*40.0)) * vec3(1.0,0.95,0.85);
        // sun halo
        float sd = max(dot(normalize(vP), sunDir), 0.0);
        c += vec3(1.0,0.85,0.6) * (pow(sd, 400.0)*4.0 + pow(sd, 18.0)*0.45);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const s = new THREE.Mesh(new THREE.SphereGeometry(800, 48, 24), m); s.renderOrder = -1; s.frustumCulled = false; scene.add(s); return s;
})();
export const hemi = new THREE.HemisphereLight(0xfffaf0, 0xa8e6a0, 1.35);
scene.add(hemi);
export const sun = new THREE.DirectionalLight(0xfff0dc, 2.6);
sun.castShadow = true;
Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 150 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
// soft rim light from behind gives characters a glowing outline
export const rim = new THREE.DirectionalLight(0xffd8ec, 0.7); rim.position.set(-10, 8, -14); scene.add(rim);

// shimmering sea with rolling waves
export const seaU = { time: { value: 0 } };
export const sea = (() => {
  const g = new THREE.PlaneGeometry(1600, 1600, 160, 160);
  const m = new THREE.MeshStandardMaterial({ color: 0x6fd6ff, roughness: 0.18, metalness: 0.15, transparent: true, opacity: 0.96 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.time = seaU.time;
    sh.vertexShader = 'uniform float time;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float w = sin(position.x*0.045 + time*0.9)*0.9 + sin(position.y*0.06 + time*1.3)*0.6 + sin((position.x+position.y)*0.11 + time*2.1)*0.25;
      transformed.z += w;`);
    sh.fragmentShader = 'uniform float time;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float sp = sin(vViewPosition.x*0.9 + time*2.0) * sin(vViewPosition.y*1.1 - time*1.7);
      totalEmissiveRadiance += vec3(0.6,0.9,1.0) * smoothstep(0.93, 1.0, sp) * 0.6;`);
  };
  const s = new THREE.Mesh(g, m); s.rotation.x = -PI / 2; s.position.y = -40; s.receiveShadow = false; scene.add(s); return s;
})();

// floating glow motes around the camera
export const motes = (() => {
  const n = 220, g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), ph = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = rand(-40, 40); pos[i * 3 + 1] = rand(-4, 22); pos[i * 3 + 2] = rand(-40, 40); ph[i] = rand(0, 100); }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { time: seaU.time, center: { value: new THREE.Vector3() } },
    vertexShader: `uniform float time; uniform vec3 center; attribute float ph; varying float vA;
      void main(){ vec3 p = position; p.y += sin(time*0.6+ph)*1.2; p.x += sin(time*0.3+ph*2.0)*1.5;
        p = center + mod(p - center + 40.0, 80.0) - 40.0;
        vec4 mv = modelViewMatrix * vec4(p,1.0); gl_PointSize = (14.0 + 10.0*sin(time*2.0+ph)) * (30.0 / -mv.z); vA = 0.5+0.5*sin(time*1.7+ph*3.0);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.0,d); gl_FragColor = vec4(mix(vec3(1.0,0.85,0.45), vec3(0.75,0.6,1.0), vA), a*0.55*vA); }`,
  });
  const p = new THREE.Points(g, m); p.frustumCulled = false; scene.add(p); return p;
})();

// post effects: bloom and a colour grade (saturation, warmth, vignette)
export const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
export const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.42, 0.4, 1.0);
composer.addPass(bloom);
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, sat: { value: 1.15 }, vig: { value: 0.28 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float sat; uniform float vig; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(0.299,0.587,0.114));
      c.rgb = mix(vec3(l), c.rgb, sat); c.rgb *= vec3(1.04, 1.0, 0.97);
      float d = distance(vUv, vec2(0.5)); c.rgb *= 1.0 - vig * smoothstep(0.35, 0.85, d);
      gl_FragColor = c; }`,
});
composer.addPass(grade);
composer.addPass(new OutputPass());
export function applyQuality() {
  const q = QUALITY[save.quality] || QUALITY.med;
  renderer.setPixelRatio(Math.min(devicePixelRatio, q.pr));
  renderer.shadowMap.enabled = q.shadow > 0; sun.castShadow = q.shadow > 0;
  if (q.shadow) { sun.shadow.mapSize.set(q.shadow, q.shadow); sun.shadow.map?.dispose(); sun.shadow.map = null; }
  motes.visible = q.extras;
  resize();
}
export function renderScene(dt = 0) {
  skyU.time.value += dt; seaU.time.value += dt * (G.paused ? 0 : 1);
  sky.position.copy(camera.position); motes.material.uniforms.center.value.copy(camera.position);
  sea.position.x = Math.round(camera.position.x / 50) * 50; sea.position.z = Math.round(camera.position.z / 50) * 50;
  if ((QUALITY[save.quality] || QUALITY.med).bloom) composer.render(); else renderer.render(scene, camera);
}

export function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h);
  bloom.resolution.set(w * 0.5, h * 0.5);
  camera.aspect = w / h; camera.fov = w < h ? 74 : 62; camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
applyQuality();

// ---------------------------------------------------------------- assets
const Q = ['Character', 'Bouncer', 'Hazard_Saw', 'Hazard_Cylinder', 'SpikyBall', 'Cannon', 'Cannonball', 'Goal_Flag', 'Coin', 'Star',
  'Cube_Grass_Single', 'Cube_Bricks', 'Cube_Crate', 'Cube_Question', 'Cloud_1', 'Cloud_2', 'Cloud_3', 'Tree', 'Tree_Fruit', 'Bush', 'Rock_1', 'Rock_2',
  'RockPlatforms_Medium', 'Arrow', 'Tower', 'Plant_Large', 'Fence_Middle', 'Hazard_SpikeTrap'];
const A = ['kk-Knight_Helmet', 'kk-Barbarian_Hat', 'kk-Mage_Hat', 'kk-Barbarian_Cape', 'kk-Knight_Cape', 'kk-Mage_Cape', 'kk-Rogue_Cape', 'Crown', 'Crown2', 'ice-cream', 'cupcake', 'donut-sprinkles', 'present-a-cube', 'aid-glasses', 'aid-sunglasses', 'Armor_Leather', 'Armor_Metal',
  'Armor_Golden', 'Armor_Black', 'StarBadge', 'Backpack', 'Bag', 'Shield_Round', 'Shield_Heater'];
const K = ['fence-straight', 'fence-low-straight', 'fence-rope', 'conveyor-belt', 'spring', 'saw', 'spike-block', 'spike-block-wide', 'platform', 'platform-ramp',
  'door-rotate', 'block-moving', 'block-moving-large', 'crate', 'crate-strong', 'crate-item', 'flag', 'block-grass-low-hexagon', 'block-snow-low-hexagon', 'star',
  'jewel', 'coin-gold', 'trap-spikes', 'indicator-special-arrow', 'shape-slope', 'wall', 'rocketlauncher', 'rocketlauncherModern', 'ammo_rocket', 'grenade',
  'blaster-a', 'blaster-d', 'blaster-h', 'blaster-l', 'blaster-o', 'blaster-r', 'grenade-a', 'bullet-foam-tip', 'ball-green', 'ball-red', 'ball-blue', 'club-red', 'club-blue',
  'flag-large-red', 'flag-large-blue', 'structure-gate-wide', 'windmill', 'castle', 'bump', 'ramp-large', 'trophy', 'banner', 'bannerTowerRed', 'bannerTowerGreen',
  'flagCheckers', 'banner-red', 'banner-green', 'frying-pan', 'loaf-baguette', 'rollingPin', 'fish', 'corn-dog', 'cooking-spatula', 'candy-cane-red',
  'candy-cane-green', 'present-b-round', 'tool-hammer', 'tool-paddle', 'item-banana', 'q_Club', 'q_Hammer_Double_Golden', 'q_Bone', 'q_Crystal2', 'q_Gem_Pink', 'q_Star_Outline'];
const Z = ['Launchpad', 'Seesaw_Base', 'Seesaw_Plank', 'Obstacle_Hammer', 'Fan', 'Fan_Blade', 'Spinning_Walls', 'Obstacle_Pole_Large', 'Obstacle_Pole_Center', 'Obstacle_Pole_Small',
  'Pillow', 'Wrecking_Ball', 'Barrier_01', 'Football', 'Ring_Hoop', 'Spawn_Red', 'Spawn_Blue', 'Spike_Ball', 'Balloon', 'Torus', 'Step_Large'];
export const MODEL_NAMES = [...Q, ...A.map((n) => 'acc/' + n), ...K.map((n) => 'k/' + n), 'k/detail-parasol-a', 'k/soccer-field', 'k/bomb', 'k/pet-Dog', 'k/pet-Cat', 'k/pet-Chicken', 'k/pet-Birb', 'k/pet-Pigeon', 'k/pet-Cactoro', 'k/pet-Mushnub', 'k/pet-PinkBlob', 'k/pet-GreenBlob', 'k/pet-Fish', 'k/pet-Glub', 'k/pet-Armabee', 'k/pet-Alpaking', 'k/x-hm-b', 'k/x-pumpkin', 'k/x-cleaver', 'k/x-chainsaw', 'k/gy-grave', 'k/gy-gravestone-cross', 'k/gy-crypt', 'k/gy-coffin', 'k/gy-iron-fence', 'k/gy-lantern-candle', 'k/gy-fence-gate', 'k/gy-altar-stone', ...Z.map((n) => 'z/' + n)];
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
// add a pose offset to a bone without it piling up frame after frame (animations don't always reset every bone)
export function boneOffset(b, axis, off) {
  if (!b) return; const u = b.userData, k = 'o' + axis, cur = b.rotation[axis];
  const base = u[k + 'last'] !== undefined && Math.abs(cur - u[k + 'last']) < 1e-6 ? cur - (u[k] || 0) : cur;
  b.rotation[axis] = base + off; u[k] = off; u[k + 'last'] = b.rotation[axis];
}
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
