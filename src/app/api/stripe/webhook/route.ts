import { NextRequest, NextResponse } from 'next/server'
import { stripe, verifyWebhookSignature } from '@/lib/payments/stripe'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendBookingEmails } from '@/lib/email'

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

/**
 * Stripe Webhook Handler
 * 
 * Handles:
 * - checkout.session.completed: Payment successful, confirm booking
 * - payment_intent.payment_failed: Payment failed
 * - charge.refunded: Refund processed
 */
export async function POST(request: NextRequest) {
  if (!stripe || !WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 500 }
    )
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  const event = verifyWebhookSignature(body, signature, WEBHOOK_SECRET)

  if (!event) {
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const bookingId = session.metadata?.booking_id

        if (!bookingId) {
          console.error('No booking_id in checkout session metadata')
          break
        }

        // Update payment record
        await supabaseAdmin
          .from('payments')
          .update({
            status: 'succeeded',
            stripe_payment_intent_id: session.payment_intent as string,
            completed_at: new Date().toISOString(),
          })
          .eq('stripe_checkout_session_id', session.id)

        // Update booking status
        const { data: booking } = await supabaseAdmin
          .from('bookings')
          .update({
            status: 'confirmed',
            payment_status: 'succeeded',
          })
          .eq('id', bookingId)
          .select(`
            *,
            event_types (name),
            users (name, email, timezone)
          `)
          .single()

        // Send confirmation emails
        if (booking) {
          const userData = booking.users as { name: string; email: string; timezone: string } | null
          await sendBookingEmails({
            hostName: userData?.name || 'Host',
            hostEmail: userData?.email || '',
            attendeeName: booking.attendee_name,
            attendeeEmail: booking.attendee_email,
            eventName: (booking.event_types as { name: string })?.name || 'Meeting',
            startTime: new Date(booking.start_time),
            endTime: new Date(booking.end_time),
            duration: booking.duration_minutes,
            timezone: userData?.timezone || 'America/Chicago',
            meetLink: booking.location || undefined,
            bookingId: booking.id,
            notes: booking.notes || undefined,
          })
        }

        console.log(`Payment completed for booking ${bookingId}`)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object
        
        // Update payment record
        await supabaseAdmin
          .from('payments')
          .update({
            status: 'failed',
          })
          .eq('stripe_payment_intent_id', paymentIntent.id)

        // Update any related booking
        await supabaseAdmin
          .from('bookings')
          .update({
            payment_status: 'failed',
          })
          .eq('payment_id', (
            await supabaseAdmin
              .from('payments')
              .select('id')
              .eq('stripe_payment_intent_id', paymentIntent.id)
              .single()
          ).data?.id)

        console.log(`Payment failed: ${paymentIntent.id}`)
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object
        
        // Update payment record
        await supabaseAdmin
          .from('payments')
          .update({
            status: 'refunded',
            refunded_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', charge.payment_intent)

        console.log(`Refund processed for payment intent: ${charge.payment_intent}`)
        break
      }

      case 'account.updated': {
        // Stripe Connect account status changed
        const account = event.data.object
        
        await supabaseAdmin
          .from('users')
          .update({
            stripe_account_status: account.charges_enabled ? 'active' : 'restricted',
            stripe_onboarding_completed: account.details_submitted,
          })
          .eq('stripe_account_id', account.id)

        console.log(`Connect account updated: ${account.id}`)
        break
      }

      default:
        console.log(`Unhandled webhook event: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
