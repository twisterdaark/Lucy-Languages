// Lists every fixed line Lucy can speak, with the voice that says it, for the pre-made voice files.
// usage: node tools/lines.mjs > lines.json      Each line's file is voice/<id>.mp3, id = fnv1a(voice + '|' + text).
import fs from 'fs';
const load = (f, n) => new Function(fs.readFileSync('src/' + f, 'utf8') + ';return ' + n)();
export const EDGE = { 'pt-BR': { f: 'pt-BR-FranciscaNeural', m: 'pt-BR-AntonioNeural' }, 'ar-EG': { f: 'ar-EG-SalmaNeural', m: 'ar-EG-ShakirNeural' } };
export const fnv = s => { let h = 0x811c9dc5; for (const c of new TextEncoder().encode(s)) { h ^= c; h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
const out = new Map();
for (const [c, id] of [[load('pt.js', 'PT_COURSE'), 'pt-BR'], [load('ar.js', 'AR_COURSE'), 'ar-EG']]) {
  const ar = id === 'ar-EG', V = EDGE[id];
  const g = who => { const w = String(who).toLowerCase(); if (w === 'você') return 'm'; if (c.people.f.includes(w) || c.people.f.includes(w.split(' ')[0])) return 'f';
    if (c.people.m.includes(w) || c.people.m.includes(w.split(' ')[0])) return 'm'; const s = c.scenes.find(s => s.who.toLowerCase() === w); return s?.gender || (/a$/.test(w) ? 'f' : 'm'); };
  const add = (text, gg) => { text = String(text).trim(); if (!text) return; const v = V[gg]; out.set(fnv(v + '|' + text), { v, text }); };
  c.units.forEach(u => { u.dialogue.forEach(d => add(d[1], g(d[0]))); u.chunks.forEach(k => { const heat = ar ? k[4] : k[3], ns = ar ? k[5] : k[4]; if (!ns && (heat ?? 0) < 3) add(k[0], 'f'); }); });
  c.scenes.forEach(s => s.script.forEach(l => add(l[0], s.gender || g(s.who))));
  Object.values(c.phrases).forEach(l => l.forEach(p => add(p[0], 'f')));
}
if (process.argv[1].endsWith('lines.mjs')) process.stdout.write(JSON.stringify([...out].map(([id, x]) => ({ id, ...x }))));
