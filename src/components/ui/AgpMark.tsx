/**
 * Mark 2D flat dari logo resmi PT Agrapana Greenworks Polymer (hexagon
 * hijau + daun), disederhanakan buat pemakaian kecil di UI (sidebar,
 * favicon, header) -- lihat panduan "Logo di UI" pada dokumen arah
 * desain. Logo 3D asli (gradient + bevel) TETAP dipakai apa adanya untuk
 * kop surat, nota cetak, dan materi marketing; bukan diganti oleh ini.
 *
 * Interpretasi bentuk dasar dari gambar yang dikirim stakeholder, belum
 * di-trace presisi dari file vektor resmi -- ganti isi <path> di sini
 * kalau tim brand PT sudah punya SVG resmi.
 */
export default function AgpMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
    >
      <polygon
        points="50,4 93,27 93,73 50,96 7,73 7,27"
        fill="var(--brand-strong, #164A2E)"
      />
      <path
        d="M50 24 C 66 30, 70 46, 62 60 C 56 70, 44 74, 34 70 C 44 68, 52 60, 54 48 C 44 54, 36 52, 32 44 C 42 46, 48 40, 46 30 C 48 28, 49 26, 50 24 Z"
        fill="#ffffff"
        opacity="0.94"
      />
    </svg>
  )
}
