import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ bookingId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { bookingId } = await context.params

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        event_types (name, description),
        users (name, email)
      `)
      .eq('id', bookingId)
      .single()

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const eventType = Array.isArray(booking.event_types) ? booking.event_types[0] : booking.event_types
    const host = Array.isArray(booking.users) ? booking.users[0] : booking.users

    const startDate = new Date(booking.start_time)
    const endDate = new Date(booking.end_time)

    const formatICSDate = (date: Date): string => {
      return date.toISOString().replace(/-|:|\.\d{3}/g, '').slice(0, -1) + 'Z'
    }

    const uid = `${bookingId}@meetwith.dev`
    const dtstamp = formatICSDate(new Date())
    const dtstart = formatICSDate(startDate)
    const dtend = formatICSDate(endDate)
    const summary = eventType?.name ? `${eventType.name} with ${host?.name || 'Host'}` : `Meeting with ${host?.name || 'Host'}`
    const description = booking.location 
      ? `Join: ${booking.location}\\n\\nBooked via MeetWith` 
      : 'Booked via MeetWith'

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MeetWith//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `ORGANIZER;CN=${host?.name || 'Host'}:mailto:${host?.email || 'noreply@meetwith.dev'}`,
      `ATTENDEE;CN=${booking.attendee_name}:mailto:${booking.attendee_email}`,
      booking.location ? `URL:${booking.location}` : '',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean).join('\r\n')

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="meeting-${bookingId}.ics"`,
      },
    })
  } catch (error) {
    console.error('Error generating ICS:', error)
    return NextResponse.json({ error: 'Failed to generate calendar file' }, { status: 500 })
  }
}
