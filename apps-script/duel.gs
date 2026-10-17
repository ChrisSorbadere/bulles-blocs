// Apps Script du Duel — à coller dans une Google Sheet (Extensions > Apps Script)
// puis Déployer > Nouveau déploiement > Application Web
//   Exécuter en tant que : Moi   ·   Qui a accès : Tout le monde
const SECRET = 'bb-duel-chris-blanca';

function sheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName('duel');
  if (!sh) { sh = ss.insertSheet('duel'); sh.appendRow(['joueur', 'mis à jour', 'records']); }
  return sh;
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function doGet(e) {
  if (!e || !e.parameter || e.parameter.k !== SECRET) return json_({});
  const rows = sheet_().getDataRange().getValues().slice(1);
  const out = {};
  rows.forEach(r => { if (r[0]) out[r[0]] = { t: r[1], d: JSON.parse(r[2] || '{}') }; });
  return json_(out);
}
function doPost(e) {
  const b = JSON.parse(e.postData.contents || '{}');
  if (b.k !== SECRET || ['Chris', 'Blanca'].indexOf(b.p) < 0) return json_({ ok: false });
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sh = sheet_(), rows = sh.getDataRange().getValues();
    const row = [b.p, new Date().toISOString(), JSON.stringify(b.d || {})];
    const i = rows.findIndex(r => r[0] === b.p);
    if (i < 1) sh.appendRow(row); else sh.getRange(i + 1, 1, 1, 3).setValues([row]);
  } finally { lock.releaseLock(); }
  return json_({ ok: true });
}
