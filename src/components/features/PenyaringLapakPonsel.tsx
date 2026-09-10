"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Search } from "lucide-react"
import ElegantSelect from "@/components/ui/ElegantSelect"

type Pilihan = "all" | "GREEN" | "RED" | "ready" | "missing"

/**
 * Bilah penyaring Data Lapak khusus ponsel: kolom cari dan satu pemilih.
 *
 * Di layar lebar halaman ini memakai dua deret segmen (status dan lokasi).
 * Di ponsel keduanya bertumpuk jadi dua deret yang masing-masing harus
 * digeser, dengan label seperti "Belum ada koordinat (3)" terpotong di tepi
 * kartu. Di sini keduanya dilebur ke satu pemilih -- lima pilihan yang
 * paling sering dipakai -- dan tempat yang dibebaskan dipakai kolom cari,
 * yang sebelumnya tidak ada sama sekali.
 *
 * Penyaringnya tetap lewat URL (status, location, q) seperti deret segmen di
 * layar lebar, jadi halaman server yang sama yang menyaring datanya.
 */
export default function PenyaringLapakPonsel({
  status,
  location,
  q,
  jumlah,
}: {
  status: string
  location: string
  q: string
  jumlah: { semua: number; aktif: number; belum: number; siap: number; kosong: number }
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [cari, setCari] = useState(q)
  const pertama = useRef(true)

  const pilihan: Pilihan =
    status === "GREEN" || status === "RED" ? status : location === "ready" || location === "missing" ? location : "all"

  const arahkan = (p: Pilihan, kata: string) => {
    const params = new URLSearchParams()
    if (p === "GREEN" || p === "RED") params.set("status", p)
    if (p === "ready" || p === "missing") params.set("location", p)
    if (kata.trim()) params.set("q", kata.trim())
    const s = params.toString()
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false })
  }

  // Pencarian dikirim setelah jeda mengetik, bukan tiap huruf.
  useEffect(() => {
    if (pertama.current) {
      pertama.current = false
      return
    }
    const t = setTimeout(() => arahkan(pilihan, cari), 350)
    return () => clearTimeout(t)
    // arahkan dan pilihan sengaja tidak jadi pemicu: yang ditunggu ketikan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cari])

  return (
    <div className="flex items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari lapak..."
          aria-label="Cari lapak"
          className="field-input field-icon"
        />
      </div>
      <ElegantSelect
        value={pilihan}
        onChange={(p) => arahkan(p, cari)}
        ariaLabel="Saring lapak"
        className="w-[44%] shrink-0"
        options={[
          { value: "all" as const, label: `Semua (${jumlah.semua})` },
          { value: "GREEN" as const, label: `Aktif (${jumlah.aktif})` },
          { value: "RED" as const, label: `Belum aktif (${jumlah.belum})` },
          { value: "ready" as const, label: `Koordinat ada (${jumlah.siap})` },
          { value: "missing" as const, label: `Tanpa koordinat (${jumlah.kosong})` },
        ]}
      />
    </div>
  )
}
