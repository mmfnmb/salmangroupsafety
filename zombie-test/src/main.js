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
  try { c = await caches.open('street-v3'); const hit = await c.match(url); if (hit) return hit.json(); } catch (e) { c = null; }
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
renderer.shadowMap.enabled = true; renderer.shadowMap.type = phone ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 400);
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < 1 ? 75 : 60; camera.updateProjectionMatrix(); });
dispatchEvent(new Event('resize'));

const movers = [], walkers = []; let pr = Math.min(devicePixelRatio, phone ? 1.5 : 2), prMax = pr, lookT = 0;
let sun, sunBase = 3.0, statics = [], player, mixer, acts = {}, cur;
async function start() {
  bar(0.05, 'بيحمّل الشارع…');
  const names = ['street', 'hum', 'car-1', 'car-2', 'car-3', 'hum2', 'hum3']; let done = 0;
  const [st, hum, c1, c2, c3, hum2, hum3] = await Promise.all(names.map((n) => bundle(n).then((j) => (bar(0.05 + 0.6 * ++done / names.length, 'بيحمّل… ' + done + '/' + names.length), j))));
  bar(0.7, 'بيجهّز…');
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
    else m.material = interiorMat(sky);   // windows: rooms behind the glass + sky reflection
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
  const carG = []; for (const cb of [c1, c2, c3]) { const k = Object.keys(cb)[0]; carG.push((await gltf.parseAsync(b64(cb[k]), '')).scene); }
  [[-20, 3.9, 0], [6, -3.9, Math.PI], [28, 3.9, 0]].forEach((sp, i) => { const c = fitCar(carG[i], sp); scene.add(c); parked.push(c); });
  // two cars driving up and down the street
  for (const [i, z, dir, x] of [[2, -2.3, 1, -40], [0, 2.3, -1, 30]]) { const c = fitCar(carG[i].clone(true), [x, z, dir > 0 ? 0 : Math.PI]); c.userData = { dir, v: 7 + i }; scene.add(c); movers.push(c); }
  // people walking on the sidewalks
  const people = [hum, hum2, hum3, hum2, hum3]; let pi = 0;
  for (const hb of people) { const k = Object.keys(hb)[0]; const pg = hb._g || (hb._g = await gltf.parseAsync(b64(hb[k]), '')); const o = SkeletonUtils.clone(pg.scene);
    o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o); o.scale.multiplyScalar((1.65 + Math.random() * 0.2) / (b.max.y - b.min.y)); o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.frustumCulled = false; } });
    if (!pg._ip) { inPlace(pg.animations); pg._ip = 1; } const g2 = new THREE.Group(); g2.add(o); const side = pi % 2 ? 1 : -1, dir = pi < 2 ? 1 : -1;
    g2.position.set(-40 + pi * 19, 0.14, side * (6.2 + Math.random() * 1.6)); g2.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; g2.userData = { dir, v: 1.1 + Math.random() * 0.4 };
    const mx = new THREE.AnimationMixer(o); const wc = pg.animations.find((q) => q.name.includes('walk')); if (wc) mx.clipAction(wc).play(); mx.update(Math.random() * 2); g2.userData.mx = mx; scene.add(g2); walkers.push(g2); pi++; }
  // the person
  const hk = Object.keys(hum)[0]; const hg = await gltf.parseAsync(b64(hum[hk]), ''); player = SkeletonUtils.clone(hg.scene);
  player.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(player); player.scale.multiplyScalar(1.78 / (bb.max.y - bb.min.y));
  player.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.frustumCulled = false; } });
  const pl = new THREE.Group(); pl.add(player); inPlace(hg.animations); pl.position.set(-30, 0.14, 7); pl.rotation.y = Math.PI / 2; scene.add(pl); player = pl;
  mixer = new THREE.AnimationMixer(pl.children[0]); for (const c of hg.animations) acts[c.name] = mixer.clipAction(c); play('idle');
  bar(1, ''); $('load').style.display = 'none'; $('hud').style.display = 'block';
  renderer.compile(scene, camera); requestAnimationFrame(loop);
}
// Fake rooms behind every window (interior mapping): the view ray is traced through a grid of boxes behind the facade,
// so each window shows walls, floor and ceiling with parallax, some rooms lit, some dark; mixed with the sky reflection.
function interiorMat(sky) {
  return new THREE.ShaderMaterial({ uniforms: { sky: { value: sky } },
    vertexShader: `varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D sky; varying vec3 vW; varying vec3 vN;
      float h1(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
      vec3 skyAt(vec3 r){ if (r.y < 0.0) return mix(vec3(0.10,0.09,0.085), vec3(0.22,0.2,0.18), clamp(1.0 + r.y*3.0, 0.0, 1.0)); vec2 uv = vec2(atan(r.z, r.x) / 6.2831853 + 0.5, asin(clamp(r.y,-1.0,1.0)) / 3.1415927 + 0.5); return texture2D(sky, uv).rgb; }
      void main(){
        vec3 n = normalize(vN); if (abs(n.z) < 0.5) { gl_FragColor = vec4(0.03,0.03,0.035,1.0); return; }
        vec3 V = normalize(vW - cameraPosition); float inz = -sign(n.z);           // depth goes away from the street
        bool shop = vW.y < 3.0; vec3 sz = shop ? vec3(6.0, 3.0, 6.0) : vec3(2.6, 3.2, 4.0); float y0 = shop ? 0.0 : 1.0;
        vec3 cell = vec3(floor(vW.x / sz.x), floor((vW.y - y0) / sz.y), sign(n.z));
        float x0 = cell.x * sz.x, yb = y0 + cell.y * sz.y;
        float tx = V.x > 0.0 ? (x0 + sz.x - vW.x) / V.x : (x0 - vW.x) / V.x;
        float ty = V.y > 0.0 ? (yb + sz.y - vW.y) / V.y : (yb - vW.y) / V.y;
        float vz = V.z * inz; float tz = vz > 0.001 ? sz.z / vz : 1e5;
        float t = min(tx, min(ty, tz)); vec3 hp = vW + V * t; float dep = clamp(t * max(vz, 0.05) / sz.z, 0.0, 1.0);
        float r = h1(cell), r2 = h1(cell + 7.1);
        vec3 wall = mix(vec3(0.62,0.56,0.46), mix(vec3(0.45,0.52,0.47), vec3(0.6,0.62,0.66), step(0.5, r2)), step(0.4, r));
        vec3 c;
        if (t == ty) c = V.y < 0.0 ? (shop ? vec3(0.42,0.4,0.37) * (0.8 + 0.2*step(0.5, fract(hp.x*1.2)+0.0)) : vec3(0.32,0.2,0.12) * (0.85 + 0.15*fract(hp.x*4.0))) : vec3(0.7,0.7,0.68);
        else if (t == tx) c = wall * 0.85; else c = wall;
        // a ceiling lamp glow and furniture-ish dark band at the back
        if (t == ty && V.y > 0.0) c += vec3(1.0,0.85,0.6) * 1.5 * smoothstep(0.6, 0.0, length(hp.xz - vec2(x0 + sz.x*0.5, hp.z)) );
        if (t == tz && hp.y - yb < 0.9) c *= 0.45;
        float lit = shop ? 0.9 : (r > 0.35 ? 0.35 + 0.5 * r2 : 0.05);
        c *= 0.32 * lit * mix(1.0, 0.4, dep) * (shop ? vec3(1.0,0.95,0.85) : vec3(1.0,0.9,0.75));
        // blinds on some windows
        if (!shop && r2 > 0.72 && vW.y - (yb + 1.0) > 0.55 - r * 0.6) c = vec3(0.55,0.52,0.48) * (0.6 + 0.4*step(0.5, fract(vW.y*14.0))) * 0.25;
        float F = 0.06 + 0.94 * pow(1.0 - max(dot(-V, n), 0.0), 5.0);
        vec3 col = c * (1.0 - F) + skyAt(reflect(V, n)) * (0.08 + 0.5 * F);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
}
function fitCar(o, [x, z, ry]) {
  o.updateMatrixWorld(true); let bb = new THREE.Box3().setFromObject(o); const g = new THREE.Group(); g.add(o);
  if (bb.max.x - bb.min.x > bb.max.z - bb.min.z) o.rotation.y = Math.PI / 2; o.updateMatrixWorld(true); bb = new THREE.Box3().setFromObject(o);
  o.scale.multiplyScalar(4.9 / (bb.max.z - bb.min.z)); o.updateMatrixWorld(true); bb = new THREE.Box3().setFromObject(o);
  o.position.x -= (bb.min.x + bb.max.x) / 2; o.position.z -= (bb.min.z + bb.max.z) / 2; o.position.y -= bb.min.y;
  o.traverse((m) => { if (!m.isMesh) return; m.castShadow = true; const n = (m.name + ' ' + (m.material && m.material.name)).toLowerCase(); if (/logo|badge|emblem|symbols|manufacturerplate/.test(n)) m.visible = false; });
  g.rotation.y = Math.PI / 2 + ry; g.position.set(x, 0, z); return g;
}
// the recorded walk/run carry the body forward and snap it back each loop: keep the root in place (only up/down stays)
function inPlace(clips) { for (const c of clips) for (const t of c.tracks) if (/^Bip01(_Pelvis)?\.position$/.test(t.name)) { const v = t.values, x0 = v[0], z0 = v[2]; for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; } } return clips; }
function play(n) { const a = acts[n] || Object.values(acts).find((q) => q.getClip().name.includes(n)); if (!a || a === cur) return; a.reset().fadeIn(0.25).play(); if (cur) cur.fadeOut(0.25); cur = a; }

// ---------------------------------------------------------------- controls: left stick to walk, drag on the right to look; WASD + mouse on a computer
const input = { x: 0, y: 0, run: false }; let yaw = Math.PI / 2, pitch = 0.12, first = false; const keys = {};
addEventListener('keydown', (e) => { keys[e.code] = true; if (e.code === 'KeyV') first = !first; });
addEventListener('keyup', (e) => (keys[e.code] = false));
let stickId = null, dragged = 0, lookId = null, sx = 0, sy = 0, lx = 0, ly = 0;
const cvs = renderer.domElement;
cvs.addEventListener('pointerdown', (e) => { if (e.clientX < innerWidth * 0.45 && stickId === null) { stickId = e.pointerId; sx = e.clientX; sy = e.clientY; Object.assign($('stick').style, { left: sx - 55 + 'px', top: sy - 55 + 'px', bottom: 'auto', opacity: 1 }); }
  else if (lookId === null) { lookId = e.pointerId; lx = e.clientX; ly = e.clientY; } cvs.setPointerCapture(e.pointerId); });
cvs.addEventListener('pointermove', (e) => {
  if (e.pointerId === stickId) { let dx = (e.clientX - sx) / 50, dy = (e.clientY - sy) / 50; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } input.x = dx; input.y = -dy; input.run = l > 1.6; $('knob').style.transform = `translate(${dx * 40}px,${dy * 40}px)`; }
  else if (e.pointerId === lookId || (e.pointerType === 'mouse' && e.buttons)) { yaw -= (e.clientX - lx) * 0.006; lookT = 1.2; pitch = Math.max(-0.5, Math.min(0.9, pitch + (e.clientY - ly) * 0.004)); lx = e.clientX; ly = e.clientY; } });
const up = (e) => { if (e.pointerId === stickId) { stickId = null; input.x = input.y = 0; input.run = false; Object.assign($('stick').style, { left: '30px', top: 'auto', bottom: '30px', opacity: .55 }); $('knob').style.transform = ''; } if (e.pointerId === lookId) lookId = null; };
cvs.addEventListener('pointerup', up); cvs.addEventListener('pointercancel', up);
$('btnView').onclick = () => (first = !first); $('btnRun').onpointerdown = () => (input.lock = !input.lock, $('btnRun').classList.toggle('on', input.lock));

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock(), ray = new THREE.Raycaster(), tmp = new THREE.Vector3(), want = new THREE.Vector3(), look = new THREE.Vector3();
let shadeT = 0, lit = 1, litWant = 1, fpsT = 0, frames = 0, speed = 0, refresh = 60, cap = 0, lastDraw = 0, drive = null, camInit = false;
const parked = [];
// the frame limit button: highest the screen allows / 60
$('btnFps').onclick = () => { cap = cap ? 0 : 60; $('btnFps').textContent = cap ? '٦٠' : 'أعلى'; };
$('btnCar').onclick = () => { if (drive) { // get out on the driver's side
    const c = drive.car, h = c.rotation.y; player.position.set(c.position.x - Math.cos(h) * 1.4, 0, c.position.z + Math.sin(h) * 1.4); player.rotation.y = h; player.visible = true; drive = null; speed = 0; }
  else { const c = nearCar(); if (c) { drive = { car: c, v: 0 }; player.visible = false; c.userData.parked = false; yaw = c.rotation.y; } } };
function nearCar() { let best = null, bd = 3.2; for (const c of parked) { const d = Math.hypot(c.position.x - player.position.x, c.position.z - player.position.z); if (d < bd) { bd = d; best = c; } } return best; }
const ang = (d) => Math.atan2(Math.sin(d), Math.cos(d));
function loop(now) {
  requestAnimationFrame(loop);
  if (cap && now - lastDraw < 1000 / cap - 2) return; lastDraw = now;
  const dt = Math.min(0.05, clock.getDelta());
  const mx = THREE.MathUtils.clamp(input.x + ((keys.KeyD || keys.ArrowRight) ? 1 : 0) - ((keys.KeyA || keys.ArrowLeft) ? 1 : 0), -1, 1), my = THREE.MathUtils.clamp(input.y + ((keys.KeyW || keys.ArrowUp) ? 1 : 0) - ((keys.KeyS || keys.ArrowDown) ? 1 : 0), -1, 1);
  const running = input.run || input.lock || keys.ShiftLeft; lookT -= dt;
  let target = player, behind = 3.4, height = 1.62;
  if (drive) { // ---- driving: stick up = gas, down = brake/reverse, sideways = steer
    const c = drive.car; let v = drive.v; const gas = my;
    if (gas > 0.05) v += gas * (v < 0 ? 14 : 7.5) * dt; else if (gas < -0.05) v += gas * (v > 0.5 ? 16 : 4) * dt; else v -= Math.sign(v) * Math.min(Math.abs(v), 2.2 * dt);
    v = THREE.MathUtils.clamp(v * (1 - 0.06 * dt), -6, 24);
    c.rotation.y -= -mx * Math.min(1, Math.abs(v) / 5) * (1.7 - Math.min(0.9, Math.abs(v) / 30)) * dt * Math.sign(v || 1);
    c.position.x += Math.sin(c.rotation.y) * v * dt; c.position.z += Math.cos(c.rotation.y) * v * dt;
    if (Math.abs(c.position.z) > 8.6 || Math.abs(c.position.x) > 49) { c.position.x = THREE.MathUtils.clamp(c.position.x, -49, 49); c.position.z = THREE.MathUtils.clamp(c.position.z, -8.6, 8.6); v *= -0.25; }
    for (const o of [...movers, ...parked]) { if (o === c) continue; const dx = c.position.x - o.position.x, dz = c.position.z - o.position.z; if (Math.abs(dx) < 4.4 && Math.abs(dz) < 1.9) { c.position.x = o.position.x + Math.sign(dx || 1) * 4.4; v *= -0.3; } }
    drive.v = v; c.position.y = 0; player.position.copy(c.position); target = c; behind = 7.0; height = 2.3; play('idle');
    if (lookT <= 0) yaw += ang(c.rotation.y + (v < -0.5 ? 0 : 0) - yaw) * Math.min(1, dt * 3.5);
  } else { // ---- on foot: the camera stays behind; up = walk forward, down = step back, sideways = turn
    const fwd = my > 0.12 ? my : 0, back = my < -0.3;
    player.rotation.y += mx * (running ? 2.2 : 2.6) * dt * (Math.abs(mx) > 0.15 ? 1 : 0);
    const want2 = fwd ? (running ? 4.2 : 1.45 * Math.max(0.65, fwd)) : back ? -0.9 : 0; speed += (want2 - speed) * Math.min(1, dt * 7);
    player.position.x += Math.sin(player.rotation.y) * speed * dt; player.position.z += Math.cos(player.rotation.y) * speed * dt;
    if (Math.abs(speed) > 0.15) { play(speed > 2.5 ? 'run' : 'walk'); if (cur) cur.timeScale = speed > 2.5 ? speed / 4.2 : speed / 1.45 * (speed < 0 ? 0.9 : 1); }
    else if (Math.abs(mx) > 0.15) { play('walk'); if (cur) cur.timeScale = 0.6; } else play('idle');
    player.position.x = THREE.MathUtils.clamp(player.position.x, -49, 49); player.position.z = THREE.MathUtils.clamp(player.position.z, -9.2, 9.2);
    for (const o of [...movers, ...parked]) { const dx = player.position.x - o.position.x, dz = player.position.z - o.position.z; if (Math.abs(dx) < 2.55 && Math.abs(dz) < 1.2) { if (2.55 - Math.abs(dx) < 1.2 - Math.abs(dz)) player.position.x = o.position.x + Math.sign(dx || 1) * 2.55; else player.position.z = o.position.z + Math.sign(dz || 1) * 1.2; } }
    player.position.y = Math.abs(player.position.z) > 5.1 ? 0.14 : 0.0;
    if (lookT <= 0) yaw += ang(player.rotation.y - yaw) * Math.min(1, dt * 4.5);
    $('btnCar').style.display = nearCar() ? 'block' : 'none';
  }
  $('btnCar').textContent = drive ? 'انزل' : 'اركب'; if (drive) $('btnCar').style.display = 'block';
  mixer.update(dt);
  for (const c of movers) { c.position.x += c.userData.dir * c.userData.v * dt; if (c.position.x > 56) c.position.x = -56; if (c.position.x < -56) c.position.x = 56; }
  for (const w of walkers) { w.position.x += w.userData.dir * w.userData.v * dt; if (Math.abs(w.position.x) > 47) { w.userData.dir *= -1; w.rotation.y += Math.PI; w.position.x = Math.sign(w.position.x) * 47; } w.userData.mx.update(dt); }
  // in a building's shadow? the live sun fades on the person and cars
  shadeT -= dt; if (shadeT <= 0) { shadeT = 0.25; tmp.copy(target.position).y += 1.2; ray.set(tmp, sun.userData.dir); ray.far = 60; litWant = ray.intersectObjects(statics, false).length ? 0 : 1; }
  lit += (litWant - lit) * Math.min(1, dt * 4); sun.intensity = sunBase * (0.08 + 0.92 * lit);
  sun.position.copy(target.position).addScaledVector(sun.userData.dir, 40); sun.target.position.copy(target.position);
  // camera: eased behind the shoulder (or the car), first-person on foot when chosen
  const head = tmp.copy(target.position); head.y += height;
  if (first && !drive) { player.children[0].visible = false; camera.position.copy(head).add(new THREE.Vector3(Math.sin(player.rotation.y) * 0.18, 0, Math.cos(player.rotation.y) * 0.18)); camera.lookAt(head.x + Math.sin(yaw) * Math.cos(pitch) * 5, head.y - Math.sin(pitch) * 5, head.z + Math.cos(yaw) * Math.cos(pitch) * 5); }
  else { player.children[0].visible = true; const side = drive ? 0 : 0.4, p = drive ? Math.max(0.12, pitch) : pitch;
    want.set(head.x - Math.sin(yaw) * Math.cos(p) * behind + Math.cos(yaw) * side, Math.max(0.5, head.y + Math.sin(p) * behind), head.z - Math.cos(yaw) * Math.cos(p) * behind - Math.sin(yaw) * side);
    want.z = THREE.MathUtils.clamp(want.z, -9.3, 9.3); if (!camInit) { camera.position.copy(want); camInit = true; } camera.position.lerp(want, 1 - Math.exp(-dt * 12));
    look.set(head.x + Math.cos(yaw) * side, head.y - 0.15, head.z - Math.sin(yaw) * side); camera.lookAt(look); }
  renderer.render(scene, camera);
  frames++; fpsT += dt; if (fpsT > 1) { const f = frames / fpsT; $('fps').textContent = Math.round(f) + ' فريم';
    if (!cap && f > refresh * 1.1) refresh = f > 100 ? 120 : f > 80 ? 90 : 60;      // the screen can go faster than we assumed
    const goal = cap || refresh;
    // keep it smooth: lower the resolution when frames fall below what the screen can show, raise it when there is room
    const nw = f < goal * 0.85 ? Math.max(0.6, pr - 0.15) : f > goal * 0.97 ? Math.min(prMax, pr + 0.1) : pr; if (Math.abs(nw - pr) > 0.01) { pr = nw; renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight); }
    frames = 0; fpsT = 0; }
}
const fail = (m) => { $('load').style.display = 'flex'; $('msg').textContent = 'حصلت مشكلة: ' + m; };
addEventListener('error', (e) => fail(e.message)); addEventListener('unhandledrejection', (e) => fail(e.reason && e.reason.message || String(e.reason)));
renderer.domElement.addEventListener('webglcontextlost', () => fail('ذاكرة الرسوميات خلصت'));
start().catch((e) => { fail(e.message); console.error(e); });
window.__st = { scene, camera, renderer, get player() { return player; }, setYaw: (y, p) => { yaw = y; if (p != null) pitch = p; }, input };
