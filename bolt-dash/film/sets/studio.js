// TV sets: the news studio, the commercials stage, and the sofa corner we watch TV from (day and night).
// Furniture is the Kenney furniture kit (origin at a corner, x: 0..w, z: -d..0) scaled up to fit the cast.
import { SETS, put, THREE, M, V, PI } from '../lib.js';

export const FS = 3.2; // furniture scale
// recolour a placed model (the kit's whites glare under the studio lights)
const tint = (o, hex, rough = 0.8) => { o.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.setHex(hex); m.material.roughness = rough; } }); return o; };
const floor = (root, x, z, hex) => tint(put(root, 'f/f-floorFull', x, 0, z, FS), hex);
const wall = (root, name, x, z, ry, hex) => tint(put(root, 'f/' + name, x, 0, z, FS, ry), hex);

// a flat in-world screen showing a canvas drawing (allowed: it's a graphic, not a model)
function screen(root, w, h, draw, x, y, z, ry = 0) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = Math.round(1024 * h / w);
  draw(cv.getContext('2d'), cv.width, cv.height);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  m.position.set(x, y, z); m.rotation.y = ry; root.add(m); return m;
}
const leagueArt = (title, sub, c1, c2) => (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.globalAlpha = 0.18; g.fillStyle = '#fff'; for (let i = -h; i < w; i += 70) { g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.lineTo(i + h + 30, 0); g.lineTo(i + 30, h); g.fill(); }
  g.globalAlpha = 1; g.textAlign = 'center'; g.fillStyle = '#fff'; g.strokeStyle = '#21124a'; g.lineWidth = 14;
  g.font = `400 ${Math.round(h * 0.2)}px Lilita`; g.strokeText(title, w / 2, h * 0.5); g.fillText(title, w / 2, h * 0.5);
  if (sub) { g.font = `800 ${Math.round(h * 0.09)}px Nunito`; g.fillStyle = '#ffd23f'; g.lineWidth = 8; g.strokeText(sub, w / 2, h * 0.72); g.fillText(sub, w / 2, h * 0.72); }
};
const gamesArt = (g, w, h) => {
  g.fillStyle = '#21124a'; g.fillRect(0, 0, w, h);
  g.textAlign = 'center'; g.fillStyle = '#ffd23f'; g.font = `400 ${Math.round(h * 0.13)}px Lilita`; g.fillText('8 GAMES', w / 2, h * 0.17);
  const games = ['Obstacle Dash', 'Hex Drop', 'Bolt Golf', 'Volley Bash', 'Puck Rush', 'Bat Ball', 'The Summit', 'Arena'];
  const cols = ['#3d8bff', '#ff7ab8', '#4be3a0', '#ffd23f', '#ff7a1a', '#d7263d', '#6a3fd1', '#f4f4f8'];
  games.forEach((n, i) => {
    const x = (i % 2) * w / 2 + w * 0.04, y = h * 0.27 + Math.floor(i / 2) * h * 0.18;
    g.fillStyle = cols[i]; g.fillRect(x, y, w * 0.42, h * 0.14);
    g.fillStyle = i === 3 || i === 7 ? '#21124a' : '#fff'; g.font = `400 ${Math.round(h * 0.075)}px Lilita`; g.textAlign = 'left'; g.fillText(`${i + 1}. ${n}`, x + w * 0.02, y + h * 0.098);
  });
};

// ---------------------------------------------------------------- the news studio
SETS.studio = (root) => {
  // floor and back wall
  for (let x = -4; x < 4; x++) for (let z = -2; z < 3; z++) floor(root, x * FS, z * FS, (x + z) % 2 ? 0x2b2350 : 0x352b66);
  for (let x = -4; x < 4; x++) wall(root, 'f-wall', x * FS, -2 * FS, 0, 0x4a3a8c);
  for (const sx of [-1, 1]) for (let z = -2; z < 2; z++) wall(root, 'f-wall', sx * 4 * FS, z * FS + (sx > 0 ? FS : 0), sx > 0 ? PI / 2 : -PI / 2, 0x4a3a8c);
  // big screens on the back wall
  screen(root, 9, 3.6, leagueArt('PARTY GAMES', 'LEAGUE · BREAKING NEWS', '#7b4dff', '#ff4f9a'), 0, 2.6, -2 * FS + 0.2);
  screen(root, 4.2, 2.6, gamesArt, -8, 2.3, -2 * FS + 0.2);
  screen(root, 4.2, 2.6, leagueArt('LIVE', 'Channel BOLT', '#ff4f9a', '#ffd23f'), 8, 2.3, -2 * FS + 0.2);
  // the anchor desk (kitchen bar units, 3 wide) on a rug, studio lights and plants
  put(root, 'f/f-rugRectangle', -3.2, 0.02, 2.4, FS * 1.2);
  for (let i = 0; i < 3; i++) tint(put(root, 'f/f-kitchenBar', -2.1 + i * 0.43 * FS, 0, 0.35, [FS, FS * 0.62, FS]), i === 1 ? 0xff4f9a : 0xffd23f, 0.5);
  for (const x of [-9, 9]) { put(root, 'f/f-lampRoundFloor', x, 0, 2, FS * 1.4); put(root, 'f/f-pottedPlant', x * 0.8, 0, -4.6, FS); }
  for (const x of [-6, 6]) put(root, 'f/f-speaker', x, 0, -3.5, FS * 1.5);
  // the crown on a column, slowly spinning, on the right
  put(root, 'f/mini-column', 6.5, 0, 0.5, 1.6);
  const crown = put(root, 'acc/Crown', 6.5, 3.6, 0.5, 2.2);
  crown.userData.update = (T) => { crown.rotation.y = T * 1.2; crown.position.y = 3.6 + Math.sin(T * 2) * 0.08; };
  // studio key light
  const key = new THREE.PointLight(0xfff2e0, 3, 30); key.position.set(0, 7, 8); root.add(key);
};

// ---------------------------------------------------------------- commercials stage: a bright cyclorama with props
SETS.adstage = (root) => {
  const bg = screen(root, 30, 14, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.6); gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.5, '#ffb347'); gr.addColorStop(1, '#ff4f9a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.globalAlpha = 0.25; g.fillStyle = '#fff'; for (let a = 0; a < 24; a++) { g.beginPath(); g.moveTo(w / 2, h / 2); g.arc(w / 2, h / 2, w, a * PI / 12, a * PI / 12 + PI / 24); g.fill(); } }, 0, 6, -5);
  bg.userData.base = true;
  for (let x = -4; x < 4; x++) for (let z = -2; z < 2; z++) floor(root, x * FS, z * FS + 2, (x + z) % 2 ? 0xff9a3d : 0xffb85c);
  put(root, 'f/f-rugRound', -2.4, 0.02, 2.6, FS * 1.4);
  for (const x of [-7, 7]) { put(root, 'f/f-speaker', x, 0, -2.5, FS * 1.8); put(root, 'f/mini-banner', x * 0.75, 0, -3.5, 1.6); }
};
// the black-hole commercial: a dark, starry stage
SETS.adstage_void = (root) => {
  screen(root, 30, 14, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.6); gr.addColorStop(0, '#5a2aff'); gr.addColorStop(0.4, '#1b0a40'); gr.addColorStop(1, '#05030c'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${Math.random()})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }, 0, 6, -5);
  for (let x = -4; x < 4; x++) for (let z = -2; z < 2; z++) floor(root, x * FS, z * FS + 2, (x + z) % 2 ? 0x140a30 : 0x1d1040);
  put(root, 'f/mini-column', 0, 0, -1.2, 1.2);
  const glow = new THREE.PointLight(0x8a4cff, 6, 18); glow.position.set(0, 3, 3); root.add(glow);
};

// ---------------------------------------------------------------- the sofa corner at home, watching TV (blue + yellow sit here)
// sofa seat centre ≈ (0, z -0.85), TV in front at z +5.5 facing the sofa
export const SOFA = { left: [-0.75, -0.8], right: [0.75, -0.8], seatY: 0.42, tv: [0, 1.9, 5.5] };
function sofaCorner(root, night) {
  for (let x = -3; x < 3; x++) for (let z = -1; z < 3; z++) floor(root, x * FS, z * FS, 0xb9824f);
  for (let x = -3; x < 3; x++) wall(root, 'f-wall' + (x === 1 ? 'Window' : ''), x * FS, -1 * FS - 0.4, 0, 0x9fd3e8);
  for (let z = -1; z < 2; z++) wall(root, 'f-wall', -3 * FS, z * FS - 0.4 + FS, PI / 2, 0x9fd3e8);
  put(root, 'f/f-rugRectangle', -2.6, 0.02, 3.2, FS * 1.1);
  tint(put(root, 'f/f-loungeSofa', -1.57, 0, -0.3, FS), 0xff6f91, 0.9);
  put(root, 'f/f-tableCoffee', -1.1, 0, 2.2, FS);
  put(root, 'f/f-lampRoundFloor', -3.6, 0, -1.2, FS);
  put(root, 'f/f-sideTable', 2.0, 0, -0.5, FS); put(root, 'f/f-lampSquareTable', 2.3, 0.85, -1.0, FS);
  put(root, 'f/f-pottedPlant', -6.5, 0, -1.6, FS); put(root, 'f/f-bookcaseOpen', 4.5, 0, -1.6, FS);
  // the TV on its cabinet, facing the sofa
  put(root, 'f/f-cabinetTelevision', 1.2, 0, 5.9, FS, PI);
  put(root, 'f/f-televisionModern', 0, 0.95, 5.6, FS, PI);
  const tvGlow = new THREE.PointLight(night ? 0x7fb0ff : 0xbfd8ff, night ? 4 : 1.5, 12); tvGlow.position.set(0, 2, 4.4); root.add(tvGlow);
  tvGlow.userData.update = (T) => { tvGlow.intensity = (night ? 4 : 1.5) * (0.85 + 0.15 * Math.sin(T * 9) * Math.sin(T * 3.3)); };
  if (night) {
    // night outside: a dark starry backdrop all around (an effect, not a prop)
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512; const g = cv.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#05061a'); gr.addColorStop(0.6, '#141a4a'); gr.addColorStop(1, '#2a2a6a'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + 0.7 * ((i * 37) % 100) / 100})`; g.fillRect((i * 733) % 1024, ((i * 389) % 300), 2, 2); }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(45, 32, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, toneMapped: false })); root.add(dome);
  }
  if (night) { const lamp = new THREE.PointLight(0xffc27a, 3, 9); lamp.position.set(-3.4, 2.6, -0.6); root.add(lamp); }
}
SETS.sofa_day = (root) => sofaCorner(root, false);
SETS.sofa_night = (root) => sofaCorner(root, true);
