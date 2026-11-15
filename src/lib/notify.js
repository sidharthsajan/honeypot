// Sends a text alert to the partner as a Discord DM through the deployed /api/send-discord function
// (which holds the bot token). Only a short text message is sent. No video or images leave the browser.

export function deliveryReady(a) {
  const discord = /^\d{17,20}$/.test((a.discordId || '').trim())
  return { discord, any: discord }
}

export async function sendPartnerAlert(a, message) {
  if (!deliveryReady(a).any) throw new Error("Enter your partner's Discord user ID in Settings.")
  const res = await fetch('/api/send-discord', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, discordId: a.discordId.trim() }),
  })
  if (!res.ok) throw new Error(`Discord failed (${res.status}): ${(await res.text()).slice(0, 120)}`)
  return ['discord']
}
