"use client"

import { useMemo, useState } from "react"

interface Supplier {
  id: string
  nama: string
  kontak_wa: string | null
  frekuensi_ambilan_mingguan: number
  hari_ambilan: string | null
}

export default function PickupReminders({ suppliers }: { suppliers: Supplier[] }) {
  const [dismissed, setDismissed] = useState<string[]>([])

  /*
   * Daftarnya DITURUNKAN dari prop, bukan disalin ke state lewat effect.
   *
   * Bentuk lamanya menyimpan hasil saringan di state lalu mengisinya dari
   * useEffect. Artinya render pertama selalu menampilkan daftar kosong,
   * baru render kedua menampilkan isinya -- kartu pengingat berkedip
   * muncul sesaat setelah halaman tampil. Nilai yang bisa dihitung dari
   * prop tidak perlu jadi state; ia cuma menambah satu salinan yang bisa
   * ketinggalan zaman.
   */
  const reminders = useMemo(() => {
    const indonesianDays = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
    const todayIndex = new Date().getDay()
    const tomorrowIndex = (todayIndex + 1) % 7
    const tomorrowName = indonesianDays[tomorrowIndex].toLowerCase()

    return suppliers.filter(s => {
      if (!s.hari_ambilan) return false
      const days = s.hari_ambilan.split(",").map(d => d.trim().toLowerCase())
      return days.includes(tomorrowName)
    })
  }, [suppliers])

  const formatWaLink = (phone: string, name: string) => {
    let cleanPhone = phone.replace(/[^0-9]/g, "")
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1)
    }
    const message = `Halo ${name}, kami dari gudang ingin mengonfirmasi jadwal ambilan untuk besok. Apakah barangnya siap diambil? Terima kasih.`
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
  }

  const handleDismiss = (id: string) => {
    setDismissed([...dismissed, id])
  }

  const activeReminders = reminders.filter(r => !dismissed.includes(r.id))

  if (activeReminders.length === 0) return null

  return (
    /* Dulu gradasi kuning-oranye dengan ikon lonceng berdenyut. Ini
       pengingat jadwal rutin, bukan kesalahan yang perlu ditindak;
       nadanya diturunkan supaya panel Sisa Termin di layar yang sama
       tetap jadi yang paling menonjol.

       Satu kartu putih; tiap lapak di dalamnya wadah bertint lembut tanpa
       bayangan, bukan kartu bertepi kedua. Dua lapis tepi dan bayangan
       membuat kartu terasa sesak di layar ponsel. */
    <div className="animate-in fade-in rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm duration-300 md:p-6">
      <div className="mb-3 flex items-start gap-3">
        <div className="shrink-0 rounded-xl p-2.5" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.268 21a2 2 0 0 0 3.464 0" />
            <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .738-1.674l-2-2.222A2 2 0 0 1 18 11.778V8c0-3.07-1.64-5.64-4.5-6.32V1.5a1.5 1.5 0 0 0-3 0v.18C7.64 2.36 6 4.92 6 8v3.778c0 .496-.184.978-.52 1.326l-2 2.222z" />
          </svg>
        </div>
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold leading-snug text-slate-900 md:text-lg">
            {/* "(H-1)" dikunci satu kesatuan: tanda hubungnya titik patah
                yang sah, dan tanpa ini judulnya patah jadi "(H-" dan "1)". */}
            Pengingat Jadwal Ambilan Besok <span className="whitespace-nowrap">(H-1)</span>
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">Konfirmasikan jadwal pengambilan barang ke lapak-lapak berikut agar rute armada terencana.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {activeReminders.map(supplier => (
          <div key={supplier.id} className="rounded-2xl border border-slate-100/80 bg-slate-50/80 p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="truncate text-sm font-bold text-slate-900 md:text-base">{supplier.nama}</h4>
                {/* Jadwal sebagai dua pil sejajar di bawah nama. Dulu satu
                    baris teks berikon lalu satu pil di baris sendiri: dua
                    keterangan setara tampil dengan dua bentuk berbeda. */}
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/70 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Hari rutin: {supplier.hari_ambilan}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    {supplier.frekuensi_ambilan_mingguan}x seminggu
                  </span>
                </div>
              </div>

              {/* -mr-2 -mt-2 supaya sasaran sentuhnya 44px tanpa menggeser
                  ikonnya dari sudut kanan atas: yang membesar area ketuknya,
                  bukan tampilannya. */}
              <button
                type="button"
                onClick={() => handleDismiss(supplier.id)}
                className="-mr-2 -mt-2 grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-400 transition-colors hover:text-slate-600"
                title="Sembunyikan sementara"
                aria-label="Sembunyikan pengingat ambilan ini"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Dua lajur sama lebar, 40px (sasaran sentuh 44px lewat
                .sentuh-luas-y). Di bawah 360px huruf "Sudah Konfirmasi"
                turun ke 11px supaya muat di lajurnya. */}
            <div className="mt-3 grid w-full grid-cols-2 gap-2.5">
              {supplier.kontak_wa ? (
                <a
                  href={formatWaLink(supplier.kontak_wa, supplier.nama)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primer sentuh-luas-y flex h-10 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-2 text-xs font-semibold shadow-sm"
                >
                  {/* Lencana bulat hijau WhatsApp (#25D366) + gagang telepon
                      putih -- bentuk resmi ikon WA, supaya langsung dikenali
                      sebagai WA dan bukan ikon telepon generik, walau duduk
                      di atas tombol yang warnanya sendiri juga hijau. */}
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full" style={{ background: "#25D366" }} aria-hidden="true">
                    <svg width="10" height="10" fill="#fff" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.114-2.905-6.99C16.657 1.875 14.18 1.84 11.542 1.84c-5.441 0-9.865 4.422-9.869 9.866-.001 1.702.463 3.364 1.34 4.825l-.995 3.637 3.729-.978zm13.182-7.513c-.08-.135-.296-.216-.621-.378-.324-.162-1.92-.947-2.217-1.055-.297-.108-.513-.162-.73.162-.216.324-.838 1.055-1.027 1.271-.19.216-.379.243-.703.08-.324-.162-1.37-.505-2.61-1.611-.965-.86-1.616-1.923-1.805-2.247-.19-.324-.02-.5-.182-.661-.146-.146-.324-.378-.487-.568-.162-.189-.216-.324-.324-.54-.108-.216-.054-.405-.027-.567.027-.162.216-.513.324-.675.108-.162.148-.27.229-.432.08-.162.04-.324-.013-.486-.054-.162-.513-1.242-.703-1.701-.184-.443-.368-.383-.513-.39-.131-.006-.283-.007-.436-.007-.153 0-.401.057-.611.285-.21.229-.8.783-.8 1.91 0 1.127.82 2.216.933 2.27.113.054 1.611 2.46 3.902 3.45.545.235.97.375 1.3.48.548.174 1.047.15 1.442.09.44-.067 1.35-.55 1.539-1.08.19-.53.19-.983.134-1.08-.053-.095-.21-.153-.53-.315z" />
                    </svg>
                  </span>
                  Hubungi WA
                </a>
              ) : (
                <div className="flex h-10 min-w-0 items-center justify-center whitespace-nowrap rounded-xl border border-slate-200/70 bg-white px-2 text-xs font-medium text-slate-400">
                  WA belum terdaftar
                </div>
              )}

              <button
                type="button"
                onClick={() => handleDismiss(supplier.id)}
                className="sentuh-luas-y flex h-10 min-w-0 items-center justify-center whitespace-nowrap rounded-xl border border-slate-200 bg-white px-1.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-50 min-[360px]:text-xs"
              >
                Sudah Konfirmasi
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
