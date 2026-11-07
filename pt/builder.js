(window.__BUILD_FILES = window.__BUILD_FILES || {})["pt/builder.js"] = "2611070919";
// Português Drill - Portuguese: the sentence builder's modes - Doing, Going,
// Being, Giving - and the Portuguese rules behind them: the cards, verb
// forms and agreement, word order (já before the verb), the English, the
// teacher's notes, and the challenges. The mechanics (picking, Check, one
// more go, part scores) are in core/builder.js (refactor step 7, 2026-11-07).

// ==== SENTENCE BUILDER + CHALLENGES (2026-10-24, from the Japanese app) ====
// Principles carried over (see HANDOVER-sentence-builder.md): words stick in
// sentences, not lists; producing is its own skill, so building is
// low-pressure (pick a card per column); scores are kept per PART of the
// sentence, at the first check only, and never touch the word greens.
// Portuguese twist: the verb changes for person and tense, so once a verb is
// picked its column offers forms - for the person in Who and one easily
// mixed up with it - and choosing the right one is the test. In Being, the
// describing word offers its agreeing forms the same way.
// Modes: do (who · verb · what · where · with whom · when), go (who · ir ·
// where to · how · with whom · when), being (who/what · ser or estar ·
// describing word). Reading challenge (do / go): a Portuguese sentence, and
// you pick the English for each part.
const SB_PERSON_EN = ['I', 'you', 'he / she', 'we', 'they'];
const SB_PERSON_LABEL = ['eu', 'tu', 'ele / ela', 'nós', 'eles / elas'];
const SB_DECOY = [2, 2, 0, 4, 3];       // the person each is most often mixed up with
const SB_DECOY_BEING = [3, 2, 4, 0, 2]; // in Being: singular <-> plural
const SB_TENSE_FROM_GROUP = { hab: 'pres', fut: 'fut', past: 'pret' };
const SB_MODES = {
  do: { label: tx('sb.doing'), slots: [['who', tx('part.who')], ['verb', tx('part.verb')], ['what', tx('part.what')], ['where', tx('part.where')], ['with', tx('part.with')], ['when', tx('part.when')]] },
  go: { label: tx('sb.going'), slots: [['who', tx('part.who')], ['verb', tx('part.goIr')], ['whereTo', tx('part.whereTo')], ['how', tx('part.how')], ['with', tx('part.with')], ['when', tx('part.when')]] },
  being: { label: tx('sb.being'), slots: [['who', tx('part.whoWhat')], ['verb', tx('part.serEstarLower')], ['adj', tx('part.adj')]] },
  give: { label: tx('sb.giving'), slots: [['who', tx('part.who')], ['verb', tx('part.verb')], ['what', tx('part.what')], ['toWhom', tx('part.toWhom')], ['when', tx('part.when')]] },
};
// Already / not yet (2026-11-05, from the Japanese app's もう / まだ): já and
// ainda não sit in the When column but go BEFORE the verb, with the past:
// Já comi. / Ainda não fui ao Porto. English: "I've already eaten" /
// "I haven't been to Porto yet".
const SB_JA_CARDS = [{ pt: 'já', en: 'already', group: 'ja' }, { pt: 'ainda não', en: 'not yet', group: 'ja' }];
const EN_PP = { eat: 'eaten', drink: 'drunk', see: 'seen', read: 'read', buy: 'bought', do: 'done', make: 'made', write: 'written', give: 'given', send: 'sent', lend: 'lent', show: 'shown', take: 'taken', have: 'had', go: 'been', get: 'got', go_for: 'been for' };
function enPP(forms) {
  const words = forms[0].split(' ');
  if (words[0] === 'go' && words[1] === 'for') return ['been for'].concat(words.slice(2)).join(' ');
  if (EN_PP[words[0]]) return [EN_PP[words[0]]].concat(words.slice(1)).join(' ');
  return forms[2];
}
// Recipients for Giving: family and friends (a + o = ao…), plus a few
// people in shops and on trains for the things you ask them for or show them.
function sbRecipients() {
  const out = [];
  SENT.people.filter(x => x.pt && x.kind !== 'me' && x.kind !== 'we').forEach(x => {
    const [art, ...rest] = x.pt.split(' ');
    out.push({ pt: ptPrepJoin('a', { art, pt: rest.join(' ') }), en: x.en, base: x.pt, kind: 'people' });
  });
  (SENT.serviceRecipients || []).forEach(([pt, en]) => {
    const [art, ...rest] = pt.split(' ');
    out.push({ pt: ptPrepJoin('a', { art, pt: rest.join(' ') }), en, base: pt, kind: 'service' });
  });
  return out;
}

// --- cards ---------------------------------------------------------------
function sbWhoPool() {
  const pool = [{ pt: 'eu', en: 'I', p: 0, g: 'm', kind: 'me' }, { pt: 'tu', en: 'you', p: 1, g: 'm' }, { pt: 'nós', en: 'we', p: 3, g: 'm', kind: 'we' }];
  SENT.people.filter(x => x.pt).forEach(x => pool.push({ pt: x.pt, en: x.en, p: x.p, g: x.g, kind: x.kind }));
  return pool;
}
function sbWhoCard(subj) {
  if (subj.kind === 'me') return sbWhoPool()[0];
  if (subj.kind === 'we') return sbWhoPool()[2];
  return sbWhoPool().find(c => c.pt === subj.pt);
}
const sbVerbCard = act => ({ pt: act.verb, en: (act.en ? act.en[0] : 'do / make'), act });
const sbGiveCard = g => ({ pt: g.verb, en: g.en[0], act: g });
const SB_IR = { pt: 'ir', en: 'go', act: { verb: 'ir', en: ['go', 'goes', 'went', 'going'], objs: [] } };
const sbWhatCard = o => ({ pt: o[0], en: o[1], forms: Array.isArray(o[2]) ? o[2] : null });
const sbPlaceCard = pl => ({ pt: ptPrepJoin('em', pl), en: pl.en });
const sbDestCard = d => ({ pt: ptPrepJoin('a', d), en: d.en });
const sbHowCard = t => ({ pt: t.pt, en: t.en });
const sbWhenCard = (t, group) => ({ pt: sLowerStart(t.pt), en: t.en, group });
function sbWithPool() {
  return [{ pt: 'sozinho', en: 'alone', g: 'm' }, { pt: 'sozinha', en: 'alone', g: 'f' }].concat(SENT.companions.map(c => ({ pt: c.pt, en: c.en })));
}
const sbFormAmbiguous = (inf, p) => inf !== 'ir' && vForm(inf, 'pres', p) === vForm(inf, 'pret', p);
function sbFormText(inf, tense, p) {
  if (tense === 'fut') return vForm('ir', 'pres', p) + ' ' + inf;
  return vForm(inf, tense, p);
}
// Forms offered for a verb: the person in Who (eu if it's empty - Portuguese
// often leaves it out) and the one most often mixed up with it. Pairs swap
// places by verb so position gives nothing away. ir has no going-to form
// here: plans use the present (vou amanhã).
function sbFormsFor(inf, p) {
  const q = SB_DECOY[p], flip = (inf.length + p) % 2;
  const out = [];
  (inf === 'ir' ? ['pres', 'pret'] : ['pres', 'pret', 'fut']).forEach(t => {
    const pair = [{ pt: sbFormText(inf, t, p), tense: t, p }, { pt: sbFormText(inf, t, q), tense: t, p: q }];
    (flip ? pair.reverse() : pair).forEach(f => { if (!out.some(o => o.pt === f.pt)) out.push(f); });
  });
  return out;
}
// Being: subjects are people or things; describing words agree with them.
const SB_ADJ_INVARIABLE = /\s/; // com fome
function sbAgree(adj, g, pl) {
  if (SB_ADJ_INVARIABLE.test(adj)) return adj;
  const nat = { 'português': 'portugues', 'inglês': 'ingles', 'escocês': 'escoces' }[adj];
  if (nat) return pl ? nat + (g === 'f' ? 'as' : 'es') : (g === 'f' ? nat + 'a' : adj);
  return ptAgree(adj, g, pl);
}
function sbBeingSubjects() {
  const people = sbWhoPool().map(c => ({ ...c, pl: c.p === 3 || c.p === 4 }));
  const things = [];
  SENT.describe.forEach(ctx => ctx.items.forEach(it => {
    if (!things.some(t => t.pt === ptArticle(it))) things.push({ pt: ptArticle(it), en: it.en, g: nounGender(it), pl: nounPlural(it), p: nounPlural(it) ? 4 : 2, thing: true, adj: it.adj });
  }));
  return { people, things };
}
function sbAdjCardsFor(subj) {
  if (!subj) return [];
  if (subj.thing) return subj.adj.map(a => ({ pt: a[0], en: a[1], be: a[2] }));
  const cards = SENT.beingPeople.map(a => ({ pt: a[0], en: a[1], be: a[2] }));
  if (!subj.pl) SENT.jobs.forEach(j => cards.push({ pt: j.m, en: j.en, enF: j.enF, be: 'ser', job: j }));
  return cards;
}
function sbAdjForm(adj, g, pl) {
  if (adj.job) return g === 'f' ? adj.job.f : adj.job.m;
  return sbAgree(adj.pt, g, pl);
}
function sbAdjFormsFor(adj) {
  const raw = adj.job ? [['m', false], ['f', false]] : [['m', false], ['f', false], ['m', true], ['f', true]];
  const out = [];
  raw.forEach(([g, pl]) => { const pt = sbAdjForm(adj, g, pl); if (!out.some(o => o.pt === pt)) out.push({ pt, g, pl }); });
  return out;
}
const SB_BE_CARDS = [{ pt: 'ser', en: 'be - what it\'s like' }, { pt: 'estar', en: 'be - how it is now' }];
function sbBeFormsFor(p) {
  const q = SB_DECOY_BEING[p];
  return [['ser', p], ['estar', p], ['ser', q], ['estar', q]].map(([v, pp]) => ({ pt: vForm(v, 'pres', pp), tense: 'pres', p: pp, verb: v }));
}

// --- the sentence, in Portuguese and English ------------------------------
function sbPersonOf(sel) {
  if (sel.who) return sel.who.p;
  return sel.form ? sel.form.p : 0;
}
const sbBe = p => p === 0 ? 'am' : p === 2 ? 'is' : 'are';
// English verb: tense from the form, except where the time decides it
// (comemos = we eat / we ate; vou + a plan = I'm going).
function sbVerbEn(sel, p) {
  if (sbMode === 'go') {
    const f = sel.form;
    if (!f) return '(go)';
    if (f.tense === 'pret') return 'went';
    if (sel.when && sel.when.group === 'fut') return sbBe(p) + ' going';
    return p === 2 ? 'goes' : 'go';
  }
  const forms = (sel.what && sel.what.forms) || (sel.verb && sel.verb.act.en) || ['do', 'does', 'did', 'doing'];
  const f = sel.form;
  if (!f) return '(' + forms[0] + ')';
  let tense = f.tense;
  if (tense !== 'fut' && sbFormAmbiguous(sel.verb.pt, f.p)) tense = sel.when && (sel.when.group === 'past' || sel.when.group === 'ja') ? 'pret' : 'pres';
  if (tense === 'pret') return forms[2];
  if (tense === 'pres') return p === 2 ? forms[1] : forms[0];
  return sbBe(p) + ' going to ' + forms[0];
}
// [{slot, id, pt}] in sentence order - the chosen form stands in for the verb
// (and for the describing word in Being).
function sbChunks(sel) {
  const out = [];
  const ja = sel.when && sel.when.group === 'ja';
  sbSlots().forEach(({ id }, slot) => {
    if (id === 'when' && ja) return;
    if (id === 'verb') {
      if (ja) out.push({ slot: sbSlotIdx('when'), id: 'when', pt: sel.when.pt });
      if (sel.form) out.push({ slot, id, pt: sel.form.pt });
      else if (sel.verb && sbMode !== 'go') out.push({ slot, id, pt: sel.verb.pt, verbOnly: true });
      return;
    }
    if (id === 'adj') {
      if (sel.agree) out.push({ slot, id, pt: sel.agree.pt });
      else if (sel.adj) out.push({ slot, id, pt: sel.adj.pt, verbOnly: true });
      return;
    }
    if (sel[id]) out.push({ slot, id, pt: sel[id].pt });
  });
  return out;
}
function sbPtOf(sel) {
  const t = sbChunks(sel).map(c => c.pt).join(' ');
  return t ? sCap(t) + '.' : '';
}
function sbEnOf(sel) {
  if (!Object.keys(sel).some(k => sel[k])) return '';
  const p = sbPersonOf(sel);
  if (sbMode === 'being') {
    const subj = sel.who ? sel.who.en : '';
    const adjEn = sel.adj ? (sel.adj.job ? ((sel.who && sel.who.g === 'f' && sel.adj.enF) || sel.adj.en) : sel.adj.en) : '';
    return enTidy(sCap([subj, (sel.verb || sel.form || sel.adj) ? sbBe(p) : '', adjEn].filter(Boolean).join(' '))) + '.';
  }
  const subj = sel.who ? sel.who.en : (sel.form ? SB_PERSON_EN[p] : '');
  const hasVerb = sel.verb || sel.form;
  // sozinho / sozinha: "on my own", "on her own"…
  const ownEn = { 0: 'my', 1: 'your', 3: 'our', 4: 'their' }[p] || (sel.who && sel.who.g === 'f' ? 'her' : 'his');
  const withEn = sel.with && (/^sozinh/.test(sel.with.pt) ? `on ${ownEn} own` : sel.with.en);
  const ja = sel.when && sel.when.group === 'ja';
  let verbEn = hasVerb ? sbVerbEn(sel, p) : '';
  if (ja && hasVerb && sel.form) {
    const forms = sbMode === 'go' ? ['go', 'goes', 'went'] : ((sel.what && sel.what.forms) || (sel.verb && sel.verb.act.en) || ['do', 'does', 'did']);
    const have = p === 2 ? 'has' : 'have';
    verbEn = sel.when.pt === 'já' ? `${have} already ${enPP(forms)}` : `${have}n't ${enPP(forms)}`;
  }
  const whenEn = sel.when && !ja ? sel.when.en : '';
  const yet = ja && sel.when.pt !== 'já' ? 'yet' : '';
  let parts;
  if (sbMode === 'go') parts = [subj, verbEn, sel.whereTo && 'to ' + sel.whereTo.en, sel.how && sel.how.en, withEn, whenEn, yet];
  else if (sbMode === 'give') {
    const to = sel.toWhom && sel.toWhom.en;
    parts = sel.verb && sel.verb.act.askFor
      ? [subj, verbEn, to, sel.what && 'for ' + sel.what.en, whenEn, yet]
      : [subj, verbEn, sel.what && sel.what.en, to && 'to ' + to, whenEn, yet];
  } else parts = [subj, verbEn, sel.what && sel.what.en, sel.where && sel.where.en, withEn, whenEn, yet];
  return enTidy(sCap(parts.filter(Boolean).join(' '))) + '.';
}
// Gentle notes in the free builder: what a teacher would point out.
function sbNotes(sel) {
  const notes = [];
  const f = sel.form;
  if (sbMode === 'being') {
    if (sel.adj && sel.verb && sel.adj.be !== sel.verb.pt) notes.push(sel.adj.be === 'estar' ? tx('sbNote.isEstar', { w: sel.adj.pt }) : tx('sbNote.isSer', { w: sel.adj.pt }));
    if (f && sel.who && f.p !== sel.who.p) notes.push(tx('sbNote.wrongPerson', { form: f.pt, person: SB_PERSON_LABEL[f.p], who: sel.who.pt, right: vForm(f.verb, 'pres', sel.who.p) }));
    if (sel.agree && sel.who) { const right = sbAdjForm(sel.adj, sel.who.g, !!sel.who.pl); if (sel.agree.pt !== right) notes.push(`${sel.who.pt} → ${right}`); }
    return notes;
  }
  const inf = sel.verb ? sel.verb.pt : 'ir';
  if (f && sel.who && f.p !== sel.who.p) {
    notes.push(tx('sbNote.wrongPerson', { form: f.pt, person: SB_PERSON_LABEL[f.p], who: sel.who.pt, right: sbFormText(inf, f.tense, sel.who.p) }));
  } else if (f && !sel.who && f.p !== 0 && f.p !== 3) {
    notes.push(tx('sbNote.needsWho', { form: f.pt, person: SB_PERSON_LABEL[f.p] }));
  }
  if (f && sel.when) {
    const amb = f.tense !== 'fut' && sbFormAmbiguous(inf, f.p);
    const p = sbPersonOf(sel), g = sel.when.group;
    if (g === 'ja' && f.tense !== 'pret' && !amb) notes.push(tx('sbNote.jaPast', { when: sel.when.pt, right: sbFormText(inf, 'pret', p) }));
    else if (g === 'ja') { /* fine */ }
    else if (amb && g !== 'fut') { /* comemos: right for now and for the past */ }
    else if (g === 'past' && f.tense !== 'pret') notes.push(tx('sbNote.isPast', { when: sel.when.pt, right: sbFormText(inf, 'pret', p) }));
    else if (g === 'hab' && f.tense !== 'pres') notes.push(tx('sbNote.isHabit', { when: sel.when.pt, right: sbFormText(inf, 'pres', p) }));
    else if (g === 'fut' && f.tense === 'pret') notes.push(tx('sbNote.notYet', { when: sel.when.pt, right: sbFormText(inf, inf === 'ir' ? 'pres' : 'fut', p) }));
  }
  if (sel.with && /^sozinh/.test(sel.with.pt) && sel.who) {
    const fem = sel.who.g === 'f', pl = sel.who.p === 3 || sel.who.p === 4;
    const right = (fem ? 'sozinha' : 'sozinho') + (pl ? 's' : '');
    if (sel.with.pt !== right) notes.push(tx('sbNote.forWho', { who: sel.who.pt, right }));
  }
  return notes;
}

// --- challenges: a sentence from the generator, as cards -----------------
function sbNewTarget() {
  for (let i = 0; i < 40; i++) {
    let sel;
    if (sbMode === 'being') {
      const { people, things } = sbBeingSubjects();
      const who = sChance(0.55) ? sPick(things) : sPick(people.filter(x => x.pt !== 'tu'));
      const adj = sPick(sbAdjCardsFor(who));
      if (!adj) continue;
      sel = { who, verb: SB_BE_CARDS.find(c => c.pt === adj.be), form: { pt: vForm(adj.be, 'pres', who.p), tense: 'pres', p: who.p, verb: adj.be }, adj, agree: { pt: sbAdjForm(adj, who.g, !!who.pl), g: who.g, pl: !!who.pl } };
      return { sel, pt: sbPtOf(sel), en: sbEnOf(sel), whoOptional: false };
    }
    if (sbMode === 'give') {
      const subj = sSubject();
      const who = sbWhoCard(subj);
      if (!who) continue;
      const g = sPick(SENT.giving);
      const o = sPick(g.objs);
      const kind = o[2] || 'people';
      const recips = sbRecipients().filter(r => r.base !== who.pt && (kind === 'any' || r.kind === kind));
      const tGroup = sPick(['hab', 'fut', 'past', 'past']);
      const time = sTime(tGroup, t => !t.long && !(tGroup === 'hab' && /Todos/.test(t.pt)));
      if (!time || !recips.length) continue;
      const tense = SB_TENSE_FROM_GROUP[tGroup];
      sel = { who, verb: sbGiveCard(g), form: { pt: sbFormText(g.verb, tense, who.p), tense, p: who.p }, what: sbWhatCard(o), toWhom: sPick(recips), when: sbWhenCard(time, tGroup) };
    } else if (sbMode === 'go') {
      const m = sMotion();
      if (!m || !m.time) continue;
      const who = sbWhoCard(m.subj);
      if (!who) continue;
      const tense = m.tense === 'past' ? 'pret' : 'pres';
      sel = { who, verb: SB_IR, form: { pt: vForm('ir', tense, who.p), tense, p: who.p }, whereTo: sbDestCard(m.dest), when: sbWhenCard(m.time, m.tense) };
      if (m.tr) sel.how = sbHowCard(m.tr);
      if (m.comp) sel.with = sbWithPool().find(c => c.pt === m.comp.pt) || { pt: m.comp.pt, en: m.comp.en };
    } else {
      const a = sActivity();
      if (!a || !a.time) continue;
      const who = sbWhoCard(a.subj);
      if (!who) continue;
      const tense = SB_TENSE_FROM_GROUP[a.tense];
      sel = { who, verb: sbVerbCard(a.act), form: { pt: sbFormText(a.act.verb, tense, who.p), tense, p: who.p }, what: sbWhatCard(a.obj), when: sbWhenCard(a.time, a.tense) };
      if (a.place) sel.where = sbPlaceCard(a.place);
      if (a.comp) sel.with = sbWithPool().find(c => c.pt === a.comp.pt) || { pt: a.comp.pt, en: a.comp.en };
    }
    // Sometimes it's "already / not yet" instead of a time (past only).
    if (sel.form.tense === 'pret' && sChance(0.25)) sel.when = sChance(0.6) ? SB_JA_CARDS[0] : SB_JA_CARDS[1];
    return { sel, pt: sbPtOf(sel), en: sbEnOf(sel), whoOptional: !sbReverse && (sel.who.p === 0 || sel.who.p === 3) };
  }
  return null;
}
// Columns: a fresh pick of cards, always including the challenge's answer.
function sbBuildColumns() {
  const T = sbTarget && sbTarget.sel;
  const withAns = (list, ans, n) => {
    const pick = shuffle(list).slice(0, n);
    if (ans && !pick.some(c => c.pt === ans.pt)) pick[pick.length - 1] = list.find(c => c.pt === ans.pt) || ans;
    return pick;
  };
  if (sbMode === 'being') {
    const { people, things } = sbBeingSubjects();
    const ans = T && T.who;
    sbCols = { people: withAns(people, ans && !ans.thing ? ans : null, 7), things: withAns(things, ans && ans.thing ? ans : null, 7) };
    return;
  }
  const whoPool = sbWhoPool();
  const tw = T && T.who && (sbReverse || (T.who.p !== 0 && T.who.p !== 3)) ? T.who : null;
  const who = whoPool.slice(0, 3).concat(withAns(whoPool.slice(3), tw && whoPool.indexOf(whoPool.find(c => c.pt === tw.pt)) >= 3 ? tw : null, 6));
  const when = ['hab', 'fut', 'past'].map(g => ({ group: g, items: withAns(SENT.times[g].map(t => sbWhenCard(t, g)), T && T.when.group === g ? T.when : null, 5) }))
    .concat([{ group: 'ja', items: SB_JA_CARDS }]);
  sbCols = {
    who, when, with: sbWithPool(),
    verbs: SENT.activities.map(sbVerbCard), where: Object.values(SENT.places).map(sbPlaceCard),
    whereTo: withAns(SENT.destinations.map(sbDestCard), T && T.whereTo, 14), how: SENT.transport.map(sbHowCard),
    giveVerbs: (SENT.giving || []).map(sbGiveCard), toWhom: withAns(sbRecipients(), T && T.toWhom, 10),
  };
}

const SB_PART_DEFS = [['who', tx('part.who'), 1], ['verb', tx('part.verb'), 2], ['ending', tx('part.ending'), 2], ['serestar', tx('part.serEstar'), 2],
  ['what', tx('part.what'), 3], ['whereTo', tx('part.whereTo'), 3], ['adj', tx('part.adj'), 3], ['agree', tx('part.agree'), 3],
  ['where', tx('part.where'), 4], ['how', tx('part.how'), 4], ['toWhom', tx('part.toWhom'), 4], ['with', tx('part.with'), 5], ['when', tx('part.when'), 6]];

function showBuildPage() {
  sbRefreshPanels();
  renderSentence('grammar-sentence');
  showScreen('build');
}
// Reading: the form buttons show what each form means in English.
function sbFormEnLabel(f) {
  const inf = sbSel.verb ? sbSel.verb.pt : 'ir';
  const forms = sbMode === 'go' ? ['go', 'goes', 'went'] : ((sbSel.verb && sbSel.verb.act.en) || ['do', 'does', 'did']);
  const who = SB_PERSON_EN[f.p];
  if (f.tense !== 'fut' && sbFormAmbiguous(inf, f.p)) return `${who} ${f.p === 2 ? forms[1] : forms[0]} / ${forms[2]}`;
  if (f.tense === 'pret') return `${who} ${forms[2]}`;
  if (f.tense === 'fut') return `${who} ${sbBe(f.p)} going to ${forms[0]}`;
  return `${who} ${f.p === 2 ? forms[1] : forms[0]}` + (sbMode === 'go' ? ` / ${sbBe(f.p)} going` : '');
}

// --- the modes, registered with the core (core/builder.js) ---------------
// The When column, shared by Doing, Going and Giving.
function sbWhenColumn(ui) {
  const { column, card, groupHead } = ui;
  column('when', tx('sbCol.when'), col => sbCols.when.forEach(g => {
    groupHead(col, tx((sbReverse ? 'sbWhen.' : 'sbWhenHint.') + g.group));
    g.items.forEach(c => card(col, 'when', c));
  }));
}
// What a new verb clears: its forms, and a What it doesn't go with.
function sbVerbPicked(id) {
  if (id !== 'verb') return;
  delete sbSel.form;
  if (sbSel.what && !(sbSel.verb && sbSel.verb.act.objs.some(o => o[0] === sbSel.what.pt))) delete sbSel.what;
  if (sbResult) { delete sbResult.ending; delete sbResult.what; }
}
const sbEndingNote = rev => rev ? tx('sb.checkWhoWhen') : tx('sb.checkTheForm');
const sbModeBase = id => ({ id, label: SB_MODES[id].label, slots: SB_MODES[id].slots, formSlot: 'verb' });
registerBuilderMode(Object.assign(sbModeBase('do'), {
  onPick: sbVerbPicked, endingNote: sbEndingNote,
  draw(ui) {
    const { column, card, groupHead, formBox, T, p } = ui;
    column('who', tx('sbCol.who'), col => sbCols.who.forEach(c => card(col, 'who', c)));
    column('verb', tx('sbCol.verb'), col => {
      sbCols.verbs.forEach(c => card(col, 'verb', c));
      if (!sbSel.verb) return;
      formBox(col, sbReverse ? tx('sbForms.whoWhen') : tx('sbForms.verb', { verb: sbSel.verb.pt }), sbFormsFor(sbSel.verb.pt, sbReverse && sbTarget ? sbTarget.sel.form.p : p), sbSel.form, T && T.form, sbPickForm, sbReverse ? sbFormEnLabel : null);
    });
    column('what', '', col => {
      if (!sbSel.verb) { col.insertAdjacentHTML('beforeend', `<div class="sb-hint">${tx('sbHint.verbFirstDo')}</div>`); return; }
      sbSel.verb.act.objs.map(sbWhatCard).forEach(c => card(col, 'what', c));
    });
    column('where', tx('sbCol.where'), col => sbCols.where.forEach(c => card(col, 'where', c)));
    column('with', tx('sbCol.with'), col => sbCols.with.forEach(c => card(col, 'with', c)));
    sbWhenColumn(ui);
  },
}));
registerBuilderMode(Object.assign(sbModeBase('go'), {
  // ir is given; only its form is chosen and checked.
  preset: sel => { sel.verb = SB_IR; }, fixed: ['verb'], formAlwaysChecked: true, endingNote: sbEndingNote,
  draw(ui) {
    const { column, card, groupHead, formBox, T, p } = ui;
    column('who', tx('sbCol.who'), col => sbCols.who.forEach(c => card(col, 'who', c)));
    column('verb', tx('sbCol.goVerb'), col => {
      formBox(col, sbReverse ? tx('sbForms.whoWhen') : tx('sbForms.pick'), sbFormsFor('ir', sbReverse && sbTarget ? sbTarget.sel.form.p : p), sbSel.form, T && T.form, sbPickForm, sbReverse ? sbFormEnLabel : null);
    });
    column('whereTo', tx('sbCol.whereTo'), col => sbCols.whereTo.forEach(c => card(col, 'whereTo', c)));
    column('how', tx('sbCol.how'), col => sbCols.how.forEach(c => card(col, 'how', c)));
    column('with', tx('sbCol.with'), col => sbCols.with.forEach(c => card(col, 'with', c)));
    sbWhenColumn(ui);
  },
}));
registerBuilderMode(Object.assign(sbModeBase('being'), {
  // No reading challenge for Being; ser or estar is scored as its own part.
  reading: false, agreeSlot: 'adj', partFor: id => id === 'verb' ? 'serestar' : id,
  onPick(id, _card, same) {
    if (id === 'who' && !same) {
      // A new subject has its own describing words.
      if (sbSel.adj && !sbAdjCardsFor(sbSel.who).some(a => a.pt === sbSel.adj.pt)) { delete sbSel.adj; delete sbSel.agree; }
    }
    if (id === 'adj') { delete sbSel.agree; if (sbResult) delete sbResult.agree; }
    if (id === 'verb') { delete sbSel.form; if (sbResult) delete sbResult.ending; }
  },
  draw(ui) {
    const { column, card, groupHead, formBox, T, p } = ui;
    column('who', tx('sbCol.beingWho'), col => {
      groupHead(col, tx('sbGroup.people')); sbCols.people.forEach(c => card(col, 'who', c));
      groupHead(col, tx('sbGroup.things')); sbCols.things.forEach(c => card(col, 'who', c));
    });
    column('verb', tx('sbCol.beingVerb'), col => {
      SB_BE_CARDS.forEach(c => card(col, 'verb', c));
      if (sbSel.verb) formBox(col, tx('sbForms.beingVerb', { verb: sbSel.verb.pt }), sbBeFormsFor(p).filter(f => f.verb === sbSel.verb.pt), sbSel.form, T && T.form, sbPickForm);
    });
    column('adj', tx('sbCol.adj'), col => {
      if (!sbSel.who) { col.insertAdjacentHTML('beforeend', `<div class="sb-hint">${tx('sbHint.whoFirst')}</div>`); return; }
      sbAdjCardsFor(sbSel.who).forEach(c => card(col, 'adj', c));
      if (sbSel.adj) formBox(col, tx('sbForms.agree'), sbAdjFormsFor(sbSel.adj), sbSel.agree, T && T.agree, sbPickAgree);
    });
  },
}));
registerBuilderMode(Object.assign(sbModeBase('give'), {
  onPick: sbVerbPicked, endingNote: sbEndingNote,
  draw(ui) {
    const { column, card, groupHead, formBox, T, p } = ui;
    column('who', tx('sbCol.who'), col => sbCols.who.forEach(c => card(col, 'who', c)));
    column('verb', tx('sbCol.verb'), col => {
      sbCols.giveVerbs.forEach(c => card(col, 'verb', c));
      if (!sbSel.verb) return;
      formBox(col, sbReverse ? tx('sbForms.whoWhen') : tx('sbForms.verb', { verb: sbSel.verb.pt }), sbFormsFor(sbSel.verb.pt, sbReverse && sbTarget ? sbTarget.sel.form.p : p), sbSel.form, T && T.form, sbPickForm, sbReverse ? sbFormEnLabel : null);
    });
    column('what', sbSel.verb && sbSel.verb.act.askFor ? tx('sbCol.askFor') : '', col => {
      if (!sbSel.verb) { col.insertAdjacentHTML('beforeend', `<div class="sb-hint">${tx('sbHint.verbFirstGive')}</div>`); return; }
      sbSel.verb.act.objs.map(sbWhatCard).forEach(c => card(col, 'what', c));
    });
    column('toWhom', tx('sbCol.toWhom'), col => sbCols.toWhom.forEach(c => card(col, 'toWhom', c)));
    sbWhenColumn(ui);
  },
}));
// Portuguese's builder rules, for every mode.
setBuilderLanguage({
  assemble: sbPtOf, chunks: sbChunks, english: sbEnOf, notes: sbNotes,
  newTarget: sbNewTarget, buildColumns: sbBuildColumns,
  // A form is right if it's the same word - and in reading, the same tense
  // too, unless the word is both (comemos: we eat / we ate).
  formsMatch: (sf, tf, T) => sf.pt === tf.pt && (sf.tense === tf.tense || !sbReverse || sbFormAmbiguous(T.verb.pt, tf.p)),
  // A wrong pick that comes off takes what hangs on it too.
  clearWith: { verb: ['form', 'what'], adj: ['agree'] },
  partDefs: SB_PART_DEFS,
});
