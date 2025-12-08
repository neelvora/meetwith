import { supabaseAdmin } from '@/lib/supabase/server'

export interface SetupStatus {
  isComplete: boolean
  completedSteps: number
  totalSteps: number
  steps: {
    id: string
    title: string
    description: string
    completed: boolean
    href: string
    priority: number
  }[]
}

export async function getSetupStatus(userEmail: string): Promise<SetupStatus | null> {
  if (!supabaseAdmin) {
    return null
  }

  // Get user
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, username')
    .eq('email', userEmail)
    .single()

  if (!user) {
    return null
  }

  // Check calendar accounts connected
  const { data: calendarAccounts } = await supabaseAdmin
    .from('calendar_accounts')
    .select('id')
    .eq('user_id', user.id)

  const hasCalendarConnected = (calendarAccounts?.length || 0) > 0

  // Check if any calendar is selected for events
  const { data: selectedCalendars } = await supabaseAdmin
    .from('selected_calendars')
    .select('id')
    .eq('user_id', user.id)

  const hasCalendarSelected = (selectedCalendars?.length || 0) > 0

  // Check availability rules
  const { data: availabilityRules } = await supabaseAdmin
    .from('availability_rules')
    .select('id')
    .eq('user_id', user.id)

  const hasAvailabilitySet = (availabilityRules?.length || 0) > 0

  // Check event types
  const { data: eventTypes } = await supabaseAdmin
    .from('event_types')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const hasEventType = (eventTypes?.length || 0) > 0

  // Check username
  const hasUsername = !!user.username

  const steps = [
    {
      id: 'calendar',
      title: 'Connect your calendar',
      description: 'Link your Google Calendar so we can check your availability',
      completed: hasCalendarConnected,
      href: '/dashboard/calendars',
      priority: 1,
    },
    {
      id: 'select-calendar',
      title: 'Select a calendar for events',
      description: 'Choose which calendar new bookings should be added to',
      completed: hasCalendarSelected,
      href: '/dashboard/calendars',
      priority: 2,
    },
    {
      id: 'availability',
      title: 'Set your availability',
      description: 'Define the hours you\'re available for meetings',
      completed: hasAvailabilitySet,
      href: '/dashboard/availability',
      priority: 3,
    },
    {
      id: 'event-type',
      title: 'Create an event type',
      description: 'Set up your first booking link (e.g., "30 Minute Meeting")',
      completed: hasEventType,
      href: '/dashboard/event-types',
      priority: 4,
    },
    {
      id: 'username',
      title: 'Set your username',
      description: 'Get a custom booking URL like meetwith.dev/yourname',
      completed: hasUsername,
      href: '/dashboard/settings',
      priority: 5,
    },
  ]

  const completedSteps = steps.filter(s => s.completed).length
  const isComplete = completedSteps === steps.length

  return {
    isComplete,
    completedSteps,
    totalSteps: steps.length,
    steps: steps.sort((a, b) => a.priority - b.priority),
  }
}
