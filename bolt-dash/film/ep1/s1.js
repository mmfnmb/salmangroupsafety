import { hideAll, fixed, orbit } from '../lib.js';
import { HOUSE } from '../sets/house.js';
export function shots(A) { return [
  { dur: 2, set: 'house_ext', time: 'morning', setup() { hideAll(); }, upd(t) { fixed([0, 9, 30], [0, 2, -4]); } },
  { dur: 2, set: 'house_int', time: 'interior', setup() { hideAll(); A.blue.at(HOUSE.sofa.x, 0, 1.5, Math.PI).show(); A.yellow.at(5, 0, -0.4, 0).show(); }, upd(t) { fixed([0, 7, 13], [0, 1, -2.5]); } },
  { dur: 2, set: 'house_int', time: 'interior', setup() { hideAll(); A.blue.at(-5, 0, -2, 0).show(); }, upd(t) { fixed([-3.5, 3.2, 3.5], [-6, 0.8, -4]); } },
]; }
