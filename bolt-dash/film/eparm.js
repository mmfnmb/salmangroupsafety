// Arm test: four actors, upper arms turned on x, -x, y, z to see which way reaches forward.
import { initFilm, episode, Actor, ACTORS, fixed, place, scene } from './lib.js';
import { boneOffset, PI } from '../src/core.js';
let EP; export let total = 0;
export async function init() {
  await initFilm([]);
  const tests = [['z', 1.4], ['z', -1.4], ['y', 1.4], ['y', -1.4]];
  const A = tests.map(() => { const a = new Actor('blue'); ACTORS.push(a); return a; });
  for (let x = -6; x <= 6; x += 2) for (let z = -6; z <= 4; z += 2) place('Cube_Grass_Single', x, -1, z, 1, 0, scene);
  A.forEach((a, i) => { const orig = a.tick.bind(a), [ax, v] = tests[i]; a.tick = (dt) => { orig(dt); for (const s of ['L', 'R']) boneOffset(a.bones['UpperArm' + s], ax, v * (s === 'R' ? -1 : 1)); }; });
  EP = episode([{ dur: 1, time: 'day', setup() { A.forEach((a, i) => a.at((i - 1.5) * 1.3, 0, 0, i % 2 ? 0 : PI / 2).play('Idle')); }, upd() { fixed([0, 1.1, 4.2], [0, 0.7, 0]); } }]);
  total = EP.total;
}
export function frame(n, r = true) { return EP.frame(n, r); }
export function subs() { return []; }
