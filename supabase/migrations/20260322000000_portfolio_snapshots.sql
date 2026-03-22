-- Portfolio snapshots for historical portfolio value tracking
-- Stores daily snapshots of total portfolio value and position data
-- Used to render performance charts over time

create table if not exists public.portfolio_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  snapshot_date date not null default current_date,
  total_value numeric(20, 2) not null default 0,
  positions_data jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),

  -- One snapshot per portfolio per day
  unique (portfolio_id, snapshot_date)
);

-- Indexes for efficient queries
create index idx_portfolio_snapshots_user on public.portfolio_snapshots (user_id);
create index idx_portfolio_snapshots_portfolio_date on public.portfolio_snapshots (portfolio_id, snapshot_date);

-- Enable RLS
alter table public.portfolio_snapshots enable row level security;

-- Users can only read their own snapshots
create policy "Users can read own portfolio snapshots"
  on public.portfolio_snapshots
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Users can insert their own snapshots
create policy "Users can insert own portfolio snapshots"
  on public.portfolio_snapshots
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can delete their own snapshots
create policy "Users can delete own portfolio snapshots"
  on public.portfolio_snapshots
  for delete
  to authenticated
  using (auth.uid() = user_id);
