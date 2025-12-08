import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

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

  // Decode state to get user ID
  let userId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString())
    userId = decoded.userId
    
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

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const userInfo = await userInfoResponse.json()

    if (!userInfo.email) {
      return NextResponse.redirect(new URL('/dashboard/calendars?error=no_email', request.url))
    }

    // Store the calendar account in database
    const { error: upsertError } = await supabaseAdmin
      .from('calendar_accounts')
      .upsert(
        {
          user_id: userId,
          provider: 'google',
          provider_account_id: userInfo.id || userInfo.email,
          account_email: userInfo.email,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          expires_at: tokens.expires_in 
            ? Math.floor(Date.now() / 1000) + tokens.expires_in 
            : null,
          scope: tokens.scope || null,
          calendar_id: 'primary',
          calendar_name: `${userInfo.email} - Primary`,
          is_primary: false,
          include_in_availability: true,
          write_to_calendar: false,
        },
        {
          onConflict: 'user_id,provider,provider_account_id,calendar_id',
        }
      )

    if (upsertError) {
      console.error('Error storing calendar account:', upsertError)
      return NextResponse.redirect(new URL('/dashboard/calendars?error=db_error', request.url))
    }

    // Success! Redirect back to calendars page
    return NextResponse.redirect(new URL('/dashboard/calendars?connected=true', request.url))
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(new URL('/dashboard/calendars?error=unknown', request.url))
  }
}
