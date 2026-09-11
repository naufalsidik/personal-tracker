import { MONTHS_ID, MONTH_ABBR } from './constants'

// File ini menggantikan lib/sheets.js.
// Semua urusan "periode 20 sampai 19" pindah ke sini, lepas dari Google Sheets.

// Tanggal hari ini di zona WIB, format 'YYYY-MM-DD'. Server Vercel jalan di
// UTC; tanpa ini, jam 00:00-07:00 WIB masih dianggap "kemarin" oleh server —
// paling kerasa tiap tanggal 20 pas jam-jam itu, periode baru belum kebuka.
// Locale 'en-CA' dipakai karena formatnya sudah ISO (YYYY-MM-DD) secara asli.
export function hariIniWIB() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

// Periode berjalan sekarang, dihitung dari tanggal WIB, bukan tanggal server.
// Tanggal >= 20 berarti sudah masuk periode bulan ini.
// Tanggal < 20 berarti masih di periode bulan lalu.
export function getCurrentPeriod() {
  const [y, m, d] = hariIniWIB().split('-').map(Number)

  if (d >= 20) return { month: MONTHS_ID[m - 1], year: y }
  // Sebelum tanggal 20: mundur satu bulan. Kalau sekarang Januari,
  // periodenya Desember tahun lalu.
  if (m === 1) return { month: MONTHS_ID[11], year: y - 1 }
  return { month: MONTHS_ID[m - 2], year: y }
}

export function monthIndex(month) {
  return MONTHS_ID.indexOf(month)
}

export function isValidMonth(month) {
  return typeof month === 'string' && MONTHS_ID.includes(month)
}

// Periode berikutnya setelah (month, year). Dipakai tombol "Buat Periode".
export function nextPeriod(month, year) {
  const idx = monthIndex(month)
  if (idx === -1) return null
  if (idx === 11) return { month: MONTHS_ID[0], year: year + 1 }
  return { month: MONTHS_ID[idx + 1], year }
}

// Label yang ditampilkan di header, contoh "20 Agustus - 19 September 2026".
export function getPeriodLabel(month, year) {
  const idx = monthIndex(month)
  if (idx === -1) return month
  const endIdx = (idx + 1) % 12
  const endYear = idx === 11 ? year + 1 : year
  if (endYear !== year) {
    return `20 ${MONTHS_ID[idx]} ${year} - 19 ${MONTHS_ID[endIdx]} ${endYear}`
  }
  return `20 ${MONTHS_ID[idx]} - 19 ${MONTHS_ID[endIdx]} ${year}`
}

function pad(n) {
  return String(n).padStart(2, '0')
}

// Tanggal awal dan akhir periode, format 'YYYY-MM-DD'.
export function getPeriodBounds(month, year) {
  const idx = monthIndex(month)
  const endIdx = (idx + 1) % 12
  const endYear = idx === 11 ? year + 1 : year
  return {
    start: `${year}-${pad(idx + 1)}-20`,
    end: `${endYear}-${pad(endIdx + 1)}-19`,
  }
}

// Semua tanggal dalam satu periode, urut. Dipakai untuk membangun rekap harian
// (di versi Sheets ini kolom K yang diisi manual oleh init-sheet).
export function getPeriodDates(month, year) {
  const idx = monthIndex(month)
  if (idx === -1) return []
  const dates = []

  // Tanggal 20 sampai akhir bulan awal. Date.UTC dipakai supaya perhitungan
  // tidak bergeser gara-gara timezone server Vercel (UTC) versus WIB.
  const daysInStart = new Date(Date.UTC(year, idx + 1, 0)).getUTCDate()
  for (let d = 20; d <= daysInStart; d++) {
    dates.push(`${year}-${pad(idx + 1)}-${pad(d)}`)
  }

  // Tanggal 1 sampai 19 bulan berikutnya.
  const endIdx = (idx + 1) % 12
  const endYear = idx === 11 ? year + 1 : year
  for (let d = 1; d <= 19; d++) {
    dates.push(`${endYear}-${pad(endIdx + 1)}-${pad(d)}`)
  }

  return dates
}

// Ubah 'YYYY-MM-DD' jadi '15-Aug' untuk ditampilkan di tabel.
// Format ini sengaja dipertahankan supaya tampilan frontend tidak berubah.
export function formatDateLabel(iso) {
  if (!iso || typeof iso !== 'string') return ''
  const [y, m, d] = iso.split('-')
  const abbr = MONTH_ABBR[parseInt(m, 10) - 1]
  if (!abbr) return iso
  return `${parseInt(d, 10)}-${abbr}`
}

// Ubah input dari form jadi 'YYYY-MM-DD'.
// Dua format diterima, sama seperti versi lama:
//   "21/04/2026"  -> tahun eksplisit
//   "15-Aug"      -> tanpa tahun, tahunnya disimpulkan dari periode aktif
// Return null kalau tidak bisa diparse atau tanggalnya tidak nyata
// (misal 31 Februari).
export function parseInputDate(str, month, year) {
  if (typeof str !== 'string') return null
  const s = str.trim()

  let y, m, d

  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  const dash = s.match(/^(\d{1,2})-([A-Za-z]{3})$/)

  if (slash) {
    d = parseInt(slash[1], 10)
    m = parseInt(slash[2], 10)
    y = parseInt(slash[3], 10)
  } else if (dash) {
    d = parseInt(dash[1], 10)
    const abbrIdx = MONTH_ABBR.findIndex(
      a => a.toLowerCase() === dash[2].toLowerCase()
    )
    if (abbrIdx === -1) return null
    m = abbrIdx + 1

    // Tentukan tahun dari periode aktif. Kalau bulannya adalah bulan kedua
    // dari periode Desember, berarti sudah masuk tahun berikutnya.
    const idx = monthIndex(month)
    if (idx === -1) return null
    y = idx === 11 && abbrIdx === 0 ? year + 1 : year
  } else {
    return null
  }

  if (m < 1 || m > 12 || d < 1 || d > 31) return null

  // Verifikasi tanggalnya benar-benar ada di kalender.
  const check = new Date(Date.UTC(y, m - 1, d))
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== m - 1 ||
    check.getUTCDate() !== d
  ) {
    return null
  }

  return `${y}-${pad(m)}-${pad(d)}`
}

export function parseAmount(val) {
  if (val === null || val === undefined) return 0
  if (typeof val === 'number') return val
  return parseInt(String(val).replace(/[^0-9]/g, ''), 10) || 0
}

export function formatRupiah(num) {
  return 'Rp' + Number(num).toLocaleString('id-ID')
}

// Periode mana yang memuat tanggal ini.
//
// Berbeda dari getCurrentPeriod yang selalu memakai hari ini. Dipakai saat
// mencatat biaya admin transfer: transfer tanggal 15 Agustus masuk periode
// Juli, karena periode berjalan dari tanggal 20 ke tanggal 19.
export function periodeUntukTanggal(iso) {
  if (typeof iso !== 'string') return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null

  if (d >= 20) return { month: MONTHS_ID[m - 1], year: y }
  if (m === 1) return { month: MONTHS_ID[11], year: y - 1 }
  return { month: MONTHS_ID[m - 2], year: y }
}