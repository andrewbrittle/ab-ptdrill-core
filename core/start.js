(window.__BUILD_FILES = window.__BUILD_FILES || {})["core/start.js"] = "2611072103";
// Português Drill - The core: starting the app - runs last, once every other file has loaded.
// Split out of app.js on 2026-11-07 (refactor step 6); code unchanged.

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
// Anything the app does once the core has started (Portuguese: the daily greeting).
(APP.onStart || []).forEach(f => f());

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
