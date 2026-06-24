# Roadmap Fase 5-7

Last updated: 2026-06-24

## Objective

Fase 0-4 sudah usable dan terdokumentasi (lihat `docs/phase-2-supplier-status.md`, `docs/phase-3-payment-control.md`, `docs/phase-4-reporting-governance.md`, dan `docs/hardening-review-2026-06-18.md`). Audit ulang per role (2026-06-24) mengonfirmasi: tidak ada mojibake, build dan typecheck bersih, ESLint 0 error/92 warning, dan tidak ada flow/menu yang broken di STAFF, ADMIN, SUPERVISOR, maupun MANAGER. Dokumen ini menetapkan urutan Fase 5-7 supaya sistem siap dibawa ke demo/staging/production dengan percaya diri, plus mencatat temuan kecil dari audit terakhir yang belum perlu jadi blocker tapi harus masuk tracking.

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
| Role access matrix | Open | Dokumentasikan matrix role x route x aksi (view/create/edit/delete) sebagai satu tabel, verifikasi tiap baris terhadap `proxy.ts` dan guard di setiap API route. |
| Cross-warehouse access audit | Open | Pastikan semua endpoint STAFF/ADMIN/SUPERVISOR konsisten scoped ke `warehouseId`, MANAGER konsisten lintas warehouse (pola yang sudah benar di `admin/purchases/[id]/route.ts` jadi referensi). |
| Delete permission audit | Open | Cek ulang endpoint mana saja yang punya operasi delete/cancel dan siapa yang boleh memicunya - belum ada pass khusus untuk ini. |
| Upload validation lanjutan | Partial | MIME + size guard untuk bukti transfer sudah ada (`docs/hardening-review-2026-06-18.md`); perlu cek apakah validasi yang sama berlaku di semua titik upload lain. |
| Session safety | Open | Review `authOptions.ts` untuk expiry, rotasi token, dan perilaku saat role/warehouse user berubah di tengah sesi aktif. |
| Role naming cleanup (opsional) | Open | ADMIN/STAFF secara konsep satu role operasional (`isOperationalRole()`), legacy naming masih dipakai untuk kompatibilitas. Tunda sampai stakeholder konfirmasi final sebelum rename ke istilah seperti `OPERATIONAL`. |
| Supervisor scope decision | Open (menunggu stakeholder) | Masih menunggu konfirmasi: supervisor tetap per-gudang atau perlu opsi lintas-gudang. Keputusan ini menentukan banyak hal di permission matrix di atas, sebaiknya diselesaikan duluan. |

### Phase 6 Gate

Fase 5 siap ditutup ketika role access matrix terdokumentasi dan terverifikasi, tidak ada endpoint yang lupa scope warehouse, dan keputusan supervisor scope sudah final.

## Fase 6 - Data Quality & Import Tools

Tujuan: siap menerima data stakeholder asli (koordinat lapak, rekening, kontak, target) tanpa proses manual satu-satu yang rawan salah.

| Area | Status | Notes |
| --- | --- | --- |
| Backfill koordinat lapak | Open | Baru ada input awal Lapak CC Kediri; daftar lengkap masih menunggu stakeholder. |
| Validasi nama lapak vs collection center | Open | Perlu aturan konsisten supaya nama lapak di sistem cocok dengan penamaan CC di lapangan. |
| Import batch CSV/Excel untuk koordinat supplier | Open | Akan jauh lebih cepat daripada edit satu-satu lewat `ManagerSuppliersClient`. |
| Validasi nomor rekening & WA supplier | Open | Form sudah usable tapi belum ada validasi format (digit rekening, format nomor WA Indonesia). |
| Validasi nilai numerik bisnis | Open | Tolak harga minus/nol dan berat yang tidak masuk akal pada input pembelian/edit, di luar yang sudah dicakup `numberValidation.ts`. |
| Deteksi duplicate supplier | Open | Belum ada pengecekan nama/lokasi mirip saat tambah supplier baru. |

### Phase 7 Gate

Fase 6 siap ditutup ketika data lapak (koordinat, rekening, kontak) sudah lengkap atau punya jalur import yang jelas, dan validasi input mencegah data sampah masuk sistem.

## Fase 7 - Testing & Deployment Readiness

Tujuan: siap dibawa ke demo/staging dengan jaminan otomatis, bukan cuma verifikasi manual lint/build/browser.

| Area | Status | Notes |
| --- | --- | --- |
| Unit test helper calculation | Open | Prioritas: `src/lib/numberValidation.ts`, `src/lib/purchaseStatus.ts`, `src/lib/supplierStatus.ts`, `src/lib/workingDays.ts` - logic murni, mudah ditest, risiko tinggi kalau salah. |
| API route smoke test | Open | Minimal satu request happy-path per route kritikal (draft, double-check, approve, transfer, dp). |
| Playwright flow test | Open | Skenario end-to-end: login -> draft -> verify -> approve -> transfer -> export, untuk tiap role. |
| Shared domain types untuk `Purchase`/`Supplier` | Open | Prasyarat untuk membersihkan 82 warning `no-explicit-any` secara aman (lihat tabel temuan audit di atas) - tanpa ini, fix `any` satu-satu berisiko menyembunyikan bug shape Prisma. |
| `next/image` migration untuk preview upload | Open | 3 lokasi `<img>` (bukti transfer) - butuh uji visual sebelum migrasi karena dimensi gambar dinamis. |
| Audit trail page khusus | Open | Saat ini audit trail hanya tampil di laporan & detail tertentu. Next upgrade: halaman khusus dengan filter tanggal/role/aksi/entity + export. |
| Print/report PDF-grade | Open | Layout sudah period-aware; belum ada cover, section break, signature area rapi, print CSS, atau export PDF langsung. |
| Deployment readiness | Open | Env production, database backup, migration checklist, private repo access, seed production strategy. Bukti transfer sudah disimpan sebagai file lokal (`docs/hardening-review-2026-06-18.md`) - production serius tetap butuh object storage. |
| Satukan `seed.ts` dan `seed.js` | Open | Dua sumber seed legacy, residual decision dari hardening review 2026-06-18. |

### Phase 8 Gate (UI/UX Premium Pass)

Fase 7 siap ditutup ketika ada minimal satu lapis test otomatis yang jalan di CI, deployment checklist selesai, dan domain type `Purchase`/`Supplier` sudah ada. Setelah itu baru masuk UI/UX Premium Pass: poles pacing, feedback, disabled state, confirmation, empty state, error state pada input pembelian, double check, edit transaksi, nota, dan DP/kasbon - termasuk menyelesaikan dua temuan `ExpenseAnalytics`/`SusutLebihAnalytics` di atas (putuskan apakah jadi summary card atau dihapus).

## Rekomendasi Urutan

1. **Fase 5** dulu - keputusan supervisor scope jadi prasyarat banyak hal lain, dan tanpa hardening akses, data stakeholder asli di Fase 6 jadi lebih berisiko.
2. **Fase 6** - begitu akses aman, baru aman memasukkan data lapak asli dan rekening tanpa khawatir kebocoran.
3. **Fase 7** - testing otomatis dan deployment checklist butuh data dan akses yang sudah stabil supaya skenario test mewakili kondisi nyata.
4. **UI/UX Premium Pass** terakhir - poles tampilan setelah workflow dan data sudah aman, supaya tidak poles ulang gara-gara ada perubahan struktural dari fase sebelumnya.
