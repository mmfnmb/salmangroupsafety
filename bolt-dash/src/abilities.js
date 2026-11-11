// Abilities: every character has one ability (a button with a cooldown) and one knockout move (charges up while you
// play; when it is full you unleash it with its own animation). Off in the open world.
import { THREE, M, G, V, PI, rand, pick, sfx, fx, scene, place } from './core.js';
import { vfx } from './vfx.js';
import { t } from './i18n.js';

// what each ability does
const AB = {
  pie: { cd: 6, anim: 'Throw', desc: t('Throws a cream pie: whoever it hits slips and falls') },
  slip: { cd: 7, anim: 'Interact', desc: t('Drops something slippery behind you') },
  shove: { cd: 5, anim: 'Kick', desc: t('A big kick that sends people flying') },
  dash: { cd: 5, anim: 'Dodge', desc: t('A quick dash forward') },
  pull: { cd: 7, anim: 'Interact', desc: t('Pulls the nearest player to you') },
  shield: { cd: 9, anim: 'Block', desc: t('Nothing can knock you over for 3 seconds') },
  stun: { cd: 7, anim: 'Taunt', desc: t('A shout that stuns everyone close by') },
  bomb: { cd: 6, anim: 'Throw', desc: t('Throws a laughing clown bomb that knocks people back a little') },
};
// knockout moves: every character has its own, with its own name, pose, colour and thing that comes crashing in
// type: slam (a giant thing falls in front), lift (balloons carry everyone up), rain (things fall on the others),
// storm (things spin around you), freeze (everyone near is locked in ice), leap (jump and land with a shockwave),
// wave (a ring rolls out and pushes everyone), pull (everyone is dragged in, then flung), cannon (a cannon fires)
const ULTS = {
  bolt: { name: t('Thunder Storm'), pose: 'Yes', color: 0xffd23f, type: 'zap', script: 'thunder', dur: 2.4, desc: t('Calls down lightning on himself, then on everyone close by') },
  'ch-clown': [{ name: t('Juggling Surprise'), pose: 'Idle', color: 0xffd23f, type: 'clownboom', script: 'juggle', dur: 3.2, desc: t('Juggles balls that turn into clubs in the air, drops them all, catches one, squeezes it and it explodes') },
    { name: t('Balloon Dog & Hammer'), pose: 'Idle', color: 0x4cc9f0, type: 'hammerspin', script: 'balloondog', dur: 2.8, desc: t('Ties a balloon dog to someone so they float away, then spins with a giant hammer') }],
  'ch-robot': { name: t('Overcharge'), pose: 'Transform', color: 0x3d9bff, type: 'shock', script: 'charge', dur: 2.8, desc: t('Plugs into his charging station, fills up with lightning and blasts it out in a shockwave') },
  'ch-mech': { name: t('Axe Cyclone'), pose: 'Taunt', color: 0xff3d3d, type: 'hammerspin', spin: 'pr/mech_axe', spinLen: 1.5, script: 'axe', dur: 2.6, desc: t('Pulls out a giant axe and spins like a tornado') },
  'ch-hero': { name: t('Laser Landing'), pose: 'Cheer', color: 0xff3d3d, type: 'beam', script: 'laser', dur: 2.8, desc: t('Flies up, sweeps a laser across the arena and lands with a shockwave') },
  'ch-robot2': { name: t('Saw Magnet'), pose: 'Transform', color: 0xff8a3d, type: 'pull', prop: 'Hazard_Saw', ps: 1.8, script: 'magnet', dur: 2.4, desc: t('Charges a giant battery, then a spinning saw magnet drags everyone in and flings them') },
  'ch-ninja': { name: t('Shadow Blades'), pose: 'Block', color: 0x7a3dff, type: 'storm', prop: 'pr/shuriken', len: 0.7, script: 'blades', dur: 2.6, desc: t('Draws the katana, throws shurikens, and blades spin around the ninja') },
  'ch-space': { name: t('Jetpack Strike'), pose: 'Taunt', color: 0x9b6bff, type: 'leap', prop: 'pr/meteor', len: 0.5, script: 'jetpack', dur: 2.6, desc: t('Blasts up on a jetpack with a glowing blade and dives down') },
  'ch-dino': { name: t('Meteor Roar'), pose: 'Taunt', color: 0xff8a3d, type: 'rain', prop: 'pr/meteor', len: 1.3, crater: true, script: 'meteors', dur: 2.6, desc: t('A roar so loud that meteors fall from the sky') },
  'ch-teddy': { name: t('Rock Concert'), pose: 'Idle', color: 0xff9ad5, type: 'wave', script: 'guitar', dur: 2.6, desc: t('Plays a guitar solo so loud the sound waves blow everyone away') },
  'ch-action': { name: t('Dynamite Kick'), pose: 'Kick', color: 0xff6a3d, type: 'blast', prop: 'pr/dynamite', len: 0.6, script: 'dynamite', dur: 2.4, desc: t('Lights a cartoon dynamite and kicks it into the crowd') },
  'ch-witch': { name: t('Cauldron Curse'), pose: 'Idle', color: 0x8fe3ff, type: 'freeze', prop: 'k/block-snow-low-hexagon', ps: 2.2, script: 'cauldron', dur: 2.8, desc: t('Stirs her cauldron and everyone close is locked in ice for 3 seconds') },
  'ch-paladin': { name: t('Golden Judgment'), pose: 'Block', color: 0xffd23f, type: 'slam', prop: 'pr/paladin_hammer', len: 5, script: 'judgment', dur: 2.8, desc: t('Reads from the holy book, the golden statue rises, and a giant hammer comes down') },
  'ch-driver': { name: t('Pit Stop'), pose: 'Idle', color: 0xffc83d, type: 'car', script: 'pitstop', dur: 2.6, desc: t('Red, red, green: a race car zooms out and runs everyone over') },
  'ch-hiker': { name: t('Rockslide'), pose: 'Idle', color: 0x9b8a74, type: 'rain', prop: 'Rock_1', ps: 1.6, script: 'campout', dur: 2.6, desc: t('Pitches a tent, has a drink, and rocks roll down onto the others') },
  'ch-caveman': { name: t('Club Quake'), pose: 'Idle', color: 0xff8a3d, type: 'leap', prop: 'Rock_2', ps: 1.4, script: 'quake', dur: 2.6, desc: t('Lights a campfire, raises the club and slams the ground so hard the rocks fly') },
  'ch-elf': { name: t('Toy Train'), pose: 'Cheer', color: 0x36e07a, type: 'train', script: 'train', dur: 2.4, desc: t('A toy train circles around her and runs over everyone in its way') },
  'ch-elf2': { name: t('Candy Workshop'), pose: 'Idle', color: 0xff3d6b, type: 'storm', prop: 'pr/candycane', len: 1.1, script: 'workshop', dur: 2.6, desc: t('Hammers away at the workbench, then candy canes whirl around and knock everyone over') },
  'ch-skater': { name: t('Kickflip Wave'), pose: 'Idle', color: 0x3dd6ff, type: 'wave', script: 'kickflip', dur: 2.4, desc: t('Lands a huge kickflip and the shockwave pushes everyone away') },
  'ch-cap': { name: t('Golden Kick'), pose: 'Idle', color: 0xffd23f, type: 'ball', script: 'kick', dur: 2.6, desc: t('Kicks a flaming football that bounces from player to player') },
  'ch-vet': { name: t('Hydrant Blast'), pose: 'Idle', color: 0x4cc9f0, type: 'water', script: 'hydrant', dur: 2.6, desc: t('Opens a fire hydrant and the water blasts everyone in front away') },
};
export const ultOf = (charId) => { const u = ULTS[charId] || ULTS.bolt; return Array.isArray(u) ? pick(u) : u; }
const ultDesc = (charId) => { const u = ULTS[charId] || ULTS.bolt; return Array.isArray(u) ? u.map((x) => x.name + ': ' + x.desc).join(' · ') : u.name + ': ' + u.desc; };
// who has what (Bolt is the default character)
const KIT = {
  bolt: ['dash', 'storm'], 'ch-clown': ['bomb', 'balloons'], 'ch-robot': ['shove', 'mech'], 'ch-mech': ['shield', 'mech'], 'ch-hero': ['dash', 'leap'],
  'ch-robot2': ['pull', 'mech'], 'ch-ninja': ['dash', 'storm'], 'ch-space': ['pull', 'rain'], 'ch-dino': ['stun', 'storm'], 'ch-teddy': ['shield', 'balloons'],
  'ch-action': ['shove', 'leap'], 'ch-witch': ['slip', 'freeze'], 'ch-paladin': ['shield', 'leap'], 'ch-driver': ['dash', 'rain'], 'ch-hiker': ['slip', 'leap'],
  'ch-caveman': ['shove', 'storm'], 'ch-elf': ['pie', 'freeze'], 'ch-elf2': ['slip', 'rain'], 'ch-skater': ['dash', 'storm'], 'ch-cap': ['pie', 'rain'], 'ch-vet': ['stun', 'freeze'],
};
export const kitOf = (charId) => KIT[charId || 'bolt'] || KIT.bolt;
export const abilityText = (charId) => { const [a] = kitOf(charId); return { ab: AB[a].desc, ult: ultDesc(charId || 'bolt') }; };
export const abilitiesOn = () => { const k = G.modeObj?.kind; return !!G.modeObj && k !== 'world' && !G.modeObj.noAbilities; };

const foes = (r, range) => G.runners.filter((o) => o !== r && !o.out && !o.finished && (!r.team || o.team !== r.team) && Math.hypot(o.pos.x - r.pos.x, o.pos.z - r.pos.z) < range);
const fwd = (r) => V(Math.sin(r.facing), 0, Math.cos(r.facing));
const knock = (o, from, power, up = 8) => { if (o.shieldT > 0) return; const d = V(o.pos.x - from.x, 0, o.pos.z - from.z); if (d.lengthSq() < 0.01) d.set(rand(-1, 1), 0, rand(-1, 1)); d.normalize().multiplyScalar(power); d.y = up; o.tumble(d); };
const hazards = []; // slippery patches on the floor

export function abilityUpdate(r, dt) {
  r.abCd = Math.max(0, (r.abCd || 0) - dt); r.shieldT = Math.max(0, (r.shieldT || 0) - dt);
  if (abilitiesOn() && !r.out) r.ultCharge = Math.min(1, (r.ultCharge || 0) + dt / 50);
  if (r.ultPending) { r.ultPending.t -= dt; if (r.ultPending.t <= 0) { const u = r.ultPending.u; r.ultPending = null; ultHit(r, u); } }
  if (r === G.runners[0]) propsUpdate(dt);
  if (r.storm > 0) { r.storm -= dt; for (const o of foes(r, r.stormPow ? 3.4 : 2.8)) if (!(o.stormHit > 0)) { knock(o, r.pos, r.stormPow || 11, 7); o.stormHit = 0.6; } if (r.storm <= 0) r.stormPow = 0; }
  if (r.stormHit > 0) r.stormHit -= dt;
  if (r.isPlayer) for (let i = hazards.length - 1; i >= 0; i--) { const h = hazards[i]; h.t -= dt; if (h.t <= 0) { h.o.removeFromParent(); hazards.splice(i, 1); } }
  // anyone on a slippery patch (not the one who dropped it) goes down
  for (const h of hazards) if (h.by !== r && !(r.slipHit > 0) && Math.hypot(r.pos.x - h.x, r.pos.z - h.z) < 1.6) { r.slipHit = 1.5; r.stun?.(1.2); knock(r, V(r.pos.x - Math.sin(r.facing), 0, r.pos.z - Math.cos(r.facing)), 4, 3); }
  if (r.slipHit > 0) r.slipHit -= dt;
  // bots use their powers now and then when someone is close
  if (!r.isPlayer && abilitiesOn() && !r.out) {
    if (r.abCd <= 0 && foes(r, 5).length && Math.random() < dt * 0.6) useAbility(r);
    if (r.ultCharge >= 1 && foes(r, 7).length >= 1 && Math.random() < dt * 0.5) useUlt(r);
  }
}
export function useAbility(r) {
  if (!abilitiesOn() || r.out || r.abCd > 0) return false;
  const [kind] = kitOf(r.kk?.id), a = AB[kind]; r.abCd = a.cd; r.play?.(r.actions[a.anim] ? a.anim : 'Punch', 0.05);
  const f = fwd(r), p = r.pos;
  if (kind === 'pie') { const tg = foes(r, 14).filter((o) => { const d = V(o.pos.x - p.x, 0, o.pos.z - p.z).normalize(); return d.dot(f) > 0.6; }).sort((a, b) => a.pos.distanceTo(p) - b.pos.distanceTo(p))[0]; fx.burst(V(p.x + f.x, p.y + 1.2, p.z + f.z), 0xfff3e0, 10, 6); if (tg) setTimeout(() => { if (tg.out) return; fx.burst(V(tg.pos.x, tg.pos.y + 1.2, tg.pos.z), 0xffffff, 18, 6); tg.stun?.(1.2); knock(tg, p, 5, 4); }, 300); }
  else if (kind === 'slip') { const x = p.x - f.x * 1.5, z = p.z - f.z * 1.5, o = new THREE.Mesh(new THREE.CircleGeometry(1.5, 20), new THREE.MeshStandardMaterial({ color: 0xffe14d, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.85 })); o.rotation.x = -PI / 2; o.position.set(x, p.y + 0.05, z); scene.add(o); hazards.push({ o, x, z, t: 8, by: r }); }
  else if (kind === 'shove') { setTimeout(() => { for (const o of foes(r, 3.2)) { const d = V(o.pos.x - p.x, 0, o.pos.z - p.z).normalize(); if (d.dot(f) > 0.2) knock(o, r.pos, 14, 7); } fx.burst(V(p.x + f.x * 1.2, p.y + 0.8, p.z + f.z * 1.2), 0xffffff, 12, 6); }, 250); }
  else if (kind === 'dash') { const v = r.body.velocity; v.x = f.x * 22; v.z = f.z * 22; v.y = Math.max(v.y, 2); r.boostT = Math.max(r.boostT || 0, 0.5); fx.burst(V(p.x, p.y + 0.3, p.z), 0xffffff, 10, 4); }
  else if (kind === 'pull') { const tg = foes(r, 12).sort((a, b) => a.pos.distanceTo(p) - b.pos.distanceTo(p))[0]; if (tg) { const d = V(p.x - tg.pos.x, 0, p.z - tg.pos.z).normalize().multiplyScalar(16); tg.body.velocity.set(d.x, 6, d.z); tg.stun?.(0.5); fx.burst(V(tg.pos.x, tg.pos.y + 1, tg.pos.z), 0x8fd3ff, 12, 5); } }
  else if (kind === 'bomb') {
    const tg = foes(r, 11).filter((o) => V(o.pos.x - p.x, 0, o.pos.z - p.z).normalize().dot(f) > 0.5).sort((a, b) => a.pos.distanceTo(p) - b.pos.distanceTo(p))[0];
    const from = V(p.x, p.y + 1.2, p.z), to = tg ? V(tg.pos.x, tg.pos.y, tg.pos.z) : V(p.x + f.x * 7, p.y, p.z + f.z * 7);
    const key = M['pr/clown_bomb'] ? 'pr/clown_bomb' : 'k/bomb', s = M['pr/clown_bomb'] ? 0.9 : 1.2;
    prop(key, from.x, from.y, from.z, s, (q) => { const k = Math.min(1, q.t / 0.6); q.o.position.set(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k + Math.sin(k * PI) * 2.5, from.z + (to.z - from.z) * k); q.o.rotation.x += 0.25; if (k >= 1 && !q.hit) { q.hit = true; q.life = q.t; vfx.boom(q.o.position.clone(), 0xff8a3d, 0.4); for (const o of foes(r, 3.6)) knock(o, q.o.position, 7, 5); sfx.boom?.(); } }, 2);
  }
  else if (kind === 'shield') { r.shieldT = 3; fx.burst(V(p.x, p.y + 1, p.z), 0x7fd7ff, 20, 4); }
  else if (kind === 'stun') { setTimeout(() => { for (const o of foes(r, 5)) o.stun?.(1.6); fx.burst(V(p.x, p.y + 1.2, p.z), 0xffd23f, 24, 7); }, 300); }
  if (r.isPlayer) sfx.swing?.();
  return true;
}
// things that fly in for the knockouts (models from the game), moved here every frame
const props = [];
function prop(name, x, y, z, s, upd, life) { if (!M[name]) return null; const o = s < 0 ? sized(name, -s) : place(name, x, y, z, s, rand(0, 6), scene); if (s < 0) { o.position.set(x, y, z); s = o.scale.x; } o.traverse((m) => { if (m.isMesh) m.castShadow = true; }); const p = { o, t: 0, life, upd, s }; props.push(p); return p; }
export function propsUpdate(dt) {
  for (let i = props.length - 1; i >= 0; i--) { const p = props[i]; p.t += dt; p.upd?.(p, dt); if (p.t >= p.life) { const k = Math.min(1, (p.t - p.life) / 0.3); p.o.scale.setScalar(p.s * (1 - k)); if (k >= 1) { p.o.removeFromParent(); props.splice(i, 1); } } }
}
export function useUlt(r) {
  if (!abilitiesOn() || r.out || (r.ultCharge || 0) < 1 || r.ultPending || r.ultCine) return false;
  const u = ultOf(r.kk?.id || 'bolt'); r.ultCharge = 0; r.shieldT = Math.max(r.shieldT || 0, 2.5);
  r.play?.(r.actions[u.pose] ? u.pose : 'Yes', 0.05);
  G.ann?.('ult', { p: r.name, u: u.name }, r.isPlayer ? 3 : 2);
  // the player gets the cinematic (the game waits for it); bots just wind up for a moment
  if (r.isPlayer && G.onUlt) { r.ultCine = true; G.onUlt(r, u, () => { r.ultCine = false; r.ultPending = { u, t: 0.05 }; }); }
  else { r.stun?.(0.5); fx.burst(V(r.pos.x, r.pos.y + 1.5, r.pos.z), u.color, 24, 5); r.ultPending = { u, t: 0.6 }; }
  return true;
}
function ultHit(r, u) {
  const p = V(r.pos.x, r.pos.y, r.pos.z), f = fwd(r), col = u.color, ps = u.len ? -u.len : u.ps;
  const boom = (x, y, z, n = 30, sp = 8) => { fx.burst(V(x, y, z), col, n, sp); fx.burst(V(x, y, z), 0xffffff, n * 0.6, sp * 0.8); };
  if (r.isPlayer) G.shake = Math.max(G.shake || 0, 0.5);
  if (u.type === 'clownboom') {
    const at = p.clone().add(V(0, 2, 0)); vfx.boom(at, 0xffd23f, 1.6); vfx.ring(p, 0xff5fb8, 1, 18, 0.7); fx.confetti?.(at, 120);
    for (const o of foes(r, 9)) knock(o, p, 18, 12); sfx.boom?.(); G.shake = Math.max(G.shake || 0, 1);
  } else if (u.type === 'hammerspin') {
    r.storm = 2.6; r.stormPow = 15; r.play?.(r.actions.Spin ? 'Spin' : 'Punch', 0.05);
    const hk = u.spin && M[u.spin] ? u.spin : M['pr/clown_hammer'] ? 'pr/clown_hammer' : 'z/Obstacle_Hammer';
    prop(hk, p.x, p.y + 1, p.z, hk === u.spin ? -(u.spinLen || 1.4) : M['pr/clown_hammer'] ? 1.7 : 0.6, (q) => { const a = q.t * 13; q.o.position.set(r.pos.x + Math.sin(a) * 1.6, r.pos.y + 1, r.pos.z + Math.cos(a) * 1.6); q.o.rotation.set(0, a, -PI / 2); if (Math.random() < 0.4) vfx.slash(q.o.position.clone(), 0x4cc9f0, 2.2); }, 2.6);
  } else if (u.type === 'slam') {
    const x = p.x + f.x * 3, z = p.z + f.z * 3;
    prop(u.prop, x, p.y + 12, z, ps, (q) => { q.o.position.y = Math.max(p.y + 0.2, p.y + 12 - q.t * q.t * 90); q.o.rotation.y += 0.02; if (!q.hit && q.o.position.y <= p.y + 0.21) { q.hit = true; for (const o of foes(r, 7.5)) knock(o, V(x, 0, z), 18, 12); boom(x, p.y + 0.4, z, 50, 11); sfx.boom?.(); G.shake = Math.max(G.shake || 0, 1); } }, 1.4);
  } else if (u.type === 'lift') {
    for (const o of foes(r, 10)) { if (o.shieldT > 0) continue; o.body.velocity.set(rand(-2, 2), 21, rand(-2, 2)); o.stun?.(2); prop(u.prop, o.pos.x, o.pos.y + 2.4, o.pos.z, u.ps, (q) => { q.o.position.set(o.pos.x, o.pos.y + 2.4 + Math.max(0, q.t - 1.2) * 8, o.pos.z); }, 2.6); fx.confetti?.(V(o.pos.x, o.pos.y + 2, o.pos.z), 30); }
    sfx.boing?.();
  } else if (u.type === 'rain') {
    const list = foes(r, 24);
    for (let k = 0; k < 10; k++) {
      const tg = list[k % Math.max(1, list.length)], x = tg ? tg.pos.x + rand(-1, 1) : p.x + rand(-8, 8), z = tg ? tg.pos.z + rand(-1, 1) : p.z + rand(-8, 8), y0 = (tg ? tg.pos.y : p.y) + 16, delay = k * 0.16;
      prop(u.prop, x, y0, z, ps, (q) => { const tt = Math.max(0, q.t - delay); q.o.visible = q.t >= delay; q.o.position.y = Math.max(y0 - 16, y0 - tt * tt * 60); q.o.rotation.x += 0.1; if (!q.hit && tt > 0 && q.o.position.y <= y0 - 15.9) { q.hit = true; boom(x, y0 - 15.5, z, 16, 6); if (u.crater) { vfx.boom(V(x, y0 - 15.8, z), col, 0.5); prop('pr/crater', x, y0 - 15.95, z, -2.4, null, 3); } for (const o of foes(r, 26)) if (Math.hypot(o.pos.x - x, o.pos.z - z) < 2.6) knock(o, V(x, 0, z), 10, 8); } }, delay + 1.2);
    }
  } else if (u.type === 'storm') {
    r.storm = 2.6; r.play?.(r.actions.Spin ? 'Spin' : 'Punch', 0.05);
    for (let k = 0; k < 4; k++) prop(u.prop, p.x, p.y + 1, p.z, ps, (q) => { const a = q.t * 7 + k * PI / 2; q.o.position.set(r.pos.x + Math.cos(a) * 2.4, r.pos.y + 1 + Math.sin(q.t * 5 + k) * 0.3, r.pos.z + Math.sin(a) * 2.4); q.o.rotation.y += 0.3; }, 2.6);
  } else if (u.type === 'freeze') {
    for (const o of foes(r, 11)) { o.frozenT = Math.max(o.frozenT || 0, 3); o.stun?.(3); o.body.velocity.set(0, o.body.velocity.y, 0); prop(u.prop, o.pos.x, o.pos.y - 0.2, o.pos.z, ps, (q) => q.o.position.set(o.pos.x, o.pos.y - 0.2, o.pos.z), 3); boom(o.pos.x, o.pos.y + 1, o.pos.z, 14, 4); }
  } else if (u.type === 'leap') {
    const v = r.body.velocity; v.x = f.x * 7; v.z = f.z * 7; v.y = 14;
    setTimeout(() => { const q = r.pos; for (const o of foes(r, 7.5)) knock(o, q, 16, 11); boom(q.x, q.y + 0.2, q.z, 50, 10); for (let k = 0; k < 6; k++) { const a = k / 6 * PI * 2; prop(u.prop, q.x + Math.cos(a) * 1.5, q.y + 0.3, q.z + Math.sin(a) * 1.5, u.len ? -u.len : u.ps * 0.5, (pp) => { pp.o.position.x += Math.cos(a) * 0.25; pp.o.position.z += Math.sin(a) * 0.25; pp.o.position.y += (0.2 - pp.t * 0.6); }, 0.8); } G.shake = Math.max(G.shake || 0, 0.8); sfx.boom?.(); }, 750);
  } else if (u.type === 'wave') {
    const hit = new Set(); vfx.ring(p, col, 1, 30, 0.8);
    (u.prop ? prop(u.prop, p.x, p.y + 0.4, p.z, ps, null, 0.8) : null);
    tick((q) => { const R = q.t * 18; for (const o of foes(r, 16)) if (!hit.has(o) && Math.hypot(o.pos.x - p.x, o.pos.z - p.z) < R) { hit.add(o); knock(o, p, 15, 9); } }, 0.8);
    boom(p.x, p.y + 0.6, p.z, 40, 9);
  } else if (u.type === 'pull') {
    const list = foes(r, 15);
    prop(u.prop, p.x + f.x * 1.5, p.y + 1.6, p.z + f.z * 1.5, u.ps, (q) => { q.o.rotation.z += 0.4; q.o.rotation.y += 0.2; }, 1.6);
    for (const o of list) { const d = V(p.x - o.pos.x, 0, p.z - o.pos.z).normalize().multiplyScalar(17); o.body.velocity.set(d.x, 5, d.z); o.stun?.(0.8); }
    setTimeout(() => { for (const o of foes(r, 5)) knock(o, r.pos, 17, 12); boom(r.pos.x, r.pos.y + 1, r.pos.z, 40, 9); }, 800);
  } else if (u.type === 'zap') {
    // lightning on everyone close, one after another
    foes(r, 10).forEach((o, k) => setTimeout(() => { if (o.out) return; vfx.bolt(V(o.pos.x, o.pos.y, o.pos.z), col); knock(o, p, 13, 9); o.stun?.(1); sfx.boom?.(); }, 120 + k * 140));
    vfx.ring(p, col, 1, 16, 0.6); r.storm = 1.2;
  } else if (u.type === 'shock') {
    vfx.ring(p, col, 1, 24, 0.7); vfx.flash(V(p.x, p.y + 1.2, p.z), col, 7, 0.4); G.shake = Math.max(G.shake || 0, 1);
    for (const o of foes(r, 11)) { knock(o, p, 17, 10); o.stun?.(1.4); vfx.bolt(V(o.pos.x, o.pos.y, o.pos.z), col); } sfx.boom?.();
  } else if (u.type === 'beam') {
    // a laser sweeps the area in front, then the landing shockwave
    for (const o of foes(r, 16)) { const d = V(o.pos.x - p.x, 0, o.pos.z - p.z), l = d.length(); if (l && d.dot(f) / l > 0.5) { knock(o, p, 15, 9); vfx.flash(V(o.pos.x, o.pos.y + 1, o.pos.z), col, 2.5, 0.3); } }
    for (const o of foes(r, 5)) knock(o, p, 14, 10); vfx.ring(p, col, 1, 14, 0.6); prop('pr/landing', p.x, p.y + 0.05, p.z, -3.2, null, 1.2); sfx.boom?.();
  } else if (u.type === 'blast') {
    const x = p.x + f.x * 5, z = p.z + f.z * 5, from = V(p.x, p.y + 0.4, p.z);
    prop(u.prop, from.x, from.y, from.z, ps, (q) => { const k = Math.min(1, q.t / 0.5); q.o.position.set(from.x + (x - from.x) * k, from.y + Math.sin(k * PI) * 2.2, from.z + (z - from.z) * k); q.o.rotation.z += 0.3; if (k >= 1 && !q.hit) { q.hit = true; q.life = q.t; vfx.boom(V(x, p.y + 0.5, z), col, 1.3); for (const o of foes(r, 26)) if (Math.hypot(o.pos.x - x, o.pos.z - z) < 6.5) knock(o, V(x, 0, z), 17, 11); sfx.boom?.(); G.shake = Math.max(G.shake || 0, 1); } }, 2);
  } else if (u.type === 'car') {
    // a race car drives through from behind and runs over everyone in its lane
    const sx = p.x - f.x * 6, sz = p.z - f.z * 6, hit = new Set();
    prop('pr/race_car', sx, p.y, sz, -3.4, (q) => { const d = q.t * 30; q.o.position.set(sx + f.x * d, p.y + 0.05, sz + f.z * d); q.o.rotation.set(0, r.facing + (u.carYaw || 0), 0); if (Math.random() < 0.5) vfx.flash(q.o.position.clone().add(V(0, 0.4, 0)), 0xffc83d, 1.2, 0.2, 'smoke'); for (const o of foes(r, 40)) if (!hit.has(o) && o.pos.distanceTo(q.o.position) < 2.4) { hit.add(o); knock(o, q.o.position, 18, 10); } }, 1.4);
  } else if (u.type === 'train') {
    const hit = new Set();
    prop('pr/train', p.x, p.y, p.z, -1.6, (q) => { const R = 2 + q.t * 3.4, a = q.t * 4.2; q.o.position.set(r.pos.x + Math.cos(a) * R, r.pos.y + 0.05, r.pos.z + Math.sin(a) * R); q.o.rotation.y = -a + (u.trainYaw ?? 0); q.o.scale.setScalar(q.s * (1 + q.t * 0.6)); if (Math.random() < 0.12) vfx.flash(q.o.position.clone().add(V(0, 1.2, 0)), 0xffffff, 0.6, 0.4, 'smoke'); for (const o of foes(r, 20)) if (!hit.has(o) && o.pos.distanceTo(q.o.position) < 1.8) { hit.add(o); knock(o, q.o.position, 16, 10); } }, 2.4);
  } else if (u.type === 'ball') {
    // a flaming football hops from player to player
    const list = foes(r, 22).sort((a, b) => a.pos.distanceTo(p) - b.pos.distanceTo(p)).slice(0, 4), pts = [V(p.x + f.x, p.y + 0.3, p.z + f.z), ...list.map((o) => o)];
    prop('pr/football', pts[0].x, pts[0].y, pts[0].z, -0.7, (q) => { const seg = Math.floor(q.t / 0.35), k = (q.t % 0.35) / 0.35, a = pts[seg], b = pts[seg + 1]; if (!b) { q.life = Math.min(q.life, q.t); return; } const A = a.pos || a, B = b.pos || b; q.o.position.set(A.x + (B.x - A.x) * k, (A.y || p.y) + 0.6 + Math.sin(k * PI) * 2, A.z + (B.z - A.z) * k); q.o.rotation.x += 0.4; if (Math.random() < 0.6) vfx.flash(q.o.position.clone(), 0xff8a3d, 0.8, 0.25, 'fire'); if (k > 0.9 && b.pos && !b._balled) { b._balled = true; knock(b, A, 16, 10); vfx.boom(V(B.x, B.y, B.z), col, 0.5); setTimeout(() => { b._balled = false; }, 1000); } }, 0.35 * pts.length);
  } else if (u.type === 'water') {
    const x = p.x + f.x * 1.2, z = p.z + f.z * 1.2;
    prop('pr/hydrant', x, p.y, z, -0.9, null, 2.2);
    tick((q) => { for (let i = 0; i < 2; i++) vfxSpray(V(x, p.y + 0.9, z), f, rand(4, 16)); for (const o of foes(r, 14)) { const d = V(o.pos.x - x, 0, o.pos.z - z), l = d.length(); if (l && d.dot(f) / l > 0.6 && !(o.wet > 0)) { o.wet = 1; knock(o, V(x, 0, z), 16, 7); setTimeout(() => { o.wet = 0; }, 1500); } } }, 1.6);
  } else if (u.type === 'cannon') {
    const ry = r.facing; prop(u.prop, p.x + f.x * 1.6, p.y, p.z + f.z * 1.6, u.ps, (q) => { q.o.rotation.y = ry; }, 2);
    for (let k = 0; k < 4; k++) setTimeout(() => { const sx = p.x + f.x * 2.4, sz = p.z + f.z * 2.4; prop('Cannonball', sx, p.y + 1, sz, 1.2, (q) => { q.o.position.x = sx + f.x * q.t * 30; q.o.position.z = sz + f.z * q.t * 30; }, 0.7); boom(sx, p.y + 1, sz, 12, 5); for (const o of foes(r, 20)) { const d = V(o.pos.x - p.x, 0, o.pos.z - p.z), l = d.length(); if (l && d.dot(f) / l > 0.75) knock(o, p, 16, 9); } sfx.boom?.(); }, 300 + k * 220);
  }
}
export function clearAbilities() { for (const h of hazards) h.o.removeFromParent(); hazards.length = 0; for (const p of props) p.o.removeFromParent(); props.length = 0; }

// ---------------------------------------------------------------- the clown's knockout cinematics
// point a bone (an arm) toward a direction in the world, blended over the animation
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _w = new THREE.Quaternion(), _pq = new THREE.Quaternion();
function aim(bone, child, dir, weight = 1) {
  if (!bone || !child) return; bone.updateWorldMatrix(true, true);
  bone.getWorldPosition(_a); child.getWorldPosition(_b); const cur = _b.sub(_a).normalize();
  _q.setFromUnitVectors(cur, dir.clone().normalize()); bone.getWorldQuaternion(_w); bone.parent.getWorldQuaternion(_pq);
  const target = _pq.clone().invert().multiply(_q).multiply(_w); bone.quaternion.slerp(target, weight);
}
const bones = (r) => { if (r._b) return r._b; const b = {}; r.model.traverse((o) => { if (o.isBone) b[o.name] = o; }); return (r._b = b); };
const handPos = (r, side) => { const b = bones(r)[side === 'l' ? 'handslotl' : 'handslotr'] || bones(r)[side === 'l' ? 'handl' : 'handr']; return b ? b.getWorldPosition(new THREE.Vector3()) : V(r.pos.x, r.pos.y + 1.2, r.pos.z); };
// a prop sized to a length in metres (they come in different sizes)
function sized(key, len) { if (!M[key]) return null; const o = place(key, 0, -50, 0, 1, 0, scene); o.rotation.set(0, 0, 0); o.position.set(0, 0, 0); o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o), s = b.getSize(V()); o.userData.box = b; o.scale.setScalar(len / Math.max(s.x, s.y, s.z, 0.001)); o.userData.base = o.scale.x; o.position.y = -50; return o; }
const COLS = ['red', 'blue', 'green', 'yellow'], COLHEX = [0xff4d4d, 0x4cc9f0, 0x36e07a, 0xffd23f];
export const CINE = {
  // juggling: three balls fly from hand to hand; in the air they turn into juggling clubs (and change colour), near
  // the hands they are balls again. Then he drops them all, catches his own ball, squeezes it... and it explodes
  juggle(c, dt) {
    const r = c.r, b = bones(r), t = c.t, f = V(Math.sin(r.facing), 0, Math.cos(r.facing)), right = V(Math.cos(r.facing), 0, -Math.sin(r.facing)), up = V(0, 1, 0);
    if (!c.objs) { c.objs = [0, 1, 2].map((k) => ({ balls: COLS.map((cl) => sized('pr/ball_' + cl, 0.32)), pins: COLS.map((cl) => sized('pr/juggling_pin_' + cl, 0.55)), mode: null, col: -1, vy: 0, pos: null })); c.big = sized('pr/clown_ball', 0.3); }
    const HL = handPos(r, 'l'), HR = handPos(r, 'r');
    if (t < 2.2) {
      // arms bob up and down like a juggler's
      const w = Math.min(1, t * 4);
      aim(b.upperarml, b.lowerarml, f.clone().multiplyScalar(0.7).add(right.clone().multiplyScalar(-0.35)).add(V(0, -0.25 + 0.3 * Math.max(0, Math.sin(t * 8.4)), 0)), w);
      aim(b.upperarmr, b.lowerarmr, f.clone().multiplyScalar(0.7).add(right.clone().multiplyScalar(0.35)).add(V(0, -0.25 + 0.3 * Math.max(0, Math.sin(t * 8.4 + PI)), 0)), w);
      aim(b.lowerarml, b.wristl, f.clone().add(V(0, 0.3, 0)), w); aim(b.lowerarmr, b.wristr, f.clone().add(V(0, 0.3, 0)), w);
      c.objs.forEach((o, k) => {
        const ph = t * 1.35 + k / 3, cyc = Math.floor(ph), u = ph - cyc, from = cyc % 2 ? HL : HR, to = cyc % 2 ? HR : HL;
        const pos = from.clone().lerp(to, u).add(V(0, Math.sin(u * PI) * 1.1, 0)).add(f.clone().multiplyScalar(0.25));
        const mode = Math.min(u, 1 - u) < 0.17 ? 'ball' : 'pin', col = (k + cyc) % 4;
        if ((mode !== o.mode || col !== o.col) && o.mode) vfx.sparkle(pos, COLHEX[col], 5);
        o.mode = mode; o.col = col; o.pos = pos;
        o.balls.forEach((m, i) => { if (!m) return; m.visible = mode === 'ball' && i === col; m.position.copy(pos); });
        o.pins.forEach((m, i) => { if (!m) return; m.visible = mode === 'pin' && i === col; m.position.copy(pos); m.rotation.set(u * PI * 4, r.facing, 0); });
      });
    } else {
      // he lets them all fall...
      c.objs.forEach((o) => { o.pins.forEach((m) => m && (m.visible = false)); o.vy -= 14 * dt; o.pos.y = Math.max(r.pos.y + 0.15, o.pos.y + o.vy * dt); o.balls.forEach((m, i) => { if (!m) return; m.visible = i === o.col; m.position.copy(o.pos); }); });
      // ...grabs his own ball in front of him and lifts it up high
      const k1 = Math.min(1, (t - 2.2) / 0.25), k2 = Math.min(1, Math.max(0, (t - 2.45) / 0.35));
      const dir = f.clone().add(V(0, 0.15, 0)).lerp(V(0, 1, 0).add(f.clone().multiplyScalar(0.15)), k2);
      aim(b.upperarmr, b.lowerarmr, dir, 1); aim(b.lowerarmr, b.wristr, dir, 1); aim(b.upperarml, b.lowerarml, V(0, -1, 0).add(right.clone().multiplyScalar(-0.3)), k1);
      if (c.big) {
        c.big.visible = t > 2.3; c.big.position.copy(handPos(r, 'r')).add(V(0, 0.12, 0));
        // squeezed: it wobbles, swells and glows
        const sq = Math.max(0, t - 2.75), wob = 1 + sq * 0.7 + Math.sin(t * 60) * 0.05 * (sq > 0 ? 1 : 0);
        c.big.scale.set(c.big.userData.base * wob * 1.15, c.big.userData.base * wob * 0.85, c.big.userData.base * wob * 1.15);
        if (sq > 0 && Math.random() < 0.5) vfx.flash(c.big.position.clone(), 0xffd23f, 1.2, 0.15);
      }
    }
    if (t >= c.dur - 0.02) { for (const o of c.objs) [...o.balls, ...o.pins].forEach((m) => m?.removeFromParent()); c.big?.removeFromParent(); }
  },
  // the balloon dog: he holds it up, it floats over to the nearest player and carries them off; then out comes the hammer
  balloondog(c, dt) {
    const r = c.r, b = bones(r), t = c.t, f = V(Math.sin(r.facing), 0, Math.cos(r.facing));
    if (!c.init) { c.init = true; c.dog = sized('pr/balloon_dog_blue', 0.9); c.ham = sized('pr/clown_hammer', 1.1); c.tg = foes(r, 16).sort((a, b2) => a.pos.distanceTo(r.pos) - b2.pos.distanceTo(r.pos))[0] || null; c.keep = c.tg; if (c.tg) c.tg0 = c.tg.body.position.y; }
    const HR = handPos(r, 'r');
    if (t < 0.7) { aim(b.upperarmr, b.lowerarmr, f.clone().add(V(0, 0.9, 0)), Math.min(1, t * 4)); if (c.dog) { c.dog.position.copy(HR).add(V(0, 0.35, 0)); c.dog.scale.setScalar(c.dog.userData.base * Math.min(1, t * 2.5)); c.dog.rotation.y = r.facing; } }
    else if (t < 1.4) { const k = (t - 0.7) / 0.7, to = c.tg ? V(c.tg.pos.x, c.tg.pos.y + 2, c.tg.pos.z) : V(r.pos.x + f.x * 4, r.pos.y + 3, r.pos.z + f.z * 4); if (c.dog) c.dog.position.copy(HR.clone().lerp(to, k)).add(V(0, Math.sin(k * PI) * 1.2, 0)); if (k > 0.2 && k < 0.3) vfx.hearts(to, 3); }
    else {
      // the player floats up under the balloon dog
      if (c.tg) { c.tg.body.position.y += dt * 2.2; c.tg.sync?.(0); if (c.dog) c.dog.position.set(c.tg.pos.x, c.tg.pos.y + 2, c.tg.pos.z); }
      if (c.ham) { c.ham.position.copy(HR); c.ham.rotation.set(0, r.facing, Math.sin(t * 4) * 0.4); c.ham.scale.setScalar(c.ham.userData.base * Math.min(1, (t - 1.4) * 3)); }
      aim(b.upperarmr, b.lowerarmr, f.clone().add(V(0, 0.5, 0)), 1);
      if (t > 1.9 && !c.spun) { c.spun = true; r.play?.(r.actions.Spin ? 'Spin' : 'Punch', 0.1); }
    }
    if (t >= c.dur - 0.02) {
      c.ham?.removeFromParent();
      if (c.tg) { const o = c.tg, dog = c.dog; o.body.velocity.set(0, 9, 0); o.stun?.(3); if (dog) prop2(dog, (q) => { dog.position.set(o.pos.x, o.pos.y + 2 + q.t * 0.5, o.pos.z); }, 3); } else c.dog?.removeFromParent();
    }
  },
};
// something that runs every frame for a while, with nothing to show (the effect is the point)
function tick(upd, life) { const o = new THREE.Object3D(); scene.add(o); props.push({ o, t: 0, life, upd, s: 1 }); }
// a jet of water drops
function vfxSpray(at, f, s) { return vfx.drop?.(at, V(f.x * s + rand(-1.5, 1.5), rand(2, 5), f.z * s + rand(-1.5, 1.5))); }
// ---------------------------------------------------------------- everyone else's knockout cinematics
// the player's own knockout plays as a short film while the game waits: the character's own things (KayKit props)
// come out, arms move with them, and the glowing effects build up to the hit. Every object made here goes in c.own and
// is removed when the film ends (main.js).
const UP = new THREE.Vector3(0, 1, 0), XA = new THREE.Vector3(1, 0, 0), NXA = new THREE.Vector3(-1, 0, 0);
const own = (c, o) => { if (o) (c.own ||= []).push(o); return o; };
const mk = (c, key, len) => own(c, sized(key, len));
const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const grow = (o, k) => o && o.scale.setScalar(o.userData.base * Math.max(0.001, k));
// turn an object so its own axis (up by default) points along a direction
function point(o, dir, axis = UP, roll = 0) { if (!o) return; o.quaternion.setFromUnitVectors(axis, dir.clone().normalize()); if (roll) o.rotateOnAxis(axis, roll); }
// hold a long thing (sword, axe, club...) by its handle: `frac` of the way up from its bottom end sits in the hand
function hold(o, hand, dir, frac = 0.12, axis = UP) { if (!o) return; const d = dir.clone().normalize(); point(o, d, axis); const bx = o.userData.box, k = axis === UP ? 'y' : 'x', g = bx.min[k] + (bx.max[k] - bx.min[k]) * frac; o.position.copy(hand).addScaledVector(d, -g * o.scale.x); }
// both bones of an arm pointed along a direction
function arm(r, side, dir, w = 1) { const b = bones(r); aim(b['upperarm' + side], b['lowerarm' + side], dir, w); aim(b['lowerarm' + side], b['wrist' + side], dir, w); }
function frameOf(c) {
  const r = c.r, a = r.facing, f = V(Math.sin(a), 0, Math.cos(a)), right = V(Math.cos(a), 0, -Math.sin(a)), P = V(r.pos.x, r.pos.y, r.pos.z);
  const b = bones(r), head = b.head ? b.head.getWorldPosition(V()) : P.clone().add(V(0, 1.5, 0)), chest = b.chest ? b.chest.getWorldPosition(V()) : P.clone().add(V(0, 1.1, 0));
  return { r, t: c.t, f, right, P, head, chest, HR: handPos(r, 'r'), HL: handPos(r, 'l') };
}
const once = (c, k) => (c['_' + k] ? false : (c['_' + k] = true));
const every = (c, k, from, step) => { const n = (c['_n' + k] ??= from); if (c.t >= n) { c['_n' + k] = n + step; return true; } return false; };
// things that move during the film (the game is paused then, so they are moved here, not with the game's props)
const anim = (c, o, upd, life) => (c.fx ||= []).push({ o, t: 0, life, upd });
export function cineTick(c, dt) { for (const q of c.fx || []) if (q.t < q.life) { q.t += dt; q.upd(q, dt); } }
const lift = (c, y) => { c.r.model.position.y = y; c.lifted = true; };

Object.assign(CINE, {
  // Bolt: lightning strikes all around him, then a giant bolt hits him and he takes the power
  thunder(c) {
    const { t, P } = frameOf(c);
    if (once(c, 'rune')) vfx.rune(P, 0xffd23f, 4, 2.4);
    if (t < 1.8 && every(c, 'b', 0.1, 0.24)) { const a = rand(0, PI * 2), d = rand(1.3, 3); vfx.bolt(V(P.x + Math.cos(a) * d, P.y, P.z + Math.sin(a) * d), 0xffd23f); }
    if (t > 1.9 && once(c, 'big')) { vfx.bolt(P.clone(), 0xfff6a0); vfx.ring(P, 0xffd23f, 1, 10, 0.6); vfx.flash(P.clone().add(V(0, 1.2, 0)), 0xffffff, 6, 0.4); G.shake = 0.6; }
  },
  // Robot: his charging station rises behind him, lightning pours into it, he fills up and throws his arms up
  charge(c) {
    const { r, t, f, right, P, head } = frameOf(c);
    if (once(c, 'st')) { c.st = mk(c, 'pr/charger', 2.3); if (c.st) c.st.rotation.y = r.facing; vfx.rune(P, 0x3d9bff, 3.5, 2.8); }
    if (c.st) c.st.position.copy(P).addScaledVector(f, -1.05).add(V(0, -2.3 + 2.3 * ease(t / 0.6), 0));
    if (t < 2) { const w = ease(t * 3); arm(r, 'l', right.clone().negate().add(V(0, -0.35, 0)), w); arm(r, 'r', right.clone().add(V(0, -0.35, 0)), w); }
    else { arm(r, 'l', UP.clone().add(right.clone().multiplyScalar(-0.35)), 1); arm(r, 'r', UP.clone().add(right.clone().multiplyScalar(0.35)), 1); }
    if (t > 0.6 && t < 2 && every(c, 'b', 0.6, 0.2)) { if (c.st) vfx.bolt(c.st.position.clone().add(V(0, 2, 0)), 0x3d9bff); vfx.sparkle(P.clone().add(V(0, 1.1, 0)), 0x8fd3ff, 6); vfx.flash(head.clone().addScaledVector(f, 0.15), 0x3d9bff, 0.9, 0.2); }
    if (t > 2 && once(c, 'blast')) { vfx.flash(P.clone().add(V(0, 1.2, 0)), 0x8fd3ff, 6, 0.5); vfx.ring(P, 0x3d9bff, 1, 12, 0.6); G.shake = 0.6; }
  },
  // Battle Mech: the giant axe comes out, he lifts it high, then spins like a tornado
  axe(c) {
    const { r, t, f, right, HR, chest } = frameOf(c);
    if (once(c, 'ax')) c.ax = mk(c, 'pr/mech_axe', 1.7);
    if (!c.ax) return;
    grow(c.ax, ease(t * 3));
    if (t < 1) { const d = f.clone().multiplyScalar(0.45).add(UP).add(right.clone().multiplyScalar(0.25)); arm(r, 'r', d, ease(t * 3)); hold(c.ax, HR, UP.clone().addScaledVector(f, 0.15)); if (t > 0.6 && every(c, 'g', 0.6, 0.12)) vfx.flash(HR.clone().add(V(0, 0.6, 0)), 0xff3d3d, 1, 0.2); }
    else { if (once(c, 'spin')) r.play?.(r.actions.Spin ? 'Spin' : 'Punch', 0.1); hold(c.ax, HR, HR.clone().sub(chest).setY(0).normalize().add(V(0, 0.5, 0))); if (every(c, 's', 1, 0.07)) vfx.slash(c.ax.position.clone().add(V(0, 0.2, 0)), 0xff3d3d, 2.4); }
  },
  // Superhero: flies up, sweeps a laser beam from his eyes, then lands with a crater
  laser(c) {
    const { r, t, f, P, head } = frameOf(c);
    if (once(c, 'l')) { c.beam = mk(c, 'pr/laser', 1); }
    lift(c, t < 0.7 ? ease(t / 0.7) * 1.3 : t < 1.95 ? 1.3 + Math.sin(t * 4) * 0.05 : Math.max(0, 1.3 - (t - 1.95) * 6));
    if (c.beam) {
      const on = t > 0.75 && t < 1.9, a = Math.sin((t - 0.75) * 3.2) * 0.7, d = V(Math.sin(r.facing + a), -0.32, Math.cos(r.facing + a)).normalize();
      c.beam.visible = on; if (on) { c.beam.position.copy(head).addScaledVector(f, 0.12); point(c.beam, d, NXA); c.beam.scale.set(c.beam.userData.base * 6 * ease((t - 0.75) * 4), c.beam.userData.base * 1.5, c.beam.userData.base * 1.5); const end = head.clone().addScaledVector(d, 6); end.y = Math.max(end.y, P.y + 0.1); if (every(c, 'f', 0.8, 0.06)) { vfx.flash(end, 0xff3d3d, 1.6, 0.25); vfx.sparkle(end, 0xffd23f, 2); } }
    }
    if (t > 2.15 && once(c, 'land')) { const g = mk(c, 'pr/landing', 3.2); if (g) g.position.copy(P).add(V(0, 0.03, 0)); vfx.ring(P, 0xff3d3d, 1, 12, 0.6); vfx.boom(P.clone().add(V(0, 0.3, 0)), 0xff8a3d, 0.7); G.shake = 0.9; r.play?.('Duck', 0.05); }
  },
  // Robot Mk2: lifts a giant battery that fills with lightning
  magnet(c) {
    const { r, t, f, HR } = frameOf(c);
    if (once(c, 'b')) c.bat = mk(c, 'pr/battery', 0.6);
    arm(r, 'r', UP.clone().addScaledVector(f, 0.3), ease(t * 3));
    if (c.bat) { c.bat.position.copy(HR).add(V(0, 0.32, 0)); c.bat.rotation.y = r.facing; grow(c.bat, ease(t * 3)); if (t > 0.5 && every(c, 'z', 0.5, 0.18)) { vfx.bolt(c.bat.position.clone().add(V(0, 0.3, 0)), 0xff8a3d); vfx.sparkle(c.bat.position.clone(), 0xffd23f, 4); } }
    if (t > 1.9 && once(c, 'x')) { vfx.flash(HR.clone().add(V(0, 0.4, 0)), 0xffd23f, 5, 0.4); G.shake = 0.5; }
  },
  // Ninja: draws the katana, throws three shurikens, then a whirl of slashes
  blades(c) {
    const { r, t, f, right, HR, chest } = frameOf(c);
    if (once(c, 'k')) c.kat = mk(c, 'pr/katana', 1.35);
    if (c.kat) { if (t < 1.5) hold(c.kat, HR, UP.clone().addScaledVector(f, 0.5).addScaledVector(right, 0.2)); else hold(c.kat, HR, HR.clone().sub(chest).setY(0).normalize()); }
    if (t < 1.5) arm(r, 'r', f.clone().multiplyScalar(0.6).add(UP).add(right.clone().multiplyScalar(0.2)), ease(t * 4));
    if (t > 0.6 && t < 1.3) arm(r, 'l', f.clone().add(right.clone().multiplyScalar(-0.2)), 1);
    for (const [k, at] of [[0, 0.65], [1, 0.85], [2, 1.05]]) if (t > at && once(c, 'sh' + k)) {
      const s = mk(c, 'pr/shuriken', 0.4), d = f.clone().applyAxisAngle(UP, (k - 1) * 0.45), from = handPos(r, 'l');
      if (s) anim(c, s, (q) => { s.position.copy(from).addScaledVector(d, q.t * 14); s.rotation.set(0, q.t * 40, 0); if (Math.random() < 0.5) vfx.sparkle(s.position.clone(), 0x7a3dff, 1); }, 1);
    }
    if (t > 1.5 && once(c, 'spin')) r.play?.(r.actions.Spin ? 'Spin' : 'Punch', 0.1);
    if (t > 1.5 && every(c, 's', 1.5, 0.08)) { const a = rand(0, PI * 2); vfx.slash(chest.clone().add(V(Math.cos(a) * 1.2, rand(-0.3, 0.4), Math.sin(a) * 1.2)), 0x7a3dff, 2.4); }
  },
  // Space Ranger: the jetpack fires up, he rises with his glowing blade, then dives down
  jetpack(c) {
    const { r, t, f, HR, chest, P } = frameOf(c);
    if (once(c, 'j')) { c.jp = mk(c, 'pr/jetpack', 0.85); c.bl = mk(c, 'pr/space_blade', 1.1); }
    lift(c, t < 0.4 ? 0 : t < 1.5 ? ease((t - 0.4) / 1.1) * 2.2 : t < 2 ? 2.2 : Math.max(0, 2.2 - (t - 2) * 9));
    if (c.jp) { c.jp.position.copy(chest).addScaledVector(f, -0.3); c.jp.rotation.y = r.facing; if (t > 0.25 && t < 2) vfx.fire(c.jp.position.clone().add(V(0, -0.4, 0)), 2, 0x9bd0ff); }
    arm(r, 'r', UP.clone().addScaledVector(f, 0.2), ease((t - 0.6) * 3));
    if (c.bl) { grow(c.bl, ease((t - 0.5) * 3)); hold(c.bl, HR, UP.clone().addScaledVector(f, 0.3)); if (t > 1 && every(c, 'g', 1, 0.1)) vfx.flash(HR.clone().add(V(0, 0.7, 0)), 0x9b6bff, 1.4, 0.2); }
    if (t > 2.25 && once(c, 'land')) { vfx.ring(P, 0x9b6bff, 1, 12, 0.6); vfx.boom(P.clone().add(V(0, 0.3, 0)), 0x9b6bff, 0.6); G.shake = 0.9; }
  },
  // Dino Kid: a huge roar, and meteors start falling all around
  meteors(c) {
    const { t, P, head, f } = frameOf(c);
    if (t > 0.15 && every(c, 'r', 0.15, 0.4) && t < 1.2) { vfx.ring(P, 0xff8a3d, 1, 8, 0.5); vfx.flash(head.clone().addScaledVector(f, 0.5), 0xffffff, 0.8, 0.2, 'burst'); G.shake = 0.3; }
    for (let k = 0; k < 5; k++) {
      const at = 0.7 + k * 0.32; if (t < at || c['m' + k]) continue;
      const a = c.r.facing + PI + (k - 2) * 0.55, d = rand(2.4, 3.8), x = P.x + Math.sin(a) * d * -1, z = P.z + Math.cos(a) * d * -1, m = mk(c, 'pr/meteor', 0.9); c['m' + k] = true;
      if (m) anim(c, m, (q) => { const k2 = Math.min(1, q.t / 0.45); m.position.set(x - 3 + 3 * k2, P.y + 9 - 9 * k2, z); m.rotation.x += 0.2; vfx.fire(m.position.clone(), 1); if (k2 >= 1 && !q.hit) { q.hit = true; vfx.boom(V(x, P.y + 0.3, z), 0xff8a3d, 0.6); const cr = mk(c, 'pr/crater', 1.8); if (cr) cr.position.set(x, P.y + 0.02, z); G.shake = 0.5; } }, 0.5);
    }
  },
  // Teddy: a guitar solo, every strum sends a pink sound wave out
  guitar(c) {
    const { r, t, f, right, chest, P } = frameOf(c);
    if (once(c, 'g')) c.gt = mk(c, 'pr/guitar', 1.05);
    if (c.gt) { grow(c.gt, ease(t * 4)); hold(c.gt, chest.clone().addScaledVector(f, 0.3).add(V(0, -0.15, 0)), right.clone().negate().add(V(0, 0.7, 0)).addScaledVector(f, 0.1), 0.22); c.gt.rotateOnAxis(UP, PI / 2); }
    arm(r, 'l', right.clone().negate().addScaledVector(f, 0.7).add(V(0, 0.3, 0)), 1);
    arm(r, 'r', f.clone().multiplyScalar(0.7).add(V(0, -0.5 + Math.sin(t * 26) * 0.25, 0)).addScaledVector(right, 0.15), 1);
    lift(c, Math.abs(Math.sin(t * 7)) * 0.07);
    if (t > 0.4 && every(c, 'w', 0.4, 0.33)) { const cl = [0xff9ad5, 0x9b6bff, 0x4cc9f0, 0xffd23f][Math.floor(t * 3) % 4]; vfx.ring(P, cl, 1, 7, 0.5); vfx.sparkle(chest.clone().addScaledVector(f, 0.4), cl, 5); }
    if (t > 2.1 && once(c, 'end')) { vfx.ring(P, 0xff9ad5, 1, 16, 0.6); vfx.flash(chest.clone(), 0xffffff, 5, 0.35); G.shake = 0.6; }
  },
  // Action Hero: lights a cartoon dynamite, tosses it up and kicks it into the crowd
  dynamite(c) {
    const { r, t, f, HR, P } = frameOf(c);
    if (once(c, 'd')) c.dy = mk(c, 'pr/dynamite', 0.45);
    if (!c.dy) return;
    if (t < 0.9) { arm(r, 'r', f.clone().multiplyScalar(0.4).add(UP), ease(t * 4)); c.dy.position.copy(HR).add(V(0, 0.15, 0)); c.dy.rotation.y = r.facing; if (every(c, 'f', 0.2, 0.05)) { vfx.sparkle(c.dy.position.clone().add(V(0, 0.3, 0)), 0xffd23f, 2); } }
    else if (t < 1.35) { const k = (t - 0.9) / 0.45; c.dy.position.copy(HR.clone().lerp(P.clone().addScaledVector(f, 0.9).add(V(0, 0.5, 0)), k)).add(V(0, Math.sin(k * PI) * 1.2, 0)); c.dy.rotation.x += 0.2; if (k > 0.5 && once(c, 'kk')) r.play?.(r.actions.Kick ? 'Kick' : 'Punch', 0.05); }
    else { const k = (t - 1.35) / 0.5; c.dy.position.copy(P).addScaledVector(f, 0.9 + k * 9).add(V(0, 0.5 + k * 1.5, 0)); c.dy.rotation.x += 0.4; vfx.fire(c.dy.position.clone(), 1); if (k >= 1 && once(c, 'b')) { c.dy.visible = false; vfx.boom(c.dy.position.clone(), 0xff6a3d, 1.2); G.shake = 0.8; } }
  },
  // Witch: her cauldron bubbles while she stirs, then everything freezes over
  cauldron(c) {
    const { r, t, f, right, HL, P } = frameOf(c);
    if (once(c, 'c')) { c.cd = mk(c, 'pr/cauldron', 0.95); c.br = mk(c, 'pr/broom', 1.3); vfx.rune(P.clone().addScaledVector(f, 1.1), 0x9b6bff, 2.6, 2.8); }
    const at = P.clone().addScaledVector(f, 1.05);
    if (c.cd) { c.cd.position.copy(at); grow(c.cd, ease(t * 3)); }
    arm(r, 'r', f.clone().multiplyScalar(0.8).add(V(0, -0.55, 0)).addScaledVector(right, Math.cos(t * 7) * 0.3).addScaledVector(f, Math.sin(t * 7) * 0.2), 1);
    if (c.br) hold(c.br, HL, UP.clone().addScaledVector(f, 0.25).addScaledVector(right, -0.15), 0.45);
    const ice = t > 2;
    if (every(c, 'b', 0.3, 0.08)) vfx.sparkle(at.clone().add(V(0, 0.75, 0)), ice ? 0x8fe3ff : Math.random() < 0.5 ? 0x9b6bff : 0x36e07a, 2);
    if (ice && once(c, 'ice')) { vfx.flash(at.clone().add(V(0, 0.9, 0)), 0x8fe3ff, 5, 0.4); vfx.ring(P, 0x8fe3ff, 1, 12, 0.6); }
  },
  // Paladin: the golden statue rises behind him, he reads the holy book, then raises the hammer to the sky
  judgment(c) {
    const { r, t, f, right, HR, HL, P } = frameOf(c);
    if (once(c, 'p')) { c.st = mk(c, 'pr/statue', 2.4); c.bk = mk(c, 'pr/book', 0.6); c.hm = mk(c, 'pr/paladin_hammer', 0.85); }
    if (c.st) { c.st.position.copy(P).addScaledVector(f, -1.6).addScaledVector(right, 0.9).add(V(0, -2.4 + 2.4 * ease(t / 0.8), 0)); c.st.rotation.y = r.facing; }
    arm(r, 'l', f.clone().add(V(0, 0.05, 0)), 1);
    if (c.bk) { c.bk.position.copy(HL).add(V(0, 0.18, 0)).addScaledVector(f, 0.15); c.bk.rotation.y = r.facing + PI / 2; c.bk.visible = t < 1.6; if (every(c, 'g', 0.2, 0.15)) vfx.flash(HL.clone().add(V(0, 0.25, 0)), 0xffd23f, 0.9, 0.25); }
    arm(r, 'r', t < 1.2 ? f.clone().add(V(0, -0.6, 0)) : UP.clone().addScaledVector(f, 0.2), 1);
    if (c.hm) hold(c.hm, HR, t < 1.2 ? f.clone().add(V(0, -0.4, 0)) : UP.clone().addScaledVector(f, 0.3));
    if (t > 1.9 && once(c, 'x')) { vfx.flash(HR.clone().add(V(0, 0.6, 0)), 0xffd23f, 6, 0.5); vfx.bolt(HR.clone(), 0xffd23f); vfx.ring(P, 0xffd23f, 1, 10, 0.6); }
  },
  // Driver: the start lights go red, red... green! And a race car comes flying past
  pitstop(c) {
    const { r, t, f, right, P } = frameOf(c);
    if (once(c, 'l')) { c.li = mk(c, 'pr/startlight', 2.2); c.car = mk(c, 'pr/race_car', 2.6); }
    const lp = P.clone().addScaledVector(f, -0.2).addScaledVector(right, -1.25);
    if (c.li) { c.li.position.copy(lp); c.li.rotation.y = r.facing + PI; grow(c.li, ease(t * 3)); }
    arm(r, 'l', f.clone().addScaledVector(right, -0.8).add(V(0, 0.5, 0)), ease(t * 3));
    for (const [k, at, col] of [[0, 0.55, 0xff3d3d], [1, 1.0, 0xff3d3d], [2, 1.45, 0x36e07a]]) if (t > at && once(c, 'li' + k)) { vfx.flash(lp.clone().add(V(0, 1.7 - k * 0.0, 0)), col, 2.2, 0.4); sfx.beep?.(); }
    if (c.car) { const k = (t - 1.5) / 1.05; c.car.visible = k > 0; c.car.position.copy(P).addScaledVector(right, -1.4).addScaledVector(f, -5 + Math.max(0, k) * 12); c.car.rotation.y = r.facing + (ULTS['ch-driver'].carYaw || 0); if (k > 0 && every(c, 's', 1.55, 0.05)) vfx.flash(c.car.position.clone().addScaledVector(f, -1.2).add(V(0, 0.4, 0)), 0xbfc6d4, 1.4, 0.4, 'smoke'); }
    if (t > 1.55 && once(c, 'cheer')) r.play?.('Cheer', 0.1);
  },
  // Hiker: pitches a tent, takes a big drink of water... and the mountain starts to rumble
  campout(c) {
    const { r, t, f, right, HR, P, head } = frameOf(c);
    if (once(c, 'c')) { c.tn = mk(c, 'pr/tent', 1.9); c.bt = mk(c, 'pr/bottle', 0.32); }
    if (c.tn) { c.tn.position.copy(P).addScaledVector(f, -1.4).addScaledVector(right, 1.5); c.tn.rotation.y = r.facing; const k = Math.min(1, t / 0.5); grow(c.tn, k < 1 ? k * 1.15 : 1 + Math.sin((t - 0.5) * 20) * Math.max(0, 0.6 - t) * 0.2); }
    const drink = t > 0.6 && t < 1.8;
    arm(r, 'r', drink ? f.clone().multiplyScalar(0.2).add(V(0, 1, 0)).addScaledVector(right, -0.2) : f.clone().add(V(0, -0.3, 0)), ease((t - 0.4) * 4));
    if (c.bt) { hold(c.bt, HR, drink ? head.clone().sub(HR).normalize().add(V(0, 0.2, 0)) : UP, 0.35); if (drink && every(c, 'd', 0.8, 0.15)) vfx.drop(head.clone().addScaledVector(f, 0.2), V(rand(-0.5, 0.5), 0.5, rand(-0.5, 0.5))); }
    if (t > 1.9) { G.shake = 0.35; if (once(c, 'r')) { r.play?.(r.actions.Smash ? 'Smash' : 'Punch', 0.1); vfx.ring(P, 0x9b8a74, 1, 10, 0.8); } }
  },
  // Caveman: lights a campfire, lifts his club high and slams the ground
  quake(c) {
    const { r, t, f, right, HR, P } = frameOf(c);
    if (once(c, 'q')) { c.fb = mk(c, 'pr/campfire_base', 1.1); c.fl = mk(c, 'pr/campfire_logs', 0.8); c.cl = mk(c, 'pr/club', 0.95); }
    const fp = P.clone().addScaledVector(f, 1.1).addScaledVector(right, -0.9);
    for (const o of [c.fb, c.fl]) if (o) { o.position.copy(fp); grow(o, ease(t * 3)); }
    if (t > 0.3) vfx.fire(fp.clone().add(V(0, 0.25, 0)), 1);
    const up = t > 0.5 && t < 1.7;
    arm(r, 'r', up ? UP.clone().addScaledVector(f, -0.3) : f.clone().add(V(0, -0.5, 0)), ease((t - 0.3) * 4));
    if (c.cl) hold(c.cl, HR, up ? UP.clone().addScaledVector(f, 0.1) : f.clone().add(V(0, 0.3, 0)), 0.1);
    if (t > 1.7 && once(c, 'sm')) r.play?.(r.actions.Smash ? 'Smash' : 'Punch', 0.05);
    if (t > 2.05 && once(c, 'hit')) { vfx.boom(P.clone().addScaledVector(f, 1).add(V(0, 0.2, 0)), 0xff8a3d, 0.8); vfx.ring(P, 0xb5743d, 1, 12, 0.6); G.shake = 1; }
  },
  // Elf: her toy train chugs in circles around her, faster and faster
  train(c) {
    const { r, t, P } = frameOf(c);
    if (once(c, 't')) c.tr = mk(c, 'pr/train', 1.1);
    if (c.tr) { const a = t * 3.2 + r.facing, R = 1.5; c.tr.position.set(P.x + Math.cos(a) * R, P.y + 0.02, P.z + Math.sin(a) * R); c.tr.rotation.y = -a + (ULTS['ch-elf'].trainYaw ?? 0); grow(c.tr, ease(t * 3)); if (every(c, 's', 0.2, 0.25)) vfx.flash(c.tr.position.clone().add(V(0, 0.9, 0)), 0xffffff, 0.45, 0.5, 'smoke'); }
    if (every(c, 'k', 0.3, 0.3)) vfx.sparkle(P.clone().add(V(0, 1.3, 0)), 0x36e07a, 4);
  },
  // Elf Boy: bang bang bang at the workbench, then candy canes shoot out
  workshop(c) {
    const { r, t, f, right, HR, P } = frameOf(c);
    if (once(c, 'w')) { c.wb = mk(c, 'pr/workbench', 1.5); c.hm = mk(c, 'pr/elf_hammer', 0.42); }
    const bp = P.clone().addScaledVector(f, 1.1);
    if (c.wb) { c.wb.position.copy(bp); c.wb.rotation.y = r.facing + PI; grow(c.wb, ease(t * 3)); }
    const sw = Math.sin(t * 14);
    arm(r, 'r', f.clone().multiplyScalar(0.8).add(V(0, sw * 0.55, 0)).addScaledVector(right, -0.1), 1);
    if (c.hm) hold(c.hm, HR, f.clone().multiplyScalar(0.2).add(UP), 0.15);
    if (t < 1.8 && sw < -0.95 && every(c, 'h', 0.2, 0.2)) { vfx.sparkle(bp.clone().add(V(0, 0.8, 0)), 0xffd23f, 5); sfx.bat?.(); }
    for (let k = 0; k < 4; k++) if (t > 1.8 + k * 0.12 && once(c, 'cc' + k)) { const cc = mk(c, 'pr/candycane', 0.8), d = V(rand(-0.5, 0.5), 3, rand(-0.5, 0.5)), at = bp.clone().add(V(0, 0.8, 0)); if (cc) anim(c, cc, (q) => { cc.position.copy(at).addScaledVector(d, q.t * 2.2); cc.rotation.z += 0.3; }, 0.8); vfx.sparkle(at, 0xff3d6b, 4); }
  },
  // Skater Girl: a huge kickflip, the board spins under her and she lands with a wave
  kickflip(c) {
    const { r, t, f, P } = frameOf(c);
    if (once(c, 's')) { c.sb = mk(c, 'pr/skateboard', 0.95); c.ry = r.model.rotation.y; c.keepRy = true; }
    const k = (t - 0.5) / 1.1, air = k > 0 && k < 1, y = air ? Math.sin(k * PI) * 1.4 : 0;
    lift(c, y); r.model.rotation.y = c.ry + (air ? ease(k) * PI * 2 : k >= 1 ? PI * 2 : 0);
    if (c.sb) { c.sb.position.copy(P).add(V(0, y + 0.06 - (air ? Math.sin(k * PI) * 0.15 : 0), 0)); point(c.sb, f, XA); if (air) c.sb.rotateOnAxis(XA, ease(k) * PI * 4); }
    if (t > 0.45 && once(c, 'pop')) vfx.ring(P, 0x3dd6ff, 0.5, 4, 0.4);
    if (air && every(c, 'tr', 0.5, 0.06)) vfx.sparkle(P.clone().add(V(0, y + 0.3, 0)), 0x3dd6ff, 2);
    if (k >= 1 && once(c, 'land')) { vfx.ring(P, 0x3dd6ff, 1, 12, 0.6); vfx.flash(P.clone().add(V(0, 0.5, 0)), 0xffffff, 4, 0.3); G.shake = 0.6; r.play?.('Cheer', 0.1); }
  },
  // Cap Kid: lines up the football, kicks it on fire, and lifts the trophy
  kick(c) {
    const { r, t, f, right, P, head } = frameOf(c);
    if (once(c, 'k')) { c.fb = mk(c, 'pr/football', 0.36); c.tp = mk(c, 'pr/trophy', 0.6); }
    if (t > 0.85 && once(c, 'kk')) r.play?.(r.actions.Kick ? 'Kick' : 'Punch', 0.05);
    if (c.fb) { const k = Math.max(0, (t - 1.15) / 0.7); c.fb.position.copy(P).addScaledVector(f, 0.55 + k * 12).add(V(0, 0.18 + k * 2.5, 0)); c.fb.rotation.x += k > 0 ? 0.5 : 0; if (k > 0 && k < 1) vfx.fire(c.fb.position.clone(), 2); c.fb.visible = k < 1; if (t > 1.15 && once(c, 'b')) { vfx.flash(c.fb.position.clone(), 0xffd23f, 2, 0.3); G.shake = 0.4; } }
    if (t > 1.8) { const w = ease((t - 1.8) * 4); arm(r, 'l', UP.clone().addScaledVector(right, -0.25), w); arm(r, 'r', UP.clone().addScaledVector(right, 0.25), w); if (c.tp) { c.tp.visible = true; c.tp.position.copy(head).add(V(0, 0.55, 0)); c.tp.rotation.y = r.facing; if (every(c, 'g', 1.8, 0.12)) vfx.sparkle(c.tp.position.clone(), 0xffd23f, 3); } }
    else if (c.tp) c.tp.visible = false;
  },
  // Veteran: a fire hydrant pops up and he cracks it open, holding up a stop sign
  hydrant(c) {
    const { r, t, f, right, HL, P } = frameOf(c);
    if (once(c, 'h')) { c.hy = mk(c, 'pr/hydrant', 0.85); c.ss = mk(c, 'pr/stopsign', 1.3); }
    const hp = P.clone().addScaledVector(f, 1.1).addScaledVector(right, 0.35);
    if (c.hy) { c.hy.position.copy(hp); c.hy.rotation.y = r.facing; grow(c.hy, ease(t * 4)); }
    arm(r, 'l', UP.clone().addScaledVector(f, 0.5).addScaledVector(right, -0.2), ease(t * 3));
    if (c.ss) { grow(c.ss, ease(t * 3)); hold(c.ss, HL, UP.clone().addScaledVector(f, 0.2), 0.3); c.ss.rotateOnAxis(UP, r.facing + PI); }
    if (t > 0.8) { for (let i = 0; i < 3; i++) vfx.drop(hp.clone().add(V(0, 0.6, 0)), f.clone().multiplyScalar(rand(5, 11)).add(V(rand(-1.2, 1.2), rand(1.5, 4), rand(-1.2, 1.2)))); if (once(c, 'o')) { vfx.flash(hp.clone().add(V(0, 0.6, 0)), 0x8fd3ff, 2.5, 0.3); G.shake = 0.3; } }
  },
});
// keep moving an object that already exists (like the balloon dog) for a while, then remove it
function prop2(o, upd, life) { props.push({ o, t: 0, life, upd, s: o.scale.x }); }
