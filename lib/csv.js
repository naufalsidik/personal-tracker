// Sel yang diawali =, +, -, @, tab, atau carriage return dibaca sebagai
// formula oleh Excel/Sheets saat CSV dibuka, bukan teks biasa. Data lamaran
// kerja bisa datang dari lowongan luar (nama perusahaan, referensi), jadi
// bukan sekadar teori — prefiks kutip satu menetralkannya tanpa mengubah
// tampilan nilainya di aplikasi lain.
const AWALAN_FORMULA = /^[=+\-@\t\r]/

export function selCsv(v) {
  let s = String(v ?? '')
  if (AWALAN_FORMULA.test(s)) s = "'" + s
  return `"${s.replace(/"/g, '""')}"`
}
