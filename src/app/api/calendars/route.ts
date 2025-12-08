import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // If Supabase is configured, fetch from database
  if (supabaseAdmin && session.user.id) {
    const { data: accounts, error } = await supabaseAdmin
      .from('calendar_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching calendar accounts:', error)
    }

    if (accounts && accounts.length > 0) {
      return NextResponse.json({ accounts })
    }
  }

  // Fallback: return based on session token (for users not yet in DB)
  const accounts = session.accessToken
    ? [
        {
          id: 'google-primary',
          user_id: session.user.id || 'temp',
          provider: 'google' as const,
          provider_account_id: session.user.email,
          account_email: session.user.email,
          access_token: session.accessToken,
          calendar_id: 'primary',
          calendar_name: 'Primary Calendar',
          is_primary: true,
          include_in_availability: true,
          write_to_calendar: true,
          created_at: new Date().toISOString(),
        },
      ]
    : []

  return NextResponse.json({ accounts })
}

// Add a calendar to the user's account
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const body = await request.json()
  const { calendarId, calendarName, backgroundColor, includeInAvailability = true } = body

  if (!calendarId) {
    return NextResponse.json({ error: 'Calendar ID required' }, { status: 400 })
  }

  // Upsert the calendar
  const { data, error } = await supabaseAdmin
    .from('calendar_accounts')
    .upsert(
      {
        user_id: session.user.id,
        provider: 'google',
        provider_account_id: session.user.email,
        account_email: session.user.email,
        access_token: session.accessToken || '',
        refresh_token: session.refreshToken || null,
        expires_at: session.expiresAt || null,
        calendar_id: calendarId,
        calendar_name: calendarName || calendarId,
        is_primary: calendarId === 'primary',
        include_in_availability: includeInAvailability,
        write_to_calendar: calendarId === 'primary',
      },
      {
        onConflict: 'user_id,provider,provider_account_id,calendar_id',
      }
    )
    .select()
    .single()

  if (error) {
    console.error('Error adding calendar:', error)
    return NextResponse.json({ error: 'Failed to add calendar' }, { status: 500 })
  }

  return NextResponse.json({ calendar: data })
}

// Update calendar settings
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const body = await request.json()
  const { calendarId, includeInAvailability, writeToCalendar } = body

  if (!calendarId) {
    return NextResponse.json({ error: 'Calendar ID required' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (typeof includeInAvailability === 'boolean') {
    updates.include_in_availability = includeInAvailability
  }

  if (typeof writeToCalendar === 'boolean') {
    // If setting this calendar to write, unset others first
    if (writeToCalendar) {
      await supabaseAdmin
        .from('calendar_accounts')
        .update({ write_to_calendar: false })
        .eq('user_id', session.user.id)
    }
    updates.write_to_calendar = writeToCalendar
  }

  const { data, error } = await supabaseAdmin
    .from('calendar_accounts')
    .update(updates)
    .eq('user_id', session.user.id)
    .eq('calendar_id', calendarId)
    .select()
    .single()

  if (error) {
    console.error('Error updating calendar:', error)
    return NextResponse.json({ error: 'Failed to update calendar' }, { status: 500 })
  }

  return NextResponse.json({ calendar: data })
}

// Delete a calendar from availability checking
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const calendarId = searchParams.get('calendarId')

  if (!calendarId) {
    return NextResponse.json({ error: 'Calendar ID required' }, { status: 400 })
  }

  // Don't allow deleting primary calendar
  if (calendarId === 'primary') {
    return NextResponse.json({ error: 'Cannot remove primary calendar' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('calendar_accounts')
    .delete()
    .eq('user_id', session.user.id)
    .eq('calendar_id', calendarId)

  if (error) {
    console.error('Error deleting calendar:', error)
    return NextResponse.json({ error: 'Failed to remove calendar' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
