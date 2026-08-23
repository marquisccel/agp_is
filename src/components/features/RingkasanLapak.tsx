import { getSupplierMapHref, hasResolvedSupplierCoordinates } from "@/lib/supplierLocation"

/**
 * Ringkasan lapak yang terpilih di sebuah form.
 *
 * Blok ini ditulis ulang dua kali dengan markup yang nyaris sama persis:
 * di form Input Pembelian dan di form Pengajuan Kasbon. Keduanya memakai
 * dua pil warna-warni berbunyi "Status hijau" dan "Map ready" -- nama
 * warna dan bahasa Inggris, dua hal yang sudah diluruskan di Data Lapak
 * tapi tidak pernah sampai ke sini karena salinannya berdiri sendiri.
 *
 * Bentuknya sekarang mengikuti daftar Data Lapak: satu titik berwarna di
 * samping nama untuk memindai, keterangannya berupa kata di baris abu di
 * bawahnya.
 */

type LapakRingkas = {
  nama: string
  transactionStatus: string
  target_bulanan_kg: number
  kontak_wa?: string | null
  link?: string | null
  latitude?: number | null
  longitude?: number | null
}

export default function RingkasanLapak({
  lapak,
  namaGudang,
  tampilkanKontak = false,
}: {
  lapak: LapakRingkas
  /** Dipakai sebagai kata kunci pencarian saat lapak belum punya koordinat. */
  namaGudang?: string
  tampilkanKontak?: boolean
}) {
  const koordinatLengkap = hasResolvedSupplierCoordinates(lapak)
  const adaPetunjukPeta = koordinatLengkap || Boolean(lapak.link)

  return (
    <div
      className="mt-2 rounded-[var(--radius-md)] border px-4 py-3 text-sm"
      style={{ borderColor: "var(--border)", background: "var(--surface-sunken)" }}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: lapak.transactionStatus === "GREEN" ? "var(--success)" : "var(--danger)" }}
          aria-hidden="true"
        />
        <span className="font-bold" style={{ color: "var(--foreground)" }}>{lapak.nama}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" style={{ color: "var(--muted)" }}>
        <span>{lapak.transactionStatus === "GREEN" ? "Aktif" : "Belum aktif"}</span>
        <span aria-hidden="true">&middot;</span>
        <span style={koordinatLengkap ? undefined : { color: "var(--warning)", fontWeight: 600 }}>
          {koordinatLengkap ? "Koordinat lengkap" : "Belum ada koordinat"}
        </span>
        {tampilkanKontak && (
          <>
            <span aria-hidden="true">&middot;</span>
            <span>{lapak.kontak_wa ? `WA ${lapak.kontak_wa}` : "Kontak belum diisi"}</span>
          </>
        )}
        <span aria-hidden="true">&middot;</span>
        <span>Target {Number(lapak.target_bulanan_kg || 0).toLocaleString("id-ID")} kg per bulan</span>
        {adaPetunjukPeta && (
          <>
            <span aria-hidden="true">&middot;</span>
            <a
              href={getSupplierMapHref({ ...lapak, warehouseName: namaGudang })}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:underline"
              style={{ color: "var(--brand-strong)" }}
            >
              Buka Maps
            </a>
          </>
        )}
      </div>
    </div>
  )
}
