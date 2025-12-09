'use client'

import { useState } from 'react'
import { ArrowLeft, Loader2, CheckCircle, Calendar, Clock, Video, User, Mail } from 'lucide-react'
import { Button, Card, CardContent, Input } from '@/components/ui'

interface BookingFormProps {
  username: string
  eventType: {
    id: string
    name: string
    duration: number
  }
  selectedSlot: {
    date: string
    start: string
    end: string
  }
  hostName: string
  onBack: () => void
  onSuccess: (booking: { id: string; meetLink?: string; attendeeName: string; attendeeEmail: string }) => void
}

export default function BookingForm({
  username,
  eventType,
  selectedSlot,
  hostName,
  onBack,
  onSuccess,
}: BookingFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          eventTypeId: eventType.id,
          startTime: selectedSlot.start,
          endTime: selectedSlot.end,
          attendeeName: name,
          attendeeEmail: email,
          attendeeTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          notes,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create booking')
      }

      onSuccess({ id: data.bookingId, meetLink: data.meetLink, attendeeName: name, attendeeEmail: email })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function formatDateTime(isoString: string): string {
    return new Date(isoString).toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-white">Enter your details</h2>
          <p className="text-sm text-gray-400">Complete your booking with {hostName}</p>
        </div>
      </div>

      {/* Booking Summary */}
      <Card variant="glass">
        <CardContent>
          <h3 className="font-semibold text-white mb-3">{eventType.name}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <Calendar className="w-4 h-4" />
              {formatDateTime(selectedSlot.start)}
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="w-4 h-4" />
              {eventType.duration} minutes
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Video className="w-4 h-4" />
              Google Meet (link will be provided)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Your Name *
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Email Address *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              required
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Additional Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Share anything that will help prepare for our meeting..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent resize-none"
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Booking...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirm Booking
            </>
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          By booking, you agree to receive a calendar invitation and meeting reminder emails.
        </p>
      </form>
    </div>
  )
}
