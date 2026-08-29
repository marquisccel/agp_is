/**
 * PENGISI DATA DEMO
 *
 *   node scripts/isi-demo.mjs --saya-yakin
 *
 * Mengisi basis data dengan operasi dua bulan yang lengkap dan masuk akal,
 * supaya setiap layar punya isi saat ditunjukkan ke orang lain.
 *
 * ── Kenapa bukan seed.js ──────────────────────────────────────────────
 *
 * seed.js membuat gudang, akun, lapak, dan harga standar, tapi TIDAK satu
 * pun transaksi. Akibatnya sistem yang diisi seed.js terlihat seperti baru
 * dipasang: Top 10 Lapak kosong, Aktivitas Terbaru kosong, seluruh laporan
 * nol, Analisis Susut nol, dan grade tiap lapak "Belum ada data".
 *
 * Untuk demo, layar kosong justru menyembunyikan apa yang mau ditunjukkan.
 *
 * ── Datanya sengaja saling konsisten ──────────────────────────────────
 *
 * Angka acak akan langsung terlihat palsu di layar analitik: susut bisa
 * negatif, total nota tidak sama dengan jumlah itemnya, dan persentase
 * pencapaian target melompat-lompat. Di sini setiap angka diturunkan dari
 * angka sebelumnya:
 *
 *   subtotal item      = berat_final_item x harga_per_kg
 *   nilai sebelum retur= jumlah seluruh subtotal
 *   nilai setelah retur= sebelum retur - retur - potongan
 *   total dibayar      = setelah retur - kasbon yang dipakai
 *   berat gudang       = jumlah berat_final_item seluruh item
 *
 * Susut dibuat dari selisih timbangan lapak dan gudang, dengan sebagian
 * kecil transaksi sengaja diberi selisih besar supaya halaman Analisis
 * Susut punya sesuatu untuk ditunjuk.
 *
 * ── Penjagaan ─────────────────────────────────────────────────────────
 *
 * Skrip ini MENGHAPUS seluruh isi basis data sebelum mengisi ulang. Karena
 * itu ia menolak berjalan tanpa --saya-yakin, dan selalu mencetak alamat
 * basis data yang akan diisi supaya tidak ada yang keliru sasaran.
 */

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const YAKIN = process.argv.includes("--saya-yakin")

/** Angka acak yang bisa diulang, supaya demo yang sama menghasilkan isi yang sama. */
let benih = 20260829
function acak() {
  benih = (benih * 1103515245 + 12345) & 0x7fffffff
  return benih / 0x7fffffff
}
const antara = (a, b) => a + acak() * (b - a)
const bulat = (a, b) => Math.floor(antara(a, b + 1))
const pilih = (arr) => arr[Math.floor(acak() * arr.length)]

const HARGA_STANDAR = {
  "Bening FM": 12000, "BM FM": 10500, "Mix FM": 9000, "Bening": 11000,
  "BM": 9500, "Mix": 8000, "Karung": 3500, "Warna": 7000,
  "Tutup HD": 6000, "Kotor": 4000, "Grade B": 5500, "Bocil": 4500,
  "Grade C": 4200, "Saos Kecap": 3800, "Galon": 6500, "PK": 5000,
}
/** SKU yang benar-benar sering dibeli; sisanya jarang muncul di nota. */
const SKU_SERING = ["Bening", "BM", "Mix", "Warna", "Tutup HD", "Bening FM", "BM FM"]

const GUDANG = [
  { nama: "Kediri", lokasi: "Jl. Raya Kediri No. 1" },
  { nama: "Madiun", lokasi: "Jl. Raya Madiun No. 2" },
  { nama: "Malang", lokasi: "Jl. Raya Malang No. 3" },
]

/**
 * `mutu` menentukan seberapa sering lapak itu bermasalah, supaya demonya
 * bercerita alih-alih menampilkan sembilan lapak yang sama bagusnya:
 *
 *   bagus      susut kecil, harga selalu di bawah standar  -> grade A
 *   biasa      sesekali meleset                            -> grade B
 *   bermasalah susut besar dan sering melebihi standar      -> grade C
 *   baru       belum pernah bertransaksi                    -> status merah,
 *              grade "belum dinilai", dan koordinat kosong
 *
 * Yang terakhir penting: tanpanya, filter "Belum aktif" dan "Belum ada
 * koordinat" di Data Lapak selalu nol dan terlihat seperti tidak berfungsi.
 */
const LAPAK = [
  { mutu: "bagus", nama: "Lapak Sumber Rejeki", gudang: "Kediri", target: 9000, wa: "081234567801", bank: "BCA", rek: "1234567801", an: "Agus Santoso", lat: -7.8166, lng: 112.0114 },
  { mutu: "bermasalah", nama: "Lapak Barokah Jaya", gudang: "Kediri", target: 6000, wa: "081234567802", bank: "BRI", rek: "1234567802", an: "Bambang Wijaya" },
  { mutu: "biasa", nama: "Lapak Mulya Plastik", gudang: "Kediri", target: 4000, wa: "081234567803", bank: "Mandiri", rek: "1234567803", an: "Cahyo Nugroho", lat: -7.8480, lng: 112.0178 },
  { mutu: "bagus", nama: "Lapak Sinar Abadi", gudang: "Madiun", target: 11000, wa: "081234567804", bank: "BCA", rek: "1234567804", an: "Dian Permata", lat: -7.6298, lng: 111.5239 },
  { mutu: "biasa", nama: "Lapak Tunas Muda", gudang: "Madiun", target: 7500, wa: "081234567805", bank: "BNI", rek: "1234567805", an: "Eko Prasetyo" },
  { mutu: "bermasalah", nama: "Lapak Karya Mandiri", gudang: "Madiun", target: 3000, wa: "081234567806", bank: "BRI", rek: "1234567806", an: "Fitri Handayani" },
  { mutu: "bagus", nama: "Lapak Amanah Sejahtera", gudang: "Malang", target: 10000, wa: "081234567807", bank: "Mandiri", rek: "1234567807", an: "Gunawan Saputra", lat: -7.9666, lng: 112.6326 },
  { mutu: "biasa", nama: "Lapak Berkah Plastik", gudang: "Malang", target: 5500, wa: "081234567808", bank: "BCA", rek: "1234567808", an: "Hendra Kusuma" },
  { mutu: "biasa", nama: "Lapak Maju Bersama", gudang: "Malang", target: 2500, wa: "081234567809", bank: "BNI", rek: "1234567809", an: "Indah Lestari" },
  { mutu: "baru", nama: "Lapak Harapan Baru", gudang: "Kediri", target: 3000, wa: "081234567810", bank: "BCA", rek: "1234567810", an: "Joko Susilo" },
  { mutu: "baru", nama: "Lapak Rezeki Lancar", gudang: "Malang", target: 2000, wa: "081234567811", bank: "BRI", rek: "1234567811", an: "Kartika Sari" },
]

function gagal(pesan) {
  console.error("")
  console.error("GAGAL: " + pesan)
  console.error("")
  process.exit(1)
}

async function main() {
  const alamat = (process.env.DATABASE_URL || "").match(/@([^/?]+)/)
  console.log("")
  console.log("══════════════════════════════════════════════════════════")
  console.log("  PENGISI DATA DEMO")
  console.log("══════════════════════════════════════════════════════════")
  console.log("")
  console.log("  Basis data tujuan : " + (alamat ? alamat[1] : "TIDAK TERBACA"))
  console.log("")
  console.log("  Skrip ini MENGHAPUS seluruh isi basis data di alamat itu,")
  console.log("  lalu menggantinya dengan data contoh.")
  console.log("")

  if (!YAKIN) {
    gagal(
      "berhenti demi keamanan.\n" +
      "\n" +
      "       Pastikan alamat di atas BUKAN basis data produksi, lalu ulangi\n" +
      "       dengan menambahkan --saya-yakin di akhir perintah.",
    )
  }

  // ── Bersihkan ───────────────────────────────────────────────────────
  await prisma.auditLog.deleteMany()
  await prisma.returItem.deleteMany()
  await prisma.purchaseItem.deleteMany()
  await prisma.downPayment.deleteMany()
  await prisma.purchase.deleteMany()
  await prisma.warehouseTarget.deleteMany()
  await prisma.skuPriceStandard.deleteMany()
  await prisma.user.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.warehouse.deleteMany()
  console.log("  isi lama dibersihkan")

  // ── Gudang ──────────────────────────────────────────────────────────
  const gudang = {}
  for (const g of GUDANG) gudang[g.nama] = await prisma.warehouse.create({ data: g })

  // ── Akun ────────────────────────────────────────────────────────────
  // Satu password untuk semua akun demo. Ini basis data berisi data fiktif
  // yang memang dibagikan; password berbeda-beda cuma menyulitkan yang
  // sedang mencoba tanpa menambah perlindungan apa pun.
  const sandi = await bcrypt.hash("demo12345", 10)
  const manager = await prisma.user.create({
    data: { nama: "Budi Santoso", email: "manager@demo.agp", password: sandi, role: "MANAGER" },
  })
  const admin = {}
  const staff = {}
  for (const g of GUDANG) {
    admin[g.nama] = await prisma.user.create({
      data: { nama: `Admin ${g.nama}`, email: `admin.${g.nama.toLowerCase()}@demo.agp`, password: sandi, role: "ADMIN", warehouseId: gudang[g.nama].id },
    })
    staff[g.nama] = await prisma.user.create({
      data: { nama: `Staff ${g.nama}`, email: `staff.${g.nama.toLowerCase()}@demo.agp`, password: sandi, role: "STAFF", warehouseId: gudang[g.nama].id },
    })
  }
  console.log("  7 akun dibuat")

  // ── Harga standar SKU ───────────────────────────────────────────────
  for (const g of GUDANG) {
    for (const [sku, harga] of Object.entries(HARGA_STANDAR)) {
      await prisma.skuPriceStandard.create({
        data: { sku_name: sku, max_price_per_kg: harga, warehouseId: gudang[g.nama].id },
      })
    }
  }
  console.log(`  ${GUDANG.length * Object.keys(HARGA_STANDAR).length} standar harga SKU dibuat`)

  // ── Lapak ───────────────────────────────────────────────────────────
  const lapak = []
  for (const l of LAPAK) {
    lapak.push(await prisma.supplier.create({
      data: {
        nama: l.nama, kontak_wa: l.wa, target_bulanan_kg: l.target,
        nama_bank: l.bank, nomor_rekening: l.rek, atas_nama: l.an,
        latitude: l.lat ?? null, longitude: l.lng ?? null,
        link: l.lat ? `https://maps.google.com/?q=${l.lat},${l.lng}` : null,
        frekuensi_ambilan_mingguan: bulat(1, 3),
        hari_ambilan: pilih(["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]),
        warehouseId: gudang[l.gudang].id,
        transactionStatus: "RED", // dinaikkan ke GREEN oleh transaksi valid di bawah
      },
    }))
  }
  console.log(`  ${lapak.length} lapak dibuat`)

  // ── Target gudang, bulan ini dan bulan lalu ─────────────────────────
  const kini = new Date()
  for (const g of GUDANG) {
    const totalTargetLapak = LAPAK.filter((l) => l.gudang === g.nama).reduce((s, l) => s + l.target, 0)
    for (const geser of [0, 1]) {
      const t = new Date(kini.getFullYear(), kini.getMonth() - geser, 1)
      await prisma.warehouseTarget.create({
        data: {
          warehouseId: gudang[g.nama].id, bulan: t.getMonth() + 1, tahun: t.getFullYear(),
          target_bulanan_pet_final: totalTargetLapak,
          target_mingguan_pet_final: Math.round(totalTargetLapak / 4),
          target_harian_pet_final: Math.round(totalTargetLapak / 24),
          target_bulanan_kg: totalTargetLapak,
          target_mingguan_kg: Math.round(totalTargetLapak / 4),
          target_harian_kg: Math.round(totalTargetLapak / 24),
          updatedByUserId: manager.id,
        },
      })
    }
  }
  console.log(`  ${GUDANG.length * 2} target gudang dibuat`)

  // ── Kasbon ──────────────────────────────────────────────────────────
  const kasbonPerLapak = {}
  const rencanaKasbon = [
    { i: 0, nominal: 15_000_000, status: "approved" },
    { i: 3, nominal: 20_000_000, status: "approved" },
    { i: 6, nominal: 12_000_000, status: "approved" },
    { i: 1, nominal: 8_000_000, status: "menunggu_approval_manager" },
    { i: 4, nominal: 5_000_000, status: "menunggu_approval_admin" },
    { i: 7, nominal: 25_000_000, status: "rejected" },
  ]
  for (const k of rencanaKasbon) {
    const disetujui = k.status === "approved"
    const dp = await prisma.downPayment.create({
      data: {
        supplierId: lapak[k.i].id,
        nominal_diajukan: k.nominal,
        nominal_disetujui: disetujui ? k.nominal : null,
        sisa_dp: disetujui ? k.nominal : null,
        dp_used_amount: 0,
        status_approval: k.status,
        approvedByUserId: disetujui || k.status === "rejected" ? manager.id : null,
        tanggal_permintaan: hariLalu(bulat(20, 50)),
        tanggal_approval: disetujui ? hariLalu(bulat(15, 19)) : null,
        keterangan: disetujui ? "Modal kerja pembelian bulanan" : "Menunggu peninjauan",
      },
    })
    if (disetujui) kasbonPerLapak[lapak[k.i].id] = dp
  }
  console.log(`  ${rencanaKasbon.length} kasbon dibuat`)

  // ── Transaksi ───────────────────────────────────────────────────────
  const RENCANA = [
    ...Array(26).fill("sudah_transfer"),
    ...Array(5).fill("approved"),
    ...Array(4).fill("menunggu_approval_harga"),
    ...Array(4).fill("menunggu_verifikasi"),
    ...Array(2).fill("dibatalkan"),
  ]

  // Indeks lapak yang boleh bertransaksi; yang bermutu "baru" tidak masuk.
  const aktif = LAPAK.map((l, i) => (l.mutu === "baru" ? -1 : i)).filter((i) => i >= 0)
  let nomor = 1
  let jumlahRetur = 0
  let jumlahBelumLunas = 0
  const jejak = []

  for (let n = 0; n < RENCANA.length; n++) {
    const status = RENCANA[n]
    // Lapak bermutu "baru" sengaja dilewati: mereka ada di daftar tapi
    // belum pernah bertransaksi, supaya status merah dan grade "belum
    // dinilai" punya contoh nyata di layar.
    const idx = aktif[n % aktif.length]
    const l = lapak[idx]
    const mutu = LAPAK[idx].mutu
    const namaGudang = LAPAK[idx].gudang
    const w = gudang[namaGudang]
    const tanggal = hariLalu(bulat(1, 55))

    // Item: 1 sampai 3 SKU, harga sedikit di bawah standar. Beberapa nota
    // sengaja melebihi standar supaya alur Approval Harga punya isi dan
    // grade lapaknya ikut turun.
    const peluangLebihi = { bagus: 0, biasa: 0.12, bermasalah: 0.45 }[mutu]
    const lebihiStandar = status === "menunggu_approval_harga" || acak() < peluangLebihi
    const items = []
    const jumlahSku = bulat(1, 3)
    const skuTerpakai = new Set()
    for (let i = 0; i < jumlahSku; i++) {
      let sku = pilih(SKU_SERING)
      while (skuTerpakai.has(sku)) sku = pilih(SKU_SERING)
      skuTerpakai.add(sku)
      const standar = HARGA_STANDAR[sku]
      const harga = lebihiStandar && i === 0
        ? Math.round(standar * antara(1.03, 1.12) / 50) * 50
        : Math.round(standar * antara(0.86, 0.99) / 50) * 50
      const berat = Math.round(antara(300, 2600))
      items.push({ sku_name: sku, spec: pilih(["Grading", "Gabyuk"]), berat_final_item: berat, harga_per_kg: harga, subtotal: berat * harga })
    }

    const beratGudang = items.reduce((s, it) => s + it.berat_final_item, 0)
    // Susut: gudang menimbang lebih ringan daripada lapak. Sebagian kecil
    // dibuat besar supaya halaman Analisis Susut punya kasus untuk ditunjuk.
    // Susut wajar di gudang sungguhan ada di bawah 3 persen. Lapak
    // bermasalah diberi kisaran lebih tinggi supaya halaman Analisis Susut
    // dan grade C punya sebab yang bisa ditunjuk, bukan sekadar angka acak.
    const kisaranSusut = { bagus: [0.001, 0.006], biasa: [0.003, 0.016], bermasalah: [0.02, 0.055] }[mutu]
    const persenSusut = antara(kisaranSusut[0], kisaranSusut[1])
    const beratLapak = Math.round(beratGudang * (1 + persenSusut))
    for (const it of items) it.berat_lapak = Math.round(it.berat_final_item * (1 + persenSusut))

    const sebelumRetur = items.reduce((s, it) => s + it.subtotal, 0)

    // Retur pada sebagian nota: barang tidak sesuai spesifikasi.
    const adaRetur = acak() < 0.18 && status === "sudah_transfer"
    const beratRetur = adaRetur ? Math.round(items[0].berat_final_item * antara(0.03, 0.09)) : 0
    const potonganRetur = adaRetur ? beratRetur * items[0].harga_per_kg : 0

    const potonganKarung = Math.round(antara(0, 12)) * 1000
    const setelahRetur = sebelumRetur - potonganRetur - potonganKarung

    // Kasbon dipotong dari nota kalau lapaknya punya sisa kasbon.
    const dp = kasbonPerLapak[l.id]
    let dipakaiDp = 0
    if (dp && dp.sisa_dp > 0 && status === "sudah_transfer" && acak() < 0.5) {
      dipakaiDp = Math.min(dp.sisa_dp, Math.round(setelahRetur * antara(0.2, 0.6)))
      dp.sisa_dp -= dipakaiDp
      await prisma.downPayment.update({
        where: { id: dp.id },
        data: { sisa_dp: dp.sisa_dp, dp_used_amount: { increment: dipakaiDp } },
      })
    }
    const totalDibayar = setelahRetur - dipakaiDp

    // Sebagian kecil nota dibayar bertahap, supaya kolom termin terbuka dan
    // halaman Transfer Pembayaran punya isi.
    const bertahap = status === "sudah_transfer" && acak() < 0.15
    const persen = bertahap ? pilih([50, 60, 70]) : 100
    const dibayarAwal = Math.round(totalDibayar * persen / 100)
    const belumLunas = totalDibayar - dibayarAwal
    if (bertahap) jumlahBelumLunas++
    if (adaRetur) jumlahRetur++

    const sudahVerifikasi = status !== "menunggu_verifikasi"
    const sudahApproval = ["approved", "sudah_transfer"].includes(status)

    const p = await prisma.purchase.create({
      data: {
        nomor_nota: `AGP/${String(tanggal.getFullYear()).slice(2)}${String(tanggal.getMonth() + 1).padStart(2, "0")}/${String(nomor++).padStart(4, "0")}`,
        tanggal,
        warehouseId: w.id,
        supplierId: l.id,
        userIdStaff: staff[namaGudang].id,
        userIdAdmin: sudahVerifikasi ? admin[namaGudang].id : null,
        approvedByUserId: sudahApproval ? manager.id : null,
        approvedAt: sudahApproval ? new Date(tanggal.getTime() + 864e5) : null,
        metode_pembayaran_terpilih: pilih(["TIMBANGAN_GUDANG", "TIMBANGAN_LAPAK"]),
        jenis_pengambilan: acak() < 0.85 ? pilih(["AMBIL", "KIRIM"]) : null,
        berat_timbangan_lapak: beratLapak,
        berat_timbangan_gudang: sudahVerifikasi ? beratGudang : null,
        berat_final: sudahVerifikasi ? beratGudang : null,
        total_nilai_sebelum_retur: sebelumRetur,
        total_potongan_retur: potonganRetur,
        total_nilai_setelah_retur: setelahRetur,
        potongan_karung: potonganKarung,
        berat_potongan_karung: Math.round(potonganKarung / 1000),
        harga_potongan_karung: 1000,
        dp_yang_digunakan: dipakaiDp,
        total_dibayar: status === "dibatalkan" ? 0 : totalDibayar,
        persentase_pembayaran: persen,
        nominal_pembayaran_awal: dibayarAwal,
        nominal_belum_lunas: belumLunas,
        status_pelunasan: bertahap ? "BELUM_LUNAS" : "LUNAS",
        status_approval: status,
        rejection_reason: status === "dibatalkan" ? "Harga melebihi standar dan lapak menolak penyesuaian" : null,
        bukti_transfer: status === "sudah_transfer" ? `transfer-proofs/demo-${nomor}.jpg` : null,
        tanggal_transfer: status === "sudah_transfer" ? new Date(tanggal.getTime() + 2 * 864e5) : null,
        items: { create: items },
      },
    })

    if (adaRetur) {
      await prisma.returItem.create({
        data: {
          purchaseId: p.id, sku_name: items[0].sku_name, berat_retur: beratRetur,
          potongan_nilai: potonganRetur,
          alasan: pilih(["Bahan tercampur label", "Kadar air tinggi", "Tidak sesuai spesifikasi grading"]),
        },
      })
    }

    // Lapak yang punya transaksi valid berubah jadi hijau, sama seperti
    // yang dilakukan alur sungguhan.
    if (status === "sudah_transfer" && l.transactionStatus !== "GREEN") {
      await prisma.supplier.update({ where: { id: l.id }, data: { transactionStatus: "GREEN" } })
      l.transactionStatus = "GREEN"
      jejak.push({ userId: admin[namaGudang].id, action: "SUPPLIER_STATUS_AUTO_GREEN", table_name: "Supplier", record_id: l.id, createdAt: new Date(tanggal.getTime() + 3600e3) })
    }

    jejak.push({ userId: staff[namaGudang].id, action: "CREATE_DRAFT", table_name: "Purchase", record_id: p.id, createdAt: tanggal })
    if (sudahVerifikasi) jejak.push({ userId: admin[namaGudang].id, action: "ADMIN_DOUBLE_CHECK", table_name: "Purchase", record_id: p.id, createdAt: new Date(tanggal.getTime() + 7200e3) })
    if (sudahApproval) jejak.push({ userId: manager.id, action: "MANAGER_APPROVE_PRICE", table_name: "Purchase", record_id: p.id, createdAt: new Date(tanggal.getTime() + 864e5) })
    if (status === "dibatalkan") jejak.push({ userId: manager.id, action: "MANAGER_REJECT_PRICE", table_name: "Purchase", record_id: p.id, createdAt: new Date(tanggal.getTime() + 864e5) })
    if (status === "sudah_transfer") jejak.push({ userId: admin[namaGudang].id, action: "UPLOAD_TRANSFER_PROOF", table_name: "Purchase", record_id: p.id, createdAt: new Date(tanggal.getTime() + 2 * 864e5) })
    if (bertahap) jejak.push({ userId: admin[namaGudang].id, action: "SETTLE_TERMIN_PARTIAL", table_name: "Purchase", record_id: p.id, createdAt: new Date(tanggal.getTime() + 3 * 864e5) })
  }
  console.log(`  ${RENCANA.length} transaksi dibuat (${jumlahRetur} berretur, ${jumlahBelumLunas} termin terbuka)`)

  // ── Jejak audit ─────────────────────────────────────────────────────
  for (const k of rencanaKasbon) {
    jejak.push({ userId: staff[LAPAK[k.i].gudang].id, action: "REQUEST_DP", table_name: "DownPayment", record_id: lapak[k.i].id, createdAt: hariLalu(bulat(20, 50)) })
    if (k.status === "approved") jejak.push({ userId: manager.id, action: "APPROVE_DP", table_name: "DownPayment", record_id: lapak[k.i].id, createdAt: hariLalu(bulat(15, 19)) })
    if (k.status === "rejected") jejak.push({ userId: manager.id, action: "REJECT_DP", table_name: "DownPayment", record_id: lapak[k.i].id, createdAt: hariLalu(bulat(15, 19)) })
  }
  jejak.push({ userId: manager.id, action: "UPDATE_WAREHOUSE_TARGET", table_name: "WarehouseTarget", record_id: gudang.Kediri.id, createdAt: hariLalu(30) })
  jejak.push({ userId: manager.id, action: "UPDATE_SKU_PRICE_STANDARD", table_name: "SkuPriceStandard", record_id: gudang.Madiun.id, createdAt: hariLalu(22) })

  jejak.sort((a, b) => a.createdAt - b.createdAt)
  for (const j of jejak) await prisma.auditLog.create({ data: j })
  console.log(`  ${jejak.length} catatan audit dibuat`)

  // ── Ringkasan ───────────────────────────────────────────────────────
  const tonase = await prisma.purchaseItem.aggregate({ _sum: { berat_final_item: true } })
  const nilai = await prisma.purchase.aggregate({ _sum: { total_dibayar: true }, where: { status_approval: { in: ["approved", "sudah_transfer"] } } })

  console.log("")
  console.log("══════════════════════════════════════════════════════════")
  console.log("  SELESAI")
  console.log("══════════════════════════════════════════════════════════")
  console.log("")
  console.log(`  Tonase tercatat : ${((tonase._sum.berat_final_item || 0) / 1000).toFixed(1)} ton`)
  console.log(`  Nilai transaksi : Rp ${(nilai._sum.total_dibayar || 0).toLocaleString("id-ID")}`)
  console.log("")
  console.log("  AKUN DEMO, password semuanya: demo12345")
  console.log("")
  console.log("    manager@demo.agp        Manager, seluruh gudang")
  console.log("    admin.kediri@demo.agp   Admin Kediri")
  console.log("    admin.madiun@demo.agp   Admin Madiun")
  console.log("    admin.malang@demo.agp   Admin Malang")
  console.log("    staff.kediri@demo.agp   Staff Kediri")
  console.log("    staff.madiun@demo.agp   Staff Madiun")
  console.log("    staff.malang@demo.agp   Staff Malang")
  console.log("")
  console.log("  Bukti transfer menunjuk berkas yang tidak ada di Object")
  console.log("  Storage. Itu disengaja: unggahan sungguhan tidak bisa dibuat")
  console.log("  dari skrip, dan tautannya hanya akan gagal saat dibuka.")
  console.log("")
}

function hariLalu(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(bulat(7, 16), bulat(0, 59), 0, 0)
  return d
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
