'use client'

import { CheckCircle, Calendar, Clock, Video, Mail, ExternalLink } from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'

interface BookingConfirmationProps {
  booking: {
    id: string
  }
  eventType: {
    name: string
    duration: number
  }
  selectedSlot: {
    start: string
    end: string
  }
  attendeeName: string
  attendeeEmail: string
  hostName: string
}

export default function BookingConfirmation({
  booking,
  eventType,
  selectedSlot,
  attendeeName,
  attendeeEmail,
  hostName,
}: BookingConfirmationProps) {
  function formatDateTime(isoString: string): string {
    return new Date(isoString).toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  function getGoogleCalendarUrl(): string {
    const start = new Date(selectedSlot.start)
    const end = new Date(selectedSlot.end)
    
    const formatForGoogle = (date: Date) => 
      date.toISOString().replace(/-|:|\.\d+/g, '')

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `${eventType.name} with ${hostName}`,
      dates: `${formatForGoogle(start)}/${formatForGoogle(end)}`,
      details: `Meeting booked via MeetWith\n\nJoin link will be sent via email.`,
    })

    return `https://calendar.google.com/calendar/render?${params}`
  }

  return (
    <div className="text-center space-y-6">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>
      </div>

      {/* Success Message */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">You&apos;re booked!</h2>
        <p className="text-gray-400">
          A calendar invitation has been sent to <span className="text-white">{attendeeEmail}</span>
        </p>
      </div>

      {/* Booking Details */}
      <Card variant="glass">
        <CardContent>
          <h3 className="font-semibold text-white text-lg mb-4">{eventType.name}</h3>
          <div className="space-y-3 text-left">
            <div className="flex items-center gap-3 text-gray-300">
              <Calendar className="w-5 h-5 text-violet-400" />
              {formatDateTime(selectedSlot.start)}
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <Clock className="w-5 h-5 text-violet-400" />
              {eventType.duration} minutes
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <Video className="w-5 h-5 text-violet-400" />
              Google Meet (link in calendar invite)
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <Mail className="w-5 h-5 text-violet-400" />
              Confirmation sent to {attendeeEmail}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        <a
          href={getGoogleCalendarUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full bg-white/10 text-white px-6 py-3 font-semibold rounded-xl border border-white/10 hover:bg-white/20 transition-all"
        >
          <Calendar className="w-5 h-5" />
          Add to Google Calendar
          <ExternalLink className="w-4 h-4" />
        </a>

        <p className="text-sm text-gray-500">
          Need to make changes?{' '}
          <a href={`mailto:${hostName.toLowerCase().replace(' ', '')}@gmail.com`} className="text-violet-400 hover:text-violet-300">
            Contact {hostName}
          </a>
        </p>
      </div>

      {/* Powered By */}
      <div className="pt-6 border-t border-white/10">
        <p className="text-gray-500 text-sm">
          Powered by{' '}
          <a href="https://meetwith.dev" className="text-violet-400 hover:text-violet-300">
            MeetWith
          </a>
        </p>
      </div>
    </div>
  )
}
