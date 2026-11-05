// Episode 1, scene 1: "Morning" — the house by the sea, Blue's alarm and fall out of bed, Yellow burns the toast.
import { hideAll, fixed, orbit, frameGroup, closeUp, track, say, puffs, fx, V, PI, ease, lerp, clamp, put, useSet } from '../lib.js';
import { HOUSE } from '../sets/house.js';

// world positions inside the house (the set is scaled by HOUSE.K)
const BED = { x: -7.8, y: 0.88, z: -4.85 }; // y: mattress top + half the body's depth, so his back rests on it // feet end of the bed; Blue lies with his head towards -z
const RADIO = V(-6.1, 1.15, -6.94);
const COUNTER = { x: 5.4, z: -5.75 }; // Yellow stands here facing the toaster / stove
const TOASTER = V(4.85, 1.3, -6.95);
const TABLE = { x: 6.8, z: -2.56 };

// little helpers shared by the shots
const stand = (a) => { a.m.rotation.x = 0; a.m.rotation.z = 0; };
const lie = (a) => { stand(a); a.at(BED.x, BED.y, BED.z, 0); a.m.rotation.x = -PI / 2; };
let last = -1;
const every = (t, step) => { const k = Math.floor(t / step); if (k !== last) { last = k; return true; } return false; };
// two burnt slices on the table (added to the current set, so they go away with it)
function burntToast() {
  const root = useSet('house_int');
  if (root.userData.toast) return;
  root.userData.toast = true;
  for (const [dx, dz] of [[-0.4, -0.25], [0.4, 0.25]]) {
    const o = put(root, 'k/loaf-baguette', TABLE.x + dx, 1.04, TABLE.z + dz, 0.55, 0.6);
    o.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.setHex(0x2a1a10); } });
  }
}
// grey smoke rising out of the toaster; amount 0..1
function smoke(amount, dt) {
  const n = 2 + Math.round(amount * 6);
  for (let i = 0; i < n; i++) puffs.emit({ pos: V(TOASTER.x + (Math.random() - 0.5) * 0.3, TOASTER.y + 0.1, TOASTER.z + (Math.random() - 0.5) * 0.25), vel: V((Math.random() - 0.5) * 0.5, 0.7 + Math.random() * 0.7, 0.3 + Math.random() * 0.6 * amount), life: 1.2 + amount * 1.2, size: 0.045 + Math.random() * 0.06 + amount * 0.04, drag: 1.4, g: -0.3, color: [0xf0f0f4, 0xe2e2e8, 0xd4d4dc][i % 3], shrink: true });
}
// soft "z" puffs over the sleeper
function zzz(t) { if (every(t, 0.9)) puffs.emit({ pos: V(BED.x + 0.1, BED.y + 0.5, BED.z - 1.2), vel: V(0.15, 0.6, 0.1), life: 1.6, size: 0.18, drag: 0.3, g: -0.2, color: 0xffffff }); }

export function shots(A) {
  const B = A.blue, Y = A.yellow;
  return [
    // 1. the house on the coast, the camera drifting in
    { dur: 7, set: 'house_ext', time: 'morning', setup() { hideAll(); }, upd(t) { orbit([0, 1, -4], t, { r: lerp(34, 24, ease(t / 7)), h: lerp(13, 7, ease(t / 7)), speed: 0.06, from: -0.5 }); } },
    // 2. closer: the front of the house, the sun up over the sea
    { dur: 4, set: 'house_ext', time: 'morning', setup() { hideAll(); }, upd(t) { const k = ease(t / 4); fixed([lerp(5, 2, k), lerp(4, 3.4, k), lerp(16, 11, k)], [0, 3, -4]); } },
    // 3. inside: Blue fast asleep
    { dur: 5, set: 'house_int', time: 'interior', setup() { hideAll(); lie(B); B.show().play('Idle'); last = -1; }, upd(t) { zzz(t); const k = ease(t / 5); fixed([lerp(-4.9, -5.6, k), lerp(2.6, 2.3, k), lerp(-2.2, -3.0, k)], [-7.6, 1.2, -5.4]); } },
    // 4. the radio alarm goes off
    { dur: 4, set: 'house_int', time: 'interior', setup() { hideAll(); lie(B); B.show(); last = -1; say('Radio', 'BEEP! BEEP! BEEP!'); }, upd(t) {
      if (every(t, 0.28)) fx.burst(RADIO.clone(), [0xffd23f, 0xff4f9a][Math.floor(t / 0.28) % 2], 8, 2.5, 0.8);
      fixed([-3.6, 2.2, -3.2], [-6.4, 1.1, -6.3]);
    } },
    // 5. Blue flails, still half asleep
    { dur: 4, set: 'house_int', time: 'interior', setup() { hideAll(); lie(B); B.show().replay('No', 1.4); last = -1; say('Blue', 'Five more minutes...'); }, upd(t) {
      if (every(t, 0.35)) fx.burst(RADIO.clone(), 0xffd23f, 6, 2.2, 0.7);
      B.m.rotation.z = Math.sin(t * 9) * 0.25;
      fixed([-5.2, 2.6, -2.8], [-7.6, 1.2, -5.4]);
    } },
    // 6. ...and rolls straight off the bed
    { dur: 4, set: 'house_int', time: 'interior', setup() { hideAll(); lie(B); B.show().replay('HitReact', 1); last = -1; say('Blue', 'WHOAAA!'); }, upd(t) {
      const k = clamp(t / 0.9, 0, 1);
      if (t < 0.9) { B.at(lerp(BED.x, -6.0, k), BED.y + Math.sin(k * PI) * 0.6 - k * BED.y, lerp(BED.z, -5.6, k), 0); B.m.rotation.x = -PI / 2; B.m.rotation.z = -k * PI * 0.9; }
      else { if (!B.landed) { B.landed = 1; fx.dust(V(-6.0, 0.1, -5.6), 14, 0xf3ecdf, 3); B.replay('Jump_Land'); } B.m.rotation.z = -PI * 0.9; B.at(-6.0, 0.31, -5.6, 0); B.m.rotation.x = -PI / 2; }
      if (t > 2.2) { B.landed = 0; stand(B); B.at(-6.0, 0, -5.4, PI / 2); B.play('No', 1); }
      fixed([-3.0, 2.4, -1.0], [-6.6, 0.7, -5.2]);
    } },
    // 7. meanwhile in the kitchen: Yellow on breakfast duty
    { dur: 5, set: 'house_int', time: 'interior', setup() { hideAll(); stand(Y); Y.at(COUNTER.x, 0, COUNTER.z, PI).show().play('Idle'); say('Yellow', 'Breakfast is almost ready!'); }, upd(t, dt) {
      if (t > 2.5) smoke((t - 2.5) / 2.5 * 0.4, dt);
      Y.m.rotation.y = PI + Math.sin(t * 3) * 0.25; // humming along
      const k = ease(t / 5); fixed([lerp(3.2, 3.6, k), 2.3, lerp(-1.6, -2.4, k)], [5.2, 1.1, -6.4]);
    } },
    // 8. the toaster starts pouring smoke
    { dur: 5, set: 'house_int', time: 'interior', setup() { hideAll(); stand(Y); Y.at(COUNTER.x, 0, COUNTER.z, PI).show().replay('Duck', 1); say('Yellow', 'Uh oh...'); }, upd(t, dt) {
      smoke(0.6 + t / 5 * 0.4, dt);
      if (t > 2.4) { Y.m.rotation.y = 0; Y.play('Wave', 1.6); }
      fixed([4.2, 1.9, -3.4], [5.0, 1.3, -6.4]);
    } },
    // 9. Blue sniffs the air and runs through the living room
    { dur: 5, set: 'house_int', time: 'interior', setup() { hideAll(); stand(B); B.show(); stand(Y); Y.at(COUNTER.x, 0, COUNTER.z, 0).show().play('Duck'); say('Blue', 'Is something BURNING?!'); }, upd(t, dt) {
      smoke(1, dt);
      B.move(t, 0.3, 4.6, [-6.0, -4.4], [4.4, -4.4], { run: true, speed: 1.5 });
      track(B, { side: -1, dist: 6.2, h: 2.0, lead: 1.4 });
    } },
    // 10. into the smoke
    { dur: 5, set: 'house_int', time: 'interior', setup() { hideAll(); stand(B); stand(Y); B.at(4.3, 0, -4.4, PI / 2).show().replay('Duck', 1); Y.at(COUNTER.x, 0, COUNTER.z, 0).show(); say('Yellow', 'It\'s... extra crispy!'); }, upd(t, dt) {
      smoke(1, dt);
      if (t > 1.6) { Y.face(B.p.x, B.p.z); Y.play('Yes', 1); }
      if (t > 3) B.play('No', 1);
      frameGroup([B, Y], { side: 1, h: 1.4, dist: 0.9 });
    } },
    // 11. they crack up
    { dur: 5, set: 'house_int', time: 'interior', setup() { hideAll(); stand(B); stand(Y); B.at(4.3, 0, -4.4, PI / 2).show().replay('Yes', 1.2); Y.at(COUNTER.x, 0, COUNTER.z, -PI / 2).show().replay('Wave', 1.2); say('Blue', 'Extra crispy. Again.'); }, upd(t, dt) {
      smoke(0.5 - t / 10, dt);
      if (t > 2.5) { say('Yellow', 'Hahaha!'); Y.replay('Yes', 1.5); B.play('Wave', 1); }
      frameGroup([B, Y], { side: 1, h: 1.25, dist: 0.65, look: 1.0 });
    } },
    // 12. breakfast anyway: burnt toast at the table
    { dur: 6, set: 'house_int', time: 'interior', setup() {
      hideAll(); stand(B); stand(Y); B.at(TABLE.x - 0.4, 0, TABLE.z - 1.25, 0).show().play('Idle'); Y.at(TABLE.x + 0.4, 0, TABLE.z + 1.25, PI).show().play('Idle');
      burntToast();
      say('Blue', 'Mmm... charcoal.');
    }, upd(t) {
      if (t > 0.6 && t < 0.7) B.replay('Punch', 0.8);
      if (t > 1.2 && t < 1.3) puffs.emit({ pos: V(TABLE.x - 0.35, 1.3, TABLE.z - 0.6), vel: V(0, 0.4, 0.4), life: 0.8, size: 0.15, color: 0x1a1210 });
      if (t > 3) { say('Yellow', 'Chef\'s special!'); if (t < 3.1) Y.replay('Yes', 1.2); }
      frameGroup([B, Y], { side: 1, h: 1.6, dist: 0.85, look: 0.9 });
    } },
    // 13. wide: the two of them laughing in the morning light
    { dur: 5, set: 'house_int', time: 'interior', setup() { hideAll(); stand(B); stand(Y); B.at(TABLE.x - 0.4, 0, TABLE.z - 1.25, 0).show().replay('Yes', 1); Y.at(TABLE.x + 0.4, 0, TABLE.z + 1.25, PI).show().replay('Wave', 1); burntToast(); say('Yellow', 'Best breakfast ever!'); }, upd(t) {
      const k = ease(t / 5); fixed([lerp(3.6, 3.0, k), lerp(2.6, 3.2, k), lerp(1.0, 2.0, k)], [6.6, 0.9, -2.6]);
    } },
    // 14. Blue heads for the sofa: TV time
    { dur: 6, set: 'house_int', time: 'interior', setup() { hideAll(); stand(B); stand(Y); B.show(); Y.show(); say('Blue', 'Okay. My turn. TV!'); }, upd(t) {
      B.move(t, 0.4, 4.2, [TABLE.x - 0.6, TABLE.z - 1.0], [1.6, -1.6], { run: true, speed: 1.3 });
      Y.move(t, 1.2, 5.5, [TABLE.x + 0.4, TABLE.z + 1.0], [2.8, -1.0], { run: false });
      frameGroup([B, Y], { side: -1, h: 2.2, dist: 0.9, look: 0.8 });
    } },
    // 15. outside: smoke still drifting out of the kitchen window
    { dur: 5, set: 'house_ext', time: 'morning', setup() { hideAll(); }, upd(t, dt) {
      if (Math.random() < 0.6) for (let i = 0; i < 2; i++) puffs.emit({ pos: V(3.4 + Math.random() * 0.6, 4.4, -1.0), vel: V(0.5, 0.9 + Math.random() * 0.6, 0.4), life: 2.6, size: 0.18 + Math.random() * 0.14, drag: 0.9, g: -0.3, color: [0xd9d9de, 0xc4c4cc][i], shrink: true });
      const k = ease(t / 5); fixed([lerp(8, 10, k), lerp(5, 6, k), lerp(14, 16, k)], [1.5, 3.4, -3]);
    } },
  ];
}
