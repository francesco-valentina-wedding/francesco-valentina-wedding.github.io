// Offset esplicito: senza timezone la data verrebbe interpretata nell'ora locale
// del visitatore e il countdown sarebbe sfasato per chi si collega dall'estero.
// 22 maggio 2027 cade in ora legale italiana (CEST, UTC+2).
const WEDDING_DATE = new Date('2027-05-22T11:00:00+02:00');

function renderCountdown() {
  const el = document.getElementById('countdown');
  if (!el) return;

  const diff = WEDDING_DATE - new Date();
  if (diff <= 0) {
    el.innerHTML = '<p>È il grande giorno!</p>';
    return;
  }

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  el.innerHTML = `
    <div>${days}<span>Giorni</span></div>
    <div>${hours}<span>Ore</span></div>
    <div>${minutes}<span>Minuti</span></div>
    <div>${seconds}<span>Secondi</span></div>
  `;
}

renderCountdown();
setInterval(renderCountdown, 1000);

const WEATHER_LAT = 41.2707914;
const WEATHER_LON = 16.441639;
const WMO_DESCRIPTIONS = {
  0: 'Cielo sereno', 1: 'Poco nuvoloso', 2: 'Parzialmente nuvoloso', 3: 'Nuvoloso',
  45: 'Nebbia', 48: 'Nebbia con brina',
  51: 'Pioviggine leggera', 53: 'Pioviggine', 55: 'Pioviggine intensa',
  61: 'Pioggia leggera', 63: 'Pioggia', 65: 'Pioggia intensa',
  71: 'Neve leggera', 73: 'Neve', 75: 'Neve intensa',
  80: 'Rovesci leggeri', 81: 'Rovesci', 82: 'Rovesci intensi',
  95: 'Temporale', 96: 'Temporale con grandine', 99: 'Temporale forte'
};

// Line icons per WMO group. Width/height attributes keep them small even on a
// page that does not style .wx.
const WX_PATHS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"/>',
  partly: '<path d="M8.5 3.5v1.6M3.5 8.5h1.6M4.9 4.9l1.1 1.1M12.1 4.9 11 6"/><path d="M6.2 11.2a3.6 3.6 0 0 1 6.3-3"/><path d="M8 19.5h9.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6 1.4A2.8 2.8 0 0 0 8 19.5z"/>',
  cloud: '<path d="M7 18.5h10.5a4 4 0 0 0 .4-8 5.6 5.6 0 0 0-10.8 1.6A3.2 3.2 0 0 0 7 18.5z"/>',
  rain: '<path d="M7 15h10.5a4 4 0 0 0 .4-8 5.6 5.6 0 0 0-10.8 1.6A3.2 3.2 0 0 0 7 15z"/><path d="M9 17.5l-1 2.5M13 17.5l-1 2.5M17 17.5l-1 2.5"/>',
  storm: '<path d="M7 14.5h10.5a4 4 0 0 0 .4-8 5.6 5.6 0 0 0-10.8 1.6A3.2 3.2 0 0 0 7 14.5z"/><path d="M12.5 14.5 10.5 18h3l-2 3.5"/>',
  fog: '<path d="M4 9h16M6 13h12M4 17h16"/>'
};

function wxIcon(code) {
  const kind = code <= 1 ? 'sun' : code === 2 ? 'partly' : code === 3 ? 'cloud'
    : code < 50 ? 'fog' : code >= 95 ? 'storm' : 'rain';
  return `<span class="wx wx-${kind}" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${WX_PATHS[kind]}</svg></span>`;
}

const WEATHER_DAILY = 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum';
const HISTORY_YEARS = 4;
// Open-Meteo forecasts reach 16 days ahead; keep a margin.
const FORECAST_WINDOW_DAYS = 14;
// The archive is published with a few days of delay.
const ARCHIVE_DELAY_DAYS = 7;

async function fetchDay(base, date) {
  const res = await fetch(
    `${base}?latitude=${WEATHER_LAT}&longitude=${WEATHER_LON}&daily=${WEATHER_DAILY}` +
    `&start_date=${date}&end_date=${date}&timezone=Europe%2FRome`
  );
  if (!res.ok) throw new Error(res.status);
  const d = (await res.json()).daily;
  return {
    code: d.weather_code[0],
    desc: WMO_DESCRIPTIONS[d.weather_code[0]] || 'Condizioni variabili',
    max: Math.round(d.temperature_2m_max[0]),
    min: Math.round(d.temperature_2m_min[0]),
    rain: d.precipitation_sum[0]
  };
}

async function renderWeather() {
  const el = document.getElementById('weather');
  if (!el) return;
  try {
    if (WEDDING_DATE - new Date() <= FORECAST_WINDOW_DAYS * 86400000) {
      const f = await fetchDay('https://api.open-meteo.com/v1/forecast', '2027-05-22');
      el.innerHTML = `
        <p class="weather-now">${wxIcon(f.code)}${f.desc}, ${f.max}° / ${f.min}°C</p>
        <p class="weather-note">Previsione per sabato 22 maggio 2027 sulla zona della cerimonia.</p>
      `;
      return;
    }

    const lastAvailable = new Date(Date.now() - ARCHIVE_DELAY_DAYS * 86400000);
    let year = lastAvailable.getFullYear();
    if (lastAvailable < new Date(`${year}-05-23`)) year--;
    const years = Array.from({ length: HISTORY_YEARS }, (_, i) => year - i);
    const days = await Promise.all(
      years.map((y) => fetchDay('https://archive-api.open-meteo.com/v1/archive', `${y}-05-22`))
    );
    const rows = days.map((d, i) => `
      <li><span class="weather-year">${years[i]}</span>
        <span>${wxIcon(d.code)}${d.desc}${d.rain >= 1 ? `, ${Math.round(d.rain)} mm` : ''}</span>
        <span class="weather-temp">${d.max}° / ${d.min}°</span></li>`).join('');
    const avg = (k) => Math.round(days.reduce((t, d) => t + d[k], 0) / days.length);
    el.innerHTML = `
      <p class="weather-avg">Il 22 maggio, di solito: massime intorno ai <strong>${avg('max')}°</strong>, minime intorno ai <strong>${avg('min')}°</strong>.</p>
      <p class="weather-note">Com'era il tempo il 22 maggio negli ultimi ${HISTORY_YEARS} anni, sulla zona della cerimonia (massima / minima).</p>
      <ul class="weather-history">${rows}</ul>
      <p class="weather-note">Da circa due settimane prima del matrimonio qui comparirà la previsione per il giorno.</p>
    `;
  } catch {
    el.innerHTML = '<p class="weather-note">Meteo non disponibile al momento.</p>';
  }
}

renderWeather();

const FORMSPREE_URL = 'https://formspree.io/f/mwlpqepb';

// Guardia: senza questo controllo un form assente solleva un'eccezione qui e
// l'IntersectionObserver più in basso non viene mai registrato, lasciando tutte
// le sezioni .fade-in a opacity 0.
const form = document.getElementById('rsvp-form');
if (form) {
  const presenza = form.elements.presenza;
  const count = form.elements.accompagnatori;
  const names = form.elements.nomi_accompagnatori;
  const button = form.querySelector('button[type="submit"]');
  const error = document.getElementById('rsvp-error');
  const label = button.textContent;

  // Disabled fields are excluded from FormData, so hidden values are never sent.
  const toggle = (field, show) => {
    field.hidden = !show;
    field.disabled = !show;
    if (!show) field.value = '';
  };
  const syncFields = () => {
    toggle(count, presenza.value !== 'no');
    toggle(names, presenza.value !== 'no' && Number(count.value) > 0);
  };
  presenza.addEventListener('change', syncFields);
  count.addEventListener('input', syncFields);
  syncFields();

  const sendToSheet = async (body) => {
    const res = await fetch(form.action, { method: 'POST', body });
    if ((await res.json()).result !== 'success') throw new Error('sheet');
  };
  const sendToFormspree = async (body) => {
    const res = await fetch(FORMSPREE_URL, { method: 'POST', body, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(res.status);
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    button.disabled = true;
    button.textContent = 'Invio…';
    error.hidden = true;

    // Both endpoints in parallel: either one is enough to keep the answer.
    const results = await Promise.allSettled([
      sendToSheet(new FormData(form)),
      sendToFormspree(new FormData(form))
    ]);

    // Bring the outcome into view: the form is tall and the message would
    // otherwise appear off screen on a phone.
    const reveal = (el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (results.some((r) => r.status === 'fulfilled')) {
      form.hidden = true;
      const thanks = document.getElementById('rsvp-thanks');
      thanks.hidden = false;
      reveal(thanks);
    } else {
      error.hidden = false;
      button.disabled = false;
      button.textContent = label;
      reveal(error);
    }
  });
}

// The Clipboard API needs a secure context (https/localhost): fall back to a
// temporary selection elsewhere, e.g. when the page is opened from disk.
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    if (!ok) throw new Error('copy');
  }
}

document.querySelectorAll('[data-copy]').forEach((btn) => {
  const label = btn.textContent;
  let timer;
  btn.addEventListener('click', async () => {
    try {
      await copyText(btn.dataset.copy);
      btn.textContent = 'Copiato ✓';
    } catch {
      btn.textContent = 'Copia non riuscita';
    }
    clearTimeout(timer);
    timer = setTimeout(() => { btn.textContent = label; }, 2200);
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.15 });

document.querySelectorAll('.fade-in').forEach((el) => observer.observe(el));
