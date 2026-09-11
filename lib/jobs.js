import { sql } from './db'
import { hariIniWIB } from './periods'
import { JENIS_LAMARAN as JENIS, TEMPAT_LAMARAN as TEMPAT, STATUS_LAMARAN as STATUS } from './constants'

const teks = v => (typeof v === 'string' ? v.trim() : '')
const iso = v => (v ? new Date(v).toISOString() : null)

// Cuma http(s) yang boleh tersimpan. Tanpa ini, URL lowongan yang diketik
// atau ditempel sebagai `javascript:...` akan dieksekusi begitu link-nya
// diklik dari halaman jobs — self-XSS, tapi tetap dicegah dari sumbernya.
function urlAman(v) {
  const s = teks(v)
  return /^https?:\/\//i.test(s) ? s : ''
}

// Kolom database snake_case, kontrak JSON camelCase.
// tanggal_apply sengaja di-cast ke teks di SQL supaya tidak kena
// pergeseran zona waktu saat driver mengubahnya jadi objek Date.
export const KOLOM = sql`
  id, perusahaan, lokasi, jabatan, jenis, tempat, status,
  to_char(tanggal_apply, 'YYYY-MM-DD') as tanggal_apply,
  to_char(deadline, 'YYYY-MM-DD') as deadline,
  referensi, url, gaji, catatan, sumber, created_at, updated_at
`

export function keJson(r) {
  if (!r) return null
  return {
    id: r.id,
    perusahaan: r.perusahaan,
    lokasi: r.lokasi,
    jabatan: r.jabatan,
    jenis: r.jenis,
    tempat: r.tempat,
    status: r.status,
    tanggalApply: r.tanggal_apply,
    deadline: r.deadline,
    referensi: r.referensi,
    url: r.url,
    gaji: r.gaji,
    catatan: r.catatan,
    sumber: r.sumber,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  }
}

// Menyusun nilai yang siap ditulis. Nilai tidak dikenal jatuh ke default,
// bukan ditolak — meniru perilaku sanitize() di server.js lama supaya
// Cowork tidak perlu tahu daftar nilai yang sah.
//
// Field opsional (lokasi, deadline, referensi, url, gaji, catatan) beda
// perlakuan antara "tidak dikirim" (pertahankan nilai lama, dipakai PUT
// yang cuma mengirim field yang berubah) dan "dikirim string kosong"
// (sengaja dikosongkan pengguna). Sebelumnya keduanya disamakan lewat `||`
// biasa, jadi field yang sudah pernah diisi tidak bisa dihapus lagi lewat
// UI — deadline yang dicabut lowongannya tetap dianggap ada, misalnya.
// Field identitas (perusahaan, jabatan, tanggalApply) tetap fallback ke
// nilai lama tanpa terkecuali; tidak masuk akal jadi kosong lewat form.
function kosongkan(v, fallback, nilaiKosong) {
  if (v === undefined) return fallback || nilaiKosong
  return teks(v) || nilaiKosong
}

export function bersihkan(input, lama = {}) {
  const hariIni = hariIniWIB()
  return {
    perusahaan: teks(input.perusahaan) || lama.perusahaan || '',
    lokasi: kosongkan(input.lokasi, lama.lokasi, ''),
    jabatan: teks(input.jabatan) || lama.jabatan || '',
    jenis: JENIS.includes(input.jenis) ? input.jenis : lama.jenis || 'Tetap',
    tempat: TEMPAT.includes(input.tempat) ? input.tempat : lama.tempat || 'WFO',
    status: STATUS.includes(input.status) ? input.status : lama.status || 'Applied',
    tanggalApply: teks(input.tanggalApply) || lama.tanggalApply || hariIni,
    // Sengaja boleh null: banyak lowongan tidak mengumumkan batas waktu.
    // Nilai kosong disimpan sebagai null, bukan string kosong, supaya
    // tipe date di Postgres tidak menolaknya.
    deadline: kosongkan(input.deadline, lama.deadline, null),
    referensi: kosongkan(input.referensi, lama.referensi, ''),
    url: urlAman(kosongkan(input.url, lama.url, '')),
    gaji: kosongkan(input.gaji, lama.gaji, ''),
    catatan: kosongkan(input.catatan, lama.catatan, ''),
    sumber: teks(input.sumber) || lama.sumber || 'manual',
  }
}

export async function cariDuplikat(perusahaan, jabatan) {
  const baris = await sql`
    select ${KOLOM} from job_applications
    where lower(trim(perusahaan)) = lower(trim(${perusahaan}))
      and lower(trim(jabatan))    = lower(trim(${jabatan}))
    limit 1
  `
  return baris.length ? keJson(baris[0]) : null
}
