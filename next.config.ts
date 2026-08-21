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
    ].join("; "),
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

const nextConfig: NextConfig = {
  // Menghasilkan .next/standalone (server bundle minimal + node_modules
  // yang benar-benar dipakai) supaya image Docker runtime tidak perlu
  // menyalin seluruh node_modules dari tahap build.
  output: "standalone",

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
};

export default nextConfig;
