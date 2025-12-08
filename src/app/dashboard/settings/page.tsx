import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <SettingsClient 
      initialProfile={{
        name: session.user?.name || '',
        email: session.user?.email || '',
        image: session.user?.image || undefined,
      }}
    />
  )
}
