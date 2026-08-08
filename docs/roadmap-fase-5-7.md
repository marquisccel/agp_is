# Roadmap Fase 5-7

Last updated: 2026-06-24 (revisi setelah pertemuan kedua stakeholder)

## Objective

Fase 0-4 sudah usable dan terdokumentasi (lihat `docs/phase-2-supplier-status.md`, `docs/phase-3-payment-control.md`, `docs/phase-4-reporting-governance.md`, dan `docs/hardening-review-2026-06-18.md`). Audit ulang per role (2026-06-24) mengonfirmasi: tidak ada mojibake, build dan typecheck bersih, ESLint 0 error/90 warning, dan tidak ada flow/menu yang broken di STAFF, ADMIN, maupun MANAGER. Dokumen ini menetapkan urutan Fase 5-7 supaya sistem siap dibawa ke demo/staging/production dengan percaya diri, plus mencatat temuan kecil dari audit terakhir yang belum perlu jadi blocker tapi harus masuk tracking.

Update pertemuan kedua stakeholder (2026-06-24): sistem final di 3 role (STAFF, ADMIN, MANAGER). Role SUPERVISOR dihapus dan digabung ke ADMIN — setiap gudang punya 1 ADMIN yang menjalankan verifikasi, double check, dan edit nota. Bukti transfer dikonfirmasi tetap disimpan lokal (tidak perlu object storage). Perubahan ini sudah dieksekusi (lihat commit terkait), jadi item-item terkait SUPERVISOR di tabel Fase 5 di bawah sudah diperbarui mengikuti keputusan ini.

## Temuan Audit 2026-06-24 yang Dibawa ke Roadmap

| Temuan | Lokasi | Kategori | Masuk Fase |
| --- | --- | --- | --- |
| `globalExpenses` dihitung di `manager/page.tsx` tapi tidak pernah dirender oleh `ExpenseAnalytics` | `src/components/features/ExpenseAnalytics.tsx` | Kemungkinan card ringkasan belanja global yang kelewat dibuat | Fase 5 (UI/UX Premium Pass) |
| `summary` dihitung tapi tidak dirender oleh `SusutLebihAnalytics` | `src/components/features/SusutLebihAnalytics.tsx` | Sama seperti di atas, kemungkinan ringkasan susut/lebih global kelewat | Fase 5 (UI/UX Premium Pass) |
| 82 warning `@typescript-eslint/no-explicit-any` tersisa | Tersebar di `src/components/features/*`, terutama shape `Purchase`/`Supplier` dari Prisma | Butuh shared domain type, bukan fix mekanis | Fase 7 (Testing & Deployment Readiness) |
| 3 warning `@next/next/no-img-element` pada preview bukti transfer | `TransferList.tsx`, `staff/history/page.tsx` | Perlu pekerjaan layout (`fill`/`sizes`) + uji visual sebelum diganti `next/image` | Fase 7 |
| 5 warning `react-hooks/set-state-in-effect` | Pola sync sah (session->form state, mount guard SSR) | Bukan bug, didokumentasikan supaya tidak diutak-atik tanpa alasan | Tidak perlu fase, cukup catatan ini |

## Fase 5 - Security & Permission Hardening

Tujuan: sistem siap dipakai serius tanpa celah role/akses, sebelum data stakeholder sungguhan masuk.

| Area | Status | Notes |
| --- | --- | --- |
| Role access matrix | Done (2026-06-24) | Audit penuh semua route di `src/app/api/**/route.ts` (role check, warehouse-scope, ada/tidaknya `getServerSession`). Hasil: MANAGER memang didesain lintas-gudang di hampir semua endpoint write (approve harga, set target, sku-price, export, delete master data) - itu bukan gap, itu fungsi manager. Gap nyata yang ketemu sudah difix, lihat 2 baris di bawah. |
| Cross-warehouse access audit | Done (2026-06-24) | 2 gap nyata ditemukan & difix: (1) `GET /api/targets` ternyata tidak punya `getServerSession` sama sekali - publicly readable tanpa login, karena `proxy.ts` cuma guard `/dashboard/:path*`, bukan `/api/:path*`. (2) `GET /api/suppliers/[id]` tidak ada warehouse-scope - STAFF/ADMIN gudang manapun bisa baca data supplier (termasuk rekening bank) gudang lain by ID. Keduanya sudah ditutup. |
| Delete permission audit | Done (2026-06-24) | Semua operasi delete (`manager/purchases/[id]` DELETE, `manager/suppliers/[id]` DELETE) sudah role-guard MANAGER-only + audit log, dan supplier delete sudah ada pre-check (tolak hapus kalau masih punya riwayat transaksi/DP). Tidak ada endpoint delete yang lupa guard. |
| Upload validation lanjutan | Done (2026-06-24) | Hanya ada 1 titik upload (`purchases/[id]/transfer/route.ts`, bukti transfer) - sudah MIME+size guard server-side. Ditemukan & difix 1 celah kecil: kode lama default ke `image/jpeg` kalau `file.type` kosong (bisa dipakai buat lolosin file non-image), sekarang ditolak langsung kalau MIME type kosong/tidak dikenali. |
| Session safety | Done (2026-06-24) | `authOptions.ts`: JWT `maxAge` diperketat dari default 30 hari jadi 7 hari, dan ditambah throttle login (in-memory, lock 15 menit setelah 5 kali gagal per email) di `src/lib/loginThrottle.ts` - sebelumnya tidak ada perlindungan brute-force sama sekali. Catatan yang masih berlaku: token tidak auto-refresh kalau role/warehouse user diubah admin di tengah sesi aktif - user harus re-login manual supaya perubahan kebaca. Untuk skala tim sekarang (~7 user internal) ini cukup, belum perlu infra token-revocation. |
| Role naming cleanup (opsional) | Open | ADMIN/STAFF secara konsep satu role operasional (`isOperationalRole()`), legacy naming masih dipakai untuk kompatibilitas. Tunda sampai stakeholder konfirmasi final sebelum rename ke istilah seperti `OPERATIONAL`. |

### Phase 6 Gate

Fase 5 ditutup 2026-06-24. Role access matrix terverifikasi, 2 gap nyata (akses publik tanpa login, kebocoran data lintas-gudang) sudah ditutup, delete & upload validation sudah diaudit bersih, session diperketat. Sisa item (role naming cleanup) bersifat opsional dan ditunda atas keputusan sendiri, bukan blocker.

## Fase 6 - Data Quality & Import Tools

Tujuan: siap menerima data stakeholder asli (koordinat lapak, rekening, kontak, target) tanpa proses manual satu-satu yang rawan salah.

| Area | Status | Notes |
| --- | --- | --- |
| Validasi nomor rekening & WA supplier | Done (2026-08-07) | `src/lib/supplierValidation.ts` -- validasi format nomor WA Indonesia (08xx/+628xx/628xx) dan rekening (5-20 digit) di server (POST/PATCH `/api/suppliers`) plus hint real-time di form. Ambang panjang/pola adalah asumsi teknis, belum dikonfirmasi stakeholder (lihat pertanyaan A-1..A-4 di Bagian 16.3 PRD). |
| Deteksi duplicate supplier | Done (2026-08-07) | `src/lib/supplierDuplicate.ts` -- soft warning (409, bukan block keras) saat nama identik/mirip (Levenshtein) atau lokasi berdekatan (<75m) dengan supplier lain di gudang yang sama. Pengguna bisa konfirmasi "bukan duplikat" untuk tetap simpan. |
| Validasi nilai numerik bisnis | Done (2026-08-07) | Ditemukan 1 celah nyata saat audit: retur item pada `double-check/route.ts` tidak dibandingkan terhadap berat SKU yang dibeli, sehingga `berat_final` bisa jadi negatif kalau retur diisi berlebihan. Sudah ditutup (validasi per SKU, termasuk retur bertumpuk pada SKU sama). Validasi harga/berat dasar (positif, finite) sudah tercakup `numberValidation.ts` sejak sebelum Fase 6. |
| Import batch CSV/Excel untuk koordinat supplier | Done (2026-08-07) | Endpoint `POST /api/manager/suppliers/import-coordinates` (Manager-only) + modal upload/paste CSV di `ManagerSuppliersClient.tsx`. Pencocokan baris ke supplier berbasis nama+gudang, baris ambigu/tidak ketemu dilewati (bukan ditebak), hasil per baris ditampilkan ke pengguna. Format Excel (.xlsx) belum didukung, hanya CSV -- cukup untuk kebutuhan saat ini karena Excel dapat diekspor ke CSV. |
| Backfill koordinat lapak | Blocked | Menunggu data lengkap dari pemilik proses bisnis (pertanyaan C-1). Perangkat importnya sudah siap begitu data tersedia. |
| Validasi nama lapak vs collection center | Blocked | Menunggu aturan penamaan yang disepakati stakeholder -- belum ada definisi baku "nama lapak yang konsisten dengan CC" untuk diimplementasikan sebagai validasi, supaya tidak menebak aturan bisnis. |

### Phase 7 Gate

4 dari 6 item Fase 6 selesai (2026-08-07); sisa 2 item (backfill koordinat, validasi nama vs CC) diblokir oleh kebutuhan data/aturan dari stakeholder, bukan oleh keterbatasan teknis. Fase 6 dapat dianggap siap ditutup dari sisi perangkat (tooling); penutupan penuh menunggu input stakeholder untuk 2 item yang tersisa. Fase 7 dapat mulai berjalan paralel untuk bagian yang tidak bergantung pada data lapak (unit test, domain types, deployment readiness).

## Fase 7 - Testing & Deployment Readiness

Tujuan: siap dibawa ke demo/staging dengan jaminan otomatis, bukan cuma verifikasi manual lint/build/browser.

| Area | Status | Notes |
| --- | --- | --- |
| Unit test helper calculation | Done (2026-08-08) | `numberValidation.test.ts`, `purchaseStatus.test.ts`, `supplierStatus.test.ts` (mock `Prisma.TransactionClient`, bukan DB asli), `workingDays.test.ts`. Suite total 64 test (termasuk yang sudah ada dari Fase 6: purchaseCalculation, dpAllocation, supplierValidation, supplierDuplicate, supplierCsvImport). |
| Shared domain types untuk `Purchase`/`Supplier` | Sebagian (2026-08-08) | `src/types/purchase.ts` (`PurchaseDTO`) dibuat dan diterapkan di jalur nota (`NotaPDF`, `NotaViewerClient`, `DownloadNotaButton`). Juga dibersihkan 11 cast `as any` di boundary server->client yang ternyata semuanya tidak perlu. Ditemukan 1 bug tipe nyata (bukan fungsional): `EditTransaksiForm.tsx` mendeklarasikan `berat_lapak: number` padahal Prisma-nya `Float?`. ~30 warning `no-explicit-any` tersisa di form interaktif kompleks (DoubleCheckForm, PurchaseForm, ApprovalHargaForm) -- sengaja belum disentuh karena risiko regresi lebih tinggi dan sesi ini tidak bisa verifikasi visual di browser (Docker/Postgres tidak tersedia). |
| API route smoke test | Open | Minimal satu request happy-path per route kritikal (draft, double-check, approve, transfer, dp). |
| Playwright flow test | Open | Skenario end-to-end: login -> draft -> verify -> approve -> transfer -> export, untuk tiap role. |
| `next/image` migration untuk preview upload | Open | 3 lokasi `<img>` (bukti transfer) - butuh uji visual sebelum migrasi karena dimensi gambar dinamis. |
| Audit trail page khusus | Open | Saat ini audit trail hanya tampil di laporan & detail tertentu. Next upgrade: halaman khusus dengan filter tanggal/role/aksi/entity + export. |
| Print/report PDF-grade | Open | Layout sudah period-aware; belum ada cover, section break, signature area rapi, print CSS, atau export PDF langsung. |
| Deployment readiness (umum) | Open | Migration checklist, private repo access, seed production strategy. Bukti transfer dikonfirmasi stakeholder tetap disimpan lokal (`docs/hardening-review-2026-06-18.md`), bukan gap yang perlu ditutup. |

### Deployment Readiness - VPS (target hosting dikonfirmasi 2026-06-24)

| Area | Status | Notes |
| --- | --- | --- |
| Dockerfile untuk app Next.js | Open | `docker-compose.yml` saat ini cuma container Postgres (`docker-compose.yml`). Perlu multi-stage Dockerfile (`deps` -> `build` -> `runner`) untuk app, ditambahkan sebagai service baru di compose. |
| Reverse proxy + TLS | Open | Domain ke VPS butuh reverse proxy (Caddy paling sederhana untuk auto-TLS Let's Encrypt, atau Nginx kalau mau lebih familiar) di depan container app. Pastikan port Postgres (5432) **tidak** diexpose ke publik, cuma 80/443 lewat proxy. |
| CD ke VPS | Open | `.github/workflows/ci.yml` baru lint+build, belum deploy. Tambah job lanjutan: SSH ke VPS, `docker compose pull && docker compose up -d --build`, atau push image ke registry dulu (GHCR) baru pull di VPS - pilih salah satu pola, jangan build langsung di VPS tiap deploy kalau resource VPS kecil. |
| Health-check endpoint | Open | Tambah `GET /api/health` (cek koneksi DB minimal) supaya `docker-compose` health check dan monitoring eksternal punya sesuatu untuk dicek, bukan cuma asumsi container "Up" = app sehat. |
| Restart policy & process management | Partial | Service `db` di `docker-compose.yml` sudah `restart: unless-stopped`; service app baru (poin 1) harus pakai pola yang sama supaya auto-recover kalau VPS reboot/crash. |
| Backup Postgres terjadwal | Open | Volume Docker ada tapi belum ada cron `pg_dump` + rotasi + (idealnya) salin ke storage di luar VPS itu sendiri, supaya kalau VPS-nya kena masalah, backup gak ikut hilang. |
| Error/log monitoring | Open | Belum ada apa pun selain `console.error` lokal. Minimal: Sentry (free tier cukup untuk app sekecil ini) atau structured logging ke file + `journalctl`/`docker logs` yang gampang ditarik kalau ada insiden. |
| Secrets management di VPS | Open | `.env.example` cukup untuk lokal; production butuh keputusan eksplisit: `.env` file di VPS dengan permission dikunci (`chmod 600`), bukan ikut masuk image Docker atau git. Dokumentasikan siapa yang pegang `NEXTAUTH_SECRET`/`DATABASE_URL` production. |
| Firewall dasar VPS | Open | Pastikan cuma port 22 (SSH, idealnya key-only) dan 80/443 yang terbuka ke publik; semua port internal (Postgres, dll) cuma bisa diakses dari dalam network Docker/VPS. |

### Phase 8 Gate (UI/UX Premium Pass)

Fase 7 siap ditutup ketika ada minimal satu lapis test otomatis yang jalan di CI, deployment checklist selesai, dan domain type `Purchase`/`Supplier` sudah ada. Setelah itu baru masuk UI/UX Premium Pass: poles pacing, feedback, disabled state, confirmation, empty state, error state pada input pembelian, double check, edit transaksi, nota, dan DP/kasbon - termasuk menyelesaikan dua temuan `ExpenseAnalytics`/`SusutLebihAnalytics` di atas (putuskan apakah jadi summary card atau dihapus).

## Rekomendasi Urutan

1. **Fase 5** dulu - role sudah final 3 (STAFF/ADMIN/MANAGER), jadi tinggal pastikan access matrix solid di atasnya. Tanpa hardening akses, data stakeholder asli di Fase 6 jadi lebih berisiko.
2. **Fase 6** - begitu akses aman, baru aman memasukkan data lapak asli dan rekening tanpa khawatir kebocoran.
3. **Fase 7** - testing otomatis dan deployment checklist butuh data dan akses yang sudah stabil supaya skenario test mewakili kondisi nyata.
4. **UI/UX Premium Pass** terakhir - poles tampilan setelah workflow dan data sudah aman, supaya tidak poles ulang gara-gara ada perubahan struktural dari fase sebelumnya.
