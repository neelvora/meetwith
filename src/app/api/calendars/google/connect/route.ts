import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Initiate OAuth flow to connect an additional Google account
 * This creates a special OAuth URL that won't switch the user's session
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/calendars/google/callback`
  
  if (!clientId) {
    return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 })
  }

  // Build OAuth URL with state containing user ID and email
  const state = Buffer.from(JSON.stringify({
    userId: session.user.id,
    userEmail: session.user.email,
    timestamp: Date.now(),
  })).toString('base64')

  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
  ].join(' ')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',
    prompt: 'consent select_account', // Force account selection
    state,
  })

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`

  return NextResponse.json({ authUrl })
}
