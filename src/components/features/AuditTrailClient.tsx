"use client"

import { useMemo, useState } from "react"
import { Download, Filter, Search } from "lucide-react"
import ElegantSelect from "@/components/ui/ElegantSelect"
import { formatAuditAction } from "@/lib/auditLabels"

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
    return [{ value: "all", label: "Semua Peran" }, ...roles.map((r) => ({ value: r, label: r }))]
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
    return [{ value: "all", label: "Semua Entitas" }, ...tables.map((t) => ({ value: t, label: t }))]
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
        formatAuditAction(log.action).toLowerCase().includes(query)
      const matchesRole = selectedRole === "all" || log.user?.role === selectedRole
      const matchesAction = selectedAction === "all" || log.action === selectedAction
      const matchesTable = selectedTable === "all" || log.table_name === selectedTable
      const matchesMonth = selectedMonth === "all" || date.getMonth() + 1 === Number(selectedMonth)
      const matchesYear = selectedYear === "all" || date.getFullYear() === Number(selectedYear)
      return matchesSearch && matchesRole && matchesAction && matchesTable && matchesMonth && matchesYear
    })
  }, [logs, search, selectedRole, selectedAction, selectedTable, selectedMonth, selectedYear])

  const handleExportCsv = () => {
    const header = ["Waktu", "Pengguna", "Peran", "Aksi", "Entitas", "Record ID"]
    const rows = filteredLogs.map((log) => [
      formatDateTime(log.createdAt),
      log.user?.nama || "-",
      log.user?.role || "-",
      formatAuditAction(log.action),
      log.table_name,
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
      <section className="interactive-surface border border-slate-200/80 p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari pengguna, record ID, aksi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/80 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
            <ElegantSelect value={selectedRole} options={roleOptions} onChange={setSelectedRole} ariaLabel="Filter peran" className="w-full" />
            <ElegantSelect value={selectedAction} options={actionOptions} onChange={setSelectedAction} ariaLabel="Filter aksi" className="w-full" menuClassName="w-72" />
            <ElegantSelect value={selectedTable} options={tableOptions} onChange={setSelectedTable} ariaLabel="Filter entitas" className="w-full" />
          </div>
          <div className="flex gap-2">
            <ElegantSelect value={selectedMonth} options={MONTHS} onChange={setSelectedMonth} ariaLabel="Filter bulan" className="w-full sm:w-40" />
            <ElegantSelect value={selectedYear} options={yearOptions} onChange={setSelectedYear} ariaLabel="Filter tahun" className="w-full sm:w-32" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            {filteredLogs.length} dari {logs.length} entri
          </p>
          <button
            onClick={handleExportCsv}
            disabled={filteredLogs.length === 0}
            className="premium-button flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV (hasil filter)
          </button>
        </div>
      </section>

      <section className="interactive-surface overflow-hidden border border-slate-200/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">Waktu</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">Pengguna</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">Aksi</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">Entitas</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">Record ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                    Tidak ada aktivitas yang cocok dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDateTime(log.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">{log.user?.nama || "Sistem"}</div>
                      {log.user?.role && (
                        <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">{log.user.role}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{formatAuditAction(log.action)}</td>
                    <td className="px-4 py-3 text-slate-500">{log.table_name}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-400">{log.record_id.slice(0, 8)}</td>
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
