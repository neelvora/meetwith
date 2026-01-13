import { createHmac } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/server'

export interface WebhookPayload {
  event: string
  timestamp: string
  data: Record<string, unknown>
}

export type WebhookEvent = 
  | 'booking.created'
  | 'booking.cancelled'
  | 'booking.rescheduled'

/**
 * Send webhook notifications for a specific event
 */
export async function sendWebhook(
  userId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  if (!supabaseAdmin) {
    console.log('Webhook skipped: Database not configured')
    return
  }

  try {
    // Get active webhooks for this user that are subscribed to this event
    const { data: webhooks, error } = await supabaseAdmin
      .from('webhooks')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .contains('events', [event])

    if (error || !webhooks || webhooks.length === 0) {
      return
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    }

    // Send to all matching webhooks
    await Promise.all(
      webhooks.map((webhook) => deliverWebhook(webhook, payload))
    )
  } catch (error) {
    console.error('Error sending webhooks:', error)
  }
}

async function deliverWebhook(
  webhook: {
    id: string
    url: string
    secret?: string
  },
  payload: WebhookPayload
): Promise<void> {
  const body = JSON.stringify(payload)
  
  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'MeetWith-Webhook/1.0',
    'X-Webhook-Event': payload.event,
    'X-Webhook-Timestamp': payload.timestamp,
  }

  // Sign the payload if secret is configured
  if (webhook.secret) {
    const signature = createHmac('sha256', webhook.secret)
      .update(body)
      .digest('hex')
    headers['X-Webhook-Signature'] = `sha256=${signature}`
  }

  let responseStatus: number | undefined
  let responseBody: string | undefined
  let success = false

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    responseStatus = response.status
    responseBody = await response.text().catch(() => '')
    success = response.ok
  } catch (error) {
    responseStatus = 0
    responseBody = error instanceof Error ? error.message : 'Unknown error'
    success = false
  }

  // Log the delivery attempt
  if (supabaseAdmin) {
    await supabaseAdmin.from('webhook_logs').insert({
      webhook_id: webhook.id,
      event_type: payload.event,
      payload,
      response_status: responseStatus,
      response_body: responseBody?.substring(0, 1000), // Limit response body
      success,
    })
  }
}

/**
 * Webhook payload builders for different events
 */
export function buildBookingCreatedPayload(booking: {
  id: string
  attendee_name: string
  attendee_email: string
  start_time: string
  end_time: string
  duration_minutes: number
  event_type_name?: string
  location?: string
  notes?: string
}): Record<string, unknown> {
  return {
    booking_id: booking.id,
    attendee: {
      name: booking.attendee_name,
      email: booking.attendee_email,
    },
    event: {
      name: booking.event_type_name,
      start_time: booking.start_time,
      end_time: booking.end_time,
      duration_minutes: booking.duration_minutes,
      location: booking.location,
    },
    notes: booking.notes,
  }
}

export function buildBookingCancelledPayload(booking: {
  id: string
  attendee_name: string
  attendee_email: string
  start_time: string
  end_time: string
  cancelled_by: 'host' | 'attendee'
}): Record<string, unknown> {
  return {
    booking_id: booking.id,
    attendee: {
      name: booking.attendee_name,
      email: booking.attendee_email,
    },
    original_time: {
      start: booking.start_time,
      end: booking.end_time,
    },
    cancelled_by: booking.cancelled_by,
  }
}

export function buildBookingRescheduledPayload(booking: {
  id: string
  attendee_name: string
  attendee_email: string
  old_start_time: string
  old_end_time: string
  new_start_time: string
  new_end_time: string
}): Record<string, unknown> {
  return {
    booking_id: booking.id,
    attendee: {
      name: booking.attendee_name,
      email: booking.attendee_email,
    },
    previous_time: {
      start: booking.old_start_time,
      end: booking.old_end_time,
    },
    new_time: {
      start: booking.new_start_time,
      end: booking.new_end_time,
    },
  }
}
