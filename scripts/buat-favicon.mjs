/**
 * Membangkitkan ikon tab peramban dari lambang PT.
 *
 * Jalur vektor lambangnya sudah ada satu-satunya di
 * src/lib/agpLogoPath.ts dan dipakai AgpLogo di layar. Berkas ini
 * MEMBACA dari sana, bukan menyalin jalurnya, supaya kalau logonya
 * suatu saat diganti tidak ada versi kedua yang diam-diam tertinggal.
 *
 * Keluarannya dua:
 *   src/app/icon.svg   dipakai peramban modern, tajam di ukuran apa pun
 *   src/app/favicon.ico dipakai peramban lama dan pintasan Windows
 *
 * Jalankan ulang dengan: npm run buat:favicon
 */

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const AKAR = join(dirname(fileURLToPath(import.meta.url)), "..")

// ── Baca lambangnya dari satu-satunya sumber ────────────────────────
//
// agpLogoPath.ts berkas TypeScript, jadi tidak bisa langsung diimpor
// Node tanpa perkakas tambahan. Yang dibutuhkan cuma lima nilai
// konstanta, dan semuanya literal, jadi diambil apa adanya dari teksnya.
const sumber = readFileSync(join(AKAR, "src/lib/agpLogoPath.ts"), "utf8")

const ambilTeks = (nama) => {
  const cocok = sumber.match(new RegExp(`export const ${nama} =\\s*\\n?\\s*"([^"]*)"`))
  if (!cocok) throw new Error(`Tidak menemukan ${nama} di agpLogoPath.ts`)
  return cocok[1]
}
const ambilAngka = (nama) => {
  const cocok = sumber.match(new RegExp(`export const ${nama} = (\\d+)`))
  if (!cocok) throw new Error(`Tidak menemukan ${nama} di agpLogoPath.ts`)
  return Number(cocok[1])
}

const DAUN = ambilTeks("DAUN")
const GELAP = ambilTeks("GELAP")
const WARNA_DAUN = ambilTeks("WARNA_DAUN")
const WARNA_GELAP = ambilTeks("WARNA_GELAP")
const LEBAR_VB = ambilAngka("LEBAR_VB")
const TINGGI_VB = ambilAngka("TINGGI_VB")

// Bentuk aslinya digambar dalam ruang terbalik dan sepuluh kali lebih
// besar, sama seperti yang dilakukan AgpLogo sebelum menggambar.
const keDalam = `translate(0 ${TINGGI_VB}) scale(0.1 -0.1)`

const isiLogo = `<g transform="${keDalam}">
      <path fill="${WARNA_DAUN}" d="${DAUN}"/>
      <path fill="${WARNA_GELAP}" d="${GELAP}"/>
    </g>`

const { chromium } = await import("playwright")
const peramban = await chromium.launch()
const laman = await peramban.newPage()

// ── Ukur batas tinta sebenarnya ─────────────────────────────────────
//
// Kotak gambar aslinya 725 x 520, tapi lambangnya tidak mengisi seluruh
// kotak itu. Kalau kotaknya dipakai apa adanya, sisa ruang kosong ikut
// terbawa dan lambangnya menyusut -- di 16 piksel jadi tidak terbaca.
// Batasnya diukur langsung lewat getBBox supaya angkanya tidak ditebak,
// dan tetap benar seandainya logonya suatu saat diganti.
await laman.setContent(
  `<svg id="ukur" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LEBAR_VB} ${TINGGI_VB}"><g id="isi">${isiLogo}</g></svg>`,
  { waitUntil: "load" },
)
const kotak = await laman.evaluate(() => {
  const { x, y, width, height } = document.getElementById("isi").getBBox()
  return { x, y, width, height }
})
console.log(
  "batas tinta:",
  `${kotak.width.toFixed(1)} x ${kotak.height.toFixed(1)}`,
  "dari kotak",
  `${LEBAR_VB} x ${TINGGI_VB}`,
)

// ── Susun SVG persegi ───────────────────────────────────────────────
//
// Ikon tab selalu persegi, sedangkan lambangnya tidak. Sisi persegi
// diambil dari sisi terpanjang tinta, lalu tintanya ditaruh di tengah.
const JARAK_TEPI = 0.04 // bagian dari sisi
const sisiTinta = Math.max(kotak.width, kotak.height)
const sisi = sisiTinta / (1 - JARAK_TEPI * 2)
const vbX = kotak.x + kotak.width / 2 - sisi / 2
const vbY = kotak.y + kotak.height / 2 - sisi / 2

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX.toFixed(2)} ${vbY.toFixed(2)} ${sisi.toFixed(2)} ${sisi.toFixed(2)}">
  <!-- Dibangkitkan oleh scripts/buat-favicon.mjs dari src/lib/agpLogoPath.ts.
       Jangan disunting langsung: jalankan ulang npm run buat:favicon. -->
  ${isiLogo}
</svg>
`

writeFileSync(join(AKAR, "src/app/icon.svg"), svg, "utf8")
console.log("icon.svg ditulis,", (svg.length / 1024).toFixed(1), "KB")

// ── Gambar ke PNG lalu bungkus jadi ICO ─────────────────────────────
//
// Peramban lama dan pintasan Windows masih meminta /favicon.ico. Sejak
// Windows Vista, berkas ICO boleh memuat PNG apa adanya, jadi tidak
// perlu penyandi bitmap tersendiri: cukup tempelkan PNG-nya ke dalam
// bingkai direktori ICO.
await laman.setContent(
  `<style>html,body{margin:0;background:transparent}</style>${svg}`,
  { waitUntil: "load" },
)

const UKURAN = [16, 32, 48, 64, 128, 256]
const gambar = []
for (const n of UKURAN) {
  await laman.setViewportSize({ width: n, height: n })
  await laman.evaluate((n) => {
    const s = document.querySelector("svg")
    s.setAttribute("width", n)
    s.setAttribute("height", n)
  }, n)
  gambar.push(await laman.screenshot({ omitBackground: true, type: "png" }))
}
await peramban.close()

const kepala = Buffer.alloc(6)
kepala.writeUInt16LE(0, 0) // cadangan, selalu nol
kepala.writeUInt16LE(1, 2) // jenis 1 = ikon
kepala.writeUInt16LE(UKURAN.length, 4)

let awalData = 6 + 16 * UKURAN.length
const direktori = []
for (let i = 0; i < UKURAN.length; i++) {
  const n = UKURAN[i]
  const d = Buffer.alloc(16)
  // Sisi 256 ditulis sebagai 0; bidangnya cuma satu bita.
  d.writeUInt8(n >= 256 ? 0 : n, 0)
  d.writeUInt8(n >= 256 ? 0 : n, 1)
  d.writeUInt8(0, 2) // jumlah warna palet, 0 = bukan berpalet
  d.writeUInt8(0, 3) // cadangan
  d.writeUInt16LE(1, 4) // bidang warna
  d.writeUInt16LE(32, 6) // bit per piksel
  d.writeUInt32LE(gambar[i].length, 8)
  d.writeUInt32LE(awalData, 12)
  awalData += gambar[i].length
  direktori.push(d)
}

const ico = Buffer.concat([kepala, ...direktori, ...gambar])
writeFileSync(join(AKAR, "src/app/favicon.ico"), ico)
console.log("favicon.ico ditulis,", (ico.length / 1024).toFixed(1), "KB,", UKURAN.length, "ukuran")
