# Fase 2 - Supplier Status

Last updated: 2026-06-17

## Objective

Fase 2 membuat data lapak lebih operasional: supplier memiliki status transaksi, bisa dipantau dari workflow harian, dan siap diperkaya dengan titik lokasi sungguhan untuk kebutuhan peta.

## Progress

| Area | Status | Notes |
| --- | --- | --- |
| `transactionStatus` supplier | Done | Default `RED`, dapat menjadi `GREEN` setelah transaksi valid pertama. |
| Auto-green dari approval transaksi | Done | Terhubung ke verifikasi admin/supervisor dan approval manager. |
| Manual status update | Done | Staff/admin/manager dapat menyimpan status melalui form supplier. |
| Audit trail status supplier | Done | Perubahan manual dan otomatis tercatat di `AuditLog`. |
| UI status di data lapak manager | Done | Filter merah/hijau dan badge status sudah tersedia. |
| UI status di flow staff/admin | Done | Input pembelian, pengajuan kasbon, dan data supplier staff menampilkan status supplier. |
| Latitude/longitude supplier | Done | Field tersedia di database, API, dan form. |
| Deteksi koordinat dari link Maps | Done | Link Google Maps yang membawa koordinat akan diparse otomatis. |
| Preview peta per supplier | Done | Detail lapak manager menampilkan iframe peta bila koordinat tersedia. |
| Kesiapan lokasi supplier | Done | Badge/filter `Map Ready` tersedia pada beberapa tampilan. |
| Export data supplier Fase 2 | Done | Status transaksi, kesiapan lokasi, link Maps, latitude, dan longitude ikut di laporan export manager. |
| Backfill koordinat semua lapak | Waiting stakeholder | Menunggu daftar titik koordinat/link lengkap dari stakeholder. |

## Acceptance Checklist

- Supplier baru otomatis berstatus merah jika belum ada transaksi valid.
- Supplier berubah hijau otomatis ketika transaksi valid pertama disetujui.
- Perubahan status manual meninggalkan jejak siapa, kapan, dan perubahan dari-ke.
- Manager dapat melihat riwayat status dari detail lapak.
- Staff/admin melihat sinyal status supplier saat membuat pembelian atau pengajuan kasbon.
- Supplier dengan koordinat dapat membuka Google Maps dan menampilkan preview peta.
- Link Maps yang mengandung koordinat dapat mengisi latitude/longitude tanpa input manual tambahan.
- Laporan export manager memuat status supplier dan data lokasi.
- Data koordinat stakeholder dapat dibackfill tanpa migrasi schema tambahan.

## Pending Stakeholder Data

Data yang masih dibutuhkan untuk setiap lapak:

| Field | Required | Notes |
| --- | --- | --- |
| Nama lapak | Yes | Harus cocok dengan data supplier existing. |
| Collection Center | Yes | Untuk menghindari salah update bila nama mirip. |
| Link Google Maps | Preferred | Bisa dipakai sebagai fallback lokasi. |
| Latitude | Preferred | Dibutuhkan untuk preview peta langsung. |
| Longitude | Preferred | Dibutuhkan untuk preview peta langsung. |

Known stakeholder input:

| Lapak | Status |
| --- | --- |
| Lapak CC Kediri | Link Maps sudah disimpan, koordinat lengkap masih menunggu bila link pendek tidak bisa diekstrak otomatis. |

## Phase 3 Gate

Fase 2 siap dianggap selesai secara fungsional ketika:

1. Semua item `Done` tetap lolos `npm run lint -- --quiet` dan `npx next build`.
2. Export supplier membawa field status dan lokasi. Done.
3. Backfill koordinat tidak memerlukan perubahan struktur database lagi.
4. Satu batch data koordinat stakeholder bisa dimasukkan sebagai data update, bukan pengembangan fitur baru.

## Recommended Next Step

Sambil menunggu koordinat lengkap, kita bisa masuk Fase 3. Backfill koordinat bisa dilakukan paralel sebagai data task ketika stakeholder mengirim daftar final.
