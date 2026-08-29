/**
 * PENGUJI OBJECT STORAGE
 *
 *   npm run periksa:storage
 *
 * Membuktikan bahwa unggahan bukti transfer benar-benar sampai ke Object
 * Storage dan bisa dibaca kembali, SEBELUM aplikasinya dipakai orang.
 *
 * Kenapa perlu diuji tersendiri: kalau kredensialnya salah atau kosong,
 * src/lib/objectStorage.ts diam-diam jatuh ke penyimpanan lokal. Di laptop
 * itu memang disengaja supaya pengembangan tidak terhambat, tapi artinya
 * unggahan tetap TERLIHAT berhasil walau konfigurasinya salah. Di hosting
 * serverless berkasnya lalu hilang pada deploy berikutnya, dan itu baru
 * ketahuan berminggu-minggu kemudian saat ada yang mencari bukti transfer
 * untuk audit.
 *
 * Yang diuji persis jalur yang dipakai aplikasi: putFile lalu getFile dari
 * src/lib/objectStorage.ts, bukan panggilan S3 yang ditulis ulang di sini.
 * Menguji jalur tiruan tidak membuktikan apa pun tentang jalur aslinya.
 */

import { readFileSync } from "node:fs"
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3"

/*
 * .env dibaca sendiri, bukan lewat dotenv. Paket itu tidak terpasang di
 * proyek ini -- Next.js memuat .env sendiri saat aplikasi berjalan, jadi
 * tidak pernah dibutuhkan. Menambah dependensi hanya demi satu skrip
 * pemeriksa tidak sepadan.
 */
const isiEnv = readFileSync(new URL("../.env", import.meta.url), "utf8")
for (const baris of isiEnv.split("\n")) {
  const cocok = baris.replace(/\r$/, "").match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
  if (!cocok) continue
  const nilai = cocok[2].trim().replace(/^["']|["']$/g, "")
  if (!(cocok[1] in process.env)) process.env[cocok[1]] = nilai
}

const { S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION } = process.env

const belum = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"]
  .filter((k) => !process.env[k] || process.env[k].startsWith("TEMPEL-"))

if (belum.length) {
  console.error("")
  console.error("GAGAL: belum terisi -> " + belum.join(", "))
  console.error("")
  console.error("Selama ini kosong, aplikasi menyimpan ke folder lokal dan")
  console.error("unggahan tetap terlihat berhasil. Itu justru yang berbahaya.")
  console.error("")
  process.exit(1)
}

console.log("")
console.log("Menguji Object Storage")
console.log("  endpoint :", S3_ENDPOINT)
console.log("  bucket   :", S3_BUCKET)
console.log("  region   :", S3_REGION)
console.log("")

const { putFile, getFile, isObjectStorageConfigured } = await import("../src/lib/objectStorage.ts")

if (!isObjectStorageConfigured()) {
  console.error("GAGAL: aplikasi menganggap Object Storage BELUM dikonfigurasi.")
  console.error("Artinya ia akan menyimpan ke folder lokal, bukan ke Supabase.")
  process.exit(1)
}

// Nama sengaja jelas-jelas berkas uji supaya kalau penghapusannya gagal,
// yang tertinggal di bucket tidak membingungkan siapa pun yang membukanya.
const kunci = `uji-koneksi/${Date.now()}-periksa-storage.txt`
const isi = Buffer.from(`Berkas uji Object Storage AGP IS. Dibuat ${new Date().toISOString()}.`, "utf8")

let lolos = true
try {
  await putFile(kunci, isi, "text/plain")
  console.log("  [1/3] unggah              : berhasil")
} catch (e) {
  console.log("  [1/3] unggah              : GAGAL -", e.message)
  if (/ACL|AccessControlList|NotImplemented/i.test(e.message || "")) {
    console.log("")
    console.log("        Galatnya menyebut ACL. Supabase Storage tidak menerima")
    console.log("        parameter itu, sedangkan putFile mengirimnya. Beri tahu")
    console.log("        supaya parameternya dilepas -- bucket sudah privat dari")
    console.log("        setelannya sendiri, jadi ACL memang tidak dibutuhkan.")
  }
  process.exit(1)
}

try {
  const kembali = await getFile(kunci)
  if (!kembali) throw new Error("berkasnya tidak ditemukan setelah diunggah")
  if (!kembali.body.equals(isi)) throw new Error("isinya berbeda dari yang diunggah")
  console.log("  [2/3] baca kembali        : berhasil, isi sama persis")
} catch (e) {
  console.log("  [2/3] baca kembali        : GAGAL -", e.message)
  lolos = false
}

try {
  const s3 = new S3Client({
    region: S3_REGION || "us-east-1",
    endpoint: S3_ENDPOINT,
    forcePathStyle: true,
    credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
  })
  await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: kunci }))
  console.log("  [3/3] hapus berkas uji    : berhasil")
} catch (e) {
  console.log("  [3/3] hapus berkas uji    : gagal -", e.message)
  console.log("        Tidak menggagalkan pengujian, tapi hapus manual:", kunci)
}

console.log("")
if (lolos) {
  console.log("LOLOS. Bukti transfer akan tersimpan di Supabase, bukan di")
  console.log("penyimpanan sementara yang hilang tiap deploy.")
} else {
  console.log("BELUM LOLOS. Jangan deploy sebelum bagian ini beres.")
  process.exit(1)
}
console.log("")
