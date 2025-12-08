import { notFound } from 'next/navigation'
import BookingClient from './BookingClient'

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
    <BookingClient
      username={username}
      user={mockUser}
      eventTypes={mockEventTypes}
    />
  )
}
