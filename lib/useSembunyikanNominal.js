import { useState, useEffect, useCallback } from 'react'

const KUNCI = 'mt_hide_nominal'

// Preferensi "sembunyikan nominal" dipakai bersama di semua halaman yang
// menampilkan angka rupiah (home, dashboard Keuangan, Dompet, Target).
// Sebelumnya cuma ada di dashboard Keuangan — buka Dompet lewat sidebar
// langsung menampilkan semua saldo lagi walau baru disembunyikan sedetik
// sebelumnya. Disimpan di localStorage, jadi konsisten antar halaman di
// browser yang sama, tapi tetap per-perangkat (privasi lewat bahu di
// tempat umum, bukan pengaturan akun).
export function useSembunyikanNominal() {
  const [sembunyi, setSembunyi] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(KUNCI) === '1') setSembunyi(true)
    } catch {}
  }, [])

  const toggle = useCallback(() => {
    setSembunyi(prev => {
      const next = !prev
      try { localStorage.setItem(KUNCI, next ? '1' : '0') } catch {}
      return next
    })
  }, [])

  return [sembunyi, toggle]
}
