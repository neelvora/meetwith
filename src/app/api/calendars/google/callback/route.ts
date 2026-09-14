import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { upsertGoogleCalendarAccount } from '@/lib/calendar/storeAccount'

/**
 * OAuth callback for connecting additional Google accounts
 * Exchanges code for tokens and stores them in database
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(new URL('/dashboard/calendars?error=oauth_denied', request.url))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/dashboard/calendars?error=missing_params', request.url))
  }

  // Decode state to get user ID and email
  let googleUserId: string
  let userEmail: string | undefined
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString())
    googleUserId = decoded.userId
    userEmail = decoded.userEmail
    
    // Check timestamp to prevent replay attacks (30 min window)
    if (Date.now() - decoded.timestamp > 30 * 60 * 1000) {
      return NextResponse.redirect(new URL('/dashboard/calendars?error=expired', request.url))
    }
  } catch {
    return NextResponse.redirect(new URL('/dashboard/calendars?error=invalid_state', request.url))
  }

  if (!supabaseAdmin) {
    return NextResponse.redirect(new URL('/dashboard/calendars?error=db_not_configured', request.url))
  }

  // Exchange code for tokens
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/calendars/google/callback`

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId || '',
        client_secret: clientSecret || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })

    const tokens = await tokenResponse.json()

    if (!tokenResponse.ok || !tokens.access_token) {
      console.error('Token exchange failed:', tokens)
      return NextResponse.redirect(new URL('/dashboard/calendars?error=token_exchange', request.url))
    }

    // Check granted scopes - users can uncheck permissions in granular consent
    const grantedScopes = tokens.scope || ''
    const hasCalendarReadScope = grantedScopes.includes('calendar.readonly') || grantedScopes.includes('calendar.events')
    const hasCalendarWriteScope = grantedScopes.includes('calendar.events')
    
    // If user didn't grant calendar write permission, redirect with warning
    if (!hasCalendarWriteScope) {
      console.warn('User did not grant calendar write permission. Scopes:', grantedScopes)
      return NextResponse.redirect(new URL('/dashboard/calendars?error=missing_write_permission', request.url))
    }

    // Get user info from Google (for the NEW account being connected)
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const userInfo = await userInfoResponse.json()

    if (!userInfo.email) {
      return NextResponse.redirect(new URL('/dashboard/calendars?error=no_email', request.url))
    }

    // Find the logged-in user in our database by their email
    const { data: dbUser, error: userLookupError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single()

    if (userLookupError || !dbUser) {
      console.error('User not found in database:', userEmail, userLookupError)
      return NextResponse.redirect(new URL('/dashboard/calendars?error=user_not_found', request.url))
    }

    const stored = await upsertGoogleCalendarAccount({
      userId: dbUser.id,
      providerAccountId: userInfo.id || userInfo.email,
      accountEmail: userInfo.email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_in
        ? Math.floor(Date.now() / 1000) + tokens.expires_in
        : null,
      scope: tokens.scope || null,
    })

    if (!stored) {
      return NextResponse.redirect(new URL('/dashboard/calendars?error=db_error', request.url))
    }

    // Success! Redirect back to calendars page with appropriate message
    const redirectUrl = stored.setAsDefault
      ? '/dashboard/calendars?connected=true&default=true'
      : '/dashboard/calendars?connected=true'
    return NextResponse.redirect(new URL(redirectUrl, request.url))
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(new URL('/dashboard/calendars?error=unknown', request.url))
  }
}
