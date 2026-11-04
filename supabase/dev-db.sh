#!/usr/bin/env bash
# Postgres local persistant pour le développement SANS Docker ni Supabase (stub auth + migrations + seed).
# Usage : bash supabase/dev-db.sh up | reset | stop | url
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [ "$(id -u)" = "0" ] && [ -z "${PGDEV_REEXEC:-}" ]; then
  id postgres >/dev/null 2>&1 || useradd -m postgres
  export PGDEV_REEXEC=1; exec runuser -u postgres -- bash "$0" "$@"
fi
BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"
DIR="${PGDEV_DIR:-/var/tmp/multideploy-pgdev}"; PORT="${PGDEV_PORT:-54330}"
URL="postgresql://postgres@127.0.0.1:$PORT/multideploy"
psqlx() { psql -X -q -h 127.0.0.1 -p "$PORT" -U postgres -v ON_ERROR_STOP=1 "$@"; }
start() { "$BIN/pg_isready" -q -h 127.0.0.1 -p "$PORT" || "$BIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -c listen_addresses=127.0.0.1 -k $DIR" -l "$DIR/log" -w start >/dev/null; }
load() {
  psqlx -d postgres -c "drop database if exists multideploy with (force)" -c "create database multideploy" >/dev/null
  # le stub crée des rôles globaux : on les ignore s'ils existent déjà
  psqlx -d multideploy -f <(sed -E 's/^create role (\w+) (.*);$/do $$ begin create role \1 \2; exception when duplicate_object then null; end $$;/' "$ROOT/supabase/tests/00_stub_supabase.sql")
  for f in "$ROOT"/supabase/migrations/*.sql; do psqlx -d multideploy -f "$f" 2>&1 | grep -v NOTICE || true; done
  psqlx -d multideploy -f "$ROOT/supabase/seed.sql"
}
case "${1:-up}" in
  up) mkdir -p "$DIR"; [ -d "$DIR/data" ] || "$BIN/initdb" -D "$DIR/data" -U postgres --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null
      start; psqlx -d postgres -tc "select 1 from pg_database where datname='multideploy'" | grep -q 1 || load; echo "$URL" ;;
  reset) mkdir -p "$DIR"; [ -d "$DIR/data" ] || "$BIN/initdb" -D "$DIR/data" -U postgres --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null
      start; load; echo "$URL" ;;
  stop) "$BIN/pg_ctl" -D "$DIR/data" -m fast stop ;;
  url) echo "$URL" ;;
esac
