// The "camera": everything is filmed through a cheap body-camera lens. Bloom on bright lights, frame blending
// (motion blur), barrel distortion, chromatic fringes, sensor grain, vignette, slow eye adaptation and a glitch
// channel used by jumpscares and the flashlight. Low quality skips the composer and draws straight to screen.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const LensShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, grain: { value: 0.07 }, distort: { value: 0.06 }, ca: { value: 0.0018 }, vig: { value: 0.9 }, glitch: { value: 0 }, exposure: { value: 1 }, sway: { value: new THREE.Vector2() }, red: { value: 0 }, bw: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, grain, distort, ca, vig, glitch, exposure, red, bw; uniform vec2 sway; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
  void main(){
    vec2 uv = vUv; vec2 c = uv - 0.5; float r2 = dot(c,c);
    uv = 0.5 + c * (1.0 + distort * r2) / (1.0 + distort * 0.25) + sway;
    if (glitch > 0.0) { float band = floor(uv.y * 24.0 + time * 13.0); float j = step(1.0 - glitch * 0.6, h(vec2(band, floor(time*20.0)))); uv.x += (h(vec2(band, time)) - 0.5) * 0.12 * glitch * j; }
    vec2 dir = c * (ca + glitch * 0.02);
    vec3 col = vec3(texture2D(tDiffuse, uv + dir).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - dir).b);
    col *= exposure;
    float n = h(uv * vec2(1920.0,1080.0) + fract(time * 7.13) * 100.0) - 0.5; col += n * grain * (1.2 - dot(col, vec3(0.33)));
    col *= mix(1.0, smoothstep(0.85, 0.15, r2 * 1.6), vig);
    float l = dot(col, vec3(0.299,0.587,0.114)); col = mix(col, vec3(l), bw);
    col = mix(col, vec3(l * 1.4, l * 0.12, l * 0.1), red);
    if (glitch > 0.3) col *= 0.85 + 0.15 * sin(vUv.y * 900.0 + time * 50.0);
    gl_FragColor = vec4(col, 1.0);
  }`,
};

export class Post {
  constructor(renderer, scene, camera) {
    this.r = renderer; this.scene = scene; this.camera = camera; this.high = true; this.t = 0; this.expTarget = 1; this.glitchT = 0; this.shake = 0;
    this.lens = new ShaderPass(LensShader); this.u = this.lens.uniforms;
    this.composer = new EffectComposer(renderer); this.renderPass = new RenderPass(scene, camera);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.5, 0.82); this.after = new AfterimagePass(0.32);
    this.composer.addPass(this.renderPass); this.composer.addPass(this.bloom); this.composer.addPass(this.after); this.composer.addPass(new OutputPass()); this.composer.addPass(this.lens);
  }
  setQuality(high) { this.high = high; this.r.setPixelRatio(Math.min(devicePixelRatio, high ? 1.5 : 1)); this.r.shadowMap.enabled = high; this.resize(); }
  resize() { const w = innerWidth, h = innerHeight; this.r.setSize(w, h, false); this.composer.setPixelRatio(this.r.getPixelRatio()); this.composer.setSize(w, h); this.bloom.resolution.set(w / 2, h / 2); }
  glitch(sec) { this.glitchT = Math.max(this.glitchT, sec); }
  // scene and camera can be swapped (house, car, garage, lab, ending all use the same lens)
  render(scene, camera, dt) {
    this.t += dt; this.glitchT = Math.max(0, this.glitchT - dt);
    this.u.exposure.value += (this.expTarget - this.u.exposure.value) * Math.min(1, dt * 0.8);
    this.u.time.value = this.t; this.u.glitch.value = Math.min(1, this.glitchT * 1.5);
    this.u.sway.value.set(Math.sin(this.t * 0.9) * 0.0012 + Math.sin(this.t * 2.3) * 0.0005, Math.sin(this.t * 1.3) * 0.001);
    if (!this.high) { this.r.toneMappingExposure = 1.1 * this.u.exposure.value; this.r.render(scene, camera); return; }
    this.r.toneMappingExposure = 1.1; this.renderPass.scene = scene; this.renderPass.camera = camera; this.composer.render(dt);
  }
}
