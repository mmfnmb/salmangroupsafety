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
  bolt: { name: t('Thunder Storm'), pose: 'Yes', color: 0xffd23f, type: 'storm', prop: 'Star', ps: 1.1, desc: t('Stars spin around you and knock over everyone they touch') },
  'ch-clown': [{ name: t('Juggling Surprise'), pose: 'Idle', color: 0xffd23f, type: 'clownboom', script: 'juggle', dur: 3.2, desc: t('Juggles balls that turn into clubs in the air, drops them all, catches one, squeezes it and it explodes') },
    { name: t('Balloon Dog & Hammer'), pose: 'Idle', color: 0x4cc9f0, type: 'hammerspin', script: 'balloondog', dur: 2.8, desc: t('Ties a balloon dog to someone so they float away, then spins with a giant hammer') }],
  'ch-robot': { name: t('Mega Hammer'), pose: 'Transform', color: 0x3d7bff, type: 'slam', prop: 'z/Obstacle_Hammer', ps: 2.6, desc: t('Transforms, pulls out a giant hammer and smashes the ground') },
  'ch-mech': { name: t('Missile Rain'), pose: 'Taunt', color: 0xff3d3d, type: 'rain', prop: 'Cannonball', ps: 1.6, desc: t('Missiles rain down on the other players') },
  'ch-hero': { name: t('Hero Landing'), pose: 'Cheer', color: 0xff3d3d, type: 'leap', prop: 'Star', ps: 2.2, desc: t('Flies up and lands with a shockwave') },
  'ch-robot2': { name: t('Saw Magnet'), pose: 'Transform', color: 0xff8a3d, type: 'pull', prop: 'Hazard_Saw', ps: 1.8, desc: t('A spinning saw magnet drags everyone in, then flings them') },
  'ch-ninja': { name: t('Shadow Blades'), pose: 'Block', color: 0x7a3dff, type: 'storm', prop: 'Hazard_Saw', ps: 0.6, desc: t('Blades spin around the ninja and cut through the crowd') },
  'ch-space': { name: t('Meteor Shower'), pose: 'Taunt', color: 0x9b6bff, type: 'rain', prop: 'SpikyBall', ps: 1.5, desc: t('Meteors fall from space onto the other players') },
  'ch-dino': { name: t('Dino Roar'), pose: 'Taunt', color: 0x36e07a, type: 'wave', prop: 'z/Torus', ps: 1, desc: t('A roar so loud a green ring blasts everyone away') },
  'ch-teddy': { name: t('Bounce House'), pose: 'Cheer', color: 0xff9ad5, type: 'wave', prop: 'Bouncer', ps: 1.4, desc: t('Giant bouncers pop up and throw everyone around') },
  'ch-action': { name: t('Crate Crash'), pose: 'Smash', color: 0xc8903d, type: 'slam', prop: 'Cube_Crate', ps: 5, desc: t('A giant crate falls from the sky in front of you') },
  'ch-witch': { name: t('Ice Prison'), pose: 'Taunt', color: 0x8fe3ff, type: 'freeze', prop: 'k/block-snow-low-hexagon', ps: 2.2, desc: t('Everyone close is locked in ice for 3 seconds') },
  'ch-paladin': { name: t('Golden Judgment'), pose: 'Block', color: 0xffd23f, type: 'slam', prop: 'Star', ps: 5, desc: t('A giant golden star comes down from the sky') },
  'ch-driver': { name: t('Coin Jackpot'), pose: 'Cheer', color: 0xffc83d, type: 'rain', prop: 'Coin', ps: 2.6, desc: t('Heavy gold coins rain on the other players') },
  'ch-hiker': { name: t('Rockslide'), pose: 'Smash', color: 0x9b8a74, type: 'rain', prop: 'Rock_1', ps: 1.6, desc: t('Rocks roll down onto the other players') },
  'ch-caveman': { name: t('Club Quake'), pose: 'Smash', color: 0xb5743d, type: 'leap', prop: 'Rock_2', ps: 1.4, desc: t('Jumps and slams the ground so hard the rocks fly') },
  'ch-elf': { name: t('Gift Bombs'), pose: 'Cheer', color: 0x36e07a, type: 'rain', prop: 'acc/present-a-cube', ps: 2.2, desc: t('Presents fall and explode on the other players') },
  'ch-elf2': { name: t('Candy Tornado'), pose: 'Spin', color: 0xff3d6b, type: 'storm', prop: 'k/candy-cane-red', ps: 2.4, desc: t('Candy canes whirl around and knock everyone over') },
  'ch-skater': { name: t('Ring Rush'), pose: 'Cheer', color: 0x3dd6ff, type: 'wave', prop: 'z/Ring_Hoop', ps: 1, desc: t('Rings roll out and push everyone away') },
  'ch-cap': { name: t('Cannon Blast'), pose: 'Taunt', color: 0xff8a3d, type: 'cannon', prop: 'Cannon', ps: 1.4, desc: t('A cannon appears and blasts everyone in front') },
  'ch-vet': { name: t('Big Bomb'), pose: 'Smash', color: 0xff5a3d, type: 'slam', prop: 'k/bomb', ps: 4, desc: t('Drops a giant bomb that blows everyone away') },
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
function prop(name, x, y, z, s, upd, life) { if (!M[name]) return null; const o = place(name, x, y, z, s, rand(0, 6), scene); o.traverse((m) => { if (m.isMesh) m.castShadow = true; }); const p = { o, t: 0, life, upd, s }; props.push(p); return p; }
export function propsUpdate(dt) {
  for (let i = props.length - 1; i >= 0; i--) { const p = props[i]; p.t += dt; p.upd?.(p, dt); if (p.t >= p.life) { const k = Math.min(1, (p.t - p.life) / 0.3); p.o.scale.setScalar(p.s * (1 - k)); if (k >= 1) { p.o.removeFromParent(); props.splice(i, 1); } } }
}
export function useUlt(r) {
  if (!abilitiesOn() || r.out || (r.ultCharge || 0) < 1 || r.ultPending || r.ultCine) return false;
  const u = ultOf(r.kk?.id || 'bolt'); r.ultCharge = 0; r.shieldT = Math.max(r.shieldT || 0, 2.5);
  r.play?.(r.actions[u.pose] ? u.pose : 'Yes', 0.05);
  // the player gets the cinematic (the game waits for it); bots just wind up for a moment
  if (r.isPlayer && G.onUlt) { r.ultCine = true; G.onUlt(r, u, () => { r.ultCine = false; r.ultPending = { u, t: 0.05 }; }); }
  else { r.stun?.(0.5); fx.burst(V(r.pos.x, r.pos.y + 1.5, r.pos.z), u.color, 24, 5); r.ultPending = { u, t: 0.6 }; }
  return true;
}
function ultHit(r, u) {
  const p = V(r.pos.x, r.pos.y, r.pos.z), f = fwd(r), col = u.color;
  const boom = (x, y, z, n = 30, sp = 8) => { fx.burst(V(x, y, z), col, n, sp); fx.burst(V(x, y, z), 0xffffff, n * 0.6, sp * 0.8); };
  if (r.isPlayer) G.shake = Math.max(G.shake || 0, 0.5);
  if (u.type === 'clownboom') {
    const at = p.clone().add(V(0, 2, 0)); vfx.boom(at, 0xffd23f, 1.6); vfx.ring(p, 0xff5fb8, 1, 18, 0.7); fx.confetti?.(at, 120);
    for (const o of foes(r, 9)) knock(o, p, 18, 12); sfx.boom?.(); G.shake = Math.max(G.shake || 0, 1);
  } else if (u.type === 'hammerspin') {
    r.storm = 2.6; r.stormPow = 15; r.play?.(r.actions.Spin ? 'Spin' : 'Punch', 0.05);
    const hk = M['pr/clown_hammer'] ? 'pr/clown_hammer' : 'z/Obstacle_Hammer';
    prop(hk, p.x, p.y + 1, p.z, M['pr/clown_hammer'] ? 1.7 : 0.6, (q) => { const a = q.t * 13; q.o.position.set(r.pos.x + Math.sin(a) * 1.6, r.pos.y + 1, r.pos.z + Math.cos(a) * 1.6); q.o.rotation.set(0, a, -PI / 2); if (Math.random() < 0.4) vfx.slash(q.o.position.clone(), 0x4cc9f0, 2.2); }, 2.6);
  } else if (u.type === 'slam') {
    const x = p.x + f.x * 3, z = p.z + f.z * 3;
    prop(u.prop, x, p.y + 12, z, u.ps, (q) => { q.o.position.y = Math.max(p.y + 0.2, p.y + 12 - q.t * q.t * 90); q.o.rotation.y += 0.02; if (!q.hit && q.o.position.y <= p.y + 0.21) { q.hit = true; for (const o of foes(r, 7.5)) knock(o, V(x, 0, z), 18, 12); boom(x, p.y + 0.4, z, 50, 11); sfx.boom?.(); G.shake = Math.max(G.shake || 0, 1); } }, 1.4);
  } else if (u.type === 'lift') {
    for (const o of foes(r, 10)) { if (o.shieldT > 0) continue; o.body.velocity.set(rand(-2, 2), 21, rand(-2, 2)); o.stun?.(2); prop(u.prop, o.pos.x, o.pos.y + 2.4, o.pos.z, u.ps, (q) => { q.o.position.set(o.pos.x, o.pos.y + 2.4 + Math.max(0, q.t - 1.2) * 8, o.pos.z); }, 2.6); fx.confetti?.(V(o.pos.x, o.pos.y + 2, o.pos.z), 30); }
    sfx.boing?.();
  } else if (u.type === 'rain') {
    const list = foes(r, 24);
    for (let k = 0; k < 10; k++) {
      const tg = list[k % Math.max(1, list.length)], x = tg ? tg.pos.x + rand(-1, 1) : p.x + rand(-8, 8), z = tg ? tg.pos.z + rand(-1, 1) : p.z + rand(-8, 8), y0 = (tg ? tg.pos.y : p.y) + 16, delay = k * 0.16;
      prop(u.prop, x, y0, z, u.ps, (q) => { const tt = Math.max(0, q.t - delay); q.o.visible = q.t >= delay; q.o.position.y = Math.max(y0 - 16, y0 - tt * tt * 60); q.o.rotation.x += 0.1; if (!q.hit && tt > 0 && q.o.position.y <= y0 - 15.9) { q.hit = true; boom(x, y0 - 15.5, z, 16, 6); for (const o of foes(r, 26)) if (Math.hypot(o.pos.x - x, o.pos.z - z) < 2.6) knock(o, V(x, 0, z), 10, 8); } }, delay + 1.2);
    }
  } else if (u.type === 'storm') {
    r.storm = 2.6; r.play?.(r.actions.Spin ? 'Spin' : 'Punch', 0.05);
    for (let k = 0; k < 4; k++) prop(u.prop, p.x, p.y + 1, p.z, u.ps, (q) => { const a = q.t * 7 + k * PI / 2; q.o.position.set(r.pos.x + Math.cos(a) * 2.4, r.pos.y + 1 + Math.sin(q.t * 5 + k) * 0.3, r.pos.z + Math.sin(a) * 2.4); q.o.rotation.y += 0.3; }, 2.6);
  } else if (u.type === 'freeze') {
    for (const o of foes(r, 11)) { o.frozenT = Math.max(o.frozenT || 0, 3); o.stun?.(3); o.body.velocity.set(0, o.body.velocity.y, 0); prop(u.prop, o.pos.x, o.pos.y - 0.2, o.pos.z, u.ps, (q) => q.o.position.set(o.pos.x, o.pos.y - 0.2, o.pos.z), 3); boom(o.pos.x, o.pos.y + 1, o.pos.z, 14, 4); }
  } else if (u.type === 'leap') {
    const v = r.body.velocity; v.x = f.x * 16; v.z = f.z * 16; v.y = 15;
    setTimeout(() => { const q = r.pos; for (const o of foes(r, 6)) knock(o, q, 16, 11); boom(q.x, q.y + 0.2, q.z, 50, 10); for (let k = 0; k < 6; k++) { const a = k / 6 * PI * 2; prop(u.prop, q.x + Math.cos(a) * 1.5, q.y + 0.3, q.z + Math.sin(a) * 1.5, u.ps * 0.5, (pp) => { pp.o.position.x += Math.cos(a) * 0.25; pp.o.position.z += Math.sin(a) * 0.25; pp.o.position.y += (0.2 - pp.t * 0.6); }, 0.8); } G.shake = Math.max(G.shake || 0, 0.8); sfx.boom?.(); }, 750);
  } else if (u.type === 'wave') {
    const hit = new Set();
    prop(u.prop, p.x, p.y + 0.4, p.z, u.ps, (q) => { const R = q.t * 18; q.o.scale.setScalar(u.ps * (1 + q.t * 8)); q.o.rotation.y += 0.2; for (const o of foes(r, 16)) if (!hit.has(o) && Math.hypot(o.pos.x - p.x, o.pos.z - p.z) < R) { hit.add(o); knock(o, p, 15, 9); } }, 0.8);
    boom(p.x, p.y + 0.6, p.z, 40, 9);
  } else if (u.type === 'pull') {
    const list = foes(r, 15);
    prop(u.prop, p.x + f.x * 1.5, p.y + 1.6, p.z + f.z * 1.5, u.ps, (q) => { q.o.rotation.z += 0.4; q.o.rotation.y += 0.2; }, 1.6);
    for (const o of list) { const d = V(p.x - o.pos.x, 0, p.z - o.pos.z).normalize().multiplyScalar(17); o.body.velocity.set(d.x, 5, d.z); o.stun?.(0.8); }
    setTimeout(() => { for (const o of foes(r, 5)) knock(o, r.pos, 17, 12); boom(r.pos.x, r.pos.y + 1, r.pos.z, 40, 9); }, 800);
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
function sized(key, len) { if (!M[key]) return null; const o = place(key, 0, -50, 0, 1, 0, scene); const b = new THREE.Box3().setFromObject(o), s = b.getSize(V()); o.scale.setScalar(len / Math.max(s.x, s.y, s.z, 0.001)); o.userData.base = o.scale.x; return o; }
const COLS = ['red', 'blue', 'green', 'yellow'], COLHEX = [0xff4d4d, 0x4cc9f0, 0x36e07a, 0xffd23f];
export const CINE = {
  // juggling: three balls fly from hand to hand; in the air they turn into juggling clubs (and change colour), near
  // the hands they are balls again. Then he drops them all, catches his own ball, squeezes it... and it explodes
  juggle(c, dt) {
    const r = c.r, b = bones(r), t = c.t, f = V(Math.sin(r.facing), 0, Math.cos(r.facing)), right = V(Math.cos(r.facing), 0, -Math.sin(r.facing)), up = V(0, 1, 0);
    if (!c.objs) { c.objs = [0, 1, 2].map((k) => ({ balls: COLS.map((cl) => sized('pr/ball_' + cl, 0.32)), pins: COLS.map((cl) => sized('pr/juggling_pin_' + cl, 0.55)), mode: null, col: -1, vy: 0, pos: null })); c.big = sized('pr/clown_ball', 0.45); }
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
        const sq = Math.max(0, t - 2.75), wob = 1 + sq * 2.2 + Math.sin(t * 60) * 0.06 * (sq > 0 ? 1 : 0);
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
// keep moving an object that already exists (like the balloon dog) for a while, then remove it
function prop2(o, upd, life) { props.push({ o, t: 0, life, upd, s: o.scale.x }); }
