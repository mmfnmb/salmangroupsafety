// Sitting test (not part of any episode).
import { initFilm, episode, Actor, ACTORS, fixed, place, scene } from './lib.js';
let EP; export let total = 0;
export async function init() {
  await initFilm(['f-loungeSofa']);
  for (let x = -6; x <= 6; x += 2) for (let z = -6; z <= 4; z += 2) place('Cube_Grass_Single', x, -1, z, 1, 0, scene);
  place('f/f-loungeSofa', -1.57, 0, 0.65, 3.2, 0, scene);
  const a = new Actor('blue'), b = new Actor('yellow'), c = new Actor('gold'); ACTORS.push(a, b, c);
  EP = episode([{ dur: 2, time: 'interior', setup() { a.sitAt(-0.6, 0.66, 0.15, 0); b.sitAt(0.6, 0.66, 0.15, 0); c.at(2.2, 0, 0.6, -0.4).play('Idle'); }, upd() { fixed([2.6, 1.0, 2.6], [0, 0.7, 0.2]); } }]);
  total = EP.total;
}
export function frame(n, r = true) { return EP.frame(n, r); }
export function subs() { return []; }
