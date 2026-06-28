import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get the user's guild membership + guild info
  const { data: membership } = await supabase
    .from('guild_members')
    .select('role, guilds(id, name, description, invite_code, created_at)')
    .eq('user_id', user!.id)
    .eq('is_active', true)
    .single()

  // If no guild, show a prompt to create or join one
  if (!membership) {
    return (
      <div className="flex items-center justify-center h-full min-h-96">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-white">You&apos;re not in a guild yet</h2>
          <p className="text-gray-400 text-sm">Create a new guild or join one with an invite code.</p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/dashboard/create"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
            >
              Create guild
            </Link>
            <Link
              href="/dashboard/join"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
            >
              Join with invite code
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const guild = membership.guilds as any

  // Fetch summary stats
  const [{ count: memberCount }, { count: upcomingEvents }, { count: pendingApps }] =
    await Promise.all([
      supabase.from('guild_members').select('*', { count: 'exact', head: true }).eq('guild_id', guild.id).eq('is_active', true),
      supabase.from('events').select('*', { count: 'exact', head: true }).eq('guild_id', guild.id).eq('status', 'upcoming'),
      supabase.from('applications').select('*', { count: 'exact', head: true }).eq('guild_id', guild.id).eq('status', 'pending'),
    ])

  const isLeaderOrOfficer = ['leader', 'officer'].includes(membership.role)

  const stats = [
    { label: 'Members',          value: memberCount ?? 0,   href: '/dashboard/members' },
    { label: 'Upcoming events',  value: upcomingEvents ?? 0, href: '/dashboard/events' },
    ...(isLeaderOrOfficer
      ? [{ label: 'Pending applications', value: pendingApps ?? 0, href: '/dashboard/applications' }]
      : []),
  ]

  return (
    <div className="p-8 space-y-8">

      {/* Guild header */}
      <div>
        <p className="text-sm text-gray-500 uppercase tracking-wider">Your guild</p>
        <h1 className="text-3xl font-semibold text-white mt-1">{guild.name}</h1>
        {guild.description && (
          <p className="text-gray-400 mt-1">{guild.description}</p>
        )}
        <p className="text-xs text-gray-600 mt-2">
          Invite code: <span className="font-mono text-gray-400">{guild.invite_code}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ label, value, href }) => (
          <Link
            key={label}
            href={href}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors"
          >
            <p className="text-3xl font-semibold text-white">{value}</p>
            <p className="text-sm text-gray-400 mt-1">{label}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions (leaders/officers only) */}
      {isLeaderOrOfficer && (
        <div>
          <h2 className="text-sm text-gray-500 uppercase tracking-wider mb-3">Quick actions</h2>
          <div className="flex gap-3 flex-wrap">
            <Link href="/dashboard/events/new" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors">
              + Create event
            </Link>
            <Link href="/dashboard/announcements/new" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors">
              + Post announcement
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
