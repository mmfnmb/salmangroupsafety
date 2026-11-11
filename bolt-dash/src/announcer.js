// The match announcers: two TV commentators who call the action live, in the player's language.
// Lines are written fresh for every match by Claude (the page's `sample` capability) from the match itself (mode,
// round, players), and spoken in Claude voices (`tts`). Where those aren't available the lines come from a local
// phrase generator (thousands of combinations, never the same line twice in a row) and the browser's own voice.
// The text always shows on screen too, as a TV-style caption.
import { G, save, store } from './core.js';
import { LANG, LANGS, t } from './i18n.js';
import { ultNamesOf } from './abilities.js';

const AR = LANG === 'ar';
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const NAMES = AR ? ['كابتن سامح', 'كابتن نادر'] : ['Max', 'Rita'];
// the two voices: play-by-play (fast, bright) and the colour commentator (warm, slower)
const VOICE = [{ v: 'glassy', rate: 1.12, pitch: 1.05 }, { v: 'rounded', rate: 1.0, pitch: 0.82 }];

// ---------------------------------------------------------------- local phrase generator
// each event: [openers, cores, tails]; a line is opener + core + tail, so lines rarely repeat
const P = AR ? {
  hype: ['يا سلااام!', 'إيه ده إيه ده!', 'يا جماعة!', 'شوفوا شوفوا!', 'الله الله!', 'مش معقول!', 'يا حلاوة!', 'أيوه بقى!', 'يا نهار!', 'بصوا يا جماعة!'],
  intro: [['أهلاً بيكم في', 'مساء الخير وأهلاً بيكم في', 'إحنا على الهوا من', 'جمهورنا العزيز، أهلاً في'], ['بولت داش!', 'أقوى بطولة في بولت داش!', 'ليلة نار في بولت داش!'], ['الجولة النهاردة {mode}.', 'معانا {mode} والكل جاهز.', 'و{mode} هتولّع الدنيا!', 'والليلة {mode}، ربنا يستر!']],
  go: [['انطلااااق!', 'يلا بينا!', 'الصافرة!', 'وبدأنااا!'], ['الكل طاير!', 'السباق ولّع!', 'مين هيكسب النهاردة؟', 'ركّزوا معانا!'], ['', 'ربنا معاكم!', 'الملعب مولّع!']],
  finish: [['ووصل', 'وها هو', 'ويعدّي خط النهاية'], ['{p}!', '{p} بكل ثقة!', '{p} زي الصاروخ!'], ['', 'المركز {n}!', 'ضمن التأهل!']],
  first: [['الأول! الأول!', 'يا سلام على', 'ولا غلطة من'], ['{p} يخطف المركز الأول!', '{p}، أسرع واحد في الملعب!', '{p}، الصاروخ وصل!'], ['', 'إيه الأداء ده!', 'حاجة ولا في الأحلام!']],
  out: [['يا خسارة!', 'آآآه!', 'ولا يا', 'للأسف!'], ['{p} خرج من البطولة!', '{p} وقع وخلاص!', '{p} مع السلامة!'], ['', 'كان قريب جداً.', 'معلش، المرة الجاية.']],
  outMe: [['لأااا!', 'يا خسارة!', 'آه يا'], ['{p} خرج!', '{p} مش هيكمل الجولة دي.'], ['بس الجمهور فخور بيك!', 'ترجع أقوى!', 'كانت مباراة حلوة.']],
  left: [['فاضل', 'بقوا', 'خلاص فاضل'], ['{n} بس في الملعب!', '{n} لاعبين!'], ['', 'التوتر في السما!', 'الضغط عالي جداً!']],
  goal: [['جووووول!', 'جوووول يا جماعة!', 'في الشبكة!', 'هدف!'], ['هدف لـ{team}!', '{team} بتسجل!', 'الكورة جوه، {team}!'], ['', 'إيه الجمال ده!', 'الحارس ملحقش!', 'الجمهور اتجنن!']],
  point: [['نقطة!', 'وتسجّل!', 'أيوه!'], ['نقطة لـ{team}!', '{team} تاخد النقطة!'], ['', 'ضربة محكمة!', 'محدش لحقها!']],
  ult: [['الضربة القاضية!', 'يا نهار أبيض!', 'شوفوا ده!'], ['{p} عمل {u}!', '{u} من {p}!'], ['', 'الملعب كله اتهز!', 'محدش هيستحمل ده!']],
  win: [['مبروووك!', 'يا سلام!', 'برافو!'], ['{p} اتأهل!', '{p} عدّى الجولة!', '{p} في الجولة الجاية!'], ['', 'أداء عالمي!', 'إيه الموهبة دي!']],
  lose: [['معلش!', 'للأسف!', 'آه يا خسارة!'], ['{p} مالحقش المرة دي.', 'الجولة دي مش لـ{p}.'], ['ترجع أقوى!', 'الجاية أحسن إن شاء الله!']],
  crown: [['البطل! البطل!', 'التاج!', 'يا سلااام!'], ['{p} بطل بولت داش!', '{p} أخد التاج!', '{p} على القمة!'], ['الليلة دي هتتحكي!', 'تاريخي!', 'إيه البطولة دي!']],
  lull: [['', 'بصراحة', 'شوف يا كابتن'], ['{p} النهاردة في حتة تانية.', 'الملعب صعب والكل بيحاول.', '{p} شكله ناوي على حاجة.', 'العقبات مش بترحم حد.', 'الجمهور على أعصابه.'], ['', 'ركّز معايا.', 'خلّي بالك.']],
  arena: [['خلّي بالك!', 'انتبهوا!'], ['الملعب بيصغر!', 'العقبات زادت!', 'المرحلة الجاية أصعب!'], ['', 'دلوقتي الجد!']],
  quip: ['ده كلام كبير يا كابتن!', 'أنا قلتلك من الأول!', 'ده يستاهل إعادة!', 'الجمهور واقف على رجليه!', 'حد يمسك الولد ده!', 'دي مش لعبة، دي فن!', 'الكاميرات مش ملاحقة!', 'لسه بدري، كل حاجة ممكنة!'],
} : {
  hype: ['Oh my!', 'Unbelievable!', 'Look at that!', 'What a moment!', 'Wow!', 'Would you believe it!', 'Here we go!', 'Incredible scenes!', 'Oh yes!', 'Can you believe this?'],
  intro: [['Welcome to', 'Good evening and welcome to', 'We are live from', 'Hello everyone, and welcome to'], ['Bolt Dash!', 'the biggest night in Bolt Dash!', 'another electric Bolt Dash show!'], ['Tonight it\'s {mode}.', 'Up next: {mode}.', '{mode} is about to get wild!', 'And {mode} is ready to go!']],
  go: [['And they\'re off!', 'GO GO GO!', 'There\'s the whistle!', 'We are underway!'], ['Everyone flying out of the gate!', 'It\'s on!', 'Who wants it most?', 'Eyes on the screen, folks!'], ['', 'Good luck out there!', 'This place is buzzing!']],
  finish: [['And across the line comes', 'Here comes', 'Through the finish:'], ['{p}!', '{p}, cool as you like!', '{p} like a rocket!'], ['', 'That\'s place {n}!', 'Safely through!']],
  first: [['First! First!', 'What a run from', 'Not a single mistake from'], ['{p} takes first place!', '{p}, the fastest out there!', '{p} wins the race!'], ['', 'Sensational!', 'Textbook stuff!']],
  out: [['Oh no!', 'Ouch!', 'And down goes', 'Heartbreak!'], ['{p} is out!', '{p} takes a tumble and that\'s it!', 'goodbye, {p}!'], ['', 'So close!', 'Next time!']],
  outMe: [['Oh no!', 'Nooo!', 'Heartbreak for'], ['{p} is out!', '{p} won\'t make it this round.'], ['But what a show!', 'Back stronger next time!', 'The crowd still loves you!']],
  left: [['Just', 'Only', 'We\'re down to'], ['{n} left standing!', '{n} players remaining!'], ['', 'The tension is unreal!', 'Every move counts now!']],
  goal: [['GOOOAL!', 'It\'s in!', 'Back of the net!', 'GOAL!'], ['{team} score!', 'A goal for {team}!', '{team} find the net!'], ['', 'What a strike!', 'The keeper had no chance!', 'The crowd goes wild!']],
  point: [['Point!', 'And it lands!', 'Yes!'], ['Point to {team}!', '{team} take it!'], ['', 'Perfect placement!', 'Nobody got near that!']],
  ult: [['KNOCKOUT MOVE!', 'Oh my word!', 'Look at this!'], ['{p} unleashes {u}!', '{u} from {p}!'], ['', 'The whole arena shook!', 'Nobody survives that!']],
  win: [['Congratulations!', 'Brilliant!', 'Bravo!'], ['{p} qualifies!', '{p} is through!', '{p} goes to the next round!'], ['', 'World class!', 'What talent!']],
  lose: [['Unlucky!', 'Oh, so close!', 'Not this time!'], ['{p} just missed out.', 'That round wasn\'t for {p}.'], ['Back stronger next time!', 'There\'s always the next show!']],
  crown: [['CHAMPION!', 'The crown!', 'Here it is!'], ['{p} is the Bolt Dash champion!', '{p} takes the crown!', '{p} on top of the world!'], ['A night to remember!', 'Historic!', 'What a tournament!']],
  lull: [['', 'You know,', 'I tell you what,'], ['{p} looks really sharp today.', 'this course shows no mercy.', '{p} is planning something.', 'nobody is safe out there.', 'the crowd is on the edge of their seats.'], ['', 'Keep watching.', 'Mark my words.']],
  arena: [['Watch out!', 'Careful now!'], ['The arena is shrinking!', 'More obstacles incoming!', 'Things are getting harder!'], ['', 'Now it gets serious!']],
  quip: ['That\'s big, partner!', 'I called it!', 'We need a replay of that!', 'The crowd is on its feet!', 'Somebody stop this player!', 'That\'s not a game, that\'s art!', 'The cameras can barely keep up!', 'It\'s still anyone\'s game!'],
};
function localLine(ev) {
  const p = P[ev]; if (!p) return null;
  if (typeof p[0] === 'string') return rnd(p); // a plain list (the second commentator's quips)
  const parts = p.map((o) => rnd(o)).filter(Boolean);
  if (Math.random() < 0.25 && ev !== 'intro') parts.unshift(rnd(P.hype));
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------- lines written by Claude for this match
const EVENTS = ['intro', 'go', 'first', 'finish', 'out', 'outMe', 'left', 'goal', 'point', 'ult', 'win', 'lose', 'crown', 'lull', 'arena', 'quip'];
let pool = {}, aiOff = false, aiBusy = false;
const langName = () => (AR ? 'Egyptian Arabic (the Cairo dialect of famous football commentators, not formal Arabic)' : (LANGS.find(([c]) => c === LANG) || ['en', 'English'])[1]);
async function writeLines(ctx) {
  if (aiOff || aiBusy || !window.claude?.use) return;
  aiBusy = true;
  try {
    const sample = await window.claude.use('sample'); if (!sample) { aiOff = true; return; }
    const prompt = `You are the two live TV commentators of "Bolt Dash", a family-friendly party game show (obstacle races, survival rounds, football, volleyball, golf, party games), commentating like the big football video games do, but with your own fresh words.
Write brand-new commentary lines in ${langName()}. Be energetic, funny, warm and varied; never rude; no real people's names.
This match: mode "${ctx.mode}" (${ctx.desc}). ${ctx.round}. Kind: ${ctx.kind}. Players: ${ctx.players.join(', ')}. The viewer plays as "${ctx.me}".
Return ONLY a JSON object whose keys are these events, each an array of 4 different short lines (at most 14 words each):
intro (opening the broadcast for this mode and round), go (the start), first ({p} finishes or wins first), finish ({p} finishes in place {n}), out ({p} is eliminated), outMe ({p}, the viewer, is eliminated: kind words), left (only {n} players remain), goal ({team} scores), point ({team} wins a point), ult ({p} uses the special knockout move called {u}), win ({p} qualifies), lose ({p} doesn't qualify: kind words), crown ({p} wins the whole show), lull (chat during a quiet moment, can mention {p} or the mode), arena (the stage gets harder), quip (a short reaction from the second commentator to the first).
Use the placeholders {p}, {n}, {team}, {u} exactly as written where they fit.`;
    const data = await sample.json(prompt, { modelTier: 'quick', cache: false });
    const next = {};
    for (const ev of EVENTS) {
      const arr = Array.isArray(data?.[ev]) ? data[ev] : [];
      next[ev] = arr.filter((s) => typeof s === 'string' && s.length > 1 && s.length < 160).map((s) => s.replace(/[<>]/g, '').trim()).sort(() => Math.random() - 0.5);
    }
    // keep local lines where Claude wrote none
    for (const ev of EVENTS) if (!next[ev].length) next[ev] = pool[ev] || [];
    pool = next; plan();
  } catch (e) { if (['not_granted', 'rate_limited', 'unavailable'].includes(e?.code)) aiOff = true; }
  finally { aiBusy = false; }
}
function lineFor(ev, d) {
  const list = pool[ev]; let s = list && list.length ? list.pop() : null;
  if (s && (/\{u\}/.test(s) && !d.u)) s = null;
  if (!s) s = localLine(ev); if (!s) return null;
  return s.replace(/\{p\}/g, d.p ?? '').replace(/\{n\}/g, d.n ?? '').replace(/\{team\}/g, d.team ?? '').replace(/\{u\}/g, d.u ?? '').replace(/\{mode\}/g, d.mode ?? '');
}

// ---------------------------------------------------------------- the recorded voices
// Every device can play these: a bank of lines recorded with neural voices (Piper: Arabic "kareem", English
// LibriTTS-R voices), shipped as world/voice-<lang>.pack.txt and loaded with the first match. Used when the
// Claude voice isn't available on this device (phones, Safari...) or doesn't start.
const BANK = { ar: 1, en: 1 };
let bank = null, bankLoading = null, actx = null, src = null, bankUsed = {};
function audio() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch { actx = null; } } if (actx?.state === 'suspended') actx.resume().catch(() => {}); return actx; }
function loadBank() {
  if (bank || bankLoading || !BANK[LANG]) return bankLoading;
  bankLoading = (async () => {
    const b64 = (await (await fetch(`./world/voice-${LANG}.pack.txt`)).text()).trim(); let buf;
    try { buf = await (await fetch('data:application/octet-stream;base64,' + b64)).arrayBuffer(); } catch { const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); buf = u8.buffer; }
    const len = new DataView(buf).getUint32(0, true), head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, len)));
    bank = { buf, base: 4 + len, files: head.files, lines: head.lines, decoded: {} };
  })().catch(() => { bankLoading = null; });
  return bankLoading;
}
// which recorded line fits this moment
function bankLine(ev, d) {
  if (!bank) return null; let key = ev;
  if (ev === 'goal' || ev === 'point') key = ev + '_' + (d.tk === 'blue' ? 'blue' : 'red');
  else if (ev === 'left') { if (d.n !== 2 && d.n !== 3) return null; key = 'left' + d.n; }
  else if (ev === 'ult') { const named = bank.lines.filter((l) => l.ev === 'ultname' && d.u && (t(l.name) === d.u || l.name === d.u)); if (named.length && Math.random() < 0.7) return named[0]; }
  const all = bank.lines.filter((l) => l.ev === key); if (!all.length) return null;
  // never the same line twice until all of them were used
  const used = (bankUsed[key] ||= new Set()); let free = all.filter((l) => !used.has(l.id)); if (!free.length) { used.clear(); free = all; }
  const l = free[Math.floor(Math.random() * free.length)]; used.add(l.id); return l;
}
async function playClip(l) {
  const ctx = audio(); if (!ctx || !bank) return 0;
  let b = bank.decoded[l.id];
  if (!b) { const [o, n] = bank.files[l.id]; b = bank.decoded[l.id] = await ctx.decodeAudioData(bank.buf.slice(bank.base + o, bank.base + o + n)); }
  try { src?.stop(); } catch { /* already over */ }
  const s = ctx.createBufferSource(), g = ctx.createGain(); g.gain.value = 1.15; s.buffer = b; s.connect(g).connect(ctx.destination); s.start(); src = s;
  return b.duration;
}
async function speakBank(ev, d) {
  if (!bank) await loadBank(); if (!bank) return false;
  const l = bankLine(ev, d); if (!l) return false;
  caption(l.who, l.text); const dur = await playClip(l); if (!dur) return false;
  speaking = 1; clearTimeout(ann._safe); ann._safe = setTimeout(() => { speaking = 0; curPri = 0; }, dur * 1000 + 200);
  // the second commentator chips in now and then
  if (ev !== 'lull' && ev !== 'quip' && Math.random() < 0.3) setTimeout(async () => { if (!ann.on) return; const q = bankLine('quip', d); if (!q) return; caption(q.who, q.text); const d2 = await playClip(q); clearTimeout(ann._safe); ann._safe = setTimeout(() => { speaking = 0; curPri = 0; }, d2 * 1000 + 200); }, dur * 1000 + 250);
  return true;
}

// ---------------------------------------------------------------- the live voice, made on this device
// A neural voice model (Piper) runs inside the page (world/voice/voice.js, in a worker when the page allows it), so
// the commentators can say this match's own lines, written by Claude, with the players' names. Lines are made in
// the background as soon as the match's lines are known, and played the moment something happens.
const LIVE = { ar: 1, en: 1 }, ME_EVENTS = new Set(['outMe', 'win', 'lose', 'crown']);
let lv = null, liveMode = '', meName = '', curMode = '';
const segCache = new Map(), jobs = [], queued = new Set();
const whoOf = (ev) => (ev === 'lull' || ev === 'quip' ? 1 : 0);
const hasWords = (x) => /[\p{L}\p{N}]/u.test(x);
function liveStart() {
  if (lv || !LIVE[LANG]) return; lv = { ready: false, n: 0, wait: new Map(), worker: null };
  const viaPage = () => {
    if (lv.worker) { try { lv.worker.terminate(); } catch { /* */ } lv.worker = null; }
    const go = () => globalThis.__BD_VOICE.init(LANG).then(() => { lv.ready = true; liveMode = 'page'; pump(); }).catch(() => { liveMode = 'failed'; });
    if (globalThis.__BD_VOICE) return go();
    const sc = document.createElement('script'); sc.src = './world/voice/voice.js'; sc.onload = go; sc.onerror = () => { liveMode = 'failed'; }; document.head.appendChild(sc);
  };
  try {
    const w = new Worker('./world/voice/voice.js'); lv.worker = w;
    w.onmessage = ({ data: m }) => { const cb = lv.wait.get(m.id); lv.wait.delete(m.id); cb?.(m); };
    w.onerror = () => { if (!lv.ready) viaPage(); };
    const id = ++lv.n; lv.wait.set(id, (m) => { if (m.ok) { lv.ready = true; liveMode = 'worker'; pump(); } else viaPage(); }); w.postMessage({ id, cmd: 'init', lang: LANG });
  } catch { viaPage(); }
}
function synthOne(text, who) {
  if (lv.worker) return new Promise((res, rej) => { const id = ++lv.n; lv.wait.set(id, (m) => (m.ok ? res(m) : rej(new Error(m.err)))); lv.worker.postMessage({ id, cmd: 'synth', text, who }); });
  return globalThis.__BD_VOICE.synth(text, who).then((r) => ({ pcm: Float32Array.from(r.pcm), rate: r.rate }));
}
let busy = false, playingNow = false;
async function pump() {
  if (busy || !lv?.ready || !jobs.length) return;
  if (liveMode === 'page' && playingNow) return; // on the page itself, only between rounds so the game never stutters
  busy = true; const j = jobs.shift();
  try { if (!segCache.has(j.key)) segCache.set(j.key, await synthOne(j.text, j.who)); } catch { /* skip this one */ }
  busy = false; setTimeout(pump, 0);
}
function queue(text, who, front) { const t2 = text.trim(), key = who + '|' + t2; if (!hasWords(t2) || segCache.has(key) || queued.has(key)) return; queued.add(key); const j = { key, text: t2, who }; if (front) jobs.unshift(j); else jobs.push(j); pump(); }
// a line cut into pieces: the fixed words, and the names / numbers that change from moment to moment
function pieces(ev, tpl, d) {
  let s = tpl.replace(/\{mode\}/g, curMode); if (ME_EVENTS.has(ev)) s = s.replace(/\{p\}/g, meName);
  return s.split(/(\{p\}|\{n\}|\{team\}|\{u\})/).map((x) => (x === '{p}' ? d?.p : x === '{n}' ? (d?.n != null ? String(d.n) : null) : x === '{team}' ? d?.team : x === '{u}' ? d?.u : x)).map((x) => (x == null ? null : x.trim())).filter((x) => x === null || hasWords(x));
}
// once the match's lines are known: make the common ones first, then the names
function plan() {
  if (!lv) return; jobs.length = 0; queued.clear();
  const order = ['intro', 'go', 'quip', 'out', 'outMe', 'win', 'lose', 'first', 'finish', 'left', 'goal', 'point', 'ult', 'arena', 'lull', 'crown'];
  const names = (G.runners || []).map((r) => r.name).filter(Boolean), ults = new Set();
  for (const r of G.runners || []) for (const n of ultNamesOf(r.kk?.id || 'bolt')) ults.add(n);
  const dyn = () => { for (const n of names) queue(n, 0); for (const x of [t('Red'), t('Blue')]) queue(x, 0); for (let i = 1; i <= Math.min(12, names.length); i++) queue(String(i), 0); for (const u of ults) queue(u, 0); };
  order.forEach((ev, k) => { const list = pool[ev] || []; for (let i = list.length - 1; i >= Math.max(0, list.length - 3); i--) for (const x of pieces(ev, list[i], null)) if (x) queue(x, whoOf(ev)); if (k === 2) dyn(); });
  // the rest of each list after that
  for (const ev of order) { const list = pool[ev] || []; for (let i = list.length - 4; i >= 0; i--) for (const x of pieces(ev, list[i], null)) if (x) queue(x, whoOf(ev)); }
}
function playPcm(parts, who) {
  const ctx = audio(); if (!ctx) return 0; const rate = parts[0].rate, gap = Math.round(rate * 0.06), n = parts.reduce((a, p) => a + p.pcm.length + gap, 0);
  const b = ctx.createBuffer(1, n, rate), ch = b.getChannelData(0); let o = 0; for (const p of parts) { ch.set(p.pcm, o); o += p.pcm.length + gap; }
  try { src?.stop(); } catch { /* already over */ }
  const s = ctx.createBufferSource(), g = ctx.createGain(); g.gain.value = 1.2; s.buffer = b;
  if (who === 1 && LANG === 'ar') s.playbackRate.value = 0.9; // the second commentator: same voice, deeper
  s.connect(g).connect(ctx.destination); s.start(); src = s; return b.duration / s.playbackRate.value;
}
function liveLine(ev, d) {
  if (!lv?.ready) return null; const list = pool[ev]; if (!list?.length) return null;
  for (let i = list.length - 1; i >= 0; i--) {
    const tpl = list[i]; if (/\{u\}/.test(tpl) && !d.u) continue;
    const ps = pieces(ev, tpl, d); if (ps.some((x) => x == null)) continue;
    const who = whoOf(ev), got = ps.map((x) => segCache.get(who + '|' + x) || segCache.get('0|' + x));
    if (got.every(Boolean)) { list.splice(i, 1); return { text: ps.join(' '), parts: got, who }; }
    ps.forEach((x) => queue(x, who, true));
  }
  return null;
}
async function speakLive(ev, d) {
  const l = liveLine(ev, d); if (!l) return false;
  caption(l.who, l.text); const dur = playPcm(l.parts, l.who); if (!dur) return false;
  speaking = 1; clearTimeout(ann._safe); ann._safe = setTimeout(() => { speaking = 0; curPri = 0; }, dur * 1000 + 200);
  if (ev !== 'lull' && ev !== 'quip' && Math.random() < 0.3) setTimeout(() => { if (!ann.on) return; const q = liveLine('quip', d); if (q) { caption(1, q.text); const d2 = playPcm(q.parts, 1); clearTimeout(ann._safe); ann._safe = setTimeout(() => { speaking = 0; curPri = 0; }, d2 * 1000 + 200); } }, dur * 1000 + 250);
  return true;
}

// ---------------------------------------------------------------- the voices
let heard = false, broken = false, voiceErr = '', tts = null, ttsTried = false, ttsOff = false, denied = false, nextLull = 15, speaking = 0, curPri = 0, lastAt = 0, quietT = 0;
async function getTts() {
  if (ttsTried) return tts; ttsTried = true;
  try { tts = window.claude?.use ? await window.claude.use('tts') : null; } catch { tts = null; }
  tts?.onState?.(({ state }) => { if (state === 'speaking') heard = true; if (state === 'idle') { speaking = 0; curPri = 0; } });
  return tts;
}
const synth = () => (typeof speechSynthesis !== 'undefined' ? speechSynthesis : null);
let needTap = false, unlocked = false, lastLines = null;
// phones only let a page speak after the player touches it: on the first touch or key press, wake both voices up
function wake() {
  getTts(); audio(); loadBank(); if (ann.on) liveStart();
  const s = synth(); if (s && !unlocked) { unlocked = true; try { s.getVoices(); const u = new SpeechSynthesisUtterance(' '); u.volume = 0; s.speak(u); } catch { /* no voice here */ } }
  // the voice was stopped (Esc or the Stop button): it may only start again from a touch, so say the last line now
  if (needTap && tts && ann.on && lastLines) { needTap = false; tts.speak(lastLines, { language: LANG }).catch(() => {}); }
}
if (typeof window !== 'undefined') { for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, wake, { capture: true, passive: true }); try { synth()?.addEventListener?.('voiceschanged', () => {}); } catch { /* old browser */ } }
function browserVoice() {
  const vs = synth()?.getVoices() || []; return vs.filter((v) => v.lang?.toLowerCase().startsWith(LANG)).sort((a, b) => (b.localService ? 0 : 1) - (a.localService ? 0 : 1));
}
function speakBrowser(lines) {
  const s = synth(); if (!s) { voiceErr = 'no_voice'; return; } s.cancel(); const vs = browserVoice(); if (!vs.length) voiceErr = 'no_lang_voice';
  lines.forEach((l, i) => {
    const u = new SpeechSynthesisUtterance(l.text); u.lang = LANG; const V_ = VOICE[l.who];
    if (vs.length) u.voice = vs[Math.min(l.who, vs.length - 1)]; u.rate = V_.rate; u.pitch = V_.pitch; u.volume = 1;
    if (i === lines.length - 1) u.onend = () => { speaking = 0; curPri = 0; };
    s.speak(u);
  });
}
// a caption like a TV lower third, so the words are always on screen too
let capEl = null, capT = 0;
function caption(who, text) {
  if (!capEl) { capEl = document.getElementById('annCap'); if (!capEl) return; }
  capEl.querySelector('b').textContent = NAMES[who]; capEl.querySelector('span').textContent = text;
  capEl.hidden = false; capEl.classList.remove('in'); void capEl.offsetWidth; capEl.classList.add('in'); capT = 2.2 + text.length * 0.055;
}

export const ann = {
  get on() { return save.announcer !== false && !save.muted; },
  set(v) { save.announcer = !!v; store.set('announcer', save.announcer); if (!v) this.stop(); },
  // a new match: let Claude write this match's lines while the camera flies over the course
  match(ctx) {
    pool = {}; quietT = 0; meName = ctx.me || ''; curMode = ctx.mode || '';
    // lines from the local phrase generator until (or unless) Claude's arrive
    for (const ev of EVENTS) { const set = new Set(); for (let i = 0; i < 12 && set.size < 5; i++) { const x = localLine(ev); if (x) set.add(x); } pool[ev] = [...set]; }
    if (this.on) { writeLines(ctx); loadBank(); liveStart(); plan(); }
  },
  stop() { speaking = 0; curPri = 0; try { src?.stop(); } catch { /* already over */ } try { tts?.stop(); } catch { /* not speaking */ } synth()?.cancel(); if (capEl) capEl.hidden = true; },
  // something happened: pri 1 chatter, 2 normal, 3 big moment (always gets through)
  async say(ev, d = {}, pri = 2) {
    if (!this.on) return; const now = performance.now();
    if (speaking && (pri < curPri || (pri === curPri && pri < 3))) return;
    if (pri < 3 && now - lastAt < (pri === 1 ? 6000 : 1800)) return;
    // no working Claude voice here: the recorded voices
    const tt0 = ttsOff || broken ? null : await getTts();
    if (!tt0 && !denied) { curPri = pri; lastAt = now; quietT = 0; if (await speakLive(ev, d)) return; if (BANK[LANG] && await speakBank(ev, d)) return; }
    const text = lineFor(ev, d); if (!text) return;
    const lines = [{ who: 0, text }];
    // the second commentator chips in now and then
    if (pri >= 2 && Math.random() < 0.3) { const q = lineFor('quip', d); if (q) lines.push({ who: 1, text: q }); }
    if (ev === 'lull') lines[0].who = 1;
    speaking = 1; curPri = pri; lastAt = now; quietT = 0; caption(lines[0].who, text);
    clearTimeout(this._safe); const est = 1500 + lines.reduce((n, l) => n + l.text.length, 0) * 75; this._safe = setTimeout(() => { speaking = 0; curPri = 0; }, est);
    if (lines[1]) setTimeout(() => { if (speaking) caption(1, lines[1].text); }, 900 + text.length * 55);
    const tt = tt0;
    if (tt) {
      // if the Claude voice doesn't actually start on this device, switch to the recorded voices for good
      if (!heard && BANK[LANG]) setTimeout(() => { if (!heard && !broken) { broken = true; try { tt.stop(); } catch { /* */ } speakLive(ev, d).then((ok) => ok || speakBank(ev, d)); } }, 4000);
      lastLines = lines.map((l) => ({ text: l.text, voice: VOICE[l.who].v, rate: VOICE[l.who].rate }));
      tt.speak(lines.map((l) => ({ text: l.text, voice: VOICE[l.who].v, rate: VOICE[l.who].rate })), { language: LANG }).catch((e) => {
        speaking = 0; curPri = 0;
        // the viewer turned reading aloud off: respect it, keep the captions only
        voiceErr = e?.code || 'error';
        if (e?.code === 'not_granted') { ttsOff = true; denied = true; }
        else if (e?.code === 'no_gesture') { needTap = true; }
        else if (e?.code === 'rate_limited' || e?.code === 'unavailable') { ttsOff = true; setTimeout(() => { ttsOff = false; }, 60000); }
      });
    } else if (!denied) speakBrowser(lines); // this view has no Claude voice (or it's resting): the browser's own voice
  },
  // which voice this device uses, for the Settings screen
  async status() {
    const tt = denied ? null : await getTts();
    if (tt && !broken) return { kind: 'claude', err: voiceErr };
    if (lv?.ready && !denied) return { kind: 'live', err: liveMode };
    if (BANK[LANG] && !denied) return { kind: 'recorded', err: '' };
    if (denied) return { kind: 'off', err: voiceErr };
    const s = synth(); if (!s) return { kind: 'none', err: voiceErr };
    return { kind: browserVoice().length ? 'device' : 'device-nolang', err: voiceErr };
  },
  // from a button press, so phones allow it
  test() { wake(); speaking = 0; curPri = 0; lastAt = 0; return this.say('intro', { mode: 'Bolt Dash' }, 3); },
  // per frame: hide the caption, fill quiet moments with chatter
  update(dt, playing) {
    playingNow = playing; if (!playing) pump();
    if (capT > 0 && (capT -= dt) <= 0 && capEl) capEl.hidden = true;
    if (!playing || !this.on) return; quietT += dt;
    if (quietT > nextLull) { nextLull = 12 + Math.random() * 14; const rs = (G.runners || []).filter((r) => !r.out); const r = rs[Math.floor(Math.random() * rs.length)]; if (r) this.say('lull', { p: r.name }, 1); quietT = 0; }
  },
};
save.announcer = store.get('announcer', true);
G.ann = (ev, d, pri) => ann.say(ev, d, pri);
