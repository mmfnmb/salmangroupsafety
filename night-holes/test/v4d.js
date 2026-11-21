module.exports = async ({ p, ev, shot, wait }) => {
  await wait(1500); await ev(`document.getElementById('btnSolo').click()`); await p.waitForFunction(() => !document.getElementById('hud').hidden, null, { timeout: 300000 }); await wait(2000);
  await ev(`(()=>{const n=__nh(); const tb=n.S.tube; n.P.place(0, tb.x, tb.z + 4.2, 0); n.P.pitch = 0.05; n.game.tubeAt = n.game.t - 0.1;})()`); await wait(5000); await shot('broken');
  await wait(8000); await shot('emerge'); await wait(15000); await shot('stand');
  console.log(await ev(`(()=>{const g=__nh().monsters[0]; return JSON.stringify({inTube:g.inTube, emerging:g.emerging, t:g.emergeT})})()`));
};
