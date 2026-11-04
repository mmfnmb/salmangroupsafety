// Skins, accessories, bats and how they attach to the character.
import { THREE, M, SkeletonUtils, renderer, V, PI, pick, save } from './core.js';

export const SLOTS = ['head', 'face', 'body', 'back'];
export const SKINS = [
  { id: 'skin-blue', name: 'الأزرق الأصلي', price: 0 },
  { id: 'skin-straw', name: 'فراولة', price: 60, colors: { Main: 0xff4f9a, Main2: 0xffd3e6, Main_Light: 0xffd9a8 } },
  { id: 'skin-mint', name: 'نعناع', price: 60, colors: { Main: 0x1fc98e, Main2: 0xd2fbea } },
  { id: 'skin-lemon', name: 'ليمون', price: 60, colors: { Main: 0xffcc1f, Main2: 0xfff6cf, Main_Light: 0xff9f43 } },
  { id: 'skin-grape', name: 'عنب', price: 80, colors: { Main: 0x8a5cff, Main2: 0xe6dbff } },
  { id: 'skin-orange', name: 'برتقانة', price: 80, colors: { Main: 0xff7a2f, Main2: 0xffe1cb } },
  { id: 'skin-melon', name: 'بطيخ', price: 120, colors: { Main: 0x2a9d4b, Main2: 0xff5f7a, Main_Light: 0xffe3a3 } },
  { id: 'skin-snow', name: 'تلج', price: 150, colors: { Main: 0xf2f6ff, Main2: 0xbfe6ff, Main_Light: 0x8ccfff } },
  { id: 'skin-night', name: 'ليل', price: 180, colors: { Main: 0x262c62, Main2: 0x5867c4, Main_Light: 0xffd23f } },
  { id: 'skin-lava', name: 'حمم', price: 220, colors: { Main: 0xd8261c, Main2: 0xff9a3d, Main_Light: 0xffc94a } },
  { id: 'skin-gold', name: 'ذهبي', price: 400, colors: { Main: 0xe3a812, Main2: 0xfff0a8, Main_Light: 0xfff6d6 } },
].map((s) => ({ ...s, slot: 'skin' }));

// offsets are in the character's own units, measured from the Head / Torso bones
export const ACCS = [
  { id: 'h-crown', slot: 'head', name: 'تاج ذهبي', price: 150, model: 'acc/Crown', bone: 'Head', s: 0.95, p: [0, 1.3, 0] },
  { id: 'h-queen', slot: 'head', name: 'تاج الملكة', price: 200, model: 'acc/Crown2', bone: 'Head', s: 0.95, p: [0, 1.3, 0] },
  { id: 'h-cone', slot: 'head', name: 'قبعة الحفلة', price: 80, model: 'acc/ice-cream', bone: 'Head', s: 2.0, p: [0, 2.15, 0], r: [PI, 0, 0] },
  { id: 'h-cupcake', slot: 'head', name: 'كب كيك', price: 100, model: 'acc/cupcake', bone: 'Head', s: 2.0, p: [0, 1.2, 0] },
  { id: 'h-donut', slot: 'head', name: 'دونات', price: 90, model: 'acc/donut-sprinkles', bone: 'Head', s: 2.8, p: [0, 1.26, 0] },
  { id: 'h-gift', slot: 'head', name: 'هدية', price: 120, model: 'acc/present-a-cube', bone: 'Head', s: 1.4, p: [0, 1.2, 0] },
  { id: 'f-glasses', slot: 'face', name: 'نضارة', price: 60, model: 'acc/aid-glasses', bone: 'Head', s: 4.2, p: [0, 0.3, 0.95] },
  { id: 'f-sun', slot: 'face', name: 'نضارة شمس', price: 90, model: 'acc/aid-sunglasses', bone: 'Head', s: 4.2, p: [0, 0.3, 0.95] },
  { id: 'b-vest', slot: 'body', name: 'صديري جلد', price: 120, model: 'acc/Armor_Leather', bone: 'Torso', s: 1.45, p: [0, 0.15, 0.05] },
  { id: 'b-iron', slot: 'body', name: 'درع حديد', price: 160, model: 'acc/Armor_Metal', bone: 'Torso', s: 1.0, p: [0, 0.15, 0.05] },
  { id: 'b-ninja', slot: 'body', name: 'درع النينجا', price: 250, model: 'acc/Armor_Black', bone: 'Torso', s: 0.95, p: [0, 0.15, 0.05] },
  { id: 'b-gold', slot: 'body', name: 'درع ذهبي', price: 350, model: 'acc/Armor_Golden', bone: 'Torso', s: 0.95, p: [0, 0.15, 0.05] },
  { id: 'b-star', slot: 'body', name: 'نجمة البطل', price: 70, model: 'acc/StarBadge', bone: 'Torso', s: 0.35, p: [0, 0.2, 0.55] },
  { id: 'k-pack', slot: 'back', name: 'شنطة رحلات', price: 100, model: 'acc/Backpack', bone: 'Torso', s: 1.0, p: [0, 0.1, -0.6] },
  { id: 'k-bag', slot: 'back', name: 'شنطة جنب', price: 70, model: 'acc/Bag', bone: 'Torso', s: 0.8, p: [0.65, -0.1, 0] },
  { id: 'k-wood', slot: 'back', name: 'درع خشب', price: 130, model: 'acc/Shield_Round', bone: 'Torso', s: 0.6, p: [0, 0.15, -0.65], r: [0, PI, 0] },
  { id: 'k-knight', slot: 'back', name: 'درع الفارس', price: 180, model: 'acc/Shield_Heater', bone: 'Torso', s: 0.5, p: [0, 0.1, -0.62], r: [0, PI, 0] },
];

// bats: power / speed / reach are 1..5. axis = long axis of the model, grip = which end the hand holds (+1 max end, -1 min end)
export const BATS = [
  { id: 'bat-golf', name: 'مضرب الجولف', price: 0, model: 'k/club-red', axis: 'y', grip: 1, len: 2.4, power: 3, speed: 3, reach: 3, special: 'balanced', desc: 'متوازن في كل حاجة' },
  { id: 'bat-bread', name: 'العيش الفينو', price: 80, model: 'k/loaf-baguette', axis: 'x', grip: 1, len: 2.2, power: 2, speed: 5, reach: 3, special: 'fast', desc: 'أسرع ضرب' },
  { id: 'bat-spatula', name: 'السباتولا', price: 90, model: 'k/cooking-spatula', axis: 'x', grip: 1, len: 2.2, power: 2, speed: 4, reach: 2, special: 'lob', desc: 'بتشوّط الكورة لفوق' },
  { id: 'bat-pin', name: 'النشابة', price: 100, model: 'k/rollingPin', axis: 'x', grip: 1, len: 2.2, power: 3, speed: 4, reach: 3, special: 'ground', desc: 'الكورة بتجري على الأرض' },
  { id: 'bat-corndog', name: 'الكورن دوج', price: 100, model: 'k/corn-dog', axis: 'x', grip: 1, len: 2.2, power: 3, speed: 3, reach: 3, special: 'sticky', desc: 'اللي يتخبط يتلزق ثانية' },
  { id: 'bat-bone', name: 'العضمة', price: 120, model: 'k/q_Bone', axis: 'x', grip: 1, len: 2.2, power: 3, speed: 4, reach: 3, special: 'bounce', desc: 'الكورة بتنط عالي' },
  { id: 'bat-fish', name: 'السمكة', price: 130, model: 'k/fish', axis: 'z', grip: -1, len: 2.3, power: 2, speed: 4, reach: 4, special: 'slip', desc: 'اللي يتخبط يتزحلق' },
  { id: 'bat-banana', name: 'الموزة', price: 140, model: 'k/item-banana', axis: 'y', grip: 1, len: 1.7, power: 3, speed: 4, reach: 2, special: 'banana', desc: 'اللي يتخبط يتزحلق ويلف' },
  { id: 'bat-cane', name: 'عصاية الحلاوة', price: 150, model: 'k/candy-cane-red', axis: 'y', grip: -1, len: 2.4, power: 3, speed: 3, reach: 4, special: 'curve', desc: 'الضربة بتلف' },
  { id: 'bat-paddle', name: 'المجداف', price: 150, model: 'k/tool-paddle', axis: 'y', grip: 1, len: 3.0, power: 3, speed: 2, reach: 5, special: 'reach', desc: 'أطول مدى' },
  { id: 'bat-pan', name: 'المقلاية', price: 200, model: 'k/frying-pan', axis: 'z', grip: 1, len: 2.3, power: 4, speed: 2, reach: 3, special: 'stun', desc: 'طننن! اللي يتخبط يدوخ' },
  { id: 'bat-hammer', name: 'المطرقة', price: 220, model: 'k/tool-hammer', axis: 'y', grip: -1, len: 2.3, power: 4, speed: 3, reach: 3, special: 'slam', desc: 'ضربتها تطيّر اللي حواليك' },
  { id: 'bat-club', name: 'الهراوة', price: 250, model: 'k/q_Club', axis: 'y', grip: -1, len: 2.6, power: 5, speed: 1, reach: 3, special: 'power', desc: 'أقوى ضربة' },
  { id: 'bat-gold', name: 'المطرقة الذهبي', price: 500, model: 'k/q_Hammer_Double_Golden', axis: 'y', grip: -1, len: 2.6, power: 5, speed: 4, reach: 4, special: 'legend', desc: 'الأسطورية' },
].map((b) => ({ ...b, slot: 'bat' }));

export const ITEMS = [...SKINS, ...ACCS, ...BATS];
export const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const CATS = [['skin', 'الألوان'], ['head', 'الراس'], ['face', 'الوش'], ['body', 'الجسم'], ['back', 'الضهر'], ['bat', 'المضارب']];

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
    o.scale.setScalar(it.s); o.position.set(...it.p); if (it.r) o.rotation.set(...it.r);
    u.acc[slot] = { id, obj: attach(model, it.bone, o) };
  }
  holdItem(model, opts.bat && equip.bat ? 'bat:' + equip.bat : null);
}
export function paint(model, tint) {
  const u = model.userData; const skin = ITEM[u.equip?.skin] || ITEM['skin-blue'];
  for (const [n, rec] of Object.entries(u.mats)) {
    const c = skin.colors?.[n];
    if (c != null) rec.mat.color.setHex(c); else rec.mat.color.copy(rec.base);
    if (tint) rec.mat.color.lerp(new THREE.Color(tint), 0.65);
  }
}
function attach(model, boneName, obj) {
  const u = model.userData, fix = BONE_FIX[boneName], bone = u.bones[boneName];
  const holder = new THREE.Group(); holder.scale.setScalar(fix.s); holder.quaternion.copy(fix.q);
  obj.traverse((x) => { if (x.isMesh) x.castShadow = true; });
  holder.add(obj); bone.add(holder); return holder;
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
  const e = { skin: pick(SKINS.slice(1)).id };
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
  const ts = new THREE.Scene();
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
