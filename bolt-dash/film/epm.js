// Measures the character's head in Head-bone space (vertices mostly weighted to the Head bone).
import { initFilm, episode, Actor, ACTORS, fixed, THREE } from './lib.js';
let EP; export let total = 0; export let info = null;
export async function init() {
  await initFilm([]);
  const a = new Actor('blue'); ACTORS.push(a); a.at(0, 0, 0, 0); a.m.updateMatrixWorld(true);
  const meshes = []; a.m.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
  const v = new THREE.Vector3(), box = new THREE.Box3(), wbox = new THREE.Box3(); let inv = null, head = null, n = 0;
  for (const mesh of meshes) {
    const sk = mesh.skeleton, hi = sk.bones.findIndex((b) => b.name === 'Head'); if (hi < 0) continue; head = sk.bones[hi];
    inv = new THREE.Matrix4().copy(head.matrixWorld).invert();
    const pos = mesh.geometry.attributes.position, si = mesh.geometry.attributes.skinIndex, sw = mesh.geometry.attributes.skinWeight;
    for (let i = 0; i < pos.count; i++) {
      let w = 0; for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === hi) w += sw.getComponent(i, k);
      if (w < 0.5) continue; n++;
      mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld); wbox.expandByPoint(v); box.expandByPoint(v.clone().applyMatrix4(inv));
    }
  }
  info = { headLocal: [box.min.toArray(), box.max.toArray()], headWorld: [wbox.min.toArray(), wbox.max.toArray()], headScale: head.getWorldScale(new THREE.Vector3()).toArray(), n, meshes: meshes.length };
  EP = episode([{ dur: 1, setup() {}, upd() { fixed([0, 1, 3], [0, 0.8, 0]); } }]); total = EP.total;
}
export function frame(n, r = true) { return EP.frame(n, r); }
export function subs() { return []; }
