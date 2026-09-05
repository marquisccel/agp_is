/**
 * Pembuat berkas ZIP tanpa kompresi (metode store).
 *
 * Dipakai kalibrasi SSIM. Satu sesi kalibrasi menghasilkan dua pendekatan
 * dikali belasan tingkat kualitas dikali sejumlah citra, yang dengan mudah
 * mencapai ratusan berkas. Mengunduhnya satu per satu berarti ratusan
 * konfirmasi unduhan, dan itu tidak bisa dipakai bekerja.
 *
 * Isinya sengaja TIDAK dikompresi. Yang disimpan sudah berupa JPEG, jadi
 * mengempanya lagi hampir tidak memperkecil apa pun tetapi menuntut
 * pustaka deflate. Metode store membuat berkasnya bisa dirakit dengan
 * beberapa puluh baris dan tetap dikenali semua pembuka ZIP.
 */

const TABEL_CRC = (() => {
  const tabel = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    tabel[i] = c >>> 0
  }
  return tabel
})()

function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = TABEL_CRC[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

type Isian = { nama: string; data: Uint8Array }

export type BerkasZip = { nama: string; blob: Blob }

export async function buatZip(daftar: BerkasZip[]): Promise<Blob> {
  const isian: Isian[] = []
  for (const b of daftar) {
    isian.push({ nama: b.nama, data: new Uint8Array(await b.blob.arrayBuffer()) })
  }

  /*
   * Uint8Array yang berasal dari TextEncoder dan dari arrayBuffer bertipe
   * Uint8Array<ArrayBufferLike>, sedangkan BlobPart menuntut ArrayBuffer.
   * Keduanya sama saja saat program berjalan, dan menyalin isinya hanya
   * demi memuaskan pemeriksa tipe berarti menggandakan seluruh berkas di
   * memori. Penegasan tipe dilakukan sekali, di titik pembuatan Blob.
   */
  const potongan: (ArrayBuffer | Uint8Array)[] = []
  const pusat: Uint8Array[] = []
  let offset = 0

  // Cap waktu MS-DOS. Nilainya tidak dipakai apa pun dalam analisis, jadi
  // dipatok tetap supaya berkas zip dari masukan yang sama selalu identik.
  const waktuDos = 0
  const tanggalDos = (2026 - 1980) << 9 | (1 << 5) | 1

  const enc = new TextEncoder()

  for (const b of isian) {
    const nama = enc.encode(b.nama)
    const crc = crc32(b.data)

    const kepala = new DataView(new ArrayBuffer(30))
    kepala.setUint32(0, 0x04034b50, true)
    kepala.setUint16(4, 20, true)      // versi minimum
    kepala.setUint16(6, 0, true)       // bendera
    kepala.setUint16(8, 0, true)       // metode: store
    kepala.setUint16(10, waktuDos, true)
    kepala.setUint16(12, tanggalDos, true)
    kepala.setUint32(14, crc, true)
    kepala.setUint32(18, b.data.length, true)
    kepala.setUint32(22, b.data.length, true)
    kepala.setUint16(26, nama.length, true)
    kepala.setUint16(28, 0, true)

    potongan.push(kepala.buffer, nama, b.data)

    const cd = new DataView(new ArrayBuffer(46))
    cd.setUint32(0, 0x02014b50, true)
    cd.setUint16(4, 20, true)
    cd.setUint16(6, 20, true)
    cd.setUint16(8, 0, true)
    cd.setUint16(10, 0, true)
    cd.setUint16(12, waktuDos, true)
    cd.setUint16(14, tanggalDos, true)
    cd.setUint32(16, crc, true)
    cd.setUint32(20, b.data.length, true)
    cd.setUint32(24, b.data.length, true)
    cd.setUint16(28, nama.length, true)
    cd.setUint16(30, 0, true)
    cd.setUint16(32, 0, true)
    cd.setUint16(34, 0, true)
    cd.setUint16(36, 0, true)
    cd.setUint32(38, 0, true)
    cd.setUint32(42, offset, true)

    const gabung = new Uint8Array(46 + nama.length)
    gabung.set(new Uint8Array(cd.buffer), 0)
    gabung.set(nama, 46)
    pusat.push(gabung)

    offset += 30 + nama.length + b.data.length
  }

  const ukuranPusat = pusat.reduce((s, p) => s + p.length, 0)
  const akhir = new DataView(new ArrayBuffer(22))
  akhir.setUint32(0, 0x06054b50, true)
  akhir.setUint16(4, 0, true)
  akhir.setUint16(6, 0, true)
  akhir.setUint16(8, isian.length, true)
  akhir.setUint16(10, isian.length, true)
  akhir.setUint32(12, ukuranPusat, true)
  akhir.setUint32(16, offset, true)
  akhir.setUint16(20, 0, true)

  return new Blob([...potongan, ...pusat, akhir.buffer] as BlobPart[], { type: "application/zip" })
}
