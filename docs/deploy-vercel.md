# Panduan Deploy ke Vercel

Panduan untuk menaikkan AGP IS ke Vercel. Ditujukan untuk **masa uji coba
bersama tim**, sebelum keputusan hosting dan domain permanen diambil.

Bedanya dengan `docs/deploy-vps.md`: di VPS semua dikerjakan sendiri di satu
mesin. Di Vercel, aplikasinya saja yang berjalan di Vercel. Basis data dan
penyimpanan berkas harus disiapkan di tempat lain, dan itu bagian yang paling
sering terlewat.

---

## 0. Yang harus disiapkan lebih dulu

| Kebutuhan | Keterangan |
|---|---|
| Akun GitHub | Repositori sudah didorong ke sana |
| Akun Vercel | Baca peringatan lisensi di bawah |
| PostgreSQL terkelola | Supabase atau Neon |
| Object Storage | Supabase Storage atau Cloudflare R2 |
| `NEXTAUTH_SECRET` | Hasil perintah pembuat kunci acak, lihat bagian 4 |

Kalau memakai Supabase, basis data dan penyimpanan berkas didapat dari satu
pendaftaran yang sama. Itu jalur paling ringkas dan yang diasumsikan panduan
ini.

### Peringatan lisensi, baca sebelum memilih paket

Paket gratis Vercel (**Hobby**) melarang penggunaan komersial. Ketentuan
layanannya menyatakan paket Hobby hanya untuk keperluan pribadi atau
non-komersial, dan definisi komersialnya mencakup proyek yang dikerjakan
karyawan atau konsultan berbayar.

Konsekuensi yang perlu diketahui pengambil keputusan: Vercel menyatakan
berhak mematikan deployment paket Hobby **tanpa pemberitahuan lebih dulu**.

Untuk sistem yang sedang diisi data pembelian sungguhan oleh tim, itu risiko
yang harus disampaikan ke manajemen sebelum jalan, bukan sesudah. Paket Pro
menghilangkan risiko ini dan masih jauh lebih murah daripada VPS setahun.

---

## 1. Siapkan basis data

Buat proyek baru di Supabase. Saat membuat proyek, **matikan "Enable Data
API"**: aplikasi ini bicara langsung ke Postgres lewat Prisma dan tidak
memakai REST API Supabase sama sekali. Kalau dibiarkan menyala bersama
"Automatically expose new tables", tiap tabel yang dibuat Prisma mendapat
endpoint REST publik yang tidak pernah dibutuhkan.

Untuk connection string-nya, klik tombol **Connect** di bar atas dasbor,
buka tab **ORM**, pilih **Prisma**. Supabase memberikan dua baris siap
pakai:

| Variabel | Porta | Dipakai untuk |
|---|---|---|
| `DATABASE_URL` | 6543 | aplikasi yang sedang berjalan |
| `DIRECT_URL` | 5432 | perintah migrasi Prisma |

Ganti `[YOUR-PASSWORD]` di keduanya dengan password basis data yang kamu
simpan saat membuat proyek. Keduanya berbeda dan tidak bisa saling
menggantikan; penjelasannya ada di `.env.production.example` bagian 1.

### Jalankan migrasi dari laptop

Salin kedua baris itu ke `.env` di laptopmu, lalu:

```bash
npx prisma migrate deploy
```

`prisma/schema.prisma` sudah menyebut `directUrl`, jadi Prisma memakai
`DIRECT_URL` untuk migrasi dan `DATABASE_URL` untuk sisanya secara
otomatis. Tidak perlu menukar-nukar nilainya seperti dulu.

### Isi data awal

Isi tiga nilai berikut di `.env` laptopmu lebih dulu:

```
MANAGER_NAMA="Nama Manager AGP"
MANAGER_EMAIL="manager@domainperusahaan.com"
MANAGER_PASSWORD="password-kuat-minimal-8-karakter"
```

Lalu jalankan:

```bash
node scripts/siapkan-produksi.mjs
```

Skrip ini membuat tiga gudang dan **satu** akun Manager saja. Sisanya
didaftarkan sendiri oleh Manager lewat menu Master Data, supaya sejak hari
pertama isi sistem adalah data sungguhan.

Setelah Manager berhasil masuk dan mengganti password lewat halaman
Pengaturan, hapus ketiga nilai di atas dari `.env`.

> **JANGAN menjalankan `node seed.js` di basis data produksi.**
>
> Skrip itu diawali `deleteMany()` pada seluruh tabel. Menjalankannya bukan
> sekadar menambah data contoh, tapi **menghapus semua transaksi, bukti
> transfer, dan jejak audit** yang sudah masuk. Setelah itu ia mengisi ulang
> dengan tujuh akun `@example.com` dan lapak fiktif.
>
> `seed.js` hanya untuk pengembangan di laptop.

---

## 1b. Bersihkan galat log dari Data API yang dimatikan

Setelah Data API dimatikan, log Postgres di Supabase akan dipenuhi baris ini,
sekitar dua kali per menit, terus-menerus:

```
3F000  schema "pg_pgrst_no_exposed_schemas" does not exist
```

Ini BUKAN masalah aplikasi. Supabase tidak benar-benar mematikan PostgREST
saat Data API dinonaktifkan; mereka hanya mengarahkannya ke nama skema
penanda yang memang tidak ada, dan PostgREST mengeluh tiap kali mencoba
memuatnya.

Tidak merusak apa pun, tapi membuat panel Postgres tampak merah penuh
sehingga masalah yang sungguhan jadi sulit terlihat.

Jalankan sekali di SQL Editor Supabase:

```sql
create schema pgrst_no_exposed_schemas;
alter role authenticator set pgrst.db_schemas = 'pgrst_no_exposed_schemas';
notify pgrst;
```

PostgREST lalu memuat skema yang benar-benar ada tapi kosong, jadi tidak ada
lagi yang dikeluhkan. Tabel di `public` tetap TIDAK diekspos.

Perhatikan namanya tanpa awalan `pg_`. Postgres menolak membuat skema
berawalan itu karena dicadangkan untuk skema sistem, jadi menyalin nama yang
muncul di pesan galatnya tidak akan berhasil.

Kalau suatu saat Data API ingin dihidupkan lagi:

```sql
alter role authenticator reset pgrst.db_schemas;
notify pgrst;
```

---

## 2. Siapkan Object Storage

Buat bucket baru, dan pastikan **privat**. Catat endpoint, nama bucket,
access key, dan secret key.

Kalau bagian ini dilewati, aplikasi tetap berjalan dan unggahan tetap
terlihat berhasil. Yang terjadi diam-diam: berkasnya ditulis ke sistem berkas
sementara Vercel, lalu **hilang pada deploy berikutnya**. Bukti transfer
adalah bukti keuangan yang dipakai saat audit, jadi kehilangannya baru
ketahuan justru ketika paling dibutuhkan.

Bucket harus privat karena aplikasi tidak pernah memberikan URL bucket ke
peramban. Semua berkas dilayani lewat `/api/files` yang memeriksa sesi lebih
dulu. Bucket publik membatalkan perlindungan itu.

---

## 3. Impor proyek ke Vercel

1. Vercel, **Add New**, **Project**, pilih repositori dari GitHub
2. Framework terdeteksi sendiri sebagai Next.js
3. Jangan mengubah setelan build. `package.json` sudah menjalankan
   `prisma generate` sebelum `next build`
4. **Jangan deploy dulu.** Isi variabel lingkungan lebih dulu

`output: "standalone"` di `next.config.ts` tidak dibutuhkan Vercel, tapi juga
tidak merusak apa pun. Biarkan saja, karena nilai itu diperlukan kalau nanti
pindah ke VPS.

---

## 4. Isi variabel lingkungan

Di **Settings**, **Environment Variables**, isi sembilan nilai berikut untuk
lingkungan **Production**:

| Nama | Catatan |
|---|---|
| `DATABASE_URL` | Versi pooled, porta 6543 |
| `DIRECT_URL` | Versi porta 5432, dipakai migrasi dan dibaca saat build |
| `NEXTAUTH_URL` | URL produksi, dengan https, tanpa garis miring di akhir |
| `NEXTAUTH_SECRET` | Buat baru, jangan salin dari laptop |
| `S3_ENDPOINT` | |
| `S3_BUCKET` | |
| `S3_ACCESS_KEY_ID` | |
| `S3_SECRET_ACCESS_KEY` | |
| `S3_REGION` | |
| `ALERT_WEBHOOK_URL` | Opsional, sangat berguna selama uji coba |

Keterangan lengkap tiap nilai ada di `.env.production.example`.

Untuk `NEXTAUTH_SECRET`, jalankan ini di terminalmu sendiri lalu salin
hasilnya langsung ke dasbor Vercel:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Nilai yang bisa dibaca manusia tidak memenuhi syarat. Siapa pun yang bisa
menebaknya bisa memalsukan sesi MANAGER tanpa tahu satu pun password, dan
pemalsuan itu tidak meninggalkan jejak login gagal.

### JANGAN tandai `NEXTAUTH_URL` sebagai Sensitive

Vercel menawarkan penandaan **Sensitive** pada variabel. Variabel bertanda itu
hanya tersedia **saat aplikasi berjalan, tidak saat build** -- memang dirancang
begitu supaya rahasia tidak bocor ke log build.

`NEXTAUTH_URL` dibutuhkan saat build. Root layout memuat SessionProvider, dan
NextAuth menyusun URL dasarnya di lingkup modul, sehingga ikut dijalankan saat
memprerender halaman apa pun.

Kalau ditandai Sensitive, build gagal dengan pesan yang sama sekali tidak
menyebut penyebabnya:

```
Error occurred prerendering page "/_not-found"
TypeError: Invalid URL ... input: ''
```

Halaman yang disebut justru halaman 404 yang tidak berhubungan dengan
autentikasi.

Lagi pula `NEXTAUTH_URL` memang bukan rahasia: isinya alamat publik situs itu
sendiri, yang terbaca semua pengunjung.

Delapan variabel lainnya boleh tetap Sensitive. Sudah diuji: dengan semuanya
kosong saat build dan hanya `NEXTAUTH_URL` yang terbaca, build lolos penuh.
Kedelapan nilai itu memang baru dibutuhkan saat aplikasi melayani permintaan,
dan di sana variabel Sensitive tersedia normal.

Penandaan Sensitive tidak bisa dilepas setelah dibuat. Kalau terlanjur,
hapus variabelnya lalu buat ulang tanpa penandaan itu.

Soal `NEXTAUTH_URL`: pada deploy pertama URL produksinya belum diketahui.
Isi dulu perkiraannya, deploy, lalu perbaiki dengan URL sebenarnya dan deploy
ulang. Selama nilainya belum benar, login akan berhasil tapi pengalihan
setelahnya gagal.

---

## 4a. Region fungsi harus sedaerah dengan basis data

Vercel menjalankan fungsi di Washington DC (`iad1`) secara bawaan, sedangkan
basis datanya di Singapura. Setiap kueri lalu menyeberang Pasifik bolak-balik,
sekitar 250 ms sekali jalan, dan halaman yang menjalankan puluhan kueri jadi
belasan detik.

Terukur sungguhan pada deploy pertama: dashboard Manager butuh 14 detik walau
fungsinya sudah hangat, jadi itu bukan cold start.

`vercel.json` di akar repositori sudah menetapkannya:

```json
{ "regions": ["sin1"] }
```

Paket Hobby boleh memilih satu region, dan tidak harus yang bawaan.

Cara memastikannya benar setelah deploy, lihat header tanggapannya:

```bash
curl -s -D - -o /dev/null https://agp-is.vercel.app/login | grep -i x-vercel-id
```

Isinya `sin1::sin1::...` kalau sudah benar. Kalau masih `sin1::iad1::`, bagian
kedua itu tempat fungsinya berjalan dan berarti setelannya belum berlaku.

---

## 4b. Kalau ada yang 500 setelah deploy

Log runtime tidak terlihat dari halaman Deployments. Ambil dari terminal:

```bash
npx vercel logs https://agp-is.vercel.app
```

Perintah itu memuat jejak galat yang sebenarnya. Tanpanya yang terlihat cuma
"A server error occurred" di peramban dan daftar permintaan berstatus 500,
yang tidak menyebut sebab apa pun.

### Nilai variabel Sensitive tidak bisa diperiksa

Variabel bertanda Sensitive bersifat tulis-saja: tidak bisa dibaca lewat
dasbor maupun `vercel env pull`. Jadi tidak ada cara memastikan isinya benar
atau kosong.

Kalau log menunjukkan sebuah variabel tidak sampai ke runtime, satu-satunya
jalan adalah menimpanya:

```bash
npx vercel env add NAMA_VARIABEL production --sensitive --force
```

Perintah itu meminta nilainya lewat stdin, jadi nilainya tidak tertinggal di
riwayat perintah.

### Perubahan variabel tidak berlaku pada deployment yang sudah ada

Variabel lingkungan diikat saat deploy. Setelah mengubahnya, wajib deploy
ulang:

```bash
npx vercel redeploy https://agp-is.vercel.app
```

---

## 5. Deploy dan periksa

Setelah deploy pertama selesai, kerjakan empat pemeriksaan ini berurutan.
Semuanya pernah gagal di deploy pertama pada proyek serupa.

**1. Masuk sebagai Manager.** Kalau berhasil masuk tapi terlempar balik ke
halaman masuk, `NEXTAUTH_URL` masih salah.

**2. Uji bukti transfer.** Unggah satu bukti transfer, lalu jalankan deploy
ulang dari dasbor Vercel, lalu buka lagi bukti itu. Kalau hilang, Object
Storage belum terkonfigurasi dan aplikasi masih memakai penyimpanan
sementara.

**3. Buka halaman Laporan dan Export.** Dua halaman ini yang paling berat di
sistem. Fungsi di Vercel punya batas waktu eksekusi, jadi kalau ada yang akan
tersendat, di sinilah muncul.

**4. Uji beberapa akun bersamaan.** Minta dua atau tiga orang masuk dan
memakai sistem di waktu yang sama. Kalau muncul galat koneksi basis data,
`DATABASE_URL` masih memakai versi langsung, bukan pooled.

---

## 6. Selama masa uji coba

**Bagikan hanya URL produksi.** Setiap push membuat URL preview baru, dan
login selalu gagal di sana karena tidak cocok dengan `NEXTAUTH_URL`. Itu
bukan kerusakan, tapi cukup untuk membuat tim mengira sistemnya rusak.

**Data yang diisi tim adalah data sungguhan.** Kalau setelah masa uji coba
diputuskan pindah hosting, data itu harus ikut dipindahkan, dan itu pekerjaan
tersendiri yang perlu dijadwalkan. Pastikan penyedia basis datanya mendukung
`pg_dump`. Supabase dan Neon keduanya mendukung.

**Ambil cadangan sebelum pindah.**

```bash
pg_dump "CONNECTION_STRING_LANGSUNG" > cadangan-agp.sql
```

---

## Kalau nanti pindah ke VPS

Tidak ada pekerjaan yang terbuang. `docs/deploy-vps.md` dan berkas Docker
sudah tersedia, dan setelan Object Storage yang sama tinggal dibawa pindah
tanpa perubahan kode. Yang perlu dipindahkan cuma basis datanya.
