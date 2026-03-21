import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchFredSeries, fetchDXY, FRED_SERIES, type FredSeriesId } from '@/lib/market/macro'

const VALID_SERIES = [...Object.keys(FRED_SERIES), 'DXY'] as const

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ seriesId: string }> },
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { seriesId } = await params
    const upperSeriesId = seriesId.toUpperCase()

    if (!VALID_SERIES.includes(upperSeriesId as (typeof VALID_SERIES)[number])) {
      return NextResponse.json(
        { error: `Invalid series ID. Valid: ${VALID_SERIES.join(', ')}` },
        { status: 400 },
      )
    }

    if (upperSeriesId === 'DXY') {
      const dxy = await fetchDXY()
      return NextResponse.json(dxy)
    }

    const series = await fetchFredSeries(upperSeriesId as FredSeriesId)
    return NextResponse.json(series)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch macro data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
