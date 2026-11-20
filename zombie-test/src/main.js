// Realism test street: lighting baked in Blender Cycles (lightmaps), physical sky HDR, scanned materials,
// a Rocketbox person walking with a third-person camera, parked cars lit by the sun and the sky.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const LM_SCALE = 4.0;   // lightmaps are stored as JPEG: value / LM_SCALE, sRGB encoded
const $ = (id) => document.getElementById(id);
const bar = (p, t) => { $('bar').style.width = Math.round(p * 100) + '%'; if (t) $('msg').textContent = t; };
const b64 = (s) => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
async function bundle(name) {
  if (window.__B && window.__B[name]) return window.__B[name];
  let c = null; const url = 'assets/' + name + '.json';
  try { c = await caches.open('street-v2'); const hit = await c.match(url); if (hit) return hit.json(); } catch (e) { c = null; }
  const r = await fetch(url); if (!r.ok) throw new Error(url + ' ' + r.status); if (c) try { await c.put(url, r.clone()); } catch (e) {} return r.json();
}
const gltf = new GLTFLoader(); gltf.setMeshoptDecoder(MeshoptDecoder);
const rgbe = new RGBELoader();
const hdr = (buf) => { const d = rgbe.parse(buf); const t = new THREE.DataTexture(d.data, d.width, d.height, THREE.RGBAFormat, d.type); t.colorSpace = THREE.LinearSRGBColorSpace; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.flipY = true; t.needsUpdate = true; return t; };

// ---------------------------------------------------------------- renderer
const phone = Math.min(innerWidth, innerHeight) < 700 || /Android|iPhone|iPad/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: !phone, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, phone ? 1.5 : 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.0; renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 400);
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < 1 ? 75 : 60; camera.updateProjectionMatrix(); });
dispatchEvent(new Event('resize'));

let sun, sunBase = 3.0, statics = [], player, mixer, acts = {}, cur;
async function start() {
  bar(0.05, 'Loading street…');
  const names = ['street', 'hum', 'car-1', 'car-2', 'car-3']; let done = 0;
  const [st, hum, ...cars] = await Promise.all(names.map((n) => bundle(n).then((j) => (bar(0.05 + 0.6 * ++done / names.length, 'Loading… ' + done + '/' + names.length), j))));
  bar(0.7, 'Building…');
  const meta = st['street.json'] ? JSON.parse(atob(st['street.json'])) : { sun: [0.5, 0.5, 0.5] };
  // sky: background and reflections
  const sky = hdr(b64(st['sky.hdr'])); sky.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer); const env = pm.fromEquirectangular(sky).texture; scene.environment = env; scene.background = sky; scene.backgroundIntensity = 0.9;
  // street with baked light: textures times the Cycles lightmap (no live light on it)
  const g = await gltf.parseAsync(b64(st['street.glb']), '');
  const lms = {}; for (const k of Object.keys(st)) if (k.startsWith('lm_')) { const im = await createImageBitmap(new Blob([b64(st[k])], { type: 'image/jpeg' })); const t = new THREE.Texture(im); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; lms[k.slice(3, -4)] = t; }
  g.scene.traverse((m) => {
    if (!m.isMesh) return; const root = (m.parent && m.parent.isGroup && m.parent !== g.scene ? m.parent.name : m.name).split('.')[0].replace(/_\d+$/, '');
    const lm = lms[root] || lms[m.name.split('.')[0].replace(/_\d+$/, '')]; const mats = Array.isArray(m.material) ? m.material : [m.material];
    if (lm) { const nm = mats.map((o) => { const b = new THREE.MeshBasicMaterial({ map: o.map, color: o.color, lightMap: lm, lightMapIntensity: Math.PI * LM_SCALE, transparent: o.transparent, alphaTest: o.alphaTest, side: o.side });
        if (b.map) b.map.anisotropy = renderer.capabilities.getMaxAnisotropy(); return b; }); lm.channel = 1; m.material = Array.isArray(m.material) ? nm : nm[0]; statics.push(m); }
    else { for (const o of mats) { o.color = new THREE.Color(0x0a0c0e); o.metalness = 1.0; o.roughness = 0.04; o.envMapIntensity = 1.0; } }  // glass reflects the sky
    m.matrixAutoUpdate = false; m.updateMatrix();
  });
  scene.add(g.scene); g.scene.updateMatrixWorld(true);
  // the sun for moving things (matches the baked one), shadows only on a thin catcher above the ground
  const sd = new THREE.Vector3(...meta.sun).normalize();
  sun = new THREE.DirectionalLight(0xffeedd, sunBase); sun.castShadow = true; sun.shadow.mapSize.set(phone ? 1024 : 2048, phone ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 80 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02; sun.userData.dir = sd;
  scene.add(sun, sun.target); scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x4a4540, 0.25));
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(100, 19), new THREE.ShadowMaterial({ opacity: 0.55 })); catcher.rotation.x = -Math.PI / 2; catcher.position.y = 0.012; catcher.receiveShadow = true; scene.add(catcher);
  const walk = catcher.clone(); walk.geometry = new THREE.PlaneGeometry(100, 4.3); for (const s of [-1, 1]) { const w = walk.clone(); w.position.set(0, 0.155, s * 7.25); scene.add(w); }
  // parked cars along both curbs
  let ci = 0; for (const cb of cars) { const k = Object.keys(cb)[0]; const cg = await gltf.parseAsync(b64(cb[k]), ''); const spots = [[-20, 3.9, 0], [6, -3.9, Math.PI], [28, 3.9, 0]][ci++];
    scene.add(fitCar(cg.scene, spots)); }
  // the person
  const hk = Object.keys(hum)[0]; const hg = await gltf.parseAsync(b64(hum[hk]), ''); player = SkeletonUtils.clone(hg.scene);
  player.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(player); player.scale.multiplyScalar(1.78 / (bb.max.y - bb.min.y));
  player.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.frustumCulled = false; } });
  const pl = new THREE.Group(); pl.add(player); player.rotation.y = Math.PI; pl.position.set(-30, 0.14, 7); pl.rotation.y = Math.PI / 2; scene.add(pl); player = pl;
  mixer = new THREE.AnimationMixer(pl.children[0]); for (const c of hg.animations) acts[c.name] = mixer.clipAction(c); play('idle');
  bar(1, ''); $('load').style.display = 'none'; $('hud').style.display = 'block';
  renderer.compile(scene, camera); requestAnimationFrame(loop);
}
function fitCar(o, [x, z, ry]) {
  o.updateMatrixWorld(true); let bb = new THREE.Box3().setFromObject(o); const g = new THREE.Group(); g.add(o);
  if (bb.max.x - bb.min.x > bb.max.z - bb.min.z) o.rotation.y = Math.PI / 2; o.updateMatrixWorld(true); bb = new THREE.Box3().setFromObject(o);
  o.scale.multiplyScalar(4.9 / (bb.max.z - bb.min.z)); o.updateMatrixWorld(true); bb = new THREE.Box3().setFromObject(o);
  o.position.x -= (bb.min.x + bb.max.x) / 2; o.position.z -= (bb.min.z + bb.max.z) / 2; o.position.y -= bb.min.y;
  o.traverse((m) => { if (!m.isMesh) return; m.castShadow = true; const n = (m.name + ' ' + (m.material && m.material.name)).toLowerCase(); if (/logo|badge|emblem|symbols|manufacturerplate/.test(n)) m.visible = false; });
  g.rotation.y = Math.PI / 2 + ry; g.position.set(x, 0, z); return g;
}
function play(n) { const a = acts[n] || Object.values(acts).find((q) => q.getClip().name.includes(n)); if (!a || a === cur) return; a.reset().fadeIn(0.25).play(); if (cur) cur.fadeOut(0.25); cur = a; }

// ---------------------------------------------------------------- controls: left stick to walk, drag on the right to look; WASD + mouse on a computer
const input = { x: 0, y: 0, run: false }; let yaw = Math.PI / 2, pitch = 0.12, first = false; const keys = {};
addEventListener('keydown', (e) => { keys[e.code] = true; if (e.code === 'KeyV') first = !first; });
addEventListener('keyup', (e) => (keys[e.code] = false));
let stickId = null, lookId = null, sx = 0, sy = 0, lx = 0, ly = 0;
const cvs = renderer.domElement;
cvs.addEventListener('pointerdown', (e) => { if (e.clientX < innerWidth * 0.45 && stickId === null) { stickId = e.pointerId; sx = e.clientX; sy = e.clientY; $('stick').style.display = 'block'; $('stick').style.left = sx - 55 + 'px'; $('stick').style.top = sy - 55 + 'px'; }
  else if (lookId === null) { lookId = e.pointerId; lx = e.clientX; ly = e.clientY; } cvs.setPointerCapture(e.pointerId); });
cvs.addEventListener('pointermove', (e) => {
  if (e.pointerId === stickId) { let dx = (e.clientX - sx) / 50, dy = (e.clientY - sy) / 50; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } input.x = dx; input.y = -dy; input.run = l > 1.6; $('knob').style.transform = `translate(${dx * 40}px,${dy * 40}px)`; }
  else if (e.pointerId === lookId || (e.pointerType === 'mouse' && e.buttons)) { yaw -= (e.clientX - lx) * 0.006; pitch = Math.max(-0.5, Math.min(0.9, pitch + (e.clientY - ly) * 0.004)); lx = e.clientX; ly = e.clientY; } });
const up = (e) => { if (e.pointerId === stickId) { stickId = null; input.x = input.y = 0; input.run = false; $('stick').style.display = 'none'; $('knob').style.transform = ''; } if (e.pointerId === lookId) lookId = null; };
cvs.addEventListener('pointerup', up); cvs.addEventListener('pointercancel', up);
$('btnView').onclick = () => (first = !first); $('btnRun').onpointerdown = () => (input.lock = !input.lock, $('btnRun').classList.toggle('on', input.lock));

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock(), ray = new THREE.Raycaster(), tmp = new THREE.Vector3(); let shadeT = 0, lit = 1, litWant = 1, fpsT = 0, frames = 0;
function loop() {
  requestAnimationFrame(loop); const dt = Math.min(0.05, clock.getDelta());
  let mx = input.x + ((keys.KeyD || keys.ArrowRight) ? 1 : 0) - ((keys.KeyA || keys.ArrowLeft) ? 1 : 0), my = input.y + ((keys.KeyW || keys.ArrowUp) ? 1 : 0) - ((keys.KeyS || keys.ArrowDown) ? 1 : 0);
  const mag = Math.min(1, Math.hypot(mx, my)); const running = input.run || input.lock || keys.ShiftLeft;
  if (mag > 0.1) { const a = yaw + Math.atan2(-mx, my); const sp = (running ? 4.6 : 1.55) * (running ? 1 : Math.max(0.6, mag));
    player.position.x += Math.sin(a) * sp * dt; player.position.z += Math.cos(a) * sp * dt;
    let d = a - player.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); player.rotation.y += d * Math.min(1, dt * 10); play(running ? 'run' : 'walk'); }
  else play('idle');
  player.position.x = Math.max(-49, Math.min(49, player.position.x)); player.position.z = Math.max(-9.2, Math.min(9.2, player.position.z));
  player.position.y = Math.abs(player.position.z) > 5.1 ? 0.14 : 0.0;     // up on the sidewalk, down on the road
  mixer.update(dt);
  // in a building's shadow? (rays to the sun against the baked street) then the live sun fades out on the person and cars
  shadeT -= dt; if (shadeT <= 0) { shadeT = 0.25; tmp.copy(player.position).y += 1.2; ray.set(tmp, sun.userData.dir); ray.far = 60; litWant = ray.intersectObjects(statics, false).length ? 0 : 1; }
  lit += (litWant - lit) * Math.min(1, dt * 4); sun.intensity = sunBase * (0.08 + 0.92 * lit);
  sun.position.copy(player.position).addScaledVector(sun.userData.dir, 40); sun.target.position.copy(player.position);
  // camera
  const head = tmp.copy(player.position).add(new THREE.Vector3(0, 1.62, 0));
  if (first) { player.children[0].visible = false; camera.position.copy(head).add(new THREE.Vector3(Math.sin(player.rotation.y) * 0.15, 0, Math.cos(player.rotation.y) * 0.15)); camera.lookAt(head.x + Math.sin(yaw) * Math.cos(pitch), head.y - Math.sin(pitch), head.z + Math.cos(yaw) * Math.cos(pitch)); }
  else { player.children[0].visible = true; const dist = 3.2; const side = 0.45;
    const cx = head.x - Math.sin(yaw) * Math.cos(pitch) * dist + Math.cos(yaw) * side, cz = head.z - Math.cos(yaw) * Math.cos(pitch) * dist - Math.sin(yaw) * side, cy = head.y + Math.sin(pitch) * dist;
    camera.position.set(cx, Math.max(0.4, cy), Math.max(-9.3, Math.min(9.3, cz))); camera.lookAt(head.x + Math.cos(yaw) * side, head.y - 0.1, head.z - Math.sin(yaw) * side); }
  renderer.render(scene, camera);
  frames++; fpsT += dt; if (fpsT > 1) { $('fps').textContent = Math.round(frames / fpsT) + ' fps'; frames = 0; fpsT = 0; }
}
const fail = (m) => { $('load').style.display = 'flex'; $('msg').textContent = 'Error: ' + m; };
addEventListener('error', (e) => fail(e.message)); addEventListener('unhandledrejection', (e) => fail(e.reason && e.reason.message || String(e.reason)));
renderer.domElement.addEventListener('webglcontextlost', () => fail('graphics memory ran out (WebGL context lost)'));
start().catch((e) => { fail(e.message); console.error(e); });
window.__st = { scene, camera, renderer, get player() { return player; }, setYaw: (y, p) => { yaw = y; if (p != null) pitch = p; }, input };
