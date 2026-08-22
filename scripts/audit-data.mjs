#!/usr/bin/env node
/**
 * Audit keutuhan angka pada seluruh isi basis data.
 *
 * Bukan pengganti tes: tes menjaga kode, skrip ini memeriksa DATA yang
 * sudah terlanjur tersimpan. Berguna setelah migrasi, setelah pemulihan
 * dari backup, atau sewaktu-waktu di produksi untuk memastikan tidak ada
 * saldo kasbon dan angka nota yang saling bertentangan.
 *
 * Jalankan: npm run audit:data
 * Keluar dengan kode 1 kalau ada pelanggaran, supaya bisa dipakai di cron.
 */
import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID")
const EPS = 0.01
let temuan = 0
function periksa(nama, pelanggar, gambarkan) {
  if (pelanggar.length === 0) { console.log("  ok    " + nama) }
  else {
    temuan++
    console.log("  TEMUAN " + nama + " -> " + pelanggar.length + " baris")
    pelanggar.slice(0, 5).forEach((x) => console.log("         " + gambarkan(x)))
    if (pelanggar.length > 5) console.log("         ... dan " + (pelanggar.length - 5) + " lagi")
  }
}

const dps = await p.downPayment.findMany()
const purchases = await p.purchase.findMany({ include: { supplier: { select: { warehouseId: true, nama: true } } } })

console.log("\nAUDIT BASIS DATA\n")
console.log("Cakupan: " + purchases.length + " nota, " + dps.length + " kasbon\n")

console.log("A. Saldo kasbon")
periksa(
  "sisa + terpakai = disetujui pada tiap kasbon",
  dps.filter((d) => d.status_approval === "approved" &&
    Math.abs((d.sisa_dp ?? 0) + (d.dp_used_amount ?? 0) - (d.nominal_disetujui ?? 0)) > EPS),
  (d) => d.id.slice(0, 8) + ": sisa " + rp(d.sisa_dp) + " + terpakai " + rp(d.dp_used_amount) + " != disetujui " + rp(d.nominal_disetujui),
)
periksa("sisa kasbon tidak negatif", dps.filter((d) => (d.sisa_dp ?? 0) < -EPS),
  (d) => d.id.slice(0, 8) + ": sisa " + rp(d.sisa_dp))
periksa("kasbon terpakai tidak negatif", dps.filter((d) => (d.dp_used_amount ?? 0) < -EPS),
  (d) => d.id.slice(0, 8) + ": terpakai " + rp(d.dp_used_amount))
periksa("kasbon belum disetujui tidak punya sisa saldo",
  dps.filter((d) => d.status_approval !== "approved" && ((d.sisa_dp ?? 0) > EPS || (d.dp_used_amount ?? 0) > EPS)),
  (d) => d.id.slice(0, 8) + " [" + d.status_approval + "]: sisa " + rp(d.sisa_dp))

// Kasbon terpakai per lapak harus sama dengan yang dipotong di nota aktif
const dipakaiPerLapak = new Map()
for (const d of dps) dipakaiPerLapak.set(d.supplierId, (dipakaiPerLapak.get(d.supplierId) || 0) + (d.dp_used_amount ?? 0))
const dipotongPerLapak = new Map()
for (const x of purchases) {
  if (x.status_approval === "dibatalkan") continue
  dipotongPerLapak.set(x.supplierId, (dipotongPerLapak.get(x.supplierId) || 0) + (x.dp_yang_digunakan ?? 0))
}
const selisih = []
for (const [sid, dipakai] of dipakaiPerLapak) {
  const dipotong = dipotongPerLapak.get(sid) || 0
  if (Math.abs(dipakai - dipotong) > EPS) selisih.push({ sid, dipakai, dipotong })
}
periksa("kasbon terpakai = total kasbon yang dipotong di nota aktif", selisih,
  (x) => x.sid.slice(0, 8) + ": tercatat terpakai " + rp(x.dipakai) + " vs dipotong di nota " + rp(x.dipotong))

console.log("\nB. Angka pada nota")
periksa("total dibayar tidak negatif", purchases.filter((x) => (x.total_dibayar ?? 0) < -EPS),
  (x) => (x.nomor_nota || x.id.slice(0, 8)) + ": " + rp(x.total_dibayar))
periksa("kasbon dipakai tidak negatif", purchases.filter((x) => (x.dp_yang_digunakan ?? 0) < -EPS),
  (x) => (x.nomor_nota || x.id.slice(0, 8)) + ": " + rp(x.dp_yang_digunakan))
periksa("sisa termin tidak negatif", purchases.filter((x) => (x.nominal_belum_lunas ?? 0) < -EPS),
  (x) => (x.nomor_nota || x.id.slice(0, 8)) + ": " + rp(x.nominal_belum_lunas))

const sudahDiverifikasi = purchases.filter((x) => x.total_nilai_setelah_retur != null)
periksa(
  "kasbon dipakai tidak melebihi nilai nota",
  sudahDiverifikasi.filter((x) => {
    const nilai = (x.total_nilai_setelah_retur ?? 0) -
      ((x.potongan_sampah ?? 0) + (x.potongan_susut ?? 0) + (x.potongan_air ?? 0) + (x.potongan_karung ?? 0))
    return (x.dp_yang_digunakan ?? 0) - nilai > EPS
  }),
  (x) => (x.nomor_nota || x.id.slice(0, 8)) + ": kasbon " + rp(x.dp_yang_digunakan),
)
periksa(
  "termin: pembayaran awal + sisa = nilai nota dikurangi kasbon",
  sudahDiverifikasi.filter((x) => {
    if (x.status_pelunasan !== "BELUM_LUNAS") return false
    const nilai = (x.total_nilai_setelah_retur ?? 0) -
      ((x.potongan_sampah ?? 0) + (x.potongan_susut ?? 0) + (x.potongan_air ?? 0) + (x.potongan_karung ?? 0))
    const wajib = nilai - (x.dp_yang_digunakan ?? 0)
    return Math.abs((x.nominal_pembayaran_awal ?? 0) + (x.nominal_belum_lunas ?? 0) - wajib) > EPS
  }),
  (x) => (x.nomor_nota || x.id.slice(0, 8)) + ": awal " + rp(x.nominal_pembayaran_awal) + " + sisa " + rp(x.nominal_belum_lunas),
)
periksa(
  "status pelunasan cocok dengan sisa termin",
  purchases.filter((x) => (x.status_pelunasan === "LUNAS" && (x.nominal_belum_lunas ?? 0) > EPS)),
  (x) => (x.nomor_nota || x.id.slice(0, 8)) + ": LUNAS tapi sisa " + rp(x.nominal_belum_lunas),
)

console.log("\nC. Keterkaitan data")
periksa("gudang nota sama dengan gudang lapaknya",
  purchases.filter((x) => x.supplier && x.supplier.warehouseId !== x.warehouseId),
  (x) => (x.nomor_nota || x.id.slice(0, 8)) + ": nota di gudang lain dari lapak " + x.supplier.nama)
periksa("nota berstatus sudah_transfer wajib punya bukti",
  purchases.filter((x) => x.status_approval === "sudah_transfer" && !x.bukti_transfer),
  (x) => (x.nomor_nota || x.id.slice(0, 8)) + ": tanpa bukti transfer")
periksa("nota disetujui wajib punya nomor nota",
  purchases.filter((x) => ["approved", "sudah_transfer"].includes(x.status_approval) && !x.nomor_nota),
  (x) => x.id.slice(0, 8) + " [" + x.status_approval + "]")
periksa("status nota dikenali",
  purchases.filter((x) => !["menunggu_verifikasi", "menunggu_approval_harga", "approved", "sudah_transfer", "dibatalkan"].includes(x.status_approval)),
  (x) => x.id.slice(0, 8) + ": " + x.status_approval)

console.log("\nRINGKASAN: " + (temuan === 0 ? "tidak ada pelanggaran" : temuan + " jenis pelanggaran"))
await p.$disconnect()
