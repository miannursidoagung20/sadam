# SADaM v2.0 — Panduan Instalasi
**Frontend di GitHub Pages + Backend Google Apps Script (REST API)**

## Gambaran
```
Peramban pengguna ──► GitHub Pages  (index.html, css/, js/)          ← frontend statis (BARU)
        │
        └─ fetch() JSON ──► Google Apps Script Web App (…/exec) ──► Google Sheets "DB_SADaM" + Google Drive
                              backend (Kode.gs)                       ← data TIDAK berpindah
```
- **Data tidak dipindahkan.** Spreadsheet, Drive, akun pengguna, dan semua isinya tetap sama.
- Yang baru hanya **dua alamat**: alamat API (`…/exec`) dan alamat situs (`username.github.io/…`).
- Peralihan **paralel**: Blogger lama tetap berjalan sampai alamat baru terbukti baik. Tidak ada yang perlu dipulihkan bila ingin kembali.

---
## Bagian A — Backend (Google Apps Script) · ±10 menit
Prasyarat: proyek Apps Script SADaM yang sekarang (yang terhubung ke Spreadsheet DB_SADaM).

1. Buka proyek Apps Script SADaM (Spreadsheet → **Ekstensi → Apps Script**, atau script.google.com).
2. Buka berkas **`Kode.gs`**, tekan **Ctrl+A**, hapus, lalu tempel seluruh isi `Kode.gs` v2.0.
   *Berkas `Index`, `Stylesheet`, dan `JavaScript` (HTML) sudah tidak dipakai. Biarkan dulu, hapus nanti setelah Blogger dipensiunkan.*
3. **`appsscript.json`** tidak berubah dari versi sebelumnya. Bila belum terlihat di editor: **Project Settings → centang "Show appsscript.json manifest file in editor"**. Pastikan bagian `webapp` berisi `"executeAs": "USER_DEPLOYING"` dan `"access": "ANYONE_ANONYMOUS"`.
4. Simpan (**Ctrl+S**).
5. Klik **Deploy → New deployment** → ikon ⚙ **Select type → Web app**.
   - Description: `SADaM API v2.0`
   - **Execute as: Me**
   - **Who has access: Anyone**
   - Klik **Deploy**. Bila diminta izin: **Authorize access → pilih akun → Advanced → Go to … → Allow** (izinnya sama seperti sebelumnya).
   > ⚠️ **Gunakan "New deployment", jangan "Manage deployments → Edit" pada deployment lama.** Mengedit deployment lama akan mengubah Blogger Anda yang sedang berjalan.
6. Salin **Web app URL** (berakhiran **`/exec`**). Inilah alamat API Anda.
7. **Uji:** tempel `URL-API-ANDA?action=ping` di peramban. Harus tampil JSON seperti:
   `{"success":true,"data":{"app":"SADaM","versi":"2.0","waktu":"…"},"message":"OK"}`
   Bila yang tampil halaman login Google atau halaman HTML → lihat **Bagian F**.

---
## Bagian B — Frontend
1. Ekstrak **`sadam-frontend.zip`**. Hasilnya folder **`sadam-frontend`** yang **langsung berisi `index.html`**.
   **Folder inilah yang menjadi repositori GitHub** (`git init` dijalankan di dalam folder ini).
2. Buka **`js/config.js`** (Notepad atau VS Code). Ganti `PASTE_URL_WEB_APP_GAS_DI_SINI` dengan URL dari langkah A6 (tetap di dalam tanda kutip). Simpan.
3. **Uji lokal:** klik dua kali `index.html`. Di layar masuk klik **"Cek koneksi server"**: harus tampil hijau *"Terhubung… sinkron"*. Lalu masuk dengan akun Anda seperti biasa.
4. **Publikasi ke GitHub Pages** — dipandu langkah demi langkah di chat. Ringkasannya:
   1. Pasang Git dan buat akun GitHub.
   2. Buat repositori **publik** (mis. `sadam`) di GitHub.
   3. Di folder `sadam-frontend`: `git init` → `git add .` → `git commit -m "SADaM v2.0"`.
   4. Hubungkan ke repositori dan `git push`.
   5. Di GitHub: **Settings → Pages → Branch: `main`, folder: `/ (root)` → Save**.
   6. Tunggu ±1 menit; alamatnya `https://USERNAME.github.io/sadam/`.

---
## Bagian C — Uji penerimaan (centang satu per satu)
| # | Uji | Hasil yang benar |
|---|---|---|
| 1 | Buka alamat GitHub Pages | layar masuk tampil (dengan foto latar bila sudah diatur) |
| 2 | Klik **Cek koneksi server** | hijau, "sinkron", waktu respons tertera |
| 3 | Login Super Admin | Dashboard tampil dengan data yang sama seperti di Blogger |
| 4 | Dialog **Tampilan** | tertulis `SADaM v2.0 · server v2.0` |
| 5 | Catat satu pembayaran uji → buka kwitansi | kwitansi tampil, nomor berurutan |
| 6 | Cetak kwitansi | jendela cetak terbuka, tata letak sama |
| 7 | Buka Laporan Bulanan | angka sama dengan di Blogger |
| 8 | Login **Wali Kelas** | hanya data kelasnya; tanpa tombol cetak kwitansi |
| 9 | Unggah / lihat foto latar | tampil di layar masuk dan Dashboard |
| 10 | Catat transaksi di GitHub Pages, lalu cek di Blogger lama | muncul di keduanya (satu Spreadsheet) |

---
## Bagian D — Peralihan paralel dan pembatalan
- Selama masa uji **dua alamat berjalan bersamaan** dan memakai **Spreadsheet yang sama**: transaksi dari salah satunya langsung terlihat di yang lain.
- Semua pengguna **login ulang satu kali** di alamat baru (penyimpanan sesi terpisah per alamat).
- Setelah yakin: umumkan alamat baru. Nasib Blogger lama (dipensiunkan / diberi tautan) diputuskan kemudian.
- **Pembatalan:** cukup kembali memakai Blogger lama. Tidak ada data yang perlu dipulihkan; repositori GitHub boleh dibiarkan atau dihapus.

---
## Bagian E — Memperbarui di kemudian hari
- **Frontend:** ganti berkas di folder → `git add .` → `git commit -m "update"` → `git push` → tunggu ±1 menit → **Ctrl+Shift+R** di peramban.
- **Backend:** ganti isi `Kode.gs` → **Deploy → Manage deployments → ✏ (pada deployment "SADaM API v2.0") → Version: New version → Deploy**. Alamat `/exec` tidak berubah.
- **Cek kecocokan:** dialog **Tampilan** menampilkan `SADaM vX · server vY`. Bila beda, muncul peringatan **"Pembaruan belum lengkap"** yang menyebut bagian mana yang perlu diperbarui.

---
## Bagian F — Pemecahan masalah
| Gejala | Penyebab | Solusi |
|---|---|---|
| "Konfigurasi belum lengkap" | `js/config.js` belum diisi / URL salah | isi `GAS_URL` dengan URL berakhiran `/exec` |
| "Tidak dapat terhubung ke server" | internet mati; URL salah; akses bukan **Anyone**; ekstensi pemblokir iklan memblokir `script.google.com` | cek internet; ulangi A5–A6; matikan pemblokir untuk situs ini |
| "Server tidak mengembalikan data yang benar" | akses **Only myself**; URL berakhiran `/dev`; deployment dihapus | buat **New deployment** dengan akses **Anyone**; salin URL `/exec` |
| "Aksi tidak dikenal" saat login | `Kode.gs` di server masih versi lama | ulangi Bagian A (ganti `Kode.gs` → New deployment/New version) |
| Halaman GitHub 404 | Pages belum aktif; `index.html` tidak berada di akar repositori (salah folder) | aktifkan Pages (B4-5); pastikan `git init` dijalankan di folder yang berisi `index.html` |
| Fitur baru tidak muncul | cache peramban / Pages belum selesai | tunggu ±1 menit; **Ctrl+Shift+R** |
| Diminta login ulang | alamat baru | normal, hanya sekali |
| Foto latar tidak tampil | berbagi Drive diblokir akun Workspace | gunakan akun Google pribadi pemilik aplikasi |

---
## Catatan keamanan
- Repositori GitHub gratis harus **publik**, tetapi **tidak berisi kredensial**: hanya kode tampilan dan alamat API.
- Alamat API bukan rahasia. Keamanan data dijaga oleh **login berperan di server**: setiap aksi diperiksa ulang, bukan hanya di tampilan.
- Server hanya membuka **48 fungsi** yang dipakai tampilan; fungsi setup, reset admin, pemicu cadangan, dan fungsi privat hanya dapat dijalankan dari editor.
- Jangan pernah menaruh berkas data, cadangan, atau Spreadsheet di repositori.
