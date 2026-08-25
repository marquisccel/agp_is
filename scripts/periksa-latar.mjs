/**
 * Memeriksa mutu foto latar halaman masuk.
 *
 * Panel kirinya selebar layar dikurangi 540 piksel kolom form, dan di
 * layar ber-DPR 2 tiap piksel tampil ditopang dua piksel gambar. Pada
 * layar 1440 itu berarti sekitar 1800 piksel; pada 1920 sekitar 2760.
 * Foto di bawah itu akan dibesarkan paksa dan terlihat lunak, persis
 * yang tidak boleh terjadi di halaman pertama yang dilihat orang.
 *
 * Yang diperiksa dua hal: ukuran piksel, dan kepadatan berkas. Foto
 * beresolusi besar tapi berukuran berkas kecil biasanya hasil
 * pembesaran atau kompresi berlebih -- angkanya lolos, tampilannya
 * tetap lunak.
 *
 * Jalankan: npm run periksa:latar
 */

import { readFileSync, readdirSync } from "node:fs"
import { dirname, extname, join } from "node:path"
import { fileURLToPath } from "node:url"

const AKAR = join(dirname(fileURLToPath(import.meta.url)), "..")
const FOLDER = join(AKAR, "public/latar-login")

/** Lebar terkecil yang masih tajam di layar besar ber-DPR 2. */
const LEBAR_MINIMAL = 1920

/** Bita per piksel di bawah ini menandakan kompresi berlebih. */
const KEPADATAN_MINIMAL = 0.08

/** Baca ukuran dari penanda SOF pada JPEG, atau kepala IHDR pada PNG. */
function ukuranGambar(b) {
  if (b[0] === 0x89 && b[1] === 0x50) {
    return { lebar: b.readUInt32BE(16), tinggi: b.readUInt32BE(20) }
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2
    while (i < b.length - 9) {
      if (b[i] !== 0xff) { i++; continue }
      const m = b[i + 1]
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { tinggi: b.readUInt16BE(i + 5), lebar: b.readUInt16BE(i + 7) }
      }
      i += 2 + b.readUInt16BE(i + 2)
    }
  }
  return null
}

let berkas = []
try {
  berkas = readdirSync(FOLDER).filter((n) => [".jpg", ".jpeg", ".png", ".webp"].includes(extname(n).toLowerCase()))
} catch {
  console.error("Folder public/latar-login/ belum ada.")
  process.exit(1)
}

if (berkas.length === 0) {
  console.error("Belum ada gambar di public/latar-login/.")
  process.exit(1)
}

let bermasalah = 0
console.log(`Memeriksa ${berkas.length} berkas di public/latar-login/\n`)

for (const nama of berkas.sort()) {
  const isi = readFileSync(join(FOLDER, nama))
  const u = ukuranGambar(isi)

  if (!u) {
    console.log(`  [?]  ${nama}  ukurannya tidak terbaca (format tidak dikenali)`)
    bermasalah++
    continue
  }

  const mb = isi.length / 1024 / 1024
  const kepadatan = isi.length / (u.lebar * u.tinggi)
  const catatan = []
  if (u.lebar < LEBAR_MINIMAL) catatan.push(`lebar cuma ${u.lebar}, minimal ${LEBAR_MINIMAL}`)
  if (kepadatan < KEPADATAN_MINIMAL) catatan.push(`kompresi berlebih (${kepadatan.toFixed(3)} bita/piksel)`)

  const tanda = catatan.length ? "[x]" : "[v]"
  if (catatan.length) bermasalah++
  console.log(
    `  ${tanda}  ${nama.padEnd(28)} ${String(u.lebar).padStart(5)} x ${String(u.tinggi).padEnd(5)}  ` +
    `${mb.toFixed(2)} MB` + (catatan.length ? `  <- ${catatan.join("; ")}` : ""),
  )
}

console.log()
if (bermasalah) {
  console.log(`${bermasalah} berkas perlu diganti dengan sumber beresolusi lebih besar.`)
  console.log("Membesarkan berkas yang sudah kecil tidak menambah detail, hanya melunakkan tepinya.")
  process.exit(1)
}
console.log("Semua foto cukup tajam untuk panel halaman masuk.")
