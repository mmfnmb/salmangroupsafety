// three panels side by side: the model as found, the same model made cartoon, and a hand-made one
import * as THREE from 'three'; import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const W = 1500, H = 520, r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H); r.setScissorTest(true); r.outputColorSpace = THREE.SRGBColorSpace; document.body.style.margin = 0; document.body.appendChild(r.domElement);
const L = new GLTFLoader();
function stage(bg) { const sc = new THREE.Scene(); sc.background = new THREE.Color(bg); sc.add(new THREE.HemisphereLight(0xffffff, 0x9a8670, 1.6)); const d = new THREE.DirectionalLight(0xffffff, 2.4); d.position.set(2, 4, 3); sc.add(d); return sc; }
function fit(o, sc, cam) { o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3()); const k = 1.6 / Math.max(s.x, s.y, s.z); const g = new THREE.Group(); o.position.sub(c); g.add(o); g.scale.setScalar(k); g.rotation.set(0.35, -0.5, 0); sc.add(g); cam.position.set(0, 0.9, 2.5); cam.lookAt(0, 0, 0); return g; }
// cartoon look: 3 flat light steps, brighter and more saturated colour, and a dark outline (a slightly bigger copy drawn from behind)
const grad = (() => { const t = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
function toonify(root) { const outl = []; root.traverse((m) => { if (!m.isMesh) return; const old = m.material; const col = old.color ? old.color.clone() : new THREE.Color(1, 1, 1);
    const hsl = {}; col.getHSL(hsl); col.setHSL(hsl.h, Math.min(1, hsl.s * 1.5 + 0.1), Math.min(0.75, hsl.l * 1.05 + 0.05));
    m.material = new THREE.MeshToonMaterial({ color: col, map: old.map || null, gradientMap: grad });
    if (old.map) { m.material.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      vec3 q = texture2D(map, vMapUv, 5.5).rgb; q = pow(q, vec3(0.85)); float g = dot(q, vec3(0.299,0.587,0.114)); diffuseColor.rgb = mix(vec3(g), q, 1.45) * 1.08;`); }; old.map.generateMipmaps = true; old.map.minFilter = THREE.LinearMipmapLinearFilter; old.map.needsUpdate = true; }
    outl.push(m); });
  for (const m of outl) { const o = new THREE.Mesh(m.geometry, new THREE.MeshBasicMaterial({ color: 0x2a1608, side: THREE.BackSide })); o.scale.setScalar(1.035); if (m.isSkinnedMesh) continue; m.add(o); } return root; }
// a hand-made cartoon ta'meya: lumpy round patties with sesame, one broken open (green inside)
function taameya() { const g = new THREE.Group(), crust = new THREE.MeshToonMaterial({ color: 0xb8692a, gradientMap: grad }), dark = new THREE.MeshToonMaterial({ color: 0x8a4a1c, gradientMap: grad }), green = new THREE.MeshToonMaterial({ color: 0x5cb347, gradientMap: grad }), sesame = new THREE.MeshToonMaterial({ color: 0xfff1c9, gradientMap: grad }), plate = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: grad });
  const lump = (r, half) => { const geo = new THREE.SphereGeometry(r, 28, 20, 0, Math.PI * 2, 0, half ? Math.PI / 2 : Math.PI); const p = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 1 + 0.07 * Math.sin(v.x * 31) * Math.sin(v.y * 27 + 1) * Math.sin(v.z * 29 + 2) + 0.04 * Math.sin(v.x * 70 + v.z * 50); v.multiplyScalar(n); v.y *= 0.72; p.setXYZ(i, v.x, v.y, v.z); } geo.computeVertexNormals(); return geo; };
  const pl = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.0, 0.08, 40), plate); pl.position.y = -0.3; g.add(pl);
  const spots = [[-0.45, 0, 0.1, 0.38], [0.35, 0, -0.25, 0.36], [0.1, 0.22, 0.25, 0.34]];
  for (const [x, y, z, r] of spots) { const m = new THREE.Mesh(lump(r), crust); m.position.set(x, y - 0.02, z); g.add(m);
    for (let i = 0; i < 22; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), sesame); s.scale.set(1, 0.5, 1.8); const a = Math.random() * 6.28, b = Math.random() * 1.3; s.position.set(x + Math.cos(a) * Math.sin(b) * r, y + Math.cos(b) * r * 0.72, z + Math.sin(a) * Math.sin(b) * r); s.lookAt(x, y, z); g.add(s); } }
  // the broken one: two halves lying open, green inside facing up
  for (const [x, z, ry] of [[0.55, 0.5, 0.4], [0.95, 0.15, -0.6]]) { const h = new THREE.Mesh(lump(0.3, true), crust); h.rotation.set(Math.PI, ry, 0); h.position.set(x, -0.06, z); g.add(h);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32), green); face.rotation.set(-Math.PI / 2, 0, ry); face.position.set(x, -0.055, z); g.add(face);
    for (let i = 0; i < 10; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), new THREE.MeshToonMaterial({ color: 0x2f7d2a, gradientMap: grad })); const a2 = Math.random() * 6.28, d2 = Math.random() * 0.22; c.position.set(x + Math.cos(a2) * d2, -0.05, z + Math.sin(a2) * d2); c.scale.y = 0.4; g.add(c); } }
  // parsley crumbs on the plate
  for (let i = 0; i < 18; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 4), green); const a = Math.random() * 6.28, d = 0.75 + Math.random() * 0.3; c.position.set(Math.cos(a) * d, -0.24, Math.sin(a) * d); g.add(c); }
  g.traverse((m) => { if (m.isMesh && m.geometry.type === 'SphereGeometry' && m.material === crust) { const o = new THREE.Mesh(m.geometry, new THREE.MeshBasicMaterial({ color: 0x2a1608, side: THREE.BackSide })); o.scale.setScalar(1.04); m.add(o); } });
  return g; }
const panels = [];
(async () => {
  const file = window.FILE; const g1 = await L.loadAsync(file), g2 = await L.loadAsync(file);
  const cams = [0, 1, 2].map(() => new THREE.PerspectiveCamera(35, (W / 3) / H, 0.01, 50));
  const s1 = stage(0xf4efe6), s2 = stage(0xfff4e0), s3 = stage(0xfff4e0);
  fit(g1.scene, s1, cams[0]); fit(toonify(g2.scene), s2, cams[1]);
  if (window.MAKE) fit(taameya(), s3, cams[2]);
  [s1, s2, s3].forEach((sc, i) => { r.setViewport(i * W / 3, 0, W / 3, H); r.setScissor(i * W / 3, 0, W / 3, H); r.render(sc, cams[i]); });
  window.DONE = true; })();
