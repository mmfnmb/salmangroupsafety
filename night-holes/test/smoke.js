module.exports = async ({ p, ev, shot, wait }) => {
  await wait(1500); await shot('menu');
  await ev("document.getElementById('btnSolo').click()");
  await p.waitForFunction("window.__nh && window.__nh().game && !document.getElementById('hud').hidden", null, { timeout: 120000 });
  await wait(1500); await shot('start');
  console.log(await ev("(()=>{const g=window.__nh();return JSON.stringify({f:g.P.f,x:g.P.x.toFixed(1),z:g.P.z.toFixed(1),items:g.items.length,inter:g.W.inter.length,mons:g.monsters.map(m=>m.kind+':'+m.f+':'+m.x.toFixed(1)+','+m.z.toFixed(1))})})()"));
  // look toward tube lab
  await ev("(()=>{const g=window.__nh();g.P.place(0,g.S.tube.x,g.S.tube.z+3.2,0);})()"); await wait(800); await shot('tube');
  await ev("(()=>{const g=window.__nh();g.P.place(0,8,8.4,Math.PI/2);})()"); await wait(800); await shot('hall');
};
