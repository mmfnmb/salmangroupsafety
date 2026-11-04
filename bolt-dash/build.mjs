// Builds dist/bolt-dash.html: one self-contained file (code + libraries + models inlined).
// Usage: npm install && npm run build
import { build } from 'esbuild';
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';

const res = await build({
  entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020',
  alias: { 'three/addons': 'three/examples/jsm' },
  nodePaths: process.env.NODE_PATH ? [process.env.NODE_PATH] : [],
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const models = {};
for (const [dir, pre] of [['models', ''], ['models/acc', 'acc/'], ['models/k', 'k/']]) {
  for (const f of readdirSync(dir)) if (f.endsWith('.glb')) models[pre + f.slice(0, -4)] = readFileSync(`${dir}/${f}`).toString('base64');
}

let html = readFileSync('index.html', 'utf8');
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>\s*/, '');
html = html.replace(/<script type="module" src="\.\/src\/main\.js"><\/script>/,
  () => `<script>window.__BD_MODELS=${JSON.stringify(models)};</script>\n<script>${js}</script>`);
mkdirSync('dist', { recursive: true });
writeFileSync('dist/bolt-dash.html', html);
console.log('dist/bolt-dash.html', (html.length / 1e6).toFixed(2), 'MB');
