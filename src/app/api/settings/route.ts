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
      settings: {
        username: session.user.email?.split('@')[0],
        brand_color: 'violet',
        welcome_message: 'Welcome! Please select a time that works for you.',
        notifications: {
          email_confirmations: true,
          reminders: true,
          cancellations: true,
          marketing: false,
        }
      }
    })
  }

  // Get user settings
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('username, brand_color, welcome_message, notification_preferences')
    .eq('id', session.user.id)
    .single()

  return NextResponse.json({
    settings: {
      username: user?.username || session.user.email?.split('@')[0],
      brand_color: user?.brand_color || 'violet',
      welcome_message: user?.welcome_message || 'Welcome! Please select a time that works for you.',
      notifications: user?.notification_preferences || {
        email_confirmations: true,
        reminders: true,
        cancellations: true,
        marketing: false,
      }
    }
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
  const { section, profile, branding, notifications } = body

  try {
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (section === 'profile' && profile) {
      if (profile.name) updates.name = profile.name
      if (profile.username) updates.username = profile.username
    }

    if (section === 'branding' && branding) {
      if (branding.brand_color) updates.brand_color = branding.brand_color
      if (branding.welcome_message !== undefined) updates.welcome_message = branding.welcome_message
    }

    if (section === 'notifications' && notifications) {
      updates.notification_preferences = notifications
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', session.user.id)

    if (error) {
      console.error('Error updating settings:', error)
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving settings:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
