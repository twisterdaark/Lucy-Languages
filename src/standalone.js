
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

  // --- Google sign-in + Firestore sync ---
  const cfg = window.LUCY_FIREBASE; let auth = null, fs = null, who = null;
  if (cfg && window.firebase) {
    try {
      firebase.initializeApp(cfg); auth = firebase.auth(); fs = firebase.firestore();
      auth.getRedirectResult().catch(() => {});
      auth.onAuthStateChanged(async u => {
        who = u;
        if (!u) { Sync.ref = null; Sync.state = 'local'; refreshSync(); return; }
        const pulled = await Sync.connect(fs.doc('users/' + u.uid + '/lucy/progress'));
        S.geminiKey = S.geminiKey || ''; setAI(); refreshSync();
        if (pulled) { render(cur, false); toast('Progress loaded from your Google account'); }
      });
    } catch (e) { console.warn('firebase init failed', e); auth = null; }
  }
  async function signIn() {
    const pr = new firebase.auth.GoogleAuthProvider(); pr.setCustomParameters({ prompt: 'select_account' });
    try { await auth.signInWithPopup(pr); }
    catch (e) { if (/popup|operation-not-supported|web-storage/.test(e.code || '')) await auth.signInWithRedirect(pr); else toast('Sign-in failed: ' + (e.code || 'try again')); }
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
