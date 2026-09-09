"use client"

import { useEffect } from "react"

/**
 * Menyalin judul kolom dari thead ke tiap sel sebagai atribut data-label.
 *
 * ── Kenapa dikerjakan skrip, bukan ditulis di markup ─────────────────
 *
 * Di layar ponsel setiap baris tabel ditampilkan sebagai kartu, dan tiap
 * sel di dalamnya harus membawa nama kolomnya sendiri karena baris judulnya
 * disembunyikan. CSS bisa mencetak nama itu lewat content: attr(data-label),
 * tapi atributnya harus ada lebih dulu.
 *
 * Menuliskannya tangan berarti menambahkan data-label pada sekitar seratus
 * sel di tujuh belas tabel, dan setiap tabel baru sesudah ini harus ingat
 * melakukannya juga. Yang lebih buruk, judul kolom jadi tertulis dua kali di
 * dua tempat: begitu salah satunya diubah, kartunya berbohong tanpa ada yang
 * tahu. Di sini judulnya hanya punya satu sumber, yaitu thead-nya sendiri.
 *
 * ── Kenapa ada penanda ──────────────────────────────────────────────
 *
 * Aturan kartu di globals.css menunggu atribut data-kartu. Tanpa itu, tabel
 * yang sudah jadi kartu tapi belum sempat dilabeli akan tampil sebagai
 * tumpukan angka tanpa keterangan pada saat pertama halaman digambar,
 * sebelum skrip ini jalan. Dengan penanda, tabelnya tetap tabel biasa yang
 * bisa digeser sampai labelnya benar-benar siap.
 *
 * Penandanya atribut, bukan kelas, karena className tabel dipegang React:
 * kelas tambahan bisa hilang saat baris disaring atau halaman data
 * berganti, dan kartunya berkedip jadi tabel sesaat.
 */
export default function PelabelTabel() {
  useEffect(() => {
    // Hanya dibutuhkan pada lebar yang memang menampilkan kartu. Di layar
    // lebar tidak ada gunanya menyalin apa pun, apalagi terus mengamati DOM.
    const ponsel = window.matchMedia("(max-width: 767px)")

    let dijadwalkan = 0

    const labeli = () => {
      dijadwalkan = 0
      for (const tabel of document.querySelectorAll<HTMLTableElement>("table.tabel-lembut")) {
        const judul = Array.from(
          tabel.querySelectorAll<HTMLTableCellElement>(":scope > thead > tr > th"),
        ).map((th) => (th.textContent || "").trim())

        if (judul.length === 0) continue

        for (const baris of tabel.querySelectorAll<HTMLTableRowElement>(":scope > tbody > tr")) {
          Array.from(baris.children).forEach((sel, i) => {
            // Baris kosong ("Belum ada data") memakai colspan dan tidak
            // mewakili satu kolom mana pun.
            if (sel.hasAttribute("colspan")) return
            const nama = judul[i] ?? ""
            if (sel.getAttribute("data-label") !== nama) sel.setAttribute("data-label", nama)
          })
        }

        tabel.setAttribute("data-kartu", "")
      }
    }

    // Penggabungan letupan perubahan DOM memakai setTimeout, bukan
    // requestAnimationFrame. Menyaring satu tabel bisa memicu puluhan mutasi
    // berturut-turut dan keduanya sama-sama menggabungkannya jadi satu jalan,
    // tapi requestAnimationFrame berhenti total selama tab tidak digambar --
    // di tab latar label tidak pernah ditulis, dan tabel yang sudah dijadikan
    // kartu tampil tanpa keterangan begitu tabnya dibuka kembali.
    const jadwalkan = () => {
      if (dijadwalkan) return
      dijadwalkan = window.setTimeout(labeli, 0)
    }

    const bersihkan = () => {
      for (const tabel of document.querySelectorAll("table.tabel-lembut[data-kartu]")) {
        tabel.removeAttribute("data-kartu")
      }
    }

    // Isi tabel berubah setiap kali penyaring, pencarian, atau halaman
    // datanya berganti, dan sel baru datang tanpa label. Yang diamati hanya
    // penambahan simpul; atribut sengaja tidak diamati supaya penulisan
    // data-label di sini tidak memicu dirinya sendiri.
    const pengamat = new MutationObserver(jadwalkan)

    const pasang = () => {
      if (ponsel.matches) {
        // Jalan pertama langsung, bukan dijadwalkan: tabel yang sudah ada di
        // halaman saat komponen ini dipasang harus berlabel sebelum gambar
        // pertama, supaya kartunya tidak sempat tampil polos.
        labeli()
        pengamat.observe(document.body, { childList: true, subtree: true })
      } else {
        pengamat.disconnect()
        bersihkan()
      }
    }

    pasang()
    ponsel.addEventListener("change", pasang)

    return () => {
      ponsel.removeEventListener("change", pasang)
      pengamat.disconnect()
      if (dijadwalkan) window.clearTimeout(dijadwalkan)
    }
  }, [])

  return null
}
