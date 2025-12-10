import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getFreeBusy } from '@/lib/calendar/googleClient'
import type { CalendarAccount } from '@/types'

/**
 * Public Status Endpoint
 * 
 * Returns real-time availability status for a user by checking their
 * connected Google Calendar for current busy periods.
 * 
 * GET /api/public/status/[username]
 * 
 * Response: { "available": boolean, "username": string }
 * 
 * Logic:
 * - Checks if user is currently in a meeting (Google Calendar busy)
 * - Returns available: false if in a meeting right now
 * - Returns available: true otherwise
 * 
 * Authentication:
 * - If MEETWITH_STATUS_TOKEN is set, requires Bearer token
 * - If not set, endpoint is fully public
 * 
 * Caching:
 * - s-maxage=60 (CDN caches for 1 minute)
 * - stale-while-revalidate=300 (serve stale for up to 5 minutes while revalidating)
 */

interface RouteParams {
  params: Promise<{ username: string }>
}

// Optional token for protecting the endpoint
const STATUS_TOKEN = process.env.MEETWITH_STATUS_TOKEN

/**
 * Check if the user is currently in a meeting by querying Google Calendar
 */
async function isCurrentlyBusy(userId: string): Promise<boolean> {
  if (!supabaseAdmin) {
    console.error('Supabase admin not available')
    return false // Default to available if we can't check
  }

  // Get the user's calendar accounts that are included in availability
  const { data: accounts, error } = await supabaseAdmin
    .from('calendar_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('include_in_availability', true)

  if (error || !accounts || accounts.length === 0) {
    console.log('No calendar accounts found for user:', userId)
    return false // No calendars = assume available
  }

  // Check current time window (now to 1 minute from now)
  const now = new Date()
  const oneMinuteLater = new Date(now.getTime() + 60 * 1000)

  // Query each calendar for busy periods
  for (const account of accounts as CalendarAccount[]) {
    const calendarId = account.calendar_id || 'primary'
    
    try {
      const freeBusy = await getFreeBusy(account, [calendarId], now, oneMinuteLater)
      
      if (freeBusy?.calendars) {
        for (const calData of Object.values(freeBusy.calendars)) {
          if (calData.busy && calData.busy.length > 0) {
            // Check if any busy period overlaps with right now
            for (const busyPeriod of calData.busy) {
              const busyStart = new Date(busyPeriod.start).getTime()
              const busyEnd = new Date(busyPeriod.end).getTime()
              const nowTime = now.getTime()
              
              if (nowTime >= busyStart && nowTime < busyEnd) {
                console.log('User is currently busy:', { calendarId, busyPeriod })
                return true
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error checking calendar:', calendarId, err)
      // Continue to next calendar
    }
  }

  return false
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { username } = await params

  // If token is configured, require Bearer authentication
  if (STATUS_TOKEN) {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token || token !== STATUS_TOKEN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  // Validate username exists (basic sanity check)
  if (!username || username.length < 1) {
    return NextResponse.json(
      { error: 'Invalid username' },
      { status: 400 }
    )
  }

  // Look up the user by username
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not available' },
      { status: 503 }
    )
  }

  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('username', username)
    .single()

  if (userError || !user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    )
  }

  // Check if user is currently in a meeting
  const busy = await isCurrentlyBusy(user.id)
  const available = !busy

  // Return response with caching headers
  return NextResponse.json(
    { available, username },
    {
      status: 200,
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
        'Content-Type': 'application/json',
      },
    }
  )
}
