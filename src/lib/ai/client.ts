import OpenAI from 'openai'

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

export function isAIEnabled(): boolean {
  return !!openai
}

interface GenerateMeetingDescriptionInput {
  title: string
  context?: string
  durationMinutes: number
}

export async function generateMeetingDescription(
  input: GenerateMeetingDescriptionInput
): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }

  const prompt = `Generate a professional, concise meeting description for a scheduling page.

Meeting Title: ${input.title}
Duration: ${input.durationMinutes} minutes
${input.context ? `Additional Context: ${input.context}` : ''}

Write 2-3 sentences that:
- Explain what attendees can expect
- Set appropriate expectations for the meeting
- Sound welcoming and professional

Return only the description text, no quotes or extra formatting.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 200,
    temperature: 0.7,
  })

  return response.choices[0]?.message?.content?.trim() || ''
}

interface GenerateFollowUpEmailInput {
  hostName: string
  attendeeName: string
  meetingTitle: string
  meetingSummary?: string
}

export async function generateFollowUpEmail(
  input: GenerateFollowUpEmailInput
): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }

  const prompt = `Write a brief, professional follow-up email draft for a meeting host to send after a meeting.

Host Name: ${input.hostName}
Attendee Name: ${input.attendeeName}
Meeting Type: ${input.meetingTitle}
${input.meetingSummary ? `Meeting Notes: ${input.meetingSummary}` : ''}

The email should:
- Thank the attendee for their time
- Be warm but professional
- Be 3-5 sentences
- End with an appropriate sign-off using the host's name

Return only the email body text, no subject line.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300,
    temperature: 0.7,
  })

  return response.choices[0]?.message?.content?.trim() || ''
}

interface SuggestTimeWindowInput {
  timezone: string
  currentAvailability: Array<{ day: string; startTime: string; endTime: string }>
  eventTypes?: Array<{ name: string; duration: number }>
}

export async function suggestTimeWindow(
  input: SuggestTimeWindowInput
): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }

  const availabilityDescription = input.currentAvailability.length > 0
    ? input.currentAvailability.map(a => `${a.day}: ${a.startTime} to ${a.endTime}`).join('\n')
    : 'No availability set'

  const eventTypesDescription = input.eventTypes && input.eventTypes.length > 0
    ? input.eventTypes.map(e => `${e.name} (${e.duration} min)`).join(', ')
    : 'Standard meetings'

  const prompt = `Analyze this scheduling availability and provide helpful suggestions.

Timezone: ${input.timezone}
Current Availability:
${availabilityDescription}

Event Types: ${eventTypesDescription}

Based on common scheduling best practices, provide 2-3 short, actionable suggestions to optimize their availability for meetings. Consider:
- Whether their current hours work well for different timezones
- If there are gaps in coverage
- Whether buffer time between meetings would help
- Meeting load distribution across days

Keep suggestions brief and practical. Format as bullet points.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 200,
    temperature: 0.5,
  })

  return response.choices[0]?.message?.content?.trim() || ''
}
