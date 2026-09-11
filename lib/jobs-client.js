// Fungsi murni dipakai halaman Jobs dan kartu ringkasannya di home.
// Terpisah dari lib/jobs.js karena file itu menarik lib/db.js lewat sql,
// yang throw tanpa DATABASE_URL — aman di server, tapi tidak aman diikutkan
// ke bundle klien. File ini sengaja tidak mengimpor apa pun dari db.js.

export const SELESAI = ['Rejected', 'Ghosted', 'Offer']

export function hariSejak(d) {
  if (!d) return null
  const t = new Date(d + 'T00:00:00')
  return isNaN(t) ? null : Math.floor((Date.now() - t) / 864e5)
}

export function sisaHari(d) {
  const h = hariSejak(d)
  return h === null ? null : -h
}

// Lamaran dianggap perlu aksi kalau: belum dikirim (Progress), deadline
// tinggal seminggu atau kurang, atau sudah 15 hari sejak dilamar tanpa
// kabar. Satu-satunya definisi. Sebelumnya kartu ringkasan di home punya
// aturan sendiri yang lebih sempit (cuma cek Progress dan 15 hari, tidak
// cek deadline), jadi angkanya bisa beda dari halaman Jobs sendiri.
export function perluAksi(a) {
  if (SELESAI.includes(a.status)) return false
  if (a.status === 'Progress') return true
  const sisa = a.deadline ? sisaHari(a.deadline) : null
  if (sisa !== null && sisa >= 0 && sisa <= 7) return true
  return (hariSejak(a.tanggalApply) ?? 0) >= 15
}
