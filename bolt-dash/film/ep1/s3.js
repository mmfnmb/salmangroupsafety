// Episode 1, scene 3: "Ads and the big news". From the sofa, Blue and Yellow watch two ads, then the league announcement.
import { V, PI, M, place, fx, puffs, say, hideAll, frameGroup, closeUp, overShoulder, orbit, fixed, camTo, ease, lerp, dress, LOOKS, clamp } from '../lib.js';
import { SOFA } from '../sets/studio.js';

// ---- the TV look: anything shown "on TV" gets a bezel, faint scanlines and a corner badge
export function tvCard(badge, color = '#e8202a') {
  return (ctx, t) => {
    const W = ctx.canvas.width, H = ctx.canvas.height, b = 26;
    ctx.save();
    ctx.globalAlpha = 0.07; ctx.fillStyle = '#000'; for (let y = 34; y < H - 34; y += 3) ctx.fillRect(0, y, W, 1);
    ctx.globalAlpha = 1; ctx.strokeStyle = '#141018'; ctx.lineWidth = b * 2;
    ctx.beginPath(); ctx.roundRect(b * 0.4, 34 + b * 0.4, W - b * 0.8, H - 68 - b * 0.8, 38); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.roundRect(b + 2, 34 + b + 2, W - 2 * b - 4, H - 68 - 2 * b - 4, 26); ctx.stroke();
    if (badge) {
      ctx.font = '400 22px Lilita'; const w = ctx.measureText(badge).width + 30;
      ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(W - b - w - 14, 34 + b + 14, w, 32, 9); ctx.fill();
      if (badge === 'LIVE' && Math.floor(t * 2) % 2 === 0) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(W - b - w, 34 + b + 30, 5, 0, PI * 2); ctx.fill(); }
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(badge, W - b - w / 2 - 6 + (badge === 'LIVE' ? 6 : 0), 34 + b + 38);
    }
    ctx.restore();
  };
}
// sitting on the sofa: the cast sinks into the seat cushion
export const sit = (a, side, ry = 0) => { const s = side === 'L' ? SOFA.left : SOFA.right; a.at(s[0], SOFA.seatY, s[1], ry); return a; };
const sofaCam = (A, k = 4) => frameGroup([A.blue, A.yellow], { side: 1, h: 1.0, dist: 0.95, look: 1.1, k });

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
  S.push({ dur: 5, set: 'sofa_day', time: 'interior', setup() { hideAll(); sit(A.blue, 'L').play('Idle'); sit(A.yellow, 'R').play('Idle'); },
    upd(t) { sofaCam(A); say(t < 2.6 ? 'Blue' : 'Yellow', t < 2.6 ? 'Finally, the news!' : 'Shh! Ads first.'); if (t > 2.6) A.yellow.face(A.blue.p.x, A.blue.p.z); } });
  // 2. ad: the Frying Pan
  S.push({ dur: 4.5, set: 'adstage', time: 'day', card: tvCard('AD', '#ff7a1a'),
    setup() { hideAll(); dress(A.minto.m, { ...LOOKS.minto, bat: 'bat-pan' }, { bat: true }); A.minto.at(-1.6, 0, 1.6, PI / 2).play('Idle'); A.vio.at(1.2, 0, 1.6, -PI / 2).play('Idle'); },
    upd(t) { frameGroup([A.minto, A.vio], { side: 1, h: 1.2, look: 1.0 }); say('Announcer', t < 2.2 ? 'Tired of losing?' : 'Need something... STRONGER?'); if (t > 2.2) A.minto.play('Yes'); } });
  S.push({ dur: 4, card: tvCard('AD', '#ff7a1a'),
    setup() { A.minto.replay('Punch', 1.1); },
    upd(t, dt, T) {
      closeUp(A.vio, { ang: -0.7, dist: 3.6, h: 1.4 });
      if (t > 0.45 && !starT) { A.vio.replay('HitReact'); fx.burst(A.vio.head(), 0xffd23f, 16, 6); starT = stars(A.vio, true); }
      if (starT) starT(T);
      say('Announcer', 'BONG! The FRYING PAN makes anyone dizzy!');
    } });
  S.push({ dur: 4, card: tvCard('AD', '#ff7a1a'),
    upd(t, dt, T) { closeUp(A.minto, { ang: 0.6, dist: 2.4, h: 1.3 }); A.minto.play('Yes'); starT?.(T); say('Announcer', 'Only 200 coins! Special price!'); } });
  S.push({ dur: 3.5, card: tvCard('AD', '#ff7a1a'),
    upd(t, dt, T) { A.vio.m.rotation.z = Math.sin(T * 6) * 0.25; A.vio.m.rotation.y = -PI / 2 + Math.sin(T * 3) * 0.6; closeUp(A.vio, { ang: 0.2, dist: 2.6 }); starT?.(T); say('Announcer', 'Side effects may include... stars.'); } });
  // 3. back on the sofa
  S.push({ dur: 4, set: 'sofa_day', time: 'interior',
    setup() { stars(A.vio, false); A.vio.m.rotation.z = 0; hideAll(); sit(A.blue, 'L').replay('Yes'); sit(A.yellow, 'R').play('Idle'); },
    upd(t) { sofaCam(A); say(t < 2 ? 'Blue' : 'Yellow', t < 2 ? 'Ha! Poor guy.' : 'I want one!'); if (t > 2) A.yellow.replay('Wave'); } });
  // 4. ad: the Black Hole character
  S.push({ dur: 5.5, set: 'adstage_void', time: 'night', card: tvCard('AD', '#7b4dff'),
    setup() { hideAll(); dress(A.minto.m, LOOKS.minto); dress(A.slate.m, { skin: 'skin-void' }); A.slate.at(0, 0.0, 0.6, 0).play('Idle'); },
    upd(t) { orbit([0, 0, 0.6], t, { r: 4.2, h: 1.4, speed: 0.35, from: -0.6 }); say('Announcer', 'The BLACK HOLE.'); } });
  S.push({ dur: 5, card: tvCard('AD', '#7b4dff'),
    upd(t) { closeUp(A.slate, { ang: 0.4 - t * 0.08, dist: 2.3 - t * 0.12, h: 1.25 }); if (t > 1.5) A.slate.play('Yes'); say('Announcer', 'The rarest character in the world.'); } });
  S.push({ dur: 4.5, card: tvCard('AD', '#7b4dff'),
    upd(t) { fixed([0, 0.6, 6.5], [0, 1.4, 0.6]); A.slate.play('Wave'); say('Announcer', 'Only in the Lucky Wheel... if you are lucky.'); } });
  // 5. Yellow's eyes shine
  S.push({ dur: 5, set: 'sofa_day', time: 'interior',
    setup() { dress(A.slate.m, LOOKS.slate); hideAll(); sit(A.blue, 'L').play('Idle'); sit(A.yellow, 'R').play('Idle'); },
    upd(t, dt, T) {
      closeUp(A.yellow, { ang: 0.25, dist: 2.2 - t * 0.12, h: 1.2 });
      if (Math.floor(T * 6) !== Math.floor((T - dt) * 6)) { const h = A.yellow.head(); fx.burst(V(h.x + 0.25, h.y + 0.05, h.z + 0.55), 0xfff2a0, 3, 1.5); fx.burst(V(h.x - 0.25, h.y + 0.05, h.z + 0.55), 0xfff2a0, 3, 1.5); }
      say('Yellow', 'I... need... it.');
    } });
  S.push({ dur: 4, upd(t) { sofaCam(A); A.blue.face(A.yellow.p.x, A.yellow.p.z); say('Blue', 'You can\'t even afford the pan!'); if (t > 2.2) A.yellow.replay('No'); } });
  // 6. the news: the Party Games League
  S.push({ dur: 5.5, set: 'studio', time: 'interior', card: tvCard('LIVE'),
    setup() { hideAll(); A.silver.at(-1.2, 0, -0.9, 0).play('Idle'); },
    upd(t) { camTo(V(lerp(-6, -2, ease(t / 5.5)), 4.2, 13), V(-0.5, 2.4, -2), 3); say('Anchor', 'Good evening. We have breaking news!'); } });
  S.push({ dur: 5, card: tvCard('LIVE'),
    upd(t) { closeUp(A.silver, { ang: 0.25, dist: 3.2, h: 1.5 }); if (t > 1) A.silver.play('Yes'); say('Anchor', 'For the first time ever...'); } });
  S.push({ dur: 6, card: tvCard('LIVE'),
    upd(t) { camTo(V(0, 2.8, lerp(9, 6.5, ease(t / 6))), V(0, 2.6, -6.2), 3); say('Anchor', 'the PARTY GAMES LEAGUE!'); } });
  S.push({ dur: 6, card: tvCard('LIVE'),
    upd(t) { closeUp(A.silver, { ang: -0.3, dist: 3.4, h: 1.5 }); A.silver.play(t < 3 ? 'Wave' : 'Idle'); say('Anchor', 'Nine teams. Four players each. Eight games.'); } });
  S.push({ dur: 6, card: tvCard('LIVE'),
    upd(t) { camTo(V(-3.2, 2.4, lerp(4.5, 3.6, ease(t / 6))), V(-8, 2.3, -6.2), 3); say('Anchor', 'Obstacle Dash, Hex Drop, Golf, Volley, Puck, Bat Ball, The Summit... and the Arena!'); } });
  S.push({ dur: 6, card: tvCard('LIVE'),
    upd(t) { camTo(V(6.5 + Math.sin(t * 0.5) * 2.2, 3.9, 0.5 + Math.cos(t * 0.5) * 3.4), V(6.5, 3.7, 0.5), 3); say('Anchor', 'And the champion takes the LEAGUE CROWN!'); } });
  S.push({ dur: 5, card: tvCard('LIVE'),
    upd(t) { frameGroup([A.silver], { side: 1, h: 1.8, dist: 1.6, look: 1.4 }); A.silver.play('Wave'); say('Anchor', 'Team sign-ups open... TOMORROW!'); } });
  // 7. Blue and Yellow look at each other... and go wild
  S.push({ dur: 4, set: 'sofa_day', time: 'interior',
    setup() { hideAll(); sit(A.blue, 'L').play('Idle'); sit(A.yellow, 'R').play('Idle'); },
    upd(t) { sofaCam(A, 3); if (t > 1.2) { A.blue.face(A.yellow.p.x, A.yellow.p.z); A.yellow.face(A.blue.p.x, A.blue.p.z); } say(null); } });
  S.push({ dur: 2.5, upd() { closeUp(A.blue, { ang: 0.9, dist: 2 }); } });
  S.push({ dur: 2.5, upd() { closeUp(A.yellow, { ang: -0.9, dist: 2 }); } });
  S.push({ dur: 7, setup() { A.blue.at(SOFA.left[0], 0.6, SOFA.left[1], 0); A.yellow.at(SOFA.right[0], 0.6, SOFA.right[1], 0); },
    upd(t, dt, T) {
      // bouncing on the sofa cushions
      const hb = Math.abs(Math.sin(T * 5.2)) * 1.1, hy = Math.abs(Math.sin(T * 5.2 + 1.3)) * 1.1;
      A.blue.at(SOFA.left[0], 0.6 + hb, SOFA.left[1], Math.sin(T * 2) * 0.4); A.yellow.at(SOFA.right[0], 0.6 + hy, SOFA.right[1], -Math.sin(T * 2) * 0.4);
      A.blue.play(hb > 0.3 ? 'Jump_Idle' : 'Yes'); A.yellow.play(hy > 0.3 ? 'Jump_Idle' : 'Yes');
      if (Math.floor(T * 5.2 / PI) !== Math.floor((T - dt) * 5.2 / PI)) puffs.emit({ pos: V(0, 0.8, -0.8), vel: V(0, 2, 1), life: 0.6, size: 0.3, color: 0xffffff });
      frameGroup([A.blue, A.yellow], { side: 1, h: 1.6, dist: 1.25, look: 1.6, ang: Math.sin(t * 0.4) * 0.25 });
      say(t < 3.5 ? 'Blue' : 'Yellow', t < 3.5 ? 'WE ARE IN!' : 'LET\'S GOOOO!');
    } });
  return S;
}
