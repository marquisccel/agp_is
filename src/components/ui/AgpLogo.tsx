"use client"

import { useEffect, useRef } from "react"
import {
  DAUN,
  GELAP,
  LEBAR_VB,
  TINGGI_VB,
  WARNA_DAUN,
  WARNA_GELAP,
} from "@/lib/agpLogoPath"

/**
 * Lambang Agrapana Greenworks Polymer, digambar di canvas.
 *
 * Kenapa canvas dan bukan SVG. Ketebalan logo dibuat dengan menumpuk
 * bentuk yang sama sambil digeser turun sedikit demi sedikit. Di SVG
 * tiap salinan adalah elemen tersendiri, jadi masing-masing dihaluskan
 * (anti-alias) sendiri-sendiri dan tepinya bertumpuk jadi serabut halus
 * di sepanjang sisi -- bertambah parah makin banyak salinannya.
 *
 * Di canvas seluruh salinan bisa digabung ke dalam SATU Path2D lalu
 * diisi SEKALI. Penghalusan hanya terjadi di batas luar gabungannya,
 * bukan di tiap salinan, sehingga badan logo keluar sebagai satu bidang
 * padat tanpa jahitan.
 *
 * Pecahan kecil sisa auto-trace sudah dibuang di src/lib/agpLogoPath.ts;
 * kalau tidak, tiap pecahan ikut memanjang jadi serabut tersendiri.
 */

/** Warna badan samping -- satu nada untuk seluruh logo. */
const SISI = "#2a4f2e"

/** Jarak antar salinan penyusun ketebalan, dalam satuan viewBox. */
const LANGKAH = 0.35

/** Lama satu putaran sapuan cahaya, milidetik. */
const PUTARAN = 4600

/** Bagian awal putaran yang dipakai untuk diam sebelum menyapu. */
const JEDA = 0.08

/*
 * Sapuannya sengaja bergerak rata, tanpa perlambatan di ujung. Kurva
 * pelan-cepat-pelan justru mempercepat bagian tengah -- padahal di
 * situlah pita melintasi logo, sehingga cahayanya lewat terlalu cepat
 * untuk sempat terlihat.
 */

/** Kemiringan arah sapuan, derajat dari sumbu mendatar. */
const SUDUT = -62

type Props = {
  /**
   * Lebar logo. Boleh angka (piksel) atau panjang CSS apa pun, termasuk
   * clamp(). Ditulis inline, jadi jangan mengatur lebarnya lewat kelas --
   * gaya inline selalu menang atas kelas dan aturan itu tidak akan
   * pernah berlaku.
   */
  ukuran?: number | string
  /** Kilau yang menyapu permukaan. */
  kilau?: boolean
  /** Tebal badan logo dalam satuan viewBox (0 = rata, tanpa sisi). */
  kedalaman?: number
  className?: string
}

export default function AgpLogo({ ukuran = 120, kilau = false, kedalaman = 0, className }: Props) {
  const lebarCssProp = typeof ukuran === "number" ? `${ukuran}px` : ukuran
  const kanvasRef = useRef<HTMLCanvasElement>(null)
  const tinggiVb = TINGGI_VB + kedalaman + 6

  useEffect(() => {
    const kanvas = kanvasRef.current
    if (!kanvas) return
    const ctx = kanvas.getContext("2d")
    if (!ctx) return

    const daun = new Path2D(DAUN)
    const gelap = new Path2D(GELAP)

    // Bentuk aslinya digambar dalam ruang terbalik dan 10x lebih besar.
    const keDalam = new DOMMatrix().translate(0, TINGGI_VB).scale(0.1, -0.1)

    // Permukaan atas: dua bentuk digabung supaya bisa dipakai sebagai
    // satu pemotong untuk pencahayaan dan kilau.
    const atas = new Path2D()
    atas.addPath(daun, keDalam)
    atas.addPath(gelap, keDalam)

    // Badan samping: SEMUA salinan masuk ke satu jalur, lalu diisi sekali.
    // Ini bagian yang menghapus serabut.
    const kurangiGerak = window.matchMedia("(prefers-reduced-motion: reduce)")

    const badan = new Path2D()
    if (kedalaman > 0) {
      const jumlah = Math.max(2, Math.ceil(kedalaman / LANGKAH))
      for (let i = 0; i <= jumlah; i++) {
        const geser = (kedalaman * i) / jumlah
        const m = new DOMMatrix().translate(0, geser).multiply(keDalam)
        badan.addPath(daun, m)
        badan.addPath(gelap, m)
      }
    }

    // Bagian yang tidak berubah (badan, permukaan, pencahayaan) digambar
    // sekali ke kanvas luar-layar. Kalau semuanya digambar ulang tiap
    // frame, puluhan salinan penyusun ketebalan ikut diisi 60 kali per
    // detik tanpa perlu.
    const dasarBesar = document.createElement("canvas")
    const cDasarBesar = dasarBesar.getContext("2d")
    const maskerBesar = document.createElement("canvas")
    const cMaskerBesar = maskerBesar.getContext("2d")
    const dasar = document.createElement("canvas")
    const cDasar = dasar.getContext("2d")
    const masker = document.createElement("canvas")
    const cMasker = masker.getContext("2d")
    const lapisKilau = document.createElement("canvas")
    const cKilau = lapisKilau.getContext("2d")
    if (!cDasarBesar || !cMaskerBesar || !cDasar || !cMasker || !cKilau) return

    let lebarPiksel = 0
    let tinggiPiksel = 0

    const siapkan = (w: number, h: number) => {
      lebarPiksel = w
      tinggiPiksel = h

      // Digambar berlipat lalu diperkecil. Penghalusan bawaan canvas
      // hanya menilai satu piksel sekali; dengan menggambar beberapa kali
      // lebih besar dan mengecilkannya, tiap piksel akhir merangkum
      // banyak sampel -- tepi miring dan lengkung jadi jauh lebih halus.
      const SS = Math.max(2, Math.round(4 / Math.max(1, window.devicePixelRatio || 1)))
      const wS = w * SS
      const hS = h * SS

      kanvas.width = w
      kanvas.height = h
      lapisKilau.width = w
      lapisKilau.height = h
      for (const el of [dasarBesar, maskerBesar]) {
        el.width = wS
        el.height = hS
      }
      dasar.width = w
      dasar.height = h
      masker.width = w
      masker.height = h
      const k = wS / LEBAR_VB

      // --- kanvas dasar, digambar berlipat ---
      cDasarBesar.setTransform(k, 0, 0, k, 0, 0)
      cDasarBesar.clearRect(0, 0, LEBAR_VB, tinggiVb)
      if (kedalaman > 0) {
        cDasarBesar.fillStyle = SISI
        cDasarBesar.fill(badan, "nonzero")
      }
      cDasarBesar.save()
      cDasarBesar.transform(keDalam.a, keDalam.b, keDalam.c, keDalam.d, keDalam.e, keDalam.f)
      cDasarBesar.fillStyle = WARNA_DAUN
      cDasarBesar.fill(daun, "nonzero")
      cDasarBesar.fillStyle = WARNA_GELAP
      cDasarBesar.fill(gelap, "nonzero")
      cDasarBesar.restore()

      // Pantulan lembut dari kiri atas, hanya di permukaan atas.
      cDasarBesar.save()
      cDasarBesar.clip(atas, "nonzero")
      cDasarBesar.setTransform(1, 0, 0, 1, 0, 0)
      const cahaya = cDasarBesar.createLinearGradient(0, 0, wS, hS)
      cahaya.addColorStop(0, "rgba(255,255,255,0.34)")
      cahaya.addColorStop(0.35, "rgba(255,255,255,0.09)")
      cahaya.addColorStop(0.7, "rgba(11,42,20,0.05)")
      cahaya.addColorStop(1, "rgba(11,42,20,0.18)")
      cDasarBesar.fillStyle = cahaya
      cDasarBesar.fillRect(0, 0, wS, hS)
      cDasarBesar.restore()

      // --- masker permukaan atas, untuk memotong kilau ---
      cMaskerBesar.setTransform(k, 0, 0, k, 0, 0)
      cMaskerBesar.clearRect(0, 0, LEBAR_VB, tinggiVb)
      cMaskerBesar.fillStyle = "#fff"
      cMaskerBesar.fill(atas, "nonzero")

      // Perkecil sekali ke ukuran tampil.
      for (const [ke, dari] of [[cDasar, dasarBesar], [cMasker, maskerBesar]] as const) {
        ke.setTransform(1, 0, 0, 1, 0, 0)
        ke.clearRect(0, 0, w, h)
        ke.imageSmoothingEnabled = true
        ke.imageSmoothingQuality = "high"
        ke.drawImage(dari, 0, 0, wS, hS, 0, 0, w, h)
      }
    }

    const gambar = (waktu: number) => {
      const kotak = kanvas.getBoundingClientRect()
      const lebarCss = kotak.width || 120
      const tinggiCss = (lebarCss * tinggiVb) / LEBAR_VB
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      const w = Math.max(1, Math.round(lebarCss * dpr))
      const h = Math.max(1, Math.round(tinggiCss * dpr))
      if (w !== lebarPiksel || h !== tinggiPiksel) siapkan(w, h)

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(dasar, 0, 0)

      if (!kilau) return

      // Pita cahaya digambar penuh lalu dipotong masker permukaan atas
      // dengan destination-in -- lebih murah daripada clip jalur rumit
      // di tiap frame.
      const putaran = (waktu % PUTARAN) / PUTARAN
      const mentah = Math.max(0, (putaran - JEDA) / (1 - JEDA))
      const maju = kurangiGerak.matches ? 0.5 : mentah
      const rad = (SUDUT * Math.PI) / 180
      const dx = Math.cos(rad)
      const dy = Math.sin(rad)
      // Pita dibuat lebar dan jarak tempuhnya pendek, supaya cahayanya
      // berada di atas logo selama sebagian besar putaran. Versi
      // sebelumnya memakai pita sempit dengan jarak tempuh panjang:
      // secara hitungan menyapu dengan benar, tapi hanya sekitar satu
      // detik dari tiap 3,6 detik yang benar-benar terlihat -- praktis
      // tidak pernah tertangkap mata.
      const jangkauan = (w + h) * 0.62
      const lebarPita = w * 0.8
      const px = w / 2 + (maju * 2 - 1) * jangkauan * dx
      const py = h / 2 + (maju * 2 - 1) * jangkauan * dy

      cKilau.setTransform(1, 0, 0, 1, 0, 0)
      cKilau.globalCompositeOperation = "source-over"
      cKilau.clearRect(0, 0, w, h)
      const pita = cKilau.createLinearGradient(
        px - (dx * lebarPita) / 2,
        py - (dy * lebarPita) / 2,
        px + (dx * lebarPita) / 2,
        py + (dy * lebarPita) / 2,
      )
      // Puncaknya diturunkan dan bahunya dilebarkan: pita yang terlalu
      // putih terbaca sebagai coretan, bukan pantulan cahaya.
      pita.addColorStop(0, "rgba(255,255,255,0)")
      pita.addColorStop(0.18, "rgba(255,255,255,0.04)")
      pita.addColorStop(0.34, "rgba(255,255,255,0.2)")
      pita.addColorStop(0.46, "rgba(255,255,255,0.52)")
      pita.addColorStop(0.5, "rgba(255,255,255,0.66)")
      pita.addColorStop(0.54, "rgba(255,255,255,0.52)")
      pita.addColorStop(0.66, "rgba(255,255,255,0.2)")
      pita.addColorStop(0.82, "rgba(255,255,255,0.04)")
      pita.addColorStop(1, "rgba(255,255,255,0)")
      cKilau.fillStyle = pita
      cKilau.fillRect(0, 0, w, h)
      cKilau.globalCompositeOperation = "destination-in"
      cKilau.drawImage(masker, 0, 0)

      ctx.drawImage(lapisKilau, 0, 0)
    }

    let henti = 0
    let lepas = false

    const putar = (waktu: number) => {
      if (lepas) return
      gambar(waktu)
      henti = requestAnimationFrame(putar)
    }

    // Selalu gambar sekali secara langsung, baru animasinya dijalankan.
    // requestAnimationFrame tidak dipanggil browser saat halamannya tidak
    // sedang digambar (tab latar, mode hemat daya, jendela tersembunyi);
    // kalau logonya hanya mengandalkan rAF, yang tampil kotak kosong.
    gambar(0)
    if (kilau && !kurangiGerak.matches) {
      henti = requestAnimationFrame(putar)
    }

    // Lebar logo diatur lewat clamp terhadap tinggi layar, jadi ukurannya
    // berubah saat jendela diubah -- gambar ulang supaya tetap tajam.
    const pengamat = new ResizeObserver(() => gambar(performance.now()))
    pengamat.observe(kanvas)

    return () => {
      lepas = true
      cancelAnimationFrame(henti)
      pengamat.disconnect()
    }
  }, [kilau, kedalaman, tinggiVb])

  return (
    <canvas
      ref={kanvasRef}
      role="img"
      aria-label="Logo Agrapana Greenworks Polymer"
      className={className}
      style={{ width: lebarCssProp, aspectRatio: `${LEBAR_VB} / ${tinggiVb}`, height: "auto", display: "block" }}
    />
  )
}
