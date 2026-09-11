import crypto from 'crypto'
import { getSession } from './session'

// Rate limiter in-memory per IP
// NOTE: Reset setiap kali serverless instance di-recycle. Cukup untuk personal use,
// tapi tidak persisten — attacker yang determined bisa bypass dengan memancing cold start.
// Untuk keamanan lebih serius, migrasi ke Vercel KV atau Upstash Redis.
const loginAttempts = new Map()

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 menit
const LOCKOUT_MS = 30 * 60 * 1000 // 30 menit lockout

// Read-only: hanya membaca state, tidak pernah menambah hitungan. Menambah
// hitungan itu kerjaan recordFailedAttempt, dan hanya untuk percobaan yang
// benar-benar gagal. Kalau fungsi ini juga menambah, satu request yang lolos
// tetap "memakan" jatah percobaan, dan lockout jatuh lebih cepat dari yang
// dijanjikan MAX_ATTEMPTS.
export function checkRateLimit(ip) {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (!entry) return { allowed: true }

  // Masih locked out
  if (entry.lockedUntil && now < entry.lockedUntil) {
    const remaining = Math.ceil((entry.lockedUntil - now) / 60000)
    return { allowed: false, remaining, locked: true }
  }

  // Window sudah lewat, hitungan lama tidak relevan lagi.
  if (now - entry.firstAttempt > WINDOW_MS) {
    return { allowed: true }
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 30, locked: true }
  }

  return { allowed: true, attemptsLeft: MAX_ATTEMPTS - entry.count }
}

export function recordFailedAttempt(ip) {
  const now = Date.now()
  const entry = loginAttempts.get(ip) || { count: 0, firstAttempt: now, lockedUntil: 0 }
  if (now - entry.firstAttempt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now, lockedUntil: 0 })
    return
  }
  entry.count += 1
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS
  }
  loginAttempts.set(ip, entry)
}

export function resetAttempts(ip) {
  loginAttempts.delete(ip)
}

// Constant-time compare pakai Node crypto, lebih aman dari implementasi manual
export function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length === 0 || b.length === 0) return false

  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')

  if (bufA.length !== bufB.length) {
    // Tetap panggil timingSafeEqual dengan buffer sama panjang untuk maintain constant time
    // timingSafeEqual akan throw kalau length beda, jadi pakai dummy compare
    try {
      crypto.timingSafeEqual(bufA, bufA)
    } catch {}
    return false
  }

  return crypto.timingSafeEqual(bufA, bufB)
}

// Check origin header untuk mitigasi CSRF
// SameSite=strict cookie sudah handle mayoritas kasus, ini lapisan tambahan
function checkOrigin(req) {
  const method = req.method?.toUpperCase()
  // GET/HEAD tidak perlu origin check
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true

  const origin = req.headers.origin
  const host = req.headers.host

  // Kalau tidak ada origin (server-to-server?), tolak dengan aman
  if (!origin || !host) return false

  try {
    const originHost = new URL(origin).host
    return originHost === host
  } catch {
    return false
  }
}

// Wrapper untuk API route: cek auth + origin
export function withAuth(handler) {
  return async (req, res) => {
    if (!checkOrigin(req)) {
      return res.status(403).json({ error: 'Forbidden: invalid origin' })
    }
    const session = await getSession(req, res)
    if (!session?.user?.authenticated) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    req.session = session
    return handler(req, res)
  }
}

// Wrapper untuk getServerSideProps: redirect ke /login kalau belum auth
export function requireAuth(gssp) {
  return async (context) => {
    const session = await getSession(context.req, context.res)
    if (!session?.user?.authenticated) {
      return { redirect: { destination: '/login', permanent: false } }
    }
    if (gssp) return gssp(context, session)
    return { props: {} }
  }
}
