"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { BarChart3, ClipboardCheck, LockKeyhole, Mail, ShieldCheck, Warehouse } from "lucide-react"
import AgpLogo from "@/components/ui/AgpLogo"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      setError("Email atau password salah")
      setIsLoading(false)
    } else {
      window.location.href = "/"
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-slate-900">
      <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_540px]">
        <section className="relative hidden overflow-hidden bg-white/72 backdrop-blur-2xl lg:flex lg:flex-col">
          <div className="absolute inset-y-0 right-0 w-px bg-slate-200" />
          <div className="mx-auto flex h-full w-full max-w-4xl flex-col px-12 py-10 xl:px-16">
            {/* Satu kolom utuh yang ditengahkan secara vertikal. Sebelumnya
                lockup dipatok di atas sementara sisanya ditengahkan, jadi
                menganga ruang kosong besar di antaranya. */}
            <div className="flex flex-1 flex-col items-center justify-center text-center">

              {/* Lambang perusahaan jadi kepala komposisi -- cukup besar
                  untuk dibaca sebagai identitas, bukan ikon di pojok. */}
              <div className="relative">
                <span className="agp-pendar" />
                <AgpLogo ukuran={196} kilau className="agp-mark agp-mark-besar" />
                <span className="agp-alas" />
              </div>

              <p className="mt-[clamp(11px,2.3vh,30px)] text-[clamp(17px,2.4vh,22px)] font-black leading-none tracking-[-0.035em] text-slate-950">
                Agrapana Greenworks Polymer
              </p>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                Information System
              </p>

              <div className="mt-[clamp(13px,3.2vh,42px)] inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ borderColor: "var(--brand-soft-strong)", background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
                <ShieldCheck className="h-3.5 w-3.5" />
                Sistem Informasi Gudang Botol
              </div>

              {/* text-balance supaya barisnya terbagi rata, bukan satu baris
                  penuh lalu satu kata menggantung di baris terakhir. */}
              <h1 className="mt-[clamp(9px,2.1vh,26px)] max-w-[16ch] text-balance text-[clamp(32px,4.6vh,50px)] font-black leading-[1.04] tracking-[-0.045em] text-slate-950">
                Kendali pembelian PET dalam satu ruang operasional.
              </h1>
              <p className="mt-[clamp(8px,1.7vh,22px)] max-w-[44ch] text-pretty text-[clamp(13.5px,1.9vh,16.5px)] leading-[1.65] text-slate-500">
                Pantau input pembelian, verifikasi gudang, approval harga, target
                collection center, dan aktivitas supplier dalam satu alur kerja.
              </p>

              <div className="mt-[clamp(14px,3.6vh,48px)] grid w-full max-w-[560px] grid-cols-3 gap-px overflow-hidden rounded-[20px] border border-slate-200/70 bg-slate-200/70 shadow-[0_16px_44px_rgba(15,23,42,0.055)]">
                {[
                  { Ikon: Warehouse, judul: "Input", isi: "Pembelian, supplier, dan nota." },
                  { Ikon: ClipboardCheck, judul: "Validasi", isi: "Verifikasi admin dan approval manager." },
                  { Ikon: BarChart3, judul: "Analitik", isi: "Target, performa, dan risiko." },
                ].map(({ Ikon, judul, isi }) => (
                  <div key={judul} className="flex flex-col items-center bg-white/85 px-5 py-[clamp(12px,2.5vh,24px)] text-center transition-colors duration-300 hover:bg-white">
                    <Ikon className="h-[18px] w-[18px]" style={{ color: "var(--brand-strong)" }} />
                    <p className="mt-3.5 text-[13px] font-bold tracking-tight text-slate-950">{judul}</p>
                    <p className="mt-1.5 text-pretty text-[11.5px] leading-[1.5] text-slate-500">{isi}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-6 text-xs text-slate-500">
              <span>Internal access only</span>
              <span>&copy; {new Date().getFullYear()} Agrapana Greenworks Polymer</span>
            </div>
          </div>
        </section>

        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f5f7] px-4 py-8 sm:px-6 lg:px-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(3,96,48,0.13),transparent_42%),radial-gradient(circle_at_100%_80%,rgba(85,145,51,0.11),transparent_36%)]" />
          <div className="w-full max-w-[420px]">
            <div className="mb-8 lg:hidden">
              <div className="flex items-center gap-3.5">
                <AgpLogo ukuran={46} className="agp-mark shrink-0" />
                <div>
                  <p className="text-base font-black leading-none tracking-[-0.02em] text-slate-950">Agrapana Greenworks Polymer</p>
                  <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Information System</p>
                </div>
              </div>
            </div>

            <div className="relative mb-7">
              <span className="section-eyebrow">Secure workspace</span>
              <h1 className="mt-3 text-4xl font-black leading-none tracking-[-0.055em] text-slate-950">Masuk ke Information System</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Gunakan akun terdaftar untuk membuka panel sesuai role operasional.
              </p>
            </div>

            <div className="glass-panel rounded-[30px] p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700" htmlFor="email">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="field-input field-icon h-12"
                      placeholder="nama@agp.local"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700" htmlFor="password">
                    Password
                  </label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="field-input field-icon h-12"
                      placeholder="Masukkan password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-invert inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 text-sm font-bold tracking-tight disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading && <span className="pemuat h-4 w-4 rounded-full border-2 animate-spin" />}
                  {isLoading ? "Memproses..." : "Masuk"}
                </button>
              </form>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <div className="flex items-start gap-3 text-xs leading-5 text-slate-500">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--brand-strong)" }} />
                  <p>Akses hanya untuk staff, admin, dan manager yang terdaftar di sistem.</p>
                </div>
              </div>
            </div>

            <p className="mt-5 text-center text-xs text-slate-400 lg:hidden">
              &copy; {new Date().getFullYear()} Agrapana Greenworks Polymer
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
