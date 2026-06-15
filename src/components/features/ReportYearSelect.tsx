"use client"

import { useRouter } from "next/navigation"
import ElegantSelect from "@/components/ui/ElegantSelect"

export default function ReportYearSelect({
  selectedTahun,
  years,
}: {
  selectedTahun: number
  years: number[]
}) {
  const router = useRouter()

  return (
    <ElegantSelect
      value={selectedTahun}
      options={years.map(year => ({ value: year, label: `Tahun ${year}` }))}
      onChange={(year) => router.push(`/dashboard/manager/reports?tahun=${year}`)}
      ariaLabel="Pilih tahun laporan"
      className="w-full sm:w-36"
    />
  )
}
