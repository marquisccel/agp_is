"use client"

import { useRouter } from "next/navigation"
import ElegantSelect from "@/components/ui/ElegantSelect"

export default function ReportYearSelect({
  selectedBulan,
  selectedTahun,
  years,
}: {
  selectedBulan: number
  selectedTahun: number
  years: number[]
}) {
  const router = useRouter()
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ]

  const pushPeriod = (bulan: number, tahun: number) => {
    router.push(`/dashboard/manager/reports?bulan=${bulan}&tahun=${tahun}`)
  }

  return (
    <div className="flex w-full gap-2 sm:w-auto">
      <ElegantSelect
        value={selectedBulan}
        options={months.map((month, index) => ({ value: index + 1, label: month }))}
        onChange={(bulan) => pushPeriod(Number(bulan), selectedTahun)}
        ariaLabel="Pilih bulan laporan"
        className="w-full sm:w-36"
      />
      <ElegantSelect
        value={selectedTahun}
        options={years.map(year => ({ value: year, label: `${year}` }))}
        onChange={(year) => pushPeriod(selectedBulan, Number(year))}
        ariaLabel="Pilih tahun laporan"
        className="w-full sm:w-28"
      />
    </div>
  )
}
