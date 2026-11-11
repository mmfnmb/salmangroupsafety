// Glowing effects for abilities and knockouts, made from Kenney's Particle Pack (CC0): white sprites tinted to any
// colour and blended so they glow. Rings that roll out on the floor, bursts of sparks and stars, flashes, lightning.
import { THREE, scene, V, rand, PI } from './core.js';

const TEX = {};
const tex = (k) => { if (TEX[k]) return TEX[k]; const url = (globalThis.__BD_VFX || {})[k]; if (!url) return null; const t = new THREE.TextureLoader().load(url); t.colorSpace = THREE.SRGBColorSpace; return (TEX[k] = t); };
const live = [];
const mat = (k, color) => new THREE.SpriteMaterial({ map: tex(k), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });

// a sprite that faces the camera
function sprite(k, pos, color, size, life, opts = {}) {
  if (!tex(k)) return null; const s = new THREE.Sprite(mat(k, color)); s.position.copy(pos); s.scale.setScalar(size); s.material.rotation = opts.rot ?? rand(0, PI * 2); scene.add(s);
  const p = { o: s, t: 0, life, size, grow: opts.grow ?? 1, vel: opts.vel || null, spin: opts.spin ?? 0, g: opts.g ?? 0, fade: opts.fade ?? 1 }; live.push(p); return p;
}
// a flat sprite lying on the floor (rings, runes, scorch marks)
function decal(k, pos, color, size, life, opts = {}) {
  if (!tex(k)) return null; const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex(k), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  m.rotation.x = -PI / 2; m.position.copy(pos); m.position.y += 0.08; m.scale.setScalar(size); scene.add(m);
  const p = { o: m, t: 0, life, size, grow: opts.grow ?? 1, spin: opts.spin ?? 0, flat: true, fade: 1 }; live.push(p); return p;
}
export const vfx = {
  // a ring of energy rolling out along the floor
  ring(pos, color, from = 1, to = 14, life = 0.6) { decal('ring', pos, color, from, life, { grow: to / from }); decal('circle', pos, color, from * 0.8, life * 1.2, { grow: (to * 0.7) / from, spin: 3 }); },
  // a magic circle spinning under someone
  rune(pos, color, size = 4, life = 1.5) { return decal('rune', pos, color, size, life, { spin: 2.5, grow: 1.15 }); },
  // a flash of light
  flash(pos, color, size = 4, life = 0.35, k = 'flare') { sprite(k, pos, color, size, life, { grow: 1.8 }); },
  // an explosion: a bright flash, a starburst, sparks, fire and smoke
  boom(pos, color, size = 1) {
    sprite('flare', pos, 0xffffff, 5 * size, 0.3, { grow: 2.2 }); sprite('burst', pos, color, 3 * size, 0.4, { grow: 2.4, spin: 2 });
    for (let i = 0; i < 10; i++) sprite(i % 3 ? 'star' : 'fire', pos.clone(), color, rand(0.6, 1.4) * size, rand(0.4, 0.8), { vel: V(rand(-1, 1), rand(0.3, 1.4), rand(-1, 1)).multiplyScalar(rand(5, 10) * size), g: 9, grow: 0.4 });
    for (let i = 0; i < 4; i++) sprite('smoke', pos.clone().add(V(rand(-0.6, 0.6), rand(0, 0.6), rand(-0.6, 0.6))), 0x9aa0b4, 2.2 * size, rand(0.8, 1.3), { vel: V(rand(-1, 1), 1.5, rand(-1, 1)), grow: 2, fade: 0.6 });
    decal('scorch', pos, color, 4 * size, 1.2, { grow: 1.3 });
  },
  // sparkles (for things changing shape)
  sparkle(pos, color, n = 6) { for (let i = 0; i < n; i++) sprite('star', pos.clone(), color, rand(0.25, 0.5), rand(0.25, 0.45), { vel: V(rand(-1, 1), rand(-0.2, 1), rand(-1, 1)).multiplyScalar(3), grow: 0.3 }); },
  // lightning striking down at a point
  bolt(pos, color) { const p = sprite('bolt', pos.clone().add(V(0, 5, 0)), color, 10, 0.3, { rot: 0 }); if (p) p.o.scale.set(3, 10, 1); this.flash(pos, color, 3, 0.25); },
  // a slash arc in front of someone
  slash(pos, color, size = 3) { sprite('slash', pos, color, size, 0.25, { grow: 1.4, spin: 6 }); },
  hearts(pos, n = 6) { for (let i = 0; i < n; i++) sprite('heart', pos.clone(), 0xff5fb8, rand(0.5, 0.9), rand(0.7, 1.1), { vel: V(rand(-1, 1), rand(1, 2), rand(-1, 1)).multiplyScalar(2.5), grow: 0.6 }); },
};
export function vfxUpdate(dt) {
  for (let i = live.length - 1; i >= 0; i--) {
    const p = live[i]; p.t += dt; const k = p.t / p.life;
    if (k >= 1) { p.o.removeFromParent(); p.o.material.dispose(); if (p.flat) p.o.geometry.dispose(); live.splice(i, 1); continue; }
    const s = p.size * (1 + (p.grow - 1) * k); if (p.flat) { p.o.scale.setScalar(s); p.o.rotation.z += p.spin * dt; } else { if (p.o.scale.x === p.o.scale.y) p.o.scale.setScalar(s); p.o.material.rotation += p.spin * dt; }
    if (p.vel) { p.vel.y -= p.g * dt; p.o.position.addScaledVector(p.vel, dt); }
    p.o.material.opacity = Math.min(1, (1 - k) * 1.6) * p.fade;
  }
}
export function vfxClear() { for (const p of live) { p.o.removeFromParent(); p.o.material.dispose(); } live.length = 0; }
