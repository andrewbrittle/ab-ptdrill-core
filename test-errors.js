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
  window.addEventListener('unhandledrejection', function (e) {
    show('Error: ' + ((e.reason && e.reason.message) || e.reason));
  });
})();
