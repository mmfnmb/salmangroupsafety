// Build mode: place map pieces on a grid, save the map, and play it.
import { THREE, G, V, PI, rand, clamp, camera, canvas, scene, renderer, save, persist, sfx, toast, fx } from './core.js';
import { Level } from './level.js';

export const PIECES = [
  { t: 'floor', name: 'أرضية', model: 'Cube_Grass_Single' },
  { t: 'raised', name: 'منصة عالية', model: 'Cube_Bricks' },
  { t: 'fence', name: 'سور', model: 'k/fence-straight', rot: true },
  { t: 'speed', name: 'أسهم سرعة', model: 'k/indicator-special-arrow', rot: true },
  { t: 'conveyor', name: 'سير', model: 'k/conveyor-belt', rot: true },
  { t: 'spring', name: 'زنبرك', model: 'k/spring' },
  { t: 'bouncer', name: 'نطاط', model: 'Bouncer', rot: true },
  { t: 'saw', name: 'منشار', model: 'Hazard_Saw', rot: true },
  { t: 'sweeper', name: 'ذراع بتلف', model: 'Hazard_Cylinder' },
  { t: 'spike', name: 'بلوك شوك', model: 'k/spike-block', rot: true },
  { t: 'trap', name: 'فخ شوك', model: 'k/trap-spikes' },
  { t: 'crate', name: 'صندوق بيتكسر', model: 'k/crate' },
  { t: 'wall', name: 'صندوق حديد', model: 'k/crate-strong' },
  { t: 'cannon', name: 'مدفع', model: 'Cannon', rot: true },
  { t: 'coin', name: 'عملة', model: 'Coin' },
  { t: 'pickup', name: 'صندوق سلاح', model: 'k/crate-item' },
  { t: 'start', name: 'البداية', model: 'Arrow' },
  { t: 'finish', name: 'النهاية', model: 'k/flagCheckers' },
];
const CELL = 2, COLS = 12, ROWS = 44; // x: -12..12, z: 12..-76
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const cellX = (c) => -COLS + CELL / 2 + c * CELL, cellZ = (r) => 12 - CELL / 2 - r * CELL;

export function defaultMap() {
  const items = [];
  for (let r = 0; r < 18; r++) for (let c = 3; c < 9; c++) items.push({ t: 'floor', c, r, rot: 0 });
  items.push({ t: 'start', c: 6, r: 1, rot: 0 }, { t: 'speed', c: 5, r: 4, rot: 0 }, { t: 'speed', c: 6, r: 4, rot: 0 }, { t: 'saw', c: 6, r: 9, rot: 1 }, { t: 'finish', c: 6, r: 16, rot: 0 });
  return { items };
}
export function getMap() { if (!save.maps) save.maps = defaultMap(); return save.maps; }

// builds a real level from a saved map (used by the editor preview and for playing it)
export function buildFromMap(map, L) {
  const floors = [], raised = [], need = new Set();
  const key = (c, r) => c + ',' + r;
  for (const it of map.items) if (!['floor', 'raised'].includes(it.t)) need.add(key(it.c, it.r));
  for (const it of map.items) { if (it.t === 'floor') floors.push(it); if (it.t === 'raised') raised.push(it); need.delete(key(it.c, it.r)); }
  for (const k of need) { const [c, r] = k.split(',').map(Number); floors.push({ c, r }); }
  L.inst('Cube_Grass_Single', floors.map((f) => ({ x: cellX(f.c), y: -1, z: cellZ(f.r) })));
  for (const f of floors) L.box(cellX(f.c), -1, cellZ(f.r), 1, 1, 1);
  L.inst('Cube_Grass_Single', raised.map((f) => ({ x: cellX(f.c), y: 0.5, z: cellZ(f.r) })));
  L.inst('Cube_Grass_Single', raised.map((f) => ({ x: cellX(f.c), y: -1.0, z: cellZ(f.r) })));
  for (const f of raised) L.box(cellX(f.c), -0.25, cellZ(f.r), 1, 1.75, 1);
  const out = { starts: [], finishes: [] };
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
      case 'finish': L.model('k/flagCheckers', x - 1.2, 0, z, 2.4); L.model('k/flagCheckers', x + 1.2, 0, z, 2.4, PI); L.model('Cube_Question', x, 3.6, z, 0.8); out.finishes.push({ x, z }); break;
    }
  }
  return out;
}

export function customMode(map) {
  return {
    id: 'custom', name: 'الماب بتاعك', short: 'الماب بتاعك', kind: 'race', icon: 'build', desc: 'الماب اللي بنيته', weapons: 'التلج + الدفع',
    build() {
      const L = new Level({ killY: -12, pickupPool: [{ id: 'freeze', w: 1 }, { id: 'push', w: 1 }] }); G.level = L;
      const info = buildFromMap(map, L); this.info = info;
      const s = info.starts[0] || { x: 0, z: 8 }; L.checkpoint(s.x, 0, s.z);
      L.scenery(40, -100, 30);
      const f = info.finishes[0] || { x: 0, z: -40 };
      this.fly = [[f.x + 6, 14, f.z - 6, f.x, 0, f.z], [s.x + 8, 10, (s.z + f.z) / 2, s.x, 0, (s.z + f.z) / 2], [s.x, 6, s.z + 12, s.x, 1, s.z - 2]];
      this.len = Math.max(1, Math.hypot(f.x - s.x, f.z - s.z));
    },
    spawn(i) { const s = this.info.starts[0] || { x: 0, z: 8 }; return { x: s.x + (i % 3 - 1) * 1.6, y: 0, z: s.z + Math.floor(i / 3) * 1.6 }; },
    update() {
      for (const r of G.runners) {
        if (r.out || r.finished) continue;
        if (this.info.finishes.some((f) => Math.hypot(r.pos.x - f.x, r.pos.z - f.z) < 2.6)) G.finish(r);
      }
    },
    onFall(r) { const s = this.info.starts[0] || { x: 0, z: 8 }; r.reset(s.x, 2, s.z); if (r.isPlayer) toast('رجعت للبداية'); },
    target(r) { const f = this.info.finishes[0] || { x: 0, z: -40 }; return { x: f.x + Math.sin(r.i * 2) * 1.5, z: f.z }; },
    progress(r) { const s = this.info.starts[0] || { x: 0, z: 8 }, f = this.info.finishes[0] || { x: 0, z: -40 }; return clamp(1 - Math.hypot(r.pos.x - f.x, r.pos.z - f.z) / this.len, 0, 1); },
  };
}

// ---------------------------------------------------------------- editor
export const editor = {
  on: false, sel: 'floor', rot: 0, erase: false, L: null, grid: null, ghost: null, cam: { x: 0, z: -10, zoom: 30 },
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
        if (['start', 'finish'].includes(this.sel)) map.items = map.items.filter((it) => it.t !== this.sel);
      }
      map.items.push({ t: this.sel, c: cell.c, r: cell.r, rot: this.rot });
      sfx.click(); fx.burst(V(cellX(cell.c), 0.5, cellZ(cell.r)), 0xffd23f, 6, 3);
    }
    persist(); this.rebuild();
  },
  clear() { save.maps = { items: [] }; persist(); this.rebuild(); },
  reset() { save.maps = defaultMap(); persist(); this.rebuild(); },
  check() { const m = getMap(); return { start: m.items.some((i) => i.t === 'start'), finish: m.items.some((i) => i.t === 'finish') }; },
  updateCamera(dt) {
    const c = this.cam;
    camera.position.set(c.x, c.zoom * 0.95, c.z + c.zoom * 0.55);
    camera.lookAt(c.x, 0, c.z);
  },
};
