"use client";

import React, { useRef, useState, useTransition } from "react";
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

  // Pelunasan sekarang wajib disertai nota (hasil meeting Manager), jadi
  // tombolnya membuka pemilih berkas dulu, bukan langsung mengirim.
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleSettle = (id: string, file: File) => {
    setLoadingId(id);
    startTransition(async () => {
      try {
        const body = new FormData();
        body.append("nota", file);
        const res = await fetch(`/api/purchases/${id}/settle`, { method: "POST", body });
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
    /* Panel ini muncul paling atas di dashboard Admin, Staff, dan
       Manager. Ikonnya dulu berdenyut terus-menerus (animate-pulse)
       selama masih ada satu saja termin terbuka -- gerakan yang tidak
       pernah berhenti berhenti diperhatikan, dan mengganggu di layar
       yang dibuka sepanjang hari. */
    <div
      className="animate-in fade-in space-y-4 rounded-[var(--radius-lg)] border p-5 shadow-sm duration-200"
      style={{ background: "var(--warning-soft)", borderColor: "color-mix(in srgb, var(--warning) 25%, transparent)" }}
    >
      {toastHost}
      <div className="flex items-center gap-2.5 border-b pb-2.5" style={{ borderColor: "color-mix(in srgb, var(--warning) 25%, transparent)" }}>
        <AlertCircle className="h-5 w-5 shrink-0" style={{ color: "var(--warning)" }} />
        <div>
          <h3 className="field-label" style={{ color: "var(--warning)", marginBottom: 2 }}>Sisa Termin Belum Lunas</h3>
          <p className="text-xs font-medium" style={{ color: "var(--warning)" }}>
            Ada {alerts.length} transaksi termin yang sisanya masih kurang dibayar ke lapak
          </p>
        </div>
      </div>

      <div className="space-y-3.5">
        {alerts.map((alert) => {
          const remainingPercent = 100 - (alert.persentase_pembayaran || 80);
          const dateFormatted = new Date(alert.tanggal).toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" });
          
          return (
            <div 
              key={alert.id} 
              className="flex flex-col items-start justify-between gap-4 rounded-[var(--radius-md)] border p-4 transition-all hover:shadow-md md:flex-row md:items-center"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{alert.supplier.nama}</span>
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>
                    Termin {alert.persentase_pembayaran}%
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Kurang <strong className="font-semibold" style={{ color: "var(--warning)" }}>{formatRp(alert.nominal_belum_lunas)} ({remainingPercent}%)</strong> dari nilai nota {formatRp(alert.total_nilai_setelah_retur)}
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
                  className="btn-netral premium-button flex items-center gap-1.5 px-4 py-2 text-xs"
                >
                  <FileText className="w-4 h-4" />
                  Lihat Nota
                </Link>
                
                <input
                  ref={(el) => { fileInputs.current[alert.id] = el }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSettle(alert.id, file);
                    e.target.value = "";
                  }}
                />
                <button
                  onClick={() => fileInputs.current[alert.id]?.click()}
                  disabled={isPending}
                  className="btn-primer premium-button flex cursor-pointer items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-4 py-2 text-xs font-bold disabled:opacity-50"
                >
                  {loadingId === alert.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Lunasi {remainingPercent}% + Nota
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
