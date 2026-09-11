import { useState, useEffect, useCallback } from 'react'
import Shell from '../../components/Shell'
import { VAR_CATEGORIES } from '../../lib/constants'
import { FIXED_ITEMS } from '../../lib/validation'
import MoneyNav from '../../components/MoneyNav'
import { Kartu, Baris, Pil } from '../../components/ui'
import { rp } from '../../lib/format'
import { api } from '../../lib/api-client'

// Jenis template. Warnanya dulu money-in / money-out / money-plan, tiga warna
// untuk tiga hal yang setara. Sekarang cuma nada pil, dan pilnya sendiri
// sudah menulis namanya, jadi warnanya tidak menanggung beban informasi.
const JENIS = [
  { id: 'income', label: 'Pemasukan', nada: 'ok' },
  { id: 'variable', label: 'Pengeluaran', nada: 'netral' },
  { id: 'fixed', label: 'Fixed cost', nada: 'aksen' },
]

const KOSONG = {
  jenis: 'fixed', description: '', item: FIXED_ITEMS[0],
  category: VAR_CATEGORIES[0], amount: '', hari: 20, walletId: '', aktif: true,
}

const labelJenis = j => JENIS.find(x => x.id === j)?.label || j
const nadaJenis = j => JENIS.find(x => x.id === j)?.nada || 'netral'

// Periode berjalan dari tanggal 20 sampai 19. Tanggal 20 ke atas berarti
// awal periode, di bawahnya berarti bulan berikutnya — perlu dijelaskan
// karena angka "5" terasa seperti awal padahal justru menjelang akhir.
const jelaskanHari = h =>
  h >= 20 ? `tanggal ${h}, awal periode` : `tanggal ${h}, bulan berikutnya`

export default function Berulang() {
  const [daftar, setDaftar] = useState(null)
  const [dompet, setDompet] = useState([])
  const [draf, setDraf] = useState(null)
  const [galat, setGalat] = useState('')

  const muat = useCallback(async () => {
    try { setDaftar(await api('/api/money/recurring')) }
    catch (e) { setGalat(e.message) }
  }, [])

  useEffect(() => { muat() }, [muat])

  // Daftar dompet diambil terpisah karena endpoint rutin tidak membawanya.
  // Gagal mengambilnya tidak fatal: dropdown jadi kosong, template tetap
  // bisa disimpan tanpa dompet.
  useEffect(() => {
    let batal = false
    fetch('/api/money/wallets')
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (!batal && j) setDompet(j.dompet.filter(w => w.aktif)) })
      .catch(() => {})
    return () => { batal = true }
  }, [])

  async function simpan(e) {
    e.preventDefault()
    const { id, ...isi } = draf
    try {
      await api('/api/money/recurring' + (id ? '/' + id : ''), {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...isi, amount: Number(isi.amount), hari: Number(isi.hari) }),
      })
      setDraf(null)
      muat()
    } catch (err) { setGalat(err.message) }
  }

  async function hapus(r) {
    const nama = r.jenis === 'fixed' ? r.item : r.description
    if (!confirm(`Hapus template "${nama}"? Baris yang sudah dibuat di periode lalu tetap ada.`)) return
    try {
      await api('/api/money/recurring/' + r.id, { method: 'DELETE' })
      muat()
    } catch (e) { setGalat(e.message) }
  }

  async function toggleAktif(r) {
    try {
      await api('/api/money/recurring/' + r.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...r, aktif: !r.aktif }),
      })
      muat()
    } catch (e) { setGalat(e.message) }
  }

  const ubah = (k, v) => setDraf(d => ({ ...d, [k]: v }))

  const namaDompet = id =>
    id ? (dompet.find(w => w.id === id)?.nama || 'dompet terhapus') : 'tanpa dompet'

  return (
    <Shell title="Rutin">
      <div className="hal">
        <header className="atas">
          <div>
            <h1>Rutin</h1>
            <p className="sub">
              Template ini dimasukkan otomatis setiap periode baru dibuka.
              Nilai fixed cost hanya diisi bila masih kosong, jadi suntingan
              manual Anda tidak tertimpa.
            </p>
          </div>
          <div className="aksi">
            <button className="btn solid" onClick={() => setDraf({ ...KOSONG })}>
              Tambah template
            </button>
          </div>
        </header>

        <MoneyNav aktif="rutin" />

        <div className="badan">
          {galat && (
            <div className="galat" role="alert">
              {galat}
              <button className="ico" onClick={() => setGalat('')} aria-label="Tutup">✕</button>
            </div>
          )}

          {daftar === null && <div className="rangka" aria-hidden="true" />}

          {daftar && daftar.length === 0 && (
            <div className="kosong">
              <h3>Belum ada template</h3>
              <p>Tambahkan gaji, kosan, atau langganan yang berulang tiap bulan.</p>
            </div>
          )}

          {daftar && daftar.length > 0 && (
            <Kartu rapat>
              {daftar.map(r => (
                <div key={r.id} className={r.aktif ? undefined : 'mati'}>
                  <Baris
                    kolom={[
                      { isi: r.jenis === 'fixed' ? r.item : r.description, lebar: 'minmax(0,1fr)' },
                      { isi: <Pil nada={nadaJenis(r.jenis)} anak={labelJenis(r.jenis)} />, lebar: '148px' },
                      {
                        isi: `${jelaskanHari(r.hari)} · ${namaDompet(r.walletId)}${r.aktif ? '' : ' · nonaktif'}`,
                        lebar: '260px', redup: true,
                      },
                      { isi: rp(r.amount), lebar: '176px', rata: 'right', num: true, tebal: true },
                    ]}
                    aksi={
                      <>
                        <button className="ico" onClick={() => toggleAktif(r)}
                          title={r.aktif ? 'Nonaktifkan' : 'Aktifkan'}>
                          {r.aktif ? 'Jeda' : 'Aktifkan'}
                        </button>
                        <button className="ico" onClick={() => setDraf({ ...KOSONG, ...r })}>Ubah</button>
                        <button className="ico bahaya" onClick={() => hapus(r)}>Hapus</button>
                      </>
                    }
                  />
                </div>
              ))}
            </Kartu>
          )}
        </div>

        {draf && (
          <div className="tirai" onClick={e => { if (e.target === e.currentTarget) setDraf(null) }}>
            <form className="modal" onSubmit={simpan}>
              <div className="mhead">
                <h2>{draf.id ? 'Ubah template' : 'Tambah template'}</h2>
                <button type="button" className="ico" onClick={() => setDraf(null)} aria-label="Tutup">✕</button>
              </div>

              <div className="f">
                <label htmlFor="jenis">Jenis</label>
                <select id="jenis" value={draf.jenis} onChange={e => ubah('jenis', e.target.value)}>
                  {JENIS.map(j => <option key={j.id} value={j.id}>{j.label}</option>)}
                </select>
              </div>

              {draf.jenis === 'fixed' ? (
                <div className="f">
                  <label htmlFor="item">Item</label>
                  <select id="item" value={draf.item} onChange={e => ubah('item', e.target.value)}>
                    {FIXED_ITEMS.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              ) : (
                <div className="f">
                  <label htmlFor="description">Deskripsi</label>
                  <input id="description" required value={draf.description}
                    placeholder={draf.jenis === 'income' ? 'Gaji' : 'Langganan'}
                    onChange={e => ubah('description', e.target.value)} />
                </div>
              )}

              {draf.jenis === 'variable' && (
                <div className="f">
                  <label htmlFor="category">Kategori</label>
                  <select id="category" value={draf.category} onChange={e => ubah('category', e.target.value)}>
                    {VAR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              <div className="f">
                <label htmlFor="amount">Jumlah</label>
                <input id="amount" type="number" min="0" required value={draf.amount}
                  onChange={e => ubah('amount', e.target.value)} />
              </div>

              <div className="f">
                <label htmlFor="walletId">Dompet</label>
                <select id="walletId" value={draf.walletId ?? ''}
                  aria-describedby="dompet-bantu"
                  onChange={e => ubah('walletId', e.target.value)}>
                  <option value="">Tidak ditentukan</option>
                  {dompet.map(w => (
                    <option key={w.id} value={w.id}>{w.nama} · {w.jenis}</option>
                  ))}
                </select>
                <span className="bantu" id="dompet-bantu">
                  Tanpa dompet, transaksinya tetap tercatat tapi saldo tidak bergerak.
                </span>
              </div>

              <div className="f">
                <label htmlFor="hari">Tanggal</label>
                <input id="hari" type="number" min="1" max="31" required value={draf.hari}
                  aria-describedby="hari-bantu"
                  onChange={e => ubah('hari', e.target.value)} />
                <span className="bantu" id="hari-bantu">{jelaskanHari(Number(draf.hari) || 20)}</span>
              </div>

              <div className="mfoot">
                <button type="button" className="btn" onClick={() => setDraf(null)}>Batal</button>
                <button type="submit" className="btn solid">Simpan</button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Hanya yang khas halaman ini. Kerangka bersama ada di
          styles/globals.css di bawah lingkup .hal. */}
      <style jsx>{`
        .hal { padding: var(--space-6) 0 var(--space-12); }
        .atas { padding: 0 var(--pad-section); }
        .badan { padding: var(--space-5) var(--pad-section) 0; }
        .rangka { height: 200px; }
        .mati { opacity: .5; }

        @media (max-width: 900px) {
          .atas { padding: 0 var(--space-4); }
          .badan { padding: var(--space-4) var(--space-4) 0; }
        }
      `}</style>
    </Shell>
  )
}

import { requireAuth } from '../../lib/auth'
export const getServerSideProps = requireAuth()
