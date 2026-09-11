# Personal Tracker

Dasbor pribadi buat catatan keuangan dan lamaran kerja. Proyek satu orang,
dipakai sendiri setiap hari, di belakang login.

## Modul

- **Keuangan** — pemasukan, pengeluaran (variable & tetap), tabungan yang
  nyambung ke target, dompet dengan saldo yang dihitung dari transaksi,
  transfer antar dompet, dan transaksi rutin bulanan.
- **Lamaran kerja** — papan tunggu lamaran kerja.

Modul baru bisa ditambah lewat `lib/modules.js` tanpa menyentuh sidebar atau
halaman home; lihat komentar di file itu.

## Stack

- Next.js 16, Pages Router (bukan App Router)
- React 19, Recharts 3
- Neon Postgres serverless (region `ap-southeast-1`)
- iron-session untuk autentikasi
- CSS custom properties + styled-jsx untuk styling

Detail arsitektur dan aturan domain lengkap ada di [`CLAUDE.md`](CLAUDE.md).
Aturan desain visual ada di [`docs/design-spec.md`](docs/design-spec.md).

## Setup

### 1. Database

Buat project di [Neon](https://neon.tech), region `ap-southeast-1` (atau
region lain, sesuaikan). Ambil connection string yang **pooled**, bentuknya:

```
postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
```

Tabel dan view (`wallets`, `wallet_balances`, `variable_expenses`, `incomes`,
`fixed_costs`, `savings`, `saving_goals`, `wallet_transfers`, `recurring`,
`recurring_applied`, dan tabel modul Lamaran) dibuat langsung di database,
bukan lewat migration file di repo ini. Kalau mulai dari database kosong,
sql schema-nya belum ada tempat resminya — tanya pemilik proyek.

### 2. Environment variables

Copy `.env.example` ke `.env.local`, isi:

| Variable | Isinya |
|---|---|
| `DATABASE_URL` | Connection string Neon (pooled) |
| `SESSION_SECRET` | String random, minimal 32 karakter (`openssl rand -hex 32`) |
| `AUTH_USERNAME` | Username login |
| `AUTH_PIN` | PIN login |

### 3. Local development

```bash
npm install
npm run dev
```

### 4. Deploy

Deploy manual dari `main` ke Vercel. Set environment variables yang sama di
atas di Vercel project settings sebelum deploy pertama.

**Selalu `npm run build` sebelum push.** `npm run dev` lebih longgar dan
meloloskan hal yang bikin deploy Vercel gagal.

## Aturan yang tidak boleh dilanggar

Lengkapnya di [`CLAUDE.md`](CLAUDE.md), inti pentingnya:

- Saldo dompet selalu dihitung dari transaksi lewat view `wallet_balances`,
  tidak pernah disimpan sebagai kolom.
- Nominal disimpan sebagai BIGINT dalam rupiah penuh, tanpa desimal.
- Periode keuangan berjalan tanggal 20 sampai 19, mengikuti tanggal gajian.

## Security notes

- Rate limiter login: 5 percobaan per 15 menit, lockout 30 menit. Disimpan
  in-memory, jadi reset saat cold start Vercel — cukup untuk pemakaian
  pribadi, bukan pertahanan serius terhadap penyerang yang determinasi.
- Session cookie: HttpOnly, SameSite=strict, Secure di production.
- Perbandingan PIN login pakai `crypto.timingSafeEqual`.
- Origin header dicek di setiap API route sebagai lapisan tambahan
  terhadap CSRF, selain SameSite cookie.
