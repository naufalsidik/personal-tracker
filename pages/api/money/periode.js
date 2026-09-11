import { withAuth } from '../../../lib/auth'
import { sql } from '../../../lib/db'
import { getCurrentPeriod, isValidMonth } from '../../../lib/periods'
import { FIXED_ITEMS } from '../../../lib/validation'
import { terapkanRecurring } from '../../../lib/recurring'

// Menyiapkan satu periode supaya bisa dibuka: baris fixed cost dipastikan
// ada (diisi 0 kalau belum pernah), lalu template Rutin diterapkan.
//
// Sengaja dipisah dari GET /api/money/data. Endpoint baca seharusnya tidak
// punya efek tulis — sebelumnya GET /api/money/data?sheet=X&year=Y bisa
// membuat baris fixed cost dan menjalankan seluruh template rutin ke
// periode itu hanya dengan membukanya, termasuk periode masa depan yang
// cuma diintip.
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const current = getCurrentPeriod()
  const month = req.body?.sheet || current.month
  const year = parseInt(req.body?.year, 10) || current.year

  if (!isValidMonth(month)) {
    return res.status(400).json({ error: 'Nama periode tidak valid' })
  }

  try {
    // Pastikan 5 baris fixed cost selalu ada untuk periode ini.
    // ON CONFLICT DO NOTHING artinya: kalau barisnya sudah ada, lewati.
    // Tanpa ini, item fixed cost yang belum pernah diisi tidak punya id
    // sehingga tidak bisa di-edit dari UI.
    await sql`
      INSERT INTO fixed_costs (month, year, item, amount)
      SELECT ${month}, ${year}, t.item, 0
      FROM unnest(${FIXED_ITEMS}::text[]) AS t(item)
      ON CONFLICT (month, year, item) DO NOTHING
    `

    // Setelah baris fixed cost dipastikan ada, isi nilai dari template berulang.
    // Urutannya penting: template fixed cost mengisi baris, bukan membuatnya.
    await terapkanRecurring(month, year)

    res.json({ success: true })
  } catch (err) {
    console.error('[api/periode]', err.message)
    res.status(500).json({ error: 'Gagal menyiapkan periode' })
  }
}

export default withAuth(handler)
