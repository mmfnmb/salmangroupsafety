// The announcers' live voice: a neural text-to-speech model (Piper) running inside the page, so the commentators
// can say any line, with the players' names, on any device. Built on its own and loaded only when the announcer is on.
// The model, the phonemizer and the ONNX runtime's WebAssembly come from world/voice/ next to the page.
import * as ort from 'onnxruntime-web/wasm-core';
import { createPiperPhonemize } from './piper_phonemize.js';

// inside a worker the files sit next to this script; on the page they are under world/voice/
const IN_WORKER = typeof document === 'undefined';
const BASE = IN_WORKER ? './' : './world/voice/';
const VOICES = {
  ar: { model: 'ar-kareem', espeak: 'ar', speakers: [0, 0], rate: 22050 },
  en: { model: 'en-libritts', espeak: 'en-us', speakers: [3, 9], rate: 22050 },
};
let session = null, cfg = null, phData = null, phWasm = null, ready = null;
// a big file shipped as base64 text, possibly in several parts
async function b64(name) {
  const parts = []; for (let i = 0; ; i++) { const r = await fetch(`${BASE}${name}.${i}.txt`); if (!r.ok) { if (i === 0) throw new Error('missing ' + name); break; } parts.push((await r.text()).trim()); }
  const bufs = await Promise.all(parts.map(async (p) => { try { return await (await fetch('data:application/octet-stream;base64,' + p)).arrayBuffer(); } catch { const s = atob(p), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; } }));
  const n = bufs.reduce((a, b) => a + b.byteLength, 0), out = new Uint8Array(n); let o = 0; for (const b of bufs) { out.set(new Uint8Array(b), o); o += b.byteLength; } return out.buffer;
}
export function init(lang) {
  if (ready) return ready; const v = VOICES[lang]; if (!v) return Promise.reject(new Error('no voice'));
  ready = (async () => {
    cfg = v; ort.env.wasm.numThreads = 1; ort.env.wasm.proxy = false;
    const wasm = await b64('ort-wasm-simd'); ort.env.wasm.wasmPaths = { 'ort-wasm-simd.wasm': URL.createObjectURL(new Blob([wasm], { type: 'application/wasm' })) };
    [phData, phWasm] = await Promise.all([b64('phonemize-data'), b64('phonemize-wasm')]);
    session = await ort.InferenceSession.create(new Uint8Array(await b64(v.model)), { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
  })().catch((e) => { ready = null; throw e; });
  return ready;
}
function phonemes(text) {
  return new Promise((res, rej) => {
    let done = false;
    createPiperPhonemize({ print: (d) => { if (!done) { done = true; res(JSON.parse(d).phoneme_ids); } }, printErr: () => {}, wasmBinary: phWasm, getPreloadedPackage: () => phData, locateFile: (u) => u })
      .then((m) => m.callMain(['-l', cfg.espeak, '--input', JSON.stringify([{ text }]), '--espeak_data', '/espeak-ng-data'])).catch(rej);
  });
}
// one line -> mono samples. who 0 = play-by-play (faster), 1 = colour commentator
export async function synth(text, who = 0) {
  await ready; const ids = await phonemes(text.trim());
  const feeds = { input: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]), input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)])), scales: new ort.Tensor('float32', Float32Array.from([0.7, who ? 0.95 : 0.86, 0.85])) };
  if (cfg.model === 'en-libritts') feeds.sid = new ort.Tensor('int64', BigInt64Array.from([BigInt(cfg.speakers[who])]));
  const out = await session.run(feeds); return { pcm: out.output.data, rate: cfg.rate };
}
globalThis.__BD_VOICE = { init, synth };
// run as a worker so the game never stutters while a line is being made
if (IN_WORKER) self.onmessage = async ({ data: m }) => {
  try {
    if (m.cmd === 'init') { await init(m.lang); self.postMessage({ id: m.id, ok: true }); }
    else if (m.cmd === 'synth') { const { pcm, rate } = await synth(m.text, m.who); const f = Float32Array.from(pcm); self.postMessage({ id: m.id, ok: true, pcm: f, rate }, [f.buffer]); }
  } catch (e) { self.postMessage({ id: m.id, ok: false, err: String(e?.message || e) }); }
};
