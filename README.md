# AGP IS

**AGP IS** (Agrapana Greenworks Polymer Information System) adalah sistem informasi internal PT Agrapana Greenworks Polymer untuk mengelola pembelian PET dari lapak, lintas gudang, dari pencatatan di lapangan sampai uangnya benar-benar ditransfer dan tercatat lunas.

Satu kalimat inti: **setiap rupiah yang keluar punya jejak siapa yang mencatat, siapa yang memverifikasi, dan siapa yang menyetujui.**

| | |
|---|---|
| Versi | 0.1.0 |
| Runtime | Node.js 20.9+ |
| Basis data | PostgreSQL 16 |
| Status | Siap diuji coba (pra-produksi) |

---

## Daftar Isi

1. [Untuk Manager: mencoba dalam 10 menit](#untuk-manager-mencoba-dalam-10-menit)
2. [Peran dan wewenang](#peran-dan-wewenang)
3. [Struktur website](#struktur-website)
4. [Alur kerja pembelian](#alur-kerja-pembelian)
5. [Arsitektur](#arsitektur)
6. [Struktur kode](#struktur-kode)
7. [Pemasangan lengkap](#pemasangan-lengkap)
8. [Pemakaian sehari-hari](#pemakaian-sehari-hari)
9. [Bila ada masalah](#bila-ada-masalah)
10. [Pemeriksaan sebelum rilis](#pemeriksaan-sebelum-rilis)
11. [Dokumen lain](#dokumen-lain)

---

## Untuk Manager: mencoba dalam 10 menit

Bagian ini ditujukan untuk mencoba sistemnya di laptop sendiri, tanpa perlu tahu cara kerja programnya. Ikuti urut dari atas.

### Yang perlu dipasang lebih dulu (cukup sekali)

| Perangkat | Untuk apa | Unduh |
|---|---|---|
| **Node.js LTS** (versi 20.9 ke atas) | menjalankan aplikasinya | [nodejs.org](https://nodejs.org), pilih **LTS** |
| **Docker Desktop** | menjalankan basis datanya tanpa pemasangan rumit | [docker.com](https://www.docker.com/products/docker-desktop/) |
| **Git** | mengunduh kode ini | [git-scm.com](https://git-scm.com/) |

Setelah Docker Desktop terpasang, **buka aplikasinya sekali** dan biarkan berjalan di latar belakang. Kalau ikonnya belum menyala, langkah 3 di bawah akan gagal.

### Enam perintah

Buka Terminal (macOS) atau Git Bash (Windows), lalu jalankan satu per satu. Tunggu tiap perintah selesai sebelum lanjut ke berikutnya.

**1. Ambil kodenya**

```bash
git clone <url-repo-ini> && cd agp_is
```

**2. Pasang seluruh pustaka yang dibutuhkan** (1 sampai 3 menit)

```bash
npm install
```

**3. Nyalakan basis data**

```bash
docker compose up -d
```

**4. Buat berkas pengaturan**

```bash
cp .env.example .env
```

Buka berkas `.env` yang baru terbentuk dengan Notepad atau TextEdit, lalu ubah **dua hal** saja:

- Ganti setiap tulisan `ganti-dengan-password-kuat` dengan satu kata sandi bebas, misalnya `rahasia123`. Kata sandi ini hanya dipakai di laptop sendiri. Tulisan itu muncul di dua baris (`POSTGRES_PASSWORD` dan di dalam `DATABASE_URL`), dan keduanya **harus sama persis**.
- Ganti `replace-with-a-long-random-secret` pada `NEXTAUTH_SECRET` dengan teks acak panjang, minimal 32 huruf. Boleh mengetik asal-asalan, misalnya `kunciacakuntukujicoba1234567890abcd`.

Sisanya biarkan apa adanya. Bagian penyimpanan berkas (`S3_*`) memang sengaja dikosongkan: selama kosong, bukti transfer disimpan di folder lokal, dan itu sudah cukup untuk uji coba.

**5. Siapkan tabel dan isi data contoh**

```bash
npx prisma migrate dev && npm run seed
```

**6. Jalankan**

```bash
npm run dev
```

Tunggu sampai terminal menampilkan `Ready in ...`, lalu buka **<http://localhost:3000>** di peramban.

### Masuk sebagai Manager

```text
Email      : manager@example.com
Kata sandi : password123
```

Akun lain yang ikut terpasang, semuanya berkata sandi `password123`:

| Peran | Email | Gudang |
|---|---|---|
| Manager | `manager@example.com` | seluruh gudang |
| Admin | `admin.kediri@example.com` | Kediri |
| Admin | `admin.madiun@example.com` | Madiun |
| Admin | `admin.malang@example.com` | Malang |
| Staff | `staff.kediri@example.com` | Kediri |
| Staff | `staff.madiun@example.com` | Madiun |
| Staff | `staff.malang@example.com` | Malang |

### Urutan yang enak untuk melihat-lihat

Kalau ingin merasakan sistemnya bekerja utuh, coba jalur ini. Setiap langkah butuh keluar lalu masuk lagi dengan akun berbeda.

1. **Masuk sebagai Staff Kediri.** Buka **Input Pembelian**, pilih satu lapak, isi SKU, berat, dan harga. Perhatikan keterangan **standar harga** yang muncul di bawah kolom harga. Isi harga di atas angka itu dengan sengaja, lalu simpan.
2. **Masuk sebagai Admin Kediri.** Buka **Double Check**. Nota tadi menunggu di sana. Isi timbangan gudang (kolomnya sengaja dibiarkan kosong supaya angkanya benar-benar hasil menimbang, bukan salinan angka lapak), lalu simpan.
3. **Masuk sebagai Manager.** Buka **Approval Harga**. Nota tadi tertahan di sini karena harganya di atas standar. Setujui atau tolak.
4. Masih sebagai Manager, buka **Analytics**. Nota tadi sudah ikut terhitung di rekap gudang.
5. Buka **Audit Trail**. Seluruh langkah di atas tercatat lengkap dengan nama pelakunya dan waktunya.

Selesai. Untuk menghentikan: tekan `Ctrl+C` di terminal, lalu jalankan `docker compose stop`.

---

## Peran dan wewenang

Sistem ini punya tiga peran. Pembagiannya bukan sekadar soal menu, melainkan soal **pemisahan tugas**: orang yang mencatat pembelian bukan orang yang memverifikasi, dan orang yang memverifikasi bukan orang yang menyetujui harga di atas standar.

### Staff (petugas lapangan gudang)

Mencatat apa yang terjadi di lapak. Cakupannya terbatas pada gudangnya sendiri.

- Membuat nota pembelian: memilih lapak, mengisi SKU, berat lapak, dan harga per kg
- Mendaftarkan lapak baru dan menyunting datanya, termasuk titik lokasi
- Mengajukan kasbon (DP) untuk lapak
- Melihat daftar nota yang **ia sendiri** buat, beserta statusnya

Tidak bisa: memverifikasi notanya sendiri, menyetujui harga, menyetujui kasbon, atau melihat data gudang lain.

### Admin (verifikator gudang)

Menjadi mata kedua atas apa yang dicatat Staff. Cakupannya juga satu gudang.

- **Double Check**: menimbang ulang di gudang dan mencatat hasilnya, sehingga susut atau lebih bisa dihitung
- Menyunting nota gudangnya bila ada salah catat
- Melihat seluruh nota gudangnya, dengan pencarian dan penyaring
- Mencatat transfer pembayaran dan pelunasannya, termasuk pelunasan bertahap
- Membetulkan nota yang terlanjur ditandai lunas padahal belum, lewat jalur **Koreksi**

Tidak bisa: membuat nota pembelian, menyetujui harga di atas standar, menyetujui kasbon, atau melihat gudang lain. Batas gudang ini ditegakkan di server, bukan sekadar disembunyikan dari menu.

### Manager

Melihat seluruh gudang sekaligus dan memegang setiap keputusan yang berdampak uang.

- **Approval Harga**: memutuskan nota yang harganya melampaui standar
- **Approval DP**: memutuskan pengajuan kasbon
- Menetapkan **standar harga per SKU per gudang** dan **target** gudang
- Mengelola data induk: pengguna, gudang, dan SKU
- Melihat analitik lintas gudang: susut, rekap DP, biaya, capaian target
- Mencatat transfer dan pelunasan langsung, tanpa harus menitipkannya ke Admin
- Membaca **Audit Trail** dan mengunduh laporan periode

Akun baru hanya dapat dibuat oleh Manager, lewat **Master Data → Pengguna**.

### Ringkasan wewenang

| Kegiatan | Staff | Admin | Manager |
|---|:--:|:--:|:--:|
| Membuat nota pembelian | ya | tidak | tidak |
| Double check timbangan gudang | tidak | ya | tidak |
| Menyunting nota | miliknya, sebelum verifikasi | segudang | seluruh gudang |
| Menyetujui harga di atas standar | tidak | tidak | ya |
| Mengajukan kasbon | ya | tidak | tidak |
| Menyetujui kasbon | tidak | tidak | ya |
| Mencatat transfer dan pelunasan | tidak | ya | ya |
| Koreksi nota yang salah lunas | tidak | ya | ya |
| Menetapkan standar harga SKU | tidak | tidak | ya |
| Menetapkan target gudang | tidak | tidak | ya |
| Mengelola pengguna dan gudang | tidak | tidak | ya |
| Melihat lintas gudang | tidak | tidak | ya |
| Membaca audit trail | tidak | tidak | ya |

---

## Struktur website

Menu yang tampil menyesuaikan peran yang sedang masuk. Alamat di kolom kanan bisa dibuka langsung, tetapi tetap dijaga di server: membuka alamat milik peran atau gudang lain akan ditolak, bukan sekadar tidak muncul di menu.

### Staff

| Menu | Alamat | Isi |
|---|---|---|
| Input Pembelian | `/dashboard/staff` | form nota baru, ringkasan capaian target hari ini |
| Data Lapak | `/dashboard/staff/suppliers` | daftar lapak gudangnya, tambah dan sunting, titik lokasi |
| Pengajuan Kasbon | `/dashboard/staff/dp` | daftar kasbon dan pengajuan baru |
| Daftar Transaksi | `/dashboard/staff/history` | nota yang ia buat, beserta status dan notanya |
| Pengaturan | `/dashboard/settings` | profil dan ganti kata sandi |

### Admin

| Menu | Alamat | Isi |
|---|---|---|
| Double Check | `/dashboard/admin` | antrean nota gudangnya yang menunggu verifikasi |
| (rincian) | `/dashboard/admin/check/[id]` | form timbang ulang per SKU, lengkap dengan standar harga |
| Data Lapak | `/dashboard/staff/suppliers` | sama seperti Staff, terbatas gudangnya |
| Daftar Transaksi | `/dashboard/admin/history` | seluruh nota gudangnya, dengan pencarian dan penyaring |
| (sunting) | `/dashboard/admin/edit/[id]` | perbaikan nota gudangnya |
| Transfer Pembayaran | `/dashboard/admin/transfer` | pencatatan transfer, pelunasan bertahap, koreksi |
| Pengaturan | `/dashboard/settings` | profil dan ganti kata sandi |

### Manager

| Menu | Alamat | Isi |
|---|---|---|
| Analytics | `/dashboard/manager` | rekap lintas gudang, capaian target, biaya, peringatan |
| Analisis Susut | `/dashboard/manager/susut` | susut dan lebih per gudang dan per lapak |
| Rekap DP | `/dashboard/manager/dp` | sisa kasbon per lapak, seluruh gudang dalam satu daftar |
| Approval Harga | `/dashboard/manager/approval-harga` | antrean nota berharga di atas standar |
| (rincian) | `/dashboard/manager/approval-harga/[id]` | perbandingan harga diajukan dan standar, per SKU |
| Approval DP | `/dashboard/manager/approval-dp` | antrean pengajuan kasbon |
| Master Data | `/dashboard/manager/master-data` | pengguna, gudang, SKU |
| Standar Harga SKU | `/dashboard/manager/sku-prices` | penetapan standar harga per SKU per gudang |
| Setting Target | `/dashboard/manager/targets` | target harian dan bulanan per gudang |
| Data Lapak | `/dashboard/manager/suppliers` | seluruh lapak, riwayat status, peta lokasi |
| (rincian) | `/dashboard/manager/suppliers/[id]` | kinerja satu lapak, grade, riwayat transaksi |
| Daftar Transaksi | `/dashboard/manager/history` | seluruh nota lintas gudang |
| (rincian) | `/dashboard/manager/purchases/[id]` | rincian satu nota, pembayaran, dan bukti |
| Transfer Pembayaran | `/dashboard/manager/transfer` | pencatatan transfer dan pelunasan langsung |
| Audit Trail | `/dashboard/manager/audit-trail` | seluruh perubahan, dapat disaring dan diunduh CSV |
| Laporan | `/dashboard/manager/reports` | laporan periode, siap cetak |
| Pengaturan | `/dashboard/settings` | profil dan ganti kata sandi |

### Halaman di luar dashboard

| Alamat | Isi |
|---|---|
| `/login` | halaman masuk |
| `/nota/[id]` | nota yang dapat dilihat dan diunduh sebagai PDF |

---

## Alur kerja pembelian

```text
                 ┌──────────────────────────────────────────────┐
                 │ STAFF                                        │
                 │ Input Pembelian: lapak, SKU, berat, harga     │
                 └──────────────────┬───────────────────────────┘
                                    │ status: menunggu_verifikasi
                                    ▼
                 ┌──────────────────────────────────────────────┐
                 │ ADMIN (gudang yang sama)                     │
                 │ Double Check: timbang ulang di gudang         │
                 └──────────────────┬───────────────────────────┘
                                    │
                   ┌────────────────┴────────────────┐
     harga wajar   │                                 │  ada harga di atas standar
                   ▼                                 ▼
      status: approved                  status: menunggu_approval_harga
                   │                                 │
                   │                    ┌────────────┴────────────┐
                   │                    │ MANAGER                 │
                   │                    │ Approval Harga          │
                   │                    └────────────┬────────────┘
                   │                        setuju   │   tolak
                   │                                 │     └──▶ status: rejected
                   └─────────────┬───────────────────┘
                                 ▼
                 ┌──────────────────────────────────────────────┐
                 │ ADMIN atau MANAGER                           │
                 │ Transfer Pembayaran: unggah bukti            │
                 │ nilai transfer = nilai nota  -  potongan DP  │
                 └──────────────────┬───────────────────────────┘
                                    │ status: sudah_transfer
                                    ▼
                    pelunasan: BELUM  →  SEBAGIAN  →  LUNAS
                                    │
                                    └── keliru? jalur Koreksi mengembalikannya
```

Beberapa aturan yang melekat pada alur di atas:

- **Timbangan gudang tidak pernah terisi otomatis.** Angka Staff disalin ke kedua kolom saat nota dibuat. Kalau kolom gudang ikut terisi lebih dulu, laporan "Sesuai" akan melaporkan kecocokan yang sebenarnya tidak pernah ditimbang. Kolom itu sengaja dibiarkan kosong sampai Admin mengisinya.
- **Harga di atas standar tetap boleh dicatat.** Standar harga bukan larangan, melainkan pemicu persetujuan. Ada kalanya harga pasar memang naik, dan sistem tidak boleh memaksa orang lapangan berbohong agar notanya lolos.
- **Lapak berubah status menjadi aktif (GREEN) hanya oleh peristiwa nyata**: lolos double check, disetujui Manager, atau harganya disetujui. Bukan karena disunting manual.
- **Kasbon (DP) memotong nilai transfer, bukan nilai nota.** Nota 30 juta dengan kasbon 15 juta berarti 15 juta yang ditransfer, dan sisa kewajiban terhadap lapak tetap terlacak sampai lunas.
- **Setiap perubahan tercatat di audit trail**, termasuk siapa, kapan, nilai sebelum, dan nilai sesudah.

---

## Arsitektur

### Gambaran lapisan

```text
 Peramban
    │
    │  HTML hasil render server + sebagian kecil komponen interaktif
    ▼
┌──────────────────────────────────────────────────────────────┐
│  Next.js 16 (App Router)                                     │
│                                                              │
│  next.config.ts ── header keamanan untuk seluruh alamat      │
│        │                                                     │
│        ├─ Server Component  ── memeriksa sesi dan peran,     │
│        │   (app/dashboard/**/page.tsx)  lalu mengambil data  │
│        │                                 dari basis data     │
│        │                                                     │
│        ├─ Client Component  ── form, saringan, grafik        │
│        │   (components/features/**)                          │
│        │                                                     │
│        └─ Route Handler     ── seluruh penulisan data        │
│            (app/api/**/route.ts)   memeriksa sesi dan peran  │
└──────────────────────────┬───────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   ┌─────────┐      ┌────────────┐    ┌───────────────┐
   │ NextAuth│      │ Prisma ORM │    │ Object Storage│
   │  (JWT)  │      │            │    │  (S3 / lokal) │
   └─────────┘      └─────┬──────┘    └───────────────┘
                          ▼               bukti transfer,
                  ┌───────────────┐       nota pelunasan
                  │  PostgreSQL   │
                  └───────────────┘
```

### Keputusan rancangan dan alasannya

**Baca lewat Server Component, tulis lewat Route Handler.** Halaman mengambil datanya sendiri di server tanpa lewat API, sehingga tidak ada lapisan JSON yang perlu dipelihara dua kali. Sebaliknya, seluruh perubahan data melewati `app/api/**`, karena di sanalah pemeriksaan wewenang, validasi, dan pencatatan audit dipusatkan. Kalau penulisan tersebar di banyak tempat, satu jalur yang lupa mencatat audit sudah cukup membuat jejaknya bolong.

**Wewenang diperiksa di server, bukan di menu.** Menu yang menyesuaikan peran hanya soal kenyamanan. Setiap halaman dan setiap route handler memeriksa ulang peran dan gudang pemiliknya. Ini pernah terbukti perlu: halaman double check dulu tidak memeriksa kepemilikan gudang, dan meski penyimpanannya ditolak, nama lapak, nama staff, SKU, berat, serta harga gudang lain sudah terbaca hanya dengan menebak alamat.

**Perhitungan uang tinggal di `src/lib`, bukan di komponen.** Modul seperti `settlement.ts`, `purchaseCalculation.ts`, dan `dpAllocation.ts` berisi aritmetika murni tanpa React, sehingga bisa diuji langsung dan tidak menggandakan diri di beberapa layar. Rumus kewajiban terhadap lapak di `settlement.ts` sengaja dibuat sama persis dengan yang dipakai `scripts/audit-data.mjs`, supaya pemeriksa data tidak pernah berbeda pendapat dengan aplikasinya.

**Tampilan bertumpu pada CSS custom property, bukan warna bawaan Tailwind.** Seluruh warna, radius, dan bayangan berasal dari token di `:root`. Alasannya sederhana: kalau tiap layar memilih warnanya sendiri, hijau di satu halaman perlahan berbeda dengan hijau di halaman lain. Aturan yang dipegang: **warna mengikuti keadaan, bukan kategori.** Susut nol tampil netral, bukan merah; antrean kosong tampil netral, bukan kuning. Warna juga tidak pernah menjadi satu-satunya pembawa arti, selalu ada kata atau ikon pendampingnya.

**Angka uang diketik sebagai teks, bukan `input type="number"`.** Kolom angka bawaan peramban menyembunyikan keadaan setengah jadi seperti `0.`, dan itu pernah membuat nilai terbaca sepuluh kali lipat. Komponen `NumberInput` memakai `type="text"` dengan `inputMode="decimal"` dan pemisah ribuan, sehingga yang terlihat sama dengan yang tersimpan.

### Keamanan

- Sesi berupa JWT NextAuth, diperiksa di setiap halaman dan setiap route handler lewat `getServerSession`
- Kata sandi disimpan sebagai hash bcrypt
- Pembatasan percobaan masuk untuk memperlambat tebakan beruntun
- Header keamanan dipasang di `next.config.ts` untuk seluruh alamat, termasuk Content Security Policy, `X-Frame-Options`, dan `Strict-Transport-Security`
- Bukti transfer disajikan lewat `/api/files/[...key]` yang memeriksa sesi lebih dulu, bukan sebagai berkas statis terbuka
- Seluruh perubahan data tercatat di tabel audit beserta nilai lama dan barunya

---

## Struktur kode

```text
agp_is/
├─ prisma/
│  ├─ schema.prisma          skema basis data
│  └─ migrations/            riwayat perubahan skema
│
├─ src/
│  ├─ app/
│  │  ├─ api/                seluruh penulisan data
│  │  │  ├─ purchases/       draft, double-check, approve-harga,
│  │  │  │                   transfer, settle, reopen
│  │  │  ├─ dp/              pengajuan dan persetujuan kasbon
│  │  │  ├─ suppliers/       lapak dan titik lokasinya
│  │  │  ├─ manager/         ekspor, standar harga SKU, impor koordinat
│  │  │  ├─ targets/         target gudang
│  │  │  ├─ users/           pengelolaan akun
│  │  │  ├─ files/           penyaji berkas berpenjaga sesi
│  │  │  └─ health/          pemeriksaan kesehatan untuk pemantauan
│  │  │
│  │  ├─ dashboard/
│  │  │  ├─ staff/           layar peran Staff
│  │  │  ├─ admin/           layar peran Admin
│  │  │  ├─ manager/         layar peran Manager
│  │  │  └─ settings/        profil, dipakai seluruh peran
│  │  │
│  │  ├─ login/
│  │  ├─ nota/[id]/          nota yang dapat dicetak
│  │  └─ globals.css         token rancangan dan kelas bersama
│  │
│  ├─ components/
│  │  ├─ features/           komponen terikat satu alur kerja
│  │  ├─ ui/                 komponen dasar yang dipakai berulang
│  │  └─ layout/             kerangka halaman dan navigasi
│  │
│  └─ lib/                   aturan bisnis tanpa React
│
├─ next.config.ts            header keamanan untuk seluruh alamat
│
├─ scripts/
│  ├─ audit-data.mjs         pemeriksa keutuhan data
│  └─ backup-db.sh           pencadangan basis data
│
├─ tests/                    uji unit aritmetika dan aturan
├─ smoke/                    uji asap terhadap API
├─ e2e/                      uji ujung ke ujung dengan Playwright
└─ docs/                     catatan per fase dan panduan pasang di VPS
```

### Modul di `src/lib` yang paling sering disentuh

| Berkas | Tanggung jawab |
|---|---|
| `settlement.ts` | pelunasan bertahap, koreksi, kewajiban terhadap lapak |
| `purchaseCalculation.ts` | nilai nota, susut dan lebih, potongan |
| `dpAllocation.ts` | pemakaian kasbon terhadap nota |
| `paymentStatus.ts` | penentuan keadaan pembayaran suatu nota |
| `purchaseStatus.ts` | daftar status yang dianggap aktif atau menunggu |
| `supplierStatus.ts` | perpindahan status lapak beserta pemicunya |
| `workingDays.ts` | hari kerja dan hari libur nasional untuk perhitungan target |
| `roles.ts` | pengelompokan peran operasional |
| `audit.ts` | penulisan jejak audit di dalam transaksi basis data |
| `objectStorage.ts` | penyimpanan berkas, S3 bila diatur, folder lokal bila tidak |

---

## Pemasangan lengkap

Bagian [Untuk Manager](#untuk-manager-mencoba-dalam-10-menit) di atas sudah cukup untuk uji coba. Bagian ini menjelaskan hal-hal yang perlu diketahui bila ikut mengembangkan.

### Berkas `.env`

| Kunci | Wajib | Keterangan |
|---|:--:|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | ya | dibaca `docker-compose.yml` saat membuat basis data |
| `DATABASE_URL` | ya | harus memakai kata sandi yang sama dengan `POSTGRES_PASSWORD` |
| `NEXTAUTH_URL` | ya | di produksi harus URL publik sebenarnya, bukan localhost |
| `NEXTAUTH_SECRET` | ya | teks acak panjang, buat dengan `openssl rand -base64 32` |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION` | di produksi | bila kosong, berkas jatuh ke `./storage/uploads`. Di produksi berkasnya akan hilang tiap kali container dipasang ulang |
| `ALERT_WEBHOOK_URL` | tidak | tujuan pemberitahuan galat, dibatasi satu kiriman per menit |

### Perintah yang tersedia

| Perintah | Kegunaan |
|---|---|
| `npm run dev` | menjalankan dalam mode pengembangan |
| `npm run build` | membangun untuk produksi, sekaligus `prisma generate` |
| `npm start` | menjalankan hasil build |
| `npm run seed` | mengisi ulang data contoh, aman diulang |
| `npm run lint` | pemeriksaan gaya kode |
| `npm test` | uji unit aritmetika dan aturan bisnis |
| `npm run test:smoke` | uji asap terhadap API yang sedang berjalan |
| `npm run test:e2e` | uji ujung ke ujung dengan Playwright |
| `npm run audit:data` | pemeriksaan keutuhan data di basis data |

---

## Pemakaian sehari-hari

Setelah pemasangan awal selesai satu kali, hari-hari berikutnya cukup:

```bash
docker compose up -d
npm run dev
```

Menghentikan:

```bash
docker compose stop
```

Aplikasinya sendiri dihentikan dengan `Ctrl+C` di terminal yang menjalankannya, sebelum perintah di atas.

Data tidak hilang saat `docker compose stop`, karena tersimpan di volume Docker. Untuk benar-benar mengosongkan dan mulai dari nol:

```bash
docker compose down -v
```

Setelah itu ulangi `docker compose up -d`, `npx prisma migrate dev`, lalu `npm run seed`.

---

## Bila ada masalah

**`P1001: Can't reach database server`**
Basis datanya belum menyala atau belum siap. Jalankan `docker compose up -d`, tunggu beberapa detik, cek `docker compose ps` sampai kolom `STATUS` berbunyi `healthy`, baru ulangi perintah yang gagal.

**`ECONNREFUSED 127.0.0.1:5432`, atau port 5432 sudah terpakai**
Ada PostgreSQL lain yang sudah berjalan di komputer yang sama. Matikan layanan itu, atau ubah port di `docker-compose.yml` menjadi `"5433:5432"` lalu sesuaikan juga portnya di `DATABASE_URL`.

**`P1000: Authentication failed`**
Kata sandi di `POSTGRES_PASSWORD` berbeda dengan yang tertulis di dalam `DATABASE_URL`. Samakan keduanya. Kalau basis datanya sudah terlanjur terbentuk dengan kata sandi lama, jalankan `docker compose down -v` lalu ulangi dari `docker compose up -d`.

**`npm install` gagal dengan `EBADENGINE`**
Node.js masih di bawah 20.9. Periksa dengan `node -v`, lalu pasang versi LTS terbaru.

**Halaman terbuka tetapi tidak bisa masuk**
Pastikan `npm run seed` sudah berjalan tanpa galat. Perintah itu aman diulang: ia membersihkan data lama lalu mengisi ulang.

**Ragu isi `.env` sudah benar**
Berkas `.env` hanya berlaku di komputer sendiri dan tidak memengaruhi orang lain. Aman dihapus lalu diulang dari `cp .env.example .env`.

---

## Pemeriksaan sebelum rilis

```bash
npm run lint
```

```bash
npm test
```

```bash
npm run build
```

```bash
npm run audit:data
```

`npm run lint` saat ini masih memunculkan sejumlah peringatan peninggalan proses penstabilan sebelumnya. Peringatan itu sudah diketahui dan bukan penghalang, tetapi kode baru sebaiknya tidak menambahnya.

---

## Dokumen lain

| Dokumen | Isi |
|---|---|
| [Pasang di VPS](docs/deploy-vps.md) | langkah pemasangan di server |
| [Tinjauan pengerasan keamanan](docs/hardening-review-2026-06-18.md) | hasil tinjauan keamanan |
| [Fase 2: Status Lapak](docs/phase-2-supplier-status.md) | latar belakang status lapak |
| [Fase 3: Kontrol Pembayaran](docs/phase-3-payment-control.md) | latar belakang kontrol pembayaran |
| [Fase 4: Tata Kelola Pelaporan](docs/phase-4-reporting-governance.md) | latar belakang pelaporan dan audit |
| [Peta jalan Fase 5 sampai 7](docs/roadmap-fase-5-7.md) | rencana lanjutan |
