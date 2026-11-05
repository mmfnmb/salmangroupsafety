// Party mini-games: Lava Tiles and Hot Bomb. They register themselves into MODES / MODE_LIST when this module loads.
import { THREE, CANNON, G, V, PI, rand, pick, clamp, world, place, fx, sfx, toast, G_STATIC, G_RUNNER, G_BALL, G_PROJ, matGround } from './core.js';
import { t } from './i18n.js';
import { Level } from './level.js';
import { MODES, MODE_LIST } from './modes.js';

// a grid of separate tiles (one physics body each) drawn with one instanced model
function tileGrid(L, model, cells, s, y = 0) {
  const { meshes } = L.inst(model, cells.map((c) => ({ x: c.x, y: y - 1, z: c.z, s })));
  meshes.forEach((m) => { m.frustumCulled = false; });
  const tiles = cells.map((c, i) => {
    const b = new CANNON.Body({ type: CANNON.Body.STATIC, material: matGround, collisionFilterGroup: G_STATIC, collisionFilterMask: G_RUNNER | G_BALL | G_PROJ });
    b.addShape(new CANNON.Box(new CANNON.Vec3(s * 0.5, 1, s * 0.5))); b.position.set(c.x, y - 1, c.z); world.addBody(b); L.bodies.push(b);
    return { i, x: c.x, y, z: c.z, body: b, state: 0, t: 0, dropY: y, dropV: 0, color: new THREE.Color(c.color) };
  });
  const mtx = new THREE.Matrix4(), tmp = new THREE.Matrix4();
  const grid = {
    meshes, tiles,
    set(tl, yy, sc = s) { mtx.compose(V(tl.x, yy - 1, tl.z), new THREE.Quaternion(), V(sc, sc, sc)); for (const m of meshes) { m.setMatrixAt(tl.i, tmp.copy(mtx).multiply(m.userData.local)); m.instanceMatrix.needsUpdate = true; } },
    tint(tl, c) { for (const m of meshes) { m.setColorAt(tl.i, c); m.instanceColor.needsUpdate = true; } },
  };
  tiles.forEach((tl) => grid.tint(tl, tl.color));
  return grid;
}

// ======================================================================= LAVA TILES
// tiles glow orange, then red, then drop into the lava. Every 20 seconds a new danger joins in.
const LAVA_COLS = [0x3d8bff, 0x4be3a0, 0xffd23f, 0xff7ac0, 0xa78bfa, 0x5ce1e6];
const lava = {
  id: 'lava', name: t('Lava Tiles'), short: t('Lava'), kind: 'survival', icon: 'hex',
  desc: t('Tiles glow and drop into the lava. Every 20 seconds a new danger joins in. Last one standing wins'), weapons: t('Push + Grab'),
  build() {
    const L = new Level({ killY: -8 }); G.level = L;
    const cells = [], N = 9;
    for (let x = -N; x <= N; x++) for (let z = -N; z <= N; z++) if (Math.hypot(x, z) < N + 0.6) cells.push({ x: x * 2, z: z * 2, color: LAVA_COLS[(Math.abs(x) + Math.abs(z)) % LAVA_COLS.length] });
    this.g = tileGrid(L, 'Cube_Grass_Single', cells, 1, 0);
    // a sea of rocks below, so falling looks like falling into a pit
    for (let k = 0; k < 26; k++) { const a = rand(0, PI * 2), d = rand(4, 26); L.model(pick(['Rock_1', 'Rock_2']), Math.cos(a) * d, -9, Math.sin(a) * d, rand(1.5, 3), rand(0, 6)); }
    L.scenery(70, -70, 40, { towers: [[-40, -20, 3], [45, 10, 3.4]] });
    this.time = 120; this.t = 0; this.next = 2; this.stage = 0;
    this.fly = [[0, 30, 28, 0, -4, 0], [22, 10, 6, 0, 0, 0], [0, 9, 18, 0, 0, 0]];
  },
  spawn(i, n) { const a = (i / n) * PI * 2; return { x: Math.cos(a) * 9, y: 0.3, z: Math.sin(a) * 9, facing: Math.atan2(-Math.cos(a), -Math.sin(a)) }; },
  // dangers that join the round, one every 20 s
  addDanger() {
    const L = G.level; this.stage++;
    if (this.stage === 1) { L.sweeper(0, 0, 0, 9, 0.8); toast(t('Watch out: the spinning arm!'), 2); }
    else if (this.stage === 2) { for (const a of [0, PI]) L.cannon(Math.cos(a) * 24, Math.sin(a) * 24, 0.2, -Math.cos(a), -Math.sin(a), 2.6, rand(0, 1), 15); toast(t('Cannons!'), 2); }
    else if (this.stage === 3) { L.saw(0, 6, 0, 10, 1.6, 0, 'x'); L.saw(0, -6, 0, 10, 1.6, PI, 'x'); toast(t('Saws!'), 2); }
    else if (this.stage === 4) { for (const a of [PI / 2, -PI / 2]) L.cannon(Math.cos(a) * 24, Math.sin(a) * 24, 0.2, -Math.cos(a), -Math.sin(a), 2.0, rand(0, 1), 16); toast(t('More cannons!'), 2); }
    sfx.beep();
  },
  update(dt) {
    this.time -= dt; this.t += dt;
    if (this.t > (this.stage + 1) * 20) this.addDanger();
    // start glowing new tiles, faster and faster
    this.next -= dt;
    if (this.next <= 0) {
      const live = this.g.tiles.filter((tl) => tl.state === 0);
      const n = 1 + Math.floor(this.t / 25);
      for (let k = 0; k < n && live.length; k++) { const tl = live.splice(Math.floor(Math.random() * live.length), 1)[0]; tl.state = 1; tl.t = 0; }
      this.next = Math.max(0.25, 1.1 - this.t * 0.008);
    }
    const warm = new THREE.Color();
    for (const tl of this.g.tiles) {
      if (tl.state === 1) {
        tl.t += dt; const k = Math.min(1, tl.t / 1.8);
        warm.copy(tl.color).lerp(new THREE.Color(k < 0.5 ? 0xff9f1a : 0xff2a10), k).multiplyScalar(1 + Math.sin(tl.t * 18) * 0.15 * k);
        this.g.tint(tl, warm); if (k > 0.6) this.g.set(tl, tl.y + Math.sin(G.t * 50) * 0.04);
        if (tl.t > 1.8) { tl.state = 2; tl.dropV = 0; tl.dropY = tl.y; world.removeBody(tl.body); fx.dust(V(tl.x, tl.y, tl.z), 3, 0xff6a2a, 2); }
      } else if (tl.state === 2) {
        tl.dropV -= 22 * dt; tl.dropY += tl.dropV * dt;
        if (tl.dropY < tl.y - 10) { tl.state = 3; this.g.set(tl, tl.y, 0); } else this.g.set(tl, tl.dropY);
      }
    }
    if (this.time <= 0) G.endRound();
  },
  onFall(r) { G.eliminate(r); },
  target(r, dt) {
    const p = r.pos, ai = r.ai; ai.wanderT = (ai.wanderT || 0) - dt;
    // run to a safe tile that is not glowing, close to the middle
    const bad = (x) => !x || x.state !== 0;
    if (bad(ai.wander) || ai.wanderT <= 0 || Math.hypot(ai.wander.x - p.x, ai.wander.z - p.z) < 0.8) {
      const opts = this.g.tiles.filter((tl) => tl.state === 0 && Math.hypot(tl.x - p.x, tl.z - p.z) < 7 && Math.hypot(tl.x - p.x, tl.z - p.z) > 1.5);
      opts.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
      ai.wander = opts.length ? opts[Math.floor(Math.random() * Math.min(5, opts.length))] : this.g.tiles.find((tl) => tl.state === 0) || null; ai.wanderT = rand(0.6, 1.6);
    }
    if (!ai.wander) return { x: p.x, z: p.z, stop: true };
    return { x: ai.wander.x, z: ai.wander.z, near: 0.4, avoidHoles: true };
  },
};

// ======================================================================= HOT BOMB
// one player carries a ticking bomb; touch someone to pass it. When it blows up, the carrier is out.
const bomb = {
  id: 'bomb', name: t('Hot Bomb'), short: t('Bomb'), kind: 'survival', icon: 'target',
  desc: t('Someone carries a ticking bomb. Touch another player to pass it on. When it explodes, whoever holds it is out'), weapons: t('Push + Grab'),
  build() {
    const L = new Level({ killY: -10 }); G.level = L;
    const R = 13, tiles = [];
    for (let x = -R + 1; x < R; x += 2) for (let z = -R + 1; z < R; z += 2) if (Math.hypot(x, z) < R) tiles.push({ x, y: -1, z });
    L.inst('Cube_Grass_Single', tiles);
    L.box(0, -1, 0, R - 1, 1, R - 1);
    for (let k = 0; k < 8; k++) { const a0 = (k / 8) * PI * 2, a1 = ((k + 1) / 8) * PI * 2; L.fence(Math.cos(a0) * (R - 0.8), Math.sin(a0) * (R - 0.8), Math.cos(a1) * (R - 0.8), Math.sin(a1) * (R - 0.8), 0, 'fence-low-straight'); }
    // cover to run around
    for (const [x, z] of [[-5, -5], [5, 5], [-5, 5], [5, -5]]) { L.model('Cube_Crate', x, 0.5, z, 1.2); L.box(x, 0.6, z, 0.65, 0.6, 0.65); }
    L.scenery(60, -60, 34, { towers: [[-40, -20, 3], [45, 10, 3]] });
    this.obj = place('k/bomb', 0, 2, 0, 2.2, 0, L.root); this.holder = null; this.fuse = 0; this.passCd = 0; this.from = null;
    this.fly = [[0, 26, 24, 0, 0, 0], [18, 8, 4, 0, 1, 0], [0, 8, 14, 0, 1, 0]];
  },
  spawn(i, n) { const a = (i / n) * PI * 2; return { x: Math.cos(a) * 8, y: 0, z: Math.sin(a) * 8, facing: Math.atan2(-Math.cos(a), -Math.sin(a)) }; },
  give(r) {
    this.holder = r; this.passCd = 0.7;
    if (r.isPlayer) { toast(t('You have the bomb! Pass it on!'), 1.6); sfx.beep(); }
  },
  newBomb() { const live = G.runners.filter((r) => !r.out); if (live.length < 2) return; this.give(pick(live)); this.fuse = rand(11, 17); this.from = null; },
  update(dt) {
    if (!this.holder && !this.waitT) { this.newBomb(); }
    if (this.waitT) { this.waitT -= dt; if (this.waitT <= 0) { this.waitT = 0; this.newBomb(); } }
    const h = this.holder;
    if (h && h.out) { this.holder = null; this.waitT = 1; }
    if (!this.holder) { this.obj.visible = false; return; }
    this.obj.visible = true;
    this.fuse -= dt; this.passCd -= dt;
    // the bomb floats over the carrier's head and ticks faster near the end
    const beat = this.fuse < 3 ? 10 : this.fuse < 6 ? 5 : 2.5;
    this.obj.position.set(h.pos.x, h.pos.y + 1.9 + Math.abs(Math.sin(G.t * beat)) * 0.15, h.pos.z); this.obj.rotation.y += dt * 2;
    this.obj.scale.setScalar(2.2 * (1 + Math.max(0, Math.sin(G.t * beat * 2)) * (this.fuse < 3 ? 0.18 : 0.06)));
    if (Math.floor(this.fuse * beat / 3) !== Math.floor((this.fuse + dt) * beat / 3)) sfx.tick();
    if (this.passCd <= 0) for (const r of G.runners) {
      if (r === h || r.out || (r === this.from && this.passCd > -0.8)) continue;
      if (Math.hypot(r.pos.x - h.pos.x, r.pos.z - h.pos.z) < 1.15 && Math.abs(r.pos.y - h.pos.y) < 1.2) { this.from = h; this.give(r); fx.burst(V(r.pos.x, r.pos.y + 1.4, r.pos.z), 0xff7a1a, 8, 4); break; }
    }
    if (this.fuse <= 0) {
      const p = V(h.pos.x, h.pos.y + 1, h.pos.z); fx.boom(p, 3); sfx.boom();
      // a blast that throws everyone near
      for (const r of G.runners) { if (r === h || r.out) continue; const dx = r.pos.x - h.pos.x, dz = r.pos.z - h.pos.z, d = Math.hypot(dx, dz); if (d < 3.5) r.knock(V(dx / (d || 1) * 9, 7, dz / (d || 1) * 9)); }
      this.holder = null; this.waitT = 1.6; G.eliminate(h);
    }
  },
  onFall(r) { G.eliminate(r); },
  target(r, dt) {
    const p = r.pos, h = this.holder;
    if (h === r) {
      // carrier: chase the closest other player
      let best = null, bd = 1e9; for (const o of G.runners) { if (o === r || o.out) continue; const d = Math.hypot(o.pos.x - p.x, o.pos.z - p.z); if (d < bd) { bd = d; best = o; } }
      return best ? { x: best.pos.x, z: best.pos.z, near: 0.1, dive: bd < 2.5 && Math.random() < 0.3 } : { x: 0, z: 0 };
    }
    if (h && !h.out) {
      // everyone else: run away from the carrier, staying inside the ring
      const dx = p.x - h.pos.x, dz = p.z - h.pos.z, d = Math.hypot(dx, dz) || 1;
      let tx = p.x + dx / d * 5, tz = p.z + dz / d * 5; const l = Math.hypot(tx, tz); if (l > 9) { tx = tx / l * 9 + -dz / d * 4; tz = tz / l * 9 + dx / d * 4; }
      return { x: tx, z: tz, near: 0.2 };
    }
    return { x: p.x, z: p.z, stop: true };
  },
};

Object.assign(MODES, { lava, bomb });
MODE_LIST.push(lava, bomb);

// ======================================================================= TRAINING
// a short course that teaches each move; the tips match the device (keyboard keys or the phone buttons)
import { IS_TOUCH } from './core.js';
const TIPS = [
  [8, t('Run: W A S D'), t('Run: drag the stick on the left')],
  [-4, t('Jump the gap: Space'), t('Jump the gap: yellow button')],
  [-20, t('Dive under the arm: Shift'), t('Dive under the arm: green button')],
  [-34, t('Run into the doors to break the weak ones'), t('Run into the doors to break the weak ones')],
  [-46, t('Push the dummy: Q. Hold G to grab him'), t('Push the dummy: orange button. Hold the purple button to grab him')],
  [-58, t('Speed arrows throw you forward. Reach the flag!'), t('Speed arrows throw you forward. Reach the flag!')],
];
const training = {
  id: 'training', name: t('Training'), short: t('Training'), kind: 'race', icon: 'flag', noPush: true,
  desc: t('Learn every move step by step. The tips show your keys or your phone buttons'), weapons: t('Push + Grab'),
  build() {
    const L = new Level({ killY: -10 }); G.level = L; const W = 6;
    L.floor(-W, W, 14, -2); L.rails(-W, W, 14, -2); L.checkpoint(0, 0, 8);
    L.floor(-W, W, -6, -40); L.rails(-W, W, -6, -40); L.checkpoint(0, 0, -8);
    L.sweeper(0, -22, 0, 5.4, 0.9);
    L.doorRow(-36, 0, -W, W, 4, 2);
    L.floor(-W, W, -40, -80); L.rails(-W, W, -40, -80); L.checkpoint(0, 0, -42);
    for (const x of [-3, 3]) L.speedPad(x, -60, 0, 0, -1);
    L.finishGate(-72, 0, 12);
    for (let z = 4; z > -70; z -= 6) L.coin(0, 1, z);
    L.scenery(20, -100, 26);
    this.finishZ = -72; this.len = 86; this.tip = -1;
    this.fly = [[0, 20, -90, 0, 0, -60], [0, 8, 18, 0, 1, 4]];
  },
  spawn(i) { return i === 0 ? { x: 0, y: 0, z: 10 } : { x: 0, y: 0, z: -50, facing: 0 }; },
  update(dt) {
    for (const r of G.runners) {
      if (r.out) continue;
      if (r.grounded && (r.bestZ == null || r.pos.z < r.bestZ)) r.bestZ = r.pos.z;
      if (!r.finished && r.isPlayer && r.pos.z < this.finishZ) G.finish(r);
    }
    const p = G.player; if (!p) return;
    for (let k = TIPS.length - 1; k > this.tip; k--) if (p.pos.z < TIPS[k][0]) { this.tip = k; toast(IS_TOUCH ? TIPS[k][2] : TIPS[k][1], 4); sfx.beep(); break; }
  },
  // the dummy just stands in the middle of the lane
  target(r) { return r.isPlayer ? null : { x: 0, z: -50, near: 0.6 }; },
  onFall(r) { const L = G.level; let cp = L.checkpoints[0]; for (const c of L.checkpoints) if (r.bestZ != null && r.bestZ < c.z + 1) cp = c; r.reset(0, cp.y + 2, cp.z); if (r.isPlayer) toast(t('Checkpoint')); },
  progress(r) { return clamp((14 - r.pos.z) / this.len, 0, 1); },
};
MODES.training = training; MODE_LIST.unshift(training);
