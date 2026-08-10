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
| Shared domain types untuk `Purchase`/`Supplier` | Done (2026-08-08) | Seluruh 44 warning `no-explicit-any` domain-shape (props/state komponen berbentuk data Purchase/Supplier/Warehouse/dll) dibereskan memakai tipe Prisma langsung (`Purchase`, `PurchaseItem`, `Supplier`, `Warehouse`, `WarehouseTarget`) atau DTO baru (`src/types/purchase.ts`), mencakup DoubleCheckForm, ApprovalHargaForm, PurchaseForm, DPRequestForm, TransferList, TargetSettingForm, ManagerAnalytics, EditTransaksiForm, manager/susut page. Juga dibersihkan 11 cast `as any` di boundary server->client (semuanya tidak perlu) dan 1 file dead code (`ChartPerforma.tsx`, tidak diimpor di mana pun) dihapus. Ditemukan 1 bug tipe nyata (bukan fungsional): `EditTransaksiForm.tsx` mendeklarasikan `berat_lapak: number` padahal Prisma-nya `Float?`. Sisa 17 warning `no-explicit-any` adalah pola generik `catch (e: any)` -- kategori berbeda, bukan domain-shape yang menyembunyikan bug, sengaja tidak disentuh. Seluruh perubahan diverifikasi hidup di browser (Postgres lokal jalan): draft->double-check->approve-harga penuh, import CSV, deteksi duplicate, target setting, semuanya dites end-to-end dan data uji dibersihkan setelahnya. |
| API route smoke test | Done (2026-08-09) | `smoke/api-smoke.mjs` (`npm run test:smoke`) -- health check, akses tanpa sesi ditolak, kontrol peran (Manager tidak bisa ajukan kasbon, Staff tidak bisa double-check), siklus penuh draft->double-check->transfer. Data uji dibuat dan dibersihkan sendiri (tidak hardcode ID). Ketemu 1 bug nyata: DELETE transaksi manager tidak menghapus berkas bukti transfer dari disk -- sudah diperbaiki. Belum diwire ke CI (CI belum punya service Postgres) -- masih dijalankan manual terhadap server yang jalan. |
| Bersihkan status/endpoint Purchase mati | Done (2026-08-09) | Dihapus endpoint duplikat `api/purchases/[id]/approve/route.ts` (tidak pernah dipakai UI). Ditemukan bug nyata: `ManagerPurchaseDetailClient.tsx` mengecek `status_approval === "rejected"` padahal Purchase tidak pernah benar-benar diset ke status itu (cuma "dibatalkan") -- alasan penolakan jadi tersembunyi dari Manager. Diperbaiki di 2 titik (ikon & blok "Alasan Penolakan"), plus dibuang semua opsi filter/statusMap "rejected" mati di AdminHistoryClient, ManagerHistoryClient, ManagerSupplierDetailsClient (bagian Purchase-nya saja -- `dpStatusMap` DP yang memang punya status rejected asli tidak disentuh). |
| Tutup gap audit log | Done (2026-08-09) | 2 aksi penting belum tercatat di audit log: pembuatan supplier (`CREATE_SUPPLIER`) dan perubahan target gudang (`CREATE_WAREHOUSE_TARGET`/`UPDATE_WAREHOUSE_TARGET`). Sekalian ditemukan pola berulang: label aksi audit (`formatAuditAction`) didefinisikan lokal secara independen di 4 file berbeda dan mulai drift satu sama lain (beberapa punya entry basi/hilang) -- dikonsolidasi jadi satu sumber `src/lib/auditLabels.ts`, semua pemakai (`manager/export`, `AuditTrailClient`, `reports`, `ManagerPurchaseDetailClient`, `manager/page.tsx`) diarahkan ke situ. |
| Structured logging & error monitoring | Done (2026-08-09) | `src/lib/logger.ts` (JSON terstruktur ke stdout/stderr) + `src/instrumentation.ts` (`onRequestError` bawaan Next.js 16, setara SDK Sentry tanpa perlu akun eksternal). Tidak diuji terhadap layanan monitoring nyata (belum ada akun) -- hanya diverifikasi lewat unit test dan pemicuan error manual di dev. |
| `next/image` migration untuk preview upload | Done (2026-08-09) | 4 lokasi `<img>` (bukan 3 -- ketemu 1 lagi saat pengerjaan) dimigrasi ke `next/image`: staff history thumbnail, detail transaksi manager, modal preview & thumbnail TransferList. Dimensi gambar dinamis ditangani pakai `fill` + `sizes` + `object-contain`/`object-cover` di dalam container `relative` berukuran tetap. |
| Audit trail page khusus | Done (2026-08-09) | Halaman baru `/dashboard/manager/audit-trail` (Manager-only, `AuditTrailClient.tsx`) dengan filter search/role/aksi/tabel/bulan/tahun (dihitung dinamis dari data asli, bukan hardcode) + export CSV client-side yang match persis baris ter-filter. Batas 1000 baris per query (`MAX_ROWS`) untuk cegah query tak terbatas. |
| Print/report PDF-grade | Done (2026-08-09) | CSS print (`@page A4`, `print-color-adjust: exact`, `break-inside: avoid`) + shell dashboard (sidebar/topbar) disembunyikan saat print (`print:hidden`) dan wrapper layout dibuat `print:overflow-visible`/`print:h-auto` supaya tidak kepotong tinggi viewport. Diverifikasi lewat regex terhadap CSS terkompilasi (Tailwind v4 naruh utility print di dalam `@layer` bersarang -- iterasi `cssRules` biasa tidak menemukannya), bukan render visual PDF (LibreOffice tidak tersedia di environment ini). |
| Playwright flow test | Done (2026-08-10) | `e2e/purchase-flow.spec.ts` (`npm run test:e2e`) -- skenario penuh lewat UI sungguhan (bukan panggilan API seperti smoke test): Staff isi form draft -> Admin double-check -> Admin upload bukti transfer -> Manager lihat riwayat & export CSV, `test.describe.serial` dengan data uji (1 supplier) dibuat/dihapus lewat API di before/afterAll. Prosesnya menemukan beberapa selector rapuh yang sebelumnya lolos smoke test API karena smoke test tidak menyentuh UI sama sekali: (1) field "Berat Lapak (KG)" di `PurchaseForm` tidak punya `placeholder="0"` -- beda dengan field Potongan yang punya -- jadi harus ditarget lewat urutan `input[type=number]`, bukan placeholder; (2) nama supplier di tabel Double Check (`dashboard/admin/page.tsx`) cuma teks biasa, yang bisa diklik untuk navigasi adalah tombol "Lakukan Cek" pada baris yang sama; (3) field "Timbangan Gudang (KG)" total di `DoubleCheckForm` tidak perlu diisi manual karena otomatis dihitung ulang dari input per-item "Timbangan Gudang (Admin)" (`updateItem`); (4) nama supplier uji berbasis timestamp (`E2E Supplier <Date.now()>`) sempat ke-flag sebagai "mirip" oleh deteksi duplikat (`supplierDuplicate.ts`, jarak Levenshtein) terhadap sisa data supplier uji dari run sebelumnya yang gagal dibersihkan -- test sekarang kirim `confirmDuplicate: true` saat membuat data uji, dan `afterAll` melaporkan (bukan diam-diam menelan) kalau cleanup gagal. Dijalankan dan lolos 2x berturut-turut (6/6), memverifikasi tidak ada data sisa di database setelahnya. |
| Deployment readiness (umum) | Open | Migration checklist, private repo access, seed production strategy. Bukti transfer dikonfirmasi stakeholder tetap disimpan lokal (`docs/hardening-review-2026-06-18.md`), bukan gap yang perlu ditutup. |

### Deployment Readiness - VPS (target hosting dikonfirmasi 2026-06-24)

| Area | Status | Notes |
| --- | --- | --- |
| Dockerfile untuk app Next.js | Done (2026-08-09) | Multi-stage (`deps` -> `builder` -> `runner`), `next.config.ts` diberi `output: "standalone"`. Service `app` ditambahkan ke `docker-compose.yml` di belakang profile `production` (tidak ikut `docker compose up -d` default, supaya kebiasaan dev lokal db-saja tidak berubah). Diverifikasi dengan benar-benar build & jalankan image-nya: tersambung ke Postgres, `/api/health` 200, login NextAuth penuh berhasil, `docker compose --profile production up` sampai status "healthy". Dua bug nyata ketemu & diperbaiki saat proses ini: tahap `deps` belum copy folder `prisma/` (postinstall gagal), dan healthcheck `wget http://localhost` gagal karena alpine resolve ke IPv6 duluan (fix: `127.0.0.1` eksplisit). |
| Reverse proxy + TLS | Blocked | Domain belum ada (stakeholder masih putuskan pembelian domain berbayar). Tidak bisa dikerjakan tanpa domain nyata untuk terbitkan sertifikat TLS. |
| CD ke VPS | Blocked | Butuh VPS nyata sebagai target deploy -- menunggu keputusan anggaran/provider dari stakeholder. |
| Health-check endpoint | Done (2026-08-09) | `GET /api/health` (cek `SELECT 1` ke Postgres). Dipakai juga sebagai healthcheck di `docker-compose.yml` dan target pertama di API smoke test. |
| Restart policy & process management | Done (2026-08-09) | Service `app` baru pakai `restart: unless-stopped`, sama seperti `db`. |
| Backup Postgres terjadwal | Blocked | Cron backup baru masuk akal dijalankan di VPS asli -- menunggu VPS tersedia. |
| Error/log monitoring | Done (2026-08-09) | Lihat baris "Structured logging & error monitoring" di tabel Fase 7 di atas -- `src/lib/logger.ts` + `src/instrumentation.ts`. Sentry SDK penuh (akun eksternal) belum di-set, tapi mekanisme capture-error global bawaan Next.js sudah menutup kebutuhan minimal tanpa perlu akun baru. |
| Secrets management di VPS | Open | Bukan blocked teknis, tapi kebijakan (siapa pegang `NEXTAUTH_SECRET`/`DATABASE_URL` production) baru relevan didiskusikan begitu VPS ada. Checklist teknisnya (`.env` `chmod 600`, tidak ikut image) sudah bisa didokumentasikan sekarang. |
| Firewall dasar VPS | Blocked | Butuh VPS nyata untuk dikonfigurasi. |

### Phase 7 Closure (2026-08-10)

Seluruh item Fase 7 yang tidak bergantung pada keputusan stakeholder sudah selesai: unit test (69), domain type `Purchase`/`Supplier`, API route smoke test, Dockerfile + health-check + docker-compose profile production, cleanup status/endpoint Purchase mati, gap audit log, structured logging + error monitoring, migrasi `next/image`, halaman Audit Trail, print PDF-grade, dan Playwright flow test end-to-end (6/6 lolos, jalur UI sungguhan untuk tiap role). Dua hal masih terbuka murni karena keterbatasan environment/kebijakan, bukan pekerjaan teknis yang terlewat:

- **Test otomatis belum diwire ke CI** -- CI belum punya service Postgres untuk smoke test/Playwright (unit test murni tidak butuh DB dan bisa langsung diwire kapan saja). Semua suite (`npm test`, `npm run test:smoke`, `npm run test:e2e`) sudah terbukti jalan manual terhadap dev server + Postgres lokal.
- **Deployment ke VPS nyata (reverse proxy/TLS, CD, backup terjadwal, firewall)** -- Blocked menunggu keputusan domain berbayar & provider VPS dari stakeholder (lihat `Catatan-Kebutuhan-Stakeholder-AGP-IS.docx`). Perangkatnya (Dockerfile, docker-compose profile production, health-check) sudah siap begitu infrastrukturnya tersedia.

Fase 7 dapat dianggap **selesai dari sisi perangkat/tooling**, sama seperti status penutupan Fase 6. PRD akan diperbarui ke v1.3 berikutnya untuk mencatat penutupan ini.

### Phase 8 Gate (UI/UX Premium Pass)

Setelah Fase 7 ditutup, baru masuk UI/UX Premium Pass: poles pacing, feedback, disabled state, confirmation, empty state, error state pada input pembelian, double check, edit transaksi, nota, dan DP/kasbon - termasuk menyelesaikan dua temuan `ExpenseAnalytics`/`SusutLebihAnalytics` di atas (putuskan apakah jadi summary card atau dihapus).

## Rekomendasi Urutan

1. **Fase 5** dulu - role sudah final 3 (STAFF/ADMIN/MANAGER), jadi tinggal pastikan access matrix solid di atasnya. Tanpa hardening akses, data stakeholder asli di Fase 6 jadi lebih berisiko.
2. **Fase 6** - begitu akses aman, baru aman memasukkan data lapak asli dan rekening tanpa khawatir kebocoran.
3. **Fase 7** - testing otomatis dan deployment checklist butuh data dan akses yang sudah stabil supaya skenario test mewakili kondisi nyata.
4. **UI/UX Premium Pass** terakhir - poles tampilan setelah workflow dan data sudah aman, supaya tidak poles ulang gara-gara ada perubahan struktural dari fase sebelumnya.
