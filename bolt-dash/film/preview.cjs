// Quick look at an episode: renders the given seconds into a contact sheet.
// Usage: EP=1 node film/preview.cjs <out.jpg> <sec> [sec...]   (also writes <out>-subs.json)
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const root = path.join(__dirname, '..'), out = process.argv[2], secs = process.argv.slice(3).map(Number).sort((a, b) => a - b);
const types = { '.js': 'text/javascript', '.html': 'text/html', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, res) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; return res.end(); } res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream'); res.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  p.on('pageerror', (e) => console.log('ERR', e.message)); p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(m.text().slice(0, 300)); });
  await p.goto(`http://localhost:${srv.address().port}/film/ep.html?ep=${process.env.EP || '1'}`); await p.waitForFunction('window.ready || document.body.textContent.startsWith("ERR")', null, { timeout: 300000 });
  const err = await p.evaluate(() => document.body.textContent.startsWith('ERR') ? document.body.textContent : null); if (err) { console.log(err); process.exit(1); }
  console.log('total', await p.evaluate(() => window.F.total));
  const tmp = fs.mkdtempSync('/tmp/pv'); const want = new Set(secs.map((s) => Math.round(s * 24))); const last = Math.max(...want); const files = [];
  for (let n = 0; n <= last; n++) { const url = await p.evaluate(([n, w]) => window.F.frame(n, w), [n, want.has(n)]); if (want.has(n)) { const f = `${tmp}/${String(n).padStart(6, '0')}.jpg`; fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64')); files.push(f); } }
  fs.writeFileSync(out.replace(/\.jpg$/, '') + '-subs.json', JSON.stringify(await p.evaluate(() => window.F.subs()), null, 1));
  await b.close(); srv.close();
  const cols = Math.min(4, files.length), rows = Math.ceil(files.length / cols);
  const ins = files.map((f) => `-i ${f}`).join(' '), pad = cols * rows - files.length;
  let fc = files.map((_, i) => `[${i}]scale=480:-1[v${i}]`).join(';');
  for (let i = 0; i < pad; i++) fc += `;color=black:s=480x270:d=1[p${i}]`;
  const all = [...files.map((_, i) => `[v${i}]`), ...Array.from({ length: pad }, (_, i) => `[p${i}]`)];
  const rowsS = []; for (let r = 0; r < rows; r++) { const seg = all.slice(r * cols, r * cols + cols).join(''); fc += `;${seg}${cols > 1 ? `hstack=${cols}` : 'null'}[r${r}]`; rowsS.push(`[r${r}]`); }
  fc += `;${rowsS.join('')}${rows > 1 ? `vstack=${rows}` : 'null'}`;
  execSync(`ffmpeg -v error -y ${ins} -filter_complex "${fc}" -frames:v 1 ${out}`);
  console.log('wrote', out);
});
