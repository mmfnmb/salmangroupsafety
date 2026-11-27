module.exports = async ({ p, ev, shot, wait }) => {
  await wait(1500); await p.mouse.click(400, 300); await ev(`localStorage.removeItem('nh_tut'); localStorage.removeItem('nh_save'); document.getElementById('btnSolo').click()`);
  await p.waitForFunction(() => !document.getElementById('hud').hidden, null, { timeout: 300000 }); await wait(4000);
  console.log('tutor', await ev(`document.getElementById('tutor').textContent + ' | obj: ' + document.getElementById('objective').textContent`)); await shot('tut');
  console.log('sounds', await ev(`new Promise(ok=>setTimeout(()=>ok('ok'),100))`));
  await ev(`(()=>{const n=__nh(); n.S.inv.green=1; const i=n.W.inter.find(q=>q.kind==='save'&&q.f===0); n.P.place(0,i.x,i.z,n.P.yaw); n.useStation('save', i); n.S.inv.key=1})()`); await wait(1500);
  console.log('saved', await ev(`!!localStorage.getItem('nh_save') + ' obj: ' + document.getElementById('objective').textContent`));
  await ev(`__nh().localCaught(__nh().monsters[1])`); await p.waitForFunction(() => !document.getElementById('dead').hidden, null, { timeout: 60000 }); await wait(500); console.log('load btn hidden?', await ev(`document.getElementById('btnLoad').hidden`));
  await ev(`document.getElementById('btnLoad').click()`); await p.waitForFunction(() => !document.getElementById('hud').hidden, null, { timeout: 300000 }); await wait(2000);
  console.log('after load', await ev(`JSON.stringify({green: __nh().S.inv.green, key: __nh().S.inv.key||0, f: __nh().P.f, tut: document.getElementById('tutor').hidden})`)); await shot('loaded');
};
