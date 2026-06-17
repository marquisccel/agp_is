# Fase 3 - Payment Control

Last updated: 2026-06-17

## Objective

Fase 3 memperkuat kontrol pembayaran setelah transaksi pembelian valid: transfer supplier, bukti transfer, termin/pelunasan, dan jejak audit pembayaran.

## Scope

| Area | Status | Notes |
| --- | --- | --- |
| Tracking Fase 3 | Done | Dokumen ini menjadi pegangan progres payment control. |
| Audit upload bukti transfer | Done | Upload/ganti bukti transfer tercatat di `AuditLog`. |
| Guard pelunasan termin | Done | Hanya role operasional terkait gudang atau manager yang boleh menandai lunas. |
| Dashboard ringkas pembayaran | Done | Halaman transfer menampilkan ringkasan menunggu transfer, sudah transfer, dan termin belum lunas. |
| Export payment control | Done | Export manager membawa tanggal transfer, status pelunasan, persentase pembayaran, pembayaran awal, dan nominal belum lunas. |
| UX transfer pembayaran | Planned | Flow upload bukti transfer perlu lebih jelas untuk transaksi lunas/termin. |

## Acceptance Checklist

- Upload bukti transfer pertama tercatat sebagai audit event. Done.
- Penggantian bukti transfer tercatat sebagai audit event yang berbeda. Done.
- Pelunasan termin hanya dapat dilakukan oleh role yang berwenang. Done.
- Manager dapat membaca histori pembayaran dari detail transaksi.
- Admin/staff dapat membedakan transaksi menunggu transfer, sudah transfer, dan termin belum lunas. Done.
- Export manager memuat informasi payment control yang cukup untuk rekonsiliasi. Done.

## Phase 4 Gate

Fase 3 siap ditutup ketika kontrol pembayaran sudah punya audit, akses aman, ringkasan operasional, dan export yang dapat dipakai untuk rekonsiliasi dasar.
