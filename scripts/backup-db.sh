#!/usr/bin/env bash
#
# Backup database AGP IS.
#
# Penyedia VPS TIDAK menyediakan backup terjadwal (VPS unmanaged), jadi
# penjadwalannya dibuat sendiri lewat cron di server. Script ini:
#   1. pg_dump database dari container Postgres
#   2. kompres hasilnya
#   3. unggah ke Object Storage (kalau dikonfigurasi)
#   4. hapus dump lokal yang lebih tua dari RETENTION_DAYS
#
# Pasang di cron (contoh: tiap hari 02:00 WIB):
#   0 2 * * * /opt/agp_is/scripts/backup-db.sh >> /var/log/agp-backup.log 2>&1
#
# Jalankan dari root direktori proyek (yang ada docker-compose.yml-nya).

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$PROJECT_DIR"

# .env dibaca supaya kredensial tidak perlu ditulis ulang di sini.
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-agp_is}"
DB_CONTAINER="${DB_CONTAINER:-agp_is_postgres}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/agp_is-$STAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date -Is)] Mulai backup database $DB_NAME"

# --clean --if-exists supaya hasil dump bisa dipulihkan ke database yang
# sudah berisi tabel, tanpa harus drop database dulu secara manual.
if ! docker exec "$DB_CONTAINER" pg_dump \
      --username "$DB_USER" \
      --dbname "$DB_NAME" \
      --clean --if-exists --no-owner --no-privileges \
    | gzip -9 > "$FILE"; then
  echo "[$(date -Is)] GAGAL: pg_dump tidak berhasil" >&2
  rm -f "$FILE"
  exit 1
fi

# Dump kosong/terlalu kecil hampir pasti tanda kegagalan yang tidak
# terdeteksi exit code -- lebih baik gagal keras daripada menyimpan file
# rusak yang baru ketahuan saat dibutuhkan.
UKURAN=$(stat -c%s "$FILE" 2>/dev/null || stat -f%z "$FILE")
if [ "$UKURAN" -lt 1024 ]; then
  echo "[$(date -Is)] GAGAL: hasil dump cuma ${UKURAN} byte, dianggap rusak" >&2
  rm -f "$FILE"
  exit 1
fi

echo "[$(date -Is)] Dump selesai: $FILE (${UKURAN} byte)"

# ── Unggah ke Object Storage ───────────────────────────────────────────
# Backup yang hanya tersimpan di VPS yang sama dengan databasenya tidak
# melindungi dari VPS-nya sendiri yang rusak.
if [ -n "${S3_BUCKET:-}" ] && [ -n "${S3_ENDPOINT:-}" ]; then
  if command -v aws >/dev/null 2>&1; then
    export AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY_ID:-}"
    export AWS_SECRET_ACCESS_KEY="${S3_SECRET_ACCESS_KEY:-}"
    export AWS_DEFAULT_REGION="${S3_REGION:-us-east-1}"
    if aws --endpoint-url "$S3_ENDPOINT" s3 cp "$FILE" "s3://$S3_BUCKET/db-backups/$(basename "$FILE")"; then
      echo "[$(date -Is)] Terunggah ke Object Storage"
    else
      echo "[$(date -Is)] PERINGATAN: gagal unggah ke Object Storage, dump lokal tetap ada" >&2
    fi
  else
    echo "[$(date -Is)] PERINGATAN: aws CLI belum terpasang, lewati unggah" >&2
  fi
else
  echo "[$(date -Is)] Object Storage belum dikonfigurasi, dump hanya tersimpan lokal"
fi

# ── Rotasi ─────────────────────────────────────────────────────────────
find "$BACKUP_DIR" -name 'agp_is-*.sql.gz' -type f -mtime "+$RETENTION_DAYS" -delete
echo "[$(date -Is)] Selesai. Menyimpan backup $RETENTION_DAYS hari terakhir."
