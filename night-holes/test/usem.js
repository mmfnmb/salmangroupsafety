module.exports = async ({ p, ev, shot, wait }) => {
  await wait(1500); await p.tap('#btnSolo'); await p.waitForFunction(() => !document.getElementById('hud').hidden, null, { timeout: 300000 }); await wait(8000);
  console.log('btns', await ev(`JSON.stringify((()=>{const b=document.getElementById('bUse').getBoundingClientRect(); const top=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2); return {mobileHidden:document.getElementById('mobileBtns').hidden, x:b.x|0,y:b.y|0,w:b.width|0,h:b.height|0, topEl: top && (top.id||top.className)}})())`));
  await ev(`(()=>{const n=__nh(); const it=n.items.find(q=>q.f===0&&!q.taken); n.P.place(0,it.x,it.z+1.0,0); n.P.pitch=-0.4;})()`); await wait(3000);
  console.log('label', await ev(`document.getElementById('bUse').textContent`));
  await p.tap('#bUse'); await wait(2000); console.log('item taken?', await ev(`__nh().items.filter(q=>q.taken).length`));
  await shot('mobile');
};
