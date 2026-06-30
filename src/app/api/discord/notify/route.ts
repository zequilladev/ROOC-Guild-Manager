import { NextResponse } from 'next/server'

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN

type NotifyPayload =
  | { type: 'announcement'; channelId: string; title: string; content: string; authorName: string; isPinned: boolean }
  | { type: 'event'; guildId: string; title: string; description: string | null; eventType: string; scheduledAt: string; location: string | null }
  | { type: 'application'; channelId: string; applicantName: string; message: string | null; guildName: string }

export async function POST(request: Request) {
  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 })
  }

  const payload: NotifyPayload = await request.json()

  try {
    if (payload.type === 'announcement') {
      const embed = {
        title: payload.isPinned ? `📌 ${payload.title}` : payload.title,
        description: payload.content,
        color: 0x6366f1,
        footer: { text: `Posted by ${payload.authorName}` },
        timestamp: new Date().toISOString(),
      }

      const res = await fetch(`https://discord.com/api/channels/${payload.channelId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ embeds: [embed] }),
      })

      if (!res.ok) {
        const err = await res.json()
        return NextResponse.json({ error: 'Discord API error', details: err }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    if (payload.type === 'event') {
      const typeLabels: Record<string, string> = {
        raid: 'Raid', woe: 'War of Emperium', mvp: 'MVP Hunt', pvp: 'PvP', meeting: 'Guild Meeting', general: 'General',
      }
      const label = typeLabels[payload.eventType] ?? 'General'

      const startTime = new Date(payload.scheduledAt)
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000) // default 2hr duration

      const res = await fetch(`https://discord.com/api/guilds/${payload.guildId}/scheduled-events`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: payload.title,
          description: `[${label}] ${payload.description ?? ''}`.trim(),
          scheduled_start_time: startTime.toISOString(),
          scheduled_end_time: endTime.toISOString(),
          privacy_level: 2, // GUILD_ONLY
          entity_type: 3,   // EXTERNAL
          entity_metadata: {
            location: payload.location || 'In-game',
          },
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        return NextResponse.json({ error: 'Discord API error', details: err }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    if (payload.type === 'application') {
      const embed = {
        title: `📋 New Application — ${payload.guildName}`,
        description: payload.message ? `**Message:** ${payload.message}` : 'No message provided.',
        color: 0xf59e0b,
        fields: [
          { name: 'Applicant', value: payload.applicantName, inline: true },
        ],
        footer: { text: 'Review in the app under Applications' },
        timestamp: new Date().toISOString(),
      }

      const res = await fetch(`https://discord.com/api/channels/${payload.channelId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ embeds: [embed] }),
      })

      if (!res.ok) {
        const err = await res.json()
        return NextResponse.json({ error: 'Discord API error', details: err }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown notification type' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
