'use client'

import { useEffect, useRef } from 'react'

interface TurnstileRenderOptions {
  sitekey: string
  action: string
  callback: (token: string) => void
  'expired-callback': () => void
  'error-callback': () => void
  theme: 'auto'
  appearance: 'interaction-only'
}

interface TurnstileApi {
  render: (element: HTMLElement, options: TurnstileRenderOptions) => string
  reset: (widgetId?: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

/**
 * Site keys are public: they are visible in the served HTML by design, so this
 * is not a secret. The env var is an optional override for using a Cloudflare
 * test key locally. The secret half lives only in TURNSTILE_SECRET, server-side.
 */
export const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAEASlXPFIMGU6Dvt'

/** Analytics attribution marker required by the Turnstile Spin integration. */
export const TURNSTILE_ACTION = 'turnstile-spin-v2'

export interface TurnstileHandle {
  /**
   * Tokens are single use. Once siteverify redeems one, the copy held in the
   * page is spent, and resubmitting it returns timeout-or-duplicate. Call this
   * before letting someone retry a rejected submit.
   */
  reset: () => void
}

export function TurnstileWidget({
  onVerify,
  handleRef,
  className,
}: {
  onVerify: (token: string) => void
  handleRef?: React.RefObject<TurnstileHandle | null>
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onVerifyRef = useRef(onVerify)

  useEffect(() => {
    onVerifyRef.current = onVerify
  }, [onVerify])

  useEffect(() => {
    if (!handleRef) return
    handleRef.current = {
      reset: () => {
        if (widgetIdRef.current !== null && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current)
          onVerifyRef.current('')
        }
      },
    }
    return () => {
      handleRef.current = null
    }
  }, [handleRef])

  useEffect(() => {
    if (!containerRef.current) return

    let cancelled = false

    const render = () => {
      if (cancelled || !window.turnstile || !containerRef.current) return
      if (widgetIdRef.current !== null) return

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        action: TURNSTILE_ACTION,
        callback: (token) => onVerifyRef.current(token),
        'expired-callback': () => onVerifyRef.current(''),
        'error-callback': () => onVerifyRef.current(''),
        theme: 'auto',
        appearance: 'interaction-only',
      })
    }

    if (window.turnstile) {
      render()
    } else {
      let script = document.querySelector<HTMLScriptElement>(
        `script[src="${SCRIPT_SRC}"]`
      )
      if (!script) {
        script = document.createElement('script')
        script.src = SCRIPT_SRC
        script.async = true
        script.defer = true
        document.head.appendChild(script)
      }
      script.addEventListener('load', render)
    }

    return () => {
      cancelled = true
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`cf-turnstile ${className ?? 'flex justify-center'}`}
      data-sitekey={TURNSTILE_SITE_KEY}
      data-action={TURNSTILE_ACTION}
    />
  )
}
