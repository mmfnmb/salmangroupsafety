// The opening-ceremony stadium: a big grass field, stepped stands packed with fans (instanced crowd), flags on the rim,
// a tunnel gate the teams walk out of, a stage with the league crown and a giant screen.
import { SETS, put, crowd, THREE, M, V, PI } from '../lib.js';
import { instanced } from '../../src/core.js';

export const STAD = { FX: 30, FZ: 40, stage: { x: 0, z: -16 }, gate: { x: 0, z: 47 }, cheer: { left: 1, right: 1, ends: 1 }, screen: null, crown: null };
const TIERS = 6, TD = 2.4, TH = 1.05;

// the giant screen: a canvas drawn in two looks (league logo / the 8 games)
function drawScreen(cv, mode) {
  const c = cv.getContext('2d'), w = cv.width, h = cv.height;
  const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#2a1a6e'); g.addColorStop(1, '#7b4dff'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  const txt = (s, x, y, size, fill, stroke = '#21124a', lw = size * 0.16) => { c.font = `400 ${size}px Lilita, sans-serif`; c.lineWidth = lw; c.strokeStyle = stroke; c.strokeText(s, x, y); c.fillStyle = fill; c.fillText(s, x, y); };
  if (mode === 'logo') {
    for (let i = 0; i < 26; i++) { c.fillStyle = `rgba(255,255,255,${0.04 + (i % 3) * 0.03})`; c.beginPath(); c.arc((i * 137) % w, (i * 71) % h, 18 + (i % 5) * 14, 0, PI * 2); c.fill(); }
    txt('PARTY GAMES', w / 2, h * 0.36, 150, '#ffd23f');
    txt('LEAGUE', w / 2, h * 0.62, 170, '#ffffff');
    txt('9 TEAMS · 8 GAMES · 1 CROWN', w / 2, h * 0.85, 52, '#7fd8ff');
  } else {
    txt('THE 8 GAMES', w / 2, h * 0.13, 92, '#ffd23f');
    const games = ['Obstacle Dash', 'Hex Drop', 'Golf', 'Volley', 'Puck', 'Bat Ball', 'The Summit', 'Arena'];
    const cols = ['#ff4f9a', '#ffd23f', '#36e0a8', '#5fcfff', '#ff7a1a', '#a070ff', '#4be3a0', '#ff5a5a'];
    games.forEach((s, i) => {
      const col = i % 2, row = Math.floor(i / 2), x = w * (col ? 0.73 : 0.27), y = h * (0.32 + row * 0.17);
      c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.roundRect(x - w * 0.22, y - 44, w * 0.44, 88, 26); c.fill();
      c.fillStyle = cols[i]; c.beginPath(); c.arc(x - w * 0.18, y, 26, 0, PI * 2); c.fill();
      txt(String(i + 1), x - w * 0.18, y + 2, 40, '#ffffff', '#21124a', 6);
      txt(s, x + 22, y + 2, 60, '#ffffff', '#21124a', 9);
    });
  }
}

SETS.stadium = (root) => {
  const { FX, FZ } = STAD;
  // field
  const tiles = [];
  for (let x = -FX - 6; x <= FX + 6; x += 2.24) for (let z = -FZ - 6; z <= FZ + 6; z += 2.24) tiles.push({ x, y: -1, z });
  instanced('Cube_Grass_Single', tiles, root, false);
  // a white running track ring (low border pieces) around the field
  const ring = [];
  for (let z = -FZ; z <= FZ; z += 1) { ring.push({ x: -FX, y: 0, z, ry: PI / 2 }); ring.push({ x: FX, y: 0, z, ry: PI / 2 }); }
  for (let x = -FX; x <= FX; x += 1) { ring.push({ x, y: 0, z: -FZ, ry: 0 }); ring.push({ x, y: 0, z: FZ, ry: 0 }); }
  instanced('f/mini-border-straight', ring, root, false);

  // stands: stepped tiers on the 4 sides (gap in the south stand for the tunnel)
  const steps = [], fansL = [], fansR = [], fansE = [];
  const colorsA = [0x3d8bff, 0xffd23f, 0xff7a1a, 0xd7263d, 0x4be3a0, 0x6a3fd1, 0xf4f4f8, 0x7a4a2a, 0xff4f9a, 0x1e1e24];
  for (let i = 0; i < TIERS; i++) {
    const h = 0.6 + i * TH, sy = h / 1.6, off = 6 + i * TD;
    for (let z = -FZ - 4; z <= FZ + 4; z += 2.4) {
      steps.push({ x: -(FX + off), y: 0, z, sx: 1.2, sy, sz: 1.2 }); steps.push({ x: FX + off, y: 0, z, sx: 1.2, sy, sz: 1.2 });
      if ((Math.round(z / 2.4) + i) % 1 === 0) {
        fansL.push({ x: -(FX + off), y: h, z: z + (i % 2) * 0.6, ry: PI / 2, c: colorsA[(Math.abs(Math.round(z * 3)) + i * 7) % colorsA.length] });
        fansR.push({ x: FX + off, y: h, z: z + (i % 2) * 0.6, ry: -PI / 2, c: colorsA[(Math.abs(Math.round(z * 5)) + i * 3) % colorsA.length] });
      }
    }
    for (let x = -FX - 4; x <= FX + 4; x += 2.4) for (const s of [-1, 1]) {
      if (s > 0 && Math.abs(x) < 6) continue; // tunnel gap
      steps.push({ x, y: 0, z: s * (FZ + off), sx: 1.2, sy, sz: 1.2 });
      fansE.push({ x: x + (i % 2) * 0.6, y: h, z: s * (FZ + off), ry: s > 0 ? PI : 0, c: colorsA[(Math.abs(Math.round(x * 7)) + i * 5) % colorsA.length] });
    }
  }
  instanced('z/Step_Large', steps, root, false);
  // the crowd's per-fan colour multiplies the material colour, so make the body materials white (eyes stay dark)
  const srcNames = []; M.Character.scene.traverse((o) => { if (o.isMesh) srcNames.push((Array.isArray(o.material) ? o.material : [o.material]).map((m) => m.name)); });
  const whiten = (g) => g.children.forEach((im, i) => (Array.isArray(im.material) ? im.material : [im.material]).forEach((m, k) => { const n = srcNames[i]?.[k] || ''; if (!/Eye|Black/.test(n)) m.color.setHex(0xffffff); }));
  const make = (spots, key) => { const g = crowd(spots, colorsA); whiten(g); root.add(g); const up = g.userData.update; g.userData.update = (T) => up(T, STAD.cheer[key]); return g; };
  make(fansL, 'left'); make(fansR, 'right'); make(fansE, 'ends');

  // rim: columns with flags and banners
  const rimX = FX + 6 + TIERS * TD, rimZ = FZ + 6 + TIERS * TD, flagCols = [0xff4f9a, 0xffd23f, 0x36e0a8, 0x5fcfff, 0xa070ff, 0xff7a1a];
  let fi = 0;
  const flag = (x, z, ry) => {
    put(root, 'f/mini-column', x, 0, z, [3, 7 + TIERS * TH, 3]);
    const f = put(root, 'f/cast-flag-banner-long', x, 7 + TIERS * TH * 1.2, z, 2.4, ry);
    const col = new THREE.Color(flagCols[fi++ % flagCols.length]);
    f.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.lerp(col, 0.75); } });
  };
  for (let z = -FZ; z <= FZ; z += 12) { flag(-rimX, z, PI / 2); flag(rimX, z, -PI / 2); }
  for (let x = -FX + 6; x <= FX - 6; x += 12) { flag(x, -rimZ, 0); flag(x, rimZ, PI); }

  // the tunnel gate in the south stand
  put(root, 'f/mini-wall-gate', 0, 0, FZ + 6, [12, 7, 6], PI);
  put(root, 'f/mini-banner', -7, 0, FZ + 3, 4, PI); put(root, 'f/mini-banner', 7, 0, FZ + 3, 4, PI);

  // the stage and the league crown
  const { x: sx, z: sz } = STAD.stage;
  put(root, 'f/mini-block', sx, 0, sz, [14, 2.4, 8]);
  put(root, 'f/mini-stairs', sx, 0, sz + 5, [6, 2.4, 2], PI);
  for (const [dx, dz] of [[-6.5, -3.5], [6.5, -3.5], [-6.5, 3.5], [6.5, 3.5]]) put(root, 'f/mini-column', sx + dx, 1.2, sz + dz, [1.6, 4.5, 1.6]);
  put(root, 'f/mini-statue', sx - 4, 1.2, sz - 2, 2.2); put(root, 'f/mini-statue', sx + 4, 1.2, sz - 2, 2.2);
  put(root, 'f/mini-block', sx, 1.2, sz - 1, [2.4, 4, 2.4]);
  const crown = put(root, 'acc/Crown', sx, 4.4, sz - 1, 5.5);
  crown.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.emissive = new THREE.Color(0xffb000); o.material.emissiveIntensity = 0.55; o.material.metalness = 0.9; o.material.roughness = 0.2; } });
  crown.userData.update = (T) => { crown.rotation.y = T * 0.8; crown.position.y = 4.4 + Math.sin(T * 1.6) * 0.25; };
  STAD.crown = crown;

  // giant screen above the north stand
  const cv = document.createElement('canvas'); cv.width = 1600; cv.height = 900; drawScreen(cv, 'logo');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(40, 22.5), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  scr.position.set(0, 24, -(rimZ + 1)); root.add(scr);
  put(root, 'f/mini-block', 0, 11, -(rimZ + 1.8), [43, 51, 1.2]);
  put(root, 'f/mini-column', -18, 0, -(rimZ + 1.8), [3, 12, 3]); put(root, 'f/mini-column', 18, 0, -(rimZ + 1.8), [3, 12, 3]);
  STAD.screen = { mesh: scr, cv, tex, mode: 'logo', set(mode) { if (this.mode === mode) return; this.mode = mode; drawScreen(cv, mode); tex.needsUpdate = true; } };
  STAD.screen.mode = 'logo';
};
