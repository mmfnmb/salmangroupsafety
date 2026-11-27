// The endless city of the open world, built from Kenney's city kits. The streets are a grid that never ends:
// the city is made in pieces (3x3 blocks) only when you come near, and every piece is made from its own fixed
// numbers, so it is the same every time you come back. Wide two-lane roads with crossings and traffic lights,
// districts (downtown towers, shops, houses with gardens, factories, parks, parking lots), traffic that keeps to
// its lane, stops at red lights and behind other cars, people on the pavements, cars that crash into walls instead
// of going through them, and a minimap.
import { THREE, CANNON, M, PI, clamp, place, instanced, addBox, sfx, fx, world as physics } from './core.js';

export const S = 16, P = 80, OFF = 280, LANE = 3.2, LAND = 29, CAR_S = 1.8;
export const R = (k) => -OFF + k * P; // road centre lines (any whole number k)
export const HALF = OFF; // the hand-made centre (7x7 blocks) spans -HALF..HALF
const W = (k, n) => 'w/' + k + '/' + n;
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // E S W N
const rt = (d) => DIRS[(d + 1) % 4]; // the right-hand side of a direction
export const wrap = (a) => { while (a > PI) a -= PI * 2; while (a < -PI) a += PI * 2; return a; };
const toward = (v, t, s) => (v < t ? Math.min(t, v + s) : Math.max(t, v - s));
export const nodeOf = (x) => Math.round((x + OFF) / P); // the nearest road line index
export const blockOf = (x) => Math.floor((x + OFF) / P);

// seeded random numbers, so every piece of the city is the same on every visit
export function rng(seed) {
  let a = Math.floor(seed * 4294967296) >>> 0;
  const f = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.range = (x, y) => x + f() * (y - x); f.pick = (arr) => arr[Math.floor(f() * arr.length)]; return f;
}
export function hash(i, j, s) { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 982451653)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function noise(x, z, s) { const xi = Math.floor(x), zi = Math.floor(z), fx_ = x - xi, fz = z - zi, u = fx_ * fx_ * (3 - 2 * fx_), v = fz * fz * (3 - 2 * fz), a = hash(xi, zi, s), b = hash(xi + 1, zi, s), c = hash(xi, zi + 1, s), d = hash(xi + 1, zi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }

// the street grid has gaps: some road pieces are left out (and become green walkways), so there are T-junctions,
// bends and corners, not just straight lines. The rule keeps at least two roads at every crossing.
let SEG_SEED = 7;
export function segOK(a, b, d) {
  if (d === 2) return segOK(a - 1, b, 0); if (d === 3) return segOK(a, b - 1, 1);
  if (d === 0 ? a >= 0 && a <= 6 && b >= 0 && b <= 7 : a >= 0 && a <= 7 && b >= 0 && b <= 6) return true; // the centre keeps all its roads
  const par = (((a + b) % 2) + 2) % 2; if (d === 0 ? par !== 0 : par !== 1) return true;
  return hash(a, b, SEG_SEED + 21 + d) > 0.22;
}
export const roads = (a, b) => [segOK(a, b, 0), segOK(a, b, 1), segOK(a, b, 2), segOK(a, b, 3)]; // E S W N
export const isRoundabout = (a, b) => (a < 0 || a > 7 || b < 0 || b > 7) && roads(a, b).every(Boolean) && hash(a, b, SEG_SEED + 33) < 0.14;

// colour variants of a model: the same building with its colours turned round the colour wheel (roofs, doors,
// awnings change colour; white walls and glass stay as they are). Done on the graphics card, so it costs nothing.
// The same shader lights some of the windows at night (BU.night, set by the quality file).
export const BU = { night: { value: 0 } };
const HUE_ROT = [0, 0.4167, 0.8056, 0.3611, 0.8333, 0.9167], LIFT = [1, 0.8, 0.85, 0.6, 0.65, 0.9]; // terracotta, blue, brown, slate, teal
function patchB(mat, v) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.bNight = BU.night;
    sh.vertexShader = 'varying vec3 vBW;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
      vec4 bq = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        bq = instanceMatrix * bq;
      #endif
      vBW = (modelMatrix * bq).xyz;`);
    sh.fragmentShader = 'varying vec3 vBW; uniform float bNight;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      vec3 bc = diffuseColor.rgb; float win = step(0.45, bc.b) * step(0.4, bc.b - bc.r) * step(bc.r, bc.g);
      ${v ? `if (win < 0.5) {
        float Y = dot(bc, vec3(0.299, 0.587, 0.114)), I = dot(bc, vec3(0.596, -0.274, -0.322)), Q = dot(bc, vec3(0.211, -0.523, 0.312));
        float ca = cos(${(HUE_ROT[v] * 6.2832).toFixed(4)}), sa = sin(${(HUE_ROT[v] * 6.2832).toFixed(4)}), I2 = I * ca - Q * sa, Q2 = I * sa + Q * ca;
        diffuseColor.rgb = clamp(vec3(Y + 0.956 * I2 + 0.621 * Q2, Y - 0.272 * I2 - 0.647 * Q2, Y - 1.106 * I2 + 1.703 * Q2), 0.0, 1.0) * mix(1.0, ${LIFT[v].toFixed(2)}, step(0.02, abs(I) + abs(Q)));
      }` : ''}`).replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float bl = step(0.42, fract(sin(dot(floor(vBW.xz * 0.42) + floor(vBW.y * 0.36) * 7.13, vec2(127.1, 311.7))) * 43758.5453));
      totalEmissiveRadiance += vec3(1.0, 0.8, 0.5) * win * bl * bNight;`);
  };
  mat.customProgramCacheKey = () => 'bld' + v; mat.needsUpdate = true;
}
export function variant(key, v) {
  if (!M[key]) return key;
  if (!v) { if (!M[key].bp) { M[key].bp = true; M[key].scene.traverse((o) => { if (o.isMesh) patchB(o.material, 0); }); } return key; }
  const vk = key + '#' + v; if (M[vk]) return vk;
  const sc = M[key].scene.clone(true); sc.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); patchB(o.material, v); } });
  M[vk] = { scene: sc, bp: true }; return vk;
}

const BB = {};
export function bounds(key) { if (BB[key]) return BB[key]; const s = M[key].scene; s.updateMatrixWorld(true); return (BB[key] = new THREE.Box3().setFromObject(s)); }
// world box [x0, x1, z0, z1] of a model standing at the origin, turned by a multiple of 90 degrees
export function rotBox(b, s, ry) {
  const k = Math.round((((ry / (PI / 2)) % 4) + 4) % 4) % 4, x0 = b.min.x * s, x1 = b.max.x * s, z0 = b.min.z * s, z1 = b.max.z * s;
  return k === 0 ? [x0, x1, z0, z1] : k === 1 ? [z0, z1, -x1, -x0] : k === 2 ? [-x1, -x0, -z1, -z0] : [-z1, -z0, x0, x1];
}
export function carSize(n) { const b = bounds(W('car-kit', n)); return { hw: Math.max(-b.min.x, b.max.x) * CAR_S, hl: Math.max(-b.min.z, b.max.z) * CAR_S }; }

// ---------------------------------------------------------------- solid things (2D boxes) for cars, people and the physics
class Statics {
  constructor(L) { this.L = L; this.grid = new Map(); this.C = 24; this.stamp = 0; this.out = []; this.active = []; this.t = 0; }
  add(x0, x1, z0, z1, h = 4, body = true, tag = null, chunk = null) {
    const s = { x0, x1, z0, z1, h, body, tag, chunk, b: null, on: false, q: 0, dead: false, cells: [] };
    const C = this.C; for (let i = Math.floor(x0 / C); i <= Math.floor(x1 / C); i++) for (let j = Math.floor(z0 / C); j <= Math.floor(z1 / C); j++) { const k = i * 100000 + j; let a = this.grid.get(k); if (!a) this.grid.set(k, (a = [])); a.push(s); s.cells.push(k); }
    if (chunk) chunk.statics.push(s); return s;
  }
  near(x, z, r) {
    const C = this.C, out = this.out; out.length = 0; this.stamp++;
    for (let i = Math.floor((x - r) / C); i <= Math.floor((x + r) / C); i++) for (let j = Math.floor((z - r) / C); j <= Math.floor((z + r) / C); j++) {
      const a = this.grid.get(i * 100000 + j); if (a) for (const s of a) if (s.q !== this.stamp && !s.dead) { s.q = this.stamp; if (x + r > s.x0 && x - r < s.x1 && z + r > s.z0 && z - r < s.z1) out.push(s); }
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
  kill(s) {
    if (s.dead) return; s.dead = true; if (s.b && s.on) { physics.removeBody(s.b); s.on = false; }
    for (const k of s.cells) { const a = this.grid.get(k); if (a) { const i = a.indexOf(s); if (i >= 0) a.splice(i, 1); if (!a.length) this.grid.delete(k); } }
  }
  // only the solid things near the player are in the physics world, so a big city stays fast
  update(dt, x, z, now = false) {
    this.t -= dt; if (this.t > 0 && !now) return; this.t = 0.25;
    for (const s of this.near(x, z, 45)) if (s.body && !s.on) {
      if (!s.b) { s.b = addBox((s.x0 + s.x1) / 2, s.h / 2, (s.z0 + s.z1) / 2, (s.x1 - s.x0) / 2, s.h / 2, (s.z1 - s.z0) / 2); this.L.bodies.push(s.b); } else physics.addBody(s.b);
      s.on = true; this.active.push(s);
    }
    this.active = this.active.filter((s) => { const far = s.dead || Math.max(x - s.x1, s.x0 - x, z - s.z1, s.z0 - z) > 60; if (far && s.on) { physics.removeBody(s.b); s.on = false; } return s.on; });
  }
}

// ---------------------------------------------------------------- what goes where
// the hand-made centre: a park in the middle, downtown around it, then shops, houses and factories
const CENTER_ROLES = { '2,2': 'shop:food', '3,2': 'shop:drink', '4,2': 'shop:clothes', '2,3': 'shop:furniture', '4,3': 'estate', '2,4': 'police', '3,4': 'depot', '4,4': 'bank', '1,3': 'gym', '5,3': 'hospital', '3,1': 'dealer', '3,5': 'race', '1,1': 'stadium', '5,5': 'airport', '1,5': 'shop:food', '5,1': 'shop:drink' };
const ROLE_POOL = ['shop:food', 'shop:drink', 'shop:food', 'shop:clothes', 'shop:furniture', 'estate', 'police', 'depot', 'bank', 'gym', 'hospital', 'dealer', 'race'];
export function blockType(i, j, seed) {
  if (i >= 0 && i <= 6 && j >= 0 && j <= 6) { const ring = Math.max(Math.abs(i - 3), Math.abs(j - 3)); return i === 3 && j === 3 ? 'park' : i === 6 ? 'industrial' : (i === 3 && j === 0) || (i === 0 && j === 3) ? 'parking' : ring <= 1 ? 'downtown' : ring === 2 ? 'commercial' : 'suburb'; }
  const h = hash(i, j, seed + 5); if (h < 0.05) return 'park'; if (h < 0.1) return 'parking';
  const n = noise(i / 5, j / 5, seed); return n > 0.7 ? 'downtown' : n > 0.52 ? 'commercial' : n < 0.24 ? 'industrial' : 'suburb';
}
function blockRole(i, j, seed, type) {
  if (i >= 0 && i <= 6 && j >= 0 && j <= 6) return CENTER_ROLES[i + ',' + j] || null;
  if (type !== 'downtown' && type !== 'commercial') return null; const h = hash(i, j, seed + 9); return h < 0.3 ? ROLE_POOL[Math.floor(hash(i, j, seed + 11) * ROLE_POOL.length)] : null;
}

const COM = 'abcdefghijklmn'.split('').map((c) => W('city-kit-commercial', 'building-' + c)), TOW = 'abcde'.split('').map((c) => W('city-kit-commercial', 'building-skyscraper-' + c));
const SUB = 'abcdefghijklmnopqrstu'.split('').map((c) => W('city-kit-suburban', 'building-type-' + c)), IND = 'abcdefghijklmnopqrst'.split('').map((c) => W('city-kit-industrial', 'building-' + c));
const TREE = W('city-kit-suburban', 'tree-large'), TREE2 = W('city-kit-suburban', 'tree-small'), PTREE = W('street-props', 'tree-park-large'), PINE = W('street-props', 'tree-pine-large'), BENCH = W('street-props', 'detail-bench'), DUMP = W('street-props', 'detail-dumpster-closed');
const LIGHT = W('city-kit-roads', 'light-square'), TL = W('street-props', 'detail-light-traffic'), ROAD = W('city-kit-roads', 'road-straight'), CROSS = W('city-kit-roads', 'road-crossroad-path');
const FACE = { S: [0, 0, 1], N: [PI, 0, -1], E: [PI / 2, 1, 0], W: [-PI / 2, -1, 0] }; // ry and the outward direction
const PARKED = ['sedan', 'sedan', 'suv', 'van', 'hatchback-sports', 'sedan-sports', 'suv-luxury', 'taxi'];

export class City {
  constructor(L, seed, nat) {
    this.L = L; this.seed = seed; this.nat = nat; SEG_SEED = seed; window.__BD && (window.__BD.buildU = BU); this.st = new Statics(L); this.chunks = new Map();
    this.lots = []; this.doors = []; this.parked = []; this.blocks = []; this.coins = []; this.homes = []; this.cams = []; this.roleDoors = {};
    const TILE = W('city-kit-roads', 'tile-low'), tint = (name, hex) => { if (M[name] || !M[TILE]) return; const sc = M[TILE].scene.clone(true); sc.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.setHex(hex); } }); M[name] = { scene: sc }; };
    tint('w/concrete', 0xb9bec7); tint('w/asphalt', 0x50545f); tint('w/paint', 0xf4f4f4);
    // grass under everything; it follows you around
    const g = M.Cube_Grass_Single.scene.clone(true); g.scale.set(1600 / 1.12, 0.5, 1600 / 1.12); g.position.y = -0.51; L.root.add(g); this.grass = g;
    this.statue = { x: 0, z: 0 };
  }
  // make the pieces near (x, z) and drop the far ones; one new piece per frame so it never stutters
  update(x, z, now = false) {
    this.grass.position.x = Math.round(x / 80) * 80; this.grass.position.z = Math.round(z / 80) * 80;
    const ci = Math.floor(blockOf(x) / 3), cj = Math.floor(blockOf(z) / 3), want = [];
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const k = (ci + a) + ',' + (cj + b); if (!this.chunks.has(k)) want.push([ci + a, cj + b, a * a + b * b]); }
    want.sort((p, q) => p[2] - q[2]);
    for (const [a, b] of want.slice(0, now ? 99 : 1)) this.make(a, b);
    for (const [k, c] of this.chunks) if (Math.max(Math.abs(c.ci - ci), Math.abs(c.cj - cj)) > 1) this.drop(k, c);
  }
  drop(k, c) {
    c.group.removeFromParent(); c.group.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
    for (const s of c.statics) this.st.kill(s); this.chunks.delete(k);
    const keep = (x) => x.chunk !== c; this.lots = this.lots.filter(keep); this.doors = this.doors.filter((d) => d.lot.chunk !== c); this.parked = this.parked.filter(keep); this.blocks = this.blocks.filter(keep); this.coins = this.coins.filter(keep); this.homes = this.homes.filter(keep); this.cams = this.cams.filter(keep);
  }
  make(ci, cj) {
    const c = { ci, cj, group: new THREE.Group(), statics: [], spots: [], lamps: [] }, inst = new Map(); this.chunks.set(ci + ',' + cj, c); this.L.root.add(c.group);
    const add = (model, t, shadow = true) => { if (!M[model]) return; const k = model + '|' + (shadow ? 1 : 0); let a = inst.get(k); if (!a) inst.set(k, (a = [])); a.push(t); };
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) this.block(ci * 3 + a, cj * 3 + b, c, add);
    for (const [k, list] of inst) { const [m, sh] = k.split('|'); instanced(m, list, c.group, sh === '1'); }
    // parked cars: drawn together, the one you take becomes a real car
    const groups = {}; for (const sp of c.spots) (groups[sp.n] = groups[sp.n] || []).push(sp);
    for (const [n, list] of Object.entries(groups)) {
      const key = W('car-kit', n); if (!M[key]) continue; const ins = instanced(key, list.map((sp) => ({ x: sp.x, y: 0, z: sp.z, s: CAR_S, ry: sp.ry })), c.group), b = bounds(key);
      list.forEach((sp, idx) => { const [x0, x1, z0, z1] = rotBox(b, CAR_S, sp.ry); this.parked.push({ n, x: sp.x, z: sp.z, ry: sp.ry, ins, idx, chunk: c, s: this.st.add(sp.x + x0 + 0.1, sp.x + x1 - 0.1, sp.z + z0 + 0.1, sp.z + z1 - 0.1, 2.2, true, 'car', c) }); });
    }
  }
  // one block: its own roads (north and west side), lights, ground and buildings
  block(i, j, c, add) {
    const st = this.st, seed = this.seed, rnd = rng(hash(i, j, seed)), type = blockType(i, j, seed), cx = R(i) + P / 2, cz = R(j) + P / 2;
    const blk = { i, j, cx, cz, type, chunk: c }; this.blocks.push(blk);
    const flat = (model, x, z, sx, sz, y = 0.012, ry = 0) => add(model, { x, y, z, sx, sy: 1, sz, ry }, false);
    const solid = (x0, x1, z0, z1, h, tag) => st.add(x0, x1, z0, z1, h, true, tag, c);
    const pole = (x, z) => solid(x - 0.25, x + 0.25, z - 0.25, z + 0.25, 6, 'pole');
    // roads: the crossing at the north-west corner, the road along the north side and the one along the west side
    const x0 = R(i), z0 = R(j);
    const e = roads(i, j), deg = e.filter(Boolean).length; let nt = CROSS, nry = 0;
    if (deg === 4) nt = isRoundabout(i, j) ? W('city-kit-roads', 'road-roundabout') : CROSS;
    else if (deg === 3) { nt = W('city-kit-roads', 'road-intersection-path'); nry = [-PI / 2, PI, PI / 2, 0][e.indexOf(false)]; }
    else if (e[0] && e[2]) { nt = ROAD; nry = 0; } else if (e[1] && e[3]) { nt = ROAD; nry = PI / 2; }
    else { nt = W('city-kit-roads', 'road-bend'); nry = e[2] && e[1] ? 0 : e[1] && e[0] ? PI / 2 : e[0] && e[3] ? PI : -PI / 2; }
    add(nt, { x: x0, y: 0.012, z: z0, sx: S, sy: 1, sz: S, ry: nry }, false);
    // a road left out becomes a green walkway with trees
    const walk = (horiz) => {
      const gx = horiz ? x0 + P / 2 : x0, gz = horiz ? z0 : z0 + P / 2;
      add('Cube_Grass_Single', { x: gx, y: -0.02, z: gz, sx: (horiz ? P - S : S) / 2 / 1.12, sy: 0.05, sz: (horiz ? S : P - S) / 2 / 1.12 }, false);
      flat('w/concrete', gx, gz, horiz ? P - S : 3, horiz ? 3 : P - S, 0.05);
      for (let u = -26; u <= 26; u += 13) for (const sd of [-4.5, 4.5]) { const tx = horiz ? gx + u : gx + sd, tz = horiz ? gz + sd : gz + u; tree(rnd() < 0.5 ? PTREE : PINE, tx, tz, rnd.range(4.5, 6)); }
      for (const u of [-19, 19]) bench(horiz ? gx + u : gx + 2.4, horiz ? gz + 2.4 : gz + u, horiz ? PI : -PI / 2);
    };
    for (let m = 0; m < 4; m++) { const p = 16 + m * 16; if (e[0]) add(ROAD, { x: x0 + p, y: 0.012, z: z0, sx: S, sy: 1, sz: S, ry: 0 }, false); if (e[1]) add(ROAD, { x: x0, y: 0.012, z: z0 + p, sx: S, sy: 1, sz: S, ry: PI / 2 }, false); }
    // street lights on both sides of those roads, traffic lights at the crossing (one per approach, on the driver's right)
    for (const f of [0.3, 0.7]) {
      const p = P * f;
      if (e[0]) { add(LIGHT, { x: x0 + p, y: 0, z: z0 - 7.3, s: 10, ry: PI }); pole(x0 + p, z0 - 7.3); add(LIGHT, { x: x0 + p, y: 0, z: z0 + 7.3, s: 10, ry: 0 }); pole(x0 + p, z0 + 7.3); c.lamps.push([x0 + p, z0 - 5.3], [x0 + p, z0 + 5.3]); }
      if (e[1]) { add(LIGHT, { x: x0 - 7.3, y: 0, z: z0 + p, s: 10, ry: -PI / 2 }); pole(x0 - 7.3, z0 + p); add(LIGHT, { x: x0 + 7.3, y: 0, z: z0 + p, s: 10, ry: PI / 2 }); pole(x0 + 7.3, z0 + p); c.lamps.push([x0 - 5.3, z0 + p], [x0 + 5.3, z0 + p]); }
    }
    if (deg >= 3) for (const [u, v, ry, k] of [[7.4, 7.4, PI / 2, 1], [7.4, -7.4, PI, 0], [-7.4, -7.4, -PI / 2, 3], [-7.4, 7.4, 0, 2]]) if (e[k]) { add(TL, { x: x0 + u, y: 0, z: z0 + v, s: 5.5, ry }); pole(x0 + u, z0 + v); }
    flat('w/concrete', cx, cz, P - S, P - S, 0.006);
    // clouds, high above the tallest tower
    if (rnd() < 0.5) add(rnd.pick(['Cloud_1', 'Cloud_2', 'Cloud_3']), { x: cx + rnd.range(-30, 30), y: rnd.range(110, 160), z: cz + rnd.range(-30, 30), s: rnd.range(6, 11), ry: rnd() * 6 }, false);
    const tree = (model, x, z, s) => { add(model, { x, y: 0, z, s, ry: rnd() * 6 }); solid(x - 0.5, x + 0.5, z - 0.5, z + 0.5, 5, 'tree'); };
    const bench = (x, z, ry) => { add(BENCH, { x, y: 0, z, s: 2.8, ry }); const k = Math.abs(Math.sin(ry)) > 0.5; solid(x - (k ? 0.5 : 0.9), x + (k ? 0.5 : 0.9), z - (k ? 0.9 : 0.5), z + (k ? 0.9 : 0.5), 1.2, 'bench'); };
    if (!e[0]) walk(true); if (!e[1]) walk(false);
    const role = blockRole(i, j, seed, type), lots = [];
    // a building in a cell, its front on the cell's outer edge (minus a setback), centred along it
    const building = (model, x, z, cell, face, scale, setback, kind) => {
      model = variant(model, Math.floor(rnd() * (kind === 'home' ? 6 : 4))); scale *= rnd.range(0.85, 1.12);
      const [ry, nx, nz] = FACE[face], b = bounds(model), raw = rotBox(b, 1, ry), fit = Math.min(scale, (cell - setback - 1.5) / Math.max(raw[1] - raw[0], raw[3] - raw[2]));
      const [bx0, bx1, bz0, bz1] = rotBox(b, fit, ry), half = cell / 2;
      let px = x - (bx0 + bx1) / 2, pz = z - (bz0 + bz1) / 2;
      if (nz > 0) pz = z + half - setback - bz1; else if (nz < 0) pz = z - half + setback - bz0; else if (nx > 0) px = x + half - setback - bx1; else px = x - half + setback - bx0;
      add(model, { x: px, y: 0, z: pz, s: fit, ry });
      const box = [px + bx0, px + bx1, pz + bz0, pz + bz1], h = b.max.y * fit; solid(box[0] + 0.15, box[1] - 0.15, box[2] + 0.15, box[3] - 0.15, h, 'building');
      const fx_ = nx ? (nx > 0 ? box[1] : box[0]) : (box[0] + box[1]) / 2, fz = nz ? (nz > 0 ? box[3] : box[2]) : (box[2] + box[3]) / 2;
      const lot = { id: `${i}_${j}_${lots.length}`, x: px, z: pz, ry, nx, nz, kind, box, h, i, j, block: blk, chunk: c };
      lot.door = { x: fx_ + nx * 1.6, z: fz + nz * 1.6, lot }; lots.push(lot); return lot;
    };
    const spot = (x, z, ry, fill, truck) => { if (rnd() < fill) c.spots.push({ x, z, ry, n: truck ? rnd.pick(['truck', 'truck-flat', 'delivery']) : rnd.pick(PARKED) }); };
    const parking = (px, pz, w, d, fill, alongX = true) => {
      flat('w/asphalt', px, pz, w, d, 0.014);
      const rows = Math.floor((alongX ? d : w) / 19.5) || 1, len = alongX ? w : d, bays = Math.floor((len - 2) / 4);
      for (let r = 0; r < rows; r++) for (const side of [-1, 1]) {
        const c0 = (alongX ? pz : px) - (alongX ? d : w) / 2 + r * 19.5 + 9.75 + side * 6.5;
        for (let k = 0; k < bays; k++) {
          const u = (alongX ? px : pz) - len / 2 + 1 + k * 4 + 2, x = alongX ? u : c0, z = alongX ? c0 : u, ry = alongX ? (side < 0 ? 0 : PI) : (side < 0 ? PI / 2 : -PI / 2);
          flat('w/paint', alongX ? u - 2 : c0, alongX ? c0 : u - 2, alongX ? 0.15 : 5.6, alongX ? 5.6 : 0.15, 0.03); spot(x, z, ry, fill, false);
        }
      }
    };
    if (type === 'downtown' || type === 'commercial') {
      const cell = (LAND * 2) / 3;
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
        const x = cx - LAND + cell * (a + 0.5), z = cz - LAND + cell * (b + 0.5);
        if (a === 1 && b === 1) {
          if (type === 'commercial' || (i + j) % 2) parking(x, z, cell - 1, cell - 1, 0.5);
          else { for (const [u, v] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) tree(PTREE, x + u, z + v, 5.5); for (const [u, v, r] of [[0, -3, 0], [0, 3, PI], [-3, 0, PI / 2], [3, 0, -PI / 2]]) bench(x + u, z + v, r); }
          continue;
        }
        const face = b === 0 ? 'N' : b === 2 ? 'S' : a === 0 ? 'W' : 'E';
        building(type === 'downtown' ? (rnd() < 0.6 ? rnd.pick(TOW) : rnd.pick(COM.slice(10))) : rnd.pick(COM), x, z, cell, face, 10, 1, 'shop');
      }
    } else if (type === 'suburb' || type === 'industrial') {
      const cell = LAND, sub = type === 'suburb';
      if (sub) add('Cube_Grass_Single', { x: cx, y: -0.02, z: cz, sx: LAND / 1.12, sy: 0.05, sz: LAND / 1.12 }, false);
      for (const [a, b, face] of [[0, 0, 'W'], [1, 0, 'N'], [1, 1, 'E'], [0, 1, 'S']]) {
        const x = cx - LAND + cell * (a + 0.5), z = cz - LAND + cell * (b + 0.5);
        const lot = building(rnd.pick(sub ? SUB : IND), x, z, cell, face, sub ? 8.5 : 9, sub ? rnd.range(5, 9) : 4, sub ? 'home' : 'factory');
        const [ry, nx, nz] = FACE[face], px = -nz, pz = nx; // px, pz: along the street
        // a driveway (and a car on it) beside the house, or a yard with a truck by the factory
        const w0 = nx ? lot.box[2] : lot.box[0], w1 = nx ? lot.box[3] : lot.box[1], c0 = nx ? z : x, room0 = w0 - (c0 - cell / 2), room1 = c0 + cell / 2 - w1;
        const side = room1 > room0 ? 1 : -1, room = Math.max(room0, room1);
        if (room > 4.6 && !sub) {
          const u = side > 0 ? w1 + room / 2 : w0 - room / 2, edge = nx ? x + nx * cell / 2 : z + nz * cell / 2, len = 13;
          spot(nx ? edge - nx * len / 2 : u, nx ? u : edge - nz * len / 2, ry + PI, 0.8, true);
        }
        const bx = x - nx * (cell / 2 - 3.5) - px * (cell / 2 - 3.5) * side, bz = z - nz * (cell / 2 - 3.5) - pz * (cell / 2 - 3.5) * side;
        if (sub) { lot.home = true; if (!st.inside(bx, bz, 1.5)) tree(rnd() < 0.5 ? TREE : TREE2, bx, bz, 9); }
        else {
          if (!st.inside(bx, bz, 3)) { const m = rnd.pick(['chimney-large', 'detail-tank', 'chimney-medium']); add(W('city-kit-industrial', m), { x: bx, y: 0, z: bz, s: 7, ry: 0 }); solid(bx - 2.5, bx + 2.5, bz - 2.5, bz + 2.5, 8, 'building'); }
          const dx = lot.door.x + px * 3 * side, dz = lot.door.z + pz * 3 * side; if (!st.inside(dx, dz, 1.4)) { add(DUMP, { x: dx, y: 0, z: dz, s: 4, ry }); solid(dx - 1.3, dx + 1.3, dz - 1.3, dz + 1.3, 2.2, 'dump'); }
        }
      }
      if (sub) { // fences between the gardens
        const F = W('city-kit-suburban', 'fence'), fl = 0.48 * 9;
        for (let u = -LAND + fl / 2; u < LAND; u += fl) { add(F, { x: cx + u, y: 0, z: cz, s: 9, ry: 0 }, false); add(F, { x: cx, y: 0, z: cz + u, s: 9, ry: PI / 2 }, false); }
        solid(cx - LAND, cx + LAND, cz - 0.25, cz + 0.25, 2.2, 'fence'); solid(cx - 0.25, cx + 0.25, cz - LAND, cz + LAND, 2.2, 'fence');
      }
    } else if (type === 'parking') {
      parking(cx, cz, LAND * 2 - 2, LAND * 2 - 2, 0.55, j % 2 === 0);
    } else if (type === 'park') {
      add('Cube_Grass_Single', { x: cx, y: -0.02, z: cz, sx: LAND / 1.12, sy: 0.05, sz: LAND / 1.12 }, false);
      flat('w/concrete', cx, cz, 5, LAND * 2, 0.05); flat('w/concrete', cx, cz, LAND * 2, 5, 0.05);
      for (let k = 0; k < 26; k++) { const x = cx + rnd.range(-26, 26), z = cz + rnd.range(-26, 26); if (Math.abs(x - cx) < 5 || Math.abs(z - cz) < 5 || st.inside(x, z, 3)) continue; tree(rnd() < 0.6 ? PTREE : PINE, x, z, rnd.range(5, 7)); }
      for (const [u, v, r] of [[-3.6, -14, PI / 2], [3.6, -14, -PI / 2], [-3.6, 14, PI / 2], [3.6, 14, -PI / 2], [-14, -3.6, 0], [-14, 3.6, PI], [14, -3.6, 0], [14, 3.6, PI]]) bench(cx + u, cz + v, r);
      if (i === 3 && j === 3) { this.statue = { x: cx, z: cz }; solid(cx - 2.2, cx + 2.2, cz - 2.2, cz + 2.2, 3, 'statue'); }
    }
    // the block's job (shop, police, gym...) goes into the building whose door is nearest the city centre
    if (role && lots.length) { const shops = lots.filter((l) => l.kind === 'shop'); const l = (shops.length ? shops : lots).reduce((a, b) => (Math.hypot(a.door.x, a.door.z) < Math.hypot(b.door.x, b.door.z) ? a : b)); l.role = role; l.home = false; this.roleDoors[role] = this.roleDoors[role] || l.door; }
    for (const l of lots) {
      if (l.role || (l.kind === 'shop' && rnd() < 0.15)) this.cams.push({ x: l.door.x, z: l.door.z, y: 4, a: Math.atan2(l.nx, l.nz), chunk: c });
      if (l.home) { const forSale = rnd() < 0.35; l.home = { id: `${this.nat}:h${l.id}`, price: forSale ? rnd.pick([6000, 9000, 14000]) : 0, furnished: rnd() < 0.5, owner: forSale ? null : 'npc', unlocked: !forSale && rnd() < 0.25 }; this.homes.push(l); if (forSale) add(W('city-kit-suburban', 'planter'), { x: l.door.x + l.nz * 2.5, y: 0, z: l.door.z + l.nx * 2.5, s: 3, ry: 0 }); }
      this.lots.push(l); this.doors.push(l.door);
    }
    // a hidden golden coin in some blocks: find them all
    if (rnd() < 0.35) { const x = cx + rnd.range(-26, 26), z = cz + rnd.range(-26, 26); if (!st.inside(x, z, 1.2)) this.coins.push({ id: `${i}_${j}`, x, z, chunk: c }); }
  }
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
  // move in small steps so a fast car can never jump through a thin wall or a pole
  const steps = Math.max(1, Math.ceil(Math.abs(c.v * dt) / 0.4)); let crash = 0;
  for (let n = 0; n < steps; n++) {
    const fx_ = Math.sin(c.h), fz = Math.cos(c.h); c.x += fx_ * c.v * dt / steps; c.z += fz * c.v * dt / steps;
    const off = c.hl - c.hw;
    for (const k of [-1, -0.5, 0, 0.5, 1]) {
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
  }
  if (crash > 7) c.v = -Math.sign(c.v || 1) * Math.min(3, crash * 0.15);
  return crash;
}

// ---------------------------------------------------------------- traffic
const TRAFFIC = ['sedan', 'sedan', 'suv', 'van', 'taxi', 'taxi', 'hatchback-sports', 'sedan-sports', 'suv-luxury', 'truck', 'delivery', 'garbage-truck', 'ambulance'];
// traffic lights: 16 s cycle, east-west green for 7 s, all red, north-south green for 7 s, all red
export function green(a, b, d, t) { if (roads(a, b).filter(Boolean).length < 3) return true; const u = (t + ((((a * 3 + b * 5) % 4) + 4) % 4) * 4) % 16; return d % 2 === 0 ? u < 7 : u >= 8 && u < 15; }

export class Traffic {
  constructor(L, st, count) { this.L = L; this.st = st; this.cars = []; this.t = 0; for (let k = 0; k < count; k++) this.cars.push(this.make(TRAFFIC[k % TRAFFIC.length])); }
  make(n) { const o = place(W('car-kit', n), 0, -50, 0, CAR_S, 0, this.L.root), { hw, hl } = carSize(n); const body = this.L.kin(new CANNON.Box(new CANNON.Vec3(hw, 1, hl)), 0, -50, 0, 'car'); return { o, n, hw, hl, body, x: 0, z: -9999, h: 0, v: 0, live: false }; }
  posOn(c) { const [dx, dz] = DIRS[c.d], [rx, rz] = rt(c.d), lane = LANE + (c.pull || 0); return [R(c.a) + dx * c.s + rx * lane, R(c.b) + dz * c.s + rz * lane]; }
  spawn(c, px, pz, minD, maxD) {
    const na = nodeOf(px), nb = nodeOf(pz);
    for (let tries = 0; tries < 40; tries++) {
      const a = na + Math.floor(Math.random() * 7) - 3, b = nb + Math.floor(Math.random() * 7) - 3, d = Math.floor(Math.random() * 4);
      if (!segOK(a, b, d)) continue;
      Object.assign(c, { a, b, d, s: 12 + Math.random() * 50, turn: null, v: 6, pull: 0, stuck: 0 });
      const [x, z] = this.posOn(c), dd = Math.hypot(x - px, z - pz);
      if (dd < minD || dd > maxD || this.cars.some((o) => o !== c && o.live && Math.hypot(o.x - x, o.z - z) < 14)) continue;
      c.x = x; c.z = z; c.h = Math.atan2(DIRS[d][0], DIRS[d][1]); c.live = true; return true;
    }
    c.live = false; c.o.position.y = -50; c.body.position.set(0, -50, 0); return false;
  }
  startTurn(c) {
    const ax = R(c.a) + DIRS[c.d][0] * P, bz = R(c.b) + DIRS[c.d][1] * P, a2 = c.a + DIRS[c.d][0], b2 = c.b + DIRS[c.d][1];
    const opts = [c.d, (c.d + 1) % 4].filter((d) => segOK(a2, b2, d)); // straight on or turn right (no turning across the traffic)
    const d2 = opts.length ? (opts.length > 1 && Math.random() > 0.65 ? opts[1] : opts[0]) : (c.d + 3) % 4;
    const [dx, dz] = DIRS[c.d], [ex, ez] = DIRS[d2], [rx, rz] = rt(c.d), [sx, sz] = rt(d2);
    const p0 = [ax - dx * 10 + rx * LANE, bz - dz * 10 + rz * LANE], p2 = [ax + ex * 10 + sx * LANE, bz + ez * 10 + sz * LANE];
    const p1 = d2 === c.d ? [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2] : [ax + rx * LANE + sx * LANE, bz + rz * LANE + sz * LANE];
    let len = 0, q = p0; for (let i = 1; i <= 8; i++) { const w = this.bez(p0, p1, p2, i / 8); len += Math.hypot(w[0] - q[0], w[1] - q[1]); q = w; }
    c.turn = { p0, p1, p2, u: 0, len, a2, b2, d2 };
  }
  bez(p0, p1, p2, u) { const k = 1 - u; return [k * k * p0[0] + 2 * k * u * p1[0] + u * u * p2[0], k * k * p0[1] + 2 * k * u * p1[1] + u * u * p2[1]]; }
  update(dt, t, p, movers, onFoot, police) {
    for (const c of this.cars) {
      if (!c.live) { this.spawn(c, p.x, p.z, 70, 220); continue; }
      const dist = Math.hypot(c.x - p.x, c.z - p.z); if (dist > 260) { this.spawn(c, p.x, p.z, 90, 220); continue; }
      const fx_ = Math.sin(c.h), fz = Math.cos(c.h); let want = 11;
      // stop behind other cars, and for people standing in front
      for (const o of movers) {
        if (o === c) continue; const rx = o.x - c.x, rz = o.z - c.z, along = rx * fx_ + rz * fz; if (along <= 0 || along > 22) continue;
        const lat = Math.abs(rx * fz - rz * fx_); if (lat < c.hw + (o.hw || 0.5) + 0.6) want = Math.min(want, Math.max(0, along - c.hl - (o.hl || 0.5) - 2) * 1.4);
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
      if (c.v < 0.3 && want < 0.3) { c.stuck += dt; if (c.stuck > 25 && dist > 50) { this.spawn(c, p.x, p.z, 90, 220); continue; } } else c.stuck = 0;
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
  remove(c) { c.live = false; this.cars.splice(this.cars.indexOf(c), 1); c.body.position.set(0, -50, 0); }
}

// ---------------------------------------------------------------- people walking around the blocks
// They walk the pavements, step aside or stumble back when you bump into them, fall over when you hit them (and
// get up again), run away when they see trouble, sometimes hit you back, and stop to talk and wave.
const ANIM = { walk: 'Walk', run: 'Run', idle: 'Idle', hit: 'HitReact', down: 'Death', wave: 'Wave', no: 'No', yes: 'Yes', punch: 'Punch', duck: 'Duck' };
export class Walkers {
  constructor(city, list) {
    this.city = city; this.list = list; this.onPunch = null;
    for (const n of list) {
      n.acts = {}; for (const [k, name] of Object.entries(ANIM)) { const c = n.clips?.find((a) => a.name.endsWith('|' + name)); if (c) { const a = n.mixer.clipAction(c); if (k === 'down' || k === 'hit' || k === 'punch' || k === 'wave' || k === 'no' || k === 'yes') { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; } n.acts[k] = a; } }
      n.state = 'walk'; n.cur = null; this.play(n, 'walk');
    }
  }
  play(n, k, fade = 0.2) { const a = n.acts[k]; if (!a || n.cur === a) return; a.reset().play(); if (n.cur) n.cur.crossFadeTo(a, fade, false); n.cur = a; }
  place(n, px, pz, far) {
    const near = this.city.blocks.filter((b) => { const d = Math.hypot(b.cx - px, b.cz - pz); return d < 150 && (!far || d > 70); });
    const b = near[Math.floor(Math.random() * near.length)] || this.city.blocks[0]; if (!b) return;
    Object.assign(n, { cx: b.cx, cz: b.cz, hs: 30.9 + (Math.random() - 0.5) * 1.6, d: Math.random(), dir: Math.random() < 0.5 ? 1 : -1, state: 'walk', t: 0 });
    n.o.rotation.x = 0; n.o.position.y = 0; this.play(n, 'walk', 0);
  }
  path(n) {
    const s = ((n.d % 1) + 1) % 1 * 4, side = Math.floor(s), f = s - side, h = n.hs, a = -h + f * h * 2;
    const [x, z, ry] = side === 0 ? [a, -h, PI / 2] : side === 1 ? [h, a, 0] : side === 2 ? [-a, h, -PI / 2] : [-h, -a, PI];
    return [n.cx + x, n.cz + z, n.dir > 0 ? ry : ry + PI];
  }
  // free movement (off the pavement loop), pushed out of walls
  move(n, vx, vz, dt) { n.x += vx * dt; n.z += vz * dt; const r = this.city.st.resolve(n.x, n.z, 0.45); if (r) { n.x += r.x; n.z += r.z; } if (Math.abs(vx) + Math.abs(vz) > 0.1) n.face = Math.atan2(vx, vz); }
  off(n, state, t) { if (n.state === 'walk') { n.x = n.o.position.x; n.z = n.o.position.z; } n.state = state; n.t = t; }
  // what can happen to them
  bump(n, dx, dz, hard) { if (n.state === 'down') return; this.off(n, 'react', hard ? 0.9 : 0.6); const k = hard ? 4.5 : 2.2; n.vx = dx * k; n.vz = dz * k; n.face = Math.atan2(-dx, -dz); this.play(n, hard ? 'hit' : 'no', 0.1); }
  hit(n, dx, dz, power = 1) { if (n.state === 'down') return; this.off(n, 'down', 3.2 + Math.random() * 1.5); n.vx = dx * 7 * power; n.vz = dz * 7 * power; n.face = Math.atan2(-dx, -dz); n.angry = Math.random() < 0.25; this.play(n, 'down', 0.08); fx.burst(n.o.position.clone().setY(1), 0xffffff, 10, 5); }
  knock(n, dx, dz) { this.hit(n, dx, dz, 1.6); }
  scare(x, z, r) { for (const n of this.list) if (n.state === 'walk' || n.state === 'talk') { const d = Math.hypot(n.o.position.x - x, n.o.position.z - z); if (d < r && d > 0.5) { this.off(n, 'flee', 4 + Math.random() * 3); n.from = [x, z]; this.play(n, 'run', 0.15); } } }
  talk(n, px, pz) { if (n.state !== 'walk' && n.state !== 'return') return false; this.off(n, 'talk', 2.6); n.face = Math.atan2(px - n.x, pz - n.z); this.play(n, Math.random() < 0.6 ? 'wave' : 'yes', 0.2); return true; }
  nearest(x, z, r) { let best = null, bd = r; for (const n of this.list) { if (n.cx === undefined) continue; const d = Math.hypot(n.o.position.x - x, n.o.position.z - z); if (d < bd) { bd = d; best = n; } } return best; }
  update(dt, p, player, pv) {
    for (const n of this.list) {
      if (n.cx === undefined || Math.hypot(n.o.position.x - p.x, n.o.position.z - p.z) > 170) { this.place(n, p.x, p.z, n.cx !== undefined); if (n.cx === undefined) continue; }
      n.mixer.update(dt); n.t -= dt;
      const dxp = player ? n.o.position.x - player.x : 99, dzp = player ? n.o.position.z - player.z : 99, dp = Math.hypot(dxp, dzp) || 1;
      if (n.state === 'walk') {
        // you walk into them: they step back (and stumble if you were running)
        if (player && dp < 0.85) { const fast = Math.hypot(pv?.x || 0, pv?.z || 0) > 6; this.bump(n, dxp / dp, dzp / dp, fast); continue; }
        const blocked = player && dp < 1.6;
        if (!blocked) { n.d += n.dir * n.sp * dt / (n.hs * 8); this.play(n, 'walk'); } else this.play(n, 'idle');
        const [X, Z, ry] = this.path(n); n.o.position.set(X, 0, Z); n.o.rotation.y = blocked ? Math.atan2(-dxp, -dzp) : ry; continue;
      }
      if (n.state === 'react') { this.move(n, n.vx, n.vz, dt); n.vx *= Math.exp(-dt * 5); n.vz *= Math.exp(-dt * 5); if (n.t <= 0) { n.state = 'return'; this.play(n, 'walk'); } }
      else if (n.state === 'down') {
        this.move(n, n.vx, n.vz, dt); n.vx *= Math.exp(-dt * 4); n.vz *= Math.exp(-dt * 4);
        if (n.t <= 0) { n.state = 'getup'; n.t = 0.7; this.play(n, 'idle', 0.5); }
      } else if (n.state === 'getup') { if (n.t <= 0) { if (n.angry && player) { n.state = 'fight'; n.t = 7; this.play(n, 'run'); } else { n.state = 'flee'; n.t = 4; n.from = player ? [player.x, player.z] : [n.x, n.z]; this.play(n, 'run'); } } }
      else if (n.state === 'flee') { const fx_ = n.x - n.from[0], fz = n.z - n.from[1], l = Math.hypot(fx_, fz) || 1; this.move(n, fx_ / l * 5.2, fz / l * 5.2, dt); if (n.t <= 0) { n.state = 'return'; this.play(n, 'walk'); } }
      else if (n.state === 'fight') {
        if (!player || n.t <= 0) { n.state = 'return'; this.play(n, 'walk'); }
        else if (dp > 1.3) { this.move(n, -dxp / dp * 4.6, -dzp / dp * 4.6, dt); this.play(n, 'run'); }
        else { n.face = Math.atan2(-dxp, -dzp); n.hitCd = (n.hitCd || 0) - dt; if (n.hitCd <= 0) { n.hitCd = 1.1; n.cur = null; this.play(n, 'punch', 0.05); setTimeout(() => { if (n.state === 'fight' && this.onPunch) this.onPunch(n); }, 280); } }
      } else if (n.state === 'talk') { if (n.t <= 0) { n.state = 'return'; this.play(n, 'walk'); } }
      else if (n.state === 'return') {
        const [X, Z] = this.path(n), rx = X - n.x, rz = Z - n.z, l = Math.hypot(rx, rz);
        if (l < 0.4) n.state = 'walk'; else { this.move(n, rx / l * 1.6, rz / l * 1.6, dt); this.play(n, 'walk'); }
      }
      n.o.position.set(n.x, 0, n.z); n.o.rotation.y = n.face ?? n.o.rotation.y; n.o.rotation.x = 0;
    }
  }
}

// ---------------------------------------------------------------- minimap (top left, turns with the camera)
const BLOCK_COL = { downtown: '#9aa0ab', commercial: '#b0b4bc', suburb: '#7fbf6e', industrial: '#a89f8f', park: '#3f8f45', parking: '#6d717c' };
export class Minimap {
  constructor(city) {
    this.city = city; const el = document.createElement('canvas'); el.id = 'miniMap'; el.width = el.height = 240;
    Object.assign(el.style, { position: 'fixed', left: '14px', top: '112px', width: '120px', height: '120px', borderRadius: '50%', border: '3px solid rgba(255,255,255,.85)', boxShadow: '0 3px 10px rgba(0,0,0,.35)', zIndex: 5, pointerEvents: 'none', background: '#e9e9ee' });
    document.body.appendChild(el); this.el = el; this.g = el.getContext('2d'); this.t = 0;
  }
  draw(dt, p, yaw, marks) {
    this.t -= dt; if (this.t > 0) return; this.t = 0.08;
    const g = this.g, Z = 0.75; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#7fbf6e'; g.fillRect(0, 0, 240, 240);
    g.save(); g.translate(120, 120); g.rotate(yaw); g.scale(Z, Z); g.translate(-p.x, -p.z);
    for (const b of this.city.blocks) if (Math.abs(b.cx - p.x) < 260 && Math.abs(b.cz - p.z) < 260) { g.fillStyle = BLOCK_COL[b.type]; g.fillRect(b.cx - 33, b.cz - 33, 66, 66); }
    const na = nodeOf(p.x), nb = nodeOf(p.z); g.fillStyle = '#eef0f4';
    for (let a = na - 3; a <= na + 3; a++) for (let b = nb - 3; b <= nb + 3; b++) { g.fillRect(R(a) - 8, R(b) - 8, 16, 16); if (segOK(a, b, 0)) g.fillRect(R(a), R(b) - 8, P, 16); if (segOK(a, b, 1)) g.fillRect(R(a) - 8, R(b), 16, P); }
    g.fillStyle = '#4b505c'; for (const l of this.city.lots) if (Math.abs(l.x - p.x) < 220 && Math.abs(l.z - p.z) < 220) g.fillRect(l.box[0], l.box[2], l.box[1] - l.box[0], l.box[3] - l.box[2]);
    g.restore();
    const dot = (x, z, color, r) => { const dx = (x - p.x) * Z, dz = (z - p.z) * Z, c = Math.cos(yaw), s = Math.sin(yaw); let u = dx * c - dz * s, v = dx * s + dz * c; const l = Math.hypot(u, v); if (l > 108) { u *= 108 / l; v *= 108 / l; } g.fillStyle = color; g.beginPath(); g.arc(120 + u, 120 + v, r, 0, PI * 2); g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke(); };
    for (const m of marks) dot(m.x, m.z, m.c, m.r || 9);
    // you: an arrow pointing where you face
    const a = -p.facing + yaw + PI; g.save(); g.translate(120, 120); g.rotate(a); g.fillStyle = '#ffd23f'; g.strokeStyle = '#222'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -16); g.lineTo(11, 12); g.lineTo(0, 6); g.lineTo(-11, 12); g.closePath(); g.fill(); g.stroke(); g.restore();
  }
  show(on) { this.el.style.display = on ? '' : 'none'; }
  dispose() { this.el.remove(); }
}
