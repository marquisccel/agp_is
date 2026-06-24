import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Mulai simulasi input pembelian dari staff...')

  // 1. Ambil salah satu user STAFF
  const staff = await prisma.user.findFirst({
    where: { role: 'STAFF' }
  })

  if (!staff || !staff.warehouseId) {
    console.error('Staff atau warehouseId tidak ditemukan di database. Pastikan seed sudah dijalankan.')
    return
  }

  // 2. Ambil atau buat Supplier
  let supplier = await prisma.supplier.findFirst({
    where: { nama: 'Supplier A (Agus)' }
  })
  
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: { nama: 'Supplier A (Agus)' }
    })
  }

  // 3. Siapkan data item (SKU: Bening, Berat: 100kg, Harga: Rp 10.500)
  const items = [
    { sku: 'Bening', berat: 100, hargaPerKg: 10500, subtotal: 100 * 10500 },
    { sku: 'BM', berat: 50, hargaPerKg: 9000, subtotal: 50 * 9000 }
  ]
  const totalNilai = items.reduce((acc, curr) => acc + curr.subtotal, 0)
  const nomorNota = `INV/SIM/${Date.now()}`

  // 4. Buat transaksi pembelian
  const purchase = await prisma.purchase.create({
    data: {
      nomor_nota: nomorNota,
      supplierId: supplier.id,
      warehouseId: staff.warehouseId,
      userIdStaff: staff.id,
      metode_pembayaran_terpilih: 'TIMBANGAN_GUDANG',
      total_nilai_sebelum_retur: totalNilai,
      status_approval: 'menunggu_verifikasi',
      items: {
        create: items.map(item => ({
          sku_name: item.sku,
          berat_final_item: item.berat,
          harga_per_kg: item.hargaPerKg,
          subtotal: item.subtotal
        }))
      }
    },
    include: {
      items: true,
      supplier: true,
      staff: true,
      warehouse: true
    }
  })

  console.log('✅ Berhasil mensimulasikan input pembelian dari staff!')
  console.log(JSON.stringify(purchase, null, 2))
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
