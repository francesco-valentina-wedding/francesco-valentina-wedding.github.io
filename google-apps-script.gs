// Source of the Apps Script bound to the RSVP Google Sheet.
// Not used by the site at runtime: after editing, paste it into the Apps Script
// editor and publish a new version of the existing deployment.
//
// One endpoint, two kinds of POST (field "type"):
//   (none)   RSVP form            -> sheet "RSVP"
//   vote     guest poll vote      -> sheet "Scommesse" (raw), sheet "Risultati" (summary)
// Results are deliberately not readable from the site: only the sheet shows them.

const RSVP_HEADERS = ['Timestamp', 'Nome', 'Cognome', 'Email', 'Presenza', 'Accompagnatori', 'Note', 'Nomi accompagnatori'];
const VOTE_HEADERS = ['Timestamp', 'Votante', 'Domanda', 'Risposta'];

// Poll questions and answers accepted from the page: anything else is ignored,
// so the public endpoint cannot be used to fill the sheet with junk.
const POLL_QUESTIONS = ['commozione', 'ritardo', 'pista', 'cucina', 'divano', 'ragione'];
const POLL_LABELS = {
  commozione: 'Si commuoverà per primo all'altare',
  ritardo: 'Arriverà in ritardo',
  pista: 'Trascinerà tutti in pista',
  cucina: 'Cucina meglio',
  divano: 'Si addormenta per primo sul divano',
  ragione: 'Ha sempre ragione'
};
const POLL_ANSWERS = ['Francesco', 'Valentina'];

// Sheets evaluates cell text starting with these characters as a formula.
function asText(value) {
  const s = String(value || '').trim().slice(0, 2000);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function sheetWithHeaders(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sheet;
}

function doPost(e) {
  const p = e.parameter;
  // Honeypot filled: a bot. Reply success so it does not retry.
  if (p._gotcha) return json({ result: 'success' });

  if (p.type === 'vote') {
    if (POLL_QUESTIONS.indexOf(p.question) < 0 || POLL_ANSWERS.indexOf(p.answer) < 0) {
      return json({ result: 'error', error: 'invalid vote' });
    }
    // Serialise votes: two guests voting at once would otherwise rewrite the
    // summary from a half-updated sheet.
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const votes = sheetWithHeaders('Scommesse', VOTE_HEADERS);
      votes.appendRow([new Date(), asText(p.voter).slice(0, 64), p.question, p.answer]);
      writeResults(votes);
    } finally {
      lock.releaseLock();
    }
    return json({ result: 'success' });
  }

  sheetWithHeaders('RSVP', RSVP_HEADERS).appendRow([
    new Date(),
    asText(p.nome),
    asText(p.cognome),
    asText(p.email),
    asText(p.presenza),
    asText(p.accompagnatori),
    asText(p.note),
    asText(p.nomi_accompagnatori)
  ]);
  return json({ result: 'success' });
}

// Rewrites the "Risultati" sheet from the raw votes. Only the latest vote of
// each guest for each question counts, so changing one's mind is not counted twice.
function writeResults(votesSheet) {
  const tallies = {};
  POLL_QUESTIONS.forEach(function (q) { tallies[q] = { Francesco: 0, Valentina: 0 }; });
  if (votesSheet.getLastRow() >= 2) {
    const rows = votesSheet.getRange(2, 1, votesSheet.getLastRow() - 1, 4).getValues();
    const latest = {};
    rows.forEach(function (r) { latest[r[1] + '|' + r[2]] = r; });
    Object.keys(latest).forEach(function (k) {
      const r = latest[k];
      if (tallies[r[2]] && POLL_ANSWERS.indexOf(r[3]) >= 0) tallies[r[2]][r[3]] += 1;
    });
  }

  const out = [['Domanda', 'Francesco', 'Valentina', 'Voti', '% Francesco', '% Valentina']];
  POLL_QUESTIONS.forEach(function (q) {
    const f = tallies[q].Francesco, v = tallies[q].Valentina, n = f + v;
    out.push([POLL_LABELS[q], f, v, n, n ? Math.round(f / n * 100) + '%' : '', n ? Math.round(v / n * 100) + '%' : '']);
  });
  out.push(['Aggiornato il', new Date(), '', '', '', '']);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Risultati') || ss.insertSheet('Risultati');
  sheet.clearContents();
  sheet.getRange(1, 1, out.length, out[0].length).setValues(out);
}
