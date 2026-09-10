-- Gazeta schema: news posts + publisher auth + rate limiting
create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  image_url text,
  video_url text,
  author_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  role text not null default 'publisher',
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.auth_log (
  id bigint generated always as identity primary key,
  ip_hash text,
  ok boolean not null,
  at timestamptz not null default now()
);

create index if not exists news_created_idx on public.news (created_at desc);

-- Security: readers (anon key) may ONLY select news. Everything else is denied.
alter table public.news enable row level security;
alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.auth_log enable row level security;

drop policy if exists "public read news" on public.news;
create policy "public read news" on public.news for select to anon using (true);

-- Writes (insert/update/delete news, users, sessions) happen ONLY through
-- the Edge Function which uses the service-role key (never exposed).
revoke insert, update, delete on public.news from anon;
revoke all on public.users, public.sessions, public.auth_log from anon;
