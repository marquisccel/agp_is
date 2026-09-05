/**
 * Tiga perlakuan kompresi yang dibandingkan dalam penelitian, beserta
 * pengukuran waktunya.
 *
 * Berkas ini sengaja dipisah dari komponen tampilan supaya urutan langkah
 * dan titik pengukurannya bisa dibaca tanpa terselip di antara markup, dan
 * supaya perubahan pada tampilan tidak diam-diam menggeser apa yang diukur.
 *
 * ── Titik ukur ────────────────────────────────────────────────────────
 *
 * Waktu kompresi dipecah dua, dan pemisahan ini yang menjawab pertanyaan
 * "kenapa yang satu lebih lambat":
 *
 *   msDekode  membaca berkas jadi piksel. Langkah ini SAMA untuk kedua
 *             pendekatan, jadi selisih di sini bukan milik pendekatannya.
 *   msEncode  mengubah piksel jadi berkas terkompresi. Di sinilah letak
 *             perbedaan mesin encoding-nya.
 *
 * Kalau keduanya digabung jadi satu angka, perbedaan yang sebenarnya
 * berasal dari encoding akan tampak lebih kecil daripada seharusnya,
 * karena tertutup waktu dekode yang sama besar di kedua sisi.
 */

export type Perlakuan = "tanpa" | "canvas" | "wasm"

export const NAMA_PERLAKUAN: Record<Perlakuan, string> = {
  tanpa: "Tanpa kompresi",
  canvas: "Canvas",
  wasm: "WebAssembly",
}

export type HasilKompresi = {
  blob: Blob
  msDekode: number
  msEncode: number
  lebar: number
  tinggi: number
}

/**
 * Membaca berkas jadi piksel mentah.
 *
 * Dimensi aslinya DIPERTAHANKAN. Banyak pustaka kompresi diam-diam
 * mengecilkan dimensi gambar untuk memperkecil berkas, tetapi kalau itu
 * terjadi, SSIM terhadap citra asli tidak lagi sah dihitung karena kedua
 * citra tidak lagi sebanding piksel per piksel.
 */
async function keImageData(berkas: Blob): Promise<{ data: ImageData; kanvas: HTMLCanvasElement }> {
  const bitmap = await createImageBitmap(berkas)
  const kanvas = document.createElement("canvas")
  kanvas.width = bitmap.width
  kanvas.height = bitmap.height

  const ctx = kanvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) throw new Error("Kanvas 2D tidak tersedia pada peramban ini")

  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()

  return { data: ctx.getImageData(0, 0, kanvas.width, kanvas.height), kanvas }
}

/** Perlakuan pembanding dasar: berkas dikirim apa adanya. */
async function tanpaKompresi(berkas: File): Promise<HasilKompresi> {
  const bitmap = await createImageBitmap(berkas)
  const hasil: HasilKompresi = {
    blob: berkas,
    msDekode: 0,
    msEncode: 0,
    lebar: bitmap.width,
    tinggi: bitmap.height,
  }
  bitmap.close()
  return hasil
}

/**
 * Perlakuan pertama: encoder JPEG bawaan peramban lewat Canvas.
 *
 * toBlob menyerahkan pengodean ke peramban, yang memakai encoder sistem
 * dengan tabel kuantisasi standar. Cepat, tetapi tidak mencari susunan
 * koefisien yang lebih hemat.
 */
async function kompresiCanvas(berkas: File, kualitas: number): Promise<HasilKompresi> {
  const t0 = performance.now()
  const { kanvas } = await keImageData(berkas)
  const t1 = performance.now()

  const blob = await new Promise<Blob>((selesai, gagal) => {
    kanvas.toBlob(
      (b) => (b ? selesai(b) : gagal(new Error("Peramban gagal mengodekan kanvas"))),
      "image/jpeg",
      kualitas,
    )
  })
  const t2 = performance.now()

  return {
    blob,
    msDekode: t1 - t0,
    msEncode: t2 - t1,
    lebar: kanvas.width,
    tinggi: kanvas.height,
  }
}

/**
 * Perlakuan kedua: MozJPEG yang dijalankan sebagai modul WebAssembly.
 *
 * Berkas wasm-nya dilayani dari /riset supaya tidak bergantung pada cara
 * bundler menyelesaikan alamat berkas di dalam node_modules, yang berbeda
 * antara mode pengembangan dan hasil build.
 *
 * Modulnya dimuat sekali lalu dipakai berulang. Kalau dimuat ulang tiap
 * kali, waktu penyiapan modul ikut terhitung sebagai waktu encoding dan
 * pengukurannya jadi timpang terhadap Canvas yang encodernya sudah ada di
 * dalam peramban sejak awal.
 */
let siapWasm: Promise<void> | null = null

export function siapkanWasm(): Promise<void> {
  if (!siapWasm) {
    siapWasm = (async () => {
      const { init } = await import("@jsquash/jpeg/encode")
      await init({ locateFile: () => "/riset/mozjpeg_enc.wasm" })
    })()
  }
  return siapWasm
}

async function kompresiWasm(berkas: File, kualitas: number): Promise<HasilKompresi> {
  await siapkanWasm()
  const { default: encode } = await import("@jsquash/jpeg/encode")

  const t0 = performance.now()
  const { data } = await keImageData(berkas)
  const t1 = performance.now()

  const buffer = await encode(data, { quality: Math.round(kualitas * 100) })
  const t2 = performance.now()

  return {
    blob: new Blob([buffer], { type: "image/jpeg" }),
    msDekode: t1 - t0,
    msEncode: t2 - t1,
    lebar: data.width,
    tinggi: data.height,
  }
}

export async function jalankanPerlakuan(
  perlakuan: Perlakuan,
  berkas: File,
  kualitas: number,
): Promise<HasilKompresi> {
  if (perlakuan === "tanpa") return tanpaKompresi(berkas)
  if (perlakuan === "canvas") return kompresiCanvas(berkas, kualitas)
  return kompresiWasm(berkas, kualitas)
}

/**
 * Mengunggah dan mencatat waktunya.
 *
 * Memakai XMLHttpRequest, bukan fetch, karena hanya XHR yang memberi kabar
 * kapan byte terakhir selesai terkirim lewat upload.onloadend. Dengan fetch
 * yang terukur cuma waktu pulang pergi, sehingga waktu kirim tidak bisa
 * dipisahkan dari waktu peladen memproses dan menjawab.
 */
export type HasilUnggah = {
  msUnggah: number
  msPulangPergi: number
  msServer: number
  status: number
}

export function unggahTerukur(blob: Blob, nama: string, simpan: boolean): Promise<HasilUnggah> {
  return new Promise((selesai, gagal) => {
    const form = new FormData()
    form.append("berkas", blob, nama)
    form.append("nama", nama)
    if (simpan) form.append("simpan", "1")

    const xhr = new XMLHttpRequest()
    xhr.open("POST", "/api/riset/unggah")

    const t0 = performance.now()
    let tKirimSelesai = 0

    xhr.upload.onloadend = () => {
      tKirimSelesai = performance.now()
    }

    xhr.onload = () => {
      const t1 = performance.now()
      let msServer = 0
      try {
        msServer = Number(JSON.parse(xhr.responseText)?.msServer) || 0
      } catch {
        // Jawaban yang tidak terbaca tidak menggagalkan pengukuran; waktu
        // peladen sekadar dianggap nol dan itu terlihat di CSV.
      }
      selesai({
        msUnggah: (tKirimSelesai || t1) - t0,
        msPulangPergi: t1 - t0,
        msServer,
        status: xhr.status,
      })
    }

    xhr.onerror = () => gagal(new Error("Pengunggahan gagal pada tingkat jaringan"))
    xhr.ontimeout = () => gagal(new Error("Pengunggahan melewati batas waktu"))

    xhr.send(form)
  })
}
