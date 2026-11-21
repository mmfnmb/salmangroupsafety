// Renders ep*.html frame by frame (headless Chromium) and encodes an MP4 with ffmpeg.
// usage: node render.cjs ep1 [stills t1,t2,...]
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const [, , ep, stills] = process.argv; const FPS = 24;
const srv = http.createServer((q, s) => { const p = path.join(__dirname, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { s.statusCode = 404; return s.end(); } s.setHeader('Content-Type', p.endsWith('.html') ? 'text/html' : p.endsWith('.ttf') ? 'font/ttf' : 'application/octet-stream'); s.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 720, height: 1280 } }); pg.on('pageerror', (e) => console.log('ERR', e.message));
  await pg.goto(`http://localhost:${srv.address().port}/${ep}.html`); await pg.waitForFunction('window.ready');
  const grab = async (t) => { const u = await pg.evaluate((t) => { window.frame(t); return document.getElementById('c').toDataURL('image/jpeg', 0.92); }, t); return Buffer.from(u.split(',')[1], 'base64'); };
  if (stills) { for (const t of stills.split(',')) fs.writeFileSync(`still_${t}.jpg`, await grab(+t)); }
  else {
    const dur = await pg.evaluate('window.DUR'); const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-i', `${ep}.wav`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', `${ep}.mp4`], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < dur * FPS; i++) { const buf = await grab(i / FPS); if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r)); }
    ff.stdin.end(); await new Promise((r) => ff.on('close', r));
  }
  await b.close(); srv.close();
});
