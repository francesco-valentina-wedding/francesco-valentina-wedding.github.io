// Variante fresca: top bar, full-screen menu, guest poll.
// Countdown, weather, RSVP and copy buttons live in the shared ../script.js.

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

// Playful poll: votes stay on the guest's device, nothing is sent anywhere.
(function () {
  const poll = document.querySelector('.poll');
  if (!poll) return;
  const result = poll.querySelector('.poll-result');
  const questions = Array.from(poll.querySelectorAll('[data-poll]'));
  const KEY = 'fv-poll';

  let votes = {};
  try { votes = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { /* private mode */ }

  function paint() {
    questions.forEach((q) => {
      q.querySelectorAll('[data-vote]').forEach((b) => {
        b.setAttribute('aria-pressed', String(votes[q.dataset.poll] === b.dataset.vote));
      });
    });
  }

  questions.forEach((q) => {
    q.querySelectorAll('[data-vote]').forEach((b) => {
      b.addEventListener('click', () => {
        votes[q.dataset.poll] = b.dataset.vote;
        try { localStorage.setItem(KEY, JSON.stringify(votes)); } catch { /* private mode */ }
        paint();
        const done = questions.every((x) => votes[x.dataset.poll]);
        result.textContent = done
          ? 'Scommesse chiuse! I verdetti il 22 maggio 😉'
          : `Segnato: ${b.dataset.vote}! Lo scopriremo il 22 maggio…`;
      });
    });
  });

  paint();
})();
