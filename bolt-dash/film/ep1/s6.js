// Episode 1, scene 6: the opening ceremony of the Party Games League.
// Nine teams jog out of the tunnel one after another (flags on their backs) and line up in front of the stage;
// Gold drops in last on a golden parachute: half the stadium cheers, half boos. Ends on the 8 games and the crown.
import { Actor, ACTORS, hideAll, say, THREE, M, V, PI, clamp, lerp, ease, puffs, confetti, place, camTo, frameGroup, closeUp, track, orbit, fixed, overShoulder } from '../lib.js';
import { STAD } from '../sets/stadium.js';

const SET = 'stadium', TIME = 'sunset';
const GATE = { x: 0, z: 46 };
const OFF = [[-1, 0], [1, 0], [-1, 1.8], [1, 1.8]]; // 2x2 block, captain front-left

let teams = null, fansL = [], fansR = [], chute = null, flagRoot = null;

function makeTeams(A) {
  const mk = (look, sc) => { const a = new Actor(look); if (sc) { a.m.scale.setScalar(sc); a.s = sc; } ACTORS.push(a); return a; };
  const T = [
    { name: 'SPLASHVOLT', col: 0x3d8bff, slot: -6.5, E: 14, m: [A.blue, A.yellow, A.vio, A.minto] },
    { name: 'TIMBROK', col: 0x7a4a2a, slot: 6.5, E: 24, m: [A.brown, mk({ skin: 'skin-melon' }), mk({ skin: 'skin-snow' }), mk({ skin: 'skin-grape' })] },
    { name: 'FLARIX', col: 0xff7a1a, slot: -13, E: 36, m: [A.orange, mk({ skin: 'skin-straw' }), mk({ skin: 'skin-mint' }), mk({ skin: 'skin-snow', head: 'h-cone' })] },
    { name: 'RUBRAX', col: 0xd7263d, slot: 13, E: 41, m: [A.red, mk({ skin: 'skin-night' }), mk({ skin: 'skin-grape' }), mk({ skin: 'skin-melon' })] },
    { name: 'WOBBLZ', col: 0xff4f9a, slot: -19.5, E: 46.5, m: [mk({ skin: 'skin-straw', head: 'h-cupcake' }), mk({ skin: 'skin-straw' }), mk({ skin: 'skin-lemon' }), mk({ skin: 'skin-straw' })] },
    { name: 'SNOOZIES', col: 0x8fa0ff, slot: 19.5, E: 49, m: [mk({ skin: 'skin-night' }), mk({ skin: 'skin-snow' }), mk({ skin: 'skin-night' }), mk({ skin: 'skin-grape' })] },
    { name: 'JELLYJAX', col: 0x36e0a8, slot: -26, E: 51.5, m: [mk({ skin: 'skin-mint' }), mk({ skin: 'skin-melon' }), mk({ skin: 'skin-mint' }), mk({ skin: 'skin-lemon' })] },
    { name: 'PEBBLINOS', col: 0xb8a48a, slot: 26, E: 54, m: [mk({ skin: 'skin-orange' }, 0.33), mk({ skin: 'skin-snow' }, 0.33), mk({ skin: 'skin-orange' }, 0.33), mk({ skin: 'skin-melon' }, 0.33)] },
    { name: 'AUREX', col: 0xe8b600, slot: 0, E: 63, m: [null, A.silver, A.slate, A.olive] }, // Gold drops in by parachute
  ];
  for (const t of T) t.D = 8.5;
  // front-row fans for the cheering / booing close-ups
  const looks = ['skin-lemon', 'skin-straw', 'skin-mint', 'skin-orange', 'skin-grape', 'skin-snow'];
  fansL = looks.map((s) => mk({ skin: s, head: s === 'skin-straw' ? 'h-cone' : undefined }));
  fansR = looks.map((s) => mk({ skin: s }));
  return T;
}

// a coloured flag on a pole behind each runner (kept in the stadium set, following the actor)
function ensureFlags(root) {
  if (flagRoot === root) return; flagRoot = root;
  for (const t of teams) {
    const col = new THREE.Color(t.col);
    t.flags = t.m.map((a) => {
      if (!a) return null;
      const f = place('k/flag-large-red', 0, 0, 0, 1.75 * (a.s / 0.42), 0, root);
      f.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); if (o.material.color.r > 0.5 && o.material.color.g < 0.5) o.material.color.copy(col); } });
      return f;
    });
  }
  chute = place('k/detail-parasol-a', 0, -50, 0, 14, 0, root);
  chute.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.setHex(0xffc21a); o.material.metalness = 0.8; o.material.roughness = 0.25; o.material.emissive = new THREE.Color(0x6a4400); o.material.emissiveIntensity = 0.5; } });
}
function followFlags() {
  for (const t of teams) t.m.forEach((a, i) => {
    const f = t.flags?.[i]; if (!f || !a) return;
    f.visible = a.m.visible;
    const ry = a.m.rotation.y, k = a.s / 0.42;
    f.position.set(a.p.x - Math.sin(ry) * 0.32 * k + Math.cos(ry) * 0.12 * k, a.p.y + 0.45 * k, a.p.z - Math.cos(ry) * 0.32 * k - Math.sin(ry) * 0.12 * k);
    f.rotation.set(-0.12, ry, 0);
  });
}
// every team jogs from the tunnel to its slot; before it enters it is hidden
function placeTeams(sc) {
  for (const t of teams) {
    const k = clamp((sc - t.E) / t.D, 0, 1);
    t.m.forEach((a, i) => {
      if (!a) return;
      if (sc < t.E) { a.show(false); return; }
      const [ox, oz] = OFF[i], ex = t.slot + ox, ez = 6 + oz, sx = GATE.x + ox, sz = GATE.z + oz;
      a.at(lerp(sx, ex, k), 0, lerp(sz, ez, k), k < 1 ? Math.atan2(ex - sx, ez - sz) : PI);
      a.play(k < 1 ? 'Run' : 'Idle', 1.05);
    });
  }
}
function placeFans() {
  const FX = STAD.FX;
  fansL.forEach((a, i) => a.at(-(FX + 6.2), 0.6, -6 + i * 2.2, PI / 2));
  fansR.forEach((a, i) => a.at(FX + 6.2, 0.6, -6 + i * 2.2, -PI / 2));
}
// fireworks: a deterministic sequence of bursts over the stands
const COLS = [0xff4f9a, 0xffd23f, 0x36e0a8, 0x5fcfff, 0xa070ff, 0xff7a1a, 0xffffff];
function fireworks(T, rate = 1.6, last = { j: -1 }) {
  const j = Math.floor(T * rate); if (j === last.j) return; last.j = j;
  const h = (j * 2654435761) >>> 0, x = ((h % 1000) / 1000 - 0.5) * 90, z = (((h >> 10) % 1000) / 1000 - 0.5) * 110, y = 34 + ((h >> 20) % 12);
  const c = COLS[j % COLS.length];
  for (let i = 0; i < 34; i++) {
    const a = i / 34 * PI * 2, b = ((i * 7) % 11) / 11 * PI - PI / 2;
    puffs.emit({ pos: V(x, y, z), vel: V(Math.cos(a) * Math.cos(b), Math.sin(b) + 0.2, Math.sin(a) * Math.cos(b)).multiplyScalar(11), life: 1.3, size: 0.55, g: 3, drag: 1.6, color: c });
  }
}
const center = (list) => { const c = V(); list.forEach((a) => c.add(a.p)); return c.multiplyScalar(1 / list.length); };
// in front of a moving group, looking back at it as it comes towards us
function leadCam(list, { dist = 9, h = 2.6, side = 2.5 } = {}) {
  const c = center(list), a = list[0], f = a.m.rotation.y, fx = Math.sin(f), fz = Math.cos(f);
  camTo(V(c.x + fx * dist + fz * side, h, c.z + fz * dist - fx * side), V(c.x, 1.1, c.z), 4);
}

export function shots(A) {
  teams = makeTeams(A);
  const SH = [];
  let off = 0;
  // shot helper: o = offset (scene time) of the shot start
  const shot = (dur, setup, upd) => { const o = off; off += dur; SH.push({ dur, set: SET, time: TIME, setup() { hideAll(); setup?.(); }, upd(t, dt, T) { const sc = o + t; if (STAD.screen) ensureFlags(STAD.screen.mesh.parent); placeTeams(sc); placeFans(); fansL.concat(fansR).forEach((a) => a.show(false)); upd(t, sc, T); followFlags(); } }); };
  const tm = (n) => teams.find((t) => t.name === n);
  const goldAt = (sc) => {
    // Gold's parachute drop: high up at 61.5 s, lands in front of the stage at 69 s
    const k = clamp((sc - 61.5) / 7.5, 0, 1), y = lerp(42, 0, 1 - Math.pow(1 - k, 2.2));
    A.gold.at(Math.sin(sc * 0.9) * (1 - k) * 2.5, y, -2, 0);
    if (chute) {
      const up = Math.max(0, sc - 69.2); // after landing the chute floats away
      chute.position.set(A.gold.p.x, y + 3.15 + up * up * 2.2, A.gold.p.z + up * 2); chute.rotation.set(0, sc * 0.4, Math.sin(sc * 2.1) * 0.14 * (1 - k * 0.6));
      chute.visible = sc > 60 && up < 6;
    }
    return k;
  };

  // 0. the stadium from the sky, fireworks
  shot(7, () => { STAD.cheer.left = STAD.cheer.right = STAD.cheer.ends = 1; STAD.screen?.set('logo'); say('Announcer', 'Welcome... to the first ever PARTY GAMES LEAGUE!'); },
    (t, sc, T) => { orbit([0, 0, -4], t, { r: 78, h: 40, speed: 0.07, from: 0.5, k: 3 }); fireworks(T, 2); });
  // 1. the giant screen
  shot(4, () => say('Announcer', 'Nine teams. Eight games. One crown!'), (t, sc, T) => { fixed([0, 5 + t * 0.6, 12 - t], [0, 22, -61]); fireworks(T, 1.2); });
  // 2. the fans going wild
  shot(3, () => say('Crowd', 'WOOOOOO!'), (t, sc) => {
    fansL.forEach((a, i) => { a.show(true); a.p.y += Math.max(0, Math.sin(sc * 7 + i * 1.3)) * 0.35; a.play(i % 2 ? 'Wave' : 'Yes'); });
    camTo(V(-27.5, 2.4, 3.5 - t * 0.6), V(-37, 2.6, -1.5), 4);
  });
  // 3. Splashvolt out of the tunnel
  shot(5, () => say('Announcer', 'From Azuria... SPLASHVOLT!'), (t, sc) => { leadCam(tm('SPLASHVOLT').m, { dist: 8.5, side: 2.8 }); });
  // 4. alongside Blue
  shot(4, () => say('Blue', "Yellow! Look at all these people!"), (t, sc) => { track(A.blue, { side: 1, dist: 5.2, h: 1.7 }); A.blue.play('Run', 1.05); });
  // 5. Yellow jumping, Vio shy, Minto crazy
  shot(3.5, () => say('Yellow', "WE'RE GONNA WIN THIS! WOOHOO!"), (t, sc) => {
    A.yellow.p.y = Math.abs(Math.sin(t * 5)) * 0.7; A.yellow.play('Jump_Idle');
    A.minto.m.rotation.y += t * 9; A.vio.play('Wave', 0.7);
    frameGroup([A.yellow, A.minto, A.vio], { side: 1, h: 1.2, dist: 0.85, k: 5 });
  });
  // 6. Timbrok: Brown, calm
  shot(4.5, () => say('Announcer', 'TIMBROK! Led by the quiet one... BROWN!'), (t, sc) => { leadCam(tm('TIMBROK').m, { dist: 8, side: -2.5 }); });
  shot(3, () => { say('Brown', '...'); }, (t, sc) => { closeUp(A.brown, { ang: 0.3, dist: 2.3 }); A.brown.play(t > 0.8 && t < 2.2 ? 'Yes' : 'Run', 0.8); });
  // 7. Blue watches Brown go past
  shot(4, () => say('Blue', "That's Brown... he's strong. Really strong."), (t, sc) => {
    A.blue.faceA(A.brown); A.yellow.faceA(A.brown);
    overShoulder(A.blue, A.brown, { side: 1, k: 4 });
  });
  // 8. Flarix
  shot(4.5, () => say('Announcer', 'The fire of FLARIX!'), (t, sc) => { track(A.orange, { side: -1, dist: 5.5 }); if (sc > 36.2) A.orange.play('Wave'); });
  // 9. Rubrax: Red shouting at his team
  shot(5, () => say('Red', 'MOVE IT! FASTER! Show them who we are!'), (t, sc) => {
    const R = tm('RUBRAX').m; R[0].play(t % 1.2 < 0.6 ? 'Punch' : 'Run', 1.4); if (t % 1.2 < 0.6) R[0].cur = null;
    leadCam(R, { dist: 7.5, side: 2.4 });
  });
  // 10. the small teams, quick and funny
  shot(2.6, () => say('Announcer', 'WOBBLZ!'), (t, sc) => { const W = tm('WOBBLZ').m; if (t > 0.6) { W[1].play(t < 1.6 ? 'HitReact' : 'Jump_Land'); } leadCam(W, { dist: 7, side: 2 }); });
  shot(2.6, () => say('Announcer', 'The SNOOZIES... are they awake?'), (t, sc) => { tm('SNOOZIES').m.forEach((a) => a.play('Walk', 0.9)); tm('SNOOZIES').m[2].play('Duck'); leadCam(tm('SNOOZIES').m, { dist: 7, side: -2 }); });
  shot(2.6, () => say('Announcer', 'JELLYJAX!'), (t, sc) => { tm('JELLYJAX').m.forEach((a, i) => { a.p.y = Math.abs(Math.sin(sc * 6 + i)) * 0.8; a.play('Jump_Idle'); }); leadCam(tm('JELLYJAX').m, { dist: 7, side: 2 }); });
  shot(2.7, () => say('Announcer', 'And the little PEBBLINOS!'), (t, sc) => { const P = tm('PEBBLINOS').m; if (t > 1.2) P.forEach((a) => a.play('Wave')); leadCam(P, { dist: 5.5, side: -1.6, h: 1.8 }); });
  // 11. everyone lined up; the stadium hushes
  shot(4, () => { STAD.cheer.left = STAD.cheer.right = STAD.cheer.ends = 0.2; say('Announcer', 'And finally... the last team...'); }, (t, sc) => {
    camTo(V(0, 6 + t * 1.5, 26), V(0, 2 + t * 4.5, 0), 2.5);
  });
  // 12. Gold drops from the sky on a golden parachute
  shot(4, () => say('Announcer', 'Falling from the sky...!'), (t, sc) => {
    const k = goldAt(sc); A.gold.play('Jump_Idle');
    camTo(V(5, A.gold.p.y - 4 + 2, 9), V(A.gold.p.x, A.gold.p.y + 2.5, A.gold.p.z), 4);
    if (Math.floor(sc * 10) % 3 === 0) puffs.emit({ pos: V(A.gold.p.x, A.gold.p.y + 0.8, A.gold.p.z), vel: V(0, -1, 0), life: 0.8, size: 0.18, color: 0xffd23f });
  });
  shot(3.5, () => say('Announcer', '...the golden one... AUREX!!'), (t, sc) => {
    const k = goldAt(sc); A.gold.play(k < 1 ? 'Jump_Idle' : 'Jump_Land');
    camTo(V(7, 2.2, 6), V(A.gold.p.x, A.gold.p.y + 1.6, A.gold.p.z), 4);
    if (k >= 1 && sc < 69.5) for (let i = 0; i < 6; i++) puffs.emit({ pos: V(A.gold.p.x + Math.cos(i) * 0.6, 0.15, A.gold.p.z + Math.sin(i) * 0.6), vel: V(Math.cos(i) * 3, 0.8, Math.sin(i) * 3), life: 0.6, size: 0.3, color: 0xffe08a });
  });
  // 13. Gold shows off as his team jogs in behind him
  shot(3.5, () => { STAD.cheer.left = STAD.cheer.right = STAD.cheer.ends = 0.6; say('Gold', 'You may now applaud.'); }, (t, sc) => {
    goldAt(sc); A.gold.play(t < 1.6 ? 'Yes' : 'Wave');
    closeUp(A.gold, { ang: -0.35, dist: 2.6, h: 1.3 });
  });
  // 14. half the stadium chants for Aurex...
  shot(3.5, () => { STAD.cheer.left = 1.6; STAD.cheer.right = 0; say('Crowd', 'AUREX! AUREX! AUREX!'); }, (t, sc) => {
    goldAt(sc);
    fansL.forEach((a, i) => { a.show(true); a.p.y += Math.max(0, Math.sin(sc * 9 + i * 1.3)) * 0.45; a.play(i % 2 ? 'Yes' : 'Wave', 1.3); });
    camTo(V(-27, 2.2, 6), V(-37, 3.2, 0.5), 4);
  });
  // 15. ...the other half boos
  shot(3.5, () => { STAD.cheer.right = 0; say('Crowd', 'BOOOOOOO!'); }, (t, sc) => {
    goldAt(sc);
    fansR.forEach((a) => { a.show(true); a.play('No', 0.9); if (t % 1.4 < 0.05) a.cur = null; });
    camTo(V(27, 2.2, 6), V(37, 3.2, 0.5), 4);
  });
  // 16. Gold and Blue, face to face
  shot(3.6, () => { STAD.cheer.left = 0.5; STAD.cheer.right = 0.3; say('Gold', "Wave to the crowd, Blue. It's the only time you'll ever be on top."); }, (t, sc) => {
    goldAt(sc); A.gold.faceA(A.blue); A.blue.faceA(A.gold); A.yellow.faceA(A.gold);
    overShoulder(A.blue, A.gold, { side: -1, k: 4 });
  });
  shot(3, () => say('Yellow', "Ignore him. We'll talk on the field."), (t, sc) => {
    goldAt(sc); A.blue.faceA(A.gold); A.yellow.faceA(A.gold); A.yellow.play(t < 1.4 ? 'No' : 'Idle');
    frameGroup([A.yellow, A.blue], { side: 1, h: 1.1, dist: 0.7, k: 5 });
  });
  // 17. the eight games on the giant screen
  shot(5, () => { STAD.cheer.left = STAD.cheer.right = STAD.cheer.ends = 1; STAD.screen?.set('games'); say('Announcer', 'Eight games. Nine teams. Only ONE crown!'); }, (t, sc, T) => {
    goldAt(sc); fixed([0, 7 + t * 0.4, 10 - t * 0.8], [0, 23, -61]); fireworks(T, 1.5);
  });
  // 18. the crown, fireworks, everyone cheering
  shot(6, () => { STAD.cheer.left = STAD.cheer.right = STAD.cheer.ends = 1.6; say('Announcer', 'LET THE LEAGUE... BEGIN!'); }, (t, sc, T) => {
    goldAt(sc); for (const tt of teams) tt.m.forEach((a) => a && a.play(((sc * 3) | 0) % 2 ? 'Yes' : 'Wave'));
    const c = STAD.crown?.getWorldPosition(V()) || V(0, 4, -17), a = 0.8 + t * 0.18, r = 9 + t * 3;
    camTo(V(c.x + Math.sin(a) * r, c.y + 1 + t * 1.8, c.z + Math.cos(a) * r), c, 3);
    fireworks(T, 3.5);
    if (((T * 24) | 0) % 18 === 0) for (let i = 0; i < 40; i++) confetti.emit({ pos: V(c.x + ((i * 37) % 17 - 8), c.y + 8, c.z + ((i * 53) % 13 - 6)), vel: V(((i * 7) % 5 - 2), -1, ((i * 11) % 5 - 2)), life: 2.4, size: 1, g: 2, drag: 0.6, color: COLS[i % COLS.length], spin: 6 });
  });
  return SH;
}
