"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import Image from "next/image"

/**
 * Latar bergambar untuk panel kiri halaman masuk.
 *
 * Gambarnya berganti dengan bergeser ke kiri: yang lama keluar ke kiri,
 * yang baru masuk dari kanan, keduanya bergerak bersamaan sehingga
 * terbaca sebagai satu lembar yang digeser, bukan dua gambar yang
 * saling menimpa.
 *
 * Kenapa hanya dua lapis yang diberi transisi. Sisa gambar diparkir di
 * kanan tanpa transisi, jadi saat gambar yang keluar dikembalikan ke
 * posisi parkir, perpindahannya terjadi di luar layar dan tidak terlihat.
 * Kalau semua lapis diberi transisi, gambar yang baru saja keluar akan
 * terlihat meluncur balik melintasi layar.
 *
 * Gerakan zum lambat (efek Ken Burns) ditaruh di elemen DALAM, terpisah
 * dari elemen yang menggeser. Kalau keduanya di elemen yang sama, satu
 * properti transform harus memuat dua gerakan dengan tempo berbeda dan
 * keduanya saling menimpa.
 */

export type GambarLatar = {
  berkas: string
  alt: string
}

/** Lama satu gambar bertahan sebelum berganti. */
const JEDA = 6500

/** Lama animasi geser. */
const GESER = 1150

export default function LatarLogin({ gambar }: { gambar: GambarLatar[] }) {
  const [aktif, setAktif] = useState(0)
  const [keluar, setKeluar] = useState<number | null>(null)
  const sebelumnya = useRef(0)

  // Dibaca lewat useSyncExternalStore, bukan disimpan ke state dari
  // dalam effect. matchMedia tidak ada di server, jadi kalau nilainya
  // ditulis ke state saat mount, React menandainya sebagai pembaruan
  // beruntun; cara ini membaca nilainya langsung dari sumbernya dan
  // ikut berubah kalau pengaturannya diubah saat halaman terbuka.
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

  useEffect(() => {
    if (!bergerak) return
    const jam = setInterval(() => {
      setAktif((i) => (i + 1) % gambar.length)
    }, JEDA)
    return () => clearInterval(jam)
  }, [bergerak, gambar.length])

  // Catat gambar mana yang baru saja ditinggalkan, supaya ia yang
  // digeser keluar. Ditulis di effect, bukan di dalam pembaru state,
  // agar tidak ada efek samping yang ikut terpanggil dua kali.
  useEffect(() => {
    if (sebelumnya.current === aktif) return
    setKeluar(sebelumnya.current)
    sebelumnya.current = aktif
    const jam = setTimeout(() => setKeluar(null), GESER)
    return () => clearTimeout(jam)
  }, [aktif])

  const posisi = (i: number) => {
    if (i === aktif) return "translate3d(0,0,0)"
    if (i === keluar) return "translate3d(-100%,0,0)"
    return "translate3d(100%,0,0)"
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {gambar.map((g, i) => {
        const sedangBergeser = i === aktif || i === keluar
        return (
          <div
            key={g.berkas}
            className="absolute inset-0"
            style={{
              transform: posisi(i),
              transition: sedangBergeser
                ? `transform ${GESER}ms cubic-bezier(0.65, 0, 0.35, 1)`
                : "none",
              willChange: sedangBergeser ? "transform" : undefined,
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                animation:
                  i === aktif && bergerak
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
              />
            </div>
          </div>
        )
      })}

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
                key={`${g.berkas}-${aktif}`}
                className="block h-full rounded-full"
                style={{
                  background: "rgba(255,255,255,0.92)",
                  width: i < aktif ? "100%" : i === aktif ? undefined : "0%",
                  animation:
                    i === aktif && bergerak
                      ? `latar-isi ${JEDA}ms linear forwards`
                      : undefined,
                  transform: i === aktif && !bergerak ? "none" : undefined,
                }}
              />
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
