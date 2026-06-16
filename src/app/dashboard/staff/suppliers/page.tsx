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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Supplier directory"
        title="Data Supplier"
        description="Daftar supplier gudang Anda. Gunakan edit untuk memperbarui kontak, rekening, target, dan jadwal ambilan."
        actions={(
          <Link
            href="/dashboard/staff/suppliers/new"
            className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-slate-950 shadow-sm hover:bg-slate-800 transition-colors"
          >
            Tambah Supplier
          </Link>
        )}
      />

      {allSuppliers.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={selectedLocation === "all" ? "/dashboard/staff/suppliers" : `/dashboard/staff/suppliers?location=${selectedLocation}`}
              className={`premium-button rounded-xl px-4 py-2 text-xs font-black ${
                selectedStatus === "all" ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              Semua Status {allSuppliers.length}
            </Link>
            <Link
              href={`/dashboard/staff/suppliers?status=GREEN${selectedLocation !== "all" ? `&location=${selectedLocation}` : ""}`}
              className={`premium-button rounded-xl px-4 py-2 text-xs font-black ${
                selectedStatus === "GREEN" ? "bg-emerald-600 text-white" : "border border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              Hijau {greenCount}
            </Link>
            <Link
              href={`/dashboard/staff/suppliers?status=RED${selectedLocation !== "all" ? `&location=${selectedLocation}` : ""}`}
              className={`premium-button rounded-xl px-4 py-2 text-xs font-black ${
                selectedStatus === "RED" ? "bg-rose-600 text-white" : "border border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              Merah {redCount}
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={selectedStatus === "all" ? "/dashboard/staff/suppliers" : `/dashboard/staff/suppliers?status=${selectedStatus}`}
              className={`premium-button rounded-xl px-4 py-2 text-xs font-black ${
                selectedLocation === "all" ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              Semua Lokasi {allSuppliers.length}
            </Link>
            <Link
              href={`/dashboard/staff/suppliers?location=ready${selectedStatus !== "all" ? `&status=${selectedStatus}` : ""}`}
              className={`premium-button rounded-xl px-4 py-2 text-xs font-black ${
                selectedLocation === "ready" ? "bg-sky-600 text-white" : "border border-sky-200 bg-sky-50 text-sky-700"
              }`}
            >
              Map Ready {mapReadyCount}
            </Link>
            <Link
              href={`/dashboard/staff/suppliers?location=missing${selectedStatus !== "all" ? `&status=${selectedStatus}` : ""}`}
              className={`premium-button rounded-xl px-4 py-2 text-xs font-black ${
                selectedLocation === "missing" ? "bg-slate-700 text-white" : "border border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              Lokasi Belum Lengkap {mapMissingCount}
            </Link>
          </div>
        </div>
      )}

      {filteredSuppliers.length === 0 ? (
        <div className="interactive-surface bg-white rounded-lg border border-dashed border-slate-200 p-12 text-center">
          <p className="text-slate-400 text-sm">
            {allSuppliers.length === 0 ? "Belum ada supplier terdaftar." : "Tidak ada supplier pada kombinasi filter yang dipilih."}
          </p>
          {allSuppliers.length === 0 ? (
            <Link
              href="/dashboard/staff/suppliers/new"
              className="mt-4 inline-block text-teal-700 text-sm font-semibold hover:underline"
            >
              Tambah supplier pertama
            </Link>
          ) : (
            <Link
              href="/dashboard/staff/suppliers"
              className="mt-4 inline-block text-teal-700 text-sm font-semibold hover:underline"
            >
              Lihat semua supplier
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSuppliers.map((supplier) => {
            const bankInfo = [supplier.nama_bank, supplier.nomor_rekening].filter(Boolean).join(" - ")
            const pickupDays = supplier.hari_ambilan?.split(",").join(", ")
            const isMapReady = hasResolvedSupplierCoordinates(supplier)
            const hasMapSignal = isMapReady || Boolean(supplier.link?.trim())

            return (
              <div
                key={supplier.id}
                className="interactive-surface bg-white rounded-lg border border-slate-200 shadow-sm p-5 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 truncate">{supplier.nama}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    <span className={`text-xs font-semibold ${
                      supplier.transactionStatus === "GREEN" ? "text-emerald-700" : "text-rose-600"
                    }`}>
                      {supplier.transactionStatus === "GREEN" ? "Status hijau" : "Status merah"}
                    </span>
                    <span className={`text-xs font-semibold ${
                      isMapReady ? "text-sky-700" : "text-slate-500"
                    }`}>
                      {isMapReady ? "Map ready" : "Lokasi belum lengkap"}
                    </span>
                    {supplier.kontak_wa && (
                      <span className="text-xs text-slate-500">WA {supplier.kontak_wa}</span>
                    )}
                    {bankInfo && (
                      <span className="text-xs text-slate-500">{bankInfo}</span>
                    )}
                    {supplier.target_bulanan_kg > 0 && (
                      <span className="text-xs text-teal-700 font-medium">
                        {supplier.target_bulanan_kg.toLocaleString("id-ID")} kg/bulan
                      </span>
                    )}
                    {pickupDays && (
                      <span className="text-xs text-slate-500">{pickupDays}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  {hasMapSignal && (
                    <a
                      href={getSupplierMapHref({ ...supplier })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors shadow-sm"
                    >
                      Maps
                    </a>
                  )}
                  <Link
                    href={`/dashboard/staff/suppliers/${supplier.id}/edit`}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-sm"
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
