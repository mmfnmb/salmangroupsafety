// Sports modes: Golf, Volleyball, Football (with positions) and Puck Rush (many small goals).
// They register themselves into MODES / MODE_LIST when this module loads.
import { THREE, CANNON, G, V, PI, rand, pick, clamp, world, place, fx, sfx, toast, save, persist, G_STATIC, G_HAZARD, G_BALL, matBall, matGround } from './core.js';
import { t } from './i18n.js';
import { Level } from './level.js';
import { MODES, MODE_LIST, ballClassic } from './modes.js';

// a physics ball that only touches the world (hits by players are done in code)
// the puck slides on the floor like on ice and bounces off the boards
const matPuck = new CANNON.Material('puck');
world.addContactMaterial(new CANNON.ContactMaterial(matPuck, matGround, { friction: 0.01, restitution: 0.55 }));
function makeBall(L, { r, mass = 0.5, damp = 0.3, model, s, shape, material = matBall }) {
  const b = new CANNON.Body({ mass, material, linearDamping: damp, angularDamping: 0.3, collisionFilterGroup: G_BALL, collisionFilterMask: G_STATIC | G_HAZARD | G_BALL });
  b.addShape(shape || new CANNON.Sphere(r)); world.addBody(b); L.bodies.push(b);
  const obj = place(model, 0, 1, 0, s, 0, L.root);
  return { body: b, obj };
}
const syncBall = (o) => { const p = o.body.position, q = o.body.quaternion; o.obj.position.set(p.x, p.y, p.z); o.obj.quaternion.set(q.x, q.y, q.z, q.w); };
const flat = (x, z) => { const l = Math.hypot(x, z) || 1; return { x: x / l, z: z / l }; };
const playerAim = (r) => (r.isPlayer && G.camFwd ? flat(G.camFwd.x, G.camFwd.z) : { x: Math.sin(r.facing), z: Math.cos(r.facing) });
const teamOf = (i) => (i % 2 ? 'blue' : 'red');

// ======================================================================= GOLF
// every player has their own ball; first ones to sink it qualify. Water = back to your last spot, +1 stroke.
const HOLE = { x: 40, z: -37 };
const golf = {
  id: 'golf', name: t('Bolt Golf'), short: t('Golf'), kind: 'race', icon: 'flag', bats: true, forceBat: 'bat-golf',
  desc: t('Hit your own ball to the hole. Water sends it back with a 1-stroke penalty. Hold to charge your swing, let go to hit'), weapons: t('Golf club'),
  build() {
    const L = new Level({ killY: -9 }); G.level = L;
    L.floor(-8, 8, 16, -6); L.floor(-1.8, 1.8, -6, -14);
    L.floor(-10, 10, -14, -42); L.floor(10, 28, -30, -44);
    L.floor(28, 32, -35, -39); L.floor(32, 48, -27, -47);
    L.fence(-10, -14, -10, -42, 0, 'fence-low-straight'); L.fence(-10, -42, 10, -42, 0, 'fence-low-straight'); L.fence(10, -44, 28, -44, 0, 'fence-low-straight');
    L.fence(48, -27, 48, -47, 0, 'fence-low-straight'); L.fence(32, -47, 48, -47, 0, 'fence-low-straight');
    L.sweeper(0, -28, 0, 6.5, 0.8);
    L.spikeBlock(19, 0, -37, { axis: 'z', amp: 4.5, sp: 1.1 });
    for (const [x, z] of [[-6, -20], [6, -34]]) L.bouncer(x, z, 0, 0, 0, 15);
    L.model('Goal_Flag', HOLE.x + 0.3, 0, HOLE.z, 1.3); L.model('z/Ring_Hoop', HOLE.x, 0.02, HOLE.z, 1.0);
    L.model('k/windmill', 44, 0, -20, 5, PI); L.model('k/trophy', 50, 0, -38, 4, -PI / 2);
    for (const [x, z] of [[-5, 13], [5, 13]]) L.model('k/flag-large-red', x, 0, z, 3);
    L.scenery(60, -90, 40, { towers: [[-40, -30, 3], [70, -10, 3]] });
    // aim arrow shown in front of your ball
    this.arrow = place('k/indicator-special-arrow', 0, 0.05, 0, 1.4, 0, L.root); this.arrow.visible = false;
    this.mark = place('z/Spawn_Blue', 0, 0.03, 0, 1.1, 0, L.root);
    this.balls = null; this.time = 150; this.wp = [{ x: 0, z: -24 }, { x: 18, z: -36 }, HOLE];
    this.total = 34 + 21 + 22; this.lineUp = { x: 0, z: -1 };
    this.fly = [[HOLE.x + 10, 16, HOLE.z + 14, HOLE.x, 0, HOLE.z], [30, 26, -6, 10, 0, -30], [0, 7, 22, 0, 1, 4]];
  },
  spawn(i) { return { x: -6 + (i % 5) * 3, y: 0, z: 13 - Math.floor(i / 5) * 2.6, facing: PI }; },
  ballsReady() {
    if (this.balls) return;
    const kinds = ['k/ball-red', 'k/ball-blue'];
    this.balls = G.runners.map((r, i) => {
      const o = makeBall(G.level, { r: 0.32, mass: 0.4, damp: 0.42, model: r.isPlayer ? 'k/ball-green' : kinds[i % 2], s: 10.5 });
      const x = -6 + (i % 5) * 3, z = 9.5 - Math.floor(i / 5) * 2.6;
      o.body.position.set(x, 0.5, z); o.last = { x, z }; o.strokes = 0; o.sunk = false; return o;
    });
  },
  aimFor(o) { const p = o.body.position; return p.x > 26 ? HOLE : p.z > -7 && Math.abs(p.x) > 1.4 ? this.lineUp : p.z > -20 ? this.wp[0] : p.x < 14 ? this.wp[1] : HOLE; },
  update(dt) {
    this.ballsReady();
    this.time -= dt; if (this.time <= 0) G.endRound();
    G.runners.forEach((r, i) => {
      const o = this.balls[i]; if (!o || o.sunk) return;
      const p = o.body.position, v = o.body.velocity, sp = Math.hypot(v.x, v.z);
      if (p.y < -2.5) {
        p.set(o.last.x, 0.6, o.last.z); v.set(0, 0, 0); o.body.angularVelocity.set(0, 0, 0); o.strokes++;
        fx.burst(V(o.last.x, 0.5, o.last.z), 0x7fd8ff, 10, 4);
        if (r.isPlayer) toast(t('Splash! +1 stroke'));
      }
      const d = Math.hypot(p.x - HOLE.x, p.z - HOLE.z);
      if (d < 0.75 && sp < 8 && p.y < 1) {
        o.sunk = true; o.obj.visible = false; world.removeBody(o.body); fx.confetti(V(HOLE.x, 1, HOLE.z), r.isPlayer ? 140 : 40); sfx.goal();
        if (r.isPlayer) G.banner?.(t('In the hole! {n} strokes', { n: o.strokes }), true);
        G.ann?.('finish', { p: r.name, n: o.strokes }, r.isPlayer ? 3 : 1);
        G.finish(r); return;
      }
      if (d < 2 && sp < 5) { v.x += (HOLE.x - p.x) * dt * 4; v.z += (HOLE.z - p.z) * dt * 4; }
      syncBall(o);
    });
    // your ball: a ring under it and an aim arrow when you're close
    const me = G.player, mo = me && this.balls[G.runners.indexOf(me)];
    if (mo && !mo.sunk) {
      const p = mo.body.position; this.mark.position.set(p.x, 0.03, p.z); this.mark.visible = true;
      const a = playerAim(me), close = Math.hypot(me.pos.x - p.x, me.pos.z - p.z) < 2.6;
      this.arrow.visible = close; this.arrow.position.set(p.x + a.x * 1.4, 0.06, p.z + a.z * 1.4); this.arrow.rotation.y = Math.atan2(a.x, a.z) + PI;
    } else { this.mark.visible = false; this.arrow.visible = false; }
  },
  onFire(r) {
    if (r.swingCd > 0 || r.busy) return;
    r.swing(); r.swingCd = 0.6;
    const o = this.balls?.[G.runners.indexOf(r)]; if (!o || o.sunk) return;
    const p = o.body.position, v = o.body.velocity;
    if (Math.hypot(p.x - r.pos.x, p.z - r.pos.z) > 2.4 || Math.hypot(v.x, v.z) > 2.5) return;
    let a, pw;
    if (r.isPlayer) { a = playerAim(r); pw = r.batPower ?? 0.85; }
    else { const g = this.aimFor(o); a = flat(g.x - p.x + rand(-1, 1), g.z - p.z + rand(-1, 1)); pw = r.ai.golfPow ?? 0.6; }
    const speed = 3 + pw * 17;
    o.last = { x: p.x, z: p.z }; o.strokes++;
    v.set(a.x * speed, 1.5 + pw * 2.6, a.z * speed);
    fx.burst(V(p.x, p.y, p.z), 0xffffff, 8, 4); sfx.bat();
    if (r.isPlayer && r.batPerfect) G.banner?.(t('PERFECT!'), true);
  },
  target(r) {
    this.ballsReady();
    const o = this.balls[G.runners.indexOf(r)]; if (!o || o.sunk) return { x: r.pos.x, z: r.pos.z, stop: true };
    const p = o.body.position, v = o.body.velocity, g = this.aimFor(o), a = flat(g.x - p.x, g.z - p.z);
    const bx = p.x - a.x * 1.1, bz = p.z - a.z * 1.1;
    if (Math.hypot(v.x, v.z) > 1 || Math.hypot(r.pos.x - bx, r.pos.z - bz) > 0.8) return { x: bx, z: bz, near: 0.4, noJump: Math.hypot(r.pos.x - bx, r.pos.z - bz) < 4 };
    r.facing = Math.atan2(a.x, a.z);
    const D = Math.hypot(g.x - p.x, g.z - p.z);
    r.ai.golfPow = clamp(D / 26 + rand(-0.08, 0.08), 0.12, 1.3);
    return { x: r.pos.x, z: r.pos.z, stop: true, fire: Math.random() < 0.06 };
  },
  onFall(r) { const o = this.balls?.[G.runners.indexOf(r)], p = o && !o.sunk ? o.body.position : { x: 0, z: 10 }; r.reset(p.x - 1.2, 1, p.z + 1.2, PI); },
  progress(r) {
    const o = this.balls?.[G.runners.indexOf(r)]; if (!o) return 0; if (o.sunk) return 1;
    const p = o.body.position, i = Math.max(0, this.wp.indexOf(this.aimFor(o)));
    let rest = Math.hypot(this.wp[i].x - p.x, this.wp[i].z - p.z);
    for (let k = i; k < this.wp.length - 1; k++) rest += Math.hypot(this.wp[k + 1].x - this.wp[k].x, this.wp[k + 1].z - this.wp[k].z);
    return clamp(1 - rest / this.total, 0, 0.99);
  },
};

// ======================================================================= VOLLEYBALL
// Red's half is z > 0. The ball floats (low gravity). Let it land on your side and the other team scores.
const VX = 9, VZ = 10, VG = 12;
const volley = {
  id: 'volley', name: t('Volley Bash'), short: t('Volley'), kind: 'team', team: true, bats: true, icon: 'ball',
  desc: t('Two teams and a net. Hit the ball over and don\'t let it land on your side. Hold to charge, let go in the green for a perfect spike'), weapons: t('Bats'),
  build() {
    const L = new Level({ killY: -12 }); G.level = L;
    L.floor(-VX - 4, VX + 4, VZ + 5, -VZ - 5);
    L.fence(-VX - 4, VZ + 5, VX + 4, VZ + 5); L.fence(-VX - 4, -VZ - 5, VX + 4, -VZ - 5); L.fence(-VX - 4, VZ + 5, -VX - 4, -VZ - 5); L.fence(VX + 4, VZ + 5, VX + 4, -VZ - 5);
    // court corners and the net (posts + rope net), with a collider players and the ball can't pass below 3.2
    for (const x of [-VX, VX]) for (const z of [-VZ, VZ]) L.model('z/Obstacle_Pole_Small', x, 0.3, z, [0.5, 0.5, 0.15], 0);
    for (const x of [-VX - 0.6, VX + 0.6]) L.model('z/Obstacle_Pole_Center', x, 1.7, 0, [0.6, 0.85, 0.6]);
    L.model('k/fence-rope', 0, 1.9, 0, [(VX * 2 + 1.2) / 0.94, 1.3 / 0.3, 1]);
    L.box(0, 1.6, 0, VX + 0.6, 1.6, 0.12);
    L.model('z/Spawn_Red', 0, 0.02, VZ / 2, 4); L.model('z/Spawn_Blue', 0, 0.02, -VZ / 2, 4);
    for (const s of [1, -1]) { L.model(s > 0 ? 'k/bannerTowerRed' : 'k/bannerTowerGreen', -VX - 7, 0, s * 6, 3.2); L.model(s > 0 ? 'k/bannerTowerRed' : 'k/bannerTowerGreen', VX + 7, 0, s * 6, 3.2); }
    L.model('k/castle', 0, 0, -VZ - 16, 7); L.scenery(60, -60, 34, { towers: [[-40, -10, 3], [40, 15, 3]] });
    const o = makeBall(L, { r: 0.55, mass: 0.5, damp: 0.04, model: 'z/Football', s: 0.55 / 1.14 }); this.b = o;
    this.score = { red: 0, blue: 0 }; this.time = 120; this.pointT = 0; this.last = null;
    this.serve('red');
    this.fly = [[0, 20, 24, 0, 0, 0], [-16, 7, 0, 0, 2, 0], [0, 6, 16, 0, 1.5, 0]];
  },
  serve(side) { const b = this.b.body; b.position.set(rand(-3, 3), 8, (side === 'red' ? 1 : -1) * rand(4, 7)); b.velocity.set(0, 0, 0); b.angularVelocity.set(rand(-2, 2), 0, rand(-2, 2)); this.last = null; },
  spawn(i) { const team = teamOf(i), k = Math.floor(i / 2), s = team === 'red' ? 1 : -1; return { x: -5 + (k % 3) * 5, y: 0, z: s * (3 + Math.floor(k / 3) * 4 + (k % 2) * 1.5), facing: team === 'red' ? PI : 0 }; },
  teamOf,
  update(dt) {
    const b = this.b.body, p = b.position, v = b.velocity;
    this.time -= dt;
    if (this.pointT > 0) { this.pointT -= dt; if (this.pointT <= 0) this.serve(this.nextServe); }
    else {
      b.force.y += b.mass * (30 - VG);
      if (p.y < 0.62) {
        const out = Math.abs(p.x) > VX + 0.3 || Math.abs(p.z) > VZ + 0.3;
        const landed = p.z > 0 ? 'red' : 'blue';
        const winner = out && this.last ? (this.last === 'red' ? 'blue' : 'red') : landed === 'red' ? 'blue' : 'red';
        this.score[winner]++; this.pointT = 1.6; this.nextServe = winner === 'red' ? 'blue' : 'red';
        fx.confetti(V(p.x, 1, p.z), 60); sfx.goal(); toast(out ? t('Out!') : winner === 'red' ? t('Point for Red!') : t('Point for Blue!'), 1.6); G.ann?.('point', { team: winner === 'red' ? t('Red') : t('Blue') }, 2);
        if (this.score[winner] >= 5) setTimeout(() => G.endRound(), 1200);
      }
    }
    if (p.y < -6) this.serve('red');
    syncBall(this.b);
    if (this.time <= 0) G.endRound();
  },
  canHit(r) { const p = this.b.body.position, dy = p.y - r.pos.y, bot = !r.isPlayer; return Math.hypot(p.x - r.pos.x, p.z - r.pos.z) < (bot ? 1.7 : 2.3) && dy > -0.3 && dy < (bot ? 2.5 : 3.4); },
  onFire(r) {
    if (r.swingCd > 0 || r.busy) return;
    r.swing(); r.swingCd = 0.45;
    if (this.pointT > 0 || !this.canHit(r)) return;
    const b = this.b.body, p = b.position, opp = r.team === 'red' ? -1 : 1;
    let tx, tz;
    if (r.isPlayer) { const a = playerAim(r), pw = r.batPower ?? 0.85; const dist = 6 + pw * 9; tx = p.x + a.x * dist; tz = p.z + Math.max(Math.abs(a.z), 0.6) * opp * dist; if (r.batPerfect) G.banner?.(t('PERFECT!'), true); }
    else if (Math.random() < 0.3) { tx = rand(-VX - 4, VX + 4); tz = opp * rand(-1, VZ + 4); } // a miss-hit: may hit the net or go out
    else { tx = rand(-VX + 1.5, VX - 1.5); tz = opp * rand(2.5, VZ - 1.5); }
    tx = clamp(tx, -VX - 2, VX + 2); tz = clamp(tz, -VZ - 3, VZ + 3);
    const vy = 10, h = p.y - 0.6, T = (vy + Math.sqrt(vy * vy + 2 * VG * Math.max(0, h))) / VG;
    b.velocity.set((tx - p.x) / T, vy, (tz - p.z) / T);
    this.last = r.team; fx.burst(V(p.x, p.y, p.z), 0xffd23f, 10, 5); sfx.bat();
  },
  // where the ball will come down to head height
  landing() {
    const b = this.b.body, p = b.position, v = b.velocity, h = p.y - 1.4, T = (v.y + Math.sqrt(Math.max(0, v.y * v.y + 2 * VG * Math.max(0, h)))) / VG;
    return { x: p.x + v.x * T, z: p.z + v.z * T, T };
  },
  target(r) {
    const p = this.b.body.position, mySide = r.team === 'red' ? 1 : -1, L = this.landing();
    const mates = G.runners.filter((o) => !o.out && o.team === r.team), k = mates.indexOf(r);
    const coming = Math.sign(L.z) === mySide && this.pointT <= 0;
    const fitSide = (x, z) => ({ x: clamp(x, -VX, VX), z: mySide > 0 ? clamp(z, 1, VZ) : clamp(z, -VZ, -1) });
    if (coming) {
      const near = mates.reduce((a, c) => (Math.hypot(c.pos.x - L.x, c.pos.z - L.z) < Math.hypot(a.pos.x - L.x, a.pos.z - L.z) ? c : a));
      if (near === r) {
        // bots misjudge where the ball comes down a little each rally
        if (r.ai.errFor !== this.last) { r.ai.errFor = this.last; r.ai.ex = rand(-2.2, 2.2); r.ai.ez = rand(-2, 2); }
        const q = fitSide(L.x + r.ai.ex * Math.min(1, L.T), L.z + mySide * 0.4 + r.ai.ez * Math.min(1, L.T)), dy = p.y - r.pos.y;
        const hit = this.canHit(r) && (this.b.body.velocity.y < 0 || dy < 2.2);
        return { x: q.x, z: q.z, near: 0.3, noJump: true, fire: hit && Math.random() < 0.25, jump: dy > 2.6 && dy < 4 && Math.hypot(p.x - r.pos.x, p.z - r.pos.z) < 1.6 };
      }
    }
    const spots = [[-4.5, 4], [4.5, 4], [0, 7.5], [-4, 8.5], [4, 8.5]], s = spots[k % spots.length], q = fitSide(s[0], mySide * s[1]);
    return { x: q.x, z: q.z, near: 0.8, noJump: true, fire: this.canHit(r) && Math.random() < 0.3 };
  },
  onFall(r) { const s = this.spawn(G.runners.indexOf(r)); r.reset(s.x, 0, s.z, s.facing); },
  hud() { return { red: this.score.red, blue: this.score.blue, time: this.time }; },
  winners() { return this.score.red === this.score.blue ? (Math.random() < 0.5 ? 'red' : 'blue') : this.score.red > this.score.blue ? 'red' : 'blue'; },
};

// ======================================================================= FOOTBALL
// Big pitch with stands. The ball is never glued: running touches it ahead of you (longer touches when sprinting),
// sharp turns can lose it and opponents can poke it away. Hit (hold) = shoot, Dive = pass / sliding tackle.
// pitch, lines and stands come from the Soccer Field model (scaled up ~2x); goals use the game's own goal frames
const FX = 27.6, FZ = 47, GW = 3.6, GH = 2.6, FK = 1.95;
const ROLE_FRAC = { GK: 0.03, DEF: 0.28, MID: 0.52, FWD: 0.76 }, ROLE_X = { GK: 0, DEF: -7, MID: 7, FWD: 0 };
// team shape for 4..7 players: role + side position of each slot
const SLOTS = [['GK', 0], ['DEF', -8], ['MID', 8], ['FWD', 0], ['DEF', 8], ['MID', -8], ['FWD', -9]];
function teamSlots(n) {
  const s = SLOTS.slice(0, Math.max(1, n)).map(([role, x]) => ({ role, x }));
  const f = s.filter((x) => x.role === 'FWD'); if (f.length > 1) { f[0].x = 7; f[1].x = -7; }
  return s;
}
function goalFrame(L, z, s) {
  const back = z + s * 2;
  for (const x of [-GW - 0.25, GW + 0.25]) { L.model('z/Obstacle_Pole_Center', x, GH / 2, z, [0.55, GH / 4, 0.55]); L.box(x, GH / 2, z, 0.25, GH / 2, 0.25); }
  L.model('z/Obstacle_Pole_Large', 0, GH, z, [0.55, 0.55, (GW * 2 + 1) / 9.08], PI / 2); L.box(0, GH, z, GW + 0.5, 0.22, 0.22);
  L.model('k/fence-rope', 0, 0, back, [(GW * 2 + 0.5) / 0.94, GH / 0.3, 1]); L.box(0, GH / 2, back, GW + 0.3, GH / 2, 0.12);
  for (const x of [-GW - 0.25, GW + 0.25]) { L.model('k/fence-rope', x, 0, (z + back) / 2, [2 / 0.94, GH / 0.3, 1], PI / 2); L.box(x, GH / 2, (z + back) / 2, 0.12, GH / 2, 1); }
  L.box(0, GH + 0.1, (z + back) / 2, GW + 0.3, 0.08, 1);
}
// the player card: grows as you play football and changes how well you play
export const cardOvr = (c = save.card) => Math.round((c.pac + c.sho + c.pas + c.ctl) / 4);
export const cardTier = (o = cardOvr()) => (o >= 80 ? 'gold' : o >= 65 ? 'silver' : 'bronze');
function grow(r, stat, amt) { if (!r?.isPlayer) return; const c = save.card; const before = cardOvr(); c[stat] = Math.min(99, c[stat] + amt * (1 - c[stat] / 120)); if (cardOvr() > before) toast(t('Player card') + ' ' + cardOvr() + ' ▲', 1.4); }
const football = {
  id: 'football', name: t('Bolt Football'), short: t('Football'), kind: 'team', team: true, charge: true, positions: true, camDist: 2.7, icon: 'ball',
  desc: t('Real football: the ball sticks to your feet. Dive to pass, hold Hit to shoot, and dive into the player with the ball to tackle'), weapons: t('Your feet'),
  build() {
    const L = new Level({ killY: -12 }); G.level = L;
    L.floor(-FX - 3, FX + 3, FZ + 4, -FZ - 4);
    L.fence(-FX, FZ, -FX, -FZ); L.fence(FX, FZ, FX, -FZ);
    for (const s of [1, -1]) { L.fence(-FX, s * FZ, -GW - 0.4, s * FZ); L.fence(GW + 0.4, s * FZ, FX, s * FZ); goalFrame(L, s * FZ, s); }
    for (const s of [1, -1]) for (const x of [-FX + 1, FX - 1]) L.model(s > 0 ? 'k/flag-large-red' : 'k/flag-large-blue', x, 0, s * (FZ - 1), 3);
    for (const sx of [-1, 1]) for (let z = -FZ + 4; z <= FZ - 4; z += 8) L.model('z/Barrier_01', sx * (FX + 1.6), 0, z, 0.9, PI / 2);
    // the model: one copy stretched for the pitch, one copy at normal proportions for the stands
    const only = (o, re) => { o.traverse((m) => { if (m.isMesh) m.visible = re.test(m.name); }); return o; };
    only(L.model('k/soccer-field', 0, -0.04, 0, [FK, 1, FK]), /Soccer_Field/);
    only(L.model('k/soccer-field', 0, 0, 0, 1.9), /Bleachers/);
    L.model('k/castle', FX + 30, 0, 0, 7, -PI / 2); L.scenery(100, -100, 60, { towers: [[-70, -30, 3.4], [70, 30, 3.4]] });
    const o = makeBall(L, { r: 0.24, mass: 0.4, damp: 0.45, model: 'z/Football', s: 0.24 / 1.14 }); this.b = o;
    this.score = { red: 0, blue: 0 }; this.time = 240; this.resetT = 0; this.owner = null; this.roles = null;
    this.kickoff();
    this.fly = [[0, 50, 70, 0, 0, 0], [-40, 14, 0, 0, 1, 0], [0, 6, 16, 0, 1, 4]];
  },
  teamOf,
  kickoff() { this.b.body.position.set(0, 0.5, 0); this.b.body.velocity.set(0, 0, 0); this.b.body.angularVelocity.set(0, 0, 0); this.owner = null; },
  // red defends +z and attacks -z
  ownZ: (team) => (team === 'red' ? FZ : -FZ),
  home(r, kick) {
    const own = this.ownZ(r.team), dir = -Math.sign(own), role = r.role || 'MID', sx = r.slotX ?? ROLE_X[role];
    let f = ROLE_FRAC[role]; if (kick) f = Math.min(f, 0.4);
    const bp = this.b.body.position, push = kick ? 0 : clamp((bp.z - own) * dir / (FZ * 2), 0, 1) * 0.25 - 0.1;
    return { x: sx + (kick || role === 'GK' ? 0 : bp.x * 0.3), z: own + dir * (f + (role === 'GK' ? 0 : push)) * FZ * 2 };
  },
  spawn(i) {
    const team = teamOf(i), k = Math.floor(i / 2), sl = SLOTS[k % 7], role = sl[0], own = team === 'red' ? FZ : -FZ, dir = -Math.sign(own);
    return { x: sl[1], y: 0, z: own + dir * Math.min(ROLE_FRAC[role], 0.4) * FZ * 2, facing: team === 'red' ? PI : 0 };
  },
  assignRoles() {
    // redo when the player's chosen position arrives (the pick can come after the first frames)
    if (this.roles && this.rolesFor === G.playerRole) return; this.roles = true; this.rolesFor = G.playerRole;
    for (const team of ['red', 'blue']) {
      const mates = G.runners.filter((r) => r.team === team), free = teamSlots(mates.length);
      const me = mates.find((r) => r.isPlayer);
      if (me) { const want = G.playerRole || 'MID', k = Math.max(0, free.findIndex((x) => x.role === want)); const sl = free.splice(k, 1)[0]; me.role = want; me.slotX = sl?.x ?? 0; }
      for (const r of mates) if (!r.isPlayer) { const sl = free.shift() || { role: 'MID', x: 0 }; r.role = sl.role; r.slotX = sl.x; }
    }
    this.placeAll();
  },
  // everyone to their own position's kick-off spot (so picking Attacker really starts you up front)
  placeAll() { for (const r of G.runners) if (!r.out) { const h = this.home(r, true); r.reset(h.x, 0, h.z, r.team === 'red' ? PI : 0); } },
  playerSpeed() { return 0.92 + save.card.pac / 600; },
  update(dt) {
    this.assignRoles();
    const me = G.player; if (me && !me.out) { const v = me.body.velocity; grow(me, 'pac', Math.hypot(v.x, v.z) * dt * 0.0012); }
    const b = this.b.body, p = b.position;
    this.time -= dt;
    for (const r of G.runners) { r.noBallT = Math.max(0, (r.noBallT || 0) - dt); r.tackleCd = Math.max(0, (r.tackleCd || 0) - dt); }
    if (this.resetT > 0) {
      this.resetT -= dt;
      if (this.resetT <= 0) { this.kickoff(); this.placeAll(); }
    } else {
      let o = this.owner;
      if (o && (o.out || o.state === 'tumble' || o.stunT > 0 || o.frozenT > 0)) { this.owner = o = null; }
      if (o) {
        // dive tackles: an opponent diving into the carrier takes the ball
        for (const r of G.runners) if (r.team !== o.team && !r.out && r.state === 'dive' && Math.hypot(r.pos.x - o.pos.x, r.pos.z - o.pos.z) < 1.5) { this.steal(r, o); o = this.owner; break; }
        if (o) this.dribble(o, dt);
      } else {
        for (const r of G.runners) {
          if (r.out || r.noBallT > 0 || r.state === 'tumble' || r.stunT > 0) continue;
          const reach = r.role === 'GK' && Math.abs(p.z - this.ownZ(r.team)) < 5 ? 1.6 : 1.0;
          if (Math.hypot(p.x - r.pos.x, p.z - r.pos.z) < reach && p.y < (reach > 1 ? 2.4 : 1.3)) { this.owner = r; if (r.isPlayer) sfx.pickup(); break; }
        }
      }
      if (Math.abs(p.z) > FZ + 0.3 && Math.abs(p.x) < GW && p.y < GH) {
        const scorer = p.z > 0 ? 'blue' : 'red'; this.score[scorer]++; if (this.lastTouch?.team === scorer) grow(this.lastTouch, 'sho', 1.5); this.resetT = 2.2; this.owner = null;
        sfx.goal(); fx.confetti(V(p.x, p.y + 1, p.z), 140); toast(scorer === 'red' ? t('Goal for Red!') : t('Goal for Blue!'), 2); G.ann?.('goal', { team: scorer === 'red' ? t('Red') : t('Blue') }, 3);
        if (this.score[scorer] >= 3) setTimeout(() => G.endRound(), 1400);
      } else if (Math.abs(p.x) > FX + 1 || Math.abs(p.z) > FZ + 3.5 || p.y < -3) {
        b.position.set(clamp(p.x, -FX + 1, FX - 1), 0.6, clamp(p.z, -FZ + 1.5, FZ - 1.5)); b.velocity.set(0, 0, 0);
      }
    }
    syncBall(this.b);
    if (this.time <= 0) G.endRound();
  },
  // the ball stays a real ball: the carrier keeps touching it ahead, faster runs = longer touches
  dribble(o, dt) {
    const b = this.b.body, p = b.position, f = { x: Math.sin(o.facing), z: Math.cos(o.facing) }, ov = o.body.velocity, sp = Math.hypot(ov.x, ov.z);
    const dx = p.x - o.pos.x, dz = p.z - o.pos.z, d = Math.hypot(dx, dz);
    if (d > 2.6 || p.y > 1.6) { this.owner = null; o.noBallT = 0.25; return; } // touched too far or it bounced away: loose ball
    o.touchT = (o.touchT || 0) - dt;
    const ahead = (dx * f.x + dz * f.z) / (d || 1);
    if (sp > 0.8 && d < 0.95 && o.touchT <= 0) {
      // a touch: a little faster than you, a bit of random error that grows with speed (bad first touches happen)
      const long = sp > 6 ? 1.55 : 1.22, err = (Math.random() - 0.5) * (0.12 + sp * 0.035) * (o.isPlayer ? 1.4 - save.card.ctl / 100 : 0.7), v = sp * long + 0.6;
      b.velocity.set((f.x + err * f.z) * v, 0.35, (f.z - err * f.x) * v); o.touchT = sp > 6 ? 0.32 : 0.2; this.lastTouch = o; grow(o, 'ctl', 0.04);
      if (o.isPlayer) sfx.swing?.();
    } else if (sp <= 0.8 && d < 1.6) {
      // standing still: settle the ball at your feet
      const tx = o.pos.x + f.x * 0.55, tz = o.pos.z + f.z * 0.55; b.velocity.x += ((tx - p.x) * 8 - b.velocity.x) * Math.min(1, dt * 6); b.velocity.z += ((tz - p.z) * 8 - b.velocity.z) * Math.min(1, dt * 6);
    } else if (ahead < -0.2 && d > 1.2) { this.owner = null; o.noBallT = 0.3; return; } // turned too sharply: the ball runs away
    // opponents near the ball can poke it (not always a clean steal)
    for (const r of G.runners) {
      if (r.team === o.team || r.out || r.stunT > 0 || r.state === 'tumble') continue;
      if (Math.hypot(r.pos.x - p.x, r.pos.z - p.z) < 0.9 && Math.random() < dt * 2.2) {
        const a = flat(p.x - r.pos.x, p.z - r.pos.z); this.owner = null; o.noBallT = 0.5; grow(r, 'ctl', 0.3);
        b.velocity.set(a.x * 5 + rand(-2, 2), 1.2, a.z * 5 + rand(-2, 2)); sfx.bat(); break;
      }
    }
  },
  steal(r, from) { grow(r, 'ctl', 0.5); this.owner = r; from.noBallT = 0.8; from.stun(0.45); fx.burst(V(r.pos.x, r.pos.y + 0.8, r.pos.z), 0xffd23f, 12, 6); sfx.bat(); if (r.isPlayer) toast(t('Tackle!'), 1); },
  kick(r, dir, speed, vy) { const b = this.b.body; this.owner = null; this.lastTouch = r; r.noBallT = 0.45; b.position.set(r.pos.x + dir.x * 0.9, 0.45, r.pos.z + dir.z * 0.9); b.velocity.set(dir.x * speed, vy, dir.z * speed); },
  shoot(r, pw) {
    let a;
    if (r.isPlayer) a = playerAim(r);
    else { const gz = -this.ownZ(r.team); a = flat(rand(-GW + 0.7, GW - 0.7) - r.pos.x, gz - r.pos.z); }
    this.kick(r, a, (11 + pw * 16) * (r.isPlayer ? 0.85 + save.card.sho / 333 : 1), 1 + pw * 2.8); sfx.bat(); grow(r, 'sho', 0.25);
    if (r.isPlayer && r.batPerfect) G.banner?.(t('PERFECT!'), true);
  },
  pass(r) {
    const mates = G.runners.filter((o) => o !== r && !o.out && o.team === r.team); if (!mates.length) return false;
    const a = playerAim(r), fwd = -Math.sign(this.ownZ(r.team));
    const score = (m) => { const dx = m.pos.x - r.pos.x, dz = m.pos.z - r.pos.z, d = Math.hypot(dx, dz) || 1; return r.isPlayer ? (dx * a.x + dz * a.z) / d - d * 0.01 : dz * fwd * 0.08 - this.pressure(m) * 1.5 - (m.role === 'GK' ? 3 : 0); };
    const m = mates.reduce((x, y) => (score(y) > score(x) ? y : x));
    const mv = m.body.velocity, tx = m.pos.x + mv.x * 0.35, tz = m.pos.z + mv.z * 0.35, d = Math.hypot(tx - r.pos.x, tz - r.pos.z);
    this.kick(r, flat(tx - r.pos.x, tz - r.pos.z), clamp(d * 1.15 + 4, 8, 28), d > 18 ? 5 : 1.2); sfx.swing(); grow(r, 'pas', 0.4);
    return true;
  },
  pressure(m) { let n = 0; for (const o of G.runners) if (o.team !== m.team && !o.out && Math.hypot(o.pos.x - m.pos.x, o.pos.z - m.pos.z) < 3) n++; return n; },
  onFire(r) {
    if (this.resetT > 0 || r.busy) return;
    if (this.owner === r) { this.shoot(r, r.isPlayer ? r.batPower ?? 0.85 : rand(0.8, 1.2)); r.swing(); return; }
    if (r.tackleCd > 0) return; r.tackleCd = 0.8; r.swing();
    const o = this.owner;
    if (o && o.team !== r.team && Math.hypot(o.pos.x - r.pos.x, o.pos.z - r.pos.z) < 1.8 && Math.random() < 0.55) this.steal(r, o);
  },
  onDive(r) { return this.owner === r && this.resetT <= 0 ? this.pass(r) : false; },
  target(r, dt) {
    this.assignRoles();
    const bp = this.b.body.position, o = this.owner, own = this.ownZ(r.team), goalZ = -own;
    const ai = r.ai; ai.decT = (ai.decT || 0) - dt;
    if (o === r) {
      // carrying: run at goal, shoot when close, pass when pressed
      const dg = Math.hypot(r.pos.x, goalZ - r.pos.z);
      if (ai.decT < 0) {
        ai.decT = rand(0.35, 0.7);
        if (dg < 22 && Math.random() < (dg < 12 ? 0.7 : 0.25)) { this.shoot(r, rand(0.8, 1.25)); r.swing(); return { x: r.pos.x, z: r.pos.z, stop: true }; }
        if ((this.pressure(r) > 0 && Math.random() < 0.55) || (r.role === 'GK' || r.role === 'DEF') && Math.random() < 0.5) { if (this.pass(r)) return { x: r.pos.x, z: r.pos.z, stop: true }; }
      }
      const side = Math.sin(G.t * 0.7 + r.i) * 3;
      return { x: clamp(side, -GW, GW), z: goalZ, near: 0.2, noJump: true };
    }
    if (r.role === 'GK') {
      const bx = clamp(bp.x * 0.6, -GW + 0.5, GW - 0.5), danger = Math.abs(bp.z - own) < 9 && (!o || o.team !== r.team) && Math.abs(bp.x) < GW + 6;
      if (danger) return { x: bp.x, z: bp.z, near: 0.1, noJump: true };
      return { x: bx, z: own - Math.sign(own) * 1.2, near: 0.3, noJump: true };
    }
    const mates = G.runners.filter((m) => !m.out && m.team === r.team && m.role !== 'GK');
    if (!o || o.team !== r.team) {
      // loose ball or theirs: the closest outfield player goes for it
      const chaser = mates.reduce((a, c) => (Math.hypot(c.pos.x - bp.x, c.pos.z - bp.z) < Math.hypot(a.pos.x - bp.x, a.pos.z - bp.z) ? c : a), mates[0]);
      if (chaser === r) {
        const d = Math.hypot(bp.x - r.pos.x, bp.z - r.pos.z);
        if (o && d < 1.8) { r.facing = Math.atan2(bp.x - r.pos.x, bp.z - r.pos.z); return { x: bp.x, z: bp.z, near: 0.1, noJump: true, fire: Math.random() < 0.25, dive: d < 1.4 }; }
        return { x: bp.x, z: bp.z, near: 0.1, noJump: true };
      }
    }
    const h = this.home(r, false), up = o && o.team === r.team ? -Math.sign(own) * 9 : 0;
    return { x: h.x, z: clamp(h.z + up, -FZ + 1, FZ - 1), near: 1, noJump: true };
  },
  onFall(r) { const h = this.home(r, true); r.reset(h.x, 0, h.z, r.team === 'red' ? PI : 0); },
  hud() { return { red: this.score.red, blue: this.score.blue, time: this.time }; },
  winners() { return this.score.red === this.score.blue ? (Math.random() < 0.5 ? 'red' : 'blue') : this.score.red > this.score.blue ? 'red' : 'blue'; },
};

// ======================================================================= PUCK RUSH
// a sliding metal puck and three small goals at each end, each with an obstacle in front. The middle goal is worth 3.
const PX = 13, PZ = 19, GOALS = [{ x: -8, v: 1 }, { x: 0, v: 3 }, { x: 8, v: 1 }], PGW = 1.7;
const puck = {
  ...ballClassic, id: 'puck', name: t('Puck Rush'), short: t('Puck'), icon: 'target', winScore: 9,
  desc: t('Slap the metal puck into any of the other team\'s small goals. Side goals are worth 1, the guarded middle goal is worth 3'), weapons: t('Bats'),
  build() {
    const L = new Level({ killY: -12 }); G.level = L;
    L.floor(-PX - 2, PX + 2, PZ + 4, -PZ - 4);
    L.fence(-PX, PZ, -PX, -PZ); L.fence(PX, PZ, PX, -PZ);
    L.box(-PX - 0.2, 0.6, 0, 0.2, 0.6, PZ); L.box(PX + 0.2, 0.6, 0, 0.2, 0.6, PZ);
    for (const s of [1, -1]) {
      const z = s * PZ;
      // boards between the goals, so only the goal mouths are open
      let x0 = -PX;
      for (const g of GOALS) { const x1 = g.x - PGW - 0.2; L.fence(x0, z, x1, z, 0, 'fence-low-straight'); L.box((x0 + x1) / 2, 0.6, z, (x1 - x0) / 2, 0.6, 0.2); x0 = g.x + PGW + 0.2; }
      L.fence(x0, z, PX, z, 0, 'fence-low-straight'); L.box((x0 + PX) / 2, 0.6, z, (PX - x0) / 2, 0.6, 0.2);
      for (const g of GOALS) {
        for (const x of [g.x - PGW - 0.1, g.x + PGW + 0.1]) { L.model('z/Obstacle_Pole_Center', x, 0.75, z, [0.4, 0.38, 0.4]); }
        L.model('k/fence-rope', g.x, 0, z + s * 1.4, [(PGW * 2) / 0.94, 1.5 / 0.3, 1]); L.box(g.x, 0.75, z + s * 1.4, PGW, 0.75, 0.12);
        for (const x of [g.x - PGW - 0.1, g.x + PGW + 0.1]) L.box(x, 0.75, z + s * 0.7, 0.1, 0.75, 0.7);
        L.model(s > 0 ? 'z/Spawn_Red' : 'z/Spawn_Blue', g.x, 0.02, z - s * 0.9, g.v === 3 ? 1.6 : 1.1);
      }
      // the guards: a spinning arm in front of the middle goal, spike blocks sliding in front of the side goals
      L.sweeper(0, z - s * 3.2, 0, 2.6, 1.5 * s);
      L.spikeBlock(-8, 0, z - s * 3, { axis: 'x', amp: 2.2, sp: 1.3, ph: 0 }); L.spikeBlock(8, 0, z - s * 3, { axis: 'x', amp: 2.2, sp: 1.3, ph: 2 });
      L.model(s > 0 ? 'k/bannerTowerRed' : 'k/bannerTowerGreen', -PX - 4, 0, s * (PZ - 2), 3.4); L.model(s > 0 ? 'k/bannerTowerRed' : 'k/bannerTowerGreen', PX + 4, 0, s * (PZ - 2), 3.4);
    }
    L.scenery(60, -60, 34, { towers: [[-45, -15, 3], [45, 15, 3]] });
    // a small sphere that can't roll slides more cleanly than a real disc; the model shows the disc
    const sh = new CANNON.Sphere(0.15);
    const o = makeBall(L, { r: 0.5, mass: 1.2, damp: 0.12, model: 'Cannonball', s: [0.9, 0.24, 0.9], shape: sh, material: matPuck });
    o.body.angularFactor.set(0, 0, 0); o.body.userData = { kind: 'bigball' };
    this.ball = o.body; this.ballObj = o.obj;
    this.score = { red: 0, blue: 0 }; this.time = 120; this.resetT = 0; this.curve = null; this.Z = PZ; this.X = PX; this.GW = PGW;
    this.resetBall();
    this.fly = [[0, 26, 30, 0, 0, 0], [-18, 8, 0, 0, 1, 0], [0, 6, 16, 0, 1, 2]];
  },
  resetBall() { this.ball.position.set(0, 0.3, 0); this.ball.velocity.set(0, 0, 0); this.ball.angularVelocity.set(0, 0, 0); this.ball.quaternion.set(0, 0, 0, 1); this.curve = null; },
  // each bot picks one of the other team's goals to aim at
  goalOf(team, r) { const g = GOALS[r?.ai ? (r.ai.goalPick ??= Math.floor(Math.random() * 3)) : 1]; return { x: g.x, z: team === 'red' ? -PZ - 1 : PZ + 1 }; },
  goalHit(p) {
    for (const s of [1, -1]) if (s * p.z > PZ + 0.25) for (const g of GOALS) if (Math.abs(p.x - g.x) < PGW) { this.lastValue = g.v; return s > 0 ? 'blue' : 'red'; }
    return null;
  },
  onFire(r) {
    ballClassic.onFire.call(this, r);
    const v = this.ball.velocity; if (v.y > 1.2) v.y = 1.2;
    if (r.ai) r.ai.goalPick = Math.floor(Math.random() * 3);
  },
  update(dt) {
    // the puck glides just above the ice: no floor friction, only a little drag, and it still bounces off the boards
    const b = this.ball, v = b.velocity;
    b.force.y += b.mass * 30; b.position.y = 0.16; v.y = 0;
    const k = Math.max(0, 1 - 0.35 * dt); v.x *= k; v.z *= k;
    ballClassic.update.call(this, dt);
    if (Math.abs(b.position.x) > PX + 1 || Math.abs(b.position.z) > PZ + 3) this.resetBall();
  },
};

Object.assign(MODES, { golf, volley, football, puck });
MODE_LIST.push(golf, volley, football, puck);
export const SPORTS = { golf, volley, football, puck };
