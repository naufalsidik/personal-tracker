import { useState, useEffect, useCallback } from 'react'
import Shell from '../../components/Shell'
import MoneyNav from '../../components/MoneyNav'
import { Kartu, Metrik } from '../../components/ui'
import { rp, fmtTanggal as fmt } from '../../lib/format'
import { api } from '../../lib/api-client'

const KOSONG_DOMPET = {
  nama: '', jenis: 'Rekening', saldoAwal: '',
  tanggalAwal: new Date().toISOString().slice(0, 10),
  catatan: '', aktif: true,
}

export default function Dompet() {
  const [data, setData] = useState(null)
  const [draf, setDraf] = useState(null)
  const [galat, setGalat] = useState('')

  const muat = useCallback(async () => {
    try { setData(await api('/api/money/wallets')) }
    catch (e) { setGalat(e.message) }
  }, [])

  useEffect(() => { muat() }, [muat])

  async function simpanDompet(e) {
    e.preventDefault()
    const { id, saldo, ...isi } = draf
    try {
      await api('/api/money/wallets' + (id ? '/' + id : ''), {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...isi, saldoAwal: Number(isi.saldoAwal) }),
      })
      setDraf(null); muat()
    } catch (err) { setGalat(err.message) }
  }

  async function hapusDompet(w) {
    if (!confirm(`Hapus dompet "${w.nama}"? Transaksi yang menunjuk dompet ini kehilangan penandanya, tapi nominalnya tetap ada.`)) return
    try { await api('/api/money/wallets/' + w.id, { method: 'DELETE' }); muat() }
    catch (e) { setGalat(e.message) }
  }

  const ubah = (k, v) => setDraf(d => ({ ...d, [k]: v }))

  const dompet = data?.dompet || []
  const aktif = dompet.filter(w => w.aktif)

  return (
    <Shell title="Dompet">
      <div className="hal">
        <header className="atas">
          <div>
            <h1>Dompet</h1>
            <p className="sub">
              Saldo dihitung dari saldo awal ditambah transaksi setelah tanggal
              awal, tidak pernah disimpan langsung. Tabungan ikut memotong
              saldo dompet asalnya, sama seperti pengeluaran.
            </p>
          </div>
          <div className="aksi">
            <button className="btn solid" onClick={() => setDraf({ ...KOSONG_DOMPET })}>
              Tambah dompet
            </button>
          </div>
        </header>

        <MoneyNav aktif="dompet" />

        <div className="badan">
          {galat && (
            <div className="galat" role="alert">
              {galat}
              <button className="ico" onClick={() => setGalat('')} aria-label="Tutup">✕</button>
            </div>
          )}

          {data === null && <div className="rangka" aria-hidden="true" />}

          {data && dompet.length === 0 && (
            <div className="kosong">
              <h3>Belum ada dompet</h3>
              <p>Tambahkan rekening, e-wallet, atau uang tunai beserta saldonya hari ini.</p>
            </div>
          )}

          {dompet.length > 0 && (
            <>
              <div className="total">
                <Kartu>
                  <Metrik label="Total saldo" nilai={rp(data.total)}
                    catatan={`${aktif.length} dompet aktif`} />
                </Kartu>
              </div>

              <ul className="daftar">
                {dompet.map(w => (
                  <li key={w.id} className={'kartu' + (w.aktif ? '' : ' mati')}>
                    <div className="kepala">
                      <div className="judul">
                        <p className="nama">{w.nama}</p>
                        <p className="jenis">{w.jenis}{w.aktif ? '' : ' · nonaktif'}</p>
                      </div>
                      <div className="tombol">
                        <button className="ico" onClick={() => setDraf({ ...KOSONG_DOMPET, ...w })}>Ubah</button>
                        <button className="ico bahaya" onClick={() => hapusDompet(w)}>Hapus</button>
                      </div>
                    </div>

                    {/* Satu-satunya nominal yang boleh berwarna di halaman ini.
                        Saldo minus itu keadaan yang salah, bukan sekadar arah
                        uang, jadi warnanya menanggung informasi. */}
                    <p className="num saldo" style={w.saldo < 0 ? { color: 'var(--danger)' } : undefined}>
                      {rp(w.saldo)}
                    </p>

                    <dl className="rinci">
                      <div>
                        <dt>Saldo awal</dt>
                        <dd className="num">{rp(w.saldoAwal)}</dd>
                      </div>
                      <div>
                        <dt>Sejak</dt>
                        <dd>{fmt(w.tanggalAwal)}</dd>
                      </div>
                      {w.catatan && (
                        <div>
                          <dt>Catatan</dt>
                          <dd>{w.catatan}</dd>
                        </div>
                      )}
                    </dl>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {draf && (
          <div className="tirai" onClick={e => { if (e.target === e.currentTarget) setDraf(null) }}>
            <form className="modal" onSubmit={simpanDompet}>
              <div className="mhead">
                <h2>{draf.id ? 'Ubah dompet' : 'Tambah dompet'}</h2>
                <button type="button" className="ico" onClick={() => setDraf(null)} aria-label="Tutup">✕</button>
              </div>

              <div className="f">
                <label htmlFor="nama">Nama</label>
                <input id="nama" required maxLength={60} value={draf.nama}
                  placeholder="BCA, GoPay, Dompet"
                  onChange={e => ubah('nama', e.target.value)} />
              </div>

              <div className="f">
                <label htmlFor="jenis">Jenis</label>
                <select id="jenis" value={draf.jenis} onChange={e => ubah('jenis', e.target.value)}>
                  {(data?.jenis || ['Rekening']).map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>

              <div className="f">
                <label htmlFor="saldoAwal">Saldo awal</label>
                <input id="saldoAwal" type="number" required value={draf.saldoAwal}
                  onChange={e => ubah('saldoAwal', e.target.value)} />
              </div>

              <div className="f">
                <label htmlFor="tanggalAwal">Saldo per tanggal</label>
                <input id="tanggalAwal" type="date" required value={draf.tanggalAwal}
                  aria-describedby="tgl-bantu"
                  onChange={e => ubah('tanggalAwal', e.target.value)} />
                <span className="bantu" id="tgl-bantu">
                  Transaksi sebelum tanggal ini tidak dihitung, karena sudah tercakup
                  di saldo awal.
                </span>
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

        .total { margin-bottom: var(--gap-grid); }

        .daftar {
          list-style: none; display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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
        .jenis { font-size: var(--text-sm); color: var(--muted); margin-top: 2px; }
        .tombol { display: flex; gap: var(--space-1); flex: none; }

        .saldo {
          font-size: var(--text-xl); font-weight: 700; color: var(--ink);
          margin: var(--space-4) 0 var(--space-1);
          letter-spacing: var(--tracking-tight);
        }

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
