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
