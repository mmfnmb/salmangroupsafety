// Episode 1, scene 5: "Tryouts" — Splashvolt finds Vio and Minto, then Brown clears the course perfectly.
import { V, PI, G, ease, lerp, clamp, hideAll, camTo, closeUp, frameGroup, overShoulder, track, chase, orbit, fixed, say, useSet, Actor, ACTORS, fx, puffs } from '../lib.js';
import { COURSE, DESK } from '../sets/tryouts.js';

const X = COURSE.x;
// ---- the course, as a runner sees it: hop the spinning arm when it sweeps past, jump the saw, spring up to the deck, leap the gap
const baseY = (z) => (z > COURSE.spring ? 0 : z > -16.6 ? (() => { const k = (COURSE.spring - z) / (COURSE.spring + 16.6); return 2 * k + Math.sin(k * PI) * 3.2; })() : 2);
function courseY(x, z, T) {
  let y = baseY(z);
  if (z < -6.6 && z > -9.4) y += Math.sin(((-6.6 - z) / 2.8) * PI) * 2.3; // saw
  if (z < -21.4 && z > -25.6) y += Math.sin(((-21.4 - z) / 4.2) * PI) * 1.7; // gap
  for (const sw of G.level?.sweepers || []) {
    const rx = x - sw.x, rz = z - sw.z; if (Math.hypot(rx, rz) > sw.len + 0.5) continue;
    const a = sw.w * T, perp = Math.abs(-rx * Math.sin(a) - rz * Math.cos(a));
    y += 1.6 * Math.cos(Math.min(1, perp / 1.25) * PI / 2);
  }
  return y;
}
const spinArms = (T) => { for (const sw of G.level?.sweepers || []) sw.body.quaternion.setFromEuler(0, sw.w * T, 0); };
// run the course from the start line at a given speed; returns z
function runCourse(a, t, T, speed, { spin = false, x = X } = {}) {
  const z = Math.max(COURSE.start - t * speed, -30), y = courseY(x, z, T), air = y > baseY(z) + 0.2 || (z < COURSE.spring + 0.2 && z > -16.6);
  a.at(x, y, z, PI); a.play(z <= -30 ? 'Yes' : air ? 'Jump_Idle' : 'Run', 1.4);
  if (spin && air) a.m.rotation.y = PI + (COURSE.start - z) * 0.9;
  return z;
}

export function shots(A) {
  const extra = (look) => { const a = new Actor(look); ACTORS.push(a); return a; };
  const straw = extra({ skin: 'skin-straw', head: 'h-cone' }), melon = extra({ skin: 'skin-melon' });
  const oTeam = [extra({ skin: 'skin-grape' }), extra({ skin: 'skin-snow' }), extra({ skin: 'skin-lemon' })];
  const rTeam = [extra({ skin: 'skin-night' }), extra({ skin: 'skin-mint' }), extra({ skin: 'skin-straw' })];
  const B = A.blue, Y = A.yellow, Vi = A.vio, Mi = A.minto, Br = A.brown;
  // Blue and Yellow stand beside the start, watching; the candidates wait behind them
  const judges = () => { B.at(-4.4, 0, 9.5, PI * 0.8).play('Idle'); Y.at(-5.6, 0, 8.6, PI * 0.8).play('Idle'); };
  const fans = (k) => { const r = useSet('tryouts'); if (r.userData.fans) r.userData.fans.userData.cheer = k; for (const a of r.userData.queue || []) a.show(true); };
  const S = [];
  const shot = (dur, setup, upd) => S.push({ set: 'tryouts', time: 'day', dur, setup() { hideAll(); fans(0); setup?.(); }, upd(t, dt, T) { spinArms(T); upd(t, dt, T); } });

  // 1. the field: crowds, the course, the long sign-up queue
  shot(6, () => { judges(); }, (t) => { orbit([2, 0, -6], t, { r: 34, h: 16, speed: 0.07, from: 2.2, k: 99 }); });
  // 2. along the queue to Blue and Yellow at the desk
  shot(6, () => { B.at(DESK.x + 0.4, 0, DESK.z - 0.2, -PI / 2); Y.at(DESK.x + 0.4, 0, DESK.z + 1.2, -PI / 2); A.ref.at(DESK.x - 1.6, 0, DESK.z - 1.2, PI / 2); },
    (t) => { const k = ease(t / 6); camTo(V(DESK.x + 6, 2.4, lerp(DESK.z + 24, DESK.z + 4, k)), V(DESK.x, 1.2, lerp(DESK.z + 12, DESK.z, k)), 99); if (t > 3) say('yellow', 'We need two more players.'); });
  // 3. at the desk
  shot(6, () => { B.at(DESK.x + 0.4, 0, DESK.z - 0.2, -PI / 2).play('Wave'); Y.at(DESK.x + 0.4, 0, DESK.z + 1.2, -PI / 2); A.ref.at(DESK.x - 1.6, 0, DESK.z - 0.6, PI / 2); },
    (t) => { frameGroup([A.ref, B, Y], { side: 1, h: 1.1, dist: 0.8, look: 1.0, k: 99 }); say(t < 3 ? 'blue' : 'ref', t < 3 ? 'Team Splashvolt! We are two.' : 'You need four. Find them here.'); });
  // 4. Blue and Yellow at the start, a line of hopefuls
  shot(4, () => { judges(); straw.at(-1, 0, 11, PI); melon.at(-2.5, 0, 12, PI); Vi.at(1.5, 0, 12.4, PI); Mi.at(3.2, 0, 11.6, PI).play('Wave'); },
    (t) => { camTo(V(-1.6, 1.6, 6.4), V(0.2, 1.0, 11.6), 99); say('blue', 'Okay! Who wants to try?'); });
  // 5. candidate one: runs straight into the spinning arm
  shot(6, () => { judges(); }, (t, dt, T) => {
    const hitT = 2.3;
    if (t < hitT) { const z = COURSE.start - t * 4.2; straw.at(X, 0, z, PI).play('Run', 1.3); say('candidate', 'Wheee!'); }
    else { const u = t - hitT; if (!straw.hit) { straw.hit = 1; straw.play('HitReact'); fx.burst(V(X, 1.2, straw.p.z), 0xffd23f, 14, 6); } straw.at(X + u * 5.5, Math.max(0, 1.4 + u * 5 - u * u * 9), straw.p.z + u * 0.8, PI); straw.m.rotation.z = Math.min(u * 6, 1.5); if (u > 0.9) straw.play('Death'); say(null); }
    const fz = straw.hit ? -1.2 : straw.p.z; camTo(V(X + 6.5, 3.0, fz - 1.2), V(X + (straw.hit ? 1.5 : 0), 0.9, fz - 1.2), 6);
  });
  // 6. Yellow winces
  shot(3, () => { judges(); Y.play('No'); }, (t) => { closeUp(Y, { ang: -0.2, dist: 1.8, k: 99 }); say('yellow', 'Ouch.'); });
  // 7. candidate two: off he goes... the wrong way
  shot(5, () => { judges(); melon.at(X, 0, COURSE.start, PI); }, (t) => {
    const k = clamp((t - 0.8) / 4, 0, 1); melon.at(X + k * 3, 0, COURSE.start + k * 22, 0).play(k > 0 && k < 1 ? 'Run' : 'Idle', 1.3);
    camTo(V(X - 4.5, 2.4, COURSE.start - 5), V(melon.p.x, 1, melon.p.z), 4); if (t > 2) say('candidate', 'Here I gooo!');
  });
  // 8. Blue
  shot(3, () => { judges(); B.play('No'); }, (t) => { closeUp(B, { ang: 0.25, dist: 1.9, k: 99 }); say('blue', '...Other way!'); });
  // 9. Vio steps up, shy
  shot(4, () => { judges(); Vi.at(X, 0, COURSE.start + 0.3, PI); }, (t) => { closeUp(Vi, { ang: 0.6, dist: 2.0, k: 99 }); say('vio', 'I... I timed the arm. Every few seconds.'); });
  // 10. Vio's run: careful and clean, the camera running alongside
  shot(10, () => { judges(); }, (t, dt, T) => {
    const z = runCourse(Vi, t, T, 4.1);
    if (z > COURSE.spring) track(Vi, { side: -1, dist: 6.2, h: 2.0, lead: 1.4 }); else chase(Vi, { back: 5, side: 2.2, h: 3.0, ahead: 2 });
    say(null);
  });
  // 11. Blue and Yellow impressed
  shot(4, () => { judges(); B.play('Yes'); Y.play('Wave'); }, (t) => { frameGroup([Y, B], { side: -1, h: 1.2, dist: 0.8, k: 99 }); say('yellow', 'Clean! Every single jump!'); });
  // 12. Minto: loud, spinning in the air
  shot(4, () => { judges(); Mi.at(X, 0, COURSE.start + 0.3, PI).play('Wave'); }, (t) => { closeUp(Mi, { ang: 0.6, dist: 2.0, k: 99 }); say('minto', 'My turn! Watch THIS!'); });
  shot(10, () => { judges(); }, (t, dt, T) => {
    const z = runCourse(Mi, t, T, 5.2, { spin: true });
    if (z > COURSE.spring) track(Mi, { side: -1, dist: 6.4, h: 2.2, lead: 1.4 }); else chase(Mi, { back: 5, side: 2.2, h: 3.0, ahead: 2 });
    say(null); if (z <= -30) say('minto', 'TA-DAAA!');
  });
  // 13. they're in
  shot(6, () => { B.at(0.6, 2, -28, 0).play('Yes'); Y.at(-0.8, 2, -28.6, 0.3).play('Wave'); Vi.at(1.8, 2, -29.8, PI * 0.9); Mi.at(-1.6, 2, -30, PI).play('Yes'); },
    (t) => { frameGroup([Mi, Y, B, Vi], { side: 1, h: 1.0, dist: 0.85, look: 1.0, k: 99 }); say(t < 3 ? 'blue' : 'yellow', t < 3 ? "You're both in!" : 'Splashvolt is complete!'); });
  // 14. murmurs: Brown walks to the start; low and slow
  shot(5, () => { judges(); Vi.at(-3.2, 0, 10.4, PI * 0.8); Mi.at(-2.4, 0, 11.2, PI * 0.8); }, (t) => {
    const k = ease(t / 4.4); Br.at(lerp(-8, X, k), 0, lerp(18, COURSE.start + 0.2, k), lerp(-PI * 0.3, PI, k)).play(k < 1 ? 'Walk' : 'Idle');
    camTo(V(Br.p.x + 2.2, 0.55, Br.p.z - 3.2), V(Br.p.x, 1.4, Br.p.z), 6); if (t > 2.6) say('minto', "Who's that?");
  });
  // 15. Brown's run: fast and perfect; the crowd goes wild
  shot(4.2, () => { judges(); Vi.at(-3.2, 0, 10.4, PI * 0.8); Mi.at(-2.4, 0, 11.2, PI * 0.8); fans(1); }, (t, dt, T) => {
    const z = runCourse(Br, t, T, 5.4); track(Br, { side: -1, dist: 6.5, h: 2.0, lead: 1.6 }); say(null);
  });
  shot(3.8, () => { fans(1); }, (t, dt, T) => { const z = runCourse(Br, t + 4.2, T, 5.4); chase(Br, { back: 5.2, side: 2.4, h: 3.2, ahead: 2.5 }); });
  // 16. he lands at the finish, calm; wide on the cheering crowd
  shot(4, () => { Br.at(X, 2, -30, PI).play('Idle'); fans(1); }, (t) => { closeUp(Br, { ang: 0.2, dist: 2.2, h: 1.2, k: 99 }); });
  shot(4, () => { Br.at(X, 2, -30, PI).play('Idle'); fans(1); }, (t) => { fixed([16, 7, -6], [0, 1, -12]); });
  // 17. Blue whispers to Yellow
  shot(5, () => { judges(); B.m.rotation.y = -PI * 0.45; Y.m.rotation.y = PI * 0.6; }, (t) => { overShoulder(Y, B, { side: -1, k: 99 }); say('blue', "He's strong... really strong."); });
  // 18. Brown walks past them and nods
  shot(6, () => { judges(); Vi.at(-3.2, 0, 10.6, PI * 0.8); Mi.at(-2.2, 0, 11.4, PI * 0.8); }, (t) => {
    const k = ease(t / 5.2); Br.at(lerp(4, -9, k), 0, lerp(6.5, 12.5, k), -PI / 2 - 0.4).play(k < 1 ? 'Walk' : 'Idle');
    if (t > 2 && t < 3) { Br.face(B.p.x, B.p.z); Br.play('Yes', 0.7); }
    frameGroup([B, Br], { side: -1, h: 1.3, dist: 1.1, k: 4 }); say(t > 2 && t < 4 ? 'brown' : null, 'Good luck.');
  });
  // 19. the new team, side by side
  shot(6, () => { B.at(-4.4, 0, 9.5, PI * 0.75); Y.at(-5.6, 0, 8.8, PI * 0.75); Vi.at(-3.2, 0, 10.4, PI * 0.75); Mi.at(-2.1, 0, 11.2, PI * 0.75).play('Wave'); },
    (t) => { frameGroup([Y, B, Vi, Mi], { side: -1, h: 1.2, dist: 0.85, k: 99 }); say(t < 3 ? 'minto' : 'vio', t < 3 ? 'Pfff. We are stronger.' : 'Statistically... no.'); });
  // 20. quick cuts: Orange's team full of energy; Red yelling at his
  shot(5, () => { A.orange.at(-14, 0, 14, 0.4).play('Wave'); oTeam.forEach((a, i) => a.at(-15.8 + i * 1.6, 0, 15.6, 0.3).play(i === 1 ? 'Yes' : 'Wave')); },
    (t) => { frameGroup([oTeam[0], A.orange, oTeam[1], oTeam[2]], { side: 1, h: 1.2, dist: 0.85, k: 99 }); say('orange', 'Team Flarix is ON FIRE!'); });
  shot(5, () => { A.red.at(-14, 0, -4, PI / 2).play('Punch'); rTeam.forEach((a, i) => a.at(-11.6, 0, -5.6 + i * 1.6, -PI / 2).play('Duck')); },
    (t) => { if (t > 2.4 && t < 2.5) A.red.replay('No'); frameGroup([A.red, ...rTeam], { side: -1, h: 1.1, dist: 0.9, k: 99 }); say('red', 'Faster! Are you SLEEPING?!'); });
  return S;
}
