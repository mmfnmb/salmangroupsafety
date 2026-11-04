// house set(s): Blue & Yellow's small seaside home.
// house_int is a cutaway (back + side walls only, open towards +z) so the camera can always look in.
// Furniture is the Kenney furniture kit at scale S (a 1-unit kit wall becomes 2.6 tall, taller than the 1.5-tall cast).
import { SETS, put, PI, THREE } from '../lib.js';
import { instanced } from '../../src/core.js';

const S = 2;
// multiply an object's colours (the kit is mostly white, which blooms out under the sun)
const tint = (o, hex, rough = 0.8) => { const c = new THREE.Color(hex); o.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.multiply(c); m.material.roughness = rough; } }); return o; };
// where things are, so the scenes can use them
// the interior is built in kit space and scaled by K, so the furniture sits right next to the cast
const K = 1.25;
const k = (o) => { const r = {}; for (const key in o) r[key] = key === 'y' ? o[key] * K : o[key] * K; return r; };
export const HOUSE = {
  K,
  bed: k({ x: -6.25, y: 0.86, z: -4.6 }), // Blue lies here, head towards the back wall
  radio: k({ x: -4.75, y: 0.78, z: -5.65 }),
  sofa: k({ x: 0, y: 0.42, z: -0.15 }), // seat centre; seated cast face -z (towards the TV)
  tv: k({ x: 0, y: 1.1, z: -5.6 }),
  table: k({ x: 5.45, z: -2.05 }), // kitchen table centre
  stove: k({ x: 5.55, y: 0.95, z: -5.5 }),
  toaster: k({ x: 3.85, y: 0.92, z: -5.6 }),
  coffee: k({ x: 0.1, z: -2.6 }),
};

SETS.house_int = (top) => {
  const root = new THREE.Group(); root.scale.setScalar(K); top.add(root);
  const lawn = []; for (let x = -24; x <= 24; x += 2.24) for (let z = -20; z <= 16; z += 2.24) lawn.push({ x, y: -1.02, z }); instanced('Cube_Grass_Single', lawn, top);
  // floor: x -8..8, z -6..4
  for (let x = -8; x < 8; x += 2) for (let z = 4; z > -6; z -= 2) tint(put(root, 'f/f-floorFull', x, 0, z, S), (x + z) % 4 ? 0xb07a4c : 0xa36f43);
  // back wall with windows, side walls (left = bedroom side, right = kitchen side)
  const wallC = 0x9fc7e6; // soft sea blue
  for (let x = -8; x < 8; x += 2) tint(put(root, [-6, -2, 2].includes(x) ? 'f/f-wallWindow' : 'f/f-wall', x, 0, -6, S), wallC);
  for (let z = 4; z > -6; z -= 2) tint(put(root, z === 0 ? 'f/f-wallDoorway' : 'f/f-wall', -8, 0, z, S, PI / 2), 0xf2c38f);
  for (let z = -6; z < 4; z += 2) tint(put(root, z === -2 ? 'f/f-wallWindow' : 'f/f-wall', 8, 0, z, S, -PI / 2), 0xb9e0b0);

  // bedroom corner (left)
  tint(put(root, 'f/f-bedSingle', -7.6, 0, -3.7, S), 0xb8d4ff);
  put(root, 'f/f-sideTable', -5.5, 0, -5.45, S);
  put(root, 'f/f-radio', -5.05, 0.76, -5.5, S);
  tint(put(root, 'f/f-rugRound', -5.4, 0.01, -2.2, S), 0x8a7ad8);
  put(root, 'f/f-pottedPlant', -7.4, 0, 2.8, S * 1.1);
  put(root, 'f/f-coatRackStanding', -7.5, 0, 0.9, S);

  // living room (middle)
  put(root, 'f/f-cabinetTelevision', -0.8, 0, -5.5, S);
  put(root, 'f/f-televisionModern', 0, 0.62, -5.75, S);
  // the TV picture: a glowing panel the scenes recolour (HOUSE.screen)
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 0.66), new THREE.MeshBasicMaterial({ color: 0x1a2240, toneMapped: false }));
  scr.position.set(0, 1.1, -5.62); root.add(scr); HOUSE.screen = scr;
  tint(put(root, 'f/f-rugRectangle', -1.57, 0.02, -0.9, S), 0xe86a6a);
  put(root, 'f/f-tableCoffee', 0.5, 0, -2.4, S);
  tint(put(root, 'f/f-loungeSofaLong', 0.98, 0, -0.5, S, PI), 0xff9c6b);
  put(root, 'f/f-pillowBlue', 0.45, 0.42, 0.05, S);
  put(root, 'f/f-pillow', -0.85, 0.42, 0.05, S);
  put(root, 'f/f-lampRoundFloor', -1.7, 0, 0.1, S);
  put(root, 'f/f-bookcaseOpen', -2.9, 0, -5.5, S);
  put(root, 'f/f-books', -2.6, 1.0, -5.7, S);
  put(root, 'f/f-speaker', 1.1, 0, -5.55, S);
  put(root, 'f/f-pottedPlant', 2.4, 0, -5.4, S);
  put(root, 'f/f-plantSmall1', 0.35, 0.47, -2.6, S);

  // kitchen (right)
  const row = ['f/f-kitchenCabinet', 'f/f-kitchenSink', 'f/f-kitchenStove', 'f/f-kitchenCabinet'];
  row.forEach((m, i) => put(root, m, 3.4 + i * 0.86, 0, -5.1, S));
  put(root, 'f/f-kitchenFridge', 6.9, 0, -5.4, S);
  put(root, 'f/f-kitchenCabinetUpper', 3.4, 1.8, -5.55, S); put(root, 'f/f-kitchenCabinetUpper', 6.0, 1.8, -5.55, S);
  put(root, 'f/f-toaster', 3.85, 0.9, -5.6, S);
  put(root, 'f/f-kitchenCoffeeMachine', 6.1, 0.9, -5.7, S);
  put(root, 'f/f-table', 4.6, 0, -1.6, S);
  put(root, 'f/f-chair', 4.95, 0, -2.75, S); put(root, 'f/f-chair', 5.55, 0, -0.95, S, PI);
  put(root, 'f/f-trashcan', 7.3, 0, 0.6, S);
  put(root, 'f/f-pottedPlant', 7.4, 0, 2.8, S * 1.1);
};

SETS.house_ext = (root) => {
  // a lawn on the coast; the sea is the scene's own
  const lawn = [];
  for (let x = -20; x <= 20; x += 2.24) for (let z = -18; z <= 16; z += 2.24) lawn.push({ x, y: -1, z });
  instanced('Cube_Grass_Single', lawn, root);
  put(root, 'f/city-building-type-c', 0, 0, -4, 6.2);
  // path to the door, fence along the front, trees and planters
  for (let z = 0.2; z < 14; z += 2.4) put(root, 'f/city-path-long', 0, 0.01, z, 6);
  for (let x = -18; x <= 18; x += 2.9) if (Math.abs(x) > 2) put(root, 'f/city-fence', x, 0, 13.5, 6);
  for (const [x, z, s] of [[-11, -7, 7], [11.5, -5, 6], [-15, 4, 5.5], [14, 6, 6.5], [-7, 9, 4.5]]) put(root, 'f/city-tree-large', x, 0, z, s);
  for (const x of [-3.2, 3.2]) put(root, 'f/city-planter', x, 0, 3.5, 5);
  put(root, 'k/flag-large-blue', 6, 0, 1.5, 3);
};
