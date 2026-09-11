import { useState, useEffect, useRef, useCallback } from 'react'
import Shell from '../../components/Shell'
import { api } from '../../lib/api-client'
import { JENIS_LAMARAN as JENIS, TEMPAT_LAMARAN as TEMPAT, STATUS_LAMARAN as STATUS } from '../../lib/constants'
import { SELESAI, hariSejak, sisaHari, perluAksi } from '../../lib/jobs-client'

const DIRESPONS = ['Screening', 'Interview', 'Offer', 'Rejected']
const SKALA_MIN = 21

const KOSONG = {
  perusahaan: '', jabatan: '', lokasi: '', tanggalApply: '', deadline: '',
  jenis: 'Tetap', tempat: 'WFO', status: 'Applied',
  referensi: '', url: '', gaji: '', catatan: '',
}

function fmt(d) {
  if (!d) return '—'
  const t = new Date(d + 'T00:00:00')
  return isNaN(t) ? d : t.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Garis tunggu punya dua arti tergantung status.
//
// Lamaran yang belum dikirim (Progress) diukur terhadap DEADLINE: barnya
// terisi seiring batas waktu mendekat, karena yang mendesak adalah
// mendaftar, bukan menunggu.
//
// Lamaran yang sudah dikirim diukur terhadap LAMA MENUNGGU seperti
// sebelumnya, karena deadline pendaftarannya sudah tidak relevan.
function jalur(a, skala) {
  const h = hariSejak(a.tanggalApply)
  const S = a.status
  const sisa = a.deadline ? sisaHari(a.deadline) : null

  if (S === 'Progress') {
    if (sisa === null) {
      if (h === null) return { pct: 0, warna: 'var(--w-mati)', kiri: 'tanggal kosong', kanan: '', strip: false }
      return {
        pct: Math.min(100, Math.max(5, (h / skala) * 100)),
        warna: 'var(--st-Progress)', strip: true,
        kiri: h === 0 ? 'dicatat hari ini' : `dicatat ${h} hari lalu`,
        kanan: 'belum dikirim',
      }
    }
    if (sisa < 0) {
      return {
        pct: 100, warna: 'var(--w-cold)', strip: false,
        kiri: `lewat ${Math.abs(sisa)} hari`, kanan: 'deadline terlewat',
      }
    }
    // Jendela 30 hari: makin dekat deadline, makin penuh barnya.
    const pct = Math.min(100, Math.max(6, ((30 - Math.min(sisa, 30)) / 30) * 100))
    const warna = sisa <= 3 ? 'var(--w-cold)' : sisa <= 7 ? 'var(--w-hot)'
      : sisa <= 14 ? 'var(--w-warm)' : 'var(--w-calm)'
    const kanan = sisa <= 3 ? 'daftar hari ini' : sisa <= 7 ? 'segera daftar' : 'belum dikirim'
    return {
      pct, warna, strip: true,
      kiri: sisa === 0 ? 'deadline hari ini' : `sisa ${sisa} hari`,
      kanan,
    }
  }

  if (h === null) return { pct: 0, warna: 'var(--w-mati)', kiri: 'tanggal kosong', kanan: '', strip: false }
  const pct = Math.min(100, Math.max(5, (h / skala) * 100))

  if (S === 'Offer') {
    return { pct: 100, warna: 'var(--st-Offer)', kiri: fmt(a.tanggalApply), kanan: 'tawaran masuk', strip: false }
  }
  if (S === 'Rejected' || S === 'Ghosted') {
    return {
      pct, warna: 'var(--w-mati)', strip: false,
      kiri: fmt(a.tanggalApply),
      kanan: S === 'Ghosted' ? 'tanpa kabar' : 'ditolak',
    }
  }

  const warna = h < 8 ? 'var(--w-calm)' : h < 15 ? 'var(--w-warm)' : h < 31 ? 'var(--w-hot)' : 'var(--w-cold)'
  const kanan = h < 15 ? '' : h < 31 ? 'follow up' : 'kejar / tutup'
  return { pct, warna, kiri: h === 0 ? 'dilamar hari ini' : `${h} hari`, kanan, strip: false }
}

// Deadline yang tinggal seminggu naik jadi "perlu aksi" meski baru dicatat.
function labelSisa(d) {
  const s = sisaHari(d)
  if (s === null) return '—'
  if (s < 0) return `lewat ${Math.abs(s)} hari`
  if (s === 0) return 'hari ini'
  return `sisa ${s} hari`
}

const IkonUbah = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" /><path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
)

const IkonHapus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" />
  </svg>
)

export default function Jobs() {
  const [semua, setSemua] = useState([])
  const [filter, setFilter] = useState('aktif')
  const [q, setQ] = useState('')
  const [urut, setUrut] = useState('lama')
  const [terbuka, setTerbuka] = useState(() => new Set())
  const [draf, setDraf] = useState(null)
  const [galat, setGalat] = useState('')
  const [siap, setSiap] = useState(false)

  const dialog = useRef(null)

  const muat = useCallback(async () => {
    try {
      setSemua(await api('/api/jobs'))
    } catch (e) {
      setGalat(e.message)
    }
  }, [])

  useEffect(() => { muat() }, [muat])
  useEffect(() => {
    const t = setTimeout(() => setSiap(true), 60)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!dialog.current) return
    if (draf && !dialog.current.open) dialog.current.showModal()
    if (!draf && dialog.current.open) dialog.current.close()
  }, [draf])

  const hitung = {}
  for (const s of STATUS) hitung[s] = 0
  for (const a of semua) hitung[a.status] = (hitung[a.status] || 0) + 1

  const aktif = semua.filter(a => !SELESAI.includes(a.status)).length
  const aksi = semua.filter(perluAksi).length

  const skala = Math.max(
    SKALA_MIN,
    ...semua.filter(a => !SELESAI.includes(a.status)).map(a => hariSejak(a.tanggalApply) ?? 0)
  )

  const kata = q.trim().toLowerCase()
  let tampil = semua.filter(a =>
    !kata || [a.perusahaan, a.jabatan, a.lokasi, a.referensi, a.catatan].join(' ').toLowerCase().includes(kata)
  )
  if (filter === 'aktif') tampil = tampil.filter(a => !SELESAI.includes(a.status))
  if (filter === 'aksi') tampil = tampil.filter(perluAksi)
  if (filter === 'lanjut') tampil = tampil.filter(a => ['Screening', 'Interview', 'Offer'].includes(a.status))
  if (filter === 'tutup') tampil = tampil.filter(a => ['Rejected', 'Ghosted'].includes(a.status))

  tampil = [...tampil].sort((a, b) =>
    urut === 'nama' ? a.perusahaan.localeCompare(b.perusahaan)
      : urut === 'baru' ? (b.tanggalApply || '').localeCompare(a.tanggalApply || '')
        : (a.tanggalApply || '9999').localeCompare(b.tanggalApply || '9999')
  )

  const segmen = [
    ['dilamar', hitung.Applied + hitung.Progress, 'var(--st-Applied)'],
    ['screening', hitung.Screening, 'var(--st-Screening)'],
    ['interview', hitung.Interview, 'var(--st-Interview)'],
    ['offer', hitung.Offer, 'var(--st-Offer)'],
    ['ditolak', hitung.Rejected + hitung.Ghosted, 'var(--st-Ghosted)'],
  ].filter(s => s[1] > 0)

  const dijawab = semua.filter(a => DIRESPONS.includes(a.status)).length
  const total = semua.length || 1

  const cacah = {
    semua: semua.length, aktif, aksi,
    lanjut: hitung.Screening + hitung.Interview + hitung.Offer,
    tutup: hitung.Rejected + hitung.Ghosted,
  }

  function toggle(id) {
    setTerbuka(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  async function gantiStatus(a, status) {
    try {
      await api('/api/jobs/' + a.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      muat()
    } catch (e) { setGalat(e.message) }
  }

  async function hapus(a) {
    if (!confirm(`Hapus lamaran ${a.perusahaan} — ${a.jabatan}?`)) return
    try {
      await api('/api/jobs/' + a.id, { method: 'DELETE' })
      setTerbuka(prev => { const s = new Set(prev); s.delete(a.id); return s })
      muat()
    } catch (e) { setGalat(e.message) }
  }

  async function simpan(e) {
    e.preventDefault()
    const { id, ...isi } = draf
    try {
      await api('/api/jobs' + (id ? '/' + id : ''), {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isi),
      })
      setDraf(null)
      muat()
    } catch (err) {
      // 409 = sudah pernah melamar ke perusahaan+jabatan yang sama.
      // Tawarkan simpan sebagai lamaran baru, misalnya melamar ulang
      // tahun depan, daripada diam-diam dibuang seperti sebelumnya.
      if (err.status === 409 && confirm(err.message + '. Simpan sebagai lamaran baru?')) {
        try {
          await api('/api/jobs' + (id ? '/' + id : ''), {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...isi, force: true }),
          })
          setDraf(null)
          muat()
        } catch (err2) { setGalat(err2.message) }
        return
      }
      setGalat(err.message)
    }
  }

  const ubahDraf = (k, v) => setDraf(d => ({ ...d, [k]: v }))

  return (
    <Shell title="Job Tracker">
      <div className="papan">
        <div className="topbar">
          <div className="topbar-in">
            <div>
              <h1>Job Tracker</h1>
              <div className="tagline">
                {semua.length
                  ? <>{semua.length} lamaran · {aktif} masih berjalan{aksi ? <> · <b>{aksi} perlu ditindaklanjuti</b></> : null}</>
                  : 'belum ada lamaran tercatat'}
              </div>
            </div>
            <div className="pipe">
              <div className="pipe-head">
                <span>Pipeline</span>
                <span>{semua.length ? `respon ${Math.round((dijawab / semua.length) * 100)}%` : 'belum ada data'}</span>
              </div>
              <div className="pipe-bar">
                {segmen.map(([nama, n, warna]) => (
                  <span key={nama} style={{ width: `${(n / total) * 100}%`, background: warna }} title={`${n} ${nama}`} />
                ))}
              </div>
              <div className="pipe-legend">
                {segmen.map(([nama, n, warna]) => (
                  <i key={nama}><span className="dot" style={{ background: warna }} />{n} {nama}</i>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="controls">
          <input className="search" type="search" value={q} onChange={e => setQ(e.target.value)}
            placeholder="Cari perusahaan, posisi, lokasi…" aria-label="Cari lamaran" />
          <div className="chips">
            {[['aktif', 'Berjalan'], ['aksi', 'Perlu aksi'], ['lanjut', 'Lanjut proses'], ['tutup', 'Selesai'], ['semua', 'Semua']].map(([k, t]) => (
              <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
                {t}<span className="c">{cacah[k]}</span>
              </button>
            ))}
          </div>
          <select className="sort" value={urut} onChange={e => setUrut(e.target.value)} aria-label="Urutkan">
            <option value="lama">Paling lama menunggu</option>
            <option value="baru">Paling baru dilamar</option>
            <option value="nama">Nama perusahaan</option>
          </select>
          <a className="btn" href="/api/jobs/export.csv" download>Unduh CSV</a>
          <button className="btn btn-solid" onClick={() => setDraf({ ...KOSONG, tanggalApply: new Date().toISOString().slice(0, 10) })}>
            Tambah lamaran
          </button>
        </div>

        {galat && (
          <div className="controls">
            <div className="galat" role="alert">
              {galat}
              <button className="ico" onClick={() => setGalat('')} aria-label="Tutup pesan">✕</button>
            </div>
          </div>
        )}

        <div className="board">
          <div className="grid colhead">
            <span /><span>Perusahaan / Posisi</span><span>Detail</span>
            <span>Lama menunggu · skala {skala} hari</span><span>Status</span><span />
          </div>

          <div className="list">
            {tampil.map((a, i) => {
              const j = jalur(a, skala)
              const buka = terbuka.has(a.id)
              return (
                <div key={a.id} className={'row' + (buka ? ' open' : '')} style={{ '--rail': `var(--st-${a.status})` }}>
                  <div className="row-main grid">
                    <div className="idx">{String(i + 1).padStart(2, '0')}</div>

                    <button className="who" aria-expanded={buka} onClick={() => toggle(a.id)}>
                      <div className="co">
                        {a.perusahaan}
                        {a.sumber === 'cowork' && <span className="tag">cowork</span>}
                      </div>
                      <div className="role" title={a.jabatan}>{a.jabatan}</div>
                    </button>

                    <div className="meta">
                      <div>{a.jenis} · {a.tempat}</div>
                      <div className="dim">{a.lokasi || 'lokasi belum diisi'}</div>
                    </div>

                    <div className="wait">
                      <div className="track">
                        <div className={'fill' + (j.strip ? ' strip' : '')}
                          style={{ backgroundColor: j.warna, width: siap ? `${j.pct}%` : 0 }} />
                      </div>
                      <div className="wait-lbl">
                        <span>{j.kiri}</span>
                        <span className="act" style={{ color: j.warna }}>{j.kanan}</span>
                      </div>
                    </div>

                    <select className="status" value={a.status} style={{ color: `var(--st-${a.status})` }}
                      aria-label={'Status ' + a.perusahaan}
                      onClick={e => e.stopPropagation()}
                      onChange={e => gantiStatus(a, e.target.value)}>
                      {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <div className="acts">
                      <button className="ico" title="Ubah" aria-label={'Ubah ' + a.perusahaan}
                        onClick={() => setDraf({ ...KOSONG, ...a })}><IkonUbah /></button>
                      <button className="ico" title="Hapus" aria-label={'Hapus ' + a.perusahaan}
                        onClick={() => hapus(a)}><IkonHapus /></button>
                    </div>
                  </div>

                  <div className="detail">
                    {[['Tanggal apply', fmt(a.tanggalApply)],
                    ['Deadline', a.deadline ? `${fmt(a.deadline)} (${labelSisa(a.deadline)})` : '—'],
                    ['Dapat dari', a.referensi || '—'],
                    ['Gaji', a.gaji || '—'], ['Catatan', a.catatan || '—']].map(([t, v]) => (
                      <div key={t}>
                        <div className="dt">{t}</div>
                        <div className="dd">{v}</div>
                      </div>
                    ))}
                    {a.url && (
                      <div>
                        <div className="dt">Link lowongan</div>
                        <div className="dd">
                          <a href={a.url} target="_blank" rel="noopener noreferrer">Buka lowongan ↗</a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {tampil.length === 0 && (
            <div className="empty">
              <h3>Belum ada lamaran</h3>
              <p>Tambah lamaran pertama, atau biarkan Claude Cowork yang mengisi lewat API.</p>
            </div>
          )}
        </div>

        <footer>
          API otomasi: <code>POST /api/jobs</code> dengan header <code>x-api-key</code>
        </footer>

        <dialog ref={dialog} onClose={() => setDraf(null)}>
          <div className="mhead">
            <h2>{draf?.id ? 'Ubah lamaran' : 'Tambah lamaran'}</h2>
            <button className="ico" onClick={() => setDraf(null)} aria-label="Tutup">✕</button>
          </div>
          {draf && (
            <form onSubmit={simpan}>
              <div className="f">
                <label htmlFor="perusahaan">Perusahaan</label>
                <input id="perusahaan" required value={draf.perusahaan} onChange={e => ubahDraf('perusahaan', e.target.value)} />
              </div>
              <div className="f">
                <label htmlFor="jabatan">Posisi</label>
                <input id="jabatan" required value={draf.jabatan} onChange={e => ubahDraf('jabatan', e.target.value)} />
              </div>
              <div className="f">
                <label htmlFor="lokasi">Lokasi</label>
                <input id="lokasi" placeholder="Jakarta" value={draf.lokasi} onChange={e => ubahDraf('lokasi', e.target.value)} />
              </div>
              <div className="f">
                <label htmlFor="tanggalApply">Tanggal apply</label>
                <input id="tanggalApply" type="date" value={draf.tanggalApply} onChange={e => ubahDraf('tanggalApply', e.target.value)} />
              </div>
              <div className="f">
                <label htmlFor="deadline">Deadline pendaftaran</label>
                <input id="deadline" type="date" value={draf.deadline || ''}
                  aria-describedby="deadline-bantu"
                  onChange={e => ubahDraf('deadline', e.target.value)} />
                <span className="bantu" id="deadline-bantu">Kosongkan bila tidak diumumkan</span>
              </div>
              <div className="f">
                <label htmlFor="jenis">Jenis</label>
                <select id="jenis" value={draf.jenis} onChange={e => ubahDraf('jenis', e.target.value)}>
                  {JENIS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="f">
                <label htmlFor="tempat">Tempat kerja</label>
                <select id="tempat" value={draf.tempat} onChange={e => ubahDraf('tempat', e.target.value)}>
                  {TEMPAT.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="f">
                <label htmlFor="fstatus">Status</label>
                <select id="fstatus" value={draf.status} onChange={e => ubahDraf('status', e.target.value)}>
                  {STATUS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="f">
                <label htmlFor="referensi">Dapat dari</label>
                <input id="referensi" placeholder="LinkedIn" value={draf.referensi} onChange={e => ubahDraf('referensi', e.target.value)} />
              </div>
              <div className="f full">
                <label htmlFor="url">Link lowongan</label>
                <input id="url" type="url" placeholder="https://" value={draf.url} onChange={e => ubahDraf('url', e.target.value)} />
              </div>
              <div className="f">
                <label htmlFor="gaji">Gaji</label>
                <input id="gaji" placeholder="Rp 8–10 jt" value={draf.gaji} onChange={e => ubahDraf('gaji', e.target.value)} />
              </div>
              <div className="f">
                <label htmlFor="catatan">Catatan</label>
                <input id="catatan" value={draf.catatan} onChange={e => ubahDraf('catatan', e.target.value)} />
              </div>
              <div className="mfoot">
                <button type="button" className="btn" onClick={() => setDraf(null)}>Batal</button>
                <button type="submit" className="btn btn-solid">Simpan</button>
              </div>
            </form>
          )}
        </dialog>
      </div>

	<style jsx global>{`
        /* Job Tracker memakai token bersama. Tidak ada palet lokal:
           satu-satunya sumber warna adalah styles/tokens.css.

           v2 — diseragamkan dengan modul Money:
           - Chip filter jadi pil dengan isi --accent-soft saat aktif.
           - Semua baris masuk ke satu kartu, dipisah garis rambut, bukan
             kartu terpisah per baris dengan rel warna di kiri.
           - Tombol ikon muncul saat baris disorot.
           - Label naik dari 11px ke 13px.
           - Tinggi baris dikunci ke --row-h. */
        .papan {
          font-family: var(--font-body);
          font-size: var(--text-md);
          line-height: var(--leading-normal);
          color: var(--ink);
          padding-bottom: var(--space-12);
        }
        .papan *{box-sizing:border-box;margin:0;padding:0}
        .papan button,.papan input,.papan select,.papan textarea{font-family:inherit;color:inherit}

        .papan .topbar{
          background:var(--surface);
          border-bottom:var(--border-width) solid var(--border);
          padding:var(--space-5) var(--pad-section) var(--space-4);
        }
        .papan .topbar-in{display:flex;justify-content:space-between;align-items:flex-end;gap:var(--space-6) var(--space-8);flex-wrap:wrap}
        .papan h1{
          font-family:var(--font-display);
          font-weight:800;font-size:var(--text-2xl);
          line-height:var(--leading-tight);letter-spacing:-0.02em;
          color:var(--ink);
        }
        .papan .tagline{font-size:var(--text-sm);color:var(--ink-2);margin-top:var(--space-2)}
        .papan .tagline b{color:var(--warn);font-weight:600}

        .papan .pipe{flex:0 1 340px;min-width:260px}
        .papan .pipe-head{
          display:flex;justify-content:space-between;align-items:baseline;
          font-size:var(--text-xs);letter-spacing:var(--tracking-label);
          text-transform:uppercase;color:var(--muted);margin-bottom:var(--space-2);
        }
        .papan .pipe-bar{height:10px;border-radius:var(--radius-full);overflow:hidden;display:flex;background:var(--surface-2)}
        .papan .pipe-bar span{display:block;transition:width var(--dur-slow) var(--ease)}
        .papan .pipe-legend{
          font-size:var(--text-xs);color:var(--muted);
          margin-top:var(--space-2);display:flex;gap:var(--space-3);flex-wrap:wrap;align-items:center;
        }
        .papan .pipe-legend i{font-style:normal;display:inline-flex;align-items:center;gap:5px}
        .papan .pipe-legend .dot{width:8px;height:8px;border-radius:2px;display:inline-block;flex:none}

        .papan .controls{
          padding:var(--space-4) var(--pad-section) 0;
          display:flex;gap:var(--space-2);align-items:center;flex-wrap:wrap;
        }
        .papan .search{flex:1;min-width:220px;width:auto;min-height:40px;font-size:var(--text-md)}

        /* Chip filter: pil, isi lembut saat aktif. Sama persis dengan Chip
           di components/ui.js supaya dua modul tidak punya dua bahasa. */
        .papan .chips{display:flex;gap:var(--space-2);flex-wrap:wrap}
        .papan .chip{
          background:var(--surface);border:var(--border-width) solid var(--border);
          border-radius:var(--radius-full);min-height:34px;padding:0 var(--space-3);
          font-size:var(--text-sm);font-weight:600;color:var(--ink-2);
          display:inline-flex;align-items:center;gap:var(--space-2);cursor:pointer;
          transition:background var(--dur-fast) var(--ease),border-color var(--dur-fast) var(--ease),color var(--dur-fast) var(--ease);
        }
        .papan .chip:hover{background:var(--hover)}
        .papan .chip[aria-pressed="true"]{
          background:var(--accent-soft);border-color:var(--accent-line);color:var(--accent);
        }
        .papan .chip .c{font-variant-numeric:tabular-nums;font-weight:500;color:var(--muted)}
        .papan .chip[aria-pressed="true"] .c{color:var(--accent)}

        .papan select.sort{width:auto;min-height:40px;font-size:var(--text-sm);font-weight:600;background:var(--surface)}
        .papan .btn{
          background:transparent;border:var(--border-width) solid var(--accent);
          border-radius:var(--radius-full);min-height:36px;padding:0 var(--space-4);
          font-size:var(--text-sm);font-weight:600;text-decoration:none;color:var(--accent);
          display:inline-flex;align-items:center;gap:var(--space-2);cursor:pointer;
        }
        .papan .btn:hover{background:var(--accent-soft)}
        .papan .btn-solid{background:var(--solid);border-color:var(--solid);color:var(--on-solid)}
        .papan .btn-solid:hover{background:var(--accent-quiet);border-color:var(--accent-quiet)}

        .papan .galat{
          flex:1;background:var(--danger-soft);border:var(--border-width) solid var(--danger);
          color:var(--danger);border-radius:var(--radius-sm);padding:var(--space-2) var(--space-3);
          font-size:var(--text-sm);display:flex;justify-content:space-between;align-items:center;gap:var(--space-3);
        }

        .papan .board{padding:var(--space-4) var(--pad-section) 0}
        .papan .grid{
          display:grid;
          grid-template-columns:32px minmax(200px,1.7fr) 130px minmax(150px,1fr) 124px 62px;
          gap:var(--space-4);align-items:center;
        }
        .papan .colhead{
          padding:0 var(--space-5) var(--space-2);
          font-size:var(--text-xs);
          letter-spacing:var(--tracking-label);text-transform:uppercase;color:var(--muted);
        }

        /* Satu kartu untuk seluruh daftar. Baris dipisah garis rambut,
           bukan jarak dan bayangan. */
        .papan .list{
          display:flex;flex-direction:column;
          background:var(--surface);
          border:var(--border-width) solid var(--border);
          border-radius:var(--radius-md);
          box-shadow:var(--shadow-card);
          overflow:hidden;
        }

        .papan .row{
          background:transparent;border:0;
          border-bottom:var(--border-width) solid var(--border);
          transition:background var(--dur-fast) var(--ease);
        }
        .papan .row:last-child{border-bottom:0}
        .papan .row:hover{background:var(--hover)}
        .papan .row-main{padding:var(--space-2) var(--space-5);min-height:var(--row-h)}
        .papan .idx{font-size:var(--text-sm);color:var(--muted);font-variant-numeric:tabular-nums}
        .papan .who{text-align:left;background:none;border:none;padding:0;cursor:pointer;min-width:0}
        .papan .co{
          font-family:var(--font-display);font-weight:700;font-size:var(--text-md);
          letter-spacing:var(--tracking-tight);line-height:1.2;color:var(--ink);
        }
        .papan .role{
          color:var(--ink-2);font-size:var(--text-sm);line-height:1.3;margin-top:2px;
          overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
        }
        /* Penanda sumber, bukan status. Karena itu netral, tidak meminjam
           warna dari palet status lamaran. */
        .papan .tag{
          display:inline-block;font-size:var(--text-xs);
          letter-spacing:.06em;text-transform:uppercase;
          border:var(--border-width) solid var(--border-strong);border-radius:4px;
          padding:0 5px;margin-left:6px;vertical-align:2px;color:var(--muted);font-weight:600;
        }
        .papan .meta{font-size:var(--text-sm);color:var(--ink-2);line-height:1.4;min-width:0}
        .papan .meta .dim{color:var(--muted)}

        .papan .wait{min-width:0}
        .papan .track{height:6px;background:var(--surface-2);border-radius:3px;overflow:hidden}
        .papan .fill{height:100%;border-radius:3px;width:0;transition:width var(--dur-slow) var(--ease)}
        .papan .fill.strip{background-image:repeating-linear-gradient(115deg,rgba(255,255,255,.4) 0 3px,transparent 3px 7px)}
        .papan .wait-lbl{
          font-size:var(--text-xs);margin-top:6px;
          color:var(--ink-2);display:flex;justify-content:space-between;gap:var(--space-2);
        }
        .papan .wait-lbl .act{font-weight:700;text-align:right;flex:none}

        .papan select.status{
          appearance:none;-webkit-appearance:none;
          font-weight:600;font-size:var(--text-xs);
          letter-spacing:.06em;text-transform:uppercase;text-align:center;text-align-last:center;
          border:var(--border-width) solid currentColor;border-radius:var(--radius-full);background:transparent;
          padding:6px 8px;cursor:pointer;width:100%;min-height:0;
        }

        /* Aksi baru muncul saat baris disorot, seperti di daftar transaksi.
           Tempatnya tetap dipesan supaya kolom tidak bergeser. */
        .papan .acts{display:flex;gap:2px;justify-content:flex-end;opacity:0;transition:opacity var(--dur-fast) var(--ease)}
        .papan .row:hover .acts,.papan .row:focus-within .acts{opacity:1}
        @media (hover:none){.papan .acts{opacity:1}}
        .papan .ico{
          background:none;border:none;padding:7px;border-radius:var(--radius-sm);cursor:pointer;
          color:var(--muted);display:inline-flex;align-items:center;justify-content:center;
        }
        .papan .ico:hover{background:var(--surface-2);color:var(--ink)}
        .papan .ico svg{display:block}

        .papan .detail{
          display:none;border-top:var(--border-width) solid var(--border);
          padding:var(--space-4) var(--space-5);background:var(--surface-2);
        }
        .papan .row.open .detail{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--space-4) var(--space-6)}
        .papan .dt{
          font-size:var(--text-xs);
          letter-spacing:var(--tracking-label);text-transform:uppercase;color:var(--muted);margin-bottom:3px;
        }
        .papan .dd{font-size:var(--text-sm);word-break:break-word;color:var(--ink)}
        .papan .dd a{color:var(--accent);font-weight:600}

        .papan .empty{
          background:var(--surface);border:var(--border-width) solid var(--border);
          border-radius:var(--radius-md);padding:var(--space-12) var(--space-6);
          text-align:center;color:var(--muted);
        }
        .papan .empty h3{font-family:var(--font-display);font-weight:700;font-size:var(--text-lg);color:var(--ink);margin-bottom:var(--space-2)}
        .papan .empty p{font-size:var(--text-sm)}

        .papan dialog{
          margin:auto;
          border:var(--border-width) solid var(--border);border-radius:var(--radius-md);
          background:var(--surface);width:min(600px,94vw);padding:0;
          box-shadow:var(--shadow-pop);color:var(--ink);
        }
        .papan dialog::backdrop{background:rgba(20,20,18,.55)}
        .papan .mhead{
          background:var(--surface-2);color:var(--ink);
          padding:var(--space-4) var(--space-5);
          display:flex;justify-content:space-between;align-items:center;
          border-bottom:var(--border-width) solid var(--border);
          border-radius:var(--radius-md) var(--radius-md) 0 0;
        }
        .papan .mhead h2{font-family:var(--font-display);font-weight:700;font-size:var(--text-lg)}
        .papan form{padding:var(--space-5);display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)}
        .papan .f{display:flex;flex-direction:column;gap:var(--space-2);min-width:0}
        .papan .f.full{grid-column:1/-1}
        /* Label form biasa, bukan huruf besar berjarak lebar. Sepuluh label
           kapital beruntun membuat form terbaca seperti formulir pajak. */
        .papan .f label{
          font-size:var(--text-sm);font-weight:600;color:var(--ink-2);
        }
        .papan .f input,.papan .f select,.papan .f textarea{min-height:42px;font-size:var(--text-md)}
        .papan .bantu{font-size:var(--text-sm);color:var(--muted)}
        .papan .mfoot{grid-column:1/-1;display:flex;justify-content:flex-end;gap:var(--space-2);margin-top:var(--space-1)}

        .papan footer{
          padding:var(--space-5) var(--pad-section) 0;
          font-size:var(--text-xs);color:var(--muted);
        }
        .papan footer code{
          background:var(--surface);border:var(--border-width) solid var(--border);
          border-radius:4px;padding:1px 5px;font-variant-numeric:tabular-nums;
        }

        @media (max-width:900px){
          .papan .topbar,.papan .controls,.papan .board,.papan footer{
            padding-left:var(--space-4);padding-right:var(--space-4);
          }
          .papan .colhead{display:none}
          .papan .row-main{
            grid-template-columns:1fr auto;
            grid-template-areas:"who status" "meta meta" "wait wait" "acts acts";
            gap:var(--space-2);padding:var(--space-3) var(--space-4);
          }
          .papan .idx{display:none}
          .papan .who{grid-area:who}
          .papan .meta{grid-area:meta}
          .papan .wait{grid-area:wait}
          .papan .row-main > select.status{grid-area:status;width:auto}
          .papan .acts{
            grid-area:acts;justify-content:flex-start;
            border-top:var(--border-width) solid var(--border);
            padding-top:var(--space-2);margin-top:2px;
          }
          .papan .role{white-space:normal}
          .papan form{grid-template-columns:1fr}
          .papan .pipe{max-width:none}
        }
      `}</style>
    </Shell>
  )
}

import { requireAuth } from '../../lib/auth'
export const getServerSideProps = requireAuth()
