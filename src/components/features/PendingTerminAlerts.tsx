"use client";

import React, { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Loader2, FileText } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import NumberInput from "@/components/ui/NumberInput";

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

  /*
   * Nominal yang sedang diketik per nota. Kosong berarti "bayar semuanya",
   * yaitu perilaku lama.
   */
  const [nominalBayar, setNominalBayar] = useState<Record<string, number>>({});

  const handleSettle = (id: string, file: File) => {
    setLoadingId(id);
    startTransition(async () => {
      try {
        const body = new FormData();
        body.append("nota", file);
        const nominal = nominalBayar[id];
        if (nominal && nominal > 0) body.append("nominal", String(nominal));
        const res = await fetch(`/api/purchases/${id}/settle`, { method: "POST", body });
        if (res.ok) {
          const hasil = await res.json();
          if (hasil.lunas) {
            setAlerts((current) => current.filter((a) => a.id !== id));
          } else {
            // Masih ada kekurangan: barisnya tetap, angkanya yang turun.
            setAlerts((current) =>
              current.map((a) => (a.id === id ? { ...a, nominal_belum_lunas: hasil.sisa } : a)),
            );
            setNominalBayar((current) => ({ ...current, [id]: 0 }));
            toast(`Pembayaran dicatat. Sisa ${formatRp(hasil.sisa)}.`);
          }
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
      {/*
        Kepala kartu. Keterangannya menyebut TINDAKAN yang diharapkan,
        bukan mengulang apa yang sudah terbaca dari daftarnya sendiri.
        Jumlah notanya pindah ke pil di kanan supaya kalimatnya tidak
        perlu memuat angka.
      */}
      <div className="flex items-start justify-between gap-3 border-b pb-3" style={{ borderColor: "color-mix(in srgb, var(--warning) 22%, transparent)" }}>
        <div className="flex items-start gap-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--warning)" }} />
          <div>
            <h3 className="field-label" style={{ color: "var(--warning)", marginBottom: 2 }}>Sisa termin belum lunas</h3>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Catat pembayaran setelah sisanya ditransfer ke lapak.
            </p>
          </div>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black"
          style={{ background: "color-mix(in srgb, var(--warning) 16%, transparent)", color: "var(--warning)" }}
        >
          {alerts.length} nota
        </span>
      </div>

      <div className="space-y-2.5">
        {alerts.map((alert) => {
          const tanggal = new Date(alert.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
          const diketik = nominalBayar[alert.id] ?? alert.nominal_belum_lunas;
          // Sisa hanya ditampilkan kalau nominal yang diketik BERBEDA dari
          // sisanya. Selama keduanya sama, mengulangnya cuma menampilkan
          // angka yang sama dua kali bersebelahan.
          const dicicil = diketik !== alert.nominal_belum_lunas;

          return (
            <div
              key={alert.id}
              className="flex flex-col gap-3 rounded-[var(--radius-md)] border p-3.5 md:flex-row md:items-center md:justify-between"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              {/* Kiri: identitas nota. Nama lapak yang dicari mata lebih
                  dulu, sisanya satu baris keterangan abu yang tidak ikut
                  menarik perhatian. */}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold" style={{ color: "var(--foreground)" }}>{alert.supplier.nama}</p>
                <p className="mt-0.5 truncate text-[11px]" style={{ color: "var(--muted-faint)" }}>
                  <span className="font-mono">{alert.nomor_nota || "tanpa nomor"}</span>
                  {" · "}{tanggal}
                  {" · sudah dibayar "}{alert.persentase_pembayaran}% dari {formatRp(alert.total_nilai_setelah_retur)}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-end justify-end gap-2.5">
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

                {/* Kolom nominal diberi judul. Tanpa judul ia terbaca
                    seperti angka yang sekadar dipajang, padahal isinya bisa
                    diubah untuk mencicil. Terisi penuh sejak awal supaya
                    melunasi sekaligus tetap sekali klik. */}
                <div className="w-40">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--muted-faint)" }}>
                    Dibayar sekarang
                  </label>
                  <NumberInput
                    aria-label={`Nominal pembayaran untuk ${alert.supplier.nama}`}
                    pemisahRibuan
                    className="field-input text-right font-mono text-xs"
                    value={diketik}
                    onValueChange={(n) => setNominalBayar((current) => ({ ...current, [alert.id]: n }))}
                  />
                  {dicicil && (
                    <p className="mt-1 text-right text-[10px]" style={{ color: "var(--warning)" }}>
                      sisa {formatRp(alert.nominal_belum_lunas)}
                    </p>
                  )}
                </div>

                <Link
                  href={`/nota/${alert.id}`}
                  className="btn-netral premium-button flex h-[42px] items-center gap-1.5 px-3.5 text-xs"
                >
                  <FileText className="h-4 w-4" />
                  Nota
                </Link>

                <button
                  onClick={() => fileInputs.current[alert.id]?.click()}
                  disabled={isPending}
                  className="btn-primer premium-button flex h-[42px] cursor-pointer items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-4 text-xs font-bold disabled:opacity-50"
                >
                  {loadingId === alert.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Menyimpan
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Catat Pembayaran
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
