// Look test for the Mad Prisoner (not part of any episode).
import { initFilm, episode, Actor, ACTORS, setTime, fixed, V, place, scene } from './lib.js';
import { ITEM } from '../src/cosmetics.js';
let EP; export let total = 0;
export async function init() {
  await initFilm(['x-mask', 'x-pumpkin', 'x-cleaver', 'x-chainsaw']);
  const P = new URLSearchParams(location.search), ms = +(P.get('ms') || 5), my = +(P.get('my') || 0.3), mz = +(P.get('mz') || 0.3), ps = +(P.get('ps') || 5.7), py = +(P.get('py') || -0.5);
  ITEM['film-mad'] = { id: 'film-mad', colors: { Main: 0x121216, Main2: 0x2a2a30, Main_Light: 0x9a0c16, EyeColor: 0xff2a2a }, mat: { EyeColor: { emi: 0xff0000, ei: 2.5 }, Main_Light: { rough: 0.5 } } };
  ITEM['x-mask'] = { id: 'x-mask', slot: 'face', model: 'f/x-mask', bone: 'Head', s: ms, p: [0, my, mz] };
  ITEM['x-pumpkin'] = { id: 'x-pumpkin', slot: 'head', model: 'f/x-pumpkin', bone: 'Head', s: ps, p: [0, py, 0] };
  ITEM['x-cleaver'] = { id: 'x-cleaver', slot: 'bat', model: 'f/x-cleaver', axis: 'x', grip: 1, len: 2.4 };
  ITEM['x-saw'] = { id: 'x-saw', slot: 'bat', model: 'f/x-chainsaw', axis: 'z', grip: 1, len: 5.2 };
  for (let x = -6; x <= 6; x += 2) for (let z = -6; z <= 4; z += 2) place('Cube_Grass_Single', x, -1, z, 1, 0, scene);
  const a = new Actor({ skin: 'film-mad', head: 'x-pumpkin', bat: 'x-cleaver' }), b = new Actor({ skin: 'film-mad', head: 'x-pumpkin', bat: 'x-cleaver' });
  ACTORS.push(a, b);
  const { holdItem } = await import('../src/cosmetics.js');
  const { THREE, scene: sc } = await import('./lib.js');
  const red = new THREE.PointLight(0xff1a1a, 40, 12); red.position.set(-1.5, 1.6, -1.2); sc.add(red);
  const rim = new THREE.PointLight(0xff3020, 25, 10); rim.position.set(1.8, 2.2, -1.5); sc.add(rim);
  // weapons point forward, away from the face
  const aim = (m, rx) => { const f = m.userData.held.frame; f.rotation.set(rx, 0, 0); f.children[0].rotation.y = Math.PI / 2; };
  EP = episode([{ dur: 3, time: 'night', setup() { a.at(-0.85, 0, 0, 0.35).play('Idle'); b.at(0.85, 0, 0, -0.35).play('Idle'); holdItem(a.m, 'bat:x-cleaver'); holdItem(b.m, 'bat:x-saw'); aim(a.m, 1.35); aim(b.m, 1.5); }, upd(t) { fixed([0, 1.0, 3.3], [0, 0.85, 0]); } }]);
  total = EP.total;
}
export function frame(n, r = true) { return EP.frame(n, r); }
export function subs() { return []; }
