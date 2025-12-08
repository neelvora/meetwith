import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const { id } = await params

  if (!session?.user?.email || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const { data: eventType, error } = await supabaseAdmin
    .from('event_types')
    .select('*')
    .eq('id', id)
    .eq('user_id', session.user.id)
    .single()

  if (error || !eventType) {
    return NextResponse.json({ error: 'Event type not found' }, { status: 404 })
  }

  return NextResponse.json({ eventType: { ...eventType, duration: eventType.duration_minutes } })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const { id } = await params

  if (!session?.user?.email || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const body = await request.json()
  const { name, slug, duration, color, description, is_active } = body

  // Check if event type belongs to user
  const { data: existing } = await supabaseAdmin
    .from('event_types')
    .select('id')
    .eq('id', id)
    .eq('user_id', session.user.id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Event type not found' }, { status: 404 })
  }

  // Check if new slug conflicts with another event type
  if (slug) {
    const { data: slugConflict } = await supabaseAdmin
      .from('event_types')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('slug', slug)
      .neq('id', id)
      .single()

    if (slugConflict) {
      return NextResponse.json({ error: 'An event type with this URL already exists' }, { status: 400 })
    }
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (name !== undefined) updates.name = name
  if (slug !== undefined) updates.slug = slug
  if (duration !== undefined) updates.duration_minutes = duration
  if (color !== undefined) updates.color = color
  if (description !== undefined) updates.description = description
  if (is_active !== undefined) updates.is_active = is_active

  const { data: eventType, error } = await supabaseAdmin
    .from('event_types')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating event type:', error)
    return NextResponse.json({ error: 'Failed to update event type' }, { status: 500 })
  }

  return NextResponse.json({ eventType: { ...eventType, duration: eventType.duration_minutes } })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const { id } = await params

  if (!session?.user?.email || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  // Check if event type belongs to user
  const { data: existing } = await supabaseAdmin
    .from('event_types')
    .select('id')
    .eq('id', id)
    .eq('user_id', session.user.id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Event type not found' }, { status: 404 })
  }

  const { error } = await supabaseAdmin
    .from('event_types')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id)

  if (error) {
    console.error('Error deleting event type:', error)
    return NextResponse.json({ error: 'Failed to delete event type' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
