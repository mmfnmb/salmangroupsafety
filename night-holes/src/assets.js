// Model loading with caching. Models are published next to the page under assets/.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const cache = new Map(), bundles = {}, PERFILE = ['hum', 'car'];
// models ship as base64 inside assets/<folder>.json (the page host does not serve .glb files)
async function buffer(path) {
  const [dir, file] = path.split('/'); const key = PERFILE.includes(dir) ? dir + '-' + file.replace(/\.glb$/, '') : dir;
  if (!bundles[key]) bundles[key] = fetch('assets/' + key + '.json').then((r) => r.json());
  const b64 = (await bundles[key])[file]; if (!b64) throw new Error('missing ' + path);
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
// the 15 playable people, each with their own car (Rocketbox humans, MIT; cars CC BY, see CREDITS.md)
export const CHARS = [
  { id: 'Male_Adult_01', name: 'Adam Hale', job: 'Urban explorer', car: 'mercedes-e-w212', carName: 'E-Class sedan' },
  { id: 'Female_Adult_05', name: 'Sara Venn', job: 'Photographer', car: 'audi-a6', carName: 'A6 sedan' },
  { id: 'Medical_Male_01', name: 'Dr. Omar Reyes', job: 'Night-shift doctor', car: 'lexus-rx', carName: 'RX crossover' },
  { id: 'Medical_Female_02', name: 'Dr. Mia Clarke', job: 'Surgeon', car: 'audi-q8', carName: 'Q8 coupe SUV' },
  { id: 'Business_Male_01', name: 'Victor Stone', job: 'Investor', car: 'mercedes-benz-mersedes-s-class', carName: 'S-Class' },
  { id: 'Business_Female_01', name: 'Nora Blake', job: 'Lawyer', car: 'bmw-7-series-f01', carName: '7 Series' },
  { id: 'Male_Adult_05', name: 'Frank Doyle', job: 'Retired caretaker', car: 'land-rover-range-rover', carName: 'Range Rover' },
  { id: 'Police_Male_01', name: 'Sgt. Leo Grant', job: 'Police officer', car: 'bmw-x5', carName: 'X5' },
  { id: 'Male_Adult_02', name: 'Sam Porter', job: 'Journalist', car: 'mercedes-benz-cls', carName: 'CLS coupe' },
  { id: 'Male_Adult_08', name: 'Elias Ward', job: 'YouTuber', car: 'porsche-cayenne', carName: 'Cayenne' },
  { id: 'Female_Adult_03', name: 'Jade Moreno', job: 'Architect', car: 'audi-a8', carName: 'A8' },
  { id: 'Female_Adult_09', name: 'Hana Ito', job: 'Student', car: 'bmw-x7', carName: 'X7' },
  { id: 'Sports_Male_01', name: 'Kai Mercer', job: 'Athlete', car: 'mercedes-benz-mersedes-g63', carName: 'G-Class' },
  { id: 'Construction_Male_01', name: 'Bruno Kane', job: 'Site engineer', car: 'mercedes-benz-mersedes-gls', carName: 'GLS' },
  { id: 'Pilot_Female_01', name: 'Capt. Ava Lind', job: 'Pilot', car: 'mercedes-benz-mersedes-maybach', carName: 'Maybach' },
];
export const FRIEND = 'Female_Adult_02';
export const ZOMBIE_PRICE = 250;
