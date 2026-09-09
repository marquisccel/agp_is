/**
 * Kepala form bertahap: nomor langkah, judulnya, dan sebatang kemajuan.
 *
 * Form yang dipecah tanpa penunjuk kemajuan terasa lebih panjang, bukan
 * lebih pendek: pengisi tidak tahu ia sedang di mana dan berapa lagi yang
 * tersisa, jadi tiap layar terasa seperti bisa disusul layar lain tanpa
 * habis. Batang di sini menjawab satu pertanyaan itu saja.
 */
export default function WizardLangkah({
  langkah,
  total,
  judul,
  keterangan,
}: {
  /** Indeks langkah aktif, dimulai dari nol. */
  langkah: number
  total: number
  judul: string
  keterangan?: string
}) {
  const persen = ((langkah + 1) / total) * 100

  return (
    <div className="wizard-kepala" data-testid="wizard-kepala">
      <div className="wizard-baris">
        <span className="wizard-hitungan">
          Langkah {langkah + 1} dari {total}
        </span>
      </div>

      <h2 className="wizard-judul">{judul}</h2>
      {keterangan && <p className="wizard-keterangan">{keterangan}</p>}

      <div
        className="wizard-batang"
        role="progressbar"
        aria-valuenow={langkah + 1}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Langkah ${langkah + 1} dari ${total}: ${judul}`}
      >
        <span style={{ width: `${persen}%` }} />
      </div>
    </div>
  )
}
