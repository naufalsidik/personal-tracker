import { withAuth } from '../../../../lib/auth'
import { sql, toNumber } from '../../../../lib/db'

export const JENIS_DOMPET = ['Rekening', 'E-Wallet', 'Cash', 'Investasi', 'Lainnya']

const keJson = r => ({
  id: Number(r.id),
  nama: r.nama,
  jenis: r.jenis,
  saldoAwal: toNumber(r.saldo_awal),
  saldo: toNumber(r.saldo),
  tanggalAwal: r.tanggal_awal,
  catatan: r.catatan,
  aktif: r.aktif,
  urutan: Number(r.urutan),
})

function validasi(d) {
  const e = []
  if (!d || typeof d !== 'object') return ['Data tidak valid']
  const nama = String(d.nama || '').trim()
  if (!nama || nama.length > 60) e.push('Nama wajib diisi (max 60 karakter)')
  if (!JENIS_DOMPET.includes(d.jenis)) e.push('Jenis dompet tidak valid')
  const s = Number(d.saldoAwal)
  if (!Number.isFinite(s)) e.push('Saldo awal harus angka')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.tanggalAwal || ''))) e.push('Tanggal awal wajib diisi')
  return e
}

async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // to_char dipakai supaya tanggal_awal keluar sebagai string 'YYYY-MM-DD',
      // bukan objek Date yang bergeser timezone. Pola yang sama dipakai
      // semua endpoint lain yang mengembalikan kolom tanggal.
      const baris = await sql`
        select id, nama, jenis, saldo_awal, to_char(tanggal_awal, 'YYYY-MM-DD') as tanggal_awal,
               aktif, urutan, catatan, saldo
        from wallet_balances
        order by aktif desc, urutan, nama
      `
      const transfer = await sql`
        select t.id, to_char(t.tanggal, 'YYYY-MM-DD') as tanggal,
               t.amount, t.fee, t.catatan,
               d.nama as dari, k.nama as ke
        from wallet_transfers t
        join wallets d on d.id = t.dari_id
        join wallets k on k.id = t.ke_id
        order by t.tanggal desc, t.id desc
        limit 50
      `
      const dompet = baris.map(keJson)
      return res.json({
        dompet,
        total: dompet.filter(w => w.aktif).reduce((s, w) => s + w.saldo, 0),
        transfer: transfer.map(t => ({
          id: Number(t.id), tanggal: t.tanggal, amount: toNumber(t.amount),
          fee: toNumber(t.fee), catatan: t.catatan, dari: t.dari, ke: t.ke,
        })),
        jenis: JENIS_DOMPET,
      })
    }

    if (req.method === 'POST') {
      const galat = validasi(req.body)
      if (galat.length) return res.status(400).json({ error: galat.join(', ') })
      const d = req.body

      const ada = await sql`select id from wallets where lower(nama) = lower(${String(d.nama).trim()})`
      if (ada.length) return res.status(400).json({ error: 'Nama dompet sudah dipakai' })

      const baris = await sql`
        insert into wallets (nama, jenis, saldo_awal, tanggal_awal, catatan, aktif, urutan)
        values (
          ${String(d.nama).trim()},
          ${d.jenis},
          ${Math.round(Number(d.saldoAwal))},
          ${d.tanggalAwal},
          ${String(d.catatan || '').trim()},
          ${d.aktif !== false},
          ${Number(d.urutan) || 0}
        )
        returning id
      `
      const [w] = await sql`
        select id, nama, jenis, saldo_awal, to_char(tanggal_awal, 'YYYY-MM-DD') as tanggal_awal,
               aktif, urutan, catatan, saldo
        from wallet_balances where id = ${baris[0].id}
      `
      return res.status(201).json(keJson(w))
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method tidak diizinkan' })
  } catch (e) {
    console.error('[wallets]', e.message)
    return res.status(500).json({ error: 'Gagal memproses data' })
  }
}

export default withAuth(handler)
