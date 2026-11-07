(window.__BUILD_FILES = window.__BUILD_FILES || {})["pt/sounds.js"] = "2611072109";
// Português Drill - Portuguese: the Sounds alike drill (pairs from grammar.js).
// Split out of app.js on 2026-11-07 (refactor step 6); code unchanged.

// ==== SOUNDS ALIKE (2026-10-14, from the Japanese app's small-っ drill) ====
// Pairs of real words that differ by one sound (grammar.js soundPairs).
// Sound on: hear one, pick which - the buttons show the English, never the
// spelling, and are always in the same order. Sound off: read the English of
// one, pick its spelling. Scored per word ('sound|avó'), separate from vocab.
// (Read from GRAMMAR on each call: refreshRandomView runs during init,
// before a top-level const down here would exist.)
function soundPairs() { return GRAMMAR.soundPairs || []; }
function soundScoreItems() {
  const out = [];
  soundPairs().forEach(p => { out.push({ jp: 'sound', en: p.a[0] }); out.push({ jp: 'sound', en: p.b[0] }); });
  return out;
}
function buildSoundDeck() {
  const words = [];
  soundPairs().forEach(p => {
    const pair = [{ pt: p.a[0], en: p.a[1] }, { pt: p.b[0], en: p.b[1] }];
    pair.forEach(w => words.push({ w, pair, note: p.note }));
  });
  const picks = weightedSampleWithoutReplacement(words, 20, x => selectionWeight(decayedScore(kanaScores['sound|' + x.w.pt])));
  return shuffle(picks).map(({ w, pair, note }) => ({
    disp: 'sound', groupKey: 'sound', scoreKey: 'sound|' + w.pt,
    char: w.pt, answer: w.pt, en: w.en, pair, note,
  }));
}
function startSoundDrill() {
  lastSettingsScreen = 'match-settings';
  startDrill(buildSoundDeck(), buildSoundDeck);
}
function renderSoundQuestion(q, charDisplay, container) {
  const speakBtn = document.getElementById('speak-btn');
  if (speakBtn) speakBtn.style.display = 'none';
  const listening = soundAllowed();
  if (listening) {
    const say = () => speakTarget(q.answer);
    charDisplay.innerHTML = `<button type="button" class="listen-play" aria-label="Play again">${LISTEN_ICON}</button>`;
    charDisplay.querySelector('.listen-play').onclick = say;
    document.getElementById('q-prompt').textContent = tx('sounds.whichHeard');
    setTimeout(() => { if (deck[current] === q && !answered) say(); }, 120);
  } else {
    charDisplay.textContent = q.en;
    charDisplay.style.fontSize = promptFontSize(q.en);
    document.getElementById('q-prompt').textContent = tx('sounds.whichMeans');
  }
  q.pair.forEach((w, idx) => {
    const btn = document.createElement('button');
    btn.className = 'opt sound-opt';
    btn.innerHTML = listening
      ? `<span class="opt-num">${idx + 1}</span><span class="opt-rd opt-pt" style="font-size:17px">${escapeHtmlText(w.en)}</span><span class="sound-spelling"></span>`
      : optPtHtml(idx, w.pt) + '<span class="sound-spelling"></span>';
    btn.dataset.value = w.pt;
    btn.dataset.pt = w.pt;
    btn.dataset.en = w.en;
    btn.onclick = () => choose(btn, w.pt, q.answer, q.char);
    container.appendChild(btn);
  });
}
// After answering: each button shows both its spelling and its meaning, and
// tapping one plays it, so the two can be compared.
function revealSoundPair() {
  document.querySelectorAll('#q-options .sound-opt').forEach(b => {
    const sp = b.querySelector('.sound-spelling');
    if (sp) sp.textContent = soundAllowed() ? b.dataset.pt : b.dataset.en;
    if (soundAllowed()) { b.disabled = false; b.onclick = () => speakTarget(b.dataset.pt); }
  });
}


// The Sounds alike question type (registered with the core, see
// core/questions.js).
registerQuestionType({
  id: 'sound', badge: tx('sounds.title'), scoring: 'item',
  render: (q, ui) => renderSoundQuestion(q, ui.charDisplay, ui.container),
  reveal: () => revealSoundPair(),
});
