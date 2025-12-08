'use client'

import { useState, useEffect } from 'react'
import { Clock, Plus, Check, Trash2, Loader2, Copy, RotateCcw, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface AvailabilitySlot {
  id?: string
  weekday: number
  start_time: string
  end_time: string
  is_active: boolean
}

interface TimezoneOption {
  value: string
  label: string
}

const TIMEZONES: TimezoneOption[] = [
  { value: 'America/New_York', label: 'Eastern (EST/EDT)' },
  { value: 'America/Chicago', label: 'Central (CST/CDT)' },
  { value: 'America/Denver', label: 'Mountain (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PST/PDT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
]

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2)
  const minute = i % 2 === 0 ? '00' : '30'
  const value = `${hour.toString().padStart(2, '0')}:${minute}`
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  const label = `${displayHour}:${minute} ${ampm}`
  return { value, label }
})

export default function AvailabilityClient() {
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([])
  const [timezone, setTimezone] = useState('America/Chicago')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  
  // Advanced settings
  const [bufferTime, setBufferTime] = useState(0)
  const [minNotice, setMinNotice] = useState(4)
  const [dailyLimit, setDailyLimit] = useState(0)
  
  // AI suggestion state
  const [showAIHint, setShowAIHint] = useState(false)
  const [aiSuggestion, setAISuggestion] = useState<string | null>(null)
  const [loadingAI, setLoadingAI] = useState(false)

  useEffect(() => {
    fetchAvailability()
  }, [])

  async function fetchAvailability() {
    try {
      const res = await fetch('/api/availability')
      const data = await res.json()
      
      if (data.availability && data.availability.length > 0) {
        setAvailability(data.availability)
      } else {
        // Set default availability
        setAvailability([
          { weekday: 1, start_time: '09:00', end_time: '17:00', is_active: true },
          { weekday: 2, start_time: '09:00', end_time: '17:00', is_active: true },
          { weekday: 3, start_time: '09:00', end_time: '17:00', is_active: true },
          { weekday: 4, start_time: '09:00', end_time: '17:00', is_active: true },
          { weekday: 5, start_time: '09:00', end_time: '17:00', is_active: true },
          { weekday: 0, start_time: '09:00', end_time: '17:00', is_active: false },
          { weekday: 6, start_time: '09:00', end_time: '17:00', is_active: false },
        ])
      }
      
      if (data.timezone) {
        setTimezone(data.timezone)
      }
      if (data.settings) {
        setBufferTime(data.settings.buffer_time || 0)
        setMinNotice(data.settings.min_notice || 4)
        setDailyLimit(data.settings.daily_limit || 0)
      }
    } catch (error) {
      console.error('Error fetching availability:', error)
      // Set defaults on error
      setAvailability([
        { weekday: 1, start_time: '09:00', end_time: '17:00', is_active: true },
        { weekday: 2, start_time: '09:00', end_time: '17:00', is_active: true },
        { weekday: 3, start_time: '09:00', end_time: '17:00', is_active: true },
        { weekday: 4, start_time: '09:00', end_time: '17:00', is_active: true },
        { weekday: 5, start_time: '09:00', end_time: '17:00', is_active: true },
        { weekday: 0, start_time: '09:00', end_time: '17:00', is_active: false },
        { weekday: 6, start_time: '09:00', end_time: '17:00', is_active: false },
      ])
    } finally {
      setLoading(false)
    }
  }

  async function saveAvailability() {
    setSaving(true)
    setNotification(null)
    
    try {
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availability,
          timezone,
          settings: {
            buffer_time: bufferTime,
            min_notice: minNotice,
            daily_limit: dailyLimit,
          },
        }),
      })
      
      if (res.ok) {
        setNotification({ type: 'success', message: 'Availability saved successfully!' })
        setTimeout(() => setNotification(null), 3000)
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      console.error('Error saving availability:', error)
      setNotification({ type: 'error', message: 'Failed to save availability. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  async function fetchAISuggestion() {
    setLoadingAI(true)
    setAISuggestion(null)
    
    try {
      const res = await fetch('/api/ai/suggest-window', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentAvailability: availability
            .filter(s => s.is_active)
            .map(s => ({
              day: DAYS[s.weekday],
              startTime: s.start_time,
              endTime: s.end_time,
            })),
          timezone,
        }),
      })
      
      if (res.ok) {
        const data = await res.json()
        setAISuggestion(data.suggestion)
        setShowAIHint(true)
      } else if (res.status === 503) {
        setAISuggestion('AI features are not configured. Add your OpenAI API key to enable smart suggestions.')
      } else {
        setAISuggestion('Unable to generate suggestions at this time.')
      }
    } catch (error) {
      console.error('Error fetching AI suggestion:', error)
      setAISuggestion('Unable to generate suggestions at this time.')
    } finally {
      setLoadingAI(false)
    }
  }

  function toggleDay(weekday: number) {
    setAvailability(prev => prev.map(slot => 
      slot.weekday === weekday 
        ? { ...slot, is_active: !slot.is_active }
        : slot
    ))
  }

  function updateSlot(weekday: number, field: 'start_time' | 'end_time', value: string) {
    setAvailability(prev => prev.map(slot =>
      slot.weekday === weekday
        ? { ...slot, [field]: value }
        : slot
    ))
  }

  function copyFirstActiveToAll() {
    const firstActive = availability.find(s => s.is_active)
    if (!firstActive) {
      setNotification({ type: 'error', message: 'No active day to copy from' })
      setTimeout(() => setNotification(null), 3000)
      return
    }
    
    setAvailability(prev => prev.map(slot => ({
      ...slot,
      start_time: firstActive.start_time,
      end_time: firstActive.end_time,
      is_active: true,
    })))
    
    setNotification({ type: 'success', message: 'Copied schedule to all days' })
    setTimeout(() => setNotification(null), 3000)
  }

  function resetToDefault() {
    setAvailability([
      { weekday: 1, start_time: '09:00', end_time: '17:00', is_active: true },
      { weekday: 2, start_time: '09:00', end_time: '17:00', is_active: true },
      { weekday: 3, start_time: '09:00', end_time: '17:00', is_active: true },
      { weekday: 4, start_time: '09:00', end_time: '17:00', is_active: true },
      { weekday: 5, start_time: '09:00', end_time: '17:00', is_active: true },
      { weekday: 0, start_time: '09:00', end_time: '17:00', is_active: false },
      { weekday: 6, start_time: '09:00', end_time: '17:00', is_active: false },
    ])
    
    setNotification({ type: 'success', message: 'Reset to default 9-5 weekday schedule' })
    setTimeout(() => setNotification(null), 3000)
  }

  function getSlotForDay(weekday: number) {
    return availability.find(s => s.weekday === weekday) || {
      weekday,
      start_time: '09:00',
      end_time: '17:00',
      is_active: false,
    }
  }

  // Sort days: Monday first, Sunday last
  const sortedDays = [1, 2, 3, 4, 5, 6, 0]

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Notification */}
      {notification && (
        <div className={`mb-6 p-4 rounded-xl border ${
          notification.type === 'success' 
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 font-display">Availability</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Set your weekly hours when you&apos;re available for meetings.
        </p>
      </div>

      {/* Timezone */}
      <Card variant="glass" className="mb-6">
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Timezone</p>
              <p className="text-xs text-gray-500 hidden sm:block">{timezone}</p>
            </div>
          </div>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          >
            {TIMEZONES.map(tz => (
              <option key={tz.value} value={tz.value} className="bg-white dark:bg-gray-900">{tz.label}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Weekly Hours */}
      <Card variant="glass">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Weekly Hours</CardTitle>
              <CardDescription>Define your standard availability for each day</CardDescription>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyFirstActiveToAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                title="Copy first active day's schedule to all days"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy to All
              </button>
              <button
                onClick={resetToDefault}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                title="Reset to default 9-5 weekday schedule"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset to 9-5
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedDays.map((weekday) => {
              const slot = getSlotForDay(weekday)
              
              return (
                <div 
                  key={weekday} 
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all gap-3 ${
                    slot.is_active 
                      ? 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10' 
                      : 'bg-transparent border-gray-100 dark:border-white/5 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <button 
                      onClick={() => toggleDay(weekday)}
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                        slot.is_active 
                          ? 'bg-violet-500 border-violet-500' 
                          : 'border-gray-400 dark:border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      {slot.is_active && <Check className="w-4 h-4 text-white" />}
                    </button>
                    <span className="font-medium text-gray-900 dark:text-white sm:w-28">{DAYS[weekday]}</span>
                  </div>
                  
                  {slot.is_active ? (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select 
                        value={slot.start_time}
                        onChange={(e) => updateSlot(weekday, 'start_time', e.target.value)}
                        className="flex-1 sm:flex-initial px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                      >
                        {TIME_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value} className="bg-white dark:bg-gray-900">{opt.label}</option>
                        ))}
                      </select>
                      <span className="text-gray-500">-</span>
                      <select 
                        value={slot.end_time}
                        onChange={(e) => updateSlot(weekday, 'end_time', e.target.value)}
                        className="flex-1 sm:flex-initial px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                      >
                        {TIME_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value} className="bg-white dark:bg-gray-900">{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500 sm:text-right">Unavailable</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Save Button */}
          <div className="mt-6 flex justify-end">
            <Button onClick={saveAvailability} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Suggestion */}
      <Card variant="glass" className="mt-6">
        <CardHeader className="cursor-pointer" onClick={() => !aiSuggestion && fetchAISuggestion()}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-base">AI Scheduling Assistant</CardTitle>
                <CardDescription className="text-sm">Get smart suggestions for your availability</CardDescription>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (!aiSuggestion && !loadingAI) {
                  fetchAISuggestion()
                } else {
                  setShowAIHint(!showAIHint)
                }
              }}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {loadingAI ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : showAIHint && aiSuggestion ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </div>
        </CardHeader>
        {showAIHint && aiSuggestion && (
          <CardContent className="pt-0">
            <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{aiSuggestion}</p>
            </div>
            <button
              onClick={() => fetchAISuggestion()}
              disabled={loadingAI}
              className="mt-3 text-sm text-violet-500 dark:text-violet-400 hover:text-violet-600 dark:hover:text-violet-300 transition-colors flex items-center gap-1.5"
            >
              {loadingAI ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Refresh suggestion
                </>
              )}
            </button>
          </CardContent>
        )}
      </Card>

      {/* Advanced Settings */}
      <Card variant="glass" className="mt-6">
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
          <CardDescription>Fine-tune your availability preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 gap-3">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Buffer time</p>
              <p className="text-sm text-gray-500">Add time between meetings</p>
            </div>
            <select 
              value={bufferTime}
              onChange={(e) => setBufferTime(Number(e.target.value))}
              className="w-full sm:w-auto px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm"
            >
              <option value="0" className="bg-white dark:bg-gray-900">No buffer</option>
              <option value="5" className="bg-white dark:bg-gray-900">5 minutes</option>
              <option value="10" className="bg-white dark:bg-gray-900">10 minutes</option>
              <option value="15" className="bg-white dark:bg-gray-900">15 minutes</option>
              <option value="30" className="bg-white dark:bg-gray-900">30 minutes</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 gap-3">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Minimum notice</p>
              <p className="text-sm text-gray-500">How far in advance can people book</p>
            </div>
            <select 
              value={minNotice}
              onChange={(e) => setMinNotice(Number(e.target.value))}
              className="w-full sm:w-auto px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm"
            >
              <option value="0" className="bg-white dark:bg-gray-900">No minimum</option>
              <option value="1" className="bg-white dark:bg-gray-900">1 hour</option>
              <option value="4" className="bg-white dark:bg-gray-900">4 hours</option>
              <option value="24" className="bg-white dark:bg-gray-900">1 day</option>
              <option value="48" className="bg-white dark:bg-gray-900">2 days</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 gap-3">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Daily meeting limit</p>
              <p className="text-sm text-gray-500">Maximum meetings per day</p>
            </div>
            <select 
              value={dailyLimit}
              onChange={(e) => setDailyLimit(Number(e.target.value))}
              className="w-full sm:w-auto px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm"
            >
              <option value="0" className="bg-white dark:bg-gray-900">No limit</option>
              <option value="3" className="bg-white dark:bg-gray-900">3 meetings</option>
              <option value="5" className="bg-white dark:bg-gray-900">5 meetings</option>
              <option value="8" className="bg-white dark:bg-gray-900">8 meetings</option>
              <option value="10" className="bg-white dark:bg-gray-900">10 meetings</option>
            </select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
