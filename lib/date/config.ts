import { setDefaultOptions } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Costa Rica timezone — passed explicitly to all TZDate constructors.
 * Never set as a hidden global default.
 */
export const CR_TIMEZONE = 'America/Costa_Rica'

// Global date-fns defaults: locale and calendar only.
// Timezone is NOT set here — it's always explicit via @date-fns/tz.
setDefaultOptions({
  locale: es,
  weekStartsOn: 1,
  firstWeekContainsDate: 4,
})
