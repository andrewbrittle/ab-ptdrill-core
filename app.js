// Português Drill - the app itself (moved out of index.html, 2026-11-06,
// as the first step of the shared-core refactor; the code is unchanged).
// Loaded after vocab.js and grammar.js, which it reads.
// =============================================================================
// PORTUGUÊS DRILL (2026-10-10) - built from a copy of the Japanese drill app
// (L3 build, v261010.002). What was kept: the whole drilling engine - tag
// queries and Groups, tile selection, confidence scores with decay and
// weighted picking, the four drill modes, search, settings, backup/restore,
// private word lists, offline mode. What was removed as Japanese-only:
// kana and kanji (data, screens, drills), numbers/times/counters/money
// tools, verb forms, particles, grammar notes, sentence builders, the
// proverb of the day, and the course levels (L1/L2/L3/Untaught).
// What changed: the word questions (see DRILL CORE and wordQuestionMode),
// typed-answer marking (accents/articles/Brazilian forms), the speech voice
// (pt-PT), storage names (ptDrill… so nothing is shared with the Japanese
// apps on the same site), and the data adapter (see ADAPTER below).
// Many older comments further down still describe the Japanese build's
// history; they're left in where the code they describe is unchanged.
// =============================================================================

// VOCAB lives in vocab.js, loaded by the <script src> just before this one.
if (!window.PT_DRILL_VOCAB) {
  document.body.insertAdjacentHTML('afterbegin', '<div style="margin:1rem;padding:1rem;border:1.5px solid #e5484d;border-radius:12px;color:#e5484d;font:600 15px/1.4 sans-serif;text-align:center;">The word list (vocab.js) didn\'t load. Check your connection and reload the page.</div>');
  throw new Error('vocab.js did not load');
}
const VOCAB = window.PT_DRILL_VOCAB;

// ADAPTER (Portuguese build, 2026-10-10). vocab.js writes each word as
//   { pt, en, tags, dateAdded, br?, alt?, note? }
// but the engine underneath was built for Japanese and reads item.jp (the
// word in the language being learnt) everywhere - over 100 places. Rather
// than rename all of those in this first pass, each item gets jp = pt here.
// This is the clearest single finding of the conversion: the engine's word
// model is named after Japanese (jp / romaji / en), and a language-neutral
// version would call these something like word / reading / meaning.
function adaptPortugueseItem(item) {
  if (item.jp === undefined && typeof item.pt === 'string') item.jp = item.pt;
  if (!Array.isArray(item.tags)) item.tags = [];
  return item;
}
Object.keys(VOCAB).forEach(k => VOCAB[k].items.forEach(item => { adaptPortugueseItem(item); item.cat = k; }));

// PRIVATE VOCAB PACKS (2026-10-02) - extra categories kept OUT of the
// published app (e.g. textbook word lists, which shouldn't sit on a public
// site) and loaded per device from a JSON file via Settings > Private vocab.
// The file is stored in this browser's localStorage and merged into VOCAB
// here, before anything else reads VOCAB. A pack can only ADD categories -
// a key that already exists in the app's own data is skipped, never
// overwritten. Pack categories get privatePack:true and lead the Untaught
// list (see buildMatchCategoryList). File format:
//   {"format":"pt-drill-private-vocab","version":1,"name":"…",
//    "categories":{"vocab-…":{level,label,chars,tagQuery,items:[…]}}}
// with categories shaped exactly like VOCAB entries.
const PRIVATE_VOCAB_KEY = 'ptDrillPrivateVocab';
const PRIVATE_VOCAB_KEYS = [];
// About the loaded file, for the Settings status line: its own "updated"
// date, and how many of its words the app already has. Those are skipped
// (2026-10-02) - a word that's moved from the private file into the taught
// course would otherwise show twice - and a non-zero count means the file
// on this device is out of date, so Settings flags "check your file".
const PRIVATE_VOCAB_INFO = { updated: null, skipped: 0 };
function validatePrivateVocabPack(pack) {
  if (!pack || typeof pack !== 'object' || pack.format !== 'pt-drill-private-vocab') return "That file isn't a private vocab file";
  const cats = pack.categories;
  if (!cats || typeof cats !== 'object' || Array.isArray(cats) || !Object.keys(cats).length) return 'That file has no word lists in it';
  for (const key of Object.keys(cats)) {
    const c = cats[key];
    if (!c || typeof c.label !== 'string' || !Array.isArray(c.items)) return 'A word list in that file is damaged';
    for (const it of c.items) {
      if (!it || typeof it.pt !== 'string' || typeof it.en !== 'string' || !Array.isArray(it.tags)) return 'A word in that file is damaged';
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
      const items = cat.items.map(adaptPortugueseItem).filter(i => !appWords.has(i.jp + '|' + i.en));
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
(window.PT_DRILL_GROUPS || []).forEach(g => { THEMES[g.key] = g; });

// Every source category above is Level 2 or Trip - itemTierVisible
// below is the single gate that applies to any tier an item's tags
// might carry, so adding a new tier later needs no change here.
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
// a query like ['L1','places'] work - it picks out only the words that
// are both a place AND taught at L1, even though 'places' alone is also
// carried by Trip prep's まち/やすみ and Materials - Shops' 夏季無休, none
// of which are L1 at all. Built 2026-08-26 specifically so L1/L2
// categories can flip to tag queries later without any visible change -
// see the FUTURE DIRECTION note above VOCAB.
// {any:[...]} added 2026-08-27 - OR, item needs ANY ONE of these tags.
// For Collections that are really just a union of a few whole categories
// that already have their own topic tag (Transport+UK Places,
// Countries+Cities, etc.) - see the THEMES entries using this shape.
// Deliberately its own wrapper rather than reusing a bare array for OR -
// a bare array already means AND above, and letting one shape mean two
// different things would be exactly the kind of implicit behavior this
// file has tried to avoid all session.
// IMPORTANT: converting a THEMES entry from `groups:[[...],[...]]` to
// `tagQuery:{any:[...]}` is NOT purely internal the way the L1/L2 AND
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
    // ['occupations', 'occupations-l3'] - same kind of word, different level.
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
  // itemTierVisible per item, same as buildCategoryItems above - a tagged
  // untaught item still disappears from a tag pool the moment Untaught is
  // switched off, same as it would from its own category. This is
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
// (which is exactly how Level 1/2 ended up out of order before).
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
    // what makes an L1/L2 flip possible: a category can query e.g.
    // ['L1','places'] instead of just 'places', so it only picks up its own
    // words even where the topic tag (like 'places') is also shared with
    // Trip/Andrew content elsewhere.
    //
    // Respects cat.ordinalOrder the same way the includeItems branch below
    // does - Numbers, Days, Months, Days of the month, Time and the zodiac-
    // ordered Animals all carry a taught sequence that alphabetizing would
    // scramble (found while checking these 6 L1/L2 categories before
    // trusting this branch for a flip - the unconditional sort below would
    // have silently reordered them the moment tagQuery was added, exactly
    // the kind of side effect the flip is supposed to avoid).
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
    // home (used for words that exist both as curated Trip prep and as
    // something genuinely photographed in Materials: the Materials copy is
    // the one stored copy, Trip references it instead of duplicating it).
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
      label: `Search: "${lastVocabSearchResults.query}"`,
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

// Search across whatever's currently visible (L1/L2 always, Trip/Andrew if
// switched on - see itemTierVisible) - matches against en and romaji
// only, deliberately not seenAs: that's incidental sentence context, not
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
// happening to sit inside Spain (supein), soup, occupied, supermarket,
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
    msgEl.textContent = 'Type at least 2 characters.';
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
        // theme items - that's what buildVocabTileGrid keys its L1/2/Trip/
        // Andrew border colour off (see LEVEL_BORDER_COLORS), so results
        // pulled from several different categories at once get the same
        // "which tier is this from" treatment Collections already has.
        results.push(Object.assign({ level: cat.level || 1, groupKey: catKey }, item));
      }
    });
  });
  if (results.length === 0) {
    msgEl.textContent = `Nothing found yet for "${raw}".`;
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
// DRILL MODES - Portuguese build (2026-10-10).
// The Japanese build had four switches (highlight meaning / reverse / type /
// listen) because a Japanese word has three faces: script, reading, meaning.
// A Portuguese word has two - the word and its meaning - so "highlight the
// meaning" is gone (forward questions always ask for the English), and:
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
// each - Andrew noticed 6 of 12 correct answers in position 1.
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
// so it can be highlighted - checked against the real data before building
// this: a plain substring search alone covers about 70% of entries as-is.
// Most of the rest are verb/adjective conjugation (お買い求めください for
// 買い求める, 選んで for 選ぶ) - Japanese conjugation only ever changes the
// tail, the kanji stem stays put, so stripping 1-2 characters off the end
// and retrying catches most of those too. What's left after that - 〜
// placeholder words like 〜階ホームです standing in for an already-filled-in
// number, and the couple of seenAs notes that describe the word rather than
// quote a sentence containing it (まいばすけっと, 道民) - genuinely has
// nothing to find, so this returns null and the sentence renders unhighlighted,
// same as before this existed. Checked separately: every long, hard-to-scan
// entry (searched by Andrew's own example) matched on the first plain
// attempt - it's exactly the short entries, easy to read at a glance anyway,
// where the fallback doesn't land.
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
// be found (see findSeenAsHighlightRange) - splits the plain string into
// before/match/after around the found range *before* running markSmallKana
// on each piece separately, so small-kana wrapping (っ/ゃ/ゅ/ょ etc) still
// happens correctly inside and outside the highlighted span rather than
// getting confused by HTML already injected into the string.
function renderSeenAsHtml(word, sentence) {
  const range = findSeenAsHighlightRange(word, sentence);
  if (!range) return escapeHtmlText(sentence);
  const before = sentence.slice(0, range.start);
  const match = sentence.slice(range.start, range.end);
  const after = sentence.slice(range.end);
  return escapeHtmlText(before) + '<mark class="seen-as-highlight">' + escapeHtmlText(match) + '</mark>' + escapeHtmlText(after);
}

// Rough plausibility score between two option strings (romaji or English
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
// current drill mode - not just romaji. Without this, two different words
// that happen to share an English gloss could produce duplicate visible
// options, and since both would carry the same dataset.value in meaning
// mode, tapping either would register as correct.
//
// Classmate feedback: pure-random distractors from the whole pool are often
// so dissimilar (wildly different length or starting sound) that you can
// eliminate wrong options on sight without actually recognising the word -
// e.g. the Japanese prompt starts with "ga" and only one of four random
// romaji options happens to start with "g". Biasing toward more confusable
// candidates (matching first letter/length) forces genuine recognition
// instead, without pulling in words from outside the existing pool.
function pickDistractorItems(pool, correctItem, count) {
  // In reversed mode the options shown are Japanese text, not romaji/English,
  // regardless of drillByMeaning - that toggle only affects which side is
  // used as the prompt in reversed mode (see renderQuestion).
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
// no sections/pills needed since these are single unordered lists, unlike kanji.
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

// Maps a category key to the reference screen(s) that belong with it -
// REFERENCE SCREENS FOLDED IN (2026-08-31). Used to be five separate
// ".vocab-ref-card" links hand-placed in buildMatchCategoryList, positioned
// just above their category's own tile in the list - correct, but fragile:
// the reference card's position had to be kept in sync by hand with wherever
// its category ended up in the list (a problem the same day's alphabetical-
// order change would have made worse, since a category's list position now
// depends on its label rather than being fixed). Andrew's proposal: instead
// of tying the reference to a position in the list, tie it to the category
// itself and show it on that category's own tile-selection screen - "tap a
// word to select it for drilling" screen, reference link included. Applies
// equally to L2 (four of these five) and Andrew (one) since both route
// through this same function. Each function here still sets its own
// vocabRefBackTarget internally (now 'vocab-tile-selection' instead of
// 'match-settings' - see each function's own definition) so Back returns to
// the selection screen it was opened from, not the top-level category list -
// same precedent already used for hiragana/katakana's own reference screens.
// Portuguese build (2026-10-10): no reference screens yet - the Japanese
// ones (time units, minute endings, zodiac clock…) were Japanese-only.
// Mechanism kept: { 'vocab-key': [{ label, fn }] }.
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
      [['batch', 'Latest batch'], ['1w', '1 week'], ['2w', '2 weeks']].forEach(([key, label]) => {
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
// COLOUR BY TAG, NOT BUCKET (2026-08-31): keys were originally `trip`/
// `andrew`, read straight off the category-level `level` value. Andrew's
// call: keep the purple/green (they work well), but stop deriving them from
// which category a word happened to live in and derive them from a real
// per-item property instead - exactly the `encountered`/`curated` tags
// added the same day (see the FUTURE DIRECTION entry below for the full
// reasoning). Same two colours, same split (encountered was `andrew`,
// curated was `trip`), just tag-sourced now. `1`/`2` are untouched - taught
// levels aren't part of this change.
// GENKI COLOUR (2026-09-12): rose/pink (#d1568f) - green was ruled out (too
// close to both --green/confidence and 'encountered' above), teal had
// already been tried elsewhere and rejected, red reads as "wrong answer"
// everywhere else in the app, and yellow either crowds --accent (gold) or
// runs too bright. Pink was the first hue in the wheel not already claimed
// by another indicator in this app. Genki's own pill retired 2026-09-28
// (Lesson 1-1 folded into Untaught instead - see buildMatchCategoryList),
// but this key stays live: its word tiles are still bordered pink inside
// their own category screen.
// LEVEL 3 COLOUR (2026-09-28): brown (#a0684d) - the one hue in
// COLOUR_HUES not already claimed by another indicator (green/yellow both
// ruled out above for the same reasons Genki's pick avoided them).
// Portuguese build: no course levels, so no level-coloured tile borders.
const LEVEL_BORDER_COLORS = {};

// Resolves which LEVEL_BORDER_COLORS key applies to a pooled item. Untaught
// items carry `encountered`/`curated` as a real tag now (not inferred from
// category/level), so this checks tags first; taught items have neither
// tag, so this falls through to the old level-based key (1 or 2) exactly as
// before. Pooled items always carry their own `tags` array intact (see
// buildCategoryItems - Object.assign spreads the raw VOCAB item over the
// synthesized level/groupKey fields, so `.tags` survives untouched).
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
  const peek = 'Hold a card to hear it and see any notes.';
  sub.textContent = (tileSpeakModeActive(categoryKey) ? 'Tap a card to hear it. ' : 'Tap a word to select it for drilling. ') + peek;
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
// Speaks the card's kana (or its speakAs override) with a Japanese voice -
// same settings as the drill's hint button (speakCurrent). Picks a ja voice
// explicitly where one is listed, since some Android browsers ignore
// utter.lang alone; if the device has none, says so on the toggle card
// rather than reading Japanese in an English voice without explanation.
function speakVocabTile(item, tileEl) {
  if (!soundAllowed()) return;
  if (tileEl) tileEl.style.borderColor = 'var(--accent)';
  const utter = speakPortuguese(item.speakAs || item.jp);
  if (tileEl) {
    const clear = () => { tileEl.style.borderColor = ''; };
    if (utter) { utter.onend = clear; utter.onerror = clear; }
    setTimeout(clear, 4000);
  }
}

// Latin-script sizing (the Japanese build sized by kana count, where one
// character is roughly a square em - Portuguese words run about twice as long).
function tileWordFontSize(word) {
  const len = word.length;
  return len <= 7 ? '22px' : len <= 12 ? '18px' : len <= 20 ? '15px' : '13px';
}
// HOLD TO PEEK (2026-10-02) - hold any word card ~half a second and a
// bubble shows its kana, romaji and English (and, if sound is on, says it);
// let go and it disappears. A bubble rather than changing the card text,
// because the holding finger covers the card. A peek, not a toggle, so the
// list keeps testing you on the kana. A finger that starts moving is a
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
  // Portuguese build: the second line (romaji in the Japanese build) shows the
  // Brazilian form where it differs, then any usage note.
  const extra = [item.br ? 'Brazil: ' + escapeHtmlText(item.br) : '', item.note ? escapeHtmlText(item.note) : ''].filter(Boolean).join(' · ');
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
    speakPortuguese(item.speakAs || item.jp);
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
      // Colour itself comes from itemColorKey (tag-based for untaught,
      // level-based for taught) - see LEVEL_BORDER_COLORS above.
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
// Andrew: "make all of these categories consistent"): Select all is always
// there; a random pick is offered on top once a list is big enough to want
// one - 21-30 items: Random 10; over 30: Random 20 (getRandomPickSize). Every
// button says what it does, with numbers.
function syncVocabDrillBtn() {
  const btn = document.getElementById('vocab-tile-drill-btn');
  const set = vocabTileSelected[vocabTileCategory];
  if (!btn || !set) return;
  const n = set.size;
  btn.disabled = n === 0;
  btn.textContent = n === 0 ? 'Pick some words to drill' : `Drill ${n} word${n === 1 ? '' : 's'}`;
}
function updateSelectAllVocabTilesLabel() {
  const categoryKey = vocabTileCategory;
  const total = resolveVocabCategory(categoryKey).items.length;
  const set = vocabTileSelected[categoryKey];
  const allSelected = !vocabTileRandomMode[categoryKey] && set.size === total;
  document.getElementById('vocab-tile-select-all-label').textContent = allSelected ? 'Deselect all' : 'Select all';
  document.getElementById('vocab-tile-select-all-card').classList.toggle('selected', allSelected);
}

function updateRandomVocabTilesLabel() {
  const active = !!vocabTileRandomMode[vocabTileCategory];
  const label = document.getElementById('vocab-tile-random20-label');
  if (label) label.textContent = active ? 'Deselect all' : `Random ${currentRandomPickSize(vocabTileCategory)}`;
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




// NAVIGATION HISTORY (2026-10-16, from the Japanese app). Every screen
// change is recorded, so Back - the "← Page" link at the top-left of inner
// pages, the phone's back gesture, and the cog tapped a second time - goes
// exactly one step up. The tab pages (Vocab / Verbs / Numbers / Grammar) are
// roots: arriving at one starts history afresh and Back there does nothing,
// so the app can't be left by accident. Drill and results are never stepped
// back INTO (Back goes to where the drill was started), except from Settings.
// Going to the screen one step back counts as going back, so history never
// doubles up. showScreen already redraws each screen when it's shown, so
// going back just shows the screen again.
var navStack = [], navCurrent = null, navGoingBack = false; // var: showScreen runs at start-up
const NAV_ROOTS = ['match-settings', 'verbs', 'build', 'numbers', 'grammar'];
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
  const greet = document.querySelector('#greeting-overlay.show');
  if (greet) { dismissGreeting(); return; }
  if (typeof hideTilePeekBubble === 'function') hideTilePeekBubble();
  // Safety net: no history on an inner page still goes to its section's main page.
  if (!navStack.length && !NAV_ROOTS.includes(navCurrent)) navStack.push(NAV_HOME[navCurrent] || 'match-settings');
  if (!navStack.length) return;
  const target = navStack.pop();
  navGoingBack = true;
  try { if (target === 'settings') showSettingsScreen(); else showScreen(target); } finally { navGoingBack = false; }
  renderNavBack();
}
const NAV_HOME = { 'grammar-note': 'grammar', 'desk-sheets': 'build', 'sb': 'build' };
function toggleSettings() {
  if (navCurrent === 'settings' && navStack.length) navBack();
  else if (navCurrent !== 'settings') showSettingsScreen();
}
function navLabel(id) {
  if (id === 'match-settings') return ({ theme: 'Groups', random: 'Random' })[currentMatchLevel] || 'Vocab';
  if (id === 'verbs') return 'Verbs';
  if (id === 'drill') return 'Drill';
  if (id === 'results') return 'Results';
  const t = document.querySelector('#screen-' + id + ' .settings-title');
  return (t && t.textContent.trim()) || 'Back';
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
  if (id === 'verbs' || id === 'match-settings') lastVocabRoot = id;
  navRecord(id);
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('visible'));
  document.getElementById('screen-' + id).classList.add('visible');
  renderNavBack();
  document.querySelectorAll('.nav-pill').forEach(p => p.classList.remove('active'));
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) settingsBtn.classList.toggle('active', id === 'settings');
  // Nav pills (Portuguese build): Vocab / Verbs / Grammar. Drill and results
  // light whichever pill the drill was started from.
  if (id !== 'settings') {
    const origin = (id === 'drill' || id === 'results') ? lastSettingsScreen : id;
    const pillId = origin === 'numbers' ? 'nav-numbers'
      : origin === 'verbs' ? 'nav-match'
      : (origin === 'build' || origin === 'sb' || origin === 'desk-sheets') ? 'nav-build'
      : (origin === 'grammar' || origin === 'grammar-note') ? (grammarNoteBack === 'verbs' && origin === 'grammar-note' ? 'nav-match' : 'nav-grammar')
      : 'nav-match';
    const p = document.getElementById(pillId); if (p) p.classList.add('active');
  }
  const navMatch = document.getElementById('nav-match');
  // The Vocab tab used to turn into "Back" on inner pages; since 2026-10-16
  // Back has its own link (renderNavBack), so the tab stays a tab.
  const inReadSubScreen = false;
  if (inReadSubScreen) {
    navMatch.textContent = 'Back';
    navMatch.classList.add('sub-screen');
    navMatch.onclick = id === 'vocab-reference' ? closeVocabReference : tryResumeMatch;
  } else {
    navMatch.textContent = 'Palavras';
    navMatch.classList.remove('sub-screen');
    navMatch.onclick = tryResumeMatch;
  }
  if (id === 'vocab-tile-selection' && vocabTileCategory) refreshKanaScoreShading('vocab-tile-grid');
  else if (id === 'verbs') { buildVerbTileGrid(); syncVerbControls(); }
  else if (id === 'numbers') syncNumbersControls();
  else if (id === 'build') sbRefreshPanels();
  else if (id === 'grammar') setupCatBar(document.getElementById('contraction-swatch'), getCategoryBandCounts(GRAMMAR.contractions.map(contractionItem)));
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

function tryResume() {
  if (deck.length > 0 && current < deck.length) showScreen('drill');
  else goBackToSettings();
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
  btn.title = on ? 'Sound on - tap to mute' : 'Sound off - tap to turn on';
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
// European Portuguese voice wanted (pt-PT): a Brazilian voice sounds very
// different (open vowels, "tch" for ti/di), so it's only used as a fallback,
// and the tap-to-hear card says so. iPhone/iPad: Joana or Catarina (pt-PT)
// can be added in Settings > Accessibility > Spoken Content > Voices.
function pickPortugueseVoice() {
  const voices = window.speechSynthesis.getVoices();
  const norm = v => (v.lang || '').toLowerCase().replace('_', '-');
  return { pt: voices.find(v => norm(v) === 'pt-pt'), br: voices.find(v => norm(v).startsWith('pt')), any: voices.length > 0 };
}
function speakPortuguese(text) {
  if (!soundAllowed()) return null;
  unlockSpeech();
  cancelSpeechIfBusy();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'pt-PT';
  utter.rate = 0.9;
  const v = pickPortugueseVoice();
  const desc = document.getElementById('vocab-tile-speak-desc');
  if (v.pt) utter.voice = v.pt;
  else if (v.br) {
    utter.voice = v.br;
    if (desc) desc.textContent = "Only a Brazilian Portuguese voice was found on this device, so words will sound Brazilian - add a Portugal (pt-PT) voice in your phone's spoken content / text-to-speech settings.";
  } else if (v.any && desc) {
    desc.textContent = "This device doesn't seem to have a Portuguese voice installed - add one (Portugal) in your phone's spoken content / text-to-speech settings.";
  }
  window.speechSynthesis.speak(utter);
  return utter;
}

/* ---------- App settings (on-device only, no sync) ----------------------- */
// Defaults are chosen to exactly match the app's behaviour before this
// existed, so installing this doesn't change anything for anyone until they
// actually visit Settings and change something themselves.
const SETTINGS_KEY = 'ptDrillSettings';
let appSettings = { theme: 'dark', hintPenalty: false, strictAccents: false, workOffline: false, decayAffectsColours: false, lastSeenChangelog: null, tileTapToSpeak: false, soundOn: true };

// WHAT'S NEW FLAG (2026-09-01) - HOW TO ADD AN ENTRY, so this stays
// consistent across sessions and not just something Andrew has to remember
// to ask for correctly each time:
//   1. Add a new dated <div class="entry"> block at the TOP of
//      changelog.html (most recent first), written the way the two
//      existing entries there are - plain language, what changed and why
//      someone would care, not an internal diff. Curated, not automatic -
//      routine fixes/tidying don't get their own line, only things
//      actually worth telling classmates about.
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
    // One-time migration: showKanji/showExtra replace the old single
    // showCustomContent switch (Kanji and Extra vocab used to be gated
    // together - now they're independent). If this is the first load since
    // upgrading, savedSettings will have the old key but not the new ones,
    // so carry its value across to both. Once that's happened, savedSettings
    // will have showKanji/showExtra of its own from then on (see
    // saveSettings() below), so this condition never fires again and the
    // two toggles are free to diverge.
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
// Everything, theme pools, search), so Untaught and Andrew-mode content
// stay gated the same way everywhere rather than each call site
// re-deriving its own version of this check (and risking one of them
// forgetting a tier).
//
// PER-ITEM, NOT PER-CATEGORY - SHIPPED (2026-08-31): this used to be
// categoryTierVisible(level), called once per source category to decide
// whether to skip its `items` entirely. That was always a stand-in for
// what the words themselves already say about themselves: every untaught
// item already carries the 'untaught' tag (100% coverage, verified before
// this shipped), so checking the item's own tag directly is both more
// accurate and one step closer to THE FLIP point 1 above VOCAB ("level
// stops being a category-level property and becomes a per-item one").
// Andrew raised this directly after the Trip/Andrew merge shipped -
// wanted genuine per-item gating rather than a per-category shortcut that
// only worked because the data happened to be clean. The "bring forward"
// half of point 1 (level updating in place when a word's re-taught) turned
// out not to be a real blocker either, in the same conversation - a word
// simply gets tagged with both levels (e.g. ['L1','L3']) and the existing
// tag-query mechanism already finds it in both without any extra work, so
// there was never a need for level to literally move.
//
// 'andrew' is dormant as of 2026-08-31 - no item currently carries that
// tag (checked: 0/1289), since Andrew mode has no content to gate yet -
// but the branch stays wired up and ready for whenever L3 content lands
// here and gets tagged the same way untaught content already is.
// No hidden tiers in the Portuguese build (the Japanese build hid Untaught,
// Genki and Andrew-mode words behind settings). Kept as the single gate every
// vocab scan goes through, so a tier can come back without touching callers.
function itemTierVisible(item) {
  return true;
}

// Walks every VOCAB category once and keeps items matching a tag query -
// the same scanning shape resolveVocabCategory and getThemePool's tagQuery
// branches already use, pulled out here so startRandomMatch (below) can
// reuse it instead of copying the loop a third time. Added 2026-08-27 so
// "Random - Level 1/2" is a genuine tag query (item has tag 'L1'/'L2')
// rather than a bucket walk (category's own level property) - the
// difference matters the moment a word is tagged forward to a later level
// (e.g. tags:['L1','L3',...]) without moving its physical storage: a tag
// query finds it in both level's random pools automatically, a bucket walk
// never would, since the word's home category only has one level stamp.
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
// pool can legitimately be smaller than 4. Confirmed identical in the
// frozen L2 build (same code, untouched there), so this has been present
// since before the flip - not something the Genki work introduced.
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
// here (showKanji, etc.): it takes effect next time that screen renders,
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

function toggleWorkOffline() {
  appSettings.workOffline = !appSettings.workOffline;
  saveSettings();
  applyWorkOfflineUI();
  syncServiceWorkerRegistration();
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

// INSTALL CARD (from the Japanese app, 2026-10-14). A browser reports whether
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
  if (ios) steps = 'Tap the Share button (the square with an arrow, at the bottom in Safari or top right in Chrome), scroll down and tap <strong>Add to Home Screen</strong>, then Add.';
  else if (android && deferredInstallPrompt) steps = 'Tap <strong>Install</strong>, or use the browser menu (⋮) → Install app.';
  else if (android) steps = 'In Chrome or Vivaldi, open the menu (⋮), then <strong>Install app</strong> or <strong>Add to Home screen</strong>.';
  else if (deferredInstallPrompt) steps = 'Click <strong>Install</strong>, or use the install icon at the right of the address bar.';
  else steps = 'On a phone, open this page and use the browser\'s Add to Home Screen. On a computer, look for an install icon at the right of the address bar (Chrome or Edge).';
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

/* ---------- Kana confidence tracking (on-device only, no sync) ---------- */
// Tracks a -2..+2 score per single kana character, based on right/wrong
// answers during hiragana/katakana drilling (base/diacritic/youon groups
// only — not word/number/time/kanji). Shown as tile shading on the
// reference screens; doesn't affect drilling, scoring, or selection.
const KANA_SCORE_KEY = 'ptDrillKanaScores';
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

// BACKUP/RESTORE - SHIPPED (2026-09-12, see downloadScoresBackup() below
// for the real implementation). Kept the original plan below as-is for the
// reasoning trail (why Tier 1 was chosen over live sync, and what Tiers 2/3
// would look like if this ever gets reopened).
//
// BACKUP/RESTORE - DIRECTION SET, NOT YET STARTED (2026-09-05): the debug
// export box below only solves "copy the JSON off a phone for me to look
// at" - it was never meant as a real backup path, and isn't one: it's
// hidden, one-way (no import), and a copy of it left sitting on the same
// device is no safer than the localStorage it's copying, so it doesn't
// protect against the actual risk (device lost/wiped/replaced) at all.
//
// Andrew's ideal is live cross-device sync via Google Drive/OneDrive, but
// that's a materially bigger thing than it sounds: real two-way sync means
// deciding what happens when two devices have both been used offline and
// then reconnect (whose answers win, or do they merge per-word), plus
// account auth, plus behaviour before the first sync ever completes. Scoped
// out for now as disproportionate to the actual problem, not rejected
// outright - see the tiered plan below, worth revisiting if real cross-
// device *live* use ever becomes the actual pain point rather than backup.
//
// Chosen instead (Tier 1 of a 3-tier plan discussed 2026-09-05): turn this
// same export box into a real, visible "Back up my progress" button that
// downloads kanaScores as a dated .json file, plus a matching "Restore from
// backup" file picker that reads one back in (JSON.parse in a try/catch,
// a sanity check it looks like a scores object, a confirm() before
// overwriting - same confirm() pattern already used for the interrupted-
// session prompt above). No cloud integration in the app at all - the user
// saves the file wherever they already trust things to survive (their
// phone's Drive/OneDrive app, email to self), so the app leans on
// infrastructure that already exists rather than building any. Estimated
// ~60-80 lines of actual HTML/CSS/JS, touching only this settings card and
// kanaScores/saveKanaScores() - isolated from drilling, scoring and
// selection.
//
// Rejected-for-now escalations, in case this gets reopened later:
//   - Tier 2: same download, but via the Web Share API on phones so it
//     goes straight to the OS share sheet (Drive/OneDrive/Files/Mail)
//     instead of a plain file download. Small, additive, feature-detected
//     fallback to Tier 1 - fine to add whenever, not blocked on anything.
//   - Tier 3: opportunistic one-way push of a snapshot to a fixed file in
//     the user's Drive whenever scores change and the device is online,
//     pulled down once on a new device. Deliberately NOT two-way sync -
//     latest write simply overwrites, no merge/conflict logic needed,
//     because there's only ever one direction at a time. Real cost isn't
//     the sync logic (same try/fail-silently shape as everything else
//     localStorage already does here), it's the one-time setup: an OAuth
//     client registration and a sign-in step. Would sit behind its own
//     Settings toggle, default off, same shape as "Work offline" - changes
//     nothing for anyone who leaves it alone.
//
// SHIPPED (2026-09-12) - see the BACKUP/RESTORE comment above appSettings
// for the original plan; built now because the L3 move is a real, concrete
// reason rather than a hypothetical one. Replaces the old hidden debug
// export box outright rather than sitting alongside it - same underlying
// data, this is just the real version of the same idea.
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
  a.download = `portuguese-drill-backup-${today}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showBackupStatus('Backup downloaded', false);
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
      showBackupStatus("That file isn't a valid backup", true);
      return;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      showBackupStatus("That file isn't a valid backup", true);
      return;
    }
    if (!window.confirm("This replaces your current progress with what's in this backup. Continue?")) return;
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
    showBackupStatus('Progress restored', false);
  };
  reader.onerror = () => showBackupStatus("Couldn't read that file", true);
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
    const parts = PRIVATE_VOCAB_KEYS.map(k => `${VOCAB[k].label} (${VOCAB[k].items.length} words)`);
    let dated = '';
    if (PRIVATE_VOCAB_INFO.updated) {
      const d = new Date(PRIVATE_VOCAB_INFO.updated + 'T12:00:00');
      if (!isNaN(d)) dated = ' — file dated ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    status.textContent = 'Loaded on this device: ' + parts.join(', ') + dated + '. Load a newer file to replace it.';
    const n = PRIVATE_VOCAB_INFO.skipped;
    if (n) {
      const warn = document.createElement('div');
      warn.style.cssText = 'color: var(--accent); font-weight: 600; margin-top: 4px;';
      warn.textContent = `Check your file: ${n} word${n === 1 ? ' in it is' : 's in it are'} now part of the course itself, so this looks like an older version. Load the latest file.`;
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
    try { pack = JSON.parse(reader.result); } catch (e) { showPrivateVocabMsg("That file isn't a private vocab file", true); return; }
    const problem = validatePrivateVocabPack(pack);
    if (problem) { showPrivateVocabMsg(problem, true); return; }
    try {
      localStorage.setItem(PRIVATE_VOCAB_KEY, JSON.stringify(pack));
    } catch (e) { showPrivateVocabMsg("Couldn't save it on this device", true); return; }
    showPrivateVocabMsg('Loaded - reloading…', false);
    setTimeout(() => location.reload(), 700);
  };
  reader.onerror = () => showPrivateVocabMsg("Couldn't read that file", true);
  reader.readAsText(file);
}
function removePrivateVocab() {
  if (!window.confirm('Remove the private word lists from this device? Your scores for those words are kept, and you can load the file again any time.')) return;
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
const DRILL_SESSION_KEY = 'ptDrillInProgressSession';
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
  const resume = window.confirm('It looks like your last session was interrupted. Resume where you left off?');
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
  return !!(q && (q.disp === 'word' || q.disp === 'verb' || q.disp === 'contraction' || q.disp === 'number' || q.disp === 'time' || q.disp === 'sound'));
}

// Kana characters always mean the same sound, so the character itself is a
// safe score key. A few kanji (火/水/木, etc.) are reused across categories
// with genuinely different meanings (Tuesday vs fire, for example) — for
// those, character alone would silently blend two different scores together,
// so kanji use char+answer as the key instead.
function getScoreKey(q) {
  if (q.scoreKey) return q.scoreKey; // verb / contraction cells
  return q.char + '|' + (q.answerEn || q.answer);
}

// halfCredit (Portuguese build): a typed answer with the right letters but
// slipped accents - counts, at half the boost, like a hinted answer.
// production (2026-10-24, from the Japanese app's principle "scoring must
// never punish trying the hard thing"): a typed or said-out-loud answer that
// misses never lowers the score - a right one still raises it - so the hard
// modes are never a risk to your greens.
function recordKanaResult(q, correct, halfCredit, production) {
  if (!isTrackedItem(q)) return;
  if (production && !correct) return;
  const key = getScoreKey(q);
  const isConsistencyItem = (q.disp === 'number' || q.disp === 'time' || q.disp === 'counter');
  // Numbers/time track many sub-answers under one key (numbers-consistency /
  // times-consistency), so they keep their original small symmetric step -
  // the asymmetric kana/kanji/word scoring below doesn't apply to them.
  // Kana, kanji and word items are deliberately asymmetric: reaching (and
  // holding) the top of the scale used to be too easy with a flat +/-1 -
  // correct answers now earn less than wrong answers cost, so a single slip
  // takes more than one lucky guess to fully undo.
  const correctIncrement = isConsistencyItem ? 0.1 : 0.5;
  const wrongIncrement = isConsistencyItem ? 0.1 : 0.75;
  // Optional (off by default): a correct answer only counts for half as much
  // if the hint/speak button was used first - wrong answers always cost the
  // full amount regardless, since that part was never in question.
  const increment = (correct && ((appSettings.hintPenalty && hintUsedThisQuestion) || halfCredit)) ? correctIncrement / 2 : correctIncrement;
  const cur = kanaScores[key] ? kanaScores[key].score : 0;
  const next = correct ? Math.min(2, cur + increment) : Math.max(-2, cur - wrongIncrement);
  // Rounding to 1dp used to be safe when 0.1 was the smallest possible step,
  // but the hint-penalty's 0.05 half-step for numbers/time (and now the 0.25
  // hint-penalty half-step for kana/kanji/word items) would round straight
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
// (buildVocabReadingDeck, buildRandomKanjiPool) used to draw a plain uniform
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
//     range around 40-65 days for the current ~1293-word pool) rather than
//     the middle, deliberately - L3 only adds more words to maintain, never
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
// buildRandomKanjiPool) - what gets drilled more and what colour gets shown
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

function continuousScoreClass(score) {
  const band = confidenceBand(score);
  return band ? 'score-' + band : '';
}

// Whole-category average, for the category-select cards (Level 1/Level 2/
// Extra tabs). Never-drilled items are excluded from the average entirely
// (not counted as neutral/zero) - a category nobody has touched yet should
// show no shading at all, same convention as kanaScoreClass for single items.
// Returns null when zero items in the category have been drilled.
function getCategoryAverageScore(categoryKey) {
  // Routed through resolveVocabCategory (not raw VOCAB[categoryKey]) so a
  // category using includeItems gets a swatch that reflects the referenced
  // word's score too, not just its own stored items.
  const v = resolveVocabCategory(categoryKey);
  if (!v) return null;
  return getItemsAverageScore(v.items);
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
// neg3 to pos4 - same left-to-right ordering as the kanji app's own
// progress bar, for anyone who's used both.
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
    barEl.title = "Tap to include words you haven't drilled yet";
    barEl.onclick = (e) => {
      e.stopPropagation(); // don't also trigger the card's own onclick
      barEl._showUntested = !barEl._showUntested;
      renderCategoryBar(barEl, barEl._catCounts, barEl._showUntested);
    };
  }
}

function categoryConfidenceClass(avg) {
  const band = confidenceBand(avg);
  return band ? 'cat-conf-' + band : '';
}


const CAT_CONF_CLASSES = CONFIDENCE_BANDS.map(b => 'cat-conf-' + b);

// For the Theme tab's (Collections') static cards - same per-category
// confidence SPREAD bar as buildCategoryTile's own tiles (2026-09-22),
// computed over each theme's freshly-computed pool (getThemePool) rather
// than a single VOCAB category's items, "so it's calculated in a very
// similar way to the others" per Andrew - just a different item source.
// Topic pills (2026-10-11) - from vocab.js's PT_DRILL_SECTIONS; replaced a
// single "Topics" pill listing all categories at once.
const SECTIONS = (window.PT_DRILL_SECTIONS && window.PT_DRILL_SECTIONS.length) ? window.PT_DRILL_SECTIONS : [{ key: 'all', label: 'Topics' }];
const SECTION_KEYS = SECTIONS.map(s => s.key);
function renderSectionPills() {
  const row = document.getElementById('vocab-level-filter-row');
  if (!row) return;
  row.querySelectorAll('[data-section], [data-verbs]').forEach(p => p.remove());
  SECTIONS.forEach(sec => {
    const btn = document.createElement('button');
    btn.className = 'level-pill';
    btn.dataset.section = sec.key;
    btn.textContent = sec.label;
    btn.onclick = () => setMatchLevel(sec.key);
    row.appendChild(btn);
  });
  // Verbs (2026-10-24): a pill here rather than a tab of its own.
  const vb = document.createElement('button');
  vb.className = 'level-pill';
  vb.dataset.verbs = '1';
  vb.textContent = 'Verbs';
  vb.onclick = showVerbsScreen;
  row.appendChild(vb);
  renderVerbsLevelRow();
}
// The same pill row on the Verbs screen, with Verbs lit: the other pills
// go back to the word lists.
function renderVerbsLevelRow() {
  const src = document.getElementById('vocab-level-filter-row');
  const row = document.getElementById('verbs-level-row');
  if (!src || !row) return;
  row.innerHTML = '';
  src.querySelectorAll('button').forEach(b => {
    const c = b.cloneNode(true);
    c.removeAttribute('id');
    c.classList.toggle('active', !!b.dataset.verbs);
    c.classList.remove('showing-theme-colours');
    if (b.dataset.verbs) c.onclick = null;
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
    if (cnt) { const n = resolveVocabCategory(card.dataset.themeKey).items.length; cnt.textContent = `${n} word${n === 1 ? '' : 's'}`; }
  });
  // All vocabulary / Weakest 20 / Untested 20 aren't theme-pool-backed (see
  // the comments on those cards), so they're not covered by the
  // data-theme-key loop above and need their own band-count call each.
  // All kanji moved to screen-kanji-selection (2026-09-22) and no longer
  // has a bar at all there (styled to match Select all instead - see that
  // card's own comment), so there's nothing left to refresh for it here.
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
  setupCatBar(document.getElementById('theme-sounds-swatch'), getCategoryBandCounts(soundScoreItems()));
  // How many are still untested, e.g. "(610 of 872)" - from the Japanese
  // app, 2026-10-15. Counted by score key, so a word listed in two topics
  // counts once.
  const untestedEl = document.getElementById('untested-count');
  if (untestedEl) {
    const uniq = list => new Set(list.map(i => i.jp + '|' + i.en)).size;
    const fmt = n => n.toLocaleString('en-GB');
    untestedEl.textContent = ` (${fmt(uniq(getUntestedVocabItems()))} of ${fmt(uniq(getAllVocabPool()))})`;
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
  else if (randomChoice === 'sounds') startSoundDrill();
}

// ==== SOUNDS ALIKE (2026-10-14, from the Japanese app's small-っ drill) ====
// Pairs of real words that differ by one sound (grammar.js soundPairs).
// Sound on: hear one, pick which - the buttons show the English, never the
// spelling, and are always in the same order. Sound off: read the English of
// one, pick its spelling. Scored per word ('sound|avó'), separate from vocab.
// (Read from GRAMMAR on each call: refreshRandomView runs during init,
// before a top-level const down here would exist.)
function soundPairs() { return GRAMMAR.soundPairs || []; }
function soundScoreItems() {
  const out = [];
  soundPairs().forEach(p => { out.push({ jp: 'sound', en: p.a[0] }); out.push({ jp: 'sound', en: p.b[0] }); });
  return out;
}
function buildSoundDeck() {
  const words = [];
  soundPairs().forEach(p => {
    const pair = [{ pt: p.a[0], en: p.a[1] }, { pt: p.b[0], en: p.b[1] }];
    pair.forEach(w => words.push({ w, pair, note: p.note }));
  });
  const picks = weightedSampleWithoutReplacement(words, 20, x => selectionWeight(decayedScore(kanaScores['sound|' + x.w.pt])));
  return shuffle(picks).map(({ w, pair, note }) => ({
    disp: 'sound', groupKey: 'sound', scoreKey: 'sound|' + w.pt,
    char: w.pt, answer: w.pt, en: w.en, pair, note,
  }));
}
function startSoundDrill() {
  lastSettingsScreen = 'match-settings';
  startDrill(buildSoundDeck(), buildSoundDeck);
}
function renderSoundQuestion(q, charDisplay, container) {
  const speakBtn = document.getElementById('speak-btn');
  if (speakBtn) speakBtn.style.display = 'none';
  const listening = soundAllowed();
  if (listening) {
    const say = () => speakPortuguese(q.answer);
    charDisplay.innerHTML = `<button type="button" class="listen-play" aria-label="Play again">${LISTEN_ICON}</button>`;
    charDisplay.querySelector('.listen-play').onclick = say;
    document.getElementById('q-prompt').textContent = 'Which word did you hear?';
    setTimeout(() => { if (deck[current] === q && !answered) say(); }, 120);
  } else {
    charDisplay.textContent = q.en;
    charDisplay.style.fontSize = promptFontSize(q.en);
    document.getElementById('q-prompt').textContent = 'Which one means this?';
  }
  q.pair.forEach((w, idx) => {
    const btn = document.createElement('button');
    btn.className = 'opt sound-opt';
    btn.innerHTML = listening
      ? `<span class="opt-num">${idx + 1}</span><span class="opt-rd opt-pt" style="font-size:17px">${escapeHtmlText(w.en)}</span><span class="sound-spelling"></span>`
      : optPtHtml(idx, w.pt) + '<span class="sound-spelling"></span>';
    btn.dataset.value = w.pt;
    btn.dataset.pt = w.pt;
    btn.dataset.en = w.en;
    btn.onclick = () => choose(btn, w.pt, q.answer, q.char);
    container.appendChild(btn);
  });
}
// After answering: each button shows both its spelling and its meaning, and
// tapping one plays it, so the two can be compared.
function revealSoundPair() {
  document.querySelectorAll('#q-options .sound-opt').forEach(b => {
    const sp = b.querySelector('.sound-spelling');
    if (sp) sp.textContent = soundAllowed() ? b.dataset.pt : b.dataset.en;
    if (soundAllowed()) { b.disabled = false; b.onclick = () => speakPortuguese(b.dataset.pt); }
  });
}


// Re-applies confidence shading to every score-keyed tile in a container
// (vocab tile grid). Kept from the Japanese build - it was filed with the kana
// code but is generic.
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



function getSpeechText(q) {
  return q.speakAs || q.char;
}

// The drill's speaker button. Counts as a hint before answering, as before.
function speakCurrent() {
  if (!soundAllowed()) return;
  const q = deck[current];
  if (!q) return;
  if (!answered && !hintUsedThisQuestion) {
    hintUsedThisQuestion = true;
    hints++;
    document.getElementById('stat-hints').textContent = hints;
  }
  speakPortuguese(getSpeechText(q));
}

function renderTypeAnswerInput(container, placeholder, submitFn) {
  container.innerHTML = '<div class="type-answer-row">' +
    `<input type="text" id="type-answer-input" class="type-answer-input" lang="pt-PT" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="${placeholder}">` +
    '<button type="button" class="type-answer-submit" id="type-answer-submit">Check</button>' +
    '</div>';
  const input = document.getElementById('type-answer-input');
  const submitBtn = document.getElementById('type-answer-submit');
  const submit = () => submitFn(input.value);
  submitBtn.onclick = submit;
  input.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      e.stopPropagation();
      submit();
    }
  };
  setTimeout(() => input.focus(), 30);
}

const LISTEN_ICON = '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 9 8 9 12 5 12 19 8 15 3 15" fill="currentColor"></polygon><path d="M15.5 8.5a5 5 0 0 1 0 7"></path><path d="M18.5 5.5a9 9 0 0 1 0 13"></path></svg>';

function renderListenPrompt(q, charDisplay, promptText) {
  const say = () => speakPortuguese(getSpeechText(q));
  charDisplay.innerHTML = `<button type="button" class="listen-play" aria-label="Play again">${LISTEN_ICON}</button>`;
  charDisplay.querySelector('.listen-play').onclick = say;
  document.getElementById('q-prompt').textContent = promptText;
  const speakBtn = document.getElementById('speak-btn');
  if (speakBtn) speakBtn.style.display = 'none';
  setTimeout(() => { if (deck[current] === q && !answered) say(); }, 120);
}

// After answering a listening question, show the word that was played
// (tap it to hear it again).
function revealListenWord(q) {
  const charDisplay = document.getElementById('q-char');
  if (!charDisplay || !charDisplay.querySelector('.listen-play')) return;
  charDisplay.textContent = q.char;
  charDisplay.style.fontSize = promptFontSize(q.char);
  charDisplay.style.cursor = 'pointer';
  charDisplay.onclick = () => speakPortuguese(getSpeechText(q));
}

function promptFontSize(text) {
  const len = String(text).length;
  return len <= 8 ? '52px' : len <= 14 ? '40px' : len <= 22 ? '30px' : '24px';
}

// Shown under the verdict once a question is answered: the Brazilian form
// where it differs, and any usage note.
function answerNotesHtml(q) {
  let html = '';
  if (q.br) html += `<div class="feedback-standard-note">In Brazil: ${escapeHtmlText(q.br)}</div>`;
  if (q.note) html += `<div class="feedback-standard-note">${escapeHtmlText(q.note)}</div>`;
  return html;
}

function renderQuestion() {
  if (current >= deck.length) { showResults(); return; }
  saveDrillSession();
  const q = deck[current];
  const pct = Math.round((current / deck.length) * 100);
  document.getElementById('prog-fill').style.width = pct + '%';
  document.getElementById('prog-label').textContent = (current + 1) + ' / ' + deck.length;
  document.getElementById('stat-correct').textContent = score;
  document.getElementById('stat-wrong').textContent = wrong;
  document.getElementById('stat-hints').textContent = hints;
  document.getElementById('stat-left').textContent = deck.length - current;

  const badge = document.getElementById('q-badge');
  const cat = VOCAB[q.cat] || VOCAB[q.groupKey] || THEMES[q.groupKey];
  badge.textContent = cat ? cat.label : 'vocab';
  badge.className = 'type-badge type-base';

  const altEl = document.getElementById('q-alt-form');
  if (altEl) altEl.style.display = 'none';

  const contextCard = document.getElementById('q-context-card');
  const contextCardBody = document.getElementById('q-context-card-body');
  if (contextCard && contextCardBody) {
    if (q.seenAs || q.source) {
      let html = '';
      if (q.seenAs) html += `<div class="seen-as-text">${renderSeenAsHtml(q.char, q.seenAs)}</div>`;
      if (q.source) {
        html += `<div class="context-card-meta">${q.source.location}${q.source.date ? ' · ' + q.source.date : ''}</div>`;
        if (q.source.file) html += `<div class="context-card-file">${q.source.file}</div>`;
      }
      contextCardBody.innerHTML = html;
      contextCard.style.display = typeAnswerMode ? 'none' : 'block';
    } else {
      contextCard.style.display = 'none';
    }
  }

  document.getElementById('q-feedback').textContent = '';
  document.getElementById('q-feedback').className = 'feedback';
  document.getElementById('next-btn').style.visibility = 'hidden';
  answered = false;
  hintUsedThisQuestion = false;

  const mode = wordQuestionMode();
  const speakBtn = document.getElementById('speak-btn');
  if (speakBtn) {
    speakBtn.style.display = SPEECH_SUPPORTED ? 'inline-flex' : 'none';
    speakBtn.disabled = !soundAllowed();
  }
  if (SPEECH_SUPPORTED) window.speechSynthesis.cancel();

  const charDisplay = document.getElementById('q-char');
  charDisplay.onclick = null; charDisplay.style.cursor = '';
  charDisplay.style.fontFamily = '';
  const container = document.getElementById('q-options');
  container.innerHTML = '';
  container.classList.remove('long-options');
  const promptEl = document.getElementById('q-prompt');

  if (q.disp === 'sound') {
    badge.textContent = 'Sounds alike';
    if (contextCard) contextCard.style.display = 'none';
    renderSoundQuestion(q, charDisplay, container);
    return;
  }
  if (q.disp === 'verb' || q.disp === 'contraction' || q.disp === 'number' || q.disp === 'time') {
    badge.textContent = { verb: 'Verbs', contraction: 'Contractions', number: 'Numbers', time: 'Times' }[q.disp];
    if (contextCard) contextCard.style.display = 'none';
    renderGrammarQuestion(q, charDisplay, container, promptEl);
    return;
  }

  if (mode === 'say') {
    charDisplay.style.fontSize = promptFontSize(q.answerEn);
    charDisplay.textContent = q.answerEn;
    promptEl.textContent = 'Say it in Portuguese, then check';
    q.answer = q.char;
    renderSayQuestion(q, container, q.char);
    return;
  }

  // Which side is shown, and which side the options/answer are on.
  const askPortuguese = mode === 'reversed' || mode === 'type' || mode === 'dictation';
  q.answer = askPortuguese ? q.char : q.answerEn;

  if (mode === 'listen' || mode === 'dictation') {
    charDisplay.style.fontSize = '52px';
    renderListenPrompt(q, charDisplay, mode === 'dictation' ? 'Type what you hear' : 'What does the word you hear mean?');
  } else {
    const shown = askPortuguese ? q.answerEn : q.char;
    charDisplay.style.fontSize = promptFontSize(shown);
    charDisplay.textContent = shown;
    promptEl.textContent = mode === 'type' ? 'Type this in Portuguese' : mode === 'reversed' ? 'Which is the Portuguese?' : 'What does this mean?';
  }

  if (mode === 'type' || mode === 'dictation') {
    renderTypeAnswerInput(container, 'type the Portuguese…', raw => chooseTypedPortuguese(raw, q));
    return;
  }
  const field = askPortuguese ? 'jp' : 'en';
  q.options.forEach((o, idx) => {
    const btn = document.createElement('button');
    btn.className = 'opt';
    btn.innerHTML = field === 'jp' ? optPtHtml(idx, o.jp) : `<span class="opt-num">${idx + 1}</span><span class="opt-rd">${escapeHtmlText(o[field])}</span>`;
    btn.dataset.value = o[field];
    btn.onclick = () => choose(btn, o[field], q.answer, q.char);
    container.appendChild(btn);
  });
}

function finishAnswer() {
  document.getElementById('stat-correct').textContent = score;
  document.getElementById('stat-wrong').textContent = wrong;
  const nextBtn = document.getElementById('next-btn');
  nextBtn.style.visibility = 'visible';
  nextBtn.innerHTML = (current + 1 < deck.length ? 'Next →' : 'See results →') + '<span class="kbd-hint">space</span>';
}

function noteMissed(q) {
  const missedKey = q.char + '|' + q.answer;
  if (!missed.includes(missedKey)) { missed.push(missedKey); missedItems.push(q); }
}

function choose(btn, selectedVal, answer, char) {
  if (answered) return;
  answered = true;
  document.querySelectorAll('.opt').forEach(b => {
    b.disabled = true;
    if (b.dataset.value === answer) b.classList.add('correct');
  });
  const q = deck[current];
  const fb = document.getElementById('q-feedback');
  const isCorrect = selectedVal === answer;
  recordKanaResult(q, isCorrect);
  revealListenWord(q);
  if (q.disp === 'sound') revealSoundPair();
  // Forward questions: name the Portuguese word alongside the meaning, so a
  // listening answer still shows what was said.
  const pair = (q.disp !== 'word' || answer === q.char) ? '' : ` — ${escapeHtmlText(q.char)}`;
  fillContractionBlank(q);
  if (isCorrect) {
    score++;
    btn.classList.add('correct');
    fb.innerHTML = 'Correct!' + pair + answerNotesHtml(q);
    fb.className = 'feedback good';
  } else {
    btn.classList.add('wrong');
    fb.innerHTML = `Not quite — the answer is "${escapeHtmlText(answer)}"` + pair + answerNotesHtml(q);
    fb.className = 'feedback bad';
    wrong++;
    noteMissed(q);
  }
  finishAnswer();
}

// ---------- Typed Portuguese -------------------------------------------------
// Marking rules (2026-10-10):
//  - case, extra spaces and end punctuation never matter
//  - the word, any listed alternative (alt), or any part of an "a / b"
//    entry counts; the Brazilian form counts too, with a note
//  - a noun typed without its article (comboio for o comboio) counts, with a
//    reminder - the article is how the gender is learnt
//  - right letters, wrong or missing accents: counts with a reminder and
//    half the usual confidence boost, unless Settings > "Accents must be
//    right" is on, when it's marked wrong
const PT_ARTICLE_RE = /^(o|a|os|as)\s+/;
function normalisePortuguese(str) {
  return (str || '').normalize('NFC').toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[.!?¡¿,;:…]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function stripAccents(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '');
}
function acceptedPortugueseForms(q) {
  const forms = [];
  const add = (s, kind) => {
    if (!s) return;
    String(s).split(/\s*\/\s*/).forEach(part => {
      const n = normalisePortuguese(part);
      if (n) forms.push({ form: n, kind });
    });
  };
  add(q.expect || q.char, 'main');
  (q.alt || []).forEach(a => add(a, 'main'));
  add(q.br, 'brazil');
  return forms;
}
function chooseTypedPortuguese(rawInput, q) {
  if (answered) return;
  answered = true;
  const input = document.getElementById('type-answer-input');
  const submitBtn = document.getElementById('type-answer-submit');
  if (input) input.disabled = true;
  if (submitBtn) submitBtn.disabled = true;
  const typed = normalisePortuguese(rawInput);
  let match = null; // { kind, accentSlip, noArticle, form }
  if (typed) {
    for (const f of acceptedPortugueseForms(q)) {
      const bare = f.form.replace(PT_ARTICLE_RE, '');
      const candidates = [[f.form, false], [bare, bare !== f.form]];
      for (const [cand, noArticle] of candidates) {
        if (typed === cand) { match = { kind: f.kind, accentSlip: false, noArticle, form: f.form }; break; }
        if (!match && stripAccents(typed) === stripAccents(cand)) match = { kind: f.kind, accentSlip: true, noArticle, form: f.form };
      }
      if (match && !match.accentSlip) break;
    }
  }
  // Right noun, wrong article (a comboio): still wrong - the article is the
  // gender - but say so, rather than a bare "not quite".
  let wrongArticle = null;
  if (!match && PT_ARTICLE_RE.test(typed)) {
    const typedBare = stripAccents(typed.replace(PT_ARTICLE_RE, ''));
    const f = acceptedPortugueseForms(q).find(f => PT_ARTICLE_RE.test(f.form) && stripAccents(f.form.replace(PT_ARTICLE_RE, '')) === typedBare);
    if (f) wrongArticle = f.form;
  }
  const strict = !!appSettings.strictAccents;
  const isCorrect = !!match && !(match.accentSlip && strict);
  if (input) input.classList.add(isCorrect ? 'correct' : 'wrong');
  const contextCard = document.getElementById('q-context-card');
  const contextCardBody = document.getElementById('q-context-card-body');
  if (contextCard && contextCardBody && contextCardBody.innerHTML.trim()) contextCard.style.display = 'block';

  const notes = [];
  if (match && match.accentSlip) notes.push(`Watch the accents: ${escapeHtmlText(match.form)}`);
  if (match && match.kind === 'brazil') notes.push(`That's the Brazilian form — in Portugal: ${escapeHtmlText(q.expect || q.char)}`);
  if (match && match.noArticle && !match.accentSlip) notes.push(`Remember the article: ${escapeHtmlText(match.form)}`);
  if (wrongArticle) notes.push(`Check the article: ${escapeHtmlText(wrongArticle)}`);
  const noteHtml = notes.map(n => `<div class="feedback-standard-note">${n}</div>`).join('');

  recordKanaResult(q, isCorrect, !!(match && match.accentSlip), true);
  revealListenWord(q);
  fillContractionBlank(q);
  const fb = document.getElementById('q-feedback');
  if (isCorrect) {
    score++;
    fb.innerHTML = 'Correct!' + (q.answerEn ? ` (${escapeHtmlText(q.answerEn)})` : '') + noteHtml + (match.kind === 'brazil' ? '' : answerNotesHtml(q));
    fb.className = 'feedback good';
  } else {
    wrong++;
    fb.innerHTML = `Not quite — the answer is "${escapeHtmlText(q.expect || q.char)}" (${escapeHtmlText(q.answerEn)})` + noteHtml + answerNotesHtml(q);
    fb.className = 'feedback bad';
    noteMissed(q);
  }
  finishAnswer();
}

function nextQuestion() { current++; renderQuestion(); }

function showResults() {
  clearDrillSession();
  showScreen('results');
  const total = deck.length;
  const pct = Math.round((score / total) * 100);
  const msg = pct === 100 ? 'Perfect score!' : pct >= 80 ? 'Great work!' : pct >= 60 ? 'Getting there!' : 'Keep drilling!';
  document.getElementById('res-score').textContent = score + '/' + total;
  document.getElementById('res-msg').textContent = msg + ' (' + pct + '%)' + (hints > 0 ? ' · ' + hints + ' hint' + (hints === 1 ? '' : 's') + ' used' : '');
  const missedEl = document.getElementById('res-missed');
  const missedBtn = document.getElementById('res-missed-btn');
  const missedLabel = document.getElementById('res-missed-label');
  if (missed.length > 0) {
    missedLabel.textContent = 'Focus on these:';
    // missed entries are "char|answer" composites (see choose()) - display
    // only the char portion, same visual as before.
    const missedChars = missed.map(k => k.split('|')[0]);
    missedEl.innerHTML = '<div class="missed-chars">' + missedChars.map(escapeHtmlText).join(' · ') + '</div>';
    missedBtn.style.display = 'block';
  } else {
    missedLabel.textContent = '';
    missedEl.innerHTML = '<div class="no-missed">No mistakes — excellent!</div>';
    missedBtn.style.display = 'none';
  }
}

// Collections is the default landing view for Vocab now that Read has
// retired - see setMatchLevel/showMatchSettings.
let currentMatchLevel = 'theme';



function setMatchLevel(level) {
  currentMatchLevel = level;
  document.querySelectorAll('#vocab-level-filter-row [data-section]').forEach(p => p.classList.toggle('active', p.dataset.section === level));
  document.getElementById('level-pill-theme').classList.toggle('active', level === 'theme');
  const randomPill = document.getElementById('level-pill-random');
  if (randomPill) randomPill.classList.toggle('active', level === 'random');
  document.getElementById('vocab-level-filter-row').classList.toggle('showing-theme-colours', level === 'theme');
  // Andrew mode and Untaught vocabulary both deliberately reuse the same
  // generic Level 1/2 list view (match-vocab-view + buildMatchCategoryList)
  // rather than getting their own dedicated view like Collections has - so
  // a new category just needs level:'andrew' or level:'untaught' in VOCAB
  // and shows up automatically, no hand-built card needed. Genki (2026-09-12)
  // joins the same list for the same reason.
  document.getElementById('match-vocab-view').style.display = SECTION_KEYS.includes(level) ? 'flex' : 'none';
  document.getElementById('match-theme-view').style.display = level === 'theme' ? 'flex' : 'none';
  document.getElementById('match-random-view').style.display = level === 'random' ? 'flex' : 'none';
  if (level === 'theme') refreshThemeCategorySwatches();
  if (level === 'theme') return;
  if (level === 'random') { refreshRandomView(); return; }
  buildMatchCategoryList();
}

// Builds one real, permanent category tile - the ".match-card-select"
// white-text style Materials cards have always used (group name, chars,
// word count, confidence swatch), as opposed to the plain gold-link
// ".vocab-ref-card" style used for reference/notes/TEST links. Shared by
// both real VOCAB categories and promoted THEMES keys (2026-08-31) - this
// used to be inline inside the Object.keys(VOCAB).forEach below, only ever
// called for VOCAB keys; extracted so promoted theme cards (Stations,
// Accommodation, Emergency, Food & drink, Shopping, Signage, Service &
// shop ops) render identically instead of keeping their old gold-link
// TEST styling. resolveVocabCategory/getCategoryAverageScore already work
// generically for a THEMES key (see resolveVocabCategory's THEME_CACHE
// branch), so this needed zero special-casing beyond checking THEMES[key]
// to decide the label/chars source and the click handler.
function buildCategoryTile(key) {
  const isTheme = !!THEMES[key];
  const v = isTheme ? THEMES[key] : VOCAB[key];
  const card = document.createElement('div');
  card.className = 'match-card-select cat-tile';
  card.dataset.key = key;
  // resolveVocabCategory here too (not raw v.items) - so a category using
  // includeItems, or a theme pooling several categories, shows an accurate
  // total count and an accurate spread. Read once and reused for both the
  // count text and the bar, rather than resolving twice.
  const resolvedItems = resolveVocabCategory(key).items;
  const resolvedCount = resolvedItems.length;
  const countText = v.note ? `${v.note} — ${resolvedCount} words` : `${resolvedCount} words`;
  const counts = getCategoryBandCounts(resolvedItems);
  card.innerHTML = `
    <div class="cat-tile-top">
      <div class="group-name">${v.label}</div>
      <div class="group-count">${countText}</div>
    </div>
    <div class="cat-bar" title="Tap to include words you haven't drilled yet"></div>
  `;
  // TRIAL (2026-09-22): per-tile confidence spread bar, replacing the old
  // single-colour .cat-swatch average blob on this screen. showUntested is
  // local to this one tile's closure, not appSettings/localStorage - a
  // deliberate choice while trying the design out: each tile starts
  // tested-only and forgets its state the moment the list is rebuilt
  // (leaving the screen and coming back), rather than adding a persisted
  // setting for something that might not stick around. Per-tile rather
  // than one global switch (see getCategoryBandCounts comment above) -
  // tapping one category's bar only ever redraws that bar, never the rest
  // of the list.
  const barEl = card.querySelector('.cat-bar');
  let showUntested = false;
  renderCategoryBar(barEl, counts, showUntested);
  barEl.onclick = (e) => {
    e.stopPropagation(); // don't also trigger the card's own onclick below
    showUntested = !showUntested;
    renderCategoryBar(barEl, counts, showUntested);
  };
  // Every THEMES key routes through showVocabTileSelection (resolved via
  // getThemePool, always hasReference:true in the THEME_CACHE wrapper) -
  // raw THEMES entries don't carry their own hasReference flag, so check
  // isTheme first rather than reading v.hasReference for them.
  if (isTheme || v.hasReference) {
    card.onclick = () => showVocabTileSelection(key);
  } else {
    card.onclick = () => startVocabReadingDeck(v.items, key);
  }
  return card;
}

function buildMatchCategoryList() {
  const container = document.getElementById('match-category-list');
  container.innerHTML = '';
  if (!SECTION_KEYS.includes(currentMatchLevel)) return;
  // Topic pills (Portuguese build): the categories whose section matches the
  // pill, in vocab.js order, then any private word lists for that section
  // (a private list with no section goes under the last pill).
  const sectionOf = key => VOCAB[key].section && SECTION_KEYS.includes(VOCAB[key].section) ? VOCAB[key].section : SECTION_KEYS[SECTION_KEYS.length - 1];
  Object.keys(VOCAB).forEach(key => {
    if (VOCAB[key].privatePack || VOCAB[key].standaloneCard === false) return;
    if (sectionOf(key) !== currentMatchLevel) return;
    container.appendChild(buildCategoryTile(key));
  });
  const privateHere = PRIVATE_VOCAB_KEYS.filter(key => sectionOf(key) === currentMatchLevel);
  if (privateHere.length) {
    container.appendChild(document.createElement('div')).className = 'section-divider';
    privateHere.forEach(key => container.appendChild(buildCategoryTile(key)));
  }
}


// Where the vocab-reference screen's Back button returns to - reference
// screens get opened from several different places (Vocab > L2, and now the
// Hiragana/Katakana selection screens), so this can't be hardcoded the way
// it used to be (always straight back to Vocab settings).
let vocabRefBackTarget = 'match-settings';
function closeVocabReference() {
  // 'grammar-notes-hub' isn't a real screen id - it means "back to the
  // Grammar notes list", which is itself just another render into
  // #screen-vocab-reference (see showGrammarNotesHub()), not a distinct
  // screen to show() into.
  showScreen(vocabRefBackTarget);
}




















































































































function showMatchSettings() {
  showScreen('match-settings');
}

// The Palavras tab goes back to whichever of the word lists or Verbs was
// last open (2026-10-24 - Verbs moved under Palavras).
var lastVocabRoot = 'match-settings';
function tryResumeMatch() {
  if (lastVocabRoot === 'verbs') showVerbsScreen(); else showMatchSettings();
}


function buildVocabReadingDeck(items, groupKey, distractorPool) {
  // See the WEIGHTED RANDOM SELECTION and DECAY entries above kanaScoreClass -
  // weaker, never-drilled, and stale items come up more often than
  // well-known, recently-practiced ones, rather than every item in the pool
  // having identical odds.
  const pool = weightedSampleWithoutReplacement([...items], 20, item => selectionWeight(decayedScore(kanaScores[item.jp + '|' + item.en])));
  // distractorPool (2026-09-22) - defaults to items (unchanged behaviour
  // for every existing caller), but Weakest 20/Untested 20 pass the WHOLE
  // vocab pool here instead: items itself is deliberately narrowed to just
  // the weakest/untested words, and drawing wrong-answer options from that
  // same narrow set would be the "1 search match, no wrong options" bug
  // from earlier this session all over again, just triggered by a small
  // filtered pool instead of a small search result.
  const pickFrom = distractorPool || items;
  return pool.map(item => buildWordQuestion(item, pickFrom, groupKey));
}

// One word question (Portuguese build, 2026-10-10) - the Japanese build had
// this object literal written out twice (tile selection + random decks).
// Options carry both sides; renderQuestion decides which side is asked.
function buildWordQuestion(item, pool, groupKey) {
  const distractorItems = pickDistractorItems(pool, item, 3);
  const allItems = shuffle([item, ...distractorItems]);
  return {
    char: item.jp,
    answer: item.en,
    answerEn: item.en,
    disp: 'word',
    groupKey: groupKey,
    cat: item.cat,
    options: allItems.map(w => ({ en: w.en, jp: w.jp })),
    hint: item.en,
    br: item.br,
    alt: item.alt,
    note: item.note,
    seenAs: item.seenAs,
    source: item.source,
    speakAs: item.speakAs,
  };
}

function startVocabReadingDeck(items, groupKey, distractorPool) {
  lastSettingsScreen = 'match-settings';
  lastDeckBuilder = () => buildVocabReadingDeck(items, groupKey, distractorPool);
  deck = buildVocabReadingDeck(items, groupKey, distractorPool);
  current = 0; score = 0; wrong = 0; hints = 0; answered = false; missed = []; missedItems = [];
  showScreen('drill');
  renderQuestion();
}

// Pulled out of startRandomMatchEverything so the "All vocabulary" card on
// the Themes screen can compute its confidence swatch from the exact same
// pool the drill itself draws its 20 from, rather than a second copy of
// "every category" that could quietly drift out of sync with it.
function getAllVocabPool() {
  // Now routed through scanVocabByTag too (2026-08-27), same as
  // startRandomMatch above - keeps exactly one implementation of "walk
  // every category, respect itemTierVisible" instead of two near-
  // identical copies. The empty array `[]` as the query is deliberate:
  // tagQueryMatches's AND check is `required.every(...)`, and .every() on
  // an empty array is vacuously true, so every item with any tags at all
  // matches - which is every item, since 100% of words carry at least one
  // tag (see the full-coverage pass above VOCAB). No special "match
  // everything" case needed in tagQueryMatches itself.
  return scanVocabByTag([]);
}

// Mirrors the optional-tier tag checks in itemTierVisible (Untaught/Genki/
// Andrew, including the Genki-but-already-taught carve-out) but as a fixed
// rule rather than one that moves with the live Settings toggles - kept
// manually in sync with itemTierVisible if a new tier is ever added there.
function isOptionalTierItem(item) {
  return false;
}

// "All vocabulary" on the Themes screen is meant to be exactly that - the
// standard taught course content - regardless of whatever optional tiers
// happen to be switched on in Settings right now (Andrew, 2026-09-22).
// Kanji/Andrew/Genki words leaking in here whenever their toggle was on was
// the actual problem being solved: those already have their own dedicated
// "random from everything" cards (Kanji's, Untaught's), and a kanji word
// turning up here is one the new "type the reading" toggle can't reasonably
// ask for a romaji reading of. Unlike getAllVocabPool above, this doesn't
// move with the toggles - it's always just the taught pool. (Not applied to
// getWeakestVocabItems/getUntestedVocabItems below - those are about
// surfacing YOUR actual weak/untested words, which should include optional-
// tier content you've genuinely been drilling if you've switched it on.)
function getCoreVocabPool() {
  return getAllVocabPool().filter(item => !isOptionalTierItem(item));
}

function startRandomMatchEverything() {
  startVocabReadingDeck(getCoreVocabPool(), 'random-everything');
}

// The 20 lowest-scoring words that have actually been drilled at least
// once - untested words are deliberately excluded here (they're their own
// separate card, getUntestedVocabItems below) rather than folded in as
// "worse than the worst tested score", so the two cards never overlap.
// A harder, deterministic version of the same soft weighting
// startRandomMatchEverything's own draw already applies via selectionWeight
// - sorted-and-sliced instead of randomly biased, so "weakest" is a
// guarantee, not just a likelihood.
function getWeakestVocabItems(n) {
  const scored = getAllVocabPool()
    .map(item => {
      const entry = kanaScores[item.jp + '|' + item.en];
      return entry ? { item, score: displayScore(entry) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score);
  return scored.slice(0, n).map(x => x.item);
}

// Every word with no kanaScores entry at all - not "worst score", genuinely
// never answered once. Handed to buildVocabReadingDeck's own weighted
// sampler unsliced: every item here gets the identical undrilled weight
// (see selectionWeight's undefined-score floor), so its weighted draw is
// already an unbiased random 20 among them - no separate sampling needed.
function getUntestedVocabItems() {
  return getAllVocabPool().filter(item => !(item.jp + '|' + item.en in kanaScores));
}

// Both guard against an empty pool (everything drilled at least once, for
// Untested - or, in principle, nothing drilled yet at all, for Weakest) by
// simply not starting a drill with nothing in it, rather than launching a
// broken empty deck. Not expected to come up for a while on a real course,
// but cheap to guard against either way.
function startWeakestVocab() {
  const items = getWeakestVocabItems(20);
  if (!items.length) return;
  startVocabReadingDeck(items, 'weakest-vocab', getAllVocabPool());
}
function startUntestedVocab() {
  const items = getUntestedVocabItems();
  if (!items.length) return;
  startVocabReadingDeck(items, 'untested-vocab', getAllVocabPool());
}



































// =============================================================================
// VERBS & GRAMMAR (Portuguese build, 2026-10-11)
// Data lives in grammar.js (window.PT_DRILL_GRAMMAR). This section builds the
// verb forms from the regular endings plus grammar.js's irregular overrides,
// runs the Verbs and Grammar screens, and makes the two extra question
// types renderQuestion handles: disp 'verb' and disp 'contraction'.
// =============================================================================
const GRAMMAR = window.PT_DRILL_GRAMMAR || { persons: [], tenses: [], verbs: [], contractions: [], notes: [] };
const VERB_BY_INF = {};
GRAMMAR.verbs.forEach(v => { VERB_BY_INF[v.inf] = v; });
const TENSE_BY_KEY = {};
GRAMMAR.tenses.forEach(t => { TENSE_BY_KEY[t.key] = t; });

// Regular endings, person order eu / tu / ele / nós / eles.
const VERB_ENDINGS = {
  ar: { pres: ['o', 'as', 'a', 'amos', 'am'], pret: ['ei', 'aste', 'ou', 'ámos', 'aram'], imp: ['ava', 'avas', 'ava', 'ávamos', 'avam'] },
  er: { pres: ['o', 'es', 'e', 'emos', 'em'], pret: ['i', 'este', 'eu', 'emos', 'eram'], imp: ['ia', 'ias', 'ia', 'íamos', 'iam'] },
  ir: { pres: ['o', 'es', 'e', 'imos', 'em'], pret: ['i', 'iste', 'iu', 'imos', 'iram'], imp: ['ia', 'ias', 'ia', 'íamos', 'iam'] },
};
function verbPattern(v) {
  if (v.group === 'ar' || v.group === 'er' || v.group === 'ir') return v.group;
  const tail = v.inf.slice(-2);
  return VERB_ENDINGS[tail] ? tail : 'er';
}
function regularForm(v, tense, p) {
  const pat = verbPattern(v);
  const stem = v.inf.slice(0, -2);
  let form = stem + VERB_ENDINGS[pat][tense][p];
  // Past, eu: keep the hard/soft sound - fiquei, paguei, comecei.
  if (tense === 'pret' && p === 0 && pat === 'ar') {
    if (stem.endsWith('c')) form = stem.slice(0, -1) + 'quei';
    else if (stem.endsWith('g')) form = stem.slice(0, -1) + 'guei';
    else if (stem.endsWith('ç')) form = stem.slice(0, -1) + 'cei';
  }
  // Present, eu, -cer / -ger: ofereço, conheço, protejo (2026-11-05).
  if (tense === 'pres' && p === 0 && pat === 'er') {
    if (stem.endsWith('c')) form = stem.slice(0, -1) + 'ço';
    else if (stem.endsWith('g')) form = stem.slice(0, -1) + 'jo';
  }
  return form;
}
// One cell: the shown form plus any other accepted spellings ("ouço|oiço").
function conjugate(v, tense, p) {
  if (tense === 'prog') return { form: conjugate(VERB_BY_INF.estar, 'pres', p).form + ' a ' + v.inf, alt: [] };
  if (tense === 'fut') return { form: conjugate(VERB_BY_INF.ir, 'pres', p).form + ' ' + v.inf, alt: [] };
  const override = v.forms && v.forms[tense] && v.forms[tense][p];
  const raw = override || regularForm(v, tense, p);
  const [form, ...alt] = raw.split('|');
  return { form, alt };
}
function verbTenses(v) {
  return GRAMMAR.tenses.map(t => t.key).filter(k => !(v.skip || []).includes(k));
}

// English for the prompt: "we spoke", "she is eating", "they are going to pay".
const EN_BE = ['am', 'are', 'is', 'are', 'are'];
const EN_WAS = ['was', 'were', 'was', 'were', 'were'];
function verbEnglish(v, tense, p) {
  const who = GRAMMAR.persons[p].en;
  const [base, s3, past, ing] = v.en;
  const isBe = base === 'be';
  let rest;
  if (tense === 'pres') rest = isBe ? EN_BE[p] : (p === 2 ? s3 : base);
  else if (tense === 'pret') rest = isBe ? EN_WAS[p] : past;
  else if (tense === 'imp') rest = v.enImp || ('used to ' + base);
  else if (tense === 'prog') rest = EN_BE[p] + ' ' + ing;
  else rest = EN_BE[p] + ' going to ' + (v.enFut || base);
  return (p === 0 ? 'I' : who) + ' ' + rest;
}

// Score items - same {jp, en} shape the vocab scores use, so the shared
// band/average/weighting functions work on them unchanged.
function verbCell(v, tense, p) {
  return { jp: v.inf + '·' + tense + '·' + p, en: 'verb', v, tense, p };
}
function verbCells(verbs, tenses) {
  const cells = [];
  verbs.forEach(v => verbTenses(v).filter(t => tenses.includes(t)).forEach(t => {
    for (let p = 0; p < 5; p++) cells.push(verbCell(v, t, p));
  }));
  return cells;
}
function buildVerbQuestion(cell) {
  const { v, tense, p } = cell;
  const { form, alt } = conjugate(v, tense, p);
  // Distractors: the same person in other tenses first (falamos / falámos /
  // falávamos), then other persons in the same tense.
  const seen = new Set([form]);
  const pick = [];
  const add = f => { if (f && !seen.has(f)) { seen.add(f); pick.push(f); } };
  shuffle(verbTenses(v).filter(t => t !== tense && t !== 'prog' && t !== 'fut')).forEach(t => add(conjugate(v, t, p).form));
  const sameTense = shuffle([0, 1, 2, 3, 4].filter(x => x !== p)).map(x => conjugate(v, tense, x).form);
  const opts = pick.slice(0, 2);
  sameTense.forEach(f => { if (opts.length < 3 && !opts.includes(f) && f !== form) opts.push(f); });
  pick.slice(2).forEach(f => { if (opts.length < 3) opts.push(f); });
  const t = TENSE_BY_KEY[tense];
  return {
    disp: 'verb',
    char: GRAMMAR.persons[p].pt + ' · ' + v.inf,
    expect: form,
    alt,
    answer: form,
    answerEn: verbEnglish(v, tense, p),
    tenseLabel: t ? t.label : tense,
    options: shuffle([form, ...opts]).map(f => ({ jp: f })),
    scoreKey: cell.jp + '|' + cell.en,
    groupKey: 'verbs',
    speakAs: GRAMMAR.persons[p].pt.split('/')[0] + ' ' + form,
    note: (v.notes && v.notes[tense]) ||
      (tense === 'pret' && p === 3 && verbPattern(v) === 'ar' && !(v.forms && v.forms.pret)
        ? `In Portugal the past nós form has an accent: ${form} (present: ${conjugate(v, 'pres', 3).form}).` : ''),
  };
}
function startVerbDrill(verbs, tenses, origin) {
  const cells = verbCells(verbs, tenses);
  if (!cells.length) return;
  const build = () => weightedSampleWithoutReplacement([...cells], 20, c => selectionWeight(decayedScore(kanaScores[c.jp + '|' + c.en]))).map(buildVerbQuestion);
  grammarTypeModeActive = !!appSettings.grammarType;
  grammarSayModeActive = !!appSettings.grammarSay;
  lastSettingsScreen = origin || 'verbs';
  startDrill(build(), build);
}

// ---------- Contractions ----------
function contractionItem(c) { return { jp: 'contr·' + c.parts, en: c.answer }; }
function buildContractionQuestion(c) {
  const prep = c.parts.split(' + ')[0];
  const family = shuffle(GRAMMAR.contractions.filter(x => x.answer !== c.answer && x.parts.split(' + ')[0] === prep).map(x => x.answer));
  const others = shuffle(GRAMMAR.contractions.filter(x => x.answer !== c.answer && x.parts.split(' + ')[0] !== prep).map(x => x.answer));
  const opts = [...new Set([...family.slice(0, 2), ...others])].slice(0, 3);
  const item = contractionItem(c);
  return {
    disp: 'contraction',
    char: c.pt,
    expect: c.answer,
    alt: [],
    answer: c.answer,
    answerEn: c.en,
    parts: c.parts,
    options: shuffle([c.answer, ...opts]).map(f => ({ jp: f })),
    scoreKey: item.jp + '|' + item.en,
    groupKey: 'contractions',
    speakAs: c.pt.replace('___', c.answer),
    // A gap at the start of the sentence fills with a capital: Nesse dia…
    blankText: c.pt.startsWith('___') ? c.answer.charAt(0).toUpperCase() + c.answer.slice(1) : c.answer,
    note: '',
  };
}
function startContractionDrill(origin) {
  const pool = GRAMMAR.contractions;
  if (!pool.length) return;
  const build = () => weightedSampleWithoutReplacement([...pool], 20, c => { const it = contractionItem(c); return selectionWeight(decayedScore(kanaScores[it.jp + '|' + it.en])); }).map(buildContractionQuestion);
  grammarTypeModeActive = !!appSettings.grammarType;
  grammarSayModeActive = !!appSettings.grammarSay;
  lastSettingsScreen = origin || 'grammar';
  startDrill(build(), build);
}

// Typing / saying in verb and contraction drills follow their own switches
// (Verbs and Grammar screens share them), captured when the drill starts.
let grammarTypeModeActive = false;
let grammarSayModeActive = false;

// ---------- Say it out loud (2026-10-11) ----------
// No options and nothing to type: the prompt is shown, you say the answer
// out loud, tap "Show answer" (or Space) to see and hear it, then mark
// yourself - 1 / "Got it" or 2 / "Not this time". The point is speaking-
// speed recall without spelling getting in the way; the mark you give is
// scored exactly like a right or wrong answer.
function renderSayQuestion(q, container, expectText) {
  const speakBtn = document.getElementById('speak-btn');
  if (speakBtn) speakBtn.style.display = 'none'; // it would say the answer
  container.innerHTML = '<button type="button" class="start-btn say-reveal-btn" id="say-reveal-btn">Show answer<span class="kbd-hint">space</span></button>';
  document.getElementById('say-reveal-btn').onclick = () => revealSayAnswer(q, container, expectText);
}
function revealSayAnswer(q, container, expectText) {
  fillContractionBlank(q);
  // The answer goes above the two marking buttons (inside the options grid),
  // so your eye lands on it before you mark yourself.
  container.innerHTML = `<div class="say-answer-box"><div class="say-answer">${escapeHtmlText(expectText)}</div>` +
    (q.alt && q.alt.length ? `<div class="feedback-standard-note">Also: ${escapeHtmlText(q.alt.join(' / '))}</div>` : '') +
    answerNotesHtml(q) + '</div>';
  if (soundAllowed()) speakPortuguese(getSpeechText(q));
  [['Got it', true], ['Not this time', false]].forEach(([label, ok], idx) => {
    const btn = document.createElement('button');
    btn.className = 'opt say-mark ' + (ok ? 'say-yes' : 'say-no');
    btn.innerHTML = `<span class="opt-num">${idx + 1}</span><span class="opt-rd">${label}</span>`;
    btn.onclick = () => markSayAnswer(q, ok, btn);
    container.appendChild(btn);
  });
}
function markSayAnswer(q, ok, btn) {
  if (answered) return;
  answered = true;
  document.querySelectorAll('#q-options .opt').forEach(b => { b.disabled = true; });
  btn.classList.add(ok ? 'correct' : 'wrong');
  recordKanaResult(q, ok, false, true);
  if (ok) score++;
  else { wrong++; noteMissed(q); }
  finishAnswer();
}

// Called from renderQuestion for disp 'verb' / 'contraction'.
function renderGrammarQuestion(q, charDisplay, container, promptEl) {
  if (q.disp === 'number' || q.disp === 'time') {
    charDisplay.style.fontSize = promptFontSize(q.char);
    charDisplay.textContent = q.char;
    promptEl.innerHTML = q.promptHtml;
  } else if (q.disp === 'verb') {
    charDisplay.style.fontSize = promptFontSize(q.char);
    charDisplay.textContent = q.char;
    promptEl.innerHTML = `<b>${escapeHtmlText(q.tenseLabel)}</b> — “${escapeHtmlText(q.answerEn)}”`;
  } else {
    charDisplay.style.fontSize = q.char.length <= 22 ? '30px' : '24px';
    charDisplay.innerHTML = escapeHtmlText(q.char).replace('___', '<span class="pt-blank">___</span>');
    promptEl.innerHTML = `<b>${escapeHtmlText(q.parts)}</b> — “${escapeHtmlText(q.answerEn)}”`;
  }
  // answerMode is fixed on the question when the deck is built (numbers and
  // times); verb / contraction decks follow the switches captured at start.
  const answerMode = q.answerMode || (grammarSayModeActive ? 'say' : grammarTypeModeActive ? 'type' : 'choice');
  if (answerMode === 'say') {
    renderSayQuestion(q, container, q.expect);
    return;
  }
  if (answerMode === 'type') {
    renderTypeAnswerInput(container, 'type the form…', raw => chooseTypedPortuguese(raw, q));
    return;
  }
  container.classList.toggle('long-options', q.disp === 'time' || q.disp === 'number');
  q.options.forEach((o, idx) => {
    const btn = document.createElement('button');
    btn.className = 'opt';
    btn.innerHTML = optPtHtml(idx, o.jp);
    btn.dataset.value = o.jp;
    btn.onclick = () => choose(btn, o.jp, q.answer, q.char);
    container.appendChild(btn);
  });
}
// After answering a contraction question, fill the gap in the sentence.
function fillContractionBlank(q) {
  if (!q || q.disp !== 'contraction') return;
  const blank = document.querySelector('#q-char .pt-blank');
  if (blank) { blank.textContent = q.blankText || q.answer; blank.classList.add('filled'); }
}

// ---------- Verbs screen ----------
const verbSelected = new Set();
// Hold a verb tile to open its table (2026-10-11) - replaced a "Tap a verb to
// see its table" switch, which meant a trip to a toggle every time. A tap
// still selects; only a deliberate hold opens the table.
let verbPressSuppressClickUntil = 0;
function attachVerbLongPress(tile, inf) {
  let timer = null, startX = 0, startY = 0;
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  tile.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    startX = e.clientX; startY = e.clientY;
    cancel();
    timer = setTimeout(() => {
      timer = null;
      verbPressSuppressClickUntil = Date.now() + 800;
      showVerbTable(inf);
    }, TILE_PEEK_HOLD_MS);
  });
  tile.addEventListener('pointermove', e => {
    if (timer && (Math.abs(e.clientX - startX) > TILE_PEEK_MOVE_TOLERANCE || Math.abs(e.clientY - startY) > TILE_PEEK_MOVE_TOLERANCE)) cancel();
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => tile.addEventListener(t, cancel));
  tile.addEventListener('contextmenu', e => e.preventDefault());
}
function currentVerbTenses() {
  const t = (appSettings.verbTenses || ['pres']).filter(k => TENSE_BY_KEY[k]);
  return t.length ? t : ['pres'];
}
function showVerbsScreen() {
  renderVerbTensePills();
  buildVerbTileGrid();
  syncVerbControls();
  showScreen('verbs');
}
function renderVerbTensePills() {
  const row = document.getElementById('verb-tense-row');
  if (!row) return;
  const on = currentVerbTenses();
  row.innerHTML = '';
  GRAMMAR.tenses.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'level-pill' + (on.includes(t.key) ? ' active' : '');
    btn.textContent = t.label;
    btn.title = t.hint;
    btn.onclick = () => toggleVerbTense(t.key);
    row.appendChild(btn);
  });
}
function toggleVerbTense(key) {
  let on = currentVerbTenses();
  on = on.includes(key) ? on.filter(k => k !== key) : on.concat(key);
  if (!on.length) return; // always at least one
  appSettings.verbTenses = GRAMMAR.tenses.map(t => t.key).filter(k => on.includes(k));
  saveSettings();
  renderVerbTensePills();
  buildVerbTileGrid();
  syncVerbControls();
}
const VERB_GROUP_LABELS = { irr: 'Irregular', ar: 'Regular -ar', er: 'Regular -er', ir: 'Regular -ir' };
function verbAverageClass(v) {
  const avg = getItemsAverageScore(verbCells([v], currentVerbTenses()));
  if (avg === null) return '';
  const band = confidenceBand(avg);
  return band ? 'score-' + band : '';
}
function buildVerbTileGrid() {
  const container = document.getElementById('verb-tile-grid');
  if (!container) return;
  container.innerHTML = '';
  ['irr', 'ar', 'er', 'ir'].forEach(group => {
    const verbs = GRAMMAR.verbs.filter(v => v.group === group);
    if (!verbs.length) return;
    const label = document.createElement('div');
    label.className = 'verb-group-label';
    const picked = verbs.filter(v => verbSelected.has(v.inf)).length;
    if (picked === verbs.length) label.classList.add('all'); else if (picked) label.classList.add('some');
    label.innerHTML = `<span class="vg-tick">✓</span>${escapeHtmlText(VERB_GROUP_LABELS[group])} · ${verbs.length}`;
    label.title = 'Tap to select or deselect the whole group';
    label.dataset.group = group;
    label.onclick = () => toggleVerbGroup(group);
    container.appendChild(label);
    // Confidence bar for the group, in the chosen tenses.
    const bar = document.createElement('div');
    bar.className = 'cat-bar verb-group-bar';
    container.appendChild(bar);
    setupCatBar(bar, getCategoryBandCounts(verbCells(verbs, currentVerbTenses())));
    const grid = document.createElement('div');
    grid.className = 'kanji-tile-grid';
    verbs.forEach(v => {
      const tile = document.createElement('div');
      tile.className = 'kana-ref-card';
      const cls = verbAverageClass(v);
      if (cls) tile.classList.add(cls);
      if (verbSelected.has(v.inf)) tile.classList.add('selected');
      tile.innerHTML = `<span class="kana-ref-char" style="font-size:${tileWordFontSize(v.inf)};">${escapeHtmlText(v.inf)}</span><span class="kana-ref-rom">${escapeHtmlText(v.en[0])}</span>`;
      tile.onclick = () => {
        if (Date.now() < verbPressSuppressClickUntil) return; // the long press already opened the table
        if (verbSelected.has(v.inf)) verbSelected.delete(v.inf); else verbSelected.add(v.inf);
        verbRandomActive = false;
        tile.classList.toggle('selected', verbSelected.has(v.inf));
        syncVerbGroupHeadings();
        syncVerbControls();
      };
      attachVerbLongPress(tile, v.inf);
      grid.appendChild(tile);
    });
    container.appendChild(grid);
  });
}
// Same rule as the word lists (see syncVocabDrillBtn): Select all always,
// plus Random 10 / Random 20 by size. A drill is always up to 20 forms,
// weakest first, from the verbs and tenses picked - the button says so.
let verbRandomActive = false;
// Tap a group heading: select the whole group, or clear it if it's all
// selected already. Groups combine - -er then -ir gives both.
function syncVerbGroupHeadings() {
  document.querySelectorAll('#verb-tile-grid .verb-group-label').forEach(label => {
    const group = label.dataset.group;
    const verbs = GRAMMAR.verbs.filter(v => v.group === group);
    const picked = verbs.filter(v => verbSelected.has(v.inf)).length;
    label.classList.toggle('all', picked === verbs.length);
    label.classList.toggle('some', picked > 0 && picked < verbs.length);
  });
}
function toggleVerbGroup(group) {
  const verbs = GRAMMAR.verbs.filter(v => v.group === group);
  const allOn = verbs.every(v => verbSelected.has(v.inf));
  verbs.forEach(v => { if (allOn) verbSelected.delete(v.inf); else verbSelected.add(v.inf); });
  verbRandomActive = false;
  buildVerbTileGrid();
  syncVerbControls();
}
function toggleRandomVerbs() {
  if (verbRandomActive) { verbSelected.clear(); verbRandomActive = false; }
  else {
    verbSelected.clear();
    shuffle(GRAMMAR.verbs).slice(0, getRandomPickSize(GRAMMAR.verbs.length)).forEach(v => verbSelected.add(v.inf));
    verbRandomActive = true;
  }
  buildVerbTileGrid();
  syncVerbControls();
}
function syncVerbControls() {
  const total = GRAMMAR.verbs.length, n = verbSelected.size;
  const tenses = currentVerbTenses();
  const btn = document.getElementById('verb-drill-btn');
  if (btn) {
    btn.disabled = !n;
    const forms = Math.min(20, verbCells(GRAMMAR.verbs.filter(v => verbSelected.has(v.inf)), tenses).length);
    btn.textContent = n ? `Drill ${forms} forms from ${n} verb${n === 1 ? '' : 's'}` : 'Pick some verbs to drill';
  }
  const allSelected = n === total && !verbRandomActive;
  const all = document.getElementById('verb-select-all-label');
  if (all) all.textContent = allSelected ? 'Deselect all' : 'Select all';
  const allCard = document.getElementById('verb-select-all-card');
  if (allCard) allCard.classList.toggle('selected', allSelected);
  const pick = getRandomPickSize(total);
  const rCard = document.getElementById('verb-random-card');
  if (rCard) { rCard.style.display = pick ? 'flex' : 'none'; rCard.classList.toggle('selected', verbRandomActive); }
  const rLabel = document.getElementById('verb-random-label');
  if (rLabel) rLabel.textContent = verbRandomActive ? 'Deselect all' : `Random ${pick}`;
  const cells = verbCells(GRAMMAR.verbs, tenses);
  setupCatBar(document.getElementById('verb-all-swatch'), getCategoryBandCounts(cells));
  const cnt = document.getElementById('verb-all-count');
  if (cnt) cnt.textContent = `${total} verbs · ${cells.length.toLocaleString('en-GB')} forms`;
  const typeCard = document.getElementById('verb-type-card');
  if (typeCard) {
    typeCard.classList.toggle('selected', !!appSettings.grammarType);
    typeCard.classList.toggle('disabled', !!appSettings.grammarSay);
  }
  const sayCard = document.getElementById('verb-say-card');
  if (sayCard) sayCard.classList.toggle('selected', !!appSettings.grammarSay);
  const sub = document.getElementById('verb-selection-sub');
  if (sub) sub.textContent = 'Pick tenses above and verbs below. A drill is up to 20 forms, weakest first. Hold a verb to see its table.';
}
function toggleSelectAllVerbs() {
  if (verbSelected.size === GRAMMAR.verbs.length && !verbRandomActive) verbSelected.clear();
  else GRAMMAR.verbs.forEach(v => verbSelected.add(v.inf));
  verbRandomActive = false;
  buildVerbTileGrid();
  syncVerbControls();
}
function toggleGrammarSay() {
  appSettings.grammarSay = !appSettings.grammarSay;
  saveSettings();
  syncVerbControls();
  syncGrammarControls();
}
function toggleGrammarType() {
  appSettings.grammarType = !appSettings.grammarType;
  saveSettings();
  syncVerbControls();
  syncGrammarControls();
}
function drillSelectedVerbs() {
  const verbs = GRAMMAR.verbs.filter(v => verbSelected.has(v.inf));
  startVerbDrill(verbs, currentVerbTenses(), 'verbs');
}

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
    drillBtn.textContent = n.drill.type === 'contractions' ? 'Drill contractions' : 'Drill these forms';
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
  body.innerHTML = '<p class="gtable-note">Tap a row to hear it.</p>' + html;
  body.querySelectorAll('.gtable-say').forEach(row => { row.onclick = () => speakPortuguese(row.dataset.say); });
  const drillBtn = document.getElementById('grammar-note-drill-btn');
  drillBtn.style.display = '';
  drillBtn.textContent = 'Drill ' + v.inf;
  drillBtn.onclick = () => startVerbDrill([v], currentVerbTenses(), 'verbs');
  showScreen('grammar-note');
}
function closeGrammarNote() {
  if (grammarNoteBack === 'verbs') showVerbsScreen(); else showGrammarScreen();
}

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
    promptHtml: 'How do you say this number?',
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
    promptHtml: t.style === 'timetable' ? '<b>Timetable</b> — how is this time announced?' : 'How do you say this time?',
    options: shuffle([words, ...timeDistractors(t)]).map(f => ({ jp: f })),
    scoreKey: 'times-consistency',
    groupKey: 'times',
    speakAs: words,
    note: t.style === 'everyday' && t.m > 30 && t.m % 5 === 0 ? 'Past the half-hour, Portugal counts down to the next hour with menos.' : '',
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
  if (!Number.isFinite(n) || n < 0 || n > 999999) { output.innerHTML = '<span class="tool-sub">Enter a number from 0 to 999 999</span>'; return; }
  const words = LANG.numberToWords(n), br = LANG.numberToBrazilian(words);
  output.innerHTML = `<span class="tool-pt" data-say="${escapeHtmlText(words)}">${escapeHtmlText(words)}</span>` +
    (br !== words ? `<span class="tool-sub">Brazil: ${escapeHtmlText(br)}</span>` : '');
  output.querySelector('.tool-pt').onclick = e => speakPortuguese(e.currentTarget.dataset.say);
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
  output.querySelector('.tool-pt').onclick = e => speakPortuguese(e.currentTarget.dataset.say);
}

// =============================================================================
// DAILY GREETING (Portuguese build, 2026-10-11)
// Once a day, on opening the app: a greeting for the time of day, today's
// date and the time - all in Portuguese, each line tappable to hear it. Same
// idea as the Japanese build's greeting card, without the proverb and the
// generated sentence (those can come later). Tap "Português" in the header
// to see it again any time.
// =============================================================================
const PT_WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const PT_MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const EN_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const GREETING_SEEN_KEY = 'ptDrillGreetingSeen';
let greetingTimer = null;

function buildGreetingParts(now) {
  const h = now.getHours();
  const hello = h >= 5 && h < 12 ? { pt: 'Bom dia!', en: 'Good morning' }
    : h >= 12 && h < 20 ? { pt: 'Boa tarde!', en: 'Good afternoon' }
    : { pt: 'Boa noite!', en: 'Good evening' };
  const d = now.getDate();
  const date = {
    pt: `Hoje é ${PT_WEEKDAYS[now.getDay()]}, ${LANG.numberToWords(d)} de ${PT_MONTHS[now.getMonth()]}.`,
    sub: `${PT_WEEKDAYS[now.getDay()]}, ${d} de ${PT_MONTHS[now.getMonth()]} de ${now.getFullYear()}`,
    en: `Today is ${EN_WEEKDAYS[now.getDay()]} ${d} ${EN_MONTHS[now.getMonth()]}`,
  };
  const timeWords = LANG.timeToWords(h, now.getMinutes(), 'none', 'everyday') + '.';
  const time = { pt: timeWords, sub: formatTimeShown(h, now.getMinutes(), 'none', 'timetable'), en: "It's " + formatTimeShown(h, now.getMinutes(), 'none', 'everyday') };
  return [hello, date, time];
}
function renderGreeting() {
  const el = document.getElementById('greeting-lines');
  if (!el) return;
  const [hello, date, time] = buildGreetingParts(new Date());
  const line = (p, cls) => `<div class="greet-line ${cls}" data-say="${escapeHtmlText(p.pt)}"><div class="greet-pt">${escapeHtmlText(p.pt)}</div>` +
    (p.sub ? `<div class="greet-sub">${escapeHtmlText(p.sub)}</div>` : '') +
    `<div class="greet-en">${escapeHtmlText(p.en)}</div></div>`;
  el.innerHTML = line(hello, 'greet-hello') + line(date, 'greet-date') + line(time, 'greet-time');
  el.querySelectorAll('.greet-line').forEach(l => { l.onclick = () => speakPortuguese(l.dataset.say); });
}
function showGreeting() {
  const overlay = document.getElementById('greeting-overlay');
  if (!overlay) return;
  renderGreeting();
  renderSentence();
  clearInterval(greetingTimer);
  greetingTimer = setInterval(renderGreeting, 20000); // keeps the time current while open
  overlay.classList.add('show');
}
function dismissGreeting() {
  const overlay = document.getElementById('greeting-overlay');
  if (overlay) overlay.classList.remove('show');
  clearInterval(greetingTimer);
}
function maybeShowDailyGreeting() {
  const n = new Date(); // local date, not UTC - after midnight here is a new day
  const today = n.getFullYear() + '-' + (n.getMonth() + 1) + '-' + n.getDate();
  let last = null;
  try { last = localStorage.getItem(GREETING_SEEN_KEY); } catch (e) { /* storage unavailable */ }
  if (last === today) return;
  try { localStorage.setItem(GREETING_SEEN_KEY, today); } catch (e) { /* fine */ }
  showGreeting();
}

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
  if (!same && !sbReverse) speakPortuguese(card.pt);
}
function sbPickForm(f) {
  if (sbDone || sbLocked('ending')) return;
  if (sbSel.form && sbSel.form.pt === f.pt) delete sbSel.form; else sbSel.form = f;
  if (sbResult) delete sbResult.ending;
  sbRender();
  if (sbSel.form && !sbReverse) speakPortuguese(f.pt);
}
function sbPickAgree(f) {
  if (sbDone || sbLocked('agree')) return;
  if (sbSel.agree && sbSel.agree.pt === f.pt) delete sbSel.agree; else sbSel.agree = f;
  if (sbResult) delete sbResult.agree;
  sbRender();
  if (sbSel.agree) speakPortuguese(f.pt);
}
function sbSay() { const t = sbPtOf(sbSel); if (t) speakPortuguese(t); }
function sbSayTarget() { if (sbTarget) speakPortuguese(sbTarget.pt); }
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
  el.querySelectorAll('.greet-sent').forEach(l => { l.onclick = () => speakPortuguese(l.dataset.say); });
}

applyAllSettingsUI();
syncServiceWorkerRegistration();
// Runs the real setMatchLevel init (not just buildMatchCategoryList) so the
// default Collections view starts fully set up - active pill state, the
// showing-theme-colours pill-text tint, and the confidence swatches on every
// card - rather than only looking right after leaving and coming back.
renderGroupCards();
renderSectionPills();
setMatchLevel(currentMatchLevel);

syncVocabModeToggles();
tryRestoreDrillSession();
maybeShowDailyGreeting();

// Keyboard shortcuts for the drill screen, for anyone on a laptop/desktop:
// digits 1-4 pick the matching option (always exactly 4 per question), and
// Space/Enter advances once answered - purely additive, since taps on mobile
// never fire keydown events, so this has zero effect there.
function handleDrillKeydown(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const drillScreen = document.getElementById('screen-drill');
  if (!drillScreen || !drillScreen.classList.contains('visible')) return;
  if (!answered) {
    const reveal = document.getElementById('say-reveal-btn');
    if (reveal && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); reveal.click(); return; }
    const idx = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].indexOf(e.key);
    if (idx === -1) return;
    const opts = document.querySelectorAll('#q-options .opt');
    if (opts[idx]) {
      e.preventDefault();
      opts[idx].click();
    }
  } else if (e.key === ' ' || e.key === 'Enter') {
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn && nextBtn.style.visibility === 'visible') {
      e.preventDefault();
      nextBtn.click();
    }
  }
}
window.addEventListener('keydown', handleDrillKeydown);

// The browser's own back button has no way to know it's "inside" this app —
// screens here are just shown/hidden, not separate pages — so pressing back
// out of habit would otherwise leave the page entirely and wipe whatever
// drill was in progress. This traps it: every back/forward press just lands
// straight back on this same page instead of leaving it. In-app navigation
// (nav pills, the Back/Change groups/Quit buttons already in the app) is
// unaffected and remains the real way to move around.
// Since 2026-10-16 the back gesture goes one step back in the app (navBack);
// on a tab's main page it still does nothing. Re-armed after every press.
history.pushState({ trap: true }, '');
window.addEventListener('popstate', () => {
  history.pushState({ trap: true }, '');
  navBack();
});
