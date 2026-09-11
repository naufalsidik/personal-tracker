import { sql, toNumber } from './db'
import { monthIndex } from './periods'
import { FIXED_ITEMS } from './validation'
import { VAR_CATEGORIES } from './constants'

export const JENIS = ['income', 'variable', 'fixed']

export const keJsonRecurring = r => ({
  id: Number(r.id),
  jenis: r.jenis,
  description: r.description,
  item: r.item,
  category: r.category,
  amount: toNumber(r.amount),
  hari: Number(r.hari),
  walletId: r.wallet_id === null ? null : Number(r.wallet_id),
  aktif: r.aktif,
})

// Dompet boleh kosong. Nilai yang tidak masuk akal jadi null, bukan ditolak,
// supaya template tetap tersimpan meski dompetnya belum ditentukan.
export const bersihkanWalletId = v => {
  const n = parseInt(v, 10)
  return Number.isInteger(n) && n > 0 ? n : null
}

const pad = n => String(n).padStart(2, '0')

// Kunci periode yang dipakai kolom recurring_for.
export const kunciPeriode = (month, year) => `${month}-${year}`

// Terjemahkan "tanggal 20" jadi tanggal sungguhan di dalam periode.
// Periode berjalan dari tanggal 20 bulan M sampai 19 bulan M+1, jadi
// hari >= 20 jatuh di bulan awal dan hari <= 19 di bulan berikutnya.
//
// Hari 31 di bulan yang hanya punya 30 hari dijepit ke hari terakhir,
// bukan dibuang. Kalau dibiarkan lewat, tagihan yang jatuh tempo akhir
// bulan akan hilang di bulan-bulan pendek.
export function tanggalDalamPeriode(hari, month, year) {
  const idx = monthIndex(month)
  if (idx === -1) return null

  if (hari >= 20) {
    const jumlahHari = new Date(Date.UTC(year, idx + 1, 0)).getUTCDate()
    return `${year}-${pad(idx + 1)}-${pad(Math.min(hari, jumlahHari))}`
  }

  const endIdx = (idx + 1) % 12
  const endYear = idx === 11 ? year + 1 : year
  const jumlahHari = new Date(Date.UTC(endYear, endIdx + 1, 0)).getUTCDate()
  return `${endYear}-${pad(endIdx + 1)}-${pad(Math.min(hari, jumlahHari))}`
}

export function validateRecurring(d) {
  const e = []
  if (!d || typeof d !== 'object') return ['Data tidak valid']
  if (!JENIS.includes(d.jenis)) e.push('Jenis tidak valid')

  const jumlah = Number(d.amount)
  if (!Number.isFinite(jumlah) || jumlah < 0 || jumlah > 1_000_000_000) {
    e.push('Jumlah tidak valid')
  }

  const hari = Number(d.hari)
  if (!Number.isInteger(hari) || hari < 1 || hari > 31) e.push('Hari harus 1-31')

  if (d.walletId !== undefined && d.walletId !== null && d.walletId !== '') {
    const w = Number(d.walletId)
    if (!Number.isInteger(w) || w <= 0) e.push('Dompet tidak valid')
  }

  if (d.jenis === 'fixed') {
    if (!FIXED_ITEMS.includes(d.item)) e.push('Item fixed cost tidak valid')
  } else {
    const desc = String(d.description || '').trim()
    if (!desc || desc.length > 200) e.push('Deskripsi wajib diisi (max 200 karakter)')
    if (d.jenis === 'variable' && !VAR_CATEGORIES.includes(d.category)) {
      e.push('Kategori tidak valid')
    }
  }
  return e
}

// Masukkan semua template aktif ke periode ini.
//
// Dipanggil tiap kali /api/money/data dibaca, jadi harus tahan diulang.
//
// Penanda "sudah pernah diterapkan" disimpan di tabel recurring_applied,
// bukan disimpulkan dari ada tidaknya baris hasil. Bedanya penting: kalau
// disimpulkan dari barisnya, menghapus gaji secara manual membuatnya
// muncul lagi begitu halaman dimuat ulang, dan Anda tidak punya cara
// menghapusnya selain menonaktifkan templatenya.
//
// Fixed cost tetap diperlakukan berbeda. Barisnya sudah dibuat lebih dulu
// oleh data.js dengan nilai 0, jadi yang dilakukan di sini mengisi nilainya,
// dan hanya kalau masih 0 — supaya suntingan manual tidak tertimpa.
export async function terapkanRecurring(month, year) {
  const templates = await sql`select * from recurring where aktif = true`
  if (!templates.length) return 0

  const kunci = kunciPeriode(month, year)

  const jejak = await sql`
    select recurring_id from recurring_applied where periode = ${kunci}
  `
  const sudah = new Set(jejak.map(j => Number(j.recurring_id)))

  let jumlah = 0

  for (const t of templates) {
    if (sudah.has(Number(t.id))) continue

    const tanggal = tanggalDalamPeriode(t.hari, month, year)
    if (!tanggal) continue

    if (t.jenis === 'income') {
      await sql`
        insert into incomes (month, year, tanggal, description, amount, wallet_id, recurring_id, recurring_for)
        values (${month}, ${year}, ${tanggal}, ${t.description}, ${t.amount}, ${t.wallet_id}, ${t.id}, ${kunci})
        on conflict do nothing
      `
    } else if (t.jenis === 'variable') {
      await sql`
        insert into variable_expenses (month, year, tanggal, description, category, amount, wallet_id, recurring_id, recurring_for)
        values (${month}, ${year}, ${tanggal}, ${t.description}, ${t.category}, ${t.amount}, ${t.wallet_id}, ${t.id}, ${kunci})
        on conflict do nothing
      `
    } else if (t.jenis === 'fixed') {
      await sql`
        update fixed_costs set amount = ${t.amount}, wallet_id = ${t.wallet_id}
        where month = ${month} and year = ${year} and item = ${t.item} and amount = 0
      `
    }

    // Jejak dicatat apa pun hasilnya. Kalau penyisipan dilewati karena
    // sudah ada baris kembar, penerapannya tetap dianggap terjadi.
    await sql`
      insert into recurring_applied (recurring_id, periode)
      values (${t.id}, ${kunci})
      on conflict do nothing
    `
    jumlah++
  }

  return jumlah
}
