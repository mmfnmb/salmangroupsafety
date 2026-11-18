// The lab: three floors built from the modular sci-fi kit on a fixed grid (no gaps), plus collision, doors, lights and props.
import * as THREE from 'three';
import { inst } from './assets.js';

export const SC = 0.7, C = 4 * SC, WH = 4.43 * SC, FLOOR_Y = [0, -12, -24];
// rooms per floor: letters are rooms, '#' is solid rock. Walls go between different letters unless a door sits on that edge.
export const MAPS = [
  ['############',
   '#OOO#SSS#EE#',
   '#OOO#SSS#EE#',
   '#HHHHHHHHHH#',
   '#H#TTTTT#XX#',
   '#H#TTTTT#XX#',
   '#H#TTTTT#XX#',
   '#H#TTTTT####',
   '#HHHHHHHHHH#',
   '#CCC#RRRRRR#',
   '#CCC#RRRRRR#',
   '############'],
  ['############',
   '#EE#WWWWWWW#',
   '#EE#WWWWWWW#',
   '#HHHHHHHHHH#',
   '#KKK#H#PPPP#',
   '#KKK#H#PPPP#',
   '#KKK#H#PPPP#',
   '#####H######',
   '#AAA#H#GGGG#',
   '#AAA#H#GGGG#',
   '#AAA#HHGGGG#',
   '############'],
  ['############',
   '#EE#ZZZZZZZ#',
   '#EE#ZZZZZZZ#',
   '#HHHHHHHHHH#',
   '#QQQ######H#',
   '#QQQ######H#',
   '#QQQ######H#',
   '#HHHHHHHHHH#',
   '#H##########',
   '#HHHHHHHFFF#',
   '############'],
];
// doors: [floor, x1, z1, x2, z2, lock]
const DOORS = [
  [0, 2, 2, 2, 3], [0, 6, 2, 6, 3], [0, 9, 2, 9, 3, 'green'], [0, 4, 3, 4, 4], [0, 5, 7, 5, 8], [0, 9, 3, 9, 4], [0, 2, 8, 2, 9], [0, 7, 8, 7, 9],
  [1, 1, 2, 1, 3], [1, 6, 2, 6, 3], [1, 2, 3, 2, 4], [1, 8, 3, 8, 4], [1, 4, 9, 5, 9], [1, 6, 10, 7, 10, 'valves'],
  [2, 1, 2, 1, 3], [2, 6, 2, 6, 3], [2, 2, 3, 2, 4], [2, 7, 9, 8, 9, 'exit'],
];
export const ROOM_NAMES = { O: 'offices', S: 'security', E: 'elevator', H: 'hall', T: 'tubes', X: 'chem', C: 'clinic', R: 'reception', W: 'storage', K: 'cages', P: 'pipes', A: 'archive', G: 'generator', Z: 'cells', Q: 'control', F: 'tunnel' };

export const cellAt = (f, x, z) => { const r = MAPS[f][z]; return r && r[x] ? r[x] : '#'; };
export const toCell = (v) => Math.floor(v / C);
export const cellCenter = (x, z) => [x * C + C / 2, z * C + C / 2];
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export class World {
  constructor(scene, low) { this.scene = scene; this.low = low; this.boxes = [[], [], []]; this.doors = []; this.inter = []; this.anchors = [[], [], []]; this.slots = {}; this.lockers = []; this.groups = []; }

  doorOn(f, x1, z1, x2, z2) { return this.doors.find((d) => d.f === f && ((d.a[0] === x1 && d.a[1] === z1 && d.b[0] === x2 && d.b[1] === z2) || (d.a[0] === x2 && d.a[1] === z2 && d.b[0] === x1 && d.b[1] === z1))); }

  async build(rand) {
    const P = (n) => inst('lab/' + n + '.glb');
    const walls = ['Wall_1', 'Wall_2', 'Wall_3', 'Wall_4', 'Wall_5', 'Wall_Empty', 'Wall_1', 'Wall_Empty'];
    const floors = ['FloorTile_Basic', 'FloorTile_Basic', 'FloorTile_Basic2'], roofs = ['RoofTile_Empty', 'RoofTile_Plate', 'RoofTile_Pipes1', 'RoofTile_Vents', 'RoofTile_SmallVents', 'RoofTile_Plate2', 'RoofTile_Details'];
    // preload templates once, then clone
    const tpl = {}; for (const n of [...new Set([...walls, ...floors, ...roofs, 'DoorSingle_Wall_SideA', 'DoorSingle_Wall_SideB', 'Door_Single', 'DoorDouble_Wall_SideA', 'DoorDouble_Wall_SideB', 'Door_Double'])]) tpl[n] = await P(n);
    const put = (g, n, x, y, z, ry = 0, rx = 0) => { const o = tpl[n].clone(true); o.scale.setScalar(SC); o.position.set(x, y, z); o.rotation.set(rx, ry, 0); g.add(o); return o; };
    for (const d of DOORS) this.doors.push({ f: d[0], a: [d[1], d[2]], b: [d[3], d[4]], lock: d[5] || null, open: 0, target: 0, obj: null, id: 'd' + this.doors.length });
    for (let f = 0; f < 3; f++) {
      const g = new THREE.Group(); g.position.y = FLOOR_Y[f]; this.scene.add(g); this.groups.push(g);
      const M = MAPS[f];
      for (let z = 0; z < M.length; z++) for (let x = 0; x < M[z].length; x++) {
        const c = M[z][x]; if (c === '#') continue; const [cx, cz] = cellCenter(x, z);
        for (const [ox, oz] of [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]]) {
          put(g, floors[(rand() * floors.length) | 0], cx + ox * C / 2, 0, cz + oz * C / 2);
          put(g, roofs[(rand() * roofs.length) | 0], cx + ox * C / 2, WH, cz + oz * C / 2, 0, Math.PI);
        }
        for (const [dx, dz] of DIRS) {
          const n = cellAt(f, x + dx, z + dz); if (n === c) continue;
          const ry = Math.atan2(dx, dz), ex = cx + dx * C / 2, ez = cz + dz * C / 2;
          const door = n !== '#' ? this.doorOn(f, x, z, x + dx, z + dz) : null;
          if (door) {
            const first = door.a[0] === x && door.a[1] === z, big = door.lock === 'exit';
            const fr = put(g, (big ? 'DoorDouble_Wall_' : 'DoorSingle_Wall_') + (first ? 'SideA' : 'SideB'), ex - dx * 0.0, 0, ez - dz * 0.0, ry);
            if (first) { const o = put(g, big ? 'Door_Double' : 'Door_Single', ex, 0, ez, ry); door.obj = o; door.base = o.position.clone(); door.axis = new THREE.Vector3(Math.cos(ry), 0, -Math.sin(ry)); door.w = big ? 1.9 : 1.2; door.center = [ex, ez]; door.dir = [dx, dz];
              if (door.lock) { const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.05), new THREE.MeshBasicMaterial({ color: 0xff2a2a })); lamp.position.set(ex + door.axis.x * 1.0 - dx * 0.25, 2.25, ez + door.axis.z * 1.0 - dz * 0.25); g.add(lamp); door.lamp = lamp; }
              this.inter.push({ kind: 'door', f, door, x: ex - dx * 0.5, z: ez - dz * 0.5, r: 1.6 }); this.inter.push({ kind: 'door', f, door, x: ex + dx * 0.5, z: ez + dz * 0.5, r: 1.6 }); }
            // jambs either side of the opening
            const half = (door.lock === 'exit' ? 1.9 : 1.2) / 2 + 0.05, len = C / 2 - half;
            for (const s of [-1, 1]) { const mx = ex + s * (half + len / 2) * Math.abs(dz), mz = ez + s * (half + len / 2) * Math.abs(dx); this.addBox(f, mx, mz, Math.abs(dz) ? len : 0.35, Math.abs(dx) ? len : 0.35); }
          } else {
            put(g, walls[(rand() * walls.length) | 0], ex - dx * 0.1, 0, ez - dz * 0.1, ry);
            this.addBox(f, ex, ez, Math.abs(dz) ? C : 0.35, Math.abs(dx) ? C : 0.35);
            if (!this.slots[f + c]) this.slots[f + c] = [];
            this.slots[f + c].push({ f, x: ex - dx * 0.75, z: ez - dz * 0.75, ry: ry + Math.PI, cell: [x, z], used: false });
          }
        }
      }
    }
    // one light anchor per room (room centroid), with a ceiling lamp
    for (let f = 0; f < 3; f++) {
      const rooms = {}; MAPS[f].forEach((r, z) => [...r].forEach((c, x) => { if (c !== '#') (rooms[c] = rooms[c] || []).push([x, z]); }));
      for (const [c, cells] of Object.entries(rooms)) {
        const pts = c === 'H' ? cells.filter((_, i) => i % 3 === 0) : [cells[(cells.length / 2) | 0]];
        for (const [x, z] of pts) { const [cx, cz] = cellCenter(x, z);
          const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.25), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff0d0, emissiveIntensity: 1 }));
          lamp.position.set(cx, WH - 0.05, cz); this.groups[f].add(lamp);
          this.anchors[f].push({ f, room: c, x: cx, z: cz, lamp, on: rand() > (f === 1 ? 0.3 : 0.2), flick: rand() < 0.35, col: new THREE.Color(f === 2 ? 0x9fc4ff : 0xffe7c2), red: false });
        }
      }
    }
  }
  addBox(f, x, z, w, d, h = 3, tag = null) { const b = { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, h, tag }; this.boxes[f].push(b); return b; }
  slot(f, room, rand) { const s = (this.slots[f + room] || []).filter((q) => !q.used); if (!s.length) return null; const q = s[(rand() * s.length) | 0]; q.used = true; return q; }
  async prop(name, f, x, z, ry, opts = {}) {
    const o = await inst(name.includes('/') ? name : 'lab/' + name + '.glb'); const s = (opts.s || 1) * SC; o.scale.setScalar(s); o.position.set(x, opts.y || 0, z); o.rotation.y = ry; this.groups[f].add(o);
    if (opts.tint) o.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.color = new THREE.Color(opts.tint); if (opts.metal != null) { m.material.metalness = opts.metal; m.material.roughness = 0.5; } } });
    if (opts.solid !== false) { const bb = new THREE.Box3().setFromObject(o); const gy = this.groups[f].position.y; this.addBox(f, (bb.min.x + bb.max.x) / 2, (bb.min.z + bb.max.z) / 2, bb.max.x - bb.min.x - (opts.shrink || 0.1), bb.max.z - bb.min.z - (opts.shrink || 0.1), bb.max.y - gy, opts.tag); }
    return o;
  }
  // circle-vs-boxes push-out; returns corrected [x, z]
  collide(f, x, z, r = 0.32, ignoreDoors = false) {
    for (let it = 0; it < 2; it++) {
      for (const b of this.boxes[f]) { if (b.h < 0.45) continue; const px = Math.max(b.x0, Math.min(x, b.x1)), pz = Math.max(b.z0, Math.min(z, b.z1)); const dx = x - px, dz = z - pz, d2 = dx * dx + dz * dz;
        if (d2 < r * r) { if (d2 < 1e-8) { x += r; continue; } const d = Math.sqrt(d2), k = (r - d) / d; x += dx * k; z += dz * k; } }
      if (!ignoreDoors) for (const d of this.doors) { if (d.f !== f || !d.obj || d.open > 0.6) continue; const [cx, cz] = d.center, hw = d.w / 2, ax = Math.abs(d.dir[1]) ? hw : 0.2, az = Math.abs(d.dir[0]) ? hw : 0.2;
        const px = Math.max(cx - ax, Math.min(x, cx + ax)), pz = Math.max(cz - az, Math.min(z, cz + az)); const dx = x - px, dz = z - pz, d2 = dx * dx + dz * dz;
        if (d2 < r * r && d2 > 1e-8) { const dd = Math.sqrt(d2), k = (r - dd) / dd; x += dx * k; z += dz * k; } }
    }
    return [x, z];
  }
  // line of sight on one floor (walls, closed doors and tall props block)
  los(f, x0, z0, x1, z1) {
    const steps = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.35);
    for (let i = 1; i < steps; i++) { const t = i / steps, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      if (cellAt(f, toCell(x), toCell(z)) === '#') return false;
      for (const b of this.boxes[f]) if (b.h > 1.6 && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return false;
      for (const d of this.doors) if (d.f === f && d.open < 0.5 && Math.abs(x - d.center[0]) < (d.dir[1] ? d.w / 2 : 0.2) && Math.abs(z - d.center[1]) < (d.dir[0] ? d.w / 2 : 0.2)) return false; }
    return true;
  }
  // monster pathing: next cell toward a target cell (BFS through rooms and unlocked/open doors)
  nextStep(f, from, to, canOpenLocked = false) {
    const key = (x, z) => x + ',' + z; const prev = new Map([[key(...from), null]]); const q = [from];
    while (q.length) { const [x, z] = q.shift(); if (x === to[0] && z === to[1]) break;
      for (const [dx, dz] of DIRS) { const nx = x + dx, nz = z + dz, c = cellAt(f, x, z), n = cellAt(f, nx, nz); if (n === '#' || prev.has(key(nx, nz))) continue;
        if (n !== c) { const d = this.doorOn(f, x, z, nx, nz); if (!d) continue; if (d.lock && !d.unlocked && !canOpenLocked) continue; }
        prev.set(key(nx, nz), [x, z]); q.push([nx, nz]); } }
    let cur = [to[0], to[1]]; if (!prev.has(key(...cur))) return null;
    while (true) { const p = prev.get(key(...cur)); if (!p || (p[0] === from[0] && p[1] === from[1])) return p ? cur : null; cur = p; }
  }
  update(dt) {
    for (const d of this.doors) { if (!d.obj) continue; d.open += Math.sign(d.target - d.open) * Math.min(Math.abs(d.target - d.open), dt * 2.2);
      d.obj.position.copy(d.base).addScaledVector(d.axis, d.open * d.w * 0.95); if (d.lamp) d.lamp.material.color.setHex(d.unlocked ? 0x2aff6a : 0xff2a2a); }
  }
}
