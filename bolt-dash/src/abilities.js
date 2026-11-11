// Abilities: every character has one ability (a button with a cooldown) and one knockout move (charges up while you
// play; when it is full you unleash it with its own animation). Off in the open world.
import { THREE, M, G, V, PI, rand, sfx, fx, scene, place } from './core.js';
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
};
// knockout moves: every character has its own, with its own name, pose, colour and thing that comes crashing in
// type: slam (a giant thing falls in front), lift (balloons carry everyone up), rain (things fall on the others),
// storm (things spin around you), freeze (everyone near is locked in ice), leap (jump and land with a shockwave),
// wave (a ring rolls out and pushes everyone), pull (everyone is dragged in, then flung), cannon (a cannon fires)
const ULTS = {
  bolt: { name: t('Thunder Storm'), pose: 'Yes', color: 0xffd23f, type: 'storm', prop: 'Star', ps: 1.1, desc: t('Stars spin around you and knock over everyone they touch') },
  'ch-clown': { name: t('Balloon Party'), pose: 'Cheer', color: 0xff5fb8, type: 'lift', prop: 'z/Balloon', ps: 2.4, desc: t('Balloons grab everyone around and carry them into the sky') },
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
export const ultOf = (charId) => ULTS[charId] || ULTS.bolt;
// who has what (Bolt is the default character)
const KIT = {
  bolt: ['dash', 'storm'], 'ch-clown': ['pie', 'balloons'], 'ch-robot': ['shove', 'mech'], 'ch-mech': ['shield', 'mech'], 'ch-hero': ['dash', 'leap'],
  'ch-robot2': ['pull', 'mech'], 'ch-ninja': ['dash', 'storm'], 'ch-space': ['pull', 'rain'], 'ch-dino': ['stun', 'storm'], 'ch-teddy': ['shield', 'balloons'],
  'ch-action': ['shove', 'leap'], 'ch-witch': ['slip', 'freeze'], 'ch-paladin': ['shield', 'leap'], 'ch-driver': ['dash', 'rain'], 'ch-hiker': ['slip', 'leap'],
  'ch-caveman': ['shove', 'storm'], 'ch-elf': ['pie', 'freeze'], 'ch-elf2': ['slip', 'rain'], 'ch-skater': ['dash', 'storm'], 'ch-cap': ['pie', 'rain'], 'ch-vet': ['stun', 'freeze'],
};
export const kitOf = (charId) => KIT[charId || 'bolt'] || KIT.bolt;
export const abilityText = (charId) => { const [a] = kitOf(charId), u = ultOf(charId || 'bolt'); return { ab: AB[a].desc, ult: u.name + ': ' + u.desc, ultName: u.name }; };
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
  if (r.storm > 0) { r.storm -= dt; for (const o of foes(r, 2.8)) if (!(o.stormHit > 0)) { knock(o, r.pos, 11, 7); o.stormHit = 0.6; } }
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
  const p = r.pos.clone(), f = fwd(r), col = u.color;
  const boom = (x, y, z, n = 30, sp = 8) => { fx.burst(V(x, y, z), col, n, sp); fx.burst(V(x, y, z), 0xffffff, n * 0.6, sp * 0.8); };
  if (r.isPlayer) G.shake = Math.max(G.shake || 0, 0.5);
  if (u.type === 'slam') {
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
