// Sends a text alert to the partner. No backend: email goes through EmailJS (browser-safe REST API),
// and SMS/anything else goes through an optional webhook (e.g. Zapier / Make / IFTTT).
// Only a short text message is sent. No camera frames or images ever leave the browser.

export function deliveryReady(a) {
  const email = !!(a.email && a.serviceId && a.templateId && a.publicKey)
  const webhook = !!(a.webhookUrl && (a.phone || a.email))
  const discord = !!a.discordBot
  return { email, webhook, discord, any: email || webhook || discord }
}

export async function sendPartnerAlert(a, message) {
  const ready = deliveryReady(a)
  if (!ready.any) throw new Error('No delivery set up. Turn on the Discord bot, add email + EmailJS keys, or a webhook URL.')
  const results = []

  if (ready.email) {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: a.serviceId,
        template_id: a.templateId,
        user_id: a.publicKey,
        template_params: { to_email: a.email, subject: 'Honeypot.exe alert', message },
      }),
    })
    if (!res.ok) throw new Error(`Email failed (${res.status}): ${(await res.text()).slice(0, 120)}`)
    results.push('email')
  }

  if (ready.discord) {
    // Same-origin call to the deployed serverless function (holds the bot token).
    const res = await fetch('/api/send-discord', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
    if (!res.ok) throw new Error(`Discord failed (${res.status}): ${(await res.text()).slice(0, 120)}`)
    results.push('discord')
  }

  if (ready.webhook) {
    // no-cors: most automation webhooks don't send CORS headers; we can't read the reply.
    await fetch(a.webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ message, phone: a.phone || '', email: a.email || '', sentAt: new Date().toISOString() }),
    })
    results.push('webhook')
  }
  return results
}
