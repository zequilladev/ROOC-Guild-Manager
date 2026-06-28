import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const STATUS_COLORS: Record<string, string> = {
  upcoming:  'text-blue-400 bg-blue-950 border-blue-800',
  ongoing:   'text-green-400 bg-green-950 border-green-800',
  completed: 'text-gray-400 bg-gray-800 border-gray-700',
  cancelled: 'text-red-400 bg-red-950 border-red-800',
}

const ATTENDANCE_COLORS: Record<string, string> = {
  present: 'text-green-400',
  absent:  'text-red-400',
  excused: 'text-yellow-400',
}

async function saveAttendance(eventId: string, guildId: string, formData: FormData) {
  'use server'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Get all guild members to iterate over
  const { data: members } = await supabase
    .from('guild_members')
    .select('user_id')
    .eq('guild_id', guildId)
    .eq('is_active', true)

  if (!members) redirect(`/dashboard/events/${eventId}`)

  const upserts = members.map(m => ({
    event_id: eventId,
    user_id:  m.user_id,
    status:   (formData.get(`status_${m.user_id}`) as string) || 'absent',
    noted_by: user.id,
  }))

  await supabase
    .from('event_attendance')
    .upsert(upserts, { onConflict: 'event_id, user_id' })

  redirect(`/dashboard/events/${eventId}?saved=true`)
}

async function updateStatus(eventId: string, formData: FormData) {
  'use server'

  const supabase = await createClient()
  const status = formData.get('status') as string

  await supabase
    .from('events')
    .update({ status })
    .eq('id', eventId)

  redirect(`/dashboard/events/${eventId}`)
}

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string }>
}) {
  const { id } = await params
  const { saved } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: membership } = await supabase
    .from('guild_members')
    .select('role, guild_id')
    .eq('user_id', user!.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!membership) redirect('/dashboard')

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .eq('guild_id', membership.guild_id)
    .maybeSingle()

  if (!event) redirect('/dashboard/events')

  // Get all guild members with their user info and characters
  const { data: members } = await supabase
    .from('guild_members')
    .select(`
      user_id, role,
      users:user_id ( discord_username, discord_avatar, discord_id ),
      characters ( character_name, class )
    `)
    .eq('guild_id', membership.guild_id)
    .eq('is_active', true)

  // Get existing attendance records
  const { data: attendance } = await supabase
    .from('event_attendance')
    .select('user_id, status')
    .eq('event_id', id)

  const attendanceMap: Record<string, string> = {}
  attendance?.forEach(a => { attendanceMap[a.user_id] = a.status })

  const isLeaderOrOfficer = ['leader', 'officer'].includes(membership.role)

  const presentCount  = Object.values(attendanceMap).filter(s => s === 'present').length
  const excusedCount  = Object.values(attendanceMap).filter(s => s === 'excused').length
  const absentCount   = (members?.length ?? 0) - presentCount - excusedCount

  const saveAttendanceWithId = saveAttendance.bind(null, id, membership.guild_id)
  const updateStatusWithId   = updateStatus.bind(null, id)

  return (
    <div className="p-8 space-y-8">

      {/* Back */}
      <Link href="/dashboard/events" className="text-sm text-gray-500 hover:text-gray-300 transition-colors inline-block">
        ← Back to events
      </Link>

      {saved && (
        <p className="text-sm text-green-400 bg-green-950 border border-green-800 rounded-lg px-4 py-2">
          ✓ Attendance saved.
        </p>
      )}

      {/* Event header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-white">{event.title}</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded border capitalize ${STATUS_COLORS[event.status] ?? ''}`}>
              {event.status}
            </span>
          </div>
          <p className="text-gray-400 text-sm">
            {new Date(event.scheduled_at).toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
          {event.description && (
            <p className="text-gray-400 text-sm mt-2 max-w-xl">{event.description}</p>
          )}
        </div>

        {/* Status changer for leaders/officers */}
        {isLeaderOrOfficer && (
          <form action={updateStatusWithId} className="flex gap-2 items-center">
            <select
              name="status"
              defaultValue={event.status}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              type="submit"
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
            >
              Update
            </button>
          </form>
        )}
      </div>

      {/* Attendance summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-semibold text-green-400">{presentCount}</p>
          <p className="text-sm text-gray-500 mt-0.5">Present</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-semibold text-yellow-400">{excusedCount}</p>
          <p className="text-sm text-gray-500 mt-0.5">Excused</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-semibold text-red-400">{absentCount}</p>
          <p className="text-sm text-gray-500 mt-0.5">Absent</p>
        </div>
      </div>

      {/* Attendance table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-medium text-white">Attendance</h2>
          {!isLeaderOrOfficer && (
            <span className="text-xs text-gray-500">Only leaders and officers can mark attendance</span>
          )}
        </div>

        <form action={saveAttendanceWithId}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Member</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Character</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {(members ?? []).map((m: any) => {
                const currentStatus = attendanceMap[m.user_id] ?? 'absent'
                const char = m.characters?.[0]
                const u = m.users

                return (
                  <tr key={m.user_id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {u?.discord_avatar ? (
                          <img
                            src={`https://cdn.discordapp.com/avatars/${u.discord_id}/${u.discord_avatar}.png?size=32`}
                            alt=""
                            className="w-7 h-7 rounded-full"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-indigo-700 flex items-center justify-center text-xs text-white font-medium">
                            {u?.discord_username?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="text-gray-200">{u?.discord_username}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-400">
                      {char ? `${char.character_name} · ${char.class}` : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      {isLeaderOrOfficer ? (
                        <select
                          name={`status_${m.user_id}`}
                          defaultValue={currentStatus}
                          className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                          <option value="excused">Excused</option>
                        </select>
                      ) : (
                        <span className={`text-xs capitalize font-medium ${ATTENDANCE_COLORS[currentStatus] ?? 'text-gray-400'}`}>
                          {currentStatus}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {isLeaderOrOfficer && (
            <div className="px-5 py-4 border-t border-gray-800">
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors font-medium"
              >
                Save attendance
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
