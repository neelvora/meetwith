'use client'

import { useState } from 'react'
import { Calendar, Clock, Mail, User, Video, ExternalLink, X, Loader2, AlertTriangle } from 'lucide-react'
import { Card, CardContent, Button } from '@/components/ui'

interface Booking {
  id: string
  attendeeName: string
  attendeeEmail: string
  startTime: string
  endTime: string
  duration: number
  status: 'confirmed' | 'cancelled' | 'completed'
  location?: string | null
  notes?: string | null
  createdAt: string
  eventType: {
    id: string
    name: string
    color: string
  } | null
}

interface BookingsClientProps {
  bookings: Booking[]
  timezone: string
}

export default function BookingsClient({ bookings: initialBookings, timezone }: BookingsClientProps) {
  const [bookings, setBookings] = useState(initialBookings)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null)

  function formatDateTime(isoString: string): string {
    return new Date(isoString).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone,
    })
  }

  function formatTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone,
    })
  }

  async function handleCancel(bookingId: string) {
    setCancellingId(bookingId)
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setBookings(prev => prev.map(b => 
          b.id === bookingId ? { ...b, status: 'cancelled' as const } : b
        ))
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to cancel booking')
      }
    } catch (error) {
      console.error('Error cancelling booking:', error)
      alert('Failed to cancel booking')
    } finally {
      setCancellingId(null)
      setShowCancelModal(null)
    }
  }

  const confirmedBookings = bookings.filter(b => b.status === 'confirmed')
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Your Bookings</h1>
        <p className="text-gray-400">
          Manage your upcoming meetings and appointments
        </p>
      </div>

      {confirmedBookings.length === 0 && cancelledBookings.length === 0 ? (
        <Card variant="glass">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No upcoming bookings</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              When someone books a meeting with you, it will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {confirmedBookings.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Upcoming ({confirmedBookings.length})
              </h2>
              <div className="space-y-4">
                {confirmedBookings.map((booking) => (
                  <Card key={booking.id} variant="glass" className="hover:border-white/20 transition-all">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                            <h3 className="text-lg font-semibold text-white truncate">
                              {booking.eventType?.name || 'Meeting'}
                            </h3>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 w-fit">
                              Confirmed
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-gray-400">
                              <User className="w-4 h-4 text-violet-400 shrink-0" />
                              <span className="truncate">{booking.attendeeName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400">
                              <Mail className="w-4 h-4 text-violet-400 shrink-0" />
                              <a href={`mailto:${booking.attendeeEmail}`} className="text-violet-400 hover:text-violet-300 truncate">
                                {booking.attendeeEmail}
                              </a>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400">
                              <Calendar className="w-4 h-4 text-violet-400 shrink-0" />
                              <span>{formatDateTime(booking.startTime)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400">
                              <Clock className="w-4 h-4 text-violet-400 shrink-0" />
                              <span>{booking.duration} min ({formatTime(booking.startTime)} - {formatTime(booking.endTime)})</span>
                            </div>
                          </div>
                          
                          {booking.notes && (
                            <div className="mt-3 p-3 rounded-lg bg-white/5 text-sm text-gray-400">
                              <span className="text-gray-500">Notes:</span> {booking.notes}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2 lg:flex-col lg:w-auto">
                          {booking.location && (
                            <a
                              href={booking.location}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-colors text-sm font-medium"
                            >
                              <Video className="w-4 h-4" />
                              Join Meet
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          <button
                            onClick={() => setShowCancelModal(booking.id)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {cancelledBookings.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-400 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Cancelled ({cancelledBookings.length})
              </h2>
              <div className="space-y-4 opacity-60">
                {cancelledBookings.map((booking) => (
                  <Card key={booking.id} variant="glass" className="border-white/5">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                            <h3 className="text-lg font-semibold text-gray-400 truncate line-through">
                              {booking.eventType?.name || 'Meeting'}
                            </h3>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 w-fit">
                              Cancelled
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {booking.attendeeName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDateTime(booking.startTime)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card variant="glass" className="max-w-md w-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Cancel Booking?</h3>
              </div>
              <p className="text-gray-400 mb-6">
                Are you sure you want to cancel this booking? The attendee will be notified via email and the calendar event will be removed.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowCancelModal(null)}
                  className="flex-1"
                  disabled={cancellingId === showCancelModal}
                >
                  Keep Booking
                </Button>
                <Button
                  onClick={() => handleCancel(showCancelModal)}
                  disabled={cancellingId === showCancelModal}
                  className="flex-1 bg-red-500 hover:bg-red-600"
                >
                  {cancellingId === showCancelModal ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    'Yes, Cancel'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
