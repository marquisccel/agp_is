"use client"

import { useEffect, useState } from "react"
import { denganPemisahRibuan, isianAwal, ketik, ketikRibuan, sinkronDariLuar } from "@/lib/numericField"

/**
 * Isian angka yang menyimpan teks mentah selama diketik.
 *
 * Masalah yang diperbaiki: pola lama menyimpan state sebagai number dan
 * menulis `value={n || ""}` dengan `onChange={parseFloat(v) || 0}`.
 * Akibatnya angka desimal berawalan nol tidak bisa diketik sama sekali:
 *
 *   tekan "0"  -> parseFloat("0") = 0 -> `0 || ""` -> kolom KOSONG
 *   tekan "."  -> kolom sudah kosong, jadi isinya cuma "." -> NaN -> 0
 *   tekan "5"  -> kolom berisi "5"
 *
 * Pengguna bermaksud mengisi 0,5 kg dan yang tercatat 5 kg -- sepuluh
 * kali lipat, tanpa pesan kesalahan apa pun. Karena berat dikalikan
 * harga per kg, salah ketik ini langsung jadi salah rupiah di nota.
 *
 * Perilakunya ada di src/lib/numericField.ts supaya bisa diuji tanpa
 * DOM; komponen ini cuma menyambungkannya ke React.
 */

type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value: number
  onValueChange: (nilai: number) => void
  /**
   * Tampilkan pemisah ribuan ("15.000.000") dan batasi ke bilangan bulat.
   * Dipakai pada kolom nominal rupiah, tempat "15000000" nyaris mustahil
   * dibaca sekali lihat. Lihat hanyaAngkaBulat() untuk alasan desimalnya
   * dimatikan di mode ini.
   */
  pemisahRibuan?: boolean
}

export default function NumberInput({ value, onValueChange, pemisahRibuan = false, ...rest }: Props) {
  const [keadaan, setKeadaan] = useState(() => isianAwal(value))

  // Nilai berubah dari luar (form direset, data dimuat ulang) -> teks
  // ikut ditimpa. Kalau nilainya sama dengan yang sedang diketik, teks
  // dibiarkan supaya "0." tidak terhapus di tengah ketikan.
  useEffect(() => {
    setKeadaan((sekarang) => sinkronDariLuar(sekarang, value))
  }, [value])

  return (
    <input
      {...rest}
      // Sengaja type="text", bukan "number". Pada input number, browser
      // mengembalikan value kosong untuk keadaan setengah jadi seperti
      // "0," -- jadi teks mentahnya tidak pernah sampai ke sini dan
      // desimal tetap mustahil diketik. inputMode="decimal" tetap
      // memunculkan papan tik angka di ponsel.
      type="text"
      inputMode="decimal"
      value={pemisahRibuan ? denganPemisahRibuan(keadaan.teks) : keadaan.teks}
      onChange={(e) => {
        const berikutnya = pemisahRibuan ? ketikRibuan(e.target.value) : ketik(e.target.value)
        setKeadaan(berikutnya)
        onValueChange(berikutnya.nilai)
      }}
    />
  )
}
