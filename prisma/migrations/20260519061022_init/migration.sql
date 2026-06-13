-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "warehouseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "lokasi" TEXT NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kontak_wa" TEXT,
    "link" TEXT,
    "nama_bank" TEXT,
    "nomor_rekening" TEXT,
    "atas_nama" TEXT,
    "target_bulanan_kg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "frekuensi_ambilan_mingguan" INTEGER NOT NULL DEFAULT 1,
    "hari_ambilan" TEXT,
    "warehouseId" TEXT,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkuPriceStandard" (
    "id" TEXT NOT NULL,
    "sku_name" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "max_price_per_kg" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SkuPriceStandard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "nomor_nota" TEXT,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "warehouseId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "userIdStaff" TEXT NOT NULL,
    "userIdAdmin" TEXT,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "metode_pembayaran_terpilih" TEXT,
    "berat_timbangan_lapak" DOUBLE PRECISION,
    "berat_timbangan_gudang" DOUBLE PRECISION,
    "berat_final" DOUBLE PRECISION,
    "total_nilai_sebelum_retur" DOUBLE PRECISION,
    "total_potongan_retur" DOUBLE PRECISION,
    "total_nilai_setelah_retur" DOUBLE PRECISION,
    "potongan_sampah" DOUBLE PRECISION DEFAULT 0,
    "berat_potongan_sampah" DOUBLE PRECISION DEFAULT 0,
    "harga_potongan_sampah" DOUBLE PRECISION DEFAULT 0,
    "potongan_susut" DOUBLE PRECISION DEFAULT 0,
    "berat_potongan_susut" DOUBLE PRECISION DEFAULT 0,
    "harga_potongan_susut" DOUBLE PRECISION DEFAULT 0,
    "potongan_air" DOUBLE PRECISION DEFAULT 0,
    "berat_potongan_air" DOUBLE PRECISION DEFAULT 0,
    "harga_potongan_air" DOUBLE PRECISION DEFAULT 0,
    "potongan_karung" DOUBLE PRECISION DEFAULT 0,
    "berat_potongan_karung" DOUBLE PRECISION DEFAULT 0,
    "harga_potongan_karung" DOUBLE PRECISION DEFAULT 0,
    "dp_yang_digunakan" DOUBLE PRECISION,
    "total_dibayar" DOUBLE PRECISION,
    "persentase_pembayaran" DOUBLE PRECISION DEFAULT 100,
    "nominal_pembayaran_awal" DOUBLE PRECISION DEFAULT 0,
    "nominal_belum_lunas" DOUBLE PRECISION DEFAULT 0,
    "status_pelunasan" TEXT DEFAULT 'LUNAS',
    "status_approval" TEXT NOT NULL,
    "rejection_reason" TEXT,
    "bukti_transfer" TEXT,
    "tanggal_transfer" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseItem" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "sku_name" TEXT NOT NULL,
    "spec" TEXT,
    "berat_lapak" DOUBLE PRECISION,
    "berat_final_item" DOUBLE PRECISION NOT NULL,
    "harga_per_kg" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturItem" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "sku_name" TEXT NOT NULL,
    "berat_retur" DOUBLE PRECISION NOT NULL,
    "potongan_nilai" DOUBLE PRECISION NOT NULL,
    "alasan" TEXT,

    CONSTRAINT "ReturItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DownPayment" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "nominal_diajukan" DOUBLE PRECISION NOT NULL,
    "nominal_disetujui" DOUBLE PRECISION,
    "dp_used_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status_approval" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "sisa_dp" DOUBLE PRECISION,
    "tanggal_permintaan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tanggal_approval" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),
    "keterangan" TEXT,

    CONSTRAINT "DownPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "old_data" TEXT,
    "new_data" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseTarget" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "bulan" INTEGER NOT NULL DEFAULT 6,
    "tahun" INTEGER NOT NULL DEFAULT 2026,
    "target_harian_kg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "target_mingguan_kg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "target_bulanan_kg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "target_harian_pet_final" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "target_mingguan_pet_final" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "target_bulanan_pet_final" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "target_harian_bale_press" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "target_mingguan_bale_press" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "target_bulanan_bale_press" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedByUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_nomor_nota_key" ON "Purchase"("nomor_nota");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseTarget_warehouseId_bulan_tahun_key" ON "WarehouseTarget"("warehouseId", "bulan", "tahun");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkuPriceStandard" ADD CONSTRAINT "SkuPriceStandard_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userIdStaff_fkey" FOREIGN KEY ("userIdStaff") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userIdAdmin_fkey" FOREIGN KEY ("userIdAdmin") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturItem" ADD CONSTRAINT "ReturItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownPayment" ADD CONSTRAINT "DownPayment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownPayment" ADD CONSTRAINT "DownPayment_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseTarget" ADD CONSTRAINT "WarehouseTarget_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseTarget" ADD CONSTRAINT "WarehouseTarget_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
