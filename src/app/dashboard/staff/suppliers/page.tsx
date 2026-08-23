import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { isOperationalRole } from "@/lib/roles"
import PageHeader from "@/components/ui/PageHeader"
import { getSupplierMapHref, hasResolvedSupplierCoordinates } from "@/lib/supplierLocation"

export default async function StaffSuppliersPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; location?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session || !isOperationalRole(session.user.role)) redirect("/login")

  const warehouseId = session.user.warehouseId
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const selectedStatus =
    resolvedSearchParams?.status === "GREEN" || resolvedSearchParams?.status === "RED"
      ? resolvedSearchParams.status
      : "all"
  const selectedLocation =
    resolvedSearchParams?.location === "ready" || resolvedSearchParams?.location === "missing"
      ? resolvedSearchParams.location
      : "all"

  const allSuppliers = warehouseId
    ? await prisma.supplier.findMany({
        where: { warehouseId },
        orderBy: { nama: "asc" },
      })
    : []
  const suppliers = selectedStatus === "all"
    ? allSuppliers
    : allSuppliers.filter((supplier) => supplier.transactionStatus === selectedStatus)
  const filteredSuppliers = suppliers.filter((supplier) => {
    if (selectedLocation === "ready") return hasResolvedSupplierCoordinates(supplier)
    if (selectedLocation === "missing") return !hasResolvedSupplierCoordinates(supplier)
    return true
  })
  const greenCount = allSuppliers.filter((supplier) => supplier.transactionStatus === "GREEN").length
  const redCount = allSuppliers.filter((supplier) => supplier.transactionStatus === "RED").length
  const mapReadyCount = allSuppliers.filter((supplier) => hasResolvedSupplierCoordinates(supplier)).length
  const mapMissingCount = allSuppliers.length - mapReadyCount

  /**
   * Penyaring bekerja lewat URL, jadi tiap tombol harus membawa pilihan
   * penyaring yang LAIN apa adanya. Sebelumnya penyusunan tautannya
   * ditulis ulang enam kali dengan rangkaian ternary yang berbeda-beda.
   */
  const href = (status: string, location: string) => {
    const q = new URLSearchParams()
    if (status !== "all") q.set("status", status)
    if (location !== "all") q.set("location", location)
    const s = q.toString()
    return s ? `/dashboard/staff/suppliers?${s}` : "/dashboard/staff/suppliers"
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Direktori lapak"
        title="Data Lapak"
        description="Daftar lapak gudang Anda. Gunakan edit untuk memperbarui kontak, rekening, target, dan jadwal ambilan."
        actions={(
          <Link
            href="/dashboard/staff/suppliers/new"
            className="btn-primer premium-button rounded-[var(--radius-sm)] px-4 py-2.5 text-sm font-bold"
          >
            Tambah Lapak
          </Link>
        )}
      />

      {allSuppliers.length > 0 && (
        <div className="section section-body flex flex-wrap items-center gap-3">
          {/* Dua deret pil berwarna-warni -- hitam, hijau, merah, biru,
              abu -- diganti satu bentuk kontrol. Yang lebih penting:
              labelnya dulu berbunyi "Hijau" dan "Merah", yaitu NAMA WARNA,
              bukan artinya. Pembaca harus sudah tahu artinya sebelum bisa
              membacanya. Sekarang kata yang menerangkan keadaan, warna
              cuma pembantu memindai. */}
          <div className="segmented">
            <Link href={href("all", selectedLocation)} className={selectedStatus === "all" ? "active" : ""}>
              Semua {allSuppliers.length}
            </Link>
            <Link
              href={href("GREEN", selectedLocation)}
              className={selectedStatus === "GREEN" ? "active" : ""}
              style={selectedStatus === "GREEN" ? { color: "var(--success)" } : undefined}
            >
              Aktif {greenCount}
            </Link>
            <Link
              href={href("RED", selectedLocation)}
              className={selectedStatus === "RED" ? "active" : ""}
              style={selectedStatus === "RED" ? { color: "var(--danger)" } : undefined}
            >
              Belum aktif {redCount}
            </Link>
          </div>

          <div className="segmented">
            <Link href={href(selectedStatus, "all")} className={selectedLocation === "all" ? "active" : ""}>
              Semua lokasi {allSuppliers.length}
            </Link>
            <Link href={href(selectedStatus, "ready")} className={selectedLocation === "ready" ? "active" : ""}>
              Koordinat lengkap {mapReadyCount}
            </Link>
            <Link
              href={href(selectedStatus, "missing")}
              className={selectedLocation === "missing" ? "active" : ""}
              style={selectedLocation === "missing" ? { color: "var(--warning)" } : undefined}
            >
              Belum ada koordinat {mapMissingCount}
            </Link>
          </div>
        </div>
      )}

      {filteredSuppliers.length === 0 ? (
        <div
          className="rounded-[var(--radius-lg)] border border-dashed p-12 text-center"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <p className="text-sm" style={{ color: "var(--muted-faint)" }}>
            {allSuppliers.length === 0 ? "Belum ada lapak terdaftar." : "Tidak ada lapak pada kombinasi filter yang dipilih."}
          </p>
          <Link
            href={allSuppliers.length === 0 ? "/dashboard/staff/suppliers/new" : "/dashboard/staff/suppliers"}
            className="mt-4 inline-block text-sm font-semibold hover:underline"
            style={{ color: "var(--brand-strong)" }}
          >
            {allSuppliers.length === 0 ? "Tambah lapak pertama" : "Lihat semua lapak"}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSuppliers.map((supplier) => {
            const bankInfo = [supplier.nama_bank, supplier.nomor_rekening].filter(Boolean).join(" - ")
            const pickupDays = supplier.hari_ambilan?.split(",").join(", ")
            const isMapReady = hasResolvedSupplierCoordinates(supplier)
            const hasMapSignal = isMapReady || Boolean(supplier.link?.trim())

            return (
              <div key={supplier.id} className="section section-body flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {/* Pola yang sama dengan Data Lapak Manager: satu titik
                      berwarna di samping nama untuk memindai, keterangannya
                      berupa kata di baris abu di bawahnya. */}
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: supplier.transactionStatus === "GREEN" ? "var(--success)" : "var(--danger)" }}
                      aria-hidden="true"
                    />
                    <p className="truncate font-bold" style={{ color: "var(--foreground)" }}>{supplier.nama}</p>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" style={{ color: "var(--muted)" }}>
                    <span>{supplier.transactionStatus === "GREEN" ? "Aktif" : "Belum aktif"}</span>
                    <span aria-hidden="true">&middot;</span>
                    <span style={isMapReady ? undefined : { color: "var(--warning)", fontWeight: 600 }}>
                      {isMapReady ? "Koordinat lengkap" : "Belum ada koordinat"}
                    </span>
                    {supplier.kontak_wa && (
                      <>
                        <span aria-hidden="true">&middot;</span>
                        <span>WA {supplier.kontak_wa}</span>
                      </>
                    )}
                    {bankInfo && (
                      <>
                        <span aria-hidden="true">&middot;</span>
                        <span>{bankInfo}</span>
                      </>
                    )}
                    {supplier.target_bulanan_kg > 0 && (
                      <>
                        <span aria-hidden="true">&middot;</span>
                        <span>{supplier.target_bulanan_kg.toLocaleString("id-ID")} kg/bulan</span>
                      </>
                    )}
                    {pickupDays && (
                      <>
                        <span aria-hidden="true">&middot;</span>
                        <span>{pickupDays}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  {hasMapSignal && (
                    <a
                      href={getSupplierMapHref({ ...supplier })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-netral premium-button px-4 py-2 text-sm"
                    >
                      Maps
                    </a>
                  )}
                  <Link
                    href={`/dashboard/staff/suppliers/${supplier.id}/edit`}
                    className="btn-netral premium-button px-4 py-2 text-sm"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
