(window.__BUILD_FILES = window.__BUILD_FILES || {})["pt/grammar-screen.js"] = "2611072154";
// Português Drill - Portuguese: the Gramática screen, grammar notes and the Tables pages.
// Split out of app.js on 2026-11-07 (refactor step 6); code unchanged.

// ---------- Grammar screen + note / table screen ----------
let grammarNoteBack = 'grammar';
// ==== TABLES (2026-11-05, from the Japanese app's Tables section) ====
// The small pattern tables you want at a glance, gathered at the bottom of
// the Grammar page. Verb, number and time tables are built by the app's own
// engines (so they always match the drills); the rest are written out here.
function ptTables() {
  const P = ['eu', 'tu', 'ele / ela', 'nós', 'eles / elas'];
  const verbTable = (tenses, verbs) => {
    let h = '';
    tenses.forEach(([t, label]) => {
      h += `<p><b>${label}</b></p><table class="gtable"><tr><th></th>${verbs.map(v => `<th>${v}</th>`).join('')}</tr>`;
      P.forEach((who, p) => { h += `<tr><td>${who}</td>${verbs.map(v => `<td>${escapeHtmlText(vForm(v, t, p))}</td>`).join('')}</tr>`; });
      h += '</table>';
    });
    return h;
  };
  const art = ['o', 'a', 'os', 'as', 'um', 'uma'];
  let contr = `<table class="gtable"><tr><th></th>${art.map(a => `<th>${a}</th>`).join('')}</tr>`;
  ['a', 'de', 'em', 'por'].forEach(prep => { contr += `<tr><td><b>${prep}</b></td>${art.map(a => `<td>${PT_PREP_JOIN[prep][a]}</td>`).join('')}</tr>`; });
  contr += '</table><p><i>Vou <b>ao</b> mercado · Sou <b>do</b> Porto · Estou <b>na</b> praia · Passo <b>pela</b> ponte.</i> With <b>um / uma</b>, only <b>em</b> joins up in everyday writing (<i>num café, numa rua</i>); <i>de um</i> can be <i>dum</i> in speech.</p>' +
    '<p>The same goes for <b>este / esse / aquele</b> and <b>isto / isso / aquilo</b>: <i>deste, nesta, naquele, daquilo</i> - see "This and that".</p>';
  let nums = '<table class="gtable"><tr><th></th><th></th><th></th><th></th></tr>';
  for (let i = 0; i <= 20; i += 4) {
    nums += '<tr>' + [i, i + 1, i + 2, i + 3].filter(n => n <= 20).map(n => `<td><b>${n}</b> ${LANG.numberToWords(n)}</td>`).join('') + '</tr>';
  }
  nums += '</table><table class="gtable">';
  [30, 40, 50, 60, 70, 80, 90].forEach((n, k, a) => { if (k % 2 === 0) nums += '<tr>' + a.slice(k, k + 2).map(x => `<td><b>${x}</b> ${LANG.numberToWords(x)}</td>`).join('') + '</tr>'; });
  nums += '</table><table class="gtable">';
  [100, 101, 200, 300, 500, 1000, 2000, 2026].forEach((n, k, a) => { if (k % 2 === 0) nums += '<tr>' + a.slice(k, k + 2).map(x => `<td><b>${x}</b> ${LANG.numberToWords(x)}</td>`).join('') + '</tr>'; });
  nums += '</table><p><b>um / uma</b> and <b>dois / duas</b> agree: <i>uma cerveja, duas bicas</i>. 100 on its own is <i>cem</i>; 101 and up use <i>cento</i>.</p>';
  let times = '<table class="gtable"><tr><th></th><th>everyday</th></tr>';
  [[9, 0], [9, 15], [9, 30], [9, 45], [13, 0], [12, 0], [0, 0], [20, 10], [21, 50]].forEach(([h, m]) => {
    times += `<tr><td><b>${formatTimeShown(h, m, 'none', 'everyday')}</b></td><td>${escapeHtmlText(LANG.timeToWords(h, m, 'none', 'everyday'))}</td></tr>`;
  });
  times += '</table><p><b>At</b> a time: <i>à uma</i>, <i>às duas</i>, <i>ao meio-dia</i>. Timetables and announcements use the 24-hour clock: <i>' + escapeHtmlText(LANG.timeToWords(21, 50, 'none', 'timetable')) + '</i>.</p>';
  return [
    { id: 'tbl-endings', title: 'Verb endings: -ar, -er, -ir', html: '<p>Regular verbs, built by the app\'s own verb engine. Going to = <i>vou falar</i>; right now = <i>estou a falar</i>.</p>' + verbTable([['pres', 'Present - I speak, I eat'], ['pret', 'Past - I spoke, I ate'], ['imp', 'Was / used to - I used to speak']], ['falar', 'comer', 'abrir']) },
    { id: 'tbl-irregular', title: 'The irregular verbs that matter most', html: '<p>Present, then past.</p>' + verbTable([['pres', 'Present']], ['ser', 'estar', 'ter', 'ir']) + verbTable([['pres', 'Present']], ['fazer', 'poder', 'querer', 'ver']) + verbTable([['pret', 'Past']], ['ir', 'estar', 'ter', 'fazer']) + '<p><b>ser</b> has the same past as <b>ir</b>: <i>fui</i> is both "I was" and "I went".</p>' },
    { id: 'tbl-contractions', title: 'a, de, em, por + the', html: contr },
    { id: 'tbl-ser-estar', title: 'ser and estar side by side', html: verbTable([['pres', 'Present'], ['imp', 'Was (describing) - era / estava']], ['ser', 'estar']) +
      '<table class="gtable"><tr><th>ser - what it is</th><th>estar - how it is now</th></tr>' +
      '<tr><td>who or what: <i>sou inglês, é médica</i></td><td>feelings, states: <i>estou cansado</i></td></tr>' +
      '<tr><td>what it\'s like: <i>o hotel é grande</i></td><td>right now: <i>o café está frio</i></td></tr>' +
      '<tr><td>time, dates: <i>são três horas</i></td><td>the weather: <i>está sol, está frio</i></td></tr>' +
      '<tr><td>where events take place: <i>o jantar é aqui</i></td><td>where things and people are: <i>estou no hotel</i></td></tr></table>' +
      '<p>Where a building is (permanent) is usually <b>ficar</b>: <i>Onde fica a estação?</i></p>' },
    { id: 'tbl-possessives', title: 'my, your, his, our…', html:
      '<table class="gtable"><tr><th></th><th>o …</th><th>a …</th><th>os …</th><th>as …</th></tr>' +
      '<tr><td>my</td><td>o meu</td><td>a minha</td><td>os meus</td><td>as minhas</td></tr>' +
      '<tr><td>your (tu)</td><td>o teu</td><td>a tua</td><td>os teus</td><td>as tuas</td></tr>' +
      '<tr><td>your (polite) / his / her</td><td>o seu</td><td>a sua</td><td>os seus</td><td>as suas</td></tr>' +
      '<tr><td>our</td><td>o nosso</td><td>a nossa</td><td>os nossos</td><td>as nossas</td></tr></table>' +
      '<p>They agree with the <b>thing</b>, not the owner: <i>a minha mãe</i>, <i>o meu pai</i>. For his / her / their, Portugal usually says <b>dele, dela, deles</b> after the noun: <i>o carro dele</i> (his car), <i>a casa dela</i> (her house) - <i>o seu</i> tends to mean "your" (polite).</p>' },
    { id: 'tbl-this-that', title: 'This and that: este, esse, aquele', html:
      '<table class="gtable"><tr><th></th><th>o …</th><th>a …</th><th>os …</th><th>as …</th><th>thing</th></tr>' +
      '<tr><td>this (here)</td><td>este</td><td>esta</td><td>estes</td><td>estas</td><td>isto</td></tr>' +
      '<tr><td>that (near you)</td><td>esse</td><td>essa</td><td>esses</td><td>essas</td><td>isso</td></tr>' +
      '<tr><td>that (over there)</td><td>aquele</td><td>aquela</td><td>aqueles</td><td>aquelas</td><td>aquilo</td></tr></table>' +
      '<p>They join up with <b>de</b> and <b>em</b>: <i>deste, desta, nisto, naquela, daquilo</i>. <i>Queria este, se faz favor</i> (pointing). <i>O que é isto?</i> (what\'s this?)</p>' },
    { id: 'tbl-numbers', title: 'Numbers', html: nums },
    { id: 'tbl-times', title: 'Telling the time', html: times },
  ];
}
function showGrammarScreen() {
  const list = document.getElementById('grammar-note-list');
  if (list) {
    list.innerHTML = '';
    GRAMMAR.notes.forEach(n => {
      const card = document.createElement('div');
      card.className = 'vocab-ref-card';
      card.innerHTML = `<span>${escapeHtmlText(n.title)}</span><span class="vocab-ref-arrow">→</span>`;
      card.onclick = () => showGrammarNote(n.id);
      list.appendChild(card);
    });
  }
  const tlist = document.getElementById('grammar-table-list');
  if (tlist) {
    tlist.innerHTML = '';
    ptTables().forEach(n => {
      const card = document.createElement('div');
      card.className = 'vocab-ref-card';
      card.innerHTML = `<span>${escapeHtmlText(n.title)}</span><span class="vocab-ref-arrow">→</span>`;
      card.onclick = () => showGrammarNote(n.id);
      tlist.appendChild(card);
    });
  }
  setupCatBar(document.getElementById('contraction-swatch'), getCategoryBandCounts(GRAMMAR.contractions.map(contractionItem)));
  syncGrammarControls();
  showScreen('grammar');
}
function syncGrammarControls() {
  const typeCard = document.getElementById('grammar-type-card');
  if (typeCard) {
    typeCard.classList.toggle('selected', !!appSettings.grammarType);
    typeCard.classList.toggle('disabled', !!appSettings.grammarSay);
  }
  const sayCard = document.getElementById('grammar-say-card');
  if (sayCard) sayCard.classList.toggle('selected', !!appSettings.grammarSay);
}
function showGrammarNote(id) {
  const n = GRAMMAR.notes.find(x => x.id === id) || ptTables().find(x => x.id === id);
  if (!n) return;
  grammarNoteBack = 'grammar';
  document.getElementById('grammar-note-title').textContent = n.title;
  document.getElementById('grammar-note-body').innerHTML = n.html;
  const drillBtn = document.getElementById('grammar-note-drill-btn');
  if (n.drill) {
    drillBtn.style.display = '';
    drillBtn.textContent = n.drill.type === 'contractions' ? tx('grammar.drillContractions') : tx('grammar.drillForms');
    drillBtn.onclick = () => {
      if (n.drill.type === 'contractions') startContractionDrill('grammar-note');
      else {
        const verbs = n.drill.verbs ? GRAMMAR.verbs.filter(v => n.drill.verbs.includes(v.inf)) : GRAMMAR.verbs;
        startVerbDrill(verbs, n.drill.tenses, 'grammar-note');
      }
    };
  } else drillBtn.style.display = 'none';
  showScreen('grammar-note');
}
function showVerbTable(inf) {
  const v = VERB_BY_INF[inf];
  if (!v) return;
  grammarNoteBack = 'verbs';
  document.getElementById('grammar-note-title').textContent = v.inf + ' — ' + v.en[0];
  let html = '';
  verbTenses(v).forEach(t => {
    const tense = TENSE_BY_KEY[t];
    html += `<h3 class="gtable-head">${escapeHtmlText(tense.label)} <span>${escapeHtmlText(tense.hint)}</span></h3><table class="gtable">`;
    GRAMMAR.persons.forEach((person, p) => {
      const { form, alt } = conjugate(v, t, p);
      html += `<tr class="gtable-say" data-say="${escapeHtmlText(person.pt.split('/')[0] + ' ' + form)}"><td>${escapeHtmlText(person.pt)}</td><td><b>${escapeHtmlText(form)}</b>${alt.length ? ' / ' + escapeHtmlText(alt.join(' / ')) : ''}</td><td class="gtable-en">${escapeHtmlText(verbEnglish(v, t, p))}</td></tr>`;
    });
    html += '</table>';
    if (v.notes && v.notes[t]) html += `<p class="gtable-note">${escapeHtmlText(v.notes[t])}</p>`;
  });
  const body = document.getElementById('grammar-note-body');
  body.innerHTML = `<p class="gtable-note">${tx('grammar.tapRow')}</p>` + html;
  body.querySelectorAll('.gtable-say').forEach(row => { row.onclick = () => speakTarget(row.dataset.say); });
  const drillBtn = document.getElementById('grammar-note-drill-btn');
  drillBtn.style.display = '';
  drillBtn.textContent = tx('grammar.drillVerb', { verb: v.inf });
  drillBtn.onclick = () => startVerbDrill([v], currentVerbTenses(), 'verbs');
  showScreen('grammar-note');
}
