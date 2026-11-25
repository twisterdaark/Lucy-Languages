
// ---------- views ----------
const VIEWS = {};
const greet = () => { const g = T.greet(S.name, new Date().getHours()); if (g[2]) ROM[g[0]] = g[2]; return g; };
const nextUnit = () => allUnits().find(u => !S.done[u.id]) || UNITS[0];

VIEWS.home = () => {
  const m = metrics(), L = m.current, due = srsDue().length, nu = nextUnit(), [gpt, gen] = greet();
  const goalPct = Math.min(100, Math.round(m.todayMin / S.goalMin * 100));
  const el = h(`<header class="brand"><div class="logo">${LUCY()}<span>Lucy</span></div><small>${T.brand}</small><div class="spacer"></div><div class="streak" title="Day streak">${I('flame')}${S.streak.n}</div><button class="iconbtn" id="set" aria-label="Settings">${I('cog')}</button></header>
    <section class="hero"><div class="hero-cat">${LUCY('big')}</div><div class="hero-say"><button class="say-line" id="greet">${gpt} ${I('speaker')}</button>${romHTML(gpt)}<small>${gen}</small></div></section>
    <section class="levelcard" id="lvl"><div>${ring(L.pct, 108, 11, `<b>${L.id}</b><small>${L.pct}%</small>`)}</div><div class="lv-txt"><small class="eyebrow">LEVEL ${L.id} · ${L.name.toUpperCase()}</small><b>${L.pct >= 100 ? 'Reached!' : fmtETA(L.daysLeft) + ' to go'}</b><p>At ${Math.round(m.pace)} min a day${m.acc != null ? ` and ${m.acc}% speaking accuracy` : ''}.<br><span>ETA</span> <span data-keep>${fmtDate(L.daysLeft)}</span></p></div></section>
    <section class="today"><div class="row"><h2>Today</h2><div class="spacer"></div><span class="mini">${m.todayMin} / ${S.goalMin} min</span></div><div class="bar"><i style="width:${goalPct}%"></i></div>
      <button class="task" id="t-mission"><span class="tico" style="--c:var(--peach)">${I(nu.icon === 'lucy' ? 'sparkles' : nu.icon)}</span><span><b>${S.done[nu.id] ? 'Replay' : 'Next'}: ${esc(nu.pt)}</b><small>${esc(nu.en)} · ~12 min</small></span><span class="chev">›</span></button>
      <button class="task" id="t-review"><span class="tico" style="--c:var(--sky)">${I('brain')}</span><span><b>${due ? `Review ${due} phrase${due > 1 ? 's' : ''}` : 'Review is clear'}</b><small>${due ? 'Right before you forget them' : 'New ones arrive after missions'}</small></span><span class="chev">›</span></button>
      <button class="task" id="t-talk"><span class="tico" style="--c:var(--olive)">${I('chat-bubble')}</span><span><b>5 minutes with Lucy</b><small>She’s sarcastic. You’ve been warned.</small></span><span class="chev">›</span></button>
      <button class="task" id="t-gym"><span class="tico" style="--c:var(--rose)">${I('lips')}</span><span><b>Pronunciation gym</b><small>${Object.keys(S.stats.tricky).filter(k => S.stats.tricky[k] > 0).length || 'No'} tricky words logged</small></span><span class="chev">›</span></button></section>`);
  el.querySelector('#set').onclick = settingsSheet;
  el.querySelector('#greet').onclick = () => say(gpt);
  el.querySelector('#lvl').onclick = () => render('progress');
  el.querySelector('#t-mission').onclick = () => render('lesson', true, nu.id);
  el.querySelector('#t-review').onclick = () => render('review');
  el.querySelector('#t-talk').onclick = () => { S.scene = 'lucy'; S.mission = null; render('chat'); };
  el.querySelector('#t-gym').onclick = () => render('speak');
  animateRings(el);
  return el;
};

VIEWS.missions = () => {
  const units = allUnits(); const m = metrics();
  const groups = LEVELS.slice(0, 2).map(L => [L, units.filter(u => u.level === L.id)]);
  const el = h(`<div class="pagehead"><h1>Missions</h1><p class="sub">Each one: hear real locals, learn the chunks, shadow, recall, write, then use it in a role-play.</p></div>
    <section class="maker">${LUCY('sm')}<div style="flex:1;min-width:0"><b>Want something specific?</b><small>Tell Lucy a situation and she writes a mission for you.</small>
      <div class="maker-in"><input id="topic" placeholder="e.g. at the gym, dating app, barber…" autocomplete="off"><button class="btn sm" id="make">Write it</button></div></div></section>
    ${groups.map(([L, us]) => `<div class="lvhead"><b>${L.id}</b><span>${L.name}</span><div class="spacer"></div><small>${us.filter(u => S.done[u.id]).length}/${us.length} done</small></div>
      <div class="mlist">${us.map((u, i) => { const done = !!S.done[u.id], heat = u.hot || /giria|xinga/.test(u.id);
        return `<button class="mcard ${done ? 'done' : ''} ${heat ? 'hot' : ''}" data-u="${u.id}" style="animation-delay:${i * 40}ms"><span class="mnum">${String(i + 1).padStart(2, '0')}</span><span class="mbody"><b>${esc(u.pt)}</b><small>${esc(u.en)}${u.custom ? ' · by Lucy' : ''}</small></span><span class="mstate">${done ? I('check-mark') : heat ? '18+' : '<span class="chev">›</span>'}</span></button>`; }).join('')}</div>`).join('')}
    <div class="lvhead muted"><b>B1</b><span>Threshold</span><div class="spacer"></div><small>Write your own above, more coming</small></div>`);
  el.querySelectorAll('[data-u]').forEach(b => b.onclick = () => render('lesson', true, b.dataset.u));
  const go = async () => { const t = el.querySelector('#topic').value.trim(); if (!t) return; const b = el.querySelector('#make'); b.disabled = true; b.textContent = 'Writing…';
    try { const u = await makeMission(t); toast(`Lucy wrote “${u.pt}”`); render('lesson', true, u.id); }
    catch (e) { b.disabled = false; b.textContent = 'Write it'; toast(e.message === 'offline' ? (window.claude ? 'Lucy writes missions only inside claude.ai' : 'Add your free Gemini key in settings first') : 'Lucy got distracted by a bird. Try again.'); } };
  el.querySelector('#make').onclick = go; el.querySelector('#topic').onkeydown = e => e.key === 'Enter' && go();
  return el;
};

// ----- mission -----
VIEWS.lesson = (uid) => {
  const u = allUnits().find(x => x.id === uid) || UNITS[0]; const STEPS = ['Hear', 'Chunks', 'Shadow', 'Recall', 'Write', 'Go']; let xp = 0, scores = [];
  const spk = u.chunks.filter(speakable);
  const el = h(`<div class="lesson-top"><button class="iconbtn" id="close" aria-label="Close">✕</button><div class="steps" id="steps">${STEPS.map((s, i) => `<span data-i="${i}"><i></i>${s}</span>`).join('')}</div></div><div id="body" class="lbody"></div>`);
  const body = el.querySelector('#body');
  el.querySelector('#close').onclick = () => { stopVoice(); render('missions'); };
  const go = (i) => { stopVoice(); el.querySelectorAll('#steps span').forEach((s, k) => s.className = k < i ? 'done' : k === i ? 'on' : ''); body.innerHTML = ''; [hear, chunks, shadow, recall, write, mission][i](); el.scrollTop = 0; document.getElementById('view').scrollTop = 0; };
  const box = (html) => { const b = h(html); b.className = 'stepbox'; body.appendChild(b); return b; };

  function hear() {
    const b = box(`${coach(rl(T.coach.hear), 'Listen first. Tap a line to replay it, tap any word for its meaning.')}
      <h1 class="ltitle">${esc(u.pt)}</h1>${romHTML(u.pt)}
      <div class="lines">${u.dialogue.map(([who, pt, en], i) => `<div class="line ${who === 'Você' ? 'me' : ''}" data-i="${i}"><small>${who === 'Você' ? T.you : esc(who.toUpperCase())}</small><div class="pt">${wordsHTML(pt)}</div>${romHTML(pt)}<div class="en">${esc(en)}</div></div>`).join('')}</div>
      <div class="row gap"><button class="btn" id="all">▶ Play all</button><button class="btn ghost" id="slow">Slow</button><button class="btn ghost" id="hide">Hide English</button></div>
      <div class="lesson-foot"><button class="btn wide" id="next">Next: chunks</button></div>`);
    bindGloss(b, u.gloss);
    let playing = 0;
    const play = async (slow) => { const id = ++playing; for (const [i, [, pt]] of u.dialogue.entries()) { if (id !== playing || !b.isConnected) return; b.querySelectorAll('.line').forEach((l, k) => l.classList.toggle('live', k === i)); await say(pt, slow, u.dialogue[i][0]); await sleep(250); } b.querySelectorAll('.line').forEach(l => l.classList.remove('live')); };
    b.querySelector('#all').onclick = () => play(false); b.querySelector('#slow').onclick = () => play(true);
    b.querySelectorAll('.line').forEach(l => l.onclick = () => { playing++; b.querySelectorAll('.line').forEach(x => x.classList.toggle('live', x === l)); say(u.dialogue[+l.dataset.i][1], false, u.dialogue[+l.dataset.i][0]); });
    b.querySelector('#hide').onclick = e => { b.classList.toggle('noen'); e.target.textContent = b.classList.contains('noen') ? 'Show English' : 'Hide English'; };
    b.querySelector('#next').onclick = () => { playing++; go(1); };
  }
  function chunks() {
    const b = box(`${coach(rl(T.coach.chunks), 'Whole phrases stick better than single words. Tap to hear.')}
      <div class="chunks">${u.chunks.map(([pt, en, note, heat, ns], i) => `<button class="chunk ${heat === 3 ? 'slur' : ''}" data-i="${i}" style="--c:${heat != null ? HEAT[heat][1] : 'var(--sky)'}"><div class="row"><b>${esc(pt)}</b><div class="spacer"></div>${heat != null ? `<span class="heat">${HEAT[heat][0]}</span>` : ''}${heat === 3 || ns ? '' : I('speaker')}</div>${romHTML(pt)}<small>${esc(en)}</small>${note ? `<p>${esc(note)}</p>` : ''}</button>`).join('')}</div>
      <div class="lesson-foot"><button class="btn wide" id="next">Got them: shadow it</button></div>`);
    b.querySelectorAll('.chunk').forEach(c => c.onclick = () => { const ch = u.chunks[+c.dataset.i]; c.classList.remove('hit'); void c.offsetWidth; c.classList.add('hit'); if (speakable(ch)) say(ch[0]); else if (ch[3] === 3) toast('Recognise only. Lucy won’t say this one.'); });
    b.querySelector('#next').onclick = () => { srsAdd(u.chunks); go(2); };
  }
  function shadow() {
    let k = 0;
    const draw = () => {
      body.innerHTML = ''; const [who, pt, en] = u.dialogue[k];
      const b = box(`${coach(rl(T.coach.shadow), `Line ${k + 1} of ${u.dialogue.length}. Say it right after it plays, copying the rhythm.`)}
        <div class="target"><div class="row"><span class="tag">${who === 'Você' ? 'YOU' : esc(who.toUpperCase())}</span><div class="spacer"></div><button class="iconbtn" id="slow" aria-label="Slow">0.7×</button><button class="iconbtn hi" id="hear" aria-label="Listen">${I('speaker')}</button></div>
          <div class="words" id="ws">${wordsHTML(pt)}</div>${romHTML(pt)}<div class="gloss">${esc(en)}</div><div class="heard" id="heard"></div></div>
        <div id="fb"></div>
        <div class="mic-wrap"><button class="mic" aria-label="Speak">${I('microphone')}</button></div><p class="mic-label">Tap & speak</p>
        <div class="row" style="justify-content:center"><button class="link" id="skip">Skip line</button></div>`);
      bindGloss(b, u.gloss);
      b.querySelector('#hear').onclick = () => say(pt, false, who); b.querySelector('#slow').onclick = () => say(pt, true, who);
      say(pt, false, who);
      const next = () => { k++; if (k < u.dialogue.length) draw(); else go(3); };
      b.querySelector('#skip').onclick = next;
      micButton(b, { target: pt, onPartial: t => b.querySelector('#heard').textContent = 'Heard: ' + t,
        onDone: (t, secs) => { if (!t) return; const r = scoreSpeech(pt, t, secs); scores.push(r.total); logScore(pt, r); S.stats.shadowed++; saveStats(); paintWords(b.querySelectorAll('#ws span'), r.per);
          const tip = coachTip(pt, r.per); const good = r.total >= 75;
          b.querySelector('#fb').innerHTML = coach(rl(pick(good ? T.praise : T.nudge), ` ${r.total}/100`), esc(good ? (tip ? 'One thing: ' + tip : 'Sounded natural.') : (tip || 'Try again, slower.')), good ? 'happy' : 'meh');
          if (good) { xp += 5; setTimeout(() => { if (b.isConnected) next(); }, 1700); } } });
    };
    draw();
  }
  function recall() {
    const items = shuffle(spk.filter(c => !c[4])).slice(0, 4); let k = 0;
    if (!items.length) return go(4);
    const draw = () => {
      body.innerHTML = ''; const [pt, en, , heat] = items[k];
      const b = box(`${coach(rl(T.coach.recall), `${k + 1} of ${items.length}. Pulling it out of memory is what makes it stick.`)}
        <div class="recall"><small class="eyebrow">${T.sayIn}</small><div class="big">${esc(en)}</div>
          <div class="answer" id="ans" hidden><div class="words" id="ws">${wordsHTML(pt)}</div>${romHTML(pt)}${heat ? `<span class="heat" style="--c:${HEAT[heat][1]}">${HEAT[heat][0]}</span>` : ''}</div><div class="heard" id="heard"></div></div>
        <div class="mic-wrap"><button class="mic" aria-label="Speak">${I('microphone')}</button></div><p class="mic-label">Tap & speak</p>
        <div class="row" style="justify-content:center"><button class="link" id="show">Show answer</button></div>`);
      const reveal = (ok) => { b.querySelector('#ans').hidden = false; say(pt); const s = b.querySelector('#show'); s.textContent = 'Next →'; s.onclick = () => { srsGrade(pt, ok ? 'good' : 'again'); k++; if (k < items.length) draw(); else go(4); }; };
      b.querySelector('#show').onclick = () => reveal(false);
      micButton(b, { target: pt, onPartial: t => b.querySelector('#heard').textContent = 'Heard: ' + t,
        onDone: (t, secs) => { if (!t) return; const r = scoreSpeech(pt, t, secs); scores.push(r.total); logScore(pt, r); reveal(r.total >= 75); paintWords(b.querySelectorAll('#ws span'), r.per); if (r.total >= 75) { xp += 10; toast(`${pick(T.praise)} ${r.total}/100`); } } });
    };
    draw();
  }
  function write() {
    const lines = shuffle(u.dialogue).slice(0, 3); let k = 0;
    const draw = () => {
      body.innerHTML = ''; const [who, pt, en] = lines[k];
      const b = box(`${coach(rl(T.coach.write), `${k + 1} of ${lines.length}. Listen and type it. Dictation trains your ear and your spelling at once.`)}
        <div class="target"><div class="row"><button class="btn" id="hear">▶ Play</button><button class="btn ghost" id="slow">Slow</button><div class="spacer"></div><button class="link" id="hint">Hint</button></div>
          <textarea class="write" id="w" placeholder="${T.writePh}" autocomplete="off" autocapitalize="sentences" spellcheck="false"></textarea>
          <div class="accents">${T.accents.map(c => `<button data-c="${c}">${c}</button>`).join('')}</div>
          <div class="words small" id="res" hidden></div></div>
        <div class="lesson-foot"><button class="btn wide" id="check" disabled>Check</button></div>`);
      const ta = b.querySelector('#w'); ta.oninput = () => b.querySelector('#check').disabled = !ta.value.trim();
      b.querySelector('#hear').onclick = () => say(pt, false, who); b.querySelector('#slow').onclick = () => say(pt, true, who); b.querySelector('#hint').onclick = () => toast(en);
      setTimeout(() => say(pt, false, who), 300);
      b.querySelectorAll('[data-c]').forEach(x => x.onclick = () => { const p = ta.selectionStart ?? ta.value.length; ta.value = ta.value.slice(0, p) + x.dataset.c + ta.value.slice(ta.selectionEnd ?? p); ta.focus(); ta.selectionStart = ta.selectionEnd = p + 1; ta.oninput(); });
      b.querySelector('#check').onclick = () => { const r = scoreSpeech(pt, ta.value, 0); S.stats.dict.push(r.accuracy); if (S.stats.dict.length > 100) S.stats.dict.shift(); saveStats();
        const res = b.querySelector('#res'); res.hidden = false; res.innerHTML = wordsHTML(pt) + romHTML(pt); paintWords(res.querySelectorAll('span'), r.per);
        if (r.accuracy >= 85) xp += 5;
        const c = b.querySelector('#check'); c.textContent = r.accuracy >= 85 ? `${pick(T.praise)} Next →` : 'Next →'; c.onclick = () => { k++; if (k < lines.length) draw(); else go(5); }; };
    };
    draw();
  }
  function mission() {
    const sc = allScenes().find(s => s.id === u.scene) || SCENES[0];
    S.done[u.id] = true; store.set('done', S.done); addXP(xp + 10);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const b = box(`<div class="finish">${LUCY('big happy')}<h1>${T.coach.finish}</h1>${romHTML(T.coach.finish)}<p class="sub">Now use it for real.</p>
      <div class="stats"><div><small>XP</small><b>+${xp + 10}</b></div>${avg != null ? `<div><small>SPEAKING</small><b>${avg}</b></div>` : ''}<div><small>NEW IN REVIEW</small><b>${u.chunks.filter(c => (c[3] ?? 0) < 3).length}</b></div></div>
      <div class="goalcard"><small class="eyebrow">YOUR MISSION WITH ${esc(sc.who.toUpperCase())}</small><b>${esc(u.mission)}</b></div>
      <div class="row gap" style="width:100%"><button class="btn wide" id="chat">${I('chat-bubble')} Chat</button><button class="btn wide alt" id="call">${I('phone')} Call</button></div>
      <button class="link" id="later">Back to missions</button></div>`);
    confetti();
    const start = v => { S.scene = sc.id; S.mission = u.mission; delete chats[sc.id]; render(v); };
    b.querySelector('#chat').onclick = () => start('chat'); b.querySelector('#call').onclick = () => start('call');
    b.querySelector('#later').onclick = () => render('missions');
  }
  go(0);
  return el;
};

// ----- review -----
VIEWS.review = () => {
  const due = srsDue(); const total = Object.keys(S.srs).length;
  if (!due.length) {
    const el = h(`<div class="pagehead"><h1>Review</h1><p class="sub">Spaced repetition: each phrase comes back right before you’d forget it.</p></div>
      <div class="empty">${LUCY('big sleepy')}<b>${total ? 'All caught up. Lucy’s napping.' : 'Nothing to review yet'}</b><p>${total ? `${total} phrases in your deck. The next ones come back ${(() => { const n = Math.min(...Object.values(S.srs).map(c => c.due)); const hrs = (n - Date.now()) / 36e5; return hrs < 1 ? 'within the hour' : hrs < 24 ? `in ${Math.round(hrs)} hours` : `in ${Math.round(hrs / 24)} days`; })()}.` : 'Finish a mission and its phrases land here.'}</p>
      ${total ? '<button class="btn" id="cram">Practise 8 anyway</button>' : '<button class="btn" id="go">Start a mission</button>'}</div>`);
    el.querySelector('#go')?.addEventListener('click', () => render('missions'));
    el.querySelector('#cram')?.addEventListener('click', () => { shuffle(Object.keys(S.srs)).slice(0, 8).forEach(k => S.srs[k].due = Date.now() - 1); render('review'); });
    return el;
  }
  const [pt, c] = due[0];
  const el = h(`<div class="pagehead row"><h1>Review</h1><div class="spacer"></div><span class="tag hot">${due.length} due</span></div>
    <div class="recall"><small class="eyebrow">${c.ns ? 'WHAT DOES THIS MEAN?' : T.sayIn}</small><div class="big">${esc(c.ns ? pt : c.en)}</div>
      <div class="answer" id="ans" hidden><div class="words" id="ws">${c.ns ? esc(c.en) : wordsHTML(pt)}</div>${c.ns ? '' : romHTML(pt)}${c.heat ? `<span class="heat" style="--c:${HEAT[c.heat][1]}">${HEAT[c.heat][0]}</span>` : ''}</div><div class="heard" id="heard"></div></div>
    ${c.ns ? '' : `<div class="mic-wrap"><button class="mic" aria-label="Speak">${I('microphone')}</button></div><p class="mic-label">Tap & speak</p>`}
    <div id="grade" class="grades" hidden>${[['again', 'Again', 'var(--rose)'], ['hard', 'Hard', 'var(--olive)'], ['good', 'Good', 'var(--mint)']].map(([g, l, col]) => `<button data-g="${g}" style="--c:${col}"><b>${l}</b><small>${nextLabel(pt, g)}</small></button>`).join('')}</div>
    <div class="row" style="justify-content:center" id="showrow"><button class="link" id="show">Show answer</button></div>`);
  const reveal = (sugg) => { el.querySelector('#ans').hidden = false; el.querySelector('#grade').hidden = false; el.querySelector('#showrow').hidden = true; if (!c.ns) say(pt);
    if (sugg) el.querySelector(`[data-g="${sugg}"]`).classList.add('sugg'); };
  el.querySelector('#show').onclick = () => reveal(null);
  el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { srsGrade(pt, b.dataset.g); if (b.dataset.g !== 'again') addXP(3); render('review', true); });
  if (!c.ns) micButton(el, { target: pt, onPartial: t => el.querySelector('#heard').textContent = 'Heard: ' + t,
    onDone: (t, secs) => { if (!t) return; const r = scoreSpeech(pt, t, secs); logScore(pt, r); reveal(r.total >= 85 ? 'good' : r.total >= 60 ? 'hard' : 'again'); paintWords(el.querySelectorAll('#ws span'), r.per); el.querySelector('#heard').textContent = `Heard: ${t} · ${r.total}/100`; } });
  return el;
};

// ----- progress: levels, ETA, milestones, tricky words -----
VIEWS.progress = () => {
  const m = metrics(); const done = MILESTONES.filter(x => x[2](m)).length;
  const week = [...m.days.slice(0, 7)].reverse(), maxS = Math.max(S.goalMin * 60, ...week);
  const tricky = Object.entries(S.stats.tricky).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const el = h(`<div class="pagehead"><h1>Progress</h1><p class="sub">Where you are, what’s left, and when you’ll get there at your current pace.</p></div>
    <section class="statrow"><div><small>PRACTICE</small><b>${m.hours < 1 ? Math.round(m.hours * 60) + ' min' : m.hours.toFixed(1) + ' h'}</b></div><div><small>PHRASES</small><b>${m.learned}<em>/${m.mastered} mastered</em></b></div><div><small>SPEAKING</small><b>${m.acc ?? '–'}${m.acc != null ? '%' : ''}</b></div></section>
    <section class="card"><div class="row"><h2>This week</h2><div class="spacer"></div><span class="mini">goal ${S.goalMin} min/day</span></div>
      <div class="week">${week.map((s, i) => { const d = new Date(Date.now() - (6 - i) * 864e5); return `<div class="wcol"><div class="wbar"><i style="height:${Math.round(s / maxS * 100)}%" class="${s >= S.goalMin * 60 ? 'hit' : ''}"></i><span class="goalline" style="bottom:${Math.round(S.goalMin * 60 / maxS * 100)}%"></span></div><small>${d.toLocaleDateString(({ ar: 'ar-EG', pt: 'pt-BR' })[S.ui] || 'en-GB', { weekday: 'narrow' })}</small></div>`; }).join('')}</div></section>
    <h2 class="sect">Levels</h2>
    <div class="ladder">${m.lv.map(L => `<div class="rung ${L.id === m.current.id ? 'cur' : ''} ${L.pct >= 100 ? 'got' : ''}">${ring(L.pct, 64, 7, `<b>${L.id}</b>`)}<div class="rung-txt"><div class="row"><b>${L.name}</b><div class="spacer"></div><span class="mini">${L.pct}%</span></div><p>${L.can}</p>
      ${L.pct >= 100 ? '<small class="ok">Reached</small>' : `<small>ETA <b>${fmtETA(L.daysLeft)}</b> (${fmtDate(L.daysLeft)}) · ~${Math.ceil(L.hoursLeft)} h · ${L.phrasesLeft} phrases left</small>
      <div class="subbars"><span title="Practice time"><i style="width:${Math.round(L.hp * 100)}%"></i></span><span title="Phrases"><i style="width:${Math.round(L.pp * 100)}%"></i></span><span title="Speaking accuracy"><i style="width:${Math.round(L.ap * 100)}%"></i></span></div><div class="sublbl"><small>time</small><small>phrases</small><small>accuracy ≥${L.acc}%</small></div>`}</div></div>`).join('')}</div>
    <p class="fine">How the estimate works: each level needs practice hours (Cambridge’s guided-learning ranges), phrases you can produce from memory, and speaking accuracy. Your remaining hours are divided by your real minutes per day over the last two weeks, and shortened or stretched by your accuracy.</p>
    <h2 class="sect">Milestones <span class="mini">${done}/${MILESTONES.length}</span></h2>
    <div class="miles">${MILESTONES.map(([t, d, f]) => { const ok = f(m); return `<div class="mile ${ok ? 'ok' : ''}"><span>${ok ? I('check-mark') : I('trophy')}</span><b>${t}</b><small>${d}</small></div>`; }).join('')}</div>
    <h2 class="sect">Tricky words</h2>
    ${tricky.length ? `<div class="tricky">${tricky.map(([w, n]) => `<button data-t="${esc(w)}">${esc(w)}<small>×${n}</small></button>`).join('')}</div><button class="btn ghost" id="gym" style="margin-top:10px">Practise them in the gym</button>` : '<p class="fine">Words you miss when speaking show up here.</p><button class="btn ghost" id="gym">Open the pronunciation gym</button>'}`);
  el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => say(b.dataset.t, true));
  el.querySelector('#gym').onclick = () => { if (tricky.length) { PHRASES['Your tricky words'] = tricky.map(([w]) => [w, 'one of your tricky words', '']); S.deck = 'Your tricky words'; S.phrase = 0; } render('speak'); };
  animateRings(el);
  return el;
};

// ----- pronunciation gym -----
VIEWS.speak = () => {
  const list = PHRASES[S.deck] || PHRASES['Street talk']; const [pt, en, ipa] = list[S.phrase % list.length];
  const el = h(`<div class="pagehead"><button class="link" id="back">‹ Progress</button><h1>Pronunciation gym</h1><p class="sub">The mic stops by itself when you nail it.</p></div>
    <div class="deck">${Object.keys(PHRASES).map(d => `<button class="chipbtn ${d === S.deck ? 'on' : ''}" data-d="${d}">${d}</button>`).join('')}</div>
    <div class="target"><div class="row"><span class="tag">${S.phrase % list.length + 1}/${list.length}</span><div class="spacer"></div><button class="iconbtn" id="slow" aria-label="Listen slowly">0.7×</button><button class="iconbtn hi" id="hear" aria-label="Listen">${I('speaker')}</button></div>
      <div class="words" id="ws">${pt.split(' ').map(w => `<span>${esc(w)}</span>`).join(' ')}</div>${ipa ? `<div class="ipa">${ipa}</div>` : ''}<div class="gloss">${esc(en)}</div><div class="heard" id="heard"></div></div>
    <div class="score">${ring(0, 112, 11, '<b id="sv">–</b><small>score</small>')}
      <div class="meters">${[['Accuracy', 'acc'], ['Fluency', 'flu'], ['Completeness', 'com']].map(([l, k]) => `<div><label>${l}<span id="${k}v"></span></label><div class="meter"><i id="${k}"></i></div></div>`).join('')}</div></div>
    <div id="fb"></div>
    <div class="mic-wrap"><button class="mic" aria-label="Speak">${I('microphone')}</button></div><p class="mic-label">Tap & speak</p>
    <div class="row" style="justify-content:center;gap:16px"><button class="link" id="next">Next phrase →</button></div>`);
  el.querySelector('#back').onclick = () => render('progress');
  el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { S.deck = b.dataset.d; S.phrase = 0; render('speak', false); });
  el.querySelector('#hear').onclick = () => say(pt); el.querySelector('#slow').onclick = () => say(pt, true);
  el.querySelector('#next').onclick = () => { S.phrase++; render('speak', false); };
  const show = (t, secs) => {
    const r = scoreSpeech(pt, t, secs); logScore(pt, r); paintWords(el.querySelectorAll('#ws span'), r.per);
    const arc = el.querySelector('.arc'); arc.style.strokeDashoffset = parseFloat(arc.getAttribute('stroke-dasharray')) * (1 - r.total / 100);
    let n = 0; const sv = el.querySelector('#sv'); const iv = setInterval(() => { n = Math.min(r.total, n + Math.max(1, Math.ceil(r.total / 20))); sv.textContent = n; if (n >= r.total) clearInterval(iv); }, 40);
    [['acc', r.accuracy], ['flu', r.fluency], ['com', r.completeness]].forEach(([k, v]) => { el.querySelector('#' + k).style.width = v + '%'; el.querySelector('#' + k + 'v').textContent = v; });
    const tip = coachTip(pt, r.per);
    el.querySelector('#fb').innerHTML = coach(tip ? rl(pick(T.nudge)) : rl(pick(T.praise)), esc(tip || 'Clear and natural. Next one.') + (P.sample ? ' <button class="link" id="deep">Ask Lucy for more</button>' : ''), tip ? 'meh' : 'happy');
    el.querySelector('#deep')?.addEventListener('click', async ev => { ev.target.textContent = 'Thinking…';
      try { const r2 = await P.sample(`You are Lucy, a sarcastic cat who coaches ${T.ai.name(S.variant)} pronunciation. The learner tried to say: "${pt}". A speech recogniser heard: "${t}". In 2-3 short sentences of plain ${UI_NAME()}, tell them which sounds to fix and how (mouth position, an English sound it resembles).${S.vibe === 'spicy' ? ' Be funny and a little sarcastic.' : ''} No preamble.`, { modelTier: 'quick' });
        ev.target.closest('small').textContent = r2.text; } catch (_) { ev.target.textContent = 'Lucy is busy, try later'; } });
    if (r.total >= 80) addXP(5);
  };
  micButton(el, { target: pt, onPartial: t => el.querySelector('#heard').textContent = 'Heard: ' + t, onDone: (t, secs) => { if (t) { el.querySelector('#heard').textContent = 'Heard: ' + t; show(t, secs); } } });
  return el;
};

// ----- talk -----
VIEWS.talk = () => {
  const sc = allScenes();
  const el = h(`<div class="pagehead"><h1>Talk</h1><p class="sub">Real conversations by chat or call. ${S.vibe === 'spicy' ? 'Expect to get roasted.' : 'Friendly mode is on.'}</p></div>
    <div class="scenes">${sc.map((s, i) => `<div class="scene ${s.id === 'lucy' ? 'feature' : ''}" style="--c:${s.c};animation-delay:${i * 40}ms"><span class="av">${s.icon === 'lucy' ? LUCY() : I(s.icon)}</span><div class="sbody"><b>${esc(s.pt)}</b><small>${esc(s.en)} · ${esc(s.who)}</small></div>
      <div class="acts"><button class="iconbtn" data-chat="${s.id}" aria-label="Chat">${I('chat-bubble')}</button><button class="iconbtn hi" data-call="${s.id}" aria-label="Call">${I('phone')}</button></div></div>`).join('')}</div>`);
  el.querySelectorAll('[data-chat]').forEach(b => b.onclick = () => { S.scene = b.dataset.chat; S.mission = null; render('chat'); });
  el.querySelectorAll('[data-call]').forEach(b => b.onclick = () => { S.scene = b.dataset.call; S.mission = null; render('call'); });
  return el;
};

const chats = {};
VIEWS.chat = () => {
  const sc = allScenes().find(s => s.id === S.scene) || SCENES[0]; const hist = chats[sc.id] = chats[sc.id] || [];
  const av = sc.id === 'lucy' ? LUCY() : `<span class="letter">${esc(sc.who[0])}</span>`;
  const el = h(`<div class="chat-head"><button class="iconbtn" id="back" aria-label="Back">‹</button><span class="av" style="--c:${sc.c}">${av}</span><div style="min-width:0;flex:1"><b>${esc(sc.who)}</b><small>${esc(sc.pt)} · ${S.vibe === 'spicy' ? 'will roast you' : 'friendly'}</small></div><button class="iconbtn hi" id="call" aria-label="Voice call">${I('phone')}</button></div>
    <div class="msgs" id="msgs">${S.mission ? `<div class="mission-tag">Mission: ${esc(S.mission)}</div>` : ''}</div>
    <div class="sugg" id="sugg"></div>
    <div class="composer"><input id="inp" placeholder="${T.chatPh}" autocomplete="off"><button class="iconbtn mic-s" id="mic" aria-label="Speak">${I('microphone')}</button><button class="iconbtn hi" id="send" aria-label="Send">➤</button></div>
    <p class="fine center">${P.sample ? 'Live AI partner · answers anything you say' : (window.claude ? 'Practice script · open in claude.ai for the live AI partner' : 'Practice script · add your free Gemini key in settings for the live AI partner')}</p>`);
  const msgs = el.querySelector('#msgs'), inp = el.querySelector('#inp');
  const scrollEnd = () => { const v = document.getElementById('view'); v.scrollTo({ top: v.scrollHeight, behavior: 'smooth' }); };
  const add = (m) => { const d = document.createElement('div');
    if (m.who === 'fix') { d.className = 'fix'; d.innerHTML = `${LUCY('xs')}<div>Try: <b>${esc(m.better)}</b>${romHTML(m.better)}${esc(m.why || '')}</div>`; }
    else { d.className = 'msg ' + m.who; d.innerHTML = esc(m.pt) + (m.who !== 'me' ? romHTML(m.pt) : '') + (m.who === 'bot' ? `<button class="say" aria-label="Listen">${I('speaker')}</button>${m.en ? `<small>${esc(m.en)}</small>` : ''}` : ''); d.querySelector('.say')?.addEventListener('click', () => say(m.pt, false, sc.who)); }
    msgs.appendChild(d); scrollEnd(); };
  const setSugg = s => { hist.sugg = s; el.querySelector('#sugg').innerHTML = s.map(x => `<button class="chipbtn" data-x="${esc(x)}">${esc(x)}${romOf(x) ? `<small>${esc(romOf(x))}</small>` : ''}</button>`).join(''); el.querySelectorAll('#sugg .chipbtn').forEach(b => b.onclick = () => send(b.dataset.x)); };
  async function botTurn() { const t = document.createElement('div'); t.className = 'typing'; t.innerHTML = '<i></i><i></i><i></i>'; msgs.appendChild(t); scrollEnd();
    const [r] = await Promise.all([partnerReply(sc.id, hist.filter(m => m.who !== 'fix'), S.mission), sleep(600)]); t.remove();
    if (r.fix) { const f = { who: 'fix', ...r.fix }; hist.push(f); add(f); }
    const m = { who: 'bot', pt: r.pt, en: r.en }; hist.push(m); add(m); setSugg(r.sugg); }
  async function send(text) { text = text.trim(); if (!text) return; inp.value = ''; const m = { who: 'me', pt: text }; hist.push(m); add(m); setSugg([]); addXP(2); S.stats.chats++; saveStats(); await botTurn(); }
  hist.forEach(add); if (hist.sugg) setSugg(hist.sugg);
  if (!hist.length) setTimeout(botTurn, 250);
  el.querySelector('#send').onclick = () => send(inp.value); inp.onkeydown = e => { if (e.key === 'Enter') send(inp.value); };
  el.querySelector('#mic').onclick = () => listen({ onState: on => el.querySelector('#mic').classList.toggle('live', on), onPartial: t => inp.value = t, onDone: t => { if (t) send(t); else toast('Didn’t catch that. Tap the mic and try again.'); } });
  el.querySelector('#call').onclick = () => render('call');
  el.querySelector('#back').onclick = () => render('talk');
  return el;
};

VIEWS.call = () => {
  const sc = allScenes().find(s => s.id === S.scene) || SCENES[0]; const hist = []; let alive = true, t0 = Date.now(), slow = false, lastSugg = [];
  const el = h(`<div class="call-top"><b>${esc(sc.who)}</b><small id="tm">00:00 · ${esc(sc.pt)}</small></div>
    <div class="orb-wrap" id="ow" style="--c:${sc.c}"><div class="orb">${sc.id === 'lucy' ? LUCY('big') : `<span class="letter">${esc(sc.who[0])}</span>`}</div></div>
    <div class="wave" id="wave">${Array.from({ length: 21 }, (_, i) => `<i style="--h:${10 + Math.round(Math.abs(Math.sin(i * .9)) * 40)}px;animation-delay:${(i % 6) * .08}s"></i>`).join('')}</div>
    <div class="captions" id="cap"><small>${esc(sc.who.toUpperCase())}</small><div class="pt">${T.coach.calling}</div><div class="en">Calling…</div></div>
    <div class="controls"><button class="ctrl" id="slow"><span>0.7×</span>Slower</button><button class="ctrl main" id="talk"><span>${I('microphone')}</span>Tap to talk</button><button class="ctrl" id="hint"><span>${I('sparkles')}</span>Hint</button></div>
    <button class="btn ghost endcall" id="end">End call</button>`);
  el.classList.add('call');
  S.stats.calls++; saveStats();
  const tm = setInterval(() => { if (!alive || !el.isConnected) return clearInterval(tm); const s = (Date.now() - t0) / 1000 | 0; el.querySelector('#tm').textContent = `${String(s / 60 | 0).padStart(2, '0')}:${String(s % 60).padStart(2, '0')} · ${S.mission || sc.pt}`; }, 1000);
  const cap = (who, pt, en) => { el.querySelector('#cap').innerHTML = `<small>${esc(who)}</small><div class="pt">${esc(pt)}</div>${romHTML(pt)}<div class="en">${esc(en || '')}</div>`; };
  async function bot() { if (!alive) return; cap(sc.who.toUpperCase(), '…', '');
    const r = await partnerReply(sc.id, hist, S.mission, 'call'); if (!alive) return; hist.push({ who: 'bot', pt: r.pt, en: r.en }); lastSugg = r.sugg;
    cap(sc.who.toUpperCase(), r.pt, r.en); el.querySelector('#ow').classList.add('talk'); el.querySelector('#wave').classList.add('on');
    await say(r.pt, slow, sc.who); if (!alive) return; el.querySelector('#ow').classList.remove('talk');
    if (!listening) { el.querySelector('#wave').classList.remove('on'); el.querySelector('#talk').classList.add('ready'); } }
  setTimeout(bot, 500);
  el.querySelector('#slow').onclick = () => { slow = !slow; toast(slow ? `${sc.who} will speak slowly` : 'Normal speed'); const l = hist.filter(m => m.who === 'bot').pop(); if (l) say(l.pt, slow, sc.who); };
  el.querySelector('#hint').onclick = () => toast(lastSugg.length ? 'Try: ' + lastSugg.join(' · ') : T.hint);
  el.querySelector('#talk').onclick = () => { stopVoice(); el.querySelector('#talk').classList.remove('ready'); listen({ silenceMs: 1600,
    onState: on => { el.querySelector('#talk').classList.toggle('live', on); el.querySelector('#wave').classList.toggle('on', on); },
    onPartial: t => cap('YOU', t, ''), onDone: async t => { if (!alive) return;
      if (!t) { el.querySelector('#talk').classList.add('ready'); toast('Didn’t catch that. Tap and say it again.'); return; } cap('YOU', t, ''); hist.push({ who: 'me', pt: t }); addXP(3); await sleep(300); bot(); } }); };
  el.querySelector('#end').onclick = () => { alive = false; stopVoice(); render('talk'); };
  return el;
};

render('home', false);
