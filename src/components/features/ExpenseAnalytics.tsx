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
  globalExpenses: ExpenseData
  warehouseExpenses: WarehouseExpense[]
}

export default function ExpenseAnalytics({ globalExpenses, warehouseExpenses }: ExpenseAnalyticsProps) {
  const formatRp = (n: number) => n.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

  return (
    <div className="interactive-surface bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden p-5 space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900">Pengeluaran Pembelian</h3>
        <p className="text-xs text-slate-400 mt-0.5">Total nilai transaksi dibayar ke supplier, lintas seluruh Collection Center.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Hari Ini</p>
          <p className="text-xl font-extrabold text-slate-800">{formatRp(globalExpenses.harian)}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Minggu Ini</p>
          <p className="text-xl font-extrabold text-slate-800">{formatRp(globalExpenses.mingguan)}</p>
        </div>
        <div className="bg-rose-50 rounded-lg p-4 border border-rose-100">
          <p className="text-xs text-rose-500 font-semibold uppercase tracking-wider mb-1">Bulan Ini</p>
          <p className="text-xl font-extrabold text-rose-700">{formatRp(globalExpenses.bulanan)}</p>
        </div>
      </div>

      {warehouseExpenses.length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-8">Belum ada transaksi tercatat di gudang mana pun.</p>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {warehouseExpenses.map((w) => (
          <div key={w.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <h4 className="font-bold text-slate-800">{w.nama}</h4>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Hari Ini</span>
                <span className="font-extrabold text-slate-700">{formatRp(w.expenses.harian)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Minggu Ini</span>
                <span className="font-extrabold text-slate-700">{formatRp(w.expenses.mingguan)}</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-3 border-t border-slate-50">
                <span className="text-slate-500 font-bold">Bulan Ini</span>
                <span className="font-extrabold text-rose-600">{formatRp(w.expenses.bulanan)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  )
}
