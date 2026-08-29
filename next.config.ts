import type { NextConfig } from "next";

/**
 * Header keamanan.
 *
 * Sebelumnya tidak ada sama sekali. Untuk sistem berisi catatan keuangan
 * yang dibuka lewat browser, beberapa di antaranya murah tapi menutup
 * kelas serangan yang nyata.
 *
 * Catatan soal CSP: skrip Next disisipkan inline untuk proses hydration,
 * sehingga script-src menuntut 'unsafe-inline' selama belum memakai nonce
 * lewat middleware. CSP yang tetap mengizinkan inline memang tidak
 * menghentikan XSS, tetapi masih menutup hal lain yang berguna --
 * pemuatan skrip/gambar dari domain asing, penyematan halaman ini di
 * dalam iframe situs lain, dan pengiriman form ke luar. Peningkatan ke
 * nonce sebaiknya dilakukan terpisah, bukan berbarengan dengan deploy
 * pertama, karena kesalahan CSP membuat halaman gagal total.
 */
const securityHeaders = [
  // Halaman ini tidak boleh disematkan di situs lain (anti-clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Jangan menebak tipe berkas dari isinya -- relevan karena aplikasi ini
  // melayani unggahan pengguna lewat /api/files.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Jangan bocorkan alamat halaman internal ke situs luar lewat Referer.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Fitur perangkat yang memang tidak dipakai aplikasi ini.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("\n"),
  },
]

// HSTS hanya dipasang di produksi. Di lingkungan pengembangan yang berjalan
// di http://localhost, header ini bisa membuat browser memaksa https dan
// justru menyulitkan.
if (process.env.NODE_ENV === "production") {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  })
}

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
    return [{ source: "/:path*", headers: securityHeaders }]
  },
};

export default nextConfig;
