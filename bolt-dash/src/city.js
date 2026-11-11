// The city of the open world, built from Kenney's city kits: a 7x7 grid of blocks with wide two-lane roads,
// crossings and traffic lights, districts (downtown towers, shops, houses with gardens and driveways,
// factories, a park, parking lots), traffic that keeps to its lane and stops at red lights and behind other
// cars, people walking on the pavements, cars that crash into walls instead of going through them, and a minimap.
import { THREE, CANNON, M, G, PI, clamp, place, instanced, addBox, sfx, fx, world as physics } from './core.js';

export const S = 16, N = 7, P = 80, HALF = (N * P) / 2, LANE = 3.2, LAND = 29, CAR_S = 1.8;
export const R = (k) => -HALF + k * P; // road centre lines
const W = (k, n) => 'w/' + k + '/' + n;
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // E S W N
const rt = (d) => DIRS[(d + 1) % 4]; // the right-hand side of a direction
export const wrap = (a) => { while (a > PI) a -= PI * 2; while (a < -PI) a += PI * 2; return a; };
const toward = (v, t, s) => (v < t ? Math.min(t, v + s) : Math.max(t, v - s));

// seeded random numbers, so a city (and the house you bought in it) is the same on every visit
export function rng(seed) {
  let a = seed >>> 0;
  const f = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.range = (x, y) => x + f() * (y - x); f.pick = (arr) => arr[Math.floor(f() * arr.length)]; return f;
}

const BB = {};
export function bounds(key) { if (BB[key]) return BB[key]; const s = M[key].scene; s.updateMatrixWorld(true); return (BB[key] = new THREE.Box3().setFromObject(s)); }
// world box [x0, x1, z0, z1] of a model standing at the origin, turned by a multiple of 90 degrees
function rotBox(b, s, ry) {
  const k = Math.round((((ry / (PI / 2)) % 4) + 4) % 4) % 4, x0 = b.min.x * s, x1 = b.max.x * s, z0 = b.min.z * s, z1 = b.max.z * s;
  return k === 0 ? [x0, x1, z0, z1] : k === 1 ? [z0, z1, -x1, -x0] : k === 2 ? [-x1, -x0, -z1, -z0] : [-z1, -z0, x0, x1];
}
export function carSize(n) { const b = bounds(W('car-kit', n)); return { hw: Math.max(-b.min.x, b.max.x) * CAR_S, hl: Math.max(-b.min.z, b.max.z) * CAR_S }; }

// ---------------------------------------------------------------- solid things (2D boxes) for cars, people and the physics
class Statics {
  constructor(L) { this.L = L; this.list = []; this.grid = new Map(); this.C = 24; this.stamp = 0; this.out = []; this.active = []; this.t = 0; }
  add(x0, x1, z0, z1, h = 4, body = true, tag = null) {
    const s = { x0, x1, z0, z1, h, body, tag, b: null, on: false, q: 0, dead: false }; this.list.push(s);
    const C = this.C; for (let i = Math.floor(x0 / C); i <= Math.floor(x1 / C); i++) for (let j = Math.floor(z0 / C); j <= Math.floor(z1 / C); j++) { const k = i * 1000 + j; let a = this.grid.get(k); if (!a) this.grid.set(k, (a = [])); a.push(s); }
    return s;
  }
  near(x, z, r) {
    const C = this.C, out = this.out; out.length = 0; this.stamp++;
    for (let i = Math.floor((x - r) / C); i <= Math.floor((x + r) / C); i++) for (let j = Math.floor((z - r) / C); j <= Math.floor((z + r) / C); j++) {
      const a = this.grid.get(i * 1000 + j); if (a) for (const s of a) if (s.q !== this.stamp && !s.dead) { s.q = this.stamp; if (x + r > s.x0 && x - r < s.x1 && z + r > s.z0 && z - r < s.z1) out.push(s); }
    }
    return out;
  }
  // push a circle out of every box it overlaps; returns the push (and its direction) or null
  resolve(x, z, r) {
    let px = 0, pz = 0, hit = false;
    for (const s of this.near(x, z, r)) {
      const cx = clamp(x + px, s.x0, s.x1), cz = clamp(z + pz, s.z0, s.z1), dx = x + px - cx, dz = z + pz - cz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue; hit = true;
      if (d2 > 1e-6) { const d = Math.sqrt(d2), k = (r - d) / d; px += dx * k; pz += dz * k; }
      else { const l = x + px - s.x0, rr = s.x1 - x - px, u = z + pz - s.z0, dn = s.z1 - z - pz, m = Math.min(l, rr, u, dn); if (m === l) px -= l + r; else if (m === rr) px += rr + r; else if (m === u) pz -= u + r; else pz += dn + r; }
    }
    if (!hit) return null; const l = Math.hypot(px, pz) || 1; return { x: px, z: pz, nx: px / l, nz: pz / l };
  }
  inside(x, z, m = 0) { for (const s of this.near(x, z, m + 0.1)) if (x > s.x0 - m && x < s.x1 + m && z > s.z0 - m && z < s.z1 + m) return true; return false; }
  clear(ax, az, bx, bz) { const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 3); for (let i = 1; i < n; i++) if (this.inside(ax + (bx - ax) * i / n, az + (bz - az) * i / n)) return false; return true; }
  kill(s) { s.dead = true; if (s.b && s.on) { physics.removeBody(s.b); s.on = false; } }
  // only the solid things near the player are in the physics world, so a big city stays fast
  update(dt, x, z) {
    this.t -= dt; if (this.t > 0) return; this.t = 0.25;
    for (const s of this.near(x, z, 45)) if (s.body && !s.on) {
      if (!s.b) { s.b = addBox((s.x0 + s.x1) / 2, s.h / 2, (s.z0 + s.z1) / 2, (s.x1 - s.x0) / 2, s.h / 2, (s.z1 - s.z0) / 2); this.L.bodies.push(s.b); } else physics.addBody(s.b);
      s.on = true; this.active.push(s);
    }
    this.active = this.active.filter((s) => { const far = s.dead || Math.max(x - s.x1, s.x0 - x, z - s.z1, s.z0 - z) > 60; if (far && s.on) { physics.removeBody(s.b); s.on = false; } return s.on; });
  }
}

// ---------------------------------------------------------------- building the city
export function buildCity(L, seed) {
  const rnd = rng(seed), st = new Statics(L), inst = new Map();
  const add = (model, t, shadow = true) => { if (!M[model]) return; const ch = Math.floor((t.x + HALF + 60) / 170) * 10 + Math.floor((t.z + HALF + 60) / 170), k = model + '|' + ch + '|' + (shadow ? 1 : 0); let a = inst.get(k); if (!a) inst.set(k, (a = [])); a.push(t); };
  const tint = (name, src, hex) => { if (M[name] || !M[src]) return; const sc = M[src].scene.clone(true); sc.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.setHex(hex); } }); M[name] = { scene: sc }; };
  const TILE = W('city-kit-roads', 'tile-low'); tint('w/concrete', TILE, 0xb9bec7); tint('w/asphalt', TILE, 0x50545f); tint('w/paint', TILE, 0xf4f4f4);
  const flat = (model, x, z, sx, sz, y = 0.012, ry = 0) => add(model, { x, y, z, sx, sy: 1, sz, ry }, false); // tile-low is 1x1
  const city = { st, lots: [], doors: [], cams: [], spots: [], blocks: [], homes: 0, seed };

  // ground: grass island, concrete blocks, roads
  add('Cube_Grass_Single', { x: 0, y: -0.51, z: 0, sx: (HALF + 70) / 1.12, sy: 0.5, sz: (HALF + 70) / 1.12 }, false);
  for (let k = 0; k <= N; k++) for (let i = 0; i < N; i++) for (let m = 0; m < 4; m++) {
    const p = R(i) + 16 + m * 16;
    add(W('city-kit-roads', 'road-straight'), { x: p, y: 0.012, z: R(k), sx: S, sy: 1, sz: S, ry: 0 }, false);
    add(W('city-kit-roads', 'road-straight'), { x: R(k), y: 0.012, z: p, sx: S, sy: 1, sz: S, ry: PI / 2 }, false);
  }
  for (let a = 0; a <= N; a++) for (let b = 0; b <= N; b++) {
    const ea = a === 0 || a === N, eb = b === 0 || b === N; let n = 'road-crossroad-path', ry = 0;
    if (ea && eb) { n = 'road-bend'; ry = a === 0 ? (b === 0 ? PI / 2 : PI) : (b === 0 ? 0 : -PI / 2); }
    else if (eb) { n = 'road-intersection-path'; ry = b === 0 ? 0 : PI; }
    else if (ea) { n = 'road-intersection-path'; ry = a === 0 ? PI / 2 : -PI / 2; }
    add(W('city-kit-roads', n), { x: R(a), y: 0.012, z: R(b), sx: S, sy: 1, sz: S, ry }, false);
  }
  // street lights along the roads, traffic lights at the crossings
  const LIGHT = W('city-kit-roads', 'light-square'), TL = W('street-props', 'detail-light-traffic'), pole = (x, z) => st.add(x - 0.25, x + 0.25, z - 0.25, z + 0.25, 6, true, 'pole');
  for (let k = 0; k <= N; k++) for (let i = 0; i < N; i++) for (const f of [0.3, 0.7]) {
    const p = R(i) + P * f + (k % 2 ? 6 : 0);
    if (k > 0) { add(LIGHT, { x: p, y: 0, z: R(k) - 7.3, s: 10, ry: PI }); pole(p, R(k) - 7.3); add(LIGHT, { x: R(k) - 7.3, y: 0, z: p, s: 10, ry: -PI / 2 }); pole(R(k) - 7.3, p); }
    if (k < N) { add(LIGHT, { x: p, y: 0, z: R(k) + 7.3, s: 10, ry: 0 }); pole(p, R(k) + 7.3); add(LIGHT, { x: R(k) + 7.3, y: 0, z: p, s: 10, ry: PI / 2 }); pole(R(k) + 7.3, p); }
  }
  for (let a = 0; a <= N; a++) for (let b = 0; b <= N; b++) {
    const ea = a === 0 || a === N, eb = b === 0 || b === N; if (ea && eb) continue; const x = R(a), z = R(b);
    // one light per approach, on the corner to the right of the driver, its arm over the lane
    if (b < N && a < N) { add(TL, { x: x + 9, y: 0, z: z + 9, s: 5.5, ry: PI / 2 }); pole(x + 9, z + 9); }
    if (b > 0 && a < N) { add(TL, { x: x + 9, y: 0, z: z - 9, s: 5.5, ry: PI }); pole(x + 9, z - 9); }
    if (b > 0 && a > 0) { add(TL, { x: x - 9, y: 0, z: z - 9, s: 5.5, ry: -PI / 2 }); pole(x - 9, z - 9); }
    if (b < N && a > 0) { add(TL, { x: x - 9, y: 0, z: z + 9, s: 5.5, ry: 0 }); pole(x - 9, z + 9); }
  }

  // ---- blocks
  const COM = 'abcdefghijklmn'.split('').map((c) => W('city-kit-commercial', 'building-' + c)), TOW = 'abcde'.split('').map((c) => W('city-kit-commercial', 'building-skyscraper-' + c));
  const SUB = 'abcdefghijklmnopqrstu'.split('').map((c) => W('city-kit-suburban', 'building-type-' + c)), IND = 'abcdefghijklmnopqrst'.split('').map((c) => W('city-kit-industrial', 'building-' + c));
  const TREE = W('city-kit-suburban', 'tree-large'), TREE2 = W('city-kit-suburban', 'tree-small'), PTREE = W('street-props', 'tree-park-large'), PINE = W('street-props', 'tree-pine-large'), BENCH = W('street-props', 'detail-bench');
  const FACE = { S: [0, 0, 1], N: [PI, 0, -1], E: [PI / 2, 1, 0], W: [-PI / 2, -1, 0] }; // ry and the outward direction
  const tree = (model, x, z, s) => { add(model, { x, y: 0, z, s, ry: rnd() * 6 }); st.add(x - 0.5, x + 0.5, z - 0.5, z + 0.5, 5, true, 'tree'); };
  // a building in a cell, its front on the cell's outer edge (minus a setback), centred along it
  const building = (model, cx, cz, cell, face, scale, setback, kind, blk) => {
    const [ry, nx, nz] = FACE[face], b = bounds(model), raw = rotBox(b, 1, ry), fit = Math.min(scale, (cell - setback - 1.5) / (raw[1] - raw[0]), (cell - 2) / (raw[3] - raw[2]), (cell - 2) / (raw[1] - raw[0]), (cell - setback - 1.5) / (raw[3] - raw[2]));
    const [x0, x1, z0, z1] = rotBox(b, fit, ry), half = cell / 2;
    let px = cx - (x0 + x1) / 2, pz = cz - (z0 + z1) / 2;
    if (nz > 0) pz = cz + half - setback - z1; else if (nz < 0) pz = cz - half + setback - z0; else if (nx > 0) px = cx + half - setback - x1; else px = cx - half + setback - x0;
    add(model, { x: px, y: 0, z: pz, s: fit, ry });
    const box = [px + x0, px + x1, pz + z0, pz + z1], h = b.max.y * fit; st.add(box[0] + 0.15, box[1] - 0.15, box[2] + 0.15, box[3] - 0.15, h, true, 'building');
    const fx_ = nx ? (nx > 0 ? box[1] : box[0]) : (box[0] + box[1]) / 2, fz = nz ? (nz > 0 ? box[3] : box[2]) : (box[2] + box[3]) / 2;
    const lot = { id: city.lots.length, x: px, z: pz, ry, nx, nz, kind, box, h, i: blk.i, j: blk.j, block: blk };
    lot.door = { x: fx_ + nx * 1.6, z: fz + nz * 1.6, lot }; city.lots.push(lot); city.doors.push(lot.door); return lot;
  };
  const parking = (cx, cz, w, d, fill, alongX = true) => {
    // rows of bays (4 m wide, 6 m deep) facing an aisle
    flat('w/asphalt', cx, cz, w, d, 0.014);
    const rows = Math.floor((alongX ? d : w) / 19.5) || 1, len = alongX ? w : d, bays = Math.floor((len - 2) / 4);
    for (let r = 0; r < rows; r++) for (const side of [-1, 1]) {
      const c0 = (alongX ? cz : cx) - (alongX ? d : w) / 2 + r * 19.5 + 9.75 + side * 6.5;
      for (let k = 0; k < bays; k++) {
        const u = (alongX ? cx : cz) - len / 2 + 1 + k * 4 + 2, x = alongX ? u : c0, z = alongX ? c0 : u, ry = alongX ? (side < 0 ? 0 : PI) : (side < 0 ? PI / 2 : -PI / 2);
        const lx = alongX ? u - 2 : c0, lz = alongX ? c0 : u - 2; flat('w/paint', lx, lz, alongX ? 0.15 : 5.6, alongX ? 5.6 : 0.15, 0.03);
        city.spots.push({ x, z, ry, fill });
      }
    }
  };
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const cx = R(i) + P / 2, cz = R(j) + P / 2, ring = Math.max(Math.abs(i - 3), Math.abs(j - 3));
    const type = i === 3 && j === 3 ? 'park' : i === 6 ? 'industrial' : (i === 3 && j === 0) || (i === 0 && j === 3) ? 'parking' : ring <= 1 ? 'downtown' : ring === 2 ? 'commercial' : 'suburb';
    const blk = { i, j, cx, cz, type }; city.blocks.push(blk);
    flat('w/concrete', cx, cz, P - S, P - S, 0.006);
    if (type === 'downtown' || type === 'commercial') {
      const cell = (LAND * 2) / 3;
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
        const x = cx - LAND + cell * (a + 0.5), z = cz - LAND + cell * (b + 0.5);
        if (a === 1 && b === 1) {
          if (type === 'commercial' || (i + j) % 2) parking(x, z, cell - 1, cell - 1, 0.5);
          else { for (const [u, v] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) tree(PTREE, x + u, z + v, 5.5); for (const [u, v, r] of [[0, -3, 0], [0, 3, PI], [-3, 0, PI / 2], [3, 0, -PI / 2]]) add(BENCH, { x: x + u, y: 0, z: z + v, s: 2.8, ry: r }); }
          continue;
        }
        const face = b === 0 ? 'N' : b === 2 ? 'S' : a === 0 ? 'W' : 'E';
        const model = type === 'downtown' ? (rnd() < 0.6 ? rnd.pick(TOW) : rnd.pick(COM.slice(10))) : rnd.pick(COM);
        building(model, x, z, cell, face, 10, 1, 'shop', blk);
      }
    } else if (type === 'suburb' || type === 'industrial') {
      const cell = LAND, sub = type === 'suburb';
      if (sub) add('Cube_Grass_Single', { x: cx, y: -0.02, z: cz, sx: LAND / 1.12, sy: 0.05, sz: LAND / 1.12 }, false);
      for (const [a, b, face] of [[0, 0, 'W'], [1, 0, 'N'], [1, 1, 'E'], [0, 1, 'S']]) {
        const x = cx - LAND + cell * (a + 0.5), z = cz - LAND + cell * (b + 0.5);
        const lot = building(rnd.pick(sub ? SUB : IND), x, z, cell, face, sub ? 8.5 : 9, sub ? 7.5 : 4, sub ? 'home' : 'factory', blk);
        const [ry, nx, nz] = FACE[face], px = -nz, pz = nx; // along the street
        // driveway (and a car on it) beside the house, or a yard with a truck by the factory
        const w0 = nx ? lot.box[2] : lot.box[0], w1 = nx ? lot.box[3] : lot.box[1], c0 = nx ? z : x, room0 = w0 - (c0 - cell / 2), room1 = c0 + cell / 2 - w1;
        const side = room1 > room0 ? 1 : -1, room = Math.max(room0, room1);
        if (room > 4.6) {
          const u = side > 0 ? w1 + room / 2 : w0 - room / 2, edge = nx ? x + nx * cell / 2 : z + nz * cell / 2, len = sub ? 11 : 13;
          const dxp = nx ? edge - nx * len / 2 : u, dzp = nx ? u : edge - nz * len / 2;
          if (sub) add(W('city-kit-suburban', 'driveway-long'), { x: dxp, y: 0.04, z: dzp, sx: 4.4 / 0.36, sy: 1, sz: len / 0.4, ry }, false);
          city.spots.push({ x: dxp, z: dzp, ry: ry + PI, fill: sub ? 0.6 : 0.8, truck: !sub });
        }
        if (sub) {
          lot.home = true; tree(rnd() < 0.5 ? TREE : TREE2, x - nx * (cell / 2 - 3) + px * (cell / 2 - 3) * -side, z - nz * (cell / 2 - 3) + pz * (cell / 2 - 3) * -side, 9);
        } else {
          const bx = x - nx * (cell / 2 - 3.5) + px * (cell / 2 - 3.5) * -side, bz = z - nz * (cell / 2 - 3.5) + pz * (cell / 2 - 3.5) * -side;
          if (!st.inside(bx, bz, 2)) { const m = rnd.pick(['chimney-large', 'detail-tank', 'chimney-medium']); add(W('city-kit-industrial', m), { x: bx, y: 0, z: bz, s: 7, ry: 0 }); st.add(bx - 2.5, bx + 2.5, bz - 2.5, bz + 2.5, 8, true, 'building'); }
          add(W('street-props', 'detail-dumpster-closed'), { x: x + px * 2 * side - nx * 2, y: 0, z: z + pz * 2 * side - nz * 2, s: 4, ry });
        }
      }
      if (sub) { // fences between the gardens
        const F = W('city-kit-suburban', 'fence'), fl = 0.48 * 9;
        for (let u = -LAND + fl / 2; u < LAND; u += fl) { add(F, { x: cx + u, y: 0, z: cz, s: 9, ry: 0 }, false); add(F, { x: cx, y: 0, z: cz + u, s: 9, ry: PI / 2 }, false); }
        st.add(cx - LAND, cx + LAND, cz - 0.25, cz + 0.25, 2.2, true, 'fence'); st.add(cx - 0.25, cx + 0.25, cz - LAND, cz + LAND, 2.2, true, 'fence');
      }
    } else if (type === 'parking') {
      parking(cx, cz, LAND * 2 - 2, LAND * 2 - 2, 0.55, j !== 0);
    } else if (type === 'park') {
      add('Cube_Grass_Single', { x: cx, y: -0.02, z: cz, sx: LAND / 1.12, sy: 0.05, sz: LAND / 1.12 }, false);
      flat('w/concrete', cx, cz, 5, LAND * 2, 0.05); flat('w/concrete', cx, cz, LAND * 2, 5, 0.05);
      for (let k = 0; k < 26; k++) { const x = cx + rnd.range(-26, 26), z = cz + rnd.range(-26, 26); if (Math.abs(x - cx) < 5 || Math.abs(z - cz) < 5 || st.inside(x, z, 3)) continue; tree(rnd() < 0.6 ? PTREE : PINE, x, z, rnd.range(5, 7)); }
      for (const [u, v, r] of [[-3.6, -14, PI / 2], [3.6, -14, -PI / 2], [-3.6, 14, PI / 2], [3.6, 14, -PI / 2], [-14, -3.6, 0], [-14, 3.6, PI], [14, -3.6, 0], [14, 3.6, PI]]) add(BENCH, { x: cx + u, y: 0, z: cz + v, s: 2.8, ry: r });
      city.statue = { x: cx, z: cz }; st.add(cx - 2.2, cx + 2.2, cz - 2.2, cz + 2.2, 3, true, 'statue');
    }
  }
  // the coast: pine trees around the city
  for (let k = 0; k < 90; k++) { const a = rnd() * PI * 2, r = HALF + rnd.range(22, 55), x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.abs(x) < HALF + 14 && Math.abs(z) < HALF + 14) continue; add(rnd() < 0.5 ? PINE : PTREE, { x, y: 0, z, s: rnd.range(5, 8), ry: rnd() * 6 }); }
  for (const [k, list] of inst) { const [m, , sh] = k.split('|'); L.inst(m, list, sh === '1'); }
  return city;
}

// ---------------------------------------------------------------- driving physics (your car and the police)
// c: { x, z, h (heading), v (speed), hw, hl }. wantH: the heading to steer to (or null), thr: -1..1, hand: handbrake
export function carStep(c, wantH, thr, hand, dt, st, others) {
  const vmax = c.vmax || 27, rate = 2.3 * clamp(Math.abs(c.v) / 6, 0, 1) * (hand ? 1.5 : 1);
  if (wantH != null) c.h = wrap(c.h + clamp(wrap(wantH - c.h), -rate * dt, rate * dt));
  const target = thr >= 0 ? thr * vmax : thr * 9;
  if (hand) c.v = toward(c.v, 0, 16 * dt);
  else if (thr === 0) c.v = toward(c.v, 0, 7 * dt);
  else if (Math.sign(target) !== Math.sign(c.v) && Math.abs(c.v) > 0.5) c.v = toward(c.v, 0, 26 * dt);
  else c.v = toward(c.v, target, (Math.abs(target) > Math.abs(c.v) ? 12 : 8) * dt);
  const fx_ = Math.sin(c.h), fz = Math.cos(c.h); c.x += fx_ * c.v * dt; c.z += fz * c.v * dt;
  // collisions: the car is three circles along its length
  let crash = 0; const off = c.hl - c.hw;
  for (let it = 0; it < 2; it++) for (const k of [-1, 0, 1]) {
    const px = c.x + fx_ * off * k, pz = c.z + fz * off * k, r = st.resolve(px, pz, c.hw);
    if (r) { c.x += r.x; c.z += r.z; const vn = c.v * (fx_ * r.nx + fz * r.nz); if (vn < -0.5) { crash = Math.max(crash, -vn); c.v *= 0.4; } }
  }
  for (const o of others) {
    if (o === c || Math.abs(o.x - c.x) > 9 || Math.abs(o.z - c.z) > 9) continue;
    const ofx = Math.sin(o.h), ofz = Math.cos(o.h), ooff = o.hl - o.hw;
    for (const k of [-1, 0, 1]) for (const q of [-1, 0, 1]) {
      const ax = c.x + fx_ * off * k, az = c.z + fz * off * k, bx = o.x + ofx * ooff * q, bz = o.z + ofz * ooff * q, dx = ax - bx, dz = az - bz, d = Math.hypot(dx, dz), rr = c.hw + o.hw;
      if (d < rr && d > 1e-4) { const p = (rr - d) / d; c.x += dx * p; c.z += dz * p; const vn = c.v * (fx_ * dx + fz * dz) / d; if (vn < -0.5) { crash = Math.max(crash, -vn); c.v *= 0.5; } o.bump = Math.max(o.bump || 0, -vn); }
    }
  }
  c.x = clamp(c.x, -HALF - 40, HALF + 40); c.z = clamp(c.z, -HALF - 40, HALF + 40);
  if (crash > 7) c.v = -Math.sign(c.v || 1) * Math.min(3, crash * 0.15);
  return crash;
}

// ---------------------------------------------------------------- traffic
const TRAFFIC = ['sedan', 'sedan', 'suv', 'van', 'taxi', 'taxi', 'hatchback-sports', 'sedan-sports', 'suv-luxury', 'truck', 'delivery', 'garbage-truck', 'ambulance'];
const nodeOk = (a, b) => a >= 0 && a <= N && b >= 0 && b <= N;
const isCorner = (a, b) => (a === 0 || a === N) && (b === 0 || b === N);
// traffic lights: 16 s cycle, east-west green for 7 s, all red, north-south green for 7 s, all red
export function green(a, b, d, t) { if (isCorner(a, b)) return true; const u = (t + ((a * 3 + b * 5) % 4) * 4) % 16; return d % 2 === 0 ? u < 7 : u >= 8 && u < 15; }

export class Traffic {
  constructor(L, st, count) { this.L = L; this.st = st; this.cars = []; this.t = 0; for (let k = 0; k < count; k++) this.cars.push(this.make(TRAFFIC[k % TRAFFIC.length])); }
  make(n) { const o = place(W('car-kit', n), 0, -50, 0, CAR_S, 0, this.L.root), { hw, hl } = carSize(n); const body = this.L.kin(new CANNON.Box(new CANNON.Vec3(hw, 1, hl)), 0, -50, 0, 'car'); return { o, n, hw, hl, body, x: 0, z: -9999, h: 0, v: 0, live: false }; }
  posOn(c) { const [dx, dz] = DIRS[c.d], [rx, rz] = rt(c.d), lane = LANE + (c.pull || 0); return [R(c.a) + dx * c.s + rx * lane, R(c.b) + dz * c.s + rz * lane]; }
  spawn(c, px, pz, minD, maxD) {
    for (let tries = 0; tries < 40; tries++) {
      const a = Math.floor(Math.random() * (N + 1)), b = Math.floor(Math.random() * (N + 1)), d = Math.floor(Math.random() * 4);
      if (!nodeOk(a + DIRS[d][0], b + DIRS[d][1])) continue;
      Object.assign(c, { a, b, d, s: 12 + Math.random() * 50, turn: null, v: 6, pull: 0, stuck: 0 });
      const [x, z] = this.posOn(c), dd = Math.hypot(x - px, z - pz);
      if (dd < minD || dd > maxD || this.cars.some((o) => o !== c && o.live && Math.hypot(o.x - x, o.z - z) < 14)) continue;
      c.x = x; c.z = z; c.h = Math.atan2(DIRS[d][0], DIRS[d][1]); c.live = true; return true;
    }
    c.live = false; c.o.position.y = -50; return false;
  }
  startTurn(c) {
    const ax = R(c.a) + DIRS[c.d][0] * P, bz = R(c.b) + DIRS[c.d][1] * P, a2 = c.a + DIRS[c.d][0], b2 = c.b + DIRS[c.d][1];
    const opts = [c.d, (c.d + 1) % 4].filter((d) => nodeOk(a2 + DIRS[d][0], b2 + DIRS[d][1])); const d2 = opts.length ? opts[Math.random() < 0.65 ? 0 : opts.length - 1] : (c.d + 3) % 4;
    const [dx, dz] = DIRS[c.d], [ex, ez] = DIRS[d2], [rx, rz] = rt(c.d), [sx, sz] = rt(d2);
    const p0 = [ax - dx * 10 + rx * LANE, bz - dz * 10 + rz * LANE], p2 = [ax + ex * 10 + sx * LANE, bz + ez * 10 + sz * LANE];
    const p1 = d2 === c.d ? [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2] : [ax + rx * LANE + sx * LANE, bz + rz * LANE + sz * LANE];
    let len = 0, q = p0; for (let i = 1; i <= 8; i++) { const u = i / 8, w = this.bez(p0, p1, p2, u); len += Math.hypot(w[0] - q[0], w[1] - q[1]); q = w; }
    c.turn = { p0, p1, p2, u: 0, len, a2, b2, d2 };
  }
  bez(p0, p1, p2, u) { const k = 1 - u; return [k * k * p0[0] + 2 * k * u * p1[0] + u * u * p2[0], k * k * p0[1] + 2 * k * u * p1[1] + u * u * p2[1]]; }
  update(dt, t, p, movers, onFoot, police) {
    for (const c of this.cars) {
      if (!c.live) { this.spawn(c, p.x, p.z, 70, 200); continue; }
      const dist = Math.hypot(c.x - p.x, c.z - p.z); if (dist > 240) { this.spawn(c, p.x, p.z, 80, 200); continue; }
      const fx_ = Math.sin(c.h), fz = Math.cos(c.h); let want = 11;
      // stop behind other cars, and for people standing in front
      for (const o of movers) {
        if (o === c) continue; const rx = o.x - c.x, rz = o.z - c.z, along = rx * fx_ + rz * fz; if (along <= 0 || along > 20) continue;
        const lat = Math.abs(rx * fz - rz * fx_); if (lat < c.hw + (o.hw || 0.5) + 0.5) want = Math.min(want, Math.max(0, along - c.hl - (o.hl || 0.5) - 2) * 1.4);
      }
      if (onFoot) { const rx = onFoot.x - c.x, rz = onFoot.z - c.z, along = rx * fx_ + rz * fz, lat = Math.abs(rx * fz - rz * fx_); if (along > 0 && along < 14 && lat < c.hw + 0.8) { want = Math.min(want, Math.max(0, along - c.hl - 2)); if (want < 1 && Math.random() < dt * 0.4) sfx.beep?.(); } }
      // move over for a police car chasing someone
      const siren = police.find((o) => { const rx = o.x - c.x, rz = o.z - c.z; return rx * fx_ + rz * fz < 0 && Math.hypot(rx, rz) < 28; });
      c.pull = toward(c.pull || 0, siren && !c.turn ? 2.4 : 0, dt * 2); if (siren && !c.turn) want = Math.min(want, 2);
      if (!c.turn) {
        const stop = P - 9.5 - c.hl, a2 = c.a + DIRS[c.d][0], b2 = c.b + DIRS[c.d][1];
        if (!green(a2, b2, c.d, t) && c.s < stop + 0.3) { const left = stop - c.s; if (left > c.v * c.v / 18 - 0.5 || c.v < 3) want = Math.min(want, Math.max(0, left * 1.2)); }
      }
      c.v = toward(c.v, want, (want < c.v ? 14 : 4) * dt);
      if (c.v < 0.3 && want < 0.3) { c.stuck += dt; if (c.stuck > 25 && dist > 50) { this.spawn(c, p.x, p.z, 80, 200); continue; } } else c.stuck = 0;
      if (!c.turn) {
        c.s += c.v * dt; if (c.s >= P - 10) this.startTurn(c);
        const [x, z] = this.posOn(c); c.x = x; c.z = z; c.h = Math.atan2(DIRS[c.d][0], DIRS[c.d][1]);
      }
      if (c.turn) {
        const tr = c.turn; tr.u += c.v * dt / tr.len;
        if (tr.u >= 1) { c.a = tr.a2; c.b = tr.b2; c.d = tr.d2; c.s = 10; c.turn = null; const [x, z] = this.posOn(c); c.x = x; c.z = z; c.h = Math.atan2(DIRS[c.d][0], DIRS[c.d][1]); }
        else { const w = this.bez(tr.p0, tr.p1, tr.p2, tr.u), w2 = this.bez(tr.p0, tr.p1, tr.p2, Math.min(1, tr.u + 0.02)); c.x = w[0]; c.z = w[1]; c.h = Math.atan2(w2[0] - w[0], w2[1] - w[1]); }
      }
      c.o.position.set(c.x, 0, c.z); c.o.rotation.y = c.h; c.body.position.set(c.x, 1, c.z); c.body.quaternion.setFromEuler(0, c.h, 0);
    }
  }
  remove(c) { c.live = false; c.o.removeFromParent(); this.cars.splice(this.cars.indexOf(c), 1); c.body.position.set(0, -50, 0); }
}

// ---------------------------------------------------------------- people walking around the blocks
export class Walkers {
  constructor(city, list) { this.city = city; this.list = list; }
  place(n, px, pz, far) {
    const near = this.city.blocks.filter((b) => { const d = Math.hypot(b.cx - px, b.cz - pz); return d < 150 && (!far || d > 70); });
    const b = near[Math.floor(Math.random() * near.length)] || this.city.blocks[0];
    Object.assign(n, { cx: b.cx, cz: b.cz, hs: 30.9 + (Math.random() - 0.5) * 1.6, d: Math.random(), dir: Math.random() < 0.5 ? 1 : -1, down: 0 });
  }
  update(dt, p, player) {
    for (const n of this.list) {
      if (n.cx === undefined) this.place(n, p.x, p.z, false);
      if (Math.hypot(n.o.position.x - p.x, n.o.position.z - p.z) > 170) this.place(n, p.x, p.z, true);
      if (n.down > 0) { n.down -= dt; if (n.down <= 0) { n.o.rotation.x = 0; n.o.position.y = 0; } continue; }
      n.mixer.update(dt);
      const per = n.hs * 8, s = ((n.d % 1) + 1) % 1 * 4, side = Math.floor(s), f = s - side, h = n.hs, a = -h + f * h * 2;
      const [x, z, ry] = side === 0 ? [a, -h, PI / 2] : side === 1 ? [h, a, 0] : side === 2 ? [-a, h, -PI / 2] : [-h, -a, PI];
      const X = n.cx + x, Z = n.cz + z, blocked = player && Math.hypot(player.x - X, player.z - Z) < 1.3;
      if (!blocked) n.d += n.dir * n.sp * dt / per;
      n.o.position.set(X, 0, Z); n.o.rotation.y = n.dir > 0 ? ry : ry + PI;
    }
  }
  knock(n, dx, dz) { n.down = 5; n.o.rotation.x = -PI / 2; n.o.position.x += dx * 2.5; n.o.position.z += dz * 2.5; n.o.position.y = 0.3; fx.burst(n.o.position.clone().setY(1), 0xffffff, 10, 5); }
}

// ---------------------------------------------------------------- minimap (top left, turns with the camera)
export class Minimap {
  constructor(city) {
    const size = 2 * (HALF + 40), c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); this.off = size / 2;
    g.fillStyle = '#5b9e5a'; g.fillRect(0, 0, size, size);
    const col = { downtown: '#9aa0ab', commercial: '#b0b4bc', suburb: '#7fbf6e', industrial: '#a89f8f', park: '#3f8f45', parking: '#6d717c' };
    for (const b of city.blocks) { g.fillStyle = col[b.type]; g.fillRect(b.cx - 32 + this.off, b.cz - 32 + this.off, 64, 64); }
    g.fillStyle = '#e9e9ee'; for (let k = 0; k <= N; k++) { g.fillRect(R(k) - 7 + this.off, -HALF - 7 + this.off, 14, 2 * HALF + 14); g.fillRect(-HALF - 7 + this.off, R(k) - 7 + this.off, 2 * HALF + 14, 14); }
    g.fillStyle = '#4b505c'; for (const s of city.st.list) if (s.tag === 'building') g.fillRect(s.x0 + this.off, s.z0 + this.off, s.x1 - s.x0, s.z1 - s.z0);
    this.map = c; const el = document.createElement('canvas'); el.id = 'miniMap'; el.width = el.height = 240;
    Object.assign(el.style, { position: 'fixed', left: '14px', top: '112px', width: '120px', height: '120px', borderRadius: '50%', border: '3px solid rgba(255,255,255,.85)', boxShadow: '0 3px 10px rgba(0,0,0,.35)', zIndex: 5, pointerEvents: 'none', background: '#5b9e5a' });
    document.body.appendChild(el); this.el = el; this.g = el.getContext('2d'); this.t = 0;
  }
  draw(dt, p, yaw, marks) {
    this.t -= dt; if (this.t > 0) return; this.t = 0.05;
    const g = this.g, Z = 0.75; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 240, 240);
    g.save(); g.translate(120, 120); g.rotate(yaw); g.scale(Z, Z); g.translate(-p.x - this.off, -p.z - this.off); g.drawImage(this.map, 0, 0); g.restore();
    const dot = (x, z, color, r) => { const dx = (x - p.x) * Z, dz = (z - p.z) * Z, c = Math.cos(yaw), s = Math.sin(yaw); let u = dx * c - dz * s, v = dx * s + dz * c; const l = Math.hypot(u, v); if (l > 108) { u *= 108 / l; v *= 108 / l; } g.fillStyle = color; g.beginPath(); g.arc(120 + u, 120 + v, r, 0, PI * 2); g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke(); };
    for (const m of marks) dot(m.x, m.z, m.c, m.r || 9);
    // you: an arrow pointing where you face
    const a = -p.facing + yaw + PI; g.save(); g.translate(120, 120); g.rotate(a); g.fillStyle = '#ffd23f'; g.strokeStyle = '#222'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -16); g.lineTo(11, 12); g.lineTo(0, 6); g.lineTo(-11, 12); g.closePath(); g.fill(); g.stroke(); g.restore();
  }
  show(on) { this.el.style.display = on ? '' : 'none'; }
  dispose() { this.el.remove(); }
}
export { W as WK, rotBox };
