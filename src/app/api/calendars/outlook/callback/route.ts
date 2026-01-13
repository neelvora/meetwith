import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import { 
  exchangeOutlookCode, 
  getOutlookUser, 
  getOutlookCalendars 
} from '@/lib/calendar/outlookClient'

/**
 * GET: Handle Microsoft OAuth callback
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('Outlook OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      new URL(`/dashboard/calendars?error=${encodeURIComponent(error)}`, request.url)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/dashboard/calendars?error=no_code', request.url)
    )
  }

  // Verify state
  const storedState = request.cookies.get('outlook_oauth_state')?.value
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      new URL('/dashboard/calendars?error=invalid_state', request.url)
    )
  }

  if (!supabaseAdmin) {
    return NextResponse.redirect(
      new URL('/dashboard/calendars?error=database_error', request.url)
    )
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeOutlookCode(code)
    if (!tokens) {
      return NextResponse.redirect(
        new URL('/dashboard/calendars?error=token_exchange_failed', request.url)
      )
    }

    // Get user info
    const outlookUser = await getOutlookUser(tokens.accessToken)
    if (!outlookUser) {
      return NextResponse.redirect(
        new URL('/dashboard/calendars?error=user_info_failed', request.url)
      )
    }

    // Get calendars
    const calendars = await getOutlookCalendars(tokens.accessToken)
    const defaultCalendar = calendars.find(c => c.isDefault) || calendars[0]

    if (!defaultCalendar) {
      return NextResponse.redirect(
        new URL('/dashboard/calendars?error=no_calendars', request.url)
      )
    }

    // Check if account already exists
    const { data: existingAccount } = await supabaseAdmin
      .from('calendar_accounts')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('provider', 'outlook')
      .eq('provider_account_id', outlookUser.id)
      .single()

    const expiresAt = Math.floor(Date.now() / 1000) + tokens.expiresIn

    if (existingAccount) {
      // Update existing account
      await supabaseAdmin
        .from('calendar_accounts')
        .update({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires_at: expiresAt,
          account_email: outlookUser.email,
          calendar_id: defaultCalendar.id,
          calendar_name: defaultCalendar.name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAccount.id)
    } else {
      // Create new account
      await supabaseAdmin
        .from('calendar_accounts')
        .insert({
          user_id: session.user.id,
          provider: 'outlook',
          provider_account_id: outlookUser.id,
          account_email: outlookUser.email,
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires_at: expiresAt,
          calendar_id: defaultCalendar.id,
          calendar_name: defaultCalendar.name,
          is_primary: false,
          include_in_availability: true,
          write_to_calendar: false,
        })
    }

    // Clear state cookie
    const response = NextResponse.redirect(
      new URL('/dashboard/calendars?success=outlook_connected', request.url)
    )
    response.cookies.delete('outlook_oauth_state')
    
    return response
  } catch (error) {
    console.error('Error in Outlook callback:', error)
    return NextResponse.redirect(
      new URL('/dashboard/calendars?error=callback_failed', request.url)
    )
  }
}
