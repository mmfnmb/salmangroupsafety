module.exports = async ({ p, ev, shot, wait }) => {
  await wait(1200); await ev("document.getElementById('btnSolo').click()");
  await p.waitForFunction("window.__nh && window.__nh().game && !document.getElementById('hud').hidden", null, { timeout: 120000 });
  const G = (js) => ev(`(()=>{const g=window.__nh();${js}})()`);
  // jumpscare by the gaunt after the tube breaks
  await G("g.breakTube(true)"); await wait(4000); await shot('broken_tube_from_door');
  await G("const m=g.monsters[0];g.P.place(0,m.x,m.z+3,0);"); await wait(1500); await shot('gaunt_free');
  await G("g.localCaught(g.monsters[0])"); await wait(500); await shot('jumpscare'); await wait(2500); await shot('dead');
  await ev("document.getElementById('btnRetry').click()"); await p.waitForFunction("!document.getElementById('hud').hidden", null, { timeout: 120000 }); await wait(800);
  await G("g.monsters.forEach(m=>{m.active=false});g.game.tubeAt=1e9;const d=g.W.doors.find(q=>q.lock==='exit');d.unlocked=true;d.target=1;d.open=1;g.P.place(2,d.center[0]+0.4,d.center[1],-Math.PI/2);");
  await wait(7000); await shot('ending'); await wait(9000); await shot('results');
};
