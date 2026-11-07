(window.__BUILD_FILES = window.__BUILD_FILES || {})["core/starter.js"] = "2611072154";
// Português Drill - The core: the starter set (2026-11-07).
//
// About 100 meanings every language app starts with - hello, exit, the bill,
// where?, help - so a new language begins with something useful rather than
// a blank page. The core holds the MEANINGS (their English is in the
// learner's text table, starter.<id>); each app says which of its words
// means each one (STARTER_WORDS, pt/starter.js for Portuguese). The words
// stay in the app's own word lists, so their scores are the ones you already
// have: this only gathers them into one Group, in these sections, and says
// how much of the set the app covers.
const STARTER_SET = {
  "politeness": ["hello", "goodbye", "please", "thank-you", "youre-welcome", "sorry", "excuse-me", "yes", "no", "good-morning", "good-evening", "ok"],
  "signs": ["entrance", "exit", "toilets", "open", "closed", "push", "pull", "no-entry", "men", "women", "information"],
  "questions": ["where", "what", "how-much", "when", "who", "how", "why", "do-you-have", "where-is"],
  "numbers": ["n0", "n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8", "n9", "n10", "n20", "n50", "n100", "n1000"],
  "getting-about": ["station", "airport", "bus", "metro", "train", "taxi", "ticket", "street", "left", "right", "straight-on", "hotel"],
  "eating": ["water", "coffee", "tea", "beer", "wine", "bread", "menu", "the-bill", "id-like", "restaurant", "table", "vegetarian"],
  "time": ["today", "tomorrow", "yesterday", "now", "morning", "evening", "day", "week", "hour", "later"],
  "help": ["help", "pharmacy", "hospital", "police", "doctor", "i-dont-understand", "do-you-speak-english", "slowly"],
  "people": ["i", "you", "we", "man", "woman", "friend"],
  "verbs": ["to-be", "to-have", "to-want", "to-go", "to-eat", "to-drink", "to-understand", "to-pay"],
};

(function applyStarterSet() {
  const words = window.STARTER_WORDS || {};
  const ids = Object.values(STARTER_SET).flat();
  let found = 0;
  Object.entries(STARTER_SET).forEach(([group, groupIds]) => {
    groupIds.forEach(id => {
      const word = words[id];
      if (!word) return;
      let hit = false;
      Object.keys(VOCAB).forEach(k => VOCAB[k].items.forEach(item => {
        if (item.jp !== word) return;
        hit = true;
        item.tags = item.tags || [];
        if (!item.tags.includes('starter-' + group)) item.tags.push('starter-' + group);
      }));
      if (hit) found++;
      else console.warn('starter set: no word "' + word + '" in the word lists (' + id + ')');
    });
  });
  if (!found) return;
  // The Group card, after Latest words: one divider per section.
  const group = {
    key: 'theme-starter-set', label: tx('starter.title'),
    note: tx('starter.note', { n: found, of: ids.length }),
    tagQuery: { any: Object.keys(STARTER_SET).map(g => 'starter-' + g) },
  };
  const list = window.PT_DRILL_GROUPS = window.PT_DRILL_GROUPS || [];
  const at = list.findIndex(g => g.latestWords);
  list.splice(at + 1, 0, group);
  THEMES[group.key] = group;
})();
