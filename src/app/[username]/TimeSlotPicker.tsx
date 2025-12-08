'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Clock, Video, Loader2, Check, Globe, ChevronDown } from 'lucide-react'
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
  onBook: (slot: { date: string; start: string; end: string; timezone: string }) => void
}

const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (AZ)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST)' },
]

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
  const [timezone, setTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      return 'America/Chicago'
    }
  })
  const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false)

  useEffect(() => {
    fetchSlots()
  }, [currentWeekStart, timezone])

  async function fetchSlots() {
    setLoading(true)
    try {
      const start = currentWeekStart.toISOString()
      const end = new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      
      const res = await fetch(
        `/api/availability/slots?username=${username}&start=${start}&end=${end}&duration=${eventType.duration}`
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
      timeZone: timezone,
    })
  }

  function getTimezoneLabel(): string {
    const found = COMMON_TIMEZONES.find(tz => tz.value === timezone)
    if (found) return found.label
    return timezone.replace(/_/g, ' ').split('/').pop() || timezone
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
    // Use local date to avoid timezone issues
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
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
        timezone,
      })
    }
  }

  const hasAnySlots = Object.values(slots).some(daySlots => daySlots.length > 0)

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

      {/* Timezone Selector */}
      <div className="relative">
        <button
          onClick={() => setShowTimezoneDropdown(!showTimezoneDropdown)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm text-gray-300 w-full sm:w-auto"
        >
          <Globe className="w-4 h-4 text-violet-400" />
          <span className="flex-1 text-left">{getTimezoneLabel()}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showTimezoneDropdown ? 'rotate-180' : ''}`} />
        </button>
        {showTimezoneDropdown && (
          <div className="absolute top-full left-0 right-0 sm:right-auto mt-2 bg-gray-900 border border-white/10 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto min-w-[200px]">
            {COMMON_TIMEZONES.map((tz) => (
              <button
                key={tz.value}
                onClick={() => {
                  setTimezone(tz.value)
                  setShowTimezoneDropdown(false)
                  setSelectedSlot(null)
                }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition-colors ${
                  timezone === tz.value ? 'text-violet-400 bg-violet-500/10' : 'text-gray-300'
                }`}
              >
                {tz.label}
              </button>
            ))}
          </div>
        )}
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

      {/* Calendar Grid - Skeleton or Content */}
      {loading ? (
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-white/5 animate-pulse"
            >
              <div className="h-3 bg-white/10 rounded mb-2 w-6 mx-auto" />
              <div className="h-5 sm:h-7 bg-white/10 rounded w-6 sm:w-8 mx-auto" />
              <div className="h-2 bg-white/10 rounded mt-2 w-10 mx-auto hidden sm:block" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
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
              type="button"
              className={`
                p-2 sm:p-3 rounded-lg sm:rounded-xl text-center transition-all touch-manipulation
                ${past ? 'opacity-30 cursor-not-allowed' : ''}
                ${isSelected ? 'bg-violet-500 text-white' : ''}
                ${!isSelected && hasSlots && !past ? 'bg-white/5 hover:bg-white/10 active:bg-white/20 cursor-pointer' : ''}
                ${!hasSlots && !past ? 'bg-transparent opacity-50 cursor-not-allowed' : ''}
                ${today && !isSelected ? 'ring-2 ring-violet-500/50' : ''}
              `}
            >
              <div className="text-[10px] sm:text-xs text-gray-400 mb-0.5 sm:mb-1">
                {day.toLocaleDateString('en-US', { weekday: 'narrow' })}
              </div>
              <div className={`text-sm sm:text-lg font-semibold ${isSelected ? 'text-white' : 'text-white'}`}>
                {day.getDate()}
              </div>
              {hasSlots && !past && (
                <div className="text-[9px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1 hidden sm:block">
                  {daySlots.length} slots
                </div>
              )}
            </button>
          )
        })}
        </div>
      )}

      {/* No slots this week message */}
      {!loading && !hasAnySlots && (
        <Card variant="glass" className="border-amber-500/20">
          <CardContent className="py-6 text-center">
            <p className="text-gray-400">No available times this week.</p>
            <p className="text-sm text-gray-500 mt-1">Try checking another week.</p>
          </CardContent>
        </Card>
      )}

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
            Available times for {(() => {
              const [year, month, day] = selectedDate.split('-').map(Number)
              return new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
            })()}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {(slots[selectedDate] || []).map((slot, i) => {
              const isSelected = selectedSlot?.start === slot.start
              return (
                <button
                  key={i}
                  onClick={() => setSelectedSlot(slot)}
                  type="button"
                  className={`
                    px-3 py-2.5 rounded-lg text-sm font-medium transition-all touch-manipulation
                    ${isSelected 
                      ? 'bg-violet-500 text-white' 
                      : 'bg-white/5 text-white hover:bg-white/10 active:bg-white/20 border border-white/10'
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
          <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            <Button onClick={handleConfirm} className="w-full sm:w-auto">
              <Check className="w-4 h-4 mr-2" />
              Confirm
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
