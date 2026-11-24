// Sorts the English text seen in the app into the menu table and the two course tables.
// usage: node tools/i18n-split.mjs seen.json outdir
import fs from 'fs';
const [seenF, outDir] = process.argv.slice(2);
const load = f => new Function(fs.readFileSync('src/' + f, 'utf8') + ';return ' + (f === 'pt.js' ? 'PT_COURSE' : 'AR_COURSE'))();
const PT = load('pt.js'), AR = load('ar.js');
const target = new Set(), content = { 'pt-BR': new Set(), 'ar-EG': new Set() };
const T = x => typeof x === 'string' && target.add(x.trim()), C = (id, x) => typeof x === 'string' && x.trim() && content[id].add(x.trim());
for (const [c, id] of [[PT, 'pt-BR'], [AR, 'ar-EG']]) {
  const ar = id === 'ar-EG';
  c.units.forEach(u => { T(u.pt); C(id, u.en); C(id, u.mission); Object.keys(u.gloss).forEach(T); Object.values(u.gloss).forEach(g => C(id, g));
    u.dialogue.forEach(d => { T(d[1]); if (ar) { T(d[2]); C(id, d[3]); } else C(id, d[2]); });
    u.chunks.forEach(k => { T(k[0]); if (ar) { T(k[1]); C(id, k[2]); C(id, k[3]); } else { C(id, k[1]); C(id, k[2]); } }); });
  c.scenes.forEach(s => { T(s.pt); C(id, s.en); s.script.forEach(l => { T(l[0]); if (ar) { T(l[1]); C(id, l[2]); l[3].forEach(x => x.forEach(T)); } else { C(id, l[1]); l[2].forEach(T); } }); });
  Object.values(c.phrases).forEach(l => l.forEach(p => { T(p[0]); if (ar) { T(p[1]); C(id, p[2]); } else { C(id, p[1]); T(p[2]); } }));
  Object.values(c.coach).flat().forEach(T); [...c.praise, ...c.nudge].flat().forEach(T); Object.values(c.samples).forEach(T); T(c.brand);
}
const seen = JSON.parse(fs.readFileSync(seenF, 'utf8'));
const isTarget = s => target.has(s) || /[؀-ۿ]/.test(s) || /^(Bom dia|Boa tarde|Boa noite|Mandou|Isso aí|Caramba|Arrasou|Boa, humano|Hmm… de novo|Quase|Tenta|Eu já)/.test(s) || /^[A-Z]\d$/.test(s) || /^[\d\s/.,~%·()-]+$/.test(s);
const ui = new Set();
for (const s0 of seen) for (const s of s0.split(' · ')) { const k = s.trim(); if (!k || isTarget(k) || content['pt-BR'].has(k) || content['ar-EG'].has(k)) continue; ui.add(k.replace(/\d+(?:[.,]\d+)?/g, (() => { let i = 0; return () => `{${i++}}`; })())); }
// toast and button text written in code
for (const f of ['b.js', 'c.js', 'standalone.js']) for (const m of fs.readFileSync('src/' + f, 'utf8').matchAll(/toast\('([^']+)'\)|toast\("([^"]+)"\)/g)) ui.add(m[1] || m[2]);
['Yalla! Egyptian Arabic it is.', 'Bora! Back to Portuguese.', 'App language', 'Learn', 'Next:', 'Replay:', 'Try:', 'Heard:', 'Mission:'].forEach(x => ui.add(x));
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outDir + '/ui.en.json', JSON.stringify([...ui].sort(), null, 1));
for (const id in content) fs.writeFileSync(outDir + `/${id}.en.json`, JSON.stringify([...content[id]], null, 1));
console.log('ui', ui.size, 'pt-BR', content['pt-BR'].size, 'ar-EG', content['ar-EG'].size);
