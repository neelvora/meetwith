import { notFound } from 'next/navigation'
import BookingClient from './BookingClient'
import { supabaseAdmin } from '@/lib/supabase/server'

interface BookingPageProps {
  params: Promise<{ username: string }>
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { username } = await params
  
  if (!supabaseAdmin) {
    // Fallback for when database is not configured
    notFound()
  }

  // Fetch user by username
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, name, username, image, welcome_message, brand_color')
    .eq('username', username)
    .single()

  if (!user) {
    notFound()
  }

  // Fetch user's active event types
  const { data: eventTypes } = await supabaseAdmin
    .from('event_types')
    .select('id, slug, name, description, duration_minutes, color')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  // Map to the format expected by BookingClient
  const mappedEventTypes = (eventTypes || []).map(et => ({
    id: et.id,
    slug: et.slug,
    name: et.name,
    description: et.description || '',
    duration: et.duration_minutes,
    color: et.color || 'violet',
  }))

  const mappedUser = {
    name: user.name || username,
    username: user.username || username,
    image: user.image,
    welcomeMessage: user.welcome_message || 'Welcome! Please select a meeting type below to schedule a time with me.',
  }

  return (
    <BookingClient
      username={username}
      user={mappedUser}
      eventTypes={mappedEventTypes}
    />
  )
}
