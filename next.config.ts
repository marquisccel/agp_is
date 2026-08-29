import type { NextConfig } from "next";
import { buatSecurityHeaders } from "./src/lib/securityHeaders";

/*
 * Penjagaan NEXTAUTH_URL saat build.
 *
 * NextAuth menyusun URL dasarnya di lingkup modul, dan nilai kosong TIDAK
 * tertangkap oleh fallback-nya: `process.env.NEXTAUTH_URL ?? bawaan` hanya
 * berlaku untuk null dan undefined, sedangkan "" lolos dan berakhir di
 * new URL(""). Yang muncul lalu berupa "TypeError: Invalid URL" dengan
 * jejak tumpukan sepanjang tiga puluh baris ke dalam runtime Turbopack,
 * tanpa satu pun kata yang menyebut NEXTAUTH_URL.
 *
 * Terjadi sungguhan pada deploy pertama ke Vercel: variabelnya terdaftar
 * tapi nilainya kosong, dan build gagal saat memprerender /_not-found --
 * halaman yang tidak ada hubungannya sama sekali dengan autentikasi.
 *
 * Sengaja dilempar, bukan diisi diam-diam dari VERCEL_URL. Nilai yang salah
 * membuat login tampak berhasil lalu melempar pengguna balik ke halaman
 * masuk, dan itu jauh lebih lama dicari daripada build yang gagal terang-
 * terangan di sini.
 */
if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_URL?.trim()) {
  throw new Error(
    [
      "",
      "NEXTAUTH_URL kosong atau tidak diisi.",
      "",
      "Isi dengan URL publik aplikasinya, lengkap dengan https:// dan tanpa",
      "garis miring di akhir. Contoh: https://agp-is.vercel.app",
      "",
      "Di Vercel: Settings > Environment Variables. Pastikan nilainya",
      "benar-benar tersimpan, bukan cuma namanya yang terdaftar.",
      "",
    ].join(String.fromCharCode(10)),
  )
}

const nextConfig: NextConfig = {
  // Menghasilkan .next/standalone (server bundle minimal + node_modules
  // yang benar-benar dipakai) supaya image Docker runtime tidak perlu
  // menyalin seluruh node_modules dari tahap build.
  output: "standalone",

  /*
   * Next 16 mengubah bawaan images.qualities menjadi hanya [75], dan
   * nilai quality di luar daftar ini DIAM-DIAM dibulatkan ke nilai
   * terdekat yang diizinkan. Foto latar halaman masuk ditampilkan
   * selebar panel, jadi 75 meninggalkan pola kotak yang terlihat di
   * bidang langit dan tumpukan botol.
   */
  images: {
    qualities: [75, 90],
  },

  async headers() {
    return [{ source: "/:path*", headers: buatSecurityHeaders(process.env.NODE_ENV === "production") }]
  },
};

export default nextConfig;
