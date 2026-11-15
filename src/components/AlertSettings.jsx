import { useState } from 'react'
import { deliveryReady, sendPartnerAlert } from '../lib/notify'

export default function AlertSettings({ alerts, onChange, lastSentAt, onResetCooldown }) {
  const [testMsg, setTestMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const ready = deliveryReady(alerts)
  const set = (k) => (e) => onChange({ ...alerts, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const cooldownMs = alerts.cooldownMin * 60_000
  const leftMin = lastSentAt ? Math.ceil((cooldownMs - (Date.now() - lastSentAt)) / 60_000) : 0

  const test = async () => {
    setBusy(true); setTestMsg(null)
    try {
      await sendPartnerAlert(alerts, 'Test message from Honeypot.exe. Alerts are set up correctly.')
      setTestMsg({ ok: true, text: 'Sent! Check your partner’s Discord DMs.' })
    } catch (e) {
      setTestMsg({ ok: false, text: e.message })
    } finally { setBusy(false) }
  }

  return (
    <div className="slot">
      <div className="mono tiny dim">PARTNER ALERTS (DISCORD)</div>
      <p className="note">
        When you and a honeypot are on screen together, your partner gets ONE Discord DM per incident.
        Only text is sent, never video.
      </p>
      <label className="check">
        <input type="checkbox" checked={alerts.enabled} onChange={set('enabled')} />
        <span>Send alerts to my partner (they agreed to receive them)</span>
      </label>
      <label className="field"><span className="mono tiny dim">PARTNER DISCORD USER ID</span>
        <input value={alerts.discordId || ''} onChange={set('discordId')} placeholder="e.g. 123456789012345678" inputMode="numeric" />
        <span className="note">Discord → Settings → Advanced → Developer Mode, then right-click your partner → Copy User ID. They must share a server with the bot and allow DMs.</span>
      </label>

      <label className="field"><span className="mono tiny dim">MIN MINUTES BETWEEN MESSAGES: {alerts.cooldownMin}</span>
        <input type="range" min="1" max="60" step="1" value={alerts.cooldownMin} onChange={(e) => onChange({ ...alerts, cooldownMin: +e.target.value })} />
      </label>

      <div className="row" style={{ marginTop: 0 }}>
        <span className="mono tiny dim">
          {leftMin > 0 ? `COOLDOWN ACTIVE: ~${leftMin} MIN LEFT` : 'NO COOLDOWN ACTIVE'}
        </span>
        <button className="btn" disabled={!lastSentAt} onClick={onResetCooldown}>RESET COOLDOWN</button>
      </div>

      <button className="btn" disabled={busy || !ready.any} onClick={test}>{busy ? 'SENDING…' : 'SEND TEST MESSAGE'}</button>
      {!ready.any && <p className="note">Enter your partner’s Discord user ID to enable sending.</p>}
      {testMsg && <p className={testMsg.ok ? 'note' : 'error mono'}>{testMsg.text}</p>}
    </div>
  )
}
