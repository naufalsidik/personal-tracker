import { withAuth } from '../../../../lib/auth'
import { sql } from '../../../../lib/db'
import { validateRecurring, keJsonRecurring as keJson, bersihkanWalletId as bersihkanWallet } from '../../../../lib/recurring'

async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const baris = await sql`
        select * from recurring
        order by jenis, hari, id
      `
      return res.json(baris.map(keJson))
    }

    if (req.method === 'POST') {
      const d = req.body || {}
      const galat = validateRecurring(d)
      if (galat.length) return res.status(400).json({ error: galat.join(', ') })

      const baris = await sql`
        insert into recurring (jenis, description, item, category, amount, hari, wallet_id, aktif)
        values (
          ${d.jenis},
          ${d.jenis === 'fixed' ? '' : String(d.description).trim()},
          ${d.jenis === 'fixed' ? d.item : null},
          ${d.jenis === 'variable' ? d.category : null},
          ${Math.round(Number(d.amount))},
          ${Number(d.hari)},
          ${bersihkanWallet(d.walletId)},
          ${d.aktif !== false}
        )
        returning *
      `
      return res.status(201).json(keJson(baris[0]))
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method tidak diizinkan' })
  } catch (e) {
    console.error('[recurring]', e.message)
    return res.status(500).json({ error: 'Gagal memproses data' })
  }
}

export default withAuth(handler)
