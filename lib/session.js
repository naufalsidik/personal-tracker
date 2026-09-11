import crypto from 'crypto'
import { getIronSession } from 'iron-session'

const secretValid = process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32

if (!secretValid && typeof window === 'undefined') {
  console.warn('[session] SESSION_SECRET tidak di-set atau < 32 karakter. Session tidak akan bekerja.')
}

// Fallback ini cuma kepakai kalau secret memang tidak valid. Acak per
// proses, bukan konstanta, supaya tidak ada satu password yang bisa dipakai
// siapa saja untuk memalsukan cookie sesi kalau env var lupa di-set.
export const sessionOptions = {
  password: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  cookieName: 'mt_sess',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 hari
  },
}

export async function getSession(req, res) {
  // Dicek di sini, saat request sungguhan masuk, bukan saat modul di-import
  // waktu next build mengumpulkan data halaman lewat requireAuth() —
  // supaya build tidak ikut gagal gara-gara env lokal belum di-set.
  if (!secretValid && process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET wajib di-set, minimal 32 karakter')
  }
  return getIronSession(req, res, sessionOptions)
}
