import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

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
      notes,
    } = body

    // Validate required fields
    if (!username || !startTime || !endTime || !attendeeName || !attendeeEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // For now, create a mock booking ID
    // In production, this would:
    // 1. Find the user by username
    // 2. Verify the time slot is still available
    // 3. Create a calendar event with Google Meet
    // 4. Store the booking in database
    // 5. Send confirmation emails

    const bookingId = `booking_${Date.now()}`

    // If Supabase is configured, store the booking
    if (supabaseAdmin) {
      // In production, we would:
      // const { data: user } = await supabaseAdmin
      //   .from('users')
      //   .select('id')
      //   .eq('username', username)
      //   .single()
      
      // const { data: booking, error } = await supabaseAdmin
      //   .from('bookings')
      //   .insert({
      //     user_id: user.id,
      //     event_type_id: eventTypeId,
      //     attendee_name: attendeeName,
      //     attendee_email: attendeeEmail,
      //     start_time: startTime,
      //     end_time: endTime,
      //     duration_minutes: Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000),
      //     notes,
      //     status: 'confirmed',
      //   })
      //   .select()
      //   .single()
      
      console.log('Would create booking:', {
        username,
        eventTypeId,
        startTime,
        endTime,
        attendeeName,
        attendeeEmail,
        notes,
      })
    }

    // TODO: Create Google Calendar event
    // TODO: Send confirmation email to attendee
    // TODO: Send notification to host

    return NextResponse.json({
      success: true,
      bookingId,
      message: 'Booking created successfully',
    })
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

  // In production, fetch from database
  return NextResponse.json({
    id: bookingId,
    status: 'confirmed',
  })
}
