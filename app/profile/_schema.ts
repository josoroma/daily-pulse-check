import { z } from 'zod'

export const BASE_CURRENCIES = ['USD', 'CRC'] as const
export const RISK_TOLERANCES = ['Conservative', 'Medium', 'Medium-High', 'Aggressive'] as const

export const UpdateProfileSchema = z.object({
  display_name: z.string().max(100).optional(),
  base_currency: z.enum(BASE_CURRENCIES, {
    message: 'Base currency is required',
  }),
  country: z.string().min(1, 'Country is required').max(100),
  risk_tolerance: z.enum(RISK_TOLERANCES, {
    message: 'Risk tolerance is required',
  }),
})

export type UpdateProfile = z.infer<typeof UpdateProfileSchema>
