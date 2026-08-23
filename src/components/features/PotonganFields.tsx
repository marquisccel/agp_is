"use client"

import NumberInput from "@/components/ui/NumberInput"

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
  /**
   * Tampil sebagai kartu tersendiri. Biarkan mati kalau blok ini berada
   * di dalam kartu lain: kartu di dalam kartu membuat kepala bagiannya
   * punya latar dan sudut membulat sendiri yang lalu terpotong oleh
   * overflow induknya, sehingga tepinya terbaca seperti garis putus.
   */
  kartu?: boolean
  /**
   * Baris penutup di dalam kartu yang sama, mis. total nilai transaksi.
   * Dipakai supaya sebab (potongannya) dan akibat (nilai akhirnya) tidak
   * dipisah oleh tepi kartu.
   */
  kaki?: React.ReactNode
}

export default function PotonganFields({ baris, total, eyebrow, judul, deskripsi, readOnly = false, kartu = false, kaki }: Props) {
  const nilaiWarna = (n: number) => (n > 0 ? "var(--danger)" : "var(--muted-faint)")
  const rupiah = (n: number) => (n > 0 ? `- Rp ${n.toLocaleString("id-ID")}` : "Rp 0")

  const kepala = (
    <>
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
    </>
  )

  const isi = (
    <>
      <p className="text-xs" style={{ color: "var(--muted-faint)" }}>{deskripsi}</p>

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
                <NumberInput
                  aria-label={`Berat ${b.nama} (KG)`}
                  min="0"
                  step="0.01"
                  placeholder="0"
                  className="field-input"
                  disabled={readOnly}
                  value={b.berat}
                  onValueChange={b.setBerat}
                />
              </div>
              <div>
                <label className="field-label">Harga / KG (Rp)</label>
                <NumberInput
                  aria-label={`Harga per KG ${b.nama}`}
                  min="0"
                  placeholder="0"
                  className="field-input"
                  disabled={readOnly}
                  value={b.harga}
                  onValueChange={b.setHarga}
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
    </>
  )

  if (kartu) {
    return (
      <div className="section overflow-hidden">
        <div className="section-shell-head">{kepala}</div>
        <div className="section-body">{isi}</div>
        {kaki && (
          <div
            className="border-t px-[22px] py-5"
            style={{ borderColor: "var(--border)", background: "var(--surface-sunken)" }}
          >
            {kaki}
          </div>
        )}
      </div>
    )
  }

  // Tampilan sisipan: dipisahkan dari blok di atasnya dengan satu garis,
  // bukan dengan kartu baru. Kartunya sudah disediakan pemanggil.
  return (
    <div className="border-t pt-5" style={{ borderColor: "var(--border)" }}>
      <div className="flex flex-wrap items-start justify-between gap-4">{kepala}</div>
      <div className="mt-3">{isi}</div>
    </div>
  )
}
