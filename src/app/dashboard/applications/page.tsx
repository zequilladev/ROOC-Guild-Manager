import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

async function approveApplication(applicationId: string, userId: string, guildId: string) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  await supabase.from('applications').update({
    status:      'approved',
    reviewed_by: user!.id,
    reviewed_at: new Date().toISOString(),
  }).eq('id', applicationId)

  await supabase.from('guild_members').insert({
    guild_id: guildId,
    user_id:  userId,
    role:     'member',
  })

  redirect('/dashboard/applications')
}

async function rejectApplication(applicationId: string) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  await supabase.from('applications').update({
    status:      'rejected',
    reviewed_by: user!.id,
    reviewed_at: new Date().toISOString(),
  }).eq('id', applicationId)

  redirect('/dashboard/applications')
}

export default async function ApplicationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: membership } = await supabase
    .from('guild_members')
    .select('role, guild_id')
    .eq('user_id', user!.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!membership) redirect('/dashboard')

  const isLeaderOrOfficer = ['leader', 'officer'].includes(membership.role)
  if (!isLeaderOrOfficer) redirect('/dashboard')

  const { data: applications } = await supabase
    .from('applications')
    .select(`
      id, message, status, created_at,
      applicant:user_id ( id, discord_username, discord_avatar )
    `)
    .eq('guild_id', membership.guild_id)
    .order('created_at', { ascending: false })

  const pending  = applications?.filter(a => a.status === 'pending') ?? []
  const reviewed = applications?.filter(a => a.status !== 'pending') ?? []

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Applications</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {pending.length} pending
        </p>
      </div>

      {applications?.length === 0 && (
        <p className="text-gray-600 text-sm py-12 text-center border border-dashed border-gray-800 rounded-xl">
          No applications yet.
        </p>
      )}

      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs text-gray-500 uppercase tracking-wider">Pending</h2>
          {pending.map(app => (
            <div key={app.id} className="bg-gray-900 border border-gray-800 rounded-xl px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">
                    {(app.applicant as any)?.discord_username ?? 'Unknown'}
                  </p>
                  {app.message ? (
                    <p className="text-gray-400 text-sm mt-1 whitespace-pre-wrap">{app.message}</p>
                  ) : (
                    <p className="text-gray-600 text-sm mt-1 italic">No message provided.</p>
                  )}
                  <p className="text-gray-600 text-xs mt-3">
                    Applied {new Date(app.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <form action={approveApplication.bind(null, app.id, (app.applicant as any)?.id, membership.guild_id)}>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-sm rounded-lg transition-colors"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={rejectApplication.bind(null, app.id)}>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-gray-800 hover:bg-red-900 text-gray-300 hover:text-red-300 text-sm rounded-lg transition-colors"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs text-gray-500 uppercase tracking-wider">Reviewed</h2>
          {reviewed.map(app => (
            <div key={app.id} className="bg-gray-900 border border-gray-800 rounded-xl px-6 py-5 opacity-60">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-white font-medium">
                    {(app.applicant as any)?.discord_username ?? 'Unknown'}
                  </p>
                  {app.message && (
                    <p className="text-gray-400 text-sm mt-1 whitespace-pre-wrap">{app.message}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded font-medium ${
                  app.status === 'approved'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-red-950 text-red-400 border border-red-900'
                }`}>
                  {app.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
