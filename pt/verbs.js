(window.__BUILD_FILES = window.__BUILD_FILES || {})["pt/verbs.js"] = "2611071759";
// Português Drill - Portuguese: verbs (endings, irregulars, English prompts), the verb and
// contraction drills, and the Verbs screen.
// Split out of app.js on 2026-11-07 (refactor step 6); code unchanged.

// =============================================================================
// VERBS & GRAMMAR (Portuguese build, 2026-10-11)
// Data lives in grammar.js (window.PT_DRILL_GRAMMAR). This section builds the
// verb forms from the regular endings plus grammar.js's irregular overrides,
// runs the Verbs and Grammar screens, and makes the two extra question
// types renderQuestion handles: disp 'verb' and disp 'contraction'.
// =============================================================================
const GRAMMAR = window.PT_DRILL_GRAMMAR || { persons: [], tenses: [], verbs: [], contractions: [], notes: [] };
const VERB_BY_INF = {};
GRAMMAR.verbs.forEach(v => { VERB_BY_INF[v.inf] = v; });
const TENSE_BY_KEY = {};
GRAMMAR.tenses.forEach(t => { TENSE_BY_KEY[t.key] = t; });

// Regular endings, person order eu / tu / ele / nós / eles.
const VERB_ENDINGS = {
  ar: { pres: ['o', 'as', 'a', 'amos', 'am'], pret: ['ei', 'aste', 'ou', 'ámos', 'aram'], imp: ['ava', 'avas', 'ava', 'ávamos', 'avam'] },
  er: { pres: ['o', 'es', 'e', 'emos', 'em'], pret: ['i', 'este', 'eu', 'emos', 'eram'], imp: ['ia', 'ias', 'ia', 'íamos', 'iam'] },
  ir: { pres: ['o', 'es', 'e', 'imos', 'em'], pret: ['i', 'iste', 'iu', 'imos', 'iram'], imp: ['ia', 'ias', 'ia', 'íamos', 'iam'] },
};
function verbPattern(v) {
  if (v.group === 'ar' || v.group === 'er' || v.group === 'ir') return v.group;
  const tail = v.inf.slice(-2);
  return VERB_ENDINGS[tail] ? tail : 'er';
}
function regularForm(v, tense, p) {
  const pat = verbPattern(v);
  const stem = v.inf.slice(0, -2);
  let form = stem + VERB_ENDINGS[pat][tense][p];
  // Past, eu: keep the hard/soft sound - fiquei, paguei, comecei.
  if (tense === 'pret' && p === 0 && pat === 'ar') {
    if (stem.endsWith('c')) form = stem.slice(0, -1) + 'quei';
    else if (stem.endsWith('g')) form = stem.slice(0, -1) + 'guei';
    else if (stem.endsWith('ç')) form = stem.slice(0, -1) + 'cei';
  }
  // Present, eu, -cer / -ger: ofereço, conheço, protejo (2026-11-05).
  if (tense === 'pres' && p === 0 && pat === 'er') {
    if (stem.endsWith('c')) form = stem.slice(0, -1) + 'ço';
    else if (stem.endsWith('g')) form = stem.slice(0, -1) + 'jo';
  }
  return form;
}
// One cell: the shown form plus any other accepted spellings ("ouço|oiço").
function conjugate(v, tense, p) {
  if (tense === 'prog') return { form: conjugate(VERB_BY_INF.estar, 'pres', p).form + ' a ' + v.inf, alt: [] };
  if (tense === 'fut') return { form: conjugate(VERB_BY_INF.ir, 'pres', p).form + ' ' + v.inf, alt: [] };
  const override = v.forms && v.forms[tense] && v.forms[tense][p];
  const raw = override || regularForm(v, tense, p);
  const [form, ...alt] = raw.split('|');
  return { form, alt };
}
function verbTenses(v) {
  return GRAMMAR.tenses.map(t => t.key).filter(k => !(v.skip || []).includes(k));
}

// English for the prompt: "we spoke", "she is eating", "they are going to pay".
const EN_BE = ['am', 'are', 'is', 'are', 'are'];
const EN_WAS = ['was', 'were', 'was', 'were', 'were'];
function verbEnglish(v, tense, p) {
  const who = GRAMMAR.persons[p].en;
  const [base, s3, past, ing] = v.en;
  const isBe = base === 'be';
  let rest;
  if (tense === 'pres') rest = isBe ? EN_BE[p] : (p === 2 ? s3 : base);
  else if (tense === 'pret') rest = isBe ? EN_WAS[p] : past;
  else if (tense === 'imp') rest = v.enImp || ('used to ' + base);
  else if (tense === 'prog') rest = EN_BE[p] + ' ' + ing;
  else rest = EN_BE[p] + ' going to ' + (v.enFut || base);
  return (p === 0 ? 'I' : who) + ' ' + rest;
}

// Score items - same {jp, en} shape the vocab scores use, so the shared
// band/average/weighting functions work on them unchanged.
function verbCell(v, tense, p) {
  return { jp: v.inf + '·' + tense + '·' + p, en: 'verb', v, tense, p };
}
function verbCells(verbs, tenses) {
  const cells = [];
  verbs.forEach(v => verbTenses(v).filter(t => tenses.includes(t)).forEach(t => {
    for (let p = 0; p < 5; p++) cells.push(verbCell(v, t, p));
  }));
  return cells;
}
function buildVerbQuestion(cell) {
  const { v, tense, p } = cell;
  const { form, alt } = conjugate(v, tense, p);
  // Distractors: the same person in other tenses first (falamos / falámos /
  // falávamos), then other persons in the same tense.
  const seen = new Set([form]);
  const pick = [];
  const add = f => { if (f && !seen.has(f)) { seen.add(f); pick.push(f); } };
  shuffle(verbTenses(v).filter(t => t !== tense && t !== 'prog' && t !== 'fut')).forEach(t => add(conjugate(v, t, p).form));
  const sameTense = shuffle([0, 1, 2, 3, 4].filter(x => x !== p)).map(x => conjugate(v, tense, x).form);
  const opts = pick.slice(0, 2);
  sameTense.forEach(f => { if (opts.length < 3 && !opts.includes(f) && f !== form) opts.push(f); });
  pick.slice(2).forEach(f => { if (opts.length < 3) opts.push(f); });
  const t = TENSE_BY_KEY[tense];
  return {
    disp: 'verb',
    char: GRAMMAR.persons[p].pt + ' · ' + v.inf,
    expect: form,
    alt,
    answer: form,
    answerEn: verbEnglish(v, tense, p),
    tenseLabel: t ? t.label : tense,
    options: shuffle([form, ...opts]).map(f => ({ jp: f })),
    scoreKey: cell.jp + '|' + cell.en,
    groupKey: 'verbs',
    speakAs: GRAMMAR.persons[p].pt.split('/')[0] + ' ' + form,
    note: (v.notes && v.notes[tense]) ||
      (tense === 'pret' && p === 3 && verbPattern(v) === 'ar' && !(v.forms && v.forms.pret)
        ? tx('verbs.nosAccent', { past: form, present: conjugate(v, 'pres', 3).form }) : ''),
  };
}
function startVerbDrill(verbs, tenses, origin) {
  const cells = verbCells(verbs, tenses);
  if (!cells.length) return;
  const build = () => weightedSampleWithoutReplacement([...cells], 20, c => selectionWeight(decayedScore(kanaScores[c.jp + '|' + c.en]))).map(buildVerbQuestion);
  grammarTypeModeActive = !!appSettings.grammarType;
  grammarSayModeActive = !!appSettings.grammarSay;
  lastSettingsScreen = origin || 'verbs';
  startDrill(build(), build);
}

// ---------- Contractions ----------
function contractionItem(c) { return { jp: 'contr·' + c.parts, en: c.answer }; }
function buildContractionQuestion(c) {
  const prep = c.parts.split(' + ')[0];
  const family = shuffle(GRAMMAR.contractions.filter(x => x.answer !== c.answer && x.parts.split(' + ')[0] === prep).map(x => x.answer));
  const others = shuffle(GRAMMAR.contractions.filter(x => x.answer !== c.answer && x.parts.split(' + ')[0] !== prep).map(x => x.answer));
  const opts = [...new Set([...family.slice(0, 2), ...others])].slice(0, 3);
  const item = contractionItem(c);
  return {
    disp: 'contraction',
    char: c.pt,
    expect: c.answer,
    alt: [],
    answer: c.answer,
    answerEn: c.en,
    parts: c.parts,
    options: shuffle([c.answer, ...opts]).map(f => ({ jp: f })),
    scoreKey: item.jp + '|' + item.en,
    groupKey: 'contractions',
    speakAs: c.pt.replace('___', c.answer),
    // A gap at the start of the sentence fills with a capital: Nesse dia…
    blankText: c.pt.startsWith('___') ? c.answer.charAt(0).toUpperCase() + c.answer.slice(1) : c.answer,
    note: '',
  };
}
function startContractionDrill(origin) {
  const pool = GRAMMAR.contractions;
  if (!pool.length) return;
  const build = () => weightedSampleWithoutReplacement([...pool], 20, c => { const it = contractionItem(c); return selectionWeight(decayedScore(kanaScores[it.jp + '|' + it.en])); }).map(buildContractionQuestion);
  grammarTypeModeActive = !!appSettings.grammarType;
  grammarSayModeActive = !!appSettings.grammarSay;
  lastSettingsScreen = origin || 'grammar';
  startDrill(build(), build);
}

// After answering a contraction question, fill the gap in the sentence.
function fillContractionBlank(q) {
  if (!q) return;
  const blank = document.querySelector('#q-char .pt-blank');
  if (blank) { blank.textContent = q.blankText || q.answer; blank.classList.add('filled'); }
}

// ---------- Verbs screen ----------
const verbSelected = new Set();
// Hold a verb tile to open its table (2026-10-11) - replaced a "Tap a verb to
// see its table" switch, which meant a trip to a toggle every time. A tap
// still selects; only a deliberate hold opens the table.
let verbPressSuppressClickUntil = 0;
function attachVerbLongPress(tile, inf) {
  let timer = null, startX = 0, startY = 0;
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  tile.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    startX = e.clientX; startY = e.clientY;
    cancel();
    timer = setTimeout(() => {
      timer = null;
      verbPressSuppressClickUntil = Date.now() + 800;
      showVerbTable(inf);
    }, TILE_PEEK_HOLD_MS);
  });
  tile.addEventListener('pointermove', e => {
    if (timer && (Math.abs(e.clientX - startX) > TILE_PEEK_MOVE_TOLERANCE || Math.abs(e.clientY - startY) > TILE_PEEK_MOVE_TOLERANCE)) cancel();
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => tile.addEventListener(t, cancel));
  tile.addEventListener('contextmenu', e => e.preventDefault());
}
function currentVerbTenses() {
  const t = (appSettings.verbTenses || ['pres']).filter(k => TENSE_BY_KEY[k]);
  return t.length ? t : ['pres'];
}
function showVerbsScreen() {
  renderVerbTensePills();
  buildVerbTileGrid();
  syncVerbControls();
  showScreen('verbs');
}
function renderVerbTensePills() {
  const row = document.getElementById('verb-tense-row');
  if (!row) return;
  const on = currentVerbTenses();
  row.innerHTML = '';
  GRAMMAR.tenses.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'level-pill' + (on.includes(t.key) ? ' active' : '');
    btn.textContent = t.label;
    btn.title = t.hint;
    btn.onclick = () => toggleVerbTense(t.key);
    row.appendChild(btn);
  });
}
function toggleVerbTense(key) {
  let on = currentVerbTenses();
  on = on.includes(key) ? on.filter(k => k !== key) : on.concat(key);
  if (!on.length) return; // always at least one
  appSettings.verbTenses = GRAMMAR.tenses.map(t => t.key).filter(k => on.includes(k));
  saveSettings();
  renderVerbTensePills();
  buildVerbTileGrid();
  syncVerbControls();
}
const VERB_GROUP_LABELS = { irr: tx('verbs.irregular'), ar: tx('verbs.regularAr'), er: tx('verbs.regularEr'), ir: tx('verbs.regularIr') };
function verbAverageClass(v) {
  const avg = getItemsAverageScore(verbCells([v], currentVerbTenses()));
  if (avg === null) return '';
  const band = confidenceBand(avg);
  return band ? 'score-' + band : '';
}
function buildVerbTileGrid() {
  const container = document.getElementById('verb-tile-grid');
  if (!container) return;
  container.innerHTML = '';
  ['irr', 'ar', 'er', 'ir'].forEach(group => {
    const verbs = GRAMMAR.verbs.filter(v => v.group === group);
    if (!verbs.length) return;
    const label = document.createElement('div');
    label.className = 'verb-group-label';
    const picked = verbs.filter(v => verbSelected.has(v.inf)).length;
    if (picked === verbs.length) label.classList.add('all'); else if (picked) label.classList.add('some');
    label.innerHTML = `<span class="vg-tick">✓</span>${escapeHtmlText(VERB_GROUP_LABELS[group])} · ${verbs.length}`;
    label.title = tx('verbs.groupToggle');
    label.dataset.group = group;
    label.onclick = () => toggleVerbGroup(group);
    container.appendChild(label);
    // Confidence bar for the group, in the chosen tenses.
    const bar = document.createElement('div');
    bar.className = 'cat-bar verb-group-bar';
    container.appendChild(bar);
    setupCatBar(bar, getCategoryBandCounts(verbCells(verbs, currentVerbTenses())));
    const grid = document.createElement('div');
    grid.className = 'kanji-tile-grid';
    verbs.forEach(v => {
      const tile = document.createElement('div');
      tile.className = 'kana-ref-card';
      const cls = verbAverageClass(v);
      if (cls) tile.classList.add(cls);
      if (verbSelected.has(v.inf)) tile.classList.add('selected');
      tile.innerHTML = `<span class="kana-ref-char" style="font-size:${tileWordFontSize(v.inf)};">${escapeHtmlText(v.inf)}</span><span class="kana-ref-rom">${escapeHtmlText(v.en[0])}</span>`;
      tile.onclick = () => {
        if (Date.now() < verbPressSuppressClickUntil) return; // the long press already opened the table
        if (verbSelected.has(v.inf)) verbSelected.delete(v.inf); else verbSelected.add(v.inf);
        verbRandomActive = false;
        tile.classList.toggle('selected', verbSelected.has(v.inf));
        syncVerbGroupHeadings();
        syncVerbControls();
      };
      attachVerbLongPress(tile, v.inf);
      grid.appendChild(tile);
    });
    container.appendChild(grid);
  });
}
// Same rule as the word lists (see syncVocabDrillBtn): Select all always,
// plus Random 10 / Random 20 by size. A drill is always up to 20 forms,
// weakest first, from the verbs and tenses picked - the button says so.
let verbRandomActive = false;
// Tap a group heading: select the whole group, or clear it if it's all
// selected already. Groups combine - -er then -ir gives both.
function syncVerbGroupHeadings() {
  document.querySelectorAll('#verb-tile-grid .verb-group-label').forEach(label => {
    const group = label.dataset.group;
    const verbs = GRAMMAR.verbs.filter(v => v.group === group);
    const picked = verbs.filter(v => verbSelected.has(v.inf)).length;
    label.classList.toggle('all', picked === verbs.length);
    label.classList.toggle('some', picked > 0 && picked < verbs.length);
  });
}
function toggleVerbGroup(group) {
  const verbs = GRAMMAR.verbs.filter(v => v.group === group);
  const allOn = verbs.every(v => verbSelected.has(v.inf));
  verbs.forEach(v => { if (allOn) verbSelected.delete(v.inf); else verbSelected.add(v.inf); });
  verbRandomActive = false;
  buildVerbTileGrid();
  syncVerbControls();
}
function toggleRandomVerbs() {
  if (verbRandomActive) { verbSelected.clear(); verbRandomActive = false; }
  else {
    verbSelected.clear();
    shuffle(GRAMMAR.verbs).slice(0, getRandomPickSize(GRAMMAR.verbs.length)).forEach(v => verbSelected.add(v.inf));
    verbRandomActive = true;
  }
  buildVerbTileGrid();
  syncVerbControls();
}
function syncVerbControls() {
  const total = GRAMMAR.verbs.length, n = verbSelected.size;
  const tenses = currentVerbTenses();
  const btn = document.getElementById('verb-drill-btn');
  if (btn) {
    btn.disabled = !n;
    const forms = Math.min(20, verbCells(GRAMMAR.verbs.filter(v => verbSelected.has(v.inf)), tenses).length);
    btn.textContent = n ? tx('verbs.drillN', { forms, n }) : tx('verbs.pickSome');
  }
  const allSelected = n === total && !verbRandomActive;
  const all = document.getElementById('verb-select-all-label');
  if (all) all.textContent = allSelected ? tx('tiles.deselectAll') : tx('tiles.selectAll');
  const allCard = document.getElementById('verb-select-all-card');
  if (allCard) allCard.classList.toggle('selected', allSelected);
  const pick = getRandomPickSize(total);
  const rCard = document.getElementById('verb-random-card');
  if (rCard) { rCard.style.display = pick ? 'flex' : 'none'; rCard.classList.toggle('selected', verbRandomActive); }
  const rLabel = document.getElementById('verb-random-label');
  if (rLabel) rLabel.textContent = verbRandomActive ? tx('tiles.deselectAll') : tx('tiles.randomN', { n: pick });
  const cells = verbCells(GRAMMAR.verbs, tenses);
  setupCatBar(document.getElementById('verb-all-swatch'), getCategoryBandCounts(cells));
  const cnt = document.getElementById('verb-all-count');
  if (cnt) cnt.textContent = tx('verbs.count', { n: total, forms: cells.length.toLocaleString(tx('dates.locale')) });
  const typeCard = document.getElementById('verb-type-card');
  if (typeCard) {
    typeCard.classList.toggle('selected', !!appSettings.grammarType);
    typeCard.classList.toggle('disabled', !!appSettings.grammarSay);
  }
  const sayCard = document.getElementById('verb-say-card');
  if (sayCard) sayCard.classList.toggle('selected', !!appSettings.grammarSay);
  const sub = document.getElementById('verb-selection-sub');
  if (sub) sub.textContent = tx('verbs.help');
}
function toggleSelectAllVerbs() {
  if (verbSelected.size === GRAMMAR.verbs.length && !verbRandomActive) verbSelected.clear();
  else GRAMMAR.verbs.forEach(v => verbSelected.add(v.inf));
  verbRandomActive = false;
  buildVerbTileGrid();
  syncVerbControls();
}
function toggleGrammarSay() {
  appSettings.grammarSay = !appSettings.grammarSay;
  saveSettings();
  syncVerbControls();
  syncGrammarControls();
}
function toggleGrammarType() {
  appSettings.grammarType = !appSettings.grammarType;
  saveSettings();
  syncVerbControls();
  syncGrammarControls();
}
function drillSelectedVerbs() {
  const verbs = GRAMMAR.verbs.filter(v => verbSelected.has(v.inf));
  startVerbDrill(verbs, currentVerbTenses(), 'verbs');
}


// The verb and contraction question types (registered with the core,
// see core/questions.js).
registerQuestionType({
  id: 'verb', badge: tx('verbs.title'), scoring: 'item',
  render: (q, ui) => renderGrammarQuestion(q, ui.charDisplay, ui.container, ui.promptEl),
  prompt: (q, charDisplay, promptEl) => {
    charDisplay.style.fontSize = promptFontSize(q.char);
    charDisplay.textContent = q.char;
    promptEl.innerHTML = `<b>${escapeHtmlText(q.tenseLabel)}</b> — “${escapeHtmlText(q.answerEn)}”`;
  },
});
registerQuestionType({
  id: 'contraction', badge: tx('contractions.title'), scoring: 'item',
  render: (q, ui) => renderGrammarQuestion(q, ui.charDisplay, ui.container, ui.promptEl),
  prompt: (q, charDisplay, promptEl) => {
    charDisplay.style.fontSize = q.char.length <= 22 ? '30px' : '24px';
    charDisplay.innerHTML = escapeHtmlText(q.char).replace('___', '<span class="pt-blank">___</span>');
    promptEl.innerHTML = `<b>${escapeHtmlText(q.parts)}</b> — “${escapeHtmlText(q.answerEn)}”`;
  },
  reveal: q => fillContractionBlank(q),
});
