"use client"

import { useRef, useState } from "react"
import { Download, FlaskConical, Play, Square } from "lucide-react"
import {
  jalankanPerlakuan,
  siapkanWasm,
  unggahTerukur,
  NAMA_PERLAKUAN,
  type Perlakuan,
} from "@/lib/kompresiRiset"
import { pesanError } from "@/lib/pesanError"
import { buatZip, type BerkasZip } from "@/lib/zipSederhana"

const PERLAKUAN: Perlakuan[] = ["tanpa", "canvas", "wasm"]

type Baris = {
  waktu: string
  berkas: string
  ukuranAsli: number
  lebar: number
  tinggi: number
  perlakuan: Perlakuan
  kualitas: number
  titik: string
  ulangan: number
  kondisi: string
  ukuranHasil: number
  msDekode: number
  msEncode: number
  msKompresi: number
  msUnggah: number
  msServer: number
  msTotal: number
  status: number
}

const KOLOM: (keyof Baris)[] = [
  "waktu", "berkas", "ukuranAsli", "lebar", "tinggi", "perlakuan", "kualitas",
  "titik", "ulangan", "kondisi", "ukuranHasil", "msDekode", "msEncode", "msKompresi",
  "msUnggah", "msServer", "msTotal", "status",
]

/**
 * Mengacak urutan perlakuan dalam satu putaran.
 *
 * Ini bukan hiasan metodologi. Kalau ketiga perlakuan dijalankan berurutan
 * tetap, misalnya semua tanpa kompresi dulu baru semua Canvas, lalu
 * kualitas jaringan berubah di tengah sesi, perubahan jaringan itu akan
 * tercatat sebagai perbedaan antarperlakuan. Dengan urutan diacak tiap
 * putaran, penurunan jaringan tersebar rata ke semua perlakuan.
 */
function acak<T>(daftar: T[]): T[] {
  const salinan = [...daftar]
  for (let i = salinan.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[salinan[i], salinan[j]] = [salinan[j], salinan[i]]
  }
  return salinan
}

function fmtKb(byte: number) {
  return `${(byte / 1024).toFixed(0)} KB`
}

export default function RisetKompresiClient() {
  const [berkas, setBerkas] = useState<File[]>([])
  const [kualitasCanvas, setKualitasCanvas] = useState(0.8)
  const [kualitasWasm, setKualitasWasm] = useState(0.8)
  const [ulangan, setUlangan] = useState(5)
  const [kondisi, setKondisi] = useState("normal")
  const [titik, setTitik] = useState("")
  const [simpan, setSimpan] = useState(false)
  const [unduhHasil, setUnduhHasil] = useState(false)
  const [petaTeks, setPetaTeks] = useState("")
  const [sapuMin, setSapuMin] = useState(30)
  const [sapuMaks, setSapuMaks] = useState(95)
  const [sapuLangkah, setSapuLangkah] = useState(5)

  const [baris, setBaris] = useState<Baris[]>([])
  const [berjalan, setBerjalan] = useState(false)
  const [kemajuan, setKemajuan] = useState({ selesai: 0, total: 0 })
  const [galat, setGalat] = useState("")
  const berhenti = useRef(false)

  const totalLangkah = berkas.length * PERLAKUAN.length * ulangan

  /**
   * Kualitas per pendekatan, dan kalau ada, per berkas.
   *
   * Peta kualitas berasal dari kalibrasi SSIM. Nilainya berbeda antar
   * berkas karena citra yang berbeda menuntut kualitas berbeda untuk
   * mencapai SSIM yang sama, dan justru itu yang membuat SSIM benar-benar
   * terkendali. Satu angka untuk semua berkas hanya menyamakan parameter,
   * bukan menyamakan kualitasnya.
   */
  const bacaPeta = (): Record<string, Record<string, number>> => {
    if (!petaTeks.trim()) return {}
    try {
      return JSON.parse(petaTeks)
    } catch {
      return {}
    }
  }

  const kualitasUntuk = (p: Perlakuan, namaBerkas: string) => {
    if (p === "tanpa") return 1
    const dariPeta = bacaPeta()?.[p]?.[namaBerkas]
    if (typeof dariPeta === "number" && dariPeta > 0) return dariPeta / 100
    return p === "canvas" ? kualitasCanvas : kualitasWasm
  }

  const jalankan = async () => {
    if (berkas.length === 0) {
      setGalat("Pilih dulu berkas gambar yang akan diuji.")
      return
    }
    setGalat("")
    setBerjalan(true)
    berhenti.current = false
    setKemajuan({ selesai: 0, total: totalLangkah })

    const hasil: Baris[] = []

    try {
      // Modul wasm disiapkan sebelum pengukuran dimulai supaya waktu
      // pemuatannya tidak terhitung sebagai waktu encoding pada putaran
      // pertama.
      await siapkanWasm()

      for (let putaran = 1; putaran <= ulangan; putaran++) {
        for (const f of berkas) {
          for (const perlakuan of acak(PERLAKUAN)) {
            if (berhenti.current) throw new Error("Dihentikan pengguna")

            const kualitas = kualitasUntuk(perlakuan, f.name)
            const kompresi = await jalankanPerlakuan(perlakuan, f, kualitas)
            const namaKirim = `${perlakuan}-q${Math.round(kualitas * 100)}-p${putaran}-${f.name}`
            const unggah = await unggahTerukur(kompresi.blob, namaKirim, simpan)

            if (unduhHasil && perlakuan !== "tanpa" && putaran === 1) {
              // Hanya putaran pertama yang diunduh. Berkas hasil dibutuhkan
              // untuk menghitung SSIM di luar peramban, dan hasil putaran
              // berikutnya identik karena masukan dan parameternya sama.
              const url = URL.createObjectURL(kompresi.blob)
              const a = document.createElement("a")
              a.href = url
              a.download = namaKirim.replace(/\.[^.]+$/, "") + ".jpg"
              a.click()
              URL.revokeObjectURL(url)
            }

            const msKompresi = kompresi.msDekode + kompresi.msEncode
            hasil.push({
              waktu: new Date().toISOString(),
              berkas: f.name,
              ukuranAsli: f.size,
              lebar: kompresi.lebar,
              tinggi: kompresi.tinggi,
              perlakuan,
              kualitas: Math.round(kualitas * 100),
              titik,
              ulangan: putaran,
              kondisi,
              ukuranHasil: kompresi.blob.size,
              msDekode: Number(kompresi.msDekode.toFixed(2)),
              msEncode: Number(kompresi.msEncode.toFixed(2)),
              msKompresi: Number(msKompresi.toFixed(2)),
              msUnggah: Number(unggah.msUnggah.toFixed(2)),
              msServer: Number(unggah.msServer.toFixed(2)),
              msTotal: Number((msKompresi + unggah.msUnggah).toFixed(2)),
              status: unggah.status,
            })

            setBaris([...hasil])
            setKemajuan((k) => ({ ...k, selesai: k.selesai + 1 }))
          }
        }
      }
    } catch (e) {
      setGalat(pesanError(e))
    } finally {
      setBerjalan(false)
    }
  }

  /**
   * Kalibrasi: menyapu tingkat kualitas, lalu membungkus seluruh hasilnya
   * beserta citra aslinya jadi satu berkas zip.
   *
   * Kompresinya harus dikerjakan DI SINI, bukan di skrip Python, karena
   * yang dibandingkan penelitian adalah encoder bawaan peramban dan
   * MozJPEG. Encoder JPEG milik pustaka Python berbeda dari keduanya, jadi
   * kalibrasi di sana akan mengalibrasi encoder yang tidak pernah dipakai.
   * Python hanya kebagian menghitung SSIM, dan untuk itu ia cukup menerima
   * berkas hasilnya.
   *
   * Citra asli ikut dimasukkan ke zip supaya perhitungan SSIM membandingkan
   * pasangan yang benar tanpa mengandalkan penamaan berkas di dua tempat
   * berbeda.
   */
  const kalibrasi = async () => {
    if (berkas.length === 0) {
      setGalat("Pilih dulu berkas gambar yang akan dikalibrasi.")
      return
    }
    if (sapuLangkah < 1 || sapuMin >= sapuMaks) {
      setGalat("Rentang sapuan kualitas tidak masuk akal.")
      return
    }

    setGalat("")
    setBerjalan(true)
    berhenti.current = false

    const tingkat: number[] = []
    for (let q = sapuMin; q <= sapuMaks; q += sapuLangkah) tingkat.push(q)

    setKemajuan({ selesai: 0, total: berkas.length * tingkat.length * 2 })

    try {
      await siapkanWasm()
      const isiZip: BerkasZip[] = berkas.map((f) => ({ nama: `asli/${f.name}`, blob: f }))

      for (const f of berkas) {
        for (const perlakuan of ["canvas", "wasm"] as Perlakuan[]) {
          for (const q of tingkat) {
            if (berhenti.current) throw new Error("Dihentikan pengguna")
            const hasil = await jalankanPerlakuan(perlakuan, f, q / 100)
            isiZip.push({
              nama: `${perlakuan}/q${String(q).padStart(2, "0")}__${f.name.replace(/.[^.]+$/, "")}.jpg`,
              blob: hasil.blob,
            })
            setKemajuan((k) => ({ ...k, selesai: k.selesai + 1 }))
          }
        }
      }

      const zip = await buatZip(isiZip)
      const url = URL.createObjectURL(zip)
      const a = document.createElement("a")
      a.href = url
      a.download = `kalibrasi-ssim-${new Date().toISOString().slice(0, 10)}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setGalat(pesanError(e))
    } finally {
      setBerjalan(false)
    }
  }

  const unduhCsv = () => {
    const isi = [
      KOLOM.join(","),
      ...baris.map((b) => KOLOM.map((k) => b[k]).join(",")),
    ].join("\n")

    const url = URL.createObjectURL(new Blob([isi], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `pengukuran-kompresi-${kondisi}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <section className="section section-body space-y-5">
        <div>
          <span className="field-label">Berkas uji</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setBerkas(Array.from(e.target.files || []))}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[color:var(--brand)] file:px-4 file:py-2 file:text-xs file:font-bold file:text-white"
          />
          <p className="mt-1.5 text-[11px]" style={{ color: "var(--muted-faint)" }}>
            {berkas.length > 0
              ? `${berkas.length} berkas terpilih, total ${fmtKb(berkas.reduce((s, f) => s + f.size, 0))}`
              : "Pakai foto nota yang diambil dengan kamera telepon genggam, bukan gambar contoh."}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="space-y-1.5">
            <span className="field-label">Kualitas Canvas</span>
            <input
              type="number" min={1} max={100} step={1}
              value={Math.round(kualitasCanvas * 100)}
              onChange={(e) => setKualitasCanvas(Number(e.target.value) / 100)}
              className="field-input"
            />
          </label>
          <label className="space-y-1.5">
            <span className="field-label">Kualitas WebAssembly</span>
            <input
              type="number" min={1} max={100} step={1}
              value={Math.round(kualitasWasm * 100)}
              onChange={(e) => setKualitasWasm(Number(e.target.value) / 100)}
              className="field-input"
            />
          </label>
          <label className="space-y-1.5">
            <span className="field-label">Jumlah ulangan</span>
            <input
              type="number" min={1} max={20}
              value={ulangan}
              onChange={(e) => setUlangan(Math.max(1, Number(e.target.value)))}
              className="field-input"
            />
          </label>
          <label className="space-y-1.5">
            <span className="field-label">Titik kerja</span>
            <input
              type="text"
              value={titik}
              onChange={(e) => setTitik(e.target.value)}
              placeholder="t50"
              className="field-input"
            />
          </label>
          <label className="space-y-1.5">
            <span className="field-label">Label kondisi jaringan</span>
            <input
              type="text"
              value={kondisi}
              onChange={(e) => setKondisi(e.target.value)}
              placeholder="normal atau 3g"
              className="field-input"
            />
          </label>
        </div>

        {/* Kedua nilai kualitas sengaja dipisah dan diisi tangan. Angkanya
            berasal dari kalibrasi SSIM yang dikerjakan di luar peramban,
            dan memang tidak sama antara kedua pendekatan justru supaya
            SSIM keduanya setara. */}
        <div className="notice tone-info text-xs leading-5">
          Kedua nilai kualitas seharusnya berasal dari peta kalibrasi, bukan diisi dengan angka
          yang sama. Kualitas 80 pada Canvas dan 80 pada MozJPEG menghasilkan SSIM yang berbeda,
          dan membandingkan keduanya pada angka kualitas yang sama membuat perbandingannya tidak
          setara. Kolom Titik kerja diisi penanda peta yang sedang dipakai, misalnya t50, supaya
          tiap sesi pengukuran dapat dibedakan di CSV. Atur pembatasan jaringan lewat DevTools
          sebelum menekan Jalankan, lalu tuliskan kondisinya pada label di atas.
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
            <input type="checkbox" checked={simpan} onChange={(e) => setSimpan(e.target.checked)} />
            Simpan berkas di penyimpanan objek
          </label>
          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
            <input type="checkbox" checked={unduhHasil} onChange={(e) => setUnduhHasil(e.target.checked)} />
            Unduh hasil kompresi putaran pertama untuk perhitungan SSIM
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t pt-4" style={{ borderColor: "var(--border)" }}>
          {berjalan ? (
            <button
              onClick={() => { berhenti.current = true }}
              className="premium-button btn-netral tone-danger flex items-center gap-2 px-4 py-2.5 text-sm"
            >
              <Square className="h-4 w-4" />
              Hentikan
            </button>
          ) : (
            <button
              onClick={jalankan}
              className="premium-button btn-primer flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold"
            >
              <Play className="h-4 w-4" />
              Jalankan {totalLangkah > 0 ? `${totalLangkah} pengukuran` : "pengukuran"}
            </button>
          )}

          <button
            onClick={unduhCsv}
            disabled={baris.length === 0}
            className="premium-button btn-netral flex items-center gap-2 px-4 py-2.5 text-sm disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Unduh CSV ({baris.length} baris)
          </button>

          {berjalan && (
            <span className="font-mono text-xs tabular-nums" style={{ color: "var(--muted)" }}>
              {kemajuan.selesai} / {kemajuan.total}
            </span>
          )}
        </div>

        {galat && <div className="notice tone-warning text-sm font-semibold">{galat}</div>}
      </section>

      <section className="section section-body space-y-4">
        <div>
          <span className="section-eyebrow">Langkah pertama</span>
          <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Kalibrasi SSIM</h3>
          <p className="mt-1 text-xs leading-5" style={{ color: "var(--muted)" }}>
            Menyapu tingkat kualitas pada kedua pendekatan, lalu mengunduh seluruh hasilnya
            beserta citra asli sebagai satu berkas zip. Ekstrak zip tersebut, jalankan
            scripts/kalibrasi-ssim.py terhadap foldernya, lalu tempelkan peta kualitas yang
            dihasilkannya ke kolom di bawah.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1.5">
            <span className="field-label">Kualitas terendah</span>
            <input type="number" min={1} max={99} value={sapuMin}
              onChange={(e) => setSapuMin(Number(e.target.value))} className="field-input" />
          </label>
          <label className="space-y-1.5">
            <span className="field-label">Kualitas tertinggi</span>
            <input type="number" min={2} max={100} value={sapuMaks}
              onChange={(e) => setSapuMaks(Number(e.target.value))} className="field-input" />
          </label>
          <label className="space-y-1.5">
            <span className="field-label">Langkah</span>
            <input type="number" min={1} max={20} value={sapuLangkah}
              onChange={(e) => setSapuLangkah(Number(e.target.value))} className="field-input" />
          </label>
        </div>

        <button
          onClick={kalibrasi}
          disabled={berjalan}
          className="premium-button btn-netral flex items-center gap-2 px-4 py-2.5 text-sm disabled:opacity-50"
        >
          <FlaskConical className="h-4 w-4" />
          Jalankan sapuan dan unduh zip
        </button>

        <label className="block space-y-1.5 border-t pt-4" style={{ borderColor: "var(--border)" }}>
          <span className="field-label">Peta kualitas hasil kalibrasi (JSON)</span>
          <textarea
            value={petaTeks}
            onChange={(e) => setPetaTeks(e.target.value)}
            rows={5}
            placeholder={'{"canvas":{"nota-01.jpg":78},"wasm":{"nota-01.jpg":64}}'}
            className="field-input font-mono text-xs"
          />
          <span className="block text-[11px]" style={{ color: "var(--muted-faint)" }}>
            Berkas yang namanya ada di peta ini memakai kualitas dari peta. Yang tidak ada
            memakai angka pada kolom di atas.
          </span>
        </label>
      </section>

      {baris.length > 0 && (
        <section className="section overflow-hidden">
          <div className="section-shell-head">
            <div>
              <span className="section-eyebrow">Hasil sementara</span>
              <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>
                Rata-rata per Perlakuan
              </h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="tabel-lembut w-full text-sm">
              <thead>
                <tr>
                  <th className="kolom-kiri">Perlakuan</th>
                  <th className="kolom-kanan">Ukuran rata-rata</th>
                  <th className="kolom-kanan">Kompresi</th>
                  <th className="kolom-kanan">Unggah</th>
                  <th className="kolom-kanan">Total</th>
                  <th className="kolom-tengah">Pengukuran</th>
                </tr>
              </thead>
              <tbody>
                {PERLAKUAN.map((p) => {
                  const isi = baris.filter((b) => b.perlakuan === p)
                  if (isi.length === 0) return null
                  const rerata = (ambil: (b: Baris) => number) =>
                    isi.reduce((s, b) => s + ambil(b), 0) / isi.length
                  return (
                    <tr key={p}>
                      <td className="kolom-kiri font-bold" style={{ color: "var(--foreground)" }}>
                        {NAMA_PERLAKUAN[p]}
                      </td>
                      <td className="kolom-kanan font-mono tabular-nums">{fmtKb(rerata((b) => b.ukuranHasil))}</td>
                      <td className="kolom-kanan font-mono tabular-nums">{rerata((b) => b.msKompresi).toFixed(0)} ms</td>
                      <td className="kolom-kanan font-mono tabular-nums">{rerata((b) => b.msUnggah).toFixed(0)} ms</td>
                      <td className="kolom-kanan font-mono font-bold tabular-nums" style={{ color: "var(--foreground)" }}>
                        {rerata((b) => b.msTotal).toFixed(0)} ms
                      </td>
                      <td className="kolom-tengah font-mono text-xs" style={{ color: "var(--muted-faint)" }}>
                        {isi.length}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Rata-rata di sini hanya untuk memantau jalannya pengukuran.
              Analisis sebenarnya memakai CSV, dan sebaiknya memakai median,
              karena satu unggahan yang tersendat menyeret rata-rata jauh
              lebih kuat daripada menyeret median. */}
          <div className="section-body pt-0 text-[11px]" style={{ color: "var(--muted-faint)" }}>
            Angka di atas sekadar pemantau jalannya pengukuran. Untuk analisis, pakai CSV dan
            hitung mediannya.
          </div>
        </section>
      )}
    </div>
  )
}
