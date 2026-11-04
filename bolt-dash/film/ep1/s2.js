import { hideAll, fixed } from '../lib.js';
export function shots(A) { return [
  { dur: 2, set: 'house_int', time: 'interior', setup() { hideAll(); A.blue.at(-2, 0, 0, 0).show(); A.yellow.at(2, 0, 0, Math.PI).show(); }, upd() { fixed([0, 1.5, 6], [0, 1, 0]); } },
]; }
