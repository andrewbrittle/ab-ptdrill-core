(window.__BUILD_FILES = window.__BUILD_FILES || {})["core/script.js"] = "2611072103";
// Português Drill - The core: learning to read a script (2026-11-07, on the
// cyrillic branch). Shared by any language with letters of its own - the
// Bulgarian Cyrillic app first, Japanese kana next.
//
// The app describes its script in APP.script:
//   letters: [{ char, lower, sound, howItSounds, group, confusedWith }]
//            confusedWith = what an English reader takes the letter for
//            (Р looks like p) - always offered as a wrong answer
//   groups:  { key: label }, in the order the chart shows them
// and the core gives it:
//   - the letter question ('letter'): see a letter, pick its sound - or, the
//     other way round, see the sound and pick the letter. Scores 'l:Б' / 'r:Б'.
//   - the reading question ('read'): see a word, sound it out, show the
//     reading (LANG.reading) and its meaning, and mark yourself.
//   - the chart: every letter, shaded by how well you know it (the weaker
//     of the two directions), hold one to see and hear it.

registerQuestionType({
  id: 'letter', badge: tx('script.letters'), scoring: 'item',
  render: (q, ui) => renderGrammarQuestion(q, ui.charDisplay, ui.container, ui.promptEl),
  prompt: (q, charDisplay, promptEl) => {
    charDisplay.style.fontSize = q.reverse ? promptFontSize(q.char) : '72px';
    charDisplay.textContent = q.char;
    promptEl.textContent = q.reverse ? q.howItSounds : tx('script.whatSound');
  },
});
registerQuestionType({
  id: 'read', badge: tx('script.reading'), scoring: 'item',
  render: (q, ui) => {
    ui.charDisplay.style.fontSize = promptFontSize(q.char);
    ui.charDisplay.textContent = q.char;
    ui.promptEl.textContent = tx('script.soundItOut');
    renderSayQuestion(q, ui.container, q.expect);
  },
});

function scriptLetters(groups) {
  const S = APP.script;
  return groups ? S.letters.filter(l => groups.includes(l.group)) : S.letters;
}
// One letter question. Four different options: the right one, the false
// friend's lookalike if it has one, then others from the letters being
// drilled (or the whole alphabet, if fewer than four are switched on).
function buildLetterQuestion(L, reverse, pool) {
  const all = APP.script.letters;
  const from = pool.length >= 4 ? pool : all;
  const face = l => reverse ? l.char : l.sound;
  const right = face(L);
  const opts = [right];
  if (!reverse && L.confusedWith) opts.push(L.confusedWith);
  shuffle(from.slice()).concat(shuffle(all.slice())).forEach(l => {
    if (opts.length < 4 && !opts.includes(face(l))) opts.push(face(l));
  });
  const showLower = !reverse && L.lower && appSettings.scriptLowerCase && Math.random() < 0.5;
  return {
    disp: 'letter', reverse, answerMode: 'choice',
    char: reverse ? L.sound : (showLower ? L.lower : L.char),
    howItSounds: L.howItSounds,
    answer: right, answerEn: L.sound,
    note: `${L.char} ${L.lower || ''} = ${L.sound} · ${L.howItSounds}`,
    options: shuffle(opts).map(o => ({ jp: o })),
    scoreKey: (reverse ? 'r:' : 'l:') + L.char,
    speakAs: L.char,
  };
}
// A run: every letter in the chosen groups once, in random order.
function startLetterDrill(reverse, groups) {
  lastSettingsScreen = 'script';
  const build = () => { const pool = scriptLetters(groups); return shuffle(pool.slice()).map(L => buildLetterQuestion(L, reverse, pool)); };
  startDrill(build(), build);
}
function buildReadQuestion(item) {
  return {
    disp: 'read', char: item.jp, answer: item.jp, answerEn: item.en,
    expect: LANG.reading(item.jp) + ' · ' + item.en,
    scoreKey: 'read|' + item.jp,
  };
}
function startReadDrill(items) {
  lastSettingsScreen = 'match-settings';
  const build = () => shuffle(items().slice()).map(buildReadQuestion);
  startDrill(build(), build);
}

// The chart, into any element.
function letterChartScore(L) {
  const a = decayedScoreFor('l:' + L.char), b = decayedScoreFor('r:' + L.char);
  if (a === null && b === null) return null;
  return a === null ? b : b === null ? a : Math.min(a, b);
}
function decayedScoreFor(key) {
  const e = kanaScores[key];
  return e ? displayScore(e) : null;
}
function renderScriptChart(el) {
  const S = APP.script;
  el.innerHTML = '';
  Object.entries(S.groups).forEach(([g, label], i) => {
    const ls = S.letters.filter(l => l.group === g);
    if (!ls.length) return;
    if (i) { const d = document.createElement('div'); d.className = 'section-divider'; el.appendChild(d); }
    const head = document.createElement('div');
    head.className = 'script-group-head';
    head.innerHTML = `<span>${escapeHtmlText(label)}</span><span class="script-group-count">${tx('script.nLetters', { n: ls.length })}</span>`;
    el.appendChild(head);
    const grid = document.createElement('div');
    grid.className = 'kanji-tile-grid script-grid';
    ls.forEach(L => {
      const tile = document.createElement('div');
      const band = confidenceBand(letterChartScore(L));
      tile.className = 'kana-ref-card' + (band ? ' score-' + band : '');
      tile.innerHTML = `<span class="kana-ref-char">${escapeHtmlText(L.char)}<small>${escapeHtmlText(L.lower || '')}</small></span><span class="kana-ref-rom">${escapeHtmlText(L.sound)}</span>`;
      attachTilePeek(tile, { jp: L.char + ' ' + (L.lower || ''), en: L.howItSounds, note: L.sound, speakAs: L.char, noReading: true });
      grid.appendChild(tile);
    });
    el.appendChild(grid);
  });
}
