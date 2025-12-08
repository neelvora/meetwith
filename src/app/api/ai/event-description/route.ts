import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateMeetingDescription, isAIEnabled } from '@/lib/ai/client'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAIEnabled()) {
    return NextResponse.json(
      { error: 'AI features are not configured' },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const { title, context, durationMinutes } = body

    if (!title || !durationMinutes) {
      return NextResponse.json(
        { error: 'Title and duration are required' },
        { status: 400 }
      )
    }

    const description = await generateMeetingDescription({
      title,
      context,
      durationMinutes: Number(durationMinutes),
    })

    return NextResponse.json({ description })
  } catch (error) {
    console.error('Error generating event description:', error)
    return NextResponse.json(
      { error: 'Failed to generate description' },
      { status: 500 }
    )
  }
}
