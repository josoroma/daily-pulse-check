import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isScheduleDue, type DcaSchedule } from '@/app/dashboard/dca/_utils'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

/**
 * Cron job: Check all active DCA schedules and create reminders for those due today.
 * Protected by CRON_SECRET header — only Vercel Cron or manual trigger with the secret.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()

  // Fetch all active DCA schedules
  const { data: schedules, error: fetchError } = await supabase
    .from('dca_schedules')
    .select(
      'id, user_id, symbol, amount, frequency, day_of_week, day_of_month, is_active, next_execution_at, created_at',
    )
    .eq('is_active', true)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!schedules || schedules.length === 0) {
    return NextResponse.json({ processed: 0, reminders: 0 })
  }

  const reminders: Array<{
    user_id: string
    type: string
    title: string
    body: string
    related_id: string
  }> = []

  for (const schedule of schedules) {
    const dcaSchedule: DcaSchedule = {
      id: schedule.id,
      frequency: schedule.frequency as DcaSchedule['frequency'],
      day_of_week: schedule.day_of_week,
      day_of_month: schedule.day_of_month,
      is_active: schedule.is_active,
      next_execution_at: schedule.next_execution_at,
      created_at: schedule.created_at,
    }

    if (isScheduleDue(dcaSchedule, now)) {
      reminders.push({
        user_id: schedule.user_id,
        type: 'dca_reminder',
        title: `DCA Reminder: ${schedule.symbol}`,
        body: `Time to invest $${Number(schedule.amount).toFixed(2)} in ${schedule.symbol}`,
        related_id: schedule.id,
      })
    }
  }

  if (reminders.length > 0) {
    const { error: insertError } = await supabase.from('notifications').insert(reminders)

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  }

  return NextResponse.json({
    processed: schedules.length,
    reminders: reminders.length,
  })
}
