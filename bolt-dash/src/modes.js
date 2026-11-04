// Game modes: each builds its map from models and runs its own rules and bot targets.
import { THREE, CANNON, M, G, V, PI, rand, pick, clamp, world, fx, puffs, sfx, toast, place, instanced, matGround, matBall, G_STATIC, G_RUNNER, G_HAZARD, G_BALL, G_PROJ } from './core.js';
import { t } from './i18n.js';
import { Level } from './level.js';
import { groundAt } from './runner.js';
import { ITEM, BATS } from './cosmetics.js';

const alive = () => G.runners.filter((r) => !r.out);
const playerLabel = (r) => (r.isPlayer ? t('You') : r.name);

// ======================================================================= RACE
const sprint = {
  id: 'sprint', name: t('Obstacle Dash (Classic)'), short: t('Race'), kind: 'race', icon: 'flag',
  desc: t('Run to the flag past doors, saws and cannons'), weapons: t('Freeze + Push'),
  build() {
    const L = new Level({ killY: -12, pickupPool: [{ id: 'freeze', w: 1 }, { id: 'push', w: 1 }] }); G.level = L;
    const W = 8;
    // start + sweepers
    L.floor(-W, W, 14, -40); L.rails(-W, W, 14, -40);
    L.checkpoint(0, 0, 8);
    for (const x of [-4.5, 0, 4.5]) L.speedPad(x, -1, 0, 0, -1);
    L.sweeper(0, -15, 0, 7.4, 1.35); L.sweeper(0, -31, 0, 6.6, -1.05, { cross: true });
    for (const x of [-5, 5]) L.speedPad(x, -38, 0, 0, -1, 2.6);
    L.pickup(0, 0, -23);
    // doors
    L.floor(-W, W, -40, -66); L.rails(-W, W, -40, -66); L.checkpoint(0, 0, -42);
    L.doorRow(-49, 0, -W, W, 6, 3); L.doorRow(-60, 0, -W, W, 6, 2);
    // bounce gap with moving blocks
    L.checkpoint(0, 0, -63.5);
    for (const x of [-5, 0, 5]) L.bouncer(x, -64, 0, 0, -14.5);
    L.mover(0, 0, -70.6, { w: 4, d: 3.6, axis: 'x', amp: 4.5, sp: 1.1, ph: 0 });
    L.mover(0, 0, -75.6, { w: 4, d: 3.6, axis: 'x', amp: 4.5, sp: 1.1, ph: PI });
    // conveyor, saws, spike traps
    L.floor(-W, W, -80, -122); L.rails(-W, W, -80, -122); L.checkpoint(0, 0, -82);
    L.conveyor(-3, 3, -84, -96, 0, 0, 1, 5.5);
    L.saw(0, -101, 0, 5.2, 1.7, 0); L.saw(0, -109, 0, 5.2, 2.0, 2.2);
    for (const x of [-5, 0, 5]) L.trap(x, -116, 0);
    L.pickup(-5, 0, -98);
    for (const x of [-4.5, 4.5]) L.speedPad(x, -119, 0, 0, -1, 2.6);
    // spike blocks and cannons
    L.floor(-W, W, -122, -162); L.checkpoint(0, 0, -124);
    L.fence(-W, -122, -W, -138); L.fence(W, -122, W, -138);
    L.spikeBlock(0, 0, -129, { wide: true, axis: 'x', amp: 4.2, sp: 1.3 });
    L.spikeBlock(0, 0, -136, { axis: 'x', amp: 5.4, sp: 1.9, ph: 1.5 });
    for (const [z, side, d] of [[-143, 1, 0], [-149, -1, 0.9], [-155, 1, 1.7]]) {
      L.model('RockPlatforms_Medium', side * 11, -2.6, z, 0.9, rand(0, 6)); L.box(side * 11, -0.5, z, 2, 0.5, 2);
      L.cannon(side * 11, z, 0, -side, 0, 2.6, d);
    }
    L.pickup(5, 0, -140);
    // springs up to the finish deck
    for (const x of [-5, 0, 5]) L.spring(x, -160, 0, 21);
    L.floor(-W, W, -164, -200, 3); L.rails(-W, W, -164, -200, 3);
    L.box(0, 1.5, -164.3, W, 1.5, 0.3);
    L.checkpoint(0, 3, -168);
    for (const x of [-4.5, 0, 4.5]) L.speedPad(x, -176, 3, 0, -1);
    L.finishGate(-188, 3, 16);
    // coins
    for (let z = -4; z > -36; z -= 3.2) L.coin(Math.sin(z * 0.3) * 4, 1, z);
    for (let z = -84; z > -118; z -= 3) L.coin(((z / 3) | 0) % 2 ? 5.5 : -5.5, 1, z);
    for (let z = -126; z > -158; z -= 4) L.coin(Math.cos(z * 0.2) * 4, 1, z);
    for (const x of [-5, 0, 5]) L.coin(x, 6, -71);
    L.scenery(20, -220, 30);
    this.finishZ = -188; this.len = 14 + 188;
    this.fly = [[0, 26, -205, 0, 3, -170], [14, 18, -120, 0, 0, -100], [-12, 14, -40, 0, 0, -20], [0, 6, 18, 0, 1, 4]];
  },
  spawn(i) { const row = Math.floor(i / 5), col = i % 5; return { x: -6 + col * 3 + (row % 2) * 1.5, y: 0, z: 10 - row * 2.2 }; },
  target(r) {
    const p = r.pos, ai = r.ai, L = G.level;
    ai.laneT -= 1 / 60; if (ai.laneT < 0) { ai.lane = clamp(ai.lane + rand(-3, 3), -5.5, 5.5); ai.laneT = rand(1.5, 3.5); }
    let x = ai.lane, push = false, noJump = false, jumpNow = false;
    for (const row of L.doorRows || []) {
      if (p.z < row.z + 9 && p.z > row.z - 1.2) {
        if (ai.doorZ !== row.z || ai.stuck > 1) { ai.doorZ = row.z; ai.door = Math.floor(rand(0, row.n)); ai.stuck = 0; }
        x = row.x0 + row.w * (ai.door + 0.5); push = true; noJump = true;
      }
    }
    if (p.z < -54 && p.z > -64.5 && p.y < 1) x = [-5, 0, 5].reduce((a, c) => (Math.abs(c - p.x) < Math.abs(a - p.x) ? c : a));
    if (p.z < -150 && p.z > -161 && p.y < 2) { x = [-5, 0, 5].reduce((a, c) => (Math.abs(c - p.x) < Math.abs(a - p.x) ? c : a)); noJump = true; }
    for (const s of L.saws) { const dz = p.z - s.z, sx = s.body.position.x; if (dz > 0 && dz < 5 && Math.abs(sx - p.x) < 3) x = sx > 0 ? -5.5 : 5.5; }
    for (const s of L.spikes) { const dz = p.z - s.z, sx = s.body.position.x, half = s.wide ? 3.8 : 2; if (dz > 0 && dz < 4.5 && Math.abs(sx - p.x) < half) { x = sx > 0 ? -6 : 6; if (dz < 2) return { x: p.x, z: p.z + 2, noJump: true }; } }
    return { x, z: p.z - 9, push, noJump, jumpNow };
  },
  onFall(r) {
    const L = G.level; let cp = L.checkpoints[0];
    for (const c of L.checkpoints) if (r.bestZ != null && r.bestZ < c.z + 1) cp = c;
    r.reset(rand(-4, 4), cp.y + 3, cp.z);
    fx.dust(V(r.pos.x, cp.y + 0.2, r.pos.z), 10, 0xffffff, 3);
    if (r.isPlayer) toast(t('Checkpoint'));
  },
  update(dt) {
    for (const r of G.runners) {
      if (r.out) continue;
      if (r.grounded && (r.bestZ == null || r.pos.z < r.bestZ)) r.bestZ = r.pos.z;
      if (!r.finished && r.pos.z < this.finishZ && r.pos.y > 2) G.finish(r);
    }
  },
  progress(r) { return clamp((14 - r.pos.z) / this.len, 0, 1); },
};

// ======================================================================= RACE: a winding circuit, two laps
// Loop (clockwise seen from above): down the start straight (-z), left along z=-70 (-x), up x=-80 (+z), back along z=8 (+x).
const LAPS = 2;
const race = {
  id: 'race', name: t('Obstacle Dash'), short: t('Race'), kind: 'race', icon: 'flag', laps: LAPS,
  desc: t('A winding two-lap circuit: seesaws, bouncy pillows, hammers, wrecking balls, fans and launch pads'), weapons: t('Freeze + Push'),
  build() {
    const L = new Level({ killY: -14, pickupPool: [{ id: 'freeze', w: 1 }, { id: 'push', w: 1 }] }); G.level = L;
    // floors (with gaps for the seesaw and the launchpad jump)
    L.floor(-7, 7, 15, -77);
    L.floor(-30, -7, -63, -77); L.floor(-87, -44, -63, -77);
    L.floor(-87, -73, -63, 15);
    L.floor(-73, -50, 1, 15); L.floor(-40, -7, 1, 15);
    // rails: outer edges everywhere, inner edges on the straights
    L.fence(7, 15, 7, -77); L.fence(7, -77, -30, -77); L.fence(-44, -77, -87, -77); L.fence(-87, -77, -87, 15); L.fence(-87, 15, -50, 15); L.fence(-40, 15, 7, 15);
    L.fence(-7, 1, -7, -63, 0, 'fence-low-straight'); L.fence(-7, -63, -30, -63, 0, 'fence-low-straight'); L.fence(-73, -63, -73, 1, 0, 'fence-low-straight');
    // start straight
    for (const x of [-4.5, 0, 4.5]) L.speedPad(x, -6, 0, 0, -1);
    L.pole(0, -18, 0, 6.6, 1.35);
    L.pillows(-7, 7, -27, -39);
    L.pendulum(0, -48, 0, 'z/Obstacle_Hammer', { dir: 'x', amp: 1.0, sp: 1.5, ph: 0 });
    L.pendulum(0, -57, 0, 'z/Obstacle_Hammer', { dir: 'x', amp: 1.0, sp: 1.5, ph: PI });
    L.fan(-7, -66, 0, 1, 0, 6, 10, 7);
    L.speedPad(-2, -70, 0, -1, 0);
    L.pickup(0, 0, -23);
    // the long straight going left
    L.pendulum(-16, -70, 0, 'z/Wrecking_Ball', { dir: 'z', amp: 1.1, sp: 1.7, ph: 0, s: 1.4 });
    L.pendulum(-24, -70, 0, 'z/Wrecking_Ball', { dir: 'z', amp: 1.1, sp: 1.7, ph: 2, s: 1.4 });
    L.seesaw(-37, -70, 0, 'x', 14.5);
    L.roller(-54, -70, 0, 'z', 14, 2.0);
    L.fan(-62, -63, 0, 0, -1, 6, 13, 8);
    for (const z of [-66, -70, -74]) L.coin(-49, 1, z);
    L.pickup(-66, 0, -70);
    // going back up
    L.conveyor(-84, -76, -44, -56, 0, 0, -1, 5);
    L.saw(-80, -34, 0, 4.6, 1.8, 0, 'x'); L.saw(-80, -26, 0, 4.6, 2.1, 2, 'x');
    for (const x of [-84, -80, -76]) L.trap(x, -16, 0);
    L.pole(-80, -5, 0, 6.6, -1.4);
    L.speedPad(-80, 8, 0, 1, 0);
    // last straight: launchpads over the gap, spike blocks, and home
    for (const z of [3, 6.3, 9.7, 13]) L.launchpad(-52.6, z, 0, 18, 0, 17);
    L.spikeBlock(-28, 0, 8, { axis: 'z', amp: 4.5, sp: 1.6 });
    for (const z of [4.5, 11.5]) L.speedPad(-18, z, 0, 1, 0, 2.6);
    L.pickup(-30, 0, 4);
    // the start / finish gate over the start straight
    L.model('k/flagCheckers', -6.5, 0, 0, 3.2, 0); L.model('k/flagCheckers', 6.5, 0, 0, 3.2, PI);
    L.model('k/bannerTowerRed', -9, 0, 2, 3); L.model('k/bannerTowerGreen', 9, 0, 2, 3);
    L.inst('Cube_Question', [-6, -4, -2, 0, 2, 4, 6].map((x) => ({ x, y: 5.8, z: 0, s: 0.9 })));
    // coins
    for (let z = -2; z > -16; z -= 3) L.coin(Math.sin(z) * 3, 1, z);
    for (let x = -12; x > -28; x -= 3.2) L.coin(x, 1, -66 - (x % 2 ? 0 : 6));
    for (let z = -60; z > -4; z += 4.5) L.coin(-80 + Math.sin(z * 0.3) * 4, 1, z);
    // scenery: a tower in the middle of the loop and balloons
    L.model('Tower', -40, -40, -31, 3.4, 0.4);
    for (let i = 0; i < 10; i++) { const o = L.model('z/Balloon', rand(-70, -10), rand(4, 12), rand(-58, -4), rand(2.5, 4), rand(0, 6)); L.updaters.push((dt, t) => { o.position.y += Math.sin(t + i) * 0.004; }); }
    L.scenery(70, -120, 40, { towers: [[-130, -30, 3], [50, -60, 3.4], [-40, 70, 3]] });
    // checkpoints in order around the loop, with the facing to respawn in
    this.cps = [
      { x: 0, z: 0, f: PI, line: true }, { x: 0, z: -42, f: PI }, { x: -12, z: -70, f: -PI / 2 }, { x: -58, z: -70, f: -PI / 2 },
      { x: -80, z: -48, f: 0 }, { x: -80, z: -10, f: 0 }, { x: -66, z: 8, f: PI / 2 }, { x: -24, z: 8, f: PI / 2 },
    ];
    // waypoints for bots along the centre line
    const path = [[0, 8], [0, -70], [-80, -70], [-80, 8], [0, 8]], wp = [];
    for (let i = 0; i < path.length - 1; i++) { const [ax, az] = path[i], [bx, bz] = path[i + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 5); for (let k = 0; k < n; k++) wp.push({ x: ax + (bx - ax) * k / n, z: az + (bz - az) * k / n, dx: Math.sign(bx - ax), dz: Math.sign(bz - az) }); }
    this.wp = wp; this.lapLen = 2 * (78 + 80);
    this.fly = [[-40, 70, 40, -40, 0, -32], [12, 14, -60, 0, 0, -40], [0, 7, 22, 0, 1, 4]];
  },
  spawn(i) { const row = Math.floor(i / 5), col = i % 5; return { x: -6 + col * 3 + (row % 2) * 1.5, y: 0, z: 9 - row * 2.2, facing: PI }; },
  update() {
    for (const r of G.runners) {
      if (r.out || r.finished) continue;
      if (r.lap == null) { r.lap = 0; r.cpi = 0; r.cpCount = 0; }
      const cp = this.cps[r.cpi], p = r.pos;
      const hit = cp.line ? Math.abs(p.x - cp.x) < 7.5 && Math.abs(p.z - cp.z) < 1.6 : Math.hypot(p.x - cp.x, p.z - cp.z) < 8;
      if (hit && p.y > -2) {
        if (r.cpi === 0 && r.cpCount >= this.cps.length) { r.lap++; r.cpCount = 0; if (r.isPlayer && r.lap < LAPS) G.banner?.(t('Lap {n} of {m}', { n: r.lap + 1, m: LAPS }), true); }
        if (r.lap >= LAPS) { G.finish(r); continue; }
        r.lastCp = r.cpi; r.cpi = (r.cpi + 1) % this.cps.length; r.cpCount++;
      }
    }
  },
  onFall(r) {
    const cp = this.cps[r.lastCp ?? 0] || this.cps[0];
    r.reset(cp.x + rand(-3, 3) * (Math.abs(Math.sin(cp.f)) < 0.5 ? 1 : 0), 2, cp.z + rand(-3, 3) * (Math.abs(Math.sin(cp.f)) > 0.5 ? 1 : 0), cp.f);
    if (r.isPlayer) { toast(t('Checkpoint')); G.faceCam?.(cp.f); }
  },
  target(r, dt) {
    const ai = r.ai, p = r.pos;
    if (ai.wpi == null) ai.wpi = 0;
    let w = this.wp[ai.wpi];
    for (let k = 0; k < 4 && Math.hypot(w.x - p.x, w.z - p.z) < 6; k++) { ai.wpi = (ai.wpi + 1) % this.wp.length; w = this.wp[ai.wpi]; }
    ai.laneT -= dt; if (ai.laneT < 0) { ai.lane = clamp(ai.lane + rand(-3, 3), -4.5, 4.5); ai.laneT = rand(1.5, 3.5); }
    const lx = -w.dz * ai.lane, lz = w.dx * ai.lane;
    // dodge saws and spike blocks near the path
    for (const s of G.level.saws.concat(G.level.spikes)) { const d = Math.hypot(s.body.position.x - p.x, s.body.position.z - p.z); if (d < 4) return { x: p.x + (p.x - s.body.position.x) * 2 + w.dx * 3, z: p.z + (p.z - s.body.position.z) * 2 + w.dz * 3 }; }
    return { x: w.x + lx, z: w.z + lz };
  },
  progress(r) { return clamp(((r.lap || 0) + (r.cpCount || 0) / this.cps.length) / LAPS, 0, 1); },
};

// ======================================================================= FALL (hex layers)
const LAYER_COLORS = [0xff7ab8, 0xffd23f, 0x5fe0b0, 0x7fb8ff, 0xc08bff];
const fall = {
  id: 'fall', name: t('Hex Drop'), short: t('Hex Drop'), kind: 'survival', icon: 'hex',
  desc: t('Tiles crack the first time you step on them and drop the second time. Stand still for 3 seconds and they drop too'), weapons: t('RPG + Grenade + Freeze + Fly (rare)'),
  build() {
    const L = new Level({ killY: -39, pickupPool: [{ id: 'rpg', w: 3 }, { id: 'grenade', w: 3 }, { id: 'freeze', w: 3 }, { id: 'fly', w: 1 }] }); G.level = L;
    this.tiles = []; this.layers = [];
    const R = 6, sx = 2.42, sz = 2.095, ys = [0, -7, -14, -21, -28];
    ys.forEach((y, li) => {
      const cells = [];
      for (let q = -R; q <= R; q++) for (let r = Math.max(-R, -q - R); r <= Math.min(R, -q + R); r++) cells.push({ x: sx * (q + r / 2), z: sz * r });
      const { meshes } = L.inst('k/block-snow-low-hexagon', cells.map((c) => ({ x: c.x, y: y - 1.1, z: c.z, s: 2.2 })));
      const color = new THREE.Color(LAYER_COLORS[li]);
      meshes.forEach((m) => { m.frustumCulled = false; for (let i = 0; i < cells.length; i++) m.setColorAt(i, color); m.instanceColor.needsUpdate = true; });
      const layer = { y, meshes, color, tiles: [] };
      cells.forEach((c, i) => {
        const b = new CANNON.Body({ type: CANNON.Body.STATIC, material: matGround, collisionFilterGroup: G_STATIC, collisionFilterMask: G_RUNNER | G_BALL | G_PROJ });
        // the collider hexagon points along z just like the model, so no rotation
        b.addShape(new CANNON.Cylinder(1.39, 1.39, 1.1, 6)); b.position.set(c.x, y - 0.55, c.z);
        world.addBody(b); L.bodies.push(b);
        const t = { li, i, x: c.x, y, z: c.z, body: b, state: 0, visits: 0, fallT: 0, dropY: 0, dropV: 0 };
        b.userData = { tile: t }; layer.tiles.push(t); this.tiles.push(t);
      });
      this.layers.push(layer);
      for (let k = 0; k < 3; k++) { const t = pick(layer.tiles); L.pickup(t.x, y, t.z); }
    });
    L.pickups.forEach((p) => { p.respawn = 8; });
    L.onExplode = (c, r) => { for (const t of this.tiles) if (t.state < 2 && Math.hypot(t.x - c.x, t.z - c.z) < r + 0.6 && Math.abs(t.y - c.y) < 2.2) this.drop(t, 0.05); };
    L.scenery(60, -60, 34, { towers: [[-45, -20, 3], [48, 10, 3.4]] });
    this.fly = [[0, 34, 30, 0, -12, 0], [26, 12, 0, 0, -8, 0], [0, 10, 20, 0, 0, 0]];
    this.mtx = new THREE.Matrix4(); this.tmp = new THREE.Matrix4();
  },
  spawn(i, n) { const a = (i / n) * PI * 2; return { x: Math.cos(a) * 8.5, y: 0.5, z: Math.sin(a) * 8.5, facing: Math.atan2(-Math.cos(a), -Math.sin(a)) }; },
  setTile(t, y, s = 2.2) {
    const L = this.layers[t.li];
    this.mtx.compose(V(t.x, y - 1.1, t.z), new THREE.Quaternion(), V(s, s, s));
    for (const m of L.meshes) { m.setMatrixAt(t.i, this.tmp.copy(this.mtx).multiply(m.userData.local)); m.instanceMatrix.needsUpdate = true; }
  },
  tint(t, hex, k = 1) {
    const c = new THREE.Color(hex ?? this.layers[t.li].color.getHex()).multiplyScalar(k);
    for (const m of this.layers[t.li].meshes) { m.setColorAt(t.i, c); m.instanceColor.needsUpdate = true; }
  },
  drop(t, delay = 0.35) { if (t.state >= 2) return; t.state = 2; t.fallT = delay; this.tint(t, 0xff5050); },
  update(dt) {
    for (const r of G.runners) {
      if (r.out) continue;
      // first step cracks a tile, the next step on it drops it, and 3 seconds standing on it drops it too
      const t = r.grounded ? r.groundBody?.userData?.tile : null;
      if (t) {
        if (r.tile !== t) {
          r.tileT = 0;
          if (t.state === 0) { t.state = 1; this.tint(t, null, 0.62); if (r.isPlayer) sfx.crack(); }
          else if (t.state === 1) this.drop(t);
          r.tile = t;
        } else { r.tileT += dt; if (r.tileT > 3) this.drop(t); }
        r.airT = 0;
      } else { r.airT = (r.airT || 0) + dt; if (r.airT > 0.2 || r.grounded) r.tile = null; }
    }
    for (const t of this.tiles) {
      if (t.state === 2) {
        t.fallT -= dt;
        if (t.fallT > 0) this.setTile(t, t.y + Math.sin(G.t * 60) * 0.05);
        else { world.removeBody(t.body); t.state = 3; t.dropV = 0; t.dropY = t.y; fx.dust(V(t.x, t.y, t.z), 4, 0xffffff, 2); }
      } else if (t.state === 3) {
        t.dropV -= 25 * dt; t.dropY += t.dropV * dt;
        if (t.dropY < t.y - 12) { t.state = 4; this.setTile(t, t.y, 0); } else this.setTile(t, t.dropY);
      }
    }
  },
  onFall(r) { G.eliminate(r); },
  wantsUp(r) { const top = this.layers.findIndex((l) => l.tiles.some((t) => t.state < 2)); return top >= 0 && r.pos.y < this.layers[top].y - 2; },
  target(r, dt) {
    const ai = r.ai, p = r.pos; ai.wanderT -= dt;
    const li = this.layers.findIndex((l) => p.y > l.y - 3.5);
    const layer = this.layers[Math.max(0, li)];
    if (r.weapon && WEAPON_TARGET(r)) { const f = WEAPON_TARGET(r); return { x: f.pos.x, z: f.pos.z, near: 6, avoidHoles: true }; }
    const ok = (t) => t && t.state === 0;
    if (!ok(ai.wander) || ai.wanderT <= 0 || Math.hypot(ai.wander.x - p.x, ai.wander.z - p.z) < 1) {
      const opts = layer.tiles.filter((t) => t.state === 0 && Math.hypot(t.x - p.x, t.z - p.z) < 8 && Math.hypot(t.x - p.x, t.z - p.z) > 2.2);
      const pk = layer.pickups;
      ai.wander = opts.length ? pick(opts) : layer.tiles.find((t) => t.state === 0) || null; ai.wanderT = rand(0.8, 2);
    }
    if (!ai.wander) return { x: p.x + Math.sin(G.t), z: p.z + Math.cos(G.t), avoidHoles: true };
    return { x: ai.wander.x, z: ai.wander.z, avoidHoles: true, near: 0.6 };
  },
};
const WEAPON_TARGET = (r) => {
  let best = null, bd = 16;
  for (const f of G.runners) { if (f === r || f.out || (r.team && f.team === r.team)) continue; const d = Math.hypot(f.pos.x - r.pos.x, f.pos.z - r.pos.z); if (d < bd) { bd = d; best = f; } }
  return best;
};

// ======================================================================= STARS (teams)
const STAR_TYPES = [
  { model: 'k/star', s: 2.4, val: 1, w: 60 }, { model: 'Star', s: 0.55, val: 3, w: 25 },
  { model: 'k/q_Gem_Pink', s: 0.42, val: 5, w: 12 }, { model: 'k/q_Crystal2', s: 1.4, val: 10, w: 3 },
];
const stars = {
  id: 'stars', name: t('Star Grab'), short: t('Stars'), kind: 'team', team: true, icon: 'star',
  desc: t('Two teams. Small star 1, big star 3, gem 5, crystal 10. Get hit and you drop your stars'), weapons: t('Pull + Freeze'),
  build() {
    const L = new Level({ killY: -14, pickupPool: [{ id: 'pull', w: 1 }, { id: 'freeze', w: 1 }] }); G.level = L;
    const H = 21; this.H = H;
    L.floor(-H, H, H, -H); L.fence(-H, H, H, H); L.fence(-H, -H, H, -H); L.fence(-H, H, -H, -H); L.fence(H, H, H, -H);
    L.floor(-4, 4, 4, -4, 2.6); L.floor(-4, 4, 4, -4, 0.6, { shadows: false });
    for (const [x, z] of [[0, 6], [0, -6], [6, 0], [-6, 0]]) L.spring(x, z, 0, 19);
    for (const [x, z] of [[-14, 14], [14, -14], [14, 14], [-14, -14]]) { L.bouncer(x, z, 0, -Math.sign(x) * 6, -Math.sign(z) * 6, 16); }
    L.model('k/bannerTowerRed', -5, 0, H + 0.5, 3.5); L.model('k/bannerTowerRed', 5, 0, H + 0.5, 3.5);
    L.model('k/bannerTowerGreen', -5, 0, -H - 0.5, 3.5, PI); L.model('k/bannerTowerGreen', 5, 0, -H - 0.5, 3.5, PI);
    L.model('k/flag-large-red', -H + 1, 0, H - 1, 4); L.model('k/flag-large-blue', H - 1, 0, -H + 1, 4);
    for (const [x, z] of [[-11, 0], [11, 0], [0, 12], [0, -12]]) L.pickup(x, 0, z);
    L.scenery(56, -56, 34, { towers: [[-45, -10, 3], [45, 15, 3]] });
    this.items = []; this.spawnT = 0; this.score = { red: 0, blue: 0 }; this.time = 75;
    for (let i = 0; i < 16; i++) this.spawnStar();
    this.fly = [[0, 30, 36, 0, 0, 0], [24, 10, 0, 0, 2, 0], [0, 9, 26, 0, 0, 4]];
  },
  spawnStar(at, type) {
    const tot = STAR_TYPES.reduce((a, c) => a + c.w, 0); let k = rand(0, tot), ty = STAR_TYPES[0];
    if (type) ty = type; else for (const c of STAR_TYPES) { k -= c.w; if (k <= 0) { ty = c; break; } }
    let x, z, y = 0;
    if (at) ({ x, z } = at); else if (ty.val === 10) { x = rand(-2.5, 2.5); z = rand(-2.5, 2.5); y = 2.6; } else { x = rand(-this.H + 2, this.H - 2); z = rand(-this.H + 2, this.H - 2); if (Math.abs(x) < 5 && Math.abs(z) < 5) y = 2.6; }
    const o = place(ty.model, x, y + 1, z, ty.s, 0, G.level.root);
    this.items.push({ obj: o, x, y, z, val: ty.val, t: 0 });
  },
  spawn(i, n) { const team = i % 2 ? 'blue' : 'red', k = Math.floor(i / 2); return { x: -6 + k * 4, y: 0, z: team === 'red' ? 16 : -16, facing: team === 'red' ? PI : 0 }; },
  teamOf(i) { return i % 2 ? 'blue' : 'red'; },
  onHit(r) { this.dropStars(r); },
  onShot(r, by, id) { if (id === 'freeze') this.dropStars(r); },
  dropStars(r) {
    const lost = Math.floor((r.carry || 0) / 2); if (!lost) return;
    r.carry -= lost; this.score[r.team] = Math.max(0, this.score[r.team] - lost);
    for (let i = 0; i < Math.min(lost, 6); i++) this.spawnStar({ x: clamp(r.pos.x + rand(-3, 3), -this.H + 2, this.H - 2), z: clamp(r.pos.z + rand(-3, 3), -this.H + 2, this.H - 2) }, STAR_TYPES[lost > 8 && i === 0 ? 1 : 0]);
    if (r.isPlayer) toast(t('You dropped {n} stars!', { n: lost }));
  },
  update(dt) {
    this.time -= dt; this.spawnT -= dt;
    if (this.spawnT < 0 && this.items.length < 16) { this.spawnT = 1.1; this.spawnStar(); }
    for (let i = this.items.length - 1; i >= 0; i--) {
      const s = this.items[i]; s.t += dt; s.obj.rotation.y += dt * 2.5; s.obj.position.y = s.y + 1 + Math.sin(G.t * 3 + s.x) * 0.15;
      for (const r of G.runners) {
        if (r.out || r.busy) continue;
        if (Math.hypot(r.pos.x - s.x, r.pos.z - s.z) < 1.25 && Math.abs(r.pos.y - s.y) < 1.6) {
          r.carry = (r.carry || 0) + s.val; this.score[r.team] += s.val;
          fx.burst(s.obj.position.clone(), s.val >= 5 ? 0xff4f9a : 0xffd23f, 10, 4); if (r.isPlayer || Math.hypot(G.player.pos.x - s.x, G.player.pos.z - s.z) < 10) sfx.star();
          s.obj.removeFromParent(); this.items.splice(i, 1); break;
        }
      }
    }
    if (this.time <= 0) G.endRound();
  },
  onFall(r) { this.dropStars(r); r.reset(rand(-8, 8), 0, r.team === 'red' ? 16 : -16, r.team === 'red' ? PI : 0); },
  target(r) {
    const p = r.pos; let best = null, bs = 0;
    for (const s of this.items) { const d = Math.hypot(s.x - p.x, s.z - p.z) + (s.y > p.y + 1 ? 5 : 0); const sc = s.val / (d + 2); if (sc > bs) { bs = sc; best = s; } }
    if (r.weapon) { const f = WEAPON_TARGET(r); if (f && (f.carry || 0) > 2) return { x: f.pos.x, z: f.pos.z, near: 5 }; }
    if (!best) return { x: 0, z: 0 };
    if (best.y > p.y + 1) { const sp = [[0, 6], [0, -6], [6, 0], [-6, 0]].reduce((a, c) => (Math.hypot(c[0] - p.x, c[1] - p.z) < Math.hypot(a[0] - p.x, a[1] - p.z) ? c : a)); if (Math.hypot(best.x - p.x, best.z - p.z) < 6) return { x: sp[0], z: sp[1], near: 0.2, noJump: true }; }
    return { x: best.x, z: best.z, near: 0.2 };
  },
  hud() { return { red: this.score.red, blue: this.score.blue, time: this.time }; },
  winners() { const w = this.score.red === this.score.blue ? (Math.random() < 0.5 ? 'red' : 'blue') : this.score.red > this.score.blue ? 'red' : 'blue'; return w; },
};

// ======================================================================= BALL (teams + bats)
const ballClassic = {
  id: 'ballClassic', name: t('Bat Ball'), short: t('Ball'), kind: 'team', team: true, bats: true, icon: 'ball',
  desc: t('Two teams with bats: knock the ball into the other team\'s goal. Every bat has its own power'), weapons: t('Bats'),
  build() {
    const L = new Level({ killY: -14 }); G.level = L;
    const X = 12, Z = 21;
    L.floor(-X, X, Z + 3, -Z - 3);
    L.fence(-X, Z, -X, -Z); L.fence(X, Z, X, -Z);
    for (const s of [1, -1]) { L.fence(-X, s * Z, -4, s * Z); L.fence(4, s * Z, X, s * Z); }
    for (const s of [1, -1]) {
      L.model('k/structure-gate-wide', 0, 0, s * (Z + 1.4), [12, 14, 6]);
      L.box(-4.2, 1.6, s * (Z + 1.4), 0.4, 1.6, 2.4); L.box(4.2, 1.6, s * (Z + 1.4), 0.4, 1.6, 2.4); L.box(0, 3.4, s * (Z + 1.4), 4.6, 0.25, 2.4);
      L.box(0, 1.6, s * (Z + 3.2), 4.6, 1.6, 0.3);
      L.model(s > 0 ? 'k/flag-large-red' : 'k/flag-large-blue', -6, 0, s * (Z - 0.5), 4); L.model(s > 0 ? 'k/flag-large-red' : 'k/flag-large-blue', 6, 0, s * (Z - 0.5), 4);
    }
    for (const [x, z] of [[-9, 12], [9, -12], [-9, -12], [9, 12]]) L.model('k/bump', x, 0.02, z, 4);
    L.model('k/windmill', -X - 5, 0, 0, 5, PI / 2); L.model('k/castle', X + 5, 0, 0, 7, -PI / 2);
    L.model('k/trophy', 0, 0, -Z - 6, 5);
    L.scenery(60, -60, 32, { towers: [[-45, -10, 3], [45, 15, 3]] });
    this.ballObj = place('k/ball-green', 0, 1, 0, 26, 0, L.root);
    const b = new CANNON.Body({ mass: 2, material: matBall, linearDamping: 0.35, angularDamping: 0.3, collisionFilterGroup: G_BALL, collisionFilterMask: G_STATIC | G_RUNNER | G_HAZARD | G_BALL });
    b.addShape(new CANNON.Sphere(0.92)); b.userData = { kind: 'bigball' }; world.addBody(b); L.bodies.push(b);
    this.ball = b; this.score = { red: 0, blue: 0 }; this.time = 100; this.resetT = 0; this.curve = null; this.Z = Z; this.X = X; this.GW = 4; this.GH = 3.3;
    this.resetBall();
    this.fly = [[0, 24, 32, 0, 0, 0], [-18, 9, 0, 0, 1, 0], [0, 8, 20, 0, 1, 2]];
  },
  // where a team must send the ball, and which team scored when the ball is at p (or null)
  goalOf(team) { return { x: 0, z: team === 'red' ? -this.Z - 1 : this.Z + 1 }; },
  goalHit(p) { return Math.abs(p.z) > this.Z + 0.6 && Math.abs(p.x) < this.GW && p.y < this.GH ? (p.z > 0 ? 'blue' : 'red') : null; },
  resetBall() { const o = this.ballSpot || { x: 0, z: 0 }; this.ball.position.set(o.x, 2, o.z); this.ball.velocity.set(0, 0, 0); this.ball.angularVelocity.set(0, 0, 0); this.curve = null; },
  spawn(i) { const team = i % 2 ? 'blue' : 'red', k = Math.floor(i / 2); return { x: -6 + k * 4, y: 0, z: team === 'red' ? 12 : -12, facing: team === 'red' ? PI : 0 }; },
  teamOf(i) { return i % 2 ? 'blue' : 'red'; },
  onFire(r) {
    const bat = ITEM[r.equip.bat] || BATS[0];
    if (r.swingCd > 0 || r.busy) return;
    r.swing(); r.swingCd = 1.05 - bat.speed * 0.16;
    const reach = 1.5 + bat.reach * 0.38, fx_ = Math.sin(r.facing), fz = Math.cos(r.facing);
    const bp = this.ball.position, dx = bp.x - r.pos.x, dz = bp.z - r.pos.z, d = Math.hypot(dx, dz);
    if (d < reach + 0.9 && Math.abs(bp.y - r.pos.y - 0.9) < 1.6 && (dx * fx_ + dz * fz) / (d || 1) > 0.2) {
      let pw = 8 + bat.power * 3.3 + (bat.special === 'legend' ? 2 : 0), up = 3;
      if (bat.special === 'lob') up = 10; else if (bat.special === 'ground') { up = 0.5; pw *= 1.12; } else if (bat.special === 'bounce') up = 7;
      const k = r.isPlayer ? (r.batPower ?? 1) : rand(0.8, 1.15); pw *= k; up *= Math.min(1.25, 0.6 + k * 0.45);
      if (r.isPlayer && r.batPerfect) { fx.burst(V(bp.x, bp.y + 0.5, bp.z), 0x36e0a8, 26, 9); G.banner?.(t('PERFECT!'), true); }
      let dir = V(dx / (d || 1) * 0.5 + fx_ * 0.5, 0, dz / (d || 1) * 0.5 + fz * 0.5).normalize();
      if (!r.isPlayer) { const g = this.goalOf(r.team, r), gd = V(g.x - bp.x, 0, g.z - bp.z).normalize(); dir = V(dx / (d || 1), 0, dz / (d || 1)).multiplyScalar(0.35).add(gd.multiplyScalar(0.65)).normalize(); }
      this.ball.velocity.set(dir.x * pw, up, dir.z * pw);
      this.curve = bat.special === 'curve' ? { x: -dir.z * (Math.random() < 0.5 ? 1 : -1) * 9, z: dir.x * 9, t: 1 } : null;
      fx.burst(V(bp.x, bp.y, bp.z), 0xffffff, 10, 5); sfx.bat(); if (bat.special === 'stun') sfx.pan();
      if (r.isPlayer) G.shake = 0.2;
    }
    for (const o of G.runners) {
      if (o === r || o.out || o.team === r.team) continue;
      const ox = o.pos.x - r.pos.x, oz = o.pos.z - r.pos.z, od = Math.hypot(ox, oz);
      const rr = bat.special === 'slam' ? 2.8 : reach;
      if (od < rr && (bat.special === 'slam' || (ox * fx_ + oz * fz) / (od || 1) > 0.3)) {
        const k = 4 + bat.power * 1.6, dir = V(ox, 0, oz).normalize();
        if (bat.special === 'stun') { o.stun(1.3); sfx.pan(); o.knock(dir.multiplyScalar(3).add(V(0, 3, 0)), false); }
        else if (bat.special === 'sticky') { o.slow(1.4); o.knock(dir.multiplyScalar(k).add(V(0, 5, 0))); }
        else if (bat.special === 'slip' || bat.special === 'banana') { o.slip(2); o.knock(dir.multiplyScalar(k).add(V(0, 5, 0))); }
        else o.knock(dir.multiplyScalar(k).add(V(0, bat.special === 'slam' ? 10 : 6, 0)));
      }
    }
  },
  update(dt) {
    this.time -= dt;
    const b = this.ball, p = b.position;
    if (this.curve && this.curve.t > 0) { this.curve.t -= dt; b.velocity.x += this.curve.x * dt; b.velocity.z += this.curve.z * dt; }
    this.ballObj.position.set(p.x, p.y, p.z); this.ballObj.quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
    if (this.resetT > 0) { this.resetT -= dt; if (this.resetT <= 0) { this.resetBall(); G.runners.forEach((r, i) => { if (!r.out) { const s = this.spawn(G.runners.indexOf(r)); r.reset(s.x, 0, s.z, s.facing); } }); } }
    else if (this.goalHit(p)) {
      const scorer = this.goalHit(p); this.score[scorer] += this.lastValue || 1; this.lastValue = 0; this.resetT = 2.2;
      sfx.goal(); fx.confetti(V(p.x, p.y + 1, p.z), 120); toast(scorer === 'red' ? t('Goal for Red!') : t('Goal for Blue!'), 2);
      if (this.score[scorer] >= (this.winScore || 3)) setTimeout(() => G.endRound(), 1400);
    }
    if (p.y < -6) this.resetBall();
    if (this.time <= 0) G.endRound();
  },
  onFall(r) { const s = this.spawn(G.runners.indexOf(r)); r.reset(s.x, 0, s.z, s.facing); },
  target(r) {
    const bp = this.ball.position, p = r.pos, goal = this.goalOf(r.team, r), own = this.goalOf(r.team === 'red' ? 'blue' : 'red');
    const mates = G.runners.filter((o) => !o.out && o.team === r.team);
    const chaser = mates.reduce((a, c) => (Math.hypot(c.pos.x - bp.x, c.pos.z - bp.z) < Math.hypot(a.pos.x - bp.x, a.pos.z - bp.z) ? c : a));
    const fit = (q) => this.fit ? this.fit(q) : { x: clamp(q.x, -this.X + 1, this.X - 1), z: clamp(q.z, -this.Z + 0.7, this.Z - 0.7) };
    if (chaser !== r && mates.length > 1) {
      // one keeper in front of home, the rest spread out ahead of the ball
      const others = mates.filter((m) => m !== chaser), k = others.indexOf(r);
      const ux = goal.x - own.x, uz = goal.z - own.z, ul = Math.hypot(ux, uz) || 1, fx = ux / ul, fz = uz / ul;
      if (k === 0) { const kx = bp.x - own.x, kz = bp.z - own.z, kl = Math.hypot(kx, kz) || 1, q = fit({ x: own.x + kx / kl * 3.5 + fx * 2, z: own.z + kz / kl * 3.5 + fz * 2 }); return { x: q.x, z: q.z, near: 0.8, noJump: true }; }
      const side = k % 2 ? 1 : -1, q = fit({ x: bp.x - fz * side * 6 + fx * 5, z: bp.z + fx * side * 6 + fz * 5 });
      return { x: q.x, z: q.z, near: 1, noJump: true };
    }
    const gx = goal.x - bp.x, gz = goal.z - bp.z, gl = Math.hypot(gx, gz) || 1;
    const behind = fit({ x: bp.x - gx / gl * 1.5, z: bp.z - gz / gl * 1.5 });
    const d = Math.hypot(behind.x - p.x, behind.z - p.z);
    const ready = d < 1.6 || Math.hypot(bp.x - p.x, bp.z - p.z) < 2.2;
    if (ready) { r.facing = Math.atan2(bp.x - p.x, bp.z - p.z); return { x: bp.x, z: bp.z, near: 0.2, fire: Math.random() < 0.25, noJump: true }; }
    return { x: behind.x, z: behind.z, near: 0.3, noJump: true };
  },
  hud() { return { red: this.score.red, blue: this.score.blue, time: this.time }; },
  winners() { return this.score.red === this.score.blue ? (Math.random() < 0.5 ? 'red' : 'blue') : this.score.red > this.score.blue ? 'red' : 'blue'; },
};

// ======================================================================= BALL: the big stadium
const ball = {
  ...ballClassic, id: 'ball',
  desc: t('Two teams with bats: knock the ball into the other team\'s pit. Hold to charge your swing and let go in the green for a perfect hit'),
  build() {
    const L = new Level({ killY: -14 }); G.level = L;
    // a big pit at each end: knock the ball in and it drops = goal
    const X = 16, Z = 26, GW = 8, PD = 7;
    L.floor(-X, X, Z, -Z);
    for (const s of [1, -1]) {
      const z0 = s * Z, z1 = s * (Z + PD), zc = (z0 + z1) / 2;
      L.floor(-X, -GW, Math.max(z0, z1), Math.min(z0, z1)); L.floor(GW, X, Math.max(z0, z1), Math.min(z0, z1));
      L.floor(-X, X, Math.max(z1, z1 + s * 3), Math.min(z1, z1 + s * 3));
      L.fence(-X, z0, -GW, z0); L.fence(GW, z0, X, z0);
      L.fence(-X, z1 + s * 3, X, z1 + s * 3);
      L.box(0, 2.5, z1 + s * 0.4, GW, 2.5, 0.3);
      // dig the pit: brick walls down to a floor far below
      const zlo = Math.min(z0, z1), zhi = Math.max(z0, z1), bricks = [];
      for (let y = -3; y >= -9; y -= 2) {
        for (let z = zlo + 1; z < zhi; z += 2) { bricks.push({ x: -GW - 1, y, z }, { x: GW + 1, y, z }); }
        for (let x = -GW + 1; x < GW; x += 2) { bricks.push({ x, y, z: z0 - s }, { x, y, z: z1 + s }); }
      }
      L.inst('Cube_Bricks', bricks);
      L.box(-GW - 1, -6, zc, 1, 4, PD / 2); L.box(GW + 1, -6, zc, 1, 4, PD / 2);
      L.floor(-GW, GW, zhi, zlo, -10);
      L.model('k/fence-rope', 0, 0, z1 + s * 0.4, [(GW * 2) / 0.94, 4.6 / 0.3, 1]);
      for (const x of [-GW, GW]) L.fence(x, z0, x, z1, 0, 'fence-low-straight');
      for (const x of [-GW - 0.6, GW + 0.6]) L.model(s > 0 ? 'k/flag-large-red' : 'k/flag-large-blue', x, 0, z0 + s * 0.8, 5);
      L.model(s > 0 ? 'k/bannerTowerRed' : 'k/bannerTowerGreen', -GW - 5, 0, zc, 3.6); L.model(s > 0 ? 'k/bannerTowerRed' : 'k/bannerTowerGreen', GW + 5, 0, zc, 3.6);
      L.model(s > 0 ? 'z/Spawn_Red' : 'z/Spawn_Blue', 0, 0.02, s * 14, 5);
      // glowing motes rising out of the pit in the team colour
      const col = s > 0 ? 0xff4f6a : 0x4fa8ff; let k = 0;
      L.updaters.push((dt) => { k -= dt; if (k < 0) { k = 0.12; fx.burst(V(rand(-GW + 1, GW - 1), -1.5, rand(Math.min(z0, z1) + 1, Math.max(z0, z1) - 1)), col, 3, 4); } });
    }
    this.PD = PD;
    for (const sx of [-1, 1]) {
      for (let z = -Z + 2; z <= Z - 2; z += 3.6) {
        L.model('z/Barrier_01', sx * (X + 1.4), 0, z, 1, PI / 2);
      }
    }
    L.model('k/trophy', 0, 0, -Z - PD - 8, 6); L.model('k/castle', X + 18, 0, 0, 8, -PI / 2); L.model('k/windmill', -X - 16, 0, 0, 6, PI / 2);
    L.scenery(80, -80, 40, { towers: [[-60, -20, 3.4], [60, 25, 3.4]] });
    this.ballObj = place('z/Football', 0, 1, 0, 0.92 / 1.14, 0, L.root);
    const b = new CANNON.Body({ mass: 2, material: matBall, linearDamping: 0.3, angularDamping: 0.3, collisionFilterGroup: G_BALL, collisionFilterMask: G_STATIC | G_RUNNER | G_HAZARD | G_BALL });
    b.addShape(new CANNON.Sphere(0.92)); b.userData = { kind: 'bigball' }; world.addBody(b); L.bodies.push(b);
    this.ball = b; this.score = { red: 0, blue: 0 }; this.time = 120; this.resetT = 0; this.curve = null;
    this.Z = Z; this.X = X; this.GW = GW; this.GH = 99;
    this.resetBall();
    this.fly = [[0, 36, 50, 0, 0, 0], [-26, 12, 0, 0, 1, 0], [0, 9, 26, 0, 1, 4]];
  },
  update(dt) { ballClassic.update.call(this, dt); for (const r of G.runners) if (!r.out && r.pos.y < -6) this.onFall(r); },
  goalOf(team) { return { x: 0, z: team === 'red' ? -this.Z - 3 : this.Z + 3 }; },
  goalHit(p) { return Math.abs(p.z) > this.Z + 0.4 && Math.abs(p.x) < this.GW && p.y < -1.2 ? (p.z > 0 ? 'blue' : 'red') : null;
  },
  spawn(i) { const team = i % 2 ? 'blue' : 'red', k = Math.floor(i / 2); return { x: -10 + (k % 6) * 4, y: 0, z: (team === 'red' ? 1 : -1) * (14 + Math.floor(k / 6) * 3), facing: team === 'red' ? PI : 0 }; },
};

// ======================================================================= CANNONS (survive)
const cannons = {
  id: 'cannons', name: t('Cannon Dodge'), short: t('Cannons'), kind: 'survival', icon: 'cannon',
  desc: t('Stay on the platform until time runs out. The cannons fire faster and faster'), weapons: t('Fly Blaster'),
  build() {
    const L = new Level({ killY: -12, pickupPool: [{ id: 'fly', w: 1 }] }); G.level = L;
    const R = 16, tiles = [];
    for (let x = -R + 1; x < R; x += 2) for (let z = -R + 1; z < R; z += 2) if (Math.hypot(x, z) < R) tiles.push({ x, y: -1, z });
    L.inst('Cube_Grass_Single', tiles);
    const b = new CANNON.Body({ type: CANNON.Body.STATIC, material: matGround, collisionFilterGroup: G_STATIC, collisionFilterMask: G_RUNNER | G_BALL | G_PROJ });
    b.addShape(new CANNON.Cylinder(R - 0.6, R - 0.6, 2, 24)); b.position.set(0, -1, 0); world.addBody(b); L.bodies.push(b);
    for (let k = 0; k < 8; k++) { if (k % 2) continue; const a0 = (k / 8) * PI * 2, a1 = ((k + 1) / 8) * PI * 2; L.fence(Math.cos(a0) * (R - 0.6), Math.sin(a0) * (R - 0.6), Math.cos(a1) * (R - 0.6), Math.sin(a1) * (R - 0.6), 0, 'fence-low-straight'); }
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * PI * 2 + PI / 8, x = Math.cos(a) * 21, z = Math.sin(a) * 21;
      L.model('RockPlatforms_Medium', x, -2.6, z, 0.9, rand(0, 6)); L.box(x, -0.5, z, 2, 0.5, 2);
      L.cannon(x, z, 0, -Math.cos(a), -Math.sin(a), rand(2.6, 3.4), rand(0, 2.5), 16);
    }
    L.sweeper(0, 0, 0, 8, 0.7, { cross: true });
    for (const [x, z] of [[-7, 0], [7, 0], [0, 7]]) L.pickup(x, 0, z);
    L.pickups.forEach((p) => { p.respawn = 10; });
    L.scenery(60, -60, 34, { towers: [[-40, -20, 3], [45, 10, 3]] });
    this.time = 60; this.fly = [[0, 32, 30, 0, 0, 0], [24, 8, 6, 0, 1, 0], [0, 9, 20, 0, 1, 0]];
  },
  spawn(i, n) { const a = (i / n) * PI * 2; return { x: Math.cos(a) * 11, y: 0, z: Math.sin(a) * 11, facing: Math.atan2(-Math.cos(a), -Math.sin(a)) }; },
  update(dt) {
    this.time -= dt;
    const k = 1 - this.time / 60;
    for (const c of G.level.cannons) c.period = Math.max(1.1, 3 - k * 1.9);
    for (const sw of G.level.sweepers) sw.body.angularVelocity.set(0, 0.7 + k * 1.1, 0), sw.w = 0.7 + k * 1.1;
    if (this.time <= 0) G.endRound();
  },
  onFall(r) { G.eliminate(r); },
  target(r, dt) {
    const p = r.pos, ai = r.ai; ai.wanderT -= dt;
    if (!ai.wander || ai.wanderT <= 0) { const a = rand(0, PI * 2), d = rand(2, 8); ai.wander = { x: Math.cos(a) * d, z: Math.sin(a) * d }; ai.wanderT = rand(1, 2.5); }
    for (const b of G.level.balls) {
      const v = b.body.velocity, sp = Math.hypot(v.x, v.z); if (sp < 3) continue;
      const rx = p.x - b.body.position.x, rz = p.z - b.body.position.z, along = (rx * v.x + rz * v.z) / sp;
      if (along < 0 || along > 9) continue;
      const perp = (rx * v.z - rz * v.x) / sp;
      if (Math.abs(perp) < 2) { const s = perp >= 0 ? 1 : -1; return { x: p.x + (v.z / sp) * s * 3, z: p.z - (v.x / sp) * s * 3, noJump: along > 2.5, dive: along < 2.5 }; }
    }
    if (Math.hypot(p.x, p.z) > 10) return { x: 0, z: 0 };
    return { x: ai.wander.x, z: ai.wander.z };
  },
};

// ======================================================================= CLIMB
const climb = {
  id: 'climb', name: t('The Summit'), short: t('The Summit'), kind: 'race', icon: 'crown',
  desc: t('Climb the platforms to the crown at the very top'), weapons: t('Confuse Blaster'),
  build() {
    const L = new Level({ killY: -10, pickupPool: [{ id: 'confuse', w: 1 }] }); G.level = L;
    L.floor(-12, 12, 12, -12); L.model('Tower', 38, -40, -30, 3.2, 0.3);
    L.checkpoint(0, 0, 0);
    this.plats = [];
    const N = 32;
    for (let i = 0; i < N; i++) {
      const a = i * 0.62 + 0.4, rad = 7.6 + Math.sin(i * 1.7) * 0.8, x = Math.cos(a) * rad, z = Math.sin(a) * rad, y = 1.5 + i * 1.45;
      const kind = i % 7 === 5 ? 'mover' : 'plat';
      if (kind === 'mover') L.mover(x, y, z, { w: 3.6, d: 3.6, axis: 'y', amp: 0.7, sp: 1.4, ph: i });
      else { L.model('k/platform', x, y - 0.88, z, 4.4, a); L.box(x, y - 0.44, z, 2.2, 0.44, 2.2, { ry: a }); }
      if (i % 6 === 3) L.spring(x + Math.cos(a + 1.57) * 1.1, z + Math.sin(a + 1.57) * 1.1, y, 17);
      if (i % 8 === 2) L.pickup(x, y, z);
      if (i % 6 === 0 && i) L.checkpoint(x, y, z);
      this.plats.push({ x, y, z, i });
      if (i % 4 === 1) L.coin(x, y + 1.2, z);
    }
    const top = this.plats[N - 1];
    this.crownAt = { x: top.x, y: top.y, z: top.z };
    const cr = L.model('acc/Crown', top.x, top.y + 1.4, top.z, 2.6); L.spinners.push({ obj: cr, w: 1.6 });
    L.scenery(60, -60, 30, { towers: [[-45, -20, 3], [48, 10, 3]], treeY: -40 });
    this.fly = [[14, top.y + 6, 14, top.x, top.y, top.z], [16, 18, 0, 0, 12, 0], [0, 6, 16, 0, 1, 0]];
  },
  spawn(i, n) { const a = (i / n) * PI * 2; return { x: Math.cos(a) * 9.5, y: 0, z: Math.sin(a) * 9.5, facing: 0 }; },
  update(dt) {
    const c = this.crownAt;
    for (const r of G.runners) {
      if (r.out || r.finished) continue;
      if (Math.hypot(r.pos.x - c.x, r.pos.z - c.z) < 2.4 && r.pos.y > c.y - 0.6) G.finish(r);
      const lvl = this.plats.findIndex((p) => Math.hypot(r.pos.x - p.x, r.pos.z - p.z) < 2.4 && Math.abs(r.pos.y - p.y) < 0.8);
      if (r.grounded && lvl >= 0) r.best = Math.max(r.best ?? -1, lvl);
    }
  },
  onFall(r) {
    const L = G.level; let cp = L.checkpoints[0];
    for (const c of L.checkpoints) if (c.y <= (this.plats[r.best ?? -1]?.y ?? 0) + 0.1) cp = c;
    r.reset(cp.x + rand(-0.5, 0.5), cp.y + 1, cp.z);
    if (r.isPlayer) toast(t('Checkpoint'));
  },
  target(r) {
    const p = r.pos;
    let cur = -1, bd = 1e9;
    this.plats.forEach((pl, i) => { const d = Math.hypot(p.x - pl.x, p.z - pl.z) + Math.abs(p.y - pl.y) * 2; if (d < bd && p.y > pl.y - 0.8) { bd = d; cur = i; } });
    if (p.y < 1.2) cur = -1;
    const next = this.plats[Math.min(this.plats.length - 1, cur + 1)];
    const d = Math.hypot(next.x - p.x, next.z - p.z);
    const up = next.y > p.y + 0.4;
    if (up && d < 4.2 && r.grounded && Math.random() < r.ai.skill * 0.5) r.input.jump = true;
    return { x: next.x, z: next.z, near: 0.5, noJump: up };
  },
  progress(r) { return clamp(r.pos.y / (this.crownAt?.y || 1), 0, 1); },
};

// ======================================================================= ARENA
const arena = {
  id: 'arena', name: t('Arena'), short: t('Arena'), kind: 'survival', icon: 'target',
  desc: t('Everyone against everyone, and the edges keep falling away. Last one standing wins'), weapons: t('Rapid Blaster + Homing Rocket + Sticky Bomb'),
  build() {
    const L = new Level({ killY: -12, pickupPool: [{ id: 'rapid', w: 4 }, { id: 'homing', w: 2 }, { id: 'sticky', w: 3 }] }); G.level = L;
    this.cells = [];
    const R = 11;
    for (let x = -R + 1; x < R; x += 2) for (let z = -R + 1; z < R; z += 2) if (Math.hypot(x, z) < R) this.cells.push({ x, z, ring: Math.hypot(x, z) });
    const { meshes } = L.inst('Cube_Grass_Single', this.cells.map((c) => ({ x: c.x, y: -1, z: c.z })));
    meshes.forEach((m) => { m.frustumCulled = false; });
    this.meshes = meshes;
    this.cells.forEach((c, i) => { c.i = i; c.body = L.box(c.x, -1, c.z, 1, 1, 1); c.state = 0; });
    for (const [x, z] of [[-6, 0], [6, 0], [0, -6], [0, 6], [-4, 4], [4, -4]]) L.pickup(x, 0, z);
    L.pickups.forEach((p) => { p.respawn = 6; });
    L.scenery(60, -60, 30, { towers: [[-40, -20, 3], [40, 20, 3]] });
    this.time = 90; this.shrinkT = 25; this.mtx = new THREE.Matrix4(); this.tmp = new THREE.Matrix4();
    this.fly = [[0, 26, 26, 0, 0, 0], [17, 6, 4, 0, 1, 0], [0, 7, 16, 0, 1, 0]];
  },
  spawn(i, n) { const a = (i / n) * PI * 2; return { x: Math.cos(a) * 7.5, y: 0, z: Math.sin(a) * 7.5, facing: Math.atan2(-Math.cos(a), -Math.sin(a)) }; },
  update(dt) {
    this.time -= dt; this.shrinkT -= dt;
    if (this.shrinkT <= 0) {
      this.shrinkT = 7;
      const outer = Math.max(...this.cells.filter((c) => c.state === 0).map((c) => c.ring));
      if (outer > 3) { for (const c of this.cells) if (c.state === 0 && c.ring > outer - 1.6) { c.state = 1; c.t = 1.2; } toast(t('The arena is shrinking!')); }
    }
    for (const c of this.cells) {
      if (c.state === 1) { c.t -= dt; this.set(c, Math.sin(G.t * 50) * 0.06); if (c.t <= 0) { c.state = 2; c.v = 0; c.y = 0; G.level.bodies.splice(G.level.bodies.indexOf(c.body), 1); world.removeBody(c.body); } }
      else if (c.state === 2) { c.v -= 25 * dt; c.y += c.v * dt; this.set(c, c.y, c.y < -14 ? 0 : 1); if (c.y < -14) c.state = 3; }
    }
    if (this.time <= 0) G.endRound();
  },
  set(c, y, s = 1) { this.mtx.compose(V(c.x, y - 1, c.z), new THREE.Quaternion(), V(s, s, s)); for (const m of this.meshes) { m.setMatrixAt(c.i, this.tmp.copy(this.mtx).multiply(m.userData.local)); m.instanceMatrix.needsUpdate = true; } },
  onFall(r) { G.eliminate(r); },
  target(r, dt) {
    const p = r.pos, ai = r.ai;
    if (r.weapon) { const f = WEAPON_TARGET(r); if (f) return { x: f.pos.x, z: f.pos.z, near: 5, avoidHoles: true }; }
    const box = G.level.pickups.filter((k) => k.on).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
    if (box && !r.weapon) return { x: box.x, z: box.z, near: 0.2, avoidHoles: true };
    ai.wanderT -= dt; if (!ai.wander || ai.wanderT <= 0) { ai.wander = { x: rand(-4, 4), z: rand(-4, 4) }; ai.wanderT = rand(1, 2); }
    return { x: ai.wander.x, z: ai.wander.z, avoidHoles: true };
  },
};

export { ballClassic };
export const MODES = { race, sprint, ballClassic, fall, stars, ball, cannons, climb, arena };
export const MODE_LIST = [race, fall, stars, ball, cannons, climb, arena];
