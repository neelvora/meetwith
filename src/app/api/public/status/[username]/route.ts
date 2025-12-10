import { NextRequest, NextResponse } from 'next/server'

/**
 * Public Status Endpoint
 * 
 * Returns availability status for a user in a simple boolean format.
 * Designed to be consumed by external sites (e.g., neelvora.com portfolio)
 * to display real-time availability badges.
 * 
 * GET /api/public/status/[username]
 * 
 * Response: { "available": boolean }
 * 
 * Authentication:
 * - If MEETWITH_STATUS_TOKEN is set, requires Bearer token
 * - If not set, endpoint is fully public
 * 
 * Caching:
 * - s-maxage=60 (CDN caches for 1 minute)
 * - stale-while-revalidate=300 (serve stale for up to 5 minutes while revalidating)
 */

interface RouteParams {
  params: Promise<{ username: string }>
}

// Optional token for protecting the endpoint
const STATUS_TOKEN = process.env.MEETWITH_STATUS_TOKEN

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { username } = await params

  // If token is configured, require Bearer authentication
  if (STATUS_TOKEN) {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token || token !== STATUS_TOKEN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  // Validate username exists (basic sanity check)
  if (!username || username.length < 1) {
    return NextResponse.json(
      { error: 'Invalid username' },
      { status: 400 }
    )
  }

  // TODO: In a future phase, integrate with real scheduling logic:
  // - Check if user has any available slots in the next N days
  // - Check if user has paused bookings
  // - Check user's availability settings
  // For now, hard-code to true (available)
  const available = true

  // Return response with caching headers
  return NextResponse.json(
    { available },
    {
      status: 200,
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
        'Content-Type': 'application/json',
      },
    }
  )
}
