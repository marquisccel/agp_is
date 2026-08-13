/**
 * Mark 2D flat dari logo resmi PT Agrapana Greenworks Polymer (daun +
 * hexagon "G" spiral), disederhanakan buat pemakaian kecil di UI
 * (sidebar, favicon, header) -- lihat panduan "Logo di UI" pada dokumen
 * arah desain. Logo 3D asli (gradient + bevel) TETAP dipakai apa adanya
 * untuk kop surat, nota cetak, dan materi marketing; bukan diganti oleh
 * ini.
 *
 * Hexagon asli adalah spiral 3 lapis (ribbon hijau melingkar ke dalam
 * membentuk huruf G). Di sini disederhanakan jadi 2 lapis -- pada ukuran
 * kecil (32-40px di sidebar), detail spiral 3 lapis akan menyatu jadi
 * garis buram, jadi 2 lapis adalah adaptasi yang benar untuk ukuran ini,
 * bukan sekadar disederhanakan karena malas. Ganti isi path di sini kalau
 * tim brand PT sudah punya file vektor resmi.
 */
export default function AgpMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size * (100 / 108)}
      viewBox="0 0 108 100"
      className={className}
      aria-hidden="true"
    >
      {/* Daun -- vesica (dua busur radius sama lewat 2 titik ujung tetap),
          konstruksi matematis supaya runcing simetris di kedua ujung. */}
      <path
        d="M40,9 A57,57 0 0,1 18,88 A57,57 0 0,1 40,9 Z"
        fill="#4E9F4A"
      />
      <path
        d="M40,9 A57,57 0 0,1 18,88 C 24,60 30,34 40,9 Z"
        fill="#3D8639"
      />
      <path
        d="M40,10 C 32,36 26,62 20,86"
        stroke="#2E6B2B"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />

      {/* Hexagon "G" -- cincin luar penuh + kait dalam terbuka di kanan,
          2 lapis (bukan 3) supaya tetap legible di ukuran kecil. */}
      <polygon
        points="68,4 100,25 100,75 68,96 36,75 36,25"
        fill="none"
        stroke="var(--brand-strong, #164A2E)"
        strokeWidth="8"
        strokeLinejoin="miter"
      />
      <path
        d="M68,27 L52,37.5 L52,62.5 L68,73 L84,62.5 L84,50"
        fill="none"
        stroke="var(--brand-strong, #164A2E)"
        strokeWidth="8"
        strokeLinejoin="miter"
        strokeLinecap="square"
      />
    </svg>
  )
}
