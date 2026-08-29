"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Lock, Save, Check, AlertCircle, Eye, EyeOff } from "lucide-react"
import PageHeader from "@/components/ui/PageHeader"
import { pesanError } from "@/lib/pesanError"

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

  /*
   * Isian diisi dari sesi, dan hanya saat sesi yang termuat berganti --
   * bukan setiap kali objek session dibuat ulang oleh NextAuth.
   *
   * Bentuk lamanya memakai useEffect dengan [session] sebagai pemicu.
   * Objek itu bisa berubah identitasnya tanpa isinya berubah, dan setiap
   * kali itu terjadi isian yang sedang diketik pengguna tertimpa kembali
   * ke nilai lama. Sekarang penandanya email pada sesi: ia hanya berubah
   * kalau yang login memang berganti atau profilnya berhasil disimpan.
   */
  const emailSesi = session?.user?.email ?? null
  const [sesiTermuat, setSesiTermuat] = useState<string | null>(null)
  if (session?.user && emailSesi !== sesiTermuat) {
    setSesiTermuat(emailSesi)
    setNama(session.user.name || "")
    setEmail(session.user.email || "")
  }

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
    } catch (err) {
      setProfileError(pesanError(err))
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
    } catch (err) {
      setPwError(pesanError(err))
      setPwStatus("error")
    }
  }

  const role = session?.user?.role || ""

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Pengaturan akun"
        title="Pengaturan Akun"
        description="Kelola profil, keamanan, dan preferensi akun Anda."
      />

      {/* Profile Card */}
      <div className="section overflow-hidden">
        {/* Kepala kartu memakai .section-shell-head seperti seluruh layar
            lain; kotak ikon berwarna dilepas -- ikonnya tidak menerangkan
            apa pun yang belum ditulis judulnya. */}
        <div className="section-shell-head">
          <div>
            <span className="section-eyebrow">Identitas</span>
            <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Informasi Profil</h3>
            <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>Ubah nama tampilan dan alamat email akun.</p>
          </div>
        </div>

        <div className="section-body space-y-5">
          {/* Identitas akun (tanpa avatar -- foto profil dihapus atas permintaan) */}
          <div>
            <p className="font-bold" style={{ color: "var(--foreground)" }}>{nama || "-"}</p>
            <p className="text-xs" style={{ color: "var(--muted-faint)" }}>{email || "-"}</p>
            <span
              className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "var(--bg-tint)", color: "var(--muted)" }}
            >
              {role}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Nama Lengkap</label>
              <input
                type="text"
                value={nama}
                onChange={e => setNama(e.target.value)}
                className="field-input"
                placeholder="Nama lengkap Anda"
              />
            </div>
            <div>
              <label className="field-label">Alamat Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="field-input"
                placeholder="email@domain.com"
              />
            </div>
          </div>

          {profileStatus === "error" && (
            <div className="notice tone-warning text-xs font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" style={{ color: "var(--warning)" }} />
              {profileError}
            </div>
          )}

          <button
            onClick={handleProfileSave}
            disabled={profileStatus === "saving"}
            className="btn-primer premium-button flex items-center gap-2 rounded-[var(--radius-sm)] px-5 py-2.5 text-sm font-bold disabled:opacity-60"
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
      <div className="section overflow-hidden">
        <div className="section-shell-head">
          <div>
            <span className="section-eyebrow">Keamanan</span>
            <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Ubah Password</h3>
            <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>Perbarui kata sandi untuk keamanan akun Anda.</p>
          </div>
        </div>

        <div className="section-body space-y-4">
          {/* Old Password */}
          <div>
            <label className="field-label">Password Lama</label>
            <div className="relative">
              <input
                type={showOld ? "text" : "password"}
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                className="field-input field-icon-kanan"
                placeholder="Masukkan password lama"
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                aria-label="Tampilkan atau sembunyikan kata sandi"
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center" style={{ color: "var(--muted-faint)" }}
              >
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* New Password */}
            <div>
              <label className="field-label">Password Baru</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="field-input field-icon-kanan"
                  placeholder="Minimal 6 karakter"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  aria-label="Tampilkan atau sembunyikan kata sandi"
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center" style={{ color: "var(--muted-faint)" }}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="field-label">Konfirmasi Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="field-input field-icon-kanan"
                  placeholder="Ulangi password baru"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label="Tampilkan atau sembunyikan kata sandi"
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center" style={{ color: "var(--muted-faint)" }}
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
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full transition-all"
                    style={{
                      background: newPassword.length >= i * 3
                        ? newPassword.length >= 10 ? "var(--success)" : newPassword.length >= 6 ? "var(--warning)" : "var(--danger)"
                        : "var(--bg-tint)",
                    }}
                  />
                ))}
              </div>
              <p className="text-[10px]" style={{ color: "var(--muted-faint)" }}>
                {newPassword.length < 6 ? "Terlalu pendek" : newPassword.length < 10 ? "Cukup kuat" : "Sangat kuat"}
              </p>
            </div>
          )}

          {pwStatus === "error" && (
            <div className="notice tone-warning text-xs font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" style={{ color: "var(--warning)" }} />
              {pwError}
            </div>
          )}

          <button
            onClick={handlePasswordSave}
            disabled={pwStatus === "saving"}
            /* Gradasi oranye-kuning membuat tombol ini satu-satunya yang
               berbeda bentuk di seluruh aplikasi, dan warnanya menyiratkan
               bahaya padahal mengganti kata sandi adalah tindakan biasa. */
            className="btn-primer premium-button flex items-center gap-2 rounded-[var(--radius-sm)] px-5 py-2.5 text-sm font-bold disabled:opacity-60"
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

    </div>
  )
}
