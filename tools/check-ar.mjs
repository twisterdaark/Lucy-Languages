// Checks that every scored Arabic line has a Franco line with the same number of words.
import fs from 'fs';
const AR = new Function(fs.readFileSync('src/ar.js', 'utf8') + ';return AR_COURSE')();
const words = s => s.replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, '').trim().split(/\s+/).filter(Boolean).length;
let bad = 0; const chk = (a, r, where) => { if (words(a) !== words(r)) { bad++; console.log(where, '|', a, '|', r); } };
for (const u of AR.units) { u.dialogue.forEach(d => chk(d[1], d[2], u.id)); u.chunks.forEach(c => chk(c[0], c[1], u.id + ' chunk')); }
for (const [k, l] of Object.entries(AR.phrases)) l.forEach(p => chk(p[0], p[1], k));
console.log(bad ? bad + ' mismatches' : 'all Franco lines line up');
process.exit(bad ? 1 : 0);
