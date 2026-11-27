// Episode 1, scene 3: "Ads and the big news". From the sofa, Blue and Yellow watch two ads, then the league announcement.
import { V, PI, M, place, fx, puffs, say, hideAll, frameGroup, closeUp, overShoulder, orbit, fixed, camTo, ease, lerp, dress, LOOKS, clamp, Actor, ACTORS, extraLook } from '../lib.js';
import { HOUSE } from '../sets/house.js';

// ---- the TV look: anything shown "on TV" gets a bezel, faint scanlines and a corner badge
export function tvCard(badge, color = '#e8202a') {
  return (ctx, t) => {
    const W = ctx.canvas.width, H = ctx.canvas.height, top = 34, bot = H - 34, b = 12;
    ctx.save();
    // faint scanlines and a glass sheen across the picture
    ctx.globalAlpha = 0.05; ctx.fillStyle = '#000'; for (let y = top; y < bot; y += 3) ctx.fillRect(0, y, W, 1);
    ctx.globalAlpha = 1; const gl = ctx.createLinearGradient(0, top, W * 0.6, bot); gl.addColorStop(0, 'rgba(255,255,255,0.10)'); gl.addColorStop(0.35, 'rgba(255,255,255,0.02)'); gl.addColorStop(0.36, 'rgba(255,255,255,0)'); ctx.fillStyle = gl; ctx.fillRect(0, top, W, bot - top);
    // thin dark bezel with a slight edge highlight, like a modern TV
    ctx.fillStyle = '#0d0d11'; ctx.fillRect(0, top, W, b); ctx.fillRect(0, bot - b, W, b); ctx.fillRect(0, top, b, bot - top); ctx.fillRect(W - b, top, b, bot - top);
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; ctx.strokeRect(b + 0.5, top + b + 0.5, W - 2 * b - 1, bot - top - 2 * b - 1);
    // channel logo
    ctx.font = '400 15px Lilita'; ctx.globalAlpha = 0.75; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText('BOLT TV', b + 12, bot - b - 12); ctx.globalAlpha = 1;
    if (badge) {
      ctx.font = '400 18px Lilita'; const w = ctx.measureText(badge).width + 26, x = W - b - w - 12, y = top + b + 12;
      ctx.fillStyle = color; ctx.fillRect(x, y, w, 26);
      if (badge === 'LIVE' && Math.floor(t * 2) % 2 === 0) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 9, y + 13, 4, 0, PI * 2); ctx.fill(); }
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(badge, x + w / 2 + (badge === 'LIVE' ? 5 : 0), y + 19);
    }
    ctx.restore();
  };
}
// sitting on the sofa: the cast sinks into the seat cushion
// sitting on the house sofa (legs bent, hips on the cushion), facing the TV
export const sit = (a, side, ry = PI) => { a.m.rotation.x = 0; a.m.rotation.z = 0; return a.sitAt(side === 'L' ? HOUSE.seat.blue : HOUSE.seat.yellow, HOUSE.seat.y, HOUSE.seat.z, ry); };
export const standUp = (a) => { a.stand(); return a; };
const sofaCam = (A, k = 4) => frameGroup([A.blue, A.yellow], { side: -1, h: 0.85, dist: 0.72, look: 0.85, k });
// the people on TV are extras, each in their own colour (made once, shared with scene 7)
const X = {};
export function tvCast() {
  if (!X.anchor) {
    X.anchor = new Actor(extraLook('Anchor', { head: 'h-cone' })); const hl = extraLook('Ad Actor 1'); X.hitter = new Actor(hl); X.hitter.look = hl; X.victim = new Actor(extraLook('Ad Actor 2')); X.model = new Actor({ skin: 'skin-void' });
    ACTORS.push(X.anchor, X.hitter, X.victim, X.model);
  }
  return X;
}

// dizzy stars over someone's head
function stars(a, on) {
  if (!a.stars) { a.stars = [0, 1, 2].map(() => place('Star', 0, 0, 0, 0.22)); }
  a.stars.forEach((s, i) => { s.visible = on; });
  return (T) => { const h = a.head(); a.stars.forEach((s, i) => { const k = T * 5 + i * 2.09; s.position.set(h.x + Math.cos(k) * 0.55, h.y + 0.55, h.z + Math.sin(k) * 0.55); s.rotation.y = T * 6; }); };
}

export function shots(A) {
  let starT = null;
  const S = [];
  // 1. watching TV
  S.push({ dur: 5, set: 'house_int', time: 'interior', setup() { hideAll(); sit(A.blue, 'L').play('Idle'); sit(A.yellow, 'R').play('Idle'); },
    upd(t) { HOUSE.tvShow('adpan', t); sofaCam(A); say(t < 2.6 ? 'Blue' : 'Yellow', t < 2.6 ? 'Finally, the news!' : 'Shh! Ads first.'); if (t > 2.6) A.yellow.face(A.blue.p.x, A.blue.p.z); } });
  // 2. ad: the Frying Pan
  S.push({ dur: 4.5, set: 'adstage', time: 'day', card: tvCard('AD', '#ff7a1a'),
    setup() { hideAll(); const T = tvCast(); dress(T.hitter.m, { ...T.hitter.look, bat: 'bat-pan' }, { bat: true }); T.hitter.at(-1.6, 0, 1.6, PI / 2).play('Idle'); T.victim.at(1.2, 0, 1.6, -PI / 2).play('Idle'); },
    upd(t) { const T = tvCast(); frameGroup([T.hitter, T.victim], { side: 1, h: 1.1, dist: 0.7, look: 1.0 }); say('Announcer', t < 2.2 ? 'Tired of losing?' : 'Need something... STRONGER?'); if (t > 2.2) T.hitter.play('Yes'); } });
  S.push({ dur: 4, card: tvCard('AD', '#ff7a1a'),
    setup() { tvCast().hitter.replay('Punch', 1.1); },
    upd(t, dt, T) {
      closeUp(tvCast().victim, { ang: -0.7, dist: 3.6, h: 1.4 });
      if (t > 0.45 && !starT) { tvCast().victim.replay('HitReact'); fx.burst(tvCast().victim.head(), 0xffd23f, 16, 6); starT = stars(tvCast().victim, true); }
      if (starT) starT(T);
      say('Announcer', 'BONG! The FRYING PAN makes anyone dizzy!');
    } });
  S.push({ dur: 4, card: tvCard('AD', '#ff7a1a'),
    upd(t, dt, T) { closeUp(tvCast().hitter, { ang: 0.6, dist: 2.4, h: 1.3 }); tvCast().hitter.play('Yes'); starT?.(T); say('Announcer', 'Only 200 coins! Special price!'); } });
  S.push({ dur: 3.5, card: tvCard('AD', '#ff7a1a'),
    upd(t, dt, T) { tvCast().victim.m.rotation.z = Math.sin(T * 6) * 0.25; tvCast().victim.m.rotation.y = -PI / 2 + Math.sin(T * 3) * 0.6; closeUp(tvCast().victim, { ang: 0.2, dist: 2.6 }); starT?.(T); say('Announcer', 'Side effects may include... stars.'); } });
  // 3. back on the sofa
  S.push({ dur: 4, set: 'house_int', time: 'interior',
    setup() { stars(tvCast().victim, false); tvCast().victim.m.rotation.z = 0; hideAll(); sit(A.blue, 'L').replay('Yes'); sit(A.yellow, 'R').play('Idle'); },
    upd(t) { HOUSE.tvShow('adpan', t); sofaCam(A); say(t < 2 ? 'Blue' : 'Yellow', t < 2 ? 'Ha! Poor guy.' : 'I want one!'); if (t > 2) A.yellow.replay('Wave'); } });
  // 4. ad: the Black Hole character
  S.push({ dur: 5.5, set: 'adstage_void', time: 'night', card: tvCard('AD', '#7b4dff'),
    setup() { hideAll(); tvCast().model.at(0, 0.0, 0.6, 0).play('Idle'); },
    upd(t) { orbit([0, 0, 0.6], t, { r: 4.2, h: 1.4, speed: 0.35, from: -0.6 }); say('Announcer', 'The BLACK HOLE.'); } });
  S.push({ dur: 5, card: tvCard('AD', '#7b4dff'),
    upd(t) { closeUp(tvCast().model, { ang: 0.4 - t * 0.08, dist: 2.3 - t * 0.12, h: 1.25 }); if (t > 1.5) tvCast().model.play('Yes'); say('Announcer', 'The rarest character in the world.'); } });
  S.push({ dur: 4.5, card: tvCard('AD', '#7b4dff'),
    upd(t) { fixed([0, 0.6, 6.5], [0, 1.4, 0.6]); tvCast().model.play('Wave'); say('Announcer', 'Only in the Lucky Wheel... if you are lucky.'); } });
  // 5. Yellow's eyes shine
  S.push({ dur: 5, set: 'house_int', time: 'interior',
    setup() { hideAll(); sit(A.blue, 'L').play('Idle'); sit(A.yellow, 'R').play('Idle'); },
    upd(t, dt, T) {
      HOUSE.tvShow('advoid', t); closeUp(A.yellow, { ang: -0.35, dist: 2.0 - t * 0.12, h: 0.95 });
      if (Math.floor(T * 6) !== Math.floor((T - dt) * 6)) { const h = A.yellow.head(); fx.burst(V(h.x + 0.25, h.y + 0.05, h.z + 0.55), 0xfff2a0, 3, 1.5); fx.burst(V(h.x - 0.25, h.y + 0.05, h.z + 0.55), 0xfff2a0, 3, 1.5); }
      say('Yellow', 'I... need... it.');
    } });
  S.push({ dur: 4, upd(t) { HOUSE.tvShow('advoid', t); sofaCam(A); A.blue.face(A.yellow.p.x, A.yellow.p.z); say('Blue', 'You can\'t even afford the pan!'); if (t > 2.2) A.yellow.replay('No'); } });
  // 6. the news: the Party Games League
  S.push({ dur: 5.5, set: 'studio', time: 'interior', card: tvCard('LIVE'),
    setup() { hideAll(); tvCast().anchor.at(-1.2, 0, -0.9, 0).play('Idle'); },
    upd(t) { camTo(V(lerp(-6, -2, ease(t / 5.5)), 4.2, 13), V(-0.5, 2.4, -2), 3); say('Anchor', 'Good evening. We have breaking news!'); } });
  S.push({ dur: 5, card: tvCard('LIVE'),
    upd(t) { closeUp(tvCast().anchor, { ang: 0.25, dist: 3.2, h: 1.5 }); if (t > 1) tvCast().anchor.play('Yes'); say('Anchor', 'For the first time ever...'); } });
  S.push({ dur: 6, card: tvCard('LIVE'),
    upd(t) { camTo(V(0, 2.8, lerp(9, 6.5, ease(t / 6))), V(0, 2.6, -6.2), 3); say('Anchor', 'the PARTY GAMES LEAGUE!'); } });
  S.push({ dur: 6, card: tvCard('LIVE'),
    upd(t) { closeUp(tvCast().anchor, { ang: -0.3, dist: 3.4, h: 1.5 }); tvCast().anchor.play(t < 3 ? 'Wave' : 'Idle'); say('Anchor', 'Nine teams. Four players each. Eight games.'); } });
  S.push({ dur: 6, card: tvCard('LIVE'),
    upd(t) { camTo(V(-3.2, 2.4, lerp(4.5, 3.6, ease(t / 6))), V(-8, 2.3, -6.2), 3); say('Anchor', 'Obstacle Dash, Hex Drop, Golf, Volley, Puck, Bat Ball, The Summit... and the Arena!'); } });
  S.push({ dur: 6, card: tvCard('LIVE'),
    upd(t) { camTo(V(6.5 + Math.sin(t * 0.5) * 2.2, 3.9, 0.5 + Math.cos(t * 0.5) * 3.4), V(6.5, 3.7, 0.5), 3); say('Anchor', 'And the champion takes the LEAGUE CROWN!'); } });
  S.push({ dur: 5, card: tvCard('LIVE'),
    upd(t) { frameGroup([tvCast().anchor], { side: 1, h: 1.8, dist: 1.6, look: 1.4 }); tvCast().anchor.play('Wave'); say('Anchor', 'Team sign-ups open... TOMORROW!'); } });
  // 7. Blue and Yellow look at each other... and go wild
  S.push({ dur: 4, set: 'house_int', time: 'interior',
    setup() { hideAll(); sit(A.blue, 'L').play('Idle'); sit(A.yellow, 'R').play('Idle'); },
    upd(t) { HOUSE.tvShow('news', t); sofaCam(A, 3); if (t > 1.2) { A.blue.face(A.yellow.p.x, A.yellow.p.z); A.yellow.face(A.blue.p.x, A.blue.p.z); } say(null); } });
  S.push({ dur: 2.5, upd() { closeUp(A.blue, { ang: 0.9, dist: 1.9, h: 0.95 }); } }); // they face each other: swing towards the TV side
  S.push({ dur: 2.5, upd() { closeUp(A.yellow, { ang: -0.9, dist: 1.9, h: 0.95 }); } });
  S.push({ dur: 7, setup() { A.blue.stand(); A.yellow.stand(); },
    upd(t, dt, T) {
      // bouncing on the sofa cushions
      const hb = Math.abs(Math.sin(T * 5.2)) * 1.1, hy = Math.abs(Math.sin(T * 5.2 + 1.3)) * 1.1;
      const sy = HOUSE.seat.y; A.blue.at(HOUSE.seat.blue, sy + hb, HOUSE.seat.z, PI + Math.sin(T * 2) * 0.4); A.yellow.at(HOUSE.seat.yellow, sy + hy, HOUSE.seat.z, PI - Math.sin(T * 2) * 0.4);
      A.blue.play(hb > 0.3 ? 'Jump_Idle' : 'Yes'); A.yellow.play(hy > 0.3 ? 'Jump_Idle' : 'Yes');
      if (Math.floor(T * 5.2 / PI) !== Math.floor((T - dt) * 5.2 / PI)) puffs.emit({ pos: V(0, HOUSE.seat.y + 0.2, HOUSE.seat.z), vel: V(0, 2, -1), life: 0.6, size: 0.12, color: 0xffffff });
      frameGroup([A.blue, A.yellow], { side: -1, h: 1.2, dist: 0.75, look: 1.2, ang: Math.sin(t * 0.4) * 0.2 });
      say(t < 3.5 ? 'Blue' : 'Yellow', t < 3.5 ? 'WE ARE IN!' : 'LET\'S GOOOO!');
    } });
  return S;
}
