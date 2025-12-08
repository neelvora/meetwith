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
  created_at: string
}

export interface Booking {
  id: string
  user_id: string
  event_type_id: string
  external_event_id?: string
  attendee_name: string
  attendee_email: string
  start_time: string
  end_time: string
  duration_minutes: number
  status: 'pending' | 'confirmed' | 'cancelled'
  notes?: string
  created_at: string
}

export interface TimeSlot {
  start: Date
  end: Date
  available: boolean
}
