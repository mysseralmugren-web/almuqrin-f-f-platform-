insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'interior-renders',
  'interior-renders',
  false,
  104857600,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/json',
    'model/gltf-binary',
    'model/gltf+json',
    'application/octet-stream'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = greatest(coalesce(storage.buckets.file_size_limit, 0), 104857600),
    allowed_mime_types = excluded.allowed_mime_types;

comment on table public.interior_render_jobs is
  'Tenant-isolated Blender render jobs. Outputs may include images or interactive GLB assets.';
