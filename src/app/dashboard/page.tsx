import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Calendar, Clock, Link as LinkIcon, Plus, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  const quickActions = [
    {
      title: 'Connect Calendar',
      description: 'Sync your Google Calendar to check availability',
      href: '/dashboard/calendars',
      icon: Calendar,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Set Availability',
      description: 'Define when you\'re available for meetings',
      href: '/dashboard/availability',
      icon: Clock,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      title: 'Create Event Type',
      description: 'Set up booking links for different meeting types',
      href: '/dashboard/event-types',
      icon: LinkIcon,
      color: 'from-violet-500 to-purple-500',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, {session.user?.name?.split(' ')[0] || 'there'}!
        </h1>
        <p className="text-gray-400">
          Here&apos;s an overview of your scheduling dashboard.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Connected Calendars', value: '0', subtext: 'calendars' },
          { label: 'Upcoming Meetings', value: '0', subtext: 'this week' },
          { label: 'Event Types', value: '0', subtext: 'active' },
          { label: 'Total Bookings', value: '0', subtext: 'all time' },
        ].map((stat) => (
          <Card key={stat.label} variant="glass">
            <CardContent>
              <p className="text-sm text-gray-400 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.subtext}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Get Started</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.href} href={action.href}>
                <Card variant="glass" className="h-full hover:border-white/20 transition-all cursor-pointer group">
                  <CardContent>
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                      {action.title}
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>
                    <p className="text-sm text-gray-400">{action.description}</p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Booking Link Preview */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Your Booking Link</CardTitle>
            <CardDescription>Share this link to let others book time with you</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm truncate">
                meetwith.app/{session.user?.email?.split('@')[0] || 'you'}
              </div>
              <Button variant="secondary" size="sm" className="w-full sm:w-auto">Copy</Button>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Create an event type first to enable your booking page.
            </p>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest bookings and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                <Calendar className="w-6 h-6 text-gray-500" />
              </div>
              <p className="text-gray-400 text-sm">No activity yet</p>
              <p className="text-gray-500 text-xs mt-1">
                Bookings will appear here once you start scheduling
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
