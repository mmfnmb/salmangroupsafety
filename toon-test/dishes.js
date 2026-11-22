// Four Egyptian dishes built from soft procedural shapes (no hard edges):
// koshari, ful medames, kunafa, qashtouta. Rendered 2x2 and exported as GLB.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const W = 1400, H = 1400, r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setSize(W, H); r.setScissorTest(true); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; document.body.style.margin = 0; document.body.appendChild(r.domElement);
const env = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
const noise = new SimplexNoise(); let seed = 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const M = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.55, ...o });

// ---------------------------------------------------------------- soft building blocks
// a smooth lathe (bowls, cups, trays) from a few profile points, rounded with a spline
function lathe(pts, seg = 64) { const curve = new THREE.SplineCurve(pts.map(([x, y]) => new THREE.Vector2(x, y))); return new THREE.LatheGeometry(curve.getPoints(48), seg); }
// a lumpy organic blob: a dense sphere pushed by smooth noise, then flattened
function blob(r, { sx = 1, sy = 1, sz = 1, amp = 0.08, freq = 2.2, top = false } = {}) {
  const g = new THREE.SphereGeometry(r, 64, 48, 0, Math.PI * 2, 0, top ? Math.PI / 2 : Math.PI); const p = g.attributes.position, v = new THREE.Vector3(), o = rnd() * 100;
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = v.clone().normalize(); const d = 1 + amp * noise.noise3d(n.x * freq + o, n.y * freq, n.z * freq) + amp * 0.4 * noise.noise3d(n.x * freq * 3, n.y * freq * 3 + o, n.z * freq * 3);
    v.multiplyScalar(d); p.setXYZ(i, v.x * sx, v.y * sy, v.z * sz); }
  g.computeVertexNormals(); return g;
}
// scatter many small soft pieces over a surface (rice, lentils, beans, crumbs) with one instanced mesh
function scatter(surface, piece, mat, count, { scale = [1, 1], lift = 0, up = 0.2, tilt = 1 } = {}) {
  surface.updateMatrixWorld(true); const s = new MeshSurfaceSampler(surface).build(); const im = new THREE.InstancedMesh(piece, mat, count); im.castShadow = true;
  const p = new THREE.Vector3(), n = new THREE.Vector3(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(); let k = 0;
  for (let i = 0; i < count * 6 && k < count; i++) { s.sample(p, n); n.transformDirection(surface.matrixWorld); p.applyMatrix4(surface.matrixWorld); if (n.y < up) continue;
    e.set((rnd() - 0.5) * tilt, rnd() * 6.28, (rnd() - 0.5) * tilt); q.setFromEuler(e); const f = scale[0] + rnd() * (scale[1] - scale[0]); sc.set(f, f, f); p.addScaledVector(n, lift);
    m.compose(p, q, sc); im.setMatrixAt(k++, m); }
  im.count = k; return im;
}
// smooth sauce / cream: metaballs melt into one glossy surface
function goo(balls, mat, res = 48) { const mc = new MarchingCubes(res, mat, false, false, 60000); mc.isolation = 60; mc.reset();
  for (const [x, y, z, s] of balls) mc.addBall(x, y, z, s, 12); mc.update(); const g = mc.geometry.clone(); const mesh = new THREE.Mesh(g, mat); mesh.castShadow = true; return mesh; }
const shadowy = (o) => (o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }), o);

// ---------------------------------------------------------------- 1. KOSHARI: rice, lentils, small pasta, red sauce, crispy onions in a bowl
function koshari() { const g = new THREE.Group();
  const bowl = new THREE.Mesh(lathe([[0, 0], [0.55, 0.02], [0.82, 0.12], [0.98, 0.42], [1.0, 0.5], [0.94, 0.5], [0.9, 0.42], [0.76, 0.16], [0.5, 0.08], [0, 0.08]]), M(0xeee8dc, { roughness: 0.35, clearcoat: 0.6 }));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.97, 0.03, 16, 80), M(0x3c7bb8, { roughness: 0.4 })); rim.rotation.x = Math.PI / 2; rim.position.y = 0.5; g.add(bowl, rim);
  const mound = new THREE.Mesh(blob(0.86, { sy: 0.42, amp: 0.05, top: true }), M(0xd9b36b)); mound.position.y = 0.36; g.add(mound);
  // rice grains (pale), lentils (brown discs), ditalini pasta (short tubes)
  g.add(scatter(mound, new THREE.CapsuleGeometry(0.012, 0.035, 4, 8), M(0xf7efd9, { roughness: 0.6 }), 1400, { scale: [0.8, 1.2], tilt: 2.5 }));
  const lentil = new THREE.SphereGeometry(0.03, 12, 8); lentil.scale(1, 0.45, 1);
  g.add(scatter(mound, lentil, M(0x7a4a24, { roughness: 0.5 }), 700, { scale: [0.8, 1.1], tilt: 0.6 }));
  const tube = new THREE.CylinderGeometry(0.03, 0.03, 0.05, 14, 1, true); g.add(scatter(mound, tube, M(0xf0c977, { roughness: 0.5, side: THREE.DoubleSide }), 140, { scale: [0.8, 1.2], tilt: 3 }));
  // the tomato sauce poured on top, glossy
  const sauce = goo([[0.5, 0.55, 0.5, 0.11], [0.56, 0.54, 0.47, 0.09], [0.44, 0.54, 0.55, 0.08], [0.52, 0.53, 0.56, 0.07], [0.47, 0.54, 0.45, 0.07]], M(0xc0281c, { roughness: 0.2, clearcoat: 1 }));
  sauce.scale.set(1.5, 0.45, 1.5); sauce.position.set(0.05, 0.68, 0.05); g.add(sauce);
  // crispy fried onion strings
  const onionMat = M(0x8a4b1e, { roughness: 0.45 });
  for (let i = 0; i < 46; i++) { const a = rnd() * 6.28, d = rnd() * 0.45, h = 0.73 + rnd() * 0.06; const pts = []; for (let k = 0; k < 6; k++) pts.push(new THREE.Vector3(Math.cos(a) * d + Math.cos(a + k * 0.5) * 0.05 * k, h + Math.sin(k) * 0.015, Math.sin(a) * d + Math.sin(a + k * 0.6) * 0.05 * k));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.009, 6), onionMat)); }
  return shadowy(g); }

// ---------------------------------------------------------------- 2. FUL MEDAMES: stewed fava beans, olive oil pool, cumin, parsley, lemon
function ful() { const g = new THREE.Group();
  const bowl = new THREE.Mesh(lathe([[0, 0], [0.5, 0.0], [0.86, 0.08], [1.0, 0.32], [1.02, 0.36], [0.96, 0.37], [0.9, 0.3], [0.7, 0.12], [0, 0.1]]), M(0xb2532a, { roughness: 0.6 }));
  g.add(bowl); const mash = new THREE.Mesh(blob(0.86, { sy: 0.32, amp: 0.04, top: true }), M(0x7b4c27, { roughness: 0.5 })); mash.position.y = 0.2; g.add(mash);
  const bean = blob(0.05, { sx: 1.2, sy: 0.6, sz: 0.85, amp: 0.05 }); g.add(scatter(mash, bean, M(0x8d5a2e, { roughness: 0.35, clearcoat: 0.4 }), 260, { scale: [0.8, 1.2], tilt: 0.8 }));
  const oil = goo([[0.5, 0.5, 0.5, 0.12], [0.55, 0.5, 0.45, 0.09], [0.45, 0.5, 0.53, 0.09]], M(0xd6b52a, { roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.75 }));
  oil.scale.set(0.8, 0.12, 0.8); oil.position.set(0.1, 0.5, -0.05); g.add(oil);
  g.add(scatter(mash, new THREE.SphereGeometry(0.008, 6, 4), M(0x5a3016), 400, { lift: 0.01 }));
  const leaf = blob(0.025, { sy: 0.3, amp: 0.2 }); g.add(scatter(mash, leaf, M(0x3d8b2f, { roughness: 0.5 }), 60, { lift: 0.02 }));
  const lemon = new THREE.Mesh(blob(0.14, { sy: 0.5, amp: 0.02 }), M(0xf2d63a, { roughness: 0.4 })); lemon.position.set(-0.55, 0.42, 0.35); lemon.rotation.z = 0.5; g.add(lemon);
  return shadowy(g); }

// ---------------------------------------------------------------- 3. KUNAFA: round tray, golden shredded pastry top, cream inside, pistachio, syrup shine
function kunafa() { const g = new THREE.Group();
  const tray = new THREE.Mesh(lathe([[0, 0], [1.05, 0], [1.12, 0.05], [1.14, 0.18], [1.1, 0.19], [1.07, 0.06], [0, 0.04]]), M(0xc9cdd2, { metalness: 0.9, roughness: 0.25 })); g.add(tray);
  const cake = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.04, 0.16, 96, 1), M(0xd07a1c, { roughness: 0.35, clearcoat: 0.8 })); cake.position.y = 0.12; g.add(cake);
  // shredded pastry: many short curly strands lying on top
  const top = new THREE.Mesh(new THREE.CircleGeometry(1.0, 64), M(0xd07a1c)); top.rotation.x = -Math.PI / 2; top.position.y = 0.2; g.add(top);
  const strandMat = M(0xe39a2e, { roughness: 0.3, clearcoat: 0.9 });
  for (let i = 0; i < 520; i++) { const a = rnd() * 6.28, d = Math.sqrt(rnd()) * 0.97, x = Math.cos(a) * d, z = Math.sin(a) * d, dir = rnd() * 6.28, L = 0.12 + rnd() * 0.12; const pts = [];
    for (let k = 0; k < 5; k++) { const t = k / 4; pts.push(new THREE.Vector3(x + Math.cos(dir + t * 1.5) * L * t, 0.205 + rnd() * 0.02, z + Math.sin(dir + t * 1.5) * L * t)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.008, 5), strandMat)); }
  // one slice cut out showing the white cheese/cream layer
  const slice = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.06, 48, 1, false, 0.2, 0.7), M(0xfbf4e2, { roughness: 0.7 })); slice.position.y = 0.13; g.add(slice);
  // pistachio crumbs in the middle
  const crumb = blob(0.03, { amp: 0.25 }); const centre = new THREE.Mesh(new THREE.CircleGeometry(0.35, 32)); centre.rotation.x = -Math.PI / 2; centre.position.y = 0.23;
  g.add(scatter(centre, crumb, M(0x7dbb3c, { roughness: 0.5 }), 160, { scale: [0.6, 1.3] }));
  return shadowy(g); }

// ---------------------------------------------------------------- 4. QASHTOUTA: clear cup, milk cake, cream swirl, mango sauce and cubes
function qashtouta() { const g = new THREE.Group();
  const cup = new THREE.Mesh(lathe([[0, 0], [0.42, 0], [0.47, 0.06], [0.62, 1.0], [0.65, 1.04], [0.6, 1.04], [0.58, 1.0], [0.44, 0.08], [0, 0.04]]), M(0xffffff, { roughness: 0.05, transparent: true, opacity: 0.25, depthWrite: false }));
  g.add(cup);
  const cake = new THREE.Mesh(lathe([[0, 0.05], [0.43, 0.05], [0.52, 0.55], [0, 0.55]]), M(0xf3d9a0, { roughness: 0.85 })); g.add(cake);
  const milk = new THREE.Mesh(lathe([[0, 0.55], [0.52, 0.55], [0.55, 0.68], [0, 0.68]]), M(0xfff8ea, { roughness: 0.4 })); g.add(milk);
  // a soft dome of cream on top, glossy mango sauce over it with a few drips
  const cream = new THREE.Mesh(blob(0.56, { sy: 0.42, amp: 0.035, freq: 3, top: true }), M(0xfffcf4, { roughness: 0.35, clearcoat: 0.3 })); cream.position.y = 0.66; g.add(cream);
  const sauce = new THREE.Mesh(blob(0.4, { sy: 0.12, amp: 0.06, freq: 2.5, top: true }), M(0xffa11a, { roughness: 0.08, clearcoat: 1 })); sauce.position.y = 0.86; g.add(sauce);
  for (const a2 of [0.3, 1.9, 3.4, 4.9]) { const d = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.12, 6, 12), M(0xffa11a, { roughness: 0.08, clearcoat: 1 })); d.position.set(Math.cos(a2) * 0.42, 0.8, Math.sin(a2) * 0.42); d.rotation.set(Math.sin(a2) * 0.6, 0, -Math.cos(a2) * 0.6); g.add(d); }
  const cube = new RoundedBoxGeometry(0.09, 0.09, 0.09, 4, 0.025); const mango = M(0xffb21f, { roughness: 0.25, clearcoat: 0.8 });
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(cube, mango); const a = rnd() * 6.28, d = 0.18 + rnd() * 0.2; m.position.set(Math.cos(a) * d * 0.8, 0.93 + rnd() * 0.04, Math.sin(a) * d * 0.8); m.rotation.set(rnd(), rnd(), rnd()); g.add(m); }
  return shadowy(g); }

// ---------------------------------------------------------------- render the four, and export each as GLB
const dishes = [['koshari', koshari], ['ful', ful], ['kunafa', kunafa], ['qashtouta', qashtouta]];
const out = {}; const exporter = new GLTFExporter();
(async () => {
  for (let i = 0; i < 4; i++) { const [name, make] = dishes[i]; seed = 7 + i * 13;
    const sc = new THREE.Scene(); sc.background = new THREE.Color(0xfff4e0); sc.environment = env;
    const key = new THREE.DirectionalLight(0xfff1dd, 2.2); key.position.set(2, 4, 3); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 6; Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2 }); sc.add(key);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(3, 48), new THREE.ShadowMaterial({ opacity: 0.18 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; sc.add(ground);
    const dish = make(); sc.add(dish); const b = new THREE.Box3().setFromObject(dish), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3()).length();
    const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 50); cam.position.set(c.x, c.y + s * 0.95, c.z + s * 1.45); cam.lookAt(c);
    const x = (i % 2) * W / 2, y = (1 - Math.floor(i / 2)) * H / 2; r.setViewport(x, y, W / 2, H / 2); r.setScissor(x, y, W / 2, H / 2); r.render(sc, cam);
    out[name] = await new Promise((res) => exporter.parse(dish, (buf) => { const u = new Uint8Array(buf); let t = ''; for (let k = 0; k < u.length; k += 32768) t += String.fromCharCode.apply(null, u.subarray(k, k + 32768)); res(btoa(t)); }, () => res(null), { binary: true }));
  }
  window.GLBS = out; window.DONE = true; })();
