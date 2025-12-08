import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import BookingsClient from './BookingsClient'

export default async function BookingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  if (!supabaseAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-white">Bookings</h1>
        <p className="text-gray-400 mt-2">Database not configured</p>
      </div>
    )
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, timezone')
    .eq('email', session.user?.email)
    .single()

  if (!user) {
    redirect('/auth/signin')
  }

  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select(`
      id,
      attendee_name,
      attendee_email,
      start_time,
      end_time,
      duration_minutes,
      status,
      location,
      notes,
      created_at,
      follow_up_draft,
      event_types (
        id,
        name,
        color
      )
    `)
    .eq('user_id', user.id)
    .order('start_time', { ascending: false })
    .limit(100)

  const mappedBookings = (bookings || []).map(b => {
    const eventType = Array.isArray(b.event_types) ? b.event_types[0] : b.event_types
    return {
      id: b.id,
      attendeeName: b.attendee_name,
      attendeeEmail: b.attendee_email,
      startTime: b.start_time,
      endTime: b.end_time,
      duration: b.duration_minutes,
      status: b.status as 'confirmed' | 'cancelled' | 'completed',
      location: b.location,
      notes: b.notes,
      createdAt: b.created_at,
      followUpDraft: b.follow_up_draft,
      eventType: eventType ? {
        id: eventType.id,
        name: eventType.name,
        color: eventType.color,
      } : null,
    }
  })

  return <BookingsClient bookings={mappedBookings} timezone={user.timezone || 'America/Chicago'} />
}
