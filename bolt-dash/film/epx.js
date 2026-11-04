// Look test for the Mad Prisoner (not part of any episode).
import { initFilm, episode, Actor, ACTORS, setTime, fixed, V, place, scene } from './lib.js';
import { ITEM } from '../src/cosmetics.js';
let EP; export let total = 0;
export async function init() {
  await initFilm(['x-mask', 'x-pumpkin', 'x-cleaver']);
  const P = new URLSearchParams(location.search), ms = +(P.get('ms') || 5), my = +(P.get('my') || 0.3), mz = +(P.get('mz') || 0.3), ps = +(P.get('ps') || 7.6), py = +(P.get('py') || -0.75);
  ITEM['film-mad'] = { id: 'film-mad', colors: { Main: 0x1b1b21, Main2: 0x6e0b12, Main_Light: 0xa3101c, EyeColor: 0xff2a2a }, mat: { EyeColor: { emi: 0xff0000, ei: 2.5 }, Main_Light: { rough: 0.5 } } };
  ITEM['x-mask'] = { id: 'x-mask', slot: 'face', model: 'f/x-mask', bone: 'Head', s: ms, p: [0, my, mz] };
  ITEM['x-pumpkin'] = { id: 'x-pumpkin', slot: 'head', model: 'f/x-pumpkin', bone: 'Head', s: ps, p: [0, py, 0] };
  ITEM['x-cleaver'] = { id: 'x-cleaver', slot: 'bat', model: 'f/x-cleaver', axis: 'x', grip: 1, len: 2.2 };
  for (let x = -6; x <= 6; x += 2) for (let z = -6; z <= 4; z += 2) place('Cube_Grass_Single', x, -1, z, 1, 0, scene);
  const a = new Actor({ skin: 'film-mad', face: 'x-mask', bat: 'x-cleaver' }), b = new Actor({ skin: 'film-mad', head: 'x-pumpkin', bat: 'x-cleaver' });
  ACTORS.push(a, b);
  const { holdItem } = await import('../src/cosmetics.js');
  EP = episode([{ dur: 3, time: 'night', setup() { a.at(-0.9, 0, 0, 0.25).play('Idle'); b.at(0.9, 0, 0, -0.25).play('Idle'); holdItem(a.m, 'bat:x-cleaver'); holdItem(b.m, 'bat:x-cleaver'); }, upd() { fixed([0, 1.15, 3.0], [0, 0.9, 0]); } }]);
  total = EP.total;
}
export function frame(n, r = true) { return EP.frame(n, r); }
export function subs() { return []; }
