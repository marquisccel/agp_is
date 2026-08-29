"use client"

import { useMemo, useState } from "react"
import { Download, Filter, Search } from "lucide-react"
import ElegantSelect from "@/components/ui/ElegantSelect"
import { formatAuditAction, formatAuditEntity, formatPeran } from "@/lib/auditLabels"

interface AuditLogRow {
  id: string
  action: string
  table_name: string
  record_id: string
  old_data: string | null
  new_data: string | null
  createdAt: string
  user: { nama: string; role: string } | null
}

const MONTHS = [
  { value: "all", label: "Semua Bulan" },
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
]

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })
}

function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return ""
  const str = String(val).replace(/"/g, '""')
  return /[;,"\n\r]/.test(str) ? `"${str}"` : str
}

export default function AuditTrailClient({ logs }: { logs: AuditLogRow[] }) {
  const [search, setSearch] = useState("")
  const [selectedRole, setSelectedRole] = useState("all")
  const [selectedAction, setSelectedAction] = useState("all")
  const [selectedTable, setSelectedTable] = useState("all")
  const [selectedMonth, setSelectedMonth] = useState("all")
  const [selectedYear, setSelectedYear] = useState("all")

  const roleOptions = useMemo(() => {
    const roles = Array.from(new Set(logs.map((l) => l.user?.role).filter(Boolean))) as string[]
    return [{ value: "all", label: "Semua Peran" }, ...roles.map((r) => ({ value: r, label: formatPeran(r) }))]
  }, [logs])

  const actionOptions = useMemo(() => {
    const actions = Array.from(new Set(logs.map((l) => l.action)))
    return [
      { value: "all", label: "Semua Aksi" },
      ...actions.map((a) => ({ value: a, label: formatAuditAction(a) })),
    ]
  }, [logs])

  const tableOptions = useMemo(() => {
    const tables = Array.from(new Set(logs.map((l) => l.table_name)))
    return [{ value: "all", label: "Semua Data" }, ...tables.map((t) => ({ value: t, label: formatAuditEntity(t) }))]
  }, [logs])

  const yearOptions = useMemo(() => {
    const years = Array.from(new Set(logs.map((l) => new Date(l.createdAt).getFullYear()))).sort((a, b) => b - a)
    return [{ value: "all", label: "Semua Tahun" }, ...years.map((y) => ({ value: String(y), label: String(y) }))]
  }, [logs])

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase()
    return logs.filter((log) => {
      const date = new Date(log.createdAt)
      const matchesSearch =
        !query ||
        log.record_id.toLowerCase().includes(query) ||
        (log.user?.nama || "").toLowerCase().includes(query) ||
        formatAuditAction(log.action).toLowerCase().includes(query) ||
        formatAuditEntity(log.table_name).toLowerCase().includes(query)
      const matchesRole = selectedRole === "all" || log.user?.role === selectedRole
      const matchesAction = selectedAction === "all" || log.action === selectedAction
      const matchesTable = selectedTable === "all" || log.table_name === selectedTable
      const matchesMonth = selectedMonth === "all" || date.getMonth() + 1 === Number(selectedMonth)
      const matchesYear = selectedYear === "all" || date.getFullYear() === Number(selectedYear)
      return matchesSearch && matchesRole && matchesAction && matchesTable && matchesMonth && matchesYear
    })
  }, [logs, search, selectedRole, selectedAction, selectedTable, selectedMonth, selectedYear])

  const handleExportCsv = () => {
    const header = ["Waktu", "Pengguna", "Peran", "Aktivitas", "Data", "Kode"]
    const rows = filteredLogs.map((log) => [
      formatDateTime(log.createdAt),
      log.user?.nama || "-",
      log.user?.role ? formatPeran(log.user.role) : "-",
      formatAuditAction(log.action),
      formatAuditEntity(log.table_name),
      log.record_id,
    ])
    const csv =
      "﻿sep=;\r\n" +
      [header, ...rows].map((row) => row.map(csvEscape).join(";")).join("\r\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Audit-Trail-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <section className="section section-body">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="field-icon-gambar absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--muted-faint)" }} />
              <input
                type="text"
                placeholder="Cari nama, aktivitas, atau kode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="field-input field-icon"
              />
            </div>
            <ElegantSelect value={selectedRole} options={roleOptions} onChange={setSelectedRole} ariaLabel="Filter peran" className="w-full" />
            <ElegantSelect value={selectedAction} options={actionOptions} onChange={setSelectedAction} ariaLabel="Filter aksi" className="w-full" menuClassName="w-72" />
            <ElegantSelect value={selectedTable} options={tableOptions} onChange={setSelectedTable} ariaLabel="Filter entitas" className="w-full" />
          </div>
          <div className="flex items-center gap-2">
            <ElegantSelect value={selectedMonth} options={MONTHS} onChange={setSelectedMonth} ariaLabel="Filter bulan" className="w-full sm:w-40" />
            <ElegantSelect value={selectedYear} options={yearOptions} onChange={setSelectedYear} ariaLabel="Filter tahun" className="w-full sm:w-32" />
            {/* Ikon saja supaya muat sebaris dengan filternya. Sebelumnya
                tombol ini turun ke baris sendiri di bawah, bersama hitungan
                entri -- satu baris penuh untuk dua hal kecil, dan barisnya
                selalu ada walau tidak ada yang bisa diexport. */}
            <button
              onClick={handleExportCsv}
              disabled={filteredLogs.length === 0}
              className="premium-button btn-netral grid h-[42px] w-[42px] shrink-0 place-items-center disabled:cursor-not-allowed disabled:opacity-50"
              title="Unduh hasil filter sebagai CSV"
              aria-label="Unduh hasil filter sebagai CSV"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="section overflow-hidden">
        {/* Hitungan entri diletakkan menempel pada tabelnya, karena yang
            dihitung memang isi tabel itu, bukan filternya. */}
        <div className="flex items-center gap-1.5 border-b px-5 py-3 text-xs font-semibold" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
          <Filter className="h-3.5 w-3.5" />
          Menampilkan {filteredLogs.length} dari {logs.length} aktivitas
        </div>
        <div className="overflow-x-auto">
          <table className="tabel-lembut w-full text-left text-sm">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Pengguna</th>
                <th>Aktivitas</th>
                <th>Data</th>
                <th>Kode</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm" style={{ color: "var(--muted-faint)" }}>
                    Tidak ada aktivitas yang cocok dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap" style={{ color: "var(--muted)" }}>{formatDateTime(log.createdAt)}</td>
                    <td>
                      <div className="font-bold" style={{ color: "var(--foreground)" }}>{log.user?.nama || "Sistem"}</div>
                      {log.user?.role && (
                        <span className="text-[11px]" style={{ color: "var(--muted-faint)" }}>{formatPeran(log.user.role)}</span>
                      )}
                    </td>
                    <td className="font-semibold" style={{ color: "var(--foreground)" }}>{formatAuditAction(log.action)}</td>
                    <td style={{ color: "var(--muted)" }}>{formatAuditEntity(log.table_name)}</td>
                    {/* Kode dipertahankan supaya satu baris audit masih bisa
                        dicocokkan dengan datanya saat menelusuri selisih,
                        tapi dibuat paling redup di barisnya: ia dicari kalau
                        memang sedang dibutuhkan, bukan dibaca sambil lalu. */}
                    <td
                      className="whitespace-nowrap font-mono text-xs"
                      style={{ color: "var(--muted-faint)" }}
                      title={log.record_id}
                    >
                      {log.record_id.slice(0, 8)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
