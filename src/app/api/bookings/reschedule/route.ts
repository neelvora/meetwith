import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } from '@/lib/calendar/googleClient'
import { sendRescheduleEmails } from '@/lib/email'
import { validateSlot } from '@/lib/availability/validateSlot'
import { checkRateLimit, getClientId, RATE_LIMITS } from '@/lib/rateLimit'
import type { CalendarAccount, AvailabilityRule } from '@/types'

// GET: Validate reschedule token and return booking info
export async function GET(request: NextRequest) {
  // Rate limit public token lookups
  const clientId = getClientId(request)
  const rateLimitResult = checkRateLimit(`reschedule:${clientId}`, RATE_LIMITS.api)
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.', retryAfter: rateLimitResult.resetIn },
      { status: 429, headers: { 'Retry-After': rateLimitResult.resetIn.toString() } }
    )
  }

  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Reschedule token required' }, { status: 400 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .select(`
      id,
      attendee_name,
      attendee_email,
      attendee_timezone,
      start_time,
      end_time,
      duration_minutes,
      status,
      reschedule_count,
      event_types (id, name, duration_minutes, slug),
      users (id, username, name, email, timezone)
    `)
    .eq('reschedule_token', token)
    .single()

  if (error || !booking) {
    return NextResponse.json({ error: 'Invalid or expired reschedule link' }, { status: 404 })
  }

  if (booking.status === 'cancelled') {
    return NextResponse.json({ error: 'This booking has been cancelled' }, { status: 400 })
  }

  // Limit reschedules (e.g., max 3 times)
  if (booking.reschedule_count && booking.reschedule_count >= 3) {
    return NextResponse.json({ error: 'Maximum reschedule limit reached' }, { status: 400 })
  }

  return NextResponse.json({
    booking: {
      id: booking.id,
      attendeeName: booking.attendee_name,
      attendeeEmail: booking.attendee_email,
      attendeeTimezone: booking.attendee_timezone,
      currentStartTime: booking.start_time,
      currentEndTime: booking.end_time,
      durationMinutes: booking.duration_minutes,
      rescheduleCount: booking.reschedule_count || 0,
    },
    eventType: booking.event_types,
    host: {
      username: booking.users?.username,
      name: booking.users?.name,
      timezone: booking.users?.timezone,
    },
  })
}

// POST: Reschedule the booking to a new time
export async function POST(request: NextRequest) {
  // Rate limit reschedule attempts
  const clientId = getClientId(request)
  const rateLimitResult = checkRateLimit(`reschedule:${clientId}`, RATE_LIMITS.booking)
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.', retryAfter: rateLimitResult.resetIn },
      { status: 429, headers: { 'Retry-After': rateLimitResult.resetIn.toString() } }
    )
  }

  try {
    const body = await request.json()
    const { token, newStartTime, newEndTime } = body

    if (!token || !newStartTime || !newEndTime) {
      return NextResponse.json(
        { error: 'Token, newStartTime, and newEndTime are required' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Get the original booking
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        event_types (id, name, duration_minutes, slug, buffer_before, buffer_after, min_notice_hours),
        users (id, username, name, email, timezone)
      `)
      .eq('reschedule_token', token)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Invalid or expired reschedule link' }, { status: 404 })
    }

    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'This booking has been cancelled' }, { status: 400 })
    }

    if (booking.reschedule_count && booking.reschedule_count >= 3) {
      return NextResponse.json({ error: 'Maximum reschedule limit reached' }, { status: 400 })
    }

    const userId = booking.users?.id || booking.user_id

    // Validate the new slot is available
    const { data: availabilityRules } = await supabaseAdmin
      .from('availability_rules')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)

    const { data: calendarAccounts } = await supabaseAdmin
      .from('calendar_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('include_in_availability', true)

    const { data: settings } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    const validAccounts: CalendarAccount[] = (calendarAccounts || []).map(ca => ({
      id: ca.id,
      user_id: ca.user_id,
      provider: ca.provider,
      provider_account_id: ca.provider_account_id,
      account_email: ca.account_email,
      access_token: ca.access_token,
      refresh_token: ca.refresh_token || undefined,
      expires_at: ca.expires_at || undefined,
      scope: ca.scope || undefined,
      calendar_id: ca.calendar_id || 'primary',
      calendar_name: ca.calendar_name || undefined,
      is_primary: ca.is_primary || false,
      include_in_availability: ca.include_in_availability ?? true,
      write_to_calendar: ca.write_to_calendar ?? false,
      created_at: ca.created_at,
    }))

    const validRules: AvailabilityRule[] = (availabilityRules || []).map(r => ({
      id: r.id,
      user_id: r.user_id,
      name: r.name || 'Default',
      weekday: r.weekday,
      start_time: r.start_time,
      end_time: r.end_time,
      is_active: r.is_active ?? true,
      created_at: r.created_at || new Date().toISOString(),
    }))

    const validation = await validateSlot({
      slotStart: new Date(newStartTime),
      slotEnd: new Date(newEndTime),
      calendarAccounts: validAccounts,
      availabilityRules: validRules,
      timezone: booking.users?.timezone || 'America/Chicago',
      minNoticeHours: settings?.min_notice || booking.event_types?.min_notice_hours || 0,
      excludeBookingId: booking.id, // Exclude the current booking from conflict check
    })

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.reason || 'This time slot is not available' },
        { status: 409 }
      )
    }

    // Get write calendar for updating the event
    const { data: writeCalendar } = await supabaseAdmin
      .from('calendar_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('write_to_calendar', true)
      .single()

    let newMeetLink = booking.location
    let newExternalEventId = booking.external_event_id

    // Update or create calendar event
    if (writeCalendar && booking.external_event_id) {
      const account: CalendarAccount = {
        id: writeCalendar.id,
        user_id: writeCalendar.user_id,
        provider: writeCalendar.provider,
        provider_account_id: writeCalendar.provider_account_id,
        account_email: writeCalendar.account_email,
        access_token: writeCalendar.access_token,
        refresh_token: writeCalendar.refresh_token || undefined,
        expires_at: writeCalendar.expires_at || undefined,
        scope: writeCalendar.scope || undefined,
        calendar_id: writeCalendar.calendar_id || 'primary',
        calendar_name: writeCalendar.calendar_name || undefined,
        is_primary: writeCalendar.is_primary || false,
        include_in_availability: writeCalendar.include_in_availability ?? true,
        write_to_calendar: writeCalendar.write_to_calendar ?? false,
        created_at: writeCalendar.created_at,
      }

      try {
        // Try to update the existing event
        const updatedEvent = await updateCalendarEvent(
          account,
          writeCalendar.calendar_id || 'primary',
          booking.external_event_id,
          {
            start: new Date(newStartTime),
            end: new Date(newEndTime),
          }
        )

        if (updatedEvent) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const conferenceData = (updatedEvent as any).conferenceData
          if (conferenceData?.entryPoints) {
            const videoEntry = conferenceData.entryPoints.find(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (ep: any) => ep.entryPointType === 'video'
            )
            if (videoEntry?.uri) {
              newMeetLink = videoEntry.uri
            }
          }
        }
      } catch (calError) {
        console.error('Error updating calendar event:', calError)
        // Continue with the reschedule even if calendar update fails
      }
    }

    // Generate new tokens for the rescheduled booking
    const newCancellationToken = randomBytes(32).toString('hex')
    const newRescheduleToken = randomBytes(32).toString('hex')

    // Update the booking with new times
    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        start_time: newStartTime,
        end_time: newEndTime,
        cancellation_token: newCancellationToken,
        reschedule_token: newRescheduleToken,
        reschedule_count: (booking.reschedule_count || 0) + 1,
        rescheduled_from_id: booking.id,
        location: newMeetLink,
        external_event_id: newExternalEventId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating booking:', updateError)
      return NextResponse.json({ error: 'Failed to reschedule booking' }, { status: 500 })
    }

    // Send reschedule notification emails
    await sendRescheduleEmails({
      hostName: booking.users?.name || 'Host',
      hostEmail: booking.users?.email || '',
      attendeeName: booking.attendee_name,
      attendeeEmail: booking.attendee_email,
      eventName: booking.event_types?.name || 'Meeting',
      oldStartTime: new Date(booking.start_time),
      oldEndTime: new Date(booking.end_time),
      newStartTime: new Date(newStartTime),
      newEndTime: new Date(newEndTime),
      timezone: booking.users?.timezone || 'America/Chicago',
      meetLink: newMeetLink || undefined,
      bookingId: booking.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Booking rescheduled successfully',
      booking: {
        id: updatedBooking.id,
        startTime: updatedBooking.start_time,
        endTime: updatedBooking.end_time,
        meetLink: newMeetLink,
      },
    })
  } catch (error) {
    console.error('Error rescheduling booking:', error)
    return NextResponse.json(
      { error: 'Failed to reschedule booking' },
      { status: 500 }
    )
  }
}
