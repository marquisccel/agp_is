import test from "node:test"
import assert from "node:assert/strict"
import type { Prisma } from "@prisma/client"
import {
  allocateDp,
  refundDp,
  getAvailableDpBalance,
  InsufficientDpError,
} from "../src/lib/dpAllocation"

type Row = {
  id: string
  supplierId: string
  status_approval: string
  sisa_dp: number
  dp_used_amount: number
  tanggal_approval: number | null
  tanggal_permintaan: number
}

/**
 * Bentuk kueri yang benar-benar dipakai kode yang diuji.
 *
 * Sengaja bukan tipe Prisma yang asli: tiruan ini hanya perlu memahami
 * sebagian kecil dari bahasa kuerinya, dan menirukan seluruh tipe Prisma
 * justru membuat tiruannya lebih rumit daripada yang diuji. Yang penting,
 * kalau kode yang diuji mulai memakai bentuk kueri di luar daftar ini,
 * pemeriksaan tipe akan langsung menolaknya -- yang tidak akan terjadi
 * kalau parameternya dibiarkan `any`.
 */
type KueriCari = {
  where: {
    supplierId?: string
    status_approval?: string
    sisa_dp?: { gt?: number }
    dp_used_amount?: { gt?: number }
  }
  orderBy?: Record<string, "asc" | "desc">[]
}

type NilaiUbah = number | string | null | { increment: number } | { decrement: number }

type KueriUbah = {
  where: { id: string }
  data: Record<string, NilaiUbah>
}

/**
 * Transaction client tiruan dengan tabel DownPayment di memori.
 * Cukup untuk menguji logika alokasi tanpa perlu basis data nyata.
 */
function fakeTx(rows: Partial<Row>[]) {
  const db: Row[] = rows.map((r, i) => ({
    id: `dp${i}`,
    supplierId: "S1",
    status_approval: "approved",
    sisa_dp: 0,
    dp_used_amount: 0,
    tanggal_approval: i,
    tanggal_permintaan: i,
    ...r,
  }))

  const client = {
    downPayment: {
      async findMany({ where, orderBy }: KueriCari) {
        let out = db.filter((r) => {
          if (where.supplierId && r.supplierId !== where.supplierId) return false
          if (where.status_approval && r.status_approval !== where.status_approval) return false
          if (where.sisa_dp?.gt !== undefined && !(r.sisa_dp > where.sisa_dp.gt)) return false
          if (where.dp_used_amount?.gt !== undefined && !(r.dp_used_amount > where.dp_used_amount.gt)) return false
          return true
        })
        if (orderBy?.length) {
          const key = Object.keys(orderBy[0])[0] as keyof Row
          const dir = Object.values(orderBy[0])[0] === "asc" ? 1 : -1
          out = out.slice().sort((a, b) => (Number(a[key] ?? 0) - Number(b[key] ?? 0)) * dir)
        }
        return out
      },
      async update({ where, data }: KueriUbah) {
        const row = db.find((r) => r.id === where.id)
        if (!row) throw new Error(`record not found: ${where.id}`)
        for (const [k, v] of Object.entries(data)) {
          const kolom = k as keyof Row
          if (typeof v === "object" && v !== null && "increment" in v) (row[kolom] as number) += v.increment
          else if (typeof v === "object" && v !== null && "decrement" in v) (row[kolom] as number) -= v.decrement
          else row[kolom] = v as never
        }
        return row
      },
    },
  }

  return { tx: client as unknown as Prisma.TransactionClient, db }
}

const totalUsed = (db: Row[]) => db.reduce((s, r) => s + r.dp_used_amount, 0)

test("saldo tersebar di beberapa record ikut terpotong (regresi D-1)", async () => {
  // Implementasi lama hanya mencari SATU record dengan sisa_dp >= nominal,
  // sehingga pada kasus ini tidak ada saldo yang terpotong sama sekali.
  const { tx, db } = fakeTx([{ sisa_dp: 500_000 }, { sisa_dp: 700_000 }])
  const alloc = await allocateDp(tx, "S1", 1_000_000)

  assert.equal(alloc.length, 2)
  assert.equal(db[0].sisa_dp, 0)
  assert.equal(db[0].dp_used_amount, 500_000)
  assert.equal(db[1].sisa_dp, 200_000)
  assert.equal(db[1].dp_used_amount, 500_000)
})

test("total terpotong sama persis dengan nominal yang dipakai", async () => {
  const { tx, db } = fakeTx([{ sisa_dp: 300_000 }, { sisa_dp: 300_000 }, { sisa_dp: 300_000 }])
  await allocateDp(tx, "S1", 750_000)
  assert.equal(totalUsed(db), 750_000)
})

test("alokasi mengikuti urutan persetujuan terlama (FIFO)", async () => {
  const { tx, db } = fakeTx([
    { id: "baru", sisa_dp: 400_000, tanggal_approval: 2 },
    { id: "lama", sisa_dp: 400_000, tanggal_approval: 1 },
  ])
  await allocateDp(tx, "S1", 400_000)
  assert.equal(db.find((r) => r.id === "lama")!.dp_used_amount, 400_000)
  assert.equal(db.find((r) => r.id === "baru")!.dp_used_amount, 0)
})

test("saldo tidak cukup: error dan tanpa pemotongan parsial", async () => {
  const { tx, db } = fakeTx([{ sisa_dp: 200_000 }, { sisa_dp: 300_000 }])
  await assert.rejects(() => allocateDp(tx, "S1", 900_000), InsufficientDpError)
  assert.equal(totalUsed(db), 0)
})

test("DP supplier lain tidak ikut terpakai", async () => {
  const { tx } = fakeTx([{ sisa_dp: 100_000 }, { sisa_dp: 900_000, supplierId: "S2" }])
  await assert.rejects(() => allocateDp(tx, "S1", 500_000), InsufficientDpError)
})

test("DP yang belum disetujui tidak ikut terpakai", async () => {
  const { tx } = fakeTx([
    { sisa_dp: 100_000 },
    { sisa_dp: 900_000, status_approval: "menunggu_approval_manager" },
  ])
  await assert.rejects(() => allocateDp(tx, "S1", 500_000), InsufficientDpError)
})

test("nominal nol tidak mengubah saldo", async () => {
  const { tx, db } = fakeTx([{ sisa_dp: 100_000 }])
  assert.deepEqual(await allocateDp(tx, "S1", 0), [])
  assert.equal(db[0].sisa_dp, 100_000)
})

test("saldo kembali utuh setelah transaksi ditolak (regresi D-2)", async () => {
  const { tx, db } = fakeTx([{ sisa_dp: 500_000 }, { sisa_dp: 700_000 }])
  await allocateDp(tx, "S1", 1_000_000)
  await refundDp(tx, "S1", 1_000_000)

  assert.equal(db[0].sisa_dp, 500_000)
  assert.equal(db[1].sisa_dp, 700_000)
  assert.equal(totalUsed(db), 0)
})

test("pengembalian dibatasi nominal yang benar-benar terpakai", async () => {
  const { tx, db } = fakeTx([{ sisa_dp: 400_000 }])
  await allocateDp(tx, "S1", 100_000)
  await refundDp(tx, "S1", 999_999)
  assert.equal(db[0].sisa_dp, 400_000)
  assert.equal(db[0].dp_used_amount, 0)
})

test("total saldo tersedia terhitung benar", async () => {
  const { tx } = fakeTx([{ sisa_dp: 250_000 }, { sisa_dp: 250_000 }])
  assert.equal(await getAvailableDpBalance(tx, "S1"), 500_000)
})
