'use client'

import { useState } from 'react'
import { Calendar, Clock, Video, Globe } from 'lucide-react'
import { Card, CardContent, Button } from '@/components/ui'
import TimeSlotPicker from './TimeSlotPicker'
import BookingForm from './BookingForm'
import BookingConfirmation from './BookingConfirmation'

interface EventType {
  id: string
  slug: string
  name: string
  description: string
  duration: number
  color: string
}

interface BookingClientProps {
  username: string
  user: {
    name: string
    welcomeMessage: string
  }
  eventTypes: EventType[]
}

type BookingStep = 'select-event' | 'select-time' | 'enter-details' | 'confirmed'

interface SelectedSlot {
  date: string
  start: string
  end: string
  timezone: string
}

export default function BookingClient({ username, user, eventTypes }: BookingClientProps) {
  const [step, setStep] = useState<BookingStep>('select-event')
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [meetLink, setMeetLink] = useState<string | null>(null)
  const [attendeeInfo, setAttendeeInfo] = useState({ name: '', email: '' })

  function handleSelectEventType(eventType: EventType) {
    setSelectedEventType(eventType)
    setStep('select-time')
  }

  function handleSelectSlot(slot: SelectedSlot) {
    setSelectedSlot(slot)
    setStep('enter-details')
  }

  function handleBookingSuccess(booking: { id: string; meetLink?: string }) {
    setBookingId(booking.id)
    if (booking.meetLink) {
      setMeetLink(booking.meetLink)
    }
    setStep('confirmed')
  }

  function handleBack() {
    if (step === 'select-time') {
      setStep('select-event')
      setSelectedEventType(null)
    } else if (step === 'enter-details') {
      setStep('select-time')
      setSelectedSlot(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 pt-4 sm:pt-0">
      <div className="max-w-xl mx-auto px-4 py-6 sm:py-16">
        {/* Profile Header - always visible */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 mx-auto mb-3 sm:mb-4 flex items-center justify-center text-xl sm:text-2xl font-bold text-white">
            {user.name.charAt(0)}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">{user.name}</h1>
          {step === 'select-event' && (
            <p className="text-gray-400 text-sm max-w-md mx-auto px-4">{user.welcomeMessage}</p>
          )}
        </div>

        {/* Step: Select Event Type */}
        {step === 'select-event' && (
          <div className="space-y-4">
            {eventTypes.map((eventType) => (
              <Card
                key={eventType.id}
                variant="glass"
                className="hover:border-violet-500/50 transition-all cursor-pointer group"
                onClick={() => handleSelectEventType(eventType)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-1.5 h-full min-h-[50px] rounded-full"
                      style={{ backgroundColor: eventType.color === 'violet' ? '#8b5cf6' : eventType.color === 'blue' ? '#3b82f6' : '#8b5cf6' }}
                    />
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold text-white group-hover:text-violet-400 transition-colors">
                        {eventType.name}
                      </h2>
                      <p className="text-gray-400 text-sm mt-1 mb-3">{eventType.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {eventType.duration} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Video className="w-4 h-4" />
                          Google Meet
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Step: Select Time Slot */}
        {step === 'select-time' && selectedEventType && (
          <TimeSlotPicker
            username={username}
            eventType={selectedEventType}
            onBack={handleBack}
            onBook={handleSelectSlot}
          />
        )}

        {/* Step: Enter Details */}
        {step === 'enter-details' && selectedEventType && selectedSlot && (
          <BookingForm
            username={username}
            eventType={selectedEventType}
            selectedSlot={selectedSlot}
            hostName={user.name}
            onBack={handleBack}
            onSuccess={(booking) => {
              handleBookingSuccess(booking)
            }}
          />
        )}

        {/* Step: Confirmation */}
        {step === 'confirmed' && selectedEventType && selectedSlot && bookingId && (
          <BookingConfirmation
            booking={{ id: bookingId, meetLink: meetLink || undefined }}
            eventType={selectedEventType}
            selectedSlot={selectedSlot}
            attendeeName={attendeeInfo.name}
            attendeeEmail={attendeeInfo.email}
            hostName={user.name}
          />
        )}

        {/* Footer */}
        {step !== 'confirmed' && (
          <div className="text-center mt-8 sm:mt-12 text-gray-500 text-sm">
            <p className="flex items-center justify-center gap-2">
              <Globe className="w-4 h-4" />
              America/Chicago
            </p>
            <p className="mt-4">
              Powered by{' '}
              <a href="https://meetwith.dev" className="text-violet-400 hover:text-violet-300">
                MeetWith
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
