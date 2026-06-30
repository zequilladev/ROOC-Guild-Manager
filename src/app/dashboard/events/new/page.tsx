import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { headers } from 'next/headers'

const EVENT_TYPES = [
  { value: 'raid',    label: '⚔️  Raid' },
  { value: 'woe',     label: '🏰  War of Emperium' },
  { value: 'mvp',     label: '👑  MVP Hunt' },
  { value: 'pvp',     label: '🥊  PvP' },
  { value: 'meeting', label: '💬  Guild Meeting' },
  { value: 'general', label: '📅  General' },
]

async function createEvent(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: membership } = await supabase
    .from('guild_members')
    .select('role, guild_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!membership || !['leader', 'officer'].includes(membership.role)) {
    redirect('/dashboard/events')
  }

  const title       = (formData.get('title') as string).trim()
  const description = (formData.get('description') as string).trim() || null
  const eventType   = formData.get('event_type') as string
  const location    = (formData.get('location') as string)?.trim() || null
  const scheduledAt = new Date(formData.get('scheduled_at') as string).toISOString()

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      guild_id:     membership.guild_id,
      created_by:   user.id,
      title,
      description,
      event_type:   eventType,
      location,
      scheduled_at: scheduledAt,
      status:       'upcoming',
    })
    .select()
    .single()

  if (error || !event) redirect('/dashboard/events?error=failed')

  // Discord scheduled event
  const { data: guild } = await supabase
    .from('guilds')
    .select('discord_server_id')
    .eq('id', membership.guild_id)
    .single()

  if (guild?.discord_server_id) {
    const origin = (await headers()).get('origin')
    await fetch(`${origin}/api/discord/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:        'event',
        guildId:     guild.discord_server_id,
        title,
        description,
        eventType,
        location,
        scheduledAt,
      }),
    })
  }

  redirect(`/dashboard/events/${event.id}`)
}

export default async function NewEventPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: membership } = await supabase
    .from('guild_members')
    .select('role')
    .eq('user_id', user!.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!membership || !['leader', 'officer'].includes(membership.role)) {
    redirect('/dashboard/events')
  }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(20, 0, 0, 0)
  const defaultDateTime = tomorrow.toISOString().slice(0, 16)

  return (
    <div className="p-8">
      <div className="max-w-lg">
        <Link
          href="/dashboard/events"
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6 inline-block"
        >
          ← Back to events
        </Link>

        <h1 className="text-2xl font-semibold text-white mb-1">New event</h1>
        <p className="text-gray-400 text-sm mb-8">
          Guild members will see this on the Events page.
        </p>

        <form action={createEvent} className="space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              name="title"
              type="text"
              required
              maxLength={80}
              placeholder="e.g. Friday Night Raid"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Event type</label>
            <select
              name="event_type"
              defaultValue="general"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
            >
              {EVENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Date & time <span className="text-red-400">*</span>
            </label>
            <input
              name="scheduled_at"
              type="datetime-local"
              required
              defaultValue={defaultDateTime}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Location <span className="text-gray-600">(optional — shown on Discord event)</span>
            </label>
            <input
              name="location"
              type="text"
              maxLength={100}
              placeholder="e.g. Prontera, Classic server"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Description <span className="text-gray-600">(optional)</span>
            </label>
            <textarea
              name="description"
              rows={3}
              maxLength={500}
              placeholder="Details, requirements, meeting point, etc."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            Create event
          </button>
        </form>
      </div>
    </div>
  )
}
