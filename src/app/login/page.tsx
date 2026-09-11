"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { BarChart3, ClipboardCheck, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Warehouse } from "lucide-react"
import AgpLogo from "@/components/ui/AgpLogo"
import LatarLogin, { type GambarLatar } from "@/components/features/LatarLogin"

/*
 * Gambar latar panel kiri.
 *
 * Urutannya sengaja berselang: pemandangan luas, lalu bidikan dekat,
 * lalu orang bekerja. Lima foto sejenis berturut-turut membuat
 * pergantiannya nyaris tidak terasa dan animasinya jadi sia-sia.
 *
 * Berkasnya ada di public/latar-login/. Tambahkan entri di sini setelah
 * berkasnya benar-benar ada, karena berkas yang disebut tapi tidak ada
 * akan meninggalkan celah gelap saat gilirannya tiba.
 */
const GAMBAR_LATAR: GambarLatar[] = [
  {
    berkas: "/latar-login/01-dinding-bal.png",
    alt: "Petugas gudang memeriksa dinding bal botol PET bertumpuk",
    posisi: "88% 50%",
    zum: 1.75,
    titikZum: "50% 26%",
  },
  {
    berkas: "/latar-login/02-cacahan.jpg",
    alt: "Cacahan plastik daur ulang di telapak tangan",
    posisi: "50% 46%",
  },
  {
    berkas: "/latar-login/03-bongkar-karung.jpg",
    alt: "Pekerja menuang botol PET dari karung ke jaring pengumpul",
    posisi: "50% 40%",
  },
  {
    berkas: "/latar-login/04-tumpukan-bal.jpg",
    alt: "Bal botol PET terpres bertumpuk di fasilitas daur ulang",
    posisi: "80% 50%",
    zum: 1.15,
  },
  {
    berkas: "/latar-login/05-angkut-bal.jpg",
    alt: "Dua pekerja memindahkan bal hasil press di dalam gudang",
    posisi: "100% 50%",
  },
]

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [lihatPassword, setLihatPassword] = useState(false)
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
        <section className="relative hidden overflow-hidden lg:flex lg:flex-col" style={{ background: "#0a1a10" }}>
          <LatarLogin gambar={GAMBAR_LATAR} />
          <div className="absolute inset-y-0 right-0 z-10 w-px" style={{ background: "rgba(255,255,255,0.14)" }} />
          <div className="relative z-10 mx-auto flex h-full w-full max-w-[660px] flex-col px-10 py-10 xl:max-w-[760px] 2xl:max-w-[860px]">
            {/* Satu kolom utuh yang ditengahkan secara vertikal. Urutannya:
                pernyataan dulu, baru lambang sebagai jangkar visual, lalu
                rincian. Lambang di tengah komposisi -- bukan di kepala --
                memberi tempat bagi mata untuk berhenti sebelum turun ke
                deretan kartu. */}
            <div className="flex flex-1 flex-col items-center justify-center text-center">

              <div className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] backdrop-blur-md" style={{ borderColor: "rgba(255,255,255,0.28)", background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.94)" }}>
                <ShieldCheck className="h-3.5 w-3.5" />
                Sistem Informasi Pembelian PET
              </div>

              {/* text-balance supaya barisnya terbagi rata, bukan satu baris
                  penuh lalu satu kata menggantung di baris terakhir. */}
              <h1 className="mt-[clamp(14px,2.6vh,26px)] max-w-[18ch] text-balance text-[clamp(34px,4.8vh,54px)] font-black leading-[1.03] tracking-[-0.045em] text-white"
                style={{ textShadow: "0 2px 24px rgba(0,0,0,0.42)" }}>
                Kendali pembelian PET dalam satu ruang operasional.
              </h1>

              {/* Lambang perusahaan. */}
              <div className="relative mt-[clamp(16px,3.4vh,40px)]">
                <span className="agp-pendar" />
                <AgpLogo ukuran="clamp(146px, 25.5vh, 260px)" kedalaman={14} kilau className="agp-mark agp-mark-besar" />
              </div>

              <p className="mt-[clamp(10px,2vh,22px)] text-[clamp(16px,2.2vh,21px)] font-black leading-none tracking-[-0.035em] text-white">
                Agrapana Greenworks Polymer
              </p>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.28em]" style={{ color: "rgba(255,255,255,0.62)" }}>
                Information System
              </p>

              <p className="mt-[clamp(12px,2.4vh,26px)] max-w-[52ch] text-pretty text-[clamp(13.5px,1.9vh,16.5px)] leading-[1.65]" style={{ color: "rgba(255,255,255,0.76)" }}>
                Pantau input pembelian, verifikasi gudang, approval harga, target
                gudang, dan aktivitas supplier dalam satu alur kerja.
              </p>

              <div className="mt-[clamp(16px,3.4vh,44px)] grid w-full grid-cols-3 gap-px overflow-hidden rounded-[20px] border backdrop-blur-xl"
                style={{ borderColor: "rgba(255,255,255,0.20)", background: "rgba(255,255,255,0.16)", boxShadow: "0 18px 48px rgba(0,0,0,0.30)" }}>
                {[
                  { Ikon: Warehouse, judul: "Input", isi: "Pembelian, supplier, dan nota." },
                  { Ikon: ClipboardCheck, judul: "Validasi", isi: "Verifikasi admin dan approval manager." },
                  { Ikon: BarChart3, judul: "Analitik", isi: "Target, performa, dan risiko." },
                ].map(({ Ikon, judul, isi }) => (
                  <div key={judul} className="flex flex-col items-center px-5 py-[clamp(12px,2.5vh,24px)] text-center transition-colors duration-300" style={{ background: "rgba(9,26,16,0.42)" }}>
                    <Ikon className="h-[18px] w-[18px]" style={{ color: "rgba(255,255,255,0.88)" }} />
                    <p className="mt-3.5 text-[13px] font-bold tracking-tight text-white">{judul}</p>
                    <p className="mt-1.5 text-pretty text-[11.5px] leading-[1.5]" style={{ color: "rgba(255,255,255,0.72)" }}>{isi}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-6 text-xs" style={{ borderColor: "rgba(255,255,255,0.16)", color: "rgba(255,255,255,0.66)" }}>
              <span>Internal access only</span>
              <span>&copy; {new Date().getFullYear()} Agrapana Greenworks Polymer</span>
            </div>
          </div>
        </section>

        {/* Di bawah lg panel foto hilang, jadi sisi ini yang memikul seluruh
            kesan pertama. Latarnya diberi gradasi hijau tipis dari atas --
            cukup untuk terasa bermerek tanpa bersaing dengan kartu form --
            dan kolomnya sedikit dipersempit supaya kartu tidak terbaca
            seperti dialog yang memenuhi layar. Tampilan lg ke atas tidak
            berubah. */}
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#e7f1e3_0%,#f3f6f1_38%,#f5f5f7_100%)] px-5 py-10 sm:px-6 lg:bg-none lg:bg-[#f5f5f7] lg:px-10 lg:py-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(3,96,48,0.10),transparent_46%)] lg:bg-[radial-gradient(circle_at_50%_0%,rgba(3,96,48,0.13),transparent_42%),radial-gradient(circle_at_100%_80%,rgba(85,145,51,0.11),transparent_36%)]" />
          {/* Dua aksen cahaya kabur di belakang kartu, khusus ponsel. Tanpa
              sesuatu di belakangnya, lapisan kaca kartu tidak punya apa pun
              untuk dikaburkan dan terbaca sebagai kotak putih biasa. */}
          <div aria-hidden="true" className="pointer-events-none absolute -left-16 top-24 h-56 w-56 rounded-full bg-[rgba(85,145,51,0.22)] blur-3xl lg:hidden" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 bottom-24 h-64 w-64 rounded-full bg-[rgba(3,96,48,0.14)] blur-3xl lg:hidden" />
          {/* Kolom konten mengisi tinggi layar: kartu di tengah, hak cipta di
              dasar. Sebelumnya hak cipta menempel 20px di bawah kartu dan
              ikut melayang di tengah layar bersama kartunya. */}
          <div className="relative flex min-h-[calc(100dvh-5rem)] w-full max-w-[380px] flex-col lg:block lg:min-h-0 lg:max-w-[420px]">
            <div className="my-auto lg:my-0">
            {/* Identitas ponsel: lambang di atas, nama di bawahnya, rata
                tengah. Deretan logo-dan-teks mendatar yang dulu dipakai
                memaksa nama perusahaan yang panjang turun baris di layar
                320px dan lambangnya jadi tampak terlepas di pojok. */}
            <div className="mb-7 flex flex-col items-center text-center lg:hidden">
              <AgpLogo ukuran={56} className="agp-mark" />
              <p className="mt-3 text-[15px] font-black leading-none tracking-[-0.02em] text-slate-950">Agrapana Greenworks Polymer</p>
              <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Information System</p>
            </div>

            {/* Judul untuk lg ke atas tetap di luar kartu seperti semula. */}
            <div className="relative mb-7 hidden lg:block">
              <span className="section-eyebrow">Secure workspace</span>
              <h1 className="mt-3 text-4xl font-black leading-none tracking-[-0.055em] text-slate-950">Masuk ke AGP IS</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Gunakan akun terdaftar untuk membuka panel sesuai role operasional.
              </p>
            </div>

            <div className="kartu-masuk p-6 sm:p-7 lg:p-8">
              {/* Di ponsel judulnya masuk ke kartu: kartunya jadi satu unit
                  utuh di bawah identitas perusahaan, bukan tiga blok lepas
                  (lambang, judul, kartu) yang berebut perhatian. Hanya salah
                  satu dari dua judul ini yang pernah tampil. */}
              <div className="mb-5 text-center lg:hidden">
                <h1 className="text-[22px] font-black leading-tight tracking-[-0.035em] text-slate-950">Masuk ke AGP IS</h1>
                <p className="mt-1 text-[13px] leading-5 text-slate-500">
                  Gunakan akun terdaftar sesuai role operasional.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-5">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5 lg:space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 lg:text-sm lg:font-bold lg:normal-case lg:tracking-normal lg:text-slate-700" htmlFor="email">
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
                      className="field-input field-icon h-11 lg:h-12"
                      placeholder="nama@agp.local"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 lg:space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 lg:text-sm lg:font-bold lg:normal-case lg:tracking-normal lg:text-slate-700" htmlFor="password">
                    Password
                  </label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="password"
                      type={lihatPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="field-input field-icon field-icon-kanan h-11 lg:h-12"
                      placeholder="Masukkan password"
                    />
                    {/* Tombol mata supaya pengguna bisa memeriksa apa yang
                        sudah diketik sebelum menekan Masuk. Sasaran sentuhnya
                        44px penuh, rata kanan di dalam kolom. */}
                    <button
                      type="button"
                      onClick={() => setLihatPassword((v) => !v)}
                      aria-label={lihatPassword ? "Sembunyikan password" : "Tampilkan password"}
                      aria-pressed={lihatPassword}
                      className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition-colors hover:text-slate-600"
                    >
                      {lihatPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primer mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 text-[15px] font-bold tracking-tight shadow-[0_10px_24px_-12px_rgba(48,84,38,0.7)] disabled:cursor-not-allowed disabled:opacity-60 lg:mt-0 lg:text-sm lg:shadow-none"
                >
                  {isLoading && <span className="pemuat h-4 w-4 rounded-full border-2 animate-spin" />}
                  {isLoading ? "Memproses..." : "Masuk"}
                </button>
              </form>

              <div className="mt-5 border-t border-slate-100 pt-4 lg:mt-6 lg:pt-5">
                <div className="flex items-start gap-3 text-xs leading-5 text-slate-500">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--brand-strong)" }} />
                  <p>Akses hanya untuk staff, admin, dan manager yang terdaftar di sistem.</p>
                </div>
              </div>
            </div>

            </div>

            <p className="pt-8 text-center text-xs text-slate-400 lg:hidden">
              &copy; {new Date().getFullYear()} Agrapana Greenworks Polymer
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
