// Model loading with caching. Models are published next to the page under assets/.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const cache = new Map(), bundles = {};
// models ship as base64 inside assets/<folder>.json (the page host does not serve .glb files)
async function buffer(path) {
  const [dir, file] = path.split('/');
  if (!bundles[dir]) bundles[dir] = fetch('assets/' + dir + '.json').then((r) => r.json());
  const b64 = (await bundles[dir])[file]; if (!b64) throw new Error('missing ' + path);
  const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer;
}
export function load(path) {
  if (!cache.has(path)) cache.set(path, buffer(path).then((buf) => loader.parseAsync(buf, '')).catch((e) => { console.warn('model failed', path, e); return null; }));
  return cache.get(path);
}
export async function loadAll(paths, onProgress) {
  let done = 0; await Promise.all(paths.map((p) => load(p).then(() => onProgress && onProgress(++done / paths.length))));
}
// a static copy (meshes share geometry and materials)
export async function inst(path) { const g = await load(path); if (!g) return new THREE.Group(); const o = g.scene.clone(true); o.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = true; } }); return o; }
// a skinned copy with its own skeleton and the file's animation clips
export async function rigged(path) { const g = await load(path); if (!g) return { obj: new THREE.Group(), clips: [] }; const o = SkeletonUtils.clone(g.scene); o.traverse((m) => { if (m.isMesh) { m.frustumCulled = false; } }); return { obj: o, clips: g.animations }; }
export const SKINS = [
  { id: 'Male_Adult_01', price: 0, ar: 'شاب', en: 'Young man' },
  { id: 'Female_Adult_05', price: 0, ar: 'سارة', en: 'Sara' },
  { id: 'Medical_Male_01', price: 0, ar: 'الدكتور', en: 'Doctor' },
  { id: 'Medical_Female_02', price: 150, ar: 'الدكتورة', en: 'Physician' },
  { id: 'Business_Male_01', price: 200, ar: 'المدير', en: 'Director' },
  { id: 'Business_Female_01', price: 200, ar: 'المديرة', en: 'Manager' },
  { id: 'Male_Adult_05', price: 300, ar: 'الحارس العجوز', en: 'Old caretaker' },
  { id: 'Police_Male_01', price: 400, ar: 'ظابط الأمن', en: 'Security officer' },
];
export const ZOMBIE_PRICE = 250;
