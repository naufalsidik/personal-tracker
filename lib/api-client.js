// Wrapper fetch dipakai halaman-halaman modul Money dan Jobs. err.status
// dilekatkan supaya pemanggil bisa membedakan alasan gagal (misalnya 409
// duplikat, minta konfirmasi) tanpa parse ulang response.
export async function api(path, opsi) {
  const r = await fetch(path, opsi)
  if (!r.ok) {
    const e = await r.json().catch(() => ({}))
    const err = new Error(e.error || 'Gagal menyimpan')
    err.status = r.status
    throw err
  }
  return r.json()
}
