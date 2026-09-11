import { Kartu, JudulSection, Baris, Tombol } from '../ui'
import PilKategori from './PilKategori'
import { KOL_TANGGAL, KOL_DOMPET, KOL_KATEGORI, KOL_JUMLAH, KOL_PERSEN } from './kolom'

// Tab Transaksi, dikeluarkan dari pages/money/index.js.
//
// Semua daftar memakai lebar kolom yang sama supaya kategori, nominal, dan
// tombol sejajar dari atas ke bawah — dan juga sejajar antar daftar, walau
// masing-masing ada di kartunya sendiri.
//
// Seluruh logika edit, hapus, dan simpan tetap milik halaman induk dan
// dioper lewat props. Komponen ini tidak menyentuh data.

function Kosong({ pesan }) {
  return (
    <p className="kosong">
      {pesan}
      <style jsx>{`
        .kosong {
          padding: var(--space-8) var(--space-5);
          text-align: center;
          color: var(--muted);
          font-size: var(--text-sm);
        }
      `}</style>
    </p>
  )
}

// Baris dalam keadaan sedang disunting. Sengaja tidak memakai <Baris> karena
// isinya kontrol form, bukan teks, dan lebar kolomnya tidak relevan.
function BarisSunting({ children, onSimpan, onBatal, menyimpan }) {
  return (
    <div className="sunting">
      <div className="isi">{children}</div>
      <div className="aksi">
        <Tombol varian="primer" onClick={onSimpan} disabled={menyimpan}
          anak={menyimpan ? 'Menyimpan…' : 'Simpan'} />
        <Tombol varian="halus" onClick={onBatal} anak="Batal" />
      </div>
      <style jsx>{`
        .sunting {
          display: flex; align-items: flex-end; gap: var(--space-3);
          padding: var(--space-3) var(--space-5);
          background: var(--surface-2);
          border-bottom: var(--border-width) solid var(--border);
        }
        .isi {
          display: flex; flex-wrap: wrap; align-items: flex-end;
          gap: var(--space-3);
          flex: 1;
        }
        .aksi { display: flex; gap: var(--space-2); flex-shrink: 0; }
        @media (max-width: 767px) {
          .sunting {
            flex-direction: column; align-items: stretch;
            padding: var(--space-3) var(--space-4);
          }
        }
      `}</style>
    </div>
  )
}

export default function DaftarTransaksi({
  data,
  rp,
  editingRow, setEditingRow,
  editForm, setEditForm,
  editSaving,
  handleSaveEdit, handleDelete,
  PilihDompet,
  VAR_CATEGORIES, CATEGORY_COLORS,
}) {
  const sedangSunting = (row, tipe) =>
    editingRow !== null && editingRow.rowNum === row.rowNum && editingRow.type === tipe

  // Nama dompet sekarang jadi kolom sendiri, bukan baris kecil di bawah
  // deskripsi, jadi tidak lagi memakai komponen NamaDompet dari halaman induk.
  const namaDompet = id => {
    const w = (data?.wallets || []).find(x => x.id === id)
    return w ? w.nama : 'Tanpa dompet'
  }

  const aksiBaris = (row, tipe, mulaiSunting) => (
    <>
      <Tombol varian="halus" onClick={mulaiSunting} anak="Edit" />
      <Tombol varian="bahaya" onClick={() => handleDelete(row, tipe)} anak="Hapus" />
    </>
  )

  return (
    <div className="tumpuk">

      {/* ---------- Pengeluaran variable ---------- */}
      <section>
        <JudulSection>Pengeluaran variable</JudulSection>
        <Kartu rapat>
          {data.transactions.length === 0 && (
            <Kosong pesan="Belum ada transaksi variable" />
          )}
          {[...data.transactions].reverse().map((t, i) => (
            sedangSunting(t, 'variable') ? (
              <BarisSunting key={i} menyimpan={editSaving}
                onSimpan={() => handleSaveEdit('variable')}
                onBatal={() => setEditingRow(null)}>
                <label className="f">
                  <span>Tanggal</span>
                  <input type="text" value={editForm.date}
                    onChange={e => setEditForm({ ...editForm, date: e.target.value })} />
                </label>
                <label className="f tumbuh">
                  <span>Deskripsi</span>
                  <input type="text" value={editForm.description} maxLength={200}
                    onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                </label>
                <div className="f">
                  <span>Dompet</span>
                  <PilihDompet />
                </div>
                <label className="f">
                  <span>Kategori</span>
                  <select value={editForm.category}
                    onChange={e => setEditForm({ ...editForm, category: e.target.value })}>
                    {VAR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="f">
                  <span>Jumlah</span>
                  <input type="number" value={editForm.amount} className="kanan"
                    onChange={e => setEditForm({ ...editForm, amount: e.target.value })} />
                </label>
              </BarisSunting>
            ) : (
              <Baris key={i}
                kolom={[
                  { isi: t.date, lebar: KOL_TANGGAL, redup: true, num: true },
                  { isi: t.description, lebar: 'minmax(0,1fr)' },
                  { isi: namaDompet(t.walletId), lebar: KOL_DOMPET, redup: true },
                  { isi: <PilKategori nama={t.category} warna={CATEGORY_COLORS[t.category]} />, lebar: KOL_KATEGORI },
                  { isi: rp(t.amount), lebar: KOL_JUMLAH, rata: 'right', num: true, tebal: true },
                ]}
                aksi={aksiBaris(t, 'variable', () => {
                  setEditingRow({ ...t, type: 'variable' })
                  setEditForm({
                    date: t.date, description: t.description, category: t.category,
                    amount: t.amount, walletId: t.walletId ?? '',
                  })
                })}
              />
            )
          ))}
        </Kartu>
      </section>

      {/* ---------- Pengeluaran tetap ---------- */}
      {data.fixedCost && data.fixedCost.length > 0 && (
        <section>
          <JudulSection>Pengeluaran tetap</JudulSection>
          <Kartu rapat>
            {data.fixedCost.map((f, i) => (
              sedangSunting(f, 'fixed') ? (
                <BarisSunting key={i} menyimpan={editSaving}
                  onSimpan={() => handleSaveEdit('fixed')}
                  onBatal={() => setEditingRow(null)}>
                  <span className="nama">{f.item}</span>
                  <div className="f">
                    <span>Dompet</span>
                    <PilihDompet />
                  </div>
                  <label className="f">
                    <span>Jumlah</span>
                    <input type="number" min="0" value={editForm.amount} className="kanan"
                      onChange={e => setEditForm({ ...editForm, amount: e.target.value })} />
                  </label>
                </BarisSunting>
              ) : (
                <Baris key={i}
                  kolom={[
                    { isi: f.item, lebar: 'minmax(0,1fr)' },
                    { isi: namaDompet(f.walletId), lebar: KOL_DOMPET, redup: true },
                    { isi: f.percentage, lebar: KOL_PERSEN, rata: 'right', redup: true, num: true },
                    { isi: rp(f.amount), lebar: KOL_JUMLAH, rata: 'right', num: true, tebal: true },
                  ]}
                  aksi={
                    <Tombol varian="halus" anak="Edit" onClick={() => {
                      setEditingRow({ ...f, type: 'fixed' })
                      setEditForm({ amount: f.amount, walletId: f.walletId ?? '' })
                    }} />
                  }
                />
              )
            ))}
          </Kartu>
        </section>
      )}

      {/* ---------- Pemasukan ---------- */}
      {data.income.length > 0 && (
        <section>
          <JudulSection>Pemasukan</JudulSection>
          <Kartu rapat>
            {data.income.map((t, i) => (
              sedangSunting(t, 'income') ? (
                <BarisSunting key={i} menyimpan={editSaving}
                  onSimpan={() => handleSaveEdit('income')}
                  onBatal={() => setEditingRow(null)}>
                  <label className="f">
                    <span>Tanggal</span>
                    <input type="text" value={editForm.date}
                      onChange={e => setEditForm({ ...editForm, date: e.target.value })} />
                  </label>
                  <label className="f tumbuh">
                    <span>Deskripsi</span>
                    <input type="text" value={editForm.description} maxLength={200}
                      onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                  </label>
                  <div className="f">
                    <span>Dompet</span>
                    <PilihDompet />
                  </div>
                  <label className="f">
                    <span>Jumlah</span>
                    <input type="number" value={editForm.amount} className="kanan"
                      onChange={e => setEditForm({ ...editForm, amount: e.target.value })} />
                  </label>
                </BarisSunting>
              ) : (
                <Baris key={i}
                  kolom={[
                    { isi: t.date, lebar: KOL_TANGGAL, redup: true, num: true },
                    { isi: t.description, lebar: 'minmax(0,1fr)' },
                    { isi: namaDompet(t.walletId), lebar: KOL_DOMPET, redup: true },
                    // Kolom kosong supaya nominal Pemasukan sejajar dengan
                    // nominal Pengeluaran variable di kartu atasnya.
                    { isi: null, lebar: KOL_KATEGORI },
                    { isi: rp(t.amount), lebar: KOL_JUMLAH, rata: 'right', num: true, tebal: true },
                  ]}
                  aksi={aksiBaris(t, 'income', () => {
                    setEditingRow({ ...t, type: 'income' })
                    setEditForm({
                      date: t.date, description: t.description,
                      amount: t.amount, walletId: t.walletId ?? '',
                    })
                  })}
                />
              )
            ))}
          </Kartu>
        </section>
      )}

      {/* ---------- Tabungan ---------- */}
      {data.saving && data.saving.length > 0 && (
        <section>
          <JudulSection>Tabungan / investasi</JudulSection>
          <Kartu rapat>
            {data.saving.map((s, i) => (
              sedangSunting(s, 'saving') ? (
                <BarisSunting key={i} menyimpan={editSaving}
                  onSimpan={() => handleSaveEdit('saving')}
                  onBatal={() => setEditingRow(null)}>
                  <div className="f">
                    <span>Target</span>
                    <select value={editForm.goalId ?? ''}
                      onChange={e => setEditForm({ ...editForm, goalId: e.target.value })}>
                      <option value="">Tanpa target</option>
                      {(data?.savingGoalsList || []).map(g => (
                        <option key={g.id} value={g.id}>{g.component}</option>
                      ))}
                    </select>
                  </div>
                  {!editForm.goalId && (
                    <label className="f tumbuh">
                      <span>Komponen</span>
                      <input type="text" value={editForm.component} maxLength={200}
                        onChange={e => setEditForm({ ...editForm, component: e.target.value })} />
                    </label>
                  )}
                  <div className="f">
                    <span>Dompet</span>
                    <PilihDompet />
                  </div>
                  <label className="f">
                    <span>Jumlah</span>
                    <input type="number" value={editForm.amount} className="kanan"
                      onChange={e => setEditForm({ ...editForm, amount: e.target.value })} />
                  </label>
                </BarisSunting>
              ) : (
                <Baris key={i}
                  kolom={[
                    { isi: s.component, lebar: 'minmax(0,1fr)' },
                    { isi: namaDompet(s.walletId), lebar: KOL_DOMPET, redup: true },
                    { isi: rp(s.amount), lebar: KOL_JUMLAH, rata: 'right', num: true, tebal: true },
                  ]}
                  aksi={aksiBaris(s, 'saving', () => {
                    setEditingRow({ ...s, type: 'saving' })
                    setEditForm({
                      component: s.component, amount: s.amount,
                      walletId: s.walletId ?? '', goalId: s.goalId ?? '',
                    })
                  })}
                />
              )
            ))}
          </Kartu>
        </section>
      )}

      <style jsx>{`
        .tumpuk {
          display: flex; flex-direction: column;
          gap: var(--gap-section);
        }

        /* Label di atas field, sesuai pola form di spesifikasi. */
        .f { display: flex; flex-direction: column; gap: var(--space-1); }
        .f.tumbuh { flex: 1; min-width: 200px; }
        .f > span {
          font-size: var(--text-xs);
          color: var(--muted);
        }
        .f :global(input),
        .f :global(select) {
          min-height: 38px;
          padding: 0 var(--space-3);
          background: var(--surface);
          border: var(--border-width) solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--ink);
          font-size: var(--text-sm);
        }
        .f :global(input.kanan) { text-align: right; }

        .nama { font-size: var(--text-md); color: var(--ink); align-self: center; }
      `}</style>
    </div>
  )
}
