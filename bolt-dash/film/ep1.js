// Season 1, Episode 1: "The Beginning". Scenes live in film/ep1/; sets in film/sets.js.
import { initFilm, episode, cast, titleCard, SUBS, ease } from './lib.js';
import { FILM_MODELS } from './sets.js';
import * as S1 from './ep1/s1.js'; import * as S2 from './ep1/s2.js'; import * as S3 from './ep1/s3.js'; import * as S4 from './ep1/s4.js';
import * as S5 from './ep1/s5.js'; import * as S6 from './ep1/s6.js'; import * as S7 from './ep1/s7.js';

let EP = null;
export let total = 0;
export async function init() {
  await initFilm(FILM_MODELS);
  // the whole cast of the episode, created once (each scene shows the ones it needs)
  const A = cast(['blue', 'yellow', 'gold', 'brown', 'orange', 'red', 'vio', 'minto', 'silver', 'slate', 'olive', 'ref']);
  const SHOTS = [
    { dur: 5, set: 'house_ext', time: 'morning', setup() {}, upd() {}, card: (ctx, t) => titleCard(ctx, 'BOLT DASH', 'Season 1 · Episode 1: The Beginning', Math.min(t / 0.6, (5 - t) / 0.6)) },
    ...S1.shots(A), ...S2.shots(A), ...S3.shots(A), ...S4.shots(A), ...S5.shots(A), ...S6.shots(A), ...S7.shots(A),
    { dur: 4, set: 'house_int', time: 'night', setup() { for (const a of Object.values(A)) a.show(false); }, upd() {}, card: (ctx, t) => titleCard(ctx, 'Episode 2', 'Coming soon', ease(t / 0.6)) },
  ];
  EP = episode(SHOTS); total = EP.total;
}
export function frame(n, render = true) { return EP.frame(n, render); }
export function subs() { return SUBS.map(({ who, text, start, end }) => ({ who, text, start, end })); }
