#!/usr/bin/env bash
# Lance un Postgres jetable, applique les migrations et exécute les tests d'isolation.
# Usage : bash supabase/tests/run.sh   (fonctionne en root via l'utilisateur 'postgres', ou en non-root)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
if [ "$(id -u)" = "0" ] && [ -z "${PGTEST_REEXEC:-}" ]; then
  id postgres >/dev/null 2>&1 || useradd -m postgres
  export PGTEST_REEXEC=1
  # accès lecture au dépôt pour l'utilisateur postgres
  exec runuser -u postgres -- bash "$0" "$@"
fi
BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"
DIR="$(mktemp -d /tmp/pgtest.XXXXXX)"
PORT=54329
cleanup() { "$BIN/pg_ctl" -D "$DIR/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap cleanup EXIT
"$BIN/initdb" -D "$DIR/data" -U postgres --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null
"$BIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" -w start >/dev/null
PSQL=(psql -X -q -h "$DIR" -p "$PORT" -U postgres -v ON_ERROR_STOP=1)
"${PSQL[@]}" -d postgres -c "create database t" >/dev/null
echo ">> stub Supabase"; "${PSQL[@]}" -d t -f "$ROOT/supabase/tests/00_stub_supabase.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do echo ">> migration $(basename "$f")"; "${PSQL[@]}" -d t -f "$f"; done
echo ">> tests"
if ! "${PSQL[@]}" -d t -f "$ROOT/supabase/tests/10_isolation.sql" -f "$ROOT/supabase/tests/20_visibility_and_coverage.sql" -f "$ROOT/supabase/tests/30_phase1.sql" -f "$ROOT/supabase/tests/40_phase2.sql" >"$DIR/out" 2>&1; then
  grep -E "NOTICE|ERROR|CONTEXT|DETAIL" "$DIR/out" | sed -E 's/^psql:[^ ]+:[0-9]+: //'; echo "!! ÉCHEC DES TESTS"; exit 1
fi
sed -E 's/^psql:[^ ]+:[0-9]+: //' "$DIR/out" | grep -E "^(NOTICE|===)" | sed 's/^NOTICE:  //'
