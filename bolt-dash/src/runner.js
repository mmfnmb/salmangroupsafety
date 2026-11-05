// The character: physics body, movement, status effects, animation, bot brain.
import { THREE, CANNON, M, G, V, PI, rand, clamp, damp, scene, world, sfx, fx, puffs, SkeletonUtils, G_STATIC, G_RUNNER, G_HAZARD, G_BALL, G_PROJ, matRunner } from './core.js';
import { dress, paint, holdItem, HAND, ITEM, skinFx, teamFlag } from './cosmetics.js';

export const RUN = 10.5, AIR_ACC = 30, GROUND_ACC = 80, JUMP_V = 12.2, DIVE_V = 14.5;
const ray = new CANNON.RaycastResult();
export function groundAt(x, y, z, depth = 2.5) {
  ray.reset();
  world.raycastClosest(new CANNON.Vec3(x, y + 1, z), new CANNON.Vec3(x, y - depth, z), { collisionFilterMask: G_STATIC | G_HAZARD, skipBackfaces: true }, ray);
  return ray.hasHit ? ray : null;
}
export function wallAhead(p, dx, dz, h = 0.45, dist = 1.1) {
  ray.reset();
  world.raycastClosest(new CANNON.Vec3(p.x, p.y + h, p.z), new CANNON.Vec3(p.x + dx * dist, p.y + h, p.z + dz * dist), { collisionFilterMask: G_STATIC | G_HAZARD, skipBackfaces: true }, ray);
  return ray.hasHit ? ray : null;
}

export class Runner {
  constructor({ i, isPlayer, equip, team = null, name = '' }) {
    this.i = i; this.isPlayer = isPlayer; this.team = team; this.name = name;
    this.root = new THREE.Group(); scene.add(this.root);
    this.model = SkeletonUtils.clone(M.Character.scene);
    this.model.scale.setScalar(0.42);
    this.model.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.root.add(this.model);
    this.equip = { ...equip };
    dress(this.model, this.equip);
    if (team) teamFlag(this.model, team);
    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = {};
    for (const clip of M.Character.animations) { const n = clip.name.split('|').pop(); this.actions[n] = this.mixer.clipAction(clip); }
    for (const n of ['Jump', 'Jump_Land', 'HitReact', 'Wave', 'Yes', 'No', 'Punch', 'Death']) if (this.actions[n]) { this.actions[n].setLoop(THREE.LoopOnce, 1); this.actions[n].clampWhenFinished = true; }
    this.cur = null; this.play('Idle');

    this.stars = new THREE.Group(); this.stars.visible = false; this.root.add(this.stars);
    for (let k = 0; k < 3; k++) { const s = M.Star.scene.clone(); s.scale.setScalar(0.2); this.stars.add(s); }
    if (isPlayer) {
      // arrow that floats over your own character
      const spin = new THREE.Group(), a = M.Arrow.scene.clone();
      a.rotation.set(PI / 2, 0, -PI / 2, 'ZYX'); a.scale.setScalar(0.36); a.position.x = 0;
      a.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.material = o.material.clone(); o.material.emissive = new THREE.Color(0xff2a6a); o.material.emissiveIntensity = 0.35; } });
      spin.add(a); spin.position.y = 2.35; this.root.add(spin); this.marker = spin;
    }

    this.body = new CANNON.Body({ mass: 1, material: matRunner, fixedRotation: true, linearDamping: 0.01, angularDamping: 0.4, collisionFilterGroup: G_RUNNER, collisionFilterMask: G_STATIC | G_RUNNER | G_HAZARD | G_BALL });
    this.body.addShape(new CANNON.Sphere(0.42), new CANNON.Vec3(0, 0.42, 0));
    this.body.addShape(new CANNON.Sphere(0.4), new CANNON.Vec3(0, 1.05, 0));
    this.body.userData = { runner: this };
    world.addBody(this.body);
    this.body.addEventListener('collide', (e) => this.onCollide(e));
    this.reset(0, 0, 0);
  }
  reset(x, y, z, facing = PI) {
    this.body.position.set(x, y + 0.2, z); this.body.velocity.set(0, 0, 0); this.body.angularVelocity.set(0, 0, 0);
    this.body.quaternion.set(0, 0, 0, 1); this.body.fixedRotation = true; this.body.updateMassProperties();
    this.state = 'run'; this.stateT = 0; this.grounded = false; this.wasGrounded = true; this.coyote = 0; this.jumpBuf = 0;
    this.facing = facing; this.squash = 1; this.hitCool = 0; this.dived = false;
    this.frozenT = 0; this.confuseT = 0; this.slowT = 0; this.slipT = 0; this.stunT = 0; this.boostT = 0; this.launchT = 0; this.swingT = 0; this.swingCd = 0;
    this.boostDir = { x: 0, z: -1 }; this.groundBody = null;
    this.input = { x: 0, z: 0, jump: false, dive: false, fire: false, push: false, grab: false };
    this.stars.visible = false; this.model.rotation.set(0, 0, 0); this.model.position.set(0, 0, 0); this.root.quaternion.identity();
    this.ai = this.ai || { lane: rand(-4, 4), laneT: rand(1, 3), skill: rand(0.6, 0.95), speed: rand(0.88, 1.0), think: 0, lastP: null, stuck: 0, wander: null, wanderT: 0, aimT: 0 };
    this.play('Idle', 0);
    this.sync();
  }
  play(name, fade = 0.15, speed = 1) {
    const a = this.actions[name]; if (!a) return;
    a.timeScale = speed;
    if (this.cur === a) return;
    a.reset().fadeIn(fade).play();
    if (this.cur) this.cur.fadeOut(fade);
    this.cur = a; this.curName = name;
  }
  get pos() { return this.body.position; }
  get busy() { return this.state === 'tumble' || this.frozenT > 0 || this.stunT > 0 || this.out || this.finished; }
  checkGround() {
    if (this.state === 'tumble') { this.grounded = false; this.groundBody = null; return; }
    const p = this.body.position;
    let hit = groundAt(p.x, p.y - 0.5, p.z, 0.62);
    if (!hit) for (const [ox, oz] of [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]]) { hit = groundAt(p.x + ox, p.y - 0.5, p.z + oz, 0.62); if (hit) break; }
    this.groundBody = hit ? hit.body : null;
    this.grounded = !!hit && this.body.velocity.y < 4;
  }
  onCollide(e) {
    const other = e.body; if (!other || this.out) return;
    const u = other.userData || {}, p = this.body.position;
    if (u.kind === 'crate' && G.level) {
      const v = this.body.velocity, sp = Math.hypot(v.x, v.z);
      if (sp > 3 || this.state === 'dive') G.level.breakCrate(other);
      return;
    }
    if (this.state === 'tumble' || this.hitCool > 0 || this.finished) return;
    if (u.kind === 'sweeper') {
      if (p.y > other.position.y + 0.2) return; // riding on top of the arm is allowed
      const rx = p.x - u.cx, rz = p.z - u.cz;
      const t = V(u.w * rz, 0, -u.w * rx).normalize();
      this.tumble(t.multiplyScalar(8.5).add(V(0, 7, 0)));
    } else if (u.kind === 'saw' || u.kind === 'spiky' || u.kind === 'spike') {
      const d = V(p.x - other.position.x, 0, p.z - other.position.z).normalize();
      this.tumble(d.multiplyScalar(u.kind === 'saw' ? 10 : 8).add(V(0, 8, 0)));
    } else if (u.kind === 'ball') {
      const v = other.velocity; const sp = Math.hypot(v.x, v.z);
      if (sp > 4) this.tumble(V(v.x, 0, v.z).normalize().multiplyScalar(Math.min(14, sp * 0.9)).add(V(0, 7, 0)));
    }
  }
  tumble(impulse, spin = 9) {
    if (this.out || this.finished) return;
    this.state = 'tumble'; this.stateT = 0; this.frozenT = 0;
    this.body.fixedRotation = false; this.body.updateMassProperties();
    this.body.velocity.set(impulse.x, impulse.y, impulse.z);
    this.body.angularVelocity.set(rand(-spin, spin), rand(-4, 4), rand(-spin, spin));
    this.play('HitReact', 0.05);
    this.stars.visible = true;
    fx.burst(V(this.pos.x, this.pos.y + 1.2, this.pos.z), 0xffd23f, 12, 6);
    G.modeObj?.onHit?.(this);
    if (this.isPlayer) { sfx.hit(); G.shake = 0.45; if (navigator.vibrate) try { navigator.vibrate(40); } catch { /* no vibration */ } }
  }
  recover() {
    this.state = 'run'; this.stateT = 0; this.hitCool = 0.6;
    this.body.quaternion.set(0, 0, 0, 1); this.body.angularVelocity.set(0, 0, 0);
    this.body.fixedRotation = true; this.body.updateMassProperties();
    this.body.position.y += 0.35;
    this.stars.visible = this.confuseT > 0 || this.stunT > 0; this.model.rotation.set(0, 0, 0);
    this.play('Jump_Land', 0.1);
  }
  // status effects
  freeze(t) { if (this.out || this.finished) return; if (this.state === 'tumble') this.recover(); this.frozenT = t; paint(this.model, 0x9fe8ff); fx.burst(V(this.pos.x, this.pos.y + 1, this.pos.z), 0xbff3ff, 16, 5); if (this.isPlayer) sfx.freeze(); }
  confuse(t) { this.confuseT = t; this.stars.visible = true; }
  slow(t) { this.slowT = Math.max(this.slowT, t); }
  slip(t) { this.slipT = Math.max(this.slipT, t); }
  stun(t) { this.stunT = Math.max(this.stunT, t); this.stars.visible = true; }
  knock(vec, doTumble = true) { if (doTumble) this.tumble(vec); else { const v = this.body.velocity; v.x += vec.x; v.y = Math.max(v.y, vec.y); v.z += vec.z; this.grounded = false; } }
  eliminate() {
    if (this.out) return;
    this.out = true; this.root.visible = false; world.removeBody(this.body);
  }
  update(dt) {
    if (this.out) return;
    const b = this.body, v = b.velocity, inp = this.input, L = G.level;
    this.stateT += dt; this.hitCool = Math.max(0, this.hitCool - dt);
    for (const k of ['boostT', 'launchT', 'confuseT', 'slowT', 'slipT', 'stunT', 'swingT', 'swingCd']) this[k] = Math.max(0, this[k] - dt);
    if (this.frozenT > 0) { this.frozenT -= dt; if (this.frozenT <= 0) { this.frozenT = 0; paint(this.model); } }
    if (!this.confuseT && !this.stunT && this.state !== 'tumble') this.stars.visible = false;
    this.checkGround();
    if (b.position.y < (L?.killY ?? -15)) { G.modeObj?.onFall?.(this); return; }

    let gvx = 0, gvz = 0;
    if (this.grounded && this.groundBody && this.groundBody.type === CANNON.Body.KINEMATIC) { gvx = this.groundBody.velocity.x; gvz = this.groundBody.velocity.z; }

    if (this.finished) {
      v.x = damp(v.x, gvx, 6, dt); v.z = damp(v.z, gvz, 6, dt);
    } else if (this.state === 'tumble') {
      if (this.stateT > 0.25 && Math.abs(v.y) < 3) { v.x = damp(v.x, 0, 3.5, dt); v.z = damp(v.z, 0, 3.5, dt); }
      const slow = Math.hypot(v.x, v.y, v.z) < 2.5;
      if ((this.stateT > 1.0 && slow) || this.stateT > 2.4) this.recover();
    } else if (this.frozenT > 0 || this.stunT > 0) {
      v.x = damp(v.x, gvx, 8, dt); v.z = damp(v.z, gvz, 8, dt);
      inp.jump = inp.dive = inp.fire = false;
      if (this.stunT > 0 && this.grounded) this.play('Idle', 0.2);
    } else {
      let ix = inp.x, iz = inp.z; const il = Math.hypot(ix, iz); if (il > 1) { ix /= il; iz /= il; }
      if (this.confuseT > 0) { ix = -ix; iz = -iz; }
      const dive = this.state === 'dive';
      // zones: speed pads and conveyors
      let zx = 0, zz = 0;
      if (L) for (const zn of L.zones) {
        if (Math.abs(b.position.x - zn.x) > zn.hx || Math.abs(b.position.z - zn.z) > zn.hz || Math.abs(b.position.y - zn.y) > (zn.type === 'wind' ? 4 : 1.2)) continue;
        if (zn.type === 'wind') { zx += zn.dir.x * zn.speed; zz += zn.dir.z * zn.speed; continue; }
        if (!this.grounded) continue;
        if (zn.type === 'speed') { if (this.boostT < 0.2 && this.isPlayer) sfx.tick(); this.boostT = 1.0; this.boostDir = zn.dir; }
        else if (zn.type === 'conveyor') { zx += zn.dir.x * zn.speed; zz += zn.dir.z * zn.speed; }
        else if (zn.type === 'slime') this.slow(0.4);
      }
      if (!dive) {
        let speed = RUN * (this.isPlayer ? 1 : this.ai.speed) * (this.slowT > 0 ? 0.4 : 1) * (G.modeObj?.speedMul || 1);
        let tx = ix * speed + gvx + zx, tz = iz * speed + gvz + zz;
        if (this.boostT > 0) { tx += this.boostDir.x * 8; tz += this.boostDir.z * 8; if (Math.random() < dt * 25) puffs.emit({ pos: V(b.position.x, b.position.y + 0.3, b.position.z), vel: V(rand(-1, 1), rand(0.5, 1.5), rand(-1, 1)), life: 0.35, size: 0.14, drag: 2, color: 0xffd23f }); }
        const acc = (this.grounded ? (this.slipT > 0 ? 9 : GROUND_ACC) : AIR_ACC * (this.launchT > 0 ? 0.15 : 1)) * dt;
        if (this.launchT > 0) { v.x += clamp(tx - v.x, -acc * 3, acc * 3); }
        else { const dx = tx - v.x, dz = tz - v.z, dl = Math.hypot(dx, dz); if (dl > 0) { const k = Math.min(1, acc / dl); v.x += dx * k; v.z += dz * k; } }
        if (il > 0.1) this.facing = Math.atan2(ix, iz);
      }
      this.coyote = this.grounded ? 0.12 : Math.max(0, this.coyote - dt);
      this.jumpBuf = inp.jump ? 0.13 : Math.max(0, this.jumpBuf - dt);
      inp.jump = false;
      if (this.jumpBuf > 0 && this.coyote > 0 && !dive) {
        v.y = JUMP_V; this.coyote = 0; this.jumpBuf = 0; this.grounded = false; this.squash = 1.25;
        this.play('Jump', 0.05);
        fx.dust(V(b.position.x, b.position.y + 0.1, b.position.z), 5);
        if (this.isPlayer) sfx.jump();
      }
      if (inp.dive && G.modeObj?.onDive?.(this)) inp.dive = false;
      if (inp.dive && !dive && !this.dived) {
        this.dived = true; this.state = 'dive'; this.stateT = 0;
        v.x = Math.sin(this.facing) * DIVE_V; v.z = Math.cos(this.facing) * DIVE_V; v.y = Math.max(v.y, 5);
        this.play('Jump_Idle', 0.08);
        if (this.isPlayer) { sfx.dive(); G.onPlayerDive?.(); }
      }
      inp.dive = false;
      if (dive && this.stateT > 0.25 && this.grounded) { this.state = 'getup'; this.stateT = 0; fx.dust(V(b.position.x, b.position.y + 0.1, b.position.z), 8); if (this.isPlayer) sfx.land(); }
      if (this.state === 'getup') { v.x = damp(v.x, gvx, 8, dt); v.z = damp(v.z, gvz, 8, dt); if (this.stateT > 0.35) { this.state = 'run'; this.play('Jump_Land', 0.1); } }

      // launchers: bouncers and springs
      if (L) for (const lo of L.launchers) {
        if (Math.hypot(b.position.x - lo.x, b.position.z - lo.z) < lo.r && b.position.y < lo.y + 0.9 && b.position.y > lo.y - 0.6 && v.y <= 2) {
          v.y = lo.vy; if (lo.fx != null) { v.x = lo.fx; v.z = lo.fz; this.launchT = lo.lock ?? 1.1; }
          this.grounded = false; this.coyote = 0; this.squash = 1.4; this.state = 'run';
          lo.onUse?.();
          fx.burst(V(lo.x, lo.y + 0.4, lo.z), 0xff4f9a, 10, 5);
          this.play('Jump', 0.05);
          if (this.isPlayer) sfx.boing();
        }
      }
      if (inp.fire) { inp.fire = false; G.onFire?.(this); }
      if (inp.push) { inp.push = false; this.doPush(); }
      this.grabUpdate(dt, inp.grab);

      if (this.grounded && !this.wasGrounded) {
        this.squash = 0.72; this.dived = false;
        fx.dust(V(b.position.x, b.position.y + 0.1, b.position.z), 6);
        if (this.isPlayer) sfx.land();
      }
      if (this.state === 'run' && this.swingT <= 0) {
        const hs = Math.hypot(v.x - gvx, v.z - gvz);
        if (!this.grounded) { if (this.curName !== 'Jump' || !this.actions.Jump.isRunning()) this.play('Jump_Idle', 0.2); }
        else if (this.curName === 'Jump_Land' && this.actions.Jump_Land.isRunning() && hs < 3) { /* landing */ }
        else if (hs > 1.2) { this.play('Run', 0.12, clamp(hs / 8, 0.7, 1.6)); if (Math.random() < dt * 5) puffs.emit({ pos: V(b.position.x + rand(-0.2, 0.2), b.position.y + 0.08, b.position.z + rand(-0.2, 0.2)), vel: V(rand(-0.5, 0.5), rand(0.4, 1), rand(-0.5, 0.5)), life: 0.35, size: rand(0.1, 0.16), drag: 2, color: 0xf6f0e4 }); }
        else this.play('Idle', 0.2);
      }
    }
    this.wasGrounded = this.grounded;
    if (this.frozenT <= 0) this.mixer.update(dt);
  }
  // closest other player in front of you within range
  nearest(range) {
    let best = null, bd = range; const fx_ = Math.sin(this.facing), fz = Math.cos(this.facing);
    for (const o of G.runners || []) {
      if (o === this || o.out || o.finished) continue;
      const dx = o.pos.x - this.pos.x, dz = o.pos.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d > bd || Math.abs(o.pos.y - this.pos.y) > 1.3 || (dx * fx_ + dz * fz) / (d || 1) < 0.15) continue;
      best = o; bd = d;
    }
    return best;
  }
  // Push: shove the player in front of you away
  doPush() {
    if (this.pushCd > 0) return; this.pushCd = 0.9; this.swing();
    const o = this.nearest(1.8); if (!o) return;
    const a = Math.atan2(o.pos.x - this.pos.x, o.pos.z - this.pos.z), v = o.body.velocity;
    v.x = Math.sin(a) * 11; v.z = Math.cos(a) * 11; v.y = Math.max(v.y, 3.5); o.grounded = false; o.stun(0.35);
    fx.burst(V(o.pos.x, o.pos.y + 0.8, o.pos.z), 0xffffff, 10, 5); sfx.bat();
    if (o.grabbed?.grabbed === this) o.grabbed = null;
  }
  // Grab (hold): hang on to the player in front of you; they slow down and get pulled back, max 2.5 s
  grabUpdate(dt, held) {
    this.pushCd = Math.max(0, (this.pushCd || 0) - dt); this.grabCd = Math.max(0, (this.grabCd || 0) - dt);
    if (!held || this.grabT > 2.5 || this.state !== 'run') { if (this.grabbed) { this.grabbed = null; this.grabCd = 1.2; } this.grabT = 0; return; }
    if (!this.grabbed && this.grabCd <= 0) { const o = this.nearest(1.4); if (o) { this.grabbed = o; this.grabT = 0; this.play('Punch', 0.05, 0.6); if (this.isPlayer) sfx.pickup(); } }
    const o = this.grabbed; if (!o) return;
    this.grabT += dt;
    const dx = o.pos.x - this.pos.x, dz = o.pos.z - this.pos.z, d = Math.hypot(dx, dz) || 1;
    if (d > 2.3 || o.out || o.finished) { this.grabbed = null; this.grabCd = 1.2; return; }
    o.slow(0.2); this.slow(0.2);
    const ov = o.body.velocity, k = Math.min(1, dt * 6); ov.x += (-dx / d * 2.5 - ov.x) * k; ov.z += (-dz / d * 2.5 - ov.z) * k;
    this.facing = Math.atan2(dx, dz);
  }
  swing() { this.swingT = 0.32; this.play('Punch', 0.05, 1.6); sfx.swing(); }
  sync(dt = 0) {
    const p = this.body.position;
    this.root.position.set(p.x, p.y, p.z);
    if (this.state === 'tumble') {
      const q = this.body.quaternion; this.root.quaternion.set(q.x, q.y, q.z, q.w);
    } else {
      this.root.quaternion.identity();
      let dy = this.facing - this.model.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      this.model.rotation.y += dy * Math.min(1, dt * 14);
      const lean = this.state === 'dive' ? 1.25 : this.state === 'getup' ? 1.2 : 0;
      this.model.rotation.x = damp(this.model.rotation.x, lean, 14, dt);
      this.model.position.y = this.state === 'dive' || this.state === 'getup' ? 0.35 : 0;
    }
    if (this.stars.visible) {
      this.stars.rotation.y += dt * 8; this.stars.position.set(0, 1.85, 0);
      this.stars.children.forEach((s, k) => { const a = k * 2.09; s.position.set(Math.cos(a) * 0.55, Math.sin(G.t * 6 + k) * 0.08, Math.sin(a) * 0.55); });
    }
    if (this.marker) { this.marker.rotation.y += dt * 2.5; this.marker.position.y = 2.35 + Math.sin(G.t * 4) * 0.1; this.marker.visible = this.state !== 'tumble'; }
    const held = this.model.userData.held;
    if (held?.frame) {
      const k = this.swingT > 0 ? 1 - this.swingT / 0.32 : 0;
      const base = held.key.startsWith('gun:') ? PI / 2 : HAND.r[0];
      held.frame.rotation.x = held.key.startsWith('bat:') ? base + Math.sin(k * PI) * 1.9 : base;
    }
    if (this.model.userData.fx && !this.out) { const v = this.body.velocity; skinFx(this.model, dt, this.body.position, { moving: Math.hypot(v.x, v.z) > 1.5, grounded: this.grounded, puffs, scene }); }
    this.squash = damp(this.squash, 1, 12, dt);
    const s = 0.42; this.model.scale.set(s / Math.sqrt(this.squash), s * this.squash, s / Math.sqrt(this.squash));
  }
  dispose() { this.root.removeFromParent(); if (!this.out) world.removeBody(this.body); this.out = true; }
}

// ---------------------------------------------------------------- bot brain (works on any map)
export function think(r, dt) {
  const inp = r.input, mode = G.modeObj, p = r.pos, ai = r.ai;
  if (r.finished || r.out || r.state === 'tumble' || r.frozenT > 0 || r.stunT > 0) { inp.x = inp.z = 0; return; }
  const tgt = mode.target(r, dt);
  if (!tgt) { inp.x = inp.z = 0; return; }
  let dx = tgt.x - p.x, dz = tgt.z - p.z; const d = Math.hypot(dx, dz);
  if (d < (tgt.near ?? 0.4) || tgt.stop) { inp.x = inp.z = 0; } else { inp.x = dx / d; inp.z = dz / d; }
  // a detour is running (after getting stuck): walk sideways / backwards for a moment instead
  if (ai.detour && ai.detour.t > 0 && !tgt.stop) {
    ai.detour.t -= dt; inp.x = ai.detour.x; inp.z = ai.detour.z;
  } else if (d > 1.2 && !tgt.stop && !tgt.push && r.grounded) {
    // a tall wall ahead that a jump won't clear: steer to whichever side is open
    const ux = dx / d, uz = dz / d;
    if (wallAhead(p, ux, uz, 1.7, 1.3)) {
      for (const a of [0.7, -0.7, 1.3, -1.3]) {
        const c = Math.cos(a), sn = Math.sin(a), sx = ux * c - uz * sn, sz = ux * sn + uz * c;
        if (!wallAhead(p, sx, sz, 1.7, 1.6) && groundAt(p.x + sx * 1.6, p.y, p.z + sz * 1.6, 3)) { inp.x = sx; inp.z = sz; break; }
      }
    }
  }
  const k = tgt.speed ?? 1; inp.x *= k; inp.z *= k;
  if (r.grounded && d > 1.2 && !tgt.noJump) {
    const ux = dx / d, uz = dz / d;
    const near = groundAt(p.x + ux * 1.7, p.y, p.z + uz * 1.7, 3);
    if (!near) {
      const far = groundAt(p.x + ux * 4.8, p.y + 0.5, p.z + uz * 4.8, 3.5);
      if (far && Math.random() < ai.skill + 0.05) inp.jump = true;
      else if (!far && tgt.avoidHoles) { inp.x = -inp.x * 0.3; inp.z = -inp.z * 0.3; }
    } else if (wallAhead(p, ux, uz) && !tgt.push) { if (Math.random() < ai.skill) inp.jump = true; }
  }
  // spinning arms: hop over them
  for (const sw of G.level.sweepers) {
    const rx = p.x - sw.x, rz = p.z - sw.z; if (Math.hypot(rx, rz) > sw.len + 0.8 || Math.abs(p.y - sw.y) > 1.6) continue;
    const e = new CANNON.Vec3(); sw.body.quaternion.toEuler(e);
    const ax = Math.cos(e.y), az = -Math.sin(e.y), perp = rx * az - rz * ax;
    if (Math.abs(perp) < 1.6 && perp * sw.w < 0 && r.grounded && Math.random() < ai.skill) inp.jump = true;
  }
  // stuck: jump, and let the mode pick another route
  ai.think -= dt;
  if (ai.think < 0) {
    ai.think = 0.7;
    if (ai.lastP && Math.hypot(ai.lastP.x - p.x, ai.lastP.z - p.z) < 0.5 && d > 1.5 && !tgt.stop) {
      // stuck: 1st try a jump, then a sidestep, then back off and go round; after ~6 s go back to the last checkpoint
      ai.stuck++;
      const ux = d ? dx / d : 0, uz = d ? dz / d : 1, side = Math.random() < 0.5 ? 1 : -1;
      if (ai.stuck === 1) inp.jump = true;
      else if (ai.stuck < 4) ai.detour = { x: -uz * side * 0.9 + ux * 0.3, z: ux * side * 0.9 + uz * 0.3, t: 0.9 };
      else if (ai.stuck < 8) { ai.detour = { x: -ux * 0.6 - uz * side * 0.8, z: -uz * 0.6 + ux * side * 0.8, t: 1.1 }; inp.jump = Math.random() < 0.5; }
      else if (mode.kind === 'race' && mode.onFall) { ai.stuck = 0; mode.onFall(r); }
    } else ai.stuck = 0;
    ai.lastP = { x: p.x, z: p.z };
  }
  if (tgt.fire) inp.fire = true;
  // rough play: shove or grab a rival that is right in front (more often for skilled bots, never your own team)
  if (!mode.noPush && r.grounded && Math.random() < dt * 0.9 * ai.skill) { const o = r.nearest(1.6); if (o && (!o.team || o.team !== r.team)) { if (Math.random() < 0.6) inp.push = true; else { inp.grab = true; ai.grabT = rand(0.6, 1.4); } } }
  if (ai.grabT > 0) { ai.grabT -= dt; if (ai.grabT <= 0) inp.grab = false; }
  if (tgt.jump && r.grounded) inp.jump = true;
  if (r.weapon) { ai.aimT -= dt; if (ai.aimT <= 0) { ai.aimT = rand(0.6, 1.6); G.botFire?.(r); } }
  if (tgt.dive && !r.dived && r.grounded && Math.random() < dt * 2) inp.dive = true;
  else if (!r.dived && r.grounded && d > 6 && Math.random() < dt * 0.06) inp.dive = true;
}
