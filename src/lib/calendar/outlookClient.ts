/**
 * Microsoft Outlook Calendar Integration
 * 
 * SETUP REQUIRED:
 * 1. Register app in Azure Portal (portal.azure.com)
 * 2. Add API permissions:
 *    - Calendars.ReadWrite
 *    - User.Read
 * 3. Configure redirect URI: {BASE_URL}/api/calendars/outlook/callback
 * 4. Set environment variables:
 *    - OUTLOOK_CLIENT_ID
 *    - OUTLOOK_CLIENT_SECRET
 * 
 * Microsoft Graph API Reference:
 * https://learn.microsoft.com/en-us/graph/api/resources/calendar
 */

const MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0'
const GRAPH_API_URL = 'https://graph.microsoft.com/v1.0'

const SCOPES = [
  'Calendars.ReadWrite',
  'User.Read',
  'offline_access', // For refresh token
].join(' ')

/**
 * Generate OAuth URL for Microsoft login
 */
export function getOutlookAuthUrl(state: string): string {
  const clientId = process.env.OUTLOOK_CLIENT_ID
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/calendars/outlook/callback`
  
  if (!clientId) {
    throw new Error('OUTLOOK_CLIENT_ID not configured')
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
    response_mode: 'query',
  })

  return `${MICROSOFT_AUTH_URL}/authorize?${params}`
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeOutlookCode(code: string): Promise<{
  accessToken: string
  refreshToken: string
  expiresIn: number
} | null> {
  const clientId = process.env.OUTLOOK_CLIENT_ID
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/calendars/outlook/callback`

  if (!clientId || !clientSecret) {
    console.error('Outlook credentials not configured')
    return null
  }

  try {
    const response = await fetch(`${MICROSOFT_AUTH_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Outlook token exchange failed:', error)
      return null
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    }
  } catch (error) {
    console.error('Error exchanging Outlook code:', error)
    return null
  }
}

/**
 * Refresh an expired access token
 */
export async function refreshOutlookToken(refreshToken: string): Promise<{
  accessToken: string
  refreshToken: string
  expiresIn: number
} | null> {
  const clientId = process.env.OUTLOOK_CLIENT_ID
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return null
  }

  try {
    const response = await fetch(`${MICROSOFT_AUTH_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // May not return new refresh token
      expiresIn: data.expires_in,
    }
  } catch (error) {
    console.error('Error refreshing Outlook token:', error)
    return null
  }
}

/**
 * Get user info from Microsoft Graph
 */
export async function getOutlookUser(accessToken: string): Promise<{
  id: string
  email: string
  name: string
} | null> {
  try {
    const response = await fetch(`${GRAPH_API_URL}/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return {
      id: data.id,
      email: data.mail || data.userPrincipalName,
      name: data.displayName,
    }
  } catch (error) {
    console.error('Error getting Outlook user:', error)
    return null
  }
}

/**
 * List user's calendars
 */
export async function getOutlookCalendars(accessToken: string): Promise<Array<{
  id: string
  name: string
  canEdit: boolean
  isDefault: boolean
}>> {
  try {
    const response = await fetch(`${GRAPH_API_URL}/me/calendars`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return (data.value || []).map((cal: Record<string, unknown>) => ({
      id: cal.id,
      name: cal.name,
      canEdit: cal.canEdit,
      isDefault: cal.isDefaultCalendar,
    }))
  } catch (error) {
    console.error('Error listing Outlook calendars:', error)
    return []
  }
}

/**
 * Get free/busy times from Outlook calendar
 */
export async function getOutlookBusyTimes(
  accessToken: string,
  calendarId: string,
  start: Date,
  end: Date
): Promise<Array<{ start: string; end: string }>> {
  try {
    const response = await fetch(`${GRAPH_API_URL}/me/calendars/${calendarId}/calendarView`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="UTC"',
      },
    })

    // Note: For actual implementation, use getSchedule API for free/busy
    // This is simplified for the scaffold

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return (data.value || [])
      .filter((event: Record<string, unknown>) => event.showAs === 'busy' || event.showAs === 'tentative')
      .map((event: Record<string, { dateTime: string }>) => ({
        start: event.start.dateTime,
        end: event.end.dateTime,
      }))
  } catch (error) {
    console.error('Error getting Outlook busy times:', error)
    return []
  }
}

/**
 * Create an event on Outlook calendar
 */
export async function createOutlookEvent(
  accessToken: string,
  calendarId: string,
  event: {
    subject: string
    body?: string
    start: Date
    end: Date
    attendees?: string[]
    location?: string
    isOnlineMeeting?: boolean
  }
): Promise<{ id: string; webLink: string; joinUrl?: string } | null> {
  try {
    const eventBody: Record<string, unknown> = {
      subject: event.subject,
      body: {
        contentType: 'HTML',
        content: event.body || '',
      },
      start: {
        dateTime: event.start.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: event.end.toISOString(),
        timeZone: 'UTC',
      },
      isOnlineMeeting: event.isOnlineMeeting,
      onlineMeetingProvider: event.isOnlineMeeting ? 'teamsForBusiness' : undefined,
    }

    if (event.attendees) {
      eventBody.attendees = event.attendees.map(email => ({
        emailAddress: { address: email },
        type: 'required',
      }))
    }

    if (event.location) {
      eventBody.location = { displayName: event.location }
    }

    const response = await fetch(`${GRAPH_API_URL}/me/calendars/${calendarId}/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Failed to create Outlook event:', error)
      return null
    }

    const data = await response.json()
    return {
      id: data.id,
      webLink: data.webLink,
      joinUrl: data.onlineMeeting?.joinUrl,
    }
  } catch (error) {
    console.error('Error creating Outlook event:', error)
    return null
  }
}

/**
 * Delete an event from Outlook calendar
 */
export async function deleteOutlookEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${GRAPH_API_URL}/me/calendars/${calendarId}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    return response.ok
  } catch (error) {
    console.error('Error deleting Outlook event:', error)
    return false
  }
}
