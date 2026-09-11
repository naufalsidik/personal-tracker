import { withAuth } from '../../../../lib/auth'
import { sql, toNumber } from '../../../../lib/db'
import { isValidId } from '../../../../lib/validation'

async function handler(req, res) {
  const id = parseInt(req.query.id, 10)
  if (!isValidId(id)) return res.status(404).json({ error: 'Tidak ditemukan' })

  try {
    if (req.method === 'PUT') {
      const d = req.body || {}
      const nama = String(d.component || '').trim()
      const t = Number(d.target)
      if (!nama || nama.length > 60) return res.status(400).json({ error: 'Nama wajib diisi' })
      if (!Number.isFinite(t) || t <= 0) return res.status(400).json({ error: 'Target tidak valid' })

      const lama = await sql`select component from saving_goals where id = ${id}`
      if (!lama.length) return res.status(404).json({ error: 'Tidak ditemukan' })

      // Nama diganti: baris savings yang tersambung lewat goal_id ikut
      // diperbarui namanya. Progresnya sendiri tidak terpengaruh, karena
      // itu dihitung dari goal_id, bukan dari nama.
      if (lama[0].component !== nama) {
        const bentrok = await sql`
          select id from saving_goals where lower(component) = lower(${nama}) and id <> ${id}
        `
        if (bentrok.length) return res.status(400).json({ error: 'Nama target sudah dipakai' })
        await sql`update savings set component = ${nama} where goal_id = ${id}`
      }

      const baris = await sql`
        update saving_goals set
          component  = ${nama},
          target     = ${Math.round(t)},
          deadline   = ${d.deadline || null},
          catatan    = ${String(d.catatan || '').trim()},
          aktif      = ${d.aktif !== false},
          updated_at = now()
        where id = ${id}
        returning id, component, target, catatan, aktif,
                  to_char(deadline, 'YYYY-MM-DD') as deadline
      `
      const [s] = await sql`
        select coalesce(sum(amount), 0)::bigint as terkumpul from savings where goal_id = ${id}
      `
      return res.json({
        id: Number(baris[0].id),
        component: baris[0].component,
        target: toNumber(baris[0].target),
        terkumpul: toNumber(s.terkumpul),
        deadline: baris[0].deadline,
        catatan: baris[0].catatan,
        aktif: baris[0].aktif,
      })
    }

    if (req.method === 'DELETE') {
      // Hanya targetnya yang hilang. Baris savings tidak disentuh —
      // itu catatan uang yang benar-benar Anda sisihkan.
      const baris = await sql`delete from saving_goals where id = ${id} returning id`
      if (!baris.length) return res.status(404).json({ error: 'Tidak ditemukan' })
      return res.json({ ok: true })
    }

    res.setHeader('Allow', 'PUT, DELETE')
    return res.status(405).json({ error: 'Method tidak diizinkan' })
  } catch (e) {
    console.error('[saving-goals/id]', e.message)
    return res.status(500).json({ error: 'Gagal memproses data' })
  }
}

export default withAuth(handler)
