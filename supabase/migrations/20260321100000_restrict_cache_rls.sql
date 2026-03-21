-- Restrict market_cache and api_request_counts RLS policies
-- Previously any authenticated user could insert/update/delete.
-- Cache writes only happen from server actions using the service role,
-- so we restrict write policies to service_role and keep read for authenticated.

-- market_cache: drop overly permissive write policies
drop policy if exists "Authenticated users can insert market cache" on public.market_cache;
drop policy if exists "Authenticated users can update market cache" on public.market_cache;
drop policy if exists "Authenticated users can delete market cache" on public.market_cache;

-- market_cache: add restricted write policies for service_role
create policy "Service role can insert market cache"
  on public.market_cache
  for insert
  to service_role
  with check (true);

create policy "Service role can update market cache"
  on public.market_cache
  for update
  to service_role
  using (true)
  with check (true);

create policy "Service role can delete market cache"
  on public.market_cache
  for delete
  to service_role
  using (true);

-- api_request_counts: drop overly permissive write policies
drop policy if exists "Authenticated users can upsert request counts" on public.api_request_counts;
drop policy if exists "Authenticated users can update request counts" on public.api_request_counts;

-- api_request_counts: add restricted write policies for service_role
create policy "Service role can insert request counts"
  on public.api_request_counts
  for insert
  to service_role
  with check (true);

create policy "Service role can update request counts"
  on public.api_request_counts
  for update
  to service_role
  using (true)
  with check (true);
