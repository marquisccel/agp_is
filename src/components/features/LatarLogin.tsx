"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import Image from "next/image"

/**
 * Latar bergambar untuk panel kiri halaman masuk.
 *
 * Gambar berganti dengan bergeser ke kiri SAMBIL memudar, dan keduanya
 * saling menimpa, bukan berbaris bersebelahan.
 *
 * Versi sebelumnya memakai pita: seluruh gambar berjajar mendatar lalu
 * pitanya digeser. Hitungannya tepat -- tiap slide persis selebar panel
 * -- tapi hasilnya tetap salah untuk mata. Selama satu detik lebih, dua
 * foto yang sama sekali berbeda berdampingan dengan garis pertemuan
 * yang tajam di tengah panel, dan itu terbaca seperti halaman rusak,
 * bukan seperti pergantian yang disengaja.
 *
 * Sekarang tiap gambar ditumpuk di tempat yang sama. Yang tampil berada
 * di posisi nol dengan opasitas penuh; yang ditinggalkan bergeser
 * sedikit ke kiri sambil menghilang; sisanya menunggu sedikit di kanan
 * dalam keadaan tak terlihat. Pergeserannya tetap terasa, tapi tidak
 * pernah ada dua foto utuh yang terlihat sekaligus.
 *
 * Susunan ini juga menyingkirkan kelemahan versi paling awal. Di sana
 * gambar yang masuk harus mengubah transform DAN menyalakan transisinya
 * dalam satu perubahan gaya yang sama, yang tidak dijamin dianimasikan
 * peramban. Di sini transisi SELALU menyala untuk semua lapis, jadi
 * tidak ada yang perlu dinyalakan mendadak. Gambar yang sudah lewat
 * memang bergerak balik dari kiri ke kanan untuk menunggu giliran
 * berikutnya, tetapi itu terjadi saat opasitasnya sudah nol.
 */


export type GambarLatar = {
  berkas: string
  alt: string
  /**
   * Bagian gambar yang dipertahankan saat dipotong, ditulis seperti
   * nilai object-position CSS.
   *
   * Perhatikan sumbunya. Panel ini nyaris persegi, jadi pada gambar
   * MELEBAR yang berlebih adalah sisi kiri-kanan dan hanya angka
   * pertama yang berpengaruh; pada gambar MENINGGI kebalikannya, hanya
   * angka kedua. Menggeser sumbu yang salah terlihat seperti nilainya
   * tidak berlaku sama sekali.
   */
  posisi?: string
  /**
   * Perbesaran dasar, 1 berarti apa adanya. Dipakai kalau pokok
   * gambarnya terlalu kecil setelah dipotong. Perbesarannya berpusat di
   * tengah bingkai, jadi setelah nilainya diubah, posisi biasanya perlu
   * ditinjau ulang.
   */
  zum?: number
  /**
   * Titik yang tetap diam saat gambar diperbesar, ditulis seperti nilai
   * transform-origin CSS. Bawaannya tengah, yang memotong atas dan bawah
   * sama banyak. Untuk memotong bagian bawah saja -- misalnya membuang
   * kaki dan menyisakan badan -- taruh titiknya di atas, seperti
   * "50% 25%".
   */
  titikZum?: string
}

/** Lama satu gambar bertahan sebelum berganti. */
const JEDA = 6500

/** Lama animasi geser. */
const GESER = 1050

/** Sejauh apa gambar bergeser, dalam persen lebar panel. */
const DORONG = 14

export default function LatarLogin({ gambar }: { gambar: GambarLatar[] }) {
  // Dibaca lewat useSyncExternalStore, bukan disimpan ke state dari
  // dalam effect. matchMedia tidak ada di server, dan cara ini ikut
  // berubah kalau pengaturannya diubah saat halaman terbuka.
  const kurangiGerak = useSyncExternalStore(
    (ubah) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
      mq.addEventListener("change", ubah)
      return () => mq.removeEventListener("change", ubah)
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  )

  const bergerak = gambar.length > 1 && !kurangiGerak

  const [aktif, setAktif] = useState(0)
  const [keluar, setKeluar] = useState<number | null>(null)
  const sebelumnya = useRef(0)

  useEffect(() => {
    if (!bergerak) return
    const jam = setInterval(() => setAktif((i) => (i + 1) % gambar.length), JEDA)
    return () => clearInterval(jam)
  }, [bergerak, gambar.length])

  // Catat gambar mana yang baru ditinggalkan, supaya ia yang bergeser
  // ke kiri. Kalau penghapusannya nanti meleset pun tidak apa-apa:
  // lapis itu sudah tak terlihat, jadi tidak ada yang berkedip.
  useEffect(() => {
    if (sebelumnya.current === aktif) return
    setKeluar(sebelumnya.current)
    sebelumnya.current = aktif
    const jam = setTimeout(() => setKeluar(null), GESER)
    return () => clearTimeout(jam)
  }, [aktif])

  const posisi = (i: number) => {
    if (i === aktif) return "translate3d(0,0,0)"
    if (i === keluar) return `translate3d(-${DORONG}%,0,0)`
    return `translate3d(${DORONG}%,0,0)`
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {gambar.map((g, i) => (
        <div
          key={g.berkas}
          className="absolute inset-0"
          style={{
            transform: posisi(i),
            opacity: i === aktif ? 1 : 0,
            // Transisinya selalu menyala untuk SEMUA lapis, bukan cuma
            // yang sedang bergerak. Itu yang membuat lapis yang masuk
            // tidak perlu menyalakan transisinya mendadak.
            transition: bergerak
              ? `transform ${GESER}ms cubic-bezier(0.33, 0, 0.2, 1), opacity ${GESER}ms cubic-bezier(0.4, 0, 0.3, 1)`
              : "none",
            willChange: "transform, opacity",
          }}
        >
          {/* Perbesaran dasar dipisahkan dari zum lambat di dalamnya,
              karena satu properti transform tidak bisa memuat dua
              gerakan dengan tempo berbeda. */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              transform: `scale(${g.zum ?? 1})`,
              transformOrigin: g.titikZum ?? "center",
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                // Zumnya tetap berjalan pada lapis yang sedang keluar.
                // Kalau dimatikan begitu gilirannya lewat, skalanya
                // meloncat balik ke satu justru saat lapis itu masih
                // terlihat memudar.
                animation:
                  (i === aktif || i === keluar) && bergerak
                    ? `latar-zum ${JEDA + GESER}ms linear forwards`
                    : "none",
              }}
            >
              <Image
                src={g.berkas}
                alt={g.alt}
                fill
                priority={i === 0}
                quality={90}
                /* Panelnya seluruh lebar layar dikurangi kolom form
                   selebar 540px, dan di bawah lg panelnya disembunyikan.
                   Ditulis apa adanya begini supaya peramban memilih
                   berkas seukuran yang benar-benar dipakai; nilai
                   perkiraan seperti 60vw membuatnya memilih yang terlalu
                   kecil lalu gambarnya dibesarkan paksa. */
                sizes="(max-width: 1023px) 1px, calc(100vw - 540px)"
                className="object-cover"
                style={{ objectPosition: g.posisi ?? "50% 50%" }}
              />
            </div>
          </div>
        </div>
      ))}

      {/*
        Dua lapis penggelap, bukan satu. Lapis rata menurunkan seluruh
        gambar supaya tulisan putih punya dasar yang cukup gelap di mana
        pun tulisannya jatuh; lapis gradien menambah gelap di bawah,
        tempat kartu dan baris hak cipta berada, sekaligus menyisakan
        bagian atas tetap terbaca sebagai foto.

        Nadanya hijau kehitaman, bukan hitam netral, supaya menyatu
        dengan warna merek dan tidak terbaca seperti foto yang diredupkan
        seadanya.
      */}
      <div className="absolute inset-0" style={{ background: "rgba(8, 24, 14, 0.48)" }} />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(6,20,11,0.34) 0%, rgba(6,20,11,0.14) 30%, rgba(6,20,11,0.52) 68%, rgba(4,14,8,0.80) 100%)",
        }}
      />

      {/* Penanda gambar keberapa. Batangnya terisi seiring waktu tunggu,
          jadi selain menunjukkan posisi ia juga memberi tahu kapan
          gambarnya akan berganti. */}
      {gambar.length > 1 && (
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-1.5">
          {gambar.map((g, i) => (
            <span
              key={g.berkas}
              className="h-[3px] w-7 overflow-hidden rounded-full"
              style={{ background: "rgba(255,255,255,0.26)" }}
            >
              <span
                className="block h-full rounded-full"
                style={{
                  background: "rgba(255,255,255,0.92)",
                  width: i < aktif ? "100%" : i === aktif ? undefined : "0%",
                  animation:
                    i === aktif && bergerak ? `latar-isi ${JEDA}ms linear forwards` : undefined,
                }}
              />
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
