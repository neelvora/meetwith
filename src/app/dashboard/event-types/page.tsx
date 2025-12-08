import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import EventTypesClient from './EventTypesClient'

export default async function EventTypesPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  const username = session.user?.email?.split('@')[0] || 'you'

  return <EventTypesClient username={username} />
}
