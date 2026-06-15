"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { User, Lock, Globe, Save, Check, AlertCircle, Eye, EyeOff } from "lucide-react"
import PageHeader from "@/components/ui/PageHeader"

const LANGUAGES = [
  { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "en", label: "English", flag: "🇬🇧" },
]

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession()

  // Profile state
  const [nama, setNama] = useState("")
  const [email, setEmail] = useState("")
  const [profileStatus, setProfileStatus] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [profileError, setProfileError] = useState("")

  // Password state
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwStatus, setPwStatus] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [pwError, setPwError] = useState("")

  // Language state
  const [language, setLanguage] = useState("id")

  // Load from session & localStorage
  useEffect(() => {
    if (session?.user) {
      setNama(session.user.name || "")
      setEmail(session.user.email || "")
    }
    const savedLang = localStorage.getItem("petrecycle_lang") || "id"
    setLanguage(savedLang)
  }, [session])

  const handleProfileSave = async () => {
    if (!nama.trim() || !email.trim()) {
      setProfileError("Nama dan email tidak boleh kosong.")
      setProfileStatus("error")
      return
    }
    setProfileStatus("saving")
    setProfileError("")
    try {
      const res = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama, email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan profil.")
      await updateSession({ name: nama, email })
      setProfileStatus("success")
      setTimeout(() => setProfileStatus("idle"), 2500)
    } catch (err: any) {
      setProfileError(err.message)
      setProfileStatus("error")
    }
  }

  const handlePasswordSave = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPwError("Semua kolom password harus diisi.")
      setPwStatus("error")
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError("Password baru dan konfirmasi tidak cocok.")
      setPwStatus("error")
      return
    }
    if (newPassword.length < 6) {
      setPwError("Password baru minimal 6 karakter.")
      setPwStatus("error")
      return
    }
    setPwStatus("saving")
    setPwError("")
    try {
      const res = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal mengubah password.")
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setPwStatus("success")
      setTimeout(() => setPwStatus("idle"), 2500)
    } catch (err: any) {
      setPwError(err.message)
      setPwStatus("error")
    }
  }

  const handleLanguageChange = (code: string) => {
    setLanguage(code)
    localStorage.setItem("petrecycle_lang", code)
  }

  const role = (session?.user as any)?.role || ""

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Account settings"
        title="Pengaturan Akun"
        description="Kelola profil, keamanan, dan preferensi akun Anda."
      />

      {/* Profile Card */}
      <div className="interactive-surface bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Informasi Profil</h3>
            <p className="text-xs text-slate-400">Ubah nama tampilan dan alamat email akun.</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Avatar preview */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-2xl font-extrabold text-white shadow-sm">
              {nama.charAt(0).toUpperCase() || "U"}
            </div>
            <div>
              <p className="font-bold text-slate-800">{nama || "—"}</p>
              <p className="text-xs text-slate-400">{email || "—"}</p>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-600 uppercase tracking-wider mt-1 inline-block">
                {role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Nama Lengkap</label>
              <input
                type="text"
                value={nama}
                onChange={e => setNama(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 outline-none text-slate-800 font-semibold text-sm transition-all"
                placeholder="Nama lengkap Anda"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Alamat Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 outline-none text-slate-800 font-semibold text-sm transition-all"
                placeholder="email@domain.com"
              />
            </div>
          </div>

          {profileStatus === "error" && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-xs font-medium px-4 py-3 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {profileError}
            </div>
          )}

          <button
            onClick={handleProfileSave}
            disabled={profileStatus === "saving"}
            className={`premium-button flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold ${
              profileStatus === "success"
                ? "bg-emerald-500 text-white"
                : "bg-slate-950 text-white hover:bg-slate-800"
            } disabled:opacity-60`}
          >
            {profileStatus === "saving" ? (
              <span>Menyimpan...</span>
            ) : profileStatus === "success" ? (
              <><Check className="w-4 h-4" /> Profil Tersimpan!</>
            ) : (
              <><Save className="w-4 h-4" /> Simpan Profil</>
            )}
          </button>
        </div>
      </div>

      {/* Password Card */}
      <div className="interactive-surface bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Ubah Password</h3>
            <p className="text-xs text-slate-400">Perbarui kata sandi untuk keamanan akun Anda.</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Old Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Password Lama</label>
            <div className="relative">
              <input
                type={showOld ? "text" : "password"}
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-400 outline-none text-slate-800 font-semibold text-sm pr-11 transition-all"
                placeholder="Masukkan password lama"
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Password Baru</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-400 outline-none text-slate-800 font-semibold text-sm pr-11 transition-all"
                  placeholder="Minimal 6 karakter"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Konfirmasi Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-400 outline-none text-slate-800 font-semibold text-sm pr-11 transition-all"
                  placeholder="Ulangi password baru"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Password strength indicator */}
          {newPassword && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1,2,3,4].map(i => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                    newPassword.length >= i * 3
                      ? newPassword.length >= 10 ? "bg-emerald-500" : newPassword.length >= 6 ? "bg-orange-400" : "bg-red-400"
                      : "bg-slate-100"
                  }`} />
                ))}
              </div>
              <p className="text-[10px] text-slate-400">
                {newPassword.length < 6 ? "Terlalu pendek" : newPassword.length < 10 ? "Cukup kuat" : "Sangat kuat"}
              </p>
            </div>
          )}

          {pwStatus === "error" && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-xs font-medium px-4 py-3 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {pwError}
            </div>
          )}

          <button
            onClick={handlePasswordSave}
            disabled={pwStatus === "saving"}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              pwStatus === "success"
                ? "bg-emerald-500 text-white"
                : "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-400 hover:to-amber-400 shadow-md shadow-orange-500/20"
            } disabled:opacity-60`}
          >
            {pwStatus === "saving" ? (
              <span>Mengubah...</span>
            ) : pwStatus === "success" ? (
              <><Check className="w-4 h-4" /> Password Berhasil Diubah!</>
            ) : (
              <><Lock className="w-4 h-4" /> Ubah Password</>
            )}
          </button>
        </div>
      </div>

      {/* Language Card */}
      <div className="interactive-surface bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Pengaturan Bahasa</h3>
            <p className="text-xs text-slate-400">Pilih bahasa tampilan aplikasi yang Anda sukai.</p>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                  language === lang.code
                    ? "border-violet-500 bg-violet-50 shadow-md shadow-violet-500/10"
                    : "border-slate-100 hover:border-slate-200 bg-slate-50"
                }`}
              >
                <span className="text-3xl">{lang.flag}</span>
                <div>
                  <p className={`font-bold text-sm ${language === lang.code ? "text-violet-700" : "text-slate-700"}`}>
                    {lang.label}
                  </p>
                  <p className="text-xs text-slate-400">
                    {language === lang.code ? "✓ Aktif" : "Klik untuk memilih"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
