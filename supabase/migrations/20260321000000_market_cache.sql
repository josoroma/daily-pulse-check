-- Market data cache table
-- Stores cached API responses to reduce external API calls
-- This is system data (not user-specific), so RLS allows authenticated reads
-- and service-role writes via server actions

create table if not exists public.market_cache (
  key text primary key,
  data jsonb not null,
  fetched_at timestamptz not null default now(),
  ttl_seconds int not null default 300
);

-- Index for cache cleanup
create index idx_market_cache_fetched_at on public.market_cache (fetched_at);

-- Enable RLS
alter table public.market_cache enable row level security;

-- All authenticated users can read cached market data
create policy "Authenticated users can read market cache"
  on public.market_cache
  for select
  to authenticated
  using (true);

-- Only server-side (service role) can insert/update/delete cache entries
-- In practice, server actions use the anon key with RLS, so we allow
-- authenticated users to upsert cache data as well (no user_id column)
create policy "Authenticated users can insert market cache"
  on public.market_cache
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update market cache"
  on public.market_cache
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete market cache"
  on public.market_cache
  for delete
  to authenticated
  using (true);

-- Request counter table for API rate limiting (Twelve Data free tier)
create table if not exists public.api_request_counts (
  provider text not null,
  date_key date not null default current_date,
  request_count int not null default 0,
  primary key (provider, date_key)
);

alter table public.api_request_counts enable row level security;

create policy "Authenticated users can read request counts"
  on public.api_request_counts
  for select
  to authenticated
  using (true);

create policy "Authenticated users can upsert request counts"
  on public.api_request_counts
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update request counts"
  on public.api_request_counts
  for update
  to authenticated
  using (true)
  with check (true);
