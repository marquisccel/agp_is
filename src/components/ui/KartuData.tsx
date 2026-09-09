import type { ReactNode } from "react"

export type BarisKartu = {
  label: string
  nilai: ReactNode
  /** Sembunyikan baris ini bila nilainya kosong, mis. bukti yang belum ada. */
  sembunyikanBilaKosong?: boolean
}

/**
 * Satu baris data sebagai kartu, untuk daftar utama di layar ponsel.
 *
 * ── Kenapa bukan sekadar tabel yang dijadikan kartu ──────────────────
 *
 * Mesin data-label di globals.css sudah mengubah tabel mana pun jadi kartu,
 * dan untuk sebagian besar daftar itu memadai. Kelemahannya, seluruh sel
 * lahir dengan bobot yang sama persis: nomor nota sama besarnya dengan
 * metode timbangan, dan tombol aksi berbaris di antara data seperti kolom
 * biasa. Mata jadi harus membaca seluruh kartu untuk menemukan satu hal
 * yang sebenarnya dicari.
 *
 * Kartu ini menyusun ulang bobotnya: identitas dan status di kepala,
 * data pendukung di badan, dan kendali di kaki -- di paruh bawah kartu,
 * tempat jempol berada. Dipakai hanya untuk daftar yang memang sering
 * dipandangi, bukan untuk semua tabel.
 */
export default function KartuData({
  judul,
  subjudul,
  status,
  baris,
  aksi,
  href,
}: {
  judul: ReactNode
  subjudul?: ReactNode
  /** Pil status di kanan kepala kartu. */
  status?: ReactNode
  baris: BarisKartu[]
  /** Tombol di kaki kartu. */
  aksi?: ReactNode
  /** Bila diisi, seluruh kepala kartu menjadi tautan ke rincian. */
  href?: string
}) {
  const isiKepala = (
    <>
      <div className="min-w-0">
        <p className="kartu-judul">{judul}</p>
        {subjudul && <p className="kartu-subjudul">{subjudul}</p>}
      </div>
      {status && <div className="kartu-status">{status}</div>}
    </>
  )

  return (
    <article className="kartu-data" data-testid="kartu-data">
      {href ? (
        <a href={href} className="kartu-kepala kartu-kepala-tautan">
          {isiKepala}
        </a>
      ) : (
        <div className="kartu-kepala">{isiKepala}</div>
      )}

      <dl className="kartu-badan">
        {baris
          .filter((b) => !(b.sembunyikanBilaKosong && !b.nilai))
          .map((b) => (
            <div key={b.label} className="kartu-baris">
              <dt>{b.label}</dt>
              <dd>{b.nilai}</dd>
            </div>
          ))}
      </dl>

      {aksi && <div className="kartu-kaki">{aksi}</div>}
    </article>
  )
}
