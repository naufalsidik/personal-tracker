import { useState, useEffect } from 'react'
import KartuRingkasan from '../../components/KartuRingkasan'
import { SELESAI, perluAksi } from '../../lib/jobs-client'

export default function RingkasanJobs({ modul }) {
  const [apps, setApps] = useState(null)
  const [galat, setGalat] = useState(false)

  useEffect(() => {
    let batal = false
    fetch('/api/jobs')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(j => { if (!batal) setApps(j) })
      .catch(() => { if (!batal) setGalat(true) })
    return () => { batal = true }
  }, [])

  const berjalan = apps ? apps.filter(a => !SELESAI.includes(a.status)).length : 0
  const aksi = apps ? apps.filter(perluAksi).length : 0
  const lanjut = apps ? apps.filter(a => ['Screening', 'Interview', 'Offer'].includes(a.status)).length : 0

  return (
    <KartuRingkasan
      modul={modul}
      memuat={!apps && !galat}
      galat={galat}
      labelUtama="Masih berjalan"
      utama={String(berjalan)}
      rinci={apps ? [
        { label: 'Perlu aksi', nilai: String(aksi), warna: aksi > 0 ? 'var(--warn)' : undefined },
        { label: 'Lanjut proses', nilai: String(lanjut) },
        { label: 'Total', nilai: String(apps.length) },
      ] : []}
    />
  )
}
