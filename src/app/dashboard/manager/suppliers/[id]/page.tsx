import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import ManagerSupplierDetailsClient from "@/components/features/ManagerSupplierDetailsClient"

export default async function ManagerSupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "MANAGER") {
    redirect("/login")
  }

  const { id } = await params

  // Fetch supplier with its purchases and down payments
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      warehouse: true,
      purchases: {
        include: {
          items: true,
          staff: true,
          warehouse: true
        },
        orderBy: {
          createdAt: "desc"
        }
      },
      downPayments: {
        orderBy: {
          tanggal_permintaan: "desc"
        }
      }
    }
  })

  if (!supplier) {
    return notFound()
  }

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      table_name: "Supplier",
      record_id: id,
      action: {
        in: ["SUPPLIER_STATUS_MANUAL_UPDATE", "SUPPLIER_STATUS_AUTO_GREEN"],
      },
    },
    include: {
      user: {
        select: {
          nama: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  })

  // Serialize all Date objects to ISO strings
  const serializedSupplier = {
    ...supplier,
    purchases: supplier.purchases.map(p => ({
      ...p,
      tanggal: p.tanggal.toISOString(),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      approvedAt: p.approvedAt?.toISOString() ?? null,
      tanggal_transfer: p.tanggal_transfer?.toISOString() ?? null,
    })),
    downPayments: supplier.downPayments.map(dp => ({
      ...dp,
      tanggal_permintaan: dp.tanggal_permintaan.toISOString(),
      tanggal_approval: dp.tanggal_approval?.toISOString() ?? null,
      expired_at: dp.expired_at?.toISOString() ?? null,
    })),
    auditLogs: auditLogs.map((log) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
    })),
  }

  return (
    <div className="max-w-7xl mx-auto">
      <ManagerSupplierDetailsClient supplier={serializedSupplier as any} />
    </div>
  )
}
