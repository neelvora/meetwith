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

  const { searchParams } = new URL(request.url)
  const reauth = searchParams.get('reauth') === 'true'
  const loginHint = searchParams.get('hint')

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
    reauth, // Track if this is a re-authentication
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
    prompt: 'consent select_account', // Force consent to ensure all scopes are granted
    state,
  })

  // If re-authenticating, hint at the email to pre-select
  if (loginHint) {
    params.set('login_hint', loginHint)
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`

  return NextResponse.json({ authUrl })
}
