#!/usr/bin/env bash
#
# Pulihkan database AGP IS dari hasil backup-db.sh.
#
# Backup yang tidak pernah diuji pulih sama saja dengan tidak punya backup.
# Uji script ini SEKALI sebelum sistem dipakai produksi, dan sesudah itu
# sesekali ulangi -- jangan tunggu sampai benar-benar butuh.
#
# Pakai:
#   ./scripts/restore-db.sh backups/agp_is-20260821-020000.sql.gz

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Pakai: $0 <file-backup.sql.gz>" >&2
  exit 1
fi

BERKAS="$1"
if [ ! -f "$BERKAS" ]; then
  echo "Berkas tidak ditemukan: $BERKAS" >&2
  exit 1
fi

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$PROJECT_DIR"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-agp_is}"
DB_CONTAINER="${DB_CONTAINER:-agp_is_postgres}"

echo "PERINGATAN: ini akan MENIMPA isi database '$DB_NAME'."
read -r -p "Ketik nama databasenya untuk melanjutkan: " KONFIRMASI
if [ "$KONFIRMASI" != "$DB_NAME" ]; then
  echo "Dibatalkan."
  exit 1
fi

echo "[$(date -Is)] Memulihkan dari $BERKAS ..."
gunzip -c "$BERKAS" | docker exec -i "$DB_CONTAINER" psql --username "$DB_USER" --dbname "$DB_NAME"

echo "[$(date -Is)] Selesai. Jalankan 'npx prisma migrate deploy' bila skema backup lebih lama dari kode."
