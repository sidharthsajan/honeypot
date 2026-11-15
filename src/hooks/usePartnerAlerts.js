import { useEffect, useRef, useState } from 'react'
import { deliveryReady, sendPartnerAlert } from '../lib/notify'

// Anti-spam rules (all in ONE place so they're easy to tune):
const CONFIRM_MS = 3000      // user + honeypot must be together this long before an incident opens
const BREAK_MS = 4000        // a gap shorter than this doesn't reset the confirmation timer
const GRACE_MS = 90_000      // incident stays OPEN this long after they were last seen together,
                             //   so looking away / leaving the frame / a missed detection is the SAME incident
const LAST_SENT_KEY = 'hp.lastSent'

const readLastSent = () => { try { return Number(localStorage.getItem(LAST_SENT_KEY)) || 0 } catch { return 0 } }

// Watches `together` (the user and an unrecognised high-MOG face are on screen at once) and
// sends AT MOST one message per incident, and never more often than the cooldown.
export function usePartnerAlerts({ together, alerts, message, onEvent }) {
  const [status, setStatus] = useState({ phase: 'idle', lastSentAt: readLastSent() }) // idle | confirming | open
  const live = useRef({})
  live.current = { together, alerts, message, onEvent }
  const m = useRef({ since: null, lastTogether: 0, open: false, sending: false })

  useEffect(() => {
    const id = setInterval(async () => {
      const { together: now_together, alerts: a, message: msg, onEvent: emit } = live.current
      const s = m.current
      const now = Date.now()

      if (!a.enabled) { s.since = null; if (s.open) { s.open = false; setStatus((p) => ({ ...p, phase: 'idle' })) } return }

      if (now_together) {
        s.lastTogether = now
        if (!s.since) { s.since = now; setStatus((p) => (p.phase === 'open' ? p : { ...p, phase: 'confirming' })) }
        if (!s.open && now - s.since >= CONFIRM_MS) {
          s.open = true
          const cooldownMs = Math.max(1, a.cooldownMin || 10) * 60_000
          const lastSent = readLastSent()
          if (now - lastSent < cooldownMs) {
            emit(`Incident opened — message held back (cooldown, ${Math.ceil((cooldownMs - (now - lastSent)) / 60000)} min left)`, 'unknown')
            setStatus((p) => ({ ...p, phase: 'open' }))
          } else if (!deliveryReady(a).any) {
            emit('Incident opened — no partner Discord ID set in Settings', 'unknown')
            setStatus((p) => ({ ...p, phase: 'open' }))
          } else if (!s.sending) {
            s.sending = true
            setStatus((p) => ({ ...p, phase: 'open' }))
            try {
              await sendPartnerAlert(a, msg)
              try { localStorage.setItem(LAST_SENT_KEY, String(now)) } catch { /* ignore */ }
              setStatus({ phase: 'open', lastSentAt: now })
              emit('Message sent to partner', 'alert')
            } catch (e) {
              emit(`Message FAILED: ${e.message}`, 'alert')
            } finally {
              s.sending = false
            }
          }
        }
      } else {
        if (s.since && !s.open && now - s.lastTogether > BREAK_MS) {
          s.since = null
          setStatus((p) => ({ ...p, phase: 'idle' }))
        }
        if (s.open && now - s.lastTogether > GRACE_MS) {
          s.open = false
          s.since = null
          emit('Incident closed (not together for 90s)', 'trusted')
          setStatus((p) => ({ ...p, phase: 'idle' }))
        }
      }
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const resetCooldown = () => {
    try { localStorage.removeItem(LAST_SENT_KEY) } catch { /* ignore */ }
    m.current.open = false // let a current togetherness open a fresh incident right away
    m.current.since = null
    setStatus((p) => ({ ...p, lastSentAt: 0 }))
  }

  return { ...status, resetCooldown }
}
