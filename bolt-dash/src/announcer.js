// The match announcers: two TV commentators who call the action live, in the player's language.
// Lines are written fresh for every match by Claude (the page's `sample` capability) from the match itself (mode,
// round, players), and spoken in Claude voices (`tts`). Where those aren't available the lines come from a local
// phrase generator (thousands of combinations, never the same line twice in a row) and the browser's own voice.
// The text always shows on screen too, as a TV-style caption.
import { G, save, store } from './core.js';
import { LANG, LANGS } from './i18n.js';

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
    pool = next;
  } catch (e) { if (['not_granted', 'rate_limited', 'unavailable'].includes(e?.code)) aiOff = true; }
  finally { aiBusy = false; }
}
function lineFor(ev, d) {
  const list = pool[ev]; let s = list && list.length ? list.pop() : null;
  if (s && (/\{u\}/.test(s) && !d.u)) s = null;
  if (!s) s = localLine(ev); if (!s) return null;
  return s.replace(/\{p\}/g, d.p ?? '').replace(/\{n\}/g, d.n ?? '').replace(/\{team\}/g, d.team ?? '').replace(/\{u\}/g, d.u ?? '').replace(/\{mode\}/g, d.mode ?? '');
}

// ---------------------------------------------------------------- the voices
let tts = null, ttsTried = false, ttsOff = false, denied = false, nextLull = 15, speaking = 0, curPri = 0, lastAt = 0, quietT = 0;
async function getTts() {
  if (ttsTried) return tts; ttsTried = true;
  try { tts = window.claude?.use ? await window.claude.use('tts') : null; } catch { tts = null; }
  tts?.onState?.(({ state }) => { if (state === 'idle') { speaking = 0; curPri = 0; } });
  return tts;
}
const synth = () => (typeof speechSynthesis !== 'undefined' ? speechSynthesis : null);
function browserVoice() {
  const vs = synth()?.getVoices() || []; return vs.filter((v) => v.lang?.toLowerCase().startsWith(LANG)).sort((a, b) => (b.localService ? 0 : 1) - (a.localService ? 0 : 1));
}
function speakBrowser(lines) {
  const s = synth(); if (!s) return; s.cancel(); const vs = browserVoice();
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
  match(ctx) { pool = {}; quietT = 0; if (this.on) writeLines(ctx); },
  stop() { speaking = 0; curPri = 0; try { tts?.stop(); } catch { /* not speaking */ } synth()?.cancel(); if (capEl) capEl.hidden = true; },
  // something happened: pri 1 chatter, 2 normal, 3 big moment (always gets through)
  async say(ev, d = {}, pri = 2) {
    if (!this.on) return; const now = performance.now();
    if (speaking && (pri < curPri || (pri === curPri && pri < 3))) return;
    if (pri < 3 && now - lastAt < (pri === 1 ? 6000 : 1800)) return;
    const text = lineFor(ev, d); if (!text) return;
    const lines = [{ who: 0, text }];
    // the second commentator chips in now and then
    if (pri >= 2 && Math.random() < 0.3) { const q = lineFor('quip', d); if (q) lines.push({ who: 1, text: q }); }
    if (ev === 'lull') lines[0].who = 1;
    speaking = 1; curPri = pri; lastAt = now; quietT = 0; caption(lines[0].who, text);
    clearTimeout(this._safe); const est = 1500 + lines.reduce((n, l) => n + l.text.length, 0) * 75; this._safe = setTimeout(() => { speaking = 0; curPri = 0; }, est);
    if (lines[1]) setTimeout(() => { if (speaking) caption(1, lines[1].text); }, 900 + text.length * 55);
    const tt = ttsOff ? null : await getTts();
    if (tt) {
      tt.speak(lines.map((l) => ({ text: l.text, voice: VOICE[l.who].v, rate: VOICE[l.who].rate })), { language: LANG }).catch((e) => {
        speaking = 0; curPri = 0;
        // the viewer turned reading aloud off: respect it, keep the captions only
        if (e?.code === 'not_granted') { ttsOff = true; denied = true; }
        else if (e?.code === 'rate_limited' || e?.code === 'unavailable') { ttsOff = true; setTimeout(() => { ttsOff = false; }, 60000); }
      });
    } else if (!denied) speakBrowser(lines); // this view has no Claude voice (or it's resting): the browser's own voice
  },
  // per frame: hide the caption, fill quiet moments with chatter
  update(dt, playing) {
    if (capT > 0 && (capT -= dt) <= 0 && capEl) capEl.hidden = true;
    if (!playing || !this.on) return; quietT += dt;
    if (quietT > nextLull) { nextLull = 12 + Math.random() * 14; const rs = (G.runners || []).filter((r) => !r.out); const r = rs[Math.floor(Math.random() * rs.length)]; if (r) this.say('lull', { p: r.name }, 1); quietT = 0; }
  },
};
save.announcer = store.get('announcer', true);
G.ann = (ev, d, pri) => ann.say(ev, d, pri);
