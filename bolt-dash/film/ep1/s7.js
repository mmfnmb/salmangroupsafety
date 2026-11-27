// Episode 1, scene 7: "The interview". Night at home; on TV, Gold says Blue will finish last. The remote drops.
import { V, PI, place, say, hideAll, frameGroup, closeUp, overShoulder, camTo, ease, lerp, useSet, THREE } from '../lib.js';
import { HOUSE } from '../sets/house.js';
import { tvCard, sit, tvCast } from './s3.js';

// night in the same living room: a warm lamp on, the TV glowing, stars outside the windows
function nightHouse() {
  const root = useSet('house_int');
  if (root.userData.night) return root;
  root.userData.night = true;
  const lamp = new THREE.PointLight(0xffc27a, 6, 10); lamp.position.set(-2.1, 2.4, 0.4); root.add(lamp);
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512; const g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#05061a'); gr.addColorStop(0.6, '#141a4a'); gr.addColorStop(1, '#2a2a6a'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + 0.7 * ((i * 37) % 100) / 100})`; g.fillRect((i * 733) % 1024, ((i * 389) % 300), 2, 2); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  root.add(new THREE.Mesh(new THREE.SphereGeometry(45, 32, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, toneMapped: false })));
  HOUSE.tvGlow.intensity = 3;
  return root;
}
const SEAT = HOUSE.seat;

export function shots(A) {
  let remote = null;
  const S = [];
  const sofaCam = (k = 4) => frameGroup([A.blue, A.yellow], { side: -1, h: 0.85, dist: 0.72, look: 0.85, k });
  // 1. a happy night on the sofa
  S.push({ dur: 5, set: 'house_int', time: 'night', setup() { nightHouse(); hideAll(); sit(A.blue, 'L').play('Idle'); sit(A.yellow, 'R').play('Idle'); },
    upd(t) { HOUSE.tvShow('news', t); camTo(V(lerp(-2.8, -1.4, ease(t / 5)), 1.8, -3.9), V(0, 0.9, -0.8), 3); say('Yellow', 'Tomorrow we sign up!'); if (t > 2.5) A.yellow.play('Yes'); } });
  S.push({ dur: 4, upd(t) { HOUSE.tvShow('gold', t); closeUp(A.blue, { ang: 0.4, dist: 2.0, h: 0.95 }); say('Blue', 'Tomorrow... everything starts.'); } });
  // 2. on TV: the interview with Gold
  S.push({ dur: 5, set: 'studio', time: 'interior', card: tvCard('LIVE'),
    setup() { hideAll(); tvCast().anchor.at(1.6, 0, 2.6, PI / 2).play('Idle'); A.gold.at(4.0, 0, 2.6, -PI / 2).play('Wave'); },
    upd(t) { frameGroup([tvCast().anchor, A.gold], { side: 1, h: 1.3, look: 1.0 }); say('Anchor', 'Our special guest tonight... GOLD!'); } });
  S.push({ dur: 4.5, card: tvCard('LIVE'),
    setup() { A.gold.replay('Yes'); }, upd(t) { closeUp(A.gold, { ang: -0.35, dist: 2.3 }); say('Gold', 'Ha! Thank you, thank you. I know.'); } });
  S.push({ dur: 4.5, card: tvCard('LIVE'),
    setup() { tvCast().anchor.play('Idle'); }, upd(t) { overShoulder(A.gold, tvCast().anchor, { side: -1 }); say('Anchor', 'So... which team scares you the most?'); } });
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
  S.push({ dur: 5, set: 'house_int', time: 'night',
    setup() {
      nightHouse(); hideAll(); sit(A.blue, 'L').play('Idle'); A.blue.mixer.timeScale = 1; sit(A.yellow, 'R').play('Idle');
      if (!remote) remote = place('f/f-speaker', 0, 0, 0, 0.55);
      remote.visible = true; remote.rotation.set(PI / 2, 0, 0.4);
    },
    upd(t, dt) {
      HOUSE.tvShow('gold', t);
      const h = A.blue.p; const k = Math.max(0, t - 1.6);
      // held at the hands (in front of him, he faces -z), then slips and falls to the rug
      remote.position.set(h.x + 0.3, Math.max(0.06, SEAT.y + 0.45 - k * k * 6), h.z - 0.5 - k * 0.5);
      remote.rotation.z = 0.4 + k * 5; remote.rotation.x = PI / 2 + k * 3;
      camTo(V(h.x + 0.4, 1.5, h.z - lerp(3.4, 2.0, ease(t / 5))), V(h.x, 0.75, h.z - 0.4), 3);
      say(null);
    } });
  S.push({ dur: 3.5, setup() { A.blue.mixer.timeScale = 0; }, upd(t) { closeUp(A.blue, { ang: 0, dist: 1.6, h: 0.95 }); } });
  S.push({ dur: 3.5, setup() { A.blue.mixer.timeScale = 1; },
    upd(t) { HOUSE.tvShow('gold', t); sofaCam(3); A.yellow.face(A.blue.p.x, A.blue.p.z); say('Yellow', '...Blue?'); } });
  S.push({ dur: 3, setup() { if (remote) remote.visible = false; }, upd(t) { camTo(V(-1.0, 1.1, -2.6), V(-0.6, 0.95, -0.8), 1.5); say(null); } });
  return S;
}
