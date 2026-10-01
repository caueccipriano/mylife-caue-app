-- Editalume: private cross-device favorites. No payment entitlement is granted here.
create table if not exists public.editalume_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  pncp_id text not null,
  title text not null check (char_length(btrim(title)) between 1 and 300),
  uf text not null check (uf ~ '^[A-Z]{2}$'),
  closing_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (user_id, pncp_id)
);
create index if not exists editalume_favorites_user_recent_idx
  on public.editalume_favorites(user_id, created_at desc);
alter table public.editalume_favorites enable row level security;
revoke all on public.editalume_favorites from anon;
grant select, insert, delete on public.editalume_favorites to authenticated;
grant all on public.editalume_favorites to service_role;
create policy "Editalume owner selects own favorites"
  on public.editalume_favorites for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Editalume owner inserts own favorites"
  on public.editalume_favorites for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Editalume owner deletes own favorites"
  on public.editalume_favorites for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Advisory transaction lock avoids racing concurrent inserts beyond the free quota.
-- Entitlements are read only by their owner and writable only by trusted backend.
create or replace function public.editalume_check_favorite_quota()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare allowed_count integer := 5;
begin
  if new.user_id is distinct from (select auth.uid()) then
    raise exception 'Only your own account may save an opportunity';
  end if;
  if not exists (select 1 from public.editalume_opportunities where pncp_id = new.pncp_id) then
    raise exception 'Opportunity unavailable in Editalume sample';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 97101));
  if exists (
    select 1 from public.editalume_entitlements e
    where e.user_id = new.user_id and e.plan = 'premium'
      and e.active_until > now() and e.last_verified_at is not null
  ) then allowed_count := 200; end if;
  if (select count(*) from public.editalume_favorites f where f.user_id=new.user_id) >= allowed_count then
    raise exception 'Favorite limit for your plan (%) reached', allowed_count;
  end if;
  return new;
end;
$function$;
revoke all on function public.editalume_check_favorite_quota() from public, anon, authenticated;
drop trigger if exists editalume_favorite_quota on public.editalume_favorites;
create trigger editalume_favorite_quota before insert on public.editalume_favorites
for each row execute function public.editalume_check_favorite_quota();

comment on table public.editalume_favorites is
'Private Editalume favorites: five for free accounts, up to 200 for verified active Pro subscribers. Never grants access itself.';
