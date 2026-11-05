// Renders film/film.html to numbered JPEG frames. Usage: node film/render.cjs <outDir> [fromFrame] [toFrame] [step]
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = process.argv[2] || 'frames', from = +(process.argv[3] || 0), step = +(process.argv[5] || 1);
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, res) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; return res.end(); } res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream'); res.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  p.on('pageerror', (e) => console.log('ERR', e.message)); p.on('console', (m) => { if (m.type() === 'error') console.log(m.text().slice(0, 200)); });
  await p.goto(`http://localhost:${srv.address().port}/film/ep.html?ep=${process.env.EP || '1'}`); await p.waitForFunction('window.ready', null, { timeout: 300000 });
  const total = Math.round(await p.evaluate(() => window.F.total) * 24), to = +(process.argv[4] || total);
  console.log('frames', total);
  for (let n = 0; n < to; n++) {
    const fn = path.join(out, String(n).padStart(5, '0') + '.jpg');
    const want = n >= from && (n - from) % step === 0 && !fs.existsSync(fn); // resume: skip frames already on disk
    const url = await p.evaluate(([n, w]) => window.F.frame(n, w), [n, want]);
    if (want) fs.writeFileSync(fn, Buffer.from(url.split(',')[1], 'base64'));
    if (n % 60 === 0) console.log('frame', n, new Date().toISOString().slice(11, 19));
  }
  await b.close(); srv.close();
});
