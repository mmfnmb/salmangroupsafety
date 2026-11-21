module.exports = async ({ p, ev, shot, wait }) => {
  await wait(1500); await ev(`document.getElementById('btnSolo').click()`);
  await p.waitForFunction(() => !document.getElementById('hud').hidden, null, { timeout: 300000 }); await wait(2000);
  const go = async (f, x, z, yaw, name) => { await ev(`(()=>{const n=__nh();const [a,b]=n.cellCenter(${x},${z});n.P.place(${f},a,b,${yaw});n.P.pitch=0;})()`); await wait(3000); if (name) await shot(name); };
  await go(0, 2, 1, 1.0, 'wake'); await go(0, 5, 6, 0, 'tube'); await go(0, 6, 9, 0, 'morgue'); await go(0, 6, 3, 1.57, 'hall'); await go(1, 13, 2, 0, 'servers'); await go(2, 5, 1, 3.14, 'b2pods');
  // jumpscare
  await ev(`__nh().localCaught(__nh().monsters[0])`); await wait(250); await shot('scare1'); await wait(400); await shot('scare2'); await wait(3500); await shot('dead');
  // bomb ending
  await ev(`(()=>{const n=__nh(); n.game.end=false; n.game.endShown=false; n.P.dead=false; n.P.locked=false; n.S.solved.exit=true; document.getElementById('dead').hidden=true; document.getElementById('hud').hidden=false;})()`);
  await go(2, 9, 9, -1.57, 'tunnel'); await ev(`__nh().armBomb()`); await wait(1500); await shot('armed');
  await ev(`(()=>{const n=__nh(); const [a,b]=n.cellCenter(15,9); n.P.place(2,a,b,-1.57);})()`);
  for (let i = 0; i < 7; i++) { await wait(6000); await shot('end' + i); }
};
