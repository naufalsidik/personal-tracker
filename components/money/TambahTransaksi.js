import { Kartu, JudulSection, Chip, Tombol } from '../ui'

// Tab Tambah, dikeluarkan dari pages/money/index.js.
//
// Perubahan dari versi lama:
// - Tombol pilihan tipe dan jenis jadi Chip. Sebelumnya kotak isi penuh —
//   aksen untuk Tipe, --money-plan untuk Jenis — jadi dua kelompok pilihan
//   yang setara terlihat seperti dua hal berbeda.
// - Label field turun dari huruf besar berjarak lebar jadi teks biasa.
//   Sepuluh label kapital beruntun membuat form terbaca seperti formulir
//   pajak; yang perlu ditegaskan itu isinya, bukan namanya.
// - Kartu melebar dari 460px ke 520px karena ukuran huruf naik.
// - Pesan hasil simpan tetap berwarna, karena itu justru pemakaian warna
//   yang benar: bersyarat, dan menandai sesuatu yang baru saja terjadi.
//
// Seluruh state form dan handleSubmit tetap milik halaman induk.

function Field({ label, bantu, anak }) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      {anak}
      {bantu && <p className="bantu">{bantu}</p>}
      <style jsx>{`
        .field { display: flex; flex-direction: column; gap: var(--space-2); }
        .label {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--ink-2);
        }
        .bantu {
          font-size: var(--text-sm);
          color: var(--muted);
        }
      `}</style>
    </div>
  )
}

function Pilihan({ label, opsi, nilai, onPilih }) {
  return (
    <div className="pilihan">
      <span className="label">{label}</span>
      <div className="deret">
        {opsi.map(o => (
          <Chip key={o.id} aktif={nilai === o.id} anak={o.label}
            onClick={() => onPilih(o.id)} />
        ))}
      </div>
      <style jsx>{`
        .pilihan { display: flex; flex-direction: column; gap: var(--space-2); }
        .label {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--ink-2);
        }
        .deret { display: flex; flex-wrap: wrap; gap: var(--space-2); }
      `}</style>
    </div>
  )
}

export default function TambahTransaksi({
  data,
  formType, setFormType,
  expenseKind, setExpenseKind,
  formData, setFormData,
  resetForm,
  handleSubmit,
  submitting, submitMsg,
  VAR_CATEGORIES, FIXED_ITEMS,
}) {
  const pakaiTanggalDeskripsi =
    (formType === 'variable' && expenseKind === 'variable') || formType === 'income'

  const berhasil = submitMsg && submitMsg.includes('Berhasil')

  return (
    <div className="bungkus">
      <JudulSection>Tambah data</JudulSection>

      <Kartu>
        <div className="isi">

          <Pilihan
            label="Tipe"
            nilai={formType}
            onPilih={id => { setFormType(id); setExpenseKind('variable'); resetForm() }}
            opsi={[
              { id: 'variable', label: 'Pengeluaran' },
              { id: 'income', label: 'Pemasukan' },
              { id: 'saving', label: 'Tabungan' },
            ]}
          />

          {formType === 'variable' && (
            <Pilihan
              label="Jenis"
              nilai={expenseKind}
              onPilih={id => { setExpenseKind(id); resetForm() }}
              opsi={[
                { id: 'variable', label: 'Variable' },
                { id: 'fixed', label: 'Tetap' },
              ]}
            />
          )}

          {pakaiTanggalDeskripsi && (
            <>
              <Field label="Tanggal" bantu="Format DD/MM/YYYY" anak={
                <input type="text" placeholder="21/04/2026" value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })} />
              } />

              <Field label="Deskripsi" anak={
                <input type="text" placeholder="Warung Nasi, Gojek, Gaji…"
                  value={formData.description} maxLength={200}
                  onChange={e => setFormData({ ...formData, description: e.target.value })} />
              } />
            </>
          )}

          {formType === 'variable' && expenseKind === 'variable' && (
            <Field label="Kategori" anak={
              <select value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}>
                <option value="">Pilih kategori…</option>
                {VAR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            } />
          )}

          {formType === 'variable' && expenseKind === 'fixed' && (
            <Field label="Item" anak={
              <select value={formData.item}
                onChange={e => setFormData({ ...formData, item: e.target.value })}>
                <option value="">Pilih item…</option>
                {FIXED_ITEMS.map(it => <option key={it} value={it}>{it}</option>)}
              </select>
            } />
          )}

          {/* Dompet dipilih lebih dulu untuk Tabungan karena wajib —
              tabungan sekarang benar-benar memotong saldo dompet asalnya,
              bukan cuma penandaan. Untuk tipe lain tetap opsional. */}
          <Field label="Dompet"
            bantu={
              (!data?.wallets || data.wallets.length === 0)
                ? 'Belum ada dompet. Buat dulu di bagian Dompet agar saldo bisa dihitung.'
                : formType === 'saving'
                  ? 'Wajib. Saldo dompet ini akan berkurang sebesar tabungan.'
                  : undefined
            }
            anak={
              <select value={formData.walletId}
                onChange={e => setFormData({ ...formData, walletId: e.target.value })}>
                <option value="">{formType === 'saving' ? 'Pilih dompet…' : 'Tidak ditentukan'}</option>
                {(data?.wallets || []).map(w => (
                  <option key={w.id} value={w.id}>{w.nama} · {w.jenis}</option>
                ))}
              </select>
            } />

          {/* Tarik pakai nominal negatif — SUM di wallet_balances dan progres
              target sudah netral terhadap tanda, jadi tidak perlu tipe baru
              atau ubah query manapun. Tandanya cuma ditentukan di sini. */}
          {formType === 'saving' && (
            <Pilihan
              label="Jenis"
              nilai={formData.savingJenis || 'nabung'}
              onPilih={id => setFormData({ ...formData, savingJenis: id })}
              opsi={[
                { id: 'nabung', label: 'Nabung' },
                { id: 'tarik', label: 'Tarik' },
              ]}
            />
          )}

          {/* Target opsional. Menyambung ke target lewat id (bukan cocok nama
              teks) supaya salah ketik tidak lagi memutus riwayat progres. */}
          {formType === 'saving' && (
            <>
              <Field label="Target"
                bantu={(data?.savingGoalsList?.length || 0) > 0
                  ? 'Opsional. Pilih target agar progresnya ikut bertambah.'
                  : 'Belum ada target. Buat dulu di halaman Target, atau catat tanpa target.'}
                anak={
                  <select value={formData.goalId}
                    onChange={e => setFormData({ ...formData, goalId: e.target.value })}>
                    <option value="">Tanpa target</option>
                    {(data?.savingGoalsList || []).map(g => (
                      <option key={g.id} value={g.id}>{g.component}</option>
                    ))}
                  </select>
                } />

              {!formData.goalId && (
                <Field label="Komponen" anak={
                  <input type="text" placeholder="Dana Darurat, Saham, Reksa Dana…"
                    value={formData.component} maxLength={200}
                    onChange={e => setFormData({ ...formData, component: e.target.value })} />
                } />
              )}
            </>
          )}

          <Field label="Jumlah" bantu="Rupiah penuh, tanpa titik" anak={
            <input type="number" placeholder="50000" value={formData.amount} min="0"
              max="1000000000" className="num"
              onChange={e => setFormData({ ...formData, amount: e.target.value })} />
          } />

          <div className="simpan">
            <Tombol varian="primer" onClick={handleSubmit} disabled={submitting}
              anak={submitting ? 'Menyimpan…' : 'Simpan'} />
          </div>

          {submitMsg && (
            <p className="pesan" style={{ color: berhasil ? 'var(--ok)' : 'var(--danger)' }}>
              {submitMsg}
            </p>
          )}

        </div>
      </Kartu>

      <style jsx>{`
        .bungkus { max-width: 520px; margin: 0 auto; }
        .isi { display: flex; flex-direction: column; gap: var(--space-5); }

        .isi :global(input),
        .isi :global(select) {
          width: 100%;
          min-height: 42px;
          padding: 0 var(--space-3);
          background: var(--surface);
          border: var(--border-width) solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--ink);
          font-size: var(--text-md);
        }
        .isi :global(input.num) { font-variant-numeric: tabular-nums; }

        .simpan { margin-top: var(--space-2); }
        .simpan :global(button) { width: 100%; min-height: 44px; }

        .pesan {
          text-align: center;
          font-size: var(--text-sm);
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}
