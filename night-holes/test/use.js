module.exports = async ({ p, ev, shot, wait }) => {
  await wait(1500); await p.mouse.click(480, 300); await ev(`document.getElementById('btnSolo').click()`); await p.waitForFunction(() => !document.getElementById('hud').hidden, null, { timeout: 300000 }); await wait(8000);
  const st = () => ev(`(()=>{const n=__nh(); const i=n.nearest(); return JSON.stringify({locked:n.P.locked, dead:n.P.dead, panel:!document.getElementById('panel').hidden, end:n.game.end, near:i&&i.kind, prompt:document.getElementById('prompt').textContent, promptHidden:document.getElementById('prompt').hidden})})()`);
  // stand in front of an item and press E like a player
  console.log('item before', await ev(`(()=>{const n=__nh(); const it=n.items.find(q=>q.f===0&&!q.taken); n.P.place(0,it.x,it.z+1.0,0); n.P.pitch=-0.4; return it.type})()`)); await wait(1500); console.log(await st());
  await p.keyboard.press('KeyE'); await wait(1500); console.log('item taken?', await ev(`__nh().items.filter(q=>q.taken).length`));
  // a door
  await ev(`(()=>{const n=__nh(); const d=n.W.doors.find(q=>q.f===0&&!q.lock&&q.obj); const i=n.W.inter.find(q=>q.kind==='door'&&q.door===d); n.P.place(0,i.x,i.z,Math.atan2(-(d.center[0]-i.x),-(d.center[1]-i.z))); n.P.pitch=0; d.target=0; d.open=0; window.__d=d;})()`); await wait(1500); console.log(await st());
  await p.keyboard.press('KeyE'); await wait(2500); console.log('door target', await ev(`window.__d.target+' '+window.__d.open.toFixed(2)`));
  await shot('use');
};
