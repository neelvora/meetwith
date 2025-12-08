import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import CalendarManager from './CalendarManager'

export default async function CalendarsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Connected Calendars</h1>
        <p className="text-gray-400">
          Manage your calendar connections to check availability across all your schedules.
        </p>
      </div>

      <CalendarManager />
    </div>
  )
}
