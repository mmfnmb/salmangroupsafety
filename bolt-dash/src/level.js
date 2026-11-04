// Level building blocks (every visible piece is a model) plus their physics and per-frame logic.
import { THREE, CANNON, M, G, V, PI, rand, pick, clamp, scene, world, addBox, place, instanced, fx, puffs, sfx, matGround, matBall, G_STATIC, G_RUNNER, G_HAZARD, G_BALL, G_PROJ } from './core.js';

const CAT = { mask: G_RUNNER | G_BALL | G_PROJ };
export class Level {
  constructor(opts = {}) {
    this.root = new THREE.Group(); scene.add(this.root);
    this.killY = opts.killY ?? -14;
    this.bodies = []; this.zones = []; this.launchers = []; this.sweepers = []; this.saws = []; this.movers = []; this.spikes = [];
    this.cannons = []; this.balls = []; this.coins = []; this.crates = []; this.pickups = []; this.checkpoints = []; this.mixers = []; this.spinners = [];
    this.traps = []; this.updaters = []; this.pickupPool = opts.pickupPool || [];
  }
  model(name, x, y, z, s = 1, ry = 0) { return place(name, x, y, z, s, ry, this.root); }
  inst(name, list, shadows = true) { return instanced(name, list, this.root, shadows); }
  box(x, y, z, hx, hy, hz, opts = {}) { const b = addBox(x, y, z, hx, hy, hz, opts); this.bodies.push(b); return b; }
  kin(shape, x, y, z, kind, extra = {}) {
    const b = new CANNON.Body({ type: CANNON.Body.KINEMATIC, material: matGround, collisionFilterGroup: kind === 'mover' ? G_STATIC : G_HAZARD, collisionFilterMask: CAT.mask });
    b.addShape(shape); b.position.set(x, y, z); b.userData = { kind, ...extra }; world.addBody(b); this.bodies.push(b); return b;
  }

  // ---- floors and edges
  floor(x0, x1, z0, z1, y = 0, opts = {}) {
    const tiles = [], step = 2;
    for (let z = Math.max(z0, z1) - 1; z > Math.min(z0, z1); z -= step) for (let x = Math.min(x0, x1) + 1; x < Math.max(x0, x1); x += step) tiles.push({ x, y: y - 1, z });
    this.inst(opts.model || 'Cube_Grass_Single', tiles, opts.shadows ?? true);
    return this.box((x0 + x1) / 2, y - 1, (z0 + z1) / 2, Math.abs(x1 - x0) / 2, 1, Math.abs(z0 - z1) / 2);
  }
  fence(x0, z0, x1, z1, y = 0, type = 'fence-straight') {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 2.2)), ang = Math.atan2(-(z1 - z0), x1 - x0);
    const list = [];
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      // the model sits at the back edge of its tile; shift it back onto the line
      const off = { 'fence-straight': 0.92, 'fence-low-straight': 0.88, 'fence-rope': 0 }[type] ?? 0;
      list.push({ x: x - Math.sin(ang) * off, y, z: z - Math.cos(ang) * off, s: len / n, sy: 2.2, sz: 2.2, ry: ang });
    }
    this.inst('k/' + type, list);
    const b = this.box((x0 + x1) / 2, y + 0.55, (z0 + z1) / 2, len / 2, 0.55, 0.16, { ry: ang });
    return b;
  }
  rails(x0, x1, z0, z1, y = 0, type = 'fence-straight') { this.fence(x0, z0, x0, z1, y, type); this.fence(x1, z0, x1, z1, y, type); }

  // ---- zones
  speedPad(x, z, y = 0, dx = 0, dz = -1, size = 3) {
    this.model('k/indicator-special-arrow', x, y + 0.03, z, size, Math.atan2(-dx, -dz));
    this.model('k/indicator-special-arrow', x + dx * size * 0.45, y + 0.035, z + dz * size * 0.45, size * 0.7, Math.atan2(-dx, -dz));
    this.zones.push({ type: 'speed', x, y, z, hx: size * 0.5, hz: size * 0.5, dir: { x: dx, z: dz } });
  }
  conveyor(x0, x1, z0, z1, y = 0, dx = 0, dz = 1, speed = 5) {
    const list = [];
    for (let z = Math.max(z0, z1) - 1; z > Math.min(z0, z1); z -= 2) for (let x = Math.min(x0, x1) + 1; x < Math.max(x0, x1); x += 2) list.push({ x, y: y - 0.66, z, s: 2, ry: Math.atan2(-dx, -dz) });
    this.inst('k/conveyor-belt', list);
    this.zones.push({ type: 'conveyor', x: (x0 + x1) / 2, y, z: (z0 + z1) / 2, hx: Math.abs(x1 - x0) / 2, hz: Math.abs(z1 - z0) / 2, dir: { x: dx, z: dz }, speed });
  }
  // ---- launchers
  spring(x, z, y = 0, vy = 22) {
    const o = this.model('k/spring', x, y - 0.75, z, 2.2);
    const lo = { x, z, y, r: 0.95, vy, t: 0, onUse() { lo.t = 0.3; } };
    this.launchers.push(lo);
    this.updaters.push((dt) => { lo.t = Math.max(0, lo.t - dt); o.scale.y = 2.2 * (1 + Math.sin(lo.t * 20) * lo.t * 1.2); });
  }
  bouncer(x, z, y = 0, fx_ = 0, fz = -13, vy = 18) {
    const b = this.model('Bouncer', x, y - 1.35, z, 1);
    const mixer = new THREE.AnimationMixer(b), clip = M.Bouncer.animations.find((a) => a.name === 'Bouncer_Bounce');
    const act = clip ? mixer.clipAction(clip) : null; this.mixers.push(mixer);
    this.launchers.push({ x, z, y, r: 1.2, vy, fx: fx_, fz, onUse() { if (act) act.reset().setLoop(THREE.LoopOnce, 1).play(); } });
  }
  // ---- hazards
  sweeper(x, z, y = 0, len = 5.8, w = 1.3, opts = {}) {
    const pillar = this.model('Hazard_Cylinder', x, y, z, 0.9);
    const pb = new CANNON.Body({ type: CANNON.Body.STATIC, material: matGround, collisionFilterGroup: G_STATIC, collisionFilterMask: CAT.mask });
    pb.addShape(new CANNON.Cylinder(1, 1, 3.5, 12)); pb.position.set(x, y + 1.75, z); world.addBody(pb); this.bodies.push(pb);
    const arm = new THREE.Group(); arm.position.set(x, y + (opts.h ?? 0.75), z); this.root.add(arm);
    const bricks = []; for (let t = -len + 0.2; t <= len - 0.19; t += 0.7) if (Math.abs(t) > 0.9) bricks.push({ x: t, y: 0, z: 0, s: 0.36 });
    if (opts.cross) for (let t = -len + 0.2; t <= len - 0.19; t += 0.7) if (Math.abs(t) > 0.9) bricks.push({ x: 0, y: 0, z: t, s: 0.36 });
    instanced('Cube_Bricks', bricks, arm);
    const body = this.kin(new CANNON.Box(new CANNON.Vec3(len, 0.36, 0.36)), x, y + (opts.h ?? 0.75), z, 'sweeper', { w, cx: x, cz: z });
    if (opts.cross) body.addShape(new CANNON.Box(new CANNON.Vec3(0.36, 0.36, len)));
    body.angularVelocity.set(0, w, 0);
    this.sweepers.push({ arm, body, w, x, y: y + 0.75, z, len, pillar });
  }
  saw(x, z, y = 0, amp = 4.4, sp = 1.8, ph = 0, axis = 'x') {
    const o = this.model('Hazard_Saw', x, y + 1.55, z, 1.25, axis === 'x' ? 0 : PI / 2);
    this.inst('Fence_Middle', [-4.5, -1.5, 1.5, 4.5].filter((t) => Math.abs(t) <= amp + 0.5).map((t) => axis === 'x' ? { x: x + t, y, z: z - 0.9, s: 0.8 } : { x: x - 0.9, y, z: z + t, s: 0.8, ry: PI / 2 }));
    const body = this.kin(new CANNON.Sphere(1.5), x, y + 1.55, z, 'saw');
    this.saws.push({ obj: o, body, x, y, z, ph, sp, amp, axis });
  }
  spikeBlock(x, y, z, opts = {}) {
    const wide = !!opts.wide, s = 2.2;
    const o = this.model(wide ? 'k/spike-block-wide' : 'k/spike-block', x, y, z, s, opts.ry || 0);
    const hx = wide ? 2.4 : 0.9, h = 0.9;
    const body = this.kin(new CANNON.Box(new CANNON.Vec3(hx, h, 0.9)), x, y + h + 0.1, z, 'spike');
    if (opts.ry) body.quaternion.setFromEuler(0, opts.ry, 0);
    this.spikes.push({ obj: o, body, x, y, z, wide, axis: opts.axis || 'x', amp: opts.amp || 0, sp: opts.sp || 1.5, ph: opts.ph || 0, spin: opts.spin || 0 });
  }
  mover(x, y, z, opts = {}) {
    const w = opts.w || 4, d = opts.d || 4;
    const o = this.model('k/block-moving-large', x, y - 0.7, z, [w, 1.4, d]);
    const body = this.kin(new CANNON.Box(new CANNON.Vec3(w / 2, 0.35, d / 2)), x, y - 0.35, z, 'mover');
    this.movers.push({ obj: o, body, x, y, z, axis: opts.axis || 'x', amp: opts.amp ?? 4, sp: opts.sp ?? 1, ph: opts.ph || 0 });
  }
  trap(x, z, y = 0) {
    const o = this.model('k/trap-spikes', x, y - 0.02, z, 3.1);
    const mixer = new THREE.AnimationMixer(o); this.mixers.push(mixer);
    const clips = Object.fromEntries(M['k/trap-spikes'].animations.map((a) => [a.name, a]));
    const t = { x, z, y, up: false, timer: rand(0, 2), mixer, clips, act: null };
    this.traps.push(t);
  }
  doorRow(z, y, x0, x1, n, breakable) {
    const w = (x1 - x0) / n, ids = [...Array(n).keys()].sort(() => Math.random() - 0.5).slice(0, breakable);
    for (let i = 0; i < n; i++) {
      const x = x0 + w * (i + 0.5), br = ids.includes(i);
      const s = w / (br ? 0.5 : 0.6);
      const o = this.model(br ? 'k/crate' : 'k/crate-strong', x, y, z, [s, 4.8 / (br ? 0.5 : 0.6) * 0.5, 1.9 / (br ? 0.5 : 0.6)]);
      const b = this.box(x, y + 1.2, z, w / 2, 1.2, 0.95);
      if (br) { b.userData = { kind: 'crate' }; this.crates.push({ body: b, obj: o, x, z, broken: false }); }
    }
    this.doorRows = this.doorRows || []; this.doorRows.push({ z, x0, x1, n, w });
  }
  breakCrate(body) {
    const c = this.crates.find((k) => k.body === body); if (!c || c.broken) return;
    // this can run inside a physics collision callback, so the body is removed after the step
    c.broken = true; c.obj.visible = false; body.collisionResponse = false; setTimeout(() => world.removeBody(body), 0);
    for (let i = 0; i < 18; i++) puffs.emit({ pos: V(c.x + rand(-1, 1), body.position.y + rand(-1, 1), c.z), vel: V(rand(-4, 4), rand(2, 8), rand(-6, 2)), life: rand(0.6, 1.1), size: rand(0.25, 0.45), g: 20, drag: 0.5, color: [0xd98a4e, 0xb86b35, 0xf0b07a][i % 3], shrink: false });
    sfx.crack();
  }
  cannon(x, z, y, dirX, dirZ, period = 2.4, delay = 0, power = 17) {
    const c = this.model('Cannon', x, y + 0.7, z, 0.75, Math.atan2(dirX, dirZ) - PI / 2);
    this.cannons.push({ obj: c, x, y, z, dx: dirX, dz: dirZ, t: delay, period, power });
  }
  coin(x, y, z) { const o = this.model('Coin', x, y, z, 0.45); this.coins.push({ obj: o, taken: false, base: y, x, z }); }
  pickup(x, y, z) {
    const o = this.model('k/crate-item', x, y + 0.4, z, 2.2);
    this.pickups.push({ obj: o, x, y, z, t: 0, on: true });
  }
  checkpoint(x, y, z, w = 14) { this.checkpoints.push({ x, y, z, w }); }
  finishGate(z, y = 0, w = 14) {
    this.model('k/flagCheckers', -w / 2 + 0.5, y, z, 3.2, 0); this.model('k/flagCheckers', w / 2 - 0.5, y, z, 3.2, PI);
    this.model('k/bannerTowerRed', -w / 2 - 1.2, y, z + 2.5, 3); this.model('k/bannerTowerGreen', w / 2 + 1.2, y, z + 2.5, 3);
    this.inst('Cube_Question', [...Array(Math.round(w / 2)).keys()].map((i) => ({ x: -w / 2 + 1 + i * 2, y: y + 5.8, z, s: 0.9 })));
    this.finishZ = z;
  }
  scenery(z0, z1, spread = 26, opts = {}) {
    const trees = [], fruit = [], clouds = [];
    for (let z = z0; z > z1; z -= 10) for (const side of [-1, 1]) (Math.random() < 0.3 ? fruit : trees).push({ x: side * rand(spread, spread + 12), y: opts.treeY ?? -40, z: z + rand(-3, 3), s: rand(1.2, 1.8), sy: rand(4.2, 5.2), ry: rand(0, 6) });
    this.inst('Tree', trees, false); this.inst('Tree_Fruit', fruit, false);
    for (let i = 0; i < 24; i++) clouds.push({ x: rand(-110, 110), y: rand(14, 34), z: rand(z1 - 60, z0 + 50), s: rand(3, 7), ry: rand(0, 6) });
    ['Cloud_1', 'Cloud_2', 'Cloud_3'].forEach((n, k) => this.inst(n, clouds.filter((_, i) => i % 3 === k), false));
    for (const [x, z, s] of opts.towers || [[-50, (z0 + z1) / 2, 3], [55, z1 + 20, 3.4], [-40, z1 - 20, 3.6]]) this.model('Tower', x, -40, z, s, rand(0, 6));
  }

  // ---- explosions break crates and push people; modes may also break floor tiles
  explode(c, r, power = 13) {
    fx.boom(c, r); sfx.boom(); if (G.player && G.player.pos.distanceTo?.(c) < 25) G.shake = 0.5;
    for (const k of this.crates) if (!k.broken && Math.hypot(k.x - c.x, k.z - c.z) < r + 1) this.breakCrate(k.body);
    for (const ru of G.runners) {
      if (ru.out) continue;
      const d = Math.hypot(ru.pos.x - c.x, ru.pos.y + 0.8 - c.y, ru.pos.z - c.z);
      if (d < r + 1.2) { const dir = V(ru.pos.x - c.x, 0, ru.pos.z - c.z).normalize(); ru.tumble(dir.multiplyScalar(power * (1 - d / (r + 2))).add(V(0, 9, 0))); }
    }
    this.onExplode?.(c, r);
  }

  update(dt, t, active) {
    for (const m of this.mixers) m.update(dt);
    for (const f of this.updaters) f(dt, t);
    for (const sw of this.sweepers) { const q = sw.body.quaternion; sw.arm.quaternion.set(q.x, q.y, q.z, q.w); sw.pillar.rotation.y += sw.w * dt; }
    for (const s of this.saws) {
      const o = Math.sin(t * s.sp + s.ph) * s.amp, vo = Math.cos(t * s.sp + s.ph) * s.amp * s.sp;
      if (s.axis === 'x') { s.body.position.x = s.x + o; s.body.velocity.set(vo, 0, 0); s.obj.position.x = s.x + o; }
      else { s.body.position.z = s.z + o; s.body.velocity.set(0, 0, vo); s.obj.position.z = s.z + o; }
      s.obj.rotation.z -= dt * 14;
      if (Math.random() < dt * 16) puffs.emit({ pos: V(s.body.position.x, s.y + 0.15, s.body.position.z), vel: V(rand(-2, 2), rand(1, 3), rand(-1, 1)), life: 0.3, size: 0.12, g: 15, color: 0xffd23f });
    }
    for (const s of this.spikes) {
      if (s.amp) {
        const o = Math.sin(t * s.sp + s.ph) * s.amp, vo = Math.cos(t * s.sp + s.ph) * s.amp * s.sp;
        if (s.axis === 'x') { s.body.position.x = s.x + o; s.body.velocity.set(vo, 0, 0); s.obj.position.x = s.x + o; }
        else if (s.axis === 'y') { s.body.position.y = s.y + 1 + o; s.body.velocity.set(0, vo, 0); s.obj.position.y = s.y + o; }
        else { s.body.position.z = s.z + o; s.body.velocity.set(0, 0, vo); s.obj.position.z = s.z + o; }
      }
    }
    for (const m of this.movers) {
      const o = Math.sin(t * m.sp + m.ph) * m.amp, vo = Math.cos(t * m.sp + m.ph) * m.amp * m.sp;
      const p = m.body.position;
      if (m.axis === 'x') { p.x = m.x + o; m.body.velocity.set(vo, 0, 0); } else if (m.axis === 'y') { p.y = m.y - 0.35 + o; m.body.velocity.set(0, vo, 0); } else { p.z = m.z + o; m.body.velocity.set(0, 0, vo); }
      m.obj.position.set(p.x, p.y - 0.35, p.z);
    }
    for (const tr of this.traps) {
      tr.timer -= dt;
      if (tr.timer <= 0) {
        tr.up = !tr.up; tr.timer = tr.up ? 1.2 : 2.2;
        if (tr.act) tr.act.stop();
        const clip = tr.clips[tr.up ? 'show' : 'hide'];
        if (clip) { tr.act = tr.mixer.clipAction(clip); tr.act.setLoop(THREE.LoopOnce, 1); tr.act.clampWhenFinished = true; tr.act.reset().play(); }
      }
      if (tr.up) for (const r of G.runners) if (!r.out && r.state !== 'tumble' && r.hitCool <= 0 && Math.abs(r.pos.x - tr.x) < 1.5 && Math.abs(r.pos.z - tr.z) < 1.5 && Math.abs(r.pos.y - tr.y) < 0.8) r.tumble(V(rand(-2, 2), 11, rand(-2, 2)));
    }
    for (const c of this.coins) if (!c.taken) { c.obj.rotation.y += dt * 3; c.obj.position.y = c.base + Math.sin(t * 3 + c.z) * 0.12; }
    for (const s of this.spinners) s.obj.rotation.y += s.w * dt;
    for (const p of this.pickups) {
      if (!p.on) { p.t -= dt; if (p.t <= 0) { p.on = true; p.obj.visible = true; fx.burst(V(p.x, p.y + 1, p.z), 0xffffff, 8, 3); } continue; }
      p.obj.rotation.y += dt * 2; p.obj.position.y = p.y + 0.4 + Math.sin(t * 2.5 + p.x) * 0.2;
    }
    if (active) for (const c of this.cannons) {
      c.t += dt;
      c.obj.scale.setScalar(0.75 * (c.t > c.period - 0.35 ? 1 + Math.sin((c.t - c.period + 0.35) * 40) * 0.03 : 1));
      if (c.t >= c.period) { c.t = 0; this.fireCannon(c); }
    }
    this.balls = this.balls.filter((b) => {
      b.life -= dt; b.obj.position.copy(b.body.position); b.obj.quaternion.copy(b.body.quaternion);
      if (b.life <= 0 || b.body.position.y < this.killY) { b.obj.removeFromParent(); world.removeBody(b.body); return false; }
      return true;
    });
  }
  fireCannon(c) {
    const ball = M.Cannonball.scene.clone(); ball.scale.setScalar(1.15); this.root.add(ball);
    const body = new CANNON.Body({ mass: 6, material: matBall, collisionFilterGroup: G_BALL, collisionFilterMask: G_STATIC | G_RUNNER | G_HAZARD | G_BALL, linearDamping: 0.05 });
    body.addShape(new CANNON.Sphere(0.62)); body.userData = { kind: 'ball' };
    const sp = c.power * rand(0.9, 1.12);
    body.position.set(c.x + c.dx * 2.2, c.y + 1.4, c.z + c.dz * 2.2); body.velocity.set(c.dx * sp + rand(-1, 1) * Math.abs(c.dz), rand(2, 4), c.dz * sp + rand(-1, 1) * Math.abs(c.dx));
    world.addBody(body);
    this.balls.push({ obj: ball, body, life: 4 });
    fx.burst(V(c.x + c.dx * 2.4, c.y + 1.5, c.z + c.dz * 2.4), 0xdddddd, 10, 4);
    if (G.player && Math.hypot(G.player.pos.x - c.x, G.player.pos.z - c.z) < 26) sfx.boom();
  }
  dispose() {
    for (const b of this.bodies) world.removeBody(b);
    for (const b of this.balls) world.removeBody(b.body);
    this.root.removeFromParent();
    this.root.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
  }
}
