/**
 * Header keamanan yang dipasang pada setiap tanggapan.
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
 *
 * ── Kenapa dipindah keluar dari next.config.ts ────────────────────────
 *
 * Pernah terjadi pemisah direktif CSP tertukar dari "; " menjadi baris
 * baru. Akibatnya Node menolak seluruh tanggapan dengan
 * "Invalid character in header content", dan SETIAP halaman jadi 500 --
 * bukan cuma CSP-nya yang tidak berlaku.
 *
 * Yang membuatnya berbahaya: `next build` tetap lolos. Header baru dirakit
 * saat ada permintaan masuk, jadi tidak ada satu pun tahap build yang
 * menyentuhnya. Cacatnya baru terlihat setelah aplikasi berjalan.
 *
 * Di berkas tersendiri, nilainya bisa diuji seperti kode biasa. Tes di
 * tests/securityHeaders.test.ts memeriksa tidak ada karakter yang dilarang
 * pada header HTTP.
 */

export type HeaderKeamanan = { key: string; value: string }

/**
 * Karakter yang tidak boleh muncul di nilai header HTTP: baris baru,
 * carriage return, dan NUL. Node melempar ERR_INVALID_CHAR untuk ketiganya,
 * dan keberadaannya juga membuka celah penyuntikan header.
 */
export const KARAKTER_TERLARANG = /[\r\n\0]/

export function buatSecurityHeaders(produksi: boolean): HeaderKeamanan[] {
  const daftar: HeaderKeamanan[] = [
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
        // Peta lokasi lapak disematkan sebagai iframe ke maps.google.com.
        // Tanpa frame-src, direktif itu jatuh ke default-src 'self' dan
        // SELURUH iframe luar diblokir -- peta tampil sebagai kotak abu
        // bertuliskan "This content is blocked".
        //
        // Tidak pernah ketahuan sampai lama karena data contoh yang dipakai
        // sebelumnya tidak punya koordinat sama sekali, jadi iframe-nya
        // memang tidak pernah dirender.
        //
        // Hanya host peta yang diizinkan, bukan iframe dari mana saja.
        "frame-src https://maps.google.com https://www.google.com",
      ].join("; "),
    },
  ]

  // HSTS hanya dipasang di produksi. Di lingkungan pengembangan yang
  // berjalan di http://localhost, header ini bisa membuat peramban memaksa
  // https dan justru menyulitkan.
  if (produksi) {
    daftar.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    })
  }

  return daftar
}
