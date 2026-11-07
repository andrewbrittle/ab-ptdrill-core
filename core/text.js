(window.__BUILD_FILES = window.__BUILD_FILES || {})["core/text.js"] = "2611072154";
// Português Drill - The core: interface text (2026-11-07, refactor step 8).
//
// Every word on screen that isn't the language being learnt comes from a
// table in the learner's language - ui/en.js for English - looked up by
// meaning: tx('drill.correct') -> "Correct!". Swap the table and the whole
// app speaks another language; the code doesn't change.
//
//   tx(key)                the text
//   tx(key, { n: 3 })      fills {n} ({target} is filled in for you - the
//                          language being learnt); an entry can also be { one, other }
//                          for "1 word" / "3 words" (the browser's own
//                          plural rules for the learner's language)
//   In the page: data-t="key" sets an element's text, data-t-html its
//   inner HTML, data-t-attr="title:key,aria-label:key" its attributes.
//   applyPageText(root) fills them in; it runs once here, before the rest
//   of the app starts.
const UI_PLURALS = new Intl.PluralRules(window.UI_LANG || 'en');
function tx(key, vars) {
  let v = window.UI_TEXT[key];
  if (v === undefined) { console.warn('missing text: ' + key); return key; }
  if (typeof v === 'object') v = v[UI_PLURALS.select(vars && vars.n)] || v.other;
  // {target} is always the language being learnt, in the learner's language.
  const all = Object.assign({ target: window.UI_TEXT['lang.' + (window.LANG && LANG.id)] || window.UI_TEXT['target.name'] }, vars);
  return v.replace(/\{(\w+)\}/g, (m, k) => (k in all ? all[k] : m));
}
function applyPageText(root) {
  const r = root || document;
  r.querySelectorAll('[data-t]').forEach(el => { el.textContent = tx(el.dataset.t); });
  r.querySelectorAll('[data-t-html]').forEach(el => { el.innerHTML = tx(el.dataset.tHtml); });
  r.querySelectorAll('[data-t-attr]').forEach(el => {
    el.dataset.tAttr.split(',').forEach(pair => {
      const [attr, key] = pair.split(':');
      el.setAttribute(attr, tx(key));
    });
  });
}
applyPageText();
