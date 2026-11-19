/* ============================================================
 * SADaM — lapisan API (transport) ke backend Google Apps Script (REST/JSON)
 *   gasPost(action, args)  → POST  {action, data:[args…]}  → {success, data, message}
 *   gasGet(action)         → GET   ?action=…               (publik: ping, infoPublik)
 * POST memakai Content-Type "text/plain" agar tergolong "simple request" (tanpa preflight CORS) —
 * syarat agar GAS dapat dipanggil dari domain lain (github.io). Jangan diubah menjadi application/json.
 * ============================================================ */
const GAS_TIMEOUT_MS = 300000;   // 5 menit: operasi berat (kenaikan kelas + cadangan Drive) bisa lama
class GasError extends Error { constructor(kode, pesan) { super(pesan); this.name = 'GasError'; this.kode = kode; } }
/** Validasi alamat Web App; melempar GasError('KONFIG') bila belum diisi / bentuknya salah. */
function gasUrl(u) {
  u = String(u === undefined ? (typeof GAS_URL === 'string' ? GAS_URL : '') : u).trim();
  if (!/^https:\/\/script\.google\.com\/(?:macros|a\/macros\/[^\/]+|a\/[^\/]+\/macros)\/s\/[A-Za-z0-9_-]+\/exec$/.test(u)) throw new GasError('KONFIG', 'Alamat server belum diisi dengan benar. Buka js/config.js dan isi GAS_URL dengan URL Web App Apps Script (berakhiran /exec).');
  return u;
}
async function gasFetch(url, opts, timeoutMs) {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), timeoutMs || GAS_TIMEOUT_MS); let res;
  try { res = await fetch(url, Object.assign({ redirect: 'follow', signal: ctl.signal }, opts)); }
  catch (e) { throw (e && e.name === 'AbortError') ? new GasError('WAKTU', 'Server terlalu lama merespons. Coba lagi sebentar lagi.') : new GasError('JARINGAN', 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda; atau pastikan alamat di js/config.js benar dan deployment GAS berakses "Anyone".'); }
  finally { clearTimeout(timer); }
  if (!res.ok) throw new GasError('HTTP', 'Server menjawab dengan kode ' + res.status + '. Periksa deployment Web App di Apps Script.');
  const teks = await res.text(); let j; try { j = JSON.parse(teks); } catch (e) { throw new GasError('FORMAT', 'Server tidak mengembalikan data yang benar. Pastikan alamat berakhiran /exec dan deployment berakses "Anyone" (bukan "Only myself").'); }
  return j;
}
function gasPost(action, args, timeoutMs) { return gasFetch(gasUrl(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: action, data: args || [] }) }, timeoutMs); }
function gasGet(action, timeoutMs) { return gasFetch(gasUrl() + '?action=' + encodeURIComponent(action), { method: 'GET' }, timeoutMs); }
/** cek koneksi: {ms, versi, app} atau melempar GasError */
async function gasPing() { const t0 = Date.now(), j = await gasGet('ping', 20000); if (!j || j.success !== true) throw new GasError('FORMAT', 'Server menjawab, tetapi bukan SADaM API. Periksa alamat Web App.'); return { ms: Date.now() - t0, versi: j.data && j.data.versi, app: j.data && j.data.app }; }
