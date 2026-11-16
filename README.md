# Invito di matrimonio — Francesco & Valentina

Sito statico autonomo: nessuna build, nessuna dipendenza da installare.
Pubblicato su `https://francesco-valentina-wedding.github.io/` (GitHub Pages,
branch `main`, root). Lo sviluppo avviene su `develop`, il merge su `main` pubblica.

## Contenuto

```text
index.html               la pagina
style.css                stile (palette e font nel blocco :root in cima)
main.js                  menu, sondaggio "scommesse", macchinina del viaggio di nozze
script.js                countdown, meteo, RSVP, copia IBAN, animazioni
google-apps-script.gs    copia dello script Google collegato al foglio (vedi sotto)
matrimonio.ics           evento per iPhone / Outlook (righe CRLF, vedi .gitattributes)
foto/                    foto del sito; citta-*.jpg e le tappe viaggio-*.jpg vengono da Wikimedia Commons
foto/og-image.jpg        anteprima per WhatsApp / Facebook (1200×630)
```

Tutti i percorsi sono relativi. Font, mappe, Booking, Google Calendar, Google
Photos, meteo (Open-Meteo) e il generatore di QR sono servizi remoti.

**Cache:** i file CSS/JS sono inclusi con `?v=N` in `index.html`. Ad ogni modifica
di `style.css`, `main.js` o `script.js` va incrementato `N`, altrimenti i browser
degli invitati continuano a usare la versione vecchia.

**Crediti foto:** `citta-corato.jpg` è CC BY-SA 4.0 (FioreArchive) e l'attribuzione
sulla foto va mantenuta; `citta-bari.jpg` e le foto delle tappe `viaggio-*.jpg` sono CC0 o pubblico dominio
(nessuna attribuzione richiesta). `viaggio-illustrazione.jpg` è nostra.

## Prima di mandare il link agli invitati

- [ ] Verificare la stima "circa 25 minuti" dalla chiesa al ricevimento.

## Foglio Google: RSVP e scommesse

Lo script Apps Script (codice in `google-apps-script.gs`) riceve tutto ciò che
inviano i moduli della pagina e lo scrive nel foglio:

- **RSVP** → scheda `RSVP`. Ogni risposta va anche a Formspree (`FORMSPREE_URL`
  in `script.js`): il ringraziamento compare se almeno uno dei due conferma.
- **Scommesse** → scheda `Scommesse` (votante anonimo, domanda, risposta) e
  riepilogo nella scheda `Risultati`, riscritta a ogni voto contando solo
  l'ultimo voto di ciascun invitato per domanda. Gli invitati vedono solo la
  propria scelta: i risultati non sono leggibili dal sito.

Le schede e le intestazioni si creano da sole. Dopo ogni modifica dello script:

1. Aprire il foglio → **Estensioni → Apps Script**.
2. Sostituire tutto il contenuto con quello di `google-apps-script.gs`, salvare.
3. **Esegui il deployment → Gestisci deployment** → matita sul deployment
   esistente → Versione **Nuova versione** → **Esegui il deployment**.
   Non creare un deployment nuovo: cambierebbe l'URL usato dai moduli.
   "Chi può accedere" deve restare **Chiunque**.

Dalla rete aziendale `script.google.com` è bloccato: le prove vanno fatte da
telefono con i dati mobili.
