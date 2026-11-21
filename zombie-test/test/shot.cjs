const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.end(d); }); }).listen(8099);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  p.on('console', (m) => console.log('console', m.type(), m.text().slice(0, 200))); p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto('http://localhost:8099/'); await p.waitForFunction(() => document.getElementById('load').style.display === 'none', null, { timeout: 240000 });
  await p.waitForTimeout(4000); await p.screenshot({ path: path.join(root, 'shots/game-1.png'), timeout: 200000 });
  await p.evaluate(() => __st.setYaw(Math.PI / 2 + 0.5, 0.05)); await p.keyboard.down('KeyW'); await p.waitForTimeout(5000); await p.keyboard.up('KeyW'); await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(root, 'shots/game-2.png'), timeout: 200000 });
  await p.evaluate(() => __st.setYaw(-Math.PI / 2 - 0.3, 0.2)); await p.waitForTimeout(2500); await p.screenshot({ path: path.join(root, 'shots/game-3.png'), timeout: 200000 });
  console.log(await p.textContent('#fps')); await b.close(); srv.close();
})();
