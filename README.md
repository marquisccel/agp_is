# AGP IS

AGP IS (Agrapana Greenworks Polymer Information System) adalah sistem informasi internal untuk operasional pembelian PET lintas gudang. Cakupan saat ini: pembelian, manajemen supplier (termasuk titik lokasi), target gudang, alur approval bertingkat, pelacakan transfer pembayaran, dan dashboard manajemen.

Dokumen ini ditulis supaya orang yang **belum pernah setup project Next.js/PostgreSQL sebelumnya** tetap bisa menjalankan project ini di komputernya sendiri sampai tampil di `http://localhost:3000`.

## Tech Stack

- Next.js 16 (App Router)
- React 19
- Prisma ORM
- PostgreSQL
- NextAuth v4
- Tailwind CSS v4
- Recharts

## Yang Perlu Diinstall Dulu (sekali saja di komputer kamu)

Sebelum mulai, pastikan 3 hal ini sudah terpasang:

1. **Node.js versi 20.9 atau lebih baru** (disarankan pakai versi LTS terbaru, misal Node 22).
   Cek dengan:
   ```bash
   node -v
   ```
   Kalau belum ada atau versinya di bawah 20.9, download dari [nodejs.org](https://nodejs.org) (pilih versi **LTS**), atau pakai [nvm](https://github.com/nvm-sh/nvm) kalau mau lebih fleksibel ganti-ganti versi Node.

2. **Docker Desktop** — dipakai untuk menjalankan database PostgreSQL secara lokal tanpa perlu install PostgreSQL manual di komputer kamu.
   Download dari [docker.com](https://www.docker.com/products/docker-desktop/), install, lalu buka aplikasinya minimal sekali supaya Docker engine-nya jalan.
   Cek sudah jalan dengan:
   ```bash
   docker --version
   ```

3. **Git** (biasanya sudah ada di Mac/Linux; di Windows install dari [git-scm.com](https://git-scm.com/)) — untuk clone repo ini.

Kalau ketiga hal di atas sudah ada, lanjut ke langkah setup di bawah.

## Setup Lokal — Langkah demi Langkah

### 1. Clone repo dan masuk ke foldernya

```bash
git clone <url-repo-ini>
cd agp_is
```

### 2. Install semua dependency project

```bash
npm install
```

Proses ini akan mengunduh semua library yang dibutuhkan project (Next.js, Prisma, dll). Wajar kalau prosesnya makan waktu 1-3 menit tergantung koneksi internet.

> Catatan: di akhir `npm install`, otomatis akan jalan `prisma generate`. Kalau langkah ini gagal karena `.env` belum ada, itu normal — lanjut saja ke langkah 3, nanti kita jalankan ulang `prisma generate` di langkah 5.

### 3. Nyalakan database PostgreSQL lewat Docker

Project ini sudah disertai `docker-compose.yml`, jadi kamu tidak perlu install PostgreSQL manual atau mengetik command Docker yang panjang. Cukup jalankan:

```bash
docker compose up -d
```

Command ini akan menyalakan container PostgreSQL di background (`-d` artinya *detached*, tidak memblokir terminal kamu). Database ini akan otomatis dibuat dengan nama `agp_is`, user `postgres`, password `postgres` — kredensial ini sudah cocok dengan file `.env.example` di langkah berikutnya, jadi tidak perlu diubah-ubah untuk kebutuhan development di komputer sendiri.

Cek apakah container sudah benar-benar nyala dan sehat:

```bash
docker compose ps
```

Tunggu sampai kolom `STATUS` menunjukkan `healthy` (biasanya hanya beberapa detik).

### 4. Siapkan file environment variables

Project butuh file `.env` yang berisi konfigurasi rahasia (koneksi database, secret untuk login). Salin dari contoh yang sudah disediakan:

```bash
cp .env.example .env
```

Buka file `.env` yang baru dibuat tadi. Isinya akan seperti ini:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/agp_is?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
```

- `DATABASE_URL` — **tidak perlu diubah** untuk development lokal, karena sudah cocok dengan kredensial di `docker-compose.yml`.
- `NEXTAUTH_URL` — biarkan `http://localhost:3000`, ini alamat lokal kamu nanti.
- `NEXTAUTH_SECRET` — ganti `replace-with-a-long-random-secret` dengan teks acak yang panjang. Ini dipakai untuk mengenkripsi sesi login, jangan dikosongkan atau dibiarkan nilai default. Cara mudah generate teks acaknya:

  ```bash
  openssl rand -base64 32
  ```

  Copy hasilnya, paste ke `NEXTAUTH_SECRET` di antara tanda kutip.

  Kalau komputer kamu (terutama Windows tanpa Git Bash) tidak punya `openssl`, ketik string acak apa saja minimal 32 karakter — yang penting panjang dan tidak mudah ditebak.

### 5. Buat struktur tabel database (migration) dan generate Prisma Client

```bash
npx prisma generate
npx prisma migrate dev
```

- `prisma generate` menyiapkan kode penghubung antara aplikasi dan database.
- `prisma migrate dev` membuat semua tabel yang dibutuhkan di database PostgreSQL yang sudah kamu nyalakan di langkah 3, sesuai skema project ini.

Kalau langkah ini gagal dengan error koneksi database, kemungkinan besar container Docker di langkah 3 belum nyala — cek lagi dengan `docker compose ps`.

### 6. Isi data awal (seed)

Tabel-tabel sudah ada tapi masih kosong. Isi dengan data contoh (gudang, akun login, supplier contoh) supaya aplikasi langsung bisa dicoba:

```bash
npm run seed
```

Setelah berhasil, akan muncul daftar akun yang bisa dipakai untuk login, kira-kira seperti ini:

```text
MANAGER:
  Email   : manager@example.com
  Password: password123

ADMIN:
  admin.kediri@example.com  | password123 | Gudang Kediri
  admin.madiun@example.com  | password123 | Gudang Madiun
  admin.malang@example.com  | password123 | Gudang Malang

STAFF:
  staff.kediri@example.com  | password123 | Gudang Kediri
  staff.madiun@example.com  | password123 | Gudang Madiun
  staff.malang@example.com  | password123 | Gudang Malang
```

> Semua password seed sama: `password123`. Role yang tersedia adalah Manager, Admin, dan Staff. Setiap gudang punya 1 Admin yang menjalankan verifikasi, double check, dan edit nota; Staff dan Admin sementara diperlakukan sebagai satu role operasional gudang secara konsep (nama role lama tetap dipertahankan di kode untuk kompatibilitas). Role Supervisor sudah dihapus dari sistem dan digabung ke Admin.

### 7. Jalankan aplikasi

```bash
npm run dev
```

Tunggu sampai muncul tulisan seperti `Ready in ...ms` di terminal, lalu buka browser ke:

```text
http://localhost:3000
```

Login pakai salah satu akun dari langkah 6. Selesai — aplikasi sudah jalan di komputer kamu.

## Menghentikan & Menyalakan Ulang (untuk dipakai sehari-hari setelah setup awal)

Setelah setup awal di atas selesai sekali, untuk hari-hari berikutnya kamu cukup:

```bash
docker compose up -d   # nyalakan database
npm run dev             # nyalakan aplikasi
```

Untuk mematikan:

```bash
# hentikan aplikasi: tekan Ctrl+C di terminal yang menjalankan npm run dev
docker compose stop     # hentikan database (data tidak hilang)
```

Data di database **tidak akan hilang** saat `docker compose stop` karena disimpan di Docker volume. Kalau suatu saat ingin benar-benar menghapus data dan mulai dari nol lagi, jalankan `docker compose down -v` lalu ulangi dari langkah 5 (migrate) dan 6 (seed).

## Troubleshooting Umum

**`Error: P1001: Can't reach database server`**
Database Docker belum nyala atau belum siap. Jalankan `docker compose up -d`, tunggu beberapa detik, cek `docker compose ps` sampai statusnya `healthy`, baru ulangi command yang gagal tadi.

**`Error: connect ECONNREFUSED 127.0.0.1:5432` atau port 5432 sudah dipakai**
Kemungkinan ada PostgreSQL lain yang sudah jalan di komputer kamu (misal dari project lain) dan memakai port yang sama. Matikan service PostgreSQL lain itu, atau ubah port di `docker-compose.yml` (misal `"5433:5432"`) dan sesuaikan juga port di `DATABASE_URL` pada `.env`.

**`npm install` gagal / muncul error `EBADENGINE`**
Versi Node.js kamu kemungkinan di bawah 20.9. Cek dengan `node -v`, lalu upgrade Node sesuai langkah di bagian "Yang Perlu Diinstall Dulu".

**Halaman muncul tapi tidak bisa login / "Invalid credentials"**
Pastikan langkah 6 (`npm run seed`) sudah dijalankan dan berhasil tanpa error. Kalau ragu, jalankan ulang `npm run seed` — proses ini aman dijalankan berkali-kali karena akan membersihkan data lama dan mengisi ulang dari awal.

**Lupa password `NEXTAUTH_SECRET` atau merasa salah isi `.env`**
File `.env` murni konfigurasi lokal kamu, tidak memengaruhi orang lain. Aman dihapus dan diulang dari langkah 4 (`cp .env.example .env`).

## Verifikasi Sebelum Push / Deploy

```bash
npm run build
npm run lint
```

`npm run lint` saat ini masih menampilkan sejumlah warning peninggalan proses stabilisasi sebelumnya — ini sudah diketahui dan belum dianggap blocker, tapi sebaiknya tidak menambah warning baru di kode yang kamu tulis.

## Alur Verifikasi Pembelian Saat Ini

```text
Staff input draft -> Admin verifikasi + double check (per gudang) -> Manager approval (jika harga di atas standar) -> Admin transfer pembayaran
```

## Dokumentasi Per Fase

- [Fase 2 - Status Supplier](docs/phase-2-supplier-status.md)
- [Fase 3 - Kontrol Pembayaran](docs/phase-3-payment-control.md)
- [Fase 4 - Tata Kelola Pelaporan](docs/phase-4-reporting-governance.md)

## Progress 25%
