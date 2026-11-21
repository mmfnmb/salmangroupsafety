module.exports = async ({ p, ev, shot, wait }) => {
  await wait(1500); await p.tap('#btnSolo'); await p.waitForFunction(() => !document.getElementById('hud').hidden, null, { timeout: 300000 }); await wait(8000);
  const pos = await ev(`(()=>{const n=__nh(); const d=n.W.doors.find(q=>q.f===0&&!q.lock&&q.obj); const i=n.W.inter.find(q=>q.kind==='door'&&q.door===d); const bx=i.x+(i.x-d.center[0])*1.2, bz=i.z+(i.z-d.center[1])*1.2; n.P.place(0,bx,bz,Math.atan2(-(d.center[0]-bx),-(d.center[1]-bz))+0.35); n.P.pitch=0; d.target=0; d.open=0; window.__d=d; return 1})()`);
  await wait(3000); const xy = await ev(`(()=>{const n=__nh(); const v=new (n.camera.position.constructor)(window.__d.center[0], 1.3, window.__d.center[1]).project(n.camera); return [(v.x+1)/2*innerWidth, (1-v.y)/2*innerHeight]})()`);
  console.log('tap at', xy.map(Math.round)); await p.touchscreen.tap(xy[0], xy[1]); await wait(3000);
  console.log('door after tap', await ev(`window.__d.target+' '+window.__d.open.toFixed(2)`)); await shot('tap');
};
