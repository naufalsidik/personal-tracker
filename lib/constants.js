// Nama bulan Indonesia lengkap (untuk nama sheet)
export const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

// Singkatan bulan Inggris (untuk format tanggal di sheet, misal "15-Apr")
export const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

// Whitelist kategori untuk pengeluaran variable
// Dipakai untuk validasi di API dan dropdown di UI
export const VAR_CATEGORIES = [
  'Belanja', 'Biaya Admin', 'Donasi', 'Hiburan', 'Hutang', 'Jajan', 'Kebutuhan',
  'Kesehatan', 'Lain-lain', 'Laundry', 'Makan', 'Parkir',
  'Pendidikan', 'Perawatan Diri', 'Transportasi'
]

// Jenis dompet. Dipindah dari pages/api/money/wallets/index.js — named
// export dari file route bukan pola yang didukung resmi Next.js, cuma
// kebetulan jalan.
export const JENIS_DOMPET = ['Rekening', 'E-Wallet', 'Cash', 'Investasi', 'Lainnya']

// Modul lamaran kerja. Dipisah dari lib/jobs.js supaya bisa diimpor
// langsung dari komponen klien (pages/jobs/index.js) — lib/jobs.js sendiri
// menarik lib/db.js yang throw kalau DATABASE_URL belum ada, jadi tidak
// aman diikutkan ke bundle klien.
export const JENIS_LAMARAN = ['MT', 'Magang', 'Tetap', 'Kontrak', 'Freelance']
export const TEMPAT_LAMARAN = ['WFO', 'WFH', 'Hybrid']
export const STATUS_LAMARAN = ['Progress', 'Applied', 'Screening', 'Interview', 'Offer', 'Rejected', 'Ghosted']

// Kategori bawaan untuk biaya admin transfer antar dompet.
// Dipisahkan dari 'Lain-lain' supaya totalnya bisa dilihat sendiri —
// biaya transfer kecil-kecil tapi berulang, dan mudah luput kalau
// bercampur dengan pengeluaran tak berkategori.
export const KATEGORI_BIAYA_ADMIN = 'Biaya Admin'

// Warna per kategori untuk UI
export const CATEGORY_COLORS = {
  Hutang: '#f85149', Makan: '#3fb950', Jajan: '#f0a500',
  Transportasi: '#58a6ff', Belanja: '#bc8cff', Donasi: '#39d353',
  Parkir: '#ffa657', Laundry: '#79c0ff', Pendidikan: '#d2a8ff',
  Kebutuhan: '#56d364', Kesehatan: '#ff7b72', Hiburan: '#e3b341',
  'Perawatan Diri': '#f778ba', 'Lain-lain': '#8b949e',
  'Biaya Admin': '#4db6ac',
}
