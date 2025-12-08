import type { CalendarAccount } from '@/types'
import { getValidAccessToken, refreshAccessToken } from './storeAccount'

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

export interface GoogleCalendar {
  id: string
  summary: string
  description?: string
  primary?: boolean
  backgroundColor?: string
  foregroundColor?: string
  accessRole: 'owner' | 'writer' | 'reader' | 'freeBusyReader'
}

export interface GoogleCalendarEvent {
  id: string
  summary?: string
  description?: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  end: { dateTime?: string; date?: string; timeZone?: string }
  status: 'confirmed' | 'tentative' | 'cancelled'
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus?: string
  }>
  htmlLink?: string
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: string
      uri: string
      label?: string
    }>
  }
}

export interface FreeBusyTimeSlot {
  start: string
  end: string
}

export interface FreeBusyResponse {
  calendars: {
    [calendarId: string]: {
      busy: FreeBusyTimeSlot[]
      errors?: Array<{ domain: string; reason: string }>
    }
  }
}

/**
 * Make a Google API request with automatic retry on 401
 * If the first request fails with 401, refresh the token and retry once
 */
async function googleApiRequest<T>(
  account: CalendarAccount,
  url: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error?: string }> {
  let accessToken = await getValidAccessToken(account)
  if (!accessToken) {
    return { data: null, error: 'No valid access token' }
  }

  const makeRequest = async (token: string) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    })
  }

  let response = await makeRequest(accessToken)

  // If 401, try to refresh and retry once
  if (response.status === 401) {
    console.log('Got 401, attempting token refresh and retry...')
    const refreshedAccount = await refreshAccessToken(account)
    if (refreshedAccount?.access_token) {
      accessToken = refreshedAccount.access_token
      response = await makeRequest(accessToken)
    } else {
      return { data: null, error: 'Token refresh failed' }
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    return { data: null, error: error.error?.message || error.message || 'API request failed' }
  }

  // Handle 204 No Content (e.g., DELETE requests)
  if (response.status === 204) {
    return { data: null }
  }

  const data = await response.json()
  return { data }
}

/**
 * List all calendars the user has access to
 */
export async function listCalendars(account: CalendarAccount): Promise<GoogleCalendar[]> {
  const { data, error } = await googleApiRequest<{ items: GoogleCalendar[] }>(
    account,
    `${GOOGLE_CALENDAR_API}/users/me/calendarList`
  )

  if (error) {
    console.error('Error listing calendars:', error)
    return []
  }

  return data?.items || []
}

/**
 * Get events from a specific calendar within a time range
 */
export async function getCalendarEvents(
  account: CalendarAccount,
  calendarId: string,
  timeMin: Date,
  timeMax: Date
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  })

  const { data, error } = await googleApiRequest<{ items: GoogleCalendarEvent[] }>(
    account,
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`
  )

  if (error) {
    console.error('Error getting calendar events:', error)
    return []
  }

  return data?.items || []
}

/**
 * Query free/busy information for multiple calendars
 * This is the most efficient way to check availability across calendars
 */
export async function getFreeBusy(
  account: CalendarAccount,
  calendarIds: string[],
  timeMin: Date,
  timeMax: Date
): Promise<FreeBusyResponse | null> {
  const { data, error } = await googleApiRequest<FreeBusyResponse>(
    account,
    `${GOOGLE_CALENDAR_API}/freeBusy`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: calendarIds.map((id) => ({ id })),
      }),
    }
  )

  if (error) {
    console.error('Error getting free/busy:', error)
    return null
  }

  return data
}

/**
 * Create an event on a calendar
 */
export async function createCalendarEvent(
  account: CalendarAccount,
  calendarId: string,
  event: {
    summary: string
    description?: string
    start: Date
    end: Date
    attendees?: string[]
    location?: string
    conferenceDataVersion?: number // Set to 1 to auto-create Google Meet
  }
): Promise<GoogleCalendarEvent | null> {
  const params = new URLSearchParams()
  if (event.conferenceDataVersion) {
    params.set('conferenceDataVersion', event.conferenceDataVersion.toString())
  }

  const url = `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events${
    params.toString() ? `?${params}` : ''
  }`

  const eventBody: Record<string, unknown> = {
    summary: event.summary,
    description: event.description,
    start: {
      dateTime: event.start.toISOString(),
    },
    end: {
      dateTime: event.end.toISOString(),
    },
  }

  if (event.attendees && event.attendees.length > 0) {
    eventBody.attendees = event.attendees.map((email) => ({ email }))
  }

  if (event.location) {
    eventBody.location = event.location
  }

  // Auto-create Google Meet
  if (event.conferenceDataVersion) {
    eventBody.conferenceData = {
      createRequest: {
        requestId: `meetwith-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    }
  }

  const { data, error } = await googleApiRequest<GoogleCalendarEvent>(
    account,
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    }
  )

  if (error) {
    console.error('Error creating calendar event:', error)
    return null
  }

  return data
}

/**
 * Delete an event from a calendar
 */
export async function deleteCalendarEvent(
  account: CalendarAccount,
  calendarId: string,
  eventId: string
): Promise<boolean> {
  const { error } = await googleApiRequest<null>(
    account,
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
    }
  )

  if (error) {
    console.error('Error deleting calendar event:', error)
    return false
  }

  return true
}
