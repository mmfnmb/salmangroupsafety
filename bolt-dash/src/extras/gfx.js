// Bolt Dash, world quality file 1 of 2: the look of a real city. Loaded only when a game or the open world starts.
// A real sky (sunrise, sunset, night with stars), the sun moving across it, street lamps and windows that light up
// at night, car headlights and police lights, rain with wet shiny streets and lightning, detailed asphalt, concrete
// and grass, trees moving in the wind. It sets itself to the phone's quality setting.
import { Sky } from 'three/addons/objects/Sky.js';
const B = window.__BD, THREE = B.THREE, { scene, camera, renderer, sun, hemi, G, M, save } = B;
const LV = () => ({ low: 0, med: 1, high: 2 }[save.quality] ?? 1);
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const glowTex = (inner, outer) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, inner); gr.addColorStop(0.35, outer); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); };

// ---------------------------------------------------------------- shared shader bits
const U = { time: { value: 0 }, wet: { value: 0 }, night: { value: 0 } };
const NOISE = `float gh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float gn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(gh(i), gh(i + vec2(1, 0)), f.x), mix(gh(i + vec2(0, 1)), gh(i + vec2(1, 1)), f.x), f.y); }`;
const WP_VERT = (sh) => {
  sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
    vec4 wq = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
      wq = instanceMatrix * wq;
    #endif
    vWP = (modelMatrix * wq).xyz;`);
};
// ground: grain, patches and cracks so asphalt, concrete and grass are not flat colours; wet when it rains
function patchGround(mat, kind) {
  if (mat.userData.gfx) return; mat.userData.gfx = kind;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.wet = U.wet; WP_VERT(sh);
    sh.fragmentShader = 'varying vec3 vWP; uniform float wet;\n' + NOISE + '\n' + sh.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec2 gp = vWP.xz;
        float n1 = gn(gp * 0.08), n2 = gn(gp * 0.7), n3 = gh(floor(gp * 18.0));
        ${kind === 'grass'
          ? 'diffuseColor.rgb *= mix(vec3(0.82, 0.9, 0.78), vec3(1.08, 1.05, 0.9), n1 * 0.7 + n2 * 0.3) * mix(0.92, 1.06, n3);'
          : 'diffuseColor.rgb *= mix(0.84, 1.08, n1 * 0.55 + n2 * 0.3 + n3 * 0.15); float ck = smoothstep(0.985, 1.0, gn(gp * vec2(0.9, 0.12)) ) + smoothstep(0.985, 1.0, gn(gp * vec2(0.12, 0.9))); diffuseColor.rgb *= 1.0 - ck * 0.25;'}
        diffuseColor.rgb *= 1.0 - wet * ${kind === 'grass' ? '0.12' : '0.32'};`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, ${kind === 'grass' ? '0.6' : '0.12'}, wet * ${kind === 'grass' ? '0.4' : '(0.75 + 0.25 * step(0.55, gn(vWP.xz * 0.15)))'});`);
  };
  mat.customProgramCacheKey = () => 'gfx-' + kind; mat.needsUpdate = true;
}
// trees sway in the wind
function patchTree(mat) {
  if (mat.userData.gfx) return; mat.userData.gfx = 'tree';
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.time = U.time;
    sh.vertexShader = 'uniform float time;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float sway = max(position.y, 0.0); vec4 ip = vec4(0.0);
      #ifdef USE_INSTANCING
        ip = instanceMatrix[3];
      #endif
      transformed.x += sin(time * 1.3 + ip.x * 0.3 + ip.z * 0.2) * sway * 0.06; transformed.z += cos(time * 1.1 + ip.z * 0.3) * sway * 0.04;`);
  };
  mat.customProgramCacheKey = () => 'gfx-tree'; mat.needsUpdate = true;
}
// go through the city models once (and the new colour variants as they appear)
const seen = new Set();
function patchModels() {
  for (const k in M) {
    if (seen.has(k) || !M[k]?.scene) continue; seen.add(k);
    const ground = /road-|tile-low|w\/concrete|w\/asphalt|w\/paint|driveway/.test(k), grass = /Cube_Grass/.test(k), tree = /tree|Tree|Bush/.test(k), bld = /building/.test(k);
    if (!ground && !grass && !tree && !bld) continue;
    M[k].scene.traverse((o) => { if (!o.isMesh || !o.material) return; for (const m of [].concat(o.material)) { if (ground) patchGround(m, 'road'); else if (grass) patchGround(m, 'grass'); else if (tree) patchTree(m); } });
  }
}

// ---------------------------------------------------------------- sky, stars
const sky = new Sky(); sky.scale.setScalar(250); sky.material.depthWrite = false; sky.renderOrder = -2; sky.frustumCulled = false; sky.visible = false; scene.add(sky);
const SU = sky.material.uniforms; SU.turbidity.value = 2.5; SU.rayleigh.value = 1.1; SU.mieCoefficient.value = 0.004; SU.mieDirectionalG.value = 0.86;
const stars = (() => {
  const n = 1400, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u); pos[i * 3] = Math.cos(a) * r * 120; pos[i * 3 + 1] = Math.abs(u) * 120; pos[i * 3 + 2] = Math.sin(a) * r * 120; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  p.frustumCulled = false; p.renderOrder = -1; p.visible = false; scene.add(p); return p;
})();

// ---------------------------------------------------------------- lights at night: lamps, light pools, headlights
const GLOW = glowTex('rgba(255,236,200,1)', 'rgba(255,190,110,0.45)'), POOL = glowTex('rgba(255,220,160,0.55)', 'rgba(255,190,110,0.18)');
const lampGlow = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: GLOW, size: 2.4, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: true }));
lampGlow.frustumCulled = false; scene.add(lampGlow);
const MAXP = 160, pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: POOL, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }), MAXP);
pools.frustumCulled = false; pools.count = 0; scene.add(pools);
const realLamps = [0, 1, 2, 3].map(() => { const l = new THREE.PointLight(0xffc98a, 0, 16, 2); l.visible = false; scene.add(l); return l; });
const carLights = (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(600 * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(600 * 3), 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ map: GLOW, size: 0.9, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); p.frustumCulled = false; scene.add(p); return p; })();
const head = new THREE.SpotLight(0xfff2d8, 0, 45, 0.5, 0.5, 1.2); head.visible = false; scene.add(head, head.target);

// ---------------------------------------------------------------- weather: clear, cloudy, rain, storm (more rain in winter)
const W = (B.weather = { rain: 0, cloud: 0, target: 0, day: -1, flash: 0, flashAt: 0 });
const rainFx = (() => {
  const n = 2600, pos = new Float32Array(n * 6); for (let i = 0; i < n; i++) { const x = Math.random() * 60 - 30, y = Math.random() * 30, z = Math.random() * 60 - 30; pos.set([x, y, z, x + 0.05, y - 0.9, z + 0.02], i * 6); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xc8d4e6, transparent: true, opacity: 0, depthWrite: false })); l.frustumCulled = false; l.visible = false; scene.add(l); return l;
})();
function pickWeather(day) {
  const m = new Date().getMonth(), wet = [0.45, 0.4, 0.3, 0.2, 0.15, 0.08, 0.05, 0.05, 0.12, 0.25, 0.32, 0.42][m], r = (Math.sin(day * 12.9898) * 43758.5453) % 1, x = Math.abs(r);
  W.target = x < wet ? (x < wet * 0.3 ? 1 : 0.65) : 0; W.cloud = x < wet * 1.6 ? 0.6 : 0.1;
}

// ---------------------------------------------------------------- every frame
const keep = { set: false };
let t = 0, lampT = 0, nearLamps = [];
const tc = new THREE.Color(), v3 = new THREE.Vector3(), m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), s1 = new THREE.Vector3();
function frame(dt) {
  t += dt; U.time.value = t;
  const w = G.modeObj, world = w?.id === 'world' && w.city, lv = LV();
  if (!world) { if (keep.set) restore(); return; }
  if (!keep.set) store();
  patchModels();
  const inside = !!w.inside, day = w.day ?? 0.3, sa = day * Math.PI * 2, el = Math.sin(sa), sunUp = sstep(-0.08, 0.25, el), night = 1 - sstep(-0.12, 0.08, el);
  // weather changes once a game day (8 minutes) and fades in and out
  const dn = Math.floor((w.t || 0) / 480); if (dn !== W.day) { W.day = dn; pickWeather(dn + (save.coins % 7)); }
  W.rain += (W.target - W.rain) * Math.min(1, dt * 0.08); U.wet.value = Math.min(1, W.rain * 1.3) * (inside ? 0 : 1);
  // sun and sky
  const sd = v3.set(Math.cos(sa) * 0.75, el, 0.45 + Math.sin(sa) * 0.2).normalize();
  SU.sunPosition.value.copy(sd); SU.turbidity.value = 2.5 + W.rain * 9 + W.cloud * 2; SU.rayleigh.value = 1.1 + W.rain * 1.5 - night * 0.6;
  sky.visible = !inside; sky.position.copy(camera.position); B.sky.visible = false; B.motes.visible = false;
  stars.visible = !inside && night > 0.05; stars.position.copy(camera.position); stars.material.opacity = night * (1 - W.rain) * 0.9;
  const p = G.player?.pos || camera.position;
  if (!inside) {
    sun.position.set(p.x + sd.x * 60, p.y + Math.max(sd.y, 0.08) * 60, p.z + sd.z * 60); sun.target.position.set(p.x, p.y, p.z);
    const warm = 1 - sstep(0.05, 0.45, el); sun.color.setRGB(1, 0.93 - warm * 0.35, 0.82 - warm * 0.55);
    sun.intensity = 3.0 * sunUp * (1 - W.rain * 0.7); hemi.intensity = 0.18 + sunUp * 0.85 * (1 - W.rain * 0.35) + night * 0.12;
    hemi.color.setRGB(0.75 + sunUp * 0.25, 0.8 + sunUp * 0.18, 0.95); hemi.groundColor.setRGB(0.35 + sunUp * 0.25, 0.36 + sunUp * 0.3, 0.38 + sunUp * 0.2);
    // fog takes the colour of the horizon
    const fc = scene.fog.color; fc.setRGB(0.64, 0.74, 0.86).lerp(tc.setRGB(0.95, 0.62, 0.42), warm * sunUp * 0.6).multiplyScalar(0.12 + sunUp * 0.88);
    fc.lerp(tc.setRGB(0.55, 0.58, 0.62), W.rain * 0.6 * sunUp); scene.fog.near = 85 - W.rain * 50; scene.fog.far = 285 - W.rain * 130;
    renderer.toneMappingExposure = 0.94 + night * 0.06; setEnv(0.45 * (0.1 + 0.9 * sunUp) * (1 - W.rain * 0.3), dt);
    hemi.color.lerp(tc.setRGB(1, 0.7, 0.5), warm * sunUp * 0.45); hemi.intensity *= 1 - night * 0.3; B.rim.intensity = 0.25 * sunUp;
    if (lv > 0) { sun.shadow.camera.left = sun.shadow.camera.bottom = -55; sun.shadow.camera.right = sun.shadow.camera.top = 55; sun.shadow.camera.far = 200; sun.shadow.camera.updateProjectionMatrix(); }
  }
  B.bloom.strength = 0.42 + night * 0.3; B.bloom.threshold = 1.0 - night * 0.12;
  if (B.buildU) B.buildU.night.value = night;
  // street lamps near you
  lampT -= dt;
  if (lampT <= 0) { lampT = 0.4; nearLamps = []; for (const c of w.city.chunks.values()) for (const l of c.lamps || []) { const d = Math.hypot(l[0] - p.x, l[1] - p.z); if (d < 130) nearLamps.push([l[0], l[1], d]); } nearLamps.sort((a, b) => a[2] - b[2]); nearLamps = nearLamps.slice(0, MAXP);
    const pos = new Float32Array(nearLamps.length * 3); nearLamps.forEach((l, i) => pos.set([l[0], 5.75, l[1]], i * 3)); lampGlow.geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3)); lampGlow.geometry.computeBoundingSphere();
    nearLamps.forEach((l, i) => { m4.compose(v3.set(l[0], 0.06, l[1]), q0, s1.set(11, 1, 11)); pools.setMatrixAt(i, m4); }); pools.count = nearLamps.length; pools.instanceMatrix.needsUpdate = true; }
  lampGlow.material.opacity = night; pools.material.opacity = night * 0.6; lampGlow.visible = pools.visible = night > 0.02 && !inside;
  const nReal = [0, 2, 4][lv]; realLamps.forEach((l, i) => { const n = nearLamps[i]; l.visible = !inside && i < nReal && night > 0.05 && !!n; if (l.visible) { l.position.set(n[0], 5.4, n[1]); l.intensity = night * 7; } });
  // cars: headlights and tail lights at night or in rain, police lights always
  const pa = carLights.geometry.attributes.position, ca = carLights.geometry.attributes.color; let k = 0; const glow = Math.max(night, W.rain * 0.7);
  const put = (x, y, z, r, g, b) => { if (k >= 600) return; pa.setXYZ(k, x, y, z); ca.setXYZ(k, r, g, b); k++; };
  const cars = [...(w.traffic?.cars || []).filter((c) => c.live), ...(w.cars || []), ...(w.police || [])];
  if (!inside) for (const c of cars) {
    if (Math.abs(c.x - p.x) > 120 || Math.abs(c.z - p.z) > 120) continue; const fx = Math.sin(c.h), fz = Math.cos(c.h), rx = fz, rz = -fx, off = c.hw * 0.62;
    if (glow > 0.05) for (const sdx of [-1, 1]) { put(c.x + fx * c.hl + rx * off * sdx, 1.0, c.z + fz * c.hl + rz * off * sdx, glow, glow * 0.95, glow * 0.8); put(c.x - fx * c.hl + rx * off * sdx, 1.05, c.z - fz * c.hl + rz * off * sdx, glow * 0.9, 0, 0); }
    if (c.n === 'police') { const on = (t * 4 | 0) % 2; put(c.x + rx * 0.5, 2.5, c.z + rz * 0.5, on, 0, 0); put(c.x - rx * 0.5, 2.5, c.z - rz * 0.5, 0, 0.2, on ? 0 : 1); }
  }
  for (let i = k; i < 600; i++) pa.setXYZ(i, 0, -999, 0); pa.needsUpdate = ca.needsUpdate = true; carLights.visible = k > 0;
  const dc = w.driving; head.visible = !!dc && lv > 0 && glow > 0.1 && !inside;
  if (head.visible) { const fx = Math.sin(dc.h), fz = Math.cos(dc.h); head.position.set(dc.x + fx * dc.hl, 1.3, dc.z + fz * dc.hl); head.target.position.set(dc.x + fx * 25, 0, dc.z + fz * 25); head.intensity = glow * 220; }
  // rain and lightning
  rainFx.visible = W.rain > 0.05 && !inside; rainFx.material.opacity = W.rain * 0.45;
  if (rainFx.visible) {
    rainFx.position.set(camera.position.x, camera.position.y - 12, camera.position.z); const ar = rainFx.geometry.attributes.position.array, dy = 32 * dt;
    for (let i = 0; i < ar.length; i += 6) { ar[i + 1] -= dy; ar[i + 4] -= dy; if (ar[i + 4] < 0) { ar[i + 1] += 30; ar[i + 4] += 30; } }
    rainFx.geometry.attributes.position.needsUpdate = true;
  }
  if (W.rain > 0.9 && !inside && Math.random() < dt * 0.06) { W.flash = 0.18; W.flashAt = t; }
  if (W.flash > 0) { W.flash -= dt; hemi.intensity += 2.2; }
}
// reflected sky light (three.js r160 has no scene-wide setting, so it is set on each material)
let envNow = 1, envT = 0;
function setEnv(v, dt) {
  envT -= dt; if (envT > 0 && Math.abs(v - envNow) < 0.04) return; envT = 1; envNow = v;
  scene.traverse((o) => { if (o.isMesh) for (const m of [].concat(o.material)) if (m && m.isMeshStandardMaterial && !m.userData.keepEnv) m.envMapIntensity = v; });
}
function store() { keep.set = true; keep.exp = renderer.toneMappingExposure; keep.bloom = [B.bloom.strength, B.bloom.threshold]; keep.shadow = [sun.shadow.camera.left, sun.shadow.camera.right, sun.shadow.camera.top, sun.shadow.camera.bottom, sun.shadow.camera.far]; keep.hemi = [hemi.color.getHex(), hemi.groundColor.getHex()]; keep.sun = sun.color.getHex(); keep.env = scene.environmentIntensity; keep.rim = B.rim.intensity; }
function restore() {
  keep.set = false; sky.visible = stars.visible = lampGlow.visible = pools.visible = rainFx.visible = carLights.visible = head.visible = false; realLamps.forEach((l) => (l.visible = false));
  B.sky.visible = true; B.motes.visible = true; renderer.toneMappingExposure = keep.exp; [B.bloom.strength, B.bloom.threshold] = keep.bloom; U.wet.value = 0; W.rain = 0;
  const c = sun.shadow.camera; [c.left, c.right, c.top, c.bottom, c.far] = keep.shadow; c.updateProjectionMatrix(); hemi.color.setHex(keep.hemi[0]); hemi.groundColor.setHex(keep.hemi[1]); sun.color.setHex(keep.sun); B.rim.intensity = keep.rim; envT = 0; setEnv(1, 0);
  if (B.buildU) B.buildU.night.value = 0;
}
B.hooks.push(frame);
B.gfx = { U, weather: W };
