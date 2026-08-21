"use client"

/**
 * Blok isian "potongan" -- sampah, susut timbangan, kadar air, karung.
 *
 * Blok yang sama muncul di dua tempat: Staff saat membuat nota
 * (PurchaseForm) dan Admin saat memverifikasi (DoubleCheckForm).
 * Sebelumnya keduanya menulis markup-nya sendiri, empat baris sekali
 * tulis, jadi total delapan salinan blok yang nyaris identik. Ketika
 * satu sisi dirapikan, sisi lain ikut melenceng.
 *
 * Dibuat presentational: komponen ini tidak menyimpan state apa pun dan
 * tidak menghitung apa pun sendiri. Nilai dan totalnya dikirim dari
 * pemanggil, supaya angka di layar mustahil berbeda dari angka yang
 * dipakai perhitungan nota.
 */

export type BarisPotongan = {
  kunci: string
  nama: string
  berat: number
  setBerat: (v: number) => void
  harga: number
  setHarga: (v: number) => void
  nilai: number
}

type Props = {
  baris: BarisPotongan[]
  /** Total potongan. Dikirim dari pemanggil, bukan dijumlah ulang di sini. */
  total: number
  eyebrow: string
  judul: string
  deskripsi: string
  /** Admin tidak boleh mengubah nilai di tahap tertentu. */
  readOnly?: boolean
}

export default function PotonganFields({ baris, total, eyebrow, judul, deskripsi, readOnly = false }: Props) {
  const nilaiWarna = (n: number) => (n > 0 ? "var(--danger)" : "var(--muted-faint)")
  const rupiah = (n: number) => (n > 0 ? `- Rp ${n.toLocaleString("id-ID")}` : "Rp 0")

  return (
    <div className="section">
      <div className="section-shell-head">
        <div>
          <span className="section-eyebrow">{eyebrow}</span>
          <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>{judul}</h3>
        </div>
        <div className="text-right">
          <span className="field-label" style={{ marginBottom: 2 }}>Total Potongan</span>
          <span
            className="text-base font-extrabold"
            style={{ color: nilaiWarna(total), fontVariantNumeric: "tabular-nums" }}
          >
            {rupiah(total)}
          </span>
        </div>
      </div>

      <p className="mt-1 text-xs" style={{ color: "var(--muted-faint)" }}>{deskripsi}</p>

      <div className="mt-4 space-y-2.5">
        {baris.map((b) => (
          <div
            key={b.kunci}
            className="flex flex-col gap-3 rounded-[var(--radius-md)] border p-3.5 md:flex-row md:items-center"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <div className="text-sm font-bold md:w-[22%]" style={{ color: "var(--foreground)" }}>
              {b.nama}
            </div>
            <div className="grid flex-1 grid-cols-2 gap-3">
              <div>
                <label className="field-label">Berat (KG)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  className="field-input"
                  disabled={readOnly}
                  value={b.berat || ""}
                  onChange={(e) => b.setBerat(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="field-label">Harga / KG (Rp)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  className="field-input"
                  disabled={readOnly}
                  value={b.harga || ""}
                  onChange={(e) => b.setHarga(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="text-right md:w-[22%]">
              <span className="field-label" style={{ marginBottom: 2 }}>Nilai Potongan</span>
              <span
                className="text-sm font-extrabold"
                style={{ color: nilaiWarna(b.nilai), fontVariantNumeric: "tabular-nums" }}
              >
                {rupiah(b.nilai)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
