import { withAuth } from '../../../../lib/auth'
import { sql } from '../../../../lib/db'
import { validateRecurring, keJsonRecurring as keJson, bersihkanWalletId as bersihkanWallet } from '../../../../lib/recurring'
import { isValidId } from '../../../../lib/validation'

async function handler(req, res) {
  const id = parseInt(req.query.id, 10)
  if (!isValidId(id)) return res.status(404).json({ error: 'Tidak ditemukan' })

  try {
    if (req.method === 'PUT') {
      const d = req.body || {}
      const galat = validateRecurring(d)
      if (galat.length) return res.status(400).json({ error: galat.join(', ') })

      const baris = await sql`
        update recurring set
          jenis       = ${d.jenis},
          description = ${d.jenis === 'fixed' ? '' : String(d.description).trim()},
          item        = ${d.jenis === 'fixed' ? d.item : null},
          category    = ${d.jenis === 'variable' ? d.category : null},
          amount      = ${Math.round(Number(d.amount))},
          hari        = ${Number(d.hari)},
          wallet_id   = ${bersihkanWallet(d.walletId)},
          aktif       = ${d.aktif !== false},
          updated_at  = now()
        where id = ${id}
        returning *
      `
      if (!baris.length) return res.status(404).json({ error: 'Tidak ditemukan' })
      return res.json(keJson(baris[0]))
    }

    if (req.method === 'DELETE') {
      // Baris yang sudah terlanjur dibuat di periode lalu sengaja tidak ikut
      // dihapus. Menghapus template berarti "berhenti mulai periode depan",
      // bukan "hapus riwayat" — riwayat yang hilang diam-diam jauh lebih
      // berbahaya daripada template yang tertinggal.
      const baris = await sql`delete from recurring where id = ${id} returning id`
      if (!baris.length) return res.status(404).json({ error: 'Tidak ditemukan' })
      return res.json({ ok: true })
    }

    res.setHeader('Allow', 'PUT, DELETE')
    return res.status(405).json({ error: 'Method tidak diizinkan' })
  } catch (e) {
    console.error('[recurring/id]', e.message)
    return res.status(500).json({ error: 'Gagal memproses data' })
  }
}

export default withAuth(handler)
