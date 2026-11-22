// One page with all 100 food models of the delivery game, with small edits applied
// (recolouring and little additions), each labelled in Arabic.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const COLS = 10, CELL = 200, LABEL = 34;
const A = 'all/', H = 'hand/';
// [arabic name, file, edit]
// edit: tint {match: regex on material/mesh name ('*' = all), color}, add: little extra pieces placed on top
const L = [
  ['كشري', 'dishes/koshari.glb'], ['فول', 'dishes/ful.glb'], ['طعمية', 'eg/falafel.glb', { toon: 1 }],
  ['فطير مشلتت', A + 'k_pancakes.glb', { tint: [['*', 0xf3d7a0]], add: [['disc', 0xd9a441, 0.75, 0.04]] }],
  ['حواوشي', A + 'p_Calzone.glb', { tint: [['*', 0xc98a45]] }], ['محشي', A + 'p_Eggplant.glb'],
  ['ملوخية', A + 'k_bowl-soup.glb', { add: [['disc', 0x3e7d22, 0.62, 0.06, 0.78]] }],
  ['كبدة', A + 'k_sub.glb', { tint: [['green|lettuce|tomato|red', 0x6b2c18]] }],
  ['سمك مقلي', A + 'k_fish.glb', { tint: [['*', 0xc48434]] }], ['بيض بالبسطرمة', A + 'k_egg-cooked.glb'],
  ['كفتة', A + 'p_Shish_kebab.glb'], ['فراخ مشوية', A + 'p_Chicken_drumstick.glb'], ['رز معمر', A + 'p_Bowl_of_rice.glb'],
  ['طاجن', A + 'k_pot-stew.glb'], ['عيش بلدي', A + 'k_loaf-round.glb', { tint: [['*', 0xd9a868]] }], ['جبنة', A + 'k_cheese.glb'],
  ['مخلل', A + 'p_Pickle_jar.glb'], ['درة مشوية', A + 'p_Corn.glb'], ['بطاطا', A + 'p_Potatos.glb', { tint: [['*', 0xb5653a]] }],
  ['شوربة', A + 'k_bowl-broth.glb'],
  ['شاورما', 'sk/shawarma/scene.gltf'], ['برجر', A + 'k_burger-cheese-double.glb'], ['بيتزا', A + 'k_pizza.glb'], ['بطاطس', A + 'k_fries.glb'],
  ['هوت دوج', A + 'k_hot-dog.glb'], ['مكرونة', A + 'p_Pasta.glb'], ['فرايد تشيكن', A + 'p_Drumstick_chicken.glb'], ['تاكو', A + 'k_taco.glb'],
  ['كباب', A + 'k_skewer.glb'], ['سوشي', A + 'k_sushi-salmon.glb'], ['بان كيك', A + 'k_pancakes.glb'], ['كرواسون', A + 'k_croissant.glb'],
  ['سلطة', A + 'k_salad.glb'], ['بيكون', A + 'k_bacon.glb'], ['كاري', A + 'k_pan-stew.glb'], ['كلوب ساندوتش', A + 'k_sandwich.glb'],
  ['فشار', A + 'k_bowl-cereal.glb'], ['فلفل حار', A + 'p_Chili_pepper.glb'], ['وافل', A + 'k_waffle.glb'], ['جمبري', A + 'p_Lobster_tail.glb'],
  ['دمبلنج', A + 'p_Pot_stickers.glb'], ['رامن', A + 'k_chinese.glb'], ['كورن دوج', A + 'k_corn-dog.glb'], ['سجق', A + 'k_sausage.glb'],
  ['ريش', A + 'k_meat-ribs.glb'], ['بسكوت', A + 'k_cookie.glb'], ['بلح', A + 'p_Raisin.glb', { tint: [['*', 0x7a3b12]] }], ['سندوتش طويل', A + 'k_sub.glb'],
  ['عرقسوس', A + 'p_Glass_of_milk.glb', { tint: [['*', 0x3a1d10]], add: [['dome', 0xe8d8b8, 0.4, 0.05]] }],
  ['كركديه', A + 'p_Juice.glb'], ['ليمون بالنعناع', A + 'k_soda-glass.glb', { tint: [['purple|soda|drink|juice', 0x8fd14f]] }],
  ['عصب', A + 'p_Juice.glb', { tint: [['red|juice|drink', 0xc9d98a]] }], ['شاي', A + 'k_cup-tea.glb'], ['قهوة', A + 'k_cup-coffee.glb'],
  ['سحلب', A + 'k_mug.glb', { tint: [['*', 0xf4efe6]], add: [['nuts', 0xb57b3c, 0.5, 0.06]] }], ['كولا', A + 'k_soda-can.glb'],
  ['عصير مانجا', A + 'k_soda-glass.glb', { tint: [['purple|soda|drink|juice', 0xffa51f]] }], ['تمر هندي', A + 'k_soda-glass.glb', { tint: [['purple|soda|drink|juice', 0x5a2a12]] }],
  ['بسبوسة', A + 'k_cake.glb', { tint: [['*', 0xd99a3a]], add: [['nuts', 0xf2ead8, 0.7, 0.04]] }], ['كنافة', 'dishes/kunafa.glb'],
  ['أم علي', A + 'p_Flan.glb', { tint: [['*', 0xf0dcb4]] }], ['رز باللبن', A + 'k_ice-cream-cup.glb', { tint: [['*', 0xf8f3ea]], add: [['nuts', 0x8a5a2b, 0.4, 0.03]] }],
  ['دونات', A + 'k_donut-sprinkles.glb'], ['آيس كريم', A + 'k_ice-cream.glb'], ['شوكولاتة', A + 'k_chocolate.glb'], ['كوكيز', A + 'k_cookie-chocolate.glb'],
  ['كب كيك', A + 'k_cupcake.glb'], ['تورتة الفرح', A + 'k_cake-birthday.glb'],
  ['قشطوطة', 'dishes/qashtouta.glb'], ['قشطوطة كراميل', A + 'k_pudding.glb'],
  ['أمبلية مانجا', 'look/kr_icecream_bowl_decorated_A.gltf', { tint: [['*', 0xffb02e]] }], ['أمبلية بيكان', 'look/kr_icecream_bowl_decorated_B.gltf', { add: [['nuts', 0x6b3a18, 0.6, 0.06]] }],
  ['سلانكاتي مانجا', A + 'k_ice-cream-cup.glb', { tint: [['*', 0xffb63a]] }], ['سلانكاتي فستق', A + 'p_Milkshake.glb', { tint: [['*', 0x9fcf5a]] }],
  ['شاورما حلوة', 'sk/shawarma/scene.gltf', { tint: [['*', 0x6b3d1e]], add: [['nuts', 0x8fc44a, 0.6, 0.04]] }],
  ['آيس كريم طعمية', A + 'k_sundae.glb', { add: [['ball', 0x8a5a24, 0.18, 0.1]] }],
  ['كشري لوتس', 'dishes/koshari.glb', { tint: [['*', 0xc8894a]] }], ['نجتس آيس كريم', A + 'k_cookie.glb', { tint: [['*', 0xe0a95a]] }],
  ['رز بلبن بالفشار', A + 'k_ice-cream-cup.glb', { tint: [['*', 0xf8f3ea]], add: [['nuts', 0xfff6d8, 0.6, 0.07]] }], ['بليلة', A + 'k_bowl-cereal.glb', { tint: [['*', 0xe8d6b0]] }],
  ['كريب', A + 'k_pancakes.glb', { tint: [['*', 0xf0c98a]] }], ['كيكة الهبة', 'look/tt_cake_chocolate_slice.gltf', { add: [['nuts', 0xe0912a, 0.6, 0.05]] }],
  ['دباديبو', A + 'k_cupcake.glb', { tint: [['*', 0x6b3a1e]] }], ['ديباري', 'look/tt_croissant.gltf'],
  ['القنبلة', A + 'k_whipped-cream.glb', { add: [['disc', 0xffa51f, 0.5, 0.05], ['nuts', 0x6b3a18, 0.5, 0.05]] }],
  ['آيس كريم بونلس', A + 'p_Drumstick_chicken.glb', { tint: [['*', 0xf3d6a6]] }], ['رولات كنافة', A + 'k_sausage.glb', { tint: [['*', 0xe0912a]] }],
  ['مهلبية', A + 'k_pudding.glb', { tint: [['*', 0xfbf7ef]] }], ['كشري مانجا', 'dishes/koshari.glb', { tint: [['*', 0xffb23a]] }],
  ['الطاسة الملكية', 'look/kr_icecream_bowl_decorated_A.gltf'],
  ['أناناس', A + 'k_pineapple.glb'], ['جوز هند', A + 'k_coconut.glb'], ['عنب', A + 'k_grapes.glb'], ['ليمون', A + 'k_lemon.glb'],
  ['شطة', A + 'k_paprika.glb'], ['بصل', A + 'k_onion.glb'],
  ['ملاحة وفلفلة', A + 'k_shaker-salt.glb'], ['برطمان مربى', A + 'p_Jam_jar.glb'], ['عسل بالطحينة', A + 'k_honey.glb'], ['ملك الأكل', A + 'k_burger-cheese-double.glb', { boss: 1 }],
];
const ALL = L.splice(0); const S0 = window.START || 0, S1 = window.END || ALL.length; L.push(...ALL.slice(S0, S1)); window.NAMES = L.map((x) => x[0]); window.OFFSET = S0;
const rows = Math.ceil(L.length / COLS), W = COLS * CELL, Hh = rows * (CELL + LABEL);
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, Hh); r.setScissorTest(true); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
document.body.style.margin = 0; document.body.appendChild(r.domElement); r.setClearColor(0xfff4e0); r.clear();
const env = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const grad = (() => { const t = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
function edit(root, e) {
  if (!e) return root;
  if (e.toon) { const ms = []; root.traverse((m) => m.isMesh && ms.push(m)); ms.forEach((m) => { const o = m.material; m.material = new THREE.MeshToonMaterial({ map: o.map, color: 0xffffff, gradientMap: grad });
    m.material.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      vec3 q = texture2D(map, vMapUv, 5.5).rgb; q = pow(q, vec3(0.85)); float g = dot(q, vec3(0.299,0.587,0.114)); diffuseColor.rgb = mix(vec3(g), q, 1.45) * 1.08;`); };
    const ol = new THREE.Mesh(m.geometry, new THREE.MeshBasicMaterial({ color: 0x2a1608, side: THREE.BackSide })); ol.scale.setScalar(1.035); m.add(ol); }); }
  for (const [match, color] of e.tint || []) { const re = match === '*' ? null : new RegExp(match, 'i');
    root.traverse((m) => { if (!m.isMesh) return; const mats = Array.isArray(m.material) ? m.material : [m.material];
      m.material = mats.map((mt) => { if (re && !re.test((mt.name || '') + ' ' + m.name)) return mt; const c = mt.clone(); if (c.color) c.color.set(color); if (c.map && match === '*') c.map = null; return c; });
      if (m.material.length === 1) m.material = m.material[0]; }); }
  if (e.add) { root.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(root), sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()); const R = Math.max(sz.x, sz.z) / 2;
    for (const [kind, color, rel, h, yRel] of e.add) { const m = new THREE.MeshStandardMaterial({ color, roughness: 0.4 }); const y = yRel != null ? b.min.y + sz.y * yRel : b.max.y;
      if (kind === 'disc') { const d = new THREE.Mesh(new THREE.CylinderGeometry(R * rel, R * rel, sz.y * h, 40), m); d.position.set(c.x, y - sz.y * h * 0.2, c.z); root.add(d); }
      if (kind === 'dome') { const d = new THREE.Mesh(new THREE.SphereGeometry(R * rel * 2, 24, 12, 0, 6.3, 0, 1.4), m); d.scale.y = 0.35; d.position.set(c.x, y - sz.y * 0.03, c.z); root.add(d); }
      if (kind === 'ball') { const d = new THREE.Mesh(new THREE.IcosahedronGeometry(Math.max(sz.x, sz.y) * rel, 3), m); d.position.set(c.x, y + Math.max(sz.x, sz.y) * rel * 0.6, c.z); root.add(d); }
      if (kind === 'nuts') for (let i = 0; i < 22; i++) { const n = new THREE.Mesh(new THREE.IcosahedronGeometry(Math.max(sz.x, sz.z) * h * 0.5, 1), m); const a = Math.random() * 6.28, d = Math.random() * R * rel; n.position.set(c.x + Math.cos(a) * d, y + Math.random() * sz.y * 0.02, c.z + Math.sin(a) * d); n.scale.y = 0.6; root.add(n); } } }
  return root;
}
(async () => {
  for (let i = 0; i < L.length; i++) { const [name, file, e] = L[i];
    let g; try { g = await loader.loadAsync(file); } catch (err) { console.log('fail', file); continue; }
    try {
    const sc = new THREE.Scene(); sc.environment = env; sc.add(new THREE.HemisphereLight(0xffffff, 0x9a8670, 1.2)); const d = new THREE.DirectionalLight(0xffffff, 2); d.position.set(2, 4, 3); sc.add(d);
    const o = edit(g.scene, e); o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
    const grp = new THREE.Group(); o.position.sub(c); grp.add(o); grp.scale.setScalar(1.6 / Math.max(s.x, s.y, s.z)); grp.rotation.set(0.42, -0.55, 0); sc.add(grp);
    if (e && e.boss) grp.scale.multiplyScalar(1.15);
    // a cartoon face and legs: big eyes on the front, two little legs with shoes underneath
    grp.scale.multiplyScalar(0.8); grp.position.y += 0.25; grp.updateMatrixWorld(true); const wb = new THREE.Box3().setFromObject(grp), ws = wb.getSize(new THREE.Vector3()), wc = wb.getCenter(new THREE.Vector3());
    const er = Math.min(0.15, Math.min(ws.x, ws.y) * 0.1 + 0.03), white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 }), black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 });
    for (const sx of [-1, 1]) { const eye = new THREE.Group(); const w = new THREE.Mesh(new THREE.SphereGeometry(er, 24, 16), white); w.scale.z = 0.6; eye.add(w);
      const pu = new THREE.Mesh(new THREE.SphereGeometry(er * 0.55, 20, 12), black); pu.position.set(0, -er * 0.05, er * 0.45); pu.scale.z = 0.5; eye.add(pu);
      const hl = new THREE.Mesh(new THREE.SphereGeometry(er * 0.18, 10, 8), white); hl.position.set(er * 0.2, er * 0.2, er * 0.7); eye.add(hl);
      eye.position.set(wc.x + sx * Math.max(er * 1.15, ws.x * 0.16), wc.y + ws.y * 0.12, wb.max.z - er * 0.2); sc.add(eye); }
    const legM = new THREE.MeshStandardMaterial({ color: 0x3b2a20, roughness: 0.5 }), shoe = new THREE.MeshStandardMaterial({ color: 0xe8443a, roughness: 0.4 }); const LL = 0.32;
    for (const sx of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, LL, 4, 10), legM); leg.position.set(wc.x + sx * Math.max(0.12, ws.x * 0.18), wb.min.y - LL / 2 + 0.05, wc.z); sc.add(leg);
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 10), shoe); f.scale.set(1, 0.6, 1.5); f.position.set(wc.x + sx * Math.max(0.12, ws.x * 0.18), wb.min.y - LL + 0.02, wc.z + 0.05); sc.add(f); }

    const cam = new THREE.PerspectiveCamera(34, 1, 0.01, 50); cam.position.set(0, 0.0, 3.6); cam.lookAt(0, 0, 0);
    const col = i % COLS, row = Math.floor(i / COLS); const x = col * CELL, y = Hh - (row + 1) * (CELL + LABEL) + LABEL;
    r.setViewport(x, y, CELL, CELL); r.setScissor(x, y, CELL, CELL); r.setClearColor(0xfff4e0); r.clear(); r.render(sc, cam);
    } catch (err) { console.log('fail', name, err.message); } }
  window.DONE = true; })();
