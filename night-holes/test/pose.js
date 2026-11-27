module.exports = async ({ p, ev, shot, wait }) => {
  await wait(1500); await ev(`document.getElementById('btnSolo').click()`); await p.waitForFunction(() => !document.getElementById('hud').hidden, null, { timeout: 300000 }); await wait(2000);
  await ev(`(()=>{const n=__nh(); const tb=n.S.tube; n.P.place(0, tb.x, tb.z + 3.0, 0); n.P.pitch = 0.15;})()`); await wait(5000); await shot('sleep');
  await ev(`__nh().game.tubeAt = __nh().game.t + 20`); await wait(9000); await shot('press');
  await ev(`(()=>{const n=__nh(); const tb=n.S.tube; n.P.place(0, tb.x + 3, tb.z, Math.PI/2); n.P.pitch = 0.15;})()`); await wait(4000); await shot('side');
};
