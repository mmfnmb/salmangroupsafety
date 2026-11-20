// Before the lab: the story slides, the garage where you pick who you are, your own house at night, and the drive
// through the forest with Lina that ends against a tree.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Tree } from '../vendor/ez-tree.es.js';
import { inst, rigged, CHARS, FRIEND } from './assets.js';
import { material, boxGeo } from './world.js';
import { canvasTex, glow } from './level.js';
import { sfx, ringing, engine, setAmbient } from './audio.js';
import { t, LANG } from './i18n.js';

const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const STD = (color, rough = 0.6, metal = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
let envTex = null; function env(renderer) { if (!envTex) { const pm = new THREE.PMREMGenerator(renderer); envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture; } return envTex; }
export function subtitle(s, ms = 3500) { const e = $('sub'); e.textContent = s; e.hidden = !s; clearTimeout(e._t); if (s) e._t = setTimeout(() => (e.hidden = true), ms); }

// ---------------------------------------------------------------- 1. story slides (the six pictures)
export function storySlides() {
  return new Promise((done) => {
    const L = $('story'), img = $('storyImg'), cap = $('storyCap'), date = $('storyDate'); L.hidden = false; let i = 0, timer = 0;
    const show = () => { if (i >= 6) return finish(); img.classList.remove('in'); void img.offsetWidth; img.src = `assets/story/story${i + 1}.jpg`; img.classList.add('in'); date.textContent = t('story_d' + (i + 1)); cap.textContent = t('story_' + (i + 1)); clearTimeout(timer); timer = setTimeout(() => { i++; show(); }, 6200); };
    const finish = () => { clearTimeout(timer); L.hidden = true; $('storySkip').onclick = null; L.onclick = null; done(); };
    $('storySkip').onclick = (e) => { e.stopPropagation(); finish(); }; L.onclick = () => { i++; show(); }; show();
  });
}

// ---------------------------------------------------------------- shared: load a car, sized and without badges
export async function loadCar(id) {
  const o = await inst('car/' + id + '.glb'); o.updateMatrixWorld(true); let bb = new THREE.Box3().setFromObject(o); const sx = bb.max.x - bb.min.x, sz = bb.max.z - bb.min.z;
  const g = new THREE.Group(); g.add(o); if (sx > sz) o.rotation.y = Math.PI / 2; o.updateMatrixWorld(true); bb = new THREE.Box3().setFromObject(o);
  const s = 4.9 / Math.max(bb.max.z - bb.min.z, 0.01); o.scale.multiplyScalar(s); o.updateMatrixWorld(true); bb = new THREE.Box3().setFromObject(o);
  o.position.x -= (bb.min.x + bb.max.x) / 2; o.position.z -= (bb.min.z + bb.max.z) / 2; o.position.y -= bb.min.y;
  o.traverse((m) => { if (!m.isMesh) return; m.castShadow = true; const n = (m.name + ' ' + (m.material && m.material.name)).toLowerCase(); if (/logo|badge|emblem|symbols|manufacturerplate/.test(n)) m.visible = false; if (m.material && m.material.metalness > 0.5) m.material.envMapIntensity = 1.4; });
  return g;
}
async function person(id, clip = 'idle', h = 1.75) { const { obj, clips } = await rigged('hum/hum_' + id + '.glb'); obj.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(obj); obj.scale.multiplyScalar(h / (bb.max.y - bb.min.y)); obj.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  const mix = new THREE.AnimationMixer(obj); const c = clips.find((q) => q.name.includes(clip)) || clips[0]; if (c) mix.clipAction(c).play(); return { obj, mix, clips }; }

// ---------------------------------------------------------------- 2. the garage: pick who you are
export function selectCharacter(post, renderer) {
  return new Promise(async (done) => {
    const sc = new THREE.Scene(); sc.background = new THREE.Color(0x050608); sc.fog = new THREE.Fog(0x050608, 9, 24); sc.environment = env(renderer);
    const floor = mesh(boxGeo(30, 0.1, 30, 3), await material('concrete_floor_worn_001', 3)); floor.position.y = -0.05; sc.add(floor);
    const wall = mesh(boxGeo(30, 6, 0.3, 3), await material('Concrete049', 3, { color: 0x77797c })); wall.position.set(0, 3, -4); sc.add(wall);
    const spot = new THREE.SpotLight(0xfff0dd, 60, 18, 0.55, 0.6, 1.5); spot.position.set(0, 6, 2.5); spot.target.position.set(0, 0, -0.5); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); sc.add(spot, spot.target);
    const tube = mesh(new THREE.BoxGeometry(2.4, 0.05, 0.12), STD(0x111111, 0.4, 0, { emissive: 0xeef4ff, emissiveIntensity: 2 })); tube.position.set(0, 5.4, 0); sc.add(tube);
    sc.add(new THREE.HemisphereLight(0x8090a8, 0x101010, 0.35));
    const cam = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 60); if (window.__fitFov) window.__fitFov(cam, 42); cam.position.set(2.6, 1.3, 7.0); cam.lookAt(0.6, 0.45, -0.5);
    const L = $('garage'); L.hidden = false; let idx = 0, cur = null, alive = true, mix = null, busy = false; const cache = {};
    const fill = () => { const c = CHARS[idx]; $('gName').textContent = c.name; $('gJob').textContent = c.job; $('gCar').textContent = c.carName; $('gNum').textContent = `${idx + 1} / ${CHARS.length}`; };
    const load = async () => { if (busy) return; busy = true; fill(); const c = CHARS[idx]; $('gLoad').hidden = false;
      const key = c.id; if (!cache[key]) { const [car, p] = await Promise.all([loadCar(c.car), person(c.id, 'idle')]); car.position.set(-0.4, 0, -1.2); car.rotation.y = Math.PI / 2; p.obj.position.set(1.55, 0, 1.0); p.obj.rotation.y = -0.35; const g = new THREE.Group(); g.add(car, p.obj); cache[key] = { g, mix: p.mix }; }
      if (cur) sc.remove(cur); cur = cache[key].g; mix = cache[key].mix; sc.add(cur); $('gLoad').hidden = true; busy = false; };
    $('gPrev').onclick = () => { idx = (idx + CHARS.length - 1) % CHARS.length; sfx.click(); load(); }; $('gNext').onclick = () => { idx = (idx + 1) % CHARS.length; sfx.click(); load(); };
    $('gPick').onclick = () => { alive = false; L.hidden = true; sfx.pickup(); done(CHARS[idx]); };
    await load(); let last = performance.now();
    const loop = () => { if (!alive) return; requestAnimationFrame(loop); const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; if (mix) mix.update(dt); const tt = now / 1000; cam.position.x = 2.6 + Math.sin(tt * 0.2) * 0.5; cam.lookAt(0.6, 0.45, -0.5); tube.material.emissiveIntensity = Math.random() < 0.01 ? 0.2 : 2; post.render(sc, cam, dt); };
    loop();
  });
}

// ---------------------------------------------------------------- forest trees (EZ-Tree, MIT): a few generated, then copied
const treeCache = {};
export function trees(kind, n, seedBase = 1) { if (!treeCache[kind]) treeCache[kind] = [];
  const list = treeCache[kind]; while (list.length < n) { const tr = new Tree(); tr.loadPreset(kind); tr.options.seed = seedBase + list.length * 977; tr.generate(); tr.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(tr); tr.userData.h = bb.max.y - bb.min.y; tr.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; } }); list.push(tr); }
  return list; }
const placed = []; function placeTree(sc, src, x, z, h) { const tr = src.clone(); placed.push(tr); tr.scale.setScalar(h / (src.userData.h || 10)); tr.position.set(x, 0, z); tr.rotation.y = Math.random() * 6; sc.add(tr); return tr; }

// ---------------------------------------------------------------- 3. your house at night (you control it)
export async function houseLevel(ctx) {
  const { post, renderer, camera, P, char, LOW } = ctx;
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0x05070c); sc.fog = new THREE.FogExp2(0x05070c, 0.03); sc.environment = env(renderer); sc.environmentIntensity = 0.25;
  const boxes = []; const box = (x, z, w, d) => boxes.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
  const M = { floor: await material('wood_planks_dirt', 1.6, { color: 0xb08a68 }), wall: await material('plastered_wall_02', 2.5, { color: 0xe8e2d6 }), ceil: await material('painted_concrete', 3, { color: 0xf4f4f2 }), tile: await material('painted_concrete', 1, { color: 0xd8d6d0 }), brick: await material('brick_wall_10', 2.5), road: await material('asphalt_02', 4), grass: await material('forrest_ground_01', 4), gravel: await material('gravel_concrete', 3) };
  const H = 2.8; // house: x -6..6, z -5..5. Front door at z=5, x=1.5.
  const fl = mesh(boxGeo(12, 0.1, 10, 1.6), M.floor, 0, -0.05, 0); sc.add(fl); const ce = mesh(boxGeo(12, 0.1, 10, 3), M.ceil, 0, H + 0.05, 0); sc.add(ce);
  const wallSeg = (x, z, w, d, mat = M.wall) => { const m = mesh(boxGeo(w, H, d, 2.5), mat, x, H / 2, z); sc.add(m); box(x, z, w, d); return m; };
  // outer walls with a front door gap and two windows (window = night-blue glass)
  wallSeg(0, -5, 12, 0.2); wallSeg(-6, 0, 0.2, 10); wallSeg(6, 0, 0.2, 10); wallSeg(-2.5, 5, 7, 0.2); wallSeg(4.25, 5, 3.5, 0.2);
  // inner walls: living (left), kitchen (back right), bedroom (front right)
  wallSeg(1, -2.5, 0.15, 5); wallSeg(4.2, 0, 3.6, 0.15); wallSeg(1, 3.3, 0.15, 3.4);
  for (const [x, z, ry] of [[-3, -4.88, 0], [-5.88, 1, Math.PI / 2], [4, 4.88, Math.PI]]) { const w = mesh(new THREE.PlaneGeometry(1.6, 1.2), new THREE.MeshStandardMaterial({ color: 0x0a1424, emissive: 0x0c1830, emissiveIntensity: 1, roughness: 0.05, metalness: 0.4 }), x, 1.5, z); w.rotation.y = ry; sc.add(w); const fr = mesh(new THREE.BoxGeometry(1.7, 1.3, 0.06), STD(0xf0f0f0, 0.5), x, 1.5, z - Math.cos(ry) * 0.02); fr.rotation.y = ry; fr.scale.z = 0.3; sc.add(fr); }
  const doorM = new THREE.Group(); doorM.position.set(1.05, 0, 5); doorM.add(mesh(new THREE.BoxGeometry(1.4, 2.2, 0.06), STD(0x3a2416, 0.55), 0.7, 1.1, 0)); doorM.add(mesh(new THREE.SphereGeometry(0.035, 10, 8), STD(0xc8a050, 0.25, 1), 1.25, 1.0, 0.06)); sc.add(doorM);
  const header = mesh(boxGeo(1.5, H - 2.2, 0.2, 2.5), M.wall, 1.75, 2.2 + (H - 2.2) / 2, 5); sc.add(header);
  // furniture (Poly Haven, CC0)
  const prop = async (n, x, z, ry = 0, s = 1, solid = true, y = 0) => { const o = await inst('house/' + n + '.glb'); o.scale.setScalar(s); o.position.set(x, y, z); o.rotation.y = ry; o.traverse((m) => { if (m.isMesh) { m.castShadow = !LOW; m.receiveShadow = true; } }); sc.add(o); if (solid) { o.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(o); box((bb.min.x + bb.max.x) / 2, (bb.min.z + bb.max.z) / 2, bb.max.x - bb.min.x - 0.1, bb.max.z - bb.min.z - 0.1); } return o; };
  await prop('sofa_3seat', -3.2, -4.3, 0); await prop('coffee_table_marble', -3.2, -1.9, 0); await prop('armchair_swivel', -5.1, -0.8, Math.PI / 2); await prop('modern_wooden_cabinet', -5.6, 2.8, Math.PI / 2);
  await prop('mid_century_lounge_chair', -1.2, -0.6, -2.4); await prop('plant_small', -5.4, -4.4); await prop('artwork_canvas', -3.2, -4.86, 0, 1, false, 1.5); await prop('side_table_01', 0.2, 4.4, 0); await prop('table_lamp', 0.2, 4.4, 0, 1, false, 0.55);
  await prop('desk_wood', -1.4, 2.6, Math.PI); await prop('dining_chair_02', -1.4, 1.95, 0, 1, true);
  await prop('dining_table_oval', 3.6, -2.6, 0); for (const [x, z, r] of [[2.7, -2.6, Math.PI / 2], [4.5, -2.6, -Math.PI / 2]]) await prop('dining_chair_fabric', x, z, r, 1, true);
  await prop('steel_frame_shelves_03', 5.6, -4.3, -Math.PI / 2); await prop('bed_double', 4.4, 2.6, -Math.PI / 2); await prop('side_table_01', 5.5, 1.1); await prop('ceramic_vase_02', 3.2, -2.6, 0, 1, false, 0.75);
  await prop('modern_ceiling_lamp_01', -3.2, -2, 0, 1, false, H - 0.95);
  // kitchen counter
  const counter = mesh(new THREE.BoxGeometry(3.5, 0.9, 0.62), STD(0x2b2f33, 0.35, 0.1), 3.6, 0.45, -4.6); sc.add(counter); box(3.6, -4.6, 3.5, 0.62); const top = mesh(new THREE.BoxGeometry(3.55, 0.04, 0.66), STD(0xe8e6e0, 0.15), 3.6, 0.92, -4.6); sc.add(top);
  // a TV on the living-room wall, showing a quiet channel
  const tvTex = canvasTex(256, 144, (c) => { c.fillStyle = '#0a0f18'; c.fillRect(0, 0, 256, 144); c.fillStyle = '#1b2a44'; c.fillRect(0, 100, 256, 44); c.fillStyle = '#e9eef2'; c.font = 'bold 14px sans-serif'; c.fillText('NIGHT NEWS · 11:32 PM', 10, 122); });
  const tv = mesh(new THREE.BoxGeometry(1.5, 0.86, 0.05), STD(0x050505, 0.2, 0.5), -5.85, 1.5, -1.9); tv.rotation.y = Math.PI / 2; sc.add(tv); const tvS = mesh(new THREE.PlaneGeometry(1.44, 0.8), new THREE.MeshBasicMaterial({ map: tvTex }), -5.82, 1.5, -1.9); tvS.rotation.y = Math.PI / 2; sc.add(tvS);
  // the laptop on the desk: the news about Blackwood
  const lapTex = canvasTex(320, 200, (c) => { c.fillStyle = '#f4f4f2'; c.fillRect(0, 0, 320, 200); c.fillStyle = '#b3121b'; c.fillRect(0, 0, 320, 28); c.fillStyle = '#fff'; c.font = 'bold 15px sans-serif'; c.fillText('LOCAL NEWS', 10, 19); c.fillStyle = '#111'; c.font = 'bold 17px serif'; c.fillText('Blackwood lab: 37 years', 10, 56); c.fillText('of silence', 10, 76); c.font = '12px sans-serif'; ['Sealed by police on Oct 6, 1988.', 'No staff were ever found.', 'Locals still hear sounds at night.'].forEach((l, i) => c.fillText(l, 10, 104 + i * 18)); c.fillStyle = '#888'; c.fillRect(220, 40, 90, 60); });
  const lap = new THREE.Group(); lap.add(mesh(new THREE.BoxGeometry(0.34, 0.018, 0.24), STD(0x8a8f96, 0.3, 0.8))); const lid = new THREE.Group(); lid.position.set(0, 0.01, -0.12); lid.rotation.x = -1.85; lid.add(mesh(new THREE.BoxGeometry(0.34, 0.012, 0.24), STD(0x8a8f96, 0.3, 0.8), 0, 0, 0.12)); const ls = mesh(new THREE.PlaneGeometry(0.31, 0.2), new THREE.MeshBasicMaterial({ map: lapTex }), 0, -0.008, 0.12); ls.position.y = -0.008; ls.rotation.x = Math.PI / 2; lid.add(ls); lap.add(lid);
  lap.position.set(-1.4, 0.77, 2.55); lap.rotation.y = Math.PI; sc.add(lap); const lapLight = new THREE.PointLight(0xcfe0ff, 0.6, 2.5); lapLight.position.set(-1.4, 1.1, 2.3); sc.add(lapLight);
  // the car keys on the side table by the door
  const keys = new THREE.Group(); keys.add(mesh(new THREE.BoxGeometry(0.035, 0.012, 0.06), STD(0x111111, 0.3))); keys.add(mesh(new THREE.TorusGeometry(0.018, 0.003, 6, 16), STD(0xcccccc, 0.2, 1), 0, 0.006, 0.045)); keys.children[1].rotation.x = Math.PI / 2; keys.position.set(0.05, 0.6, 4.45); sc.add(keys); const kg = glow(0xffe0a0, 0.35); kg.position.set(0.05, 0.66, 4.45); sc.add(kg);
  // warm lamps inside, moonlight outside
  for (const [x, y, z, i] of [[-3.2, H - 0.7, -2, 6], [0.2, 1.1, 4.4, 2.2], [4.2, H - 0.3, 2.4, 2.5], [3.6, H - 0.3, -2.6, 3]]) { const l = new THREE.PointLight(0xffc98a, i, 9, 1.6); l.position.set(x, y, z); sc.add(l); }
  const moon = new THREE.DirectionalLight(0x8aa0d0, 0.5); moon.position.set(-20, 30, 25); moon.castShadow = !LOW; moon.shadow.mapSize.set(1024, 1024); Object.assign(moon.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20 }); sc.add(moon); sc.add(new THREE.HemisphereLight(0x223048, 0x080806, 0.35));
  // outside: front yard, brick front wall of the house, driveway, street lamp, your car, Lina waiting, the forest beyond
  for (const [x0, x1] of [[-6.2, 1.05], [2.45, 6.2]]) sc.add(mesh(boxGeo(x1 - x0, H + 0.6, 0.1, 2.5), M.brick, (x0 + x1) / 2, (H + 0.6) / 2, 5.16)); sc.add(mesh(boxGeo(1.4, H + 0.6 - 2.2, 0.1, 2.5), M.brick, 1.75, 2.2 + (H + 0.6 - 2.2) / 2, 5.16));
  const porch = new THREE.PointLight(0xffd29a, 3, 7, 1.6); porch.position.set(1.75, 2.5, 5.8); sc.add(porch);
  const yard = mesh(boxGeo(80, 0.1, 50, 4), M.grass, 0, -0.06, 30); sc.add(yard); const drive = mesh(boxGeo(4, 0.1, 14, 3), M.gravel, 1.5, -0.03, 12); sc.add(drive); const road = mesh(boxGeo(80, 0.1, 8, 4), M.road, 0, -0.02, 23); sc.add(road);
  const lamp = await inst('street/street_lamp_01.glb'); lamp.position.set(6, 0, 19); sc.add(lamp); const sl = new THREE.SpotLight(0xffd9a0, 40, 22, 0.7, 0.6, 1.4); sl.position.set(6, 5.5, 19); sl.target.position.set(4, 0, 15); sl.castShadow = !LOW; sc.add(sl, sl.target);
  const car = await loadCar(char.car); car.position.set(1.5, 0, 13); sc.add(car); box(1.5, 13, 2.1, 4.9);
  const lina = await person(FRIEND, 'idle'); lina.obj.position.set(3.3, 0, 13); lina.obj.rotation.y = -1.9; sc.add(lina.obj); box(3.3, 13, 0.5, 0.5);
  const pines = trees('Pine Large', LOW ? 2 : 3, 7);
  for (let i = 0; i < (LOW ? 26 : 50); i++) { const a = Math.random(); const x = (Math.random() - 0.5) * 70, z = 30 + Math.random() * 20; placeTree(sc, pines[i % pines.length], x, z, 14 + Math.random() * 10); }
  for (let i = 0; i < 14; i++) placeTree(sc, pines[i % pines.length], i % 2 ? -12 - Math.random() * 10 : 12 + Math.random() * 10, -8 + Math.random() * 26, 13 + Math.random() * 8);
  box(0, 27, 80, 0.5); box(-14, 10, 0.5, 40); box(14, 10, 0.5, 40); box(0, -6, 40, 0.5);
  // player
  sc.add(camera); P.place(0, -2.8, 1.2, 0.5); P.lightOn = false; P.locked = false; P.hidden = null; P.dead = false; P.ghost = false;
  const W = { collide(f, x, z, r) { for (const b of boxes) { const px = Math.max(b.x0, Math.min(x, b.x1)), pz = Math.max(b.z0, Math.min(z, b.z1)); const dx = x - px, dz = z - pz, d2 = dx * dx + dz * dz; if (d2 < r * r && d2 > 1e-8) { const d = Math.sqrt(d2); x += dx / d * (r - d); z += dz / d * (r - d); } } return [x, z]; } };
  $('loading').hidden = true; $('dead').hidden = true; $('hud').hidden = false; $('meters').hidden = true; $('inv').hidden = true;
  const goals = ['goal_laptop', 'goal_keys', 'goal_out', 'goal_car']; let step = 0; const goal = () => ($('objective').textContent = t(goals[step]));
  goal(); subtitle(t('house_hint'), 5000); setAmbient(0.12);
  let alive = true, last = performance.now(), doorOpen = 0, panel = false;
  const near = (x, z, r) => Math.hypot(P.x - x, P.z - z) < r;
  const prompt = () => { if (panel) return ''; if (step === 0 && near(-1.4, 2.55, 1.6)) return t('read_news'); if (step === 1 && near(0.05, 4.45, 1.5)) return t('take_keys'); if (step === 3 && near(0.4, 13, 2.2)) return t('get_in'); return ''; };
  return new Promise((done) => {
    const use = () => { const p = prompt(); if (!p) return; sfx.click();
      if (step === 0) { panel = true; if (document.pointerLockElement) document.exitPointerLock(); const N = $('panel'); N.innerHTML = `<div class="pbox news"><div class="phead"><b>${t('news_title')}</b><button class="pclose" id="pclose">${t('close')}</button></div><div class="newsBody"><h3>${t('news_h')}</h3><p class="newsDate">${t('news_date')}</p><p>${t('news_p1')}</p><p>${t('news_p2')}</p><div class="chat"><b>Lina</b><span>${t('lina_msg')}</span></div></div></div>`; N.hidden = false;
        N.querySelector('#pclose').onclick = () => { N.hidden = true; panel = false; step = 1; goal(); sfx.voice(0); subtitle(t('lina_outside'), 4000); }; }
      else if (step === 1) { keys.visible = false; kg.visible = false; sfx.pickup(); step = 2; goal(); }
      else if (step === 3) { alive = false; $('objective').textContent = ''; window.removeEventListener('keydown', onKey); $('bUse').onclick = null; done({ car, lina, sc }); } };
    const onKey = (e) => { if (e.code === 'KeyE') use(); }; addEventListener('keydown', onKey); ctx.setUse(use);
    const loop = () => { if (!alive) return; requestAnimationFrame(loop); const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
      // the front door opens once you have the keys
      if (step >= 2) { doorOpen = Math.min(1, doorOpen + dt); doorM.rotation.y = doorOpen * 1.5; if (step === 2 && P.z > 5.6) { step = 3; goal(); subtitle(t('lina_hey'), 3500); sfx.voice(0.3); } }
      if (step < 2 && P.z > 4.7) P.z = 4.7; if (!panel) P.update(dt, W); else P.update(0, W); lina.mix.update(dt);
      lina.obj.rotation.y = Math.atan2(P.x - lina.obj.position.x, P.z - lina.obj.position.z);
      const pr = prompt(); $('prompt').textContent = pr; $('prompt').hidden = !pr; $('bUse').textContent = pr || t('use');
      post.expTarget = P.z > 5 ? 1.25 : 1; post.render(sc, camera, dt); };
    loop();
  });
}

// ---------------------------------------------------------------- 4. the drive: first person, no control
export async function driveCutscene(ctx, house) {
  const { post, renderer, LOW } = ctx;
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0x070a10); sc.fog = new THREE.FogExp2(0x0a0e14, 0.045); sc.environment = env(renderer); sc.environmentIntensity = 0.15;
  sc.add(new THREE.HemisphereLight(0x3a4a68, 0x0a0806, 0.35)); const moon = new THREE.DirectionalLight(0x8aa0d0, 0.35); moon.position.set(-30, 40, 10); sc.add(moon);
  const LEN = 520, road = mesh(boxGeo(7, 0.1, LEN, 4), await material('asphalt_02', 4), 0, -0.05, -LEN / 2 + 20); sc.add(road);
  const ground = mesh(boxGeo(120, 0.1, LEN, 4), await material('brown_mud_leaves_01', 3), 0, -0.08, -LEN / 2 + 20); sc.add(ground);
  // road lines
  const lineM = STD(0xe8e2c8, 0.6, 0, { emissive: 0x111111 }); for (let z = 15; z > -LEN + 20; z -= 9) { const l = mesh(new THREE.BoxGeometry(0.14, 0.02, 3.2), lineM, 0, 0.01, z); l.castShadow = false; sc.add(l); }
  // forest along both sides (copies of a few generated pines and oaks)
  placed.length = 0; const pines = trees('Pine Large', LOW ? 2 : 4, 11), oaks = trees('Oak Large', LOW ? 1 : 2, 31);
  for (let z = 30; z > -LEN + 10; z -= LOW ? 9 : 6) for (const side of [-1, 1]) { const x = side * (5.5 + Math.random() * 9); const src = Math.random() < 0.8 ? pines[(Math.random() * pines.length) | 0] : oaks[(Math.random() * oaks.length) | 0]; placeTree(sc, src, x, z + Math.random() * 3, 12 + Math.random() * 10); if (!LOW && Math.random() < 0.35) placeTree(sc, pines[0], side * (16 + Math.random() * 25), z, 14 + Math.random() * 8); }
  // the tree you hit, right side, at the bend
  const crashZ = -330, killer = placeTree(sc, oaks[0], 4.6, crashZ - 6, 15); const forest = placed.slice(); let cullT = 0;
  // the car: your model outside, a dashboard and Lina inside
  const car = house.car; car.position.set(0, 0, 0); car.rotation.set(0, 0, 0); const rig = new THREE.Group(); rig.add(car); sc.add(rig); car.rotation.y = 0;
  // find the driver's side: the steering wheel and gauges make that side of the dashboard denser
  car.updateMatrixWorld(true); const cb = new THREE.Box3().setFromObject(car), ch = cb.max.y - cb.min.y, cw = cb.max.x - cb.min.x; let left = 0, right = 0; const v = new THREE.Vector3();
  car.traverse((m) => { if (!m.isMesh || !m.geometry.attributes.position) return; const pa = m.geometry.attributes.position; for (let i = 0; i < pa.count; i += 3) { v.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld);
    if (v.y > ch * 0.5 && v.y < ch * 0.75 && v.z > -1.3 && v.z < -0.3) { if (v.x < -0.15 && v.x > -cw * 0.4) left++; else if (v.x > 0.15 && v.x < cw * 0.4) right++; } } });
  const side = right > left * 1.15 ? 1 : -1, eye = ch * 0.79 + 0.04;
  const dashLight = new THREE.PointLight(0xff9a50, 0.25, 1.4); dashLight.position.set(side * 0.3, eye - 0.2, -0.7); rig.add(dashLight);
  const lina = await person(FRIEND, 'sit', 1.7); lina.obj.position.set(-side * cw * 0.2, eye - 1.12, 0.12); lina.obj.rotation.y = Math.PI; rig.add(lina.obj);
  // headlights
  const heads = []; for (const s of [-1, 1]) { const h = new THREE.SpotLight(0xfff4dc, 70, 70, 0.42, 0.45, 1.3); h.position.set(s * 0.65, 0.75, -2.75); h.target.position.set(s * 0.4, 0, -30); h.castShadow = false; rig.add(h, h.target); heads.push(h); }
  const cam = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 260); if (window.__fitFov) window.__fitFov(cam, 70); addEventListener('resize', () => window.__fitFov && window.__fitFov(cam, 70)); let camX = side * cw * 0.19; cam.position.set(camX, eye, 0.12); rig.add(cam);
  // your own body in the driver's seat, hands on the wheel (two-bone reach solved every frame)
  const wc = new THREE.Vector3(); let nW = 0; car.traverse((m) => { if (!m.isMesh || !m.geometry.attributes.position) return; const pa = m.geometry.attributes.position; for (let i = 0; i < pa.count; i += 2) { v.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld);
    if (Math.abs(v.x - camX) < 0.28 && v.y > eye - 0.75 && v.y < eye - 0.15 && v.z > -0.95 && v.z < -0.25) { wc.add(v); nW++; } } });
  if (nW) wc.divideScalar(nW); else wc.set(camX, eye - 0.38, -0.5);
  // sit straight behind the wheel that was found, whatever side the car drives on
  if (nW > 30) { camX = wc.x; cam.position.x = camX; }
  window.__drv = { side, left, right, nW, wc: wc.toArray().map((v) => +v.toFixed(2)), camX: +camX.toFixed(2), cw: +cw.toFixed(2), ch: +ch.toFixed(2), eye: +eye.toFixed(2) };
  const wheelAxis = new THREE.Vector3(0, 0.35, 1).normalize(); const pivot = new THREE.Group(); pivot.position.copy(wc); pivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), wheelAxis); rig.add(pivot); rig.updateMatrixWorld(true);
  const turners = []; car.traverse((m) => { if (!m.isMesh) return; const b = new THREE.Box3().setFromObject(m), c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3()); if (c.distanceTo(wc) < 0.2 && Math.max(sz.x, sz.y, sz.z) < 0.5) turners.push(m); });
  const spin = new THREE.Group(); pivot.add(spin); for (const m of turners) spin.attach(m);
  const me = await person((ctx.char || CHARS[0]).id, 'sit', 1.75); me.obj.position.set(camX, eye - 1.12, 0.17); me.obj.rotation.y = Math.PI; rig.add(me.obj);
  const bone = (re) => { let b = null; me.obj.traverse((o) => { if (!b && o.isBone && re.test(o.name)) b = o; }); return b; };
  const head = bone(/head$/i); if (head) head.scale.setScalar(0.001);
  const fingers = []; me.obj.traverse((o) => { if (o.isBone && /finger\d/i.test(o.name) && !/finger0/i.test(o.name)) fingers.push(o); });
  const curl = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.95));
  const arms = ['L', 'R'].map((sd) => ({ sd, up: bone(new RegExp(sd + '.?UpperArm', 'i')), fo: bone(new RegExp(sd + '.?Fore.?arm', 'i')), ha: bone(new RegExp(sd + '.?Hand$', 'i')) })).filter((a) => a.up && a.fo && a.ha);
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qp = new THREE.Quaternion(), S0 = new THREE.Vector3(), E0 = new THREE.Vector3(), W0 = new THREE.Vector3(), tmp = new THREE.Vector3();
  const turnTo = (b, from, to) => { qa.setFromUnitVectors(from.clone().normalize(), to.clone().normalize()); b.getWorldQuaternion(qb); b.parent.getWorldQuaternion(qp); b.quaternion.copy(qp.invert().multiply(qa.multiply(qb))); b.updateMatrixWorld(true); };
  const reach = (a, target) => { a.up.updateWorldMatrix(true, true); a.up.getWorldPosition(S0); a.fo.getWorldPosition(E0); a.ha.getWorldPosition(W0);
    const l1 = S0.distanceTo(E0), l2 = E0.distanceTo(W0), toT = target.clone().sub(S0); const d = Math.min(toT.length(), (l1 + l2) * 0.999); toT.setLength(d);
    // elbow: in the plane of shoulder, target and a pole below and to the outside
    const pole = S0.clone().add(new THREE.Vector3((a.sd === 'L' ? -1 : 1) * 0.35, -0.6, 0.1)).sub(S0); const dir = toT.clone().normalize(); const side = pole.sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
    const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - x * x)); const elbow = S0.clone().add(dir.clone().multiplyScalar(x)).add(side.multiplyScalar(h));
    turnTo(a.up, E0.clone().sub(S0), elbow.clone().sub(S0)); a.fo.getWorldPosition(E0); a.ha.getWorldPosition(W0); turnTo(a.fo, W0.clone().sub(E0), S0.clone().add(toT).sub(E0)); };
  let steer = 0; const grip = (sd) => { const a = (sd === 'L' ? -1.05 : 1.05) + steer; return pivot.localToWorld(new THREE.Vector3(Math.sin(a) * 0.155, Math.cos(a) * 0.15 - 0.01, 0.02)); };
  $('hud').hidden = true; $('fade').classList.remove('on');
  engine(true);
  return new Promise((done) => {
    let tt = 0, z = 0, v = 16, last = performance.now(), yaw = 0, look = 0, crashed = false, shake = 0; const lines = [[1.2, 'drive_date'], [4.5, 'lina_1'], [9.5, 'you_1'], [14, 'lina_2'], [19, 'brakes_1'], [22.5, 'lina_3'], [25.5, 'brakes_2']]; let li = 0;
    const loop = () => { if (crashed && tt > 31) { engine(false); done(); return; } requestAnimationFrame(loop); const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000) * (window.__ts || 1); last = now; tt += dt;
      while (li < lines.length && tt > lines[li][0]) { subtitle(t(lines[li][1]), 3600); if (lines[li][1].startsWith('lina')) sfx.voice(0.4); li++; }
      if (!crashed) {
        if (tt > 19) { v = Math.min(36, v + dt * 2.2); if (Math.random() < dt * 3) sfx.click(); } // brakes fail: downhill and faster
        if (tt > 26) { yaw += dt * 0.55; v *= 1 - dt * 0.15; if (Math.random() < dt * 8) sfx.skid(); } // skid towards the tree
        z -= v * dt * Math.cos(yaw); const x = rig.position.x + v * dt * Math.sin(yaw) * 0.9; rig.position.set(Math.min(4.2, x), 0, z); rig.rotation.y = -yaw;
        engine(true, v / 36);
        look += (((tt > 4 && tt < 7) || (tt > 14 && tt < 16.5) ? 0.9 : tt > 22 && tt < 24 ? 0.6 : 0) - look) * Math.min(1, dt * 2.5); cam.rotation.set(-0.1 + Math.sin(tt * 1.7) * 0.004, side * look * 0.9, 0, 'YXZ');
        if (rig.position.x >= 4.1 || tt > 29) { crashed = true; tt = 29; sfx.crash(); post.glitch(0.6); shake = 1; $('flash2').classList.add('on'); setTimeout(() => { $('flash2').classList.remove('on'); $('fade').classList.add('on'); engine(false); ringing(4); setAmbient(0); subtitle('', 1); }, 160); }
      } else { shake = Math.max(0, shake - dt * 2); }
      cam.position.x = camX + (Math.random() - 0.5) * shake * 0.12; cam.position.y = eye + (Math.random() - 0.5) * shake * 0.12 + Math.sin(tt * 13) * 0.003 * Math.min(1, v / 20);
      cullT -= dt; if (cullT <= 0) { cullT = 0.25; const rz = rig.position.z; for (const tr of forest) tr.visible = tr.position.z < rz + 25 && tr.position.z > rz - (LOW ? 70 : 110); }
      steer = crashed ? steer : tt > 26 ? Math.sin((tt - 26) * 5) * 1.3 : tt > 19 ? Math.sin(tt * 3) * 0.12 : Math.sin(tt * 0.7) * 0.04; spin.rotation.z = -steer;
      me.mix.update(dt); rig.updateMatrixWorld(true); for (const a of arms) reach(a, grip(a.sd));
      lina.mix.update(dt); post.render(sc, cam, dt); };
    loop();
  });
}
