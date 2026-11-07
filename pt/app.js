(window.__BUILD_FILES = window.__BUILD_FILES || {})["pt/app.js"] = "2611072154";
// Português Drill - this app's settings for the core (2026-11-07, refactor
// step 6). Everything the core needs to know about *this* app that isn't a
// rule of the language (those are in lang/pt.js) or a list (vocab.js,
// grammar.js): where its scores are saved, its extra screens, and how they
// sit in the navigation. Loaded before the core, which reads it as APP.
window.APP = {
  // Saved data is stored under names starting with this (ptDrillKanaScores,
  // ptDrillSettings...) so nothing is shared with the Japanese apps on the
  // same site. Never change it: it's how your scores are found again.
  storagePrefix: 'ptDrill',
  backupName: 'portuguese-drill-backup',

  // The word-list tab's name, and extra pills in its row of section pills.
  vocabTabLabel: 'Palavras',
  vocabPills: [
    // Verbs (2026-10-24): a pill in the word-list row rather than a tab of
    // its own. Its screen has its own copy of the row, with Verbs lit.
    { label: tx('verbs.title'), screen: 'verbs', open: () => showVerbsScreen(), rowId: 'verbs-level-row' },
  ],

  // The app's own screens, beyond the core's (word lists, drill, results,
  // settings). root: a tab's main page (Back history starts again there).
  // home: where Back goes from an inner page with no history. pill: which
  // tab lights up. label: what a Back button to it says (otherwise the
  // screen's title). vocabRoot: the word-list tab returns here if it was
  // the last one open. onShow: redraw when the screen is shown.
  screens: {
    verbs: { root: true, label: tx('verbs.title'), pill: 'nav-match', vocabRoot: true, open: () => showVerbsScreen(), onShow: () => { buildVerbTileGrid(); syncVerbControls(); } },
    build: { root: true, pill: 'nav-build', onShow: () => sbRefreshPanels() },
    numbers: { root: true, pill: 'nav-numbers', onShow: () => syncNumbersControls() },
    grammar: { root: true, pill: 'nav-grammar', onShow: () => setupCatBar(document.getElementById('contraction-swatch'), getCategoryBandCounts(GRAMMAR.contractions.map(contractionItem))) },
    'grammar-note': { home: 'grammar', pill: () => grammarNoteBack === 'verbs' ? 'nav-match' : 'nav-grammar' },
    'desk-sheets': { home: 'build', pill: 'nav-build' },
    sb: { home: 'build', pill: 'nav-build' },
  },

  // Hooks the core calls (2026-11-07): at start-up, on Back, and the extra
  // drills on the random page.
  onStart: [() => maybeShowDailyGreeting()],
  onBack: () => {
    if (!document.querySelector('#greeting-overlay.show')) return false;
    dismissGreeting();
    return true;
  },
  randomDrills: { sounds: { items: () => soundScoreItems(), start: () => startSoundDrill() } },

  // Shown under "Tap to hear" when the device has no Portugal voice.
  voiceNotes: { fallback: tx('voice.brazilOnly'), none: tx('voice.none') },
};
