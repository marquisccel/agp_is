"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CalendarDays, CheckCircle2, Loader2, Recycle, Save } from "lucide-react"
import type { Warehouse, WarehouseTarget } from "@prisma/client"
import ElegantSelect from "@/components/ui/ElegantSelect"
import { getWorkingDaysInMonth } from "@/lib/workingDays"

interface TargetValues {
  pet_bulanan: string
  pet_mingguan: string
  pet_harian: string
}

type TargetApiRow = Pick<WarehouseTarget, "warehouseId" | "target_bulanan_pet_final" | "target_mingguan_pet_final" | "target_harian_pet_final">

export default function TargetSettingForm({ warehouses, existingTargets }: { warehouses: Warehouse[]; existingTargets: WarehouseTarget[] }) {
  const router = useRouter()
  const now = new Date()
  const [selectedBulan, setSelectedBulan] = useState<number>(now.getMonth() + 1)
  const [selectedTahun, setSelectedTahun] = useState<number>(now.getFullYear())
  const [saving, setSaving] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({})
  const [errorMap, setErrorMap] = useState<Record<string, string>>({})

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

  useEffect(() => {
    async function fetchTargets() {
      setLoading(true)
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
        }
      } catch (err) {
        console.error("Gagal mengambil data target:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchTargets()
  }, [selectedBulan, selectedTahun, warehouses])

  const workingDaysThisMonth = getWorkingDaysInMonth(selectedTahun, selectedBulan)
  const effectiveWeeks = workingDaysThisMonth / 6
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i, 1).toLocaleDateString("id-ID", { month: "long" }),
  }))
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
      router.refresh()
    } catch (error: any) {
      setErrorMap((prev) => ({ ...prev, [warehouseId]: error.message || "Gagal menyimpan. Coba lagi." }))
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="interactive-surface border border-slate-200/80 p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px]" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
              <CalendarDays className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.12em] text-slate-950">Periode Target CC</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {workingDaysThisMonth} hari kerja efektif untuk periode ini. Target mingguan dan harian dihitung otomatis dari target bulanan.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-[150px_112px]">
            <ElegantSelect
              value={selectedBulan}
              options={monthOptions}
              onChange={setSelectedBulan}
              ariaLabel="Pilih bulan target"
              className="w-full"
              menuClassName="w-44"
            />
            <ElegantSelect
              value={selectedTahun}
              options={yearOptions}
              onChange={setSelectedTahun}
              ariaLabel="Pilih tahun target"
              className="w-full"
            />
          </div>
        </div>
      </section>

      {loading ? (
        <div className="interactive-surface flex items-center justify-center gap-2 border border-slate-200/80 p-8 text-sm font-bold text-slate-500 soft-enter">
          <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
          Memuat target periode...
        </div>
      ) : (
        <div key={`${selectedBulan}-${selectedTahun}`} className="space-y-5 soft-enter">
          {warehouses.map((warehouse, index) => {
            const cityName = warehouse.nama.replace(/^Gudang\s+/i, "")
            const isSaving = saving === warehouse.id
            const isSaved = savedMap[warehouse.id]
            const value = values[warehouse.id]

            return (
              <section
                key={warehouse.id}
                className="interactive-surface overflow-hidden border border-slate-200/80"
                style={{ animationDelay: `${index * 45}ms` }}
              >
                <div className="flex flex-col gap-3 border-b border-slate-200/70 bg-white/55 p-5 md:flex-row md:items-center md:justify-between">
                  {/* Tanpa lambang inisial: hurufnya tidak menambah
                      keterangan apa pun yang belum ada di nama gudangnya
                      sendiri, dan tiga kartu berjejer dengan lingkaran
                      berhuruf justru menambah beban baca. */}
                  <div>
                    <h3 className="font-black text-slate-950">Collection Center {cityName}</h3>
                    <p className="mt-1 text-xs text-slate-500">Target pembelian bahan baku PET Final</p>
                  </div>
                  <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-500">
                    {workingDaysThisMonth} hari kerja
                  </div>
                </div>

                <div className="p-5">
                  <div className="rounded-[var(--radius-md)] border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                    <div className="mb-4 flex items-center gap-2.5">
                      <div className="grid h-9 w-9 place-items-center rounded-[10px]" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
                        <Recycle className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-950">PET Final</div>
                        <div className="text-xs text-slate-500">Masukkan target bulanan, sistem menghitung baseline mingguan dan harian.</div>
                      </div>
                    </div>

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
