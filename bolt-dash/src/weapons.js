// Weapons: pickups, projectiles (foam darts, rockets, grenades) and what each one does.
import { THREE, CANNON, M, G, V, PI, rand, clamp, scene, world, fx, puffs, sfx, toast, G_STATIC, G_HAZARD } from './core.js';
import { holdItem } from './cosmetics.js';

export const WEAPONS = {
  push: { name: 'مسدس الدفع', model: 'k/blaster-a', proj: 'dart', speed: 44, ammo: 3, cd: 0.45, color: 0xff8a3d, assist: 0.45 },
  rapid: { name: 'الرشاش', model: 'k/blaster-d', proj: 'dart', speed: 48, ammo: 18, cd: 0.11, color: 0xa070ff, assist: 0.35, small: true },
  freeze: { name: 'مسدس التلج', model: 'k/blaster-h', proj: 'dart', speed: 44, ammo: 3, cd: 0.5, color: 0x8fe6ff, assist: 0.45 },
  pull: { name: 'مسدس الشفط', model: 'k/blaster-l', proj: 'dart', speed: 44, ammo: 3, cd: 0.5, color: 0xb070ff, assist: 0.45 },
  fly: { name: 'مسدس الطيران', model: 'k/blaster-o', proj: 'dart', speed: 44, ammo: 2, cd: 0.6, color: 0x36e0a8, assist: 0.35 },
  confuse: { name: 'مسدس اللخبطة', model: 'k/blaster-r', proj: 'dart', speed: 44, ammo: 2, cd: 0.6, color: 0xffd23f, assist: 0.45 },
  rpg: { name: 'آر بي جي', model: 'k/rocketlauncher', proj: 'rocket', speed: 26, ammo: 2, cd: 0.9, radius: 2.0, assist: 0.2 },
  homing: { name: 'الصاروخ الموجّه', model: 'k/rocketlauncherModern', proj: 'rocket', speed: 16, ammo: 1, cd: 1, radius: 1.7, homing: true, assist: 0.6 },
  grenade: { name: 'قنبلة', model: 'k/grenade', throw: true, ammo: 2, cd: 0.8, fuse: 1.5, radius: 2.4, len: 0.7 },
  sticky: { name: 'قنبلة لزقة', model: 'k/grenade-a', throw: true, ammo: 2, cd: 0.8, fuse: 0.9, slime: true, len: 0.7 },
};
export const HINT = {
  push: 'بيزق اللي يتضرب لورا', rapid: 'طلقات كتير بتزق شوية شوية', freeze: 'بيجمّد اللي يتضرب', pull: 'بيشد اللي يتضرب ناحيتك',
  fly: 'صوّب على حد يطير، أو اضرب تحتك وتطير إنت', confuse: 'بيعكس تحكم اللي يتضرب', rpg: 'بيكسّر الأرض والصناديق', homing: 'بيروح لوحده لأقرب حد',
  grenade: 'ترميها وتفرقع بعد ثانية ونص', sticky: 'بتعمل بقعة لزقة بتبطّأ',
};

const projs = [];
export function giveWeapon(r, id) {
  const w = WEAPONS[id];
  r.weapon = { id, ammo: w.ammo, cd: 0 };
  holdItem(r.model, 'gun:' + id, { model: w.model, grip: 1, len: w.len ?? 1.5 });
  if (r.isPlayer) { toast(`${w.name}: ${HINT[id]}`, 2.6); sfx.pickup(); }
}
export function dropWeapon(r) { r.weapon = null; holdItem(r.model, null); }
const foes = (r) => G.runners.filter((o) => o !== r && !o.out && !o.finished && (!r.team || o.team !== r.team));
// best target near the aim direction; returns { foe, dir } or null
export function assist(r, dir, cone, range = 28) {
  const o = V(r.pos.x, r.pos.y + 1.1, r.pos.z); let best = null, bestA = cone;
  for (const f of foes(r)) {
    const to = V(f.pos.x, f.pos.y + 0.9, f.pos.z).sub(o); const d = to.length(); if (d > range || d < 0.5) continue;
    const a = to.normalize().angleTo(dir); if (a < bestA) { bestA = a; best = { foe: f, dir: to.clone() }; }
  }
  return best;
}
export function fire(r, aim, lock) {
  const wp = r.weapon; if (!wp || wp.cd > 0) return;
  const w = WEAPONS[wp.id]; wp.cd = w.cd; wp.ammo--;
  let dir = aim.clone().normalize();
  // the player aims with the crosshair (and its lock); bots get a little help instead
  let hit = null;
  if (r.isPlayer) { if (lock && !lock.out) hit = { foe: lock, dir: V(lock.pos.x - r.pos.x, lock.pos.y + 0.9 - (r.pos.y + 1.1), lock.pos.z - r.pos.z) }; }
  else if (w.assist) hit = assist(r, dir, w.assist);
  if (hit) dir = hit.dir.normalize();
  r.facing = Math.atan2(dir.x, dir.z);
  const o = V(r.pos.x + dir.x * 0.7, r.pos.y + 1.1, r.pos.z + dir.z * 0.7);
  r.swingT = 0.2; r.play('Punch', 0.05, 2);
  if (wp.id === 'fly' && !hit) {
    // nobody in the sights: blast the ground and fly up
    r.body.velocity.y = 23; r.grounded = false; r.launchT = 0.6; fx.boom(V(r.pos.x, r.pos.y, r.pos.z), 1.2); sfx.boing();
  } else if (w.throw) {
    const flat = Math.hypot(dir.x, dir.z) || 1;
    spawn({ kind: 'grenade', w, owner: r, pos: o, vel: V(dir.x / flat * 12, 7 + Math.max(0, dir.y) * 8, dir.z / flat * 12), fuse: w.fuse, model: w.model, scale: 4 });
  } else if (w.proj === 'rocket') {
    spawn({ kind: 'rocket', w, owner: r, pos: o, vel: dir.clone().multiplyScalar(w.speed), life: 3.5, model: 'k/ammo_rocket', scale: 3.6, target: hit?.foe });
    sfx.rocket();
  } else {
    spawn({ kind: 'dart', w, owner: r, pos: o, vel: dir.clone().multiplyScalar(w.speed), life: 1.2, model: 'k/bullet-foam-tip', scale: w.small ? 7 : 10 });
    sfx.shoot();
  }
  if (wp.ammo <= 0) dropWeapon(r);
}
function spawn(p) {
  p.obj = M[p.model].scene.clone(); p.obj.scale.setScalar(p.scale); scene.add(p.obj);
  p.obj.traverse((x) => { if (x.isMesh) x.castShadow = true; });
  p.obj.position.copy(p.pos); projs.push(p);
}
const ray = new CANNON.RaycastResult(), up = V(0, 1, 0), q = new THREE.Quaternion();
function hitRunner(p, a, b) {
  const seg = b.clone().sub(a), L = seg.length() || 1e-6; seg.divideScalar(L);
  for (const r of G.runners) {
    if (r === p.owner || r.out || r.finished || (p.owner.team && r.team === p.owner.team)) continue;
    const c = V(r.pos.x, r.pos.y + 0.85, r.pos.z), t = clamp(c.clone().sub(a).dot(seg), 0, L);
    if (a.clone().addScaledVector(seg, t).distanceTo(c) < 0.85) return r;
  }
  return null;
}
function dartHit(p, r) {
  const d = p.vel.clone().setY(0).normalize(), id = p.w === WEAPONS.push ? 'push' : Object.keys(WEAPONS).find((k) => WEAPONS[k] === p.w);
  fx.burst(V(r.pos.x, r.pos.y + 1, r.pos.z), p.w.color, 8, 4);
  if (id === 'push') r.knock(d.multiplyScalar(13).add(V(0, 7, 0)));
  else if (id === 'rapid') {
    const v = r.body.velocity; v.x += d.x * 3.2; v.z += d.z * 3.2;
    r.rapidHits = (r.rapidHits || 0) + 1; clearTimeout(r.rapidTimer); r.rapidTimer = setTimeout(() => { r.rapidHits = 0; }, 900);
    if (r.rapidHits >= 5) { r.rapidHits = 0; r.knock(d.multiplyScalar(8).add(V(0, 6, 0))); }
  } else if (id === 'freeze') r.freeze(2.2);
  else if (id === 'pull') r.knock(d.multiplyScalar(-11).add(V(0, 6, 0)));
  else if (id === 'fly') r.knock(V(d.x * 2, 21, d.z * 2));
  else if (id === 'confuse') { r.confuse(4); fx.burst(V(r.pos.x, r.pos.y + 1.8, r.pos.z), 0xffd23f, 10, 3); }
  G.modeObj?.onShot?.(r, p.owner, id);
}
export function updateProjectiles(dt) {
  for (let i = projs.length - 1; i >= 0; i--) {
    const p = projs[i], a = p.pos.clone();
    if (p.kind === 'grenade') {
      p.vel.y -= 25 * dt;
      const b = a.clone().addScaledVector(p.vel, dt);
      ray.reset(); world.raycastClosest(new CANNON.Vec3(a.x, a.y, a.z), new CANNON.Vec3(b.x, b.y, b.z), { collisionFilterMask: G_STATIC | G_HAZARD }, ray);
      if (ray.hasHit) { p.pos.set(ray.hitPointWorld.x, ray.hitPointWorld.y + 0.15, ray.hitPointWorld.z); p.vel.y = Math.abs(p.vel.y) * 0.35; p.vel.x *= 0.6; p.vel.z *= 0.6; }
      else p.pos.copy(b);
      p.fuse -= dt; p.obj.rotation.x += dt * 8;
      if (p.fuse <= 0 || p.pos.y < (G.level?.killY ?? -30)) { remove(i); boom(p); continue; }
    } else {
      if (p.w.homing) {
        let tgt = p.target && !p.target.out ? p.target : null;
        if (!tgt) { let bd = 30; for (const f of foes(p.owner)) { const d = Math.hypot(f.pos.x - p.pos.x, f.pos.z - p.pos.z); if (d < bd) { bd = d; tgt = f; } } p.target = tgt; }
        if (tgt) { const want = V(tgt.pos.x, tgt.pos.y + 0.9, tgt.pos.z).sub(p.pos).normalize().multiplyScalar(p.w.speed); p.vel.lerp(want, 1 - Math.exp(-2.8 * dt)); }
      }
      const b = a.clone().addScaledVector(p.vel, dt);
      const r = hitRunner(p, a, b);
      ray.reset(); world.raycastClosest(new CANNON.Vec3(a.x, a.y, a.z), new CANNON.Vec3(b.x, b.y, b.z), { collisionFilterMask: G_STATIC | G_HAZARD }, ray);
      p.life -= dt;
      if (r) { remove(i); if (p.kind === 'rocket') { p.pos.copy(b); boom(p); } else dartHit(p, r); continue; }
      if (ray.hasHit) {
        remove(i); p.pos.set(ray.hitPointWorld.x, ray.hitPointWorld.y, ray.hitPointWorld.z);
        if (p.kind === 'rocket') boom(p); else fx.burst(p.pos, p.w.color, 5, 3);
        continue;
      }
      p.pos.copy(b);
      if (p.kind === 'rocket' && Math.random() < dt * 40) puffs.emit({ pos: p.pos.clone(), vel: V(rand(-0.5, 0.5), rand(0.2, 0.8), rand(-0.5, 0.5)), life: 0.5, size: 0.25, drag: 2, color: 0xc8c8d0 });
      if (p.life <= 0) { remove(i); if (p.kind === 'rocket') boom(p); continue; }
      q.setFromUnitVectors(V(0, 0, 1), p.vel.clone().normalize()); p.obj.quaternion.copy(q);
      if (p.kind === 'dart') p.obj.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), PI / 2));
    }
    p.obj.position.copy(p.pos);
  }
}
function remove(i) { projs[i].obj.removeFromParent(); projs.splice(i, 1); }
function boom(p) {
  if (p.w.slime) {
    const L = G.level; if (!L) return;
    const z = { type: 'slime', x: p.pos.x, y: p.pos.y, z: p.pos.z, hx: 2.8, hz: 2.8, t: 5 };
    L.zones.push(z); fx.burst(p.pos, 0x7cf26b, 20, 5); sfx.crack();
    L.updaters.push(function f(dt) {
      z.t -= dt;
      if (Math.random() < dt * 30) puffs.emit({ pos: V(z.x + rand(-2.6, 2.6), z.y + 0.1, z.z + rand(-2.6, 2.6)), vel: V(0, rand(0.2, 0.8), 0), life: 0.8, size: rand(0.25, 0.45), drag: 1, color: [0x7cf26b, 0x4fd44a, 0xb6ff8a][Math.floor(rand(0, 3))] });
      if (z.t <= 0) { L.zones.splice(L.zones.indexOf(z), 1); L.updaters.splice(L.updaters.indexOf(f), 1); }
    });
    return;
  }
  G.level?.explode(p.pos.clone(), p.w.radius, p.kind === 'rocket' ? 14 : 13);
}
export function clearProjectiles() { while (projs.length) remove(projs.length - 1); }

// pickup boxes: touching one gives a random weapon from the map's list
export function updatePickups() {
  const L = G.level; if (!L || !L.pickupPool.length) return;
  for (const p of L.pickups) {
    if (!p.on) continue;
    for (const r of G.runners) {
      if (r.out || r.weapon || r.finished) continue;
      if (Math.hypot(r.pos.x - p.x, r.pos.z - p.z) < 1.5 && Math.abs(r.pos.y - p.y) < 2) {
        const tot = L.pickupPool.reduce((a, c) => a + c.w, 0); let k = rand(0, tot), id = L.pickupPool[0].id;
        for (const c of L.pickupPool) { k -= c.w; if (k <= 0) { id = c.id; break; } }
        giveWeapon(r, id); p.on = false; p.t = p.respawn ?? 9; p.obj.visible = false;
        fx.burst(V(p.x, p.y + 1, p.z), 0xffd23f, 12, 5);
        break;
      }
    }
  }
}
// bots: shoot when someone is in range
export function botFire(r) {
  const wp = r.weapon; if (!wp) return;
  const w = WEAPONS[wp.id], range = w.throw ? 14 : w.proj === 'rocket' ? 24 : 20;
  let best = null, bd = range;
  for (const f of foes(r)) { const d = Math.hypot(f.pos.x - r.pos.x, f.pos.z - r.pos.z); if (d < bd && Math.abs(f.pos.y - r.pos.y) < 10) { bd = d; best = f; } }
  if (wp.id === 'fly') { if (!best || Math.random() < 0.35 || G.modeObj?.wantsUp?.(r)) { fire(r, V(Math.sin(r.facing), -1, Math.cos(r.facing))); } else fire(r, V(best.pos.x - r.pos.x, best.pos.y - r.pos.y, best.pos.z - r.pos.z)); return; }
  if (!best) return;
  const aimY = w.proj === 'rocket' && G.modeObj?.id === 'fall' ? best.pos.y - 0.4 : best.pos.y + 0.9;
  fire(r, V(best.pos.x - r.pos.x, aimY - (r.pos.y + 1.1), best.pos.z - r.pos.z));
}
export function tickWeapons(dt) { for (const r of G.runners) if (r.weapon) r.weapon.cd = Math.max(0, r.weapon.cd - dt); }
