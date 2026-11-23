import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

// Units: Quaternius character ~4-5 units tall. Street runs along X. Restaurant on +Z side, sea on -Z side.
const r = new THREE.WebGLRenderer({ antialias: true });
r.setPixelRatio(Math.min(2, devicePixelRatio)); r.setSize(innerWidth, innerHeight);
r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; document.body.appendChild(r.domElement);
const sc = new THREE.Scene(); sc.background = new THREE.Color(0x9fd3f2); sc.fog = new THREE.Fog(0xbfe2f5, 140, 420);
sc.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture; sc.environmentIntensity = 0.5;
const cam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 900);
const oc = new OrbitControls(cam, r.domElement); oc.maxPolarAngle = Math.PI * 0.49; oc.minDistance = 3; oc.maxDistance = 200;
const setCam = (p, t) => { cam.position.set(...p); oc.target.set(...t); oc.update(); };
setCam([-30, 22, -38], [0, 4, 22]);
sc.add(new THREE.HemisphereLight(0xffffff, 0xa89a7a, 1.15));
const sun = new THREE.DirectionalLight(0xfff1d6, 2.5); sun.position.set(-50, 80, -40); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, far: 260 }); sun.shadow.bias = -0.0004; sc.add(sun);

const L = new GLTFLoader(); const cache = {}; const load = (f) => (cache[f] ||= L.loadAsync('models/' + f));
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
const add = (m, x, y, z, parent = sc) => { m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };

async function place(f, { x = 0, y = 0, z = 0, ry = 0, h = null, w = null, s = 1, tint = null, parent = sc, alignX = 'c', alignZ = 'c' } = {}) {
  const g = await load(f); const o = SkeletonUtils.clone(g.scene);
  o.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; if (tint) { m.material = m.material.clone(); m.material.color = new THREE.Color(tint); } } });
  o.rotation.y = ry; o.updateMatrixWorld(true);
  let bb = new THREE.Box3().setFromObject(o); const sz = bb.getSize(new THREE.Vector3());
  let k = s; if (h) k = h / sz.y; else if (w) k = w / sz.x;
  o.scale.multiplyScalar(k); o.updateMatrixWorld(true); bb = new THREE.Box3().setFromObject(o);
  const c = bb.getCenter(new THREE.Vector3());
  const ox = alignX === 'min' ? bb.min.x : alignX === 'max' ? bb.max.x : c.x;
  const oz = alignZ === 'min' ? bb.min.z : alignZ === 'max' ? bb.max.z : c.z;
  const pw = new THREE.Vector3(); if (parent !== sc) { parent.updateMatrixWorld(true); }
  o.position.set(x - ox, y - bb.min.y, z - oz); parent.add(o); o.updateMatrixWorld(true);
  return { o, bb: new THREE.Box3().setFromObject(o), anims: g.animations };
}

function canvasTex(w, h, draw, rep = [1, 1]) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
const asphalt = (rep) => canvasTex(256, 256, (x) => { x.fillStyle = '#50525a'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 1500; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); } }, rep);
const tiles = (rep) => canvasTex(128, 128, (x) => { x.fillStyle = '#d8cdb8'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#c9bca3'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) x.fillRect(i * 32, j * 32, 32, 32); x.strokeStyle = 'rgba(0,0,0,0.12)'; x.lineWidth = 2; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32, 128); x.stroke(); x.beginPath(); x.moveTo(0, i * 32); x.lineTo(128, i * 32); x.stroke(); } }, rep);
const wood = (rep) => canvasTex(256, 256, (x) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#e2b47a' : '#d9a86c'; x.fillRect(0, i * 32, 256, 32); x.fillStyle = 'rgba(120,70,30,0.25)'; x.fillRect(0, i * 32, 256, 2); x.fillRect((i * 97) % 256, i * 32, 2, 32); } }, rep);
const textTex = (txt, bg, fg, w = 1024, h = 256, font = 'bold 130px sans-serif') => canvasTex(w, h, (x) => { x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = fg; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'rtl'; x.fillText(txt, w / 2, h / 2 + 6); });

// ---------- street ----------
const LEN = 200, ROAD_Z0 = -8, ROAD_Z1 = 8, SIDE = 6;
const road = add(new THREE.Mesh(new THREE.PlaneGeometry(LEN, ROAD_Z1 - ROAD_Z0), std(0xffffff, { map: asphalt([LEN / 10, 2]), roughness: 0.95 })), 0, 0.01, 0); road.rotation.x = -Math.PI / 2;
for (let x = -LEN / 2; x < LEN / 2; x += 8) { const m = add(new THREE.Mesh(new THREE.PlaneGeometry(4, 0.25), std(0xf4f1e6)), x, 0.02, 0); m.rotation.x = -Math.PI / 2; }
for (let i = 0; i < 7; i++) { const m = add(new THREE.Mesh(new THREE.PlaneGeometry(1.2, ROAD_Z1 - ROAD_Z0 - 1), std(0xf7f5ee)), -4.5 + i * 1.5, 0.025, 0); m.rotation.x = -Math.PI / 2; }
const sidewalk = (z0, z1) => { add(new THREE.Mesh(new THREE.BoxGeometry(LEN, 0.4, z1 - z0), std(0xffffff, { map: tiles([LEN / 3, (z1 - z0) / 3]) })), 0, 0.2, (z0 + z1) / 2); add(new THREE.Mesh(new THREE.BoxGeometry(LEN, 0.45, 0.35), std(0xf0f0ea)), 0, 0.22, z0 < 0 ? z1 - 0.17 : z0 + 0.17); };
sidewalk(ROAD_Z1, ROAD_Z1 + SIDE); sidewalk(ROAD_Z0 - SIDE, ROAD_Z0);
const ground = add(new THREE.Mesh(new THREE.PlaneGeometry(LEN + 300, 200), std(0xcfc2a6)), 0, -0.02, 110); ground.rotation.x = -Math.PI / 2;
// corniche on the sea side
const WZ = ROAD_Z0 - SIDE - 0.6;
add(new THREE.Mesh(new THREE.BoxGeometry(LEN, 1.2, 1.2), std(0xd9c7a0)), 0, 0.6, WZ);
for (let x = -LEN / 2; x <= LEN / 2; x += 2.4) add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.1, 8), std(0xf3ecdb)), x, 1.75, WZ);
add(new THREE.Mesh(new THREE.BoxGeometry(LEN, 0.16, 0.3), std(0xf3ecdb)), 0, 2.3, WZ);
const seaMat = new THREE.ShaderMaterial({ uniforms: { t: { value: 0 }, sunDir: { value: sun.position.clone().normalize() }, fogColor: { value: sc.fog.color }, fogNear: { value: sc.fog.near }, fogFar: { value: sc.fog.far } },
  vertexShader: `uniform float t; varying vec3 vW; varying vec3 vN; varying float vFog;
    float h(vec2 p){ return sin(p.x*0.09+t*1.1)*0.45 + sin(p.y*0.14+t*1.4)*0.3 + sin((p.x+p.y)*0.27+t*2.0)*0.14 + sin((p.x*0.7-p.y)*0.5+t*2.6)*0.07; }
    void main(){ vec4 w = modelMatrix*vec4(position,1.0); float e=0.6; float hc=h(w.xz), hx=h(w.xz+vec2(e,0.)), hz=h(w.xz+vec2(0.,e)); w.y += hc;
      vN = normalize(vec3(-(hx-hc)/e, 1.0, -(hz-hc)/e)); vW = w.xyz; vec4 mv = viewMatrix*w; vFog = -mv.z; gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `uniform vec3 sunDir; uniform vec3 fogColor; uniform float fogNear, fogFar; varying vec3 vW; varying vec3 vN; varying float vFog;
    void main(){ vec3 V = normalize(cameraPosition - vW); vec3 N = normalize(vN); float fres = pow(1.0 - max(dot(N,V),0.0), 3.0);
      vec3 col = mix(vec3(0.03,0.32,0.52), vec3(0.10,0.62,0.72), smoothstep(-60.0, -16.0, vW.z)*0.8); col = mix(col, vec3(0.70,0.86,0.96), fres*0.6);
      vec3 H = normalize(sunDir + V); col += vec3(1.0,0.95,0.85) * pow(max(dot(N,H),0.0), 160.0) * 1.6;
      col = mix(col, vec3(0.95), smoothstep(-19.0, -16.0, vW.z)*0.5);
      gl_FragColor = vec4(mix(col, fogColor, smoothstep(fogNear, fogFar, vFog)), 1.0); }` });
const seaGeo = new THREE.PlaneGeometry(900, 420, 200, 100); seaGeo.rotateX(-Math.PI / 2);
const sea = new THREE.Mesh(seaGeo, seaMat); sea.position.set(0, -2.2, WZ - 211); sc.add(sea);
add(new THREE.Mesh(new THREE.BoxGeometry(LEN + 300, 3, 4), std(0xd9c39a)), 0, -1.6, WZ - 2.2);

const jobs = [];
for (let x = -LEN / 2 + 8; x < LEN / 2; x += 16) {
  jobs.push(place('kaykit/streetlight_old_double.gltf', { x, z: ROAD_Z0 - 1.2, y: 0.4, h: 9 }));
  jobs.push(place('kaykit/streetlight_old_double.gltf', { x: x + 8, z: ROAD_Z1 + 1.2, y: 0.4, h: 9 }));
  jobs.push(place('kpirate/palm-detailed-straight.glb', { x: x + 8, z: ROAD_Z0 - 4, y: 0.4, h: 12 + Math.random() * 2, ry: Math.random() * 6 }));
}
const boats = [];
for (const [f, x, z, w] of [['kwater/boat-fishing-small.glb', -40, -40, 12], ['kwater/boat-row-small.glb', 10, -30, 6], ['kwater/boat-sail-a.glb', 50, -70, 14], ['kwater/ship-cargo-a.glb', -20, -180, 60]])
  jobs.push(place(f, { x, y: -2.4, z, w, ry: Math.random() * 6 }).then((p) => boats.push({ o: p.o, ph: Math.random() * 6 })));

// ---------- panda restaurant ----------
const RW = 40, RD = 26, RH = 11, RZ0 = ROAD_Z1 + SIDE;
const R = new THREE.Group(); R.position.set(0, 0.4, RZ0); sc.add(R); R.updateMatrixWorld(true);
add(new THREE.Mesh(new THREE.BoxGeometry(RW, 0.4, RD), std(0xffffff, { map: wood([RW / 4, RD / 4]) })), 0, 0, RD / 2, R);
const wallMat = std(0xf3e6cf), woodMat = std(0xc98a4b), trimMat = std(0x8a5a32);
add(new THREE.Mesh(new THREE.BoxGeometry(RW, RH, 0.5), wallMat), 0, RH / 2, RD, R);
for (const sx of [-1, 1]) add(new THREE.Mesh(new THREE.BoxGeometry(0.5, RH, RD), wallMat), sx * RW / 2, RH / 2, RD / 2, R);
add(new THREE.Mesh(new THREE.BoxGeometry(RW - 1, 3, 0.2), woodMat), 0, 1.7, RD - 0.35, R);
for (const sx of [-1, 1]) add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 3, RD - 1), woodMat), sx * (RW / 2 - 0.35), 1.7, RD / 2, R);
for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { if (sx > 0 && i === 1) continue; const w = add(new THREE.Mesh(new THREE.PlaneGeometry(5, 3.6), std(0xfff8e8, { emissive: 0xfff2d0, emissiveIntensity: 0.25 })), sx * (RW / 2 - 0.5), 6, 5 + i * 7.5, R); w.rotation.y = -sx * Math.PI / 2;
  for (let k = 0; k <= 4; k++) add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.6, 0.12), trimMat), sx * (RW / 2 - 0.55), 6, 5 + i * 7.5 - 2.5 + k * 1.25, R).rotation.y = Math.PI / 2; }
for (const sx of [-1, 1]) add(new THREE.Mesh(new THREE.BoxGeometry(RW / 2 - 3, 1.4, 0.5), woodMat), sx * (RW / 4 + 1.5), 0.9, 0, R);
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xcfeaf5, transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false });
for (const sx of [-1, 1]) { const g = new THREE.Mesh(new THREE.PlaneGeometry(RW / 2 - 3, RH - 3.8), glassMat); g.position.set(sx * (RW / 4 + 1.5), 1.6 + (RH - 3.8) / 2, 0); R.add(g); }
for (const x of [-RW / 2, -RW / 4 - 1, -3, 3, RW / 4 + 1, RW / 2]) add(new THREE.Mesh(new THREE.BoxGeometry(0.4, RH, 0.45), trimMat), x, RH / 2, 0, R);
add(new THREE.Mesh(new THREE.BoxGeometry(RW + 0.6, 2.2, 0.6), std(0x2a2630)), 0, RH - 1.1, 0, R);
const sign = new THREE.Mesh(new THREE.PlaneGeometry(18, 2), new THREE.MeshBasicMaterial({ map: textTex('🐼 مطعم الباندا', '#2a2630', '#ffffff') })); sign.position.set(0, RH - 1.1, -0.32); sign.rotation.y = Math.PI; R.add(sign);
const awn = new THREE.Group(); awn.position.set(0, RH - 2.7, -1.6); awn.rotation.x = -0.35; R.add(awn);
for (let i = 0; i < 20; i++) add(new THREE.Mesh(new THREE.BoxGeometry(RW / 20, 0.15, 3.4), std(i % 2 ? 0xffffff : 0xe23b3b)), -RW / 2 + RW / 40 + i * RW / 20, 0, 0, awn);
// drive-thru window on the right wall (KayKit order window)
jobs.push(place('kr/wall_orderwindow_decorated.gltf', { x: RW / 2 + 0.3, y: 0, z: RD / 2, h: RH * 0.62, ry: Math.PI / 2, parent: R }));
const dtSign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.3), new THREE.MeshBasicMaterial({ map: textTex('شباك الطلبات', '#ffd24a', '#222', 768, 160, 'bold 90px sans-serif') })); dtSign.position.set(RW / 2 + 0.6, RH * 0.62 + 1.0, RD / 2); dtSign.rotation.y = Math.PI / 2; R.add(dtSign);

// interior laid out like the sushi-bar picture
const S = (n) => 'sushi/' + n + '.gltf';
const IN = [];
['Environment_Counter_Drawers', 'Environment_Counter_Straight', 'Environment_Counter_Sink', 'Environment_Counter_Doors', 'Environment_Counter_Straight'].forEach((n, i) => IN.push([S(n), { x: -16 + i * 4.2, z: RD - 1.4, h: 2.6, ry: Math.PI }]));
IN.push([S('Environment_Oven'), { x: 6.2, z: RD - 1.5, h: 3.2, ry: Math.PI }]);
IN.push([S('Environment_Fridge'), { x: 11.6, z: RD - 1.4, h: 8.2, ry: Math.PI }]);
IN.push([S('Environment_CanFridge'), { x: 16.6, z: RD - 1.2, h: 7.6, ry: Math.PI }]);
for (let i = 0; i < 4; i++) IN.push([S('Environment_Cabinet_Shelves'), { x: -16 + i * 4.2, y: 6.4, z: RD - 1.0, h: 1.9, ry: Math.PI }]);
IN.push([S('Environment_Pot_1_Filled'), { x: -11.8, y: 2.6, z: RD - 1.6, h: 1.0 }]);
IN.push([S('Environment_Pot_2_Filled'), { x: 6.2, y: 3.2, z: RD - 1.6, h: 1.6 }]);
IN.push([S('Environment_KitchenKnives'), { x: -3.4, y: 2.6, z: RD - 1.6, h: 1.4 }]);
IN.push([S('Decoration_Bamboo'), { x: -7.5, y: 2.6, z: RD - 1.6, h: 2.6 }]);
IN.push([S('Environment_Bottles'), { x: 1.0, y: 2.6, z: RD - 1.6, h: 1.2 }]);
for (let i = 0; i < 4; i++) IN.push([S('Environment_Counter_Straight_2'), { x: -6.3 + i * 4.2, z: 11, h: 3.0 }]);
['Food_Udon', 'Food_Dango', 'Food_Chukaman', 'Food_SalmonRoll', 'Food_SalmonNigiri', 'Food_Ramen', 'Food_Onigiri', 'Food_Gyoza'].forEach((f, i) => IN.push([S(f), { x: -7.5 + i * 2.15, y: 3.0, z: 10.6, h: 0.9 }]));
for (let i = 0; i < 5; i++) IN.push([S('Environment_Stool'), { x: -7 + i * 3.5, z: 7.6, h: 1.9 }]);
[[-15, 6], [-15, 15], [15, 6], [15, 15]].forEach(([tx, tz], k) => { IN.push([S('Environment_Table'), { x: tx, z: tz, h: 1.9 }]); IN.push([S('Environment_Chair1'), { x: tx - 2.3, z: tz, h: 2.4, ry: Math.PI / 2 }]); IN.push([S('Environment_Chair1'), { x: tx + 2.3, z: tz, h: 2.4, ry: -Math.PI / 2 }]); IN.push([S(['Food_SalmonRoll', 'Food_Ramen', 'Food_Dango', 'Food_Onigiri'][k]), { x: tx, y: 1.9, z: tz, h: 0.7 }]); });
for (const sx of [-1, 1]) IN.push([S('Decoration_Light'), { x: sx * 17, y: 7.8, z: 2, h: 2.4 }]);
for (let i = 0; i < 3; i++) IN.push([S('Decoration_Sign'), { x: -8 + i * 2.4, y: 6.6, z: RD - 0.5, h: 2.4, ry: Math.PI }]);
IN.push([S('Decoration_SakuraFlower'), { x: 13, y: 3.0, z: 10.8, h: 2.0 }]);
IN.push([S('Decoration_Painting'), { x: 0, y: 6.4, z: RD - 0.35, h: 2.6, ry: Math.PI }]);
IN.push([S('Decoration_Plant1'), { x: -18, z: 1.6, h: 3 }]); IN.push([S('Decoration_Plant2'), { x: 18, z: 1.6, h: 3 }]);
for (const [f, o] of IN) jobs.push(place(f, { ...o, parent: R }));

const mixers = [];
async function actor(f, x, z, ry, clip, h = 4.6) { const p = await place('chars/' + f + '.gltf', { x, z, h, ry, parent: R }); p.o.traverse((m) => { if (m.isMesh) m.frustumCulled = false; }); const mx = new THREE.AnimationMixer(p.o); const c = p.anims.find((a) => a.name === clip) || p.anims.find((a) => a.name === 'Idle'); if (c) mx.clipAction(c).play(); mixers.push(mx); }
jobs.push(actor('Panda', 0, 14.5, Math.PI, 'Idle', 5.6));
jobs.push(actor('Rabbit_Pink', -15, 3.2, 0, 'Idle'));
jobs.push(actor('Rabbit_Cyan', 12, 3.5, -0.6, 'Wave'));
jobs.push(actor('Rabbit_Grey', -4, 5.2, 0.3, 'Idle'));
jobs.push(actor('Rabbit_Blond', 18, 13.5, -Math.PI / 2, 'Idle'));
const lamp = new THREE.PointLight(0xffd9a0, 60, 40, 1.6); lamp.position.set(0, 9, 12); R.add(lamp);

// ---------- neighbouring buildings edge to edge ----------
const bfiles = ['kaykit/building_A.gltf', 'kaykit/building_B.gltf', 'kaykit/building_C.gltf', 'kaykit/building_D.gltf', 'kaykit/building_E.gltf', 'kaykit/building_F.gltf', 'kaykit/building_G.gltf', 'kaykit/building_H.gltf'];
async function row(dir) { let x = dir > 0 ? RW / 2 + 2 : -RW / 2 - 2; let i = dir > 0 ? 0 : 4;
  while (Math.abs(x) < LEN / 2 - 6) { const p = await place(bfiles[i % bfiles.length], { x, y: 0.4, z: RZ0, h: 22 + (i % 3) * 5, ry: Math.PI, alignX: dir > 0 ? 'min' : 'max', alignZ: 'min' }); i++; x = dir > 0 ? p.bb.max.x + 1.5 : p.bb.min.x - 1.5; } }
jobs.push(row(1), row(-1));

const movers = [];
for (let i = 0; i < 4; i++) jobs.push(place('kaykit/car_taxi.gltf', { x: -80 + i * 50, y: 0, z: i % 2 ? -4 : 4, w: 7, ry: i % 2 ? -Math.PI / 2 : Math.PI / 2 }).then((p) => {
  p.o.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.map = null; m.material.color.set(0xf2c230); } });
  movers.push({ o: p.o, v: 10 + Math.random() * 4, dir: i % 2 ? -1 : 1 }); }));

Promise.all(jobs).then(() => { document.getElementById('msg').textContent = 'مطعم الباندا — اسحب بصباعك عشان تلف، وقرّب عشان تدخل جوه'; window.READY = true; }).catch((e) => { document.getElementById('msg').textContent = 'خطأ: ' + e.message; console.error(e); window.READY = true; });

const clk = new THREE.Clock();
r.setAnimationLoop(() => { const dt = Math.min(clk.getDelta(), 0.05), t = clk.elapsedTime; seaMat.uniforms.t.value = t;
  for (const b of boats) { b.o.position.y = -2.2 + Math.sin(t * 1.2 + b.ph) * 0.3; b.o.rotation.z = Math.sin(t * 0.9 + b.ph) * 0.05; }
  for (const m of movers) { m.o.position.x += m.v * m.dir * dt; if (m.o.position.x > LEN / 2 + 10) m.o.position.x = -LEN / 2 - 10; if (m.o.position.x < -LEN / 2 - 10) m.o.position.x = LEN / 2 + 10; }
  for (const m of mixers) m.update(dt); r.render(sc, cam); });
addEventListener('resize', () => { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); r.setSize(innerWidth, innerHeight); });
window.__cam = setCam;
