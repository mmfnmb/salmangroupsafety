// Steps through a whole episode without drawing and writes its length, music cues and subtitles.
// Usage: EP=1 node film/dump-ep.cjs <outPrefix>   -> <outPrefix>.meta.json, <outPrefix>.subs.json
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), pre = process.argv[2];
const types = { '.js': 'text/javascript', '.html': 'text/html', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, res) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; return res.end(); } res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream'); res.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } }); p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto(`http://localhost:${srv.address().port}/film/ep.html?ep=${process.env.EP || '1'}`); await p.waitForFunction('window.ready', null, { timeout: 300000 });
  const total = await p.evaluate(() => window.F.total), frames = Math.round(total * 24);
  for (let n = 0; n < frames; n += 240) await p.evaluate(([a, z]) => { for (let i = a; i < z; i++) window.F.frame(i, false); }, [n, Math.min(frames, n + 240)]);
  const subs = await p.evaluate(() => window.F.subs()), cues = await p.evaluate(() => window.F.cues());
  for (const s of subs) if (s.end == null) s.end = total;
  fs.writeFileSync(pre + '.meta.json', JSON.stringify({ total, frames, cues })); fs.writeFileSync(pre + '.subs.json', JSON.stringify(subs, null, 1));
  console.log('total', total, 'frames', frames, 'subs', subs.length); await b.close(); srv.close();
});
