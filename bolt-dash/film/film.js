// "The Rivalry": the intro film. Built from the game's own models and maps, rendered frame by frame to a video.
// Run film/film.html through film/render.cjs to produce media/intro.mp4.
import { THREE, M, G, V, PI, rand, clamp, scene, camera, renderer, renderScene, puffs, confetti, fx, sun, SkeletonUtils, place, loadAssets, save, applyQuality, resize, sea } from '../src/core.js';
import { computeBoneFix, dress, skinFx, updateGold, teamFlag } from '../src/cosmetics.js';
import { MODES } from '../src/modes.js';
import '../src/sports.js';

const W = 960, H = 540, FPS = 24, LW = 1280; // overlay is laid out at 1280x720 and scaled down
const ease = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const lerpV = (a, b, t) => V(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));

// ---------------------------------------------------------------- cast
const clip = (n) => M.Character.animations.find((a) => a.name.endsWith('|' + n));
class Actor {
  constructor(equip, scale = 0.42) {
    this.m = SkeletonUtils.clone(M.Character.scene); this.m.scale.setScalar(scale); this.s = scale; scene.add(this.m);
    this.m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    dress(this.m, equip); this.mixer = new THREE.AnimationMixer(this.m); this.acts = {}; this.cur = null;
    for (const n of ['Idle', 'Run', 'Walk', 'Wave', 'Yes', 'No', 'Punch', 'Jump', 'Jump_Idle', 'Jump_Land', 'HitReact', 'Duck', 'Death']) {
      const c = clip(n); if (!c) continue; const a = this.mixer.clipAction(c);
      if (!['Idle', 'Run', 'Walk', 'Jump_Idle'].includes(n)) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
      this.acts[n] = a;
    }
    this.play('Idle'); this.lastPos = V();
  }
  play(n, speed = 1, fade = 0.15) { const a = this.acts[n]; if (!a) return; a.timeScale = speed; if (this.cur === a) return; a.reset().fadeIn(fade).play(); if (this.cur) this.cur.fadeOut(fade); this.cur = a; }
  at(x, y, z, ry) { this.m.position.set(x, y, z); if (ry != null) this.m.rotation.y = ry; return this; }
  face(x, z) { this.m.rotation.y = Math.atan2(x - this.m.position.x, z - this.m.position.z); }
  tick(dt) {
    this.mixer.update(dt);
    const p = this.m.position, moving = p.distanceTo(this.lastPos) > dt * 1.2; this.lastPos.copy(p);
    skinFx(this.m, dt, p, { moving, grounded: this.grounded !== false, puffs, scene });
  }
  show(v) { this.m.visible = v; return this; }
}

// ---------------------------------------------------------------- sets
let setName = null, ball = null, crown = null;
function useSet(name) {
  if (setName === name) return; setName = name;
  G.level?.dispose(); G.level = null; ball?.removeFromParent(); ball = null; crown?.removeFromParent(); crown = null;
  if (name === 'race') MODES.sprint.build();
  const flags = name === 'ball' ? { blue: 'blue', yel: 'blue', gold: 'red', keeper: 'red', p1: 'red', p2: 'blue' } : {};
  for (const k in A) teamFlag(A[k].m, flags[k] || null);
  if (name === 'ball') { MODES.football.build(); MODES.football.b.obj.visible = false; ball = place('z/Football', 0, 0.4, 0, 0.35); }
  if (name === 'fall') { MODES.fall.build(); crown = place('acc/Crown', 0, 1.6, 0, 2.2); }
  if (name === 'race2') MODES.sprint.build();
}

// ---------------------------------------------------------------- captions and cards (drawn on top of each frame)
const out = document.createElement('canvas'); out.width = W; out.height = H; const ctx = out.getContext('2d');
let cap = null;
function caption(text, sub, style = 'cap') { cap = { text, sub, style }; }
function drawOverlay(T) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(renderer.domElement, 0, 0, W, H); ctx.setTransform(W / LW, 0, 0, W / LW, 0, 0);
  drawCards(T);
}
function drawCards(T) {
  const W = 1280, H = 720;
  // letterbox bars for a film feel
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 46); ctx.fillRect(0, H - 46, W, 46);
  if (!cap) return;
  ctx.textAlign = 'center'; ctx.direction = 'ltr';
  if (cap.style === 'cap') {
    ctx.font = '400 46px Lilita'; const w = ctx.measureText(cap.text).width + 60;
    ctx.fillStyle = 'rgba(33,18,74,.82)'; roundRect(W / 2 - w / 2, H - 150, w, 70, 20); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.fillText(cap.text, W / 2, H - 100);
  } else if (cap.style === 'title') {
    ctx.font = '400 96px Lilita'; ctx.lineWidth = 14; ctx.strokeStyle = '#21124a'; ctx.strokeText(cap.text, W / 2, H / 2); ctx.fillStyle = '#fff'; ctx.fillText(cap.text, W / 2, H / 2);
    if (cap.sub) { ctx.font = '800 34px Nunito'; ctx.fillStyle = '#ffd23f'; ctx.strokeText(cap.sub, W / 2, H / 2 + 60); ctx.fillText(cap.sub, W / 2, H / 2 + 60); }
  } else if (cap.style === 'score') {
    const [a, b, min] = cap.text.split('|');
    ctx.font = '400 40px Lilita';
    ctx.fillStyle = '#ff4f6a'; roundRect(W / 2 - 260, 66, 200, 64, 16); ctx.fill(); ctx.fillStyle = '#21124a'; roundRect(W / 2 - 60, 66, 120, 64, 0); ctx.fill(); ctx.fillStyle = '#3d8bff'; roundRect(W / 2 + 60, 66, 200, 64, 16); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText('RED', W / 2 - 160, 112); ctx.fillText('BLUE', W / 2 + 160, 112);
    ctx.fillStyle = '#ffd23f'; ctx.fillText(`${a} - ${b}`, W / 2, 112);
    ctx.font = '800 22px Nunito'; ctx.fillStyle = '#fff'; ctx.fillText(min, W / 2, 158);
    if (cap.sub) { ctx.font = '400 54px Lilita'; ctx.lineWidth = 10; ctx.strokeStyle = '#21124a'; ctx.strokeText(cap.sub, W / 2, H - 110); ctx.fillStyle = '#fff'; ctx.fillText(cap.sub, W / 2, H - 110); }
  } else if (cap.style === 'logo') {
    const k = Math.min(1, cap.t || 1);
    ctx.save(); ctx.translate(W / 2, H / 2 - 30); ctx.rotate(-0.07); ctx.scale(k, k); ctx.direction = 'ltr';
    ctx.font = '400 150px Lilita'; ctx.lineWidth = 22; ctx.strokeStyle = '#21124a'; ctx.strokeText('BOLT DASH', 0, 0);
    ctx.fillStyle = '#ffd23f'; ctx.fillText('BOLT DASH', 0, 0); ctx.restore();
    ctx.direction = 'ltr'; ctx.font = '800 36px Nunito'; ctx.fillStyle = '#fff'; ctx.lineWidth = 8; ctx.strokeStyle = '#21124a';
    ctx.strokeText(cap.sub || '', W / 2, H / 2 + 80); ctx.fillText(cap.sub || '', W / 2, H / 2 + 80);
    ctx.font = '400 30px Lilita'; ctx.fillStyle = '#ffd23f'; ctx.strokeText('THE MOVIE · COMING SOON', W / 2, H / 2 + 128); ctx.fillText('THE MOVIE · COMING SOON', W / 2, H / 2 + 128);
  }
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function cam(pos, look) { camera.position.copy(pos); camera.lookAt(look); sun.position.set(look.x + 14, look.y + 34, look.z + 16); sun.target.position.copy(look); }

// ---------------------------------------------------------------- the story, shot by shot
let A; // actors
const SHOTS = [];
const shot = (dur, setup, upd) => SHOTS.push({ dur, setup, upd });
const RUN = 9;

// ---- running the course like a real player: hop the spinning arms as they pass, jump the saws / traps / spike blocks,
// bounce over the gap, spring up to the finish deck, and smash through a breakable door (never a steel one)
const ARCS = [[-63.5, -80.5, 5], [-99.6, -102.4, 2], [-107.6, -110.4, 2], [-114.8, -117.2, 1.3], [-127.2, -130.8, 2.4], [-134.6, -137.6, 2.3]];
function baseY(z) { if (z <= -166) return 3; if (z < -158) { const k = (-158 - z) / 8; return 3 * k + Math.sin(k * PI) * 4.5; } return 0; }
function courseY(x, z) {
  let y = baseY(z);
  for (const [a, b, h] of ARCS) if (z < a && z > b) y += Math.sin(((a - z) / (a - b)) * PI) * h;
  for (const sw of G.level?.sweepers || []) {
    const rx = x - sw.x, rz = z - sw.z; if (Math.hypot(rx, rz) > sw.len + 0.5) continue;
    const a = sw.ang || 0, c = Math.cos(a), sn = Math.sin(a);
    let perp = Math.abs(-rx * sn - rz * c); if (sw.body.shapes.length > 1) perp = Math.min(perp, Math.abs(rx * c - rz * sn));
    y += 1.7 * Math.cos(Math.min(1, perp / 1.25) * PI / 2);
  }
  return y;
}
// steer towards a breakable crate before each door row
function laneX(x, z) {
  const L = G.level; if (!L?.doorRows) return x;
  for (const row of L.doorRows) {
    if (z > row.z + 7 || z < row.z - 2) continue;
    const open = L.crates.filter((c) => Math.abs(c.z - row.z) < 0.5); if (!open.length) continue;
    const cx = open.reduce((a, c) => (Math.abs(c.x - x) < Math.abs(a.x - x) ? c : a)).x;
    const k = clamp((row.z + 7 - z) / 4, 0, 1) * clamp((z - row.z + 2) / 1.5, 0, 1);
    return x + (cx - x) * k;
  }
  return x;
}
function runAt(a, x, z, speed = 1.3, shift = 0) {
  const lx = shift ? x + shift : laneX(x, z), y = courseY(lx, z), air = y > baseY(z) + 0.25;
  a.at(lx, y, z, PI); a.play(air ? 'Jump_Idle' : 'Run', speed); a.grounded = !air;
  const L = G.level; if (L) for (const c of L.crates) if (!c.broken && Math.abs(c.z - z) < 1.1 && Math.abs(c.x - lx) < 1.5) { L.breakCrate(c.body); a.play('Punch', 1.8); }
  return lx;
}
// two runners holding hands share one lane through the doors
const pairShift = (x, z) => laneX(x, z) - x;

// 1. start line: the camera drops in from the sky
shot(5, () => {
  useSet('race');
  A.blue.at(-1.5, 0, 9, PI).show(true); A.gold.at(1.5, 0, 9, PI).show(true); A.yel.at(-4.5, 0, 9.5, PI).show(true); A.p1.at(4.5, 0, 9.5, PI).show(true); A.p2.at(0, 0, 11.4, PI).show(true);
  A.ref.at(7.2, 0, 4, -PI / 2).show(true); A.keeper.show(false);
  for (const a of [A.blue, A.gold, A.yel, A.p1, A.p2]) a.play('Idle');
  A.gold.play('Yes');
}, (t) => {
  const k = ease(t / 4.5);
  cam(lerpV([4, 24, 40], [0, 3.2, 17], k), lerpV([0, 0, -10], [0, 1.4, 8], k));
  if (t > 1.2 && t < 1.3) A.gold.play('No');
  caption(t > 2.5 ? 'Obstacle race… Blue vs Gold' : null); if (t <= 2.5) cap = null;
});
// 2. the referee whistles
shot(2.4, () => { A.ref.play('Wave'); }, (t) => {
  cam(V(9.5, 2.1, 6.5), V(7.2, 1.6, 4)); caption('BEEEEP!');
  if (t > 1.2) { A.ref.face(0, 9); }
});
// 3. off they go
shot(3.6, () => { for (const a of [A.blue, A.gold, A.yel, A.p1, A.p2]) a.play('Run', 1.3); cap = null; }, (t) => {
  const z = 9 - t * RUN;
  runAt(A.blue, -1.5, z); runAt(A.gold, 1.5, z - 0.3); runAt(A.yel, -4.5, z + 1.6); runAt(A.p1, 4.5, z + 1.2); runAt(A.p2, 0, z + 2.6);
  cam(V(9, 3.2, z - 2 + t * 0.5), V(0, 1, z - 2));
});
// 4. gold laughs and shoves blue over the rail
shot(3.6, () => { A.gold.play('Yes', 1.4); caption('Gold starts showing off…'); A.p1.show(false); A.p2.show(false); A.yel.show(false); }, (t) => {
  const z = 9 - 3.6 * RUN; // the clear strip between the two spinning arms
  if (t < 1) { A.gold.at(lerp(1.5, -0.2, ease(t)), 0, z, PI); A.blue.at(-1.5, 0, z, PI); A.gold.face(-1.5, z); }
  else if (t < 1.25) { if (!A.gold.pushed) { A.gold.pushed = 1; A.gold.play('Punch', 1.6); } }
  else {
    if (!A.blue.flying) { A.blue.flying = 1; A.blue.play('HitReact', 1); fx.burst(V(-1.5, 1.2, z), 0xffd23f, 18, 7); caption('…and SHOVES him!'); }
    const u = t - 1.25; A.blue.at(-1.5 - u * 6, Math.max(-14, 3 + u * 6 - u * u * 12), z, PI); A.blue.m.rotation.x = u * 8; A.blue.m.rotation.z = u * 5;
  }
  cam(V(1.5, 2.4, z + 4.2), V(-1.8, 1 - Math.max(0, t - 2) * 1.5, z));
});
// 5. back at the checkpoint
shot(2.6, () => { A.blue.flying = 0; A.blue.m.rotation.set(0, PI, 0); A.blue.play('Jump_Idle'); caption('Back from the checkpoint'); }, (t) => {
  const z = -42;
  if (t < 0.9) A.blue.at(0, 6 - ease(t / 0.9) * 6, z, PI); else { if (!A.blue.landed) { A.blue.landed = 1; A.blue.play('Jump_Land'); fx.dust(V(0, 0.2, z), 14, 0xffffff, 4); } A.blue.at(0, 0, z, PI); if (t > 1.6) A.blue.play('No'); }
  A.yel.show(true).at(-3, 0, z - 10 + Math.min(t, 1.6) * 5, 0); A.yel.play(t < 1.6 ? 'Run' : 'Wave', 1.3);
  cam(V(5, 2.6, z + 6), V(0, 1.2, z - 1));
});
// 6. yellow grabs blue's hand: full sprint
shot(4.6, () => { A.blue.landed = 0; A.blue.play('Run', 1.7); A.yel.play('Run', 1.7); caption('His yellow buddy grabs his hand… GO!'); }, (t) => {
  const z = -44 - t * 17;
  const sh = pairShift(-0.95, z); runAt(A.blue, -0.5, z, 1.7, sh || 1e-9); runAt(A.yel, -1.4, z, 1.7, sh || 1e-9);
  A.gold.show(true); runAt(A.gold, 3, -112 - t * 7, 1.2);
  if (Math.random() < 0.6) puffs.emit({ pos: V(rand(-2, 1), rand(0.2, 1.5), z + rand(0.5, 2)), vel: V(0, 0, 25), life: 0.25, size: 0.08, color: 0xffffff });
  const yb = A.blue.m.position.y; cam(V(-4.5, 1.8 + yb * 0.85, z - 4), V(-0.8, 1.1 + yb, z + 1));
});
// 7. photo finish: blue and yellow beat gold
shot(4.2, () => { A.blue.play('Run', 1.7); A.yel.play('Run', 1.7); A.gold.play('Run', 1.4); }, (t) => {
  const zb = -172 - t * 9, zg = -175 - t * 7.4;
  A.blue.at(-1, 3, Math.max(zb, -196), PI); A.yel.at(-2, 3, Math.max(zb + 0.4, -196), PI); A.gold.at(2.5, 3, Math.max(zg, -196), PI);
  if (zb < -188 && !A.blue.won) { A.blue.won = 1; fx.confetti(V(0, 4, -188), 220); caption('They beat Gold to the line!'); A.blue.play('Yes'); A.yel.play('Wave'); }
  if (zg < -188 && !A.gold.lost) { A.gold.lost = 1; A.gold.play('No', 1.2); }
  cam(V(9, 5.5, -196), V(0, 3.5, -186));
});
// 8. title card: later, at the stadium
shot(2.2, () => { useSet('ball'); A.blue.won = A.gold.lost = 0; for (const a of Object.values(A)) a.show(false); caption('The football match…', '89th minute', 'title'); }, (t) => { cam(V(0, 30 - t * 4, 34), V(0, 0, 0)); });
// 9. 2-0 down, penalty
shot(5.2, () => {
  A.blue.show(true).at(0, 0, -11.5, PI); A.blue.play('Idle'); A.keeper.show(true).at(0, 0, -20.4, 0); A.keeper.play('Idle');
  A.gold.show(true).at(4, 0, -9, PI + 0.4); A.gold.play('Yes'); A.yel.show(true).at(-4, 0, -8, PI - 0.3);
  ball.position.set(0, 0.4, -13.5); cap = { text: '2|0|89:12', sub: 'PENALTY!', style: 'score' };
}, (t) => {
  if (t < 1.4) cam(V(0, 2.2, -6), V(0, 1, -16));
  else {
    if (!A.blue.kicked) { A.blue.kicked = 1; A.blue.play('Run', 1.5); }
    const u = t - 1.4;
    if (u < 0.5) A.blue.at(0, 0, -11.5 - u * 3, PI);
    else { if (!A.blue.shot) { A.blue.shot = 1; A.blue.play('Punch', 1.5); A.keeper.play('Jump'); } const v = Math.min(1, (u - 0.5) / 0.55); ball.position.set(lerp(0, -3, v), lerp(0.4, 1.6, v), lerp(-13.5, -22.6, v)); ball.rotation.x -= 0.4; A.keeper.at(lerp(0, 3.4, ease((u - 0.5) / 0.6)), Math.sin(Math.min(1, (u - 0.5) / 0.6) * PI) * 1.2, -20.4, 0); A.keeper.m.rotation.z = -Math.min(1, (u - 0.5) / 0.6) * 1.3; }
    if (u > 1.1 && !A.blue.g1) { A.blue.g1 = 1; fx.confetti(V(-3, 2, -22), 160); cap = { text: '2|1|89:40', sub: 'GOOOAL!', style: 'score' }; A.blue.play('Yes'); }
    cam(V(2.5, 2.4, -8.5), V(-0.8, 1.2, -18));
  }
});
// 10. the dribble: past gold, past the keeper, a soft tap in
shot(6, () => {
  A.blue.kicked = A.blue.shot = 0; A.keeper.m.rotation.z = 0; A.keeper.at(0, 0, -20.4, 0); A.keeper.play('Idle');
  A.blue.at(0, 0, 4, PI); A.blue.play('Run', 1.5); ball.position.set(0, 0.4, 2.6); A.gold.at(-1, 0, -6, 0); A.gold.play('Run', 1.4);
}, (t) => {
  const z = 4 - t * 4.2, sway = Math.sin(t * 4) * 1.6;
  A.blue.at(sway, 0, z, PI + Math.cos(t * 4) * 0.3); ball.position.set(sway + Math.sin(t * 4 + 0.6) * 0.5, 0.4, z - 1.3); ball.rotation.x -= 0.25;
  if (t > 1.3 && t < 2.4) { A.gold.at(lerp(-1, sway + 0.3, ease((t - 1.3) / 0.6)), 0, -6, 0); if (t > 1.8 && !A.gold.dove) { A.gold.dove = 1; A.gold.play('Jump_Idle'); } A.gold.m.rotation.x = t > 1.8 ? 1.3 : 0; }
  if (t > 1.8 && t < 2.5) A.blue.m.position.y = Math.sin((t - 1.8) / 0.7 * PI) * 1.4;
  if (t > 3.2 && !A.keeper.dove) { A.keeper.dove = 1; A.keeper.play('Jump'); }
  if (t > 3.2) { const k = ease((t - 3.2) / 0.6); A.keeper.at(lerp(0, -4, k), Math.sin(Math.min(1, (t - 3.2) / 0.6) * PI) * 1.4, -20.4, 0); A.keeper.m.rotation.z = k * 1.3; }
  if (t > 4.4) { const v = Math.min(1, (t - 4.4) / 1.2); ball.position.set(lerp(sway, 0.6, v), 0.4, lerp(z - 1.3, -22.2, v)); }
  if (t > 5.4 && !A.blue.g2) { A.blue.g2 = 1; fx.confetti(V(0.6, 2, -22), 160); cap = { text: '2|2|90:05', sub: 'Past the keeper… easy finish!', style: 'score' }; A.blue.play('Wave'); }
  else if (!A.blue.g2) cap = { text: '2|1|89:58', sub: t < 3 ? 'Skips past Gold…' : '…and fakes the keeper!', style: 'score' };
  cam(V(6 + t * 0.3, 3.2, z + 5.5), V(sway * 0.5, 1, z - 3));
});
// 11. the header
shot(5, () => {
  A.gold.dove = A.keeper.dove = 0; A.gold.m.rotation.x = 0; A.keeper.m.rotation.z = 0; A.keeper.at(0, 0, -20.4, 0); A.keeper.play('Idle');
  A.yel.show(true).at(-9, 0, -14, PI / 2); A.yel.play('Punch'); A.blue.at(0.5, 0, -10, PI); A.blue.play('Run', 1.3); ball.position.set(-8.6, 0.4, -14.5);
}, (t) => {
  if (t < 1.6) { const v = t / 1.6; ball.position.set(lerp(-8.6, 0.3, v), 0.4 + Math.sin(v * PI) * 6 + v * 1.4, lerp(-14.5, -15.5, v)); A.blue.at(0.4, 0, lerp(-10, -14.8, ease(v)), PI); }
  else if (t < 2.1) { if (!A.blue.jumped) { A.blue.jumped = 1; A.blue.play('Jump', 1.2); } const u = (t - 1.6) / 0.5; A.blue.at(0.4, Math.sin(u * PI * 0.5) * 1.5, -15.2, PI); ball.position.set(0.3, 2.3 + (1 - u) * 1.4, -15.5); }
  else { const v = Math.min(1, (t - 2.1) / 0.5); ball.position.set(lerp(0.3, 2.6, v), lerp(2.3, 2.6, v), lerp(-15.5, -22.4, v)); A.blue.at(0.4, Math.max(0, 1.5 - (t - 2.1) * 4), -15.2, PI); A.keeper.at(lerp(0, -2, ease(v)), 0, -20.4, 0); }
  if (t > 2.6 && !A.blue.g3) { A.blue.g3 = 1; fx.confetti(V(2.6, 2, -22), 220); A.blue.play('Yes'); A.yel.play('Wave'); A.gold.play('No'); }
  cap = A.blue.g3 ? { text: '2|3|90:31', sub: 'HEADER! What a comeback!', style: 'score' } : { text: '2|2|90:28', sub: 'Cross from Yellow…', style: 'score' };
  cam(V(-6, 2.5, -9.5), V(0.4, 2, -16));
});
// 12. the final: on the falling floor, both go for the crown
shot(2.4, () => { useSet('fall'); A.blue.jumped = A.blue.g1 = A.blue.g2 = A.blue.g3 = 0; for (const a of Object.values(A)) a.show(false); caption('But the rivalry isn\'t over…', 'Final: Hex-a-Fall', 'title'); }, (t) => { cam(V(Math.sin(t * 0.4) * 26, 18, Math.cos(t * 0.4) * 26), V(0, -6, 0)); });
shot(6.4, () => {
  cap = null; A.blue.show(true).at(-7, 0, 2, PI / 2); A.gold.show(true).at(7, 0, 2, -PI / 2); A.blue.play('Run', 1.4); A.gold.play('Run', 1.4);
}, (t) => {
  const F = MODES.fall; F.update(1 / FPS);
  if (t < 2.4) {
    const x = lerp(7, 1.3, ease(t / 2.4));
    A.blue.at(-x, 0, 2 - t * 0.8, PI / 2 - 0.3); A.gold.at(x, 0, 2 - t * 0.8, -PI / 2 + 0.3);
    for (const tile of F.tiles) if (tile.li === 0 && tile.state === 0 && (Math.hypot(tile.x - A.blue.m.position.x, tile.z - A.blue.m.position.z) < 1.3 || Math.hypot(tile.x - A.gold.m.position.x, tile.z - A.gold.m.position.z) < 1.3)) { tile.state = 1; F.tint(tile, null, 0.62); }
    caption('Both want the crown!');
  } else if (t < 3.6) {
    if (!A.blue.leap) { A.blue.leap = 1; A.blue.play('Jump', 1); A.gold.play('Jump', 1); }
    const u = (t - 2.4) / 1.2, y = Math.sin(Math.min(1, u) * PI) * 2.6;
    A.blue.at(lerp(-1.3, -0.35, u), y, 0.1, PI / 2); A.gold.at(lerp(1.3, 0.35, u), y, 0.1, -PI / 2);
    if (u > 0.5 && !A.blue.bonk) { A.blue.bonk = 1; fx.burst(V(0, 2.8, 0.1), 0xffd23f, 24, 8); caption('BONK!'); }
    if (A.blue.bonk) crown.position.set(0, 1.6 + (u - 0.5) * 14, 0 + (u - 0.5) * -10); crown.rotation.y += 0.3;
  } else {
    if (!A.blue.drop) { A.blue.drop = 1; for (const tile of F.tiles) if (Math.hypot(tile.x, tile.z) < 3.5 && tile.state < 2) F.drop(tile, 0.05); A.blue.play('HitReact'); A.gold.play('HitReact'); caption('…and the floor drops them BOTH!'); }
    const u = t - 3.6; A.blue.at(-0.8, -u * u * 9, 0.1, PI / 2); A.gold.at(0.8, -u * u * 9, 0.1, -PI / 2); A.blue.m.rotation.x = u * 4; A.gold.m.rotation.x = -u * 4;
    crown.position.set(0, 9 - u * 6, -7 - u * 4);
  }
  for (const a of [A.blue, A.gold]) a.grounded = a.m.position.y < 0.1;
  cam(V(0, 3.4 - Math.max(0, t - 3.6) * 5, 9.5), V(0, 1.4 - Math.max(0, t - 3.6) * 7, 0));
});
// 13. splash: the crown sinks, nobody wins
shot(4.2, () => { A.blue.leap = A.blue.bonk = A.blue.drop = 0; crown.position.set(0, -32, -14); }, (t) => {
  const yb = Math.max(-40.5, -26 - t * 9);
  A.blue.at(-1.2, yb, 0, PI / 2); A.gold.at(1.2, yb, 0, -PI / 2);
  crown.position.set(0, Math.max(-41, -32 - t * 6), -6); crown.rotation.z += 0.08;
  if (yb <= -40.4 && !A.blue.splash) { A.blue.splash = 1; for (const x of [-1.2, 1.2, 0]) for (let i = 0; i < 40; i++) puffs.emit({ pos: V(x, -40, 0), vel: V(rand(-4, 4), rand(5, 12), rand(-4, 4)), life: 1, size: rand(0.2, 0.4), g: 18, color: 0xbff0ff }); }
  if (t > 2.4) { A.blue.at(-1.2, -40.6, 0, PI / 2 + 0.4); A.gold.at(1.2, -40.6, 0, -PI / 2 - 0.4); A.blue.play('No'); A.gold.play('No'); }
  caption(t < 2.4 ? 'The crown sinks…' : 'Nobody wins!');
  cam(V(0, -36.5, 9), V(0, -40, -1));
});
// 14. and it starts all over again
shot(4.6, () => { useSet('race2'); A.blue.splash = 0; for (const a of Object.values(A)) a.show(false); A.blue.show(true).at(-1.2, 0, 9, PI); A.gold.show(true).at(1.2, 0, 9, PI); A.ref.show(true).at(6, 0, 5, -PI / 2); A.blue.m.rotation.set(0, PI, 0); A.gold.m.rotation.set(0, PI, 0); A.blue.play('Idle'); A.gold.play('Idle'); caption('The next day…'); }, (t) => {
  if (t < 1.6) { A.blue.face(1.2, 9); A.gold.face(-1.2, 9); if (t > 0.6) { A.blue.play('No'); A.gold.play('No'); } }
  else { if (!A.ref.blew) { A.ref.blew = 1; A.ref.play('Wave'); caption('BEEEEP!'); } if (t > 2.3) { const z = 9 - (t - 2.3) * 9; runAt(A.blue, -1.2, z, 1.4); runAt(A.gold, 1.2, z, 1.4); caption('The rivalry never ends!'); } }
  cam(V(0, 2.4, 15), V(0, 1.2, 6));
});
shot(4.4, () => { A.ref.blew = 0; for (const a of Object.values(A)) a.show(false); }, (t) => {
  cam(V(Math.sin(t * 0.3) * 30, 22, 30), V(0, 0, -30)); cap = { style: 'logo', sub: 'Tap to join the chaos', t: ease(t / 0.5) * 1.08 - Math.max(0, t - 0.5) * 0.16 > 1 ? 1 : ease(t / 0.5) * 1.08 };
});

// ---------------------------------------------------------------- driver used by the renderer
let si = -1, st = 0;
export const total = SHOTS.reduce((a, s) => a + s.dur, 0);
export async function init() {
  // same 'random' choices in every render worker, so the frames match up
  let seed = 1234567; Math.random = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  save.quality = 'high'; save.muted = true;
  await loadAssets(() => {}); computeBoneFix();
  renderer.setPixelRatio(1); renderer.setSize(W, H, false); camera.aspect = W / H; camera.fov = 50; camera.updateProjectionMatrix();
  applyQuality(); renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
  A = {
    blue: new Actor({ skin: 'skin-blue' }), gold: new Actor({ skin: 'skin-radiant', head: 'h-crown', face: 'f-sun' }), yel: new Actor({ skin: 'skin-lemon', head: 'h-cone' }),
    p1: new Actor({ skin: 'skin-straw' }), p2: new Actor({ skin: 'skin-grape', back: 'k-pack' }), ref: new Actor({ skin: 'skin-ref', head: 'h-cupcake' }), keeper: new Actor({ skin: 'skin-orange', face: 'f-glasses', body: 'b-iron' }),
  };
  await document.fonts.load('400 40px Lilita'); await document.fonts.load('800 30px Nunito');
}
export function frame(n, render = true) {
  const T = n / FPS, dt = 1 / FPS;
  let acc = 0, idx = 0; for (; idx < SHOTS.length; idx++) { if (T < acc + SHOTS[idx].dur) break; acc += SHOTS[idx].dur; }
  idx = Math.min(idx, SHOTS.length - 1);
  if (idx !== si) { si = idx; SHOTS[idx].setup(); }
  for (const sw of G.level?.sweepers || []) { sw.ang = sw.w * T; sw.body.quaternion.setFromEuler(0, sw.ang, 0); }
  st = T - acc; SHOTS[idx].upd(st);
  for (const a of Object.values(A)) a.tick(dt);
  G.level?.update(dt, T, false);
  puffs.update(dt); confetti.update(dt); updateGold(dt);
  if (!render) return null;
  renderScene(dt);
  drawOverlay(T);
  return out.toDataURL('image/jpeg', 0.9);
}
