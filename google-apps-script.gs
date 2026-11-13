// Source of the Apps Script bound to the RSVP Google Sheet.
// Not used by the site at runtime: after editing, paste it into the Apps Script
// editor and publish a new version of the existing deployment.

const HEADERS = ['Timestamp', 'Nome', 'Cognome', 'Email', 'Presenza', 'Accompagnatori', 'Note', 'Nomi accompagnatori'];

// Sheets evaluates cell text starting with these characters as a formula.
function asText(value) {
  const s = String(value || '').trim();
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function doPost(e) {
  const p = e.parameter;
  const reply = ContentService
    .createTextOutput(JSON.stringify({ result: 'success' }))
    .setMimeType(ContentService.MimeType.JSON);

  // Honeypot filled: a bot. Reply success so it does not retry.
  if (p._gotcha) return reply;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('RSVP') || ss.insertSheet('RSVP');
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);

  sheet.appendRow([
    new Date(),
    asText(p.nome),
    asText(p.cognome),
    asText(p.email),
    asText(p.presenza),
    asText(p.accompagnatori),
    asText(p.note),
    asText(p.nomi_accompagnatori)
  ]);

  return reply;
}
