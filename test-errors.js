// Test builds only (publish.sh test adds this to the page): any error shows
// in a red strip at the bottom of the screen, so a problem on a phone - where
// there's no console to look at - can be screenshotted. Tap it to hide it.
(function () {
  function show(msg) {
    var d = document.getElementById('test-errors');
    if (!d) {
      d = document.createElement('div');
      d.id = 'test-errors';
      d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#b3261e;color:#fff;font:13px/1.4 monospace;padding:8px 10px;max-height:40vh;overflow:auto;white-space:pre-wrap';
      d.onclick = function () { d.remove(); };
      document.body.appendChild(d);
    }
    d.textContent += msg + '\n';
  }
  window.addEventListener('error', function (e) {
    show('Error: ' + e.message + (e.filename ? ' (' + e.filename.split('/').pop().split('?')[0] + ':' + e.lineno + ')' : ''));
  });
  // Every file of a test build is stamped by publish.sh; once the page has
  // loaded, any file that's missing or from another build is named here -
  // the usual cause is a file not uploaded with the rest.
  var EXPECT = { stamp: "2611072154", files: ["core/builder.js","core/core.js","core/questions.js","core/start.js","core/starter.js","core/text.js","grammar.js","lang/pt.js","pt/app.js","pt/builder.js","pt/desk-sheets.js","pt/grammar-screen.js","pt/greeting.js","pt/numbers.js","pt/sentences.js","pt/sounds.js","pt/starter.js","pt/verbs.js","ui/en.js","vocab.js"] };
  window.addEventListener('load', function () {
    if (!EXPECT) return;
    var got = window.__BUILD_FILES || {}, bad = [];
    EXPECT.files.forEach(function (f) {
      if (!got[f]) bad.push(f + ' (missing)');
      else if (got[f] !== EXPECT.stamp) bad.push(f + ' (from build ' + got[f] + ')');
    });
    if (bad.length) show('Not from this build (' + EXPECT.stamp + ') - upload these again:\n  ' + bad.join('\n  '));
  });
  window.addEventListener('unhandledrejection', function (e) {
    show('Error: ' + ((e.reason && e.reason.message) || e.reason));
  });
})();
