// Night Holes – game flow: menu, story, garage, house, drive, the lab run, catches, the bomb ending.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { World, FLOOR_Y, cellCenter, toCell, cellAt, WH, MAPS, material, boxGeo } from './world.js';
import { populate, placeBodies, itemPlan, spawnItems, mapCanvas, canvasTex } from './level.js';
import { Player, bindTouch } from './player.js';
import { Monster, think, KINDS } from './monsters.js';
import { PUZZLES, close as closePanel, isOpen as panelOpen } from './puzzles.js';
import { audioStart, sfx, setHeartbeat, setAmbient, setTension, ringing, volume } from './audio.js';
import { loadAll, rigged, CHARS, FRIEND, ZOMBIE_PRICE } from './assets.js';
import { Post } from './post.js';
import { storySlides, selectCharacter, houseLevel, driveCutscene, subtitle, trees, loadCar } from './intro.js';
import * as net from './net.js';
import { t, LANG, setLang } from './i18n.js';

const $ = (id) => document.getElementById(id);
const MOBILE = matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
let HIGH = (() => { try { const v = localStorage.getItem('nh_q'); return v ? v === 'high' : !MOBILE; } catch (e) { return !MOBILE; } })();
const LOW = !HIGH;
const renderer = new THREE.WebGLRenderer({ canvas: $('view'), antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x020304); scene.fog = new THREE.FogExp2(0x020304, 0.06);
scene.add(new THREE.HemisphereLight(0x22304a, 0x0a0808, 0.5));
{ const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.12; }
const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 70);
const post = new Post(renderer, scene, camera); post.setQuality(HIGH);
function resize() { post.resize(); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

let seed = 1; const rng = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
let W = null, P = null, S = null, monsters = [], items = [], others = new Map(), lightPool = [], game = null, host = true, role = 'human', zombiePid = null, char = CHARS[0], shadowMan = null;
let useHook = null;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- menus
function ui() {
  document.querySelectorAll('[data-t]').forEach((e) => (e.textContent = t(e.dataset.t)));
  const pr = net.getProfile(); if (pr) $('coins').textContent = `${pr.coins} ${t('coins')} · ${pr.tickets} ${t('tickets')}`;
  $('btnQuality').textContent = `${t('quality')}: ${HIGH ? t('q_high') : t('q_low')}`;
}
function show(id) { for (const s of ['menu', 'lobby', 'shop', 'loading', 'hud', 'dead', 'results']) $(s).hidden = s !== id; }
function ensurePlayer() { if (!P) { P = new Player(camera, scene, LOW); P.onKey = keyAction; bindTouch($('touch'), P); } }
$('btnLang').onclick = () => { setLang(LANG === 'ar' ? 'en' : 'ar'); ui(); renderLobby(); };
$('btnQuality').onclick = () => { HIGH = !HIGH; try { localStorage.setItem('nh_q', HIGH ? 'high' : 'low'); } catch (e) {} post.setQuality(HIGH); ui(); };
$('btnNew').onclick = () => { audioStart(); newGame(); };
$('btnSolo').onclick = () => { audioStart(); host = true; role = 'human'; char = CHARS.find((c) => c.id === net.getProfile().skin) || CHARS[0]; startGame(Math.floor(Math.random() * 1e9), null, {}); };
$('btnCreate').onclick = async () => { audioStart(); if (!net.online()) return toast(t('online_off')); const code = Math.random().toString(36).slice(2, 6).toUpperCase(); await enterLobby(code, true); };
$('btnJoin').onclick = async () => { audioStart(); if (!net.online()) return toast(t('online_off')); const code = ($('joinCode').value || '').trim(); if (code.length < 3) return; await enterLobby(code, false); };
$('btnShop').onclick = () => { show('shop'); renderShop(); };
$('shopBack').onclick = () => show('menu');
$('lobbyBack').onclick = () => { net.leaveRoom(); show('menu'); };
$('btnMenu').onclick = $('btnMenu2').onclick = () => location.reload();
$('btnRetry').onclick = () => { startGame(Math.floor(Math.random() * 1e9), null, {}); };
const reqLock = () => { if (!MOBILE && !panelOpen() && !$('hud').hidden && $('view').requestPointerLock) $('view').requestPointerLock(); };
$('touch').addEventListener('click', reqLock); $('view').addEventListener('click', reqLock);

// the whole first evening: story, garage, house, the drive, then the lab
async function newGame() {
  $('menu').hidden = true; await storySlides();
  char = await selectCharacter(post, renderer); const pr = net.getProfile(); pr.skin = char.id; net.saveProfile();
  ensurePlayer(); show('hud'); $('mobileBtns').hidden = !MOBILE; $('controlsHelp').hidden = true;
  const house = await houseLevel({ post, renderer, camera, P, char, LOW, setUse: (f) => (useHook = f) });
  useHook = null; if (document.pointerLockElement) document.exitPointerLock(); $('fade').classList.add('on'); await wait(700);
  await driveCutscene({ post, renderer, LOW }, house);
  await wait(2600); host = true; role = 'human'; startGame(Math.floor(Math.random() * 1e9), null, { intro: true });
}

// ---------------------------------------------------------------- lobby (online)
let lobby = { code: '', host: false, peers: [], useZombie: false };
async function enterLobby(code, isHost) {
  lobby = { code, host: isHost, peers: [], useZombie: false }; await net.joinRoom(code); show('lobby'); $('lobbyCode').textContent = code;
  let nPeers = 0; net.onPeers((arr) => { lobby.peers = arr; if (arr.length !== nPeers) { nPeers = arr.length; renderLobby(); if (game && host) net.emit('sync', fullState()); } });
  net.on('ev', (d) => { if (d.t === 'start' && !game) { host = false; zombiePid = d.zombie; role = d.zombie === net.PID ? 'monster' : 'human'; startGame(d.seed, d.zombie, {}); } else if (game) applyEvent(d); });
  net.on('mon', (d) => { if (game && !host) applyMonsters(d); });
  net.on('sync', (d) => { if (game && !host) applySync(d); });
  setInterval(() => { if (!game) net.presence({ name: myName(), skin: net.getProfile().skin, lobby: 1, host: lobby.host, zombie: lobby.useZombie }, true); }, 700);
  renderLobby();
}
function myName() { const c = CHARS.find((q) => q.id === net.getProfile().skin) || CHARS[0]; return c.name + ' ' + net.PID.slice(0, 2).toUpperCase(); }
function renderLobby() {
  if ($('lobby').hidden) return; const pr = net.getProfile();
  $('lobbyList').innerHTML = [{ pid: net.PID, name: myName(), host: lobby.host, zombie: lobby.useZombie }, ...lobby.peers.filter((p) => p.pid !== net.PID)].map((p) => `<li>${p.name || p.pid}${p.pid === net.PID ? ` (${t('you')})` : ''}${p.host ? ` · ${t('host')}` : ''}${p.zombie ? ' · ' + t('zombie') : ''}</li>`).join('');
  $('btnStart').hidden = !lobby.host; $('lobbyWait').hidden = lobby.host;
  $('zTickets').textContent = `${pr.tickets} ${t('tickets')}`; $('zUse').checked = lobby.useZombie; $('zUse').disabled = pr.tickets < 1;
}
$('zUse').onchange = (e) => { lobby.useZombie = e.target.checked; renderLobby(); };
$('btnStart').onclick = () => {
  const zs = [{ pid: net.PID, zombie: lobby.useZombie }, ...lobby.peers].filter((p) => p.zombie); const z = zs.length && lobby.peers.length ? zs[0].pid : null;
  const sd = Math.floor(Math.random() * 1e9); net.emit('ev', { t: 'start', seed: sd, zombie: z }); host = true; zombiePid = z; role = z === net.PID ? 'monster' : 'human'; startGame(sd, z, {});
};
function renderShop() { const pr = net.getProfile(); $('shopCoins').textContent = `${pr.coins} ${t('coins')}`; $('shopTickets').textContent = `${pr.tickets} ${t('tickets')}`; $('shopBuy').textContent = `${t('buy')} · ${ZOMBIE_PRICE}`;
  $('shopBuy').onclick = () => { if (pr.coins < ZOMBIE_PRICE) return toast(t('not_enough')); pr.coins -= ZOMBIE_PRICE; pr.tickets++; sfx.pickup(); net.saveProfile(); renderShop(); ui(); }; }
let toastT = 0; function toast(s, long) { const e = $('toast'); e.textContent = s; e.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (e.hidden = true), long ? 4200 : 2400); }

// ---------------------------------------------------------------- start a run
async function startGame(sd, zombie, opts) {
  show('loading'); $('loadBar').style.width = '0%'; $('fade').classList.remove('on'); subtitle('', 1);
  for (const g of W ? W.groups : []) scene.remove(g); for (const m of monsters) if (m.root) scene.remove(m.root); for (const o of others.values()) if (o.root) scene.remove(o.root);
  monsters = []; items = []; others = new Map(); seed = (sd % 2147483646) + 1;
  const files = ['mat/plastered_wall_02.glb', 'house/desk_wood.glb', 'street/Barrel_01.glb', ...Object.values(KINDS).map((k) => k.file)];
  await loadAll(files, (p) => ($('loadBar').style.width = (p * 50) + '%'));
  ensurePlayer(); scene.add(camera);
  W = new World(scene, LOW); S = makeState(); await W.build(rng); $('loadBar').style.width = '62%';
  await populate(W, rng, S); $('loadBar').style.width = '75%';
  S.bodies = await placeBodies(W, rng, FRIEND); await spawnItems(W, itemPlan(rng), rng, items); $('loadBar').style.width = '88%';
  W.roomOn = {};
  // monsters: positions decided from the seed so every client builds the same lab
  const at = (f, x, z) => { const [a, b] = cellCenter(x, z); return [f, a, b]; };
  const defs = [['gaunt', 0, S.tube.x, S.tube.z, null], ['matron', ...at(0, 6, 9), ['M', 'C', 'H', 'B']], ['dog', ...at(1, 7, 1), ['W', 'H', 'K', 'L']], ['wretch', 0, 0, 0, null], ['deer', ...at(2, 4, 7), ['H']], ['wendigo', ...at(2, 7, 1), ['Z', 'H', 'Q', 'R']]];
  for (const [k, f, x, z, home] of defs) { const m = new Monster(k, f, x, z, home); await m.load(scene); monsters.push(m); }
  const gaunt = monsters[0]; gaunt.active = true; gaunt.inTube = true; gaunt.yaw = 0; gaunt.obj.scale.multiplyScalar(0.78); gaunt.play('idle');
  monsters[3].timer = 70; monsters[3].alpha = 0;
  Monster.onBang = (m, d) => { if (m.f !== P.f) return; const dx = d.center[0] - P.x, dz = d.center[1] - P.z, dist = Math.hypot(dx, dz); if (dist < 24) sfx.bang(Math.sin(-(Math.atan2(dx, dz) - (P.yaw + Math.PI))), Math.max(0.2, 1 - dist / 24)); };
  // a black silhouette that sometimes crosses the far end of a hall
  if (!shadowMan) { const { obj, clips } = await rigged('hum/hum_Business_Male_01.glb'); obj.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(obj); obj.scale.multiplyScalar(1.85 / (bb.max.y - bb.min.y)); obj.traverse((q) => { if (q.isMesh) q.material = new THREE.MeshBasicMaterial({ color: 0x000000 }); });
    const mix = new THREE.AnimationMixer(obj); const c = clips.find((q) => /run/.test(q.name)); if (c) mix.clipAction(c).play(); shadowMan = { obj, mix, t: 0 }; }
  scene.add(shadowMan.obj); shadowMan.obj.visible = false;
  // where you wake: the storage room, next to Lina
  const [kx, kz] = cellCenter(2, 1); P.place(0, kx + 0.6, kz + 0.4, 0); const fr = S.bodies.friend.position; P.yaw = Math.atan2(-(fr.x - P.x), -(fr.z - P.z)); P.pitch = -0.55;
  Object.assign(P, { dead: false, ghost: false, hidden: null, battery: 1, stamina: 1, locked: false, crouch: false, lightOn: true, lighterOn: false, adrT: 0, scentT: 0 });
  if (role === 'monster') { P.place(0, S.tube.x, S.tube.z + 2, 0); P.locked = true; P.lightOn = false; }
  if (!lightPool.length) for (let i = 0; i < (LOW ? 4 : 8); i++) { const l = new THREE.PointLight(0xffe7c2, 0, 9, 1.7); scene.add(l); lightPool.push(l); }
  game = { t: 0, end: false, monT: 0, escaped: false, tubeAt: role === 'monster' || zombie ? 60 : 180, warn: 0, earned: 0, nextEvent: 25, rideN: 0, traps: [], bombT: null, b2Seen: false, scareA: null, shake: 0 };
  $('loadBar').style.width = '100%';
  await wait(250); show('hud'); $('meters').hidden = false; $('inv').hidden = false; $('objective').textContent = '';
  $('mobileBtns').hidden = !MOBILE; $('controlsHelp').hidden = MOBILE; $('controlsHelp').textContent = t('controls2');
  if (opts.intro) { P.locked = true; $('eyes').classList.remove('blink'); void $('eyes').offsetWidth; $('eyes').classList.add('blink'); ringing(3); setAmbient(0.3);
    setTimeout(() => subtitle(t('wake_1'), 3500), 1500); setTimeout(() => subtitle(t('wake_2'), 3000), 5200); setTimeout(() => { P.locked = false; floorBanner(0); toast(t('hint_start'), true); }, 6000); }
  else { floorBanner(0); toast(role === 'monster' ? t('monster_you') : t('hint_start'), true); setAmbient(0.4); }
  updateHud();
}
function makeState() {
  const digits = () => String(Math.floor(rng() * 10));
  const w = [120, 80, 45, 200, 65].map((v) => v + Math.floor(rng() * 4) * 5); const pickSet = [0, 2, 4].filter(() => rng() > 0.2); if (pickSet.length < 2) pickSet.push(1);
  return {
    inv: {}, notes: {}, safeCode: digits() + digits() + digits(), safeCams: [0, 1, 2].map(() => Math.floor(rng() * 4)),
    scaleW: w, scaleTarget: pickSet.reduce((a, i) => a + w[i], 0), chart: [0, 1, 2, 3].map(() => Math.floor(rng() * 4)), slotOrder: ['r', 'y', 'b'].sort(() => rng() - 0.5),
    wireR: [0, 1, 2, 3].sort(() => rng() - 0.5), exitCode: digits() + digits() + digits() + digits(), solved: {}, power: false, tubeBroken: false, knowChart: false, itemsTaken: 0, elev: {}, foundTape: false, used: {},
  };
}

// ---------------------------------------------------------------- input actions
function keyAction(code) {
  if (useHook) return; // the house handles its own use key
  if (!game || game.end) return;
  if (code === 'KeyE') useNearest(); else if (code === 'KeyF') toggleLight(); else if (code === 'KeyC') P.crouch = !P.crouch; else if (code === 'KeyG') throwBottle(); else if (code === 'KeyJ') toggleJournal();
  else if (code === 'KeyQ') useAdrenaline(); else if (code === 'KeyT') setTrap(); else if (code === 'KeyL') toggleLighter();
  else if (code === 'Escape' && panelOpen()) closePanel();
}
$('bUse').onclick = () => (useHook ? useHook() : useNearest()); $('bLight').onclick = () => toggleLight(); $('bCrouch').onclick = () => { P.crouch = !P.crouch; $('bCrouch').classList.toggle('on', P.crouch); };
$('bThrow').onclick = () => throwBottle(); $('bNotes').onclick = () => toggleJournal(); $('bAdr').onclick = () => useAdrenaline(); $('bTrap').onclick = () => setTrap(); $('bLighter').onclick = () => toggleLighter();
$('bRun').addEventListener('touchstart', (e) => { P.runBtn = true; e.preventDefault(); }, { passive: false }); $('bRun').addEventListener('touchend', () => (P.runBtn = false));
function toggleLight() { if (!P) return; if (P.battery <= 0) { toast(t('battery_dead')); return; } P.lightOn = !P.lightOn; sfx.click(); }
function toggleLighter() { if (!S || !S.inv.lighter) return; P.lighterOn = !P.lighterOn; sfx.lighter(); }
function useAdrenaline() { if (!S || !S.inv.adrenaline || P.dead) return; S.inv.adrenaline--; P.adrT = 10; sfx.pickup(); toast(t('adr_on')); post.glitch(0.2); updateHud(); }
function setTrap() { if (!S || !S.inv.trap || P.dead || P.hidden) return; S.inv.trap--; const g = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16), new THREE.MeshStandardMaterial({ color: 0x9a1010, roughness: 0.4, metalness: 0.4 })); g.position.set(P.x, 0.03, P.z); W.groups[P.f].add(g); game.traps.push({ f: P.f, x: P.x, z: P.z, t: 10, obj: g, tick: 0 }); toast(t('trap_set')); sfx.click(); updateHud(); }
function toggleJournal() {
  const j = $('journal'); if (!j.hidden) { j.hidden = true; return; } if (!S) return;
  const code = [0, 1, 2, 3].map((i) => S.notes[i] != null ? S.notes[i] : '_').join(' ');
  const inv = Object.keys(S.inv).filter((k) => S.inv[k]).map((k) => `<li>${t(k)}${['bottle', 'battery', 'adrenaline', 'trap'].includes(k) ? ' ×' + S.inv[k] : ''}</li>`).join('');
  j.innerHTML = `<b>${t('journal')}</b><p>${t('clue_exit')}: <span class="mono">${code}</span></p>${S.knowChart ? `<p>${t('clue_chart')}: <span class="mono">${S.chart.map((a) => '↑→↓←'[a]).join(' ')}</span></p>` : ''}<ul>${inv}</ul>`; j.hidden = false;
}
function throwBottle() {
  if (!S || !S.inv.bottle || P.hidden || P.dead) return; S.inv.bottle--; const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  let [cx, cz] = [P.x + dir.x * 7, P.z + dir.z * 7]; for (let i = 7; i > 0; i -= 0.5) { const tx = P.x + dir.x * i, tz = P.z + dir.z * i; if (W.los(P.f, P.x, P.z, tx, tz)) { cx = tx; cz = tz; break; } }
  setTimeout(() => { sfx.bottle(0, 1); makeDistraction(P.f, cx, cz, 6); net.emit('ev', { t: 'noise', f: P.f, x: cx, z: cz }); }, 450); updateHud();
}
let distraction = null; function makeDistraction(f, x, z, sec = 6) { distraction = { f, x, z, t: sec }; }

// nearest interactable in front of the player
function nearest() {
  let best = null, bd = 9; const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  for (const i of W.inter) { if (i.f !== P.f || i.taken) continue; const dx = i.x - P.x, dz = i.z - P.z, d = Math.hypot(dx, dz); if (d > i.r) continue;
    const dot = (dx * fx + dz * fz) / (d || 1); const score = d - dot * 0.8; if (dot > -0.2 || d < 0.9) if (score < bd) { bd = score; best = i; } }
  return best;
}
function promptFor(i) {
  if (!i) return ''; if (P.hidden) return t('leave');
  switch (i.kind) { case 'item': return `${t('take')}: ${t(i.type)}`; case 'locker': return t('hide');
    case 'door': return i.door.lock && !i.door.unlocked ? t('locked') : i.door.target > 0.5 ? t('close_door') : t('open');
    case 'elevator': return t('elevator'); case 'drawer': return S.used[i.x + ',' + i.z] ? t('empty') : t('drawer');
    default: return t('p_' + i.kind) !== 'p_' + i.kind ? t('p_' + i.kind) : t(i.kind); }
}
function useNearest() {
  if (!game || P.dead || game.end || panelOpen() || P.locked) return;
  if (P.hidden) { const L = P.hidden; P.hidden = null; P.x = L.x; P.z = L.z; sfx.door(); $('lockerView').hidden = true; return; }
  const i = nearest(); if (!i) return;
  if (role === 'monster') return;
  if (i.kind === 'item') return takeItem(i, true);
  if (i.kind === 'locker') { P.hidden = i; P.x = i.x - Math.sin(i.ry) * 0.3; P.z = i.z - Math.cos(i.ry) * 0.3; P.yaw = i.ry + Math.PI; sfx.door(); $('lockerView').hidden = false; return; }
  if (i.kind === 'door') {
    const d = i.door;
    if (d.lock && !d.unlocked) { if (d.lock === 'green' && S.inv.green) unlockDoor(d, true); else if (d.lock === 'valves') { sfx.locked(); toast(t('need_valves')); } else if (d.lock === 'exit') useStation('exit'); else { sfx.locked(); toast(t('need_green')); } return; }
    d.target = d.target > 0.5 ? 0 : 1; if (d.target === 0) d.shutAt = performance.now(); sfx.door(); sfx.click(); net.emit('ev', { t: 'door', id: d.id, v: d.target }); return;
  }
  if (i.kind === 'elevator') return elevator();
  useStation(i.kind, i);
}
function unlockDoor(d, local) { d.unlocked = true; d.target = 1; sfx.door(); if (local) { net.emit('ev', { t: 'unlock', id: d.id }); toast(t('opened')); } }
function panelBox(title, html) { if (document.pointerLockElement) document.exitPointerLock(); const p = $('panel'); p.innerHTML = `<div class="pbox"><div class="phead"><b>${title}</b><button class="pclose" id="pclose">${t('close')}</button></div>${html}</div>`; p.hidden = false; p.querySelector('#pclose').onclick = closePanel; return p; }
const MAILS = {
  tube: [['SPECIMEN 8 · LOG', 'Sedation must be renewed every 6 hours. If the dose is late, it wakes. It learns doors.'], ['RE: GLASS', 'Hairline crack on tube 8. Replacement scheduled for October 7.']],
  director: [['FROM: DIR. HALVORSEN', 'Do NOT wake it. The lift card is in my safe. The code changes daily and is flashed on the security cameras.'], ['RE: SEALING', 'If containment fails, the tunnel on B2 has a demolition charge. Arm it, and run. 10 seconds.']],
  office: [['NIGHT SHIFT 10/06/88', 'Four on shift. Power on B1 is down again. Spare fuses are somewhere in storage.'], ['MAINTENANCE', 'Valve order is on the chart in the B1 archive. Wrong order floods the generator room door shut.']],
  cams: [], last: [['FROM: SECURITY 03:12', 'It opened its own tube. Sealing the lab. Use the lockers. It cannot see you in the dark.'], ['03:40', 'Something else is down here with us. It sounds like Mark. Mark died an hour ago.']],
};
function computerPanel(i) {
  const mails = MAILS[i.mail] || [];
  const p = panelBox(t('computer'), `<div class="tabs"><button id="tMail">${t('mails')}</button><button id="tCam">${t('cams')}</button></div><div id="cbody"></div>`);
  const mail = () => { p.querySelector('#cbody').innerHTML = `<div class="mailList">${mails.map(([h, b], k) => `<details ${k ? '' : 'open'}><summary>${h}</summary><p>${b}</p></details>`).join('') || '<p>—</p>'}</div>`; p.querySelector('#tMail').className = 'on'; p.querySelector('#tCam').className = ''; };
  const cams = () => { const box = p.querySelector('#cbody'); box.innerHTML = '<div class="camGrid"></div>'; const g = box.querySelector('.camGrid');
    for (let f = 0; f < 3; f++) { const marks = monsters.filter((m) => m.f === f && m.active && m.alpha > 0.3 && !m.inTube).map((m) => ({ x: m.x, z: m.z, c: '#f22' })); if (P.f === f) marks.push({ x: P.x, z: P.z, c: '#2af' }); g.appendChild(mapCanvas(f, null, 480, 300, marks)); }
    p.querySelector('#tCam').className = 'on'; p.querySelector('#tMail').className = ''; };
  p.querySelector('#tMail').onclick = mail; p.querySelector('#tCam').onclick = cams; mails.length ? mail() : cams(); sfx.beep(0);
}
function useStation(kind, i) {
  if (document.pointerLockElement) document.exitPointerLock();
  const solve = (k, after) => { if (!S.solved[k]) { S.solved[k] = true; game.earned += 15; net.emit('ev', { t: 'solve', k }); } after && after(); updateHud(); };
  if (kind === 'monitors') return PUZZLES.monitors(S, () => {});
  if (kind === 'safe') { if (S.solved.safe) return toast(t('opened')); return PUZZLES.safe(S, () => solve('safe', () => giveItem('green'))); }
  if (kind === 'scale') { if (S.solved.scale) return toast(t('opened')); return PUZZLES.scale(S, () => solve('scale', () => { giveNote(0); giveItem('battery'); })); }
  if (kind === 'poster') return PUZZLES.poster(S, () => { S.knowChart = true; net.emit('ev', { t: 'flag', k: 'knowChart' }); });
  if (kind === 'valves') { if (S.solved.valves) return toast(t('opened')); return PUZZLES.valves(S, () => solve('valves', () => { const d = W.doors.find((q) => q.lock === 'valves'); unlockDoor(d, true); })); }
  if (kind === 'generator') { if (S.power) return toast(t('power_on')); if (!S.inv.screwdriver) { sfx.locked(); return toast(t('need_screw')); } return PUZZLES.generator(S, () => solve('generator', () => powerOn(true))); }
  if (kind === 'tape') return PUZZLES.tape(S, () => solve('tape'));
  if (kind === 'wires') { if (S.solved.wires) return toast(t('opened')); return PUZZLES.wires(S, () => solve('wires', () => giveItem('key'))); }
  if (kind === 'exit') { if (!(S.inv.red && S.inv.key)) { sfx.locked(); return toast(t('exit_need')); } return PUZZLES.exit(S, () => solve('exit', () => { const d = W.doors.find((q) => q.lock === 'exit'); unlockDoor(d, true); sfx.alarm(); })); }
  if (kind === 'computer') return computerPanel(i);
  if (kind === 'map') { const p = panelBox(t('map'), '<div class="bigmap"></div>'); p.querySelector('.bigmap').appendChild(mapCanvas(P.f, [P.x, P.z], 640, 500)); return; }
  if (kind === 'switch') { const key = i.f + i.room; W.roomOn[key] = W.roomOn[key] === false; for (const a of W.anchors[i.f]) if (a.room === i.room) a.on = W.roomOn[key] !== false; sfx.click(); toast(W.roomOn[key] === false ? t('lights_off') : t('lights_on')); return; }
  if (kind === 'intercom') { const rooms = [...new Set(MAPS[P.f].join('').replace(/[#H]/g, ''))]; const p = panelBox(t('intercom'), `<p class="phint">${t('intercom_h')}</p><div class="elev">${rooms.map((r) => `<button class="cbtn" data-r="${r}">${r}</button>`).join('')}</div>`);
    p.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => { const cells = []; MAPS[P.f].forEach((row, z) => [...row].forEach((c, x) => { if (c === b.dataset.r) cells.push(cellCenter(x, z)); })); const [x, z] = cells[(cells.length / 2) | 0]; closePanel(); setTimeout(() => { playAt(P.f, x, z, 'intercom'); playAt(P.f, x, z, 'voice'); makeDistraction(P.f, x, z, 10); net.emit('ev', { t: 'noise', f: P.f, x, z }); }, 400); })); return; }
  if (kind === 'alarm') { const k = 'a' + i.x + ',' + i.z; if (S.used[k]) return toast(t('empty')); S.used[k] = 1; toast(t('alarm_used'), true); for (let n = 0; n < 4; n++) setTimeout(() => sfx.alarm(), n * 2900); makeDistraction(i.f, i.x, i.z, 14); flicker(i.f, 1); net.emit('ev', { t: 'noise', f: i.f, x: i.x, z: i.z }); return; }
  if (kind === 'drawer') { const k = i.x + ',' + i.z; if (S.used[k]) return toast(t('empty')); S.used[k] = 1; sfx.door(); const r = Math.random(); const loot = r < 0.3 ? 'battery' : r < 0.48 ? 'bottle' : r < 0.6 ? 'adrenaline' : r < 0.72 ? 'trap' : r < 0.78 && !S.inv.lighter ? 'lighter' : null; if (loot) giveItem(loot); else toast(t('empty')); return; }
  if (kind === 'decon') { P.scentT = 45; sfx.whisper(0); for (let n = 0; n < 6; n++) setTimeout(() => sfx.step(false, 0, 0.6), n * 220); toast(t('decon_done'), true); return; }
  if (kind === 'bomb') { if (game.bombT != null) return; if (!S.solved.exit) { sfx.locked(); return toast(t('bomb_need')); } armBomb(); return; }
}
function giveItem(type) { S.inv[type] = (S.inv[type] || 0) + 1; sfx.pickup(); toast(`${t('got')}: ${t(type)}`); if (type === 'battery') { P.battery = Math.min(1, P.battery + 0.45); S.inv.battery--; } if (type === 'lighter') toast(`${t('got')}: ${t('lighter')} (L)`); updateHud(); }
function giveNote(n) { S.notes[n] = S.exitCode[n]; sfx.pickup(); toast(`${t('note')}: ${'_ _ _ _'.split(' ').map((c, i) => (i === n ? S.exitCode[n] : c)).join(' ')}`, true); }
function takeItem(i, local) {
  if (i.taken) return; i.taken = true; i.obj.visible = false; S.itemsTaken++;
  if (local) { game.earned += 3; if (i.type === 'note') giveNote(i.extra - 1); else if (i.type === 'tape') { S.foundTape = true; sfx.pickup(); toast(t('tape')); } else giveItem(i.type); net.emit('ev', { t: 'take', id: i.id, type: i.type, extra: i.extra });
    if (i.type === 'green' && !S.tubeBroken) game.tubeAt = Math.min(game.tubeAt, game.t + 40); }
}
function powerOn(local) { if (S.power) return; S.power = true; sfx.solved(); toast(t('power_on'), true); for (const f of [1, 2]) for (const a of W.anchors[f]) { a.on = true; a.flick = Math.random() < 0.15; } if (local) net.emit('ev', { t: 'power' }); }
// the tube: a crack, knocking from inside, failing lights, then the glass gives way
function tubeWarnings() {
  const left = game.tubeAt - game.t; const tb = S.tube;
  if (game.warn < 1 && left < 60) { game.warn = 1; tb.crack.visible = true; tb.crack.material.opacity = 0.4; if (P.f === 0) { sfx.crack(); toast(t('tube_crack'), true); } }
  if (game.warn < 2 && left < 30) { game.warn = 2; tb.crack.material.opacity = 0.75; playAt(0, tb.x, tb.z, 'knock'); setTimeout(() => playAt(0, tb.x, tb.z, 'knock'), 2500); if (P.f === 0) toast(t('tube_knock'), true); }
  if (game.warn < 3 && left < 12) { game.warn = 3; tb.crack.material.opacity = 1; flicker(0, 4); playAt(0, tb.x, tb.z, 'knock'); if (P.f === 0) toast(t('tube_flicker'), true); }
}
function breakTube(local) {
  if (S.tubeBroken) return; S.tubeBroken = true; const tb = S.tube; flicker(0, 2.6); if (P.f === 0) sfx.glass(); setTimeout(() => playAt(0, tb.x, tb.z, 'growl'), 600);
  setTimeout(() => { tb.pod.traverse((m) => { if (m.userData && m.userData.glass) m.visible = false; }); tb.liquid.visible = false; tb.light.color.set(0xff2a2a); tb.light.intensity = 1.2;
    const g = monsters[0]; g.inTube = false; g.obj.scale.multiplyScalar(1 / 0.78); g.x = tb.x; g.z = tb.z + 1.6; g.state = 'patrol'; g.calmT = 40;
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(1.8, 32), new THREE.MeshStandardMaterial({ color: 0x0a3a20, emissive: 0x041a0c, roughness: 0.02, metalness: 0.3, transparent: true, opacity: 0.8 })); puddle.rotation.x = -Math.PI / 2; puddle.position.set(tb.x, 0.012, tb.z); W.groups[0].add(puddle);
    for (const a of W.anchors[0]) { a.red = true; a.on = true; }
    if (role === 'monster') { P.locked = false; P.place(0, tb.x, tb.z + 1.6, 0); }
    if (P.f === 0) toast(t('tube_break'), true); }, 2600);
  if (local) net.emit('ev', { t: 'tube' });
}
let flickT = [0, 0, 0]; function flicker(f, d) { flickT[f] = Math.max(flickT[f], d); if (P && f === P.f) sfx.flicker(); }
function playAt(f, x, z, s) { if (f !== P.f) return; const dx = x - P.x, dz = z - P.z, d = Math.hypot(dx, dz); if (d > 30) return; const vol = Math.max(0.15, 1 - d / 30); const pan = Math.sin(-(Math.atan2(dx, dz) - (P.yaw + Math.PI))); sfx[s](pan, vol); }

// ---------------------------------------------------------------- elevator: a button panel; the first ride down stalls
function elevator() {
  const f = P.f; const p = panelBox(t('elevator'), `<div class="elev">${[0, 1, 2].map((to) => `<button class="cbtn ${to === f ? 'main' : ''}" data-to="${to}">${['G', 'B1', 'B2'][to]} · ${t('floor' + to)}</button>`).join('')}</div>`);
  p.querySelectorAll('[data-to]').forEach((b) => (b.onclick = () => { const to = +b.dataset.to; if (to === f) return; if (to === 2 && !S.power) { sfx.locked(); toast(t('need_power')); return; } closePanel(); ride(to); }));
}
function ride(to) {
  P.locked = true; $('fade').classList.add('on'); sfx.elevator(); game.rideN++; const stall = game.rideN === 1 && to === 1;
  if (stall) { setTimeout(() => { sfx.bang(0, 1); post.glitch(0.4); game.shake = 1; }, 1000); setTimeout(() => { sfx.knock(0.6, 0.8); subtitle('...', 1500); }, 2400); setTimeout(() => sfx.elevator(), 4200); }
  setTimeout(() => { const [x, z] = S.elev[to]; P.place(to, x, z + 0.6, P.yaw); P.hidden = null; floorBanner(to); $('fade').classList.remove('on'); P.locked = false; }, stall ? 6400 : 2400);
}
function floorBanner(f) { const b = $('banner'); b.textContent = t('floor' + f); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }

// ---------------------------------------------------------------- the grab warning, catching and the jumpscare
function warn(m, p) { if (p.id !== net.PID) return; playAt(m.f, m.x, m.z, m.kind === 'deer' || m.kind === 'wendigo' ? 'shriek' : 'growl'); game.shake = Math.max(game.shake || 0, 0.6); post.glitch(0.25); P.glitchT = 0.4; }
function caught(p, m) {
  if (game.end) return;
  if (p.id === net.PID) return localCaught(m);
  if (host) net.emit('ev', { t: 'caught', pid: p.id, m: m.kind });
  const o = others.get(p.id); if (o) o.dead = true;
}
// each monster comes at the camera its own way
const SCARE = { gaunt: { from: [0, 0.2, 2.4], dur: 0.32 }, matron: { from: [0, 0, 0.55], dur: 0.05, blackout: 0.3 }, dog: { from: [0, -1.0, 2.2], dur: 0.28 }, wretch: { from: [0, 2.6, 1.0], dur: 0.3 }, deer: { from: [0, 1.2, 3.0], dur: 0.36 }, wendigo: { from: [2.4, 0, 1.4], dur: 0.4 } };
function localCaught(m) {
  if (P.dead || role === 'monster') return; P.dead = true; P.locked = true; P.hidden = null; $('lockerView').hidden = true; closePanel(); if (document.pointerLockElement) document.exitPointerLock();
  const mon = typeof m === 'string' ? monsters.find((q) => q.kind === m) : m; const sc = SCARE[mon && mon.kind] || SCARE.gaunt;
  $('hud').hidden = true; setHeartbeat(0); setTension(0);
  if (mon && mon.inTube) { mon.inTube = false; mon.obj.scale.multiplyScalar(1 / 0.78); }
  if (mon && mon.root) { mon.alpha = 1; mon.active = true; mon.f = P.f; mon.play(mon.acts.attack ? 'attack' : 'run'); game.scareA = { m: mon, t: 0, ...sc }; P.pitch = 0.05;
    if (sc.blackout) { $('fade').classList.add('on'); setTimeout(() => $('fade').classList.remove('on'), sc.blackout * 1000); } }
  setTimeout(() => { sfx.scream(); $('scare').classList.add('on'); post.glitch(1.4); game.shake = 2.2; }, sc.blackout ? 300 : 60);
  net.emit('ev', { t: 'caught', pid: net.PID, m: mon ? mon.kind : 'gaunt' });
  // then black silence, then the death screen
  setTimeout(() => { $('scare').classList.remove('on'); $('fade').classList.add('on'); volume(0); game.scareA = null; }, 1250);
  setTimeout(() => { volume(0.8); $('fade').classList.remove('on');
    if (net.inRoom() && [...others.values()].some((o) => !o.dead && !o.escaped && o.role !== 'monster')) { show('hud'); P.ghost = true; P.locked = false; P.dead = true; toast(t('spectate'), true); }
    else endRun(false); }, 2900);
}
function updateScare(dt) { const a = game.scareA; if (!a) return; a.t += dt; const k = Math.min(1, a.t / a.dur); const e = 1 - Math.pow(1 - k, 3);
  const m = a.m; const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  const dist = a.from[2] + (0.42 - a.from[2]) * e, side = a.from[0] * (1 - e), up = a.from[1] * (1 - e);
  m.x = P.x + fx * dist + rx * side; m.z = P.z + fz * dist + rz * side; m.yaw = Math.atan2(P.x - m.x, P.z - m.z); m.sync(); m.root.visible = true;
  const head = m.k.h * 0.86; m.root.position.y = FLOOR_Y[P.f] + 1.6 - head + up + Math.sin(a.t * 40) * 0.02 * (1 - e);
  camera.fov = 72 - 14 * e; camera.updateProjectionMatrix(); }

// ---------------------------------------------------------------- the demolition charge and the way out
function armBomb() {
  game.bombT = 10; toast(t('bomb_go'), true); sfx.alarm(); const sc = S.bombAt.screen; sc.material.map = canvasTex(256, 192, (c) => { c.fillStyle = '#200'; c.fillRect(0, 0, 256, 192); c.fillStyle = '#ff3b30'; c.font = 'bold 40px monospace'; c.fillText('ARMED', 50, 110); }); sc.material.needsUpdate = true;
  $('bombTimer').hidden = false; for (const a of W.anchors[2]) { a.red = true; a.on = true; }
  S.outOpen = true; S.outLight.intensity = 6; S.outLight.color.set(0xa8c0ff); // the outside door rolls up and moonlight spills in
}
function updateBomb(dt) {
  if (game.bombT == null || game.end) return; const before = Math.ceil(game.bombT); game.bombT -= dt; if (Math.ceil(game.bombT) !== before) sfx.tick();
  $('bombTimer').textContent = Math.max(0, game.bombT).toFixed(1); if (S.outOpen && S.outDoor.position.y < 4.6) S.outDoor.position.y += dt * 3;
  const [ex] = cellCenter(15, 9); if (P.f === 2 && P.x > ex - 0.6 && !P.dead) { game.escaped = true; net.emit('ev', { t: 'escape', pid: net.PID }); $('bombTimer').hidden = true; runBombEnding(); return; }
  if (game.bombT <= 0) { $('bombTimer').hidden = true; sfx.explosion(); $('flash2').classList.add('on'); setTimeout(() => $('flash2').classList.remove('on'), 300); P.dead = true; game.end = true; setTimeout(() => endRun(false, 'blast'), 1500); }
}

// ---------------------------------------------------------------- networking glue
function fullState() { return { taken: items.filter((i) => i.taken).map((i) => i.id), doors: W.doors.map((d) => [d.id, d.target, d.unlocked ? 1 : 0]), solved: S.solved, power: S.power, tube: S.tubeBroken }; }
function applySync(d) { for (const id of d.taken) { const i = items.find((q) => q.id === id); if (i) takeItem(i, false); } for (const [id, tg, un] of d.doors) { const q = W.doors.find((x) => x.id === id); if (q) { q.target = tg; q.unlocked = !!un; } } Object.assign(S.solved, d.solved); if (d.power) powerOn(false); if (d.tube) breakTube(false); }
function applyEvent(d) {
  if (d.t === 'take') { const i = items.find((q) => q.id === d.id); if (i) takeItem(i, false); }
  else if (d.t === 'door') { const q = W.doors.find((x) => x.id === d.id); if (q) { q.target = d.v; if (!d.v) q.shutAt = performance.now(); sfx.door(); } }
  else if (d.t === 'unlock') { const q = W.doors.find((x) => x.id === d.id); if (q) unlockDoor(q, false); }
  else if (d.t === 'solve') S.solved[d.k] = true;
  else if (d.t === 'power') powerOn(false);
  else if (d.t === 'tube') breakTube(false);
  else if (d.t === 'flag') S[d.k] = true;
  else if (d.t === 'noise') { playAt(d.f, d.x, d.z, 'bottle'); makeDistraction(d.f, d.x, d.z); }
  else if (d.t === 'caught') { if (d.pid === net.PID) localCaught(d.m); else { const o = others.get(d.pid); if (o) o.dead = true; } }
  else if (d.t === 'escape') { const o = others.get(d.pid); if (o) o.escaped = true; }
  else if (d.t === 'over') endRun(false, d.why);
}
function applyMonsters(d) { d.m.forEach((s, i) => { const m = monsters[i]; if (!m) return; m.tx = s[1]; m.tz = s[2]; if (m.f !== s[0]) { m.x = s[1]; m.z = s[2]; } m.f = s[0]; m.yaw = s[3]; m.active = !!s[4]; m.alpha = s[5]; m.state = s[6]; m.play(s[7]); }); }
function updateOthers(dt) {
  if (!net.inRoom()) return;
  for (const p of lobbyPeersLive()) {
    let o = others.get(p.pid);
    if (!o) { o = { pid: p.pid, loading: true }; others.set(p.pid, o); rigged('hum/hum_' + (p.skin || CHARS[0].id) + '.glb').then(({ obj, clips }) => { const g = new THREE.Group(); g.add(obj); obj.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(obj); obj.scale.multiplyScalar(1.75 / (bb.max.y - bb.min.y)); obj.rotation.y = Math.PI;
      o.root = g; o.mixer = new THREE.AnimationMixer(obj); o.acts = {}; for (const c of clips) o.acts[c.name] = o.mixer.clipAction(c); scene.add(g); o.loading = false; }); }
    Object.assign(o, { f: p.f, x: p.x, z: p.z, yaw: p.yaw, hidden: p.hidden, noise: p.noise, alive: p.alive, ghost: p.ghost, crouch: p.crouch, running: p.running, role: p.role, escaped: p.escaped || o.escaped, name: p.name, seen: performance.now() });
    if (o.root) { const tx = p.x || 0, tz = p.z || 0; o.root.position.x += (tx - o.root.position.x) * Math.min(1, dt * 10); o.root.position.z += (tz - o.root.position.z) * Math.min(1, dt * 10); o.root.position.y = FLOOR_Y[p.f || 0]; o.root.rotation.y = (p.yaw || 0) + Math.PI;
      o.root.visible = !p.hidden && !p.ghost && p.alive !== false && p.role !== 'monster' && !p.escaped && p.f === P.f; const an = p.crouch ? 'crouch' : p.noise > 8 ? 'run' : p.noise > 1 ? 'walk' : 'idle';
      if (o.cur !== an && o.acts[an]) { o.acts[an].reset().fadeIn(0.2).play(); if (o.acts[o.cur]) o.acts[o.cur].fadeOut(0.2); o.cur = an; } o.mixer.update(dt); }
  }
}
function lobbyPeersLive() { return (lobby.peers || []).filter((p) => p.pid !== net.PID && !p.lobby); }
function inDark() { const a = W.anchors[P.f].find((q) => Math.hypot(q.x - P.x, q.z - P.z) < 3.2); return (!a || !a.on) && !(P.lightOn && P.battery > 0) && !P.lighterOn; }
function playersForBrains() {
  const me = { id: net.PID, f: P.f, x: P.x, z: P.z, yaw: P.yaw, hidden: !!P.hidden, noise: P.noise, alive: !P.dead, ghost: P.ghost, crouch: P.crouch, running: P.running, dark: inDark(), scentless: P.scentT > 0 };
  const list = role === 'monster' ? [] : [me];
  for (const o of others.values()) if (o.f != null && o.role !== 'monster' && !o.escaped) list.push({ id: o.pid, f: o.f, x: o.x, z: o.z, yaw: o.yaw, hidden: o.hidden, noise: o.noise, alive: o.alive !== false && !o.dead, ghost: o.ghost, crouch: o.crouch, running: o.running });
  return list;
}

// ---------------------------------------------------------------- suspense: something is always happening somewhere
function director(dt) {
  game.nextEvent -= dt; if (game.nextEvent > 0 || P.dead || P.locked) return; game.nextEvent = 14 + Math.random() * 18;
  const opts = ['bang', 'above', 'slam', 'shadow', 'lights', 'radio', 'flash'].filter((e) => !(e === 'above' && P.f === 0)); const pick = opts[(Math.random() * opts.length) | 0]; const f = P.f;
  if (pick === 'bang') { const a = Math.random() * 6.28; playAt(f, P.x + Math.sin(a) * 12, P.z + Math.cos(a) * 12, 'bang'); }
  else if (pick === 'above') sfx.above();
  else if (pick === 'slam') { const ds = W.doors.filter((d) => d.f === f && d.obj && d.target > 0.5 && !d.lock && Math.hypot(d.center[0] - P.x, d.center[1] - P.z) > 5 && Math.hypot(d.center[0] - P.x, d.center[1] - P.z) < 26); const d = ds[(Math.random() * ds.length) | 0]; if (d) { d.target = 0; playAt(f, d.center[0], d.center[1], 'slam'); } else sfx.above(); }
  else if (pick === 'shadow') { const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw); for (const dd of [14, 11, 8]) { const x = P.x + fx * dd, z = P.z + fz * dd; if (cellAt(f, toCell(x), toCell(z)) !== '#' && W.los(f, P.x, P.z, x, z)) { const rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw); Object.assign(shadowMan, { f, from: [x - rx * 3, z - rz * 3], to: [x + rx * 3, z + rz * 3], t: 0 }); shadowMan.obj.visible = true; break; } } }
  else if (pick === 'lights') { flicker(f, 2.5); const a = W.anchors[f].map((q) => [q, Math.hypot(q.x - P.x, q.z - P.z)]).sort((a2, b2) => a2[1] - b2[1])[0]; if (a && a[0].on) { a[0].on = false; setTimeout(() => (a[0].on = true), 7000); } }
  else if (pick === 'radio') { const scr = W.inter.filter((i) => i.f === f && i.kind === 'computer'); const c = scr[(Math.random() * scr.length) | 0]; if (c) playAt(f, c.x, c.z, 'radio'); else sfx.whisper(0.6); }
  else if (pick === 'flash') { P.glitchT = 1.2; post.glitch(0.3); }
}
function updateShadow(dt) { if (!shadowMan || !shadowMan.obj.visible) return; shadowMan.t += dt / 1.4; const k = shadowMan.t; if (k >= 1 || shadowMan.f !== P.f) { shadowMan.obj.visible = false; return; }
  const [ax, az] = shadowMan.from, [bx, bz] = shadowMan.to; shadowMan.obj.position.set(ax + (bx - ax) * k, FLOOR_Y[shadowMan.f], az + (bz - az) * k); shadowMan.obj.rotation.y = Math.atan2(bx - ax, bz - az); shadowMan.mix.update(dt); }

// ---------------------------------------------------------------- frame
let last = performance.now(), hudT = 0;
function frame() {
  requestAnimationFrame(frame);
  const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!game || !W || game.ending) return;
  game.t += dt;
  if (!game.end) {
    if (!panelOpen()) P.update(dt, W); else P.update(0, W);
    if (P.battery <= 0 && P.lightOn) { P.lightOn = false; toast(t('battery_dead'), true); }
    if (role === 'monster' && !P.locked) { const g = monsters[0]; g.f = P.f; g.x = P.x; g.z = P.z; g.yaw = P.yaw + Math.PI; g.play(P.running ? 'run' : P.noise > 1 ? 'walk' : 'idle'); P.flash.intensity = 0; }
    if (host) {
      if (!S.tubeBroken) { tubeWarnings(); if (game.t > game.tubeAt) breakTube(true); }
      const players = playersForBrains(); const rage = Math.min(0.5, S.itemsTaken * 0.03);
      const ctx = { caught, warn, distraction, rage, flicker: (f) => flicker(f, 0.8), sound: (m, s) => playAt(m.f, m.x, m.z, s) };
      for (const m of monsters) {
        if (m.kind === 'gaunt' && (m.inTube || role === 'monster' || (zombiePid && zombiePid !== net.PID))) { if (zombiePid && !m.inTube) { const z = others.get(zombiePid); if (z && z.f != null) { m.f = z.f; m.x = z.x; m.z = z.z; m.yaw = (z.yaw || 0) + Math.PI; m.play(z.running ? 'run' : z.noise > 1 ? 'walk' : 'idle'); } }
          if (!m.inTube) for (const p of players) if (p.f === m.f && p.alive && !p.ghost && !p.hidden && Math.hypot(p.x - m.x, p.z - m.z) < 1.1) caught(p, m); continue; }
        if (m.kind === 'wretch') { const live = players.filter((p) => p.alive && !p.ghost); if (m.state === 'idle' && live.length) m.f = live[(game.t * 7 | 0) % live.length].f; }
        if (m.kind === 'gaunt') gauntTravel(m, players, dt);
        think(m, W, players, dt, ctx);
      }
      game.monT -= dt; if (game.monT <= 0 && net.inRoom()) { game.monT = 0.1; net.emit('mon', { m: monsters.map((m) => [m.f, +m.x.toFixed(2), +m.z.toFixed(2), +m.yaw.toFixed(2), m.active ? 1 : 0, +m.alpha.toFixed(2), m.state, m.anim]) }); }
      checkMatchOver();
    } else for (const m of monsters) if (m.tx != null) { m.x += (m.tx - m.x) * Math.min(1, dt * 8); m.z += (m.tz - m.z) * Math.min(1, dt * 8); }
    if (distraction) distraction.t -= dt;
    for (const d of W.doors) if (d.autoClose != null) { d.autoClose -= dt; if (d.autoClose <= 0) { d.autoClose = null; if (!d.lock && Math.random() < 0.6) d.target = 0; } }
    for (const tr of game.traps) if (tr.t > 0) { tr.t -= dt; tr.tick -= dt; if (tr.tick <= 0) { tr.tick = 1; if (tr.f === P.f && Math.hypot(tr.x - P.x, tr.z - P.z) < 12) sfx.tick(); } if (tr.t <= 0) { playAt(tr.f, tr.x, tr.z, 'bottle'); for (let n = 0; n < 3; n++) setTimeout(() => playAt(tr.f, tr.x, tr.z, 'alarm'), n * 700); makeDistraction(tr.f, tr.x, tr.z, 9); tr.obj.visible = false; net.emit('ev', { t: 'noise', f: tr.f, x: tr.x, z: tr.z }); } }
    if (P.f === 2 && S.brokenPod && !game.b2Seen && Math.hypot(S.brokenPod.x - P.x, S.brokenPod.z - P.z) < 6) { game.b2Seen = true; sfx.crack(); subtitle(LANG === 'ar' ? 'الإزاز متكسر لبره... حاجة طلعت من هنا.' : 'The glass is broken outwards... something got out of this one.', 4500); }
    director(dt); updateBomb(dt);
    net.presence({ f: P.f, x: +P.x.toFixed(2), z: +P.z.toFixed(2), yaw: +P.yaw.toFixed(2), hidden: !!P.hidden, noise: P.noise, alive: !P.dead, ghost: P.ghost, crouch: P.crouch, running: P.running, role, skin: char.id, name: myName(), escaped: game.escaped });
  }
  for (const m of monsters) { if (m.inTube) { m.t += dt; if (m.mixer) m.mixer.update(dt * 0.3); m.root.position.set(S.tube.x, 0.5 + Math.sin(m.t) * 0.06, S.tube.z); m.root.rotation.y = m.yaw + Math.sin(m.t * 0.3) * 0.3; m.root.visible = P.f === 0; continue; } m.animate(dt); m.root.visible = m.root.visible && m.f === P.f; }
  updateScare(dt); updateShadow(dt); updateOthers(dt); W.update(dt); updateLights(dt);
  if (W.leds) for (const l of W.leds) if (Math.random() < dt * 2) l.visible = !l.visible;
  // fear: heartbeat, music and shake from the closest active monster on this floor
  let fear = 0, chase = false; for (const m of monsters) if (m.active && m.f === P.f && m.alpha > 0.5 && !m.inTube) { fear = Math.max(fear, 1 - Math.hypot(m.x - P.x, m.z - P.z) / 16); if (m.state === 'chase') chase = true; }
  if (!P.dead && role !== 'monster') { setHeartbeat(Math.max(0, fear)); setTension(fear * 0.7 + (chase ? 0.4 : 0) + (game.bombT != null ? 0.6 : 0)); } $('vig').style.opacity = 0.35 + fear * 0.55;
  if (game.shake > 0) { game.shake = Math.max(0, game.shake - dt * 1.8); camera.position.x += (Math.random() - 0.5) * 0.05 * game.shake; camera.position.y += (Math.random() - 0.5) * 0.05 * game.shake; camera.rotation.z += (Math.random() - 0.5) * 0.02 * game.shake; }
  if (!game.scareA && camera.fov !== 72) { camera.fov = 72; camera.updateProjectionMatrix(); }
  post.expTarget = inDark() ? 1.6 : 1.0;
  hudT -= dt; if (hudT <= 0) { hudT = 0.12; updateHud(); }
  post.render(scene, camera, dt);
}
function gauntTravel(m, players, dt) {
  const live = players.filter((p) => p.alive && !p.ghost); if (!live.length || m.state === 'chase' || m.calmT > 0) { m.awayT = 0; return; }
  if (live.some((p) => p.f === m.f)) { m.awayT = 0; return; }
  m.awayT = (m.awayT || 0) + dt; if (m.awayT > 45) { const f = live[0].f; const [x, z] = S.elev[f]; m.f = f; m.x = x; m.z = z + 1; m.awayT = 0; m.state = 'patrol'; if (P.f === f) sfx.ding(); }
}
function checkMatchOver() {
  if (!net.inRoom() || game.end) return; const ps = playersForBrains(); if (!ps.length) return;
  if (ps.every((p) => !p.alive || p.ghost)) { net.emit('ev', { t: 'over', why: zombiePid ? 'monster_won' : 'all_caught' }); endRun(false, zombiePid ? 'monster_won' : 'all_caught'); }
}
function updateLights(dt) {
  flickT = flickT.map((v) => Math.max(0, v - dt));
  const f = P.f, anc = W.anchors[f].map((a) => [a, Math.hypot(a.x - P.x, a.z - P.z)]).sort((a, b) => a[1] - b[1]);
  lightPool.forEach((l, i) => { const e = anc[i]; if (!e) { l.intensity = 0; return; } const a = e[0];
    let on = a.on ? 1 : 0; if (a.flick && Math.random() < 0.05) a.fl = Math.random() * 0.25; if (a.fl > 0) { a.fl -= dt; on *= 0.12; } if (flickT[f] > 0) on *= Math.random() < 0.5 ? 0 : 0.6;
    const red = a.red; l.color.set(red ? 0xff2020 : a.col); const pulse = red ? 0.55 + 0.45 * Math.sin(game.t * 3) : 1;
    l.intensity = on * (red ? 7 : 6) * pulse; l.position.set(a.x, FLOOR_Y[f] + WH - 0.35, a.z); l.distance = 10; a.vis = on * pulse; });
  for (let ff = 0; ff < 3; ff++) for (const a of W.anchors[ff]) { const v = a.vis != null && ff === f ? a.vis : a.on ? 1 : 0; a.lamp.material.emissiveIntensity = v ? (a.red ? 0.8 : 1.6) * v : 0.02; a.lamp.material.emissive.set(a.red ? 0xff2020 : 0xf4f7ff); a.vis = null; }
}
function updateHud() {
  if (!P || !S || !W || !game) return; const i = !game.end && !P.dead ? nearest() : null; const pr = promptFor(i);
  $('prompt').textContent = pr; $('prompt').hidden = !pr || panelOpen(); $('bUse').textContent = pr || t('use');
  $('stam').style.width = (P.stamina * 100) + '%'; $('stam').style.background = P.adrT > 0 ? '#ff9a3c' : ''; $('batt').style.width = (P.battery * 100) + '%'; $('bottles').textContent = S.inv.bottle || 0;
  $('invIcons').innerHTML = ['green', 'red', 'key', 'screwdriver', 'fuse_r', 'fuse_y', 'fuse_b'].filter((k) => S.inv[k]).map((k) => `<span class="ic ic-${k}" title="${t(k)}"></span>`).join('') + ['adrenaline', 'trap', 'lighter'].filter((k) => S.inv[k]).map((k) => `<span class="chip" title="${t(k)}">${{ adrenaline: '💉', trap: '⏰', lighter: '🔥' }[k]}${k === 'lighter' ? '' : S.inv[k]}</span>`).join('');
}

// ---------------------------------------------------------------- the bomb ending: out of the tunnel, the blast, the snow
async function runBombEnding() {
  game.end = true; game.ending = true; P.locked = true; closePanel(); if (document.pointerLockElement) document.exitPointerLock(); $('hud').hidden = true; setTension(0); setHeartbeat(0);
  const es = new THREE.Scene(); es.background = new THREE.Color(0x0b1220); es.fog = new THREE.FogExp2(0x0e1626, 0.028); es.add(new THREE.HemisphereLight(0x8aa0d0, 0x2a2a32, 0.9));
  const moon = new THREE.DirectionalLight(0xa8c0ff, 0.7); moon.position.set(-20, 30, 10); es.add(moon); es.environment = scene.environment; es.environmentIntensity = 0.2;
  const snowM = await material('snow_02', 4); const ground = new THREE.Mesh(boxGeo(240, 0.1, 240, 4), snowM); ground.position.y = -0.05; ground.receiveShadow = true; es.add(ground);
  // the lab's concrete face cut into the hillside, with the tunnel mouth at x=0
  const conc = await material('Concrete049', 3, { color: 0x8a8d90 }); for (const [x, w] of [[-9, 14], [9, 14]]) { const b = new THREE.Mesh(boxGeo(w, 7, 6, 3), conc); b.position.set(x, 3.5, -3); es.add(b); }
  const lint = new THREE.Mesh(boxGeo(4, 3, 6, 3), conc); lint.position.set(0, 5.5, -3); es.add(lint); const hill = new THREE.Mesh(new THREE.SphereGeometry(40, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), snowM); hill.position.set(0, -6, -34); hill.scale.y = 0.45; es.add(hill);
  const inner = new THREE.PointLight(0xff3020, 3, 14); inner.position.set(0, 2, -5); es.add(inner);
  const pines = trees('Pine Large', LOW ? 2 : 3, 41); for (let i = 0; i < (LOW ? 40 : 80); i++) { const a = Math.random() * Math.PI * 2, r = 16 + Math.random() * 70; const x = Math.cos(a) * r, z = Math.sin(a) * r + 20; if (z < 4 && Math.abs(x) < 20) continue; const tr = pines[i % pines.length].clone(); tr.scale.setScalar((12 + Math.random() * 10) / (pines[0].userData.h || 10)); tr.position.set(x, 0, z); tr.rotation.y = Math.random() * 6; es.add(tr); }
  const snowN = LOW ? 2500 : 6000, snowG = new THREE.BufferGeometry(); snowG.setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: snowN * 3 }, (_, i) => (i % 3 === 1 ? Math.random() * 20 : (Math.random() - 0.5) * 70)), 3)); const snow = new THREE.Points(snowG, new THREE.PointsMaterial({ color: 0xffffff, size: 0.07 })); snow.position.z = 15; es.add(snow);
  // explosion layers: flash, fireball, shockwave, debris, smoke, snow blast, firelight
  const fireTex = canvasTex(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(0.25, 'rgba(255,190,80,.95)'); g.addColorStop(0.55, 'rgba(230,80,20,.6)'); g.addColorStop(1, 'rgba(60,10,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
  const smokeTex = canvasTex(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(40,38,36,.9)'); g.addColorStop(0.6, 'rgba(30,28,28,.5)'); g.addColorStop(1, 'rgba(20,20,20,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
  const fire = [], smoke = [], debris = [], flakes = []; const boom = new THREE.Group(); boom.position.set(0, 2.2, -0.5); es.add(boom); const burn = [];
  const flash = new THREE.PointLight(0xfff2d0, 0, 120, 1.2); boom.add(flash); const fireLight = new THREE.PointLight(0xff7a20, 0, 60, 1.4); boom.add(fireLight);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.3, -2); es.add(ring);
  const debM = await material('painted_concrete', 1, { color: 0x6a6e72 });
  const flakeG = new THREE.BufferGeometry(); flakeG.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(900), 3)); const flakeP = new THREE.Points(flakeG, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.9 })); flakeP.position.set(0, 0.3, -2); es.add(flakeP);
  const startBoom = () => { flash.intensity = 4000; fireLight.intensity = 400; ring.material.opacity = 0.7; $('flash2').classList.add('on'); setTimeout(() => $('flash2').classList.remove('on'), 120); sfx.explosion(); ringing(5); post.glitch(0.8);
    for (let i = 0; i < 26; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); const v = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.4 + 0.2, Math.random() * 2.2 + 0.4).normalize().multiplyScalar(4 + Math.random() * 9); s.userData = { v, life: 0, max: 2.2 + Math.random() * 2.2, s0: 2.5 + Math.random() * 3.5 }; boom.add(s); fire.push(s); }
    for (let i = 0; i < 10; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); s.position.set((Math.random() - 0.5) * 3.4, -1.6 + Math.random() * 2.4, (Math.random() - 0.5) * 1.5); s.userData = { b: 1.6 + Math.random() * 1.8, ph: Math.random() * 9 }; boom.add(s); burn.push(s); }
    for (let i = 0; i < 34; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, depthWrite: false, transparent: true, opacity: 0 })); s.userData = { v: new THREE.Vector3((Math.random() - 0.5) * 4, 2.5 + Math.random() * 3.5, Math.random() * 3), life: -0.2 - Math.random() * 1.2, max: 11 }; boom.add(s); smoke.push(s); }
    for (let i = 0; i < (LOW ? 30 : 70); i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.1 + Math.random() * 0.4, 0.08 + Math.random() * 0.25, 0.1 + Math.random() * 0.4), debM); d.userData = { v: new THREE.Vector3((Math.random() - 0.5) * 18, 4 + Math.random() * 12, 3 + Math.random() * 20), w: new THREE.Vector3(Math.random() * 9, Math.random() * 9, 0) }; boom.add(d); debris.push(d); }
    for (let i = 0; i < 300; i++) flakes.push([0, 0, 0, (Math.random() - 0.5) * 30, Math.random() * 6, Math.random() * 25 + 5]); };
  const cam = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 260); es.add(cam);
  let tt = 0, last2 = performance.now(), boomed = false, textShown = false, shake = 0; const px = { z: -5.5, y: 1.62, vz: 6.2, vy: 0, roll: 0, pitch: 0, yaw: Math.PI, landed: false };
  sfx.alarm();
  await new Promise((done) => { const step = () => { const now = performance.now(); const dt = Math.min(0.05, (now - last2) / 1000) * (window.__ts || 1); last2 = now; tt += dt;
    const slow = tt > 1.3 && tt < 3.3 ? 0.28 : 1, sdt = dt * slow;                                            // slow motion around the blast
    if (tt < 1.2) { px.z += px.vz * sdt; px.y = 1.62 + Math.sin(tt * 16) * 0.05; }                           // running out of the tunnel
    else if (!boomed) { boomed = true; px.vy = 4.2; px.vz = 9; startBoom(); shake = 2.5; }                    // the jump, and the blast behind you
    if (boomed) { px.vy -= 9.8 * sdt; px.y += px.vy * sdt; px.z += px.vz * sdt; px.pitch = Math.min(0.5, px.pitch + sdt * 0.4);
      if (px.y < 0.35) { px.y = 0.35; px.vy = 0; px.vz *= 1 - sdt * 4; px.roll += (0.6 - px.roll) * sdt * 3; if (!px.landed) { px.landed = true; sfx.bang(0, 0.8); shake = 1.4; } } }
    if (px.landed && tt > 3.8) { px.yaw += (0.05 - px.yaw) * dt * 1.2; px.pitch += (-0.12 - px.pitch) * dt; px.roll += (0.3 - px.roll) * dt; }   // look back at the fire
    cam.position.set(0, px.y, px.z); cam.rotation.set(-px.pitch, px.yaw, px.roll, 'YXZ');
    if (shake > 0) { shake = Math.max(0, shake - dt); cam.position.x += (Math.random() - 0.5) * 0.12 * shake; cam.position.y += (Math.random() - 0.5) * 0.12 * shake; }
    flash.intensity *= Math.pow(0.02, sdt); fireLight.intensity = boomed ? Math.max(30, fireLight.intensity * Math.pow(0.3, sdt)) * (0.85 + Math.random() * 0.3) : 0;
    if (boomed) { ring.scale.multiplyScalar(1 + sdt * 6); ring.material.opacity = Math.max(0, ring.material.opacity - sdt * 0.9); post.u.distort.value = 0.06 + ring.material.opacity * 0.4; }
    for (const s of fire) { const u = s.userData; u.life += sdt; const k = u.life / u.max; s.position.addScaledVector(u.v, sdt * Math.max(0, 1 - k)); s.scale.setScalar(u.s0 * (1 + k * 5)); s.material.opacity = Math.max(0, 1 - k); s.visible = k < 1; }
    for (const s of smoke) { const u = s.userData; u.life += sdt; if (u.life < 0) continue; const k = u.life / u.max; s.position.addScaledVector(u.v, sdt * 0.6); s.scale.setScalar(3 + k * 16); s.material.opacity = Math.min(0.85, k * 5) * (1 - k); }
    for (const s of burn) { const u = s.userData; s.material.opacity = boomed ? Math.min(1, tt - 1.2) * (0.55 + 0.45 * Math.sin(tt * 9 + u.ph)) : 0; s.scale.setScalar(u.b * (0.9 + 0.2 * Math.sin(tt * 7 + u.ph))); }
    for (const d of debris) { const u = d.userData; u.v.y -= 9.8 * sdt; d.position.addScaledVector(u.v, sdt); d.rotation.x += u.w.x * sdt; d.rotation.y += u.w.y * sdt; if (d.position.y + boom.position.y < 0.05) { d.position.y = 0.05 - boom.position.y; u.v.multiplyScalar(0.4); u.v.y = Math.abs(u.v.y) * 0.3; } }
    const fp = flakeG.attributes.position; flakes.forEach((q, i) => { q[4] -= 9.8 * sdt * 0.3; q[0] += q[3] * sdt; q[1] = Math.max(0, q[1] + q[4] * sdt); q[2] += q[5] * sdt; fp.setXYZ(i, q[0], q[1], q[2]); }); fp.needsUpdate = true; flakeP.material.opacity = Math.max(0, 0.9 - tt * 0.12);
    const sp = snow.geometry.attributes.position; for (let i = 1; i < sp.array.length; i += 3) { sp.array[i] -= 1.5 * sdt; if (sp.array[i] < 0) sp.array[i] = 20; } sp.needsUpdate = true;
    if (tt > 6.5 && !textShown) { textShown = true; $('endText').hidden = false; $('endText').textContent = t('end_out'); }
    if (tt > 9.5) $('fade').classList.add('on'); if (tt > 11) $('endText').textContent = t('part1');
    post.render(es, cam, dt); if (tt < 13) requestAnimationFrame(step); else done(); }; step(); });
  post.u.distort.value = 0.06; $('endText').hidden = true; game.ending = false; $('fade').classList.remove('on'); endRun(true);
}
function endRun(win, why) {
  if (game.endShown) return; game.endShown = true; game.end = true; setHeartbeat(0); setTension(0); $('bombTimer').hidden = true;
  const pr = net.getProfile(); const earned = (win ? 100 : 10) + game.earned + (win && S.foundTape ? 50 : 0); pr.coins += earned; if (win) pr.escapes++;
  if (role === 'monster') { pr.tickets = Math.max(0, pr.tickets - 1); } net.saveProfile();
  const m = Math.floor(game.t / 60), s = Math.floor(game.t % 60);
  if (win) { show('results'); $('resTitle').textContent = t('escaped'); $('resBody').innerHTML = `<p>${t('time')}: <b>${m}:${String(s).padStart(2, '0')}</b></p><p>${t('puzzles')}: <b>${Object.keys(S.solved).length}</b> · ${t('items')}: <b>${S.itemsTaken}</b></p><p>${t('earned')}: <b>+${earned}</b> ${t('coins')}</p>${S.foundTape ? `<p class="secret">${t('secret')}</p>` : ''}`; }
  else { show('dead'); $('deadTitle').textContent = why ? t(why) : t('caught'); $('deadBody').textContent = `${t('earned')}: +${earned} ${t('coins')}`; }
  ui();
}

// ---------------------------------------------------------------- boot
(async () => {
  setLang(LANG); await net.initCaps(); await net.loadProfile(); ui(); show('menu');
  requestAnimationFrame(frame);
})();
window.__nh = () => ({ P, S, W, monsters, items, game, useNearest, useStation, breakTube, ride, nearest, takeItem, localCaught, runBombEnding, armBomb, startGame, post, camera, cellCenter, newGame, trees, testDrive: async () => { $('menu').hidden = true; audioStart(); await driveCutscene({ post, renderer, LOW }, { car: await loadCar(CHARS[1].car) }); return 'done'; } });
