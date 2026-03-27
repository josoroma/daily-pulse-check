import { z } from 'zod'

// ============================================================
// Analytics Query Params
// ============================================================

export const AnalyticsFilterSchema = z.object({
  year: z.number().int().min(2020).max(2100),
})

export type AnalyticsFilter = z.infer<typeof AnalyticsFilterSchema>

export const ReportFilterSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12).optional(),
})

export type ReportFilter = z.infer<typeof ReportFilterSchema>

export const TaxExportFilterSchema = z.object({
  year: z.number().int().min(2020).max(2100),
})

export type TaxExportFilter = z.infer<typeof TaxExportFilterSchema>
