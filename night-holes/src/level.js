// Fills the lab: props per room, the specimen tube, hiding lockers, puzzle stations, elevators and randomized items.
import * as THREE from 'three';
import { inst } from './assets.js';
import { cellCenter, C, SC, WH } from './world.js';

export const ITEM_MODELS = {
  battery: ['props/Battery_Small.glb', 1.4, null], bottle: ['props/WaterBottle_1.glb', 1.1, 0x39ff9a], fuse_r: ['props/Battery_Big.glb', 1.2, 0xff3b30], fuse_y: ['props/Battery_Big.glb', 1.2, 0xffcc00],
  fuse_b: ['props/Battery_Big.glb', 1.2, 0x2f7dff], screwdriver: ['props/Bandages.glb', 1.3, 0xd8b000], green: ['props/Phone.glb', 1.5, 0x22dd55], red: ['props/Phone.glb', 1.5, 0xff2233],
  key: ['props/Can_Closed.glb', 0.9, 0xc9a24a], tape: ['props/Radio.glb', 0.8, 0x222222], note: [null, 1, null],
};
function noteMesh() { const c = document.createElement('canvas'); c.width = 64; c.height = 80; const g = c.getContext('2d'); g.fillStyle = '#e9e2c8'; g.fillRect(0, 0, 64, 80); g.fillStyle = '#333'; for (let i = 0; i < 7; i++) g.fillRect(8, 10 + i * 9, 30 + (i * 13) % 20, 2); g.fillStyle = '#b00'; g.font = 'bold 22px sans-serif'; g.fillText('#', 40, 72);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.35), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(c), side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; return m; }
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
export function glow(color, size) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(size); return s; }

export async function populate(W, rand, state) {
  const at = (x, z) => cellCenter(x, z);
  const S = (f, room) => W.slot(f, room, rand);
  const onSlot = async (name, f, room, opts = {}) => { const s = S(f, room); if (!s) return null; const o = await W.prop(name, f, s.x, s.z, s.ry, opts); return { o, s }; };
  const station = (f, x, z, kind, extra = {}) => { const i = { kind, f, x, z, r: 1.7, ...extra }; W.inter.push(i); return i; };

  // ---------------- ground floor
  // the specimen tube (#8) in the middle of the tube lab, with a glass core and glowing liquid
  const [tx, tz0] = at(5, 5), tz = tz0 + C / 2;
  const pod = await W.prop('Props_Pod', 0, tx, tz, 0, { s: 1.15, shrink: 0.2 });
  pod.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); const c = m.material.color; if (c.r + c.g + c.b > 1.6) { m.material.transparent = true; m.material.opacity = 0.18; m.material.depthWrite = false; m.material.roughness = 0.05; m.material.metalness = 0.2; m.renderOrder = 5; m.userData.glass = true; } } });
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 2.1, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x1aff7a, emissive: 0x0bff5a, emissiveIntensity: 0.9, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide }));
  liquid.position.set(tx, 1.5, tz); liquid.renderOrder = 4; W.groups[0].add(liquid);
  const red = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.5, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xff2040, emissive: 0xaa0020, emissiveIntensity: 0.8, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
  red.position.set(tx, 0.75, tz); W.groups[0].add(red);
  const tubeGlow = new THREE.PointLight(0x2cff88, 3.5, 7, 1.6); tubeGlow.position.set(tx, 1.6, tz); W.groups[0].add(tubeGlow);
  state.tube = { x: tx, z: tz, pod, liquid, red, light: tubeGlow, broken: false };
  // empty side tubes and machines
  for (let i = 0; i < 4; i++) await onSlot('Props_Capsule', 0, 'T', { s: 1.1 });
  await onSlot('Props_Computer', 0, 'T'); await onSlot('Props_Computer', 0, 'T'); await onSlot('Props_Shelf_Tall', 0, 'T');
  // security room: monitors puzzle
  for (let i = 0; i < 3; i++) { const r = await onSlot('Props_Computer', 0, 'S'); if (r && i === 1) station(0, r.s.x, r.s.z, 'monitors'); }
  await onSlot('props/Chair_1.glb', 0, 'S', { s: 0.75, solid: false });
  // offices: the safe with the green card
  { const r = await onSlot('Props_Chest', 0, 'O', { s: 0.9 }); if (r) station(0, r.s.x, r.s.z, 'safe'); }
  await onSlot('Props_Shelf', 0, 'O'); await onSlot('props/Bookshelf.glb', 0, 'O', { s: 0.62 }); await onSlot('Props_Computer', 0, 'O');
  // chemistry: the scale
  { const r = await onSlot('Props_Base', 0, 'X', { s: 1 }); if (r) { station(0, r.s.x, r.s.z, 'scale'); for (let i = 0; i < 4; i++) await W.prop(['Props_Vessel', 'Props_Vessel_Short', 'Props_Vessel_Tall'][i % 3], 0, r.s.x + (i - 1.5) * 0.25, r.s.z, 0, { y: 0.55, solid: false }); } }
  await onSlot('Props_Shelf_Tall', 0, 'X');
  // clinic
  for (let i = 0; i < 3; i++) await onSlot('props/Bed_Single.glb', 0, 'C', { s: 0.6 });
  await onSlot('props/Bathroom_Sink.glb', 0, 'C', { s: 0.7 });
  // reception
  await onSlot('Props_Computer', 0, 'R'); await onSlot('Props_Crate', 0, 'R'); await onSlot('Props_CrateLong', 0, 'R'); await onSlot('props/Chair_4.glb', 0, 'R', { s: 0.75 }); await onSlot('props/Trashcan_Large.glb', 0, 'R', { s: 0.6 });

  // ---------------- B1
  for (let i = 0; i < 4; i++) await onSlot(['Props_Crate', 'Props_ContainerFull', 'Props_CrateLong', 'Props_Shelf_Tall'][i], 1, 'W');
  for (let i = 0; i < 4; i++) await onSlot('Props_Capsule', 1, 'K', { s: 1.2 });
  { const r = await onSlot('Props_Base', 1, 'P'); if (r) station(1, r.s.x, r.s.z, 'valves'); }
  await onSlot('Pipes', 1, 'P', { solid: false }); await onSlot('Props_Crate', 1, 'P');
  { const r = await onSlot('props/Radio.glb', 1, 'A', { s: 0.9, solid: false }); if (r) station(1, r.s.x, r.s.z, 'tape'); }
  { const r = await onSlot('props/Bookshelf.glb', 1, 'A', { s: 0.62 }); if (r) station(1, r.s.x, r.s.z, 'poster'); }
  await onSlot('Props_Shelf', 1, 'A');
  { const r = await onSlot('Props_ContainerFull', 1, 'G', { s: 1.1 }); if (r) station(1, r.s.x, r.s.z, 'generator'); }
  await onSlot('Props_Laser', 1, 'G'); await onSlot('Props_Teleporter_2', 1, 'G', { solid: false });

  // ---------------- B2
  for (let i = 0; i < 5; i++) { const r = await onSlot('Props_Pod', 2, 'Z', { s: 1 }); if (r) r.o.traverse((m) => { if (m.isMesh) { const c = m.material.color; if (c.r + c.g + c.b > 1.6) m.visible = false; } }); }
  { const r = await onSlot('Props_Computer', 2, 'Q'); if (r) station(2, r.s.x, r.s.z, 'wires'); }
  await onSlot('Props_Computer', 2, 'Q'); await onSlot('Props_Chest', 2, 'Q', { s: 0.8 });
  { const d = W.doors.find((q) => q.lock === 'exit'); station(2, d.center[0] - d.dir[0] * 0.9, d.center[1] - d.dir[1] * 0.9, 'exit'); }

  // ---------------- elevators (a platform + call panel on each floor)
  for (let f = 0; f < 3; f++) { const [ex, ez0] = at(f === 0 ? 9 : 1, 1), ez = ez0 + C / 2, exx = ex + C / 2;
    await W.prop('Props_Teleporter_1', f, exx, ez, 0, { solid: false });
    const light = glow(0x66aaff, 1.2); light.position.set(exx, 0.3, ez); W.groups[f].add(light);
    station(f, exx, ez, 'elevator', { r: 1.9 }); state.elev[f] = [exx, ez]; }

  // ---------------- hiding lockers (tall metal cabinets) in halls and big rooms
  const lockerRooms = [[0, 'H'], [0, 'H'], [0, 'H'], [0, 'T'], [0, 'R'], [1, 'H'], [1, 'H'], [1, 'W'], [1, 'K'], [2, 'H'], [2, 'H'], [2, 'H'], [2, 'Z']];
  for (const [f, room] of lockerRooms) { const s = S(f, room); if (!s) continue; const o = await W.prop('props/Kitchen_Fridge.glb', f, s.x, s.z, s.ry, { s: 0.9, tint: 0x5c6670, metal: 0.6 });
    const L = { kind: 'locker', f, x: s.x, z: s.z, ry: s.ry, r: 1.5, obj: o, id: 'l' + W.lockers.length }; W.lockers.push(L); W.inter.push(L); }
  // filler props so rooms never feel empty
  for (const [f, room, n] of [[0, 'H', 3], [1, 'H', 3], [2, 'H', 4], [2, 'Z', 1], [1, 'K', 1]]) for (let i = 0; i < n; i++) await onSlot(['Props_Crate', 'Props_CrateLong', 'props/PropaneTank.glb', 'props/Trashcan.glb'][(rand() * 4) | 0], f, room, { s: room === 'H' ? 0.9 : 1 });
}

// item spawns: [type, [floor+room candidates...]]
export function itemPlan(rand) {
  const pick = (arr) => arr[(rand() * arr.length) | 0];
  const plan = [];
  const fuseRooms = ['1W', '1K', '1H', '1A', '0H', '0R'].sort(() => rand() - 0.5);
  plan.push(['fuse_r', fuseRooms[0]], ['fuse_y', fuseRooms[1]], ['fuse_b', fuseRooms[2]]);
  plan.push(['screwdriver', pick(['1W', '1K', '0X'])], ['note', '0C', 2], ['note', pick(['1K', '1W', '1H']), 3], ['red', '2Z'], ['tape', pick(['2H', '2Z', '1A'])]);
  for (let i = 0; i < 4; i++) plan.push(['battery', pick(['0H', '0R', '0O', '1H', '1W', '2H', '2Q'])]);
  for (let i = 0; i < 5; i++) plan.push(['bottle', pick(['0T', '0X', '0C', '1W', '1K', '2H', '2Z'])]);
  return plan;
}
export async function spawnItems(W, plan, rand, items) {
  for (const [type, fr, extra] of plan) { const f = +fr[0], room = fr[1]; const s = W.slot(f, room, rand); if (!s) continue;
    items.push(await makeItem(W, type, f, s.x - Math.sin(s.ry) * 0.35, s.z - Math.cos(s.ry) * 0.35, 'i' + items.length, extra)); }
}
export async function makeItem(W, type, f, x, z, id, extra) {
  const [path, s, tint] = ITEM_MODELS[type]; let o;
  if (path) { o = await inst(path); o.scale.setScalar(SC * s); if (tint) o.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.color = new THREE.Color(tint); m.material.emissive = new THREE.Color(tint).multiplyScalar(0.25); } }); }
  else o = noteMesh();
  const g = new THREE.Group(); g.add(o); o.position.y = 0.05; const gl = glow(tint || 0xfff2c0, 0.7); gl.position.y = 0.35; g.add(gl); g.position.set(x, 0, z); W.groups[f].add(g);
  const it = { kind: 'item', type, f, x, z, r: 1.4, obj: g, id, extra, taken: false }; W.inter.push(it); return it;
}
