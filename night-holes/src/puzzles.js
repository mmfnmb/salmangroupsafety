// Puzzle overlays. Each opens a panel; solving calls done(). The world keeps running behind the panel.
import { t } from './i18n.js';
import { sfx } from './audio.js';

const el = () => document.getElementById('panel');
function open(title, hint, body) {
  const p = el(); p.innerHTML = `<div class="pbox"><div class="phead"><b>${title}</b><button class="pclose" id="pclose">${t('close')}</button></div><p class="phint">${hint}</p><div class="pbody"></div><p class="pmsg" id="pmsg"></p></div>`;
  p.hidden = false; p.querySelector('#pclose').onclick = close; body(p.querySelector('.pbody')); return p;
}
export function close() { const p = el(); p.hidden = true; p.innerHTML = ''; if (closeCb) { const c = closeCb; closeCb = null; c(); } }
let closeCb = null; export const onClose = (f) => (closeCb = f);
export const isOpen = () => !el().hidden;
const msg = (s, ok) => { const m = document.getElementById('pmsg'); if (m) { m.textContent = s; m.className = 'pmsg ' + (ok ? 'ok' : 'bad'); } };

function keypad(box, len, check) {
  let v = ''; box.innerHTML = `<div class="kdisp" id="kd">${'_'.repeat(len)}</div><div class="kpad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'DEL', 0, 'OK'].map((k) => `<button data-k="${k}">${k}</button>`).join('')}</div>`;
  const d = box.querySelector('#kd'); box.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => { sfx.click(); const k = b.dataset.k;
    if (k === 'DEL') v = v.slice(0, -1); else if (k === 'OK') { if (check(v)) return; v = ''; } else if (v.length < len) v += k; d.textContent = (v + '_'.repeat(len)).slice(0, len); }));
}

export const PUZZLES = {
  monitors(S, done) { open(t('p_monitors'), t('p_monitors_h'), (box) => {
    box.innerHTML = `<div class="mons">${[0, 1, 2, 3].map((i) => `<canvas width="160" height="110" id="cam${i}"></canvas>`).join('')}</div>`;
    const cs = [0, 1, 2, 3].map((i) => box.querySelector('#cam' + i).getContext('2d')); let tt = 0, raf;
    const loop = () => { tt += 1 / 60; const step = Math.floor(tt / 1.6) % 5, inStep = (tt % 1.6) < 0.55;
      cs.forEach((g, i) => { const im = g.createImageData(160, 110); for (let j = 0; j < im.data.length; j += 4) { const v = 20 + Math.random() * 50; im.data[j] = v * 0.7; im.data[j + 1] = v; im.data[j + 2] = v * 0.8; im.data[j + 3] = 255; } g.putImageData(im, 0, 0);
        g.fillStyle = '#9f9'; g.font = '10px monospace'; g.fillText('CAM 0' + (i + 1), 6, 12); g.fillText('●REC', 120, 12);
        if (step < 3 && inStep && i === S.safeCams[step]) { g.fillStyle = '#fff'; g.font = 'bold 64px monospace'; g.fillText(S.safeCode[step], 60, 80); } });
      if (!el().hidden) raf = requestAnimationFrame(loop); };
    loop(); done && done('seen'); }); },
  safe(S, done) { open(t('p_safe'), t('p_safe_h'), (box) => keypad(box, 3, (v) => { if (v === S.safeCode) { sfx.solved(); msg(t('solved'), 1); setTimeout(() => { close(); done(); }, 500); return true; } sfx.wrong(); msg(t('wrong')); return false; })); },
  scale(S, done) { open(t('p_scale'), `${t('p_scale_h')} <b class="big">${S.scaleTarget}g</b>`, (box) => {
    const sel = new Set(); box.innerHTML = `<div class="bottles">${S.scaleW.map((w, i) => `<button class="bottle" data-i="${i}"><span class="liq" style="height:${20 + w / 4}px;background:${['#3cff9a', '#ff5a7a', '#6ab0ff', '#ffd23f', '#c87bff'][i]}"></span><b>${w}g</b></button>`).join('')}</div><div class="sum" id="sum">0g</div><button class="pbtn" id="weigh">${t('p_scale')}</button>`;
    box.querySelectorAll('.bottle').forEach((b) => (b.onclick = () => { sfx.click(); const i = +b.dataset.i; sel.has(i) ? sel.delete(i) : sel.add(i); b.classList.toggle('on'); box.querySelector('#sum').textContent = [...sel].reduce((a, j) => a + S.scaleW[j], 0) + 'g'; }));
    box.querySelector('#weigh').onclick = () => { const s = [...sel].reduce((a, j) => a + S.scaleW[j], 0); if (s === S.scaleTarget) { sfx.solved(); msg(t('solved'), 1); setTimeout(() => { close(); done(); }, 500); } else { sfx.wrong(); msg(t('wrong')); } }; }); },
  valves(S, done) { open(t('p_valves'), t('p_valves_h') + (S.knowChart ? ` <b class="big">${S.chart.map((a) => '↑→↓←'[a]).join(' ')}</b>` : ''), (box) => {
    const v = [0, 0, 0, 0]; box.innerHTML = `<div class="valves">${v.map((_, i) => `<button class="valve" data-i="${i}"><span>↑</span></button>`).join('')}</div><button class="pbtn" id="vok">OK</button>`;
    box.querySelectorAll('.valve').forEach((b) => (b.onclick = () => { sfx.click(); const i = +b.dataset.i; v[i] = (v[i] + 1) % 4; b.firstChild.style.transform = `rotate(${v[i] * 90}deg)`; }));
    box.querySelector('#vok').onclick = () => { if (v.every((a, i) => a === S.chart[i])) { sfx.solved(); msg(t('solved'), 1); setTimeout(() => { close(); done(); }, 500); } else { sfx.wrong(); msg(t('wrong')); } }; }); },
  poster(S, done) { open(t('poster'), t('clue_chart'), (box) => { box.innerHTML = `<div class="chart">${S.chart.map((a, i) => `<div><small>V${i + 1}</small><b>${'↑→↓←'[a]}</b></div>`).join('')}</div>`; done(); }); },
  generator(S, done) { open(t('p_gen'), t('p_gen_h'), (box) => {
    const cols = ['r', 'y', 'b'], slots = S.slotOrder, placed = {}; let pick = null;
    const have = cols.filter((c) => S.inv['fuse_' + c]);
    box.innerHTML = `<div class="slots">${slots.map((c) => `<button class="slot s${c}" data-c="${c}"></button>`).join('')}</div><div class="fuses">${have.map((c) => `<button class="fuse f${c}" data-c="${c}"></button>`).join('')}</div>`;
    box.querySelectorAll('.fuse').forEach((b) => (b.onclick = () => { sfx.click(); pick = b.dataset.c; box.querySelectorAll('.fuse').forEach((q) => q.classList.toggle('on', q === b)); }));
    box.querySelectorAll('.slot').forEach((b) => (b.onclick = () => { if (!pick) return; if (pick !== b.dataset.c) { sfx.wrong(); msg(t('wrong')); return; } sfx.click(); placed[pick] = 1; b.classList.add('full'); box.querySelector('.fuse.f' + pick).remove(); pick = null;
      if (Object.keys(placed).length === 3) { sfx.solved(); msg(t('solved'), 1); setTimeout(() => { close(); done(); }, 700); } }));
    if (have.length < 3) msg(`${have.length}/3`); }); },
  tape(S, done) { open(t('p_tape'), t('p_tape_h'), (box) => { box.innerHTML = `<div class="tape"><div class="reel"></div><div class="reel"></div></div><button class="pbtn" id="tplay">${t('play')}</button>`;
    box.querySelector('#tplay').onclick = () => { box.querySelector('.tape').classList.add('spin'); sfx.whisper(0); const n = +S.exitCode[3]; for (let i = 0; i < (n || 10); i++) sfx.beep(1.2 + i * 0.45); setTimeout(() => box.querySelector('.tape') && box.querySelector('.tape').classList.remove('spin'), 1400 + (n || 10) * 450); done(); }; }); },
  wires(S, done) { open(t('p_wires'), t('p_wires_h'), (box) => {
    const cols = ['#ff3b30', '#ffcc00', '#2f7dff', '#2fdc6a'], L = [0, 1, 2, 3], R = S.wireR; let pick = null; const made = {};
    box.innerHTML = `<div class="wires"><div>${L.map((i) => `<button class="wn" data-s="L" data-i="${i}" style="background:${cols[i]}"></button>`).join('')}</div><svg id="wsvg" viewBox="0 0 100 200"></svg><div>${R.map((i, j) => `<button class="wn" data-s="R" data-i="${i}" data-j="${j}" style="background:${cols[i]}"></button>`).join('')}</div></div>`;
    const svg = box.querySelector('#wsvg');
    box.querySelectorAll('.wn').forEach((b) => (b.onclick = () => { sfx.click(); if (b.dataset.s === 'L') { pick = +b.dataset.i; return; } if (pick === null) return; if (+b.dataset.i !== pick) { sfx.wrong(); msg(t('wrong')); pick = null; return; }
      made[pick] = 1; svg.insertAdjacentHTML('beforeend', `<line x1="0" y1="${25 + pick * 50}" x2="100" y2="${25 + +b.dataset.j * 50}" stroke="${cols[pick]}" stroke-width="5"/>`); pick = null;
      if (Object.keys(made).length === 4) { sfx.solved(); msg(t('solved'), 1); setTimeout(() => { close(); done(); }, 700); } })); }); },
  exit(S, done) { open(t('p_exit'), t('p_exit_h'), (box) => keypad(box, 4, (v) => { if (v === S.exitCode) { sfx.solved(); msg(t('solved'), 1); setTimeout(() => { close(); done(); }, 500); return true; } sfx.wrong(); msg(t('wrong')); return false; })); },
};
