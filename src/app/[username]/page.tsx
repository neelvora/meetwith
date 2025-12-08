import { notFound } from 'next/navigation'
import { Calendar, Clock, Video, Globe } from 'lucide-react'
import { Card, CardContent, Button } from '@/components/ui'

// This would come from database in production
const mockEventTypes = [
  {
    id: '1',
    slug: '30min',
    name: '30 Minute Meeting',
    description: 'A quick chat to discuss your project or answer questions.',
    duration: 30,
    color: 'violet',
  },
  {
    id: '2', 
    slug: '60min',
    name: '60 Minute Consultation',
    description: 'In-depth discussion for complex projects or strategy sessions.',
    duration: 60,
    color: 'blue',
  },
]

const mockUser = {
  name: 'Neel Vora',
  username: 'neelbvora',
  image: null,
  welcomeMessage: 'Welcome! Please select a meeting type below to schedule a time with me.',
}

interface BookingPageProps {
  params: Promise<{ username: string }>
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { username } = await params
  
  // In production, fetch user and their event types from database
  if (username !== 'neelbvora') {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Profile Header */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white">
            {mockUser.name.charAt(0)}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{mockUser.name}</h1>
          <p className="text-gray-400 max-w-md mx-auto">{mockUser.welcomeMessage}</p>
        </div>

        {/* Event Types */}
        <div className="space-y-4">
          {mockEventTypes.map((eventType) => (
            <Card key={eventType.id} variant="glass" className="hover:border-white/20 transition-all cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`w-2 h-full min-h-[60px] rounded-full bg-${eventType.color}-500`} />
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-white group-hover:text-violet-400 transition-colors">
                      {eventType.name}
                    </h2>
                    <p className="text-gray-400 text-sm mt-1 mb-3">{eventType.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {eventType.duration} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Video className="w-4 h-4" />
                        Google Meet
                      </span>
                    </div>
                  </div>
                  <Button variant="secondary" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    Book
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p className="flex items-center justify-center gap-2">
            <Globe className="w-4 h-4" />
            America/Chicago
          </p>
          <p className="mt-4">
            Powered by{' '}
            <a href="https://meetwith.dev" className="text-violet-400 hover:text-violet-300">
              MeetWith
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
