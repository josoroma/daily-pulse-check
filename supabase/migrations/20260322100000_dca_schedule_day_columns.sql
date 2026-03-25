-- Add day_of_week and day_of_month columns to dca_schedules
-- day_of_week: 0 (Sunday) through 6 (Saturday) — used by Weekly/Biweekly
-- day_of_month: 1 through 31 — used by Monthly

alter table public.dca_schedules
  add column day_of_week smallint check (day_of_week >= 0 and day_of_week <= 6),
  add column day_of_month smallint check (day_of_month >= 1 and day_of_month <= 31);

-- Add notifications table (shared by DCA reminders and future alert notifications)
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('dca_reminder', 'price_alert', 'indicator_alert', 'system')),
  title text not null,
  body text not null,
  read boolean not null default false,
  related_id uuid,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can insert own notifications"
  on public.notifications for insert
  with check (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "Users can delete own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);

create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notifications_unread on public.notifications(user_id) where read = false;
create index idx_dca_schedules_active on public.dca_schedules(user_id) where is_active = true;
