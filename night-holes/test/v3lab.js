module.exports = async ({ p, ev, shot, wait }) => {
  await wait(1500); const t0 = Date.now(); await ev(`document.getElementById('btnSolo').click()`);
  await p.waitForFunction(() => !document.getElementById('hud').hidden, null, { timeout: 300000 }); console.log('lab open after', (Date.now() - t0) / 1000, 's');
  await wait(2000); await shot('wake');
  const go = async (f, x, z, yaw, name, pitch = 0) => { await ev(`(()=>{const n=__nh();const [a,b]=n.cellCenter(${x},${z});n.P.place(${f},a,b,${yaw});n.P.pitch=${pitch};})()`); await wait(3500); await shot(name); };
  await go(0, 9, 4, 3.6, 'tubes'); await go(0, 9, 6, -0.3, 'tube8');
  await ev(`__nh().game.tubeAt = __nh().game.t + 25`); await wait(9000); await shot('press');
  await go(0, 12, 10, 0.4, 'analysis'); await go(0, 2, 5, 0, 'clinic'); await go(0, 4, 10, 0, 'morgue'); await go(2, 7, 2, 0, 'cells');
  console.log(await ev(`JSON.stringify(__nh().monsters.map(m=>[m.kind, !!m.root]))`));
};
