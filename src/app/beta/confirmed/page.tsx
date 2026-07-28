import Link from 'next/link'
import { Check, AlertCircle, Clock } from 'lucide-react'

type State = 'confirmed' | 'already' | 'expired' | 'invalid' | 'error'

const MESSAGES: Record<
  State,
  { icon: 'check' | 'clock' | 'alert'; tone: 'good' | 'warn'; title: string; body: string }
> = {
  confirmed: {
    icon: 'check',
    tone: 'good',
    title: "You're on the list!",
    body: "Thanks for confirming. I'll review your request and add you to the beta shortly. Check your email for a note from me.",
  },
  already: {
    icon: 'check',
    tone: 'good',
    title: 'Already confirmed',
    body: "This request was confirmed already, so you're all set. Nothing else to do.",
  },
  expired: {
    icon: 'clock',
    tone: 'warn',
    title: 'That link expired',
    body: 'Confirmation links are good for 48 hours. Request access again and I will send a fresh one.',
  },
  invalid: {
    icon: 'alert',
    tone: 'warn',
    title: 'That link is not valid',
    body: 'It may have been copied incompletely. Request access again and I will send a new link.',
  },
  error: {
    icon: 'alert',
    tone: 'warn',
    title: 'Something went wrong',
    body: 'I could not confirm the request just now. Please try the link again in a few minutes.',
  },
}

export default async function BetaConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>
}) {
  const { state } = await searchParams
  const key: State =
    state && state in MESSAGES ? (state as State) : 'error'
  const message = MESSAGES[key]

  const good = message.tone === 'good'
  const Icon =
    message.icon === 'check' ? Check : message.icon === 'clock' ? Clock : AlertCircle

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6 ${
            good ? 'bg-green-500/20' : 'bg-amber-500/20'
          }`}
        >
          <Icon
            className={`w-7 h-7 ${good ? 'text-green-400' : 'text-amber-400'}`}
          />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
          {message.title}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">{message.body}</p>
        <Link
          href="/"
          className="text-violet-600 dark:text-violet-400 hover:underline"
        >
          Back to MeetWith
        </Link>
      </div>
    </main>
  )
}
