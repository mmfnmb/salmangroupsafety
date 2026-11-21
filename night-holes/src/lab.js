// The experiment room: mix chemicals into tools, and grow a creature from parts in an empty tube. The same parts
// builder opens from the start screen as the Monster Lab, where designs are saved and one can join your game.
import * as THREE from 'three';
import { rigged } from './assets.js';

export const BASES = { gaunt: 'mon/gaunt-horror-rigged.glb', nurse: 'mon/nurse.glb', smiley: 'mon/smiley.glb', mutant: 'mon/mutant.glb', deer: 'mon/human_deer.glb', wendigo: 'mon/wendigo.glb', matron: 'mon/asylum_matron.glb' };
export const PARTS = {
  base: Object.keys(BASES), horns: ['none', 'antlers', 'horns', 'spikes'], eyes: ['none', 'red', 'three', 'white'], back: ['none', 'tubes', 'spines'],
  skin: ['normal', 'pale', 'burnt', 'shadow', 'glass'], ability: ['blind', 'statue', 'smell', 'mimic', 'ceiling', 'motion', 'dark', 'charger'], sound: ['growl', 'shriek', 'whisper', 'scratch'],
};
export const SLIDERS = { height: [0.8, 1.4], arms: [0.7, 1.7], legs: [0.7, 1.5], head: [0.7, 1.6], thin: [0.6, 1.3] };
export const newDesign = () => ({ name: 'SPECIMEN 9', base: 'gaunt', horns: 'none', eyes: 'red', back: 'none', skin: 'normal', ability: 'blind', sound: 'growl', height: 1, arms: 1, legs: 1, head: 1, thin: 1 });
export const loadDesigns = () => { try { return JSON.parse(localStorage.getItem('nh_designs')) || []; } catch (e) { return []; } };
export const saveDesigns = (d) => { try { localStorage.setItem('nh_designs', JSON.stringify(d.slice(0, 5))); } catch (e) {} };
// what each ability means for the monster brain (flags read by monsters.js)
export function kindFromDesign(d) { const a = d.ability; return { file: BASES[d.base], h: 2.2, walk: 1.6, chase: a === 'charger' ? 5.3 : 4.0, sight: a === 'blind' ? 0 : 16, hear: a === 'blind' ? 2.2 : a === 'motion' ? 0 : 1, r: 0.45,
  blind: a === 'blind', statue: a === 'statue', smell: a === 'smell', mimic: a === 'mimic', ceiling: a === 'ceiling', motionOnly: a === 'motion', darkOnly: a === 'dark', charger: a === 'charger', design: d,
  anims: { idle: /idle|anim/i, walk: /stalk|walk|anim/i, run: /chase|run|anim/i } }; }

const STD = (c, r = 0.6, m = 0, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...e });
// put the parts on a loaded body: bone proportions, horns, eyes, back pieces, skin
export function applyDesign(obj, d) {
  const bones = {}; obj.traverse((o) => { if (!o.isBone) return; const n = o.name.toLowerCase();
    const k = /head(?!top)/.test(n) && !bones.head ? 'head' : /(upper)?arm(?!.*fore)/.test(n) && /(\.?l\b|left|l_)/.test(n) && !bones.al ? 'al' : /(upper)?arm(?!.*fore)/.test(n) && /(\.?r\b|right|r_)/.test(n) && !bones.ar ? 'ar'
      : /(thigh|upleg|hip\.)/.test(n) && /(l\b|left|\.l)/.test(n) && !bones.ll ? 'll' : /(thigh|upleg|hip\.)/.test(n) && /(r\b|right|\.r)/.test(n) && !bones.lr ? 'lr' : /chest|spine2|chest_03/.test(n) && !bones.chest ? 'chest' : null; if (k) bones[k] = o; });
  for (const k of ['al', 'ar']) if (bones[k]) bones[k].scale.setScalar(d.arms); for (const k of ['ll', 'lr']) if (bones[k]) bones[k].scale.setScalar(d.legs); if (bones.head) bones.head.scale.setScalar(d.head);
  obj.scale.multiply(new THREE.Vector3(d.thin, d.height, d.thin));
  obj.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(obj), top = box.max.y, fz = box.max.z;
  const head = bones.head || obj, hp = new THREE.Vector3(); head.getWorldPosition(hp);
  const at = (mesh, x, y, z) => { mesh.position.set(x, y, z); mesh.updateMatrix(); head.attach(mesh); };
  const bone = STD(0xd8ccb4, 0.7), dark = STD(0x15120f, 0.6);
  if (d.horns === 'antlers') for (const s of [-1, 1]) { const g = new THREE.Group(); const main = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.025, 0.45, 6), bone); main.position.y = 0.22; main.rotation.z = s * 0.5; g.add(main); for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.014, 0.18, 5), bone); b.position.set(s * (0.06 + i * 0.05), 0.18 + i * 0.1, 0); b.rotation.z = s * (1.0 - i * 0.2); g.add(b); } at(g, hp.x + s * 0.05, hp.y + 0.1, hp.z); }
  if (d.horns === 'horns') for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.22, 8), dark); h.rotation.z = -s * 0.6; at(h, hp.x + s * 0.06, hp.y + 0.1, hp.z); }
  if (d.horns === 'spikes') for (let i = 0; i < 5; i++) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.15, 6), bone); h.rotation.x = -0.6; at(h, hp.x + (i - 2) * 0.03, hp.y + 0.1 - Math.abs(i - 2) * 0.02, hp.z - 0.05); }
  if (d.eyes !== 'none') { const col = d.eyes === 'white' ? 0xf0f6ff : 0xff2a1a; const em = new THREE.MeshBasicMaterial({ color: col }); const pts = d.eyes === 'three' ? [-0.035, 0, 0.035] : [-0.03, 0.03];
    for (const x of pts) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), em); at(e, hp.x + x, hp.y + (d.eyes === 'three' && x === 0 ? 0.03 : 0.01), hp.z + 0.09); } }
  const ch = bones.chest || obj, cp = new THREE.Vector3(); ch.getWorldPosition(cp);
  const atChest = (mesh, x, y, z) => { mesh.position.set(x, y, z); mesh.updateMatrix(); ch.attach(mesh); };
  if (d.back === 'spines') for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.2, 6), bone); s.rotation.x = -1.2; atChest(s, cp.x, cp.y + 0.15 - i * 0.08, cp.z - 0.12); }
  if (d.back === 'tubes') for (let i = 0; i < 3; i++) { const pts = [new THREE.Vector3(cp.x + (i - 1) * 0.06, cp.y, cp.z - 0.1), new THREE.Vector3(cp.x + (i - 1) * 0.1, cp.y + 0.25, cp.z - 0.3), new THREE.Vector3(cp.x + (i - 1) * 0.14, cp.y - 0.2, cp.z - 0.45)];
    const tb = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.016, 6), STD(0x1a1d20, 0.45)); atChest(tb, 0, 0, 0); }
  obj.traverse((m) => { if (!m.isMesh || m.userData.part || !m.material || !m.isSkinnedMesh) return; m.material = m.material.clone();
    if (d.skin === 'pale') m.material.color.multiply(new THREE.Color(0xe6e6dc)).multiplyScalar(1.25); if (d.skin === 'burnt') m.material.color.multiply(new THREE.Color(0x4a3428));
    if (d.skin === 'shadow') { m.material.color.setHex(0x050505); m.material.roughness = 0.9; } if (d.skin === 'glass') { m.material.transparent = true; m.material.opacity = 0.55; m.material.color.multiply(new THREE.Color(0xbfe0ff)); } });
}
export async function buildCreature(d) { const { obj, clips } = await rigged(BASES[d.base]); const g = new THREE.Group(); g.add(obj); obj.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(obj); obj.scale.multiplyScalar(2.2 / (bb.max.y - bb.min.y));
  obj.updateMatrixWorld(true); const b2 = new THREE.Box3().setFromObject(obj); obj.position.y -= b2.min.y; obj.position.x -= (b2.min.x + b2.max.x) / 2; obj.position.z -= (b2.min.z + b2.max.z) / 2;
  applyDesign(obj, d); const mix = new THREE.AnimationMixer(obj); const c = clips.find((q) => /idle|anim/i.test(q.name)) || clips[0]; if (c) mix.clipAction(c).play(); return { g, mix, clips }; }

// ---------------------------------------------------------------- the builder UI (panel or full screen)
export function builderHTML(d, t) {
  const sel = (k) => `<label class="bRow"><span>${t('part_' + k)}</span><select data-k="${k}">${PARTS[k].map((v) => `<option value="${v}" ${d[k] === v ? 'selected' : ''}>${t('opt_' + v) !== 'opt_' + v ? t('opt_' + v) : v}</option>`).join('')}</select></label>`;
  const sl = (k) => `<label class="bRow"><span>${t('part_' + k)}</span><input type="range" data-k="${k}" min="${SLIDERS[k][0]}" max="${SLIDERS[k][1]}" step="0.05" value="${d[k]}"></label>`;
  return `<label class="bRow"><span>${t('part_name')}</span><input data-k="name" maxlength="18" value="${d.name}"></label>${['base', 'horns', 'eyes', 'back', 'skin', 'ability', 'sound'].map(sel).join('')}${Object.keys(SLIDERS).map(sl).join('')}`;
}
export function bindBuilder(root, d, onChange) { root.querySelectorAll('[data-k]').forEach((el) => (el.oninput = el.onchange = () => { const k = el.dataset.k; d[k] = el.type === 'range' ? +el.value : el.value; onChange(d, k); })); }

// ---------------------------------------------------------------- chemistry
export const RECIPES = { 'chem_b+chem_r': 'sedative', 'chem_r+chem_y': 'smoke', 'chem_b+chem_y': 'acid', 'chem_r+chem_r': 'flare' };
export function mixResult(a, b) { return RECIPES[[a, b].sort().join('+')] || null; }
