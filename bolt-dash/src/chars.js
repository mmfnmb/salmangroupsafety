// Characters you can play as (besides Bolt): KayKit characters by Kay Lousberg (CC0), all on one shared rig, so
// they share one set of animations (KayKit Character Animations, CC0). They load in the background after the menu
// is up (world/chars.pack.txt); until then everyone is Bolt. Each has its own ability and knockout move (abilities.js).
import { THREE, M, PI, SkeletonUtils } from './core.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { t } from './i18n.js';

// tier: 1 common, 2 rare, 3 epic, 4 legendary
export const CHARS = [
  { id: 'ch-clown', file: 'Clown', name: t('Clown'), tier: 3, price: 6000 },
  { id: 'ch-robot', file: 'Robot_One', name: t('Robot'), tier: 3, price: 6000 },
  { id: 'ch-mech', file: 'CombatMech', name: t('Battle Mech'), tier: 4, price: 12000 },
  { id: 'ch-hero', file: 'Superhero', name: t('Superhero'), tier: 3, price: 6000 },
  { id: 'ch-robot2', file: 'Robot_Two', name: t('Robot Mk2'), tier: 2, price: 3500 },
  { id: 'ch-ninja', file: 'Ninja', name: t('Ninja'), tier: 2, price: 3500 },
  { id: 'ch-space', file: 'SpaceRanger', name: t('Space Ranger'), tier: 2, price: 3500 },
  { id: 'ch-dino', file: 'MonsterCostume', name: t('Dino Kid'), tier: 2, price: 3500 },
  { id: 'ch-teddy', file: 'Animatronic_Normal', name: t('Teddy'), tier: 2, price: 3000 },
  { id: 'ch-action', file: 'ActionFigure', name: t('Action Hero'), tier: 2, price: 3000 },
  { id: 'ch-witch', file: 'Witch', name: t('Witch'), tier: 2, price: 3000 },
  { id: 'ch-paladin', file: 'Paladin', name: t('Paladin'), tier: 2, price: 3500 },
  { id: 'ch-driver', file: 'Driver', name: t('Driver'), tier: 1, price: 1500 },
  { id: 'ch-hiker', file: 'Hiker', name: t('Hiker'), tier: 1, price: 1500 },
  { id: 'ch-caveman', file: 'Caveman', name: t('Caveman'), tier: 1, price: 1500 },
  { id: 'ch-elf', file: 'Helper_A', name: t('Elf'), tier: 1, price: 1500 },
  { id: 'ch-elf2', file: 'Helper_B', name: t('Elf Boy'), tier: 1, price: 1500 },
  { id: 'ch-skater', file: 'Protagonist_A', name: t('Skater Girl'), tier: 1, price: 1500 },
  { id: 'ch-cap', file: 'Protagonist_B', name: t('Cap Kid'), tier: 1, price: 1500 },
  { id: 'ch-vet', file: 'Survivalist', name: t('Veteran'), tier: 1, price: 1500 },
];
export const CHAR = Object.fromEntries(CHARS.map((c) => [c.id, c]));
export const TIER = () => [null, t('Common'), t('Rare'), t('Epic'), t('Legendary')];
export const charThumb = (id) => (globalThis.__BD_CHARTHUMBS || {})[CHAR[id]?.file] || '';

// the shared animations, named like Bolt's so the same game code plays them
const MAP = {
  Idle: 'Idle_A', Run: 'Running_A', Walk: 'Walking_A', Jump: 'Jump_Start', Jump_Idle: 'Jump_Idle', Jump_Land: 'Jump_Land', HitReact: 'Hit_A', Death: 'Death_A',
  Punch: 'Melee_1H_Attack_Chop', Wave: 'Waving', Yes: 'Cheering', No: 'Hit_B', Duck: 'Crouching',
  // extras for abilities, knockouts and emotes
  Throw: 'Throw', Kick: 'Melee_Unarmed_Attack_Kick', Spin: 'Melee_2H_Attack_Spin', Smash: 'Melee_2H_Attack_Chop', JumpChop: 'Melee_1H_Attack_Jump_Chop', Transform: 'EXPERIMENTAL_Medium_Transform',
  Taunt: 'Skeletons_Taunt', PushUps: 'Push_Ups', SitUps: 'Sit_Ups', Sit: 'Sit_Floor_Idle', Lie: 'Lie_Idle', Dodge: 'Dodge_Forward', Block: 'Melee_Blocking', Interact: 'Interact', Cheer: 'Cheering',
};
export let CLIPS = null; // renamed clips ('CharacterArmature|Run' etc.)
let ready = null, scale = 1;
const gl = new GLTFLoader(); gl.setMeshoptDecoder(MeshoptDecoder);
export const charsReady = () => !!CLIPS;
export function loadChars() {
  if (ready) return ready;
  ready = (async () => {
    const b64 = (await (await fetch('./world/chars.pack.txt')).text()).trim(); let buf;
    try { buf = await (await fetch('data:application/octet-stream;base64,' + b64)).arrayBuffer(); } catch { const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); buf = u8.buffer; }
    const len = new DataView(buf).getUint32(0, true), idx = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, len))), base = 4 + len;
    const parse = (n) => new Promise((res) => gl.parse(buf.slice(base + idx[n][0], base + idx[n][0] + idx[n][1]), '', res, () => res(null)));
    const all = {};
    for (const n of Object.keys(idx).filter((k) => k.startsWith('anim-'))) { const g = await parse(n); for (const c of g?.animations || []) all[c.name] = c; }
    for (const n of Object.keys(idx).filter((k) => !k.startsWith('anim-'))) {
      const g = await parse(n); if (!g) continue; g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); M['ch/' + n] = g;
      await new Promise((r) => setTimeout(r, 0)); // keep the menu smooth
    }
    const clips = []; for (const [k, v] of Object.entries(MAP)) if (all[v]) { const c = all[v].clone(); c.name = 'CharacterArmature|' + k; clips.push(c); }
    // as tall as Bolt
    // measured by the head bones (skinned meshes give unreliable boxes)
    const headY = (scene, name) => { const m = SkeletonUtils.clone(scene); m.updateMatrixWorld(true); let y = 1; m.traverse((o) => { if (o.isBone && o.name === name) y = o.getWorldPosition(new THREE.Vector3()).y; }); return y; };
    scale = (headY(M.Character.scene, 'Head') * 0.42) / headY(M['ch/Clown'].scene, 'head') * 1.05;
    CLIPS = clips;
  })().catch((e) => { console.warn('characters failed to load', e); ready = null; });
  return ready;
}
// the body for a character: Bolt, or one of the characters above once they are loaded
export function makeBody(equip) {
  const c = equip?.char && CHAR[equip.char];
  if (c && CLIPS && M['ch/' + c.file]) {
    const m = SkeletonUtils.clone(M['ch/' + c.file].scene); m.scale.setScalar(scale);
    m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    m.userData.kk = c.id; return { model: m, clips: CLIPS, base: scale, kk: c };
  }
  const m = SkeletonUtils.clone(M.Character.scene); m.scale.setScalar(0.42);
  m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { model: m, clips: M.Character.animations, base: 0.42, kk: null };
}
// bone frames at rest for the shared rig, so held things line up with the hands (like BONE_FIX for Bolt)
export const KK_FIX = {};
export function kkBoneFix() {
  if (!CLIPS || KK_FIX.done) return; const m = SkeletonUtils.clone(M['ch/Clown'].scene), mx = new THREE.AnimationMixer(m);
  mx.clipAction(CLIPS.find((c) => c.name.endsWith('|Idle'))).play(); mx.update(0.3); m.updateMatrixWorld(true);
  m.traverse((o) => { if (o.isBone && ['head', 'chest', 'handslotr', 'handslotl'].includes(o.name)) KK_FIX[o.name] = { s: 1 / o.getWorldScale(new THREE.Vector3()).x, q: o.getWorldQuaternion(new THREE.Quaternion()).invert() }; });
  KK_FIX.done = true;
}
export const KK_BONE = { Head: 'head', Torso: 'chest', FistR: 'handslotr', FistL: 'handslotl' };
export { PI };
