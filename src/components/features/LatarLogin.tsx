"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import Image from "next/image"

/**
 * Latar bergambar untuk panel kiri halaman masuk.
 *
 * Seluruh gambar berbaris dalam satu pita mendatar, dan yang digeser
 * adalah pitanya, bukan gambarnya satu per satu.
 *
 * Versi sebelumnya menggeser tiap gambar sendiri-sendiri: yang aktif ke
 * posisi nol, yang ditinggalkan ke minus seratus persen, sisanya
 * diparkir di kanan TANPA transisi. Cara itu menyimpan dua kelemahan.
 * Pertama, gambar yang masuk harus mengubah transform DAN menyalakan
 * transisinya dalam satu perubahan gaya yang sama, dan peramban tidak
 * dijamin menganimasikannya -- kalau gagal, gambarnya meloncat begitu
 * saja. Kedua, pengembalian gambar yang keluar ke posisi parkir
 * bergantung pada setTimeout yang berpacu dengan animasinya; kalau
 * meleset, ada kedipan.
 *
 * Dengan satu pita, transisinya selalu menyala dan tidak ada satu pun
 * elemen yang perlu dikembalikan diam-diam. Untuk perputarannya, gambar
 * pertama DIULANG di ujung pita: setelah geser terakhir mendarat di
 * salinan itu, posisinya dipindah ke gambar pertama yang asli tanpa
 * transisi. Perpindahan itu tidak terlihat karena keduanya gambar yang
 * sama persis.
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
const GESER = 1150

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

  // Salinan gambar pertama di ujung pita, khusus untuk perputarannya.
  const pita = bergerak ? [...gambar, gambar[0]] : gambar
  const langkah = 100 / pita.length

  const [indeks, setIndeks] = useState(0)
  const [mulus, setMulus] = useState(true)
  const frameCadangan = useRef<number | null>(null)

  useEffect(() => {
    if (!bergerak) return
    const jam = setInterval(() => setIndeks((i) => i + 1), JEDA)
    return () => clearInterval(jam)
  }, [bergerak])

  // Setelah mendarat di salinan, posisinya dikembalikan ke gambar
  // pertama yang asli tanpa transisi, lalu transisinya dinyalakan lagi.
  useEffect(() => {
    if (mulus) return
    // Dua frame: satu supaya peramban sempat menggambar keadaan tanpa
    // transisi, satu lagi baru menyalakannya kembali. Kalau hanya satu,
    // keduanya bisa tergabung dalam satu perhitungan gaya dan pitanya
    // terlihat meluncur balik melintasi seluruh gambar.
    const f1 = requestAnimationFrame(() => {
      frameCadangan.current = requestAnimationFrame(() => setMulus(true))
    })
    return () => {
      cancelAnimationFrame(f1)
      if (frameCadangan.current !== null) cancelAnimationFrame(frameCadangan.current)
    }
  }, [mulus])

  const selesaiGeser = () => {
    if (indeks >= pita.length - 1) {
      setMulus(false)
      setIndeks(0)
    }
  }

  const aktif = indeks % gambar.length

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="flex h-full"
        style={{
          width: `${pita.length * 100}%`,
          transform: `translate3d(-${langkah * indeks}%, 0, 0)`,
          transition:
            mulus && bergerak ? `transform ${GESER}ms cubic-bezier(0.65, 0, 0.35, 1)` : "none",
          willChange: "transform",
        }}
        onTransitionEnd={selesaiGeser}
      >
        {pita.map((g, i) => (
          <div key={`${g.berkas}-${i}`} className="relative h-full" style={{ width: `${langkah}%` }}>
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
                  animation:
                    i === indeks && bergerak
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
                     selebar 540px, dan di bawah lg panelnya
                     disembunyikan. Ditulis apa adanya begini supaya
                     peramban memilih berkas seukuran yang benar-benar
                     dipakai; nilai perkiraan seperti 60vw membuatnya
                     memilih yang terlalu kecil lalu gambarnya dibesarkan
                     paksa. */
                  sizes="(max-width: 1023px) 1px, calc(100vw - 540px)"
                  className="object-cover"
                  style={{ objectPosition: g.posisi ?? "50% 50%" }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

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
