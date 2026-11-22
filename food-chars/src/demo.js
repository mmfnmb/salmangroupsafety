import * as THREE from 'three'; import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'; import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { build, rig } from './charlib.js';
const CH = window.CHARS;
const r = new THREE.WebGLRenderer({ antialias: true }); r.setPixelRatio(Math.min(2, devicePixelRatio)); r.setSize(innerWidth, innerHeight); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.shadowMap.enabled = true; document.body.appendChild(r.domElement);
const sc = new THREE.Scene(); sc.background = new THREE.Color(0xbfe3ff); sc.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture; sc.environmentIntensity = 0.5;
const cam = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 200); cam.position.set(0, 7.5, 14); const oc = new OrbitControls(cam, r.domElement); oc.target.set(0, 2, 0); oc.update();
sc.add(new THREE.HemisphereLight(0xffffff, 0x88aa66, 1.3)); const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(6, 12, 8); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15 }); sc.add(sun);
const ground = new THREE.Mesh(new THREE.CircleGeometry(14, 48), new THREE.MeshStandardMaterial({ color: 0x8fd06a })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; sc.add(ground);
const path = new THREE.Mesh(new THREE.RingGeometry(5.3, 6.7, 64), new THREE.MeshStandardMaterial({ color: 0xe8d6a8 })); path.rotation.x = -Math.PI / 2; path.position.y = 0.01; sc.add(path);
const msg = document.getElementById('msg'); const actors = []; let running = true;
(async () => {
  for (let i = 0; i < CH.length; i++) { const o = await build(CH[i]); o.traverse((q) => { if (q.isMesh) { q.castShadow = true; q.frustumCulled = false; } });
    const step = rig(o, CH[i].rig || {}); const root = new THREE.Group(); root.add(o); root.scale.setScalar(0.6); sc.add(root); const mix = new THREE.AnimationMixer(o); const A = {}; for (const c of o.userData.anims) A[c.name] = mix.clipAction(c);
    const a = { root, o, step, mix, A, ang: i * (Math.PI * 2 / CH.length), cur: null, jumpT: 0 }; play(a, 'Run'); actors.push(a); }
  msg.textContent = 'اسحب بصباعك عشان تلف الكاميرا';
})();
function play(a, n, once) { const x = a.A[n]; if (!x) return; if (a.cur && a.cur !== x) a.cur.fadeOut(0.15); x.reset().setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); x.clampWhenFinished = true; x.fadeIn(0.15).play(); a.cur = x; }
document.getElementById('jump').onclick = () => { for (const a of actors) { a.jumpT = 0.9; play(a, 'Jump', true); } };
document.getElementById('run').onclick = (e) => { running = !running; e.target.textContent = running ? 'وقّف' : 'اجري'; for (const a of actors) play(a, running ? 'Run' : 'Idle'); };
document.getElementById('shake').onclick = () => { for (const a of actors) a.shake = 0.6; };
const clk = new THREE.Clock();
r.setAnimationLoop(() => { const dt = Math.min(clk.getDelta(), 0.05);
  for (const a of actors) { if (running) a.ang += dt * 0.55; const R = 6; a.root.position.set(Math.cos(a.ang) * R, 0, Math.sin(a.ang) * R); a.root.rotation.y = running ? -a.ang : a.root.rotation.y;
    if (a.jumpT > 0) { a.jumpT -= dt; const t = 1 - a.jumpT / 0.9; a.root.position.y = Math.sin(Math.PI * t) * 1.6; if (a.jumpT <= 0) play(a, running ? 'Run' : 'Idle'); }
    if (a.shake > 0) { a.shake -= dt; a.root.rotation.z = Math.sin(a.shake * 40) * 0.25 * a.shake; } else a.root.rotation.z = 0;
    a.mix.update(dt); a.o.updateMatrixWorld(true); a.step(dt); }
  r.render(sc, cam); });
addEventListener('resize', () => { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); r.setSize(innerWidth, innerHeight); });
