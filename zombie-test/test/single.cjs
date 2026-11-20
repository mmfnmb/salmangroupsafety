const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 640, height: 360 } });
  p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto('file://' + path.join(__dirname, '..', 'street-single.html')); await p.waitForFunction(() => document.getElementById('load').style.display === 'none', null, { timeout: 240000 });
  await p.waitForTimeout(3000); await p.screenshot({ path: path.join(__dirname, '..', 'shots/single.png'), timeout: 200000 }); console.log('ok', await p.textContent('#fps')); await b.close(); })();
