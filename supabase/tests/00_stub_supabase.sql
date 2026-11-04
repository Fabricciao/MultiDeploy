-- STUB local uniquement : reproduit le strict nécessaire de Supabase (schéma auth, rôles, auth.uid/jwt).
-- Ne jamais appliquer sur un vrai projet Supabase.
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create role supabase_auth_admin nologin;
create schema auth;
create schema extensions;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
create function auth.jwt() returns jsonb language sql stable as
  $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role, supabase_auth_admin;
grant usage on schema public to anon, authenticated, service_role, supabase_auth_admin;
grant usage on schema extensions to anon, authenticated, service_role;
