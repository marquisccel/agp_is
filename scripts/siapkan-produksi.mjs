/**
 * PENYIAPAN BASIS DATA PRODUKSI
 *
 *   node scripts/siapkan-produksi.mjs
 *
 * Membuat isi minimum yang tidak bisa dibuat lewat antarmuka:
 *
 *   1. Gudang. Tidak ada menu untuk menambah gudang, jadi harus dari sini.
 *   2. SATU akun Manager. Dibutuhkan sebagai akun pertama untuk masuk;
 *      tanpanya tidak ada yang bisa mendaftarkan akun lain, karena
 *      pendaftaran memang sengaja dibatasi hanya untuk Manager.
 *
 * Yang TIDAK dibuat: akun Staff dan Admin, lapak, standar harga SKU, dan
 * target gudang. Semuanya bisa dan sebaiknya diisi Manager lewat menu
 * Master Data, supaya sejak hari pertama isi sistem adalah data sungguhan.
 *
 * ── Kenapa tidak memakai seed.js ──────────────────────────────────────
 *
 * seed.js diawali deleteMany() pada SELURUH tabel. Di laptop itu memang
 * yang diinginkan: mengulang dari awal dengan data contoh yang rapi. Di
 * produksi, menjalankannya berarti menghapus seluruh transaksi, bukti
 * transfer, dan jejak audit yang sudah masuk.
 *
 * Selain itu seed.js membuat tujuh akun @example.com. Akun-akun itu tidak
 * pernah dipakai orang sungguhan, tapi tetap tampil di daftar pengguna dan
 * ikut terbawa selamanya.
 *
 * ── Cara pakai ────────────────────────────────────────────────────────
 *
 * Skrip ini menolak berjalan kalau basis datanya sudah berisi pengguna,
 * supaya tidak bisa dijalankan dua kali tanpa sengaja.
 *
 * Isi tiga nilai berikut di .env sebelum menjalankan (nilainya tidak
 * pernah dicetak ke layar):
 *
 *   MANAGER_NAMA="Nama Manager"
 *   MANAGER_EMAIL="manager@domainperusahaan.com"
 *   MANAGER_PASSWORD="password-kuat-minimal-8-karakter"
 *
 * Sesudah berhasil masuk, Manager sebaiknya langsung mengganti password
 * lewat halaman Pengaturan, lalu HAPUS ketiga nilai itu dari .env.
 */

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

/**
 * Gudang yang dibuat. Ubah daftar ini kalau AGP menambah lokasi.
 * Nama disimpan tanpa kata "Gudang"; kata itu ditambahkan saat tampil
 * lewat namaGudang() di src/lib/namaGudang.ts.
 */
const GUDANG = [
  { nama: "Kediri", lokasi: "" },
  { nama: "Madiun", lokasi: "" },
  { nama: "Malang", lokasi: "" },
]

function gagal(pesan) {
  console.error("")
  console.error("GAGAL: " + pesan)
  console.error("")
  process.exit(1)
}

async function main() {
  const nama = (process.env.MANAGER_NAMA || "").trim()
  const email = (process.env.MANAGER_EMAIL || "").trim().toLowerCase()
  const password = process.env.MANAGER_PASSWORD || ""

  if (!nama || !email || !password) {
    gagal(
      "MANAGER_NAMA, MANAGER_EMAIL, dan MANAGER_PASSWORD belum diisi di .env.\n" +
      "       Lihat keterangan di bagian atas berkas ini.",
    )
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    gagal("MANAGER_EMAIL bukan alamat email yang sah.")
  }
  if (password.length < 8) {
    // Aturannya sama dengan yang dipakai POST /api/users, supaya akun
    // pertama tidak lolos dengan standar yang lebih longgar.
    gagal("MANAGER_PASSWORD minimal 8 karakter.")
  }

  // Penjagaan utama. Kalau sudah ada pengguna, basis data ini bukan basis
  // data kosong, dan menambah Manager kedua secara diam-diam bukan yang
  // diinginkan siapa pun.
  const jumlahPengguna = await prisma.user.count()
  if (jumlahPengguna > 0) {
    gagal(
      `basis data sudah berisi ${jumlahPengguna} pengguna.\n` +
      "       Skrip ini hanya untuk basis data yang benar-benar baru.\n" +
      "       Untuk menambah akun, pakai menu Master Data di aplikasi.",
    )
  }

  console.log("")
  console.log("Menyiapkan basis data produksi.")
  console.log("")

  for (const g of GUDANG) {
    const ada = await prisma.warehouse.findFirst({ where: { nama: g.nama } })
    if (ada) {
      console.log(`  gudang ${g.nama} sudah ada, dilewati`)
      continue
    }
    await prisma.warehouse.create({ data: g })
    console.log(`  gudang ${g.nama} dibuat`)
  }

  await prisma.user.create({
    data: {
      nama,
      email,
      password: await bcrypt.hash(password, 10),
      role: "MANAGER",
      warehouseId: null, // Manager mengawasi seluruh gudang, bukan satu.
    },
  })

  console.log(`  akun Manager dibuat untuk ${email}`)
  console.log("")
  console.log("Selesai. Langkah berikutnya:")
  console.log("")
  console.log("  1. Masuk sebagai Manager, lalu ganti password di Pengaturan")
  console.log("  2. Hapus MANAGER_NAMA, MANAGER_EMAIL, dan MANAGER_PASSWORD dari .env")
  console.log("  3. Daftarkan akun Admin dan Staff lewat Master Data > Pengguna")
  console.log("  4. Isi standar harga SKU lewat Master Data > Harga SKU")
  console.log("")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
