/**
 * Penilaian performa lapak (grade A/B/C).
 *
 * Rumusnya sebelumnya ditulis langsung di dalam komponen, dan begitu ada
 * dua tempat yang memerlukannya, keduanya sudah berbeda: daftar Data Lapak
 * memakai bobot 0,4 kuantitas + 0,4 kualitas + 0,2 harga, sedangkan Detail
 * Lapak memakai 0,5 + 0,5 tanpa komponen harga sama sekali. Satu lapak yang
 * sama bisa tampil sebagai B di satu halaman dan A di halaman lain.
 *
 * Berkas ini jadi satu-satunya sumbernya. Bobot yang dipakai adalah versi
 * daftar Data Lapak (0,4/0,4/0,2), karena itu yang paling lengkap dan yang
 * dipakai Manager untuk menyaring.
 *
 * CATATAN: Detail Lapak belum ikut memakai berkas ini. Menyeragamkannya
 * akan mengubah angka yang sudah dilihat Manager di halaman itu, jadi
 * sebaiknya dilakukan sebagai perubahan tersendiri yang disadari, bukan
 * menumpang di pekerjaan lain.
 */

export type PembelianUntukGrade = {
  warehouseId: string
  berat_timbangan_lapak: number | null
  berat_timbangan_gudang: number | null
  items: {
    berat_final_item: number | null
    harga_per_kg: number
    subtotal: number | null
    sku_name: string
  }[]
}

export type StandarHargaSku = {
  sku_name: string
  warehouseId: string
  max_price_per_kg: number
}

export type Grade = "A" | "B" | "C" | "-"

export type HasilGrade = {
  grade: Grade
  /** Kata pendek yang menyertai huruf, supaya hurufnya tidak perlu dihafal. */
  label: string
  /** Variabel warna CSS. Netral untuk B: "stabil" tidak menuntut tindakan. */
  nada: string
  opi: number
  totalTransaksi: number
  totalBeratGudang: number
  persenTarget: number
  totalSusut: number
  persenSusut: number
  hargaRataRata: number
  jumlahPeringatanHarga: number
}

const BELUM_ADA_DATA: HasilGrade = {
  grade: "-",
  label: "Belum ada data",
  nada: "var(--muted)",
  opi: 0,
  totalTransaksi: 0,
  totalBeratGudang: 0,
  persenTarget: 0,
  totalSusut: 0,
  persenSusut: 0,
  hargaRataRata: 0,
  jumlahPeringatanHarga: 0,
}

export function hitungGradeLapak(
  pembelian: PembelianUntukGrade[],
  targetBulananKg: number,
  standarHarga: StandarHargaSku[],
): HasilGrade {
  const totalTransaksi = pembelian.length
  const totalBeratGudang = pembelian.reduce((s, p) => s + (p.berat_timbangan_gudang || 0), 0)

  // Kuantitas. Kalau lapaknya punya target bulanan, itu yang dipakai.
  // Kalau belum, dipakai tangga tonase supaya lapak tanpa target tidak
  // otomatis bernilai nol.
  let skorKuantitas = 0
  let persenTarget = 0
  if (targetBulananKg > 0) {
    persenTarget = (totalBeratGudang / targetBulananKg) * 100
    skorKuantitas = Math.min(persenTarget, 100)
  } else if (totalBeratGudang >= 5000) skorKuantitas = 100
  else if (totalBeratGudang >= 2000) skorKuantitas = 80
  else if (totalBeratGudang >= 500) skorKuantitas = 60
  else if (totalBeratGudang > 0) skorKuantitas = 40

  // Kualitas diukur dari susut timbangan: berat di gudang lebih ringan
  // daripada di lapak. Selisih ke arah sebaliknya tidak dihitung sebagai
  // susut, karena itu bukan kerugian.
  let totalSusut = 0
  let totalBeratLapak = 0
  for (const p of pembelian) {
    const lapak = p.berat_timbangan_lapak || 0
    const gudang = p.berat_timbangan_gudang || 0
    totalBeratLapak += lapak
    if (gudang - lapak < 0) totalSusut += Math.abs(gudang - lapak)
  }
  const persenSusut = totalBeratLapak > 0 ? (totalSusut / totalBeratLapak) * 100 : 0
  const skorKualitas = totalBeratLapak > 0 ? Math.max(0, 100 - persenSusut * 25) : 100

  // Harga: berapa kali item dibeli di atas standar SKU gudangnya.
  let totalSubtotal = 0
  let totalBeratItem = 0
  let jumlahPeringatanHarga = 0
  for (const p of pembelian) {
    for (const item of p.items) {
      const berat = item.berat_final_item || 0
      totalSubtotal += item.subtotal || berat * item.harga_per_kg || 0
      totalBeratItem += berat
      const std = standarHarga.find((h) => h.sku_name === item.sku_name && h.warehouseId === p.warehouseId)
      if (std && item.harga_per_kg > std.max_price_per_kg) jumlahPeringatanHarga++
    }
  }
  const hargaRataRata = totalBeratItem > 0 ? totalSubtotal / totalBeratItem : 0
  const skorHarga = totalTransaksi > 0 ? Math.max(50, 100 - jumlahPeringatanHarga * 20) : 100

  if (totalTransaksi === 0) {
    return { ...BELUM_ADA_DATA, totalBeratGudang, persenTarget }
  }

  const opi = skorKuantitas * 0.4 + skorKualitas * 0.4 + skorHarga * 0.2

  const { grade, label, nada } =
    opi >= 85
      ? { grade: "A" as const, label: "Bagus", nada: "var(--success)" }
      : opi >= 60
        ? { grade: "B" as const, label: "Stabil", nada: "var(--muted)" }
        : { grade: "C" as const, label: "Evaluasi", nada: "var(--danger)" }

  return {
    grade,
    label,
    nada,
    opi,
    totalTransaksi,
    totalBeratGudang,
    persenTarget,
    totalSusut,
    persenSusut,
    hargaRataRata,
    jumlahPeringatanHarga,
  }
}
