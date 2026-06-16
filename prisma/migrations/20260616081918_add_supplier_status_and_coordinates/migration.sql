-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "transactionStatus" TEXT NOT NULL DEFAULT 'RED';

UPDATE "Supplier"
SET "transactionStatus" = 'GREEN'
WHERE EXISTS (
    SELECT 1
    FROM "Purchase"
    WHERE "Purchase"."supplierId" = "Supplier"."id"
      AND "Purchase"."status_approval" IN ('approved', 'sudah_transfer')
);
