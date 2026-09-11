import { IkonMata, IkonMataTutup } from '../icons'

// Presentational saja — state dan penyimpanannya dipegang pemanggil lewat
// useSembunyikanNominal(). Kalau komponen ini panggil hook-nya sendiri,
// dua instance (tombol ini + logika showRp di halaman) bisa saling tidak
// sinkron: localStorage sama, tapi state React masing-masing terpisah.
export default function ToggleNominal({ sembunyi, onToggle }) {
  return (
    <button
      type="button"
      className="ico kotak"
      onClick={onToggle}
      aria-label={sembunyi ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
      aria-pressed={sembunyi}
      title={sembunyi ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
    >
      {sembunyi ? <IkonMataTutup /> : <IkonMata />}
      <style jsx>{`
        .kotak {
          width: 36px; height: 36px; padding: 0;
          border: var(--border-width) solid var(--border);
        }
        .kotak:hover { border-color: var(--border-strong); }
      `}</style>
    </button>
  )
}
