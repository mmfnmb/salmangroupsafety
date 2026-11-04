// Episode 1, scene 7: "The interview". Night at home; on TV, Gold says Blue will finish last. The remote drops.
import { V, PI, place, say, hideAll, frameGroup, closeUp, overShoulder, camTo, ease, lerp } from '../lib.js';
import { SOFA } from '../sets/studio.js';
import { tvCard, sit } from './s3.js';

export function shots(A) {
  let remote = null;
  const S = [];
  const sofaCam = (k = 4) => frameGroup([A.blue, A.yellow], { side: 1, h: 1.0, dist: 0.95, look: 1.1, k });
  // 1. a happy night on the sofa
  S.push({ dur: 5, set: 'sofa_night', time: 'night', setup() { hideAll(); sit(A.blue, 'L').play('Idle'); sit(A.yellow, 'R').play('Idle'); },
    upd(t) { camTo(V(lerp(-3.5, -1.5, ease(t / 5)), 2.6, 6.2), V(0, 1.1, -0.8), 3); say('Yellow', 'Tomorrow we sign up!'); if (t > 2.5) A.yellow.play('Yes'); } });
  S.push({ dur: 4, upd(t) { closeUp(A.blue, { ang: 0.3, dist: 2.2 }); say('Blue', 'Tomorrow... everything starts.'); } });
  // 2. on TV: the interview with Gold
  S.push({ dur: 5, set: 'studio', time: 'interior', card: tvCard('LIVE'),
    setup() { hideAll(); A.silver.at(1.6, 0, 2.6, PI / 2).play('Idle'); A.gold.at(4.0, 0, 2.6, -PI / 2).play('Wave'); },
    upd(t) { frameGroup([A.silver, A.gold], { side: 1, h: 1.3, look: 1.0 }); say('Anchor', 'Our special guest tonight... GOLD!'); } });
  S.push({ dur: 4.5, card: tvCard('LIVE'),
    setup() { A.gold.replay('Yes'); }, upd(t) { closeUp(A.gold, { ang: -0.35, dist: 2.3 }); say('Gold', 'Ha! Thank you, thank you. I know.'); } });
  S.push({ dur: 4.5, card: tvCard('LIVE'),
    setup() { A.silver.play('Idle'); }, upd(t) { overShoulder(A.gold, A.silver, { side: -1 }); say('Anchor', 'So... which team scares you the most?'); } });
  S.push({ dur: 4.5, card: tvCard('LIVE'),
    setup() { A.gold.replay('No'); }, upd(t) { closeUp(A.gold, { ang: 0.4, dist: 2.2 }); say('Gold', 'Scared? ME?'); if (t > 2.2) A.gold.play('Yes'); } });
  // he turns to the camera and talks straight to the viewer
  S.push({ dur: 7, card: tvCard('LIVE'),
    setup() { A.gold.at(4.0, 0, 2.6, 0).play('Idle'); },
    upd(t) {
      const k = ease(t / 7); camTo(V(4.0, 1.25, 2.6 + lerp(3.2, 1.6, k)), V(4.0, 1.05, 2.6), 2);
      say('Gold', t < 3 ? 'I\'ll tell you one thing...' : 'BLUE will finish LAST in the league.');
      if (t > 3 && t < 3.1) A.gold.replay('Punch', 0.6);
    } });
  // 3. home: the remote falls
  S.push({ dur: 5, set: 'sofa_night', time: 'night',
    setup() {
      hideAll(); sit(A.blue, 'L').play('Idle'); A.blue.mixer.timeScale = 1; sit(A.yellow, 'R').play('Idle');
      if (!remote) remote = place('f/f-speaker', 0, 0, 0, 0.55);
      remote.visible = true; remote.rotation.set(PI / 2, 0, 0.4);
    },
    upd(t, dt) {
      const h = A.blue.p; const k = Math.max(0, t - 1.6);
      // held at the hands, then slips and falls to the rug
      remote.position.set(h.x + 0.35, Math.max(0.06, SOFA.seatY + 0.75 - k * k * 6), h.z + 0.55 + k * 0.6);
      remote.rotation.z = 0.4 + k * 5; remote.rotation.x = PI / 2 + k * 3;
      camTo(V(h.x + 0.4, 1.35, h.z + lerp(4.2, 2.0, ease(t / 5))), V(h.x, 1.15, h.z), 3);
      say(null);
    } });
  S.push({ dur: 3.5, setup() { A.blue.mixer.timeScale = 0; }, upd(t) { closeUp(A.blue, { ang: 0, dist: 1.6, h: 1.2 }); } });
  S.push({ dur: 3.5, setup() { A.blue.mixer.timeScale = 1; },
    upd(t) { sofaCam(3); A.yellow.face(A.blue.p.x, A.blue.p.z); say('Yellow', '...Blue?'); } });
  S.push({ dur: 3, setup() { if (remote) remote.visible = false; }, upd(t) { camTo(V(-1.2, 1.25, 1.3), V(-0.75, 1.15, -0.8), 1.5); say(null); } });
  return S;
}
