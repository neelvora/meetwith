'use client'

import { useState, useEffect, useCallback } from 'react'
import { User, Bell, Palette, Loader2, Check, AlertCircle, Link as LinkIcon } from 'lucide-react'
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Input } from '@/components/ui'

interface UserProfile {
  name: string
  username: string
  email: string
  image?: string
  brand_color: string
  welcome_message: string
  notifications: {
    email_confirmations: boolean
    reminders: boolean
    cancellations: boolean
    marketing: boolean
  }
}

const BRAND_COLORS = [
  { name: 'violet', value: '#8b5cf6' },
  { name: 'blue', value: '#3b82f6' },
  { name: 'emerald', value: '#10b981' },
  { name: 'orange', value: '#f97316' },
  { name: 'pink', value: '#ec4899' },
]

interface Props {
  initialProfile: {
    name: string
    email: string
    image?: string
  }
}

export default function SettingsClient({ initialProfile }: Props) {
  const [profile, setProfile] = useState<UserProfile>({
    name: initialProfile.name || '',
    username: initialProfile.email?.split('@')[0] || '',
    email: initialProfile.email || '',
    image: initialProfile.image,
    brand_color: 'violet',
    welcome_message: 'Welcome! Please select a time that works for you.',
    notifications: {
      email_confirmations: true,
      reminders: true,
      cancellations: true,
      marketing: false,
    },
  })
  
  const [saving, setSaving] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [originalUsername, setOriginalUsername] = useState<string>('')

  // Debounced username availability check
  const checkUsernameAvailability = useCallback(async (username: string) => {
    if (!username || username === originalUsername) {
      setUsernameStatus('idle')
      return
    }

    // Validate format first
    const usernameRegex = /^[a-z0-9_-]{3,30}$/
    const normalized = username.toLowerCase().trim()
    
    if (!usernameRegex.test(normalized)) {
      setUsernameStatus('invalid')
      return
    }

    setUsernameStatus('checking')

    try {
      const res = await fetch(`/api/settings/check-username?username=${encodeURIComponent(normalized)}`)
      const data = await res.json()
      
      if (data.available) {
        setUsernameStatus('available')
      } else {
        setUsernameStatus('taken')
      }
    } catch {
      setUsernameStatus('idle')
    }
  }, [originalUsername])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (profile.username && profile.username !== originalUsername) {
        checkUsernameAvailability(profile.username)
      }
    }, 500) // Debounce 500ms

    return () => clearTimeout(timer)
  }, [profile.username, originalUsername, checkUsernameAvailability])

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        if (data.settings) {
          const username = data.settings.username || profile.username
          setProfile(prev => ({
            ...prev,
            username,
            brand_color: data.settings.brand_color || prev.brand_color,
            welcome_message: data.settings.welcome_message || prev.welcome_message,
            notifications: data.settings.notifications || prev.notifications,
          }))
          setOriginalUsername(username)
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  async function saveSection(section: string) {
    setSaving(section)
    setNotification(null)
    
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          section,
          profile: {
            name: profile.name,
            username: profile.username,
          },
          branding: {
            brand_color: profile.brand_color,
            welcome_message: profile.welcome_message,
          },
          notifications: profile.notifications,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      // Update original username after successful save
      if (section === 'profile') {
        setOriginalUsername(profile.username)
        setUsernameStatus('idle')
      }

      setNotification({ type: 'success', message: 'Settings saved successfully!' })
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save settings'
      setNotification({ type: 'error', message })
    } finally {
      setSaving(null)
    }
  }

  function toggleNotification(key: keyof typeof profile.notifications) {
    setProfile(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }))
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your account preferences and profile settings.
        </p>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`mb-6 p-4 rounded-lg ${
          notification.type === 'success' 
            ? 'bg-green-500/20 border border-green-500/30 text-green-400' 
            : 'bg-red-500/20 border border-red-500/30 text-red-400'
        }`}>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            {notification.message}
          </div>
        </div>
      )}

      {/* Profile */}
      <Card variant="glass" className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-violet-400" />
            <div>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your public profile information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {profile.image ? (
              <img 
                src={profile.image} 
                alt={profile.name || 'Profile'} 
                className="w-20 h-20 rounded-full border-2 border-white/20"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
                {profile.name?.[0] || 'U'}
              </div>
            )}
            <Button variant="secondary" size="sm" disabled>
              Change Photo
            </Button>
          </div>

          <Input 
            label="Name" 
            value={profile.name}
            onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Your name"
          />

          {/* Username / Booking Link Section */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Your Booking Link
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex items-center flex-1 rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/5 overflow-hidden">
                <span className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 border-r border-gray-300 dark:border-white/10 whitespace-nowrap">
                  meetwith.dev/
                </span>
                <input
                  type="text"
                  value={profile.username}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')
                    setProfile(prev => ({ ...prev, username: value }))
                  }}
                  placeholder="your-username"
                  className="flex-1 px-4 py-3 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none text-sm min-w-0"
                />
              </div>
              {/* Status indicator */}
              <div className="flex items-center justify-center sm:w-auto">
                {usernameStatus === 'checking' && (
                  <div className="flex items-center gap-2 text-gray-500 text-sm px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">Checking...</span>
                  </div>
                )}
                {usernameStatus === 'available' && (
                  <div className="flex items-center gap-2 text-green-500 text-sm px-3 py-2">
                    <Check className="w-4 h-4" />
                    <span>Available</span>
                  </div>
                )}
                {usernameStatus === 'taken' && (
                  <div className="flex items-center gap-2 text-red-500 text-sm px-3 py-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>Taken</span>
                  </div>
                )}
                {usernameStatus === 'invalid' && (
                  <div className="flex items-center gap-2 text-amber-500 text-sm px-3 py-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>Invalid</span>
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              3-30 characters. Lowercase letters, numbers, hyphens, and underscores only.
            </p>
            {profile.username && profile.username !== originalUsername && usernameStatus === 'available' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <LinkIcon className="w-4 h-4 text-violet-400" />
                <span className="text-sm text-violet-400 dark:text-violet-300">
                  Your new booking link: <span className="font-medium">meetwith.dev/{profile.username}</span>
                </span>
              </div>
            )}
          </div>

          <Input 
            label="Email" 
            value={profile.email}
            disabled
            className="opacity-60"
          />

          <div className="flex justify-end">
            <Button 
              onClick={() => saveSection('profile')} 
              disabled={
                saving === 'profile' || 
                usernameStatus === 'taken' || 
                usernameStatus === 'invalid' ||
                usernameStatus === 'checking'
              }
            >
              {saving === 'profile' ? (
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

      {/* Branding */}
      <Card variant="glass" className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Palette className="w-5 h-5 text-violet-400" />
            <div>
              <CardTitle>Branding</CardTitle>
              <CardDescription>Customize your booking page appearance</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Brand Color
            </label>
            <div className="flex gap-3">
              {BRAND_COLORS.map((color) => (
                <button
                  key={color.name}
                  onClick={() => setProfile(prev => ({ ...prev, brand_color: color.name }))}
                  className={`w-10 h-10 rounded-lg ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 transition-all ${
                    profile.brand_color === color.name ? 'ring-gray-900 dark:ring-white' : 'ring-transparent'
                  } hover:ring-gray-400 dark:hover:ring-white/50`}
                  style={{ backgroundColor: color.value }}
                />
              ))}
            </div>
          </div>

          <Input 
            label="Welcome Message" 
            value={profile.welcome_message}
            onChange={(e) => setProfile(prev => ({ ...prev, welcome_message: e.target.value }))}
            placeholder="Custom welcome message"
          />

          <div className="flex justify-end">
            <Button onClick={() => saveSection('branding')} disabled={saving === 'branding'}>
              {saving === 'branding' ? (
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

      {/* Notifications */}
      <Card variant="glass" className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-violet-400" />
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choose when to receive notifications</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: 'email_confirmations' as const, label: 'Email confirmations', description: 'Get notified when someone books with you' },
            { key: 'reminders' as const, label: 'Reminders', description: 'Receive reminder emails before meetings' },
            { key: 'cancellations' as const, label: 'Cancellations', description: 'Get notified when bookings are cancelled' },
            { key: 'marketing' as const, label: 'Marketing emails', description: 'Product updates and tips' },
          ].map((item) => (
            <div key={item.key} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 gap-3">
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">{item.description}</p>
              </div>
              <button 
                onClick={() => toggleNotification(item.key)}
                className={`w-12 h-7 rounded-full transition-all relative shrink-0 self-end sm:self-auto ${
                  profile.notifications[item.key] ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-700'
                }`}
              >
                <span 
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                    profile.notifications[item.key] ? 'left-6' : 'left-1'
                  }`} 
                />
              </button>
            </div>
          ))}

          <div className="flex justify-end pt-4">
            <Button onClick={() => saveSection('notifications')} disabled={saving === 'notifications'}>
              {saving === 'notifications' ? (
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

      {/* Danger Zone */}
      <Card variant="bordered" className="border-red-500/30">
        <CardHeader>
          <CardTitle className="text-red-400">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-red-500/5 border border-red-500/20 gap-4">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Delete Account</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">Permanently delete your account and all data</p>
            </div>
            <Button variant="secondary" className="text-red-400 border-red-500/30 hover:bg-red-500/10 w-full sm:w-auto">
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
