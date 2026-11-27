// Pumpkin fit test: three heights side by side.
import { initFilm, episode, Actor, ACTORS, fixed, place, scene } from './lib.js';
import { ITEM } from '../src/cosmetics.js';
let EP; export let total = 0;
export async function init() {
  await initFilm(['x-pumpkin']);
  ITEM['film-mad'] = { id: 'film-mad', colors: { Main: 0x121216, Main2: 0x2a2a30, Main_Light: 0x9a0c16, EyeColor: 0xff2a2a }, mat: { EyeColor: { emi: 0xff0000, ei: 2.5 } } };
  const ss = [6.0, 6.6, 7.2], A = ss.map((sc, i) => { ITEM['pk' + i] = { id: 'pk' + i, slot: 'head', model: 'f/x-pumpkin', bone: 'Head', s: sc, p: [0, -0.32, 0.1] }; const a = new Actor({ skin: 'film-mad', head: 'pk' + i }).noEars(); ACTORS.push(a); return a; });
  for (let x = -6; x <= 6; x += 2) for (let z = -6; z <= 4; z += 2) place('Cube_Grass_Single', x, -1, z, 1, 0, scene);
  EP = episode([{ dur: 2, time: 'night', setup() { A.forEach((a, i) => a.at((i - 1) * 1.3, 0, 0, 0).play('Idle')); }, upd() { fixed([0, 0.95, 3.4], [0, 0.85, 0]); } }]);
  total = EP.total;
}
export function frame(n, r = true) { return EP.frame(n, r); }
export function subs() { return []; }
