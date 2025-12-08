'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, Calendar as CalendarIcon } from 'lucide-react'
import { Card, CardContent, Button } from '@/components/ui'

interface CalendarEvent {
  id: string
  summary?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  status: string
  calendarId: string
  calendarName: string
  calendarColor: string
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarOverlapView() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date()
    const day = now.getDay()
    const start = new Date(now)
    start.setDate(now.getDate() - day)
    start.setHours(0, 0, 0, 0)
    return start
  })

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + i)
      return date
    })
  }, [weekStart])

  const weekEnd = useMemo(() => {
    const end = new Date(weekStart)
    end.setDate(weekStart.getDate() + 7)
    return end
  }, [weekStart])

  useEffect(() => {
    fetchEvents()
  }, [weekStart])

  async function fetchEvents() {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/calendars/events?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`
      )
      const data = await res.json()
      setEvents(data.events || [])
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  function goToPrevWeek() {
    const newStart = new Date(weekStart)
    newStart.setDate(weekStart.getDate() - 7)
    setWeekStart(newStart)
  }

  function goToNextWeek() {
    const newStart = new Date(weekStart)
    newStart.setDate(weekStart.getDate() + 7)
    setWeekStart(newStart)
  }

  function goToToday() {
    const now = new Date()
    const day = now.getDay()
    const start = new Date(now)
    start.setDate(now.getDate() - day)
    start.setHours(0, 0, 0, 0)
    setWeekStart(start)
  }

  function getEventsForDay(date: Date): CalendarEvent[] {
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)

    return events.filter((event) => {
      const eventStart = new Date(event.start.dateTime || event.start.date || '')
      const eventEnd = new Date(event.end.dateTime || event.end.date || '')
      return eventStart < dayEnd && eventEnd > dayStart
    })
  }

  function getEventPosition(event: CalendarEvent, dayDate: Date) {
    const eventStart = new Date(event.start.dateTime || event.start.date || '')
    const eventEnd = new Date(event.end.dateTime || event.end.date || '')
    
    // For all-day events
    if (event.start.date && !event.start.dateTime) {
      return {
        top: 0,
        height: 60, // 1 hour height
        isAllDay: true,
      }
    }

    const dayStart = new Date(dayDate)
    dayStart.setHours(0, 0, 0, 0)

    // Calculate position based on hour
    const startHour = Math.max(0, (eventStart.getTime() - dayStart.getTime()) / (1000 * 60 * 60))
    const endHour = Math.min(24, (eventEnd.getTime() - dayStart.getTime()) / (1000 * 60 * 60))
    const duration = endHour - startHour

    return {
      top: startHour * 60, // 60px per hour
      height: Math.max(duration * 60, 20), // minimum 20px height
      isAllDay: false,
    }
  }

  function formatTime(dateStr?: string): string {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  // Get unique calendars for legend
  const uniqueCalendars = useMemo(() => {
    const seen = new Map<string, { name: string; color: string }>()
    events.forEach((e) => {
      if (!seen.has(e.calendarId)) {
        seen.set(e.calendarId, { name: e.calendarName, color: e.calendarColor })
      }
    })
    return Array.from(seen.values())
  }, [events])

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={goToPrevWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold text-white min-w-[200px] text-center">
            {weekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <Button variant="ghost" size="sm" onClick={goToNextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="ghost" size="sm" onClick={fetchEvents} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Calendar Legend */}
      {uniqueCalendars.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {uniqueCalendars.map((cal) => (
            <div key={cal.name} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: cal.color }}
              />
              <span className="text-gray-400">{cal.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Calendar Grid */}
      <Card variant="glass" className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <RefreshCw className="w-6 h-6 text-violet-400 animate-spin" />
            </div>
          ) : (
            <div className="flex">
              {/* Time Column */}
              <div className="w-16 shrink-0 border-r border-white/10">
                <div className="h-14 border-b border-white/10" /> {/* Header spacer */}
                <div className="relative">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="h-[60px] border-b border-white/5 text-xs text-gray-500 pr-2 text-right pt-[-6px]"
                    >
                      {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                    </div>
                  ))}
                </div>
              </div>

              {/* Days */}
              <div className="flex flex-1 min-w-0">
                {weekDates.map((date, dayIndex) => {
                  const dayEvents = getEventsForDay(date)
                  const today = isToday(date)

                  return (
                    <div key={dayIndex} className="flex-1 min-w-[100px] border-r border-white/10 last:border-r-0">
                      {/* Day Header */}
                      <div className={`h-14 border-b border-white/10 p-2 text-center ${today ? 'bg-violet-500/10' : ''}`}>
                        <p className="text-xs text-gray-500">{DAYS[date.getDay()]}</p>
                        <p className={`text-lg font-semibold ${today ? 'text-violet-400' : 'text-white'}`}>
                          {date.getDate()}
                        </p>
                      </div>

                      {/* Day Events */}
                      <div className="relative h-[1440px]"> {/* 24 hours * 60px */}
                        {/* Hour Lines */}
                        {HOURS.map((hour) => (
                          <div
                            key={hour}
                            className="absolute w-full border-b border-white/5"
                            style={{ top: hour * 60, height: 60 }}
                          />
                        ))}

                        {/* Events */}
                        {dayEvents.map((event) => {
                          const pos = getEventPosition(event, date)
                          return (
                            <div
                              key={event.id}
                              className="absolute left-1 right-1 rounded-md px-1.5 py-0.5 text-xs overflow-hidden cursor-pointer hover:brightness-110 transition-all z-10"
                              style={{
                                top: pos.top,
                                height: pos.height,
                                backgroundColor: event.calendarColor + '40',
                                borderLeft: `3px solid ${event.calendarColor}`,
                              }}
                              title={`${event.summary}\n${event.calendarName}\n${formatTime(event.start.dateTime)} - ${formatTime(event.end.dateTime)}`}
                            >
                              {!pos.isAllDay && pos.height >= 40 && (
                                <p className="text-gray-400 text-[10px]">
                                  {formatTime(event.start.dateTime)}
                                </p>
                              )}
                              <p className="text-white font-medium truncate text-[11px]">
                                {event.summary || '(No title)'}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empty State */}
      {!loading && events.length === 0 && (
        <div className="text-center py-12">
          <CalendarIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No events this week</p>
          <p className="text-sm text-gray-500 mt-1">
            Connect calendars and select them for availability checking to see events here
          </p>
        </div>
      )}
    </div>
  )
}
