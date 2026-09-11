import { sql } from '../../../lib/db'
import { withAuth } from '../../../lib/auth'
import { KOLOM, keJson, bersihkan, cariDuplikat } from '../../../lib/jobs'

async function handler(req, res) {
  if (req.method === 'GET') return daftar(req, res)
  if (req.method === 'POST') return buat(req, res)
  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method tidak diizinkan' })
}

// GET /api/jobs?status=Applied&jenis=MT&q=unilever
async function daftar(req, res) {
  const { status = null, jenis = null, q = null } = req.query
  try {
    const baris = await sql`
      select ${KOLOM} from job_applications
      where (${status}::text is null or status = ${status})
        and (${jenis}::text is null or jenis = ${jenis})
        and (
          ${q}::text is null or
          lower(concat_ws(' ', perusahaan, jabatan, lokasi, referensi, catatan))
            like '%' || lower(${q}) || '%'
        )
      order by tanggal_apply desc, created_at desc
    `
    return res.json(baris.map(keJson))
  } catch (e) {
    console.error('jobs/daftar:', e)
    return res.status(500).json({ error: 'Gagal membaca data' })
  }
}

// POST /api/jobs — satu objek ATAU array. Array dipakai Cowork untuk bulk insert.
async function buat(req, res) {
  const banyak = Array.isArray(req.body)
  const isi = banyak ? req.body : [req.body]
  const hasil = []

  try {
    for (const item of isi) {
      if (!item || !String(item.perusahaan || '').trim() || !String(item.jabatan || '').trim()) {
        return res.status(400).json({ error: 'perusahaan dan jabatan wajib diisi', item })
      }

      const dup = !item.force ? await cariDuplikat(item.perusahaan, item.jabatan) : null
      if (dup) {
        // Bulk (dari Cowork) tetap lanjut supaya satu duplikat tidak
        // menggagalkan seluruh batch — baris itu ditandai, bukan ditolak.
        // Satu-satunya (dari form UI) berhenti di sini dan minta
        // konfirmasi dulu sebelum menyimpan lamaran kedua ke posisi yang
        // sama, misalnya melamar ulang tahun depan.
        if (banyak) {
          hasil.push({ ...dup, _duplicate: true })
          continue
        }
        return res.status(409).json({
          error: `Sudah pernah melamar ${item.jabatan} di ${item.perusahaan}`,
          existing: dup,
        })
      }

      const d = bersihkan(item)
      const baris = await sql`
        insert into job_applications
          (perusahaan, lokasi, jabatan, jenis, tempat, status,
           tanggal_apply, deadline, referensi, url, gaji, catatan, sumber)
        values
          (${d.perusahaan}, ${d.lokasi}, ${d.jabatan}, ${d.jenis}, ${d.tempat}, ${d.status},
           ${d.tanggalApply}, ${d.deadline}, ${d.referensi}, ${d.url}, ${d.gaji}, ${d.catatan}, ${d.sumber})
        returning ${KOLOM}
      `
      hasil.push(keJson(baris[0]))
    }
    return res.status(201).json(banyak ? hasil : hasil[0])
  } catch (e) {
    console.error('jobs/buat:', e)
    return res.status(500).json({ error: 'Gagal menyimpan data' })
  }
}

export default withAuth(handler)
