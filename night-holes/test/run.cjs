// Local test: serves the game folder, wraps index.html like the artifact host, runs a script of steps.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'); const steps = require(path.resolve(process.argv[2]));
const srv = http.createServer((q, s) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') { s.setHeader('Content-Type', 'text/html'); return s.end('<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>' + fs.readFileSync(ROOT + '/index.html', 'utf8') + '</body></html>'); }
  fs.readFile(path.join(ROOT, u), (e, d) => { if (e) { s.statusCode = 404; return s.end(); } s.setHeader('Content-Type', u.endsWith('.js') ? 'text/javascript' : 'application/octet-stream'); s.end(d); }); }).listen(0, async () => {
  const mobile = process.argv[3] === 'mobile';
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext(mobile ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : { viewport: { width: 960, height: 540 } });
  if (process.env.Q !== 'high') await ctx.addInitScript(() => { try { localStorage.setItem('nh_q', 'low'); } catch (e) {} });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => { errs.push(e.message); console.log('PAGEERR', e.message); }); p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('C', m.type(), m.text().slice(0, 160)); });
  await p.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.goto('http://localhost:' + srv.address().port + '/');
  const ev = (code) => p.evaluate(code);
  let n = 0; const shot = async (name) => p.screenshot({ path: path.join(__dirname, (++n) + '_' + name + '.png'), timeout: 150000 });
  try { await steps({ p, ev, shot, wait: (ms) => p.waitForTimeout(ms) }); } catch (e) { console.log('STEP FAIL', e.message); await shot('fail'); }
  console.log('errors:', errs.length); await b.close(); srv.close(); });
