#!/usr/bin/env node
/**
 * Audit keutuhan angka pada seluruh isi basis data.
 *
 * Bukan pengganti tes: tes menjaga kode, skrip ini memeriksa DATA yang
 * sudah terlanjur tersimpan. Berguna setelah migrasi, setelah pemulihan
 * dari backup, atau berkala di produksi untuk memastikan tidak ada saldo
 * kasbon dan angka nota yang saling bertentangan.
 *
 * Dua cara pakai:
 *
 *   npm run audit:data      -- dijalankan langsung; keluar dengan kode 1
 *                              kalau ada pelanggaran, jadi bisa dipasang
 *                              di cron.
 *
 *   auditData(prisma)       -- dipanggil sebagai fungsi. Dipakai smoke
 *                              test, yang menjalankannya SEBELUM
 *                              membersihkan data ujinya.
 *
 * Kenapa smoke yang memanggil, bukan langkah tersendiri di CI: smoke dan
 * e2e membereskan datanya masing-masing, dan seed tidak membuat nota sama
 * sekali. Audit yang dijalankan setelah keduanya cuma memeriksa basis data
 * kosong -- lolos tanpa memeriksa apa pun. Satu-satunya saat basis data
 * berisi rangkaian transaksi utuh adalah tepat sebelum smoke bersih-bersih.
 */
import { PrismaClient } from "@prisma/client"

const EPS = 0.01
const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID")

export async function auditData(p, { diam = false } = {}) {
  const log = diam ? () => {} : (...a) => console.log(...a)
  let temuan = 0
  const ringkasTemuan = []

  function periksa(nama, pelanggar, gambarkan) {
    if (pelanggar.length === 0) {
      log("  ok    " + nama)
      return
    }
    temuan++
    ringkasTemuan.push(nama + " (" + pelanggar.length + " baris)")
    log("  TEMUAN " + nama + " -> " + pelanggar.length + " baris")
    pelanggar.slice(0, 5).forEach((x) => log("         " + gambarkan(x)))
    if (pelanggar.length > 5) log("         ... dan " + (pelanggar.length - 5) + " lagi")
  }

  const dps = await p.downPayment.findMany()
  const purchases = await p.purchase.findMany({
    include: { supplier: { select: { warehouseId: true, nama: true } } },
  })

  log("\nAUDIT BASIS DATA\n")
  log("Cakupan: " + purchases.length + " nota, " + dps.length + " kasbon\n")

  log("A. Saldo kasbon")
  periksa(
    "sisa + terpakai = disetujui pada tiap kasbon",
    dps.filter(
      (d) =>
        d.status_approval === "approved" &&
        Math.abs((d.sisa_dp ?? 0) + (d.dp_used_amount ?? 0) - (d.nominal_disetujui ?? 0)) > EPS,
    ),
    (d) =>
      d.id.slice(0, 8) + ": sisa " + rp(d.sisa_dp) + " + terpakai " + rp(d.dp_used_amount) +
      " != disetujui " + rp(d.nominal_disetujui),
  )
  periksa("sisa kasbon tidak negatif", dps.filter((d) => (d.sisa_dp ?? 0) < -EPS),
    (d) => d.id.slice(0, 8) + ": sisa " + rp(d.sisa_dp))
  periksa("kasbon terpakai tidak negatif", dps.filter((d) => (d.dp_used_amount ?? 0) < -EPS),
    (d) => d.id.slice(0, 8) + ": terpakai " + rp(d.dp_used_amount))
  periksa(
    "kasbon belum disetujui tidak punya sisa saldo",
    dps.filter((d) => d.status_approval !== "approved" && ((d.sisa_dp ?? 0) > EPS || (d.dp_used_amount ?? 0) > EPS)),
    (d) => d.id.slice(0, 8) + " [" + d.status_approval + "]: sisa " + rp(d.sisa_dp),
  )

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

  log("\nB. Angka pada nota")
  const nama = (x) => x.nomor_nota || x.id.slice(0, 8)
  periksa("total dibayar tidak negatif", purchases.filter((x) => (x.total_dibayar ?? 0) < -EPS),
    (x) => nama(x) + ": " + rp(x.total_dibayar))
  periksa("kasbon dipakai tidak negatif", purchases.filter((x) => (x.dp_yang_digunakan ?? 0) < -EPS),
    (x) => nama(x) + ": " + rp(x.dp_yang_digunakan))
  periksa("sisa termin tidak negatif", purchases.filter((x) => (x.nominal_belum_lunas ?? 0) < -EPS),
    (x) => nama(x) + ": " + rp(x.nominal_belum_lunas))

  const nilaiNota = (x) =>
    (x.total_nilai_setelah_retur ?? 0) -
    ((x.potongan_sampah ?? 0) + (x.potongan_susut ?? 0) + (x.potongan_air ?? 0) + (x.potongan_karung ?? 0))
  const sudahDiverifikasi = purchases.filter((x) => x.total_nilai_setelah_retur != null)

  periksa("kasbon dipakai tidak melebihi nilai nota",
    sudahDiverifikasi.filter((x) => (x.dp_yang_digunakan ?? 0) - nilaiNota(x) > EPS),
    (x) => nama(x) + ": kasbon " + rp(x.dp_yang_digunakan) + " vs nilai nota " + rp(nilaiNota(x)))
  periksa(
    "termin: pembayaran awal + sisa = nilai nota dikurangi kasbon",
    sudahDiverifikasi.filter((x) => {
      if (x.status_pelunasan !== "BELUM_LUNAS") return false
      const wajib = nilaiNota(x) - (x.dp_yang_digunakan ?? 0)
      return Math.abs((x.nominal_pembayaran_awal ?? 0) + (x.nominal_belum_lunas ?? 0) - wajib) > EPS
    }),
    (x) => nama(x) + ": awal " + rp(x.nominal_pembayaran_awal) + " + sisa " + rp(x.nominal_belum_lunas),
  )
  periksa("status pelunasan cocok dengan sisa termin",
    purchases.filter((x) => x.status_pelunasan === "LUNAS" && (x.nominal_belum_lunas ?? 0) > EPS),
    (x) => nama(x) + ": LUNAS tapi sisa " + rp(x.nominal_belum_lunas))

  log("\nC. Keterkaitan data")
  periksa("gudang nota sama dengan gudang lapaknya",
    purchases.filter((x) => x.supplier && x.supplier.warehouseId !== x.warehouseId),
    (x) => nama(x) + ": nota di gudang lain dari lapak " + x.supplier.nama)
  periksa("nota berstatus sudah_transfer wajib punya bukti",
    purchases.filter((x) => x.status_approval === "sudah_transfer" && !x.bukti_transfer),
    (x) => nama(x) + ": tanpa bukti transfer")
  periksa("nota disetujui wajib punya nomor nota",
    purchases.filter((x) => ["approved", "sudah_transfer"].includes(x.status_approval) && !x.nomor_nota),
    (x) => x.id.slice(0, 8) + " [" + x.status_approval + "]")
  periksa("status nota dikenali",
    purchases.filter((x) => !["menunggu_verifikasi", "menunggu_approval_harga", "approved", "sudah_transfer", "dibatalkan"].includes(x.status_approval)),
    (x) => x.id.slice(0, 8) + ": " + x.status_approval)

  log("\nRINGKASAN: " + (temuan === 0 ? "tidak ada pelanggaran" : temuan + " jenis pelanggaran"))
  return { temuan, ringkasTemuan, jumlahNota: purchases.length, jumlahKasbon: dps.length }
}

if (process.argv[1] && process.argv[1].endsWith("audit-data.mjs")) {
  const p = new PrismaClient()
  const hasil = await auditData(p)
  await p.$disconnect()
  process.exit(hasil.temuan === 0 ? 0 : 1)
}
