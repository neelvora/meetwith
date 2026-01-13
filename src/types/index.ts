export interface User {
  id: string
  email: string
  name?: string
  image?: string
  username?: string
  timezone?: string
  welcome_message?: string
  brand_color?: string
  created_at: string
  updated_at?: string
}

export interface CalendarAccount {
  id: string
  user_id: string
  provider: 'google' | 'apple' | 'outlook'
  provider_account_id: string
  account_email?: string
  access_token: string
  refresh_token?: string
  expires_at?: number
  scope?: string
  calendar_id: string
  calendar_name?: string
  is_primary: boolean
  include_in_availability: boolean
  write_to_calendar: boolean
  created_at: string
  updated_at?: string
}

export interface AvailabilityRule {
  id: string
  user_id: string
  name: string
  weekday: number // 0-6 (Sunday-Saturday)
  start_time: string // HH:MM format
  end_time: string // HH:MM format
  is_active: boolean
  created_at: string
}

export interface EventType {
  id: string
  user_id: string
  name: string
  slug: string
  description?: string
  duration_minutes: number
  color: string
  is_active: boolean
  // Payment fields
  is_paid?: boolean
  price_cents?: number
  currency?: string
  stripe_price_id?: string
  created_at: string
}

export interface Booking {
  id: string
  user_id: string
  event_type_id: string
  external_event_id?: string
  attendee_name: string
  attendee_email: string
  attendee_timezone?: string
  start_time: string
  end_time: string
  duration_minutes: number
  status: 'pending' | 'confirmed' | 'cancelled'
  external_status?: 'pending' | 'created' | 'failed' | 'not_applicable'
  external_error?: string
  external_retry_count?: number
  notes?: string
  // Payment fields
  payment_id?: string
  payment_status?: 'pending' | 'succeeded' | 'failed' | 'refunded'
  created_at: string
}

export interface TimeSlot {
  start: Date
  end: Date
  available: boolean
}

// Recurring meetings types
export type RecurrenceType = 'daily' | 'weekly' | 'biweekly' | 'monthly'
export type RecurrenceEndType = 'count' | 'date' | 'never'

export interface RecurrenceConfig {
  type: RecurrenceType
  days?: number[] // For weekly: array of weekdays (0-6)
  endType: RecurrenceEndType
  count?: number // For count-based
  endDate?: string // For date-based
}

export interface BookingSeries {
  id: string
  user_id: string
  event_type_id?: string
  recurrence_type: RecurrenceType
  recurrence_days?: number[]
  attendee_name: string
  attendee_email: string
  attendee_timezone: string
  notes?: string
  total_occurrences: number
  active_occurrences: number
  status: 'active' | 'cancelled' | 'completed'
  created_at: string
  updated_at?: string
}

export interface RecurringBookingRequest {
  eventTypeId: string
  recurrence: RecurrenceConfig
  firstSlotStart: string
  firstSlotEnd: string
  attendeeName: string
  attendeeEmail: string
  attendeeTimezone: string
  notes?: string
}

// Webhook types
export interface Webhook {
  id: string
  user_id: string
  url: string
  secret: string
  events: string[]
  is_active: boolean
  created_at: string
  updated_at?: string
  last_triggered_at?: string
  failure_count?: number
}

// Payment types
export interface Payment {
  id: string
  user_id: string
  booking_id?: string
  event_type_id?: string
  stripe_payment_intent_id?: string
  stripe_checkout_session_id?: string
  stripe_customer_id?: string
  amount_cents: number
  currency: string
  status: 'pending' | 'succeeded' | 'failed' | 'refunded'
  payer_email?: string
  payer_name?: string
  created_at: string
  completed_at?: string
  refunded_at?: string
}

export interface StripeConnectStatus {
  connected: boolean
  accountId: string | null
  status: 'pending' | 'active' | 'restricted' | null
  onboardingCompleted: boolean
  chargesEnabled: boolean
  payoutsEnabled: boolean
}
