module.exports = async ({ p, ev, shot, wait }) => {
  await wait(1500); await ev(`document.getElementById('btnNew').click()`); await wait(2500); await shot('story');
  await ev(`document.getElementById('storySkip').click()`);
  await p.waitForFunction(() => document.getElementById('gName').textContent && document.getElementById('gLoad').hidden, null, { timeout: 240000 }); await wait(3000); await shot('garage1');
  await ev(`document.getElementById('gNext').click()`); await p.waitForFunction(() => document.getElementById('gLoad').hidden, null, { timeout: 240000 }); await wait(3000); await shot('garage2');
  await ev(`document.getElementById('gPick').click()`);
  await p.waitForFunction(() => document.getElementById('objective').textContent, null, { timeout: 400000 }); await wait(4000); await shot('house1');
  const P = (x, z, yaw, pitch = 0) => ev(`(()=>{const P=__nh().P;P.x=${x};P.z=${z};P.yaw=${yaw};P.pitch=${pitch};})()`);
  await P(-1.4, 1.5, Math.PI, -0.3); await wait(2500); await shot('laptop');
  await p.keyboard.press('KeyE'); await wait(1500); await shot('news'); await ev(`document.getElementById('pclose').click()`);
  await P(-3, 0.5, 0, -0.1); await wait(2500); await shot('living');
  await P(0.2, 3.6, Math.PI, -0.4); await wait(2000); await p.keyboard.press('KeyE'); await wait(800);
  await P(1.75, 4.0, Math.PI); await wait(2500); await shot('door');
  await P(1.75, 6.5, Math.PI); await wait(2500); await P(0.5, 9.5, Math.PI, -0.05); await wait(3000); await shot('outside');
  await P(0.4, 12.5, Math.PI); await wait(1500); await p.keyboard.press('KeyE');
  await wait(9000); await shot('drive1'); await wait(8000); await shot('drive2'); await wait(9000); await shot('drive3'); await wait(5000); await shot('drive4');
  await p.waitForFunction(() => !document.getElementById('hud').hidden && window.__nh().game, null, { timeout: 400000 }); await wait(3000); await shot('wake');
};
