// Hockey mask fit test: model A (left) and model B at two fits.
import { initFilm, episode, Actor, ACTORS, fixed, place, scene } from './lib.js';
import { ITEM } from '../src/cosmetics.js';
let EP; export let total = 0;
export async function init() {
  await initFilm(['x-hm-a', 'x-hm-b']);
  const P = new URLSearchParams(location.search), q = (k, d) => +(P.get(k) ?? d);
  ITEM['film-mad'] = { id: 'film-mad', colors: { Main: 0x121216, Main2: 0x2a2a30, Main_Light: 0x9a0c16, EyeColor: 0xff2a2a }, mat: { EyeColor: { emi: 0xff0000, ei: 2.5 } } };
  ITEM.ma = { id: 'ma', slot: 'face', model: 'f/x-hm-a', bone: 'Head', s: q('as', 0.0058), p: [q('ax', 0), q('ay', 0.2), q('az', 0.9)] };
  ITEM.mb1 = { id: 'mb1', slot: 'face', model: 'f/x-hm-b', bone: 'Head', s: [1.68, 1.25, 1.4], p: [0, q('by', 0.2), q('bz', 0.85)] };
  ITEM.mb2 = { id: 'mb2', slot: 'face', model: 'f/x-hm-b', bone: 'Head', s: [1.9, 1.5, 1.5], p: [0, q('by', 0.2), q('bz', 0.85)] };
  const A = ['ma', 'mb1', 'mb2'].map((f) => { const a = new Actor({ skin: 'film-mad', face: f }); ACTORS.push(a); return a; });
  for (let x = -6; x <= 6; x += 2) for (let z = -6; z <= 4; z += 2) place('Cube_Grass_Single', x, -1, z, 1, 0, scene);
  EP = episode([{ dur: 2, time: 'night', setup() { A.forEach((a, i) => a.at((i - 1) * 1.3, 0, 0, 0).play('Idle')); }, upd() { fixed([0, 0.95, 3.4], [0, 0.85, 0]); } }]);
  total = EP.total;
}
export function frame(n, r = true) { return EP.frame(n, r); }
export function subs() { return []; }
