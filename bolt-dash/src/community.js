// Players' maps: publish your built map, play other people's maps, creators earn coins per play,
// and the game owner can promote a map to the main modes. Uses the artifact's shared database
// when the game runs as a published artifact; otherwise the section says it's offline.
import { save, store } from './core.js';
import { t } from './i18n.js';

export const PUBLISH_PRICE = 1500, PER_PLAY = 5, MAX_MAPS = 5;
export const comm = { ready: false, db: null, uid: null, owner: false, creators: [], plays: [], featured: [], onChange: () => {} };

// a short stable fingerprint of a map, used to know the exact layout you completed
export function mapHash(map) {
  const s = JSON.stringify((map?.items || []).map((i) => [i.t, i.c, i.r, i.rot]).sort());
  let h = 5381; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export async function initCommunity() {
  const c = window.claude;
  if (!c?.use) { comm.state = 'off'; comm.onChange(); return; }
  try {
    const [db, user] = await Promise.all([c.use('db'), c.use('user')]);
    if (!db || !user) { comm.state = 'off'; comm.onChange(); return; }
    comm.db = db; comm.uid = await user.id(); comm.owner = !!(await user.isOwner?.());
    // the game's owner gets the Glitch character, worn the first time
    if (comm.owner && !save.owned.includes('skin-ghost')) save.owned.push('skin-ghost');
    if (comm.owner && !save.owned.includes('skin-glitch')) { save.owned.push('skin-glitch'); save.equip.skin = 'skin-glitch'; store.set('owned', save.owned); store.set('equip', save.equip); comm.onOwner?.(); }
    comm.canWrite = (await user.can?.('data.write')) !== false && !!comm.uid;
    comm.ready = true; comm.state = 'loading'; comm.onChange();
    const timer = setTimeout(() => { if (comm.state === 'loading') { comm.state = 'slow'; comm.onChange(); } }, 10000);
    const done = () => { clearTimeout(timer); if (comm.state !== 'live') { comm.state = 'live'; } comm.onChange(); };
    const fail = () => { clearTimeout(timer); comm.state = 'off'; comm.onChange(); };
    db.collection('maps').onSnapshot((s) => { comm.creators = s.docs.map((d) => ({ uid: d.id, ...d.data() })); done(); }, fail);
    db.collection('plays').onSnapshot((s) => { comm.plays = s.docs.map((d) => ({ uid: d.id, ...d.data() })); collectEarnings(); comm.onChange(); }, () => {});
    db.doc('featured/main').onSnapshot((d) => { comm.featured = (d.exists && d.data().keys) || []; comm.onChange(); }, () => {});
  } catch { comm.state = 'off'; comm.onChange(); }
}

// every published map, flattened, with play and like counts
export function allMaps() {
  const out = [];
  for (const c of comm.creators) for (const m of c.list || []) {
    const key = c.uid + ':' + m.id;
    let plays = 0, likes = 0;
    for (const p of comm.plays) { if (p.uid !== c.uid) plays += (p.p && p.p[key]) || 0; if (p.l && p.l[key]) likes++; }
    out.push({ key, uid: c.uid, author: c.author || t('Player'), name: m.name, type: m.type || 'race', items: m.items, at: m.at || 0, plays, likes, mine: c.uid === comm.uid, featured: comm.featured.includes(key) });
  }
  return out.sort((a, b) => (b.featured - a.featured) || (b.likes * 3 + b.plays) - (a.likes * 3 + a.plays) || b.at - a.at);
}
export const featuredMaps = () => allMaps().filter((m) => m.featured);
const myDoc = () => comm.creators.find((c) => c.uid === comm.uid);
const myPlays = () => comm.plays.find((p) => p.uid === comm.uid) || { p: {}, l: {} };

// coins owed to me: 5 for every play of my maps by somebody else
function collectEarnings() {
  if (!comm.uid) return;
  const mine = new Set((myDoc()?.list || []).map((m) => comm.uid + ':' + m.id));
  let total = 0;
  for (const p of comm.plays) if (p.uid !== comm.uid) for (const k in p.p || {}) if (mine.has(k)) total += p.p[k];
  const owed = total * PER_PLAY, got = store.get('earnClaimed', 0);
  if (owed > got) { store.set('earnClaimed', owed); comm.onEarn?.(owed - got, total); }
}

export async function publishMap(map, name) {
  if (!comm.ready || !comm.canWrite) throw new Error('offline');
  const cur = myDoc(), list = [...(cur?.list || [])];
  if (list.length >= MAX_MAPS) throw new Error('full');
  const id = Date.now().toString(36);
  list.push({ id, type: map.type || 'race', name: String(name).slice(0, 28), items: map.items.map((i) => ({ t: i.t, c: i.c, r: i.r, rot: i.rot })), at: Date.now() });
  await comm.db.doc('maps/' + comm.uid).set({ author: String(save.name || t('Player')).slice(0, 20), list });
  return id;
}
export async function unpublishMap(key) {
  const cur = myDoc(); if (!cur) return;
  const list = (cur.list || []).filter((m) => comm.uid + ':' + m.id !== key);
  await comm.db.doc('maps/' + comm.uid).set({ author: cur.author, list });
}
// one write per change to my own plays document
let playsBusy = Promise.resolve();
function writeMine(fn) {
  playsBusy = playsBusy.then(async () => {
    const cur = myPlays(), next = { p: { ...(cur.p || {}) }, l: { ...(cur.l || {}) } };
    fn(next); await comm.db.doc('plays/' + comm.uid).set(next);
  }).catch(() => {});
  return playsBusy;
}
export function recordPlay(key) { if (comm.ready && comm.canWrite && !key.startsWith(comm.uid + ':')) writeMine((n) => { n.p[key] = (n.p[key] || 0) + 1; }); }
export const liked = (key) => !!myPlays().l?.[key];
export function toggleLike(key) { if (comm.ready && comm.canWrite) writeMine((n) => { if (n.l[key]) delete n.l[key]; else n.l[key] = 1; }); }
export async function setFeatured(key, on) {
  if (!comm.owner) return;
  const keys = comm.featured.filter((k) => k !== key); if (on) keys.push(key);
  await comm.db.doc('featured/main').set({ keys });
}
export const DB_RULES = [
  { path: 'maps', read: 'view', write: 'owner' }, { path: 'maps/{self}', read: 'view', write: 'interact' },
  { path: 'plays', read: 'view', write: 'owner' }, { path: 'plays/{self}', read: 'view', write: 'interact' },
  { path: 'featured', read: 'view', write: 'owner' },
];
