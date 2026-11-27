module.exports = async ({ p, ev, shot, wait }) => {
  await wait(1500); await shot('m_menu'); await ev("document.getElementById('btnShop').click()"); await wait(800); await shot('m_shop'); await ev("document.getElementById('shopBack').click()");
  await ev("document.getElementById('btnSolo').click()");
  await p.waitForFunction("window.__nh && window.__nh().game && !document.getElementById('hud').hidden", null, { timeout: 120000 }); await wait(1500);
  await ev("(()=>{const g=window.__nh();const i=g.W.inter.find(q=>q.kind==='scale');g.P.place(0,i.x+0.6,i.z+0.6,Math.atan2(0.6,0.6));})()"); await wait(800); await shot('m_play');
  await ev("document.getElementById('bUse').click()"); await wait(600); await shot('m_puzzle');
};
