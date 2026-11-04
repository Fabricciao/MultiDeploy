alter table public.property_media add column thumb_path text;
create index property_media_cover on public.property_media (property_id) where is_cover;
