// Português Drill - The core: the drill screen and its question types - the registry, drawing a
// question, choice / typed / listening / say-it answers, marking and scoring.
// Each kind of question registers itself (word, number and time here; the
// Portuguese-only kinds in pt/).
// Split out of app.js on 2026-11-07 (refactor step 6); code unchanged.

function getSpeechText(q) {
  return q.speakAs || q.char;
}

// The drill's speaker button. Counts as a hint before answering, as before.
function speakCurrent() {
  if (!soundAllowed()) return;
  const q = deck[current];
  if (!q) return;
  if (!answered && !hintUsedThisQuestion) {
    hintUsedThisQuestion = true;
    hints++;
    document.getElementById('stat-hints').textContent = hints;
  }
  speakTarget(getSpeechText(q));
}

function renderTypeAnswerInput(container, placeholder, submitFn) {
  container.innerHTML = '<div class="type-answer-row">' +
    `<input type="text" id="type-answer-input" class="type-answer-input" lang="${LANG.code}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="${placeholder}">` +
    `<button type="button" class="type-answer-submit" id="type-answer-submit">${tx('drill.check')}</button>` +
    '</div>';
  const input = document.getElementById('type-answer-input');
  const submitBtn = document.getElementById('type-answer-submit');
  const submit = () => submitFn(input.value);
  submitBtn.onclick = submit;
  input.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      e.stopPropagation();
      submit();
    }
  };
  setTimeout(() => input.focus(), 30);
}

const LISTEN_ICON = '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 9 8 9 12 5 12 19 8 15 3 15" fill="currentColor"></polygon><path d="M15.5 8.5a5 5 0 0 1 0 7"></path><path d="M18.5 5.5a9 9 0 0 1 0 13"></path></svg>';

function renderListenPrompt(q, charDisplay, promptText) {
  const say = () => speakTarget(getSpeechText(q));
  charDisplay.innerHTML = `<button type="button" class="listen-play" aria-label="Play again">${LISTEN_ICON}</button>`;
  charDisplay.querySelector('.listen-play').onclick = say;
  document.getElementById('q-prompt').textContent = promptText;
  const speakBtn = document.getElementById('speak-btn');
  if (speakBtn) speakBtn.style.display = 'none';
  setTimeout(() => { if (deck[current] === q && !answered) say(); }, 120);
}

// After answering a listening question, show the word that was played
// (tap it to hear it again).
function revealListenWord(q) {
  const charDisplay = document.getElementById('q-char');
  if (!charDisplay || !charDisplay.querySelector('.listen-play')) return;
  charDisplay.textContent = q.char;
  charDisplay.style.fontSize = promptFontSize(q.char);
  charDisplay.style.cursor = 'pointer';
  charDisplay.onclick = () => speakTarget(getSpeechText(q));
}

function promptFontSize(text) {
  const len = String(text).length;
  return len <= 8 ? '52px' : len <= 14 ? '40px' : len <= 22 ? '30px' : '24px';
}

// Shown under the verdict once a question is answered: the Brazilian form
// where it differs, and any usage note.
function answerNotesHtml(q) {
  let html = '';
  if (q.br) html += `<div class="feedback-standard-note">${tx('drill.inBrazil', { w: escapeHtmlText(q.br) })}</div>`;
  if (q.note) html += `<div class="feedback-standard-note">${escapeHtmlText(q.note)}</div>`;
  return html;
}

// ---------- Question types (2026-11-06) ------------------------------------
// Each kind of question is one object, registered here; the drill screen
// asks the question's type what to do and never checks which kind it has.
// Adding a kind of question means adding one object.
//   id           the question's disp value ('word', 'verb', ...)
//   badge        label above the question (words show their category instead)
//   scoring      'item': its own score, steps up 0.5, down 0.75
//                'consistency': many answers share one score (numbers,
//                times), so small even steps of 0.1
//   render(q, ui)  draw the prompt and the ways to answer;
//                ui = { charDisplay, container, promptEl, mode }
//   prompt(q, charDisplay, promptEl)  for the grammar-style types: just the
//                prompt (renderGrammarQuestion draws the answers)
//   reveal(q)    after any answer: fill the gap, show both sounds...
//   namesWord    a forward answer also names the Portuguese word
//   longOptions  answers are long, so the options take the full width
const QUESTION_TYPES = {};
function registerQuestionType(t) { QUESTION_TYPES[t.id] = t; }
function questionType(q) { return (q && QUESTION_TYPES[q.disp]) || null; }
function revealQuestion(q) { const t = questionType(q); if (t && t.reveal) t.reveal(q); }

registerQuestionType({
  id: 'word', scoring: 'item', namesWord: true,
  render: (q, ui) => renderWordQuestion(q, ui),
});
// Numbers and times: the prompt is the figure, with the question's own line.
const promptFigure = (q, charDisplay, promptEl) => {
  charDisplay.style.fontSize = promptFontSize(q.char);
  charDisplay.textContent = q.char;
  promptEl.innerHTML = q.promptHtml;
};
registerQuestionType({
  id: 'number', badge: tx('types.numbers'), scoring: 'consistency', longOptions: true,
  render: (q, ui) => renderGrammarQuestion(q, ui.charDisplay, ui.container, ui.promptEl),
  prompt: promptFigure,
});
registerQuestionType({
  id: 'time', badge: tx('types.times'), scoring: 'consistency', longOptions: true,
  render: (q, ui) => renderGrammarQuestion(q, ui.charDisplay, ui.container, ui.promptEl),
  prompt: promptFigure,
});

function renderQuestion() {
  if (current >= deck.length) { showResults(); return; }
  saveDrillSession();
  const q = deck[current];
  const pct = Math.round((current / deck.length) * 100);
  document.getElementById('prog-fill').style.width = pct + '%';
  document.getElementById('prog-label').textContent = (current + 1) + ' / ' + deck.length;
  document.getElementById('stat-correct').textContent = score;
  document.getElementById('stat-wrong').textContent = wrong;
  document.getElementById('stat-hints').textContent = hints;
  document.getElementById('stat-left').textContent = deck.length - current;

  const badge = document.getElementById('q-badge');
  const cat = VOCAB[q.cat] || VOCAB[q.groupKey] || THEMES[q.groupKey];
  badge.textContent = cat ? cat.label : 'vocab';
  badge.className = 'type-badge type-base';

  const altEl = document.getElementById('q-alt-form');
  if (altEl) altEl.style.display = 'none';

  const contextCard = document.getElementById('q-context-card');
  const contextCardBody = document.getElementById('q-context-card-body');
  if (contextCard && contextCardBody) {
    if (q.seenAs || q.source) {
      let html = '';
      if (q.seenAs) html += `<div class="seen-as-text">${renderSeenAsHtml(q.char, q.seenAs)}</div>`;
      if (q.source) {
        html += `<div class="context-card-meta">${q.source.location}${q.source.date ? ' · ' + q.source.date : ''}</div>`;
        if (q.source.file) html += `<div class="context-card-file">${q.source.file}</div>`;
      }
      contextCardBody.innerHTML = html;
      contextCard.style.display = typeAnswerMode ? 'none' : 'block';
    } else {
      contextCard.style.display = 'none';
    }
  }

  document.getElementById('q-feedback').textContent = '';
  document.getElementById('q-feedback').className = 'feedback';
  document.getElementById('next-btn').style.visibility = 'hidden';
  answered = false;
  hintUsedThisQuestion = false;

  const mode = wordQuestionMode();
  const speakBtn = document.getElementById('speak-btn');
  if (speakBtn) {
    speakBtn.style.display = SPEECH_SUPPORTED ? 'inline-flex' : 'none';
    speakBtn.disabled = !soundAllowed();
  }
  if (SPEECH_SUPPORTED) window.speechSynthesis.cancel();

  const charDisplay = document.getElementById('q-char');
  charDisplay.onclick = null; charDisplay.style.cursor = '';
  charDisplay.style.fontFamily = '';
  const container = document.getElementById('q-options');
  container.innerHTML = '';
  container.classList.remove('long-options');
  const promptEl = document.getElementById('q-prompt');

  // Anything without a registered type is drawn as a word, as before.
  const type = questionType(q) || QUESTION_TYPES.word;
  if (type.badge) {
    badge.textContent = type.badge;
    if (contextCard) contextCard.style.display = 'none';
  }
  type.render(q, { charDisplay, container, promptEl, mode });
}

// A word question: meaning, reversed, typed, listening, dictation or say it.
function renderWordQuestion(q, ui) {
  const { charDisplay, container, promptEl, mode } = ui;
  if (mode === 'say') {
    charDisplay.style.fontSize = promptFontSize(q.answerEn);
    charDisplay.textContent = q.answerEn;
    promptEl.textContent = tx('drill.sayIt');
    q.answer = q.char;
    renderSayQuestion(q, container, q.char);
    return;
  }

  // Which side is shown, and which side the options/answer are on.
  const askTarget = mode === 'reversed' || mode === 'type' || mode === 'dictation';
  q.answer = askTarget ? q.char : q.answerEn;

  if (mode === 'listen' || mode === 'dictation') {
    charDisplay.style.fontSize = '52px';
    renderListenPrompt(q, charDisplay, mode === 'dictation' ? tx('drill.typeWhatYouHear') : tx('drill.whatDoesItMeanHeard'));
  } else {
    const shown = askTarget ? q.answerEn : q.char;
    charDisplay.style.fontSize = promptFontSize(shown);
    charDisplay.textContent = shown;
    promptEl.textContent = mode === 'type' ? tx('drill.typeThis') : mode === 'reversed' ? tx('drill.whichIsTarget') : tx('drill.whatDoesItMean');
  }

  if (mode === 'type' || mode === 'dictation') {
    renderTypeAnswerInput(container, tx('drill.typeTargetPlaceholder'), raw => chooseTypedAnswer(raw, q));
    return;
  }
  const field = askTarget ? 'jp' : 'en';
  q.options.forEach((o, idx) => {
    const btn = document.createElement('button');
    btn.className = 'opt';
    btn.innerHTML = field === 'jp' ? optPtHtml(idx, o.jp) : `<span class="opt-num">${idx + 1}</span><span class="opt-rd">${escapeHtmlText(o[field])}</span>`;
    btn.dataset.value = o[field];
    btn.onclick = () => choose(btn, o[field], q.answer, q.char);
    container.appendChild(btn);
  });
}

function finishAnswer() {
  document.getElementById('stat-correct').textContent = score;
  document.getElementById('stat-wrong').textContent = wrong;
  const nextBtn = document.getElementById('next-btn');
  nextBtn.style.visibility = 'visible';
  nextBtn.innerHTML = (current + 1 < deck.length ? tx('drill.next') : tx('drill.seeResults')) + `<span class="kbd-hint">${tx('drill.keySpace')}</span>`;
}

function noteMissed(q) {
  const missedKey = q.char + '|' + q.answer;
  if (!missed.includes(missedKey)) { missed.push(missedKey); missedItems.push(q); }
}

function choose(btn, selectedVal, answer, char) {
  if (answered) return;
  answered = true;
  document.querySelectorAll('.opt').forEach(b => {
    b.disabled = true;
    if (b.dataset.value === answer) b.classList.add('correct');
  });
  const q = deck[current];
  const fb = document.getElementById('q-feedback');
  const isCorrect = selectedVal === answer;
  recordKanaResult(q, isCorrect);
  revealListenWord(q);
  revealQuestion(q);
  // Forward questions: name the Portuguese word alongside the meaning, so a
  // listening answer still shows what was said.
  const pair = (!questionType(q).namesWord || answer === q.char) ? '' : ` — ${escapeHtmlText(q.char)}`;
  if (isCorrect) {
    score++;
    btn.classList.add('correct');
    fb.innerHTML = tx('drill.correct') + pair + answerNotesHtml(q);
    fb.className = 'feedback good';
  } else {
    btn.classList.add('wrong');
    fb.innerHTML = tx('drill.notQuite', { a: escapeHtmlText(answer) }) + pair + answerNotesHtml(q);
    fb.className = 'feedback bad';
    wrong++;
    noteMissed(q);
  }
  finishAnswer();
}

// ---------- Typed answers ----------------------------------------------------
// How a typed answer is compared is the language's business (LANG.normalise,
// LANG.compareTyped - for Portuguese: case, punctuation, accents, the article,
// the Brazilian form; see lang/pt.js). What the learner then sees, and how
// the score moves, is the same for every language and stays here.
// The forms a question accepts: the answer, any "a / b" part, alternatives,
// and the Brazilian form (which counts, with a note).
function acceptedForms(q) {
  const forms = [];
  const add = (s, kind) => {
    if (!s) return;
    String(s).split(/\s*\/\s*/).forEach(part => {
      const n = LANG.normalise(part);
      if (n) forms.push({ form: n, kind });
    });
  };
  add(q.expect || q.char, 'main');
  (q.alt || []).forEach(a => add(a, 'main'));
  add(q.br, 'brazil');
  return forms;
}
function chooseTypedAnswer(rawInput, q) {
  if (answered) return;
  answered = true;
  const input = document.getElementById('type-answer-input');
  const submitBtn = document.getElementById('type-answer-submit');
  if (input) input.disabled = true;
  if (submitBtn) submitBtn.disabled = true;
  // match: { kind, accentSlip, noArticle, form } or null; wrongArticle: the
  // form with the right article, when only the article was wrong.
  const { match, wrongArticle } = LANG.compareTyped(acceptedForms(q), rawInput);
  const strict = !!appSettings.strictAccents;
  const isCorrect = !!match && !(match.accentSlip && strict);
  if (input) input.classList.add(isCorrect ? 'correct' : 'wrong');
  const contextCard = document.getElementById('q-context-card');
  const contextCardBody = document.getElementById('q-context-card-body');
  if (contextCard && contextCardBody && contextCardBody.innerHTML.trim()) contextCard.style.display = 'block';

  const notes = [];
  if (match && match.accentSlip) notes.push(tx('typed.watchAccents', { w: escapeHtmlText(match.form) }));
  if (match && match.kind === 'brazil') notes.push(tx('typed.brazilianForm', { w: escapeHtmlText(q.expect || q.char) }));
  if (match && match.noArticle && !match.accentSlip) notes.push(tx('typed.rememberArticle', { w: escapeHtmlText(match.form) }));
  if (wrongArticle) notes.push(tx('typed.checkArticle', { w: escapeHtmlText(wrongArticle) }));
  const noteHtml = notes.map(n => `<div class="feedback-standard-note">${n}</div>`).join('');

  recordKanaResult(q, isCorrect, !!(match && match.accentSlip), true);
  revealListenWord(q);
  revealQuestion(q);
  const fb = document.getElementById('q-feedback');
  if (isCorrect) {
    score++;
    fb.innerHTML = tx('drill.correct') + (q.answerEn ? ` (${escapeHtmlText(q.answerEn)})` : '') + noteHtml + (match.kind === 'brazil' ? '' : answerNotesHtml(q));
    fb.className = 'feedback good';
  } else {
    wrong++;
    fb.innerHTML = tx('drill.notQuite', { a: escapeHtmlText(q.expect || q.char) }) + ` (${escapeHtmlText(q.answerEn)})` + noteHtml + answerNotesHtml(q);
    fb.className = 'feedback bad';
    noteMissed(q);
  }
  finishAnswer();
}

function nextQuestion() { current++; renderQuestion(); }

function showResults() {
  clearDrillSession();
  showScreen('results');
  const total = deck.length;
  const pct = Math.round((score / total) * 100);
  const msg = pct === 100 ? tx('results.perfect') : pct >= 80 ? tx('results.great') : pct >= 60 ? tx('results.gettingThere') : tx('results.keepDrilling');
  document.getElementById('res-score').textContent = score + '/' + total;
  document.getElementById('res-msg').textContent = msg + ' (' + pct + '%)' + (hints > 0 ? ' · ' + tx('results.hintsUsed', { n: hints }) : '');
  const missedEl = document.getElementById('res-missed');
  const missedBtn = document.getElementById('res-missed-btn');
  const missedLabel = document.getElementById('res-missed-label');
  if (missed.length > 0) {
    missedLabel.textContent = tx('results.focusOn');
    // missed entries are "char|answer" composites (see choose()) - display
    // only the char portion, same visual as before.
    const missedChars = missed.map(k => k.split('|')[0]);
    missedEl.innerHTML = '<div class="missed-chars">' + missedChars.map(escapeHtmlText).join(' · ') + '</div>';
    missedBtn.style.display = 'block';
  } else {
    missedLabel.textContent = '';
    missedEl.innerHTML = `<div class="no-missed">${tx('results.noMistakes')}</div>`;
    missedBtn.style.display = 'none';
  }
}

// Collections is the default landing view for Vocab now that Read has
// retired - see setMatchLevel/showMatchSettings.
let currentMatchLevel = 'theme';



function setMatchLevel(level) {
  currentMatchLevel = level;
  document.querySelectorAll('#vocab-level-filter-row [data-section]').forEach(p => p.classList.toggle('active', p.dataset.section === level));
  document.getElementById('level-pill-theme').classList.toggle('active', level === 'theme');
  const randomPill = document.getElementById('level-pill-random');
  if (randomPill) randomPill.classList.toggle('active', level === 'random');
  document.getElementById('vocab-level-filter-row').classList.toggle('showing-theme-colours', level === 'theme');
  // Andrew mode and Untaught vocabulary both deliberately reuse the same
  // generic Level 1/2 list view (match-vocab-view + buildMatchCategoryList)
  // rather than getting their own dedicated view like Collections has - so
  // a new category just needs level:'andrew' or level:'untaught' in VOCAB
  // and shows up automatically, no hand-built card needed. Genki (2026-09-12)
  // joins the same list for the same reason.
  document.getElementById('match-vocab-view').style.display = SECTION_KEYS.includes(level) ? 'flex' : 'none';
  document.getElementById('match-theme-view').style.display = level === 'theme' ? 'flex' : 'none';
  document.getElementById('match-random-view').style.display = level === 'random' ? 'flex' : 'none';
  if (level === 'theme') refreshThemeCategorySwatches();
  if (level === 'theme') return;
  if (level === 'random') { refreshRandomView(); return; }
  buildMatchCategoryList();
}

// Builds one real, permanent category tile - the ".match-card-select"
// white-text style Materials cards have always used (group name, chars,
// word count, confidence swatch), as opposed to the plain gold-link
// ".vocab-ref-card" style used for reference/notes/TEST links. Shared by
// both real VOCAB categories and promoted THEMES keys (2026-08-31) - this
// used to be inline inside the Object.keys(VOCAB).forEach below, only ever
// called for VOCAB keys; extracted so promoted theme cards (Stations,
// Accommodation, Emergency, Food & drink, Shopping, Signage, Service &
// shop ops) render identically instead of keeping their old gold-link
// TEST styling. resolveVocabCategory/getCategoryAverageScore already work
// generically for a THEMES key (see resolveVocabCategory's THEME_CACHE
// branch), so this needed zero special-casing beyond checking THEMES[key]
// to decide the label/chars source and the click handler.
function buildCategoryTile(key) {
  const isTheme = !!THEMES[key];
  const v = isTheme ? THEMES[key] : VOCAB[key];
  const card = document.createElement('div');
  card.className = 'match-card-select cat-tile';
  card.dataset.key = key;
  // resolveVocabCategory here too (not raw v.items) - so a category using
  // includeItems, or a theme pooling several categories, shows an accurate
  // total count and an accurate spread. Read once and reused for both the
  // count text and the bar, rather than resolving twice.
  const resolvedItems = resolveVocabCategory(key).items;
  const resolvedCount = resolvedItems.length;
  const countText = v.note ? `${v.note} — ${tx('groups.nWordsAlways', { n: resolvedCount })}` : tx('groups.nWordsAlways', { n: resolvedCount });
  const counts = getCategoryBandCounts(resolvedItems);
  card.innerHTML = `
    <div class="cat-tile-top">
      <div class="group-name">${v.label}</div>
      <div class="group-count">${countText}</div>
    </div>
    <div class="cat-bar" title="Tap to include words you haven't drilled yet"></div>
  `;
  // TRIAL (2026-09-22): per-tile confidence spread bar, replacing the old
  // single-colour .cat-swatch average blob on this screen. showUntested is
  // local to this one tile's closure, not appSettings/localStorage - a
  // deliberate choice while trying the design out: each tile starts
  // tested-only and forgets its state the moment the list is rebuilt
  // (leaving the screen and coming back), rather than adding a persisted
  // setting for something that might not stick around. Per-tile rather
  // than one global switch (see getCategoryBandCounts comment above) -
  // tapping one category's bar only ever redraws that bar, never the rest
  // of the list.
  const barEl = card.querySelector('.cat-bar');
  let showUntested = false;
  renderCategoryBar(barEl, counts, showUntested);
  barEl.onclick = (e) => {
    e.stopPropagation(); // don't also trigger the card's own onclick below
    showUntested = !showUntested;
    renderCategoryBar(barEl, counts, showUntested);
  };
  // Every THEMES key routes through showVocabTileSelection (resolved via
  // getThemePool, always hasReference:true in the THEME_CACHE wrapper) -
  // raw THEMES entries don't carry their own hasReference flag, so check
  // isTheme first rather than reading v.hasReference for them.
  if (isTheme || v.hasReference) {
    card.onclick = () => showVocabTileSelection(key);
  } else {
    card.onclick = () => startVocabReadingDeck(v.items, key);
  }
  return card;
}

function buildMatchCategoryList() {
  const container = document.getElementById('match-category-list');
  container.innerHTML = '';
  if (!SECTION_KEYS.includes(currentMatchLevel)) return;
  // Topic pills (Portuguese build): the categories whose section matches the
  // pill, in vocab.js order, then any private word lists for that section
  // (a private list with no section goes under the last pill).
  const sectionOf = key => VOCAB[key].section && SECTION_KEYS.includes(VOCAB[key].section) ? VOCAB[key].section : SECTION_KEYS[SECTION_KEYS.length - 1];
  Object.keys(VOCAB).forEach(key => {
    if (VOCAB[key].privatePack || VOCAB[key].standaloneCard === false) return;
    if (sectionOf(key) !== currentMatchLevel) return;
    container.appendChild(buildCategoryTile(key));
  });
  const privateHere = PRIVATE_VOCAB_KEYS.filter(key => sectionOf(key) === currentMatchLevel);
  if (privateHere.length) {
    container.appendChild(document.createElement('div')).className = 'section-divider';
    privateHere.forEach(key => container.appendChild(buildCategoryTile(key)));
  }
}


// Where the vocab-reference screen's Back button returns to - reference
// screens get opened from several different places (Vocab > L2, and now the
// Hiragana/Katakana selection screens), so this can't be hardcoded the way
// it used to be (always straight back to Vocab settings).
let vocabRefBackTarget = 'match-settings';
function closeVocabReference() {
  // 'grammar-notes-hub' isn't a real screen id - it means "back to the
  // Grammar notes list", which is itself just another render into
  // #screen-vocab-reference (see showGrammarNotesHub()), not a distinct
  // screen to show() into.
  showScreen(vocabRefBackTarget);
}




















































































































function showMatchSettings() {
  showScreen('match-settings');
}

// The word-list tab goes back to whichever of the word lists or an extra
// pill's screen (Verbs, for Portuguese) was last open.
var lastVocabRoot = 'match-settings';
function tryResumeMatch() {
  const sc = APP.screens[lastVocabRoot];
  if (lastVocabRoot !== 'match-settings' && sc && sc.open) sc.open(); else showMatchSettings();
}


function buildVocabReadingDeck(items, groupKey, distractorPool) {
  // See the WEIGHTED RANDOM SELECTION and DECAY entries above kanaScoreClass -
  // weaker, never-drilled, and stale items come up more often than
  // well-known, recently-practiced ones, rather than every item in the pool
  // having identical odds.
  const pool = weightedSampleWithoutReplacement([...items], 20, item => selectionWeight(decayedScore(kanaScores[item.jp + '|' + item.en])));
  // distractorPool (2026-09-22) - defaults to items (unchanged behaviour
  // for every existing caller), but Weakest 20/Untested 20 pass the WHOLE
  // vocab pool here instead: items itself is deliberately narrowed to just
  // the weakest/untested words, and drawing wrong-answer options from that
  // same narrow set would be the "1 search match, no wrong options" bug
  // from earlier this session all over again, just triggered by a small
  // filtered pool instead of a small search result.
  const pickFrom = distractorPool || items;
  return pool.map(item => buildWordQuestion(item, pickFrom, groupKey));
}

// One word question (Portuguese build, 2026-10-10) - the Japanese build had
// this object literal written out twice (tile selection + random decks).
// Options carry both sides; renderQuestion decides which side is asked.
function buildWordQuestion(item, pool, groupKey) {
  const distractorItems = pickDistractorItems(pool, item, 3);
  const allItems = shuffle([item, ...distractorItems]);
  return {
    char: item.jp,
    answer: item.en,
    answerEn: item.en,
    disp: 'word',
    groupKey: groupKey,
    cat: item.cat,
    options: allItems.map(w => ({ en: w.en, jp: w.jp })),
    hint: item.en,
    br: item.br,
    alt: item.alt,
    note: item.note,
    seenAs: item.seenAs,
    source: item.source,
    speakAs: item.speakAs,
  };
}

function startVocabReadingDeck(items, groupKey, distractorPool) {
  lastSettingsScreen = 'match-settings';
  lastDeckBuilder = () => buildVocabReadingDeck(items, groupKey, distractorPool);
  deck = buildVocabReadingDeck(items, groupKey, distractorPool);
  current = 0; score = 0; wrong = 0; hints = 0; answered = false; missed = []; missedItems = [];
  showScreen('drill');
  renderQuestion();
}

// Pulled out of startRandomMatchEverything so the "All vocabulary" card on
// the Themes screen can compute its confidence swatch from the exact same
// pool the drill itself draws its 20 from, rather than a second copy of
// "every category" that could quietly drift out of sync with it.
function getAllVocabPool() {
  // Now routed through scanVocabByTag too (2026-08-27), same as
  // startRandomMatch above - keeps exactly one implementation of "walk
  // every category, respect itemTierVisible" instead of two near-
  // identical copies. The empty array `[]` as the query is deliberate:
  // tagQueryMatches's AND check is `required.every(...)`, and .every() on
  // an empty array is vacuously true, so every item with any tags at all
  // matches - which is every item, since 100% of words carry at least one
  // tag (see the full-coverage pass above VOCAB). No special "match
  // everything" case needed in tagQueryMatches itself.
  return scanVocabByTag([]);
}

// Mirrors the optional-tier tag checks in itemTierVisible (Untaught/Genki/
// Andrew, including the Genki-but-already-taught carve-out) but as a fixed
// rule rather than one that moves with the live Settings toggles - kept
// manually in sync with itemTierVisible if a new tier is ever added there.
function isOptionalTierItem(item) {
  return false;
}

// "All vocabulary" on the Themes screen is meant to be exactly that - the
// standard taught course content - regardless of whatever optional tiers
// happen to be switched on in Settings right now (Andrew, 2026-09-22).
// Kanji/Andrew/Genki words leaking in here whenever their toggle was on was
// the actual problem being solved: those already have their own dedicated
// "random from everything" cards (Kanji's, Untaught's), and a kanji word
// turning up here is one the new "type the reading" toggle can't reasonably
// ask for a romaji reading of. Unlike getAllVocabPool above, this doesn't
// move with the toggles - it's always just the taught pool. (Not applied to
// getWeakestVocabItems/getUntestedVocabItems below - those are about
// surfacing YOUR actual weak/untested words, which should include optional-
// tier content you've genuinely been drilling if you've switched it on.)
function getCoreVocabPool() {
  return getAllVocabPool().filter(item => !isOptionalTierItem(item));
}

function startRandomMatchEverything() {
  startVocabReadingDeck(getCoreVocabPool(), 'random-everything');
}

// The 20 lowest-scoring words that have actually been drilled at least
// once - untested words are deliberately excluded here (they're their own
// separate card, getUntestedVocabItems below) rather than folded in as
// "worse than the worst tested score", so the two cards never overlap.
// A harder, deterministic version of the same soft weighting
// startRandomMatchEverything's own draw already applies via selectionWeight
// - sorted-and-sliced instead of randomly biased, so "weakest" is a
// guarantee, not just a likelihood.
function getWeakestVocabItems(n) {
  const scored = getAllVocabPool()
    .map(item => {
      const entry = kanaScores[item.jp + '|' + item.en];
      return entry ? { item, score: displayScore(entry) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score);
  return scored.slice(0, n).map(x => x.item);
}

// Every word with no kanaScores entry at all - not "worst score", genuinely
// never answered once. Handed to buildVocabReadingDeck's own weighted
// sampler unsliced: every item here gets the identical undrilled weight
// (see selectionWeight's undefined-score floor), so its weighted draw is
// already an unbiased random 20 among them - no separate sampling needed.
function getUntestedVocabItems() {
  return getAllVocabPool().filter(item => !(item.jp + '|' + item.en in kanaScores));
}

// Both guard against an empty pool (everything drilled at least once, for
// Untested - or, in principle, nothing drilled yet at all, for Weakest) by
// simply not starting a drill with nothing in it, rather than launching a
// broken empty deck. Not expected to come up for a while on a real course,
// but cheap to guard against either way.
function startWeakestVocab() {
  const items = getWeakestVocabItems(20);
  if (!items.length) return;
  startVocabReadingDeck(items, 'weakest-vocab', getAllVocabPool());
}
function startUntestedVocab() {
  const items = getUntestedVocabItems();
  if (!items.length) return;
  startVocabReadingDeck(items, 'untested-vocab', getAllVocabPool());
}



































// Typing / saying in verb and contraction drills follow their own switches
// (Verbs and Grammar screens share them), captured when the drill starts.
let grammarTypeModeActive = false;
let grammarSayModeActive = false;

// ---------- Say it out loud (2026-10-11) ----------
// No options and nothing to type: the prompt is shown, you say the answer
// out loud, tap "Show answer" (or Space) to see and hear it, then mark
// yourself - 1 / "Got it" or 2 / "Not this time". The point is speaking-
// speed recall without spelling getting in the way; the mark you give is
// scored exactly like a right or wrong answer.
function renderSayQuestion(q, container, expectText) {
  const speakBtn = document.getElementById('speak-btn');
  if (speakBtn) speakBtn.style.display = 'none'; // it would say the answer
  container.innerHTML = `<button type="button" class="start-btn say-reveal-btn" id="say-reveal-btn">${tx('say.showAnswer')}<span class="kbd-hint">${tx('drill.keySpace')}</span></button>`;
  document.getElementById('say-reveal-btn').onclick = () => revealSayAnswer(q, container, expectText);
}
function revealSayAnswer(q, container, expectText) {
  revealQuestion(q);
  // The answer goes above the two marking buttons (inside the options grid),
  // so your eye lands on it before you mark yourself.
  container.innerHTML = `<div class="say-answer-box"><div class="say-answer">${escapeHtmlText(expectText)}</div>` +
    (q.alt && q.alt.length ? `<div class="feedback-standard-note">${tx('say.also', { w: escapeHtmlText(q.alt.join(' / ')) })}</div>` : '') +
    answerNotesHtml(q) + '</div>';
  if (soundAllowed()) speakTarget(getSpeechText(q));
  [[tx('say.gotIt'), true], [tx('say.notThisTime'), false]].forEach(([label, ok], idx) => {
    const btn = document.createElement('button');
    btn.className = 'opt say-mark ' + (ok ? 'say-yes' : 'say-no');
    btn.innerHTML = `<span class="opt-num">${idx + 1}</span><span class="opt-rd">${label}</span>`;
    btn.onclick = () => markSayAnswer(q, ok, btn);
    container.appendChild(btn);
  });
}
function markSayAnswer(q, ok, btn) {
  if (answered) return;
  answered = true;
  document.querySelectorAll('#q-options .opt').forEach(b => { b.disabled = true; });
  btn.classList.add(ok ? 'correct' : 'wrong');
  recordKanaResult(q, ok, false, true);
  if (ok) score++;
  else { wrong++; noteMissed(q); }
  finishAnswer();
}

// The verb, contraction, number and time types draw here: their own prompt,
// then choice, type it or say it.
function renderGrammarQuestion(q, charDisplay, container, promptEl) {
  const type = questionType(q);
  type.prompt(q, charDisplay, promptEl);
  // answerMode is fixed on the question when the deck is built (numbers and
  // times); verb / contraction decks follow the switches captured at start.
  const answerMode = q.answerMode || (grammarSayModeActive ? 'say' : grammarTypeModeActive ? 'type' : 'choice');
  if (answerMode === 'say') {
    renderSayQuestion(q, container, q.expect);
    return;
  }
  if (answerMode === 'type') {
    renderTypeAnswerInput(container, tx('drill.typeFormPlaceholder'), raw => chooseTypedAnswer(raw, q));
    return;
  }
  container.classList.toggle('long-options', !!type.longOptions);
  q.options.forEach((o, idx) => {
    const btn = document.createElement('button');
    btn.className = 'opt';
    btn.innerHTML = optPtHtml(idx, o.jp);
    btn.dataset.value = o.jp;
    btn.onclick = () => choose(btn, o.jp, q.answer, q.char);
    container.appendChild(btn);
  });
}
