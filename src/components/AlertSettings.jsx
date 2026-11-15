import { useState } from 'react'
import { deliveryReady, sendPartnerAlert } from '../lib/notify'

export default function AlertSettings({ alerts, onChange }) {
  const [testMsg, setTestMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const ready = deliveryReady(alerts)
  const set = (k) => (e) => onChange({ ...alerts, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const test = async () => {
    setBusy(true); setTestMsg(null)
    try {
      const via = await sendPartnerAlert(alerts, 'Test message from Honeypot.exe. Alerts are set up correctly.')
      setTestMsg({ ok: true, text: `Sent via ${via.join(' + ')}.` })
    } catch (e) {
      setTestMsg({ ok: false, text: e.message })
    } finally { setBusy(false) }
  }

  return (
    <div className="slot">
      <div className="mono tiny dim">PARTNER ALERTS</div>
      <p className="note">
        When you and an unrecognised high-MOG face are on screen together, your partner gets ONE text per incident.
        Only text is sent, never video.
      </p>
      <label className="check">
        <input type="checkbox" checked={alerts.enabled} onChange={set('enabled')} />
        <span>Send alerts to my partner (they agreed to receive them)</span>
      </label>
      <label className="check">
        <input type="checkbox" checked={!!alerts.discordBot} onChange={set('discordBot')} />
        <span>Send via Discord bot DM (works on the deployed site; needs the bot set up in Vercel)</span>
      </label>
      {alerts.discordBot && (
        <label className="field"><span className="mono tiny dim">PARTNER DISCORD USER ID</span>
          <input value={alerts.discordId || ''} onChange={set('discordId')} placeholder="e.g. 123456789012345678" inputMode="numeric" />
          <span className="note">Discord → Settings → Advanced → Developer Mode, then right-click your partner → Copy User ID. They must share a server with the bot and allow DMs.</span>
        </label>
      )}
      <label className="field"><span className="mono tiny dim">PARTNER EMAIL</span>
        <input type="email" value={alerts.email} onChange={set('email')} placeholder="partner@example.com" />
      </label>
      <label className="field"><span className="mono tiny dim">PARTNER PHONE</span>
        <input type="tel" value={alerts.phone} onChange={set('phone')} placeholder="+1 555 123 4567" />
      </label>

      <details>
        <summary className="mono tiny dim">DELIVERY SETUP (REQUIRED TO ACTUALLY SEND)</summary>
        <p className="note" style={{ margin: '8px 0' }}>
          Email: create a free EmailJS account, add a template that uses <code>{'{{to_email}}'}</code> and <code>{'{{message}}'}</code>, then paste the three IDs.
          SMS: browsers can't text directly, so paste a webhook URL (Zapier, Make, IFTTT…) that forwards <code>phone</code> + <code>message</code> to an SMS step.
        </p>
        <div className="stack">
          <input value={alerts.serviceId} onChange={set('serviceId')} placeholder="EmailJS service ID" />
          <input value={alerts.templateId} onChange={set('templateId')} placeholder="EmailJS template ID" />
          <input value={alerts.publicKey} onChange={set('publicKey')} placeholder="EmailJS public key" />
          <input value={alerts.webhookUrl} onChange={set('webhookUrl')} placeholder="Webhook URL (for SMS)" />
        </div>
      </details>

      <label className="field"><span className="mono tiny dim">MIN MINUTES BETWEEN MESSAGES: {alerts.cooldownMin}</span>
        <input type="range" min="1" max="60" step="1" value={alerts.cooldownMin} onChange={(e) => onChange({ ...alerts, cooldownMin: +e.target.value })} />
      </label>

      <button className="btn" disabled={busy || !ready.any} onClick={test}>{busy ? 'SENDING…' : 'SEND TEST MESSAGE'}</button>
      {!ready.any && <p className="note">Turn on the Discord bot, or add partner email + EmailJS IDs, or a webhook URL, to enable sending.</p>}
      {testMsg && <p className={testMsg.ok ? 'note' : 'error mono'}>{testMsg.text}</p>}
    </div>
  )
}
