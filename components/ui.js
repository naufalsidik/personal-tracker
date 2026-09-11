// Primitif tampilan bersama.
//
// styled-jsx hanya menempel ke elemen DOM yang dirender di komponen ini.
// Anak yang dioper lewat props membawa scope pemanggilnya, jadi primitif
// di sini sengaja hanya menata elemennya sendiri.

/* ------------------------------------------------------------------ */
/* Kartu                                                               */
/* ------------------------------------------------------------------ */
export function Kartu({ children, rapat = false, ...sisa }) {
  return (
    <section className={rapat ? 'kartu rapat' : 'kartu'} {...sisa}>
      {children}
      <style jsx>{`
        .kartu {
          background: var(--surface);
          border: var(--border-width) solid var(--border);
          border-radius: var(--radius-md);
          padding: var(--pad-card);
          box-shadow: var(--shadow-card);
        }
        /* Kartu pembungkus list tidak diberi padding, karena barisnya
           sendiri yang mengatur padding dan garis pemisah. */
        .rapat { padding: 0; overflow: hidden; }

        /* Di layar sempit kolom tidak muat. Digeser mendatar, bukan
           dipadatkan sampai tidak terbaca. Ini kompromi sadar: layout
           kartu per baris akan lebih baik, tapi itu komponen tersendiri. */
        @media (max-width: 767px) {
          .rapat { overflow-x: auto; }
        }
      `}</style>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Judul section — duduk di kanvas, di luar kartu.                     */
/* Tidak pernah berwarna semantik.                                     */
/* ------------------------------------------------------------------ */
export function JudulSection({ children, aksi }) {
  return (
    <div className="baris">
      <h2 className="judul">{children}</h2>
      {aksi && <div className="aksi">{aksi}</div>}
      <style jsx>{`
        .baris {
          display: flex; align-items: baseline; gap: var(--space-3);
          margin-bottom: var(--space-4);
        }
        .judul {
          font-family: var(--font-display);
          font-size: var(--text-lg);
          font-weight: 700;
          letter-spacing: var(--tracking-tight);
          color: var(--ink);
        }
        .aksi { margin-left: auto; }
      `}</style>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Metrik — label kecil di atas, angka besar di bawah.                 */
/*                                                                     */
/* `nada` sengaja tidak punya nilai default berwarna. Nominal saldo    */
/* dan pengeluaran biasa netral. Warna hanya untuk selisih dan         */
/* pelanggaran budget.                                                 */
/* ------------------------------------------------------------------ */
const NADA = {
  masuk: 'var(--money-in)',
  keluar: 'var(--money-out)',
  rencana: 'var(--money-plan)',
}

export function Metrik({ label, nilai, catatan, ukuran = 'xl', nada }) {
  const warna = nada ? NADA[nada] : 'var(--ink)'
  return (
    <div className="blok">
      <p className="label">{label}</p>
      <p className={`nilai num ${ukuran}`} style={{ color: warna }}>{nilai}</p>
      {catatan && <p className="catatan">{catatan}</p>}
      <style jsx>{`
        .label {
          font-size: var(--text-xs);
          font-weight: 500;
          letter-spacing: var(--tracking-label);
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: var(--space-1);
        }
        .nilai {
          font-weight: 700;
          line-height: var(--leading-tight);
          letter-spacing: var(--tracking-tight);
        }
        .xl { font-size: var(--text-2xl); }
        .md { font-size: var(--text-xl); }
        .sm { font-size: var(--text-lg); }
        .catatan {
          font-size: var(--text-xs);
          color: var(--muted);
          margin-top: var(--space-2);
        }
        @media (max-width: 767px) {
          .xl { font-size: var(--text-xl); }
        }
      `}</style>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Baris list                                                          */
/*                                                                     */
/* Grid, bukan flex. Dengan flex, lebar tiap sel mengikuti isinya,     */
/* jadi kategori di baris satu tidak pernah sejajar dengan kategori    */
/* di baris dua. Grid dengan lebar kolom tetap menyelesaikan itu.      */
/*                                                                     */
/* Pemakaian:                                                          */
/*   <Baris                                                            */
/*     kolom={[                                                        */
/*       { isi: '22-Aug', lebar: '96px', redup: true },                */
/*       { isi: 'Warung Nasi', lebar: 'minmax(0,1fr)' },               */
/*       { isi: 'Cash', lebar: '150px', redup: true },                 */
/*       { isi: <Pil .../>, lebar: '130px' },                          */
/*       { isi: 'Rp15.000', lebar: '170px', rata: 'right',             */
/*         num: true, tebal: true },                                   */
/*     ]}                                                              */
/*     aksi={...}                                                      */
/*   />                                                                */
/*                                                                     */
/* Semua baris dalam satu daftar harus memakai lebar yang sama, kalau  */
/* tidak kolomnya kembali berantakan.                                  */
/*                                                                     */
/* Aksi disembunyikan sampai baris disorot, tapi tetap memesan tempat  */
/* supaya kolom tidak bergeser saat kursor lewat. Di perangkat sentuh  */
/* tidak ada hover, jadi aksi selalu tampak di sana.                   */
/* ------------------------------------------------------------------ */
export function Baris({ kolom = [], aksi }) {
  const template =
    kolom.map(k => k.lebar || 'minmax(0,1fr)').join(' ') + (aksi ? ' auto' : '')

  return (
    <div className="baris" style={{ gridTemplateColumns: template }}>
      {kolom.map((k, i) => {
        const kelas = ['sel']
        if (k.redup) kelas.push('redup')
        if (k.tebal) kelas.push('tebal')
        if (k.num) kelas.push('num')
        return (
          <div key={i} className={kelas.join(' ')}
            style={{ textAlign: k.rata || 'left', color: k.warna || undefined }}>
            {k.isi}
          </div>
        )
      })}
      {aksi && <div className="aksi">{aksi}</div>}

      <style jsx>{`
        .baris {
          display: grid;
          align-items: center;
          gap: var(--space-4);
          min-height: var(--row-h);
          padding: var(--space-2) var(--space-5);
          border-bottom: var(--border-width) solid var(--border);
          transition: background var(--dur-fast) var(--ease);
        }
        .baris:last-child { border-bottom: none; }
        .baris:hover { background: var(--hover); }

        .sel {
          font-size: var(--text-md);
          color: var(--ink);
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .redup { font-size: var(--text-sm); color: var(--ink-2); }
        .tebal { font-weight: 600; }
        .num { white-space: nowrap; }

        .aksi {
          display: flex; gap: var(--space-1);
          opacity: 0;
          transition: opacity var(--dur-fast) var(--ease);
        }
        .baris:hover .aksi,
        .baris:focus-within .aksi { opacity: 1; }
        @media (hover: none) {
          .aksi { opacity: 1; }
        }

        @media (max-width: 767px) {
          .baris {
            min-width: 660px;
            padding: var(--space-2) var(--space-4);
            gap: var(--space-3);
          }
        }
      `}</style>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Chip filter                                                         */
/* ------------------------------------------------------------------ */
export function Chip({ aktif, anak, jumlah, ...sisa }) {
  return (
    <button type="button" className={aktif ? 'chip on' : 'chip'}
      aria-pressed={aktif} {...sisa}>
      {anak}
      {jumlah != null && <span className="jumlah num">{jumlah}</span>}
      <style jsx>{`
        .chip {
          display: inline-flex; align-items: center; gap: var(--space-2);
          min-height: 34px; padding: 0 var(--space-3);
          background: var(--surface);
          border: var(--border-width) solid var(--border);
          border-radius: var(--radius-full);
          color: var(--ink-2);
          font-size: var(--text-sm); font-weight: 600;
          white-space: nowrap;
          transition: background var(--dur-fast) var(--ease),
                      border-color var(--dur-fast) var(--ease),
                      color var(--dur-fast) var(--ease);
        }
        .chip:hover { background: var(--hover); }
        .on {
          background: var(--accent-soft);
          border-color: var(--accent-line);
          color: var(--accent);
        }
        .jumlah { color: var(--muted); font-weight: 500; }
        .on .jumlah { color: var(--accent); }
      `}</style>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Tombol                                                              */
/*                                                                     */
/* Tidak ada varian bergaris merah permanen. Aksi hapus memakai        */
/* varian bahaya yang tenang, dan wajib dikonfirmasi di pemanggilnya.  */
/* ------------------------------------------------------------------ */
export function Tombol({ varian = 'sekunder', ikon, anak, ...sisa }) {
  return (
    <button type="button" className={`t ${varian}`} {...sisa}>
      {ikon && <span className="ikon">{ikon}</span>}
      {anak}
      <style jsx>{`
        .t {
          display: inline-flex; align-items: center; justify-content: center;
          gap: var(--space-2);
          min-height: 36px; padding: 0 var(--space-4);
          border: var(--border-width) solid transparent;
          border-radius: var(--radius-full);
          font-size: var(--text-sm); font-weight: 600;
          white-space: nowrap;
          transition: background var(--dur-fast) var(--ease),
                      border-color var(--dur-fast) var(--ease),
                      color var(--dur-fast) var(--ease);
        }
        /* Sasaran sentuh diperluas lewat area tembus pandang, bukan
           dengan membesarkan bentuk tombolnya. */
        @media (hover: none) {
          .t { position: relative; }
          .t::after { content: ''; position: absolute; inset: -4px; }
        }
        .ikon { display: inline-flex; }

        .primer { background: var(--solid); color: var(--on-solid); }
        .primer:hover { background: var(--accent-quiet); }

        .sekunder {
          background: transparent;
          border-color: var(--accent);
          color: var(--accent);
        }
        .sekunder:hover { background: var(--accent-soft); }

        .halus { background: transparent; color: var(--ink-2); }
        .halus:hover { background: var(--hover); color: var(--ink); }

        .bahaya { background: transparent; color: var(--danger); }
        .bahaya:hover { background: var(--danger-soft); }
      `}</style>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Pil kategori / status                                               */
/*                                                                     */
/* Warna tidak pernah jadi satu-satunya penanda: teksnya selalu ada.   */
/* ------------------------------------------------------------------ */
const PIL = {
  netral: ['var(--surface-2)', 'var(--ink-2)'],
  aksen: ['var(--accent-soft)', 'var(--accent)'],
  ok: ['var(--ok-soft)', 'var(--ok)'],
  bahaya: ['var(--danger-soft)', 'var(--danger)'],
  peringatan: ['var(--warn-soft)', 'var(--warn)'],
}

export function Pil({ nada = 'netral', anak }) {
  const [latar, teks] = PIL[nada] || PIL.netral
  return (
    <span className="pil" style={{ background: latar, color: teks }}>
      {anak}
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
