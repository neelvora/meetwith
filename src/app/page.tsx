import Link from 'next/link'
import { Calendar, Sparkles, Shield, Zap, Clock, Users, ArrowRight, Check, Play, Globe, Video, Mail } from 'lucide-react'
import { Button } from '@/components/ui'
import { BetaSignupForm } from '@/components/BetaSignupForm'

const features = [
  {
    icon: Calendar,
    title: 'Google Calendar Sync',
    description: 'Connect your Google Calendar in seconds. We check for conflicts so you never double-book.',
  },
  {
    icon: Sparkles,
    title: 'AI Smart Scheduling',
    description: 'AI learns your preferences and suggests optimal meeting times. No more back-and-forth.',
  },
  {
    icon: Shield,
    title: 'Privacy First',
    description: 'Your data stays private and secure. We never share or sell your information.',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Instant availability checks. No waiting, no lag—just fast scheduling.',
  },
  {
    icon: Clock,
    title: 'Smart Availability',
    description: 'Set complex rules: buffer times, working hours, meeting limits per day.',
  },
  {
    icon: Users,
    title: 'Team Features',
    description: 'Coming soon: Round-robin assignments, collective availability, and team booking pages.',
  },
]

const steps = [
  {
    icon: Calendar,
    title: 'Connect Your Calendar',
    description: 'Link your Google Calendar in seconds. We only check for conflicts.',
  },
  {
    icon: Clock,
    title: 'Set Your Availability',
    description: 'Define when you\'re free. Buffer times, daily limits, minimum notice.',
  },
  {
    icon: Globe,
    title: 'Share Your Link',
    description: 'Send your personal booking link. meetwith.dev/yourname',
  },
  {
    icon: Video,
    title: 'Meet & Connect',
    description: 'Google Meet links auto-generated. Calendar invites sent automatically.',
  },
]

const benefits = [
  'Unlimited booking links',
  'Automatic Google Meet links',
  'Email notifications',
  'Timezone detection',
  'Works on any device',
  'Custom availability',
  'Calendar sync',
  'No credit card required',
]

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-transparent to-purple-500/10" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-600/10 rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm text-gray-300">Now Live • 100% Free</span>
            </div>

            {/* Heading */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
              <span className="text-white">Schedule meetings</span>
              <br />
              <span className="gradient-text">in seconds, not hours</span>
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              The free scheduling platform that respects your privacy. 
              Connect your calendar, set your availability, share your link.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="#beta">
                <Button size="lg" className="w-full sm:w-auto group">
                  Request Beta Access
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="#demo" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  <Play className="w-4 h-4 mr-2" />
                  See How It Works
                </Button>
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span>Privacy-first</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span>Lightning fast</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span>Free forever</span>
              </div>
            </div>
          </div>

          {/* Demo preview mockup */}
          <div className="mt-16 sm:mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent z-10 pointer-events-none" />
            <div className="relative mx-auto max-w-4xl">
              <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-gray-900/80 backdrop-blur-xl shadow-2xl overflow-hidden">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-gray-900/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="px-3 py-1 rounded-md bg-white/5 text-xs text-gray-400">
                      meetwith.dev/neel
                    </div>
                  </div>
                </div>
                {/* Mockup content */}
                <div className="p-4 sm:p-6 lg:p-8">
                  <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
                    {/* Calendar */}
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-white">January 2025</span>
                        <div className="flex gap-1">
                          <div className="w-6 h-6 rounded bg-white/10" />
                          <div className="w-6 h-6 rounded bg-white/10" />
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-xs text-center mb-2 text-gray-500">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                          <div key={i}>{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: 31 }, (_, i) => (
                          <div
                            key={i}
                            className={`aspect-square rounded flex items-center justify-center text-xs ${
                              i === 14
                                ? 'bg-violet-500 text-white'
                                : i > 14 && i < 20
                                ? 'bg-white/10 text-white hover:bg-white/20 cursor-pointer'
                                : 'text-gray-600'
                            }`}
                          >
                            {i + 1}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Time slots */}
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4 sm:p-6">
                      <p className="text-sm font-medium text-white mb-4">Available Times</p>
                      <div className="space-y-2">
                        {['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM'].map((time, i) => (
                          <div
                            key={time}
                            className={`px-4 py-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                              i === 1
                                ? 'bg-violet-500 text-white'
                                : 'bg-white/5 text-gray-300 hover:bg-white/10'
                            }`}
                          >
                            {time}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="demo" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 mb-4">
              <span className="text-xs font-medium text-violet-400">HOW IT WORKS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Scheduling in 4 simple steps
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Get up and running in under 2 minutes. No complex setup required.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <div key={step.title} className="relative">
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-violet-500/50 to-transparent z-0" />
                  )}
                  <div className="relative bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-violet-500/50 transition-colors">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
                        <Icon className="w-6 h-6 text-violet-400" />
                      </div>
                      <span className="text-5xl font-bold text-white/10">{index + 1}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 mb-4">
              <span className="text-xs font-medium text-violet-400">FEATURES</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Everything you need
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

      {/* Benefits List */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
                <span className="text-xs font-medium text-green-400">FREE FOREVER</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                All features included, no hidden costs
              </h2>
              <p className="text-lg text-gray-400 mb-8">
                We believe scheduling should be free. MeetWith includes everything you need without any premium tiers or feature gates.
              </p>
              <Link href="/auth/signin">
                <Button size="lg" className="group">
                  Start Scheduling
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  </div>
                  <span className="text-sm text-white">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA / Beta Signup */}
      <section id="beta" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-violet-500/20 via-violet-500/5 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
            <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
            <span className="text-sm text-violet-300">Private Beta</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to simplify your scheduling?
          </h2>
          <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto">
            We&apos;re currently in private beta. Request access and I&apos;ll add you to the testers list.
          </p>
          
          {/* Beta Signup Form */}
          <div className="max-w-lg mx-auto">
            <BetaSignupForm />
          </div>

          <div className="mt-8 pt-8 border-t border-white/10">
            <p className="text-sm text-gray-500 mb-4">Already have access?</p>
            <Link href="/auth/signin">
              <Button variant="secondary" size="lg" className="group">
                Sign In
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
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
              {' '}•{' '}
              <a href="https://github.com/neelvora/meetwith" className="text-violet-400 hover:underline" target="_blank">
                View on GitHub
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
