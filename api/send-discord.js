// Vercel serverless function: DMs your partner from your Discord bot.
// The bot token lives in a Vercel environment variable, never in the browser.
// The partner's Discord ID comes from the app's Settings (or PARTNER_DISCORD_ID as a fallback).
// A bot can only DM people who share a server with it, and this refuses more than one message
// per minute per instance, which limits misuse of the URL.

let lastSent = 0
const API = 'https://discord.com/api/v10'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('POST only')

  const { DISCORD_BOT_TOKEN, PARTNER_DISCORD_ID } = process.env
  if (!DISCORD_BOT_TOKEN) return res.status(500).send('DISCORD_BOT_TOKEN is not set')
  if (Date.now() - lastSent < 60_000) return res.status(429).send('Slow down')

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  const message = String(body?.message || '').slice(0, 1500)
  if (!message) return res.status(400).send('No message')
  const requested = String(body?.discordId || '').trim()
  const partnerId = /^\d{17,20}$/.test(requested) ? requested : PARTNER_DISCORD_ID
  if (!partnerId) return res.status(400).send("Enter your partner's Discord user ID in Settings")

  const headers = { Authorization: `Bot ${DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' }

  // Open (or reuse) a DM channel with the partner, then post the message.
  const dm = await fetch(`${API}/users/@me/channels`, { method: 'POST', headers, body: JSON.stringify({ recipient_id: partnerId }) })
  if (!dm.ok) return res.status(502).send(`Discord DM channel error ${dm.status}`)
  const { id } = await dm.json()

  const msg = await fetch(`${API}/channels/${id}/messages`, { method: 'POST', headers, body: JSON.stringify({ content: `🍯 ${message}` }) })
  if (!msg.ok) return res.status(502).send(`Discord send error ${msg.status} (does your partner allow DMs from the server?)`)

  lastSent = Date.now()
  return res.status(200).send('sent')
}
