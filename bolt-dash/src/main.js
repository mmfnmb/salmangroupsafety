// Game flow: lobby menu, matchmaking, show rounds, HUD, camera, input, build mode.
import { THREE, CANNON, M, G, V, PI, rand, pick, clamp, damp, $, IS_TOUCH, store, save, persist, sfx, toast, renderer, scene, camera, canvas, sky, sun, world, puffs, confetti, fx, loadAssets, place, instanced, SkeletonUtils } from './core.js';
import { ITEMS, ITEM, CATS, SKINS, BATS, THUMB, computeBoneFix, dress, randomEquip, makeThumbs, holdItem } from './cosmetics.js';
import { Runner, think } from './runner.js';
import { MODES, MODE_LIST } from './modes.js';
import { WEAPONS, giveWeapon, fire, botFire, updateProjectiles, updatePickups, tickWeapons, clearProjectiles, dropWeapon } from './weapons.js';
import { editor, customMode, getMap, PIECES } from './build.js';

const NAMES = ['زيزو', 'نور', 'حمو', 'لولو', 'تيتو', 'ميدو', 'كوكو', 'دودو', 'بيبو', 'رورو', 'سوسو', 'فوفا', 'شيكو', 'بسبوسة', 'كراملة', 'زعتر', 'فلفل', 'سمسم'];
const icon = (n, cls = 'i') => `<svg class="${cls}"><use href="#i-${n}"/></svg>`;
const show = (id, on) => { $(id).hidden = !on; };

// ---------------------------------------------------------------- progress: level + daily challenges
const today = () => new Date().toISOString().slice(0, 10);
const freshDaily = () => ({ day: today(), list: [
  { k: 'coins', text: 'اجمع 25 عملة', goal: 25, prog: 0, rew: 60 },
  { k: 'qualify', text: 'اتأهل في 3 جولات', goal: 3, prog: 0, rew: 80 },
  { k: 'dive', text: 'اغطس 10 مرات', goal: 10, prog: 0, rew: 50 },
] });
if (!save.daily || save.daily.day !== today()) save.daily = freshDaily();
function track(k, n = 1) {
  if (save.daily.day !== today()) save.daily = freshDaily();
  for (const c of save.daily.list) if (c.k === k && c.prog < c.goal) { c.prog = Math.min(c.goal, c.prog + n); if (c.prog >= c.goal) { save.coins += c.rew; toast(`خلصت تحدي: +${c.rew} عملة`); sfx.coin(); } }
  persist();
}
const levelOf = (xp) => ({ lvl: 1 + Math.floor(xp / 120), cur: xp % 120, need: 120 });
G.onPlayerDive = () => track('dive');

// ---------------------------------------------------------------- input
const keys = new Set();
const ctl = { jump: false, dive: false, fire: false, stick: { x: 0, y: 0 }, yaw: 0, pitch: 0.26 };
addEventListener('keydown', (e) => {
  if (e.repeat) return; keys.add(e.code);
  if (e.code === 'Space') { ctl.jump = true; e.preventDefault(); }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyE') ctl.dive = true;
  if (e.code === 'KeyF' || e.code === 'Enter') ctl.fire = true;
  if (e.code === 'Escape' && flow.state === 'play') togglePause();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  sfx.unlock();
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: 0 };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag || drag.id !== e.pointerId) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved += Math.abs(dx) + Math.abs(dy);
  if (flow.state === 'build') { editor.cam.x = clamp(editor.cam.x - dx * editor.cam.zoom * 0.0025, -14, 14); editor.cam.z = clamp(editor.cam.z - dy * editor.cam.zoom * 0.004, -80, 14); }
  else if (flow.state === 'menu') lobby.hero.rotation.y += dx * 0.012;
  else { ctl.yaw -= dx * 0.006; ctl.pitch = clamp(ctl.pitch + dy * 0.004, -0.45, 1.1); }
  drag.x = e.clientX; drag.y = e.clientY;
});
canvas.addEventListener('pointerup', (e) => {
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
  for (const [id, k] of [['bJump', 'jump'], ['bDive', 'dive'], ['bFire', 'fire']]) {
    const el = $(id);
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); ctl[k] = true; el.classList.add('on'); sfx.unlock(); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, () => el.classList.remove('on'));
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
  if (ctl.fire) { r.input.fire = true; ctl.fire = false; }
}
G.onFire = (r) => {
  if (G.modeObj?.onFire) return G.modeObj.onFire(r);
  if (!r.weapon) return;
  if (r.isPlayer) fire(r, (G.aimPoint || V(r.pos.x + Math.sin(r.facing) * 10, r.pos.y + 1, r.pos.z + Math.cos(r.facing) * 10)).clone().sub(V(r.pos.x, r.pos.y + 1.1, r.pos.z)), G.lock);
  else fire(r, V(Math.sin(r.facing), 0, Math.cos(r.facing)));
};
G.botFire = (r) => botFire(r);

// ---------------------------------------------------------------- lobby (menu stage) built from models
const lobby = { root: new THREE.Group(), hero: null, mixer: null, acts: {}, friends: [], floaters: [], view: 'play', t: 0 };
function buildLobby() {
  const g = lobby.root; g.position.set(0, 0, 200); scene.add(g);
  // hex dance floor in party colours
  const cols = [0xff7ab8, 0xffd23f, 0x5fe0b0, 0x7fb8ff], cells = [];
  const sx = 2.42, sz = 2.095, R = 4;
  for (let q = -R; q <= R; q++) for (let r = Math.max(-R, -q - R); r <= Math.min(R, -q + R); r++) cells.push({ x: sx * (q + r / 2), z: sz * r, ring: Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) });
  const { meshes } = instanced('k/block-snow-low-hexagon', cells.map((c) => ({ x: c.x, y: -1.1 - (c.ring === 0 ? -0.5 : 0), z: c.z, s: 2.2 })), g);
  meshes.forEach((m) => { cells.forEach((c, i) => m.setColorAt(i, new THREE.Color(cols[c.ring % 4]))); m.instanceColor.needsUpdate = true; });
  lobby.floor = { meshes, cells, cols };
  // backdrop: banner towers, banners, flags, presents and candy canes
  for (const [x, z, n, ry] of [[-9, -6, 'k/bannerTowerRed', 0.3], [9, -6, 'k/bannerTowerGreen', -0.3], [-12, 1, 'k/bannerTowerGreen', 0.6], [12, 1, 'k/bannerTowerRed', -0.6]]) place(n, x, -0.6, z, 4.2, ry, g);
  for (const [x, z, n] of [[-6, -9, 'k/banner-red'], [6, -9, 'k/banner-green'], [0, -10, 'k/banner']]) place(n, x, -0.6, z, n === 'k/banner' ? 5 : 6, 0, g);
  for (const [x, z, n, s] of [[-7.5, 3.5, 'acc/present-a-cube', 2.6], [7.8, 3, 'k/present-b-round', 3], [-6.6, 5.2, 'k/present-b-round', 2.2], [6.2, 5.5, 'acc/present-a-cube', 2]]) place(n, x, -0.6, z, s, rand(0, 6), g);
  for (const [x, z, n] of [[-4.6, 6.6, 'k/candy-cane-red'], [4.8, 6.4, 'k/candy-cane-green'], [-10.5, -2, 'k/candy-cane-green'], [10.5, -2, 'k/candy-cane-red']]) place(n, x, -0.6, z, 5, rand(0, 6), g);
  for (const [x, z] of [[-3, -8], [3, -8]]) place('k/flagCheckers', x, -0.6, z, 3, 0, g);
  const clip = (n) => M.Character.animations.find((a) => a.name.endsWith('|' + n));
  // hero
  lobby.hero = SkeletonUtils.clone(M.Character.scene); lobby.hero.scale.setScalar(0.55); lobby.hero.position.y = 0.0; g.add(lobby.hero);
  lobby.hero.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  lobby.mixer = new THREE.AnimationMixer(lobby.hero);
  for (const n of ['Idle', 'Wave', 'Yes', 'No', 'Punch', 'Jump', 'Run', 'HitReact']) { lobby.acts[n] = lobby.mixer.clipAction(clip(n)); if (n !== 'Idle' && n !== 'Run') { lobby.acts[n].setLoop(THREE.LoopOnce, 1); lobby.acts[n].clampWhenFinished = true; } }
  lobby.acts.Idle.play(); lobby.cur = lobby.acts.Idle;
  lobby.mixer.addEventListener('finished', () => fadeTo('Idle'));
  // friends
  for (const [x, z, ry, an] of [[-3.6, -3.2, 0.35, 'Yes'], [3.7, -3.0, -0.35, 'Wave'], [-6.4, -0.6, 0.6, 'Idle'], [6.5, -0.4, -0.6, 'Yes']]) {
    const f = SkeletonUtils.clone(M.Character.scene); f.scale.setScalar(0.45); f.position.set(x, -0.6, z); f.rotation.y = ry; g.add(f);
    f.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    dress(f, randomEquip(), { bat: Math.random() < 0.5 });
    const mx = new THREE.AnimationMixer(f); const a = mx.clipAction(clip(an)); a.play(); mx.update(rand(0, 2));
    lobby.friends.push({ obj: f, mixer: mx, an, t: rand(2, 5) });
  }
  for (let k = 0; k < 12; k++) {
    const name = ['Cube_Question', 'Coin', 'Star', 'k/crate-item'][k % 4];
    const a = (k / 12) * PI * 2, rr = rand(6, 11);
    const o = place(name, Math.cos(a) * rr, rand(2.5, 7), -Math.abs(Math.sin(a)) * rr - 3, name === 'k/crate-item' ? 1.6 : name === 'Cube_Question' ? 0.5 : 0.55, rand(0, 6), g);
    lobby.floaters.push({ obj: o, base: o.position.y, ph: rand(0, 6), spin: rand(0.6, 1.6) * (k % 2 ? 1 : -1) });
  }
  heroDress();
}
function heroDress(extra) { const e = { ...save.equip, ...(extra || {}) }; dress(lobby.hero, e, { bat: true }); }
function fadeTo(n, speed = 1) { const a = lobby.acts[n]; if (!a || lobby.cur === a) return; a.reset().fadeIn(0.2).play(); a.timeScale = speed; lobby.cur?.fadeOut(0.2); lobby.cur = a; }
function heroEmote() { const n = pick(['Wave', 'Yes', 'No', 'Punch', 'Jump']); fadeTo(n); if (n === 'Jump') sfx.jump(); else sfx.click(); }
function updateLobby(dt) {
  lobby.t += dt; lobby.mixer.update(dt);
  for (const f of lobby.friends) { f.mixer.update(dt); }
  for (const fl of lobby.floaters) { fl.obj.rotation.y += fl.spin * dt; fl.obj.position.y = fl.base + Math.sin(lobby.t * 1.3 + fl.ph) * 0.3; }
  // dance-floor lights chase around the rings
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
  if (flow.state === 'mm') { lobby.emoteT = (lobby.emoteT ?? 1) - dt; if (lobby.emoteT <= 0) { lobby.emoteT = rand(1.4, 2.4); heroEmote(); } }
}
function lobbyCam(dt) {
  const g = lobby.root.position, narrow = innerWidth < innerHeight, sway = Math.sin(lobby.t * 0.25) * 0.4;
  let pos, look;
  if (lobby.view === 'locker') { pos = narrow ? V(g.x + sway * 0.3, g.y + 1.9, g.z + 6.2) : V(g.x + 1.4 + sway * 0.3, g.y + 2.0, g.z + 5.2); look = narrow ? V(g.x, g.y - 0.3, g.z) : V(g.x + 1.4, g.y + 1.25, g.z); }
  else if (lobby.view === 'mm') { pos = V(g.x + sway * 0.4, g.y + 1.9, g.z + (narrow ? 5.6 : 4.6)); look = V(g.x, g.y + (narrow ? 0.9 : 1.3), g.z); }
  else { pos = narrow ? V(g.x + sway, g.y + 2.6, g.z + 9.4) : V(g.x + sway, g.y + 2.4, g.z + 7.4); look = narrow ? V(g.x, g.y + 0.6, g.z) : V(g.x, g.y + 1.5, g.z); }
  camPos.lerp(pos, 1 - Math.exp(-4 * dt)); camLook.lerp(look, 1 - Math.exp(-4 * dt));
  camera.position.copy(camPos); camera.lookAt(camLook);
  sun.position.set(g.x + 8, g.y + 18, g.z + 10); sun.target.position.copy(g);
}

// ---------------------------------------------------------------- menu UI
function refreshMenu() {
  $('mCoins').textContent = save.coins; $('mWins').textContent = save.wins;
  $('mSound').innerHTML = icon(save.muted ? 'mute' : 'sound');
  const L = levelOf(save.xp);
  $('pLvl').textContent = L.lvl; $('pXp').style.width = (L.cur / L.need * 100) + '%'; $('pXpTxt').textContent = `${L.cur} / ${L.need}`;
  if (THUMB.portrait) $('pAvatar').src = THUMB.portrait({ ...save.equip, bat: undefined });
  $('chal').innerHTML = save.daily.list.map((c) => `<div><span>${c.text}</span>${c.prog >= c.goal ? '<span class="rew done">تم</span>' : `<span class="rew">+${c.rew} ${icon('coin')}</span>`}<div class="bar"><i style="width:${c.prog / c.goal * 100}%"></i></div></div>`).join('');
  const sel = selectedMode();
  $('modeName').textContent = sel.name; $('modeSub').textContent = sel.sub;
  $('modes').innerHTML = MODE_CHOICES.map((m) => `<button data-mode="${m.id}" aria-pressed="${m.id === flow.choice}"><b>${m.name}</b><span>${m.sub}</span></button>`).join('') + '<button disabled><b>مع أصحابك أونلاين</b><span>قريباً</span></button>';
}
const MODE_CHOICES = [
  { id: 'show', name: 'الشو', sub: '4 جولات ورا بعض، والتاج للي يكسب الأخيرة' },
  ...MODE_LIST.map((m) => ({ id: m.id, name: m.name, sub: m.team ? 'فريقين · ' + m.weapons : m.weapons })),
];
const selectedMode = () => MODE_CHOICES.find((m) => m.id === flow.choice) || MODE_CHOICES[0];
$('modeBtn').addEventListener('click', () => { sfx.click(); $('modes').hidden = !$('modes').hidden; });
$('modes').addEventListener('click', (e) => { const b = e.target.closest('[data-mode]'); if (!b) return; flow.choice = b.dataset.mode; store.set('choice', flow.choice); $('modes').hidden = true; sfx.click(); refreshMenu(); });
$('mSound').addEventListener('click', () => { save.muted = !save.muted; persist(); refreshMenu(); sfx.click(); });
document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => { sfx.click(); setTab(b.dataset.tab); }));
function setTab(k) {
  document.querySelectorAll('.tab').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.tab === k)));
  show('vPlay', k === 'play'); show('vLocker', k === 'wardrobe' || k === 'shop'); show('vBuild', k === 'build');
  $('modes').hidden = true; locker.preview = null;
  if (k === 'wardrobe' || k === 'shop') { locker.mode = k; renderLocker(); }
  lobby.view = (k === 'wardrobe' || k === 'shop') ? 'locker' : 'play';
  if (lobby.hero) heroDress();
}
// locker + shop share one panel
const locker = { mode: 'wardrobe', cat: 'skin', preview: null };
function dealsToday() {
  let x = [...today()].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7); const rnd = () => (x = (x * 1103515245 + 12345) >>> 0) / 4294967296;
  return ITEMS.filter((i) => !save.owned.includes(i.id)).map((i) => [rnd(), i]).sort((a, b) => a[0] - b[0]).slice(0, 8).map((p) => p[1]);
}
const pips = (n) => '<span class="pips">' + [1, 2, 3, 4, 5].map((k) => `<i class="${k <= n ? 'on' : ''}"></i>`).join('') + '</span>';
function renderLocker() {
  const isShop = locker.mode === 'shop';
  $('lkTitle').textContent = isShop ? 'الشوب' : 'الخزانة';
  $('lkSub').textContent = isShop ? 'عروض النهارده، بتتغير كل يوم' : 'غيّر لونك، والبس، واختار مضربك';
  $('cats').hidden = isShop;
  $('cats').innerHTML = CATS.map(([k, n]) => `<button data-cat="${k}" aria-pressed="${k === locker.cat}">${n}</button>`).join('');
  const list = isShop ? dealsToday() : ITEMS.filter((i) => i.slot === locker.cat);
  $('grid').innerHTML = !list.length ? '<p class="empty">اشتريت كل حاجة! استنى عروض بكرة.</p>' : list.map((it) => {
    const owned = save.owned.includes(it.id), on = save.equip[it.slot] === it.id;
    const tag = on ? '<span class="tag on">لابسه</span>' : owned ? '<span class="tag own">عندك</span>' : `<span class="tag">${icon('coin')}${it.price}</span>`;
    return `<button class="item${on ? ' on' : ''}${locker.preview === it.id ? ' sel' : ''}" data-id="${it.id}"><img alt="" src="${THUMB[it.id] || ''}"><span>${it.name}</span>${tag}</button>`;
  }).join('');
  const focus = ITEM[locker.preview] || (locker.cat === 'bat' && !isShop ? ITEM[save.equip.bat] : null);
  $('batInfo').hidden = !(focus && focus.slot === 'bat');
  if (focus && focus.slot === 'bat') $('batInfo').innerHTML = `<b>${focus.name}</b><span>${focus.desc}</span><div class="stats3"><div>قوة ${pips(focus.power)}</div><div>سرعة ${pips(focus.speed)}</div><div>مدى ${pips(focus.reach)}</div></div>`;
  const p = locker.preview && ITEM[locker.preview];
  $('buybar').hidden = !p;
  if (p) { $('buyName').textContent = p.name; const can = save.coins >= p.price; $('buyBtn').disabled = !can; $('buyBtn').textContent = can ? `اشتري بـ ${p.price}` : `محتاج ${p.price - save.coins} كمان`; }
}
function heroPreview() { const e = {}; if (locker.preview) { const p = ITEM[locker.preview]; e[p.slot] = p.id; } heroDress(e); }
$('cats').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; sfx.click(); locker.cat = b.dataset.cat; locker.preview = null; heroPreview(); renderLocker(); });
$('grid').addEventListener('click', (e) => {
  const b = e.target.closest('[data-id]'); if (!b) return;
  const it = ITEM[b.dataset.id]; sfx.click();
  if (save.owned.includes(it.id)) {
    locker.preview = null;
    if (!['skin', 'bat'].includes(it.slot) && save.equip[it.slot] === it.id) delete save.equip[it.slot]; else save.equip[it.slot] = it.id;
    persist();
  } else locker.preview = locker.preview === it.id ? null : it.id;
  heroPreview(); renderLocker(); fadeTo(it.slot === 'bat' ? 'Punch' : 'Wave'); refreshMenu();
});
$('buyBtn').addEventListener('click', () => {
  const it = ITEM[locker.preview]; if (!it || save.coins < it.price) return;
  save.coins -= it.price; save.owned.push(it.id); save.equip[it.slot] = it.id; locker.preview = null; persist();
  sfx.coin(); toast(`اشتريت ${it.name}`); fx.confetti(V(lobby.root.position.x, 3, lobby.root.position.z), 70);
  heroPreview(); renderLocker(); refreshMenu(); fadeTo('Yes');
});

// ---------------------------------------------------------------- show / round flow
const flow = { state: 'loading', choice: store.get('choice', 'show'), show: null, round: 0, t: 0, count: 0, flyT: 0, endT: 0, finishedCount: 0, coins: 0, bannerT: 0 };
const camPos = V(0, 6, 16), camLook = V(), camRay = new CANNON.RaycastResult();
function newShow(choice) {
  const n = choice === 'show' ? 10 : 8;
  const players = [{ name: 'إنت', equip: { ...save.equip }, isPlayer: true }];
  const names = [...NAMES].sort(() => Math.random() - 0.5);
  for (let i = 1; i < n; i++) players.push({ name: names[i % names.length], equip: randomEquip(), isPlayer: false });
  let rounds;
  if (choice === 'show') rounds = [{ m: 'race', q: 8 }, { m: pick(['stars', 'ball']) }, { m: pick(['cannons', 'climb', 'arena']), q: 3 }, { m: 'fall', q: 1 }];
  else if (choice === 'custom') rounds = [{ m: 'custom', q: 3 }];
  else { const md = MODES[choice]; rounds = [{ m: choice, q: md.kind === 'race' ? (choice === 'climb' ? 4 : 6) : md.kind === 'survival' ? 1 : null }]; }
  return { choice, players, rounds, coins: 0, place: null };
}
function startMatchmaking(choice) {
  sfx.unlock(); sfx.click();
  flow.show = newShow(choice); flow.round = 0;
  flow.state = 'mm'; flow.t = 0; lobby.view = 'mm';
  show('menu', false); show('mm', true);
  const n = flow.show.players.length;
  $('mmSlots').innerHTML = flow.show.players.map((p, i) => `<div class="slot" id="slot${i}"><img alt=""><span></span></div>`).join('');
  $('mmCount').textContent = `0 / ${n}`; $('mmTitle').textContent = 'بندوّر على لاعبين';
  $('mmTip').textContent = pick(['نصيحة: الغطس بيعدّي من تحت الأذرع اللي بتلف', 'نصيحة: أسهم السرعة الصفرا بتطيّرك لقدام', 'نصيحة: في الأرض بتقع، متقفش 3 ثواني في مكانك', 'نصيحة: المقلاية بتدوّخ اللي تخبطه', 'نصيحة: الصناديق الخشب بتتكسر، والحديد لأ']);
  flow.joinAt = flow.show.players.map((_, i) => (i === 0 ? 0.3 : 0.6 + i * rand(0.25, 0.55)));
  flow.joined = 0;
}
$('mmCancel').addEventListener('click', () => { sfx.click(); toMenu(); });
function updateMatchmaking(dt) {
  flow.t += dt;
  const pl = flow.show.players;
  while (flow.joined < pl.length && flow.t > flow.joinAt[flow.joined]) {
    const i = flow.joined++, p = pl[i], el = $('slot' + i);
    el.querySelector('img').src = THUMB.portrait(p.equip); el.querySelector('span').textContent = p.name; el.classList.add('in');
    if (p.isPlayer) el.classList.add('me');
    $('mmCount').textContent = `${flow.joined} / ${pl.length}`; sfx.join();
  }
  $('mmDots').textContent = '.'.repeat(1 + Math.floor(flow.t * 2) % 3);
  if (flow.joined >= pl.length && flow.t > flow.joinAt[pl.length - 1] + 0.9) { $('mmTitle').textContent = 'لقيناهم!'; $('mmDots').textContent = ''; if (flow.t > flow.joinAt[pl.length - 1] + 1.8) startRound(); }
}
function roundMode(i) { const rd = flow.show.rounds[i]; return rd.m === 'custom' ? customMode(getMap()) : MODES[rd.m]; }
function startRound() {
  const rd = flow.show.rounds[flow.round], md = roundMode(flow.round);
  show('mm', false); show('result', false); show('menu', false);
  cleanupRound();
  lobby.root.visible = false;
  G.modeObj = md; md.build();
  const parts = flow.show.players.filter((p) => !p.out);
  G.runners = parts.map((p, i) => {
    const team = md.team ? md.teamOf(i) : null;
    const r = new Runner({ i, isPlayer: p.isPlayer, equip: p.equip, team, name: p.name });
    r.part = p; const s = md.spawn(i, parts.length); r.reset(s.x, s.y ?? 0, s.z, s.facing ?? PI);
    if (md.bats) dress(r.model, r.equip, { bat: true });
    return r;
  });
  G.player = G.runners.find((r) => r.isPlayer);
  const q = rd.q ?? (md.team ? null : 1);
  flow.q = md.team ? null : Math.min(q, G.runners.length - 1);
  flow.finishedCount = 0; flow.coins = 0; flow.roundT = 0; flow.endT = 0; flow.done = false;
  ctl.yaw = (G.player?.facing ?? PI) + PI; ctl.pitch = 0.26;
  // intro card
  const total = flow.show.rounds.length;
  $('inRound').textContent = total > 1 ? (flow.round === total - 1 ? 'الجولة النهائية' : `الجولة ${flow.round + 1} من ${total}`) : 'جولة';
  $('inName').textContent = md.name; $('inDesc').textContent = md.desc;
  $('inGoal').textContent = md.team ? 'الفريق الكسبان يتأهل' : md.kind === 'race' ? `أول ${flow.q} يوصلوا يتأهلوا` : flow.q === 1 ? 'آخر واحد يفضل يكسب' : `آخر ${flow.q} يفضلوا يتأهلوا`;
  $('inWeap').textContent = md.weapons;
  $('inIcon').innerHTML = icon(md.icon || 'play');
  show('intro', true); show('hud', false);
  flow.state = 'fly'; flow.flyT = 0;
  const f = md.fly || [[0, 20, 20, 0, 0, 0]];
  camPos.set(f[0][0], f[0][1], f[0][2]); camLook.set(f[0][3], f[0][4], f[0][5]);
}
function beginPlay() {
  show('intro', false); show('hud', true);
  $('touch').hidden = !IS_TOUCH; $('keys').hidden = IS_TOUCH;
  flow.state = 'count'; flow.count = 3.6;
  buildHud();
}
function cleanupRound() {
  for (const r of G.runners) r.dispose(); G.runners = []; G.player = null;
  clearProjectiles(); G.level?.dispose(); G.level = null; G.modeObj = null;
  puffs.clear(); confetti.clear();
}
G.finish = (r) => {
  if (r.finished || flow.done) return;
  r.finished = true; r.place = ++flow.finishedCount; r.play(r.place === 1 ? 'Wave' : 'Yes', 0.2);
  if (r.weapon) dropWeapon(r);
  fx.confetti(V(r.pos.x, r.pos.y + 1, r.pos.z), r.isPlayer ? 140 : 30);
  if (r.isPlayer) { banner(r.place <= flow.q ? 'اتأهلت!' : 'متأخر شوية', r.place <= flow.q); sfx.win(); }
  if (flow.q && flow.finishedCount >= flow.q) setTimeout(() => G.endRound(), 900);
};
G.eliminate = (r) => {
  if (r.out) return;
  r.eliminate(); fx.dust(V(r.pos.x, r.pos.y, r.pos.z), 6, 0xffffff, 3);
  if (r.isPlayer) { banner('خرجت!', false); sfx.lose(); }
  const left = G.runners.filter((o) => !o.out).length;
  if (flow.q && left <= flow.q) setTimeout(() => G.endRound(), 900);
  else if (r.isPlayer && flow.show.rounds.length) setTimeout(() => { if (!flow.done && G.player?.out) G.endRound(); }, 1800);
};
G.endRound = () => {
  if (flow.done || !G.modeObj) return;
  flow.done = true;
  const md = G.modeObj, rd = flow.show.rounds[flow.round];
  let qualified;
  if (md.team) { const w = md.winners(); qualified = G.runners.filter((r) => r.team === w); flow.winTeam = w; }
  else if (md.kind === 'race') qualified = G.runners.filter((r) => r.finished).sort((a, b) => a.place - b.place).slice(0, flow.q);
  else { const al = G.runners.filter((r) => !r.out); qualified = al.length ? al : []; }
  const qset = new Set(qualified.map((r) => r.part));
  for (const p of flow.show.players) if (!p.out && !qset.has(p)) p.out = true;
  const me = flow.show.players[0], won = !me.out;
  const last = flow.round === flow.show.rounds.length - 1;
  const earned = flow.coins + (won ? 20 + (last ? 60 : 0) : 5);
  flow.show.coins += earned; save.coins += earned; save.xp += won ? 35 : 12;
  if (won) track('qualify');
  if (won && last && (qualified.length === 1 || flow.show.rounds.length > 1)) save.wins += 1;
  persist();
  setTimeout(() => showResult(won, last, qualified, earned), 700);
};
function showResult(won, last, qualified, earned) {
  flow.state = 'result';
  const md = G.modeObj;
  const crown = won && last && flow.show.rounds.length > 1;
  $('rTitle').textContent = crown ? 'كسبت التاج!' : won ? (last ? 'كسبت!' : 'اتأهلت!') : 'خرجت المرة دي';
  $('rTitle').className = won ? 'win' : 'lose';
  $('rSub').textContent = md.team ? `فريق ${flow.winTeam === 'red' ? 'الأحمر' : 'الأزرق'} كسب ${md.hud().red} - ${md.hud().blue}` : `${qualified.length} اتأهلوا من ${G.runners.length}`;
  $('rList').innerHTML = qualified.slice(0, 10).map((r) => `<span class="${r.isPlayer ? 'me' : ''}"><img alt="" src="${THUMB.portrait(r.part.equip)}">${r.isPlayer ? 'إنت' : r.name}</span>`).join('');
  $('rCoins').textContent = earned;
  $('rNext').textContent = won && !last ? 'الجولة الجاية' : 'العب تاني';
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
  flow.state = 'menu'; lobby.view = 'play'; lobby.root.visible = true;
  for (const id of ['hud', 'result', 'pause', 'big', 'mm', 'intro', 'bui', 'banner', 'xhair']) show(id, false);
  show('menu', true); setTab('play'); refreshMenu(); fadeTo('Wave');
  const g = lobby.root.position; camPos.set(g.x, g.y + 3, g.z + 9); camLook.set(g.x, g.y + 1.3, g.z);
  if (!save.gift) { save.gift = true; save.coins += 300; persist(); refreshMenu(); setTimeout(() => toast('هدية البداية: 300 عملة للشوب'), 700); }
}
function togglePause(force) { if (flow.state !== 'play') return; G.paused = force ?? !G.paused; show('pause', G.paused); }
$('hPause').addEventListener('click', () => togglePause(true));
$('pResume').addEventListener('click', () => togglePause(false));
$('pQuit').addEventListener('click', () => { G.paused = false; sfx.click(); toMenu(); });
$('playBtn').addEventListener('click', () => startMatchmaking(flow.choice));
document.addEventListener('visibilitychange', () => { if (document.hidden && flow.state === 'play') togglePause(true); });
function banner(text, good) { const b = $('banner'); b.textContent = text; b.className = good ? 'good' : 'bad'; b.hidden = false; flow.bannerT = 2; }

// ---------------------------------------------------------------- HUD
function buildHud() {
  const md = G.modeObj;
  show('hTeam', !!md.team); show('hPlaceBox', !md.team); show('prog', md.kind === 'race');
  const prog = $('prog'); prog.querySelectorAll('i').forEach((x) => x.remove());
  if (md.kind === 'race') G.runners.forEach((r) => { const d = document.createElement('i'); if (r.isPlayer) d.className = 'me'; prog.appendChild(d); r.dot = d; });
  $('hCoins').textContent = 0;
  $('bFire').hidden = !md.bats;
  $('bFire').innerHTML = md.bats ? icon('bat') : icon('fire');
}
function updateHud() {
  const md = G.modeObj, p = G.player; if (!md || !p) return;
  if (md.team) { const h = md.hud(); $('hRed').textContent = h.red; $('hBlue').textContent = h.blue; $('hTime').textContent = Math.max(0, Math.ceil(h.time)); }
  else if (md.kind === 'race') {
    const order = [...G.runners].filter((r) => !r.out).sort((a, b) => (a.finished && b.finished ? a.place - b.place : a.finished ? -1 : b.finished ? 1 : (md.progress(b) - md.progress(a))));
    $('hPlace').textContent = `${order.indexOf(p) + 1}/${order.length}`; $('hPlaceLbl').textContent = `ترتيبك · أول ${flow.q} يتأهلوا`;
    for (const r of G.runners) if (r.dot) r.dot.style.right = (md.progress(r) * 100) + '%';
  } else {
    const left = G.runners.filter((r) => !r.out).length;
    $('hPlace').textContent = left; $('hPlaceLbl').textContent = md.time != null ? `فاضلين · ${Math.max(0, Math.ceil(md.time))} ث` : 'فاضلين';
  }
  const w = p.weapon;
  show('wChip', !!w);
  if (w) { $('wName').textContent = WEAPONS[w.id].name; $('wAmmo').textContent = '×' + w.ammo; }
  if (!md.bats && IS_TOUCH) $('bFire').hidden = !w;
  if (!w && lockMark) lockMark.visible = false;
}

// ---------------------------------------------------------------- camera during play
function playCam(dt) {
  const narrow = innerWidth < innerHeight;
  let tgt = G.player;
  if (!tgt || tgt.out) tgt = G.runners.find((r) => !r.out) || tgt;
  if (!tgt) return;
  const p = tgt.pos, dist = narrow ? 4.6 : 3.9;
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
  if (flow.flyT > T + 1.2) beginPlay();
}

// ---------------------------------------------------------------- step the round
function stepRound(dt) {
  G.t += dt;
  const md = G.modeObj;
  if (flow.state === 'count') {
    const before = Math.ceil(flow.count - 0.6); flow.count -= dt; const now = Math.ceil(flow.count - 0.6);
    const big = $('big');
    if (flow.count > 0.6) { big.hidden = false; big.textContent = Math.max(1, now); if (now !== before) sfx.beep(); }
    else if (flow.count > 0) { if (big.textContent !== 'يلا!') { big.textContent = 'يلا!'; sfx.go(); } }
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
    fx.burst(c.obj.position.clone(), 0xffd23f, 8, 4); sfx.coin(); track('coins');
  }
  if (live && md.kind === 'race' && flow.roundT > 160 && !flow.done) G.endRound();
  flow.roundT += live ? dt : 0;
  updateHud();
}

// ---------------------------------------------------------------- build mode UI
function openBuild() {
  cleanupRound(); flow.state = 'build'; lobby.root.visible = false;
  show('menu', false); show('bui', true); show('hud', false);
  editor.open(); renderPalette();
}
function renderPalette() {
  $('bPal').innerHTML = PIECES.map((p) => `<button data-t="${p.t}" class="${editor.sel === p.t && !editor.erase ? 'on' : ''}"><img alt="" src="${THUMB['piece:' + p.t] || ''}"><span>${p.name}</span></button>`).join('');
  $('bErase').classList.toggle('on', editor.erase);
  const r = ['لقدام', 'يمين', 'لورا', 'شمال'][editor.rot]; $('bRot').querySelector('span').textContent = r;
}
$('bPal').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (!b) return; editor.sel = b.dataset.t; editor.erase = false; sfx.click(); renderPalette(); });
$('bRot').addEventListener('click', () => { editor.rot = (editor.rot + 1) % 4; sfx.click(); renderPalette(); });
$('bErase').addEventListener('click', () => { editor.erase = !editor.erase; sfx.click(); renderPalette(); });
$('bClear').addEventListener('click', () => { if ($('bClear').dataset.arm) { editor.clear(); delete $('bClear').dataset.arm; $('bClear').querySelector('span').textContent = 'امسح الكل'; toast('اتمسح'); } else { $('bClear').dataset.arm = 1; $('bClear').querySelector('span').textContent = 'متأكد؟'; setTimeout(() => { delete $('bClear').dataset.arm; $('bClear').querySelector('span').textContent = 'امسح الكل'; }, 2500); } });
$('bReset').addEventListener('click', () => { editor.reset(); sfx.click(); toast('رجعت الماب الأصلي'); });
$('bTest').addEventListener('click', () => {
  const c = editor.check();
  if (!c.start || !c.finish) { toast(!c.start ? 'حط قطعة البداية الأول' : 'حط قطعة النهاية الأول'); return; }
  editor.close(); show('bui', false);
  flow.show = { choice: 'custom', players: [{ name: 'إنت', equip: { ...save.equip }, isPlayer: true }, ...NAMES.slice(0, 3).map((n) => ({ name: n, equip: randomEquip(), isPlayer: false }))], rounds: [{ m: 'custom', q: 3 }], coins: 0 };
  flow.round = 0; startRound();
});
$('bBack').addEventListener('click', () => { sfx.click(); toMenu(); });
$('bEdit').addEventListener('click', () => { sfx.click(); openBuild(); });
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
  if (flow.state === 'menu' || flow.state === 'mm') { updateLobby(dt); if (flow.state === 'mm') updateMatchmaking(dt); lobbyCam(dt); }
  else if (flow.state === 'fly') flyCam(dt);
  else if ((flow.state === 'count' || flow.state === 'play' || flow.state === 'result') && !G.paused && G.modeObj) { stepRound(dt); playCam(dt); }
  else if (flow.state === 'build') { editor.updateCamera(dt); }
  if (!G.paused) { puffs.update(dt); confetti.update(dt); }
  toast.update(dt);
  if (flow.bannerT > 0) { flow.bannerT -= dt; if (flow.bannerT <= 0) show('banner', false); }
  sky.position.copy(camera.position);
  renderer.render(scene, camera);
}

// ---------------------------------------------------------------- boot
(async () => {
  try { await loadAssets((k) => { $('loadbar').style.width = Math.round(k * 100) + '%'; }); }
  catch (e) { (window.__bdFail || ((m) => { $('loadtxt').textContent = m; }))('الموديلات مش راضية تحمّل (' + (e?.message || e) + ')'); console.error(e); return; }
  computeBoneFix();
  try { makeThumbs(); pieceThumbs(); } catch (e) { console.warn('thumbnails failed', e); }
  buildLobby();
  show('loading', false);
  toMenu();
  frame();
  window.__boltdash = { G, flow, ctl, MODES, camera, renderer, scene, giveWeapon, startRound, startMatchmaking, toMenu, openBuild, editor, sim(sec, hook) { for (let i = 0; i < sec * 60; i++) { hook && hook(i / 60); if (flow.state === 'fly') { flow.flyT = 99; flyCam(1 / 60); } if (flow.state === 'count' || flow.state === 'play') { stepRound(1 / 60); playCam(1 / 60); } } } };
})();
