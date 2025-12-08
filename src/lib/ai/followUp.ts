import { generateFollowUpEmail, isAIEnabled } from './client'
import { supabaseAdmin } from '@/lib/supabase/server'

interface GenerateFollowUpParams {
  bookingId: string
  hostName: string
  attendeeName: string
  meetingTitle: string
}

export async function generateAndStoreFollowUp({
  bookingId,
  hostName,
  attendeeName,
  meetingTitle,
}: GenerateFollowUpParams): Promise<string | null> {
  if (!isAIEnabled()) {
    console.log('AI not enabled, skipping follow-up generation')
    return null
  }

  if (!supabaseAdmin) {
    console.log('Supabase not configured, skipping follow-up storage')
    return null
  }

  try {
    const followUpDraft = await generateFollowUpEmail({
      hostName,
      attendeeName,
      meetingTitle,
    })

    await supabaseAdmin
      .from('bookings')
      .update({ follow_up_draft: followUpDraft })
      .eq('id', bookingId)

    return followUpDraft
  } catch (error) {
    console.error('Error generating follow-up email:', error)
    return null
  }
}
