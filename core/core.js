(window.__BUILD_FILES = window.__BUILD_FILES || {})["core/core.js"] = "2611072109";
// Português Drill - The core: everything the drill apps share - word lists and Groups, tile
// selection, search, the drill modes, navigation, speech, settings, install
// card, scores with decay and weighted picking, backup, saved sessions,
// sections and Group cards. Nothing Portuguese belongs here: rules come from
// LANG (lang/pt.js), lists from the data files, features from pt/.
// Split out of app.js on 2026-11-07 (refactor step 6); code unchanged.

// =============================================================================
// The core: everything every drill app shares. It began as the Japanese
// drill app's engine, copied for Portuguese on 2026-10-10 and separated into
// core/ in November 2026. Words in the language being learnt are read from
// item.jp (see ADAPTER); scores are kept under 'jp|en' keys, which stay as
// they are so saved progress is always found.
// =============================================================================

// VOCAB lives in vocab.js, loaded by the <script src> just before this one.
// The app's word lists. DRILL_VOCAB / DRILL_GROUPS / DRILL_SECTIONS, or the
// names Portuguese's vocab.js has always used (PT_DRILL_...).
window.DRILL_VOCAB = window.DRILL_VOCAB || window.PT_DRILL_VOCAB;
window.DRILL_GROUPS = window.DRILL_GROUPS || window.PT_DRILL_GROUPS;
window.DRILL_SECTIONS = window.DRILL_SECTIONS || window.PT_DRILL_SECTIONS;
if (!window.DRILL_VOCAB) {
  document.body.insertAdjacentHTML('afterbegin', '<div style="margin:1rem;padding:1rem;border:1.5px solid #e5484d;border-radius:12px;color:#e5484d;font:600 15px/1.4 sans-serif;text-align:center;">' + tx('words.notLoaded') + '</div>');
  throw new Error('vocab.js did not load');
}
const VOCAB = window.DRILL_VOCAB;

// ADAPTER. vocab.js writes each word as
//   { pt, en, tags, dateAdded, br?, alt?, note? }
// and the core reads item.jp for the word in the language being learnt (a
// name kept from the Japanese engine it grew from). Each item gets jp = pt
// here, once, so nothing else needs to know.
function adaptItem(item) {
  // A word list's word is `word` (any language) or `pt` (Portuguese's lists).
  if (item.jp === undefined) item.jp = typeof item.word === 'string' ? item.word : item.pt;
  if (!Array.isArray(item.tags)) item.tags = [];
  return item;
}
Object.keys(VOCAB).forEach(k => VOCAB[k].items.forEach(item => { adaptItem(item); item.cat = k; }));

// PRIVATE VOCAB PACKS (2026-10-02) - extra categories kept OUT of the
// published app (e.g. textbook word lists, which shouldn't sit on a public
// site) and loaded per device from a JSON file via Settings > Private vocab.
// The file is stored in this browser's localStorage and merged into VOCAB
// here, before anything else reads VOCAB. A pack can only ADD categories -
// a key that already exists in the app's own data is skipped, never
// overwritten. Pack categories get privatePack:true. File format:
//   {"format":"pt-drill-private-vocab","version":1,"name":"…",
//    "categories":{"vocab-…":{level,label,chars,tagQuery,items:[…]}}}
// with categories shaped exactly like VOCAB entries.
const PRIVATE_VOCAB_KEY = APP.storagePrefix + 'PrivateVocab';
const PRIVATE_VOCAB_KEYS = [];
// About the loaded file, for the Settings status line: its own "updated"
// date, and how many of its words the app already has. Those are skipped
// (2026-10-02) - a word that's moved from the private file into the taught
// course would otherwise show twice - and a non-zero count means the file
// on this device is out of date, so Settings flags "check your file".
const PRIVATE_VOCAB_INFO = { updated: null, skipped: 0 };
function validatePrivateVocabPack(pack) {
  if (!pack || typeof pack !== 'object' || pack.format !== 'pt-drill-private-vocab') return tx('private.notAFile');
  const cats = pack.categories;
  if (!cats || typeof cats !== 'object' || Array.isArray(cats) || !Object.keys(cats).length) return tx('private.noLists');
  for (const key of Object.keys(cats)) {
    const c = cats[key];
    if (!c || typeof c.label !== 'string' || !Array.isArray(c.items)) return tx('private.listDamaged');
    for (const it of c.items) {
      if (!it || typeof it.pt !== 'string' || typeof it.en !== 'string' || !Array.isArray(it.tags)) return tx('private.wordDamaged');
    }
  }
  return null;
}
(function loadPrivateVocab() {
  try {
    const raw = localStorage.getItem(PRIVATE_VOCAB_KEY);
    if (!raw) return;
    const pack = JSON.parse(raw);
    if (validatePrivateVocabPack(pack)) return;
    PRIVATE_VOCAB_INFO.updated = typeof pack.updated === 'string' ? pack.updated : null;
    const appWords = new Set();
    Object.keys(VOCAB).forEach(k => VOCAB[k].items.forEach(i => appWords.add(i.jp + '|' + i.en)));
    Object.keys(pack.categories).forEach(key => {
      if (VOCAB[key]) return; // never override the app's own data
      const cat = pack.categories[key];
      const items = cat.items.map(adaptItem).filter(i => !appWords.has(i.jp + '|' + i.en));
      PRIVATE_VOCAB_INFO.skipped += cat.items.length - items.length;
      VOCAB[key] = Object.assign({}, cat, { items, privatePack: true });
      PRIVATE_VOCAB_KEYS.push(key);
    });
  } catch (e) { /* storage unavailable or corrupt - app runs without the pack */ }
})();

// Themes bring together items from several existing VOCAB categories into one
// selectable/drillable screen, without touching or duplicating the source
// categories' own data. A theme's item pool is computed fresh each time its
// screen is opened (see getThemePool), not stored - so it always reflects the
// current custom-content toggle and the latest source-category contents.
// Deliberately starting with just 2 concrete themes rather than a full set -
// this is the pilot that will show what the mechanism needs to handle before
// more themes get added.
// Each theme declares its source categories either as `groups` (a list of
// visual/divider blocks - every category within one block is merged together
// and alphabetized as a single unit, with a gold divider drawn between
// blocks) or as `noSort: true` with a flat `sources` list (left completely
// untouched, in original insertion order, no dividers) - used for themes
// like Days and times where the taught order IS the content and sorting
// would actively hurt reference use.
// Groups come from vocab.js (window.PT_DRILL_GROUPS) - moved out of the app
// code 2026-10-11. THEMES keeps its old shape (key -> definition) so
// everything that reads it is unchanged; order = the order in vocab.js.
const THEMES = {};
(window.DRILL_GROUPS || []).forEach(g => { THEMES[g.key] = g; });

// itemTierVisible below is the single gate on which items show, so a hidden
// tier could be added later with no change here.
//
// For noSort themes, items come back in the same flat original order as
// before (unchanged behavior). For grouped themes, each group's categories
// are concatenated, sorted together by `en` (case-insensitive, stable so
// true ties keep their original relative order), and every item is tagged
// with `dividerGroup` = its group's index - buildVocabTileGrid uses that to
// draw a divider between groups.
// Tag-query matching, shared by getThemePool's tagQuery branch below and
// resolveVocabCategory's tagQuery branch: a query is either a single tag
// string (item just needs that one tag - how every tagQuery so far has
// worked, e.g. 'weather', 'shopping') or an array of tags, in which case
// the item needs ALL of them (AND, not OR). The array form is what makes
// a query like ['food','shopping'] work - it picks out only the words that
// carry both.
// {any:[...]} added 2026-08-27 - OR, item needs ANY ONE of these tags.
// For Collections that are really just a union of a few whole categories
// that already have their own topic tag (Transport+UK Places,
// Countries+Cities, etc.) - see the THEMES entries using this shape.
// Deliberately its own wrapper rather than reusing a bare array for OR -
// a bare array already means AND above, and letting one shape mean two
// different things would be exactly the kind of implicit behavior this
// file has tried to avoid all session.
// IMPORTANT: converting a THEMES entry from `groups:[[...],[...]]` to
// `tagQuery:{any:[...]}` is NOT purely internal the way the AND
// flip was. `groups` alphabetizes within each named group and stamps
// dividerGroup so the UI draws a line between groups (see
// buildCategoryItems/getThemePool below); tagQuery returns one flat,
// fully-interleaved alphabetical list with no dividerGroup at all. Word
// membership can end up identical while the on-screen grouping still
// visibly changes - check that before swapping any Collection over,
// don't assume it's silent just because the AND flip was.
function tagQueryMatches(itemTags, query) {
  if (!itemTags) return false;
  if (query && typeof query === 'object' && !Array.isArray(query) && query.any) {
    // optional `all` (2026-10-07): every one of these too - e.g. any of
    // food-type/drink AND taught, for the taught-only Food & drink Group.
    if (query.all && !query.all.every(tag => itemTags.includes(tag))) return false;
    // An entry can be a list of tags (2026-10-07) = one divider group, e.g.
        // ['occupations', 'occupations-2'] - same kind of word, two tags.
    return query.any.some(entry => (Array.isArray(entry) ? entry : [entry]).some(tag => itemTags.includes(tag)));
  }
  const required = Array.isArray(query) ? query : [query];
  return required.every(tag => itemTags.includes(tag));
}

function getThemePool(themeKey) {
  const theme = THEMES[themeKey];
  if (!theme) return [];
  if (theme.latestWords) {
    // Range pills on its selection screen: '1w' / '2w' = words ADDED in the
    // newest week / two weeks of additions (by dateAdded).
    const taught = getCoreVocabPool();
    const byEn = (a, b) => a.en.toLowerCase() < b.en.toLowerCase() ? -1 : 1;
    const range = appSettings.latestWordsRange || 'batch';
    const dated = taught.filter(i => i.dateAdded);
    if (!dated.length) return [];
    const newest = dated.reduce((m, i) => (i.dateAdded > m ? i.dateAdded : m), '');
    // 'batch' (Portuguese build): just the words from the newest date - a
    // whole new vocabulary arrives at once here, so a week covers everything.
    if (range === 'batch') return dated.filter(i => i.dateAdded === newest).sort(byEn);
    const from = new Date(newest + 'T00:00:00Z'); from.setUTCDate(from.getUTCDate() - (range === '2w' ? 13 : 6));
    const cutoff = from.toISOString().slice(0, 10);
    return dated.filter(i => i.dateAdded >= cutoff).sort(byEn);
  }

  function buildCategoryItems(catKey) {
    const cat = VOCAB[catKey];
    if (!cat) return [];
    return cat.items
      .filter(itemTierVisible)
      .map(item => Object.assign({ level: cat.level || 1, groupKey: catKey }, item));
  }

  // Tag-query themes - membership isn't a hand-picked list of whole
  // categories (like sources/groups below), it's "every item anywhere that
  // carries this tag", found by scanning every category once. Still respects
    // itemTierVisible per item, same as buildCategoryItems above. This is
  // deliberately the same membership concept as sources/groups (a named,
  // curated pool of words to drill) just resolved a different way - a word
  // doesn't need to be duplicated or manually added to a category list to
  // show up here, it just needs the tag, wherever it happens to actually
  // live.
  if (theme.tagQuery) {
    const items = [];
    Object.keys(VOCAB).forEach(catKey => {
      buildCategoryItems(catKey).forEach(item => {
        if (tagQueryMatches(item.tags, theme.tagQuery)) items.push(item);
      });
    });
    // {any:[...]} OR queries get dividerGroup treatment same as `groups`
    // below - grouped by which "any" tag matched (in the order that tag
    // appears in the any list), alphabetized within each group, so a
    // Collection like Core grammar words can move from a hand-picked
    // groups list to a tag query without losing the divider between
    // Verbs and Adjectives (added 2026-08-27 - a flat interleaved list
    // turned out to genuinely read worse for a mixed-part-of-speech
    // Collection like that one, not just "different").
    const anyQuery = theme.tagQuery && typeof theme.tagQuery === 'object' && !Array.isArray(theme.tagQuery) ? theme.tagQuery.any : null;
    if (anyQuery) {
      return items
        .map((item, idx) => ({
          item, idx,
          groupIndex: anyQuery.findIndex(entry => item.tags && (Array.isArray(entry) ? entry : [entry]).some(tag => item.tags.includes(tag))),
        }))
        .sort((a, b) => {
          if (a.groupIndex !== b.groupIndex) return a.groupIndex - b.groupIndex;
          const ak = a.item.en.toLowerCase(), bk = b.item.en.toLowerCase();
          if (ak < bk) return -1;
          if (ak > bk) return 1;
          return a.idx - b.idx;
        })
        .map(({ item, groupIndex }) => Object.assign({ dividerGroup: groupIndex }, item));
    }
    return sortItemsAlphabetically(items);
  }

  if (theme.noSort) {
    const items = [];
    theme.sources.forEach(catKey => {
      buildCategoryItems(catKey).forEach(item => items.push(item));
    });
    return items;
  }

  const items = [];
  (theme.groups || []).forEach((groupCatKeys, groupIndex) => {
    const groupItems = [];
    groupCatKeys.forEach(catKey => {
      buildCategoryItems(catKey).forEach(item => groupItems.push(item));
    });
    groupItems
      .map((item, idx) => ({ item, idx }))
      .sort((a, b) => {
        const ak = a.item.en.toLowerCase(), bk = b.item.en.toLowerCase();
        if (ak < bk) return -1;
        if (ak > bk) return 1;
        return a.idx - b.idx;
      })
      .forEach(({ item }) => items.push(Object.assign({ dividerGroup: groupIndex }, item)));
  });
  return items;
}

// Alphabetical by English meaning, case-insensitive, stable (true ties keep
// their original relative order) - same comparator as the grouped-theme sort
// above. Used to sort a plain VOCAB category's tile-selection view without
// touching the underlying stored array (see resolveVocabCategory) - that way
// Materials keeps its chronological/photo-order items array (dateAdded,
// source, etc. all still make sense read in that order) while what the user
// actually browses to pick words to drill is always alphabetical, same as
// every other category. Computed fresh each call rather than pre-sorted by
// hand in the data - cheap at this scale, and removes the maintenance chore
// of manually re-alphabetizing VOCAB every time a word gets added or edited
// (which is how lists used to end up out of order).
function sortItemsAlphabetically(items) {
  return items
    .map((item, idx) => ({ item, idx }))
    .sort((a, b) => {
      const ak = a.item.en.toLowerCase(), bk = b.item.en.toLowerCase();
      if (ak < bk) return -1;
      if (ak > bk) return 1;
      return a.idx - b.idx;
    })
    .map(({ item }) => item);
}

// Synthesized theme "categories" are kept in their own cache, deliberately
// separate from VOCAB itself - merging them into VOCAB would make every
// Object.keys(VOCAB) scan (startRandomMatchEverything, buildMatchCategoryList,
// etc.) double-count items that a theme pulls in from existing categories.
// Rebuilt on every call rather than memoized long-term, so a theme screen
// always reflects the current custom-content toggle state.
const THEME_CACHE = {};
function resolveVocabCategory(key) {
  if (VOCAB[key]) {
    const cat = VOCAB[key];
    // FLIP PILOT (2026-08-26) - tagQuery on a VOCAB entry (as opposed to a
    // THEMES entry) means this category's display is sourced by scanning for
    // the tag rather than reading `items` directly, even though `items`
    // still physically stores the words. Deliberately does NOT reuse
    // getThemePool's tagQuery branch or buildCategoryItems - both stamp
    // `level`/`groupKey` onto every item for the theme-pooled border-colour
    // feature (see LEVEL_BORDER_COLORS), which is correct for a multi-source
    // Collection but would be a visible regression here: a single-category
    // screen like this has never shown tier-coloured borders, and gaining
    // them now (just because the resolution mechanism changed) would be
    // exactly the kind of "nobody asked for this" side effect the flip is
    // supposed to avoid. So this scan intentionally returns bare items,
    // structurally identical to what the plain `items` path below returns -
    // verified byte-for-byte against the pre-flip output for vocab-weather,
    // the first category migrated this way.
    //
    // tagQuery here can be a single tag string (as above) or an array of
    // tags required together (AND) - see tagQueryMatches. The array form is
        // what lets a category query e.g. ['food','shopping'] instead of just
        // 'food', so it only picks up its own words where a topic tag is shared.
    //
    // Respects cat.ordinalOrder the same way the includeItems branch below
    // does - Numbers, Days, Months, Days of the month, Time and the zodiac-
    // ordered Animals all carry a taught sequence that alphabetizing would
        // scramble.
    if (cat.tagQuery) {
      const items = [];
      Object.keys(VOCAB).forEach(srcKey => {
        const srcCat = VOCAB[srcKey];
        (srcCat.items || []).forEach(item => {
          if (itemTierVisible(item) && tagQueryMatches(item.tags, cat.tagQuery)) items.push(item);
        });
      });
      if (cat.ordinalOrder) return Object.assign({}, cat, { items });
      return Object.assign({}, cat, { items: sortItemsAlphabetically(items) });
    }
    // includeItems lets a category display a word it doesn't actually store -
    // the word stays a single entry, kept in whichever category is its real
    // home. The reference names the source category and the word's romaji -
    // the Japanese data's field; Portuguese doesn't use includeItems yet.
    // Resolved fresh here rather than stored, same reasoning as theme pools
    // below - always reflects the current state of the source category.
    // Scoring needs no special handling: progress is keyed by the word's own
    // jp+en text (see kanaScores), not by which category holds it, so this
    // is naturally one shared score no matter which screen you drill it from.
    if (cat.includeItems && cat.includeItems.length) {
      const extra = cat.includeItems.map(ref => {
        const sourceCat = VOCAB[ref.cat];
        const item = sourceCat && sourceCat.items.find(i => i.romaji === ref.romaji);
        // Tagged with the true source category/level (not this one) so the
        // border colour and any future tier-specific display stays honest
        // about where the word actually lives.
        return item ? Object.assign({ level: sourceCat.level || 1, groupKey: ref.cat }, item) : null;
      }).filter(Boolean);
      const items = cat.items.concat(extra);
      if (cat.ordinalOrder) return Object.assign({}, cat, { items });
      return Object.assign({}, cat, { items: sortItemsAlphabetically(items) });
    }
    // ordinalOrder categories (days of the week/month, months, numbers,
    // the zodiac-ordered animal set, time vocab's past/present/future
    // groupings) carry a taught sequence that alphabetizing would destroy -
    // everything else gets sorted for browsability on the tile-selection
    // screen. Returns a shallow copy so VOCAB[key].items itself is never
    // reordered - other call sites (startVocabReadingDeck, sentence-builder
    // helpers, average-score calcs) read VOCAB[key].items directly and don't
    // care about display order, but do care that dateAdded/source stay in
    // their original entry order.
    if (cat.ordinalOrder) return cat;
    return Object.assign({}, cat, { items: sortItemsAlphabetically(cat.items) });
  }
  if (key === VOCAB_SEARCH_KEY) {
    // Not a real category or a theme - a one-off pool built fresh by
    // submitVocabSearch() each time a search is run, stashed here so the
    // tile-selection screen (which always resolves its category through
    // this function) can find it the same way it finds everything else.
    // isTheme is deliberately left false/unset: unlike Collections, a search
    // result set is usually small and genuinely useful to select all of, so
    // "Select all" stays available (see showVocabTileSelection).
    if (!lastVocabSearchResults) return null;
    return {
      label: tx('search.label', { q: lastVocabSearchResults.query }),
      chars: '',
      items: lastVocabSearchResults.items,
      hasReference: true,
      noMeaningMode: false,
    };
  }
  const theme = THEMES[key];
  if (!theme) return null;
  THEME_CACHE[key] = {
    label: theme.label,
    chars: theme.chars || '',
    items: getThemePool(key),
    hasReference: true,
    noMeaningMode: false,
    isTheme: true,
  };
  return THEME_CACHE[key];
}

// Search across whatever's currently visible (see itemTierVisible) - matches
// against the English, the word and its Brazilian form, deliberately not
// seenAs: that's incidental sentence context, not
// vocab that was actually taught or added on purpose, and searching it
// would surface words by way of unrelated background text. Enter/submit
// only, not live-as-you-type - a live version would be re-filtering a
// results screen out from under you on every keystroke, which is exactly
// the kind of thing that's obvious in hindsight and easy to miss up front.
//
// Matching is word-start, not plain substring - checked against the real
// data before landing here: a plain substring search for "up" pulled back
// 20 words, but only 6 were actually about "up" (get up, wake up, line up,
// drink up, tie up, hold up to) - the other 14 were coincidence, "up"
// happening to sit inside soup, occupied, supermarket,
// support, and so on, with no connection to the query at all. Splitting
// each field into words and requiring the query to be the START of one of
// them fixes that (up no longer matches the middle of "occupied") while
// staying far more flexible than matching only the start of the whole
// field the way it might look from the outside - "cred" still finds
// "credit card", "pillo" still finds every pillow entry, "exit" still finds
// exit/west exit/emergency exit. A multi-word query (e.g. "west exit")
// requires every word typed to start some word in the entry, not the exact
// phrase - so word order/spacing in what you type doesn't have to match
// the entry exactly either.
const VOCAB_SEARCH_KEY = 'vocab-search-results';
let lastVocabSearchResults = null; // { query, items } - see resolveVocabCategory
// Accent-blind (Portuguese build): "cafe" finds café, "nao" finds não.
function vocabSearchWords(str) {
  return str ? str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter(Boolean) : [];
}
// The × only shows while there's something to clear.
// Portuguese answer size: as big as fits in a half-width option.
function optPtSize(text) {
  const n = String(text || '').length;
  return n <= 10 ? 20 : n <= 14 ? 17 : n <= 18 ? 15 : 13;
}
function optPtHtml(idx, text) {
  return `<span class="opt-num">${idx + 1}</span><span class="opt-rd opt-pt" style="font-size:${optPtSize(text)}px">${escapeHtmlText(text)}</span>`;
}
function syncVocabSearchClear() {
  const input = document.getElementById('vocab-search-input');
  const x = document.getElementById('vocab-search-clear');
  if (input && x) x.style.display = input.value ? 'flex' : 'none';
}
function clearVocabSearch() {
  const input = document.getElementById('vocab-search-input');
  const msgEl = document.getElementById('vocab-search-message');
  if (!input) return;
  input.value = '';
  if (msgEl) msgEl.style.display = 'none';
  syncVocabSearchClear();
  input.focus();
}
function handleVocabSearchKeydown(e) {
  if (e.key === 'Enter') submitVocabSearch();
}
function submitVocabSearch() {
  const input = document.getElementById('vocab-search-input');
  const msgEl = document.getElementById('vocab-search-message');
  const raw = input.value.trim();
  if (raw.length < 2) {
    msgEl.textContent = tx('search.tooShort');
    msgEl.style.display = 'block';
    return;
  }
  const queryWords = vocabSearchWords(raw);
  const results = [];
  Object.keys(VOCAB).forEach(catKey => {
    const cat = VOCAB[catKey];
    cat.items.forEach(item => {
      if (!itemTierVisible(item)) return;
      const itemWords = vocabSearchWords(item.en).concat(vocabSearchWords(item.jp), vocabSearchWords(item.br));
      const matches = queryWords.every(qw => itemWords.some(iw => iw.startsWith(qw)));
      if (matches) {
                // Tagged with level/groupKey the same way getThemePool tags pooled
                // theme items, so results from several categories get the same
                // border colours (see LEVEL_BORDER_COLORS).
        results.push(Object.assign({ level: cat.level || 1, groupKey: catKey }, item));
      }
    });
  });
  if (results.length === 0) {
    msgEl.textContent = tx('search.nothing', { q: raw });
    msgEl.style.display = 'block';
    return;
  }
  msgEl.style.display = 'none';
  // The app switches screens by toggling display:none, not a real page
  // navigation, so nothing forces the input to release focus on its own -
  // on some mobile browsers a focused element doesn't reliably blur just
  // because its screen becomes hidden, which left the pill's :focus-within
  // gold border stuck on permanently after the first search. Blurring here,
  // right as we're about to navigate away, is the actual moment focus
  // should end.
  input.blur();
  lastVocabSearchResults = { query: raw, items: sortItemsAlphabetically(results) };
  // Fresh selection state every search - vocabTileSelected persists per
  // category key by design (so revisiting a real category remembers what
  // you had picked), but VOCAB_SEARCH_KEY's underlying item pool is
  // different on every search, so a leftover Set of indices from a
  // previous, unrelated search would select the wrong words entirely.
  vocabTileSelected[VOCAB_SEARCH_KEY] = new Set();
  vocabTileRandomMode[VOCAB_SEARCH_KEY] = false;
  showVocabTileSelection(VOCAB_SEARCH_KEY);
}




let deck = [], current = 0, score = 0, wrong = 0, hints = 0, answered = false, missed = [];
let hintUsedThisQuestion = false;
let lastDeckBuilder = null;
// DRILL MODES (2026-10-10). A word has two faces - the word and its
// meaning - so forward questions always ask for the English, and:
//   Reverse - see the English, answer in Portuguese
//   Type    - type the Portuguese yourself. On its own it implies Reverse
//             (typing English back is free prose and can't be marked
//             reliably); with Listen it becomes dictation - hear it, write it.
//   Listen  - hear the Portuguese instead of seeing it. Off while reversed.
let vocabReversed = false;
let typeAnswerMode = false;
let listenMode = false;
// Say it out loud (2026-10-11): self-marked recall - see renderSayQuestion.
let sayMode = false;
// The Random page's own switches. The three globals above are whatever the
// drill in progress uses - a category screen's drill sets them from that
// category's switches - so the Random page keeps its choices here and
// copies them across when its Start is pressed (startSelectedRandom).
const randomModes = { reversed: false, type: false, listen: false, say: false };

// What a word question actually does, from the three switches above.
function wordQuestionMode() {
  if (sayMode) return 'say';
  if (listenMode && soundAllowed()) return typeAnswerMode ? 'dictation' : 'listen';
  if (vocabReversed || typeAnswerMode) return typeAnswerMode ? 'type' : 'reversed';
  return 'forward';
}

function toggleVocabReversed() {
  randomModes.reversed = !randomModes.reversed;
  if (randomModes.reversed) randomModes.listen = false;
  syncVocabModeToggles();
}

function toggleTypeAnswerMode() {
  randomModes.type = !randomModes.type;
  syncVocabModeToggles();
}

function toggleListenMode() {
  if (!randomModes.listen && !soundAllowed()) return;
  randomModes.listen = !randomModes.listen;
  if (randomModes.listen) randomModes.reversed = false;
  syncVocabModeToggles();
}

function toggleSayMode() {
  randomModes.say = !randomModes.say;
  syncVocabModeToggles();
}

function applyRandomModes() {
  sayMode = randomModes.say;
  vocabReversed = randomModes.reversed;
  typeAnswerMode = randomModes.type;
  listenMode = randomModes.listen && soundAllowed();
}

function syncVocabModeToggles() {
  [['reversed-mode-toggle-card', randomModes.reversed],
   ['type-answer-toggle-card', randomModes.type],
   ['listen-toggle-card', randomModes.listen]]
    .forEach(([id, on]) => {
      const card = document.getElementById(id);
      if (card) card.classList.toggle('selected', on);
    });
  const say = document.getElementById('say-toggle-card');
  if (say) say.classList.toggle('selected', randomModes.say);
  const rev = document.getElementById('reversed-mode-toggle-card');
  if (rev) rev.classList.toggle('disabled', randomModes.listen || randomModes.say);
  const typ = document.getElementById('type-answer-toggle-card');
  if (typ) typ.classList.toggle('disabled', randomModes.say);
  const lis = document.getElementById('listen-toggle-card');
  if (lis) lis.classList.toggle('disabled', randomModes.reversed || randomModes.say || !soundAllowed());
}





// Fisher-Yates (2026-10-10). The old sort(() => Math.random() - 0.5) is a
// known biased shuffle: with 4 answer options the first one (the correct
// answer, since options are built as [answer, ...distractors]) landed in
// position 1 about 28% of the time and position 4 only 19%, instead of 25%
// each (6 of 12 correct answers were landing in position 1).
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}


function escapeHtmlText(str) {
  if (str === undefined || str === null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}


// Finds where the drilled word sits inside its own seenAs example sentence,
// so it can be highlighted: a plain search first, then (for words whose
// ending changes in the sentence) the same with the last 1-2 characters
// dropped. Returns null when it isn't there; the sentence then shows plain.
function findSeenAsHighlightRange(word, sentence) {
  if (!word || !sentence) return null;
  let idx = sentence.indexOf(word);
  if (idx !== -1) return { start: idx, end: idx + word.length };
  for (let strip = 1; strip <= 2 && word.length - strip >= 1; strip++) {
    const stem = word.slice(0, word.length - strip);
    idx = sentence.indexOf(stem);
    if (idx !== -1) return { start: idx, end: idx + stem.length };
  }
  return null;
}

// Renders a seenAs sentence with the drilled word highlighted where it can
// be found (see findSeenAsHighlightRange) - split into before / match / after
// first, so each piece is escaped and marked separately.
function renderSeenAsHtml(word, sentence) {
  const range = findSeenAsHighlightRange(word, sentence);
  if (!range) return escapeHtmlText(sentence);
  const before = sentence.slice(0, range.start);
  const match = sentence.slice(range.start, range.end);
  const after = sentence.slice(range.end);
  return escapeHtmlText(before) + '<mark class="seen-as-highlight">' + escapeHtmlText(match) + '</mark>' + escapeHtmlText(after);
}

// Rough plausibility score between two option strings (the word or its English,
// gloss, whichever field is being tested) - same starting letter counts as a
// strong signal of shared "sound", similar length as a weaker one. Used to
// bias distractor selection toward options that are actually confusable,
// rather than pure-random words from the pool.
function distractorSimilarity(candidateVal, correctVal) {
  let score = 0;
  if (candidateVal[0] && correctVal[0] && candidateVal[0].toLowerCase() === correctVal[0].toLowerCase()) score += 3;
  const lenDiff = Math.abs(candidateVal.length - correctVal.length);
  score += Math.max(0, 3 - lenDiff);
  return score;
}

// Picks distractors that are guaranteed distinct from the correct item AND
// from each other, on whichever field is actually shown/matched for the
// current drill mode. Without this, two different words
// that happen to share an English gloss could produce duplicate visible
// options, and since both would carry the same dataset.value in meaning
// mode, tapping either would register as correct.
//
// Classmate feedback: pure-random distractors from the whole pool are often
// so dissimilar (wildly different length or starting sound) that you can
// eliminate wrong options on sight without actually recognising the word -
// e.g. the word starts with "ga" and only one of four random options
// happens to start with "g". Biasing toward more confusable
// candidates (matching first letter/length) forces genuine recognition
// instead, without pulling in words from outside the existing pool.
function pickDistractorItems(pool, correctItem, count) {
    // In reversed and typed modes the options are words in the language being
    // learnt; otherwise their English.
  const mode = wordQuestionMode();
  const field = (mode === 'reversed' || mode === 'type') ? 'jp' : 'en';
  const correctVal = correctItem[field];
  const seen = new Set([correctVal]);
  const candidates = [];
  for (const candidate of shuffle([...pool])) {
    const val = candidate[field];
    // Same spelling, different word (いま "now" / いま "living room", かい,
    // なん): as an option it would also be a right answer, so never offered.
    if (candidate !== correctItem && candidate.jp === correctItem.jp) continue;
    if (!seen.has(val)) {
      seen.add(val);
      candidates.push(candidate);
    }
  }
  // The shuffle above still supplies randomness among equally-plausible
  // candidates; this sort just biases which ones make the cut.
  candidates.sort((a, b) => distractorSimilarity(b[field], correctVal) - distractorSimilarity(a[field], correctVal));
  return candidates.slice(0, count);
}












// Tile-selection reference for flat vocab categories (Colours, Trip-prep) —
// no sections/pills needed since these are single unordered lists.
let vocabTileCategory = null;
const vocabTileSelected = {};
const vocabTileReversedMode = {}; // categoryKey -> boolean, remembered independently per category
const vocabTileTypeAnswerMode = {}; // same idea, for the typed-answer toggle (2026-09-22)
const vocabTileListenMode = {}; // same idea, for the listening toggle (2026-10-07)
const vocabTileSayMode = {}; // and for Say it out loud (2026-10-11)
// categoryKey -> boolean. When true, a "Select random 20" pick is active: the
// real selection (used for drilling) is a genuine random 20, but every tile
// is shown as selected and made non-interactive, so there's no visual way to
// tell which 20 were actually picked. Only relevant for theme screens.
const vocabTileRandomMode = {};


function toggleVocabTileReversedMode() {
  const categoryKey = vocabTileCategory;
  vocabTileReversedMode[categoryKey] = !vocabTileReversedMode[categoryKey];
  if (vocabTileReversedMode[categoryKey]) vocabTileListenMode[categoryKey] = false;
  syncVocabTileModeToggles(categoryKey);
}

function toggleVocabTileTypeAnswerMode() {
  const categoryKey = vocabTileCategory;
  vocabTileTypeAnswerMode[categoryKey] = !vocabTileTypeAnswerMode[categoryKey];
  syncVocabTileModeToggles(categoryKey);
}

function toggleVocabTileSayMode() {
  const categoryKey = vocabTileCategory;
  vocabTileSayMode[categoryKey] = !vocabTileSayMode[categoryKey];
  syncVocabTileModeToggles(categoryKey);
}

function toggleVocabTileListenMode() {
  const categoryKey = vocabTileCategory;
  if (!vocabTileListenMode[categoryKey] && !soundAllowed()) return;
  vocabTileListenMode[categoryKey] = !vocabTileListenMode[categoryKey];
  if (vocabTileListenMode[categoryKey]) vocabTileReversedMode[categoryKey] = false;
  syncVocabTileModeToggles(categoryKey);
}

// Per-category twin of the global syncVocabModeToggles (see its own
// comment) - same three-way mutual exclusion (typed answers only make sense
// for the plain forward reading question), just reading/writing the
// per-categoryKey objects above instead of the three bare globals, since
// every one of these already persists independently per category.
function syncVocabTileModeToggles(categoryKey) {
  const reversedOn = !!vocabTileReversedMode[categoryKey];
  const typeOn = !!vocabTileTypeAnswerMode[categoryKey];
  const listenOn = !!vocabTileListenMode[categoryKey];
  const sayOn = !!vocabTileSayMode[categoryKey];
  const reversedCard = document.getElementById('vocab-tile-reversed-mode-card');
  if (reversedCard) {
    reversedCard.classList.toggle('selected', reversedOn);
    reversedCard.classList.toggle('disabled', listenOn || sayOn);
  }
  const typeCard = document.getElementById('vocab-tile-type-answer-card');
  if (typeCard) {
    typeCard.classList.toggle('selected', typeOn);
    typeCard.classList.toggle('disabled', sayOn);
  }
  const listenCard = document.getElementById('vocab-tile-listen-card');
  if (listenCard) {
    listenCard.classList.toggle('selected', listenOn);
    listenCard.classList.toggle('disabled', reversedOn || sayOn || !soundAllowed());
  }
  const sayCard = document.getElementById('vocab-tile-say-card');
  if (sayCard) sayCard.classList.toggle('selected', sayOn);
}

// Maps a category key to the reference screen(s) shown on its tile-selection
// screen: { 'vocab-key': [{ label, fn }] }. Each reference function sets its
// own vocabRefBackTarget so Back returns to that selection screen. The
// Portuguese app has none yet; the mechanism stays for apps that do.
const CATEGORY_REFERENCE_LINKS = {};

function showVocabTileSelection(categoryKey) {
  vocabTileCategory = categoryKey;
  if (!vocabTileSelected[categoryKey]) vocabTileSelected[categoryKey] = new Set();
  const cat = resolveVocabCategory(categoryKey);
  document.getElementById('vocab-tile-selection-title').textContent = cat.label;
  const refLinks = document.getElementById('vocab-tile-selection-ref-links');
  if (refLinks) {
    refLinks.innerHTML = '';
    (CATEGORY_REFERENCE_LINKS[categoryKey] || []).forEach(({ label, fn }) => {
      const card = document.createElement('div');
      card.className = 'vocab-ref-card';
      card.innerHTML = `<span>${label}</span><span class="vocab-ref-arrow">→</span>`;
      card.onclick = fn;
      refLinks.appendChild(card);
    });
    // Latest words: how far back to look (see getThemePool's latestWords).
    if (categoryKey === 'theme-latest-words') {
      const row = document.createElement('div');
      row.className = 'level-filter-row latest-range-row';
      const cur = appSettings.latestWordsRange || 'batch';
      [['batch', tx('latest.batch')], ['1w', tx('latest.1w')], ['2w', tx('latest.2w')]].forEach(([key, label]) => {
        const btn = document.createElement('button');
        btn.className = 'level-pill' + (key === cur ? ' active' : '');
        btn.textContent = label;
        btn.onclick = () => setLatestWordsRange(key);
        row.appendChild(btn);
      });
      refLinks.appendChild(row);
    }
  }
  syncTileSoundControls(categoryKey);
  buildVocabTileGrid(categoryKey);
  refreshKanaScoreShading('vocab-tile-grid');
  updateSelectAllVocabTilesLabel();
  syncVocabDrillBtn();
  syncVocabTileModeToggles(categoryKey);
  // noMeaningMode categories hide the meaning toggle specifically (there's
  // no distinct "meaning" to highlight - see its own definition above) but
  // still get the reversed/typed-answer toggles, which are both about
  // reading, not meaning - syncVocabTileModeToggles above already set their
  // selected/disabled state correctly, this just layers the extra display
  // rule on top for the one card that needs it.
  // Select all everywhere, Groups included; the random pick depends only on
  // size (see syncVocabDrillBtn's comment for the rule).
  const selectAllCard = document.getElementById('vocab-tile-select-all-card');
  if (selectAllCard) selectAllCard.style.display = 'flex';
  const randomCard = document.getElementById('vocab-tile-random20-card');
  if (randomCard) randomCard.style.display = currentRandomPickSize(categoryKey) ? 'flex' : 'none';
  updateRandomVocabTilesLabel();
  showScreen('vocab-tile-selection');
}

function setLatestWordsRange(range) {
  if ((appSettings.latestWordsRange || 'batch') === range) return;
  appSettings.latestWordsRange = range;
  saveSettings();
  // The word list changes underneath, so any picked tiles no longer line up.
  vocabTileSelected['theme-latest-words'] = new Set();
  if (typeof vocabTileRandomMode !== 'undefined') vocabTileRandomMode['theme-latest-words'] = false;
  showVocabTileSelection('theme-latest-words');
}

const COLOUR_HUES = {
  red: [229, 72, 77], blue: [77, 136, 229], yellow: [229, 195, 46], green: [77, 199, 113],
  brown: [160, 104, 77], purple: [155, 89, 208], pink: [229, 77, 155], orange: [229, 138, 77],
};

// Level-colour borders, for theme screens only (items pooled from several
// source categories at once, so a tile's own level isn't otherwise visible).
// Deliberately distinct from --accent (gold), which .selected already owns -
// same border-slot handoff the Colours category already does: level colour
// while unselected, gold once selected.
//
// Keys are per-item tags (encountered / curated) or course levels (1, 2...).
// The Portuguese app has no levels, so no level-coloured tile borders.
const LEVEL_BORDER_COLORS = {};

// Resolves which LEVEL_BORDER_COLORS key applies to a pooled item: its own
// tags first (encountered / curated), then its level.
function itemColorKey(item) {
  if (item.tags) {
    if (item.tags.includes('curated')) return 'curated';
    if (item.tags.includes('encountered')) return 'encountered';
  }
  return item.level;
}

function interpolateRgb(from, to, t) {
  return from.map((f, i) => Math.round(f + (to[i] - f) * t));
}

// Colours category only: border shows the tile's own hue, at an intensity that
// scales with confidence (dim/grey at low scores, vivid at high scores).
// Black and white use a grayscale range instead, since "saturation of black"
// isn't a meaningful thing to show.
function colourBorderStyle(en, score) {
  if (score === undefined || score === null) return null;
  const t = Math.max(0, Math.min(1, (score + 2) / 4));
  let rgb;
  if (en === 'black') rgb = interpolateRgb([40, 40, 40], [150, 150, 150], t);
  else if (en === 'white') rgb = interpolateRgb([120, 120, 120], [255, 255, 255], t);
  else rgb = interpolateRgb([90, 90, 90], COLOUR_HUES[en] || [150, 150, 150], t);
  return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}


function tileSpeakModeActive(categoryKey) {
  return soundAllowed() && !!appSettings.tileTapToSpeak;
}
function syncTileSoundControls(categoryKey) {
  const speakCard = document.getElementById('vocab-tile-speak-card');
  if (speakCard) {
    speakCard.style.display = SPEECH_SUPPORTED ? 'flex' : 'none';
    speakCard.classList.toggle('selected', !!appSettings.tileTapToSpeak);
    speakCard.classList.toggle('disabled', !soundAllowed()); // muted: greyed out
  }
  updateTileSelectionSubText(categoryKey);
}
function updateTileSelectionSubText(categoryKey) {
  const sub = document.getElementById('vocab-tile-selection-sub');
  if (!sub) return;
  const peek = tx('tiles.holdToPeek');
  sub.textContent = (tileSpeakModeActive(categoryKey) ? tx('tiles.tapToHear') : tx('tiles.tapToSelect')) + ' ' + peek;
}
function toggleTileTapToSpeak() {
  appSettings.tileTapToSpeak = !appSettings.tileTapToSpeak;
  saveSettings();
  const card = document.getElementById('vocab-tile-speak-card');
  if (card) card.classList.toggle('selected', appSettings.tileTapToSpeak);
  updateTileSelectionSubText(vocabTileCategory);
  buildVocabTileGrid(vocabTileCategory);
  refreshKanaScoreShading('vocab-tile-grid');
}
// Speaks the card's word (or its speakAs override) in the language being
// learnt - same settings as the drill's hint button (speakCurrent). With no
// suitable voice on the device, the toggle card says so (see speakTarget).
function speakVocabTile(item, tileEl) {
  if (!soundAllowed()) return;
  if (tileEl) tileEl.style.borderColor = 'var(--accent)';
  const utter = speakTarget(item.speakAs || item.jp);
  if (tileEl) {
    const clear = () => { tileEl.style.borderColor = ''; };
    if (utter) { utter.onend = clear; utter.onerror = clear; }
    setTimeout(clear, 4000);
  }
}

// Sized by length: Portuguese words run long.
function tileWordFontSize(word) {
  const len = word.length;
  return len <= 7 ? '22px' : len <= 12 ? '18px' : len <= 20 ? '15px' : '13px';
}
// HOLD TO PEEK (2026-10-02) - hold any word card ~half a second and a
// bubble shows the word, a second line and its English (and says it);
// let go and it disappears. A bubble rather than changing the card text,
// because the holding finger covers the card. A peek, not a toggle, so the
// list keeps testing you. A finger that starts moving is a
// scroll, which cancels the hold; the click that follows a peek is
// swallowed so it doesn't also select the card.
const TILE_PEEK_HOLD_MS = 450;
const TILE_PEEK_MOVE_TOLERANCE = 16; // px of finger wobble allowed before the bubble appears
// Placement: above the card if it fits, else beside it on the roomier
// side (away from the finger), else below - always clamped on-screen.
function showTilePeekBubble(tile, item) {
  hideTilePeekBubble();
  const b = document.createElement('div');
  b.className = 'tile-peek-bubble';
  b.id = 'tile-peek-bubble';
  // Verbs (2026-10-07) get a hint line: slide towards this bubble and let
  // go to open every form (showVerbFormsPopup). The arrow is filled in once
  // the bubble's side is known, since it isn't always above the card.
    // The second line shows the Brazilian form where it differs, then any
    // usage note.
  // A language whose words have a second face (a reading worked out by rule,
  // LANG.reading - Bulgarian's Latin spelling) shows it first.
  const reading = LANG.reading && !item.noReading ? LANG.reading(item.jp) : '';
  const extra = [reading ? escapeHtmlText(reading) : '', item.br ? tx('tiles.brazil', { w: escapeHtmlText(item.br) }) : '', item.note ? escapeHtmlText(item.note) : ''].filter(Boolean).join(' · ');
  b.innerHTML = `<div class="peek-jp">${escapeHtmlText(item.jp)}</div>${extra ? `<div class="peek-romaji">${extra}</div>` : ''}<div class="peek-en">${escapeHtmlText(item.en)}</div>`;
  document.body.appendChild(b);
  const r = tile.getBoundingClientRect();
  const bw = b.offsetWidth, bh = b.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight, gap = 10, m = 8;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  let left, top;
  if (r.top - gap - bh >= m) {
    top = r.top - gap - bh;
    left = clamp(r.left + r.width / 2 - bw / 2, m, vw - bw - m);
  } else {
    const roomRight = vw - r.right - gap - m, roomLeft = r.left - gap - m;
    if (Math.max(roomRight, roomLeft) >= Math.min(bw, 160)) {
      left = roomRight >= roomLeft ? r.right + gap : r.left - gap - bw;
      left = clamp(left, m, vw - bw - m);
      top = clamp(r.top, m, vh - bh - m);
    } else {
      top = clamp(r.bottom + gap, m, vh - bh - m);
      left = clamp(r.left + r.width / 2 - bw / 2, m, vw - bw - m);
    }
  }
  b.style.left = left + 'px';
  b.style.top = top + 'px';
  const arrow = b.querySelector('.peek-arrow');
  if (arrow) {
    const dx = (left + bw / 2) - (r.left + r.width / 2), dy = (top + bh / 2) - (r.top + r.height / 2);
    arrow.textContent = Math.abs(dy) >= Math.abs(dx) ? (dy < 0 ? '↑' : '↓') : (dx < 0 ? '←' : '→');
  }
  return b;
}
function hideTilePeekBubble() {
  const old = document.getElementById('tile-peek-bubble');
  if (old) old.remove();
}
let tilePeekSuppressClickUntil = 0;
function attachTilePeek(tile, item) {
  let timer = null, peeking = false, startX = 0, startY = 0, pointerId = null;
  const begin = () => {
    timer = null;
    peeking = true;
    tile.classList.add('tile-peeking');
    showTilePeekBubble(tile, item);
    tilePeekSuppressClickUntil = Date.now() + 1000;
    speakTarget(item.speakAs || item.jp);
  };
  const end = (e) => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!peeking) return;
    peeking = false;
    tile.classList.remove('tile-peeking');
    hideTilePeekBubble();
    tilePeekSuppressClickUntil = Date.now() + 400;
  };
  // Tolerance (2026-10-02): a little wobble before the bubble appears is
  // allowed (TILE_PEEK_MOVE_TOLERANCE); once it's showing, only lifting the
  // finger closes it - the pointer is captured (so drifting off the card's
  // edge doesn't count) and touchmove is blocked (so the page can't start
  // scrolling, which would otherwise cancel the hold).
  tile.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    startX = e.clientX; startY = e.clientY;
    pointerId = e.pointerId;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      try { tile.setPointerCapture(pointerId); } catch (err) { /* pointer already gone */ }
      begin();
    }, TILE_PEEK_HOLD_MS);
  });
  tile.addEventListener('pointermove', e => {
    if (timer && (Math.abs(e.clientX - startX) > TILE_PEEK_MOVE_TOLERANCE || Math.abs(e.clientY - startY) > TILE_PEEK_MOVE_TOLERANCE)) {
      clearTimeout(timer); timer = null;
    }
  });
  tile.addEventListener('touchmove', e => { if (peeking && e.cancelable) e.preventDefault(); }, { passive: false });
  ['pointerup', 'pointercancel'].forEach(t => tile.addEventListener(t, end));
  tile.addEventListener('pointerleave', () => { if (!peeking) end(); });
  tile.addEventListener('contextmenu', e => e.preventDefault());
}

function buildVocabTileGrid(categoryKey) {
  const container = document.getElementById('vocab-tile-grid');
  container.innerHTML = ''; // rebuilt each time - this one container is shared across categories
  const grid = document.createElement('div');
  grid.className = 'kanji-tile-grid';
  const items = resolveVocabCategory(categoryKey).items;
  const selected = vocabTileSelected[categoryKey];
  const randomMode = !!vocabTileRandomMode[categoryKey];
  const speakMode = tileSpeakModeActive(categoryKey);
  items.forEach((item, idx) => {
    // Grouped themes (see getThemePool) tag each item with dividerGroup - a
    // gold divider marks the boundary between one source category's
    // alphabetized block and the next. Regular categories and noSort themes
    // never set dividerGroup, so this never fires for them.
    if (idx > 0 && item.dividerGroup !== undefined && item.dividerGroup !== items[idx - 1].dividerGroup) {
      const divider = document.createElement('div');
      divider.className = 'section-divider';
      divider.style.flexBasis = '100%';
      grid.appendChild(divider);
    }
    const tile = document.createElement('div');
    tile.className = 'kana-ref-card';
    tile.innerHTML = `<span class="kana-ref-char" style="font-size:${tileWordFontSize(item.jp)};">${escapeHtmlText(item.jp)}</span><span class="kana-ref-rom">${escapeHtmlText(item.en)}</span>`;
    const scoreKey = item.jp + '|' + item.en;
    tile.dataset.scoreKey = scoreKey;
    const scoreClass = kanaScoreClass(scoreKey);
    if (scoreClass) tile.classList.add(scoreClass);
    // While a random-20 pick is disguising the grid, every tile shows as
    // selected regardless of whether it's actually one of the 20 - that's
    // the whole point (no clue which ones are really included).
    const isSelected = randomMode || selected.has(idx);
    if (categoryKey === 'vocab-colours') {
      tile.style.borderWidth = '3px';
      tile.classList.add('colour-tile');
      if (!isSelected) {
        const borderColor = colourBorderStyle(item.en, displayScore(kanaScores[scoreKey]));
        if (borderColor) tile.style.borderColor = borderColor;
      }
    } else if (item.level !== undefined) {
      // Theme-pooled items only - carries the source category's own level.
      // Same 1px weight as every tile's default border, just coloured.
            // Colour itself comes from itemColorKey - see LEVEL_BORDER_COLORS.
      if (!isSelected) tile.style.borderColor = LEVEL_BORDER_COLORS[itemColorKey(item)] || '';
    }
    if (isSelected) tile.classList.add('selected');
    if (speakMode) {
      // Tap to hear: speaks instead of selecting, and stays tappable even
      // while Random 20's disguise is on.
      tile.onclick = () => { if (Date.now() < tilePeekSuppressClickUntil) return; speakVocabTile(item, tile); };
    } else if (randomMode) {
      tile.style.pointerEvents = 'none'; // disguise is only meaningful if nothing can be tapped to break it
    } else {
      tile.onclick = () => { if (Date.now() < tilePeekSuppressClickUntil) return; toggleVocabTile(categoryKey, idx, tile); };
    }
    if (speakMode || !randomMode) attachTilePeek(tile, item);
    grid.appendChild(tile);
  });
  container.appendChild(grid);
}

// Restores a tile's resting border colour after deselection - Colours uses
// its own hue/confidence style, theme tiles use their source level's colour,
// everything else has no special resting border at all.
function applyRestingTileBorder(categoryKey, item, tileEl) {
  if (categoryKey === 'vocab-colours') {
    const scoreKey = item.jp + '|' + item.en;
    const borderColor = colourBorderStyle(item.en, displayScore(kanaScores[scoreKey]));
    if (borderColor) tileEl.style.borderColor = borderColor;
  } else if (item.level !== undefined) {
    tileEl.style.borderColor = LEVEL_BORDER_COLORS[itemColorKey(item)] || '';
  }
}

function toggleVocabTile(categoryKey, idx, tileEl) {
  if (vocabTileRandomMode[categoryKey]) return; // backstop - tiles are also pointer-events:none while disguised
  const set = vocabTileSelected[categoryKey];
  if (set.has(idx)) {
    set.delete(idx);
    tileEl.classList.remove('selected');
    const item = resolveVocabCategory(categoryKey).items[idx];
    applyRestingTileBorder(categoryKey, item, tileEl);
  } else {
    set.add(idx);
    tileEl.classList.add('selected');
    tileEl.style.borderColor = '';
  }
  syncVocabDrillBtn();
  updateSelectAllVocabTilesLabel();
}

// Selecting everything for real is also the "reveal" action out of a random-20
// disguise - genuinely selecting every item makes the distinction moot, so
// this always clears vocabTileRandomMode on its way through.
function toggleSelectAllVocabTiles() {
  const categoryKey = vocabTileCategory;
  const items = resolveVocabCategory(categoryKey).items;
  const total = items.length;
  const set = vocabTileSelected[categoryKey];
  const wasAllSelected = !vocabTileRandomMode[categoryKey] && set.size === total;
  vocabTileRandomMode[categoryKey] = false;
  if (wasAllSelected) set.clear();
  else { set.clear(); for (let i = 0; i < total; i++) set.add(i); }
  buildVocabTileGrid(categoryKey);
  refreshKanaScoreShading('vocab-tile-grid');
  syncVocabDrillBtn();
  updateSelectAllVocabTilesLabel();
  updateRandomVocabTilesLabel();
}

// How many tiles "Random N" picks for a given category. Themes are always
// far bigger than any single category and never shrink below the point
// where a random pick stops meaning anything, so they keep a flat 20
// regardless of size (see currentRandomPickSize). Regular categories scale
// instead: below 21 items, Select all already covers it and a random pick
// wouldn't meaningfully reduce anything, so there's no button at all.
function getRandomPickSize(total) {
  if (total > 30) return 20;
  if (total > 20) return 10;
  return 0;
}

// Single source of truth for "how big is this category's random pick, if it
// has one at all" - used by showVocabTileSelection (to show/hide and label
// the card), toggleRandomVocabTiles (to do the actual picking) and
// updateRandomVocabTilesLabel (to word the button), so the three can never
// drift out of sync with each other.
function currentRandomPickSize(categoryKey) {
  const cat = resolveVocabCategory(categoryKey);
  if (!cat) return 0;
  return getRandomPickSize(cat.items.length);
}

// "Select random N" - N depends on category size (see currentRandomPickSize).
// Toggles between two states:
//  - off: normal per-tile selection, exactly like Select all/individual taps.
//  - on: a genuine random N (or all, if the category has fewer than N items)
//    is chosen and used for drilling, but every tile renders as selected and
//    becomes untappable - deliberately no visual way to tell which N were
//    actually picked. Toggling off clears the selection and restores normal
//    per-tile interaction (see buildVocabTileGrid for the rendering side).
function toggleRandomVocabTiles() {
  const categoryKey = vocabTileCategory;
  const items = resolveVocabCategory(categoryKey).items;
  const total = items.length;
  const set = vocabTileSelected[categoryKey];
  if (vocabTileRandomMode[categoryKey]) {
    vocabTileRandomMode[categoryKey] = false;
    set.clear();
  } else {
    vocabTileRandomMode[categoryKey] = true;
    set.clear();
    const pickSize = currentRandomPickSize(categoryKey);
    shuffle([...Array(total).keys()]).slice(0, Math.min(pickSize, total)).forEach(i => set.add(i));
  }
  buildVocabTileGrid(categoryKey);
  refreshKanaScoreShading('vocab-tile-grid');
  syncVocabDrillBtn();
  updateSelectAllVocabTilesLabel();
  updateRandomVocabTilesLabel();
}

// Both cards sit at rest with a plain, quiet border (no permanent emphasis)
// and only pick up the gold "selected" fill while their action is genuinely
// the one currently active - doubles as the answer to "which mode am I in",
// without needing to read either label closely.
// One rule for every word list - topics, Groups and verbs alike (2026-10-16,
// "make all of these categories consistent"): Select all is always
// there; a random pick is offered on top once a list is big enough to want
// one - 21-30 items: Random 10; over 30: Random 20 (getRandomPickSize). Every
// button says what it does, with numbers.
function syncVocabDrillBtn() {
  const btn = document.getElementById('vocab-tile-drill-btn');
  const set = vocabTileSelected[vocabTileCategory];
  if (!btn || !set) return;
  const n = set.size;
  btn.disabled = n === 0;
  btn.textContent = n === 0 ? tx('tiles.pickSome') : tx('tiles.drillN', { n });
}
function updateSelectAllVocabTilesLabel() {
  const categoryKey = vocabTileCategory;
  const total = resolveVocabCategory(categoryKey).items.length;
  const set = vocabTileSelected[categoryKey];
  const allSelected = !vocabTileRandomMode[categoryKey] && set.size === total;
  document.getElementById('vocab-tile-select-all-label').textContent = allSelected ? tx('tiles.deselectAll') : tx('tiles.selectAll');
  document.getElementById('vocab-tile-select-all-card').classList.toggle('selected', allSelected);
}

function updateRandomVocabTilesLabel() {
  const active = !!vocabTileRandomMode[vocabTileCategory];
  const label = document.getElementById('vocab-tile-random20-label');
  if (label) label.textContent = active ? tx('tiles.deselectAll') : tx('tiles.randomN', { n: currentRandomPickSize(vocabTileCategory) });
  const card = document.getElementById('vocab-tile-random20-card');
  if (card) card.classList.toggle('selected', active);
}

function drillVocabTileSelection() {
  const categoryKey = vocabTileCategory;
  const set = vocabTileSelected[categoryKey];
  if (set.size === 0) return;
  // The random-20 disguise's whole job is stopping you seeing which 20 before
  // you commit to drilling them - once the drill actually starts that's moot,
  // so drop the disguise now rather than leaving every tile stuck looking
  // selected when this screen is revisited afterwards. The real selection
  // (the true 20) stays as-is, same as any other persisted selection.
  vocabTileRandomMode[categoryKey] = false;
  const cat = resolveVocabCategory(categoryKey);
  sayMode = !!vocabTileSayMode[categoryKey];
  vocabReversed = !!vocabTileReversedMode[categoryKey];
  typeAnswerMode = !!vocabTileTypeAnswerMode[categoryKey];
  listenMode = !!vocabTileListenMode[categoryKey] && soundAllowed();
  const items = cat.items;
  // See BUG FIX (2026-09-12) above allVisibleVocabItems - search results can
  // be smaller than the 3 distractors a drill card needs, unlike every real
  // category (all 4+ items). Everywhere else, distractors staying within
  // the category's own items is deliberate; search has no real "category"
  // to stay within, so it draws from the full visible pool instead.
  const distractorPool = categoryKey === VOCAB_SEARCH_KEY ? allVisibleVocabItems() : items;
  const selectedItems = [...set].sort((a, b) => a - b).map(idx => items[idx]);
  const customDeck = selectedItems.map(item => {
    let pool = distractorPool;
    if (item.dividerGroup !== undefined) {
      const same = distractorPool.filter(i => i.dividerGroup === item.dividerGroup);
      if (same.length >= 4) pool = same;
    }
    return buildWordQuestion(item, pool, item.groupKey || categoryKey);
  });
  lastSettingsScreen = 'vocab-tile-selection';
  startDrill(shuffle(customDeck));
}




// NAVIGATION HISTORY (2026-10-16). Every screen
// change is recorded, so Back - the "← Page" link at the top-left of inner
// pages, the phone's back gesture, and the cog tapped a second time - goes
// exactly one step up. The tab pages (APP.screens with root: true) are
// roots: arriving at one starts history afresh and Back there does nothing,
// so the app can't be left by accident. Drill and results are never stepped
// back INTO (Back goes to where the drill was started), except from Settings.
// Going to the screen one step back counts as going back, so history never
// doubles up. showScreen already redraws each screen when it's shown, so
// going back just shows the screen again.
var navStack = [], navCurrent = null, navGoingBack = false; // var: showScreen runs at start-up
// The app's own screens come from APP.screens (pt/app.js).
const NAV_ROOTS = ['match-settings', ...Object.keys(APP.screens).filter(id => APP.screens[id].root)];
const NAV_TRANSIENT = ['drill', 'results'];
function navRecord(id) {
  // At start-up the first page is shown by the HTML itself, not showScreen,
  // so read it from the page (bug fixed 2026-10-16: the first page opened
  // after starting the app had no Back).
  const vis = document.querySelector('.screen.visible');
  const prev = navCurrent || (vis ? vis.id.replace(/^screen-/, '') : null);
  navCurrent = id;
  if (navGoingBack || !prev || prev === id) return;
  if (NAV_ROOTS.includes(id)) { navStack = []; return; }
  if (navStack.length && navStack[navStack.length - 1] === id) { navStack.pop(); return; }
  if (NAV_TRANSIENT.includes(prev) && id !== 'settings') return;
  navStack.push(prev);
}
function navBack() {
  // The app can take Back first (Portuguese: closing the daily greeting).
  if (APP.onBack && APP.onBack()) return;
  hideTilePeekBubble();
  // Safety net: no history on an inner page still goes to its section's main page.
  if (!navStack.length && !NAV_ROOTS.includes(navCurrent)) navStack.push(NAV_HOME[navCurrent] || 'match-settings');
  if (!navStack.length) return;
  const target = navStack.pop();
  navGoingBack = true;
  try { if (target === 'settings') showSettingsScreen(); else showScreen(target); } finally { navGoingBack = false; }
  renderNavBack();
}
const NAV_HOME = Object.fromEntries(Object.entries(APP.screens).filter(([, s]) => s.home).map(([id, s]) => [id, s.home]));
function toggleSettings() {
  if (navCurrent === 'settings' && navStack.length) navBack();
  else if (navCurrent !== 'settings') showSettingsScreen();
}
function navLabel(id) {
  if (id === 'match-settings') return ({ theme: tx('nav.groups'), random: tx('nav.random') })[currentMatchLevel] || tx('nav.vocab');
  if (APP.screens[id] && APP.screens[id].label) return APP.screens[id].label;
  if (id === 'drill') return tx('nav.drill');
  if (id === 'results') return tx('nav.results');
  const title = document.querySelector('#screen-' + id + ' .settings-title');
  return (title && title.textContent.trim()) || tx('nav.back');
}
function renderNavBack() {
  document.querySelectorAll('.nav-back').forEach(b => b.remove());
  if (!navStack.length && NAV_ROOTS.includes(navCurrent)) return;
  const scr = document.getElementById('screen-' + navCurrent);
  if (!scr) return;
  let label = navLabel(navStack.length ? navStack[navStack.length - 1] : (NAV_HOME[navCurrent] || 'match-settings'));
  if (label.length > 30) label = label.slice(0, 28).trim() + '…';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-back';
  btn.textContent = '← ' + label;
  btn.onclick = navBack;
  scr.insertBefore(btn, scr.firstChild);
}

function showScreen(id) {
  if (id === 'match-settings' || (APP.screens[id] && APP.screens[id].vocabRoot)) lastVocabRoot = id;
  navRecord(id);
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('visible'));
  document.getElementById('screen-' + id).classList.add('visible');
  renderNavBack();
  document.querySelectorAll('.nav-pill').forEach(p => p.classList.remove('active'));
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) settingsBtn.classList.toggle('active', id === 'settings');
  // Nav pills: the screen's own (APP.screens), else the word-list tab. Drill
  // and results light whichever pill the drill was started from.
  if (id !== 'settings') {
    const origin = (id === 'drill' || id === 'results') ? lastSettingsScreen : id;
    const sc = APP.screens[origin];
    const pillId = (sc && sc.pill) ? (typeof sc.pill === 'function' ? sc.pill() : sc.pill) : 'nav-match';
    const p = document.getElementById(pillId); if (p) p.classList.add('active');
  }
  const navMatch = document.getElementById('nav-match');
  // The Vocab tab used to turn into "Back" on inner pages; since 2026-10-16
  // Back has its own link (renderNavBack), so the tab stays a tab.
  const inReadSubScreen = false;
  if (inReadSubScreen) {
    navMatch.textContent = tx('nav.back');
    navMatch.classList.add('sub-screen');
    navMatch.onclick = id === 'vocab-reference' ? closeVocabReference : tryResumeMatch;
  } else {
    navMatch.textContent = APP.vocabTabLabel;
    navMatch.classList.remove('sub-screen');
    navMatch.onclick = tryResumeMatch;
  }
  if (id === 'vocab-tile-selection' && vocabTileCategory) refreshKanaScoreShading('vocab-tile-grid');
  else if (APP.screens[id] && APP.screens[id].onShow) APP.screens[id].onShow();
  // Groups bars refresh here too (2026-10-10): they used to update only when
  // the Groups pill itself was tapped, so coming back from a drill showed the
  // old bars - including a grey "untested" part for words just drilled.
  else if (id === 'match-settings') { buildMatchCategoryList(); if (currentMatchLevel === 'random') refreshRandomView(); if (currentMatchLevel === 'theme') refreshThemeCategorySwatches(); }
}

let lastSettingsScreen = 'match-settings';




function goBackToSettings() {
  // Returning here always means "just finished a drill", never a fresh visit
  // (fresh visits go through their own show*Selection() functions directly).
  // Clear whatever was selected so the just-updated score shading is visible
  // immediately, instead of hidden behind leftover "selected" highlighting.
  if (lastSettingsScreen === 'vocab-tile-selection' && vocabTileCategory) {
    vocabTileSelected[vocabTileCategory].clear();
    buildVocabTileGrid(vocabTileCategory);
    const btn = document.getElementById('vocab-tile-drill-btn');
    if (btn) btn.disabled = true;
    updateSelectAllVocabTilesLabel();
    // Bug: this path rebuilt the grid and Select all's own label, but never
    // refreshed Random 20's label - so after drilling from a random-20 pick
    // (which clears vocabTileRandomMode when the drill starts, see
    // drillVocabTileSelection), the button kept showing its stale
    // "Deselect all" text even though nothing was actually selected anymore.
    updateRandomVocabTilesLabel();
  }
  showScreen(lastSettingsScreen);
}

























/* ---------- end Time challenge ---------- */

/* ---------- Specific-time lookup tool (Vocab page, under Reading times) ----------
   Not a drill - a free-input reference. Reuses the same timeToKana/timeToRomaji
   conversion functions the time-reading drill above already relies on, so the
   two can never disagree with each other. */














function startDrill(customDeck, deckBuilder) {
  lastDeckBuilder = deckBuilder || (() => shuffle(customDeck));
  deck = customDeck;
  current = 0; score = 0; wrong = 0; hints = 0; answered = false; missed = []; missedItems = [];
  showScreen('drill');
  renderQuestion();
}

function drillAgain() {
  if (lastDeckBuilder) startDrill(lastDeckBuilder());
}

let missedItems = []; // stores full question objects for number challenge missed items

function drillMissed() {
  // missed entries are "char|answer" composites, not bare chars - needed so
  // characters that do double duty across sections with different tested
  // meanings (e.g. 火 = Tuesday in one section, fire in another) don't pull
  // in both when only one was actually missed.
  const missedSet = new Set(missed);
  startDrill(shuffle(missedItems.filter(q => missedSet.has(q.char + '|' + q.answer))));
}

const SPEECH_SUPPORTED = ('speechSynthesis' in window);

// GLOBAL SOUND SWITCH (2026-10-02) - the header's speaker button. Every
// sound the app makes goes through soundAllowed(): the drill's speak button,
// "Tap a card to hear it", hold-to-peek, and even the silent warm-up
// utterance on page load (some phones pause music for any speech at all).
// Muted also greys out the controls that would otherwise make a sound.
function soundAllowed() {
  return SPEECH_SUPPORTED && appSettings.soundOn !== false;
}
// iPad/iPhone (2026-10-02): Safari ignores speech that doesn't start inside a
// tap, and hold-to-peek speaks from a timer. Speaking one silent utterance
// during the first real tap/click "unlocks" speech for the rest of the
// visit, so timer-started speech works afterwards. Also: Safari can drop an
// utterance queued straight after cancel(), so only cancel when something
// is actually speaking or queued.
let speechUnlocked = false;
function unlockSpeech() {
  if (speechUnlocked || !soundAllowed()) return;
  speechUnlocked = true;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis.speak(u);
  } catch (e) { /* speech unavailable - nothing to unlock */ }
}
if (SPEECH_SUPPORTED) {
  ['touchend', 'click', 'keydown'].forEach(t =>
    document.addEventListener(t, unlockSpeech, { capture: true, passive: true }));
}
function cancelSpeechIfBusy() {
  if (!SPEECH_SUPPORTED) return;
  const ss = window.speechSynthesis;
  if (ss.speaking || ss.pending) ss.cancel();
}
const SOUND_ICON_ON = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 9 8 9 12 5 12 19 8 15 3 15" fill="currentColor"></polygon><path d="M15.5 8.5a5 5 0 0 1 0 7"></path><path d="M18.5 5.5a9 9 0 0 1 0 13"></path></svg>';
const SOUND_ICON_OFF = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 9 8 9 12 5 12 19 8 15 3 15" fill="currentColor"></polygon><line x1="16" y1="9" x2="22" y2="15"></line><line x1="22" y1="9" x2="16" y2="15"></line></svg>';
function updateSoundButton() {
  const btn = document.getElementById('sound-btn');
  if (!btn) return;
  if (!SPEECH_SUPPORTED) { btn.style.display = 'none'; return; }
  const on = soundAllowed();
  btn.innerHTML = on ? SOUND_ICON_ON : SOUND_ICON_OFF;
  btn.classList.toggle('muted', !on);
  btn.title = on ? tx('sound.onTapToMute') : tx('sound.offTapToTurnOn');
  btn.setAttribute('aria-label', btn.title);
}
function toggleSoundOn() {
  appSettings.soundOn = appSettings.soundOn === false;
  saveSettings();
  if (!appSettings.soundOn && SPEECH_SUPPORTED) window.speechSynthesis.cancel();
  updateSoundButton();
  const speakBtn = document.getElementById('speak-btn');
  if (speakBtn) speakBtn.disabled = !soundAllowed();
  // Listening needs sound: switching sound off switches it off too.
  if (!soundAllowed()) { listenMode = false; randomModes.listen = false; Object.keys(vocabTileListenMode).forEach(k => { vocabTileListenMode[k] = false; }); }
  syncVocabModeToggles();
  if (vocabTileCategory) syncVocabTileModeToggles(vocabTileCategory);
  // Word-tile screen: tap-to-hear card and grid behaviour depend on sound.
  const tileScreen = document.getElementById('screen-vocab-tile-selection');
  if (tileScreen && tileScreen.classList.contains('active') && vocabTileCategory) {
    syncTileSoundControls(vocabTileCategory);
    buildVocabTileGrid(vocabTileCategory);
    refreshKanaScoreShading('vocab-tile-grid');
  }
}
// Portuguese speech, shared by the drill, tap-to-hear and hold-to-peek.
// Says text in the target language. Which voice is right is the language's
// call (LANG.pickVoice); a fallback voice gets a note under "Tap to hear".
function speakTarget(text) {
  if (!soundAllowed()) return null;
  unlockSpeech();
  cancelSpeechIfBusy();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = LANG.code;
  utter.rate = 0.9;
  const voices = window.speechSynthesis.getVoices();
  const v = LANG.pickVoice(voices);
  const desc = document.getElementById('vocab-tile-speak-desc');
  if (v.voice) utter.voice = v.voice;
  if (v.voice && v.fallback) {
    if (desc) desc.textContent = APP.voiceNotes.fallback;
  } else if (!v.voice && voices.length > 0 && desc) {
    desc.textContent = APP.voiceNotes.none;
  }
  window.speechSynthesis.speak(utter);
  return utter;
}

/* ---------- App settings (on-device only, no sync) ----------------------- */
// Defaults are chosen to exactly match the app's behaviour before this
// existed, so installing this doesn't change anything for anyone until they
// actually visit Settings and change something themselves.
const SETTINGS_KEY = APP.storagePrefix + 'Settings';
let appSettings = { theme: 'dark', hintPenalty: false, strictAccents: false, workOffline: false, decayAffectsColours: false, lastSeenChangelog: null, tileTapToSpeak: false, soundOn: true };

// WHAT'S NEW FLAG (2026-09-01) - HOW TO ADD AN ENTRY, so this stays
// consistent across sessions:
//   1. Add a new dated <div class="entry"> block at the TOP of
//      changelog.html (most recent first), written the way the two
//      existing entries there are - plain language, what changed and why
//      someone would care, not an internal diff. Curated, not automatic -
//      routine fixes/tidying don't get their own line, only things
//      actually worth telling someone about.
//   2. Bump LATEST_CHANGELOG_ENTRY below to match that entry's date (or
//      some other value that changes - the only requirement is that it's
//      different from whatever it was before). This is the ONLY thing that
//      triggers the green settings-cog flag (.settings-btn.has-update) -
//      it deliberately does NOT track the version stamp in the footer,
//      which bumps on every small edit, far more often than there's
//      anything worth announcing.
// That's it - two edits, always together. Anyone whose stored
// lastSeenChangelog doesn't match this value sees the flag until they open
// Settings, which clears it (see showSettingsScreen()) - reading the
// changelog itself is optional, opening Settings is what counts as "noticed".
const LATEST_CHANGELOG_ENTRY = '2026-11-05a';
try {
  const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY));
  if (savedSettings && typeof savedSettings === 'object') {
        // One-time migration from the Japanese app's settings (showCustomContent
        // became showKanji/showExtra). Harmless here; kept so an older settings
        // record still loads cleanly.
    Object.assign(appSettings, savedSettings);
  }
} catch (e) {
  // localStorage unavailable or corrupt — fall back to defaults silently
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings));
  } catch (e) {
    // fail silently, same as everywhere else localStorage is used
  }
}

// Single source of truth for "is this item's tier currently visible" - used
// anywhere that scans across every category regardless of level (Random -
// Everything, theme pools, search), so hidden tiers stay hidden the same way
// everywhere.
//
// Per item, not per category: each item's own tags decide (the Japanese app
// hid 'untaught' and 'andrew' words behind settings). The Portuguese app
// hides nothing; it's kept as the one gate every vocab scan goes through, so
// a hidden tier could come back without touching callers.
function itemTierVisible(item) {
  return true;
}

// Walks every VOCAB category once and keeps items matching a tag query -
// the same scanning shape resolveVocabCategory and getThemePool's tagQuery
// branches already use, pulled out here so startRandomMatch (below) can
// reuse it instead of copying the loop a third time. A tag query finds a
// word wherever it's stored, which a walk of one category's items wouldn't.
function scanVocabByTag(query) {
  const items = [];
  Object.keys(VOCAB).forEach(catKey => {
    const cat = VOCAB[catKey];
    (cat.items || []).forEach(item => {
      if (itemTierVisible(item) && tagQueryMatches(item.tags, query)) items.push(item);
    });
  });
  return items;
}

// BUG FIX (2026-09-12): every real VOCAB category has at least 4 physical
// items, so pickDistractorItems(cat.items, ...) always had 3 others to draw
// from - fine for normal drilling. Search results are different: they're
// whatever matched the query, which is very often just 1-3 words (that's
// the point of search), and drillVocabTileSelection was handing
// pickDistractorItems that same tiny match set as its own distractor pool.
// Searching "mother" (one match) produced a drill card with no wrong
// options at all - not a search bug, a distractor-pool bug that search
// happens to expose because it's the only place a category's own item
// pool can legitimately be smaller than 4.
//
// Fix: search drilling draws distractors from every visible word instead
// of just the match set. Normal categories are untouched - they keep using
// their own items as the distractor pool, which is deliberately thematic
// (see pickDistractorItems above).
function allVisibleVocabItems() {
  const items = [];
  Object.keys(VOCAB).forEach(catKey => {
    (VOCAB[catKey].items || []).forEach(item => {
      if (itemTierVisible(item)) items.push(item);
    });
  });
  return items;
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', appSettings.theme === 'light' ? 'light' : 'dark');
  const card = document.getElementById('theme-toggle-card');
  if (card) card.classList.toggle('selected', appSettings.theme === 'light');
}

function toggleTheme() {
  appSettings.theme = appSettings.theme === 'light' ? 'dark' : 'light';
  saveSettings();
  applyTheme();
}



function applyHintPenaltyUI() {
  const card = document.getElementById('hint-penalty-toggle-card');
  if (card) card.classList.toggle('selected', appSettings.hintPenalty);
}

function toggleHintPenalty() {
  appSettings.hintPenalty = !appSettings.hintPenalty;
  saveSettings();
  applyHintPenaltyUI();
}

// See displayScore() / decayedScore() near confidenceBand below for what
// this actually gates - decay itself always runs (it's what drill
// selection reads), this only decides whether colours read the decayed
// value or the raw last-measured one. No live re-render of colours already
// on screen when toggled - same convention as every other display setting
// here: it takes effect next time that screen renders,
// not retroactively on the one you're looking at.
function applyDecayAffectsColoursUI() {
  const card = document.getElementById('decay-colours-toggle-card');
  if (card) card.classList.toggle('selected', appSettings.decayAffectsColours);
}

function toggleDecayAffectsColours() {
  appSettings.decayAffectsColours = !appSettings.decayAffectsColours;
  saveSettings();
  applyDecayAffectsColoursUI();
}

// See LATEST_CHANGELOG_ENTRY above appSettings for the full explanation.
function applySettingsButtonUpdateFlag() {
  const btn = document.getElementById('settings-btn');
  if (btn) btn.classList.toggle('has-update', appSettings.lastSeenChangelog !== LATEST_CHANGELOG_ENTRY);
}





function applyWorkOfflineUI() {
  const card = document.getElementById('offline-toggle-card');
  if (card) card.classList.toggle('selected', appSettings.workOffline);
}

// Registers/unregisters the service worker to match the setting - called on
// every toggle, and once at startup so a stray registration from a previous
// session (e.g. the setting was on, then somehow got turned off without this
// running) gets cleaned up rather than silently lingering. Turning it off
// actively unregisters and clears the cache, rather than just leaving an
// old worker running unmanaged.
function syncServiceWorkerRegistration() {
  // Offline is always on since 2026-10-06 (the "Work offline" toggle was
  // removed). Safe because sw.js is network-first: with signal you always
  // get the latest version, and the saved copy is only used without it.
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').catch(() => {
    // registration can fail (e.g. not served over https) - fail silently
  });
}

function applyStrictAccentsUI() {
  const card = document.getElementById('strict-accents-toggle-card');
  if (card) card.classList.toggle('selected', !!appSettings.strictAccents);
}

function toggleStrictAccents() {
  appSettings.strictAccents = !appSettings.strictAccents;
  saveSettings();
  applyStrictAccentsUI();
}

function applyAllSettingsUI() {
  applyTheme();
  applyHintPenaltyUI();
  applyStrictAccentsUI();
  applyDecayAffectsColoursUI();
  applyWorkOfflineUI();
  applySettingsButtonUpdateFlag();
}

// INSTALL CARD (2026-10-14). A browser reports whether
// the page is running as an installed home-screen app (display-mode
// standalone, or Safari's navigator.standalone). When it isn't, Settings
// shows how to install for this device. Android / desktop Chrome offer their
// own install prompt (beforeinstallprompt), so there the card gets a button.
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstallPrompt = e; refreshInstallCard(); });
window.addEventListener('appinstalled', () => { deferredInstallPrompt = null; refreshInstallCard(); });
function appIsInstalled() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches
      || window.matchMedia('(display-mode: minimal-ui)').matches || window.navigator.standalone === true;
  } catch (e) { return false; }
}
function refreshInstallCard() {
  const card = document.getElementById('install-card');
  if (!card) return;
  if (appIsInstalled() || location.protocol === 'file:') { card.style.display = 'none'; return; }
  const ua = navigator.userAgent || '';
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  let steps;
  if (ios) steps = tx('install.ios');
  else if (android && deferredInstallPrompt) steps = tx('install.androidPrompt');
  else if (android) steps = tx('install.android');
  else if (deferredInstallPrompt) steps = tx('install.desktopPrompt');
  else steps = tx('install.other');
  document.getElementById('install-card-steps').innerHTML = steps;
  document.getElementById('install-btn').style.display = deferredInstallPrompt ? 'inline-block' : 'none';
  card.style.display = 'flex';
}
function runInstallPrompt() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.finally(() => { deferredInstallPrompt = null; refreshInstallCard(); });
}
function showSettingsScreen() {
  refreshInstallCard();
  // Opening Settings at all is what clears the what's-new flag - reading
  // the changelog itself is optional, the cog going green is just meant to
  // say "there's something to notice", not "you owe us a read receipt".
  // hadUpdate is captured BEFORE clearing, since the clear below would
  // otherwise make every check afterwards say "already seen" - it's what
  // lets the "What's new" link itself light up green for this one visit
  // (see below), so there's still something on screen pointing at it once
  // the cog itself has already reverted to normal.
  const hadUpdate = appSettings.lastSeenChangelog !== LATEST_CHANGELOG_ENTRY;
  if (hadUpdate) {
    appSettings.lastSeenChangelog = LATEST_CHANGELOG_ENTRY;
    saveSettings();
    applySettingsButtonUpdateFlag();
  }
  const whatsNewLink = document.getElementById('whats-new-link');
  if (whatsNewLink) {
    whatsNewLink.style.color = hadUpdate ? 'var(--green)' : 'var(--text-muted)';
    whatsNewLink.style.borderColor = hadUpdate ? 'var(--green)' : 'var(--border)';
    whatsNewLink.style.background = hadUpdate ? 'var(--green-dim)' : 'transparent';
  }
  showScreen('settings');
}

/* ---------- Confidence tracking (on-device only, no sync) ---------- */
const KANA_SCORE_KEY = APP.storagePrefix + 'KanaScores';
let kanaScores = {};
try {
  kanaScores = JSON.parse(localStorage.getItem(KANA_SCORE_KEY)) || {};
} catch (e) {
  kanaScores = {};
}

// One-off migration (2026-09-01): every entry used to be a bare number.
// DECAY (see decayedScore() below) needs to know when a score was last
// actually earned, not just what it was, so entries are now
// {score, lastSeen} instead. lastSeen defaults to right now for anything
// migrated here, deliberately - there's no way to know when an existing
// score was really last touched, and defaulting to "now" means nobody's
// colours or drill weighting shift the moment this ships; decay only ever
// starts counting forward from here. Runs before recordKanaResult ever
// writes a new-shape entry, so by the time anything reads kanaScores[key]
// elsewhere in the app, every entry (old or new) is already in the new
// shape - no scattered "is this the old or new shape" checks needed
// anywhere else in the codebase.
Object.keys(kanaScores).forEach((key) => {
  if (typeof kanaScores[key] === 'number') {
    kanaScores[key] = { score: kanaScores[key], lastSeen: Date.now() };
  }
});

function saveKanaScores() {
  try {
    localStorage.setItem(KANA_SCORE_KEY, JSON.stringify(kanaScores));
  } catch (e) {
    // localStorage unavailable (private browsing, storage full, etc.) — fail silently
  }
}

// BACKUP/RESTORE (2026-09-12): a dated .json download of every score, and a
// matching restore with a confirm before it overwrites anything. There's no
// cloud sync in the app - the file goes wherever you already keep things
// safe (a phone's Drive app, email to yourself). Two-way sync was considered
// and left out: two devices used offline would need rules for whose answers
// win, plus accounts and sign-in.
//
// Exports the in-memory kanaScores object, not raw localStorage - the two
// can briefly disagree (the bare-number-to-{score,lastSeen} migration above
// mutates kanaScores on load but only reaches localStorage on the next
// actual score write), so reading kanaScores directly is what guarantees
// the file always reflects the current shape.
function downloadScoresBackup() {
  const data = JSON.stringify(kanaScores);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${APP.backupName}-${today}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showBackupStatus(tx('backup.downloaded'), false);
}

function triggerRestoreFilePicker() {
  const input = document.getElementById('restore-file-input');
  if (input) input.click();
}

// Deliberately a plain overwrite, not a merge - restoring is a rare,
// explicit "I need my old data back" action (new device, cleared storage),
// not routine two-way sync, so there's no real scenario where merging two
// independently-progressed score sets would even make sense. The confirm()
// is the same pattern already used for the interrupted-session prompt.
function handleRestoreFileSelected(event) {
  const file = event.target.files && event.target.files[0];
  event.target.value = ''; // allow re-selecting the same file next time
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let parsed;
    try {
      parsed = JSON.parse(reader.result);
    } catch (e) {
      showBackupStatus(tx('backup.notValid'), true);
      return;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      showBackupStatus(tx('backup.notValid'), true);
      return;
    }
    if (!window.confirm(tx('backup.confirmRestore'))) return;
    // Same bare-number -> {score,lastSeen} normalisation the app runs on
    // load (see above KANA_SCORE_KEY) - cheap and idempotent, and protects
    // against restoring an old-shape export without duplicating the whole
    // migration history here too.
    Object.keys(parsed).forEach((key) => {
      if (typeof parsed[key] === 'number') {
        parsed[key] = { score: parsed[key], lastSeen: Date.now() };
      }
    });
    kanaScores = parsed;
    saveKanaScores();
    showBackupStatus(tx('backup.restored'), false);
  };
  reader.onerror = () => showBackupStatus(tx('file.cantRead'), true);
  reader.readAsText(file);
}

function showBackupStatus(text, isError) {
  const msg = document.getElementById('backup-status-msg');
  if (!msg) return;
  msg.textContent = text;
  msg.classList.toggle('error', !!isError);
  msg.classList.add('show');
  clearTimeout(showBackupStatus._t);
  showBackupStatus._t = setTimeout(() => msg.classList.remove('show'), 2500);
}

// Private vocab file: load (replaces any pack already on this device),
// remove, and the status line in Settings. Both reload the page so every
// list, collection and search picks the change up cleanly.
function updatePrivateVocabStatus() {
  const status = document.getElementById('private-vocab-status');
  const removeBtn = document.getElementById('private-vocab-remove-btn');
  if (!status) return;
  if (PRIVATE_VOCAB_KEYS.length) {
    const parts = PRIVATE_VOCAB_KEYS.map(k => tx('private.listWithCount', { label: VOCAB[k].label, n: VOCAB[k].items.length }));
    let dated = '';
    if (PRIVATE_VOCAB_INFO.updated) {
      const d = new Date(PRIVATE_VOCAB_INFO.updated + 'T12:00:00');
      if (!isNaN(d)) dated = tx('private.fileDated', { date: d.toLocaleDateString(tx('dates.locale'), { day: 'numeric', month: 'short', year: 'numeric' }) });
    }
    status.textContent = tx('private.loaded', { lists: parts.join(', '), dated });
    const n = PRIVATE_VOCAB_INFO.skipped;
    if (n) {
      const warn = document.createElement('div');
      warn.style.cssText = 'color: var(--accent); font-weight: 600; margin-top: 4px;';
      warn.textContent = tx('private.olderFile', { n });
      status.appendChild(warn);
    }
    if (removeBtn) removeBtn.style.display = '';
  } else {
    if (removeBtn) removeBtn.style.display = 'none';
  }
}
function showPrivateVocabMsg(text, isError) {
  const msg = document.getElementById('private-vocab-msg');
  if (!msg) return;
  msg.textContent = text;
  msg.classList.toggle('error', !!isError);
  msg.classList.add('show');
  clearTimeout(showPrivateVocabMsg._t);
  showPrivateVocabMsg._t = setTimeout(() => msg.classList.remove('show'), 3000);
}
function triggerPrivateVocabPicker() {
  const input = document.getElementById('private-vocab-input');
  if (input) input.click();
}
function handlePrivateVocabSelected(event) {
  const file = event.target.files && event.target.files[0];
  event.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let pack;
    try { pack = JSON.parse(reader.result); } catch (e) { showPrivateVocabMsg(tx('private.notAFile'), true); return; }
    const problem = validatePrivateVocabPack(pack);
    if (problem) { showPrivateVocabMsg(problem, true); return; }
    try {
      localStorage.setItem(PRIVATE_VOCAB_KEY, JSON.stringify(pack));
    } catch (e) { showPrivateVocabMsg(tx('private.cantSave'), true); return; }
    showPrivateVocabMsg(tx('private.reloading'), false);
    setTimeout(() => location.reload(), 700);
  };
  reader.onerror = () => showPrivateVocabMsg(tx('file.cantRead'), true);
  reader.readAsText(file);
}
function removePrivateVocab() {
  if (!window.confirm(tx('private.confirmRemove'))) return;
  try { localStorage.removeItem(PRIVATE_VOCAB_KEY); } catch (e) { /* nothing stored */ }
  location.reload();
}
updatePrivateVocabStatus();

/* ---------- In-progress drill persistence (survives a killed page) ------ */
// On mobile, a second "back" press doesn't just background the app - it ends
// the browsing session outright (tab/WebView context genuinely closes), and
// sessionStorage is cleared the moment that happens, by spec. That's exactly
// what real-device testing showed: v068 (sessionStorage) never once offered
// a resume prompt, because the data was wiped before the page ever reloaded.
// localStorage has no such session-lifetime limit - it survives a real close
// the same as a backgrounded kill - so this uses that instead. Drills are
// short, so a session left untouched for more than an hour is treated as
// stale and silently discarded rather than offered back (real interruptions
// are noticed within seconds, not resumed an hour later).
const DRILL_SESSION_KEY = APP.storagePrefix + 'InProgressSession';
const DRILL_SESSION_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

function saveDrillSession() {
  try {
    localStorage.setItem(DRILL_SESSION_KEY, JSON.stringify({
      deck, current, score, wrong, hints, missed, missedItems,
      lastSettingsScreen, vocabReversed, typeAnswerMode, listenMode, grammarTypeModeActive, sayMode, grammarSayModeActive,
      savedAt: Date.now(),
    }));
  } catch (e) {
    // localStorage unavailable (private browsing, storage full, etc.) — fail silently
  }
}

function clearDrillSession() {
  try {
    localStorage.removeItem(DRILL_SESSION_KEY);
  } catch (e) {
    // fail silently, same as above
  }
}

// Checked once at page load. A native confirm() is used deliberately here
// rather than a custom banner - it needs zero new HTML/CSS, so it can't
// interact badly with any existing screen, and it's a one-off decision the
// user makes at most once per interrupted drill.
function tryRestoreDrillSession() {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(DRILL_SESSION_KEY));
  } catch (e) {
    saved = null;
  }
  if (!saved || !Array.isArray(saved.deck) || saved.deck.length === 0) return;
  if (!(saved.current >= 0) || saved.current >= saved.deck.length) { clearDrillSession(); return; }
  if (saved.savedAt && (Date.now() - saved.savedAt) > DRILL_SESSION_MAX_AGE_MS) { clearDrillSession(); return; }
  const resume = window.confirm(tx('session.resume'));
  if (!resume) { clearDrillSession(); return; }
  deck = saved.deck;
  current = saved.current;
  score = saved.score || 0;
  wrong = saved.wrong || 0;
  hints = saved.hints || 0;
  missed = saved.missed || [];
  missedItems = saved.missedItems || [];
  lastSettingsScreen = saved.lastSettingsScreen || 'match-settings';
  vocabReversed = !!saved.vocabReversed;
  typeAnswerMode = !!saved.typeAnswerMode;
  listenMode = !!saved.listenMode;
  grammarTypeModeActive = !!saved.grammarTypeModeActive;
  sayMode = !!saved.sayMode;
  grammarSayModeActive = !!saved.grammarSayModeActive;
  // "Drill again" after a resumed session re-shuffles this same restored
  // deck rather than rebuilding fresh distractors from scratch - the normal
  // deck-builder closures aren't serializable, so this is the closest
  // equivalent rather than leaving "Drill again" broken after a resume.
  lastDeckBuilder = () => shuffle(deck);
  showScreen('drill');
  renderQuestion();
}

function isTrackedItem(q) {
  return !!questionType(q);
}

// The score key: the word and its English together ('jp|en'), so two words
// spelt alike with different meanings keep separate scores. Other kinds of
// question give their own key (q.scoreKey).
function getScoreKey(q) {
  if (q.scoreKey) return q.scoreKey; // verb / contraction cells
  return q.char + '|' + (q.answerEn || q.answer);
}

// halfCredit (Portuguese build): a typed answer with the right letters but
// slipped accents - counts, at half the boost, like a hinted answer.
// production: an answer you typed or said yourself rather than picked.
// 2026-10-24 ("scoring must never punish trying the hard thing"): a miss
// never lowered the score. 2026-11-07: it costs a little (0.25, against 0.75
// for a wrong pick) - small enough that the hard modes are no risk to your
// greens and owning up in Say mode is cheap, but not nothing, or a miss
// would mean nothing.
function recordKanaResult(q, correct, halfCredit, production) {
  if (!isTrackedItem(q)) return;
  const key = getScoreKey(q);
  const isConsistencyItem = questionType(q).scoring === 'consistency';
  // Numbers/time track many sub-answers under one key (numbers-consistency /
  // times-consistency), so they keep their original small symmetric step -
    // the asymmetric item scoring below doesn't apply to them.
    // Everything else is deliberately asymmetric: reaching (and
  // holding) the top of the scale used to be too easy with a flat +/-1 -
  // correct answers now earn less than wrong answers cost, so a single slip
  // takes more than one lucky guess to fully undo.
  const correctIncrement = isConsistencyItem ? 0.1 : 0.5;
  const wrongIncrement = isConsistencyItem ? 0.1 : production ? 0.25 : 0.75;
  // Optional (off by default): a correct answer only counts for half as much
  // if the hint/speak button was used first - wrong answers always cost the
  // full amount regardless, since that part was never in question.
  const increment = (correct && ((appSettings.hintPenalty && hintUsedThisQuestion) || halfCredit)) ? correctIncrement / 2 : correctIncrement;
  const cur = kanaScores[key] ? kanaScores[key].score : 0;
  const next = correct ? Math.min(2, cur + increment) : Math.max(-2, cur - wrongIncrement);
  // Rounding to 1dp used to be safe when 0.1 was the smallest possible step,
  // but the hint-penalty's 0.05 half-step for numbers/time (and now the 0.25
    // hint-penalty half-step for other items) would round straight
  // back up at that precision - 2dp preserves both correctly.
  //
  // lastSeen stamped fresh on every real answer (2026-09-01) - this is the
  // "real evidence" DECAY (see decayedScore() below) measures staleness
  // against. A genuine answer is the only thing that ever moves it, in
  // either direction - decay itself never writes back to kanaScores, it
  // only computes a derived value on read (see decayedScore/displayScore).
  kanaScores[key] = { score: Math.round(next * 100) / 100, lastSeen: Date.now() };
  saveKanaScores();
}

// Single source of truth for every confidence display in the app - one
// item's score, the numbers/times aggregate, and a whole category's average
// all read from these same eight bands, so moving a boundary or changing
// the band count is one edit that reaches every screen at once, rather than
// three separate constants that can quietly drift apart from each other.
//
// The bands themselves were shaped around a single item's reachable
// milestones (each item moves in +0.5/-0.75 steps and clamps at +/-2, so it
// only ever lands on one of a small fixed set of values - 0, 0.5, 1, 1.5, 2
// climbing; 0, -0.75, -1.5, -2 falling). Reusing an evenly-spaced scale
// there meant a pure streak of wrong answers jumped straight from -0.75 to
// -1.5, which already cleared the old top threshold - so the true floor
// showed the exact same shade as -1.5, and a third wrong answer produced no
// visible change at all. These boundaries sit at the actual milestones
// instead, so every single correct or wrong answer shows a new shade until
// the item is genuinely capped. The two directions end up with a different
// number of bands - 3 falling, 4 climbing - because +0.5 fits one more step
// into the +/-2 range than -0.75 does before hitting the cap.
//
// The numbers/times aggregate and category averages don't share that
// discrete-jump problem (both move in much smaller steps or blend many
// items together, so they're already close to continuous) - they simply
// reuse the same boundaries for consistency, not because they needed them.
function confidenceBand(score) {
  if (score === undefined || score === null) return '';
  if (score <= -1.75) return 'neg3';
  if (score <= -1.125) return 'neg2';
  if (score <= -0.375) return 'neg1';
  if (score < 0.25) return 'neutral';
  if (score < 0.75) return 'pos1';
  if (score < 1.25) return 'pos2';
  if (score < 1.75) return 'pos3';
  return 'pos4';
}

const CONFIDENCE_BANDS = ['neg3', 'neg2', 'neg1', 'neutral', 'pos1', 'pos2', 'pos3', 'pos4'];
const SCORE_CLASSES = CONFIDENCE_BANDS.map(b => 'score-' + b);

// WEIGHTED RANDOM SELECTION - SHIPPED (2026-09-01): the random-20 drills
// (buildVocabReadingDeck, the verb drills) used to draw a plain uniform
// shuffle().slice(0, 20) - a word missed five times in a row had exactly the
// same odds of coming up next round as one answered correctly twenty times
// straight. The per-item confidence score below already existed (it's the
// same number driving every score-* swatch in the app) but nothing fed it
// back into what actually gets drilled. This closes that loop: item weight
// is a function of its own confidence score, so weaker and never-seen items
// come up more often, without making a well-known word literally impossible
// to see again. Deliberately NOT applied to the "genuine random N" tile
// disguise (toggleRandomVocabTiles) - that one's whole point is an honest,
// unbiased surprise pick, not a study aid, so it keeps its plain shuffle.
// Time-based decay (a word learned solid a month ago is more due for review
// than one learned solid yesterday) was a deliberate next step, not this one,
// at the time this shipped - see the DECAY entry below for where it landed
// once kanaScores actually had a last-seen timestamp to build it on.
//
// weightFn maps a score to a weight = 2^(-score): half the weight for every
// whole point higher (more confident), double for every whole point lower.
// Never-drilled items are treated as the worst score on the scale (-2, the
// same floor a losing streak reaches) rather than as neutral, so brand-new
// words get surfaced promptly instead of waiting behind ones already being
// actively practiced. Across the full -2..+2 range that's a 16:1 spread
// between the neediest and the most confident item - enough to meaningfully
// bias the deck without ever fully retiring a strong item from review.
function selectionWeight(score) {
  const s = (score === undefined || score === null) ? -2 : score;
  return Math.pow(2, -s);
}

// Efraimidis-Spirakis A-ES algorithm: each item gets a key = random()^(1/w),
// and the N largest keys win. This is a genuine weighted draw, not a biased
// shuffle-then-slice - an item with double another's weight really is about
// twice as likely to be picked, at any weight ratio, not just at the
// extremes. Falls back to a plain shuffle when the whole pool already fits
// in n (weighting a full-pool draw would change nothing but the order).
// Final shuffle of the winners means the deck's own item order doesn't leak
// which ones were weighted heaviest.
function weightedSampleWithoutReplacement(items, n, weightFn) {
  if (items.length <= n) return shuffle([...items]);
  const keyed = items.map(item => {
    const w = Math.max(weightFn(item), 0.0001);
    return { item, key: Math.pow(Math.random(), 1 / w) };
  });
  keyed.sort((a, b) => b.key - a.key);
  return shuffle(keyed.slice(0, n).map(k => k.item));
}

// DECAY - SHIPPED (2026-09-01): closes the gap the WEIGHTED RANDOM
// SELECTION entry above flagged as a deliberate next step, not that one -
// "a word learned solid a month ago is more due for review than one learned
// solid yesterday" now actually happens. kanaScores[key] is never
// overwritten by decay itself - it stays {score, lastSeen}, the raw truth
// as of the last real answer (see recordKanaResult). This computes a
// derived "as of right now" value on top of that, which selection weight
// always reads, and which colour display reads only when
// appSettings.decayAffectsColours is on (see displayScore() below and its
// call sites - kanaScoreClass, the numbers/times/counters consistency
// swatches, the two Colours category tile-border sites, and the
// items-average functions feeding category swatches).
//
// Asymmetric by design, worked through with Andrew before building this:
//   - Positive scores decay toward zero, exponentially, halving every
//     DECAY_HALF_LIFE_DAYS. Tuned once actually felt out (2026-09-01): the
//     real lever isn't the half-life itself but how long a maxed-out word
//     (score 2) takes to visibly drop its FIRST shade band, since the 8
//     bands are discrete and the score moves continuously underneath them -
//     that's ~19% of one half-life (2 needs to fall below 1.75 to leave the
//     top band, and 2 * 2^(-0.1926) = 1.75). The first half-life tried (21
//     days) meant a visible fade after only ~4 days of neglect, which felt
//     like active pressure rather than a gentle nudge; 10 days felt like
//     the right amount of slack, which is what 50 gives. Landed at the
//     upper end of the range that math suggested (a rough "words needed per
//     day to keep the whole pool fresh" sanity check put the reasonable
//     range around 40-65 days for a pool of about 1,300 words) rather than
//     the middle, deliberately - a growing list only adds words to maintain, never
//     fewer, so erring toward more slack now ages better than erring toward
//     less. Easy to retune again once it's been lived with for longer.
//     Decay represents fading CERTAINTY, not demonstrated
//     failure, so it erodes toward neutral (0, "no current evidence either
//     way") and never overshoots past it - the exponential form makes that
//     automatic, it asymptotically approaches 0 and mathematically cannot
//     cross it.
//   - Negative scores never decay. A negative score is evidence of actual
//     measured struggle, not just staleness - there's no fading certainty
//     for time to erode, since the certainty here is "this was gotten
//     wrong", which doesn't become less true by not being asked again.
//     Only a real new answer moves it, in either direction.
//   - Standard SRS models (SM-2, FSRS) don't have this problem to solve -
//     they track a single unipolar "retrievability" (0 to 1), which is the
//     direct equivalent of the positive-decay case here, and floors at 0
//     the same way. There's no established precedent for the negative side
//     because those models have no negative state at all; this app's
//     bipolar score (tracking demonstrated difficulty as a distinct signal
//     from staleness) is the reason the question exists here in the first
//     place, not something borrowed from elsewhere.
const DECAY_HALF_LIFE_DAYS = 50;
function decayedScore(entry) {
  if (!entry) return entry; // never drilled - nothing to decay, caller's own "no entry" handling is unaffected
  if (entry.score <= 0 || !entry.lastSeen) return entry.score;
  const daysSince = (Date.now() - entry.lastSeen) / 86400000;
  if (daysSince <= 0) return entry.score;
  return entry.score * Math.pow(2, -daysSince / DECAY_HALF_LIFE_DAYS);
}

// Picks which version of a stored entry's score to actually show, per the
// decayAffectsColours setting - decayedScore() when it's on, the raw
// last-measured value when it's off. Drill-selection weight always calls
// decayedScore() directly instead of this (see buildVocabReadingDeck/
// the verb drills) - what gets drilled more and what colour gets shown
// are two separate questions, and only the second one is a matter of taste.
function displayScore(entry) {
  if (!entry) return entry;
  return appSettings.decayAffectsColours ? decayedScore(entry) : entry.score;
}

function kanaScoreClass(key) {
  if (!(key in kanaScores)) return ''; // never drilled — no shading at all
  const band = confidenceBand(displayScore(kanaScores[key]));
  return band ? 'score-' + band : '';
}

// Same "never-drilled items excluded, not counted as neutral/zero" average as
// getCategoryAverageScore, but taking a raw items array directly - lets theme
// pools (which span several VOCAB categories, not just one) reuse the exact
// same averaging rule rather than needing their own separate scoring logic.
function getItemsAverageScore(items) {
  if (!items || !items.length) return null;
  let total = 0, count = 0;
  items.forEach(item => {
    const key = item.jp + '|' + item.en;
    if (key in kanaScores) { total += displayScore(kanaScores[key]); count++; }
  });
  return count ? total / count : null;
}

// Per-category confidence SPREAD, for the compact bar on each category tile
// (buildCategoryTile) - same eight bands as confidenceBand/getItemsAverageScore
// above, but counted per band rather than averaged into one number, plus an
// explicit untested count (getItemsAverageScore just excludes those). Same
// jp+'|'+en key convention as getItemsAverageScore, so this only ever needs
// to agree with the average, never reimplement its own scoring rule.
function getCategoryBandCounts(items) {
  const counts = { untested: 0, neg3: 0, neg2: 0, neg1: 0, neutral: 0, pos1: 0, pos2: 0, pos3: 0, pos4: 0 };
  (items || []).forEach(item => {
    const key = item.jp + '|' + item.en;
    const entry = kanaScores[key];
    if (!entry) { counts.untested++; return; }
    counts[confidenceBand(displayScore(entry))]++;
  });
  return counts;
}

// Untested segment drawn first (when shown), then the seven-way climb from
// neg3 to pos4, left to right.
const CAT_BAR_BAND_ORDER = ['neg3', 'neg2', 'neg1', 'neutral', 'pos1', 'pos2', 'pos3', 'pos4'];

// Fills in one tile's bar element in place. showUntested is passed in fresh
// each call rather than stored anywhere - see buildCategoryTile for why
// (per-tile, not persisted: it lives only in that tile's own closure and
// resets the moment the list re-renders).
function renderCategoryBar(barEl, counts, showUntested) {
  const testedTotal = CAT_BAR_BAND_ORDER.reduce((sum, band) => sum + counts[band], 0);
  const barTotal = showUntested ? testedTotal + counts.untested : testedTotal;
  barEl.innerHTML = '';
  if (!barTotal) return;
  if (showUntested && counts.untested) {
    const seg = document.createElement('div');
    seg.className = 'seg';
    seg.style.width = (counts.untested / barTotal * 100) + '%';
    seg.style.background = 'var(--conf-untested-bar)';
    barEl.appendChild(seg);
  }
  CAT_BAR_BAND_ORDER.forEach(band => {
    const n = counts[band];
    if (!n) return;
    const seg = document.createElement('div');
    seg.className = 'seg';
    seg.style.width = (n / barTotal * 100) + '%';
    seg.style.background = 'var(--conf-' + band + '-bar)';
    barEl.appendChild(seg);
  });
}


// Wires (once) and refreshes a cat-bar element that lives on STATIC HTML
// (Collections' cards - buildCategoryTile's own tiles don't need this, see
// its comment: those are recreated fresh on every render, so a plain local
// closure variable already gives the same "resets when you leave and come
// back" behaviour for free). Collections' cards are never rebuilt, so the
// tap-to-toggle-untested state is kept on the element itself
// (barEl._showUntested) - it survives repeated refreshes (scores changing
// elsewhere) but still forgets itself on a full page reload, same as the
// category tiles' own per-tile/non-persisted behaviour.
function setupCatBar(barEl, counts) {
  if (!barEl) return;
  barEl._catCounts = counts;
  renderCategoryBar(barEl, counts, !!barEl._showUntested);
  if (!barEl._catBarWired) {
    barEl._catBarWired = true;
    barEl.title = tx('bars.includeUntested');
    barEl.onclick = (e) => {
      e.stopPropagation(); // don't also trigger the card's own onclick
      barEl._showUntested = !barEl._showUntested;
      renderCategoryBar(barEl, barEl._catCounts, barEl._showUntested);
    };
  }
}


// For the Theme tab's (Collections') static cards - same per-category
// confidence SPREAD bar as buildCategoryTile's own tiles (2026-09-22),
// computed over each theme's freshly-computed pool (getThemePool) rather
// than a single VOCAB category's items, "so it's calculated in a very
// similar way to the others" - just a different item source.
// Topic pills (2026-10-11) - from vocab.js's PT_DRILL_SECTIONS; replaced a
// single "Topics" pill listing all categories at once.
const SECTIONS = (window.DRILL_SECTIONS && window.DRILL_SECTIONS.length) ? window.DRILL_SECTIONS : [{ key: 'all', label: tx('sections.topics') }];
const SECTION_KEYS = SECTIONS.map(s => s.key);
function renderSectionPills() {
  const row = document.getElementById('vocab-level-filter-row');
  if (!row) return;
  row.querySelectorAll('[data-section], [data-extra]').forEach(p => p.remove());
  SECTIONS.forEach(sec => {
    const btn = document.createElement('button');
    btn.className = 'level-pill';
    btn.dataset.section = sec.key;
    btn.textContent = sec.label;
    btn.onclick = () => setMatchLevel(sec.key);
    row.appendChild(btn);
  });
  // The app's extra pills (APP.vocabPills - Verbs, for Portuguese): each
  // opens a screen of its own rather than a word list.
  APP.vocabPills.forEach(xp => {
    const b = document.createElement('button');
    b.className = 'level-pill';
    b.dataset.extra = xp.screen;
    b.textContent = xp.label;
    b.onclick = xp.open;
    row.appendChild(b);
  });
  APP.vocabPills.forEach(renderExtraPillRow);
}
// The same pill row on an extra pill's own screen, with that pill lit: the
// other pills go back to the word lists.
function renderExtraPillRow(xp) {
  const src = document.getElementById('vocab-level-filter-row');
  const row = document.getElementById(xp.rowId);
  if (!src || !row) return;
  row.innerHTML = '';
  src.querySelectorAll('button').forEach(b => {
    const c = b.cloneNode(true);
    c.removeAttribute('id');
    const mine = b.dataset.extra === xp.screen;
    c.classList.toggle('active', mine);
    c.classList.remove('showing-theme-colours');
    if (mine) c.onclick = null;
    else if (b.dataset.extra) c.onclick = APP.vocabPills.find(p => p.screen === b.dataset.extra).open;
    else {
      const level = b.dataset.section || (b.id === 'level-pill-random' ? 'random' : 'theme');
      c.onclick = () => { showScreen('match-settings'); setMatchLevel(level); };
    }
    row.appendChild(c);
  });
}

// Builds the Groups tab's cards from THEMES (i.e. vocab.js). Same markup the
// cards had when they were written into the page by hand.
function renderGroupCards() {
  const view = document.getElementById('match-theme-view');
  if (!view) return;
  view.innerHTML = '';
  Object.keys(THEMES).forEach(key => {
    const g = THEMES[key];
    const card = document.createElement('div');
    card.className = 'group-card cat-tile';
    card.dataset.themeKey = key;
    card.style.cursor = 'pointer';
    card.onclick = () => showVocabTileSelection(key);
    // Word count on the card, as on the topic cards (2026-10-16) - filled in
    // by refreshThemeCategorySwatches, since Latest words changes size.
    card.innerHTML = `<div class="cat-tile-top"><div class="group-name">${escapeHtmlText(g.label)}</div><div class="group-count theme-count"></div></div>` +
      (g.note ? `<div class="random-choice-desc theme-note">${escapeHtmlText(g.note)}</div>` : '') + '<div class="cat-bar"></div>';
    view.appendChild(card);
  });
}

function refreshThemeCategorySwatches() {
  orderThemeCards();
  document.querySelectorAll('#match-theme-view .group-card[data-theme-key]').forEach(card => {
    const bar = card.querySelector('.cat-bar');
    if (bar) setupCatBar(bar, getCategoryBandCounts(getThemePool(card.dataset.themeKey)));
    const cnt = card.querySelector('.theme-count');
    if (cnt) { const n = resolveVocabCategory(card.dataset.themeKey).items.length; cnt.textContent = tx('groups.nWords', { n }); }
  });
  // All vocabulary / Weakest 20 / Untested 20 aren't theme-pool-backed (see
  // the comments on those cards), so they're not covered by the
  // data-theme-key loop above and need their own band-count call each.
}

// Group order (2026-10-07): Latest words always first, then the rest by the
// newest word in each (dateAdded, of the words currently visible), most
// recent at the top; ties in THEMES order (Portuguese build - was
// alphabetical, which sank Trip essentials). So a Group that's just had words
// added rises, and ones nobody has touched in a while drift down.
function orderThemeCards() {
  const view = document.getElementById('match-theme-view');
  if (!view) return;
  const cards = [...view.querySelectorAll(':scope > .group-card[data-theme-key]')];
  const info = cards.map(card => {
    const key = card.dataset.themeKey;
    const newest = getThemePool(key).reduce((m, i) => (i.dateAdded && i.dateAdded > m ? i.dateAdded : m), '');
    return { card, key, newest, order: Object.keys(THEMES).indexOf(key) };
  });
  info.sort((a, b) => {
    if (a.key === 'theme-latest-words') return -1;
    if (b.key === 'theme-latest-words') return 1;
    if (a.newest !== b.newest) return a.newest < b.newest ? 1 : -1;
    return a.order - b.order;
  });
  info.forEach(({ card }) => view.appendChild(card));
}

// RANDOM PAGE (2026-10-07) - the die pill. One choice at a time, then Start.
// The three "everything" drills and the per-level randoms all live here now,
// so Groups and the level pages are purely things you pick words from.
let randomChoice = null;
function refreshRandomView() {
  setupCatBar(document.getElementById('theme-all-vocab-swatch'), getCategoryBandCounts(getCoreVocabPool()));
  setupCatBar(document.getElementById('theme-weakest-vocab-swatch'), getCategoryBandCounts(getWeakestVocabItems(20)));
  setupCatBar(document.getElementById('theme-untested-vocab-swatch'), getCategoryBandCounts(getUntestedVocabItems()));
  // The app's own random drills (APP.randomDrills - Sounds alike for Portuguese).
  Object.entries(APP.randomDrills || {}).forEach(([key, d]) => setupCatBar(document.getElementById('theme-' + key + '-swatch'), getCategoryBandCounts(d.items())));
    // How many are still untested, e.g. "(610 of 872)". Counted by score key,
    // so a word listed in two topics counts once.
  const untestedEl = document.getElementById('untested-count');
  if (untestedEl) {
    const uniq = list => new Set(list.map(i => i.jp + '|' + i.en)).size;
    const fmt = n => n.toLocaleString(tx('dates.locale'));
    untestedEl.textContent = tx('groups.untestedCount', { n: fmt(uniq(getUntestedVocabItems())), of: fmt(uniq(getAllVocabPool())) });
  }
  // Weakest needs something already tested, Untested needs something not yet
  // tested - dim whichever has nothing in it rather than a Start that does nothing.
  const empty = { weakest: !getWeakestVocabItems(1).length, untested: !getUntestedVocabItems().length };
  Object.keys(empty).forEach(k => {
    const card = document.querySelector(`#match-random-view [data-random-key="${k}"]`);
    if (card) card.classList.toggle('dimmed', empty[k]);
    if (empty[k] && randomChoice === k) randomChoice = null;
  });
  updateRandomChoiceUI();
}
function selectRandomChoice(key) {
  const card = document.querySelector(`#match-random-view [data-random-key="${key}"]`);
  if (card && card.classList.contains('dimmed')) return;
  randomChoice = randomChoice === key ? null : key;
  updateRandomChoiceUI();
}
function updateRandomChoiceUI() {
  document.querySelectorAll('#match-random-view [data-random-key]').forEach(card => {
    card.classList.toggle('selected', card.dataset.randomKey === randomChoice);
  });
  const btn = document.getElementById('random-start-btn');
  if (btn) btn.disabled = !randomChoice;
}
function startSelectedRandom() {
  applyRandomModes();
  if (randomChoice === 'all') startRandomMatchEverything();
  else if (randomChoice === 'weakest') startWeakestVocab();
  else if (randomChoice === 'untested') startUntestedVocab();
  else if (APP.randomDrills && APP.randomDrills[randomChoice]) APP.randomDrills[randomChoice].start();
}

// Re-applies confidence shading to every score-keyed tile in a container
// (vocab tile grid).
function refreshKanaScoreShading(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('.kana-ref-card[data-score-key]').forEach(card => {
    card.classList.remove(...SCORE_CLASSES);
    const scoreClass = kanaScoreClass(card.dataset.scoreKey);
    if (scoreClass) card.classList.add(scoreClass);
  });
}

// Chrome/Safari sometimes clip the very start of the first utterance while the
// speech engine "warms up". Priming it silently as soon as the page loads
// means it's already warm by the time the hint button is actually tapped.
updateSoundButton();
if (soundAllowed()) {
  const primer = new SpeechSynthesisUtterance(' ');
  primer.volume = 0;
  window.speechSynthesis.speak(primer);
  window.speechSynthesis.getVoices();
}
