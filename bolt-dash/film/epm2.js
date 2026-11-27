// Measures every shop accessory against the body and head (world boxes, character at the origin).
import { initFilm, episode, Actor, ACTORS, fixed, THREE } from './lib.js';
import { ACCS } from '../src/cosmetics.js';
let EP, OUT = []; export let total = 0;
const box = (o) => { const b = new THREE.Box3().setFromObject(o); return [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].map((v) => +v.toFixed(3)); };
export async function init() {
  await initFilm([]);
  const base = new Actor({ skin: 'skin-blue' }); base.at(0, 0, 0, 0); base.m.updateMatrixWorld(true);
  const parts = {}; base.m.traverse((o) => { if (o.isSkinnedMesh) { o.skeleton.update(); const b = new THREE.Box3(); const v = new THREE.Vector3(); const pos = o.geometry.attributes.position; for (let i = 0; i < pos.count; i++) { o.getVertexPosition(i, v); o.localToWorld(v); b.expandByPoint(v); } parts[o.name] = [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].map((x) => +x.toFixed(3)); } });
  OUT.push({ parts });
  for (const it of ACCS) { const a = new Actor({ skin: 'skin-blue', [it.slot]: it.id }); a.at(0, 0, 0, 0); a.m.updateMatrixWorld(true); const o = a.m.userData.acc[it.slot]?.obj; OUT.push({ id: it.id, s: it.s, p: it.p, box: o ? box(o) : null }); a.m.visible = false; }
  EP = episode([{ dur: 0.2, setup() {}, upd() { fixed([0, 1, 3], [0, 0.8, 0]); } }]); total = EP.total;
}
export function frame(n, r = true) { return EP.frame(n, r); }
export function subs() { return OUT; }
