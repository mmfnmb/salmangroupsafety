// Online talk: a text chat with quick messages, and real voice (WebRTC, signalled through the game room) heard in 3D
// from where the other player stands. If the browser or the page refuses the microphone, it falls back to a
// walkie-talkie: speech is turned into text (dictation) and read out on the other side (tts).
import * as net from './net.js';

const $ = (id) => document.getElementById(id);
let ac = null, myStream = null, analyser = null, level = 0, muted = false, mode = 'off', dict = null, tts = null;
const peers = new Map(); // pid -> { pc, panner, gain, el }
let onSpeak = null, nameOf = () => '';

export function initChat(t, getName, onMsgSpeak) { nameOf = getName; onSpeak = onMsgSpeak;
  net.on('ev', (d) => { if (d.t === 'chat') show(d.name, d.text, d.voice); else if (d.t === 'rtc') signal(d); });
  $('chatIn').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { send($('chatIn').value); $('chatIn').value = ''; closeChat(); } else if (e.key === 'Escape') closeChat(); });
  $('chatQuick').innerHTML = ['q_come', 'q_run', 'q_hide', 'q_found'].map((k) => `<button class="cbtn" data-q="${k}">${t(k)}</button>`).join('');
  $('chatQuick').querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => { send(b.textContent); closeChat(); }));
}
export function openChat() { if (!net.inRoom()) return false; $('chatBox').hidden = false; setTimeout(() => $('chatIn').focus(), 30); if (document.pointerLockElement) document.exitPointerLock(); return true; }
export function closeChat() { $('chatBox').hidden = true; $('chatIn').blur(); }
export const chatOpen = () => !$('chatBox').hidden;
function send(text, voice) { text = (text || '').trim().slice(0, 160); if (!text) return; net.emit('ev', { t: 'chat', name: nameOf(), text, voice: !!voice }); show(nameOf(), text, voice, true); }
function show(name, text, voice, mine) { const el = document.createElement('div'); el.className = 'chatLine'; el.innerHTML = `<b></b> <span></span>`; el.querySelector('b').textContent = (voice ? '[radio] ' : '') + name + ':'; el.querySelector('span').textContent = text;
  $('chatLog').appendChild(el); while ($('chatLog').children.length > 6) $('chatLog').firstChild.remove(); setTimeout(() => el.classList.add('fade'), 7000); setTimeout(() => el.remove(), 9000);
  if (voice && !mine && tts) tts.speak(text, { voice: 'airy' }).catch(() => {}); if (!mine && onSpeak) onSpeak(); }

// ---------------------------------------------------------------- real voice
export async function startVoice(audioCtx) { ac = audioCtx; if (mode !== 'off' || !net.inRoom()) return mode;
  try { myStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const src = ac.createMediaStreamSource(myStream); analyser = ac.createAnalyser(); analyser.fftSize = 512; src.connect(analyser); mode = 'rtc';
    net.emit('ev', { t: 'rtc', k: 'hello', from2: net.PID }); setStatus('mic_on'); }
  catch (e) { await startWalkie(); }
  return mode; }
async function startWalkie() { const use = (n) => (window.claude && window.claude.use ? window.claude.use(n).catch(() => null) : Promise.resolve(null)); [dict, tts] = await Promise.all([use('dictation'), use('tts')]);
  mode = 'walkie'; setStatus(dict ? 'mic_walkie' : 'mic_text');
  if (dict) dict.onFinal(({ text }) => send(text, true)); }
export async function talkDown() { if (mode === 'walkie' && dict) { try { await dict.start(); setStatus('mic_talking'); } catch (e) { setStatus('mic_text'); } } }
export async function talkUp() { if (mode === 'walkie' && dict) { try { await dict.stop(); } catch (e) {} setStatus('mic_walkie'); } }
export function toggleMute() { muted = !muted; if (myStream) myStream.getAudioTracks().forEach((tr) => (tr.enabled = !muted)); setStatus(muted ? 'mic_muted' : 'mic_on'); }
function setStatus(k) { const e = $('micState'); if (e) { e.dataset.k = k; e.textContent = window.__t ? window.__t(k) : k; e.hidden = false; } }
const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
function peer(pid) { let p = peers.get(pid); if (p) return p; const pc = new RTCPeerConnection(ICE); p = { pc }; peers.set(pid, p);
  if (myStream) myStream.getTracks().forEach((tr) => pc.addTrack(tr, myStream));
  pc.onicecandidate = (e) => e.candidate && net.emit('ev', { t: 'rtc', k: 'ice', to: pid, c: e.candidate });
  pc.ontrack = (e) => { const el = new Audio(); el.srcObject = e.streams[0]; el.muted = true; el.play().catch(() => {}); p.el = el; // the element keeps the stream alive; sound goes through the panner
    const src = ac.createMediaStreamSource(e.streams[0]); p.panner = ac.createPanner(); p.panner.panningModel = 'HRTF'; p.panner.distanceModel = 'inverse'; p.panner.refDistance = 2; p.panner.maxDistance = 40; p.panner.rolloffFactor = 1.3;
    p.gain = ac.createGain(); src.connect(p.panner); p.panner.connect(p.gain); p.gain.connect(ac.destination); };
  pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed' && mode === 'rtc') { setStatus('mic_fail'); } };
  return p; }
async function signal(d) { if (mode !== 'rtc' || d.from === net.PID) return; if (d.to && d.to !== net.PID) return;
  try {
    if (d.k === 'hello') { if (net.PID < d.from) { const p = peer(d.from); const o = await p.pc.createOffer(); await p.pc.setLocalDescription(o); net.emit('ev', { t: 'rtc', k: 'offer', to: d.from, sdp: o }); } else net.emit('ev', { t: 'rtc', k: 'hello', to: d.from }); }
    else if (d.k === 'offer') { const p = peer(d.from); await p.pc.setRemoteDescription(d.sdp); const a = await p.pc.createAnswer(); await p.pc.setLocalDescription(a); net.emit('ev', { t: 'rtc', k: 'answer', to: d.from, sdp: a }); }
    else if (d.k === 'answer') { const p = peers.get(d.from); if (p) await p.pc.setRemoteDescription(d.sdp); }
    else if (d.k === 'ice') { const p = peers.get(d.from); if (p) await p.pc.addIceCandidate(d.c); }
  } catch (e) { console.warn('rtc', e); } }
// every frame: place the other voices where their bodies are (behind walls they sound muffled), and measure my own voice
export function updateVoice(me, others, losFn) {
  if (ac && ac.listener && ac.listener.positionX) { const l = ac.listener; l.positionX.value = me.x; l.positionY.value = 1.6; l.positionZ.value = me.z; l.forwardX.value = -Math.sin(me.yaw); l.forwardY.value = 0; l.forwardZ.value = -Math.cos(me.yaw); l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0; }
  for (const [pid, p] of peers) { if (!p.panner) continue; const o = others.get(pid); if (!o || o.f == null) continue; p.panner.positionX.value = o.x; p.panner.positionY.value = 1.6; p.panner.positionZ.value = o.z;
    const same = o.f === me.f, clear = same && losFn(o.x, o.z); p.gain.gain.value = !same ? 0.15 : clear ? 1 : 0.45; }
  if (analyser && !muted) { const a = new Uint8Array(analyser.fftSize); analyser.getByteTimeDomainData(a); let s = 0; for (const v of a) s += ((v - 128) / 128) ** 2; level = Math.sqrt(s / a.length); } else level = 0;
  return level; }
export const voiceMode = () => mode;
