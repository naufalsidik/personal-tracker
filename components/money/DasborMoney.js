import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, Cell,
} from 'recharts'
import { Kartu, JudulSection, Baris, Metrik } from '../ui'
import PilKategori from './PilKategori'
import { KOL_TANGGAL, KOL_KATEGORI, KOL_JUMLAH, KOL_PERSEN } from './kolom'

// Tab Dashboard, dikeluarkan dari pages/money/index.js.
//
// Perubahan dari versi lama:
// - Empat kartu metrik netral. Sebelumnya hijau/merah tanpa syarat.
// - Judul yang dulu jadi label kecil di dalam kartu naik jadi judul section
//   di kanvas, netral.
// - Chart breakdown pakai tangga --chart-1..5 urut besaran, bukan satu warna
//   rata, supaya urutan terbaca tanpa membaca angkanya.
// - Chart harian: pengeluaran solid aksen, budget putus-putus abu. Merah cuma
//   muncul di segmen yang benar-benar melewati budget.
// - Fixed cost dan transaksi terbaru pakai Baris dengan lebar kolom yang sama
//   seperti di tab Transaksi.

const RAMPA = [
  'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)',
  'var(--chart-4)', 'var(--chart-5)',
]

export default function DasborMoney({
  data,
  showRp,
  totalIncome, totalExpense, totalVar, totalFixed, totalSaving, selisih,
  categoryData, rekapData,
  CustomTooltip,
  CATEGORY_COLORS,
}) {
  // Garis merah tipis yang hanya digambar di hari-hari pengeluarannya melewati
  // budget. connectNulls sengaja tidak diaktifkan supaya hari yang aman tidak
  // ikut tersambung.
  const rekap = rekapData.map(r => ({
    ...r,
    Lewat: r.Pengeluaran > r.Budget ? r.Pengeluaran : null,
  }))

  const adaYangLewat = rekap.some(r => r.Lewat != null)

  return (
    <div className="tumpuk">

      {/* ---------- Ringkasan ---------- */}
      <section>
        <div className="metrik">
          <Kartu>
            <Metrik label="Total pemasukan" nilai={showRp(totalIncome)} />
          </Kartu>
          <Kartu>
            <Metrik label="Total pengeluaran" nilai={showRp(totalExpense)}
              catatan={`Variable ${showRp(totalVar)} · Tetap ${showRp(totalFixed)}`} />
          </Kartu>
          <Kartu>
            {/* Satu-satunya angka yang boleh berwarna di halaman ini, dan
                hanya kalau nilainya minus. Sisa positif itu keadaan normal,
                bukan kabar baik yang perlu diumumkan. */}
            <Metrik label="Sisa" nilai={showRp(selisih)}
              nada={selisih < 0 ? 'keluar' : undefined}
              catatan={`Setelah tabungan ${showRp(totalSaving)}`} />
          </Kartu>
          <Kartu>
            <Metrik label="Transaksi" nilai={data.transactions.length} />
          </Kartu>
        </div>
      </section>

      {/* ---------- Breakdown pengeluaran ---------- */}
      {categoryData.length > 0 && (
        <section>
          <JudulSection>Breakdown pengeluaran variable</JudulSection>
          <Kartu>
            {/* Tinggi ikut jumlah kategori. Tetap 280px waktu kategorinya
                sedikit membuat baris terlalu rapat kalau kategorinya banyak,
                dan Recharts diam-diam menyembunyikan label yang dianggap
                bakal tumpang tindih (lihat interval={0} di YAxis). */}
            <ResponsiveContainer width="100%" height={Math.max(280, categoryData.length * 36)}>
              <BarChart data={categoryData} layout="vertical"
                margin={{ left: 0, right: 110, top: 4, bottom: 4 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={120}
                  tickLine={false} axisLine={false} interval={0}
                  tick={{ fontSize: 13, fill: 'var(--ink-2)' }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--hover)' }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}
                  label={{
                    position: 'right', fontSize: 13,
                    fill: 'var(--ink-2)', formatter: v => showRp(v),
                  }}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={RAMPA[Math.min(i, RAMPA.length - 1)]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Kartu>
        </section>
      )}

      {/* ---------- Fixed cost ---------- */}
      {data.fixedCost && data.fixedCost.some(f => f.amount > 0) && (
        <section>
          <JudulSection>Pengeluaran tetap</JudulSection>
          <Kartu rapat>
            {data.fixedCost.map((f, i) => (
              <Baris key={i}
                kolom={[
                  { isi: f.item, lebar: 'minmax(0,1fr)' },
                  { isi: f.percentage, lebar: KOL_PERSEN, rata: 'right', redup: true, num: true },
                  { isi: showRp(f.amount), lebar: KOL_JUMLAH, rata: 'right', num: true, tebal: true },
                ]}
              />
            ))}
          </Kartu>
        </section>
      )}

      {/* ---------- Harian vs budget ---------- */}
      {rekap.length > 0 && (
        <section>
          <JudulSection>Pengeluaran harian vs budget</JudulSection>
          <Kartu>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={rekap} margin={{ left: 0, right: 20, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false}
                  tick={{ fontSize: 12, fill: 'var(--chart-axis)' }} />
                <YAxis tickLine={false} axisLine={false}
                  tick={{ fontSize: 12, fill: 'var(--chart-axis)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Line type="monotone" dataKey="Budget" stroke="var(--chart-target)"
                  dot={false} strokeWidth={1.5} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="Pengeluaran" stroke="var(--chart-actual)"
                  dot={false} strokeWidth={2} />
                {adaYangLewat && (
                  <Line type="monotone" dataKey="Lewat" stroke="var(--chart-over)"
                    dot={false} strokeWidth={2.5} connectNulls={false} name="Lewat budget" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </Kartu>
        </section>
      )}

      {/* ---------- Transaksi terbaru ---------- */}
      <section>
        <JudulSection>Transaksi terbaru</JudulSection>
        <Kartu rapat>
          {data.transactions.length === 0 && (
            <p className="kosong">Belum ada transaksi</p>
          )}
          {[...data.transactions].reverse().slice(0, 5).map((t, i) => (
            <Baris key={i}
              kolom={[
                { isi: t.date, lebar: KOL_TANGGAL, redup: true, num: true },
                { isi: t.description, lebar: 'minmax(0,1fr)' },
                { isi: <PilKategori nama={t.category} warna={CATEGORY_COLORS[t.category]} />, lebar: KOL_KATEGORI },
                { isi: showRp(t.amount), lebar: KOL_JUMLAH, rata: 'right', num: true, tebal: true },
              ]}
            />
          ))}
        </Kartu>
      </section>

      <style jsx>{`
        .tumpuk {
          display: flex; flex-direction: column;
          gap: var(--gap-section);
        }
        .metrik {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--gap-grid);
        }
        .kosong {
          padding: var(--space-8) var(--space-5);
          text-align: center;
          color: var(--muted);
          font-size: var(--text-sm);
        }
      `}</style>
    </div>
  )
}
