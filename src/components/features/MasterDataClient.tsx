"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { Search, Trash2, UserPlus } from "lucide-react"
import ElegantSelect from "@/components/ui/ElegantSelect"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { useToast } from "@/components/ui/Toast"
import { namaGudang } from "@/lib/namaGudang"

interface Warehouse { id: string; nama: string; lokasi: string }

/**
 * Pendaftaran akun operasional.
 *
 * Diletakkan di Master Data (halaman khusus Manager) dan bukan sebagai
 * halaman daftar terbuka: field `role` ditentukan pengisi form, sehingga
 * kalau terbuka untuk umum siapa pun bisa mendaftarkan dirinya sebagai
 * MANAGER. Server juga menolak pemanggil non-Manager, jadi pembatasan ini
 * tidak hanya di tampilan.
 */
function FormAkunBaru({ warehouses }: { warehouses: Warehouse[] }) {
  const router = useRouter()
  const { toast, host: toastHost } = useToast()
  const [terbuka, setTerbuka] = useState(false)
  const [nama, setNama] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("STAFF")
  const [warehouseId, setWarehouseId] = useState("")
  const [loading, setLoading] = useState(false)

  const butuhGudang = role !== "MANAGER"

  const reset = () => {
    setNama(""); setEmail(""); setPassword(""); setRole("STAFF"); setWarehouseId("")
  }

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (butuhGudang && !warehouseId) {
      toast("Staff dan Admin wajib ditugaskan ke satu gudang.", "error")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama, email, password, role, warehouseId: butuhGudang ? warehouseId : null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal membuat akun")
      toast(`Akun ${data.nama} (${data.role}) berhasil dibuat.`)
      reset()
      setTerbuka(false)
      router.refresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), "error")
    } finally {
      setLoading(false)
    }
  }

  if (!terbuka) {
    return (
      <>
        {toastHost}
        <button
          type="button"
          onClick={() => setTerbuka(true)}
          className="premium-button btn-primer flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"
        >
          <UserPlus className="h-4 w-4" />
          Daftarkan Akun Baru
        </button>
      </>
    )
  }

  return (
    <form onSubmit={simpan} className="section section-body space-y-4">
      {toastHost}
      <h3 className="text-sm font-bold text-slate-900">Daftarkan Akun Baru</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="field-label">Nama Lengkap</span>
          <input
            required value={nama} onChange={(e) => setNama(e.target.value)}
            className="field-input"
          />
        </label>

        <label className="space-y-1.5">
          <span className="field-label">Email</span>
          <input
            required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="field-input"
          />
        </label>

        <label className="space-y-1.5">
          <span className="field-label">Password</span>
          <input
            required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
            className="field-input"
          />
          <span className="block text-[11px] text-slate-400">Minimal 8 karakter.</span>
        </label>

        <div className="space-y-1.5">
          <span className="field-label">Role</span>
          <ElegantSelect
            value={role}
            onChange={(v) => { setRole(v); if (v === "MANAGER") setWarehouseId("") }}
            ariaLabel="Pilih role akun"
            className="w-full"
            options={[
              { value: "STAFF", label: "Staff" },
              { value: "ADMIN", label: "Admin" },
              { value: "MANAGER", label: "Manager" },
            ]}
          />
        </div>

        {butuhGudang && (
          <div className="space-y-1.5 sm:col-span-2">
            <span className="field-label">Gudang Penugasan</span>
            <ElegantSelect
              value={warehouseId}
              onChange={setWarehouseId}
              ariaLabel="Pilih gudang penugasan"
              className="w-full"
              options={[
                { value: "", label: "Pilih gudang" },
                ...warehouses.map(w => ({ value: w.id, label: w.nama })),
              ]}
            />
          </div>
        )}
      </div>

      {/* Batal berdampingan dengan Buat Akun. Sebelumnya ia menyendiri di
          pojok kanan atas, sejajar judul dan jauh dari tombol simpan --
          dari sana tidak jelas apa yang dibatalkan: formulirnya, satu
          isian, atau seluruh halaman. Dua tombol yang mengakhiri formulir
          yang sama seharusnya berdiri berdampingan. */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="premium-button btn-primer rounded-xl px-6 py-2.5 text-sm font-bold disabled:opacity-70"
        >
          {loading ? "Menyimpan..." : "Buat Akun"}
        </button>
        <button
          type="button"
          onClick={() => { reset(); setTerbuka(false) }}
          disabled={loading}
          className="premium-button btn-netral rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-50"
        >
          Batal
        </button>
      </div>
    </form>
  )
}


interface SupplierStat {
  id: string
  nama: string
  kontak_wa: string | null
  link: string | null
  latitude: number | null
  longitude: number | null
  transactionStatus: string
  target_bulanan_kg: number
  warehouseId: string | null
  warehouse: { id: string; nama: string } | null
  totalTransaksi: number
  totalSelesai: number
  totalNilai: number
  totalKg: number
  lastPurchase: string | null
}
interface UserData {
  id: string
  nama: string
  email: string
  role: string
  aktif: boolean
  warehouseId: string | null
  warehouse: { id: string; nama: string } | null
}
interface GlobalStats {
  totalPurchases: number
  totalCompleted: number
  totalNilai: number
  totalKg: number
  totalSuppliers: number
  totalWarehouses: number
  totalGreenSuppliers: number
  totalRedSuppliers: number
  totalMapReadySuppliers: number
}

type Tab = "overview" | "pengguna"

function fmtRp(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} Jt`
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
}

/** "82%" dari sebagian dan keseluruhannya; "0%" kalau pembaginya nol. */
function persen(bagian: number, total: number) {
  if (!total) return "0%"
  return `${Math.round((bagian / total) * 100)}%`
}

function fmtKg(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(2)} ton`
  return `${n.toFixed(1)} KG`
}

/**
 * Daftar pengguna, dengan dua aksi yang sengaja dibedakan.
 *
 * Sebelumnya tabel ini hanya bisa dibaca: Manager bisa mendaftarkan akun
 * baru tapi tidak bisa mencabut satu pun. Akun yang salah ketik emailnya,
 * akun contoh bawaan, dan akun orang yang sudah berhenti bekerja semuanya
 * menumpuk permanen -- dan yang terakhir itu berarti mantan pegawai masih
 * bisa masuk.
 *
 * Nonaktifkan ditampilkan sebagai aksi utama, hapus sebagai aksi kecil di
 * sampingnya. Itu bukan kebetulan: untuk hampir semua akun sungguhan,
 * nonaktifkan adalah jawaban yang benar. Server juga menolak menghapus akun
 * yang sudah punya jejak, jadi urutan ini cuma menyelaraskan tampilan
 * dengan aturan yang sudah ditegakkan di belakang.
 */
/**
 * Satu kolom di kartu Komposisi.
 *
 * Angkanya berdiri paling besar, persentasenya menempel di sebelahnya
 * dengan ukuran lebih kecil -- keduanya menerangkan hal yang sama, jadi
 * kalau sama besar mata harus memilih mana yang dibaca lebih dulu.
 */
function KomposisiKolom({
  warna,
  label,
  nilai,
  sisi,
  sub,
  bergaris = false,
}: {
  warna: string
  label: string
  nilai: number
  sisi: string
  sub: string
  /** Garis pemisah di kiri; tidak dipasang pada kolom pertama. */
  bergaris?: boolean
}) {
  return (
    <div
      className={`px-5 py-1 sm:px-6${bergaris ? " sm:border-l" : ""}`}
      style={bergaris ? { borderColor: "var(--border)" } : undefined}
    >
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: warna }} aria-hidden="true" />
        <span className="field-label" style={{ marginBottom: 0 }}>{label}</span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-2xl font-black leading-none tabular-nums" style={{ color: warna }}>{nilai}</span>
        <span className="font-mono text-xs font-bold tabular-nums" style={{ color: "var(--muted-faint)" }}>{sisi}</span>
      </div>
      <p className="mt-1 text-[11px]" style={{ color: "var(--muted-faint)" }}>{sub}</p>
    </div>
  )
}

function TabelPengguna({ users }: { users: UserData[] }) {
  const router = useRouter()
  const { confirm, dialog } = useConfirm()
  const { toast, host: toastHost } = useToast()
  const [sedangProses, setSedangProses] = useState<string | null>(null)

  const ubahStatus = async (user: UserData) => {
    const menonaktifkan = user.aktif
    if (menonaktifkan) {
      const ok = await confirm({
        title: `Nonaktifkan akun ${user.nama}?`,
        description:
          "Akun ini tidak bisa masuk lagi, tapi seluruh riwayat transaksi dan " +
          "jejak auditnya tetap tersimpan. Bisa diaktifkan kembali kapan saja.",
        tone: "danger",
        confirmLabel: "Ya, nonaktifkan",
      })
      if (!ok) return
    }

    setSedangProses(user.id)
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktif: !user.aktif }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal mengubah status akun")
      toast(data.message)
      router.refresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), "error")
    } finally {
      setSedangProses(null)
    }
  }

  const hapus = async (user: UserData) => {
    const ok = await confirm({
      title: `Hapus akun ${user.nama} secara permanen?`,
      description:
        "Hanya bisa untuk akun yang belum pernah dipakai sama sekali. Kalau akun " +
        "ini sudah punya transaksi atau jejak audit, penghapusan akan ditolak dan " +
        "kamu diminta menonaktifkannya saja.",
      tone: "danger",
      confirmLabel: "Ya, hapus",
    })
    if (!ok) return

    setSedangProses(user.id)
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal menghapus akun")
      toast(data.message)
      router.refresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), "error")
    } finally {
      setSedangProses(null)
    }
  }

  return (
    <>
      {dialog}
      {toastHost}
      <div className="section overflow-hidden">
        <table className="tabel-lembut text-sm">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th>Role</th>
              <th>Gudang</th>
              <th className="kolom-aksi">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={5} className="py-10 text-center" style={{ color: "var(--muted-faint)" }}>Tidak ada pengguna yang cocok.</td></tr>
            ) : users.map((user) => {
              const sibuk = sedangProses === user.id
              return (
                <tr key={user.id} style={user.aktif ? undefined : { opacity: 0.55 }}>
                  <td className="font-bold" style={{ color: "var(--foreground)" }}>
                    {user.nama}
                    {/* Penanda hanya muncul saat ada yang perlu dilihat.
                        Akun aktif tidak diberi pil "Aktif" -- itu keadaan
                        normal, dan memberinya label justru membuat yang
                        nonaktif jadi sulit ditemukan di antara semuanya. */}
                    {!user.aktif && (
                      <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider" style={{ background: "var(--bg-tint)", color: "var(--warning)" }}>
                        Nonaktif
                      </span>
                    )}
                  </td>
                  <td className="font-mono text-xs" style={{ color: "var(--muted)" }}>{user.email}</td>
                  <td><span className="rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider" style={{ borderColor: "var(--border)", background: "var(--bg-tint)", color: "var(--muted)" }}>{user.role}</span></td>
                  <td style={{ color: "var(--muted)" }}>{user.warehouse?.nama || "-"}</td>
                  <td className="kolom-aksi">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => ubahStatus(user)}
                        disabled={sibuk}
                        className="premium-button btn-netral px-3 py-1.5 text-xs disabled:opacity-50"
                      >
                        {user.aktif ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                      {/* Ikon saja, tanpa tulisan. Menghapus akun jauh lebih
                          jarang dan jauh lebih berat akibatnya daripada
                          menonaktifkan, jadi ia tidak boleh tampil sama
                          menonjol. Judulnya tetap ada lewat title dan
                          aria-label supaya maksudnya tidak hilang bagi yang
                          memakai pembaca layar. */}
                      <button
                        type="button"
                        onClick={() => hapus(user)}
                        disabled={sibuk}
                        className="grid h-8 w-8 place-items-center rounded-lg transition-colors disabled:opacity-40"
                        style={{ color: "var(--danger)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tint)" }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
                        title={`Hapus akun ${user.nama}`}
                        aria-label={`Hapus akun ${user.nama}`}
                      >
                        <Trash2 size={15} strokeWidth={2.2} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default function MasterDataClient({
  warehouses,
  suppliers,
  users,
  globalStats,
}: {
  warehouses: Warehouse[]
  suppliers: SupplierStat[]
  users: UserData[]
  globalStats: GlobalStats
}) {
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [searchUser, setSearchUser] = useState("")
  const [filterRole, setFilterRole] = useState("all")

  /* Tab Lapak dan Harga SKU dibuang. Keduanya cuma cermin: daftar lapak
     sudah ada di menu Data Lapak dengan grade, filter, import koordinat,
     dan penghapusan, sedangkan harga SKU di sini hanya bisa dilihat
     padahal halaman Harga Standar SKU sudah bisa mengubahnya.

     Halaman itu dulu terkubur di balik satu tombol di Analytics, dan
     itulah sebab tab yang cuma bisa dilihat ini pernah dibuat. Sekarang
     halamannya ada di sidebar, jadi tirunya tidak dibutuhkan lagi. */
  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Ringkasan" },
    { id: "pengguna", label: "Pengguna" },
  ]

  const filteredUsers = users.filter((user) => {
    const matchSearch = user.nama.toLowerCase().includes(searchUser.toLowerCase()) ||
      user.email.toLowerCase().includes(searchUser.toLowerCase())
    const matchRole = filterRole === "all" || user.role === filterRole
    return matchSearch && matchRole
  })

  return (
    <div className="space-y-6">
      {/* Tab memakai .segmented, sama dengan pemilih di dashboard Manager
          dan filter di Data Lapak -- sebelumnya kotak hitam pekat di atas
          panel kaca buram, satu-satunya pola seperti itu di aplikasi. */}
      <div className="segmented" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? "active" : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div key={activeTab} className="soft-enter">
      {activeTab === "overview" && (
        <div className="space-y-5">
          {/* Empat angka utama saja. Sebelumnya sembilan kartu berukuran
              sama berjejer 3x3 -- tanpa hierarki, dan sebagian isinya
              turunan atau sudah tampil di tempat lain: jumlah Collection
              Center terbaca dari daftarnya sendiri di bawah, dan status
              hijau/merah lapak sudah jadi badge di tab Lapak. */}
          <div className="stat-strip">
            <div className="stat-tile">
              <span className="stat-label">Total Transaksi</span>
              <div className="stat-value-row">
                <span className="stat-value">{globalStats.totalPurchases.toLocaleString("id-ID")}</span>
              </div>
              <span className="stat-delta flat">{globalStats.totalCompleted} selesai transfer</span>
            </div>
            <div className="stat-tile">
              <span className="stat-label">Tonase Selesai</span>
              <div className="stat-value-row">
                <span className="stat-value">{fmtKg(globalStats.totalKg)}</span>
              </div>
              <span className="stat-delta flat">Seluruh gudang</span>
            </div>
            <div className="stat-tile">
              <span className="stat-label">Nilai Transaksi</span>
              <div className="stat-value-row">
                <span className="stat-value">{fmtRp(globalStats.totalNilai)}</span>
              </div>
              <span className="stat-delta flat">Approved dan transfer</span>
            </div>
            <div className="stat-tile">
              <span className="stat-label">Penyelesaian</span>
              <div className="stat-value-row">
                <span className="stat-value">
                  {globalStats.totalPurchases > 0 ? `${((globalStats.totalCompleted / globalStats.totalPurchases) * 100).toFixed(0)}%` : "0%"}
                </span>
              </div>
              <span className="stat-delta flat">Transaksi selesai</span>
            </div>
          </div>

          {/* Komposisi lapak: satu baris, bukan tiga kartu terpisah. Hijau,
              merah, dan berkoordinat adalah pecahan dari satu angka yang
              sama, jadi lebih terbaca sebagai proporsi daripada sebagai
              tiga angka yang berdiri sendiri. */}
          <section className="section">
            <div className="section-shell-head">
              <div>
                <span className="section-eyebrow">Komposisi</span>
                <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Lapak Terdaftar</h3>
              </div>
              <div className="text-right">
                <span className="field-label" style={{ marginBottom: 2 }}>Total</span>
                <span className="text-base font-extrabold" style={{ color: "var(--foreground)", fontVariantNumeric: "tabular-nums" }}>
                  {globalStats.totalSuppliers.toLocaleString("id-ID")} lapak
                </span>
              </div>
            </div>
            {/* Tiga kolom datar, dipisah garis tipis, tanpa kotak sendiri.

                Dua bentuk sebelumnya sama-sama meleset. Bar bertumpuk
                hijau-merah keliru karena "Berkoordinat" bukan bagian dari
                pembagian yang sama -- satu lapak bisa aktif SEKALIGUS belum
                berkoordinat. Penggantinya, pita statistik, keliru karena
                bentuknya persis sama dengan pita empat angka tepat di
                atasnya: dua pita bertepi menempel bertumpuk, dan yang
                terbaca justru satu blok yang saling tindih.

                Bentuk ini sengaja TIDAK memakai kotak bertepi. Ia bagian
                dalam dari satu kartu, bukan pita yang berdiri sendiri, jadi
                garis pemisah setipis satu pixel sudah cukup memisahkan
                ketiganya tanpa menambah tepi baru di layar. */}
            <div className="section-body">
              <div className="grid grid-cols-1 sm:grid-cols-3">
                <KomposisiKolom
                  warna="var(--success)"
                  label="Aktif"
                  nilai={globalStats.totalGreenSuppliers}
                  sisi={persen(globalStats.totalGreenSuppliers, globalStats.totalSuppliers)}
                  sub="sudah bertransaksi"
                />
                <KomposisiKolom
                  warna="var(--danger)"
                  label="Belum aktif"
                  nilai={globalStats.totalRedSuppliers}
                  sisi={persen(globalStats.totalRedSuppliers, globalStats.totalSuppliers)}
                  sub={globalStats.totalRedSuppliers > 0 ? "perlu aktivasi" : "semua sudah aktif"}
                  bergaris
                />
                <KomposisiKolom
                  warna="var(--muted-faint)"
                  label="Berkoordinat"
                  nilai={globalStats.totalMapReadySuppliers}
                  sisi={persen(globalStats.totalMapReadySuppliers, globalStats.totalSuppliers)}
                  sub="siap dipetakan"
                  bergaris
                />
              </div>
            </div>
          </section>

          <div>
            {/* Di sebelah tabel ini dulu ada kartu "Lapak Teratas" berisi 5
                lapak. Dibuang karena kartu Top 10 Lapak di Analytics sudah
                memuat 10 dan bisa dipilah menurut volume atau harga, dan
                menu Data Lapak memuat semuanya lengkap dengan grade. Kartu
                yang isinya bagian kecil dari layar lain cuma menambah
                tempat untuk dicek tanpa menambah keterangan.

                Bentuk tabel dipertahankan: Performa Gudang membandingkan
                beberapa besaran sekaligus (jumlah lapak, transaksi, tonase,
                nilai) untuk tiga gudang saja, dan yang dicari pembacanya
                angka, bukan proporsi. */}
            <section className="section">
              <div className="section-shell-head">
                <div>
                  <span className="section-eyebrow">Per gudang</span>
                  <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Performa Gudang</h3>
                </div>
              </div>
              <table className="tabel-lembut text-sm">
                <thead>
                  <tr>
                    <th>Gudang</th>
                    <th className="angka-tabel">Lapak</th>
                    <th className="angka-tabel">Transaksi</th>
                    <th className="angka-tabel">Tonase</th>
                    <th className="angka-tabel">Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouses
                    .map((warehouse) => {
                      const wSuppliers = suppliers.filter((supplier) => supplier.warehouseId === warehouse.id)
                      return {
                        warehouse,
                        jumlahLapak: wSuppliers.length,
                        kg: wSuppliers.reduce((sum, x) => sum + x.totalKg, 0),
                        nilai: wSuppliers.reduce((sum, x) => sum + x.totalNilai, 0),
                        trx: wSuppliers.reduce((sum, x) => sum + x.totalSelesai, 0),
                      }
                    })
                    .sort((a, b) => b.kg - a.kg)
                    .map((baris) => (
                      <tr key={baris.warehouse.id}>
                        <td className="font-bold" style={{ color: "var(--foreground)" }}>{namaGudang(baris.warehouse.nama)}</td>
                        <td className="angka-tabel">{baris.jumlahLapak}</td>
                        <td className="angka-tabel">{baris.trx}</td>
                        <td className="angka-tabel" style={{ color: "var(--foreground)", fontWeight: 700 }}>{fmtKg(baris.kg)}</td>
                        <td className="angka-tabel">{fmtRp(baris.nilai)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </section>
          </div>
        </div>
      )}


      {activeTab === "pengguna" && (
        <div className="space-y-4">
          <FormAkunBaru warehouses={warehouses} />

          <FilterBar>
            <SearchBox value={searchUser} onChange={setSearchUser} placeholder="Cari nama atau email..." />
            <ElegantSelect
              value={filterRole}
              onChange={setFilterRole}
              ariaLabel="Filter role pengguna"
              className="w-full sm:w-48"
              options={[
                { value: "all", label: "Semua Role" },
                { value: "MANAGER", label: "Manager" },
                { value: "ADMIN", label: "Admin" },
                { value: "STAFF", label: "Staff" },
              ]}
            />
          </FilterBar>

          <TabelPengguna users={filteredUsers} />
        </div>
      )}

      </div>
    </div>
  )
}


function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="section section-body">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {children}
      </div>
    </div>
  )
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-input field-icon"
      />
    </div>
  )
}

