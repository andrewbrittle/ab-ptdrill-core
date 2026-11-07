(window.__BUILD_FILES = window.__BUILD_FILES || {})["pt/numbers.js"] = "2611072109";
// Português Drill - Portuguese: the Números screen - number and time challenges and look-ups
// (the words themselves come from LANG).
// Split out of app.js on 2026-11-07 (refactor step 6); code unchanged.

// =============================================================================
// NUMBERS & TIMES (Portuguese build, 2026-10-11)
// The Japanese build's Numbers section, rebuilt for Portuguese: random numbers
// and times to read (generated fresh every round, so never the same twice),
// plus look-up tools for any number or time. No currency converter.
// =============================================================================
// The Portuguese for numbers (numberToWords, belowThousand, the Brazilian
// teens, Portugal's 10 000 grouping) is in lang/pt.js (2026-11-06).
function pickChallengeNumber() {
  const r = Math.random();
  if (r < 0.25) return Math.floor(Math.random() * 100);           // 0-99: the building blocks
  if (r < 0.55) return Math.floor(Math.random() * 900) + 100;     // 100-999
  if (r < 0.92) return Math.floor(Math.random() * 9000) + 1000;   // years, prices, addresses
  return Math.floor(Math.random() * 90000) + 10000;
}
// Wrong options that differ by one digit (or a nudge), so you have to read
// the whole thing.
function numberDistractors(n) {
  const s = String(n);
  const cands = new Set();
  for (let i = 0; i < s.length && cands.size < 8; i++) {
    const d = +s[i];
    [1, -1, 2].forEach(delta => {
      const nd = d + delta;
      if (nd < 0 || nd > 9 || (i === 0 && nd === 0 && s.length > 1)) return;
      const c = +(s.slice(0, i) + nd + s.slice(i + 1));
      if (c !== n) cands.add(c);
    });
  }
  if (n >= 13 && n <= 19) cands.add(n + 10); // treze / vinte e três…
  while (cands.size < 3) { const c = Math.floor(Math.random() * 100); if (c !== n) cands.add(c); }
  return shuffle([...cands]).slice(0, 3);
}

// ---------- Times ----------
// Everyday style (12-hour, as you'd say it): São duas e dez, É uma menos um
// quarto, ao meio-dia, por volta das três e meia da tarde.
// Timetable style (24-hour, stations and opening hours): às quinze e quarenta.
const TIME_FRAMES = {
  none: { en: '', label: 'it is' },
  at: { en: 'at ', label: 'at' },
  until: { en: 'until ', label: 'until' },
  from: { en: 'from ', label: 'from' },
  around: { en: 'around ', label: 'around' },
};
// The Portuguese for times (timeToWords and its helpers) is in lang/pt.js.
function formatTimeShown(h24, m, frame, style) {
  const mm = String(m).padStart(2, '0');
  let t;
  if (style === 'timetable') t = String(h24).padStart(2, '0') + ':' + mm;
  else {
    const h12 = h24 % 12 || 12;
    t = h12 + ':' + mm + (h24 === 12 && m === 0 ? ' (midday)' : h24 === 0 && m === 0 ? ' (midnight)' : h24 < 12 ? ' am' : ' pm');
  }
  return (TIME_FRAMES[frame].en ? TIME_FRAMES[frame].en : '') + t;
}
function pickTimeMinute() {
  return Math.random() < 0.75 ? [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55][Math.floor(Math.random() * 12)] : Math.floor(Math.random() * 60);
}
function pickTimeFrame() {
  const r = Math.random();
  return r < 0.35 ? 'none' : r < 0.6 ? 'at' : r < 0.75 ? 'around' : r < 0.88 ? 'until' : 'from';
}
function timeDistractors(t) {
  const out = [];
  const seen = new Set([LANG.timeToWords(t.h, t.m, t.frame, t.style)]);
  const add = (h, m, frame) => {
    const s = LANG.timeToWords((h + 24) % 24, (m + 60) % 60, frame, t.style);
    if (!seen.has(s)) { seen.add(s); out.push(s); }
  };
  const tries = shuffle([[t.h + 1, t.m, t.frame], [t.h - 1, t.m, t.frame], [t.h, t.m + 5, t.frame], [t.h, t.m - 5, t.frame],
    [t.h + 12, t.m, t.frame], [t.h, t.m, shuffle(Object.keys(TIME_FRAMES).filter(f => f !== t.frame))[0]]]);
  // Keep one "other frame" option in most rounds - the joins are half the point.
  tries.sort((a, b) => (b[2] !== t.frame) - (a[2] !== t.frame));
  tries.forEach(([h, m, f]) => { if (out.length < 3) add(h, m, f); });
  while (out.length < 3) add(Math.floor(Math.random() * 24), pickTimeMinute(), t.frame);
  return out;
}

// ---------- Questions ----------
function numbersAnswerMode() {
  return appSettings.numbersSay ? 'say' : 'choice';
}
function numberQuestion(n) {
  const words = LANG.numberToWords(n);
  const br = LANG.numberToBrazilian(words);
  return {
    disp: 'number',
    char: LANG.formatNumber(n),
    expect: words,
    alt: [],
    br: br !== words ? br : '',
    answer: words,
    answerEn: String(n),
    promptHtml: tx('numbers.howNumber'),
    options: shuffle([words, ...numberDistractors(n).map(LANG.numberToWords)]).map(f => ({ jp: f })),
    scoreKey: 'numbers-consistency',
    groupKey: 'numbers',
    speakAs: words,
    note: '',
    answerMode: numbersAnswerMode(),
  };
}
function timeQuestion(t) {
  const words = LANG.timeToWords(t.h, t.m, t.frame, t.style);
  return {
    disp: 'time',
    char: formatTimeShown(t.h, t.m, t.frame, t.style),
    expect: words,
    alt: [],
    answer: words,
    answerEn: formatTimeShown(t.h, t.m, t.frame, t.style),
    promptHtml: t.style === 'timetable' ? tx('numbers.howTimetable') : tx('numbers.howTime'),
    options: shuffle([words, ...timeDistractors(t)]).map(f => ({ jp: f })),
    scoreKey: 'times-consistency',
    groupKey: 'times',
    speakAs: words,
    note: t.style === 'everyday' && t.m > 30 && t.m % 5 === 0 ? tx('numbers.menosNote') : '',
    answerMode: numbersAnswerMode(),
  };
}
function buildNumberDeck() {
  const nums = new Set();
  while (nums.size < 10) nums.add(pickChallengeNumber());
  return [...nums].map(numberQuestion);
}
function buildTimeDeck() {
  const seen = new Set(), out = [];
  while (out.length < 10) {
    const style = Math.random() < 0.7 ? 'everyday' : 'timetable';
    const t = { h: Math.floor(Math.random() * 24), m: pickTimeMinute(), frame: pickTimeFrame(), style };
    const key = LANG.timeToWords(t.h, t.m, t.frame, t.style);
    if (seen.has(key)) continue;
    seen.add(key); out.push(timeQuestion(t));
  }
  return out;
}
function startNumberChallenge() { lastSettingsScreen = 'numbers'; startDrill(buildNumberDeck(), buildNumberDeck); }
function startTimeChallenge() { lastSettingsScreen = 'numbers'; startDrill(buildTimeDeck(), buildTimeDeck); }

// ---------- Numbers screen ----------
let currentNumbersSection = 'times';
let timeToolFrame = 'none', timeToolStyle = 'everyday';
function showNumbersScreen() {
  setNumbersSection(currentNumbersSection);
  populateTimeToolSelects();
  updateTimeTool();
  updateNumberTool();
  syncNumbersControls();
  showScreen('numbers');
}
function setNumbersSection(section) {
  currentNumbersSection = section;
  ['numbers', 'times'].forEach(key => {
    const el = document.getElementById('numbers-section-' + key);
    if (el) el.style.display = key === section ? 'flex' : 'none';
    const pill = document.getElementById('numbers-section-pill-' + key);
    if (pill) pill.classList.toggle('active', key === section);
  });
}
function setSingleScoreBar(id, entry) {
  const bar = document.getElementById(id);
  if (!bar) return;
  const band = confidenceBand(displayScore(entry));
  const counts = { untested: band ? 0 : 1, neg3: 0, neg2: 0, neg1: 0, neutral: 0, pos1: 0, pos2: 0, pos3: 0, pos4: 0 };
  if (band) counts[band] = 1;
  renderCategoryBar(bar, counts, true);
}
function updateNumberTimeSwatches() {
  setSingleScoreBar('numbers-score-swatch', kanaScores['numbers-consistency']);
  setSingleScoreBar('times-score-swatch', kanaScores['times-consistency']);
}
function syncNumbersControls() {
  updateNumberTimeSwatches();
  ['numbers-say-card', 'numbers-say-card-2'].forEach(id => {
    const say = document.getElementById(id);
    if (say) say.classList.toggle('selected', !!appSettings.numbersSay);
  });
}
function toggleNumbersSay() {
  appSettings.numbersSay = !appSettings.numbersSay;
  saveSettings();
  syncNumbersControls();
}
function updateNumberTool() {
  const input = document.getElementById('number-tool-input');
  const output = document.getElementById('number-tool-output');
  if (!input || !output) return;
  const raw = input.value;
  if (raw === '') { output.innerHTML = ''; return; }
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 0 || n > 999999) { output.innerHTML = `<span class="tool-sub">${tx('numbers.enterRange')}</span>`; return; }
  const words = LANG.numberToWords(n), br = LANG.numberToBrazilian(words);
  output.innerHTML = `<span class="tool-pt" data-say="${escapeHtmlText(words)}">${escapeHtmlText(words)}</span>` +
    (br !== words ? `<span class="tool-sub">${tx('tiles.brazil', { w: escapeHtmlText(br) })}</span>` : '');
  output.querySelector('.tool-pt').onclick = e => speakTarget(e.currentTarget.dataset.say);
}
function populateTimeToolSelects() {
  const hourSel = document.getElementById('time-tool-hour');
  const minSel = document.getElementById('time-tool-minute');
  if (!hourSel || !minSel || hourSel.options.length) return;
  for (let h = 0; h < 24; h++) hourSel.add(new Option(String(h).padStart(2, '0'), String(h)));
  for (let m = 0; m < 60; m++) minSel.add(new Option(String(m).padStart(2, '0'), String(m)));
  resetTimeToolToNow();
}
function resetTimeToolToNow() {
  const now = new Date();
  const hourSel = document.getElementById('time-tool-hour');
  const minSel = document.getElementById('time-tool-minute');
  if (!hourSel || !minSel) return;
  hourSel.value = String(now.getHours());
  minSel.value = String(now.getMinutes());
  timeToolFrame = 'none';
  updateTimeTool();
}
function setTimeToolFrame(f) { timeToolFrame = timeToolFrame === f ? 'none' : f; updateTimeTool(); }
function setTimeToolStyle(s) { timeToolStyle = s; updateTimeTool(); }
function updateTimeTool() {
  const hourSel = document.getElementById('time-tool-hour');
  const minSel = document.getElementById('time-tool-minute');
  const output = document.getElementById('time-tool-output');
  if (!hourSel || !minSel || !output || !hourSel.options.length) return;
  Object.keys(TIME_FRAMES).forEach(f => {
    const b = document.getElementById('time-tool-frame-' + f);
    if (b) b.classList.toggle('active', timeToolFrame === f);
  });
  ['everyday', 'timetable'].forEach(s => {
    const b = document.getElementById('time-tool-style-' + s);
    if (b) b.classList.toggle('active', timeToolStyle === s);
  });
  const h = +hourSel.value, m = +minSel.value;
  const words = LANG.timeToWords(h, m, timeToolFrame, timeToolStyle);
  output.innerHTML = `<span class="tool-pt" data-say="${escapeHtmlText(words)}">${escapeHtmlText(words)}</span><span class="tool-sub">${escapeHtmlText(formatTimeShown(h, m, timeToolFrame, timeToolStyle))}</span>`;
  output.querySelector('.tool-pt').onclick = e => speakTarget(e.currentTarget.dataset.say);
}
