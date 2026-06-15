"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import ElegantSelect from "@/components/ui/ElegantSelect"

export default function MonthYearFilter({
  selectedBulan,
  selectedTahun,
}: {
  selectedBulan: number
  selectedTahun: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handlePeriodChange = (bulan: number, tahun: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("bulan", String(bulan))
    params.set("tahun", String(tahun))
    router.push(`${pathname}?${params.toString()}`)
  }

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const m = new Date(2000, i, 1)
    return {
      value: i + 1,
      label: m.toLocaleDateString("id-ID", { month: "long" }),
    }
  })

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = new Date().getFullYear() - 2 + i
    return { value: y, label: String(y) }
  })

  return (
    <div className="flex items-center gap-2">
      <ElegantSelect
        value={selectedBulan}
        options={monthOptions}
        onChange={bulan => handlePeriodChange(bulan, selectedTahun)}
        ariaLabel="Pilih bulan"
        className="w-36"
        menuClassName="w-44"
      />

      <ElegantSelect
        value={selectedTahun}
        options={yearOptions}
        onChange={tahun => handlePeriodChange(selectedBulan, tahun)}
        ariaLabel="Pilih tahun"
        className="w-28"
      />
    </div>
  )
}
