// Build mode: place map pieces on a grid, save the map, and play it.
import { THREE, G, V, PI, rand, clamp, camera, canvas, scene, renderer, save, persist, sfx, toast, fx } from './core.js';
import { t } from './i18n.js';
import { Level } from './level.js';
import { ballClassic } from './modes.js';
import { CANNON, world, place, G_STATIC, G_RUNNER, G_HAZARD, G_BALL, matBall } from './core.js';

export const PIECES = [
  { t: 'floor', name: t('Floor'), model: 'Cube_Grass_Single' },
  { t: 'raised', name: t('Raised block'), model: 'Cube_Bricks' },
  { t: 'fence', name: t('Fence'), model: 'k/fence-straight', rot: true },
  { t: 'speed', name: t('Speed arrows'), model: 'k/indicator-special-arrow', rot: true },
  { t: 'conveyor', name: t('Conveyor'), model: 'k/conveyor-belt', rot: true },
  { t: 'spring', name: t('Spring'), model: 'k/spring' },
  { t: 'bouncer', name: t('Bouncer'), model: 'Bouncer', rot: true },
  { t: 'saw', name: t('Saw'), model: 'Hazard_Saw', rot: true },
  { t: 'sweeper', name: t('Spinning arm'), model: 'Hazard_Cylinder' },
  { t: 'spike', name: t('Spike block'), model: 'k/spike-block', rot: true },
  { t: 'trap', name: t('Spike trap'), model: 'k/trap-spikes' },
  { t: 'crate', name: t('Breakable crate'), model: 'k/crate' },
  { t: 'wall', name: t('Steel crate'), model: 'k/crate-strong' },
  { t: 'cannon', name: t('Cannon'), model: 'Cannon', rot: true },
  { t: 'coin', name: t('Coin'), model: 'Coin' },
  { t: 'pickup', name: t('Weapon crate'), model: 'k/crate-item' },
  { t: 'start', name: t('Start'), model: 'Arrow', types: ['race', 'survival'] },
  { t: 'finish', name: t('Finish'), model: 'k/flagCheckers', types: ['race'] },
  { t: 'goalRed', name: t('Red pit'), model: 'k/flag-large-red', types: ['ball'] },
  { t: 'goalBlue', name: t('Blue pit'), model: 'k/flag-large-blue', types: ['ball'] },
  { t: 'ball', name: t('Ball spot'), model: 'z/Football', types: ['ball'] },
];
export const MAP_TYPES = [
  { id: 'race', name: t('Race'), desc: t('Reach the finish line first'), icon: 'flag' },
  { id: 'survival', name: t('Survival'), desc: t('Stay on the map until time runs out'), icon: 'hex' },
  { id: 'ball', name: t('Ball'), desc: t('Two teams knock a ball into the other pit'), icon: 'ball' },
];
export const piecesFor = (type) => PIECES.filter((p) => !p.types || p.types.includes(type));
const ONE = ['start', 'finish', 'goalRed', 'goalBlue', 'ball'];
const CELL = 2, COLS = 12, ROWS = 44; // x: -12..12, z: 12..-76
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const cellX = (c) => -COLS + CELL / 2 + c * CELL, cellZ = (r) => 12 - CELL / 2 - r * CELL;

export function defaultMap(type = 'race') {
  const items = [], fl = (c0, c1, r0, r1) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) items.push({ t: 'floor', c, r, rot: 0 }); };
  if (type === 'survival') {
    fl(2, 9, 2, 11);
    items.push({ t: 'start', c: 5, r: 6, rot: 0 }, { t: 'sweeper', c: 5, r: 4, rot: 0 }, { t: 'trap', c: 8, r: 3, rot: 0 }, { t: 'coin', c: 3, r: 9, rot: 0 });
  } else if (type === 'ball') {
    fl(1, 10, 0, 21);
    items.push({ t: 'goalRed', c: 5, r: 1, rot: 0 }, { t: 'goalBlue', c: 5, r: 20, rot: 0 }, { t: 'ball', c: 5, r: 10, rot: 0 }, { t: 'bouncer', c: 2, r: 10, rot: 1 }, { t: 'bouncer', c: 9, r: 11, rot: 3 });
  } else {
    fl(3, 8, 0, 17);
    items.push({ t: 'start', c: 6, r: 1, rot: 0 }, { t: 'speed', c: 5, r: 4, rot: 0 }, { t: 'speed', c: 6, r: 4, rot: 0 }, { t: 'saw', c: 6, r: 9, rot: 1 }, { t: 'finish', c: 6, r: 16, rot: 0 });
  }
  return { type, items };
}
// one saved draft per map type
export function getMap(type = editor.type) {
  if (!save.maps || save.maps.items) save.maps = { race: save.maps?.items ? { type: 'race', items: save.maps.items } : defaultMap('race') };
  if (!save.maps[type]) save.maps[type] = defaultMap(type);
  save.maps[type].type = type;
  return save.maps[type];
}

// builds a real level from a saved map (used by the editor preview and for playing it)
export function buildFromMap(map, L) {
  const floors = [], raised = [], need = new Set();
  const key = (c, r) => c + ',' + r, holes = new Set();
  for (const it of map.items) if (it.t === 'goalRed' || it.t === 'goalBlue') for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) holes.add(key(it.c + dc, it.r + dr));
  for (const it of map.items) if (!['floor', 'raised'].includes(it.t)) need.add(key(it.c, it.r));
  for (const it of map.items) { if (it.t === 'floor') floors.push(it); if (it.t === 'raised') raised.push(it); need.delete(key(it.c, it.r)); }
  for (const k of need) { const [c, r] = k.split(',').map(Number); floors.push({ c, r }); }
  const solid = (f) => !holes.has(key(f.c, f.r));
  floors.splice(0, floors.length, ...floors.filter(solid)); raised.splice(0, raised.length, ...raised.filter(solid));
  L.inst('Cube_Grass_Single', floors.map((f) => ({ x: cellX(f.c), y: -1, z: cellZ(f.r) })));
  for (const f of floors) L.box(cellX(f.c), -1, cellZ(f.r), 1, 1, 1);
  L.inst('Cube_Grass_Single', raised.map((f) => ({ x: cellX(f.c), y: 0.5, z: cellZ(f.r) })));
  L.inst('Cube_Grass_Single', raised.map((f) => ({ x: cellX(f.c), y: -1.0, z: cellZ(f.r) })));
  for (const f of raised) L.box(cellX(f.c), -0.25, cellZ(f.r), 1, 1.75, 1);
  const out = { starts: [], finishes: [], goals: {}, balls: [] };
  for (const it of map.items) {
    const x = cellX(it.c), z = cellZ(it.r), [dx, dz] = DIRS[it.rot || 0];
    switch (it.t) {
      case 'fence': L.fence(x - 1 * Math.abs(dz) + dx * 0.9, z - 1 * Math.abs(dx) + dz * 0.9, x + 1 * Math.abs(dz) + dx * 0.9, z + 1 * Math.abs(dx) + dz * 0.9); break;
      case 'speed': L.speedPad(x, z, 0, dx, dz, 2); break;
      case 'conveyor': L.conveyor(x - 1, x + 1, z + 1, z - 1, 0, dx, dz, 5); break;
      case 'spring': L.spring(x, z, 0, 21); break;
      case 'bouncer': L.bouncer(x, z, 0, dx * 13, dz * 13, 17); break;
      case 'saw': L.saw(x, z, 0, 3, 1.8, rand(0, 6), (it.rot || 0) % 2 ? 'z' : 'x'); break;
      case 'sweeper': L.sweeper(x, z, 0, 4.6, 1.3 * ((it.rot || 0) % 2 ? -1 : 1)); break;
      case 'spike': L.spikeBlock(x, 0, z, { axis: (it.rot || 0) % 2 ? 'z' : 'x', amp: 2.6, sp: 1.6, ph: rand(0, 6) }); break;
      case 'trap': L.trap(x, z, 0); break;
      case 'crate': L.doorRow(z, 0, x - 1, x + 1, 1, 1); break;
      case 'wall': L.doorRow(z, 0, x - 1, x + 1, 1, 0); break;
      case 'cannon': L.cannon(x, z, 0, dx, dz, 2.8, rand(0, 2), 15); L.box(x, 0.6, z, 0.8, 0.6, 0.8); break;
      case 'coin': L.coin(x, 1, z); break;
      case 'pickup': L.pickup(x, 0, z); break;
      case 'start': L.model('Arrow', x, 0.03, z, 1.4, Math.atan2(-dx, -dz) + PI / 2); out.starts.push({ x, z }); break;
      case 'goalRed': case 'goalBlue': {
        // a 6x6 pit with brick walls going down; red's pit is the one Red defends
        const team = it.t === 'goalRed' ? 'red' : 'blue', bricks = [];
        for (let y = -1; y >= -9; y -= 2) for (let k = -2; k <= 2; k += 2) bricks.push({ x: x - 4, y, z: z + k }, { x: x + 4, y, z: z + k }, { x: x + k, y, z: z - 4 }, { x: x + k, y, z: z + 4 });
        L.inst('Cube_Bricks', bricks);
        for (const [bx, bz, hx, hz] of [[x - 4, z, 1, 3], [x + 4, z, 1, 3], [x, z - 4, 3, 1], [x, z + 4, 3, 1]]) L.box(bx, -5, bz, hx, 4, hz);
        L.floor(x - 3, x + 3, z + 3, z - 3, -10);
        L.model(team === 'red' ? 'k/flag-large-red' : 'k/flag-large-blue', x - 3.4, 0, z - 3.4, 3.4); L.model(team === 'red' ? 'k/flag-large-red' : 'k/flag-large-blue', x + 3.4, 0, z + 3.4, 3.4);
        out.goals[team] = { x, z }; break;
      }
      case 'ball': out.balls.push({ x, z }); if (!L.live) L.model('z/Football', x, 0.9, z, 0.8); break;
      case 'finish': L.model('k/flagCheckers', x - 1.2, 0, z, 2.4); L.model('k/flagCheckers', x + 1.2, 0, z, 2.4, PI); L.model('Cube_Question', x, 3.6, z, 0.8); out.finishes.push({ x, z }); break;
    }
  }
  return out;
}

export function customMode(map) {
  const type = map.type || 'race';
  if (type === 'ball') return customBall(map);
  const base = {
    id: 'custom', name: t('Your map'), short: t('Your map'), icon: 'build', desc: t('The map you built'), weapons: t('Freeze + Push'),
    build() {
      const L = new Level({ killY: -12, pickupPool: [{ id: 'freeze', w: 1 }, { id: 'push', w: 1 }] }); G.level = L; L.live = true;
      const info = buildFromMap(map, L); this.info = info;
      const s = info.starts[0] || { x: 0, z: 8 }; if (type === 'race') L.checkpoint(s.x, 0, s.z);
      L.scenery(40, -100, 30);
      const f = info.finishes[0] || { x: s.x, z: s.z - 20 };
      this.fly = [[f.x + 6, 14, f.z - 6, f.x, 0, f.z], [s.x + 8, 10, (s.z + f.z) / 2, s.x, 0, (s.z + f.z) / 2], [s.x, 6, s.z + 12, s.x, 1, s.z - 2]];
      this.len = Math.max(1, Math.hypot(f.x - s.x, f.z - s.z));
      // floor cells, for survival bots to wander between
      this.cells = map.items.filter((i) => i.t === 'floor' || i.t === 'raised').map((i) => ({ x: cellX(i.c), z: cellZ(i.r) }));
      if (type === 'survival') this.time = 60;
    },
    spawn(i) { const s = this.info.starts[0] || { x: 0, z: 8 }; return { x: s.x + (i % 3 - 1) * 1.6, y: 0, z: s.z + Math.floor(i / 3) * 1.6 }; },
  };
  if (type === 'survival') return Object.assign(base, {
    kind: 'survival', desc: t('Stay on the map until time runs out'),
    update(dt) { this.time -= dt; if (this.time <= 0) G.endRound(); },
    onFall(r) { G.eliminate(r); },
    target(r, dt) {
      const ai = r.ai; ai.wT = (ai.wT || 0) - dt;
      if (!ai.w || ai.wT < 0) { ai.w = this.cells.length ? this.cells[Math.floor(Math.random() * this.cells.length)] : { x: 0, z: 0 }; ai.wT = rand(2, 4); }
      return { x: ai.w.x, z: ai.w.z, near: 1 };
    },
  });
  return Object.assign(base, {
    kind: 'race',
    update() {
      for (const r of G.runners) {
        if (r.out || r.finished) continue;
        if (this.info.finishes.some((f) => Math.hypot(r.pos.x - f.x, r.pos.z - f.z) < 2.6)) G.finish(r);
      }
    },
    onFall(r) { const s = this.info.starts[0] || { x: 0, z: 8 }; r.reset(s.x, 2, s.z); if (r.isPlayer) toast(t('Back to the start')); },
    target(r) { const f = this.info.finishes[0] || { x: 0, z: -40 }; return { x: f.x + Math.sin(r.i * 2) * 1.5, z: f.z }; },
    progress(r) { const s = this.info.starts[0] || { x: 0, z: 8 }, f = this.info.finishes[0] || { x: 0, z: -40 }; return clamp(1 - Math.hypot(r.pos.x - f.x, r.pos.z - f.z) / this.len, 0, 1); },
  });
}

// a player-built bat-ball map: same rules as Bat Ball, with pits wherever the builder put them
function customBall(map) {
  return {
    ...ballClassic, id: 'custom', name: t('Your map'), short: t('Your map'), icon: 'ball', desc: t('Two teams knock a ball into the other pit'),
    build() {
      const L = new Level({ killY: -14 }); G.level = L; L.live = true;
      const info = buildFromMap(map, L); this.info = info;
      L.scenery(50, -100, 34);
      this.goals = { red: info.goals.red || { x: 0, z: 10 }, blue: info.goals.blue || { x: 0, z: -30 } };
      this.ballSpot = info.balls[0] || { x: (this.goals.red.x + this.goals.blue.x) / 2, z: (this.goals.red.z + this.goals.blue.z) / 2 };
      this.ballObj = place('z/Football', 0, 1, 0, 0.92 / 1.14, 0, L.root);
      const b = new CANNON.Body({ mass: 2, material: matBall, linearDamping: 0.3, angularDamping: 0.3, collisionFilterGroup: G_BALL, collisionFilterMask: G_STATIC | G_RUNNER | G_HAZARD | G_BALL });
      b.addShape(new CANNON.Sphere(0.92)); b.userData = { kind: 'bigball' }; world.addBody(b); L.bodies.push(b);
      this.ball = b; this.score = { red: 0, blue: 0 }; this.time = 120; this.resetT = 0; this.curve = null; this.Z = 999; this.X = 999;
      this.resetBall();
      const o = this.ballSpot; this.fly = [[o.x + 20, 26, o.z + 20, o.x, 0, o.z], [o.x - 14, 10, o.z, o.x, 1, o.z], [o.x, 8, o.z + 14, o.x, 1, o.z]];
    },
    // Red defends the red pit, so Red scores in the blue pit
    goalOf(team) { return this.goals[team === 'red' ? 'blue' : 'red']; },
    goalHit(p) { if (p.y > -1.2) return null; for (const k of ['red', 'blue']) { const g = this.goals[k]; if (Math.abs(p.x - g.x) < 3 && Math.abs(p.z - g.z) < 3) return k === 'red' ? 'blue' : 'red'; } return null; },
    fit(q) { return q; },
    spawn(i) {
      const team = i % 2 ? 'blue' : 'red', k = Math.floor(i / 2), g = this.goals[team], o = this.ballSpot;
      const dx = o.x - g.x, dz = o.z - g.z, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
      const d = Math.min(l * 0.5, 7), side = (k % 3 - 1) * 2.4;
      return { x: g.x + ux * d - uz * side, y: 0, z: g.z + uz * d + ux * side, facing: Math.atan2(ux, uz) };
    },
    update(dt) { ballClassic.update.call(this, dt); for (const r of G.runners) if (!r.out && r.pos.y < -6) this.onFall(r); },
  };
}

// ---------------------------------------------------------------- editor
export const editor = {
  on: false, type: 'race', sel: 'floor', rot: 0, erase: false, L: null, grid: null, ghost: null, cam: { x: 0, z: -10, zoom: 30 },
  open() {
    this.on = true; getMap();
    this.grid = new THREE.GridHelper(COLS * 2, COLS, 0xffffff, 0xffffff);
    this.grid.scale.set(1, 1, ROWS / COLS); this.grid.position.set(0, 0.05, 12 - ROWS);
    this.grid.material.transparent = true; this.grid.material.opacity = 0.35; scene.add(this.grid);
    this.rebuild();
  },
  close() { this.on = false; this.L?.dispose(); this.L = null; this.grid?.removeFromParent(); this.grid = null; },
  rebuild() { this.L?.dispose(); this.L = new Level(); buildFromMap(getMap(), this.L); },
  pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect(), nd = V(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1, 0.5);
    nd.unproject(camera); const dir = nd.sub(camera.position).normalize(); if (dir.y >= -0.01) return null;
    const t = -camera.position.y / dir.y, x = camera.position.x + dir.x * t, z = camera.position.z + dir.z * t;
    const c = Math.floor((x + COLS) / CELL), row = Math.floor((12 - z) / CELL);
    if (c < 0 || c >= COLS || row < 0 || row >= ROWS) return null;
    return { c, r: row };
  },
  tap(clientX, clientY) {
    const cell = this.pick(clientX, clientY); if (!cell) return;
    const map = getMap(), same = (it) => it.c === cell.c && it.r === cell.r;
    if (this.erase) {
      const i = map.items.findLastIndex(same); if (i >= 0) { map.items.splice(i, 1); sfx.crack(); }
    } else {
      const isGround = (t) => t === 'floor' || t === 'raised';
      if (isGround(this.sel)) map.items = map.items.filter((it) => !(same(it) && isGround(it.t)));
      else {
        map.items = map.items.filter((it) => !(same(it) && !isGround(it.t)));
        if (ONE.includes(this.sel)) map.items = map.items.filter((it) => it.t !== this.sel);
      }
      map.items.push({ t: this.sel, c: cell.c, r: cell.r, rot: this.rot });
      sfx.click(); fx.burst(V(cellX(cell.c), 0.5, cellZ(cell.r)), 0xffd23f, 6, 3);
    }
    persist(); this.rebuild();
  },
  clear() { getMap(); save.maps[this.type] = { type: this.type, items: [] }; persist(); this.rebuild(); },
  reset() { getMap(); save.maps[this.type] = defaultMap(this.type); persist(); this.rebuild(); },
  // what's missing before this map can be played; null when it's ready
  missing(map = getMap()) {
    const has = (k) => map.items.some((i) => i.t === k);
    if (map.type === 'ball') return !has('goalRed') ? t('Place the red pit') : !has('goalBlue') ? t('Place the blue pit') : !has('ball') ? t('Place the ball spot') : null;
    if (!has('start')) return t('Place the start piece first');
    if (map.type !== 'survival' && !has('finish')) return t('Place the finish piece first');
    return null;
  },
  updateCamera(dt) {
    const c = this.cam;
    camera.position.set(c.x, c.zoom * 0.95, c.z + c.zoom * 0.55);
    camera.lookAt(c.x, 0, c.z);
  },
};
