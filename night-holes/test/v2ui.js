module.exports = async ({ p, ev, shot, wait }) => { await wait(1500);
  await ev(`(()=>{const s=document.getElementById('langSel'); s.value='fr'; s.dispatchEvent(new Event('change'));})()`); await wait(500); await shot('menu_fr');
  await ev(`(()=>{const s=document.getElementById('langSel'); s.value='ru'; s.dispatchEvent(new Event('change'));})()`); await wait(500); await shot('menu_ru');
  await ev(`(()=>{const s=document.getElementById('langSel'); s.value='en'; s.dispatchEvent(new Event('change'));})()`);
  await ev(`document.getElementById('btnSolo').click()`); await p.waitForFunction(() => !document.getElementById('hud').hidden, null, { timeout: 300000 }); await wait(3000);
  await ev(`(()=>{const n=__nh(); Object.assign(n.S.inv,{green:1,key:1,fuse_r:1,bottle:3,adrenaline:2,trap:1,lighter:1});})()`); await wait(1500); await shot('hud');
};
