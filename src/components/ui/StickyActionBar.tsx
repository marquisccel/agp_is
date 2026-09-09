import type { ReactNode } from "react"

/**
 * Bilah aksi yang menempel di tepi bawah layar pada ponsel.
 *
 * Tombol "Simpan" di ujung form sepanjang empat layar hanya terlihat setelah
 * seluruh form digulir habis. Akibatnya pengguna yang ingin menyimpan harus
 * menggulir ke bawah lebih dulu, dan yang ingin memeriksa isian harus
 * menggulir naik lagi lalu turun lagi untuk menyimpan. Ditempelkan di bawah,
 * tombolnya selalu ada tanpa mengubah urutan apa pun di dalam form.
 *
 * Di layar lebar bilah ini kembali menjadi baris tombol biasa di alur
 * dokumen: tidak ada masalah jangkauan di sana, dan elemen melayang justru
 * menutupi isi.
 *
 * Bilah ini duduk DI ATAS bilah navigasi bawah, bukan menggantikannya, dan
 * jaraknya dihitung dari tinggi navigasi beserta safe area perangkat.
 */
export default function StickyActionBar({
  children,
  keterangan,
}: {
  children: ReactNode
  /** Teks kecil di kiri, mis. ringkasan total sebelum menyimpan. */
  keterangan?: ReactNode
}) {
  return (
    <div className="bilah-aksi" data-testid="sticky-action-bar">
      {keterangan ? <div className="bilah-aksi-keterangan">{keterangan}</div> : null}
      <div className="bilah-aksi-tombol">{children}</div>
    </div>
  )
}
