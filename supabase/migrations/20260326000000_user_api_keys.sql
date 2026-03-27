-- ============================================================
-- USER API KEYS
-- Encrypted storage for user-provided external API keys
-- ============================================================

create table public.user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service text not null check (service in ('twelve_data', 'openai', 'fred', 'coingecko')),
  encrypted_key text not null,
  is_valid boolean default null,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, service)
);

alter table public.user_api_keys enable row level security;

create policy "Users can view own API keys"
  on public.user_api_keys for select
  using (auth.uid() = user_id);

create policy "Users can insert own API keys"
  on public.user_api_keys for insert
  with check (auth.uid() = user_id);

create policy "Users can update own API keys"
  on public.user_api_keys for update
  using (auth.uid() = user_id);

create policy "Users can delete own API keys"
  on public.user_api_keys for delete
  using (auth.uid() = user_id);
