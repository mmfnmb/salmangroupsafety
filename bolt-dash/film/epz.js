// Pet candidates line-up (not part of any episode).
import { initFilm, episode, fixed, place, scene, M, THREE } from './lib.js';
const P = ['bee','bunny','cat','caterpillar','chick','crab','fish','fox','koala','panda','parrot','penguin','pig','polar','monkey','elephant','ghost','snowman'];
let EP; export let total = 0;
export async function init() {
  await initFilm(P.map((p) => 'p-' + p));
  for (let x = -12; x <= 12; x += 2) for (let z = -6; z <= 4; z += 2) place('Cube_Grass_Single', x, -1, z, 1, 0, scene);
  P.forEach((p, i) => { const o = M['f/p-' + p].scene.clone(); const b = new THREE.Box3().setFromObject(o); const s = 1.2 / Math.max(...b.getSize(new THREE.Vector3()).toArray()); o.scale.setScalar(s); o.position.set((i % 6 - 2.5) * 1.9, 0, Math.floor(i / 6) * 1.9 - 2); o.rotation.y = 0.3; scene.add(o); });
  EP = episode([{ dur: 2, time: 'day', setup() {}, upd() { fixed([0, 3.2, 5.6], [0, 0.1, 0.2]); } }]);
  total = EP.total;
}
export function frame(n, r = true) { return EP.frame(n, r); }
export function subs() { return []; }
