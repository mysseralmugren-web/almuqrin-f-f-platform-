#!/usr/bin/env bash
set -euo pipefail

: "${STAGING_DATABASE_URL:?Set STAGING_DATABASE_URL to an authorized isolated Staging Postgres connection string}"

OUT_DIR="${1:-supabase/bootstrap-staging}"
mkdir -p "$OUT_DIR"

psql "$STAGING_DATABASE_URL" -X -v ON_ERROR_STOP=1 -At -F $'\t' <<'SQL' |
select version,
       regexp_replace(name, '[^a-zA-Z0-9_]+', '_', 'g') as safe_name,
       array_to_string(statements, E'\n\n') as sql_text
from supabase_migrations.schema_migrations
where name like 'bootstrap_%'
   or name like 'restore_%'
   or name like 'staging_%'
   or name like 'seed_ai_%'
   or name like 'remove_staging_%'
order by version;
SQL
while IFS=$'\t' read -r version name sql_text; do
  file="$OUT_DIR/${version}_${name}.sql"
  {
    printf '%s\n' '-- Generated from isolated Staging migration history.'
    printf '%s\n' '-- Review before applying to any other environment.'
    printf '%s\n\n' "$sql_text"
  } > "$file"
done

echo "Exported isolated Staging bootstrap migrations to $OUT_DIR"
