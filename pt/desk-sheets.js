(window.__BUILD_FILES = window.__BUILD_FILES || {})["pt/desk-sheets.js"] = "2611072109";
// Português Drill - Portuguese: the printable desk sheets.
// Split out of app.js on 2026-11-07 (refactor step 6); code unchanged.

// ==== DESK SHEETS (2026-10-15, from the Japanese app) ====
// Three printable pages: the Portuguese sentence order across the top (one
// colour per slot) and word cards under each slot, so you pick words from the
// sheet and spend your effort on the sentence. Pages 1-2 take their words from
// the sentence generator's lists (grammar.js `sentences`), page 3 from
// `deskSheets`. Each column keeps a few core words plus a random pick of the
// rest, so every sheet differs; Shuffle picks again.
const DS = () => GRAMMAR.deskSheets || {};
const dsI = (pt, en, sub) => ({ pt, en, sub: sub || '' });
function dsPick(pool, anchors, n) {
  const seen = new Set(), out = [];
  const add = x => { if (x && !seen.has(x.pt) && out.length < n) { seen.add(x.pt); out.push(x); } };
  anchors.forEach(a => add(pool.find(p => p && p.pt === a)));
  shuffle(pool.filter(Boolean)).forEach(add);
  return out;
}
// Who, with the verb ending that goes with them (shown on falar).
const DS_WHO_FORMS = ['falo · falei', 'falas · falaste', 'fala · falou', 'falamos · falámos', 'falam · falaram'];
function dsWho() {
  const pool = [dsI('eu', 'I', DS_WHO_FORMS[0]), dsI('tu', 'you (friend)', DS_WHO_FORMS[1]), dsI('nós', 'we', DS_WHO_FORMS[3])];
  SENT.people.filter(p => p.pt).forEach(p => pool.push(dsI(p.pt, p.en, DS_WHO_FORMS[p.p])));
  return { role: 'Who', note: 'The verb ending says who, so eu and nós are usually left out. Endings shown on falar (now · past).', items: dsPick(pool, ['eu', 'nós', 'tu', 'o meu irmão', 'a minha irmã'], 9) };
}
// When, grouped by tense - so the time word and the verb form match.
function dsWhen() {
  const T = SENT.times;
  const g = (label, list, anchors, n) => ({ head: label, items: dsPick(list.map(t => dsI(sLowerStart(t.pt), t.en)), anchors, n) });
  return { role: 'When', note: 'Start or end the sentence with it. Pick the verb form to match the group.', wide: true, groups: [
    g('Habits → como, vou', T.hab, ['todos os dias', 'ao fim de semana'], 6),
    g('Plans → vou comer, vou', T.fut, ['amanhã', 'logo à noite'], 6),
    g('Done → comi, fui', T.past, ['ontem', 'na semana passada'], 6)] };
}
function dsWith() {
  const items = [dsI('sozinho / sozinha', 'on my own')].concat(dsPick(SENT.companions.map(c => dsI(c.pt, c.en)), ['com uns amigos'], 6));
  return { role: 'With whom', note: 'sozinha for a woman', items };
}
// A verb heading with its everyday forms: eu now · ele now · eu past.
function dsVerbHead(inf, en) {
  const f = (t, p) => vForm(inf, t, p);
  return { pt: inf, en, forms: [f('pres', 0), f('pres', 2), f('pret', 0)].join(' · ') };
}
function dsColumnsDo() {
  const often = { role: 'How often', note: 'nunca and raramente go before the verb: nunca bebo café', items: (DS().often || []).map(([pt, en]) => dsI(pt, en)) };
  const PLAN = [['comer', 4], ['beber', 2], ['ver', 2], ['ler', 2], ['fazer', 2], ['comprar', 2], ['tomar', 2], ['ouvir', 2]];
  const groups = [];
  PLAN.forEach(([v, k]) => {
    const act = SENT.activities.find(a => a.verb === v);
    if (!act) return;
    const items = dsPick(act.objs.map(o => dsI(o[0], o[1])), [], k);
    const en = act.en ? act.en[0] : 'do / make';
    groups.push({ verbHead: dsVerbHead(v, en), items });
  });
  const what = { role: 'Verb + what', note: 'Each thing sits under its verb. Forms: I · he/she · I (past). Plans: vou + the verb.', wide: true, groups };
  const placeKeys = Object.keys(SENT.places);
  const where = { role: 'Where', note: 'em + o = no, em + a = na', items: dsPick(placeKeys.map(k => { const pl = SENT.places[k]; return dsI(ptPrepJoin('em', pl), pl.en); }), ['em casa', 'no café', 'no restaurante'], 9) };
  return [dsWho(), often, what, where, dsWith(), dsWhen()];
}
function dsColumnsGo() {
  const go = { role: 'Go: ir', note: 'Plans use the present: vou amanhã. Vou + verb = going to (vou comer).', verbCards: [
    dsI('vou', 'I go / am going'), dsI('vais', 'you go'), dsI('vai', 'he / she goes'), dsI('vamos', 'we go'), dsI('vão', 'they go'),
    dsI('fui', 'I went'), dsI('foste', 'you went'), dsI('foi', 'he / she went'), dsI('fomos', 'we went'), dsI('foram', 'they went')] };
  const whereTo = { role: 'Where to', note: 'a + o = ao, a + a = à, a + os = aos. Most cities: just a (a Lisboa).', wide: true,
    items: dsPick(SENT.destinations.map(d => dsI(ptPrepJoin('a', d), d.en)), ['ao trabalho', 'à praia', 'ao mercado', 'ao Porto', 'a Lisboa', 'ao museu', 'ao cinema', 'ao supermercado'], 22) };
  const how = { role: 'How', note: 'de + transport, no article. But: a pé', items: SENT.transport.map(t => dsI(t.pt, t.en)) };
  return [dsWho(), go, whereTo, how, dsWith(), dsWhen()];
}
function dsColumnsOut() {
  const D = DS();
  const frames = { role: 'Ask for it', note: 'Then a word from column 2, and se faz favor', verbCards: (D.frames || []).map(([pt, en]) => dsI(pt, en)) };
  const order = { role: 'Food & drink', note: 'um / uma = a; uns / umas = some', wide: true,
    groups: Object.entries(D.order || {}).map(([head, list]) => ({ head, items: dsPick(list.map(([pt, en]) => dsI(pt, en)), [], 8) })) };
  const where = { role: 'Onde fica…?', note: 'Where is…? The answer often starts Fica…', items: dsPick((D.where || []).map(([pt, en]) => dsI(pt, en)), ['a estação', 'a casa de banho', 'o multibanco'], 11) };
  const cost = { role: 'Quanto custa…?', note: 'custam for more than one: Quanto custam os postais?', items: dsPick((D.cost || []).map(([pt, en]) => dsI(pt, en)), ['isto', 'o bilhete'], 10) };
  const polite = { role: 'To finish', note: 'obrigada if you\'re a woman', items: (D.polite || []).map(([pt, en]) => dsI(pt, en)) };
  const hear = { role: "What you'll hear", note: 'Listen for these - they come back at you', wide: true, items: dsPick((D.hear || []).map(([pt, en]) => dsI(pt, en)), [], 14) };
  return [frames, order, where, cost, polite, hear];
}
function dsCardHtml(it, extraClass) {
  const len = it.pt.length;
  const size = len >= 20 ? ' xlong' : len >= 14 ? ' long' : '';
  return `<div class="ds-card${extraClass ? ' ' + extraClass : ''}"><div class="ds-pt${size}">${escapeHtmlText(it.pt)}</div>` +
    (it.sub ? `<div class="ds-sub">${escapeHtmlText(it.sub)}</div>` : '') + `<div class="ds-en">${escapeHtmlText(it.en)}</div></div>`;
}
function buildDeskSheets() {
  const el = document.getElementById('desk-sheets');
  if (!el || !SENT) return;
  const pages = [
    { cols: dsColumnsDo(), title: 'Doing something', sub: 'who · how often · verb + what · where · with whom · when', ex: 'A Ana às vezes bebe um café na esplanada com uns amigos ao fim de semana.' },
    { cols: dsColumnsGo(), title: 'Going somewhere', sub: 'who · ir · where to · how · with whom · when', ex: 'Vou ao Porto de comboio com a minha irmã no sábado.' },
    { cols: dsColumnsOut(), title: 'Out and about', sub: 'café, restaurant, shops, finding your way', ex: 'Queria uma bica e um pastel de nata, se faz favor.' },
  ];
  el.innerHTML = pages.map(p => {
    const colHtml = p.cols.map((c, i) => {
      const head = `<div class="ds-head"><div class="ds-head-top"><span class="ds-num">${i + 1}</span><span class="ds-role">${escapeHtmlText(c.role)}</span></div></div>`;
      const note = c.note ? `<div class="ds-note">${escapeHtmlText(c.note)}</div>` : '';
      let body = '';
      if (c.groups) body = c.groups.map(g => (g.verbHead
        ? `<div class="ds-group-head"><span class="ds-pt">${escapeHtmlText(g.verbHead.pt)}</span> <span class="ds-en">${escapeHtmlText(g.verbHead.en)}</span> <span class="ds-forms">— ${escapeHtmlText(g.verbHead.forms)}</span></div>`
        : `<div class="ds-group-head"><span class="ds-pt">${escapeHtmlText(g.head)}</span></div>`) + g.items.map(x => dsCardHtml(x)).join('')).join('');
      else if (c.verbCards) body = c.verbCards.map(x => dsCardHtml(x, 'ds-verb')).join('');
      else body = c.items.map(x => dsCardHtml(x)).join('');
      return `<div class="ds-col${c.wide ? ' wide' : ''}" style="--slot:var(--slot-${i + 1})">${head}${note}${body}</div>`;
    }).join('');
    return `<div class="ds-page"><div class="ds-page-title">${p.title}<span>${p.sub}</span><span class="ds-example">e.g. ${escapeHtmlText(p.ex)}</span></div><div class="ds-cols">${colHtml}</div></div>`;
  }).join('');
}
function showDeskSheets() {
  buildDeskSheets();
  showScreen('desk-sheets');
  window.scrollTo(0, 0);
}
