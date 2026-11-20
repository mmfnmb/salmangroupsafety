module.exports = async ({ p, ev, shot, wait }) => {
  await wait(1500); await ev(`document.getElementById('btnSolo').click()`); await p.waitForFunction(() => !document.getElementById('hud').hidden, null, { timeout: 300000 }); await wait(4000);
  await ev(`(()=>{const n=__nh(); const [a,b]=n.cellCenter(14,3); n.P.place(0,a,b,1.57); n.P.pitch=0;})()`); await wait(2000);
  const fps = await ev(`new Promise(ok=>{let n=0;const t0=performance.now();const f=()=>{n++; if(performance.now()-t0<8000) requestAnimationFrame(f); else ok((n/8).toFixed(2));}; requestAnimationFrame(f);})`); console.log('FPS', fps);
  // doors: open the nearest door from in front of it, and make sure a scare cannot shut it
  const r = await ev(`(()=>{const n=__nh(); const d=n.W.doors.find(q=>q.f===0&&!q.lock&&q.obj); const i=n.W.inter.find(q=>q.kind==='door'&&q.door===d); n.P.place(0,i.x,i.z,Math.atan2(-(d.center[0]-i.x),-(d.center[1]-i.z))); d.target=0; d.open=0; return d.id;})()`);
  await wait(500); await ev(`__nh().useNearest()`); await wait(3000);
  console.log('door', await ev(`(()=>{const n=__nh(); const d=n.W.doors.find(q=>q.id==='${r}'); const near=n.nearest(); return JSON.stringify({target:d.target, open:d.open.toFixed(2), nearestIsThisDoor: !!near && near.door===d})})()`));
};
