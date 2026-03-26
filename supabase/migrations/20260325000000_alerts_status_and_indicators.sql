-- ============================================================
-- ALERTS: Add status column, indicator conditions, and parameters
-- ============================================================

-- Add status column (active/triggered/paused) to replace is_active boolean
alter table public.alerts
  add column status text not null default 'active'
    check (status in ('active', 'triggered', 'paused'));

-- Sync existing data: is_active=true → 'active', is_active=false → 'paused'
update public.alerts set status = case when is_active then 'active' else 'paused' end;

-- Add JSONB parameters column for indicator-specific config (e.g., RSI period, MA period)
alter table public.alerts
  add column parameters jsonb not null default '{}';

-- Extend condition CHECK constraint to include indicator-based conditions
alter table public.alerts drop constraint alerts_condition_check;
alter table public.alerts add constraint alerts_condition_check
  check (condition in (
    'above', 'below', 'pct_change_up', 'pct_change_down',
    'rsi_above', 'rsi_below',
    'ma_cross_above', 'ma_cross_below',
    'mvrv_above', 'mvrv_below'
  ));

-- Add triggered_at alias for clarity (last_triggered_at already exists)
-- No change needed — last_triggered_at is already in the schema

-- Add notification preferences columns to profiles
alter table public.profiles
  add column notification_email_enabled boolean not null default false,
  add column notification_telegram_enabled boolean not null default false,
  add column telegram_chat_id text;

-- Index for active alerts (used by cron evaluation)
create index idx_alerts_active on public.alerts(status) where status = 'active';
