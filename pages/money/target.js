import { useState, useEffect, useCallback } from 'react'
import Shell from '../../components/Shell'
import MoneyNav from '../../components/MoneyNav'
import { rp as rpAsli, maskRp, fmtTanggal } from '../../lib/format'
import { api } from '../../lib/api-client'
import { useSembunyikanNominal } from '../../lib/useSembunyikanNominal'
import ToggleNominal from '../../components/money/ToggleNominal'

const KOSONG = { component: '', target: '', deadline: '', catatan: '', aktif: true }

// Berapa bulan lagi sampai deadline. Dibulatkan ke atas supaya sisa
// setengah bulan tetap dihitung satu, bukan nol.
function bulanTersisa(deadline) {
  if (!deadline) return null
  const t = new Date(deadline + 'T00:00:00')
  if (isNaN(t)) return null
  const hari = Math.ceil((t - Date.now()) / 864e5)
  if (hari <= 0) return 0
  return Math.max(1, Math.ceil(hari / 30))
}

export default function Target() {
  const [data, setData] = useState(null)
  const [draf, setDraf] = useState(null)
  const [galat, setGalat] = useState('')
  const [sembunyi, toggleSembunyi] = useSembunyikanNominal()
  const rp = n => sembunyi ? maskRp() : rpAsli(n)

  const muat = useCallback(async () => {
    try { setData(await api('/api/money/saving-goals')) }
    catch (e) { setGalat(e.message) }
  }, [])

  useEffect(() => { muat() }, [muat])

  async function simpan(e) {
    e.preventDefault()
    const { id, terkumpul, ...isi } = draf
    try {
      await api('/api/money/saving-goals' + (id ? '/' + id : ''), {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...isi, target: Number(isi.target) }),
      })
      setDraf(null)
      muat()
    } catch (err) { setGalat(err.message) }
  }

  async function hapus(g) {
    if (!confirm(`Hapus target "${g.component}"? Catatan tabungannya tetap ada.`)) return
    try {
      await api('/api/money/saving-goals/' + g.id, { method: 'DELETE' })
      muat()
    } catch (e) { setGalat(e.message) }
  }

  const ubah = (k, v) => setDraf(d => ({ ...d, [k]: v }))
  const goals = data?.goals || []

  return (
    <Shell title="Target Tabungan">
      <div className="hal">
        <header className="atas">
          <div>
            <h1>Target Tabungan</h1>
            <p className="sub">
              Progres dihitung dari seluruh riwayat tabungan dengan nama komponen
              yang sama, bukan hanya periode berjalan.
            </p>
          </div>
          <div className="aksi">
            <ToggleNominal sembunyi={sembunyi} onToggle={toggleSembunyi} />
            <button className="btn solid" onClick={() => setDraf({ ...KOSONG })}>
              Tambah target
            </button>
          </div>
        </header>

        <MoneyNav aktif="target" />

        <div className="badan">
          {galat && (
            <div className="galat" role="alert">
              {galat}
              <button className="ico" onClick={() => setGalat('')} aria-label="Tutup">✕</button>
            </div>
          )}

          {data === null && <div className="rangka" aria-hidden="true" />}

          {data && goals.length === 0 && (
            <div className="kosong">
              <h3>Belum ada target</h3>
              <p>Tentukan tujuan menabung, misalnya dana darurat atau laptop baru.</p>
            </div>
          )}

          {goals.length > 0 && (
            <ul className="daftar">
              {goals.map(g => {
                const pct = g.target > 0 ? Math.min(100, (g.terkumpul / g.target) * 100) : 0
                const kurang = Math.max(0, g.target - g.terkumpul)
                const bulan = bulanTersisa(g.deadline)
                const perBulan = bulan && kurang > 0 ? Math.ceil(kurang / bulan) : null
                const tercapai = g.terkumpul >= g.target

                // Rel progres: aksen selama masih berjalan, hijau saat tercapai,
                // merah kalau deadline sudah lewat sementara target belum penuh.
                // Angka terkumpulnya sendiri netral — yang perlu dibaca cepat
                // adalah panjang relnya, bukan warna angkanya.
                const warnaRel = tercapai ? 'var(--ok)'
                  : bulan === 0 ? 'var(--danger)'
                    : 'var(--accent)'

                return (
                  <li key={g.id} className={'kartu' + (g.aktif ? '' : ' mati')}>
                    <div className="kepala">
                      <div className="judul">
                        <p className="nama">{g.component}</p>
                        {g.catatan && <p className="catatan">{g.catatan}</p>}
                      </div>
                      <div className="tombol">
                        <button className="ico" onClick={() => setDraf({ ...KOSONG, ...g, deadline: g.deadline || '' })}>Ubah</button>
                        <button className="ico bahaya" onClick={() => hapus(g)}>Hapus</button>
                      </div>
                    </div>

                    <div className="angka">
                      <span className="num besar">{rp(g.terkumpul)}</span>
                      <span className="dari num">dari {rp(g.target)}</span>
                    </div>

                    <div className="rel" role="progressbar"
                      aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}
                      aria-label={`Progres ${g.component}`}>
                      <div className="isi" style={{ width: `${pct}%`, background: warnaRel }} />
                    </div>

                    <dl className="rinci">
                      <div>
                        <dt>Progres</dt>
                        <dd className="num">{pct.toFixed(1)}%</dd>
                      </div>
                      <div>
                        <dt>Kurang</dt>
                        <dd className="num">{tercapai ? 'Tercapai' : rp(kurang)}</dd>
                      </div>
                      {g.deadline && (
                        <div>
                          <dt>Deadline</dt>
                          <dd>{fmtTanggal(g.deadline)}{bulan === 0 ? ' · lewat' : ` · ${bulan} bln`}</dd>
                        </div>
                      )}
                      {perBulan && (
                        <div>
                          <dt>Perlu per bulan</dt>
                          <dd className="num" style={{ color: 'var(--warn)' }}>{rp(perBulan)}</dd>
                        </div>
                      )}
                    </dl>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {draf && (
          <div className="tirai" onClick={e => { if (e.target === e.currentTarget) setDraf(null) }}>
            <form className="modal" onSubmit={simpan}>
              <div className="mhead">
                <h2>{draf.id ? 'Ubah target' : 'Tambah target'}</h2>
                <button type="button" className="ico" onClick={() => setDraf(null)} aria-label="Tutup">✕</button>
              </div>

              <div className="f">
                <label htmlFor="component">Nama komponen</label>
                <input id="component" required maxLength={60} list="komponen-ada"
                  value={draf.component} aria-describedby="komponen-bantu"
                  onChange={e => ubah('component', e.target.value)} />
                <datalist id="komponen-ada">
                  {(data?.komponenTersedia || []).map(k => <option key={k} value={k} />)}
                </datalist>
                <span className="bantu" id="komponen-bantu">
                  Harus sama persis dengan nama komponen di tabel tabungan agar riwayatnya terhubung.
                </span>
              </div>

              <div className="f">
                <label htmlFor="target">Target</label>
                <input id="target" type="number" min="1" required value={draf.target}
                  onChange={e => ubah('target', e.target.value)} />
              </div>

              <div className="f">
                <label htmlFor="deadline">Deadline</label>
                <input id="deadline" type="date" value={draf.deadline}
                  aria-describedby="deadline-bantu"
                  onChange={e => ubah('deadline', e.target.value)} />
                <span className="bantu" id="deadline-bantu">Opsional. Dipakai menghitung setoran per bulan.</span>
              </div>

              <div className="f">
                <label htmlFor="catatan">Catatan</label>
                <input id="catatan" maxLength={200} value={draf.catatan}
                  onChange={e => ubah('catatan', e.target.value)} />
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
        .rangka { height: 190px; }

        .daftar {
          list-style: none; display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: var(--gap-grid);
        }
        .kartu {
          background: var(--surface);
          border: var(--border-width) solid var(--border);
          border-radius: var(--radius-md);
          padding: var(--pad-card);
          box-shadow: var(--shadow-card);
        }
        .kartu.mati { opacity: .55; }

        .kepala { display: flex; justify-content: space-between; gap: var(--space-3); }
        .judul { min-width: 0; }
        .nama {
          font-family: var(--font-display); font-weight: 700;
          font-size: var(--text-lg); color: var(--ink);
          letter-spacing: var(--tracking-tight);
        }
        .catatan { font-size: var(--text-sm); color: var(--muted); margin-top: 2px; }
        .tombol { display: flex; gap: var(--space-1); flex: none; }

        .angka {
          display: flex; align-items: baseline; gap: var(--space-2);
          margin: var(--space-4) 0 var(--space-2); flex-wrap: wrap;
        }
        .besar {
          font-size: var(--text-2xl); font-weight: 700; color: var(--ink);
          line-height: var(--leading-tight); letter-spacing: var(--tracking-tight);
        }
        .dari { font-size: var(--text-sm); color: var(--muted); }

        .rel { height: 8px; background: var(--surface-2); border-radius: var(--radius-full); overflow: hidden; }
        .rel .isi { height: 100%; border-radius: var(--radius-full); transition: width var(--dur-slow) var(--ease); }

        .rinci {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: var(--space-3) var(--space-4);
          margin-top: var(--space-4); padding-top: var(--space-3);
          border-top: var(--border-width) solid var(--border);
        }
        .rinci dt {
          font-size: var(--text-xs); letter-spacing: var(--tracking-label);
          text-transform: uppercase; color: var(--muted);
        }
        .rinci dd { font-size: var(--text-md); font-weight: 600; color: var(--ink); margin-top: 3px; }

        @media (max-width: 900px) {
          .atas { padding: 0 var(--space-4); }
          .badan { padding: var(--space-4) var(--space-4) 0; }
          .daftar { grid-template-columns: 1fr; }
        }
      `}</style>
    </Shell>
  )
}

import { requireAuth } from '../../lib/auth'
export const getServerSideProps = requireAuth()
