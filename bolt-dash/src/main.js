// Game flow: lobby menu, matchmaking, show rounds, HUD, camera, input, build mode.
import { THREE, CANNON, M, G, V, PI, rand, pick, clamp, damp, $, IS_TOUCH, store, save, persist, sfx, toast, renderer, scene, camera, canvas, sky, sun, world, puffs, confetti, fx, loadAssets, place, instanced, SkeletonUtils, renderScene, applyQuality } from './core.js';
import { t, LANG, LANGS, setLang, translateDom } from './i18n.js';
import { ITEMS, ITEM, CATS, SKINS, BATS, THUMB, computeBoneFix, dress, randomEquip, makeThumbs, holdItem, skinFx, updateGold, makePet } from './cosmetics.js';
import { Runner, think } from './runner.js';
import { MODES, MODE_LIST } from './modes.js';
import { cardOvr, cardTier } from './sports.js';
import './party.js';
import './slasher.js';
import { world as worldMode, initWorld, vortex, loadPacks, need, useBuff, WORLD_MODELS, life, saveLife } from './world.js';
import { WEAPONS, giveWeapon, fire, botFire, updateProjectiles, updatePickups, tickWeapons, clearProjectiles, dropWeapon } from './weapons.js';
import { editor, customMode, getMap, PIECES, MAP_TYPES, piecesFor } from './build.js';
import { comm, initCommunity, allMaps, featuredMaps, mapHash, publishMap, unpublishMap, recordPlay, liked, toggleLike, setFeatured, PUBLISH_PRICE, MAX_MAPS } from './community.js';

const NAMES = ['Zizo', 'Nour', 'Hamo', 'Lulu', 'Tito', 'Mido', 'Koko', 'Dodo', 'Bebo', 'Roro', 'Soso', 'Fofa', 'Sheko', 'Biscuit', 'Caramel', 'Pepper', 'Sesame', 'Noodle'];
const icon = (n, cls = 'i') => `<svg class="${cls}"><use href="#i-${n}"/></svg>`;
const show = (id, on) => { $(id).hidden = !on; };

// ---------------------------------------------------------------- progress: level, challenges, achievements, rewards
const today = () => new Date().toISOString().slice(0, 10);
const weekId = () => { const d = new Date(); const j = new Date(d.getFullYear(), 0, 1); return d.getFullYear() + '-' + Math.floor(((d - j) / 86400000 + j.getDay()) / 7); };
const freshDaily = () => ({ day: today(), list: [
  { k: 'coins', text: t('Collect 30 coins in rounds'), goal: 30, prog: 0, rew: 150 },
  { k: 'qualify', text: t('Qualify in 3 rounds'), goal: 3, prog: 0, rew: 200 },
  { k: 'dive', text: t('Dive 15 times'), goal: 15, prog: 0, rew: 100 },
] });
const freshWeekly = () => ({ week: weekId(), list: [
  { k: 'crown', text: t('Win the crown in a Show'), goal: 1, prog: 0, rew: 1500 },
  { k: 'qualify', text: t('Qualify in 20 rounds'), goal: 20, prog: 0, rew: 1000 },
  { k: 'coins', text: t('Collect 300 coins in rounds'), goal: 300, prog: 0, rew: 800 },
] });
const ACH = [
  { k: 'qualify', goal: 1, text: t('First qualification'), rew: 200 }, { k: 'win', goal: 1, text: t('First win'), rew: 500 }, { k: 'crown', goal: 1, text: t('First crown'), rew: 2000 },
  { k: 'shows', goal: 10, text: t('Play 10 Shows'), rew: 1000 }, { k: 'modes', goal: 7, text: t('Play every mode'), rew: 1000 }, { k: 'dive', goal: 100, text: t('Dive 100 times'), rew: 500 },
  { k: 'rare', goal: 1, text: t('Get a rare character'), rew: 1000 }, { k: 'qualify', goal: 50, text: t('Qualify 50 times'), rew: 2500 }, { k: 'crown', goal: 5, text: t('5 crowns'), rew: 5000 },
];
save.weekly = store.get('weekly', null); save.ach = store.get('ach', {}); save.achDone = store.get('achDone', []); save.codes = store.get('codes', []); save.wheelDay = store.get('wheelDay', '');
const persist2 = () => { persist(); for (const k of ['weekly', 'ach', 'achDone', 'codes', 'wheelDay']) store.set(k, save[k]); };
if (!save.daily || save.daily.day !== today()) save.daily = freshDaily();
if (!save.weekly || save.weekly.week !== weekId()) save.weekly = freshWeekly();
function reward(n, why) { save.coins += n; save.stats.earned = (save.stats.earned || 0) + n; toast(`${why}: +${n} ${t('coins')}`, 2.4); sfx.coin(); }
function track(k, n = 1) {
  if (save.daily.day !== today()) save.daily = freshDaily();
  if (save.weekly.week !== weekId()) save.weekly = freshWeekly();
  for (const c of [...save.daily.list, ...save.weekly.list]) if (c.k === k && c.prog < c.goal) { c.prog = Math.min(c.goal, c.prog + n); if (c.prog >= c.goal) reward(c.rew, t('Challenge complete')); }
  save.ach[k] = (save.ach[k] || 0) + n;
  ACH.forEach((a, i) => { if (a.k === k && !save.achDone.includes(i) && save.ach[k] >= a.goal) { save.achDone.push(i); setTimeout(() => reward(a.rew, t('Achievement') + ': ' + t(a.text)), 900); } });
  persist2();
}
const levelOf = (xp) => ({ lvl: 1 + Math.floor(xp / 150), cur: xp % 150, need: 150 });
G.onPlayerDive = () => track('dive');
// season track: rewards unlock as your level goes up
const SEASON = [
  { lvl: 2, coins: 200 }, { lvl: 3, item: 'skin-mint' }, { lvl: 4, coins: 400 }, { lvl: 5, item: 'h-cone' }, { lvl: 6, item: 'bat-bread' }, { lvl: 7, coins: 800 },
  { lvl: 8, item: 'f-sun' }, { lvl: 9, item: 'skin-night' }, { lvl: 10, coins: 1500 }, { lvl: 12, item: 'bat-pan' }, { lvl: 14, item: 'h-queen' }, { lvl: 16, coins: 3000 },
  { lvl: 18, item: 'bat-gold' }, { lvl: 20, item: 'skin-crystal' },
];
function claimSeason() {
  const L = levelOf(save.xp).lvl;
  for (const r of SEASON) if (r.lvl <= L && !save.season.includes(r.lvl)) {
    save.season.push(r.lvl);
    if (r.coins) reward(r.coins, t('Season level {n}', { n: r.lvl }));
    else if (!save.owned.includes(r.item)) { save.owned.push(r.item); toast(t('Season: unlocked {x}', { x: ITEM[r.item].name }), 2.4); sfx.pickup(); }
    else reward(300, t('Season'));
  }
  persist2();
}
// daily login reward: a 7-day streak that grows
const DAILY = [50, 80, 120, 180, 250, 350, 500];
function dailyState() {
  const d = save.dailyRew, y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const can = d.day !== today(); const streak = can ? (d.day === y ? d.streak % 7 : 0) : (d.streak - 1) % 7;
  return { can, idx: streak };
}
function claimDaily() {
  const s = dailyState(); if (!s.can) return;
  const n = DAILY[s.idx]; save.dailyRew = { day: today(), streak: s.idx + 1 }; reward(n, t('Daily reward (day {n})', { n: s.idx + 1 })); persist2();
}
// week event: one mode gives double coins
const EVENT_MODES = ['fall', 'race', 'stars', 'ball', 'cannons', 'climb', 'arena'];
const eventMode = () => EVENT_MODES[parseInt(weekId().split('-')[1]) % EVENT_MODES.length];

// ---------------------------------------------------------------- input
const keys = new Set();
const ctl = { jump: false, dive: false, fire: false, held: false, charge: null, stick: { x: 0, y: 0 }, yaw: 0, pitch: 0.26 };
addEventListener('keydown', (e) => {
  if (e.repeat) return; keys.add(e.code);
  if (e.code === 'Space') { ctl.jump = true; e.preventDefault(); }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyE') ctl.dive = true;
  if (e.code === 'KeyF' || e.code === 'Enter') { ctl.fire = true; ctl.held = true; }
  if (e.code === 'KeyE' && G.modeObj?.id === 'world') { if (!worldMode.serve()) worldMode.act(); }
  if (e.code === 'KeyQ') ctl.push = true;
  if (e.code === 'KeyG') ctl.grab = true;
  if (e.code === 'Escape' && flow.state === 'play') togglePause();
});
addEventListener('keyup', (e) => { keys.delete(e.code); if (e.code === 'KeyF' || e.code === 'Enter') ctl.held = false; if (e.code === 'KeyG') ctl.grab = false; });
addEventListener('blur', () => keys.clear());
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  sfx.unlock();
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: 0 };
  canvas.setPointerCapture(e.pointerId);
  if (flow.state === 'play' && !IS_TOUCH && G.modeObj?.bats) ctl.held = true;
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag || drag.id !== e.pointerId) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved += Math.abs(dx) + Math.abs(dy);
  if (drag.moved >= 8 && ctl.held && ctl.charge && !keys.has('KeyF')) { ctl.held = false; ctl.charge = null; show('pwr', false); }
  if (flow.state === 'build') { editor.cam.x = clamp(editor.cam.x - dx * editor.cam.zoom * 0.0025, -14, 14); editor.cam.z = clamp(editor.cam.z - dy * editor.cam.zoom * 0.004, -80, 14); }
  else if (flow.state === 'menu') { lobby.spin = (lobby.spin || 0) + dx * 0.012; lobby.spinT = 4; }
  else { ctl.yaw -= dx * 0.006 * save.sens; ctl.pitch = clamp(ctl.pitch + dy * 0.004 * save.sens, -0.45, 1.1); }
  drag.x = e.clientX; drag.y = e.clientY;
});
canvas.addEventListener('pointerup', (e) => {
  if (!keys.has('KeyF')) ctl.held = false;
  if (drag && drag.moved < 8) {
    if (flow.state === 'build') editor.tap(e.clientX, e.clientY);
    else if (flow.state === 'menu') heroEmote();
    else if (flow.state === 'fly') flow.flyT = 99;
    else if (flow.state === 'play' && !IS_TOUCH) ctl.fire = true;
  }
  drag = null;
});
canvas.addEventListener('pointercancel', () => { drag = null; });
canvas.addEventListener('wheel', (e) => { if (flow.state === 'build') { editor.cam.zoom = clamp(editor.cam.zoom + e.deltaY * 0.02, 12, 60); e.preventDefault(); } }, { passive: false });
{
  const stick = $('stick'), knob = $('knob'); let sid = null, cx = 0, cy = 0;
  const move = (e) => { if (e.pointerId !== sid) return; let dx = e.clientX - cx, dy = e.clientY - cy; const l = Math.hypot(dx, dy), m = 55; if (l > m) { dx *= m / l; dy *= m / l; } knob.style.transform = `translate(${dx}px,${dy}px)`; ctl.stick.x = dx / m; ctl.stick.y = dy / m; };
  stick.addEventListener('pointerdown', (e) => { sid = e.pointerId; stick.setPointerCapture(sid); const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; move(e); sfx.unlock(); });
  stick.addEventListener('pointermove', move);
  const end = (e) => { if (e.pointerId !== sid) return; sid = null; knob.style.transform = ''; ctl.stick.x = ctl.stick.y = 0; };
  stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
  for (const [id, k] of [['bJump', 'jump'], ['bDive', 'dive'], ['bFire', 'fire'], ['bPush', 'push'], ['bGrab', 'grab']]) {
    const el = $(id);
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); ctl[k] = true; if (k === 'fire') ctl.held = true; el.classList.add('on'); sfx.unlock(); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, () => { el.classList.remove('on'); if (k === 'fire') ctl.held = false; if (k === 'grab') ctl.grab = false; });
  }
}
function readPlayerInput(r) {
  let fx_ = 0, fz = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) fz += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) fz -= 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) fx_ -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) fx_ += 1;
  fx_ += ctl.stick.x; fz -= ctl.stick.y;
  const s = Math.sin(ctl.yaw), c = Math.cos(ctl.yaw);
  r.input.x = -s * fz + c * fx_; r.input.z = -c * fz - s * fx_;
  if (ctl.jump) { r.input.jump = true; ctl.jump = false; }
  if (ctl.dive) { r.input.dive = true; ctl.dive = false; }
  if (ctl.push) { r.input.push = true; ctl.push = false; }
  r.input.grab = !!ctl.grab;
  if (G.modeObj?.bats || G.modeObj?.charge) batCharge(r);
  else if (ctl.fire) { r.input.fire = true; ctl.fire = false; }
}
// bat swings: hold to charge a power bar, let go to hit. The middle of the bar is the perfect hit; a quick tap is a normal hit.
const PERFECT = [0.44, 0.6];
function batCharge(r) {
  ctl.fire = false;
  const now = performance.now() / 1000;
  if (ctl.held && !ctl.charge) ctl.charge = { t0: now, v: 0 };
  if (!ctl.charge) return;
  const t = now - ctl.charge.t0, v = 0.5 - 0.5 * Math.cos(t * PI * 1.25);
  ctl.charge.v = v;
  if (t > 0.16) { show('pwr', true); $('pwrFill').style.width = (v * 100) + '%'; $('pwr').classList.toggle('hot', v >= PERFECT[0] && v <= PERFECT[1]); }
  if (!ctl.held) {
    const tap = t <= 0.16, perfect = !tap && v >= PERFECT[0] && v <= PERFECT[1];
    r.batPower = tap ? 0.85 : perfect ? 1.4 : 0.45 + v * 0.75; r.batPerfect = perfect;
    r.input.fire = true; ctl.charge = null; show('pwr', false);
  }
}
G.onFire = (r) => {
  if (G.modeObj?.onFire) return G.modeObj.onFire(r);
  if (!r.weapon) return;
  if (r.isPlayer) fire(r, (G.aimPoint || V(r.pos.x + Math.sin(r.facing) * 10, r.pos.y + 1, r.pos.z + Math.cos(r.facing) * 10)).clone().sub(V(r.pos.x, r.pos.y + 1.1, r.pos.z)), G.lock);
  else fire(r, V(Math.sin(r.facing), 0, Math.cos(r.facing)));
};
G.botFire = (r) => botFire(r);

// ---------------------------------------------------------------- lobby: your character dances; now and then someone runs in and knocks it over
const lobby = { root: new THREE.Group(), hero: null, mixer: null, acts: {}, floaters: [], view: 'play', t: 0, state: 'dance', st: 0, move: 'groove', moveT: 0, nextHit: 7, vel: V(), hx: 0, hz: 0 };
const clipOf = (n) => M.Character.animations.find((a) => a.name.endsWith('|' + n));
function rig(model) {
  const mixer = new THREE.AnimationMixer(model), acts = {};
  for (const n of ['Idle', 'Wave', 'Yes', 'No', 'Punch', 'Jump', 'Jump_Idle', 'Jump_Land', 'Run', 'Walk', 'HitReact', 'Duck']) {
    const c = clipOf(n); if (!c) continue; acts[n] = mixer.clipAction(c);
    if (!['Idle', 'Run', 'Walk', 'Jump_Idle'].includes(n)) { acts[n].setLoop(THREE.LoopOnce, 1); acts[n].clampWhenFinished = true; }
  }
  return { mixer, acts, cur: null };
}
function playOn(r, n, fade = 0.2, speed = 1) { const a = r.acts[n]; if (!a) return; a.timeScale = speed; if (r.cur === a && a.isRunning()) return; a.reset().fadeIn(fade).play(); if (r.cur && r.cur !== a) r.cur.fadeOut(fade); r.cur = a; }
function buildLobby() {
  const g = lobby.root; g.position.set(0, 0, 200); scene.add(g);
  const cols = [0xff7ab8, 0xffd23f, 0x5fe0b0, 0x7fb8ff], cells = [];
  const sx = 2.42, sz = 2.095, R = 5;
  for (let q = -R; q <= R; q++) for (let r = Math.max(-R, -q - R); r <= Math.min(R, -q + R); r++) cells.push({ x: sx * (q + r / 2), z: sz * r, ring: Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) });
  const { meshes } = instanced('k/block-snow-low-hexagon', cells.map((c) => ({ x: c.x, y: -1.1 + (c.ring === 0 ? 0.5 : 0), z: c.z, s: 2.2 })), g);
  meshes.forEach((m) => { cells.forEach((c, i) => m.setColorAt(i, new THREE.Color(cols[c.ring % 4]))); m.instanceColor.needsUpdate = true; });
  lobby.floor = { meshes, cells, cols };
  // everything stands on the floor (y = 0), nothing sinks into it
  for (const [x, z, n, ry] of [[-10, -7, 'k/bannerTowerRed', 0.3], [10, -7, 'k/bannerTowerGreen', -0.3], [-13, 1, 'k/bannerTowerGreen', 0.6], [13, 1, 'k/bannerTowerRed', -0.6]]) place(n, x, 0, z, 4.2, ry, g);
  for (const [x, z, n] of [[-6, -10, 'k/banner-red'], [6, -10, 'k/banner-green'], [0, -11, 'k/banner']]) place(n, x, 0, z, n === 'k/banner' ? 5 : 6, 0, g);
  for (const [x, z, n, s] of [[-8.5, 3.5, 'acc/present-a-cube', 2.6], [8.8, 3, 'k/present-b-round', 3], [-7.4, 5.6, 'k/present-b-round', 2.2], [7.2, 5.8, 'acc/present-a-cube', 2]]) place(n, x, 0, z, s, rand(0, 6), g);
  for (const [x, z, n] of [[-5.4, 7.4, 'k/candy-cane-red'], [5.6, 7.2, 'k/candy-cane-green'], [-11.5, -2.5, 'k/candy-cane-green'], [11.5, -2.5, 'k/candy-cane-red']]) place(n, x, 0, z, 5, rand(0, 6), g);
  for (const [x, z] of [[-3, -9], [3, -9]]) place('k/flagCheckers', x, 0, z, 3, 0, g);
  for (const [x, z] of [[-6.5, -3], [6.5, -3]]) place('z/Launchpad', x, 0, z, 1.4, rand(0, 6), g);
  lobby.hero = SkeletonUtils.clone(M.Character.scene); lobby.hero.scale.setScalar(0.75); lobby.hero.position.set(0, 1.4, 0); g.add(lobby.hero);
  lobby.hero.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  lobby.rig = rig(lobby.hero); playOn(lobby.rig, 'Idle', 0);
  lobby.rig.mixer.addEventListener('finished', () => { if (lobby.state === 'dance') playOn(lobby.rig, 'Idle'); });
  // the troublemaker who runs in now and then
  lobby.bully = SkeletonUtils.clone(M.Character.scene); lobby.bully.scale.setScalar(0.7); lobby.bully.visible = false; g.add(lobby.bully);
  lobby.bully.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  lobby.brig = rig(lobby.bully);
  for (let k = 0; k < 14; k++) {
    const name = ['Cube_Question', 'Coin', 'Star', 'k/crate-item', 'z/Balloon', 'z/Torus', 'z/Ring_Hoop'][k % 7];
    const a = (k / 14) * PI * 2, rr = rand(7, 13);
    const s = { 'k/crate-item': 1.6, Cube_Question: 0.5, 'z/Balloon': rand(1.6, 2.4), 'z/Torus': 1.6, 'z/Ring_Hoop': 1.6 }[name] ?? 0.55;
    const o = place(name, Math.cos(a) * rr, rand(2.5, 8), -Math.abs(Math.sin(a)) * rr - 3, s, rand(0, 6), g);
    lobby.floaters.push({ obj: o, base: o.position.y, ph: rand(0, 6), spin: rand(0.6, 1.6) * (k % 2 ? 1 : -1) });
  }
  heroDress();
}
function heroDress(extra) {
  const e = { ...save.equip, ...(extra || {}) }; dress(lobby.hero, e, { bat: true });
  // the pet stands next to your character in the menu
  if (lobby.petId !== e.pet) { lobby.pet?.o.removeFromParent(); lobby.pet = e.pet ? makePet(e.pet) : null; lobby.petId = e.pet; if (lobby.pet) { lobby.pet.o.scale.multiplyScalar(1.3); lobby.root.add(lobby.pet.o); } }
}
function fadeTo(n) { if (lobby.state !== 'dance') return; if (n === 'dance') { lobby.move = 'spin'; lobby.moveT = 0; return; } lobby.move = 'emote'; lobby.moveT = 0; playOn(lobby.rig, n); if (n === 'Jump') sfx.jump(); else sfx.click(); }
function heroEmote() { fadeTo(pick(['Wave', 'Yes', 'No', 'Punch', 'dance'])); }
const floorY = (x, z) => (Math.hypot(x, z) < 1.3 ? 0.5 : 0);
// in the menu your character floats in the air, cape flowing, so you always see all of it
const lobbyFloat = () => 1.5 + Math.sin(lobby.t * 1.7) * 0.18;
function updateLobby(dt) {
  lobby.t += dt; lobby.st += dt; lobby.moveT += dt;
  const h = lobby.hero, R = lobby.rig, t = lobby.t;
  if (lobby.pet) lobby.pet.update(dt, h.position.x, 0, h.position.z, h.rotation.y + PI * 0.75, false);
  R.mixer.update(dt); lobby.brig.mixer.update(dt);
  skinFx(h, dt, V(h.position.x + lobby.root.position.x, h.position.y, h.position.z + lobby.root.position.z), { moving: lobby.state === 'walk', puffs, scene });
  if (lobby.state === 'dance') {
    // a little routine: groove, spin, hop, then an emote
    if (lobby.move === 'groove' || lobby.move === 'hop') {
      playOn(R, 'Idle', 0.3, 1.4);
      const beat = Math.abs(Math.sin(t * PI * 2.1));
      h.position.y = lobbyFloat() + beat * (lobby.move === 'hop' ? 0.45 : 0.16);
      h.rotation.y = Math.sin(t * PI * 1.05) * 0.45; h.rotation.z = Math.sin(t * PI * 2.1) * 0.08;
    } else if (lobby.move === 'spin') {
      if (lobby.moveT < 0.05) playOn(R, 'Jump', 0.1);
      h.rotation.y = (lobby.moveT / 0.9) * PI * 2; h.position.y = lobbyFloat() + Math.sin(Math.min(1, lobby.moveT / 0.9) * PI) * 0.7; h.rotation.z = 0;
    } else { h.position.y = damp(h.position.y, lobbyFloat(), 10, dt); h.rotation.y = damp(h.rotation.y, 0, 6, dt); h.rotation.z = 0; }
    const len = { groove: 3.2, hop: 1.6, spin: 0.9, emote: 1.4 }[lobby.move];
    if (lobby.moveT > len) { lobby.move = pick(['groove', 'groove', 'hop', 'spin', 'emote']); lobby.moveT = 0; if (lobby.move === 'emote') playOn(R, pick(['Wave', 'Yes', 'Punch', 'No'])); }
    lobby.nextHit -= dt;
    if (lobby.nextHit <= 0 && flow.state === 'menu') startBully();
  } else if (lobby.state === 'fly') {
    lobby.vel.y -= 22 * dt; h.position.addScaledVector(lobby.vel, dt); h.rotation.x += dt * 9; h.rotation.y += dt * 3;
    const fy = floorY(h.position.x, h.position.z);
    if (h.position.y <= fy && lobby.vel.y < 0) { h.position.y = fy; h.rotation.x = 0; lobby.state = 'down'; lobby.st = 0; fx.dust(h.getWorldPosition(V()), 10, 0xffffff, 3); sfx.land(); }
  } else if (lobby.state === 'down') {
    h.rotation.x = damp(h.rotation.x, -1.3, 10, dt);
    if (Math.random() < dt * 10) puffs.emit({ pos: h.getWorldPosition(V()).add(V(rand(-0.4, 0.4), 1.6, rand(-0.4, 0.4))), vel: V(0, 0.3, 0), life: 0.5, size: 0.12, color: 0xffd23f });
    if (lobby.st > 1.1) { lobby.state = 'getup'; lobby.st = 0; playOn(R, 'Jump_Land', 0.1); }
  } else if (lobby.state === 'getup') {
    h.rotation.x = damp(h.rotation.x, 0, 12, dt);
    if (lobby.st > 0.5) { lobby.state = 'walk'; lobby.st = 0; playOn(R, 'Walk', 0.2, 1.2); }
  } else if (lobby.state === 'walk') {
    const dx = -h.position.x, dz = -h.position.z, d = Math.hypot(dx, dz);
    h.rotation.y = Math.atan2(dx, dz); h.rotation.x = 0;
    if (d > 0.08) { const sp = Math.min(d, 2.2 * dt); h.position.x += dx / d * sp; h.position.z += dz / d * sp; h.position.y = damp(h.position.y, floorY(h.position.x, h.position.z), 12, dt); }
    else { h.position.set(0, h.position.y, 0); lobby.state = 'dance'; lobby.move = 'emote'; lobby.moveT = 0; playOn(R, 'No'); lobby.nextHit = rand(10, 16); }
  }
  // mirror: drag on your character to turn it around and look at your outfit from every side
  if (lobby.spinT > 0 || lobby.view === 'locker') {
    lobby.spinT = Math.max(0, (lobby.spinT || 0) - dt);
    if (lobby.state === 'dance') { h.rotation.y = lobby.spin || 0; h.rotation.z = 0; }
  } else if (lobby.spin) lobby.spin = 0;
  if (lobby.view !== 'locker') updateBully(dt); else lobby.nextHit = Math.max(lobby.nextHit, 6);
  for (const fl of lobby.floaters) { fl.obj.rotation.y += fl.spin * dt; fl.obj.position.y = fl.base + Math.sin(lobby.t * 1.3 + fl.ph) * 0.3; }
  const { meshes, cells, cols } = lobby.floor, c = new THREE.Color();
  if (Math.floor(lobby.t * 4) !== lobby.step) {
    lobby.step = Math.floor(lobby.t * 4);
    cells.forEach((cl, i) => { c.set(cols[(cl.ring + lobby.step) % 4]); meshes.forEach((m) => m.setColorAt(i, c)); });
    meshes.forEach((m) => { m.instanceColor.needsUpdate = true; });
  }
  if (Math.random() < dt * 16) {
    const g = lobby.root.position, cl = [0xff4f9a, 0xffd23f, 0x36e0a8, 0x5fcfff, 0xa070ff];
    confetti.emit({ pos: V(g.x + rand(-10, 10), g.y + 10, g.z + rand(-9, 3)), vel: V(rand(-0.5, 0.5), -rand(0.5, 1.5), 0), life: 7, size: 1, g: 0.4, drag: 0.2, spin: rand(2, 5), color: cl[Math.floor(rand(0, 5))], shrink: false });
  }
  lobby.popT = (lobby.popT ?? 4) - dt;
  if (lobby.popT <= 0) { lobby.popT = rand(4, 7); const g = lobby.root.position; for (const sd of [-1, 1]) fx.confetti(V(g.x + sd * 9, g.y + 1, g.z - 4), 60); sfx.boing(); }
}
function startBully() {
  const b = lobby.bully, side = Math.random() < 0.5 ? -1 : 1;
  dress(b, { ...randomEquip(false), back: pick(['c-hero', 'c-knight', 'c-wizard', 'c-rogue']) });
  b.visible = true; b.position.set(side * 13, 3, rand(-1, 2)); lobby.bstate = 'in'; lobby.bst = 0; lobby.bside = side;
  playOn(lobby.brig, 'Run', 0.1, 1.3);
}
function updateBully(dt) {
  const b = lobby.bully; if (!b.visible) return;
  lobby.bst += dt; const h = lobby.hero;
  if (lobby.bstate === 'in') {
    const dx = h.position.x - b.position.x, dz = h.position.z - b.position.z, d = Math.hypot(dx, dz);
    b.rotation.y = Math.atan2(dx, dz); b.position.y = damp(b.position.y, h.position.y + Math.sin(lobby.bst * 6) * 0.1, 4, dt);
    if (d > 1.1) { const sp = Math.min(d - 1.0, 8 * dt); b.position.x += dx / d * sp; b.position.z += dz / d * sp; }
    else if (lobby.state === 'dance') { lobby.bstate = 'punch'; lobby.bst = 0; playOn(lobby.brig, 'Punch', 0.05, 1.4); }
  } else if (lobby.bstate === 'punch' && lobby.bst > 0.25 && lobby.state === 'dance') {
    // knocked over
    const dir = V(h.position.x - b.position.x, 0, h.position.z - b.position.z).normalize();
    lobby.state = 'fly'; lobby.st = 0; lobby.vel.set(dir.x * 4.5, 7, dir.z * 4.5); playOn(lobby.rig, 'HitReact', 0.05);
    fx.burst(h.getWorldPosition(V()).add(V(0, 1, 0)), 0xffd23f, 14, 6); sfx.hit();
    lobby.bstate = 'taunt'; lobby.bst = 0; playOn(lobby.brig, 'Yes', 0.1);
  } else if (lobby.bstate === 'taunt' && lobby.bst > 0.9) {
    lobby.bstate = 'out'; playOn(lobby.brig, 'Run', 0.1, 1.4);
  } else if (lobby.bstate === 'out') {
    const tx = lobby.bside * 15; b.rotation.y = Math.atan2(tx - b.position.x, 2 - b.position.z);
    b.position.x += Math.sign(tx - b.position.x) * 8 * dt; b.position.y += dt * 2.5;
    if (Math.abs(b.position.x) > 14) b.visible = false;
  }
}
function lobbyCam(dt) {
  const g = lobby.root.position, narrow = innerWidth < innerHeight, sway = Math.sin(lobby.t * 0.25) * 0.4;
  let pos, look;
  if (lobby.view === 'locker') { pos = narrow ? V(g.x + sway * 0.3, g.y + 2.4, g.z + 6.4) : V(g.x + 1.4 + sway * 0.3, g.y + 2.5, g.z + 5.4); look = narrow ? V(g.x, g.y + 0.2, g.z) : V(g.x + 1.4, g.y + 1.75, g.z); }
  else { pos = narrow ? V(g.x + sway, g.y + 3.4, g.z + 8.6) : V(g.x + sway, g.y + 3.0, g.z + 7.6); look = narrow ? V(g.x, g.y + 1.55, g.z) : V(g.x, g.y + 2.1, g.z); }
  camPos.lerp(pos, 1 - Math.exp(-4 * dt)); camLook.lerp(look, 1 - Math.exp(-4 * dt));
  camera.position.copy(camPos); camera.lookAt(camLook);
  sun.position.set(g.x + 8, g.y + 18, g.z + 10); sun.target.position.copy(g);
}

// ---------------------------------------------------------------- skydive while looking for players
const dive = { root: new THREE.Group(), hero: null, rig: null, clouds: [], chute: null, t: 0 };
function buildDive() {
  const g = dive.root; g.position.set(0, 400, -600); g.visible = false; scene.add(g);
  dive.hero = SkeletonUtils.clone(M.Character.scene); dive.hero.scale.setScalar(0.55); g.add(dive.hero);
  dive.rig = rig(dive.hero);
  dive.chute = place('k/detail-parasol-a', 0, 1.0, 0, 6.5, 0, dive.hero.parent); dive.chute.visible = false;
  const cl = ['Cloud_1', 'Cloud_2', 'Cloud_3'];
  for (let i = 0; i < 30; i++) { const a = rand(0, PI * 2), r = rand(12, 45); const o = place(cl[i % 3], Math.cos(a) * r, rand(-70, 40), Math.sin(a) * r, rand(2, 4.5), rand(0, 6), g); o.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.set(0xffffff); m.material.emissive = new THREE.Color(0xffeefa); m.material.emissiveIntensity = 0.45; m.castShadow = false; } }); dive.clouds.push(o); }
}
function startDive() {
  dive.root.visible = true; lobby.root.visible = false; dive.t = 0; dive.open = false;
  dress(dive.hero, { ...save.equip }); dive.chute.visible = false; dive.chute.scale.setScalar(0.01);
  playOn(dive.rig, 'Jump_Idle', 0);
}
function updateDive(dt) {
  dive.t += dt; const h = dive.hero, t = dive.t;
  dive.rig.mixer.update(dt);
  if (!dive.open && t > 3.2) { dive.open = true; dive.chute.visible = true; sfx.boing(); fx.confetti(dive.root.position.clone().add(V(0, 3, 0)), 50); playOn(dive.rig, 'Idle', 0.3); }
  const speed = dive.open ? 7 : 34;
  if (dive.open) { const k = Math.min(1, (t - 3.2) / 0.35); dive.chute.scale.setScalar(6.5 * (k < 1 ? 1.2 * k : 1)); h.rotation.x = damp(h.rotation.x, 0, 4, dt); h.rotation.z = Math.sin(t * 1.6) * 0.18; dive.chute.rotation.z = h.rotation.z; dive.chute.position.y = 1.0 + Math.sin(t * 3.2) * 0.04; }
  else { h.rotation.x = 1.0 + Math.sin(t * 2) * 0.08; h.rotation.y = Math.sin(t * 0.7) * 0.4; h.rotation.z = Math.sin(t * 1.3) * 0.15; }
  for (const c of dive.clouds) { c.position.y += speed * dt; if (c.position.y > 45) { c.position.y -= 115; const a = rand(0, PI * 2), r = rand(12, 45); c.position.x = Math.cos(a) * r; c.position.z = Math.sin(a) * r; } }
  if (!dive.open && Math.random() < dt * 30) puffs.emit({ pos: dive.root.position.clone().add(V(rand(-2, 2), rand(-4, -1), rand(-2, 2))), vel: V(0, 30, 0), life: 0.4, size: 0.08, color: 0xffffff });
  const g = dive.root.position, a = t * 0.25, dist = innerWidth < innerHeight ? 7.5 : 6;
  camera.position.set(g.x + Math.sin(a) * dist, g.y + (dive.open ? -0.5 : 2.5), g.z + Math.cos(a) * dist);
  camera.lookAt(g.x, g.y + (dive.open ? 1.6 : 0.6), g.z);
  sun.position.set(g.x + 8, g.y + 20, g.z + 10); sun.target.position.copy(g);
}

// ---------------------------------------------------------------- menu UI
const MODE_CHOICES = [
  { id: 'show', name: t('The Show'), sub: t('7 rounds in a row. Win the last one to take the crown'), thumb: 'fall' },
  ...MODE_LIST.map((m) => ({ id: m.id, name: m.name, sub: m.team ? t('Teams') + ' · ' + m.weapons : m.weapons, thumb: m.id, special: m.special })),
];
const choices = () => [...MODE_CHOICES, ...featuredMaps().map((m) => ({ id: 'cm:' + m.key, name: m.name, sub: t('Featured player map') + ' · ' + m.author, thumb: 'race' }))];
const selectedMode = () => choices().find((m) => m.id === flow.choice) || MODE_CHOICES[0];
const chalTab = { cur: 'd' };
function chalHtml(kind) {
  if (kind === 'a') return ACH.map((a, i) => { const done = save.achDone.includes(i), p = Math.min(a.goal, save.ach[a.k] || 0); return `<div><span>${t(a.text)}</span>${done ? `<span class="rew done">${t('Done')}</span>` : `<span class="rew">+${a.rew} ${icon('coin')}</span>`}<div class="bar"><i style="width:${p / a.goal * 100}%"></i></div></div>`; }).join('');
  const list = kind === 'w' ? save.weekly.list : save.daily.list;
  return list.map((c) => `<div><span>${t(c.text)}</span>${c.prog >= c.goal ? `<span class="rew done">${t('Done')}</span>` : `<span class="rew">+${c.rew} ${icon('coin')}</span>`}<div class="bar"><i style="width:${c.prog / c.goal * 100}%"></i></div></div>`).join('');
}
function seasonHtml() {
  const L = levelOf(save.xp), next = SEASON.filter((r) => !save.season.includes(r.lvl)).slice(0, 4);
  return `<h3>${t('Season 1')} <small>${t('Level {n}', { n: L.lvl })}</small></h3><div class="seasonbar"><i style="width:${L.cur / L.need * 100}%"></i></div>
    <div class="rews">${next.map((r) => `<div>${r.coins ? `<b>${r.coins}</b>${t('coins')}` : `<img alt="" src="${THUMB[r.item] || ''}">`}<span>${t('Level {n}', { n: r.lvl })}</span></div>`).join('') || `<div class="got">${t('Season complete!')}</div>`}</div>`;
}
function dailyHtml() {
  const s = dailyState();
  return `<h3>${t('Daily reward')} <small>${s.can ? t('Ready') : t('Tomorrow')}</small></h3><div class="dots">${DAILY.map((n, i) => `<i class="${i < s.idx || (!s.can && i === s.idx) ? 'done' : i === s.idx && s.can ? 'now' : ''}">${n}</i>`).join('')}</div>
    <button class="btn" data-claim="daily" ${s.can ? '' : 'disabled'}>${s.can ? t('Claim {n}', { n: DAILY[s.idx] }) : t('Claimed today')}</button>`;
}
function refreshMenu() {
  claimSeason();
  $('mCoins').textContent = save.coins.toLocaleString('en'); $('mWins').textContent = save.wins;
  const L = levelOf(save.xp);
  $('pLvl').textContent = L.lvl; $('pXp').style.width = (L.cur / L.need * 100) + '%'; $('pXpTxt').textContent = `${L.cur} / ${L.need}`; $('meName').textContent = save.name;
  if (THUMB.portrait) $('pAvatar').src = THUMB.portrait({ ...save.equip, bat: undefined });
  $('seasonCard').innerHTML = seasonHtml(); $('dailyCard').innerHTML = dailyHtml();
  $('chal').innerHTML = chalHtml(chalTab.cur);
  document.querySelectorAll('[data-ct]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ct === chalTab.cur)));
  const ev = MODES[eventMode()];
  $('eventCard').innerHTML = `<span class="x2">×2</span><div><b>${t('Event of the week')}: ${ev.name}</b>${t('Double coins all week')}</div>`;
  const deal = dealsToday().slice(0, 2);
  $('peek').innerHTML = deal.map((d) => `<img alt="" src="${THUMB[d.id] || ''}">`).join('') + `<span>${t("Today's shop deals")}<br><em>${deal.map((d) => d.name).join(' · ') || t('You own everything')}</em></span>`;
  const sel = selectedMode();
  $('modeName').textContent = sel.name; $('modeSub').textContent = sel.sub;
  const im = THUMB['mode:' + sel.thumb]; $('modeImg').hidden = !im; if (im) $('modeImg').src = im;
  $('wheelBadge').hidden = save.wheelDay === today(); $('dailyBadge').hidden = !dailyState().can;
}
document.querySelectorAll('[data-ct]').forEach((b) => b.addEventListener('click', () => { chalTab.cur = b.dataset.ct; sfx.click(); refreshMenu(); }));
document.addEventListener('click', (e) => {
  const c = e.target.closest('[data-claim="daily"]'); if (c) { claimDaily(); refreshMenu(); if (!$('ov').hidden) openOv('daily'); }
});
$('emotes').addEventListener('click', (e) => { const b = e.target.closest('[data-em]'); if (b) fadeTo(b.dataset.em); });
$('peek').addEventListener('click', () => { sfx.click(); setTab('shop'); });
$('modeBtn').addEventListener('click', () => { sfx.click(); openOv('picker'); });
$('mWheel').addEventListener('click', () => { sfx.click(); openOv('wheel'); });
$('mCode').addEventListener('click', () => { sfx.click(); openOv('code'); });
$('mSet').addEventListener('click', () => { sfx.click(); openOv('settings'); });
$('meCard').addEventListener('click', () => { sfx.click(); openOv('profile'); });
document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => { sfx.click(); openOv(b.dataset.open); }));
$('ovClose').addEventListener('click', () => { sfx.click(); closeOv(); });
function closeOv() { show('ov', false); wheel.spinning = false; refreshMenu(); }

// one sheet, many contents
async function openOv(kind) {
  const T = $('ovTitle'), B = $('ovBody'); show('ov', true);
  if (kind === 'season') { T.textContent = t('Season 1'); B.innerHTML = `<div class="mcard season">${seasonHtml()}</div><div class="rows">${SEASON.map((r) => `<div class="rowx ${save.season.includes(r.lvl) ? 'done' : ''}"><span>${t('Level {n}', { n: r.lvl })}</span><span>${r.coins ? r.coins + ' ' + t('coins') : ITEM[r.item].name}</span></div>`).join('')}</div>`; }
  else if (kind === 'daily') { T.textContent = t('Daily reward'); B.innerHTML = `<div class="mcard daily">${dailyHtml()}</div><p style="margin:0;font-weight:700;color:var(--ink-2)">${t('Come back every day: the reward grows to 500 on day 7.')}</p>`; }
  else if (kind === 'chal') { T.textContent = t('Challenges'); B.innerHTML = ['d', 'w', 'a'].map((k) => `<h3 style="margin:0;font-family:var(--display);font-weight:400">${{ d: t('Today'), w: t('This week'), a: t('Achievements') }[k]}</h3><div class="chal">${chalHtml(k)}</div>`).join(''); }
  else if (kind === 'picker') {
    T.textContent = t('Choose a mode');
    const ev = eventMode();
    B.innerHTML = `<div class="picks">${choices().map((m) => `<button class="pick" data-mode="${m.id}" aria-pressed="${m.id === flow.choice}">${m.id === ev ? '<span class="tagx">×2</span>' : m.special ? '<span class="tagx" style="background:#6a3fd1">★</span>' : ''}${THUMB['mode:' + m.thumb] ? `<img alt="" src="${THUMB['mode:' + m.thumb]}">` : '<div class="ph" data-ph="' + m.thumb + '">' + t('Loading picture…') + '</div>'}<b>${m.name}</b><span>${m.sub}</span></button>`).join('')}
      <button class="pick" disabled><div class="ph">${t('Coming soon')}</div><b>${t('Online with friends')}</b><span>${t('Play with your friends using a room code')}</span></button></div>`;
    B.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { flow.choice = b.dataset.mode; store.set('choice', flow.choice); sfx.click(); closeOv(); }));
    for (const m of choices()) if (!THUMB['mode:' + m.thumb]) { await new Promise(requestAnimationFrame); modeThumb(m.thumb); const ph = B.querySelector(`[data-ph="${m.thumb}"]`); if (ph && THUMB['mode:' + m.thumb]) ph.outerHTML = `<img alt="" src="${THUMB['mode:' + m.thumb]}">`; }
    refreshMenu();
  } else if (kind === 'wheel') {
    T.textContent = t('Lucky Wheel');
    const free = save.wheelDay !== today();
    B.innerHTML = `<div class="wheelbox"><div class="ptr"></div><canvas id="wheelCv" width="640" height="640"></canvas><div class="prize" id="wPrize">${free ? t('Free spin today!') : t('Extra spin for 500 coins')}</div><button class="btn" id="wSpin">${free ? t('Spin free') : t('Spin for 500')}</button></div>`;
    drawWheel(0); $('wSpin').addEventListener('click', spinWheel);
  } else if (kind === 'code') {
    T.textContent = t('Redeem code');
    B.innerHTML = `<p style="margin:0;font-weight:700;color:var(--ink-2)">${t('Type a code to get your prize. Some codes give a rare character if you are lucky.')}</p><div class="field"><input id="codeIn" maxlength="20" autocomplete="off" placeholder="XXXX-XXXX"><button class="btn" id="codeGo">${t('Redeem')}</button></div><div class="prize" id="codeOut"></div>`;
    $('codeGo').addEventListener('click', redeem); $('codeIn').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') redeem(); });
  } else if (kind === 'settings') {
    T.textContent = t('Settings');
    const seg = (id, opts, cur) => `<div class="seg" id="${id}">${opts.map(([v, n]) => `<button data-v="${v}" aria-pressed="${String(v) === String(cur)}">${n}</button>`).join('')}</div>`;
    B.innerHTML = `<b>${t('Graphics')}</b>${seg('sQ', [['low', t('Light')], ['med', t('Medium')], ['high', t('Fantasy')]], save.quality)}
      <b>${t('Sound')}</b>${seg('sS', [['on', t('On')], ['off', t('Off')]], save.muted ? 'off' : 'on')}
      <b>${t('Camera speed')}</b>${seg('sC', [[0.6, t('Slow')], [1, t('Normal')], [1.6, t('Fast')]], save.sens)}
      <b>${t('Language')}</b><select id="sLang">${LANGS.filter(([c]) => c === 'en' || (globalThis.__BD_LANG?.langs || {})[c]).map(([c, n]) => `<option value="${c}" ${c === LANG ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <button class="btn alt" id="sIntro">${t('Watch the intro film again')}</button>`;
    const bind = (id, fn) => $(id).addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (!b) return; fn(b.dataset.v); persist2(); sfx.click(); openOv('settings'); });
    bind('sQ', (v) => { save.quality = v; applyQuality(); }); bind('sS', (v) => { save.muted = v === 'off'; }); bind('sC', (v) => { save.sens = parseFloat(v); });
    $('sLang').addEventListener('change', (e) => setLang(e.target.value));
    $('sIntro').addEventListener('click', () => { closeOv(); playIntro(true); });
  } else if (kind === 'profile') {
    T.textContent = t('Your profile');
    const st = save.stats;
    B.innerHTML = `<b>${t('Your name')}</b><div class="field"><input id="nameIn" maxlength="14" value="${save.name.replace(/"/g, '')}" style="text-transform:none"><button class="btn" id="nameGo">${t('Save')}</button></div>
      <div class="statg"><div><b>${st.games || 0}</b>${t('Shows played')}</div><div><b>${st.rounds || 0}</b>${t('Rounds')}</div><div><b>${st.qual || 0}</b>${t('Qualified')}</div><div><b>${save.wins}</b>${t('Crowns')}</div><div><b>${levelOf(save.xp).lvl}</b>${t('Level')}</div><div><b>${(st.earned || 0).toLocaleString('en')}</b>${t('Coins earned')}</div></div>${cardHTML()}`;
    $('nameIn').addEventListener('keydown', (e) => e.stopPropagation());
    $('nameGo').addEventListener('click', () => { const v = $('nameIn').value.trim().slice(0, 14); if (v) { save.name = v; persist2(); toast(t('Saved')); refreshMenu(); } });
  }
}
// map preview pictures for the mode cards: build the map, snap it from its fly-over start, throw it away
function modeThumb(id) {
  if (THUMB['mode:' + id]) return;
  try {
    const md = MODES[id], wasVis = lobby.root.visible; lobby.root.visible = false;
    md.build(); const f = (md.fly || [[0, 20, 20, 0, 0, 0]])[0];
    const w = 384, h = 216, rt = new THREE.WebGLRenderTarget(w, h, { samples: 4 }); rt.texture.colorSpace = THREE.SRGBColorSpace;
    const cam = new THREE.PerspectiveCamera(55, w / h, 0.1, 900); cam.position.set(f[0], f[1], f[2]); cam.lookAt(f[3], f[4], f[5]);
    sky.position.copy(cam.position); sun.position.set(f[3] + 12, 40, f[5] + 14); sun.target.position.set(f[3], 0, f[5]);
    renderer.setRenderTarget(rt); renderer.render(scene, cam); renderer.setRenderTarget(null);
    const px = new Uint8Array(w * h * 4); renderer.readRenderTargetPixels(rt, 0, 0, w, h, px);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const ctx = cv.getContext('2d'), img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    ctx.putImageData(img, 0, 0); THUMB['mode:' + id] = cv.toDataURL('image/jpeg', 0.8); rt.dispose();
    G.level.dispose(); G.level = null; lobby.root.visible = wasVis;
  } catch (e) { console.warn('mode thumb', id, e); G.level?.dispose(); G.level = null; }
}

// ---------------------------------------------------------------- lucky wheel
const RARE_ODDS = [['skin-crystal', 35], ['skin-rainbow', 35], ['skin-lava', 12], ['skin-galaxy', 12], ['skin-radiant', 5], ['skin-void', 1]];
const WHEEL = [
  { n: 100, c: '#ffd23f' }, { item: true, c: '#5fcfff', label: t('Accessory') }, { n: 200, c: '#ff7ab8' }, { n: 1000, c: '#36e0a8' },
  { n: 300, c: '#ffd23f' }, { rare: true, c: '#7b4dff', label: t('Rare!') }, { n: 500, c: '#ff7ab8' }, { n: 5000, c: '#ff4a3d', label: t('Jackpot') },
];
const WHEEL_W = [24, 12, 20, 6, 15, 3, 12, 1];
const wheel = { ang: 0, spinning: false };
function drawWheel(a) {
  const cv = $('wheelCv'); if (!cv) return; const ctx = cv.getContext('2d'), R = 300, c = 320, n = WHEEL.length;
  ctx.clearRect(0, 0, 640, 640);
  for (let i = 0; i < n; i++) {
    const a0 = a + (i / n) * PI * 2 - PI / 2, a1 = a0 + PI * 2 / n;
    ctx.beginPath(); ctx.moveTo(c, c); ctx.arc(c, c, R, a0, a1); ctx.closePath(); ctx.fillStyle = WHEEL[i].c; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.save(); ctx.translate(c, c); ctx.rotate(a0 + PI / n); ctx.fillStyle = '#21124a'; ctx.font = '400 34px "Lilita One", Lalezar, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(WHEEL[i].label || String(WHEEL[i].n), R - 22, 0); ctx.restore();
  }
  ctx.beginPath(); ctx.arc(c, c, 46, 0, PI * 2); ctx.fillStyle = '#21124a'; ctx.fill(); ctx.fillStyle = '#ffd23f'; ctx.font = '400 30px "Lilita One", Lalezar, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('BOLT', c, c + 2);
}
function pickWeighted(list, wOf) { const tot = list.reduce((s, x) => s + wOf(x), 0); let k = rand(0, tot); for (const x of list) { k -= wOf(x); if (k <= 0) return x; } return list[0]; }
function grantRare() {
  const [id] = pickWeighted(RARE_ODDS, (x) => x[1]);
  if (save.owned.includes(id)) { const n = Math.min(3000, Math.round(ITEM[id].price / 10)); save.coins += n; return t('You already have {x}, so you got {n} coins instead', { x: ITEM[id].name, n }); }
  save.owned.push(id); track('rare'); fx.confetti(V(lobby.root.position.x, 3, lobby.root.position.z), 160); sfx.win();
  return t('Congrats! You won {x} ({r})', { x: ITEM[id].name, r: ITEM[id].rare });
}
function spinWheel() {
  if (wheel.spinning) return;
  const free = save.wheelDay !== today();
  if (!free) { if (save.coins < 500) { $('wPrize').textContent = t('You need 500 coins'); return; } save.coins -= 500; }
  else save.wheelDay = today();
  persist2();
  const idx = WHEEL.indexOf(pickWeighted(WHEEL, (x) => WHEEL_W[WHEEL.indexOf(x)])), n = WHEEL.length;
  const target = PI * 2 * 6 - (idx + 0.5) * (PI * 2 / n) + rand(-0.12, 0.12) * (PI * 2 / n);
  const start = wheel.ang % (PI * 2), t0 = performance.now(), dur = 4200; wheel.spinning = true; $('wSpin').disabled = true;
  let lastTick = 0;
  const step = (now) => {
    if (!wheel.spinning) return;
    const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    wheel.ang = start + (target - start) * e; drawWheel(wheel.ang);
    const seg = Math.floor(wheel.ang / (PI * 2 / n)); if (seg !== lastTick) { lastTick = seg; sfx.tick(); }
    if (k < 1) return requestAnimationFrame(step);
    wheel.spinning = false; const w = WHEEL[idx]; let msg;
    if (w.rare) msg = grantRare();
    else if (w.item) { const pool = ITEMS.filter((i) => !i.rare && !i.secret && !i.hidden && i.price > 0 && !save.owned.includes(i.id)); if (pool.length) { const it = pick(pool); save.owned.push(it.id); msg = t('You won {x}', { x: it.name }); sfx.pickup(); } else { save.coins += 300; msg = t('You have everything! Take 300 coins'); } }
    else { save.coins += w.n; msg = t('You won {n} coins', { n: w.n }); sfx.coin(); if (w.n >= 1000) fx.confetti(V(lobby.root.position.x, 3, lobby.root.position.z), 120); }
    persist2(); $('wPrize').textContent = msg; $('wSpin').disabled = false; $('wSpin').textContent = t('Spin for 500'); refreshMenu();
  };
  requestAnimationFrame(step);
}
// ---------------------------------------------------------------- redeem codes (stored as hashes, not plain text)
const hashCode = (s) => [...s].reduce((a, c) => (Math.imul(a, 33) ^ c.charCodeAt(0)) >>> 0, 5381);
const CODES = { 4219734126: { coins: 500 }, 2324463998: { coins: 1000 }, 3383142681: { coins: 2000 }, 2048646021: { rare: true }, 2840980246: { rare: true }, 1079861552: { item: 'skin-bolt' } };
function redeem() {
  const raw = $('codeIn').value.trim().toUpperCase(), h = hashCode(raw), c = CODES[h], out = $('codeOut');
  if (!c) { out.textContent = t('That code is not valid'); sfx.lose(); return; }
  if (save.codes.includes(h)) { out.textContent = t('You already used this code'); return; }
  save.codes.push(h);
  if (c.coins) { save.coins += c.coins; out.textContent = `+${c.coins} ${t('coins')}!`; sfx.coin(); }
  else if (c.rare) out.textContent = grantRare();
  else if (c.item) { if (!save.owned.includes(c.item)) save.owned.push(c.item); save.equip.skin = c.item; out.textContent = t('{x}: your exclusive character!', { x: ITEM[c.item].name }); sfx.win(); fx.confetti(V(lobby.root.position.x, 3, lobby.root.position.z), 200); heroDress(); }
  persist2(); refreshMenu();
}

function setTab(k) {
  document.querySelectorAll('.tab').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.tab === k)));
  show('vPlay', k === 'play'); show('vLocker', k === 'wardrobe' || k === 'shop'); show('vBuild', k === 'build'); if (k === 'build') setBuildPane('hub');
  locker.preview = null;
  if (k === 'wardrobe' || k === 'shop') { locker.mode = k; renderLocker(); }
  lobby.view = (k === 'wardrobe' || k === 'shop') ? 'locker' : 'play';
  if (lobby.hero) heroDress();
}
document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => { sfx.click(); setTab(b.dataset.tab); }));
// locker + shop share one panel
const locker = { mode: 'wardrobe', cat: 'skin', preview: null };
function dealsToday() {
  let x = [...today()].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7); const rnd = () => (x = (x * 1103515245 + 12345) >>> 0) / 4294967296;
  return ITEMS.filter((i) => !save.owned.includes(i.id) && !i.rare && !i.secret && !i.hidden).map((i) => [rnd(), i]).sort((a, b) => a[0] - b[0]).slice(0, 8).map((p) => p[1]);
}
const pips = (n) => '<span class="pips">' + [1, 2, 3, 4, 5].map((k) => `<i class="${k <= n ? 'on' : ''}"></i>`).join('') + '</span>';
function lockerList() {
  if (locker.mode === 'shop') return dealsToday();
  if (locker.cat === 'rare') return ITEMS.filter((i) => i.rare && (!i.secret || save.owned.includes(i.id)));
  if (locker.cat === 'skin') return ITEMS.filter((i) => i.slot === 'skin' && !i.rare && !i.hidden);
  return ITEMS.filter((i) => i.slot === locker.cat);
}
function renderLocker() {
  const isShop = locker.mode === 'shop';
  $('lkTitle').textContent = isShop ? t('Shop') : t('Wardrobe');
  $('lkSub').textContent = isShop ? t('Today\'s deals, new every day') : t('Change your colour, dress up and pick your bat') + ' · ' + t('Drag your character to turn it around');
  $('cats').hidden = isShop;
  $('cats').innerHTML = CATS.map(([k, n]) => `<button data-cat="${k}" aria-pressed="${k === locker.cat}">${n}</button>`).join('');
  const list = lockerList();
  $('grid').innerHTML = !list.length ? `<p class="empty">${t('You bought everything! Come back tomorrow for new deals.')}</p>` : list.map((it) => {
    const owned = save.owned.includes(it.id), on = save.equip[it.slot] === it.id;
    const tag = on ? `<span class="tag on">${t('Wearing')}</span>` : owned ? `<span class="tag own">${t('Owned')}</span>` : `<span class="tag">${icon('coin')}${it.price.toLocaleString('en')}</span>`;
    return `<button class="item${on ? ' on' : ''}${locker.preview === it.id ? ' sel' : ''}" data-id="${it.id}">${it.rare ? `<span class="rtag">${it.rare}</span>` : ''}<img alt="" src="${THUMB[it.id] || ''}"><span>${it.name}</span>${tag}</button>`;
  }).join('');
  const focus = ITEM[locker.preview] || (locker.cat === 'bat' && !isShop ? ITEM[save.equip.bat] : null);
  $('batInfo').hidden = !(focus && (focus.slot === 'bat' || focus.rare));
  if (focus?.slot === 'bat') $('batInfo').innerHTML = `<b>${focus.name}</b><span>${focus.desc}</span><div class="stats3"><div>${t('Power')} ${pips(focus.power)}</div><div>${t('Speed')} ${pips(focus.speed)}</div><div>${t('Reach')} ${pips(focus.reach)}</div></div>`;
  else if (focus?.rare) $('batInfo').innerHTML = `<b>${focus.name} · ${focus.rare}</b><span>${{ gold: t('The ground turns gold behind you as you run'), void: t('A black hole swirls around you'), lava: t('Fire sparks fly off you'), galaxy: t('Stars twinkle around you'), crystal: t('Shiny and clear like a diamond'), rainbow: t('Your colour never stops changing'), bolt: t('Gold and black hole together: the exclusive character') }[focus.fx] || ''}</span>`;
  const p = locker.preview && ITEM[locker.preview];
  $('buybar').hidden = !p;
  if (p) { $('buyName').textContent = p.desc && p.slot === 'back' ? p.name + ' · ' + p.desc : p.name; const can = save.coins >= p.price && !p.secret; $('buyBtn').disabled = !can; $('buyBtn').textContent = p.secret ? t('Code only') : can ? t('Buy for {n}', { n: p.price.toLocaleString('en') }) : t('Need {n} more', { n: (p.price - save.coins).toLocaleString('en') }); }
}
function heroPreview() { const e = {}; if (locker.preview) { const p = ITEM[locker.preview]; e[p.slot] = p.id; } heroDress(e); }
$('cats').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; sfx.click(); locker.cat = b.dataset.cat; locker.preview = null; heroPreview(); renderLocker(); });
$('grid').addEventListener('click', (e) => {
  const b = e.target.closest('[data-id]'); if (!b) return;
  const it = ITEM[b.dataset.id]; sfx.click();
  if (save.owned.includes(it.id)) {
    locker.preview = null;
    if (!['skin', 'bat'].includes(it.slot) && save.equip[it.slot] === it.id) delete save.equip[it.slot]; else save.equip[it.slot] = it.id;
    persist2();
  } else locker.preview = locker.preview === it.id ? null : it.id;
  heroPreview(); renderLocker(); fadeTo(it.slot === 'bat' ? 'Punch' : 'Wave'); refreshMenu();
});
$('buyBtn').addEventListener('click', () => {
  const it = ITEM[locker.preview]; if (!it || save.coins < it.price || it.secret) return;
  save.coins -= it.price; save.owned.push(it.id); save.equip[it.slot] = it.id; locker.preview = null; if (it.rare) track('rare'); persist2();
  sfx.coin(); toast(t('You bought {x}', { x: it.name })); fx.confetti(V(lobby.root.position.x, 3, lobby.root.position.z), it.rare ? 200 : 70);
  heroPreview(); renderLocker(); refreshMenu(); fadeTo('Yes');
});

// ---------------------------------------------------------------- show / round flow
// intro film: plays once on first open (and from settings); the video lives next to the page
// the series: episodes play in a row; one that isn't out yet shows "Coming soon"
const EPISODES = [
  { id: 's1e1', title: t('Episode 1: The Beginning'), season: 1, parts: [0, 1, 2, 3, 4, 5].map((k) => `./media/s1e1_${k}.mp4`), partLen: 120, subs: './media/s1e1.subs.json' },
  { id: 's1e2', title: t('Episode 2'), season: 1, soon: true },
];
// the first game trailer moved here when the new mini-game ad became the opening film
const TRAILER = { id: 'trailer', title: t('The first trailer'), parts: ['./media/trailer.mp4'], partLen: 0 };
function openMovies() {
  $('ovTitle').textContent = t('Bolt Dash: the series');
  $('ovBody').innerHTML = `<p style="margin:0;font-weight:700;color:var(--ink-2)">${t('Season 1: the Party Games League')}</p><div class="eps"><button class="epc" data-ep="-1"><span class="n">▶</span><span><b>${TRAILER.title}</b><span>${t('Trailer')}</span></span></button>${EPISODES.map((e, i) => `<button class="epc" data-ep="${i}" ${e.soon ? 'disabled' : ''}><span class="n">${i + 1}</span><span><b>${e.title}</b><span>${e.soon ? t('Coming soon') : t('Season {n}', { n: e.season })}</span></span></button>`).join('')}</div>`;
  show('ov', true);
  $('ovBody').querySelectorAll('[data-ep]').forEach((b) => b.addEventListener('click', () => { sfx.click(); closeOv(); playEpisode(+b.dataset.ep); }));
}
async function playEpisode(i) {
  const e = i < 0 ? TRAILER : EPISODES[i]; if (!e || e.soon) { toast(t('Coming soon')); return; }
  const v = $('introVid'); let subs = [];
  try { subs = e.subs ? await (await fetch(e.subs)).json() : []; } catch { subs = []; }
  const stop = () => { v.pause(); v.ontimeupdate = null; show('introVid', false); show('introSkip', false); show('subLine', false); if (flow.state === 'intro') flow.state = flow.prevState || 'menu'; };
  const next = () => { stop(); if (i < 0) return; if (EPISODES[i + 1] && !EPISODES[i + 1].soon) playEpisode(i + 1); else toast(t('Next episode: coming soon'), 2.5); };
  // the episode is stored in parts (each file must stay small); they play back to back
  const parts = e.parts || [e.src]; let part = 0;
  const load = () => { v.src = parts[part]; v.play().catch(() => { v.muted = true; v.play().catch(stop); }); };
  v.muted = save.muted; v.onended = () => { if (++part < parts.length) load(); else next(); }; v.onerror = () => { stop(); toast(t('Coming soon')); };
  v.ontimeupdate = () => {
    const now = part * (e.partLen || 0) + v.currentTime;
    const s = subs.find((x) => now >= x.start && now < (x.end ?? 1e9));
    if (s) { $('subLine').innerHTML = `<b>${t(s.who)}:</b> ${t(s.text)}`; show('subLine', true); } else show('subLine', false);
  };
  flow.prevState = flow.state; flow.state = 'intro'; show('introVid', true); show('introSkip', true);
  $('introSkip').onclick = stop;
  load();
}
$('mMovie').addEventListener('click', () => { sfx.click(); openMovies(); });
$('mWorld').addEventListener('click', () => { sfx.click(); enterWorld(); });
$('pWorld').addEventListener('click', () => { sfx.click(); G.paused = false; show('pause', false); vortex(() => { cleanupRound(); enterWorld(true); }); });
$('wAct').addEventListener('click', () => { sfx.click(); if (!worldMode.serve()) worldMode.act(); });
function playIntro(force) {
  if (!force && store.get('introSeen', false)) return;
  const v = $('introVid'), src = document.querySelector('meta[name="bolt-intro"]')?.content || './media/intro.mp4';
  const stop = () => { v.pause(); show('introVid', false); show('introSkip', false); store.set('introSeen', true); if (flow.state === 'intro') flow.state = flow.prevState || 'menu'; };
  v.src = src; v.muted = save.muted; v.onended = stop; v.onerror = stop;
  flow.prevState = flow.state; flow.state = 'intro'; show('introVid', true); show('introSkip', true);
  $('introSkip').onclick = stop;
  v.play().catch(() => { v.muted = true; v.play().catch(stop); });
}
const flow = { state: 'loading', choice: store.get('choice', 'show'), show: null, round: 0, t: 0, count: 0, flyT: 0, endT: 0, finishedCount: 0, coins: 0, bannerT: 0 };
const camPos = V(0, 6, 16), camLook = V(), camRay = new CANNON.RaycastResult();
function newShow(choice) {
  const n = choice === 'show' ? 16 : choice === 'football' ? 14 : choice === 'training' ? 2 : choice === 'slasher' ? 4 : choice === 'paint' ? 12 : 8;
  const players = [{ name: save.name, equip: { ...save.equip }, isPlayer: true }];
  const names = [...NAMES].sort(() => Math.random() - 0.5);
  for (let i = 1; i < n; i++) players.push({ name: names[i % names.length], equip: randomEquip(), isPlayer: false });
  let rounds;
  // the Show: 7 rounds, 16 players -> 12 -> 6 (teams) -> 5 -> 4 -> 3 -> 2 -> 1 crown
  if (choice === 'show') { const surv = ['cannons', 'arena', 'lava', 'bomb', 'rising'], s1 = pick(surv), s2 = pick(surv.filter((x) => x !== s1)), r2 = pick(['climb', 'sprint', 'golf']);
    rounds = [{ m: pick(['race', 'race', 'sprint']), q: 12 }, { m: pick(['stars', 'ball', 'volley', 'football', 'puck']) }, { m: s1, q: 5 }, { m: r2, q: 4 }, { m: s2, q: 3 }, { m: pick(['race', 'climb'].filter((x) => x !== r2)), q: 2 }, { m: 'fall', q: 1 }]; }
  else if (choice === 'custom') rounds = [{ m: 'custom', q: 3 }];
  else if (choice === 'slasher') rounds = [{ m: 'slasher', q: 0 }];
  else if (choice.startsWith('cm:')) rounds = [{ m: 'custom', q: 5, cm: choice.slice(3) }];
  else { const md = MODES[choice]; rounds = [{ m: choice, q: md.kind === 'race' ? (choice === 'climb' ? 4 : 6) : md.kind === 'survival' ? 1 : null }]; }
  return { choice, players, rounds, coins: 0, place: null };
}
function startMatchmaking(choice) {
  sfx.unlock(); sfx.click();
  let cmMap = null;
  if (choice.startsWith('cm:')) { cmMap = allMaps().find((m) => m.key === choice.slice(3)); if (!cmMap) { toast(t('That map no longer exists')); choice = 'show'; flow.choice = 'show'; } }
  flow.show = newShow(choice); if (cmMap) { const rd = flow.show.rounds[0]; rd.map = cmMap; rd.q = cmMap.type === 'ball' ? null : cmMap.type === 'survival' ? 3 : 5; } flow.round = 0;
  flow.state = 'mm'; flow.t = 0; startDive();
  show('menu', false); show('mm', true); show('ov', false);
  const n = flow.show.players.length;
  $('mmSlots').innerHTML = flow.show.players.map((p, i) => `<div class="slot" id="slot${i}"><img alt=""><span></span></div>`).join('');
  $('mmCount').textContent = `0 / ${n}`; $('mmTitle').textContent = t('Finding players');
  $('mmTip').textContent = pick([t('Tip: dive under spinning arms'), t('Tip: yellow speed arrows launch you forward'), t('Tip: in Hex Drop, never stand still for 3 seconds'), t('Tip: the frying pan makes people dizzy'), t('Tip: wooden crates break, steel ones don\'t')]);
  flow.joinAt = flow.show.players.map((_, i) => (i === 0 ? 0.3 : 0.9 + i * rand(0.38, 0.62)));
  flow.joined = 0;
}
$('mmCancel').addEventListener('click', () => { sfx.click(); toMenu(); });
function updateMatchmaking(dt) {
  flow.t += dt; updateDive(dt);
  const pl = flow.show.players;
  while (flow.joined < pl.length && flow.t > flow.joinAt[flow.joined]) {
    const i = flow.joined++, p = pl[i], el = $('slot' + i);
    el.querySelector('img').src = THUMB.portrait(p.equip); el.querySelector('span').textContent = p.name; el.classList.add('in');
    if (p.isPlayer) el.classList.add('me');
    $('mmCount').textContent = `${flow.joined} / ${pl.length}`; sfx.join();
  }
  $('mmDots').textContent = '.'.repeat(1 + Math.floor(flow.t * 2) % 3);
  if (flow.joined >= pl.length && flow.t > flow.joinAt[pl.length - 1] + 0.9) { $('mmTitle').textContent = t('Found them!'); $('mmDots').textContent = ''; if (flow.t > flow.joinAt[pl.length - 1] + 1.8) startRound(); }
}
function roundMode(i) {
  const rd = flow.show.rounds[i];
  if (rd.cm) { const m = rd.map; const md = customMode({ type: m.type || 'race', items: m.items }); md.name = m.name; md.short = m.name; md.desc = t('A map made by {x}', { x: m.author }); md.id = 'community'; return md; }
  return rd.m === 'custom' ? customMode(getMap()) : MODES[rd.m];
}
function startRound() {
  const rd = flow.show.rounds[flow.round], md = roundMode(flow.round);
  show('mm', false); show('result', false); show('menu', false); dive.root.visible = false;
  cleanupRound();
  lobby.root.visible = false;
  G.modeObj = md; G.playerRole = null; flow.rolePicking = false; md.build();
  const parts = flow.show.players.filter((p) => !p.out);
  G.runners = parts.map((p, i) => {
    const team = md.team ? md.teamOf(i) : null;
    const r = new Runner({ i, isPlayer: p.isPlayer, equip: p.equip, team, name: p.name });
    r.part = p; const s = md.spawn(i, parts.length); r.reset(s.x, s.y ?? 0, s.z, s.facing ?? PI);
    if (md.bats) dress(r.model, md.forceBat ? { ...r.equip, bat: md.forceBat } : r.equip, { bat: true });
    return r;
  });
  G.player = G.runners.find((r) => r.isPlayer);
  if (md.id !== 'world' && G.player) { const b = useBuff(); if (b) { G.player.food = b.kind; setTimeout(() => toast(t('Food power for this match'), 2), 1500); } }
  const q = rd.q ?? (md.team ? null : 1);
  flow.q = md.team ? null : Math.min(q, G.runners.length - 1);
  flow.finishedCount = 0; flow.coins = 0; flow.roundT = 0; flow.endT = 0; flow.done = false;
  ctl.yaw = (G.player?.facing ?? PI) + PI; ctl.pitch = 0.26;
  // intro card
  const total = flow.show.rounds.length;
  $('inRound').textContent = total > 1 ? (flow.round === total - 1 ? t('Final round') : t('Round {n} of {m}', { n: flow.round + 1, m: total })) : t('Round');
  $('inName').textContent = md.name; $('inDesc').textContent = md.desc;
  $('inGoal').textContent = md.team ? t('The winning team qualifies') : md.kind === 'race' ? t('First {n} to finish qualify', { n: flow.q }) : flow.q === 1 ? t('Last one standing wins') : t('Last {n} standing qualify', { n: flow.q });
  $('inWeap').textContent = md.weapons;
  $('inIcon').innerHTML = icon(md.icon || 'play');
  show('intro', true); show('hud', false);
  flow.state = 'fly'; flow.flyT = 0;
  const f = md.fly || [[0, 20, 20, 0, 0, 0]];
  camPos.set(f[0][0], f[0][1], f[0][2]); camLook.set(f[0][3], f[0][4], f[0][5]);
}
// football: pick your position before kick-off; if a teammate wants the same one, a lucky wheel decides
const ROLES = [['GK', t('Goalkeeper')], ['DEF', t('Defender')], ['MID', t('Midfielder')], ['FWD', t('Attacker')]];
// the football player card, coloured bronze / silver / gold by its overall rating
function cardHTML() {
  const c = save.card, o = cardOvr(), tier = cardTier(o), row = (k, n) => `<div><span>${n}</span><b>${Math.round(c[k])}</b></div>`;
  return `<div class="pcard ${tier}"><div class="po"><b>${o}</b><span>${t(tier === 'gold' ? 'Gold' : tier === 'silver' ? 'Silver' : 'Bronze')}</span></div><div class="pn">${save.name}<em>${t('Player card')}</em></div><div class="ps">${row('pac', t('Pace'))}${row('sho', t('Shooting'))}${row('pas', t('Passing'))}${row('ctl', t('Control'))}</div></div>`;
}
function openRolePick() {
  if (flow.rolePicking) return; flow.rolePicking = true;
  show('intro', false);
  $('ovTitle').textContent = t('Pick your position');
  setTimeout(() => toast(t('Player card') + ' ' + cardOvr() + ' · ' + t(cardTier() === 'gold' ? 'Gold' : cardTier() === 'silver' ? 'Silver' : 'Bronze'), 2.5), 300);
  $('ovBody').innerHTML = `${cardHTML()}<div class="roles">${ROLES.map(([k, n]) => `<button class="rolec" data-role="${k}"><b>${k}</b><span>${n}</span></button>`).join('')}</div><div class="rwheel" id="rWheel" hidden><canvas id="rwCv" width="360" height="360"></canvas><div class="prize" id="rwTxt"></div></div>`;
  $('ovClose').hidden = true; show('ov', true);
  $('ovBody').querySelectorAll('[data-role]').forEach((b) => b.addEventListener('click', () => pickRole(b.dataset.role)));
}
function pickRole(role) {
  sfx.click();
  const mates = G.runners.filter((r) => r.team === G.player.team && r !== G.player);
  const rival = Math.random() < 0.45 ? pick(mates) : null;
  const finish = (got) => {
    G.playerRole = got; $('ovClose').hidden = false; show('ov', false); flow.rolePicking = false;
    toast(t('You play as {x}', { x: ROLES.find((x) => x[0] === got)[1] }), 2.2); beginPlay();
  };
  if (!rival) return finish(role);
  // spin a two-slice wheel: you vs your teammate
  $('ovBody').querySelector('.roles').hidden = true; show('rWheel', true);
  $('rwTxt').textContent = t('{x} wants {y} too! Spinning…', { x: rival.name, y: role });
  const cv = $('rwCv'), ctx = cv.getContext('2d'), win = Math.random() < 0.5, T0 = performance.now(), end = PI * 2 * 5 + (win ? PI : 0);
  const draw = (a) => {
    ctx.clearRect(0, 0, 360, 360); ctx.save(); ctx.translate(180, 180); ctx.rotate(a);
    [[t('You'), '#ffd23f'], [rival.name, '#7fb8ff']].forEach(([n, c], i) => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 170, i * PI, (i + 1) * PI); ctx.fillStyle = c; ctx.fill(); ctx.save(); ctx.rotate(i * PI + PI / 2); ctx.fillStyle = '#21124a'; ctx.font = '400 34px "Lilita One", Lalezar, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(n, 0, -80); ctx.restore(); });
    ctx.restore(); ctx.fillStyle = '#21124a'; ctx.beginPath(); ctx.moveTo(180, 4); ctx.lineTo(166, 30); ctx.lineTo(194, 30); ctx.fill();
  };
  const tick = () => {
    const k = Math.min(1, (performance.now() - T0) / 2600), e = 1 - Math.pow(1 - k, 3);
    // the pointer is at the top; your slice (0..PI) ends under it when the wheel stops at PI, theirs at 0
    draw(end * e); if (k < 1) return requestAnimationFrame(tick);
    sfx[win ? 'win' : 'lose']();
    if (win) { $('rwTxt').textContent = t('You got {x}!', { x: role }); setTimeout(() => finish(role), 1200); }
    else { const left = ROLES.map((x) => x[0]).filter((x) => x !== role); const got = pick(left); $('rwTxt').textContent = t('{x} got it. You play {y}', { x: rival.name, y: got }); setTimeout(() => finish(got), 1600); }
  };
  tick();
}
function beginPlay() {
  show('intro', false); show('hud', true);
  $('touch').hidden = !IS_TOUCH; $('keys').hidden = IS_TOUCH;
  flow.state = 'count'; flow.count = 3.6;
  buildHud();
}
function cleanupRound() {
  for (const r of G.runners) r.dispose(); G.runners = []; G.player = null;
  G.modeObj?.cleanup?.(); clearProjectiles(); G.level?.dispose(); G.level = null; G.modeObj = null;
  puffs.clear(); confetti.clear();
}
G.finish = (r) => {
  if (r.finished || flow.done) return;
  r.finished = true; r.place = ++flow.finishedCount; r.play(r.place === 1 ? 'Wave' : 'Yes', 0.2);
  if (r.weapon) dropWeapon(r);
  fx.confetti(V(r.pos.x, r.pos.y + 1, r.pos.z), r.isPlayer ? 140 : 30);
  if (r.isPlayer) { banner(r.place <= flow.q ? t('Qualified!') : t('A bit too late'), r.place <= flow.q); sfx.win(); }
  if (flow.q && flow.finishedCount >= flow.q) setTimeout(() => G.endRound(), 900);
};
G.eliminate = (r) => {
  if (r.out) return;
  r.eliminate(); fx.dust(V(r.pos.x, r.pos.y, r.pos.z), 6, 0xffffff, 3);
  if (r.isPlayer) { banner(t('Eliminated!'), false); sfx.lose(); }
  const left = G.runners.filter((o) => !o.out).length;
  if (flow.q && left <= flow.q) setTimeout(() => G.endRound(), 900);
  else if (r.isPlayer && flow.show.rounds.length) setTimeout(() => { if (!flow.done && G.player?.out) G.endRound(); }, 1800);
};
G.endRound = () => {
  if (flow.done || !G.modeObj) return;
  flow.done = true;
  if (G.modeObj.id === 'football') persist2();
  const md = G.modeObj, rd = flow.show.rounds[flow.round];
  let qualified;
  if (md.team) { const w = md.winners(); qualified = G.runners.filter((r) => r.team === w); flow.winTeam = w; }
  else if (md.kind === 'race') qualified = G.runners.filter((r) => r.finished).sort((a, b) => a.place - b.place).slice(0, flow.q);
  else { const al = G.runners.filter((r) => !r.out); qualified = al.length ? al : []; }
  const qset = new Set(qualified.map((r) => r.part));
  for (const p of flow.show.players) if (!p.out && !qset.has(p)) p.out = true;
  const me = flow.show.players[0], won = !me.out;
  const last = flow.round === flow.show.rounds.length - 1;
  const isShow = flow.show.rounds.length > 1, crown = won && last && isShow;
  let earned = flow.coins + (won ? 40 : 10) + (won && last ? 150 : 0) + (crown ? 300 + 500 : 0);
  if (md.id === eventMode()) earned *= 2;
  { const pk = ITEM[save.equip.pet]?.perk; if (pk === 'coins') earned = Math.round(earned * 1.15); if (pk === 'royal') earned = Math.round(earned * 1.1); }
  flow.show.coins += earned; save.coins += earned; { const pk = ITEM[save.equip.pet]?.perk; save.xp += Math.round((won ? 45 : 15) * (pk === 'xp' ? 1.2 : pk === 'royal' ? 1.1 : 1)); }
  const st = save.stats; st.rounds = (st.rounds || 0) + 1; st.earned = (st.earned || 0) + earned; if (won) st.qual = (st.qual || 0) + 1;
  st.modes = st.modes || []; if (!st.modes.includes(md.id)) { st.modes.push(md.id); track('modes'); }
  if (won) track('qualify');
  if (flow.show.choice === 'custom' && (md.team ? qualified.includes(G.player) : md.kind === 'race' ? G.player?.finished : !G.player?.out)) { store.set(doneKey(editor.type), mapHash(getMap())); setTimeout(() => toast(t('You finished your map! You can publish it now')), 2600); }
  if (rd.cm) recordPlay(rd.cm);
  if (won && last) { track('win'); if (flow.show.choice !== 'custom') {} }
  if (crown) { save.wins += 1; track('crown'); }
  if (last || !won) { st.games = (st.games || 0) + 1; if (isShow) track('shows'); }
  track('coins', flow.coins);
  persist2();
  if (isShow) setTimeout(() => ceremony(qualified, () => showResult(won, last, qualified, earned)), 900);
  else setTimeout(() => showResult(won, last, qualified, earned), 700);
};
// ---------------------------------------------------------------- the open world
async function enterWorld(quiet) {
  sfx.unlock(); const go = async () => {
    show('menu', false); show('pause', false); toast(t('Loading the city…'), 30);
    try { await loadPacks(); await need(WORLD_MODELS); } catch (e) { toast(t('The city could not load. Open the game from its published link'), 4); toMenu(); return; }
    flow.show = { choice: 'world', players: [{ name: save.name, equip: { ...save.equip }, isPlayer: true }], rounds: [{ m: 'world', q: 0 }], coins: 0 }; flow.round = 0;
    startRound(); show('intro', false); beginPlay(); flow.state = 'play'; $('big').hidden = true; toast('', 0.01);
    if (!life.gift) { life.gift = true; save.coins += 200; saveLife(); setTimeout(() => toast(t('Welcome to the city! Gift: 200 coins'), 3), 600); }
  };
  if (quiet) go(); else vortex(go);
}
G.enterWorld = enterWorld;
function worldPanel(title, items, onPick) {
  $('ovTitle').textContent = title;
  $('ovBody').innerHTML = `<div class="wlist">${items.map((it) => `<button class="witem" data-id="${esc(it.id)}"><span class="wimg" data-m="${it.model || ''}"></span><b>${esc(it.name)}</b><span>${esc(it.sub || '')}</span>${it.price ? `<em>${icon('coin')}${it.price.toLocaleString('en')}</em>` : ''}</button>`).join('')}</div>`;
  show('ov', true);
  $('ovBody').querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => { sfx.click(); onPick(b.dataset.id); }));
  // little pictures of each item, drawn one by one
  (async () => { for (const el of $('ovBody').querySelectorAll('[data-m]')) { const m = el.dataset.m; if (!m) continue; await need([m.slice(2)]); const u = thumbOf(m); if (u) el.style.backgroundImage = `url(${u})`; await new Promise(requestAnimationFrame); if ($('ov').hidden) break; } })();
}
const thumbCache = {};
function thumbOf(name) {
  if (thumbCache[name]) return thumbCache[name]; if (!M[name]) return null;
  const size = 96, rt = thumbOf.rt || (thumbOf.rt = new THREE.WebGLRenderTarget(size, size)), ts = thumbOf.sc || (thumbOf.sc = (() => { const s = new THREE.Scene(); s.add(new THREE.HemisphereLight(0xffffff, 0x8899bb, 2.6)); const d = new THREE.DirectionalLight(0xffffff, 2); d.position.set(2, 3, 4); s.add(d); return s; })());
  const o = M[name].scene.clone(); ts.add(o); const b = new THREE.Box3().setFromObject(o), c = b.getCenter(V()), r = b.getSize(V()).length() || 1;
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 100); cam.position.set(c.x + r * 0.9, c.y + r * 0.7, c.z + r * 1.5); cam.lookAt(c);
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(ts, cam);
  const px = new Uint8Array(size * size * 4); renderer.readRenderTargetPixels(rt, 0, 0, size, size, px); renderer.setRenderTarget(null); ts.remove(o);
  const cv = document.createElement('canvas'); cv.width = cv.height = size; const cx = cv.getContext('2d'), img = cx.createImageData(size, size);
  for (let y = 0; y < size; y++) img.data.set(px.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
  cx.putImageData(img, 0, 0); return (thumbCache[name] = cv.toDataURL());
}
function worldClothes() {
  const list = ITEMS.filter((i) => i.slot !== 'bat' && i.slot !== 'pet' && !i.hidden && !i.secret && !i.rare);
  worldPanel(t('Clothes shop'), list.map((i) => ({ id: i.id, name: i.name, sub: save.owned.includes(i.id) ? t('Owned') : '', price: save.owned.includes(i.id) ? 0 : i.price, model: null })), (id) => {
    const it = ITEM[id]; if (!save.owned.includes(id)) { if (save.coins < it.price) return toast(t('Need {n} more', { n: it.price - save.coins })); save.coins -= it.price; save.owned.push(id); sfx.coin(); }
    save.equip[it.slot] = id; persist2(); if (G.player) dress(G.player.model, save.equip, { bat: false }); toast(t('You bought {x}', { x: it.name }), 1.5);
  });
}
// between Show rounds: everyone stands on one big box split into squares (one per player).
// The qualified ones celebrate; behind each loser a crate slides out and shoves them into the sea.
const cer = { g: null, t: 0, list: [], done: null };
function ceremony(qualified, done) {
  const keep = new Set(qualified), rs = G.runners.filter((r) => !r.out || keep.has(r));
  const all = rs.length ? rs : G.runners, n = all.length, cols = Math.min(6, n), rows = Math.ceil(n / cols);
  const g = new THREE.Group(); g.position.set(0, -34, -320); scene.add(g); cer.g = g; cer.t = 0; cer.done = done; cer.list = [];
  if (G.level) G.level.root.visible = false; for (const r of G.runners) { r.root.visible = false; if (r.pet) r.pet.o.visible = false; }
  const cells = []; for (let i = 0; i < n; i++) { const c = i % cols, w = Math.floor(i / cols); cells.push({ x: (c - (cols - 1) / 2) * 2.2, z: (w - (rows - 1) / 2) * 2.4 }); }
  const { meshes } = instanced('Cube_Grass_Single', cells.map((c) => ({ x: c.x, y: -1, z: c.z, s: 1.05 })), g);
  const pal = [0xffd23f, 0x7fb8ff, 0xff7ab8, 0x5fe0b0];
  meshes.forEach((m) => { cells.forEach((c, i) => m.setColorAt(i, new THREE.Color(pal[i % 4]))); m.instanceColor.needsUpdate = true; });
  all.forEach((r, i) => {
    const o = SkeletonUtils.clone(M.Character.scene); o.scale.setScalar(0.42); o.position.set(cells[i].x, 0, cells[i].z); g.add(o);
    dress(o, r.equip || {}, { bat: false }); const rg = rig(o); playOn(rg, 'Idle');
    const win = keep.has(r), crate = win ? null : place('Cube_Crate', cells[i].x, 0.6, cells[i].z - 2.4, 1.1, 0, g);
    cer.list.push({ o, rg, win, crate, x: cells[i].x, z: cells[i].z, vy: 0, fell: false, me: r.isPlayer, delay: 1.1 + Math.random() * 0.6 });
  });
  for (const id of ['hud', 'big', 'banner', 'keys', 'touch', 'xhair']) show(id, false);
  flow.state = 'ceremony';
}
function updateCeremony(dt) {
  cer.t += dt; const g = cer.g;
  for (const c of cer.list) {
    c.rg.mixer.update(dt);
    if (c.win) { if (cer.t > 1.6 && !c.cheer) { c.cheer = true; playOn(c.rg, pick(['Wave', 'Yes', 'Dance'])); } continue; }
    const k = cer.t - c.delay;
    if (k > 0 && c.crate) { c.crate.position.z = Math.min(c.z - 0.6, c.crate.position.z + dt * 9); }
    if (k > 0.2) {
      if (!c.hit) { c.hit = true; playOn(c.rg, 'HitReact', 0.05); if (c.me) sfx.hit(); }
      c.o.position.z += dt * 5; c.o.rotation.x += dt * 4;
      if (c.o.position.z > c.z + 1.1) { c.vy -= 22 * dt; c.o.position.y += c.vy * dt; }
      if (!c.fell && c.o.position.y < -6) { c.fell = true; fx.burst(V(g.position.x + c.x, g.position.y - 6, g.position.z + c.o.position.z), 0x9fdcff, 16, 6); sfx.land(); }
    }
  }
  const span = Math.max(6, cer.list.length * 0.9); camera.position.set(g.position.x, g.position.y + span * 0.75, g.position.z + span * 1.05); camera.lookAt(g.position.x, g.position.y - 0.5, g.position.z + 0.6);
  if (cer.t > 4.2) { scene.remove(g); cer.g = null; if (G.level) G.level.root.visible = true; for (const r of G.runners) r.root.visible = !r.out; flow.state = 'result'; const d = cer.done; cer.done = null; d?.(); }
}
function showResult(won, last, qualified, earned) {
  flow.state = 'result';
  const md = G.modeObj;
  const crown = won && last && flow.show.rounds.length > 1;
  $('rTitle').textContent = crown ? t('You won the crown!') : won ? (last ? t('You won!') : t('Qualified!')) : t('Out this time');
  $('rTitle').className = won ? 'win' : 'lose';
  $('rSub').textContent = md.teams ? t('{x} team won with {n} tiles', { x: t({ red: 'Red', blue: 'Blue', green: 'Green', yellow: 'Yellow' }[flow.winTeam]), n: md.hud()[flow.winTeam] }) : md.team ? t('{x} team won {a} - {b}', { x: flow.winTeam === 'red' ? t('Red') : t('Blue'), a: md.hud().red, b: md.hud().blue }) : t('{n} of {m} qualified', { n: qualified.length, m: G.runners.length });
  $('rList').innerHTML = qualified.slice(0, 10).map((r) => `<span class="${r.isPlayer ? 'me' : ''}"><img alt="" src="${THUMB.portrait(r.part.equip)}">${r.isPlayer ? t('You') : r.name}</span>`).join('');
  $('rCoins').textContent = earned;
  $('rNext').textContent = won && !last ? t('Next round') : t('Play again');
  $('rNext').dataset.next = won && !last ? 'next' : 'again';
  show('result', true); show('hud', false); show('xhair', false);
  if (crown || (won && last)) { sfx.win(); fx.confetti(V(G.player.pos.x, G.player.pos.y + 2, G.player.pos.z), 200); }
}
$('rNext').addEventListener('click', () => {
  sfx.click();
  if ($('rNext').dataset.next === 'next') { flow.round++; startRound(); }
  else { const c = flow.show.choice; cleanupRound(); show('result', false); if (c === 'custom') openBuild(); else startMatchmaking(c); }
});
$('rMenu').addEventListener('click', () => { sfx.click(); toMenu(); });
function toMenu() {
  cleanupRound(); editor.close();
  flow.state = 'menu'; lobby.view = 'play'; lobby.root.visible = true; dive.root.visible = false;
  for (const id of ['hud', 'result', 'pause', 'big', 'mm', 'intro', 'bui', 'banner', 'xhair']) show(id, false);
  show('menu', true); setTab('play'); refreshMenu();
  const g = lobby.root.position; camPos.set(g.x, g.y + 3, g.z + 9); camLook.set(g.x, g.y + 1.3, g.z);
  if (!save.gift) { save.gift = true; save.coins += 500; persist2(); refreshMenu(); setTimeout(() => toast(t('Starter gift: 500 coins for the shop')), 700); }
  else if (dailyState().can) setTimeout(() => { if (flow.state === 'menu') openOv('daily'); }, 900);
}
function togglePause(force) { if (flow.state !== 'play') return; G.paused = force ?? !G.paused; show('pause', G.paused); }
$('hPause').addEventListener('click', () => togglePause(true));
$('pResume').addEventListener('click', () => togglePause(false));
$('pQuit').addEventListener('click', () => { G.paused = false; sfx.click(); toMenu(); });
$('playBtn').addEventListener('click', () => startMatchmaking(flow.choice));
document.addEventListener('visibilitychange', () => { if (document.hidden && flow.state === 'play') togglePause(true); });
function banner(text, good) { const b = $('banner'); b.textContent = text; b.className = good ? 'good' : 'bad'; b.hidden = false; flow.bannerT = 2; }
G.banner = banner;
G.faceCam = (f) => { ctl.yaw = f + PI; };

// ---------------------------------------------------------------- HUD
function buildHud() {
  const md = G.modeObj;
  show('hTeam', !!md.team); show('hPlaceBox', !md.team); show('prog', md.kind === 'race');
  const prog = $('prog'); prog.querySelectorAll('i').forEach((x) => x.remove());
  if (md.kind === 'race') G.runners.forEach((r) => { const d = document.createElement('i'); if (r.isPlayer) d.className = 'me'; prog.appendChild(d); r.dot = d; });
  $('hCoins').textContent = 0;
  $('bFire').hidden = !md.bats && !md.charge;
  $('bFire').innerHTML = md.bats ? icon('bat') : md.charge ? icon('ball') : icon('fire');
}
function updateHud() {
  const md = G.modeObj, p = G.player; if (!md || !p) return;
  if (md.team && md.teams) { const h = md.hud(), col = { red: '#ff5a6e', blue: '#6fb0ff', green: '#4be37a', yellow: '#ffd23f' }; $('hRed').innerHTML = md.teams.slice(0, 2).map((k) => `<span style="color:${col[k]}">${h[k]}</span>`).join(' '); $('hBlue').innerHTML = md.teams.slice(2).map((k) => `<span style="color:${col[k]}">${h[k]}</span>`).join(' '); $('hTime').textContent = Math.max(0, Math.ceil(h.time)); }
  else if (md.team) { const h = md.hud(); $('hRed').textContent = h.red; $('hBlue').textContent = h.blue; $('hTime').textContent = Math.max(0, Math.ceil(h.time)); }
  else if (md.kind === 'race') {
    const order = [...G.runners].filter((r) => !r.out).sort((a, b) => (a.finished && b.finished ? a.place - b.place : a.finished ? -1 : b.finished ? 1 : (md.progress(b) - md.progress(a))));
    $('hPlace').textContent = `${order.indexOf(p) + 1}/${order.length}`; $('hPlaceLbl').textContent = md.laps ? t('Place · lap {n}/{m}', { n: Math.min(md.laps, (p.lap || 0) + 1), m: md.laps }) : t('Place · top {n} qualify', { n: flow.q });
    for (const r of G.runners) if (r.dot) r.dot.style.right = (md.progress(r) * 100) + '%';
  } else {
    if (md.hudInfo) { const h = md.hudInfo(); $('hPlace').textContent = h.value; $('hPlaceLbl').textContent = h.label; } else {
    const left = G.runners.filter((r) => !r.out).length;
    $('hPlace').textContent = left; $('hPlaceLbl').textContent = md.time != null ? t('Left · {n}s', { n: Math.max(0, Math.ceil(md.time)) }) : t('Left'); }
  }
  const w = p.weapon;
  show('wChip', !!w);
  if (w) { $('wName').textContent = WEAPONS[w.id].name; $('wAmmo').textContent = '×' + w.ammo; }
  if (!md.bats && !md.charge && IS_TOUCH) $('bFire').hidden = !w;
  if (!w && lockMark) lockMark.visible = false;
}

// ---------------------------------------------------------------- camera during play
function playCam(dt) {
  const narrow = innerWidth < innerHeight;
  let tgt = G.player;
  if (!tgt || tgt.out) tgt = G.runners.find((r) => !r.out) || tgt;
  if (!tgt) return;
  const p = tgt.pos, dist = G.modeObj?.camDist ? G.modeObj.camDist * (narrow ? 1.15 : 1) : narrow ? 4.6 : 3.9;
  G.camFwd = { x: -Math.sin(ctl.yaw), z: -Math.cos(ctl.yaw) };
  const py = Math.max(p.y, (G.level?.killY ?? -20) + 4);
  // over-the-shoulder view while holding a weapon, so the crosshair isn't blocked by your own head
  const aiming = tgt === G.player && !!G.player.weapon && !tgt.out;
  flow.sh = damp(flow.sh || 0, aiming ? 1 : 0, 8, dt);
  const right = V(Math.cos(ctl.yaw), 0, -Math.sin(ctl.yaw)).multiplyScalar(flow.sh * (narrow ? 0.7 : 0.9));
  const h = Math.sin(ctl.pitch) * dist + 1.15, flat = Math.cos(ctl.pitch) * dist;
  const look = V(p.x, py + 1.2 + flow.sh * 0.35, p.z).add(right);
  let want = V(p.x + Math.sin(ctl.yaw) * flat, py + h, p.z + Math.cos(ctl.yaw) * flat).add(right);
  // keep the camera out of walls and floors: pull it in front of whatever is in the way
  camRay.reset();
  world.raycastClosest(new CANNON.Vec3(look.x, look.y, look.z), new CANNON.Vec3(want.x, want.y, want.z), { collisionFilterMask: 1 | 4, skipBackfaces: true }, camRay);
  if (camRay.hasHit) { const hp = camRay.hitPointWorld, d = V(hp.x, hp.y, hp.z).sub(look); const l = Math.max(0.6, d.length() - 0.35); want = look.clone().add(d.normalize().multiplyScalar(l)); }
  camPos.lerp(want, 1 - Math.exp(-12 * dt));
  camLook.lerp(look, 1 - Math.exp(-16 * dt));
  camera.position.copy(camPos);
  if (G.shake > 0) { camera.position.x += rand(-1, 1) * G.shake * 0.35; camera.position.y += rand(-1, 1) * G.shake * 0.35; G.shake = Math.max(0, G.shake - dt * 1.6); }
  camera.lookAt(camLook);
  G.aim.copy(camLook).sub(camPos).normalize();
  updateAim(aiming, dist);
  sun.position.set(p.x + 12, p.y + 32, p.z + 14); sun.target.position.set(p.x, p.y, p.z - 6);
}
// crosshair: what the screen centre points at, plus a soft lock on the nearest rival near it
const aimRay = new CANNON.RaycastResult();
let lockMark = null;
function updateAim(aiming, dist) {
  const fwd = V(); camera.getWorldDirection(fwd);
  G.lock = null;
  if (aiming) {
    const cone = IS_TOUCH ? 0.5 : 0.3; let best = cone;
    for (const f of G.runners) {
      if (f === G.player || f.out || f.finished || (G.player.team && f.team === G.player.team)) continue;
      const v = V(f.pos.x, f.pos.y + 0.9, f.pos.z).sub(camera.position), d = v.length();
      if (d < 2 || d > 34) continue;
      const a = v.normalize().angleTo(fwd); if (a < best) { best = a; G.lock = f; }
    }
  }
  const from = camera.position.clone().addScaledVector(fwd, dist + 0.6), to = camera.position.clone().addScaledVector(fwd, 70);
  aimRay.reset(); world.raycastClosest(new CANNON.Vec3(from.x, from.y, from.z), new CANNON.Vec3(to.x, to.y, to.z), { collisionFilterMask: 1 | 4, skipBackfaces: true }, aimRay);
  G.aimPoint = aimRay.hasHit ? V(aimRay.hitPointWorld.x, aimRay.hitPointWorld.y, aimRay.hitPointWorld.z) : to;
  if (G.lock) G.aimPoint = V(G.lock.pos.x, G.lock.pos.y + 0.9, G.lock.pos.z);
  const xh = $('xhair'); xh.hidden = !aiming; xh.classList.toggle('lock', !!G.lock);
  if (!lockMark) {
    lockMark = new THREE.Group(); const a = M.Arrow.scene.clone(); a.rotation.set(PI / 2, 0, -PI / 2, 'ZYX'); a.scale.setScalar(0.3);
    a.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.material = o.material.clone(); o.material.color.set(0xffd23f); o.material.emissive = new THREE.Color(0xffb000); o.material.emissiveIntensity = 0.6; } });
    lockMark.add(a); scene.add(lockMark);
  }
  lockMark.visible = !!G.lock;
  if (G.lock) { lockMark.position.set(G.lock.pos.x, G.lock.pos.y + 2.4 + Math.sin(G.t * 8) * 0.12, G.lock.pos.z); lockMark.rotation.y += 0.15; }
}
function flyCam(dt) {
  const f = G.modeObj.fly || [[0, 20, 20, 0, 0, 0]], T = 3.8;
  flow.flyT += dt;
  const k = clamp(flow.flyT / T, 0, 1), seg = Math.min(f.length - 2, Math.floor(k * (f.length - 1))), lk = k * (f.length - 1) - seg;
  const a = f[seg], b = f[Math.min(f.length - 1, seg + 1)], s = lk * lk * (3 - 2 * lk);
  camera.position.set(a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s);
  camera.lookAt(a[3] + (b[3] - a[3]) * s, a[4] + (b[4] - a[4]) * s, a[5] + (b[5] - a[5]) * s);
  camPos.copy(camera.position);
  sun.position.set(camera.position.x + 10, 40, camera.position.z); sun.target.position.set(a[3], 0, a[5]);
  G.level.update(dt, G.t, false);
  for (const r of G.runners) { r.mixer.update(dt); r.sync(dt); }
  if (flow.flyT > T + 1.2) {
    if (G.modeObj.positions && !G.playerRole) { if (G.autoPlayer) G.playerRole = 'MID'; else return openRolePick(); }
    beginPlay();
  }
}

// ---------------------------------------------------------------- step the round
function stepRound(dt) {
  G.t += dt;
  const md = G.modeObj;
  if (flow.state === 'count') {
    const before = Math.ceil(flow.count - 0.6); flow.count -= dt; const now = Math.ceil(flow.count - 0.6);
    const big = $('big');
    if (flow.count > 0.6) { big.hidden = false; big.textContent = Math.max(1, now); if (now !== before) sfx.beep(); }
    else if (flow.count > 0) { if (big.textContent !== t('GO!')) { big.textContent = t('GO!'); sfx.go(); } }
    else { big.hidden = true; flow.state = 'play'; }
  }
  const live = flow.state === 'play';
  for (const r of G.runners) {
    if (live && !flow.done) { if (r.isPlayer && !G.autoPlayer) readPlayerInput(r); else think(r, dt); }
    else { r.input.x = r.input.z = 0; r.input.jump = r.input.dive = r.input.fire = false; if (r.isPlayer) ctl.jump = ctl.dive = ctl.fire = false; }
    r.update(dt);
  }
  if (live) { md.update?.(dt); updatePickups(); }
  tickWeapons(dt); updateProjectiles(dt);
  G.level.update(dt, G.t, live);
  world.step(1 / 60, dt, 4);
  for (const r of G.runners) r.sync(dt);
  // coins (player only)
  const p = G.player;
  if (p && !p.out) for (const c of G.level.coins) if (!c.taken && Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < 1.2 && Math.abs(p.pos.y + 0.8 - c.obj.position.y) < 1.4) {
    c.taken = true; c.obj.visible = false; flow.coins++; $('hCoins').textContent = flow.coins;
    fx.burst(c.obj.position.clone(), 0xffd23f, 8, 4); sfx.coin();
  }
  if (live && md.kind === 'race' && flow.roundT > 160 && !flow.done) G.endRound();
  flow.roundT += live ? dt : 0;
  updateHud();
}

// ---------------------------------------------------------------- players' maps
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const typeName = (id) => (MAP_TYPES.find((x) => x.id === id) || MAP_TYPES[0]).name;
const doneKey = (type) => 'mapDone_' + type;
function pubStatus(type) {
  const m = getMap(type), miss = editor.missing(m);
  if (comm.state !== 'live') return { ok: false, why: comm.state === 'off' || !comm.state ? t('Publishing works when you play from the published link') : t('Loading maps…') };
  if (!comm.canWrite) return { ok: false, why: t('You need contributor access to publish') };
  if (miss) return { ok: false, why: miss };
  if (store.get(doneKey(type), '') !== mapHash(m)) return { ok: false, why: type === 'race' ? t('You must finish your own map first (test it and reach the finish)') : t('You must win your own map first (test it)') };
  const mine = allMaps().filter((x) => x.mine).length;
  if (mine >= MAX_MAPS) return { ok: false, why: t('You reached the limit ({n} maps). Delete one first', { n: MAX_MAPS }) };
  if (save.coins < PUBLISH_PRICE) return { ok: false, why: t('You need {n} coins', { n: PUBLISH_PRICE }) };
  return { ok: true, why: t('Ready to publish') };
}
// Build tab: a hub with Create and Play; each opens its own screen
const bview = { pane: 'hub', filter: 'all' };
function setBuildPane(p) { bview.pane = p; show('bHub', p === 'hub'); show('bCreatePane', p === 'create'); show('bPlayPane', p === 'play'); renderCommunity(); }
function renderCreate() {
  $('bTypes').innerHTML = MAP_TYPES.map((ty) => {
    const st = pubStatus(ty.id);
    return `<div class="tcard"><span class="ic">${icon(ty.icon)}</span><b>${ty.name}</b><small>${ty.desc}</small>
      <button class="btn" data-edit="${ty.id}">${t('Edit')}</button>
      <div class="pub"><input data-pubname="${ty.id}" maxlength="28" placeholder="${t('Map name')}" autocomplete="off"><button class="btn pk" data-pub="${ty.id}" ${st.ok ? '' : 'disabled'}>${t('Publish')} · ${PUBLISH_PRICE}</button></div>
      <small class="note">${st.why}</small></div>`;
  }).join('');
}
function renderCommunity() {
  if ($('vBuild').hidden) return;
  if (bview.pane === 'create') return renderCreate();
  if (bview.pane !== 'play') return;
  $('cmFilter').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === bview.filter)));
  const L = $('cmList');
  if (comm.state !== 'live') { L.innerHTML = `<div class="cmEmpty">${comm.state === 'slow' ? t('Maps won\'t load right now, try again in a bit') : comm.state === 'loading' ? t('Loading maps…') : t('Player maps show up when you open the game from the published link')}</div>`; return; }
  const maps = allMaps().filter((m) => bview.filter === 'all' || (m.type || 'race') === bview.filter);
  if (!maps.length) { L.innerHTML = `<div class="cmEmpty">${t('No maps yet. Build and publish the first one!')}</div>`; return; }
  L.innerHTML = maps.map((m) => `<div class="cm"><span class="ic">${icon((MAP_TYPES.find((x) => x.id === (m.type || 'race')) || MAP_TYPES[0]).icon)}</span><div class="info"><b>${esc(m.name)}${m.featured ? `<span class="tag">${t('Featured')}</span>` : ''}</b>
    <span class="by">${typeName(m.type || 'race')} · ${m.mine ? t('Your map') : t('By {x}', { x: esc(m.author) })} · ${t('Played {n} times', { n: m.plays })}</span></div>
    <div class="act">${m.mine ? `<button data-cmdel="${m.key}" class="lk">${t('Delete')}</button>` : `<button data-cmlike="${m.key}" class="lk ${liked(m.key) ? 'on' : ''}" aria-label="${t('Like')}">♥ ${m.likes}</button>`}${comm.owner ? `<button data-cmft="${m.key}" class="ft">${m.featured ? t('Remove from main modes') : t('Promote to main modes')}</button>` : ''}<button data-cmplay="${m.key}">${t('Play')}</button></div></div>`).join('');
}
comm.onChange = () => { renderCommunity(); };
comm.onEarn = (n, total) => { reward(n, t('People played your maps ({n} times)', { n: total })); persist2(); refreshMenu(); };
$('bCreate').addEventListener('click', () => { sfx.click(); setBuildPane('create'); });
$('bPlay').addEventListener('click', () => { sfx.click(); setBuildPane('play'); });
document.querySelectorAll('[data-bback]').forEach((b) => b.addEventListener('click', () => { sfx.click(); setBuildPane('hub'); }));
$('cmFilter').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (!b) return; sfx.click(); bview.filter = b.dataset.f; renderCommunity(); });
$('cmList').addEventListener('click', async (e) => {
  const b = e.target.closest('button'); if (!b) return; sfx.click();
  if (b.dataset.cmplay) startMatchmaking('cm:' + b.dataset.cmplay);
  else if (b.dataset.cmlike) toggleLike(b.dataset.cmlike);
  else if (b.dataset.cmft) { const m = allMaps().find((x) => x.key === b.dataset.cmft); await setFeatured(m.key, !m.featured).catch(() => toast(t('That didn\'t work, try again'))); toast(m.featured ? t('Removed from main modes') : t('The map is now one of the main modes!')); }
  else if (b.dataset.cmdel) { if (b.dataset.arm) { await unpublishMap(b.dataset.cmdel).catch(() => {}); toast(t('Deleted')); } else { b.dataset.arm = 1; b.textContent = t('Sure?'); } }
});
$('bTypes').addEventListener('click', async (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.edit) { sfx.click(); editor.type = b.dataset.edit; openBuild(); return; }
  const type = b.dataset.pub; if (!type) return;
  const st = pubStatus(type); if (!st.ok) { toast(st.why); return; }
  const inp = $('bTypes').querySelector(`[data-pubname="${type}"]`), name = inp.value.trim();
  if (name.length < 2) { toast(t('Type a name for the map')); inp.focus(); return; }
  b.disabled = true;
  try { await publishMap(getMap(type), name); save.coins -= PUBLISH_PRICE; persist2(); refreshMenu(); sfx.win(); fx.confetti(V(lobby.root.position.x, 3, lobby.root.position.z), 120); toast(t('Map published! You get 5 coins every time someone plays it'), 3); }
  catch (err) { toast(err.message === 'full' ? t('Limit reached') : t('Publishing failed, try again')); }
  renderCommunity();
});

// ---------------------------------------------------------------- build mode UI
function openBuild() {
  cleanupRound(); flow.state = 'build'; lobby.root.visible = false;
  show('menu', false); show('bui', true); show('hud', false);
  editor.open(); renderPalette();
}
function renderPalette() {
  $('bPal').innerHTML = piecesFor(editor.type).map((p) => `<button data-t="${p.t}" class="${editor.sel === p.t && !editor.erase ? 'on' : ''}"><img alt="" src="${THUMB['piece:' + p.t] || ''}"><span>${p.name}</span></button>`).join('');
  $('bErase').classList.toggle('on', editor.erase);
  const r = [t('Forward'), t('Right'), t('Back'), t('Left')][editor.rot]; $('bRot').querySelector('span').textContent = r;
}
$('bPal').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (!b) return; editor.sel = b.dataset.t; editor.erase = false; sfx.click(); renderPalette(); });
$('bRot').addEventListener('click', () => { editor.rot = (editor.rot + 1) % 4; sfx.click(); renderPalette(); });
$('bErase').addEventListener('click', () => { editor.erase = !editor.erase; sfx.click(); renderPalette(); });
$('bClear').addEventListener('click', () => { if ($('bClear').dataset.arm) { editor.clear(); delete $('bClear').dataset.arm; $('bClear').querySelector('span').textContent = t('Clear all'); toast(t('Deleted')); } else { $('bClear').dataset.arm = 1; $('bClear').querySelector('span').textContent = t('Sure?'); setTimeout(() => { delete $('bClear').dataset.arm; $('bClear').querySelector('span').textContent = t('Clear all'); }, 2500); } });
$('bReset').addEventListener('click', () => { editor.reset(); sfx.click(); toast(t('Original map restored')); });
$('bTest').addEventListener('click', () => {
  const miss = editor.missing(); if (miss) { toast(miss); return; }
  editor.close(); show('bui', false);
  flow.show = { choice: 'custom', players: [{ name: t('You'), equip: { ...save.equip }, isPlayer: true }, ...NAMES.slice(0, 3).map((n) => ({ name: n, equip: randomEquip(), isPlayer: false }))], rounds: [{ m: 'custom', q: editor.type === 'race' ? 3 : editor.type === 'survival' ? 2 : null }], coins: 0 };
  flow.round = 0; startRound();
});
$('bBack').addEventListener('click', () => { sfx.click(); toMenu(); setTab('build'); setBuildPane('create'); });
function pieceThumbs() {
  const shoot = THUMB._shoot; if (!shoot) return;
  for (const p of PIECES) {
    const o = M[p.model].scene.clone(), g = new THREE.Group(); g.add(o); g.rotation.y = -0.6; g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(g), c = box.getCenter(V()), r = box.getSize(V()).length() || 1;
    THUMB['piece:' + p.t] = shoot(g, c, r * 1.5, r * 0.45);
  }
}

// ---------------------------------------------------------------- main loop
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 1 / 20);
  if (flow.state === 'menu') { updateLobby(dt); lobbyCam(dt); }
  else if (flow.state === 'ceremony') updateCeremony(dt);
  else if (flow.state === 'mm') updateMatchmaking(dt);
  else if (flow.state === 'fly') flyCam(dt);
  else if ((flow.state === 'count' || flow.state === 'play' || flow.state === 'result') && !G.paused && G.modeObj) { stepRound(dt); playCam(dt); }
  else if (flow.state === 'build') { editor.updateCamera(dt); }
  if (!G.paused) { puffs.update(dt); confetti.update(dt); }
  toast.update(dt);
  if (flow.bannerT > 0) { flow.bannerT -= dt; if (flow.bannerT <= 0) show('banner', false); }
  updateGold(dt);
  if (flow.state !== 'intro') renderScene(dt);
}

// ---------------------------------------------------------------- boot
translateDom();
(async () => {
  try { await loadAssets((k) => { $('loadbar').style.width = Math.round(k * 100) + '%'; }); }
  catch (e) { (window.__bdFail || ((m) => { $('loadtxt').textContent = m; }))(t('The models failed to load') + ' (' + (e?.message || e) + ')'); console.error(e); return; }
  computeBoneFix();
  try { makeThumbs(); pieceThumbs(); } catch (e) { console.warn('thumbnails failed', e); }
  buildLobby(); buildDive();
  show('loading', false);
  toMenu();
  frame();
  // ---- the open world
  initWorld({
    showAct(label) { const b = $('wAct'); if (!label) { b.hidden = true; return; } b.hidden = false; if (b.textContent !== label) b.textContent = label; },
    panel(title, items, onPick) { worldPanel(title, items, onPick); },
    openWardrobe() { worldClothes(); },
    goPlay(choice) { cleanupRound(); show('hud', false); startMatchmaking(choice); },
    restartWorld() { cleanupRound(); enterWorld(true); },
    refreshMenu,
  });
  comm.onOwner = () => { heroDress(); refreshMenu(); toast(t('Glitch') + ' · ' + t('Owner'), 3); };
  playIntro(false); initCommunity();
  window.__boltdash = { G, flow, ctl, MODES, comm, setTab, save, camera, renderer, scene, render: (dt) => renderScene(dt), giveWeapon, startRound, startMatchmaking, toMenu, openBuild, editor, sim(sec, hook) { for (let i = 0; i < sec * 60; i++) { hook && hook(i / 60); if (flow.state === 'fly') { flow.flyT = 99; flyCam(1 / 60); } if (flow.state === 'count' || flow.state === 'play') { stepRound(1 / 60); playCam(1 / 60); } } } };
})();
