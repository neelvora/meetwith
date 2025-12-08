import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Clock, Plus, Check } from 'lucide-react'
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const defaultAvailability = [
  { day: 1, start: '09:00', end: '17:00', enabled: true }, // Monday
  { day: 2, start: '09:00', end: '17:00', enabled: true }, // Tuesday
  { day: 3, start: '09:00', end: '17:00', enabled: true }, // Wednesday
  { day: 4, start: '09:00', end: '17:00', enabled: true }, // Thursday
  { day: 5, start: '09:00', end: '17:00', enabled: true }, // Friday
  { day: 0, start: '09:00', end: '17:00', enabled: false }, // Sunday
  { day: 6, start: '09:00', end: '17:00', enabled: false }, // Saturday
]

export default async function AvailabilityPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Availability</h1>
        <p className="text-gray-400">
          Set your weekly hours when you&apos;re available for meetings.
        </p>
      </div>

      {/* Timezone */}
      <Card variant="glass" className="mb-6">
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-white">Timezone</p>
              <p className="text-xs text-gray-500">America/Chicago (CST)</p>
            </div>
          </div>
          <Button variant="ghost" size="sm">Change</Button>
        </CardContent>
      </Card>

      {/* Weekly Hours */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Weekly Hours</CardTitle>
          <CardDescription>Define your standard availability for each day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {defaultAvailability
              .sort((a, b) => (a.day === 0 ? 7 : a.day) - (b.day === 0 ? 7 : b.day))
              .map((slot) => (
              <div 
                key={slot.day} 
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  slot.enabled 
                    ? 'bg-white/5 border-white/10' 
                    : 'bg-transparent border-white/5 opacity-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <button 
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                      slot.enabled 
                        ? 'bg-violet-500 border-violet-500' 
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    {slot.enabled && <Check className="w-4 h-4 text-white" />}
                  </button>
                  <span className="font-medium text-white w-24">{DAYS[slot.day]}</span>
                </div>
                
                {slot.enabled ? (
                  <div className="flex items-center gap-2">
                    <select 
                      defaultValue={slot.start}
                      className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    >
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0')
                        return (
                          <option key={`${hour}:00`} value={`${hour}:00`}>{hour}:00</option>
                        )
                      })}
                    </select>
                    <span className="text-gray-500">-</span>
                    <select 
                      defaultValue={slot.end}
                      className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    >
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0')
                        return (
                          <option key={`${hour}:00`} value={`${hour}:00`}>{hour}:00</option>
                        )
                      })}
                    </select>
                    <Button variant="ghost" size="sm" className="ml-2">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">Unavailable</span>
                )}
              </div>
            ))}
          </div>

          {/* Save Button */}
          <div className="mt-6 flex justify-end">
            <Button>Save Changes</Button>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card variant="glass" className="mt-6">
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
          <CardDescription>Fine-tune your availability preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div>
              <p className="font-medium text-white">Buffer time</p>
              <p className="text-sm text-gray-500">Add time between meetings</p>
            </div>
            <select className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm">
              <option value="0">No buffer</option>
              <option value="5">5 minutes</option>
              <option value="10">10 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div>
              <p className="font-medium text-white">Minimum notice</p>
              <p className="text-sm text-gray-500">How far in advance can people book</p>
            </div>
            <select className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm">
              <option value="0">No minimum</option>
              <option value="1">1 hour</option>
              <option value="4">4 hours</option>
              <option value="24">1 day</option>
              <option value="48">2 days</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div>
              <p className="font-medium text-white">Daily meeting limit</p>
              <p className="text-sm text-gray-500">Maximum meetings per day</p>
            </div>
            <select className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm">
              <option value="0">No limit</option>
              <option value="3">3 meetings</option>
              <option value="5">5 meetings</option>
              <option value="8">8 meetings</option>
              <option value="10">10 meetings</option>
            </select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
