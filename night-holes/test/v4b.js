module.exports = async ({ p, ev, shot, wait }) => {
  await wait(1500); await ev(`document.getElementById('btnSolo').click()`); await p.waitForFunction(() => !document.getElementById('hud').hidden, null, { timeout: 300000 }); await wait(2500);
  await ev(`(()=>{const n=__nh(); const m=n.monsters.find(q=>q.kind==='matron'); m.active=true; n.P.place(m.f, m.x+2.2, m.z, 1.57);})()`);
  for (let i = 0; i < 6; i++) { await wait(3000); console.log(await ev(`(()=>{const n=__nh(); const m=n.monsters.find(q=>q.kind==='matron'); return JSON.stringify({ring:n.cam.ring.length, pending:!!n.cam.pending, cool:n.cam.cool.toFixed(1), dead:n.P.dead, d:Math.hypot(m.x-n.P.x,m.z-n.P.z).toFixed(2), alpha:m.alpha, end:n.game.end})})()`)); }
  await shot('after');
};
