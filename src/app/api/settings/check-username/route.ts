import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')

  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 })
  }

  // Validate format
  const usernameRegex = /^[a-z0-9_-]{3,30}$/
  const normalized = username.toLowerCase().trim()

  if (!usernameRegex.test(normalized)) {
    return NextResponse.json({ 
      available: false, 
      reason: 'invalid',
      message: 'Username must be 3-30 characters, lowercase letters, numbers, hyphens, or underscores only'
    })
  }

  // Reserved usernames that can't be used
  const reservedUsernames = [
    'admin', 'api', 'auth', 'dashboard', 'settings', 'calendars', 
    'availability', 'bookings', 'event-types', 'events', 'signin', 
    'signup', 'login', 'logout', 'register', 'account', 'profile',
    'help', 'support', 'contact', 'about', 'pricing', 'terms', 
    'privacy', 'blog', 'docs', 'ics', 'static', 'public', 'assets',
    'images', 'video', 'css', 'js', 'app', 'www', 'mail', 'ftp',
    'meetwith', 'neel', 'neelvora', 'nvllc'
  ]

  if (reservedUsernames.includes(normalized)) {
    return NextResponse.json({ 
      available: false, 
      reason: 'reserved',
      message: 'This username is reserved'
    })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ available: true })
  }

  // Check if username is taken by another user
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('username', normalized)
    .neq('id', session.user.id)
    .single()

  if (existingUser) {
    return NextResponse.json({ 
      available: false, 
      reason: 'taken',
      message: 'This username is already taken'
    })
  }

  return NextResponse.json({ available: true })
}
