// Monsters. The host (or solo player) runs the brains; everyone else only shows the positions it broadcasts.
import * as THREE from 'three';
import { rigged } from './assets.js';
import { FLOOR_Y, toCell, cellCenter, cellAt, C } from './world.js';
import { sfx } from './audio.js';

// kind: model, height (m), speeds, home floor/rooms, special behaviour
export const KINDS = {
  gaunt: { file: 'mon/gaunt-horror-rigged.glb', h: 2.5, walk: 1.7, chase: 3.9, sight: 15, hear: 1, anims: { idle: /idle/i, walk: /stalk/i, run: /chase/i } },
  matron: { file: 'mon/asylum_matron.glb', h: 2.05, walk: 0, chase: 5.2, sight: 30, hear: 0, statue: true },
  dog: { file: 'mon/ditch_dog.glb', h: 0.95, walk: 2.2, chase: 4.0, sight: 6, hear: 0.6, smell: true, anims: { idle: /idle/i, walk: /walk/i, run: /walk/i, attack: /attack/i } },
  wretch: { file: 'mon/tide_hunter_monster.glb', h: 2.2, walk: 0, chase: 4.6, sight: 8, hear: 0, ambush: true, anims: { idle: /idle/i, walk: /walk/i, run: /run/i } },
  deer: { file: 'mon/human_deer.glb', h: 2.6, walk: 1.1, chase: 4.4, sight: 18, hear: 0, runOnly: true, anims: { idle: /IDLE/, walk: /WALK/, run: /CHASE/, attack: /ATTACK/ } },
  wendigo: { file: 'mon/wendigo.glb', h: 2.9, walk: 1.6, chase: 4.0, sight: 14, hear: 1.6, mimic: true, glide: true },
};

export class Monster {
  constructor(kind, f, x, z, home) { this.kind = kind; this.k = KINDS[kind]; this.f = f; this.x = x; this.z = z; this.yaw = 0; this.home = home; this.state = 'idle'; this.target = null; this.mem = 0; this.speed = 0; this.t = Math.random() * 10; this.timer = 0; this.active = kind !== 'gaunt'; this.anim = 'idle'; this.alpha = 1; }
  async load(scene) {
    const { obj, clips } = await rigged(this.k.file); this.obj = obj; const g = new THREE.Group(); g.add(obj); this.root = g; scene.add(g);
    obj.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(obj); const s = this.k.h / Math.max(0.01, bb.max.y - bb.min.y); obj.scale.multiplyScalar(s);
    obj.updateMatrixWorld(true); const b2 = new THREE.Box3().setFromObject(obj); obj.position.y -= b2.min.y; obj.position.x -= (b2.min.x + b2.max.x) / 2; obj.position.z -= (b2.min.z + b2.max.z) / 2;
    obj.traverse((m) => { if (m.isMesh) { m.castShadow = true; if (m.material) { m.material = m.material.clone(); m.material.roughness = Math.max(0.55, m.material.roughness || 0.7); } } });
    // darken any red that reads as blood into black oil
    obj.traverse((m) => { if (m.isMesh && m.material && m.material.map) { m.material.color.multiplyScalar(0.92);
      m.material.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include map_fragment', '#include map_fragment\n{ vec3 c = diffuseColor.rgb; float l = dot(c, vec3(0.3, 0.59, 0.11)); float red = smoothstep(1.15, 1.6, c.r / max(0.02, max(c.g, c.b))); diffuseColor.rgb = mix(c, vec3(l * 0.45, l * 0.5, l * 0.42), red); }'); }; } });
    this.mixer = new THREE.AnimationMixer(obj); this.acts = {};
    if (this.k.anims) for (const [n, re] of Object.entries(this.k.anims)) { const c = clips.find((q) => re.test(q.name)); if (c) this.acts[n] = this.mixer.clipAction(c); }
    this.play('idle'); this.eyes = new THREE.PointLight(0xff3020, 0, 3, 2); this.eyes.position.y = this.k.h * 0.9; g.add(this.eyes);
    this.sync();
  }
  play(n) { if (this.anim === n && this.cur) return; this.anim = n; const a = this.acts[n] || this.acts.walk || this.acts.idle; if (!a || a === this.cur) return; a.reset().fadeIn(0.25).play(); if (this.cur) this.cur.fadeOut(0.25); this.cur = a; }
  sync() { if (!this.root) return; this.root.position.set(this.x, FLOOR_Y[this.f], this.z); this.root.rotation.y = this.yaw; this.root.visible = this.active && this.alpha > 0.02; }
  // visual-only update (also used on clients)
  animate(dt) {
    this.t += dt; if (this.mixer) this.mixer.update(dt * (this.anim === 'run' ? 1.15 : 1));
    if (this.k.glide && this.obj) { this.obj.position.y = Math.sin(this.t * 1.7) * 0.06; this.obj.rotation.z = Math.sin(this.t * 0.9) * 0.05; this.obj.rotation.x = this.anim === 'run' ? 0.18 : 0.05; }
    if (this.k.statue && this.obj) this.obj.rotation.z = this.speed > 0.1 ? Math.sin(this.t * 25) * 0.02 : 0;
    if (this.eyes) this.eyes.intensity = this.state === 'chase' ? 2.2 : 0.4;
    this.sync();
  }
  moveToward(W, tx, tz, speed, dt) {
    const from = [toCell(this.x), toCell(this.z)], to = [toCell(tx), toCell(tz)];
    let gx = tx, gz = tz;
    if (from[0] !== to[0] || from[1] !== to[1]) { const n = W.nextStep(this.f, from, to); if (!n) return false; [gx, gz] = cellCenter(n[0], n[1]);
      const d = W.doorOn(this.f, from[0], from[1], n[0], n[1]);
      if (d && (!d.lock || d.unlocked) && d.open < 0.85) {
        if (d.target < 1) { const held = performance.now() - (d.shutAt || -1e9) < 20000; this.doorT = (this.doorT || 0) + dt; if (Math.random() < dt * 1.6 && Monster.onBang) Monster.onBang(this, d);
          if (this.doorT > (held ? 3.2 : 0.7)) { d.target = 1; d.autoClose = 4; this.doorT = 0; sfx.door(); } }
        const [dx0, dz0] = d.center; if (Math.hypot(dx0 - this.x, dz0 - this.z) < 1.1) { this.speed = 0; this.yaw = Math.atan2(dx0 - this.x, dz0 - this.z); return true; } } }
    const dx = gx - this.x, dz = gz - this.z, l = Math.hypot(dx, dz); if (l < 0.05) return true;
    const step = Math.min(l, speed * dt); let nx = this.x + dx / l * step, nz = this.z + dz / l * step; [nx, nz] = W.collide(this.f, nx, nz, 0.34);
    this.x = nx; this.z = nz; const want = Math.atan2(dx, dz); let d = want - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, dt * 8); this.speed = speed; return true;
  }
  randomPoint(W, rooms) { for (let i = 0; i < 40; i++) { const z = (Math.random() * 12) | 0, x = (Math.random() * 16) | 0; const c = cellAt(this.f, x, z); if (c !== '#' && (!rooms || rooms.includes(c))) return cellCenter(x, z); } return [this.x, this.z]; }
}

// brain: runs on host for every monster each frame. players: [{f,x,z,hidden,noise,alive,id,crouch,running,lookDir}]
function grab(m, p, ctx) { if (m.lungeT != null || (m.cool || 0) > 0) return; m.lungeT = m.k.statue ? 0.25 : 0.7; m.lungePrey = p.id; if (ctx.warn) ctx.warn(m, p); }
export function think(m, W, players, dt, ctx) {
  m.timer -= dt; m.speed = 0; m.cool = Math.max(0, (m.cool || 0) - dt);
  if (!m.active) return;
  if (m.lungeT != null) { m.lungeT -= dt; const p = players.find((q) => q.id === m.lungePrey); if (p) m.yaw = Math.atan2(p.x - m.x, p.z - m.z); m.play(m.acts.attack ? 'attack' : 'idle');
    if (m.lungeT <= 0) { m.lungeT = null; m.cool = 1.4; if (p && p.alive && !p.ghost && p.f === m.f && Math.hypot(p.x - m.x, p.z - m.z) < 1.75 && (!p.hidden || m.mem > 3 || m.k.smell)) ctx.caught(p, m); } return; }
  const alive = players.filter((p) => p.alive && !p.ghost && p.f === m.f);
  let best = null, bd = 1e9;
  for (const p of alive) { const d = Math.hypot(p.x - m.x, p.z - m.z);
    const facing = Math.cos(Math.atan2(p.x - m.x, p.z - m.z) - m.yaw) > -0.2 || d < 4;
    const seen = !p.hidden && d < m.k.sight * (p.crouch ? 0.65 : 1) * (p.dark ? 0.55 : 1) && facing && W.los(m.f, m.x, m.z, p.x, p.z);
    const heard = m.k.hear && p.noise * m.k.hear > d;
    if ((seen || heard) && d < bd) { best = p; bd = d; } }
  if (m.calmT > 0) { m.calmT -= dt; best = null; }
  const catchR = 1.05;
  // special: matron moves only while nobody looks at her
  if (m.k.statue) {
    const watched = alive.some((p) => { const d = Math.hypot(p.x - m.x, p.z - m.z); if (d > 22) return false; const a = Math.atan2(m.x - p.x, m.z - p.z); let df = a - (p.yaw + Math.PI); df = Math.atan2(Math.sin(df), Math.cos(df)); return Math.abs(df) < 0.75 && W.los(m.f, p.x, p.z, m.x, m.z); });
    const tgt = alive.filter((p) => !p.hidden).sort((a, b) => Math.hypot(a.x - m.x, a.z - m.z) - Math.hypot(b.x - m.x, b.z - m.z))[0];
    m.state = tgt && Math.hypot(tgt.x - m.x, tgt.z - m.z) < 16 ? 'chase' : 'idle';
    if (!watched && tgt && m.state === 'chase') { m.moveToward(W, tgt.x, tgt.z, m.k.chase, dt); if (Math.hypot(tgt.x - m.x, tgt.z - m.z) < catchR) grab(m, tgt, ctx); }
    return;
  }
  // special: the vent ambusher drops near a player now and then, lunges, and climbs away
  if (m.k.ambush) {
    if (m.state === 'idle') { m.alpha = 0; if (m.timer <= 0 && alive.length) { const p = alive[(Math.random() * alive.length) | 0]; const a = p.yaw + Math.PI + (Math.random() - 0.5) * 1.2; let x = p.x + Math.sin(a) * 4.5, z = p.z + Math.cos(a) * 4.5; [x, z] = W.collide(m.f, x, z, 0.4);
        if (cellAt(m.f, toCell(x), toCell(z)) !== '#' && W.los(m.f, p.x, p.z, x, z)) { m.x = x; m.z = z; m.state = 'drop'; m.timer = 1.1; m.alpha = 1; m.prey = p.id; sfx.shriek(0, 0.8); ctx.flicker(m.f); } else m.timer = 2; } }
    else if (m.state === 'drop') { m.play('idle'); const p = alive.find((q) => q.id === m.prey); if (p) m.yaw = Math.atan2(p.x - m.x, p.z - m.z); if (m.timer <= 0) { m.state = 'chase'; m.timer = 3.2; } }
    else if (m.state === 'chase') { m.play('run'); const p = alive.find((q) => q.id === m.prey); if (!p || p.hidden || m.timer <= 0) { m.state = 'idle'; m.timer = 28 + Math.random() * 25; m.alpha = 0; return; }
      m.moveToward(W, p.x, p.z, m.k.chase, dt); if (Math.hypot(p.x - m.x, p.z - m.z) < catchR) grab(m, p, ctx); }
    return;
  }
  // smell: the dog follows the freshest scent trail even into lockers
  if (m.k.smell) { let scent = null; for (const p of alive) { const d = Math.hypot(p.x - m.x, p.z - m.z); if (d < 9 && !p.scentless && (!scent || d < scent.d)) scent = { p, d }; }
    if (ctx.distraction && ctx.distraction.f === m.f && Math.hypot(ctx.distraction.x - m.x, ctx.distraction.z - m.z) < 14 && ctx.distraction.t > 0) { m.state = 'search'; m.play('walk'); m.moveToward(W, ctx.distraction.x, ctx.distraction.z, m.k.walk * 1.4, dt); if (Math.random() < dt * 0.6) sfx.sniff(0); return; }
    if (scent) { m.state = 'chase'; m.play('run'); m.moveToward(W, scent.p.x, scent.p.z, scent.p.hidden ? 1.2 : m.k.chase, dt); if (Math.random() < dt * 0.5) sfx.sniff(0);
      if (scent.d < catchR) { if (!scent.p.hidden) grab(m, scent.p, ctx); else { m.sniff = (m.sniff || 0) + dt; if (m.sniff > 3) grab(m, scent.p, ctx); } } else m.sniff = 0; return; } }
  // common hunter
  const runOnly = m.k.runOnly;
  if (best && (!runOnly || best.running || bd < 3)) { m.state = 'chase'; m.target = [best.x, best.z]; m.mem = 5; m.prey = best.id; if (m.lastGrowl === undefined || m.t - m.lastGrowl > 4) { m.lastGrowl = m.t; ctx.sound(m, m.kind === 'deer' ? 'shriek' : 'growl'); } }
  else if (ctx.distraction && ctx.distraction.f === m.f && ctx.distraction.t > 0 && Math.hypot(ctx.distraction.x - m.x, ctx.distraction.z - m.z) < 18 && m.state !== 'chase') { m.state = 'search'; m.target = [ctx.distraction.x, ctx.distraction.z]; m.mem = 4; }
  else if (m.state === 'chase') { m.mem -= dt; if (m.mem <= 0) { m.state = 'search'; m.mem = 6; } }
  else if (m.state === 'search') { m.mem -= dt; if (m.mem <= 0) m.state = 'patrol'; }
  if (m.state === 'chase' || m.state === 'search') {
    const sp = m.state === 'chase' ? m.k.chase + (ctx.rage || 0) : m.k.walk * 1.3; m.play(m.state === 'chase' ? 'run' : 'walk');
    if (!m.moveToward(W, m.target[0], m.target[1], sp, dt) || Math.hypot(m.target[0] - m.x, m.target[1] - m.z) < 0.4) { if (m.state === 'search' && m.mem < 4) m.state = 'patrol'; }
    for (const p of alive) if (!p.hidden && Math.hypot(p.x - m.x, p.z - m.z) < catchR) { grab(m, p, ctx); break; }
    // saw the player climb into a locker: it pulls them out
    for (const p of alive) if (p.hidden && p.id === m.prey && m.mem > 3.5 && Math.hypot(p.x - m.x, p.z - m.z) < 1.6) grab(m, p, ctx);
  } else {
    if (!m.patrol || m.timer <= 0 || Math.hypot(m.patrol[0] - m.x, m.patrol[1] - m.z) < 0.5) { m.patrol = m.randomPoint(W, m.home); m.timer = 14; }
    if (m.k.walk > 0) { m.play('walk'); m.moveToward(W, m.patrol[0], m.patrol[1], m.k.walk, dt); } else m.play('idle');
    if (m.k.mimic && Math.random() < dt * 0.05) ctx.sound(m, 'voice');
  }
}
