import { useState, useEffect, useCallback } from 'react'
import Shell from '../../components/Shell'
import MoneyNav from '../../components/MoneyNav'
import { Kartu, JudulSection, Baris } from '../../components/ui'
import { rp, fmtTanggal as fmt } from '../../lib/format'
import { api } from '../../lib/api-client'

const KOSONG = {
  tanggal: new Date().toISOString().slice(0, 10),
  dariId: '', keId: '', amount: '', fee: '', catatan: '',
}

export default function Transfer() {
  const [data, setData] = useState(null)
  const [form, setForm] = useState({ ...KOSONG })
  const [kirim, setKirim] = useState(false)
  const [galat, setGalat] = useState('')
  const [pesan, setPesan] = useState('')

  const muat = useCallback(async () => {
    try { setData(await api('/api/money/wallets')) }
    catch (e) { setGalat(e.message) }
  }, [])

  useEffect(() => { muat() }, [muat])

  const dompet = (data?.dompet || []).filter(w => w.aktif)
  const asal = dompet.find(w => String(w.id) === String(form.dariId))

  const jumlah = Number(form.amount) || 0
  const biaya = Number(form.fee) || 0
  const totalKeluar = jumlah + biaya
  const kurang = asal && totalKeluar > asal.saldo

  async function simpan(e) {
    e.preventDefault()
    setKirim(true)
    try {
      await api('/api/money/wallets/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: jumlah, fee: biaya }),
      })
      setForm({ ...KOSONG, dariId: form.dariId })
      setPesan('Transfer tercatat.')
      setTimeout(() => setPesan(''), 4000)
      muat()
    } catch (err) { setGalat(err.message) }
    setKirim(false)
  }

  async function hapus(t) {
    const tambahan = t.fee > 0 ? ` Biaya admin ${rp(t.fee)} ikut terhapus.` : ''
    if (!confirm(`Hapus transfer ${rp(t.amount)} dari ${t.dari} ke ${t.ke}?${tambahan}`)) return
    try { await api('/api/money/wallets/transfer?id=' + t.id, { method: 'DELETE' }); muat() }
    catch (e) { setGalat(e.message) }
  }

  const ubah = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Shell title="Transfer">
      <div className="hal">
        <header className="atas">
          <div>
            <h1>Transfer</h1>
            <p className="sub">
              Memindahkan uang antar dompet. Bukan pemasukan, bukan pengeluaran —
              total keuangan Anda tidak berubah. Biaya adminnya yang dicatat
              sebagai pengeluaran.
            </p>
          </div>
        </header>

        <MoneyNav aktif="transfer" />

        <div className="badan">
          {galat && (
            <div className="kabar galat" role="alert">
              {galat}
              <button className="ico" onClick={() => setGalat('')} aria-label="Tutup">✕</button>
            </div>
          )}
          {pesan && <div className="kabar sukses" role="status">{pesan}</div>}

          {data === null && <div className="rangka" aria-hidden="true" />}

          {data && dompet.length < 2 && (
            <div className="kosong">
              <h3>Butuh minimal dua dompet</h3>
              <p>Tambahkan dompet lain di bagian Dompet sebelum bisa transfer.</p>
            </div>
          )}

          {dompet.length >= 2 && (
            <section className="blok">
              <Kartu>
                <form onSubmit={simpan}>
                  <div className="baris">
                    <div className="f">
                      <label htmlFor="tanggal">Tanggal</label>
                      <input id="tanggal" type="date" required value={form.tanggal}
                        onChange={e => ubah('tanggal', e.target.value)} />
                    </div>

                    <div className="f">
                      <label htmlFor="dariId">Dari</label>
                      <select id="dariId" required value={form.dariId}
                        onChange={e => ubah('dariId', e.target.value)}>
                        <option value="">Pilih dompet</option>
                        {dompet.map(w => (
                          <option key={w.id} value={w.id}>{w.nama} · {rp(w.saldo)}</option>
                        ))}
                      </select>
                    </div>

                    <div className="f">
                      <label htmlFor="keId">Ke</label>
                      <select id="keId" required value={form.keId}
                        onChange={e => ubah('keId', e.target.value)}>
                        <option value="">Pilih dompet</option>
                        {dompet.filter(w => String(w.id) !== String(form.dariId))
                          .map(w => <option key={w.id} value={w.id}>{w.nama}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="baris">
                    <div className="f">
                      <label htmlFor="amount">Jumlah transfer</label>
                      <input id="amount" type="number" min="1" required value={form.amount}
                        onChange={e => ubah('amount', e.target.value)} />
                    </div>

                    <div className="f">
                      <label htmlFor="fee">Biaya admin</label>
                      <input id="fee" type="number" min="0" value={form.fee}
                        placeholder="0" aria-describedby="fee-bantu"
                        onChange={e => ubah('fee', e.target.value)} />
                      <span className="bantu" id="fee-bantu">
                        Dicatat sebagai pengeluaran kategori Biaya Admin. Kosongkan bila gratis.
                      </span>
                    </div>

                    <div className="f">
                      <label htmlFor="catatan">Catatan</label>
                      <input id="catatan" maxLength={200} value={form.catatan}
                        onChange={e => ubah('catatan', e.target.value)} />
                    </div>
                  </div>

                  {jumlah > 0 && form.dariId && (
                    <div className={'ringkas' + (kurang ? ' waspada' : '')}>
                      <p>
                        <b>{asal?.nama}</b> berkurang <b className="num">{rp(totalKeluar)}</b>
                        {biaya > 0 && <> ({rp(jumlah)} + admin {rp(biaya)})</>}
                      </p>
                      {kurang && (
                        <p className="peringatan">
                          Saldo tercatat {rp(asal.saldo)}, kurang {rp(totalKeluar - asal.saldo)}.
                          Tetap bisa disimpan — saldo bisa saja belum sinkron dengan mutasi asli.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="kaki">
                    <button type="submit" className="btn solid" disabled={kirim}>
                      {kirim ? 'Menyimpan…' : 'Catat transfer'}
                    </button>
                  </div>
                </form>
              </Kartu>
            </section>
          )}

          {data?.transfer?.length > 0 && (
            <section className="blok">
              <JudulSection>Riwayat</JudulSection>
              <Kartu rapat>
                {data.transfer.map(t => (
                  <Baris key={t.id}
                    kolom={[
                      { isi: fmt(t.tanggal), lebar: '148px', redup: true, num: true },
                      {
                        isi: <>{t.dari} → {t.ke}{t.catatan ? ` · ${t.catatan}` : ''}</>,
                        lebar: 'minmax(0,1fr)',
                      },
                      {
                        isi: t.fee > 0 ? `admin ${rp(t.fee)}` : '',
                        lebar: '160px', rata: 'right', redup: true, num: true,
                      },
                      { isi: rp(t.amount), lebar: '176px', rata: 'right', num: true, tebal: true },
                    ]}
                    aksi={<button className="ico bahaya" onClick={() => hapus(t)}>Hapus</button>}
                  />
                ))}
              </Kartu>
            </section>
          )}
        </div>
      </div>

      {/* Hanya yang khas halaman ini. Kerangka bersama ada di
          styles/globals.css di bawah lingkup .hal. */}
      <style jsx>{`
        .hal { padding: var(--space-6) 0 var(--space-12); }
        .atas { padding: 0 var(--pad-section); }
        .badan { padding: var(--space-5) var(--pad-section) 0; }
        .rangka { height: 240px; }

        .blok + .blok { margin-top: var(--gap-section); }

        form { display: flex; flex-direction: column; gap: var(--space-5); }
        .baris {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--space-4);
        }

        .ringkas {
          background: var(--surface-2);
          border: var(--border-width) solid var(--border);
          border-radius: var(--radius-sm);
          padding: var(--space-4);
          font-size: var(--text-md); color: var(--ink);
        }
        .ringkas.waspada { border-color: var(--warn); background: var(--warn-soft); }
        .peringatan { color: var(--warn); font-size: var(--text-sm); margin-top: var(--space-2); }

        .kaki { display: flex; justify-content: flex-end; }

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
