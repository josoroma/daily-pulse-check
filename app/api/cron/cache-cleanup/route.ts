import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

/**
 * Cache Cleanup Cron — garbage-collects stale data.
 * Schedule: 0 3 * * * (03:00 UTC / 9:00 PM Costa Rica)
 *
 * Deletes:
 * - market_cache rows older than 7 days
 * - api_request_counts rows older than 30 days
 * - notifications that were read more than 30 days ago
 * - ai_summaries older than 90 days
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const results = await Promise.allSettled([
    // Stale market cache entries
    supabase.from('market_cache').delete().lt('updated_at', sevenDaysAgo),

    // Old API request counts
    supabase.from('api_request_counts').delete().lt('request_date', thirtyDaysAgo),

    // Read notifications older than 30 days
    supabase.from('notifications').delete().eq('read', true).lt('created_at', thirtyDaysAgo),

    // Old AI summaries
    supabase.from('ai_summaries').delete().lt('created_at', ninetyDaysAgo),
  ])

  const summary = {
    market_cache: results[0]?.status === 'fulfilled' ? 'ok' : 'failed',
    api_request_counts: results[1]?.status === 'fulfilled' ? 'ok' : 'failed',
    notifications: results[2]?.status === 'fulfilled' ? 'ok' : 'failed',
    ai_summaries: results[3]?.status === 'fulfilled' ? 'ok' : 'failed',
  }

  const successCount = results.filter((r) => r.status === 'fulfilled').length

  return NextResponse.json({
    cleaned: successCount,
    total: results.length,
    summary,
    cutoffs: {
      market_cache: sevenDaysAgo,
      api_request_counts: thirtyDaysAgo,
      notifications_read: thirtyDaysAgo,
      ai_summaries: ninetyDaysAgo,
    },
  })
}
