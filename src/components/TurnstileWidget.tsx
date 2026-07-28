'use client'

import { useEffect, useRef } from 'react'

interface TurnstileApi {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string
      callback: (token: string) => void
      'expired-callback': () => void
      'error-callback': () => void
      theme: 'auto'
      appearance: 'interaction-only'
    }
  ) => string
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
 * Renders nothing when no site key is configured, so the form still works on a
 * deployment that has not been given Cloudflare keys yet.
 *
 * appearance is interaction-only: most visitors never see a challenge, and the
 * widget only becomes visible when Cloudflare wants a human check.
 */
export function TurnstileWidget({
  onVerify,
}: {
  onVerify: (token: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onVerifyRef = useRef(onVerify)

  useEffect(() => {
    onVerifyRef.current = onVerify
  }, [onVerify])

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  useEffect(() => {
    if (!siteKey || !containerRef.current) return

    let cancelled = false

    const render = () => {
      if (cancelled || !window.turnstile || !containerRef.current) return
      if (widgetIdRef.current !== null) return

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
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
  }, [siteKey])

  if (!siteKey) return null

  return <div ref={containerRef} className="flex justify-center" />
}
