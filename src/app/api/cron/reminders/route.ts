import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendReminderEmail } from '@/lib/email'

// This endpoint should be called by a cron job every 15 minutes
// In Vercel, you can set up a cron in vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/reminders",
//     "schedule": "*/15 * * * *"
//   }]
// }

// Security: Verify the request is from Vercel Cron or has valid API key
function verifyRequest(request: NextRequest): boolean {
  // Check for Vercel Cron header
  const cronSecret = request.headers.get('x-vercel-cron-secret')
  if (cronSecret === process.env.CRON_SECRET) {
    return true
  }

  // Check for Authorization header (for manual testing)
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true
  }

  // In development, allow without auth
  if (process.env.NODE_ENV === 'development') {
    return true
  }

  return false
}

export async function GET(request: NextRequest) {
  if (!verifyRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    // Find bookings that:
    // 1. Are confirmed
    // 2. Start within the next 24 hours
    // 3. Haven't had a reminder sent yet
    // 4. The user has reminders enabled in notification_preferences
    const now = new Date()
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        id,
        start_time,
        end_time,
        attendee_name,
        attendee_email,
        meet_link,
        reminder_sent,
        event_types!inner (
          name,
          duration_minutes,
          users!inner (
            name,
            email,
            timezone,
            notification_preferences
          )
        )
      `)
      .eq('status', 'confirmed')
      .eq('reminder_sent', false)
      .gte('start_time', now.toISOString())
      .lte('start_time', twentyFourHoursFromNow.toISOString())

    if (error) {
      console.error('Error fetching bookings for reminders:', error)
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    // Filter to only bookings where user has reminders enabled
    const bookingsToRemind = (bookings || []).filter((booking: any) => {
      const eventType = booking.event_types as any
      const notifPrefs = eventType?.users?.notification_preferences
      // Default to true if not set
      return notifPrefs?.reminders !== false
    })

    // Send reminders
    const results = await Promise.allSettled(
      bookingsToRemind.map(async (booking: any) => {
        const eventType = booking.event_types as any
        const user = eventType.users

        const sent = await sendReminderEmail({
          attendeeName: booking.attendee_name,
          attendeeEmail: booking.attendee_email,
          hostName: user.name,
          eventName: eventType.name,
          startTime: new Date(booking.start_time),
          duration: eventType.duration_minutes,
          timezone: user.timezone || 'America/Chicago',
          meetLink: booking.meet_link || undefined,
          bookingId: booking.id,
        })

        if (sent) {
          // Mark reminder as sent
          await supabaseAdmin!
            .from('bookings')
            .update({ reminder_sent: true })
            .eq('id', booking.id)
        }

        return { bookingId: booking.id, sent }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).sent).length
    const failed = results.filter(r => r.status === 'rejected' || !(r.value as any).sent).length

    return NextResponse.json({
      message: 'Reminder job completed',
      processed: bookingsToRemind.length,
      sent: successful,
      failed,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('Error in reminder cron:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Also support POST for flexibility
export const POST = GET
