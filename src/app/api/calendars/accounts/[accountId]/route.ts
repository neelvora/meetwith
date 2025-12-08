import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

// Delete a calendar account and all its calendars
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const { accountId } = await params

  if (!accountId) {
    return NextResponse.json({ error: 'Account ID required' }, { status: 400 })
  }

  // Verify the account belongs to the user before deleting
  const { data: account, error: lookupError } = await supabaseAdmin
    .from('calendar_accounts')
    .select('id, provider_account_id')
    .eq('id', accountId)
    .eq('user_id', session.user.id)
    .single()

  if (lookupError || !account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  // Delete all calendars for this account (by provider_account_id to catch all calendars)
  const { error: deleteError } = await supabaseAdmin
    .from('calendar_accounts')
    .delete()
    .eq('user_id', session.user.id)
    .eq('provider_account_id', account.provider_account_id)

  if (deleteError) {
    console.error('Error deleting account:', deleteError)
    return NextResponse.json({ error: 'Failed to disconnect account' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
