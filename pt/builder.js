// Português Drill - Portuguese: the sentence builder, sentence challenge and reading challenge.
// (Step 7 of the refactor splits the builder's mechanics into the core.)
// Split out of app.js on 2026-11-07 (refactor step 6); code unchanged.

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
  do: { label: 'Doing', slots: [['who', 'Who'], ['verb', 'Verb'], ['what', 'What'], ['where', 'Where'], ['with', 'With whom'], ['when', 'When']] },
  go: { label: 'Going', slots: [['who', 'Who'], ['verb', 'Go: ir'], ['whereTo', 'Where to'], ['how', 'How'], ['with', 'With whom'], ['when', 'When']] },
  being: { label: 'Being', slots: [['who', 'Who / what'], ['verb', 'ser or estar'], ['adj', 'Describing word']] },
  give: { label: 'Giving', slots: [['who', 'Who'], ['verb', 'Verb'], ['what', 'What'], ['toWhom', 'To whom'], ['when', 'When']] },
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
let sbMode = 'do', sbChallenge = false, sbReverse = false;
let sbSel = {}, sbTarget = null, sbTry = 0, sbDone = false, sbResult = null, sbCols = null;
let sbStats = { right: 0, total: 0 };
const sbSlots = () => SB_MODES[sbMode].slots.map(([id, role]) => ({ id, role }));
const sbSlotIdx = id => sbSlots().findIndex(s => s.id === id);

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
    if (sel.adj && sel.verb && sel.adj.be !== sel.verb.pt) notes.push(sel.adj.be === 'estar' ? `${sel.adj.pt} is how someone or something is right now - estar` : `${sel.adj.pt} is what someone or something is like - ser`);
    if (f && sel.who && f.p !== sel.who.p) notes.push(`${f.pt} is the ${SB_PERSON_LABEL[f.p]} form - for ${sel.who.pt}: ${vForm(f.verb, 'pres', sel.who.p)}`);
    if (sel.agree && sel.who) { const right = sbAdjForm(sel.adj, sel.who.g, !!sel.who.pl); if (sel.agree.pt !== right) notes.push(`${sel.who.pt} → ${right}`); }
    return notes;
  }
  const inf = sel.verb ? sel.verb.pt : 'ir';
  if (f && sel.who && f.p !== sel.who.p) {
    notes.push(`${f.pt} is the ${SB_PERSON_LABEL[f.p]} form - for ${sel.who.pt}: ${sbFormText(inf, f.tense, sel.who.p)}`);
  } else if (f && !sel.who && f.p !== 0 && f.p !== 3) {
    notes.push(`${f.pt} needs someone in Who (${SB_PERSON_LABEL[f.p]})`);
  }
  if (f && sel.when) {
    const amb = f.tense !== 'fut' && sbFormAmbiguous(inf, f.p);
    const p = sbPersonOf(sel), g = sel.when.group;
    if (g === 'ja' && f.tense !== 'pret' && !amb) notes.push(`${sel.when.pt} goes with the past - ${sbFormText(inf, 'pret', p)}`);
    else if (g === 'ja') { /* fine */ }
    else if (amb && g !== 'fut') { /* comemos: right for now and for the past */ }
    else if (g === 'past' && f.tense !== 'pret') notes.push(`${sel.when.pt} is the past - ${sbFormText(inf, 'pret', p)}`);
    else if (g === 'hab' && f.tense !== 'pres') notes.push(`${sel.when.pt} is a habit - the present: ${sbFormText(inf, 'pres', p)}`);
    else if (g === 'fut' && f.tense === 'pret') notes.push(`${sel.when.pt} hasn't happened yet - ${sbFormText(inf, inf === 'ir' ? 'pres' : 'fut', p)}`);
  }
  if (sel.with && /^sozinh/.test(sel.with.pt) && sel.who) {
    const fem = sel.who.g === 'f', pl = sel.who.p === 3 || sel.who.p === 4;
    const right = (fem ? 'sozinha' : 'sozinho') + (pl ? 's' : '');
    if (sel.with.pt !== right) notes.push(`for ${sel.who.pt}: ${right}`);
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

// --- part scores (building and reading kept apart) ------------------------
const SB_PART_DEFS = [['who', 'Who', 1], ['verb', 'Verb', 2], ['ending', 'Verb ending', 2], ['serestar', 'Ser or estar', 2],
  ['what', 'What', 3], ['whereTo', 'Where to', 3], ['adj', 'Describing word', 3], ['agree', 'Agreement', 3],
  ['where', 'Where', 4], ['how', 'How', 4], ['toWhom', 'To whom', 4], ['with', 'With whom', 5], ['when', 'When', 6]];
const SB_PARTS_KEY = 'ptDrillSentenceParts', SB_PARTS_KEY_R = 'ptDrillSentencePartsR';
let sbParts = {}, sbPartsR = {};
try { sbParts = JSON.parse(localStorage.getItem(SB_PARTS_KEY)) || {}; } catch (e) { sbParts = {}; }
try { sbPartsR = JSON.parse(localStorage.getItem(SB_PARTS_KEY_R)) || {}; } catch (e) { sbPartsR = {}; }
function sbRecordPart(id, ok) {
  const store = sbReverse ? sbPartsR : sbParts;
  const e = store[id] || { r: [], n: 0 };
  e.r.push(ok ? 1 : 0);
  if (e.r.length > 20) e.r = e.r.slice(-20);
  e.n++;
  store[id] = e;
}
function sbSaveParts() { try { localStorage.setItem(SB_PARTS_KEY, JSON.stringify(sbParts)); localStorage.setItem(SB_PARTS_KEY_R, JSON.stringify(sbPartsR)); } catch (e) { /* fine */ } }
function sbPartStats(rev) {
  const store = rev ? sbPartsR : sbParts;
  return SB_PART_DEFS.map(([id, label, slot]) => {
    const e = store[id];
    const pct = e && e.r.length ? Math.round(100 * e.r.reduce((a, b) => a + b, 0) / e.r.length) : null;
    return { id, label, slot, pct, n: e ? e.n : 0 };
  });
}
function sbWeakestPart(rev) {
  const ok = sbPartStats(rev).filter(x => x.n >= 5 && x.pct !== null).sort((a, b) => a.pct - b.pct);
  return ok.length && ok[0].pct < 100 ? ok[0] : null;
}
function sbPartsPanelHtml(rev) {
  const stats = sbPartStats(rev).filter(x => x.n > 0);
  if (!stats.length) return '';
  const rows = stats.map(x => {
    const few = x.n < 5;
    return `<div class="sbp-row${few ? ' sbp-few' : ''}" style="--slot:var(--slot-${x.slot})"><span class="sbp-label">${x.label}</span>` +
      `<span class="sbp-bar"><span style="width:${x.pct}%"></span></span><span class="sbp-pct">${few ? '–' : x.pct + '%'}</span></div>`;
  }).join('');
  const weak = sbWeakestPart(rev);
  return `<div class="sbp-panel"><div class="sbp-title">${rev ? 'Reading' : 'Challenge'} parts - right first time</div>${rows}` +
    `<div class="sbp-note">${weak ? `Most room to grow: <strong>${weak.label}</strong>. ` : ''}Over your last 20 tries of each part; a dash until there have been 5.</div></div>`;
}

// --- screen --------------------------------------------------------------
function sbRefreshPanels() {
  const panel = document.getElementById('sb-parts-panel');
  if (panel) panel.innerHTML = sbPartsPanelHtml(false) + sbPartsPanelHtml(true);
}
function showBuildPage() {
  sbRefreshPanels();
  renderSentence('grammar-sentence');
  showScreen('build');
}
// challenge: false (builder) | true (sentence challenge) | 'reverse' (reading)
function showSentenceBuilder(challenge) {
  sbReverse = challenge === 'reverse';
  sbChallenge = !!challenge;
  if (sbReverse && sbMode === 'being') sbMode = 'do';
  // Every entry starts clean (a finished challenge once locked the builder).
  sbSel = {}; sbTarget = null; sbTry = 0; sbDone = false; sbResult = null;
  const t = document.getElementById('sb-title');
  if (t) t.textContent = sbReverse ? 'Reading challenge' : sbChallenge ? 'Sentence challenge' : 'Sentence builder';
  sbStart();
  showScreen('sb');
  window.scrollTo(0, 0);
}
function sbStart() { if (sbChallenge) sbNewChallenge(); else { sbSel = {}; if (sbMode === 'go') sbSel.verb = SB_IR; sbBuildColumns(); sbRender(); } }
function sbSetMode(m) {
  if (sbMode === m || (sbReverse && m === 'being')) return;
  sbMode = m; sbSel = {}; sbTarget = null; sbTry = 0; sbDone = false; sbResult = null;
  sbStart();
}
function sbNewChallenge() {
  sbTarget = sbNewTarget();
  sbSel = {}; sbTry = 0; sbDone = false; sbResult = null;
  if (sbMode === 'go') sbSel.verb = SB_IR;
  sbBuildColumns();
  sbRender();
}
function sbShuffle() { sbBuildColumns(); sbSel = {}; if (sbMode === 'go') sbSel.verb = SB_IR; sbRender(); }
function sbClear() { if (sbDone) return; sbSel = {}; if (sbMode === 'go') sbSel.verb = SB_IR; sbResult = null; sbRender(); }
const sbLocked = id => sbResult && sbResult[id] === 'right';
function sbPick(id, card) {
  if (sbDone || sbLocked(id)) return;
  const same = sbSel[id] && sbSel[id].pt === card.pt;
  if (same) delete sbSel[id]; else sbSel[id] = card;
  if (sbResult) delete sbResult[id];
  if (id === 'verb' && (sbMode === 'do' || sbMode === 'give')) {
    delete sbSel.form;
    if (sbSel.what && !(sbSel.verb && sbSel.verb.act.objs.some(o => o[0] === sbSel.what.pt))) delete sbSel.what;
    if (sbResult) { delete sbResult.ending; delete sbResult.what; }
  }
  if (id === 'who' && sbMode === 'being' && !same) {
    // A new subject has its own describing words.
    if (sbSel.adj && !sbAdjCardsFor(sbSel.who).some(a => a.pt === sbSel.adj.pt)) { delete sbSel.adj; delete sbSel.agree; }
  }
  if (id === 'adj') { delete sbSel.agree; if (sbResult) delete sbResult.agree; }
  if (id === 'verb' && sbMode === 'being') { delete sbSel.form; if (sbResult) delete sbResult.ending; }
  sbRender();
  if (!same && !sbReverse) speakTarget(card.pt);
}
function sbPickForm(f) {
  if (sbDone || sbLocked('ending')) return;
  if (sbSel.form && sbSel.form.pt === f.pt) delete sbSel.form; else sbSel.form = f;
  if (sbResult) delete sbResult.ending;
  sbRender();
  if (sbSel.form && !sbReverse) speakTarget(f.pt);
}
function sbPickAgree(f) {
  if (sbDone || sbLocked('agree')) return;
  if (sbSel.agree && sbSel.agree.pt === f.pt) delete sbSel.agree; else sbSel.agree = f;
  if (sbResult) delete sbResult.agree;
  sbRender();
  if (sbSel.agree) speakTarget(f.pt);
}
function sbSay() { const t = sbPtOf(sbSel); if (t) speakTarget(t); }
function sbSayTarget() { if (sbTarget) speakTarget(sbTarget.pt); }
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
// Check: each part right / wrong / missing / extra; the right verb (or
// describing word) with the wrong form is its own message.
function sbCheck() {
  if (!sbTarget || sbDone) return;
  sbTry++;
  const T = sbTarget.sel, S = sbSel, res = {}, prev = sbResult || {};
  sbSlots().forEach(({ id }) => {
    if (prev[id] === 'right') { res[id] = 'right'; return; }
    if (id === 'verb' && sbMode === 'go') return; // ir is given; only its form counts
    const t = T[id], s = S[id];
    if (id === 'who' && sbTarget.whoOptional) { if (s) res[id] = s.pt === t.pt ? 'right' : 'wrong'; return; }
    if (!t && !s) return;
    if (!t) { res[id] = 'extra'; return; }
    if (!s) { res[id] = 'missing'; return; }
    res[id] = s.pt === t.pt ? 'right' : 'wrong';
  });
  const formOk = () => S.form && S.form.pt === T.form.pt && (S.form.tense === T.form.tense || !sbReverse || sbFormAmbiguous(T.verb.pt, T.form.p));
  if (sbMode === 'go') res.ending = prev.ending === 'right' || formOk() ? 'right' : (S.form ? 'wrong' : 'missing');
  else if (res.verb === 'right') res.ending = prev.ending === 'right' || formOk() ? 'right' : 'ending';
  if (sbMode === 'being' && res.adj === 'right') res.agree = prev.agree === 'right' || (S.agree && S.agree.pt === T.agree.pt) ? 'right' : 'ending';
  if (sbTry === 1) {
    const counted = Object.keys(res);
    sbStats.total += counted.length; sbStats.right += counted.filter(k => res[k] === 'right').length;
    Object.entries(res).forEach(([id, r]) => {
      const part = sbMode === 'being' && id === 'verb' ? 'serestar' : id;
      sbRecordPart(part, r === 'right');
    });
    sbSaveParts();
  }
  // Wrong picks come off, so the second go starts from what's right.
  if (sbTry < 2) Object.keys(res).forEach(id => {
    if (res[id] === 'wrong' || res[id] === 'extra') {
      if (id === 'ending') { delete S.form; return; }
      delete S[id];
      if (id === 'verb') { delete S.form; delete S.what; }
      if (id === 'adj') delete S.agree;
    }
    if (res[id] === 'ending') { if (id === 'agree') delete S.agree; else delete S.form; }
  });
  sbResult = res;
  const allRight = Object.values(res).every(r => r === 'right');
  if (allRight || sbTry >= 2) { sbDone = true; sbSayTarget(); }
  sbRender();
}
function sbRender() {
  const top = document.getElementById('sb-strip'), colsEl = document.getElementById('sb-cols');
  if (!top || !colsEl) return;
  document.querySelectorAll('#sb-mode-row button').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === sbMode);
    b.disabled = sbReverse && b.dataset.mode === 'being';
  });
  const chunks = sbChunks(sbSel);
  const mark = c => {
    let id = c.id;
    if (id === 'verb' && sbResult && (sbResult.ending === 'ending' || sbMode === 'go')) id = 'ending';
    if (id === 'adj' && sbResult && sbResult.agree === 'ending') id = 'agree';
    return sbResult && sbResult[id] ? ' sb-' + sbResult[id] : '';
  };
  const label = id => (sbSlots().find(x => x.id === id) || {}).role || id;
  let html = '';
  if (sbReverse && sbTarget) {
    html += `<div class="sb-pt sb-prompt-pt" onclick="sbSayTarget()">${escapeHtmlText(sbTarget.pt)}</div>`;
    html += Object.keys(sbSel).some(k => sbSel[k] && !(k === 'verb' && sbMode === 'go'))
      ? `<div class="sb-en sb-en-built">"${escapeHtmlText(sbEnOf(sbSel))}"</div>`
      : `<div class="sb-empty">Read the sentence (tap it to hear it), then pick the English for each part - skip the columns it doesn't use.</div>`;
  } else {
    if (sbChallenge && sbTarget) html += `<div class="sb-prompt">"${escapeHtmlText(sbTarget.en)}"</div>`;
    if (chunks.length) {
      html += `<div class="sb-pt">${chunks.map((c, k) => {
        const txt = k === 0 ? sCap(c.pt) : c.pt;
        return `<span class="sb-chunk${c.verbOnly ? ' sb-verb-only' : ''}${mark(c)}" style="--slot:var(--slot-${c.slot + 1})">${escapeHtmlText(txt)}</span>`;
      }).join(' ')}.</div>`;
      if (!sbChallenge) html += `<div class="sb-en">"${escapeHtmlText(sbEnOf(sbSel))}"</div>`;
    } else html += `<div class="sb-empty">${sbChallenge ? 'Tap a card in each column you need - skip the ones you don\'t.' : 'Tap a card from each column to build a sentence.'}</div>`;
  }
  const notes = !sbChallenge ? sbNotes(sbSel) : [];
  if (notes.length) html += `<div class="sb-notes">${notes.map(escapeHtmlText).join(' · ')}</div>`;
  if (sbChallenge && sbResult) {
    if (sbDone) {
      const ids = Object.keys(sbResult), n = ids.length, r = ids.filter(k => sbResult[k] === 'right').length;
      html += sbReverse ? `<div class="sb-answer"><div class="sb-en sb-en-answer">"${escapeHtmlText(sbTarget.en)}"</div></div>`
        : `<div class="sb-answer" onclick="sbSayTarget()"><div class="sb-pt">${escapeHtmlText(sbTarget.pt)}</div></div>`;
      html += `<div class="sb-verdict${r === n ? ' good' : ''}">${r === n ? (sbTry === 1 ? 'All right first time!' : 'All right on the second go.') : `${r} of ${n} parts right - the answer is above.`}</div>`;
    } else {
      const missing = Object.keys(sbResult).filter(k => sbResult[k] === 'missing').map(k => k === 'ending' ? 'the verb form' : label(k));
      const wrongN = Object.values(sbResult).filter(r => r === 'wrong' || r === 'extra').length;
      const bits = [wrongN ? `${wrongN} part${wrongN === 1 ? '' : 's'} not right (taken off)` : '',
        sbResult.ending === 'ending' ? (sbMode === 'being' ? 'right verb - check the form' : sbReverse ? 'right verb - check who and when' : 'right verb - check the form') : '',
        sbResult.agree === 'ending' ? 'right word - check the ending (agreement)' : '',
        missing.length ? 'missing: ' + missing.join(', ') : ''].filter(Boolean);
      html += `<div class="sb-verdict">${bits.join(' · ')} - one more go.</div>`;
    }
  }
  const btn = (text, fn, main) => `<button type="button" class="ds-btn${main ? ' ds-btn-main' : ''}" onclick="${fn}">${text}</button>`;
  html += '<div class="ds-buttons sb-buttons">';
  if (sbReverse) html += btn('🔊 Hear it', 'sbSayTarget()');
  else if (chunks.length) html += btn('🔊 Hear it', 'sbSay()');
  if (sbChallenge) html += sbDone ? btn('Next →', 'sbNewChallenge()', true) : btn(sbTry ? 'Check again' : 'Check', 'sbCheck()', true) + btn('Clear', 'sbClear()');
  else html += btn('Clear', 'sbClear()') + btn('Shuffle words', 'sbShuffle()');
  html += '</div>';
  if (sbChallenge && sbStats.total) {
    const weak = sbWeakestPart(sbReverse);
    html += `<div class="sb-stats">This session: ${sbStats.right} of ${sbStats.total} parts right first time${weak ? ` · most room to grow: ${weak.label} (${weak.pct}%)` : ''}</div>`;
  }
  top.innerHTML = html;

  // Columns
  const T = sbDone && sbTarget ? sbTarget.sel : null;
  colsEl.innerHTML = '';
  colsEl.classList.toggle('sb-rev', sbReverse);
  const column = (id, note, fill) => {
    const i = sbSlotIdx(id);
    const col = document.createElement('div');
    col.className = 'ds-col sb-col';
    col.style.setProperty('--slot', `var(--slot-${i + 1})`);
    col.innerHTML = `<div class="ds-head"><div class="ds-head-top"><span class="ds-num">${i + 1}</span><span class="ds-role">${escapeHtmlText(sbSlots()[i].role)}</span></div></div>` +
      (note && !sbReverse ? `<div class="ds-note">${escapeHtmlText(note)}</div>` : '');
    fill(col);
    colsEl.appendChild(col);
  };
  const card = (col, id, it) => {
    const el = document.createElement('div');
    const picked = sbSel[id] && sbSel[id].pt === it.pt;
    const isAns = T && T[id] && T[id].pt === it.pt;
    el.className = 'ds-card sb-card' + (picked ? ' sb-picked' : '') + (picked && sbResult && sbResult[id] === 'right' ? ' sb-ok' : '') + (isAns && !picked ? ' sb-should' : '');
    const len = it.pt.length;
    el.innerHTML = `<div class="ds-pt${len >= 20 ? ' xlong' : len >= 14 ? ' long' : ''}">${escapeHtmlText(it.pt)}</div><div class="ds-en">${escapeHtmlText(it.en)}</div>`;
    el.onclick = () => sbPick(id, it);
    col.appendChild(el);
  };
  const groupHead = (col, text) => { const h = document.createElement('div'); h.className = 'ds-group-head'; h.innerHTML = `<span class="ds-pt">${escapeHtmlText(text)}</span>`; col.appendChild(h); };
  const formBox = (col, head, forms, chosen, ans, onPick, labelOf) => {
    const box = document.createElement('div');
    box.className = 'sb-forms';
    box.innerHTML = `<div class="sb-forms-head">${escapeHtmlText(head)}</div>`;
    forms.forEach(f => {
      const b = document.createElement('button');
      b.type = 'button';
      const on = chosen && chosen.pt === f.pt && (!sbReverse || chosen.tense === f.tense);
      b.className = 'sb-form' + (on ? ' active' : '') + (ans && ans.pt === f.pt && !on ? ' sb-should' : '');
      b.textContent = labelOf ? labelOf(f) : f.pt;
      b.onclick = () => onPick(f);
      box.appendChild(b);
    });
    col.appendChild(box);
  };
  const whenCol = () => column('when', 'match the verb to the time', col => sbCols.when.forEach(g => {
    groupHead(col, sbReverse ? { hab: 'Habits', fut: 'Plans', past: 'Done', ja: 'Already / not yet' }[g.group] : { hab: 'Habits → now', fut: 'Plans → going to', past: 'Done → past', ja: 'Already / not yet → past, before the verb' }[g.group]);
    g.items.forEach(c => card(col, 'when', c));
  }));
  const p = sbSel.who ? sbSel.who.p : 0;
  if (sbMode === 'being') {
    column('who', 'people or things', col => {
      groupHead(col, 'People'); sbCols.people.forEach(c => card(col, 'who', c));
      groupHead(col, 'Things'); sbCols.things.forEach(c => card(col, 'who', c));
    });
    column('verb', 'ser: what it\'s like · estar: how it is now', col => {
      SB_BE_CARDS.forEach(c => card(col, 'verb', c));
      if (sbSel.verb) formBox(col, sbSel.verb.pt + ' - pick the form', sbBeFormsFor(p).filter(f => f.verb === sbSel.verb.pt), sbSel.form, T && T.form, sbPickForm);
    });
    column('adj', 'it agrees: novo, nova, novos, novas', col => {
      if (!sbSel.who) { col.insertAdjacentHTML('beforeend', '<div class="sb-hint">Pick who or what first - the words that suit it show here.</div>'); return; }
      sbAdjCardsFor(sbSel.who).forEach(c => card(col, 'adj', c));
      if (sbSel.adj) formBox(col, 'the ending - make it agree', sbAdjFormsFor(sbSel.adj), sbSel.agree, T && T.agree, sbPickAgree);
    });
    return;
  }
  column('who', 'eu and nós can be left out', col => sbCols.who.forEach(c => card(col, 'who', c)));
  if (sbMode === 'give') {
    column('verb', 'then pick the form', col => {
      sbCols.giveVerbs.forEach(c => card(col, 'verb', c));
      if (!sbSel.verb) return;
      formBox(col, sbReverse ? 'who, and when?' : sbSel.verb.pt + ' - now, past, going to', sbFormsFor(sbSel.verb.pt, sbReverse && sbTarget ? sbTarget.sel.form.p : p), sbSel.form, T && T.form, sbPickForm, sbReverse ? sbFormEnLabel : null);
    });
    column('what', sbSel.verb && sbSel.verb.act.askFor ? 'pedir X a alguém = ask someone for X' : '', col => {
      if (!sbSel.verb) { col.insertAdjacentHTML('beforeend', '<div class="sb-hint">Pick a verb first - the things you can give, send or show appear here.</div>'); return; }
      sbSel.verb.act.objs.map(sbWhatCard).forEach(c => card(col, 'what', c));
    });
    column('toWhom', 'a + o = ao, a + a = à, a + os = aos', col => sbCols.toWhom.forEach(c => card(col, 'toWhom', c)));
    whenCol();
    return;
  }
  if (sbMode === 'go') {
    column('verb', 'plans use the present: vou amanhã', col => {
      formBox(col, sbReverse ? 'who, and when?' : 'pick the form', sbFormsFor('ir', sbReverse && sbTarget ? sbTarget.sel.form.p : p), sbSel.form, T && T.form, sbPickForm, sbReverse ? sbFormEnLabel : null);
    });
    column('whereTo', 'a + o = ao, a + a = à; cities: a Lisboa', col => sbCols.whereTo.forEach(c => card(col, 'whereTo', c)));
    column('how', 'de + transport, but a pé', col => sbCols.how.forEach(c => card(col, 'how', c)));
  } else {
    column('verb', 'then pick the form', col => {
      sbCols.verbs.forEach(c => card(col, 'verb', c));
      if (!sbSel.verb) return;
      formBox(col, sbReverse ? 'who, and when?' : sbSel.verb.pt + ' - now, past, going to', sbFormsFor(sbSel.verb.pt, sbReverse && sbTarget ? sbTarget.sel.form.p : p), sbSel.form, T && T.form, sbPickForm, sbReverse ? sbFormEnLabel : null);
    });
    column('what', '', col => {
      if (!sbSel.verb) { col.insertAdjacentHTML('beforeend', '<div class="sb-hint">Pick a verb first - the things you can do with it show here.</div>'); return; }
      sbSel.verb.act.objs.map(sbWhatCard).forEach(c => card(col, 'what', c));
    });
    column('where', 'em + o = no, em + a = na', col => sbCols.where.forEach(c => card(col, 'where', c)));
  }
  column('with', 'sozinha for a woman', col => sbCols.with.forEach(c => card(col, 'with', c)));
  whenCol();
}
