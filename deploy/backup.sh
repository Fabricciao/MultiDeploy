#!/usr/bin/env bash
# Sauvegarde logique de la base (à lancer chaque nuit depuis le planificateur du VPS) + rotation locale.
# Variables : DATABASE_URL (connexion directe Postgres), BACKUP_DIR (défaut /var/backups/multideploy), KEEP_DAYS (défaut 14).
# ATTENTION : copiez ensuite le dossier HORS du VPS (S3, Backblaze, autre serveur) ; une sauvegarde sur le même disque ne protège pas d'une perte du serveur.
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL requis}"
DIR="${BACKUP_DIR:-/var/backups/multideploy}"; KEEP="${KEEP_DAYS:-14}"
mkdir -p "$DIR"
F="$DIR/multideploy-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
pg_dump --no-owner --no-privileges "$DATABASE_URL" | gzip -9 > "$F"
if [ ! -s "$F" ]; then echo "sauvegarde vide : $F" >&2; exit 1; fi
find "$DIR" -name 'multideploy-*.sql.gz' -mtime +"$KEEP" -delete
echo "OK $F ($(du -h "$F" | cut -f1))"
