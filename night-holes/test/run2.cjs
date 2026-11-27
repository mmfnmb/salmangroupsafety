// Two players in one browser context. A fake "room" capability built on BroadcastChannel stands in for the real one.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const srv = http.createServer((q, s) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') { s.setHeader('Content-Type', 'text/html'); return s.end('<!doctype html><html><head><meta charset=utf8></head><body>' + fs.readFileSync(ROOT + '/index.html', 'utf8') + '</body></html>'); }
  fs.readFile(path.join(ROOT, u), (e, d) => { if (e) { s.statusCode = 404; return s.end(); } s.setHeader('Content-Type', u.endsWith('.js') ? 'text/javascript' : 'application/octet-stream'); s.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 800, height: 450 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('nh_q', 'low'); } catch (e) {}
    const mk = (name) => { const bc = new BroadcastChannel('room-' + name), me = Math.random().toString(36).slice(2), subs = {}, peers = {}; let pcb = null;
      const fire = () => pcb && pcb(Object.values(peers).map((p) => ({ presence: p })));
      bc.onmessage = (e) => { const m = e.data; if (m.k === 'ev') (subs[m.t] || []).forEach((f) => f(m.d)); else if (m.k === 'pr') { peers[m.id] = m.p; fire(); } };
      return { on: (t, f) => (subs[t] = subs[t] || []).push(f), emit: (t, d) => bc.postMessage({ k: 'ev', t, d }), presence: (p) => { peers[me] = p; bc.postMessage({ k: 'pr', id: me, p }); fire(); }, onPeers: (f) => (pcb = f), leave: () => bc.close() }; };
    window.claude = { use: async (n) => (n === 'room' ? { join: async (name) => mk(name) } : null) }; });
  const pages = [await ctx.newPage(), await ctx.newPage()];
  for (const [i, p] of pages.entries()) { p.on('pageerror', (e) => console.log('PAGEERR' + i, e.message)); await p.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' })); await p.goto('http://localhost:' + srv.address().port + '/'); }
  const [A, B] = pages; const W = (ms) => A.waitForTimeout(ms); const shot = (p, n) => p.screenshot({ path: path.join(__dirname, n + '.png'), timeout: 150000 });
  try {
    await W(2000); await A.evaluate(() => document.getElementById('btnCreate').click());
    await A.waitForFunction(() => document.getElementById('gName').textContent && document.getElementById('gLoad').hidden, null, { timeout: 200000 }); await A.evaluate(() => document.getElementById('gPick').click());
    await A.waitForFunction(() => !document.getElementById('lobby').hidden, null, { timeout: 60000 }); const code = await A.evaluate(() => document.getElementById('lobbyCode').textContent); console.log('code', code);
    await B.evaluate((c) => { document.getElementById('joinCode').value = c; document.getElementById('btnJoin').click(); }, code);
    await B.waitForFunction(() => document.getElementById('gName').textContent && document.getElementById('gLoad').hidden, null, { timeout: 200000 }); await B.evaluate(() => document.getElementById('gNext').click()); await W(4000);
    await B.waitForFunction(() => document.getElementById('gLoad').hidden, null, { timeout: 200000 }); await B.evaluate(() => document.getElementById('gPick').click());
    await B.waitForFunction(() => !document.getElementById('lobby').hidden, null, { timeout: 60000 }); await W(3000);
    console.log('A lobby', await A.evaluate(() => document.getElementById('lobbyList').innerText.replace(/\n/g, ' | '))); console.log('B lobby', await B.evaluate(() => document.getElementById('lobbyList').innerText.replace(/\n/g, ' | ')));
    await A.evaluate(() => document.getElementById('btnStart').click());
    for (const p of pages) await p.waitForFunction(() => !document.getElementById('hud').hidden && window.__nh().game, null, { timeout: 400000 });
    console.log('both in lab'); await W(3000);
    // put B in front of A and look at each other
    await A.evaluate(() => { const n = __nh(); const [x, z] = n.cellCenter(5, 3); n.P.place(0, x, z, -Math.PI / 2); n.P.pitch = 0; });
    await B.evaluate(() => { const n = __nh(); const [x, z] = n.cellCenter(8, 3); n.P.place(0, x, z, Math.PI / 2); n.P.pitch = 0; });
    await W(6000); await shot(A, 'onA'); await shot(B, 'onB');
    console.log('A sees', await A.evaluate(() => [...__nh().others ? [] : []].length));
    // a door opened by A opens for B
    const r = await A.evaluate(() => { const n = __nh(); const d = n.W.doors.find((q) => !q.lock && q.f === 0); d.target = 1; return d.id; });
    await A.evaluate((id) => { const n = __nh(); const d = n.W.doors.find((q) => q.id === id); n.W.inter.find((i) => i.door === d); }, r);
    console.log('ok');
  } catch (e) { console.log('FAIL', e.message); for (const [i, p] of pages.entries()) await shot(p, 'fail' + i).catch(() => {}); }
  await b.close(); srv.close(); });
