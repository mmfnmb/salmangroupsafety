module.exports = async ({ p, ev, shot, wait }) => { await wait(1500); await ev(`window.__ts = 4`); ev(`__nh().testDrive()`);
  await wait(9000); await shot('hands'); for (let i = 0; i < 40; i++) { await wait(3000); const s = await ev(`document.getElementById('sub').textContent + ' | fade=' + document.getElementById('fade').className`); console.log(i, s); if (/brakes|Slow/.test(s) && !globalThis.b) { globalThis.b = 1; await shot('brakes'); } if (/fade=on/.test(s)) { await shot('black'); break; } }
  };
