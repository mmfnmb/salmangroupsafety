// The open world ("life"): a city island you walk and drive around. Shops with 100 foods and 50 drinks,
// homes to buy (furnished or empty) and furnish, jobs (delivery, taxi, shop, thief, police), crime that
// catches up with you, permadeath with a revenge file, travel to 8 nations, businesses and fame.
// The city's models live in separate packs (world/*.pack) and load only when you enter the world.
import { THREE, CANNON, M, G, V, PI, rand, pick, clamp, damp, scene, camera, renderer, save, persist, store, sfx, fx, toast, place, instanced, hemi, sun, sky, sea } from './core.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { t } from './i18n.js';
import { Level } from './level.js';
import { MODES } from './modes.js';
import { City, Traffic, Walkers, Minimap, carStep, carSize, wrap, segOK, HALF, CAR_S, R, P } from './city.js';
import { ITEM, dress, makePet } from './cosmetics.js';

// ---------------------------------------------------------------- packs
const PACKS = ['city-kit-commercial', 'city-kit-suburban', 'city-kit-industrial', 'city-kit-roads', 'street-props', 'car-kit', 'food-kit', 'mini-market', 'furniture-kit'];
const packData = {}; let packsReady = null;
const gl = new GLTFLoader();
async function loadPacks(onProgress) {
  if (packsReady) return packsReady;
  packsReady = (async () => {
    let n = 0;
    await Promise.all(PACKS.map(async (k) => {
      // packs are stored as base64 text (the host only serves text and media types)
      const b64 = (await (await fetch(`./world/${k}.pack.txt`)).text()).trim(); let buf;
      // the browser decodes the base64 itself (fast, and the menu keeps running smoothly); old browsers do it by hand
      try { buf = await (await fetch('data:application/octet-stream;base64,' + b64)).arrayBuffer(); } catch { const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); buf = u8.buffer; }
      const len = new DataView(buf).getUint32(0, true), idx = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, len)));
      packData[k] = { buf, base: 4 + len, idx }; onProgress?.(++n / PACKS.length);
    }));
  })();
  return packsReady;
}
// get the open world ready in the background while you are in the menu: packs first, then the models a few at a
// time with pauses, so the menu never stutters. Entering the world later is then instant.
let prefetching = null;
export function prefetchWorld(onProgress) {
  if (prefetching) return prefetching;
  prefetching = (async () => {
    await loadPacks((f) => onProgress?.(f * 0.5));
    const list = WORLD_MODELS.filter((n) => !M['w/' + n]);
    for (let i = 0; i < list.length; i += 4) { await need(list.slice(i, i + 4)); onProgress?.(0.5 + 0.5 * Math.min(1, (i + 4) / list.length)); await new Promise((r) => setTimeout(r, 25)); }
    onProgress?.(1);
  })().catch(() => { prefetching = null; });
  return prefetching;
}
// parse one model from a pack into M['w/<name>'] so place() and instanced() can use it
async function need(names) {
  await Promise.all(names.map((full) => {
    const key = 'w/' + full; if (M[key]) return null;
    const [k, n] = full.split('/'), p = packData[k]; const e = p?.idx[n]; if (!e) return null;
    return new Promise((res) => gl.parse(p.buf.slice(p.base + e[0], p.base + e[0] + e[1]), '', (g) => { g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); M[key] = g; res(); }, () => res()));
  }));
}
const W = (k, n) => 'w/' + k + '/' + n;

// ---------------------------------------------------------------- catalogue: food, drinks, homes, nations, jobs
const FOODK = 'food-kit';
const FOODS = ['burger', 'burger-cheese', 'burger-double', 'burger-cheese-double', 'sandwich', 'sub', 'hot-dog', 'corn-dog', 'taco', 'pizza', 'fries', 'chinese', 'dim-sum', 'maki-salmon', 'maki-roe', 'maki-vegetable', 'sushi-salmon', 'sushi-egg', 'rice-ball', 'skewer', 'skewer-vegetables', 'meat-cooked', 'meat-ribs', 'meat-sausage', 'sausage', 'frikandel-speciaal', 'turkey', 'whole-ham', 'fish', 'mussel-open', 'egg-cooked', 'pancakes', 'waffle', 'croissant', 'loaf', 'loaf-round', 'loaf-baguette', 'bread', 'bowl-soup', 'bowl-broth', 'bowl-cereal', 'salad', 'pan-stew', 'pot-stew', 'tajine', 'pie', 'mincemeat-pie', 'cake', 'cake-birthday', 'cupcake', 'muffin', 'donut', 'donut-chocolate', 'donut-sprinkles', 'cookie', 'cookie-chocolate', 'ginger-bread', 'chocolate', 'candy-bar', 'lollypop', 'pudding', 'sundae', 'ice-cream', 'ice-cream-cup', 'ice-cream-scoop-chocolate', 'ice-cream-scoop-mint', 'popsicle', 'popsicle-chocolate', 'whipped-cream', 'honey', 'peanut-butter', 'cheese', 'apple', 'banana', 'orange', 'pear', 'grapes', 'cherries', 'strawberry', 'watermelon', 'pineapple', 'coconut', 'lemon', 'avocado', 'tomato', 'carrot', 'corn', 'broccoli', 'cauliflower', 'mushroom', 'eggplant', 'paprika', 'onion', 'pumpkin', 'radish', 'cabbage', 'beet', 'leek', 'celery-stick', 'bacon'];
const SWEET = /cake|cupcake|muffin|donut|cookie|ginger|chocolate|candy|lolly|pudding|sundae|ice-cream|popsicle|whipped|honey|pancakes|waffle/;
const FRUIT = /apple|banana|orange|pear|grapes|cherries|strawberry|watermelon|pineapple|coconut|lemon|avocado/;
const VEG = /tomato|carrot|corn$|broccoli|cauliflower|mushroom|eggplant|paprika|onion|pumpkin|radish|cabbage|beet|leek|celery|salad/;
const foodKind = (n) => (SWEET.test(n) ? 'jump' : FRUIT.test(n) ? 'speed' : VEG.test(n) ? 'grip' : 'power');
const nice = (n) => n.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const FOOD = FOODS.map((n, i) => ({ id: 'f:' + n, model: n, name: t(nice(n)), price: 20 + (i % 9) * 10, kind: foodKind(n), heavy: !SWEET.test(n) && !FRUIT.test(n) && !VEG.test(n) }));
// drinks: a handful of bottle/can/cup models, many drinks (generic names, no real brands)
const DRINK_NAMES = [['Cola', 'soda-can', 'speed'], ['Diet Cola', 'can-small', 'speed'], ['Lemon Soda', 'soda-bottle', 'speed'], ['Orange Fizz', 'soda-can', 'speed'], ['Grape Fizz', 'soda', 'speed'], ['Cherry Pop', 'soda-glass', 'speed'], ['Ginger Ale', 'can', 'speed'], ['Root Beer', 'soda-bottle', 'power'], ['Cream Soda', 'soda-glass', 'jump'], ['Sparkling Water', 'soda-bottle', 'grip'],
  ['Orange Juice', 'carton', 'speed'], ['Apple Juice', 'carton-small', 'speed'], ['Mango Juice', 'carton', 'speed'], ['Guava Juice', 'carton-small', 'speed'], ['Strawberry Juice', 'glass', 'speed'], ['Lemonade', 'glass', 'speed'], ['Mint Lemonade', 'glass', 'grip'], ['Watermelon Juice', 'glass', 'speed'], ['Sugarcane Juice', 'glass', 'power'], ['Sobia', 'glass', 'jump'],
  ['Tamarind', 'glass', 'grip'], ['Licorice', 'glass', 'grip'], ['Hibiscus', 'glass', 'speed'], ['Dates Milk', 'carton-small', 'power'], ['Milk', 'carton', 'power'], ['Chocolate Milk', 'carton-small', 'jump'], ['Strawberry Milk', 'carton-small', 'jump'], ['Banana Milk', 'carton-small', 'power'], ['Yogurt Drink', 'carton-small', 'grip'], ['Smoothie', 'frappe', 'speed'],
  ['Milkshake', 'frappe', 'jump'], ['Frappe', 'frappe', 'recover'], ['Iced Coffee', 'frappe', 'recover'], ['Coffee', 'cup-coffee', 'recover'], ['Espresso', 'cup-saucer', 'recover'], ['Turkish Coffee', 'cup-saucer', 'recover'], ['Latte', 'mug', 'recover'], ['Cappuccino', 'mug', 'recover'], ['Hot Chocolate', 'mug', 'jump'], ['Tea', 'cup-tea', 'recover'],
  ['Mint Tea', 'cup-tea', 'grip'], ['Green Tea', 'cup-tea', 'grip'], ['Anise', 'cup-tea', 'grip'], ['Sahlab', 'mug', 'power'], ['Iced Tea', 'glass', 'speed'], ['Energy Bolt', 'can', 'speed'], ['Energy Bolt Zero', 'can-small', 'recover'], ['Sports Drink', 'soda-bottle', 'recover'], ['Coconut Water', 'coconut-half', 'grip'], ['Dizzy Drink', 'cocktail', 'dizzy']];
const DRINK = DRINK_NAMES.map(([name, model, kind], i) => ({ id: 'd:' + i, model, name: t(name), price: 15 + (i % 7) * 8, kind }));
const BUFF_TXT = () => ({ power: t('Hits harder in your next match'), jump: t('Jumps higher in your next match'), speed: t('Runs faster in your next match'), grip: t('Slips less in your next match'), recover: t('Gets up faster in your next match'), dizzy: t('Everything spins for a while') });
export const NATIONS = [
  { id: 'azuria', name: 'Azuria', col: 0x3d8bff, game: 'football' }, { id: 'auria', name: 'Auria', col: 0xd4a017, game: 'race' },
  { id: 'sunland', name: 'Sunland', col: 0xffd23f, game: 'golf' }, { id: 'terrano', name: 'Terrano', col: 0x7a4a2a, game: 'climb' },
  { id: 'noira', name: 'Noira', col: 0x1e1e24, game: 'volley' }, { id: 'frostia', name: 'Frostia', col: 0xff7a1a, game: 'puck' },
  { id: 'grisia', name: 'Grisia', col: 0x8a90a0, game: 'fall' }, { id: 'islar', name: 'Islar', col: 0x2ec4a0, game: 'paint' },
];
const FURN = ['loungeSofa', 'loungeSofaCorner', 'loungeChair', 'tableCoffee', 'televisionModern', 'cabinetTelevision', 'bedDouble', 'bedSingle', 'kitchenFridge', 'kitchenStove', 'kitchenSink', 'kitchenCabinet', 'table', 'chair', 'bookcaseOpen', 'lampRoundFloor', 'rugRectangle', 'pottedPlant', 'plantSmall1', 'desk', 'chairDesk', 'computerScreen', 'speaker', 'radio', 'bathtub', 'toilet', 'washer', 'sideTable', 'coatRackStanding', 'bear'];
const furnPrice = (n) => 60 + (n.length % 7) * 40;
const FURNISHED = [['rugRectangle', -2.8, 0.2, 0], ['loungeSofa', -2.8, 2.0, PI], ['tableCoffee', -2.8, 0.2, 0], ['cabinetTelevision', -2.8, -3.9, 0], ['televisionModern', -2.8, -3.9, 0, 1.0], ['bedDouble', 2.6, -2.6, 0], ['sideTable', 4.7, -3.8, 0], ['kitchenFridge', 4.8, 3.9, -PI / 2], ['kitchenStove', 4.8, 2.3, -PI / 2], ['kitchenSink', 4.8, 0.8, -PI / 2], ['pottedPlant', -4.9, 4.4, 0], ['lampRoundFloor', -4.9, -3.9, 0], ['bookcaseOpen', 0, -3.9, 0]];
const LOOT = ['laptop', 'radio', 'televisionVintage', 'speakerSmall', 'computerScreen'];
const LIGHT = /laptop|radio|books|speaker|plant|lamp|computer|television|pillow|bear|chair$|chairDesk|toaster|Blender|cardboard|rug|sideTable|coatRack|trashcan|CoffeeMachine|Microwave/;

// ---------------------------------------------------------------- persistent life state
const life = save.life = save.life || store.get('life', null) || { name: 'Bolt', cash: 0, homes: {}, furn: [], buff: null, fame: 0, hall: [], revenge: null, wanted: 0, evidence: 0, nation: 'azuria', biz: {}, gift: false, deaths: 0 };
const saveLife = () => { store.set('life', life); persist(); };
export function lifeBuff() { return life.buff; }
// called by the game when a match starts: the food/drink you had is used up
export function useBuff() { const b = life.buff; if (!b) return null; life.buff = null; saveLife(); return b; }

// ---------------------------------------------------------------- city layout (see city.js)
let ctx = null; // hooks from main.js (flow, show, $, startRound, toMenu, heroDress, refreshMenu)
export function initWorld(c) { ctx = c; }
const ROLE_COLOR = { 'shop:food': '#ff8a3d', 'shop:drink': '#3db8ff', 'shop:clothes': '#ff5fb8', 'shop:furniture': '#b07a4a', estate: '#3ddc84', police: '#2f6bff', stadium: '#ff3d3d', depot: '#a46bff', airport: '#ffffff', bank: '#ffd23f', gym: '#ff6b00', hospital: '#ff4d6d', dealer: '#00c2a8', race: '#111111' };
const CARS_FOR_SALE = [['sedan', 1500, 27], ['hatchback-sports', 4000, 30], ['suv-luxury', 6000, 28], ['sedan-sports', 8000, 32], ['race', 15000, 36], ['race-future', 25000, 40]];

const world = {
  id: 'world', name: t('The World'), short: t('World'), kind: 'world', icon: 'flag', hidden: true,
  desc: t('Live in the city: eat, work, buy a home, travel'), weapons: t('Your bat'),
  get lots() { return this.city ? this.city.lots : []; },
  get doors() { return this.city ? this.city.doors : []; },
  get homes() { return this.city ? this.city.homes : []; },
  get cams() { return this.city ? this.city.cams : []; },
  get parked() { return this.city ? this.city.parked : []; },
  build() {
    const L = new Level({ killY: -20 }); G.level = L; this.L = L; this.city = null;
    const nat = NATIONS.find((n) => n.id === life.nation) || NATIONS[0]; this.nat = nat;
    this.ground = L.box(0, -1, 0, 400, 1, 400); // the ground under you (it follows you: the city never ends)
    const city = new City(L, 7 + Math.max(0, NATIONS.indexOf(nat)) * 101, nat.id); const s0 = this.spawn(); this.city = city; this.st = city.st;
    city.update(s0.x, s0.z, true); this.st.update(0, s0.x, s0.z, true);
    this.cars = []; // cars that are out of their parking spot (yours, or stolen)
    this.traffic = new Traffic(L, this.st, 24);
    // people walking on the pavements
    this.npcs = [];
    for (let k = 0; k < 22; k++) { const o = place('Character', 0, -50, 0, 0.42, 0, L.root); const eq = { skin: pick(['skin-straw', 'skin-mint', 'skin-lemon', 'skin-grape', 'skin-orange', 'skin-melon', 'skin-snow', 'skin-night', 'skin-blue']), head: Math.random() < 0.5 ? pick(['h-crown', 'h-cone', 'h-wizard', 'h-knight']) : undefined, back: Math.random() < 0.3 ? 'k-pack' : undefined }; dress(o, eq); this.npcs.push({ o, mixer: new THREE.AnimationMixer(o), clips: M.Character.animations, sp: rand(1.1, 1.7), seen: 0 }); }
    this.walkers = new Walkers(city, this.npcs);
    this.walkers.onPunch = () => { if (this.driving || this.inside) return; this.hp -= 8; this.killer = t('an angry man'); sfx.hit?.(); G.player.stun?.(0.3); fx.burst(V(G.player.pos.x, 1.2, G.player.pos.z), 0xffffff, 8, 4); };
    // the statue of the most famous player, in the park in the middle of the city
    this.statue = place('Character', 0, 3, 0, 1.4, PI, L.root); dress(this.statue, { skin: 'film-gold' }); L.model(W('city-kit-roads', 'tile-high'), 0, 0, 0, 4); L.box(0, 1.5, 0, 2, 1.5, 2);
    this.coinObjs = new Map(); life.found = life.found || []; life.cars = life.cars || []; life.str = life.str || 0;
    this.mini = new Minimap(city); camera.far = 290; camera.updateProjectionMatrix();
    this.fly = [[0, 60, 90, 0, 0, 0]];
    this.t = 0; this.day = 0.3; this.driving = null; this.job = null; this.inside = null; this.hp = 100; this.dizzy = 0; this.policeT = 0; this.police = []; this.camDist = 0;
  },
  spawn() { const h = Object.keys(life.homes).find((id) => life.homes[id].pos), pos = h && life.homes[h].pos; if (pos) return { x: pos.x, y: 0.5, z: pos.z, facing: Math.atan2(-pos.nx, -pos.nz) }; return { x: 0, y: 0.5, z: 18, facing: PI }; },
  playerSpeed() { return this.driving ? 0 : 1; },
  hudInfo() { const d = this.driving; return { value: '💰' + save.coins, label: '❤ ' + Math.round(this.hp) + ' · ' + '★'.repeat(life.wanted) + '☆'.repeat(5 - life.wanted) + (d ? ' · ' + Math.round(Math.abs(d.v) * 3.6) + ' km/h' : '') + (this.job ? ' · ' + this.job.text : '') }; },
  onFall(r) { const s = this.spawn(); r.reset(s.x, 1, s.z, s.facing); },
  target(r) { return { x: r.pos.x, z: r.pos.z, stop: true }; },
  onFire(r) { if (this.driving) return; r.swing(); this.hitNear(r); },
  update(dt) {
    const p = G.player; if (!p) return; this.t += dt; const pp = p.pos;
    // day and night (a full day lasts 8 minutes)
    this.day = (this.day + dt / 480) % 1; const sunUp = Math.max(0, Math.sin(this.day * PI * 2));
    if (!this.inside) { hemi.intensity = 0.3 + sunUp * 0.8; sun.intensity = 0.2 + sunUp * 1.9; scene.fog.color.setHSL(0.58, 0.45, 0.12 + sunUp * 0.5); scene.fog.near = 70; scene.fog.far = 270; }
    if (!this.inside) { this.city.update(pp.x, pp.z); this.ground.position.x = Math.round(pp.x / 40) * 40; this.ground.position.z = Math.round(pp.z / 40) * 40; }
    this.st.update(dt, pp.x, pp.z); this.coinsUpdate(dt, pp);
    // traffic and people
    const live = this.traffic.cars.filter((c) => c.live), cars = [...live, ...this.police, ...this.cars];
    this.traffic.update(dt, this.t, pp, cars, this.driving || this.inside ? null : pp, this.police);
    this.walkers.update(dt, pp, this.driving || this.inside ? null : pp, p.body.velocity);
    this.hitCd = Math.max(0, (this.hitCd || 0) - dt);
    if (!this.driving && !this.inside && this.hitCd <= 0) for (const c of live) {
      const fx_ = Math.sin(c.h), fz = Math.cos(c.h), rx = pp.x - c.x, rz = pp.z - c.z;
      if (c.v > 4 && Math.abs(rx * fx_ + rz * fz) < c.hl + 0.4 && Math.abs(rx * fz - rz * fx_) < c.hw + 0.4) { this.hp -= 25; this.hitCd = 1.2; this.killer = t('a car'); sfx.hit?.(); p.tumble?.(V(fx_ * 9, 7, fz * 9)); }
    }
    if (this.driving) this.drive(dt, p, cars); else this.camDist = 0;
    for (const c of this.cars) if (c !== this.driving && c.body) { c.body.position.set(c.x, 1, c.z); c.body.quaternion.setFromEuler(0, c.h, 0); }
    // interaction prompt
    const near = this.nearest(p); ctx.showAct(near ? near.label : null);
    if (this.dizzy > 0) { this.dizzy -= dt; p.confuse(0.2); }
    this.carryUpdate(dt, p); this.jobUpdate(dt, p); this.crimeUpdate(dt, p); this.bizUpdate(dt);
    if (!this.inside) this.mini.draw(dt, { x: pp.x, z: pp.z, facing: this.driving ? this.driving.h : p.facing }, ctx.ctl?.yaw || 0, this.marks());
    if (this.hp <= 0) this.die(this.killer || t('a car'));
  },
  // hidden golden coins: one in some blocks, found ones are remembered
  coinsUpdate(dt, pp) {
    const live = new Set();
    for (const c of this.city.coins) {
      if (life.found.includes(c.id)) continue; live.add(c.id); let o = this.coinObjs.get(c.id);
      if (!o) { o = place('Coin', c.x, 1.3, c.z, 1.4, 0, this.L.root); this.coinObjs.set(c.id, o); }
      o.rotation.y += dt * 3; o.position.y = 1.3 + Math.sin(this.t * 2 + c.x) * 0.2;
      if (!this.inside && Math.hypot(pp.x - c.x, pp.z - c.z) < (this.driving ? 3 : 1.8)) { life.found.push(c.id); save.coins += 100; saveLife(); sfx.coin(); fx.burst(o.position.clone(), 0xffd23f, 16, 6); toast(t('Hidden coin! +100 ({n} found)', { n: life.found.length }), 2.5); }
    }
    for (const [id, o] of this.coinObjs) if (!live.has(id)) { o.removeFromParent(); this.coinObjs.delete(id); }
  },
  marks() {
    const m = [], pp = G.player.pos;
    for (const l of this.lots) if (l.role && Math.hypot(l.door.x - pp.x, l.door.z - pp.z) < 150) m.push({ x: l.door.x, z: l.door.z, c: ROLE_COLOR[l.role], r: 8 });
    for (const id of Object.keys(life.homes)) { const q = life.homes[id].pos; if (q) m.push({ x: q.x, z: q.z, c: '#3ddc84', r: 11 }); }
    for (const c of this.police) m.push({ x: c.x, z: c.z, c: this.t % 0.5 < 0.25 ? '#ff2d2d' : '#2f6bff', r: 9 });
    const j = this.job; if (j?.pts) { const q = j.pts[j.k]; if (q) m.push({ x: q[0], z: q[1], c: '#ffd23f', r: 12 }); } else if (j?.mark) m.push({ x: j.mark.position.x, z: j.mark.position.z, c: '#ffd23f', r: 12 }); if (j?.thief) m.push({ x: j.thief.position.x, z: j.thief.position.z, c: '#111', r: 10 });
    if (this.revengeTarget && !this.revengeTarget.dead) m.push({ x: this.revengeTarget.o.position.x, z: this.revengeTarget.o.position.z, c: '#000', r: 10 });
    return m;
  },
  drive(dt, p, cars) {
    const c = this.driving, inp = p.input, m = Math.min(1, Math.hypot(inp.x, inp.z)); let wantH = null, thr = 0, brake = false;
    if (m > 0.15) { const th = Math.atan2(inp.x, inp.z), diff = wrap(th - c.h); if (Math.abs(diff) < 1.9) { wantH = th; thr = m; } else if (c.v > 1.5) brake = true; else { wantH = wrap(th + PI); thr = -m; } }
    const crash = carStep(c, wantH, thr, brake || p.jumpBuf > 0, dt, this.st, cars);
    if (crash > 6) { sfx.hit?.(); fx.burst(V(c.x - Math.sin(c.h) * c.hl * -1, 1, c.z + Math.cos(c.h) * c.hl), 0xdddddd, 12, 5); if (crash > 14) { this.hp -= Math.round(crash / 3); this.killer = t('a car crash'); } }
    // running people over is a crime
    if (Math.abs(c.v) > 3) for (const n of this.npcs) if (n.state !== 'down' && Math.hypot(n.o.position.x - c.x, n.o.position.z - c.z) < c.hl + 0.3) { this.walkers.knock(n, Math.sin(c.h), Math.cos(c.h)); this.walkers.scare(c.x, c.z, 25); this.crime(2, this.witnessed()); }
    const rv = this.revengeTarget; if (rv && !rv.dead && Math.abs(c.v) > 6 && Math.hypot(rv.o.position.x - c.x, rv.o.position.z - c.z) < c.hl) { rv.hp = 0; rv.dead = true; rv.o.rotation.x = -PI / 2; life.revenge = null; save.coins += 1500; saveLife(); toast(t('Revenge! +1500 coins'), 3); }
    c.o.position.set(c.x, 0, c.z); c.o.rotation.y = c.h; if (c.body) c.body.position.set(0, -50, 0);
    p.body.position.set(c.x, this.driveY, c.z); p.body.velocity.set(0, 0, 0); p.facing = c.h; p.root.visible = false;
    // the camera swings round behind the car unless you are turning it yourself
    const ct = ctx.ctl; if (ct && Math.abs(c.v) > 2 && performance.now() - (ct.dragT || 0) > 1500) ct.yaw = c.h + PI + wrap(ct.yaw - c.h - PI) * Math.exp(-dt * 2.5);
    this.camDist = 8.5;
  },
  cleanup() { camera.far = 900; camera.updateProjectionMatrix(); hemi.intensity = 1.35; sun.intensity = 2.6; scene.fog.color.setHex(0xbfe6ff); scene.fog.near = 150; scene.fog.far = 420; ctx?.showAct(null); this.mini?.dispose(); this.mini = null; this.driving = null; },
  // ---------------------------------------------------------------- interacting
  nearest(p) {
    const pp = p.pos; let best = null, bd = 3.2;
    const add = (d, label, fn) => { if (d < bd) { bd = d; best = { label, fn }; } };
    if (this.inside) { add(Math.hypot(pp.x - this.inside.exit.x, pp.z - this.inside.exit.z), t('Go outside'), () => this.leave()); for (const l of this.inside.loot || []) if (!l.taken) add(Math.hypot(pp.x - l.x, pp.z - l.z), t('Take it'), () => this.steal(l)); if (this.inside.mine) add(Math.hypot(pp.x - this.inside.cx, pp.z - this.inside.cz) < 9 ? 3 : 9, t('Decorate'), () => this.decorate()); return best; }
    if (this.driving) return { label: t('Get out of the car'), fn: () => this.exitCar() };
    for (const c of this.cars) add(Math.hypot(pp.x - c.x, pp.z - c.z) - c.hw - 0.4, t('Drive'), () => this.enterCar(c));
    { const n = this.walkers.nearest(pp.x, pp.z, 2.2); if (n && (n.state === 'walk' || n.state === 'return')) add(Math.hypot(n.o.position.x - pp.x, n.o.position.z - pp.z) + 0.6, t('Talk'), () => this.talkTo(n)); }
    for (const pc of this.parked) if (!pc.taken && Math.abs(pc.x - pp.x) < 6 && Math.abs(pc.z - pp.z) < 6) add(Math.hypot(pp.x - pc.x, pp.z - pc.z) - 1.6, t('Drive'), () => this.takeParked(pc));
    for (const c of this.traffic.cars) if (c.live && c.v < 1.5 && Math.abs(c.x - pp.x) < 6 && Math.abs(c.z - pp.z) < 6) add(Math.hypot(pp.x - c.x, pp.z - c.z) - c.hw - 0.4, t('Steal the car'), () => this.hijack(c));
    for (const d of this.doors) {
      const dd = Math.hypot(pp.x - d.x, pp.z - d.z), lot = d.lot;
      if (lot.role?.startsWith('shop:')) add(dd, { 'shop:food': t('Restaurant'), 'shop:drink': t('Drinks shop'), 'shop:clothes': t('Clothes shop'), 'shop:furniture': t('Furniture shop') }[lot.role], () => this.shop(lot.role.slice(5)));
      else if (lot.role === 'estate') add(dd, t('Homes for sale'), () => this.estate());
      else if (lot.role === 'stadium') add(dd, t('Stadium'), () => this.stadium());
      else if (lot.role === 'depot') add(dd, t('Jobs'), () => this.jobs());
      else if (lot.role === 'airport') add(dd, t('Airport'), () => this.travel());
      else if (lot.role === 'bank') add(dd, t('Business'), () => this.business());
      else if (lot.role === 'police') add(dd, t('Police station'), () => this.policeDesk());
      else if (lot.role === 'gym') add(dd, t('Gym'), () => this.gym());
      else if (lot.role === 'hospital') add(dd, t('Hospital'), () => this.hospital());
      else if (lot.role === 'dealer') add(dd, t('Car dealer'), () => this.dealer(lot));
      else if (lot.role === 'race') add(dd, t('Street race'), () => this.race(lot));
      else if (lot.home) { const h = lot.home, mine = !!life.homes[h.id]; if (mine) add(dd, t('Go home'), () => this.enter(lot, true)); else if (h.unlocked) add(dd, t('The door is open...'), () => this.enter(lot, false)); else if (h.owner) add(dd + 0.5, t('Climb in through the window'), () => this.climbIn(lot)); }
    }
    return best;
  },
  act() { const n = this.nearest(G.player); if (n) n.fn(); },
  hitNear(r) {
    // punching people is a crime too
    const fx_ = Math.sin(r.facing), fz = Math.cos(r.facing);
    for (const n of this.npcs) { const dx = n.o.position.x - r.pos.x, dz = n.o.position.z - r.pos.z, d = Math.hypot(dx, dz); if (d < 2.1 && (dx * fx_ + dz * fz) / (d || 1) > -0.2 && n.state !== 'down') { this.walkers.hit(n, dx / (d || 1), dz / (d || 1), r.batPower || 1); this.walkers.scare(n.o.position.x, n.o.position.z, 18); this.crime(2, true); sfx.bat?.(); } }
    const rv = this.revengeTarget; if (rv && !rv.dead && Math.hypot(rv.o.position.x - r.pos.x, rv.o.position.z - r.pos.z) < 2) { rv.hp--; fx.burst(V(rv.o.position.x, 1, rv.o.position.z), 0x111111, 10, 4); if (rv.hp <= 0) { rv.dead = true; rv.o.rotation.x = -PI / 2; life.revenge = null; save.coins += 1500; saveLife(); toast(t('Revenge! +1500 coins'), 3); } }
  },
  // the push button shoves the person in front of you
  onPush(r) { const n = this.walkers?.nearest(r.pos.x + Math.sin(r.facing) * 0.8, r.pos.z + Math.cos(r.facing) * 0.8, 1.6); if (!n || this.driving) return; this.walkers.bump(n, Math.sin(r.facing), Math.cos(r.facing), true); if (Math.random() < 0.35) { n.angry = true; } fx.burst(V(n.o.position.x, 1, n.o.position.z), 0xffffff, 8, 4); },
  talkTo(n) {
    const p = G.player.pos; if (!this.walkers.talk(n, p.x, p.z)) return;
    const famous = life.fame >= 10, lines = famous ? [t('Wow, it is you! Can I get a selfie?'), t('My kids love your matches!'), t('You are the famous one!')] : [t('Nice day, right?'), t('Watch out for the police around here.'), t('Have you tried the food shop?'), t('The street race is crazy fun!'), t('I am late for work!'), t('Have you found the hidden coins?')];
    toast(pick(lines), 2.5); if (famous && Math.random() < 0.3) { life.fame++; saveLife(); }
  },
  // ---------------------------------------------------------------- cars
  freeCar(n, o, x, z, h) { const { hw, hl } = carSize(n), body = this.L.kin(new CANNON.Box(new CANNON.Vec3(hw, 1, hl)), x, 1, z, 'car'); const c = { n, o, hw, hl, x, z, h, v: 0, body }; this.cars.push(c); return c; },
  takeParked(pc) {
    pc.taken = true; this.st.kill(pc.s); const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (const m of pc.ins.meshes) { m.setMatrixAt(pc.idx, zero); m.instanceMatrix.needsUpdate = true; }
    this.enterCar(this.freeCar(pc.n, place(W('car-kit', pc.n), pc.x, 0, pc.z, CAR_S, pc.ry, this.L.root), pc.x, pc.z, pc.ry));
  },
  hijack(c) {
    // pull the driver out and take the car: that is a crime
    this.traffic.remove(c); this.L.root.add(c.o); this.traffic.cars.push(this.traffic.make(pick(['sedan', 'taxi', 'van', 'suv'])));
    this.crime(1, true); this.enterCar(this.freeCar(c.n, c.o, c.x, c.z, c.h));
  },
  enterCar(c) { this.driving = c; c.v = 0; this.driveY = G.player.body.position.y; G.player.root.visible = false; sfx.click(); toast(t('Driving! Press the action button to get out'), 2); },
  exitCar() {
    const c = this.driving; if (!c) return; this.driving = null; c.v = 0; const p = G.player; p.root.visible = true;
    const lx = Math.cos(c.h), lz = -Math.sin(c.h), fx_ = Math.sin(c.h), fz = Math.cos(c.h), d = c.hw + 1.1;
    const opts = [[c.x + lx * d, c.z + lz * d], [c.x - lx * d, c.z - lz * d], [c.x - fx_ * (c.hl + 1.2), c.z - fz * (c.hl + 1.2)], [c.x + fx_ * (c.hl + 1.2), c.z + fz * (c.hl + 1.2)]];
    const [x, z] = opts.find(([x, z]) => !this.st.inside(x, z, 0.6)) || opts[0]; p.reset(x, this.driveY || 0.5, z, c.h); c.body.position.set(c.x, 1, c.z);
  },
  // ---------------------------------------------------------------- shops
  shop(kind) {
    if (kind === 'food' || kind === 'drink') {
      const list = kind === 'food' ? FOOD : DRINK, k = kind === 'food' ? FOODK : FOODK;
      ctx.panel(kind === 'food' ? t('Restaurant') : t('Drinks shop'), list.map((it) => ({ id: it.id, name: it.name, sub: BUFF_TXT()[it.kind], price: it.price, model: W(k, it.model) })), (id) => {
        const it = list.find((x) => x.id === id); if (save.coins < it.price) return toast(t('Need {n} more', { n: it.price - save.coins }));
        save.coins -= it.price; sfx.coin();
        if (it.kind === 'dizzy') { this.dizzy = 25; toast(t('Everything spins for a while'), 2.5); }
        else { life.buff = { kind: it.kind, n: 1 }; life.ate = (life.ate || 0) + (it.heavy ? 1 : 0); if (life.ate >= 4) { life.buff = { kind: 'slow', n: 1 }; life.ate = 0; toast(t('Too much heavy food! You will be a bit slower next match'), 3); } else toast(it.name + ': ' + BUFF_TXT()[it.kind], 2.5); }
        saveLife(); ctx.refreshMenu?.();
      });
    } else if (kind === 'clothes') ctx.openWardrobe();
    else if (kind === 'furniture') ctx.panel(t('Furniture shop'), FURN.map((n) => ({ id: n, name: t(nice(n.replace(/([A-Z])/g, ' $1'))), sub: '', price: furnPrice(n), model: W('furniture-kit', n) })), (id) => { const pr = furnPrice(id); if (save.coins < pr) return toast(t('Need {n} more', { n: pr - save.coins })); save.coins -= pr; life.furn.push(id); saveLife(); sfx.coin(); toast(t('Delivered to your home: place it with Decorate'), 2.5); });
  },
  estate() {
    const forSale = this.lots.filter((l) => l.home && !l.home.owner && !life.homes[l.home.id]);
    ctx.panel(t('Homes for sale'), forSale.map((l) => ({ id: l.home.id, name: (l.home.furnished ? t('Furnished house') : t('Empty house')) + ' #' + l.home.id.slice(1), sub: l.home.furnished ? t('Sofa, TV, bed and kitchen included') : t('Buy furniture and place it yourself'), price: l.home.price + (l.home.furnished ? 4000 : 0), model: null })), (id) => {
      const l = forSale.find((x) => x.home.id === id), pr = l.home.price + (l.home.furnished ? 4000 : 0); if (save.coins < pr) return toast(t('Need {n} more', { n: pr - save.coins }));
      save.coins -= pr; life.homes[id] = { furnished: l.home.furnished, items: [], pos: { x: l.door.x, z: l.door.z, nx: l.nx, nz: l.nz } }; saveLife(); sfx.win(); toast(t('You bought a home! You will wake up here'), 3);
    });
  },
  // ---------------------------------------------------------------- inside buildings
  async enter(lot, mine) {
    const L = this.L, cx = 20000 + (this.roomN = ((this.roomN || 0) + 1) % 50) * 30, cz = 20000; // rooms are far away from the city await need(['furniture-kit/wall', 'furniture-kit/floorFull', 'furniture-kit/wallDoorway', ...FURNISHED.map((f) => 'furniture-kit/' + f[0]), ...FURN.map((n) => 'furniture-kit/' + n), ...LOOT.map((n) => 'furniture-kit/' + n)]);
    const g = new THREE.Group(); L.root.add(g); const fs = 1.6;
    const fl = []; for (let x = -5.6; x < 5.6; x += 1.6) for (let z = -4.6; z < 5.2; z += 1.6) fl.push({ x: cx + x, y: 0, z: cz + z, s: fs }); // floor tiles start at their corner
    L.box(cx, -0.5, cz, 6, 0.5, 5.5); for (const [x, z, hx, hz] of [[0, -4.6, 6, 0.2], [0, 5.2, 6, 0.2], [-5.6, 0, 0.2, 5.5], [5.6, 0, 0.2, 5.5]]) { L.box(cx + x, 1.6, cz + z, hx, 1.6, hz); }
    const wsz = [fs, 2.6, fs];
    for (let x = -5.6; x <= 5.61; x += 1.6) { place(W('furniture-kit', 'wall'), cx + x, 0, cz - 4.6, wsz, 0, g); place(W('furniture-kit', Math.abs(x) < 0.9 ? 'wallDoorway' : 'wall'), cx + x, 0, cz + 5.2, wsz, PI, g); }
    for (let z = -4.6; z <= 5.21; z += 1.6) { place(W('furniture-kit', 'wall'), cx - 5.6, 0, cz + z, wsz, PI / 2, g); place(W('furniture-kit', 'wall'), cx + 5.6, 0, cz + z, wsz, -PI / 2, g); }
    const ceil = []; for (let x = -5.6; x < 5.6; x += 1.6) for (let z = -4.6; z < 5.2; z += 1.6) ceil.push({ x: cx + x, y: 3.6, z: cz + z + 1.6, s: fs, rx: PI }); instanced(W('furniture-kit', 'floorFull'), [...fl, ...ceil], g);
    // inside you only see the room: the sea, the sky and the city outside are hidden
    this.mini?.show(false); this.outside = { bg: scene.background }; sky.visible = false; sea.visible = false; scene.background = new THREE.Color(0x1c1410); scene.fog.near = 1e4; scene.fog.far = 2e4; L.root.children.forEach((c) => { if (c !== g && !c.isLight) { c.userData.wasVis = c.visible; c.visible = false; } });
    const lamp = new THREE.PointLight(0xfff0d0, 2.2, 14); lamp.position.set(cx, 3.2, cz); g.add(lamp);
    this.saveLight = [hemi.intensity, sun.intensity, hemi.groundColor.getHex()]; hemi.intensity = 0.95; sun.intensity = 0.1; hemi.groundColor.setHex(0xb0a090); this.exp = renderer.toneMappingExposure; renderer.toneMappingExposure = 0.95;
    g.traverse((m) => { if (m.isMesh && m.material?.color) { m.material = m.material.clone(); m.material.color.multiplyScalar(0.8); } });
    const home = mine ? life.homes[lot.home.id] : null, inside = { lot, g, exit: { x: cx, z: cz + 4.4 }, cx, cz, mine: !!home, loot: [] };
    const furnish = !mine ? FURNISHED : (home.furnished ? FURNISHED : []);
    const ff = 1.9; inside.objs = []; for (const [n, x, z, ry, y] of furnish) inside.objs.push({ n, o: placeF(n, cx + x, y || 0, cz + z, ff, ry, g) });
    if (home) for (const it of home.items) inside.objs.push({ n: it.n, o: placeF(it.n, cx + it.x, 0, cz + it.z, ff, it.ry, g), item: it });
    if (!mine) for (const [x, z] of [[0.6, 1.8], [2.2, 0.6], [-0.6, -1.4]]) { const n = pick(LOOT); const o = placeF(n, cx + x, 0, cz + z, ff, 0, g); const l = { o, x: cx + x, z: cz + z, value: pick([80, 120, 200, 300]), n }; inside.loot.push(l); inside.objs.push({ n, o, loot: l }); }
    this.inside = inside; G.player.reset(cx, 0.5, cz + 3.4, PI); sfx.click();
  },
  leave() { const i = this.inside; const cl = this.carry?.loot; if (cl && !cl.taken) { this.steal(cl); } this.drop(true); i.g.removeFromParent(); this.inside = null; this.mini?.show(true); if (this.outside) { sky.visible = true; sea.visible = true; scene.background = this.outside.bg; scene.fog.near = 60; scene.fog.far = 260; this.L.root.children.forEach((c) => { if (c.userData.wasVis !== undefined) { c.visible = c.userData.wasVis; delete c.userData.wasVis; } }); } if (this.saveLight) { [hemi.intensity, sun.intensity] = this.saveLight; hemi.groundColor.setHex(this.saveLight[2]); if (this.exp) renderer.toneMappingExposure = this.exp; } G.player.reset(i.lot.door.x, 0.5, i.lot.door.z + (i.lot.ry === 0 ? 1.5 : -1.5), 0); },
  climbIn(lot) { // a break-in: noisy, maybe an alarm
    if (Math.random() < 0.3) { toast(t('An alarm goes off!'), 2); this.crime(2, true); } else this.crime(1, false);
    this.enter(lot, false);
  },
  steal(l) { l.taken = true; l.o.visible = false; save.coins += l.value; sfx.coin(); toast('+' + l.value, 1.2); const seen = this.witnessed(); this.crime(1, seen); if (!seen) toast(t('Nobody saw you... for now'), 2); },
  decorate() {
    const home = life.homes[this.inside.lot.home.id]; if (!life.furn.length) return toast(t('Buy furniture at the furniture shop first'), 2.5);
    ctx.panel(t('Decorate'), life.furn.map((n, i) => ({ id: String(i), name: t(nice(n.replace(/([A-Z])/g, ' $1'))), sub: t('Placed where you stand'), price: 0, model: W('furniture-kit', n) })), (id) => {
      const n = life.furn.splice(+id, 1)[0], p = G.player.pos, it = { n, x: p.x - this.inside.cx, z: p.z - this.inside.cz, ry: G.player.facing + PI };
      home.items.push(it); placeF(n, p.x, 0, p.z, 1.9, it.ry, this.inside.g); G.player.reset(p.x, 0.5, p.z + 1.5, G.player.facing); saveLife();
    });
  },
  // ---------------------------------------------------------------- picking things up
  // light things anyone can lift; heavy ones only if you are healthy and strong (power food or the pink blob pet)
  carryUpdate(dt, p) {
    const grab = p.input.grab;
    if (grab && !this.carry && this.inside && !this.grabWas) {
      let best = null, bd = 2.2; for (const ob of this.inside.objs || []) { if (ob.loot?.taken) continue; const op = ob.o.getWorldPosition(V()), d = Math.hypot(op.x - p.pos.x, op.z - p.pos.z); if (d < bd) { bd = d; best = ob; } }
      if (best) {
        const heavy = !LIGHT.test(best.n), strong = this.hp >= 70 && (p.food === 'power' || p.perk === 'heavy' || life.buff?.kind === 'power' || life.str >= 5);
        // light: carried in your hands; heavy: lifted with both arms if you are strong, otherwise dragged along the floor
        this.carry = { ...best, heavy, how: !heavy ? 'hold' : strong ? 'lift' : 'drag' }; p.carrying = this.carry.how === 'hold' ? true : this.carry.how; sfx.pickup?.();
        if (heavy && !strong) toast(t('Too heavy to lift: you drag it (eat power food or train at the gym)'), 2.2);
      }
    }
    this.grabWas = grab;
    const c = this.carry; if (!c) return;
    if (!grab) { this.drop(false); return; }
    const f = { x: Math.sin(p.facing), z: Math.cos(p.facing) }, h = c.how === 'drag' ? 0 : c.how === 'lift' ? 1.15 : 0.7, d = c.how === 'drag' ? 1.3 : 0.9;
    const tx = p.pos.x + f.x * d, tz = p.pos.z + f.z * d; c.o.rotation.y = p.facing; c.o.position.set(tx, p.pos.y + h, tz); c.o.updateMatrixWorld(true);
    const cc = new THREE.Box3().setFromObject(c.o).getCenter(V()); c.o.position.x += tx - cc.x; c.o.position.z += tz - cc.z; // centred between the hands
    if (c.how !== 'hold') p.slow(c.how === 'drag' ? 0.3 : 0.2);
    if (c.how === 'drag' && Math.random() < dt * 8) fx.dust(V(c.o.position.x, 0.05, c.o.position.z), 1, 0xd9c8a0, 1);
  },
  drop(silent) {
    const c = this.carry; if (!c) return; this.carry = null; if (G.player) G.player.carrying = false;
    // it falls to the floor (with a little bounce) instead of hanging in the air
    { const o = c.o; let vy = 0, b = 0; const fall = () => { vy -= 22 / 60; o.position.y += vy / 60; if (o.position.y <= 0) { o.position.y = 0; if (Math.abs(vy) > 3 && b < 2) { vy = -vy * 0.3; b++; } else return; } requestAnimationFrame(fall); }; if (o.position.y > 0.01) fall(); }
    if (c.loot) { c.loot.x = c.o.position.x; c.loot.z = c.o.position.z; }
    if (c.item && this.inside) { c.item.x = c.o.position.x - this.inside.cx; c.item.z = c.o.position.z - this.inside.cz; c.item.ry = c.o.rotation.y; saveLife(); }
    if (!silent) sfx.land?.();
  },
  // ---------------------------------------------------------------- crime and police
  witnessed() {
    const p = G.player.pos;
    for (const n of this.npcs) if (Math.hypot(n.o.position.x - p.x, n.o.position.z - p.z) < 14) return true;
    for (const c of this.cams) { const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz); if (d < 18 && Math.cos(Math.atan2(dx, dz) - c.a) > 0.5) return true; }
    return false;
  },
  crime(level, seen) {
    if (seen) { life.wanted = Math.min(5, life.wanted + level); toast(t('Someone saw you! Wanted level up'), 2); this.policeT = 0; }
    else { life.evidence += level; this.evT = rand(60, 180); } // the evidence will catch up with you later
    saveLife();
  },
  crimeUpdate(dt, p) {
    if (life.evidence > 0) { this.evT = (this.evT ?? rand(60, 180)) - dt; if (this.evT <= 0) { life.wanted = Math.min(5, life.wanted + Math.ceil(life.evidence / 2)); life.evidence = 0; toast(t('The police found the evidence. They are coming for you!'), 3); saveLife(); } }
    // police cars chase you when you are wanted: they drive along the roads and cut straight to you when they can see you
    while (this.police.length < life.wanted && !this.inside) this.spawnPolice(p);
    const pp = p.pos, mine = this.driving;
    for (const c of this.police) {
      if (this.inside) break;
      const see = Math.hypot(pp.x - c.x, pp.z - c.z) < 80 && this.st.clear(c.x, c.z, pp.x, pp.z); let tx = pp.x, tz = pp.z;
      if (!see) {
        if (!c.tn || Math.hypot(c.tn[0] - c.x, c.tn[1] - c.z) < 9) {
          const a = Math.round((c.x + HALF) / P), b = Math.round((c.z + HALF) / P), here = [R(a), R(b)];
          if (!c.tn && Math.hypot(here[0] - c.x, here[1] - c.z) > 9) c.tn = here;
          else { let best = null, bd = 1e9; for (const [da, db, dd] of [[1, 0, 0], [-1, 0, 2], [0, 1, 1], [0, -1, 3]]) { if (!segOK(a, b, dd)) continue; const na = a + da, nb = b + db; const d = Math.hypot(R(na) - pp.x, R(nb) - pp.z); if (d < bd) { bd = d; best = [R(na), R(nb)]; } } c.tn = best; }
        }
        [tx, tz] = c.tn;
      } else c.tn = null;
      let wantH = Math.atan2(tx - c.x, tz - c.z), thr = Math.abs(wrap(wantH - c.h)) > 1.1 ? 0.45 : 1;
      if (Math.abs(c.v) < 1) c.stuck += dt; else c.stuck = 0; if (c.stuck > 1.4) { c.rev = 1.1; c.stuck = 0; }
      if (c.rev > 0) { c.rev -= dt; thr = -1; wantH = wrap(c.h + 0.9); }
      carStep(c, wantH, thr, false, dt, this.st, [...this.traffic.cars.filter((o) => o.live), ...this.cars, ...this.police]);
      c.o.position.set(c.x, 0, c.z); c.o.rotation.y = c.h; c.body.position.set(c.x, 1, c.z); c.body.quaternion.setFromEuler(0, c.h, 0);
      const d = Math.hypot(pp.x - c.x, pp.z - c.z);
      if (!mine && d < c.hl + 1.6 && Math.abs(c.v) < 12) { this.arrest(); break; }
      if (mine && d < c.hl + mine.hl + 1.8 && Math.abs(mine.v) < 2.5) { this.bust = (this.bust || 0) + dt; if (this.bust > 1.5) { this.bust = 0; this.exitCar(); this.arrest(); break; } } else if (mine) this.bust = 0;
    }
    if (life.wanted > 0 && !this.police.some((c) => Math.hypot(pp.x - c.x, pp.z - c.z) < 70)) { this.calm = (this.calm || 0) + dt; if (this.calm > 40) { life.wanted--; this.calm = 0; this.dropPolice(this.police.pop()); saveLife(); } } else this.calm = 0;
  },
  spawnPolice(p) {
    const pp = p.pos, nodes = []; const na = Math.round((pp.x + HALF) / P), nb = Math.round((pp.z + HALF) / P); for (let a = na - 3; a <= na + 3; a++) for (let b = nb - 3; b <= nb + 3; b++) { const d = Math.hypot(R(a) - pp.x, R(b) - pp.z); if (d > 90 && d < 170) nodes.push([R(a), R(b)]); }
    const [x, z] = nodes.length ? pick(nodes) : [pp.x + 100, pp.z]; const { hw, hl } = carSize('police');
    const c = { n: 'police', o: place(W('car-kit', 'police'), x, 0, z, CAR_S, 0, this.L.root), hw, hl, x, z, h: Math.atan2(pp.x - x, pp.z - z), v: 0, vmax: 19 + life.wanted * 1.6, stuck: 0, rev: 0, tn: null, body: this.L.kin(new CANNON.Box(new CANNON.Vec3(hw, 1, hl)), x, 1, z, 'car') };
    this.police.push(c); sfx.beep();
  },
  dropPolice(c) { if (!c) return; c.o.removeFromParent(); c.body.position.set(0, -50, 0); },
  arrest() {
    const fine = Math.min(save.coins, 300 * life.wanted); save.coins -= fine; life.wanted = 0; life.evidence = 0; for (const c of this.police) this.dropPolice(c); this.police = []; saveLife();
    toast(t('Arrested! You paid a {n} coin fine', { n: fine }), 3.5); const s = this.city.roleDoors.police; if (s) G.player.reset(s.x, 0.5, s.z, Math.atan2(-s.lot.nx, -s.lot.nz));
  },
  policeDesk() { ctx.panel(t('Police station'), [{ id: 'turn', name: t('Turn yourself in'), sub: t('Pay a smaller fine and clear your wanted level'), price: 150 * life.wanted }], () => { const fine = Math.min(save.coins, 150 * life.wanted); save.coins -= fine; life.wanted = 0; life.evidence = 0; this.police.forEach((c) => this.dropPolice(c)); this.police = []; saveLife(); toast(t('Your record is clean'), 2); }); },
  // ---------------------------------------------------------------- permadeath and revenge
  die(by) {
    life.deaths++; life.hall.push({ name: life.name, fame: life.fame, by, at: Date.now() }); life.revenge = { by }; life.homes = {}; life.furn = []; life.buff = null; life.wanted = 0; life.fame = 0; life.biz = {}; life.name = pick(['Bolt', 'Zap', 'Dash', 'Volt', 'Spark', 'Flash']) + ' ' + (life.deaths + 1);
    saveLife(); this.hp = 100; this.killer = null; toast(t('You died. A new life begins... and a revenge file is open'), 4); const s = this.spawn(); G.player.reset(s.x, 1, s.z, 0);
    // the one who killed you walks the city now; find him and beat him
    const dd = pick(this.doors.filter((d) => Math.hypot(d.x - s.x, d.z - s.z) < 140) || this.doors) || { x: s.x, z: s.z }; const o = place('Character', dd.x, 0, dd.z, 0.5, 0, this.L.root); dress(o, { skin: 'film-black', face: 'f-sun' }); this.revengeTarget = { o, hp: 5 };
  },
  // ---------------------------------------------------------------- jobs
  // ---------------------------------------------------------------- gym, hospital, car dealer, street races
  gym() {
    ctx.panel(t('Gym'), [{ id: 'train', name: t('Train') + ` (${life.str}/10)`, sub: t('Get stronger: at 5 you can lift heavy things'), price: 30 }], () => {
      if (life.str >= 10) return toast(t('You are as strong as can be!'), 2); if (save.coins < 30) return toast(t('Need {n} more', { n: 30 - save.coins }));
      save.coins -= 30; life.str++; saveLife(); sfx.win(); toast(t('Strength {n}/10', { n: life.str }), 2);
    });
  },
  hospital() {
    ctx.panel(t('Hospital'), [{ id: 'heal', name: t('Get healed') + ` (❤ ${Math.round(this.hp)})`, sub: t('Back to full health'), price: 50 }], () => {
      if (this.hp >= 100) return toast(t('You are healthy!'), 2); if (save.coins < 50) return toast(t('Need {n} more', { n: 50 - save.coins }));
      save.coins -= 50; this.hp = 100; sfx.win(); toast(t('All better!'), 2);
    });
  },
  dealer(lot) {
    const list = CARS_FOR_SALE.map(([n, price]) => { const own = life.cars.includes(n); return { id: n, name: t(nice(n)), sub: own ? t('Yours: bring it here') : t('Buy your own car'), price: own ? 0 : price, model: W('car-kit', n) }; });
    ctx.panel(t('Car dealer'), list, (n) => {
      const [, price, vmax] = CARS_FOR_SALE.find((c) => c[0] === n);
      if (!life.cars.includes(n)) { if (save.coins < price) return toast(t('Need {n} more', { n: price - save.coins })); save.coins -= price; life.cars.push(n); saveLife(); sfx.win(); toast(t('Your new car is outside!'), 2.5); }
      // your car waits on the road in front of the shop
      const old = this.cars.find((c) => c.mine); if (old && old !== this.driving) { old.o.removeFromParent(); old.body.position.set(0, -50, 0); this.cars.splice(this.cars.indexOf(old), 1); }
      const d = lot.door, x = d.x + lot.nx * 7, z = d.z + lot.nz * 7, h = Math.atan2(lot.nz, -lot.nx);
      const c = this.freeCar(n, place(W('car-kit', n), x, 0, z, CAR_S, h, this.L.root), x, z, h); c.mine = true; c.vmax = vmax;
    });
  },
  race(lot) {
    if (!this.driving) return toast(t('Get in a car first'), 2);
    // a route along the streets: 8 crossings, never turning back
    const pts = []; let a = Math.round((lot.door.x + HALF) / P), b = Math.round((lot.door.z + HALF) / P), last = -1, dist = 0, px = lot.door.x, pz = lot.door.z;
    for (let k = 0; k < 8; k++) { const opts = [0, 1, 2, 3].filter((d) => d !== (last + 2) % 4 && segOK(a, b, d)); const d = pick(opts); a += [1, 0, -1, 0][d]; b += [0, 1, 0, -1][d]; last = d; const q = [R(a), R(b)]; dist += Math.hypot(q[0] - px, q[1] - pz); px = q[0]; pz = q[1]; pts.push(q); }
    if (this.job) { this.job.mark?.removeFromParent(); this.job = null; }
    this.job = { id: 'race', text: t('Street race: drive through the stars'), pts, k: 0, mark: place('Star', pts[0][0], 3, pts[0][1], 2.2, 0, this.L.root), time: Math.round(dist / 15 + 10), pay: 500 };
    sfx.go?.(); toast(t('Street race! Drive through 8 stars before time runs out'), 3);
  },
  jobs() {
    ctx.panel(t('Jobs'), [
      { id: 'delivery', name: t('Delivery'), sub: t('Take the parcel to the address before time runs out'), price: 0 },
      { id: 'taxi', name: t('Taxi driver'), sub: t('Get in a car, pick up the passenger, drive them home'), price: 0 },
      { id: 'shop', name: t('Shop worker'), sub: t('Serve the customers at the till'), price: 0 },
      { id: 'police', name: t('Police officer'), sub: t('Catch the thief running through the city'), price: 0 },
      { id: 'pro', name: t('Pro player'), sub: t('Play a Show match for a salary'), price: 0 },
    ], (id) => this.startJob(id));
  },
  startJob(id) {
    const p = G.player, doorTo = pick(this.doors.filter((d) => d.lot.home)), mk = (x, z) => { const o = place('Star', x, 2, z, 0.8, 0, this.L.root); return o; };
    if (id === 'delivery') this.job = { id, text: t('Deliver the parcel'), to: doorTo, mark: mk(doorTo.x, doorTo.z), time: 75, pay: 150 };
    else if (id === 'taxi') { const from = pick(this.doors), to = pick(this.doors); this.job = { id, text: t('Pick up the passenger'), stage: 0, from, to, mark: mk(from.x, from.z), time: 120, pay: 220 }; }
    else if (id === 'shop') this.job = { id, text: t('Serve 5 customers'), left: 5, time: 60, pay: 120, serveT: 2 };
    else if (id === 'police') { const td = pick(this.doors.filter((d) => { const q = Math.hypot(d.x - p.pos.x, d.z - p.pos.z); return q > 20 && q < 45; })) || { x: p.pos.x + 25, z: p.pos.z }; const o = place('Character', td.x, 0, td.z, 0.42, 0, this.L.root); dress(o, { skin: 'mon-vamp', face: 'f-sun' }); this.job = { id, text: t('Catch the thief'), thief: o, time: 90, pay: 300 }; }
    else if (id === 'pro') { ctx.goPlay('show'); return; }
    sfx.click(); toast(this.job.text, 2);
  },
  jobUpdate(dt, p) {
    const j = this.job; if (!j) return; j.time -= dt; j.text = j.text.replace(/ \(\d+s\)$/, '') + ` (${Math.max(0, Math.ceil(j.time))}s)`;
    const at = (d) => Math.hypot(p.pos.x - d.x, p.pos.z - d.z) < 3.5;
    if (j.mark) { j.mark.rotation.y += dt * 2; j.mark.position.y = 2 + Math.sin(this.t * 3) * 0.3; }
    if (j.id === 'delivery' && at(j.to)) this.jobDone();
    if (j.id === 'race') { const q = j.pts[j.k]; j.mark.position.y = 3 + Math.sin(this.t * 3) * 0.4; if (Math.hypot(p.pos.x - q[0], p.pos.z - q[1]) < 9) { j.k++; sfx.coin(); if (j.k >= j.pts.length) { life.fame += 2; this.jobDone(); return; } j.mark.position.set(j.pts[j.k][0], 3, j.pts[j.k][1]); toast(`${j.k}/8`, 1); } }
    if (j.id === 'taxi') { if (!this.driving) j.text = t('Get in a car first') + ` (${Math.ceil(j.time)}s)`; else if (j.stage === 0 && at(j.from)) { j.stage = 1; j.mark.position.set(j.to.x, 2, j.to.z); toast(t('Passenger on board! Drive to the star'), 2); } else if (j.stage === 1 && at(j.to)) this.jobDone(); }
    if (j.id === 'shop') { j.serveT -= dt; if (j.serveT <= 0) { j.serveT = 2.5; ctx.showAct(t('Serve!')); this.serving = true; } }
    if (j.id === 'police') { const o = j.thief.position, dx = o.x - p.pos.x, dz = o.z - p.pos.z, d = Math.hypot(dx, dz) || 1; o.x += dx / d * 6.5 * dt; o.z += dz / d * 6.5 * dt; o.x = clamp(o.x, -HALF, HALF); o.z = clamp(o.z, -HALF, HALF); o.y = 0; const pu = this.st.resolve(o.x, o.z, 0.6); if (pu) { o.x += pu.x; o.z += pu.z; } j.thief.rotation.y = Math.atan2(dx, dz); if (d < 1.8) { j.thief.removeFromParent(); this.jobDone(); } }
    if (j.time <= 0) { toast(t('Too late! Job failed'), 2); j.mark?.removeFromParent(); j.thief?.removeFromParent(); this.job = null; }
  },
  serve() { const j = this.job; if (j?.id !== 'shop' || !this.serving) return false; this.serving = false; j.left--; sfx.coin(); if (j.left <= 0) this.jobDone(); else j.text = t('Serve {n} more customers', { n: j.left }); return true; },
  jobDone() { const j = this.job; j.mark?.removeFromParent(); save.coins += j.pay; life.fame += 1; saveLife(); sfx.win(); toast(t('Job done! +{n} coins', { n: j.pay }), 2.5); this.job = null; },
  // ---------------------------------------------------------------- stadium, travel, business
  stadium() { const nat = this.nat; ctx.panel(t('Stadium'), [{ id: nat.game, name: t('Play {x}', { x: MODES[nat.game]?.name || nat.game }), sub: t('The famous game of {x}', { x: nat.name }), price: 0 }, { id: 'show', name: t('The Show'), sub: '', price: 0 }], (id) => ctx.goPlay(id)); },
  travel() {
    ctx.panel(t('Airport'), NATIONS.filter((n) => n.id !== life.nation).flatMap((n) => [{ id: n.id + ':plane', name: '✈ ' + n.name, sub: t('Plane: safe and fast'), price: 400 }, { id: n.id + ':ship', name: '⛴ ' + n.name, sub: t('Ship: cheap, but storms happen'), price: 120 }]), (id) => {
      const [nid, how] = id.split(':'), pr = how === 'plane' ? 400 : 120; if (save.coins < pr) return toast(t('Need {n} more', { n: pr - save.coins }));
      save.coins -= pr; const risky = how === 'ship' ? 0.3 : 0.04;
      if (Math.random() < risky) { const lost = Math.min(save.coins, 200); save.coins -= lost; toast(t('A storm! You washed up on the shore and lost {n} coins', { n: lost }), 4); }
      life.nation = nid; saveLife(); ctx.restartWorld();
    });
  },
  business() {
    const lots = this.lots.filter((l) => !l.role && !l.home).slice(0, 6), list = [];
    for (const l of lots) { const id = `b${this.nat.id}:${l.id}`, b = life.biz[id]; list.push({ id, name: b ? (b.done ? t('Your {x} (earning)', { x: b.kind }) : t('Building your {x}...', { x: b.kind })) : t('Land for sale'), sub: b ? (b.done ? t('Collect your earnings') : '') : t('Buy the land, then build an arena, cinema or restaurant'), price: b ? 0 : 5000 }); }
    ctx.panel(t('Business'), list, (id) => {
      const b = life.biz[id];
      if (!b) { if (save.coins < 5000) return toast(t('Need {n} more', { n: 5000 - save.coins })); save.coins -= 5000; life.biz[id] = { kind: pick([t('Arena'), t('Cinema'), t('Restaurant')]), start: Date.now(), done: false, last: Date.now() }; toast(t('Construction started! Come back in 10 minutes'), 3); }
      else if (b.done) { const h = (Date.now() - b.last) / 3600000, earn = Math.floor(h * 600); save.coins += earn; b.last = Date.now(); life.fame += 2; toast(t('You collected {n} coins', { n: earn }), 2.5); }
      saveLife();
    });
  },
  bizUpdate() { for (const b of Object.values(life.biz)) if (!b.done && Date.now() - b.start > 600000) { b.done = true; b.last = Date.now(); toast(t('Your {x} is open!', { x: b.kind }), 3); saveLife(); } },
};
const K = (kit, list) => list.map((n) => kit + '/' + n);
export const WORLD_MODELS = [...K('city-kit-commercial', [...'abcdefghijklmn'.split('').map((c) => 'building-' + c), ...'abcde'.split('').map((c) => 'building-skyscraper-' + c)]),
  ...K('city-kit-suburban', [...'abcdefghijklmnopqrstu'.split('').map((c) => 'building-type-' + c), 'planter', 'tree-large', 'tree-small', 'driveway-long', 'fence']),
  ...K('city-kit-industrial', [...'abcdefghijklmnopqrst'.split('').map((c) => 'building-' + c), 'chimney-large', 'chimney-medium', 'detail-tank']),
  ...K('city-kit-roads', ['road-straight', 'road-crossroad-path', 'road-intersection-path', 'road-bend', 'road-roundabout', 'tile-low', 'light-square', 'tile-high']),
  ...K('street-props', ['detail-light-traffic', 'detail-bench', 'detail-dumpster-closed', 'tree-park-large', 'tree-pine-large']),
  ...K('car-kit', ['sedan', 'suv', 'hatchback-sports', 'van', 'taxi', 'sedan-sports', 'suv-luxury', 'truck', 'truck-flat', 'police', 'delivery', 'garbage-truck', 'ambulance', 'race', 'race-future'])];
function placeF(n, x, y, z, s, ry, parent) {
  const o = place(W('furniture-kit', n), x, y, z, s, ry, parent); o.updateMatrixWorld(true);
  const c = new THREE.Box3().setFromObject(o).getCenter(V()); o.position.x += x - c.x; o.position.z += z - c.z; return o;
}
const dx = (l) => (l.x > 0 ? 'e' : 'w') + (l.z > 0 ? 's' : 'n');
MODES.world = world;
export { world, life, saveLife, loadPacks, need, FOOD, DRINK };

// ---------------------------------------------------------------- the vortex: pieces of the current screen spin into a swirl of light
export function vortex(done) {
  renderer.render(scene, camera); let url = ''; try { url = renderer.domElement.toDataURL('image/jpeg', 0.7); } catch { /* tainted */ }
  const v = document.createElement('div'); v.className = 'vortex'; document.body.appendChild(v);
  const n = 10, W0 = innerWidth, H0 = innerHeight, tiles = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const d = document.createElement('i'); d.style.cssText = `left:${i * W0 / n}px;top:${j * H0 / n}px;width:${W0 / n + 1}px;height:${H0 / n + 1}px;background-image:url(${url});background-size:${W0}px ${H0}px;background-position:${-i * W0 / n}px ${-j * H0 / n}px`; v.appendChild(d); tiles.push({ d, x: (i + 0.5) * W0 / n, y: (j + 0.5) * H0 / n, delay: Math.random() * 0.35 }); }
  const beam = document.createElement('b'); v.appendChild(beam); sfx.boom?.();
  const t0 = performance.now();
  const step = (now) => {
    const k = (now - t0) / 1000; beam.style.opacity = Math.min(1, k * 1.5); beam.style.transform = `translate(-50%,-50%) rotate(${k * 540}deg) scale(${0.3 + k * 1.6})`;
    for (const tl of tiles) { const f = clamp((k - tl.delay) / 1.2, 0, 1), e = f * f, ang = e * 6.5, dx0 = tl.x - W0 / 2, dy0 = tl.y - H0 / 2, r = (1 - e); const x = Math.cos(ang) * dx0 * r - Math.sin(ang) * dy0 * r, y = Math.sin(ang) * dx0 * r + Math.cos(ang) * dy0 * r; tl.d.style.transform = `translate(${x - dx0}px,${y - dy0}px) rotate(${ang * 57}deg) scale(${1 - e * 0.9})`; tl.d.style.opacity = 1 - e * 0.8; }
    if (k < 1.7) requestAnimationFrame(step); else { done?.(); setTimeout(() => { v.style.opacity = 0; setTimeout(() => v.remove(), 600); }, 300); }
  };
  requestAnimationFrame(step);
}
