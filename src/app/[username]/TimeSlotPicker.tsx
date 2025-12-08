'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Clock, Video, Loader2, Check } from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'

interface TimeSlot {
  start: string
  end: string
}

interface SlotsByDate {
  [date: string]: TimeSlot[]
}

interface TimeSlotPickerProps {
  username: string
  eventType: {
    id: string
    slug: string
    name: string
    duration: number
  }
  onBack: () => void
  onBook: (slot: { date: string; start: string; end: string }) => void
}

export default function TimeSlotPicker({ username, eventType, onBack, onBook }: TimeSlotPickerProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day
    return new Date(today.setDate(diff))
  })
  const [slots, setSlots] = useState<SlotsByDate>({})
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)

  useEffect(() => {
    fetchSlots()
  }, [currentWeekStart])

  async function fetchSlots() {
    setLoading(true)
    try {
      const start = currentWeekStart.toISOString()
      const end = new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      
      const res = await fetch(
        `/api/availability/slots?start=${start}&end=${end}&duration=${eventType.duration}`
      )
      const data = await res.json()
      setSlots(data.slots || {})
    } catch (error) {
      console.error('Error fetching slots:', error)
    } finally {
      setLoading(false)
    }
  }

  function goToPreviousWeek() {
    const newStart = new Date(currentWeekStart)
    newStart.setDate(newStart.getDate() - 7)
    // Don't go before today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (newStart >= today) {
      setCurrentWeekStart(newStart)
      setSelectedDate(null)
      setSelectedSlot(null)
    }
  }

  function goToNextWeek() {
    const newStart = new Date(currentWeekStart)
    newStart.setDate(newStart.getDate() + 7)
    setCurrentWeekStart(newStart)
    setSelectedDate(null)
    setSelectedSlot(null)
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  function formatTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  function getWeekDays(): Date[] {
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekStart)
      day.setDate(day.getDate() + i)
      days.push(day)
    }
    return days
  }

  function getDateKey(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  function isToday(date: Date): boolean {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  function isPast(date: Date): boolean {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  const weekDays = getWeekDays()
  const canGoPrevious = currentWeekStart > new Date(new Date().setHours(0, 0, 0, 0))

  function handleConfirm() {
    if (selectedDate && selectedSlot) {
      onBook({
        date: selectedDate,
        start: selectedSlot.start,
        end: selectedSlot.end,
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-white">{eventType.name}</h2>
          <p className="text-sm text-gray-400 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {eventType.duration} min
            <span className="mx-1">•</span>
            <Video className="w-4 h-4" />
            Google Meet
          </p>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPreviousWeek}
          disabled={!canGoPrevious}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5 text-gray-400" />
        </button>
        <span className="text-white font-medium">
          {formatDate(weekDays[0])} - {formatDate(weekDays[6])}
        </span>
        <button
          onClick={goToNextWeek}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dateKey = getDateKey(day)
          const daySlots = slots[dateKey] || []
          const hasSlots = daySlots.length > 0
          const past = isPast(day)
          const today = isToday(day)
          const isSelected = selectedDate === dateKey

          return (
            <button
              key={dateKey}
              onClick={() => {
                if (hasSlots && !past) {
                  setSelectedDate(dateKey)
                  setSelectedSlot(null)
                }
              }}
              disabled={!hasSlots || past}
              className={`
                p-3 rounded-xl text-center transition-all
                ${past ? 'opacity-30 cursor-not-allowed' : ''}
                ${isSelected ? 'bg-violet-500 text-white' : ''}
                ${!isSelected && hasSlots && !past ? 'bg-white/5 hover:bg-white/10 cursor-pointer' : ''}
                ${!hasSlots && !past ? 'bg-transparent opacity-50 cursor-not-allowed' : ''}
                ${today && !isSelected ? 'ring-2 ring-violet-500/50' : ''}
              `}
            >
              <div className="text-xs text-gray-400 mb-1">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className={`text-lg font-semibold ${isSelected ? 'text-white' : 'text-white'}`}>
                {day.getDate()}
              </div>
              {hasSlots && !past && (
                <div className="text-xs text-gray-400 mt-1">
                  {daySlots.length} slots
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
        </div>
      )}

      {/* Time Slots for Selected Date */}
      {selectedDate && !loading && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-400">
            Available times for {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {(slots[selectedDate] || []).map((slot, i) => {
              const isSelected = selectedSlot?.start === slot.start
              return (
                <button
                  key={i}
                  onClick={() => setSelectedSlot(slot)}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-all
                    ${isSelected 
                      ? 'bg-violet-500 text-white' 
                      : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                    }
                  `}
                >
                  {formatTime(slot.start)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Confirm Button */}
      {selectedSlot && (
        <Card variant="glass">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">
                {new Date(selectedSlot.start).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-gray-400 text-sm">
                {formatTime(selectedSlot.start)} - {formatTime(selectedSlot.end)}
              </p>
            </div>
            <Button onClick={handleConfirm}>
              <Check className="w-4 h-4 mr-2" />
              Confirm
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
