// Online rooms (claude "room" capability) and the player's saved coins/skins ("db" + "user"), with local fallbacks.
export const PID = Math.random().toString(36).slice(2, 10);
let roomCap = null, sub = null, dbCap = null, userCap = null, uid = null;
const handlers = {}; let peersCb = null;
const cap = (n) => (window.claude && window.claude.use ? window.claude.use(n).catch(() => null) : Promise.resolve(null));
export async function initCaps() {
  [roomCap, dbCap, userCap] = await Promise.all([cap('room'), cap('db'), cap('user')]);
  try { if (userCap && userCap.id) uid = await userCap.id(); } catch (e) { uid = null; }
  return { online: !!roomCap };
}
export const online = () => !!roomCap;
export async function joinRoom(code) {
  if (!roomCap) return false; if (sub && sub.leave) try { sub.leave(); } catch (e) {}
  sub = roomCap.join ? await roomCap.join('nh-' + code.toUpperCase()) : roomCap;
  for (const tp of ['ev', 'mon', 'sync']) sub.on(tp, (data) => { if (!data || data.from === PID) return; (handlers[tp] || []).forEach((f) => f(data)); });
  if (sub.onPeers) sub.onPeers((list) => { if (!peersCb) return; const arr = (Array.isArray(list) ? list : Object.values(list || {})).map((p) => p.presence || p.state || p.data || p).filter((p) => p && p.pid); peersCb(arr); });
  return true;
}
export function leaveRoom() { if (sub && sub.leave) try { sub.leave(); } catch (e) {} sub = null; }
export const on = (tp, f) => (handlers[tp] = handlers[tp] || []).push(f);
export const onPeers = (f) => (peersCb = f);
export function emit(tp, data) { if (!sub) return; try { sub.emit(tp, { ...data, from: PID }); } catch (e) {} }
let lastP = 0; export function presence(p, force) { if (!sub) return; const n = performance.now(); if (!force && n - lastP < 90) return; lastP = n; try { sub.presence({ ...p, pid: PID }); } catch (e) {} }
export const inRoom = () => !!sub;

// ---- profile: coins, owned skins, zombie tickets
const DEF = { coins: 120, owned: ['Male_Adult_01', 'Female_Adult_05', 'Medical_Male_01'], skin: 'Male_Adult_01', tickets: 0, escapes: 0 };
let profile = null;
const local = { get() { try { return JSON.parse(localStorage.getItem('nh_profile')); } catch (e) { return null; } }, set(v) { try { localStorage.setItem('nh_profile', JSON.stringify(v)); } catch (e) {} } };
function docRef() { if (!dbCap || !uid) return null; try { return dbCap.doc('data/users/' + uid + '/nh/profile'); } catch (e) { return null; } }
export async function loadProfile() {
  let v = null; const d = docRef();
  if (d) { try { const r = await d.get(); v = r && typeof r.data === 'function' ? r.data() : r && r.data !== undefined ? r.data : r; } catch (e) { v = null; } }
  if (!v || typeof v.coins !== 'number') v = local.get();
  profile = { ...DEF, ...(v || {}) }; return profile;
}
export const getProfile = () => profile;
let saving = Promise.resolve();
export function saveProfile() { local.set(profile); const d = docRef(); if (d) saving = saving.then(() => d.set({ ...profile })).catch(() => {}); return saving; }
