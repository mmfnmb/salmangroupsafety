// The open world ("life"): a city island you walk and drive around. Shops with 100 foods and 50 drinks,
// homes to buy (furnished or empty) and furnish, jobs (delivery, taxi, shop, thief, police), crime that
// catches up with you, permadeath with a revenge file, travel to 8 nations, businesses and fame.
// The city's models live in separate packs (world/*.pack) and load only when you enter the world.
import { THREE, CANNON, M, G, V, PI, rand, pick, clamp, damp, scene, camera, renderer, save, persist, store, sfx, fx, toast, place, instanced, hemi, sun, sky, sea } from './core.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { t } from './i18n.js';
import { Level } from './level.js';
import { MODES } from './modes.js';
import { ITEM, dress, makePet } from './cosmetics.js';

// ---------------------------------------------------------------- packs
const PACKS = ['city-kit-commercial', 'city-kit-suburban', 'city-kit-roads', 'car-kit', 'food-kit', 'mini-market', 'furniture-kit'];
const packData = {}; let packsReady = null;
const gl = new GLTFLoader();
async function loadPacks(onProgress) {
  if (packsReady) return packsReady;
  packsReady = (async () => {
    let n = 0;
    await Promise.all(PACKS.map(async (k) => {
      // packs are stored as base64 text (the host only serves text and media types)
      const b64 = await (await fetch(`./world/${k}.pack.txt`)).text(), bin = atob(b64.trim()), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); const buf = u8.buffer;
      const len = new DataView(buf).getUint32(0, true), idx = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, len)));
      packData[k] = { buf, base: 4 + len, idx }; onProgress?.(++n / PACKS.length);
    }));
  })();
  return packsReady;
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

// ---------------------------------------------------------------- city layout
const BLK = 34, ROAD = 8, N = 5, HALF = (N * BLK) / 2; // 5x5 blocks of 34 m with 8 m roads
const S = 8; // kit scale: one road tile = 8 m
let ctx = null; // hooks from main.js (flow, show, $, startRound, toMenu, heroDress, refreshMenu)
export function initWorld(c) { ctx = c; }

const world = {
  id: 'world', name: t('The World'), short: t('World'), kind: 'world', icon: 'flag', hidden: true,
  desc: t('Live in the city: eat, work, buy a home, travel'), weapons: t('Your bat'),
  build() {
    const L = new Level({ killY: -20 }); G.level = L; this.L = L;
    const nat = NATIONS.find((n) => n.id === life.nation) || NATIONS[0]; this.nat = nat;
    L.box(0, -1, 0, HALF + 40, 1, HALF + 40); // the island
    // grass blocks and roads
    const grass = [], roads = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const cx = -HALF + BLK / 2 + i * BLK, cz = -HALF + BLK / 2 + j * BLK; grass.push({ x: cx, y: -1.98, z: cz, sx: (BLK - ROAD) / 2, sy: 1, sz: (BLK - ROAD) / 2 }); }
    L.inst('Cube_Grass_Single', grass);
    for (let k = 0; k <= N; k++) { const c = -HALF + k * BLK; for (let p = -HALF; p < HALF; p += S) { roads.push({ x: c, y: 0.01, z: p + S / 2, s: S, ry: 0 }); roads.push({ x: p + S / 2, y: 0.01, z: c, s: S, ry: PI / 2 }); } }
    L.inst(W('city-kit-roads', 'road-straight'), roads, false);
    L.inst('Cube_Grass_Single', [{ x: 0, y: -2.2, z: 0, sx: HALF + 30, sy: 1, sz: HALF + 30 }], false);
    // lots: 4 per block; each gets a role
    const roles = ['shop:food', 'shop:drink', 'shop:clothes', 'shop:furniture', 'estate', 'police', 'stadium', 'depot', 'airport', 'bank'];
    this.lots = []; this.doors = []; this.cams = []; this.homes = [];
    let r = 0;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const cx = -HALF + BLK / 2 + i * BLK, cz = -HALF + BLK / 2 + j * BLK;
      for (const [dx, dz, ry] of [[-7, -7, 0], [7, -7, 0], [-7, 7, PI], [7, 7, PI]]) {
        const x = cx + dx, z = cz + dz, role = r < roles.length && (i + j) % 2 === 0 && (dx < 0) === (dz < 0) ? roles[r++] : null;
        this.lots.push({ x, z, ry, role, i, j });
      }
    }
    const commercial = 'abcdefghijklmn'.split('').map((c) => 'building-' + c), sub = 'abcdefghijklmnopqrstu'.split('').map((c) => 'building-type-' + c);
    for (const lot of this.lots) {
      const { x, z, ry } = lot; let name, kit;
      if (lot.role) { kit = 'city-kit-commercial'; name = lot.role === 'stadium' ? 'building-skyscraper-a' : lot.role === 'police' ? 'building-skyscraper-c' : pick(commercial); }
      else if (Math.abs(lot.i - 2) + Math.abs(lot.j - 2) <= 1) { kit = 'city-kit-commercial'; name = pick(['building-skyscraper-b', 'building-skyscraper-d', 'building-skyscraper-e', ...commercial]); }
      else { kit = 'city-kit-suburban'; name = pick(sub); }
      const s = kit === 'city-kit-suburban' ? 9 : 10.5, o = L.model(W(kit, name), x, 0, z, s, ry);
      const bb = new THREE.Box3().setFromObject(o), sz = bb.getSize(V()); L.box(x, sz.y / 2, z, sz.x / 2 * 0.92, sz.y / 2, sz.z / 2 * 0.92);
      if (lot.role === 'police') lot.label = t('Police station');
      const door = { x: x, z: z + (ry === 0 ? 1 : -1) * (sz.z / 2 + 1.2), lot };
      lot.door = door; this.doors.push(door);
      // homes: suburban houses (some for sale, some belong to people and a few are left unlocked)
      if (kit === 'city-kit-suburban') {
        const id = `h${lot.i}${lot.j}${dx(lot)}`; const forSale = Math.random() < 0.35;
        lot.home = { id, price: forSale ? pick([6000, 9000, 14000]) : 0, furnished: Math.random() < 0.5, owner: forSale ? null : 'npc', unlocked: !forSale && Math.random() < 0.25 };
        if (forSale) L.model(W('city-kit-suburban', 'planter'), door.x + 2.5, 0, door.z, 3);
      }
      if (lot.role === 'police' || Math.random() < 0.18) { const cam = { x: door.x + 2, z: door.z, y: 4, a: Math.atan2(-(door.x + 2), -door.z) }; this.cams.push(cam); L.model(W('city-kit-roads', 'light-square'), cam.x, 0, cam.z, 6, cam.a); }
    }
    // street details and trees
    for (let k = 0; k < 40; k++) { const lot = pick(this.lots); L.model(W('city-kit-suburban', pick(['tree-large', 'tree-small'])), lot.x + rand(-11, 11), 0, lot.z + rand(-11, 11), 7, rand(0, 6)); }
    // parked cars you can drive
    this.cars = [];
    for (let k = 0; k < 10; k++) { const c = -HALF + Math.floor(rand(1, N)) * BLK, p = rand(-HALF + 10, HALF - 10), alongX = Math.random() < 0.5; const x = alongX ? p : c + 3, z = alongX ? c + 3 : p; const n = pick(['sedan', 'suv', 'hatchback-sports', 'van', 'taxi', 'sedan-sports', 'suv-luxury']); this.cars.push({ n, o: L.model(W('car-kit', n), x, 0, z, 2.3, alongX ? PI / 2 : 0), x, z }); }
    // traffic: cars driving around the outer ring road; they knock you over
    this.traffic = [];
    for (let k = 0; k < 6; k++) { const n = pick(['sedan', 'taxi', 'van', 'truck', 'police', 'delivery']); const o = L.model(W('car-kit', n), 0, 0, 0, 2.3); const b = L.kin(new CANNON.Box(new CANNON.Vec3(1.6, 1.2, 2.8)), 0, 1.2, 0, 'spiky'); this.traffic.push({ o, b, d: k / 6, sp: rand(0.012, 0.018), lane: k % 2 ? -2 : 2 }); }
    // people walking on the pavements
    this.npcs = [];
    for (let k = 0; k < 14; k++) { const o = place('Character', 0, 0, 0, 0.42, 0, L.root); const eq = { skin: pick(['skin-straw', 'skin-mint', 'skin-lemon', 'skin-grape', 'skin-orange', 'skin-melon', 'skin-snow', 'skin-night', 'skin-blue']), head: Math.random() < 0.5 ? pick(['h-crown', 'h-cone', 'h-wizard', 'h-knight']) : undefined, back: Math.random() < 0.3 ? 'k-pack' : undefined }; dress(o, eq); const mixer = new THREE.AnimationMixer(o); const c = M.Character.animations.find((a) => a.name.endsWith('|Walk')); if (c) mixer.clipAction(c).play(); this.npcs.push({ o, mixer, blk: [Math.floor(rand(0, N)), Math.floor(rand(0, N))], d: Math.random(), sp: rand(0.008, 0.014), seen: 0 }); }
    // the statue of the most famous player, in the middle of the city
    this.statue = place('Character', 0, 3, 0, 1.4, PI, L.root); dress(this.statue, { skin: 'film-gold' }); L.model(W('city-kit-roads', 'tile-high'), 0, 0, 0, 4); L.box(0, 1.5, 0, 2, 1.5, 2);
    L.scenery(HALF + 60, -HALF - 60, HALF + 40);
    this.fly = [[0, 40, 60, 0, 0, 0]];
    this.t = 0; this.day = 0.3; this.driving = null; this.job = null; this.inside = null; this.hp = 100; this.dizzy = 0; this.policeT = 0; this.police = [];
  },
  spawn() { const h = Object.keys(life.homes)[0]; const lot = h && this.lots?.find((l) => l.home?.id === h); return lot ? { x: lot.door.x, y: 0.5, z: lot.door.z + 2, facing: 0 } : { x: 17, y: 0.5, z: 40, facing: PI }; },
  playerSpeed() { return this.driving ? 2.6 : 1; },
  hudInfo() { return { value: '💰' + save.coins, label: '❤ ' + Math.round(this.hp) + ' · ' + '★'.repeat(life.wanted) + '☆'.repeat(5 - life.wanted) + (this.job ? ' · ' + this.job.text : '') }; },
  onFall(r) { const s = this.spawn(); r.reset(s.x, 1, s.z, s.facing); },
  target(r) { return { x: r.pos.x, z: r.pos.z, stop: true }; },
  onFire(r) { r.swing(); this.hitNear(r); },
  update(dt) {
    const p = G.player; if (!p) return; this.t += dt;
    // day and night (a full day lasts 8 minutes)
    this.day = (this.day + dt / 480) % 1; const sunUp = Math.max(0, Math.sin(this.day * PI * 2));
    if (!this.inside) { hemi.intensity = 0.3 + sunUp * 0.8; sun.intensity = 0.2 + sunUp * 1.9; } if (!this.inside) { scene.fog.color.setHSL(0.58, 0.45, 0.12 + sunUp * 0.5); scene.fog.near = 60; scene.fog.far = 260; }
    // traffic and people
    const ring = HALF - 0.01, per = (d) => { d = ((d % 1) + 1) % 1; const s = d * 4, side = Math.floor(s), f = s - side, a = -ring + f * ring * 2; return side === 0 ? [a, -ring, PI / 2] : side === 1 ? [ring, a, 0] : side === 2 ? [-a, ring, -PI / 2] : [-ring, -a, PI]; };
    this.hitCd = Math.max(0, (this.hitCd || 0) - dt);
    for (const c of this.traffic) { if (!this.driving && this.hitCd <= 0 && Math.hypot(c.o.position.x - p.pos.x, c.o.position.z - p.pos.z) < 2.6) { this.hp -= 34; this.hitCd = 1.5; this.killer = t('a car'); sfx.hit?.(); }
      c.d += c.sp * dt; const [x, z, ry] = per(c.d); const ox = Math.cos(ry) * c.lane, oz = -Math.sin(ry) * c.lane; c.o.position.set(x + ox, 0, z + oz); c.o.rotation.y = ry; c.b.position.set(x + ox, 1.2, z + oz); c.b.quaternion.setFromEuler(0, ry, 0); }
    for (const n of this.npcs) { n.mixer.update(dt); n.d += n.sp * dt; const cx = -HALF + BLK / 2 + n.blk[0] * BLK, cz = -HALF + BLK / 2 + n.blk[1] * BLK, h = BLK / 2 - ROAD / 2 - 1.2, s = ((n.d % 1) + 1) % 1 * 4, side = Math.floor(s), f = s - side, a = -h + f * h * 2; const [x, z, ry] = side === 0 ? [a, -h, PI / 2] : side === 1 ? [h, a, 0] : side === 2 ? [-a, h, -PI / 2] : [-h, -a, PI]; n.o.position.set(cx + x, 0, cz + z); n.o.rotation.y = ry; }
    // the hero's car follows the hero while driving
    if (this.driving) { const c = this.driving; c.o.position.set(p.pos.x, 0, p.pos.z); c.o.rotation.y = p.facing; p.root.visible = false; }
    // interaction prompt
    const near = this.nearest(p); ctx.showAct(near ? near.label : null);
    if (this.dizzy > 0) { this.dizzy -= dt; p.confuse(0.2); }
    this.carryUpdate(dt, p); this.jobUpdate(dt, p); this.crimeUpdate(dt, p); this.bizUpdate(dt);
    if (this.hp <= 0) this.die(this.killer || t('a car'));
  },
  cleanup() { hemi.intensity = 1.35; sun.intensity = 2.6; scene.fog.color.setHex(0xbfe6ff); scene.fog.near = 150; scene.fog.far = 420; ctx?.showAct(null); },
  // ---------------------------------------------------------------- interacting
  nearest(p) {
    const pp = p.pos; let best = null, bd = 3.2;
    const add = (d, label, fn) => { if (d < bd) { bd = d; best = { label, fn }; } };
    if (this.inside) { add(Math.hypot(pp.x - this.inside.exit.x, pp.z - this.inside.exit.z), t('Go outside'), () => this.leave()); for (const l of this.inside.loot || []) if (!l.taken) add(Math.hypot(pp.x - l.x, pp.z - l.z), t('Take it'), () => this.steal(l)); if (this.inside.mine) add(Math.hypot(pp.x - this.inside.cx, pp.z - this.inside.cz) < 9 ? 3 : 9, t('Decorate'), () => this.decorate()); return best; }
    if (this.driving) return { label: t('Get out of the car'), fn: () => this.exitCar() };
    for (const c of this.cars) add(Math.hypot(pp.x - c.o.position.x, pp.z - c.o.position.z) - 1, t('Drive'), () => this.enterCar(c));
    for (const d of this.doors) {
      const dd = Math.hypot(pp.x - d.x, pp.z - d.z), lot = d.lot;
      if (lot.role?.startsWith('shop:')) add(dd, { 'shop:food': t('Restaurant'), 'shop:drink': t('Drinks shop'), 'shop:clothes': t('Clothes shop'), 'shop:furniture': t('Furniture shop') }[lot.role], () => this.shop(lot.role.slice(5)));
      else if (lot.role === 'estate') add(dd, t('Homes for sale'), () => this.estate());
      else if (lot.role === 'stadium') add(dd, t('Stadium'), () => this.stadium());
      else if (lot.role === 'depot') add(dd, t('Jobs'), () => this.jobs());
      else if (lot.role === 'airport') add(dd, t('Airport'), () => this.travel());
      else if (lot.role === 'bank') add(dd, t('Business'), () => this.business());
      else if (lot.role === 'police') add(dd, t('Police station'), () => this.policeDesk());
      else if (lot.home) { const h = lot.home, mine = !!life.homes[h.id]; if (mine) add(dd, t('Go home'), () => this.enter(lot, true)); else if (h.unlocked) add(dd, t('The door is open...'), () => this.enter(lot, false)); else if (h.owner) add(dd + 0.5, t('Climb in through the window'), () => this.climbIn(lot)); }
    }
    return best;
  },
  act() { const n = this.nearest(G.player); if (n) n.fn(); },
  hitNear(r) {
    // punching people is a crime too
    for (const n of this.npcs) if (Math.hypot(n.o.position.x - r.pos.x, n.o.position.z - r.pos.z) < 1.8) { this.crime(2, true); fx.burst(V(n.o.position.x, 1, n.o.position.z), 0x2ec45a, 8, 4); n.sp *= 2.5; }
    const rv = this.revengeTarget; if (rv && !rv.dead && Math.hypot(rv.o.position.x - r.pos.x, rv.o.position.z - r.pos.z) < 2) { rv.hp--; fx.burst(V(rv.o.position.x, 1, rv.o.position.z), 0x111111, 10, 4); if (rv.hp <= 0) { rv.dead = true; rv.o.rotation.x = -PI / 2; life.revenge = null; save.coins += 1500; saveLife(); toast(t('Revenge! +1500 coins'), 3); } }
  },
  // ---------------------------------------------------------------- cars
  enterCar(c) { this.driving = c; G.player.root.visible = false; sfx.click(); toast(t('Driving! Press the action button to get out'), 2); },
  exitCar() { const c = this.driving; this.driving = null; G.player.root.visible = true; const p = G.player.pos; c.o.position.set(p.x, 0, p.z); G.player.reset(p.x + 2.5, 0.5, p.z, G.player.facing); },
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
      save.coins -= pr; life.homes[id] = { furnished: l.home.furnished, items: [] }; saveLife(); sfx.win(); toast(t('You bought a home! You will wake up here'), 3);
    });
  },
  // ---------------------------------------------------------------- inside buildings
  async enter(lot, mine) {
    const L = this.L, cx = 400 + Object.keys(this.homes).length * 30, cz = 400; await need(['furniture-kit/wall', 'furniture-kit/floorFull', 'furniture-kit/wallDoorway', ...FURNISHED.map((f) => 'furniture-kit/' + f[0]), ...FURN.map((n) => 'furniture-kit/' + n), ...LOOT.map((n) => 'furniture-kit/' + n)]);
    const g = new THREE.Group(); L.root.add(g); const fs = 1.6;
    const fl = []; for (let x = -5.6; x < 5.6; x += 1.6) for (let z = -4.6; z < 5.2; z += 1.6) fl.push({ x: cx + x, y: 0, z: cz + z, s: fs }); // floor tiles start at their corner
    L.box(cx, -0.5, cz, 6, 0.5, 5.5); for (const [x, z, hx, hz] of [[0, -4.6, 6, 0.2], [0, 5.2, 6, 0.2], [-5.6, 0, 0.2, 5.5], [5.6, 0, 0.2, 5.5]]) { L.box(cx + x, 1.6, cz + z, hx, 1.6, hz); }
    const wsz = [fs, 2.6, fs];
    for (let x = -5.6; x <= 5.61; x += 1.6) { place(W('furniture-kit', 'wall'), cx + x, 0, cz - 4.6, wsz, 0, g); place(W('furniture-kit', Math.abs(x) < 0.9 ? 'wallDoorway' : 'wall'), cx + x, 0, cz + 5.2, wsz, PI, g); }
    for (let z = -4.6; z <= 5.21; z += 1.6) { place(W('furniture-kit', 'wall'), cx - 5.6, 0, cz + z, wsz, PI / 2, g); place(W('furniture-kit', 'wall'), cx + 5.6, 0, cz + z, wsz, -PI / 2, g); }
    const ceil = []; for (let x = -5.6; x < 5.6; x += 1.6) for (let z = -4.6; z < 5.2; z += 1.6) ceil.push({ x: cx + x, y: 3.6, z: cz + z + 1.6, s: fs, rx: PI }); instanced(W('furniture-kit', 'floorFull'), [...fl, ...ceil], g);
    // inside you only see the room: the sea, the sky and the city outside are hidden
    this.outside = { bg: scene.background }; sky.visible = false; sea.visible = false; scene.background = new THREE.Color(0x1c1410); scene.fog.near = 1e4; scene.fog.far = 2e4; L.root.children.forEach((c) => { if (c !== g && !c.isLight) { c.userData.wasVis = c.visible; c.visible = false; } });
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
  leave() { const i = this.inside; const cl = this.carry?.loot; if (cl && !cl.taken) { this.steal(cl); } this.drop(true); i.g.removeFromParent(); this.inside = null; if (this.outside) { sky.visible = true; sea.visible = true; scene.background = this.outside.bg; scene.fog.near = 60; scene.fog.far = 260; this.L.root.children.forEach((c) => { if (c.userData.wasVis !== undefined) { c.visible = c.userData.wasVis; delete c.userData.wasVis; } }); } if (this.saveLight) { [hemi.intensity, sun.intensity] = this.saveLight; hemi.groundColor.setHex(this.saveLight[2]); if (this.exp) renderer.toneMappingExposure = this.exp; } G.player.reset(i.lot.door.x, 0.5, i.lot.door.z + (i.lot.ry === 0 ? 1.5 : -1.5), 0); },
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
        const heavy = !LIGHT.test(best.n), strong = this.hp >= 70 && (p.food === 'power' || p.perk === 'heavy' || life.buff?.kind === 'power');
        // light: carried in your hands; heavy: lifted with both arms if you are strong, otherwise dragged along the floor
        this.carry = { ...best, heavy, how: !heavy ? 'hold' : strong ? 'lift' : 'drag' }; p.carrying = this.carry.how === 'hold' ? true : this.carry.how; sfx.pickup?.();
        if (heavy && !strong) toast(t('Too heavy to lift: you drag it (eat power food to lift it)'), 2.2);
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
    // police cars chase you when you are wanted
    while (this.police.length < life.wanted && !this.inside) { const a = rand(0, PI * 2), o = place(W('car-kit', 'police'), p.pos.x + Math.cos(a) * 75, 0, p.pos.z + Math.sin(a) * 75, 2.3, 0, this.L.root); this.police.push({ o }); sfx.beep(); }
    for (const c of this.police) {
      const dx = p.pos.x - c.o.position.x, dz = p.pos.z - c.o.position.z, d = Math.hypot(dx, dz) || 1, sp = 8.5 + life.wanted * 1.2; // a bit slower than a car, so you can get away by driving
      if (!this.inside) { c.o.position.x += dx / d * sp * dt; c.o.position.z += dz / d * sp * dt; c.o.rotation.y = Math.atan2(dx, dz); }
      if (d < 2.6 && !this.inside) { this.arrest(); break; }
    }
    if (life.wanted > 0 && !this.police.some((c) => Math.hypot(p.pos.x - c.o.position.x, p.pos.z - c.o.position.z) < 60)) { this.calm = (this.calm || 0) + dt; if (this.calm > 40) { life.wanted--; this.calm = 0; this.police.pop()?.o.removeFromParent(); saveLife(); } } else this.calm = 0;
  },
  arrest() {
    const fine = Math.min(save.coins, 300 * life.wanted); save.coins -= fine; life.wanted = 0; life.evidence = 0; for (const c of this.police) c.o.removeFromParent(); this.police = []; saveLife();
    toast(t('Arrested! You paid a {n} coin fine', { n: fine }), 3.5); const s = this.lots.find((l) => l.role === 'police'); if (s) G.player.reset(s.door.x, 0.5, s.door.z + 2, 0);
  },
  policeDesk() { ctx.panel(t('Police station'), [{ id: 'turn', name: t('Turn yourself in'), sub: t('Pay a smaller fine and clear your wanted level'), price: 150 * life.wanted }], () => { const fine = Math.min(save.coins, 150 * life.wanted); save.coins -= fine; life.wanted = 0; life.evidence = 0; this.police.forEach((c) => c.o.removeFromParent()); this.police = []; saveLife(); toast(t('Your record is clean'), 2); }); },
  // ---------------------------------------------------------------- permadeath and revenge
  die(by) {
    life.deaths++; life.hall.push({ name: life.name, fame: life.fame, by, at: Date.now() }); life.revenge = { by }; life.homes = {}; life.furn = []; life.buff = null; life.wanted = 0; life.fame = 0; life.biz = {}; life.name = pick(['Bolt', 'Zap', 'Dash', 'Volt', 'Spark', 'Flash']) + ' ' + (life.deaths + 1);
    saveLife(); this.hp = 100; this.killer = null; toast(t('You died. A new life begins... and a revenge file is open'), 4); const s = this.spawn(); G.player.reset(s.x, 1, s.z, 0);
    // the one who killed you walks the city now; find him and beat him
    const o = place('Character', s.x + rand(-60, 60), 0, s.z + rand(-60, 60), 0.5, 0, this.L.root); dress(o, { skin: 'film-black', face: 'f-sun' }); this.revengeTarget = { o, hp: 5 };
  },
  // ---------------------------------------------------------------- jobs
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
    else if (id === 'police') { const o = place('Character', p.pos.x + 25, 0, p.pos.z + 25, 0.42, 0, this.L.root); dress(o, { skin: 'mon-vamp', face: 'f-sun' }); this.job = { id, text: t('Catch the thief'), thief: o, time: 90, pay: 300 }; }
    else if (id === 'pro') { ctx.goPlay('show'); return; }
    sfx.click(); toast(this.job.text, 2);
  },
  jobUpdate(dt, p) {
    const j = this.job; if (!j) return; j.time -= dt; j.text = j.text.replace(/ \(\d+s\)$/, '') + ` (${Math.max(0, Math.ceil(j.time))}s)`;
    const at = (d) => Math.hypot(p.pos.x - d.x, p.pos.z - d.z) < 3.5;
    if (j.mark) { j.mark.rotation.y += dt * 2; j.mark.position.y = 2 + Math.sin(this.t * 3) * 0.3; }
    if (j.id === 'delivery' && at(j.to)) this.jobDone();
    if (j.id === 'taxi') { if (!this.driving) j.text = t('Get in a car first') + ` (${Math.ceil(j.time)}s)`; else if (j.stage === 0 && at(j.from)) { j.stage = 1; j.mark.position.set(j.to.x, 2, j.to.z); toast(t('Passenger on board! Drive to the star'), 2); } else if (j.stage === 1 && at(j.to)) this.jobDone(); }
    if (j.id === 'shop') { j.serveT -= dt; if (j.serveT <= 0) { j.serveT = 2.5; ctx.showAct(t('Serve!')); this.serving = true; } }
    if (j.id === 'police') { const o = j.thief.position, dx = o.x - p.pos.x, dz = o.z - p.pos.z, d = Math.hypot(dx, dz) || 1; o.x += dx / d * 6.5 * dt; o.z += dz / d * 6.5 * dt; o.x = clamp(o.x, -HALF, HALF); o.z = clamp(o.z, -HALF, HALF); o.y = 0; if (d < 1.8) { j.thief.removeFromParent(); this.jobDone(); } }
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
    for (const l of lots) { const id = `b${l.i}${l.j}${dx(l)}`, b = life.biz[id]; list.push({ id, name: b ? (b.done ? t('Your {x} (earning)', { x: b.kind }) : t('Building your {x}...', { x: b.kind })) : t('Land for sale'), sub: b ? (b.done ? t('Collect your earnings') : '') : t('Buy the land, then build an arena, cinema or restaurant'), price: b ? 0 : 5000 }); }
    ctx.panel(t('Business'), list, (id) => {
      const b = life.biz[id];
      if (!b) { if (save.coins < 5000) return toast(t('Need {n} more', { n: 5000 - save.coins })); save.coins -= 5000; life.biz[id] = { kind: pick([t('Arena'), t('Cinema'), t('Restaurant')]), start: Date.now(), done: false, last: Date.now() }; toast(t('Construction started! Come back in 10 minutes'), 3); }
      else if (b.done) { const h = (Date.now() - b.last) / 3600000, earn = Math.floor(h * 600); save.coins += earn; b.last = Date.now(); life.fame += 2; toast(t('You collected {n} coins', { n: earn }), 2.5); }
      saveLife();
    });
  },
  bizUpdate() { for (const b of Object.values(life.biz)) if (!b.done && Date.now() - b.start > 600000) { b.done = true; b.last = Date.now(); toast(t('Your {x} is open!', { x: b.kind }), 3); saveLife(); } },
};
export const WORLD_MODELS = [...'abcdefghijklmn'.split('').map((c) => 'city-kit-commercial/building-' + c), ...['a', 'b', 'c', 'd', 'e'].map((c) => 'city-kit-commercial/building-skyscraper-' + c), ...'abcdefghijklmnopqrstu'.split('').map((c) => 'city-kit-suburban/building-type-' + c),
  'city-kit-suburban/planter', 'city-kit-suburban/tree-large', 'city-kit-suburban/tree-small', 'city-kit-roads/road-straight', 'city-kit-roads/light-square', 'city-kit-roads/tile-high',
  ...['sedan', 'suv', 'hatchback-sports', 'van', 'taxi', 'sedan-sports', 'suv-luxury', 'truck', 'police', 'delivery'].map((n) => 'car-kit/' + n)];
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
