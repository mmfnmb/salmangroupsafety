// Episode 1, scene 2: "The remote" — sofa fight over the TV, a chase round the coffee table, the remote flies and lands on the news.
import { hideAll, fixed, frameGroup, closeUp, chase, orbit, overShoulder, say, puffs, fx, V, PI, ease, lerp, clamp, put, useSet } from '../lib.js';
import { HOUSE } from '../sets/house.js';

const SEAT = HOUSE.seat; // sofa seat (world); seated cast face -z towards the TV
const YX = SEAT.yellow, BX = SEAT.blue; // where each one sits
const C = { x: 0.3, z: -3.6 }, R = 1.85; // chase circle round the coffee table

// standing up again: clear any tilt and release a held sitting pose
const stand = (a) => { a.m.rotation.x = 0; a.m.rotation.z = 0; a.stand(); };
// seated on the cushion (legs bent, hips on the seat)
function sit(a, x, ry = PI) { stand(a); a.sitAt(x, SEAT.y, SEAT.z, ry).show(); }
const tv = (mode, t) => HOUSE.tvShow(mode, t);
function remote() {
  const root = useSet('house_int');
  if (!root.userData.remote) {
    const o = put(root, 'f/f-speaker', 0, 0, 0, 0.55);
    o.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.setHex(0x22222a); } });
    root.userData.remote = o;
  }
  return root.userData.remote;
}
// the remote held in the right hand
function inHand(a, o) { const f = a.m.rotation.y + 1.0; o.position.set(a.p.x + Math.sin(f) * 0.38, a.p.y + 0.62, a.p.z + Math.cos(f) * 0.38); o.rotation.set(0, a.m.rotation.y, 0); o.visible = true; }
// a point on the chase circle and the way along it
const onCircle = (th) => ({ x: C.x + Math.sin(th) * R, z: C.z + Math.cos(th) * R, ry: Math.atan2(Math.cos(th), -Math.sin(th)) });
function runCircle(a, th) { const c = onCircle(th); stand(a); a.at(c.x, 0, c.z, c.ry); a.play('Run', 1.6); }

export function shots(A) {
  const B = A.blue, Y = A.yellow;
  return [
    // 1. the two of them on the sofa, Yellow flicking channels
    { dur: 5, set: 'house_int', time: 'interior', setup() { hideAll(); sit(B, BX); sit(Y, YX); say('Yellow', 'Cooking show... cooking show...'); }, upd(t) {
      tv('flip', t); inHand(Y, remote());
      const k = ease(t / 5); fixed([lerp(2.6, 1.8, k), lerp(1.7, 1.5, k), lerp(-3.9, -3.3, k)], [0, 0.95, -0.8]);
    } },
    // 2. Yellow finds the cooking channel
    { dur: 4, set: 'house_int', time: 'interior', setup() { sit(B, BX); sit(Y, YX); say('Yellow', 'Ooh! Chef Waffle is on!'); }, upd(t) {
      tv(t < 1.2 ? 'flip' : 'cooking', t * 2); inHand(Y, remote());
      closeUp(Y, { ang: -0.25, dist: 2.0, h: 0.95 });
    } },
    // 3. Blue is not having it
    { dur: 4, set: 'house_int', time: 'interior', setup() { sit(B, BX); sit(Y, YX); say('Blue', 'No way. The MATCH is on!'); }, upd(t) {
      tv('cooking', t); inHand(Y, remote());
      if (t > 1.4) B.m.rotation.y = PI + Math.sin(t * 6) * 0.3;
      closeUp(B, { ang: 0.25, dist: 2.0, h: 0.95 });
    } },
    // 4. a grab for it
    { dur: 5, set: 'house_int', time: 'interior', setup() { sit(B, BX); sit(Y, YX); say('Yellow', 'Finders keepers!'); }, upd(t) {
      inHand(Y, remote());
      if (t > 0.6 && t < 0.7) { B.cur = null; B.replay('Punch', 1.2); }
      Y.m.rotation.y = PI - clamp((t - 0.7) * 2, 0, 1) * 0.9; // turns the remote away
      if (t > 2.6) say('Blue', 'Hand. It. Over.');
      frameGroup([B, Y], { side: -1, h: 0.9, dist: 0.7, look: 0.8 });
    } },
    // 5. tug of war, both standing on the sofa
    { dur: 5, set: 'house_int', time: 'interior', setup() {
      hideAll(); stand(B); stand(Y); B.at(-0.35, SEAT.y + 0.1, SEAT.z, PI / 2).show(); Y.at(0.45, SEAT.y + 0.1, SEAT.z, -PI / 2).show(); say('Blue', 'Give... me... that!');
    }, upd(t) {
      const pull = Math.sin(t * 5) * 0.12; B.at(-0.35 + pull, SEAT.y + 0.1, SEAT.z); Y.at(0.45 + pull, SEAT.y + 0.1, SEAT.z);
      B.play(Math.sin(t * 5) > 0 ? 'Punch' : 'Idle', 1.6); Y.play(Math.sin(t * 5) < 0 ? 'Punch' : 'Idle', 1.6);
      const o = remote(); o.position.set(0.05 + pull, SEAT.y + 0.75, SEAT.z); o.visible = true;
      frameGroup([B, Y], { side: -1, h: 1.2, dist: 0.75, look: 1.2 });
    } },
    // 6. Yellow wins it and bolts
    { dur: 5, set: 'house_int', time: 'interior', setup() { hideAll(); stand(B); stand(Y); B.show(); Y.show(); say('Yellow', 'Catch me first!'); }, upd(t) {
      Y.move(t, 0, 1.4, [0.45, -0.05], [onCircle(0.4).x, onCircle(0.4).z], { run: true, speed: 1.6 });
      if (t > 1.4) runCircle(Y, 0.4 + (t - 1.4) * 1.1);
      B.move(t, 0.6, 2.2, [-0.35, -0.05], [onCircle(-0.7).x, onCircle(-0.7).z], { run: true, speed: 1.6 });
      if (t > 2.2) runCircle(B, -0.7 + (t - 2.2) * 1.1);
      inHand(Y, remote());
      fixed([3.6, 2.9, -0.6], [0.3, 0.6, -3.0]);
    } },
    // 7. round and round the coffee table
    { dur: 6, set: 'house_int', time: 'interior', setup() { hideAll(); B.show(); Y.show(); say('Blue', 'Come back here!'); }, upd(t) {
      const th = 0.4 + (3.6 + t) * 1.1; runCircle(Y, th); runCircle(B, th - 1.2 + t * 0.06);
      inHand(Y, remote());
      if (t > 3.2) say('Yellow', 'Hahaha! Too slow!');
      orbit([C.x, 0, C.z], t, { r: 4.4, h: 2.6, speed: 0.18, from: 2.2 });
    } },
    // 8. Blue dives... Yellow sidesteps, Blue slides along the rug
    { dur: 5, set: 'house_int', time: 'interior', setup() { hideAll(); B.show(); Y.show(); this.d = null; say('Blue', 'HYAAAA!'); }, upd(t) {
      const th = 0.4 + 9.6 * 1.1; // where they are now on the circle
      const yc = onCircle(th + 0.2), bc = onCircle(th - 0.9);
      stand(Y); Y.at(yc.x + (t > 0.7 ? clamp((t - 0.7) * 3, 0, 1) * 1.2 : 0), 0, yc.z, yc.ry); Y.play(t > 0.7 && t < 1.6 ? 'Jump' : 'Idle', 1.4);
      inHand(Y, remote());
      const k = clamp(t / 1.3, 0, 1), dx = yc.x - bc.x, dz = yc.z - bc.z, l = Math.hypot(dx, dz) || 1;
      const bx = bc.x + dx / l * (k * 4.2), bz = bc.z + dz / l * (k * 4.2);
      stand(B); B.at(bx, Math.sin(k * PI) * 0.7, bz, Math.atan2(dx, dz)); B.play(t < 1.3 ? 'Jump_Idle' : 'HitReact', 1);
      if (t < 1.3) B.m.rotation.x = 0.9 * Math.sin(k * PI); else { B.m.rotation.x = PI / 2 * 0.85; B.at(bx, 0.25, bz); if (!this.d) { this.d = 1; fx.dust(V(bx, 0.1, bz), 16, 0xf3ecdf, 3); } }
      fixed([C.x + 3.4, 2.4, C.z + 2.4], [C.x + 0.3, 0.5, C.z]);
    } },
    // 9. ...and the remote goes flying
    { dur: 4, set: 'house_int', time: 'interior', setup() { hideAll(); B.show(); Y.show(); say('Yellow', 'Oops!'); }, upd(t) {
      const th = 0.4 + 9.6 * 1.1, yc = onCircle(th + 0.2);
      stand(Y); Y.at(yc.x + 1.2, 0, yc.z, PI); Y.play('No', 1);
      const o = remote(), k = clamp(t / 2.4, 0, 1), from = V(yc.x + 1.2, 0.9, yc.z), to = V(0.1, SEAT.y + 0.32, SEAT.z);
      o.position.set(lerp(from.x, to.x, k), lerp(from.y, to.y, k) + Math.sin(k * PI) * 2.0, lerp(from.z, to.z, k)); o.rotation.set(k * 9, k * 6, 0); o.visible = true;
      if (t > 1.2) say('Blue', 'NOOO!');
      fixed([3.8, 2.2, -4.6], [lerp(from.x, to.x, 0.5), 1.2, lerp(from.z, to.z, 0.5)]);
    } },
    // 10. it lands on the cushion... click
    { dur: 3, set: 'house_int', time: 'interior', setup() { hideAll(); say(null); this.f = 0; }, upd(t) {
      const o = remote(); const b = Math.max(0, Math.sin(t * 9) * Math.exp(-t * 4)) * 0.25;
      o.position.set(0.1, SEAT.y + 0.32 + b, SEAT.z); o.rotation.set(0, 0.4, 0); o.visible = true;
      tv(t > 0.75 ? 'news' : t > 0.5 ? 'flip' : 'cooking', t);
      if (t > 0.5) { if (!this.f) { this.f = 1; fx.burst(V(0.1, SEAT.y + 0.5, SEAT.z), 0xffffff, 8, 2, 0.6); } }
      fixed([0.7, 1.35, -2.0], [0.1, SEAT.y + 0.35, SEAT.z]);
    } },
    // 11. the news comes on: both freeze and turn
    { dur: 5, set: 'house_int', time: 'interior', setup() { hideAll(); stand(B); stand(Y); B.at(-0.6, 0, -2.0, 0).show().replay('Idle'); Y.at(1.4, 0, -1.9, 0).show().replay('Idle'); say('TV', 'BREAKING NEWS!'); }, upd(t) {
      tv('news', t);
      const k = ease((t - 0.8) / 0.8); B.m.rotation.y = lerp(0, PI, k); Y.m.rotation.y = lerp(0, PI, ease((t - 1.1) / 0.8));
      frameGroup([B, Y], { side: -1, h: 1.3, dist: 0.8, look: 1.0 });
    } },
    // 12. over their shoulders: the TV glowing
    { dur: 6, set: 'house_int', time: 'interior', setup() { hideAll(); stand(B); stand(Y); B.at(-0.6, 0, -2.0, PI).show().play('Idle'); Y.at(1.4, 0, -1.9, PI).show().play('Idle'); say('Blue', 'Wait... what is this?'); }, upd(t) {
      tv('news', t);
      if (t > 3) say('Yellow', 'Turn it up! TURN IT UP!');
      const k = ease(t / 6); fixed([lerp(0.4, 0.3, k), lerp(3.4, 2.9, k), lerp(3.2, 1.8, k)], [0.1, 1.2, -7.0]);
    } },
    // 13. close on the screen
    { dur: 5, set: 'house_int', time: 'interior', setup() { hideAll(); stand(B); stand(Y); B.at(-0.6, 0, -2.0, PI).show(); Y.at(1.4, 0, -1.9, PI).show(); say('TV', 'This is huge, folks. Stay with us...'); }, upd(t) {
      tv('news', t);
      const k = ease(t / 5); fixed([lerp(0.2, 0.05, k), lerp(1.6, 1.4, k), lerp(-3.4, -5.0, k)], [0, 1.37, -7.03]);
    } },
    // 14. the two of them, eyes wide
    { dur: 5, set: 'house_int', time: 'interior', setup() { hideAll(); stand(B); stand(Y); B.at(-0.6, 0, -2.0, PI).show().play('Idle'); Y.at(1.4, 0, -1.9, PI).show().play('Idle'); say(null); }, upd(t) {
      tv('news', t);
      if (t > 2.5) { say('Blue', '...!'); B.play('Yes', 1); Y.play('Yes', 1); }
      fixed([-3.0, 1.6, -3.6], [0.4, 1.0, -1.95]);
    } },
  ];
}
