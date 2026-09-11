// Impor sekali dari data/applications.json ke Neon.
// Jalankan dari root proyek:
//   node --env-file=.env.local scripts/import-jobs.mjs "C:\path\ke\applications.json"
//
// Aman diulang: baris yang sudah ada dilewati, bukan digandakan.

import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

const sumber = process.argv[2]
if (!sumber) {
  console.error('Pakai: node --env-file=.env.local scripts/import-jobs.mjs <path applications.json>')
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL tidak terbaca. Pastikan .env.local ada dan pakai flag --env-file.')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)
const store = JSON.parse(readFileSync(sumber, 'utf8'))
const apps = Array.isArray(store) ? store : store.applications
if (!Array.isArray(apps)) {
  console.error('Format tidak dikenali: butuh array, atau objek dengan kunci "applications".')
  process.exit(1)
}

let masuk = 0
let lewat = 0
let gagal = 0

for (const a of apps) {
  try {
    const hasil = await sql`
      insert into job_applications
        (id, perusahaan, lokasi, jabatan, jenis, tempat, status,
         tanggal_apply, referensi, url, gaji, catatan, sumber, created_at, updated_at)
      values
        (${a.id}, ${a.perusahaan}, ${a.lokasi || ''}, ${a.jabatan},
         ${a.jenis || 'Tetap'}, ${a.tempat || 'WFO'}, ${a.status || 'Applied'},
         ${a.tanggalApply}, ${a.referensi || ''}, ${a.url || ''},
         ${a.gaji || ''}, ${a.catatan || ''}, ${a.sumber || 'manual'},
         ${a.createdAt}, ${a.updatedAt})
      on conflict do nothing
      returning id
    `
    if (hasil.length) { masuk++ } else { lewat++ }
  } catch (e) {
    gagal++
    console.error(`GAGAL: ${a.perusahaan} — ${a.jabatan}: ${e.message}`)
  }
}

const [{ count }] = await sql`select count(*)::int as count from job_applications`
console.log(`\nMasuk ${masuk}, dilewati ${lewat}, gagal ${gagal}. Total di tabel: ${count}`)
