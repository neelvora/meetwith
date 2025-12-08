import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createCalendarEvent } from '@/lib/calendar/googleClient'
import { sendBookingEmails } from '@/lib/email'
import type { CalendarAccount } from '@/types'

interface BookingResponse {
  success: boolean
  bookingId: string
  message: string
  meetLink?: string
  calendarEventId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      username,
      eventTypeId,
      startTime,
      endTime,
      attendeeName,
      attendeeEmail,
      attendeeTimezone,
      notes,
    } = body

    // Validate required fields
    if (!username || !startTime || !endTime || !attendeeName || !attendeeEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Default response for when DB is not configured
    let response: BookingResponse = {
      success: true,
      bookingId: `booking_${Date.now()}`,
      message: 'Booking created successfully',
    }

    // If Supabase is configured, do the full flow
    if (supabaseAdmin) {
      // 1. Find the user by username
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, email, name, timezone')
        .eq('username', username)
        .single()
      
      if (userError || !user) {
        console.error('User not found:', userError)
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      // 2. Get the event type details (if provided)
      let eventType = null
      if (eventTypeId) {
        const { data: et } = await supabaseAdmin
          .from('event_types')
          .select('*')
          .eq('id', eventTypeId)
          .single()
        eventType = et
      }

      // 3. Get the user's primary calendar account for creating events
      const { data: calendarAccount } = await supabaseAdmin
        .from('calendar_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('write_to_calendar', true)
        .single()

      // Calculate duration
      const durationMinutes = Math.round(
        (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000
      )

      // 4. Create Google Calendar event with Google Meet
      let calendarEvent = null
      let meetLink: string | undefined
      let calendarEventId: string | undefined

      if (calendarAccount) {
        const account: CalendarAccount = {
          id: calendarAccount.id,
          user_id: calendarAccount.user_id,
          provider: calendarAccount.provider,
          provider_account_id: calendarAccount.provider_account_id,
          account_email: calendarAccount.account_email,
          access_token: calendarAccount.access_token,
          refresh_token: calendarAccount.refresh_token || undefined,
          expires_at: calendarAccount.expires_at || undefined,
          scope: calendarAccount.scope || undefined,
          calendar_id: calendarAccount.calendar_id || 'primary',
          calendar_name: calendarAccount.calendar_name || undefined,
          is_primary: calendarAccount.is_primary || false,
          include_in_availability: calendarAccount.include_in_availability ?? true,
          write_to_calendar: calendarAccount.write_to_calendar ?? false,
          created_at: calendarAccount.created_at,
        }

        // Build event title
        const eventTitle = eventType?.name
          ? `${eventType.name} - ${attendeeName}`
          : `Meeting with ${attendeeName}`

        // Build event description
        const eventDescription = `
Booked via MeetWith

Attendee: ${attendeeName}
Email: ${attendeeEmail}
${notes ? `\nNotes: ${notes}` : ''}
${attendeeTimezone ? `\nAttendee Timezone: ${attendeeTimezone}` : ''}

---
Manage this booking at https://www.meetwith.dev/dashboard
        `.trim()

        calendarEvent = await createCalendarEvent(
          account,
          calendarAccount.calendar_id || 'primary',
          {
            summary: eventTitle,
            description: eventDescription,
            start: new Date(startTime),
            end: new Date(endTime),
            attendees: [attendeeEmail],
            conferenceDataVersion: 1, // Auto-create Google Meet
          }
        )

        if (calendarEvent) {
          calendarEventId = calendarEvent.id
          // Extract Google Meet link from conference data
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const conferenceData = (calendarEvent as any).conferenceData
          if (conferenceData?.entryPoints) {
            const videoEntry = conferenceData.entryPoints.find(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (ep: any) => ep.entryPointType === 'video'
            )
            meetLink = videoEntry?.uri
          }
        }
      }

      // 5. Store the booking in database
      const { data: booking, error: bookingError } = await supabaseAdmin
        .from('bookings')
        .insert({
          user_id: user.id,
          event_type_id: eventTypeId || null,
          external_event_id: calendarEventId || null,
          attendee_name: attendeeName,
          attendee_email: attendeeEmail,
          attendee_timezone: attendeeTimezone || null,
          start_time: startTime,
          end_time: endTime,
          duration_minutes: durationMinutes,
          location: meetLink || null,
          notes: notes || null,
          status: 'confirmed',
        })
        .select()
        .single()
      
      if (bookingError) {
        console.error('Error creating booking:', bookingError)
        // If we created a calendar event but failed to save booking, we should clean up
        // For now, just log the error and continue
      }

      response = {
        success: true,
        bookingId: booking?.id || `booking_${Date.now()}`,
        message: 'Booking created successfully',
        meetLink,
        calendarEventId,
      }

      // 6. Send confirmation emails
      const emailResult = await sendBookingEmails({
        hostName: user.name || 'Host',
        hostEmail: user.email,
        attendeeName,
        attendeeEmail,
        eventName: eventType?.name || 'Meeting',
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration: durationMinutes,
        meetLink,
        notes: notes || undefined,
        bookingId: booking?.id || response.bookingId,
      })

      console.log('Booking created:', {
        bookingId: booking?.id,
        calendarEventId,
        meetLink,
        attendeeEmail,
        hostEmail: user.email,
        emailsSent: emailResult,
      })
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const bookingId = searchParams.get('id')

  if (!bookingId) {
    return NextResponse.json(
      { error: 'Booking ID required' },
      { status: 400 }
    )
  }

  if (!supabaseAdmin) {
    return NextResponse.json({
      id: bookingId,
      status: 'confirmed',
    })
  }

  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .select(`
      *,
      event_types (name, duration_minutes, color),
      users (name, email, username)
    `)
    .eq('id', bookingId)
    .single()

  if (error || !booking) {
    return NextResponse.json(
      { error: 'Booking not found' },
      { status: 404 }
    )
  }

  return NextResponse.json(booking)
}
