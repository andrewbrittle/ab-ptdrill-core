// Português Drill - Portuguese: the daily greeting card.
// Split out of app.js on 2026-11-07 (refactor step 6); code unchanged.

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
  el.querySelectorAll('.greet-line').forEach(l => { l.onclick = () => speakTarget(l.dataset.say); });
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
