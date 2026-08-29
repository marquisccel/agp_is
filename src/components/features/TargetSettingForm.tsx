"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, Loader2, Save } from "lucide-react"
import type { Warehouse, WarehouseTarget } from "@prisma/client"
import Link from "next/link"
import ElegantSelect from "@/components/ui/ElegantSelect"
import PageHeader from "@/components/ui/PageHeader"
import { getWorkingDaysInMonth } from "@/lib/workingDays"
import { namaGudang } from "@/lib/namaGudang"

interface TargetValues {
  pet_bulanan: string
  pet_mingguan: string
  pet_harian: string
}

type TargetApiRow = Pick<WarehouseTarget, "warehouseId" | "target_bulanan_pet_final" | "target_mingguan_pet_final" | "target_harian_pet_final" | "updatedAt"> & {
  updatedBy: { nama: string } | null
}

/** Riwayat penetapan target satu gudang, untuk baris di bawah namanya. */
type JejakTarget = { diubahPada: string; oleh: string | null } | null

function fmtTanggalSingkat(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta",
  })
}

const jejakDari = (
  target: { updatedAt: Date | string; updatedBy: { nama: string } | null } | undefined,
): JejakTarget =>
  target ? { diubahPada: new Date(target.updatedAt).toISOString(), oleh: target.updatedBy?.nama ?? null } : null

export default function TargetSettingForm({ warehouses, existingTargets }: { warehouses: Warehouse[]; existingTargets: (WarehouseTarget & { updatedBy: { nama: string } | null })[] }) {
  const router = useRouter()
  const now = new Date()
  const [selectedBulan, setSelectedBulan] = useState<number>(now.getMonth() + 1)
  const [selectedTahun, setSelectedTahun] = useState<number>(now.getFullYear())
  const [saving, setSaving] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({})
  const [errorMap, setErrorMap] = useState<Record<string, string>>({})

  /*
   * Baris di bawah nama gudang. Sebelumnya di sana ada "Target pembelian
   * bahan baku PET Final", yang cuma mengulang judul halaman untuk ketiga
   * kalinya. Dibuang, dan tempatnya jadi kosong.
   *
   * Yang mengisinya sekarang bukan kalimat hiasan, tapi satu-satunya hal
   * yang berbeda antar ketiga kartu dan tidak terbaca dari kolom isian:
   * gudang ini sudah pernah ditetapkan targetnya untuk periode terpilih
   * atau belum, dan oleh siapa. Kolom kosong sendiri ambigu -- bisa berarti
   * belum pernah diisi, bisa juga berarti sengaja disetel nol.
   */
  const [jejak, setJejak] = useState<Record<string, JejakTarget>>(
    Object.fromEntries(
      warehouses.map((warehouse) => [
        warehouse.id,
        jejakDari(
          existingTargets.find(
            (item) => item.warehouseId === warehouse.id && item.bulan === now.getMonth() + 1 && item.tahun === now.getFullYear()
          )
        ),
      ])
    )
  )

  const [values, setValues] = useState<Record<string, TargetValues>>(
    Object.fromEntries(
      warehouses.map((warehouse) => {
        const target = existingTargets.find(
          (item) => item.warehouseId === warehouse.id && item.bulan === now.getMonth() + 1 && item.tahun === now.getFullYear()
        )
        return [
          warehouse.id,
          {
            pet_bulanan: target?.target_bulanan_pet_final && target.target_bulanan_pet_final !== 0 ? (target.target_bulanan_pet_final / 1000).toString() : "",
            pet_mingguan: target?.target_mingguan_pet_final && target.target_mingguan_pet_final !== 0 ? target.target_mingguan_pet_final.toString() : "",
            pet_harian: target?.target_harian_pet_final && target.target_harian_pet_final !== 0 ? target.target_harian_pet_final.toString() : "",
          },
        ]
      })
    )
  )

  /*
   * Dijadikan useCallback supaya bisa dipanggil dua kali: saat periodenya
   * diganti, dan lagi sesudah menyimpan. Yang kedua itu perlu karena baris
   * "terakhir diubah" harus ikut segar -- kalau tidak, Manager baru saja
   * menyimpan tapi barisnya masih berbunyi "belum ditetapkan".
   *
   * `tampilkanMuat` dimatikan saat dipanggil sesudah menyimpan: kartunya
   * sudah menampilkan keadaan tombol "Target tersimpan", dan menyalakan
   * status memuat di atasnya membuat layar berkedip tanpa alasan.
   */
  const muatTarget = useCallback(async (tampilkanMuat = true) => {
      if (tampilkanMuat) setLoading(true)
      try {
        const res = await fetch(`/api/targets?bulan=${selectedBulan}&tahun=${selectedTahun}`)
        if (res.ok) {
          const data: TargetApiRow[] = await res.json()
          const nextValues = Object.fromEntries(
            warehouses.map((warehouse) => {
              const target = data.find((item) => item.warehouseId === warehouse.id)
              return [
                warehouse.id,
                {
                  pet_bulanan: target?.target_bulanan_pet_final && target.target_bulanan_pet_final !== 0 ? (target.target_bulanan_pet_final / 1000).toString() : "",
                  pet_mingguan: target?.target_mingguan_pet_final && target.target_mingguan_pet_final !== 0 ? target.target_mingguan_pet_final.toString() : "",
                  pet_harian: target?.target_harian_pet_final && target.target_harian_pet_final !== 0 ? target.target_harian_pet_final.toString() : "",
                },
              ]
            })
          )
          setValues(nextValues)
          setJejak(
            Object.fromEntries(
              warehouses.map((warehouse) => [
                warehouse.id,
                jejakDari(data.find((item) => item.warehouseId === warehouse.id)),
              ])
            )
          )
        }
      } catch (err) {
        console.error("Gagal mengambil data target:", err)
      } finally {
        if (tampilkanMuat) setLoading(false)
      }
  }, [selectedBulan, selectedTahun, warehouses])

  useEffect(() => {
    muatTarget()
  }, [muatTarget])

  const workingDaysThisMonth = getWorkingDaysInMonth(selectedTahun, selectedBulan)
  const effectiveWeeks = workingDaysThisMonth / 6
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i, 1).toLocaleDateString("id-ID", { month: "long" }),
  }))
  const namaBulan = monthOptions.find((m) => m.value === selectedBulan)?.label ?? ""
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - 2 + i
    return { value: year, label: String(year) }
  })

  const handleBulananChange = (warehouseId: string, valStr: string) => {
    const clean = valStr === "0" ? "" : valStr

    if (clean === "") {
      setValues((prev) => ({
        ...prev,
        [warehouseId]: { ...prev[warehouseId], pet_bulanan: "", pet_mingguan: "", pet_harian: "" },
      }))
      return
    }

    const ton = parseFloat(clean)
    if (isNaN(ton) || ton <= 0) {
      setValues((prev) => ({ ...prev, [warehouseId]: { ...prev[warehouseId], pet_bulanan: clean } }))
      return
    }

    const kg = ton * 1000
    const dailyKg = workingDaysThisMonth > 0 ? Math.round(kg / workingDaysThisMonth) : 0
    const weeklyKg = effectiveWeeks > 0 ? Math.round(kg / effectiveWeeks) : 0
    setValues((prev) => ({
      ...prev,
      [warehouseId]: {
        ...prev[warehouseId],
        pet_bulanan: clean,
        pet_mingguan: weeklyKg.toString(),
        pet_harian: dailyKg.toString(),
      },
    }))
  }

  const handleSave = async (warehouseId: string) => {
    setSaving(warehouseId)
    setErrorMap((prev) => ({ ...prev, [warehouseId]: "" }))
    try {
      const value = values[warehouseId]
      const petBulanKg = value.pet_bulanan ? parseFloat(value.pet_bulanan) * 1000 : 0
      const petMingguan = value.pet_mingguan ? parseFloat(value.pet_mingguan) : 0
      const petHarian = value.pet_harian ? parseFloat(value.pet_harian) : 0

      const res = await fetch("/api/targets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId,
          bulan: selectedBulan,
          tahun: selectedTahun,
          target_harian_pet_final: petHarian,
          target_mingguan_pet_final: petMingguan,
          target_bulanan_pet_final: petBulanKg,
          target_harian_kg: petHarian,
          target_mingguan_kg: petMingguan,
          target_bulanan_kg: petBulanKg,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Server error: ${res.status}`)
      }

      setSavedMap((prev) => ({ ...prev, [warehouseId]: true }))
      setTimeout(() => setSavedMap((prev) => ({ ...prev, [warehouseId]: false })), 2400)
      // Tanpa ini barisnya masih berbunyi "belum ditetapkan" padahal baru
      // saja disimpan; router.refresh() sendiri tidak menolong karena
      // nilainya dipegang state komponen, bukan langsung dari prop.
      await muatTarget(false)
      router.refresh()
    } catch (error: any) {
      setErrorMap((prev) => ({ ...prev, [warehouseId]: error.message || "Gagal menyimpan. Coba lagi." }))
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Dulu ini kartu tersendiri berjudul "PERIODE TARGET": sebuah kotak
          selebar layar yang isinya satu baris pengantar dan dua dropdown,
          dengan jumlah hari kerja menggantung sendirian di pojok kanan
          bawah. Kotaknya tidak membawa apa pun yang tidak muat di kepala
          halaman, jadi dibuang seluruhnya dan isinya naik ke sini. */}
      <PageHeader
        eyebrow="Rencana kinerja"
        title="Setting Target Gudang"
        description={(
          <>
            Target pembelian bahan baku{" "}
            <span className="font-semibold" style={{ color: "var(--brand-strong)" }}>PET Final</span>{" "}
            per gudang. Isi target bulanan dalam ton; mingguan dan harian terisi sendiri dari{" "}
            <span className="font-semibold text-slate-700" title="Senin sampai Sabtu, dikurangi hari libur nasional">
              {workingDaysThisMonth} hari kerja efektif
            </span>{" "}
            bulan ini.
          </>
        )}
        actions={(
          <>
            <ElegantSelect
              value={selectedBulan}
              options={monthOptions}
              onChange={setSelectedBulan}
              ariaLabel="Pilih bulan target"
              className="w-full sm:w-40"
              menuClassName="w-44"
            />
            <ElegantSelect
              value={selectedTahun}
              options={yearOptions}
              onChange={setSelectedTahun}
              ariaLabel="Pilih tahun target"
              className="w-full sm:w-28"
            />
            <Link
              href="/dashboard/manager"
              className="premium-button btn-netral flex items-center whitespace-nowrap px-4 py-2.5 text-sm font-semibold"
            >
              Kembali ke Dashboard
            </Link>
          </>
        )}
      />

      {loading ? (
        <div className="section section-body flex items-center justify-center gap-2 text-sm font-bold soft-enter" style={{ color: "var(--muted)" }}>
          <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
          Memuat target periode...
        </div>
      ) : (
        <div key={`${selectedBulan}-${selectedTahun}`} className="space-y-5 soft-enter">
          {warehouses.map((warehouse, index) => {
            const labelGudang = namaGudang(warehouse.nama)
            const isSaving = saving === warehouse.id
            const isSaved = savedMap[warehouse.id]
            const value = values[warehouse.id]

            return (
              <section
                key={warehouse.id}
                className="section overflow-hidden"
                style={{ animationDelay: `${index * 45}ms` }}
              >
                <div className="flex flex-col gap-3 border-b border-slate-200/70 bg-white/55 p-5 md:flex-row md:items-center md:justify-between">
                  {/* Tanpa lambang inisial: hurufnya tidak menambah
                      keterangan apa pun yang belum ada di nama gudangnya
                      sendiri, dan tiga kartu berjejer dengan lingkaran
                      berhuruf justru menambah beban baca. */}
                  <div>
                    <h3 className="font-black text-slate-950">{labelGudang}</h3>
                    {/* Nada mengikuti keadaan: yang belum ditetapkan diberi
                        warna peringatan karena itu memang pekerjaan yang
                        belum selesai, sedangkan yang sudah cukup abu-abu. */}
                    {jejak[warehouse.id] ? (
                      <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                        Terakhir diubah {fmtTanggalSingkat(jejak[warehouse.id]!.diubahPada)}
                        {jejak[warehouse.id]!.oleh ? ` oleh ${jejak[warehouse.id]!.oleh}` : ""}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs font-semibold" style={{ color: "var(--warning)" }}>
                        Belum ditetapkan untuk {namaBulan} {selectedTahun}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-5">
                  <div className="rounded-[var(--radius-md)] border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                    {/* Dulu di sini ada lambang daur ulang dengan tulisan
                        "PET Final" di sebelahnya. Kata itu sudah muncul di
                        judul halaman dan di subjudul kartu ini, sementara
                        di dalam kartu hanya ada satu kelompok target --
                        jadi menamainya lagi tidak membedakan apa pun dari
                        apa. Kalimat di bawahnya pun mengulang keterangan
                        yang sudah ada di kotak Periode, dan menyebutnya
                        "baseline", istilah yang tidak dipakai siapa pun di
                        gudang.

                        Keterangan yang benar-benar dibutuhkan -- cukup isi
                        satu kolom, dua sisanya terisi sendiri, dan boleh
                        ditimpa -- dipindah ke kotak Periode di atas. Di
                        sana ia muncul sekali; di sini ia akan terulang
                        sekali untuk tiap gudang, padahal isinya sama
                        persis. */}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <TargetInput
                        label="Target Bulanan"
                        unit="ton"
                        value={value?.pet_bulanan ?? ""}
                        onChange={(nextValue) => handleBulananChange(warehouse.id, nextValue)}
                        step="0.1"
                      />
                      <TargetInput
                        label="Target Mingguan"
                        unit="KG"
                        value={value?.pet_mingguan ?? ""}
                        onChange={(nextValue) =>
                          setValues((prev) => ({
                            ...prev,
                            [warehouse.id]: { ...prev[warehouse.id], pet_mingguan: nextValue === "0" ? "" : nextValue },
                          }))
                        }
                      />
                      <TargetInput
                        label="Target Harian"
                        unit="KG"
                        value={value?.pet_harian ?? ""}
                        onChange={(nextValue) =>
                          setValues((prev) => ({
                            ...prev,
                            [warehouse.id]: { ...prev[warehouse.id], pet_harian: nextValue === "0" ? "" : nextValue },
                          }))
                        }
                      />
                    </div>
                  </div>

                  {errorMap[warehouse.id] && (
                    <div className="notice tone-warning mt-4 text-sm font-semibold">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{errorMap[warehouse.id]}</span>
                    </div>
                  )}

                  <button
                    onClick={() => handleSave(warehouse.id)}
                    disabled={isSaving}
                    className={`premium-button mt-4 flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] px-5 py-3 text-sm font-black disabled:opacity-60 ${isSaved ? "" : "btn-primer"}`}
                    style={isSaved ? { background: "var(--success)", color: "#fff", border: "1px solid var(--success)" } : undefined}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : isSaved ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Target tersimpan
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Simpan Target
                      </>
                    )}
                  </button>
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TargetInput({
  label,
  unit,
  value,
  onChange,
  step = "1",
}: {
  label: string
  unit: string
  value: string
  onChange: (value: string) => void
  step?: string
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <span className="relative mt-1.5 block">
        <input
          type="number"
          min="0"
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="0"
          className="field-input field-icon-kanan font-mono text-sm font-black"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{unit}</span>
      </span>
    </label>
  )
}
