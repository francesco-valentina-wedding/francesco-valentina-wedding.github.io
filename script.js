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
        <p class="weather-now">${f.desc}, ${f.max}° / ${f.min}°C</p>
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
        <span>${d.desc}${d.rain >= 1 ? `, ${Math.round(d.rain)} mm` : ''}</span>
        <span class="weather-temp">${d.max}° / ${d.min}°</span></li>`).join('');
    el.innerHTML = `
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

    if (results.some((r) => r.status === 'fulfilled')) {
      form.hidden = true;
      document.getElementById('rsvp-thanks').hidden = false;
    } else {
      error.hidden = false;
      button.disabled = false;
      button.textContent = 'Invia';
    }
  });
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.15 });

document.querySelectorAll('.fade-in').forEach((el) => observer.observe(el));
