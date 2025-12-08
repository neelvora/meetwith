'use client'

import { useState, useMemo } from 'react'
import { Calendar, Clock, Mail, User, Video, ExternalLink, X, Loader2, AlertTriangle, Filter } from 'lucide-react'
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

type FilterType = 'all' | 'upcoming' | 'past' | 'cancelled'

export default function BookingsClient({ bookings: initialBookings, timezone }: BookingsClientProps) {
  const [bookings, setBookings] = useState(initialBookings)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('upcoming')
  const [isLoading, setIsLoading] = useState(false)

  const filteredBookings = useMemo(() => {
    const now = new Date()
    return bookings.filter(b => {
      const bookingDate = new Date(b.startTime)
      switch (filter) {
        case 'upcoming':
          return b.status === 'confirmed' && bookingDate >= now
        case 'past':
          return b.status === 'confirmed' && bookingDate < now
        case 'cancelled':
          return b.status === 'cancelled'
        case 'all':
        default:
          return true
      }
    })
  }, [bookings, filter])

  const filterCounts = useMemo(() => {
    const now = new Date()
    return {
      all: bookings.length,
      upcoming: bookings.filter(b => b.status === 'confirmed' && new Date(b.startTime) >= now).length,
      past: bookings.filter(b => b.status === 'confirmed' && new Date(b.startTime) < now).length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length,
    }
  }, [bookings])

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

  function isPast(dateStr: string): boolean {
    return new Date(dateStr) < new Date()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Your Bookings</h1>
        <p className="text-gray-400">
          Manage your upcoming meetings and appointments
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {([
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'past', label: 'Past' },
          { key: 'cancelled', label: 'Cancelled' },
          { key: 'all', label: 'All' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === key
                ? 'bg-violet-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {label}
            <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
              filter === key ? 'bg-white/20' : 'bg-white/10'
            }`}>
              {filterCounts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} variant="glass">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-6 w-32 bg-white/10 rounded" />
                    <div className="h-5 w-20 bg-white/10 rounded-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-4 w-24 bg-white/10 rounded" />
                    <div className="h-4 w-32 bg-white/10 rounded" />
                    <div className="h-4 w-28 bg-white/10 rounded" />
                    <div className="h-4 w-36 bg-white/10 rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <Card variant="glass">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Filter className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              {filter === 'upcoming' ? 'No upcoming bookings' :
               filter === 'past' ? 'No past bookings' :
               filter === 'cancelled' ? 'No cancelled bookings' :
               'No bookings yet'}
            </h3>
            <p className="text-gray-400 max-w-md mx-auto">
              {filter === 'upcoming' 
                ? 'When someone books a meeting with you, it will appear here.'
                : 'Try selecting a different filter.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => {
            const past = isPast(booking.startTime)
            const cancelled = booking.status === 'cancelled'
            
            return (
              <Card 
                key={booking.id} 
                variant="glass" 
                className={`transition-all ${cancelled ? 'opacity-60' : ''} ${!cancelled && !past ? 'hover:border-white/20' : ''}`}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                        <h3 className={`text-lg font-semibold ${cancelled ? 'text-gray-400 line-through' : 'text-white'} truncate`}>
                          {booking.eventType?.name || 'Meeting'}
                        </h3>
                        {cancelled ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 w-fit">
                            Cancelled
                          </span>
                        ) : past ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 w-fit">
                            Past
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 w-fit">
                            Confirmed
                          </span>
                        )}
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
                    
                    {!cancelled && !past && (
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
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
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
