// seed.js - versi JavaScript agar bisa dijalankan langsung tanpa ts-node
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.returItem.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.downPayment.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.warehouseTarget.deleteMany();
  await prisma.skuPriceStandard.deleteMany();
  await prisma.user.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.warehouse.deleteMany();

  console.log('Seeding new data...');

  // 1. Create Warehouses
  const kediri = await prisma.warehouse.create({
    data: { nama: 'Kediri', lokasi: 'Jl. Raya Kediri No. 1' }
  });
  const madiun = await prisma.warehouse.create({
    data: { nama: 'Madiun', lokasi: 'Jl. Raya Madiun No. 2' }
  });
  const malang = await prisma.warehouse.create({
    data: { nama: 'Malang', lokasi: 'Jl. Raya Malang No. 3' }
  });

  console.log('✅ Warehouses created');

  // 2. Create Users
  const password = await bcrypt.hash('password123', 10);

  // Manager (global, no warehouse)
  await prisma.user.create({
    data: {
      email: 'manager@example.com',
      nama: 'Manager Budi',
      password,
      role: 'MANAGER',
    }
  });

  // Admins - satu per gudang
  await prisma.user.create({
    data: { email: 'admin.kediri@example.com', nama: 'Admin Kediri', password, role: 'ADMIN', warehouseId: kediri.id }
  });
  await prisma.user.create({
    data: { email: 'admin.madiun@example.com', nama: 'Admin Madiun', password, role: 'ADMIN', warehouseId: madiun.id }
  });
  await prisma.user.create({
    data: { email: 'admin.malang@example.com', nama: 'Admin Malang', password, role: 'ADMIN', warehouseId: malang.id }
  });

  // Supervisors - satu per gudang
  await prisma.user.create({
    data: { email: 'supervisor.kediri@example.com', nama: 'Supervisor Kediri', password, role: 'SUPERVISOR', warehouseId: kediri.id }
  });
  await prisma.user.create({
    data: { email: 'supervisor.madiun@example.com', nama: 'Supervisor Madiun', password, role: 'SUPERVISOR', warehouseId: madiun.id }
  });
  await prisma.user.create({
    data: { email: 'supervisor.malang@example.com', nama: 'Supervisor Malang', password, role: 'SUPERVISOR', warehouseId: malang.id }
  });

  // Staffs - satu per gudang
  await prisma.user.create({
    data: { email: 'staff.kediri@example.com', nama: 'Staff Kediri', password, role: 'STAFF', warehouseId: kediri.id }
  });
  await prisma.user.create({
    data: { email: 'staff.madiun@example.com', nama: 'Staff Madiun', password, role: 'STAFF', warehouseId: madiun.id }
  });
  await prisma.user.create({
    data: { email: 'staff.malang@example.com', nama: 'Staff Malang', password, role: 'STAFF', warehouseId: malang.id }
  });

  console.log('✅ Users created (7 users total)');

  // 3. Create Suppliers terhubung ke gudang
  await prisma.supplier.create({
    data: { nama: 'Supplier A (Agus)', kontak_wa: '081234567890', target_bulanan_kg: 5000, warehouseId: madiun.id }
  });
  await prisma.supplier.create({
    data: { nama: 'Supplier B (Bambang)', kontak_wa: '081298765432', target_bulanan_kg: 10000, warehouseId: madiun.id }
  });
  await prisma.supplier.create({
    data: { nama: 'Supplier C (Cahyo)', kontak_wa: '082112345678', target_bulanan_kg: 7000, warehouseId: kediri.id }
  });
  await prisma.supplier.create({
    data: { nama: 'Supplier D (Dian)', kontak_wa: '082198765432', target_bulanan_kg: 8000, warehouseId: malang.id }
  });

  console.log('✅ Suppliers created');

  // 4. Create SkuPriceStandards untuk semua gudang
  const skus = [
    { sku_name: 'Bening', max_price_per_kg: 11000 },
    { sku_name: 'BM', max_price_per_kg: 9500 },
    { sku_name: 'Mix', max_price_per_kg: 8000 },
    { sku_name: 'Warna', max_price_per_kg: 7000 },
    { sku_name: 'Tutup HD', max_price_per_kg: 6000 },
  ];

  for (const w of [kediri, madiun, malang]) {
    for (const sku of skus) {
      await prisma.skuPriceStandard.create({
        data: {
          sku_name: sku.sku_name,
          max_price_per_kg: sku.max_price_per_kg,
          warehouseId: w.id,
        }
      });
    }
  }

  console.log('✅ SKU Price Standards created (5 SKU x 3 gudang)');

  // 5. Create default WarehouseTargets untuk semua gudang
  for (const w of [kediri, madiun, malang]) {
    await prisma.warehouseTarget.create({
      data: {
        warehouseId: w.id,
        target_harian_kg: 500,
        target_mingguan_kg: 3000,
        target_bulanan_kg: 12000,
      }
    });
  }

  console.log('✅ Warehouse Targets created');
  console.log('');
  console.log('========================================');
  console.log('✨ Seeding selesai! Data login:');
  console.log('========================================');
  console.log('MANAGER:');
  console.log('  manager@example.com        | password123');
  console.log('');
  console.log('ADMIN:');
  console.log('  admin.kediri@example.com   | password123 | Gudang Kediri');
  console.log('  admin.madiun@example.com   | password123 | Gudang Madiun');
  console.log('  admin.malang@example.com   | password123 | Gudang Malang');
  console.log('');
  console.log('SUPERVISOR:');
  console.log('  supervisor.kediri@example.com   | password123 | Gudang Kediri');
  console.log('  supervisor.madiun@example.com   | password123 | Gudang Madiun');
  console.log('  supervisor.malang@example.com   | password123 | Gudang Malang');
  console.log('');
  console.log('STAFF:');
  console.log('  staff.kediri@example.com   | password123 | Gudang Kediri');
  console.log('  staff.madiun@example.com   | password123 | Gudang Madiun');
  console.log('  staff.malang@example.com   | password123 | Gudang Malang');
  console.log('========================================');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
