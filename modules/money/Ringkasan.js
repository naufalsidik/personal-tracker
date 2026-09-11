import { useState, useEffect } from 'react'
import KartuRingkasan from '../../components/KartuRingkasan'
import { rp, maskRp } from '../../lib/format'
import { useSembunyikanNominal } from '../../lib/useSembunyikanNominal'

export default function RingkasanMoney({ modul }) {
  const [data, setData] = useState(null)
  const [galat, setGalat] = useState(false)
  // Baca saja — tombol togglenya ada di dashboard Keuangan. Preferensinya
  // dibagi lewat localStorage supaya kartu ini ikut sembunyi tanpa perlu
  // tombol sendiri.
  const [sembunyi] = useSembunyikanNominal()
  const showRp = n => sembunyi ? maskRp() : rp(n)

  useEffect(() => {
    let batal = false
    fetch('/api/money/data')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(j => { if (!batal) setData(j) })
      .catch(() => { if (!batal) setGalat(true) })
    return () => { batal = true }
  }, [])

  const s = data?.summary
  // Definisi sisa harus sama persis dengan kartu di halaman money:
  // tabungan sudah diamankan, jadi ikut dikurangi.
  const sisa = s ? s.totalIncome - s.totalVariable - s.totalFixed - s.totalSaving : 0

  return (
    <KartuRingkasan
      modul={modul}
      memuat={!data && !galat}
      galat={galat}
      labelUtama={data ? `Sisa ${data.period}` : 'Sisa'}
      utama={showRp(sisa)}
      // Nominal di sini netral. Labelnya sudah menyebut arah uangnya,
      // jadi warna tidak menambah informasi apa pun — dan warna yang
      // selalu menyala berhenti berarti apa-apa saat benar-benar ada
      // yang perlu diperhatikan. Bandingkan dengan modul lamaran:
      // di sana warna hanya muncul kalau ada yang harus ditindaklanjuti.
      rinci={s ? [
        { label: 'Masuk', nilai: showRp(s.totalIncome) },
        { label: 'Keluar', nilai: showRp(s.totalVariable + s.totalFixed) },
        { label: 'Tabungan', nilai: showRp(s.totalSaving) },
      ] : []}
    />
  )
}
