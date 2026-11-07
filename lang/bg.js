(window.__BUILD_FILES = window.__BUILD_FILES || {})["lang/bg.js"] = "2611072103";
// Bulgarian - the language module (2026-11-07, on the cyrillic branch).
// The rules of Bulgarian the core needs: how a word is read in Latin letters
// (Bulgaria's official system, as on road signs: СОФИЯ - Sofia), comparing a
// typed answer, and choosing a voice.

// Bulgaria's official transliteration (the 2009 law, "Streamlined System").
const TR = { А: 'a', Б: 'b', В: 'v', Г: 'g', Д: 'd', Е: 'e', Ж: 'zh', З: 'z', И: 'i', Й: 'y', К: 'k', Л: 'l', М: 'm', Н: 'n', О: 'o', П: 'p', Р: 'r', С: 's', Т: 't', У: 'u', Ф: 'f', Х: 'h', Ц: 'ts', Ч: 'ch', Ш: 'sh', Щ: 'sht', Ъ: 'a', Ь: 'y', Ю: 'yu', Я: 'ya' };
// The law spells the country's own name the familiar way.
const EXCEPTIONS = { 'БЪЛГАРИЯ': 'Bulgaria' };
// A word in Cyrillic, read in Latin letters: -ИЯ at the end of a word is -ia,
// each word starts with a capital (signs are written in capitals).
function reading(text) {
  return String(text).split(' ').map(part => {
    if (EXCEPTIONS[part.toUpperCase()]) return EXCEPTIONS[part.toUpperCase()];
    const up = part.toUpperCase().replace(/ИЯ$/, 'IA');
    const out = [...up].map(c => TR[c] !== undefined ? TR[c] : c.toLowerCase()).join('').toLowerCase();
    return out.charAt(0).toUpperCase() + out.slice(1);
  }).join(' ');
}

function normalise(str) {
  return (str || '').normalize('NFC').toLowerCase().replace(/[.!?,;:…]+/g, ' ').replace(/\s+/g, ' ').trim();
}
// A typed answer counts in Cyrillic, or in its Latin reading.
function compareTyped(accepted, given) {
  const typed = normalise(given);
  if (!typed) return { match: null, wrongArticle: null };
  for (const f of accepted) {
    if (typed === f.form || typed === normalise(reading(f.form))) return { match: { kind: f.kind, accentSlip: false, noArticle: false, form: f.form }, wrongArticle: null };
  }
  return { match: null, wrongArticle: null };
}

function pickVoice(voices) {
  const norm = v => (v.lang || '').toLowerCase().replace('_', '-');
  const best = voices.find(v => norm(v) === 'bg-bg') || voices.find(v => norm(v).startsWith('bg'));
  return { voice: best || null, fallback: false };
}

export default {
  id: 'bg',
  code: 'bg-BG',
  reading,          // СОФИЯ -> Sofia: a word's second face, worked out by rule
  normalise,
  compareTyped,
  pickVoice,
};
