import { createClient } from '@supabase/supabase-js'

/**
 * Supabase admin client with service role key.
 * Only use in server-side cron jobs and background tasks — never expose to the browser.
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
