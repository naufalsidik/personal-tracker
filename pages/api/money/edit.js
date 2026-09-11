import { withAuth } from '../../../lib/auth'
import { sql } from '../../../lib/db'
import { getCurrentPeriod, isValidMonth, parseInputDate, getPeriodBounds } from '../../../lib/periods'
import {
  validateVariable,
  validateIncome,
  validateSaving,
  isValidId,
  isValidAmount,
} from '../../../lib/validation'

// Frontend masih mengirim field bernama `rowNum`. Isinya sekarang id
// dari database. Nama field dipertahankan supaya pages/index.js tidak
// perlu diubah.

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action, type, rowNum, sheetName, year: yearRaw, data } = req.body || {}

  if (!['delete', 'update'].includes(action)) {
    return res.status(400).json({ error: 'Action tidak valid' })
  }

  const current = getCurrentPeriod()
  const month = sheetName || current.month
  const year = parseInt(yearRaw, 10) || current.year

  if (!isValidMonth(month)) {
    return res.status(400).json({ error: 'Nama periode tidak valid' })
  }
  const bounds = getPeriodBounds(month, year)

  const id = Number(rowNum)
  // Dompet opsional. Nilai tak masuk akal jadi null, bukan ditolak,
  // supaya penyuntingan tidak gagal hanya karena dompetnya dikosongkan.
  const walletIdMentah = parseInt(data?.walletId, 10)
  const walletId = Number.isInteger(walletIdMentah) && walletIdMentah > 0
    ? walletIdMentah
    : null
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'ID baris tidak valid' })
  }

  // Fixed cost tidak dihapus, cuma di-set 0. Barisnya harus tetap ada
  // karena itemnya preset.
  if (action === 'delete' && type === 'fixed') {
    return res.status(400).json({ error: 'Fixed cost tidak bisa dihapus. Set jumlah 0 untuk reset.' })
  }

  if (action === 'update') {
    const validTypes = ['variable', 'income', 'saving', 'fixed']
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Tipe tidak valid untuk update' })
    }
    let errors = []
    if (type === 'variable') errors = validateVariable(data)
    else if (type === 'income') errors = validateIncome(data)
    else if (type === 'saving') errors = validateSaving(data)
    else if (type === 'fixed') {
      if (!isValidAmount(data?.amount, true)) errors = ['Jumlah tidak valid']
    }
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') })
    }
  }

  try {
    if (action === 'delete') {
      // Setiap query menyertakan month dan year, bukan hanya id.
      // Ini mencegah penghapusan baris milik periode lain kalau
      // frontend salah kirim id.
      let result
      if (type === 'variable') {
        result = await sql`
          DELETE FROM variable_expenses
          WHERE id = ${id} AND month = ${month} AND year = ${year}
          RETURNING id
        `
      } else if (type === 'income') {
        result = await sql`
          DELETE FROM incomes
          WHERE id = ${id} AND month = ${month} AND year = ${year}
          RETURNING id
        `
      } else if (type === 'saving') {
        result = await sql`
          DELETE FROM savings
          WHERE id = ${id} AND month = ${month} AND year = ${year}
          RETURNING id
        `
      } else {
        return res.status(400).json({ error: 'Tipe tidak valid untuk delete' })
      }

      if (result.length === 0) {
        return res.status(404).json({ error: 'Data tidak ditemukan' })
      }
      return res.json({ success: true })
    }

    // action === 'update'
    let result
    if (type === 'variable') {
      const iso = parseInputDate(data.date, month, year)
      if (!iso) return res.status(400).json({ error: 'Format tanggal tidak valid' })
      if (iso < bounds.start || iso > bounds.end) {
        return res.status(400).json({ error: `Tanggal harus di antara ${bounds.start} dan ${bounds.end}` })
      }
      result = await sql`
        UPDATE variable_expenses
        SET tanggal = ${iso},
            description = ${data.description.trim()},
            category = ${data.category},
            amount = ${Math.round(Number(data.amount))},
            wallet_id = ${walletId}
        WHERE id = ${id} AND month = ${month} AND year = ${year}
        RETURNING id
      `
    } else if (type === 'income') {
      const iso = parseInputDate(data.date, month, year)
      if (!iso) return res.status(400).json({ error: 'Format tanggal tidak valid' })
      if (iso < bounds.start || iso > bounds.end) {
        return res.status(400).json({ error: `Tanggal harus di antara ${bounds.start} dan ${bounds.end}` })
      }
      result = await sql`
        UPDATE incomes
        SET tanggal = ${iso},
            description = ${data.description.trim()},
            amount = ${Math.round(Number(data.amount))},
            wallet_id = ${walletId}
        WHERE id = ${id} AND month = ${month} AND year = ${year}
        RETURNING id
      `
    } else if (type === 'saving') {
      const goalIdMentah = parseInt(data.goalId, 10)
      const goalId = Number.isInteger(goalIdMentah) && goalIdMentah > 0 ? goalIdMentah : null

      // Sama seperti waktu ditambahkan: kalau target dipilih, nama komponen
      // ikut nama target itu, bukan yang dikirim client.
      let component = String(data.component || '').trim()
      if (goalId) {
        const goalRows = await sql`select component from saving_goals where id = ${goalId}`
        if (!goalRows.length) return res.status(400).json({ error: 'Target tidak ditemukan' })
        component = goalRows[0].component
      }

      result = await sql`
        UPDATE savings
        SET component = ${component},
            amount = ${Math.round(Number(data.amount))},
            wallet_id = ${walletId},
            goal_id = ${goalId}
        WHERE id = ${id} AND month = ${month} AND year = ${year}
        RETURNING id
      `
    } else if (type === 'fixed') {
      result = await sql`
        UPDATE fixed_costs
        SET amount = ${Math.round(Number(data.amount))},
            wallet_id = ${walletId}
        WHERE id = ${id} AND month = ${month} AND year = ${year}
        RETURNING id
      `
    }

    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Data tidak ditemukan' })
    }
    return res.json({ success: true })
  } catch (err) {
    console.error('[api/edit]', err.message)
    res.status(500).json({ error: 'Gagal memproses perubahan' })
  }
}

export default withAuth(handler)
