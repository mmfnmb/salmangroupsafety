import * as THREE from 'three'; import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const L = new GLTFLoader(); const hex = (c) => '#' + c.getHexString();
function pixels(img) { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return { d: x.getImageData(0, 0, img.width, img.height).data, w: img.width, h: img.height }; }
const cache = {};
export async function build(it) {
  const g = await L.loadAsync(it.f); const o = g.scene; it._anims = g.animations; const extras = []; const added = []; const addX = (q) => { o.add(q); added.push(q); };
  o.traverse((m) => { if (m.isMesh && m.name === 'Eyes') { const P = m.geometry.attributes.position; const L2 = [0, 0, 0, 0], R2 = [0, 0, 0, 0]; for (let i = 0; i < P.count; i++) { const A = P.getX(i) < 0 ? L2 : R2; A[0] += P.getX(i); A[1] += P.getY(i); A[2] += P.getZ(i); A[3]++; } it._eyes = [L2, R2].map((A) => [A[0] / A[3], A[1] / A[3], A[2] / A[3]]); } });
  o.traverse((m) => { if (m.isMesh && it.noHair && m.name === 'Hair') { m.visible = false; return; } if (!m.isMesh) return; const map = m.material.map; if (!map) return; const P = cache[it.f + m.name] ||= pixels(map.image);
    const geo = m.geometry; const uv = geo.attributes.uv, pos = geo.attributes.position; const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { const u = uv.getX(i), v = uv.getY(i); const px = Math.min(P.w - 1, Math.floor(u * P.w)), py = Math.min(P.h - 1, Math.floor(v * P.h)); const k = (py * P.w + px) * 4;
      let c = new THREE.Color().setRGB(P.d[k] / 255, P.d[k + 1] / 255, P.d[k + 2] / 255, THREE.SRGBColorSpace); const h = hex(c.clone().convertLinearToSRGB ? c : c);
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); const sh = '#' + [P.d[k], P.d[k + 1], P.d[k + 2]].map((q) => q.toString(16).padStart(2, '0')).join('');
      if ((it.nostrils || it.muzzle || it.sculpt) && sh === '#d06d8f' && z > 0.4 && y > 2.3 && y < 2.8) { (m.userData.nose ||= []).push([x, y, z]); if (it.nostrils) { pos.setZ(i, 0.4 + (z - 0.4) * 0.55); pos.setX(i, x * 1.35); } }
      if (it.chef && m.name === 'Rabbit' && y > 1.0 && y < 2.3) { (m.userData.chest ||= []).push([x, y, z]); }
      if (it.headTop && m.name === 'Rabbit' && y < it.headTop.ymax) { if (!m.userData.ht || y > m.userData.ht[1]) m.userData.ht = [x, y, z]; (m.userData.hv ||= []).push([x, y, z]); }
      for (const rule of it.rules || []) { if (rule.from !== sh) continue; const w = rule.where || {}; if (w.ymin != null && y < w.ymin) continue; if (w.ymax != null && y > w.ymax) continue; if (w.zmin != null && z < w.zmin) continue; if (w.zmax != null && z > w.zmax) continue; if (w.axmax != null && Math.abs(x) > w.axmax) continue; c = new THREE.Color(rule.to); break; }
      if (it.paint && sh === '#d5d5dc' && m.name === 'Rabbit') { const Pn = it.paint;
        if (Pn.legs && y < Pn.legs.ymax) { const t = Math.sin(y * Pn.legs.freq + Math.abs(x) * 2); if (t > (Pn.legs.thr ?? 0.25)) c = new THREE.Color(Pn.legs.color); }
        if (Pn.spots) { const h = Math.sin(x * Pn.spots.f1 + z * 3.1) * Math.sin(y * Pn.spots.f2 + x * 2.3) + Math.sin((x + z) * 5.3 + y * 1.7) * 0.6; if (h > Pn.spots.thr && y < 3.4) c = new THREE.Color(Pn.spots.color); }
        if (Pn.arms && Math.abs(x) > Pn.arms.xmin && y > 1.0 && y < 2.2) { const t = Math.sin(y * Pn.arms.freq + Math.abs(x) * 1.5); if (t > 0) c = new THREE.Color(Pn.arms.color); }
        if (Pn.dorsal && Math.abs(x) < Pn.dorsal.w && z < 0.05 && y > 0.9 && y < 3.0) c = new THREE.Color(Pn.dorsal.color);
        if (Pn.stripes && z < 0.0 && y > 0.9 && y < 3.0) for (const st of Pn.stripes) if (Math.abs(Math.abs(x) - st.xc) < st.w) c = new THREE.Color(st.color);
        if (Pn.belly && z > 0.15 && y > 0.4 && y < 2.2 && Math.abs(x) < Pn.belly.w) c = new THREE.Color(Pn.belly.color);
        if (Pn.eyeRing && it._eyes) for (const E of it._eyes) { const dd = Math.hypot(x - E[0], y - E[1], z - E[2]); if (dd < Pn.eyeRing.r) c = new THREE.Color(Pn.eyeRing.color); }
        if (Pn.eyeStripe && it._eyes) for (const E of it._eyes) { if (Math.abs(y - E[1]) < Pn.eyeStripe.h && Math.sign(x) === Math.sign(E[0]) && z > 0.1) c = new THREE.Color(Pn.eyeStripe.color); }
        if (Pn.chin && z > 0.15 && y > Pn.chin.ylo && y < Pn.chin.yhi) c = new THREE.Color(Pn.chin.color);
        if (Pn.socks && y < Pn.socks.ymax) c = new THREE.Color(Pn.socks.color); }
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      if (it.ear && y > it.ear.y0) { pos.setY(i, it.ear.y0 + (y - it.ear.y0) * it.ear.s); if (it.ear.sx) pos.setX(i, x * it.ear.sx); }
      if (it.snout && m.name === 'Rabbit' && z > it.snout.z0 && y > it.snout.ymin && y < it.snout.ymax) { const dz = z - it.snout.z0; pos.setZ(i, z + dz * it.snout.k); pos.setY(i, y - dz * it.snout.k * (it.snout.down || 0.35)); pos.setX(i, x * (1 + dz * (it.snout.wide || 0))); }
      if (it.thin && m.name !== 'Eyes' && y < it.thin.ymax) { pos.setX(i, pos.getX(i) * it.thin.s); pos.setZ(i, pos.getZ(i) * it.thin.s); } }
    if (m.userData.chest) extras.push({ type: 'chest', v: m.userData.chest }); if (m.userData.hv) extras.push({ type: 'head', v: m.userData.hv, top: m.userData.ht });
    if (m.userData.nose && it.nostrils) { const n = m.userData.nose; const c = n.reduce((a, b) => [a[0] + b[0] / n.length, a[1] + b[1] / n.length, Math.max(a[2], b[2])], [0, 0, -9]); extras.push({ type: 'nose', p: c }); } else if (m.userData.nose && it.muzzle) { const n = m.userData.nose; extras.push({ type: 'muzzle', p: n.reduce((a, b) => [a[0] + b[0] / n.length, a[1] + b[1] / n.length, Math.max(a[2], b[2])], [0, 0, -9]) }); }
    if (it.sculpt && (it.sculpt.meshes || ['Rabbit']).includes(m.name) && (m.userData.nose || it.sculpt.center)) { const K = it.sculpt; const n = m.userData.nose; const N = K.center || n.reduce((a, b) => [a[0] + b[0] / n.length, a[1] + b[1] / n.length, a[2] + b[2] / n.length], [0, 0, 0]); const mc = new THREE.Color(K.color); const cent = [N[0], N[1] + K.cy, N[2] + K.cz];
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); if (y < (K.ylo ?? 1.9) || y > (K.yhi ?? 3.0)) continue; const dx = x - cent[0], dy = (y - cent[1]) * K.ay, dz = Math.max(0, cent[2] - z) * K.az; const d2 = dx * dx + dy * dy + dz * dz; const w = Math.exp(-d2 / (2 * K.sig * K.sig)) * Math.min(1, Math.max(0, ((K.ytop ?? 9) - y) / 0.14)); if (w < 0.01) continue; const wp = Math.pow(w, K.pow || 1);
        pos.setXYZ(i, x * (1 + K.sx * wp), y + K.dy * wp + (K.sag || 0) * wp * Math.max(0, cent[1] - y), z + K.dz * wp); const t = Math.min(1, Math.max(0, (w - K.c0) / (K.c1 - K.c0))); col[i * 3] += (mc.r - col[i * 3]) * t; col[i * 3 + 1] += (mc.g - col[i * 3 + 1]) * t; col[i * 3 + 2] += (mc.b - col[i * 3 + 2]) * t; }
      m.userData.sculptC = [cent[0], cent[1] + K.dy, cent[2] + K.dz]; extras.push({ type: 'decal', mesh: m }); }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); pos.needsUpdate = true; geo.computeBoundingBox(); geo.computeBoundingSphere();
    m.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0 });
    if (m.name === 'Rabbit' && it.sideEars) { for (const side of [-1, 1]) { let best = null; for (let i = 0; i < pos.count; i++) { const y = pos.getY(i), x = pos.getX(i); if (y < 2.45 || y > 2.8 || x * side <= 0) continue; if (!best || Math.abs(x) > Math.abs(best.x)) best = { x, y, z: pos.getZ(i) }; } if (best) extras.push({ type: 'side', p: best, side }); } }
    if (m.name === 'Rabbit' && it.mane) { let top = -1; for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (Math.abs(pos.getX(i)) < 0.12 && y < (it.ear ? it.ear.y0 : 9) && y > top) top = y; } extras.push({ type: 'mane', top }); } if (it.tuft && m.name === 'Rabbit') { // ear tips: highest fur vertices left/right
      for (const side of [-1, 1]) { let best = null; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i); if (x * side <= 0.05) continue; if (!best || pos.getY(i) > best.y) best = { x, y: pos.getY(i), z: pos.getZ(i) }; }
        if (best) extras.push({ type: 'tuft', p: best, side }); } } });
  if (it.hairFix) { let body = null, hair = null; o.traverse((q) => { if (q.isMesh && q.name === 'Rabbit') body = q; if (q.isMesh && q.name === 'Hair') hair = q; });
    if (body && hair && hair.visible) { const B = body.geometry.attributes.position, Hh = hair.geometry.attributes.position; const y0 = it.hairFix.y0 ?? 3.3;
      const ears = [-1, 1].map((sd) => { const lo = [], hi = []; let ymax = -9; for (let i = 0; i < B.count; i++) { const x = B.getX(i), y = B.getY(i); if (x * sd <= 0 || y < y0) continue; ymax = Math.max(ymax, y); } const mid = y0 + (ymax - y0) * 0.5;
        for (let i = 0; i < B.count; i++) { const x = B.getX(i), y = B.getY(i), z = B.getZ(i); if (x * sd <= 0 || y < y0) continue; if (y < y0 + 0.12) lo.push([x, y, z]); else if (y > mid) hi.push([x, y, z]); }
        const avg = (L) => L.reduce((a, b) => [a[0] + b[0] / L.length, a[1] + b[1] / L.length, a[2] + b[2] / L.length], [0, 0, 0]); const A = avg(lo), C = avg(hi); let rx = 0, rz = 0; const H2 = avg(hi); for (const v of hi) { rx = Math.max(rx, Math.abs(v[0] - H2[0])); rz = Math.max(rz, Math.abs(v[2] - H2[2])); } return { A, C, rx, rz, r: rx, ymax }; });
      let moved = 0; const R0 = it.hairFix.margin ?? 0.05;
      for (let i = 0; i < Hh.count; i++) { const p = new THREE.Vector3(Hh.getX(i), Hh.getY(i), Hh.getZ(i));
        for (const E of ears) { if (p.y < E.A[1] - 0.25 || p.y > E.ymax) continue; const a = new THREE.Vector3(...E.A), c = new THREE.Vector3(...E.C); const ax = c.clone().sub(a); const t = Math.max(0, p.clone().sub(a).dot(ax) / ax.lengthSq()); const q = a.clone().addScaledVector(ax, t);
          const off = p.clone().sub(q); off.y = 0; const ex = off.x / (E.rx + R0), ez = off.z / (E.rz + R0); const e = Math.hypot(ex, ez); if (e < 1) { if (e < 1e-4) { off.set(Math.sign(E.A[0]) || 1, 0, 0); } const s2 = 1 / Math.max(e, 1e-4); p.x = q.x + off.x * s2; p.z = q.z + off.z * s2; moved++; } }
        Hh.setXYZ(i, p.x, p.y, p.z); }
      Hh.needsUpdate = true; hair.geometry.computeVertexNormals(); console.log('hairFix moved', moved, JSON.stringify(ears.map((e) => [e.rx.toFixed(2), e.rz.toFixed(2), e.A.map((v) => v.toFixed(2))]))); } }
  o.updateMatrixWorld(true);
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });
  for (const e of extras.filter((e) => e.type === 'side')) { const S = it.sideEars; const ear = new THREE.Mesh(new THREE.SphereGeometry(S.r, 20, 14), mat(S.color)); ear.scale.set(0.45, 1, 1); ear.position.set(e.p.x + e.side * S.r * 0.25, e.p.y + 0.05, e.p.z - 0.05); addX(ear);
    const inn = new THREE.Mesh(new THREE.SphereGeometry(S.r * 0.68, 20, 14), mat(S.inner)); inn.scale.set(0.3, 1, 1); inn.position.copy(ear.position); inn.position.x += e.side * S.r * 0.12; addX(inn); }
  for (const e of extras.filter((e) => e.type === 'nose')) { for (const sd of [-1, 1]) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), mat('#1a100a')); h.scale.set(1, 0.7, 0.5); h.position.set(e.p[0] + sd * 0.045, e.p[1] - 0.005, 0.4 + (e.p[2] - 0.4) * 0.55 + 0.005); addX(h); } }
  for (const e of extras.filter((e) => e.type === 'decal')) { const K = it.sculpt; const m = e.mesh; const g = m.geometry; const P = g.attributes.position; const tmp = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', P.clone()).setIndex(g.index), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); tmp.geometry.computeVertexNormals(); const rc = new THREE.Raycaster(); const C = m.userData.sculptC;
    if (K.nose) { const from = new THREE.Vector3(C[0], C[1] + K.nose.dy, 3); rc.set(from, new THREE.Vector3(0, 0, -1)); const hit = rc.intersectObject(tmp)[0]; if (hit) { const nrm = hit.face.normal.clone(); const nz = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: K.nose.color, roughness: 0.35 })); nz.scale.set(K.nose.w, K.nose.h, K.nose.d); nz.position.copy(hit.point).addScaledVector(nrm, -K.nose.d * 0.35); addX(nz); } }
    if (!K.noNostrils) for (const sd of [-1, 1]) { const from = new THREE.Vector3(C[0] + sd * K.nx, C[1] + K.ny, 3); rc.set(from, new THREE.Vector3(0, 0, -1)); const hit = rc.intersectObject(tmp)[0]; console.log('decal', !!hit); if (!hit) continue; const nrm = hit.face.normal.clone();
      const dec = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshStandardMaterial({ color: '#2a201c', roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -4 })); dec.scale.set(K.nr * 0.7, K.nr, 1); dec.position.copy(hit.point).addScaledVector(nrm, 0.004); dec.lookAt(hit.point.clone().add(nrm)); dec.rotateZ(sd * 0.35); addX(dec); }
    if (K.mouth) { const from = new THREE.Vector3(C[0], C[1] - K.my, 3); rc.set(from, new THREE.Vector3(0, 0, -1)); const hit = rc.intersectObject(tmp)[0]; if (hit) { const nrm = hit.face.normal.clone(); const mo = new THREE.Mesh(new THREE.RingGeometry(K.mw * 0.92, K.mw, 24, 1, Math.PI * 1.15, Math.PI * 0.7), new THREE.MeshStandardMaterial({ color: '#3a2c28', side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4 })); mo.position.copy(hit.point).addScaledVector(nrm, 0.004); mo.lookAt(hit.point.clone().add(nrm)); addX(mo); } } }
  for (const e of extras.filter((e) => e.type === 'muzzle')) { const Z = it.muzzle; const g4 = new THREE.Group(); g4.position.set(0, e.p[1] + Z.dy, e.p[2] + Z.dz);
    const mz = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), mat(Z.color)); mz.scale.set(Z.w, Z.h, Z.d); g4.add(mz);
    for (const sd of [-1, 1]) { const ns = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mat('#2a2220')); ns.scale.set(Z.nr * 0.75, Z.nr * 1.1, Z.nr * 0.45); ns.position.set(sd * Z.w * 0.42, Z.h * 0.18, Z.d * 0.9); ns.rotation.z = sd * 0.35; g4.add(ns); const rim = new THREE.Mesh(new THREE.TorusGeometry(Z.nr * 0.85, Z.nr * 0.22, 10, 20), mat(Z.rim)); rim.scale.set(0.8, 1.15, 0.6); rim.position.copy(ns.position); rim.position.z -= 0.01; rim.rotation.z = sd * 0.35; g4.add(rim); }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(Z.w * 0.45, 0.018, 8, 24, Math.PI * 0.7), mat('#3a302c')); mouth.rotation.set(0.25, 0, Math.PI * 1.15); mouth.position.set(0, -Z.h * 0.35, Z.d * 0.82); g4.add(mouth);
    addX(g4); }
  for (const e of extras.filter((e) => e.type === 'chest')) { const C = it.chef; let zf = -9; for (const v of e.v) if (Math.abs(v[0]) < 0.25 && v[1] > 1.55 && v[1] < 1.95) zf = Math.max(zf, v[2]); for (let q = 0; q < 3; q++) for (const sd of [-1, 1]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), mat(C.button)); b.scale.set(1, 1, 0.5); b.position.set(sd * 0.14, 2.0 - q * 0.22, zf - 0.02 - q * 0.0); addX(b); }
    const sc3 = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.075, 12, 28), mat(C.scarf)); sc3.rotation.x = Math.PI / 2; sc3.position.set(0, 2.22, -0.02); sc3.scale.set(1.05, 1, 1); addX(sc3); const knot = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 10), mat(C.scarf)); knot.position.set(0, 2.06, zf + 0.0); knot.rotation.x = Math.PI; addX(knot); }
  for (const e of extras.filter((e) => e.type === 'head')) { const H = it.headTop; let mnx = 9, mxx = -9, mnz = 9, mxz = -9; for (const v of e.v) if (v[1] > e.top[1] - 0.35) { mnx = Math.min(mnx, v[0]); mxx = Math.max(mxx, v[0]); mnz = Math.min(mnz, v[2]); mxz = Math.max(mxz, v[2]); }
    const cx = (mnx + mxx) / 2, cz = (mnz + mxz) / 2, rad = Math.max(mxx - mnx, mxz - mnz) / 2; const yb = e.top[1] - H.sink;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(rad * 1.02, rad * 0.98, H.band, 32), mat('#f7f7f4')); band.position.set(cx, yb + H.band / 2, cz + H.dz); addX(band);
    const puff = new THREE.Mesh(new THREE.SphereGeometry(rad * 1.25, 32, 20), mat('#ffffff')); puff.scale.set(1, 0.72, 1); puff.position.set(cx, yb + H.band + rad * 0.55, cz + H.dz); addX(puff);
    for (const a of [0, 1, 2, 3, 4]) { const lobe = new THREE.Mesh(new THREE.SphereGeometry(rad * 0.55, 16, 12), mat('#ffffff')); const an = a / 5 * Math.PI * 2; lobe.position.set(cx + Math.cos(an) * rad * 0.75, yb + H.band + rad * 0.65, cz + H.dz + Math.sin(an) * rad * 0.75); addX(lobe); } }
  for (const e of extras.filter((e) => e.type === 'mane')) { const M = it.mane; const N = 9; for (let q = 0; q < N; q++) { const t = q / (N - 1); const sp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), mat(M.color)); sp.scale.set(0.7, 1.6, 1.1); sp.position.set(0, e.top + 0.05 - t * (e.top - 2.2), 0.15 - t * 0.6); sp.rotation.x = -0.5 - t * 0.6; addX(sp); } }
  for (const e of extras.filter((e) => e.type === 'tuft')) { for (let q = 0; q < 3; q++) { const t = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), mat(it.tuft.color)); t.scale.set(0.8, 2.6 - q * 0.5, 0.8); t.position.set(e.p.x + e.side * (q - 1) * 0.05, e.p.y + 0.02 - q * 0.03, e.p.z + (q - 1) * 0.03); t.rotation.z = -e.side * (0.15 + q * 0.25); addX(t); } }
  if (it.tail) { const T = it.tail; const curve = new THREE.CatmullRomCurve3(T.pts.map((p) => new THREE.Vector3(...p))); const TS = 64, RS = 20; const geo = new THREE.TubeGeometry(curve, TS, 1, RS, false); const P = geo.attributes.position; const cols = []; const base = new THREE.Color(T.color), tip = new THREE.Color(T.tip);
    for (let i = 0; i < P.count; i++) { const seg = Math.floor(i / (RS + 1)); const t = seg / TS; const c = curve.getPoint(t); const prof = T.thin ? T.r * (1 - 0.3 * t) : T.r * (0.35 + 1.0 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.15 + t * 0.95)), 0.7)); const fluff = 1 + 0.08 * Math.sin((i % (RS + 1)) * 2.1 + seg * 0.9);
      P.setXYZ(i, c.x + (P.getX(i) - c.x) * prof * fluff, c.y + (P.getY(i) - c.y) * prof * fluff, c.z + (P.getZ(i) - c.z) * prof * fluff); const k = base.clone().lerp(tip, Math.max(0, (t - 0.72) / 0.28)); cols.push(k.r, k.g, k.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); geo.computeVertexNormals(); const tm = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })); addX(tm);
    for (const e of [0, 1]) { const cap = new THREE.Mesh(new THREE.SphereGeometry(T.r * (T.thin ? (e ? T.tipR || 1 : 1) : 0.4), 16, 12), mat(e ? T.tip : T.color)); if (T.thin && e && T.tipR) cap.scale.set(0.8, 1.4, 0.8); cap.position.copy(curve.getPoint(e)); addX(cap); } }
  if (it.acc) for (const A of it.acc) { const g3 = (await L.loadAsync(A.f)).scene; if (A.color) g3.traverse((q) => { if (q.isMesh) { q.material = q.material.clone(); q.material.map = null; q.material.color = new THREE.Color(A.color); } }); g3.rotation.fromArray(A.rot || [0, 0, 0]); g3.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(g3), sz = bb.getSize(new THREE.Vector3()), cc = bb.getCenter(new THREE.Vector3()); const sc2 = A.w / sz.x; const wrap = new THREE.Group(); g3.position.sub(cc); wrap.add(g3); wrap.scale.setScalar(sc2); wrap.position.fromArray(A.p); addX(wrap); }
  if (it.prim) for (const P2 of it.prim) { const geo = P2.g === 'cyl' ? new THREE.CylinderGeometry(P2.r, P2.r2 ?? P2.r, P2.h, 24) : P2.g === 'torus' ? new THREE.TorusGeometry(P2.r, P2.t, 12, 24) : new THREE.SphereGeometry(P2.r, 24, 16); const mm = new THREE.Mesh(geo, mat(P2.color)); mm.position.fromArray(P2.p); if (P2.s) mm.scale.fromArray(P2.s); if (P2.rot) mm.rotation.fromArray(P2.rot); addX(mm); }
  if (it.add) for (const a of it.add) { const m = new THREE.Mesh(a.geo === 'sphere' ? new THREE.SphereGeometry(a.r, 20, 14) : new THREE.CylinderGeometry(a.r, a.r, a.h, 20), mat(a.color)); m.position.fromArray(a.p); if (a.s) m.scale.fromArray(a.s); addX(m); }
  o.userData.anims = it._anims; o.userData.added = added; return o; }

// ---------- physics rig ----------
export function rig(o, opt = {}) {
  o.updateMatrixWorld(true); let body = null, hair = null; o.traverse((q) => { if (q.isSkinnedMesh && (q.name === 'Rabbit' || q.name === 'Panda')) body = q; if (q.isSkinnedMesh && q.name === 'Hair') hair = q; });
  const bone = (n) => { let r = null; o.traverse((q) => { if (q.isBone && q.name === n) r = q; }); return r; };
  const head = bone('Head'), hips = bone('Hips');
  // attach static extras to bones
  for (const q of o.userData.added || []) { const bb = new THREE.Box3().setFromObject(q); const c = bb.getCenter(new THREE.Vector3()); const tgt = c.y > 2.05 ? head : hips; if (tgt) tgt.attach(q); }
  const springs = [];
  if (body && head && opt.ears !== false) {
    const geo = body.geometry, P = geo.attributes.position, SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight; const sk = body.skeleton; const bones = sk.bones.slice(), inv = sk.boneInverses.slice();
    const yb = opt.earBase ?? 3.15; const headW = head.matrixWorld.clone(); const headInvW = headW.clone().invert(); const headQ = new THREE.Quaternion(); head.getWorldQuaternion(headQ);
    for (const sd of [-1, 1]) { let n = 0, cx = 0, cz = 0, ymax = -9; for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i); if (x * sd < 0.12 || y < yb) continue; n++; cx += x; cz += P.getZ(i); ymax = Math.max(ymax, y); } if (n < 10) continue; cx /= n; cz /= n;
      const base = new THREE.Vector3(cx, yb + 0.05, cz).applyMatrix4(body.bindMatrix); const b = new THREE.Bone(); b.name = 'Ear' + sd; head.add(b); b.position.copy(base.clone().applyMatrix4(headInvW)); b.quaternion.copy(headQ.clone().invert()); b.updateMatrixWorld(true);
      bones.push(b); inv.push(b.matrixWorld.clone().invert()); const bi = bones.length - 1; const len = ymax - yb;
      const hidx = sk.bones.indexOf(head); for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i); if (x * sd < 0.12 || y < yb - 0.02) continue; const w = Math.min(1, Math.max(0, (y - yb + 0.02) / 0.25)); SI.setXYZW(i, bi, hidx, 0, 0); SW.setXYZW(i, w, 1 - w, 0, 0); }
      springs.push({ b, len, k: opt.earK ?? 60, d: opt.earD ?? 7, max: 0.9 }); }
    SI.needsUpdate = true; SW.needsUpdate = true;
    // ---- hair strands ----
    if (hair && hair.visible && opt.hair !== false) { const HG = hair.geometry, HP = HG.attributes.position, HI = HG.index, HSI = HG.attributes.skinIndex, HSW = HG.attributes.skinWeight; const nv = HP.count; const par = new Int32Array(nv).map((_, i) => i); const f = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
      for (let t = 0; t < HI.count; t += 3) { const a = f(HI.getX(t)), b = f(HI.getX(t + 1)), c = f(HI.getX(t + 2)); par[b] = a; par[f(c)] = a; }
      const key = new Map(); for (let v = 0; v < nv; v++) { const k = HP.getX(v).toFixed(4) + ',' + HP.getY(v).toFixed(4) + ',' + HP.getZ(v).toFixed(4); if (key.has(k)) par[f(v)] = f(key.get(k)); else key.set(k, v); }
      const comps = new Map(); for (let v = 0; v < nv; v++) { const r = f(v); if (!comps.has(r)) comps.set(r, []); comps.get(r).push(v); }
      // head sphere (bind space)
      let hc = new THREE.Vector3(), hn = 0; const BP = body.geometry.attributes.position; for (let i = 0; i < BP.count; i++) { const y = BP.getY(i); if (y > 2.3 && y < 3.15) { hc.x += BP.getX(i); hc.y += y; hc.z += BP.getZ(i); hn++; } } hc.divideScalar(hn); let hr = 0; for (let i = 0; i < BP.count; i++) { const y = BP.getY(i); if (y > 2.3 && y < 3.15) hr += Math.hypot(BP.getX(i) - hc.x, y - hc.y, BP.getZ(i) - hc.z); } hr = (hr / hn) * 1.02;
      const hidx = sk.bones.indexOf(head); const headQ2 = new THREE.Quaternion(); head.getWorldQuaternion(headQ2); const strands = [];
      for (const vs of comps.values()) { if (vs.length < 30) continue; let root = null, tip = null, dmin = 1e9, dmax = -1; for (const v of vs) { const p = new THREE.Vector3(HP.getX(v), HP.getY(v), HP.getZ(v)); const d = p.distanceTo(hc); if (d < dmin) { dmin = d; root = p; } }
        for (const v of vs) { const p = new THREE.Vector3(HP.getX(v), HP.getY(v), HP.getZ(v)); const d = p.distanceTo(root); if (d > dmax) { dmax = d; tip = p; } } if (dmax < 0.25) continue;
        const NB = 3; const axis = tip.clone().sub(root); const L = axis.length(); const joints = []; for (let k = 0; k <= NB; k++) joints.push(root.clone().addScaledVector(axis, k / NB));
        const chain = []; let parent = head; for (let k = 0; k < NB; k++) { const b = new THREE.Bone(); b.name = 'HairB'; parent.add(b); const wpos = joints[k].clone().applyMatrix4(hair.bindMatrix); b.position.copy(parent.worldToLocal(wpos)); const pq2 = new THREE.Quaternion(); parent.getWorldQuaternion(pq2); b.quaternion.copy(pq2.invert()); b.updateMatrixWorld(true); bones.push(b); inv.push(b.matrixWorld.clone().invert()); chain.push({ b, i: bones.length - 1 }); parent = b; }
        const tipObj = new THREE.Object3D(); chain[NB - 1].b.add(tipObj); tipObj.position.copy(chain[NB - 1].b.worldToLocal(joints[NB].clone().applyMatrix4(hair.bindMatrix)));
        for (const v of vs) { const p = new THREE.Vector3(HP.getX(v), HP.getY(v), HP.getZ(v)); let t = Math.max(0, Math.min(0.9999, p.clone().sub(root).dot(axis) / (L * L))) * NB; const k = Math.floor(t), w = t - k; const ia = chain[k].i, ib = k + 1 < NB ? chain[k + 1].i : chain[k].i; const rootW = Math.max(0, 1 - t * 1.5) * 0.6; // near root, keep some head weight
          HSI.setXYZW(v, ia, ib, hidx, 0); const wa = (1 - w) * (1 - rootW), wb = w * (1 - rootW); HSW.setXYZW(v, wa, wb, rootW, 0); }
        strands.push({ chain, tipObj, L }); }
      HSI.needsUpdate = true; HSW.needsUpdate = true; o.userData.hairStrands = strands; o.userData.headSphere = { c: hc, r: hr }; o.userData.headInv = sk.boneInverses[hidx].clone(); }
    const nsk = new THREE.Skeleton(bones, inv); body.bind(nsk, body.bindMatrix);
    if (hair) hair.bind(nsk, hair.bindMatrix); }
  // tail spring: wrap tail meshes (attached to hips, low & behind) in pivot
  for (const q of o.userData.added || []) { if (q.parent !== hips) continue; const bb = new THREE.Box3().setFromObject(q); if (bb.getCenter(new THREE.Vector3()).z > -0.2) continue; }
  const tails = (o.userData.added || []).filter((q) => q.parent === hips && new THREE.Box3().setFromObject(q).getCenter(new THREE.Vector3()).z < -0.3);
  if (tails.length && hips) { const tb = new THREE.Box3(); tails.forEach((q) => tb.expandByObject(q)); const piv = new THREE.Object3D(); const baseW = new THREE.Vector3((tb.min.x + tb.max.x) / 2, tb.min.y, tb.max.z); hips.add(piv); piv.position.copy(hips.worldToLocal(baseW.clone())); const hq = new THREE.Quaternion(); hips.getWorldQuaternion(hq); piv.quaternion.copy(hq.invert()); tails.forEach((q) => piv.attach(q)); springs.push({ b: piv, len: tb.max.y - tb.min.y, k: 40, d: 5, max: 0.7 }); }
  // init spring state
  for (const s of springs) { s.b.updateMatrixWorld(true); s.rest = s.b.quaternion.clone(); s.tip = new THREE.Vector3(0, s.len, 0).applyMatrix4(s.b.matrixWorld); s.vel = new THREE.Vector3(); }
  const up = new THREE.Vector3(0, 1, 0), tmpQ = new THREE.Quaternion(), pq = new THREE.Quaternion();
  const HS = o.userData.hairStrands || [], HSph = o.userData.headSphere; const earBones = springs.filter((q) => q.b.isBone && q.b.name.startsWith('Ear'));
  for (const st of HS) { st.restQ = st.chain.map((c) => c.b.quaternion.clone()); st.p = []; st.v = []; }
  const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
  function hairStep(dt) { if (!HS.length) return; const M = head.matrixWorld.clone().multiply(o.userData.headInv).multiply(body.bindMatrix); const hcW = HSph.c.clone().applyMatrix4(M); const sc = new THREE.Vector3().setFromMatrixScale(M).x; const hrW = HSph.r * sc;
    for (const st of HS) { const N = st.chain.length; st.chain.forEach((c, k) => c.b.quaternion.copy(st.restQ[k])); st.chain[0].b.updateMatrixWorld(true);
      const rest = st.chain.map((c) => new THREE.Vector3().setFromMatrixPosition(c.b.matrixWorld)); rest.push(new THREE.Vector3().setFromMatrixPosition(st.tipObj.matrixWorld));
      if (!st.p.length) { st.p = rest.map((q) => q.clone()); st.v = rest.map(() => new THREE.Vector3()); }
      st.p[0].copy(rest[0]); const segL = rest[0].distanceTo(rest[1]);
      for (let k = 1; k <= N; k++) { const a = rest[k].clone().sub(st.p[k]).multiplyScalar(opt.hairK ?? 45).addScaledVector(st.v[k], -(opt.hairD ?? 6)); a.y -= 6 * segL; st.v[k].addScaledVector(a, dt); st.p[k].addScaledVector(st.v[k], dt);
        const d = st.p[k].clone().sub(st.p[k - 1]); st.p[k].copy(st.p[k - 1]).addScaledVector(d.normalize(), rest[k].distanceTo(rest[k - 1]));
        const hd = st.p[k].clone().sub(hcW); const hl = hd.length(); if (hl < hrW) st.p[k].copy(hcW).addScaledVector(hd.normalize(), hrW);
        for (const e of earBones) { const eo = new THREE.Vector3().setFromMatrixPosition(e.b.matrixWorld); const et = e.tip; const ax = et.clone().sub(eo); const t = Math.max(0, Math.min(1, st.p[k].clone().sub(eo).dot(ax) / ax.lengthSq())); const cp = eo.clone().addScaledVector(ax, t); const dd = st.p[k].clone().sub(cp); const er = 0.17 * sc; if (dd.length() < er) st.p[k].copy(cp).addScaledVector(dd.normalize(), er); } }
      for (let k = 0; k < N; k++) { const b = st.chain[k].b; b.quaternion.copy(st.restQ[k]); b.updateMatrixWorld(true); const r0 = new THREE.Vector3().setFromMatrixPosition(b.matrixWorld); const rNext = k + 1 < N ? new THREE.Vector3().setFromMatrixPosition(st.chain[k + 1].b.matrixWorld) : new THREE.Vector3().setFromMatrixPosition(st.tipObj.matrixWorld);
        const restDir = rNext.sub(r0).normalize(); const curDir = st.p[k + 1].clone().sub(st.p[k]).normalize(); _q.setFromUnitVectors(restDir, curDir); b.getWorldQuaternion(_q2); const newW = _q.clone().multiply(_q2); const pw = new THREE.Quaternion(); b.parent.getWorldQuaternion(pw); b.quaternion.copy(pw.invert().multiply(newW)); b.updateMatrixWorld(true); } } }
  return function step(dt) {
    dt = Math.min(dt, 1 / 30);
    for (const s of springs) { s.b.quaternion.copy(s.rest); s.b.updateMatrixWorld(true); const target = new THREE.Vector3(0, s.len, 0).applyMatrix4(s.b.matrixWorld); const origin = new THREE.Vector3().setFromMatrixPosition(s.b.matrixWorld);
      const acc = target.clone().sub(s.tip).multiplyScalar(s.k).addScaledVector(s.vel, -s.d); acc.y -= 1.0 * target.distanceTo(origin); s.vel.addScaledVector(acc, dt); s.tip.addScaledVector(s.vel, dt);
      const wl = target.distanceTo(origin); const dir = s.tip.clone().sub(origin).normalize(); s.tip.copy(origin).addScaledVector(dir, wl);
      // to local of bone's parent-rest frame
      s.b.parent.getWorldQuaternion(pq); const restW = pq.clone().multiply(s.rest); const localDir = dir.clone().applyQuaternion(restW.clone().invert()); tmpQ.setFromUnitVectors(up, localDir);
      const ang = 2 * Math.acos(Math.min(1, Math.abs(tmpQ.w))); if (ang > s.max) tmpQ.slerp(new THREE.Quaternion(), 1 - s.max / ang);
      s.b.quaternion.copy(s.rest).multiply(tmpQ); }
    hairStep(dt);
  };
}
