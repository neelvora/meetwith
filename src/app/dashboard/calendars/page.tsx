import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Calendar, Plus, Check, ExternalLink } from 'lucide-react'
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui'

export default async function CalendarsPage() {
  const session = await auth()
  
  if (!session) {
    redirect('/auth/signin')
  }

  // For now, show that Google is connected via OAuth
  const connectedCalendars = session.accessToken ? [
    {
      id: 'google-primary',
      provider: 'google',
      name: 'Google Calendar',
      email: session.user?.email,
      isPrimary: true,
    }
  ] : []

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Connected Calendars</h1>
        <p className="text-gray-400">
          Manage your calendar connections to check availability across all your schedules.
        </p>
      </div>

      {/* Connected Calendars */}
      {connectedCalendars.length > 0 ? (
        <div className="space-y-4 mb-8">
          {connectedCalendars.map((cal) => (
            <Card key={cal.id} variant="glass">
              <CardContent className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      {cal.name}
                      {cal.isPrimary && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                          Primary
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-400">{cal.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-sm text-green-400">
                    <Check className="w-4 h-4" />
                    Connected
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card variant="glass" className="mb-8">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No calendars connected</h3>
            <p className="text-gray-400 text-sm max-w-sm mb-6">
              Connect your Google Calendar to automatically check availability and create events.
            </p>
            <Button>
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
            {/* Google */}
            <button className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all text-left group">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">Google Calendar</p>
                <p className="text-xs text-gray-500">Gmail, Google Workspace</p>
              </div>
              <Plus className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
            </button>

            {/* Apple */}
            <button className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all text-left group opacity-50 cursor-not-allowed">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#000">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">Apple Calendar</p>
                <p className="text-xs text-gray-500">iCloud (Coming Soon)</p>
              </div>
              <ExternalLink className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
