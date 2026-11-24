const ICONS = /*ICONS*/{};
// ---------- icons + helpers ----------
document.getElementById('sprite').innerHTML = Object.entries(ICONS).map(([n,d])=>`<symbol id="i-${n}" viewBox="0 0 512 512"><path d="${d}"/></symbol>`).join('');
const I = n => `<svg class="ico" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const LUCY_ART = /*LUCYART*/'';
const LUCY = (cls = '') => `<svg class="lucy ${cls}" viewBox="0 0 200 200" aria-hidden="true" style="--bd:${(Math.random() * 3).toFixed(2)}s">${LUCY_ART}</svg>`;
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.random() * a.length | 0];
const HEAT = [['SLANG', 'var(--mint)'], ['SPICY', 'var(--olive)'], ['HEAVY', 'var(--rose)'], ['SLUR · RECOGNISE ONLY', 'var(--violet)']];
const speakable = c => !c[4] && (c[3] ?? 0) < 3;   // chunk tuples: [pt, en, note, heat, notSpoken]

// ---------- course ----------
// Mission flow (research-based): Hear a real dialogue → Chunks → Shadow → Recall from memory → Write what you hear → Role-play with a goal.
// The live course fills these; each course's own data lives in pt.js / ar.js.
const UNITS = [], SCENES = [], PHRASES = {};
const COURSE_DATA = { 'pt-BR': PT_COURSE, 'ar-EG': AR_COURSE };
let T = PT_COURSE;                                   // the live course: its lines, prompts and settings
const ROM = {};                                      // Arabic line → Franco, shown under the script and accepted by the mic
const PUNCT = /[!?.,…؟،]/g;
const romOf = s => ROM[s] || ROM[String(s).trim()] || '';
const romHTML = s => { const r = romOf(s); return r ? `<div class="rom">${esc(r)}</div>` : ''; };
const tl = x => Array.isArray(x) ? (x[1] && (ROM[x[0]] = x[1]), x[0]) : x;   // [arabic, franco] pairs register their Franco
// turn a course's raw rows into the shared shapes once (Arabic rows carry Franco in the second slot)
function prepCourse(c) {
  if (c.prepped) return; c.prepped = true;
  if (!c.rtl) return;
  c.units.forEach(u => { u.dialogue = u.dialogue.map(([who, a, r, en]) => (ROM[a] = r, [who, a, en])); u.chunks = u.chunks.map(([a, r, en, note, heat, ns]) => (ROM[a] = r, [a, en, note || '', heat, ns])); });
  c.scenes.forEach(s => { s.script = s.script.map(([a, r, en, sugg]) => (ROM[a] = r, [a, en, (sugg || []).map(tl)])); });
  for (const k in c.phrases) c.phrases[k] = c.phrases[k].map(([a, r, en]) => (ROM[a] = r, [a, en, r]));
  for (const k in c.coach) c.coach[k] = tl(c.coach[k]); c.praise = c.praise.map(tl); c.nudge = c.nudge.map(tl);
}
function loadCourse(id) {
  T = COURSE_DATA[id] || PT_COURSE; prepCourse(T);
  UNITS.splice(0, UNITS.length, ...T.units); SCENES.splice(0, SCENES.length, ...T.scenes);
  for (const k in PHRASES) delete PHRASES[k]; Object.assign(PHRASES, T.phrases);
  if (typeof LEVELS !== 'undefined') LEVELS.forEach((L, i) => L.hours = T.hours[i]);
  if (typeof MILESTONES !== 'undefined') { MILESTONES[0][0] = T.firstChat; MILESTONES[4][0] = T.slangMile[0]; MILESTONES[4][1] = T.slangMile[1]; }
  (S.custom || []).forEach(c => Object.assign(ROM, c.unit?.rom || {})); Object.entries(S.srs || {}).forEach(([k, c]) => { if (c.rom) ROM[k] = c.rom; });
  document.documentElement.lang = T.lang.slice(0, 2); document.body.classList.toggle('rtl-course', !!T.rtl);
  if (S.deck && !PHRASES[S.deck]) S.deck = 'Street talk';
}
const LANG = () => T.id === 'pt-BR' ? S.variant : T.lang;     // speech language for voice and mic
// ---------- levels (CEFR) with time estimates ----------
// Guided learning hours (cumulative) follow Cambridge's published ranges; FSI rates Portuguese as one of the fastest languages for English speakers.
const LEVELS = [
  { id:'A1', name:'Breakthrough', hours:70, phrases:150, acc:70, can:'Greet people, order food, ask prices and directions, text friends.' },
  { id:'A2', name:'Waystage', hours:190, phrases:450, acc:78, can:'Handle everyday errands, talk about plans, your day and the past.' },
  { id:'B1', name:'Threshold', hours:380, phrases:1000, acc:85, can:'Keep a real conversation going, tell stories, deal with most travel situations.' },
  { id:'B2', name:'Vantage', hours:560, phrases:2000, acc:90, can:'Talk with locals at normal speed, joke, argue, follow TV.' },
];

// ---------- state ----------
const store = { get(k, d) { try { const v = localStorage.getItem('lucy-' + k) ?? localStorage.getItem('fala-' + k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
                set(k, v) { try { localStorage.setItem('lucy-' + k, JSON.stringify(v)); } catch (_) {} } };
const S = { done: store.get('done', {}), xp: store.get('xp', 0), streak: store.get('streak', { n: 0, last: '' }),
  variant: store.get('variant', 'pt-BR'), vibe: store.get('vibe', 'spicy'), srs: store.get('srs', {}), goalMin: store.get('goalMin', 20),
  stats: store.get('stats', { secs: {}, scores: [], tricky: {}, shadowed: 0, chats: 0, calls: 0, dict: [] }),
  custom: store.get('custom', []), name: store.get('name', 'Twister'), voices: store.get('voices', { f: 'airy', m: 'buttery', you: 'rounded' }), course: store.get('course', 'pt-BR'), deck: 'Street talk', phrase: 0, scene: 'lucy', mission: null };
// ---------- profile name (data is written with "Twister"; swap in the chosen name) ----------
let NAME_IN_DATA = 'Twister';
function applyName(to) {
  to = (to || '').trim() || 'Twister'; const from = NAME_IN_DATA; if (from === to) return;
  const re = new RegExp('\\b' + from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
  const walk = o => { for (const k in o) { const v = o[k]; if (typeof v === 'string') o[k] = v.replace(re, to); else if (v && typeof v === 'object') walk(v); } };
  walk(PT_COURSE); walk(AR_COURSE); walk(S.custom);
  for (const k of Object.keys(ROM)) if (re.test(k)) { re.lastIndex = 0; ROM[k.replace(re, to)] = ROM[k].replace(re, to); } re.lastIndex = 0; NAME_IN_DATA = to;
}
applyName(S.name);
// ---------- one set of progress per course; xp, streak, name and settings are shared ----------
const PER_COURSE = ['done', 'srs', 'stats', 'custom'];
const freshStats = () => ({ secs: {}, scores: [], tricky: {}, shadowed: 0, chats: 0, calls: 0, dict: [] });
S.shelf = store.get('shelf', {});
function switchCourse(id) {
  if (id === S.course || !COURSE_DATA[id]) return;
  S.shelf = { ...S.shelf, [S.course]: Object.fromEntries(PER_COURSE.map(k => [k, S[k]])) };
  const n = S.shelf[id] || {}; S.done = n.done || {}; S.srs = n.srs || {}; S.stats = n.stats || freshStats(); S.custom = n.custom || [];
  const shelf = { ...S.shelf }; delete shelf[id]; S.shelf = shelf; S.course = id;
  loadCourse(id); [...PER_COURSE, 'shelf', 'course'].forEach(k => store.set(k, S[k]));
}

// ---------- languages: one course is live, the rest have room to plug in ----------
const COURSES = [
  { id: 'pt-BR', name: 'Português', sub: 'Brazil', ready: true },
  { id: 'ar-EG', name: 'مصري', sub: 'Egyptian Arabic', ready: true },
  { id: 'es', name: 'Español', sub: 'coming later', ready: false },
  { id: 'it', name: 'Italiano', sub: 'coming later', ready: false },
  { id: 'fr', name: 'Français', sub: 'coming later', ready: false },
  { id: 'ja', name: '日本語', sub: 'coming later', ready: false },
];

// ---------- cloud save: the same progress on every device ----------
const SYNC_KEYS = ['done', 'xp', 'streak', 'srs', 'stats', 'custom', 'goalMin', 'vibe', 'variant', 'name', 'voices', 'course', 'shelf'];
const Sync = { ref: null, state: 'local', at: store.get('savedAt', 0), timer: null,
  snapshot() { const o = {}; SYNC_KEYS.forEach(k => o[k] = S[k]); return o; },
  touch() { this.at = Date.now(); try { localStorage.setItem('lucy-savedAt', JSON.stringify(this.at)); } catch (_) {} if (this.ref) { clearTimeout(this.timer); this.timer = setTimeout(() => this.push(), 2500); } },
  async push() { if (!this.ref) return; try { await this.ref.set({ blob: JSON.stringify(this.snapshot()), at: this.at, v: 1 }); this.state = 'synced'; } catch (e) { this.state = 'error'; this.err = e?.code || e?.message; } },
  async connect(ref) { this.ref = ref; this.state = 'syncing'; let pulled = false;
    try { const snap = await Promise.race([ref.get(), sleep(10000).then(() => null)]); const r = snap?.exists ? snap.data() : null;
      if (r && r.at > this.at) { this.apply(JSON.parse(r.blob)); this.at = r.at; try { localStorage.setItem('lucy-savedAt', JSON.stringify(r.at)); } catch (_) {} this.state = 'synced'; pulled = true; }
      else await this.push(); } catch (e) { this.state = 'error'; this.err = e?.code || e?.message; }
    return pulled; },
  apply(o) { SYNC_KEYS.forEach(k => { if (o[k] !== undefined) { S[k] = o[k]; try { localStorage.setItem('lucy-' + k, JSON.stringify(o[k])); } catch (_) {} } }); applyName(S.name); loadCourse(S.course); },
};
{ const set0 = store.set; store.set = (k, v) => { set0(k, v); if (SYNC_KEYS.includes(k)) Sync.touch(); }; }
const todayKey = () => new Date().toISOString().slice(0, 10);
const saveStats = () => store.set('stats', S.stats);
function addXP(n) {
  const t = todayKey(); S.xp += n;
  if (S.streak.last !== t) { const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10); S.streak = { n: S.streak.last === y ? S.streak.n + 1 : 1, last: t }; }
  store.set('xp', S.xp); store.set('streak', S.streak);
}
function logScore(target, r) {
  S.stats.scores.push(r.total); if (S.stats.scores.length > 300) S.stats.scores.shift();
  target.replace(PUNCT, '').split(/\s+/).forEach((w, i) => { const k = w.toLowerCase(); if (k.length > 1 && (r.per[i] ?? 0) < .5) S.stats.tricky[k] = (S.stats.tricky[k] || 0) + 1; else if (S.stats.tricky[k] && (r.per[i] ?? 0) >= .85) S.stats.tricky[k] = Math.max(0, S.stats.tricky[k] - 1); });
  saveStats();
}
// active study time: counted while the page is visible and you touched it in the last minute
let lastActive = Date.now();
['pointerdown', 'keydown'].forEach(e => addEventListener(e, () => lastActive = Date.now(), { passive: true }));
setInterval(() => { if (document.visibilityState === 'visible' && Date.now() - lastActive < 60e3) { const t = todayKey(); S.stats.secs[t] = (S.stats.secs[t] || 0) + 15; saveStats(); } }, 15e3);

// ---------- spaced repetition (Leitner boxes, answered by speaking) ----------
const BOX_DAYS = [0, 1, 3, 7, 16, 35, 90];
function srsAdd(items) { items.filter(c => (c[3] ?? 0) < 3).forEach(([pt, en, , heat, ns]) => { if (!S.srs[pt]) S.srs[pt] = { en, heat: heat || 0, box: 0, due: Date.now(), ns: ns ? 1 : 0, ...(ROM[pt] ? { rom: ROM[pt] } : {}) }; }); store.set('srs', S.srs); }
function srsDue() { const now = Date.now(); return Object.entries(S.srs).filter(([, c]) => c.due <= now).sort((a, b) => a[1].due - b[1].due); }
function srsGrade(pt, g) { const c = S.srs[pt]; if (!c) return;
  if (g === 'again') { c.box = 0; c.due = Date.now() + 10 * 60e3; }
  else if (g === 'hard') { c.due = Date.now() + Math.max(1, BOX_DAYS[c.box] / 2) * 864e5; }
  else { c.box = Math.min(BOX_DAYS.length - 1, c.box + 1); c.due = Date.now() + BOX_DAYS[c.box] * 864e5; }
  store.set('srs', S.srs); }
const nextLabel = (pt, g) => { const c = S.srs[pt] || { box: 0 }; const d = g === 'again' ? 0 : g === 'hard' ? Math.max(1, BOX_DAYS[c.box] / 2) : BOX_DAYS[Math.min(BOX_DAYS.length - 1, c.box + 1)]; return g === 'again' ? '10 min' : d < 1.5 ? '1 day' : Math.round(d) + ' days'; };

// ---------- progress model ----------
function metrics() {
  const secs = Object.values(S.stats.secs).reduce((a, b) => a + b, 0), hours = secs / 3600;
  const cards = Object.values(S.srs), learned = cards.length, mastered = cards.filter(c => c.box >= 3).length;
  const sc = S.stats.scores.slice(-40), acc = sc.length ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length) : null;
  const days = [...Array(14)].map((_, i) => S.stats.secs[new Date(Date.now() - i * 864e5).toISOString().slice(0, 10)] || 0);
  const activeDays = days.filter(s => s > 60).length;
  const pace = activeDays >= 3 ? days.reduce((a, b) => a + b, 0) / 60 / 14 : S.goalMin;   // minutes per day
  const phraseCredit = mastered + (learned - mastered) * .4;
  const lv = LEVELS.map((L, i) => {
    const prevH = i ? LEVELS[i - 1].hours : 0, prevP = i ? LEVELS[i - 1].phrases : 0;
    const hp = Math.max(0, Math.min(1, (hours - prevH) / (L.hours - prevH))), pp = Math.max(0, Math.min(1, (phraseCredit - prevP) / (L.phrases - prevP)));
    const ap = acc == null ? 0 : Math.min(1, acc / L.acc);
    const pct = Math.round(100 * (hp * .4 + pp * .4 + ap * .2));
    const quality = acc == null ? 1 : Math.max(.7, Math.min(1.25, acc / L.acc));
    const hoursLeft = Math.max(0, L.hours - hours) / quality;
    const phrasesLeft = Math.max(0, L.phrases - phraseCredit), phraseHours = phrasesLeft / 14;   // ~14 phrases learned well per study hour
    const left = Math.max(hoursLeft, phraseHours);
    const daysLeft = left * 60 / Math.max(5, pace);
    return { ...L, pct, hp, pp, ap, hoursLeft: left, daysLeft, phrasesLeft: Math.round(phrasesLeft) };
  });
  const current = lv.find(l => l.pct < 100) || lv[lv.length - 1];
  const todayMin = Math.round((S.stats.secs[todayKey()] || 0) / 60);
  return { hours, learned, mastered, acc, pace, lv, current, todayMin, days };
}
const fmtETA = d => d < 1 ? 'today' : d < 14 ? `~${Math.round(d)} days` : d < 70 ? `~${Math.round(d / 7)} weeks` : `~${Math.round(d / 30)} months`;
const fmtDate = d => new Date(Date.now() + d * 864e5).toLocaleDateString(({ ar: 'ar-EG', pt: 'pt-BR' })[S.ui] || 'en-GB', { day: 'numeric', month: 'short', year: d > 300 ? 'numeric' : undefined });
const MILESTONES = [
  ['Primeira conversa', 'Send your first message to a partner', m => S.stats.chats >= 1],
  ['First call', 'Finish a voice call', m => S.stats.calls >= 1],
  ['10 phrases', 'Have 10 phrases in your review deck', m => m.learned >= 10],
  ['Shadow 25 lines', 'Repeat 25 native lines', m => S.stats.shadowed >= 25],
  ['Survived the boteco', 'Finish the Gírias mission', m => !!S.done[T.slangUnit]],
  ['5-day streak', 'Practise 5 days in a row', m => S.streak.n >= 5],
  ['50 mastered', '50 phrases at 7+ day intervals', m => m.mastered >= 50],
  ['Clear speaker', 'Average 80+ over your last 40 attempts', m => (m.acc || 0) >= 80],
  ['10 hours', 'Ten hours of real practice', m => m.hours >= 10],
  ['Made by you', 'Ask Lucy to write a mission for you', m => S.custom.length >= 1],
  ['A1 reached', 'Hit 100% on A1', m => m.lv[0].pct >= 100],
  ['A2 reached', 'Hit 100% on A2', m => m.lv[1].pct >= 100],
];
loadCourse(S.course);
