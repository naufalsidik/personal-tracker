import { withAuth } from '../../../lib/auth'
import { sql } from '../../../lib/db'
import { getCurrentPeriod, monthIndex, nextPeriod } from '../../../lib/periods'

// Daftar SEMUA periode yang punya data, lintas tahun — bukan cuma tahun
// berjalan. Sebelumnya endpoint ini dibatasi satu tahun sekaligus, jadi
// begitu tahun berganti, periode tahun lalu (termasuk Desember-nya) hilang
// dari dropdown dan tidak terjangkau lagi dari UI walau datanya masih ada
// di database.
//
// Bentuk respons berubah dari `sheets: string[]` jadi `sheets: {month,year}[]`
// supaya periode dengan nama bulan yang sama di tahun berbeda tidak ambigu.
//
// Periode berjalan dan periode berikutnya SELALU ikut, meski belum punya
// data sama sekali. Tanpa itu, tidak ada cara memilih periode kosong untuk
// mulai mengisinya — dropdown hanya menampilkan yang sudah berisi, dan
// yang belum berisi tidak akan pernah berisi karena tidak bisa dipilih.
//
// Ini yang menggantikan endpoint init-sheet. Baris fixed cost untuk periode
// baru dibuat sendiri oleh data.js saat periode itu pertama kali dibuka,
// dan nilainya diisi template Rutin.

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const current = getCurrentPeriod()

  try {
    const rows = await sql`
      SELECT month, year FROM variable_expenses
      UNION
      SELECT month, year FROM incomes
      UNION
      SELECT month, year FROM fixed_costs
      UNION
      SELECT month, year FROM savings
    `

    const kunci = (m, y) => `${y}-${m}`
    const map = new Map(
      rows.map(r => [kunci(r.month, r.year), { month: r.month, year: Number(r.year) }])
    )

    map.set(kunci(current.month, current.year), { month: current.month, year: current.year })

    // Periode berikutnya ikut ditawarkan supaya bisa diisi lebih awal.
    const berikut = nextPeriod(current.month, current.year)
    if (berikut) map.set(kunci(berikut.month, berikut.year), { month: berikut.month, year: berikut.year })

    const sheets = [...map.values()].sort((a, b) =>
      a.year - b.year || monthIndex(a.month) - monthIndex(b.month)
    )

    res.json({ sheets, current })
  } catch (err) {
    console.error('[api/sheets-list]', err.message)
    res.status(500).json({ error: 'Gagal mengambil daftar periode' })
  }
}

export default withAuth(handler)
