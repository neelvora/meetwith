'use client'

import { CheckCircle, Calendar, Clock, Video, Mail, ExternalLink, Download } from 'lucide-react'
import { Card, CardContent } from '@/components/ui'

interface BookingConfirmationProps {
  booking: {
    id: string
    meetLink?: string
  }
  eventType: {
    name: string
    duration: number
  }
  selectedSlot: {
    start: string
    end: string
    timezone?: string
  }
  attendeeName: string
  attendeeEmail: string
  hostName: string
}

export default function BookingConfirmation({
  booking,
  eventType,
  selectedSlot,
  attendeeEmail,
  hostName,
}: BookingConfirmationProps) {
  const displayTimezone = selectedSlot.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone

  function formatDateTime(isoString: string): string {
    return new Date(isoString).toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: displayTimezone,
    })
  }

  function getTimezoneAbbr(): string {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: displayTimezone,
        timeZoneName: 'short',
      })
      const parts = formatter.formatToParts(new Date(selectedSlot.start))
      const tzPart = parts.find(p => p.type === 'timeZoneName')
      return tzPart?.value || displayTimezone
    } catch {
      return displayTimezone
    }
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
          <h3 className="font-semibold text-white text-lg mb-1">{eventType.name}</h3>
          <p className="text-sm text-gray-500 mb-4">with {hostName}</p>
          <div className="space-y-3 text-left">
            <div className="flex items-start gap-3 text-gray-300">
              <Calendar className="w-5 h-5 text-violet-400 mt-0.5" />
              <div>
                <div>{formatDateTime(selectedSlot.start)}</div>
                <div className="text-sm text-gray-500">{getTimezoneAbbr()}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <Clock className="w-5 h-5 text-violet-400" />
              {eventType.duration} minutes
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <Video className="w-5 h-5 text-violet-400" />
              {booking.meetLink ? (
                <a 
                  href={booking.meetLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:text-violet-300 underline underline-offset-2"
                >
                  Join Google Meet
                </a>
              ) : (
                'Google Meet (link in calendar invite)'
              )}
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <Mail className="w-5 h-5 text-violet-400" />
              Confirmation sent to {attendeeEmail}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Join Meeting Button - shown when Meet link is available */}
      {booking.meetLink && (
        <a
          href={booking.meetLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white px-6 py-4 font-semibold rounded-xl hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/25"
        >
          <Video className="w-5 h-5" />
          Join Google Meet
          <ExternalLink className="w-4 h-4" />
        </a>
      )}

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

        <a
          href={`/ics/${booking.id}`}
          download
          className="inline-flex items-center justify-center gap-2 w-full bg-white/5 text-gray-300 px-6 py-3 font-medium rounded-xl border border-white/10 hover:bg-white/10 transition-all"
        >
          <Download className="w-5 h-5" />
          Download .ics file
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
