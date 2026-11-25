
// ---------- one voice everywhere ----------
const P = { tts: null, dict: null, sample: null };
// Who speaks with which voice: Lucy and the women share the female voice, the men the male one, your own lines a third.
const FEMALE = new Set([...PT_COURSE.people.f, ...AR_COURSE.people.f]), MALE = new Set([...PT_COURSE.people.m, ...AR_COURSE.people.m]);
const genderOf = (who = 'Lucy') => { const w = String(who).toLowerCase().trim(); if (w === 'você' || w === 'you' || w === 'me' || w === 'إنت') return 'you';
  const sc0 = allScenes().find(s => s.who.toLowerCase() === w); if (sc0?.gender) return sc0.gender;
  if (FEMALE.has(w) || FEMALE.has(w.split(' ')[0])) return 'f'; if (MALE.has(w) || MALE.has(w.split(' ')[0])) return 'm';
  const sc = allScenes().find(s => s.who.toLowerCase() === w); if (sc?.gender) return sc.gender; return /a$/.test(w) ? 'f' : 'm'; };
const voiceFor = who => S.voices[genderOf(who)] || 'airy';
P.ready = (async () => { if (!window.claude?.use) return;
  const [t, d, s, db, u] = await Promise.all(['tts', 'dictation', 'sample', 'db', 'user'].map(n => window.claude.use(n).catch(() => null)));
  P.tts = t; P.dict = d; P.sample = s; P.db = db; P.user = u;
  if (db && u) { try { const id = await u.id(); if (id) P.pulled = await Sync.connect(db.doc('data/users/' + id + '/lucy-progress')); } catch (_) { Sync.state = 'error'; } }
})();
P.ready.then(() => { if (P.pulled || ['talk', 'chat', 'speak', 'home'].includes(cur)) render(cur, false); });
const FEM_RE = /female|francisca|thalita|luciana|maria|fernanda|vitoria|vitória|camila|raquel|joana|leila|letícia|leticia|yara|brenda|giovanna|manuela|elza|nicole|salma|hoda|laila|zariyah|amany|shakira/i, MAL_RE = /male|shakir|naayf|hamed|maged|tarik|antonio|antônio|daniel|felipe|donato|fabio|julio|valerio|humberto|nicolau|duarte|cristiano/i;
function browserVoice(g = 'f') { const vs = speechSynthesis.getVoices().filter(v => v.lang.replace('_', '-') === LANG() || v.lang.startsWith(LANG().slice(0, 2)));
  const good = v => /natural|neural|premium|enhanced|online/i.test(v.name) ? 1 : 0; const want = g === 'm' ? MAL_RE : FEM_RE, avoid = g === 'm' ? FEM_RE : /\bmale\b|antonio|daniel|felipe/i;
  return vs.filter(v => want.test(v.name) && !avoid.test(v.name)).sort((a, b) => good(b) - good(a))[0] || vs.filter(v => !avoid.test(v.name)).sort((a, b) => good(b) - good(a))[0] || vs[0]; }
let speakingOff = false;
async function say(text, slow, who = 'Lucy') {
  await Promise.race([P.ready, sleep(1500)]);
  if (P.tts) {
    try { await P.tts.speak(text, { language: LANG(), voice: voiceFor(who), rate: slow ? .75 : 1 }); }
    catch (e) { if (e?.code === 'not_granted') { P.tts = null; speakingOff = true; toast('Lucy’s voice is switched off for this page. Turn it on in the page’s Permissions menu.'); }
      else if (e?.code === 'rate_limited') toast('Voice is busy for a second. Tap again.'); }
    return;
  }
  if (speakingOff) return;
  const NT = window.Capacitor?.Plugins?.TextToSpeech;
  if (NT) { try { const vi = await nativeVoice(genderOf(who)); await NT.speak({ text, lang: LANG(), rate: slow ? .75 : 1, ...(vi != null ? { voice: vi } : {}) }); } catch (_) {} return; }
  if ('speechSynthesis' in window) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = LANG(); const v = browserVoice(genderOf(who)); if (v) u.voice = v; u.rate = slow ? .7 : .95;
    return new Promise(r => { u.onend = u.onerror = r; speechSynthesis.speak(u); }); }
}
let NV = null; async function nativeVoice(g) { try { if (!NV) NV = (await window.Capacitor.Plugins.TextToSpeech.getSupportedVoices()).voices || [];
  const idx = NV.map((v, i) => [v, i]).filter(([v]) => (v.lang || '').replace('_', '-').startsWith(LANG().slice(0, 2)));
  const want = g === 'm' ? /male|#m|-m-|x-ptd|ptd/i : /female|#f|-f-|x-afs|afs|pte/i; const hit = idx.find(([v]) => want.test(v.name + ' ' + v.voiceURI)); return (hit || idx[0] || [])[1]; } catch (_) { return null; } }
function stopVoice() { try { window.Capacitor?.Plugins?.TextToSpeech?.stop(); } catch (_) {} try { P.tts?.stop?.(); } catch (_) {} if ('speechSynthesis' in window) speechSynthesis.cancel(); }

// ---------- listening with auto-stop ----------
// 1) Claude dictation (Chrome tabs, Claude desktop). 2) Browser speech recognition. 3) On phones where neither is allowed:
// a text box opens with the keyboard, and the keyboard's own mic key does the listening. Same auto-stop rules everywhere.
let listening = null;
function listen(o) {
  const { onPartial, onDone, onState, target, silenceMs = 1900, waitMs = 7000 } = o;
  if (listening) { listening.stop(); return null; }
  const t0 = performance.now(); let finalText = '', live = '', firstWord = 0, lastChange = t0, stopped = false, timer = null;
  const current = () => (finalText + ' ' + live).trim();
  const changed = () => { const now = performance.now(); if (!firstWord) firstWord = now; lastChange = now; const txt = current(); onPartial?.(txt);
    if (target && txt) { const r = scoreSpeech(target, txt, 0); if (r.completeness === 100 && r.accuracy >= 88) stopNow(); } };
  const stopNow = () => { if (stopped) return; stopped = true; clearInterval(timer); ctl.halt(); };
  const finish = () => { clearInterval(timer); listening = null; onState?.(false); const txt = current(); onDone(txt, firstWord ? Math.max(.6, (lastChange - firstWord) / 1000 + .4) : 0); };
  const ctl = {};
  const startTimer = (wait) => { timer = setInterval(() => { const now = performance.now(); if (firstWord ? now - lastChange > silenceMs : now - t0 > wait) stopNow(); }, 200); };
  if (P.dict) {
    startTimer(waitMs);
    const d = P.dict; const offs = [];
    offs.push(d.onPartial(({ text }) => { live = text || ''; if (text) changed(); }));
    offs.push(d.onFinal(({ text }) => { finalText += ' ' + text; live = ''; changed(); }));
    offs.push(d.onState(({ state, reason }) => { if (state === 'idle') { offs.forEach(f => f()); if (reason === 'unavailable') { P.dict = null; } finish(); } }));
    ctl.halt = () => d.stop(); onState?.(true);
    d.start({ language: LANG() }).catch(e => { clearInterval(timer); offs.forEach(f => f()); onState?.(false); listening = null;
      if (e.code === 'not_granted' || e.code === 'unavailable') { P.dict = null; toast('The page mic is blocked here, so use your keyboard’s mic instead.'); }
      else if (e.code !== 'stopped') toast('Couldn’t start the mic. Tap again.'); });
    listening = { stop: stopNow }; return listening;
  }
  const NSR = window.Capacitor?.Plugins?.SpeechRecognition;
  if (NSR) {
    startTimer(waitMs); let h;
    ctl.halt = async () => { try { await NSR.stop(); } catch (_) {} h?.remove?.(); finish(); };
    (async () => { try { const perm = await NSR.requestPermissions(); if (perm?.speechRecognition && perm.speechRecognition !== 'granted') throw new Error('denied');
      h = await NSR.addListener('partialResults', d => { live = (d.matches || [])[0] || ''; if (live) changed(); });
      await NSR.start({ language: LANG(), partialResults: true, popup: false }); } catch (_) { clearInterval(timer); listening = null; onState?.(false); toast('Allow the microphone for Lucy in your phone settings.'); } })();
    onState?.(true); listening = { stop: stopNow }; return listening;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR && !listen.srBlocked) { try {
    startTimer(waitMs);
    const r = new SR(); r.lang = LANG(); r.interimResults = true; r.continuous = true;
    r.onresult = e => { let f = '', p = ''; for (const res of e.results) (res.isFinal ? (f += res[0].transcript + ' ') : (p += res[0].transcript)); finalText = f; live = p; changed(); };
    r.onerror = e => { if (/not-allowed|service-not-allowed|audio-capture/.test(e.error)) { listen.srBlocked = true; toast('Mic blocked in this view. Tap the mic again to use your keyboard’s mic.'); } };
    r.onend = finish; ctl.halt = () => r.stop(); r.start(); onState?.(true);
    listening = { stop: stopNow }; return listening;
  } catch (_) { listen.srBlocked = true; } }
  // keyboard-mic fallback (opened inside the tap, so the phone shows the keyboard)
  $('#vk').hidden = false; const ta = $('#vk-in'); ta.value = ''; ta.focus();
  $('#vk-target').textContent = target ? target : 'Say your reply';
  startTimer(30000);
  ta.oninput = () => { finalText = ta.value; live = ''; changed(); };
  const close = () => { $('#vk').hidden = true; ta.blur(); finish(); };
  ctl.halt = close; $('#vk-done').onclick = stopNow; $('#vk-x').onclick = () => { finalText = ''; stopNow(); };
  onState?.(true);
  listening = { stop: stopNow }; return listening;
}

// ---------- pronunciation scoring ----------
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
  .replace(/['’\-]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
function lev(a, b) { const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]); for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; }
const sim = (a, b) => 1 - lev(a, b) / Math.max(a.length, b.length, 1);
function align(T, H) {
  const m = T.length, n = H.length, D = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0)), B = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) { D[i][0] = i; B[i][0] = 1; } for (let j = 1; j <= n; j++) { D[0][j] = j * .6; B[0][j] = 2; }
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) { const sub = D[i - 1][j - 1] + (1 - sim(T[i - 1], H[j - 1])), del = D[i - 1][j] + 1, ins = D[i][j - 1] + .6; const best = Math.min(sub, del, ins); D[i][j] = best; B[i][j] = best === sub ? 0 : best === del ? 1 : 2; }
  const out = Array(m).fill(0); let i = m, j = n, extra = 0;
  while (i > 0 || j > 0) { const b = B[i][j]; if (i > 0 && j > 0 && b === 0) { out[i - 1] = sim(T[i - 1], H[j - 1]); i--; j--; } else if (i > 0 && (j === 0 || b === 1)) { out[i - 1] = 0; i--; } else { extra++; j--; } }
  return { per: out, extra };
}
function scoreSpeech(target, heardText, secs) {   // Arabic targets also accept Franco typed or heard in Latin letters
  const r = score1(target, heardText, secs), rom = romOf(target);
  if (rom && /[a-z]/i.test(heardText) && norm(rom).length === norm(target).length) { const r2 = score1(rom, heardText, secs); if (r2.total > r.total) return r2; }
  return r;
}
function score1(target, heardText, secs) {
  const T = norm(target), H = norm(heardText), { per, extra } = align(T, H);
  const accuracy = Math.round(100 * per.reduce((a, b) => a + b, 0) / Math.max(per.length, 1));
  const completeness = Math.round(100 * per.filter(x => x >= .5).length / Math.max(per.length, 1));
  const wps = secs > 0 ? H.length / secs : 2;
  const fluency = Math.max(0, Math.min(100, Math.round(100 - Math.max(0, 1.4 - wps) * 55 - extra * 8)));
  return { accuracy, completeness, fluency, total: Math.round(accuracy * .6 + completeness * .2 + fluency * .2), per };
}
const SOUND_TIPS_AR = [
  [/ع/, w => `“${w}” has ع (3): squeeze deep in the throat, like the start of a gag. Don’t skip it.`],
  [/ح/, w => `“${w}” has ح (7): a breathy, hoarse “h”, like fogging up a mirror hard.`],
  [/خ/, w => `“${w}” has خ (5): the scrape in Scottish “loch” or German “Bach”.`],
  [/غ/, w => `“${w}” has غ (gh): a gargled French “r”.`],
  [/ق/, w => `In Cairo ق is a catch in the throat (2): “2ahwa”, not “qahwa”. Watch “${w}”.`],
  [/ج/, w => `Cairo’s ج is a hard “g” as in “go”: “gamed”, not “jamed”. Watch “${w}”.`],
  [/[صضطظ]/, w => `“${w}” has a heavy letter: pull your tongue back and let it darken the vowels around it.`],
  [/ر/, w => `The ر in “${w}” is a quick tapped “r”, like Spanish “pero”.`],
];
const SOUND_TIPS = [
  [/ão|ãe|õe/, w => `“${w}” has a nasal “ow”: say “ow” while letting air out through your nose, like a soft “oung”.`],
  [/[ãõ]|[aeiou][mn]($|[^aeiouh])/, w => `“${w}” is nasal: hum the vowel through your nose and don’t close the m/n fully.`],
  [/lh/, w => `In “${w}”, “lh” sounds like the “lli” in “million”.`],
  [/nh/, w => `In “${w}”, “nh” sounds like the “ny” in “canyon”.`],
  [/^r|rr/, w => `The “r” in “${w}” is a breathy “h” in Brazil: “Rio” sounds like “HEE-oo”, “porra” like “POH-ha”.`],
  [/t[ie]$|ti|di|d[e]$/, w => `In “${w}”, t/d before an “i” sound become “ch”/“j”: “dia” is “JEE-a”, “noite” is “NOY-chee”.`],
  [/o$/, w => `End “${w}” with a short “oo”: Brazilians say “obrigad-oo”.`],
  [/e$/, w => `A final “e” in “${w}” sounds like “ee”: “leite” is “LAY-chee”.`],
  [/ç/, w => `“ç” in “${w}” is always a plain “s”.`],
  [/x/, w => `“x” in “${w}” usually sounds like “sh”.`],
];
function coachTip(target, per) {
  const words = target.replace(PUNCT, '').split(/\s+/);
  const weak = words.map((w, i) => [w, per[i] ?? 0]).filter(([, s]) => s < .85).sort((a, b) => a[1] - b[1]);
  for (const [w] of weak) for (const [re, f] of (T.sounds === 'ar' ? SOUND_TIPS_AR : SOUND_TIPS)) if (re.test(w.toLowerCase())) return f(w);
  if (weak.length) return `“${weak[0][0]}” didn’t come through clearly. Play it slowly, then copy the rhythm word by word.`;
  return null;
}
const UI_NAME = () => ({ ar: 'Egyptian Arabic', pt: 'Brazilian Portuguese' })[S.ui] || 'English';
const rl = (s, extra = '') => s + extra + (romOf(s) ? `<i class="romi">${esc(romOf(s))}</i>` : '');   // a target-language line with its Franco after it

// ---------- AI practice partner ----------
function allScenes() { return [...SCENES, ...S.custom.map(c => c.scene)]; }
function allUnits() { return [...UNITS, ...S.custom.map(c => c.unit)]; }
function vibeText(sc) {
  const base = S.vibe === 'spicy'
    ? `Personality: hilarious, sarcastic and a bit of a troublemaker, ${T.ai.vibe}. Roast their mistakes playfully, never cruelly. ${/boteco|estadio|mido|match/.test(sc.id) ? 'You swear in almost every line.' : 'Swear when it fits the moment.'}`
    : 'Personality: warm, patient, a little playful. No swearing.';
  return base + ` Never use racial, homophobic or other slurs (${T.ai.slurs}) at anyone.`;
}
async function partnerReply(scene, history, mission, mode = 'chat') {
  const sc = allScenes().find(s => s.id === scene);
  await Promise.race([P.ready, sleep(3000)]);
  if (P.sample) {
    const variantName = T.ai.name(S.variant), AR = T.ai.rom;
    const convo = history.map(m => (m.who === 'me' ? 'Learner: ' : sc.who + ': ') + m.pt).join('\n');
    const lvl = metrics().current.id;
    const prompt = `You are ${sc.who}, ${sc.role}. Role-play a realistic everyday conversation in ${variantName} with ${S.name}, a learner around CEFR ${lvl} (${T.ai.learner}). Stay in character the whole time.
${vibeText(sc)}
${mode === 'call' ? `This is a live phone call. Talk like a real person on the phone, not an assistant or a teacher: use spoken fillers and reactions (${T.ai.fillers}), laugh, interrupt yourself, have your own opinions, moods and little stories from your day, ask the learner about their life, follow a tangent they open and come back to the scene later. Don't push the script; let the chat go where they take it.` : 'This is a text chat. Write like a real friend texting: natural, reactive, with your own opinions, not like an assistant.'}
Rules: reply as a local really talks, 1-3 short sentences, max ${mode === 'call' ? 35 : 28} words, pitched just above the learner's level. First react to exactly what the learner just said (answer their question, respond to their words), then keep the scene moving with a question or a reaction they can answer. Never repeat or reword a line you already said in this conversation. If they write English, answer in ${T.ai.short} anyway and tease them for it.${AR ? ' They may write Arabic script or Franco (Arabizi); understand both.' : ''}${mission ? `\nTheir mission in this scene: ${mission}` : ''}
Conversation so far:
${convo || '(the learner just showed up; open the scene)'}

${AR ? 'Write every Arabic line in Arabic script with Egyptian spelling, and give its Franco-Arabic (Arabizi) transliteration with 2 3 5 7 for ء ع خ ح, word for word.\n' : ''}Reply with only JSON: {"reply": "your line in ${T.ai.short}",${AR ? ' "rom": "Franco of your line",' : ''} "translation": "natural ${UI_NAME()} translation of your line, keep the swearing", ${mode === 'call' ? '' : `"correction": null or {"better": "a more natural or correct version of the learner's LAST message in ${T.ai.short}",${AR ? ' "rom": "its Franco",' : ''} "why": "one short ${UI_NAME()} sentence, in your voice"}, `}"suggestions": ["3 short ${T.ai.short} replies the learner could say next, in the same register"]${AR && mode !== 'call' ? ', "sugg_rom": ["Franco of each suggestion, same order"]' : ''}}. Only correct real mistakes or clearly unnatural phrasing.`;
    const said = new Set(history.filter(m => m.who === 'bot').map(m => norm(m.pt).join(' ')));
    for (let attempt = 0; attempt < 2; attempt++) try { const r = await P.sample.json(attempt ? prompt + '\nYour last attempt repeated an earlier line. Say something new that answers the learner.' : prompt, { modelTier: 'quick', cache: false });
      if (r && typeof r.reply === 'string' && said.has(norm(r.reply).join(' ')) && !attempt) continue;
      if (r && typeof r.reply === 'string') { if (r.rom) ROM[r.reply] = String(r.rom); if (r.correction?.better && r.correction.rom) ROM[r.correction.better] = String(r.correction.rom); (r.suggestions || []).forEach((x, i) => { if (r.sugg_rom?.[i]) ROM[x] = String(r.sugg_rom[i]); });
        return { pt: r.reply, en: String(r.translation || ''), fix: r.correction && r.correction.better ? r.correction : null, sugg: Array.isArray(r.suggestions) ? r.suggestions.slice(0, 3).map(String) : [], ai: true }; }
    } catch (e) { if (e?.code === 'not_granted') { P.sample = null; break; } }
    if (P.sample && !partnerReply.warned) { partnerReply.warned = true; toast(`${sc.who}’s AI is busy right now, so this line is from the practice script. Try again in a minute.`); }
  }
  // practice script: the next line not said yet; once they run out, ask the learner to say it again instead of looping
  const said = new Set(history.filter(m => m.who === 'bot').map(m => m.pt));
  const next = sc.script.find(l => !said.has(l[0]));
  const busy = T.busy; if (busy[2]) ROM[busy[0]] = busy[2];
  const [pt, en, sugg] = next || [busy[0], busy[1], sc.script[0][2]];
  const last = history.filter(m => m.who === 'me').pop();
  let fix = null;
  if (last && T.id === 'pt-BR' && /\beu quero\b/i.test(last.pt)) fix = { better: 'Me vê ' + last.pt.replace(/eu quero/i, '').trim(), why: 'Locals say “Me vê…?” more than “Eu quero”.' };
  return { pt, en, fix, sugg, ai: false };
}
async function makeMission(topic) {
  await P.ready; if (!P.sample) throw new Error('offline');
  const lvl = metrics().current.id;
  const AR = T.ai.rom, L = T.ai.short;
  const prompt = `Write one short ${T.ai.name(S.variant)} learning mission for a CEFR ${lvl} learner (${S.name}) about: "${topic}".
Make it a realistic everyday situation in ${T.ai.place}, with the way locals actually talk (slang welcome${S.vibe === 'spicy' ? ', casual cussing welcome' : ''}, never slurs).${AR ? '\nWrite Arabic in Arabic script with Egyptian spelling, and give Franco-Arabic (Arabizi, 2 3 5 7 for ء ع خ ح) with exactly the same number of words.' : ''}
Reply with only JSON: {"pt":"short ${L} title (max 3 words)","en":"short English subtitle","partner":{"who":"a ${T.ai.native} first name in Latin letters","gender":"f or m","role":"who they are, their personality, where in ${T.ai.place}"},"dialogue":[["Name or Você","${L} line","English"${AR ? ',"Franco"' : ''}] ... 5 or 6 lines alternating, Você = the learner],"chunks":[["${L} chunk","English meaning","one short usage note or empty", heat 0-2${AR ? ',"Franco"' : ''}] ... 6 chunks],"gloss":{"word":"meaning", ... every word in the dialogue, lowercase, no punctuation},"mission":"one sentence goal for the role-play"}`;
  const r = await P.sample.json(prompt, { modelTier: 'default', cache: false });
  if (!r || !Array.isArray(r.dialogue) || !Array.isArray(r.chunks) || !r.partner) throw new Error('shape');
  const id = 'c' + Date.now().toString(36);
  const scene = { id: 's' + id, icon: 'sparkles', c: 'var(--olive)', pt: String(r.pt).slice(0, 30), en: String(r.en).slice(0, 60), who: String(r.partner.who).slice(0, 20), role: String(r.partner.role).slice(0, 300), gender: r.partner.gender === 'm' ? 'm' : r.partner.gender === 'f' ? 'f' : undefined, mins: 4,
    script: r.dialogue.filter(l => l[0] !== 'Você').map(l => [String(l[1]), String(l[2]), []]) };
  const unit = { id, level: lvl, pt: scene.pt, en: scene.en, icon: 'sparkles', scene: scene.id, custom: true,
    dialogue: r.dialogue.slice(0, 8).map(l => [String(l[0]), String(l[1]), String(l[2])]), chunks: r.chunks.slice(0, 8).map(c => [String(c[0]), String(c[1]), String(c[2] || ''), Math.max(0, Math.min(2, +c[3] || 0))]),
    gloss: typeof r.gloss === 'object' && r.gloss ? r.gloss : {}, mission: String(r.mission || '') };
  if (AR) { unit.rom = {}; r.dialogue.forEach(l => l[3] && (unit.rom[String(l[1])] = String(l[3]))); r.chunks.forEach(c => c[4] && (unit.rom[String(c[0])] = String(c[4]))); Object.assign(ROM, unit.rom); }
  S.custom.push({ unit, scene }); store.set('custom', S.custom);
  return unit;
}

// ---------- shell ----------
let cur = 'home';
const TABS = ['home', 'missions', 'review', 'talk', 'progress'], TAB_OF = { chat: 'talk', speak: 'progress', call: null, lesson: null };
function setTab(t) { const tt = t in TAB_OF ? TAB_OF[t] : t; const i = TABS.indexOf(tt); $('#dock').hidden = i < 0; document.querySelectorAll('#dock button').forEach((b, k) => b.classList.toggle('on', k === i)); }
function render(name, animate = true, arg) {
  if (listening) listening.stop();
  cur = name; const v = $('#view'); v.innerHTML = '';
  const el = VIEWS[name](arg); el.classList.add('screen'); if (animate) el.classList.add('enter'); v.appendChild(el); setTab(name); v.scrollTop = 0;
}
let toastT; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3000); }
function modal(html, bind) { $('#panel').innerHTML = html; $('#modal').classList.add('show'); bind?.($('#panel')); }
const closeModal = () => $('#modal').classList.remove('show');
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
document.querySelectorAll('#dock button').forEach(b => b.onclick = () => render(b.dataset.tab));
function confetti() {
  const c = document.createElement('canvas'); c.className = 'confetti'; $('#app').appendChild(c);
  const r = c.getBoundingClientRect(); c.width = r.width * 2; c.height = r.height * 2; const g = c.getContext('2d');
  const cols = ['#ffb98f', '#d8d06a', '#9fb3c8', '#fff4e6', '#6ee7b7'];
  const ps = Array.from({ length: 120 }, () => ({ x: c.width / 2, y: c.height * .35, vx: (Math.random() - .5) * 24, vy: -Math.random() * 24 - 8, r: Math.random() * 6.28, vr: (Math.random() - .5) * .4, w: 8 + Math.random() * 10, c: cols[Math.random() * 5 | 0] }));
  let f = 0; (function tick() { g.clearRect(0, 0, c.width, c.height); ps.forEach(p => { p.vy += .7; p.x += p.vx; p.y += p.vy; p.vx *= .99; p.r += p.vr; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.beginPath(); g.arc(0, 0, p.w / 2, 0, 3.4); g.fill(); g.restore(); });
    if (++f < 150) requestAnimationFrame(tick); else c.remove(); })();
}
const h = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d; };
const variantLabel = () => S.variant === 'pt-PT' ? 'PT-PT' : 'PT-BR';
// voice choices per row: Claude voices inside claude.ai, Gemini voices in the web/APK build (VOICE_SET is replaced there)
let VOICE_SET = { f: ['airy', 'glassy', 'buttery', 'rounded'], m: ['airy', 'glassy', 'buttery', 'rounded'], you: ['airy', 'glassy', 'buttery', 'rounded'] };
const VOICE_ROWS = [['f', 'Lucy & women'], ['m', 'Men'], ['you', 'Your own lines']];
let syncLine = function () { return Sync.ref ? (Sync.state === 'error' ? 'Couldn’t reach your Claude account just now. Saved on this device; it retries on the next change.' : 'Saved to your Claude account. Open this app signed in on any device and your progress follows you.') : 'Saved on this device only. Open the app inside claude.ai, signed in, to keep it in your account on every device.'; };
function settingsSheet() {
  modal(`<div class="row" style="gap:14px;margin-bottom:8px"><img src="${PHOTO}" alt="Lucy, the real one" class="photo"><div><h3>Meet Lucy</h3><p style="margin:0">The real one. Grey, peach and white, judges you from the keyboard. She runs this app now.</p></div></div>
    <p class="lbl">Your name</p><div class="maker-in" style="margin:0"><input id="nm" maxlength="24" value="${esc(S.name)}" autocomplete="off" placeholder="What should Lucy call you?"><button class="btn sm" id="nm-save">Save</button></div>
    <p class="lbl">Sync</p><p class="fine" id="sync" style="margin:0">${syncLine()}</p>
    <p class="lbl">App language</p><div class="seg three">${UI_LANGS.map(([k, n]) => `<button data-ui="${k}" data-keep>${n}</button>`).join('')}</div>
    <p class="lbl">Learn</p><div class="langs">${COURSES.map(c => `<button data-course="${c.id}" ${c.ready ? '' : 'disabled'}><b>${esc(c.name)}</b><small>${esc(c.sub)}</small></button>`).join('')}</div>
    ${P.tts ? `<p class="lbl">Voices (tap to hear, pick one per row)</p>${VOICE_ROWS.map(([g, l]) => `<div class="vrow"><small>${l}</small><div class="seg four">${VOICE_SET[g].map(v => `<button data-vg="${g}" data-vn="${v}">${v}</button>`).join('')}</div></div>`).join('')}` : ''}
    ${P.tts ? '' : '<p class="lbl">Voices</p><p class="fine" style="margin:0">Lucy uses your phone’s own ${T.langWord} voices here: a female one for Lucy and the women, a male one for the men.</p>'}
    <p class="lbl">Partner attitude</p><div class="seg"><button data-vibe="spicy">Spicy: jokes, sarcasm, cussing</button><button data-vibe="chill">Chill: friendly, clean</button></div>
    <p class="lbl">Daily goal</p><div class="seg four">${[10, 20, 30, 45].map(m => `<button data-goal="${m}">${m} min</button>`).join('')}</div>
    ${T.id === 'pt-BR' ? `<p class="lbl">Accent (lessons are Brazilian; Portugal changes the voice, mic and partner accent)</p><div class="seg"><button data-v="pt-BR">Brazil</button><button data-v="pt-PT">Portugal</button></div>` : ''}
    <button class="btn ghost" id="reset">Reset my progress</button>`, p => {
    const nm = p.querySelector('#nm'); const saveName = () => { const v = nm.value.trim().slice(0, 24); if (!v || v === S.name) return; applyName(v); S.name = v; store.set('name', v); delete chats.lucy; toast(`Lucy will call you ${v} now. Reluctantly.`); render(cur, false); };
    p.querySelector('#nm-save').onclick = saveName; nm.onkeydown = e => e.key === 'Enter' && (saveName(), nm.blur());
    p.querySelectorAll('[data-ui]').forEach(b => { b.classList.toggle('on', b.dataset.ui === S.ui); b.onclick = () => { S.ui = b.dataset.ui; store.set('ui', S.ui); applyUI(); render(cur, false); settingsSheet(); }; });
    p.querySelectorAll('[data-course]').forEach(b => { b.classList.toggle('on', b.dataset.course === S.course); b.onclick = () => { if (b.dataset.course === S.course) return; stopVoice(); switchCourse(b.dataset.course); Object.keys(chats).forEach(k => delete chats[k]); closeModal(); render('home'); toast(t(T.id === 'ar-EG' ? 'Yalla! Egyptian Arabic it is.' : 'Bora! Back to Portuguese.')); }; });
    p.querySelectorAll('[data-vg]').forEach(b => { b.classList.toggle('on', S.voices[b.dataset.vg] === b.dataset.vn);
      b.onclick = () => { const g = b.dataset.vg; S.voices = { ...S.voices, [g]: b.dataset.vn }; store.set('voices', S.voices); p.querySelectorAll(`[data-vg="${g}"]`).forEach(x => x.classList.toggle('on', x === b));
        const line = T.samples[g].replace('NAME', S.name); say(line, false, g === 'f' ? 'Lucy' : g === 'm' ? 'Léo' : 'Você'); }; });
    p.querySelectorAll('[data-v]').forEach(b => { b.classList.toggle('on', b.dataset.v === S.variant); b.onclick = () => { S.variant = b.dataset.v; store.set('variant', LANG()); settingsSheet(); render(cur, false); }; });
    p.querySelectorAll('[data-vibe]').forEach(b => { b.classList.toggle('on', b.dataset.vibe === S.vibe); b.onclick = () => { S.vibe = b.dataset.vibe; store.set('vibe', S.vibe); settingsSheet(); }; });
    p.querySelectorAll('[data-goal]').forEach(b => { b.classList.toggle('on', +b.dataset.goal === S.goalMin); b.onclick = () => { S.goalMin = +b.dataset.goal; store.set('goalMin', S.goalMin); settingsSheet(); render(cur, false); }; });
    let armed = false; p.querySelector('#reset').onclick = e => { if (!armed) { armed = true; e.target.textContent = 'Tap again to erase everything'; return; }
      S.done = {}; S.xp = 0; S.streak = { n: 0, last: '' }; S.srs = {}; S.stats = { secs: {}, scores: [], tricky: {}, shadowed: 0, chats: 0, calls: 0, dict: [] };
      ['done', 'xp', 'streak', 'srs', 'stats'].forEach(k => store.set(k, S[k])); closeModal(); render('home'); toast('Progress reset'); };
  });
}
function micButton(root, { target, onDone, onPartial }) {
  const mw = root.querySelector('.mic-wrap'), ml = root.querySelector('.mic-label');
  root.querySelector('.mic').onclick = () => listen({ target,
    onState: on => { mw.classList.toggle('live', on); if (ml) ml.textContent = on ? 'Listening… stops by itself' : 'Tap & speak'; },
    onPartial, onDone });
}
const wordsHTML = (pt) => pt.split(' ').map(w => `<span data-w="${esc(w.toLowerCase().replace(PUNCT, ''))}">${esc(w)}</span>`).join(' ');
function bindGloss(root, gloss) { root.querySelectorAll('[data-w]').forEach(s => s.onclick = e => { e.stopPropagation(); const g = gloss?.[s.dataset.w]; if (g) toast(`${s.dataset.w} = ${t(g)}`); }); }
function paintWords(spans, per) { spans.forEach((s, i) => { s.classList.remove('g', 'y', 'r'); setTimeout(() => s.classList.add(per[i] >= .85 ? 'g' : per[i] >= .5 ? 'y' : 'r'), 100 + i * 110); }); }
const coach = (text, sub = '', mood = '') => `<div class="coach-row ${mood}">${LUCY('sm')}<div class="bubble"><b>${text}</b>${sub ? `<small>${sub}</small>` : ''}</div></div>`;
const ring = (pct, size = 120, stroke = 12, label = '') => { const r = (size - stroke) / 2, C = 2 * Math.PI * r; return `<div class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="track"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="arc" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-off="${C * (1 - pct / 100)}"/></svg><div class="val">${label}</div></div>`; };
const animateRings = el => requestAnimationFrame(() => setTimeout(() => el.querySelectorAll('.arc[data-off]').forEach(a => a.style.strokeDashoffset = a.dataset.off), 60));
