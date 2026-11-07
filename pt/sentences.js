// Português Drill - Portuguese: the sentence generator (greeting card and Frases).
// Split out of app.js on 2026-11-07 (refactor step 6); code unchanged.

// =============================================================================
// SENTENCES (Portuguese build; rebuilt 2026-10-11 on the Japanese L3 model)
// One whole sentence or a short exchange, for the greeting card and the
// Grammar page. Independent slots from grammar.js's `sentences` (who, when,
// where, with whom, how, what) are mixed per pattern, with sense rules so the
// mix stays natural. Verb forms come from the Verbs engine (conjugate, or the
// regular pattern for verbs not in the Verbs list); contractions and
// adjective agreement are done here.
// =============================================================================
const SENT = GRAMMAR.sentences || null;
const sPick = list => list[Math.floor(Math.random() * list.length)];
const sChance = p => Math.random() < p;
const sCap = s => s.charAt(0).toUpperCase() + s.slice(1);
const sLowerStart = s => s.charAt(0).toLowerCase() + s.slice(1);

// --- grammar helpers --------------------------------------------------------
const PT_PREP_JOIN = {
  a: { o: 'ao', a: 'à', os: 'aos', as: 'às', um: 'a um', uma: 'a uma', '': 'a' },
  em: { o: 'no', a: 'na', os: 'nos', as: 'nas', um: 'num', uma: 'numa', '': 'em' },
  de: { o: 'do', a: 'da', os: 'dos', as: 'das', um: 'de um', uma: 'de uma', '': 'de' },
  por: { o: 'pelo', a: 'pela', os: 'pelos', as: 'pelas', um: 'por um', uma: 'por uma', '': 'por' },
};
function ptPrepJoin(prep, noun) {
  if (noun.bare && prep === 'em') return noun.bare;
  return PT_PREP_JOIN[prep][noun.art || ''] + ' ' + noun.pt;
}
function ptArticle(noun) { return (noun.art ? noun.art + ' ' : '') + noun.pt; }
// Any verb in any person/tense: the Verbs list where it has the verb,
// otherwise the regular pattern (levantar, visitar, cozinhar, adorar…).
function vForm(inf, tense, p) {
  const v = VERB_BY_INF[inf] || { inf, group: inf.slice(-2) };
  return conjugate(v, tense, p).form;
}
// Reflexive with the pronoun after the verb, as in Portugal:
// levanto-me, levantas-te, levanta-se, levantamo-nos, levantam-se.
const REFL_PRON = ['me', 'te', 'se', 'nos', 'se'];
function vReflexive(inf, tense, p) {
  let f = vForm(inf, tense, p);
  if (p === 3) f = f.replace(/s$/, '');
  return f + '-' + REFL_PRON[p];
}
// Adjective agreement from the masculine singular.
const ADJ_IRREG = { bom: ['bom', 'boa', 'bons', 'boas'] };
function ptAgree(adj, g, pl) {
  if (ADJ_IRREG[adj]) return ADJ_IRREG[adj][(g === 'f' ? 1 : 0) + (pl ? 2 : 0)];
  let f = adj;
  if (g === 'f' && /o$/.test(adj)) f = adj.slice(0, -1) + 'a';
  if (g === 'f' && /or$/.test(adj)) f = adj + 'a';
  if (!pl) return f;
  if (/[aeiouáéíóú]$/.test(f)) return f + 's';
  if (/vel$/.test(f)) return f.replace(/vel$/, 'veis');
  if (/l$/.test(f)) return f.replace(/l$/, 'is');
  if (/[rz]$/.test(f)) return f + 'es';
  return f + 's';
}
function nounGender(n) { return /^(a|as|uma)$/.test(n.art) ? 'f' : 'm'; }
function nounPlural(n) { return /^(os|as)$/.test(n.art); }
// Clock times as said with a preposition: às sete, à uma, ao meio-dia,
// das nove, à meia-noite e meia. prep: 'a' | 'de'.
function ptClock(prep, h, m) {
  let word, art;
  if (h === 12) { word = 'meio-dia'; art = 'o'; }
  else if (h === 0 || h === 24) { word = 'meia-noite'; art = 'a'; }
  else { const h12 = h % 12 || 12; word = LANG.belowThousand(h12, true); art = h12 === 1 ? 'a' : 'as'; }
  return PT_PREP_JOIN[prep][art] + ' ' + word + (m ? ' e ' + LANG.minuteWords(m) : '');
}
function enClock(h, m) {
  h %= 24;
  if (!m && h === 12) return 'midday';
  if (!m && h === 0) return 'midnight';
  return formatTimeShown(h, m, 'none', 'everyday').replace(':00', '').replace(' (midday)', '').replace(' (midnight)', '');
}

// --- English helpers --------------------------------------------------------
// en forms: [base, he/she, past, -ing]. tense: hab | fut | past.
function enVerb(forms, tense, subj) {
  if (tense === 'past') return forms[2];
  if (tense === 'fut') return enBe(subj) + ' going to ' + forms[0];
  return subj.p === 2 ? forms[1] : forms[0];
}
function enBe(subj) { return subj.p === 0 ? 'am' : subj.p === 2 ? 'is' : 'are'; }
function enSubj(subj) { return subj.en; }
// "I am going" -> "I'm going" etc. for readability.
function enTidy(s) {
  return s.replace(/^(I|We|They|You) have (already|not)\b/, "$1've $2").replace(/^(He|She) has already\b/, "$1's already").replace(/^(He|She|It) is\b/, "$1's").replace(/^They are\b/, "They're").replace(/\bI am\b/g, "I'm").replace(/\bwe are\b/g, "we're").replace(/\bWe are\b/g, "We're").replace(/\s+/g, ' ').trim();
}

// --- slot pickers -------------------------------------------------------------
// "I" comes up more often (2026-10-24): sentences about your own life stick.
// Family is already a third of the people list.
function sSubject(filter) {
  const pool = SENT.people.filter(s => !filter || filter(s));
  const weighted = pool.concat(pool.filter(s => s.kind === 'me'), pool.filter(s => s.kind === 'me'));
  return sPick(weighted);
}
// Portuguese subject words: dropped for eu / nós.
function ptSubj(subj) { return subj.pt || ''; }
function sTime(tense, filter) {
  const pool = SENT.times[tense].filter(t => !filter || filter(t));
  return pool.length ? sPick(pool) : null;
}
function sCompanion(subj, opts = {}) {
  const pool = SENT.companions.filter(c => c.who !== subj.pt && (!c.work || opts.work) && !(subj.kind === 'family' && c.pt === 'com a família'));
  if (!opts.noAlone && (subj.p === 0 || subj.p === 2) && sChance(0.2)) {
    const alone = subj.g === 'f' ? 'sozinha' : 'sozinho';
    return { pt: alone, en: subj.p === 0 ? 'on my own' : 'on ' + (subj.g === 'f' ? 'her' : 'his') + ' own' };
  }
  return sPick(pool);
}
// Builds "[Time] [subject] [rest]" or "[Subject] [rest] [time]".
function sAssemble(time, subj, ptRest, enRest) {
  const ptS = ptSubj(subj);
  const enS = enSubj(subj);
  if (time && sChance(0.3)) {
    return { pt: sCap(((ptS ? ptS + ' ' : '') + ptRest + ' ' + sLowerStart(time.pt)).trim()) + '.', en: enTidy(sCap(enS + ' ' + enRest + ' ' + time.en)) + '.' };
  }
  const ptStart = time ? time.pt + (ptS ? ' ' + ptS : '') : sCap(ptS);
  return { pt: ((ptStart ? ptStart + ' ' : '') + ptRest).replace(/^./, c => c.toUpperCase()) + '.', en: enTidy((time ? sCap(time.en) + ' ' + enS : sCap(enS)) + ' ' + enRest) + '.' };
}
const NIGHT_ONLY_BAD = ['beach', 'terrace', 'park', 'market'];

// --- patterns -----------------------------------------------------------------
// Something someone does / did / will do, maybe somewhere, maybe with someone.
function sActivity(opts = {}) {
  const tense = opts.tense || sPick(['hab', 'hab', 'fut', 'past']);
  const act = sPick(SENT.activities);
  const obj = sPick(act.objs);
  const longOk = act.verb === 'visitar' || act.verb === 'estudar';
  // Meals at the right time of day; rarer things not "every day".
  const fits = t => (longOk || !t.long) &&
    !(/jantar/.test(obj[0]) && t.morning) && !(/pequeno-almoço/.test(obj[0]) && (t.night || /tarde/.test(t.pt))) &&
    !(act.rare && tense === 'hab' && (/Todos/.test(t.pt) || t.morning || t.night || t.weekday));
  const time = opts.noTime ? null : sTime(tense, fits);
  const subj = opts.subj || sSubject(s => !(s.elderly && (act.verb === 'estudar' || obj[0] === 'os avós')));
  if (subj.elderly && obj[0] === 'os avós') return null;
  const forms = obj[2] || act.en;
  let placeKeys = obj[3] || act.places;
  placeKeys = placeKeys.filter(k => !(time && time.night && NIGHT_ONLY_BAD.includes(k)) && !(k === 'office' && time && time.weekend));
  const place = placeKeys.length && sChance(0.55) ? SENT.places[sPick(placeKeys)] : null;
  const social = ['comer', 'beber', 'visitar', 'cozinhar', 'ver', 'fazer'].includes(act.verb);
  const comp = social && !opts.noCompanion && sChance(0.3) ? sCompanion(subj, { work: place && place === SENT.places.office }) : null;
  const vpt = tense === 'hab' ? vForm(act.verb, 'pres', subj.p) : tense === 'past' ? vForm(act.verb, 'pret', subj.p) : vForm('ir', 'pres', subj.p) + ' ' + act.verb;
  const ptRest = [vpt, obj[0], place && ptPrepJoin('em', place), comp && comp.pt].filter(Boolean).join(' ');
  const enRest = [enVerb(forms, tense, subj), obj[1], place && place.en, comp && comp.en].filter(Boolean).join(' ');
  return { ...sAssemble(time, subj, ptRest, enRest), act, obj, forms, place, comp, time, tense, subj };
}
// Going somewhere: ir a + place, maybe how, maybe with whom.
function destOk(d, t, tense) {
  if (!t) return true;
  if (t.long) return d.kind === 'city' || d.kind === 'far';
  if (d.kind === 'far') return !!t.weekend && tense !== 'hab';
  if (d.kind === 'city') return !t.night && !t.morning && (tense !== 'hab' || t.weekend || /vezes|vez em quando/.test(t.pt));
  if (d.kind === 'work' || d.weekday) return !t.weekend && !t.night;
  if (d.kind === 'culture' || d.kind === 'shop') return !t.night && !(tense === 'hab' && /Todos/.test(t.pt));
  if (d.kind === 'night') return !t.morning;
  if (d.day) return !t.night;
  return true;
}
function sMotion(opts = {}) {
  const tense = opts.tense || sPick(['hab', 'fut', 'fut', 'past']);
  for (let i = 0; i < 20; i++) {
    const subj = opts.subj || sSubject(s => !s.elderly || sChance(0.3));
    const d = opts.dest || sPick(SENT.destinations.filter(x => !(x.kind === 'work' && (subj.elderly || subj.pt === 'os meus pais'))));
    const time = opts.noTime ? null : sTime(tense, t => destOk(d, t, tense));
    if (!opts.noTime && !time) continue;
    const tr = sChance(0.4) ? sPick(SENT.transport.filter(x => d.kind === 'far' ? x.flight : d.kind === 'city' ? x.trip : x.local)) : null;
    const comp = d.kind !== 'work' && !opts.noCompanion && sChance(0.3) ? sCompanion(subj) : null;
    const vpt = tense === 'past' ? vForm('ir', 'pret', subj.p) : vForm('ir', 'pres', subj.p);
    const ptRest = [vpt, ptPrepJoin('a', d), tr && tr.pt, comp && comp.pt].filter(Boolean).join(' ');
    const goForms = ['go to', 'goes to', 'went to', 'going to'];
    const enV = tense === 'fut' ? enBe(subj) + ' going to' : enVerb(goForms, tense, subj);
    const enRest = [enV, d.en, tr && tr.en, comp && comp.en].filter(Boolean).join(' ');
    return { ...sAssemble(time, subj, ptRest, enRest), dest: d, subj, tense, time, tr, comp };
  }
  return null;
}
// Getting up / going to bed (reflexive), or working hours (das… às…).
function sRoutine() {
  if (sChance(0.6)) {
    const r = sPick(SENT.reflexives);
    const tense = sPick(['hab', 'hab', 'past']);
    const time = sTime(tense, t => !t.long && !t.night && !(t.morning && (r.inf === 'deitar' || tense === 'hab')) && !/[Vv]ezes|vez em quando|tarde/i.test(t.pt));
    const subj = sSubject();
    let h = sPick(r.hours);
    if (r.inf === 'levantar' && time && time.weekend) h += sPick([1, 2]);
    const m = sPick([0, 0, 15, 30, 30]);
    const ptRest = vReflexive(r.inf, tense === 'past' ? 'pret' : 'pres', subj.p) + ' ' + ptClock('a', h, m);
    const enRest = (tense === 'past' ? r.en[2] : subj.p === 2 ? r.en[1] : r.en[0]) + ' at ' + enClock(h, m);
    return sAssemble(time, subj, ptRest, enRest);
  }
  const subj = sSubject(s => !s.elderly && s.pt !== 'os meus pais');
  const from = sPick([8, 8, 9, 9, 10]), to = sPick([4, 5, 5, 6]) + 12;
  const tm = sPick([0, 0, 30]);
  const time = sChance(0.4) ? sTime('hab', t => t.weekday || /Todos/.test(t.pt)) : null;
  const ptRest = vForm('trabalhar', 'pres', subj.p) + ' ' + ptClock('de', from, 0) + ' ' + ptClock('a', to, tm);
  const enRest = (subj.p === 2 ? 'works' : 'work') + ' from ' + enClock(from, 0) + ' to ' + enClock(to, tm);
  return sAssemble(time, subj, ptRest, enRest);
}
// "A minha irmã é enfermeira e trabalha num hospital."
function sJob() {
  const subj = sSubject(s => s.p === 2 && s.kind !== 'me');
  if (subj.elderly || sChance(0.12)) {
    const pl = subj.pl, f = subj.g === 'f';
    const town = sPick(SENT.hometowns.filter(t => !/Escócia|Inglaterra|Brasil|Manchester/.test(t.pt)));
    const ret = ptAgree('reformado', f ? 'f' : 'm', pl);
    return { pt: sCap(subj.pt) + ' ' + (pl ? 'estão' : 'está') + ' ' + ret + ' e ' + vForm('morar', 'pres', subj.p) + ' ' + ptPrepJoin('em', town) + '.',
      en: sCap(subj.en) + ' ' + (pl ? 'are' : 'is') + ' retired and ' + (pl ? 'live' : 'lives') + ' in ' + town.en + '.' };
  }
  const job = sPick(SENT.jobs);
  const f = subj.g === 'f';
  const at = { pt: job.at.pt, art: job.at.art };
  return { pt: sCap(subj.pt) + ' é ' + (f ? job.f : job.m) + ' e trabalha ' + ptPrepJoin('em', at) + '.',
    en: sCap(subj.en) + ' is ' + (f && job.enF ? job.enF : job.en) + ' and works ' + job.atEn + '.' };
}
// "O hotel é caro, mas o quarto é muito confortável."
function sDescribe() {
  const ctx = sPick(SENT.describe);
  const items = shuffle([...ctx.items]).slice(0, sChance(0.65) && ctx.items.length > 1 ? 2 : 1);
  const halves = items.map(it => {
    const a = sPick(it.adj);
    const g = nounGender(it), pl = nounPlural(it);
    const be = a[2] === 'ser' ? (pl ? 'são' : 'é') : (pl ? 'estão' : 'está');
    const muito = a[0] !== 'ótimo' && sChance(0.35);
    return { pt: ptArticle(it) + ' ' + be + ' ' + (muito ? 'muito ' : '') + ptAgree(a[0], g, pl), en: it.en + ' ' + (pl ? 'are' : 'is') + ' ' + (muito ? 'very ' : '') + a[1], good: a[3], estar: a[2] === 'estar' };
  });
  if (halves.length === 1) {
    const h = halves[0];
    const today = h.estar && sChance(0.5);
    return { pt: (today ? 'Hoje ' : '') + (today ? h.pt : sCap(h.pt)) + '.', en: sCap(h.en) + (today ? ' today' : '') + '.' };
  }
  const same = halves[0].good === halves[1].good;
  return { pt: sCap(halves[0].pt) + (same ? ' e ' : ', mas ') + halves[1].pt + '.', en: sCap(halves[0].en) + (same ? ' and ' : ', but ') + halves[1].en + '.' };
}
// "Está a chover, por isso fico em casa."
function sWeather() {
  const w = sPick(SENT.weather);
  const plan = sPick(w.good ? SENT.weatherGood : SENT.weatherBad);
  const today = sChance(0.5);
  return { pt: (today ? 'Hoje ' + sLowerStart(w.pt) : w.pt) + ', por isso ' + plan[0] + '.', en: w.en + (today ? ' today' : '') + ', so ' + plan[1] + '.' };
}
// Likes and preferences.
function sLikes() {
  const subj = sSubject();
  const [a, b] = shuffle([...SENT.likes]).slice(0, 2);
  const ps = ptSubj(subj);
  const he = subj.p === 2, sheHe = subj.g === 'f' ? 'she' : 'he';
  const pron = subj.p === 0 ? 'I' : subj.p === 3 ? 'we' : he ? sheHe : 'they';
  const r = Math.random();
  if (r < 0.5) {
    const g = vForm('gostar', 'pres', subj.p);
    return { pt: sCap((ps ? ps + ' ' : '') + g + ' muito de ' + a[0] + ', mas não ' + g + ' de ' + b[0]) + '.',
      en: sCap(subj.en) + ' really ' + (he ? 'likes' : 'like') + ' ' + a[1] + ', but ' + pron + (he ? " doesn't" : " don't") + ' like ' + b[1] + '.' };
  }
  if (r < 0.75) {
    const [x, y] = shuffle([...sPick(SENT.prefer)]).slice(0, 2);
    return { pt: sCap((ps ? ps + ' ' : '') + vForm('preferir', 'pres', subj.p) + ' ' + x[0] + ' ' + (/^(o|a|os|as) /.test(y[0]) ? PT_PREP_JOIN.a[y[0].split(' ')[0]] + y[0].slice(y[0].indexOf(' ')) : 'a ' + y[0])) + '.',
      en: sCap(subj.en) + ' ' + (he ? 'prefers' : 'prefer') + ' ' + x[1] + ' to ' + y[1] + '.' };
  }
  return { pt: sCap((ps ? ps + ' ' : '') + vForm('adorar', 'pres', subj.p) + ' ' + a[0]) + '!', en: sCap(subj.en) + ' ' + (he ? 'loves' : 'love') + ' ' + a[1] + '!' };
}
// Two-line exchanges, using tu (friends) as Portuguese people do.
function sQA() {
  const me = SENT.people.find(p => p.kind === 'me');
  const kind = sPick(['what', 'what', 'where', 'where', 'with', 'when', 'how', 'clock', 'like', 'from', 'often']);
  if (kind === 'what') {
    const tense = sPick(['fut', 'past']);
    const time = sTime(tense, t => !t.long);
    const a = sActivity({ tense, subj: me, noTime: true });
    return [{ pt: '— O que ' + (tense === 'past' ? 'fizeste' : 'vais fazer') + ' ' + sLowerStart(time.pt) + '?', en: (tense === 'past' ? 'What did you do ' : 'What are you doing ') + time.en + '?' },
      { pt: '— ' + a.pt, en: a.en }];
  }
  if (kind === 'where' || kind === 'with' || kind === 'when') {
    const tense = sPick(['fut', 'past']);
    const m = sMotion({ tense, subj: me, noTime: kind !== 'where', noCompanion: kind === 'with' });
    if (!m || (kind !== 'where' && m.dest.kind === 'work')) return null;
    const goQ = tense === 'past' ? 'foste' : 'vais';
    if (kind === 'where') {
      const answer = sMotion({ tense, subj: me, noTime: true, dest: m.dest, noCompanion: true });
      return [{ pt: '— Onde ' + goQ + ' ' + sLowerStart(m.time.pt) + '?', en: (tense === 'past' ? 'Where did you go ' : 'Where are you going ') + m.time.en + '?' },
        { pt: '— ' + answer.pt, en: answer.en }];
    }
    if (kind === 'with') {
      const c = sCompanion(me);
      const v = tense === 'past' ? 'Fui' : 'Vou';
      return [{ pt: '— Com quem ' + goQ + ' ' + ptPrepJoin('a', m.dest) + '?', en: (tense === 'past' ? 'Who did you go to ' : 'Who are you going to ') + m.dest.en + ' with?' },
        { pt: '— ' + v + ' ' + c.pt + '.', en: (tense === 'past' ? 'I went ' : "I'm going ") + c.en + '.' }];
    }
    const t = sTime(tense, x => destOk(m.dest, x, tense));
    if (!t) return null;
    return [{ pt: '— Quando ' + goQ + ' ' + ptPrepJoin('a', m.dest) + '?', en: (tense === 'past' ? 'When did you go to ' : 'When are you going to ') + m.dest.en + '?' },
      { pt: '— ' + (tense === 'past' ? 'Fui' : 'Vou') + ' ' + sLowerStart(t.pt) + '.', en: (tense === 'past' ? 'I went ' : "I'm going ") + t.en + '.' }];
  }
  if (kind === 'how') {
    const d = sPick(SENT.destinations.filter(x => x.kind === 'work' || x.kind === 'city' || x.kind === 'town'));
    const tr = sPick(SENT.transport.filter(x => d.kind === 'city' ? x.trip : x.local));
    const toWork = d.kind === 'work';
    return [{ pt: '— Como ' + (toWork ? 'vais para o trabalho' : 'vais ' + ptPrepJoin('a', d)) + '?', en: toWork ? 'How do you get to work?' : 'How are you getting to ' + d.en + '?' },
      { pt: '— Vou ' + tr.pt + '.', en: (toWork ? 'I go ' : "I'm going ") + tr.en + '.' }];
  }
  if (kind === 'clock') {
    const r = sPick(SENT.reflexives);
    const h = sPick(r.hours), m = sPick([0, 0, 30]);
    const q = r.inf === 'levantar' ? 'te levantas' : 'te deitas';
    return [{ pt: '— A que horas ' + q + '?', en: 'What time do you ' + r.en[0] + '?' },
      { pt: '— ' + sCap(vReflexive(r.inf, 'pres', 0)) + ' ' + ptClock('a', h, m) + '.', en: 'I ' + r.en[0] + ' at ' + enClock(h, m) + '.' }];
  }
  if (kind === 'like') {
    const x = sPick(SENT.likes);
    const ans = sPick([['Gosto muito!', 'Yes, I love it!'], ['Gosto, sim.', 'Yes, I do.'], ['Não, não gosto nada.', "No, I don't like it at all."], ['Mais ou menos.', 'So-so.']]);
    return [{ pt: '— Gostas de ' + x[0] + '?', en: 'Do you like ' + x[1] + '?' }, { pt: '— ' + ans[0], en: ans[1] }];
  }
  if (kind === 'from') {
    const t = sPick(SENT.hometowns);
    return [{ pt: '— De onde és?', en: 'Where are you from?' }, { pt: '— Sou ' + ptPrepJoin('de', t) + '.', en: "I'm from " + t.en + '.' }];
  }
  const d = sPick(SENT.destinations.filter(x => ['night', 'town', 'culture'].includes(x.kind)));
  const ans = sPick([['Vou, sim. Vou todas as semanas.', 'Yes, I do. I go every week.'], ['Não, quase nunca.', 'No, hardly ever.'], ['Às vezes.', 'Sometimes.'], ['Vou, sim, ao fim de semana.', 'Yes, at weekends.']]);
  return [{ pt: '— Vais muitas vezes ' + ptPrepJoin('a', d) + '?', en: 'Do you often go to ' + d.en + '?' }, { pt: '— ' + ans[0], en: ans[1] }];
}
// Kept from the first version: ordering, asking the way, opening times.
function sOrder() {
  const f = sPick(SENT.orderFrames);
  const [a, b] = shuffle([...SENT.orders]).slice(0, 2);
  return { pt: f.pt.replace('{a}', a.pt).replace('{b}', b.pt), en: f.en.replace('{a}', a.en).replace('{b}', b.en) };
}
function sWhere() {
  const place = sPick(SENT.whereIs), d = sPick(SENT.directions.filter(x => !x.far || !place.near));
  return [{ pt: '— Onde fica ' + ptArticle(place) + '?', en: 'Where is ' + place.en + '?' }, { pt: '— ' + d.pt, en: d.en }];
}
function sOpening() {
  const place = sPick(SENT.opening);
  const opens = sChance(0.6);
  const h = opens ? 8 + Math.floor(Math.random() * 3) : 17 + Math.floor(Math.random() * 4);
  const m = sPick([0, 0, 30]);
  const vb = opens ? 'abre' : 'fecha';
  return [{ pt: '— A que horas ' + vb + ' ' + ptArticle(place) + '?', en: 'What time does ' + place.en + (opens ? ' open?' : ' close?') },
    { pt: '— ' + sCap(vb) + ' ' + ptClock('a', h, m) + '.', en: (opens ? 'It opens at ' : 'It closes at ') + enClock(h, m) + '.' }];
}
// QUESTIONS FROM A SENTENCE (2026-10-14). A plan or event is built from its
// slots (who, when, where, with whom, how, what), then one slot is asked
// about and answered the short way people do: "Quando é que o teu pai vai à
// farmácia?" - "Vai na segunda-feira." Asking about someone's family turns
// o meu into o teu; asking "you" uses tu (vocês for a group); "é que" after
// the question word is the everyday Portuguese way. Yes/no questions are
// answered by repeating the verb: "Vai, sim."
const POSS_YOUR = [[/^o meu /, 'o teu '], [/^a minha /, 'a tua '], [/^os meus /, 'os teus '], [/^as minhas /, 'as tuas ']];
function askWho(subj) {
  if (subj.kind === 'me') return { pt: '', p: 1, en: 'you', be: 'are', does: 'do' };
  if (subj.kind === 'we') return { pt: 'vocês', p: 4, en: 'you', be: 'are', does: 'do' };
  let pt = subj.pt;
  POSS_YOUR.forEach(([re, r]) => { pt = pt.replace(re, r); });
  const pl = subj.p === 4;
  return { pt, p: subj.p, en: subj.en.replace(/^my /, 'your '), be: pl ? 'are' : 'is', does: pl ? 'do' : 'does' };
}
function answerWho(subj) {
  if (subj.kind === 'me') return { p: 0, en: 'I' };
  if (subj.kind === 'we') return { p: 3, en: 'we' };
  return { p: subj.p, en: subj.p === 4 ? 'they' : subj.g === 'f' ? 'she' : 'he' };
}
const sQ = (word, who, rest) => sCap([word, word && 'é que', who.pt, rest].filter(Boolean).join(' ')) + '?';
// English question verb: "is your father going to eat" / "did you eat" /
// "does Ana eat". ing: use the -ing form for plans instead ("is he going",
// "are you getting") - for motion, where "going to go" sounds wrong.
function enQV(who, tense, base, ing) {
  if (tense === 'past') return 'did ' + who.en + ' ' + base;
  if (tense === 'hab') return who.does + ' ' + who.en + ' ' + base;
  return who.be + ' ' + who.en + ' ' + (ing || 'going to ' + base);
}
const enQ = (parts) => sCap(parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()) + '?';
// English answer: "He's going to eat salt cod", "I went", "She goes".
function enA(ans, tense, forms, ing, rest) {
  const third = ans.p === 2;
  let v;
  if (tense === 'past') v = forms[2];
  else if (tense === 'hab') v = third ? forms[1] : forms[0];
  else v = (ans.p === 0 ? 'am' : third ? 'is' : 'are') + ' ' + (ing || 'going to ' + forms[0]);
  return enTidy(sCap([ans.en, v, rest].filter(Boolean).join(' '))) + '.';
}
const enYes = (ans, tense) => 'Yes, ' + ans.en + ' ' + (tense === 'past' ? 'did' : tense === 'hab' ? (ans.p === 2 ? 'does' : 'do') : (ans.p === 0 ? 'am' : ans.p === 2 ? 'is' : 'are')) + '.';
function ptTenseForm(inf, tense, p) {
  if (tense === 'past') return vForm(inf, 'pret', p);
  if (tense === 'hab') return vForm(inf, 'pres', p);
  return vForm('ir', 'pres', p) + (inf === 'ir' ? '' : ' ' + inf);
}
function sAsk() {
  const subjFilter = s => ['me', 'we', 'family', 'friend', 'name'].includes(s.kind);
  const subj = sSubject(subjFilter);
  const who = askWho(subj), ans = answerWho(subj);
  const tense = sPick(['fut', 'fut', 'past', 'past', 'hab']);
  if (sChance(0.55)) {
    // Going somewhere.
    const m = sMotion({ subj, tense });
    if (!m || !m.time) return null;
    const go = ['go', 'goes', 'went'];
    const dest = ptPrepJoin('a', m.dest), time = sLowerStart(m.time.pt);
    const qv = vForm('ir', tense === 'past' ? 'pret' : 'pres', who.p);
    const av = sCap(vForm('ir', tense === 'past' ? 'pret' : 'pres', ans.p));
    const toDest = 'to ' + m.dest.en;
    const slots = ['when', 'where', 'yes'];
    if (m.comp) slots.push('with', 'with');
    if (m.tr) slots.push('how', 'how');
    const slot = sPick(slots);
    if (slot === 'when') return [
      { pt: '— ' + sQ('quando', who, qv + ' ' + dest), en: enQ(['when', enQV(who, tense, 'go', 'going'), toDest]) },
      { pt: '— ' + av + ' ' + time + '.', en: enA(ans, tense, go, 'going', m.time.en) }];
    if (slot === 'where') return [
      { pt: '— ' + sQ('onde', who, qv + ' ' + time), en: enQ(['where', enQV(who, tense, 'go', 'going'), m.time.en]) },
      sChance(0.5) ? { pt: '— ' + sCap(dest) + '.', en: sCap(toDest) + '.' } : { pt: '— ' + av + ' ' + dest + '.', en: enA(ans, tense, go, 'going', toDest) }];
    if (slot === 'with') return [
      { pt: '— ' + sQ('com quem', who, qv + ' ' + dest + ' ' + time), en: enQ(['who', enQV(who, tense, 'go', 'going'), toDest, 'with', m.time.en]) },
      { pt: '— ' + sCap(m.comp.pt) + '.', en: sCap(m.comp.en) + '.' }];
    if (slot === 'how') return [
      { pt: '— ' + sQ('como', who, qv + ' ' + dest), en: enQ(['how', enQV(who, tense, 'get', 'getting'), toDest]) },
      { pt: '— ' + av + ' ' + m.tr.pt + '.', en: enA(ans, tense, go, 'going', m.tr.en) }];
    return [
      { pt: '— ' + sCap([who.pt, qv, dest, time].filter(Boolean).join(' ')) + '?', en: enQ([enQV(who, tense, 'go', 'going'), toDest, m.time.en]) },
      { pt: '— ' + av + ', sim.', en: enYes(ans, tense) }];
  }
  // Doing something.
  const a = sActivity({ subj, tense });
  if (!a || !a.time) return null;
  const time = sLowerStart(a.time.pt);
  const objPt = a.obj[0], objEn = a.obj[1];
  const slots = ['what', 'what', 'when', 'yes'];
  if (a.place) slots.push('where', 'where');
  if (a.comp) slots.push('with');
  const slot = sPick(slots);
  const qVerb = ptTenseForm(a.act.verb, tense, who.p);
  const aVerb = sCap(ptTenseForm(a.act.verb, tense, ans.p));
  const placePt = a.place ? ptPrepJoin('em', a.place) : '';
  const ansRest = [objEn, a.place && a.place.en, a.comp && a.comp.en].filter(Boolean).join(' ');
  if (slot === 'what') {
    const qf = ptTenseForm('fazer', tense, who.p);
    const rest = [objPt, placePt, a.comp && a.comp.pt].filter(Boolean).join(' ');
    return [
      { pt: '— ' + sQ('o que', who, qf + ' ' + time), en: enQ(['what', enQV(who, tense, 'do'), a.time.en]) },
      { pt: '— ' + aVerb + ' ' + rest + '.', en: enA(ans, tense, a.forms, '', ansRest) }];
  }
  if (slot === 'when') return [
    { pt: '— ' + sQ('quando', who, qVerb + ' ' + objPt), en: enQ(['when', enQV(who, tense, a.forms[0]), objEn]) },
    { pt: '— ' + sCap(time) + '.', en: sCap(a.time.en) + '.' }];
  if (slot === 'where') return [
    { pt: '— ' + sQ('onde', who, qVerb + ' ' + objPt + ' ' + time), en: enQ(['where', enQV(who, tense, a.forms[0]), objEn, a.time.en]) },
    { pt: '— ' + sCap(placePt) + '.', en: sCap(a.place.en) + '.' }];
  if (slot === 'with') return [
    { pt: '— ' + sQ('com quem', who, qVerb + ' ' + objPt + ' ' + time), en: enQ(['who', enQV(who, tense, a.forms[0]), objEn, 'with', a.time.en]) },
    { pt: '— ' + sCap(a.comp.pt) + '.', en: sCap(a.comp.en) + '.' }];
  const shortV = sCap(tense === 'fut' ? vForm('ir', 'pres', ans.p) : tense === 'past' ? vForm(a.act.verb, 'pret', ans.p) : vForm(a.act.verb, 'pres', ans.p));
  return [
    { pt: '— ' + sCap([who.pt, qVerb, objPt, time].filter(Boolean).join(' ')) + '?', en: enQ([enQV(who, tense, a.forms[0]), objEn, a.time.en]) },
    { pt: '— ' + shortV + ', sim.', en: enYes(ans, tense) }];
}
// Giving and already / not yet for the sentence card (2026-11-05), built by
// the sentence builder's own target maker so the two always agree.
function sbSentenceFor(mode) {
  const keep = [sbMode, sbReverse];
  sbMode = mode; sbReverse = false;
  let t = null;
  try { t = sbNewTarget(); } finally { [sbMode, sbReverse] = keep; }
  if (!t) return null;
  // eu / nós are usually left out in speech.
  const pt = t.pt.replace(/^(Eu|Nós) (\S)/, (m, w, c) => c.toUpperCase());
  return { pt, en: t.en };
}
function sGive() {
  if (sChance(0.3)) {
    // "A quem é que deste o livro?" - "Ao meu irmão."
    const keep = [sbMode, sbReverse]; sbMode = 'give'; sbReverse = false;
    let t = null;
    try { t = sbNewTarget(); } finally { [sbMode, sbReverse] = keep; }
    if (!t || t.sel.who.p !== 0 || t.sel.verb.act.askFor || t.sel.when.group === 'ja') return null;
    const S = t.sel, tense = S.form.tense;
    const q = tense === 'fut' ? 'vais ' + S.verb.pt : vForm(S.verb.pt, tense, 1);
    const forms = S.what.forms || S.verb.act.en;
    const enQ = tense === 'pret' ? `Who did you ${forms[0]} ${S.what.en} to?` : tense === 'fut' ? `Who are you going to ${forms[0]} ${S.what.en} to?` : `Who do you ${forms[0]} ${S.what.en} to?`;
    return [{ pt: `— A quem é que ${q} ${S.what.pt}?`, en: enQ }, { pt: '— ' + sCap(S.toWhom.pt) + '.', en: sCap('to ' + S.toWhom.en) + '.' }];
  }
  return sbSentenceFor('give');
}
// "Já comeste bacalhau?" - "Já. Comi ontem." / "Ainda não."
function sAlready() {
  const yes = sChance(0.6);
  if (sChance(0.4)) {
    const d = sPick(SENT.destinations.filter(x => x.kind === 'city' || x.kind === 'far' || x.kind === 'culture'));
    const t = sTime('past', x => destOk(d, x, 'past'));
    return [{ pt: `— Já foste ${ptPrepJoin('a', d)}?`, en: `Have you been to ${d.en} yet?` },
      yes && t ? { pt: `— Já. Fui ${sLowerStart(t.pt)}.`, en: `Yes, I went ${t.en}.` } : { pt: '— Ainda não. Vou para o ano.', en: 'Not yet. I\'m going next year.' }];
  }
  const act = sPick(SENT.activities.filter(a => !a.rare && a.verb !== 'tomar'));
  const o = sPick(act.objs);
  const forms = o[2] || act.en;
  const t = sTime('past', x => !x.long);
  return [{ pt: `— Já ${vForm(act.verb, 'pret', 1)} ${o[0]}?`, en: `Have you ${enPP(forms)} ${o[1]} yet?` },
    yes ? { pt: `— Já. ${sCap(vForm(act.verb, 'pret', 0))} ${sLowerStart(t.pt)}.`, en: `Yes - ${t.en}.` } : { pt: '— Ainda não.', en: 'Not yet.' }];
}
const SENTENCE_PATTERNS = [[sAsk, 3], [sGive, 1.5], [sAlready, 1.2], [sActivity, 4], [sMotion, 3], [sQA, 4], [sRoutine, 1.5], [sJob, 1], [sDescribe, 1.5], [sWeather, 1], [sLikes, 1.5], [sOrder, 0.8], [sWhere, 0.8], [sOpening, 0.6]];
const recentSentences = [];
function generateSentence() {
  if (!SENT) return null;
  const total = SENTENCE_PATTERNS.reduce((a, p) => a + p[1], 0);
  for (let tries = 0; tries < 40; tries++) {
    let r = Math.random() * total, fn = SENTENCE_PATTERNS[0][0];
    for (const [f, w] of SENTENCE_PATTERNS) { if ((r -= w) < 0) { fn = f; break; } }
    let out;
    try { out = fn(); } catch (e) { out = null; }
    if (!out) continue;
    const lines = Array.isArray(out) ? out : [{ pt: out.pt, en: out.en }];
    if (recentSentences.includes(lines[0].pt)) continue;
    recentSentences.push(lines[0].pt);
    if (recentSentences.length > 30) recentSentences.shift();
    return lines;
  }
  return null;
}
function renderSentence(elId) {
  const el = document.getElementById(elId || 'greeting-sentence');
  if (!el) return;
  const lines = generateSentence();
  if (!lines) { el.style.display = 'none'; return; }
  el.style.display = '';
  el.innerHTML = `<div class="greet-sentence-head"><span>${lines.length > 1 ? 'A short exchange' : 'A sentence'}</span>` +
    `<button type="button" class="greet-another" title="Another one" aria-label="Another sentence">↻</button></div>` +
    lines.map(l => `<div class="greet-line greet-sent" data-say="${escapeHtmlText(l.pt.replace(/^— /, ''))}"><div class="greet-pt">${escapeHtmlText(l.pt)}</div><div class="greet-en">${escapeHtmlText(l.en)}</div></div>`).join('');
  el.querySelector('.greet-another').onclick = () => renderSentence(el.id);
  el.querySelectorAll('.greet-sent').forEach(l => { l.onclick = () => speakTarget(l.dataset.say); });
}
