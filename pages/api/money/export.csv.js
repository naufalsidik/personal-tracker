import { withAuth } from '../../../lib/auth'
import { sql, toNumber } from '../../../lib/db'
import { getCurrentPeriod, isValidMonth, getPeriodLabel } from '../../../lib/periods'
import { selCsv } from '../../../lib/csv'

// Satu berkas CSV berisi seluruh transaksi satu periode: pengeluaran,
// fixed cost, pemasukan, dan tabungan digabung dengan kolom Jenis sebagai
// pembeda. CSV hanya bisa memuat satu tabel, jadi menggabungkannya lebih
// berguna daripada memaksa Anda mengunduh empat berkas terpisah.

const KOLOM = ['Jenis', 'Tanggal', 'Keterangan', 'Kategori', 'Dompet', 'Jumlah']

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const current = getCurrentPeriod()
  const month = req.query.sheet || current.month
  const year = parseInt(req.query.year, 10) || current.year

  if (!isValidMonth(month)) {
    return res.status(400).json({ error: 'Nama periode tidak valid' })
  }

  try {
    const [varRows, fixRows, incRows, savRows] = await Promise.all([
      sql`
        SELECT to_char(v.tanggal, 'YYYY-MM-DD') AS tanggal, v.description,
               v.category, v.amount, w.nama AS dompet
        FROM variable_expenses v
        LEFT JOIN wallets w ON w.id = v.wallet_id
        WHERE v.month = ${month} AND v.year = ${year}
        ORDER BY v.tanggal, v.id
      `,
      sql`
        SELECT f.item, f.amount, w.nama AS dompet
        FROM fixed_costs f
        LEFT JOIN wallets w ON w.id = f.wallet_id
        WHERE f.month = ${month} AND f.year = ${year}
        ORDER BY f.id
      `,
      sql`
        SELECT to_char(i.tanggal, 'YYYY-MM-DD') AS tanggal, i.description,
               i.amount, w.nama AS dompet
        FROM incomes i
        LEFT JOIN wallets w ON w.id = i.wallet_id
        WHERE i.month = ${month} AND i.year = ${year}
        ORDER BY i.tanggal, i.id
      `,
      sql`
        SELECT component, amount FROM savings
        WHERE month = ${month} AND year = ${year}
        ORDER BY id
      `,
    ])

    const baris = [
      ...varRows.map(r => ['Pengeluaran', r.tanggal, r.description, r.category, r.dompet || '', toNumber(r.amount)]),
      ...fixRows.map(r => ['Fixed cost', '', r.item, 'Fixed', r.dompet || '', toNumber(r.amount)]),
      ...incRows.map(r => ['Pemasukan', r.tanggal, r.description, '', r.dompet || '', toNumber(r.amount)]),
      ...savRows.map(r => ['Tabungan', '', r.component, '', '', toNumber(r.amount)]),
    ]

    const csv = [
      KOLOM.join(','),
      ...baris.map(b => b.map(selCsv).join(',')),
    ].join('\n')

    const namaBerkas = `money-${month}-${year}.csv`
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=${namaBerkas}`)
    // BOM di depan supaya Excel membaca berkas ini sebagai UTF-8.
    // Tanpa itu, huruf beraksen dan simbol rupiah tampil rusak.
    return res.send('\uFEFF' + csv)
  } catch (err) {
    console.error('[api/export]', err.message)
    return res.status(500).json({ error: 'Gagal membuat CSV' })
  }
}

export default withAuth(handler)
