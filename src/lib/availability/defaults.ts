import type { AvailabilityRule } from '@/types'

/**
 * Default availability rules: Monday-Friday 9am-5pm
 * Used as fallback when user hasn't configured their availability
 */
export function getDefaultAvailabilityRules(userId: string = 'default'): AvailabilityRule[] {
  const now = new Date().toISOString()
  return [
    { id: 'default-1', user_id: userId, name: 'Default', weekday: 1, start_time: '09:00', end_time: '17:00', is_active: true, created_at: now },
    { id: 'default-2', user_id: userId, name: 'Default', weekday: 2, start_time: '09:00', end_time: '17:00', is_active: true, created_at: now },
    { id: 'default-3', user_id: userId, name: 'Default', weekday: 3, start_time: '09:00', end_time: '17:00', is_active: true, created_at: now },
    { id: 'default-4', user_id: userId, name: 'Default', weekday: 4, start_time: '09:00', end_time: '17:00', is_active: true, created_at: now },
    { id: 'default-5', user_id: userId, name: 'Default', weekday: 5, start_time: '09:00', end_time: '17:00', is_active: true, created_at: now },
  ]
}

/**
 * Create default availability rules in the database for a new user
 */
export async function createDefaultAvailabilityRules(
  supabase: { from: (table: string) => unknown } | null,
  userId: string
): Promise<boolean> {
  if (!supabase) return false

  const rules = [
    { user_id: userId, weekday: 1, start_time: '09:00', end_time: '17:00', is_active: true, name: 'Default' },
    { user_id: userId, weekday: 2, start_time: '09:00', end_time: '17:00', is_active: true, name: 'Default' },
    { user_id: userId, weekday: 3, start_time: '09:00', end_time: '17:00', is_active: true, name: 'Default' },
    { user_id: userId, weekday: 4, start_time: '09:00', end_time: '17:00', is_active: true, name: 'Default' },
    { user_id: userId, weekday: 5, start_time: '09:00', end_time: '17:00', is_active: true, name: 'Default' },
  ]

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('availability_rules')
      .insert(rules)

    if (error) {
      console.error('Error creating default availability rules:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Error creating default availability rules:', err)
    return false
  }
}

/**
 * Ensure user has availability rules, creating defaults if needed
 */
export async function ensureAvailabilityRules(
  supabase: { from: (table: string) => unknown } | null,
  userId: string
): Promise<AvailabilityRule[]> {
  if (!supabase) {
    return getDefaultAvailabilityRules(userId)
  }

  try {
    // Check if user has any rules
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingRules, error } = await (supabase as any)
      .from('availability_rules')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching availability rules:', error)
      return getDefaultAvailabilityRules(userId)
    }

    // If no rules exist, create defaults
    if (!existingRules || existingRules.length === 0) {
      console.log(`No availability rules found for user ${userId}, creating defaults`)
      await createDefaultAvailabilityRules(supabase, userId)
      
      // Fetch the newly created rules
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newRules } = await (supabase as any)
        .from('availability_rules')
        .select('*')
        .eq('user_id', userId)

      return newRules || getDefaultAvailabilityRules(userId)
    }

    return existingRules
  } catch (err) {
    console.error('Error ensuring availability rules:', err)
    return getDefaultAvailabilityRules(userId)
  }
}
