// Slasher Night: one long night map in 5 stages full of monsters and copies of the Mad Prisoner,
// then a boss fight against him. You fight with your bat; die once and you are out.
// Beat him while still alive and you unlock his skin (Mad Prisoner) as an achievement.
import { THREE, M, G, V, PI, rand, pick, clamp, scene, fx, sfx, toast, save, persist, place, hemi, sun, rim, sky, SkeletonUtils } from './core.js';
import { t } from './i18n.js';
import { Level } from './level.js';
import { MODES, MODE_LIST } from './modes.js';
import { ITEM, dress, holdItem } from './cosmetics.js';

const W = 7; // half width of the road
// blood never red: yellow-ish characters bleed blue, dark ones black, everyone else green
function bloodOf(r) {
  const c = new THREE.Color(ITEM[r.equip?.skin]?.colors?.Main ?? 0x3d8bff), hsl = {}; c.getHSL(hsl);
  if (hsl.l < 0.18) return 0x111111;
  if (hsl.h > 0.1 && hsl.h < 0.19 && hsl.s > 0.4) return 0x2a6cff;
  return 0x2ec45a;
}
// monster types: Kenney graveyard characters, plus copies of the Mad Prisoner
const KINDS = {
  zombie: { model: 'k/gy-character-zombie', s: 1.25, hp: 2, speed: 2.2, dmg: 20, blood: 0x2ec45a },
  skeleton: { model: 'k/gy-character-skeleton', s: 1.25, hp: 2, speed: 3.2, dmg: 20, blood: 0x9a9080 },
  ghost: { model: 'k/gy-character-ghost', s: 1.25, hp: 1, speed: 4.2, dmg: 15, blood: 0x6a7a9a, float: true },
  vampire: { model: 'k/gy-character-vampire', s: 1.3, hp: 3, speed: 3.6, dmg: 25, blood: 0x111111 },
  copy: { model: 'Character', s: 0.36, hp: 3, speed: 4.4, dmg: 25, blood: 0x111111, mad: true },
};
const clipBy = (anims, names) => { for (const n of names) { const c = anims.find((a) => a.name === n || a.name.endsWith('|' + n)); if (c) return c; } return null; };

class Monster {
  constructor(L, kind, x, z) {
    const k = KINDS[kind]; this.k = k; this.kind = kind; this.hp = k.hp; this.atkCd = rand(0.5, 1.2); this.hitT = 0; this.dead = false; this.deadT = 0;
    this.o = SkeletonUtils.clone(M[k.model].scene); this.o.scale.setScalar(k.s); this.o.position.set(x, 0, z); L.root.add(this.o);
    this.o.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    if (k.mad) dress(this.o, { skin: 'skin-mad', face: 'f-hockey', bat: 'bat-cleaver' }, { bat: true });
    const an = M[k.model].animations; this.mixer = new THREE.AnimationMixer(this.o);
    this.run = clipBy(an, k.mad ? ['Run'] : ['sprint', 'walk']); this.atk = clipBy(an, k.mad ? ['Punch'] : ['attack-melee-right']); this.die = clipBy(an, k.mad ? ['Death'] : ['die']);
    this.cur = null; this.play(this.run); this.rise = 1; this.o.position.y = -1.3;
  }
  play(c, once) { if (!c) return; const a = this.mixer.clipAction(c); if (this.cur === a && !once) return; if (once) { a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; } a.play(); if (this.cur && this.cur !== a) this.cur.fadeOut(0.12); a.fadeIn(0.12); this.cur = a; }
  get pos() { return this.o.position; }
  hurt(n, dir) {
    if (this.dead) return; this.hp -= n; this.hitT = 0.25; this.pos.x += dir.x * 1.1; this.pos.z += dir.z * 1.1;
    fx.burst(V(this.pos.x, 0.8, this.pos.z), this.k.blood, 6, 3); sfx.bat();
    if (this.hp <= 0) { this.dead = true; this.play(this.die, true); }
  }
  update(dt, mode) {
    this.mixer.update(dt);
    if (this.dead) { this.deadT += dt; if (this.deadT > 1.6) this.o.position.y -= dt * 1.2; return this.deadT < 3; }
    if (this.rise > 0) { this.rise -= dt; this.o.position.y = -1.3 * Math.max(0, this.rise); if (Math.random() < dt * 10) fx.dust(V(this.pos.x, 0.1, this.pos.z), 1, 0x5a4a3a, 1.5); return true; }
    this.hitT -= dt; this.atkCd -= dt;
    for (const o of mode.mons) { if (o === this || o.dead) continue; const ax = this.pos.x - o.pos.x, az = this.pos.z - o.pos.z, ad = Math.hypot(ax, az); if (ad < 1.0 && ad > 0.001) { this.pos.x += ax / ad * (1.0 - ad) * 0.5; this.pos.z += az / ad * (1.0 - ad) * 0.5; } }
    let best = null, bd = 16;
    for (const r of G.runners) { if (r.out) continue; const d = Math.hypot(r.pos.x - this.pos.x, r.pos.z - this.pos.z); if (d < bd) { bd = d; best = r; } }
    if (this.k.float) this.pos.y = 0.3 + Math.sin(G.t * 3 + this.pos.x) * 0.2;
    if (!best || this.hitT > 0) return true;
    const dx = best.pos.x - this.pos.x, dz = best.pos.z - this.pos.z, d = Math.hypot(dx, dz) || 1;
    this.o.rotation.y = Math.atan2(dx, dz);
    if (d > 1.0) { const sp = this.k.speed * dt; this.pos.x += dx / d * sp; this.pos.z += dz / d * sp; this.pos.x = clamp(this.pos.x, -W - 6, W + 6); if (this.atkCd < 0.3) this.play(this.run); }
    if (d < 1.25 && this.atkCd <= 0) { this.atkCd = 1.3; this.play(this.atk, true); setTimeout(() => { if (!this.dead && !best.out && Math.hypot(best.pos.x - this.pos.x, best.pos.z - this.pos.z) < 1.6) mode.damage(best, this.k.dmg, { x: dx / d, z: dz / d }); }, 280); }
    return true;
  }
}

// ---------------------------------------------------------------- the boss
class Boss {
  constructor(L, x, z, n) {
    this.o = SkeletonUtils.clone(M.Character.scene); this.o.scale.setScalar(0.42 * 1.9); this.o.position.set(x, 0, z); L.root.add(this.o);
    this.o.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    dress(this.o, { skin: 'skin-mad', face: 'f-hockey', bat: 'bat-cleaver' }, { bat: true });
    const an = M.Character.animations; this.mixer = new THREE.AnimationMixer(this.o); this.cur = null;
    this.clips = { run: clipBy(an, ['Run']), idle: clipBy(an, ['Idle']), punch: clipBy(an, ['Punch']), jump: clipBy(an, ['Jump']), death: clipBy(an, ['Death']), yes: clipBy(an, ['Yes']) };
    this.max = 26 + n * 8; this.hp = this.max; this.phase = 1; this.state = 'intro'; this.st = 0; this.next = 2; this.dead = false; this.vel = V();
    this.play('yes', true);
  }
  get pos() { return this.o.position; }
  play(n, once) { const c = this.clips[n]; if (!c) return; const a = this.mixer.clipAction(c); if (this.cur === a && !once) return; if (once) { a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; } else a.setLoop(THREE.LoopRepeat); a.play(); if (this.cur && this.cur !== a) this.cur.fadeOut(0.12); a.fadeIn(0.12); this.cur = a; }
  goMad() {
    this.phase = 2; dress(this.o, { skin: 'skin-mad', head: 'h-pumpkin', bat: 'bat-saw' }, { bat: true });
    toast(t('He has gone mad! Do not touch the chainsaw!'), 3); sfx.boom(); fx.boom(V(this.pos.x, 1.5, this.pos.z), 3);
  }
}

const slasher = {
  id: 'slasher', name: t('Slasher Night'), short: t('Slasher'), kind: 'survival', icon: 'target', bats: true, special: true,
  desc: t('A long night of monsters and copies of the Mad Prisoner. Beat him at the end to unlock his skin. Die once and you are out'), weapons: t('Your bat'),
  build() {
    const L = new Level({ killY: -12 }); G.level = L;
    // dark stone road with iron cemetery fences on both sides
    L.floor(-W, W, 12, -172, 0, { model: 'Cube_Bricks' });
    const fl = L.root.children[L.root.children.length - 1]; fl?.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.multiplyScalar(0.38); } });
    for (const sx of [-1, 1]) { L.box(sx * (W + 0.3), 2, -80, 0.3, 2, 92); for (let z = 10; z > -172; z -= 2.2) L.model('k/gy-iron-fence', sx * (W + 0.4), 0, z, 2.2, sx > 0 ? -PI / 2 : PI / 2); }
    // 4 zones, each closed by a gate that opens when its monsters are all dead
    const theme = [['Tree', 'gy-gravestone-cross'], ['gy-lantern-candle', 'gy-crypt'], ['gy-coffin', 'gy-altar-stone'], ['gy-gravestone-cross', 'gy-crypt']];
    this.zones = [];
    for (let i = 0; i < 4; i++) {
      const z0 = 6 - i * 40, z1 = z0 - 36, gz = z1 - 2;
      // neat props outside the fences, graves in two tidy rows inside
      for (let z = z0 - 3, k = 0; z > z1; z -= 6, k++) for (const sx of [-1, 1]) { const n = theme[i][k % 2], name = n.startsWith('gy-') ? 'k/' + n : n; L.model(name, sx * (W + 3), 0, z, n.startsWith('gy-') ? 2.4 : 1, sx > 0 ? -PI / 2 : PI / 2); }
      const graves = []; for (let z = z0 - 8; z > z1 + 4; z -= 7) for (const sx of [-1, 1]) { const x = sx * (W - 2.2); L.model('k/gy-grave', x, 0.02, z, 2, 0); L.model('k/gy-gravestone-cross', x, 0, z - 1.4, 1.6, 0); graves.push({ x, z: z + 0.6 }); }
      let gate = null;
      if (i < 4) { const gm = []; for (let x = -W + 1.1; x < W; x += 2.2) gm.push(L.model('k/gy-fence-gate', x, 0, gz, 2.2, 0)); gate = { body: L.box(0, 2, gz, W, 2, 0.4), models: gm, open: false, y: 0 }; }
      const lamp = new THREE.PointLight(0xffa040, 18, 26); lamp.position.set(0, 4, (z0 + z1) / 2); L.root.add(lamp);
      this.zones.push({ z0, z1, graves, gate, started: false, mons: [] });
    }
    for (let z = -6; z > -150; z -= 13) L.model('k/x-pumpkin', (z % 2 ? 1 : -1) * (W - 1), 0, z, 2.4, 0);
    // boss arena: a round floor of dark coloured tiles that can crack and drop
    const cells = [], cols = [0x3a1f5c, 0x5c1020, 0x1f3a2a, 0x14204a, 0x5a2a10];
    for (let x = -8; x <= 8; x++) for (let z = -8; z <= 8; z++) if (Math.hypot(x, z) < 8.6) cells.push({ x: x * 2, z: -192 + z * 2, color: cols[(Math.abs(x * 7 + z * 3)) % cols.length] });
    this.g = makeTiles(L, cells);
    L.floor(-W, W, -172, -176, 0, { model: 'Cube_Bricks' });
    L.scenery(30, -230, 34);
    this.mons = []; this.zone = -1; this.boss = null; this.dark = false; this.evT = 18; this.ev = null;
    this.fly = [[0, 18, -205, 0, 0, -190], [0, 10, -60, 0, 0, -30], [0, 6, 16, 0, 1, 4]];
  },
  hudInfo() {
    const me = G.player, left = this.zone >= 0 && this.zone < 4 ? this.zones[this.zone].mons.filter((m) => !m.dead).length : this.boss && !this.boss.dead ? Math.max(0, this.boss.hp) : 0;
    const where = this.boss ? t('Boss') : t('Zone {n}/{m}', { n: Math.max(1, this.zone + 1), m: 4 });
    return { value: left, label: where + ' · ❤ ' + Math.max(0, Math.round(me?.hp ?? 100)) };
  },
  spawn(i) { return { x: -3 + i * 2, y: 0, z: 8, facing: PI }; },
  // night lighting while the round runs; put back on cleanup
  setDark(on) {
    if (on === this.dark) return; this.dark = on;
    if (on) { this.saved = { h: hemi.intensity, s: sun.intensity, r: rim.intensity, fog: scene.fog.color.getHex(), fn: scene.fog.near, ff: scene.fog.far, bg: scene.background };
      hemi.intensity = 0.42; sun.intensity = 0.55; rim.intensity = 1.2; scene.fog.color.setHex(0x150a24); scene.fog.near = 18; scene.fog.far = 95; sky.visible = false; scene.background = new THREE.Color(0x0c0618); }
    else if (this.saved) { const s = this.saved; hemi.intensity = s.h; sun.intensity = s.s; rim.intensity = s.r; scene.fog.color.setHex(s.fog); scene.fog.near = s.fn; scene.fog.far = s.ff; sky.visible = true; scene.background = s.bg; }
  },
  cleanup() { this.setDark(false); },
  damage(r, dmg, dir) {
    if (r.out) return;
    r.hp = (r.hp ?? 100) - dmg; fx.burst(V(r.pos.x, r.pos.y + 1, r.pos.z), bloodOf(r), 12, 5);
    r.knock(V((dir?.x || 0) * 6, 4, (dir?.z || 0) * 6), dmg >= 30);
    if (r.isPlayer) { sfx.lose?.(); toast('❤ ' + Math.max(0, Math.round(r.hp)), 1); }
    if (r.hp <= 0) G.eliminate(r);
  },
  update(dt) {
    this.setDark(true);
    const live = G.runners.filter((r) => !r.out);
    const lead = Math.min(...live.map((r) => r.pos.z));
    // entering a zone wakes its monsters: they climb out of the graves
    const names = [t('The forest'), t('The empty streets'), t('The old house'), t('The prison yard')];
    const sets = [['zombie', 'zombie', 'zombie', 'zombie'], ['zombie', 'skeleton', 'skeleton', 'copy', 'zombie'], ['ghost', 'ghost', 'vampire', 'ghost', 'copy'], ['copy', 'copy', 'vampire', 'skeleton', 'skeleton', 'copy']];
    for (let i = 0; i < 4; i++) {
      const zn = this.zones[i];
      if (!zn.started && lead < zn.z0 - 1) {
        zn.started = true; this.zone = i; G.banner?.(names[i], true); setTimeout(() => toast(t('Kill all the monsters to open the gate'), 2.5), 900);
        sets[i].forEach((k, j) => { const gr = zn.graves[j % zn.graves.length]; const m = new Monster(G.level, k, gr.x, gr.z); zn.mons.push(m); this.mons.push(m); });
      }
      const gt = zn.gate;
      if (zn.started && gt && !gt.open && zn.mons.every((m) => m.dead)) { gt.open = true; gt.body.collisionResponse = false; gt.body.position.y = -40; toast(t('The gate is open!'), 2); sfx.win?.(); }
      if (gt?.open && gt.y > -3) { gt.y -= dt * 2.5; gt.models.forEach((o) => { o.position.y = gt.y; }); }
    }
    if (!this.boss && lead < -174) {
      this.boss = new Boss(G.level, 0, -198, live.length); L_gate(G.level); this.zone = 4; G.banner?.(t('The Mad Prisoner!'), false); sfx.boom();
      for (const r of live) if (r.pos.z > -172) r.reset(rand(-2, 2), 0.5, -178, PI);
    }
    this.mons = this.mons.filter((m) => { const keep = m.update(dt, this); if (!keep) m.o.removeFromParent(); return keep; });
    this.g.update(dt);
    if (this.boss) this.bossUpdate(dt);
  },
  // ---------------------------------------------------------------- boss brain
  bossUpdate(dt) {
    const b = this.boss; b.mixer.update(dt); b.st += dt;
    if (b.dead) { b.st > 2 && b.o.position.y > -2 && (b.o.position.y -= dt); return; }
    const live = G.runners.filter((r) => !r.out); if (!live.length) return;
    const tg = live.reduce((a, r) => (Math.hypot(r.pos.x - b.pos.x, r.pos.z - b.pos.z) < Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z) ? r : a), live[0]);
    const dx = tg.pos.x - b.pos.x, dz = tg.pos.z - b.pos.z, d = Math.hypot(dx, dz) || 1, fwd = { x: dx / d, z: dz / d };
    const mad = b.phase === 2, speed = mad ? 5.4 : 4.2;
    // the chainsaw kills on touch
    if (mad) for (const r of live) { const fx_ = Math.sin(b.o.rotation.y), fz = Math.cos(b.o.rotation.y), rx = r.pos.x - (b.pos.x + fx_ * 1.4), rz = r.pos.z - (b.pos.z + fz * 1.4); if (Math.hypot(rx, rz) < 1.0 && Math.abs(r.pos.y - b.pos.y) < 1.6) this.damage(r, 999, fwd); }
    const face = (x, z) => { b.o.rotation.y = Math.atan2(x - b.pos.x, z - b.pos.z); };
    const keepIn = () => { const ax = b.pos.x, az = b.pos.z + 192, l = Math.hypot(ax, az); if (l > 15) { b.pos.x = ax / l * 15; b.pos.z = az / l * 15 - 192; } };
    // arena mini-game events every ~25 s
    this.evT -= dt;
    if (this.evT <= 0) { this.evT = 25; const e = pick(mad ? ['drop', 'cannons', 'dark', 'drop'] : ['drop', 'cannons', 'dark']); this.startEvent(e); }
    if (this.ev) { this.ev.t -= dt; if (this.ev.kind === 'cannons') { this.ev.fire -= dt; if (this.ev.fire <= 0) { this.ev.fire = 0.9; const a = rand(0, PI * 2); G.level.cannon(Math.cos(a) * 19, -192 + Math.sin(a) * 19, 0.2, -Math.cos(a), -Math.sin(a), 99, 0, 15); const c = G.level.cannons[G.level.cannons.length - 1]; G.level.fireCannon(c); } } if (this.ev.t <= 0) { if (this.ev.kind === 'dark') { hemi.intensity = 0.42; sun.intensity = 0.55; } this.ev = null; } }
    switch (b.state) {
      case 'intro': if (b.st > 2.2) this.pickAttack(); break;
      case 'chase': { face(tg.pos.x, tg.pos.z); b.play('run'); if (d > 1.8) { b.pos.x += fwd.x * speed * dt; b.pos.z += fwd.z * speed * dt; } else if (!mad) { b.state = 'swing'; b.st = 0; b.play('punch', true); } if (b.st > 3.2) this.pickAttack(); break; }
      case 'swing': if (b.st > 0.32 && !b.hitDone) { b.hitDone = true; for (const r of live) if (Math.hypot(r.pos.x - b.pos.x, r.pos.z - b.pos.z) < 2.4) this.damage(r, 34, fwd); } if (b.st > 0.8) this.pickAttack(); break;
      case 'slam': {
        // jump, land, a shock ring runs outward: jump over it
        if (b.st < 0.6) { b.pos.y = Math.sin(b.st / 0.6 * PI) * 3; b.play('jump'); }
        else if (!b.ring) { b.pos.y = 0; b.ring = { r: 0 }; fx.boom(V(b.pos.x, 0.3, b.pos.z), 2.5); sfx.boom(); }
        if (b.ring) { b.ring.r += dt * 11; for (let k = 0; k < 6; k++) { const a = rand(0, PI * 2); fx.dust(V(b.pos.x + Math.cos(a) * b.ring.r, 0.2, b.pos.z + Math.sin(a) * b.ring.r), 1, 0xb06cff, 1); }
          for (const r of live) { const rd = Math.hypot(r.pos.x - b.pos.x, r.pos.z - b.pos.z); if (!r.slamHit && Math.abs(rd - b.ring.r) < 0.7 && r.pos.y < 0.6) { r.slamHit = true; this.damage(r, 25, { x: (r.pos.x - b.pos.x) / (rd || 1), z: (r.pos.z - b.pos.z) / (rd || 1) }); } }
          if (b.ring.r > 12) { b.ring = null; live.forEach((r) => { r.slamHit = false; }); this.pickAttack(); } }
        break;
      }
      case 'charge': {
        if (b.st < 0.6) { face(tg.pos.x, tg.pos.z); b.play('idle'); b.cdir = fwd; break; }
        b.play('run'); b.pos.x += b.cdir.x * (mad ? 17 : 14) * dt; b.pos.z += b.cdir.z * (mad ? 17 : 14) * dt; keepIn();
        for (const r of live) if (!r.chargeHit && Math.hypot(r.pos.x - b.pos.x, r.pos.z - b.pos.z) < 1.5) { r.chargeHit = true; this.damage(r, mad ? 999 : 40, b.cdir); }
        if (b.st > 1.5) { live.forEach((r) => { r.chargeHit = false; }); this.pickAttack(); }
        break;
      }
      case 'throw': {
        // the cleaver flies to the target and comes back
        if (!b.proj) { face(tg.pos.x, tg.pos.z); b.play('punch', true); b.proj = { o: place('k/x-cleaver', b.pos.x, 1.6, b.pos.z, 1.4, 0, G.level.root), tx: tg.pos.x, tz: tg.pos.z, k: 0, hit: new Set() }; }
        const p = b.proj; p.k += dt / 1.6; const k = p.k < 0.5 ? p.k * 2 : (1 - p.k) * 2;
        p.o.position.set(b.pos.x + (p.tx - b.pos.x) * k, 1.4, b.pos.z + (p.tz - b.pos.z) * k); p.o.rotation.y += dt * 18;
        for (const r of live) if (!p.hit.has(r) && Math.hypot(r.pos.x - p.o.position.x, r.pos.z - p.o.position.z) < 1.0) { p.hit.add(r); this.damage(r, 25, fwd); }
        if (p.k >= 1) { p.o.removeFromParent(); b.proj = null; this.pickAttack(); }
        break;
      }
      case 'whistle': if (b.st < 0.1) { b.play('yes', true); toast(t('He calls his copies!'), 1.6); for (let k = 0; k < (mad ? 3 : 2); k++) this.mons.push(new Monster(G.level, 'copy', b.pos.x + rand(-3, 3), b.pos.z + rand(-3, 3))); } if (b.st > 1.2) this.pickAttack(); break;
      case 'spin': { b.o.rotation.y += dt * 14; b.play('idle'); b.pos.x += fwd.x * 2.5 * dt; b.pos.z += fwd.z * 2.5 * dt; for (const r of live) if (Math.hypot(r.pos.x - b.pos.x, r.pos.z - b.pos.z) < 2.3) this.damage(r, 999, fwd); if (Math.random() < dt * 20) fx.burst(V(b.pos.x, 1.2, b.pos.z), 0xffb020, 3, 6); if (b.st > 2.2) this.pickAttack(); break; }
      case 'cut': {
        // cuts a line through the floor: those tiles glow and drop
        if (b.st < 0.05) { face(tg.pos.x, tg.pos.z); b.play('punch', true); for (const tl of this.g.tiles) { const rx = tl.x - b.pos.x, rz = tl.z - b.pos.z, al = rx * fwd.x + rz * fwd.z, pp = Math.abs(rx * fwd.z - rz * fwd.x); if (al > 1 && al < 18 && pp < 1.3) this.g.crack(tl, 0.6 + al * 0.05); } }
        if (b.st > 1) this.pickAttack(); break;
      }
      case 'bombs': {
        if (b.st < 0.05) { b.play('punch', true); b.bombs = live.slice(0, 3).map((r) => ({ o: place('k/x-pumpkin', b.pos.x, 2, b.pos.z, 2.6, 0, G.level.root), x: r.pos.x + rand(-1, 1), z: r.pos.z + rand(-1, 1), k: 0 })); }
        for (const p of b.bombs || []) { if (p.done) continue; p.k += dt / 1.3; const k = Math.min(1, p.k); p.o.position.set(b.pos.x + (p.x - b.pos.x) * k, 2 + Math.sin(k * PI) * 5 - k * 2, b.pos.z + (p.z - b.pos.z) * k);
          if (p.k > 1.6) { p.done = true; p.o.removeFromParent(); fx.boom(V(p.x, 0.5, p.z), 2.5); sfx.boom(); for (const r of live) { const rd = Math.hypot(r.pos.x - p.x, r.pos.z - p.z); if (rd < 2.6) this.damage(r, 40, { x: (r.pos.x - p.x) / (rd || 1), z: (r.pos.z - p.z) / (rd || 1) }); } } }
        if (b.st > 2) this.pickAttack(); break;
      }
      case 'roar': if (b.st < 0.05) { b.play('yes', true); toast(t('ROAR!'), 1.2); for (const r of live) r.slow(2.2); sfx.boom(); } if (b.st > 1.1) this.pickAttack(); break;
    }
    keepIn();
  },
  pickAttack() {
    const b = this.boss; b.st = 0; b.hitDone = false;
    const list = b.phase === 1 ? ['chase', 'chase', 'slam', 'charge', 'throw', 'whistle'] : ['chase', 'spin', 'charge', 'cut', 'bombs', 'roar', 'slam', 'whistle'];
    let s = pick(list); if (s === b.state && s !== 'chase') s = 'chase'; b.state = s;
  },
  startEvent(kind) {
    this.ev = { kind, t: kind === 'dark' ? 7 : 10, fire: 0 };
    if (kind === 'drop') { toast(t('The floor is cracking!'), 2); for (const tl of this.g.tiles) if (Math.random() < 0.28) this.g.crack(tl, rand(0.3, 2)); }
    else if (kind === 'cannons') toast(t('Cannons!'), 2);
    else if (kind === 'dark') { toast(t('Lights out...'), 2); hemi.intensity = 0.06; sun.intensity = 0.05; }
  },
  // your bat hits monsters and the boss
  onFire(r) {
    if (r.busy) return; r.swing();
    const f = { x: Math.sin(r.facing), z: Math.cos(r.facing) };
    const inFront = (p, reach) => { const dx = p.x - r.pos.x, dz = p.z - r.pos.z, d = Math.hypot(dx, dz); return d < reach && (dx * f.x + dz * f.z) / (d || 1) > 0.25; };
    for (const m of this.mons) if (!m.dead && inFront(m.pos, 2.0)) m.hurt(1, f);
    const b = this.boss;
    if (b && !b.dead && b.state !== 'intro' && inFront(b.pos, 2.6)) {
      b.hp -= 1; fx.burst(V(b.pos.x, 1.6, b.pos.z), 0x111111, 10, 4); sfx.bat();
      if (r.isPlayer) G.banner?.(Math.max(0, b.hp) + ' / ' + b.max, true);
      if (b.phase === 1 && b.hp <= b.max / 2) b.goMad();
      if (b.hp <= 0) this.bossDown();
    }
  },
  bossDown() {
    const b = this.boss; b.dead = true; b.st = 0; b.play('death', true); sfx.win?.(); fx.confetti(V(b.pos.x, 2, b.pos.z), 200);
    const me = G.player;
    if (me && !me.out) {
      for (const id of ['skin-mad', 'f-hockey', 'h-pumpkin', 'bat-cleaver', 'bat-saw']) if (!save.owned.includes(id)) save.owned.push(id);
      persist(); toast(t('Achievement: you unlocked the Mad Prisoner!'), 4);
    }
    setTimeout(() => G.endRound(), 3500);
  },
  onFall(r) { G.eliminate(r); },
  target(r, dt) {
    const p = r.pos;
    // bots fight the closest monster near them, otherwise follow the player down the road
    let best = null, bd = 9;
    for (const m of this.mons) { if (m.dead) continue; const d = Math.hypot(m.pos.x - p.x, m.pos.z - p.z); if (d < bd) { bd = d; best = m.pos; } }
    const b = this.boss;
    if (b && !b.dead) {
      const d = Math.hypot(b.pos.x - p.x, b.pos.z - p.z), danger = b.phase === 2 && (b.state === 'spin' || b.state === 'charge');
      if (danger) return { x: p.x + (p.x - b.pos.x) / (d || 1) * 4, z: p.z + (p.z - b.pos.z) / (d || 1) * 4, near: 0.2 };
      if (!best || d < bd) { best = b.pos; bd = d; }
    }
    if (best) { r.facing = Math.atan2(best.x - p.x, best.z - p.z); return { x: best.x, z: best.z, near: 1.3, fire: bd < 2.2 && Math.random() < 0.35 }; }
    const me = G.player, z = me && !me.out ? Math.max(me.pos.z - 4, -168) : -175;
    return { x: clamp((r.i - 2) * 2, -W + 1, W - 1), z: Math.min(z, p.z + 6), near: 1 };
  },
};
// closes the way back once the boss fight starts
function L_gate(L) { L.box(0, 2, -173, W, 2, 0.4); for (let x = -W + 1.1; x < W; x += 2.2) L.model('k/gy-fence-gate', x, 0, -173, 2.2, 0); }

// arena tiles that crack (glow purple), drop and come back a few seconds later
function makeTiles(L, cells) {
  const { meshes } = L.inst('Cube_Grass_Single', cells.map((c) => ({ x: c.x, y: -1, z: c.z })));
  meshes.forEach((m) => { m.frustumCulled = false; });
  const mtx = new THREE.Matrix4(), tmp = new THREE.Matrix4();
  const set = (tl, y, s = 1) => { mtx.compose(V(tl.x, y - 1, tl.z), new THREE.Quaternion(), V(s, s, s)); for (const m of meshes) { m.setMatrixAt(tl.i, tmp.copy(mtx).multiply(m.userData.local)); m.instanceMatrix.needsUpdate = true; } };
  const tint = (tl, c) => { for (const m of meshes) { m.setColorAt(tl.i, c); m.instanceColor.needsUpdate = true; } };
  const tiles = cells.map((c, i) => { const body = L.box(c.x, -1, c.z, 0.98, 1, 0.98); return { i, x: c.x, z: c.z, body, color: new THREE.Color(c.color), state: 0, t: 0, y: 0, v: 0 }; });
  tiles.forEach((tl) => tint(tl, tl.color));
  const glow = new THREE.Color(0xc04cff);
  return {
    tiles,
    crack(tl, delay) { if (tl.state !== 0) return; tl.state = 1; tl.t = delay; },
    update(dt) {
      for (const tl of tiles) {
        if (tl.state === 1) { tl.t -= dt; tint(tl, tl.t % 0.2 < 0.1 ? glow : tl.color); if (tl.t <= 0) { tl.state = 2; tl.v = 0; tl.y = 0; tl.body.collisionResponse = false; tl.body.position.y = -40; } }
        else if (tl.state === 2) { tl.v -= 22 * dt; tl.y += tl.v * dt; set(tl, tl.y); if (tl.y < -12) { tl.state = 3; tl.t = 7; set(tl, 0, 0); } }
        else if (tl.state === 3) { tl.t -= dt; if (tl.t <= 0) { tl.state = 0; tl.body.position.y = -1; tl.body.collisionResponse = true; tint(tl, tl.color); set(tl, 0); } }
      }
    },
  };
}

MODES.slasher = slasher; MODE_LIST.push(slasher);
