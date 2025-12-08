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
    return NextResponse.json({ 
      availability: [],
      timezone: 'America/Chicago',
      settings: { buffer_time: 0, min_notice: 4, daily_limit: 0 }
    })
  }

  // Get availability rules
  const { data: rules, error: rulesError } = await supabaseAdmin
    .from('availability_rules')
    .select('*')
    .eq('user_id', session.user.id)
    .order('weekday', { ascending: true })

  if (rulesError) {
    console.error('Error fetching availability rules:', rulesError)
  }

  // Get user timezone
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('timezone')
    .eq('id', session.user.id)
    .single()

  return NextResponse.json({
    availability: rules || [],
    timezone: user?.timezone || 'America/Chicago',
    settings: { buffer_time: 0, min_notice: 4, daily_limit: 0 }
  })
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
  const { availability, timezone } = body

  try {
    // Update timezone
    if (timezone) {
      await supabaseAdmin
        .from('users')
        .update({ timezone, updated_at: new Date().toISOString() })
        .eq('id', session.user.id)
    }

    // Delete existing rules
    await supabaseAdmin
      .from('availability_rules')
      .delete()
      .eq('user_id', session.user.id)

    // Insert new rules
    if (availability && availability.length > 0) {
      const rulesToInsert = availability.map((rule: {
        weekday: number
        start_time: string
        end_time: string
        is_active: boolean
      }) => ({
        user_id: session.user.id,
        weekday: rule.weekday,
        start_time: rule.start_time,
        end_time: rule.end_time,
        is_active: rule.is_active,
        name: 'Default',
      }))

      const { error: insertError } = await supabaseAdmin
        .from('availability_rules')
        .insert(rulesToInsert)

      if (insertError) {
        console.error('Error inserting availability rules:', insertError)
        return NextResponse.json({ error: 'Failed to save availability' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving availability:', error)
    return NextResponse.json({ error: 'Failed to save availability' }, { status: 500 })
  }
}
