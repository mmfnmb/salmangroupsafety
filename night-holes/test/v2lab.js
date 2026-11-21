module.exports = async ({ p, ev, shot, wait }) => {
  await wait(1500); await shot('menu');
  await ev(`document.getElementById('btnSolo').click()`);
  await p.waitForFunction(() => !document.getElementById('hud').hidden, null, { timeout: 180000 });
  await wait(4000); await shot('wake');
  const go = async (f, x, z, yaw, name) => { await ev(`(()=>{const n=__nh();const [a,b]=n.cellCenter(${x},${z});n.P.place(${f},a,b,${yaw});n.P.pitch=0;})()`); await wait(3500); await shot(name); };
  await go(0, 5, 6, 0, 'tube'); await go(0, 6, 1, 3.14, 'security'); await go(0, 10, 1, 3.14, 'director'); await go(0, 6, 10, 0, 'morgue'); await go(0, 13, 6, 0, 'cafe'); await go(0, 6, 3, 1.57, 'hall');
  await go(1, 13, 2, 0, 'servers'); await go(2, 5, 1, 3.14, 'b2pods');
  console.log(await ev(`JSON.stringify({inter:__nh().W.inter.length, kinds:[...new Set(__nh().W.inter.map(i=>i.kind))], items:__nh().items.length})`));
  await ev(`__nh().localCaught(__nh().monsters[0])`); await wait(500); await shot('scare1'); await wait(500); await shot('scare2'); await wait(3000); await shot('dead');
};
