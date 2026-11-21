// Languages. English is written in the code; other languages are line-aligned lists of the same strings
// (src/lang/<code>.txt, one translation per line, in the order of src/lang/keys.txt), inlined by build.mjs.
export const LANGS = [
  ['en', 'English'], ['ar', 'العربية'], ['es', 'Español'], ['fr', 'Français'], ['pt', 'Português'], ['de', 'Deutsch'], ['it', 'Italiano'],
  ['tr', 'Türkçe'], ['ru', 'Русский'], ['id', 'Bahasa Indonesia'], ['ja', '日本語'], ['ko', '한국어'], ['zh', '中文'], ['hi', 'हिन्दी'],
];
const PACK = globalThis.__BD_LANG || {}, KEYS = PACK.keys || '', RAW = PACK.langs || {};
const lines = (t) => t.replace(/\r/g, '').split('\n');

function pickLang() {
  let saved = null; try { saved = JSON.parse(localStorage.getItem('boltdash.lang')); } catch { /* storage blocked */ }
  if (saved && (saved === 'en' || RAW[saved])) return saved;
  for (const l of navigator.languages || [navigator.language || 'en']) { const c = String(l).slice(0, 2).toLowerCase(); if (c === 'en' || RAW[c]) return c; }
  return 'en';
}
export const LANG = pickLang();
export const RTL = LANG === 'ar';
const MAP = new Map();
if (LANG !== 'en') { const k = lines(KEYS), v = lines(RAW[LANG]); k.forEach((key, i) => { if (key && v[i]) MAP.set(key, v[i]); }); }

// t('Round {n} of {m}', { n: 1, m: 4 })
export function t(s, vars) {
  let out = MAP.get(s) ?? s;
  if (vars) for (const k in vars) out = out.split('{' + k + '}').join(vars[k]);
  return out;
}
export function setLang(code) { try { localStorage.setItem('boltdash.lang', JSON.stringify(code)); } catch { /* storage blocked */ } location.reload(); }

// translate the static page: text nodes plus aria-label / placeholder / title attributes
export function translateDom(root = document.body) {
  document.documentElement.lang = LANG; document.documentElement.dir = RTL ? 'rtl' : 'ltr';
  if (LANG === 'en') return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) { const s = n.nodeValue.trim(); if (s && MAP.has(s)) n.nodeValue = n.nodeValue.replace(s, MAP.get(s)); }
  for (const el of root.querySelectorAll('[aria-label],[placeholder],[title]')) for (const a of ['aria-label', 'placeholder', 'title']) { const v = el.getAttribute(a); if (v && MAP.has(v)) el.setAttribute(a, MAP.get(v)); }
}
