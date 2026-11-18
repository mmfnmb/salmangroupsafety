// Night Holes – game flow: menu, lobby, the lab run, catches, escape and the ending.
import * as THREE from 'three';
import { World, FLOOR_Y, cellCenter, C, toCell, cellAt, WH } from './world.js';
import { populate, itemPlan, spawnItems, glow } from './level.js';
import { Player, bindTouch } from './player.js';
import { Monster, think, KINDS } from './monsters.js';
import { PUZZLES, close as closePanel, isOpen as panelOpen } from './puzzles.js';
import { audioStart, sfx, setHeartbeat, setAmbient } from './audio.js';
import { loadAll, rigged, SKINS, ZOMBIE_PRICE } from './assets.js';
import * as net from './net.js';
import { t, LANG, setLang } from './i18n.js';

const $ = (id) => document.getElementById(id);
const MOBILE = matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
const LOW = MOBILE;
const renderer = new THREE.WebGLRenderer({ canvas: $('view'), antialias: !LOW, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, LOW ? 1 : 1.6)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = !LOW; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x030405); scene.fog = new THREE.FogExp2(0x030405, 0.075);
scene.add(new THREE.HemisphereLight(0x22304a, 0x0a0808, 0.8));
const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 60);
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

let seed = 1; const rng = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
let W = null, P = null, S = null, monsters = [], items = [], others = new Map(), lightPool = [], game = null, host = true, role = 'human', zombiePid = null;
const RNG_CODE = () => String(100 + Math.floor(Math.random() * 900));

// ---------------------------------------------------------------- menus
function ui() {
  document.querySelectorAll('[data-t]').forEach((e) => (e.textContent = t(e.dataset.t)));
  const pr = net.getProfile(); if (pr) $('coins').textContent = `${pr.coins} ${t('coins')}`;
}
function show(id) { for (const s of ['menu', 'lobby', 'shop', 'loading', 'hud', 'dead', 'results']) $(s).hidden = s !== id; }
$('btnLang').onclick = () => { setLang(LANG === 'ar' ? 'en' : 'ar'); ui(); renderLobby(); };
$('btnSolo').onclick = () => { audioStart(); host = true; role = 'human'; startGame(Math.floor(Math.random() * 1e9), null); };
$('btnCreate').onclick = async () => { audioStart(); if (!net.online()) return toast(t('online_off')); const code = Math.random().toString(36).slice(2, 6).toUpperCase(); await enterLobby(code, true); };
$('btnJoin').onclick = async () => { audioStart(); if (!net.online()) return toast(t('online_off')); const code = ($('joinCode').value || '').trim(); if (code.length < 3) return; await enterLobby(code, false); };
$('btnShop').onclick = () => { show('shop'); renderShop(); };
$('shopBack').onclick = () => show('menu');
$('lobbyBack').onclick = () => { net.leaveRoom(); show('menu'); };
$('btnMenu').onclick = $('btnMenu2').onclick = () => location.reload();
$('btnRetry').onclick = () => { startGame(Math.floor(Math.random() * 1e9), null); };

// ---------------------------------------------------------------- lobby (online)
let lobby = { code: '', host: false, peers: [], useZombie: false };
async function enterLobby(code, isHost) {
  lobby = { code, host: isHost, peers: [], useZombie: false }; await net.joinRoom(code); show('lobby'); $('lobbyCode').textContent = code;
  let nPeers = 0; net.onPeers((arr) => { lobby.peers = arr; if (arr.length !== nPeers) { nPeers = arr.length; renderLobby(); if (game && host) net.emit('sync', fullState()); } });
  net.on('ev', (d) => { if (d.t === 'start' && !game) { host = false; zombiePid = d.zombie; role = d.zombie === net.PID ? 'monster' : 'human'; startGame(d.seed, d.zombie); } else if (game) applyEvent(d); });
  net.on('mon', (d) => { if (game && !host) applyMonsters(d); });
  net.on('sync', (d) => { if (game && !host) applySync(d); });
  setInterval(() => { if (!game) net.presence({ name: myName(), skin: net.getProfile().skin, lobby: 1, host: lobby.host, zombie: lobby.useZombie }, true); }, 700);
  renderLobby();
}
function myName() { return (net.getProfile().skin || '').replace(/_\d+$/, '').replace('_', ' ') + ' ' + net.PID.slice(0, 2).toUpperCase(); }
function renderLobby() {
  if ($('lobby').hidden) return; const pr = net.getProfile();
  $('lobbyList').innerHTML = [{ pid: net.PID, name: myName(), host: lobby.host, zombie: lobby.useZombie }, ...lobby.peers.filter((p) => p.pid !== net.PID)].map((p) => `<li>${p.name || p.pid}${p.pid === net.PID ? ` (${t('you')})` : ''}${p.host ? ` · ${t('host')}` : ''}${p.zombie ? ' 🧟' : ''}</li>`).join('');
  $('btnStart').hidden = !lobby.host; $('lobbyWait').hidden = lobby.host;
  $('zTickets').textContent = `${pr.tickets} ${t('tickets')}`; $('zUse').checked = lobby.useZombie; $('zUse').disabled = pr.tickets < 1;
}
$('zUse').onchange = (e) => { lobby.useZombie = e.target.checked; renderLobby(); };
$('btnStart').onclick = () => {
  const zs = [{ pid: net.PID, zombie: lobby.useZombie }, ...lobby.peers].filter((p) => p.zombie); const z = zs.length && lobby.peers.length ? zs[0].pid : null;
  const sd = Math.floor(Math.random() * 1e9); net.emit('ev', { t: 'start', seed: sd, zombie: z }); host = true; zombiePid = z; role = z === net.PID ? 'monster' : 'human'; startGame(sd, z);
};

// ---------------------------------------------------------------- shop
function renderShop() {
  const pr = net.getProfile(); $('shopCoins').textContent = `${pr.coins} ${t('coins')}`;
  $('shopList').innerHTML = SKINS.map((s) => { const own = pr.owned.includes(s.id), on = pr.skin === s.id;
    return `<div class="skin ${on ? 'on' : ''}"><img src="assets/thumbs/${s.id}.jpg" alt=""><b>${LANG === 'ar' ? s.ar : s.en}</b><button data-s="${s.id}">${on ? t('worn') : own ? t('equip') : s.price ? `${t('buy')} · ${s.price}` : t('free')}</button></div>`; }).join('') +
    `<div class="skin zombie"><img src="assets/thumbs/zombie.jpg" alt=""><b>${t('zombie')}</b><small>${t('zombie_desc')}</small><small>${pr.tickets} ${t('tickets')}</small><button data-z="1">${t('buy')} · ${ZOMBIE_PRICE}</button></div>`;
  $('shopList').querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => { const s = SKINS.find((q) => q.id === b.dataset.s);
    if (!pr.owned.includes(s.id)) { if (pr.coins < s.price) return toast(t('not_enough')); pr.coins -= s.price; pr.owned.push(s.id); sfx.pickup(); }
    pr.skin = s.id; net.saveProfile(); renderShop(); ui(); }));
  $('shopList').querySelector('[data-z]').onclick = () => { if (pr.coins < ZOMBIE_PRICE) return toast(t('not_enough')); pr.coins -= ZOMBIE_PRICE; pr.tickets++; sfx.pickup(); net.saveProfile(); renderShop(); ui(); };
}
let toastT = 0; function toast(s, long) { const e = $('toast'); e.textContent = s; e.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (e.hidden = true), long ? 4200 : 2400); }

// ---------------------------------------------------------------- start a run
async function startGame(sd, zombie) {
  show('loading'); $('loadBar').style.width = '0%';
  for (const g of W ? W.groups : []) scene.remove(g); for (const m of monsters) if (m.root) scene.remove(m.root); for (const o of others.values()) if (o.root) scene.remove(o.root);
  monsters = []; items = []; others = new Map(); seed = (sd % 2147483646) + 1;
  const files = ['lab/Wall_1.glb', 'lab/Props_Pod.glb', ...Object.values(KINDS).map((k) => k.file)];
  await loadAll(files, (p) => ($('loadBar').style.width = (p * 60) + '%'));
  W = new World(scene, LOW); S = makeState(); await W.build(rng); $('loadBar').style.width = '75%';
  await populate(W, rng, S); await spawnItems(W, itemPlan(rng), rng, items); $('loadBar').style.width = '88%';
  // monsters: positions decided from the seed so every client builds the same lab
  const at = (f, x, z) => { const [a, b] = cellCenter(x, z); return [f, a, b]; };
  const defs = [['gaunt', 0, S.tube.x, S.tube.z, null], ['matron', ...at(0, 1, 9), ['C', 'H']], ['dog', ...at(1, 6, 1), ['W', 'H', 'K']], ['wretch', 0, 0, 0, null], ['deer', ...at(2, 4, 9), ['H']], ['wendigo', ...at(2, 7, 1), ['Z', 'H', 'Q']]];
  for (const [k, f, x, z, home] of defs) { const m = new Monster(k, f, x, z, home); await m.load(scene); monsters.push(m); }
  const gaunt = monsters[0]; gaunt.active = true; gaunt.inTube = true; gaunt.yaw = 0; gaunt.obj.scale.multiplyScalar(0.82); gaunt.x = S.tube.x; gaunt.z = S.tube.z; gaunt.root.position.y = 0.25; gaunt.play('idle');
  monsters[3].timer = 40; monsters[3].alpha = 0;
  if (!P) { P = new Player(camera, scene, LOW); P.onKey = keyAction; bindTouch($('touch'), P); }
  const [sx, sz] = cellCenter(8, 10); P.place(0, sx, sz, 0); P.dead = false; P.ghost = false; P.hidden = null; P.battery = 1; P.stamina = 1; P.locked = false; P.crouch = false;
  if (role === 'monster') { P.place(0, S.tube.x, S.tube.z + 1.5, 0); P.locked = true; P.lightOn = false; }
  if (!lightPool.length) for (let i = 0; i < (LOW ? 4 : 7); i++) { const l = new THREE.PointLight(0xffe7c2, 0, 9, 1.7); scene.add(l); lightPool.push(l); }
  // other players' bodies
  game = { t: 0, end: false, monT: 0, presT: 0, escaped: false, gauntAway: 0, tubeAt: role === 'monster' || zombie ? 45 : 75, earned: 0 };
  $('loadBar').style.width = '100%';
  setTimeout(() => { show('hud'); $('hud').hidden = false; floorBanner(0); toast(role === 'monster' ? t('monster_you') : t('hint_start'), true); updateHud(); }, 250);
  $('mobileBtns').hidden = !MOBILE; $('controlsHelp').hidden = MOBILE; $('controlsHelp').textContent = t('controls');
  if (!MOBILE) $('view').onclick = () => { if (!panelOpen()) $('view').requestPointerLock && $('view').requestPointerLock(); };
}
function makeState() {
  const digits = () => String(Math.floor(rng() * 10));
  const w = [120, 80, 45, 200, 65].map((v) => v + Math.floor(rng() * 4) * 5); const pickSet = [0, 2, 4].filter(() => rng() > 0.2); if (pickSet.length < 2) pickSet.push(1);
  return {
    inv: {}, notes: {}, safeCode: digits() + digits() + digits(), safeCams: [0, 1, 2].map(() => Math.floor(rng() * 4)),
    scaleW: w, scaleTarget: pickSet.reduce((a, i) => a + w[i], 0), chart: [0, 1, 2, 3].map(() => Math.floor(rng() * 4)), slotOrder: ['r', 'y', 'b'].sort(() => rng() - 0.5),
    wireR: [0, 1, 2, 3].sort(() => rng() - 0.5), exitCode: digits() + digits() + digits() + digits(), solved: {}, power: false, tubeBroken: false, knowChart: false, itemsTaken: 0, elev: {}, foundTape: false,
  };
}

// ---------------------------------------------------------------- input actions
function keyAction(code) {
  if (!game || game.end) return;
  if (code === 'KeyE') useNearest(); else if (code === 'KeyF') toggleLight(); else if (code === 'KeyC') P.crouch = !P.crouch; else if (code === 'KeyG') throwBottle(); else if (code === 'KeyJ') toggleJournal();
  else if (code === 'Escape' && panelOpen()) closePanel();
}
$('bUse').onclick = () => useNearest(); $('bLight').onclick = () => toggleLight(); $('bCrouch').onclick = () => { P.crouch = !P.crouch; $('bCrouch').classList.toggle('on', P.crouch); };
$('bThrow').onclick = () => throwBottle(); $('bNotes').onclick = () => toggleJournal();
$('bRun').addEventListener('touchstart', (e) => { P.runBtn = true; e.preventDefault(); }, { passive: false }); $('bRun').addEventListener('touchend', () => (P.runBtn = false));
function toggleLight() { P.lightOn = !P.lightOn; sfx.click(); }
function toggleJournal() {
  const j = $('journal'); if (!j.hidden) { j.hidden = true; return; }
  const code = [0, 1, 2, 3].map((i) => S.notes[i] != null ? S.notes[i] : '_').join(' ');
  const inv = Object.keys(S.inv).filter((k) => S.inv[k]).map((k) => `<li>${t(k)}${k === 'bottle' || k === 'battery' ? ' ×' + S.inv[k] : ''}</li>`).join('');
  j.innerHTML = `<b>${t('journal')}</b><p>${t('clue_exit')}: <span class="mono">${code}</span></p>${S.knowChart ? `<p>${t('clue_chart')}: <span class="mono">${S.chart.map((a) => '↑→↓←'[a]).join(' ')}</span></p>` : ''}<ul>${inv}</ul>`; j.hidden = false;
}
function throwBottle() {
  if (!S.inv.bottle || P.hidden || P.dead) return; S.inv.bottle--; const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  const x = P.x + dir.x * 7, z = P.z + dir.z * 7; let [cx, cz] = [x, z]; for (let i = 7; i > 0; i -= 0.5) { const tx = P.x + dir.x * i, tz = P.z + dir.z * i; if (W.los(P.f, P.x, P.z, tx, tz)) { cx = tx; cz = tz; break; } }
  setTimeout(() => { sfx.bottle(0, 1); makeDistraction(P.f, cx, cz); net.emit('ev', { t: 'noise', f: P.f, x: cx, z: cz }); }, 450); updateHud();
}
let distraction = null; function makeDistraction(f, x, z) { distraction = { f, x, z, t: 6 }; }

// nearest interactable in front of the player
function nearest() {
  let best = null, bd = 9; const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  for (const i of W.inter) { if (i.f !== P.f || i.taken) continue; const dx = i.x - P.x, dz = i.z - P.z, d = Math.hypot(dx, dz); if (d > i.r) continue;
    const dot = (dx * fx + dz * fz) / (d || 1); const score = d - dot * 0.8; if (dot > -0.2 || d < 0.9) if (score < bd) { bd = score; best = i; } }
  return best;
}
function promptFor(i) {
  if (!i) return ''; if (P.hidden) return t('leave');
  switch (i.kind) { case 'item': return `${t('take')}: ${t(i.type)}`; case 'locker': return t('hide'); case 'door': return i.door.lock && !i.door.unlocked ? `${t('locked')}` : t('open');
    case 'elevator': return t('elevator'); default: return t('p_' + i.kind) !== 'p_' + i.kind ? t('p_' + i.kind) : t('use'); }
}
function useNearest() {
  if (!game || P.dead || game.end || panelOpen()) return;
  if (P.hidden) { const L = P.hidden; P.hidden = null; P.x = L.x - Math.sin(L.ry) * 0.9; P.z = L.z - Math.cos(L.ry) * 0.9; sfx.door(); $('lockerView').hidden = true; return; }
  const i = nearest(); if (!i) return;
  if (role === 'monster') return;
  if (i.kind === 'item') return takeItem(i, true);
  if (i.kind === 'locker') { P.hidden = i; P.x = i.x; P.z = i.z; P.yaw = i.ry + Math.PI; sfx.door(); $('lockerView').hidden = false; return; }
  if (i.kind === 'door') {
    const d = i.door;
    if (d.lock && !d.unlocked) {
      if (d.lock === 'green' && S.inv.green) unlockDoor(d, true); else if (d.lock === 'valves') { sfx.locked(); toast(t('need_valves')); } else if (d.lock === 'exit') useStation('exit'); else { sfx.locked(); toast(t('need_green')); } return;
    }
    d.target = d.target > 0.5 ? 0 : 1; sfx.door(); net.emit('ev', { t: 'door', id: d.id, v: d.target }); return;
  }
  if (i.kind === 'elevator') return elevator();
  useStation(i.kind);
}
function unlockDoor(d, local) { d.unlocked = true; d.target = 1; sfx.door(); if (local) { net.emit('ev', { t: 'unlock', id: d.id }); toast(t('opened')); } }
function useStation(kind) {
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
}
function giveItem(type) { S.inv[type] = (S.inv[type] || 0) + 1; sfx.pickup(); toast(`${t('got')}: ${t(type)}`); if (type === 'battery') { P.battery = Math.min(1, P.battery + 0.45); S.inv.battery--; } updateHud(); }
function giveNote(n) { S.notes[n] = S.exitCode[n]; sfx.pickup(); toast(`${t('note')}: ${'_ _ _ _'.split(' ').map((c, i) => (i === n ? S.exitCode[n] : c)).join(' ')}`, true); }
function takeItem(i, local) {
  if (i.taken) return; i.taken = true; i.obj.visible = false; S.itemsTaken++;
  if (local) { game.earned += 3; if (i.type === 'note') giveNote(i.extra - 1); else if (i.type === 'tape') { S.foundTape = true; sfx.pickup(); toast(t('tape')); } else giveItem(i.type); net.emit('ev', { t: 'take', id: i.id, type: i.type, extra: i.extra });
    if (i.type === 'green' && !S.tubeBroken) game.tubeAt = Math.min(game.tubeAt, game.t + 8); }
}
function powerOn(local) { if (S.power) return; S.power = true; sfx.solved(); toast(t('power_on'), true); for (const f of [1, 2]) for (const a of W.anchors[f]) { a.on = true; a.flick = Math.random() < 0.15; } if (local) net.emit('ev', { t: 'power' }); }
function breakTube(local) {
  if (S.tubeBroken) return; S.tubeBroken = true; const tb = S.tube; flicker(0, 2.6); sfx.glass(); setTimeout(() => sfx.growl(0, 1.4), 600);
  setTimeout(() => { tb.pod.traverse((m) => { if (m.userData && m.userData.glass) m.visible = false; }); tb.liquid.visible = false; tb.red.visible = false; tb.light.color.set(0xff2a2a); tb.light.intensity = 1.2;
    const g = monsters[0]; g.inTube = false; g.obj.scale.multiplyScalar(1 / 0.82); g.root.position.y = 0; g.x = tb.x; g.z = tb.z + 1.2; g.state = 'patrol';
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), new THREE.MeshStandardMaterial({ color: 0x0a4a26, emissive: 0x06381c, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.85 })); puddle.rotation.x = -Math.PI / 2; puddle.position.set(tb.x, 0.02, tb.z); W.groups[0].add(puddle);
    for (const a of W.anchors[0]) { a.red = true; a.on = true; }
    if (role === 'monster') { P.locked = false; P.place(0, tb.x, tb.z + 1.2, 0); }
    toast(t('tube_break'), true); }, 2600);
  if (local) net.emit('ev', { t: 'tube' });
}
let flickT = [0, 0, 0]; function flicker(f, d) { flickT[f] = Math.max(flickT[f], d); sfx.flicker(); }

// ---------------------------------------------------------------- elevator
function elevator() {
  const f = P.f, opts = [];
  if (f > 0) opts.push([f - 1, t('go_up')]); if (f < 2) opts.push([f + 1, t('go_down')]);
  const p = $('panel'); p.innerHTML = `<div class="pbox"><div class="phead"><b>${t('elevator')}</b><button class="pclose" id="pclose">${t('close')}</button></div><div class="elev">${opts.map(([to, l]) => `<button class="pbtn" data-to="${to}">${l} · ${t('floor' + to)}</button>`).join('')}</div></div>`; p.hidden = false;
  if (document.pointerLockElement) document.exitPointerLock();
  p.querySelector('#pclose').onclick = closePanel;
  p.querySelectorAll('[data-to]').forEach((b) => (b.onclick = () => { const to = +b.dataset.to; if (to === 2 && !S.power) { sfx.locked(); toast(t('need_power')); return; } closePanel(); ride(to); }));
}
function ride(to) { P.locked = true; $('fade').classList.add('on'); sfx.elevator(); setTimeout(() => { const [x, z] = S.elev[to]; P.place(to, x, z + 0.8, P.yaw); P.hidden = null; floorBanner(to); $('fade').classList.remove('on'); P.locked = false; }, 2400); }
function floorBanner(f) { const b = $('banner'); b.textContent = t('floor' + f); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }

// ---------------------------------------------------------------- catching and dying
function caught(p, m) {
  if (game.end) return;
  if (p.id === net.PID) return localCaught(m);
  if (host) net.emit('ev', { t: 'caught', pid: p.id, m: m.kind });
  const o = others.get(p.id); if (o) o.dead = true;
}
function localCaught(m) {
  if (P.dead || role === 'monster') return; P.dead = true; P.locked = true; P.hidden = null; $('lockerView').hidden = true; closePanel(); if (document.pointerLockElement) document.exitPointerLock();
  // jumpscare: the monster's face fills the screen
  const mon = typeof m === 'string' ? monsters.find((q) => q.kind === m) : m;
  if (mon && mon.root) { const a = Math.atan2(P.x - mon.x, P.z - mon.z); mon.x = P.x - Math.sin(a) * 0.75; mon.z = P.z - Math.cos(a) * 0.75; mon.yaw = a; mon.alpha = 1; mon.active = true; mon.play(mon.acts.attack ? 'attack' : 'run'); mon.sync();
    P.yaw = a + Math.PI; P.pitch = Math.atan2(mon.k.h * 0.82 - 1.6, 0.75) * 0.9; }
  sfx.scream(); $('flash').classList.add('on'); setTimeout(() => $('flash').classList.remove('on'), 350);
  game.scare = 1.6; net.emit('ev', { t: 'caught', pid: net.PID, m: mon ? mon.kind : 'gaunt' });
  setTimeout(() => {
    if (net.inRoom() && [...others.values()].some((o) => !o.dead && !o.escaped && o.role !== 'monster')) { P.ghost = true; P.locked = false; P.dead = true; toast(t('spectate'), true); }
    else endRun(false);
  }, 1700);
}

// ---------------------------------------------------------------- networking glue
function fullState() { return { taken: items.filter((i) => i.taken).map((i) => i.id), doors: W.doors.map((d) => [d.id, d.target, d.unlocked ? 1 : 0]), solved: S.solved, power: S.power, tube: S.tubeBroken }; }
function applySync(d) { for (const id of d.taken) { const i = items.find((q) => q.id === id); if (i) takeItem(i, false); } for (const [id, tg, un] of d.doors) { const q = W.doors.find((x) => x.id === id); if (q) { q.target = tg; q.unlocked = !!un; } } Object.assign(S.solved, d.solved); if (d.power) powerOn(false); if (d.tube) breakTube(false); }
function applyEvent(d) {
  if (d.t === 'take') { const i = items.find((q) => q.id === d.id); if (i) takeItem(i, false); }
  else if (d.t === 'door') { const q = W.doors.find((x) => x.id === d.id); if (q) { q.target = d.v; sfx.door(); } }
  else if (d.t === 'unlock') { const q = W.doors.find((x) => x.id === d.id); if (q) unlockDoor(q, false); }
  else if (d.t === 'solve') { S.solved[d.k] = true; if (d.k === 'safe') {} }
  else if (d.t === 'power') powerOn(false);
  else if (d.t === 'tube') breakTube(false);
  else if (d.t === 'flag') S[d.k] = true;
  else if (d.t === 'noise') { sfx.bottle(0, 0.5); makeDistraction(d.f, d.x, d.z); }
  else if (d.t === 'caught') { if (d.pid === net.PID) localCaught(d.m); else { const o = others.get(d.pid); if (o) o.dead = true; } }
  else if (d.t === 'escape') { const o = others.get(d.pid); if (o) o.escaped = true; }
  else if (d.t === 'over') endRun(false, d.why);
}
function applyMonsters(d) { d.m.forEach((s, i) => { const m = monsters[i]; if (!m) return; m.tx = s[1]; m.tz = s[2]; if (m.f !== s[0]) { m.x = s[1]; m.z = s[2]; } m.f = s[0]; m.yaw = s[3]; m.active = !!s[4]; m.alpha = s[5]; m.state = s[6]; m.play(s[7]); }); }
async function updateOthers(dt) {
  if (!net.inRoom()) return;
  for (const p of lobbyPeersLive()) {
    let o = others.get(p.pid);
    if (!o) { o = { pid: p.pid, loading: true }; others.set(p.pid, o); rigged('hum/hum_' + (p.skin || 'Male_Adult_01') + '.glb').then(({ obj, clips }) => { const g = new THREE.Group(); g.add(obj); obj.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(obj); obj.scale.multiplyScalar(1.75 / (bb.max.y - bb.min.y)); obj.rotation.y = Math.PI;
      o.root = g; o.mixer = new THREE.AnimationMixer(obj); o.acts = {}; for (const c of clips) o.acts[c.name] = o.mixer.clipAction(c); scene.add(g); o.loading = false; }); }
    Object.assign(o, { f: p.f, x: p.x, z: p.z, yaw: p.yaw, hidden: p.hidden, noise: p.noise, alive: p.alive, ghost: p.ghost, crouch: p.crouch, running: p.running, role: p.role, escaped: p.escaped || o.escaped, name: p.name, seen: performance.now() });
    if (o.root) { const tx = p.x || 0, tz = p.z || 0; o.root.position.x += (tx - o.root.position.x) * Math.min(1, dt * 10); o.root.position.z += (tz - o.root.position.z) * Math.min(1, dt * 10); o.root.position.y = FLOOR_Y[p.f || 0]; o.root.rotation.y = (p.yaw || 0) + Math.PI;
      o.root.visible = !p.hidden && !p.ghost && p.alive !== false && p.role !== 'monster' && !p.escaped; const an = p.crouch ? 'crouch' : p.noise > 8 ? 'run' : p.noise > 1 ? 'walk' : 'idle';
      if (o.cur !== an && o.acts[an]) { o.acts[an].reset().fadeIn(0.2).play(); if (o.acts[o.cur]) o.acts[o.cur].fadeOut(0.2); o.cur = an; } o.mixer.update(dt); }
  }
}
function lobbyPeersLive() { return (lobby.peers || []).filter((p) => p.pid !== net.PID && !p.lobby); }
function playersForBrains() {
  const me = { id: net.PID, f: P.f, x: P.x, z: P.z, yaw: P.yaw, hidden: !!P.hidden, noise: P.noise, alive: !P.dead, ghost: P.ghost, crouch: P.crouch, running: P.running };
  const list = role === 'monster' ? [] : [me];
  for (const o of others.values()) if (o.f != null && o.role !== 'monster' && !o.escaped) list.push({ id: o.pid, f: o.f, x: o.x, z: o.z, yaw: o.yaw, hidden: o.hidden, noise: o.noise, alive: o.alive !== false && !o.dead, ghost: o.ghost, crouch: o.crouch, running: o.running });
  return list;
}

// ---------------------------------------------------------------- frame
let last = performance.now(), hudT = 0;
function frame() {
  requestAnimationFrame(frame);
  const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!game || !W) { renderer.render(scene, camera); return; }
  game.t += dt;
  if (!game.end) {
    if (!panelOpen()) P.update(dt, W); else P.update(0, W);
    // monster player drives the gaunt body
    if (role === 'monster' && !P.locked) { const g = monsters[0]; g.f = P.f; g.x = P.x; g.z = P.z; g.yaw = P.yaw + Math.PI; g.play(P.running ? 'run' : P.noise > 1 ? 'walk' : 'idle'); P.flash.intensity = 0; }
    if (host) {
      if (!S.tubeBroken && game.t > game.tubeAt) breakTube(true);
      const players = playersForBrains(); const rage = Math.min(0.9, S.itemsTaken * 0.06);
      const ctx = { caught, distraction, rage, flicker: (f) => flicker(f, 0.8), sound: (m, s) => playMonSound(m, s) };
      for (const m of monsters) {
        if (m.kind === 'gaunt' && (m.inTube || (role === 'monster') || (zombiePid && zombiePid !== net.PID))) { if (zombiePid && !m.inTube) { const z = others.get(zombiePid); if (z && z.f != null) { m.f = z.f; m.x = z.x; m.z = z.z; m.yaw = (z.yaw || 0) + Math.PI; m.play(z.running ? 'run' : z.noise > 1 ? 'walk' : 'idle'); } }
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
    // escape: walking into the tunnel room after the exit door opens
    if (!P.dead && role !== 'monster' && P.f === 2 && cellAt(2, toCell(P.x), toCell(P.z)) === 'F' && !game.escaped) { game.escaped = true; net.emit('ev', { t: 'escape', pid: net.PID }); runEnding(); }
    net.presence({ f: P.f, x: +P.x.toFixed(2), z: +P.z.toFixed(2), yaw: +P.yaw.toFixed(2), hidden: !!P.hidden, noise: P.noise, alive: !P.dead, ghost: P.ghost, crouch: P.crouch, running: P.running, role, skin: net.getProfile().skin, name: myName(), escaped: game.escaped });
  }
  for (const m of monsters) { if (m.inTube) { m.t += dt; if (m.mixer) m.mixer.update(dt * 0.3); m.root.position.set(S.tube.x, 0.25 + Math.sin(m.t) * 0.06, S.tube.z); m.root.rotation.y = m.yaw; m.root.visible = true; continue; } m.animate(dt); m.root.visible = m.root.visible && m.f === P.f; }
  updateOthers(dt); W.update(dt); updateLights(dt);
  // fear: heartbeat and shake from the closest active monster on this floor
  let fear = 0; for (const m of monsters) if (m.active && m.f === P.f && m.alpha > 0.5 && !m.inTube) fear = Math.max(fear, 1 - Math.hypot(m.x - P.x, m.z - P.z) / 14);
  if (!P.dead && role !== 'monster') setHeartbeat(Math.max(0, fear)); $('vig').style.opacity = 0.35 + fear * 0.55;
  if (game.scare > 0) { game.scare -= dt; camera.position.x += (Math.random() - 0.5) * 0.06; camera.position.y += (Math.random() - 0.5) * 0.06; }
  hudT -= dt; if (hudT <= 0) { hudT = 0.12; updateHud(); }
  renderer.render(scene, camera);
}
function gauntTravel(m, players, dt) {
  const live = players.filter((p) => p.alive && !p.ghost); if (!live.length || m.state === 'chase') { m.awayT = 0; return; }
  if (live.some((p) => p.f === m.f)) { m.awayT = 0; return; }
  m.awayT = (m.awayT || 0) + dt; if (m.awayT > 22) { const f = live[0].f; const [x, z] = S.elev[f]; m.f = f; m.x = x + 1; m.z = z + 1; m.awayT = 0; m.state = 'patrol'; if (P.f === f) sfx.ding(); }
}
function playMonSound(m, s) { if (m.f !== P.f) return; const dx = m.x - P.x, dz = m.z - P.z, d = Math.hypot(dx, dz); if (d > 22) return; const vol = Math.max(0.15, 1 - d / 22);
  const ang = Math.atan2(dx, dz) - (P.yaw + Math.PI); const pan = Math.sin(-ang); sfx[s](pan, vol); }
function checkMatchOver() {
  if (!net.inRoom() || game.end) return; const ps = playersForBrains(); if (!ps.length) return;
  if (ps.every((p) => !p.alive || p.ghost)) { net.emit('ev', { t: 'over', why: role === 'monster' || zombiePid ? 'monster_won' : 'all_caught' }); endRun(false, zombiePid ? 'monster_won' : 'all_caught'); }
}
function updateLights(dt) {
  flickT = flickT.map((v) => Math.max(0, v - dt));
  const f = P.f, anc = W.anchors[f].map((a) => [a, Math.hypot(a.x - P.x, a.z - P.z)]).sort((a, b) => a[1] - b[1]);
  lightPool.forEach((l, i) => { const e = anc[i]; if (!e) { l.intensity = 0; return; } const a = e[0];
    let on = a.on ? 1 : 0; if (a.flick && Math.random() < 0.06) a.fl = Math.random() * 0.25; if (a.fl > 0) { a.fl -= dt; on *= 0.15; } if (flickT[f] > 0) on *= Math.random() < 0.5 ? 0 : 0.6;
    const red = a.red; l.color.set(red ? 0xff2020 : a.col); const pulse = red ? 0.55 + 0.45 * Math.sin(game.t * 3) : 1;
    l.intensity = on * (red ? 7 : 5.5) * pulse; l.position.set(a.x, FLOOR_Y[f] + WH - 0.4, a.z); l.distance = red ? 10 : 9; });
  for (let ff = 0; ff < 3; ff++) for (const a of W.anchors[ff]) { a.lamp.material.emissiveIntensity = a.on ? (a.red ? 0.6 : 1.2) : 0.02; a.lamp.material.emissive.set(a.red ? 0xff2020 : 0xfff0d0); }
}
function updateHud() {
  if (!P || !S) return; const i = game && !game.end && !P.dead ? nearest() : null; const pr = promptFor(i);
  $('prompt').textContent = pr; $('prompt').hidden = !pr || panelOpen(); $('bUse').textContent = pr || t('use');
  $('stam').style.width = (P.stamina * 100) + '%'; $('batt').style.width = (P.battery * 100) + '%'; $('bottles').textContent = S.inv.bottle || 0;
  $('invIcons').innerHTML = ['green', 'red', 'key', 'screwdriver', 'fuse_r', 'fuse_y', 'fuse_b'].filter((k) => S.inv[k]).map((k) => `<span class="ic ic-${k}" title="${t(k)}"></span>`).join('');
}

// ---------------------------------------------------------------- ending
async function runEnding() {
  game.end = true; P.locked = true; closePanel(); if (document.pointerLockElement) document.exitPointerLock(); $('fade').classList.add('on'); setAmbient(0.15);
  await new Promise((r) => setTimeout(r, 1200));
  const es = new THREE.Scene(); es.background = new THREE.Color(0x0a0f1a); es.fog = new THREE.FogExp2(0x0a0f1a, 0.045); es.add(new THREE.HemisphereLight(0x6a7da8, 0x101418, 0.7));
  const moon = new THREE.DirectionalLight(0x9fb4e0, 0.8); moon.position.set(-10, 20, 5); es.add(moon);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0xdfe6ef, roughness: 1 })); ground.rotation.x = -Math.PI / 2; es.add(ground);
  const treeM = new THREE.MeshStandardMaterial({ color: 0x0f1a14, roughness: 1 }), snowM = new THREE.MeshStandardMaterial({ color: 0xe8eef6 });
  for (let i = 0; i < 140; i++) { const a = Math.random() * Math.PI * 2, r = 12 + Math.random() * 60, h = 5 + Math.random() * 6; if (Math.sin(a) * r - 10 < -17 && Math.abs(Math.cos(a) * r) < 16) continue; const tr = new THREE.Mesh(new THREE.ConeGeometry(1.2 + Math.random(), h, 7), treeM); tr.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r - 10); es.add(tr); const cap = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 7), snowM); cap.position.set(tr.position.x, h - 0.4, tr.position.z); es.add(cap); }
  // the lab building with rows of lit, empty tubes in its windows
  const lab = new THREE.Mesh(new THREE.BoxGeometry(26, 8, 10), new THREE.MeshStandardMaterial({ color: 0x2a2f36 })); lab.position.set(0, 4, -26); es.add(lab);
  for (let i = 0; i < 9; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.6), new THREE.MeshBasicMaterial({ color: 0x3cff9a })); w.position.set(-10 + i * 2.5, 4, -20.95); es.add(w); const tube = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 2.2), new THREE.MeshBasicMaterial({ color: 0x0c3a22 })); tube.position.set(w.position.x, 4, -20.9); es.add(tube); }
  const door = new THREE.Mesh(new THREE.BoxGeometry(3, 3.4, 0.4), new THREE.MeshStandardMaterial({ color: 0x555b62, metalness: 0.6 })); door.position.set(0, 1.7, -20.8); es.add(door);
  // ambulance with flashing lights
  const amb = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 5), new THREE.MeshStandardMaterial({ color: 0xf2f2f2 })); body.position.y = 1.3; amb.add(body);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.3, 5.05), new THREE.MeshStandardMaterial({ color: 0xd01818 })); stripe.position.y = 1.2; amb.add(stripe);
  const lr = new THREE.PointLight(0xff1a1a, 0, 18), lb = new THREE.PointLight(0x1a4dff, 0, 18); lr.position.set(-0.6, 2.7, 0); lb.position.set(0.6, 2.7, 0); amb.add(lr, lb); amb.position.set(9, 0, 4); amb.rotation.y = -0.6; es.add(amb);
  const wend = monsters.find((m) => m.kind === 'wendigo'); let wObj = null; if (wend) { const { obj } = await rigged(KINDS.wendigo.file); obj.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(obj); obj.scale.multiplyScalar(3 / (bb.max.y - bb.min.y)); obj.position.set(-9, 0, -8); obj.rotation.y = 0.7; es.add(obj); wObj = obj; }
  const snow = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 6000 }, (_, i) => (i % 3 === 1 ? Math.random() * 20 : (Math.random() - 0.5) * 60)), 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 0.08 })); es.add(snow);
  const ecam = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200); $('fade').classList.remove('on'); $('hud').hidden = true; $('endText').hidden = false; $('endText').textContent = '';
  const t0 = performance.now(); let shown1 = false, shown2 = false;
  await new Promise((done) => { const step = () => { const tt = (performance.now() - t0) / 1000;
    ecam.position.set(Math.sin(tt * 0.05) * 3, 1.7 + Math.sin(tt * 2) * 0.03, -6 + tt * 0.9); ecam.lookAt(tt < 6 ? 0 : -9 * Math.min(1, (tt - 6) / 2), 2.2, tt < 6 ? -26 : -8);
    if (tt > 6) ecam.lookAt(-9, 2, -8);
    lr.intensity = Math.sin(tt * 9) > 0 ? 9 : 0; lb.intensity = Math.sin(tt * 9) > 0 ? 0 : 9;
    const pos = snow.geometry.attributes.position; for (let i = 1; i < pos.array.length; i += 3) { pos.array[i] -= 0.03; if (pos.array[i] < 0) pos.array[i] = 20; } pos.needsUpdate = true;
    if (tt > 3 && !shown1) { shown1 = true; $('endText').textContent = t('end_text'); }
    if (wObj) wObj.visible = tt < 9.5; if (tt > 9.5 && !shown2) { shown2 = true; sfx.whisper(-0.5); }
    renderer.render(es, ecam); if (tt < 11.5) requestAnimationFrame(step); else done(); }; step(); });
  $('endText').hidden = true; endRun(true);
}
function endRun(win, why) {
  if (game.endShown) return; game.endShown = true; game.end = true; setHeartbeat(0);
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
  // warm up the lab models while the player reads the menu
  loadAll(['lab/Wall_1.glb', 'lab/FloorTile_Basic.glb', 'lab/Props_Pod.glb']);
  requestAnimationFrame(frame);
})();
window.__nh = () => ({ P, S, W, monsters, items, game, useNearest, useStation, breakTube, ride, nearest, takeItem, localCaught });
