/* ============================================================
 * SADaM — JavaScript.html
 * SPA 0 ms: semua halaman ada di shell, render dari memori (S).
 * Optimistic UI + localStorage + sinkronisasi latar belakang.
 * Berjalan sebagai situs statis (GitHub Pages); data lewat fetch() ke backend GAS (js/api.js).
 * ============================================================ */
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rp = n => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
const num = v => Number(String(v == null ? '' : v).replace(/[^0-9]/g, '')) || 0;
const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const pad = n => ('0' + n).slice(-2);
const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const nowHM = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const ymOf = s => String(s || '').slice(0, 7);
const tglID = s => { const t = String(s || '').slice(0, 10).split('-'); return t.length === 3 ? t[2] + '/' + t[1] + '/' + t[0] : ''; };
const tglPanjang = s => { const t = String(s || '').slice(0, 10).split('-'); return t.length === 3 ? Number(t[2]) + ' ' + BLN[Number(t[1]) - 1] + ' ' + t[0] : ''; };
const jam = s => String(s || '').slice(11, 16);
const bulanLbl = ym => { const t = ym.split('-'); return BLN[Number(t[1]) - 1] + ' ' + t[0]; };
const debounce = (f, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };
/** id acak (kepala acak, ekor waktu): aman dari tabrakan walau data dibuat berurutan dengan cepat */
/** Versi berkas tampilan (JavaScript.html). Harus sama dengan APP_VERSI di Kode.gs. */
const APP_VERSI = '2.1';   // versi tampilan (frontend)
const API_MIN = '2.0';     // versi backend (Kode.gs) minimum yang dibutuhkan frontend ini
const uuid = () => 'x' + (Math.random().toString(36) + '00000000').slice(2, 10) + Date.now().toString(36).slice(-4);
const clone = o => JSON.parse(JSON.stringify(o));
const initials = n => String(n || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
function terbilang(n) {
  n = Math.floor(Math.abs(n)); const s = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  const f = x => { if (x < 12) return s[x]; if (x < 20) return f(x - 10) + ' belas'; if (x < 100) return f(Math.floor(x / 10)) + ' puluh ' + f(x % 10); if (x < 200) return 'seratus ' + f(x - 100); if (x < 1000) return f(Math.floor(x / 100)) + ' ratus ' + f(x % 100); if (x < 2000) return 'seribu ' + f(x - 1000); if (x < 1e6) return f(Math.floor(x / 1000)) + ' ribu ' + f(x % 1000); if (x < 1e9) return f(Math.floor(x / 1e6)) + ' juta ' + f(x % 1e6); return f(Math.floor(x / 1e9)) + ' miliar ' + f(x % 1e9); };
  return n === 0 ? 'nol' : f(n).replace(/\s+/g, ' ').trim();
}
const fmtK = v => v >= 1e6 ? +(v / 1e6).toFixed(1) + ' Jt' : v >= 1e3 ? Math.round(v / 1e3) + ' rb' : String(Math.round(v));
const brandC = () => (getComputedStyle(document.documentElement).getPropertyValue('--primary') || '#1B4332').trim();
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

/* ───────── State ───────── */
const S = { user: null, cfg: {}, m: { kelas: [], wali: [], siswa: [], jenis: [], tarif: [], seragam: [], tahun: [], pengguna: [], keringanan: [] }, live: { tagihan: [], pembayaran: [], pengeluaran: [], kwitansi: [] }, page: null, bulan: '', pending: 0, token: '', sig: [], sigKey: '', ix: {}, rendered: {}, audit: null, sent: {} };
const NAV = [
  { g: 'OPERASIONAL' },
  { id: 'dashboard', t: 'Dashboard', i: 'bi-grid', r: ['Super Admin', 'Bendahara', 'Wali Kelas', 'Kepala Madrasah'] },
  { id: 'pembayaran', t: 'Pembayaran', i: 'bi-receipt', r: ['Super Admin', 'Bendahara'] },
  { id: 'seragam', hide: true, par: 'pembayaran', t: 'Seragam', i: 'bi-bag', r: ['Super Admin', 'Bendahara'] },
  { id: 'pengeluaran', t: 'Pengeluaran', i: 'bi-wallet2', r: ['Super Admin', 'Bendahara'] },
  { id: 'tagihan', t: 'Tagihan & Tunggakan', i: 'bi-exclamation-circle', r: ['Super Admin', 'Bendahara', 'Wali Kelas', 'Kepala Madrasah'], badge: true },
  { id: 'pengingat', t: 'Pengingat (WA)', i: 'bi-chat-left-text', r: ['Super Admin', 'Bendahara'] },
  { id: 'rekap', t: 'Rekapan Pembayaran', i: 'bi-journal-check', r: ['Super Admin', 'Bendahara', 'Wali Kelas', 'Kepala Madrasah'] },
  { id: 'laporan', t: 'Laporan Bulanan', i: 'bi-file-earmark-text', r: ['Super Admin', 'Bendahara', 'Kepala Madrasah'] },
  { g: 'ADMINISTRASI', sa: true },
  { id: 'master', t: 'Data Master', i: 'bi-database', r: ['Super Admin'] },
  { id: 'pengaturan', t: 'Pengguna & Sistem', i: 'bi-person-gear', r: ['Super Admin'], badge2: true },
  { id: 'audit', t: 'Log Audit', i: 'bi-clock-history', r: ['Super Admin'] }
];
const can = {
  bayar: () => ['Super Admin', 'Bendahara'].includes(S.user.peran), batal: () => S.user.peran === 'Super Admin', master: () => S.user.peran === 'Super Admin',
  siswaTagihan: () => ['Super Admin', 'Bendahara', 'Wali Kelas'].includes(S.user.peran),
  cetak: () => ['Super Admin', 'Bendahara', 'Kepala Madrasah'].includes(S.user.peran),   // cetak / unduh PDF kwitansi (Wali Kelas hanya melihat)
  transaksiTerbaru: () => S.user.peran !== 'Wali Kelas'   // kartu "Pembayaran Terbaru" di Dashboard
};

/* ───────── API + indikator sinkronisasi ───────── */
function setSync(st) { const c = $('syncChip'); if (!c) return; c.className = 'chip sync' + (st === 'busy' ? ' busy' : st === 'off' ? ' off' : ''); $('syncTxt').textContent = st === 'busy' ? 'Menyinkronkan…' : st === 'off' ? 'Offline — data lokal' : 'Disinkronkan ' + nowHM() + ' WIB'; }
function rawApi(fn, ...args) {
  S.pending++; setSync('busy');
  return gasPost(fn, args).then(r => { S.pending--; setSync('ok'); return r; }, e => { S.pending--; setSync('off'); throw e; });
}
/** Semua panggilan data membawa token sesi. Sesi habis/ditolak server → otomatis kembali ke layar login. */
function api(fn, ...args) {
  return rawApi(fn, S.token, ...args).then(r => { if (r && r.success === false && r.message === 'SESI_HABIS') { forceLogout('Sesi berakhir. Silakan masuk kembali.'); return new Promise(() => { }); } return r; });
}
function toast(msg, type) { const t = document.createElement('div'); t.className = 'toast ' + (type || 'ok'); t.innerHTML = '<i class="bi ' + (type === 'err' ? 'bi-x-octagon' : 'bi-check-circle-fill') + '"></i><span>' + msg + '</span>'; $('toasts').appendChild(t); setTimeout(() => t.remove(), type === 'err' ? 6000 : 3200); }

/* ───────── Modal ───────── */
function openModal(title, body, foot, xl) { $('mTitle').textContent = title; $('mBody').innerHTML = body; $('mFoot').innerHTML = foot || ''; $('modal').className = 'modal' + (xl ? ' xl' : ''); $('mbg').classList.add('on'); }
let modalLock = false;
function closeModal() { if (modalLock) return; $('mbg').classList.remove('on'); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { const el = document.querySelector('.sec.on .stuq'); if (el) { e.preventDefault(); el.focus(); el.select(); } } });

/* ───────── Index data (dihitung ulang saat data berubah, murah) ───────── */
function reindex() {
  const ix = { kelas: {}, wali: {}, siswa: {}, jenis: { 'J-SRG': { id_jenis: 'J-SRG', nama: 'Seragam & Atribut', basis_tagihan: 'per siswa' } }, tg: {}, paid: {}, payBy: {}, anak: {}, arr: {}, primary: {} };
  S.m.kelas.forEach(k => ix.kelas[k.id_kelas] = k); S.m.wali.forEach(w => ix.wali[w.id_wali] = w); S.m.jenis.forEach(j => ix.jenis[j.id_jenis] = j);
  S.m.siswa.forEach(s => { ix.siswa[s.id_siswa] = s; (ix.anak[s.id_wali] = ix.anak[s.id_wali] || []).push(s); if (!ix.primary[s.id_wali]) ix.primary[s.id_wali] = s.id_siswa; });
  S.live.tagihan.forEach(t => ix.tg[t.id_tagihan] = t);
  S.live.pembayaran.forEach(p => { if (p.status === 'aktif') { ix.paid[p.id_tagihan] = (ix.paid[p.id_tagihan] || 0) + Number(p.jumlah); (ix.payBy[p.id_tagihan] = ix.payBy[p.id_tagihan] || []).push({ no: p.no_kwitansi, jumlah: p.jumlah, tanggal: p.tanggal, metode: p.metode }); } });
  S.live.tagihan.forEach(t => {
    const paid = ix.paid[t.id_tagihan] || 0, sisa = Math.max(0, Number(t.nominal) - paid), perWali = !!t.id_wali;
    const rec = { t: t, paid: paid, sisa: sisa, perWali: perWali, st: sisa <= 0 ? ((Number(t.potongan) > 0 && paid === 0 && Number(t.nominal) <= 0) ? 'Bebas' : 'Lunas') : paid > 0 ? 'Sebagian' : 'Belum' };
    const owners = perWali ? (ix.anak[t.id_wali] || []).map(s => s.id_siswa) : [t.id_siswa];
    owners.forEach(sid => { if (!ix.siswa[sid]) return; (ix.arr[sid] = ix.arr[sid] || []).push(rec); });
    rec.owners = owners;
  });
  S.ix = ix;
}
const tagihanSiswa = sid => (S.ix.arr[sid] || []);
const sisaSiswa = sid => tagihanSiswa(sid).reduce((a, r) => a + (r.perWali && S.ix.primary[S.ix.siswa[sid].id_wali] !== sid ? 0 : r.sisa), 0); // per-wali dihitung sekali (anak pertama)
const menunggak = () => S.m.siswa.filter(s => tagihanSiswa(s.id_siswa).some(r => r.sisa > 0));
const totalPiutang = () => { let a = 0; S.live.tagihan.forEach(t => { a += Math.max(0, Number(t.nominal) - (S.ix.paid[t.id_tagihan] || 0)); }); return a; };
/** ID kelas (K-7B …) → nama kelas yang dibaca manusia. ID tidak berubah saat kelas diganti nama. */
const kelasList = csv => String(csv || '').split(',').map(x => x.trim()).filter(Boolean).map(id => S.ix.kelas[id] ? esc(S.ix.kelas[id].nama_kelas) : '<span class="muted">(kelas dihapus)</span>').join(', ') || '<span class="muted">—</span>';
/** Wali kelas sebuah kelas: akun yang mengampu kelas itu; cadangan: isian "Username Wali Kelas" di data kelas. */
const waliKelasOf = k => { const us = S.m.pengguna || []; return us.find(u => u.peran === 'Wali Kelas' && String(u.kelas_diampu || '').split(',').map(x => x.trim()).includes(k.id_kelas)) || us.find(u => u.username === k.wali_kelas_email) || null; };
/** Nama bendahara di kolom tanda tangan laporan: dari Pengaturan (Kop & Identitas); cadangan: akun Bendahara yang sedang login. */
const namaBendahara = () => String(S.cfg.bendahara || '').trim() || (S.user && S.user.peran === 'Bendahara' ? S.user.nama : '');
const bendaharaAkun = () => (S.m.pengguna || []).filter(u => u.peran === 'Bendahara' && u.status_aktif !== 'Nonaktif');
function bendaharaPilih() { const L = bendaharaAkun(); return '<div class="row wrap" style="gap:6px;margin-top:6px">' + (L.length ? '<span class="muted sm">Pakai nama akun:</span>' + L.map((u, i) => '<button class="btn sm" type="button" onclick="bendaharaIsi(' + i + ')">' + esc(u.nama) + '</button>').join('') : '') + '</div><div class="hint">Tampil di kolom tanda tangan <b>laporan bulanan</b> dan <b>rekap penerima keringanan</b>. Tanda tangannya tetap dikosongkan untuk ditandatangani manual.</div>'; }
function bendaharaIsi(i) { const u = bendaharaAkun()[i]; if (u && $('cf_bendahara')) $('cf_bendahara').value = u.nama; }
const BLN3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const blnS = ym => { const t = String(ym).split('-'); return BLN3[Number(t[1]) - 1] + ' ' + t[0]; };
const isBln = p => /^\d{4}-\d{2}$/.test(String(p || ''));
/** ['2026-07',…,'2027-06'] → "Jul 2026 – Jun 2027 (12 bulan)"; tidak berurutan → "5 bulan (Jul 2026, …)" */
function rentangBln(list) {
  const L = [...new Set(list)].sort(), n = L.length, idx = x => { const p = x.split('-').map(Number); return p[0] * 12 + p[1]; };
  if (n === 1) return blnS(L[0]); const ber = L.every((x, i) => i === 0 || idx(x) - idx(L[i - 1]) === 1);
  return ber ? blnS(L[0]) + ' – ' + blnS(L[n - 1]) + ' (' + n + ' bulan)' : n + ' bulan (' + L.slice(0, 3).map(blnS).join(', ') + (n > 3 ? ', …' : '') + ')';
}
/** label jenis untuk daftar/WA: iuran bulanan yang dibayar banyak bulan digabung jadi satu rentang */
function jenisRingkas(rows) {
  const by = {}, order = []; rows.forEach(r => { const t = S.ix.tg[r.id_tagihan], key = t ? t.id_jenis : '-'; if (!by[key]) { by[key] = []; order.push(key); } by[key].push(t); });
  return order.map(k => { if (k === '-') return '-'; const mon = by[k].filter(t => t && isBln(t.periode) && !t.id_wali).map(t => t.periode); if (!jenisSuk(k) && mon.length >= 2) return jenisNm(k) + ' ' + rentangBln(mon); if (!jenisSuk(k) && mon.length === 1) return jenisNm(k) + ' ' + bulanLbl(mon[0]); return jenisNm(k); });
}
/** baris tabel kwitansi: ≥3 bulan iuran yang sama digabung menjadi 1 baris (kwitansi setahun tetap muat satu halaman) */
function kwBaris(g, anak) {
  const mon = {}; g.rows.forEach(r => { const t = S.ix.tg[r.id_tagihan] || {}; if (isBln(t.periode) && !t.id_wali && !jenisSuk(t.id_jenis)) (mon[t.id_jenis] = mon[t.id_jenis] || []).push(r); });
  const lines = [], done = {};
  g.rows.forEach(r => {
    const t = S.ix.tg[r.id_tagihan] || {}, grp = mon[t.id_jenis];
    if (grp && grp.length >= 3 && isBln(t.periode) && !t.id_wali) { if (done[t.id_jenis]) return; done[t.id_jenis] = 1; lines.push({ pos: esc(jenisNm(t.id_jenis)), uraian: esc((t.id_jenis === 'J-SPP' ? 'Iuran bulan ' : 'Bulan ') + rentangBln(grp.map(x => S.ix.tg[x.id_tagihan].periode))), jml: grp.reduce((a, x) => a + Number(x.jumlah), 0) }); return; }
    lines.push({ pos: esc(jenisNm(t.id_jenis)) + (t.id_wali ? ' <small>(Beban Per-Wali)</small>' : '') + (jenisSuk(t.id_jenis) ? ' <small>(sukarela)</small>' : ''), uraian: esc((isBln(t.periode) ? (t.id_jenis === 'J-SPP' ? 'Iuran bulan ' : 'Bulan ') + bulanLbl(t.periode) + (t.id_wali && anak.length > 1 ? ' · Alokasi bersama: ' + anak.map(a => a.nama).join(' & ') : '') : (t.id_wali && anak.length > 1 ? 'Alokasi bersama: ' + anak.map(a => a.nama).join(' & ') : (r.keterangan || '')))), jml: Number(r.jumlah) });
  });
  return lines.map((l, i) => '<tr><td>' + (i + 1) + '</td><td>' + l.pos + '</td><td>' + l.uraian + '</td><td class="n">' + Math.round(l.jml).toLocaleString('id-ID') + '</td></tr>').join('');
}
/** Nama tagihan untuk tampilan: jenis + bulan bila periodenya bulanan, mis. "Syahriah Pondok · Juli 2026" (berlaku untuk SEMUA jenis bulanan). */
const tagNama = t => jenisNm(t.id_jenis) + (isBln(t.periode) ? ' · ' + bulanLbl(t.periode) : '');
/** ringkas untuk sel tabel: ['2026-07','2026-08','2026-09'] → "Jul–Sep · 3 bln" */
function blnPendek(list) {
  const L = [...new Set(list)].sort(), n = L.length, mm = x => BLN3[Number(x.split('-')[1]) - 1], idx = x => { const p = x.split('-').map(Number); return p[0] * 12 + p[1]; };
  if (n === 1) return mm(L[0]) + ' ' + L[0].slice(0, 4); const ber = L.every((x, i) => i === 0 || idx(x) - idx(L[i - 1]) === 1);
  return (ber ? mm(L[0]) + '–' + mm(L[n - 1]) : L.slice(0, 3).map(mm).join(', ') + (n > 3 ? ', …' : '')) + ' · ' + n + ' bln';
}
const jenisIdx = id => { const i = S.m.jenis.findIndex(x => x.id_jenis === id); return i < 0 ? 999 : i; };
/** urutan tampil tagihan: per jenis (urutan Data Master), lalu bulan menaik */
const urutTagihan = (a, b) => jenisIdx(a.t.id_jenis) - jenisIdx(b.t.id_jenis) || natCmp(String(a.t.periode), String(b.t.periode));
/** baris rincian untuk pesan WA: iuran bulanan digabung per jenis ("Syahriah Pondok Jul 2026 – Sep 2026 (3 bulan)") */
function rincianLines(arr, multiAnak) {
  const out = [], grp = {};
  arr.forEach(x => {
    const t = x.r.t, who = (!x.r.perWali && multiAnak) ? ' (' + x.a.nama + ')' : '';
    if (isBln(t.periode)) { const key = t.id_jenis + '|' + who; if (!grp[key]) { grp[key] = { jid: t.id_jenis, who: who, per: [], sisa: 0 }; out.push(grp[key]); } grp[key].per.push(t.periode); grp[key].sisa += x.r.sisa; }
    else out.push({ label: jenisNm(t.id_jenis) + who, sisa: x.r.sisa });
  });
  return out.map(g => g.label ? '• ' + g.label + ': ' + rp(g.sisa) : '• ' + jenisNm(g.jid) + ' ' + (g.per.length > 1 ? rentangBln(g.per) : bulanLbl(g.per[0])) + g.who + ': ' + rp(g.sisa));
}
/** sel tabel Tagihan & Tunggakan untuk jenis bulanan: ringkasan SEMUA bulan (bukan hanya tagihan terakhir) */
function cellBulan(r) {
  const open = r.filter(x => x.sisa > 0), pend = '<div class="muted" style="font-size:10px">';
  if (!open.length) return stPill(r.every(x => x.st === 'Bebas') ? 'Bebas' : 'Lunas') + pend + blnPendek(r.map(x => x.t.periode)) + '</div>';
  const st = open.some(x => x.st === 'Belum') ? 'Belum' : 'Sebagian', sisa = open.reduce((a, x) => a + x.sisa, 0);
  return '<div>' + stPill(st) + '<div class="num sm" style="color:var(--' + (st === 'Sebagian' ? 'sebagian' : 'tunggak') + ');font-size:11px">' + rp(sisa) + '</div>' + pend + blnPendek(open.map(x => x.t.periode)) + '</div></div>';
}
/* ───────── Kredit pembuat aplikasi (layar masuk, menu samping, dialog Tentang) ───────── */
const kreditNama = () => String(S.cfg.kreditNama || '').trim();
const KREDIT_BAWAAN = 'Dikembangkan oleh';
/** kata pengantar sebelum nama; kosong → bawaan "Dikembangkan oleh" */
const kreditKata = () => String(S.cfg.kreditKata || '').trim() || KREDIT_BAWAAN;
const KREDIT_KATA = ['Dikembangkan oleh', 'Dibuat oleh', 'Dirancang oleh', 'Dikelola oleh', 'Pengelola sistem:', 'Developed by', 'Developed & maintained by', 'Built by', 'Maintained by', 'Created by'];
const kreditOn = key => !!kreditNama() && String(S.cfg[key] || '') !== '0';
function kreditEl(id, parentSel, css, cls) { let e = $(id); if (e) return e; const p = document.querySelector(parentSel); if (!p) return null; e = document.createElement('div'); e.id = id; e.style.cssText = css; if (cls) e.className = cls; p.appendChild(e); return e; }
function applyKredit() {
  const nm = kreditNama();
  const lg = kreditEl('loginCredit', '.login-card', 'text-align:center;margin:10px 0 0', 'muted sm');
  if (lg) { lg.innerHTML = kreditOn('kreditLogin') ? esc(kreditKata()) + ' <b>' + esc(nm) + '</b>' : ''; lg.classList.toggle('hide', !kreditOn('kreditLogin')); }
  const sb = kreditEl('sbCredit', '#sidebar', 'padding:2px 14px 12px;font-size:11px;color:rgba(255,255,255,.7);text-align:center;cursor:pointer');
  if (sb) { sb.innerHTML = kreditOn('kreditSidebar') ? esc(kreditKata()) + ' ' + esc(nm) : ''; sb.classList.toggle('hide', !kreditOn('kreditSidebar')); sb.onclick = () => openTentang(); sb.title = 'Tentang aplikasi'; }
}
function openTentang() {
  const c = S.cfg, nm = kreditNama(), logo = c.logoApp ? '<img src="' + esc(c.logoApp) + '" alt="Logo" style="width:56px;height:56px;border-radius:12px;object-fit:contain">' : '<i class="bi bi-mortarboard-fill" style="font-size:34px;color:var(--primary)"></i>';
  openModal('Tentang aplikasi', '<div style="text-align:center">' + logo + '<h3 style="margin:8px 0 0">' + esc(c.appName || 'SADaM') + ' <span class="muted" style="font-weight:400">v' + esc(APP_VERSI) + '</span></h3><div class="muted sm" style="margin-top:2px">' + esc(c.appSub || '') + '</div>' + (c.namaMadrasah ? '<div class="sm" style="margin-top:6px">' + esc(c.namaMadrasah) + '</div>' : '') +
    (kreditOn('kreditTentang') ? '<div style="border-top:1px solid var(--border);margin-top:14px;padding-top:14px"><div class="muted sm">' + esc(kreditKata()) + '</div><div style="font-size:16px;font-weight:600;margin-top:2px">' + esc(nm) + '</div></div>' : '') +
    '<div class="muted sm" style="margin-top:14px">Server v' + esc(S.versiServer || 'lama') + '</div></div>', '<button class="btn pri" onclick="closeModal()">Tutup</button>');
}
/** kartu pengaturan di Pengguna & Sistem › Tampilan & Merek */
function kreditCard() {
  const on = key => String(S.cfg[key] || '') !== '0';
  return '<div class="card" style="margin-top:12px"><h3>Pembuat aplikasi</h3><p class="muted sm" style="margin:2px 0 8px">Nama yang tampil sebagai "Dikembangkan oleh …". Kosongkan nama untuk menyembunyikannya di semua tempat.</p>' + cfgIn('kreditNama', 'Nama pembuat', 'mis. Nama Anda, S.Kom.') +
    '<div class="row wrap" style="gap:6px;margin-top:6px"><button class="btn sm" type="button" onclick="kreditIsi()"><i class="bi bi-person"></i>Pakai nama akun saya</button></div>' +
    kreditKataBlock() + '<label class="l">Tampilkan di</label><label class="chk"><input type="checkbox" id="kr_login" ' + (on('kreditLogin') ? 'checked' : '') + '> Layar masuk</label><label class="chk"><input type="checkbox" id="kr_sidebar" ' + (on('kreditSidebar') ? 'checked' : '') + '> Menu samping (di bawah akun)</label><label class="chk"><input type="checkbox" id="kr_tentang" ' + (on('kreditTentang') ? 'checked' : '') + '> Dialog "Tentang aplikasi" <span class="muted sm">(dibuka dari dialog Tampilan atau dengan mengetuk teks di menu samping)</span></label>' +
    '<button class="btn pri" style="margin-top:10px" onclick="saveKredit()"><i class="bi bi-save"></i>Simpan</button></div>';
}
const kreditPratinjauTxt = (kata, nama) => (String(kata || '').trim() || KREDIT_BAWAAN) + ' ' + (String(nama || '').trim() || 'Nama Anda');
function kreditKataBlock() {
  return '<label class="l" for="cf_kreditKata">Kata pengantar</label><input class="in" id="cf_kreditKata" value="' + esc(S.cfg.kreditKata || '') + '" placeholder="' + KREDIT_BAWAAN + '" maxlength="80" oninput="kreditPratinjau()"><div class="row wrap" style="gap:6px;margin-top:6px">' + KREDIT_KATA.map((x, i) => '<button class="btn sm" type="button" onclick="kreditKataPilih(' + i + ')">' + esc(x) + '</button>').join('') + '</div><div class="hint" id="kr_prev">Pratinjau: <b>' + esc(kreditPratinjauTxt(S.cfg.kreditKata, S.cfg.kreditNama)) + '</b> · kosongkan kata pengantar untuk memakai "' + KREDIT_BAWAAN + '".</div>';
}
function kreditPratinjau() { const e = $('kr_prev'); if (e) e.innerHTML = 'Pratinjau: <b>' + esc(kreditPratinjauTxt($('cf_kreditKata').value, $('cf_kreditNama').value)) + '</b> · kosongkan kata pengantar untuk memakai "' + KREDIT_BAWAAN + '".'; }
function kreditKataPilih(i) { if ($('cf_kreditKata')) { $('cf_kreditKata').value = KREDIT_KATA[i]; kreditPratinjau(); } }
function kreditIsi() { if ($('cf_kreditNama')) { $('cf_kreditNama').value = S.user.nama || ''; kreditPratinjau(); } }
function saveKredit() {
  const o = { kreditNama: $('cf_kreditNama').value.trim(), kreditKata: $('cf_kreditKata').value.trim(), kreditLogin: $('kr_login').checked ? '1' : '0', kreditSidebar: $('kr_sidebar').checked ? '1' : '0', kreditTentang: $('kr_tentang').checked ? '1' : '0' };
  if (o.kreditNama.length > 80) return toast('Nama pembuat maksimal 80 karakter.', 'err'); if (o.kreditKata.length > 80) return toast('Kata pengantar maksimal 80 karakter.', 'err');
  const snap = Object.assign({}, S.cfg); Object.assign(S.cfg, o); applyKredit(); persist();
  api('saveConfig', o).then(r => { if (!r.success) { S.cfg = snap; applyKredit(); toast(r.message, 'err'); } else toast(o.kreditNama ? 'Nama pembuat disimpan.' : 'Nama pembuat dikosongkan (disembunyikan).'); }).catch(e => { S.cfg = snap; applyKredit(); toast(e.message, 'err'); });
}
/* ───────── Foto latar madrasah (layar masuk + banner Dashboard) ───────── */
const fotoUrl = w => S.cfg.fotoLatarId ? 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(S.cfg.fotoLatarId) + '&sz=w' + w + '&v=' + encodeURIComponent(S.cfg.fotoLatarV || '') : '';
const fotoOn = key => !!S.cfg.fotoLatarId && String(S.cfg[key] || '') !== '0';
/** latar layar masuk: dipasang HANYA setelah foto berhasil dimuat; bila gagal, tampilan lama tetap */
function applyLatar() {
  const lg = $('login'); if (!lg) return;
  if (fotoOn('fotoLogin')) { const url = fotoUrl(1600); if (lg.dataset.foto === url) return; const im = new Image(); im.onload = () => { if (!fotoOn('fotoLogin') || fotoUrl(1600) !== url) return; lg.style.backgroundImage = 'linear-gradient(rgba(10,25,18,.55), rgba(10,25,18,.55)), url("' + url + '")'; lg.style.backgroundSize = 'cover'; lg.style.backgroundPosition = 'center'; lg.dataset.foto = url; }; im.src = url; }
  else { lg.style.backgroundImage = ''; lg.style.backgroundSize = ''; lg.style.backgroundPosition = ''; delete lg.dataset.foto; }
}
const brandHex = () => /^#[0-9a-fA-F]{6}$/.test(String(S.cfg.warnaUtama || '')) ? S.cfg.warnaUtama : '#1B4332';
const brandRgba = a => { const h = brandHex(); return 'rgba(' + parseInt(h.slice(1, 3), 16) + ',' + parseInt(h.slice(3, 5), 16) + ',' + parseInt(h.slice(5, 7), 16) + ',' + a + ')'; };
const clampN = (v, lo, hi, d) => { const n = (v === undefined || v === null || v === '') ? NaN : Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d; };
/** pengaturan banner (dinormalkan; nilai aneh jatuh ke bawaan): lebar foto 30–70%, sisi kanan/kiri, fokus 0–100%, tinggi s/m/l */
const fotoOpt = c => ({ lebar: clampN(c.fotoBannerLebar, 30, 70, 50), sisi: c.fotoBannerSisi === 'kiri' ? 'kiri' : 'kanan', fx: clampN(c.fotoFokusX, 0, 100, 50), fy: clampN(c.fotoFokusY, 0, 100, 50), tinggi: ['s', 'm', 'l'].includes(c.fotoBannerTinggi) ? c.fotoBannerTinggi : 'm' });
/** banner Dashboard gaya "foto di ujung": warna utama polos membawa tulisan; foto hanya di ujung dan memudar ke warna utama */
function fotoBannerHTML(o, url, nama, ta, mini) {
  const c = brandHex(), kanan = o.sisi === 'kanan', tinggi = { s: 'clamp(90px,12vw,110px)', m: 'clamp(110px,15vw,150px)', l: 'clamp(140px,20vw,190px)' }[o.tinggi];
  const foto = url ? '<div style="position:absolute;top:0;bottom:0;' + (kanan ? 'right:0' : 'left:0') + ';width:' + o.lebar + '%;background:url(' + esc(url) + ') ' + o.fx + '% ' + o.fy + '%/cover"></div>' : '';
  const fade = '<div style="position:absolute;inset:0;background:linear-gradient(' + (kanan ? '90deg' : '270deg') + ',' + c + ' 0%,' + c + ' ' + (100 - o.lebar) + '%,' + brandRgba(0) + ' 100%)"></div>';
  const tx = '<div style="position:absolute;bottom:14px;' + (kanan ? 'left:18px;right:' + (o.lebar + 2) + '%' : 'left:' + (o.lebar + 2) + '%;right:18px') + ';color:#fff;line-height:1.3"><div style="font-size:18px;font-weight:700">' + esc(nama) + '</div><div style="font-size:12px;opacity:.92">Tahun Ajaran ' + esc(ta) + '</div></div>';
  return '<div class="foto-banner" style="position:relative;height:' + (mini ? '100px' : tinggi) + ';border-radius:14px;overflow:hidden;margin-bottom:14px;background:' + c + '">' + foto + fade + tx + '</div>';
}
function fotoBanner() { return fotoOn('fotoDashboard') ? fotoBannerHTML(fotoOpt(S.cfg), fotoUrl(1200), S.cfg.namaMadrasah || S.cfg.appName || 'SADaM', S.cfg.tahunAktif || '') : ''; }
function fotoBannerKontrol() {
  const o = fotoOpt(S.cfg), sel = (v, cur) => v === cur ? ' selected' : '';
  return '<label class="l" style="margin-top:12px">Atur banner Dashboard</label><div class="grid g2"><div><label class="l" for="ft_sisi">Sisi foto</label><select class="in" id="ft_sisi" onchange="fotoPreview()"><option value="kanan"' + sel('kanan', o.sisi) + '>Ujung kanan</option><option value="kiri"' + sel('kiri', o.sisi) + '>Ujung kiri</option></select></div><div><label class="l" for="ft_tinggi">Tinggi banner</label><select class="in" id="ft_tinggi" onchange="fotoPreview()"><option value="s"' + sel('s', o.tinggi) + '>Ringkas</option><option value="m"' + sel('m', o.tinggi) + '>Sedang</option><option value="l"' + sel('l', o.tinggi) + '>Tinggi</option></select></div></div>' +
    '<label class="l" for="ft_lebar">Lebar foto: <b id="ft_lebar_v">' + o.lebar + '%</b></label><input type="range" id="ft_lebar" min="30" max="70" step="5" value="' + o.lebar + '" oninput="fotoPreview()" style="width:100%">' +
    '<label class="l" for="ft_fx">Fokus foto, kiri–kanan: <b id="ft_fx_v">' + o.fx + '%</b></label><input type="range" id="ft_fx" min="0" max="100" step="5" value="' + o.fx + '" oninput="fotoPreview()" style="width:100%">' +
    '<label class="l" for="ft_fy">Fokus foto, atas–bawah: <b id="ft_fy_v">' + o.fy + '%</b></label><input type="range" id="ft_fy" min="0" max="100" step="5" value="' + o.fy + '" oninput="fotoPreview()" style="width:100%">' +
    '<div class="muted sm" style="margin:8px 0 4px">Pratinjau</div><div id="ft_bnprev">' + fotoBannerHTML(o, FT.data || fotoUrl(800), S.cfg.namaMadrasah || S.cfg.appName || 'SADaM', S.cfg.tahunAktif || '', true) + '</div>' +
    '<div class="row wrap" style="margin-top:6px;align-items:center"><button class="btn sm" type="button" onclick="fotoReset()"><i class="bi bi-arrow-counterclockwise"></i>Atur ulang ke bawaan</button><span class="muted sm">“Fokus” menentukan bagian foto yang diperlihatkan saat dipotong — mis. geser ke kiri agar gedung di sisi kiri foto tetap terlihat.</span></div>';
}
const fotoKontrol = () => fotoOpt({ fotoBannerLebar: ($('ft_lebar') || {}).value, fotoBannerSisi: ($('ft_sisi') || {}).value, fotoFokusX: ($('ft_fx') || {}).value, fotoFokusY: ($('ft_fy') || {}).value, fotoBannerTinggi: ($('ft_tinggi') || {}).value });
function fotoPreview() {
  const o = fotoKontrol(), set = (id, v) => { const e = $(id); if (e) e.textContent = v; }; set('ft_lebar_v', o.lebar + '%'); set('ft_fx_v', o.fx + '%'); set('ft_fy_v', o.fy + '%');
  const e = $('ft_bnprev'); if (e) e.innerHTML = fotoBannerHTML(o, FT.data || fotoUrl(800), S.cfg.namaMadrasah || S.cfg.appName || 'SADaM', S.cfg.tahunAktif || '', true);
}
function fotoReset() { const d = FOTO_BAWAAN, put = (id, v) => { const e = $(id); if (e) e.value = v; }; put('ft_lebar', d.lebar); put('ft_sisi', d.sisi); put('ft_fx', d.fx); put('ft_fy', d.fy); put('ft_tinggi', d.tinggi); fotoPreview(); }
const FOTO_BAWAAN = { lebar: 50, sisi: 'kanan', fx: 50, fy: 50, tinggi: 'm' };
/** foto → JPEG ≤1600 px lebar, ±300 KB (diproses di browser sebelum diunggah) */
function fotoSiapkan(file) {
  return new Promise((ok, no) => {
    if (!/^image\//.test(file.type)) return no(new Error('Pilih berkas gambar (JPG, PNG, atau WebP).')); if (file.size > 15 * 1024 * 1024) return no(new Error('Berkas terlalu besar (maks. 15 MB).'));
    const rd = new FileReader(); rd.onerror = () => no(new Error('Gagal membaca berkas.'));
    rd.onload = () => { const img = new Image(); img.onerror = () => no(new Error('Gambar tidak dapat dibuka. Coba format JPG atau PNG.')); img.onload = () => {
      try {
        if (img.width < 600) return no(new Error('Foto terlalu kecil (minimal 600 px lebar).'));
        const s = Math.min(1, 1600 / img.width), w = Math.round(img.width * s), h = Math.round(img.height * s), cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); cx.drawImage(img, 0, 0, w, h);
        let q = 0.82, out = cv.toDataURL('image/jpeg', q); while (out.length * 0.75 > 330 * 1024 && q > 0.45) { q -= 0.07; out = cv.toDataURL('image/jpeg', q); }
        if (out.length * 0.75 > 800 * 1024) return no(new Error('Foto masih terlalu besar setelah dikecilkan. Pilih foto lain.')); ok(out);
      } catch (e) { no(e); } }; img.src = rd.result; }; rd.readAsDataURL(file);
  });
}
const FT = { data: '' };
function fotoCard() {
  const ada = !!S.cfg.fotoLatarId, on = k => String(S.cfg[k] || '') !== '0';
  return '<div class="card" style="margin-top:12px"><h3>Foto latar madrasah</h3><p class="muted sm" style="margin:2px 0 8px">Tampil sebagai latar <b>layar masuk</b> dan banner kecil di <b>Dashboard</b>. Foto dikecilkan otomatis (±300 KB) sebelum diunggah.</p>' +
    (ada ? '<img src="' + esc(fotoUrl(400)) + '" alt="Foto latar saat ini" style="width:100%;max-width:320px;height:120px;object-fit:cover;border-radius:10px;border:1px solid var(--border)" onerror="this.style.display=\'none\'"><div class="muted sm" style="margin:4px 0 8px">Foto aktif.</div>' : '<div class="muted sm" style="margin-bottom:8px">Belum ada foto.</div>') +
    '<label class="l" for="ft_file">' + (ada ? 'Ganti foto' : 'Pilih foto') + ' <span class="muted sm" style="font-weight:400">(JPG/PNG/WebP, lanskap, min. 600 px lebar)</span></label><input class="in" type="file" id="ft_file" accept="image/jpeg,image/png,image/webp" onchange="fotoPilih(this)">' +
    '<div id="ft_box" class="hide" style="margin-top:8px"><img id="ft_prev" alt="Pratinjau foto" style="width:100%;max-width:320px;height:120px;object-fit:cover;border-radius:10px;border:1px solid var(--border)"><div class="muted sm" id="ft_info" style="margin:4px 0 8px"></div><button class="btn pri" id="ft_go" onclick="fotoUnggah()"><i class="bi bi-cloud-upload"></i>Unggah foto</button></div>' +
    '<label class="l">Tampilkan di</label><label class="chk"><input type="checkbox" id="ft_login" ' + (on('fotoLogin') ? 'checked' : '') + '> Layar masuk</label><label class="chk"><input type="checkbox" id="ft_dash" ' + (on('fotoDashboard') ? 'checked' : '') + '> Banner di Dashboard</label>' +
    fotoBannerKontrol() + '<div class="row wrap" style="margin-top:8px"><button class="btn" onclick="fotoSimpanPilihan()"><i class="bi bi-save"></i>Simpan pilihan</button>' + (ada ? '<button class="btn danger" onclick="fotoHapusForm()"><i class="bi bi-trash"></i>Hapus foto</button>' : '') + '</div>' +
    '<div class="hint" style="margin-top:8px">Foto disimpan di Google Drive aplikasi dan <b>dapat dilihat siapa saja yang memiliki tautannya</b> (diperlukan agar tampil di layar masuk sebelum login). Pakai foto bangunan atau halaman; hindari wajah anak yang bisa dikenali.</div></div>';
}
function fotoRefresh() { applyLatar(); persist(); if (S.rendered.dashboard) RENDER.dashboard(); if (S.page === 'pengaturan') pRender(); }
function fotoPilih(el) {
  const f = el.files && el.files[0]; if (!f) return; $('ft_box').classList.remove('hide'); $('ft_info').textContent = 'Memproses…'; $('ft_go').disabled = true;
  fotoSiapkan(f).then(d => { FT.data = d; $('ft_prev').src = d; $('ft_info').textContent = 'Siap diunggah · ' + Math.round(d.length * 0.75 / 1024) + ' KB'; $('ft_go').disabled = false; fotoPreview(); }).catch(e => { FT.data = ''; $('ft_box').classList.add('hide'); toast(e.message, 'err'); });
}
function fotoUnggah() {
  if (!FT.data) return toast('Pilih foto terlebih dahulu.', 'err'); const b = $('ft_go'); b.disabled = true;
  api('unggahFotoLatar', FT.data).then(r => { if (!r.success) { b.disabled = false; return toast(r.message, 'err'); } S.cfg.fotoLatarId = r.data.fotoLatarId; S.cfg.fotoLatarV = r.data.fotoLatarV; FT.data = ''; fotoRefresh(); toast('Foto latar diunggah.'); }).catch(e => { b.disabled = false; toast(e.message, 'err'); });
}
function fotoSimpanPilihan() {
  const b = fotoKontrol(), o = { fotoLogin: $('ft_login').checked ? '1' : '0', fotoDashboard: $('ft_dash').checked ? '1' : '0', fotoBannerLebar: String(b.lebar), fotoBannerSisi: b.sisi, fotoFokusX: String(b.fx), fotoFokusY: String(b.fy), fotoBannerTinggi: b.tinggi };
  api('saveConfig', o).then(r => { if (!r.success) return toast(r.message, 'err'); Object.assign(S.cfg, o); fotoRefresh(); toast('Pilihan disimpan.'); }).catch(e => toast(e.message, 'err'));
}
function fotoHapusForm() { openModal('Hapus foto latar?', '<p class="muted" style="margin-top:0">Foto dihapus dari Google Drive, dan layar masuk serta Dashboard kembali polos.</p>', '<button class="btn" onclick="closeModal()">Batal</button><button class="btn danger" id="fhGo" onclick="fotoHapusGo()"><i class="bi bi-trash"></i>Hapus</button>'); }
function fotoHapusGo() {
  const b = $('fhGo'); b.disabled = true;
  api('hapusFotoLatar').then(r => { if (!r.success) { b.disabled = false; return toast(r.message, 'err'); } S.cfg.fotoLatarId = ''; S.cfg.fotoLatarV = ''; closeModal(); fotoRefresh(); toast('Foto latar dihapus.'); }).catch(e => { b.disabled = false; toast(e.message, 'err'); });
}
const jenisSuk = id => (S.ix.jenis[id] || {}).sifat === 'sukarela';
const taOf = p => { p = String(p || ''); const m = p.match(/^(\d{4})-(\d{2})/); if (m) { const y = +m[1]; return +m[2] >= 7 ? y + '/' + (y + 1) : (y - 1) + '/' + y; } return /^\d{4}\/\d{4}$/.test(p) ? p : ''; };
const jenisNm = id => (S.ix.jenis[id] || {}).nama || id;
const kelasNm = id => (S.ix.kelas[id] || {}).nama_kelas || '-';
function trxOwner(t) { if (!t) return { nama: '-', kelas: '' }; if (t.donatur) return { nama: 'Donatur: ' + t.donatur, kelas: '', donor: true }; if (t.id_siswa) { const s = S.ix.siswa[t.id_siswa]; return { nama: s ? s.nama : '-', kelas: s ? kelasNm(s.id_kelas) : '', sid: t.id_siswa }; } const w = S.ix.wali[t.id_wali]; const k = (S.ix.anak[t.id_wali] || []).map(s => kelasNm(s.id_kelas)).join('/'); return { nama: 'Wali: ' + (w ? w.nama_wali : '-'), kelas: k, wali: true }; }
function groupKwitansi(onlyActive) {
  const g = {};
  S.live.pembayaran.forEach(p => { if (!p.no_kwitansi) return; const x = g[p.no_kwitansi] = g[p.no_kwitansi] || { no: p.no_kwitansi, tanggal: p.tanggal, rows: [], total: 0, metode: p.metode, status: p.status, ket: p.keterangan, oleh: p.dicatat_oleh, peran: p.oleh_peran, waktuInput: p.oleh_waktu, alasan: p.alasan_batal, trx: p.id_trx }; x.rows.push(p); if (p.status_oleh) { x.statusOleh = p.status_oleh; x.statusWaktu = p.status_waktu; } if (p.diubah_oleh) { x.ubahOleh = p.diubah_oleh; x.ubahWaktu = p.diubah_waktu; } if (p.status === 'aktif') x.total += Number(p.jumlah); else x.status = p.status === 'dihapus' ? 'dihapus' : 'dibatalkan'; });
  return Object.values(g).map(x => { const t0 = S.ix.tg[x.rows[0].id_tagihan]; x.owner = trxOwner(t0); x.jenis = jenisRingkas(x.rows); if (x.status !== 'aktif') x.total = x.rows.reduce((a, r) => a + Number(r.jumlah), 0); return x; }).sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)) || String(b.no).localeCompare(String(a.no)));
}
const sumIn = (ym, day) => S.live.pembayaran.reduce((a, p) => a + (p.status === 'aktif' && (day ? String(p.tanggal).slice(0, 10) === day : ymOf(p.tanggal) === ym) ? Number(p.jumlah) : 0), 0);
const sumOut = ym => S.live.pengeluaran.reduce((a, p) => a + (p.status === 'aktif' && ymOf(p.tanggal) === ym ? Number(p.jumlah) : 0), 0);
function prevYm(ym, k) { const t = ym.split('-').map(Number); const d = new Date(t[0], t[1] - 1 - (k === undefined ? 1 : k), 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); }

/* ───────── Logo: aplikasi (sidebar) & madrasah (kop cetak) ───────── */
function kopHTMLFrom(c) {
  const lg = c.logoKop, pad = lg ? 92 : 0, F = "'Times New Roman',Times,serif";
  const ln = (t, sz, w) => t ? '<div style="font:' + w + ' ' + sz + 'px/' + (sz + 4) + 'px ' + F + ';text-transform:uppercase;margin:0">' + esc(t) + '</div>' : '';
  return '<div class="kop" style="position:relative;text-align:center;padding:0 ' + pad + 'px 6px;border-bottom:3px double #000;margin-bottom:12px;min-height:' + (lg ? 86 : 0) + 'px;color:#000">' + (lg ? '<img src="' + lg + '" alt="Logo madrasah" style="position:absolute;left:0;top:0;width:84px;height:84px;object-fit:contain">' : '') +
    ln(c.kop1, 20, 'bold') + ln(c.kop2, 13, 'normal') + ln(c.namaMadrasah, 20, 'bold') + '<div style="font:normal 12.5px/16px ' + F + ';letter-spacing:.4px;margin-top:2px;text-transform:uppercase">' + esc(c.alamat || '') + '</div></div>';
}
const kopHTML = () => kopHTMLFrom(S.cfg);
const MODUL = [['seragam', 'Seragam'], ['pengeluaran', 'Pengeluaran'], ['pengingat', 'Pengingat WA'], ['rekap', 'Rekap Kelas'], ['laporan', 'Laporan Bulanan']];
const modOff = () => String(S.cfg.modulOff || '').split(',').filter(Boolean);
const modOn = id => !modOff().includes(id);
function shade(hex, f) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const t = f < 0 ? 0 : 255, p = Math.abs(f); r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b); return '#' + [r, g, b].map(x => ('0' + x.toString(16)).slice(-2)).join(''); }
function applyBrand(prevColor) {
  const c = S.cfg, col = prevColor || (/^#[0-9a-f]{6}$/i.test(c.warnaUtama || '') ? c.warnaUtama : '#1B4332'), st = document.documentElement.style, dark = document.documentElement.dataset.theme === 'dark';
  const n = parseInt(col.slice(1), 16);
  st.setProperty('--primary', col); st.setProperty('--primary-hover', shade(col, -0.2)); st.setProperty('--ring', 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',.16)');
  if (dark) st.removeProperty('--sidebar'); else st.setProperty('--sidebar', col);
  const a = $('brandName'), b = $('brandSub'); if (a) a.textContent = c.appName || 'SADaM'; if (b) b.textContent = c.appSub || ''; document.title = (c.appName || 'SADaM') + ' — ' + (c.appSub || '');
  applyLogo(); applyKredit(); applyLatar();
}
function applyZoom() { let z = 0.95; try { z = Number(localStorage.getItem('sadam_zoom') || 0.95); } catch (e) {} if (!(z >= 0.7 && z <= 1.3)) z = 0.95; document.body.style.zoom = window.innerWidth < 1024 ? 1 : z; }
window.addEventListener('resize', debounce(applyZoom, 200));
function openDisplay() {
  let z = 0.95; try { z = Number(localStorage.getItem('sadam_zoom') || 0.95); } catch (e) {} const dark = document.documentElement.dataset.theme === 'dark';
  openModal('Tampilan', '<label class="l" style="margin-top:0">Ukuran tampilan (perangkat ini)</label><div class="seg" id="zSeg">' + [[0.85, 'Kecil'], [0.9, 'Ringkas'], [0.95, 'Normal'], [1, 'Besar'], [1.1, 'Lebih besar']].map(o => '<button style="justify-content:center;padding:8px 4px;font-size:12px" class="' + (Math.abs(o[0] - z) < 0.01 ? 'on' : '') + '" onclick="setZoom(' + o[0] + ')">' + o[1] + '</button>').join('') + '</div><div class="hint">Berlaku di layar lebar. Di HP/tablet ukuran otomatis.</div><label class="l">Tema</label><div class="seg"><button class="' + (dark ? '' : 'on') + '" onclick="setTema(\'light\')"><i class="bi bi-sun"></i><b>Terang</b></button><button class="' + (dark ? 'on' : '') + '" onclick="setTema(\'dark\')"><i class="bi bi-moon-stars"></i><b>Gelap</b></button></div>' + akunBlock() + (S.user.peran === 'Super Admin' ? '<div class="note" style="margin-top:16px;margin-bottom:0"><i class="bi bi-palette"></i><span>Logo, nama aplikasi, warna, dan menu aktif diatur di <a style="color:var(--primary);cursor:pointer;font-weight:600" onclick="closeModal();go(\'pengaturan\',{tab:\'tampilan\'})">Pengguna &amp; Sistem → Tampilan</a>.</span></div>' : ''), '<button class="btn pri" onclick="closeModal()">Selesai</button>');
}
function akunBlock() { return '<label class="l">Akun: <b>' + esc(S.user.nama) + '</b> <span class="muted mono">(' + esc(S.user.username) + ')</span></label><div class="row wrap"><button class="btn" onclick="closeModal();showChangePass(false)"><i class="bi bi-key"></i>Ganti Password</button><button class="btn danger" onclick="doLogout()"><i class="bi bi-box-arrow-right"></i>Keluar</button></div>' + (TTD_ROLES.includes(S.user.peran) ? '<div style="margin-top:12px">' + ttdBox(S.user.username) + '</div>' : '') + '<div class="muted sm" style="margin-top:12px">SADaM v' + APP_VERSI + ' · server v' + esc(S.versiServer || 'lama') + ' · <a style="color:var(--primary);cursor:pointer" onclick="closeModal();openTentang()">Tentang aplikasi</a></div>'; }
/** Peringatan bila Kode.gs dan JavaScript.html tidak sama versinya (pembaruan tertinggal/terpasang sebagian). Muncul sekali per sesi tab. */
const cmpVer = (a, b) => { const x = String(a || '0').split('.').map(Number), y = String(b || '0').split('.').map(Number); for (let i = 0; i < 3; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };
function cekVersi() {
  if (!S.user || cmpVer(S.versiServer, API_MIN) >= 0) return; const tanda = (S.versiServer || 'lama') + '|' + APP_VERSI; try { if (sessionStorage.getItem('sadam_ver') === tanda) return; sessionStorage.setItem('sadam_ver', tanda); } catch (e) {}
  openModal('Pembaruan belum lengkap', '<div class="note" style="background:var(--sebagian-bg);align-items:flex-start"><i class="bi bi-exclamation-triangle"></i><span>Versi <b>backend</b> (Apps Script): <b>' + esc(S.versiServer ? 'v' + S.versiServer : 'lama') + '</b>. Frontend ini (<b>v' + esc(APP_VERSI) + '</b>) membutuhkan backend minimal <b>v' + esc(API_MIN) + '</b>, sehingga sebagian fitur bisa tidak muncul atau gagal.</span></div><ol class="sm" style="padding-left:18px;margin:10px 0 0"><li>Buka proyek <b>Apps Script</b>, ganti seluruh isi <b>Kode.gs</b> dengan berkas terbaru.</li><li><b>Deploy → Manage deployments → ✏ → Version: New version → Deploy</b> (alamat /exec tidak berubah).</li><li>Muat ulang halaman ini (<b>Ctrl+Shift+R</b>).</li></ol>', '<button class="btn pri" onclick="closeModal()">Mengerti</button>');
}
/** Layar "Cek koneksi server" (di bawah formulir login): ping ke backend + penjelasan bila gagal (alamat salah, akses bukan Anyone, offline, dll.). */
function initCekKoneksi() { const p = document.querySelector('.login-card'); if (!p || $('lgCek')) return; const e = document.createElement('p'); e.id = 'lgCek'; e.className = 'muted sm'; e.style.cssText = 'text-align:center;margin:8px 0 0'; e.innerHTML = '<a style="color:var(--primary);cursor:pointer" onclick="cekKoneksi()">Cek koneksi server</a>'; p.appendChild(e); }
function cekKoneksi() {
  openModal('Cek koneksi server', '<div id="ckBody" class="sm">Memeriksa…</div>', '<button class="btn" onclick="cekKoneksi()"><i class="bi bi-arrow-repeat"></i>Periksa lagi</button><button class="btn pri" onclick="closeModal()">Tutup</button>');
  const put = (ok, html) => { const e = $('ckBody'); if (e) e.innerHTML = '<div class="note" style="background:var(--' + (ok ? 'lunas' : 'tunggak') + '-bg);align-items:flex-start"><i class="bi bi-' + (ok ? 'check-circle-fill' : 'x-octagon') + '"></i><span>' + html + '</span></div>'; };
  let u = ''; try { u = gasUrl(); } catch (e) { return put(false, esc(e.message)); }
  gasPing().then(r => { const sama = cmpVer(r.versi, API_MIN) >= 0; put(sama, 'Terhubung ke server (' + esc(r.app || 'SADaM') + ') dalam <b>' + r.ms + ' ms</b>.<br>Versi frontend <b>v' + esc(APP_VERSI) + '</b> · versi backend <b>' + esc(r.versi ? 'v' + r.versi : 'lama') + '</b>' + (sama ? ' — kompatibel (sinkron).' : ' — <b>tidak sama</b>: backend terlalu lama (minimal v' + esc(API_MIN) + '); lihat petunjuk pembaruan di panduan.')); }).catch(e => put(false, esc(e.message) + '<div class="muted sm" style="margin-top:6px">Alamat: ' + esc(u.slice(0, 48)) + '…</div>'));
}
function setZoom(z) { try { localStorage.setItem('sadam_zoom', z); } catch (e) {} applyZoom(); openDisplay(); }
function setTema(t) { document.documentElement.dataset.theme = t; try { localStorage.setItem('sadam_theme', t); } catch (e) {} applyBrand(); if (S.page === 'dashboard' && RENDER.dashboard.upd) RENDER.dashboard.upd(); openDisplay(); }
function applyLogo() {
  const el = $('brandLogo'); if (!el) return; const lg = S.cfg.logoApp;
  el.innerHTML = lg ? '<img src="' + lg + '" alt="Logo SADaM">' : '<i class="bi bi-mortarboard-fill"></i>'; el.classList.toggle('has-img', !!lg);
}
function pickLogo(key, input) {
  const f = input.files[0]; input.value = ''; if (!f) return; if (!/^image\//.test(f.type)) return toast('Berkas harus berupa gambar (PNG/JPG/WEBP).', 'err');
  const rd = new FileReader(); rd.onload = () => { const img = new Image(); img.onload = () => {
    let max = key === 'logoKop' ? 300 : 200, out = '';
    for (let tries = 0; tries < 8; tries++) {
      const s = Math.min(1, max / Math.max(img.width, img.height)), w = Math.max(1, Math.round(img.width * s)), h = Math.max(1, Math.round(img.height * s)), cv = document.createElement('canvas'); cv.width = w; cv.height = h; const cx = cv.getContext('2d');
      out = cv.toDataURL('image/png'); cx.drawImage(img, 0, 0, w, h); out = cv.toDataURL('image/png');
      if (out.length > 45000) { cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); cx.drawImage(img, 0, 0, w, h); out = cv.toDataURL('image/jpeg', 0.82); }
      if (out.length <= 45000) break; max = Math.round(max * 0.8);
    }
    if (out.length > 45000) return toast('Gambar terlalu rumit untuk dikompres. Gunakan logo yang lebih sederhana.', 'err');
    setLogo(key, out);
  }; img.onerror = () => toast('Gambar tidak dapat dibaca.', 'err'); img.src = rd.result; }; rd.readAsDataURL(f);
}
function setLogo(key, val) {
  const old = S.cfg[key] || ''; S.cfg[key] = val; applyLogo(); persist(); if (S.page === 'pengaturan') pRender(); toast(val ? 'Logo disimpan.' : 'Logo dihapus.');
  const o = {}; o[key] = val; api('saveConfig', o).then(r => { if (!r.success) { S.cfg[key] = old; applyLogo(); if (S.page === 'pengaturan') pRender(); toast(r.message, 'err'); } }).catch(e => { S.cfg[key] = old; applyLogo(); if (S.page === 'pengaturan') pRender(); toast(e.message, 'err'); });
}

/* ───────── Metode pembayaran & rekening (diatur Super Admin) ───────── */
const DEF_METODE = [{ id: 'tunai', nama: 'Tunai', tipe: 'tunai', ket: 'Loket Bendahara', aktif: true }, { id: 'transfer', nama: 'Transfer', tipe: 'transfer', ket: '', bank: '', norek: '', atasnama: '', aktif: true }];
const metodeAll = () => { try { const v = JSON.parse(S.cfg.metodeBayar || 'null'); if (Array.isArray(v) && v.length) return v; } catch (e) { } return DEF_METODE; };
const metodeList = () => metodeAll().filter(m => m.aktif !== false);
const metodeObj = n => metodeAll().find(m => m.nama === n);
const metodeTipe = n => { const m = metodeObj(n); return m ? m.tipe : (n === 'Tunai' ? 'tunai' : 'transfer'); };
const waktuLbl = s => s ? tglID(s) + ' ' + jam(s) : '';
const nowISO = () => todayStr() + 'T' + nowHM() + ':00';
const stampMe = () => S.user.nama + ' · ' + S.user.peran;
function copyTxt(t, msg) {
  const done = () => toast(msg || 'Disalin ke clipboard.');
  const fb = () => { const x = document.createElement('textarea'); x.value = t; document.body.appendChild(x); x.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Salin manual: ' + t, 'err'); } x.remove(); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done).catch(fb); else fb();
}
function metodeBtns(sel, fn) { return metodeList().map((m, i) => '<button class="' + (m.nama === sel ? 'on' : '') + '" onclick="' + fn + '(' + i + ')"><i class="bi ' + (m.tipe === 'tunai' ? 'bi-cash-coin' : 'bi-bank') + '" style="font-size:20px"></i><span><b>' + esc(m.nama) + '</b>' + (m.ket ? '<br><span class="muted sm">' + esc(m.ket) + '</span>' : '') + '</span></button>').join(''); }
function metodeInfo(nama, sidExpr) {
  const m = metodeObj(nama); if (!m || m.tipe !== 'transfer') return '';
  if (!m.norek) return '<div class="hint">' + (S.user.peran === 'Super Admin' ? 'Rekening belum diisi — atur di <a style="color:var(--primary);cursor:pointer;font-weight:600" onclick="go(\'pengaturan\',{tab:\'metode\'})">Pengguna &amp; Sistem → Metode &amp; Rekening</a>.' : 'Rekening metode ini belum diisi oleh Super Admin.') + '</div>';
  const i = metodeList().findIndex(x => x.nama === nama);
  return '<div class="auto" style="background:var(--canvas);border-color:var(--border)"><div class="row wrap" style="justify-content:space-between"><div><b>' + esc(m.bank || m.nama) + '</b> <span class="mono">' + esc(m.norek) + '</span><div class="muted sm">a.n. ' + esc(m.atasnama || S.cfg.namaMadrasah || '') + '</div></div><div class="row" style="gap:6px"><button class="btn sm" onclick="copyTxt(rekLine(' + i + '),\'Nomor rekening disalin.\')"><i class="bi bi-clipboard"></i>Salin</button><button class="btn sm" onclick="rekeningModal(' + sidExpr + ',' + i + ')"><i class="bi bi-send"></i>Kirim rekening</button></div></div></div>';
}
const rekLine = i => { const m = metodeList()[i]; return m ? (m.bank || m.nama) + ' ' + m.norek + ' a.n. ' + (m.atasnama || S.cfg.namaMadrasah || '') : ''; };
function metodeFilterOpts() { const n = new Set(metodeAll().map(m => m.nama)); S.live.pembayaran.forEach(p => p.metode && n.add(p.metode)); return [...n].map(x => '<option>' + esc(x) + '</option>').join(''); }
const DEF_TPL_REK = "Assalamu'alaikum Wr. Wb.\n{sapaan}Pembayaran administrasi madrasah dapat ditransfer ke:\n\nBank: {bank}\nNo. Rekening: {norek}\nAtas nama: {atasnama}\n{rincian}\nMohon cantumkan nama siswa pada berita transfer dan kirimkan bukti transfer kepada bendahara.\nJazakumullah khairan.\nWassalamu'alaikum Wr. Wb.\nBendahara {madrasah}";
let RK2 = { sid: '', nama: '', nominal: false };
const rekList = () => metodeList().filter(m => m.tipe === 'transfer' && m.norek);
function rkText() {
  const L = rekList(), m = L.find(x => x.nama === RK2.nama) || L[0]; if (!m) return '';
  const s = RK2.sid ? S.ix.siswa[RK2.sid] : null, w = s ? S.ix.wali[s.id_wali] : null; let rinc = '';
  if (s && RK2.nominal) {
    const seen = {}, arr = []; (S.ix.anak[s.id_wali] || [s]).forEach(a => tagihanSiswa(a.id_siswa).forEach(r => { if (r.sisa > 0 && !seen[r.t.id_tagihan]) { seen[r.t.id_tagihan] = 1; arr.push({ r: r, a: a }); } }));
    if (arr.length) rinc = '\nRincian tagihan:\n' + rincianLines(arr, (S.ix.anak[s.id_wali] || []).length > 1).join('\n') + '\nTotal: ' + rp(arr.reduce((t, x) => t + x.r.sisa, 0)) + '\n';
  }
  return (S.cfg.templateRekening || DEF_TPL_REK).replace(/\{sapaan\}/g, w ? 'Yth. Bapak/Ibu ' + w.nama_wali + ' (wali dari ' + s.nama + ').\n' : '').replace(/\{wali\}/g, w ? w.nama_wali : '').replace(/\{siswa\}/g, s ? s.nama : '').replace(/\{bank\}/g, m.bank || m.nama).replace(/\{norek\}/g, m.norek).replace(/\{atasnama\}/g, m.atasnama || S.cfg.namaMadrasah || '').replace(/\{rincian\}/g, rinc).replace(/\{madrasah\}/g, S.cfg.namaMadrasah || '');
}
function rekeningModal(sid, idx) {
  const L = rekList();
  if (!L.length) return openModal('Rekening belum diisi', '<p class="muted">Belum ada rekening bank aktif yang diisi. ' + (S.user.peran === 'Super Admin' ? 'Isi di <a style="color:var(--primary);cursor:pointer;font-weight:600" onclick="closeModal();go(\'pengaturan\',{tab:\'metode\'})">Pengguna &amp; Sistem → Metode &amp; Rekening</a>.' : 'Minta Super Admin mengisinya di Pengguna &amp; Sistem → Metode &amp; Rekening.') + '</p>', '<button class="btn pri" onclick="closeModal()">Tutup</button>');
  const pick = typeof idx === 'number' ? metodeList()[idx] : null; RK2 = { sid: sid || '', nama: pick && pick.norek ? pick.nama : L[0].nama, nominal: false };
  openModal('Kirim Rekening', '<div id="rkBox"></div>', '<button class="btn" onclick="closeModal()">Tutup</button><button class="btn" onclick="copyTxt(rkText(),\'Pesan rekening disalin.\')"><i class="bi bi-clipboard"></i>Salin pesan</button><a class="btn wa hide" id="rkWa" target="_blank" rel="noopener"><i class="bi bi-whatsapp"></i>Kirim via WhatsApp</a>');
  rkDraw();
}
function rkSet(k, v) { RK2[k] = v; rkDraw(); }
function rkDraw() {
  const L = rekList(), s = RK2.sid ? S.ix.siswa[RK2.sid] : null, w = s ? S.ix.wali[s.id_wali] : null;
  $('rkBox').innerHTML = (L.length > 1 ? '<label class="l" style="margin-top:0">Pilih rekening</label><div class="seg" style="flex-direction:column">' + L.map((m, i) => '<button class="' + (m.nama === RK2.nama ? 'on' : '') + '" onclick="rkSet(\'nama\',rekList()[' + i + '].nama)"><i class="bi bi-bank" style="font-size:18px"></i><span><b>' + esc(m.bank || m.nama) + '</b> <span class="mono">' + esc(m.norek) + '</span><br><span class="muted sm">a.n. ' + esc(m.atasnama || S.cfg.namaMadrasah || '') + '</span></span></button>').join('') + '</div>' : '') +
    (s ? '<label class="chk"><input type="checkbox" ' + (RK2.nominal ? 'checked' : '') + ' onchange="rkSet(\'nominal\',this.checked)"> Sertakan rincian tagihan <span class="muted sm">(' + esc(s.nama) + ')</span></label>' : '<div class="hint">Tanpa siswa terpilih: pesan hanya dapat disalin dan ditempel manual.</div>') + '<label class="l">Pratinjau pesan</label><div class="wabub" id="rkPrev"></div>';
  $('rkPrev').textContent = rkText(); const a = $('rkWa');
  if (w && w.no_whatsapp) { a.href = waLink(w.no_whatsapp, rkText()); a.classList.remove('hide'); } else a.classList.add('hide');
}
/* jejak petugas */
function petugasHTML(x) {
  return '<b>' + esc(x.oleh || '-') + '</b>' + (x.peran ? '<br><span class="muted">' + esc(x.peran) + '</span>' : '') +
    (x.ubahOleh ? '<br><span style="color:var(--sebagian)">Dikoreksi: ' + esc(x.ubahOleh) + ' · ' + waktuLbl(x.ubahWaktu) + '</span>' : '') +
    (x.statusOleh ? '<br><span style="color:var(--tunggak)">' + (x.status === 'dihapus' ? 'Dihapus' : 'Dibatalkan') + ': ' + esc(x.statusOleh) + ' · ' + waktuLbl(x.statusWaktu) + '</span>' : '');
}
function logBar(g) {
  const L = ['<b>Dicatat oleh:</b> ' + esc(g.oleh || '-') + (g.peran ? ' (' + esc(g.peran) + ')' : '') + (g.waktuInput ? ' · ' + waktuLbl(g.waktuInput) : '')];
  if (g.ubahOleh) L.push('<b>Dikoreksi oleh:</b> ' + esc(g.ubahOleh) + ' · ' + waktuLbl(g.ubahWaktu));
  if (isClosedDate(g.tanggal)) L.push('<b><i class="bi bi-lock-fill"></i> Buku bulan ' + esc(String(g.tanggal).slice(0, 7)) + ' sudah ditutup</b> — kwitansi tidak dapat dikoreksi, dibatalkan, atau dihapus.');
  if (g.statusOleh) L.push('<b>' + (g.status === 'dihapus' ? 'Dihapus' : 'Dibatalkan') + ' oleh:</b> ' + esc(g.statusOleh) + ' · ' + waktuLbl(g.statusWaktu) + (g.alasan ? ' — ' + esc(g.alasan) : ''));
  return '<div class="note" style="align-items:flex-start;margin-bottom:12px"><i class="bi bi-person-check"></i><div class="sm">' + L.join('<br>') + '</div></div>';
}
function petugasKeluar(x) { return '<b>' + esc(x.dicatat_oleh || '-') + '</b>' + (x.oleh_peran ? '<br><span class="muted">' + esc(x.oleh_peran) + (x.oleh_waktu ? ' · ' + waktuLbl(x.oleh_waktu) : '') + '</span>' : '') + (x.diubah_oleh ? '<br><span style="color:var(--sebagian)">Diubah: ' + esc(x.diubah_oleh) + ' · ' + waktuLbl(x.diubah_waktu) + '</span>' : ''); }

/* ───────── Tanda tangan petugas (hanya kwitansi) & watermark kwitansi ───────── */
const TTD_ROLES = ['Super Admin', 'Bendahara'];
function sigSync() { const k = S.live && S.live.sigKey; if (k !== undefined && k !== S.sigKey) api('getTandaTangan').then(x => { if (x && x.success) { S.sig = x.data; S.sigKey = k; } }); }
/** tanda tangan milik petugas yang MENCATAT kwitansi (bukan yang sedang mencetak) */
function sigFor(g) { const r0 = (g.rows || [])[0] || {}; return (S.sig || []).find(s => r0.oleh_username && s.username === r0.oleh_username) || (S.sig || []).find(s => s.nama === g.oleh) || null; }
function sigBlock(g) { const s = sigFor(g); return s ? '<div style="height:70px;text-align:center"><img src="' + s.ttd + '" alt="Tanda tangan" style="max-height:66px;max-width:180px;margin-top:2px"></div>' : '<br><br><br><br>'; }
function wmHTMLFrom(c) {
  if (String(c.wmAktif) !== '1') return '';
  const mode = c.wmMode || 'teks', op = (Number(c.wmOpasitas) || 8) / 100, ang = (c.wmSudut === undefined || c.wmSudut === '') ? -30 : Number(c.wmSudut), uk = Number(c.wmUkuran) || 48; let inner = '';
  if (mode === 'teks') { const tx = c.wmTeks === undefined ? (c.namaMadrasah || '') : c.wmTeks; if (!String(tx).trim()) return ''; inner = '<div style="font:bold ' + uk + 'px/1.15 \'Times New Roman\',serif;text-align:center;color:#000;white-space:pre-line;letter-spacing:1px">' + esc(tx) + '</div>'; }
  else { const src = mode === 'logo' ? c.logoKop : c.wmGambar; if (!src) return ''; inner = '<img src="' + src + '" alt="" style="width:' + Math.round(uk * 5) + 'px;max-width:80%;height:auto">'; }
  return '<div style="position:absolute;left:0;top:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;overflow:hidden;pointer-events:none;z-index:-1;opacity:' + op + ';-webkit-print-color-adjust:exact;print-color-adjust:exact"><div style="transform:rotate(' + ang + 'deg)">' + inner + '</div></div>';
}
const wmHTML = () => wmHTMLFrom(S.cfg);
function ttdBadge(u) { return TTD_ROLES.includes(u.peran) ? (u.punya_ttd ? ' <span class="st Lunas" style="text-transform:none">TTD ✓</span>' : ' <span class="st Sebagian" style="text-transform:none">Belum ada TTD</span>') : ''; }
function ttdBox(un, who) {
  const s = (S.sig || []).find(x => x.username === un);
  return '<div class="lg-box" style="text-align:left"><b class="sm">Tanda tangan' + (who ? ' — ' + esc(who) : '') + '</b><div class="muted sm">Dipakai hanya di kwitansi yang dicatat oleh akun ini. Tidak dipakai di laporan bulanan.</div><div class="ttd-prev">' + (s ? '<img src="' + s.ttd + '" alt="Tanda tangan">' : '<span class="muted sm">Belum ada tanda tangan</span>') + '</div><div class="row wrap"><label class="btn sm" style="cursor:pointer"><i class="bi bi-upload"></i>' + (s ? 'Ganti' : 'Unggah') + '<input type="file" accept="image/*" hidden onchange="ttdPick(\'' + esc(un) + '\',this)"></label>' + (s ? '<button class="btn sm danger" onclick="ttdSimpan(\'' + esc(un) + '\',\'\')"><i class="bi bi-trash"></i>Hapus</button>' : '') + '</div><div class="hint">Foto/scan tanda tangan di kertas putih. Latar putih dihapus otomatis.</div></div>';
}
/** perkecil, hapus latar putih → PNG transparan ≤ ±33 KB */
function ttdPick(un, input) {
  const f = input.files[0]; input.value = ''; if (!f) return; if (!/^image\//.test(f.type)) return toast('Berkas harus berupa gambar.', 'err');
  const rd = new FileReader(); rd.onload = () => { const img = new Image(); img.onload = () => {
    let maxW = 360, out = '';
    for (let k = 0; k < 8; k++) {
      const sc = Math.min(1, maxW / img.width, 160 / img.height), w = Math.max(1, Math.round(img.width * sc)), h = Math.max(1, Math.round(img.height * sc)), cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, w, h); const d = cx.getImageData(0, 0, w, h), px = d.data;
      for (let i = 0; i < px.length; i += 4) { const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]; if (lum > 225) px[i + 3] = 0; else if (lum > 170) px[i + 3] = Math.round(px[i + 3] * (225 - lum) / 55); }
      cx.putImageData(d, 0, 0); out = cv.toDataURL('image/png'); if (out.length <= 44000) break; maxW = Math.round(maxW * 0.8);
    }
    if (out.length > 44000) return toast('Gambar terlalu rumit. Gunakan foto tanda tangan yang lebih sederhana (tinta gelap di kertas putih).', 'err');
    ttdSimpan(un, out);
  }; img.onerror = () => toast('Gambar tidak dapat dibaca.', 'err'); img.src = rd.result; }; rd.readAsDataURL(f);
}
function ttdSimpan(un, data) {
  api('simpanTandaTangan', un, data).then(r => {
    if (!r.success) return toast(r.message, 'err');
    S.sig = r.data.sig; S.sigKey = r.data.key || ''; const u = (S.m.pengguna || []).find(x => x.username === un); if (u) u.punya_ttd = !!data; persist(); toast(r.message);
    const t = $('mTitle').textContent; if (t === 'Tampilan') openDisplay(); else if (t === 'Ubah Akun') uForm(un); if (S.page === 'pengaturan') pRender();
  }).catch(e => toast(e.message || 'Gagal menyimpan tanda tangan.', 'err'));
}
/* ───────── Komponen UI umum ───────── */
const stPill = (st, label) => '<span class="st ' + esc(st) + '">' + esc(label || st) + '</span>';
function pager(id, total, page, per, cb) {
  const pages = Math.max(1, Math.ceil(total / per)); let b = '';
  const list = pages <= 7 ? [...Array(pages).keys()].map(i => i + 1) : [1, 2, 3, '…', pages];
  list.forEach(n => { b += n === '…' ? '<span>…</span>' : '<button class="' + (n === page ? 'on' : '') + '" onclick="' + cb + '(' + n + ')">' + n + '</button>'; });
  const a = total ? (page - 1) * per + 1 : 0, z = Math.min(total, page * per);
  return '<div class="pg"><span>Menampilkan <b>' + a + '–' + z + '</b> dari <b>' + total + '</b></span><div class="pn"><button ' + (page <= 1 ? 'disabled' : '') + ' onclick="' + cb + '(' + (page - 1) + ')" aria-label="Sebelumnya"><i class="bi bi-chevron-left"></i></button>' + b + '<button ' + (page >= pages ? 'disabled' : '') + ' onclick="' + cb + '(' + (page + 1) + ')" aria-label="Berikutnya"><i class="bi bi-chevron-right"></i></button></div></div>';
}
const emptyBox = (ic, t) => '<div class="empty"><i class="bi ' + ic + '"></i>' + t + '</div>';
function pageHead(t, sub, right, tag) { return '<div class="ph"><div><h1>' + t + (tag ? '<span class="tag">' + tag + '</span>' : '') + '</h1><p>' + sub + '</p></div><div class="row wrap">' + (right || '') + '</div></div>'; }
function downloadCSV(name, rows) {
  const csv = rows.map(r => r.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\n');
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); toast('Berkas ' + name + ' diunduh.'); }
  catch (e) { navigator.clipboard && navigator.clipboard.writeText(csv); toast('Unduhan diblokir browser — CSV disalin ke clipboard.'); }
}
function printHTML(html, cls) { $('printRoot').innerHTML = '<div class="paper ' + (cls || '') + '">' + html + '</div>'; setTimeout(() => window.print(), 60); }
function waLink(no, text) { no = String(no || '').replace(/[^0-9]/g, ''); if (no.indexOf('0') === 0) no = '62' + no.slice(1); return 'https://wa.me/' + no + '?text=' + encodeURIComponent(text); }

/* Pencari siswa (lokal, instan, debounce) */
function stuPicker(id, onPick, scopeFn) {
  return '<div class="search" id="sp_' + id + '"><i class="bi bi-search"></i><input class="in stuq" id="spi_' + id + '" placeholder="Cari nama siswa / NISN…" autocomplete="off" aria-label="Cari siswa" oninput="spFind(\'' + id + '\')" onkeydown="spKey(event,\'' + id + '\')"><span class="kbd hide-m">Ctrl+K</span><div class="drop hide" id="spd_' + id + '"></div></div>';
}
const SP = {};
function spFind(id) {
  clearTimeout(SP[id + 't']); SP[id + 't'] = setTimeout(() => {
    const q = $('spi_' + id).value.trim().toLowerCase(), d = $('spd_' + id);
    if (!q) { d.classList.add('hide'); return; }
    const r = S.m.siswa.filter(s => (s.status_aktif !== 'Nonaktif' || tagihanSiswa(s.id_siswa).some(r => r.sisa > 0)) && (s.nama.toLowerCase().includes(q) || String(s.nisn).includes(q))).slice(0, 8); SP[id] = { r: r, i: 0 };
    d.innerHTML = r.length ? r.map((s, i) => '<button class="' + (i === 0 ? 'act' : '') + '" onmousedown="spPick(\'' + id + '\',' + i + ')"><span class="mono-av" style="width:30px;height:30px;font-size:11px">' + initials(s.nama) + '</span><span class="grow"><b>' + esc(s.nama) + '</b><br><span class="muted sm mono">' + esc(s.nisn) + '</span></span><span class="cls">' + esc(kelasNm(s.id_kelas)) + '</span>' + (s.status_aktif === 'Nonaktif' ? ' <span class="st Sebagian" style="text-transform:none">Alumni/Nonaktif</span>' : '') + '</button>').join('') : '<div class="empty">Siswa tidak ditemukan</div>';
    d.classList.remove('hide');
  }, 90);
}
function spKey(e, id) {
  const st = SP[id]; if (!st) return; const bs = $('spd_' + id).querySelectorAll('button');
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); st.i = (st.i + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length; bs.forEach((b, i) => b.classList.toggle('act', i === st.i)); }
  else if (e.key === 'Enter' && st.r[st.i]) { e.preventDefault(); spPick(id, st.i); }
}
function spPick(id, i) { const s = SP[id].r[i]; $('spd_' + id).classList.add('hide'); $('spi_' + id).value = s.nama; PICK[id] && PICK[id](s); }
const PICK = {};
document.addEventListener('click', e => { if (!e.target.closest('.search')) document.querySelectorAll('.drop').forEach(d => d.classList.add('hide')); });

/* ───────── Navigasi SPA (0 ms) ───────── */
const RENDER = {};
function go(p, opts) {
  const n = NAV.find(x => x.id === p); if (!n || !n.r.includes(S.user.peran) || !modOn(p)) { toast('Halaman tidak tersedia untuk peran Anda.', 'err'); return; }
  S.page = p; document.querySelectorAll('.sec').forEach(s => s.classList.toggle('on', s.id === 's-' + p));
  const pn = n.par || p; document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.p === pn)); setBnavActive(pn);
  $('crumbNow').textContent = n.t; toggleMenu(false);
  if (!S.rendered[p]) { RENDER[p](opts || {}); S.rendered[p] = 1; } else if (RENDER[p].upd) RENDER[p].upd(opts || {});
  window.scrollTo(0, 0); try { localStorage.setItem('sadam_page', p); } catch (e) {}
}
function renderNav() {
  const hasT = S.user.peran !== 'Kepala Madrasah' || true;
  $('nav').innerHTML = NAV.map(n => {
    if (n.g) return (n.sa && S.user.peran !== 'Super Admin') ? '' : '<h6>' + n.g + (n.sa ? '<span class="badge-sa">Super Admin</span>' : '') + '</h6>';
    if (n.hide || !n.r.includes(S.user.peran) || !modOn(n.id)) return '';
    return '<a role="button" tabindex="0" data-p="' + n.id + '" onclick="go(\'' + n.id + '\')" onkeydown="if(event.key===\'Enter\')go(\'' + n.id + '\')"><i class="bi ' + n.i + '"></i><span>' + n.t + '</span>' + (n.badge ? '<span class="pill-n" id="navBadge">0</span>' : '') + (n.badge2 ? '<span class="pill-n hide" id="navBadge2" title="Permintaan reset password">0</span>' : '') + '</a>';
  }).join('');
  $('meNama').textContent = S.user.nama; $('meAv').textContent = initials(S.user.nama); $('meRole').textContent = S.user.peran; renderBnav();
}
/* ───────── Menu bawah (HP) & tab Bayar ───────── */
/** menu bawah per peran, mengikuti hak akses; menu lain lewat tombol ☰ */
const BNAV = { 'Super Admin': ['dashboard', 'pembayaran', 'tagihan', 'rekap', 'pengeluaran'], 'Bendahara': ['dashboard', 'pembayaran', 'tagihan', 'rekap', 'pengeluaran'], 'Kepala Madrasah': ['dashboard', 'tagihan', 'rekap', 'laporan'], 'Wali Kelas': ['dashboard', 'tagihan', 'rekap'] };
const BNAV_LBL = { dashboard: ['Beranda', 'bi-house'], pembayaran: ['Bayar', 'bi-receipt'], tagihan: ['Tagihan', 'bi-exclamation-circle'], rekap: ['Rekap', 'bi-journal-check'], pengeluaran: ['Pengeluaran', 'bi-wallet2'], laporan: ['Laporan', 'bi-file-earmark-text'] };
function renderBnav() {
  let el = $('bnav'); if (!el) { const ap = $('app'); if (!ap || !ap.appendChild) return; el = document.createElement('nav'); el.id = 'bnav'; el.className = 'bnav'; el.setAttribute('aria-label', 'Menu utama'); ap.appendChild(el); }
  const ids = (BNAV[S.user.peran] || []).filter(id => { const n = NAV.find(x => x.id === id); return n && n.r.includes(S.user.peran) && modOn(id); });
  el.innerHTML = ids.map(id => '<a role="button" tabindex="0" data-p="' + id + '" onclick="go(\'' + id + '\')" onkeydown="if(event.key===\'Enter\')go(\'' + id + '\')"><i class="bi ' + BNAV_LBL[id][1] + '"></i><span>' + BNAV_LBL[id][0] + '</span>' + (id === 'tagihan' ? '<span class="pill-n hide" id="bnavBadge">0</span>' : '') + '</a>').join('');
  setBnavActive(S.page); mirrorBadge();
}
function setBnavActive(p) { const n = NAV.find(x => x.id === p), pn = (n && n.par) || p; document.querySelectorAll('#bnav a').forEach(a => a.classList.toggle('on', a.dataset.p === pn)); }
function mirrorBadge() { const a = $('navBadge'), b = $('bnavBadge'); if (a && b) { b.textContent = a.textContent; b.classList.toggle('hide', !(Number(a.textContent) > 0)); } }
/** tab [Tagihan | Seragam] di atas halaman Bayar; siswa terpilih ikut berpindah */
function bayarTabs(aktif) {
  if (!modOn('seragam') || !modOn('pembayaran')) return '';
  const b = (id, t) => '<button role="tab" aria-selected="' + (aktif === id) + '" class="' + (aktif === id ? 'on' : '') + '" onclick="bayarTab(\'' + id + '\')">' + t + '</button>';
  return '<div class="bayar-tabs" role="tablist" aria-label="Jenis transaksi">' + b('pembayaran', 'Tagihan') + b('seragam', 'Seragam') + '</div>';
}
function bayarTab(ke) { const sid = ke === 'seragam' ? P.sid : U.sid; go(ke, sid ? { sid: sid } : undefined); }
function toggleMenu(o) { $('sidebar').classList.toggle('open', o); $('scrim').classList.toggle('on', o); }
function toggleTheme() { setTema(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); closeModal(); }
function setBulan(v) { S.bulan = v; try { localStorage.setItem('sadam_bulan', v); } catch (e) {} Object.keys(S.rendered).forEach(k => delete S.rendered[k]); RENDER[S.page](); S.rendered[S.page] = 1; }
function fillBulan() {
  const d = new Date(), cur = d.getFullYear() + '-' + pad(d.getMonth() + 1); let o = ''; for (let i = 0; i < 14; i++) { const y = prevYm(cur, i); o += '<option value="' + y + '">' + bulanLbl(y) + '</option>'; }
  $('bulanSel').innerHTML = o; if (!S.bulan) S.bulan = cur; $('bulanSel').value = S.bulan;
}

/* ───────── Data lifecycle: SWR (tampil dari cache lokal dulu, segarkan di latar) ───────── */
function applyData(d) {
  S.versiServer = d.versi || ''; setTimeout(cekVersi, 700); S.user = d.user; S.cfg = d.config || {}; S.m = Object.assign({ pengguna: [], keringanan: [] }, d.master); S.live = d.live; S.sig = d.sig || []; S.sigKey = (d.live && d.live.sigKey) || '';
  reindex(); updBadges(); $('taLbl').textContent = 'T.A. ' + (S.cfg.tahunAktif || ''); applyBrand();
}
function saveSnap(d) { try { localStorage.setItem('sadam_snap', JSON.stringify({ u: d.user.username, d: d })); } catch (e) { try { localStorage.removeItem('sadam_snap'); } catch (x) {} } }
function updBadges() { const nb = $('navBadge'); if (nb) nb.textContent = menunggak().length; const n2 = $('navBadge2'); if (n2) { const rr = resetList().length; n2.textContent = rr; n2.classList.toggle('hide', !rr); } mirrorBadge(); }
const resetList = () => (S.live && S.live.reset) || (S.m.pengguna || []).filter(u => u.minta_reset).map(u => u.username);
function softUpdate() { reindex(); updBadges(); Object.keys(S.rendered).forEach(k => { if (k !== S.page) delete S.rendered[k]; }); if (S.page && RENDER[S.page]) { if (RENDER[S.page].upd) RENDER[S.page].upd(); else RENDER[S.page](); } }
function setLive(l) { if (l) { S.live = l; sigSync(); softUpdate(); persist(); } }
function persist() { try { const sn = JSON.parse(localStorage.getItem('sadam_snap') || 'null'); if (sn) { sn.d.live = S.live; sn.d.master = S.m; sn.d.config = S.cfg; sn.d.sig = S.sig; localStorage.setItem('sadam_snap', JSON.stringify(sn)); } } catch (e) {} }
function refreshNow(manual) {
  if (S.pending > 0) return;
  const ae = document.activeElement; if (!manual && ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) && ae.closest && ae.closest('.sec')) return;   // jangan ganggu pengetikan
  api('refreshLive').then(r => { if (r.success) { S.live = r.data; sigSync(); softUpdate(); persist(); if (manual) toast('Data diperbarui.'); } else if (manual) toast(r.message, 'err'); }).catch(() => manual && toast('Gagal menyegarkan (offline?).', 'err'));
}
function start(d, fromCache) {
  applyData(d); renderNav(); fillBulan(); $('login').classList.add('hide');
  $('boot').style.opacity = 0; setTimeout(() => $('boot').classList.add('hide'), 250); $('app').classList.remove('hide');
  let p = ''; try { p = localStorage.getItem('sadam_page') || ''; } catch (e) {}
  const ok = NAV.find(x => x.id === p && x.r && x.r.includes(S.user.peran) && modOn(x.id)); go(ok ? p : 'dashboard');
}
/* ───────── Sesi & login (username + password) ───────── */
const tokStore = {
  get() { try { return localStorage.getItem('sadam_tok') || sessionStorage.getItem('sadam_tok') || ''; } catch (e) { return S.token || ''; } },
  set(t, remember) { try { localStorage.removeItem('sadam_tok'); sessionStorage.removeItem('sadam_tok'); (remember ? localStorage : sessionStorage).setItem('sadam_tok', t); } catch (e) { } S.token = t; },
  clear() { try { localStorage.removeItem('sadam_tok'); sessionStorage.removeItem('sadam_tok'); } catch (e) { } S.token = ''; },
  remembered() { try { return !!localStorage.getItem('sadam_tok'); } catch (e) { return false; } }
};
function tokUser() { try { return JSON.parse(decodeURIComponent(escape(atob(S.token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))))).u; } catch (e) { return ''; } }
function showBoot(on) { const b = $('boot'); if (on) { b.classList.remove('hide'); b.style.opacity = 1; } else { b.style.opacity = 0; setTimeout(() => b.classList.add('hide'), 250); } }
function showLogin(msg, isErr) {
  $('boot').classList.add('hide'); $('app').classList.add('hide'); $('login').classList.remove('hide');
  $('loginInfo').classList.toggle('hide', !msg || isErr); $('loginInfoTxt').textContent = msg || ''; $('loginErr').classList.toggle('hide', !(msg && isErr)); if (isErr) $('loginErr').textContent = msg;
  setTimeout(() => { try { $('lgU').focus(); } catch (e) { } }, 50);
}
function forceLogout(msg) {
  tokStore.clear(); try { ['sadam_snap', 'sadam_draft_pay', 'sadam_page'].forEach(k => localStorage.removeItem(k)); } catch (e) { }
  Object.keys(CH).forEach(k => { try { CH[k].destroy(); } catch (e) { } }); CH = {};
  S.user = null; S.m = { kelas: [], wali: [], siswa: [], jenis: [], tarif: [], seragam: [], tahun: [], pengguna: [], keringanan: [] }; S.live = { tagihan: [], pembayaran: [], pengeluaran: [], kwitansi: [] }; S.rendered = {}; S.page = null; S.audit = null; S.ix = {}; S.sig = []; S.sigKey = '';
  document.querySelectorAll('.sec').forEach(s => { s.innerHTML = ''; s.classList.remove('on'); });
  modalLock = false; closeModal(); showLogin(msg);
}
function doLogout() { closeModal(); forceLogout('Anda telah keluar.'); }
function lupaForm() {
  openModal('Lupa password', '<p class="muted" style="margin-top:0">Masukkan username Anda. Permintaan reset diteruskan ke Super Admin, yang akan memberi Anda password sementara.</p><label class="l" for="lpU">Username</label><input class="in" id="lpU" autocapitalize="none" autocomplete="username" value="' + esc($('lgU').value.trim()) + '" onkeydown="if(event.key===\'Enter\')doLupa()"><div class="note hide" id="lpOk" style="margin:12px 0 0"><i class="bi bi-check-circle"></i><span id="lpTxt"></span></div>', '<button class="btn" onclick="closeModal()">Tutup</button><button class="btn pri" id="lpBtn" onclick="doLupa()">Kirim Permintaan</button>');
}
function doLupa() {
  const u = $('lpU').value.trim(); if (!u) return; const b = $('lpBtn'); b.disabled = true;
  rawApi('mintaReset', u).then(r => { $('lpTxt').textContent = r && r.message ? r.message : 'Permintaan dikirim.'; $('lpOk').classList.remove('hide'); b.textContent = 'Terkirim'; }).catch(() => { b.disabled = false; toast('Tidak dapat terhubung ke server.', 'err'); });
}
function togglePw() { const i = $('lgP'); i.type = i.type === 'password' ? 'text' : 'password'; $('lgEye').className = 'bi ' + (i.type === 'password' ? 'bi-eye' : 'bi-eye-slash'); }
function doLogin() {
  const u = $('lgU').value.trim(), p = $('lgP').value, rem = $('lgR').checked, btn = $('lgBtn'), er = $('loginErr');
  $('loginInfo').classList.add('hide'); er.classList.add('hide');
  if (!u || !p) { er.textContent = 'Isi username dan password.'; er.classList.remove('hide'); return; }
  btn.disabled = true; btn.innerHTML = '<span class="spin" style="width:14px;height:14px;border-width:2px"></span> Memeriksa…';
  rawApi('login', u, p, rem).then(r => {
    btn.disabled = false; btn.textContent = 'Masuk';
    if (!r.success) { er.textContent = r.message; er.classList.remove('hide'); $('lgP').value = ''; $('lgP').focus(); return; }
    tokStore.set(r.data.token, rem); $('lgP').value = ''; $('login').classList.add('hide'); showBoot(true); startSession();
  }).catch(() => { btn.disabled = false; btn.textContent = 'Masuk'; er.textContent = 'Tidak dapat terhubung ke server. Periksa koneksi internet.'; er.classList.remove('hide'); });
}
function applyPublic(d) {
  Object.assign(S.cfg, d); applyBrand();
  $('loginName').textContent = d.appName || 'SADaM'; $('loginSub').textContent = d.appSub || '';
  $('loginLogo').innerHTML = d.logoApp ? '<img src="' + d.logoApp + '" alt="Logo">' : '<i class="bi bi-mortarboard-fill"></i>';
}
function showChangePass(force) {
  modalLock = false; const f = force ? 'true' : 'false';
  openModal(force ? 'Buat Password Baru' : 'Ganti Password', (force ? '<div class="note"><i class="bi bi-shield-lock"></i><span>Demi keamanan, buat password pribadi Anda sebelum memakai aplikasi.</span></div>' : '') +
    '<label class="l" style="margin-top:0" for="cpOld">Password ' + (force ? 'sementara' : 'lama') + '</label><input class="in" type="password" id="cpOld" autocomplete="current-password">' +
    '<label class="l" for="cpNew">Password baru (minimal 8 karakter)</label><input class="in" type="password" id="cpNew" autocomplete="new-password">' +
    '<label class="l" for="cpNew2">Ulangi password baru</label><input class="in" type="password" id="cpNew2" autocomplete="new-password" onkeydown="if(event.key===\'Enter\')doChangePass(' + f + ')"><div class="errmsg hide" id="cpErr"></div>',
    (force ? '<button class="btn" onclick="forceLogout(\'\')">Keluar</button>' : '<button class="btn" onclick="closeModal()">Batal</button>') + '<button class="btn pri" id="cpBtn" onclick="doChangePass(' + f + ')">Simpan Password</button>');
  modalLock = !!force;
}
function doChangePass(force) {
  const o = $('cpOld').value, n = $('cpNew').value, n2 = $('cpNew2').value, er = $('cpErr'), say = m => { er.textContent = m; er.classList.remove('hide'); };
  if (!o || !n) return say('Lengkapi semua kolom.'); if (n.length < 8) return say('Password baru minimal 8 karakter.'); if (n !== n2) return say('Ulangi password tidak sama.');
  const btn = $('cpBtn'); btn.disabled = true;
  rawApi('ubahPassword', S.token, o, n).then(r => {
    btn.disabled = false;
    if (!r.success) { if (r.message === 'SESI_HABIS') return forceLogout('Sesi berakhir. Silakan masuk kembali.'); return say(r.message); }
    tokStore.set(r.data.token, tokStore.remembered()); modalLock = false; closeModal(); toast('Password berhasil diperbarui.'); if (force) { showBoot(true); startSession(); }
  }).catch(() => { btn.disabled = false; say('Tidak dapat terhubung ke server.'); });
}
function startSession() {
  let snap = null, started = false; try { snap = JSON.parse(localStorage.getItem('sadam_snap') || 'null'); } catch (e) { }
  if (snap && snap.d && snap.d.user && snap.u === tokUser()) { start(snap.d, true); started = true; setSync('busy'); }
  api('bootstrap').then(r => {
    if (!r.success) { if (!started) showLogin(r.message, true); else toast(r.message, 'err'); return; }
    if (r.data.mustChange) { $('app').classList.add('hide'); $('boot').classList.add('hide'); showChangePass(true); return; }
    saveSnap(r.data);
    if (!started) start(r.data); else { applyData(r.data); renderNav(); const a = document.querySelector('#nav a[data-p="' + S.page + '"]'); if (a) a.classList.add('on'); softUpdate(); }
  }).catch(e => { setSync('off'); if (!started) { $('boot').innerHTML = '<div class="card denied"><i class="bi bi-wifi-off"></i><h3>Tidak dapat terhubung</h3><p class="muted">' + esc(e.message || e) + '</p><button class="btn pri" onclick="location.reload()">Coba lagi</button></div>'; } });
}
document.addEventListener('DOMContentLoaded', () => {
  try { gasUrl(); } catch (e) { $('boot').innerHTML = '<div class="card denied"><i class="bi bi-gear"></i><h3>Konfigurasi belum lengkap</h3><p class="muted">' + esc(e.message) + '</p></div>'; return; }
  initCekKoneksi(); applyZoom(); try { const th = localStorage.getItem('sadam_theme'); if (th) document.documentElement.dataset.theme = th; S.bulan = localStorage.getItem('sadam_bulan') || ''; } catch (e) { }
  S.token = tokStore.get();
  try { const pub = JSON.parse(localStorage.getItem('sadam_pub') || 'null'); if (pub) applyPublic(pub); } catch (e) { }
  rawApi('infoPublik').then(r => { if (r && r.success) { applyPublic(r.data); try { localStorage.setItem('sadam_pub', JSON.stringify(r.data)); } catch (e) { } } }).catch(() => { });
  if (!S.token) showLogin(); else startSession();
  setInterval(() => { if (!document.hidden && S.user) refreshNow(false); }, 60000);
});

/* ============================================================
 * DASHBOARD
 * ============================================================ */
let CH = {};
RENDER.dashboard = function () {
  const sa = can.bayar();
  $('s-dashboard').innerHTML = fotoBanner() + pageHead('Dashboard Keuangan', 'Tahun Ajaran ' + esc(S.cfg.tahunAktif || '') + ' · Periode ' + bulanLbl(S.bulan),
    sa ? (modOn('seragam') ? '<button class="btn" onclick="go(\'seragam\')"><i class="bi bi-bag"></i>Pembelian Seragam</button>' : '') + (modOn('pengeluaran') ? '<button class="btn" onclick="go(\'pengeluaran\')"><i class="bi bi-wallet2"></i>Catat Pengeluaran</button>' : '') + '<button class="btn pri" onclick="go(\'pembayaran\')"><i class="bi bi-plus-lg"></i>Catat Pembayaran</button>' : '', 'Aktif · Buku Kas Utama') +
    '<div class="grid g4" id="dKpi"></div><div class="grid g-dash" style="margin-top:16px"><div class="card"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><h3>Tren Pemasukan &amp; Pengeluaran</h3><p class="muted sm" style="margin:2px 0 0">Realisasi kas masuk vs belanja madrasah</p></div><div class="legend"><span><i style="background:#1B4332"></i>Pemasukan</span><span><i style="background:#1A73E8"></i>Pengeluaran</span><span><i style="background:#D4A017"></i>Net</span></div></div><div class="chartbox" style="margin-top:12px"><canvas id="cTren" aria-label="Grafik tren pemasukan dan pengeluaran"></canvas></div></div>' +
    '<div class="card"><h3>Komposisi Pemasukan</h3><p class="muted sm" style="margin:2px 0 8px">Realisasi per jenis · ' + bulanLbl(S.bulan) + '</p><div class="chartbox" style="height:200px"><canvas id="cKomp" aria-label="Komposisi pemasukan"></canvas></div><div id="dLeg" style="margin-top:10px"></div></div></div>' +
    '<div class="grid g-bot" style="margin-top:16px' + (can.transaksiTerbaru() ? '' : ';grid-template-columns:1fr') + '">' + (can.transaksiTerbaru() ? '<div class="card tight"><div class="row" style="padding:8px 16px 12px;justify-content:space-between"><div><h3>Pembayaran Terbaru</h3><span class="muted sm">Update real-time loket bendahara</span></div><span class="st Lunas" id="dCnt"></span></div><div class="tw" id="dRecent"></div></div>' : '') + '<div class="card"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><h3>Prioritas Tunggakan per Kelas</h3><span class="muted sm">Aksi penagihan langsung ke wali murid</span></div><span class="st Belum" id="dKrit"></span></div><div id="dPrio" style="margin-top:12px"></div></div></div>';
  RENDER.dashboard.upd();
};
RENDER.dashboard.upd = function () {
  if (!$('dKpi')) return;
  const ym = S.bulan, pm = prevYm(ym), masuk = sumIn(ym), pmasuk = sumIn(pm), keluar = sumOut(ym), pkeluar = sumOut(pm);
  let allIn = 0, allOut = 0; S.live.pembayaran.forEach(p => { if (p.status === 'aktif') allIn += Number(p.jumlah); }); S.live.pengeluaran.forEach(p => { if (p.status === 'aktif') allOut += Number(p.jumlah); });
  const dl = (a, b, inv) => { if (!b) return '<span class="delta inf">Belum ada data bulan lalu</span>'; const v = (a - b) / b * 100; const bad = inv ? v > 0 : v < 0; return '<span class="delta ' + (bad ? 'neg' : '') + '">' + (v >= 0 ? '+' : '') + v.toFixed(1) + '% vs bulan lalu</span>'; };
  const mn = menunggak().length, pi = totalPiutang();
  const k = (c, ic, l, v, f) => '<div class="card kpi ' + c + '"><div class="top"><span>' + l + '</span><span class="ico"><i class="bi ' + ic + '"></i></span></div><div class="val">' + v + '</div>' + f + '</div>';
  $('dKpi').innerHTML = k('', 'bi-cash-stack', 'Pemasukan Bulan Ini', rp(masuk), dl(masuk, pmasuk)) + k('k2', 'bi-graph-down-arrow', 'Pengeluaran Bulan Ini', rp(keluar), dl(keluar, pkeluar, true)) + k('k3', 'bi-bank', 'Saldo Bersih Kas (Net)', rp(allIn - allOut), '<span class="delta ' + (allIn - allOut < 0 ? 'neg' : '') + '">' + (allIn - allOut >= 0 ? 'Surplus' : 'Defisit') + ' · buku kas utama</span>') + k('k4', 'bi-exclamation-lg', 'Tunggakan Aktif <span class="st Belum" style="margin-left:6px">' + mn + ' siswa</span>', rp(pi), '<span class="delta neg">Perlu ditagih</span>');
  // Tren 4 bulan
  const ms = [3, 2, 1, 0].map(i => prevYm(ym, i)), din = ms.map(sumIn), dout = ms.map(sumOut), dark = document.documentElement.dataset.theme === 'dark', tc = dark ? '#93A79C' : '#5F6B64', gc = dark ? '#26352D' : '#E1E8E4';
  if (CH.tren) CH.tren.destroy();
  CH.tren = new Chart($('cTren'), { data: { labels: ms.map(bulanLbl), datasets: [{ type: 'bar', label: 'Pemasukan', data: din, backgroundColor: brandC(), borderRadius: 4, maxBarThickness: 36 }, { type: 'bar', label: 'Pengeluaran', data: dout, backgroundColor: '#1A73E8', borderRadius: 4, maxBarThickness: 36 }, { type: 'line', label: 'Net', data: din.map((v, i) => v - dout[i]), borderColor: '#D4A017', backgroundColor: '#D4A017', tension: .35, pointRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, animation: { duration: 250 }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.dataset.label + ': ' + rp(c.parsed.y) } } }, scales: { x: { ticks: { color: tc }, grid: { display: false } }, y: { beginAtZero: true, suggestedMax: 1000000, ticks: { color: tc, maxTicksLimit: 5, callback: v => fmtK(v) }, grid: { color: gc } } } } });
  // Komposisi
  const comp = {}; S.live.pembayaran.forEach(p => { if (p.status !== 'aktif' || ymOf(p.tanggal) !== ym) return; const t = S.ix.tg[p.id_tagihan]; const n = t ? jenisNm(t.id_jenis) : 'Lainnya'; comp[n] = (comp[n] || 0) + Number(p.jumlah); });
  const names = Object.keys(comp), cols = [brandC(), '#D4A017', '#1A73E8', '#25D366', '#795900', '#86AF99', '#C5221F', '#5F6368'];
  if (CH.komp) CH.komp.destroy();
  CH.komp = new Chart($('cKomp'), { type: 'doughnut', data: { labels: names.length ? names : ['Belum ada data'], datasets: [{ data: names.length ? names.map(n => comp[n]) : [1], backgroundColor: names.length ? cols : ['#E1E8E4'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '68%', animation: { duration: 250 }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.label + ': ' + rp(c.parsed) } } } } });
  $('dLeg').innerHTML = names.length ? names.map((n, i) => '<div class="row sm" style="justify-content:space-between;padding:3px 0"><span><i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:' + cols[i % 8] + ';margin-right:8px"></i>' + esc(n) + '</span><span class="mono">' + rp(comp[n]) + ' <span class="muted">' + Math.round(comp[n] / masuk * 100) + '%</span></span></div>').join('') : '<div class="muted sm">Belum ada pemasukan pada periode ini.</div>';
  // Pembayaran terbaru
  if (can.transaksiTerbaru()) {
  const gk = groupKwitansi().filter(x => x.status === 'aktif').slice(0, 5); $('dCnt').textContent = gk.length + ' Transaksi';
  $('dRecent').innerHTML = gk.length ? '<table class="t"><thead><tr><th>Kwitansi &amp; Siswa</th><th>Alokasi</th><th class="right">Nominal</th><th>Metode</th><th>Status</th></tr></thead><tbody>' + gk.map(x => '<tr style="cursor:pointer" onclick="openKwitansi(\'' + esc(x.no) + '\')"><td><div class="mono sm">' + esc(x.no) + '</div><b>' + esc(x.owner.nama) + '</b> <span class="cls">' + esc(x.owner.kelas) + '</span></td><td>' + esc(x.jenis.join(', ')) + '</td><td class="num">' + rp(x.total) + '</td><td>' + esc(x.metode) + '</td><td>' + stPill('Lunas', 'Tercatat') + '</td></tr>').join('') + '</tbody></table>' : emptyBox('bi-receipt', 'Belum ada pembayaran tercatat.');
  }
  // Prioritas kelas
  const byK = {}; S.m.siswa.forEach(s => { const sd = sisaSiswa(s.id_siswa); if (sd > 0) { const b = byK[s.id_kelas] = byK[s.id_kelas] || { n: 0, sum: 0 }; b.n++; b.sum += sd; } });
  const top = Object.keys(byK).sort((a, b) => byK[b].sum - byK[a].sum).slice(0, 4); $('dKrit').textContent = top.length + ' Kelas Kritis';
  $('dPrio').innerHTML = top.length ? top.map(id => { const k = S.ix.kelas[id], wk = waliKelasOf(k); return '<div class="card" style="padding:12px;background:var(--canvas);margin-bottom:10px;box-shadow:none"><div class="row" style="justify-content:space-between"><div><b>Kelas ' + esc(k.nama_kelas) + '</b> <span class="cls">' + byK[id].n + ' Santri</span><div class="muted sm">Wali: ' + esc(wk ? wk.nama : (k.wali_kelas_email || '—')) + '</div><div class="mono" style="color:var(--tunggak);margin-top:4px">' + rp(byK[id].sum) + '</div></div>' + (can.bayar() ? '<button class="btn wa sm" onclick="go(\'pengingat\',{kelas:\'' + id + '\'})"><i class="bi bi-whatsapp"></i>Kirim WA Massal</button>' : '') + '</div></div>'; }).join('') : emptyBox('bi-emoji-smile', 'Tidak ada tunggakan. Alhamdulillah!');
};

/* ============================================================
 * KWITANSI (pratinjau, cetak, WA)
 * ============================================================ */
function kwitansiHTML(g, forPrint) {
  const c = S.cfg, t0 = S.ix.tg[g.rows[0].id_tagihan] || {}, sw = t0.id_siswa ? S.ix.siswa[t0.id_siswa] : (S.ix.anak[t0.id_wali] || [])[0], wl = sw ? S.ix.wali[sw.id_wali] : S.ix.wali[t0.id_wali];
  const anak = t0.id_wali ? (S.ix.anak[t0.id_wali] || []) : [];
  const rows = kwBaris(g, anak);
  const tot = g.rows.reduce((a, r) => a + Number(r.jumlah), 0);
  return wmHTML() + kopHTML() + '' +
    '<h2>BUKTI PENERIMAAN KAS / KWITANSI PEMBAYARAN</h2><div style="text-align:center;font-size:12px">Nomor: <b>' + esc(g.no) + '</b></div>' + (g.status === 'dibatalkan' ? '<div style="text-align:center"><span class="vd">DIBATALKAN</span></div>' : '') +
    '<table class="meta nb"><tr><td>Telah terima dari</td><td>: ' + esc(t0.donatur ? t0.donatur : (wl ? wl.nama_wali : '-')) + (t0.donatur ? ' (Donatur)' : ' (Wali Murid)') + '</td><td>Tanggal</td><td>: ' + tglPanjang(g.tanggal) + ', ' + jam(g.tanggal) + ' WIB</td></tr>' +
    '<tr><td>Nama Siswa / NISN</td><td>: ' + esc(t0.id_wali && anak.length > 1 ? anak.map(a => a.nama).join(' & ') : (sw ? sw.nama : '-')) + (sw && !(t0.id_wali && anak.length > 1) ? ' (' + esc(sw.nisn) + ')' : '') + '</td><td>Metode</td><td>: ' + esc(String(g.metode).toUpperCase()) + '</td></tr>' +
    '<tr><td>Kelas</td><td>: ' + esc(sw ? kelasNm(sw.id_kelas) : '-') + '</td><td>Tahun Ajaran</td><td>: ' + esc(c.tahunAktif || '') + '</td></tr></table>' +
    '<table><thead><tr><th style="width:30px">No</th><th>Pos Pembiayaan</th><th>Uraian</th><th style="text-align:right">Nominal (Rp)</th></tr></thead><tbody>' + rows + '<tr><td colspan="3" style="text-align:right"><b>JUMLAH TOTAL TERBAYAR</b></td><td class="n"><b>Rp ' + Math.round(tot).toLocaleString('id-ID') + '</b></td></tr></tbody></table>' +
    '<div class="terb">Terbilang: "' + cap(terbilang(tot)) + ' rupiah"</div>' +
    '<table class="nb" style="margin-top:14px"><tr><td style="width:50%;text-align:center;border:0">Penyetor / Wali Murid,<br><br><br><br>(…………………………)</td><td style="width:50%;text-align:center;border:0">Kasir / Penerima,' + sigBlock(g) + '<u>' + esc(g.oleh || '') + '</u><br><small>' + esc(c.bendaharaNip ? 'NIP. ' + c.bendaharaNip : 'Bendahara') + '</small></td></tr></table>' +
    '<div style="font-size:10px;margin-top:10px;border-top:1px solid #000;padding-top:4px">Dicatat oleh ' + esc(g.oleh || '-') + (g.peran ? ' (' + esc(g.peran) + ')' : '') + (g.ubahOleh ? ' · Dikoreksi oleh ' + esc(g.ubahOleh) : '') + ' · Dicetak melalui SADaM · Cetak ulang memakai nomor yang sama.</div>';
}
function waKwitansi(g) {
  const t0 = S.ix.tg[g.rows[0].id_tagihan] || {}, sw = t0.id_siswa ? S.ix.siswa[t0.id_siswa] : (S.ix.anak[t0.id_wali] || [])[0], wl = sw ? S.ix.wali[sw.id_wali] : null; if (!wl) return '';
  const txt = "Assalamu'alaikum Wr. Wb.\nYth. Bapak/Ibu " + wl.nama_wali + " (wali dari " + (sw ? sw.nama : '') + "),\n\nAlhamdulillah, pembayaran administrasi madrasah telah kami terima:\n• No. Kwitansi: " + g.no + "\n• Tanggal: " + tglID(g.tanggal) + " " + jam(g.tanggal) + " WIB\n• Pos: " + g.jenis.join(', ') + "\n• Total: " + rp(g.total) + " (" + g.metode + ")\n\nTerima kasih atas partisipasi dan amanah Bapak/Ibu.\nWassalamu'alaikum Wr. Wb.\nBendahara " + (S.cfg.namaMadrasah || '');
  return waLink(wl.no_whatsapp, txt);
}
function openKwitansi(no) {
  const g = groupKwitansi().find(x => x.no === no); if (!g) return toast('Kwitansi belum tersedia — menunggu sinkronisasi.', 'err');
  const wa = waKwitansi(g);
  openModal('Pratinjau Kwitansi · ' + no, logBar(g) + '<div style="overflow:auto"><div class="paper">' + kwitansiHTML(g) + '</div></div>',
    '<button class="btn" onclick="closeModal()">Tutup</button>' + (can.batal() && g.status === 'aktif' && !isClosedDate(g.tanggal) ? '<button class="btn" onclick="koreksiForm(\'' + esc(no) + '\')"><i class="bi bi-pencil-square"></i>Koreksi</button>' : '') + '' + (can.cetak() ? '<button class="btn" onclick="pdfKwitansi(\'' + esc(no) + '\')"><i class="bi bi-filetype-pdf"></i>Simpan PDF ke Drive</button>' : '') + (wa && can.bayar() ? '<a class="btn wa" href="' + wa + '" target="_blank" rel="noopener"><i class="bi bi-whatsapp"></i>Kirim WA ke Wali</a>' : '') + (S.user.peran === 'Super Admin' && !isClosedDate(g.tanggal) ? '<button class="btn danger" onclick="kwHapusForm(\'' + esc(no) + '\')"><i class="bi bi-trash"></i>Hapus Permanen</button>' : '') + (can.cetak() ? '<button class="btn pri" onclick="cetakKwitansi(\'' + esc(no) + '\')"><i class="bi bi-printer"></i>Cetak Kwitansi (A5)</button>' : ''), true);
}
const PDF_CSS = '<style>table{border-collapse:collapse;width:100%}td,th{border:1px solid #000;padding:4px 6px;font-size:12px;text-align:left}td.n{text-align:right}table.nb td,table.nb th,table.meta td{border:0}.terb{border:1px solid #000;padding:5px;font-style:italic;margin-top:8px}.vd{border:2px solid #000;padding:2px 10px;font-weight:bold}h2{text-align:center;font-size:15px;text-decoration:underline;margin:8px 0 2px}</style>';
function koreksiForm(no) {
  const g = groupKwitansi().find(x => x.no === no); if (!g) return; const opts = metodeList().map(m => m.nama); if (!opts.includes(g.metode)) opts.unshift(g.metode);
  openModal('Koreksi Kwitansi ' + no, '<div class="note" style="background:var(--sebagian-bg)"><i class="bi bi-info-circle"></i><span>Hanya <b>tanggal, metode, dan keterangan</b>. Untuk mengubah nominal/item: batalkan kwitansi lalu input ulang. Perubahan dicatat (siapa &amp; kapan) pada kwitansi dan Log Audit.</span></div><label class="l" for="kTgl">Tanggal bayar</label><input class="in" type="date" id="kTgl" value="' + String(g.tanggal).slice(0, 10) + '"><label class="l" for="kMet">Metode</label><select class="in" id="kMet">' + opts.map(o => '<option ' + (o === g.metode ? 'selected' : '') + '>' + esc(o) + '</option>').join('') + '</select><label class="l" for="kKet">Keterangan</label><input class="in" id="kKet" value="' + esc(String(g.ket || '').split(' | ')[0]) + '"><div class="errmsg hide" id="kErr"></div>', '<button class="btn" onclick="openKwitansi(\'' + esc(no) + '\')">Batal</button><button class="btn pri" id="kBtn" onclick="doKoreksi(\'' + esc(no) + '\')">Simpan Koreksi</button>');
}
function doKoreksi(no) {
  const b = $('kBtn'), er = m => { $('kErr').textContent = m; $('kErr').classList.remove('hide'); }; b.disabled = true;
  api('koreksiKwitansi', no, { tanggal: $('kTgl').value, metode: $('kMet').value, keterangan: $('kKet').value }).then(r => { b.disabled = false; if (!r.success) return er(r.message); setLive(r.data); toast('Kwitansi dikoreksi.'); openKwitansi(no); }).catch(e => { b.disabled = false; er(e.message || 'Gagal menyimpan.'); });
}
function cetakKwitansi(no) { if (!can.cetak()) return toast('Peran Anda hanya dapat melihat kwitansi.', 'err'); const g = groupKwitansi().find(x => x.no === no); if (g) printHTML(kwitansiHTML(g)); }
function pdfKwitansi(no) { if (!can.cetak()) return toast('Peran Anda hanya dapat melihat kwitansi.', 'err');
  const g = groupKwitansi().find(x => x.no === no); if (!g) return;
  toast('Membuat PDF…'); api('simpanPdf', PDF_CSS + '<div style="font-family:Times New Roman,serif;font-size:13px">' + kwitansiHTML(g) + '</div>', no.replace(/\//g, '-')).then(r => r.success ? toast('PDF tersimpan. <a href="' + r.data.url + '" target="_blank" rel="noopener" style="color:#66ff8e">Buka di Drive</a>') : toast(r.message, 'err')).catch(e => toast(e.message, 'err'));
}
function batalDialog(no) {
  openModal('Batalkan Kwitansi ' + no, '<p class="muted">Pembatalan hanya oleh Super Admin dan tercatat di Log Audit. Pembayaran yang dibatalkan tidak dihitung lagi di rekap dan laporan.</p><label class="l" for="alasan">Alasan pembatalan (wajib)</label><textarea class="in" id="alasan" placeholder="Contoh: salah input item tagihan"></textarea><div class="errmsg hide" id="alErr">Alasan minimal 5 karakter.</div>',
    '<button class="btn" onclick="closeModal()">Batal</button><button class="btn danger" id="btnBatal" onclick="doBatal(\'' + esc(no) + '\')"><i class="bi bi-x-octagon"></i>Batalkan Kwitansi</button>');
}
function hapusDialog(no) { openModal('Hapus kwitansi ' + no + '?', '<p class="muted">Soft delete: data tidak hilang permanen dan tercatat di Log Audit. Pembatalan/koreksi formal hanya oleh Super Admin.</p>', '<button class="btn" onclick="closeModal()">Batal</button><button class="btn danger" onclick="doHapus(\'' + no + '\')">Hapus</button>'); }
function doHapus(no) { closeModal(); const snap = clone(S.live.pembayaran); S.live.pembayaran.forEach(p => { if (p.no_kwitansi === no) { p.status = 'dihapus'; p.alasan_batal = 'Dihapus oleh ' + S.user.nama; p.status_oleh = stampMe(); p.status_waktu = nowISO(); } }); softUpdate(); api('hapusKwitansi', no).then(r => { if (r.success) { setLive(r.data); toast('Kwitansi dihapus (soft delete).'); } else { S.live.pembayaran = snap; softUpdate(); toast(r.message, 'err'); } }).catch(e => { S.live.pembayaran = snap; softUpdate(); toast(e.message, 'err'); }); }
function doBatal(no) {
  const a = $('alasan').value.trim(); if (a.length < 5) { $('alErr').classList.remove('hide'); $('alasan').classList.add('err'); return; }
  const snap = clone(S.live.pembayaran); closeModal();
  S.live.pembayaran.forEach(p => { if (p.no_kwitansi === no) { p.status = 'dibatalkan'; p.alasan_batal = a; p.status_oleh = stampMe(); p.status_waktu = nowISO(); } }); softUpdate(); toast('Kwitansi dibatalkan.');
  api('batalkanKwitansi', no, a).then(r => { if (r.success) setLive(r.data); else { S.live.pembayaran = snap; softUpdate(); toast(r.message, 'err'); } }).catch(e => { S.live.pembayaran = snap; softUpdate(); toast(e.message, 'err'); });
}

/* ============================================================
 * PEMBAYARAN (F3) — Optimistic UI + draft autosave + anti-ganda
 * ============================================================ */
const P = { sid: null, sel: {}, suk: [], donor: false, donorNama: '', metode: 'Tunai', idTrx: uuid(), hist: 1, q: '', fm: '', fs: '', last: null, busy: false };
function payDraftSave() { try { localStorage.setItem('sadam_draft_pay', JSON.stringify({ sid: P.sid, sel: P.sel, suk: P.suk, donor: P.donor, donorNama: P.donorNama, metode: P.metode, ket: $('pKet') ? $('pKet').value : '', tgl: $('pTgl') ? $('pTgl').value : '', idTrx: P.idTrx })); } catch (e) {} }
RENDER.pembayaran = function (o) {
  const g = groupKwitansi(), td = todayStr();
  $('s-pembayaran').innerHTML = pageHead('Pencatatan Pembayaran &amp; Kwitansi', 'Kelola pembayaran SPP, infak, seragam, dan pembiayaan madrasah dengan cetak kwitansi instan.', '<span class="chip"><i class="bi bi-receipt"></i>Hari ini: <b id="pHari">0</b></span>' + (S.user.peran === 'Super Admin' ? '<span class="chip"><i class="bi bi-shield-check"></i>Mode Super Admin</span>' : '<span class="chip"><i class="bi bi-shield-check"></i>Mode Bendahara</span>'), 'POS AKTIF') + bayarTabs('pembayaran') +
    '<div class="grid g-main"><div><div class="card"><div class="row" style="justify-content:space-between"><h3><span class="mono-av" style="display:inline-grid;width:24px;height:24px;font-size:12px;margin-right:8px;vertical-align:middle">1</span>Entri Kasir Pembayaran</h3><span class="mono sm muted">FORM-REV-4</span></div>' +
    '<label class="l">Cari Siswa Terdaftar / NISN</label>' + stuPicker('pay') + '<label class="chk hide" id="pDonLbl"><input type="checkbox" id="pDonor" onchange="setDonor(this.checked)"> Donatur luar (bukan siswa/wali)</label><div id="pDonBox" class="hide"><input class="in" id="pDonNama" placeholder="Nama donatur, mis. Hamba Allah" oninput="P.donorNama=this.value;payDraftSave()"></div><div id="pStu"></div><div id="pBills"></div><div id="pSuk"></div>' +
    '<div class="grid g2"><div><label class="l" for="pTgl">Tanggal Bayar</label><input class="in" type="date" id="pTgl" value="' + td + '" oninput="payDraftSave()"></div><div><label class="l">Total Dibayar</label><div class="in mono" id="pTotal" style="display:flex;align-items:center;justify-content:flex-end;background:var(--canvas);font-weight:600">Rp 0</div></div></div>' +
    '<div class="hint" id="pHint">Pilih item tagihan. Jumlah tiap item dapat diubah untuk cicilan; sisa dihitung otomatis.</div>' +
    '<label class="l">Metode Pembayaran</label><div class="seg" id="mSeg"></div><div id="mInfo" style="margin-top:8px"></div>' +
    '<label class="l" for="pKet">Keterangan Kwitansi</label><input class="in" id="pKet" placeholder="Contoh: Lunas SPP Okt & LKS" oninput="payDraftSave()">' +
    '<button class="btn pri lg" id="pSave" style="margin-top:18px" onclick="savePay()"><i class="bi bi-receipt"></i>Simpan Pembayaran &amp; Siapkan Kwitansi</button><div class="row sm muted" style="justify-content:space-between;margin-top:8px"><a role="button" onclick="payReset(true)" style="cursor:pointer"><i class="bi bi-arrow-counterclockwise"></i> Reset Form Entri</a><span class="mono" id="pDraft">Auto-save draft</span></div></div>' +
    '<div class="card hide" id="pLast" style="margin-top:16px"></div></div>' +
    '<div><div class="card tight"><div class="row" style="padding:8px 16px 12px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap"><div><h3>Riwayat Transaksi &amp; Kwitansi</h3><span class="muted sm">Rekapitulasi bukti bayar &amp; audit pembatalan</span></div><div class="row" style="gap:8px"><span class="st Wali" id="pCnt"></span>' + (S.user.peran === 'Super Admin' ? '<button class="btn sm danger" onclick="kbForm()" title="Hapus transaksi uji coba"><i class="bi bi-trash"></i>Bersihkan data uji</button>' : '') + '</div></div>' +
    '<div class="row wrap" style="padding:0 16px 12px"><div class="search grow" style="min-width:160px"><i class="bi bi-search"></i><input class="in" id="hQ" placeholder="Cari no. kwitansi / siswa…" oninput="hFilter()"></div><select class="in" id="hM" style="width:auto" onchange="hFilter()"><option value="">Semua metode</option>' + metodeFilterOpts() + '</select><select class="in" id="hS" style="width:auto" onchange="hFilter()"><option value="">Semua status</option><option value="aktif">Aktif</option><option value="dibatalkan">Dibatalkan</option><option value="dihapus">Dihapus</option></select></div><div class="tw" id="pHist"></div><div id="pPg"></div></div>' +
    '<div class="grid g3" style="margin-top:16px" id="pSum"></div></div></div>';
  setMetode(P.metode, true);
  PICK.pay = s => { pickSiswa(s.id_siswa); };
  // pulihkan draft
  try { const d = JSON.parse(localStorage.getItem('sadam_draft_pay') || 'null'); if (d && d.sid && S.ix.siswa[d.sid]) { P.idTrx = d.idTrx || P.idTrx; pickSiswa(d.sid, d.sel); P.metode = d.metode || 'Tunai'; setMetode(P.metode, true); $('pKet').value = d.ket || ''; if (d.tgl) $('pTgl').value = d.tgl; $('spi_pay').value = S.ix.siswa[d.sid].nama; } } catch (e) {}
  if (o && o.sid) pickSiswa(o.sid);
  try { const d = JSON.parse(localStorage.getItem('sadam_draft_pay') || 'null'); if (d) { if (Array.isArray(d.suk)) P.suk = d.suk.filter(x => sukJenis().some(jj => jj.id_jenis === x.id_jenis)); if (d.donor && sukJenis().length) { P.donor = true; P.donorNama = d.donorNama || ''; $('pDonor').checked = true; $('pDonBox').classList.remove('hide'); $('pDonNama').value = P.donorNama; } } } catch (e) {}
  renderSuk(); calcTotal();
  RENDER.pembayaran.upd();
};
RENDER.pembayaran.upd = function (o) {
  if (!$('pHist')) return; const g = groupKwitansi(), td = todayStr();
  const hari = g.filter(x => x.status === 'aktif' && String(x.tanggal).slice(0, 10) === td); $('pHari').textContent = hari.length + ' Transaksi · ' + rp(hari.reduce((a, x) => a + x.total, 0));
  const tun = hari.filter(x => metodeTipe(x.metode) === 'tunai'), trf = hari.filter(x => metodeTipe(x.metode) !== 'tunai'), btl = g.filter(x => x.status === 'dibatalkan').length;
  $('pSum').innerHTML = [['Kas Tunai Masuk', tun.reduce((a, x) => a + x.total, 0), tun.length + ' Transaksi', 'bi-wallet2', ''], ['Transfer Bank Terverifikasi', trf.reduce((a, x) => a + x.total, 0), trf.length + ' Transaksi', 'bi-arrow-left-right', ''], ['Kwitansi Dibatalkan', btl + ' Lembar', btl ? 'Terkoreksi Kasir' : 'Tidak ada', 'bi-x-circle', 'color:var(--tunggak)']].map(c => '<div class="card"><div class="muted sm">' + c[0] + '</div><div class="mono" style="font-size:18px;font-weight:600;margin:6px 0;' + c[4] + '">' + (typeof c[1] === 'number' ? rp(c[1]) : c[1]) + '</div><div class="sm ' + (c[4] ? '' : 'muted') + '" style="' + c[4] + '"><i class="bi ' + c[3] + '"></i> ' + c[2] + '</div></div>').join('');
  hFilter(1); if (o && o.sid) pickSiswa(o.sid); else if (P.sid) renderBills(); 
};
function hFilter(pg) { P.hist = pg || 1; P.q = ($('hQ') || {}).value || ''; P.fm = ($('hM') || {}).value || ''; P.fs = ($('hS') || {}).value || ''; renderHist(); }
function renderHist() {
  let g = groupKwitansi(); const q = P.q.toLowerCase();
  g = g.filter(x => (!q || x.no.toLowerCase().includes(q) || x.owner.nama.toLowerCase().includes(q)) && (!P.fm || x.metode === P.fm) && (!P.fs || x.status === P.fs));
  $('pCnt').textContent = g.length + ' Data'; const per = 8, rows = g.slice((P.hist - 1) * per, P.hist * per);
  $('pHist').innerHTML = rows.length ? '<table class="t"><thead><tr><th>No. Kwitansi</th><th>Tanggal</th><th>Siswa / Kelas</th><th>Jenis Pos</th><th class="right">Jumlah</th><th>Metode</th><th>Petugas</th><th class="right">Aksi</th></tr></thead><tbody>' + rows.map(x => '<tr class="' + (x.status !== 'aktif' ? 'void' : '') + '"><td class="id">' + esc(x.no) + '</td><td class="mono sm">' + tglID(x.tanggal).slice(0, 5) + '<br>' + jam(x.tanggal) + '</td><td><b>' + esc(x.owner.nama) + '</b><br><span class="muted sm">Kelas ' + esc(x.owner.kelas) + '</span></td><td>' + esc(x.jenis.join(' + ')) + (x.status !== 'aktif' ? '<br><span class="sm" style="color:var(--tunggak)">Alasan: ' + esc(x.alasan) + '</span>' : '') + '</td><td class="num">' + rp(x.total) + '</td><td>' + esc(x.metode) + '</td><td class="sm">' + petugasHTML(x) + '</td><td class="right nowrap"><button class="btn sm" onclick="openKwitansi(\'' + esc(x.no) + '\')" aria-label="Lihat kwitansi"><i class="bi bi-eye"></i></button> ' + (can.batal() && x.status === 'aktif' && !isClosedDate(x.tanggal) ? '<button class="btn sm danger" onclick="batalDialog(\'' + esc(x.no) + '\')" aria-label="Batalkan"><i class="bi bi-x-octagon"></i></button>' : '') + (S.user.peran === 'Bendahara' && x.status === 'aktif' && !isClosedDate(x.tanggal) ? '<button class="btn sm danger" onclick="hapusDialog(\'' + esc(x.no) + '\')" aria-label="Hapus"><i class="bi bi-trash"></i></button>' : '') + (isClosedDate(x.tanggal) ? ' <i class="bi bi-lock-fill muted" title="Buku bulan ' + esc(String(x.tanggal).slice(0, 7)) + ' sudah ditutup"></i>' : '') + '</td></tr>').join('') + '</tbody></table>' : emptyBox('bi-inbox', 'Belum ada transaksi.');
  $('pPg').innerHTML = pager('h', g.length, P.hist, per, 'hFilter');
}
function setMetode(m, silent) { const L = metodeList(); P.metode = typeof m === 'number' ? (L[m] || L[0]).nama : m; if (!L.some(x => x.nama === P.metode)) P.metode = L[0].nama; $('mSeg').innerHTML = metodeBtns(P.metode, 'setMetode'); $('mInfo').innerHTML = metodeInfo(P.metode, 'P.sid'); if (!silent) payDraftSave(); }
function pickSiswa(sid, sel) {
  const s = S.ix.siswa[sid]; if (!s) return; if (P.donor) { P.donor = false; const dc = $('pDonor'); if (dc) dc.checked = false; $('pDonBox').classList.add('hide'); } P.sid = sid; P.sel = sel || {}; const w = S.ix.wali[s.id_wali], anak = S.ix.anak[s.id_wali] || [];
  const perWali = tagihanSiswa(sid).some(r => r.perWali && r.sisa > 0);
  $('pStu').innerHTML = '<div class="stu"><div class="mono-av">' + initials(s.nama) + '</div><div class="grow"><b>' + esc(s.nama) + '</b> <span class="cls">Kelas ' + esc(kelasNm(s.id_kelas)) + '</span><div class="mono sm muted">NISN: ' + esc(s.nisn) + '</div><div class="sm" style="margin-top:4px"><i class="bi bi-people"></i> Wali: <b>' + esc(w ? w.nama_wali : '-') + '</b> · <span class="mono">+' + esc(w ? w.no_whatsapp : '') + '</span></div></div></div>' + (anak.length > 1 && perWali ? '<div class="auto"><b><i class="bi bi-diagram-3"></i> Aturan Otomatis: Per-Wali Multi-Anak</b><br>Wali ini memiliki ' + anak.length + ' anak terdaftar (' + anak.map(a => esc(a.nama) + ' – ' + esc(kelasNm(a.id_kelas))).join(' &amp; ') + '). Infak/khataman ditagih sekali dan otomatis tertutup untuk semua anak.</div>' : '');
  renderBills(); payDraftSave();
}
function renderBills() {
  const box = $('pBills'); if (P.donor) { box.innerHTML = ''; calcTotal(); return; } const bs = tagihanSiswa(P.sid).filter(r => r.sisa > 0).sort(urutTagihan);
  Object.keys(P.sel).forEach(id => { if (!bs.find(r => r.t.id_tagihan === id)) delete P.sel[id]; });
  box.innerHTML = '<label class="l">Pilih Item Tagihan Yang Dibayar <a style="float:right;cursor:pointer;color:var(--primary)" onclick="selAll()">Pilih Semua (' + bs.length + ')</a></label>' + bayarMuka(bs) + (bs.length ? bs.map(r => { const id = r.t.id_tagihan, on = id in P.sel; return '<div class="bill ' + (on ? 'sel' : '') + '"><input type="checkbox" id="c_' + id + '" ' + (on ? 'checked' : '') + ' onchange="togBill(\'' + id + '\',' + r.sisa + ')" aria-label="Pilih ' + esc(tagNama(r.t)) + '"><label for="c_' + id + '" class="grow" style="cursor:pointer"><b>' + esc(tagNama(r.t)) + '</b> ' + (r.perWali ? '<span class="st Wali">Per-Wali</span>' : '') + '<br><span class="muted sm">Tagihan ' + rp(r.t.nominal) + ' · Sisa <span class="mono">' + rp(r.sisa) + '</span></span></label><input class="in amt" inputmode="numeric" ' + (on ? '' : 'disabled') + ' id="a_' + id + '" value="' + (on ? P.sel[id].toLocaleString('id-ID') : '') + '" oninput="amtChg(\'' + id + '\',' + r.sisa + ')" aria-label="Jumlah dibayar"></div>'; }).join('') : emptyBox('bi-check2-circle', P.sid ? 'Tidak ada tagihan terbuka untuk siswa ini.' : 'Pilih siswa terlebih dahulu.')); calcTotal();
}
const sukJenis = () => S.m.jenis.filter(jj => jj.sifat === 'sukarela' && jj.status_aktif !== 'Nonaktif');
function renderSuk() {
  const L = sukJenis(), box = $('pSuk'); if (!box) return; const lb = $('pDonLbl'); if (lb) lb.classList.toggle('hide', !L.length);
  if (!L.length) { box.innerHTML = ''; P.suk = []; return; }
  box.innerHTML = '<label class="l">Infak sukarela <span class="muted sm" style="font-weight:400">(opsional · nominal bebas)</span></label>' + P.suk.map((x, i) => '<div class="bill sel" style="align-items:center"><select class="in grow" aria-label="Jenis infak" onchange="sukSet(' + i + ',\'id_jenis\',this.value)">' + L.map(jj => '<option value="' + jj.id_jenis + '" ' + (x.id_jenis === jj.id_jenis ? 'selected' : '') + '>' + esc(jj.nama) + '</option>').join('') + '</select><input class="in amt" inputmode="numeric" placeholder="0" value="' + (x.jml ? x.jml.toLocaleString('id-ID') : '') + '" oninput="sukAmt(' + i + ',this)" aria-label="Nominal infak"><button class="btn sm danger" onclick="sukDel(' + i + ')" aria-label="Hapus baris"><i class="bi bi-x-lg"></i></button></div>').join('') + '<button class="btn sm" onclick="sukAdd()"><i class="bi bi-plus-lg"></i>Tambah infak sukarela</button>';
}
function sukAdd() { const L = sukJenis(); if (!L.length) return; if (P.suk.length >= 10) return toast('Maksimal 10 baris.', 'err'); P.suk.push({ id_jenis: L[0].id_jenis, jml: 0 }); renderSuk(); calcTotal(); payDraftSave(); }
function sukDel(i) { P.suk.splice(i, 1); renderSuk(); calcTotal(); payDraftSave(); }
function sukSet(i, k, v) { P.suk[i][k] = v; payDraftSave(); }
function sukAmt(i, el) { const v = num(el.value); P.suk[i].jml = v; el.value = v ? v.toLocaleString('id-ID') : ''; calcTotal(); payDraftSave(); }
function setDonor(on) { P.donor = on; $('pDonBox').classList.toggle('hide', !on); if (on) { P.sid = null; P.sel = {}; $('pStu').innerHTML = ''; $('spi_pay').value = ''; if (!P.suk.length) P.suk.push({ id_jenis: sukJenis()[0].id_jenis, jml: 0 }); } renderBills(); renderSuk(); calcTotal(); payDraftSave(); }
const jenisBulanan = () => S.m.jenis.filter(jj => jj.sifat !== 'sukarela' && jj.periode === 'bulanan' && jj.basis_tagihan === 'per siswa' && jj.status_aktif !== 'Nonaktif' && jj.id_jenis !== 'J-SRG');
/** pilihan cepat (semester ganjil/genap/semua) dan tombol "bayar di muka" di atas daftar tagihan */
function bayarMuka(bs) {
  if (!P.sid) return ''; const out = [], jb = jenisBulanan(), by = {};
  bs.forEach(r => { if (isBln(r.t.periode) && !r.perWali && jb.some(jj => jj.id_jenis === r.t.id_jenis)) (by[r.t.id_jenis] = by[r.t.id_jenis] || []).push(r); });
  Object.keys(by).forEach(jid => { const mine = by[jid], gj = mine.filter(r => +r.t.periode.slice(5) >= 7).length, gn = mine.length - gj; if (mine.length < 2) return;
    out.push('<span class="muted sm">Pilih cepat ' + esc(jenisNm(jid)) + ':</span>' + (gj ? '<button class="btn sm" onclick="selSem(\'' + jid + '\',\'ganjil\')">Sem. ganjil (' + gj + ')</button>' : '') + (gn ? '<button class="btn sm" onclick="selSem(\'' + jid + '\',\'genap\')">Sem. genap (' + gn + ')</button>' : '') + '<button class="btn sm" onclick="selSem(\'' + jid + '\',\'semua\')">Semua (' + mine.length + ')</button>'); });
  if (jb.length && can.bayar()) out.push('<button class="btn sm" onclick="dmForm()"><i class="bi bi-calendar-plus"></i>Tagih bulan berikutnya (bayar di muka)</button>');
  return out.length ? '<div class="row wrap" style="gap:6px;margin:4px 0 8px">' + out.join('') + '</div>' : '';
}
function selSem(jid, sem) {
  tagihanSiswa(P.sid).filter(r => r.sisa > 0 && r.t.id_jenis === jid && isBln(r.t.periode) && !r.perWali).forEach(r => { const m = +r.t.periode.slice(5); if (sem === 'semua' || (sem === 'ganjil' ? m >= 7 : m <= 6)) P.sel[r.t.id_tagihan] = r.sisa; });
  renderBills(); payDraftSave();
}
const dmAkhirTA = ym => { const ta = taOf(ym); return ta ? ta.slice(5) + '-06' : ym; };
function dmForm() {
  const jb = jenisBulanan(); if (!P.sid || !jb.length) return; const jid0 = (jb.find(x => x.id_jenis === 'J-SPP') || jb[0]).id_jenis;
  const ada = tagihanSiswa(P.sid).filter(r => r.t.id_jenis === jid0 && isBln(r.t.periode)).map(r => r.t.periode).sort(), last = ada[ada.length - 1];
  const nx = last ? (() => { let y = +last.slice(0, 4), m = +last.slice(5) + 1; if (m > 12) { m = 1; y++; } return y + '-' + ('0' + m).slice(-2); })() : (S.bulan || '');
  const sd = dmAkhirTA(nx) >= nx ? dmAkhirTA(nx) : nx;
  openModal('Tagih bulan berikutnya (bayar di muka)', '<p class="muted" style="margin-top:0">Untuk siswa yang membayar <b>satu semester / setahun di awal</b>: sistem membuat tagihan bulan-bulan yang belum ada (sesuai tarif kelas dan keringanan), lalu otomatis dicentang agar bisa langsung dibayar dalam <b>satu kwitansi</b>.</p><label class="l" for="dmJ">Jenis iuran</label><select class="in" id="dmJ">' + jb.map(x => '<option value="' + x.id_jenis + '" ' + (x.id_jenis === jid0 ? 'selected' : '') + '>' + esc(x.nama) + '</option>').join('') + '</select><div class="grid g2"><div><label class="l" for="dmDari">Dari bulan</label><input class="in" type="month" id="dmDari" value="' + nx + '" oninput="dmInfo()"></div><div><label class="l" for="dmSampai">Sampai bulan</label><input class="in" type="month" id="dmSampai" value="' + sd + '" oninput="dmInfo()"></div></div><div class="row wrap" style="gap:6px;margin-top:8px"><button class="btn sm" type="button" onclick="dmPreset(\'ta\')">Sisa tahun ajaran</button><button class="btn sm" type="button" onclick="dmPreset(\'ganjil\')">Sampai Desember</button><button class="btn sm" type="button" onclick="dmPreset(\'genap\')">Sampai Juni</button><button class="btn sm" type="button" onclick="dmPreset(\'12\')">12 bulan</button></div><div id="dmInfo" class="hint" style="margin-top:10px"></div><div class="errmsg hide" id="dmErr"></div>',
    '<button class="btn" onclick="closeModal()">Batal</button><button class="btn pri" id="dmGo" onclick="dmGo()"><i class="bi bi-calendar-plus"></i>Buat tagihan</button>'); dmInfo();
}
function dmBulan() { const a = $('dmDari').value, b = $('dmSampai').value, out = []; if (!/^\d{4}-\d{2}$/.test(a) || !/^\d{4}-\d{2}$/.test(b) || a > b) return out; let y = +a.slice(0, 4), m = +a.slice(5); while ((y + '-' + ('0' + m).slice(-2)) <= b && out.length < 25) { out.push(y + '-' + ('0' + m).slice(-2)); m++; if (m > 12) { m = 1; y++; } } return out; }
function dmPreset(k) {
  const a = $('dmDari').value; if (!/^\d{4}-\d{2}$/.test(a)) return; let y = +a.slice(0, 4), m = +a.slice(5), e;
  if (k === 'ta') e = dmAkhirTA(a); else if (k === 'ganjil') e = (m >= 7 ? y : y) + '-12'; else if (k === 'genap') e = (m >= 7 ? y + 1 : y) + '-06'; else { let yy = y, mm = m + 11; yy += Math.floor((mm - 1) / 12); mm = ((mm - 1) % 12) + 1; e = yy + '-' + ('0' + mm).slice(-2); }
  $('dmSampai').value = e < a ? a : e; dmInfo();
}
function dmInfo() {
  const L = dmBulan(), e = $('dmInfo'), jid = $('dmJ').value; if (!e) return; if (!L.length) { e.textContent = 'Pilih rentang bulan yang valid.'; return; }
  const ada = new Set(tagihanSiswa(P.sid).filter(r => r.t.id_jenis === jid).map(r => r.t.periode)), baru = L.filter(x => !ada.has(x));
  e.innerHTML = '<b>' + L.length + ' bulan</b> (' + rentangBln(L) + ') · ' + baru.length + ' tagihan baru akan dibuat' + (L.length - baru.length ? ', ' + (L.length - baru.length) + ' sudah ada' : '') + (L.length > 12 ? ' · <span style="color:var(--tunggak)">maksimal 12 bulan</span>' : '') + '.';
}
function dmGo() {
  const L = dmBulan(), er = m => { $('dmErr').textContent = m; $('dmErr').classList.remove('hide'); }; if (!L.length) return er('Pilih rentang bulan yang valid.'); if (L.length > 12) return er('Maksimal 12 bulan sekaligus.');
  const jid = $('dmJ').value, b = $('dmGo'); b.disabled = true;
  api('buatTagihanDimuka', P.sid, jid, L[0], L[L.length - 1]).then(r => {
    b.disabled = false; if (!r.success) return er(r.message); setLive(r.data.live); closeModal();
    tagihanSiswa(P.sid).filter(x => x.t.id_jenis === jid && isBln(x.t.periode) && x.t.periode >= L[0] && x.t.periode <= L[L.length - 1] && x.sisa > 0 && !x.perWali).forEach(x => { P.sel[x.t.id_tagihan] = x.sisa; });
    renderBills(); payDraftSave(); toast(r.message + (Object.keys(P.sel).length ? ' Sudah dicentang — periksa tanggal & metode, lalu Simpan.' : ''));
  }).catch(e => { b.disabled = false; er(e.message || 'Gagal.'); });
}
function togBill(id, sisa) { if ($('c_' + id).checked) P.sel[id] = sisa; else delete P.sel[id]; renderBills(); payDraftSave(); }
function selAll() { tagihanSiswa(P.sid).filter(r => r.sisa > 0).forEach(r => P.sel[r.t.id_tagihan] = r.sisa); renderBills(); payDraftSave(); }
function amtChg(id, sisa) { let v = num($('a_' + id).value); if (v > sisa) { v = sisa; toast('Jumlah dibatasi sampai sisa tagihan.', 'err'); } P.sel[id] = v; $('a_' + id).value = v ? v.toLocaleString('id-ID') : ''; calcTotal(); payDraftSave(); }
function calcTotal() { const t = Object.values(P.sel).reduce((a, b) => a + b, 0) + P.suk.reduce((a, x) => a + (x.jml || 0), 0); $('pTotal').textContent = rp(t); return t; }
function payReset(ask) { P.sid = null; P.sel = {}; P.suk = []; P.donor = false; P.donorNama = ''; { const dc = $('pDonor'); if (dc) dc.checked = false; const db = $('pDonBox'); if (db) db.classList.add('hide'); const dn = $('pDonNama'); if (dn) dn.value = ''; } P.idTrx = uuid(); $('spi_pay').value = ''; $('pStu').innerHTML = ''; $('pKet').value = ''; try { localStorage.removeItem('sadam_draft_pay'); } catch (e) {} renderBills(); renderSuk(); }
function savePay() {
  if (P.busy) return; const items = Object.keys(P.sel).filter(id => P.sel[id] > 0).map(id => ({ id_tagihan: id, bayar: P.sel[id] }));
  const suk = P.suk.filter(x => x.jml > 0).map(x => ({ id_jenis: x.id_jenis, jumlah: x.jml }));
  if (!P.sid && !P.donor) return toast('Pilih siswa terlebih dahulu.', 'err'); if (P.donor && !P.donorNama.trim()) return toast('Isi nama donatur.', 'err'); if (!items.length && !suk.length) return toast('Pilih minimal satu item tagihan atau isi infak sukarela.', 'err');
  if (isClosedDate($('pTgl').value)) return toast('Buku bulan ' + String($('pTgl').value).slice(0, 7) + ' sudah ditutup. Pilih tanggal di bulan yang masih terbuka.', 'err');
  P.busy = true; $('pSave').disabled = true;
  const payload = { idTrx: P.idTrx, idSiswa: P.donor ? '' : P.sid, tanggal: $('pTgl').value, metode: P.metode, keterangan: $('pKet').value.trim(), items: items, sukarela: suk, donatur: P.donor ? P.donorNama.trim() : '' };
  // 1) UPDATE UI INSTAN (optimistik)
  const snap = clone(S.live), tmpNo = 'Menyimpan…', now = payload.tanggal + 'T' + nowHM() + ':00', total = items.reduce((a, i) => a + i.bayar, 0) + suk.reduce((a, x) => a + x.jumlah, 0), sidNow = P.sid;
  items.forEach(i => S.live.pembayaran.push({ id_pembayaran: 'tmp', tanggal: now, id_tagihan: i.id_tagihan, jumlah: i.bayar, metode: P.metode, keterangan: payload.keterangan, dicatat_oleh: S.user.nama, oleh_username: S.user.username, oleh_peran: S.user.peran, oleh_waktu: now, status: 'aktif', no_kwitansi: tmpNo, id_trx: P.idTrx }));
  softUpdate(); showLast({ pending: true, total: total, metode: P.metode });
  payReset(); toast('Pembayaran disimpan (menyinkronkan…)');
  // 2) SINKRON LATAR BELAKANG
  api('simpanPembayaran', payload).then(r => {
    P.busy = false; $('pSave') && ($('pSave').disabled = false);
    if (r.success) { if (r.data.live) { S.live = r.data.live; softUpdate(); persist(); } showLast({ no: r.data.noKwitansi, total: r.data.total || total, metode: payload.metode }); }
    else { S.live = snap; softUpdate(); $('pLast').classList.add('hide'); toast(r.message, 'err'); }
  }).catch(e => { P.busy = false; $('pSave') && ($('pSave').disabled = false); S.live = snap; softUpdate(); $('pLast').classList.add('hide'); toast('Gagal menyimpan: ' + (e.message || e) + '. Data dikembalikan, coba lagi.', 'err'); });
}
function showLast(x) {
  const b = $('pLast'); if (!b) return; b.classList.remove('hide');
  if (x.pending) { b.innerHTML = '<div class="row"><div class="spin" style="width:22px;height:22px;border-width:2px"></div><div><b>Menyimpan transaksi…</b><div class="muted sm">' + rp(x.total) + ' (' + esc(x.metode) + ') — kwitansi segera siap.</div></div></div>'; return; }
  const g = groupKwitansi().find(k => k.no === x.no), wa = g ? waKwitansi(g) : '';
  b.innerHTML = '<div class="row"><i class="bi bi-check-circle-fill" style="font-size:26px;color:var(--lunas)"></i><div><b>Transaksi Terakhir Berhasil Disimpan</b><div class="sm muted">No. <span class="mono">' + esc(x.no) + '</span> · <span class="mono">' + rp(x.total) + '</span> (' + esc(x.metode) + ')</div></div></div><div class="row wrap" style="margin-top:12px"><button class="btn pri" onclick="openKwitansi(\'' + esc(x.no) + '\')"><i class="bi bi-printer"></i>Cetak Kwitansi Resmi</button>' + (wa ? '<a class="btn wa" href="' + wa + '" target="_blank" rel="noopener"><i class="bi bi-whatsapp"></i>Kirim WA ke Wali</a>' : '') + '</div>';
}


/* ============================================================
 * SERAGAM (F4) — item per (nama, bagian), total otomatis
 * ============================================================ */
const U = { sid: null, pick: {}, metode: 'Tunai', lunas: true, idTrx: uuid() };
function seragamGroups() { const g = {}; S.m.seragam.forEach(i => { (g[i.nama] = g[i.nama] || []).push(i); }); return g; }
RENDER.seragam = function (o) {
  $('s-seragam').innerHTML = pageHead('Transaksi Pembelian Seragam', 'Pembelian dapat dipilih Set Lengkap, Atas Saja, atau Bawah Saja sesuai kebutuhan.', '', 'Logistik & Perlengkapan Siswa') + bayarTabs('seragam') +
    '<div class="grid g-main" style="grid-template-columns:7fr 4fr"><div><div class="card"><h3>1. Identifikasi Siswa Pemesan</h3><div class="muted sm" style="margin-bottom:8px">Pilih siswa untuk asosiasi kwitansi dan audit logistik</div>' + stuPicker('srg') + '<div id="uStu"></div></div>' +
    '<div class="card" style="margin-top:16px"><h3>2. Pilih Item &amp; Kombinasi Potongan</h3><div class="tw" id="uItems" style="margin-top:8px"></div></div>' +
    '<div class="card" style="margin-top:16px"><h3>3. Pembayaran &amp; Catatan</h3><label class="l">Metode</label><div class="seg" id="uSeg"></div><div id="uInfo" style="margin-top:8px"></div>' +
    '<label class="l">Status Pelunasan</label><div class="seg"><button id="uLns" onclick="uLunas(true)"><b>Lunas Langsung</b></button><button id="uCic" onclick="uLunas(false)"><b>Cicilan / DP</b></button></div><div id="uDpBox" class="hide"><label class="l" for="uDp">Jumlah dibayar sekarang (Rp)</label><input class="in money" id="uDp" inputmode="numeric" oninput="this.value=num(this.value).toLocaleString(\'id-ID\');uCalc()"></div><label class="l" for="uKet">Catatan transaksi</label><textarea class="in" id="uKet" placeholder="Contoh: pengganti karena kekecilan"></textarea></div></div>' +
    '<div><div class="card" style="position:sticky;top:76px"><div class="muted sm" style="font-weight:600">RINGKASAN PESANAN</div><h3 style="margin-bottom:10px">Kalkulasi Seragam</h3><div id="uSum"></div><div class="card" style="margin-top:12px;padding:12px;border:2px solid var(--primary);box-shadow:none;background:var(--canvas)"><div class="muted sm">TOTAL PEMBAYARAN</div><div class="mono" id="uTot" style="font-size:26px;font-weight:600">Rp 0</div><div class="muted sm" id="uTer" style="font-style:italic"></div></div>' +
    '<button class="btn pri lg" style="margin-top:12px" id="uSave" onclick="saveSrg()"><i class="bi bi-printer"></i>Simpan &amp; Cetak Kwitansi Resmi</button><button class="btn lg" style="margin-top:8px" onclick="U.pick={};renderSrg()">Reset Formulir</button></div></div></div>' +
    '<div class="card tight" style="margin-top:16px"><div style="padding:8px 16px 12px"><h3>Riwayat Transaksi Seragam</h3></div><div class="tw" id="uHist"></div></div>';
  PICK.srg = s => { U.sid = s.id_siswa; const w = S.ix.wali[s.id_wali]; $('uStu').innerHTML = '<div class="stu"><div class="mono-av">' + initials(s.nama) + '</div><div><b>' + esc(s.nama) + '</b> <span class="cls">Kelas ' + esc(kelasNm(s.id_kelas)) + '</span><div class="mono sm muted">NISN: ' + esc(s.nisn) + '</div><div class="sm">Wali: ' + esc(w ? w.nama_wali : '-') + '</div></div></div>'; };
  uMet(U.metode); uLunas(true); renderSrg(); RENDER.seragam.upd(o);
};
RENDER.seragam.upd = function (o) {
  if (o && o.sid && S.ix.siswa[o.sid]) { const sw = S.ix.siswa[o.sid], el = $('spi_srg'); if (el) el.value = sw.nama; PICK.srg(sw); }
  if (!$('uHist')) return; const g = groupKwitansi().filter(x => x.no.indexOf('SRG') > -1).slice(0, 8);
  $('uHist').innerHTML = g.length ? '<table class="t"><thead><tr><th>No. Kwitansi</th><th>Waktu</th><th>Siswa &amp; Kelas</th><th>Item</th><th class="right">Total</th><th>Metode</th><th>Status</th><th></th></tr></thead><tbody>' + g.map(x => '<tr class="' + (x.status !== 'aktif' ? 'void' : '') + '"><td class="id">' + esc(x.no) + '</td><td class="mono sm">' + tglID(x.tanggal) + ' ' + jam(x.tanggal) + '</td><td>' + esc(x.owner.nama) + ' <span class="cls">' + esc(x.owner.kelas) + '</span></td><td class="sm">' + esc(String(x.ket || '').split('|').slice(1).join('|').trim()) + '</td><td class="num">' + rp(x.total) + '</td><td>' + esc(x.metode) + '</td><td>' + stPill(x.status === 'dibatalkan' ? 'Dibatalkan' : 'Lunas', x.status === 'dibatalkan' ? 'Dibatalkan' : 'Tercatat') + '</td><td><button class="btn sm" onclick="openKwitansi(\'' + esc(x.no) + '\')"><i class="bi bi-eye"></i></button></td></tr>').join('') + '</tbody></table>' : emptyBox('bi-bag', 'Belum ada transaksi seragam.');
  if ($('uItems')) renderSrg();
};
function uMet(m) { const L = metodeList(); U.metode = typeof m === 'number' ? (L[m] || L[0]).nama : m; if (!L.some(x => x.nama === U.metode)) U.metode = L[0].nama; $('uSeg').innerHTML = metodeBtns(U.metode, 'uMet'); $('uInfo').innerHTML = metodeInfo(U.metode, 'U.sid'); }
function uLunas(v) { U.lunas = v; $('uLns').classList.toggle('on', v); $('uCic').classList.toggle('on', !v); $('uDpBox').classList.toggle('hide', v); uCalc(); }
function renderSrg() {
  const gr = seragamGroups(); const names = Object.keys(gr);
  $('uItems').innerHTML = '<table class="t" style="min-width:560px"><thead><tr><th></th><th>Item</th><th>Kombinasi</th><th>Ukuran</th><th>Jml</th><th class="right">Harga</th></tr></thead><tbody>' + names.map((n, idx) => {
    const rows = gr[n], cur = U.pick[n], on = !!cur, single = rows.length === 1, jilbab = /jilbab/i.test(n);
    const selRow = on ? rows.find(r => r.id_item === cur.id) : rows[0], stok = selRow ? selRow.stok : '';
    return '<tr><td><input type="checkbox" ' + (on ? 'checked' : '') + ' onchange="uTog(' + idx + ')" aria-label="Pilih ' + esc(n) + '" style="width:18px;height:18px;accent-color:var(--primary)"></td><td><b>' + esc(n) + '</b><br><span class="muted sm">Stok: ' + (stok === '' ? '∞' : stok) + (stok !== '' && Number(stok) < 5 ? ' <span class="st Sebagian">Menipis</span>' : '') + '</span></td><td>' + (single ? '<span class="cls">Satuan</span>' : '<div class="seg" style="gap:4px">' + rows.map(r => '<button style="padding:6px 8px;justify-content:center;font-size:12px" class="' + (on && cur.id === r.id_item ? 'on' : '') + '" onclick="uBag(' + idx + ',\'' + r.id_item + '\')">' + cap(r.bagian) + (r.bagian === 'set' ? ' Lengkap' : ' Saja') + '</button>').join('') + '</div>') + '</td><td>' + (jilbab ? '<span class="muted sm">All Size</span>' : '<select class="in" style="width:72px" ' + (on ? '' : 'disabled') + ' onchange="uUkr(' + idx + ',this.value)">' + ['S', 'M', 'L', 'XL', 'XXL'].map(u => '<option ' + (on && cur.ukuran === u ? 'selected' : '') + '>' + u + '</option>').join('') + '</select>') + '</td><td><div class="row" style="gap:4px"><button class="btn sm" ' + (on ? '' : 'disabled') + ' onclick="uQty(' + idx + ',-1)" aria-label="Kurangi">−</button><b class="mono">' + (on ? cur.qty : 0) + '</b><button class="btn sm" ' + (on ? '' : 'disabled') + ' onclick="uQty(' + idx + ',1)" aria-label="Tambah">+</button></div></td><td class="num">' + (on ? rp(selRow.harga * cur.qty) : rp(selRow ? selRow.harga : 0)) + '</td></tr>';
  }).join('') + '</tbody></table>'; uCalc();
}
function uTog(i) { const n = Object.keys(seragamGroups())[i], rows = seragamGroups()[n]; if (U.pick[n]) delete U.pick[n]; else U.pick[n] = { id: rows[0].id_item, ukuran: /jilbab/i.test(n) ? 'All Size' : 'L', qty: 1 }; renderSrg(); }
function uBag(i, id) { const n = Object.keys(seragamGroups())[i]; U.pick[n] = Object.assign(U.pick[n] || { ukuran: 'L', qty: 1 }, { id: id }); renderSrg(); }
function uUkr(i, v) { const n = Object.keys(seragamGroups())[i]; U.pick[n].ukuran = v; uCalc(); }
function uQty(i, d) { const n = Object.keys(seragamGroups())[i]; U.pick[n].qty = Math.max(1, U.pick[n].qty + d); renderSrg(); }
function uTotal() { return Object.keys(U.pick).reduce((a, n) => { const r = S.m.seragam.find(x => x.id_item === U.pick[n].id); return a + (r ? r.harga * U.pick[n].qty : 0); }, 0); }
function uCalc() {
  const t = uTotal(); $('uTot').textContent = rp(t); $('uTer').textContent = t ? '"' + cap(terbilang(t)) + ' rupiah"' : '';
  $('uSum').innerHTML = Object.keys(U.pick).length ? Object.keys(U.pick).map(n => { const p = U.pick[n], r = S.m.seragam.find(x => x.id_item === p.id); return r ? '<div class="row sm" style="justify-content:space-between;padding:4px 0;border-bottom:1px dashed var(--border)"><span>' + p.qty + '× ' + esc(n) + '<br><span class="muted">' + cap(r.bagian) + ' · ' + esc(p.ukuran) + '</span></span><span class="mono">' + rp(r.harga * p.qty) + '</span></div>' : ''; }).join('') : '<div class="muted sm">Belum ada item dipilih.</div>';
}
function saveSrg() {
  if (!U.sid) return toast('Pilih siswa pemesan terlebih dahulu.', 'err'); const names = Object.keys(U.pick); if (!names.length) return toast('Pilih minimal satu item seragam.', 'err');
  const total = uTotal(), dp = U.lunas ? total : Math.min(num($('uDp').value), total); if (dp <= 0) return toast('Isi jumlah yang dibayar.', 'err');
  const payload = { idTrx: U.idTrx, idSiswa: U.sid, metode: U.metode, keterangan: $('uKet').value.trim(), status: U.lunas ? 'Lunas' : 'Cicilan', dibayar: dp, items: names.map(n => ({ id_item: U.pick[n].id, jumlah: U.pick[n].qty, ukuran: U.pick[n].ukuran })) };
  const btn = $('uSave'); btn.disabled = true; const snapM = clone(S.m.seragam), snapL = clone(S.live);
  names.forEach(n => { const r = S.m.seragam.find(x => x.id_item === U.pick[n].id); if (r && r.stok !== '') r.stok = Math.max(0, Number(r.stok) - U.pick[n].qty); });   // stok turun instan
  toast('Transaksi seragam disimpan (menyinkronkan…)'); U.pick = {}; U.idTrx = uuid(); renderSrg();
  api('simpanSeragam', payload).then(r => { btn.disabled = false; if (r.success) { if (r.data.live) { S.live = r.data.live; } if (r.data.seragam) S.m.seragam = r.data.seragam; softUpdate(); persist(); if (r.data.noKwitansi) setTimeout(() => openKwitansi(r.data.noKwitansi), 50); } else { S.m.seragam = snapM; S.live = snapL; softUpdate(); toast(r.message, 'err'); } }).catch(e => { btn.disabled = false; S.m.seragam = snapM; S.live = snapL; softUpdate(); toast(e.message, 'err'); });
}

/* ============================================================
 * PENGELUARAN (F5)
 * ============================================================ */
const KAT = ['Gaji & Honor', 'Operasional', 'ATK & Perlengkapan', 'Listrik, Air & Internet', 'Pemeliharaan Sarana', 'Kegiatan Santri', 'Konsumsi', 'Lain-lain'];
RENDER.pengeluaran = function () {
  $('s-pengeluaran').innerHTML = pageHead('Pencatatan Pengeluaran', 'Catat belanja &amp; biaya operasional madrasah. Pengeluaran tampil di dashboard dan laporan bulanan.', '') +
    '<div class="grid g-main" style="grid-template-columns:4fr 7fr"><div class="card"><h3>Catat Pengeluaran</h3><label class="l" for="xTgl">Tanggal</label><input class="in" type="date" id="xTgl" value="' + todayStr() + '"><label class="l" for="xKat">Kategori</label><select class="in" id="xKat">' + KAT.map(k => '<option>' + k + '</option>').join('') + '</select><label class="l" for="xUr">Uraian</label><input class="in" id="xUr" placeholder="Contoh: Pembelian kertas HVS 10 rim"><label class="l" for="xJml">Jumlah (Rp)</label><input class="in money" id="xJml" inputmode="numeric" oninput="this.value=num(this.value)?num(this.value).toLocaleString(\'id-ID\'):\'\'" placeholder="0"><div class="errmsg hide" id="xErr"></div><button class="btn pri lg" style="margin-top:16px" id="xSave" onclick="saveKeluar()"><i class="bi bi-plus-lg"></i>Simpan Pengeluaran</button></div>' +
    '<div class="card tight"><div class="row" style="padding:8px 16px 12px;justify-content:space-between"><div><h3>Daftar Pengeluaran</h3><span class="muted sm" id="xSub"></span></div><div class="mono" style="font-size:18px;font-weight:600" id="xTot"></div></div><div class="tw" id="xList"></div></div></div>';
  RENDER.pengeluaran.upd();
};
RENDER.pengeluaran.upd = function () {
  if (!$('xList')) return; const l = S.live.pengeluaran.filter(x => x.status === 'aktif' && ymOf(x.tanggal) === S.bulan).sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)));
  $('xSub').textContent = bulanLbl(S.bulan) + ' · ' + l.length + ' catatan'; $('xTot').textContent = rp(l.reduce((a, x) => a + Number(x.jumlah), 0));
  $('xList').innerHTML = l.length ? '<table class="t"><thead><tr><th>Tanggal</th><th>Kategori</th><th>Uraian</th><th class="right">Jumlah</th><th>Petugas</th><th></th></tr></thead><tbody>' + l.map(x => '<tr><td class="mono sm">' + tglID(x.tanggal) + '</td><td><span class="st Wali" style="text-transform:none">' + esc(x.kategori) + '</span></td><td>' + esc(x.uraian) + '</td><td class="num">' + rp(x.jumlah) + '</td><td class="sm">' + petugasKeluar(x) + '</td><td class="right nowrap">' + (isClosedDate(x.tanggal) ? '<i class="bi bi-lock-fill muted" title="Buku bulan ' + esc(String(x.tanggal).slice(0, 7)) + ' sudah ditutup"></i>' : '<button class="btn sm" aria-label="Ubah" onclick="pgForm(\'' + x.id_pengeluaran + '\')"><i class="bi bi-pencil"></i></button> <button class="btn sm danger" aria-label="Hapus" onclick="delKeluar(\'' + x.id_pengeluaran + '\')"><i class="bi bi-trash"></i></button>') + '</td></tr>').join('') + '</tbody></table>' : emptyBox('bi-wallet2', 'Belum ada pengeluaran pada periode ini.');
};
function saveKeluar() {
  const o = { id_pengeluaran: 'PG-' + uuid().slice(1, 9), tanggal: $('xTgl').value, kategori: $('xKat').value, uraian: $('xUr').value.trim(), jumlah: num($('xJml').value), dicatat_oleh: S.user.nama, oleh_username: S.user.username, oleh_peran: S.user.peran, oleh_waktu: nowISO(), status: 'aktif' };
  if (!o.uraian || o.jumlah <= 0) { $('xErr').textContent = 'Uraian dan jumlah (> 0) wajib diisi.'; $('xErr').classList.remove('hide'); return; } if (isClosedDate(o.tanggal)) { $('xErr').textContent = 'Buku bulan ' + String(o.tanggal).slice(0, 7) + ' sudah ditutup. Pilih tanggal di bulan yang masih terbuka.'; $('xErr').classList.remove('hide'); return; } $('xErr').classList.add('hide');
  const snap = clone(S.live.pengeluaran); S.live.pengeluaran.push(o); $('xUr').value = ''; $('xJml').value = ''; softUpdate(); toast('Pengeluaran dicatat.');
  api('simpanPengeluaran', o).then(r => { if (r.success) { const x = S.live.pengeluaran.find(p => p.id_pengeluaran === o.id_pengeluaran); if (x) x.id_pengeluaran = r.data.id_pengeluaran; persist(); } else { S.live.pengeluaran = snap; softUpdate(); toast(r.message, 'err'); } }).catch(e => { S.live.pengeluaran = snap; softUpdate(); toast(e.message, 'err'); });
}
function pgForm(id) {
  const x = S.live.pengeluaran.find(p => p.id_pengeluaran === id && p.status === 'aktif'); if (!x) return; const kats = KAT.includes(x.kategori) ? KAT : [x.kategori].concat(KAT);
  openModal('Ubah Pengeluaran', '<div class="note" style="background:var(--sebagian-bg)"><i class="bi bi-info-circle"></i><span>Perubahan dicatat (siapa &amp; kapan) dan nilai lama–baru masuk Log Audit.</span></div><label class="l" for="eTgl">Tanggal</label><input class="in" type="date" id="eTgl" value="' + String(x.tanggal).slice(0, 10) + '"><label class="l" for="eKat">Kategori</label><select class="in" id="eKat">' + kats.map(k => '<option ' + (k === x.kategori ? 'selected' : '') + '>' + esc(k) + '</option>').join('') + '</select><label class="l" for="eUr">Uraian</label><input class="in" id="eUr" value="' + esc(x.uraian) + '"><label class="l" for="eJml">Jumlah (Rp)</label><input class="in money" id="eJml" inputmode="numeric" value="' + Number(x.jumlah).toLocaleString('id-ID') + '" oninput="this.value=num(this.value)?num(this.value).toLocaleString(\'id-ID\'):\'\'"><div class="errmsg hide" id="eErr"></div>', '<button class="btn" onclick="closeModal()">Batal</button><button class="btn pri" id="eBtn" onclick="doUbahPg(\'' + id + '\')">Simpan</button>');
}
function doUbahPg(id) {
  const b = $('eBtn'), er = m => { $('eErr').textContent = m; $('eErr').classList.remove('hide'); }, p = { tanggal: $('eTgl').value, kategori: $('eKat').value, uraian: $('eUr').value.trim(), jumlah: num($('eJml').value) };
  if (!p.uraian || p.jumlah <= 0) return er('Uraian dan jumlah (> 0) wajib diisi.'); b.disabled = true;
  api('editPengeluaran', id, p).then(r => { b.disabled = false; if (!r.success) return er(r.message); closeModal(); setLive(r.data); toast('Pengeluaran diperbarui.'); }).catch(e => { b.disabled = false; er(e.message || 'Gagal menyimpan.'); });
}
function delKeluar(id) {
  openModal('Hapus pengeluaran?', '<p class="muted">Data tidak dihapus permanen (soft delete) dan tercatat di Log Audit.</p>', '<button class="btn" onclick="closeModal()">Batal</button><button class="btn danger" onclick="doDelKeluar(\'' + id + '\')">Hapus</button>');
}
function doDelKeluar(id) { closeModal(); const snap = clone(S.live.pengeluaran), x = S.live.pengeluaran.find(p => p.id_pengeluaran === id); if (x) x.status = 'dihapus'; softUpdate(); api('hapusPengeluaran', id).then(r => { if (!r.success) { S.live.pengeluaran = snap; softUpdate(); toast(r.message, 'err'); } else toast('Dihapus (soft delete).'); }).catch(e => { S.live.pengeluaran = snap; softUpdate(); toast(e.message, 'err'); }); }

/* ============================================================
 * TAGIHAN & TUNGGAKAN (F7) — semua filter lokal, instan
 * ============================================================ */
const T = { tab: 'siswa', q: '', kelas: '', jenis: '', st: 'menunggak', pg: 1 };
RENDER.tagihan = function (o) {
  if (!can.siswaTagihan()) T.tab = 'kelas'; if (o && o.kelas) { T.kelas = o.kelas; }
  const n = menunggak().length, tot = S.m.siswa.length;
  $('s-tagihan').innerHTML = pageHead('Tagihan &amp; Tunggakan Biaya', 'Monitoring piutang dan status pelunasan pembiayaan madrasah per siswa dan per rombel.', '<button class="btn" onclick="exportPiutang()"><i class="bi bi-download"></i>Unduh Rekap Piutang (.csv)</button>' + (can.bayar() ? '<button class="btn wa" onclick="go(\'pengingat\')"><i class="bi bi-whatsapp"></i>Kirim Pengingat WA Massal (' + n + ' Siswa)</button>' : ''), n + ' Siswa Tertunggak') +
    '<div class="tabs" role="tablist">' + (can.siswaTagihan() ? '<button id="tbS" onclick="tTab(\'siswa\')">Rekap Matriks Per Siswa</button>' : '') + '<button id="tbK" onclick="tTab(\'kelas\')">Ikhtisar Per Rombel / Kelas <span class="cls">' + S.m.kelas.length + ' Kelas</span></button></div>' +
    '<div class="grid g4" id="tKpi"></div><div id="tBody" style="margin-top:16px"></div>';
  RENDER.tagihan.upd();
};
RENDER.tagihan.upd = function () {
  if (!$('tKpi')) return; const tot = S.m.siswa.length, mn = menunggak().length, ok = tot - mn, pi = totalPiutang(); let spp = 0, inf = 0; S.live.tagihan.forEach(t => { const s = Math.max(0, t.nominal - (S.ix.paid[t.id_tagihan] || 0)); if (t.id_jenis === 'J-SPP') spp += s; else if (t.id_wali) inf += s; });
  const k = (l, v, sub, c) => '<div class="card kpi ' + (c || '') + '"><div class="top"><span>' + l + '</span></div><div class="val">' + v + '</div><div class="muted sm">' + sub + '</div></div>';
  $('tKpi').innerHTML = k('Total Siswa Aktif', tot + ' <span class="sm muted" style="font-family:var(--f-ui)">Siswa</span>', 'Tahun Ajaran ' + esc(S.cfg.tahunAktif || '')) + k('Bebas Tunggakan', ok + ' <span class="sm" style="color:var(--lunas)">' + (tot ? (ok / tot * 100).toFixed(1) : 0) + '%</span>', 'Seluruh pembiayaan tuntas') + k('Memiliki Tunggakan', mn + ' <span class="sm" style="color:var(--tunggak)">' + (tot ? (mn / tot * 100).toFixed(1) : 0) + '%</span>', 'Siswa dengan ≥1 pos tagihan', 'k4') + k('Akumulasi Piutang', rp(pi), 'SPP ' + rp(spp) + ' · Infak ' + rp(inf), 'k3');
  $('tbS') && $('tbS').classList.toggle('on', T.tab === 'siswa'); $('tbK').classList.toggle('on', T.tab === 'kelas'); T.tab === 'siswa' ? tMatrix() : tKelas();
};
function tTab(t) { T.tab = t; T.pg = 1; RENDER.tagihan.upd(); }
const tF = debounce(() => { T.q = $('tQ').value; T.kelas = $('tK').value; T.jenis = $('tJ').value; T.st = $('tS').value; T.pg = 1; tRows(); }, 120);
function tMatrix() {
  const js = [...new Set(S.live.tagihan.map(t => t.id_jenis))].map(id => S.ix.jenis[id]).filter(jj => jj && jj.sifat !== 'sukarela');
  $('tBody').innerHTML = '<div class="card" style="margin-bottom:16px"><div class="row wrap"><div class="search grow" style="min-width:200px"><i class="bi bi-search"></i><input class="in" id="tQ" placeholder="Cari nama siswa atau NISN…" value="' + esc(T.q) + '" oninput="tF()"></div><select class="in" id="tK" style="width:auto" onchange="tF()"><option value="">Semua Kelas</option>' + S.m.kelas.map(k => '<option value="' + k.id_kelas + '" ' + (T.kelas === k.id_kelas ? 'selected' : '') + '>' + esc(k.nama_kelas) + '</option>').join('') + '</select><select class="in" id="tJ" style="width:auto" onchange="tF()"><option value="">Semua Pos Biaya</option>' + js.map(j => '<option value="' + j.id_jenis + '" ' + (T.jenis === j.id_jenis ? 'selected' : '') + '>' + esc(j.nama) + '</option>').join('') + '</select><select class="in" id="tS" style="width:auto" onchange="tF()"><option value="menunggak" ' + (T.st === 'menunggak' ? 'selected' : '') + '>Menunggak</option><option value="semua" ' + (T.st === 'semua' ? 'selected' : '') + '>Semua Status</option><option value="lunas" ' + (T.st === 'lunas' ? 'selected' : '') + '>Lunas</option></select></div>' + (S.user.peran === 'Wali Kelas' ? '<div class="hint"><i class="bi bi-lock"></i> Wali kelas hanya melihat kelas yang diampu.</div>' : '') + '</div><div class="card tight"><div style="padding:8px 16px 12px" class="row wrap"><h3>Matriks Tunggakan Siswa</h3><div class="legend"><span><i style="background:#1E7E34"></i>Lunas</span><span><i style="background:#B27B00"></i>Sebagian</span><span><i style="background:#C5221F"></i>Belum</span></div></div><div class="tw" id="tTbl"></div><div id="tPg"></div></div>';
  tRows();
}
function tRows() {
  const js = [...new Set(S.live.tagihan.map(t => t.id_jenis))].map(id => S.ix.jenis[id]).filter(jj => jj && jj.sifat !== 'sukarela'), q = T.q.toLowerCase();
  let l = S.m.siswa.filter(s => (!T.kelas || s.id_kelas === T.kelas) && (!q || s.nama.toLowerCase().includes(q) || String(s.nisn).includes(q)));
  l = l.filter(s => { const arr = tagihanSiswa(s.id_siswa).filter(r => !T.jenis || r.t.id_jenis === T.jenis), open = arr.some(r => r.sisa > 0); return T.st === 'semua' ? true : T.st === 'menunggak' ? open : (!open && arr.length); });
  const per = 10, rows = l.slice((T.pg - 1) * per, T.pg * per);
  const cell = (s, j) => { const r = tagihanSiswa(s.id_siswa).filter(x => x.t.id_jenis === j.id_jenis); if (!r.length) return '<span class="muted">–</span>'; if (r.some(q => isBln(q.t.periode))) return cellBulan(r); const x = r[r.length - 1], perW = x.perWali && S.ix.primary[s.id_wali] !== s.id_siswa; return (x.st === 'Lunas' || x.st === 'Bebas') ? stPill(x.st) : '<div>' + stPill(x.st) + '<div class="num sm" style="color:var(--' + (x.st === 'Sebagian' ? 'sebagian' : 'tunggak') + ');font-size:11px">' + rp(x.sisa) + '</div>' + (x.perWali ? '<span class="st Wali" style="height:16px;font-size:9px">Per-Wali</span>' : '') + '</div>'; };
  $('tTbl').innerHTML = rows.length ? '<table class="t"><thead><tr><th>No</th><th>Siswa &amp; NISN</th><th>Kelas</th><th>Wali &amp; WhatsApp</th>' + js.map(j => '<th>' + esc(j.nama) + '</th>').join('') + '<th class="right">Sisa</th></tr></thead><tbody>' + rows.map((s, i) => { const w = S.ix.wali[s.id_wali] || {}; return '<tr><td class="muted">' + ((T.pg - 1) * per + i + 1) + '</td><td><b>' + esc(s.nama) + '</b><br><span class="mono sm muted">' + esc(s.nisn) + '</span></td><td><span class="cls">' + esc(kelasNm(s.id_kelas)) + '</span></td><td>' + esc(w.nama_wali) + '<br><span class="mono sm muted">+' + esc(w.no_whatsapp) + '</span></td>' + js.map(j => '<td>' + cell(s, j) + '</td>').join('') + '<td class="num" style="color:var(--tunggak)">' + rp(sisaSiswa(s.id_siswa)) + '</td></tr>'; }).join('') + '</tbody></table>' : emptyBox('bi-emoji-smile', S.live.tagihan.length ? 'Tidak ada data yang cocok dengan filter.' : 'Belum ada tagihan. Super Admin dapat membuatnya di Data Master → Tagihan.');
  $('tPg').innerHTML = pager('t', l.length, T.pg, per, 'tPage');
}
function tPage(n) { T.pg = n; tRows(); }
function tKelas() {
  const rows = S.m.kelas.map(k => { const ss = S.m.siswa.filter(s => s.id_kelas === k.id_kelas), mn = ss.filter(s => tagihanSiswa(s.id_siswa).some(r => r.sisa > 0)).length, pct = ss.length ? Math.round((ss.length - mn) / ss.length * 1000) / 10 : 100; return { k: k, n: ss.length, mn: mn, pct: pct, sum: ss.reduce((a, s) => a + sisaSiswa(s.id_siswa), 0) }; });
  $('tBody').innerHTML = '<div class="card"><h3 style="margin-bottom:12px">Rasio Pelunasan Rombel</h3>' + (rows.length ? rows.map(r => '<div style="margin-bottom:14px"><div class="row sm" style="justify-content:space-between"><span><b>Kelas ' + esc(r.k.nama_kelas) + '</b> <span class="muted">(' + (r.n - r.mn) + '/' + r.n + ' siswa lunas)</span></span><span class="mono" style="color:' + (r.pct < 80 ? 'var(--tunggak)' : 'var(--lunas)') + '">' + r.pct + '% · ' + rp(r.sum) + '</span></div><div class="bar ' + (r.pct < 80 ? 'low' : r.pct < 90 ? 'mid' : '') + '"><i style="width:' + r.pct + '%"></i></div></div>').join('') : emptyBox('bi-grid', 'Belum ada kelas.')) + '</div>';
}
function exportPiutang() { const rows = [['NISN', 'Nama', 'Kelas', 'Wali', 'No WA', 'Jenis', 'Periode', 'Tagihan', 'Terbayar', 'Sisa']]; S.m.siswa.forEach(s => tagihanSiswa(s.id_siswa).forEach(r => { if (r.sisa > 0) { const w = S.ix.wali[s.id_wali] || {}; rows.push([s.nisn, s.nama, kelasNm(s.id_kelas), w.nama_wali, w.no_whatsapp, jenisNm(r.t.id_jenis), r.t.periode, r.t.nominal, r.paid, r.sisa]); } })); downloadCSV('rekap-piutang-' + todayStr() + '.csv', rows); }

/* ============================================================
 * PENGINGAT WA (F9) — tanpa nominal, per-wali sekali
 * ============================================================ */
const R = { kelas: '', q: '' };
function reminders() {
  const per = {}; S.m.siswa.forEach(s => { const open = tagihanSiswa(s.id_siswa).filter(r => r.sisa > 0); if (!open.length) return; const w = per[s.id_wali] = per[s.id_wali] || { wali: S.ix.wali[s.id_wali] || {}, id: s.id_wali, anak: [], jenis: {}, bln: {} }; w.anak.push(s); const multi = (S.ix.anak[s.id_wali] || []).length > 1;
    open.forEach(r => { if (isBln(r.t.periode)) { const who = (r.perWali || !multi) ? '' : ' (' + s.nama + ')', key = r.t.id_jenis + '|' + who, g = w.bln[key] = w.bln[key] || { jid: r.t.id_jenis, who: who, per: new Set() }; g.per.add(r.t.periode); } else w.jenis[jenisNm(r.t.id_jenis)] = 1; }); });
  Object.values(per).forEach(w => Object.values(w.bln).forEach(g => { const L = [...g.per]; w.jenis[jenisNm(g.jid) + ' ' + (L.length > 1 ? rentangBln(L) : bulanLbl(L[0])) + g.who] = 1; }));
  return Object.values(per).filter(x => (!R.kelas || x.anak.some(a => a.id_kelas === R.kelas)) && (!R.q || x.wali.nama_wali.toLowerCase().includes(R.q) || x.anak.some(a => a.nama.toLowerCase().includes(R.q))));
}
function waText(x) {
  const tpl = S.cfg.templateWA || "Assalamu'alaikum Wr. Wb.\nYth. Bapak/Ibu {wali} (wali dari {siswa}, {kelas}).\nMengingatkan kewajiban administrasi:\n{daftar}\nJazakumullah khairan.";
  return tpl.replace('{wali}', x.wali.nama_wali).replace('{siswa}', x.anak.map(a => a.nama).join(' & ')).replace('{kelas}', x.anak.map(a => 'Kelas ' + kelasNm(a.id_kelas)).join(' & ')).replace('{daftar}', Object.keys(x.jenis).map(j => '• ' + j).join('\n'));
}
RENDER.pengingat = function (o) {
  if (o && o.kelas !== undefined) R.kelas = o.kelas;
  $('s-pengingat').innerHTML = pageHead('Pengingat Tagihan via WhatsApp', 'Pesan tanpa nominal, satu pesan per wali (biaya per-wali tidak ditagih ganda). Dikirim manual lewat tautan wa.me.', '<button class="btn wa" onclick="massWA()"><i class="bi bi-whatsapp"></i>Daftar Tautan Massal</button>') +
    '<div class="grid g-main" style="grid-template-columns:7fr 4fr"><div class="card tight"><div class="row wrap" style="padding:8px 16px 12px"><div class="search grow" style="min-width:180px"><i class="bi bi-search"></i><input class="in" id="rQ" placeholder="Cari wali / siswa…" oninput="rF()"></div><select class="in" id="rK" style="width:auto" onchange="rF()"><option value="">Semua Kelas</option>' + S.m.kelas.map(k => '<option value="' + k.id_kelas + '" ' + (R.kelas === k.id_kelas ? 'selected' : '') + '>' + esc(k.nama_kelas) + '</option>').join('') + '</select></div><div class="tw" id="rList"></div></div><div class="card"><h3>Format Pesan</h3><p class="muted sm">Template resmi madrasah (diubah Super Admin di Pengguna &amp; Sistem).</p><div class="wabub" id="rPrev"></div></div></div>';
  RENDER.pengingat.upd();
};
RENDER.pengingat.upd = function () { if (!$('rList')) return; const l = reminders(); const sent = (() => { try { return JSON.parse(localStorage.getItem('sadam_wasent') || '{}'); } catch (e) { return {}; } })();
  $('rList').innerHTML = l.length ? '<table class="t"><thead><tr><th>Wali</th><th>Siswa</th><th>Belum lunas</th><th class="right">Aksi</th></tr></thead><tbody>' + l.map(x => '<tr><td><b>' + esc(x.wali.nama_wali) + '</b><br><span class="mono sm muted">+' + esc(x.wali.no_whatsapp) + '</span></td><td>' + x.anak.map(a => esc(a.nama) + ' <span class="cls">' + esc(kelasNm(a.id_kelas)) + '</span>').join('<br>') + '</td><td class="sm">' + Object.keys(x.jenis).map(esc).join(', ') + '</td><td class="right nowrap"><button class="btn sm" title="Kirim nomor rekening" onclick="rekeningModal(\'' + x.anak[0].id_siswa + '\')"><i class="bi bi-bank"></i>Rekening</button> <a class="btn wa sm" target="_blank" rel="noopener" href="' + waLink(x.wali.no_whatsapp, waText(x)) + '" onclick="markSent(\'' + x.id + '\')"><i class="bi bi-whatsapp"></i>' + (sent[x.id] ? 'Kirim Lagi' : 'Kirim') + '</a>' + (sent[x.id] ? ' <i class="bi bi-check2-all" style="color:var(--lunas)" title="Sudah dibuka"></i>' : '') + '</td></tr>').join('') + '</tbody></table>' : emptyBox('bi-emoji-smile', 'Tidak ada wali yang perlu diingatkan.');
  $('rPrev').textContent = l.length ? waText(l[0]) : (S.cfg.templateWA || ''); };
const rF = debounce(() => { R.q = $('rQ').value.toLowerCase(); R.kelas = $('rK').value; RENDER.pengingat.upd(); }, 100);
function markSent(id) { try { const s = JSON.parse(localStorage.getItem('sadam_wasent') || '{}'); s[id] = Date.now(); localStorage.setItem('sadam_wasent', JSON.stringify(s)); } catch (e) {} setTimeout(RENDER.pengingat.upd, 300); }
function massWA() { const l = reminders(); openModal('Tautan WhatsApp Massal (' + l.length + ')', '<p class="muted sm">Klik satu per satu. Tab WhatsApp terbuka tanpa mengubah halaman SADaM.</p>' + l.map((x, i) => '<div class="row" style="padding:6px 0;border-bottom:1px solid var(--border)"><span class="muted mono sm">' + (i + 1) + '</span><span class="grow">' + esc(x.wali.nama_wali) + ' <span class="muted sm">(' + x.anak.map(a => esc(a.nama)).join(', ') + ')</span></span><a class="btn wa sm" target="_blank" rel="noopener" href="' + waLink(x.wali.no_whatsapp, waText(x)) + '" onclick="markSent(\'' + x.id + '\')">Buka</a></div>').join(''), '<button class="btn" onclick="closeModal()">Tutup</button>'); }

/* ============================================================
 * REKAPAN PEMBAYARAN (F10)
 * ============================================================ */
let RK = { semua: false };
const R2 = { tab: 'kelas', kelas: '', sid: '', q: '', hanya: false };
const natCmp = (a, b) => String(a).localeCompare(String(b), 'id', { numeric: true });
const perLbl = p => /^\d{4}-\d{2}$/.test(p) ? bulanLbl(p) : /^\d{4}-\d{2}-\d{2}/.test(p) ? tglPanjang(p) : String(p || '—');
function taMonths() { const y = parseInt(String(S.cfg.tahunAktif || '').split('/')[0]) || new Date().getFullYear(), o = []; for (let m = 7; m <= 12; m++) o.push(y + '-' + pad(m)); for (let m = 1; m <= 6; m++) o.push((y + 1) + '-' + pad(m)); return o; }
function rkSetNav(o) { if (o && o.kelas !== undefined) { R2.tab = 'kelas'; R2.kelas = o.kelas; R2.sid = o.sid || ''; R2.q = ''; R2.hanya = false; } }
RENDER.rekap = function (o) { rkSetNav(o); rkRender(); };
RENDER.rekap.upd = function (o) { rkSetNav(o); rkRender(); };
function rkRender() {
  if (R2.kelas && R2.kelas !== '__nonaktif' && !S.ix.kelas[R2.kelas]) { R2.kelas = ''; R2.sid = ''; } if (R2.sid && !S.ix.siswa[R2.sid]) R2.sid = '';
  const sub = R2.tab === 'ringkas' ? 'Total pemasukan per jenis pembiayaan dan jumlah siswa menunggak per kelas.' : R2.sid ? 'Rincian tagihan dan pembayaran siswa per jenis pembiayaan.' : R2.kelas ? 'Pilih siswa untuk melihat rincian tunggakan dan nomor kwitansi.' : 'Pilih kelas untuk melihat tunggakan dan riwayat pembayaran tiap siswa.';
  $('s-rekap').innerHTML = pageHead('Rekapan Pembayaran', sub, R2.tab === 'ringkas' ? '<label class="chip" style="cursor:pointer"><input type="checkbox" id="rkAll" ' + (RK.semua ? 'checked' : '') + ' onchange="RK.semua=this.checked;rkRender()"> Semua periode</label>' : '') +
    '<div class="tabs"><button class="' + (R2.tab === 'kelas' ? 'on' : '') + '" onclick="rkTab(\'kelas\')">Per Kelas &amp; Siswa</button><button class="' + (R2.tab === 'ringkas' ? 'on' : '') + '" onclick="rkTab(\'ringkas\')">Ringkasan Pemasukan</button></div><div id="rkBody"></div>';
  if (R2.tab === 'ringkas') rkRingkas(); else if (R2.sid) rkDetail(); else if (R2.kelas) rkSiswa(); else rkKelas();
}
function rkTab(t) { R2.tab = t; rkRender(); }
function rkPilih(id) { R2.kelas = id; R2.sid = ''; R2.q = ''; R2.hanya = false; rkRender(); window.scrollTo(0, 0); }
function rkKe(id) { R2.kelas = id; R2.sid = ''; R2.q = ''; rkRender(); }
function rkBuka(sid) { R2.sid = sid; rkRender(); window.scrollTo(0, 0); }
function rkBack() { R2.sid = ''; rkRender(); }
/* Tingkat 1 — daftar kelas */
const rkKelasLbl = id => id === '__nonaktif' ? 'Alumni & Nonaktif' : 'Kelas ' + esc((S.ix.kelas[id] || {}).nama_kelas || '-');
function rkAlumniCard(ok) {
  const al = S.m.siswa.filter(s => s.status_aktif === 'Nonaktif'); if (!al.length) return '';
  const mn = al.filter(s => tagihanSiswa(s.id_siswa).some(r => r.sisa > 0)).length, sum = al.reduce((a, s) => a + sisaSiswa(s.id_siswa), 0);
  return '<div class="card kcard' + (ok ? '' : ' static') + '" style="border-style:dashed" ' + (ok ? 'role="button" tabindex="0" onclick="rkPilih(\'__nonaktif\')" onkeydown="if(event.key===\'Enter\')rkPilih(\'__nonaktif\')"' : '') + '><div class="row" style="justify-content:space-between;align-items:flex-start"><h3>Alumni &amp; Nonaktif</h3>' + (mn ? '<span class="st Belum">' + mn + ' menunggak</span>' : '<span class="st Lunas">Tidak ada tunggakan</span>') + '</div><div class="muted sm">' + al.length + ' siswa lulus / pindah / nonaktif</div><div class="mono" style="font-size:16px;font-weight:600;margin:10px 0 6px;color:' + (sum ? 'var(--tunggak)' : 'var(--lunas)') + '">' + rp(sum) + '</div><div class="muted sm">Tunggakan lama tetap tercatat sampai dilunasi.</div>' + (ok ? '<div class="row sm" style="justify-content:flex-end;margin-top:6px;color:var(--primary);font-weight:600">Lihat siswa <i class="bi bi-arrow-right"></i></div>' : '') + '</div>';
}
function rkKelas() {
  const ks = S.m.kelas.slice().sort((a, b) => natCmp(a.nama_kelas, b.nama_kelas)), ok = can.siswaTagihan();
  $('rkBody').innerHTML = (ok ? '' : '<div class="note"><i class="bi bi-lock"></i>Rincian per siswa hanya untuk Super Admin, Bendahara, dan Wali Kelas. Anda melihat ringkasan per kelas.</div>') +
    (ks.length ? '<div class="kcards">' + ks.map(k => {
      const ss = S.m.siswa.filter(s => s.id_kelas === k.id_kelas && s.status_aktif !== 'Nonaktif'), mn = ss.filter(s => tagihanSiswa(s.id_siswa).some(r => r.sisa > 0)).length, sum = ss.reduce((a, s) => a + sisaSiswa(s.id_siswa), 0), pct = ss.length ? Math.round((ss.length - mn) / ss.length * 100) : 100, wk = waliKelasOf(k);
      return '<div class="card kcard' + (ok ? '' : ' static') + '" ' + (ok ? 'role="button" tabindex="0" onclick="rkPilih(\'' + k.id_kelas + '\')" onkeydown="if(event.key===\'Enter\')rkPilih(\'' + k.id_kelas + '\')"' : '') + '><div class="row" style="justify-content:space-between;align-items:flex-start"><h3>Kelas ' + esc(k.nama_kelas) + '</h3>' + (mn ? '<span class="st Belum">' + mn + ' menunggak</span>' : '<span class="st Lunas">Lunas semua</span>') + '</div><div class="muted sm">' + ss.length + ' siswa' + (wk ? ' · Wali: ' + esc(wk.nama) : '') + '</div><div class="mono" style="font-size:16px;font-weight:600;margin:10px 0 6px;color:' + (sum ? 'var(--tunggak)' : 'var(--lunas)') + '">' + rp(sum) + '</div><div class="bar ' + (pct < 80 ? 'low' : pct < 90 ? 'mid' : '') + '"><i style="width:' + pct + '%"></i></div><div class="row sm muted" style="justify-content:space-between;margin-top:6px"><span>' + pct + '% lunas</span>' + (ok ? '<span style="color:var(--primary);font-weight:600">Lihat siswa <i class="bi bi-arrow-right"></i></span>' : '') + '</div></div>';
    }).join('') + rkAlumniCard(ok) + '</div>' : emptyBox('bi-grid', 'Belum ada kelas. Tambahkan di Data Master.'));
}
/* Tingkat 2 — daftar siswa dalam kelas (cari nama) */
function rkSiswa() {
  const k = S.ix.kelas[R2.kelas];
  $('rkBody').innerHTML = '<div class="crumbs"><button class="btn sm" onclick="rkKe(\'\')"><i class="bi bi-arrow-left"></i>Semua Kelas</button><i class="bi bi-chevron-right"></i><b>' + rkKelasLbl(R2.kelas) + '</b></div><div class="card tight"><div class="row wrap" style="padding:10px 16px"><div class="search grow" style="min-width:200px"><i class="bi bi-search"></i><input class="in" id="rkQ" placeholder="Cari nama siswa atau NISN…" value="' + esc(R2.q) + '" oninput="rkF()" autocomplete="off"></div><label class="chk"><input type="checkbox" id="rkH" ' + (R2.hanya ? 'checked' : '') + ' onchange="rkF()"> Hanya yang menunggak</label><button class="btn sm" onclick="rkCsv()"><i class="bi bi-download"></i>Unduh CSV</button></div><div class="tw" id="rkList"></div><div class="pg" id="rkCnt"></div></div>';
  rkRows();
}
const rkF = debounce(() => { R2.q = $('rkQ').value; R2.hanya = $('rkH').checked; rkRows(); }, 100);
function rkFiltered() {
  const q = R2.q.trim().toLowerCase(), all = S.m.siswa.filter(s => R2.kelas === '__nonaktif' ? s.status_aktif === 'Nonaktif' : (s.id_kelas === R2.kelas && s.status_aktif !== 'Nonaktif')).sort((a, b) => natCmp(a.nama, b.nama));
  return { all: all.length, list: all.filter(s => (!q || s.nama.toLowerCase().includes(q) || String(s.nisn).includes(q)) && (!R2.hanya || tagihanSiswa(s.id_siswa).some(r => r.sisa > 0))) };
}
function rkRows() {
  const f = rkFiltered(), l = f.list;
  $('rkList').innerHTML = l.length ? '<table class="t"><thead><tr><th>No</th><th>Siswa &amp; NISN</th><th>Wali</th><th class="right">Item belum lunas</th><th class="right">Tunggakan</th><th>Status</th><th></th></tr></thead><tbody>' + l.map((s, i) => {
    const w = S.ix.wali[s.id_wali] || {}, n = tagihanSiswa(s.id_siswa).filter(r => r.sisa > 0).length, sd = sisaSiswa(s.id_siswa);
    return '<tr class="clk" role="button" tabindex="0" onclick="rkBuka(\'' + s.id_siswa + '\')" onkeydown="if(event.key===\'Enter\')rkBuka(\'' + s.id_siswa + '\')"><td class="muted">' + (i + 1) + '</td><td><b>' + esc(s.nama) + '</b><br><span class="mono sm muted">' + esc(s.nisn) + '</span></td><td>' + esc(w.nama_wali || '-') + '</td><td class="num">' + n + '</td><td class="num" style="color:' + (sd ? 'var(--tunggak)' : 'var(--lunas)') + '">' + rp(sd) + '</td><td>' + (n ? stPill('Belum', 'Menunggak') : stPill('Lunas', 'Lunas semua')) + '</td><td class="right"><i class="bi bi-chevron-right muted"></i></td></tr>';
  }).join('') + '</tbody></table>' : emptyBox('bi-search', f.all ? 'Tidak ada siswa yang cocok.' : 'Belum ada siswa di kelas ini.');
  $('rkCnt').innerHTML = '<span>Menampilkan <b>' + l.length + '</b> dari ' + f.all + ' siswa</span>';
}
function rkCsv() { const rows = [['NISN', 'Nama', 'Kelas', 'Wali', 'No WA', 'Item belum lunas', 'Total tunggakan']]; rkFiltered().list.forEach(s => { const w = S.ix.wali[s.id_wali] || {}; rows.push([s.nisn, s.nama, kelasNm(s.id_kelas), w.nama_wali, w.no_whatsapp, tagihanSiswa(s.id_siswa).filter(r => r.sisa > 0).length, sisaSiswa(s.id_siswa)]); }); downloadCSV('rekapan-kelas-' + kelasNm(R2.kelas) + '-' + todayStr() + '.csv', rows); }
/* Tingkat 3 — rincian satu siswa */
function kwCell(r) {
  const list = S.ix.payBy[r.t.id_tagihan] || []; if (!list.length) return '<span class="muted">—</span>'; const g = {};
  list.forEach(p => { const x = g[p.no] = g[p.no] || { no: p.no, jml: 0, tgl: p.tanggal }; x.jml += Number(p.jumlah); });
  return Object.values(g).map(x => '<div><a class="mono sm" role="button" tabindex="0" style="color:var(--primary);cursor:pointer;font-weight:600" onclick="openKwitansi(\'' + esc(x.no) + '\')">' + esc(x.no) + '</a><span class="muted sm"> · ' + tglID(x.tgl).slice(0, 5) + ' · ' + rp(x.jml) + '</span></div>').join('');
}
function rkRow(lbl, r, prim) {
  const dup = r.perWali && !prim;
  return '<tr><td>' + lbl + (r.perWali ? ' <span class="st Wali">Per-Wali</span>' : '') + (dup ? '<div class="muted sm">ditanggung bersama kakak/adik — tidak dihitung ganda</div>' : '') + (Number(r.t.potongan) > 0 ? '<div class="muted sm">Tarif ' + rp(r.t.nominal_asal) + ' − potongan ' + rp(r.t.potongan) + (r.t.ket_potongan ? ' (' + esc(r.t.ket_potongan) + ')' : '') + '</div>' : '') + '</td><td class="num">' + rp(r.t.nominal) + '</td><td class="num">' + rp(r.paid) + '</td><td class="num" style="color:' + (r.sisa > 0 ? 'var(--tunggak)' : 'var(--lunas)') + '">' + rp(r.sisa) + '</td><td>' + stPill(r.st === 'Belum' ? 'Belum' : r.st, r.st === 'Belum' ? 'Belum bayar' : r.st) + '</td><td>' + kwCell(r) + '</td></tr>';
}
const rkEmpty = (lbl, note) => '<tr><td>' + lbl + '</td><td colspan="5" class="muted">' + note + '</td></tr>';
function rkJenisList(sid) {
  const recs = tagihanSiswa(sid), has = id => recs.some(r => r.t.id_jenis === id), L = S.m.jenis.filter(j => j.id_jenis !== 'J-SRG' && (j.sifat === 'sukarela' ? recs.some(r => r.t.id_jenis === j.id_jenis && r.paid > 0) : (j.status_aktif !== 'Nonaktif' || has(j.id_jenis))));
  if (has('J-SRG')) L.push({ id_jenis: 'J-SRG', nama: 'Seragam & Atribut', periode: 'sekali', basis_tagihan: 'per siswa' }); return L;
}
function rkDetail() {
  const s = S.ix.siswa[R2.sid], k = S.ix.kelas[s.id_kelas] || {}, w = S.ix.wali[s.id_wali] || {}, recs = tagihanSiswa(s.id_siswa), prim = S.ix.primary[s.id_wali] === s.id_siswa, ta = S.cfg.tahunAktif || '';
  const sukTot = recs.filter(r => jenisSuk(r.t.id_jenis)).reduce((a, r) => a + r.paid, 0), own = recs.filter(r => !(r.perWali && !prim) && !jenisSuk(r.t.id_jenis)), tT = own.reduce((a, r) => a + Number(r.t.nominal), 0), tP = own.reduce((a, r) => a + r.paid, 0), tS = own.reduce((a, r) => a + r.sisa, 0);
  const sections = rkJenisList(s.id_siswa).map(j => {
    const rs = recs.filter(r => r.t.id_jenis === j.id_jenis && (j.sifat !== 'sukarela' || r.paid > 0)).sort((a, b) => natCmp(a.t.periode, b.t.periode)), bul = j.periode === 'bulanan' && j.id_jenis !== 'J-SRG'; let rows = '';
    if (bul) { const ms = [...new Set(taMonths().concat(rs.map(r => r.t.periode)))].sort(); rows = ms.map(m => { const r = rs.find(x => x.t.periode === m); return r ? rkRow(bulanLbl(m), r, prim) : rkEmpty('<span class="muted">' + bulanLbl(m) + '</span>', 'Belum ada tagihan'); }).join(''); }
    else if (rs.length) rows = rs.map(r => rkRow(esc(perLbl(r.t.periode)), r, prim)).join('');
    else { const tf = j.basis_tagihan === 'per wali' ? null : S.m.tarif.find(x => x.id_jenis === j.id_jenis && x.id_kelas === s.id_kelas && String(x.tahun_ajaran) === String(ta)); rows = rkEmpty('—', 'Belum ada tagihan dibuat' + (tf ? ' · tarif kelas ' + rp(tf.nominal) : '')); }
    const sj = rs.filter(r => !(r.perWali && !prim)).reduce((a, r) => a + r.sisa, 0);
    return '<div class="card tight" style="margin-bottom:12px"><div class="row wrap" style="padding:10px 16px;justify-content:space-between"><h3>' + esc(j.nama) + ' <span class="muted sm" style="font-weight:400">· ' + (j.basis_tagihan === 'per wali' ? 'ditagih per wali' : esc(j.periode)) + '</span></h3>' + (rs.length ? (sj > 0 ? '<span class="st Belum" style="text-transform:none">Sisa ' + rp(sj) + '</span>' : '<span class="st Lunas">Lunas</span>') : '') + '</div><div class="tw"><table class="t" style="min-width:640px"><thead><tr><th>' + (bul ? 'Bulan' : 'Periode') + '</th><th class="right">Tagihan</th><th class="right">Terbayar</th><th class="right">Sisa</th><th>Status</th><th>No. Kwitansi</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  }).join('');
  $('rkBody').innerHTML = '<div class="crumbs"><button class="btn sm" onclick="rkKe(\'\')"><i class="bi bi-arrow-left"></i>Semua Kelas</button><i class="bi bi-chevron-right"></i><a role="button" tabindex="0" onclick="rkBack()">' + rkKelasLbl(R2.kelas) + '</a><i class="bi bi-chevron-right"></i><b>' + esc(s.nama) + '</b></div>' +
    '<div class="card" style="margin-bottom:12px"><div class="row wrap" style="justify-content:space-between;align-items:flex-start"><div class="row"><div class="mono-av">' + initials(s.nama) + '</div><div><h3 style="font-size:18px">' + esc(s.nama) + '</h3><div class="muted sm"><span class="mono">' + esc(s.nisn) + '</span> · Kelas ' + esc(k.nama_kelas || '-') + ' · Wali: ' + esc(w.nama_wali || '-') + (w.no_whatsapp ? ' (+' + esc(w.no_whatsapp) + ')' : '') + '</div>' + kfChips(s.id_siswa) + '</div></div><div class="row wrap"><button class="btn" onclick="rkBack()"><i class="bi bi-arrow-left"></i>Daftar siswa</button><button class="btn" onclick="rkCetak()"><i class="bi bi-printer"></i>Cetak</button>' + (can.bayar() ? '<button class="btn" onclick="rekeningModal(\'' + s.id_siswa + '\')"><i class="bi bi-bank"></i>Kirim rekening</button><button class="btn pri" onclick="go(\'pembayaran\',{sid:\'' + s.id_siswa + '\'})"><i class="bi bi-plus-lg"></i>Catat Pembayaran</button>' : '') + '</div></div>' +
    '<div class="grid g3" style="margin-top:12px"><div class="card kpi" style="box-shadow:none"><div class="top"><span>Total Tagihan</span></div><div class="val">' + rp(tT) + '</div></div><div class="card kpi k2" style="box-shadow:none"><div class="top"><span>Terbayar</span></div><div class="val">' + rp(tP) + '</div></div><div class="card kpi k4" style="box-shadow:none"><div class="top"><span>Sisa Tunggakan</span></div><div class="val">' + rp(tS) + '</div></div></div>' + (sukTot ? '<div class="sm muted" style="margin-top:8px">Infak sukarela tercatat: <b>' + rp(sukTot) + '</b> (di luar tagihan).</div>' : '') + '</div>' +
    (sections || emptyBox('bi-journal', 'Belum ada jenis pembiayaan di Data Master.'));
}
function rkCetakHTML(sid) {
  const s = S.ix.siswa[sid], k = S.ix.kelas[s.id_kelas] || {}, w = S.ix.wali[s.id_wali] || {}, recs = tagihanSiswa(sid), prim = S.ix.primary[s.id_wali] === sid, fm = n => Math.round(n).toLocaleString('id-ID');
  const rows = []; rkJenisList(sid).forEach(j => recs.filter(r => r.t.id_jenis === j.id_jenis && j.sifat !== 'sukarela').sort((a, b) => natCmp(a.t.periode, b.t.periode)).forEach(r => rows.push({ j: j, r: r })));
  const own = rows.filter(x => !(x.r.perWali && !prim)), tT = own.reduce((a, x) => a + Number(x.r.t.nominal), 0), tP = own.reduce((a, x) => a + x.r.paid, 0), tS = own.reduce((a, x) => a + x.r.sisa, 0);
  const kw = r => { const g = {}; (S.ix.payBy[r.t.id_tagihan] || []).forEach(p => { g[p.no] = (g[p.no] || 0) + Number(p.jumlah); }); return Object.keys(g).map(n => esc(n)).join('<br>') || '—'; };
  return kopHTML() + '<h2>REKAPAN PEMBAYARAN SISWA</h2><div style="text-align:center;font-size:12px">Tahun Ajaran ' + esc(S.cfg.tahunAktif || '') + '</div>' +
    '<table class="meta nb"><tr><td>Nama Siswa</td><td>: ' + esc(s.nama) + '</td><td>Kelas</td><td>: ' + esc(k.nama_kelas || '-') + '</td></tr><tr><td>NISN</td><td>: ' + esc(s.nisn) + '</td><td>Wali Murid</td><td>: ' + esc(w.nama_wali || '-') + '</td></tr></table>' +
    '<table><thead><tr><th style="width:28px">No</th><th>Jenis Pembiayaan</th><th>Periode</th><th style="text-align:right">Tagihan</th><th style="text-align:right">Terbayar</th><th style="text-align:right">Sisa</th><th>No. Kwitansi</th></tr></thead><tbody>' +
    (rows.length ? rows.map((x, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(x.j.nama) + (x.r.perWali ? ' (per-wali' + (prim ? '' : ', ditanggung bersama') + ')' : '') + '</td><td>' + esc(perLbl(x.r.t.periode)) + '</td><td class="n">' + fm(x.r.t.nominal) + '</td><td class="n">' + fm(x.r.paid) + '</td><td class="n">' + fm(x.r.sisa) + '</td><td style="font-size:11px">' + kw(x.r) + '</td></tr>').join('') : '<tr><td colspan="7" style="text-align:center">Belum ada tagihan</td></tr>') +
    '<tr><td colspan="3"><b>TOTAL</b></td><td class="n"><b>' + fm(tT) + '</b></td><td class="n"><b>' + fm(tP) + '</b></td><td class="n"><b>' + fm(tS) + '</b></td><td></td></tr></tbody></table>' +
    '<div style="font-size:10px;margin-top:10px;border-top:1px solid #000;padding-top:4px">Dicetak oleh ' + esc(S.user.nama) + ' (' + esc(S.user.peran) + ') pada ' + tglPanjang(todayStr()) + ' ' + nowHM() + ' WIB melalui SADaM. Biaya per-wali dihitung satu kali untuk seluruh anak.</div>';
}
function rkCetak() { printHTML(rkCetakHTML(R2.sid), 'rpt'); }
/* Tab: ringkasan pemasukan per jenis per kelas */
function rkRingkas() {
  const js = S.m.jenis.concat([{ id_jenis: 'J-SRG', nama: 'Seragam' }]).filter((j, i, a) => a.findIndex(x => x.id_jenis === j.id_jenis) === i), agg = {};
  S.live.pembayaran.forEach(p => { if (p.status !== 'aktif' || (!RK.semua && ymOf(p.tanggal) !== S.bulan)) return; const t = S.ix.tg[p.id_tagihan]; if (!t) return; if (t.donatur) { const dd = agg.__donor = agg.__donor || {}; dd[t.id_jenis] = (dd[t.id_jenis] || 0) + Number(p.jumlah); return; } const sid = t.id_siswa || S.ix.primary[t.id_wali], s = S.ix.siswa[sid]; if (!s) return; const a = agg[s.id_kelas] = agg[s.id_kelas] || {}; a[t.id_jenis] = (a[t.id_jenis] || 0) + Number(p.jumlah); });
  const ks = S.m.kelas.slice().sort((a, b) => natCmp(a.nama_kelas, b.nama_kelas)), used = js.filter(j => ks.some(k => (agg[k.id_kelas] || {})[j.id_jenis]) || (agg.__donor || {})[j.id_jenis]);
  $('rkBody').innerHTML = '<div class="card tight"><div class="tw">' + (ks.length ? '<table class="t"><thead><tr><th>Kelas</th><th class="right">Siswa</th><th class="right">Menunggak</th>' + used.map(j => '<th class="right">' + esc(j.nama) + '</th>').join('') + '<th class="right">Total Masuk</th></tr></thead><tbody>' + ks.map(k => { const ss = S.m.siswa.filter(s => s.id_kelas === k.id_kelas), mn = ss.filter(s => tagihanSiswa(s.id_siswa).some(r => r.sisa > 0)).length, a = agg[k.id_kelas] || {}, tot = Object.values(a).reduce((x, y) => x + y, 0); return '<tr><td><b>Kelas ' + esc(k.nama_kelas) + '</b></td><td class="num">' + ss.length + '</td><td class="num" style="color:' + (mn ? 'var(--tunggak)' : 'var(--lunas)') + '">' + mn + '</td>' + used.map(j => '<td class="num">' + (a[j.id_jenis] ? rp(a[j.id_jenis]) : '–') + '</td>').join('') + '<td class="num"><b>' + rp(tot) + '</b></td></tr>'; }).join('') + (agg.__donor ? '<tr><td><b>Donatur luar</b></td><td class="num">–</td><td class="num">–</td>' + used.map(j => '<td class="num">' + (agg.__donor[j.id_jenis] ? rp(agg.__donor[j.id_jenis]) : '–') + '</td>').join('') + '<td class="num"><b>' + rp(Object.values(agg.__donor).reduce((x, y) => x + y, 0)) + '</b></td></tr>' : '') + '</tbody></table>' : emptyBox('bi-grid', 'Belum ada kelas.')) + '</div></div>';
}

/* ============================================================
 * LAPORAN BULANAN (F11) — formal, tanpa diagram, tanpa rincian siswa
 * ============================================================ */
function laporanHTML() {
  const ym = S.bulan, c = S.cfg, masuk = {}, keluar = {};
  S.live.pembayaran.forEach(p => { if (p.status !== 'aktif' || ymOf(p.tanggal) !== ym) return; const t = S.ix.tg[p.id_tagihan]; const n = t ? jenisNm(t.id_jenis) : 'Lainnya'; masuk[n] = (masuk[n] || 0) + Number(p.jumlah); });
  S.live.pengeluaran.forEach(x => { if (x.status !== 'aktif' || ymOf(x.tanggal) !== ym) return; keluar[x.kategori] = (keluar[x.kategori] || 0) + Number(x.jumlah); });
  const tm = Object.values(masuk).reduce((a, b) => a + b, 0), tk = Object.values(keluar).reduce((a, b) => a + b, 0), fm = n => Math.round(n).toLocaleString('id-ID');
  const tb = (o, t) => Object.keys(o).length ? Object.keys(o).map((k, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(k) + '</td><td class="n">' + fm(o[k]) + '</td></tr>').join('') + '<tr><td colspan="2"><b>Total ' + t + '</b></td><td class="n"><b>' + fm(Object.values(o).reduce((a, b) => a + b, 0)) + '</b></td></tr>' : '<tr><td colspan="3" style="text-align:center">Tidak ada transaksi</td></tr>';
  return kopHTML() + '<h2>LAPORAN KEUANGAN BULANAN</h2><div style="text-align:center">Periode: ' + bulanLbl(ym) + ' · Tahun Ajaran ' + esc(c.tahunAktif || '') + '</div>' +
    '<p><b>A. PEMASUKAN</b></p><table><thead><tr><th style="width:36px">No</th><th>Jenis Pembayaran</th><th style="text-align:right">Jumlah (Rp)</th></tr></thead><tbody>' + tb(masuk, 'Pemasukan') + '</tbody></table>' +
    '<p><b>B. PENGELUARAN</b></p><table><thead><tr><th style="width:36px">No</th><th>Kategori</th><th style="text-align:right">Jumlah (Rp)</th></tr></thead><tbody>' + tb(keluar, 'Pengeluaran') + '</tbody></table>' +
    '<p><b>C. SALDO</b></p><table><tbody><tr><td>Total Pemasukan</td><td class="n">' + fm(tm) + '</td></tr><tr><td>Total Pengeluaran</td><td class="n">' + fm(tk) + '</td></tr><tr><td><b>Selisih / Saldo Bulan Ini</b></td><td class="n"><b>' + fm(tm - tk) + '</b></td></tr></tbody></table>' +
    tbNote() + '<table class="nb" style="margin-top:14px"><tr><td style="width:50%;text-align:center;border:0">Mengetahui,<br>Kepala Madrasah<br><br><br><br><u>' + esc(c.kepala || '(…………………………)') + '</u><br><small>' + (c.nipKepala ? 'NIP. ' + esc(c.nipKepala) : '') + '</small></td><td style="width:50%;text-align:center;border:0"><br>Bendahara<br><br><br><br><u>' + esc(namaBendahara() || '(…………………………)') + '</u><br><small>' + (c.bendaharaNip ? 'NIP. ' + esc(c.bendaharaNip) : '') + '</small></td></tr></table>';
}
const LP = { tab: 'bulan', ta: '' };
RENDER.laporan = function () {
  const tas = (S.m.tahun || []).map(t => t.nama); if (!LP.ta) LP.ta = S.cfg.tahunAktif || (tas[0] || '');
  $('s-laporan').innerHTML = pageHead('Laporan', LP.tab === 'bulan' ? 'Pilih bulan di bilah atas. Laporan formal berkop madrasah dengan kolom pengesahan — tanpa diagram dan tanpa rincian per siswa.' : 'Rekap penerima keringanan biaya / beasiswa dan nilai biaya yang dibebaskan, per tahun ajaran.', '<button class="btn" onclick="lapPdf()"><i class="bi bi-filetype-pdf"></i>Simpan PDF ke Drive</button><button class="btn pri" onclick="lapCetak()"><i class="bi bi-printer"></i>Cetak (A4)</button>') +
    '<div class="tabs"><button class="' + (LP.tab === 'bulan' ? 'on' : '') + '" onclick="LP.tab=\'bulan\';RENDER.laporan()">Laporan Bulanan</button><button class="' + (LP.tab === 'kf' ? 'on' : '') + '" onclick="LP.tab=\'kf\';RENDER.laporan()">Penerima Keringanan</button></div>' +
    (LP.tab === 'bulan' ? '<div id="tbBox"></div><div style="overflow:auto"><div class="paper" id="lapBox" style="max-width:820px"></div></div>' : '<div class="row wrap" style="margin-bottom:12px"><label class="chip" for="lapTa">Tahun ajaran</label><select class="in" id="lapTa" style="width:auto" onchange="LP.ta=this.value;RENDER.laporan.upd()">' + tas.map(x => '<option ' + (x === LP.ta ? 'selected' : '') + '>' + esc(x) + '</option>').join('') + '</select></div><div style="overflow:auto"><div class="paper" id="lapKfBox" style="max-width:820px"></div></div>');
  RENDER.laporan.upd();
};
RENDER.laporan.upd = function () { if (LP.tab === 'bulan') { if ($('tbBox')) $('tbBox').innerHTML = tbPanel(); if ($('lapBox')) $('lapBox').innerHTML = laporanHTML(); } else if ($('lapKfBox')) $('lapKfBox').innerHTML = kfLaporanHTML(LP.ta); };
const lapCetak = () => printHTML(LP.tab === 'bulan' ? laporanHTML() : kfLaporanHTML(LP.ta), 'rpt');
function lapPdf() { if (LP.tab === 'bulan') return pdfLaporan(); toast('Membuat PDF…'); api('simpanPdf', PDF_CSS + '<div style="font-family:Times New Roman,serif;font-size:13px">' + kfLaporanHTML(LP.ta) + '</div>', 'Penerima-Keringanan-' + LP.ta.replace('/', '-')).then(r => r.success ? toast('PDF tersimpan. <a href="' + r.data.url + '" target="_blank" rel="noopener" style="color:#66ff8e">Buka di Drive</a>') : toast(r.message, 'err')).catch(e => toast(e.message, 'err')); }
function pdfLaporan() { toast('Membuat PDF…'); api('simpanPdf', PDF_CSS + '<div style="font-family:Times New Roman,serif;font-size:13px">' + laporanHTML() + '</div>', 'Laporan-' + S.bulan).then(r => r.success ? toast('PDF tersimpan. <a href="' + r.data.url + '" target="_blank" rel="noopener" style="color:#66ff8e">Buka di Drive</a>') : toast(r.message, 'err')).catch(e => toast(e.message, 'err')); }

/* ============================================================
 * DATA MASTER (F2) — CRUD optimistik
 * ============================================================ */
const MS = {
  kelas: { sheet: 'Kelas', key: 'id_kelas', pre: 'K-', t: 'Kelas', cols: [['nama_kelas', 'Nama Kelas'], ['wali_kelas_email', 'Username Wali Kelas'], ['tahun_ajaran', 'Tahun Ajaran']] },
  siswa: { sheet: 'Siswa', key: 'id_siswa', pre: 'S-', t: 'Siswa', cols: [['nisn', 'NISN'], ['nama', 'Nama Siswa'], ['id_kelas', 'Kelas', 'kelas'], ['id_wali', 'Wali', 'wali'], ['status_aktif', 'Status', ['Aktif', 'Nonaktif']]] },
  wali: { sheet: 'Wali', key: 'id_wali', pre: 'W-', t: 'Wali', cols: [['nama_wali', 'Nama Wali'], ['no_whatsapp', 'No. WhatsApp (62…)']] },
  jenis: { sheet: 'JenisPembiayaan', key: 'id_jenis', pre: 'J-', t: 'Jenis Pembiayaan', cols: [['nama', 'Nama'], ['basis_tagihan', 'Basis Tagihan', ['per siswa', 'per wali']], ['periode', 'Periode', ['bulanan', 'sekali', 'per semester']], ['keterangan', 'Keterangan']] },
  seragam: { sheet: 'ItemSeragam', key: 'id_item', pre: 'SRG-', t: 'Item Seragam', cols: [['nama', 'Nama Item'], ['bagian', 'Bagian', ['set', 'atas', 'bawah']], ['harga', 'Harga (Rp)', 'num'], ['stok', 'Stok', 'num']] }
};
const M = { tab: 'siswa', q: '', pg: 1 };
RENDER.master = function () { mRender(); }; RENDER.master.upd = function () { };
function mRender() {
  const tabs = [['siswa', 'Siswa'], ['wali', 'Wali'], ['kelas', 'Kelas'], ['jenis', 'Jenis Pembayaran & Tarif'], ['keringanan', 'Keringanan & Beasiswa'], ['seragam', 'Item Seragam'], ['tagihan', 'Buat Tagihan'], ['impor', 'Impor Excel/CSV'], ['tahun', 'Tahun Ajaran &amp; Kenaikan']];
  $('s-master').innerHTML = pageHead('Data Master', 'Kelola kelas, siswa, wali, jenis pembiayaan, tarif per kelas, dan impor data.', '') + '<div class="tabs">' + tabs.map(t => '<button class="' + (M.tab === t[0] ? 'on' : '') + '" onclick="M.tab=\'' + t[0] + '\';M.pg=1;M.q=\'\';mRender()">' + t[1] + '</button>').join('') + '</div><div id="mBodyX"></div>';
  const fx = { jenis: mJenis, keringanan: mKeringanan, tagihan: mTagihan, impor: mImpor, tahun: mTahun }[M.tab]; fx ? fx() : mTable();
}
function mOpts(src) { return src === 'kelas' ? S.m.kelas.map(k => [k.id_kelas, k.nama_kelas]) : src === 'wali' ? S.m.wali.map(w => [w.id_wali, w.nama_wali + ' (+' + w.no_whatsapp + ')']) : src.map(x => [x, x]); }
function mTable() {
  const sp = MS[M.tab], q = M.q.toLowerCase(); let l = S.m[M.tab] || []; if (q) l = l.filter(r => JSON.stringify(r).toLowerCase().includes(q));
  const per = 12, rows = l.slice((M.pg - 1) * per, M.pg * per), show = (r, c) => { const t = c[2]; if (t === 'kelas') return esc(kelasNm(r[c[0]])); if (t === 'wali') return esc((S.ix.wali[r[c[0]]] || {}).nama_wali || '-'); if (t === 'num') return '<span class="mono">' + Number(r[c[0]] || 0).toLocaleString('id-ID') + '</span>'; return esc(r[c[0]]); };
  $('mBodyX').innerHTML = '<div class="card tight"><div class="row wrap" style="padding:8px 16px 12px"><div class="search grow"><i class="bi bi-search"></i><input class="in" placeholder="Cari…" value="' + esc(M.q) + '" oninput="M.q=this.value;M.pg=1;mTable()" id="mQ"></div>' + (M.tab === 'siswa' ? '<button class="btn danger" onclick="sbForm()"><i class="bi bi-trash"></i>Hapus Massal</button>' : '') + '<button class="btn pri" onclick="mForm()"><i class="bi bi-plus-lg"></i>Tambah ' + sp.t + '</button></div><div class="tw"><table class="t"><thead><tr>' + sp.cols.map(c => '<th>' + c[1] + '</th>').join('') + '<th></th></tr></thead><tbody>' + (rows.length ? rows.map(r => '<tr>' + sp.cols.map(c => '<td>' + show(r, c) + '</td>').join('') + '<td class="right nowrap"><button class="btn sm" onclick="mForm(\'' + esc(r[sp.key]) + '\')" aria-label="Ubah"><i class="bi bi-pencil"></i></button> <button class="btn sm danger" onclick="mHapus(\'' + esc(r[sp.key]) + '\')" aria-label="Hapus" title="Hapus"><i class="bi bi-trash"></i></button></td></tr>').join('') : '<tr><td colspan="9">' + emptyBox('bi-database', 'Belum ada data.') + '</td></tr>') + '</tbody></table></div>' + pager('m', l.length, M.pg, per, 'mPage') + '</div>';
  const q2 = $('mQ'); if (q2 && document.activeElement !== q2 && M.q) { }
}
function mPage(n) { M.pg = n; mTable(); }
function mForm(id) {
  const sp = MS[M.tab], r = id ? S.m[M.tab].find(x => String(x[sp.key]) === String(id)) : {};
  openModal((id ? 'Ubah ' : 'Tambah ') + sp.t, sp.cols.map(c => { const t = c[2], v = r[c[0]] == null ? '' : r[c[0]]; return '<label class="l" for="f_' + c[0] + '">' + c[1] + '</label>' + ((t && t !== 'num') ? '<select class="in" id="f_' + c[0] + '">' + mOpts(t).map(o => '<option value="' + esc(o[0]) + '" ' + (String(o[0]) === String(v) ? 'selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>' : '<input class="in" id="f_' + c[0] + '" ' + (t === 'num' ? 'inputmode="numeric"' : '') + ' value="' + esc(v) + '">'); }).join('') + '<div class="errmsg hide" id="fErr"></div>',
    '<button class="btn" onclick="closeModal()">Batal</button>' + (id && sp.sheet === 'Siswa' ? '<button class="btn danger" onclick="mNon(\'' + esc(id) + '\')">Nonaktifkan</button>' : '') + '<button class="btn pri" onclick="mSave(\'' + esc(id || '') + '\')">Simpan</button>');
}
function mSave(id) {
  const sp = MS[M.tab], rec = id ? Object.assign({}, S.m[M.tab].find(x => String(x[sp.key]) === String(id))) : {}; sp.cols.forEach(c => { let v = $('f_' + c[0]).value.trim(); if (c[2] === 'num') v = v === '' ? '' : num(v); rec[c[0]] = v; });
  if (!id) { const ada = v => S.m[M.tab].some(x => String(x[sp.key]) === v); let tries = 0; do { rec[sp.key] = sp.pre + uuid().slice(1, 7).toUpperCase(); } while (ada(rec[sp.key]) && ++tries < 50); if (ada(rec[sp.key])) { const base = rec[sp.key]; let n = 1; while (ada(base + n)) n++; rec[sp.key] = base + n; } }   // ID baru dijamin tidak menimpa data yang ada if (rec.status_aktif === undefined && sp.sheet === 'Siswa') rec.status_aktif = 'Aktif';
  const req = sp.cols[0][0]; if (!rec[req] || (sp.sheet === 'Siswa' && (!rec.id_kelas || !rec.id_wali))) { $('fErr').textContent = 'Lengkapi data wajib (siswa harus punya kelas dan satu wali).'; $('fErr').classList.remove('hide'); return; }
  if (sp.sheet === 'Wali') rec.no_whatsapp = String(rec.no_whatsapp).replace(/[^0-9]/g, '').replace(/^0/, '62');
  const snap = clone(S.m[M.tab]); const i = S.m[M.tab].findIndex(x => x[sp.key] === rec[sp.key]); if (i >= 0) S.m[M.tab][i] = rec; else S.m[M.tab].unshift(rec);
  closeModal(); reindex(); mTable(); persist(); toast('Tersimpan.');
  api('simpanMaster', sp.sheet, rec).then(r => { if (!r.success) { S.m[M.tab] = snap; reindex(); mTable(); toast(r.message, 'err'); } }).catch(e => { S.m[M.tab] = snap; reindex(); mTable(); toast(e.message, 'err'); });
}
function mNon(id) { const sp = MS.siswa, r = S.m.siswa.find(x => x.id_siswa === id); if (!r) return; closeModal(); const old = r.status_aktif; r.status_aktif = 'Nonaktif'; mTable(); api('nonaktifkanMaster', 'Siswa', id).then(x => { if (!x.success) { r.status_aktif = old; mTable(); toast(x.message, 'err'); } else toast('Siswa dinonaktifkan.'); }); }
function mJenis() {
  const ta = S.cfg.tahunAktif || '', ks = S.m.kelas, js = S.m.jenis.filter(x => x.id_jenis !== 'J-SRG');
  $('mBodyX').innerHTML = '<div id="tfBanner">' + tarifBanner() + '</div><div class="row wrap" style="justify-content:space-between;margin-bottom:12px"><div class="muted sm">Tarif T.A. <b>' + esc(ta) + '</b> per kelas — ubah langsung di tabel, tersimpan otomatis. <b>Tarif hanya dipakai saat tagihan dibuat</b>; tagihan yang sudah ada tidak berubah sendiri (lihat kotak kuning bila ada selisih). Seragam dikelola di tab Item Seragam.</div><button class="btn pri" onclick="jForm()"><i class="bi bi-plus-lg"></i>Tambah Jenis Pembayaran</button></div><div class="card tight"><div class="tw"><table class="t"><thead><tr><th>Jenis Pembayaran</th><th>Status</th>' + ks.map(k => '<th class="right">Kelas ' + esc(k.nama_kelas) + '</th>').join('') + '<th></th></tr></thead><tbody>' + (js.length ? js.map(j => { const off = j.status_aktif === 'Nonaktif'; return '<tr style="' + (off ? 'opacity:.55' : '') + '"><td><b>' + esc(j.nama) + '</b><br><span class="muted sm">' + (j.sifat === 'sukarela' ? '<b>Sukarela</b> — nominal bebas, tanpa tagihan' : esc(j.basis_tagihan) + ' · ' + esc(j.periode)) + (j.keterangan ? ' · ' + esc(j.keterangan) : '') + '</span></td><td>' + stPill(off ? 'Dibatalkan' : 'Lunas', off ? 'Nonaktif' : 'Aktif') + '</td>' + ks.map(k => { if (j.sifat === 'sukarela') return '<td class="muted right">—</td>'; const t = S.m.tarif.find(x => x.id_jenis === j.id_jenis && x.id_kelas === k.id_kelas && String(x.tahun_ajaran) === ta); return '<td><input class="in mono" style="text-align:right;min-width:96px" inputmode="numeric" value="' + (t ? Number(t.nominal).toLocaleString('id-ID') : '') + '" aria-label="Tarif ' + esc(j.nama) + ' kelas ' + esc(k.nama_kelas) + '" onchange="saveTarif(\'' + j.id_jenis + '\',\'' + k.id_kelas + '\',this)"></td>'; }).join('') + '<td class="right nowrap"><button class="btn sm" aria-label="Ubah" onclick="jForm(\'' + j.id_jenis + '\')"><i class="bi bi-pencil"></i></button> <button class="btn sm danger" aria-label="Hapus" title="Hapus jenis" onclick="jHapus(\'' + j.id_jenis + '\')"><i class="bi bi-trash"></i></button></td></tr>'; }).join('') : '<tr><td colspan="' + (ks.length + 3) + '">' + emptyBox('bi-cash-coin', 'Belum ada jenis pembayaran.') + '</td></tr>') + '</tbody></table></div></div>';
}
const mTarif = mJenis;
function jForm(id) {
  const r = id ? S.m.jenis.find(x => x.id_jenis === id) : { basis_tagihan: 'per siswa', periode: 'bulanan', status_aktif: 'Aktif', sifat: 'wajib' }, ta = S.cfg.tahunAktif || '';
  const sel = (idf, opts, v) => '<select class="in" id="' + idf + '">' + opts.map(o => '<option ' + (o === v ? 'selected' : '') + '>' + o + '</option>').join('') + '</select>';
  openModal(id ? 'Ubah Jenis Pembayaran' : 'Tambah Jenis Pembayaran',
    '<label class="l" style="margin-top:0" for="jN">Nama jenis pembayaran</label><input class="in" id="jN" placeholder="Contoh: Study Tour, Wisuda, Ekstrakurikuler" value="' + esc(r.nama || '') + '">' +
    '<label class="l" for="jSf">Sifat pembayaran</label><select class="in" id="jSf" onchange="jSifat()"><option value="wajib"' + (r.sifat === 'sukarela' ? '' : ' selected') + '>Wajib — ditagihkan ke siswa/wali</option><option value="sukarela"' + (r.sifat === 'sukarela' ? ' selected' : '') + '>Sukarela — nominal bebas, tanpa tagihan (infak)</option></select><div class="jw' + (r.sifat === 'sukarela' ? ' hide' : '') + '"><div class="grid g2"><div><label class="l" for="jB">Basis tagihan</label>' + sel('jB', ['per siswa', 'per wali'], r.basis_tagihan) + '</div><div><label class="l" for="jP">Periode</label>' + sel('jP', ['bulanan', 'sekali', 'per semester'], r.periode) + '</div></div>' +
    '<div class="hint"><b>per wali</b> = ditagih sekali per wali (kakak-adik tidak ditagih ganda). <b>bulanan</b> = tagihan baru tiap bulan.</div></div>' +
    '<label class="l" for="jK">Keterangan (opsional)</label><input class="in" id="jK" value="' + esc(r.keterangan || '') + '">' + (id ? '<label class="l" for="jS">Status</label>' + sel('jS', ['Aktif', 'Nonaktif'], r.status_aktif || 'Aktif') : '') +
    '<div class="jw' + (r.sifat === 'sukarela' ? ' hide' : '') + '"><label class="l">Tarif T.A. ' + esc(ta) + ' (opsional, bisa diisi nanti)</label><div class="row" style="margin-bottom:8px"><input class="in mono" id="jAll" inputmode="numeric" placeholder="Isi sama untuk semua kelas" oninput="jFill(this)"></div><div class="grid g2">' + S.m.kelas.map(k => { const t = id ? S.m.tarif.find(x => x.id_jenis === id && x.id_kelas === k.id_kelas && String(x.tahun_ajaran) === ta) : null; return '<div class="row" style="gap:6px"><span class="cls" style="min-width:42px;text-align:center">' + esc(k.nama_kelas) + '</span><input class="in mono jt" data-k="' + k.id_kelas + '" inputmode="numeric" style="text-align:right" value="' + (t ? Number(t.nominal).toLocaleString('id-ID') : '') + '" oninput="this.value=num(this.value)?num(this.value).toLocaleString(\'id-ID\'):\'\'"></div>'; }).join('') + '</div></div><div class="errmsg hide" id="jErr"></div>',
    '<button class="btn" onclick="closeModal()">Batal</button>' + (id ? '<button class="btn danger" onclick="jHapus(\'' + id + '\')"><i class="bi bi-trash"></i>Hapus</button>' : '') + '<button class="btn pri" onclick="jSave(\'' + (id || '') + '\')">Simpan</button>');
}
function jSifat() { const s = $('jSf').value === 'sukarela'; document.querySelectorAll('.jw').forEach(e => e.classList.toggle('hide', s)); }
function jHapus(id) {
  const j = S.m.jenis.find(x => x.id_jenis === id); if (!j) return; const n = S.live.tagihan.filter(t => t.id_jenis === id).length;
  if (n) return openModal('Jenis “' + j.nama + '” tidak dapat dihapus', '<div class="note" style="background:var(--sebagian-bg);align-items:flex-start"><i class="bi bi-info-circle"></i><span>Jenis ini sudah dipakai pada <b>' + n + ' tagihan</b>. Menghapusnya akan merusak riwayat dan kwitansi, jadi hanya bisa <b>dinonaktifkan</b>: tidak muncul lagi untuk tagihan/transaksi baru, riwayat tetap utuh.</span></div>', '<button class="btn" onclick="closeModal()">Tutup</button>' + (j.status_aktif === 'Nonaktif' ? '' : '<button class="btn pri" onclick="jNonaktif(\'' + id + '\')">Nonaktifkan</button>'));
  openModal('Hapus jenis “' + j.nama + '”?', '<p class="muted" style="margin-top:0">Jenis ini <b>belum pernah ditagihkan</b>. Akan dihapus permanen beserta <b>tarif per kelasnya</b>.</p>', '<button class="btn" onclick="closeModal()">Batal</button><button class="btn danger" id="jhBtn" onclick="doHapusJenis(\'' + id + '\')"><i class="bi bi-trash"></i>Hapus Permanen</button>');
}
function jNonaktif(id) {
  const j = S.m.jenis.find(x => x.id_jenis === id); if (!j) return;
  api('simpanJenis', Object.assign({}, j, { status_aktif: 'Nonaktif' }), {}).then(r => { if (!r.success) return toast(r.message, 'err'); j.status_aktif = 'Nonaktif'; reindex(); persist(); closeModal(); mJenis(); toast('Jenis dinonaktifkan.'); }).catch(e => toast(e.message, 'err'));
}
function doHapusJenis(id) {
  const b = $('jhBtn'); if (b) b.disabled = true;
  api('hapusJenis', id).then(r => { if (!r.success) { if (b) b.disabled = false; return toast(r.message, 'err'); } S.m.jenis = S.m.jenis.filter(x => x.id_jenis !== id); if (r.data && r.data.tarif) S.m.tarif = r.data.tarif; reindex(); persist(); closeModal(); mJenis(); toast('Jenis pembayaran dihapus.'); }).catch(e => { if (b) b.disabled = false; toast(e.message, 'err'); });
}
function jFill(el) { const v = num(el.value); el.value = v ? v.toLocaleString('id-ID') : ''; document.querySelectorAll('.jt').forEach(i => i.value = v ? v.toLocaleString('id-ID') : ''); }
function jSave(id) {
  const nama = $('jN').value.trim(), err = m => { $('jErr').textContent = m; $('jErr').classList.remove('hide'); };
  if (!nama) return err('Nama jenis pembayaran wajib diisi.'); if (S.m.jenis.some(x => x.id_jenis !== id && x.nama.toLowerCase() === nama.toLowerCase())) return err('Nama jenis sudah ada.');
  const rec = { id_jenis: id || 'J-' + uuid().slice(1, 7).toUpperCase(), nama: nama, basis_tagihan: $('jB').value, periode: $('jP').value, keterangan: $('jK').value.trim(), status_aktif: id ? $('jS').value : 'Aktif', sifat: $('jSf').value };
  if (rec.sifat === 'sukarela') { rec.basis_tagihan = 'per siswa'; rec.periode = 'sekali'; }
  const map = {}, ta = S.cfg.tahunAktif || ''; document.querySelectorAll('.jt').forEach(i => { if (rec.sifat === 'sukarela') return; const v = num(i.value); if (v > 0 || i.value === '') { if (v > 0) map[i.dataset.k] = v; } });
  const sj = clone(S.m.jenis), st = clone(S.m.tarif), i = S.m.jenis.findIndex(x => x.id_jenis === rec.id_jenis); if (i >= 0) S.m.jenis[i] = rec; else S.m.jenis.push(rec);
  Object.keys(map).forEach(k => { const t = S.m.tarif.find(x => x.id_jenis === rec.id_jenis && x.id_kelas === k && String(x.tahun_ajaran) === ta); if (t) t.nominal = map[k]; else S.m.tarif.push({ id_jenis: rec.id_jenis, id_kelas: k, tahun_ajaran: ta, nominal: map[k] }); });
  closeModal(); reindex(); mJenis(); persist(); toast(id ? 'Jenis pembayaran diperbarui.' : 'Jenis pembayaran ditambahkan. Buat tagihannya di tab “Buat Tagihan”.');
  api('simpanJenis', rec, map).then(r => { if (!r.success) { S.m.jenis = sj; S.m.tarif = st; reindex(); mJenis(); toast(r.message, 'err'); } else { S.m.tarif = r.data.tarif; persist(); } }).catch(e => { S.m.jenis = sj; S.m.tarif = st; reindex(); mJenis(); toast(e.message, 'err'); });
}
function saveTarif(j, k, el) {
  const v = num(el.value), ta = S.cfg.tahunAktif || '', rec = { id_jenis: j, id_kelas: k, tahun_ajaran: ta, nominal: v }; el.value = v ? v.toLocaleString('id-ID') : ''; const snap = clone(S.m.tarif);
  const i = S.m.tarif.findIndex(x => x.id_jenis === j && x.id_kelas === k && String(x.tahun_ajaran) === ta); if (i >= 0) S.m.tarif[i] = rec; else S.m.tarif.push(rec); persist();
  api('simpanMaster', 'TarifKelas', rec).then(r => { if (r.success) { toast('Tarif disimpan.'); const bn = $('tfBanner'); if (bn) bn.innerHTML = tarifBanner(); } else { S.m.tarif = snap; mJenis(); toast(r.message, 'err'); } }).catch(e => { S.m.tarif = snap; mJenis(); toast(e.message, 'err'); });
}
function mTagihan() {
  const js = S.m.jenis.filter(j => j.id_jenis !== 'J-SRG' && j.status_aktif !== 'Nonaktif' && j.sifat !== 'sukarela');
  $('mBodyX').innerHTML = '<div class="note"><i class="bi bi-info-circle"></i>Tagihan dibuat dari tarif per kelas. <b>SPP</b> bulanan per siswa; <b>infak/khataman</b> ditagih <b>sekali per wali</b> (nominal = tarif tertinggi di antara kelas anak-anaknya). Aman diulang — tidak menggandakan.</div><div class="grid g3">' + js.map(j => '<div class="card"><b>' + esc(j.nama) + '</b> <span class="st ' + (j.basis_tagihan === 'per wali' ? 'Wali' : 'Lunas') + '">' + esc(j.basis_tagihan) + '</span><div class="muted sm">' + esc(j.periode) + '</div>' + (j.periode === 'bulanan' ? '<input class="in" type="month" id="gp_' + j.id_jenis + '" value="' + S.bulan + '" style="margin-top:8px" aria-label="Dari bulan"><input class="in" type="month" id="gs_' + j.id_jenis + '" style="margin-top:6px" aria-label="Sampai bulan (opsional, untuk banyak bulan sekaligus)" title="Sampai bulan (opsional)"><div class="row wrap" style="gap:6px;margin-top:6px">' + ['tahun', 'ganjil', 'genap'].map(k => '<button class="btn sm" type="button" onclick="tagPreset(\'' + j.id_jenis + '\',\'' + k + '\')">' + ({ tahun: 'Setahun', ganjil: 'Sem. ganjil', genap: 'Sem. genap' })[k] + '</button>').join('') + '</div><div class="muted sm" style="margin-top:4px">Kosongkan “sampai bulan” untuk membuat satu bulan saja.</div>' : '') + '<button class="btn pri" style="margin-top:10px;width:100%" onclick="genTagihan(\'' + j.id_jenis + '\',this)"><i class="bi bi-magic"></i>Buat Tagihan</button></div>').join('') + '</div>';
}
function tagPreset(id, k) { const y = Number(String(S.cfg.tahunAktif || '').slice(0, 4)); if (!y) return; const r = { tahun: [y + '-07', (y + 1) + '-06'], ganjil: [y + '-07', y + '-12'], genap: [(y + 1) + '-01', (y + 1) + '-06'] }[k]; if ($('gp_' + id)) $('gp_' + id).value = r[0]; if ($('gs_' + id)) $('gs_' + id).value = r[1]; }
function genTagihan(id, btn) {
  const el = $('gp_' + id), sp = $('gs_' + id), dari = el ? el.value : '', sampai = sp ? sp.value : ''; btn.disabled = true; btn.innerHTML = '<span class="spin" style="width:14px;height:14px;border-width:2px"></span> Memproses…';
  (sampai && sampai !== dari ? api('generateTagihanRentang', id, dari, sampai) : api('generateTagihanJenis', id, dari)).then(r => { btn.disabled = false; btn.innerHTML = '<i class="bi bi-magic"></i>Buat Tagihan'; if (r.success) { setLive(r.data.live); toast(r.message); } else toast(r.message, 'err'); }).catch(e => { btn.disabled = false; toast(e.message, 'err'); });
}
function mImpor() {
  $('mBodyX').innerHTML = '<div class="card"><h3>Impor Siswa &amp; Wali</h3><p class="muted">Format kolom: <span class="mono">NISN, Nama, Kelas, Nama Wali, No WhatsApp</span> (CSV atau tempel dari Excel). Wali dengan nomor WA sama otomatis digabung (kakak-adik).</p><div class="row wrap"><button class="btn" onclick="tplCSV()"><i class="bi bi-download"></i>Unduh templat</button><input type="file" id="impFile" accept=".csv,.txt,.tsv" class="in" style="max-width:300px" onchange="impFile(this)"></div><label class="l" for="impTxt">Atau tempel data di sini</label><textarea class="in mono" id="impTxt" style="min-height:160px" placeholder="0098234120,Muhammad Farhan,8B,H. Bambang,081234567890"></textarea><button class="btn pri" style="margin-top:12px" id="impBtn" onclick="doImpor()"><i class="bi bi-upload"></i>Validasi &amp; Impor</button><div id="impRes" style="margin-top:14px"></div></div>';
}
function tplCSV() { downloadCSV('templat-impor-siswa.csv', [['NISN', 'Nama', 'Kelas', 'Nama Wali', 'No WhatsApp'], ['0098234999', 'Contoh Siswa', '7A', 'Contoh Wali', '081200000000']]); }
function impFile(el) { const f = el.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { $('impTxt').value = r.result; }; r.readAsText(f); }
async function doImpor() {
  const lines = $('impTxt').value.split(/\r?\n/).filter(l => l.trim()); let rows = lines.map(l => l.split(/[,;\t]/).map(x => x.replace(/^"|"$/g, '').trim())); if (rows.length && /nisn/i.test(rows[0][0])) rows.shift();
  if (!rows.length) return toast('Tidak ada data untuk diimpor.', 'err'); const btn = $('impBtn'); btn.disabled = true; let ok = 0, gagal = [];
  for (let i = 0; i < rows.length; i += 200) { $('impRes').innerHTML = '<div class="muted">Memproses ' + Math.min(i + 200, rows.length) + ' / ' + rows.length + '…</div><div class="bar"><i style="width:' + Math.round(i / rows.length * 100) + '%"></i></div>'; try { const r = await api('imporSiswa', rows.slice(i, i + 200)); if (r.success) { ok += r.data.berhasil; r.data.gagal.forEach(g => gagal.push({ baris: g.baris + i, alasan: g.alasan })); } else { toast(r.message, 'err'); break; } } catch (e) { toast(e.message, 'err'); break; } }
  btn.disabled = false; $('impRes').innerHTML = '<div class="note"><i class="bi bi-check-circle"></i><b>' + ok + '</b> siswa berhasil, <b>' + gagal.length + '</b> baris gagal.</div>' + (gagal.length ? '<table class="t"><thead><tr><th>Baris</th><th>Alasan</th></tr></thead><tbody>' + gagal.map(g => '<tr><td>' + g.baris + '</td><td>' + esc(g.alasan) + '</td></tr>').join('') + '</tbody></table>' : '');
  const b = await api('bootstrap'); if (b.success) { applyData(b.data); saveSnap(b.data); mRender(); }
}

/* ============================================================
 * PENGGUNA & PENGATURAN
 * ============================================================ */
const PT = { tab: 'tampilan' };
const WARNA = ['#1B4332', '#0B5D3B', '#0F766E', '#1E40AF', '#6D28D9', '#9F1239', '#92400E', '#334155'];
RENDER.pengaturan = function (o) { pRender(o); }; RENDER.pengaturan.upd = function () { };
const cfgIn = (k, label, ph) => '<label class="l" for="cf_' + k + '">' + label + '</label><input class="in" id="cf_' + k + '" value="' + esc(S.cfg[k] || '') + '" placeholder="' + esc(ph || '') + '">';
function logoBox(key, title, sub, dark) {
  const v = S.cfg[key]; return '<div class="lg-box"><div class="lg-prev" style="background:' + (dark ? 'var(--sidebar)' : '#fff') + ';border:1px solid var(--border)">' + (v ? '<img src="' + v + '" alt="' + title + '" style="max-height:72px;max-width:72px;object-fit:contain">' : '<i class="bi bi-image" style="font-size:28px;color:#9aa"></i>') + '</div><b class="sm">' + title + '</b><div class="muted sm">' + sub + '</div><div class="row" style="justify-content:center;margin-top:8px"><label class="btn sm" style="cursor:pointer"><i class="bi bi-upload"></i>Unggah<input type="file" accept="image/*" hidden onchange="pickLogo(\'' + key + '\',this)"></label>' + (v ? '<button class="btn sm danger" onclick="setLogo(\'' + key + '\',\'\')" aria-label="Hapus logo"><i class="bi bi-trash"></i></button>' : '') + '</div></div>';
}
function pRender(o) {
  if (o && o.tab) PT.tab = o.tab; const tabs = [['tampilan', 'Tampilan & Merek'], ['kop', 'Kop & Identitas'], ['metode', 'Metode & Rekening'], ['kwitansi', 'Kwitansi & Watermark'], ['pengguna', 'Pengguna & Peran'], ['format', 'Format & Pesan'], ['sistem', 'Sistem']]; let body = '';
  if (PT.tab === 'tampilan') {
    const cur = /^#[0-9a-f]{6}$/i.test(S.cfg.warnaUtama || '') ? S.cfg.warnaUtama : '#1B4332', off = modOff();
    body = '<div class="grid g2"><div class="card"><h3>Merek Aplikasi</h3>' + '<div class="grid g2" style="margin-top:10px">' + logoBox('logoApp', 'Logo Aplikasi', 'Tampil di menu samping', true) + '<div>' + cfgIn('appName', 'Nama aplikasi', 'SADaM') + cfgIn('appSub', 'Subjudul', 'Sistem Administrasi Digital Madrasah') + '</div></div>' +
      '<label class="l">Warna utama</label><div class="row wrap" style="gap:8px">' + WARNA.map(w => '<button class="swatch ' + (w.toLowerCase() === cur.toLowerCase() ? 'on' : '') + '" style="background:' + w + '" aria-label="Warna ' + w + '" onclick="pickWarna(\'' + w + '\')"></button>').join('') + '<input type="color" id="cf_warnaUtama" value="' + cur + '" oninput="pickWarna(this.value)" style="width:34px;height:28px;border:0;background:none;padding:0" aria-label="Warna kustom"></div><div class="hint">Mengubah warna menu samping, tombol utama, dan grafik. Pratinjau langsung; klik Simpan agar berlaku untuk semua pengguna.</div></div>' +
      '<div class="card"><h3>Menu / Modul Aktif</h3><p class="muted sm" style="margin:2px 0 8px">Sembunyikan modul yang belum dipakai madrasah agar menu lebih ringkas. Dashboard, Pembayaran, dan Tagihan selalu aktif.</p>' + MODUL.map(m => '<label class="chk"><input type="checkbox" class="modchk" value="' + m[0] + '" ' + (off.includes(m[0]) ? '' : 'checked') + '> ' + m[1] + '</label>').join('') + '<div class="hint" style="margin-top:8px">Ukuran tampilan &amp; tema diatur per perangkat lewat tombol <i class="bi bi-sliders"></i> di bilah atas.</div></div></div><button class="btn pri" style="margin-top:12px" onclick="saveBrand()"><i class="bi bi-save"></i>Simpan Tampilan</button>' + kreditCard() + fotoCard();
  } else if (PT.tab === 'kop') {
    body = '<div class="grid g2"><div class="card"><h3>Identitas &amp; Kop Surat</h3><div style="max-width:200px;margin-top:10px">' + logoBox('logoKop', 'Logo Madrasah', 'Di kiri kop kwitansi &amp; laporan') + '</div>' +
      cfgIn('kop1', 'Baris 1 — Yayasan / instansi', 'YAYASAN AN-NUR') + cfgIn('kop2', 'Baris tambahan (opsional)', '') + cfgIn('namaMadrasah', 'Nama madrasah', 'MADRASAH IBTIDAIYAH (MI) AN-NUR') + cfgIn('alamat', 'Alamat / kontak', 'KARANGJATI SIDOAGUNG SRUWENG KEBUMEN 54362') +
      '<div class="grid g2">' + '<div>' + cfgIn('kepala', 'Kepala Madrasah', '') + '</div><div>' + cfgIn('nipKepala', 'NIP Kepala', '') + '</div></div>' + cfgIn('bendahara', 'Nama Bendahara', '') + bendaharaPilih() + cfgIn('bendaharaNip', 'NIP Bendahara', '') + '<button class="btn pri" style="margin-top:14px" onclick="saveCfgKeys([\'kop1\',\'kop2\',\'namaMadrasah\',\'alamat\',\'kepala\',\'nipKepala\',\'bendahara\',\'bendaharaNip\'])"><i class="bi bi-save"></i>Simpan Kop</button></div>' +
      '<div class="card"><h3>Pratinjau Kop</h3><p class="muted sm" style="margin:2px 0 10px">Tampil seperti ini di kwitansi dan laporan.</p><div style="overflow:auto"><div class="paper" id="kopPrev" style="padding:16px"></div></div></div></div>';
  } else if (PT.tab === 'metode') {
    mbLoad(); body = '<div class="note"><i class="bi bi-info-circle"></i><span>Atur pilihan metode di form <b>Pembayaran</b> &amp; <b>Seragam</b>. Untuk beberapa rekening, buat beberapa metode <b>Transfer</b> (mis. “Transfer BSI”, “Transfer Mandiri”). Mengubah nama metode <b>tidak</b> mengubah transaksi lama.</span></div><div class="grid g-main" style="grid-template-columns:7fr 5fr"><div><div id="mbList">' + mbList() + '</div><div class="row wrap"><button class="btn" onclick="mbAdd()"><i class="bi bi-plus-lg"></i>Tambah Metode</button><button class="btn pri" id="mbSave" onclick="mbSave()"><i class="bi bi-save"></i>Simpan</button></div></div><div class="card"><h3>Templat pesan rekening</h3><p class="muted sm" style="margin:2px 0 8px">Dipakai tombol <b>Kirim rekening</b>. Placeholder: <span class="mono">{sapaan} {bank} {norek} {atasnama} {rincian} {madrasah} {wali} {siswa}</span></p><textarea class="in" id="cf_templateRekening" style="min-height:240px">' + esc(S.cfg.templateRekening || DEF_TPL_REK) + '</textarea></div></div>';
  } else if (PT.tab === 'kwitansi') {
    kwLoad(); body = '<div id="kwWrap"></div>';
  } else if (PT.tab === 'pengguna') {
    body = resetBanner() + '<div class="note"><i class="bi bi-info-circle"></i><span>Masuk memakai <b>username + password</b>. Akun baru mendapat password sementara yang wajib diganti saat masuk pertama. Berikan username &amp; password sementara langsung kepada yang bersangkutan.</span></div><div class="card tight"><div class="row" style="padding:8px 16px 12px;justify-content:space-between"><h3>Akun Pengguna</h3><button class="btn pri sm" onclick="uForm()"><i class="bi bi-plus-lg"></i>Tambah Akun</button></div><div class="tw"><table class="t" style="min-width:560px"><thead><tr><th>Username &amp; Nama</th><th>Peran</th><th>Kelas</th><th>Status</th><th class="right">Aksi</th></tr></thead><tbody>' + (S.m.pengguna || []).map(u => '<tr><td><b class="mono">' + esc(u.username) + '</b><br><span class="muted sm">' + esc(u.nama) + '</span>' + (u.minta_reset ? ' <span class="st Belum" style="text-transform:none">Minta reset</span>' : '') + '</td><td>' + esc(u.peran) + '</td><td class="sm">' + kelasList(u.kelas_diampu) + '</td><td>' + stPill(u.status_aktif === 'Nonaktif' ? 'Dibatalkan' : 'Lunas', u.status_aktif === 'Nonaktif' ? 'Nonaktif' : 'Aktif') + (u.punya_password ? (u.wajib_ganti === 'ya' ? ' <span class="st Wali" style="text-transform:none">Belum ganti pw</span>' : '') : ' <span class="st Sebagian" style="text-transform:none">Belum ada password</span>') + ttdBadge(u) + '</td><td class="right nowrap"><button class="btn sm" aria-label="Ubah" onclick="uForm(\'' + esc(u.username) + '\')"><i class="bi bi-pencil"></i></button> <button class="btn sm" aria-label="Reset password" title="Reset password" onclick="resetPw(\'' + esc(u.username) + '\')"><i class="bi bi-key"></i></button>' + (u.username === S.user.username ? '' : ' <button class="btn sm danger" aria-label="Hapus akun" title="Hapus akun" onclick="hapusAkunForm(\'' + esc(u.username) + '\')"><i class="bi bi-trash"></i></button>') + '</td></tr>').join('') + '</tbody></table></div></div>';
  } else if (PT.tab === 'format') {
    body = '<div class="card" style="max-width:640px"><h3>Format &amp; Pesan</h3>' + cfgIn('tahunAktif', 'Tahun ajaran aktif', '2026/2027') + cfgIn('format_kwitansi', 'Format nomor kwitansi', 'KW/{YYYY}/{MM}/') + '<label class="l" for="cf_templateWA">Templat pesan pengingat WhatsApp</label><textarea class="in" id="cf_templateWA" style="min-height:150px">' + esc(S.cfg.templateWA || '') + '</textarea><div class="hint">Placeholder: <span class="mono">{wali} {siswa} {kelas} {daftar}</span> — {daftar} berisi jenis biaya belum lunas tanpa nominal.</div><button class="btn pri" style="margin-top:14px" onclick="saveCfgKeys([\'tahunAktif\',\'format_kwitansi\',\'templateWA\'])"><i class="bi bi-save"></i>Simpan</button></div>';
  } else {
    body = '<div class="card" style="max-width:520px"><h3>Sistem</h3><p class="muted">Salin seluruh spreadsheet ke folder Drive madrasah sebagai cadangan. Disarankan dilakukan rutin (atau pasang trigger mingguan).</p><button class="btn" onclick="doBackup()"><i class="bi bi-cloud-arrow-up"></i>Cadangkan ke Drive Sekarang</button></div>';
  }
  $('s-pengaturan').innerHTML = pageHead('Pengguna & Sistem', 'Tampilan, kop madrasah, peran pengguna, dan format dokumen.', '') + '<div class="tabs">' + tabs.map(t => '<button class="' + (PT.tab === t[0] ? 'on' : '') + '" onclick="PT.tab=\'' + t[0] + '\';pRender()">' + t[1] + '</button>').join('') + '</div>' + body;
  if (PT.tab === 'kwitansi') kwDraw();
  if (PT.tab === 'kop') { kopPreview(); ['kop1', 'kop2', 'namaMadrasah', 'alamat'].forEach(k => $('cf_' + k).addEventListener('input', kopPreview)); }
}
/* ───────── Tutup buku bulanan ───────── */
const bulanSekarang = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
const tutupRow = ym => ((S.live && S.live.tutup) || []).find(r => String(r.bulan) === ym);
const isClosedDate = d => { const r = tutupRow(String(d || '').slice(0, 7)); return !!(r && r.status === 'ditutup'); };
function tbNote() { const r = tutupRow(S.bulan); return '<div style="font-size:11px;margin-top:10px">' + (r && r.status === 'ditutup' ? 'Buku bulan ini telah <b>ditutup</b> oleh ' + esc(r.ditutup_oleh) + ' pada ' + waktuLbl(r.ditutup_waktu) + ' WIB.' : '<i>Laporan sementara — buku bulan ini belum ditutup.</i>') + '</div>'; }
function tbPanel() {
  const ym = S.bulan, r = tutupRow(ym), closed = !!(r && r.status === 'ditutup'), lewat = ym < bulanSekarang(); let masuk = 0, keluar = 0;
  S.live.pembayaran.forEach(p => { if (p.status === 'aktif' && ymOf(p.tanggal) === ym) masuk += Number(p.jumlah); }); S.live.pengeluaran.forEach(x => { if (x.status === 'aktif' && ymOf(x.tanggal) === ym) keluar += Number(x.jumlah); });
  const st = closed ? '<span class="st Lunas"><i class="bi bi-lock-fill" style="margin-right:4px"></i>Buku ditutup</span>' : '<span class="st Sebagian">Buku terbuka</span>'; let ket = '';
  if (closed) ket = 'Ditutup oleh <b>' + esc(r.ditutup_oleh) + '</b> · ' + waktuLbl(r.ditutup_waktu) + '. Saat penutupan: masuk ' + rp(r.total_masuk) + ' · keluar ' + rp(r.total_keluar) + ' · ' + r.jml_kwitansi + ' kwitansi.' + (Number(r.total_masuk) !== masuk || Number(r.total_keluar) !== keluar ? ' <b style="color:var(--tunggak)">⚠ Total sekarang berbeda dari saat penutupan.</b>' : '');
  else if (!lewat) ket = 'Bulan berjalan/mendatang belum dapat ditutup. Tutup buku dilakukan setelah bulan berakhir.';
  else ket = 'Saat ini: masuk ' + rp(masuk) + ' · keluar ' + rp(keluar) + '. Setelah ditutup, transaksi bertanggal bulan ini tidak dapat ditambah, diubah, dibatalkan, atau dihapus.' + (r && r.status === 'dibuka' ? ' <span class="muted">(Pernah dibuka kembali oleh ' + esc(r.dibuka_oleh) + ': “' + esc(r.alasan_buka) + '”.)</span>' : '');
  const btn = closed ? (S.user.peran === 'Super Admin' ? '<button class="btn sm danger" onclick="tbBuka(\'' + ym + '\')"><i class="bi bi-unlock"></i>Buka Kembali</button>' : '') : (lewat && can.bayar() ? '<button class="btn sm pri" onclick="tbTutup(\'' + ym + '\')"><i class="bi bi-lock"></i>Tutup Buku ' + bulanLbl(ym) + '</button>' : '');
  return '<div class="card" style="margin-bottom:12px;padding:12px 16px"><div class="row wrap" style="justify-content:space-between"><div class="row">' + st + '<b>' + bulanLbl(ym) + '</b></div>' + btn + '</div><div class="sm muted" style="margin-top:6px">' + ket + '</div></div>';
}
function tbTutup(ym) { openModal('Tutup buku ' + bulanLbl(ym) + '?', '<div class="note" style="background:var(--sebagian-bg);align-items:flex-start"><i class="bi bi-lock"></i><span>Setelah ditutup, <b>semua transaksi bertanggal ' + bulanLbl(ym) + '</b> (pembayaran, seragam, pengeluaran) tidak dapat ditambah, diubah, dikoreksi, dibatalkan, atau dihapus. Hanya Super Admin yang dapat membuka kembali, dengan alasan yang tercatat.</span></div><p class="muted sm" style="margin:0">Pastikan kas fisik dan laporan bulan ini sudah cocok.</p>', '<button class="btn" onclick="closeModal()">Batal</button><button class="btn pri" id="tbBtn" onclick="doTutup(\'' + ym + '\')"><i class="bi bi-lock"></i>Tutup Buku</button>'); }
function doTutup(ym) { const b = $('tbBtn'); b.disabled = true; api('tutupBuku', ym).then(r => { if (!r.success) { b.disabled = false; return toast(r.message, 'err'); } closeModal(); setLive(r.data); toast('Buku ' + bulanLbl(ym) + ' ditutup.'); }).catch(e => { b.disabled = false; toast(e.message, 'err'); }); }
function tbBuka(ym) { openModal('Buka kembali buku ' + bulanLbl(ym) + '?', '<p class="muted" style="margin-top:0">Alasan akan tercatat di Log Audit dan pada daftar tutup buku. Bulan sebaiknya ditutup lagi setelah perbaikan selesai.</p><label class="l" for="tbAl">Alasan (wajib)</label><textarea class="in" id="tbAl" placeholder="mis. salah input kwitansi"></textarea><div class="errmsg hide" id="tbEr"></div>', '<button class="btn" onclick="closeModal()">Batal</button><button class="btn danger" id="tbBtn2" onclick="doBuka(\'' + ym + '\')"><i class="bi bi-unlock"></i>Buka Kembali</button>'); }
function doBuka(ym) { const a = $('tbAl').value.trim(), er = $('tbEr'); if (a.length < 5) { er.textContent = 'Alasan minimal 5 karakter.'; er.classList.remove('hide'); return; } const b = $('tbBtn2'); b.disabled = true; api('bukaBuku', ym, a).then(r => { if (!r.success) { b.disabled = false; return toast(r.message, 'err'); } closeModal(); setLive(r.data); toast('Buku ' + bulanLbl(ym) + ' dibuka kembali.'); }).catch(e => { b.disabled = false; toast(e.message, 'err'); }); }

/* ───────── Tahun ajaran baru & kenaikan kelas (Super Admin) ───────── */
const NK = { ta: '', salin: true, map: {}, sug: {}, ex: {}, kf: {} };
const nkNextTa = () => { const y = parseInt(String(S.cfg.tahunAktif || '').split('/')[0]) || new Date().getFullYear(); return (y + 1) + '/' + (y + 2); };
const nkParse = n => { const m = String(n).trim().match(/^(\d+)(\s*)(.*)$/); return m ? { lv: +m[1], sp: m[2], suf: m[3] } : null; };
const nkMeta = () => { try { return JSON.parse(S.cfg.kenaikanTerakhir || 'null'); } catch (e) { return null; } };
function nkInit() {
  const ks = S.m.kelas.slice().sort((a, b) => natCmp(a.nama_kelas, b.nama_kelas)), lv = ks.map(k => nkParse(k.nama_kelas)).filter(Boolean).map(p => p.lv), mx = lv.length ? Math.max.apply(null, lv) : 0;
  NK.map = {}; NK.sug = {}; NK.ex = {}; NK.kf = {}; NK.ta = nkNextTa(); NK.salin = true;
  ks.forEach(k => {
    const p = nkParse(k.nama_kelas); if (!p) { NK.map[k.id_kelas] = 'TETAP'; return; } if (p.lv >= mx) { NK.map[k.id_kelas] = 'LULUS'; return; }
    const tgt = (p.lv + 1) + p.sp + p.suf, ada = S.m.kelas.find(x => String(x.nama_kelas).toLowerCase() === tgt.toLowerCase());
    if (ada) NK.map[k.id_kelas] = ada.id_kelas; else { NK.map[k.id_kelas] = 'NEW:' + tgt; NK.sug[k.id_kelas] = 'NEW:' + tgt; }
  });
}
const nkAktif = () => S.m.siswa.filter(s => s.status_aktif !== 'Nonaktif');
function nkTarget(s) { const e = NK.ex[s.id_siswa]; if (e === 'lulus') return 'LULUS'; if (e === 'keluar') return 'KELUAR'; if (e === 'tinggal') return s.id_kelas; const m = NK.map[s.id_kelas]; return (!m || m === 'TETAP') ? s.id_kelas : m; }
function nkLbl(s) { const t = nkTarget(s); if (t === 'LULUS') return 'Lulus'; if (t === 'KELUAR') return 'Keluar/Pindah'; if (t === s.id_kelas) return 'Tetap (tinggal kelas)'; if (String(t).indexOf('NEW:') === 0) return 'Kelas ' + esc(t.slice(4)) + ' (baru)'; return 'Kelas ' + esc(kelasNm(t)); }
function mTahun() { nkInit(); $('mBodyX').innerHTML = '<div id="nkWrap"></div>'; nkDraw(); }
function nkDraw() {
  const meta = nkMeta(), bisaBatal = !!(meta && !meta.dibatalkan && meta.baru === S.cfg.tahunAktif), ks = S.m.kelas.slice().sort((a, b) => natCmp(a.nama_kelas, b.nama_kelas)), akt = nkAktif();
  const opsi = k => { const cur = NK.map[k.id_kelas], o = ['<option value="TETAP"' + (cur === 'TETAP' ? ' selected' : '') + '>Tetap di kelas ini (tinggal kelas)</option>']; ks.filter(x => x.id_kelas !== k.id_kelas).forEach(x => o.push('<option value="' + x.id_kelas + '"' + (cur === x.id_kelas ? ' selected' : '') + '>→ Kelas ' + esc(x.nama_kelas) + '</option>')); const sg = NK.sug[k.id_kelas]; if (sg) o.push('<option value="' + esc(sg) + '"' + (cur === sg ? ' selected' : '') + '>+ Buat kelas baru: ' + esc(sg.slice(4)) + '</option>'); o.push('<option value="LULUS"' + (cur === 'LULUS' ? ' selected' : '') + '>Lulus (nonaktifkan)</option>'); return o.join(''); };
  $('nkWrap').innerHTML =
    '<div class="card" style="margin-bottom:12px"><div class="row wrap" style="justify-content:space-between;align-items:flex-start"><div><h3>Tahun ajaran aktif: ' + esc(S.cfg.tahunAktif || '-') + '</h3><div class="muted sm" style="margin-top:4px">Riwayat: ' + (S.m.tahun || []).map(t => esc(t.nama) + ' (' + esc(t.status_aktif) + ')').join(' · ') + '</div>' + (meta ? '<div class="sm" style="margin-top:6px">Kenaikan terakhir: <b>' + esc(meta.lama) + ' → ' + esc(meta.baru) + '</b> oleh ' + esc(meta.oleh) + ' · ' + waktuLbl(meta.waktu) + (meta.dibatalkan ? ' <span class="st Dibatalkan">Dibatalkan</span>' : '') + '</div>' : '') + '</div>' + (bisaBatal ? '<button class="btn danger" onclick="nkBatal()"><i class="bi bi-arrow-counterclockwise"></i>Batalkan kenaikan terakhir</button>' : '') + '</div></div>' +
    '<div class="note" style="align-items:flex-start;background:var(--sebagian-bg)"><i class="bi bi-shield-check"></i><span>Proses ini mengubah kelas banyak siswa sekaligus. Sistem <b>otomatis mencadangkan seluruh spreadsheet ke Drive</b> sebelum mulai. Kenaikan terakhir dapat dibatalkan selama <b>belum ada tagihan</b> tahun ajaran baru. Tunggakan tahun lama <b>tetap tercatat</b> pada siswa.</span></div>' +
    '<div class="card" style="margin-bottom:12px"><h3>1. Tahun ajaran baru</h3><div class="grid g2"><div><label class="l" for="nkTa">Tahun ajaran</label><input class="in mono" id="nkTa" value="' + esc(NK.ta) + '" placeholder="2027/2028" oninput="NK.ta=this.value.trim();nkSumDraw()"></div><div><label class="chk" style="margin-top:34px"><input type="checkbox" ' + (NK.salin ? 'checked' : '') + ' onchange="NK.salin=this.checked;nkSumDraw()"> Salin tarif dari tahun ajaran sekarang</label></div></div></div>' +
    '<div class="card tight" style="margin-bottom:12px"><div style="padding:10px 16px"><h3>2. Pemetaan kelas</h3><span class="muted sm">Usulan otomatis dari nomor tingkat (4B → 5B). Ubah bila perlu.</span></div><div class="tw"><table class="t" style="min-width:520px"><thead><tr><th>Kelas sekarang</th><th class="right">Siswa aktif</th><th>Tujuan</th></tr></thead><tbody>' + (ks.length ? ks.map(k => '<tr><td><b>Kelas ' + esc(k.nama_kelas) + '</b></td><td class="num">' + akt.filter(s => s.id_kelas === k.id_kelas).length + '</td><td><select class="in" style="min-width:240px" onchange="nkMap(\'' + k.id_kelas + '\',this.value)">' + opsi(k) + '</select></td></tr>').join('') : '<tr><td colspan="3">' + emptyBox('bi-grid', 'Belum ada kelas.') + '</td></tr>') + '</tbody></table></div></div>' +
    '<div class="card tight" style="margin-bottom:12px"><div class="row wrap" style="padding:10px 16px"><div class="grow"><h3>3. Pengecualian per siswa</h3><span class="muted sm">Tinggal kelas, lulus lebih awal, atau keluar/pindah. Kosong = ikut pemetaan kelas.</span></div><div class="search" style="min-width:200px"><i class="bi bi-search"></i><input class="in" id="nkQ" placeholder="Cari siswa…" oninput="nkRows()"></div></div><div class="tw" style="max-height:340px;overflow:auto" id="nkRows"></div></div>' +
    '<div class="card tight" style="margin-bottom:12px" id="nkKfCard"></div><div class="card"><h3>4. Ringkasan &amp; konfirmasi</h3><div id="nkSum" style="margin:8px 0"></div><label class="l" for="nkKonf">Ketik <b class="mono">NAIK KELAS</b> untuk melanjutkan</label><input class="in mono" id="nkKonf" autocomplete="off" oninput="nkSumDraw()"><button class="btn pri lg" id="nkGo" style="margin-top:12px" disabled onclick="nkJalankan()"><i class="bi bi-arrow-up-circle"></i>Jalankan Kenaikan Kelas</button></div>';
  nkRows(); nkKf(); nkSumDraw();
}
function nkMap(id, v) { NK.map[id] = v; nkRows(); nkKf(); nkSumDraw(); }
function nkEx(id, v) { if (v) NK.ex[id] = v; else delete NK.ex[id]; nkRows(); nkKf(); nkSumDraw(); }
function nkKfList() { return kfAktifTA().filter(r => { const s = S.ix.siswa[r.id_siswa]; if (!s || s.status_aktif === 'Nonaktif') return false; const t = nkTarget(s); return t !== 'LULUS' && t !== 'KELUAR'; }); }
function nkKfSet(id, v) { NK.kf[id] = v; nkSumDraw(); }
function nkKf() {
  const e = $('nkKfCard'); if (!e) return; const L = nkKfList(); L.forEach(r => { if (!(r.id_keringanan in NK.kf)) NK.kf[r.id_keringanan] = r.sampai_lulus === 'ya'; });
  e.innerHTML = '<div style="padding:10px 16px"><h3>Keringanan &amp; beasiswa yang dilanjutkan</h3><span class="muted sm">Hanya siswa yang naik/tinggal kelas. Yang bertanda “sampai lulus” sudah tercentang; lainnya perlu Anda putuskan. Siswa lulus/keluar tidak ikut.</span></div>' + (L.length ? '<div class="tw" style="max-height:260px;overflow:auto"><table class="t" style="min-width:520px"><thead><tr><th>Lanjutkan</th><th>Siswa</th><th>Program &amp; cakupan</th><th>Masa berlaku</th></tr></thead><tbody>' + L.map(r => { const s = S.ix.siswa[r.id_siswa]; return '<tr><td><input type="checkbox" style="width:18px;height:18px;accent-color:var(--primary)" ' + (NK.kf[r.id_keringanan] ? 'checked' : '') + ' onchange="nkKfSet(\'' + r.id_keringanan + '\',this.checked)" aria-label="Lanjutkan keringanan ' + esc(s.nama) + '"></td><td><b>' + esc(s.nama) + '</b> <span class="cls">' + esc(kelasNm(s.id_kelas)) + '</span></td><td class="sm">' + kfLabel(r) + '</td><td class="sm">' + (r.sampai_lulus === 'ya' ? '<span class="st Bebas" style="text-transform:none">Sampai lulus</span>' : 'Tahun ini saja') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty" style="padding:18px">Tidak ada keringanan aktif yang dapat dilanjutkan.</div>');
}
function nkRows() {
  const q = (($('nkQ') || {}).value || '').toLowerCase(), l = nkAktif().filter(s => !q || s.nama.toLowerCase().includes(q) || String(s.nisn).includes(q)).sort((a, b) => natCmp(kelasNm(a.id_kelas), kelasNm(b.id_kelas)) || natCmp(a.nama, b.nama)), lim = l.slice(0, 300), e = $('nkRows'); if (!e) return;
  e.innerHTML = lim.length ? '<table class="t" style="min-width:520px"><thead><tr><th>Kelas</th><th>Siswa</th><th>Tujuan</th><th>Pengecualian</th></tr></thead><tbody>' + lim.map(s => '<tr' + (NK.ex[s.id_siswa] ? ' style="background:var(--sebagian-bg)"' : '') + '><td><span class="cls">' + esc(kelasNm(s.id_kelas)) + '</span></td><td><b>' + esc(s.nama) + '</b></td><td class="sm">' + nkLbl(s) + '</td><td><select class="in" style="min-width:150px" onchange="nkEx(\'' + s.id_siswa + '\',this.value)"><option value="">— ikut pemetaan —</option><option value="tinggal"' + (NK.ex[s.id_siswa] === 'tinggal' ? ' selected' : '') + '>Tinggal kelas</option><option value="lulus"' + (NK.ex[s.id_siswa] === 'lulus' ? ' selected' : '') + '>Lulus</option><option value="keluar"' + (NK.ex[s.id_siswa] === 'keluar' ? ' selected' : '') + '>Keluar / pindah</option></select></td></tr>').join('') + '</tbody></table>' + (l.length > lim.length ? '<div class="pg"><span>Menampilkan ' + lim.length + ' dari ' + l.length + ' — gunakan pencarian.</span></div>' : '') : emptyBox('bi-search', 'Tidak ada siswa.');
}
function nkStat() {
  const akt = nkAktif(), c = { naik: 0, tinggal: 0, lulus: 0, keluar: 0 }, baru = {}; akt.forEach(s => { const t = nkTarget(s); if (t === 'LULUS') c.lulus++; else if (t === 'KELUAR') c.keluar++; else if (t === s.id_kelas) c.tinggal++; else { c.naik++; if (String(t).indexOf('NEW:') === 0) baru[t.slice(4)] = 1; } });
  const m = NK.ta.match(/^(\d{4})\/(\d{4})$/), taOk = !!m && Number(m[2]) === Number(m[1]) + 1 && NK.ta !== S.cfg.tahunAktif && !(S.m.tahun || []).some(t => String(t.nama) === NK.ta);
  const ids = {}; S.m.kelas.forEach(k => ids[k.id_kelas] = 1); const tarif = NK.salin ? S.m.tarif.filter(t => String(t.tahun_ajaran) === String(S.cfg.tahunAktif) && ids[t.id_kelas]).length : 0;
  return { c: c, baru: Object.keys(baru), taOk: taOk, tarif: tarif, total: akt.length };
}
function nkSumDraw() {
  const x = nkStat(), e = $('nkSum'); if (!e) return;
  e.innerHTML = (x.taOk ? '' : '<div class="errmsg" style="margin-bottom:6px">Tahun ajaran baru harus berformat 2027/2028 (berurutan), berbeda dari tahun aktif, dan belum pernah ada.</div>') +
    '<div class="row wrap" style="gap:8px"><span class="st Lunas" style="text-transform:none">Naik kelas: ' + x.c.naik + '</span><span class="st Sebagian" style="text-transform:none">Tinggal kelas: ' + x.c.tinggal + '</span><span class="st Wali" style="text-transform:none">Lulus: ' + x.c.lulus + '</span><span class="st Dibatalkan" style="text-transform:none">Keluar/pindah: ' + x.c.keluar + '</span></div><div class="sm muted" style="margin-top:8px">' + (x.baru.length ? 'Kelas baru yang akan dibuat: <b>' + x.baru.map(esc).join(', ') + '</b> (isi tarif &amp; wali kelasnya setelah ini). ' : '') + (NK.salin ? 'Tarif disalin: ' + x.tarif + ' baris. ' : 'Tarif tidak disalin. ') + 'Keringanan dilanjutkan: ' + nkKfList().filter(r => NK.kf[r.id_keringanan]).length + '. ' + 'Total siswa aktif diproses: ' + x.total + '.</div>';
  const g = $('nkGo'); if (g) g.disabled = !(x.taOk && x.total > 0 && String(($('nkKonf') || {}).value || '').trim().toUpperCase() === 'NAIK KELAS');
}
function applyMaster(m, cfg) { Object.keys(m).forEach(k => { S.m[k] = m[k]; }); if (cfg) S.cfg = cfg; reindex(); updBadges(); $('taLbl').textContent = 'T.A. ' + (S.cfg.tahunAktif || ''); persist(); Object.keys(S.rendered).forEach(k => { if (k !== S.page) delete S.rendered[k]; }); }
function nkJalankan() {
  const x = nkStat(); if (!x.taOk) return toast('Periksa tahun ajaran baru.', 'err'); const b = $('nkGo'); b.disabled = true; b.innerHTML = '<span class="spin" style="width:14px;height:14px;border-width:2px"></span> Memproses…';
  const plan = { tahunBaru: NK.ta, salinTarif: NK.salin, lanjutKeringanan: nkKfList().filter(r => NK.kf[r.id_keringanan]).map(r => r.id_keringanan), siswa: nkAktif().map(s => ({ id: s.id_siswa, ke: nkTarget(s) })) };
  api('naikKelas', plan).then(r => {
    if (!r.success) { b.innerHTML = '<i class="bi bi-arrow-up-circle"></i>Jalankan Kenaikan Kelas'; b.disabled = false; return toast(r.message, 'err'); }
    applyMaster(r.data.master, r.data.config); softUpdate(); mTahun();
    const c = r.data.ringkas; openModal('Kenaikan kelas selesai', '<div class="note"><i class="bi bi-check-circle"></i><span>Tahun ajaran aktif sekarang <b>' + esc(S.cfg.tahunAktif) + '</b>. Naik: ' + c.naik + ' · Tinggal: ' + c.tinggal + ' · Lulus: ' + c.lulus + ' · Keluar/pindah: ' + c.keluar + (r.data.kelasBaru ? ' · Kelas baru: ' + r.data.kelasBaru : '') + ' · Tarif disalin: ' + r.data.tarifDisalin + ' · Keringanan dilanjutkan: ' + (r.data.keringananDilanjut || 0) + '.</span></div><b>Langkah berikutnya</b><ol style="margin:6px 0 0;padding-left:18px"><li>Cek/ubah <b>tarif</b> tahun baru di Jenis Pembayaran &amp; Tarif' + (r.data.kelasBaru ? ' (kelas baru belum punya tarif)' : '') + '.</li><li>Isi <b>wali kelas</b> untuk kelas baru (Data Master → Kelas).</li><li>Buat <b>tagihan</b> tahun ajaran baru di tab Buat Tagihan.</li><li>Siswa lulus/pindah yang masih punya tunggakan tampil di Rekapan → Alumni &amp; Nonaktif.</li></ol>', '<button class="btn pri" onclick="closeModal()">Mengerti</button>');
  }).catch(e => { b.innerHTML = '<i class="bi bi-arrow-up-circle"></i>Jalankan Kenaikan Kelas'; b.disabled = false; toast(e.message, 'err'); });
}
function nkBatal() { const m = nkMeta(); if (!m) return; openModal('Batalkan kenaikan kelas terakhir?', '<p class="muted" style="margin-top:0">Mengembalikan kelas dan status siswa seperti sebelum <b>' + esc(m.lama) + ' → ' + esc(m.baru) + '</b>, menghapus kelas baru yang dibuat, tarif tahun baru, dan mengaktifkan kembali tahun ajaran ' + esc(m.lama) + '. Hanya bisa bila belum ada tagihan tahun ajaran baru.</p>', '<button class="btn" onclick="closeModal()">Batal</button><button class="btn danger" id="nkBb" onclick="nkBatalGo()"><i class="bi bi-arrow-counterclockwise"></i>Ya, batalkan</button>'); }
function nkBatalGo() { const b = $('nkBb'); b.disabled = true; api('batalkanKenaikan').then(r => { if (!r.success) { b.disabled = false; return toast(r.message, 'err'); } applyMaster(r.data.master, r.data.config); softUpdate(); closeModal(); mTahun(); toast('Kenaikan kelas dibatalkan.'); }).catch(e => { b.disabled = false; toast(e.message, 'err'); }); }
/* ───────── Keringanan biaya / beasiswa ───────── */
const KF_PROG = ['Yatim', 'Yatim Piatu', 'Dhuafa', 'Prestasi', 'Tahfidz', 'Anak Guru'];
const kfAktifTA = () => (S.m.keringanan || []).filter(r => r.status !== 'dihentikan' && String(r.tahun_ajaran) === String(S.cfg.tahunAktif));
const kfCov = r => r.cakupan === '*' ? 'semua biaya' : String(r.cakupan).split(',').map(id => jenisNm(id.trim())).join(', ');
const kfBentuk = r => r.bentuk === 'bebas' ? 'bebas' : r.bentuk === 'persen' ? Number(r.nilai) + '%' : rp(r.nilai) + '/tagihan';
const kfLabel = r => esc(r.program) + ' — ' + kfBentuk(r) + ' · ' + esc(kfCov(r));
function kfChips(sid) { const L = kfAktifTA().filter(r => r.id_siswa === sid); return L.length ? '<div class="row wrap" style="gap:6px;margin-top:6px">' + L.map(r => '<span class="st Bebas" style="text-transform:none" title="Berlaku ' + esc(r.tahun_ajaran) + (r.sampai_lulus === 'ya' ? ' (sampai lulus)' : '') + '">' + kfLabel(r) + '</span>').join('') + '</div>' : ''; }
function kfPot(sid, ta) { const s = S.ix.siswa[sid]; if (!s) return 0; let sum = 0; S.live.tagihan.forEach(t => { if (taOf(t.periode) !== String(ta)) return; const p = Number(t.potongan) || 0; if (!p) return; if (t.id_siswa === sid) sum += p; else if (t.id_wali && t.id_wali === s.id_wali && S.ix.primary[s.id_wali] === sid) sum += p; }); return sum; }
function kfLaporanHTML(ta) {
  const by = {}; (S.m.keringanan || []).forEach(r => { if (r.status !== 'dihentikan' && String(r.tahun_ajaran) === String(ta)) (by[r.id_siswa] = by[r.id_siswa] || []).push(r); });
  const list = Object.keys(by).map(sid => ({ s: S.ix.siswa[sid], rs: by[sid], pot: kfPot(sid, ta) })).filter(x => x.s).sort((a, b) => natCmp(kelasNm(a.s.id_kelas), kelasNm(b.s.id_kelas)) || natCmp(a.s.nama, b.s.nama));
  const total = S.live.tagihan.reduce((a, t) => a + (taOf(t.periode) === String(ta) ? (Number(t.potongan) || 0) : 0), 0), fm = n => Math.round(n).toLocaleString('id-ID'), c = S.cfg;
  return kopHTML() + '<h2>REKAP PENERIMA KERINGANAN BIAYA / BEASISWA</h2><div style="text-align:center;font-size:12px">Tahun Ajaran ' + esc(ta) + '</div>' +
    '<table><thead><tr><th style="width:28px">No</th><th>Nama Siswa</th><th>Kelas</th><th>Program</th><th>Cakupan &amp; bentuk</th><th style="text-align:right">Nilai dibebaskan (Rp)</th></tr></thead><tbody>' +
    (list.length ? list.map((x, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(x.s.nama) + '</td><td>' + esc(kelasNm(x.s.id_kelas)) + '</td><td>' + x.rs.map(r => esc(r.program) + (r.sampai_lulus === 'ya' ? ' (sampai lulus)' : '')).join('<br>') + '</td><td style="font-size:11px">' + x.rs.map(r => esc(kfCov(r)) + ' — ' + kfBentuk(r)).join('<br>') + '</td><td class="n">' + fm(x.pot) + '</td></tr>').join('') : '<tr><td colspan="6" style="text-align:center">Belum ada penerima keringanan</td></tr>') +
    '<tr><td colspan="5"><b>TOTAL NILAI DIBEBASKAN (' + list.length + ' penerima)</b></td><td class="n"><b>' + fm(total) + '</b></td></tr></tbody></table>' +
    '<div style="font-size:11px;margin-top:6px">Nilai dibebaskan = selisih tarif dengan tagihan yang diterbitkan pada tahun ajaran ini; bertambah seiring tagihan dibuat. Biaya per-wali dihitung sekali.</div>' +
    '<table class="nb" style="margin-top:14px"><tr><td style="width:50%;text-align:center;border:0">Mengetahui,<br>Kepala Madrasah<br><br><br><br><u>' + esc(c.kepala || '(…………………………)') + '</u></td><td style="width:50%;text-align:center;border:0"><br>Bendahara<br><br><br><br><u>' + esc(namaBendahara() || '(…………………………)') + '</u><br><small>' + (c.bendaharaNip ? 'NIP. ' + esc(c.bendaharaNip) : '') + '</small></td></tr></table>';
}
const KFU = { ta: '' };
function mKeringanan() {
  if (!KFU.ta) KFU.ta = S.cfg.tahunAktif || ''; const tas = (S.m.tahun || []).map(t => t.nama);
  $('mBodyX').innerHTML = '<div class="note" style="align-items:flex-start"><i class="bi bi-info-circle"></i><span>Keringanan berlaku <b>per tahun ajaran</b>. Bentuk: <b>bebas</b>, <b>persen</b>, atau <b>nominal</b> (per tagihan; SPP = per bulan). Beberapa keringanan pada satu siswa digabung (bebas menang). Tagihan per-wali (mis. infak gedung) bebas hanya bila <b>semua</b> anak bebas. Seragam tidak terkena keringanan. Tagihan yang <b>belum dibayar</b> disesuaikan otomatis; yang sudah ada pembayaran tidak diubah.</span></div><div class="row wrap" style="justify-content:space-between;margin-bottom:12px"><div class="row wrap"><select class="in" id="kfTa" style="width:auto" aria-label="Tahun ajaran" onchange="KFU.ta=this.value;kfRows()">' + tas.map(x => '<option ' + (x === KFU.ta ? 'selected' : '') + '>' + esc(x) + '</option>').join('') + '</select><div class="search" style="min-width:220px"><i class="bi bi-search"></i><input class="in" id="kfQ" placeholder="Cari siswa / program…" oninput="kfRows()"></div></div><div class="row wrap"><button class="btn" onclick="kfTerapkan()"><i class="bi bi-arrow-repeat"></i>Terapkan ke semua tagihan</button><button class="btn pri" onclick="kfForm()"><i class="bi bi-plus-lg"></i>Tambah Keringanan</button></div></div><div class="card tight"><div class="tw" id="kfList"></div><div class="pg" id="kfCnt"></div></div>';
  kfRows();
}
function kfRows() {
  const q = (($('kfQ') || {}).value || '').toLowerCase(), ta = ($('kfTa') || {}).value || KFU.ta; KFU.ta = ta;
  const l = (S.m.keringanan || []).filter(r => String(r.tahun_ajaran) === String(ta) && (!q || (S.ix.siswa[r.id_siswa] || {}).nama && S.ix.siswa[r.id_siswa].nama.toLowerCase().includes(q) || String(r.program).toLowerCase().includes(q))).sort((a, b) => natCmp((S.ix.siswa[a.id_siswa] || {}).nama || '', (S.ix.siswa[b.id_siswa] || {}).nama || ''));
  $('kfList').innerHTML = l.length ? '<table class="t"><thead><tr><th>Siswa</th><th>Program</th><th>Cakupan</th><th>Bentuk</th><th>Berlaku</th><th>Status</th><th></th></tr></thead><tbody>' + l.map(r => { const s = S.ix.siswa[r.id_siswa] || {}; return '<tr style="' + (r.status === 'dihentikan' ? 'opacity:.55' : '') + '"><td><b>' + esc(s.nama || '-') + '</b> <span class="cls">' + esc(kelasNm(s.id_kelas)) + '</span></td><td>' + esc(r.program) + (r.catatan ? '<div class="muted sm">' + esc(r.catatan) + '</div>' : '') + '</td><td class="sm">' + esc(kfCov(r)) + '</td><td>' + esc(kfBentuk(r)) + '</td><td class="sm">' + esc(r.tahun_ajaran) + (r.sampai_lulus === 'ya' ? '<br><span class="st Bebas" style="text-transform:none">Sampai lulus</span>' : '') + '</td><td>' + (r.status === 'dihentikan' ? stPill('Dibatalkan', 'Dihentikan') : stPill('Lunas', 'Aktif')) + '</td><td class="right nowrap"><button class="btn sm" aria-label="Ubah" onclick="kfForm(\'' + esc(r.id_keringanan) + '\')"><i class="bi bi-pencil"></i></button> <button class="btn sm danger" aria-label="Hapus" onclick="kfHapus(\'' + esc(r.id_keringanan) + '\')"><i class="bi bi-trash"></i></button></td></tr>'; }).join('') + '</tbody></table>' : emptyBox('bi-award', 'Belum ada keringanan pada tahun ajaran ini.');
  $('kfCnt').innerHTML = '<span><b>' + l.length + '</b> keringanan · ' + l.filter(r => r.status !== 'dihentikan').length + ' aktif</span>';
}
const KFF = { sid: '' };
function kfForm(id) {
  const r = id ? (S.m.keringanan || []).find(x => x.id_keringanan === id) : { tahun_ajaran: KFU.ta || S.cfg.tahunAktif, bentuk: 'bebas', cakupan: '*', sampai_lulus: '', status: 'aktif' }; if (!r) return; KFF.sid = r.id_siswa || '';
  const prog = [...new Set(KF_PROG.concat((S.m.keringanan || []).map(x => x.program)))], js = S.m.jenis.filter(x => x.id_jenis !== 'J-SRG' && x.sifat !== 'sukarela' && x.status_aktif !== 'Nonaktif'), sel = r.cakupan === '*' ? [] : String(r.cakupan).split(',');
  const s0 = KFF.sid ? S.ix.siswa[KFF.sid] : null;
  openModal(id ? 'Ubah Keringanan' : 'Tambah Keringanan', '<label class="l" style="margin-top:0">Siswa</label>' + (id ? '<div class="stu" style="margin-top:0"><div class="mono-av">' + initials((s0 || {}).nama) + '</div><div><b>' + esc((s0 || {}).nama || '-') + '</b> <span class="cls">' + esc(kelasNm((s0 || {}).id_kelas)) + '</span></div></div>' : stuPicker('kf') + '<div id="kfStu" class="hint">Cari dan pilih siswa.</div>') +
    '<div class="grid g2"><div><label class="l" for="kfProg">Nama program / beasiswa</label><input class="in" id="kfProg" list="kfProgL" placeholder="mis. Yatim" value="' + esc(r.program || '') + '"><datalist id="kfProgL">' + prog.map(p => '<option value="' + esc(p) + '">').join('') + '</datalist></div><div><label class="l" for="kfTa2">Tahun ajaran</label><select class="in" id="kfTa2">' + (S.m.tahun || []).map(t => '<option ' + (t.nama === r.tahun_ajaran ? 'selected' : '') + '>' + esc(t.nama) + '</option>').join('') + '</select></div></div>' +
    '<label class="l">Berlaku untuk</label><label class="chk"><input type="radio" name="kfC" value="*" ' + (r.cakupan === '*' ? 'checked' : '') + ' onchange="$(\'kfJns\').classList.add(\'hide\')"> Semua biaya <span class="muted sm">(kecuali seragam)</span></label><label class="chk"><input type="radio" name="kfC" value="pilih" ' + (r.cakupan === '*' ? '' : 'checked') + ' onchange="$(\'kfJns\').classList.remove(\'hide\')"> Hanya jenis tertentu</label><div id="kfJns" class="' + (r.cakupan === '*' ? 'hide' : '') + '" style="padding-left:24px">' + js.map(x => '<label class="chk"><input type="checkbox" class="kfj" value="' + x.id_jenis + '" ' + (sel.includes(x.id_jenis) ? 'checked' : '') + '> ' + esc(x.nama) + '</label>').join('') + '</div>' +
    '<div class="grid g2"><div><label class="l" for="kfBn">Bentuk keringanan</label><select class="in" id="kfBn" onchange="$(\'kfNlBox\').classList.toggle(\'hide\',this.value===\'bebas\')"><option value="bebas" ' + (r.bentuk === 'bebas' ? 'selected' : '') + '>Bebas (100%)</option><option value="persen" ' + (r.bentuk === 'persen' ? 'selected' : '') + '>Potongan persen</option><option value="nominal" ' + (r.bentuk === 'nominal' ? 'selected' : '') + '>Potongan nominal (Rp per tagihan)</option></select></div><div id="kfNlBox" class="' + (r.bentuk === 'bebas' ? 'hide' : '') + '"><label class="l" for="kfNl">Nilai (% atau Rp)</label><input class="in mono" id="kfNl" inputmode="numeric" value="' + (r.nilai ? Number(r.nilai).toLocaleString('id-ID') : '') + '" oninput="this.value=num(this.value)?num(this.value).toLocaleString(\'id-ID\'):\'\'"></div></div>' +
    '<label class="chk" style="margin-top:10px"><input type="checkbox" id="kfSl" ' + (r.sampai_lulus === 'ya' ? 'checked' : '') + '> Berlaku sampai lulus <span class="muted sm">(otomatis tercentang saat kenaikan kelas; tetap tercatat per tahun ajaran)</span></label>' +
    '<label class="l" for="kfCt">Catatan (opsional)</label><input class="in" id="kfCt" value="' + esc(r.catatan || '') + '">' + (id ? '<label class="l" for="kfSt">Status</label><select class="in" id="kfSt"><option value="aktif" ' + (r.status !== 'dihentikan' ? 'selected' : '') + '>Aktif</option><option value="dihentikan" ' + (r.status === 'dihentikan' ? 'selected' : '') + '>Dihentikan</option></select>' : '') + '<div class="errmsg hide" id="kfErr"></div>',
    '<button class="btn" onclick="closeModal()">Batal</button><button class="btn pri" id="kfBtn" onclick="kfSimpan(\'' + (id || '') + '\')">Simpan</button>');
  PICK.kf = s => { KFF.sid = s.id_siswa; $('kfStu').innerHTML = '<b>' + esc(s.nama) + '</b> · Kelas ' + esc(kelasNm(s.id_kelas)); };
}
function kfSimpan(id) {
  const er = m => { $('kfErr').textContent = m; $('kfErr').classList.remove('hide'); }, bn = $('kfBn').value, nilai = bn === 'bebas' ? 0 : num($('kfNl').value), pilih = document.querySelector('input[name="kfC"]:checked'), jn = [...document.querySelectorAll('.kfj:checked')].map(x => x.value);
  if (!KFF.sid) return er('Pilih siswa terlebih dahulu.'); if (!$('kfProg').value.trim()) return er('Nama program wajib diisi.');
  if (bn === 'persen' && !(nilai > 0 && nilai <= 100)) return er('Persen harus antara 1 dan 100.'); if (bn === 'nominal' && !(nilai > 0)) return er('Isi nominal potongan.');
  const semua = !pilih || pilih.value === '*'; if (!semua && !jn.length) return er('Centang minimal satu jenis pembayaran.');
  const rec = { id_keringanan: id || '', id_siswa: KFF.sid, tahun_ajaran: $('kfTa2').value, program: $('kfProg').value.trim(), cakupan: semua ? '*' : jn.join(','), bentuk: bn, nilai: nilai, sampai_lulus: $('kfSl').checked, catatan: $('kfCt').value.trim(), status: id ? $('kfSt').value : 'aktif' };
  const b = $('kfBtn'); b.disabled = true;
  api('simpanKeringanan', rec).then(r => {
    b.disabled = false; if (!r.success) return er(r.message);
    S.m.keringanan = r.data.keringanan; S.live = r.data.live; reindex(); persist(); closeModal(); softUpdate(); mKeringanan();
    const g = r.data.ringkas; toast('Keringanan tersimpan. ' + g.diubah + ' tagihan belum dibayar disesuaikan' + (g.dilewati ? ', ' + g.dilewati + ' dilewati (sudah ada pembayaran)' : '') + '.');
  }).catch(e => { b.disabled = false; er(e.message || 'Gagal menyimpan.'); });
}
function kfHapus(id) {
  const r = (S.m.keringanan || []).find(x => x.id_keringanan === id); if (!r) return; const s = S.ix.siswa[r.id_siswa] || {};
  openModal('Hapus keringanan?', '<p class="muted" style="margin-top:0"><b>' + esc(s.nama || '-') + '</b> — ' + kfLabel(r) + ' (' + esc(r.tahun_ajaran) + ').</p><p class="muted sm">Tagihan yang belum dibayar akan dikembalikan ke tarif penuh. Bila hanya ingin menghentikan, ubah statusnya menjadi <b>Dihentikan</b> agar riwayatnya tetap ada.</p>', '<button class="btn" onclick="closeModal()">Batal</button><button class="btn danger" id="kfDel" onclick="kfHapusGo(\'' + esc(id) + '\')"><i class="bi bi-trash"></i>Hapus</button>');
}
function kfHapusGo(id) { const b = $('kfDel'); b.disabled = true; api('hapusKeringanan', id).then(r => { if (!r.success) { b.disabled = false; return toast(r.message, 'err'); } S.m.keringanan = r.data.keringanan; S.live = r.data.live; reindex(); persist(); closeModal(); softUpdate(); mKeringanan(); toast('Keringanan dihapus; ' + r.data.ringkas.diubah + ' tagihan disesuaikan.'); }).catch(e => { b.disabled = false; toast(e.message, 'err'); }); }
function kfTerapkan() { api('terapkanKeringananSemua', KFU.ta).then(r => { if (!r.success) return toast(r.message, 'err'); S.live = r.data.live; reindex(); persist(); softUpdate(); toast(r.message); }).catch(e => toast(e.message, 'err')); }
/* ───────── Hapus data master (siswa, wali, kelas, seragam) — dengan pengaman ───────── */
const adaBayarSiswa = sid => S.live.pembayaran.some(p => { const t = S.ix.tg[p.id_tagihan]; return !!t && t.id_siswa === sid; });
const nTagihanSiswa = sid => S.live.tagihan.filter(t => t.id_siswa === sid).length;
function applyDel(r) { if (r.data.master) applyMaster(r.data.master, null); if (r.data.pengguna) S.m.pengguna = r.data.pengguna; if (r.data.live) setLive(r.data.live); else softUpdate(); }
const dlgTolak = (judul, isi, tombol) => openModal(judul, '<div class="note" style="background:var(--sebagian-bg);align-items:flex-start"><i class="bi bi-info-circle"></i><span>' + isi + '</span></div>', '<button class="btn" onclick="closeModal()">Tutup</button>' + (tombol || ''));
function mHapus(id) { ({ siswa: hapusSiswaForm, wali: hapusWaliForm, kelas: hapusKelasForm, seragam: hapusSeragamForm }[M.tab] || (() => { }))(id); }
function hapusSiswaForm(id) {
  const s = S.m.siswa.find(x => x.id_siswa === id); if (!s) return;
  if (adaBayarSiswa(id)) return dlgTolak('Siswa tidak dapat dihapus', '<b>' + esc(s.nama) + '</b> sudah punya riwayat pembayaran. Menghapusnya akan merusak riwayat dan kwitansi, jadi hanya bisa <b>dinonaktifkan</b> (lulus/pindah/keluar). Siswa yang belum pernah ada transaksi (mis. data uji) boleh dihapus.', s.status_aktif === 'Nonaktif' ? '' : '<button class="btn pri" onclick="mNon(\'' + esc(id) + '\')">Nonaktifkan</button>');
  const nt = nTagihanSiswa(id), kf = (S.m.keringanan || []).filter(r => r.id_siswa === id).length;
  openModal('Hapus siswa “' + s.nama + '”?', '<p class="muted" style="margin-top:0">Siswa belum punya riwayat pembayaran. Akan dihapus permanen beserta <b>' + nt + ' tagihan</b> yang belum dibayar' + (kf ? ' dan <b>' + kf + ' keringanan</b>' : '') + '.</p><label class="chk"><input type="checkbox" id="hsWali" checked> Hapus juga wali bila tidak punya siswa lagi</label>', '<button class="btn" onclick="closeModal()">Batal</button><button class="btn danger" id="hsBtn" onclick="doHapusSiswa(\'' + esc(id) + '\')"><i class="bi bi-trash"></i>Hapus Permanen</button>');
}
function doHapusSiswa(id) {
  const b = $('hsBtn'); b.disabled = true;
  api('hapusSiswa', [id], { hapusWaliYatim: $('hsWali').checked }).then(r => {
    if (!r.success) { b.disabled = false; return toast(r.message, 'err'); } if (!r.data.terhapus) { b.disabled = false; return toast((r.data.dilewati[0] || {}).alasan || 'Tidak ada yang dihapus.', 'err'); }
    applyDel(r); closeModal(); mRender(); toast('Siswa dihapus' + (r.data.waliHapus ? ' (wali ikut dihapus)' : '') + '.');
  }).catch(e => { b.disabled = false; toast(e.message, 'err'); });
}
function hapusWaliForm(id) {
  const w = S.m.wali.find(x => x.id_wali === id); if (!w) return; const an = S.m.siswa.filter(s => s.id_wali === id);
  if (an.length) return dlgTolak('Wali tidak dapat dihapus', '<b>' + esc(w.nama_wali) + '</b> masih terhubung ke <b>' + an.length + ' siswa</b>: ' + an.slice(0, 5).map(s => esc(s.nama)).join(', ') + (an.length > 5 ? ', …' : '') + '. Pindahkan wali siswa tersebut atau hapus siswanya terlebih dahulu.');
  openModal('Hapus wali “' + w.nama_wali + '”?', '<p class="muted" style="margin-top:0">Wali tidak punya siswa. Akan dihapus permanen beserta tagihan per-wali yang belum dibayar (bila ada).</p>', '<button class="btn" onclick="closeModal()">Batal</button><button class="btn danger" id="hwBtn" onclick="doHapusMaster(\'hapusWali\',\'' + esc(id) + '\',\'hwBtn\',\'Wali dihapus.\')"><i class="bi bi-trash"></i>Hapus Permanen</button>');
}
function hapusKelasForm(id) {
  const k = S.ix.kelas[id]; if (!k) return; const an = S.m.siswa.filter(s => s.id_kelas === id);
  if (an.length) return dlgTolak('Kelas ' + esc(k.nama_kelas) + ' tidak dapat dihapus', 'Kelas ini masih berisi <b>' + an.length + ' siswa</b>' + (an.some(s => s.status_aktif === 'Nonaktif') ? ' (termasuk alumni/nonaktif)' : '') + ': ' + an.slice(0, 5).map(s => esc(s.nama)).join(', ') + (an.length > 5 ? ', …' : '') + '. Pindahkan dulu lewat <b>ubah kelas siswa</b> atau <b>Kenaikan Kelas</b>, atau hapus siswanya bila belum ada transaksi.');
  const tf = S.m.tarif.filter(t => t.id_kelas === id).length, ak = (S.m.pengguna || []).filter(u => String(u.kelas_diampu || '').split(',').map(x => x.trim()).includes(id)).length;
  openModal('Hapus kelas ' + k.nama_kelas + '?', '<p class="muted" style="margin-top:0">Kelas kosong. Akan dihapus permanen beserta <b>' + tf + ' baris tarif</b>' + (ak ? ' dan dilepas dari <b>' + ak + ' akun wali kelas</b>' : '') + '.</p>', '<button class="btn" onclick="closeModal()">Batal</button><button class="btn danger" id="hkBtn" onclick="doHapusMaster(\'hapusKelas\',\'' + esc(id) + '\',\'hkBtn\',\'Kelas dihapus.\')"><i class="bi bi-trash"></i>Hapus Permanen</button>');
}
function hapusSeragamForm(id) {
  const it = S.m.seragam.find(x => x.id_item === id); if (!it) return;
  openModal('Hapus item seragam?', '<p class="muted" style="margin-top:0"><b>' + esc(it.nama) + '</b> (' + esc(it.bagian) + ') akan dihapus dari daftar harga. Riwayat transaksi seragam yang sudah ada tidak terpengaruh.</p>', '<button class="btn" onclick="closeModal()">Batal</button><button class="btn danger" id="hgBtn" onclick="doHapusMaster(\'hapusItemSeragam\',\'' + esc(id) + '\',\'hgBtn\',\'Item seragam dihapus.\')"><i class="bi bi-trash"></i>Hapus</button>');
}
function doHapusMaster(fn, id, btn, pesan) { const b = $(btn); b.disabled = true; api(fn, id).then(r => { if (!r.success) { b.disabled = false; return toast(r.message, 'err'); } applyDel(r); closeModal(); mRender(); toast(pesan); }).catch(e => { b.disabled = false; toast(e.message, 'err'); }); }
/* hapus massal siswa uji coba */
const SB = { scope: '' };
function sbCalc() { const sc = SB.scope, list = S.m.siswa.filter(s => sc === '' ? true : sc === '__nonaktif' ? s.status_aktif === 'Nonaktif' : s.id_kelas === sc), ok = list.filter(s => !adaBayarSiswa(s.id_siswa)); return { list: list, ok: ok, skip: list.length - ok.length, nt: ok.reduce((a, s) => a + nTagihanSiswa(s.id_siswa), 0) }; }
function sbForm() {
  SB.scope = ''; const ks = S.m.kelas.slice().sort((a, b) => natCmp(a.nama_kelas, b.nama_kelas));
  openModal('Hapus massal siswa', '<div class="note" style="background:var(--sebagian-bg);align-items:flex-start"><i class="bi bi-exclamation-triangle"></i><span>Untuk membersihkan <b>data uji coba</b>. Hanya siswa yang <b>belum punya riwayat pembayaran</b> yang dihapus (beserta tagihan belum dibayar &amp; keringanannya). Siswa berriwayat otomatis dilewati.</span></div><label class="l" for="sbSc">Cakupan</label><select class="in" id="sbSc" onchange="SB.scope=this.value;sbDraw()"><option value="">Semua kelas</option>' + ks.map(k => '<option value="' + k.id_kelas + '">Kelas ' + esc(k.nama_kelas) + '</option>').join('') + '<option value="__nonaktif">Alumni &amp; nonaktif</option></select><div id="sbSum" style="margin:10px 0"></div><label class="chk"><input type="checkbox" id="sbWali" checked> Hapus juga wali yang tidak punya siswa lagi</label><label class="l" for="sbKonf">Ketik <b class="mono">HAPUS</b> untuk melanjutkan</label><input class="in mono" id="sbKonf" autocomplete="off" oninput="sbDraw()">',
    '<button class="btn" onclick="closeModal()">Batal</button><button class="btn danger" id="sbGo" disabled onclick="sbJalan()"><i class="bi bi-trash"></i>Hapus Permanen</button>'); sbDraw();
}
function sbDraw() {
  const x = sbCalc(), e = $('sbSum'); if (!e) return;
  e.innerHTML = '<div class="row wrap" style="gap:8px"><span class="st Belum" style="text-transform:none">Akan dihapus: ' + x.ok.length + ' siswa</span><span class="st Lunas" style="text-transform:none">Dilewati (ada riwayat bayar): ' + x.skip + '</span></div>' + (x.ok.length ? '<div class="sm muted" style="margin-top:6px">Ikut terhapus: ' + x.nt + ' tagihan belum dibayar. Contoh: ' + x.ok.slice(0, 6).map(s => esc(s.nama)).join(', ') + (x.ok.length > 6 ? ', …' : '') + '</div>' : '<div class="sm muted" style="margin-top:6px">Tidak ada siswa yang dapat dihapus pada cakupan ini.</div>');
  const g = $('sbGo'); if (g) g.disabled = !(x.ok.length > 0 && String(($('sbKonf') || {}).value || '').trim() === 'HAPUS');
}
async function sbJalan() {
  const ids = sbCalc().ok.map(s => s.id_siswa), wali = $('sbWali').checked, b = $('sbGo'); b.disabled = true; let tot = 0, wl = 0, last = null;
  for (let i = 0; i < ids.length; i += 300) {
    b.innerHTML = '<span class="spin" style="width:14px;height:14px;border-width:2px"></span> ' + Math.min(i + 300, ids.length) + ' / ' + ids.length;
    try { const r = await api('hapusSiswa', ids.slice(i, i + 300), { hapusWaliYatim: wali }); if (!r.success) { toast(r.message, 'err'); break; } tot += r.data.terhapus; wl += r.data.waliHapus; last = r; } catch (e) { toast(e.message, 'err'); break; }
  }
  if (last) applyDel(last); closeModal(); mRender(); toast(tot + ' siswa dihapus' + (wl ? ', ' + wl + ' wali ikut dihapus' : '') + '.');
}
/* ───────── Tarif baru → tagihan yang sudah dibuat ───────── */
const tarifOf = (jid, kid, ta) => { const x = S.m.tarif.find(r => r.id_jenis === jid && r.id_kelas === kid && String(r.tahun_ajaran) === String(ta)); return x ? Number(x.nominal) : 0; };
/** potongan keringanan (Rp) untuk satu dasar tarif — sama dengan rumus server */
function kfHitungC(rows, jid, base) {
  const hit = (rows || []).filter(r => r.cakupan === '*' || String(r.cakupan).split(',').map(x => x.trim()).includes(jid)); if (!hit.length || !(base > 0)) return 0; let pct = 0, nom = 0, bebas = false;
  hit.forEach(r => { if (r.bentuk === 'bebas') bebas = true; else if (r.bentuk === 'persen') pct += Number(r.nilai) || 0; else nom += Number(r.nilai) || 0; });
  return bebas ? base : Math.min(base, Math.round(base * Math.min(100, pct) / 100) + nom);
}
/** Tagihan satu jenis yang nominal dasarnya BERBEDA dari tarif Data Master sekarang (keringanan dihitung): [{t, asal, fin, paid}] */
function tarifSelisih(jid) {
  const j = S.ix.jenis[jid]; if (!j || j.sifat === 'sukarela' || jid === 'J-SRG') return []; const kfc = {}, out = [];
  const kfOf = ta => kfc[ta] || (kfc[ta] = (() => { const m = {}; (S.m.keringanan || []).forEach(r => { if (r.status !== 'dihentikan' && String(r.tahun_ajaran) === ta) (m[r.id_siswa] = m[r.id_siswa] || []).push(r); }); return m; })());
  S.live.tagihan.forEach(t => {
    if (t.id_jenis !== jid || t.donatur) return; const ta = taOf(t.periode); if (!ta) return; const kf = kfOf(ta); let asal = 0, fin = 0;
    if (t.id_wali) (S.ix.anak[t.id_wali] || []).forEach(c => { const b = tarifOf(jid, c.id_kelas, ta); if (!(b > 0)) return; asal = Math.max(asal, b); fin = Math.max(fin, b - kfHitungC(kf[c.id_siswa], jid, b)); });
    else { const s = S.ix.siswa[t.id_siswa]; asal = s ? tarifOf(jid, s.id_kelas, ta) : 0; if (asal > 0) fin = asal - kfHitungC(kf[t.id_siswa], jid, asal); }
    if (!(asal > 0)) return; const pot = asal - fin;
    if (Number(t.nominal) === fin && Number(t.potongan || 0) === pot && (!Number(t.nominal_asal) || Number(t.nominal_asal) === asal)) return;
    out.push({ t: t, asal: asal, fin: fin, paid: S.ix.paid[t.id_tagihan] || 0 });
  });
  return out;
}
const tarifBeda = jid => tarifSelisih(jid).filter(x => x.paid <= 0).length;
function tarifBanner() {
  const L = S.m.jenis.map(j => { const r = tarifSelisih(j.id_jenis); return { j: j, belum: r.filter(x => x.paid <= 0).length, sudah: r.filter(x => x.paid > 0).length }; }).filter(x => x.belum + x.sudah > 0); if (!L.length) return '';
  return L.map(x => '<div class="note" style="background:var(--sebagian-bg);align-items:center"><i class="bi bi-exclamation-triangle"></i><span class="grow"><b>' + esc(x.j.nama) + '</b>: ' + (x.belum ? x.belum + ' tagihan belum dibayar' : '') + (x.belum && x.sudah ? ' dan ' : '') + (x.sudah ? x.sudah + ' tagihan yang <b>sudah ada pembayarannya</b>' : '') + ' masih memakai tarif lama.</span><button class="btn sm pri" onclick="tarifRincian(\'' + esc(x.j.id_jenis) + '\')"><i class="bi bi-list-check"></i>Lihat &amp; terapkan</button></div>').join('');
}
const tarifNama = t => { if (t.id_wali) { const w = S.ix.wali[t.id_wali] || {}; return 'Wali: ' + esc(w.nama_wali || '-') + ' <span class="muted sm">(' + (S.ix.anak[t.id_wali] || []).map(s => esc(s.nama)).join(', ') + ')</span>'; } const s = S.ix.siswa[t.id_siswa] || {}; return '<b>' + esc(s.nama || '-') + '</b> <span class="cls">' + esc(kelasNm(s.id_kelas)) + '</span>'; };
function tarifRincian(id) {
  const j = S.ix.jenis[id]; if (!j) return; const L = tarifSelisih(id), belum = L.filter(x => x.paid <= 0), sudah = L.filter(x => x.paid > 0), bisa = sudah.filter(x => x.fin >= x.paid);
  if (!L.length) { closeModal(); const bn = $('tfBanner'); if (bn) bn.innerHTML = tarifBanner(); return toast('Semua tagihan ' + j.nama + ' sudah sesuai tarif.'); }
  const T1 = belum.slice(0, 150).map(x => '<tr><td>' + tarifNama(x.t) + '</td><td class="sm">' + esc(perLbl(x.t.periode)) + '</td><td class="num">' + rp(x.t.nominal) + '</td><td class="num"><b>' + rp(x.fin) + '</b></td></tr>').join('');
  const T2 = sudah.slice(0, 150).map(x => '<tr><td>' + tarifNama(x.t) + '</td><td class="sm">' + esc(perLbl(x.t.periode)) + '</td><td class="num">' + rp(x.t.nominal) + '</td><td class="num">' + rp(x.paid) + '</td><td class="num"><b>' + rp(x.fin) + '</b></td><td class="sm">' + (x.fin >= x.paid ? (x.fin > x.paid ? 'kekurangan ' + rp(x.fin - x.paid) : 'lunas') : '<span style="color:var(--tunggak)">tidak bisa: terbayar lebih besar</span>') + '</td><td class="right">' + (x.fin >= x.paid ? '<button class="btn sm" onclick="tarifRow(\'' + esc(x.t.id_tagihan) + '\',' + x.fin + ',\'' + esc(id) + '\')">Sesuaikan</button>' : '') + '</td></tr>').join('');
  openModal('Selisih tarif — ' + j.nama,
    '<div class="note" style="align-items:flex-start"><i class="bi bi-info-circle"></i><span>Tarif di Data Master hanya dipakai saat tagihan dibuat. Di bawah ini tagihan yang nominalnya <b>berbeda</b> dari tarif sekarang (keringanan/beasiswa sudah diperhitungkan). Yang <b>belum dibayar</b> aman diperbarui otomatis. Yang <b>sudah ada pembayarannya</b> tidak diubah otomatis — Anda bisa menyesuaikannya satu per satu, atau sekaligus (selisihnya menjadi kekurangan).</span></div>' +
    (belum.length ? '<h3 style="margin:8px 0 6px">Belum dibayar (' + belum.length + ')</h3><div class="tw" style="max-height:220px;overflow:auto"><table class="t" style="min-width:480px"><thead><tr><th>Siswa / wali</th><th>Periode</th><th class="right">Nominal sekarang</th><th class="right">Tarif baru</th></tr></thead><tbody>' + T1 + '</tbody></table></div>' : '') +
    (sudah.length ? '<h3 style="margin:14px 0 6px">Sudah ada pembayaran (' + sudah.length + ')</h3><div class="tw" style="max-height:260px;overflow:auto"><table class="t" style="min-width:640px"><thead><tr><th>Siswa / wali</th><th>Periode</th><th class="right">Nominal sekarang</th><th class="right">Terbayar</th><th class="right">Tarif baru</th><th>Akibat</th><th></th></tr></thead><tbody>' + T2 + '</tbody></table></div>' : ''),
    '<button class="btn" onclick="closeModal()">Tutup</button>' + (belum.length ? '<button class="btn pri" id="tfGo" onclick="tarifGo(\'' + esc(id) + '\',false)"><i class="bi bi-arrow-repeat"></i>Terapkan ke yang belum dibayar (' + belum.length + ')</button>' : '') + (bisa.length ? '<button class="btn" id="tfGo2" onclick="tarifGo(\'' + esc(id) + '\',true)">Terapkan juga ke yang sudah dibayar (' + bisa.length + ')</button>' : ''), true);
}
function tarifGo(id, termasuk) {
  const b = $(termasuk ? 'tfGo2' : 'tfGo'); if (b) b.disabled = true;
  api('terapkanTarifBaru', id, { termasukDibayar: !!termasuk }).then(r => { if (!r.success) { if (b) b.disabled = false; return toast(r.message, 'err'); } setLive(r.data.live); const bn = $('tfBanner'); if (bn) bn.innerHTML = tarifBanner(); if (tarifSelisih(id).length) tarifRincian(id); else closeModal(); toast(r.message); }).catch(e => { if (b) b.disabled = false; toast(e.message, 'err'); });
}
function tarifRow(tid, ke, jid) {
  api('ubahNominalTagihan', tid, ke, 'Penyesuaian tarif ' + jenisNm(jid)).then(r => { if (!r.success) return toast(r.message, 'err'); setLive(r.data.live); const bn = $('tfBanner'); if (bn) bn.innerHTML = tarifBanner(); tarifRincian(jid); toast('Tagihan disesuaikan ke ' + rp(ke) + '.'); }).catch(e => toast(e.message, 'err'));
}
/* ───────── Hapus permanen kwitansi (Super Admin) ───────── */
function kwHapusForm(no) {
  const g = groupKwitansi().find(x => x.no === no); if (!g) return;
  openModal('Hapus permanen kwitansi?', '<div class="note" style="background:var(--tunggak-bg);align-items:flex-start"><i class="bi bi-exclamation-octagon"></i><div class="sm"><b>' + esc(no) + '</b> · ' + esc(g.owner.nama) + ' · ' + rp(g.total) + ' · ' + esc(g.status) + '<ul style="margin:6px 0 0;padding-left:18px"><li>Catatan pembayaran <b>benar-benar dihapus</b> (beda dengan Batalkan yang tetap menyimpan riwayat).</li><li>Tagihan yang dibayar kembali menjadi <b>belum dibayar</b>. Tagihan yang lahir bersama transaksi (infak sukarela, seragam) ikut hilang. Stok seragam tidak otomatis kembali.</li><li>Nomor kwitansi <b>tidak dipakai ulang</b>. Ringkasannya (nomor, tanggal, total) tersimpan di Log Audit.</li></ul></div></div><p class="muted sm" style="margin:0 0 8px">Untuk koreksi biasa gunakan <b>Batalkan</b>. Hapus permanen sebaiknya hanya untuk data uji atau salah input fatal.</p><label class="l" for="khKonf">Ketik nomor kwitansi <b class="mono">' + esc(no) + '</b> untuk konfirmasi</label><input class="in mono" id="khKonf" autocomplete="off" autocapitalize="none" oninput="$(\'khBtn\').disabled=this.value.trim()!==\'' + esc(no) + '\'">', '<button class="btn" onclick="closeModal()">Batal</button><button class="btn danger" id="khBtn" disabled onclick="kwHapusGo(\'' + esc(no) + '\')"><i class="bi bi-trash"></i>Hapus Permanen</button>');
}
function kwHapusGo(no) {
  const b = $('khBtn'); b.disabled = true;
  api('hapusKwitansiPermanen', [no], $('khKonf').value).then(r => { if (!r.success) { b.disabled = false; return toast(r.message, 'err'); } if (!r.data.terhapus) { b.disabled = false; return toast((r.data.dilewati[0] || {}).alasan || 'Tidak ada yang dihapus.', 'err'); } closeModal(); setLive(r.data.live); toast('Kwitansi ' + no + ' dihapus permanen.'); }).catch(e => { b.disabled = false; toast(e.message, 'err'); });
}
/* bersihkan data uji: banyak kwitansi sekaligus */
const KB = { dari: '', sampai: '', scope: 'semua' };
function kbCalc() {
  const L = groupKwitansi().filter(g => { const d = String(g.tanggal).slice(0, 10); return (!KB.dari || d >= KB.dari) && (!KB.sampai || d <= KB.sampai) && (KB.scope === 'semua' || g.status !== 'aktif'); });
  const ok = L.filter(g => !isClosedDate(g.tanggal)); return { all: L, ok: ok, skip: L.length - ok.length, total: ok.reduce((a, g) => a + (g.status === 'aktif' ? g.total : 0), 0) };
}
function kbForm() {
  KB.dari = ''; KB.sampai = ''; KB.scope = 'semua';
  openModal('Bersihkan data uji — hapus permanen kwitansi', '<div class="note" style="background:var(--tunggak-bg);align-items:flex-start"><i class="bi bi-exclamation-octagon"></i><span>Menghapus <b>permanen</b> kwitansi pada rentang tanggal yang dipilih. Tagihan yang dibayar kembali menjadi belum dibayar. Bulan yang sudah <b>ditutup</b> otomatis dilewati. Ringkasan tercatat di Log Audit.</span></div><div class="grid g2"><div><label class="l" for="kbDr">Dari tanggal</label><input class="in" type="date" id="kbDr" oninput="KB.dari=this.value;kbDraw()"></div><div><label class="l" for="kbSp">Sampai tanggal</label><input class="in" type="date" id="kbSp" oninput="KB.sampai=this.value;kbDraw()"></div></div><label class="l" for="kbSc">Yang dihapus</label><select class="in" id="kbSc" onchange="KB.scope=this.value;kbDraw()"><option value="semua">Semua kwitansi pada rentang ini</option><option value="batal">Hanya yang sudah dibatalkan/dihapus</option></select><div id="kbSum" style="margin:10px 0"></div><label class="l" for="kbKonf">Ketik <b class="mono">HAPUS</b> untuk melanjutkan</label><input class="in mono" id="kbKonf" autocomplete="off" oninput="kbDraw()">', '<button class="btn" onclick="closeModal()">Batal</button><button class="btn danger" id="kbGo" disabled onclick="kbJalan()"><i class="bi bi-trash"></i>Hapus Permanen</button>'); kbDraw();
}
function kbDraw() {
  const x = kbCalc(), e = $('kbSum'); if (!e) return;
  e.innerHTML = '<div class="row wrap" style="gap:8px"><span class="st Belum" style="text-transform:none">Akan dihapus: ' + x.ok.length + ' kwitansi</span><span class="st Wali" style="text-transform:none">Nilai aktif: ' + rp(x.total) + '</span><span class="st Sebagian" style="text-transform:none">Dilewati (bulan ditutup): ' + x.skip + '</span></div>' + (x.ok.length && !KB.dari && !KB.sampai && KB.scope === 'semua' ? '<div class="errmsg" style="margin-top:6px">Tanpa rentang tanggal, SEMUA kwitansi yang bulannya belum ditutup akan dihapus.</div>' : '');
  const g = $('kbGo'); if (g) g.disabled = !(x.ok.length > 0 && String(($('kbKonf') || {}).value || '').trim() === 'HAPUS');
}
async function kbJalan() {
  const nos = kbCalc().ok.map(g => g.no), b = $('kbGo'); b.disabled = true; let tot = 0, lw = 0, last = null;
  for (let i = 0; i < nos.length; i += 300) {
    b.innerHTML = '<span class="spin" style="width:14px;height:14px;border-width:2px"></span> ' + Math.min(i + 300, nos.length) + ' / ' + nos.length;
    try { const r = await api('hapusKwitansiPermanen', nos.slice(i, i + 300), 'HAPUS'); if (!r.success) { toast(r.message, 'err'); break; } tot += r.data.terhapus; lw += r.data.dilewati.length; last = r; } catch (e) { toast(e.message, 'err'); break; }
  }
  if (last) setLive(last.data.live); closeModal(); toast(tot + ' kwitansi dihapus permanen' + (lw ? ', ' + lw + ' dilewati' : '') + '.');
}
let KW = {};
function kwLoad() { const c = S.cfg; KW = { wmAktif: String(c.wmAktif) === '1', wmMode: c.wmMode || 'teks', wmTeks: c.wmTeks === undefined ? (c.namaMadrasah || '') : c.wmTeks, wmUkuran: Number(c.wmUkuran) || 48, wmOpasitas: Number(c.wmOpasitas) || 8, wmSudut: (c.wmSudut === undefined || c.wmSudut === '') ? -30 : Number(c.wmSudut), wmGambar: c.wmGambar || '' }; }
const kwCfg = () => Object.assign({}, S.cfg, { wmAktif: KW.wmAktif ? '1' : '0', wmMode: KW.wmMode, wmTeks: KW.wmTeks, wmUkuran: KW.wmUkuran, wmOpasitas: KW.wmOpasitas, wmSudut: KW.wmSudut, wmGambar: KW.wmGambar });
function kwSet(k, v) { KW[k] = v; kwPrev(); }
function kwPrev() { const e = $('kwPrev'); if (e) e.innerHTML = kwSampleHTML(kwCfg()); }
function kwSampleHTML(c) {
  const sg = (S.sig || []).find(s => s.username === S.user.username);
  return wmHTMLFrom(c) + kopHTMLFrom(c) + '<h2>BUKTI PENERIMAAN KAS / KWITANSI PEMBAYARAN</h2><div style="text-align:center;font-size:12px">Nomor: <b>KW/2026/10/0001</b></div><table class="meta nb"><tr><td>Telah terima dari</td><td>: Bpk. Contoh Wali (Wali Murid)</td></tr><tr><td>Nama Siswa</td><td>: Contoh Siswa (Kelas 4B)</td></tr></table><table><thead><tr><th style="width:28px">No</th><th>Pos Pembiayaan</th><th style="text-align:right">Nominal (Rp)</th></tr></thead><tbody><tr><td>1</td><td>SPP Oktober 2026</td><td class="n">250.000</td></tr><tr><td colspan="2"><b>JUMLAH TOTAL TERBAYAR</b></td><td class="n"><b>250.000</b></td></tr></tbody></table><table class="nb" style="margin-top:12px"><tr><td style="width:50%;text-align:center;border:0">Penyetor / Wali Murid,<br><br><br><br>(…………………)</td><td style="width:50%;text-align:center;border:0">Kasir / Penerima,' + (sg ? '<div style="height:70px"><img src="' + sg.ttd + '" alt="" style="max-height:66px;max-width:180px"></div>' : '<br><br><br><br>') + '<u>' + esc(S.user.nama) + '</u></td></tr></table>';
}
function kwDraw() {
  const w = $('kwWrap'); if (!w) return; const m = KW.wmMode;
  w.innerHTML = '<div class="grid g-main" style="grid-template-columns:5fr 7fr"><div class="card"><h3>Watermark Kwitansi</h3><p class="muted sm" style="margin:2px 0 6px">Tampil samar di latar kwitansi (layar &amp; cetak). Tidak dipakai di laporan bulanan.</p>' +
    '<label class="chk"><input type="checkbox" ' + (KW.wmAktif ? 'checked' : '') + ' onchange="kwSet(\'wmAktif\',this.checked)"> Tampilkan watermark di kwitansi</label>' +
    '<label class="l" for="kwMode">Jenis watermark</label><select class="in" id="kwMode" onchange="kwSet(\'wmMode\',this.value);kwDraw()"><option value="teks" ' + (m === 'teks' ? 'selected' : '') + '>Teks</option><option value="logo" ' + (m === 'logo' ? 'selected' : '') + '>Logo madrasah</option><option value="gambar" ' + (m === 'gambar' ? 'selected' : '') + '>Gambar sendiri</option></select>' +
    (m === 'teks' ? '<label class="l" for="kwTeks">Isi teks (boleh beberapa baris, maks. 200 karakter)</label><textarea class="in" id="kwTeks" maxlength="200" style="min-height:84px" oninput="kwSet(\'wmTeks\',this.value)">' + esc(KW.wmTeks) + '</textarea>' : '') +
    (m === 'logo' ? '<div class="hint">' + (S.cfg.logoKop ? 'Memakai logo madrasah dari Kop &amp; Identitas.' : 'Logo madrasah belum diunggah (Kop &amp; Identitas).') + '</div>' : '') +
    (m === 'gambar' ? '<div class="lg-box" style="margin-top:10px;text-align:left"><div class="ttd-prev">' + (KW.wmGambar ? '<img src="' + KW.wmGambar + '" alt="Watermark">' : '<span class="muted sm">Belum ada gambar</span>') + '</div><div class="row wrap"><label class="btn sm" style="cursor:pointer"><i class="bi bi-upload"></i>' + (KW.wmGambar ? 'Ganti' : 'Unggah') + ' gambar<input type="file" accept="image/*" hidden onchange="kwPickGambar(this)"></label>' + (KW.wmGambar ? '<button class="btn sm danger" onclick="kwSet(\'wmGambar\',\'\');kwDraw()"><i class="bi bi-trash"></i>Hapus</button>' : '') + '</div></div>' : '') +
    '<label class="l" for="kwUk">' + (m === 'teks' ? 'Ukuran huruf' : 'Ukuran gambar') + ': <b id="kwUkV">' + KW.wmUkuran + '</b></label><input type="range" id="kwUk" min="16" max="120" step="2" value="' + KW.wmUkuran + '" oninput="$(\'kwUkV\').textContent=this.value;kwSet(\'wmUkuran\',Number(this.value))" style="width:100%">' +
    '<label class="l" for="kwOp">Kepekatan: <b id="kwOpV">' + KW.wmOpasitas + '</b>%</label><input type="range" id="kwOp" min="2" max="30" step="1" value="' + KW.wmOpasitas + '" oninput="$(\'kwOpV\').textContent=this.value;kwSet(\'wmOpasitas\',Number(this.value))" style="width:100%">' +
    '<label class="l" for="kwSd">Kemiringan: <b id="kwSdV">' + KW.wmSudut + '</b>°</label><input type="range" id="kwSd" min="-60" max="60" step="5" value="' + KW.wmSudut + '" oninput="$(\'kwSdV\').textContent=this.value;kwSet(\'wmSudut\',Number(this.value))" style="width:100%">' +
    '<div class="row wrap" style="margin-top:14px"><button class="btn pri" id="kwSave" onclick="kwSimpan()"><i class="bi bi-save"></i>Simpan</button></div><div class="hint">Catatan: watermark tampil pada pratinjau dan hasil <b>Cetak</b> (termasuk simpan PDF dari dialog cetak browser). Fitur “Simpan PDF ke Drive” memakai mesin PDF Google dan dapat tidak menampilkannya.</div></div>' +
    '<div class="card"><h3>Pratinjau</h3><p class="muted sm" style="margin:2px 0 8px">Contoh tampilan kwitansi' + (TTD_ROLES.includes(S.user.peran) ? ' (memakai tanda tangan Anda bila ada)' : '') + '.</p><div style="overflow:auto"><div class="paper" id="kwPrev" style="padding:16px"></div></div></div></div>';
  kwPrev();
}
function kwPickGambar(input) {
  const f = input.files[0]; input.value = ''; if (!f) return; if (!/^image\//.test(f.type)) return toast('Berkas harus berupa gambar.', 'err');
  const rd = new FileReader(); rd.onload = () => { const img = new Image(); img.onload = () => {
    let max = 420, out = '';
    for (let k = 0; k < 8; k++) { const sc = Math.min(1, max / Math.max(img.width, img.height)), w = Math.max(1, Math.round(img.width * sc)), h = Math.max(1, Math.round(img.height * sc)), cv = document.createElement('canvas'); cv.width = w; cv.height = h; const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, w, h); out = cv.toDataURL('image/png'); if (out.length > 44000) { cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); cx.drawImage(img, 0, 0, w, h); out = cv.toDataURL('image/jpeg', 0.8); } if (out.length <= 44000) break; max = Math.round(max * 0.8); }
    if (out.length > 44000) return toast('Gambar terlalu rumit untuk dikompres. Gunakan gambar yang lebih sederhana.', 'err'); KW.wmGambar = out; kwDraw();
  }; img.onerror = () => toast('Gambar tidak dapat dibaca.', 'err'); img.src = rd.result; }; rd.readAsDataURL(f);
}
function kwSimpan() {
  if (KW.wmAktif && KW.wmMode === 'gambar' && !KW.wmGambar) return toast('Unggah gambar watermark terlebih dahulu.', 'err');
  if (KW.wmAktif && KW.wmMode === 'teks' && !String(KW.wmTeks).trim()) return toast('Isi teks watermark, atau matikan watermark.', 'err');
  const o = { wmAktif: KW.wmAktif ? '1' : '0', wmMode: KW.wmMode, wmTeks: KW.wmTeks, wmUkuran: String(KW.wmUkuran), wmOpasitas: String(KW.wmOpasitas), wmSudut: String(KW.wmSudut), wmGambar: KW.wmGambar }, snap = Object.assign({}, S.cfg), b = $('kwSave'); b.disabled = true;
  api('saveConfig', o).then(r => { b.disabled = false; if (!r.success) return toast(r.message, 'err'); S.cfg = r.data; persist(); toast('Pengaturan kwitansi disimpan.'); }).catch(e => { b.disabled = false; S.cfg = snap; toast(e.message || 'Gagal menyimpan.', 'err'); });
}
let MB = [];
function mbLoad() { MB = clone(metodeAll()).map((m, i) => Object.assign({ id: 'm' + (i + 1), nama: '', tipe: 'tunai', ket: '', bank: '', norek: '', atasnama: '', aktif: true }, m)); }
function mbSet(i, k, v) { MB[i][k] = v; }
function mbRender() { const e = $('mbList'); if (e) e.innerHTML = mbList(); }
function mbAdd() { if (MB.length >= 12) return toast('Maksimal 12 metode.', 'err'); MB.push({ id: 'm' + uuid().slice(1, 6), nama: '', tipe: 'transfer', ket: '', bank: '', norek: '', atasnama: S.cfg.namaMadrasah || '', aktif: true }); mbRender(); }
function mbDel(i) { MB.splice(i, 1); mbRender(); toast('Belum tersimpan — klik Simpan.'); }
function mbList() {
  return MB.map((m, i) => '<div class="card" style="box-shadow:none;margin-bottom:10px;' + (m.aktif === false ? 'opacity:.65' : '') + '"><div class="grid g2"><div><label class="l" style="margin-top:0">Nama metode</label><input class="in" value="' + esc(m.nama) + '" placeholder="mis. Transfer BSI" oninput="mbSet(' + i + ',\'nama\',this.value)"></div><div><label class="l" style="margin-top:0">Jenis</label><select class="in" onchange="mbSet(' + i + ',\'tipe\',this.value);mbRender()"><option value="tunai" ' + (m.tipe === 'tunai' ? 'selected' : '') + '>Tunai (kas)</option><option value="transfer" ' + (m.tipe === 'transfer' ? 'selected' : '') + '>Transfer bank</option></select></div></div>' +
    '<label class="l">Keterangan (tampil di bawah nama metode)</label><input class="in" value="' + esc(m.ket) + '" placeholder="mis. Loket Bendahara" oninput="mbSet(' + i + ',\'ket\',this.value)">' +
    (m.tipe === 'transfer' ? '<div class="grid g3"><div><label class="l">Bank</label><input class="in" value="' + esc(m.bank) + '" placeholder="BSI" oninput="mbSet(' + i + ',\'bank\',this.value)"></div><div><label class="l">No. rekening</label><input class="in mono" inputmode="numeric" value="' + esc(m.norek) + '" placeholder="7120-8899-01" oninput="mbSet(' + i + ',\'norek\',this.value)"></div><div><label class="l">Atas nama</label><input class="in" value="' + esc(m.atasnama) + '" oninput="mbSet(' + i + ',\'atasnama\',this.value)"></div></div>' : '') +
    '<div class="row" style="margin-top:10px;justify-content:space-between"><label class="chk"><input type="checkbox" ' + (m.aktif !== false ? 'checked' : '') + ' onchange="mbSet(' + i + ',\'aktif\',this.checked);mbRender()"> Aktif (bisa dipilih)</label><button class="btn sm danger" onclick="mbDel(' + i + ')"><i class="bi bi-trash"></i>Hapus</button></div></div>').join('');
}
function mbSave() {
  const L = MB.map(m => Object.assign({}, m, { nama: String(m.nama || '').trim(), norek: String(m.norek || '').trim() })), er = m => toast(m, 'err');
  if (!L.length) return er('Minimal satu metode pembayaran.'); if (L.some(m => !m.nama)) return er('Nama metode tidak boleh kosong.');
  if (new Set(L.map(m => m.nama.toLowerCase())).size !== L.length) return er('Nama metode harus unik.'); if (!L.some(m => m.aktif !== false)) return er('Minimal satu metode harus aktif.');
  if (L.some(m => !/^[0-9 .-]{0,30}$/.test(m.norek))) return er('No. rekening hanya boleh berisi angka, spasi, titik, atau strip.');
  const o = { metodeBayar: JSON.stringify(L), templateRekening: $('cf_templateRekening').value.trim() }, snap = Object.assign({}, S.cfg), b = $('mbSave'); b.disabled = true;
  api('saveConfig', o).then(r => { b.disabled = false; if (!r.success) return er(r.message); S.cfg = r.data; delete S.rendered.pembayaran; delete S.rendered.seragam; persist(); toast('Metode & rekening disimpan.'); pRender(); }).catch(e => { b.disabled = false; S.cfg = snap; er(e.message || 'Gagal menyimpan.'); });
}
function kopPreview() { const c = Object.assign({}, S.cfg); ['kop1', 'kop2', 'namaMadrasah', 'alamat'].forEach(k => { const e = $('cf_' + k); if (e) c[k] = e.value; }); $('kopPrev').innerHTML = kopHTMLFrom(c) + '<div style="text-align:center;font-size:12px;color:#555">— isi dokumen —</div>'; }
function pickWarna(v) { applyBrand(v); const i = $('cf_warnaUtama'); if (i) i.value = v; document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('on', s.style.background && s.getAttribute('aria-label') === 'Warna ' + v)); }
function saveCfgKeys(keys) {
  const o = {}; keys.forEach(k => { const e = $('cf_' + k); if (e) o[k] = e.value.trim(); }); const snap = Object.assign({}, S.cfg); Object.assign(S.cfg, o); $('taLbl').textContent = 'T.A. ' + (S.cfg.tahunAktif || ''); applyBrand(); persist(); toast('Pengaturan disimpan.');
  api('saveConfig', o).then(r => { if (!r.success) { S.cfg = snap; applyBrand(); toast(r.message, 'err'); } }).catch(e => { S.cfg = snap; applyBrand(); toast(e.message, 'err'); });
}
function saveBrand() {
  const o = { appName: $('cf_appName').value.trim() || 'SADaM', appSub: $('cf_appSub').value.trim(), warnaUtama: $('cf_warnaUtama').value, modulOff: [...document.querySelectorAll('.modchk')].filter(c => !c.checked).map(c => c.value).join(',') };
  const snap = Object.assign({}, S.cfg); Object.assign(S.cfg, o); applyBrand(); renderNav(); document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.p === S.page)); persist(); toast('Tampilan disimpan.');
  api('saveConfig', o).then(r => { if (!r.success) { S.cfg = snap; applyBrand(); renderNav(); toast(r.message, 'err'); } }).catch(e => { S.cfg = snap; applyBrand(); renderNav(); toast(e.message, 'err'); });
}
function resetBanner() {
  const rq = (S.m.pengguna || []).filter(u => u.minta_reset); if (!rq.length) return '';
  return '<div class="note" style="background:var(--sebagian-bg);align-items:flex-start"><i class="bi bi-bell-fill"></i><div class="grow"><b>' + rq.length + ' permintaan reset password</b><div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px">' + rq.map(u => '<span class="chip" style="height:auto;padding:3px 6px 3px 10px"><b class="mono">' + esc(u.username) + '</b> <span class="muted">' + esc(u.nama) + '</span> <button class="btn sm pri" onclick="resetPw(\'' + esc(u.username) + '\')">Reset sekarang</button></span>').join('') + '</div></div></div>';
}
function uForm(un) {
  const u = un ? S.m.pengguna.find(x => x.username === un) : {}, P_ = ['Super Admin', 'Bendahara', 'Wali Kelas', 'Kepala Madrasah'], mine = String(u.kelas_diampu || '').split(',').map(s => s.trim());
  openModal(un ? 'Ubah Akun' : 'Tambah Akun', '<label class="l" style="margin-top:0" for="uUn">Username</label><input class="in mono" id="uUn" ' + (un ? 'readonly' : '') + ' value="' + esc(u.username || '') + '" placeholder="mis. bendahara atau siti.aminah" autocapitalize="none" autocomplete="off"><div class="hint">Huruf kecil, angka, titik, strip; 3–30 karakter.' + (un ? ' Untuk menggantinya, pakai tombol <b>Ubah Username</b>.' : '') + '</div>' +
    '<label class="l" for="uNm">Nama lengkap</label><input class="in" id="uNm" value="' + esc(u.nama || '') + '"><label class="l" for="uPr">Peran</label><select class="in" id="uPr" onchange="uPeran()">' + P_.map(p => '<option ' + (u.peran === p ? 'selected' : '') + '>' + p + '</option>').join('') + '</select>' +
    '<div id="uKlBox" class="' + (u.peran === 'Wali Kelas' ? '' : 'hide') + '"><label class="l">Kelas yang diampu</label><div class="grid g3" style="gap:4px">' + (S.m.kelas.length ? S.m.kelas.slice().sort((a, b) => natCmp(a.nama_kelas, b.nama_kelas)).map(k => '<label class="chk"><input type="checkbox" class="ukl" value="' + k.id_kelas + '" ' + (mine.includes(k.id_kelas) ? 'checked' : '') + '> Kelas ' + esc(k.nama_kelas) + '</label>').join('') : '<span class="muted sm">Belum ada kelas di Data Master.</span>') + '</div></div>' +
    '<div class="grid g2"><div><label class="l" for="uEm">Email (opsional)</label><input class="in" id="uEm" value="' + esc(u.email || '') + '"></div><div><label class="l" for="uWa">No. WhatsApp (opsional)</label><input class="in mono" id="uWa" inputmode="tel" placeholder="08xxxxxxxxxx" value="' + esc(u.no_wa || '') + '"></div></div><label class="l" for="uSt">Status</label><select class="in" id="uSt"><option ' + (u.status_aktif !== 'Nonaktif' ? 'selected' : '') + '>Aktif</option><option ' + (u.status_aktif === 'Nonaktif' ? 'selected' : '') + '>Nonaktif</option></select>' +
    (un ? '' : '<label class="l" for="uPw">Password awal (opsional)</label><input class="in mono" id="uPw" placeholder="Kosongkan = dibuat otomatis" autocomplete="off"><div class="hint">Pengguna wajib menggantinya saat masuk pertama.</div>') + '<div class="errmsg hide" id="uErr"></div>' + (un && TTD_ROLES.includes(u.peran) ? '<div style="margin-top:12px">' + ttdBox(un, u.nama) + '</div>' : ''),
    '<button class="btn" onclick="closeModal()">Batal</button>' + (un ? '<button class="btn" onclick="unForm(\'' + esc(un) + '\')"><i class="bi bi-pencil-square"></i>Ubah Username</button>' : '') + '<button class="btn pri" id="uBtn" onclick="uSave(' + (un ? 'false' : 'true') + ')">Simpan</button>');
}
function unForm(un) {
  openModal('Ubah username “' + un + '”', '<div class="note" style="background:var(--sebagian-bg)"><i class="bi bi-exclamation-triangle"></i><span>Pengguna ini akan <b>keluar otomatis</b> dan harus masuk dengan username baru (password tetap sama). Riwayat Log Audit lama tetap memakai username lama.</span></div><label class="l" style="margin-top:0" for="unBaru">Username baru</label><input class="in mono" id="unBaru" autocapitalize="none" autocomplete="off" placeholder="mis. siti.aminah" onkeydown="if(event.key===\'Enter\')doUbahUsername(\'' + esc(un) + '\')"><div class="errmsg hide" id="unErr"></div>',
    '<button class="btn" onclick="closeModal()">Batal</button><button class="btn pri" id="unBtn" onclick="doUbahUsername(\'' + esc(un) + '\')">Ubah Username</button>');
}
function doUbahUsername(lama) {
  const baru = $('unBaru').value.trim().toLowerCase(), er = m => { $('unErr').textContent = m; $('unErr').classList.remove('hide'); };
  if (!/^[a-z0-9._-]{3,30}$/.test(baru)) return er('Username baru 3–30 karakter: huruf kecil, angka, titik, strip, atau garis bawah.');
  if (baru === lama) return er('Username baru sama dengan yang lama.'); if (S.m.pengguna.some(x => x.username === baru)) return er('Username sudah dipakai akun lain.');
  const btn = $('unBtn'); btn.disabled = true;
  api('ubahUsername', lama, baru).then(r => {
    btn.disabled = false; if (!r.success) return er(r.message);
    const u = S.m.pengguna.find(x => x.username === lama); if (u) u.username = baru; if (r.data.kelas) S.m.kelas = r.data.kelas; reindex(); modalLock = false; closeModal();
    if (r.data.sesiSendiri) return forceLogout('Username Anda diubah menjadi “' + baru + '”. Silakan masuk kembali.');
    pRender(); toast('Username diubah menjadi ' + baru + '.');
  }).catch(e => { btn.disabled = false; er(e.message || 'Gagal mengubah username.'); });
}
function uPeran() { $('uKlBox').classList.toggle('hide', $('uPr').value !== 'Wali Kelas'); }
function uSave(isNew) {
  const rec = { username: $('uUn').value.trim().toLowerCase(), nama: $('uNm').value.trim(), peran: $('uPr').value, kelas_diampu: [...document.querySelectorAll('.ukl:checked')].map(c => c.value).join(','), email: $('uEm').value.trim(), no_wa: $('uWa').value.trim(), status_aktif: $('uSt').value };
  const er = m => { $('uErr').textContent = m; $('uErr').classList.remove('hide'); };
  if (!/^[a-z0-9._-]{3,30}$/.test(rec.username)) return er('Username 3–30 karakter: huruf kecil, angka, titik, strip, atau garis bawah.'); if (!rec.nama) return er('Nama wajib diisi.');
  if (rec.peran === 'Wali Kelas' && !rec.kelas_diampu) return er('Pilih minimal satu kelas untuk Wali Kelas.');
  if (rec.username === S.user.username && (rec.peran !== 'Super Admin' || rec.status_aktif === 'Nonaktif')) return er('Anda tidak dapat menurunkan/menonaktifkan akun sendiri.');
  const pw = isNew ? ($('uPw').value.trim()) : ''; if (pw && pw.length < 8) return er('Password awal minimal 8 karakter.');
  const btn = $('uBtn'); btn.disabled = true;
  api('simpanPengguna', rec, pw).then(r => {
    btn.disabled = false; if (!r.success) return er(r.message);
    const i = S.m.pengguna.findIndex(x => x.username === rec.username); if (i >= 0) S.m.pengguna[i] = r.data.user; else S.m.pengguna.push(r.data.user);
    closeModal(); pRender(); if (r.data.passwordSementara) credModal(rec.username, r.data.passwordSementara, 'Akun dibuat', r.data.user); else toast('Akun disimpan.');
  }).catch(e => { btn.disabled = false; er(e.message || 'Gagal menyimpan.'); });
}
let CRED = '';
function credModal(un, pw, title, usr) {
  usr = usr || {}; const nama = usr.nama || un;
  CRED = "Assalamu'alaikum " + nama + ".\nAkun SADaM Anda:\nUsername: " + un + "\nPassword sementara: " + pw + "\n\nSilakan masuk, lalu buat password baru Anda sendiri. Jangan bagikan password kepada siapa pun.";
  const wa = usr.no_wa ? waLink(usr.no_wa, CRED) : '';
  openModal(title, '<div class="note" style="background:var(--sebagian-bg)"><i class="bi bi-exclamation-triangle"></i><span>Password ini <b>hanya ditampilkan sekali</b>. Kirim langsung kepada pengguna; mereka wajib menggantinya saat masuk pertama.</span></div><div class="card" style="box-shadow:none;background:var(--canvas)"><div class="muted sm">Username</div><div class="mono" style="font-size:16px;font-weight:600">' + esc(un) + '</div><div class="muted sm" style="margin-top:8px">Password sementara</div><div class="mono" style="font-size:18px;font-weight:600;letter-spacing:.5px">' + esc(pw) + '</div></div>' + (usr.no_wa ? '' : '<div class="hint">Tip: isi No. WhatsApp di data akun agar pesan bisa langsung dikirim lewat WhatsApp.</div>'),
    '<button class="btn" onclick="copyCred()"><i class="bi bi-clipboard"></i>Salin pesan</button>' + (wa ? '<a class="btn wa" target="_blank" rel="noopener" href="' + wa + '"><i class="bi bi-whatsapp"></i>Kirim via WhatsApp</a>' : '') + '<button class="btn pri" onclick="closeModal()">Selesai</button>');
}
function copyCred() {
  const done = () => toast('Disalin ke clipboard.');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(CRED).then(done).catch(fb); else fb();
  function fb() { const t = document.createElement('textarea'); t.value = CRED; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Salin manual: ' + CRED, 'err'); } t.remove(); }
}
function hapusAkunForm(un) {
  const u = S.m.pengguna.find(x => x.username === un); if (!u) return;
  openModal('Hapus akun “' + un + '”?', '<div class="note" style="background:var(--tunggak-bg);align-items:flex-start"><i class="bi bi-exclamation-octagon"></i><div class="sm"><b>' + esc(u.nama) + '</b> (' + esc(u.peran) + ') akan dihapus permanen dan tidak dapat masuk lagi.<ul style="margin:6px 0 0;padding-left:18px"><li>Riwayat transaksi <b>tetap utuh</b> — nama petugas sudah tersimpan pada tiap transaksi.</li><li>Tanda tangan akun ini ikut terhapus; kwitansi lama yang ia catat tidak lagi menampilkan tanda tangan.</li><li>Bila wali kelas, kaitannya dengan kelas dikosongkan.</li></ul></div></div><p class="muted sm" style="margin:0 0 8px">Hanya ingin menghentikan akses? <b>Nonaktifkan</b> saja — bisa diaktifkan lagi kapan pun.</p><label class="l" for="haKonf">Ketik <b class="mono">' + esc(un) + '</b> untuk konfirmasi</label><input class="in mono" id="haKonf" autocomplete="off" autocapitalize="none" oninput="$(\'haBtn\').disabled=this.value.trim().toLowerCase()!==\'' + esc(un) + '\'">',
    '<button class="btn" onclick="closeModal()">Batal</button><button class="btn" onclick="nonaktifAkun(\'' + esc(un) + '\')">Nonaktifkan saja</button><button class="btn danger" id="haBtn" disabled onclick="doHapusAkun(\'' + esc(un) + '\')"><i class="bi bi-trash"></i>Hapus Permanen</button>');
}
function nonaktifAkun(un) {
  const u = S.m.pengguna.find(x => x.username === un); if (!u) return;
  api('simpanPengguna', { username: u.username, nama: u.nama, peran: u.peran, kelas_diampu: u.kelas_diampu, email: u.email, no_wa: u.no_wa, status_aktif: 'Nonaktif' }, '').then(r => { if (!r.success) return toast(r.message, 'err'); const i = S.m.pengguna.findIndex(x => x.username === un); if (i >= 0) S.m.pengguna[i] = r.data.user; closeModal(); pRender(); toast('Akun dinonaktifkan.'); }).catch(e => toast(e.message, 'err'));
}
function doHapusAkun(un) {
  const b = $('haBtn'); if (b) b.disabled = true;
  api('hapusPengguna', un).then(r => {
    if (!r.success) { if (b) b.disabled = false; return toast(r.message, 'err'); }
    S.m.pengguna = S.m.pengguna.filter(x => x.username !== un); if (r.data && r.data.kelas) S.m.kelas = r.data.kelas; S.sig = S.sig.filter(s => s.username !== un); S.sigKey = ''; reindex(); persist(); closeModal(); pRender(); toast('Akun “' + un + '” dihapus.');
  }).catch(e => { if (b) b.disabled = false; toast(e.message, 'err'); });
}
function resetPw(un) { openModal('Reset password ' + un + '?', '<p class="muted">Password lama tidak berlaku lagi dan sesi pengguna ini berakhir. Anda akan mendapat password sementara untuk diberikan kepadanya.</p>', '<button class="btn" onclick="closeModal()">Batal</button><button class="btn pri" id="rpBtn" onclick="doResetPw(\'' + esc(un) + '\')"><i class="bi bi-key"></i>Reset Password</button>'); }
function doResetPw(un) {
  const b = $('rpBtn'); b.disabled = true;
  api('resetPassword', un).then(r => { if (!r.success) { b.disabled = false; return toast(r.message, 'err'); } const u = S.m.pengguna.find(x => x.username === un); if (u) { u.wajib_ganti = 'ya'; u.punya_password = true; u.minta_reset = ''; } if (S.live.reset) S.live.reset = S.live.reset.filter(x => x !== un); updBadges(); closeModal(); pRender(); credModal(un, r.data.password, 'Password direset', u); }).catch(e => { b.disabled = false; toast(e.message, 'err'); });
}
function doBackup() { toast('Membuat cadangan…'); api('jalankanBackup').then(r => toast(r.message, r.success ? 'ok' : 'err')).catch(e => toast(e.message, 'err')); }

/* ============================================================
 * LOG AUDIT
 * ============================================================ */
RENDER.audit = function () {
  $('s-audit').innerHTML = pageHead('Log Audit', 'Riwayat perubahan data (pembayaran, pembatalan, master, pengaturan).', '<button class="btn" onclick="loadAudit()"><i class="bi bi-arrow-repeat"></i>Muat ulang</button>') + '<div class="card tight"><div class="tw" id="aTbl">' + (S.audit ? '' : '<div style="padding:16px"><div class="skel" style="margin-bottom:10px"></div><div class="skel" style="margin-bottom:10px"></div><div class="skel"></div></div>') + '</div></div>'; if (S.audit) aShow(); loadAudit();
};
RENDER.audit.upd = function () { };
function loadAudit() { api('getAudit', 300).then(r => { if (r.success) { S.audit = r.data; aShow(); } else toast(r.message, 'err'); }).catch(e => toast(e.message, 'err')); }
function aShow() { $('aTbl').innerHTML = S.audit.length ? '<table class="t"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Data terdampak</th></tr></thead><tbody>' + S.audit.map(a => '<tr><td class="mono sm nowrap">' + tglID(a.waktu) + ' ' + jam(a.waktu) + '</td><td class="sm">' + esc(a.pengguna) + '</td><td><span class="st Wali" style="text-transform:none">' + esc(a.aksi) + '</span></td><td class="sm mono" style="max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(a.data_terdampak) + '">' + esc(a.data_terdampak) + '</td></tr>').join('') + '</tbody></table>' : emptyBox('bi-clock-history', 'Belum ada catatan.'); }
