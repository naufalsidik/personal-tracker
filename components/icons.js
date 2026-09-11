// Ikon garis, mewarisi warna teks. Tidak ada emoji: bentuknya berbeda
// antar sistem operasi, tidak ikut warna, dan tidak bisa diatur tebalnya.
const dasar = {
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.7,
  strokeLinecap: 'round', strokeLinejoin: 'round',
  'aria-hidden': 'true',
}

export const IkonDompet = p => (
  <svg {...dasar} {...p}>
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1" />
    <path d="M3 7.5v9A2.5 2.5 0 0 0 5.5 19H19a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H5.5A2.5 2.5 0 0 1 3 7.5z" />
    <circle cx="16.5" cy="14" r="1.1" fill="currentColor" stroke="none" />
  </svg>
)

export const IkonSurat = p => (
  <svg {...dasar} {...p}>
    <path d="M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" />
    <path d="M3.4 7.2 12 13l8.6-5.8" />
  </svg>
)

export const IkonRumah = p => (
  <svg {...dasar} {...p}>
    <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-5.5H9V20H5a1 1 0 0 1-1-1z" />
  </svg>
)

export const IkonGrafik = p => (
  <svg {...dasar} {...p}>
    <path d="M4 20V4" />
    <path d="M4 20h16" />
    <path d="M8 20v-6M12.5 20V9M17 20v-9.5" />
  </svg>
)

export const IkonTambah = p => (
  <svg {...dasar} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const IkonDaftar = p => (
  <svg {...dasar} {...p}>
    <path d="M8 6h12M8 12h12M8 18h12" />
    <path d="M4 6h.01M4 12h.01M4 18h.01" />
  </svg>
)

export const IkonMata = p => (
  <svg {...dasar} {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

export const IkonMataTutup = p => (
  <svg {...dasar} {...p}>
    <path d="M3 3l18 18" />
    <path d="M10.6 6.1A8.9 8.9 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-3 3.6" />
    <path d="M6.6 7.8A15.6 15.6 0 0 0 2.5 12S6 18 12 18a9 9 0 0 0 3.3-.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
)

export const IkonUlang = p => (
  <svg {...dasar} {...p}>
    <path d="M20 11.5A8 8 0 0 0 6.3 6.3L4 8.5" />
    <path d="M4 4v4.5h4.5" />
    <path d="M4 12.5A8 8 0 0 0 17.7 17.7L20 15.5" />
    <path d="M20 20v-4.5h-4.5" />
  </svg>
)

export const IkonTarget = p => (
  <svg {...dasar} {...p}>
    <circle cx="12" cy="12" r="8.2" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </svg>
)

export const IkonUnduh = p => (
  <svg {...dasar} {...p}>
    <path d="M12 3.5v11" />
    <path d="M7.8 10.6 12 14.8l4.2-4.2" />
    <path d="M4.5 17v2.5a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V17" />
  </svg>
)

export const IkonTransfer = p => (
  <svg {...dasar} {...p}>
    <path d="M4 8.5h13" />
    <path d="M13.5 5 17 8.5 13.5 12" />
    <path d="M20 15.5H7" />
    <path d="M10.5 12 7 15.5 10.5 19" />
  </svg>
)