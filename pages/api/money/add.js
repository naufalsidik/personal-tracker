import { withAuth } from '../../../lib/auth'
import { sql, toNumber } from '../../../lib/db'
import { getCurrentPeriod, isValidMonth, parseInputDate } from '../../../lib/periods'
import {
  validateVariable,
  validateIncome,
  validateSaving,
  validateFixed,
  FIXED_ITEMS,
} from '../../../lib/validation'

// Fungsi findNextEmptyRow dari versi lama dihapus. Di Postgres tidak ada
// konsep "baris kosong berikutnya", jadi batasan maksimal 60 pengeluaran /
// 8 pemasukan / 3 saving ikut hilang.

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { type, data, sheet, year: yearRaw, confirm } = req.body || {}

  if (!['variable', 'fixed', 'income', 'saving'].includes(type)) {
    return res.status(400).json({ error: 'Tipe transaksi tidak valid' })
  }

  const current = getCurrentPeriod()
  const month = sheet || current.month
  const year = parseInt(yearRaw, 10) || current.year

  if (!isValidMonth(month)) {
    return res.status(400).json({ error: 'Nama periode tidak valid' })
  }
  // Dompet opsional dan ikut di dalam `data`. Nilai yang bukan bilangan
  // bulat positif dijadikan null, bukan ditolak — kehilangan penanda
  // dompet lebih ringan daripada kehilangan catatan transaksinya.
  const walletIdMentah = parseInt(data?.walletId, 10)
  const walletId = Number.isInteger(walletIdMentah) && walletIdMentah > 0
    ? walletIdMentah
    : null
  let validationErrors = []
  if (type === 'variable') validationErrors = validateVariable(data)
  else if (type === 'fixed') validationErrors = validateFixed(data)
  else if (type === 'income') validationErrors = validateIncome(data)
  else if (type === 'saving') validationErrors = validateSaving(data)

  if (validationErrors.length > 0) {
    return res.status(400).json({ error: validationErrors.join(', ') })
  }

  try {
    if (type === 'variable') {
      const iso = parseInputDate(data.date, month, year)
      if (!iso) return res.status(400).json({ error: 'Format tanggal tidak valid' })

      await sql`
        INSERT INTO variable_expenses (month, year, tanggal, description, category, amount, wallet_id)
        VALUES (${month}, ${year}, ${iso}, ${data.description.trim()},
                ${data.category}, ${Math.round(Number(data.amount))}, ${walletId})
      `
    } else if (type === 'income') {
      const iso = parseInputDate(data.date, month, year)
      if (!iso) return res.status(400).json({ error: 'Format tanggal tidak valid' })

      await sql`
        INSERT INTO incomes (month, year, tanggal, description, amount, wallet_id)
        VALUES (${month}, ${year}, ${iso}, ${data.description.trim()},
                ${Math.round(Number(data.amount))}, ${walletId})
      `
    } else if (type === 'saving') {
      const goalIdMentah = parseInt(data.goalId, 10)
      const goalId = Number.isInteger(goalIdMentah) && goalIdMentah > 0 ? goalIdMentah : null

      // Kalau target dipilih, nama komponen ikut nama target di database,
      // bukan yang dikirim client. Supaya nama tidak pernah menyimpang dari
      // target yang sebenarnya dipilih.
      let component = String(data.component || '').trim()
      if (goalId) {
        const goalRows = await sql`select component from saving_goals where id = ${goalId}`
        if (!goalRows.length) return res.status(400).json({ error: 'Target tidak ditemukan' })
        component = goalRows[0].component
      }

      await sql`
        INSERT INTO savings (month, year, component, amount, wallet_id, goal_id)
        VALUES (${month}, ${year}, ${component},
                ${Math.round(Number(data.amount))}, ${walletId}, ${goalId})
      `
    } else if (type === 'fixed') {
      if (!FIXED_ITEMS.includes(data.item)) {
        return res.status(400).json({ error: 'Item tidak valid' })
      }

      // Alur konfirmasi dipertahankan: kalau item sudah punya nilai dan
      // frontend belum mengirim confirm, balas 409 supaya UI menampilkan
      // dialog "sudah terisi, mau ditimpa?".
      const existingRows = await sql`
        SELECT amount FROM fixed_costs
        WHERE month = ${month} AND year = ${year} AND item = ${data.item}
      `
      const existing = existingRows.length ? toNumber(existingRows[0].amount) : 0

      if (existing > 0 && !confirm) {
        return res.status(409).json({
          needsConfirm: true,
          existing,
          message: `Item ${data.item} sudah terisi Rp${existing.toLocaleString('id-ID')}`,
        })
      }

      // Upsert: kalau barisnya belum ada, buat. Kalau sudah ada, timpa nilainya.
      await sql`
        INSERT INTO fixed_costs (month, year, item, amount, wallet_id)
        VALUES (${month}, ${year}, ${data.item}, ${Math.round(Number(data.amount))}, ${walletId})
        ON CONFLICT (month, year, item)
        DO UPDATE SET amount = EXCLUDED.amount, wallet_id = EXCLUDED.wallet_id
      `
    }

    res.json({ success: true })
  } catch (err) {
    console.error('[api/add]', err.message)
    res.status(500).json({ error: 'Gagal menyimpan data' })
  }
}

export default withAuth(handler)
