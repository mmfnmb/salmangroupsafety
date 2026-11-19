// Fills the lab: real scanned furniture and props (Poly Haven, CC0), the specimen tube, metal hiding lockers,
// computers, wall buttons, maps, covered bodies, puzzle stations and the randomized items.
import * as THREE from 'three';
import { inst, rigged } from './assets.js';
import { cellCenter, C, WH, MAPS, cellAt, material, boxGeo, SECTIONS, sectionAt } from './world.js';

const STD = (color, rough = 0.6, metal = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
export function glow(color, size) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(size); return s; }
export function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData.canvas = c; return t; }

// ---------------------------------------------------------------- small hand-made items (they glow so they can be found)
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; return m; }
const ITEM_MAKERS = {
  battery: () => { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 16), STD(0x222222, 0.4, 0.3), 0, 0.05)); g.add(mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.04, 16), STD(0xd4a017, 0.3, 0.8), 0, 0.08)); g.rotation.z = Math.PI / 2; g.position.y = 0.03; return g; },
  bottle: () => { const g = new THREE.Group(); const glass = STD(0x2a6a3a, 0.08, 0.1, { transparent: true, opacity: 0.75 }); g.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.2, 16), glass, 0, 0.1)); g.add(mesh(new THREE.CylinderGeometry(0.015, 0.035, 0.08, 12), glass, 0, 0.24)); g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 16), STD(0x3cff9a, 0.3, 0, { emissive: 0x13a050, emissiveIntensity: 0.6 }), 0, 0.07)); return g; },
  fuse: (col) => { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 16), STD(0xdddddd, 0.15, 0, { transparent: true, opacity: 0.6 }), 0, 0, 0)); for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.035, 16), STD(0xb8b8b8, 0.25, 1), 0, s * 0.08)); g.add(mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.05, 16), STD(col, 0.4, 0, { emissive: col, emissiveIntensity: 0.3 }))); g.rotation.z = Math.PI / 2; g.position.y = 0.035; return g; },
  screwdriver: () => { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.11, 10), STD(0xd8b000, 0.45), 0, 0, 0)); g.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.13, 8), STD(0xaaaaaa, 0.2, 1), 0, 0.12)); g.rotation.z = Math.PI / 2; g.position.y = 0.02; return g; },
  card: (col) => { const g = new THREE.Group(); const tex = canvasTex(128, 80, (c) => { c.fillStyle = '#' + col.toString(16).padStart(6, '0'); c.fillRect(0, 0, 128, 80); c.fillStyle = '#fff'; c.fillRect(0, 54, 128, 10); c.fillStyle = '#111'; c.font = 'bold 18px monospace'; c.fillText('BLACKWOOD', 8, 24); c.font = '12px monospace'; c.fillText('ACCESS · LEVEL ' + (col === 0xff2233 ? '3' : '1'), 8, 42); });
    g.add(mesh(new THREE.BoxGeometry(0.086, 0.003, 0.054), [STD(col), STD(col), STD(0xffffff, 0.5, 0, { map: tex }), STD(col), STD(col), STD(col)], 0, 0.004)); return g; },
  key: () => { const g = new THREE.Group(); const m = STD(0xc9a24a, 0.3, 1); g.add(mesh(new THREE.TorusGeometry(0.02, 0.006, 8, 16), m, 0, 0.006)); g.children[0].rotation.x = Math.PI / 2; g.add(mesh(new THREE.BoxGeometry(0.06, 0.006, 0.012), m, 0.045, 0.006)); return g; },
  tape: () => { const tex = canvasTex(128, 80, (c) => { c.fillStyle = '#151515'; c.fillRect(0, 0, 128, 80); c.fillStyle = '#e8e0c8'; c.fillRect(10, 8, 108, 26); c.fillStyle = '#222'; c.font = '13px monospace'; c.fillText('LAB 8 · 10/06/88', 14, 26); c.fillStyle = '#ddd'; for (const x of [38, 90]) { c.beginPath(); c.arc(x, 56, 12, 0, 7); c.fill(); } });
    return mesh(new THREE.BoxGeometry(0.1, 0.016, 0.064), [STD(0x111111), STD(0x111111), STD(0xffffff, 0.5, 0, { map: tex }), STD(0x111111), STD(0x111111), STD(0x111111)], 0, 0.008); },
  note: () => { const tex = canvasTex(64, 80, (g) => { g.fillStyle = '#e9e2c8'; g.fillRect(0, 0, 64, 80); g.fillStyle = '#333'; for (let i = 0; i < 7; i++) g.fillRect(8, 10 + i * 9, 30 + (i * 13) % 20, 2); g.fillStyle = '#a00'; g.font = 'bold 22px sans-serif'; g.fillText('#', 40, 72); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.27), STD(0xffffff, 0.9, 0, { map: tex, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.y = 0.006; return m; },
  adrenaline: () => { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.14, 12), STD(0xf2f2f2, 0.2, 0, { transparent: true, opacity: 0.8 }))); g.add(mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.04, 12), STD(0xff7a00, 0.4, 0, { emissive: 0x803000, emissiveIntensity: 0.4 }), 0, 0.08)); g.rotation.z = Math.PI / 2; g.position.y = 0.017; return g; },
  lighter: () => { const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(0.025, 0.07, 0.012), STD(0xb01818, 0.35))); g.add(mesh(new THREE.BoxGeometry(0.025, 0.015, 0.012), STD(0xcccccc, 0.2, 1), 0, 0.042)); g.rotation.x = -Math.PI / 2; g.position.y = 0.007; return g; },
  trap: () => { const g = new THREE.Group(); const body = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.035, 20), STD(0x9a1010, 0.4, 0.4), 0, 0.06); body.rotation.x = Math.PI / 2; g.add(body); for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.022, 10, 8, 0, 6.3, 0, 1.6), STD(0xcccccc, 0.25, 1), s * 0.03, 0.1)); return g; },
};
const ITEM_DEF = { battery: ['battery', 0xffe28a], bottle: ['bottle', 0x39ff9a], fuse_r: ['fuse', 0xff3b30], fuse_y: ['fuse', 0xffcc00], fuse_b: ['fuse', 0x2f7dff], screwdriver: ['screwdriver', 0xffe28a], green: ['card', 0x22dd55], red: ['card', 0xff2233], key: ['key', 0xffd27a], tape: ['tape', 0xffffff], note: ['note', 0xfff2c0], adrenaline: ['adrenaline', 0xff9a3c], lighter: ['lighter', 0xffb050], trap: ['trap', 0xff6a6a] };

// ---------------------------------------------------------------- furniture made of real materials
async function locker() { const g = new THREE.Group(); const metal = await material('metal_plate', 1, { color: 0x56606a });
  const slits = canvasTex(64, 256, (c) => { c.fillStyle = '#9aa3aa'; c.fillRect(0, 0, 64, 256); c.fillStyle = '#111'; for (let i = 0; i < 6; i++) c.fillRect(14, 20 + i * 9, 36, 4); c.fillStyle = '#333'; c.fillRect(48, 120, 6, 26); c.fillStyle = '#556'; c.fillRect(0, 0, 3, 256); });
  g.add(mesh(new THREE.BoxGeometry(0.85, 2.05, 0.6), metal, 0, 1.025)); const door = mesh(new THREE.PlaneGeometry(0.8, 2.0), STD(0x8d969e, 0.5, 0.7, { map: slits }), 0, 1.025, 0.302); g.add(door); return g; }
function crt(screen) { const g = new THREE.Group(); const plastic = STD(0xcbc3ad, 0.65);
  g.add(mesh(new THREE.BoxGeometry(0.42, 0.36, 0.4), plastic, 0, 0.2, -0.02)); g.add(mesh(new THREE.BoxGeometry(0.3, 0.26, 0.2), plastic, 0, 0.2, -0.26));
  const scr = mesh(new THREE.PlaneGeometry(0.33, 0.25), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: screen, emissiveIntensity: 1.2, roughness: 0.15 }), 0, 0.21, 0.181); g.add(scr);
  g.add(mesh(new THREE.BoxGeometry(0.44, 0.03, 0.16), plastic, 0, 0.015, 0.3)); g.userData.screen = scr; return g; }
export function screenTex(lines, col = '#5cff8a') { return canvasTex(256, 192, (c) => { c.fillStyle = '#031208'; c.fillRect(0, 0, 256, 192); c.fillStyle = col; c.font = '14px monospace'; lines.forEach((l, i) => c.fillText(l, 10, 22 + i * 18)); c.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 0; y < 192; y += 3) c.fillRect(0, y, 256, 1); }); }
async function steelTable(w = 1.8, d = 0.8) { const g = new THREE.Group(); const m = await material('metal_plate', 1, { color: 0xb8c0c6 }); g.add(mesh(boxGeo(w, 0.05, d, 1), m, 0, 0.9)); for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 8), m, sx * (w / 2 - 0.08), 0.45, sz * (d / 2 - 0.08))); return g; }
// a cloth sheet draped over a body lying on its back (no body is shown)
function sheet(len = 1.85) { const geo = new THREE.PlaneGeometry(len + 0.3, 1.0, 64, 28); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (len / 2), y = p.getY(i), ax = Math.abs(y);
    const along = x < -0.75 ? 0.13 * Math.exp(-(((x + 0.86) / 0.12) ** 2)) * Math.exp(-((y / 0.16) ** 2)) : 0;
    const torso = (0.16 * Math.exp(-(((x + 0.4) / 0.32) ** 2)) + 0.12 * Math.exp(-(((x - 0.05) / 0.28) ** 2))) * Math.exp(-((y / 0.3) ** 2));
    const legs = 0.08 * Math.max(0, 1 - Math.abs(x - 0.5) / 0.55) * (Math.exp(-(((ax - 0.11) / 0.1) ** 2))) + 0.1 * Math.exp(-(((x - 0.95) / 0.07) ** 2)) * Math.exp(-(((ax - 0.11) / 0.07) ** 2));
    const top = Math.max(along, torso, legs); const fall = Math.max(0, ax - 0.34) * 0.9 + Math.max(0, Math.abs(x) - 1.02) * 0.8;
    p.setZ(i, 0.04 + top - fall + Math.sin(x * 23 + y * 9) * 0.004); }
  geo.computeVertexNormals(); const m = new THREE.Mesh(geo, STD(0xa9a59a, 1, 0, { side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.castShadow = true; m.receiveShadow = true; return m; }
// a real person lying still (the friend, and the workers who never left)
export async function lyingBody(id, faceDown = false) { const { obj, clips } = await rigged('hum/hum_' + id + '.glb'); obj.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(obj); obj.scale.multiplyScalar(1.74 / (bb.max.y - bb.min.y));
  const mix = new THREE.AnimationMixer(obj); const c = clips.find((q) => /idle/.test(q.name)); if (c) { const a = mix.clipAction(c); a.play(); mix.update(0.3); a.paused = true; }
  const g = new THREE.Group(); obj.rotation.x = faceDown ? Math.PI / 2 : -Math.PI / 2; obj.position.y = 0.12; g.add(obj); g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.frustumCulled = false; } }); return g; }

// a wall map: the floor plan with a red "you are here" dot
const ROOM_NAMES = [{ K: 'STORAGE', S: 'SECURITY', I: 'DIRECTOR', E: 'LIFT', T: 'SPECIMEN LAB', X: 'CHEMISTRY', Y: 'CAFETERIA', C: 'CLINIC', M: 'MORGUE', O: 'OFFICES', B: 'WC' },
  { E: 'LIFT', W: 'WAREHOUSE', V: 'SERVERS', K: 'SPECIMENS', P: 'PUMPS', L: 'MEDICAL', A: 'ARCHIVE', G: 'GENERATOR', D: 'DECON' },
  { E: 'LIFT', Z: 'CONTAINMENT', U: 'AUTOPSY', Q: 'CONTROL', R: 'RECORDS', F: 'TUNNEL' }];
export function mapCanvas(f, here, w = 320, h = 260, marks = []) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const M = MAPS[f], cw = (w - 20) / 16, ch = (h - 50) / M.length;
  g.fillStyle = '#e9e4d4'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.font = 'bold 15px monospace'; g.fillText(['GROUND FLOOR', 'LEVEL B1', 'LEVEL B2'][f] + ' · BLACKWOOD', 10, 20);
  M.forEach((r, z) => [...r].forEach((ch2, x) => { if (ch2 === '#') return; g.fillStyle = ch2 === 'H' ? '#bfb8a4' : '#8fa39a'; g.fillRect(10 + x * cw, 32 + z * ch, cw + 0.5, ch + 0.5); }));
  g.fillStyle = '#0b0b0b'; g.font = '9px monospace'; const seen = {}; M.forEach((r, z) => [...r].forEach((ch2, x) => { const n = ROOM_NAMES[f][ch2]; if (n && !seen[ch2]) { seen[ch2] = 1; g.fillText(n, 12 + x * cw, 44 + z * ch); } }));
  for (const m of marks) { g.fillStyle = m.c; g.beginPath(); g.arc(10 + m.x / C * cw, 32 + m.z / C * ch, 4, 0, 7); g.fill(); }
  if (here) { g.fillStyle = '#d00'; g.beginPath(); g.arc(10 + here[0] / C * cw, 32 + here[1] / C * ch, 5, 0, 7); g.fill(); g.font = 'bold 11px monospace'; g.fillText('YOU ARE HERE', Math.min(w - 90, 18 + here[0] / C * cw), 30 + here[1] / C * ch); }
  return c; }

export async function populate(W, rand, state) {
  const S = (f, room) => W.slot(f, room, rand);
  const station = (f, x, z, kind, extra = {}) => { const i = { kind, f, x, z, r: 1.7, ...extra }; W.inter.push(i); return i; };
  const put = (o, f, x, z, ry = 0, y = 0) => { o.position.set(x, y, z); o.rotation.y = ry; W.groups[f].add(o); o.traverse((m) => { if (m.isMesh) { m.castShadow = !W.low; m.receiveShadow = true; } }); return o; };
  const solid = (o, f, shrink = 0.1, h) => { const bb = new THREE.Box3().setFromObject(o); const gy = W.groups[f].position.y; W.addBox(f, (bb.min.x + bb.max.x) / 2, (bb.min.z + bb.max.z) / 2, Math.max(0.05, bb.max.x - bb.min.x - shrink), Math.max(0.05, bb.max.z - bb.min.z - shrink), h != null ? h : bb.max.y - gy); };
  const onSlot = async (name, f, room, opts = {}) => { const s = S(f, room); if (!s) return null; const o = await W.prop(name, f, s.x + Math.sin(s.ry) * (opts.out || 0), s.z + Math.cos(s.ry) * (opts.out || 0), s.ry + (opts.turn || 0), opts); return { o, s }; };
  const custom = async (make, f, room, opts = {}) => { const s = S(f, room); if (!s) return null; const o = await make(); put(o, f, s.x + Math.sin(s.ry) * (opts.out || 0), s.z + Math.cos(s.ry) * (opts.out || 0), s.ry, opts.y || 0); if (opts.solid !== false) solid(o, f); return { o, s }; };
  const center = (f, room) => { const cells = []; MAPS[f].forEach((r, z) => [...r].forEach((c, x) => { if (c === room) cells.push(cellCenter(x, z)); })); const x = cells.reduce((a, c) => a + c[0], 0) / cells.length, z = cells.reduce((a, c) => a + c[1], 0) / cells.length; return [x, z, cells]; };
  const computer = async (f, room, lines, kind = 'computer', extra = {}) => { const r = await custom(async () => { const g = await steelTable(1.2, 0.7); const tex = screenTex(lines); const c = crt(tex); c.position.y = 0.925; c.rotation.y = 0; g.add(c); g.userData.tex = tex; return g; }, f, room, { out: 0.15 });
    if (r) { W.screens = W.screens || []; W.screens.push({ f, tex: r.o.userData.tex }); station(f, r.s.x + Math.sin(r.s.ry) * 0.6, r.s.z + Math.cos(r.s.ry) * 0.6, kind, extra); const ch = await W.prop('house/dining_chair_02.glb', f, r.s.x + Math.sin(r.s.ry) * 0.9, r.s.z + Math.cos(r.s.ry) * 0.9, r.s.ry + Math.PI, { shrink: 0.15 }); } return r; };
  const wallThing = (f, room, kind, make, extra = {}) => { const s = S(f, room); if (!s) return null; const o = make(); const px = s.x - Math.sin(s.ry) * 0.62, pz = s.z - Math.cos(s.ry) * 0.62; put(o, f, px, pz, s.ry, 0); station(f, s.x, s.z, kind, { r: 1.6, obj: o, ...extra }); return { o, s }; };
  const button = (col, label) => () => { const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(0.26, 0.34, 0.05), STD(0x2b2f33, 0.5, 0.5), 0, 1.35, 0)); const b = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 20), STD(col, 0.35, 0, { emissive: col, emissiveIntensity: 0.6 }), 0, 1.38, 0.04); b.rotation.x = Math.PI / 2; g.add(b);
    const tx = canvasTex(128, 32, (c) => { c.fillStyle = '#ddd'; c.fillRect(0, 0, 128, 32); c.fillStyle = '#111'; c.font = 'bold 18px sans-serif'; c.fillText(label, 6, 23); }); g.add(mesh(new THREE.PlaneGeometry(0.24, 0.06), STD(0xffffff, 0.8, 0, { map: tx }), 0, 1.24, 0.026)); g.userData.btn = b; return g; };

  // ---------------- the specimen tube in the middle of the specimen lab
  const [tx, tz] = center(0, 'T');
  { const rusty = await material('rusty_metal_02', 1, { color: 0x8a8f93 }); const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.45, 32), rusty, 0, 0.225)); g.add(mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.35, 32), rusty, 0, WH - 0.55)); g.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 16), rusty, 0, WH - 0.18));
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, WH - 0.8, 8), rusty, Math.cos(a) * 0.9, WH / 2 - 0.05, Math.sin(a) * 0.9)); }
    const glass = mesh(new THREE.CylinderGeometry(0.85, 0.85, WH - 1.25, 32, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xcfe8ff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1 }), 0, 0.45 + (WH - 1.25) / 2); glass.userData.glass = true; glass.renderOrder = 5; g.add(glass);
    const crack = mesh(new THREE.CylinderGeometry(0.86, 0.86, WH - 1.25, 32, 1, true, -0.6, 1.2), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (c) => { c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2; for (let k = 0; k < 9; k++) { c.beginPath(); let x = 128, y = 128; c.moveTo(x, y); for (let s = 0; s < 6; s++) { x += (Math.random() - 0.5) * 70; y += (Math.random() - 0.5) * 70; c.lineTo(x, y); } c.stroke(); } }), transparent: true, depthWrite: false, opacity: 0 }), 0, 0.45 + (WH - 1.25) / 2); crack.userData.glass = true; crack.visible = false; g.add(crack);
    const liquid = mesh(new THREE.CylinderGeometry(0.8, 0.8, WH - 1.35, 32, 1, true), STD(0x1aff7a, 0.1, 0, { emissive: 0x0bff5a, emissiveIntensity: 0.22, transparent: true, opacity: 0.26, depthWrite: false, side: THREE.DoubleSide }), 0, 0.45 + (WH - 1.35) / 2); liquid.renderOrder = 4; g.add(liquid);
    put(g, 0, tx, tz); W.addBox(0, tx, tz, 1.8, 1.8, WH); const light = new THREE.PointLight(0x2cff88, 2.2, 7, 1.6); light.position.set(tx, 1.7, tz); W.groups[0].add(light);
    state.tube = { x: tx, z: tz, pod: g, liquid, red: liquid, light, crack, broken: false }; }
  // the empty side tubes and the lab machines
  for (let i = 0; i < 3; i++) await custom(async () => { const r = await material('rusty_metal_02', 1, { color: 0x8a8f93 }); const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.3, 24), r, 0, 0.15)); g.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.25, 24), r, 0, 2.4));
    g.add(mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.0, 24, 1, true), STD(0xcfe8ff, 0.05, 0, { transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide }), 0, 1.3)); g.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.5, 24, 1, true), STD(0x1a5a3a, 0.1, 0, { emissive: 0x0a3a20, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }), 0, 0.55)); return g; }, 0, 'T', { out: 0.25 });
  await computer(0, 'T', ['SPECIMEN 8 · VITALS', 'HEART  31 bpm', 'TEMP   22.1 C', 'SEDATION  FAILING', '!! CONTAINMENT 64% !!'], 'computer', { mail: 'tube' });
  await onSlot('house/steel_frame_shelves_03.glb', 0, 'T'); await onSlot('street/metal_tool_chest.glb', 0, 'T');
  // wake room (storage): where you wake beside your friend
  await onSlot('house/sofa_linen.glb', 0, 'K', { out: 0.2 }); await onSlot('street/wooden_crate_01.glb', 0, 'K'); await onSlot('street/cardboard_box_01.glb', 0, 'K'); await onSlot('street/Barrel_01.glb', 0, 'K'); await onSlot('house/steel_frame_shelves_03.glb', 0, 'K');
  // security: the camera monitors puzzle and an intercom
  for (let i = 0; i < 2; i++) await computer(0, 'S', ['CAM 01  HALL A', 'CAM 02  LAB', 'CAM 03  STORAGE', 'CAM 04  LIFT', '> PLAYBACK 10/06/88'], i === 0 ? 'monitors' : 'computer', { mail: 'cams' });
  wallThing(0, 'S', 'intercom', button(0xffaa00, 'INTERCOM')); wallThing(0, 'S', 'switch', button(0xdddddd, 'LIGHTS'), { room: 'S' });
  await onSlot('house/steel_frame_shelves_03.glb', 0, 'S');
  // director office: the safe with the green card, drawers, his computer
  { const r = await custom(async () => { const m = await material('metal_plate', 1, { color: 0x3a4148 }); const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(0.7, 0.9, 0.6), m, 0, 0.45)); g.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 20), STD(0xb0b0b0, 0.3, 1), 0.1, 0.55, 0.31)); g.children[1].rotation.x = Math.PI / 2; g.add(mesh(new THREE.BoxGeometry(0.16, 0.2, 0.02), STD(0x111111, 0.4), -0.15, 0.55, 0.31)); return g; }, 0, 'I', { out: 0.15 }); if (r) station(0, r.s.x + Math.sin(r.s.ry) * 0.5, r.s.z + Math.cos(r.s.ry) * 0.5, 'safe'); }
  { const [cx, cz] = center(0, 'I'); await W.prop('house/desk_wood.glb', 0, cx, cz - 0.4, 0); await W.prop('house/armchair_wood.glb', 0, cx, cz - 1.3, 0, { shrink: 0.15 }); }
  await computer(0, 'I', ['FROM: DIR. HALVORSEN', 'RE: SPECIMEN 8', 'Do NOT wake it.', 'The safe code is on', 'the security cameras.'], 'computer', { mail: 'director' });
  { const r = await onSlot('house/drawer_cabinet.glb', 0, 'I'); if (r) station(0, r.s.x + Math.sin(r.s.ry) * 0.5, r.s.z + Math.cos(r.s.ry) * 0.5, 'drawer'); }
  await onSlot('house/wooden_display_shelves_01.glb', 0, 'I'); await onSlot('house/artwork_canvas.glb', 0, 'I', { y: 1.2, solid: false }); await onSlot('house/plant_small.glb', 0, 'I');
  wallThing(0, 'I', 'switch', button(0xdddddd, 'LIGHTS'), { room: 'I' });
  // chemistry: the scale
  { const r = await custom(() => steelTable(1.6, 0.7), 0, 'X', { out: 0.1 }); if (r) { station(0, r.s.x + Math.sin(r.s.ry) * 0.6, r.s.z + Math.cos(r.s.ry) * 0.6, 'scale'); for (let i = 0; i < 5; i++) { const b = ITEM_MAKERS.bottle(); b.scale.setScalar(1.2); b.position.set(r.s.x + Math.cos(r.s.ry) * (i - 2) * 0.26, 0.93, r.s.z - Math.sin(r.s.ry) * (i - 2) * 0.26); W.groups[0].add(b); } } }
  await onSlot('house/steel_frame_shelves_03.glb', 0, 'X'); await onSlot('street/korean_fire_extinguisher_01.glb', 0, 'X'); await onSlot('street/propane_tank.glb', 0, 'X');
  { const r = await onSlot('house/drawer_cabinet.glb', 0, 'X'); if (r) station(0, r.s.x + Math.sin(r.s.ry) * 0.5, r.s.z + Math.cos(r.s.ry) * 0.5, 'drawer'); }
  // cafeteria
  { const [cx, cz] = center(0, 'Y'); for (const dz of [-2.6, 0, 2.6]) { await W.prop('house/dining_table.glb', 0, cx, cz + dz, Math.PI / 2); for (const s of [-1, 1]) await W.prop('house/dining_chair_fabric.glb', 0, cx + s * 0.75, cz + dz, s > 0 ? -Math.PI / 2 : Math.PI / 2, { shrink: 0.15 }); } }
  await onSlot('house/bar_stool.glb', 0, 'Y', { shrink: 0.15 }); await onSlot('street/metal_trash_can.glb', 0, 'Y'); await custom(async () => { const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(0.9, 1.85, 0.75), STD(0x8a1d1d, 0.45, 0.3), 0, 0.925)); g.add(mesh(new THREE.PlaneGeometry(0.6, 1.1), STD(0x111111, 0.1, 0, { emissive: 0x334455, emissiveIntensity: 0.4 }), -0.08, 1.15, 0.38)); return g; }, 0, 'Y', { out: 0.05 });
  // clinic
  for (let i = 0; i < 3; i++) await onSlot('house/bed_single.glb', 0, 'C', { out: 0.4 });
  await onSlot('house/basin.glb', 0, 'C'); await onSlot('street/medical_box.glb', 0, 'C', { y: 0 });
  { const r = await onSlot('house/drawer_cabinet.glb', 0, 'C'); if (r) station(0, r.s.x + Math.sin(r.s.ry) * 0.5, r.s.z + Math.cos(r.s.ry) * 0.5, 'drawer'); }
  // morgue: covered bodies on steel tables and a wall of cold drawers
  { const [cx, cz] = center(0, 'M'); for (const [dx, dz] of [[-1.6, -1.4], [1.6, -1.4], [0, 1.6]]) { const tb = await steelTable(2.0, 0.85); put(tb, 0, cx + dx, cz + dz, Math.PI / 2); solid(tb, 0); const sh = sheet(); sh.position.set(cx + dx, 0.93, cz + dz); sh.rotation.z = Math.PI / 2; W.groups[0].add(sh); } }
  for (let i = 0; i < 2; i++) await custom(async () => { const m = await material('metal_plate', 1, { color: 0xaab2b8 }); const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(2.2, 2.2, 0.7), m, 0, 1.1)); for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { g.add(mesh(new THREE.BoxGeometry(0.62, 0.55, 0.02), STD(0x9aa2a8, 0.35, 0.8), -0.72 + a * 0.72, 0.45 + b * 0.68, 0.36)); g.add(mesh(new THREE.BoxGeometry(0.2, 0.03, 0.04), STD(0x555555, 0.3, 1), -0.72 + a * 0.72, 0.6 + b * 0.68, 0.38)); } return g; }, 0, 'M', { out: 0.1 });
  // offices
  for (let i = 0; i < 2; i++) await computer(0, 'O', ['MEMO 10/06/88', 'Night shift: 4 staff', 'Lift needs GREEN card', 'B1 power is DOWN.', 'Fuses in storage.'], 'computer', { mail: 'office' });
  for (let i = 0; i < 2; i++) { const r = await onSlot('house/drawer_cabinet.glb', 0, 'O'); if (r) station(0, r.s.x + Math.sin(r.s.ry) * 0.5, r.s.z + Math.cos(r.s.ry) * 0.5, 'drawer'); }
  await onSlot('house/steel_frame_shelves_03.glb', 0, 'O'); wallThing(0, 'O', 'switch', button(0xdddddd, 'LIGHTS'), { room: 'O' });
  // bathrooms
  await onSlot('house/wc.glb', 0, 'B'); await onSlot('house/wc.glb', 0, 'B'); await onSlot('house/basin.glb', 0, 'B'); await onSlot('house/mirror_wall.glb', 0, 'B', { y: 1.2, solid: false }); await onSlot('house/shower_900.glb', 0, 'B');

  // ---------------- B1
  for (const n of ['street/pallet_a01.glb', 'street/wooden_military_crate.glb', 'street/old_military_crate.glb', 'house/steel_frame_shelves_03.glb', 'street/Barrel_01.glb', 'street/barrel_03.glb', 'street/plastic_crate_01.glb', 'street/cement_bag.glb', 'street/box_cardboard_a01.glb']) await onSlot(n, 1, 'W');
  { const r = await onSlot('house/drawer_cabinet.glb', 1, 'W'); if (r) station(1, r.s.x + Math.sin(r.s.ry) * 0.5, r.s.z + Math.cos(r.s.ry) * 0.5, 'drawer'); }
  // servers: tall racks with blinking lights and a camera terminal
  W.leds = []; for (let i = 0; i < 4; i++) await custom(async () => { const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(0.75, 2.1, 0.9), STD(0x15181b, 0.5, 0.6), 0, 1.05)); for (let k = 0; k < 14; k++) { const l = mesh(new THREE.BoxGeometry(0.03, 0.02, 0.01), new THREE.MeshBasicMaterial({ color: k % 3 ? 0x2aff6a : 0xffaa20 }), -0.25 + (k % 4) * 0.12, 0.3 + k * 0.12, 0.456); g.add(l); W.leds.push(l); } return g; }, 1, 'V', { out: 0.1 });
  await computer(1, 'V', ['SERVER B1 · ONLINE', 'CAMERA GRID: 12', 'MOTION: B1-WAREHOUSE', 'MOTION: B2-TUNNEL', '> VIEW LIVE'], 'computer', { mail: 'cams' });
  // specimen storage: empty capsules
  for (let i = 0; i < 3; i++) await custom(async () => { const r = await material('rusty_metal_02', 1); const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.3, 24), r, 0, 0.15)); g.add(mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.0, 24, 1, true), STD(0xcfe8ff, 0.05, 0, { transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }), 0, 1.3)); g.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.25, 24), r, 0, 2.4)); return g; }, 1, 'K', { out: 0.2 });
  // pumps: valves station and pipes
  { const r = await custom(async () => { const m = await material('rusty_metal_02', 1); const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(1.6, 1.2, 0.3), m, 0, 0.9)); for (let i = 0; i < 4; i++) { const w = mesh(new THREE.TorusGeometry(0.11, 0.02, 8, 20), STD(0xb02020, 0.5, 0.4), -0.6 + i * 0.4, 1.1, 0.22); g.add(w); } g.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 12), m, 0, 1.6, -0.1)); g.children[g.children.length - 1].rotation.z = Math.PI / 2; return g; }, 1, 'P', { out: 0.05 }); if (r) station(1, r.s.x + Math.sin(r.s.ry) * 0.6, r.s.z + Math.cos(r.s.ry) * 0.6, 'valves'); }
  await onSlot('street/portable_generator.glb', 1, 'P'); await onSlot('street/metal_jerrycan.glb', 1, 'P');
  // medical storage
  for (let i = 0; i < 3; i++) await onSlot('house/steel_frame_shelves_03.glb', 1, 'L'); await onSlot('street/medical_box.glb', 1, 'L');
  { const r = await onSlot('house/drawer_cabinet.glb', 1, 'L'); if (r) station(1, r.s.x + Math.sin(r.s.ry) * 0.5, r.s.z + Math.cos(r.s.ry) * 0.5, 'drawer'); }
  // archive: the tape player and the maintenance chart
  { const r = await custom(async () => { const g = await steelTable(1.0, 0.6); const tp = new THREE.Group(); tp.add(mesh(new THREE.BoxGeometry(0.42, 0.14, 0.26), STD(0x2a2a2a, 0.5, 0.3), 0, 0.07)); for (const x of [-0.1, 0.1]) { const rl = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.01, 20), STD(0xdddddd, 0.4), x, 0.145, 0); tp.add(rl); } tp.position.y = 0.925; g.add(tp); return g; }, 1, 'A', { out: 0.1 }); if (r) station(1, r.s.x + Math.sin(r.s.ry) * 0.6, r.s.z + Math.cos(r.s.ry) * 0.6, 'tape'); }
  { const r = await onSlot('house/wooden_display_shelves_01.glb', 1, 'A'); if (r) station(1, r.s.x + Math.sin(r.s.ry) * 0.6, r.s.z + Math.cos(r.s.ry) * 0.6, 'poster'); }
  await onSlot('house/steel_frame_shelves_03.glb', 1, 'A'); await onSlot('street/cardboard_box_01.glb', 1, 'A');
  // generator room
  { const r = await custom(async () => { const m = await material('metal_plate', 1, { color: 0x4d5a3a }); const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(2.2, 1.6, 1.1), m, 0, 0.8)); g.add(mesh(new THREE.BoxGeometry(0.7, 0.5, 0.05), STD(0x222222, 0.5), 0.5, 1.1, 0.56)); for (let i = 0; i < 3; i++) g.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16), STD([0xff3b30, 0xffcc00, 0x2f7dff][i], 0.5), 0.3 + i * 0.2, 1.1, 0.59)); g.children.slice(-3).forEach((c) => (c.rotation.x = Math.PI / 2)); return g; }, 1, 'G', { out: 0.1 }); if (r) station(1, r.s.x + Math.sin(r.s.ry) * 0.9, r.s.z + Math.cos(r.s.ry) * 0.9, 'generator'); }
  await onSlot('street/propane_tank.glb', 1, 'G'); await onSlot('street/exterior_aircon_unit.glb', 1, 'G'); await onSlot('street/utility_box_02.glb', 1, 'G');
  // decontamination showers wash your scent off (the dog loses you)
  await onSlot('house/shower_1200.glb', 1, 'D'); await onSlot('house/shower_screen.glb', 1, 'D', { solid: false }); await onSlot('house/towel_stack.glb', 1, 'D');
  { const s = S(1, 'D'); if (s) { put(button(0x2fd0ff, 'DECON')(), 1, s.x - Math.sin(s.ry) * 0.62, s.z - Math.cos(s.ry) * 0.62, s.ry); station(1, s.x, s.z, 'decon'); } }

  // ---------------- B2
  // containment: empty pods, and one broken open from the inside
  for (let i = 0; i < 4; i++) { const r = await custom(async () => { const m = await material('rusty_metal_02', 1); const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.6, 0.65, 0.3, 24), m, 0, 0.15)); g.add(mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.3, 24), m, 0, 2.6));
      if (i === 0) { for (let k = 0; k < 7; k++) { const sh = mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.4 + Math.random() * 0.5, 8, 1, true, k * 0.9, 0.35), STD(0xcfe8ff, 0.05, 0, { transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }), 0, 0.5 + Math.random() * 0.3); sh.position.x = Math.sin(k) * 0.05; g.add(sh); } for (let k = 0; k < 14; k++) { const s2 = mesh(new THREE.BoxGeometry(0.08 + Math.random() * 0.1, 0.005, 0.06), STD(0xcfe8ff, 0.05, 0, { transparent: true, opacity: 0.35 }), Math.cos(k * 2.1) * (0.8 + Math.random() * 1.2), 0.01, Math.sin(k * 2.1) * (0.8 + Math.random() * 1.2)); s2.rotation.y = k; g.add(s2); } g.userData.broken = true; }
      else g.add(mesh(new THREE.CylinderGeometry(0.56, 0.56, 2.1, 24, 1, true), STD(0xcfe8ff, 0.05, 0, { transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide }), 0, 1.4)); return g; }, 2, 'Z', { out: 0.3 });
    if (r && r.o.userData.broken) { state.brokenPod = { f: 2, x: r.s.x, z: r.s.z }; } }
  // autopsy / quarantine
  { const [cx, cz] = center(2, 'U'); const tb = await steelTable(2.0, 0.85); put(tb, 2, cx, cz, 0); solid(tb, 2); const sh = sheet(); sh.position.set(cx, 0.93, cz); W.groups[2].add(sh); }
  await onSlot('house/steel_frame_shelves_03.glb', 2, 'U'); await onSlot('street/medical_box.glb', 2, 'U');
  // control room: wire panel
  { const r = await computer(2, 'Q', ['EMERGENCY TUNNEL', 'STATUS: SEALED', 'WIRE PANEL FAULT', 'RESET REQUIRED', '> EXIT CODE: ????'], 'wires'); }
  await computer(2, 'Q', ['FROM: SECURITY', '10/06/88 03:12', 'It opened its tube.', 'Sealing the lab.', 'God help the staff.'], 'computer', { mail: 'last' });
  wallThing(2, 'Q', 'intercom', button(0xffaa00, 'INTERCOM'));
  // records
  for (let i = 0; i < 3; i++) await onSlot('house/steel_frame_shelves_03.glb', 2, 'R'); for (let i = 0; i < 2; i++) { const r = await onSlot('house/drawer_cabinet.glb', 2, 'R'); if (r) station(2, r.s.x + Math.sin(r.s.ry) * 0.5, r.s.z + Math.cos(r.s.ry) * 0.5, 'drawer'); }
  // tunnel: the bomb console and the way out
  { const [x0, z0] = cellCenter(12, 9); const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(0.6, 1.1, 0.5), STD(0x3a3f45, 0.5, 0.6), 0, 0.55)); const scr = mesh(new THREE.PlaneGeometry(0.4, 0.22), new THREE.MeshBasicMaterial({ map: screenTex(['DEMOLITION', 'CHARGE', 'ARMED: NO'], '#ff5a3a') }), 0, 0.95, 0.26); g.add(scr); g.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.0, 16), STD(0x6b1f1f, 0.6, 0.3), 0.6, 0.5, -0.3));
    put(g, 2, x0, z0 + 1.4, Math.PI); W.addBox(2, x0, z0 + 1.4, 1.4, 0.8); state.bombAt = { x: x0, z: z0 + 1.4, screen: scr }; station(2, x0, z0 + 0.5, 'bomb'); }
  for (const x of [14, 16, 18]) { const [bx, bz] = cellCenter(x, 9); await W.prop('street/Barrel_01.glb', 2, bx, bz + 1.5, 0); }
  { const [ex, ez] = cellCenter(19, 9); state.tunnelEnd = [ex, ez]; const door = mesh(new THREE.BoxGeometry(0.2, 3, 3.4), await material('rusty_metal_02', 1), ex + 1.85, 1.5, ez); W.groups[2].add(door); state.outDoor = door; const sl = new THREE.PointLight(0xffffff, 0, 8); sl.position.set(ex + 1.2, 2.5, ez); W.groups[2].add(sl); state.outLight = sl; }

  // ---------------- elevators: a lift cab with a button panel on each floor
  for (let f = 0; f < 3; f++) { const [cx, cz] = center(f, 'E'); state.elev[f] = [cx, cz];
    const panel = button(0x66aaff, 'LIFT')(); put(panel, f, cx, cz - C + 0.32, 0); station(f, cx, cz - 0.4, 'elevator', { r: 2.2 });
    const lamp = glow(0x66aaff, 0.6); lamp.position.set(cx, WH - 0.2, cz); W.groups[f].add(lamp); }

  // ---------------- halls: hiding lockers, alarm buttons, wall maps, light switches
  const lockerRooms = [[0, 'H'], [0, 'H'], [0, 'H'], [0, 'H'], [0, 'T'], [0, 'C'], [0, 'K'], [1, 'H'], [1, 'H'], [1, 'H'], [1, 'W'], [1, 'K'], [1, 'L'], [2, 'H'], [2, 'H'], [2, 'H'], [2, 'H'], [2, 'Z'], [2, 'R']];
  for (const [f, room] of lockerRooms) { const s = S(f, room); if (!s) continue; const o = await locker(); put(o, f, s.x - Math.sin(s.ry) * 0.3, s.z - Math.cos(s.ry) * 0.3, s.ry); solid(o, f, 0.05);
    const L = { kind: 'locker', f, x: s.x, z: s.z, ry: s.ry, r: 1.5, obj: o, id: 'l' + W.lockers.length }; W.lockers.push(L); W.inter.push(L); }
  for (const f of [0, 1, 2]) { wallThing(f, 'H', 'alarm', button(0xff2020, 'ALARM'));
    for (let i = 0; i < 2; i++) { const s = S(f, 'H'); if (!s) continue; const px = s.x - Math.sin(s.ry) * 0.63, pz = s.z - Math.cos(s.ry) * 0.63; const tex = new THREE.CanvasTexture(mapCanvas(f, [px, pz])); tex.colorSpace = THREE.SRGBColorSpace;
      const m = mesh(new THREE.PlaneGeometry(0.9, 0.73), STD(0xffffff, 0.7, 0, { map: tex }), 0, 0, 0); put(m, f, px, pz, s.ry); m.position.y = 1.55; station(f, s.x, s.z, 'map', { here: [px, pz] }); } }
  wallThing(0, 'H', 'switch', button(0xdddddd, 'LIGHTS'), { room: 'H' }); wallThing(1, 'H', 'switch', button(0xdddddd, 'LIGHTS'), { room: 'H' });
  // wings: a painted stripe on every hall floor in the wing's colour, and hanging signs at the borders
  for (let f = 0; f < 3; f++) { const M = MAPS[f];
    M.forEach((r, z) => [...r].forEach((c, x) => { if (c !== 'H') return; const sec = sectionAt(f, x); const [cx, cz] = cellCenter(x, z);
      const st = new THREE.Mesh(new THREE.PlaneGeometry(0.22, C), new THREE.MeshStandardMaterial({ color: sec.col, roughness: 0.8 })); st.rotation.x = -Math.PI / 2; const horiz = (r[x - 1] === 'H' || r[x + 1] === 'H') && !((M[z - 1] || '')[x] === 'H' || (M[z + 1] || '')[x] === 'H'); st.rotation.z = horiz ? Math.PI / 2 : 0; st.position.set(cx, 0.012, cz); W.groups[f].add(st);
      if (r[x + 1] === 'H' && sectionAt(f, x + 1).id !== sec.id) for (const [sx, s2] of [[cx + C / 2 - 0.05, sectionAt(f, x + 1)], [cx + C / 2 + 0.05, sec]]) { const tx = canvasTex(512, 128, (g) => { g.fillStyle = '#d9d4c4'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#' + s2.col.toString(16).padStart(6, '0'); g.fillRect(0, 0, 110, 128); g.fillStyle = '#fff'; g.font = 'bold 84px sans-serif'; g.fillText(s2.id, 26, 96); g.fillStyle = '#111'; g.font = 'bold 40px sans-serif'; g.fillText(s2.name, 130, 60); g.font = '26px sans-serif'; g.fillText('SECTION ' + s2.id + ' · LEVEL ' + ['G', 'B1', 'B2'][f], 130, 100); });
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.7 })); sign.position.set(sx, WH - 0.55, cz); sign.rotation.y = sx > cx + C / 2 ? Math.PI / 2 : -Math.PI / 2; W.groups[f].add(sign);
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.04), STD(0x333333, 0.5, 0.8)); bar.position.set(cx + C / 2, WH - 0.18, cz); W.groups[f].add(bar); } })); }
  // filler props so halls never feel empty
  for (const [f, n] of [[0, 4], [1, 4], [2, 5]]) for (let i = 0; i < n; i++) await onSlot(['street/Barrel_01.glb', 'street/cardboard_box_01.glb', 'street/korean_fire_extinguisher_01.glb', 'street/metal_trash_can.glb', 'street/wooden_crate_02.glb', 'street/old_tyre.glb', 'street/pallet_b01.glb'][(rand() * 7) | 0], f, 'H');
}

// workers who never left: covered with sheets, or lying face down. No injuries are shown.
export async function placeBodies(W, rand, friendId) {
  const out = {}; const [kx, kz] = cellCenter(1, 2);
  const friend = await lyingBody(friendId); friend.position.set(kx + 0.3, 0, kz - 0.2); friend.rotation.y = 0.4; W.groups[0].add(friend); out.friend = friend; W.addBox(0, friend.position.x, friend.position.z, 1.1, 1.1, 0.4);
  const w1 = await lyingBody('Medical_Male_01', true); const [hx, hz] = cellCenter(1, 6); w1.position.set(hx, 0, hz); w1.rotation.y = 2.1; W.groups[0].add(w1); W.addBox(0, hx, hz, 1.1, 1.1, 0.4);
  const w2 = await lyingBody('Construction_Male_01'); const [bx, bz] = cellCenter(9, 9); w2.position.set(bx, -0.0, bz); w2.rotation.y = -0.6; W.groups[1].add(w2); W.addBox(1, bx, bz, 1.1, 1.1, 0.4);
  for (const [f, x, z] of [[1, 3, 9], [2, 5, 7], [0, 12, 8]]) { const s = sheet(); const [sx, sz] = cellCenter(x, z); s.position.set(sx, 0.0, sz); s.rotation.z = rand() * 3; W.groups[f].add(s); W.addBox(f, sx, sz, 1.2, 1.2, 0.4); }
  return out;
}

// item spawns: [type, room "<floor><room>", extra]
export function itemPlan(rand) {
  const pick = (arr) => arr[(rand() * arr.length) | 0]; const plan = [];
  const fuseRooms = ['1W', '1K', '1L', '1V', '0Y', '0C'].sort(() => rand() - 0.5);
  plan.push(['fuse_r', fuseRooms[0]], ['fuse_y', fuseRooms[1]], ['fuse_b', fuseRooms[2]]);
  plan.push(['screwdriver', pick(['1W', '1L', '0X'])], ['note', '0M', 2], ['note', pick(['1K', '1W', '1L']), 3], ['red', '2U'], ['tape', pick(['2R', '2Z', '2H'])]);
  plan.push(['lighter', '0K'], ['adrenaline', pick(['0C', '1L'])], ['adrenaline', pick(['2U', '2R'])], ['trap', pick(['0Y', '0O'])], ['trap', pick(['1W', '1A'])]);
  for (let i = 0; i < 4; i++) plan.push(['battery', pick(['0H', '0O', '0S', '1H', '1W', '2H', '2Q'])]);
  for (let i = 0; i < 5; i++) plan.push(['bottle', pick(['0T', '0X', '0Y', '1W', '1K', '2H', '2Z'])]);
  return plan;
}
export async function spawnItems(W, plan, rand, items) {
  for (const [type, fr, extra] of plan) { const f = +fr[0], room = fr[1]; const s = W.slot(f, room, rand); if (!s) continue;
    items.push(await makeItem(W, type, f, s.x - Math.sin(s.ry) * 0.25, s.z - Math.cos(s.ry) * 0.25, 'i' + items.length, extra)); }
}
export async function makeItem(W, type, f, x, z, id, extra) {
  const [kind, col] = ITEM_DEF[type]; const o = ITEM_MAKERS[kind](col); o.scale.multiplyScalar(1.3);
  const g = new THREE.Group(); g.add(o); const gl = glow(col, 0.55); gl.position.y = 0.2; g.add(gl); g.position.set(x, 0, z); W.groups[f].add(g);
  const it = { kind: 'item', type, f, x, z, r: 1.4, obj: g, id, extra, taken: false }; W.inter.push(it); return it;
}
