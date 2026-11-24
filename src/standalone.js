
// ---------- standalone build (GitHub Pages / APK): Google sign-in sync + Gemini partner ----------
// Loaded only outside claude.ai. Firebase config comes from firebase-config.js (window.LUCY_FIREBASE).
(function () {
  if (window.claude) return;
  SYNC_KEYS.push('geminiKey');
  S.geminiKey = store.get('geminiKey', '');
  const BUILT_IN = window.LUCY_GEMINI_KEY || '';   // injected at build time from the GEMINI_KEY repo secret
  const key = () => S.geminiKey || BUILT_IN;

  // --- Gemini as the AI partner (free key, kept on the device and in the user's own synced doc) ---
  const MODELS = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite'];
  async function gemini(prompt, json) {
    if (!key()) throw { code: 'not_granted' };
    const contents = Array.isArray(prompt) ? prompt.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })) : [{ role: 'user', parts: [{ text: prompt }] }];
    const safetySettings = ['HARASSMENT', 'HATE_SPEECH', 'SEXUALLY_EXPLICIT', 'DANGEROUS_CONTENT'].map(c => ({ category: 'HARM_CATEGORY_' + c, threshold: 'BLOCK_ONLY_HIGH' }));
    let last;
    for (const m of MODELS) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key() },
        body: JSON.stringify({ contents, safetySettings, generationConfig: json ? { responseMimeType: 'application/json', temperature: 1 } : { temperature: 1 } }) });
      if (r.status === 404 || r.status >= 500) { last = { code: r.status === 404 ? 'model' : 'busy' }; continue; }   // retired model or busy: try the next one
      if (r.status === 429) throw { code: 'rate_limited' };
      if (r.status === 400 || r.status === 403) throw { code: 'bad_key' };
      if (!r.ok) throw { code: 'error' };
      const d = await r.json(); const text = (d.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
      if (!text) throw { code: 'blocked' };
      return text;
    }
    throw last || { code: 'error' };
  }
  const shim = async (input) => ({ text: await gemini(input, false), truncated: false });
  shim.json = async (input) => { const t = await gemini(input, true); return JSON.parse(t.replace(/^```json\s*|```$/g, '')); };
  const setAI = () => { P.sample = key() ? shim : null; };
  setAI();

  // --- Gemini voices: natural Brazilian Portuguese, one voice per character, cached so repeats cost nothing ---
  const GV = { f: ['Leda', 'Aoede', 'Kore', 'Despina'], m: ['Puck', 'Charon', 'Fenrir', 'Orus'], you: ['Achird', 'Zephyr', 'Sadaltager', 'Autonoe'] };
  VOICE_SET = GV;
  const fixVoices = () => { const v = S.voices || {}; S.voices = { f: GV.f.includes(v.f) ? v.f : 'Leda', m: GV.m.includes(v.m) ? v.m : 'Puck', you: GV.you.includes(v.you) ? v.you : 'Achird' }; };
  fixVoices();
  const TTS_MODELS = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-2.5-flash-preview-tts'];
  const player = new Audio(); player.preload = 'auto'; let playing = null;
  // phones only let audio play after a tap: unlock the one player on the first touch
  const unlock = () => { player.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA='; player.play().catch(() => {}); removeEventListener('pointerdown', unlock, true); };
  addEventListener('pointerdown', unlock, true);
  const wavFromPcm = (pcm, rate = 24000) => { const h = new ArrayBuffer(44), d = new DataView(h), w = (o, s) => [...s].forEach((c, i) => d.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); d.setUint32(4, 36 + pcm.length, true); w(8, 'WAVE'); w(12, 'fmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
    d.setUint32(24, rate, true); d.setUint32(28, rate * 2, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, 'data'); d.setUint32(40, pcm.length, true); return new Blob([h, pcm], { type: 'audio/wav' }); };
  let ttsCache = null; caches?.open('lucy-voice').then(c => ttsCache = c).catch(() => {});
  async function voiceBlob(text, voice) {
    const k = new Request(`https://voice.lucy/${voice}/${encodeURIComponent(text)}`);
    const hit = await ttsCache?.match(k); if (hit) return hit.blob();
    for (const m of TTS_MODELS) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key() },
        body: JSON.stringify({ contents: [{ parts: [{ text }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } }) }).catch(() => null);
      if (!r || !r.ok) continue;                                   // busy, out of free quota or retired: try the next model
      const part = (await r.json()).candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData; if (!part) continue;
      const bytes = Uint8Array.from(atob(part.data), c => c.charCodeAt(0));
      const blob = /wav/.test(part.mimeType) ? new Blob([bytes], { type: 'audio/wav' }) : wavFromPcm(bytes, +(part.mimeType.match(/rate=(\d+)/)?.[1] || 24000));
      ttsCache?.put(k, new Response(blob)).catch(() => {}); return blob;
    }
    throw { code: 'unavailable' };
  }
  async function browserSay(text, g, rate) {
    const NT = window.Capacitor?.Plugins?.TextToSpeech;   // APK: Android's own voices
    if (NT) { try { const vi = await nativeVoice(g); await NT.speak({ text, lang: S.variant, rate: rate < 1 ? .75 : 1, ...(vi != null ? { voice: vi } : {}) }); } catch (_) {} return; }
    if (!('speechSynthesis' in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = S.variant;
    const v = browserVoice(g); if (v) u.voice = v; u.rate = rate < 1 ? .7 : .95; return new Promise(r => { u.onend = u.onerror = r; speechSynthesis.speak(u); }); }
  const geminiVoice = {
    async speak(text, { voice, rate = 1 } = {}) {
      const g = Object.keys(GV).find(k => GV[k].includes(voice)) || 'f';
      if (!key()) return browserSay(text, g === 'you' ? 'm' : g, rate);
      const id = {}; playing = id;
      let blob; try { blob = await voiceBlob(text, voice); } catch (_) { if (playing === id) return browserSay(text, g === 'you' ? 'm' : g, rate); return; }
      if (playing !== id) return;
      const url = URL.createObjectURL(blob); player.src = url; player.preservesPitch = true; player.playbackRate = rate;
      await new Promise(res => { player.onended = player.onerror = player.onpause = res; player.play().catch(res); }); URL.revokeObjectURL(url);
    },
    stop() { playing = null; try { player.pause(); } catch (_) {} },
  };
  P.tts = geminiVoice;

  // --- pre-made voices: every fixed lesson and scene line has a neural voice file made when the site is built
  // (Francisca / Antonio for Portuguese, Salma / Shakir for Egyptian Arabic). Live chat lines still use Gemini.
  const EDGE = { 'pt-BR': { f: 'pt-BR-FranciscaNeural', m: 'pt-BR-AntonioNeural' }, 'ar-EG': { f: 'ar-EG-SalmaNeural', m: 'ar-EG-ShakirNeural' } };
  const fnv = s => { let h = 0x811c9dc5; for (const c of new TextEncoder().encode(s)) { h ^= c; h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
  let VOICED = new Set(); fetch('voice/index.json').then(r => r.ok ? r.json() : []).then(a => VOICED = new Set(a)).catch(() => {});
  const fileFor = (text, who) => { const V = EDGE[LANG()]; if (!V) return null; const g = genderOf(who); const id = fnv(V[g === 'f' ? 'f' : 'm'] + '|' + String(text).trim()); return VOICED.has(id) ? 'voice/' + id + '.mp3' : null; };
  const liveSay = say;
  say = async function (text, slow, who = 'Lucy') {
    const f = fileFor(text, who); if (!f) return liveSay(text, slow, who);
    const id = {}; playing = id; player.src = f; player.preservesPitch = true; player.playbackRate = slow ? .75 : 1;
    await new Promise(res => { player.onended = player.onerror = player.onpause = res; player.play().catch(res); });
  };
  P.ready.then(() => { P.tts = geminiVoice; });

  // --- Google sign-in + Firestore sync ---
  const cfg = window.LUCY_FIREBASE; let auth = null, fs = null, who = null;
  const FIRST_PARTY = /\.(web\.app|firebaseapp\.com)$/.test(location.hostname);
  const HOME = cfg ? `https://${cfg.projectId}.web.app/` : '';
  const MOBILE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || matchMedia('(display-mode: standalone)').matches;
  if (cfg && window.firebase) {
    try {
      // On Firebase Hosting the sign-in helper lives on this same domain, so phones keep the session (no third-party storage).
      if (FIRST_PARTY) cfg.authDomain = location.host;
      firebase.initializeApp(cfg); auth = firebase.auth(); fs = firebase.firestore();
      auth.getRedirectResult().catch(e => toast('Google sign-in failed: ' + (e.code || e.message)));
      auth.onAuthStateChanged(async u => {
        who = u;
        if (!u) { Sync.ref = null; Sync.state = 'local'; refreshSync(); return; }
        const pulled = await Sync.connect(fs.doc('users/' + u.uid + '/lucy/progress'));
        fixVoices();
        if (Sync.state === 'error') toast('Signed in, but the cloud save failed: ' + (Sync.err || 'unknown') + '. Saved on this device.');
        S.geminiKey = S.geminiKey || ''; setAI(); refreshSync();
        if (pulled) { render(cur, false); toast('Progress loaded from your Google account'); }
      });
    } catch (e) { console.warn('firebase init failed', e); auth = null; }
  }
  async function signIn() {
    const pr = new firebase.auth.GoogleAuthProvider(); pr.setCustomParameters({ prompt: 'select_account' });
    if (FIRST_PARTY && MOBILE) return auth.signInWithRedirect(pr);          // same-domain redirect: the reliable path on phones
    try { await auth.signInWithPopup(pr); }
    catch (e) {
      if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
      if (FIRST_PARTY) return auth.signInWithRedirect(pr);
      // GitHub Pages: phone browsers block the cross-site sign-in hand-off, so send people to the Firebase-hosted copy
      modal(`<h3>Sign in on Lucy’s main address</h3><p>Your browser blocked Google sign-in on this address (${esc(e.code || 'blocked')}). Sign-in works on Lucy’s main address. Your progress comes with you once you sign in there.</p><a class="btn wide" href="${HOME}">Open ${esc(HOME.replace('https://', '').replace(/\/$/, ''))}</a>`);
    }
  }
  function refreshSync() { const el = document.getElementById('sync'); if (el) { el.innerHTML = syncHTML(); bindSync(el); } }
  function syncHTML() {
    if (!auth) return 'Saved on this device. Google sign-in turns on once the Firebase config is added.';
    if (!who) return `Saved on this device only.<br><button class="btn sm" id="g-in" style="margin-top:8px">Sign in with Google</button>`;
    return `Signed in as <b>${esc(who.email || who.displayName || 'you')}</b>. ${Sync.state === 'error' ? 'Couldn’t reach the cloud just now; it retries on the next change.' : 'Progress follows you to every device.'}<br><button class="link" id="g-out">Sign out</button>`;
  }
  function bindSync(el) { el.querySelector('#g-in')?.addEventListener('click', signIn); el.querySelector('#g-out')?.addEventListener('click', () => auth.signOut()); }
  syncLine = syncHTML;

  // --- settings: sync buttons + Gemini key ---
  const base = settingsSheet;
  settingsSheet = function () {
    base();
    const p = document.getElementById('panel'); bindSync(p.querySelector('#sync'));
    const k = document.createElement('div'); k.style.cssText = 'display:flex;flex-direction:column;gap:6px';
    k.innerHTML = `<p class="lbl">AI partner key (free Gemini)</p><div class="maker-in" style="margin:0"><input id="gk" type="password" autocomplete="off" placeholder="${BUILT_IN ? 'Built-in key in use' : 'Paste your Gemini API key'}" value="${esc(S.geminiKey)}"><button class="btn sm" id="gk-save">Save</button></div>
      <p class="fine" style="margin:0">${S.geminiKey ? 'Live AI partner is on with your key.' : BUILT_IN ? 'Live AI partner is on (built-in key). Paste your own to override it.' : 'Without a key, partners use practice scripts.'} The key stays on this device${who ? ' and in your own Google sync' : ''}.</p>`;
    p.querySelector('#sync').after(k);
    k.querySelector('#gk-save').onclick = async () => { S.geminiKey = k.querySelector('#gk').value.trim(); store.set('geminiKey', S.geminiKey); setAI();
      if (!S.geminiKey) return toast('Key removed');
      try { await shim('Reply with the single word: oi'); toast('Lucy’s brain is online.'); } catch (e) { toast(e.code === 'bad_key' ? 'That key didn’t work. Check it and try again.' : 'Saved. Gemini didn’t answer yet, try a chat.'); } };
  };

  // --- installable web app ---
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
