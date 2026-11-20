// The specimen in tube 8: floating curled up in the liquid with hoses in its back and bubbles rising, then waking,
// pressing its hands on the glass, banging until it breaks, falling out on all fours, tearing the hoses and rising.
import * as THREE from 'three';
import { WH } from './world.js';

const qd = new THREE.Quaternion(), wq = new THREE.Quaternion(), pq = new THREE.Quaternion(), RIGHT = new THREE.Vector3(), UP = new THREE.Vector3();
// turn a bone about an axis given in world space (the body's right or up axis)
function rotW(b, axis, angle) { if (!b || !angle) return; b.updateWorldMatrix(true, false); b.getWorldQuaternion(wq); b.parent.getWorldQuaternion(pq); qd.setFromAxisAngle(axis, angle); b.quaternion.copy(pq.invert().multiply(qd.multiply(wq))); b.updateMatrixWorld(true); }
function bodyAxes(m) { m.root.updateMatrixWorld(true); RIGHT.set(1, 0, 0).applyQuaternion(m.root.quaternion); UP.set(0, 1, 0); }
// pitch > 0 bends forward (towards the way it faces); for legs and arms a negative angle swings them forward

export class Specimen {
  constructor(m, tube, group) {
    this.m = m; this.tube = tube; this.g = group; this.t = 0; this.stage = 'sleep'; this.bang = 0; this.out = 0; this.twitch = 0;
    const find = (re) => { let r = null; m.obj.traverse((o) => { if (!r && o.isBone && re.test(o.name)) r = o; }); return r; };
    this.b = { spine: find(/^spine/i), chest: find(/^chest/i), neck: find(/^neck/i), head: find(/^head/i), ul: find(/upperarm.?l/i), ur: find(/upperarm.?r/i), fl: find(/forearm.?l/i), fr: find(/forearm.?r/i),
      tl: find(/thigh.?l/i), tr: find(/thigh.?r/i), sl: find(/shin.?l/i), sr: find(/shin.?r/i), pelvis: find(/^pelvis/i) };
    // hoses from the cap into its back
    const hm = new THREE.MeshStandardMaterial({ color: 0x1a1d20, roughness: 0.45, metalness: 0.2 });
    this.hoses = [0, 1, 2].map((i) => { const h = new THREE.Mesh(new THREE.BufferGeometry(), hm); h.userData.a = i * 2.1; group.add(h); return h; });
    // bubbles rising inside the glass
    const n = 70, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 1.2; pos[i * 3 + 1] = Math.random() * 2; pos[i * 3 + 2] = (Math.random() - 0.5) * 1.2; }
    this.bub = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)), new THREE.PointsMaterial({ color: 0xd8ffe8, size: 0.035, transparent: true, opacity: 0.7, depthWrite: false }));
    this.bub.position.set(tube.x, 0.5, tube.z); group.add(this.bub);
    this.backPt = new THREE.Vector3(); this.hoseT = 0;
  }
  // left: seconds until the glass gives way (from the game's warning timeline); player: {x,z} or null
  update(dt, left, player, sound) {
    const m = this.m, b = this.b, tb = this.tube; this.t += dt; const t = this.t;
    if (this.stage === 'sleep' && left < 60) this.stage = 'wake';
    if (this.stage === 'wake' && left < 30) this.stage = 'press';
    if (this.stage === 'press' && left < 12) this.stage = 'rage';
    if (m.mixer) m.mixer.update(dt * 0.25);
    // body: curled up and drifting, less curled as it wakes
    const curl = this.stage === 'sleep' ? 1 : this.stage === 'wake' ? 0.8 : this.stage === 'press' ? 0.25 : 0.05;
    const breath = Math.sin(t * 1.1) * 0.05; let lean = 0, armUp = 0, armSwing = 0;
    if (this.stage === 'press' || this.stage === 'rage') { const period = this.stage === 'rage' ? 1.0 : 2.4; const ph = (t % period) / period; armUp = 1; armSwing = ph < 0.2 ? Math.sin(ph / 0.2 * Math.PI) : 0; lean = this.stage === 'rage' ? (ph < 0.25 ? Math.sin(ph / 0.25 * Math.PI) * 0.5 : 0) : 0;
      if (ph < this.lastPh) { this.bang++; sound('knock'); if (this.stage === 'rage') sound('bang'); tb.crack.visible = true; tb.crack.material.opacity = Math.min(1, 0.35 + this.bang * 0.06); this.shake = 0.25; } this.lastPh = ph; }
    // twitches while asleep, eyes on from the wake stage
    this.twitch -= dt; if (this.twitch < -Math.random() * 9 - 3) this.twitch = 0.25; const tw = this.twitch > 0 ? Math.sin(this.twitch * 60) * 0.15 : 0;
    this.curl = this.curl == null ? curl : this.curl + (curl - this.curl) * Math.min(1, dt * 0.8); const c = this.curl; const drift = Math.sin(t * 0.7) * 0.12 * c;
    this.pose = { c, breath, tw, armUp, armSwing, drift };
    // it turns to look at you once awake
    let face = m.yaw; if (player && this.stage !== 'sleep') { const want = Math.atan2(player.x - tb.x, player.z - tb.z); let d = want - (this.faceYaw ?? want); d = Math.atan2(Math.sin(d), Math.cos(d)); this.faceYaw = (this.faceYaw ?? want) + d * Math.min(1, dt * (this.stage === 'wake' ? 0.6 : 2)); face = this.faceYaw; }
    else { this.faceYaw = this.faceYaw ?? m.yaw; face = this.faceYaw + Math.sin(t * 0.2) * 0.4; }
    const fx = Math.sin(face), fz = Math.cos(face); this.shake = Math.max(0, (this.shake || 0) - dt);
    const bob = Math.sin(t * 0.9) * 0.08 * (curl > 0.5 ? 1 : 0.3);
    m.root.position.set(tb.x + fx * (lean * 0.35 + (armUp ? 0.2 : 0)), (curl > 0.5 ? 0.85 : 0.5) + bob, tb.z + fz * (lean * 0.35 + (armUp ? 0.2 : 0)));
    m.root.rotation.set(0, face, 0); m.root.visible = true; bodyAxes(m); const P = this.pose;
    rotW(b.spine, RIGHT, 0.35 * P.c); rotW(b.chest, RIGHT, 0.25 * P.c + P.breath); rotW(b.neck, RIGHT, 0.2 * P.c); rotW(b.head, RIGHT, 0.3 * P.c + P.tw); rotW(b.head, UP, P.tw);
    rotW(b.tl, RIGHT, -1.35 * P.c); rotW(b.tr, RIGHT, -1.35 * P.c); rotW(b.sl, RIGHT, 1.9 * P.c); rotW(b.sr, RIGHT, 1.9 * P.c);
    const arm = -0.9 * P.c - P.armUp * (1.5 + P.armSwing * 0.45); rotW(b.ul, RIGHT, arm + P.drift); rotW(b.ur, RIGHT, arm - P.drift); rotW(b.fl, RIGHT, -0.7 * P.c - P.armUp * 0.15); rotW(b.fr, RIGHT, -0.7 * P.c - P.armUp * 0.15);
    if (tb.pod) { tb.pod.position.x = tb.x + (this.shake > 0 ? (Math.random() - 0.5) * 0.03 : 0); }
    if (m.eyes) m.eyes.intensity = this.stage === 'sleep' ? 0 : this.stage === 'wake' ? 0.8 + Math.sin(t * 3) * 0.3 : 2;
    // bubbles: more of them as it wakes
    const pa = this.bub.geometry.attributes.position, speed = this.stage === 'sleep' ? 0.35 : this.stage === 'wake' ? 0.7 : 1.4;
    for (let i = 0; i < pa.count; i++) { let y = pa.getY(i) + dt * speed * (0.6 + (i % 5) * 0.15); if (y > WH - 1.4) y = 0; pa.setY(i, y); pa.setX(i, pa.getX(i) + Math.sin(t * 2 + i) * 0.002); } pa.needsUpdate = true;
    this.hoseT -= dt; if (this.hoseT <= 0) { this.hoseT = 0.1; this.updateHoses(); }
  }
  updateHoses() { const b = this.b.chest || this.m.obj; b.updateWorldMatrix(true, false); b.getWorldPosition(this.backPt); this.g.worldToLocal(this.backPt);
    const fx = Math.sin(this.m.root.rotation.y), fz = Math.cos(this.m.root.rotation.y);
    for (const h of this.hoses) { const a = h.userData.a, top = new THREE.Vector3(this.tube.x + Math.cos(a) * 0.45, WH - 0.75, this.tube.z + Math.sin(a) * 0.45);
      const end = this.backPt.clone().add(new THREE.Vector3(-fx * 0.12 + Math.cos(a) * 0.05, -0.05 * (a % 2), -fz * 0.12 + Math.sin(a) * 0.05));
      const mid = top.clone().lerp(end, 0.5).add(new THREE.Vector3(Math.cos(a) * 0.25, -0.2, Math.sin(a) * 0.25));
      h.geometry.dispose(); h.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([top, mid, end]), 12, 0.022, 6, false); } }
  // the glass is gone: hoses drop, bubbles stop
  release() { for (const h of this.hoses) h.visible = false; this.bub.visible = false; }
  dispose() { for (const h of this.hoses) this.g.remove(h); this.g.remove(this.bub); }
}

// after the break: on all fours in the puddle, then rising. Returns true while the scene is still playing.
export function emerge(m, dt) {
  m.emergeT = (m.emergeT || 0) + dt; const k = m.emergeT; if (k > 3.2) return false;
  if (m.mixer) m.mixer.update(dt); const find = (re) => { let r = null; m.obj.traverse((o) => { if (!r && o.isBone && re.test(o.name)) r = o; }); return r; };
  m._eb = m._eb || { spine: find(/^spine/i), chest: find(/^chest/i), tl: find(/thigh.?l/i), tr: find(/thigh.?r/i), sl: find(/shin.?l/i), sr: find(/shin.?r/i), ul: find(/upperarm.?l/i), ur: find(/upperarm.?r/i) };
  const b = m._eb, w = k < 1.8 ? 1 : Math.max(0, 1 - (k - 1.8) / 1.2); // crouched, then standing up
  bodyAxes(m); rotW(b.spine, RIGHT, 0.8 * w); rotW(b.chest, RIGHT, 0.35 * w); rotW(b.tl, RIGHT, -1.3 * w); rotW(b.tr, RIGHT, -1.3 * w); rotW(b.sl, RIGHT, 2.0 * w); rotW(b.sr, RIGHT, 2.0 * w); rotW(b.ul, RIGHT, -1.0 * w); rotW(b.ur, RIGHT, -1.0 * w);
  m.root.position.y = -0.55 * w + (k < 0.35 ? (0.35 - k) * 2.5 : 0);
  return true;
}
