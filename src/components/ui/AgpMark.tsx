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
      {/* Vesica (dua busur lingkaran radius sama lewat 2 titik ujung) --
          bentuk daun runcing di kedua ujung yang konsisten, bukan blob
          bezier bebas seperti versi sebelumnya. */}
      <path
        d="M34,24 A40,40 0 0,1 64,74 A40,40 0 0,1 34,24 Z"
        fill="#ffffff"
      />
      <line x1="34" y1="24" x2="64" y2="74" stroke="var(--brand-strong, #164A2E)" strokeWidth="2.2" opacity="0.55" strokeLinecap="round" />
    </svg>
  )
}
