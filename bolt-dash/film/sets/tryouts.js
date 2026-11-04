// The tryouts: an open field with a short obstacle course (game level pieces), a sign-up desk, a queue and spectators.
import { SETS, put, THREE, G, crowd } from '../lib.js';
import { Level } from '../../src/level.js';

// course runs along -z at x = 0: start z=8, spinning arm z=-2, saw z=-8, spring z=-13 up to a deck (y=2) from z=-16,
// a gap from z=-22 to -25, finish deck to z=-31 with the gate at z=-29.
export const COURSE = { x: 1.7, start: 8, arm: -2, saw: -8, spring: -13, deck: -16, gap: [-22, -25], finish: -29 };
export const DESK = { x: 13, z: 6 };
SETS.tryouts = (root) => {
  const L = new Level({ killY: -12 }); G.level = L;
  L.floor(-26, 26, 22, -15);
  L.floor(-26, -3, -15, -36); L.floor(3, 26, -15, -36);
  L.floor(-3, 3, -15, -36, -0.4);
  L.floor(-3, 3, -16, -22, 2); L.floor(-3, 3, -25, -32, 2);
  L.rails(-3, 3, 8, -15);
  L.sweeper(0, COURSE.arm, 0, 3.6, 1.15);
  L.saw(0, COURSE.saw, 0, 2.6, 1.6, 0, 'x');
  L.spring(COURSE.x, COURSE.spring, 0, 21);
  L.finishGate(COURSE.finish, 2, 6);
  L.model('k/flagCheckers', -3.4, 0, COURSE.start, 2.2); L.model('k/flagCheckers', 3.4, 0, COURSE.start, 2.2, Math.PI);
  for (const x of [-5.5, 5.5]) L.model(x < 0 ? 'k/bannerTowerRed' : 'k/bannerTowerGreen', x, 0, COURSE.start + 2, 3);
  // sign-up desk with banners
  put(root, 'f/f-table', DESK.x - 2.5, 0, DESK.z + 1.4, [6, 3.4, 3.2], Math.PI / 2);
  put(root, 'f/f-chair', DESK.x - 1.6, 0, DESK.z - 1.2, 2.6, Math.PI);
  put(root, 'f/f-laptop', DESK.x - 1.4, 1.15, DESK.z, 2.2, -Math.PI / 2);
  for (const z of [DESK.z - 4, DESK.z + 4]) put(root, 'f/cast-flag-banner-long', DESK.x - 1, 0, z, 2.2, Math.PI);
  // the queue: a long line of players waiting to sign up (instanced), and spectators along the course
  const q = []; for (let i = 0; i < 22; i++) q.push({ x: DESK.x + 1.8 + (i % 2) * 0.35, y: 0, z: DESK.z + 2.4 + i * 1.15, ry: Math.PI });
  const qg = crowd(q); root.add(qg); const qu = qg.userData.update; qg.userData.update = (T) => qu(T, 0.12);
  const fans = []; for (let z = 5; z > -14; z -= 1.3) for (const side of [-1, 1]) for (let row = 0; row < 2; row++) fans.push({ x: side * (5.2 + row * 1.4), y: 0, z: z + row * 0.6, ry: side < 0 ? Math.PI / 2 : -Math.PI / 2 });
  const fg = crowd(fans); root.add(fg); fg.userData.cheer = 0;
  // fans only hop when someone cheers (scene sets fg.userData.cheer 0..1)
  const up = fg.userData.update; fg.userData.update = (T) => up(T, fg.userData.cheer);
  root.userData.fans = fg;
  L.scenery(60, -80, 34, { towers: [[-40, -20, 3], [44, 10, 3]] });
};
