import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Link as LinkIcon, Plus, Clock, Video, ExternalLink, MoreVertical } from 'lucide-react'
import Link from 'next/link'
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui'

const sampleEventTypes = [
  {
    id: '1',
    name: '30 Minute Meeting',
    slug: '30min',
    duration: 30,
    color: 'violet',
    description: 'A quick chat to discuss your project or questions.',
    isActive: true,
  },
  {
    id: '2', 
    name: '60 Minute Consultation',
    slug: '60min',
    duration: 60,
    color: 'emerald',
    description: 'In-depth consultation for complex topics.',
    isActive: true,
  },
]

const colorMap: Record<string, string> = {
  violet: 'from-violet-500 to-purple-600',
  emerald: 'from-emerald-500 to-teal-600',
  blue: 'from-blue-500 to-cyan-600',
  orange: 'from-orange-500 to-amber-600',
  pink: 'from-pink-500 to-rose-600',
}

export default async function EventTypesPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  const username = session.user?.email?.split('@')[0] || 'you'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Event Types</h1>
          <p className="text-gray-400">
            Create different meeting types for people to book with you.
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Event Type
        </Button>
      </div>

      {/* Event Types List */}
      <div className="space-y-4">
        {sampleEventTypes.map((eventType) => (
          <Card key={eventType.id} variant="glass" className="hover:border-white/20 transition-all">
            <CardContent className="flex items-center gap-4">
              {/* Color indicator */}
              <div className={`w-2 h-16 rounded-full bg-gradient-to-b ${colorMap[eventType.color]}`} />
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white">{eventType.name}</h3>
                  {eventType.isActive ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                      Active
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 line-clamp-1">{eventType.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {eventType.duration} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    Zoom / Google Meet
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-gray-400">
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-400">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>

            {/* Link preview */}
            <div className="px-6 pb-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/5">
                <LinkIcon className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-400 truncate">
                  meetwith.app/{username}/{eventType.slug}
                </span>
                <Button variant="ghost" size="sm" className="ml-auto text-xs">
                  Copy
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Create New Card */}
      <Card variant="bordered" className="mt-6 border-dashed hover:border-violet-500/50 transition-all cursor-pointer">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center mb-4">
            <Plus className="w-6 h-6 text-violet-400" />
          </div>
          <h3 className="font-semibold text-white mb-1">Create New Event Type</h3>
          <p className="text-sm text-gray-500 max-w-xs">
            Set up a new booking link with custom duration, description, and settings.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
