// Season 1, Episode 1: "The Beginning". Scenes live in film/ep1/; sets in film/sets.js.
import { initFilm, episode, cast, titleCard, SUBS, ease, orbit, hideAll } from './lib.js';
import { FILM_MODELS } from './sets.js';
import * as S1 from './ep1/s1.js'; import * as S2 from './ep1/s2.js'; import * as S3 from './ep1/s3.js'; import * as S4 from './ep1/s4.js';
import * as S5 from './ep1/s5.js'; import * as S6 from './ep1/s6.js'; import * as S7 from './ep1/s7.js';

let EP = null, CUES = [];
export let total = 0;
export async function init() {
  await initFilm(FILM_MODELS);
  // the whole cast of the episode, created once (each scene shows the ones it needs)
  const A = cast(['blue', 'yellow', 'gold', 'brown', 'orange', 'red', 'vio', 'minto', 'silver', 'slate', 'olive', 'ref']);
  // ?only=3,5 previews just those scenes
  const only = (new URLSearchParams(location.search).get('only') || '').split(',').filter(Boolean).map(Number);
  const parts = [S1, S2, S3, S4, S5, S6, S7].map((S, i) => (!only.length || only.includes(i + 1) ? S.shots(A) : []));
  const SC = parts.flat();
  // music moods per scene for the soundtrack generator (film/audio-ep.cjs)
  const MOODS = ['cozy', 'playful', 'news', 'ominous', 'upbeat', 'epic', 'tense'];
  let tt = 5; CUES = [{ t: 0, mood: 'title' }];
  parts.forEach((p, i) => { if (p.length) CUES.push({ t: tt, mood: MOODS[i] }); tt += p.reduce((a, s) => a + s.dur, 0); });
  CUES.push({ t: tt, mood: 'end' });
  const SHOTS = [
    { dur: 5, set: 'house_ext', time: 'morning', setup() { hideAll(); }, upd(t) { orbit([0, 0, 0], t, { r: 22, h: 9, speed: 0.06, from: 0.6 }); }, card: (ctx, t) => titleCard(ctx, 'BOLT DASH', 'Season 1 · Episode 1: The Beginning', Math.min(t / 0.6, (5 - t) / 0.6)) },
    ...SC,
    { dur: 4, set: 'house_int', time: 'night', setup() { for (const a of Object.values(A)) a.show(false); }, upd() {}, card: (ctx, t) => { ctx.fillStyle = '#0b0820'; ctx.fillRect(0, 0, 960, 540); titleCard(ctx, 'Episode 2', 'Coming soon', ease(t / 0.6)); } },
  ];
  EP = episode(SHOTS); total = EP.total;
}
export function frame(n, render = true) { return EP.frame(n, render); }
export function subs() { return SUBS.map(({ who, text, start, end }) => ({ who, text, start, end })); }
export function cues() { return CUES; }
