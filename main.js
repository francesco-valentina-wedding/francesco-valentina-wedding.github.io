// Top bar, full-screen menu, guest poll, honeymoon road map animation.
// Countdown, weather, RSVP and copy buttons live in script.js.

(function () {
  const bar = document.getElementById('topbar');
  if (!bar) return;
  const onScroll = () => bar.classList.toggle('scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
})();

(function () {
  const toggle = document.getElementById('menu-toggle');
  const menu = document.getElementById('menu');
  const closeBtn = document.getElementById('menu-close');
  if (!toggle || !menu) return;

  menu.querySelectorAll('li').forEach((li, i) => { li.style.transitionDelay = `${0.04 + i * 0.03}s`; });

  const isOpen = () => document.body.classList.contains('menu-open');

  function open() {
    document.body.classList.add('menu-open');
    toggle.setAttribute('aria-expanded', 'true');
    closeBtn.focus();
  }

  function close(returnFocus) {
    document.body.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    if (returnFocus) toggle.focus();
  }

  toggle.addEventListener('click', open);
  closeBtn.addEventListener('click', () => close(true));
  // Close before the browser follows the anchor: with body overflow hidden the
  // scroll to the section would not happen.
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => close(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) close(true); });
})();

// The RSVP Apps Script also stores poll votes (see google-apps-script.gs), so
// every form on the page talks to the same endpoint.
const SHEET_URL = document.getElementById('rsvp-form')?.action;

function storageGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
}

// Guest poll. Guests only see their own choice; the running results are for the
// couple and live in the "Risultati" sheet. An anonymous per-device id lets a
// guest change their mind: the sheet counts only the latest vote per id.
(function () {
  const poll = document.querySelector('.poll');
  if (!poll) return;
  const result = poll.querySelector('.poll-result');
  const questions = Array.from(poll.querySelectorAll('[data-poll]'));

  let voter = storageGet('fv-voter', null);
  if (!voter) {
    voter = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    storageSet('fv-voter', voter);
  }
  const votes = storageGet('fv-poll', {});

  function paint() {
    questions.forEach((q) => {
      q.querySelectorAll('[data-vote]').forEach((b) => {
        b.setAttribute('aria-pressed', String(votes[q.dataset.poll] === b.dataset.vote));
      });
    });
  }

  function send(question, answer) {
    if (!SHEET_URL) return;
    const body = new FormData();
    body.append('type', 'vote');
    body.append('voter', voter);
    body.append('question', question);
    body.append('answer', answer);
    fetch(SHEET_URL, { method: 'POST', body }).catch(() => { /* keep the local vote */ });
  }

  questions.forEach((q) => {
    q.querySelectorAll('[data-vote]').forEach((b) => {
      b.addEventListener('click', () => {
        if (votes[q.dataset.poll] === b.dataset.vote) return;
        votes[q.dataset.poll] = b.dataset.vote;
        storageSet('fv-poll', votes);
        paint();
        const done = questions.every((x) => votes[x.dataset.poll]);
        result.textContent = done
          ? 'Scommesse chiuse! I verdetti il 22 maggio 😉'
          : `Segnato: ${b.dataset.vote}! Lo scopriremo il 22 maggio…`;
        send(q.dataset.poll, b.dataset.vote);
      });
    });
  });

  paint();
})();

// Honeymoon map: the SVG timelines (car, then plane) are held at the start and
// played once when the map comes into view. Without JS they simply run on load.
(function () {
  const trip = document.querySelector('.trip');
  if (!trip) return;
  const maps = Array.from(trip.querySelectorAll('svg.trip-map'));
  const END = 10; // seconds: past the end of the plane's flight

  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    maps.forEach((m) => { m.pauseAnimations(); m.setCurrentTime(END); });
    return;
  }

  maps.forEach((m) => { m.pauseAnimations(); m.setCurrentTime(0); });
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    maps.forEach((m) => { m.setCurrentTime(0); m.unpauseAnimations(); });
    trip.classList.add('driving');
    setTimeout(() => trip.classList.remove('driving'), 6500);
  }, { threshold: 0.35 });
  io.observe(trip);
})();
