'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Calendar, Plus, Check, RefreshCw, Trash2, ChevronDown, ChevronUp, Eye, Edit2, AlertCircle } from 'lucide-react'
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui'
import type { CalendarAccount } from '@/types'
import type { GoogleCalendar } from '@/lib/calendar/googleClient'

interface SavedCalendar {
  id: string
  calendar_id: string
  calendar_name: string
  include_in_availability: boolean
  write_to_calendar: boolean
}

export default function CalendarManager() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState<CalendarAccount[]>([])
  const [savedCalendars, setSavedCalendars] = useState<SavedCalendar[]>([])
  const [googleCalendars, setGoogleCalendars] = useState<GoogleCalendar[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null)
  const [loadingCalendars, setLoadingCalendars] = useState(false)
  const [savingCalendar, setSavingCalendar] = useState<string | null>(null)
  const [connectingAccount, setConnectingAccount] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Check for connection result from URL params
  useEffect(() => {
    if (searchParams.get('connected') === 'true') {
      setNotification({ type: 'success', message: 'Google account connected successfully!' })
      // Clear the URL param
      window.history.replaceState({}, '', '/dashboard/calendars')
    } else if (searchParams.get('error')) {
      const errorMap: Record<string, string> = {
        oauth_denied: 'Connection was cancelled',
        missing_params: 'Invalid OAuth response',
        expired: 'Connection request expired, please try again',
        invalid_state: 'Invalid connection state',
        db_not_configured: 'Database not configured',
        token_exchange: 'Failed to exchange tokens',
        no_email: 'Could not get email from Google',
        db_error: 'Failed to save account',
        unknown: 'An unknown error occurred',
      }
      setNotification({ 
        type: 'error', 
        message: errorMap[searchParams.get('error') || ''] || 'Connection failed' 
      })
      window.history.replaceState({}, '', '/dashboard/calendars')
    }
  }, [searchParams])

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchAccounts()
    } else if (status === 'unauthenticated') {
      setLoading(false)
    }
  }, [status])

  async function fetchAccounts() {
    try {
      const res = await fetch('/api/calendars')
      const data = await res.json()
      setAccounts(data.accounts || [])
      // Extract saved calendar preferences
      const saved = (data.accounts || []).map((a: CalendarAccount) => ({
        id: a.id,
        calendar_id: a.calendar_id,
        calendar_name: a.calendar_name,
        include_in_availability: a.include_in_availability,
        write_to_calendar: a.write_to_calendar,
      }))
      setSavedCalendars(saved)
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchGoogleCalendars(accountId: string) {
    if (loadingCalendars) return
    setLoadingCalendars(true)
    try {
      const res = await fetch(`/api/calendars/google/list?accountId=${accountId}`)
      const data = await res.json()
      setGoogleCalendars(data.calendars || [])
    } catch (error) {
      console.error('Error fetching Google calendars:', error)
    } finally {
      setLoadingCalendars(false)
    }
  }

  async function toggleCalendarAvailability(calendarId: string, calendarName: string, include: boolean) {
    setSavingCalendar(calendarId)
    try {
      // Check if calendar exists in saved list
      const existing = savedCalendars.find(c => c.calendar_id === calendarId)
      
      if (existing) {
        // Update existing
        await fetch('/api/calendars', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            calendarId,
            includeInAvailability: include,
          }),
        })
      } else {
        // Add new
        await fetch('/api/calendars', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            calendarId,
            calendarName,
            includeInAvailability: include,
          }),
        })
      }
      
      // Refresh the list
      await fetchAccounts()
    } catch (error) {
      console.error('Error updating calendar:', error)
    } finally {
      setSavingCalendar(null)
    }
  }

  async function setWriteCalendar(calendarId: string) {
    setSavingCalendar(calendarId)
    try {
      await fetch('/api/calendars', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarId,
          writeToCalendar: true,
        }),
      })
      await fetchAccounts()
    } catch (error) {
      console.error('Error setting write calendar:', error)
    } finally {
      setSavingCalendar(null)
    }
  }

  function handleConnectGoogle() {
    signIn('google', { callbackUrl: '/dashboard/calendars' })
  }

  async function handleConnectAdditionalGoogle() {
    setConnectingAccount(true)
    try {
      const res = await fetch('/api/calendars/google/connect')
      const data = await res.json()
      
      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        setNotification({ type: 'error', message: 'Failed to initiate connection' })
      }
    } catch (error) {
      console.error('Error connecting account:', error)
      setNotification({ type: 'error', message: 'Failed to connect account' })
    } finally {
      setConnectingAccount(false)
    }
  }

  function toggleAccountExpand(accountId: string) {
    if (expandedAccount === accountId) {
      setExpandedAccount(null)
    } else {
      setExpandedAccount(accountId)
      fetchGoogleCalendars(accountId)
    }
  }

  function isCalendarSelected(calendarId: string): boolean {
    return savedCalendars.some(c => c.calendar_id === calendarId && c.include_in_availability)
  }

  function isWriteCalendar(calendarId: string): boolean {
    return savedCalendars.some(c => c.calendar_id === calendarId && c.write_to_calendar)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    )
  }

  const hasConnectedGoogle = accounts.some((a) => a.provider === 'google')
  const selectedCount = savedCalendars.filter(c => c.include_in_availability).length
  const writeCalendar = savedCalendars.find(c => c.write_to_calendar)
  const connectedGoogleAccounts = [...new Set(accounts.filter(a => a.provider === 'google').map(a => a.account_email))]

  return (
    <div className="space-y-8">
      {/* Notification */}
      {notification && (
        <div className={`flex items-center gap-3 p-4 rounded-lg border ${
          notification.type === 'success' 
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {notification.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <p>{notification.message}</p>
          <button 
            onClick={() => setNotification(null)}
            className="ml-auto text-current opacity-70 hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}
      {/* Status Summary */}
      {hasConnectedGoogle && (
        <Card variant="glass" className="border-violet-500/30">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                  <Eye className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="font-medium text-white">
                    Checking {selectedCount} calendar{selectedCount !== 1 ? 's' : ''} for availability
                  </p>
                  <p className="text-sm text-gray-400">
                    {writeCalendar 
                      ? `New events will be created on "${writeCalendar.calendar_name}"`
                      : 'No calendar selected for creating events'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected Calendars */}
      {accounts.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Connected Accounts</h2>
          {accounts.map((account) => (
            <Card key={account.id} variant="glass">
              <CardContent className="p-0">
                {/* Account Header */}
                <div
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors gap-3"
                  onClick={() => toggleAccountExpand(account.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white flex flex-wrap items-center gap-2">
                        <span className="truncate">{account.provider === 'google' ? 'Google Calendar' : account.provider}</span>
                        {account.is_primary && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 shrink-0">
                            Primary
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-400 truncate">{account.account_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="flex items-center gap-1.5 text-sm text-green-400">
                      <Check className="w-4 h-4" />
                      <span className="hidden sm:inline">Connected</span>
                    </div>
                    {expandedAccount === account.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Calendar List */}
                {expandedAccount === account.id && (
                  <div className="border-t border-white/10 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-gray-400">
                        Select calendars to check for availability
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          fetchGoogleCalendars(account.id)
                        }}
                        className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${loadingCalendars ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                    </div>
                    {loadingCalendars ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="w-5 h-5 text-violet-400 animate-spin" />
                      </div>
                    ) : googleCalendars.length > 0 ? (
                      <div className="space-y-2">
                        {googleCalendars.map((cal) => {
                          const selected = isCalendarSelected(cal.id)
                          const isWrite = isWriteCalendar(cal.id)
                          const isSaving = savingCalendar === cal.id
                          
                          return (
                            <div
                              key={cal.id}
                              className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border transition-all gap-3 ${
                                selected 
                                  ? 'bg-violet-500/10 border-violet-500/30' 
                                  : 'bg-white/5 border-white/10 hover:border-white/20'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-3 h-3 rounded-full shrink-0"
                                  style={{ backgroundColor: cal.backgroundColor || '#7c3aed' }}
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-white truncate">{cal.summary}</p>
                                  {cal.primary && (
                                    <p className="text-xs text-gray-500">Primary calendar</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 justify-end">
                                {/* Write Calendar Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (!isWrite) setWriteCalendar(cal.id)
                                  }}
                                  disabled={isSaving}
                                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all whitespace-nowrap ${
                                    isWrite
                                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                      : 'text-gray-500 hover:text-white hover:bg-white/10'
                                  }`}
                                  title={isWrite ? 'Events created here' : 'Set as default for new events'}
                                >
                                  <Edit2 className="w-3 h-3" />
                                  {isWrite ? 'Default' : 'Set default'}
                                </button>
                                
                                {/* Include in Availability Toggle */}
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <span className="text-xs text-gray-400 hidden sm:inline">Check busy</span>
                                  <div className="relative">
                                    <input
                                      type="checkbox"
                                      checked={selected}
                                      disabled={isSaving}
                                      onChange={(e) => {
                                        e.stopPropagation()
                                        toggleCalendarAvailability(cal.id, cal.summary, e.target.checked)
                                      }}
                                      className="sr-only"
                                    />
                                    <div className={`w-9 h-5 rounded-full transition-colors ${
                                      selected ? 'bg-violet-600' : 'bg-white/20'
                                    }`}>
                                      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${
                                        selected ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'
                                      }`} style={{ marginLeft: selected ? '18px' : '2px' }} />
                                    </div>
                                  </div>
                                </label>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No calendars found. Make sure calendar permissions are granted.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card variant="glass">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No calendars connected</h3>
            <p className="text-gray-400 text-sm max-w-sm mb-6">
              Connect your Google Calendar to automatically check availability and create events.
            </p>
            <Button onClick={handleConnectGoogle}>
              <Plus className="w-4 h-4 mr-2" />
              Connect Google Calendar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add More Calendars */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Add More Calendars</CardTitle>
          <CardDescription>Connect additional calendars to manage all your schedules</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Google - First Account */}
            {!hasConnectedGoogle && (
              <button
                onClick={handleConnectGoogle}
                className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">Google Calendar</p>
                  <p className="text-xs text-gray-500">Gmail, Google Workspace</p>
                </div>
                <Plus className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
              </button>
            )}

            {/* Add Another Google Account */}
            {hasConnectedGoogle && (
              <button
                onClick={handleConnectAdditionalGoogle}
                disabled={connectingAccount}
                className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-violet-500/50 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">Add Another Google Account</p>
                  <p className="text-xs text-gray-500">
                    {connectedGoogleAccounts.length} account{connectedGoogleAccounts.length !== 1 ? 's' : ''} connected
                  </p>
                </div>
                {connectingAccount ? (
                  <RefreshCw className="w-5 h-5 text-violet-400 animate-spin" />
                ) : (
                  <Plus className="w-5 h-5 text-gray-500 group-hover:text-violet-400 transition-colors" />
                )}
              </button>
            )}

            {/* Apple */}
            <button
              disabled
              className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 text-left opacity-50 cursor-not-allowed"
            >
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#000">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">Apple Calendar</p>
                <p className="text-xs text-gray-500">iCloud (Coming Soon)</p>
              </div>
            </button>

            {/* Outlook */}
            <button
              disabled
              className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 text-left opacity-50 cursor-not-allowed"
            >
              <div className="w-10 h-10 rounded-lg bg-[#0078d4] flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#fff">
                  <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.5V2.55q0-.44.3-.75.3-.3.75-.3h12.9q.44 0 .75.3.3.3.3.75V5.8l.02.04v6.16zm-8.5-2.7V2.55L8.2 2.5l-.3.05v3.45h8.7q.44 0 .75.3.3.3.3.75V9.2l5.85-3.5v-.15L15.5 9.34zM13 12.04q0-.45.11-.87.1-.42.33-.75.22-.34.58-.54.37-.19.87-.19.47 0 .85.18.37.19.58.53.22.33.33.75.1.43.1.9 0 .43-.1.85-.1.43-.33.76-.22.33-.59.54-.36.2-.87.2t-.85-.2q-.35-.21-.57-.54-.22-.34-.31-.77-.1-.43-.1-.85z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">Outlook Calendar</p>
                <p className="text-xs text-gray-500">Microsoft 365 (Coming Soon)</p>
              </div>
            </button>

            {/* CalDAV */}
            <button
              disabled
              className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 text-left opacity-50 cursor-not-allowed"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">CalDAV</p>
                <p className="text-xs text-gray-500">Self-hosted (Coming Soon)</p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Settings Info */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>How it works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-gray-400">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs text-violet-400 font-bold">1</span>
              </div>
              <p>
                <strong className="text-white">Check availability:</strong> We scan your connected
                calendars to find times when you&apos;re free. Only busy/free information is used — we
                never read event details.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs text-violet-400 font-bold">2</span>
              </div>
              <p>
                <strong className="text-white">Create events:</strong> When someone books a meeting,
                we create a calendar event with all the details and send invites.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs text-violet-400 font-bold">3</span>
              </div>
              <p>
                <strong className="text-white">Stay in sync:</strong> Cancellations and
                reschedulings automatically update your calendar.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
