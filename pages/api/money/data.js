import { withAuth } from '../../../lib/auth'
import { sql, toNumber } from '../../../lib/db'
import {
  getCurrentPeriod,
  getPeriodLabel,
  getPeriodDates,
  formatDateLabel,
  isValidMonth,
  hariIniWIB,
} from '../../../lib/periods'
import { FIXED_ITEMS } from '../../../lib/validation'
import { terapkanRecurring } from '../../../lib/recurring'

// Bentuk JSON yang dikembalikan endpoint ini SENGAJA dibuat sama persis
// dengan versi Google Sheets, termasuk nama field `rowNum` dan `sheetName`.
// Tujuannya supaya pages/index.js (904 baris) tidak perlu disentuh sama sekali.
// Bedanya cuma satu: `rowNum` sekarang berisi id dari database, bukan nomor
// baris spreadsheet. Nilainya bisa lebih besar dari 200.

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const current = getCurrentPeriod()
  const month = req.query.sheet || current.month
  const year = parseInt(req.query.year, 10) || current.year

  if (!isValidMonth(month)) {
    return res.status(400).json({ error: 'Nama periode tidak valid' })
  }

  try {
    // Penyiapan periode (baris fixed cost + penerapan template rutin)
    // sekarang lewat POST /api/money/periode, dipanggil sebelum endpoint
    // ini dari halaman Money — supaya GET dengan sheet/year bebas pilih
    // (termasuk periode masa depan) tidak punya efek tulis.
    //
    // Kekecualian: periode BERJALAN (bukan dari query, tapi dari jam
    // server) tetap disiapkan otomatis di sini. Kartu ringkasan di home
    // memanggil endpoint ini tanpa lewat halaman Money sama sekali, jadi
    // tanpa ini periode baru bisa tampil kosong kalau home dibuka duluan.
    // Ini aman diulang (ON CONFLICT DO NOTHING + recurring_applied) dan
    // tidak bisa disalahgunakan untuk periode lain karena "current" dihitung
    // dari jam server, bukan dari input pengguna.
    if (month === current.month && year === current.year) {
      await sql`
        INSERT INTO fixed_costs (month, year, item, amount)
        SELECT ${month}, ${year}, t.item, 0
        FROM unnest(${FIXED_ITEMS}::text[]) AS t(item)
        ON CONFLICT (month, year, item) DO NOTHING
      `
      await terapkanRecurring(month, year)
    }

    // to_char dipakai supaya tanggal keluar sebagai string 'YYYY-MM-DD'.
    // Kalau dibiarkan sebagai tipe DATE, driver mengubahnya jadi objek Date
    // dalam timezone server, dan tanggalnya bisa mundur satu hari.
    const [varRows, incRows, fixedRows, savingRows] = await Promise.all([
      sql`
        SELECT id, to_char(tanggal, 'YYYY-MM-DD') AS tanggal,
               description, category, amount, wallet_id
        FROM variable_expenses
        WHERE month = ${month} AND year = ${year}
        ORDER BY tanggal ASC, id ASC
      `,
      sql`
        SELECT id, to_char(tanggal, 'YYYY-MM-DD') AS tanggal,
               description, amount, wallet_id
        FROM incomes
        WHERE month = ${month} AND year = ${year}
        ORDER BY tanggal ASC, id ASC
      `,
      sql`
        SELECT id, item, amount, wallet_id
        FROM fixed_costs
        WHERE month = ${month} AND year = ${year}
      `,
      sql`
        SELECT id, component, amount, wallet_id, goal_id
        FROM savings
        WHERE month = ${month} AND year = ${year}
        ORDER BY id ASC
      `,
    ])

    const transactions = varRows.map(r => ({
      rowNum: Number(r.id),
      date: formatDateLabel(r.tanggal),
      isoDate: r.tanggal,
      description: r.description,
      category: r.category,
      amount: toNumber(r.amount),
	  walletId: r.wallet_id === null ? null : Number(r.wallet_id),
    }))

    const income = incRows.map(r => ({
      rowNum: Number(r.id),
      date: formatDateLabel(r.tanggal),
      isoDate: r.tanggal,
      description: r.description,
      amount: toNumber(r.amount),
	  walletId: r.wallet_id === null ? null : Number(r.wallet_id),
    }))

    const saving = savingRows.map(r => ({
      rowNum: Number(r.id),
      component: r.component,
      amount: toNumber(r.amount),
      walletId: r.wallet_id === null ? null : Number(r.wallet_id),
      goalId: r.goal_id === null ? null : Number(r.goal_id),
    }))

    const totalIncome = income.reduce((s, i) => s + i.amount, 0)
    const totalVariable = transactions.reduce((s, t) => s + t.amount, 0)
    const totalSaving = saving.reduce((s, v) => s + v.amount, 0)

    // Urutkan fixed cost mengikuti urutan FIXED_ITEMS, bukan urutan id,
    // supaya tampilannya konsisten setiap kali dimuat.
    const fixedByItem = new Map(fixedRows.map(r => [r.item, r]))
    const fixedCost = FIXED_ITEMS.map(item => {
      const row = fixedByItem.get(item)
      const amount = row ? toNumber(row.amount) : 0
      const pct = totalIncome > 0 ? (amount / totalIncome) * 100 : 0
      return {
        rowNum: row ? Number(row.id) : null,
        item,
        amount,
        percentage: pct.toFixed(2) + '%',
		walletId: row && row.wallet_id !== null ? Number(row.wallet_id) : null,
      }
    })
    const totalFixed = fixedCost.reduce((s, f) => s + f.amount, 0)

    // ==========================================================
    // REKAP HARIAN
    //
    // PERHATIAN: bagian ini adalah tebakan.
    // Di versi Google Sheets, kolom wajar / selisih / sisa / avgExpense
    // dihitung oleh formula yang ada di dalam spreadsheet, bukan di kode,
    // jadi rumus aslinya tidak terbaca dari repo. Rumus di bawah adalah
    // interpretasi paling masuk akal dari nama kolomnya. Cocokkan dengan
    // formula asli di sheet kamu sebelum dipakai serius.
    //
    //   budget  = pemasukan - fixed cost - saving
    //   wajar   = budget dibagi jumlah hari dalam periode (jatah harian)
    //   jumlah  = total pengeluaran variable pada hari itu
    //   selisih = wajar - jumlah (positif berarti hemat)
    //   sisa    = budget - akumulasi pengeluaran sampai hari itu
    //   avgExpense = rata-rata pengeluaran per hari sampai hari itu
    // ==========================================================
    const allDates = getPeriodDates(month, year)
    const budget = totalIncome - totalFixed - totalSaving

    const spendByDate = new Map()
    transactions.forEach(t => {
      spendByDate.set(t.isoDate, (spendByDate.get(t.isoDate) || 0) + t.amount)
    })

    // Rekap berhenti di hari ini. Hari yang belum terjadi tidak ditampilkan
    // supaya grafik tidak jatuh ke nol di sisa periode.
    const todayIso = hariIniWIB()
    const shownDates = allDates.filter(d => d <= todayIso)

    let cumulative = 0
    const rekap = shownDates.map((iso, i) => {
      // Jatah harian dihitung ulang tiap hari: sisa budget dibagi sisa hari
      // termasuk hari ini. Dihitung SEBELUM belanja hari ini masuk, supaya
      // angkanya adalah jatah saat Anda bangun pagi, bukan setelahnya.
      const sisaHari = allDates.length - i
      const budgetTersisa = budget - cumulative
      const wajar = sisaHari > 0 ? Math.round(budgetTersisa / sisaHari) : 0

      const jumlah = spendByDate.get(iso) || 0
      cumulative += jumlah

      return {
        date: formatDateLabel(iso),
        jumlah,
        wajar,
        selisih: wajar - jumlah,
        sisa: budget - cumulative,
        avgExpense: Math.round(cumulative / (i + 1)),
      }
    })

    const categoryBreakdown = {}
    transactions.forEach(t => {
      categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount
    })

    // Target tabungan aktif. Dikirim bersama data periode supaya form
    // tambah tabungan bisa menawarkan dropdown pilihan target tanpa
    // permintaan jaringan tambahan.
    const goalRows = await sql`
      select id, component from saving_goals where aktif = true order by component
    `
    const savingGoals = goalRows.map(r => r.component)
    const savingGoalsList = goalRows.map(r => ({ id: Number(r.id), component: r.component }))

    // Dompet aktif dikirim bersama data periode supaya form tambah
    // transaksi bisa menawarkannya tanpa permintaan jaringan terpisah.
    const walletRows = await sql`
      select id, nama, jenis from wallets where aktif = true order by urutan, nama
    `
    const wallets = walletRows.map(r => ({
      id: Number(r.id), nama: r.nama, jenis: r.jenis,
    }))

    res.json({
      sheetName: month,
      year,
      period: getPeriodLabel(month, year),
      transactions,
      income,
      fixedCost,
      saving,
	  savingGoals,
	  savingGoalsList,
	  wallets,
      rekap,
      summary: {
        totalIncome,
        totalVariable,
        totalFixed,
        totalSaving,
        totalExpense: totalVariable + totalFixed,
        categoryBreakdown,
      },
    })
  } catch (err) {
    console.error('[api/data]', err.message)
    res.status(500).json({ error: 'Gagal mengambil data' })
  }
}

export default withAuth(handler)
