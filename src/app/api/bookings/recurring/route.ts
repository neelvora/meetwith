import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createCalendarEvent } from '@/lib/calendar/googleClient'
import { sendBookingEmails } from '@/lib/email'
import { validateSlot } from '@/lib/availability/validateSlot'
import { generateRecurringSlots, validateRecurrenceConfig, describeRecurrence } from '@/lib/booking/recurring'
import { checkRateLimit, getClientId, RATE_LIMITS } from '@/lib/rateLimit'
import { sendWebhook, buildBookingCreatedPayload } from '@/lib/webhooks'
import type { CalendarAccount, AvailabilityRule, RecurrenceConfig } from '@/types'
import { decryptToken } from '@/lib/crypto'
import { reportEmailResult } from '@/lib/email/send'

interface CreateRecurringRequest {
  eventTypeId: string
  recurrence: RecurrenceConfig
  firstSlotStart: string
  firstSlotEnd: string
  attendeeName: string
  attendeeEmail: string
  attendeeTimezone: string
  notes?: string
}

// POST: Create a recurring booking series
export async function POST(request: NextRequest) {
  const clientId = getClientId(request)
  const rateLimitResult = checkRateLimit(`booking:${clientId}`, RATE_LIMITS.booking)
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.', retryAfter: rateLimitResult.resetIn },
      { status: 429, headers: { 'Retry-After': rateLimitResult.resetIn.toString() } }
    )
  }

  try {
    const body: CreateRecurringRequest = await request.json()
    const {
      eventTypeId,
      recurrence,
      firstSlotStart,
      firstSlotEnd,
      attendeeName,
      attendeeEmail,
      attendeeTimezone,
      notes,
    } = body

    // Validate required fields
    if (!eventTypeId || !recurrence || !firstSlotStart || !firstSlotEnd || !attendeeName || !attendeeEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate recurrence configuration
    const recurrenceValidation = validateRecurrenceConfig(recurrence)
    if (!recurrenceValidation.valid) {
      return NextResponse.json(
        { error: recurrenceValidation.error },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Get event type and user info
    const { data: eventType, error: eventTypeError } = await supabaseAdmin
      .from('event_types')
      .select(`
        *,
        users (id, username, name, email, timezone)
      `)
      .eq('id', eventTypeId)
      .eq('is_active', true)
      .single()

    if (eventTypeError || !eventType) {
      return NextResponse.json({ error: 'Event type not found' }, { status: 404 })
    }

    const userData = eventType.users as unknown as { id: string; username: string; name: string; email: string; timezone: string } | null
    if (!userData) {
      return NextResponse.json({ error: 'Host not found' }, { status: 404 })
    }

    const userId = userData.id
    const hostTimezone = userData.timezone || 'America/Chicago'

    // Generate all recurring slots
    const recurringSlots = generateRecurringSlots(
      new Date(firstSlotStart),
      new Date(firstSlotEnd),
      recurrence,
      hostTimezone
    )

    if (recurringSlots.length === 0) {
      return NextResponse.json({ error: 'Could not generate recurring slots' }, { status: 400 })
    }

    // Get availability rules and calendar accounts for validation
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
      access_token: decryptToken(ca.access_token),
      refresh_token: decryptToken(ca.refresh_token) || undefined,
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

    // Validate each slot is available
    const unavailableSlots: number[] = []
    for (const slot of recurringSlots) {
      const validation = await validateSlot({
        slotStart: slot.start,
        slotEnd: slot.end,
        calendarAccounts: validAccounts,
        availabilityRules: validRules,
        timezone: hostTimezone,
        minNoticeHours: settings?.min_notice || eventType.min_notice_hours || 0,
      })

      if (!validation.valid) {
        unavailableSlots.push(slot.index)
      }
    }

    if (unavailableSlots.length > 0) {
      return NextResponse.json({
        error: 'Some slots are not available',
        unavailableSlots,
        message: `Slots ${unavailableSlots.join(', ')} are not available. Please select a different starting time.`,
      }, { status: 409 })
    }

    // Create the booking series
    const { data: series, error: seriesError } = await supabaseAdmin
      .from('booking_series')
      .insert({
        user_id: userId,
        event_type_id: eventTypeId,
        recurrence_type: recurrence.type,
        recurrence_days: recurrence.days,
        attendee_name: attendeeName,
        attendee_email: attendeeEmail,
        attendee_timezone: attendeeTimezone,
        notes,
        total_occurrences: recurringSlots.length,
        active_occurrences: recurringSlots.length,
        status: 'active',
      })
      .select()
      .single()

    if (seriesError || !series) {
      console.error('Error creating booking series:', seriesError)
      return NextResponse.json({ error: 'Failed to create booking series' }, { status: 500 })
    }

    // Get write calendar for creating events
    const { data: writeCalendar } = await supabaseAdmin
      .from('calendar_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('write_to_calendar', true)
      .single()

    // Create individual bookings for each slot
    const createdBookings = []
    const recurrenceDescription = describeRecurrence(recurrence)

    for (const slot of recurringSlots) {
      const cancellationToken = randomBytes(32).toString('hex')
      const rescheduleToken = randomBytes(32).toString('hex')
      const durationMinutes = Math.round((slot.end.getTime() - slot.start.getTime()) / 60000)

      let meetLink = null
      let externalEventId = null
      let externalStatus: 'pending' | 'created' | 'failed' | 'not_applicable' = 'pending'

      // Create calendar event
      if (writeCalendar) {
        try {
          const account: CalendarAccount = {
            id: writeCalendar.id,
            user_id: writeCalendar.user_id,
            provider: writeCalendar.provider,
            provider_account_id: writeCalendar.provider_account_id,
            account_email: writeCalendar.account_email,
            access_token: decryptToken(writeCalendar.access_token),
            refresh_token: decryptToken(writeCalendar.refresh_token) || undefined,
            expires_at: writeCalendar.expires_at || undefined,
            scope: writeCalendar.scope || undefined,
            calendar_id: writeCalendar.calendar_id || 'primary',
            calendar_name: writeCalendar.calendar_name || undefined,
            is_primary: writeCalendar.is_primary || false,
            include_in_availability: writeCalendar.include_in_availability ?? true,
            write_to_calendar: writeCalendar.write_to_calendar ?? false,
            created_at: writeCalendar.created_at,
          }

          const bookingNotes = notes 
            ? `${notes}\n\nRecurring: ${recurrenceDescription} (${slot.index} of ${recurringSlots.length})`
            : `Recurring: ${recurrenceDescription} (${slot.index} of ${recurringSlots.length})`

          const calendarResult = await createCalendarEvent(
            account,
            account.calendar_id || 'primary',
            {
              summary: `${eventType.name} with ${attendeeName}`,
              description: bookingNotes,
              start: slot.start,
              end: slot.end,
              attendees: [attendeeEmail],
              conferenceDataVersion: 1,
            }
          )

          if (calendarResult) {
            externalEventId = calendarResult.id
            meetLink = calendarResult.conferenceData?.entryPoints?.[0]?.uri
            externalStatus = 'created'
          }
        } catch (error) {
          console.error(`Error creating calendar event for slot ${slot.index}:`, error)
          externalStatus = 'failed'
        }
      } else {
        externalStatus = 'not_applicable'
      }

      // Create booking record
      const { data: booking, error: bookingError } = await supabaseAdmin
        .from('bookings')
        .insert({
          user_id: userId,
          event_type_id: eventTypeId,
          series_id: series.id,
          series_index: slot.index,
          external_event_id: externalEventId,
          attendee_name: attendeeName,
          attendee_email: attendeeEmail,
          attendee_timezone: attendeeTimezone,
          start_time: slot.start.toISOString(),
          end_time: slot.end.toISOString(),
          duration_minutes: durationMinutes,
          status: 'confirmed',
          external_status: externalStatus,
          location: meetLink,
          notes: notes ? `${notes}\n\nRecurring: ${recurrenceDescription}` : undefined,
          cancellation_token: cancellationToken,
          reschedule_token: rescheduleToken,
        })
        .select()
        .single()

      if (bookingError) {
        console.error(`Error creating booking for slot ${slot.index}:`, bookingError)
        continue
      }

      createdBookings.push({
        ...booking,
        meetLink,
      })

      // Send webhook notification
      sendWebhook(userId, 'booking.created', buildBookingCreatedPayload({
        id: booking.id,
        attendee_name: attendeeName,
        attendee_email: attendeeEmail,
        start_time: slot.start.toISOString(),
        end_time: slot.end.toISOString(),
        duration_minutes: durationMinutes,
        event_type_name: eventType.name,
      })).catch(err => console.error('Webhook error:', err))
    }

    // Send confirmation email for the series (only once)
    if (createdBookings.length > 0) {
      const firstBooking = createdBookings[0]
      const firstDuration = Math.round((new Date(firstBooking.end_time).getTime() - new Date(firstBooking.start_time).getTime()) / 60000)
      const seriesEmails = await sendBookingEmails({
        hostName: userData.name || 'Host',
        hostEmail: userData.email,
        attendeeName,
        attendeeEmail,
        eventName: `${eventType.name} (${recurrenceDescription})`,
        startTime: new Date(firstBooking.start_time),
        endTime: new Date(firstBooking.end_time),
        duration: firstDuration,
        timezone: hostTimezone,
        meetLink: firstBooking.meetLink || undefined,
        bookingId: firstBooking.id,
        notes: `This is a recurring series with ${recurringSlots.length} meetings.\n\n${notes || ''}`,
      })
      reportEmailResult('recurring booking confirmation', seriesEmails)
    }

    return NextResponse.json({
      success: true,
      message: `Created ${createdBookings.length} recurring bookings`,
      series: {
        id: series.id,
        totalOccurrences: recurringSlots.length,
        recurrence: recurrenceDescription,
      },
      bookings: createdBookings.map(b => ({
        id: b.id,
        startTime: b.start_time,
        endTime: b.end_time,
        seriesIndex: b.series_index,
        meetLink: b.meetLink,
      })),
    })
  } catch (error) {
    console.error('Error creating recurring booking:', error)
    return NextResponse.json(
      { error: 'Failed to create recurring booking' },
      { status: 500 }
    )
  }
}

// GET: Get a booking series and its bookings
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const seriesId = searchParams.get('seriesId')

  if (!seriesId) {
    return NextResponse.json({ error: 'Series ID required' }, { status: 400 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const { data: series, error: seriesError } = await supabaseAdmin
    .from('booking_series')
    .select('*')
    .eq('id', seriesId)
    .single()

  if (seriesError || !series) {
    return NextResponse.json({ error: 'Series not found' }, { status: 404 })
  }

  const { data: bookings, error: bookingsError } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('series_id', seriesId)
    .order('start_time', { ascending: true })

  if (bookingsError) {
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }

  return NextResponse.json({
    series,
    bookings: bookings || [],
  })
}
