-- Supabase public schema may grant broader privileges to authenticated via
-- default/public grants. RLS never protects TRUNCATE: enforce least privilege.
revoke all on table public.editalume_favorites from public, anon, authenticated;
grant select, insert, delete on public.editalume_favorites to authenticated;
grant all on public.editalume_favorites to service_role;
