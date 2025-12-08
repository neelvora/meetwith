import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { computeAvailableSlots } from '@/lib/availability/computeSlots'
import type { CalendarAccount, AvailabilityRule } from '@/types'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email || !session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const startParam = searchParams.get('start')
  const endParam = searchParams.get('end')
  const duration = parseInt(searchParams.get('duration') || '30', 10)

  // Default to next 7 days if no dates provided
  const start = startParam ? new Date(startParam) : new Date()
  const end = endParam
    ? new Date(endParam)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  // Mock calendar account from session (in production, fetch from Supabase)
  const mockAccount: CalendarAccount = {
    id: 'session',
    user_id: 'session',
    provider: 'google',
    provider_account_id: session.user.email,
    account_email: session.user.email,
    access_token: session.accessToken,
    calendar_id: 'primary',
    is_primary: true,
    include_in_availability: true,
    write_to_calendar: false,
    created_at: new Date().toISOString(),
  }

  // Default availability rules (9 AM - 5 PM, Mon-Fri)
  // In production, fetch from Supabase
  const defaultRules: AvailabilityRule[] = [
    { id: '1', user_id: 'session', name: 'Default', weekday: 1, start_time: '09:00', end_time: '17:00', is_active: true, created_at: '' },
    { id: '2', user_id: 'session', name: 'Default', weekday: 2, start_time: '09:00', end_time: '17:00', is_active: true, created_at: '' },
    { id: '3', user_id: 'session', name: 'Default', weekday: 3, start_time: '09:00', end_time: '17:00', is_active: true, created_at: '' },
    { id: '4', user_id: 'session', name: 'Default', weekday: 4, start_time: '09:00', end_time: '17:00', is_active: true, created_at: '' },
    { id: '5', user_id: 'session', name: 'Default', weekday: 5, start_time: '09:00', end_time: '17:00', is_active: true, created_at: '' },
  ]

  try {
    const slots = await computeAvailableSlots({
      userId: 'session',
      calendarAccounts: [mockAccount],
      availabilityRules: defaultRules,
      timezone: 'America/Chicago',
      dateRange: { start, end },
      slotDuration: duration,
      minNoticeHours: 4,
    })

    // Filter to only available slots
    const availableSlots = slots.filter((s) => s.available)

    // Group by date for easier consumption
    // Use timezone-aware date formatting to avoid UTC offset issues
    const groupedSlots: Record<string, { start: string; end: string }[]> = {}
    const timezone = 'America/Chicago'

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
