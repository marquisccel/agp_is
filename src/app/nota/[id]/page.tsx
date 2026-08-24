import { prisma } from "@/lib/prisma"
import NotaViewerClient from "@/components/features/NotaViewerClient"
import QRCode from "qrcode"

export default async function NotaPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const purchase = await prisma.purchase.findUnique({
    where: { id: resolvedParams.id },
    include: {
      supplier: true,
      items: true,
      returs: true,
      warehouse: true
    }
  })

  if (!purchase || !["approved", "sudah_transfer"].includes(purchase.status_approval)) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center p-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--radius-md)]" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Nota Tidak Ditemukan</h1>
          <p className="text-slate-500 mt-2">Transaksi belum disetujui atau tidak ada.</p>
        </div>
      </div>
    )
  }

  // Generate QR Code
  const verificationUrl = `https://pet-final-ashen.vercel.app/nota/${purchase.id}`
  const qrCodeUrl = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: "H",
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
    width: 200,
  })

  // Serialize dates so they can be passed to client component
  const purchaseSerialized = {
    ...purchase,
    createdAt: purchase.createdAt.toISOString(),
    updatedAt: purchase.updatedAt.toISOString(),
    tanggal: purchase.tanggal.toISOString(),
    approvedAt: purchase.approvedAt?.toISOString() ?? null,
    tanggal_transfer: purchase.tanggal_transfer?.toISOString() ?? null,
  }

  return <NotaViewerClient purchase={purchaseSerialized} qrCodeUrl={qrCodeUrl} />
}
