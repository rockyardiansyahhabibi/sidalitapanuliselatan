// == SiDali Tapsel Web App (Google Apps Script) ==
// Fungsinya: menerima unggahan kegiatan (multipart/form-data), simpan ke Google Drive,
// catat metadata ke Google Sheet, kirim notifikasi email, dan handle update status.

const CONFIG = {
  // Spreadsheet untuk metadata (gunakan spreadsheet yang sama atau khusus).
  SPREADSHEET_ID: 'PASTE_SPREADSHEET_ID_HERE',     // <-- ganti dengan Spreadsheet ID kamu
  SHEET_NAME: 'Kegiatan',                           // sheet "Kegiatan" akan dibuat jika belum ada
  // Folder Drive untuk penyimpanan lampiran kegiatan.
  // Jika kosong, script akan membuat folder bernama "SiDali-Kegiatan" di My Drive.
  DRIVE_FOLDER_ID: '',                               // <-- opsional: isi folder ID jika sudah ada
  // Email notifikasi saat ada unggahan baru
  NOTIFY_EMAIL: 'PASTE_YOUR_EMAIL_HERE',            // <-- ganti email kamu
  // Token admin untuk mengubah status (approve/reject) via endpoint
  ADMIN_TOKEN: 'SIDALI-ADMIN-2025'
};

function _ensureSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sh = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(CONFIG.SHEET_NAME);
    sh.appendRow(['timestamp','id','status','nama','tanggal','kecamatan','deskripsi','fileNames','fileUrls','fileIds','editorEmail']);
  } else {
    const headers = sh.getRange(1,1,1,sh.getMaxColumns()).getValues()[0];
    if (!headers || headers[0] !== 'timestamp') {
      sh.clear();
      sh.appendRow(['timestamp','id','status','nama','tanggal','kecamatan','deskripsi','fileNames','fileUrls','fileIds','editorEmail']);
    }
  }
  return sh;
}

function _ensureFolder() {
  if (CONFIG.DRIVE_FOLDER_ID) {
    return DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  }
  const name = 'SiDali-Kegiatan';
  const it = DriveApp.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(name);
}

function doPost(e) {
  try {
    const action = (e.parameter.action || 'submit').toLowerCase();
    if (action === 'setstatus') {
      return _handleSetStatus(e);
    }
    // default: submit
    return _handleSubmit(e);
  } catch (err) {
    const out = ContentService.createTextOutput(JSON.stringify({ ok:false, error: err && err.message ? err.message : String(err) }));
    out.setMimeType(ContentService.MimeType.JSON);
    return out;
  }
}

function _handleSubmit(e) {
  const params = e.parameter || {};
  const files = e.files || {}; // uploaded files
  const id = params.id || 'kg_' + Date.now();
  const nama = params.nama || '';
  const tanggal = params.tanggal || '';
  const kecamatan = params.kecamatan || '';
  const deskripsi = params.deskripsi || '';
  const editorEmail = Session.getActiveUser().getEmail() || '';

  if (!nama || !tanggal || !kecamatan) {
    return _json({ ok:false, error: 'Nama, tanggal, dan kecamatan wajib.' });
  }

  // Save files to Drive
  const folder = _ensureFolder();
  const saved = [];
  Object.keys(files).forEach(k => {
    const fileObj = files[k];
    // files[] arrives as files[]; files[0], files[1], etc.. GAS packs as entries
    const blob = fileObj && fileObj.length ? fileObj[0] : fileObj; // handle array or single
    if (blob && blob.getBytes) {
      const f = folder.createFile(blob);
      f.setDescription(`SiDali Kegiatan: ${nama} (${id})`);
      saved.push({ id: f.getId(), name: f.getName(), url: f.getUrl() });
    }
  });

  const sh = _ensureSheet();
  const ts = new Date();
  const fileNames = saved.map(s => s.name).join(' | ');
  const fileUrls  = saved.map(s => s.url).join(' | ');
  const fileIds   = saved.map(s => s.id).join(' | ');
  const status = 'pending';

  sh.appendRow([
    ts, id, status, nama, tanggal, kecamatan, deskripsi, fileNames, fileUrls, fileIds, editorEmail
  ]);

  // Send notification
  if (CONFIG.NOTIFY_EMAIL) {
    const subject = `[SiDali] Unggahan Kegiatan Baru (${kecamatan}) — ${nama}`;
    const body = [
      'Ada unggahan kegiatan baru:',
      `Nama: ${nama}`,
      `Tanggal: ${tanggal}`,
      `Kecamatan: ${kecamatan}`,
      `Deskripsi: ${deskripsi}`,
      '',
      `Lampiran: ${fileUrls || '(tidak ada)'}`,
      '',
      `ID: ${id}`,
      `Spreadsheet: https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/edit`,
    ].join('\n');
    MailApp.sendEmail(CONFIG.NOTIFY_EMAIL, subject, body);
  }

  return _json({ ok:true, id, status, files: saved });
}

function _handleSetStatus(e) {
  const params = e.parameter || {};
  const token = params.token || '';
  if (token !== CONFIG.ADMIN_TOKEN) {
    return _json({ ok:false, error: 'Unauthorized' }, 403);
  }
  const id = params.id;
  const status = (params.status || '').toLowerCase();
  if (!id || !status || ['pending','approved','rejected'].indexOf(status) === -1) {
    return _json({ ok:false, error: 'Param id/status tidak valid' }, 400);
  }
  const sh = _ensureSheet();
  const data = sh.getDataRange().getValues(); // includes header
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][1]) === String(id)) { // column B = id
      sh.getRange(r+1, 3).setValue(status); // column C = status
      return _json({ ok:true, id, status });
    }
  }
  return _json({ ok:false, error: 'ID tidak ditemukan' }, 404);
}

function _json(obj, code) {
  const out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}
