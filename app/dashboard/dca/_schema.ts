import { z } from 'zod'

// ============================================================
// DCA Schedules
// ============================================================

export const CreateDcaScheduleSchema = z
  .object({
    portfolio_id: z.string().uuid('Invalid portfolio'),
    symbol: z.string().min(1, 'Symbol is required').max(10).toUpperCase(),
    asset_type: z.enum(['ETF', 'Crypto'], {
      message: 'Asset type is required',
    }),
    amount: z.number({ message: 'Amount is required' }).positive('Amount must be positive'),
    frequency: z.enum(['Daily', 'Weekly', 'Biweekly', 'Monthly'], {
      message: 'Frequency is required',
    }),
    day_of_week: z.number().int().min(0).max(6).nullable().optional(),
    day_of_month: z.number().int().min(1).max(31).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      (data.frequency === 'Weekly' || data.frequency === 'Biweekly') &&
      data.day_of_week == null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Day of week is required for weekly/biweekly schedules',
        path: ['day_of_week'],
      })
    }
    if (data.frequency === 'Monthly' && data.day_of_month == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Day of month is required for monthly schedules',
        path: ['day_of_month'],
      })
    }
  })

export type CreateDcaSchedule = z.infer<typeof CreateDcaScheduleSchema>

export const UpdateDcaScheduleSchema = z.object({
  id: z.string().uuid(),
  amount: z.number().positive('Amount must be positive').optional(),
  frequency: z.enum(['Daily', 'Weekly', 'Biweekly', 'Monthly']).optional(),
  day_of_week: z.number().int().min(0).max(6).nullable().optional(),
  day_of_month: z.number().int().min(1).max(31).nullable().optional(),
  is_active: z.boolean().optional(),
})

export type UpdateDcaSchedule = z.infer<typeof UpdateDcaScheduleSchema>

// ============================================================
// Frequency Display Helpers
// ============================================================

export const FREQUENCY_LABELS: Record<string, string> = {
  Daily: 'Every day',
  Weekly: 'Every week',
  Biweekly: 'Every 2 weeks',
  Monthly: 'Every month',
}

export const DAY_OF_WEEK_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const
