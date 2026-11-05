// Wardrobe check: every shop accessory worn, 4 per shot, turned 3/4 so position on head/body shows.
import { initFilm, episode, Actor, ACTORS, fixed, place, scene, hideAll, PI } from './lib.js';
import { ACCS } from '../src/cosmetics.js';
let EP; export let total = 0;
export async function init() {
  await initFilm([]);
  const only2 = new URLSearchParams(location.search).get('only2'), ids = ACCS.filter((a) => !a.secret && (!only2 || /^(h-knight|h-viking|h-wizard|c-)/.test(a.id))).map((a) => a.id), groups = [];
  for (let i = 0; i < ids.length; i += 3) groups.push(ids.slice(i, i + 3));
  for (let x = -6; x <= 6; x += 2) for (let z = -6; z <= 4; z += 2) place('Cube_Grass_Single', x, -1, z, 1, 0, scene);
  const shots = groups.map((g) => {
    const A = g.map((id) => { const it = ACCS.find((a) => a.id === id); const a = new Actor({ skin: 'skin-blue', [it.slot]: id }); ACTORS.push(a); return a; });
    return { dur: 1, time: 'day', setup() { hideAll?.(); ACTORS.forEach((a) => { a.m.visible = false; }); A.forEach((a, i) => a.at((i - 1) * 1.1, 0, 0, ACCS.find((x) => x.id === g[i]).slot === 'back' ? PI - 0.7 : 0.55).play('Idle')); }, upd() { fixed([0, 1.0, 2.6], [0, 0.8, 0]); } };
  });
  EP = episode(shots); total = EP.total;
}
export function frame(n, r = true) { return EP.frame(n, r); }
export function subs() { return []; }
