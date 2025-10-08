
# SiDali Tapsel — Setup Unggah Kegiatan (Google Drive + Notifikasi)

Paket ini berisi:
- `index.html` — Frontend dashboard (unggah kegiatan + daftar + persetujuan).
- `apps_script/Code.gs` — Kode **Google Apps Script Web App** untuk:
  - Menerima unggahan (`multipart/form-data`)
  - Menyimpan lampiran ke **Google Drive** akun Anda
  - Mencatat metadata ke **Google Sheets** (sheet "Kegiatan")
  - Mengirim **notifikasi email** ke alamat Anda
  - Endpoint admin untuk **setujui/tolak** kegiatan

## 1) Siapkan Spreadsheet
- Boleh menggunakan spreadsheet yang sama dengan data wilayah, atau buat baru.
- Salin **Spreadsheet ID** (contoh: `1m3jITIs6dLgWQBrLwt-uKWHbGR8O88s1RNzmGQVwwJo`).

## 2) Apps Script Web App
1. Buka `script.google.com` → **New project**.
2. Buat file `Code.gs` dan **salin** isi dari folder `apps_script/Code.gs` di paket ini.
3. Edit konfigurasi di atas file:
   ```js
   SPREADSHEET_ID: 'PASTE_SPREADSHEET_ID_HERE',   // ganti dengan Spreadsheet ID Anda
   DRIVE_FOLDER_ID: '',                            // kosongkan untuk auto-membuat folder "SiDali-Kegiatan"
   NOTIFY_EMAIL: 'PASTE_YOUR_EMAIL_HERE',         // email Anda untuk notifikasi
   ADMIN_TOKEN: 'SIDALI-ADMIN-2025'               // token admin; boleh Anda ganti
   ```
4. **Deploy** → **New deployment** → type **Web app**:
   - **Execute as:** Me (akun Anda)
   - **Who has access:** Anyone
   - Klik **Deploy** → salin **Web app URL** (contoh: `https://script.google.com/macros/s/AKfycb.../exec`)

> Catatan: Saat pertama kali, Apps Script akan minta **authorization**; ikuti wizard dan izinkan akses Drive/Sheets/mail.

## 3) Masukkan Endpoint ke Frontend
- Buka `index.html` di browser (atau deploy ke Netlify/Vercel/Pages).
- Di panel **Pengaturan Data**, isi:
  - **Spreadsheet ID** Anda
  - **Upload Endpoint** = Web App URL dari langkah 2
  - **Admin Token** = sama dengan di `Code.gs`
  - (Opsional) **Email Admin** untuk tombol “Minta Izin Edit”
- Klik **Simpan Pengaturan**.

## 4) Cara Pakai
### Unggah (User Kecamatan)
- Isi **Nama**, **Tanggal**, **Kecamatan**, **Deskripsi**, dan **Lampiran (opsional)** → **Kirim Kegiatan**.
- Data & file tersimpan di **Google Drive** Anda, metadata di **Sheet** “Kegiatan”.
- Email notifikasi dikirim ke `NOTIFY_EMAIL`.

### Persetujuan (Admin)
- Masuk **Mode Editor** (pakai Kode Akses di Panel Admin — ini hanya untuk UI).
- Klik **Setujui/Tolak** pada kartu kegiatan. Frontend akan memanggil endpoint `action=setStatus` dengan **Admin Token**.
- Status di Sheet “Kegiatan” (kolom **C**) akan berubah.

## 5) Struktur Sheet “Kegiatan”
Header otomatis dibuat (baris 1):
```
timestamp | id | status | nama | tanggal | kecamatan | deskripsi | fileNames | fileUrls | fileIds | editorEmail
```

## 6) Keamanan & Catatan
- Web App akses = “Anyone” agar bisa dipanggil dari browser publik. Data tetap aman karena:
  - File tersimpan di **Drive Anda** (kunci di sisi Google).
  - **Admin Token** wajib untuk endpoint **setStatus**.
- Jika ingin pembatasan lebih ketat (hanya akun Google tertentu yang bisa unggah), ubah **Who has access** ke **Anyone within <domain>** (untuk domain Workspace), dan tambahkan verifikasi di server (misalnya `Session.getActiveUser().getEmail()`).
- CORS: Apps Script Web App dapat diakses dari frontend tanpa konfigurasi khusus.

## 7) Kustomisasi Tambahan
- Ganti `ADMIN_TOKEN` secara berkala.
- Tambahkan log audit (tanggal persetujuan, approving user) dengan menulis ke kolom tambahan di Sheet saat `setStatus`.
- Tambah endpoint `list` untuk memuat ulang dari server (opsional).

Semoga membantu! 🙌
