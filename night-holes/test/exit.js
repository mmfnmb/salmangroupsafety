module.exports = async ({ p, ev, shot, wait }) => {
  await wait(1200); await ev("document.getElementById('btnSolo').click()");
  await p.waitForFunction("window.__nh && window.__nh().game && !document.getElementById('hud').hidden", null, { timeout: 120000 });
  const G = (js) => ev(`(()=>{const g=window.__nh();${js}})()`);
  await G("g.monsters.forEach(m=>{m.active=false});g.game.tubeAt=1e9;const d=g.W.doors.find(q=>q.lock==='exit');d.unlocked=true;d.target=1;");
  await wait(1500);
  console.log(await G("const d=g.W.doors.find(q=>q.lock==='exit');g.P.place(2,d.center[0]-d.dir[0]*1.2,d.center[1]-d.dir[1]*1.2,Math.atan2(-d.dir[0],-d.dir[1]));return JSON.stringify({c:d.center,dir:d.dir,open:d.open,P:[g.P.x,g.P.z,g.P.yaw]})"));
  await ev("dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW'}))");
  for (let i = 0; i < 8; i++) { await wait(1500); console.log(await G("return [g.P.x.toFixed(2),g.P.z.toFixed(2),g.P.locked,!document.getElementById('panel').hidden,g.game.escaped].join(' ')")); }
  console.log(await G("return JSON.stringify(g.W.boxes[2].filter(b=>b.x1>21.5&&b.x0<24&&b.z1>25&&b.z0<28).map(b=>[b.x0,b.x1,b.z0,b.z1,b.h].map(v=>+v.toFixed(2))))")); console.log(await G("const d=g.W.doors.find(q=>q.lock===\"exit\");return d.open+\" \"+d.w"));
};
