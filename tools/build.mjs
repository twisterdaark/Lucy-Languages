// Builds two copies of Lucy from src/:
//   index.html            standalone web app (GitHub Pages / APK): Google sign-in sync, Gemini partner, phone mic
//   dist/lucy-claude.html claude.ai artifact copy (Claude voice, dictation, AI and account sync)
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'); const src = f => fs.readFileSync(path.join(root, 'src', f), 'utf8');
let inner = src('lucy.svg').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/\sid="(earL|earR|eyes)"/g, '');
const defs = inner.match(/<defs>[\s\S]*?<\/defs>/)[0]; inner = inner.replace(defs, '').replace(/\s*\n\s*/g, '');
const lid = cx => `<g class="lid"><ellipse cx="${cx}" cy="110" rx="19" ry="19" fill="url(#gray)"/><path d="M${cx - 15} 114 C${cx - 8} 123 ${cx + 8} 123 ${cx + 15} 114" stroke="#4a4a22" stroke-width="3" stroke-linecap="round" fill="none"/></g>`;
inner = inner.replace(/(<path d="M93 128)/, lid(70) + lid(130) + '$1');
const sym = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">${defs}</svg>`;
const photo = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(root, 'src', 'lucy-photo.jpg')).toString('base64');
const core = ['a.js', 'b.js', 'c.js'].map(src).join('\n').replace('/*ICONS*/{}', src('icons.json').trim()).replace("/*LUCYART*/''", JSON.stringify(inner));
const dock = [['home', 'house', 'Home'], ['missions', 'path-distance', 'Missions'], ['review', 'brain', 'Review'], ['talk', 'chat-bubble', 'Talk'], ['progress', 'histogram', 'Progress']]
  .map(([t, i, l]) => `<button data-tab="${t}" aria-label="${l}"><svg class="ico" aria-hidden="true"><use href="#i-${i}"/></svg><span>${l}</span></button>`).join('');
const page = (web) => {
  // standalone.js must run after b.js (it wraps settings) and before c.js renders the first screen
  const js = web ? core.replace('// ---------- views ----------', src('standalone.js') + '\n// ---------- views ----------') : core;
  const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Lucy</title><meta name="description" content="Lucy, a sarcastic cat who teaches you Brazilian Portuguese"><meta name="theme-color" content="#15171f">
${web ? '<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="icon-192.png">' : ''}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Figtree:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>${src('style.css')}</style>
${web ? `<script src="${FB}firebase-app-compat.js"></script><script src="${FB}firebase-auth-compat.js"></script><script src="${FB}firebase-firestore-compat.js"></script><script src="firebase-config.js"></script><script src="ai-config.js"></script>` : ''}
</head><body>
<svg id="sprite" width="0" height="0" style="position:absolute" aria-hidden="true"></svg>${sym}
<div class="app" id="app"><div id="view"></div><nav id="dock">${dock}</nav>
<div id="modal"><div id="panel"></div></div><div id="toast" role="status"></div>
<div id="vk" hidden><div class="sheet"><div class="row"><small class="eyebrow">SAY IT</small><div class="spacer"></div><button class="iconbtn" id="vk-x" aria-label="Cancel">✕</button></div>
<div id="vk-target"></div><textarea id="vk-in" rows="2" placeholder="Your words appear here…" autocapitalize="sentences" spellcheck="false"></textarea>
<div class="vk-hint"><svg class="ico" aria-hidden="true"><use href="#i-microphone"/></svg><span>Tap the mic on your keyboard and speak. Lucy stops when you get it right or go quiet.</span></div>
<button class="btn wide" id="vk-done">Done</button></div></div></div>
<script>const PHOTO='${photo}';
${js}</script></body></html>`;
};
fs.writeFileSync(path.join(root, 'index.html'), page(true));
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'lucy-claude.html'), page(false));
console.log('built index.html and dist/lucy-claude.html');
