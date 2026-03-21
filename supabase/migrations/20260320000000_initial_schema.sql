-- Initial schema for Finance Dashboard
-- Tables: profiles, portfolios, positions, transactions, dca_schedules, alerts

-- ============================================================
-- 1. PROFILES
-- Extends auth.users — one profile per user
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  base_currency text not null default 'USD' check (base_currency in ('USD', 'CRC')),
  country text not null default 'CR',
  risk_tolerance text not null default 'Medium' check (risk_tolerance in ('Conservative', 'Medium', 'Medium-High', 'Aggressive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. PORTFOLIOS
-- A user can have multiple portfolios
-- ============================================================
create table public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Main Portfolio',
  description text,
  target_allocations jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.portfolios enable row level security;

create policy "Users can view own portfolios"
  on public.portfolios for select
  using (auth.uid() = user_id);

create policy "Users can insert own portfolios"
  on public.portfolios for insert
  with check (auth.uid() = user_id);

create policy "Users can update own portfolios"
  on public.portfolios for update
  using (auth.uid() = user_id);

create policy "Users can delete own portfolios"
  on public.portfolios for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 3. POSITIONS
-- Individual holdings within a portfolio
-- ============================================================
create table public.positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  asset_type text not null check (asset_type in ('ETF', 'Crypto')),
  symbol text not null,
  quantity numeric not null check (quantity > 0),
  average_buy_price numeric not null check (average_buy_price >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.positions enable row level security;

create policy "Users can view own positions"
  on public.positions for select
  using (auth.uid() = user_id);

create policy "Users can insert own positions"
  on public.positions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own positions"
  on public.positions for update
  using (auth.uid() = user_id);

create policy "Users can delete own positions"
  on public.positions for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 4. TRANSACTIONS
-- Buy/sell log for positions
-- ============================================================
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  position_id uuid not null references public.positions(id) on delete cascade,
  type text not null check (type in ('Buy', 'Sell', 'DCA')),
  quantity numeric not null check (quantity > 0),
  price numeric not null check (price >= 0),
  fee numeric not null default 0 check (fee >= 0),
  executed_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

create policy "Users can view own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own transactions"
  on public.transactions for update
  using (auth.uid() = user_id);

create policy "Users can delete own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 5. DCA_SCHEDULES
-- Dollar-cost averaging plans
-- ============================================================
create table public.dca_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  symbol text not null,
  asset_type text not null check (asset_type in ('ETF', 'Crypto')),
  amount numeric not null check (amount > 0),
  frequency text not null check (frequency in ('Daily', 'Weekly', 'Biweekly', 'Monthly')),
  is_active boolean not null default true,
  next_execution_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dca_schedules enable row level security;

create policy "Users can view own DCA schedules"
  on public.dca_schedules for select
  using (auth.uid() = user_id);

create policy "Users can insert own DCA schedules"
  on public.dca_schedules for insert
  with check (auth.uid() = user_id);

create policy "Users can update own DCA schedules"
  on public.dca_schedules for update
  using (auth.uid() = user_id);

create policy "Users can delete own DCA schedules"
  on public.dca_schedules for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 6. ALERTS
-- Price threshold and percentage-change rules
-- ============================================================
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  asset_type text not null check (asset_type in ('ETF', 'Crypto')),
  condition text not null check (condition in ('above', 'below', 'pct_change_up', 'pct_change_down')),
  threshold numeric not null,
  is_active boolean not null default true,
  last_triggered_at timestamptz,
  notification_channels text[] not null default '{in_app}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.alerts enable row level security;

create policy "Users can view own alerts"
  on public.alerts for select
  using (auth.uid() = user_id);

create policy "Users can insert own alerts"
  on public.alerts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own alerts"
  on public.alerts for update
  using (auth.uid() = user_id);

create policy "Users can delete own alerts"
  on public.alerts for delete
  using (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_portfolios_user_id on public.portfolios(user_id);
create index idx_positions_user_id on public.positions(user_id);
create index idx_positions_portfolio_id on public.positions(portfolio_id);
create index idx_positions_symbol on public.positions(symbol);
create index idx_transactions_user_id on public.transactions(user_id);
create index idx_transactions_position_id on public.transactions(position_id);
create index idx_dca_schedules_user_id on public.dca_schedules(user_id);
create index idx_alerts_user_id on public.alerts(user_id);
create index idx_alerts_symbol on public.alerts(symbol);

-- ============================================================
-- UPDATED_AT TRIGGER
-- Auto-update updated_at on row modification
-- ============================================================
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.update_updated_at();

create trigger set_updated_at before update on public.portfolios
  for each row execute procedure public.update_updated_at();

create trigger set_updated_at before update on public.positions
  for each row execute procedure public.update_updated_at();

create trigger set_updated_at before update on public.dca_schedules
  for each row execute procedure public.update_updated_at();

create trigger set_updated_at before update on public.alerts
  for each row execute procedure public.update_updated_at();
