import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { suggestTimeWindow, isAIEnabled } from '@/lib/ai/client'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!isAIEnabled()) {
      return NextResponse.json(
        { error: 'AI features are not available' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { 
      currentAvailability, 
      eventTypes, 
      timezone 
    } = body

    if (!currentAvailability || !Array.isArray(currentAvailability)) {
      return NextResponse.json(
        { error: 'Current availability is required' },
        { status: 400 }
      )
    }

    const suggestion = await suggestTimeWindow({
      currentAvailability,
      eventTypes: eventTypes || [],
      timezone: timezone || 'America/Chicago'
    })

    if (!suggestion) {
      return NextResponse.json(
        { error: 'Failed to generate suggestion' },
        { status: 500 }
      )
    }

    return NextResponse.json({ suggestion })
  } catch (error) {
    console.error('Error generating time suggestion:', error)
    return NextResponse.json(
      { error: 'Failed to generate time suggestion' },
      { status: 500 }
    )
  }
}
