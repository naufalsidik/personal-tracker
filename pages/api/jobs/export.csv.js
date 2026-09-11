import { sql } from '../../../lib/db'
import { withAuth } from '../../../lib/auth'
import { KOLOM, keJson } from '../../../lib/jobs'
import { selCsv } from '../../../lib/csv'

const KOLOM_CSV = [
  'perusahaan', 'lokasi', 'jabatan', 'jenis', 'tempat',
  'status', 'tanggalApply', 'deadline', 'referensi', 'url', 'gaji', 'catatan',
]

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method tidak diizinkan' })
  }

  try {
    const baris = await sql`
      select ${KOLOM} from job_applications
      order by tanggal_apply desc, created_at desc
    `
    const apps = baris.map(keJson)
    const csv = [
      KOLOM_CSV.join(','),
      ...apps.map(a => KOLOM_CSV.map(c => selCsv(a[c])).join(',')),
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=lamaran.csv')
    // BOM supaya Excel membaca UTF-8 dengan benar
    return res.send('\uFEFF' + csv)
  } catch (e) {
    console.error('jobs/export:', e)
    return res.status(500).json({ error: 'Gagal membuat CSV' })
  }
}

export default withAuth(handler)
