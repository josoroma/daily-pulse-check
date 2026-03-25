-- Add AI provider preferences to profiles
-- Add ai_summaries table for caching generated summaries

-- ============================================================
-- 1. AI PROVIDER COLUMNS ON PROFILES
-- ============================================================
alter table public.profiles
  add column ai_provider text not null default 'openai' check (ai_provider in ('openai', 'ollama')),
  add column ai_model text not null default 'gpt-4.1-mini';

-- ============================================================
-- 2. AI SUMMARIES
-- Caches AI-generated market summaries per user per day
-- ============================================================
create table public.ai_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  summary_date date not null default current_date,
  content text not null,
  model_used text not null,
  created_at timestamptz not null default now(),
  unique (user_id, summary_date)
);

alter table public.ai_summaries enable row level security;

create policy "Users can view own summaries"
  on public.ai_summaries for select
  using (auth.uid() = user_id);

create policy "Users can insert own summaries"
  on public.ai_summaries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own summaries"
  on public.ai_summaries for update
  using (auth.uid() = user_id);

create policy "Users can delete own summaries"
  on public.ai_summaries for delete
  using (auth.uid() = user_id);
