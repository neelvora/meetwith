import { NextRequest, NextResponse } from 'next/server'
import { computeAvailableSlots } from '@/lib/availability/computeSlots'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getDefaultAvailabilityRules } from '@/lib/availability/defaults'
import type { CalendarAccount, AvailabilityRule } from '@/types'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const startParam = searchParams.get('start')
  const endParam = searchParams.get('end')
  const duration = parseInt(searchParams.get('duration') || '30', 10)
  const username = searchParams.get('username')

  // Default to next 7 days if no dates provided
  const start = startParam ? new Date(startParam) : new Date()
  const end = endParam
    ? new Date(endParam)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  let calendarAccounts: CalendarAccount[] = []
  let availabilityRules: AvailabilityRule[] = []
  let timezone = 'America/Chicago'

  // If username provided, fetch that user's data (public booking page)
  if (username && supabaseAdmin) {
    // Get user by username
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, timezone')
      .eq('username', username)
      .single()

    if (user) {
      timezone = user.timezone || 'America/Chicago'
      
      // Get their calendar accounts
      const { data: accounts } = await supabaseAdmin
        .from('calendar_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('include_in_availability', true)

      calendarAccounts = (accounts || []) as CalendarAccount[]

      // Get their availability rules
      const { data: rules } = await supabaseAdmin
        .from('availability_rules')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)

      availabilityRules = (rules || []) as AvailabilityRule[]
    }
  }

  // Default availability rules if none set (Mon-Fri 9am-5pm)
  if (availabilityRules.length === 0) {
    availabilityRules = getDefaultAvailabilityRules(username || 'default')
  }

  try {
    const slots = await computeAvailableSlots({
      userId: username || 'default',
      calendarAccounts,
      availabilityRules,
      timezone,
      dateRange: { start, end },
      slotDuration: duration,
      minNoticeHours: 4,
    })

    // Filter to only available slots
    const availableSlots = slots.filter((s) => s.available)

    // Group by date for easier consumption
    // Use timezone-aware date formatting to avoid UTC offset issues
    const groupedSlots: Record<string, { start: string; end: string }[]> = {}

    for (const slot of availableSlots) {
      // Get the date in the user's timezone, not UTC
      const localDate = new Date(slot.start.toLocaleString('en-US', { timeZone: timezone }))
      const year = localDate.getFullYear()
      const month = String(localDate.getMonth() + 1).padStart(2, '0')
      const day = String(localDate.getDate()).padStart(2, '0')
      const dateKey = `${year}-${month}-${day}`
      
      if (!groupedSlots[dateKey]) {
        groupedSlots[dateKey] = []
      }
      groupedSlots[dateKey].push({
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
      })
    }

    return NextResponse.json({
      slots: groupedSlots,
      totalAvailable: availableSlots.length,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      duration,
    })
  } catch (error) {
    console.error('Error computing slots:', error)
    return NextResponse.json(
      { error: 'Failed to compute availability' },
      { status: 500 }
    )
  }
}
