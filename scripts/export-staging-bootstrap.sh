#!/usr/bin/env bash
set -euo pipefail

: "${STAGING_DATABASE_URL:?Set STAGING_DATABASE_URL to an authorized isolated Staging Postgres connection string}"

OUT_DIR="${1:-supabase/bootstrap-staging}"
mkdir -p "$OUT_DIR"

mapfile -t migrations < <(
  psql "$STAGING_DATABASE_URL" -X -v ON_ERROR_STOP=1 -At -F '|' <<'SQL'
select version || '|' || regexp_replace(name, '[^a-zA-Z0-9_]+', '_', 'g')
from supabase_migrations.schema_migrations
where name like 'bootstrap_%'
   or name like 'restore_%'
   or name like 'staging_%'
   or name like 'seed_ai_%'
   or name like 'remove_staging_%'
order by version;
SQL
)

for row in "${migrations[@]}"; do
  version="${row%%|*}"
  name="${row#*|}"
  file="$OUT_DIR/${version}_${name}.sql"

  {
    printf '%s\n' '-- Generated from isolated Staging migration history.'
    printf '%s\n' '-- Review before applying to any other environment.'
    psql "$STAGING_DATABASE_URL" -X -v ON_ERROR_STOP=1 -At \
      -v version="$version" \
      -c "select array_to_string(statements, E'\\n\\n') from supabase_migrations.schema_migrations where version = :'version';"
    printf '\n'
  } > "$file"
done

echo "Exported ${#migrations[@]} isolated Staging bootstrap migrations to $OUT_DIR"
