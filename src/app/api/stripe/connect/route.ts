import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import { 
  stripe, 
  createConnectAccount, 
  createConnectAccountLink, 
  getConnectAccountStatus 
} from '@/lib/payments/stripe'

/**
 * GET: Get current Stripe Connect status
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('stripe_account_id, stripe_account_status, stripe_onboarding_completed')
    .eq('id', session.user.id)
    .single()

  if (!user?.stripe_account_id) {
    return NextResponse.json({
      connected: false,
      accountId: null,
      status: null,
      onboardingCompleted: false,
    })
  }

  // Get fresh status from Stripe
  const stripeStatus = await getConnectAccountStatus(user.stripe_account_id)

  return NextResponse.json({
    connected: true,
    accountId: user.stripe_account_id,
    status: user.stripe_account_status,
    onboardingCompleted: user.stripe_onboarding_completed,
    chargesEnabled: stripeStatus?.chargesEnabled || false,
    payoutsEnabled: stripeStatus?.payoutsEnabled || false,
  })
}

/**
 * POST: Start Stripe Connect onboarding
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe not configured. Please set STRIPE_SECRET_KEY.' },
      { status: 500 }
    )
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { countryCode = 'US' } = body

    // Get user
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, stripe_account_id')
      .eq('id', session.user.id)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let accountId = user.stripe_account_id

    // Create new Connect account if doesn't exist
    if (!accountId) {
      accountId = await createConnectAccount(user.email, countryCode)
      
      if (!accountId) {
        return NextResponse.json(
          { error: 'Failed to create Stripe account' },
          { status: 500 }
        )
      }

      // Save account ID
      await supabaseAdmin
        .from('users')
        .update({
          stripe_account_id: accountId,
          stripe_account_status: 'pending',
        })
        .eq('id', user.id)
    }

    // Create onboarding link
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const refreshUrl = `${baseUrl}/dashboard/settings?stripe=refresh`
    const returnUrl = `${baseUrl}/dashboard/settings?stripe=success`

    const onboardingUrl = await createConnectAccountLink(accountId, refreshUrl, returnUrl)

    if (!onboardingUrl) {
      return NextResponse.json(
        { error: 'Failed to create onboarding link' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      url: onboardingUrl,
      accountId,
    })
  } catch (error) {
    console.error('Error in Stripe Connect onboarding:', error)
    return NextResponse.json(
      { error: 'Failed to start onboarding' },
      { status: 500 }
    )
  }
}

/**
 * DELETE: Disconnect Stripe Connect account
 */
export async function DELETE() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    // Clear Stripe fields (we don't actually delete the Stripe account)
    await supabaseAdmin
      .from('users')
      .update({
        stripe_account_id: null,
        stripe_account_status: null,
        stripe_onboarding_completed: false,
      })
      .eq('id', session.user.id)

    // Disable paid event types
    await supabaseAdmin
      .from('event_types')
      .update({
        is_paid: false,
        price_cents: null,
        stripe_price_id: null,
      })
      .eq('user_id', session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error disconnecting Stripe:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    )
  }
}
