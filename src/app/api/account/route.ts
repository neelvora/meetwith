import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * DELETE /api/account
 * Permanently delete the current user's account and all associated data
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const userId = session.user.id

    // Delete in order to respect foreign key constraints
    // Most tables have ON DELETE CASCADE, but let's be explicit

    // 1. Delete booking events (analytics)
    await supabaseAdmin
      .from('booking_events')
      .delete()
      .eq('user_id', userId)

    // 2. Delete bookings
    await supabaseAdmin
      .from('bookings')
      .delete()
      .eq('user_id', userId)

    // 3. Delete event types
    await supabaseAdmin
      .from('event_types')
      .delete()
      .eq('user_id', userId)

    // 4. Delete availability rules
    await supabaseAdmin
      .from('availability_rules')
      .delete()
      .eq('user_id', userId)

    // 5. Delete calendar accounts
    await supabaseAdmin
      .from('calendar_accounts')
      .delete()
      .eq('user_id', userId)

    // 6. Delete user settings
    await supabaseAdmin
      .from('user_settings')
      .delete()
      .eq('user_id', userId)

    // 7. Finally, delete the user
    const { error: userDeleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)

    if (userDeleteError) {
      console.error('Error deleting user:', userDeleteError)
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
    }

    console.log(`Account deleted: ${session.user.email} (${userId})`)

    return NextResponse.json({ 
      success: true,
      message: 'Account deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
