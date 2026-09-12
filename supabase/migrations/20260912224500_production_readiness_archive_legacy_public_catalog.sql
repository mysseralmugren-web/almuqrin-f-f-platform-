create schema if not exists private;
create table if not exists private.store_public_catalog_legacy_archive as
select c.*, now() as archived_at
from public.store_public_catalog c
where false;

insert into private.store_public_catalog_legacy_archive
select c.*, now()
from public.store_public_catalog c
where not exists (select 1 from public.store_products p where p.id=c.product_id)
  and not exists (
    select 1 from private.store_public_catalog_legacy_archive a where a.product_id=c.product_id
  );

delete from public.store_public_catalog c
where not exists (select 1 from public.store_products p where p.id=c.product_id);

alter table private.store_public_catalog_legacy_archive enable row level security;
revoke all on private.store_public_catalog_legacy_archive from public, anon, authenticated;
