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
    // Lebar tetap w-36 + w-28 tidak muat di layar ponsel begitu ditaruh
    // sebaris dengan label apa pun. Di bawah sm keduanya berbagi lebar yang
    // tersedia; mulai sm kembali ke lebar tetap seperti semula.
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <ElegantSelect
        value={selectedBulan}
        options={monthOptions}
        onChange={bulan => handlePeriodChange(bulan, selectedTahun)}
        ariaLabel="Pilih bulan"
        // Bulan diberi porsi lebih besar daripada tahun: "September" butuh
        // hampir dua kali lebar "2026", dan dengan porsi sama rata namanya
        // terpotong jadi "Septem..." di layar 360px.
        className="flex-[1.6] sm:w-36 sm:flex-none"
        menuClassName="w-44"
      />

      <ElegantSelect
        value={selectedTahun}
        options={yearOptions}
        onChange={tahun => handlePeriodChange(selectedBulan, tahun)}
        ariaLabel="Pilih tahun"
        className="flex-1 sm:w-28 sm:flex-none"
      />
    </div>
  )
}
