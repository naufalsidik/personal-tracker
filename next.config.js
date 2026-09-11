/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // App ini tidak pakai next/image sama sekali (tidak ada folder public/,
  // tidak ada <Image>). Optimizer bawaan tetap hidup tanpa guna kalau tidak
  // dimatikan, dan jadi permukaan serang (RCE AVIF, GHSA-2xp9-vwfh-vxw4).
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
