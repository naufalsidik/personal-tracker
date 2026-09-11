// Nominal rupiah. Math.round di sini murni jaga-jaga — nominal di database
// selalu BIGINT tanpa desimal, tapi angka hasil kalkulasi di klien (selisih,
// rata-rata) tidak dijamin bulat.
export function rp(n) {
  return 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID')
}

// Tanggal 'YYYY-MM-DD' jadi "5 Agu 2026". T00:00:00 dipasang supaya parse
// tidak jatuh ke UTC lalu bergeser mundur sehari waktu ditampilkan di WIB.
export function fmtTanggal(iso) {
  if (!iso) return '—'
  const t = new Date(iso + 'T00:00:00')
  return isNaN(t) ? iso : t.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Ganti nominal saat mode "sembunyikan" aktif (lihat useSembunyikanNominal).
export function maskRp() {
  return 'Rp•••••'
}
