// Top bar, full-screen menu, guest poll.
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

// The RSVP Apps Script also stores poll votes (see
// google-apps-script.gs), so every form on the page talks to the same endpoint.
const SHEET_URL = document.getElementById('rsvp-form')?.action;

function storageGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
}

// Guest poll. Votes are kept on the device (to show the guest's own choice) and
// sent to the sheet; tallies come back from the sheet so everyone sees the
// running results. An anonymous per-device id lets a guest change their mind:
// the sheet counts only the latest vote per id and question.
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
  let tallies = null;

  function bars(q) {
    const t = tallies && tallies[q.dataset.poll];
    const mine = votes[q.dataset.poll];
    let box = q.querySelector('.poll-bars');
    if (!mine || !t) { if (box) box.remove(); return; }
    const total = Object.values(t).reduce((a, b) => a + b, 0) || 1;
    if (!box) { box = document.createElement('div'); box.className = 'poll-bars'; q.appendChild(box); }
    box.innerHTML = ['Francesco', 'Valentina'].map((name) => {
      const pct = Math.round(((t[name] || 0) / total) * 100);
      return `<div class="bar${name === mine ? ' mine' : ''}"><span>${name}</span>` +
        `<span class="bar-track"><span class="bar-fill" style="--w:${pct}%"></span></span>` +
        `<span class="bar-pct">${pct}%</span></div>`;
    }).join('') + `<p class="poll-total">${total} ${total === 1 ? 'voto' : 'voti'}</p>`;
  }

  function paint() {
    questions.forEach((q) => {
      q.querySelectorAll('[data-vote]').forEach((b) => {
        b.setAttribute('aria-pressed', String(votes[q.dataset.poll] === b.dataset.vote));
      });
      bars(q);
    });
  }

  async function loadTallies() {
    if (!SHEET_URL) return;
    try {
      const res = await fetch(`${SHEET_URL}?action=poll`);
      const data = await res.json();
      if (data.result === 'success') { tallies = data.tallies || {}; paint(); }
    } catch { /* results stay hidden; the guest's own vote is still shown */ }
  }

  async function send(question, answer) {
    if (!SHEET_URL) return;
    const body = new FormData();
    body.append('type', 'vote');
    body.append('voter', voter);
    body.append('question', question);
    body.append('answer', answer);
    try { await fetch(SHEET_URL, { method: 'POST', body }); } catch { /* keep the local vote */ }
  }

  questions.forEach((q) => {
    q.querySelectorAll('[data-vote]').forEach((b) => {
      b.addEventListener('click', async () => {
        const previous = votes[q.dataset.poll];
        votes[q.dataset.poll] = b.dataset.vote;
        storageSet('fv-poll', votes);
        // Optimistic tally so the bars move at once, before the sheet answers.
        if (tallies) {
          const t = tallies[q.dataset.poll] = tallies[q.dataset.poll] || {};
          if (previous && previous !== b.dataset.vote) t[previous] = Math.max(0, (t[previous] || 1) - 1);
          if (previous !== b.dataset.vote) t[b.dataset.vote] = (t[b.dataset.vote] || 0) + 1;
        }
        paint();
        const done = questions.every((x) => votes[x.dataset.poll]);
        result.textContent = done
          ? 'Scommesse chiuse! I verdetti il 22 maggio 😉'
          : `Segnato: ${b.dataset.vote}! Lo scopriremo il 22 maggio…`;
        await send(q.dataset.poll, b.dataset.vote);
        loadTallies();
      });
    });
  });

  paint();
  loadTallies();
})();

