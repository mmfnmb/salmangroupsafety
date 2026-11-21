// The lab: three floors on a 4 m grid. Walls, floors and ceilings are built from real scanned PBR materials
// (Poly Haven), merged per floor so phones can draw them; doors are heavy metal sliders with wall buttons.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { load } from './assets.js';

export const C = 4, WH = 3.4, FLOOR_Y = [0, -14, -28], SC = 1;
// a maze of corridors with dead ends; rooms open onto the halls through doors placed automatically below
export const MAPS = [
  ['####################', '#KKK#SSSS#H#III#EEE#', '#KKK#SSSS#H#III#EEE#', '#HHHHHHHHHHHHHHHHHH#', '#H#CCC#TTTTTT#H#OOO#', '#H#CCC#TTTTTT#H#OOO#', '#H#CCC#TTTTTT#HHHHH#',
   '#HHHHH#TTTTTT#H#YYY#', '#H###H#TTTTTT#H#YYY#', '#H#MMMHHHH#XXX#HHHH#', '#H#MMMH##H#XXX#H#BB#', '#H#MMMH##HHHHHHH#BB#', '#HHHHHHHHHHHHHHHHHH#', '####################'],
  ['####################', '#EEE#WWWWWWW#VVVVV##', '#EEE#WWWWWWW#VVVVV##', '#HHHHHHHHHHHHHHHHHH#', '#H#KKK#H#PPPPP#H#LL#', '#H#KKK#H#PPPPP#H#LL#', '#H#KKK#H#PPPPP#HHHH#',
   '#H###HHH#####HHH#DD#', '#H#AAAA#GGGGGG#H#DD#', '#H#AAAA#GGGGGG#HHHH#', '#HHHHHHH######HHHHH#', '####################'],
  ['####################', '#EEE#ZZZZZZZ#UUUUU##', '#EEE#ZZZZZZZ#UUUUU##', '#HHHHHHHHHHHHHHHHHH#', '#H#QQQ#H######H#RRR#', '#H#QQQ#HHHHHHHH#RRR#', '#H#QQQ#H######H#RRR#',
   '#HHHHHHH#HHHHHHHHHH#', '#H######H###########', '#HHHHHHHHHHHFFFFFFFF', '####################'],
];
// sections: each floor is split into wings with their own floor stripe colour and hanging signs
export const SECTIONS = [
  [{ x0: 0, x1: 6, id: 'A', name: 'WEST WING', col: 0xc8a032 }, { x0: 7, x1: 13, id: 'B', name: 'SPECIMEN WING', col: 0x2fa58a }, { x0: 14, x1: 19, id: 'C', name: 'ADMIN WING', col: 0xb03030 }],
  [{ x0: 0, x1: 7, id: 'D', name: 'STORES', col: 0xc8a032 }, { x0: 8, x1: 13, id: 'E', name: 'POWER', col: 0x3a70c0 }, { x0: 14, x1: 19, id: 'F', name: 'MEDICAL', col: 0x2fa58a }],
  [{ x0: 0, x1: 6, id: 'G', name: 'CONTROL', col: 0x3a70c0 }, { x0: 7, x1: 11, id: 'H', name: 'CONTAINMENT', col: 0xb03030 }, { x0: 12, x1: 19, id: 'X', name: 'EXIT TUNNEL', col: 0xc8a032 }],
];
export const sectionAt = (f, x) => SECTIONS[f].find((s) => x >= s.x0 && x <= s.x1) || SECTIONS[f][0];
const LOCKS = { '0E': 'green', '1G': 'valves', '2F': 'exit' };
// one door per room (two for big rooms), on contacts with the halls; locked rooms get exactly one
function autoDoors() { const out = [];
  MAPS.forEach((M, f) => { const rooms = [...new Set(M.join('').replace(/[#H]/g, ''))];
    for (const c of rooms) { const con = []; M.forEach((r, z) => [...r].forEach((ch, x) => { if (ch !== c) return; for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if ((M[z + dz] || '')[x + dx] === 'H') con.push([x, z, x + dx, z + dz]); }));
      if (!con.length) continue; const lock = LOCKS[f + c]; const cells = M.join('').split(c).length - 1;
      const picks = lock || cells < 8 || con.length < 3 ? [con[(con.length / 2) | 0]] : [con[0], con[con.length - 1]];
      for (const d of picks) out.push([f, ...d, lock]); } });
  return out; }
const DOORS = autoDoors();
export const cellAt = (f, x, z) => { const r = MAPS[f][z]; return r && r[x] ? r[x] : '#'; };
export const toCell = (v) => Math.floor(v / C);
export const cellCenter = (x, z) => [x * C + C / 2, z * C + C / 2];
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// real materials (Poly Haven scans) taken from small material carrier files
const MATS = {};
export async function material(name, repeat = 1, opts = {}) {
  const key = name + repeat + JSON.stringify(opts); if (MATS[key]) return MATS[key];
  const g = await load('mat/' + name + '.glb'); let m = null; if (g) g.scene.traverse((o) => { if (!m && o.isMesh) m = o.material; });
  const mat = m ? m.clone() : new THREE.MeshStandardMaterial({ color: 0x777777 });
  for (const k of ['map', 'normalMap', 'roughnessMap', 'aoMap', 'metalnessMap']) if (mat[k]) { mat[k] = mat[k].clone(); mat[k].wrapS = mat[k].wrapT = THREE.RepeatWrapping; mat[k].needsUpdate = true; }
  mat.userData.repeat = repeat; if (opts.color) mat.color = new THREE.Color(opts.color); if (opts.rough != null) mat.roughness = opts.rough; mat.side = THREE.FrontSide;
  return (MATS[key] = mat);
}
// a box with UVs in metres (so textures keep their real size on any wall length)
export function boxGeo(w, h, d, scale = 1) {
  const g = new THREE.BoxGeometry(w, h, d); const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)); let u, v;
    if (ay > 0.5) { u = p.getX(i); v = p.getZ(i); } else if (ax > 0.5) { u = p.getZ(i); v = p.getY(i); } else { u = p.getX(i); v = p.getY(i); }
    uv.setXY(i, u / scale, v / scale); }
  return g;
}
function place(g, x, y, z, ry = 0) { g.rotateY(ry); g.translate(x, y, z); return g; }

export class World {
  constructor(scene, low) { this.scene = scene; this.low = low; this.boxes = [[], [], []]; this.doors = []; this.inter = []; this.anchors = [[], [], []]; this.slots = {}; this.lockers = []; this.groups = []; this.switches = []; }
  doorOn(f, x1, z1, x2, z2) { return this.doors.find((d) => d.f === f && ((d.a[0] === x1 && d.a[1] === z1 && d.b[0] === x2 && d.b[1] === z2) || (d.a[0] === x2 && d.a[1] === z2 && d.b[0] === x1 && d.b[1] === z1))); }

  async build(rand) {
    const M = {
      wall: await material('plastered_wall_02', 2.5), band: await material('painted_concrete', 2, { color: 0x6f8a8a }), floor: await material('concrete_floor_worn_001', 3),
      ceil: await material('Concrete049', 3, { color: 0xbababa }), door: await material('metal_plate', 1.5, { color: 0x9aa3a8 }), frame: await material('rusty_metal_02', 1.2, { color: 0x6b6f72 }),
      tile: await material('painted_concrete', 1, { color: 0xd8dcd6 }),
    };
    this.M = M;
    for (const d of DOORS) this.doors.push({ f: d[0], a: [d[1], d[2]], b: [d[3], d[4]], lock: d[5] || null, open: 0, target: 0, obj: null, id: 'd' + this.doors.length, jam: 0 });
    const doorW = 1.5, doorH = 2.5;
    for (let f = 0; f < 3; f++) {
      const grp = new THREE.Group(); grp.position.y = FLOOR_Y[f]; this.scene.add(grp); this.groups.push(grp);
      const geo = { wall: [], band: [], floor: [], ceil: [], frame: [] };
      MAPS[f].forEach((row, z) => [...row].forEach((c, x) => {
        if (c === '#') return; const [cx, cz] = cellCenter(x, z);
        geo.floor.push(place(boxGeo(C, 0.1, C, 3), cx, -0.05, cz)); geo.ceil.push(place(boxGeo(C, 0.1, C, 3), cx, WH + 0.05, cz));
        for (const [dx, dz] of DIRS) {
          const n = cellAt(f, x + dx, z + dz); if (n === c) continue;
          const ry = Math.atan2(dx, dz), ex = cx + dx * C / 2, ez = cz + dz * C / 2, inset = 0.15;
          const door = n !== '#' ? this.doorOn(f, x, z, x + dx, z + dz) : null;
          const segs = door ? [[-C / 2, -doorW / 2], [doorW / 2, C / 2]] : [[-C / 2, C / 2]];
          for (const [a, b] of segs) { const len = b - a, mid = (a + b) / 2, px = ex - dx * inset + Math.cos(ry) * mid, pz = ez - dz * inset - Math.sin(ry) * mid;
            geo.wall.push(place(boxGeo(len, WH - 1.1, 0.3, 2.5), px, 1.1 + (WH - 1.1) / 2, pz, ry)); geo.band.push(place(boxGeo(len, 1.1, 0.32, 2), px, 0.55, pz, ry));
            this.addBox(f, ex - dx * inset + Math.cos(ry) * mid, ez - dz * inset - Math.sin(ry) * mid, Math.abs(dz) ? len : 0.34, Math.abs(dx) ? len : 0.34); }
          if (door) { // header above the door, and a steel frame
            geo.wall.push(place(boxGeo(doorW, WH - doorH, 0.3, 2.5), ex - dx * inset, doorH + (WH - doorH) / 2, ez - dz * inset, ry));
            geo.frame.push(place(boxGeo(doorW + 0.24, 0.12, 0.36), ex - dx * inset, doorH + 0.06, ez - dz * inset, ry));
            for (const s of [-1, 1]) geo.frame.push(place(boxGeo(0.12, doorH, 0.36), ex - dx * inset + Math.cos(ry) * s * (doorW / 2 + 0.06), doorH / 2, ez - dz * inset - Math.sin(ry) * s * (doorW / 2 + 0.06), ry));
            const first = door.a[0] === x && door.a[1] === z;
            if (first) { const slab = new THREE.Mesh(boxGeo(doorW, doorH, 0.12, 1.5), door.lock === 'exit' ? M.frame : M.door); slab.position.set(ex, doorH / 2, ez); slab.rotation.y = ry; slab.castShadow = true; grp.add(slab);
              // hazard stripe across the slab
              const stripe = new THREE.Mesh(new THREE.BoxGeometry(doorW, 0.16, 0.13), new THREE.MeshStandardMaterial({ color: door.lock ? 0xc8302a : 0xd8b23a, roughness: 0.6 })); stripe.position.set(0, -0.2, 0); slab.add(stripe);
              door.obj = slab; slab.userData.dyn = true; door.base = slab.position.clone(); door.axis = new THREE.Vector3(Math.cos(ry), 0, -Math.sin(ry)); door.w = doorW; door.center = [ex, ez]; door.dir = [dx, dz];
            }
            // a button panel beside the door on this side
            const side = 1, bx = ex - dx * (inset + 0.17) + Math.cos(ry) * side * (doorW / 2 + 0.45), bz = ez - dz * (inset + 0.17) - Math.sin(ry) * side * (doorW / 2 + 0.45);
            const panel = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.32, 0.05), new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.5, metalness: 0.4 })); panel.position.set(bx, 1.35, bz); panel.rotation.y = ry; grp.add(panel);
            const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.03), new THREE.MeshBasicMaterial({ color: door.lock ? 0xff2a2a : 0x2aff6a })); lamp.position.set(0, 0.06, 0.03); panel.add(lamp);
            (door.lamps = door.lamps || []).push(lamp);
            this.inter.push({ kind: 'door', f, door, x: ex - dx * 0.85, z: ez - dz * 0.85, r: 2.0 });
          } else if (n === '#' || !door) {
            if (!this.slots[f + c]) this.slots[f + c] = [];
            this.slots[f + c].push({ f, x: ex - dx * 0.95, z: ez - dz * 0.95, ry: ry + Math.PI, cell: [x, z], used: false });
          }
        }
      }));
      for (const [k, list] of Object.entries(geo)) if (list.length) { const mesh = new THREE.Mesh(mergeGeometries(list), M[k]); mesh.receiveShadow = true; mesh.castShadow = k === 'wall'; grp.add(mesh); }
    }
    // fluorescent fixtures: one per room (several along halls)
    for (let f = 0; f < 3; f++) {
      const rooms = {}; MAPS[f].forEach((r, z) => [...r].forEach((c, x) => { if (c !== '#') (rooms[c] = rooms[c] || []).push([x, z]); }));
      for (const [c, cells] of Object.entries(rooms)) {
        const pts = c === 'H' || c === 'F' ? cells.filter((_, i) => i % 3 === 0) : [cells[(cells.length / 2) | 0]];
        for (const [x, z] of pts) { const [cx, cz] = cellCenter(x, z);
          const fix = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.06, 0.22), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xf4f7ff, emissiveIntensity: 1 })); fix.position.set(cx, WH - 0.04, cz); this.groups[f].add(fix);
          this.anchors[f].push({ f, room: c, x: cx, z: cz, lamp: fix, on: rand() > (f === 1 ? 0.62 : 0.45), flick: rand() < 0.5, col: new THREE.Color(f === 2 ? 0xbcd2ff : 0xeef3ff), red: false, base: true });
        }
      }
    }
  }
  addBox(f, x, z, w, d, h = 3, tag = null) { const b = { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, h, tag }; this.boxes[f].push(b); return b; }
  slot(f, room, rand) { const s = (this.slots[f + room] || []).filter((q) => !q.used); if (!s.length) return null; const q = s[(rand() * s.length) | 0]; q.used = true; return q; }
  async prop(name, f, x, z, ry, opts = {}) {
    const g = await load(name.includes('/') ? name : 'lab/' + name + '.glb'); const o = g ? g.scene.clone(true) : new THREE.Group();
    let s = opts.s || 1; if (opts.fit) { o.updateMatrixWorld(true); const bb0 = new THREE.Box3().setFromObject(o); s = opts.fit / Math.max(0.01, bb0.max.y - bb0.min.y); } o.scale.setScalar(s); o.position.set(x, opts.y || 0, z); o.rotation.y = ry; this.groups[f].add(o);
    o.traverse((m) => { if (m.isMesh) { m.castShadow = !this.low; m.receiveShadow = true; if (opts.tint) { m.material = m.material.clone(); m.material.color = new THREE.Color(opts.tint); } } });
    if (opts.solid !== false) { const bb = new THREE.Box3().setFromObject(o); const gy = this.groups[f].position.y; this.addBox(f, (bb.min.x + bb.max.x) / 2, (bb.min.z + bb.max.z) / 2, Math.max(0.05, bb.max.x - bb.min.x - (opts.shrink || 0.1)), Math.max(0.05, bb.max.z - bb.min.z - (opts.shrink || 0.1)), bb.max.y - gy, opts.tag); }
    return o;
  }
  collide(f, x, z, r = 0.32, ignoreDoors = false) {
    for (let it = 0; it < 2; it++) {
      for (const b of this.boxes[f]) { if (b.h < 0.12) continue; const px = Math.max(b.x0, Math.min(x, b.x1)), pz = Math.max(b.z0, Math.min(z, b.z1)); const dx = x - px, dz = z - pz, d2 = dx * dx + dz * dz;
        if (d2 < r * r) { if (d2 < 1e-8) { x += r; continue; } const d = Math.sqrt(d2), k = (r - d) / d; x += dx * k; z += dz * k; } }
      if (!ignoreDoors) for (const d of this.doors) { if (d.f !== f || !d.obj || d.open > 0.6) continue; const [cx, cz] = d.center, hw = d.w / 2, ax = Math.abs(d.dir[1]) ? hw : 0.2, az = Math.abs(d.dir[0]) ? hw : 0.2;
        const px = Math.max(cx - ax, Math.min(x, cx + ax)), pz = Math.max(cz - az, Math.min(z, cz + az)); const dx = x - px, dz = z - pz, d2 = dx * dx + dz * dz;
        if (d2 < r * r && d2 > 1e-8) { const dd = Math.sqrt(d2), k = (r - dd) / dd; x += dx * k; z += dz * k; } }
    }
    return [x, z];
  }
  los(f, x0, z0, x1, z1) {
    const steps = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.4);
    for (let i = 1; i < steps; i++) { const t = i / steps, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      if (cellAt(f, toCell(x), toCell(z)) === '#') return false;
      for (const b of this.boxes[f]) if (b.h > 1.6 && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return false;
      for (const d of this.doors) if (d.f === f && d.open < 0.5 && d.center && Math.abs(x - d.center[0]) < (d.dir[1] ? d.w / 2 : 0.2) && Math.abs(z - d.center[1]) < (d.dir[0] ? d.w / 2 : 0.2)) return false; }
    return true;
  }
  nextStep(f, from, to, canOpenLocked = false) {
    const key = (x, z) => x + ',' + z; const prev = new Map([[key(...from), null]]); const q = [from];
    while (q.length) { const [x, z] = q.shift(); if (x === to[0] && z === to[1]) break;
      for (const [dx, dz] of DIRS) { const nx = x + dx, nz = z + dz, c = cellAt(f, x, z), n = cellAt(f, nx, nz); if (n === '#' || prev.has(key(nx, nz))) continue;
        if (n !== c) { const d = this.doorOn(f, x, z, nx, nz); if (!d) continue; if (d.lock && !d.unlocked && !canOpenLocked) continue; }
        prev.set(key(nx, nz), [x, z]); q.push([nx, nz]); } }
    let cur = [to[0], to[1]]; if (!prev.has(key(...cur))) return null;
    while (true) { const p = prev.get(key(...cur)); if (!p || (p[0] === from[0] && p[1] === from[1])) return p ? cur : null; cur = p; }
  }
  // freeze everything that never moves so the renderer skips its matrices every frame; small things cast no shadow
  freeze() { const walk = (o, dyn) => { const d = dyn || o.userData.dyn; if (!d) { o.matrixAutoUpdate = false; o.updateMatrix(); } if (o.isMesh && !d) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); const r = o.geometry.boundingSphere.radius * Math.max(o.scale.x, o.scale.y, o.scale.z); if (r < 0.6) o.castShadow = false; } for (const c of o.children) walk(c, d); };
    for (const g of this.groups) { g.updateMatrixWorld(true); for (const c of g.children) walk(c, false); } }
  update(dt) {
    for (const d of this.doors) { if (!d.obj) continue;
      if (d.target < 0.5 && d.open > 0.02 && this.blocked && this.blocked(d)) d.target = 1;
      d.open += Math.sign(d.target - d.open) * Math.min(Math.abs(d.target - d.open), dt * 1.8);
      d.obj.position.copy(d.base).addScaledVector(d.axis, d.open * d.w * 0.98); if (d.jam > 0) d.jam -= dt;
      for (const l of d.lamps || []) l.material.color.setHex(d.lock && !d.unlocked ? 0xff2a2a : d.target > 0.5 ? 0x2aff6a : 0xffb020); }
  }
}
