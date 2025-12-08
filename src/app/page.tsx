import Link from 'next/link'
import { Calendar, Sparkles, Shield, Zap, Clock, Users } from 'lucide-react'
import { Button } from '@/components/ui'

const features = [
  {
    icon: Calendar,
    title: 'Multi-Calendar Sync',
    description: 'Connect Google Calendar, iCloud, Outlook and more. See all your availability in one place.',
  },
  {
    icon: Sparkles,
    title: 'AI Smart Scheduling',
    description: 'AI learns your preferences and suggests optimal meeting times. No more back-and-forth.',
  },
  {
    icon: Shield,
    title: 'Privacy First',
    description: 'Self-hostable and open source. Your calendar data stays yours, always.',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Built with Next.js 15 and edge functions. Instant availability checks.',
  },
  {
    icon: Clock,
    title: 'Smart Availability',
    description: 'Set complex rules: buffer times, working hours, meeting limits per day.',
  },
  {
    icon: Users,
    title: 'Team Ready',
    description: 'Round-robin assignments, collective availability, and team booking pages.',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-transparent to-purple-500/10" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 sm:py-40">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="text-sm text-gray-300">Open Source & AI-Powered</span>
            </div>

            {/* Heading */}
            <h1 className="text-5xl sm:text-7xl font-bold mb-6">
              <span className="text-white">Schedule meetings</span>
              <br />
              <span className="gradient-text">without the hassle</span>
            </h1>

            {/* Subheading */}
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
              MeetWith is an open source, AI-powered scheduling platform. 
              Connect your calendars, set your availability, and let others book time with you.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/signin">
                <Button size="lg" className="w-full sm:w-auto">
                  Get Started Free
                </Button>
              </Link>
              <Link href="https://github.com/neelvora/meetwith" target="_blank">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  View on GitHub
                </Button>
              </Link>
            </div>

            {/* Social proof */}
            <p className="mt-8 text-sm text-gray-500">
              No credit card required • Free forever for individuals
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything you need to manage your time
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              A modern scheduling platform with features that actually matter.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-violet-500/50 transition-all duration-300 hover:bg-white/[0.07]"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-violet-500/10 to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to take control of your schedule?
          </h2>
          <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
            Join thousands of professionals who use MeetWith to save hours every week on scheduling.
          </p>
          <Link href="/auth/signin">
            <Button size="lg">
              Start Scheduling Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-white">MeetWith</span>
            </div>
            <p className="text-sm text-gray-500">
              Built by{' '}
              <a href="https://neelvora.com" className="text-violet-400 hover:underline" target="_blank">
                Neel Vora
              </a>
              {' '}• Open Source on{' '}
              <a href="https://github.com/neelvora/meetwith" className="text-violet-400 hover:underline" target="_blank">
                GitHub
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
