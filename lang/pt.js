(window.__BUILD_FILES = window.__BUILD_FILES || {})["lang/pt.js"] = "2611072103";
// Portuguese (as spoken in Portugal) - the language module.
//
// Everything about Portuguese that is a rule rather than a list lives here,
// behind the same method names every language module will have (see the
// shared-core design, "Language module"). The app never needs to know it's
// Portuguese: it calls LANG.numberToWords(2026) and gets "dois mil e vinte e
// seis". Lists - words, verbs, sentence parts - stay in the data files.
//
// Step 3 of the plan (2026-11-06): numbers and times. Moved here unchanged
// from the app; the golden outputs check they still say exactly the same.
// Step 4: typed-answer comparison. Conjugation, joins (a + o = ao) and
// agreement follow in later steps.

const UNITS = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
  'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezasseis', 'dezassete', 'dezoito', 'dezanove'];
const TENS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const HUNDREDS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
// Brazilian spellings of the teens, accepted when typing (see numberQuestion).
const TEENS_BR = { 'catorze': 'quatorze', 'dezasseis': 'dezesseis', 'dezassete': 'dezessete', 'dezanove': 'dezenove' };

// 0-999. feminine: uma / duas / duzentas… (for hours, and for feminine nouns).
function belowThousand(n, feminine) {
  if (n === 100) return 'cem';
  const parts = [];
  const h = Math.floor(n / 100), rest = n % 100;
  if (h) parts.push(feminine && h >= 2 ? HUNDREDS[h].replace(/os$/, 'as') : HUNDREDS[h]);
  if (rest || !h) {
    let r;
    if (rest < 20) r = UNITS[rest];
    else {
      const t = Math.floor(rest / 10), u = rest % 10;
      r = TENS[t] + (u ? ' e ' + UNITS[u] : '');
    }
    if (feminine) r = r.replace(/\bum$/, 'uma').replace(/\bdois$/, 'duas');
    if (!(h && rest === 0)) parts.push(r);
  }
  return parts.join(' e ');
}
// 0-999,999. Rules: "mil" not "um mil"; "e" after mil only when what follows
// is under 100 or a round hundred (mil e cem, dois mil e cinco, but mil
// duzentos e cinquenta).
function numberToWords(n) {
  if (n < 1000) return belowThousand(n);
  const th = Math.floor(n / 1000), rest = n % 1000;
  const thWords = th === 1 ? 'mil' : belowThousand(th) + ' mil';
  if (!rest) return thWords;
  const joiner = (rest < 100 || rest % 100 === 0) ? ' e ' : ' ';
  return thWords + joiner + belowThousand(rest);
}
function numberToBrazilian(words) {
  return words.replace(/\b(catorze|dezasseis|dezassete|dezanove)\b/g, w => TEENS_BR[w]);
}
function formatNumber(n) {
  // Portugal groups thousands with a space from 5 digits up (10 000); 4 digits stay together.
  return n >= 10000 ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : String(n);
}

// How each frame joins the hour: plural (as duas), singular (a uma), or
// masculine (o meio-dia).
function frameLead(frame, kind) {
  const table = {
    at: { pl: 'às', sg: 'à', m: 'ao' },
    until: { pl: 'até às', sg: 'até à', m: 'até ao' },
    from: { pl: 'a partir das', sg: 'a partir da', m: 'a partir do' },
    around: { pl: 'por volta das', sg: 'por volta da', m: 'por volta do' },
  };
  return table[frame][kind];
}
function minuteWords(m) {
  if (m === 15) return 'um quarto';
  if (m === 30) return 'meia';
  return belowThousand(m);
}
function dayPeriod(h24) {
  if (h24 >= 6 && h24 < 12) return 'da manhã';
  if (h24 >= 12 && h24 < 20) return 'da tarde';
  if (h24 >= 20) return 'da noite';
  return 'da madrugada';
}
// Returns the Portuguese for a time. style: 'everyday' | 'timetable'.
// kind = how a frame joins the hour: 'pl' (as duas), 'sg' (a uma, a
// meia-noite) or 'm' (o meio-dia).
function timeToWords(h24, m, frame, style) {
  let core, kind;
  if (style === 'timetable') {
    if (h24 === 0) {
      core = 'meia-noite' + (m ? ' e ' + belowThousand(m) : '');
      kind = 'sg';
    } else {
      const hw = belowThousand(h24, true); // treze, vinte e uma, vinte e duas
      core = m ? hw + ' e ' + belowThousand(m) : hw + (h24 === 1 ? ' hora' : ' horas');
      kind = h24 === 1 ? 'sg' : 'pl';
    }
  } else {
    // Everyday: past the half-hour (in fives) says the NEXT hour "menos" the gap.
    let hourIdx = h24, mins = m, menos = false;
    if (m > 30 && m % 5 === 0) { hourIdx = (h24 + 1) % 24; mins = 60 - m; menos = true; }
    if (hourIdx === 12) { core = 'meio-dia'; kind = 'm'; }
    else if (hourIdx === 0) { core = 'meia-noite'; kind = 'sg'; }
    else {
      const h12 = hourIdx % 12 || 12;
      core = belowThousand(h12, true);
      kind = h12 === 1 ? 'sg' : 'pl';
    }
    const named = hourIdx !== 12 && hourIdx !== 0;
    if (mins) core += (menos ? ' menos ' : ' e ') + minuteWords(mins);
    else if (named) core += kind === 'sg' ? ' hora' : ' horas';
    if (named) core += ' ' + dayPeriod(hourIdx);
  }
  const lead = frame === 'none' ? (kind === 'pl' ? 'São' : 'É') : frameLead(frame, kind);
  return lead + ' ' + core;
}

// ---------- Typed answers ----------
// Marking rules (2026-10-10, moved here 2026-11-06):
//  - case, extra spaces and end punctuation never matter
//  - the word, any listed alternative (alt), or any part of an "a / b"
//    entry counts; the Brazilian form counts too, with a note
//  - a noun typed without its article (comboio for o comboio) counts, with a
//    reminder - the article is how the gender is learnt
//  - right letters, wrong or missing accents: counts with a reminder (the app
//    gives half the usual confidence boost, or marks it wrong when Settings >
//    "Accents must be right" is on)
//  - right noun, wrong article (a comboio): wrong, but the app says so
const ARTICLE_RE = /^(o|a|os|as)\s+/;
function normalise(str) {
  return (str || '').normalize('NFC').toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[.!?¡¿,;:…]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function stripAccents(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '');
}
// accepted: [{ form, kind }] already normalised; given: what was typed.
// Returns { match: { kind, accentSlip, noArticle, form } | null,
//           wrongArticle: the accepted form | null }.
function compareTyped(accepted, given) {
  const typed = normalise(given);
  let match = null;
  if (typed) {
    for (const f of accepted) {
      const bare = f.form.replace(ARTICLE_RE, '');
      const candidates = [[f.form, false], [bare, bare !== f.form]];
      for (const [cand, noArticle] of candidates) {
        if (typed === cand) { match = { kind: f.kind, accentSlip: false, noArticle, form: f.form }; break; }
        if (!match && stripAccents(typed) === stripAccents(cand)) match = { kind: f.kind, accentSlip: true, noArticle, form: f.form };
      }
      if (match && !match.accentSlip) break;
    }
  }
  let wrongArticle = null;
  if (!match && ARTICLE_RE.test(typed)) {
    const typedBare = stripAccents(typed.replace(ARTICLE_RE, ''));
    const f = accepted.find(f => ARTICLE_RE.test(f.form) && stripAccents(f.form.replace(ARTICLE_RE, '')) === typedBare);
    if (f) wrongArticle = f.form;
  }
  return { match, wrongArticle };
}

// ---------- Speech ----------
// A European Portuguese voice is wanted (pt-PT): a Brazilian voice sounds
// very different (open vowels, "tch" for ti/di), so it's only a fallback,
// and the app says so. iPhone/iPad: Joana or Catarina (pt-PT) can be added
// in Settings > Accessibility > Spoken Content > Voices.
function pickVoice(voices) {
  const norm = v => (v.lang || '').toLowerCase().replace('_', '-');
  const best = voices.find(v => norm(v) === 'pt-pt');
  const other = voices.find(v => norm(v).startsWith('pt'));
  return { voice: best || other || null, fallback: !best && !!other };
}

export default {
  id: 'pt',
  code: 'pt-PT',
  pickVoice,           // (device voices) -> { voice, fallback }: Portugal first, Brazil with a note
  numberToWords,       // 0-999 999: "mil duzentos e cinquenta"
  belowThousand,       // 0-999, feminine optional: "duas", "duzentas"
  numberToBrazilian,   // the Brazilian teens: dezesseis, dezenove
  formatNumber,        // digits as written in Portugal: 10 000
  timeToWords,         // (h24, m, frame, style): "às duas e dez da tarde"
  minuteWords,         // "um quarto", "meia", "vinte" (used by ptClock)
  normalise,           // lower case, no end punctuation, accents kept
  compareTyped,        // (accepted forms, typed): accent slips, missing or wrong article
};
