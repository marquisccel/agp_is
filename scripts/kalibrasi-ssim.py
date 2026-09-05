# -*- coding: utf-8 -*-
"""
Menghitung SSIM hasil sapuan kualitas, lalu menentukan kualitas yang
dibutuhkan tiap pendekatan untuk mencapai ambang SSIM yang sama.

    python scripts/kalibrasi-ssim.py <folder-hasil-ekstrak-zip> [--target 0.95]

Folder masukan adalah hasil ekstrak zip dari halaman /dashboard/riset,
dengan susunan:

    asli/   nota-01.jpg, nota-02.jpg, ...
    canvas/ q30__nota-01.jpg, q35__nota-01.jpg, ...
    wasm/   q30__nota-01.jpg, q35__nota-01.jpg, ...

── Kenapa kompresinya tidak dikerjakan skrip ini ────────────────────────

Yang dibandingkan penelitian adalah encoder JPEG bawaan peramban dan
MozJPEG yang berjalan sebagai WebAssembly di peramban yang sama. Pustaka
Python memakai encoder JPEG yang berbeda dari keduanya, sehingga kalibrasi
di sini akan menentukan parameter untuk encoder yang tidak pernah dipakai
dalam pengukuran. Karena itu pembagian tugasnya tegas: peramban yang
mengompresi, skrip ini yang menilai.

── Kenapa SSIM dihitung dengan pengaturan tertentu ──────────────────────

structural_similarity dijalankan dengan gaussian_weights=True, sigma=1.5,
dan use_sample_covariance=False. Ketiganya menyesuaikan perhitungan dengan
rumusan asli Wang et al. (2004), yang menjadi rujukan penelitian ini.
Pengaturan bawaan scikit-image memakai jendela seragam 7x7 dan memberi
angka yang berbeda, dan perbedaan itu cukup besar untuk mengubah
kesimpulan kalibrasi.

Dua nilai dihitung sekaligus dan keduanya masuk ke CSV:

    ssimLuma  dihitung pada kanal luminansi saja, yaitu citra diubah ke
              skala abu-abu lebih dahulu. SSIM memang dirumuskan untuk
              citra satu kanal, dan untuk foto nota yang isinya teks hitam
              di atas kertas, luminansi yang menentukan keterbacaan.

    ssimRgb   dihitung pada ketiga kanal warna lalu dirata-ratakan.

Keduanya perlu, dan ini bukan kehati-hatian berlebihan. Encoder JPEG
berbeda dalam cara memperlakukan kanal warna, misalnya seberapa jauh
kanal krominansi dikurangi resolusinya. Perbedaan itu memengaruhi ukuran
berkas tetapi hampir tidak terlihat pada SSIM luminansi. Kalau kalibrasi
hanya memakai luminansi, pendekatan yang menghemat ukuran dengan memangkas
warna tidak akan pernah dikenai biayanya, dan perbandingannya jadi berat
sebelah.
"""

import argparse
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity

PENDEKATAN = ["canvas", "wasm"]
POLA = re.compile(r"^q(\d+)__(.+)\.jpg$", re.IGNORECASE)


def muat_abu(path: Path) -> np.ndarray:
    """Membaca citra sebagai matriks luminansi 8 bit."""
    with Image.open(path) as im:
        return np.asarray(im.convert("L"), dtype=np.uint8)


def muat_warna(path: Path) -> np.ndarray:
    with Image.open(path) as im:
        return np.asarray(im.convert("RGB"), dtype=np.uint8)


def hitung_ssim(acuan: np.ndarray, uji: np.ndarray, kanal_warna: bool = False) -> float:
    if acuan.shape != uji.shape:
        raise ValueError(
            f"dimensi berbeda: acuan {acuan.shape} lawan hasil {uji.shape}. "
            "Pastikan pendekatan kompresinya tidak mengubah ukuran citra."
        )
    return float(
        structural_similarity(
            acuan,
            uji,
            data_range=255,
            gaussian_weights=True,
            sigma=1.5,
            use_sample_covariance=False,
            **({"channel_axis": -1} if kanal_warna else {}),
        )
    )


def kualitas_untuk_target(titik: list[tuple[int, float]], target: float) -> int | None:
    """
    Kualitas terendah yang SSIM-nya mencapai target.

    Titik sapuan berjarak beberapa angka, jadi nilai tepatnya berada di
    antara dua titik. Nilai itu ditaksir dengan interpolasi lurus lalu
    dibulatkan ke atas, karena membulatkan ke bawah berarti menerima citra
    yang SSIM-nya di bawah ambang.
    """
    urut = sorted(titik)
    for (q0, s0), (q1, s1) in zip(urut, urut[1:]):
        if s0 < target <= s1:
            if s1 == s0:
                return q1
            bagian = (target - s0) / (s1 - s0)
            return int(np.ceil(q0 + bagian * (q1 - q0)))
    if urut and urut[0][1] >= target:
        return urut[0][0]
    return None


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("folder", type=Path, help="folder hasil ekstrak zip kalibrasi")
    p.add_argument("--target", type=float, default=None,
                   help="ambang SSIM; kalau tidak diisi, skrip hanya menampilkan kurvanya")
    p.add_argument("--metrik", choices=["luma", "rgb"], default="luma",
                   help="metrik yang dipakai mencocokkan ambang; keduanya tetap masuk CSV")
    p.add_argument("--csv", type=Path, default=Path("kalibrasi-ssim.csv"))
    p.add_argument("--peta", type=Path, default=Path("peta-kualitas.json"))
    arg = p.parse_args()

    folder_asli = arg.folder / "asli"
    if not folder_asli.is_dir():
        print(f"Folder {folder_asli} tidak ada. Sudah diekstrak zipnya?", file=sys.stderr)
        return 1

    acuan: dict[str, np.ndarray] = {}
    acuan_warna: dict[str, np.ndarray] = {}
    for berkas in sorted(folder_asli.iterdir()):
        if berkas.is_file():
            acuan[berkas.stem] = muat_abu(berkas)
            acuan_warna[berkas.stem] = muat_warna(berkas)

    if not acuan:
        print("Tidak ada citra di folder asli.", file=sys.stderr)
        return 1

    print(f"{len(acuan)} citra acuan dimuat.\n")

    baris: list[tuple[str, str, int, float, float, int]] = []
    kurva: dict[str, dict[str, list[tuple[int, float]]]] = {p: {} for p in PENDEKATAN}

    for pendekatan in PENDEKATAN:
        folder = arg.folder / pendekatan
        if not folder.is_dir():
            print(f"Lewat: folder {folder} tidak ada.", file=sys.stderr)
            continue

        for berkas in sorted(folder.iterdir()):
            cocok = POLA.match(berkas.name)
            if not cocok:
                continue
            q = int(cocok.group(1))
            batang = cocok.group(2)
            if batang not in acuan:
                print(f"Lewat: {berkas.name} tidak punya citra acuan.", file=sys.stderr)
                continue

            luma = hitung_ssim(acuan[batang], muat_abu(berkas))
            rgb = hitung_ssim(acuan_warna[batang], muat_warna(berkas), kanal_warna=True)
            baris.append((batang, pendekatan, q, luma, rgb, berkas.stat().st_size))
            dipakai = luma if arg.metrik == "luma" else rgb
            kurva[pendekatan].setdefault(batang, []).append((q, dipakai))

    if not baris:
        print("Tidak ada hasil kompresi yang bisa dinilai.", file=sys.stderr)
        return 1

    with arg.csv.open("w", encoding="utf-8", newline="") as f:
        f.write("berkas,pendekatan,kualitas,ssimLuma,ssimRgb,ukuranByte\n")
        for b, pdk, q, sl, sr, uk in sorted(baris):
            f.write(f"{b},{pdk},{q},{sl:.5f},{sr:.5f},{uk}\n")
    print(f"Kurva lengkap ditulis ke {arg.csv} ({len(baris)} baris).\n")

    # Tanpa target, skrip berhenti di sini. Ambangnya memang harus
    # ditentukan dengan melihat sampai tingkat mana angka pada nota masih
    # terbaca, dan itu keputusan manusia, bukan hasil hitungan.
    if arg.target is None:
        print("Ambang SSIM belum ditentukan.")
        print("Buka beberapa citra hasil pada berbagai tingkat kualitas, tentukan")
        print("SSIM terendah yang angkanya masih terbaca, lalu jalankan ulang")
        print("dengan --target <nilai>.")
        contoh = sorted(kurva["canvas"].keys())[:1]
        for nama in contoh:
            print(f"\nContoh kurva untuk {nama}:")
            for pdk in PENDEKATAN:
                titik = sorted(kurva[pdk].get(nama, []))
                if titik:
                    isi = "  ".join(f"q{q}={s:.3f}" for q, s in titik)
                    print(f"  {pdk:<7} {isi}")
        return 0

    peta: dict[str, dict[str, int]] = {p: {} for p in PENDEKATAN}
    gagal: list[str] = []

    print(f"Kualitas yang dibutuhkan untuk mencapai SSIM {arg.target}:\n")
    print(f"{'berkas':<28} {'canvas':>8} {'wasm':>8}")
    print("-" * 46)

    for nama in sorted(acuan):
        kolom = []
        for pdk in PENDEKATAN:
            q = kualitas_untuk_target(kurva[pdk].get(nama, []), arg.target)
            if q is None:
                kolom.append("  tidak")
                gagal.append(f"{nama} pada {pdk}")
            else:
                peta[pdk][f"{nama}.jpg"] = q
                kolom.append(f"{q:>8}")
        print(f"{nama:<28} {kolom[0]} {kolom[1]}")

    arg.peta.write_text(json.dumps(peta, indent=2), encoding="utf-8")
    print(f"\nPeta kualitas ditulis ke {arg.peta}.")
    print("Tempelkan isinya ke kolom Peta kualitas pada halaman /dashboard/riset.")

    if gagal:
        print("\nAmbang tidak tercapai pada rentang sapuan untuk:", file=sys.stderr)
        for g in gagal:
            print(f"  {g}", file=sys.stderr)
        print("Perluas rentang kualitasnya, lalu jalankan sapuan ulang.", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
