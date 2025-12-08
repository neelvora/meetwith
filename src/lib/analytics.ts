import { supabaseAdmin } from '@/lib/supabase/server'

export type BookingEventType = 
  | 'page_view'      // User loaded the booking page
  | 'slot_selected'  // User selected a time slot
  | 'booking_created' // Booking was successfully created
  | 'booking_cancelled' // Booking was cancelled

interface TrackEventParams {
  userId: string        // The host's user ID
  eventType: BookingEventType
  bookingId?: string
  eventData?: Record<string, unknown>
  referrer?: string
  userAgent?: string
  ipAddress?: string
}

/**
 * Track a booking-related analytics event
 */
export async function trackBookingEvent({
  userId,
  eventType,
  bookingId,
  eventData = {},
  referrer,
  userAgent,
  ipAddress,
}: TrackEventParams): Promise<boolean> {
  if (!supabaseAdmin) {
    console.log('Analytics tracking disabled - no database configured')
    return false
  }

  try {
    const { error } = await supabaseAdmin
      .from('booking_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        booking_id: bookingId || null,
        event_data: eventData,
        referrer: referrer || null,
        user_agent: userAgent || null,
        ip_address: ipAddress || null,
      })

    if (error) {
      // Don't throw - analytics shouldn't break the main flow
      console.error('Error tracking booking event:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error tracking booking event:', error)
    return false
  }
}

/**
 * Get analytics summary for a user
 */
export async function getBookingAnalytics(userId: string, days: number = 30) {
  if (!supabaseAdmin) {
    return null
  }

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data: events, error } = await supabaseAdmin
    .from('booking_events')
    .select('event_type, created_at')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching booking analytics:', error)
    return null
  }

  // Aggregate the data
  const summary = {
    totalPageViews: 0,
    totalSlotsSelected: 0,
    totalBookingsCreated: 0,
    totalBookingsCancelled: 0,
    conversionRate: 0,
    dailyStats: [] as Array<{
      date: string
      pageViews: number
      bookings: number
    }>,
  }

  const dailyMap = new Map<string, { pageViews: number; bookings: number }>()

  for (const event of events || []) {
    const date = event.created_at.split('T')[0]
    
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { pageViews: 0, bookings: 0 })
    }
    const day = dailyMap.get(date)!

    switch (event.event_type) {
      case 'page_view':
        summary.totalPageViews++
        day.pageViews++
        break
      case 'slot_selected':
        summary.totalSlotsSelected++
        break
      case 'booking_created':
        summary.totalBookingsCreated++
        day.bookings++
        break
      case 'booking_cancelled':
        summary.totalBookingsCancelled++
        break
    }
  }

  // Calculate conversion rate
  if (summary.totalPageViews > 0) {
    summary.conversionRate = Math.round(
      (summary.totalBookingsCreated / summary.totalPageViews) * 100
    )
  }

  // Convert daily map to array
  summary.dailyStats = Array.from(dailyMap.entries())
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => b.date.localeCompare(a.date))

  return summary
}
