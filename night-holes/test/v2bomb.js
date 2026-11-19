module.exports = async ({ p, ev, shot, wait }) => {
  const T = (code, ms = 8000) => Promise.race([ev(code), new Promise((r) => setTimeout(() => r('EVAL TIMEOUT'), ms))]);
  await wait(1500); await ev(`document.getElementById('btnSolo').click()`);
  await p.waitForFunction(() => !document.getElementById('hud').hidden, null, { timeout: 300000 }); await wait(2000);
  console.log('a', await T(`(()=>{const n=__nh(); n.S.solved.exit=true; const [a,b]=n.cellCenter(8,9); n.P.place(2,a,b,-1.57); return 'ok'})()`));
  await wait(2000); console.log('b', await T(`__nh().P.f + ' ' + __nh().P.x.toFixed(1)`)); await shot('tunnel');
  console.log('c', await T(`(__nh().armBomb(), 'armed')`)); await wait(1500); await shot('armed');
  console.log('d', await T(`(()=>{const n=__nh(); const [a,b]=n.cellCenter(15,9); n.P.place(2,a,b,-1.57); return 'tp'})()`));
  await ev('window.__ts = 0.35'); for (let i = 0; i < 9; i++) { await wait(5000); console.log('e' + i, await T(`document.getElementById('endText').textContent + '|' + (__nh().game.ending)`)); await shot('end' + i); }
};
