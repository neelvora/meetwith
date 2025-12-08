import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { deleteCalendarEvent } from '@/lib/calendar/googleClient'
import { sendCancellationEmails } from '@/lib/email'
import type { CalendarAccount } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ error: 'Cancellation token required' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        event_types (name, duration_minutes),
        users (id, name, email, timezone)
      `)
      .eq('cancellation_token', token)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Invalid or expired cancellation link' }, { status: 404 })
    }

    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'This booking has already been cancelled' }, { status: 400 })
    }

    if (booking.external_event_id && booking.users?.id) {
      const { data: calendarAccount } = await supabaseAdmin
        .from('calendar_accounts')
        .select('*')
        .eq('user_id', booking.users.id)
        .eq('write_to_calendar', true)
        .single()

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

        try {
          await deleteCalendarEvent(
            account,
            calendarAccount.calendar_id || 'primary',
            booking.external_event_id
          )
        } catch (calError) {
          console.error('Error deleting calendar event:', calError)
        }
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', booking.id)

    if (updateError) {
      console.error('Error updating booking:', updateError)
      return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 })
    }

    await sendCancellationEmails({
      hostName: booking.users?.name || 'Host',
      hostEmail: booking.users?.email || '',
      attendeeName: booking.attendee_name,
      attendeeEmail: booking.attendee_email,
      eventName: booking.event_types?.name || 'Meeting',
      startTime: new Date(booking.start_time),
      endTime: new Date(booking.end_time),
      timezone: booking.users?.timezone || 'America/Chicago',
      cancelledBy: 'attendee',
    })

    return NextResponse.json({ success: true, message: 'Booking cancelled successfully' })
  } catch (error) {
    console.error('Error cancelling booking:', error)
    return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 })
  }
}
