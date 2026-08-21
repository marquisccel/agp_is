# Panduan Deploy ke VPS

Panduan langkah demi langkah untuk menaikkan AGP IS ke VPS. VPS-nya
**unmanaged**, jadi semua langkah di bawah memang harus dikerjakan sendiri —
tidak ada yang otomatis dari penyedia.

Asumsi: Ubuntu 22.04/24.04 LTS, akses root via SSH, dan sudah punya domain
yang diarahkan ke IP VPS.

---

## 0. Sebelum mulai — siapkan ini dulu

| Kebutuhan | Keterangan |
|---|---|
| IP VPS + akses SSH | Dari email aktivasi penyedia |
| Domain | Sudah diarahkan A record ke IP VPS |
| Object Storage | Endpoint, Bucket, Access Key, Secret Key |
| Password database | Buat yang kuat, jangan `postgres` |
| `NEXTAUTH_SECRET` | Hasil `openssl rand -base64 32` |

Kalau DNS baru diubah, tunggu propagasinya (bisa sampai beberapa jam)
sebelum mengurus HTTPS — Let's Encrypt butuh domain sudah mengarah benar.

---

## 1. Amankan server dulu

Ini dikerjakan sebelum apa pun dipasang. VPS yang baru menyala dan terbuka
di internet akan mulai kena percobaan login otomatis dalam hitungan menit.

```bash
# Buat user non-root
adduser agp
usermod -aG sudo agp

# Salin kunci SSH ke user baru, lalu uji login sebagai agp DARI TERMINAL LAIN
# sebelum menutup akses root. Jangan tutup dulu sebelum yakin bisa masuk.
rsync --archive --chown=agp:agp ~/.ssh /home/agp/
```

Setelah yakin bisa login sebagai `agp`, matikan login root dan password:

```bash
sudo nano /etc/ssh/sshd_config
# PermitRootLogin no
# PasswordAuthentication no
sudo systemctl restart ssh
```

Firewall — hanya SSH dan web yang dibuka:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80,443/tcp
sudo ufw enable
sudo ufw status
```

> **Catatan penting soal Docker dan UFW.** Docker menulis aturan iptables
> sendiri dan bisa menembus UFW, sehingga port yang dipetakan container
> tetap terbuka ke internet walau UFW bilang tertutup. `docker-compose.yml`
> di repo ini sudah mengikat port ke `127.0.0.1:` supaya tidak terjadi —
> jangan hapus bagian itu.

---

## 2. Pasang Docker

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker agp
# keluar lalu login lagi supaya keanggotaan grup berlaku
docker --version && docker compose version
```

---

## 3. Ambil kode dan siapkan konfigurasi

```bash
sudo mkdir -p /opt/agp_is && sudo chown agp:agp /opt/agp_is
git clone https://github.com/marquisccel/agp_is.git /opt/agp_is
cd /opt/agp_is

cp .env.example .env
nano .env
```

Isi `.env`:

```env
POSTGRES_USER=agp
POSTGRES_PASSWORD=<password-kuat>
POSTGRES_DB=agp_is
DATABASE_URL=postgresql://agp:<password-kuat>@db:5432/agp_is?schema=public

NEXTAUTH_URL=https://<domain-anda>
NEXTAUTH_SECRET=<hasil openssl rand -base64 32>

S3_ENDPOINT=<endpoint object storage>
S3_BUCKET=<nama bucket>
S3_ACCESS_KEY_ID=<access key>
S3_SECRET_ACCESS_KEY=<secret key>
S3_REGION=us-east-1
```

Tiga hal yang paling sering bikin gagal:

- **`NEXTAUTH_URL` harus URL publik ber-HTTPS**, bukan `localhost`. Kalau
  salah, login berhasil tapi redirect-nya nyasar.
- **`DATABASE_URL` memakai host `db`**, bukan `localhost` — itu nama
  service di docker-compose, bukan mesin Anda.
- **Kredensial S3 wajib diisi.** Kalau dikosongkan, aplikasi jatuh ke
  penyimpanan lokal dan bukti transfer ikut hilang saat container dibuat
  ulang.

---

## 4. Nyalakan aplikasi

```bash
docker compose --profile production up -d --build
docker compose ps
docker compose logs -f app     # Ctrl+C untuk berhenti melihat log
```

Jalankan migrasi database (sekali di awal, dan setiap ada perubahan skema):

```bash
docker compose exec app npx prisma migrate deploy
```

Cek kesehatan:

```bash
curl http://127.0.0.1:3000/api/health
# harapan: {"status":"ok","db":"up",...}
```

> **Jangan jalankan `npm run seed` di produksi.** Seed membuat akun contoh
> dengan password `password123` yang sama untuk semua role. Akun asli
> dibuat lewat menu Master Data → Pengguna → Daftarkan Akun Baru.

### Akun pertama

Karena pendaftaran akun hanya bisa dilakukan Manager, akun Manager pertama
dibuat manual sekali saja:

```bash
docker compose exec app node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
(async () => {
  const p = new PrismaClient();
  const pass = await bcrypt.hash(process.argv[1], 10);
  const u = await p.user.create({
    data: { nama: 'Manager', email: process.argv[2], password: pass, role: 'MANAGER' },
    select: { id: true, email: true, role: true },
  });
  console.log(u);
  await p.\$disconnect();
})();
" '<password-manager>' '<email-manager>'
```

Gudang (Collection Center) juga perlu dibuat sebelum akun Staff/Admin bisa
ditugaskan — lakukan lewat menu Master Data setelah login sebagai Manager.

---

## 5. HTTPS lewat Caddy

Caddy mengurus sertifikat Let's Encrypt otomatis, termasuk perpanjangannya.

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

`/etc/caddy/Caddyfile`:

```
<domain-anda> {
    reverse_proxy 127.0.0.1:3000

    # Bukti transfer maksimal 2 MB; beri kelonggaran untuk overhead multipart.
    request_body {
        max_size 10MB
    }
}
```

```bash
sudo systemctl reload caddy
```

Buka `https://<domain-anda>` — sertifikat terbit otomatis dalam beberapa
detik kalau DNS sudah benar.

---

## 6. Backup otomatis

Penyedia **tidak** menyediakan backup terjadwal, jadi ini wajib dipasang
sendiri. Tanpa ini, kerusakan disk berarti kehilangan seluruh catatan
transaksi dan kasbon.

```bash
chmod +x /opt/agp_is/scripts/backup-db.sh /opt/agp_is/scripts/restore-db.sh

# aws CLI untuk mengunggah dump ke Object Storage
sudo apt install -y awscli

crontab -e
```

Tambahkan (backup tiap hari 02:00):

```
0 2 * * * /opt/agp_is/scripts/backup-db.sh >> /var/log/agp-backup.log 2>&1
```

**Uji pemulihannya sekali sekarang, jangan menunggu sampai butuh.** Backup
yang belum pernah diuji pulih sama saja dengan tidak punya backup:

```bash
/opt/agp_is/scripts/backup-db.sh
ls -lh /opt/agp_is/backups/
# uji di database terpisah kalau memungkinkan
```

---

## 7. Memperbarui aplikasi

```bash
cd /opt/agp_is
./scripts/backup-db.sh                 # backup dulu sebelum apa pun
git pull origin main
docker compose --profile production up -d --build
docker compose exec app npx prisma migrate deploy
curl http://127.0.0.1:3000/api/health
```

Kalau gagal dan perlu mundur:

```bash
git log --oneline -5
git checkout <commit-sebelumnya>
docker compose --profile production up -d --build
```

> Migrasi database **tidak otomatis mundur**. Kalau rilis yang gagal sempat
> menjalankan migrasi, pulihkan database dari backup sebelum rollback kode.

---

## 8. Pemeliharaan rutin

| Kegiatan | Frekuensi |
|---|---|
| Cek `/var/log/agp-backup.log` masih jalan | Mingguan |
| Uji pulihkan backup | Tiap 3 bulan |
| `sudo apt update && sudo apt upgrade` | Bulanan |
| Cek sisa disk `df -h` | Bulanan |
| Cek log aplikasi `docker compose logs --tail=200 app` | Saat ada keluhan |

---

## Masalah yang sering muncul

**Login berhasil tapi balik lagi ke halaman login.**
`NEXTAUTH_URL` tidak sama persis dengan URL yang dibuka di browser (http vs
https, ada/tidaknya `www`). Samakan, lalu `docker compose restart app`.

**Bukti transfer tidak tampil / gambar kosong.**
Cek kredensial S3 di `.env` sudah benar, lalu lihat `docker compose logs app`.
Perhatikan juga: berkas lama yang tersimpan sebelum pindah ke Object Storage
masih menunjuk ke `/uploads/...` dan tidak ikut berpindah sendiri.

**Build gagal / server jadi lambat saat build.**
`next build` bisa memakan ~2 GB RAM. Di VPS 2 GB, build sebaiknya dilakukan
lewat GitHub Actions lalu VPS cukup menarik image jadinya.

**Database tidak bisa dihubungi.**
`docker compose ps` — pastikan service `db` sehat. Ingat `DATABASE_URL`
memakai host `db`, bukan `localhost`.
