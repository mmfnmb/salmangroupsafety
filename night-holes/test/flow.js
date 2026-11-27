// Plays the whole objective chain through the game's own actions (no direct flag setting), checking each gate.
module.exports = async ({ p, ev, shot, wait }) => {
  await wait(1200); await ev("document.getElementById('btnSolo').click()");
  await p.waitForFunction("window.__nh && window.__nh().game && !document.getElementById('hud').hidden", null, { timeout: 120000 });
  const G = (js) => ev(`(()=>{const g=window.__nh();${js}})()`);
  // keep monsters away from the test runner
  await G("g.monsters.forEach(m=>{m.active=false});g.game.tubeAt=1e9;");
  const goTo = async (kind, match) => G(`const i=g.W.inter.find(q=>q.kind==='${kind}'${match ? '&&' + match : ''}&&!q.taken);if(!i)return 'none';g.P.place(i.f,i.x+0.6,i.z+0.6,Math.atan2(-(i.x-(i.x+0.6)),-(i.z-(i.z+0.6))));return i.f`);
  const use = async () => { await G("g.useNearest()"); await wait(200); };
  const panel = () => ev("!document.getElementById('panel').hidden");
  // 1) monitors show the code, safe gives green card
  await goTo('station'); let code = await G("return g.S.safeCode");
  await goTo('safe'); await wait(300); await use(); console.log('safe panel', await panel());
  for (const d of code) await ev(`[...document.querySelectorAll('[data-k]')].find(b=>b.dataset.k==='${d}').click()`); await ev("[...document.querySelectorAll('[data-k]')].find(b=>b.dataset.k==='✓').click()"); await wait(800);
  console.log('green', await G("return g.S.inv.green"));
  // 2) green door
  const gd = await G("const d=g.W.doors.find(q=>q.lock==='green');g.P.place(0,d.center[0]-d.dir[0]*0.8,d.center[1]-d.dir[1]*0.8,Math.atan2(-d.dir[0],-d.dir[1]));return d.center"); await wait(200); await use(); await wait(800);
  console.log('green door unlocked', await G("return !!g.W.doors.find(q=>q.lock==='green').unlocked"));
  // 3) scale
  await goTo('scale'); await use(); const sw = await G("return [g.S.scaleW,g.S.scaleTarget]");
  // find subset
  const [w, tgt] = sw; let pick = null; for (let m = 1; m < 32; m++) { let s = 0; for (let i = 0; i < 5; i++) if (m & (1 << i)) s += w[i]; if (s === tgt) { pick = m; break; } }
  for (let i = 0; i < 5; i++) if (pick & (1 << i)) await ev(`document.querySelectorAll('.bottle')[${i}].click()`); await ev("document.getElementById('weigh').click()"); await wait(800);
  console.log('scale solved', await G("return !!g.S.solved.scale"), 'note0', await G("return g.S.notes[0]"));
  // 4) elevator to B1 (walk-in check of panel)
  await goTo('elevator', "q.f===0"); await use(); console.log('elev panel', await panel()); await ev("document.querySelector('[data-to=\"1\"]').click()"); await wait(2800);
  console.log('floor now', await G("return g.P.f")); await shot('b1');
  // 5) poster + valves
  await goTo('poster'); await use(); await wait(300); await ev("document.getElementById('pclose').click()");
  await goTo('valves'); await use(); const chart = await G("return g.S.chart"); for (let i = 0; i < 4; i++) for (let k = 0; k < chart[i]; k++) await ev(`document.querySelectorAll('.valve')[${i}].click()`); await ev("document.getElementById('vok').click()"); await wait(800);
  console.log('valves door', await G("return !!g.W.doors.find(q=>q.lock==='valves').unlocked"));
  // 6) collect fuses + screwdriver wherever they spawned (through takeItem via useNearest)
  for (const t of ['fuse_r', 'fuse_y', 'fuse_b', 'screwdriver']) { const r = await G(`const i=g.items.find(q=>q.type==='${t}');g.P.place(i.f,i.x+0.5,i.z,Math.PI/2);return i.f`); await wait(150); await use(); }
  console.log('inv', await G("return JSON.stringify(g.S.inv)"));
  await goTo('generator'); await use(); const order = await G("return g.S.slotOrder");
  for (const c of ['r', 'y', 'b']) { await ev(`document.querySelector('.fuse.f${c}') && document.querySelector('.fuse.f${c}').click()`); await ev(`document.querySelector('.slot.s${c}').click()`); } await wait(1000);
  console.log('power', await G("return g.S.power"));
  // 7) tape, notes, B2
  await goTo('tape'); await use(); await ev("document.getElementById('tplay').click()"); await wait(300); await ev("document.getElementById('pclose').click()");
  for (const n of [2, 3]) { await G(`const i=g.items.find(q=>q.type==='note'&&q.extra===${n});g.P.place(i.f,i.x+0.5,i.z,Math.PI/2)`); await wait(150); await use(); }
  await goTo('elevator', "q.f===1"); await use(); await ev("document.querySelector('[data-to=\"2\"]').click()"); await wait(2800); console.log('floor now', await G("return g.P.f")); await shot('b2');
  await G("const i=g.items.find(q=>q.type==='red');g.P.place(i.f,i.x+0.5,i.z,Math.PI/2)"); await wait(150); await use();
  await goTo('wires'); await use(); const R = await G("return g.S.wireR"); for (let c = 0; c < 4; c++) { await ev(`document.querySelector('.wn[data-s=L][data-i=\"${c}\"]').click()`); await ev(`document.querySelector('.wn[data-s=R][data-i=\"${c}\"]').click()`); } await wait(1000);
  console.log('key', await G("return g.S.inv.key"), 'red', await G("return g.S.inv.red"), 'notes', await G("return JSON.stringify(g.S.notes)"));
  await goTo('exit'); await use(); code = await G("return g.S.exitCode"); for (const d of code) await ev(`[...document.querySelectorAll('[data-k]')].find(b=>b.dataset.k==='${d}').click()`); await ev("[...document.querySelectorAll('[data-k]')].find(b=>b.dataset.k==='✓').click()"); await wait(1500);
  console.log('exit open', await G("return !!g.W.doors.find(q=>q.lock==='exit').unlocked"));
  // walk through the exit door with keys
  await G("const d=g.W.doors.find(q=>q.lock==='exit');g.P.place(2,d.center[0]-d.dir[0]*1.2,d.center[1]-d.dir[1]*1.2,Math.atan2(-d.dir[0],-d.dir[1]))"); await wait(300);
  await ev("dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW'}))"); await wait(2500); await ev("dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW'}))");
  console.log('escaped', await G("return g.game.escaped"));
  await wait(6000); await shot('ending'); await wait(9000); await shot('results');
};
