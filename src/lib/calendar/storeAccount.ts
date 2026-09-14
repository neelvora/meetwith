import { supabaseAdmin } from '@/lib/supabase/server'
import { decryptAccountTokens, encryptToken } from '@/lib/crypto'
import { appBaseUrl } from '@/lib/baseUrl'
import { sendMail } from '@/lib/email/send'
import { calendarDisconnectedEmail } from '@/lib/email/calendarHealth'
import type { CalendarAccount } from '@/types'

/*
 * Contract for calendar_accounts: tokens are encrypted in the database and
 * plaintext everywhere else. Anything that writes a token encrypts it here,
 * and anything that hands a row back to a caller decrypts it first, so no
 * caller downstream ever has to know which form it is holding.
 */

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
        access_token: encryptToken(accessToken),
        refresh_token: encryptToken(refreshToken),
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

  return decryptAccountTokens(data as CalendarAccount)
}

export interface GoogleAccountConnection {
  userId: string
  providerAccountId: string
  accountEmail: string
  accessToken: string
  refreshToken?: string | null
  expiresAt?: number | null
  scope?: string | null
}

/**
 * The single place a connected Google account is written. Both the dashboard's
 * OAuth callback and an ordinary Google sign-in land here, so a reconnect
 * counts whichever door it came through.
 *
 * Returns whether this account newly became the default write calendar, or
 * null if the write failed.
 */
export async function upsertGoogleCalendarAccount(
  connection: GoogleAccountConnection
): Promise<{ setAsDefault: boolean } | null> {
  if (!supabaseAdmin) {
    console.warn('Supabase not configured - skipping calendar account storage')
    return null
  }

  const { data: writeCalendars } = await supabaseAdmin
    .from('calendar_accounts')
    .select('provider_account_id')
    .eq('user_id', connection.userId)
    .eq('write_to_calendar', true)

  const holders = (writeCalendars || []) as Array<{ provider_account_id: string }>
  const setAsDefault = holders.length === 0
  // Whoever the user already picked keeps it, including this account on a reconnect
  const keepsDefault = holders.some(
    (row) => row.provider_account_id === connection.providerAccountId
  )

  const accountData: Record<string, unknown> = {
    user_id: connection.userId,
    provider: 'google',
    provider_account_id: connection.providerAccountId,
    account_email: connection.accountEmail,
    access_token: encryptToken(connection.accessToken),
    expires_at: connection.expiresAt ?? null,
    scope: connection.scope ?? null,
    calendar_id: 'primary',
    calendar_name: `${connection.accountEmail} - Primary`,
    is_primary: false,
    include_in_availability: true,
    write_to_calendar: setAsDefault || keepsDefault,
    disconnected_at: null,
    last_error: null,
    last_refresh_at: new Date().toISOString(),
  }

  // Google only returns a refresh token on a fresh consent, so writing null
  // over an existing one is how an account loses the ability to refresh at all
  if (connection.refreshToken) {
    accountData.refresh_token = encryptToken(connection.refreshToken)
  }

  const { error } = await supabaseAdmin
    .from('calendar_accounts')
    .upsert(accountData, {
      onConflict: 'user_id,provider,provider_account_id,calendar_id',
    })

  if (error) {
    console.error('Error storing calendar account:', error)
    return null
  }

  await shareTokensWithSiblingRows(connection, accountData)

  return { setAsDefault }
}

/**
 * Picking a specific calendar from an account stores it as its own row with a
 * copy of that account's tokens, so a reconnect that only touched the primary
 * row would leave those copies dead. Every row for the same Google account
 * gets the fresh grant.
 */
async function shareTokensWithSiblingRows(
  connection: GoogleAccountConnection,
  accountData: Record<string, unknown>
): Promise<void> {
  if (!supabaseAdmin) return

  const shared: Record<string, unknown> = {
    access_token: accountData.access_token,
    expires_at: accountData.expires_at,
    scope: accountData.scope,
    disconnected_at: null,
    last_error: null,
    last_refresh_at: accountData.last_refresh_at,
    updated_at: new Date().toISOString(),
  }
  if (accountData.refresh_token) {
    shared.refresh_token = accountData.refresh_token
  }

  const { error } = await supabaseAdmin
    .from('calendar_accounts')
    .update(shared)
    .eq('user_id', connection.userId)
    .eq('provider', 'google')
    .eq('account_email', connection.accountEmail)

  if (error) {
    console.error('Error sharing the new grant with the account\'s other calendars:', error)
  }
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

  return ((data || []) as CalendarAccount[]).map(decryptAccountTokens)
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

  return ((data || []) as CalendarAccount[]).map(decryptAccountTokens)
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

  return decryptAccountTokens(data as CalendarAccount)
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

const MAX_REASON_LENGTH = 200

/** What Google named as the problem. Never anything token-shaped. */
function describeTokenError(body: unknown): string {
  const payload = (body ?? {}) as { error?: unknown; error_description?: unknown }
  const code = typeof payload.error === 'string' ? payload.error : 'unknown_error'
  const detail =
    typeof payload.error_description === 'string' ? payload.error_description : ''
  return (detail ? `${code}: ${detail}` : code).slice(0, MAX_REASON_LENGTH)
}

function toShortReason(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.slice(0, MAX_REASON_LENGTH)
}

/** Keeps the newest error on an account that is already known to be down. */
async function recordRefreshError(
  account: CalendarAccount,
  reason: string
): Promise<void> {
  if (!supabaseAdmin) return

  const { error } = await supabaseAdmin
    .from('calendar_accounts')
    .update({ last_error: reason, updated_at: new Date().toISOString() })
    .eq('id', account.id)

  if (error) {
    console.error('Error recording calendar refresh failure:', error)
  }
}

/**
 * First failure wins. The update only matches a row whose disconnected_at is
 * still null, so the timestamp keeps meaning "since" and the owner gets one
 * email per outage rather than one per request.
 */
async function markDisconnected(
  account: CalendarAccount,
  reason: string
): Promise<void> {
  if (!supabaseAdmin) return

  const { data, error } = await supabaseAdmin
    .from('calendar_accounts')
    .update({
      disconnected_at: new Date().toISOString(),
      last_error: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', account.id)
    .is('disconnected_at', null)
    .select('user_id, account_email, disconnected_at')

  if (error) {
    console.error('Error recording calendar disconnect:', error)
    return
  }

  const transitioned = (data || [])[0] as
    | { user_id: string; account_email?: string | null; disconnected_at: string }
    | undefined

  if (!transitioned) {
    await recordRefreshError(account, reason)
    return
  }

  await alertOwner(transitioned)
}

/** Delivery failures are logged. A missed alert must not fail the refresh. */
async function alertOwner(account: {
  user_id: string
  account_email?: string | null
  disconnected_at: string
}): Promise<void> {
  if (!supabaseAdmin) return

  try {
    const { data: owner } = await supabaseAdmin
      .from('users')
      .select('email, timezone')
      .eq('id', account.user_id)
      .single()

    if (!owner?.email) {
      console.error('Calendar disconnected but no owner email on file:', account.user_id)
      return
    }

    const accountEmail = account.account_email || 'a connected Google account'

    await sendMail({
      from: 'MeetWith <notifications@meetwith.dev>',
      to: owner.email,
      subject: `Reconnect your calendar: ${accountEmail}`,
      html: calendarDisconnectedEmail({
        accountEmail,
        disconnectedAt: new Date(account.disconnected_at),
        calendarsUrl: `${appBaseUrl()}/dashboard/calendars`,
        timezone: owner.timezone || undefined,
      }),
    })
  } catch (error) {
    console.error('Error sending calendar disconnect alert:', error)
  }
}

/**
 * Refresh an expired access token using the refresh token
 */
export async function refreshAccessToken(account: CalendarAccount): Promise<CalendarAccount | null> {
  if (!account.refresh_token) {
    console.error('No refresh token available for account:', account.id)
    await markDisconnected(account, 'no_refresh_token')
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
      const reason = describeTokenError(tokens)
      console.error('Token refresh failed:', reason)
      await markDisconnected(account, reason)
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
        access_token: encryptToken(tokens.access_token),
        expires_at: expiresAt,
        last_refresh_at: new Date().toISOString(),
        disconnected_at: null,
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id)
      .select()
      .single()

    if (error) {
      console.error('Error saving refreshed token:', error)
      return null
    }

    return decryptAccountTokens(data as CalendarAccount)
  } catch (error) {
    console.error('Error refreshing access token:', error)
    // A request that never completed is a network problem, not proof the grant
    // is gone, so it records what happened without starting the disconnected
    // clock. Availability still holds bookings, because the read itself failed.
    await recordRefreshError(account, toShortReason(error))
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
