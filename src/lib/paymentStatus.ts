import type { StatusTone } from "./purchaseStatusLabels"

/**
 * Status PEMBAYARAN sebuah nota, untuk ditampilkan.
 *
 * Masalah yang diperbaiki: kolom `status_pelunasan` di basis data berisi
 * "LUNAS" / "BELUM_LUNAS", tapi artinya bukan "sudah dibayar" -- artinya
 * "dibayar penuh sekaligus" atau "dicicil". Nilai bawaannya pun "LUNAS",
 * sehingga nota yang baru dibuat dan belum sepeser pun ditransfer tetap
 * terbaca LUNAS di layar. Dua hal berbeda memakai satu kata, dan yang
 * terbaca justru yang salah.
 *
 * Di sini keduanya dipisah:
 *
 *   skemaPembayaran()   -> "Penuh" atau "Termin"   (cara membayarnya)
 *   statusPembayaran()  -> sudah dibayar atau belum (kenyataannya)
 *
 * Status pembayaran diturunkan, bukan disimpan: satu-satunya bukti uang
 * sudah berpindah adalah status_approval mencapai "sudah_transfer".
 */

export type SkemaPembayaran = {
  label: "Penuh" | "Termin"
  tone: StatusTone
}

export type StatusPembayaran = {
  label: string
  tone: StatusTone
  /** Sisa yang masih harus dibayar; 0 kalau tidak ada. */
  sisa: number
}

type NotaPembayaran = {
  status_approval: string
  status_pelunasan: string | null
  nominal_belum_lunas: number | null
}

const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`

export function skemaPembayaran(statusPelunasan: string | null | undefined): SkemaPembayaran {
  return statusPelunasan === "BELUM_LUNAS"
    ? { label: "Termin", tone: "warning" }
    : { label: "Penuh", tone: "neutral" }
}

export function statusPembayaran(nota: NotaPembayaran): StatusPembayaran {
  const sisa = nota.status_pelunasan === "BELUM_LUNAS" ? nota.nominal_belum_lunas ?? 0 : 0

  if (nota.status_approval === "dibatalkan") {
    return { label: "Dibatalkan", tone: "neutral", sisa: 0 }
  }

  // Selama belum "sudah_transfer", belum ada uang yang berpindah -- berapa
  // pun isi status_pelunasan.
  if (nota.status_approval !== "sudah_transfer") {
    return { label: "Belum dibayar", tone: "warning", sisa }
  }

  if (sisa > 0) {
    return { label: `Kurang ${rupiah(sisa)}`, tone: "warning", sisa }
  }

  return { label: "Lunas", tone: "success", sisa: 0 }
}
