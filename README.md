# SADaM — frontend (GitHub Pages)

Frontend statis untuk **SADaM — Sistem Administrasi Digital Madrasah**. Berbicara dengan backend Google Apps Script lewat `fetch()` (JSON).

## Isi
```
index.html          halaman tunggal
css/style.css       gaya
js/config.js        ← ISI alamat Web App GAS di sini (GAS_URL)
js/api.js           lapisan komunikasi ke GAS (fetch, galat, cek koneksi)
js/app.js           logika aplikasi
.nojekyll           menonaktifkan pemrosesan Jekyll di GitHub Pages
PANDUAN-INSTALASI.md
```

## Cara cepat
1. Isi `GAS_URL` di `js/config.js` (URL Web App berakhiran `/exec`).
2. Buka `index.html` untuk uji lokal, lalu klik **Cek koneksi server**.
3. Unggah folder ini ke repositori GitHub dan aktifkan **Settings → Pages** (branch `main`, folder `/ (root)`).

Panduan lengkap: **PANDUAN-INSTALASI.md**.
