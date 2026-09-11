import { VAR_CATEGORIES } from './constants'

// Item fixed cost. Dulu harus sama persis dengan isi kolom G11-G15 di
// Google Sheet. Sekarang daftar ini yang jadi sumber kebenaran; database
// mengikuti.
export const FIXED_ITEMS = ['Kosan', 'Internet', 'iCloud', 'Claude', 'Apple Music']

// Format tanggal yang diterima: "DD/MM/YYYY" atau "D-Mon" (contoh "15-Apr")
export function isValidDate(str) {
  if (typeof str !== 'string') return false
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) return true
  if (/^\d{1,2}-[A-Za-z]{3}$/.test(str)) return true
  return false
}

// Jumlah uang: angka non-negatif, maksimal 1 miliar.
// Fixed cost boleh 0 (untuk reset), yang lain minimal lebih dari 0.
export function isValidAmount(val, allowZero = false) {
  const num = Number(val)
  if (!Number.isFinite(num)) return false
  if (allowZero ? num < 0 : num <= 0) return false
  if (num > 1_000_000_000) return false
  return true
}

// Tabungan boleh negatif — itu artinya penarikan, bukan setoran. SUM di
// wallet_balances dan progres target sudah netral terhadap tanda, jadi
// tidak perlu tipe baru atau ubah view: setor +500rb lalu tarik -200rb
// otomatis bersisa +300rb di kedua tempat itu. Nol tetap ditolak karena
// tidak berarti apa-apa sebagai transaksi.
export function isValidSavingAmount(val) {
  const num = Number(val)
  if (!Number.isFinite(num)) return false
  if (num === 0) return false
  if (Math.abs(num) > 1_000_000_000) return false
  return true
}

export function isValidDescription(str) {
  if (typeof str !== 'string') return false
  const trimmed = str.trim()
  return trimmed.length > 0 && trimmed.length <= 200
}

export function validateVariable(data) {
  const errors = []
  if (!data || typeof data !== 'object') return ['Data tidak valid']
  if (!isValidDate(data.date)) errors.push('Format tanggal tidak valid')
  if (!isValidDescription(data.description)) errors.push('Deskripsi wajib diisi (max 200 karakter)')
  if (!VAR_CATEGORIES.includes(data.category)) errors.push('Kategori tidak valid')
  if (!isValidAmount(data.amount)) errors.push('Jumlah harus angka positif')
  return errors
}

export function validateFixed(data) {
  const errors = []
  if (!data || typeof data !== 'object') return ['Data tidak valid']
  if (!FIXED_ITEMS.includes(data.item)) errors.push('Item fixed cost tidak valid')
  if (!isValidAmount(data.amount, true)) errors.push('Jumlah tidak valid')
  return errors
}

export function validateIncome(data) {
  const errors = []
  if (!data || typeof data !== 'object') return ['Data tidak valid']
  if (!isValidDate(data.date)) errors.push('Format tanggal tidak valid')
  if (!isValidDescription(data.description)) errors.push('Deskripsi wajib diisi (max 200 karakter)')
  if (!isValidAmount(data.amount)) errors.push('Jumlah harus angka positif')
  return errors
}

export function validateSaving(data) {
  const errors = []
  if (!data || typeof data !== 'object') return ['Data tidak valid']
  // Dompet wajib. Tabungan sekarang memotong saldo dompet asalnya,
  // jadi tanpa dompet, potongan itu tidak punya sumber.
  const walletId = Number(data.walletId)
  if (!Number.isInteger(walletId) || walletId <= 0) {
    errors.push('Dompet wajib dipilih untuk tabungan')
  }
  // Target opsional. Tanpa target, komponen harus diisi manual.
  const goalId = Number(data.goalId)
  const punyaTarget = Number.isInteger(goalId) && goalId > 0
  if (!punyaTarget && !isValidDescription(data.component)) {
    errors.push('Komponen wajib diisi kalau tidak pilih target')
  }
  if (!isValidSavingAmount(data.amount)) errors.push('Jumlah harus angka, tidak nol, maksimal 1 miliar')
  return errors
}

// Dulu batas atasnya 200 karena itu rentang baris spreadsheet.
// Id database naik terus dan akan melewati 200, jadi batas itu dilepas.
// Yang tersisa: harus bilangan bulat positif.
export function isValidId(n) {
  return Number.isInteger(n) && n > 0 && n <= Number.MAX_SAFE_INTEGER
}
