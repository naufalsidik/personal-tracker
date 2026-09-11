import { Pil } from '../ui'

// Warna diambil dari CATEGORY_COLORS lalu diberi akhiran '22' sebagai alfa.
// Itu berarti nilainya harus hex, bukan var() — kalau CATEGORY_COLORS nanti
// pindah ke token, bagian ini ikut berubah.
export default function PilKategori({ nama, warna }) {
  if (!warna) return <Pil nada="netral" anak={nama} />
  return (
    <span className="pil" style={{ background: warna + '22', color: warna }}>
      {nama}
      <style jsx>{`
        .pil {
          display: inline-flex; align-items: center;
          padding: 3px var(--space-3);
          border-radius: var(--radius-full);
          font-size: var(--text-sm);
          font-weight: 600;
          white-space: nowrap;
        }
      `}</style>
    </span>
  )
}
