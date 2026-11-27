const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path'); const root = path.join(__dirname, '..');
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); fs.readFile(path.join(root, u === '/' ? 'index.html' : u), (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.end(d); }); }).listen(8098);
(async () => { const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 480, height: 270 } });
  p.on('console', (m) => { if (m.type() === 'error') console.log(m.text().slice(0, 1500)); });
  await p.goto('http://localhost:8098/'); await p.waitForFunction(() => document.getElementById('load').style.display === 'none', null, { timeout: 240000 }); await p.waitForTimeout(2000); await b.close(); srv.close(); })();
