import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import type { BookingEventType } from '@/lib/analytics'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, eventType, eventData } = body as {
      username: string
      eventType: BookingEventType
      eventData?: Record<string, unknown>
    }

    if (!username || !eventType) {
      return NextResponse.json(
        { error: 'Username and eventType are required' },
        { status: 400 }
      )
    }

    // Only allow specific event types from public tracking
    const allowedTypes: BookingEventType[] = ['page_view', 'slot_selected']
    if (!allowedTypes.includes(eventType)) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      // Silently succeed if no database - analytics shouldn't block UX
      return NextResponse.json({ success: true })
    }

    // Look up user by username to get their ID
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    if (!user) {
      // Silently succeed - don't expose user existence
      return NextResponse.json({ success: true })
    }

    // Track the event
    const { error } = await supabaseAdmin
      .from('booking_events')
      .insert({
        user_id: user.id,
        event_type: eventType,
        event_data: eventData || {},
        referrer: request.headers.get('referer') || null,
        user_agent: request.headers.get('user-agent') || null,
      })

    if (error) {
      console.error('Error tracking analytics:', error)
      // Still return success - analytics shouldn't break UX
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics tracking error:', error)
    // Silently succeed - analytics shouldn't break the booking flow
    return NextResponse.json({ success: true })
  }
}
