// Abilities: every character has one ability (a button with a cooldown) and one knockout move (charges up while you
// play; when it is full you unleash it with its own animation). Off in races and in the open world, so those stay fair.
import { THREE, G, V, PI, rand, sfx, fx, scene } from './core.js';
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
const ULT = {
  mech: { anim: 'Transform', wind: 1.0, desc: t('Turns into a battle robot and smashes the ground with a giant hammer') },
  balloons: { anim: 'Cheer', wind: 0.5, desc: t('Balloons lift everyone around into the air') },
  storm: { anim: 'Spin', wind: 0.2, desc: t('Spins like a tornado and knocks over everyone it touches') },
  rain: { anim: 'Throw', wind: 0.4, desc: t('A rain of pies falls on the other players') },
  freeze: { anim: 'Taunt', wind: 0.6, desc: t('Freezes everyone nearby for 3 seconds') },
  leap: { anim: 'JumpChop', wind: 0.3, desc: t('Leaps far forward and slams down') },
};
// who has what (Bolt is the default character)
const KIT = {
  bolt: ['dash', 'storm'], 'ch-clown': ['pie', 'balloons'], 'ch-robot': ['shove', 'mech'], 'ch-mech': ['shield', 'mech'], 'ch-hero': ['dash', 'leap'],
  'ch-robot2': ['pull', 'mech'], 'ch-ninja': ['dash', 'storm'], 'ch-space': ['pull', 'rain'], 'ch-dino': ['stun', 'storm'], 'ch-teddy': ['shield', 'balloons'],
  'ch-action': ['shove', 'leap'], 'ch-witch': ['slip', 'freeze'], 'ch-paladin': ['shield', 'leap'], 'ch-driver': ['dash', 'rain'], 'ch-hiker': ['slip', 'leap'],
  'ch-caveman': ['shove', 'storm'], 'ch-elf': ['pie', 'freeze'], 'ch-elf2': ['slip', 'rain'], 'ch-skater': ['dash', 'storm'], 'ch-cap': ['pie', 'rain'], 'ch-vet': ['stun', 'freeze'],
};
export const kitOf = (charId) => KIT[charId || 'bolt'] || KIT.bolt;
export const abilityText = (charId) => { const [a, u] = kitOf(charId); return { ab: AB[a].desc, ult: ULT[u].desc }; };
export const abilitiesOn = () => { const k = G.modeObj?.kind; return !!G.modeObj && k !== 'race' && k !== 'world' && !G.modeObj.noAbilities; };

const foes = (r, range) => G.runners.filter((o) => o !== r && !o.out && !o.finished && (!r.team || o.team !== r.team) && Math.hypot(o.pos.x - r.pos.x, o.pos.z - r.pos.z) < range);
const fwd = (r) => V(Math.sin(r.facing), 0, Math.cos(r.facing));
const knock = (o, from, power, up = 8) => { if (o.shieldT > 0) return; const d = V(o.pos.x - from.x, 0, o.pos.z - from.z); if (d.lengthSq() < 0.01) d.set(rand(-1, 1), 0, rand(-1, 1)); d.normalize().multiplyScalar(power); d.y = up; o.tumble(d); };
const hazards = []; // slippery patches on the floor

export function abilityUpdate(r, dt) {
  r.abCd = Math.max(0, (r.abCd || 0) - dt); r.shieldT = Math.max(0, (r.shieldT || 0) - dt);
  if (abilitiesOn() && !r.out) r.ultCharge = Math.min(1, (r.ultCharge || 0) + dt / 50);
  if (r.ultPending) { r.ultPending.t -= dt; if (r.ultPending.t <= 0) { const u = r.ultPending; r.ultPending = null; ultHit(r, u.kind); } }
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
export function useUlt(r) {
  if (!abilitiesOn() || r.out || (r.ultCharge || 0) < 1 || r.ultPending) return false;
  const [, kind] = kitOf(r.kk?.id), u = ULT[kind]; r.ultCharge = 0;
  r.play?.(r.actions[u.anim] ? u.anim : 'Punch', 0.05); r.shieldT = Math.max(r.shieldT || 0, u.wind + 0.4); r.stun?.(u.wind * 0.9); // stands still while winding up
  fx.burst(V(r.pos.x, r.pos.y + 1.5, r.pos.z), kind === 'mech' ? 0x3d7bff : 0xffd23f, 30, 6);
  if (r.isPlayer) { sfx.win?.(); G.shake = Math.max(G.shake || 0, 0.3); r.ultFx = kind; }
  r.ultPending = { kind, t: u.wind };
  return true;
}
function ultHit(r, kind) {
  const p = r.pos, f = fwd(r);
  if (kind === 'mech') {
    // the robot's screen goes blue, it turns into a battle robot and a giant hammer comes down
    r.play?.(r.actions.Smash ? 'Smash' : 'Punch', 0.05); const big = r.model; big.scale.multiplyScalar(1.5); setTimeout(() => big.scale.multiplyScalar(1 / 1.5), 1600);
    setTimeout(() => { for (const o of foes(r, 7)) knock(o, p, 18, 12); fx.burst(V(p.x + f.x * 2, p.y + 0.3, p.z + f.z * 2), 0x3d7bff, 60, 10); fx.burst(V(p.x + f.x * 2, p.y + 0.3, p.z + f.z * 2), 0xffffff, 40, 8); sfx.boom?.(); G.shake = Math.max(G.shake || 0, 0.9); }, 450);
  } else if (kind === 'balloons') { for (const o of foes(r, 9)) { if (o.shieldT > 0) continue; o.body.velocity.set(rand(-2, 2), 19, rand(-2, 2)); o.stun?.(1.5); fx.confetti(V(o.pos.x, o.pos.y + 2, o.pos.z), 30); } sfx.boing?.(); }
  else if (kind === 'storm') { r.storm = 2.6; r.play?.(r.actions.Spin ? 'Spin' : 'Punch', 0.05); }
  else if (kind === 'rain') { const list = foes(r, 22); for (let k = 0; k < 6; k++) setTimeout(() => { const o = list[k % Math.max(1, list.length)]; if (!o || o.out) return; fx.burst(V(o.pos.x, o.pos.y + 1.5, o.pos.z), 0xffffff, 16, 6); o.stun?.(0.8); knock(o, V(o.pos.x + rand(-1, 1), 0, o.pos.z + rand(-1, 1)), 4, 5); }, k * 280); }
  else if (kind === 'freeze') { for (const o of foes(r, 10)) { o.frozenT = Math.max(o.frozenT || 0, 3); o.stun?.(3); fx.burst(V(o.pos.x, o.pos.y + 1, o.pos.z), 0xbfe9ff, 18, 4); } }
  else if (kind === 'leap') { const v = r.body.velocity; v.x = f.x * 16; v.z = f.z * 16; v.y = 13; setTimeout(() => { for (const o of foes(r, 5)) knock(o, r.pos, 15, 10); fx.burst(V(r.pos.x, r.pos.y + 0.2, r.pos.z), 0xffd23f, 40, 9); G.shake = Math.max(G.shake || 0, 0.6); }, 700); }
}
export function clearAbilities() { for (const h of hazards) h.o.removeFromParent(); hazards.length = 0; }
