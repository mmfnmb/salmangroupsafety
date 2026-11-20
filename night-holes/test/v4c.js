module.exports = async ({ p, ev, shot, wait }) => {
  await wait(1500); await ev(`document.getElementById('btnSolo').click()`); await p.waitForFunction(() => !document.getElementById('hud').hidden, null, { timeout: 300000 }); await wait(2000);
  await ev(`(()=>{const n=__nh(); const tb=n.S.tube; n.P.place(0, tb.x, tb.z + 3.4, 0); n.P.pitch = 0.12; n.P.lightOn = true;})()`); await wait(4000); await shot('sleep');
  await ev(`__nh().game.tubeAt = __nh().game.t + 45`); await wait(6000); await shot('wake');
  await ev(`__nh().game.tubeAt = __nh().game.t + 20`); await wait(6000); await shot('press');
  await ev(`__nh().game.tubeAt = __nh().game.t + 4`); await wait(4000); await shot('rage');
  await wait(9000); await shot('broken'); await wait(6000); await shot('out');
};
