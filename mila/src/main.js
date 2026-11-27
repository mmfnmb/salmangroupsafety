// ميلا: لعبة لطفلة صغيرة. كل حاجة باللمس: تلمس الأرض فميلا تمشي، تلمس حاجة فتروح لها وتستعملها.
// ماما بتطلب حاجات، ميلا بتنضف وتطبخ وتاكل وتتمرن وتلبس، وبره البيت كتكوت وأسد وولد صغير.
// لو ميلا مسمعتش كلام ماما ٣ مرات، ماما تبقى شريرة وتجري وراها، ولازم تلاقي المفتاح وتهرب من الباب.
// Models: Quaternius (CC0) people, Kenney Cube Pets / Furniture Kit / Food Kit (CC0).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a), pick = (a) => a[Math.floor(Math.random() * a.length)];
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const cache = {}; const load = (p) => (cache[p] = cache[p] || loader.loadAsync('assets/' + p));

// ---------------------------------------------------------------- renderer, scene, camera
const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; document.body.prepend(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xbfe3ff); scene.fog = new THREE.Fog(0xbfe3ff, 30, 60);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < 1 ? 70 : 50; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
scene.add(new THREE.HemisphereLight(0xffffff, 0xd9c7b0, 1.6));
const sun = new THREE.DirectionalLight(0xfff3e0, 2.0); sun.position.set(6, 14, 8); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 50 }); sun.shadow.bias = -0.0008; scene.add(sun, sun.target);

// ---------------------------------------------------------------- voice and sounds
let voice = null; const pickVoice = () => { const vs = speechSynthesis.getVoices(); voice = vs.find((v) => /^ar[-_]EG/i.test(v.lang)) || vs.find((v) => /^ar/i.test(v.lang)) || null; };
try { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } catch (e) {}
function speak(text, pitch = 1.1) { try { if (!voice) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.voice = voice; u.lang = voice.lang; u.rate = 0.95; u.pitch = pitch; speechSynthesis.speak(u); } catch (e) {} }
let AC = null; const ac = () => (AC = AC || new (window.AudioContext || window.webkitAudioContext)());
function tone(f, d = 0.15, type = 'sine', v = 0.15, when = 0) { try { const a = ac(), o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(v, a.currentTime + when); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + when + d); o.connect(g).connect(a.destination); o.start(a.currentTime + when); o.stop(a.currentTime + when + d + 0.05); } catch (e) {} }
const sfx = { pop: () => tone(660, 0.1, 'triangle'), yay: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, 'triangle', 0.13, i * 0.09)), no: () => [300, 220].forEach((f, i) => tone(f, 0.2, 'square', 0.06, i * 0.15)),
  swish: () => tone(900, 0.08, 'sawtooth', 0.04), quack: () => [700, 520].forEach((f, i) => tone(f, 0.08, 'square', 0.08, i * 0.1)), roar: () => [110, 90, 70].forEach((f, i) => tone(f, 0.35, 'sawtooth', 0.12, i * 0.12)), eat: () => [400, 450, 400].forEach((f, i) => tone(f, 0.06, 'square', 0.05, i * 0.09)) };
let musicOn = true, musicT = 0, musicStep = 0; const TUNE = [523, 587, 659, 523, 659, 784, 659, 587], SCARY = [196, 185, 196, 233, 196, 185, 175, 165];

// ---------------------------------------------------------------- state (kept between visits)
const save = (() => { try { return JSON.parse(localStorage.getItem('mila_save')) || {}; } catch (e) { return {}; } })();
const st = { hearts: save.hearts || 0, stars: save.stars || 0, fat: save.fat || 0, look: save.look || { hair: 0, shirt: 0, pants: 0, crown: true }, misses: 0, evil: false, carrying: null, hidden: null, keyHeld: false };
const store = () => { try { localStorage.setItem('mila_save', JSON.stringify({ hearts: st.hearts, stars: st.stars, fat: st.fat, look: st.look })); } catch (e) {} };
function hud() { $('hearts').textContent = st.hearts; $('stars').textContent = st.stars; }

// ---------------------------------------------------------------- the house and the yard
const W = { taps: [], colliders: [], floorY: 0 };
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
function box(w, h, d, c, x, y, z, o = {}) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'object' ? c : mat(c)); m.position.set(x, y, z); m.castShadow = !!o.shadow; m.receiveShadow = true; scene.add(m); return m; }
function floor(x0, x1, z0, z1, c, y = 0.01) { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mat(c)); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; scene.add(m); return m; }
// floors: kitchen tiles, living wood, bedroom pink, gym blue, grass outside
const ground = floor(-30, 30, -30, 40, 0x8fd16a, -0.02); ground.name = 'ground';
floor(-9, 0, -7, 0, 0xf2efe6); floor(0, 9, -7, 0, 0xd8a774); floor(0, 9, 0, 7, 0xf6c9dc); floor(-9, 0, 0, 7, 0xa8d4f0);
floor(-1.3, 1.3, 7, 18, 0xd9cdb8, 0.005);  // path to the gate
// checker tiles in the kitchen
for (let i = 0; i < 9; i++) for (let j = 0; j < 7; j++) if ((i + j) % 2) floor(-9 + i, -8 + i, -7 + j, -6 + j, 0xdcd6c8, 0.012);
// walls: back and sides tall, front low so the camera sees in; a gap for the door
const WALL = mat(0xfff0d6), WALL2 = mat(0xffd9e8);
box(18.4, 2.6, 0.3, WALL, 0, 1.3, -7.15); box(0.3, 2.6, 14.3, WALL, -9.15, 1.3, 0); box(0.3, 2.6, 14.3, WALL2, 9.15, 1.3, 0);
const frontL = box(7.7, 0.7, 0.3, WALL, -5.15, 0.35, 7.15), frontR = box(7.7, 0.7, 0.3, WALL2, 5.15, 0.35, 7.15);
const door = new THREE.Group(); const doorLeaf = box(2.4, 1.9, 0.12, mat(0xb5793f), 0, 0, 0); doorLeaf.position.set(1.2, 0.95, 0); door.add(doorLeaf);
const knob = box(0.12, 0.12, 0.2, mat(0xffd54a, { metalness: 0.6, roughness: 0.3 }), 2.1, 0.95, 0); door.add(knob); door.position.set(-1.2, 0, 7.15); scene.add(door);
const lockIcon = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 8, 16), mat(0xffd54a, { metalness: 0.7, roughness: 0.3 })); lockIcon.position.set(0, 2.25, 7.15); lockIcon.visible = false; scene.add(lockIcon);
// fence and trees outside
for (let x = -12; x <= 12; x += 1) for (const z of [18]) box(0.12, 0.8, 0.12, 0xffffff, x, 0.4, z);
for (let z = 7.5; z <= 18; z += 1) for (const x of [-12, 12]) box(0.12, 0.8, 0.12, 0xffffff, x, 0.4, z);
box(24, 0.08, 0.06, 0xffffff, 0, 0.65, 18); box(0.06, 0.08, 10.5, 0xffffff, -12, 0.65, 12.75); box(0.06, 0.08, 10.5, 0xffffff, 12, 0.65, 12.75);
function tree(x, z, s = 1) { const g = new THREE.Group(); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * s, 0.2 * s, 1.2 * s, 8), mat(0x8a5a33)); t.position.y = 0.6 * s; t.castShadow = true; g.add(t);
  for (const [dx, dy, r] of [[0, 1.6, 0.8], [0.4, 1.3, 0.55], [-0.4, 1.35, 0.55]]) { const l = new THREE.Mesh(new THREE.SphereGeometry(r * s, 12, 10), mat(0x5cbf4a)); l.position.set(dx * s, dy * s, 0); l.castShadow = true; g.add(l); }
  g.position.set(x, 0, z); scene.add(g); W.colliders.push({ x, z, r: 0.45 * s }); }
tree(-9, 10, 1.3); tree(9.5, 15, 1.5); tree(-10, 16, 1.1); tree(10, 9.5, 1.0); for (let i = 0; i < 14; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), mat(pick([0xff6fa8, 0xffe14a, 0xffffff, 0xb07cff]))); f.position.set(rand(-11, 11), 0.08, rand(8, 17.5)); scene.add(f); }

// ---------------------------------------------------------------- furniture and food models (Kenney, CC0)
let FS = 1, FOOD = 1;   // scale for the furniture kit (fridge 2 m tall) and the food kit (apple 0.28 m)
async function kenney(name, x, z, ry = 0, o = {}) {
  const g = await load('k/' + name + '.glb'); const m = g.scene.clone(true); m.scale.setScalar(o.food ? FOOD : FS * (o.s || 1)); m.rotation.y = ry;
  m.traverse((q) => { if (q.isMesh) { q.castShadow = true; q.receiveShadow = true; } }); m.position.set(x, o.y || 0, z); scene.add(m);
  if (o.r) W.colliders.push({ x, z, r: o.r, obj: m }); return m;
}
async function measure(name) { const g = await load('k/' + name + '.glb'); const b = new THREE.Box3().setFromObject(g.scene); return b.getSize(new THREE.Vector3()); }

// ---------------------------------------------------------------- characters (Quaternius, CC0) and pets (Kenney Cube Pets, CC0)
const SKIN = [0xf5cfae, 0xe0a77f, 0xc98b61];
class Actor {
  constructor(g, height, opts = {}) {
    this.root = new THREE.Group(); this.model = SkeletonUtils.clone(g.scene); this.model.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(this.model, true);
    this.base = height / (b.max.y - b.min.y); this.model.scale.setScalar(this.base); this.model.position.y = -b.min.y * this.base; this.height = height;
    this.mats = {}; this.model.traverse((m) => { if (!m.isMesh) return; m.castShadow = true; m.frustumCulled = false; m.material = m.material.clone(); this.mats[m.material.name] = m.material;
      if (/skin/i.test(m.material.name)) m.material.color.setHex(opts.skin ?? SKIN[0]); });
    this.root.add(this.model); scene.add(this.root);
    this.mixer = new THREE.AnimationMixer(this.model); this.acts = {}; for (const c of g.animations) this.acts[c.name.replace(/^.*\|/, '').toLowerCase()] = this.mixer.clipAction(c);
    this.cur = null; this.target = null; this.path = []; this.speed = opts.speed || 2.6; this.r = opts.r || 0.35; this.busy = 0; this.onArrive = null; this.walkAnim = opts.walk || 'walk'; this.idleAnim = opts.idle || 'idle'; this.play(this.idleAnim);
  }
  play(n, once = false, then = null) { const a = this.acts[n]; if (!a) return; if (a === this.cur && !once) return; a.reset(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat); a.clampWhenFinished = once; a.fadeIn(0.2).play(); if (this.cur && this.cur !== a) this.cur.fadeOut(0.2); this.cur = a;
    if (once) { const dur = a.getClip().duration; this.busy = dur; if (then) setTimeout(then, dur * 1000); } }
  get pos() { return this.root.position; }
  goTo(x, z, onArrive = null, speed = null) { this.path = route(this.pos, new THREE.Vector3(x, 0, z)); this.onArrive = onArrive; this.runSpeed = speed; }
  stop() { this.path = []; this.onArrive = null; }
  update(dt) {
    this.mixer.update(dt); if (this.busy > 0) { this.busy -= dt; return; }
    if (this.path.length) { const t = this.path[0], d = new THREE.Vector3(t.x - this.pos.x, 0, t.z - this.pos.z), L = d.length();
      if (L < 0.12) { this.path.shift(); if (!this.path.length) { this.play(this.idleAnim); const f = this.onArrive; this.onArrive = null; if (f) f(); } return; }
      const sp = this.runSpeed || this.speed; d.normalize(); const prev = this.pos.clone(); this.pos.addScaledVector(d, Math.min(L, sp * dt)); collide(this, prev);
      const want = Math.atan2(d.x, d.z); let dr = want - this.root.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); this.root.rotation.y += dr * Math.min(1, dt * 12);
      this.play(sp > 3.6 && this.acts[this.runAnim || 'run'] ? (this.runAnim || 'run') : this.walkAnim); }
  }
  face(p) { this.root.rotation.y = Math.atan2(p.x - this.pos.x, p.z - this.pos.z); }
  headY() { return this.height * (this.root.scale.y || 1) + 0.15; }
}
// walking between inside and outside goes through the door
const inside = (p) => p.z < 7.0;
function route(from, to) { if (inside(from) !== inside(to)) { const a = new THREE.Vector3(0, 0, inside(from) ? 6.4 : 7.9), b = new THREE.Vector3(0, 0, inside(from) ? 7.9 : 6.4); return [a, b, to]; } return [to]; }
function collide(a, prev) {
  const p = a.pos; const wasIn = inside(prev);
  if (wasIn) { p.x = THREE.MathUtils.clamp(p.x, -8.7, 8.7); p.z = Math.max(p.z, -6.7); if (p.z > 6.75 && (Math.abs(p.x) > 1.0 || st.doorLocked)) p.z = 6.75; }
  else { p.x = THREE.MathUtils.clamp(p.x, -11.6, 11.6); p.z = Math.min(p.z, 17.6); if (p.z < 7.55 && (Math.abs(p.x) > 1.0 || st.doorLocked)) p.z = 7.55; }
  for (const c of W.colliders) { const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), r = c.r + a.r; if (d < r && d > 1e-4) { p.x = c.x + dx / d * r; p.z = c.z + dz / d * r; } }
}

// ---------------------------------------------------------------- floating speech bubbles and effects
const bubbles = [];
function say(actor, emoji, text, opts = {}) { let b = actor.bubble; if (!b) { b = document.createElement('div'); b.className = 'bubble'; $('ui').appendChild(b); actor.bubble = b; bubbles.push(actor); }
  b.innerHTML = `<span class=e>${emoji}</span>${text ? `<span class=t>${text}</span>` : ''}`; b.style.display = 'flex'; b.classList.toggle('evil', !!opts.evil); actor.bubbleT = opts.keep ? 1e9 : (opts.t || 3.2); if (opts.voice !== false && text) speak(text, opts.pitch); }
function updateBubbles(dt) { const v = new THREE.Vector3(); for (const a of bubbles) { const b = a.bubble; a.bubbleT -= dt; if (a.bubbleT <= 0 || !a.root.visible) { b.style.display = 'none'; continue; }
  v.copy(a.pos); v.y = a.headY() + 0.35; v.project(camera); b.style.transform = `translate(${(v.x * 0.5 + 0.5) * innerWidth}px, ${(-v.y * 0.5 + 0.5) * innerHeight}px) translate(-50%,-100%)`; } }
const fx = [];
function burst(p, color = 0xffd54a, n = 18, emoji = null) { const g = new THREE.BufferGeometry(), a = new Float32Array(n * 3), vel = []; for (let i = 0; i < n; i++) { a.set([p.x, p.y, p.z], i * 3); vel.push(new THREE.Vector3(rand(-1, 1), rand(1, 2.5), rand(-1, 1))); }
  g.setAttribute('position', new THREE.BufferAttribute(a, 3)); const pts = new THREE.Points(g, new THREE.PointsMaterial({ color, size: 0.16, transparent: true })); scene.add(pts); fx.push({ pts, vel, t: 0 });
  if (emoji) floatEmoji(p, emoji); }
function floatEmoji(p, e) { const d = document.createElement('div'); d.className = 'float'; d.textContent = e; $('ui').appendChild(d); const v = p.clone().project(camera); d.style.left = (v.x * 0.5 + 0.5) * innerWidth + 'px'; d.style.top = (-v.y * 0.5 + 0.5) * innerHeight + 'px'; setTimeout(() => d.remove(), 1400); }
function updateFx(dt) { for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t += dt; const a = f.pts.geometry.attributes.position; f.vel.forEach((v, k) => { v.y -= 4 * dt; a.setXYZ(k, a.getX(k) + v.x * dt, a.getY(k) + v.y * dt, a.getZ(k) + v.z * dt); }); a.needsUpdate = true; f.pts.material.opacity = 1 - f.t; if (f.t > 1) { scene.remove(f.pts); fx.splice(i, 1); } } }
function reward(p, kind = 'heart') { if (kind === 'heart') st.hearts++; else st.stars++; hud(); store(); burst(p, kind === 'heart' ? 0xff5c8a : 0xffd54a, 20, kind === 'heart' ? '❤️' : '⭐'); sfx.yay(); }

// ---------------------------------------------------------------- tapping
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let downAt = null;
function tappable(obj, handler, hit = null) { obj.traverse((m) => { if (m.isMesh) m.userData.tap = handler; }); W.taps.push(hit || obj); return obj; }
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; ac(); });
renderer.domElement.addEventListener('pointerup', (e) => { if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 18 || panelOpen) return; downAt = null;
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(W.taps, true); const h = hits.find((q) => q.object.userData.tap && q.object.visible);
  if (h) { sfx.pop(); h.object.userData.tap(h.point); return; }
  const g = ray.intersectObject(ground)[0]; if (g) { if (st.hidden) unhide(); mila.goTo(g.point.x, g.point.z); ring(g.point); } });
const tapRing = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.36, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })); tapRing.rotation.x = -Math.PI / 2; scene.add(tapRing); tapRing.visible = false;
function ring(p) { tapRing.position.set(p.x, 0.03, p.z); tapRing.visible = true; tapRing.scale.setScalar(1); tapRing.material.opacity = 1; tapRing.userData.t = 0.6; }
// walk to a spot next to a thing, then do something
function useAt(x, z, fn, r = 1.0) { if (st.hidden) unhide(); const d = new THREE.Vector3(mila.pos.x - x, 0, mila.pos.z - z); if (d.length() < r + 0.2) { mila.stop(); mila.face({ x, z }); fn(); return; }
  d.normalize().multiplyScalar(r); mila.goTo(x + d.x, z + d.z, () => { mila.face({ x, z }); fn(); }); }

// ---------------------------------------------------------------- panels (fridge, stove, wardrobe, gym)
let panelOpen = false;
function panel(title, items, onPick, opts = {}) { panelOpen = true; const p = $('panel'); p.innerHTML = `<div class=ptitle>${title}</div><div class=grid>${items.map((it, i) => `<button class=item data-i=${i} style="${it.bg ? 'background:' + it.bg : ''}">${it.e}<small>${it.w || ''}</small></button>`).join('')}</div><button class=close>✖</button>`;
  p.style.display = 'flex'; p.querySelectorAll('.item').forEach((b) => (b.onclick = () => { sfx.pop(); const keep = onPick(items[+b.dataset.i], b); if (!keep) closePanel(); })); p.querySelector('.close').onclick = closePanel; }
function closePanel() { $('panel').style.display = 'none'; setTimeout(() => (panelOpen = false), 50); }

// ---------------------------------------------------------------- game objects
let mila, mom, boy, coach, lion, chick, pets = [];
const ITEMS = [{ k: 'apple', e: '🍎', w: 'التفاحة' }, { k: 'banana', e: '🍌', w: 'الموزة' }, { k: 'carrot', e: '🥕', w: 'الجزرة' }, { k: 'bread', e: '🍞', w: 'العيش' }, { k: 'carton', e: '🥛', w: 'اللبن' },
  { k: 'orange', e: '🍊', w: 'البرتقالة' }, { k: 'strawberry', e: '🍓', w: 'الفراولة' }, { k: 'cup', e: '🥤', w: 'الكوباية' }, { k: 'bear', e: '🧸', w: 'الدبدوب', fur: true }, { k: 'pillow', e: '🛏️', w: 'المخدة', fur: true }, { k: 'tomato', e: '🍅', w: 'الطماطماية' }];
const FRIDGE = [{ k: 'cake', e: '🎂', w: 'كيكة', sweet: 1 }, { k: 'donut-sprinkles', e: '🍩', w: 'دونات', sweet: 1 }, { k: 'ice-cream', e: '🍦', w: 'آيس كريم', sweet: 1 }, { k: 'chocolate', e: '🍫', w: 'شوكولاتة', sweet: 1 },
  { k: 'pizza', e: '🍕', w: 'بيتزا', sweet: 1 }, { k: 'burger', e: '🍔', w: 'برجر', sweet: 1 }, { k: 'apple', e: '🍎', w: 'تفاحة' }, { k: 'banana', e: '🍌', w: 'موزة' }, { k: 'carrot', e: '🥕', w: 'جزرة' }, { k: 'watermelon', e: '🍉', w: 'بطيخ' },
  { k: 'bread', e: '🍞', w: 'عيش للبطة', carry: 1, bg: '#fff3c4' }, { k: 'meat-raw', e: '🥩', w: 'لحمة للأسد', carry: 1, bg: '#ffd9d0' }];
const SPOTS = [[-6.5, -1.5], [-2, -5.5], [2.5, -3], [7.5, -2.5], [3, 2.5], [6, 6], [-3, 5.5], [-7.5, 3], [-1.5, 1.5], [1.5, -0.5], [-4, -0.8], [8, 1.2]];
let request = null; const dirt = [], dusty = [], plants = [];
async function main() {
  const fr = await measure('kitchenFridge'); FS = 2.0 / fr.y; const ap = await measure('apple'); FOOD = 0.28 / Math.max(ap.x, ap.y, ap.z);
  $('bar').style.width = '20%';
  const [gMila, gMom, gBoy, gCoach, gLion, gChick, gCat, gDog, gBunny] = await Promise.all(['mila.glb', 'mom.glb', 'boy.glb', 'coach.glb', 'lion.glb', 'chick.glb', 'cat.glb', 'dog.glb', 'bunny.glb'].map(load));
  $('bar').style.width = '60%';
  // kitchen
  const fridge = await kenney('kitchenFridge', -8.1, -6.5, 0, { r: 0.6 }); const stove = await kenney('kitchenStove', -6.4, -6.5, 0, { r: 0.6 }); await kenney('kitchenSink', -4.8, -6.5, 0, { r: 0.6 }); await kenney('kitchenCabinetDrawer', -3.2, -6.5, 0, { r: 0.6 });
  const table = await kenney('table', -5, -3, 0, { r: 0.9 }); const chairs = [await kenney('chair', -6.3, -3, Math.PI / 2, { r: 0.35 }), await kenney('chair', -3.7, -3, -Math.PI / 2, { r: 0.35 }), await kenney('chair', -5, -4.2, 0, { r: 0.35 })];
  // living room
  await kenney('rugRectangle', 5, -4, 0); await kenney('loungeSofa', 5, -6.3, 0, { r: 1.0 }); await kenney('cabinetTelevision', 5, -1.6, Math.PI, { r: 0.7 }); await kenney('televisionModern', 5, -1.6, Math.PI, { y: 0.5 });
  const plant1 = await kenney('pottedPlant', 8.2, -6.3, 0, { r: 0.4 }); await kenney('lampRoundFloor', 2.2, -6.4, 0, { r: 0.3 });
  // bedroom
  await kenney('rugRound', 5, 4, 0); const bed = await kenney('bedDouble', 7.2, 2.5, -Math.PI / 2, { r: 1.2 }); const wardrobe = await kenney('bookcaseClosedDoors', 8.4, 5.9, -Math.PI / 2, { r: 0.6, s: 1.3 });
  await kenney('sideTable', 7.8, 0.6, -Math.PI / 2, { r: 0.3 }); const bear = await kenney('bear', 3.2, 6.2, Math.PI, { r: 0.25 }); const plant2 = await kenney('plantSmall1', 2, 0.8, 0, {});
  // the blanket on the bed: crumpled until Mila makes the bed
  const blanket = box(1.9, 0.12, 1.7, mat(0xff8fb8), 7.0, 0.62, 2.5, { shadow: true }); blanket.userData.messy = true; blanket.rotation.set(0.15, 0.6, 0.1);
  // gym corner
  await kenney('rugRectangle', -5, 3.6, Math.PI / 2); const plant3 = await kenney('pottedPlant', -8.3, 6.3, 0, { r: 0.4 });
  for (const [x, z] of [[-7.5, 1], [-2.5, 1]]) { const w = box(0.6, 0.12, 0.12, mat(0x333333), x, 0.12, z, { shadow: true }); for (const dx of [-0.3, 0.3]) box(0.08, 0.3, 0.3, mat(0xd33), x + dx, 0.15, z, { shadow: true }); }
  // people
  mila = new Actor(gMila, 1.45, { speed: 3.0, skin: SKIN[0] }); mila.pos.set(0, 0, 3); mila.r = 0.3; mila.runAnim = 'run'; dressMila();
  mom = new Actor(gMom, 1.8, { speed: 1.8, skin: SKIN[0] }); mom.pos.set(-3, 0, -4.8); mom.home = new THREE.Vector3(-3, 0, -4.8);
  coach = new Actor(gCoach, 1.9, { speed: 1.5, skin: SKIN[2] }); coach.pos.set(-5, 0, 4.6); coach.face({ x: -5, z: 9 });
  boy = new Actor(gBoy, 1.0, { speed: 2.2, skin: SKIN[1] }); boy.pos.set(4, 0, 12); boy.runAnim = 'run';
  lion = new Actor(gLion, 1.1, { speed: 1.4, r: 0.55 }); lion.pos.set(-6, 0, 14);
  chick = new Actor(gChick, 0.5, { speed: 1.2, r: 0.2 }); chick.pos.set(3, 0, 9.5);
  for (const [g, x, z, h] of [[gCat, 3, -4, 0.55], [gDog, -2, 2.5, 0.6], [gBunny, 6, 5, 0.45]]) { const p = new Actor(g, h, { speed: 1.1, r: 0.25 }); p.pos.set(x, 0, z); pets.push(p); tappable(p.root, () => useAt(p.pos.x, p.pos.z, () => { p.stop(); p.play('dance', true); mila.play('victory', true); reward(p.pos.clone().setY(1)); }, 0.9)); }
  // tapping people and things
  tappable(mom.root, () => tapMom()); tappable(coach.root, () => useAt(coach.pos.x, coach.pos.z, gym, 1.3)); tappable(boy.root, () => useAt(boy.pos.x, boy.pos.z, () => { boy.face(mila.pos); say(boy, '👋', 'أهلا يا ميلا!'); boy.play('victory', true); }, 1.0));
  tappable(lion.root, () => useAt(lion.pos.x, lion.pos.z, feedLion, 1.4)); tappable(chick.root, () => useAt(chick.pos.x, chick.pos.z, feedChick, 0.9));
  tappable(fridge, () => useAt(-8.1, -5.5, openFridge, 0.2)); tappable(stove, () => useAt(-6.4, -5.5, cook, 0.2));
  tappable(wardrobe, () => (st.evil ? hideIn(wardrobe, 8.4, 5.9) : useAt(7.6, 5.9, dressUp, 0.2)));
  tappable(bed, () => (st.evil ? hideIn(bed, 7.2, 2.5) : useAt(5.9, 2.5, makeBed, 0.2))); tappable(blanket, () => (st.evil ? hideIn(bed, 7.2, 2.5) : useAt(5.9, 2.5, makeBed, 0.2)));
  tappable(door, () => useAt(0, 6.4, tapDoor, 0.2));
  for (const c of chairs) { dusty.push(c); tappable(c, () => useAt(c.position.x, c.position.z, () => wipe(c), 0.8)); }
  for (const p of [plant1, plant2, plant3]) { plants.push(p); p.userData.dry = true; p.rotation.z = 0.25; p.scale.y *= 0.8; tappable(p, () => useAt(p.position.x, p.position.z, () => water(p), 0.9)); }
  W.blanket = blanket; W.bear = bear;
  for (let i = 0; i < 4; i++) addDirt();
  // dust clouds over the chairs
  for (const c of dusty) { c.userData.dust = dustCloud(c.position); }
  hud(); $('bar').style.width = '100%'; $('load').style.display = 'none'; $('hud').style.display = 'flex';
  setTimeout(() => say(mom, '👋', 'صباح الخير يا ميلا!'), 800); setTimeout(newRequest, 6000);
  renderer.compile(scene, camera); requestAnimationFrame(loop);
}
function dressMila() { const L = st.look, m = mila.mats; const HAIR = [0x5a3218, 0xe8b04a, 0x1b1b1b, 0xd24a7a, 0xd8662a], SHIRT = [0xff7eb6, 0x7ec8ff, 0xffe04a, 0x9a6bff, 0x5fd08a, 0xffffff], PANTS = [0x3b4aa8, 0xff7eb6, 0x2b2b2b, 0xffffff, 0x9a6bff];
  if (m.Hair) m.Hair.color.setHex(HAIR[L.hair % HAIR.length]); if (m.Shirt) m.Shirt.color.setHex(SHIRT[L.shirt % SHIRT.length]); if (m.Pants) m.Pants.color.setHex(PANTS[L.pants % PANTS.length]);
  if (L.crown && !mila.crown) load('k/crown.glb').then((g) => { const c = g.scene.clone(true); const b = new THREE.Box3().setFromObject(c); c.scale.setScalar(0.42 / Math.max(b.max.x - b.min.x, 0.01)); c.position.y = 1.45 + 0.02; mila.root.add(c); mila.crown = c; });
  if (mila.crown) mila.crown.visible = L.crown; const s = 1 + st.fat * 0.75; mila.model.scale.set(mila.base * s, mila.base, mila.base * s); mila.speed = 3.0 * (1 - st.fat * 0.35); $('fat').style.width = st.fat * 100 + '%'; }

// ---------------------------------------------------------------- mom asks for things
async function newRequest() {
  if (st.evil || request) return; const it = pick(ITEMS); const [x, z] = pick(SPOTS);
  const m = await kenney(it.k, x, z, rand(0, 6), it.fur ? { s: 0.7 } : { food: true, y: 0.02 }); if (!it.fur) m.scale.multiplyScalar(1.7); if (it.k === 'bear') m.scale.setScalar(FS * 0.7);
  const glow = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 24), new THREE.MeshBasicMaterial({ color: 0xffe14a, transparent: true, opacity: 0.9 })); glow.rotation.x = -Math.PI / 2; glow.position.set(x, 0.04, z); scene.add(glow);
  request = { it, m, glow, t: 45 }; tappable(m, () => useAt(m.position.x, m.position.z, () => pickUp(request), 0.6));
  say(mom, it.e, 'يا ميلا، هاتي ' + it.w, { t: 6 }); mom.face(mila.pos);
}
function pickUp(r) { if (!r || st.carrying) return; mila.play('pickup', true, () => {}); setTimeout(() => { scene.remove(r.glow); r.m.position.set(0, 1.45 + 0.35, 0); r.m.scale.multiplyScalar(1.3); r.m.rotation.set(0, 0, 0); mila.root.add(r.m); st.carrying = r; mila.walkAnim = 'walk_carry'; mila.idleAnim = 'idle'; say(mila, r.it.e, '', { t: 1.5 }); }, 400); }
function tapMom() { if (st.evil) { say(mom, '😡', 'تعالي هنا!', { evil: true, pitch: 0.5 }); return; }
  useAt(mom.pos.x, mom.pos.z, () => { mom.face(mila.pos); const c = st.carrying;
    if (c && c.it) { // give the requested thing
      mila.root.remove(c.m); mila.walkAnim = 'walk'; st.carrying = null; request = null; st.misses = Math.max(0, st.misses - 1); mom.play('victory', true); mila.play('victory', true);
      say(mom, '😘', pick(['شكرا يا حبيبتي!', 'برافو يا ميلا!', 'إنتي أشطر بنت!'])); reward(mom.pos.clone().setY(1.8)); setTimeout(newRequest, rand(12000, 20000)); }
    else if (c && c.food) { say(mom, '😋', 'الله! شكرا يا ميلا'); }
    else { mom.play('victory', true); say(mom, '🥰', pick(['بحبك يا ميلا', 'يا حبيبتي', 'إنتي قمر'])); } }, 1.1); }

// ---------------------------------------------------------------- cleaning
function addDirt() { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = 'rgba(110,75,40,0.85)';
  for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(rand(16, 48), rand(16, 48), rand(6, 14), 0, 7); x.fill(); }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2;
  const [sx, sz] = pick(SPOTS); m.position.set(sx + rand(-0.8, 0.8), 0.03, sz + rand(-0.8, 0.8)); scene.add(m); dirt.push(m);
  tappable(m, () => useAt(m.position.x, m.position.z, () => sweep(m), 0.6)); }
const broom = new THREE.Group(); { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 6), mat(0xb5793f)); s.position.y = 0.5; broom.add(s); const b = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.08), mat(0xe8c35a)); b.position.y = 0.05; broom.add(b); }
function sweep(m) { mila.root.add(broom); broom.position.set(0.25, 0, 0.45); let t = 0; mila.busy = 1.6; mila.play('idle'); sfx.swish();
  const iv = setInterval(() => { t += 0.05; broom.rotation.z = Math.sin(t * 14) * 0.5; m.material.opacity = Math.max(0, 1 - t / 1.5); if (t > 1.5) { clearInterval(iv); mila.root.remove(broom); scene.remove(m); dirt.splice(dirt.indexOf(m), 1); W.taps.splice(W.taps.indexOf(m), 1);
    reward(m.position.clone().setY(0.6), 'star'); say(mila, '✨', 'نضفت!', { voice: false }); setTimeout(addDirt, rand(20000, 40000)); } if (t % 0.3 < 0.05) sfx.swish(); }, 50); }
function dustCloud(p) { const g = new THREE.BufferGeometry(), a = new Float32Array(30 * 3); for (let i = 0; i < 30; i++) a.set([p.x + rand(-0.35, 0.35), rand(0.5, 1.1), p.z + rand(-0.35, 0.35)], i * 3); g.setAttribute('position', new THREE.BufferAttribute(a, 3));
  const d = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x8a8070, size: 0.09, transparent: true, opacity: 0.8 })); scene.add(d); return d; }
function wipe(c) { if (!c.userData.dust) { say(mila, '✨', '', { t: 1 }); return; } mila.play('punch', true); sfx.swish(); setTimeout(() => { scene.remove(c.userData.dust); c.userData.dust = null; reward(c.position.clone().setY(1), 'star'); setTimeout(() => (c.userData.dust = dustCloud(c.position)), rand(40000, 70000)); }, 700); }
function water(p) { if (!p.userData.dry) { say(mila, '🌿', '', { t: 1 }); return; } mila.play('pickup', true); for (let i = 0; i < 4; i++) setTimeout(() => burst(p.position.clone().setY(1.0), 0x6ec8ff, 10), i * 180);
  setTimeout(() => { p.userData.dry = false; p.rotation.z = 0; p.scale.y /= 0.8; p.scale.multiplyScalar(1.12); reward(p.position.clone().setY(1.2), 'star'); setTimeout(() => { p.userData.dry = true; p.rotation.z = 0.25; p.scale.y *= 0.8; }, rand(50000, 80000)); }, 900); }
function makeBed() { const b = W.blanket; if (!b.userData.messy) { say(mila, '🛏️', '', { t: 1 }); return; } mila.play('pickup', true); let t = 0; const r0 = b.rotation.clone();
  const iv = setInterval(() => { t += 0.05; const k = Math.min(1, t / 0.8); b.rotation.set(r0.x * (1 - k), r0.y * (1 - k), r0.z * (1 - k)); b.position.y = 0.62 + Math.sin(k * Math.PI) * 0.3; if (k >= 1) { clearInterval(iv); b.userData.messy = false; reward(b.position.clone().setY(1.2), 'star');
    setTimeout(() => { b.userData.messy = true; b.rotation.set(0.15, 0.6, 0.1); }, rand(60000, 90000)); } }, 50); }

// ---------------------------------------------------------------- food, cooking, getting big, the gym
function openFridge() { panel('🧊 التلاجة', FRIDGE, (f) => {
  if (f.carry) { if (st.carrying) { say(mila, '🙅‍♀️', '', { t: 1 }); return; } kenney(f.k, 0, 0, 0, { food: true }).then((m) => { scene.remove(m); m.position.set(0, 1.6, 0); mila.root.add(m); st.carrying = { food: f.k, m, it: null }; mila.walkAnim = 'walk_carry'; say(mila, f.e, '', { t: 1.5 }); }); return; }
  eat(f); }); }
function eat(f) { kenney(f.k, 0, 0, 0, { food: true }).then((m) => { scene.remove(m); m.position.set(0, 1.0, 0.35); mila.root.add(m); mila.play('pickup', true); sfx.eat(); let t = 0;
  const iv = setInterval(() => { t += 0.05; m.scale.setScalar(FOOD * Math.max(0.01, 1 - t)); if (t >= 1) { clearInterval(iv); mila.root.remove(m); st.fat = THREE.MathUtils.clamp(st.fat + (f.sweet ? 0.12 : -0.05), 0, 1); dressMila(); store();
    if (f.sweet && st.fat > 0.55) say(mila, '😵', 'أنا بقيت تخينة!'); else say(mila, '😋', 'يم يم!', { voice: false }); if (!f.sweet) reward(mila.pos.clone().setY(1.5), 'star'); } }, 60); }); }
let pot = [];
function cook() { pot = []; const ING = [{ k: 'egg', e: '🥚' }, { k: 'tomato', e: '🍅' }, { k: 'meat-raw', e: '🥩' }, { k: 'carrot', e: '🥕' }, { k: 'bread', e: '🍞' }, { k: 'strawberry', e: '🍓' }, { k: 'broccoli', e: '🥦' }, { k: 'cookie', e: '🍪' }];
  panel('🍳 حطي ٣ حاجات في الحلة', ING, (f, b) => { pot.push(f.k); b.style.opacity = 0.35; b.disabled = true; sfx.pop(); if (pot.length < 3) return true;
    setTimeout(() => { closePanel(); stir(); }, 300); return true; }); }
function stir() { mila.play('punch', true); let n = 0; const iv = setInterval(() => { burst(new THREE.Vector3(-6.4, 1.2, -6.2), 0xffffff, 8); sfx.swish(); if (++n > 5) { clearInterval(iv);
  const dish = pot.includes('egg') ? 'pancakes' : pot.includes('meat-raw') ? 'meat-cooked' : pot.includes('strawberry') || pot.includes('cookie') ? 'cake' : pot.includes('tomato') && pot.includes('bread') ? 'pizza' : 'pot-stew';
  kenney(dish, -5, -3, 0, { food: true, y: 0.78 }).then((d) => { d.scale.multiplyScalar(dish === 'pot-stew' ? 1 : 1.6); reward(d.position.clone().setY(1.3), 'star'); say(mila, '👩‍🍳', 'الأكل جاهز!');
    setTimeout(() => { mom.goTo(-5, -1.9, () => { mom.face({ x: -5, z: -3 }); mom.play('victory', true); say(mom, '😋', 'الله! أحلى أكل!'); reward(mom.pos.clone().setY(1.8)); setTimeout(() => { scene.remove(d); mom.goTo(mom.home.x, mom.home.z); }, 4000); }); }, 1200); }); } }, 350); }
function gym() { coach.face(mila.pos); say(coach, '💪', 'يلا نتمرن!'); panel('🏋️ التمرين', [{ e: '🏃‍♀️', w: 'جري', a: 'run' }, { e: '🤸‍♀️', w: 'نط', a: 'jump' }, { e: '🥊', w: 'بوكس', a: 'punch' }, { e: '🙌', w: 'رقص', a: 'victory' }], (ex) => {
  mila.face(coach.pos); coach.face(mila.pos); let n = 0; const go = () => { mila.play(ex.a, true); coach.play(ex.a, true); if (++n < 4) setTimeout(go, Math.max(500, (mila.acts[ex.a]?.getClip().duration || 0.8) * 1000)); else done(); }; go();
  const done = () => { st.fat = Math.max(0, st.fat - 0.25); dressMila(); store(); coach.play('victory', true); say(coach, '🏅', 'برافو يا بطلة!'); reward(mila.pos.clone().setY(1.6), 'star'); }; }); }
function dressUp() { const opts = [{ e: '💇‍♀️', w: 'الشعر', f: () => st.look.hair++ }, { e: '👚', w: 'البلوزة', f: () => st.look.shirt++ }, { e: '👖', w: 'البنطلون', f: () => st.look.pants++ }, { e: '👑', w: 'التاج', f: () => (st.look.crown = !st.look.crown) }];
  panel('👗 الدولاب', opts, (o) => { o.f(); dressMila(); store(); mila.play('victory', true); burst(mila.pos.clone().setY(1.2), 0xff8fd0, 14); return true; }); }

// ---------------------------------------------------------------- outside: the duck and the lion
function feedChick() { const c = st.carrying; chick.face(mila.pos);
  if (c && c.food === 'bread') { mila.root.remove(c.m); st.carrying = null; mila.walkAnim = 'walk'; chick.play('eat', true); sfx.quack(); say(chick, '💛', 'كاك كاك!', { voice: false }); chick.follow = 30; reward(chick.pos.clone().setY(0.8)); }
  else { chick.play('gesture-negative', true); sfx.quack(); say(chick, '🍞', 'كاك؟', { voice: false }); } }
let chase = 0, lionSleep = 0;
function feedLion() { const c = st.carrying; lion.face(mila.pos);
  if (lionSleep > 0) { say(lion, '💤', '', { voice: false }); return; }
  if (c && c.food === 'meat-raw') { mila.root.remove(c.m); st.carrying = null; mila.walkAnim = 'walk'; lion.stop(); lion.play('eat', true); chase = 0; setTimeout(() => { lionSleep = 40; lion.play('idle'); lion.model.rotation.z = Math.PI / 2 * 0.9; lion.model.position.y = 0.3; say(lion, '💤', '', { keep: true, voice: false }); }, 1500);
    boy.stop(); setTimeout(() => { boy.goTo(mila.pos.x + 0.9, mila.pos.z, () => { boy.face(mila.pos); boy.play('victory', true); say(boy, '🥳', 'شكرا يا ميلا! إنتي أنقذتيني'); reward(boy.pos.clone().setY(1.3)); }, 2.4); }, 600); }
  else { lion.play('gesture-negative', true); sfx.roar(); say(lion, '🦁', 'غرررر!', { voice: false }); mila.play('recievehit', true); } }

// ---------------------------------------------------------------- the door, and mom turning mean
function tapDoor() { if (st.evil) { if (st.carrying && st.carrying.key) { mila.root.remove(st.carrying.m); st.carrying = null; mila.walkAnim = 'walk'; st.doorLocked = false; lockIcon.visible = false; openDoor(true); say(mila, '🔓', 'فتحته! يلا أهرب!'); mila.goTo(0, 9.5, escaped); }
  else say(mila, '🔒', 'الباب مقفول! لازم ألاقي المفتاح'); return; }
  openDoor(!door.userData.open); }
function openDoor(o) { door.userData.open = o; door.userData.want = o ? -Math.PI / 2 : 0; sfx.pop(); }
function missRequest() { const r = request; request = null; scene.remove(r.glow); scene.remove(r.m); st.misses++;
  if (st.misses >= 3) { goEvil(); return; } mom.play('defeat', true); say(mom, '😠', st.misses === 1 ? 'يا ميلا! إنتي مش سامعة الكلام؟' : 'آخر مرة يا ميلا! اسمعي الكلام!', { pitch: 0.8 }); setTimeout(newRequest, 9000); }
const evilBits = new THREE.Group(); { for (const dx of [-0.12, 0.12]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff1a1a })); e.position.set(dx, 1.58, 0.27); evilBits.add(e); }
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.7, 12), mat(0x2a1440)); hat.position.y = 2.1; evilBits.add(hat); const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 16), mat(0x2a1440)); brim.position.y = 1.78; evilBits.add(brim);
  const st2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), mat(0x6b4a2a)); st2.position.set(0.45, 0.8, 0.1); st2.rotation.z = 0.3; evilBits.add(st2); }
let keyObj = null;
function goEvil() { st.evil = true; st.doorLocked = true; openDoor(false); lockIcon.visible = true; if (st.carrying) { mila.root.remove(st.carrying.m); st.carrying = null; mila.walkAnim = 'walk'; }
  if (!inside(mila.pos)) mila.pos.set(0, 0, 5.5);
  mom.root.add(evilBits); for (const m of Object.values(mom.mats)) { m.userData.c = m.color.getHex(); m.color.lerp(new THREE.Color(0x3a2050), 0.55); } mom.root.scale.setScalar(1.12); mom.speed = 2.3; mom.runSpeed = null;
  scene.background.setHex(0x3b3157); scene.fog.color.setHex(0x3b3157); sun.intensity = 0.7; $('evil').style.display = 'block';
  say(mom, '😡', 'خلاص! إنتي مش بتسمعي الكلام! تعالي هنا!', { evil: true, pitch: 0.4, t: 4 }); sfx.roar();
  // a key hidden somewhere in the house
  const [x, z] = pick(SPOTS.filter(([a, b]) => Math.hypot(a - mila.pos.x, b - mila.pos.z) > 5)); keyObj = new THREE.Group(); const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 8, 14), mat(0xffd54a, { metalness: 0.7, roughness: 0.3 }));
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.3), ring2.material); shaft.position.z = 0.25; keyObj.add(ring2, shaft); keyObj.position.set(x, 0.3, z); scene.add(keyObj);
  tappable(keyObj, () => useAt(keyObj.position.x, keyObj.position.z, () => { keyObj.position.set(0, 1.6, 0); mila.root.add(keyObj); st.carrying = { key: true, m: keyObj }; say(mila, '🔑', 'لقيت المفتاح! يلا على الباب'); }, 0.5));
  setTimeout(() => say(mila, '😱', 'لازم أستخبى وألاقي المفتاح!'), 2500); }
function hideIn(obj, x, z) { useAt(x, z, () => { st.hidden = obj; mila.root.visible = false; say(mom, '❓', 'راحت فين؟', { evil: true, pitch: 0.5 }); burst(new THREE.Vector3(x, 1, z), 0xffffff, 10); }, 1.0); }
function unhide() { if (!st.hidden) return; st.hidden = null; mila.root.visible = true; }
function caught() { burst(mila.pos.clone().setY(1), 0xff3355, 20); sfx.roar(); $('flash').style.opacity = 1; setTimeout(() => ($('flash').style.opacity = 0), 600);
  if (st.carrying) { const k = st.carrying; mila.root.remove(k.m); st.carrying = null; mila.walkAnim = 'walk'; if (k.key) { keyObj.position.set(mila.pos.x, 0.3, mila.pos.z); scene.add(keyObj); } }
  mila.stop(); mila.pos.set(5, 0, 5.2); mom.stop(); mom.pos.set(-4, 0, -4); mom.busy = 2.5; say(mom, '😤', 'روحي أوضتك!', { evil: true, pitch: 0.4 }); }
function escaped() { if (!st.evil) return; st.evil = false; st.misses = 0; mom.root.remove(evilBits); for (const m of Object.values(mom.mats)) m.color.setHex(m.userData.c); mom.root.scale.setScalar(1); mom.speed = 1.8;
  scene.background.setHex(0xbfe3ff); scene.fog.color.setHex(0xbfe3ff); sun.intensity = 2.0; $('evil').style.display = 'none'; if (keyObj) { keyObj.parent?.remove(keyObj); keyObj = null; }
  mom.goTo(0, 8.6, () => { mom.face(mila.pos); mom.play('victory', true); mila.play('victory', true); say(mom, '🤗', 'آسفة يا حبيبتي، تعالي في حضني'); reward(mom.pos.clone().setY(1.8)); reward(mila.pos.clone().setY(1.4));
    setTimeout(() => { mom.goTo(mom.home.x, mom.home.z); setTimeout(newRequest, 12000); }, 3000); }); }

// ---------------------------------------------------------------- the loop
const clock = new THREE.Clock(), camPos = new THREE.Vector3(0, 10, 12), look = new THREE.Vector3(); let wanderT = 0, fpsT = 0, frames = 0;
function loop() {
  requestAnimationFrame(loop); const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
  for (const a of [mila, mom, coach, boy, lion, chick, ...pets]) a.update(dt);
  // mom's request timer
  if (request && !st.evil) { request.t -= dt; request.glow.material.opacity = 0.5 + Math.sin(t * 6) * 0.4; request.m.position.y = (request.m.userData.y0 ??= request.m.position.y) + Math.abs(Math.sin(t * 3)) * 0.15;
    if (request.t < 15 && !request.warned) { request.warned = true; say(mom, request.it.e, 'يلا يا ميلا! فين ' + request.it.w + '؟'); } if (request.t <= 0) missRequest(); }
  // mean mom chases (she can't see Mila when she is hiding)
  if (st.evil && mom.busy <= 0) { if (!st.hidden && inside(mila.pos)) { if ((mom.repath = (mom.repath || 0) - dt) <= 0) { mom.repath = 0.3; mom.goTo(mila.pos.x, mila.pos.z, null, 2.3); }
      if (mom.pos.distanceTo(mila.pos) < 0.75) caught(); }
    else if (!mom.path.length) { const [x, z] = pick(SPOTS); mom.goTo(x, z, null, 1.6); } }
  // the lion chases the boy now and then; the duck follows Mila after bread
  if (lionSleep > 0) { lionSleep -= dt; if (lionSleep <= 0) { lion.model.rotation.z = 0; lion.model.position.y = 0; lion.bubbleT = 0; } }
  else { chase -= dt; if (chase <= -rand(12, 20)) { chase = 14; say(boy, '😱', 'إلحقيني يا ميلا! الأسد!'); sfx.roar(); }
    if (chase > 0) { const a = t * 0.9; if (!boy.path.length || boy.pos.distanceTo(boy.path[boy.path.length - 1]) < 0.5) boy.goTo(Math.cos(a) * 6, 12.5 + Math.sin(a) * 3.5, null, 3.8); if (!lion.path.length || (lion.rp = (lion.rp || 0) - dt) <= 0) { lion.rp = 0.5; lion.goTo(boy.pos.x, boy.pos.z, null, 3.0); } if (lion.pos.distanceTo(boy.pos) < 1.0) { boy.pos.x += rand(-2, 2); } }
    else if (!lion.path.length && Math.random() < dt * 0.2) lion.goTo(rand(-10, -3), rand(12, 17)); }
  if (chick.follow > 0) { chick.follow -= dt; if (chick.pos.distanceTo(mila.pos) > 1.2) chick.goTo(mila.pos.x - 0.8, mila.pos.z - 0.6, null, mila.speed * 0.9); } else if (!chick.path.length && Math.random() < dt * 0.3) chick.goTo(rand(-3, 6), rand(8.5, 12));
  wanderT -= dt; if (wanderT <= 0) { wanderT = 3; for (const p of pets) if (!p.path.length && Math.random() < 0.4) { const [x, z] = pick(SPOTS); p.goTo(x + rand(-1, 1), z + rand(-1, 1)); } if (!st.evil && !request && !mom.path.length && Math.random() < 0.3) { const [x, z] = pick([[-3, -4.8], [-5, -1.5], [3, -3.5]]); mom.goTo(x, z, () => (mom.home = new THREE.Vector3(x, 0, z))); } }
  // the door swings
  door.rotation.y += ((door.userData.want || 0) - door.rotation.y) * Math.min(1, dt * 6);
  if (tapRing.visible) { tapRing.userData.t -= dt; tapRing.scale.setScalar(1 + (0.6 - tapRing.userData.t) * 1.5); tapRing.material.opacity = tapRing.userData.t / 0.6; if (tapRing.userData.t <= 0) tapRing.visible = false; }
  // camera follows Mila from above
  const target = mila.pos; camPos.lerp(new THREE.Vector3(target.x, 7.6, target.z + 7.2), 1 - Math.exp(-dt * 3)); camera.position.copy(camPos); look.lerp(new THREE.Vector3(target.x, 0.8, target.z), 1 - Math.exp(-dt * 4)); camera.lookAt(look);
  sun.position.set(target.x + 6, 14, target.z + 8); sun.target.position.copy(target);
  // music
  if (musicOn && AC) { musicT -= dt; if (musicT <= 0) { musicT = st.evil ? 0.42 : 0.32; const tune = st.evil ? SCARY : TUNE; tone(tune[musicStep++ % tune.length] / (st.evil ? 2 : 1), 0.25, st.evil ? 'sawtooth' : 'triangle', st.evil ? 0.05 : 0.04); } }
  updateBubbles(dt); updateFx(dt); renderer.render(scene, camera);
  frames++; fpsT += dt; if (fpsT > 2) { const f = frames / fpsT; frames = 0; fpsT = 0; if (f < 40 && renderer.getPixelRatio() > 1) renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() - 0.25)); }
}
$('btnMusic').onclick = () => { musicOn = !musicOn; $('btnMusic').textContent = musicOn ? '🎵' : '🔇'; };
$('btnStart').onclick = () => { ac(); $('start').style.display = 'none'; main().catch((e) => { $('msg').textContent = 'حصلت مشكلة: ' + e.message; console.error(e); }); $('load').style.display = 'flex'; };
window.__mila = { get st() { return st; }, get mila() { return mila; }, get mom() { return mom; }, goEvil: () => goEvil(), newRequest: () => newRequest(), camera };
