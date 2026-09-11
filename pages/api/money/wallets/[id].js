import { withAuth } from '../../../../lib/auth'
import { sql, toNumber } from '../../../../lib/db'
import { isValidId } from '../../../../lib/validation'
import { JENIS_DOMPET } from './index'

async function handler(req, res) {
  const id = parseInt(req.query.id, 10)
  if (!isValidId(id)) return res.status(404).json({ error: 'Tidak ditemukan' })

  try {
    if (req.method === 'PUT') {
      const d = req.body || {}
      const nama = String(d.nama || '').trim()
      if (!nama || nama.length > 60) return res.status(400).json({ error: 'Nama wajib diisi' })
      if (!JENIS_DOMPET.includes(d.jenis)) return res.status(400).json({ error: 'Jenis tidak valid' })
      if (!Number.isFinite(Number(d.saldoAwal))) return res.status(400).json({ error: 'Saldo awal tidak valid' })

      const bentrok = await sql`
        select id from wallets where lower(nama) = lower(${nama}) and id <> ${id}
      `
      if (bentrok.length) return res.status(400).json({ error: 'Nama dompet sudah dipakai' })

      const baris = await sql`
        update wallets set
          nama         = ${nama},
          jenis        = ${d.jenis},
          saldo_awal   = ${Math.round(Number(d.saldoAwal))},
          tanggal_awal = ${d.tanggalAwal},
          catatan      = ${String(d.catatan || '').trim()},
          aktif        = ${d.aktif !== false},
          urutan       = ${Number(d.urutan) || 0},
          updated_at   = now()
        where id = ${id}
        returning id
      `
      if (!baris.length) return res.status(404).json({ error: 'Tidak ditemukan' })
      // to_char dipakai supaya tanggal_awal keluar sebagai string 'YYYY-MM-DD',
      // bukan objek Date yang bergeser timezone.
      const [w] = await sql`
        select id, nama, jenis, saldo_awal, to_char(tanggal_awal, 'YYYY-MM-DD') as tanggal_awal,
               aktif, urutan, catatan, saldo
        from wallet_balances where id = ${id}
      `
      return res.json({
        id: Number(w.id), nama: w.nama, jenis: w.jenis,
        saldoAwal: toNumber(w.saldo_awal), saldo: toNumber(w.saldo),
        tanggalAwal: w.tanggal_awal, catatan: w.catatan,
        aktif: w.aktif, urutan: Number(w.urutan),
      })
    }

    if (req.method === 'DELETE') {
      // Dompet yang masih dipakai transfer tidak boleh hilang: riwayat
      // perpindahan uangnya akan menggantung tanpa asal atau tujuan.
      // Kalau sudah tidak dipakai, nonaktifkan saja lewat PUT.
      const dipakai = await sql`
        select 1 from wallet_transfers where dari_id = ${id} or ke_id = ${id} limit 1
      `
      if (dipakai.length) {
        return res.status(400).json({
          error: 'Dompet ini punya riwayat transfer. Nonaktifkan saja, jangan dihapus.',
        })
      }
      // Transaksi yang menunjuk dompet ini kehilangan penandanya
      // (ON DELETE SET NULL), tapi nominalnya tetap utuh.
      const baris = await sql`delete from wallets where id = ${id} returning id`
      if (!baris.length) return res.status(404).json({ error: 'Tidak ditemukan' })
      return res.json({ ok: true })
    }

    res.setHeader('Allow', 'PUT, DELETE')
    return res.status(405).json({ error: 'Method tidak diizinkan' })
  } catch (e) {
    console.error('[wallets/id]', e.message)
    return res.status(500).json({ error: 'Gagal memproses data' })
  }
}

export default withAuth(handler)
