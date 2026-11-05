// Skins, accessories, bats and how they attach to the character.
import { THREE, M, SkeletonUtils, renderer, scene, V, PI, pick, rand, save } from './core.js';
import { t } from './i18n.js';

export const SLOTS = ['head', 'face', 'body', 'back'];
export const SKINS = [
  { id: 'skin-blue', name: t('Classic Blue'), price: 0 },
  { id: 'skin-straw', name: t('Strawberry'), price: 60, colors: { Main: 0xff4f9a, Main2: 0xffd3e6, Main_Light: 0xffd9a8 } },
  { id: 'skin-mint', name: t('Mint'), price: 60, colors: { Main: 0x1fc98e, Main2: 0xd2fbea } },
  { id: 'skin-lemon', name: t('Lemon'), price: 60, colors: { Main: 0xffcc1f, Main2: 0xfff6cf, Main_Light: 0xff9f43 } },
  { id: 'skin-grape', name: t('Grape'), price: 80, colors: { Main: 0x8a5cff, Main2: 0xe6dbff } },
  { id: 'skin-orange', name: t('Orange'), price: 80, colors: { Main: 0xff7a2f, Main2: 0xffe1cb } },
  { id: 'skin-melon', name: t('Melon'), price: 120, colors: { Main: 0x2a9d4b, Main2: 0xff5f7a, Main_Light: 0xffe3a3 } },
  { id: 'skin-snow', name: t('Snow'), price: 150, colors: { Main: 0xf2f6ff, Main2: 0xbfe6ff, Main_Light: 0x8ccfff } },
  { id: 'skin-night', name: t('Midnight'), price: 180, colors: { Main: 0x262c62, Main2: 0x5867c4, Main_Light: 0xffd23f } },
  { id: 'skin-lava', name: t('Lava'), price: 220, colors: { Main: 0xd8261c, Main2: 0xff9a3d, Main_Light: 0xffc94a } },
  // rare looks of the same character: special materials plus their own effects
  { id: 'skin-crystal', name: t('Crystal'), price: 8000, rare: t('Rare'), fx: 'crystal', colors: { Main: 0x9feaff, Main2: 0xe8fbff, Main_Light: 0xc9f3ff },
    mat: { Main: { metal: 0.1, rough: 0.04, emi: 0x2aa8ff, ei: 0.35, op: 0.82 }, Main2: { rough: 0.05, emi: 0x9fe8ff, ei: 0.3 }, Main_Light: { rough: 0.05, emi: 0x7fdcff, ei: 0.4 } } },
  { id: 'skin-rainbow', name: t('Rainbow'), price: 8000, rare: t('Rare'), fx: 'rainbow', colors: { Main: 0xff4f9a, Main2: 0xffffff },
    mat: { Main: { rough: 0.3, emi: 0xffffff, ei: 0.15 } } },
  { id: 'skin-lava', name: t('Molten Lava'), price: 15000, rare: t('Legendary'), fx: 'lava', colors: { Main: 0x2a0a05, Main2: 0xff5a1f, Main_Light: 0xffb02e },
    mat: { Main: { rough: 0.85 }, Main2: { emi: 0xff4a10, ei: 2.2 }, Main_Light: { emi: 0xff8a20, ei: 1.1 } } },
  { id: 'skin-galaxy', name: t('Galaxy'), price: 15000, rare: t('Legendary'), fx: 'galaxy', colors: { Main: 0x1b1250, Main2: 0x6a4cff, Main_Light: 0xfff2c4 },
    mat: { Main: { metal: 0.4, rough: 0.25, emi: 0x2a1a8a, ei: 0.5 }, Main2: { emi: 0x8a6cff, ei: 1.2 }, Main_Light: { emi: 0xfff2c4, ei: 0.3 } } },
  { id: 'skin-radiant', name: t('Radiant Gold'), price: 25000, rare: t('Legendary'), fx: 'gold', colors: { Main: 0xffc21a, Main2: 0xffe27a, Main_Light: 0xfff1b8 },
    mat: { Main: { metal: 1, rough: 0.18, emi: 0x7a4a00, ei: 0.45 }, Main2: { metal: 1, rough: 0.15, emi: 0x8a6a10, ei: 0.4 }, Main_Light: { metal: 0.9, rough: 0.2, emi: 0x8a7a40, ei: 0.3 } } },
  { id: 'skin-void', name: t('Black Hole'), price: 50000, rare: t('Mythic'), fx: 'void', colors: { Main: 0x050409, Main2: 0x14082a, Main_Light: 0x2a0f55 },
    mat: { Main: { metal: 0.6, rough: 0.2 }, Main2: { emi: 0x6a1cff, ei: 1.6 }, Main_Light: { emi: 0x9a4cff, ei: 2.2 } } },
  // the series cast (hidden from the shop): normal face unless said otherwise; Gold is gold all over, face included
  { id: 'film-yellow', name: 'Yellow', price: 0, hidden: true, colors: { Main: 0xffe14a, Main2: 0xffffff }, mat: { Main: { metal: 0, rough: 0.95 }, Main2: { rough: 0.95 } } },
  { id: 'film-gold', name: 'Gold', price: 0, hidden: true, fx: 'gold', colors: { Main: 0xe8b600, Main2: 0xffd94a, Main_Light: 0xe8b600 },
    mat: { Main: { metal: 1, rough: 0.22, emi: 0x5a3600, ei: 0.25 }, Main2: { metal: 1, rough: 0.2, emi: 0x6a5010, ei: 0.22 }, Main_Light: { metal: 1, rough: 0.22, emi: 0x5a3600, ei: 0.25 } } },
  { id: 'film-brown', name: 'Brown', price: 0, hidden: true, colors: { Main: 0x7a4a2a, Main2: 0xd9b48c } },
  { id: 'film-black', name: 'Black', price: 0, hidden: true, colors: { Main: 0x1e1e24, Main2: 0x50505c } },
  { id: 'film-white', name: 'White', price: 0, hidden: true, colors: { Main: 0xf4f4f8, Main2: 0xc9ccd8 } },
  { id: 'film-orange', name: 'Orange', price: 0, hidden: true, colors: { Main: 0xff7a1a, Main2: 0xffe1cb } },
  { id: 'film-red', name: 'Red', price: 0, hidden: true, colors: { Main: 0xd7263d, Main2: 0xffc2c8 } },
  { id: 'film-vio', name: 'Vio', price: 0, hidden: true, colors: { Main: 0x6a3fd1, Main2: 0xe2d8ff } },
  { id: 'film-minto', name: 'Minto', price: 0, hidden: true, colors: { Main: 0x4be3a0, Main2: 0xdcfff0 } },
  { id: 'film-silver', name: 'Silver', price: 0, hidden: true, colors: { Main: 0xa9adb8, Main2: 0xe6e8ee } },
  { id: 'film-slate', name: 'Slate', price: 0, hidden: true, colors: { Main: 0x4a4f5c, Main2: 0x8a90a0 } },
  { id: 'film-olive', name: 'Olive', price: 0, hidden: true, colors: { Main: 0x7b7d3a, Main2: 0xd6d7a8 } },
  { id: 'skin-ref', name: t('Referee'), price: 0, hidden: true, colors: { Main: 0xffffff, Main2: 0xe8202a, Main_Light: 0xffe0c0 } },
  { id: 'skin-bolt', name: t('Original Bolt'), price: 0, rare: t('Exclusive'), secret: true, fx: 'bolt', colors: { Main: 0xffc21a, Main2: 0x08050f, Main_Light: 0x2a0f55 },
    mat: { Main: { metal: 1, rough: 0.16, emi: 0x7a4a00, ei: 0.5 }, Main2: { emi: 0x7a2cff, ei: 1.8 }, Main_Light: { emi: 0xb06cff, ei: 2.4 } } },
].map((s) => ({ ...s, slot: 'skin' }));

// offsets are in the character's own units, measured from the Head / Torso bones
export const ACCS = [
  { id: 'h-crown', slot: 'head', name: t('Gold Crown'), price: 150, model: 'acc/Crown', bone: 'Head', s: 0.95, p: [0, 1.3, 0] },
  { id: 'h-queen', slot: 'head', name: t('Queen\'s Crown'), price: 200, model: 'acc/Crown2', bone: 'Head', s: 0.95, p: [0, 1.3, 0] },
  { id: 'h-cone', slot: 'head', name: t('Party Hat'), price: 80, model: 'acc/ice-cream', bone: 'Head', s: 2.0, p: [0, 2.15, 0], r: [PI, 0, 0] },
  { id: 'h-cupcake', slot: 'head', name: t('Cupcake'), price: 100, model: 'acc/cupcake', bone: 'Head', s: 2.0, p: [0, 1.2, 0] },
  { id: 'h-donut', slot: 'head', name: t('Donut'), price: 90, model: 'acc/donut-sprinkles', bone: 'Head', s: 2.8, p: [0, 1.26, 0] },
  { id: 'h-gift', slot: 'head', name: t('Gift Box'), price: 120, model: 'acc/present-a-cube', bone: 'Head', s: 1.4, p: [0, 1.2, 0] },
  { id: 'f-glasses', slot: 'face', name: t('Glasses'), price: 60, model: 'acc/aid-glasses', bone: 'Head', s: 4.2, p: [0, 0.3, 0.95] },
  { id: 'f-sun', slot: 'face', name: t('Sunglasses'), price: 90, model: 'acc/aid-sunglasses', bone: 'Head', s: 4.2, p: [0, 0.3, 0.95] },
  { id: 'b-vest', slot: 'body', name: t('Leather Vest'), price: 120, model: 'acc/Armor_Leather', bone: 'Torso', s: 1.45, p: [0, 0.15, 0.05] },
  { id: 'b-iron', slot: 'body', name: t('Iron Armor'), price: 160, model: 'acc/Armor_Metal', bone: 'Torso', s: 1.0, p: [0, 0.15, 0.05] },
  { id: 'b-ninja', slot: 'body', name: t('Ninja Armor'), price: 250, model: 'acc/Armor_Black', bone: 'Torso', s: 0.95, p: [0, 0.15, 0.05] },
  { id: 'b-gold', slot: 'body', name: t('Gold Armor'), price: 350, model: 'acc/Armor_Golden', bone: 'Torso', s: 0.95, p: [0, 0.15, 0.05] },
  { id: 'b-star', slot: 'body', name: t('Hero Star'), price: 70, model: 'acc/StarBadge', bone: 'Torso', s: 0.35, p: [0, 0.2, 0.55] },
  { id: 'k-pack', slot: 'back', name: t('Backpack'), price: 100, model: 'acc/Backpack', bone: 'Torso', s: 1.0, p: [0, 0.1, -0.6] },
  { id: 'k-bag', slot: 'back', name: t('Side Bag'), price: 70, model: 'acc/Bag', bone: 'Torso', s: 0.8, p: [0.65, -0.1, 0] },
  { id: 'k-wood', slot: 'back', name: t('Wooden Shield'), price: 130, model: 'acc/Shield_Round', bone: 'Torso', s: 0.6, p: [0, 0.15, -0.65], r: [0, PI, 0] },
  { id: 'k-knight', slot: 'back', name: t('Knight Shield'), price: 180, model: 'acc/Shield_Heater', bone: 'Torso', s: 0.5, p: [0, 0.1, -0.62], r: [0, PI, 0] },
];

// bats: power / speed / reach are 1..5. axis = long axis of the model, grip = which end the hand holds (+1 max end, -1 min end)
export const BATS = [
  { id: 'bat-golf', name: t('Golf Club'), price: 0, model: 'k/club-red', axis: 'y', grip: 1, len: 2.4, power: 3, speed: 3, reach: 3, special: 'balanced', desc: t('Balanced at everything') },
  { id: 'bat-bread', name: t('Baguette'), price: 80, model: 'k/loaf-baguette', axis: 'x', grip: 1, len: 2.2, power: 2, speed: 5, reach: 3, special: 'fast', desc: t('Fastest swing') },
  { id: 'bat-spatula', name: t('Spatula'), price: 90, model: 'k/cooking-spatula', axis: 'x', grip: 1, len: 2.2, power: 2, speed: 4, reach: 2, special: 'lob', desc: t('Lobs the ball up high') },
  { id: 'bat-pin', name: t('Rolling Pin'), price: 100, model: 'k/rollingPin', axis: 'x', grip: 1, len: 2.2, power: 3, speed: 4, reach: 3, special: 'ground', desc: t('Keeps the ball on the ground') },
  { id: 'bat-corndog', name: t('Corn Dog'), price: 100, model: 'k/corn-dog', axis: 'x', grip: 1, len: 2.2, power: 3, speed: 3, reach: 3, special: 'sticky', desc: t('Whoever you hit gets stuck for a second') },
  { id: 'bat-bone', name: t('Bone'), price: 120, model: 'k/q_Bone', axis: 'x', grip: 1, len: 2.2, power: 3, speed: 4, reach: 3, special: 'bounce', desc: t('Makes the ball bounce high') },
  { id: 'bat-fish', name: t('Fish'), price: 130, model: 'k/fish', axis: 'z', grip: -1, len: 2.3, power: 2, speed: 4, reach: 4, special: 'slip', desc: t('Whoever you hit slips') },
  { id: 'bat-banana', name: t('Banana'), price: 140, model: 'k/item-banana', axis: 'y', grip: 1, len: 1.7, power: 3, speed: 4, reach: 2, special: 'banana', desc: t('Whoever you hit slips and spins') },
  { id: 'bat-cane', name: t('Candy Cane'), price: 150, model: 'k/candy-cane-red', axis: 'y', grip: -1, len: 2.4, power: 3, speed: 3, reach: 4, special: 'curve', desc: t('Curves the ball') },
  { id: 'bat-paddle', name: t('Paddle'), price: 150, model: 'k/tool-paddle', axis: 'y', grip: 1, len: 3.0, power: 3, speed: 2, reach: 5, special: 'reach', desc: t('Longest reach') },
  { id: 'bat-pan', name: t('Frying Pan'), price: 200, model: 'k/frying-pan', axis: 'z', grip: 1, len: 2.3, power: 4, speed: 2, reach: 3, special: 'stun', desc: t('BONG! Whoever you hit gets dizzy') },
  { id: 'bat-hammer', name: t('Hammer'), price: 220, model: 'k/tool-hammer', axis: 'y', grip: -1, len: 2.3, power: 4, speed: 3, reach: 3, special: 'slam', desc: t('Smashes everyone around you away') },
  { id: 'bat-club', name: t('Club'), price: 250, model: 'k/q_Club', axis: 'y', grip: -1, len: 2.6, power: 5, speed: 1, reach: 3, special: 'power', desc: t('Strongest hit') },
  { id: 'bat-gold', name: t('Golden Hammer'), price: 500, model: 'k/q_Hammer_Double_Golden', axis: 'y', grip: -1, len: 2.6, power: 5, speed: 4, reach: 4, special: 'legend', desc: t('The legendary one') },
].map((b) => ({ ...b, slot: 'bat' }));

export const ITEMS = [...SKINS, ...ACCS, ...BATS];
// the old plain gold skin was replaced by the radiant one: refund anyone who bought it
if (save.owned.includes('skin-gold')) { save.owned = save.owned.filter((i) => i !== 'skin-gold'); save.coins += 400; if (save.equip.skin === 'skin-gold') save.equip.skin = 'skin-blue'; }
export const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const CATS = [['rare', t('Rare')], ['skin', t('Colors')], ['head', t('Head')], ['face', t('Face')], ['body', t('Body')], ['back', t('Back')], ['bat', t('Bats')]];

// bone frames at rest, so attachments line up with the model's own axes
export const BONE_FIX = {};
export function computeBoneFix() {
  const m = SkeletonUtils.clone(M.Character.scene);
  const mx = new THREE.AnimationMixer(m);
  mx.clipAction(M.Character.animations.find((a) => a.name.endsWith('|Idle'))).play(); mx.update(0.3);
  m.updateMatrixWorld(true);
  m.traverse((o) => {
    if (!o.isBone || !['Head', 'Torso', 'FistR'].includes(o.name)) return;
    BONE_FIX[o.name] = { s: 1 / o.getWorldScale(new THREE.Vector3()).x, q: o.getWorldQuaternion(new THREE.Quaternion()).invert() };
  });
}

// normalise a long item so its grip sits at the origin and it points along +Y, `len` long (character units)
export function gripModel(name, axis, grip, len) {
  const o = M[name].scene.clone();
  const wrap = new THREE.Group(), inner = new THREE.Group(); inner.add(o); wrap.add(inner);
  const box = new THREE.Box3().setFromObject(o), size = box.getSize(V()), k = { x: 0, y: 1, z: 2 }[axis];
  const long = size.getComponent(k), s = len / long;
  o.scale.setScalar(s);
  const c = box.getCenter(V()).multiplyScalar(s), end = (grip > 0 ? box.max : box.min).getComponent(k) * s;
  const off = c.clone(); off.setComponent(k, end); o.position.sub(off);
  // rotate the long axis to +Y with the head pointing away from the grip
  const dir = V(); dir.setComponent(k, -grip);
  inner.quaternion.setFromUnitVectors(dir, V(0, 1, 0));
  return wrap;
}
export const HAND = { p: [0, 0.05, 0.1], r: [0.55, 0, 0] }; // items point up and a little forward; swings rotate this frame

export function dress(model, equip, opts = {}) {
  const u = model.userData;
  if (!u.mats) {
    u.mats = {}; u.bones = {}; u.acc = {};
    model.traverse((o) => {
      if (o.isBone) u.bones[o.name] = o;
      if (o.isMesh && o.material) {
        const n = o.material.name;
        if (!u.mats[n]) u.mats[n] = { mat: o.material.clone(), base: o.material.color.clone() };
        o.material = u.mats[n].mat;
      }
    });
  }
  u.equip = { ...equip };
  paint(model);
  for (const slot of SLOTS) {
    const id = equip[slot] || null;
    if (u.acc[slot]?.id === id) continue;
    if (u.acc[slot]) { u.acc[slot].obj.removeFromParent(); delete u.acc[slot]; }
    if (!id || !ITEM[id]) continue;
    const it = ITEM[id];
    const o = M[it.model].scene.clone();
    if (Array.isArray(it.s)) o.scale.set(...it.s); else o.scale.setScalar(it.s); o.position.set(...it.p); if (it.r) o.rotation.set(...it.r);
    u.acc[slot] = { id, obj: attach(model, it.bone, o) };
  }
  holdItem(model, opts.bat && equip.bat ? 'bat:' + equip.bat : null);
}
export function paint(model, tint) {
  const u = model.userData; const skin = ITEM[u.equip?.skin] || ITEM['skin-blue'];
  for (const [n, rec] of Object.entries(u.mats)) {
    const c = skin.colors?.[n], m = rec.mat, o = skin.mat?.[n] || {};
    if (c != null) m.color.setHex(c); else m.color.copy(rec.base);
    if (rec.base0 == null) rec.base0 = { metal: m.metalness, rough: m.roughness };
    m.metalness = o.metal ?? rec.base0.metal; m.roughness = o.rough ?? rec.base0.rough;
    if (!m.emissive) m.emissive = new THREE.Color(0);
    m.emissive.setHex(o.emi ?? 0); m.emissiveIntensity = o.ei ?? 1;
    m.transparent = o.op != null; m.opacity = o.op ?? 1;
    if (tint) m.color.lerp(new THREE.Color(tint), 0.65);
  }
  u.fx = skin.fx || null;
}

// per-frame skin effects: sparkles, orbiting dust, glowing trails, and the gold that spreads under your feet
const goldGeo = new THREE.CircleGeometry(0.55, 6); goldGeo.rotateX(-PI / 2);
const goldMat = new THREE.MeshStandardMaterial({ color: 0xffc21a, metalness: 1, roughness: 0.2, emissive: 0x6a3a00, emissiveIntensity: 0.6, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
let goldPool = null; const goldMarks = [];
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3();
export function skinFx(model, dt, pos, opts = {}) {
  const u = model.userData; if (!u.fx) return;
  u.fxT = (u.fxT || 0) + dt; const t = u.fxT, moving = opts.moving, grounded = opts.grounded !== false;
  const P = opts.puffs; if (!P) return;
  const at = (dx, dy, dz) => V(pos.x + dx, pos.y + dy, pos.z + dz);
  if (u.fx === 'rainbow') { const c = new THREE.Color().setHSL((t * 0.25) % 1, 0.85, 0.55); u.mats.Main?.mat.color.copy(c); if (Math.random() < dt * 10) P.emit({ pos: at(rand(-0.5, 0.5), rand(0.3, 1.8), rand(-0.5, 0.5)), vel: V(0, 0.6, 0), life: 0.6, size: 0.12, color: c.getHex() }); }
  if (u.fx === 'crystal' && Math.random() < dt * 8) P.emit({ pos: at(rand(-0.6, 0.6), rand(0.2, 2), rand(-0.6, 0.6)), vel: V(0, 0.3, 0), life: 0.7, size: 0.1, color: 0xe8fbff });
  if (u.fx === 'lava' && Math.random() < dt * 14) P.emit({ pos: at(rand(-0.4, 0.4), rand(0.3, 1.5), rand(-0.4, 0.4)), vel: V(rand(-0.4, 0.4), rand(1, 2.5), rand(-0.4, 0.4)), life: rand(0.5, 0.9), size: rand(0.08, 0.15), color: [0xff4a10, 0xffb02e, 0xff7a1f][Math.floor(rand(0, 3))] });
  if (u.fx === 'galaxy' && Math.random() < dt * 12) P.emit({ pos: at(rand(-0.8, 0.8), rand(0.2, 2.2), rand(-0.8, 0.8)), vel: V(0, 0.2, 0), life: 0.9, size: rand(0.06, 0.12), color: [0xffffff, 0xbfa8ff, 0x8fd8ff][Math.floor(rand(0, 3))] });
  if (u.fx === 'void' || u.fx === 'bolt') for (let k = 0; k < 2; k++) if (Math.random() < dt * 22) { const a = t * 4 + rand(0, PI * 2), r = rand(0.7, 1.1); P.emit({ pos: at(Math.cos(a) * r, rand(0.3, 1.7), Math.sin(a) * r), vel: V(-Math.sin(a) * 2, 0.2, Math.cos(a) * 2), life: 0.5, size: rand(0.08, 0.16), color: [0x1a0830, 0x7a2cff, 0x3a0f7a][Math.floor(rand(0, 3))] }); }
  if (u.fx === 'gold' || u.fx === 'bolt') {
    if (Math.random() < dt * 10) P.emit({ pos: at(rand(-0.6, 0.6), rand(0.3, 2), rand(-0.6, 0.6)), vel: V(0, 0.5, 0), life: 0.6, size: 0.1, color: 0xfff1b8 });
    u.goldT = (u.goldT || 0) - dt;
    if (moving && grounded && u.goldT <= 0 && opts.scene) { u.goldT = 0.09; goldMark(opts.scene, pos); }
  }
}
function goldMark(sc, pos) {
  if (!goldPool) { goldPool = new THREE.InstancedMesh(goldGeo, goldMat, 160); goldPool.count = 0; goldPool.frustumCulled = false; goldPool.renderOrder = 2; }
  if (goldPool.parent !== sc) sc.add(goldPool);
  if (goldMarks.length >= 160) goldMarks.shift();
  goldMarks.push({ x: pos.x + rand(-0.15, 0.15), y: pos.y + 0.03, z: pos.z + rand(-0.15, 0.15), t: 0, r: rand(0, PI) });
}
export function updateGold(dt) {
  if (!goldPool) return;
  for (const g of goldMarks) g.t += dt;
  while (goldMarks.length && goldMarks[0].t > 2) goldMarks.shift();
  goldMarks.forEach((g, i) => { const k = g.t < 0.15 ? g.t / 0.15 : g.t > 1.6 ? Math.max(0, (2 - g.t) / 0.4) : 1; tmpQ.setFromAxisAngle(V(0, 1, 0), g.r); tmpM.compose(V(g.x, g.y, g.z), tmpQ, tmpS.set(k * 1.3, 1, k * 1.3)); goldPool.setMatrixAt(i, tmpM); });
  goldPool.count = goldMarks.length; goldPool.instanceMatrix.needsUpdate = true;
}
function attach(model, boneName, obj) {
  const u = model.userData, fix = BONE_FIX[boneName], bone = u.bones[boneName];
  const holder = new THREE.Group(); holder.scale.setScalar(fix.s); holder.quaternion.copy(fix.q);
  obj.traverse((x) => { if (x.isMesh) x.castShadow = true; });
  holder.add(obj); bone.add(holder); return holder;
}
// team modes: a pole with the team's flag sticking up from your back
export function teamFlag(model, team) {
  const u = model.userData;
  if (u.flag) { u.flag.removeFromParent(); u.flag = null; }
  if (!team) return;
  const o = M[team === 'blue' ? 'k/flag-large-blue' : 'k/flag-large-red'].scene.clone();
  // green and yellow teams: the red flag with its cloth recoloured
  const tc = { green: 0x2ec45a, yellow: 0xffd23f }[team];
  if (tc) o.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); const c = m.material.color; if (c && c.r > 0.5 && c.g < 0.45) c.setHex(tc); } });
  o.scale.setScalar(3.4); o.position.set(0.15, 0.2, -0.75); o.rotation.set(-0.15, 0, 0);
  u.flag = attach(model, 'Torso', o);
}
// key: 'bat:<id>' or 'gun:<weaponId>' or null
export function holdItem(model, key, gun) {
  const u = model.userData;
  if (u.held?.key === key) return;
  if (u.held) { u.held.obj.removeFromParent(); u.held = null; }
  if (!key) return;
  let item;
  if (key.startsWith('bat:')) { const b = ITEM[key.slice(4)]; item = gripModel(b.model, b.axis, b.grip, b.len); }
  else { item = gripModel(gun.model, 'z', gun.grip ?? 1, gun.len ?? 1.5); }
  const h = new THREE.Group(); h.position.set(...HAND.p); h.rotation.set(...(key.startsWith('gun:') ? [PI / 2, 0, 0] : HAND.r)); h.add(item);
  u.held = { key, obj: attach(model, 'FistR', h), frame: h };
}
export function randomEquip(withBat = true) {
  const e = { skin: pick(SKINS.filter((s) => !s.rare && !s.hidden && s.id !== 'skin-blue')).id };
  for (const slot of SLOTS) if (Math.random() < 0.4) e[slot] = pick(ACCS.filter((a) => a.slot === slot)).id;
  if (withBat) e.bat = pick(BATS).id;
  return e;
}

// thumbnails rendered once from the real 3D models
export const THUMB = {};
const thumbCache = {};
export function makeThumbs() {
  const size = 160, rt = new THREE.WebGLRenderTarget(size, size, { samples: 4 });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const ts = new THREE.Scene(); ts.environment = scene.environment; ts.environmentIntensity = 0.8;
  ts.add(new THREE.HemisphereLight(0xffffff, 0x8899bb, 2.4));
  const dl = new THREE.DirectionalLight(0xffffff, 2.2); dl.position.set(2, 3, 4); ts.add(dl);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  const px = new Uint8Array(size * size * 4), cv = document.createElement('canvas'); cv.width = cv.height = size;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(size, size);
  const shoot = (obj, look, dist, h) => {
    ts.add(obj);
    cam.position.set(look.x + dist * 0.45, look.y + h, look.z + dist); cam.lookAt(look);
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(ts, cam); renderer.setRenderTarget(null);
    renderer.readRenderTargetPixels(rt, 0, 0, size, size, px);
    for (let y = 0; y < size; y++) img.data.set(px.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
    ctx.putImageData(img, 0, 0); ts.remove(obj);
    return cv.toDataURL('image/png');
  };
  const frame = (o, yaw) => {
    const g = new THREE.Group(); g.add(o); g.rotation.y = yaw; g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(g), c = box.getCenter(V()), r = box.getSize(V()).length();
    return shoot(g, c, r * 1.55, r * 0.35);
  };
  for (const it of ITEMS) {
    if (it.slot === 'skin') THUMB[it.id] = skinThumb(it.id, shoot);
    else if (it.slot === 'bat') { const o = gripModel(it.model, it.axis, it.grip, it.len); o.rotation.z = -0.7; THUMB[it.id] = frame(o, 0.3); }
    else { const o = M[it.model].scene.clone(); if (it.r) o.rotation.set(...it.r); THUMB[it.id] = frame(o, it.slot === 'back' ? PI + 0.5 : -0.5); }
  }
  // portraits used by the player list while matchmaking
  THUMB.portrait = (equip) => {
    const key = JSON.stringify(equip);
    if (thumbCache[key]) return thumbCache[key];
    const m = SkeletonUtils.clone(M.Character.scene); dress(m, equip);
    const mx = new THREE.AnimationMixer(m); mx.clipAction(M.Character.animations.find((a) => a.name.endsWith('|Idle'))).play(); mx.update(0.3);
    m.rotation.y = -0.3; renderer.setClearColor(0x000000, 0);
    const url = shoot(m, V(0, 2.5, 0), 4.8, 0.3); renderer.setClearColor(0x000000, 1);
    return (thumbCache[key] = url);
  };
  THUMB._shoot = shoot;
  renderer.setClearColor(0x000000, 1);
}
function skinThumb(id, shoot) {
  const m = SkeletonUtils.clone(M.Character.scene); dress(m, { skin: id });
  const mx = new THREE.AnimationMixer(m); mx.clipAction(M.Character.animations.find((a) => a.name.endsWith('|Idle'))).play(); mx.update(0.3);
  m.rotation.y = -0.35; return shoot(m, V(0, 2.1, 0), 6.2, 0.6);
}
export function equipOf() { return { ...save.equip }; }
