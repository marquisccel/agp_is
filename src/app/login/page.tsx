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
            {/* Lambang perusahaan jadi kepala komposisi: cukup besar untuk
                dibaca sebagai identitas, bukan ikon kecil di pojok. */}
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <AgpLogo ukuran={132} kilau className="agp-mark" />
                <span className="agp-alas" />
              </div>
              <p className="mt-6 text-xl font-black leading-none tracking-[-0.03em] text-slate-950">
                Agrapana Greenworks Polymer
              </p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Information System
              </p>
            </div>

            <div className="flex flex-1 items-center justify-center py-10">
              <div className="flex max-w-2xl flex-col items-center text-center">
                <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide" style={{ borderColor: "var(--brand-soft-strong)", background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
                  <ShieldCheck className="h-4 w-4" />
                  Sistem Informasi Gudang Botol
                </div>
                <h1 className="mt-7 max-w-[19ch] text-[54px] font-black leading-[1.02] tracking-[-0.045em] text-slate-950">
                  Kendali pembelian PET dalam satu ruang operasional.
                </h1>
                <p className="mt-5 max-w-[46ch] text-[17px] leading-[1.7] text-slate-500">
                  Pantau input pembelian, verifikasi gudang, approval harga, target collection center,
                  dan aktivitas supplier dengan alur kerja yang lebih tertata.
                </p>

                <div className="mt-11 grid w-full max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-[22px] border border-slate-200/70 bg-slate-200/70 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                  <div className="flex flex-col items-center bg-white/80 p-6 text-center transition-colors hover:bg-white">
                    <Warehouse className="h-5 w-5" style={{ color: "var(--brand-strong)" }} />
                    <p className="mt-3.5 text-sm font-bold tracking-tight text-slate-950">Input</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Pembelian, supplier, dan nota.</p>
                  </div>
                  <div className="flex flex-col items-center bg-white/80 p-6 text-center transition-colors hover:bg-white">
                    <ClipboardCheck className="h-5 w-5" style={{ color: "var(--brand-strong)" }} />
                    <p className="mt-3.5 text-sm font-bold tracking-tight text-slate-950">Validasi</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Admin gudang dan approval manager.</p>
                  </div>
                  <div className="flex flex-col items-center bg-white/80 p-6 text-center transition-colors hover:bg-white">
                    <BarChart3 className="h-5 w-5" style={{ color: "var(--brand-strong)" }} />
                    <p className="mt-3.5 text-sm font-bold tracking-tight text-slate-950">Analitik</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Target, performa, dan risiko.</p>
                  </div>
                </div>
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
