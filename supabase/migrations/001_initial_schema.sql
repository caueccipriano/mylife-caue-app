create extension if not exists "pgcrypto";

create type public.area_status as enum ('developing', 'stable', 'paused');
create type public.project_status as enum ('active', 'paused', 'completed');
create type public.record_kind as enum (
  'memory',
  'preference',
  'milestone',
  'decision',
  'project_signal',
  'reference',
  'purchase',
  'note'
);

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  name text not null,
  status public.area_status not null default 'stable',
  current_summary text,
  direction text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  name text not null,
  status public.project_status not null default 'active',
  phase text,
  summary text,
  context text,
  deadline_date date,
  deadline_label text,
  resource_label text,
  resource_amount numeric,
  resource_currency text default 'BRL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_text text,
  source_type text not null default 'text',
  kind public.record_kind not null default 'memory',
  occurred_at timestamptz,
  classifier_version text,
  classifier_confidence numeric check (classifier_confidence between 0 and 1),
  extracted jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.record_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_id uuid not null references public.records(id) on delete cascade,
  area_id uuid references public.areas(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  relation text not null default 'context',
  created_at timestamptz not null default now()
);

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  record_id uuid references public.records(id) on delete set null,
  title text not null,
  rationale text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  record_id uuid references public.records(id) on delete set null,
  title text not null,
  event_date date not null,
  detail text,
  created_at timestamptz not null default now()
);

create table public.profile_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null,
  source_record_id uuid references public.records(id) on delete set null,
  confidence numeric check (confidence between 0 and 1),
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  created_at timestamptz not null default now()
);

alter table public.areas enable row level security;
alter table public.projects enable row level security;
alter table public.records enable row level security;
alter table public.record_links enable row level security;
alter table public.decisions enable row level security;
alter table public.timeline_events enable row level security;
alter table public.profile_facts enable row level security;

create policy "own areas" on public.areas for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own projects" on public.projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own records" on public.records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own record links" on public.record_links for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own decisions" on public.decisions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own timeline events" on public.timeline_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own profile facts" on public.profile_facts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index records_user_created_idx on public.records(user_id, created_at desc);
create index projects_user_status_idx on public.projects(user_id, status);
create index timeline_user_date_idx on public.timeline_events(user_id, event_date desc);
