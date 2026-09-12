import Link from 'next/link'
import { Calendar, Shield, Clock, Users, ArrowRight, Check, Globe, Video, Mail } from 'lucide-react'
import { Button } from '@/components/ui'
import { BetaSignupForm } from '@/components/BetaSignupForm'

const features = [
  {
    icon: Calendar,
    title: 'Google Calendar',
    description: 'Sign in with Google and pick which calendars to check. MeetWith reads busy times from them, so a slot disappears when something else is already on it.',
  },
  {
    icon: Globe,
    title: 'Your booking page',
    description: 'Your page is meetwith.dev/yourname. It lists your event types and open times, and visitors see those times in their own timezone.',
  },
  {
    icon: Clock,
    title: 'Availability rules',
    description: 'Set the hours you are free on each day of the week, buffers before and after meetings, how much notice you need, how far out people can book, and a cap on bookings per day.',
  },
  {
    icon: Mail,
    title: 'Emails',
    description: 'Confirmations go to you and the attendee as soon as a booking is made, and a reminder follows in the 24 hours before the meeting. Cancelling from your dashboard emails the attendee and removes the event from your calendar.',
  },
  {
    icon: Video,
    title: 'Google Meet links',
    description: 'Every booking gets a Google Meet link. It goes on the calendar event and into both confirmation emails.',
  },
  {
    icon: Users,
    title: 'Not built yet',
    description: 'Team scheduling, paid bookings, and Outlook or iCloud calendars are not finished. Google is the only calendar MeetWith connects to right now.',
  },
]

const steps = [
  {
    icon: Calendar,
    title: 'Connect your calendar',
    description: 'Sign in with Google and pick the calendars to check. MeetWith reads busy times from them and writes your bookings back.',
  },
  {
    icon: Clock,
    title: 'Set your availability',
    description: 'Pick your hours for each day of the week, plus buffers between meetings, minimum notice, and a daily cap.',
  },
  {
    icon: Globe,
    title: 'Share your link',
    description: 'Your page is meetwith.dev/yourname. Anyone with the link can book without making an account.',
  },
  {
    icon: Video,
    title: 'Take the booking',
    description: 'The visitor picks a time and leaves their name and email. The meeting lands on your calendar with a Google Meet link.',
  },
]

const freeTier = [
  'Unlimited event types',
  'One Google Calendar account',
  'Availability rules',
  'Email confirmations',
  'Cancellation and reschedule links',
  'Around 50 bookings a month',
]

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 dark:from-violet-500/20 via-transparent to-purple-500/5 dark:to-purple-500/10" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 dark:bg-violet-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-600/5 dark:bg-violet-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 mb-8 backdrop-blur-sm">
              <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
              <span className="text-sm text-gray-600 dark:text-gray-300">Private beta • Access by request</span>
            </div>

            {/* Heading */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold mb-6 tracking-tight font-display">
              <span className="text-gray-900 dark:text-white">Let people book time</span>
              <br />
              <span className="gradient-text">on your calendar</span>
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              MeetWith is a scheduling app I built and run. You connect a Google Calendar,
              set the hours you are free, and share a link like meetwith.dev/yourname.
              It is in private beta, so access goes out by request.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="#beta">
                <Button size="lg" className="w-full sm:w-auto group">
                  Request beta access
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/auth/signin" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  Sign in
                </Button>
              </Link>
            </div>

            {/* Facts */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-gray-500 dark:text-gray-500">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-violet-400" />
                <span>Access by request</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-violet-400" />
                <span>Google Calendar only</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                <span>Free during the beta</span>
              </div>
            </div>
          </div>

          {/* Demo preview mockup */}
          <div className="mt-16 sm:mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-950 via-transparent to-transparent z-10 pointer-events-none" />
            <div className="relative mx-auto max-w-4xl">
              <div className="rounded-xl sm:rounded-2xl border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-2xl overflow-hidden">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-gray-900/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="px-3 py-1 rounded-md bg-gray-100 dark:bg-white/5 text-xs text-gray-500 dark:text-gray-400">
                      meetwith.dev/neel
                    </div>
                  </div>
                </div>
                {/* Mockup content */}
                <div className="p-4 sm:p-6 lg:p-8">
                  <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
                    {/* Calendar */}
                    <div className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">January 2025</span>
                        <div className="flex gap-1">
                          <div className="w-6 h-6 rounded bg-gray-200 dark:bg-white/10" />
                          <div className="w-6 h-6 rounded bg-gray-200 dark:bg-white/10" />
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
                                ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 cursor-pointer'
                                : 'text-gray-400 dark:text-gray-600'
                            }`}
                          >
                            {i + 1}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Time slots */}
                    <div className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 sm:p-6">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-4">Available Times</p>
                      <div className="space-y-2">
                        {['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM'].map((time, i) => (
                          <div
                            key={time}
                            className={`px-4 py-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                              i === 1
                                ? 'bg-violet-500 text-white'
                                : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
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
              <span className="text-xs font-medium text-violet-500 dark:text-violet-400">HOW IT WORKS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4 font-display">
              Four steps
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              You do the first three once. The fourth happens every time someone books.
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
                  <div className="relative bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 hover:border-violet-500/50 transition-colors">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
                        <Icon className="w-6 h-6 text-violet-500 dark:text-violet-400" />
                      </div>
                      <span className="text-5xl font-bold text-gray-200 dark:text-white/10">{index + 1}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 mb-4">
              <span className="text-xs font-medium text-violet-500 dark:text-violet-400">FEATURES</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4 font-display">
              What MeetWith does
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Everything here works in the beta today. What does not is in the last card.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="group p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-violet-500/50 transition-all duration-300 hover:bg-gray-50 dark:hover:bg-white/[0.07]"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
                <span className="text-xs font-medium text-green-500 dark:text-green-400">PRICING</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6 font-display">
                Free during the beta
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                There is no billing in the app today. When paid plans do arrive, the plan is
                to charge for usage, like extra calendar accounts and higher booking volume,
                and to keep core scheduling on the free tier.
              </p>
              <Link href="#beta">
                <Button size="lg" className="group">
                  Request beta access
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                What the free tier is meant to cover
              </p>
              <div className="grid grid-cols-2 gap-4">
                {freeTier.map((item) => (
                  <div key={item} className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-green-500 dark:text-green-400" />
                    </div>
                    <span className="text-sm text-gray-900 dark:text-white">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA / Beta Signup */}
      <section id="beta" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-violet-500/10 dark:from-violet-500/20 via-violet-500/5 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/10 dark:bg-violet-500/20 rounded-full blur-3xl" />

        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
            <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
            <span className="text-sm text-violet-600 dark:text-violet-300">Private Beta</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6 font-display">
            Request access
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-10 max-w-xl mx-auto">
            MeetWith is in private beta. I add each tester to the Google sign-in list by
            hand, so access starts with a request.
          </p>

          {/* Beta Signup Form */}
          <div className="max-w-lg mx-auto">
            <BetaSignupForm />
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-white/10">
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
      <footer className="py-12 border-t border-gray-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-white font-display">MeetWith</span>
            </div>
            <p className="text-sm text-gray-500">
              Built by{' '}
              <a href="https://neelvora.com" className="text-violet-500 dark:text-violet-400 hover:underline" target="_blank">
                Neel Vora
              </a>
              {' '}•{' '}
              <a href="https://github.com/neelvora/meetwith" className="text-violet-500 dark:text-violet-400 hover:underline" target="_blank">
                View on GitHub
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
