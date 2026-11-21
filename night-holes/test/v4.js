module.exports = async ({ p, ev, shot, wait }) => {
  await wait(1500); await shot('menu');
  await ev(`document.getElementById('btnLab').click()`); await wait(9000); await shot('mlab');
  await ev(`(()=>{const s=document.querySelector('#mlForm [data-k=horns]'); s.value='antlers'; s.dispatchEvent(new Event('change')); const e=document.querySelector('#mlForm [data-k=eyes]'); e.value='three'; e.dispatchEvent(new Event('change')); const a=document.querySelector('#mlForm [data-k=arms]'); a.value=1.6; a.dispatchEvent(new Event('input'));})()`); await wait(7000); await shot('mlab2');
  await ev(`document.getElementById('mlSave').click(); document.getElementById('mlBack').click()`); await wait(1000);
  await ev(`document.getElementById('btnSolo').click()`); await p.waitForFunction(() => !document.getElementById('hud').hidden, null, { timeout: 300000 }); await wait(2500);
  await p.keyboard.press('KeyV'); await wait(3000); await shot('nightvision'); await p.keyboard.press('KeyV');
  await ev(`(()=>{const n=__nh(); Object.assign(n.S.inv,{chem_r:2,chem_b:1,chem_y:1}); const i=n.W.inter.find(q=>q.kind==='mix'); n.P.place(0,i.x,i.z,n.P.yaw); n.useStation('mix', i);})()`); await wait(1500); await shot('mix');
  await ev(`document.getElementById('mixGo').click()`); await wait(800); await shot('mixed'); await ev(`document.getElementById('pclose').click()`);
  await ev(`(()=>{const n=__nh(); const i=n.W.inter.find(q=>q.kind==='grow'); n.P.place(0,i.x,i.z,n.P.yaw); n.useStation('grow', i);})()`); await wait(1500); await shot('grow');
  // close call: walk the matron next to us
  await ev(`(()=>{const n=__nh(); const m=n.monsters.find(q=>q.kind==='matron'); m.active=true; n.P.place(m.f, m.x+2.2, m.z, 1.57);})()`); await wait(16000);
  await ev(`document.getElementById('pclose') && document.getElementById('pclose').click()`);
  console.log('clips', await ev(`(async()=>{const r=await new Promise(ok=>{const q=indexedDB.open('nh-recordings',1);q.onsuccess=()=>ok(q.result)}); return await new Promise(ok=>{const g=r.transaction('clips').objectStore('clips').getAll(); g.onsuccess=()=>ok(g.result.map(c=>c.kind+':'+c.label+':'+c.frames.length).join(','))})})()`));
};
