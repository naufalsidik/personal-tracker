import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts'
import Shell from '../../components/Shell'
import { IkonMata, IkonMataTutup, IkonUnduh } from '../../components/icons'
import { VAR_CATEGORIES, CATEGORY_COLORS } from '../../lib/constants'
import { FIXED_ITEMS } from '../../lib/validation'
import MoneyNav from '../../components/MoneyNav'
import { useRouter } from 'next/router'
import DaftarTransaksi from '../../components/money/DaftarTransaksi'
import DasborMoney from '../../components/money/DasborMoney'
import TambahTransaksi from '../../components/money/TambahTransaksi'

function formatRp(num) {
  if (!num) return 'Rp0'
  return 'Rp' + Number(num).toLocaleString('id-ID')
}

function maskRp() {
  return 'Rp•••••'
}

function todayFormatted() {
  const d = new Date()
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>
      <p style={{ color: 'var(--muted)', marginBottom: 4, fontSize: 'var(--text-xs)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: 'var(--text-sm)' }}>{p.name}: {formatRp(p.value)}</p>
      ))}
    </div>
  )
}

export default function Home() {
  const [tab, setTab] = useState('dashboard')
  const router = useRouter()
 
  // Tab ikut disimpan di URL sebagai ?tab=. Tanpa ini, tautan dari halaman
  // Rutin atau Target tidak punya cara menunjuk bagian tertentu dan selalu
  // mendarat di Dashboard.
  useEffect(() => {
    const t = router.query.tab
    if (typeof t === 'string' && ['dashboard', 'add', 'transactions'].includes(t)) {
      setTab(t)
    }
  }, [router.query.tab])
 
  // shallow: true menahan Next menjalankan ulang getServerSideProps.
  // Berpindah tab tidak butuh data baru dari server, jadi tanpa ini
  // setiap klik memicu pemeriksaan sesi yang sia-sia.
  function gantiTab(id) {
    setTab(id)
    router.replace({ pathname: '/money', query: { tab: id } }, undefined, { shallow: true })
  }
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [availableSheets, setAvailableSheets] = useState([])
  const [selectedSheet, setSelectedSheet] = useState('')
  const [selectedYear, setSelectedYear] = useState(null)
  const [hideNominal, setHideNominal] = useState(false)

  // Load hide preference dari localStorage saat mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mt_hide_nominal')
      if (saved === '1') setHideNominal(true)
    } catch {}
  }, [])

  function toggleHide() {
    const next = !hideNominal
    setHideNominal(next)
    try {
      localStorage.setItem('mt_hide_nominal', next ? '1' : '0')
    } catch {}
  }

  // Helper: tampilkan nominal atau masked tergantung state
  const showRp = (num) => hideNominal ? maskRp() : formatRp(num)

  // Form state: type = variable/income/saving, subType = variable/fixed (untuk pengeluaran)
  const [formType, setFormType] = useState('variable')
  const [expenseKind, setExpenseKind] = useState('variable') // 'variable' atau 'fixed'
  const [formData, setFormData] = useState({
    date: todayFormatted(),
    description: '',
    category: '',
    amount: '',
    component: '',
    item: '',
	walletId: '',
	goalId: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState('')
  const [editingRow, setEditingRow] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editSaving, setEditSaving] = useState(false)

  function resetForm() {
    setFormData(f => ({
      date: todayFormatted(),
      description: '',
      category: '',
      amount: '',
      component: '',
      item: '',
      walletId: f.walletId,
      goalId: '',
    }))
  }

  async function handleDelete(row, type) {
    const label = type === 'saving' ? row.component : row.description
    if (!confirm(`Hapus "${label}" - ${formatRp(row.amount)}?`)) return
    try {
      const res = await fetch('/api/money/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', type, rowNum: row.rowNum, sheetName: selectedSheet, year: selectedYear }),
      })
      if (res.ok) fetchData(selectedSheet, selectedYear)
      else {
        const err = await res.json()
        alert('Gagal menghapus: ' + (err.error || 'coba lagi'))
      }
    } catch { alert('Error.') }
  }

  const PilihDompet = () => (
    <select
      aria-label="Dompet"
      value={editForm.walletId ?? ''}
      onChange={e => setEditForm({ ...editForm, walletId: e.target.value })}
      style={{ padding: '4px var(--space-2)', fontSize: 'var(--text-2xs)', marginTop: 4 }}
    >
      <option value="">Tanpa dompet</option>
      {(data?.wallets || []).map(w => (
        <option key={w.id} value={w.id}>{w.nama}</option>
      ))}
    </select>
  )

  async function handleSaveEdit(type) {
    setEditSaving(true)
    try {
      const res = await fetch('/api/money/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', type, rowNum: editingRow.rowNum, sheetName: selectedSheet, year: selectedYear, data: editForm }),
      })
      if (res.ok) { setEditingRow(null); fetchData(selectedSheet, selectedYear) }
      else {
        const err = await res.json()
        alert('Gagal menyimpan: ' + (err.error || 'coba lagi'))
      }
    } catch { alert('Error.') }
    setEditSaving(false)
  }

  // sheets-list sekarang mengembalikan {month, year} lintas semua tahun
  // yang punya data, plus current dari server (WIB-aware) — bukan cuma
  // tebakan tahun berjalan di klien. Dikembalikan utuh (bukan cuma array
  // sheets) supaya init effect di bawah bisa pakai `current` buat pilihan
  // default tanpa menghitung ulang "sekarang" di browser.
  const fetchSheets = useCallback(async () => {
    try {
      const res = await fetch('/api/money/sheets-list')
      const json = await res.json()
      setAvailableSheets(json.sheets || [])
      return json
    } catch { return { sheets: [], current: null } }
  }, [])

  const fetchData = useCallback(async (sheet, year) => {
    setLoading(true)
    try {
      // Menyiapkan periode (baris fixed cost + template rutin) adalah
      // penulisan, jadi lewat POST tersendiri, dijalankan sebelum baca.
      // GET /api/money/data di bawah ini murni baca, aman diulang.
      if (sheet && year) {
        await fetch('/api/money/periode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sheet, year }),
        })
      }

      const params = new URLSearchParams()
      if (sheet) params.set('sheet', sheet)
      if (year) params.set('year', String(year))
      const url = params.toString() ? `/api/money/data?${params}` : '/api/money/data'
      const res = await fetch(url)
      const json = await res.json()
      setData(json)
      setSelectedSheet(json.sheetName)
      setSelectedYear(json.year)
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [])

  useEffect(() => {
    const init = async () => {
      const { sheets, current } = await fetchSheets()
      const match = current && sheets.find(s => s.month === current.month && s.year === current.year)
      const target = match || sheets[sheets.length - 1]
      if (target) fetchData(target.month, target.year)
      else setLoading(false)
    }
    init()
  }, [fetchSheets, fetchData])

  // Submit handler — handle semua tipe termasuk confirm flow untuk fixed
  async function submitData(confirmReplace = false) {
    setSubmitting(true)
    setSubmitMsg('')

    // Tentukan tipe aktual untuk API
    let apiType = formType
    if (formType === 'variable') {
      apiType = expenseKind === 'fixed' ? 'fixed' : 'variable'
    }

    // Siapkan payload sesuai tipe
    let payload = {}
    if (apiType === 'variable') {
      payload = { date: formData.date, description: formData.description, category: formData.category, amount: formData.amount, walletId: formData.walletId }
    } else if (apiType === 'fixed') {
      payload = { item: formData.item, amount: formData.amount, walletId: formData.walletId }
    } else if (apiType === 'income') {
      payload = { date: formData.date, description: formData.description, amount: formData.amount, walletId: formData.walletId }
    } else if (apiType === 'saving') {
      payload = {
        component: formData.component, amount: formData.amount,
        walletId: formData.walletId, goalId: formData.goalId,
      }
    }

    try {
      const res = await fetch('/api/money/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: apiType,
          data: payload,
          sheet: selectedSheet,
          year: selectedYear,
          confirm: confirmReplace,
        }),
      })

      if (res.status === 409) {
        // Fixed cost: item sudah terisi, minta konfirmasi
        const json = await res.json()
        const newAmount = Number(formData.amount)
        const msg = `Item ${formData.item} sudah terisi Rp${json.existing.toLocaleString('id-ID')}. Replace jadi Rp${newAmount.toLocaleString('id-ID')}?`
        if (confirm(msg)) {
          setSubmitting(false)
          return submitData(true) // recursive call dengan confirm=true
        } else {
          setSubmitMsg('Dibatalkan.')
          setSubmitting(false)
          setTimeout(() => setSubmitMsg(''), 3000)
          return
        }
      }

      if (res.ok) {
        setSubmitMsg('Berhasil ditambahkan!')
        resetForm()
        await fetchData(selectedSheet, selectedYear)

        // Untuk fixed cost, balikin ke tab Transaksi biar user lihat hasilnya
        if (apiType === 'fixed') {
          setTimeout(() => {
            setTab('transactions')
            setSubmitMsg('')
          }, 800)
        } else {
          setTimeout(() => setSubmitMsg(''), 4000)
        }
      } else {
        const err = await res.json()
        setSubmitMsg('Gagal: ' + (err.error || 'Coba lagi'))
        setTimeout(() => setSubmitMsg(''), 4000)
      }
    } catch {
      setSubmitMsg('Error. Coba lagi.')
      setTimeout(() => setSubmitMsg(''), 4000)
    }
    setSubmitting(false)
  }

  function handleSubmit() {
    // Guard minimal di client
    if (!formData.amount) return
    if (formType === 'variable' && expenseKind === 'fixed' && !formData.item) {
      setSubmitMsg('Pilih item dulu.')
      return
    }
    if (formType === 'saving' && !formData.walletId) {
      setSubmitMsg('Pilih dompet dulu.')
      return
    }
    submitData(false)
  }

  const categoryData = data
    ? Object.entries(data.summary?.categoryBreakdown || {})
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value }))
    : []
  const rekapData = data?.rekap?.slice(0, 30).map(r => ({
    date: r.date, Pengeluaran: r.jumlah, Budget: r.wajar,
  })) || []
  const totalIncome = data?.summary?.totalIncome || 0
  const totalVar = data?.summary?.totalVariable || 0
  const totalFixed = data?.summary?.totalFixed || 0
  const totalSaving = data?.summary?.totalSaving || 0
  const totalExpense = totalVar + totalFixed
  const selisih = totalIncome - totalExpense - totalSaving

  return (
    <Shell title="Money Tracker">
      <div className="hal">
 
        {/* Header */}
        <header className="kepala">
          <div className="kepala-in">
            <div>
              <h1>Money Tracker</h1>
              {data && <p className="sub">{data.period}</p>}
            </div>
 
            <div className="alat">
              <button
                className="ico kotak"
                onClick={toggleHide}
                aria-label={hideNominal ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
                aria-pressed={hideNominal}
                title={hideNominal ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
              >
                {hideNominal ? <IkonMataTutup /> : <IkonMata />}
              </button>
 
              {selectedSheet && (
                <a
                  className="btn"
                  href={`/api/money/export.csv?sheet=${encodeURIComponent(selectedSheet)}&year=${selectedYear}`}
                  download
                >
                  <IkonUnduh />
                  Unduh CSV
                </a>
              )}

              {/* Value select menggabungkan tahun+bulan ("2026-Agustus")
                  supaya nama bulan yang sama di tahun berbeda tidak ambigu. */}
              <select
                className="bulan"
                aria-label="Pilih periode"
                value={selectedYear ? `${selectedYear}-${selectedSheet}` : ''}
                onChange={e => {
                  const idx = e.target.value.indexOf('-')
                  const year = Number(e.target.value.slice(0, idx))
                  const month = e.target.value.slice(idx + 1)
                  setSelectedSheet(month)
                  setSelectedYear(year)
                  fetchData(month, year)
                }}
              >
                {availableSheets.map(s => (
                  <option key={`${s.year}-${s.month}`} value={`${s.year}-${s.month}`}>
                    {s.month} {s.year}
                  </option>
                ))}
              </select>
            </div>
          </div>
 
          {/* Tab tetap bergaris bawah, bukan chip. Tab berpindah tampilan,
              chip di Job Tracker menyaring daftar yang sama — fungsinya beda,
              jadi bentuknya sengaja tidak disamakan. Yang diseragamkan hanya
              tinggi, warna, dan ukuran hurufnya. */}
          <MoneyNav tab={tab} onTab={gantiTab} />
        </header>

        <main className="badan">
          {loading && (
            <div className="memuat">
              <div className="spinner"></div>
            </div>
          )}
 
          {!loading && !data && (
            <div className="kosong">
              <h3>Tidak ada data</h3>
              <p>Periode ini belum punya catatan. Pilih bulan lain, atau tambah transaksi pertama lewat tab Tambah.</p>
            </div>
          )}

          {!loading && data && (
            <>
              {/* DASHBOARD */}
			  {tab === 'dashboard' && (
			    <DasborMoney
				  data={data}
				  showRp={showRp}
				  totalIncome={totalIncome} totalExpense={totalExpense}
				  totalVar={totalVar} totalFixed={totalFixed}
				  totalSaving={totalSaving} selisih={selisih}
				  categoryData={categoryData} rekapData={rekapData}
				  CustomTooltip={CustomTooltip}
				  CATEGORY_COLORS={CATEGORY_COLORS}
			    />
			  )}

              {/* ADD */}
              {tab === 'add' && (
				<TambahTransaksi
					data={data}
					formType={formType} setFormType={setFormType}
					expenseKind={expenseKind} setExpenseKind={setExpenseKind}
					formData={formData} setFormData={setFormData}
					resetForm={resetForm}
					handleSubmit={handleSubmit}
					submitting={submitting} submitMsg={submitMsg}
					VAR_CATEGORIES={VAR_CATEGORIES} FIXED_ITEMS={FIXED_ITEMS}
				/>
			  )}
                
              {/* TRANSACTIONS */}
			  {tab === 'transactions' && (
				<DaftarTransaksi
					data={data}
					rp={formatRp}
					editingRow={editingRow} setEditingRow={setEditingRow}
					editForm={editForm} setEditForm={setEditForm}
					editSaving={editSaving}
					handleSaveEdit={handleSaveEdit} handleDelete={handleDelete}
					PilihDompet={PilihDompet}
					VAR_CATEGORIES={VAR_CATEGORIES} CATEGORY_COLORS={CATEGORY_COLORS}
				/>
			)}
            </>
          )}
        </main>
      </div>
 
      <style jsx>{`
        .kepala {
          background: var(--surface);
          border-bottom: var(--border-width) solid var(--border);
        }
        .kepala-in {
          padding: var(--space-5) var(--pad-section) var(--space-4);
          display: flex; align-items: flex-end; justify-content: space-between;
          gap: var(--space-6) var(--space-8); flex-wrap: wrap;
        }
        .alat { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
 
        /* Tombol mata perlu bentuk persegi, jadi menimpa .ico yang memanjang. */
        .alat :global(.ico.kotak) {
          width: 36px; height: 36px; padding: 0;
          border: var(--border-width) solid var(--border);
        }
        .alat :global(.ico.kotak:hover) { border-color: var(--border-strong); }
 
        .bulan {
          width: auto; min-height: 36px;
          padding: 0 var(--space-3);
          background: var(--surface);
          border: var(--border-width) solid var(--border);
          border-radius: var(--radius-full);
          color: var(--ink);
          font-size: var(--text-sm); font-weight: 600;
        }
 
        .badan { padding: var(--space-6) var(--pad-section) var(--space-12); }
        .memuat { display: flex; justify-content: center; padding-top: var(--space-12); }
 
        @media (max-width: 900px) {
          .kepala-in { padding: var(--space-4) var(--space-4) var(--space-3); }
          .badan { padding: var(--space-5) var(--space-4) var(--space-10); }
        }
      `}</style>
    </Shell>
  )
}

import { requireAuth } from '../../lib/auth'
export const getServerSideProps = requireAuth()
