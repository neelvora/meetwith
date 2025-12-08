import { supabaseAdmin } from '@/lib/supabase/server'
import type { CalendarAccount } from '@/types'

interface StoreAccountParams {
  userId: string
  provider: string
  providerAccountId: string
  accountEmail: string
  accessToken: string
  refreshToken?: string | null
  expiresAt?: number | null
  scope?: string | null
}

/**
 * Upsert a calendar account's OAuth tokens into Supabase
 * Called after successful OAuth sign-in to persist tokens
 */
export async function storeCalendarAccount({
  userId,
  provider,
  providerAccountId,
  accountEmail,
  accessToken,
  refreshToken,
  expiresAt,
  scope,
}: StoreAccountParams): Promise<CalendarAccount | null> {
  if (!supabaseAdmin) {
    console.warn('Supabase not configured - skipping calendar account storage')
    return null
  }

  const { data, error } = await supabaseAdmin
    .from('calendar_accounts')
    .upsert(
      {
        user_id: userId,
        provider,
        provider_account_id: providerAccountId,
        account_email: accountEmail,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        scope,
        calendar_id: 'primary',
        include_in_availability: true,
        write_to_calendar: false,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,provider,provider_account_id,calendar_id',
      }
    )
    .select()
    .single()

  if (error) {
    console.error('Error storing calendar account:', error)
    return null
  }

  return data as CalendarAccount
}

/**
 * Get all calendar accounts for a user
 */
export async function getCalendarAccounts(userId: string): Promise<CalendarAccount[]> {
  if (!supabaseAdmin) {
    console.warn('Supabase not configured')
    return []
  }

  const { data, error } = await supabaseAdmin
    .from('calendar_accounts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching calendar accounts:', error)
    return []
  }

  return (data || []) as CalendarAccount[]
}

/**
 * Get calendars marked for availability checking
 */
export async function getAvailabilityCalendars(userId: string): Promise<CalendarAccount[]> {
  if (!supabaseAdmin) {
    console.warn('Supabase not configured')
    return []
  }

  const { data, error } = await supabaseAdmin
    .from('calendar_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('include_in_availability', true)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching availability calendars:', error)
    return []
  }

  return (data || []) as CalendarAccount[]
}

/**
 * Update calendar account settings
 */
export async function updateCalendarAccount(
  accountId: string,
  updates: Partial<Pick<CalendarAccount, 'include_in_availability' | 'write_to_calendar' | 'calendar_name'>>
): Promise<CalendarAccount | null> {
  if (!supabaseAdmin) {
    console.warn('Supabase not configured')
    return null
  }

  const { data, error } = await supabaseAdmin
    .from('calendar_accounts')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', accountId)
    .select()
    .single()

  if (error) {
    console.error('Error updating calendar account:', error)
    return null
  }

  return data as CalendarAccount
}

/**
 * Delete a calendar account
 */
export async function deleteCalendarAccount(accountId: string): Promise<boolean> {
  if (!supabaseAdmin) {
    console.warn('Supabase not configured')
    return false
  }

  const { error } = await supabaseAdmin
    .from('calendar_accounts')
    .delete()
    .eq('id', accountId)

  if (error) {
    console.error('Error deleting calendar account:', error)
    return false
  }

  return true
}

/**
 * Refresh an expired access token using the refresh token
 */
export async function refreshAccessToken(account: CalendarAccount): Promise<CalendarAccount | null> {
  if (!account.refresh_token) {
    console.error('No refresh token available for account:', account.id)
    return null
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        grant_type: 'refresh_token',
        refresh_token: account.refresh_token,
      }),
    })

    const tokens = await response.json()

    if (!response.ok) {
      console.error('Token refresh failed:', tokens)
      return null
    }

    if (!supabaseAdmin) {
      // Return account with new token but don't persist
      return {
        ...account,
        access_token: tokens.access_token,
        expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
      }
    }

    const expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in

    const { data, error } = await supabaseAdmin
      .from('calendar_accounts')
      .update({
        access_token: tokens.access_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id)
      .select()
      .single()

    if (error) {
      console.error('Error saving refreshed token:', error)
      return null
    }

    return data as CalendarAccount
  } catch (error) {
    console.error('Error refreshing access token:', error)
    return null
  }
}

/**
 * Get a valid access token for an account, refreshing if necessary
 */
export async function getValidAccessToken(account: CalendarAccount): Promise<string | null> {
  // Check if token is expired (with 5 minute buffer)
  const now = Math.floor(Date.now() / 1000)
  const isExpired = account.expires_at ? account.expires_at < now + 300 : false

  if (isExpired) {
    const refreshedAccount = await refreshAccessToken(account)
    return refreshedAccount?.access_token || null
  }

  return account.access_token
}
