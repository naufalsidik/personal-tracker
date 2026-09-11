/** @type {import('next').NextConfig} */

// CSP hanya dipasang di production. Dev butuh 'unsafe-eval' untuk HMR/refresh,
// dan memasangnya di kedua lingkungan cuma menambah kondisi tanpa manfaat.
// 'unsafe-inline' di script tetap ada karena tema awal (_document.js) dan
// styled-jsx butuh itu; Pages Router tidak punya middleware nonce di sini.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

const headers = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
]
if (process.env.NODE_ENV === 'production') {
  headers.push({ key: 'Content-Security-Policy', value: csp })
}

const nextConfig = {
  reactStrictMode: true,
  // Header default Next yang bocorkan nama framework, tidak berguna
  // selain jadi informasi gratis buat penyerang.
  poweredByHeader: false,
  // App ini tidak pakai next/image sama sekali (tidak ada folder public/,
  // tidak ada <Image>). Optimizer bawaan tetap hidup tanpa guna kalau tidak
  // dimatikan, dan jadi permukaan serang (RCE AVIF, GHSA-2xp9-vwfh-vxw4).
  images: { unoptimized: true },
  async headers() {
    return [{ source: '/(.*)', headers }]
  },
}

module.exports = nextConfig
