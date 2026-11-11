// Builds dist/bolt-dash.html: one self-contained file (code + libraries + models inlined).
// Usage: npm install && npm run build
import { build } from 'esbuild';
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';

const res = await build({
  entryPoints: ['src/main.js'], bundle: true, minify: process.env.MINIFY !== '0', format: 'iife', write: false, target: 'es2020',
  alias: { 'three/addons': 'three/examples/jsm' },
  nodePaths: process.env.NODE_PATH ? [process.env.NODE_PATH] : [],
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const models = {};
for (const [dir, pre] of [['models', ''], ['models/acc', 'acc/'], ['models/k', 'k/'], ['models/z', 'z/']]) {
  for (const f of readdirSync(dir)) if (f.endsWith('.glb')) models[pre + f.slice(0, -4)] = readFileSync(`${dir}/${f}`).toString('base64');
}

// translations: every src/lang/<code>.txt must have one line per line of keys.txt
const keys = readFileSync('src/lang/keys.txt', 'utf8').replace(/\r/g, ''), nk = keys.split('\n').length, langs = {};
for (const f of readdirSync('src/lang')) if (f.endsWith('.txt') && f !== 'keys.txt') {
  const t = readFileSync('src/lang/' + f, 'utf8').replace(/\r/g, ''), n = t.split('\n').length;
  if (n !== nk) { console.error(`src/lang/${f}: ${n} lines but keys.txt has ${nk}`); process.exit(1); }
  langs[f.slice(0, -4)] = t;
}

let html = readFileSync('index.html', 'utf8');
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>\s*/, '');
html = html.replace(/<script type="module" src="\.\/src\/main\.js"><\/script>/,
  () => `<script>window.__BD_MODELS=${JSON.stringify(models)};window.__BD_LANG=${JSON.stringify({ keys, langs }).replace(/<\//g, '<\\/')};</script>\n<script>${js}</script>`);
// the loading screen: a squad of characters waving flags (half Arab countries, half others, picked at random each time)
{
  const ld = 'assets/loading', chars = readdirSync(ld).filter((f) => f.endsWith('.webp')).sort().map((f) => 'data:image/webp;base64,' + readFileSync(`${ld}/${f}`).toString('base64'));
  const flags = {}; for (const f of readdirSync(`${ld}/flags`)) flags[f.slice(0, -4)] = 'data:image/svg+xml;base64,' + readFileSync(`${ld}/flags/${f}`).toString('base64');
  const art = `<script>(()=>{const C=${JSON.stringify(chars)},F=${JSON.stringify(flags)};
const AR=['eg','sa','ae','ma','dz','iq','jo','tn','ps','kw','qa','lb','om','ly'],FO=['br','jp','fr','de','it','tr','gb','kr','ar','ng','ca','pt','nl','in','se'];
const pick=(a,n)=>{a=a.slice();const o=[];while(o.length<n&&a.length)o.push(a.splice(Math.random()*a.length|0,1)[0]);return o};
const fl=[...pick(AR,7),...pick(FO,7)].sort(()=>Math.random()-.5);
// one in front, then two behind, two behind them and two more at the back, each row a little smaller and wider
const rows=[[0,0,36,0],[-1,1,29,15],[1,1,29,15],[-1,2,24,28],[1,2,24,28],[-1,3,20,39],[1,3,20,39]];
const sq=document.getElementById('squad');if(!sq)return;let k=0;
rows.slice().reverse().forEach(([side,row,w,up],i)=>{const d=document.createElement('div');d.className='ch';d.style.width=w+'%';d.style.left=(50+side*(10+row*5)-w/2)+'%';d.style.bottom=up+'%';d.style.zIndex=10-row;d.style.animationDelay=(-i*0.17)+'s';d.style.filter='brightness('+(1-row*0.07)+')';
const im=document.createElement('img');im.src=C[(row*2+(side>0?1:0))%C.length];im.alt='';d.appendChild(im);
for(const [x,tilt] of [[26,-14],[74,14]]){const p=document.createElement('div');p.className='pole';p.style.left=(x-1.5)+'%';p.style.top='-5%';p.style.transform='rotate('+tilt+'deg)';const f=document.createElement('div');f.className='flag';f.style.backgroundImage='url('+F[fl[k++%fl.length]]+')';if(tilt<0){f.style.right='100%';f.style.transformOrigin='100% 50%'}else f.style.left='100%';f.style.animationDelay=(-k*0.23)+'s';p.appendChild(f);d.appendChild(p)}
sq.appendChild(d)})})();</script>`;
  html = html.replace('<!--LOADART-->', art);
  // small pictures of the characters, so the wardrobe shows them before their models have loaded
  const vx = {}; for (const f of readdirSync('assets/vfx')) if (f.endsWith('.webp')) vx[f.slice(0, -5)] = 'data:image/webp;base64,' + readFileSync('assets/vfx/' + f).toString('base64');
  html = html.replace('<script>window.__BD_MODELS=', `<script>window.__BD_VFX=${JSON.stringify(vx)};</script>\n<script>window.__BD_MODELS=`);
  const ct = {}; for (const f of readdirSync('assets/chars')) if (f.endsWith('.webp')) ct[f.slice(0, -5)] = 'data:image/webp;base64,' + readFileSync('assets/chars/' + f).toString('base64');
  html = html.replace('<script>window.__BD_MODELS=', `<script>window.__BD_CHARTHUMBS=${JSON.stringify(ct)};</script>\n<script>window.__BD_MODELS=`);
}
mkdirSync('dist', { recursive: true });
writeFileSync('dist/bolt-dash.html', html);
console.log('dist/bolt-dash.html', (html.length / 1e6).toFixed(2), 'MB');

// world packs (city models) are separate files next to the page; copy them for local testing
import { cpSync, existsSync } from 'node:fs';
if (existsSync('world')) cpSync('world', 'dist/world', { recursive: true });

// the two extra quality files for the open world (and games): built on their own, loaded only when a game starts
for (const f of ['gfx', 'life']) {
  await build({
    entryPoints: [`src/extras/${f}.js`], bundle: true, minify: true, format: 'iife', outfile: `dist/world/${f}.js`, target: 'es2020',
    alias: { 'three/addons': 'three/examples/jsm' },
    plugins: [{ name: 'shared-three', setup(b) { b.onResolve({ filter: /^three$/ }, () => ({ path: new URL('./src/extras/three-shim.js', import.meta.url).pathname })); } }],
  });
}
console.log('dist/world/gfx.js + life.js');
// the announcers' live voice (loaded only when the announcer talks)
await build({ entryPoints: ['src/extras/voice.js'], bundle: true, minify: true, format: 'iife', outfile: 'dist/world/voice/voice.js', target: 'es2020', external: ['fs', 'path', 'crypto', 'worker_threads', 'url', 'module'] });

