import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AnnouncementCard } from './AnnouncementCard'

async function togglePin(id: string, currentPinned: boolean) {
  'use server'
  const supabase = await createClient()
  await supabase.from('announcements').update({ is_pinned: !currentPinned }).eq('id', id)
  redirect('/dashboard/announcements')
}

async function deleteAnnouncement(id: string) {
  'use server'
  const supabase = await createClient()
  await supabase.from('announcements').delete().eq('id', id)
  redirect('/dashboard/announcements')
}

export default async function AnnouncementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: membership } = await supabase
    .from('guild_members')
    .select('role, guild_id')
    .eq('user_id', user!.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!membership) redirect('/dashboard')

  const { data: announcements } = await supabase
    .from('announcements')
    .select(`
      id, title, content, is_pinned, created_at,
      author:created_by ( discord_username )
    `)
    .eq('guild_id', membership.guild_id)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  const isLeaderOrOfficer = ['leader', 'officer'].includes(membership.role)
  const pinned = announcements?.filter(a => a.is_pinned) ?? []
  const rest   = announcements?.filter(a => !a.is_pinned) ?? []

  return (
    <div className="p-8 space-y-8">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Announcements</h1>
          <p className="text-gray-500 text-sm mt-0.5">{announcements?.length ?? 0} total</p>
        </div>
        {isLeaderOrOfficer && (
          <Link
            href="/dashboard/announcements/new"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
          >
            + New announcement
          </Link>
        )}
      </div>

      {announcements?.length === 0 && (
        <p className="text-gray-600 text-sm py-12 text-center border border-dashed border-gray-800 rounded-xl">
          No announcements yet.{isLeaderOrOfficer ? ' Post one above.' : ''}
        </p>
      )}

      {/* Pinned */}
      {pinned.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs text-gray-500 uppercase tracking-wider">📌 Pinned</h2>
          {pinned.map(a => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              isLeaderOrOfficer={isLeaderOrOfficer}
              togglePin={togglePin.bind(null, a.id, a.is_pinned)}
              deleteAnnouncement={deleteAnnouncement.bind(null, a.id)}
            />
          ))}
        </div>
      )}

      {/* Rest */}
      {rest.length > 0 && (
        <div className="space-y-3">
          {pinned.length > 0 && (
            <h2 className="text-xs text-gray-500 uppercase tracking-wider">Recent</h2>
          )}
          {rest.map(a => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              isLeaderOrOfficer={isLeaderOrOfficer}
              togglePin={togglePin.bind(null, a.id, a.is_pinned)}
              deleteAnnouncement={deleteAnnouncement.bind(null, a.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}