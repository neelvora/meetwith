/**
 * Stripe Payment Integration
 * 
 * This module handles payment processing for paid event types using Stripe.
 * 
 * SETUP REQUIRED:
 * 1. Create a Stripe account at https://stripe.com
 * 2. Enable Stripe Connect for accepting payments on behalf of users
 * 3. Set environment variables:
 *    - STRIPE_SECRET_KEY: Your Stripe secret key
 *    - STRIPE_WEBHOOK_SECRET: Webhook signing secret
 *    - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: Publishable key for frontend
 * 
 * FLOW:
 * 1. Host connects their Stripe account via Connect onboarding
 * 2. Host creates paid event types with pricing
 * 3. Guest books a meeting → redirected to Stripe Checkout
 * 4. After payment, booking is confirmed
 * 5. Funds transferred to host's connected account (minus platform fee)
 */

import Stripe from 'stripe'

// Initialize Stripe client (only if credentials are available)
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { 
      apiVersion: '2025-12-15.clover',
    })
  : null

export interface CreateCheckoutParams {
  eventTypeName: string
  priceInCents: number
  currency: string
  hostStripeAccountId: string
  bookingId: string
  attendeeEmail: string
  attendeeName: string
  successUrl: string
  cancelUrl: string
  platformFeePercent?: number // Default 5%
}

/**
 * Create a Stripe Checkout session for a paid booking
 */
export async function createCheckoutSession(params: CreateCheckoutParams): Promise<{ url: string; sessionId: string } | null> {
  if (!stripe) {
    console.error('Stripe not configured - STRIPE_SECRET_KEY not set')
    return null
  }

  const {
    eventTypeName,
    priceInCents,
    currency,
    hostStripeAccountId,
    bookingId,
    attendeeEmail,
    attendeeName,
    successUrl,
    cancelUrl,
    platformFeePercent = 5,
  } = params

  // Calculate platform fee
  const platformFee = Math.round(priceInCents * (platformFeePercent / 100))

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: attendeeEmail,
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: priceInCents,
            product_data: {
              name: eventTypeName,
              description: `Meeting booking with ${attendeeName}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: bookingId,
        attendee_email: attendeeEmail,
        attendee_name: attendeeName,
      },
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: hostStripeAccountId,
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    return {
      url: session.url || '',
      sessionId: session.id,
    }
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return null
  }
}

/**
 * Create a Stripe Connect account link for host onboarding
 */
export async function createConnectAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<string | null> {
  if (!stripe) {
    console.error('Stripe not configured')
    return null
  }

  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    })

    return accountLink.url
  } catch (error) {
    console.error('Error creating account link:', error)
    return null
  }
}

/**
 * Create a new Stripe Connect Express account for a host
 */
export async function createConnectAccount(
  email: string,
  countryCode: string = 'US'
): Promise<string | null> {
  if (!stripe) {
    console.error('Stripe not configured')
    return null
  }

  try {
    const account = await stripe.accounts.create({
      type: 'express',
      country: countryCode,
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    })

    return account.id
  } catch (error) {
    console.error('Error creating connect account:', error)
    return null
  }
}

/**
 * Check the status of a Connect account
 */
export async function getConnectAccountStatus(accountId: string): Promise<{
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
} | null> {
  if (!stripe) {
    return null
  }

  try {
    const account = await stripe.accounts.retrieve(accountId)

    return {
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    }
  } catch (error) {
    console.error('Error retrieving account:', error)
    return null
  }
}

/**
 * Issue a refund for a payment
 */
export async function refundPayment(
  paymentIntentId: string,
  amountInCents?: number // Partial refund if specified
): Promise<boolean> {
  if (!stripe) {
    return false
  }

  try {
    await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amountInCents, // Full refund if undefined
    })
    return true
  } catch (error) {
    console.error('Error issuing refund:', error)
    return false
  }
}

/**
 * Verify a Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event | null {
  if (!stripe) {
    return null
  }

  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return null
  }
}

/**
 * Format price for display
 */
export function formatPrice(amountInCents: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100)
}
