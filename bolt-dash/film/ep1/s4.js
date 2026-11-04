// Episode 1, scene 4: "The palace" — Gold watches the league news and claims his three followers.
import { V, PI, ease, lerp, hideAll, camTo, closeUp, frameGroup, overShoulder, orbit, fixed, say } from '../lib.js';
import { PALACE } from '../sets/palace.js';

const TZ = -11.2, TY = 1.0; // where Gold stands, in front of the throne on the platform
const SPOT = PALACE.follow;
export function shots(A) {
  const G = A.gold, F = [A.silver, A.slate, A.olive];
  const pose = () => { G.at(0, TY, TZ, 0).play('Idle'); F.forEach((f, i) => f.at(SPOT[i][0], 0, SPOT[i][2], PI).play('Idle')); };
  // followers shake a little the whole time they stand in front of him
  const tremble = (T, k = 1) => F.forEach((f, i) => { f.p.x = SPOT[i][0] + Math.sin(T * 41 + i * 2) * 0.025 * k; f.m.rotation.z = Math.sin(T * 37 + i) * 0.03 * k; });
  const base = { set: 'palace', time: 'palace' };
  const S = [];
  const shot = (dur, setup, upd) => S.push({ ...base, dur, setup() { hideAll(); setup?.(); }, upd });

  // 1. outside: the golden palace, slow orbit
  shot(7, () => { pose(); }, (t) => { say(null); orbit([0, 8, 0], t, { r: 62, h: 26, speed: 0.06, from: 0.5, k: 99 }); });
  // 2. the hall from the gate, slow push towards the tiny figure on the throne
  shot(6, () => { pose(); }, (t) => { const k = ease(t / 6); camTo(V(0, lerp(5, 3.4, k), lerp(16, 4, k)), V(0, 2.2, -12), 99); });
  // 3. what he is watching: the big screen
  shot(5, () => { pose(); }, (t) => { fixed([0, 3.6, -7.5], [0, 5.1, 15.5]); say('TV', 'Nine teams. Eight games. One crown!'); });
  // 4. Gold, from below: he likes what he hears
  shot(5, () => { pose(); G.play('Yes', 0.8); }, (t) => { camTo(V(0.9, 1.1, -8.4), V(0, 2.4, TZ), 99); if (t > 1.2) say('gold', 'A league... with a crown.'); });
  // 5. the three followers, trembling
  shot(5, () => { pose(); }, (t, dt, T) => { tremble(T); const k = ease(t / 5); camTo(V(lerp(-2.5, 2.5, k), 1.1, -9.4), V(0, 0.9, -5.4), 99); });
  // 6. he gets up and walks down the steps towards them; low tracking shot
  shot(6, () => { pose(); }, (t) => {
    const k = ease(t / 6), z = lerp(TZ, -7.2, k), y = z < -9.6 ? TY : Math.max(0, TY - (z + 9.6) * 0.45);
    G.at(0, y, z, 0).play(k > 0 && k < 1 ? 'Walk' : 'Idle', 0.8);
    camTo(V(3.2, 0.7, z + 3.4), V(0, y + 1.3, z), 99);
  });
  // 7. over the followers' shoulders
  shot(5, () => { pose(); G.at(0, 0, -7.2, 0); }, (t, dt, T) => { tremble(T); camTo(V(3.4, 1.5, -3.2), V(0.2, 1.1, -7.2), 99); say('gold', 'You three.'); });
  // 8. he points at them: low close-up
  shot(5, () => { pose(); G.at(0, 0, -7.2, 0).play('Punch', 0.6); }, (t, dt, T) => { tremble(T); camTo(V(-3.6, 0.5, -4.6), V(0, 1.3, -7.2), 99); if (t > 0.8) say('gold', 'You are my team.'); });
  // 9. quick close-ups of each follower
  const fc = (i) => shot(2.2, () => { pose(); G.at(0, 0, -7.2, 0); }, (t, dt, T) => { tremble(T, 1.6); closeUp(F[i], { ang: 0.4 * (i - 1), dist: 1.6, h: 1.1, k: 99 }); say(null); });
  fc(0); fc(1); fc(2);
  // 10. the threat
  shot(5, () => { pose(); G.at(0, 0, -7.2, 0); }, (t) => { closeUp(G, { ang: 0.2, dist: 1.7, h: 0.9, k: 99 }); say('gold', 'If we lose...'); });
  // 11. silence, a slow push on his face
  shot(3, () => { pose(); G.at(0, 0, -7.2, 0); }, (t) => { const k = ease(t / 3); closeUp(G, { ang: 0.2, dist: lerp(1.7, 1.15, k), h: 1.05, k: 99 }); say(null); });
  // 12. they gulp and shrink
  shot(4, () => { pose(); G.show(false); F.forEach((f) => f.play('Duck', 0.8)); }, (t, dt, T) => { tremble(T, 2); camTo(V(0, 0.9, -8.6), V(0, 0.7, -5.4), 99); });
  // 13. he turns back to his throne laughing; wide from low
  shot(6, () => { pose(); G.at(0, 0, -7.2, PI); }, (t) => {
    const k = ease(t / 5), z = lerp(-7.2, TZ, k), y = z < -9.6 ? TY : Math.max(0, TY - (z + 9.6) * 0.45);
    G.at(0, y, z, PI).play(k < 1 ? 'Walk' : 'Yes', 0.8); if (k >= 1) G.m.rotation.y = 0;
    camTo(V(-6, 0.5, 2), V(0, 2.8, -10), 99); if (t > 4.6) say('gold', 'Ha... ha ha ha!');
  });
  // 14. outside again, pulling away from the palace
  shot(6, () => { pose(); }, (t) => { const k = ease(t / 6); camTo(V(lerp(10, 24, k), lerp(9, 30, k), lerp(46, 90, k)), V(0, 10, 0), 99); say(null); });
  return S;
}
