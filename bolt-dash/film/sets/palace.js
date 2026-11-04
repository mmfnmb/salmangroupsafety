// Gold's palace in Auria: a golden hall with a throne, and towers outside. Everything is gold, even the trees.
import { SETS, put, THREE } from '../lib.js';

// one shared set of gold finishes, slightly different for floor / walls / trim
const GOLD = {
  floor: new THREE.MeshStandardMaterial({ color: 0xc99a10, metalness: 1, roughness: 0.32, emissive: 0x2a1a00, emissiveIntensity: 0.6 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xf0c22a, metalness: 1, roughness: 0.22, emissive: 0x3a2600, emissiveIntensity: 0.55 }),
  trim: new THREE.MeshStandardMaterial({ color: 0xffd94a, metalness: 1, roughness: 0.14, emissive: 0x5a3a00, emissiveIntensity: 0.5 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x8a6206, metalness: 1, roughness: 0.3, emissive: 0x1a1000, emissiveIntensity: 0.5 }),
};
const gild = (o, m) => { o.traverse((x) => { if (x.isMesh) { x.material = m; x.castShadow = true; x.receiveShadow = true; } }); return o; };
const g = (root, name, x, y, z, s, ry, m = GOLD.wall) => gild(put(root, name, x, y, z, s, ry), m);

// the big screen's picture: a news graphic drawn on a canvas
export function screenTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 288; const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, 288); gr.addColorStop(0, '#2a1a6e'); gr.addColorStop(1, '#7b4dff'); x.fillStyle = gr; x.fillRect(0, 0, 512, 288);
  x.fillStyle = '#ff4f9a'; x.fillRect(0, 196, 512, 54); x.fillStyle = '#fff'; x.font = 'bold 30px Lilita, sans-serif'; x.textAlign = 'center';
  x.fillText('PARTY GAMES LEAGUE', 256, 233);
  x.fillStyle = '#ffd23f'; x.font = 'bold 64px Lilita, sans-serif'; x.fillText('9 TEAMS', 256, 110); x.fillStyle = '#fff'; x.font = 'bold 28px Lilita, sans-serif'; x.fillText('8 GAMES · 1 CROWN', 256, 160);
  x.fillStyle = '#d7263d'; x.fillRect(16, 16, 74, 28); x.fillStyle = '#fff'; x.font = 'bold 18px Nunito, sans-serif'; x.fillText('LIVE', 53, 37);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// layout: hall from z=-18 (throne end) to z=+18 (gate), x from -16 to 16; throne faces +z
export const PALACE = { throne: [0, 1.0, -12.6], screen: [0, 4.2, 9.2], follow: [[-2.2, 0, -5.6], [0, 0, -5.2], [2.2, 0, -5.6]] };
SETS.palace = (root) => {
  // floor and a carpet up the middle
  g(root, 'f/mini-floor', 0, 0.01, 0, [34, 1, 38], 0, GOLD.floor);
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(4, 30), new THREE.MeshStandardMaterial({ color: 0x9a1020, roughness: 0.8 }));
  carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, 0.03, 1); carpet.receiveShadow = true; root.add(carpet);
  // walls (back and sides), front wall with an open gate
  for (let x = -15; x <= 15; x += 6) g(root, 'f/cast-wall', x, 0, -18, [6, 6, 1.2], 0);
  for (let z = -15; z <= 15; z += 6) { g(root, 'f/cast-wall', -17.5, 0, z, [6, 6, 1.2], Math.PI / 2); g(root, 'f/cast-wall', 17.5, 0, z, [6, 6, 1.2], Math.PI / 2); }
  for (const x of [-15, -9, 9, 15]) g(root, 'f/cast-wall', x, 0, 18.5, [6, 6, 1.2], 0);
  g(root, 'f/cast-gate', 0, 0, 18.5, [8, 8, 8], Math.PI / 2, GOLD.trim);
  // two rows of columns
  for (let z = -13; z <= 13; z += 6.5) for (const x of [-8, 8]) { g(root, 'f/mini-column', x, 0, z, [2.2, 8, 2.2], 0, GOLD.trim); g(root, 'f/mini-block', x, 8, z, [2.8, 0.8, 2.8], 0, GOLD.wall); }
  // throne: platform, steps and a gilded lounge chair
  g(root, 'f/mini-block', 0, 0, -13.5, [10, 2, 6], 0, GOLD.dark);
  g(root, 'f/mini-stairs', 0, 0, -9.9, [6, 2, 1.4], Math.PI, GOLD.wall);
  g(root, 'f/f-loungeChair', -1.3, 1.0, -12.0, [2.6, 3.0, 2.6], 0, GOLD.trim);
  for (const x of [-4.2, 4.2]) g(root, 'f/mini-statue', x, 1.0, -14.5, 2.4, 0, GOLD.trim);
  // banners on the walls, statues and gold trees along the sides
  for (const x of [-12, -4, 4, 12]) g(root, 'f/cast-flag-banner-long', x, 1.6, -17.3, [3, 2.6, 3], -Math.PI / 2, GOLD.trim);
  for (const z of [-10, 0, 10]) for (const x of [-16.6, 16.6]) g(root, 'f/mini-banner', x, 3, z, 3.2, x < 0 ? Math.PI / 2 : -Math.PI / 2, GOLD.trim);
  for (const z of [-15, 15]) for (const x of [-13, 13]) g(root, 'f/mini-tree', x, 0, z, 3.4, 0, GOLD.trim);
  // the big screen on the front wall, facing the throne
  g(root, 'f/f-televisionModern', 0, 1.6, 15.8, [16, 16, 4], Math.PI, GOLD.dark);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 5.4), new THREE.MeshBasicMaterial({ map: screenTexture(), toneMapped: false }));
  scr.position.set(0, 5.25, 15.5); scr.rotation.y = Math.PI; root.add(scr);
  // outside: four towers at the corners, and gold trees in front of the gate
  for (const [x, z] of [[-19.5, -20], [19.5, -20], [-19.5, 20.5], [19.5, 20.5]]) {
    g(root, 'f/cast-tower-square-base', x, 0, z, 7, 0, GOLD.wall);
    g(root, 'f/cast-tower-square-mid', x, 7, z, 7, 0, GOLD.wall);
    g(root, 'f/cast-tower-square-mid', x, 14, z, 7, 0, GOLD.wall);
    g(root, 'f/cast-tower-square-roof', x, 21, z, 7, 0, GOLD.trim);
    g(root, 'f/cast-flag', x, 35, z, 5, 0, GOLD.trim);
  }
  g(root, 'f/mini-floor', 0, 0, 34, [60, 1, 30], 0, GOLD.floor);
  for (let x = -24; x <= 24; x += 8) g(root, 'f/mini-tree', x, 0, 30 + (Math.abs(x) % 16 ? 4 : 0), 4, 0, GOLD.trim);
  // warm glow inside the hall
  const lamp = new THREE.PointLight(0xffd27a, 40, 40, 1.4); lamp.position.set(0, 9, -4); root.add(lamp);
};
