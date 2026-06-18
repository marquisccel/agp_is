# Hardening Review - 2026-06-18

## Objective

Menutup gap hasil review eksternal setelah Fase 0 sampai Fase 4, sebelum masuk phase berikutnya.

## Fixed

| Area | Status | Notes |
| --- | --- | --- |
| Middleware role defense | Done | `proxy.ts` sekarang punya guard role per prefix dashboard sebagai lapisan kedua selain page-level checks. |
| Purchase numeric validation | Done | API draft, double-check, dan edit transaksi menolak input numerik non-finite/negatif untuk field kritikal. |
| Warehouse access on double-check | Done | Admin dan supervisor sama-sama dibatasi ke warehouse miliknya. |
| Edit after transfer guard | Done | Transaksi `sudah_transfer` tidak bisa diedit lewat endpoint edit transaksi. |
| Atomic edit transaction | Done | Delete/recreate item pada edit transaksi dibungkus dalam Prisma transaction. |
| Audit double stringify | Done | `old_data` edit transaksi tidak lagi di-`JSON.stringify` sebelum masuk helper audit. |
| Transfer proof storage | Done | Upload bukti transfer baru disimpan sebagai file di `public/uploads/transfer-proofs`, DB hanya menyimpan URL path. |
| Transfer proof MIME guard | Done | Bukti transfer dibatasi ke JPG, PNG, WEBP, atau PDF dengan ukuran maksimal 2 MB. |
| Short Google Maps warning | Done | Form supplier dan quick edit lokasi memberi warning saat link pendek Maps butuh koordinat manual. |
| Supplier numeric validation | Done | Target bulanan dan frekuensi ambilan supplier divalidasi server-side, plus staff/admin dibatasi ke warehouse miliknya. |
| Target period validation | Done | API target menolak bulan/tahun invalid dan target negatif/non-numerik. |
| Export period validation | Done | Export CSV manager menolak bulan/tahun invalid sebelum query data laporan. |

## Residual Decisions

- Supervisor saat ini tetap scoped per warehouse. Jika stakeholder ingin supervisor global lintas semua gudang, perlu perubahan model akses/assignment.
- Bukti transfer lokal sudah tidak membengkakkan DB, tetapi production ideal tetap memakai object storage saat deployment.
- `seed.ts` dan `seed.js` masih dua sumber seed legacy; bisa disatukan pada cleanup/deployment pass.

## Verification

- `npm run lint -- --quiet`
- `npx next build`
