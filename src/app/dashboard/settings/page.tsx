import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { User, Bell, Shield, Palette, Globe } from 'lucide-react'
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Input } from '@/components/ui'

export default async function SettingsPage() {
  const session = await auth()
  
  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">
          Manage your account preferences and profile settings.
        </p>
      </div>

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
          <div className="flex items-center gap-4">
            {session.user?.image ? (
              <img 
                src={session.user.image} 
                alt={session.user.name || 'Profile'} 
                className="w-20 h-20 rounded-full border-2 border-white/20"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
                {session.user?.name?.[0] || 'U'}
              </div>
            )}
            <Button variant="secondary" size="sm">Change Photo</Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input 
              label="Name" 
              defaultValue={session.user?.name || ''} 
              placeholder="Your name"
            />
            <Input 
              label="Username" 
              defaultValue={session.user?.email?.split('@')[0] || ''} 
              placeholder="username"
            />
          </div>

          <Input 
            label="Email" 
            defaultValue={session.user?.email || ''} 
            disabled
            className="opacity-60"
          />

          <div className="flex justify-end">
            <Button>Save Changes</Button>
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
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Brand Color
            </label>
            <div className="flex gap-3">
              {['violet', 'blue', 'emerald', 'orange', 'pink'].map((color) => (
                <button
                  key={color}
                  className={`w-10 h-10 rounded-lg bg-${color}-500 ring-2 ring-offset-2 ring-offset-gray-900 ${
                    color === 'violet' ? 'ring-white' : 'ring-transparent'
                  } hover:ring-white/50 transition-all`}
                  style={{
                    backgroundColor: color === 'violet' ? '#8b5cf6' :
                                    color === 'blue' ? '#3b82f6' :
                                    color === 'emerald' ? '#10b981' :
                                    color === 'orange' ? '#f97316' :
                                    '#ec4899'
                  }}
                />
              ))}
            </div>
          </div>

          <Input 
            label="Welcome Message" 
            defaultValue="Welcome! Please select a time that works for you." 
            placeholder="Custom welcome message"
          />

          <div className="flex justify-end">
            <Button>Save Changes</Button>
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
            { label: 'Email confirmations', description: 'Get notified when someone books with you', checked: true },
            { label: 'Reminders', description: 'Receive reminder emails before meetings', checked: true },
            { label: 'Cancellations', description: 'Get notified when bookings are cancelled', checked: true },
            { label: 'Marketing emails', description: 'Product updates and tips', checked: false },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div>
                <p className="font-medium text-white">{item.label}</p>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
              <button 
                className={`w-12 h-7 rounded-full transition-all ${
                  item.checked ? 'bg-violet-500' : 'bg-gray-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-lg transition-transform ${
                  item.checked ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card variant="glass" className="border-red-500/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-red-400" />
            <div>
              <CardTitle className="text-red-400">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/5 border border-red-500/20">
            <div>
              <p className="font-medium text-white">Delete Account</p>
              <p className="text-sm text-gray-500">Permanently delete your account and all data</p>
            </div>
            <Button variant="danger" size="sm">Delete</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
