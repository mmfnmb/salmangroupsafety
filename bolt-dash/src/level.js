// Level building blocks (every visible piece is a model) plus their physics and per-frame logic.
import { THREE, CANNON, M, G, V, PI, rand, pick, clamp, scene, world, addBox, place, instanced, fx, puffs, sfx, matGround, matBall, G_STATIC, G_RUNNER, G_HAZARD, G_BALL, G_PROJ } from './core.js';

const CAT = { mask: G_RUNNER | G_BALL | G_PROJ };
// all moving obstacles run a bit faster than they were first tuned (players found the maps too easy)
const HARD = 1.2;
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
    w *= HARD;
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
    sp *= HARD;
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
    period /= HARD;
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

  // ---- party obstacles (zoo gameplay models)
  // a hammer or wrecking ball swinging from a frame; dir = the swing direction ('x' or 'z')
  pendulum(x, z, y = 0, model = 'z/Obstacle_Hammer', opts = {}) {
    const s = opts.s ?? 1.1, len = (model === 'z/Obstacle_Hammer' ? 4.6 : 1.7) * s, py = y + len + 0.9, dir = opts.dir || 'x';
    const holder = new THREE.Group(); holder.position.set(x, py, z); this.root.add(holder);
    const o = place(model, 0, 0, 0, s, dir === 'x' ? PI / 2 : 0, holder);
    // frame: two posts and a bar
    const span = opts.span ?? 7.4, along = dir === 'x' ? 'z' : 'x';
    for (const sd of [-1, 1]) { const px = along === 'x' ? x + sd * span : x, pz = along === 'z' ? z + sd * span : z; this.model('z/Obstacle_Pole_Center', px, y, pz, [1.3, (py - y + 0.3) / 4, 1.3]); this.box(px, y + (py - y) / 2, pz, 0.45, (py - y) / 2, 0.45); }
    this.model('z/Obstacle_Pole_Large', x, py + 0.15, z, [1.2, 1.2, span * 2 / 9.08], along === 'z' ? 0 : PI / 2);
    const r = (model === 'z/Obstacle_Hammer' ? 1.05 : 1.0) * s;
    const body = this.kin(new CANNON.Sphere(r), x, py - len, z, 'saw');
    const pd = { holder, body, x, z, py, len, dir, amp: opts.amp ?? 1.0, sp: opts.sp ?? 1.6, ph: opts.ph ?? rand(0, 6) };
    this.updaters.push((dt, t) => {
      const th = pd.amp * Math.sin(t * pd.sp + pd.ph), w = pd.amp * pd.sp * Math.cos(t * pd.sp + pd.ph);
      const ox = Math.sin(th) * pd.len, oy = -Math.cos(th) * pd.len, vx = Math.cos(th) * pd.len * w, vy = Math.sin(th) * pd.len * w;
      if (pd.dir === 'x') { pd.body.position.set(pd.x + ox, pd.py + oy, pd.z); pd.body.velocity.set(vx, vy, 0); pd.holder.rotation.set(0, 0, th); }
      else { pd.body.position.set(pd.x, pd.py + oy, pd.z + ox); pd.body.velocity.set(0, vy, vx); pd.holder.rotation.set(-th, 0, 0); }
    });
  }
  // a big fan that pushes everyone in its wind
  fan(x, z, y, dx, dz, w = 6, len = 12, strength = 9) {
    const o = this.model('z/Fan', x, y, z, 2.2, Math.atan2(dx, dz));
    const blade = place('z/Fan_Blade', 0, 0.75, 0, 1, 0, o); this.spinners.push({ obj: blade, w: 0, spinZ: true });
    this.updaters.push((dt) => { blade.rotation.z += dt * 14; if (Math.random() < dt * 30) puffs.emit({ pos: V(x + dx * 1.5 + rand(-1, 1) * Math.abs(dz) * w / 2, y + rand(0.3, 2.5), z + dz * 1.5 + rand(-1, 1) * Math.abs(dx) * w / 2), vel: V(dx * 18, 0, dz * 18), life: len / 18, size: 0.07, color: 0xffffff }); });
    this.zones.push({ type: 'wind', x: x + dx * len / 2, y, z: z + dz * len / 2, hx: Math.abs(dx) ? len / 2 : w / 2, hz: Math.abs(dz) ? len / 2 : w / 2, dir: { x: dx, z: dz }, speed: strength });
  }
  // a plank on a hinge that tips under weight
  seesaw(x, z, y = 0, along = 'z', len = 10) {
    const sc = len / 8.18, plank = this.model('z/Seesaw_Plank', x, y - 0.4, z, [1.35, 1.3, sc], along === 'z' ? 0 : PI / 2);
    this.model('z/Seesaw_Base', x, y - 0.85, z, [0.9, 1.4, 1.4], along === 'z' ? 0 : PI / 2);
    const hx = along === 'z' ? 2.25 : len / 2, hz = along === 'z' ? len / 2 : 2.25;
    const b = new CANNON.Body({ mass: 4, material: matGround, collisionFilterGroup: G_STATIC, collisionFilterMask: G_RUNNER | G_BALL | G_PROJ, angularDamping: 0.6 });
    b.addShape(new CANNON.Box(new CANNON.Vec3(hx, 0.3, hz))); b.position.set(x, y - 0.3, z); world.addBody(b); this.bodies.push(b);
    const anchor = new CANNON.Body({ mass: 0 }); anchor.position.set(x, y - 0.3, z); world.addBody(anchor); this.bodies.push(anchor);
    const axis = along === 'z' ? new CANNON.Vec3(1, 0, 0) : new CANNON.Vec3(0, 0, 1);
    const hc = new CANNON.HingeConstraint(b, anchor, { pivotA: new CANNON.Vec3(), axisA: axis, pivotB: new CANNON.Vec3(), axisB: axis }); world.addConstraint(hc);
    this.constraints = this.constraints || []; this.constraints.push(hc);
    const e = new CANNON.Vec3();
    this.updaters.push(() => {
      b.quaternion.toEuler(e); const a = along === 'z' ? e.x : e.z;
      const lim = 0.42, k = Math.abs(a) > lim ? 40 : 6; // springs back to level, hard stop past ~24 degrees
      if (along === 'z') b.angularVelocity.x -= a * k * 0.016; else b.angularVelocity.z -= a * k * 0.016;
      b.position.set(x, y - 0.3, z); b.velocity.set(0, 0, 0);
      plank.quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w); if (along !== 'z') plank.rotateY(PI / 2);
      plank.position.set(x, y - 0.4, z);
    });
  }
  pillows(x0, x1, z0, z1, y = 0) {
    for (let x = Math.min(x0, x1) + 1; x < Math.max(x0, x1); x += 2) for (let z = Math.min(z0, z1) + 1; z < Math.max(z0, z1); z += 2) {
      const o = this.model('z/Pillow', x, y + 0.05, z, [1.6, 1.2, 1.6], rand(0, 6));
      const lo = { x, z, y, r: 0.95, vy: 13.5, t: 0, onUse() { lo.t = 0.3; } }; this.launchers.push(lo);
      this.updaters.push((dt) => { lo.t = Math.max(0, lo.t - dt); o.scale.y = 1.2 * (1 - Math.sin(lo.t * 10) * lo.t * 1.2); });
    }
  }
  launchpad(x, z, y = 0, fx_ = 0, fz = 0, vy = 22) {
    const o = this.model('z/Launchpad', x, y - 0.8, z, 1.4);
    const lo = { x, z, y, r: 1.3, vy, fx: fx_ || null, fz, lock: 1.4, onUse() { lo.t = 0.3; }, t: 0 }; if (!fx_ && !fz) lo.fx = null;
    this.launchers.push(lo); this.updaters.push((dt) => { lo.t = Math.max(0, lo.t - dt); o.scale.y = 1.4 * (1 + Math.sin(lo.t * 20) * lo.t); });
  }
  // a long bar spinning low over the floor: jump it like a skipping rope
  pole(x, z, y = 0, len = 6.6, w = 1.3) {
    const pillar = this.model('z/Obstacle_Pole_Center', x, y, z, [1.4, 0.32, 1.4]);
    const arm = new THREE.Group(); arm.position.set(x, y + 0.75, z); this.root.add(arm);
    place('z/Obstacle_Pole_Large', 0, 0, 0, [1, 1, len * 2 / 9.08], PI / 2, arm);
    const body = this.kin(new CANNON.Box(new CANNON.Vec3(len, 0.35, 0.4)), x, y + 0.75, z, 'sweeper', { w, cx: x, cz: z });
    body.angularVelocity.set(0, w, 0);
    this.sweepers.push({ arm, body, w, x, y: y + 0.75, z, len, pillar });
  }
  // a finned roller across the track
  roller(x, z, y = 0, along = 'x', len = 14, w = 2.2) {
    const o = this.model('z/Spinning_Walls', x, y + 0.95, z, [len / 6, 1.1, 1.1], along === 'x' ? 0 : PI / 2);
    const body = this.kin(new CANNON.Box(new CANNON.Vec3(along === 'x' ? len / 2 : 0.9, 0.9, along === 'x' ? 0.9 : len / 2)), x, y + 0.95, z, 'saw');
    this.updaters.push((dt) => { if (along === 'x') o.rotation.x += w * dt; else o.rotation.z += w * dt; });
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

  // ---- new obstacles
  // HOLE IN THE WALL: a brick wall slides toward you with one gap in it; it sinks, comes back with the gap somewhere else
  holeWall(x, z, y = 0, half = 8, opts = {}) {
    const n = Math.round(half), segs = [], travel = opts.travel ?? 16, speed = opts.speed ?? 5;
    for (let i = 0; i < n; i++) {
      const sx = x - half + 1 + i * 2, o = this.model('Cube_Bricks', sx, y + 1.6, z, [0.98, 1.6, 0.35]); // the brick cube is centred on its origin
      const body = this.kin(new CANNON.Box(new CANNON.Vec3(1, 1.6, 0.35)), sx, y + 1.6, z, 'mover');
      segs.push({ o, body, x: sx });
    }
    const w = { segs, x, half, z0: z, phase: 'rise', t: 0, pos: 0, hole: 0, gap: opts.gap ?? 2 }; (this.walls ||= []).push(w);
    w.holeX = () => x - half + 1 + (w.hole + (w.gap - 1) / 2) * 2;
    const pickHole = () => { w.hole = Math.floor(Math.random() * (n - w.gap + 1)); segs.forEach((g, i) => { const open = i >= w.hole && i < w.hole + w.gap; g.open = open; g.o.visible = !open; }); };
    pickHole();
    this.updaters.push((dt) => {
      w.t += dt; let yy = 0, vz = 0;
      if (w.phase === 'rise') { yy = -3.4 * (1 - Math.min(1, w.t / 0.8)); if (w.t > 1.4) { w.phase = 'move'; w.t = 0; } }
      else if (w.phase === 'move') { w.pos = Math.min(travel, w.pos + speed * dt); vz = speed; if (w.pos >= travel) { w.phase = 'sink'; w.t = 0; } }
      else if (w.phase === 'sink') { yy = -3.4 * Math.min(1, w.t / 0.6); if (w.t > 0.8) { w.phase = 'rise'; w.t = 0; w.pos = 0; pickHole(); } }
      for (const g of segs) {
        const solid = !g.open && yy > -2.5;
        g.body.collisionResponse = solid; g.body.position.set(g.x, y + 1.6 + yy, w.z0 + w.pos); g.body.velocity.set(0, 0, solid ? vz : 0);
        g.o.position.set(g.x, y + 1.6 + yy, w.z0 + w.pos);
      }
    });
  }
  // TRAPDOOR BRIDGE: a bridge of tiles over a pit; groups of tiles flash red and swing open under your feet
  trapBridge(x0, x1, z0, z1, y = 0) {
    const cells = []; for (let x = x0 + 1; x < x1; x += 2) for (let z = z0 - 1; z > z1; z -= 2) cells.push({ x, z });
    const { meshes } = this.inst('Cube_Grass_Single', cells.map((c) => ({ x: c.x, y: y - 1, z: c.z })));
    meshes.forEach((m) => { m.frustumCulled = false; });
    const base = [0x7fb8ff, 0xffd23f, 0xff7ab8, 0x5fe0b0], col = new THREE.Color(), mtx = new THREE.Matrix4(), tmp = new THREE.Matrix4(), q = new THREE.Quaternion();
    const tiles = cells.map((c, i) => ({ ...c, i, body: this.box(c.x, y - 1, c.z, 1, 1, 1), state: 0, t: 0, ang: 0, c: base[(Math.round(c.x / 2) + Math.round(c.z / 2)) & 3] }));
    const paint = (tl, hex) => { col.setHex(hex); for (const m of meshes) { m.setColorAt(tl.i, col); m.instanceColor.needsUpdate = true; } };
    const pose = (tl) => { q.setFromEuler(new THREE.Euler(tl.ang, 0, 0)); mtx.compose(V(tl.x, y - 1 - Math.sin(tl.ang) * 1, tl.z - (1 - Math.cos(tl.ang)) * 1), q, V(1, 1, 1)); for (const m of meshes) { m.setMatrixAt(tl.i, tmp.copy(mtx).multiply(m.userData.local)); m.instanceMatrix.needsUpdate = true; } };
    tiles.forEach((tl) => paint(tl, tl.c));
    let next = 1.5, wave = 0;
    this.updaters.push((dt) => {
      next -= dt;
      if (next <= 0) { // a new pattern: alternating stripes, a checkerboard or a random third of the bridge
        next = 2.6; wave++; const kind = wave % 3;
        for (const tl of tiles) { const a = Math.round(tl.x / 2), b = Math.round(tl.z / 2); const pick_ = kind === 0 ? (b + wave) % 2 === 0 : kind === 1 ? (a + b + wave) % 2 === 0 : Math.random() < 0.35; if (pick_ && tl.state === 0) { tl.state = 1; tl.t = 0.9; } }
      }
      for (const tl of tiles) {
        if (tl.state === 1) { tl.t -= dt; paint(tl, tl.t % 0.2 < 0.1 ? 0xff3030 : tl.c); if (tl.t <= 0) { tl.state = 2; tl.t = 1.5; tl.body.collisionResponse = false; } }
        else if (tl.state === 2) { tl.ang = Math.min(1.5, tl.ang + dt * 6); pose(tl); tl.t -= dt; if (tl.t <= 0) { tl.state = 3; } }
        else if (tl.state === 3) { tl.ang = Math.max(0, tl.ang - dt * 4); pose(tl); if (tl.ang === 0) { tl.state = 0; tl.body.collisionResponse = true; paint(tl, tl.c); } }
      }
    });
  }
  // PISTON PIT: platforms that pump up and down over a pit, out of step with each other
  pistonPit(x0, x1, z0, z1, y = 0) {
    let k = 0;
    for (let z = z0 - 2.5; z > z1 + 1; z -= 4.2) for (let x = x0 + 2.5; x < x1 - 1; x += 4.4) { this.mover(x, y, z, { w: 3.6, d: 3.4, axis: 'y', amp: 1.6, sp: 1.4 + (k % 3) * 0.25, ph: k * 1.3 }); k++; }
  }
  // CRUSHERS: spiked blocks that slam down from above and slowly rise again
  crushers(z, y = 0, xs = [-4.5, 0, 4.5]) {
    xs.forEach((x, i) => {
      const o = this.model('k/spike-block', x, y + 3, z, 2.2, PI);
      const body = this.kin(new CANNON.Box(new CANNON.Vec3(0.95, 0.9, 0.95)), x, y + 4, z, 'spike');
      let t = i * 0.9;
      this.updaters.push((dt) => {
        t += dt; const c = t % 2.7, h = c < 1.4 ? 3 : c < 1.6 ? 3 - (c - 1.4) / 0.2 * 3 : c < 2.1 ? 0 : (c - 2.1) / 0.6 * 3;
        o.position.y = y + h; body.position.set(x, y + h + 0.9, z); body.velocity.set(0, c >= 1.4 && c < 1.6 ? -15 : 0, 0);
        if (c >= 1.6 && c < 1.65) fx.dust(V(x, y + 0.1, z), 3, 0xffffff, 2);
      });
    });
  }
  // LASER BAR: a long glowing bar spinning around a post, low (jump it) or at head height (dive under it)
  laserBar(x, z, y = 0, len = 7, high = false, w = 1.6) {
    const h = high ? 1.25 : 0.45;
    this.model('Hazard_Cylinder', x, y, z, 0.6);
    const bar = this.model('z/Obstacle_Pole_Large', x, y + h, z, [0.55, 0.55, len / 9.08], 0);
    bar.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.setHex(0xff2244); m.material.emissive = new THREE.Color(0xff0022); m.material.emissiveIntensity = 1.2; } });
    const body = this.kin(new CANNON.Box(new CANNON.Vec3(0.15, 0.15, len / 2)), x, y + h, z, 'saw');
    let a = 0;
    this.updaters.push((dt) => { a += w * dt; bar.rotation.y = a; body.quaternion.setFromEuler(0, a, 0); body.angularVelocity.set(0, w, 0); });
  }
  // MOON ZONE: weak gravity, you float up high and drift down slowly
  moonZone(x, z, y, hx, hz) {
    this.zones.push({ type: 'moon', x, y: y + 3, z, hx, hz });
    for (let k = 0; k < 6; k++) this.model('Star', x + rand(-hx, hx), y + rand(2, 6), z + rand(-hz, hz), 0.35, rand(0, 6));
  }
  // SHRINKING PADS: little platforms over the void that shrink away and pop back
  shrinkPads(list, y = 0) {
    list.forEach(([x, z], i) => {
      const o = this.model('Cube_Grass_Single', x, y - 0.5, z, [1.2, 0.5, 1.2]); const body = this.box(x, y - 0.5, z, 1.2, 0.5, 1.2);
      let t = i * 0.8;
      this.updaters.push((dt) => {
        t += dt; const c = t % 4.4, s = c < 2.2 ? 1 : c < 3.2 ? 1 - (c - 2.2) : c < 3.8 ? 0 : (c - 3.8) / 0.6;
        o.scale.set(1.2 * Math.max(0.001, s), 0.5, 1.2 * Math.max(0.001, s)); body.collisionResponse = s > 0.35;
      });
    });
  }
  // ROLLING BOULDERS: big spiked boulders roll down the lane toward you, one lane at a time
  boulders(x, zFrom, zTo, y = 0, half = 6, every = 1.6) {
    const pool = [];
    for (let i = 0; i < 6; i++) { const o = this.model('SpikyBall', x, -50, zFrom, 1.6); const body = this.kin(new CANNON.Sphere(1.1), x, -50, zFrom, 'spiky'); pool.push({ o, body, on: false, x: 0, z: 0 }); }
    let t = 0;
    const dir = Math.sign(zTo - zFrom), speed = 9;
    this.updaters.push((dt) => {
      t -= dt;
      if (t <= 0) { t = every; const b = pool.find((p) => !p.on); if (b) { b.on = true; b.x = x + (Math.floor(Math.random() * 3) - 1) * (half * 0.6); b.z = zFrom; } }
      for (const b of pool) {
        if (!b.on) continue; b.z += dir * speed * dt;
        b.body.position.set(b.x, y + 1.1, b.z); b.body.velocity.set(0, 0, dir * speed); b.o.position.set(b.x, y + 1.1, b.z); b.o.rotation.x += dir * speed * dt / 1.1;
        if (Math.random() < dt * 8) puffs.emit({ pos: V(b.x, y + 0.1, b.z), vel: V(rand(-1, 1), rand(0.5, 1.5), 0), life: 0.4, size: 0.18, drag: 2, color: 0xd9c8a0 });
        if ((zTo - b.z) * dir <= 0) { b.on = false; b.body.position.set(x, -50, zFrom); b.o.position.set(x, -50, zFrom); }
      }
    });
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
    for (const s of this.spinners) if (!s.spinZ) s.obj.rotation.y += s.w * dt;
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
    for (const c of this.constraints || []) world.removeConstraint(c);
    for (const b of this.bodies) world.removeBody(b);
    for (const b of this.balls) world.removeBody(b.body);
    this.root.removeFromParent();
    this.root.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
  }
}
