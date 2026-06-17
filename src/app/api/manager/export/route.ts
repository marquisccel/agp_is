import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { getSupplierMapHref, hasResolvedSupplierCoordinates } from "@/lib/supplierLocation"

// Helper to escape values for CSV
function escape(val: unknown): string {
  if (val === null || val === undefined) return ""
  if (val instanceof Date) return val.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
  let str = String(val).trim()
  str = str.replace(/"/g, '""')
  if (str.includes(";") || str.includes(",") || str.includes("\n") || str.includes("\r") || str.includes('"')) {
    return `"${str}"`
  }
  return str
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "MANAGER") {
      return new Response("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const qBulan = searchParams.get("bulan")
    const qTahun = searchParams.get("tahun")

    const nowUtc = new Date()
    const now = new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000) // Shifted to GMT+7 (WIB)
    const selectedBulan = qBulan ? parseInt(qBulan) : now.getUTCMonth() + 1
    const selectedTahun = qTahun ? parseInt(qTahun) : now.getUTCFullYear()

    // 1. Fetch Warehouses and Targets (filtered by selected month/year)
    const warehouses = await prisma.warehouse.findMany({ orderBy: { nama: "asc" } })
    const targets = await prisma.warehouseTarget.findMany({
      where: {
        bulan: selectedBulan,
        tahun: selectedTahun,
      }
    })

    const isCurrentMonth = selectedBulan === (now.getUTCMonth() + 1) && selectedTahun === now.getUTCFullYear()
    const baseDate = isCurrentMonth ? now : new Date(Date.UTC(selectedTahun, selectedBulan - 1, 1, 12, 0, 0) + 7 * 60 * 60 * 1000)

    const localYear = baseDate.getUTCFullYear()
    const localMonth = baseDate.getUTCMonth()
    const localDate = baseDate.getUTCDate()

    // Start/End of daily target (00:00 WIB is 17:00 UTC of previous day)
    const todayStart = new Date(Date.UTC(localYear, localMonth, localDate, 0, 0, 0) - 7 * 60 * 60 * 1000)
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    // Start/End of weekly target
    const dayOfWeek = baseDate.getUTCDay() === 0 ? 6 : baseDate.getUTCDay() - 1
    const weekStart = new Date(Date.UTC(localYear, localMonth, localDate - dayOfWeek, 0, 0, 0) - 7 * 60 * 60 * 1000)
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)

    const monthStart = new Date(Date.UTC(selectedTahun, selectedBulan - 1, 1, 0, 0, 0) - 7 * 60 * 60 * 1000)
    const monthEnd = new Date(Date.UTC(selectedTahun, selectedBulan, 1, 0, 0, 0) - 7 * 60 * 60 * 1000)

    // 2. Fetch valid purchases
    const purchases = await prisma.purchase.findMany({
      where: {
        status_approval: { in: ["approved", "sudah_transfer"] },
        createdAt: { gte: monthStart, lt: monthEnd }
      },
      include: {
        warehouse: true,
        supplier: true,
        staff: true,
        admin: true,
        items: true,
        returs: true
      },
      orderBy: { tanggal: "desc" }
    })

    // 3. Fetch all registered suppliers
    const suppliers = await prisma.supplier.findMany({
      include: { warehouse: true },
      orderBy: { nama: "asc" }
    })

    const transferredPurchases = purchases.filter(p => p.status_approval === "sudah_transfer")
    const pendingTransferPurchases = purchases.filter(p => p.status_approval === "approved")
    const openTerminPurchases = purchases.filter(p => p.status_pelunasan === "BELUM_LUNAS" && (p.nominal_belum_lunas || 0) > 0)
    const missingProofPurchases = transferredPurchases.filter(p => !p.bukti_transfer)
    const periodAuditLogs = await prisma.auditLog.findMany({
      where: {
        createdAt: { gte: monthStart, lt: monthEnd }
      },
      include: {
        user: true
      },
      orderBy: { createdAt: "desc" },
      take: 100
    })

    // 4. Construct CSV Content
    let csv = "sep=;\r\n" // Force Excel to use semicolon separator

    // ==========================================
    // TITLE HEADER
    // ==========================================
    csv += "LAPORAN UTAMA KINERJA DAN TRANSAKSI PET RECYCLE\r\n"
    csv += `Periode Laporan;${selectedBulan}/${selectedTahun}\r\n`
    csv += `Tanggal Ekspor;${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}\r\n`
    csv += `Diunduh Oleh;${session.user.name} (${session.user.role})\r\n\r\n`

    // ==========================================
    // SECTION 1: KINERJA TARGET VS REALISASI PER GUDANG
    // ==========================================
    csv += "--- SECTION 1: KINERJA TARGET VS REALISASI PER GUDANG ---\r\n"
    csv += "Nama Gudang;Target Harian (kg);Target Mingguan (kg);Target Bulanan (kg);Realisasi Harian (kg);Realisasi Mingguan (kg);Realisasi Bulanan (kg);Pencapaian Harian (%);Pencapaian Mingguan (%);Pencapaian Bulanan (%)\r\n"

    for (const w of warehouses) {
      const target = targets.find(t => t.warehouseId === w.id)
      const wPurchases = purchases.filter(p => p.warehouseId === w.id)

      const actual_harian = wPurchases
        .filter(p => p.createdAt >= todayStart && p.createdAt < todayEnd)
        .flatMap(p => p.items)
        .reduce((s, item) => s + (item.berat_final_item || 0), 0)

      const actual_mingguan = wPurchases
        .filter(p => p.createdAt >= weekStart && p.createdAt < weekEnd)
        .flatMap(p => p.items)
        .reduce((s, item) => s + (item.berat_final_item || 0), 0)

      const actual_bulanan = wPurchases
        .filter(p => p.createdAt >= monthStart && p.createdAt < monthEnd)
        .flatMap(p => p.items)
        .reduce((s, item) => s + (item.berat_final_item || 0), 0)

      const th = target?.target_harian_kg || 0
      const tm = target?.target_mingguan_kg || 0
      const tb = target?.target_bulanan_kg || 0

      const pctHarian = th > 0 ? ((actual_harian / th) * 100).toFixed(1) : "0.0"
      const pctMingguan = tm > 0 ? ((actual_mingguan / tm) * 100).toFixed(1) : "0.0"
      const pctBulanan = tb > 0 ? ((actual_bulanan / tb) * 100).toFixed(1) : "0.0"

      csv += `${escape(w.nama)};${th};${tm};${tb};${actual_harian};${actual_mingguan};${actual_bulanan};${pctHarian}%;${pctMingguan}%;${pctBulanan}%\r\n`
    }
    csv += "\r\n"

    // ==========================================
    // SECTION 2: DETAIL TRANSAKSI PEMBELIAN
    // ==========================================
    csv += "--- SECTION 2: DETAIL TRANSAKSI PEMBELIAN ---\r\n"
    csv += "No. Nota;Tanggal;Gudang;Supplier;Tipe Timbangan;Berat Estimasi Lapak (kg);Berat Final Gudang (kg);Berat Final (kg);Nilai Sebelum Retur (Rp);Potongan Retur (Rp);Potongan Karung (Rp);Nilai Setelah Retur (Rp);DP Terpakai (Rp);Total Dibayar (Rp);Status Transfer;Status Pelunasan;Persentase Pembayaran (%);Nominal Pembayaran Awal (Rp);Nominal Belum Lunas (Rp);Staff Input;Admin Review;Bukti Transfer;Tanggal Transfer\r\n"

    for (const p of purchases) {
      const itemsWeight = p.items.reduce((s, it) => s + (it.berat_final_item || 0), 0)
      const totalRetur = p.returs.reduce((s, r) => s + (r.potongan_nilai || 0), 0)

      csv += [
        p.nomor_nota || p.id.slice(0, 8).toUpperCase(),
        p.tanggal,
        p.warehouse?.nama || "—",
        p.supplier?.nama || "—",
        p.metode_pembayaran_terpilih || "—",
        p.berat_timbangan_lapak || 0,
        p.berat_timbangan_gudang || 0,
        p.berat_final || itemsWeight,
        p.total_nilai_sebelum_retur || 0,
        totalRetur,
        p.potongan_karung || 0,
        p.total_nilai_setelah_retur || 0,
        p.dp_yang_digunakan || 0,
        p.total_dibayar || 0,
        p.status_approval === "sudah_transfer" ? "Sudah Transfer" : "Disetujui (Menunggu Transfer)",
        p.status_pelunasan || "LUNAS",
        p.persentase_pembayaran ?? 100,
        p.nominal_pembayaran_awal || 0,
        p.nominal_belum_lunas || 0,
        p.staff?.nama || "—",
        p.admin?.nama || "—",
        p.bukti_transfer ? (p.bukti_transfer.startsWith("data:") ? p.bukti_transfer : `http://${req.headers.get("host") || "localhost:3000"}${p.bukti_transfer}`) : "—",
        p.tanggal_transfer || "—"
      ].map(escape).join(";") + "\r\n"
    }
    csv += "\r\n"

    // ==========================================
    // SECTION 3: BREAKDOWN ITEM BARANG
    // ==========================================
    csv += "--- SECTION 3: BREAKDOWN ITEM BARANG ---\r\n"
    csv += "No. Nota;Tanggal;Gudang;Supplier;Jenis SKU;Spesifikasi;Berat Item (kg);Harga/kg (Rp);Subtotal (Rp)\r\n"

    for (const p of purchases) {
      for (const item of p.items) {
        csv += [
          p.nomor_nota || p.id.slice(0, 8).toUpperCase(),
          p.tanggal,
          p.warehouse?.nama || "—",
          p.supplier?.nama || "—",
          item.sku_name,
          item.spec || "—",
          item.berat_final_item,
          item.harga_per_kg,
          item.subtotal
        ].map(escape).join(";") + "\r\n"
      }
    }
    csv += "\r\n"

    // ==========================================
    // SECTION 4: DAFTAR SUPPLIER & TARGET BULANAN
    // ==========================================
    csv += "--- SECTION 4: DAFTAR SUPPLIER & TARGET BULANAN ---\r\n"
    csv += "Nama Supplier;Gudang Terdaftar;Status Transaksi;Kesiapan Lokasi;Link Maps;Latitude;Longitude;Kontak WA;Nama Bank;No Rekening;Atas Nama;Target Bulanan (kg)\r\n"

    for (const s of suppliers) {
      csv += [
        s.nama,
        s.warehouse?.nama || "—",
        s.transactionStatus === "GREEN" ? "Hijau - aktif" : "Merah - belum aktif",
        hasResolvedSupplierCoordinates(s) ? "Map Ready" : "Lokasi belum lengkap",
        getSupplierMapHref({ ...s, warehouseName: s.warehouse?.nama || null }),
        s.latitude ?? "—",
        s.longitude ?? "—",
        s.kontak_wa || "—",
        s.nama_bank || "—",
        s.nomor_rekening || "—",
        s.atas_nama || "—",
        s.target_bulanan_kg || 0
      ].map(escape).join(";") + "\r\n"
    }
    csv += "\r\n"

    // ==========================================
    // SECTION 5: REKONSILIASI PAYMENT CONTROL
    // ==========================================
    csv += "--- SECTION 5: REKONSILIASI PAYMENT CONTROL ---\r\n"
    csv += "Periode;Transaksi Valid;Sudah Transfer;Menunggu Transfer;Termin Belum Lunas;Nominal Termin Terbuka (Rp);Bukti Transfer Kosong\r\n"
    csv += [
      `${selectedBulan}/${selectedTahun}`,
      purchases.length,
      transferredPurchases.length,
      pendingTransferPurchases.length,
      openTerminPurchases.length,
      openTerminPurchases.reduce((sum, p) => sum + (p.nominal_belum_lunas || 0), 0),
      missingProofPurchases.length
    ].map(escape).join(";") + "\r\n\r\n"

    if (openTerminPurchases.length > 0) {
      csv += "Daftar Termin Belum Lunas\r\n"
      csv += "No. Nota;Tanggal;Gudang;Supplier;Total Dibayar (Rp);Nominal Belum Lunas (Rp);Persentase Pembayaran (%)\r\n"
      for (const p of openTerminPurchases) {
        csv += [
          p.nomor_nota || p.id.slice(0, 8).toUpperCase(),
          p.tanggal,
          p.warehouse?.nama || "—",
          p.supplier?.nama || "—",
          p.total_dibayar || 0,
          p.nominal_belum_lunas || 0,
          p.persentase_pembayaran ?? 100
        ].map(escape).join(";") + "\r\n"
      }
      csv += "\r\n"
    }

    // ==========================================
    // SECTION 6: AUDIT ACTIVITY PERIODE
    // ==========================================
    csv += "--- SECTION 6: AUDIT ACTIVITY PERIODE ---\r\n"
    csv += "Waktu;User;Role;Aktivitas;Tabel;Record ID\r\n"
    for (const log of periodAuditLogs) {
      csv += [
        log.createdAt,
        log.user?.nama || "—",
        log.user?.role || "—",
        formatAuditAction(log.action),
        log.table_name,
        log.record_id
      ].map(escape).join(";") + "\r\n"
    }

    // Add UTF-8 BOM so Excel opens with correct character encoding
    const BOM = "\uFEFF"
    const responseContent = BOM + csv

    return new Response(responseContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="Laporan_Manager_PET_${now.toISOString().split("T")[0]}.csv"`
      }
    })
  } catch (error) {
    console.error("Error generating CSV export:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}

function formatAuditAction(action: string) {
  const labels: Record<string, string> = {
    CREATE_DRAFT: "Draft transaksi dibuat",
    SUPERVISOR_VERIFY_PURCHASE: "Penerimaan diverifikasi supervisor",
    ADMIN_DOUBLE_CHECK: "Double check admin selesai",
    MANAGER_APPROVE_PRICE: "Harga disetujui manager",
    MANAGER_REJECT_PRICE: "Harga ditolak manager",
    UPLOAD_TRANSFER_PROOF: "Bukti transfer diunggah",
    REPLACE_TRANSFER_PROOF: "Bukti transfer diganti",
    SETTLE_TERMIN: "Termin ditandai lunas",
    CREATE_DP_REQUEST: "Pengajuan kasbon dibuat",
    APPROVE_DP: "Kasbon disetujui",
    REJECT_DP: "Kasbon ditolak",
    SUPPLIER_STATUS_UPDATE: "Status supplier diperbarui",
  }

  return labels[action] || action.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, char => char.toUpperCase())
}
