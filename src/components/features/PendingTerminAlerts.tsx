"use client";

import React, { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Loader2, FileText } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { pesanError } from "@/lib/pesanError";

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
        // Nominal sengaja tidak dikirim: kartu ini selalu melunasi sisa
        // penuh. API-nya tetap menerima pembayaran sebagian, tapi tidak ada
        // lagi tampilan yang memanggilnya.
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
            toast(`Pembayaran dicatat. Sisa ${formatRp(hasil.sisa)}.`);
          }
          router.refresh();
        } else {
          const d = await res.json();
          toast(d.error || "Gagal menyelesaikan pelunasan", "error");
        }
      } catch (e) {
        toast(pesanError(e, "Terjadi kesalahan koneksi"), "error");
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
      className="animate-in fade-in space-y-4 rounded-[var(--radius-lg)] border p-4 shadow-sm duration-200 md:p-5"
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

          return (
            <div
              key={alert.id}
              className="flex flex-col gap-3 rounded-[var(--radius-md)] border p-4 md:flex-row md:items-center md:justify-between md:p-3.5"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              {/* Kepala: nama lapak dan porsi yang sudah dibayar. Di ponsel
                  porsinya jadi pil di kanan nama; sebelumnya ia ekor kalimat
                  keterangan yang terpotong elipsis tepat di angkanya. */}
              <div className="flex min-w-0 items-start justify-between gap-3 md:block">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold" style={{ color: "var(--foreground)" }}>{alert.supplier.nama}</p>
                  <p className="mt-0.5 truncate text-[11px]" style={{ color: "var(--muted-faint)" }}>
                    <span className="font-mono">{alert.nomor_nota || "tanpa nomor"}</span>
                    {" · "}{tanggal}
                    <span className="hidden md:inline">
                      {" · sudah dibayar "}{alert.persentase_pembayaran}% dari {formatRp(alert.total_nilai_setelah_retur)}
                    </span>
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums md:hidden"
                  style={{ background: "color-mix(in srgb, var(--warning) 14%, transparent)", color: "var(--warning)" }}
                >
                  {alert.persentase_pembayaran}% dibayar
                </span>
              </div>

              <div className="flex flex-col gap-3 md:shrink-0 md:flex-row md:items-center">
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

                {/* Angka kurangnya satu-satunya angka yang dicari di kartu
                    ini, jadi ia yang paling menonjol. Di ponsel ia duduk di
                    pita sendiri, label di kiri dan angka di kanan; di layar
                    lebar kembali bertumpuk rata tengah di antara identitas
                    dan tombol.

                    Kata "Kurang" dipakai supaya sama dengan halaman Transfer
                    Pembayaran; label sebelumnya, "Dibayar sekarang", ambigu
                    antara jumlah yang sudah dibayar dan yang harus dibayar. */}
                <div
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-[var(--warning-soft)] px-3 py-2.5 md:block md:min-w-[150px] md:bg-transparent md:p-0 md:text-center"
                >
                  <span className="block text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--muted-faint)" }}>
                    Kurang
                    <span className="mt-0.5 block whitespace-nowrap text-[10.5px] font-medium normal-case tracking-normal md:hidden">
                      dari {formatRp(alert.total_nilai_setelah_retur)}
                    </span>
                  </span>
                  <span className="block shrink-0 whitespace-nowrap font-mono text-base font-black tabular-nums min-[400px]:text-lg md:mt-0.5 md:text-base" style={{ color: "var(--warning)" }}>
                    {formatRp(alert.nominal_belum_lunas)}
                  </span>
                </div>

                {/* Dua tombol berbagi lebar sama rata di kaki kartu. Dulu
                    "Nota" menempel di samping angka dan "Catat Pelunasan"
                    turun sendirian ke baris berikutnya, rata kanan, sehingga
                    kartunya tampak berantakan walau isinya cuma tiga hal. */}
                <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 md:flex md:gap-3">
                  <Link
                    href={`/nota/${alert.id}`}
                    className="btn-netral premium-button flex h-11 items-center justify-center gap-1.5 px-4 text-xs md:h-[42px] md:px-3.5"
                  >
                    <FileText className="h-4 w-4" />
                    Nota
                  </Link>

                  <button
                    onClick={() => fileInputs.current[alert.id]?.click()}
                    disabled={isPending}
                    className="btn-primer premium-button flex h-11 cursor-pointer items-center justify-center gap-1.5 px-4 text-xs font-bold disabled:opacity-50 md:h-[42px]"
                  >
                    {loadingId === alert.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Menyimpan
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Catat Pelunasan
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
