import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOutlookAuthUrl } from '@/lib/calendar/outlookClient'
import { randomBytes } from 'crypto'

/**
 * GET: Redirect to Microsoft OAuth
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  try {
    // Generate state for CSRF protection
    const state = randomBytes(32).toString('hex')
    
    // Store state in a cookie for verification on callback
    const authUrl = getOutlookAuthUrl(state)
    
    const response = NextResponse.redirect(authUrl)
    response.cookies.set('outlook_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
    })
    
    return response
  } catch (error) {
    console.error('Error starting Outlook OAuth:', error)
    return NextResponse.redirect(
      new URL('/dashboard/calendars?error=outlook_not_configured', request.url)
    )
  }
}
