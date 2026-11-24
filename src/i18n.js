// ---------- menu languages: English, Arabic (Egyptian) or Portuguese ----------
// The screens are written in English. Every piece of English text that lands in the app is swapped for the chosen
// language from three tables: the menus (ui), and each course's meanings and notes (pt-BR → Arabic, ar-EG → Portuguese).
// Numbers are kept: "Review 3 phrases" is looked up as "Review {0} phrases".
const I18N = /*I18N*/{ ui: {}, 'pt-BR': {}, 'ar-EG': {} };
const UI_LANGS = [['en', 'English'], ['ar', 'العربية'], ['pt', 'Português']];
const deviceUI = () => { const l = (navigator.language || 'en').slice(0, 2); return l === 'ar' || l === 'pt' ? l : 'en'; };
S.ui = store.get('ui', deviceUI());
SYNC_KEYS.push('ui');
// first visit: Arabic speakers start on Portuguese and Portuguese speakers on Egyptian Arabic
if (localStorage.getItem('lucy-course') == null && localStorage.getItem('lucy-done') == null && S.ui === 'pt' && S.course !== 'ar-EG') switchCourse('ar-EG');
const TARGET_TEXT = '[data-w], .msg, .chunk b, .ltitle, .say-line, .mbody b, .sbody b, .captions .pt, .chipbtn, .words span';   // lines in the language being learned stay as they are
const I18N_SEEN = new Set();                           // English text with no translation yet (read by the build checks)
function trOne(s) {
  const L = S.ui, ui = I18N.ui, ct = I18N[T.id] || {};
  const hit = k => ui[k]?.[L] ?? ct[k]?.[L];
  let r = hit(s); if (r != null) return r;
  const nums = []; const k = s.replace(/\d+(?:[.,]\d+)?/g, n => (nums.push(n), `{${nums.length - 1}}`));
  if (nums.length) { r = hit(k); if (r != null) return r.replace(/\{(\d)\}/g, (_, i) => nums[+i] ?? ''); }
  if (S.name && s.includes(S.name)) { r = hit(s.split(S.name).join('{n}')); if (r != null) return r.split('{n}').join(S.name); }
  const m = s.match(/^([A-Za-z][A-Za-z ]{1,24}): (.+)$/); if (m) { const a = hit(m[1] + ':'); if (a != null) return a + ' ' + (trOne(m[2]) ?? m[2]); }
  return null;
}
function tr(s) {
  if (S.ui === 'en' || !s || !/[A-Za-z]/.test(s)) return null;
  const lead = s.match(/^\s*/)[0], tail = s.match(/\s*$/)[0], core = s.trim(); if (!core) return null;
  let out = trOne(core);
  if (out == null && core.includes(' · ')) { const parts = core.split(' · ').map(p => trOne(p)); if (parts.some(p => p != null)) out = core.split(' · ').map((p, i) => parts[i] ?? p).join(' · '); }
  if (out == null) { I18N_SEEN.add(core); return null; }
  return lead + out + tail;
}
const t = s => tr(s) ?? s;                              // for strings built in code (toasts, prompts)
function translateTree(root) {
  if (S.ui === 'en') return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = root; n; n = w.nextNode()) {
    if (n.nodeType === 3) { const pe = n.parentElement; if (!pe || pe.closest('script,style,.rom,.romi,[data-keep]') || pe.matches(TARGET_TEXT)) continue; const v = tr(n.nodeValue); if (v != null && v !== n.nodeValue) n.nodeValue = v; }
    else if (n.nodeType === 1) for (const a of ['placeholder', 'aria-label', 'title']) { const v0 = n.getAttribute?.(a); if (v0) { const v = tr(v0); if (v != null && v !== v0) n.setAttribute(a, v); } }
  }
}
function applyUI() {
  document.documentElement.dir = S.ui === 'ar' ? 'rtl' : 'ltr'; document.body.classList.toggle('ui-ar', S.ui === 'ar');
  translateTree($('#app'));
}
new MutationObserver(ms => { if (S.ui === 'en') return; for (const m of ms) { if (m.type === 'characterData') translateTree(m.target); else m.addedNodes.forEach(n => translateTree(n)); } })
  .observe($('#app'), { childList: true, subtree: true, characterData: true });
applyUI();
