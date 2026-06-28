import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const STATUS_COLORS: Record<string, string> = {
  upcoming:  'text-blue-400 bg-blue-950 border-blue-800',
  ongoing:   'text-green-400 bg-green-950 border-green-800',
  completed: 'text-gray-400 bg-gray-800 border-gray-700',
  cancelled: 'text-red-400 bg-red-950 border-red-800',
}

const TYPE_ICONS: Record<string, string> = {
  raid:    '⚔️',
  woe:     '🏰',
  mvp:     '👑',
  meeting: '💬',
  pvp:     '🥊',
  general: '📅',
}

export default async function EventsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: membership } = await supabase
    .from('guild_members')
    .select('role, guild_id')
    .eq('user_id', user!.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!membership) redirect('/dashboard')

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('guild_id', membership.guild_id)
    .order('scheduled_at', { ascending: true })

  const upcoming = events?.filter(e => ['upcoming', 'ongoing'].includes(e.status)) ?? []
  const past = events?.filter(e => ['completed', 'cancelled'].includes(e.status)) ?? []
  const isLeaderOrOfficer = ['leader', 'officer'].includes(membership.role)

  return (
    <div className="p-8 space-y-8">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Events</h1>
          <p className="text-gray-500 text-sm mt-0.5">{upcoming.length} upcoming</p>
        </div>
        {isLeaderOrOfficer && (
          <Link
            href="/dashboard/events/new"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
          >
            + New event
          </Link>
        )}
      </div>

      {/* Upcoming events */}
      <div>
        <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-gray-600 text-sm py-6 text-center border border-dashed border-gray-800 rounded-xl">
            No upcoming events.{isLeaderOrOfficer ? ' Create one above.' : ''}
          </p>
        ) : (
          <div className="grid gap-3">
            {upcoming.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>

      {/* Past events */}
      {past.length > 0 && (
        <div>
          <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Past</h2>
          <div className="grid gap-3">
            {past.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EventCard({ event }: { event: any }) {
  return (
    <Link href={`/dashboard/events/${event.id}`}>
      <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 hover:border-gray-700 transition-colors flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-xl w-8 text-center">
            {TYPE_ICONS[event.event_type] ?? '📅'}
          </span>
          <div>
            <p className="text-white font-medium">{event.title}</p>
            <p className="text-gray-500 text-sm mt-0.5">
              {new Date(event.scheduled_at).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
            {event.description && (
              <p className="text-gray-600 text-xs mt-1 line-clamp-1">{event.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-gray-500 capitalize hidden sm:block">{event.event_type}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded border capitalize ${STATUS_COLORS[event.status] ?? ''}`}>
            {event.status}
          </span>
        </div>
      </div>
    </Link>
  )
}
