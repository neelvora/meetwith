'use client'

import Link from 'next/link'
import { Check, ChevronRight, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui'
import type { SetupStatus } from '@/lib/setup-status'

interface SetupChecklistProps {
  status: SetupStatus
  dismissible?: boolean
  onDismiss?: () => void
}

export function SetupChecklist({ status, dismissible, onDismiss }: SetupChecklistProps) {
  if (status.isComplete) {
    return null
  }

  const progress = (status.completedSteps / status.totalSteps) * 100
  const nextStep = status.steps.find(s => !s.completed)

  return (
    <Card className="bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent border-violet-500/20 mb-8 overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Complete your setup</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {status.completedSteps} of {status.totalSteps} steps complete
                </p>
              </div>
            </div>
            {dismissible && onDismiss && (
              <button
                onClick={onDismiss}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm"
              >
                Dismiss
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="border-t border-gray-200 dark:border-white/10">
          {status.steps.map((step, index) => (
            <Link
              key={step.id}
              href={step.href}
              className={`flex items-center gap-4 px-6 py-4 transition-colors ${
                step.completed 
                  ? 'bg-gray-50 dark:bg-white/5 opacity-60' 
                  : step === nextStep
                    ? 'bg-violet-500/10 hover:bg-violet-500/15'
                    : 'hover:bg-gray-50 dark:hover:bg-white/5'
              } ${index !== status.steps.length - 1 ? 'border-b border-gray-100 dark:border-white/5' : ''}`}
            >
              {/* Checkbox */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                step.completed
                  ? 'bg-green-500'
                  : step === nextStep
                    ? 'bg-violet-500'
                    : 'bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/20'
              }`}>
                {step.completed ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <span className="text-xs font-medium text-gray-600 dark:text-white">
                    {index + 1}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${step.completed ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                  {step.title}
                </p>
                <p className="text-sm text-gray-500 truncate">{step.description}</p>
              </div>

              {/* Arrow */}
              {!step.completed && (
                <ChevronRight className={`w-5 h-5 ${
                  step === nextStep ? 'text-violet-500 dark:text-violet-400' : 'text-gray-400 dark:text-gray-600'
                }`} />
              )}
            </Link>
          ))}
        </div>

        {/* CTA for next step */}
        {nextStep && (
          <div className="p-4 bg-violet-500/10 border-t border-violet-500/20">
            <Link
              href={nextStep.href}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-violet-500 hover:bg-violet-600 text-white font-medium transition-colors"
            >
              Continue: {nextStep.title}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Compact version for sidebar or smaller spaces
export function SetupProgress({ status }: { status: SetupStatus }) {
  if (status.isComplete) {
    return null
  }

  const progress = (status.completedSteps / status.totalSteps) * 100
  const nextStep = status.steps.find(s => !s.completed)

  return (
    <Link href={nextStep?.href || '/dashboard'}>
      <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/20 hover:border-violet-500/30 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white">Setup Progress</span>
          <span className="text-xs text-violet-400">{status.completedSteps}/{status.totalSteps}</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-violet-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        {nextStep && (
          <p className="text-xs text-gray-400">
            Next: {nextStep.title}
          </p>
        )}
      </div>
    </Link>
  )
}
