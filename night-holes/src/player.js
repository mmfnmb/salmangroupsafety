// First-person player: keyboard+mouse on desktop, joystick + look-drag + buttons on phones.
import * as THREE from 'three';
import { FLOOR_Y } from './world.js';
import { sfx } from './audio.js';

export class Player {
  constructor(camera, scene, low) {
    this.cam = camera; this.f = 0; this.x = 0; this.z = 0; this.yaw = 0; this.pitch = 0; this.vy = 0;
    this.stamina = 1; this.crouch = false; this.running = false; this.hidden = null; this.dead = false; this.ghost = false; this.locked = false;
    this.battery = 1; this.lightOn = true; this.bob = 0; this.stepT = 0; this.noise = 0; this.keys = {}; this.move = [0, 0]; this.runBtn = false;
    this.flash = new THREE.SpotLight(0xfff1d6, 8, 20, 0.5, 0.9, 1.6); this.flash.castShadow = !low; if (!low) { this.flash.shadow.mapSize.set(512, 512); this.flash.shadow.camera.near = 0.2; }
    this.flash.position.set(0.2, -0.15, 0); camera.add(this.flash); camera.add(this.flash.target); this.flash.target.position.set(0, -0.2, -3);
    this.fill = new THREE.PointLight(0x8090b0, 0.6, 4, 2); camera.add(this.fill); scene.add(camera);
    this.lighter = new THREE.PointLight(0xff9a40, 0, 6, 1.8); this.lighter.position.set(0.25, -0.2, -0.4); camera.add(this.lighter); this.lighterOn = false; this.adrT = 0; this.glitchT = 0; this.scentT = 0;
    this.bindDesktop();
  }
  bindDesktop() {
    addEventListener('keydown', (e) => { this.keys[e.code] = true; if (this.onKey) this.onKey(e.code); });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    addEventListener('mousemove', (e) => { if (document.pointerLockElement && !this.locked) this.look(e.movementX * 0.0022, e.movementY * 0.0022); });
  }
  look(dx, dy) { this.yaw -= dx; this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch - dy)); }
  place(f, x, z, yaw = 0) { this.f = f; this.x = x; this.z = z; this.yaw = yaw; }
  update(dt, W) {
    let mx = this.move[0], mz = this.move[1];
    if (this.keys.KeyW || this.keys.ArrowUp) mz -= 1; if (this.keys.KeyS || this.keys.ArrowDown) mz += 1; if (this.keys.KeyA || this.keys.ArrowLeft) mx -= 1; if (this.keys.KeyD || this.keys.ArrowRight) mx += 1;
    const len = Math.hypot(mx, mz); if (len > 1) { mx /= len; mz /= len; }
    const moving = len > 0.15 && !this.locked && !this.hidden;
    const wantRun = (this.keys.ShiftLeft || this.keys.ShiftRight || this.runBtn) && moving && !this.crouch;
    if (this.adrT > 0) { this.adrT -= dt; this.stamina = 1; } this.glitchT = Math.max(0, this.glitchT - dt); this.scentT = Math.max(0, this.scentT - dt);
    this.running = wantRun && this.stamina > 0.02;
    this.stamina = Math.max(0, Math.min(1, this.stamina + (this.running ? -dt / 6 : dt / (moving ? 9 : 5))));
    const speed = this.ghost ? 6 : this.crouch ? 1.3 : this.running ? (this.adrT > 0 ? 5.9 : 5.0) : 2.6;
    if (moving) {
      const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
      let nx = this.x + (mx * c + mz * s) * speed * dt, nz = this.z + (-mx * s + mz * c) * speed * dt;
      if (!this.ghost) [nx, nz] = W.collide(this.f, nx, nz, 0.32);
      this.x = nx; this.z = nz;
      this.bob += dt * speed * 2.2; this.stepT -= dt * speed;
      if (this.stepT <= 0 && !this.ghost) { this.stepT = 1.25; if (!this.crouch) sfx.step(this.running); }
    }
    this.noise = !moving || this.ghost ? 0 : this.crouch ? 0.6 : this.running ? 11 : 4.2;
    // flashlight battery
    if (this.lightOn && !this.hidden) this.battery = Math.max(0, this.battery - dt / 260);
    const flick = (this.battery < 0.15 ? (Math.random() < 0.1 ? 0.2 : 1) : 1) * (this.glitchT > 0 ? (Math.random() < 0.5 ? 0 : 0.4) : 1);
    this.lighter.intensity = this.lighterOn && !this.hidden ? 1.6 + Math.sin(performance.now() * 0.03) * 0.25 + Math.random() * 0.3 : 0;
    this.flash.intensity = this.lightOn && this.battery > 0 && !this.hidden ? 8 * (0.45 + 0.55 * Math.min(1, this.battery * 3)) * flick : 0;
    // camera
    const eye = this.hidden ? 1.55 : this.crouch ? 1.05 : 1.62;
    const by = moving ? Math.sin(this.bob) * (this.running ? 0.07 : 0.035) : 0;
    this.cam.position.set(this.x, FLOOR_Y[this.f] + eye + by, this.z);
    this.cam.rotation.set(this.pitch, this.yaw, moving ? Math.sin(this.bob * 0.5) * 0.008 : 0, 'YXZ');
  }
}

// on-screen phone controls: left joystick, right half drag to look, action buttons are plain HTML
export function bindTouch(el, P) {
  const stick = { id: null, ox: 0, oy: 0 }, lookT = { id: null, x: 0, y: 0 };
  const base = document.getElementById('stick'), knob = document.getElementById('knob');
  el.addEventListener('touchstart', (e) => { for (const t of e.changedTouches) {
    if (t.clientX < innerWidth * 0.45 && stick.id === null) { stick.id = t.identifier; stick.ox = t.clientX; stick.oy = t.clientY; base.style.left = (t.clientX - 60) + 'px'; base.style.top = (t.clientY - 60) + 'px'; base.hidden = false; }
    else if (lookT.id === null) { lookT.id = t.identifier; lookT.x = t.clientX; lookT.y = t.clientY; } } e.preventDefault(); }, { passive: false });
  el.addEventListener('touchmove', (e) => { for (const t of e.changedTouches) {
    if (t.identifier === stick.id) { let dx = t.clientX - stick.ox, dy = t.clientY - stick.oy; const l = Math.hypot(dx, dy), m = 55; if (l > m) { dx *= m / l; dy *= m / l; } P.move = [dx / m, dy / m]; knob.style.transform = `translate(${dx}px,${dy}px)`; }
    else if (t.identifier === lookT.id) { if (!P.locked) P.look((t.clientX - lookT.x) * 0.006, (t.clientY - lookT.y) * 0.006); lookT.x = t.clientX; lookT.y = t.clientY; } } e.preventDefault(); }, { passive: false });
  const end = (e) => { for (const t of e.changedTouches) { if (t.identifier === stick.id) { stick.id = null; P.move = [0, 0]; knob.style.transform = ''; base.hidden = true; } if (t.identifier === lookT.id) lookT.id = null; } };
  el.addEventListener('touchend', end); el.addEventListener('touchcancel', end);
}
