import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ eventTypes: [] })
  }

  const { data: eventTypes, error } = await supabaseAdmin
    .from('event_types')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching event types:', error)
    return NextResponse.json({ eventTypes: [] })
  }

  // Map duration_minutes to duration for client compatibility
  const mappedEventTypes = (eventTypes || []).map(et => ({
    ...et,
    duration: et.duration_minutes,
  }))

  return NextResponse.json({ eventTypes: mappedEventTypes })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const body = await request.json()
  const { name, slug, duration, color, description, is_active } = body

  // Validate required fields
  if (!name || !slug || !duration) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Check if slug already exists for this user
  const { data: existing } = await supabaseAdmin
    .from('event_types')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('slug', slug)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'An event type with this URL already exists' }, { status: 400 })
  }

  const { data: eventType, error } = await supabaseAdmin
    .from('event_types')
    .insert({
      user_id: session.user.id,
      name,
      slug,
      duration_minutes: duration,
      color: color || 'violet',
      description: description || '',
      is_active: is_active !== false,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating event type:', error)
    return NextResponse.json({ error: 'Failed to create event type' }, { status: 500 })
  }

  return NextResponse.json({ eventType: { ...eventType, duration: eventType.duration_minutes } })
}
