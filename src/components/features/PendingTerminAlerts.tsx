"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Loader2, FileText } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";

interface PendingTermin {
  id: string;
  nomor_nota: string | null;
  tanggal: string;
  total_nilai_setelah_retur: number;
  persentase_pembayaran: number;
  nominal_belum_lunas: number;
  supplier: {
    nama: string;
  };
}

interface PendingTerminAlertsProps {
  initialAlerts: PendingTermin[];
}

function formatRp(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value).replace(/\s+/g, " ");
}

export default function PendingTerminAlerts({ initialAlerts }: PendingTerminAlertsProps) {
  const router = useRouter();
  const [alerts, setAlerts] = useState<PendingTermin[]>(initialAlerts);
  const [isPending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { toast, host: toastHost } = useToast();

  const handleSettle = (id: string) => {
    setLoadingId(id);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/purchases/${id}/settle`, { method: "POST" });
        if (res.ok) {
          setAlerts((current) => current.filter((a) => a.id !== id));
          router.refresh();
        } else {
          const d = await res.json();
          toast(d.error || "Gagal menyelesaikan pelunasan", "error");
        }
      } catch (e: any) {
        toast(e.message || "Terjadi kesalahan koneksi", "error");
      } finally {
        setLoadingId(null);
      }
    });
  };

  if (alerts.length === 0) return toastHost;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 space-y-4 shadow-sm animate-in fade-in duration-200">
      {toastHost}
      <div className="flex items-center gap-2.5 border-b border-amber-200 pb-2.5">
        <AlertCircle className="w-5.5 h-5.5 text-amber-500 shrink-0 animate-pulse" />
        <div>
          <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wider">Pemberitahuan Pelunasan Pending</h3>
          <p className="text-xs text-amber-600 font-medium">Ada {alerts.length} transaksi termin yang masih menunggu pelunasan sisa</p>
        </div>
      </div>

      <div className="space-y-3.5">
        {alerts.map((alert) => {
          const remainingPercent = 100 - (alert.persentase_pembayaran || 80);
          const dateFormatted = new Date(alert.tanggal).toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" });
          
          return (
            <div 
              key={alert.id} 
              className="bg-white border border-amber-100 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:shadow-md hover:border-amber-200"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-800">{alert.supplier.nama}</span>
                  <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200/50 px-2.5 py-0.5 rounded-full uppercase">
                    Termin {alert.persentase_pembayaran}%
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Belum selesai: <strong className="text-amber-700 font-semibold">menunggu pelunasan {remainingPercent}% ({formatRp(alert.nominal_belum_lunas)})</strong> dari total tagihan {formatRp(alert.total_nilai_setelah_retur)}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                  <span>{dateFormatted}</span>
                  <span>•</span>
                  <span>{alert.nomor_nota || "Nota Tanpa Nomor"}</span>
                </div>
              </div>

              <div className="flex items-center gap-3.5 w-full md:w-auto shrink-0 justify-end pt-2 md:pt-0 border-t border-slate-100 md:border-0">
                <Link
                  href={`/nota/${alert.id}`}
                  className="text-xs font-bold text-slate-600 hover:text-cyan-600 py-2 px-4 bg-slate-100 hover:bg-cyan-50 border border-slate-200 hover:border-cyan-100 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  Lihat Nota
                </Link>
                
                <button
                  onClick={() => handleSettle(alert.id)}
                  disabled={isPending}
                  className="bg-gradient-to-tr from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-450 text-white py-2 px-4.5 rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md disabled:opacity-50"
                >
                  {loadingId === alert.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Tandai Lunas {remainingPercent}%
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
