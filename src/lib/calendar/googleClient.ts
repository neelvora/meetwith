import type { CalendarAccount } from '@/types'
import { getValidAccessToken } from './storeAccount'

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
 * List all calendars the user has access to
 */
export async function listCalendars(account: CalendarAccount): Promise<GoogleCalendar[]> {
  const accessToken = await getValidAccessToken(account)
  if (!accessToken) {
    console.error('No valid access token for calendar list')
    return []
  }

  try {
    const response = await fetch(`${GOOGLE_CALENDAR_API}/users/me/calendarList`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Error listing calendars:', error)
      return []
    }

    const data = await response.json()
    return data.items || []
  } catch (error) {
    console.error('Error listing calendars:', error)
    return []
  }
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
  const accessToken = await getValidAccessToken(account)
  if (!accessToken) {
    console.error('No valid access token for calendar events')
    return []
  }

  try {
    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    })

    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('Error getting calendar events:', error)
      return []
    }

    const data = await response.json()
    return data.items || []
  } catch (error) {
    console.error('Error getting calendar events:', error)
    return []
  }
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
  const accessToken = await getValidAccessToken(account)
  if (!accessToken) {
    console.error('No valid access token for free/busy query')
    return null
  }

  try {
    const response = await fetch(`${GOOGLE_CALENDAR_API}/freeBusy`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: calendarIds.map((id) => ({ id })),
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Error getting free/busy:', error)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error getting free/busy:', error)
    return null
  }
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
  const accessToken = await getValidAccessToken(account)
  if (!accessToken) {
    console.error('No valid access token for creating event')
    return null
  }

  try {
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

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Error creating calendar event:', error)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error creating calendar event:', error)
    return null
  }
}

/**
 * Delete an event from a calendar
 */
export async function deleteCalendarEvent(
  account: CalendarAccount,
  calendarId: string,
  eventId: string
): Promise<boolean> {
  const accessToken = await getValidAccessToken(account)
  if (!accessToken) {
    console.error('No valid access token for deleting event')
    return false
  }

  try {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok && response.status !== 204) {
      const error = await response.json()
      console.error('Error deleting calendar event:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting calendar event:', error)
    return false
  }
}
