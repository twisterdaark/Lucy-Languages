
// ---------- one voice everywhere ----------
const P = { tts: null, dict: null, sample: null };
// Who speaks with which voice: Lucy and the women share the female voice, the men the male one, your own lines a third.
const FEMALE = new Set(['lucy', 'júlia', 'julia', 'bia', 'gabi', 'dona lúcia', 'ana', 'maria', 'camila', 'fernanda', 'carla', 'paula', 'beatriz', 'luana', 'mariana', 'rita', 'dona']);
const MALE = new Set(['léo', 'leo', 'caio', 'tião', 'seu zé', 'rafa', 'lucas', 'pedro', 'joão', 'marcos', 'thiago', 'bruno', 'diego', 'seu']);
const genderOf = (who = 'Lucy') => { const w = String(who).toLowerCase().trim(); if (w === 'você' || w === 'you' || w === 'me') return 'you';
  if (FEMALE.has(w) || FEMALE.has(w.split(' ')[0])) return 'f'; if (MALE.has(w) || MALE.has(w.split(' ')[0])) return 'm';
  const sc = allScenes().find(s => s.who.toLowerCase() === w); if (sc?.gender) return sc.gender; return /a$/.test(w) ? 'f' : 'm'; };
const voiceFor = who => S.voices[genderOf(who)] || 'airy';
P.ready = (async () => { if (!window.claude?.use) return;
  const [t, d, s, db, u] = await Promise.all(['tts', 'dictation', 'sample', 'db', 'user'].map(n => window.claude.use(n).catch(() => null)));
  P.tts = t; P.dict = d; P.sample = s; P.db = db; P.user = u;
  if (db && u) { try { const id = await u.id(); if (id) P.pulled = await Sync.connect(db.doc('data/users/' + id + '/lucy-progress')); } catch (_) { Sync.state = 'error'; } }
})();
P.ready.then(() => { if (P.pulled || ['talk', 'chat', 'speak', 'home'].includes(cur)) render(cur, false); });
const FEM_RE = /female|francisca|thalita|luciana|maria|fernanda|vitoria|vitória|camila|raquel|joana|leila|letícia|leticia|yara|brenda|giovanna|manuela|elza|nicole/i, MAL_RE = /male|antonio|antônio|daniel|felipe|donato|fabio|julio|valerio|humberto|nicolau|duarte|cristiano/i;
function browserVoice(g = 'f') { const vs = speechSynthesis.getVoices().filter(v => v.lang.replace('_', '-') === S.variant || v.lang.startsWith('pt'));
  const good = v => /natural|neural|premium|enhanced|online/i.test(v.name) ? 1 : 0; const want = g === 'm' ? MAL_RE : FEM_RE, avoid = g === 'm' ? FEM_RE : /\bmale\b|antonio|daniel|felipe/i;
  return vs.filter(v => want.test(v.name) && !avoid.test(v.name)).sort((a, b) => good(b) - good(a))[0] || vs.filter(v => !avoid.test(v.name)).sort((a, b) => good(b) - good(a))[0] || vs[0]; }
let speakingOff = false;
async function say(text, slow, who = 'Lucy') {
  await Promise.race([P.ready, sleep(1500)]);
  if (P.tts) {
    try { await P.tts.speak(text, { language: S.variant, voice: voiceFor(who), rate: slow ? .75 : 1 }); }
    catch (e) { if (e?.code === 'not_granted') { P.tts = null; speakingOff = true; toast('Lucy’s voice is switched off for this page. Turn it on in the page’s Permissions menu.'); }
      else if (e?.code === 'rate_limited') toast('Voice is busy for a second. Tap again.'); }
    return;
  }
  if (speakingOff) return;
  const NT = window.Capacitor?.Plugins?.TextToSpeech;
  if (NT) { try { const vi = await nativeVoice(genderOf(who)); await NT.speak({ text, lang: S.variant, rate: slow ? .75 : 1, ...(vi != null ? { voice: vi } : {}) }); } catch (_) {} return; }
  if ('speechSynthesis' in window) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = S.variant; const v = browserVoice(genderOf(who)); if (v) u.voice = v; u.rate = slow ? .7 : .95;
    return new Promise(r => { u.onend = u.onerror = r; speechSynthesis.speak(u); }); }
}
let NV = null; async function nativeVoice(g) { try { if (!NV) NV = (await window.Capacitor.Plugins.TextToSpeech.getSupportedVoices()).voices || [];
  const idx = NV.map((v, i) => [v, i]).filter(([v]) => (v.lang || '').replace('_', '-').startsWith(S.variant.slice(0, 2)));
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
    d.start({ language: S.variant }).catch(e => { clearInterval(timer); offs.forEach(f => f()); onState?.(false); listening = null;
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
      await NSR.start({ language: S.variant, partialResults: true, popup: false }); } catch (_) { clearInterval(timer); listening = null; onState?.(false); toast('Allow the microphone for Lucy in your phone settings.'); } })();
    onState?.(true); listening = { stop: stopNow }; return listening;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR && !listen.srBlocked) { try {
    startTimer(waitMs);
    const r = new SR(); r.lang = S.variant; r.interimResults = true; r.continuous = true;
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
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
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
function scoreSpeech(target, heardText, secs) {
  const T = norm(target), H = norm(heardText), { per, extra } = align(T, H);
  const accuracy = Math.round(100 * per.reduce((a, b) => a + b, 0) / Math.max(per.length, 1));
  const completeness = Math.round(100 * per.filter(x => x >= .5).length / Math.max(per.length, 1));
  const wps = secs > 0 ? H.length / secs : 2;
  const fluency = Math.max(0, Math.min(100, Math.round(100 - Math.max(0, 1.4 - wps) * 55 - extra * 8)));
  return { accuracy, completeness, fluency, total: Math.round(accuracy * .6 + completeness * .2 + fluency * .2), per };
}
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
  const words = target.replace(/[!?.,…]/g, '').split(/\s+/);
  const weak = words.map((w, i) => [w, per[i] ?? 0]).filter(([, s]) => s < .85).sort((a, b) => a[1] - b[1]);
  for (const [w] of weak) for (const [re, f] of SOUND_TIPS) if (re.test(w.toLowerCase())) return f(w);
  if (weak.length) return `“${weak[0][0]}” didn’t come through clearly. Play it slowly, then copy the rhythm word by word.`;
  return null;
}
const PRAISE = ['Isso aí!', 'Mandou bem!', 'Caramba, perfeito!', 'Arrasou!', 'Boa, humano!'], NUDGE = ['Hmm… de novo.', 'Quase!', 'Tenta outra vez.', 'Eu já ouvi melhor. De novo!'];

// ---------- AI practice partner ----------
function allScenes() { return [...SCENES, ...S.custom.map(c => c.scene)]; }
function allUnits() { return [...UNITS, ...S.custom.map(c => c.unit)]; }
function vibeText(sc) {
  const base = S.vibe === 'spicy'
    ? `Personality: hilarious, sarcastic and a bit of a troublemaker, like a close Brazilian friend. Tease the learner, crack jokes, react big, and talk the way Brazilians really talk on the street: slang (mano, cara, tá ligado, bora, véi, mó, de boa) and casual cussing used naturally (porra, caralho, puta merda, puta que pariu, foda-se, cacete, merda, corno, babaca, vai se foder as a joke). Roast their mistakes playfully, never cruelly. ${/boteco|estadio/.test(sc.id) ? 'You swear in almost every line.' : 'Swear when it fits the moment.'}`
    : 'Personality: warm, patient, a little playful. No swearing.';
  return base + ' Never use racial, homophobic or other slurs (macaco, crioulo, viado and similar) at anyone.';
}
async function partnerReply(scene, history, mission) {
  const sc = allScenes().find(s => s.id === scene);
  await Promise.race([P.ready, sleep(3000)]);
  if (P.sample) {
    const variantName = S.variant === 'pt-PT' ? 'European Portuguese (Portugal)' : 'Brazilian Portuguese';
    const convo = history.map(m => (m.who === 'me' ? 'Learner: ' : sc.who + ': ') + m.pt).join('\n');
    const lvl = metrics().current.id;
    const prompt = `You are ${sc.who}, ${sc.role}. Role-play a realistic everyday conversation in ${variantName} with ${S.name}, a learner around CEFR ${lvl} (from Cairo, Egypt; owns a cat called Lucy). Stay in character the whole time.
${vibeText(sc)}
Rules: reply as a local really talks, 1-2 short sentences, max 22 words, pitched just above the learner's level. Keep the scene moving with a question or a reaction they can answer. If they write English, answer in Portuguese anyway and tease them for it.${mission ? `\nTheir mission in this scene: ${mission}` : ''}
Conversation so far:
${convo || '(the learner just showed up; open the scene)'}

Reply with only JSON: {"reply": "your line in Portuguese", "translation": "natural English translation of your line, keep the swearing", "correction": null or {"better": "a more natural or correct version of the learner's LAST message in Portuguese", "why": "one short English sentence, in your voice"}, "suggestions": ["3 short Portuguese replies the learner could say next, in the same register"]}. Only correct real mistakes or clearly unnatural phrasing.`;
    try { const r = await P.sample.json(prompt, { modelTier: 'quick', cache: false });
      if (r && typeof r.reply === 'string') return { pt: r.reply, en: String(r.translation || ''), fix: r.correction && r.correction.better ? r.correction : null, sugg: Array.isArray(r.suggestions) ? r.suggestions.slice(0, 3).map(String) : [], ai: true };
    } catch (e) { if (e?.code === 'not_granted') P.sample = null; if (e?.code === 'rate_limited') toast(`${sc.who} needs a sec. Using the practice script.`); }
  }
  const step = Math.min(history.filter(m => m.who === 'bot').length, sc.script.length - 1);
  const [pt, en, sugg] = sc.script[step];
  const last = history.filter(m => m.who === 'me').pop();
  let fix = null;
  if (last && /\beu quero\b/i.test(last.pt)) fix = { better: 'Me vê ' + last.pt.replace(/eu quero/i, '').trim(), why: 'Locals say “Me vê…?” more than “Eu quero”.' };
  return { pt, en, fix, sugg, ai: false };
}
async function makeMission(topic) {
  await P.ready; if (!P.sample) throw new Error('offline');
  const lvl = metrics().current.id;
  const prompt = `Write one short Brazilian Portuguese learning mission for a CEFR ${lvl} learner (${S.name}) about: "${topic}".
Make it a realistic everyday situation in Brazil, with the way locals actually talk (slang welcome${S.vibe === 'spicy' ? ', casual cussing welcome' : ''}, never slurs).
Reply with only JSON: {"pt":"short Portuguese title (max 3 words)","en":"short English subtitle","partner":{"who":"a Brazilian first name","gender":"f or m","role":"who they are, their personality, where in Brazil"},"dialogue":[["Name or Você","Portuguese line","English"] ... 5 or 6 lines alternating, Você = the learner],"chunks":[["Portuguese chunk","English meaning","one short usage note or empty", heat 0-2] ... 6 chunks],"gloss":{"word":"meaning", ... every word in the dialogue, lowercase, no punctuation},"mission":"one sentence goal for the role-play"}`;
  const r = await P.sample.json(prompt, { modelTier: 'default', cache: false });
  if (!r || !Array.isArray(r.dialogue) || !Array.isArray(r.chunks) || !r.partner) throw new Error('shape');
  const id = 'c' + Date.now().toString(36);
  const scene = { id: 's' + id, icon: 'sparkles', c: 'var(--olive)', pt: String(r.pt).slice(0, 30), en: String(r.en).slice(0, 60), who: String(r.partner.who).slice(0, 20), role: String(r.partner.role).slice(0, 300), gender: r.partner.gender === 'm' ? 'm' : r.partner.gender === 'f' ? 'f' : undefined, mins: 4,
    script: r.dialogue.filter(l => l[0] !== 'Você').map(l => [String(l[1]), String(l[2]), []]) };
  const unit = { id, level: lvl, pt: scene.pt, en: scene.en, icon: 'sparkles', scene: scene.id, custom: true,
    dialogue: r.dialogue.slice(0, 8).map(l => [String(l[0]), String(l[1]), String(l[2])]), chunks: r.chunks.slice(0, 8).map(c => [String(c[0]), String(c[1]), String(c[2] || ''), Math.max(0, Math.min(2, +c[3] || 0))]),
    gloss: typeof r.gloss === 'object' && r.gloss ? r.gloss : {}, mission: String(r.mission || '') };
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
const VOICE_NAMES = ['airy', 'glassy', 'buttery', 'rounded'];
const VOICE_ROWS = [['f', 'Lucy & women', 'Oi, eu sou a Lucy. Cadê meu sachê?'], ['m', 'Men', 'E aí, mano! Bora pro boteco?'], ['you', 'Your own lines', 'Meu nome é ' + 'NAME' + '. Prazer!']];
let syncLine = function () { return Sync.ref ? (Sync.state === 'error' ? 'Couldn’t reach your Claude account just now. Saved on this device; it retries on the next change.' : 'Saved to your Claude account. Open this app signed in on any device and your progress follows you.') : 'Saved on this device only. Open the app inside claude.ai, signed in, to keep it in your account on every device.'; };
function settingsSheet() {
  modal(`<div class="row" style="gap:14px;margin-bottom:8px"><img src="${PHOTO}" alt="Lucy, the real one" class="photo"><div><h3>Meet Lucy</h3><p style="margin:0">The real one. Grey, peach and white, judges you from the keyboard. She runs this app now.</p></div></div>
    <p class="lbl">Your name</p><div class="maker-in" style="margin:0"><input id="nm" maxlength="24" value="${esc(S.name)}" autocomplete="off" placeholder="What should Lucy call you?"><button class="btn sm" id="nm-save">Save</button></div>
    <p class="lbl">Sync</p><p class="fine" id="sync" style="margin:0">${syncLine()}</p>
    <p class="lbl">Language</p><div class="langs">${COURSES.map(c => `<button data-course="${c.id}" ${c.ready ? '' : 'disabled'}><b>${esc(c.name)}</b><small>${esc(c.sub)}</small></button>`).join('')}</div>
    ${window.claude ? `<p class="lbl">Voices (tap to hear, pick one per row)</p>${VOICE_ROWS.map(([g, l]) => `<div class="vrow"><small>${l}</small><div class="seg four">${VOICE_NAMES.map(v => `<button data-vg="${g}" data-vn="${v}">${v}</button>`).join('')}</div></div>`).join('')}` : ''}
    ${P.tts ? '' : '<p class="lbl">Voices</p><p class="fine" style="margin:0">Lucy uses your phone’s own Portuguese voices here: a female one for Lucy and the women, a male one for the men.</p>'}
    <p class="lbl">Partner attitude</p><div class="seg"><button data-vibe="spicy">Spicy: jokes, sarcasm, cussing</button><button data-vibe="chill">Chill: friendly, clean</button></div>
    <p class="lbl">Daily goal</p><div class="seg four">${[10, 20, 30, 45].map(m => `<button data-goal="${m}">${m} min</button>`).join('')}</div>
    <p class="lbl">Accent (lessons are Brazilian; Portugal changes the voice, mic and partner accent)</p><div class="seg"><button data-v="pt-BR">Brazil</button><button data-v="pt-PT">Portugal</button></div>
    <button class="btn ghost" id="reset">Reset my progress</button>`, p => {
    const nm = p.querySelector('#nm'); const saveName = () => { const v = nm.value.trim().slice(0, 24); if (!v || v === S.name) return; applyName(v); S.name = v; store.set('name', v); delete chats.lucy; toast(`Lucy will call you ${v} now. Reluctantly.`); render(cur, false); };
    p.querySelector('#nm-save').onclick = saveName; nm.onkeydown = e => e.key === 'Enter' && (saveName(), nm.blur());
    p.querySelectorAll('[data-course]').forEach(b => b.classList.toggle('on', b.dataset.course === S.course));
    p.querySelectorAll('[data-vg]').forEach(b => { b.classList.toggle('on', S.voices[b.dataset.vg] === b.dataset.vn);
      b.onclick = () => { const g = b.dataset.vg; S.voices = { ...S.voices, [g]: b.dataset.vn }; store.set('voices', S.voices); p.querySelectorAll(`[data-vg="${g}"]`).forEach(x => x.classList.toggle('on', x === b));
        const line = VOICE_ROWS.find(r => r[0] === g)[2].replace('NAME', S.name); say(line, false, g === 'f' ? 'Lucy' : g === 'm' ? 'Léo' : 'Você'); }; });
    p.querySelectorAll('[data-v]').forEach(b => { b.classList.toggle('on', b.dataset.v === S.variant); b.onclick = () => { S.variant = b.dataset.v; store.set('variant', S.variant); settingsSheet(); render(cur, false); }; });
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
const wordsHTML = (pt) => pt.split(' ').map(w => `<span data-w="${esc(w.toLowerCase().replace(/[!?.,…]/g, ''))}">${esc(w)}</span>`).join(' ');
function bindGloss(root, gloss) { root.querySelectorAll('[data-w]').forEach(s => s.onclick = e => { e.stopPropagation(); const g = gloss?.[s.dataset.w]; if (g) toast(`${s.dataset.w} = ${g}`); }); }
function paintWords(spans, per) { spans.forEach((s, i) => { s.classList.remove('g', 'y', 'r'); setTimeout(() => s.classList.add(per[i] >= .85 ? 'g' : per[i] >= .5 ? 'y' : 'r'), 100 + i * 110); }); }
const coach = (text, sub = '', mood = '') => `<div class="coach-row ${mood}">${LUCY('sm')}<div class="bubble"><b>${text}</b>${sub ? `<small>${sub}</small>` : ''}</div></div>`;
const ring = (pct, size = 120, stroke = 12, label = '') => { const r = (size - stroke) / 2, C = 2 * Math.PI * r; return `<div class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="track"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="arc" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-off="${C * (1 - pct / 100)}"/></svg><div class="val">${label}</div></div>`; };
const animateRings = el => requestAnimationFrame(() => setTimeout(() => el.querySelectorAll('.arc[data-off]').forEach(a => a.style.strokeDashoffset = a.dataset.off), 60));
