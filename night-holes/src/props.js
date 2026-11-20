// Section dressing: each room gets the things that belong in it (microscopes and syringes in the analysis lab, rows of
// specimen tubes in the tube lab, IV stands in the clinic, body bags in the morgue, cells in containment...).
// Small objects are built in code from real materials; a few hospital pieces are CC BY models (see CREDITS.md).
import * as THREE from 'three';
import { inst } from './assets.js';
import { cellCenter, C, WH, MAPS, material, boxGeo } from './world.js';
import { canvasTex } from './level.js';

const STD = (color, rough = 0.6, metal = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
const GLASS = () => new THREE.MeshStandardMaterial({ color: 0xcfe8ff, roughness: 0.05, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }

// ---------------- small lab objects
export function microscope() { const g = new THREE.Group(), d = STD(0x2a2d31, 0.4, 0.6), w = STD(0xe8e6e0, 0.5);
  g.add(mesh(new THREE.BoxGeometry(0.18, 0.03, 0.22), w, 0, 0.015)); g.add(mesh(new THREE.BoxGeometry(0.04, 0.26, 0.05), w, 0, 0.15, -0.08)); const arm = mesh(new THREE.BoxGeometry(0.05, 0.05, 0.16), w, 0, 0.27, -0.02); g.add(arm);
  const tube = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 12), d, 0, 0.33, 0.04); tube.rotation.x = -0.5; g.add(tube); g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 12), d, 0, 0.21, 0.04)); g.add(mesh(new THREE.BoxGeometry(0.12, 0.012, 0.1), d, 0, 0.13, 0.04)); return g; }
export function tubeRack(n = 6) { const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(0.06 * n, 0.012, 0.07), STD(0xd8d4c8, 0.5), 0, 0.06)); g.add(mesh(new THREE.BoxGeometry(0.06 * n, 0.012, 0.07), STD(0xd8d4c8, 0.5), 0, 0.005));
  const cols = [0x6ab0ff, 0xff8a5a, 0x7dff9a, 0xf2e26a, 0xc87bff, 0xeeeeee];
  for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 0.06; g.add(mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.13, 10), GLASS(), x, 0.07)); if (Math.random() < 0.8) g.add(mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.06 + Math.random() * 0.04, 10), STD(cols[i % 6], 0.3, 0, { transparent: true, opacity: 0.8, emissive: cols[i % 6], emissiveIntensity: 0.15 }), x, 0.04)); } return g; }
export function syringeTray() { const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(0.34, 0.015, 0.22), STD(0xb8bec4, 0.3, 0.8), 0, 0.008));
  for (let i = 0; i < 4; i++) { const s = new THREE.Group(); s.add(mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.1, 8), STD(0xf4f4f4, 0.2, 0, { transparent: true, opacity: 0.85 }))); s.add(mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.05, 6), STD(0xcccccc, 0.2, 1), 0, 0.075)); s.add(mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.008, 8), STD(0xff7a00, 0.4), 0, -0.05));
    s.rotation.z = Math.PI / 2; s.rotation.y = (Math.random() - 0.5) * 0.4; s.position.set(-0.08 + i * 0.05, 0.025, (Math.random() - 0.5) * 0.08); g.add(s); }
  for (let i = 0; i < 3; i++) g.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.035, 8), STD(0xdde8ff, 0.1, 0, { transparent: true, opacity: 0.7 }), 0.1, 0.025, -0.06 + i * 0.03)); return g; }
export function petri(n = 5) { const g = new THREE.Group(); for (let i = 0; i < n; i++) { const p = new THREE.Group(); p.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 20), GLASS())); p.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.004, 20), STD([0xd8c060, 0x9fd070, 0xe0a0a0][i % 3], 0.8), 0, -0.002)); p.position.set((i % 3) * 0.1, 0.006 + Math.floor(i / 3) * 0.013, Math.floor(i / 3) * 0.02); g.add(p); } return g; }
export function centrifuge() { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.2, 24), STD(0xdedbd2, 0.45), 0, 0.1)); g.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 24), STD(0x6a7a88, 0.2, 0.3, { transparent: true, opacity: 0.6 }), 0, 0.205)); g.add(mesh(new THREE.BoxGeometry(0.1, 0.04, 0.01), STD(0x111111, 0.3, 0, { emissive: 0x30ff60, emissiveIntensity: 0.4 }), 0, 0.12, 0.185)); return g; }
export function sampleFridge() { const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(0.8, 1.9, 0.7), STD(0xe9ebec, 0.35, 0.2), 0, 0.95)); g.add(mesh(new THREE.PlaneGeometry(0.66, 1.6), GLASS(), 0, 0.97, 0.352));
  for (let r = 0; r < 4; r++) { g.add(mesh(new THREE.BoxGeometry(0.7, 0.015, 0.6), STD(0xcfd5d9, 0.3, 0.6), 0, 0.35 + r * 0.38)); for (let i = 0; i < 6; i++) g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.12 + Math.random() * 0.06, 10), STD([0x9fd070, 0xd8c060, 0x80b0ff, 0xc8c8c8][(i + r) % 4], 0.3, 0, { transparent: true, opacity: 0.85 }), -0.28 + i * 0.11, 0.42 + r * 0.38, 0.05)); }
  const l = mesh(new THREE.BoxGeometry(0.7, 0.03, 0.02), STD(0x000000, 0.3, 0, { emissive: 0xbfe8ff, emissiveIntensity: 0.8 }), 0, 1.86, 0.33); g.add(l); return g; }
export function heartMonitor() { const g = new THREE.Group(); const tex = canvasTex(128, 96, (c) => { c.fillStyle = '#021006'; c.fillRect(0, 0, 128, 96); c.strokeStyle = '#3cff6a'; c.lineWidth = 2; c.beginPath(); for (let x = 0; x < 128; x++) { const y = 50 - (x % 40 > 18 && x % 40 < 24 ? (x % 40 === 20 ? 30 : -12) : 0); x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); c.fillStyle = '#3cff6a'; c.font = '14px monospace'; c.fillText('HR --', 6, 88); });
  g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8), STD(0x9aa0a6, 0.3, 0.9), 0, 0.6)); g.add(mesh(new THREE.BoxGeometry(0.34, 0.26, 0.16), STD(0x2a2d31, 0.5, 0.2), 0, 1.3)); g.add(mesh(new THREE.PlaneGeometry(0.28, 0.2), new THREE.MeshBasicMaterial({ map: tex }), 0, 1.3, 0.081)); g.add(mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.03, 5), STD(0x55595e, 0.4, 0.8), 0, 0.03)); return g; }
export function oxygenTanks(n = 3) { const g = new THREE.Group(); for (let i = 0; i < n; i++) { g.add(mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.2, 16), STD(0x2f8a4a, 0.4, 0.4), (i - (n - 1) / 2) * 0.25, 0.6)); g.add(mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.12, 10), STD(0xb8bcc0, 0.25, 1), (i - (n - 1) / 2) * 0.25, 1.25)); } return g; }
export function medShelf() { const g = new THREE.Group(), m = STD(0xc8ccd0, 0.35, 0.7); for (let r = 0; r < 5; r++) g.add(mesh(new THREE.BoxGeometry(1.4, 0.025, 0.4), m, 0, 0.1 + r * 0.42)); for (const x of [-0.69, 0.69]) g.add(mesh(new THREE.BoxGeometry(0.03, 1.9, 0.4), m, x, 0.95));
  const cols = [0xf0f0f0, 0x6aa8e0, 0xe06a6a, 0xf0d060, 0x8fd08f]; for (let r = 0; r < 4; r++) for (let i = 0; i < 7; i++) if (Math.random() < 0.8) g.add(mesh(new THREE.BoxGeometry(0.12, 0.14 + Math.random() * 0.1, 0.18), STD(cols[(i * 3 + r) % 5], 0.7), -0.6 + i * 0.19, 0.2 + r * 0.42, (Math.random() - 0.5) * 0.1)); return g; }
export function fileCabinet() { const g = new THREE.Group(), m = STD(0x6b7076, 0.45, 0.6); g.add(mesh(new THREE.BoxGeometry(0.5, 1.35, 0.62), m, 0, 0.675)); for (let i = 0; i < 4; i++) { const d = mesh(new THREE.BoxGeometry(0.46, 0.3, 0.02), STD(0x7d8288, 0.4, 0.6), 0, 0.2 + i * 0.32, 0.32 + (i === 1 ? 0.15 : 0)); g.add(d); g.add(mesh(new THREE.BoxGeometry(0.1, 0.02, 0.03), STD(0xcfcfcf, 0.2, 1), 0, 0.27 + i * 0.32, 0.34 + (i === 1 ? 0.15 : 0))); } return g; }
export function papers(n = 8) { const g = new THREE.Group(); const tex = canvasTex(64, 80, (c) => { c.fillStyle = '#ece6d4'; c.fillRect(0, 0, 64, 80); c.fillStyle = '#555'; for (let i = 0; i < 9; i++) c.fillRect(6, 8 + i * 7, 30 + (i * 17) % 22, 2); });
  for (let i = 0; i < n; i++) { const p = mesh(new THREE.PlaneGeometry(0.21, 0.29), STD(0xffffff, 0.9, 0, { map: tex, side: THREE.DoubleSide }), (Math.random() - 0.5) * 1.6, 0.004 + i * 0.0005, (Math.random() - 0.5) * 1.6); p.rotation.x = -Math.PI / 2; p.rotation.z = Math.random() * 6; p.castShadow = false; g.add(p); } return g; }
export function noticeBoard() { const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(1.2, 0.8, 0.03), STD(0x8a6a44, 0.9), 0, 0)); const cols = ['#f4eed8', '#ffe98a', '#cfe6ff', '#f4eed8'];
  for (let i = 0; i < 7; i++) { const t = canvasTex(64, 80, (c) => { c.fillStyle = cols[i % 4]; c.fillRect(0, 0, 64, 80); c.fillStyle = '#333'; for (let k = 0; k < 6; k++) c.fillRect(6, 10 + k * 9, 40 + (k * 7) % 14, 2); c.fillStyle = '#c00'; c.beginPath(); c.arc(32, 5, 3, 0, 7); c.fill(); });
    const p = mesh(new THREE.PlaneGeometry(0.2, 0.25), STD(0xffffff, 0.9, 0, { map: t }), -0.45 + (i % 4) * 0.3, i < 4 ? 0.18 : -0.17, 0.017); p.rotation.z = (Math.random() - 0.5) * 0.25; g.add(p); } return g; }
export function gunCabinet() { const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(0.9, 1.8, 0.4), STD(0x3a3f45, 0.45, 0.6), 0, 0.9)); const door = mesh(new THREE.BoxGeometry(0.44, 1.7, 0.03), STD(0x464c53, 0.4, 0.6), 0.6, 0.9, 0.35); door.rotation.y = -1.1; g.add(door); for (let i = 0; i < 4; i++) g.add(mesh(new THREE.BoxGeometry(0.03, 0.1, 0.03), STD(0x888888, 0.3, 1), -0.3 + i * 0.2, 1.5, 0.1)); return g; }
export function coffeeMachine() { const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(0.4, 0.5, 0.36), STD(0x1c1c1e, 0.35, 0.4), 0, 0.25)); g.add(mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.16, 16), GLASS(), 0, 0.12, 0.12)); g.add(mesh(new THREE.BoxGeometry(0.06, 0.03, 0.01), STD(0x000000, 0.3, 0, { emissive: 0xff3020, emissiveIntensity: 0.6 }), 0.1, 0.4, 0.181)); return g; }
export function tray() { const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(0.42, 0.015, 0.3), STD(0x8a5a3a, 0.6), 0, 0.008)); g.add(mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.02, 20), STD(0xf2f2f2, 0.3), -0.08, 0.025)); g.add(mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.09, 14), STD(0xf2f2f2, 0.3), 0.1, 0.06, 0.05)); return g; }
export function fusePanel() { const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(0.7, 0.9, 0.15), STD(0x9aa0a6, 0.45, 0.6), 0, 1.4)); for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) g.add(mesh(new THREE.BoxGeometry(0.06, 0.12, 0.03), STD(i % 3 ? 0x222222 : 0xd0a020, 0.5), -0.25 + i * 0.1, 1.15 + r * 0.17, 0.08));
  const warn = canvasTex(128, 64, (c) => { c.fillStyle = '#f0c020'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#111'; c.font = 'bold 20px sans-serif'; c.fillText('DANGER', 22, 28); c.font = '13px sans-serif'; c.fillText('HIGH VOLTAGE', 20, 50); }); g.add(mesh(new THREE.PlaneGeometry(0.3, 0.15), STD(0xffffff, 0.7, 0, { map: warn }), 0, 1.95, 0.08)); return g; }
export function cables(len = 3) { const g = new THREE.Group(); for (let i = 0; i < 4; i++) { const pts = []; for (let k = 0; k <= 6; k++) pts.push(new THREE.Vector3((k / 6 - 0.5) * len, 0.02 + Math.sin(k * 1.7 + i) * 0.02, (i - 1.5) * 0.06 + Math.sin(k + i) * 0.08)); g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.012, 5), STD([0x111111, 0x8a1010, 0x101060, 0x1a1a1a][i], 0.5), 0, 0)); } return g; }
export function controlConsole() { const g = new THREE.Group(); const top = mesh(new THREE.BoxGeometry(2.4, 0.1, 0.8), STD(0x3a3f45, 0.45, 0.4), 0, 0.95); top.rotation.x = -0.25; g.add(top); g.add(mesh(new THREE.BoxGeometry(2.4, 0.9, 0.6), STD(0x2e3237, 0.5, 0.3), 0, 0.45, -0.05));
  for (let i = 0; i < 40; i++) { const col = [0xff3030, 0x30ff60, 0xffc020, 0xeeeeee][i % 4]; const b = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 10), STD(col, 0.4, 0, { emissive: col, emissiveIntensity: Math.random() < 0.4 ? 0.6 : 0.05 }), -1.05 + (i % 20) * 0.11, 1.02 - Math.floor(i / 20) * 0.04, 0.05 + Math.floor(i / 20) * 0.16); b.rotation.x = -0.25; g.add(b); }
  for (let i = 0; i < 3; i++) { const s = mesh(new THREE.BoxGeometry(0.5, 0.38, 0.06), STD(0x1a1c1e, 0.4), -0.8 + i * 0.8, 1.35, -0.25); g.add(s); g.add(mesh(new THREE.PlaneGeometry(0.44, 0.32), STD(0x000000, 0.2, 0, { emissive: 0x2a6a3a, emissiveIntensity: 0.5 }), -0.8 + i * 0.8, 1.35, -0.219)); }
  const mic = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.3, 6), STD(0x222222, 0.4, 0.8), 0.9, 1.15, 0.1); mic.rotation.x = 0.5; g.add(mic); return g; }
// a holding cell: steel frame, glass front, a cot inside
export async function cell() { const g = new THREE.Group(), m = await material('metal_plate', 1, { color: 0x6b7076 });
  for (const x of [-1.2, 1.2]) g.add(mesh(boxGeo(0.1, 2.6, 2, 1), m, x, 1.3, 0)); g.add(mesh(boxGeo(2.5, 0.1, 2, 1), m, 0, 2.6, 0)); g.add(mesh(new THREE.PlaneGeometry(2.3, 2.5), GLASS(), 0, 1.25, 1));
  const cot = mesh(new THREE.BoxGeometry(0.8, 0.12, 1.8), STD(0x4a4e52, 0.7), -0.6, 0.45, -0.1); g.add(cot); g.add(mesh(new THREE.BoxGeometry(0.75, 0.08, 1.7), STD(0x8a8478, 0.95), -0.6, 0.55, -0.1));
  const sc = canvasTex(256, 256, (c) => { c.strokeStyle = 'rgba(40,30,25,.55)'; c.lineWidth = 3; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(60 + i * 25, 40); c.lineTo(50 + i * 26, 220); c.stroke(); } }); g.add(mesh(new THREE.PlaneGeometry(1.2, 1.2), STD(0xffffff, 0.9, 0, { map: sc, transparent: true }), 0.3, 1.3, -0.97)); return g; }
// rows of specimen tubes; most hold a dark shape floating in the liquid
export async function specimenTube(occupied = true) { const g = new THREE.Group(), r = await material('rusty_metal_02', 1, { color: 0x8a8f93 });
  g.add(mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.3, 20), r, 0, 0.15)); g.add(mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.25, 20), r, 0, 2.45)); g.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.0, 20, 1, true), GLASS(), 0, 1.3));
  const liq = mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.9, 20, 1, true), STD(0x1aff7a, 0.1, 0, { emissive: 0x0b8f3a, emissiveIntensity: 0.35, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide }), 0, 1.27); g.add(liq);
  if (occupied) { const s = new THREE.Group(), dm = STD(0x101410, 0.8, 0, { transparent: true, opacity: 0.55 }); s.add(mesh(new THREE.SphereGeometry(0.12, 10, 8), dm, 0, 1.55, 0)); const body = mesh(new THREE.CapsuleGeometry(0.15, 0.45, 4, 8), dm, 0, 1.15, 0); body.rotation.x = 0.4; s.add(body);
    for (const sx of [-1, 1]) { const leg = mesh(new THREE.CapsuleGeometry(0.06, 0.35, 4, 6), dm, sx * 0.08, 0.85, 0.12); leg.rotation.x = -1.1; s.add(leg); const arm = mesh(new THREE.CapsuleGeometry(0.045, 0.3, 4, 6), dm, sx * 0.17, 1.2, 0.05); arm.rotation.z = sx * 0.4; s.add(arm); }
    s.userData.bob = Math.random() * 6; g.add(s); g.userData.shape = s; }
  for (let i = 0; i < 2; i++) { const h = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.2 * (i ? 1 : -1), 2.6, 0), new THREE.Vector3(0.35 * (i ? 1 : -1), 3.0, -0.3), new THREE.Vector3(0.3 * (i ? 1 : -1), WH, -0.6)]), 10, 0.025, 6), STD(0x1a1d20, 0.45)); g.add(h); }
  return g; }
// a body bag (or plastic wrap) lying on a surface; an optional small dried stain
export function bodyBag(kind = 'bag', stain = false) {
  // a flat bag with the shape of a person inside: head, shoulders, chest, hips, legs together, feet
  const geo = new THREE.PlaneGeometry(1.95, 0.72, 60, 22); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) / 0.975, y = p.getY(i) / 0.36, ay = Math.abs(y);
    const width = x < -0.78 ? 0.32 : x < -0.55 ? 0.95 : x < 0.1 ? 0.85 : x < 0.85 ? 0.6 - (x - 0.1) * 0.25 : 0.45; // head, shoulders, torso, legs, feet
    const inside = Math.max(0, 1 - ay / width); const h = x < -0.78 ? 0.11 : x < -0.5 ? 0.15 : x < 0.1 ? 0.13 + Math.exp(-(((x + 0.3) / 0.2) ** 2)) * 0.03 : x < 0.9 ? 0.09 : 0.13;
    const top = h * Math.sqrt(inside) + (x > 0.88 ? Math.exp(-(((ay - 0.25) / 0.12) ** 2)) * 0.04 : 0); const edge = Math.max(0, 1 - Math.abs(x)) ;
    p.setZ(i, 0.015 + top + Math.sin(x * 22 + y * 5) * 0.004 * inside); p.setY(i, p.getY(i) * (0.92 + 0.08 * edge)); }
  geo.computeVertexNormals(); geo.rotateX(-Math.PI / 2);
  const mat = kind === 'plastic' ? STD(0xc8ced2, 0.2, 0, { transparent: true, opacity: 0.88, side: THREE.DoubleSide }) : kind === 'sheet' ? STD(0xb3aea2, 0.95, 0, { side: THREE.DoubleSide }) : STD(0x1b1d1f, 0.55, 0.05, { side: THREE.DoubleSide });
  const g = new THREE.Group(); const b = mesh(geo, mat, 0, 0, 0); g.add(b);
  if (kind === 'bag') { const zip = mesh(new THREE.BoxGeometry(1.7, 0.006, 0.012), STD(0x8a8a8a, 0.35, 1), 0.05, 0.155, 0); g.add(zip); g.add(mesh(new THREE.BoxGeometry(0.05, 0.01, 0.03), STD(0xb0b0b0, 0.3, 1), -0.75, 0.165, 0.01)); }
  if (kind === 'plastic') for (let i = 0; i < 4; i++) g.add(mesh(new THREE.TorusGeometry(0.17, 0.006, 6, 20), STD(0x7a6a4a, 0.8), -0.7 + i * 0.5, 0.08, 0));
  if (stain) g.add(stainDecal(0.2, 0.15, 0.16, 0.05));
  return g; }
// small, dark, dried stains: never fresh, never pools
const stainTex = canvasTex(128, 128, (c) => { c.fillStyle = 'rgba(0,0,0,0)'; c.fillRect(0, 0, 128, 128); for (let i = 0; i < 9; i++) { const r = 8 + Math.random() * 22; c.fillStyle = `rgba(${70 + Math.random() * 25},${12 + Math.random() * 8},${10},${0.35 + Math.random() * 0.3})`; c.beginPath(); c.ellipse(64 + (Math.random() - 0.5) * 40, 64 + (Math.random() - 0.5) * 40, r, r * (0.5 + Math.random() * 0.5), Math.random() * 3, 0, 7); c.fill(); } });
const handTex = canvasTex(128, 160, (c) => { c.fillStyle = 'rgba(80,18,14,.55)'; c.beginPath(); c.ellipse(64, 100, 30, 36, 0, 0, 7); c.fill(); for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(34 + i * 20, 46 - (i === 1 || i === 2 ? 10 : 0), 8, 22, (i - 1.5) * 0.1, 0, 7); c.fill(); } c.beginPath(); c.ellipse(104, 92, 8, 20, -0.8, 0, 7); c.fill(); for (let i = 0; i < 3; i++) c.fillRect(50 + i * 12, 130, 3, 20 + Math.random() * 10); });
export function stainDecal(size = 0.4, x = 0, y = 0.01, z = 0, wall = false) { const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ map: stainTex, transparent: true, depthWrite: false, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }));
  if (!wall) m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * 6; m.position.set(x, y, z); m.renderOrder = 2; return m; }
export function handprint() { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.2), new THREE.MeshStandardMaterial({ map: handTex, transparent: true, depthWrite: false, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 })); m.renderOrder = 2; return m; }
export function railsAndCart(len) { const g = new THREE.Group(), steel = STD(0x6a6e72, 0.35, 0.9), wood = STD(0x4a3a2a, 0.9);
  for (const z of [-0.45, 0.45]) g.add(mesh(new THREE.BoxGeometry(len, 0.06, 0.06), steel, 0, 0.05, z)); for (let x = -len / 2; x < len / 2; x += 0.6) g.add(mesh(new THREE.BoxGeometry(0.14, 0.04, 1.3), wood, x, 0.02, 0));
  const cart = new THREE.Group(); cart.add(mesh(new THREE.BoxGeometry(1.2, 0.6, 0.9), STD(0x5a4a30, 0.6, 0.4), 0, 0.5)); for (const sx of [-0.4, 0.4]) for (const sz of [-0.45, 0.45]) { const w = mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 14), steel, sx, 0.16, sz); w.rotation.x = Math.PI / 2; cart.add(w); } cart.position.x = len / 2 - 2; g.add(cart); return g; }

// place everything per room. helpers come from level.js so items use the same slots and collision as the rest
export async function dressRooms(W, rand, h) {
  const { center, put, solid, custom } = h;
  const onTable = async (f, room, items, w = 1.6) => custom(async () => { const g = await h.steelTable(w, 0.7); items.forEach((it, i) => { const o = it(); o.position.set((i - (items.length - 1) / 2) * (w / items.length), 0.925, (rand() - 0.5) * 0.25); o.rotation.y = rand() * 0.6 - 0.3; g.add(o); }); return g; }, f, room, { out: 0.1 });
  // GROUND: analysis lab: microscopes, racks, syringes, petri dishes, a sample fridge and a centrifuge
  { const r = await onTable(0, 'X', [microscope, tubeRack, syringeTray]); if (r) h.station(0, r.s.x + Math.sin(r.s.ry) * 0.6, r.s.z + Math.cos(r.s.ry) * 0.6, 'mix'); }
  // the incubator: an empty tube with a control box, where a creature can be grown from parts
  { const r = await custom(async () => { const g = await specimenTube(false); g.add(mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), STD(0x3a3f45, 0.5, 0.5), 0.75, 0.35, 0.1)); return g; }, 0, 'X', { out: 0.4 }); if (r) { h.station(0, r.s.x + Math.sin(r.s.ry) * 1.1, r.s.z + Math.cos(r.s.ry) * 1.1, 'grow'); W.incubator = { x: r.s.x + Math.sin(r.s.ry) * 0.4, z: r.s.z + Math.cos(r.s.ry) * 0.4 }; } } await onTable(0, 'X', [petri, centrifuge, () => tubeRack(4)]); await custom(sampleFridge, 0, 'X', { out: 0.05 });
  { const [cx, cz] = center(0, 'X'); const g = await h.steelTable(1.8, 0.8); [microscope, syringeTray, petri].forEach((it, i) => { const o = it(); o.position.set(-0.6 + i * 0.6, 0.925, 0); g.add(o); }); put(g, 0, cx, cz + 0.6, 0); solid(g, 0); }
  // tube lab: two rows of specimen tubes, most occupied
  { const [cx, cz, cells] = center(0, 'T'); const xs = cells.map((c) => c[0]), zs = cells.map((c) => c[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
    W.specimens = []; for (const z of [z0 + 0.3, z1 - 0.3]) for (let x = x0 + 0.4; x <= x1 - 0.4; x += 2.2) { if (Math.hypot(x - cx, z - cz) < 2.6) continue; const t = await specimenTube(rand() < 0.75); put(t, 0, x, z, rand() * 6); W.addBox(0, x, z, 1, 1, 2.6); W.specimens.push(t); } }
  // clinic: hospital beds, IV stands, trolley, heart monitor
  { const r = await onTable(0, 'C', [syringeTray, () => tubeRack(3)], 1.0); } await custom(heartMonitor, 0, 'C', { out: 0.3 }); await h.onSlot('house/iv_drip.glb', 0, 'C', { out: 0.3, fit: 1.8 }); await h.onSlot('house/trolley.glb', 0, 'C', { out: 0.2, fit: 0.95 }); await h.onSlot('house/hospital_bed.glb', 0, 'C', { out: 0.5, fit: 1.0 });
  // security: a cabinet left open; offices: file cabinets, papers on the floor, a notice board
  await custom(gunCabinet, 0, 'S', { out: 0.05 });
  for (let i = 0; i < 2; i++) await custom(fileCabinet, 0, 'O', { out: 0.05 }); { const [cx, cz] = center(0, 'O'); const p = papers(12); put(p, 0, cx, cz, 0); }
  { const s = W.slot(0, 'O', rand); if (s) { const b = noticeBoard(); put(b, 0, s.x - Math.sin(s.ry) * 0.63, s.z - Math.cos(s.ry) * 0.63, s.ry, 1.6); } }
  // cafeteria: trays, a coffee machine, chairs knocked over
  { const [cx, cz] = center(0, 'Y'); for (const dz of [-2.6, 0, 2.6]) { const t = tray(); put(t, 0, cx + (rand() - 0.5) * 0.6, cz + dz, rand() * 6, 0.76); } await custom(async () => { const g = await h.steelTable(1.0, 0.6); const c = coffeeMachine(); c.position.y = 0.925; g.add(c); return g; }, 0, 'Y', { out: 0.1 });
    const ch = await inst('house/dining_chair_fabric.glb'); ch.rotation.set(Math.PI / 2, 0, 0.6); put(ch, 0, cx + 1.4, cz + 1.4, 0, 0.26); solid(ch, 0); }
  // B1: power: fuse panels and cables; medical stores: medicine shelves and oxygen
  for (let i = 0; i < 2; i++) { const s = W.slot(1, 'G', rand) || W.slot(1, 'P', rand); if (s) { const p = fusePanel(); put(p, 1, s.x - Math.sin(s.ry) * 0.55, s.z - Math.cos(s.ry) * 0.55, s.ry); } }
  { const [cx, cz] = center(1, 'G'); const c = cables(5); put(c, 1, cx, cz, 0.3); }
  await custom(medShelf, 1, 'L', { out: 0.05 }); await custom(() => oxygenTanks(3), 1, 'L', { out: 0.05 });
  // B2: containment: holding cells; control: a big console; tunnel: rails and a cart
  for (let i = 0; i < 2; i++) await custom(cell, 2, 'Z', { out: 0.4 });
  { const [cx, cz] = center(2, 'Q'); const c = controlConsole(); put(c, 2, cx, cz + 0.6, Math.PI); solid(c, 2); }
  { const cells = []; MAPS[2].forEach((r, z) => [...r].forEach((c, x) => { if (c === 'F') cells.push([x, z]); })); const xs = cells.map((c) => c[0]); const [x0, zc] = cellCenter(Math.min(...xs), cells[0][1]); const [x1] = cellCenter(Math.max(...xs), cells[0][1]);
    const r = railsAndCart(x1 - x0); put(r, 2, (x0 + x1) / 2, zc, 0); }
  // a few dried stains and handprints in the halls and by the broken tube
  for (const [f, room, n] of [[0, 'H', 4], [1, 'H', 3], [2, 'H', 4], [0, 'M', 2], [2, 'U', 2]]) for (let i = 0; i < n; i++) { const [cx, cz, cells] = center(f, room); const [x, z] = cells[(rand() * cells.length) | 0]; W.groups[f].add(stainDecal(0.3 + rand() * 0.3, x + (rand() - 0.5) * 2, 0.012, z + (rand() - 0.5) * 2)); }
  for (let i = 0; i < 4; i++) { const f = i % 3; const s = W.slot(f, 'H', rand); if (!s) continue; const hp = handprint(); hp.position.set(s.x - Math.sin(s.ry) * 0.64, 1.1 + rand() * 0.4, s.z - Math.cos(s.ry) * 0.64); hp.rotation.y = s.ry; W.groups[f].add(hp); }
}
