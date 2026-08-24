import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Image from "next/image"
import { isOperationalRole } from "@/lib/roles"
import PageHeader from "@/components/ui/PageHeader"
import StatusPill from "@/components/ui/StatusPill"
import { getPurchaseStatus } from "@/lib/purchaseStatusLabels"
import { statusPembayaran } from "@/lib/paymentStatus"

export default async function StaffHistoryPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isOperationalRole(session.user.role)) {
    redirect("/login")
  }
  // Halaman ini berjudul "Daftar Transaksi Saya" dan isinya nota yang
  // dibuat sendiri. Dulu untuk Admin kueri diam-diam berpindah ke
  // seluruh gudang, sehingga judulnya berbohong. Admin punya daftarnya
  // sendiri yang lengkap dengan pencarian dan penyaring.
  if (session.user.role === "ADMIN") {
    redirect("/dashboard/admin/history")
  }

  const purchases = await prisma.purchase.findMany({
    where: { userIdStaff: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { supplier: true, items: true },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catatan transaksi"
        title="Daftar Transaksi Saya"
        description="Pantau status transaksi yang telah Anda buat."
      />

      <div className="section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tabel-lembut text-left text-sm text-slate-600">
            <thead>
              <tr>
                <th>Tanggal / Waktu</th>
                <th>Lapak</th>
                <th>Metode Bayar</th>
                <th>Total Item</th>
                <th>Status</th>
                <th className="!text-center">Bukti Transfer</th>
                <th className="!text-center">Nota</th>
              </tr>
            </thead>
            <tbody>
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center" style={{ color: "var(--muted-faint)" }}>
                    Belum ada riwayat transaksi.
                  </td>
                </tr>
              ) : (
                purchases.map((purchase) => {
                  const status = getPurchaseStatus(purchase.status_approval)
                  // Status tahapan saja tidak cukup: nota bisa berstatus
                  // "Sudah Transfer" sementara sisa terminnya belum
                  // dilunasi. Daftar Manager sudah menampilkannya; pembuat
                  // notanya sendiri justru tidak pernah diberi tahu.
                  const bayar = statusPembayaran(purchase)

                  return (
                    <tr key={purchase.id}>
                      <td className="font-medium" style={{ color: "var(--foreground)" }}>
                        {new Date(purchase.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}
                      </td>
                      <td className="font-medium">{purchase.supplier.nama}</td>
                      <td>{purchase.metode_pembayaran_terpilih?.replace("_", " ") || "-"}</td>
                      <td>{purchase.items.length} jenis</td>
                      <td>
                        <div className="flex flex-col items-start gap-1.5">
                          <StatusPill label={status.label} tone={status.tone} />
                          {bayar.sisa > 0 && <StatusPill label={bayar.label} tone={bayar.tone} />}
                        </div>
                      </td>
                      <td className="text-center">
                        {purchase.bukti_transfer ? (
                          <a href={purchase.bukti_transfer} target="_blank" rel="noreferrer">
                            <Image
                              src={purchase.bukti_transfer}
                              alt="Bukti transfer"
                              unoptimized
                              width={48}
                              height={48}
                              className="mx-auto h-12 w-12 rounded-[var(--radius-sm)] border object-cover transition-transform hover:scale-105"
                              style={{ borderColor: "var(--border)" }}
                            />
                          </a>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--muted-faint)" }}>-</span>
                        )}
                      </td>
                      <td className="text-center">
                        {["approved", "sudah_transfer"].includes(purchase.status_approval) ? (
                          <a
                            href={`/nota/${purchase.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-netral premium-button inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                          >
                            Lihat Nota
                          </a>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--muted-faint)" }}>-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
