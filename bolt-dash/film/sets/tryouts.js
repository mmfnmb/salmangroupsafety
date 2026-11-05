// The tryouts: an open field with a short obstacle course (game level pieces), a sign-up desk, a queue and spectators.
import { SETS, put, THREE, G, crowd, Actor, ACTORS, extraLook } from '../lib.js';
import { Level } from '../../src/level.js';

// course runs along -z at x = 0: start z=8, spinning arm z=-2, saw z=-8, spring z=-13 up to a deck (y=2) from z=-16,
// a gap from z=-22 to -25, finish deck to z=-31 with the gate at z=-29.
export const COURSE = { x: 1.7, start: 8, arm: -2, saw: -8, spring: -13, deck: -16, gap: [-22, -25], finish: -29 };
export const DESK = { x: 13, z: 6 };
const queueActors = [];
// matte floor: the shiny grass tiles bloom into white glare on camera, so give this set's copies a rough, non-reflective finish
function matte(obj) { obj.traverse((o) => { if (!o.isMesh) return; const ms = Array.isArray(o.material) ? o.material : [o.material]; const nm = ms.map((m) => { const c = m.clone(); c.roughness = 1; c.metalness = 0; c.envMapIntensity = 0.15; if (c.color) c.color.multiplyScalar(0.88); return c; }); o.material = Array.isArray(o.material) ? nm : nm[0]; }); }
SETS.tryouts = (root) => {
  const L = new Level({ killY: -12 }); G.level = L;
  L.floor(-26, 26, 22, -15);
  L.floor(-26, -3, -15, -36); L.floor(3, 26, -15, -36);
  L.floor(-3, 3, -15, -36, -0.4);
  L.floor(-3, 3, -16, -22, 2); L.floor(-3, 3, -25, -32, 2);
  matte(L.root);
  L.sweeper(0, COURSE.arm, 0, 3.6, 1.15);
  L.saw(0, COURSE.saw, 0, 2.6, 1.6, 0, 'x');
  L.spring(COURSE.x, COURSE.spring, 0, 21);
  L.finishGate(COURSE.finish, 2, 6);
  L.model('k/flagCheckers', -3.4, 0, COURSE.start, 2.2); L.model('k/flagCheckers', 3.4, 0, COURSE.start, 2.2, Math.PI);
  for (const x of [-11, 11]) L.model(x < 0 ? 'k/bannerTowerRed' : 'k/bannerTowerGreen', x, 0, COURSE.start + 6, 3);
  // sign-up desk with banners
  const wood = new THREE.MeshStandardMaterial({ color: 0xb8743a, roughness: 0.7 });
  const tb = put(root, 'f/f-table', DESK.x - 0.7, 0, DESK.z + 1.7, [3, 2.8, 4], Math.PI / 2); tb.traverse((o) => { if (o.isMesh) o.material = wood; });
  put(root, 'f/f-laptop', DESK.x - 1.4, 0.95, DESK.z + 0.2, 2.2, -Math.PI / 2);
  for (const z of [DESK.z - 4, DESK.z + 4]) put(root, 'f/cast-flag-banner-long', DESK.x - 1, 0, z, 2.2, Math.PI);
  // the queue: a long line of players waiting to sign up (instanced), and spectators along the course
  // the front of the queue are real players (idle, looking around); further back an instanced line
  const looks = ['skin-grape', 'skin-orange', 'skin-snow', 'skin-mint', 'skin-straw', 'skin-lemon', 'skin-night'];
  for (let i = 0; i < 7; i++) { const a = queueActors[i] || (queueActors[i] = (() => { const x = new Actor(extraLook()); ACTORS.push(x); return x; })()); a.at(DESK.x + 1.9 + (i % 2) * 0.35, 0, DESK.z + 2.6 + i * 1.15, Math.PI + (i % 3 - 1) * 0.3); a.keep = true; }
  root.userData.queue = queueActors;
  const q = []; for (let i = 7; i < 26; i++) q.push({ x: DESK.x + 1.9 + (i % 2) * 0.35, y: 0, z: DESK.z + 2.6 + i * 1.15, ry: Math.PI });
  const qg = crowd(q); root.add(qg); const qu = qg.userData.update; qg.userData.update = (T) => qu(T, 0.12);
  // spectators only on the far (-x) side, so side cameras (+x) see runners with the crowd behind them
  const fans = []; for (let z = 6; z > -15; z -= 1.25) for (let row = 0; row < 3; row++) fans.push({ x: -(6.6 + row * 1.5), y: 0, z: z + row * 0.55, ry: Math.PI / 2 });
  const fg = crowd(fans); root.add(fg); fg.userData.cheer = 0;
  // fans only hop when someone cheers (scene sets fg.userData.cheer 0..1)
  const up = fg.userData.update; fg.userData.update = (T) => up(T, fg.userData.cheer);
  root.userData.fans = fg;
  L.scenery(60, -80, 34, { towers: [[-40, -20, 3], [44, 10, 3]] });
};
