"use client"

interface ExpenseData {
  harian: number
  mingguan: number
  bulanan: number
}

interface WarehouseExpense {
  id: string
  nama: string
  expenses: ExpenseData
}

interface ExpenseAnalyticsProps {
  warehouseExpenses: WarehouseExpense[]
}

export default function ExpenseAnalytics({ warehouseExpenses }: ExpenseAnalyticsProps) {
  const formatRp = (n: number) => n.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

  return (
    <div className="section">
      <div className="section-shell-head">
        <div className="min-w-0">
          <p className="section-eyebrow">Cost breakdown</p>
          <h3 className="text-[15.5px] font-bold text-slate-900">Pengeluaran per Gudang</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Total nilai transaksi dibayar ke supplier -- ringkasan global sudah ada di baris statistik atas.
          </p>
        </div>
      </div>
      <div className="p-5">
        {warehouseExpenses.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-8">Belum ada transaksi tercatat di gudang mana pun.</p>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {warehouseExpenses.map((w) => (
            <div key={w.id} className="rounded-[var(--radius-md)] p-4 border border-slate-100 bg-[var(--surface-sunken)]">
              <div className="flex items-center gap-3 mb-3 border-b border-slate-100 pb-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--bg-tint)", color: "var(--muted)" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <h4 className="font-bold text-slate-800 text-sm">{w.nama}</h4>
              </div>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Hari Ini</span>
                  <span className="font-mono font-bold text-slate-700">{formatRp(w.expenses.harian)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Minggu Ini</span>
                  <span className="font-mono font-bold text-slate-700">{formatRp(w.expenses.mingguan)}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200/70">
                  <span className="text-slate-500 font-bold">Bulan Ini</span>
                  <span className="font-mono font-extrabold" style={{ color: "var(--danger)" }}>{formatRp(w.expenses.bulanan)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  )
}
