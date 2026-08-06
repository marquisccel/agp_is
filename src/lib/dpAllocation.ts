import type { Prisma } from "@prisma/client"

/**
 * Toleransi pembulatan floating point untuk perbandingan nominal uang.
 * Nilai rupiah disimpan sebagai Float pada schema, sehingga perbandingan
 * langsung (a >= b) dapat gagal karena galat presisi.
 */
const EPSILON = 0.01

export type DpAllocationDetail = {
  downPaymentId: string
  amount: number
}

export class InsufficientDpError extends Error {
  available: number
  requested: number

  constructor(requested: number, available: number) {
    super(
      `Nominal DP yang digunakan (${requested}) melebihi total sisa saldo DP supplier (${available}).`
    )
    this.name = "InsufficientDpError"
    this.requested = requested
    this.available = available
  }
}

/**
 * Menghitung total sisa saldo DP yang disetujui untuk seorang supplier.
 */
export async function getAvailableDpBalance(
  tx: Prisma.TransactionClient,
  supplierId: string
): Promise<number> {
  const rows = await tx.downPayment.findMany({
    where: { supplierId, status_approval: "approved", sisa_dp: { gt: 0 } },
    select: { sisa_dp: true },
  })
  return rows.reduce((sum, row) => sum + (row.sisa_dp ?? 0), 0)
}

/**
 * Memotong saldo DP supplier sebesar `amount`, dialokasikan ke beberapa record
 * DP bila saldo tersebar (FIFO berdasarkan tanggal persetujuan / pembuatan).
 *
 * Memperbaiki D-1: implementasi sebelumnya hanya mencari SATU record dengan
 * sisa_dp >= amount, sehingga bila saldo tersebar di beberapa record, tidak ada
 * saldo yang terpotong sama sekali sementara nominal tetap mengurangi
 * total pembayaran ke supplier.
 *
 * @throws InsufficientDpError bila total sisa saldo tidak mencukupi.
 * @returns rincian alokasi per record DP, untuk keperluan audit log.
 */
export async function allocateDp(
  tx: Prisma.TransactionClient,
  supplierId: string,
  amount: number
): Promise<DpAllocationDetail[]> {
  if (!Number.isFinite(amount) || amount <= 0) return []

  const candidates = await tx.downPayment.findMany({
    where: { supplierId, status_approval: "approved", sisa_dp: { gt: 0 } },
    orderBy: [{ tanggal_approval: "asc" }, { tanggal_permintaan: "asc" }],
    select: { id: true, sisa_dp: true },
  })

  const available = candidates.reduce((sum, dp) => sum + (dp.sisa_dp ?? 0), 0)
  if (available + EPSILON < amount) {
    throw new InsufficientDpError(amount, available)
  }

  const allocations: DpAllocationDetail[] = []
  let remaining = amount

  for (const dp of candidates) {
    if (remaining <= EPSILON) break
    const take = Math.min(dp.sisa_dp ?? 0, remaining)
    if (take <= 0) continue

    await tx.downPayment.update({
      where: { id: dp.id },
      data: {
        dp_used_amount: { increment: take },
        sisa_dp: { decrement: take },
      },
    })

    allocations.push({ downPaymentId: dp.id, amount: take })
    remaining -= take
  }

  return allocations
}

/**
 * Mengembalikan saldo DP yang sebelumnya terpotong oleh sebuah transaksi.
 *
 * Memperbaiki D-2: sebelumnya logika pengembalian hanya tertulis sebagai
 * komentar dan tidak diimplementasikan, sehingga saldo DP tetap terpotong
 * meskipun transaksinya dibatalkan Manager.
 *
 * Karena rincian alokasi per record tidak disimpan pada schema saat ini,
 * pengembalian dilakukan secara LIFO ke record DP milik supplier yang sama
 * (kebalikan urutan alokasi), dibatasi agar sisa_dp tidak pernah melebihi
 * nominal yang disetujui.
 */
export async function refundDp(
  tx: Prisma.TransactionClient,
  supplierId: string,
  amount: number
): Promise<DpAllocationDetail[]> {
  if (!Number.isFinite(amount) || amount <= 0) return []

  const candidates = await tx.downPayment.findMany({
    where: { supplierId, status_approval: "approved", dp_used_amount: { gt: 0 } },
    orderBy: [{ tanggal_approval: "desc" }, { tanggal_permintaan: "desc" }],
    select: { id: true, dp_used_amount: true },
  })

  const refunds: DpAllocationDetail[] = []
  let remaining = amount

  for (const dp of candidates) {
    if (remaining <= EPSILON) break
    const give = Math.min(dp.dp_used_amount ?? 0, remaining)
    if (give <= 0) continue

    await tx.downPayment.update({
      where: { id: dp.id },
      data: {
        dp_used_amount: { decrement: give },
        sisa_dp: { increment: give },
      },
    })

    refunds.push({ downPaymentId: dp.id, amount: give })
    remaining -= give
  }

  return refunds
}
